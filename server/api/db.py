import os
import time
from typing import Dict, Any, Optional

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
                        INSERT INTO users (player_id, username, elo, widevine_id, fingerprint_hash, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (player_id) DO UPDATE SET
                            username = EXCLUDED.username,
                            elo = EXCLUDED.elo;
                        """,
                        (
                            player_id,
                            account_data.get("username", ""),
                            account_data.get("elo", 1200),
                            account_data.get("widevine_id", ""),
                            account_data.get("fingerprint_hash", ""),
                            account_data.get("created_at", time.time())
                        )
                    )
                conn.commit()
            except Exception as e:
                print(f"[Cloud SQL] Save error: {e}")

        self._local_users[player_id] = account_data

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

db_manager = DatabaseManager()
