from server.devops_monitor.security import DeviceFingerprintValidator
from server.devops_monitor.agent import AutonomicDevOpsAgent

def test_device_fingerprint_lock():
    validator = DeviceFingerprintValidator()

    # Register Player 1 on device A
    res1 = validator.register_device("player_1", widevine_id="wv_12345", build_fingerprint="build_abc")
    assert res1["allowed"] is True, "First registration must be allowed"

    # Register Player 1 again on device A - allowed
    res1_again = validator.register_device("player_1", widevine_id="wv_12345", build_fingerprint="build_abc")
    assert res1_again["allowed"] is True, "Same player on same device must be allowed"

    # Attempt to register Player 2 (alt account) on same device A - MUST BE BLOCKED
    res2 = validator.register_device("player_2_alt", widevine_id="wv_12345", build_fingerprint="build_abc")
    assert res2["allowed"] is False, "Alternate account on same hardware fingerprint must be blocked"
    print("Device fingerprint hardware locking test PASSED!")

def test_devops_agent_ledger_and_quarantine():
    agent = AutonomicDevOpsAgent()

    # 1. Test balanced ledger entries
    balanced_entries = [
        {"debit": 10.0, "credit": 0.0, "account": "wager_vault"},
        {"debit": 0.0, "credit": 10.0, "account": "escrow_pool"}
    ]
    res_balanced = agent.inspect_ledger_integrity(balanced_entries)
    assert res_balanced["status"] == "HEALTHY"

    # 2. Test unbalanced ledger breach (e.g., $10 debit vs $8 credit)
    unbalanced_entries = [
        {"debit": 10.0, "credit": 0.0, "account": "wager_vault"},
        {"debit": 0.0, "credit": 8.0, "account": "escrow_pool"}
    ]
    res_unbalanced = agent.inspect_ledger_integrity(unbalanced_entries)
    assert res_unbalanced["status"] == "BREACH_DETECTED"
    assert res_unbalanced["action"] == "SELF_HEALING_ROLLBACK"

    # 3. Test telemetry bot detection & quarantine
    bot_telemetry = {"shot_interval_sec": 0.02} # Suspiciously rapid shot rate
    analysis = agent.analyze_player_behavior("hacker_bot", bot_telemetry)
    assert analysis["status"] == "QUARANTINED"
    assert "hacker_bot" in agent.quarantined_players

    print("DevOps Agent ledger integrity and quarantine test PASSED!")

if __name__ == "__main__":
    test_device_fingerprint_lock()
    test_devops_agent_ledger_and_quarantine()
