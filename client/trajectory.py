import math
from typing import Dict, Any, Tuple, Optional, List

# Standard WPA 9-foot ball diameter = 0.05715 meters (57.15mm)
BALL_RADIUS = 0.05715 / 2.0
BALL_DIAMETER = 0.05715
MAX_OBJECT_BALL_PATH_LENGTH = 2.0 * BALL_DIAMETER  # Capped strictly at 2-ball length (0.1143m)

class SkillTrajectoryPredictor:
    """
    SkillTrajectoryPredictor calculates aim projection vectors for legal compliance:
    - Solid white cue ball trajectory line up to the point of impact.
    - Faint ghost-yellow target line off the object ball capped strictly at 2 ball diameters.
    """
    def __init__(self, ball_radius: float = BALL_RADIUS):
        self.ball_radius = ball_radius

    def calculate_trajectory(
        self,
        cue_pos: Tuple[float, float],
        aim_angle: float,
        object_balls: List[Tuple[float, float]]
    ) -> Dict[str, Any]:
        """
        Calculates cue line and target line projections.
        aim_angle: angle in radians (0 = pointing right along +X axis)
        """
        dx = math.cos(aim_angle)
        dy = math.sin(aim_angle)

        closest_impact_dist = float('inf')
        target_ball: Optional[Tuple[float, float]] = None

        # Check collision with object balls
        for ob in object_balls:
            ob_x, ob_y = ob
            # Vector from cue ball to object ball
            tox = ob_x - cue_pos[0]
            toy = ob_y - cue_pos[1]

            # Project onto aim vector
            proj_length = tox * dx + toy * dy
            if proj_length > 0:
                # Distance squared from ray to ball center
                perp_dist_sq = (tox*tox + toy*toy) - (proj_length * proj_length)
                collision_dist_threshold = (2 * self.ball_radius) ** 2

                if perp_dist_sq <= collision_dist_threshold:
                    # Point of contact distance
                    d_impact = proj_length - math.sqrt(max(0, collision_dist_threshold - perp_dist_sq))
                    if d_impact < closest_impact_dist:
                        closest_impact_dist = d_impact
                        target_ball = ob

        # Default max line length if no object ball in path
        if target_ball is None or closest_impact_dist == float('inf'):
            impact_point = (cue_pos[0] + dx * 2.5, cue_pos[1] + dy * 2.5)
            return {
                "cue_line": {
                    "start": cue_pos,
                    "end": impact_point,
                    "color": (1.0, 1.0, 1.0, 1.0) # Solid white line
                },
                "object_line": None
            }

        # Cue line ends at collision point
        impact_point = (cue_pos[0] + dx * closest_impact_dist, cue_pos[1] + dy * closest_impact_dist)

        # Object ball reflection direction
        ob_x, ob_y = target_ball
        obj_dx = ob_x - impact_point[0]
        obj_dy = ob_y - impact_point[1]
        obj_dist = math.sqrt(obj_dx*obj_dx + obj_dy*obj_dy)
        if obj_dist > 0:
            obj_dx /= obj_dist
            obj_dy /= obj_dist

        # Object line start & end (capped strictly at 2 ball diameters)
        obj_start = (ob_x, ob_y)
        obj_end = (
            ob_x + obj_dx * MAX_OBJECT_BALL_PATH_LENGTH,
            ob_y + obj_dy * MAX_OBJECT_BALL_PATH_LENGTH
        )

        return {
            "cue_line": {
                "start": cue_pos,
                "end": impact_point,
                "color": (1.0, 1.0, 1.0, 1.0) # Solid white cue line
            },
            "object_line": {
                "start": obj_start,
                "end": obj_end,
                "color": (1.0, 1.0, 0.0, 0.4), # Faint ghost-yellow target line
                "max_length": MAX_OBJECT_BALL_PATH_LENGTH
            }
        }
