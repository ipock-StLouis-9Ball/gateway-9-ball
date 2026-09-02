# Gateway 9-Ball — Authoritative Resolver (Cloud Run)

This is the server-authoritative `/resolve-shot` endpoint for Gateway 9-Ball.
It runs the **same deterministic physics + 9-ball rules** as the browser
(`js/physics.js`, `js/rules.js`), so the server and client agree exactly on
every shot. The server decides ball positions, pockets, fouls, and the winner —
the client only sends shot intent.

> MVP scope: the client currently sends the pre-shot state + shot intent, and
> trusts the returned outcome. True anti-cheat (server holds the canonical
> match state; client sends only shot intent; signed state, anti-replay,
> idempotency, matchmaking, payments, KYC) is a production phase — not included
> here.

## Run locally (the "local mock")

```bash
cd server
npm install
npm start          # npx tsx src/index.ts  ->  http://localhost:8787
```

Health check:

```bash
curl http://localhost:8787/health
```

Resolve a shot:

```bash
curl -X POST http://localhost:8787/resolve-shot \
  -H 'content-type: application/json' \
  -d '{"balls":[{"id":0,"x":25,"y":25,"vx":0,"vy":0,"pocketed":false,"englishX":0,"englishY":0}],"angle":0,"power":0.6,"cueBallId":0,"shotMode":"NORMAL"}'
```

## Deploy to Google Cloud Run

Prerequisites: the `gcloud` CLI, a GCP project with billing, and the Cloud Run
API enabled.

```bash
# From the nine-ball-mvp project root (parent of server/):
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# Build + deploy in one step (Cloud Build + Cloud Run):
gcloud run deploy gateway-9-ball-resolver \
  --source . \
  --dockerfile server/Dockerfile \
  --port 8787 \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi --cpu 1 --concurrency 20 \
  --max-instances 3

# The deployed URL is printed as the service URL, e.g.
# https://gateway-9-ball-resolver-XXXX-uc.a.run.app
```

Notes:
- `--allow-unauthenticated` lets the game client call it without login. For a
  real-money build, switch to authenticated/authorized invocations.
- Scale: `--max-instances 3` is plenty for a mock. Match-making traffic would
  raise this.
- The resolver is stateless, so Cloud Run autoscales and scales to zero safely.

## Point the client at the deployed resolver

After deploying, set the resolver URL in the client. In `js/resolverClient.js`
the preview uses a `__PORT_8787__` placeholder (rewritten to a sandbox proxy).
For a production deploy, replace it with your Cloud Run URL:

```js
const RESOLVER_URL = 'https://gateway-9-ball-resolver-XXXX-uc.a.run.app';
```

## Response shape

```ts
{
  balls:       Ball[];            // final positions (authoritative)
  frames:      { t, balls }[];    // ~60fps trajectory for client replay
  events:      ShotEvent[];       // hits, pockets, rails
  firstContact, pocketed, cueScratched, lowestAtStart,
  foul, foulReason, continueShooting, rackWinner, pushOut,
  hash:         string;            // anti-cheat seed of the final state
}
```
