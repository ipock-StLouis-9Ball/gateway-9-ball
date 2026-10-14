import hashlib
import time
from typing import Dict, Any, Optional

class DeviceFingerprintValidator:
    """
    Enforces an absolute lock against alternate accounts by capturing hardware-level identifiers
    (Widevine Device ID and device manifest build fingerprints) upon registration.
    """
    def __init__(self, firestore_db=None):
        self.db = firestore_db
        self._registered_devices: Dict[str, str] = {} # fingerprint_hash -> player_id

    def generate_fingerprint_hash(self, widevine_id: str, build_fingerprint: str) -> str:
        combined = f"{widevine_id}:{build_fingerprint}"
        return hashlib.sha256(combined.encode('utf-8')).hexdigest()

    def register_device(self, player_id: str, widevine_id: str, build_fingerprint: str) -> Dict[str, Any]:
        fp_hash = self.generate_fingerprint_hash(widevine_id, build_fingerprint)

        if self.db:
            try:
                device_ref = self.db.collection('device_fingerprints').document(fp_hash)
                doc = device_ref.get()
                if doc.exists:
                    existing_player = doc.to_dict().get('player_id')
                    if existing_player != player_id:
                        return {
                            "allowed": False,
                            "reason": f"Hardware fingerprint locked to another account ({existing_player}). Multi-accounting blocked."
                        }
                else:
                    device_ref.set({
                        "player_id": player_id,
                        "widevine_id": widevine_id,
                        "build_fingerprint": build_fingerprint,
                        "registered_at": time.time()
                    })
            except Exception as e:
                print(f"Device fingerprint registration error in Firestore: {e}")

        # In-memory check
        if fp_hash in self._registered_devices and self._registered_devices[fp_hash] != player_id:
            return {
                "allowed": False,
                "reason": f"Hardware fingerprint locked to account {self._registered_devices[fp_hash]}"
            }

        self._registered_devices[fp_hash] = player_id
        return {"allowed": True, "fingerprint_hash": fp_hash}
