import math
import time
import jwt
import pytest
from fastapi.testclient import TestClient

from server.main import app as cloud_run_app
from server.match_runner.runner import app as vm_app, verify_handoff_token, GameRoom, JWT_SECRET, used_tokens
from server.physics_service import ShotResolver
from server.matchmaking import SBMMQueue
from server.api.db import db_manager

client = TestClient(cloud_run_app)

def test_stateless_api_endpoints():
    # 1. Test account creation
    acc_res = client.post("/api/create_account", json={
        "player_id": "p1_test",
        "username": "PoolMaster",
        "widevine_id": "wv_test_123",
        "build_fingerprint": "build_test_456"
    })
    assert acc_res.status_code == 200
    assert acc_res.json()["status"] == "success"

    # 2. Test profile update
    prof_res = client.post("/api/update_profile", json={
        "player_id": "p1_test",
        "bio": "Pro Hustler",
        "avatar": "cue_gold.png"
    })
    assert prof_res.status_code == 200
    assert prof_res.json()["profile"]["bio"] == "Pro Hustler"

    # 3. Test Elo query
    elo_res = client.get("/api/get_elo/p1_test")
    assert elo_res.status_code == 200
    assert elo_res.json()["elo"] == 1200
    assert elo_res.json()["bracket"] == "Intermediate"

def test_matchmaking_jwt_handoff():
    # Enqueue first player
    res1 = client.post("/api/matchmake", json={"player_id": "player_alpha"})
    assert res1.status_code == 200
    assert res1.json()["status"] == "queued"

    # Enqueue second player -> match triggered and JWT handoff returned
    res2 = client.post("/api/matchmake", json={"player_id": "player_beta"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "matched"
    assert "vm_ws_url" in data2
    assert "token" in data2

    token = data2["token"]
    match_id = data2["match_info"]["match_id"]

    # Test JWT token verification on VM match runner
    decoded = verify_handoff_token(token, match_id)
    assert decoded is not None
    assert decoded["player_id"] == "player_beta"
    assert decoded["match_id"] == match_id

    # Test single-use token protection (second attempt with same token must be rejected)
    replayed = verify_handoff_token(token, match_id)
    assert replayed is None, "Replayed single-use JWT token must be rejected!"

def test_anti_cheat_physics_authority():
    resolver = ShotResolver()

    # 1. Test legal shot inputs
    assert resolver.validate_shot_params(V0=10.0, phi=0.5, a=0.2, b=-0.1) is True

    # 2. Test impossible/hacked shot power (V0 > 15 m/s) -> MUST FAIL
    assert resolver.validate_shot_params(V0=999.0, phi=0.5, a=0.2, b=-0.1) is False

    # 3. Test impossible English offset -> MUST FAIL
    assert resolver.validate_shot_params(V0=10.0, phi=0.5, a=2.5, b=-0.1) is False

    # 4. Test simulate_shot with invalid inputs throws ValueError
    with pytest.raises(ValueError):
        resolver.simulate_shot({"x": 0.0, "y": 0.0}, V0=50.0, phi=0.0, a=0.0, b=0.0)

    # 5. Test legal shot physics calculation
    result = resolver.simulate_shot({"x": 0.0, "y": 0.0}, V0=10.0, phi=0.0, a=0.0, b=0.0)
    assert result["status"] == "success"
    assert result["cue_ball_final"]["x"] == 5.0 # V0=10.0 * dt=0.5 -> delta_x = 5.0

if __name__ == "__main__":
    test_stateless_api_endpoints()
    test_matchmaking_jwt_handoff()
    test_anti_cheat_physics_authority()
    print("All architecture tests passed!")
