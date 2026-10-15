import time
import os
from typing import Optional, Dict, Any, List
from server.api.db import db_manager

class SBMMQueue:
    def __init__(self, redis_client=None, db_client=None):
        self.redis = redis_client
        self.db = db_client or db_manager
        # Fallback local memory queue if Redis is not configured
        self._local_queue: Dict[str, Dict[str, Any]] = {}

    def get_player_elo(self, player_id: str) -> int:
        if self.db:
            try:
                user = self.db.get_user(player_id)
                if user:
                    return user.get('elo', 1200)
            except Exception as e:
                print(f"Database get_player_elo error: {e}")
        return 1200

    def enqueue_player(self, player_id: str, elo: Optional[int] = None) -> int:
        if elo is None:
            elo = self.get_player_elo(player_id)

        timestamp = time.time()
        if self.redis:
            try:
                # Add player to Redis ZSET ordered by Elo
                self.redis.zadd("matchmaking_queue", {player_id: elo})
                self.redis.hset(f"player_queue_time:{player_id}", mapping={"time": timestamp, "elo": elo})
            except Exception as e:
                print(f"Redis enqueue error: {e}")
                self._local_queue[player_id] = {"elo": elo, "time": timestamp}
        else:
            self._local_queue[player_id] = {"elo": elo, "time": timestamp}

        return elo

    def dequeue_player(self, player_id: str):
        if self.redis:
            try:
                self.redis.zrem("matchmaking_queue", player_id)
                self.redis.delete(f"player_queue_time:{player_id}")
            except Exception as e:
                print(f"Redis dequeue error: {e}")
        self._local_queue.pop(player_id, None)

    def find_match(self, player_id: str, elo_window: int = 200) -> Optional[Dict[str, Any]]:
        player_elo = self.get_player_elo(player_id)

        if self.redis:
            try:
                min_elo = max(0, player_elo - elo_window)
                max_elo = player_elo + elo_window

                # Query candidates within ELO range
                candidates = self.redis.zrangebyscore("matchmaking_queue", min_elo, max_elo)
                for cand in candidates:
                    cand_str = cand.decode('utf-8') if isinstance(cand, bytes) else cand
                    if cand_str != player_id:
                        # Match found! Dequeue both
                        self.dequeue_player(player_id)
                        self.dequeue_player(cand_str)
                        return {
                            "match_id": f"match_{int(time.time()*1000)}",
                            "player1": player_id,
                            "player2": cand_str,
                            "p1_elo": player_elo,
                            "p2_elo": self.get_player_elo(cand_str)
                        }
            except Exception as e:
                print(f"Redis find_match error: {e}")

        # Local fallback queue matching logic
        for cand_id, data in list(self._local_queue.items()):
            if cand_id != player_id:
                if abs(data["elo"] - player_elo) <= elo_window:
                    self.dequeue_player(player_id)
                    self.dequeue_player(cand_id)
                    return {
                        "match_id": f"match_{int(time.time()*1000)}",
                        "player1": player_id,
                        "player2": cand_id,
                        "p1_elo": player_elo,
                        "p2_elo": data["elo"]
                    }

        # Enqueue current player if no opponent was found
        self.enqueue_player(player_id, player_elo)
        return None

global_sbmm_queue = SBMMQueue()
