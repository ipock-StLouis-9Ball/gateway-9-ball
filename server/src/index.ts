// ============================================================================
// index.ts — Gateway 9-Ball authoritative shot resolver (Cloud Run / local mock).
//
// POST /resolve-shot  { balls, angle, power, english, cueBallId, shotMode }
//   -> { balls, frames, events, firstContact, pocketed, cueScratched,
//        lowestAtStart, foul, foulReason, continueShooting, rackWinner,
//        pushOut, hash }
//
// The deterministic physics + 9-ball rules live in ../../js (shared with the
// browser), so the server and client agree exactly on every outcome. In
// production this is the single source of truth for ball positions, pockets,
// fouls, and the winner — the client only sends shot intent.
// ============================================================================

import express from 'express';
import { resolveShot } from '../../js/rules.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT || 8787);

// --- Health / readiness ---
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'gateway-9-ball-resolver', ts: Date.now() });
});

// --- Authoritative shot resolution ---
app.post('/resolve-shot', (req, res) => {
  const input = req.body || {};
  const required = ['balls', 'angle', 'power'];
  const missing = required.filter((k) => input[k] === undefined);
  if (missing.length) {
    res.status(400).json({ ok: false, error: `Missing fields: ${missing.join(', ')}` });
    return;
  }
  try {
    const result = resolveShot({
      balls: input.balls,
      angle: input.angle,
      power: input.power,
      english: input.english || { x: 0, y: 0 },
      cueBallId: input.cueBallId ?? 0,
      shotMode: input.shotMode || 'NORMAL',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Gateway 9-Ball resolver listening on :${PORT}`);
});
