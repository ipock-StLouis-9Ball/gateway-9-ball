import os
import json
from fastapi import FastAPI, Request, Response, HTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from server.api.functions import router as api_router, limiter

app = FastAPI(title="9-Ball Hustle Cloud Run Stateless API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mount Stateless API Router
app.include_router(api_router)

@app.middleware("http")
async def enforce_https_and_headers(request: Request, call_next):
    """
    Enforces HTTPS header check on Cloud Run when behind load balancers.
    """
    proto = request.headers.get("x-forwarded-proto", "https")
    if proto == "http" and os.environ.get("ENFORCE_HTTPS", "false").lower() == "true":
        raise HTTPException(status_code=403, detail="HTTPS connection required.")

    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

@app.get("/")
@limiter.limit("30/minute")
def read_root(request: Request):
    return {
        "status": "online",
        "service": "9-Ball Hustle Cloud Run Stateless API",
        "stateless_endpoints": "/api/*"
    }
