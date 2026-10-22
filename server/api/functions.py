import time
import os
import secrets
import jwt
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from server.devops_monitor.security import DeviceFingerprintValidator
from server.api.db import db_manager
from server.matchmaking import global_sbmm_queue

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api", tags=["stateless_api"])

device_validator = DeviceFingerprintValidator()

JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-gcp-match-key-9ball")
JWT_ALGORITHM = "HS256"
MATCH_RUNNER_VM_URL = os.environ.get("MATCH_RUNNER_VM_URL", "wss://vm.9ballhustle.internal:8000")

# In-memory store for pending match handoff tokens
pending_match_handoffs: Dict[str, Dict[str, Any]] = {}

class UserAccountRequest(BaseModel):
    player_id: str
    username: str
    widevine_id: str
    build_fingerprint: str

class ProfileUpdateRequest(BaseModel):
    player_id: str
    bio: Optional[str] = None
    avatar: Optional[str] = None

class MatchmakeRequest(BaseModel):
    player_id: str
    elo: Optional[int] = None

class SettleMatchRequest(BaseModel):
    match_id: str
    winner_id: str
    loser_id: Optional[str] = ""
    forfeit: Optional[bool] = False
    finish_reason: Optional[str] = ""
    shot_ledger: List[Dict[str, Any]]
    players: Optional[Dict[str, Any]] = None
    payouts: Optional[Dict[str, Any]] = None

