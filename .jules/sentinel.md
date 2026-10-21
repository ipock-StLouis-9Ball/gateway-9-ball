## 2025-05-18 - Require JWT Authentication for Match Settlement Endpoint
**Vulnerability:** Unauthenticated access to the `/api/settle_match` endpoint allowed any unauthenticated client/caller to post arbitrary match settlement payloads, trigger headless physics replay verifications, alter match statistics, and manipulate payout instructions.
**Learning:** High-value API routes responsible for payout allocations and game settlement must strictly enforce cryptographic token verification (e.g. Bearer JWT) to ensure requests originate exclusively from authorized internal services or verified match runners.
**Prevention:** Always mandate JWT bearer token header validation on sensitive endpoints that record match results or perform financial payouts.
