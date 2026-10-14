import os
import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from server.devops_monitor.security import DeviceFingerprintValidator

router = APIRouter(prefix="/firebase", tags=["stateless_firebase"])

device_validator = DeviceFingerprintValidator()

class UserAccountRequest(BaseModel):
    player_id: str
    username: str
    widevine_id: str
    build_fingerprint: str

class ProfileUpdateRequest(BaseModel):
    player_id: str
    bio: Optional[str] = None
    avatar: Optional[str] = None

class EloQueryRequest(BaseModel):
    player_id: str

# In-memory mock database for fallback stateless processing
_mock_user_db: Dict[str, Dict[str, Any]] = {}

@router.post("/create_account")
def create_user_account(req: UserAccountRequest):
    """
    Stateless Firebase Function handler:
    Validates hardware Device ID fingerprint, prevents multi-accounting, and registers user profile.
    """
    # Hardware device ID validation
    fp_res = device_validator.register_device(req.player_id, req.widevine_id, req.build_fingerprint)
    if not fp_res.get("allowed"):
        raise HTTPException(status_code=403, detail=fp_res.get("reason"))

    account_data = {
        "player_id": req.player_id,
        "username": req.username,
        "elo": 1200,
        "created_at": time.time(),
        "widevine_id": req.widevine_id,
        "fingerprint_hash": fp_res.get("fingerprint_hash")
    }
    _mock_user_db[req.player_id] = account_data
    return {"status": "success", "account": account_data}

@router.post("/update_profile")
def update_profile(req: ProfileUpdateRequest):
    """Stateless profile update handler."""
    if req.player_id not in _mock_user_db:
        _mock_user_db[req.player_id] = {"player_id": req.player_id, "elo": 1200}

    if req.bio is not None:
        _mock_user_db[req.player_id]["bio"] = req.bio
    if req.avatar is not None:
        _mock_user_db[req.player_id]["avatar"] = req.avatar

    return {"status": "success", "profile": _mock_user_db[req.player_id]}

@router.get("/get_elo/{player_id}")
def get_elo_bracket(player_id: str):
    """Stateless Elo bracket query."""
    user = _mock_user_db.get(player_id, {"player_id": player_id, "elo": 1200})
    elo = user.get("elo", 1200)

    # Bracket classification
    if elo < 1000:
        bracket = "Rookie"
    elif elo < 1500:
        bracket = "Intermediate"
    elif elo < 2000:
        bracket = "Advanced"
    else:
        bracket = "Veteran"

    return {"player_id": player_id, "elo": elo, "bracket": bracket}
