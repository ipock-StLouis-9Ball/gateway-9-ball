# Project Checkpoint: Nine-Ball Tournament Engine
## Date: 2026-06-11
## Status: Authoritative PvP Core Complete


### 1. Backend Architecture (Node.js)
- **File:** `server.js`
- **Logic:** Authoritative state machine for 9-ball.
- **Rules:** APA Tournament Standards (Lowest ball first, Ball-in-hand, 9-ball respot on foul).
- **Matchmaking:** Skill-based queue (200 Elo threshold).
- **Financial Trigger:** Winner-Takes-All (90% payout) strictly after **one specific player** reaches 2 set wins.
    *   **Tie-Breaker:** If the score is 1-1, the funds remain in Escrow and a 3rd "Decisive" set is triggered.
    *   **Payout Logic:** Distribution only executes when the final match score becomes 2-0, 2-1, 0-2, or 1-2.
    *   **90s Forfeit Window:** If a player disconnects, they have 90 seconds to rejoin. Failure results in an authoritative forfeit; the remaining player wins the match and the funds.
- **AI Security Sentinel:** 24/7/365 background service monitoring network signals for "forced disconnection" tactics (lag-switching/DDoS) to ensure integrity.


### 2. Financial & Compliance Systems
- **Revenue Logic:** 10% Platform fee + tiered withdrawal fees ($0.25 min).
- **Withdrawal System:** `withdrawalService.js` handles tiered fees (4-10%) and three payout options:
    1. **Instant Debit Card:** (Base Fee + 1.5% convenience fee).
    2. **ACH Payment:** (Base Fee only, 1-3 day wait time).
- **Escrow:** Funds locked in virtual match vault during gameplay.
- **Audit Trail:** `matchLogger.js` records every shot, physics vector, foul, and disbursement for legal compliance.
- **Analytics:** `revenueService.js` provides real-time volume and profit tracking.
- **AML Program:** `amlService.js` enforces CIP/KYC, OFAC screening, and utilizes Vertex AI (Agent Delta) for Transaction Monitoring and automated SAR (Suspicious Activity Report) escalation.
- **Geo-Compliance:** Blocks real-money play in restricted states (AR, CT, DE, LA, SD).


### 3. 3D & Mobile Immersion (C++ / React Native)
- **Camera:** Over-the-shoulder "Cue View" with procedural breathing sway (`PoolCuePlayer.cpp`).
- **Visuals:** SVG/PBR procedural ball materials with specular highlights.
- **Sensory:** Authoritative haptic and sound triggers synced via server broadcasts.


### 4. Premium Game Store (Monetization)
- **Catalog:** `store_items.json` defines all purchasable assets.
- **Pool Cues:** 6 Premium designs (Newtonian, Kinetic, Void, etc.).
- **Ball Schemes:** 5 Thematic designs (Celestial, Atomic, Synthwave, etc.).
- **Integration:** All items include ID, description, and pricing for automated processing.


### 5. GCP Infrastructure
- **Project:** `St. Louis 9 Ball hustle`
- **Permissions:** Project Editor active.
- **Storage:** `St. Louis 9 Ball hustle` bucket for redundancy.


### 6. The AI Agent Ecosystem (Vertex AI)


