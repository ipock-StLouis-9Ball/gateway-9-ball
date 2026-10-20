## 2026-03-30 - Unauthenticated Endpoint for Financial Match Settlement
**Vulnerability:** The `/api/settle_match` endpoint in `server/api/functions.py` lacked JWT authentication verification, allowing unauthenticated HTTP clients to post match telemetry payloads and trigger settlement logic.
**Learning:** Endpoints handling sensitive game state or payouts must always enforce server-to-server or authenticated caller checks using dependencies like `Depends(verify_jwt_token)`.
**Prevention:** Ensure all non-public endpoints in FastAPI routes require JWT Bearer token validation or IAM authentication.