def seed_match_on_vm(
    match_id: str,
    player1_id: str,
    player2_id: str,
    p1_wallet: str = "",
    p2_wallet: str = "",
    p1_stats: Optional[Dict[str, Any]] = None,
    p2_stats: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Direct Server-to-Server communication over private VPC to seed match on Compute Engine VM."""
    payload = {
        "match_id": match_id,
        "player1_id": player1_id,
        "player2_id": player2_id,
        "player1_wallet": p1_wallet or f"wallet_{player1_id}",
        "player2_wallet": p2_wallet or f"wallet_{player2_id}",
        "p1_stats": p1_stats or {"elo": 1200},
        "p2_stats": p2_stats or {"elo": 1200}
    }

    try:
        from server.match_runner.runner import seed_match, SeedMatchRequest
        req = SeedMatchRequest(**payload)
        return seed_match(req)
    except Exception as e:
        print(f"[Server-to-Server VPC] Error seeding match on VM: {e}")
        t1 = secrets.token_hex(16)
        t2 = secrets.token_hex(16)
        return {
            "status": "seeded",
            "match_id": match_id,
            "tokens": {player1_id: t1, player2_id: t2},
            "ws_url": f"{MATCH_RUNNER_VM_URL}/ws/match_runner/{match_id}"
        }

def process_authoritative_settlement(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Headless Pooltool Physics Replay & Settlement Enforcement:
    Replays match shot-by-shot from the telemetry ledger.
    If simulation divergence or tampered shot parameters are detected:
    Pinpoints responsible player, marks as cheater, bans account, auto-forfeits match to honest opponent,
    and executes settlement payouts automatically.
    """
    from server.physics_service import ShotResolver

    match_id = payload.get("match_id")
    claimed_winner = payload.get("winner_id")
    claimed_loser = payload.get("loser_id")
    shot_ledger = payload.get("shot_ledger", [])

    resolver = ShotResolver()
    cue_pos = {"x": 0.0, "y": 0.0}
    divergence_detected = False
    violating_player = None
    violation_reason = ""

    for idx, shot in enumerate(shot_ledger):
        player_id = shot.get("player_id")
        inputs = shot.get("input", {})
        V0 = inputs.get("V0", 0.0)
        phi = inputs.get("phi", 0.0)
        a = inputs.get("a", 0.0)
        b = inputs.get("b", 0.0)

        # Validate physics parameters
        if not resolver.validate_shot_params(V0, phi, a, b):
            divergence_detected = True
            violating_player = player_id
            violation_reason = f"Illegal out-of-bounds shot parameters on shot #{idx}: V0={V0}"
            break

        # Re-run headless Pooltool physics simulation
        try:
            expected_res = resolver.simulate_shot(cue_pos, V0, phi, a, b)
            logged_res = shot.get("physics_result", {})

            exp_final = expected_res.get("cue_ball_final", {})
            log_final = logged_res.get("cue_ball_final", {})
            dx = abs(exp_final.get("x", 0.0) - log_final.get("x", 0.0))
            dy = abs(exp_final.get("y", 0.0) - log_final.get("y", 0.0))

            if dx > 0.01 or dy > 0.01:
                divergence_detected = True
                violating_player = player_id
                violation_reason = f"Physics simulation divergence detected on shot #{idx}: calculated dx={dx}, dy={dy}"
                break

            cue_pos = exp_final

        except Exception as e:
            divergence_detected = True
            violating_player = player_id
            violation_reason = f"Physics simulation error on shot #{idx}: {e}"
            break

    final_winner = claimed_winner
    final_loser = claimed_loser
    forfeit_status = payload.get("forfeit", False)
    finish_reason = payload.get("finish_reason", "Normal match completion")

    if divergence_detected and violating_player:
        print(f"[Authoritative Anti-Cheat] TAMPERING DETECTED! Player {violating_player} flagged: {violation_reason}")
        ban_msg = f"Account restricted due to fair play violation detected during physics replay verification ({violation_reason}). You may only view support logs or file a dispute."
        db_manager.ban_user(violating_player, reason=violation_reason, message=ban_msg)

        all_pids = list(payload.get("players", {}).keys())
        honest_pids = [p for p in all_pids if p != violating_player]
        final_winner = honest_pids[0] if honest_pids else "house"
        final_loser = violating_player
        forfeit_status = True
        finish_reason = f"Auto-forfeit due to physics tampering by {violating_player}"

    settlement_record = {
        "match_id": match_id,
        "winner_id": final_winner,
        "loser_id": final_loser,
        "forfeit": forfeit_status,
        "finish_reason": finish_reason,
        "shot_ledger": shot_ledger,
        "payouts": {
            final_winner: 100.0,
            final_loser: 0.0
        }
    }
    db_manager.save_match_settlement(match_id, settlement_record)

    return {
        "status": "settled",
        "match_id": match_id,
        "divergence_detected": divergence_detected,
        "violating_player": violating_player,
        "settlement": settlement_record
    }

@router.post("/create_account")
@limiter.limit("10/minute")
def create_user_account(request: Request, req: UserAccountRequest):
    """
    Stateless API handler:
    Validates hardware Device ID fingerprint, prevents multi-accounting, and registers user profile in Cloud SQL.
    """
    # Hardware device ID validation
    fp_res = device_validator.register_device(req.player_id, req.widevine_id, req.build_fingerprint)
    if not fp_res.get("allowed"):
        raise HTTPException(status_code=403, detail=fp_res.get("reason"))

    account_data = {
        "player_id": req.player_id,
        "username": req.username,
        "elo": 1200,
        "created_at": time.time(),
        "widevine_id": req.widevine_id,
        "fingerprint_hash": fp_res.get("fingerprint_hash")
    }
    db_manager.save_user(account_data)
    return {"status": "success", "account": account_data}

@router.post("/update_profile")
@limiter.limit("20/minute")
def update_profile(request: Request, req: ProfileUpdateRequest):
    """Stateless profile update handler."""
    updated = db_manager.update_profile(req.player_id, req.bio, req.avatar)
    return {"status": "success", "profile": updated}

@router.get("/get_elo/{player_id}")
@limiter.limit("60/minute")
def get_elo_bracket(request: Request, player_id: str):
    """Stateless Elo bracket query."""
    user = db_manager.get_user(player_id) or {"player_id": player_id, "elo": 1200}
    elo = user.get("elo", 1200)

    # Bracket classification
    if elo < 1000:
        bracket = "Rookie"
    elif elo < 1500:
        bracket = "Intermediate"
    elif elo < 2000:
        bracket = "Advanced"
    else:
        bracket = "Veteran"

    return {"player_id": player_id, "elo": elo, "bracket": bracket}

@router.post("/matchmake")
@limiter.limit("15/minute")
def request_matchmaking(request: Request, req: MatchmakeRequest):
    """
    Matchmaking API endpoint:
    Enqueues player and performs Direct Server-to-Server Match Seeding with Compute Engine VM over private VPC.
    Hands each client ONLY their single-use 32-character token and the secure WebSocket URL.
    """
    # Check if account is banned from matchmaking
    if db_manager.is_user_banned(req.player_id):
        raise HTTPException(
            status_code=403,
            detail="Account restricted due to fair play violation. You may only view support logs or submit a dispute."
        )

    # Check if a pending handoff token is already available for this player
    if req.player_id in pending_match_handoffs:
        handoff = pending_match_handoffs.pop(req.player_id)
        return {
            "status": "matched",
            "match_id": handoff["match_id"],
            "vm_ws_url": handoff["vm_ws_url"],
            "token": handoff["token"]
        }

    match_res = global_sbmm_queue.find_match(req.player_id, elo_window=200)

    if not match_res:
        return {"status": "queued", "message": "Searching for an opponent..."}

    match_id = match_res["match_id"]
    p1 = match_res["player1"]
    p2 = match_res["player2"]

    # Direct Server-to-Server match seeding with Compute Engine VM over private VPC
    seed_res = seed_match_on_vm(match_id, p1, p2)
    tokens = seed_res.get("tokens", {})

    token1 = tokens.get(p1, secrets.token_hex(16))
    token2 = tokens.get(p2, secrets.token_hex(16))

    ws_base = seed_res.get("ws_url", f"{MATCH_RUNNER_VM_URL}/ws/match_runner/{match_id}")

    pending_match_handoffs[p1] = {
        "match_id": match_id,
        "token": token1,
        "vm_ws_url": f"{ws_base}?token={token1}"
    }
    pending_match_handoffs[p2] = {
        "match_id": match_id,
        "token": token2,
        "vm_ws_url": f"{ws_base}?token={token2}"
    }

    handoff = pending_match_handoffs.pop(req.player_id)
    return {
        "status": "matched",
        "match_info": match_res,
        "vm_ws_url": handoff["vm_ws_url"],
        "token": handoff["token"]
    }

@router.post("/settle_match")
def settle_match_endpoint(request: Request, req: SettleMatchRequest):
    """Sole permitted route for final match stats, telemetry ledgers, and payout settlement instructions."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = auth_header.split(" ", 1)[1]
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired JWT token")

    res = process_authoritative_settlement(req.model_dump())
    return res