- **The Sentinel:** 24/7 background network monitor for forced disconnections. Read only permission network logs, monitoring mertrics, rw cloud loggingNetwork & Log Inspection
​roles/logging.viewer: Grants read access to VPC Flow Logs, load balancer logs, and packet/socket disconnection events.
​roles/monitoring.viewer: Reads Google Cloud Monitoring metrics (e.g., active TCP socket drops, packet latency spikes, dropped egress packets).
​roles/compute.networkViewer: Allows read-only inspection of firewall rules, routes, and VPC interconnects to contextualize network anomalies.
​Audit & Alert Emission
​roles/logging.logWriter: Grants write access to Cloud Logging so Sentinel can push structured disconnection telemetry, lag-switch detection tags, and anomaly summaries.
​roles/monitoring.metricWriter: Allows emitting custom metrics (such as [custom.googleapis.com/network/forced_disconnect_count](https://custom.googleapis.com/network/forced_disconnect_count) or jitter tracking) to trigger alerts or dashboards.
​Escalation & Signaling
​roles/pubsub.publisher: Emits real-time disconnection and lag-switch signals directly to the matchmaking service or the dispute pipeline (Zeta & Eta) so a disconnecting player doesn't trigger an unfair forfeit or timeout exploit.
​Explicit Restrictions (Do NOT Grant)
​No roles/compute.networkAdmin or roles/compute.securityAdmin: Sentinel only observes; it should not modify firewall rules or route tables directly.
​No game database access: Player session and state correlations should be passed strictly via telemetry events.


- **The Security Council (Alpha, Beta, Gamma):** Investigates breaches and applies generative patches autonomously. integrating the AI agent with a CI/CD pipeline, it can safely and automatically deploy targeted fixes or updates to the code without needing full project editor access or causing any match disruption. ​CI/CD Pipeline Triggering & Builds
​roles/cloudbuild.builds.editor: Triggers targeted build runs and runs automated integration test suites for the patch.
​roles/artifactregistry.writer: Pushes new, patched container images directly to Artifact Registry.
​Zero-Downtime Deployment (Match Continuity)
​roles/run.developer (Cloud Run) or roles/container.developer (GKE): Deploys the patched revision using blue/green or canary routing. Old pods/instances stay alive so existing games finish cleanly, while new connections route to the patched build.
​roles/iam.serviceAccountUser: Allows the agent to attach the runtime service identity to the newly created deployment revision.
​Source Inspection & Diagnostics
​roles/source.reader (or GitHub App token with contents:read, pull_requests:write): Fetches the codebase to generate the context-aware diff and submit the patch branch.
​roles/logging.viewer & roles/errorreporting.viewer: Reads runtime stack traces and breach telemetry to analyze what broke.
​Patch Generation (Vertex AI)
​roles/aiplatform.user: Calls model endpoints to analyze logs, locate vulnerabilities, and generate the targeted code patch.
​Audit & Rollback Guardrails
​roles/logging.logWriter: Logs patch manifests, commit SHAs, and test validation proofs.
​Explicit Restriction: Deny roles/resourcemanager.organizationAdmin, roles/owner, and direct write access to your production database.


- **Agent Delta (AML Officer):** Conducts transaction monitoring and escalates SARs to FinCEN standards. Agent Delta (AML Officer) monitors high-velocity wagering, detects structuring/smurfing patterns, and packages Suspicious Activity Reports (SARs). Its permissions require broad read access to financial and telemetry streams, access to AI anomaly detection, and write access restricted strictly to secure, immutable compliance storage.
​Data & Analytics Ingestion (Read-Only)
​roles/bigquery.dataViewer: Reads historical match wagers, deposit/withdrawal velocity, and player transaction histories to detect anomalies.
​roles/bigquery.jobUser: Runs analytical SQL queries, pattern-matching jobs, and aggregations across the ledger dataset.
​roles/pubsub.subscriber: Consumes real-time payment events, wager notifications, and KYC updates from ingestion streams.
​AI & Anomaly Detection
​roles/aiplatform.user: Invokes Vertex AI models or pipelines trained to identify fraud topologies, automated play/collusion, and velocity threshold breaches.
​SAR Filings & Evidence Storage
​roles/storage.objectCreator (Scoped strictly to the compliance-sar-vault bucket): Allows Delta to upload encrypted SAR packets, audit snapshots, and FinCEN XML/JSON exports.
​Security Note: Use Object Retention / Bucket Lock (WORM—Write Once, Read Many) on this bucket so files cannot be overwritten or deleted once created.
​Alerting & Escalation
​roles/pubsub.publisher: Emits high-priority alerts to the human compliance desk when an account is frozen or flagged for mandatory review.
​roles/logging.logWriter: Streams structured audit events detailing detection rationale, threshold triggers, and automated case filings.
​Explicit Restrictions (Do NOT Grant)
​No roles/storage.objectAdmin or delete permissions (ensures compliance records cannot be purged).
​No Ledger/Vault write access (Delta cannot move money, release escrow, or adjust balances—it can only flag or signal holds).
​No Secret Manager access to payout processor gateway credentials.


- **Agent Epsilon (The Banker):** Reconciles the double-entry ledger before authorizing any physical withdrawal.Agent Epsilon (The Banker) handles critical financial state transitions: balancing debits and credits across the ledger, verifying escrow states, and signing off on outbound payment dispatches.
​Because Epsilon handles money movement, its IAM profile on Google Cloud Platform should be strictly ring-fenced to prevent unauthorized schema updates, infrastructure tampering, or manual balance injections.
​Database & Ledger Transactions
​Cloud SQL (PostgreSQL/MySQL):
​roles/cloudsql.client: Grants the ability to connect to the transactional database instance via Cloud SQL Auth Proxy or internal IP.
​Database Level (SQL Grants): Grant SELECT, INSERT, and UPDATE exclusively on the ledger_entries, user_accounts, and escrow_vault tables. Do not grant DROP, TRUNCATE, or ALTER TABLE.
​Cloud Spanner (if used for distributed ACID consistency):
​roles/spanner.databaseUser: Allows executing read/write transactions, verifying that debits equal credits before committing.
​Fine-Grained Access: Better yet, assign roles/spanner.fineGrainedAccessUser bound to a specific SQL database role (e.g., banker_service) scoped only to ledger tables.
​Payment Gateway / Banking Secrets
​roles/secretmanager.secretAccessor: Scoped strictly to the payment processor credentials (e.g., Plaid, Stripe Treasury, or ACH gateway API keys).
​IAM Condition: Apply a resource condition so Epsilon can only read secrets ending in /secrets/ach-gateway-key or /secrets/bank-api-token, blocking access to database root passwords or server encryption keys.
​Withdrawal Dispatch & Queueing
​roles/cloudtasks.enqueuer: Allows Epsilon to push approved withdrawal tasks onto an asynchronous queue (e.g., ach-payout-queue) with strict rate limiting.
​roles/pubsub.publisher: Emits state events (e.g., WITHDRAWAL_AUTHORIZED, LEDGER_IMBALANCE_ALERT) to trigger audit notifications or compliance checks.
​Audit & Forensic Integrity
​roles/logging.logWriter: Emits immutable double-entry verification logs, including batch IDs, pre-authorization balance checks, and reconciliation hashes.
​Explicit Restrictions (Do NOT Grant)
​No roles/cloudsql.admin or roles/spanner.admin (prevents altering database topology or schema).
​No roles/secretmanager.admin (prevents editing, deleting, or rotating secrets).
​No Game State Access: Epsilon does not need read or write access to player match physics, active ball positions, or lobby matchmaking logic.


- **Support Hub (Zeta & Eta):** Provides 24/7 in-game chat for players. Zeta acts as a friendly concierge, while Eta resolves escalated disputes.Vertex AI / LLM Engine
​roles/aiplatform.user: Allows Zeta and Eta to call model endpoints (Gemini / PaLM) to generate chat responses and parse dispute context.
​Key Permission included: aiplatform.endpoints.predict.
​Database & Match Data (Dispute Review)
​roles/datastore.viewer (or roles/firestore.viewer): Provides read-only access to user profiles, matchmaking records, and shot/foul history.
​roles/datastore.user (Scoped only to Support Collections): If Eta needs to write, escalate, or update the status of dispute tickets in Firestore/Datastore, grant this role restricted to the support_tickets or chat_logs collection.
​Audit & Observability
​roles/logging.logWriter: Allows Zeta and Eta to stream dispute transcripts and moderation audit events into Cloud Logging.
​roles/pubsub.publisher: If Eta escalates an unresolved dispute to a human admin or the Compliance Officer, this allows it to publish events to an escalation topic.
​Explicit Restrictions (Do NOT Grant)
​No Cloud Spanner/SQL Admin roles.
​No Cloud Storage Admin roles.
​No Ledger, Escrow, or Payment Service write permissions.
