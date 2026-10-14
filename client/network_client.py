import json
import asyncio
import threading
from typing import Dict, Any, Optional, Callable

class NetworkManager:
    """
    Client-side WebSocket Network Manager connecting directly to the stateful match runner server.
    Emits raw shot parameters {"V0": ..., "phi": ..., "a": ..., "b": ...} upon power release.
    """
    def __init__(self, server_url: str = "ws://localhost:8000/match_runner/ws/match_runner/room_1"):
        self.server_url = server_url
        self.ws = None
        self.connected = False
        self.on_message_callback: Optional[Callable[[Dict[str, Any]], None]] = None

    def connect(self, on_message: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.on_message_callback = on_message
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
        {"V0": ..., "phi": ..., "a": ..., "b": ...}
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
