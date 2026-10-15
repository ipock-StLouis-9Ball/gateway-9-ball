import sys
import math
import os
from typing import Tuple, List, Dict, Any

from client.trajectory import SkillTrajectoryPredictor, BALL_DIAMETER
from client.network_client import NetworkManager

# Attempt Panda3D import; provide fallback mock runner for headless/test environments
try:
    from direct.showbase.ShowBase import ShowBase
    from panda3d.core import OrthographicLens, CardMaker, LineSegs, NodePath, Vec3
    PANDA3D_AVAILABLE = True
except ImportError:
    PANDA3D_AVAILABLE = False
    ShowBase = object

class Pool3DApp(ShowBase):
    def __init__(self, server_ws_url: str = "ws://localhost:8000/ws/match_runner/room_1"):
        if PANDA3D_AVAILABLE:
            super().__init__()
            self.setup_orthographic_camera()
            self.setup_scene()
        else:
            print("[Panda3D App] Running in headless/mock mode (Panda3D package omitted on backend).")

        self.predictor = SkillTrajectoryPredictor()
        self.network = NetworkManager(fallback_ws_url=server_ws_url)
        self.network.connect(ws_url=server_ws_url, on_message=self.handle_server_message)

        # Game state & touch parameters
        self.cue_pos = (0.0, 0.0)
        self.aim_angle = 0.0  # Radians
        self.power = 0.0      # 0.0 to 1.0 -> maps to V0 (0 to 12.0 m/s)
        self.english_a = 0.0  # Horizontal offset (-0.8 to 0.8)
        self.english_b = 0.0  # Vertical offset (-0.8 to 0.8)
        self.object_balls: List[Tuple[float, float]] = [
            (0.5, 0.2), (-0.4, -0.3), (0.8, -0.1)
        ]

    def setup_orthographic_camera(self):
        """Configure OrthographicLens to match 2:1 pool table aspect ratio."""
        lens = OrthographicLens()
        # 2:1 playing surface dimensions (2.54m x 1.27m)
        lens.setFilmSize(2.54, 1.27)
        self.cam.node().setLens(lens)
        self.camera.setPos(0, 0, 5)
        self.camera.lookAt(0, 0, 0)

    def setup_scene(self):
        """Build initial 3D table & cue stick representation."""
        print("[Panda3D App] Initialized 3D Scene with 2:1 Orthographic Camera Lens")

    def handle_touch_interaction(self, touch_x: float, touch_y: float):
        """
        Gating rule: Touch interactions outside the 2D side control panel (touch_x <= 0.5)
        calculate touch-to-aim film scaling equations and rotate 3D cue stick vector.
        """
        if touch_x > 0.5:
            # Inside right UI panel (e.g., power slider / spin controller)
            return

        # Touch is in playing area (touch_x <= 0.5)
        # Convert touch coordinates (-1.0 to 0.5) into world coordinates via film scaling
        world_x = (touch_x - 0.25) * 2.54
        world_y = touch_y * 1.27

        # Rotate 3D cue stick vector relative to cue ball
        dx = world_x - self.cue_pos[0]
        dy = world_y - self.cue_pos[1]
        self.aim_angle = math.atan2(dy, dx)

        # Update compliant trajectory projection line
        traj = self.predictor.calculate_trajectory(self.cue_pos, self.aim_angle, self.object_balls)
        return traj

    def release_shot(self):
        """On power release, emit raw float shot parameters over WebSocket stream."""
        V0 = self.power * 12.0  # Velocity 0-12 m/s
        phi = self.aim_angle
        a = self.english_a
        b = self.english_b

        # Send raw dictionary payload: {"V0": ..., "phi": ..., "a": ..., "b": ...}
        self.network.send_shot_payload(V0=V0, phi=phi, a=a, b=b)
        self.power = 0.0

    def handle_server_message(self, data: Dict[str, Any]):
        print(f"[Panda3D App] Received Authoritative Server Physics Update: {data}")

if __name__ == "__main__":
    app = Pool3DApp()
    if PANDA3D_AVAILABLE:
        app.run()
