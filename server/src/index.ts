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
import compression from 'compression';
import { resolveShot } from '../../js/rules.js';

const app = express();
app.use(compression());
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

  // Input Validation
  if (!Array.isArray(input.balls) || input.balls.length === 0 || input.balls.length > 16) {
    res.status(400).json({ ok: false, error: 'Invalid balls array (must contain 1-16 balls)' });
    return;
  }

  for (const b of input.balls) {
    if (!b || typeof b.id !== 'number' || typeof b.x !== 'number' || !Number.isFinite(b.x) || typeof b.y !== 'number' || !Number.isFinite(b.y)) {
      res.status(400).json({ ok: false, error: 'Invalid ball object properties in balls array' });
      return;
    }
  }

  if (typeof input.angle !== 'number' || !Number.isFinite(input.angle)) {
    res.status(400).json({ ok: false, error: 'Invalid angle parameter' });
    return;
  }

  if (typeof input.power !== 'number' || !Number.isFinite(input.power) || input.power < 0 || input.power > 1) {
    res.status(400).json({ ok: false, error: 'Invalid power parameter (must be a number in range [0, 1])' });
    return;
  }

  if (input.english !== undefined && input.english !== null) {
    if (typeof input.english !== 'object' || typeof input.english.x !== 'number' || !Number.isFinite(input.english.x) || typeof input.english.y !== 'number' || !Number.isFinite(input.english.y)) {
      res.status(400).json({ ok: false, error: 'Invalid english parameter' });
      return;
    }
  }

  if (input.cueBallId !== undefined && typeof input.cueBallId !== 'number') {
    res.status(400).json({ ok: false, error: 'Invalid cueBallId parameter' });
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: msg });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Gateway 9-Ball resolver listening on :${PORT}`);
});
