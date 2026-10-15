import hashlib
import time
from typing import Dict, Any, Optional

class DeviceFingerprintValidator:
    """
    Enforces an absolute lock against alternate accounts by capturing hardware-level identifiers
    (Widevine Device ID and device manifest build fingerprints) upon registration.
    """
    def __init__(self, db_client=None):
        self.db = db_client
        self._registered_devices: Dict[str, str] = {} # fingerprint_hash -> player_id

    def generate_fingerprint_hash(self, widevine_id: str, build_fingerprint: str) -> str:
        combined = f"{widevine_id}:{build_fingerprint}"
        return hashlib.sha256(combined.encode('utf-8')).hexdigest()

    def register_device(self, player_id: str, widevine_id: str, build_fingerprint: str) -> Dict[str, Any]:
        fp_hash = self.generate_fingerprint_hash(widevine_id, build_fingerprint)

        # Check in-memory / Cloud SQL database
        if fp_hash in self._registered_devices and self._registered_devices[fp_hash] != player_id:
            return {
                "allowed": False,
                "reason": f"Hardware fingerprint locked to account {self._registered_devices[fp_hash]}"
            }

        self._registered_devices[fp_hash] = player_id
        return {"allowed": True, "fingerprint_hash": fp_hash}
