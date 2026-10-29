## 2026-10-29 - Missing JWT Authentication on Match Settlement Endpoint
**Vulnerability:** The stateless API endpoint `/api/settle_match` accepted settlement requests without requiring or validating a JWT Bearer token in the `Authorization` header, allowing unauthenticated callers to submit match settlement instructions or attempt DoS attacks.
**Learning:** Key stateless business-logic endpoints in FastAPI routers can inadvertently omit authentication middleware or header validation when relying on internal services or headless simulation logic.
**Prevention:** Always enforce Bearer token validation and rate limiting on sensitive API endpoints handling payouts or match settlement, ensuring requests without valid authorization are rejected with HTTP 401.
