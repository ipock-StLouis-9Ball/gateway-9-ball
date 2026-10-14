import json
import time
import asyncio
from typing import Dict, Any, List, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from server.physics_service import ShotResolver
from server.devops_monitor import AutonomicDevOpsAgent

app = FastAPI(title="Stateful Compute Engine Match Runner")

resolver = ShotResolver()
devops_agent = AutonomicDevOpsAgent()

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
        self.sockets.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for ws in list(self.sockets):
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Error sending message to client in room {self.room_id}: {e}")

    async def process_shot(self, player_id: str, payload: Dict[str, Any]):
        V0 = float(payload.get("V0", 0.0))
        phi = float(payload.get("phi", 0.0))
        a = float(payload.get("a", 0.0))
        b = float(payload.get("b", 0.0))

        # Validate physics parameters and simulate shot
        result = resolver.simulate_shot(self.cue_ball_pos, V0, phi, a, b)

        # Update cue ball position from authoritative physics result
        self.cue_ball_pos = result["cue_ball_final"]
        self.history.append({"player": player_id, "shot": payload, "result": result, "ts": time.time()})

        # Broadcast shot calculation result to all connected clients
        broadcast_data = {
            "event": "shot_executed",
            "room_id": self.room_id,
            "player_id": player_id,
            "input": {"V0": V0, "phi": phi, "a": a, "b": b},
            "physics_result": result
        }
        await self.broadcast(broadcast_data)

rooms: Dict[str, GameRoom] = {}

@app.get("/health")
def health_check():
    return {"status": "ok", "active_rooms": len(rooms)}

@app.websocket("/ws/match_runner/{room_id}")
async def match_websocket_endpoint(websocket: WebSocket, room_id: str):
    if room_id not in rooms:
        rooms[room_id] = GameRoom(room_id)

    room = rooms[room_id]
    await room.connect(websocket)

    try:
        while True:
            data_str = await websocket.receive_text()
            data = json.loads(data_str)

            player_id = data.get("player_id", "anonymous")

            # Check quarantine status via DevOps agent
            if player_id in devops_agent.quarantined_players:
                await websocket.send_json({"event": "error", "message": "Player in quarantine."})
                await websocket.close(code=4003)
                break

            action = data.get("action", "shot")
            if action == "shot" or ("V0" in data and "phi" in data):
                await room.process_shot(player_id, data)

    except WebSocketDisconnect:
        room.disconnect(websocket)
        if len(room.sockets) == 0:
            del rooms[room_id]
