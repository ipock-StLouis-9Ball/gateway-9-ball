import pytest
from unittest.mock import AsyncMock, MagicMock
from server.match_runner.runner import GameRoom

@pytest.mark.asyncio
async def test_process_shot_invalid_numeric_inputs():
    """Verify process_shot silently drops malformed non-numeric inputs without crashing or altering room state."""
    room = GameRoom(room_id="test_room_1")

    # Mock WebSocket client
    mock_ws = AsyncMock()
    mock_ws.send_json = AsyncMock()
    room.sockets.add(mock_ws)

    initial_cue_ball_pos = dict(room.cue_ball_pos)
    initial_history_len = len(room.history)

    invalid_payloads = [
        {"V0": "invalid", "phi": 0.0, "a": 0.0, "b": 0.0},
        {"V0": 2.0, "phi": None, "a": 0.0, "b": 0.0},
        {"V0": 2.0, "phi": 1.5, "a": "", "b": 0.0},
        {"V0": "bad", "phi": "bad", "a": None, "b": ""},
        {"V0": [1, 2], "phi": 0.0, "a": 0.0, "b": 0.0},
        {"V0": {"key": "val"}, "phi": 0.0, "a": 0.0, "b": 0.0},
    ]

    for payload in invalid_payloads:
        # Executing process_shot should handle exception internally and return silently
        await room.process_shot("player_1", payload, mock_ws)

        # 1. room.history remains unchanged
        assert len(room.history) == initial_history_len, f"History changed for payload {payload}"

        # 2. Cue ball position remains unchanged
        assert room.cue_ball_pos == initial_cue_ball_pos, f"Cue ball position changed for payload {payload}"

        # 3. No message broadcast to WebSocket clients
        mock_ws.send_json.assert_not_called()
