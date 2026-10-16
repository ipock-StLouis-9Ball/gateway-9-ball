import json
import time
import os
import secrets
import asyncio
import jwt
from typing import Dict, Any, List, Set, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from pydantic import BaseModel

from server.physics_service import ShotResolver
from server.devops_monitor import AutonomicDevOpsAgent

app = FastAPI(title="Stateful Compute Engine Match Runner")

resolver = ShotResolver()
devops_agent = AutonomicDevOpsAgent()

JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-gcp-match-key-9ball")
JWT_ALGORITHM = "HS256"
MATCH_RUNNER_VM_URL = os.environ.get("MATCH_RUNNER_VM_URL", "wss://vm.9ballhustle.internal:8000")

# Single-use token tracking to prevent replay attacks
used_tokens: Set[str] = set()

class SeedMatchRequest(BaseModel):
    match_id: str
    player1_id: str
    player2_id: str
    player1_wallet: Optional[str] = ""
    player2_wallet: Optional[str] = ""
    p1_stats: Optional[Dict[str, Any]] = None
    p2_stats: Optional[Dict[str, Any]] = None

# Persistent stateful game rooms running on dedicated Compute Engine VM
class GameRoom:
    def __init__(self, room_id: str, seed_data: Optional[Dict[str, Any]] = None):
        self.room_id = room_id
        self.seed_data = seed_data or {}
        self.players: Dict[str, Dict[str, Any]] = {}
        self.single_use_tokens: Dict[str, str] = {}  # 32-char token -> player_id
        self.reconnect_secrets: Dict[str, str] = {}  # 32-char reconnect_secret -> player_id
        self.player_reconnect_secrets: Dict[str, str] = {}  # player_id -> reconnect_secret
        self.player_sockets: Dict[str, WebSocket] = {}
        self.sockets: Set[WebSocket] = set()
        self.cue_ball_pos = {"x": 0.0, "y": 0.0}
        self.turn_player: Optional[str] = None
        self.scores: Dict[str, int] = {}
        self.history: List[Dict[str, Any]] = []  # Chronological shot telemetry ledger
        self.grace_tasks: Dict[str, asyncio.Task] = {}
        self.is_finished: bool = False
        self.winner_id: Optional[str] = None
        self.loser_id: Optional[str] = None
        self.finish_reason: Optional[str] = None

    async def connect(self, websocket: WebSocket, player_id: str):
        await websocket.accept()
        self.sockets.add(websocket)
        self.player_sockets[player_id] = websocket

        # Cancel any pending disconnect grace window timer for reattaching player
        if player_id in self.grace_tasks:
            self.grace_tasks[player_id].cancel()
            del self.grace_tasks[player_id]

    def disconnect(self, websocket: WebSocket, player_id: Optional[str] = None):
        if websocket in self.sockets:
            self.sockets.remove(websocket)

        if player_id and self.player_sockets.get(player_id) == websocket:
            del self.player_sockets[player_id]

    async def broadcast(self, message: Dict[str, Any]):
        for ws in list(self.sockets):
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Error sending message to client in room {self.room_id}: {e}")

    async def process_shot(self, player_id: str, payload: Dict[str, Any], websocket: WebSocket):
        try:
            V0 = float(payload.get("V0", 0.0))
            phi = float(payload.get("phi", 0.0))
            a = float(payload.get("a", 0.0))
            b = float(payload.get("b", 0.0))
        except (ValueError, TypeError):
            # Invalid data types -> drop input silently
            print(f"[Anti-Cheat] Malformed numeric input dropped from player {player_id}")
            return

        # Anti-cheat check: Client is NEVER allowed to send ball positions or illegal shot parameters
        if "cue_ball_pos" in payload or "positions" in payload:
            print(f"[Anti-Cheat] Attempted client coordinate override detected from player {player_id}. Dropping input.")
            return

        # Validate physics bounds via server-authoritative ShotResolver
        if not resolver.validate_shot_params(V0, phi, a, b):
            print(f"[Anti-Cheat] Out-of-bounds shot parameters (V0={V0}) from player {player_id}. Silently dropping packet.")
            return

        # Calculate authoritative server-side physics
        try:
            result = resolver.simulate_shot(self.cue_ball_pos, V0, phi, a, b)
        except ValueError as e:
            print(f"[Anti-Cheat] Physics simulation rejected input: {e}")
            return

        # Update cue ball position exclusively from server Pooltool calculation
        self.cue_ball_pos = result["cue_ball_final"]

        shot_entry = {
            "shot_index": len(self.history),
            "player_id": player_id,
            "input": {"V0": V0, "phi": phi, "a": a, "b": b},
            "physics_result": result,
            "timestamp": time.time()
        }
        self.history.append(shot_entry)

        # Broadcast true server-calculated coordinates back to all players
        broadcast_data = {
            "event": "shot_executed",
            "room_id": self.room_id,
            "player_id": player_id,
            "input": {"V0": V0, "phi": phi, "a": a, "b": b},
            "physics_result": result
        }
        await self.broadcast(broadcast_data)

    def start_disconnect_grace_period(self, player_id: str, grace_seconds: float = 90.0):
        """Starts 90-second authoritative grace window for disconnected player."""
        if player_id in self.grace_tasks:
            self.grace_tasks[player_id].cancel()

        task = asyncio.create_task(self._grace_period_timer(player_id, grace_seconds))
        self.grace_tasks[player_id] = task

    async def _grace_period_timer(self, player_id: str, grace_seconds: float):
        print(f"[Match Runner] Grace period started for disconnected player {player_id} (room {self.room_id}, {grace_seconds}s)")
        await self.broadcast({
            "event": "player_disconnected",
            "player_id": player_id,
            "grace_window_sec": grace_seconds
        })

        await asyncio.sleep(grace_seconds)

        # Grace period expired -> Automatic forfeiture
        if player_id not in self.player_sockets and not self.is_finished:
            all_pids = list(self.players.keys())
            remaining = [p for p in all_pids if p != player_id]
            winner_id = remaining[0] if remaining else "house"

            self.is_finished = True
            self.winner_id = winner_id
            self.loser_id = player_id
            self.finish_reason = f"Forfeit: Player {player_id} failed to reconnect within {int(grace_seconds)} seconds."

            print(f"[Match Runner] Forfeit triggered for {player_id} in room {self.room_id}. Winner: {winner_id}")

            await self.broadcast({
                "event": "match_finished",
                "room_id": self.room_id,
                "winner_id": winner_id,
                "loser_id": player_id,
                "forfeit": True,
                "reason": self.finish_reason
            })

            # Authoritative settlement trigger
            await self.trigger_authoritative_settlement()

    async def trigger_authoritative_settlement(self):
        """Sends shot ledger, final statistics, and payout instructions to Cloud Run for settlement verification."""
        from server.api.functions import process_authoritative_settlement

        settlement_payload = {
            "match_id": self.room_id,
            "winner_id": self.winner_id,
            "loser_id": self.loser_id,
            "forfeit": True if "Forfeit" in (self.finish_reason or "") else False,
            "finish_reason": self.finish_reason or "Normal completion",
            "shot_ledger": self.history,
            "players": self.players,
            "payouts": {
                self.winner_id: 100.0 if self.winner_id else 0.0,
                self.loser_id: 0.0 if self.loser_id else 0.0
            }
        }
        process_authoritative_settlement(settlement_payload)

