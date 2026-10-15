import json
import time
import os
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

# Single-use token tracking to prevent replay attacks
used_tokens: Set[str] = set()

# Persistent stateful game rooms running on dedicated Compute Engine VM
class GameRoom:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.sockets: Set[WebSocket] = set()
        self.cue_ball_pos = {"x": 0.0, "y": 0.0}
        self.turn_player: Optional[str] = None
        self.scores: Dict[str, int] = {}
        self.history: List[Dict[str, Any]] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.sockets.add(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.sockets:
            self.sockets.remove(websocket)

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
        self.history.append({"player": player_id, "shot": payload, "result": result, "ts": time.time()})

        # Broadcast true server-calculated coordinates back to all players
        broadcast_data = {
            "event": "shot_executed",
            "room_id": self.room_id,
            "player_id": player_id,
            "input": {"V0": V0, "phi": phi, "a": a, "b": b},
            "physics_result": result
        }
        await self.broadcast(broadcast_data)

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

@app.websocket("/ws/match_runner/{room_id}")
async def match_websocket_endpoint(websocket: WebSocket, room_id: str, token: Optional[str] = Query(None)):
    # Verify cryptographic handoff JWT token
    token_data = verify_handoff_token(token, room_id)
    if not token_data and os.environ.get("REQUIRE_JWT_AUTH", "true").lower() == "true":
        await websocket.close(code=4003, reason="Unauthorized or expired handoff token.")
        return

    player_id = token_data.get("player_id", "anonymous") if token_data else "anonymous"

    if room_id not in rooms:
        rooms[room_id] = GameRoom(room_id)

    room = rooms[room_id]
    await room.connect(websocket)

    try:
        while True:
            data_str = await websocket.receive_text()
            data = json.loads(data_str)

            current_player = data.get("player_id", player_id)

            # Check quarantine status via DevOps agent
            if current_player in devops_agent.quarantined_players:
                await websocket.send_json({"event": "error", "message": "Player in quarantine."})
                await websocket.close(code=4003)
                break

            action = data.get("action", "shot")
            if action == "shot" or ("V0" in data and "phi" in data):
                await room.process_shot(current_player, data, websocket)

    except WebSocketDisconnect:
        room.disconnect(websocket)
        if len(room.sockets) == 0:
            del rooms[room_id]
