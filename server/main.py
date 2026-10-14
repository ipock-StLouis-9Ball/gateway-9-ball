import os
import json
from fastapi import FastAPI
from server.firebase_logic.functions import router as firebase_router
from server.match_runner.runner import app as match_runner_app

app = FastAPI(title="9-Ball Hustle Serverless & Stateful Unified Backend")

# Mount Stateless Firebase Router
app.include_router(firebase_router)

# Mount Stateful Match Runner App
app.mount("/match_runner", match_runner_app)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "9-Ball Hustle Unified Architecture",
        "stateless_endpoints": "/firebase/*",
        "stateful_ws_endpoint": "/match_runner/ws/match_runner/{room_id}"
    }
