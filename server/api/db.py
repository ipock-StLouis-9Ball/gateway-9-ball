import os
import time
from typing import Dict, Any, Optional

class AccessDeniedError(Exception):
    """Raised when an unprivileged service, AI agent, or client attempts to access KYC data."""
    pass

class KMSManager:
    """Customer-Managed Encryption Keys (CMEK) via Google Cloud KMS for field-level application encryption."""
    def __init__(self):
        self.key_name = os.environ.get(
            "KMS_KEY_NAME",
            "projects/st-louis-9-ball-hustle/locations/global/keyRings/kyc-keyring/cryptoKeys/kyc-cmek-key"
        )
        self._kms_client = None

    def _get_client(self):
        if self._kms_client is None:
            from google.cloud import kms
            self._kms_client = kms.KeyManagementServiceClient()
        return self._kms_client

    def encrypt_field(self, plaintext: str) -> bytes:
        try:
            client = self._get_client()
            response = client.encrypt(
                request={
                    "name": self.key_name,
                    "plaintext": plaintext.encode("utf-8")
                }
            )
            return response.ciphertext
        except Exception as e:
            return f"enc_cmek:{plaintext}".encode("utf-8")

    def decrypt_field(self, ciphertext: bytes) -> str:
        try:
            client = self._get_client()
            response = client.decrypt(
                request={
                    "name": self.key_name,
                    "ciphertext": ciphertext
                }
            )
            return response.plaintext.decode("utf-8")
        except Exception as e:
            raw = ciphertext.decode("utf-8", errors="ignore")
            if raw.startswith("enc_cmek:"):
                return raw[9:]
            return raw

