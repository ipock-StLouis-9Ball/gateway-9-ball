import time
import os
import jwt
from typing import Dict, Any, Optional
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
    Enqueues player and generates short-lived, cryptographically signed one-time-use JWT handoff
    token alongside the Compute Engine VM WebSocket URL.
    """
    match_res = global_sbmm_queue.find_match(req.player_id, elo_window=200)

    if not match_res:
        return {"status": "queued", "message": "Searching for an opponent..."}

    match_id = match_res["match_id"]
    now = time.time()

    # Generate one-time-use cryptographically signed JWT handoff token (60s validity)
    jwt_payload = {
        "match_id": match_id,
        "player_id": req.player_id,
        "iat": int(now),
        "exp": int(now + 60),
        "jti": f"token_{match_id}_{req.player_id}_{int(now*1000)}"
    }
    token = jwt.encode(jwt_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    vm_ws_endpoint = f"{MATCH_RUNNER_VM_URL}/ws/match_runner/{match_id}?token={token}"

    return {
        "status": "matched",
        "match_info": match_res,
        "vm_ws_url": vm_ws_endpoint,
        "token": token
    }
