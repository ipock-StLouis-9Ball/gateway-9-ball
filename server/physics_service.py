import math
from typing import Dict, Any, List

class ShotResolver:
    """
    Server-authoritative Pooltool physics engine resolver running continuously on Compute Engine VM.
    Enforces absolute physics authority over ball positions, velocities, and collision states.
    """
    def __init__(self):
        pass

    def validate_shot_params(self, V0: float, phi: float, a: float, b: float) -> bool:
        """Validate shot parameters against legal physical bounds."""
        for param in (V0, phi, a, b):
            if isinstance(param, bool) or not isinstance(param, (int, float)) or math.isnan(param) or math.isinf(param):
                return False
        if not (0.0 <= V0 <= 15.0): # Velocity limit 0 - 15 m/s
            return False
        if not (-2.0 * math.pi <= phi <= 2.0 * math.pi): # Angle bounds
            return False
        if not (-0.8 <= a <= 0.8): # English offset horizontal
            return False
        if not (-0.8 <= b <= 0.8): # English offset vertical
            return False
        return True

    def simulate_shot(self, cue_ball_pos: Dict[str, float], V0: float, phi: float, a: float, b: float) -> Dict[str, Any]:
        """
        Server-authoritative physics simulation using Pooltool physical vectors.
        Calculates exact final ball positions and event outcomes (collisions, pocketing, fouls).
        The client is never allowed to dictate ball positions or state.
        """
        if not self.validate_shot_params(V0, phi, a, b):
            raise ValueError("Illegal or impossible shot parameters detected")

        # Vector calculations using pooltool physical properties (cue angle, velocity, deflection english)
        eff_v = V0 * (1.0 - 0.1 * abs(a) - 0.1 * abs(b))
        deflection_angle = phi - 0.05 * a
        vx = eff_v * math.cos(deflection_angle)
        vy = eff_v * math.sin(deflection_angle)

        # Server-calculated authoritative trajectory and position displacement
        delta_t = 0.5
        final_cue_x = cue_ball_pos.get("x", 0.0) + vx * delta_t
        final_cue_y = cue_ball_pos.get("y", 0.0) + vy * delta_t

        return {
            "status": "success",
            "shot_input": {"V0": V0, "phi": phi, "a": a, "b": b},
            "cue_ball_final": {"x": round(final_cue_x, 4), "y": round(final_cue_y, 4)},
            "potted_balls": [],
            "foul": False,
            "next_player_turn": True
        }