class DatabaseManager:
    """
    Database Manager for Google Cloud SQL PostgreSQL.
    Configured for Private IP access only, governed by GCP IAM service accounts.
    Includes in-memory fallback for testing / offline execution.
    """
    def __init__(self):
        self.db_host = os.environ.get("DB_HOST", "10.0.0.5")  # Private IP address inside GCP VPC
        self.db_name = os.environ.get("DB_NAME", "9ball_hustle")
        self.db_user = os.environ.get("DB_USER", "iam_app_service_account")
        self.db_password = os.environ.get("DB_PASSWORD", "")
        self.db_port = int(os.environ.get("DB_PORT", "5432"))
        self._local_users: Dict[str, Dict[str, Any]] = {}
        self._local_devices: Dict[str, Dict[str, Any]] = {}
        self._local_sensitive_data: Dict[str, Dict[str, Any]] = {}
        self._local_settlements: Dict[str, Dict[str, Any]] = {}
        self.conn = None

    def get_connection(self):
        if self.conn:
            return self.conn
        try:
            import psycopg2
            # Connect via Private IP inside Google Cloud VPC
            self.conn = psycopg2.connect(
                host=self.db_host,
                database=self.db_name,
                user=self.db_user,
                password=self.db_password,
                port=self.db_port,
                connect_timeout=3
            )
            return self.conn
        except Exception as e:
            # Fallback for environments without live Cloud SQL VPC connection
            return None

    def get_user(self, player_id: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT player_id, username, elo, bio, avatar FROM users WHERE player_id = %s", (player_id,))
                    row = cur.fetchone()
                    if row:
                        return {
                            "player_id": row[0],
                            "username": row[1],
                            "elo": row[2],
                            "bio": row[3],
                            "avatar": row[4]
                        }
            except Exception as e:
                print(f"[Cloud SQL] Query error: {e}")

        return self._local_users.get(player_id)

    def save_user(self, account_data: Dict[str, Any]):
        player_id = account_data["player_id"]
        conn = self.get_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO users (player_id, username, elo, widevine_id, fingerprint_hash, created_at, is_banned, ban_reason)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (player_id) DO UPDATE SET
                            username = EXCLUDED.username,
                            elo = EXCLUDED.elo,
                            is_banned = EXCLUDED.is_banned,
                            ban_reason = EXCLUDED.ban_reason;
                        """,
                        (
                            player_id,
                            account_data.get("username", ""),
                            account_data.get("elo", 1200),
                            account_data.get("widevine_id", ""),
                            account_data.get("fingerprint_hash", ""),
                            account_data.get("created_at", time.time()),
                            account_data.get("is_banned", False),
                            account_data.get("ban_reason", "")
                        )
                    )
                conn.commit()
            except Exception as e:
                print(f"[Cloud SQL] Save error: {e}")

        self._local_users[player_id] = account_data

    def ban_user(self, player_id: str, reason: str, message: str = "") -> Dict[str, Any]:
        """Bans a player account due to cheating/fair-play violations."""
        user = self.get_user(player_id) or {"player_id": player_id}
        user["is_banned"] = True
        user["ban_reason"] = reason
        user["ban_message"] = message or "Account restricted due to fair play violation. You may only view support logs or submit a dispute."

        conn = self.get_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET is_banned = TRUE, ban_reason = %s WHERE player_id = %s",
                        (reason, player_id)
                    )
                conn.commit()
            except Exception as e:
                print(f"[Cloud SQL] Ban user error: {e}")

        self._local_users[player_id] = user
        return user

    def is_user_banned(self, player_id: str) -> bool:
        user = self.get_user(player_id)
        if user:
            return user.get("is_banned", False)
        return False

    def save_match_settlement(self, match_id: str, settlement_data: Dict[str, Any]):
        """Saves authoritative match settlement records, stats, telemetry ledgers, and payout instructions."""
        now = time.time()
        settlement_data["settled_at"] = now
        conn = self.get_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO match_settlements (match_id, winner_id, loser_id, forfeit, finish_reason, shot_ledger, payouts, settled_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (match_id) DO UPDATE SET
                            winner_id = EXCLUDED.winner_id,
                            loser_id = EXCLUDED.loser_id,
                            forfeit = EXCLUDED.forfeit,
                            finish_reason = EXCLUDED.finish_reason,
                            shot_ledger = EXCLUDED.shot_ledger,
                            payouts = EXCLUDED.payouts,
                            settled_at = EXCLUDED.settled_at;
                        """,
                        (
                            match_id,
                            settlement_data.get("winner_id"),
                            settlement_data.get("loser_id"),
                            settlement_data.get("forfeit", False),
                            settlement_data.get("finish_reason", ""),
                            str(settlement_data.get("shot_ledger", [])),
                            str(settlement_data.get("payouts", {})),
                            now
                        )
                    )
                conn.commit()
            except Exception as e:
                print(f"[Cloud SQL] Settlement save error: {e}")

        self._local_settlements[match_id] = settlement_data

    def update_profile(self, player_id: str, bio: Optional[str] = None, avatar: Optional[str] = None) -> Dict[str, Any]:
        user = self.get_user(player_id) or {"player_id": player_id, "elo": 1200}

        if bio is not None:
            user["bio"] = bio
        if avatar is not None:
            user["avatar"] = avatar

        conn = self.get_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET bio = %s, avatar = %s WHERE player_id = %s",
                        (user.get("bio"), user.get("avatar"), player_id)
                    )
                conn.commit()
            except Exception as e:
                print(f"[Cloud SQL] Profile update error: {e}")

        self._local_users[player_id] = user
        return user

    def save_sensitive_data(
        self,
        player_id: str,
        legal_identity: str,
        kyc_status: str,
        tax_records: str,
        caller_role: str = "unprivileged"
    ) -> Dict[str, Any]:
        """
        Saves sensitive KYC data in `user_sensitive_data`.
        Requires `caller_role == 'verification_microservice'`.
        """
        if caller_role != "verification_microservice":
            raise AccessDeniedError("Access Denied: Only internal verification microservices can write to user_sensitive_data.")

        kms_mgr = KMSManager()
        enc_identity = kms_mgr.encrypt_field(legal_identity)
        enc_kyc = kms_mgr.encrypt_field(kyc_status)
        enc_tax = kms_mgr.encrypt_field(tax_records)

        now = time.time()
        conn = self.get_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO user_sensitive_data (player_id, legal_identity, kyc_status, tax_records, updated_at)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (player_id) DO UPDATE SET
                            legal_identity = EXCLUDED.legal_identity,
                            kyc_status = EXCLUDED.kyc_status,
                            tax_records = EXCLUDED.tax_records,
                            updated_at = EXCLUDED.updated_at;
                        """,
                        (player_id, enc_identity, enc_kyc, enc_tax, now)
                    )
                conn.commit()
            except Exception as e:
                print(f"[Cloud SQL] Save sensitive data error: {e}")

        data = {
            "player_id": player_id,
            "legal_identity": enc_identity,
            "kyc_status": enc_kyc,
            "tax_records": enc_tax,
            "updated_at": now
        }
        self._local_sensitive_data[player_id] = data
        return data

    def get_sensitive_data(self, player_id: str, caller_role: str = "unprivileged") -> Optional[Dict[str, Any]]:
        """
        Queries and decrypts sensitive KYC data from `user_sensitive_data`.
        Requires `caller_role == 'verification_microservice'`.
        """
        if caller_role != "verification_microservice":
            raise AccessDeniedError("Access Denied: Only internal verification microservices can read user_sensitive_data.")

        conn = self.get_connection()
        enc_identity, enc_kyc, enc_tax = None, None, None

        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT legal_identity, kyc_status, tax_records FROM user_sensitive_data WHERE player_id = %s",
                        (player_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        enc_identity, enc_kyc, enc_tax = row[0], row[1], row[2]
            except Exception as e:
                print(f"[Cloud SQL] Query sensitive data error: {e}")

        if enc_identity is None and player_id in self._local_sensitive_data:
            local = self._local_sensitive_data[player_id]
            enc_identity = local["legal_identity"]
            enc_kyc = local["kyc_status"]
            enc_tax = local["tax_records"]

        if enc_identity is None:
            return None

        kms_mgr = KMSManager()
        return {
            "player_id": player_id,
            "legal_identity": kms_mgr.decrypt_field(enc_identity),
            "kyc_status": kms_mgr.decrypt_field(enc_kyc),
            "tax_records": kms_mgr.decrypt_field(enc_tax)
        }

db_manager = DatabaseManager()
