import math
import time
import secrets
import pytest
from fastapi.testclient import TestClient

from server.main import app as cloud_run_app
from server.match_runner.runner import app as vm_app, GameRoom, rooms
from server.physics_service import ShotResolver
from server.matchmaking import SBMMQueue
from server.api.db import db_manager, AccessDeniedError

client = TestClient(cloud_run_app)
vm_client = TestClient(vm_app)

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

def test_kyc_data_isolation():
    # 1. Verification microservice can write and read sensitive KYC schema
    saved = db_manager.save_sensitive_data(
        player_id="p1_test",
        legal_identity="John Doe 1985-05-12",
        kyc_status="VERIFIED",
        tax_records="W9-987654321",
        caller_role="verification_microservice"
    )
    assert saved["player_id"] == "p1_test"

    fetched = db_manager.get_sensitive_data(
        player_id="p1_test",
        caller_role="verification_microservice"
    )
    assert fetched["kyc_status"] == "VERIFIED"

    # 2. Unprivileged callers (game server, AI agent, Cloud Run endpoint) are REJECTED with AccessDeniedError
    with pytest.raises(AccessDeniedError):
        db_manager.get_sensitive_data("p1_test", caller_role="unprivileged")

    with pytest.raises(AccessDeniedError):
        db_manager.save_sensitive_data("p1_test", "Hacker", "REJECTED", "TAX-0", caller_role="game_server")

def test_matchmaking_server_to_server_handoff():
    # Enqueue first player
    res1 = client.post("/api/matchmake", json={"player_id": "player_alpha"})
    assert res1.status_code == 200
    assert res1.json()["status"] == "queued"

    # Enqueue second player -> triggers match and direct server-to-server VM seeding
    res2 = client.post("/api/matchmake", json={"player_id": "player_beta"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "matched"
    assert "token" in data2
    assert len(data2["token"]) == 32  # 32-character high-entropy token

    # Check that player_alpha can also retrieve their token
    res1_again = client.post("/api/matchmake", json={"player_id": "player_alpha"})
    assert res1_again.status_code == 200
    data1 = res1_again.json()
    assert data1["status"] == "matched"
    assert len(data1["token"]) == 32
    assert data1["token"] != data2["token"]

def test_single_use_token_consumption_and_reconnect():
    # Direct VM seeding test
    seed_res = vm_client.post("/internal/seed_match", json={
        "match_id": "match_test_100",
        "player1_id": "p1_token_test",
        "player2_id": "p2_token_test"
    })
    assert seed_res.status_code == 200
    seed_data = seed_res.json()
    token_p1 = seed_data["tokens"]["p1_token_test"]

    # Connect to WebSocket using single-use token
    with vm_client.websocket_connect(f"/ws/match_runner/match_test_100?token={token_p1}") as ws:
        connected_data = ws.receive_json()
        assert connected_data["event"] == "connected"
        assert connected_data["player_id"] == "p1_token_test"
        assert "reconnect_secret" in connected_data
        rec_secret = connected_data["reconnect_secret"]
        assert len(rec_secret) == 32

    # Second connect attempt with the SAME token MUST FAIL (single-use consumption & deletion)
    with pytest.raises(Exception):
        with vm_client.websocket_connect(f"/ws/match_runner/match_test_100?token={token_p1}") as ws_replayed:
            ws_replayed.receive_json()

    # Reconnect using the Session Reconnect Secret MUST SUCCEED
    with vm_client.websocket_connect(f"/ws/match_runner/match_test_100?reconnect_secret={rec_secret}") as ws_rec:
        reconnected_data = ws_rec.receive_json()
        assert reconnected_data["event"] == "reconnected"
        assert reconnected_data["player_id"] == "p1_token_test"

def test_authoritative_replay_verification_and_anti_cheat():
    resolver = ShotResolver()

    # Generate valid JWT token for settlement requests
    import jwt
    from server.api.functions import JWT_SECRET, JWT_ALGORITHM
    token = jwt.encode({"sub": "match_runner_vm"}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    headers = {"Authorization": f"Bearer {token}"}

    # 0. Unauthenticated settlement attempt MUST fail with 401
    unauth_res = client.post("/api/settle_match", json={
        "match_id": "unauth_match",
        "winner_id": "honest_player",
        "shot_ledger": []
    })
    assert unauth_res.status_code == 401

    # 1. Clean match shot ledger
    clean_shot = {
        "player_id": "honest_player",
        "input": {"V0": 5.0, "phi": 0.0, "a": 0.0, "b": 0.0},
        "physics_result": resolver.simulate_shot({"x": 0.0, "y": 0.0}, V0=5.0, phi=0.0, a=0.0, b=0.0)
    }

    clean_settlement = client.post("/api/settle_match", headers=headers, json={
        "match_id": "clean_match_1",
        "winner_id": "honest_player",
        "loser_id": "cheater_player",
        "shot_ledger": [clean_shot],
        "players": {"honest_player": {}, "cheater_player": {}}
    })
    assert clean_settlement.status_code == 200
    assert clean_settlement.json()["divergence_detected"] is False

    # 2. Tampered shot ledger (impossibly high V0 power)
    tampered_shot = {
        "player_id": "cheater_player",
        "input": {"V0": 999.0, "phi": 0.0, "a": 0.0, "b": 0.0},
        "physics_result": {"cue_ball_final": {"x": 500.0, "y": 0.0}}
    }

    tampered_settlement = client.post("/api/settle_match", headers=headers, json={
        "match_id": "tampered_match_1",
        "winner_id": "cheater_player",
        "loser_id": "honest_player",
        "shot_ledger": [tampered_shot],
        "players": {"honest_player": {}, "cheater_player": {}}
    })
    assert tampered_settlement.status_code == 200
    t_data = tampered_settlement.json()
    assert t_data["divergence_detected"] is True
    assert t_data["violating_player"] == "cheater_player"
    assert t_data["settlement"]["winner_id"] == "honest_player" # Overturned to honest player!

    # 3. Check cheater is banned in Cloud SQL
    assert db_manager.is_user_banned("cheater_player") is True

    # 4. Banned cheater trying to enter matchmaking gets HTTP 403
    banned_matchmake = client.post("/api/matchmake", json={"player_id": "cheater_player"})
    assert banned_matchmake.status_code == 403

def test_ball_physics_and_pocket_drop_mechanics():
    resolver = ShotResolver()

    # 1. Test legal shot bounds validation
    assert resolver.validate_shot_params(V0=10.0, phi=0.5, a=0.2, b=-0.1) is True
    assert resolver.validate_shot_params(V0=999.0, phi=0.5, a=0.2, b=-0.1) is False
    assert resolver.validate_shot_params(V0=10.0, phi=0.5, a=2.5, b=-0.1) is False

    # 2. Test shot physics trajectory calculation
    res = resolver.simulate_shot({"x": 0.0, "y": 0.0}, V0=10.0, phi=0.0, a=0.0, b=0.0)
    assert res["status"] == "success"
    assert res["cue_ball_final"]["x"] == 5.0 # V0=10.0 * dt=0.5 -> delta_x = 5.0

if __name__ == "__main__":
    test_stateless_api_endpoints()
    test_kyc_data_isolation()
    test_matchmaking_server_to_server_handoff()
    test_single_use_token_consumption_and_reconnect()
    test_authoritative_replay_verification_and_anti_cheat()
    test_ball_physics_and_pocket_drop_mechanics()
    print("All architecture & security tests passed successfully!")