rooms: Dict[str, GameRoom] = {}

def verify_handoff_token(token: Optional[str], room_id: str) -> Optional[Dict[str, Any]]:
    """Cryptographically verify the short-lived, single-use handoff JWT token."""
    if not token:
        return None

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

        # Validate match/room scope
        if decoded.get("match_id") != room_id:
            print(f"[Cryptographic Handoff] Room mismatch: token room {decoded.get('match_id')} vs target room {room_id}")
            return None

        # Check single-use token JTI
        jti = decoded.get("jti")
        if not jti or jti in used_tokens:
            print(f"[Cryptographic Handoff] Replayed or missing JTI token rejected: {jti}")
            return None

        # Mark token as consumed
        used_tokens.add(jti)
        return decoded

    except jwt.ExpiredSignatureError:
        print("[Cryptographic Handoff] Expired JWT signature.")
        return None
    except jwt.InvalidTokenError as e:
        print(f"[Cryptographic Handoff] Invalid JWT signature: {e}")
        return None

@app.get("/health")
def health_check():
    return {"status": "ok", "active_rooms": len(rooms)}

@app.post("/internal/seed_match")
def seed_match(req: SeedMatchRequest):
    """
    Direct Server-to-Server endpoint called by Cloud Run over private VPC when a match is made.
    Allocates room, pushes player records, generates two high-entropy 32-character single-use match tokens.
    """
    room = GameRoom(req.match_id, seed_data=req.model_dump())

    # Generate two 32-character high-entropy single-use match tokens (16 bytes = 32 hex chars)
    token1 = secrets.token_hex(16)
    token2 = secrets.token_hex(16)

    room.single_use_tokens[token1] = req.player1_id
    room.single_use_tokens[token2] = req.player2_id

    room.players[req.player1_id] = {
        "player_id": req.player1_id,
        "wallet_id": req.player1_wallet,
        "stats": req.p1_stats or {}
    }
    room.players[req.player2_id] = {
        "player_id": req.player2_id,
        "wallet_id": req.player2_wallet,
        "stats": req.p2_stats or {}
    }

    rooms[req.match_id] = room

    return {
        "status": "seeded",
        "match_id": req.match_id,
        "tokens": {
            req.player1_id: token1,
            req.player2_id: token2
        },
        "ws_url": f"{MATCH_RUNNER_VM_URL}/ws/match_runner/{req.match_id}"
    }

