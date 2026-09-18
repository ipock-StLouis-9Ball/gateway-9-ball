# Gateway 9-Ball architecture

## Active runtime

- **Frontend:** vanilla ES modules, HTML, CSS, and Canvas in `index.html`, `styles.css`, and `js/`.
- **Backend:** TypeScript/Express in `server/src/`, compiled to `server/dist/` and run with Node.js.
- **Persistence:** PostgreSQL via `DATABASE_URL`. User profiles, account ownership, and immutable double-entry ledger transactions are stored transactionally.
- **Game authority:** `js/rules.js` is shared by the resolver; production match orchestration should keep canonical match state server-side and publish authoritative state snapshots.

## Financial invariants

Every wallet movement is represented as a ledger transfer from one account to another. Balances are derived from ledger entries rather than stored mutable balance fields. Match escrow, payouts, platform fees, deposits, and withdrawals must be completed in ACID transactions.

## Deployment

The Cloud Run image builds TypeScript during Docker build and runs compiled JavaScript. Cloud Run may scale to zero and horizontally scale instances; PostgreSQL is the durable shared state boundary. Configure `DATABASE_URL`, PayPal credentials, and a production CORS allow-list through secrets/environment configuration.

## Roadmap

Multi-region read replicas, sharding, Cloud Spanner/BigQuery analytics, WebSocket matchmaking, Cloud Armor policies, and advanced KYC/AML integrations are future infrastructure modules. They are not active runtime dependencies of this lean HTTP resolver.
