import math
from client.trajectory import SkillTrajectoryPredictor, MAX_OBJECT_BALL_PATH_LENGTH, BALL_DIAMETER
from client.main import Pool3DApp

def test_client_architecture():
    app = Pool3DApp()

    # 1. Test Touch Interaction Gating outside side panel (X <= 0.5)
    traj = app.handle_touch_interaction(touch_x=-0.2, touch_y=0.1)
    assert traj is not None, "Trajectory must be generated for touch_x <= 0.5"
    assert "cue_line" in traj, "Trajectory must contain cue_line"

    # 2. Test Touch Interaction inside side panel (X > 0.5) - should be ignored by aiming
    ignored_traj = app.handle_touch_interaction(touch_x=0.8, touch_y=0.5)
    assert ignored_traj is None, "Touch inside side panel (X > 0.5) must not alter aiming line"

    # 3. Test SkillTrajectoryPredictor compliance (2-ball length cap)
    predictor = SkillTrajectoryPredictor()
    cue_pos = (0.0, 0.0)
    aim_angle = 0.0 # Pointing directly right at object ball at (0.5, 0.0)
    object_balls = [(0.5, 0.0)]

    result = predictor.calculate_trajectory(cue_pos, aim_angle, object_balls)
    assert result["object_line"] is not None, "Object ball target line must be generated on collision path"

    obj_line = result["object_line"]
    start = obj_line["start"]
    end = obj_line["end"]
    length = math.sqrt((end[0] - start[0])**2 + (end[1] - start[1])**2)

    assert abs(length - MAX_OBJECT_BALL_PATH_LENGTH) < 1e-5, f"Object ball path length {length} must equal 2 ball diameters ({MAX_OBJECT_BALL_PATH_LENGTH})"

    # 4. Test shot release payload emission
    app.power = 0.75
    app.aim_angle = 1.25
    app.english_a = 0.2
    app.english_b = -0.1

    app.release_shot()
    assert app.power == 0.0, "Power must reset to 0.0 after shot release"

    print("All Client 3D Architecture tests PASSED successfully!")

if __name__ == "__main__":
    test_client_architecture()