@app.websocket("/ws/match_runner/{room_id}")
async def match_websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: Optional[str] = Query(None),
    reconnect_secret: Optional[str] = Query(None)
):
    if room_id not in rooms:
        rooms[room_id] = GameRoom(room_id)

    room = rooms[room_id]
    player_id: Optional[str] = None
    assigned_reconnect_secret: Optional[str] = None

    # 1. Direct Single-Use Token Handoff
    if token:
        if token in room.single_use_tokens:
            # INSTANT CONSUMPTION: Delete single-use token from active memory to prevent replay attacks
            player_id = room.single_use_tokens.pop(token)
            # Generate volatile 32-character Session Reconnect Secret
            assigned_reconnect_secret = secrets.token_hex(16)
            room.reconnect_secrets[assigned_reconnect_secret] = player_id
            room.player_reconnect_secrets[player_id] = assigned_reconnect_secret
        else:
            # Fallback for JWT tokens if legacy test or format
            token_data = verify_handoff_token(token, room_id)
            if token_data:
                player_id = token_data.get("player_id", "anonymous")
                assigned_reconnect_secret = secrets.token_hex(16)
                room.reconnect_secrets[assigned_reconnect_secret] = player_id
                room.player_reconnect_secrets[player_id] = assigned_reconnect_secret
            else:
                await websocket.close(code=4003, reason="Unauthorized, expired, or replayed single-use token.")
                return

    # 2. Reconnecting with Session Reconnect Secret
    elif reconnect_secret:
        if reconnect_secret in room.reconnect_secrets:
            player_id = room.reconnect_secrets[reconnect_secret]
            assigned_reconnect_secret = reconnect_secret
        else:
            await websocket.close(code=4003, reason="Invalid or expired reconnect secret.")
            return

    else:
        if os.environ.get("REQUIRE_JWT_AUTH", "true").lower() == "true":
            await websocket.close(code=4003, reason="Authentication token or reconnect secret required.")
            return
        player_id = "anonymous"

    # Check quarantine or ban status
    if player_id in devops_agent.quarantined_players:
        await websocket.accept()
        await websocket.send_json({"event": "error", "message": "Player in quarantine."})
        await websocket.close(code=4003)
        return

    await room.connect(websocket, player_id)

    # Handshake message back to client with reconnect secret
    await websocket.send_json({
        "event": "connected" if token else "reconnected",
        "room_id": room_id,
        "player_id": player_id,
        "reconnect_secret": assigned_reconnect_secret
    })

    try:
        while True:
            data_str = await websocket.receive_text()
            data = json.loads(data_str)

            current_player = data.get("player_id", player_id)

            if current_player in devops_agent.quarantined_players:
                await websocket.send_json({"event": "error", "message": "Player in quarantine."})
                await websocket.close(code=4003)
                break

            action = data.get("action", "shot")
            if action == "shot" or ("V0" in data and "phi" in data):
                await room.process_shot(current_player, data, websocket)

    except WebSocketDisconnect:
        room.disconnect(websocket, player_id)
        # Trigger 90-second authoritative grace period window
        if player_id:
            room.start_disconnect_grace_period(player_id, grace_seconds=90.0)
