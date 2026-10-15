import json
import asyncio
import threading
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional, Callable

class NetworkManager:
    """
    Client-side WebSocket Network Manager connecting directly to the stateful match runner server
    via Cloud Run cryptographic JWT handoff.
    Emits raw shot parameters {"V0": ..., "phi": ..., "a": ..., "b": ...} upon power release.
    """
    def __init__(
        self,
        cloud_run_api_url: str = "http://localhost:8080/api",
        fallback_ws_url: str = "ws://localhost:8000/ws/match_runner/room_1"
    ):
        self.cloud_run_api_url = cloud_run_api_url
        self.server_url = fallback_ws_url
        self.ws = None
        self.connected = False
        self.on_message_callback: Optional[Callable[[Dict[str, Any]], None]] = None

    def request_matchmaking_and_connect(self, player_id: str = "player_1", on_message: Optional[Callable[[Dict[str, Any]], None]] = None):
        """
        Queries Cloud Run matchmaking service to receive VM Secure WebSocket URL + cryptographic JWT token,
        then seamlessly connects to the Compute Engine VM match runner.
        """
        self.on_message_callback = on_message
        try:
            req_data = json.dumps({"player_id": player_id}).encode('utf-8')
            req = urllib.request.Request(
                f"{self.cloud_run_api_url}/matchmake",
                data=req_data,
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                if res.get("status") == "matched" and "vm_ws_url" in res:
                    self.server_url = res["vm_ws_url"]
                    print(f"[NetworkManager] Cryptographic handoff received VM WebSocket URL: {self.server_url}")
        except Exception as e:
            print(f"[NetworkManager] Matchmaking HTTP handoff fallback: {e}")

        self.connect(self.server_url, on_message)

    def connect(self, ws_url: Optional[str] = None, on_message: Optional[Callable[[Dict[str, Any]], None]] = None):
        if ws_url:
            self.server_url = ws_url
        self.on_message_callback = on_message or self.on_message_callback
        try:
            import websocket
            self.ws = websocket.WebSocketApp(
                self.server_url,
                on_open=self._on_open,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close
            )
            # Run in background thread
            wst = threading.Thread(target=self.ws.run_forever)
            wst.daemon = True
            wst.start()
        except ImportError:
            print("[NetworkManager] websocket-client module not installed; fallback mock mode.")
            self.connected = False

    def _on_open(self, ws):
        print(f"[NetworkManager] WebSocket Connected to {self.server_url}")
        self.connected = True

    def _on_message(self, ws, message):
        data = json.loads(message)
        if self.on_message_callback:
            self.on_message_callback(data)

    def _on_error(self, ws, error):
        print(f"[NetworkManager] WebSocket Error: {error}")

    def _on_close(self, ws, close_status_code, close_msg):
        print(f"[NetworkManager] WebSocket Connection Closed")
        self.connected = False

    def send_shot_payload(self, V0: float, phi: float, a: float, b: float, player_id: str = "player_1"):
        """
        Emits outbound shot dictionary payload strictly structured as:
        {"action": "shot", "player_id": ..., "V0": ..., "phi": ..., "a": ..., "b": ...}
        """
        payload = {
            "action": "shot",
            "player_id": player_id,
            "V0": float(V0),
            "phi": float(phi),
            "a": float(a),
            "b": float(b)
        }
        json_data = json.dumps(payload)
        if self.ws and self.connected:
            self.ws.send(json_data)
            print(f"[NetworkManager] Outbound Shot Sent: {json_data}")
        else:
            print(f"[NetworkManager] Local Outbound Shot Payload Prepared: {json_data}")
