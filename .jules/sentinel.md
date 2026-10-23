## 2025-05-18 - JWT Bearer Authentication Enforcement on Match Settlement Endpoint
**Vulnerability:** Unauthenticated API endpoint `/api/settle_match` allowed unauthorized submitters to execute match settlements, potentially tampering with game outcomes and payout calculations.
**Learning:** Endpoints processing authoritative physics replay data and payout execution must require JWT Bearer token authentication rather than relying on implicit endpoint secrecy.
**Prevention:** Always attach `Depends(verify_jwt_bearer)` or equivalent authentication dependencies to sensitive stateless API endpoints.
