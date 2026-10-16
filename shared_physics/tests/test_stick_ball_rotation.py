import numpy as np
from pooltool.ptmath.utils import coordinate_rotation_x


def test_coordinate_rotation_x_matrix():
    """Verify coordinate_rotation_x accurately matches expected mathematical formulas."""
    thetas = [0.0, 10.0, 15.5, 45.0, 90.0, -20.0]
    cue_a, cue_b = 0.2, 0.3
    cue_c = np.sqrt(1.0 - cue_a**2 - cue_b**2)
    cue_Q = np.array([cue_a, cue_c, cue_b])

    for theta in thetas:
        theta_rad = theta * np.pi / 180.0

        # Original inline calculation
        orig_ball_a = cue_a
        orig_ball_c = np.cos(theta_rad) * cue_c - np.sin(theta_rad) * cue_b
        orig_ball_b = np.sin(theta_rad) * cue_c + np.cos(theta_rad) * cue_b

        # Refactored rotation function
        ref_ball_a, ref_ball_c, ref_ball_b = coordinate_rotation_x(cue_Q, theta_rad)

        assert np.isclose(ref_ball_a, orig_ball_a)
        assert np.isclose(ref_ball_c, orig_ball_c)
        assert np.isclose(ref_ball_b, orig_ball_b)


def test_coordinate_rotation_x_identity():
    """Verify theta=0 produces identity rotation."""
    v = np.array([1.0, 2.0, 3.0])
    res = coordinate_rotation_x(v, 0.0)
    assert np.allclose(res, v)
