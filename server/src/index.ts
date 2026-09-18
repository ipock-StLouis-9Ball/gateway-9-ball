// ============================================================================
// index.ts — Gateway 9-Ball authoritative shot resolver & Profile/Wallet server.
// ============================================================================

import express from 'express';
import compression from 'compression';
import { resolveShot } from '../../js/rules.js';
import { Database } from './db.js';

const app = express();
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Enable CORS for frontend client interaction
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

const PORT = Number(process.env.PORT || 8787);

// Helper token extractor from Authorization header: "Bearer <token>"
function extractToken(req: express.Request): string {
  const authHeader = req.headers.authorization;
  if (!authHeader) return '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return authHeader.trim();
}

// --- Health / readiness ---
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'gateway-9-ball-resolver', ts: Date.now() });
});

// --- Profile Endpoints ---

// POST /api/profile/register { username, avatar }
app.post('/api/profile/register', (req, res) => {
  const { username, avatar } = req.body || {};
  if (!username || typeof username !== 'string' || !username.trim()) {
    res.status(400).json({ ok: false, error: 'Username is required' });
    return;
  }

  const user = Database.createUser(username.trim(), avatar || 'JP');
  res.json({
    ok: true,
    token: user.token,
    profile: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      balance: user.balance,
      history: user.history,
    },
  });
});

// GET /api/profile/me (Header: Authorization: Bearer <token>)
app.get('/api/profile/me', (req, res) => {
  const token = extractToken(req);
  const user = Database.getUserByToken(token);
  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid or missing session token' });
    return;
  }
  res.json({
    ok: true,
    profile: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      balance: user.balance,
      history: user.history,
    },
  });
});

// POST /api/profile/update { username, avatar }
app.post('/api/profile/update', (req, res) => {
  const token = extractToken(req);
  const { username, avatar } = req.body || {};
  const user = Database.updateUserProfile(token, { username, avatar });
  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid or missing session token' });
    return;
  }
  res.json({
    ok: true,
    profile: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      balance: user.balance,
      history: user.history,
    },
  });
});

// --- Wallet & Financial Ledger Endpoints ---

// POST /api/wallet/deposit { amount }
app.post('/api/wallet/deposit', (req, res) => {
  const token = extractToken(req);
  const amount = Number(req.body?.amount);
  if (isNaN(amount) || amount <= 0) {
    res.status(400).json({ ok: false, error: 'Invalid deposit amount' });
    return;
  }
  // Gateway fee formula: (2.9% + $0.30)
  const fee = Math.round((amount * 0.029 + 0.30) * 100) / 100;
  const result = Database.deposit(token, amount, fee);
  if (!result) {
    res.status(401).json({ ok: false, error: 'Invalid or missing session token' });
    return;
  }
  res.json({
    ok: true,
    balance: result.user.balance,
    history: result.user.history,
    tx: result.tx,
  });
});

// POST /api/wallet/withdraw { amount }
app.post('/api/wallet/withdraw', (req, res) => {
  const token = extractToken(req);
  const amount = Number(req.body?.amount);
  if (isNaN(amount) || amount < 10.0) {
    res.status(400).json({ ok: false, error: 'Minimum withdrawal amount is DB$10.00' });
    return;
  }
  // Fee formula: $0.30 + 10% (min $1.50)
  const fee = Math.max(1.50, Math.round((0.30 + amount * 0.10) * 100) / 100);
  const result = Database.withdraw(token, amount, fee);
  if (!result) {
    const user = Database.getUserByToken(token);
    if (!user) {
      res.status(401).json({ ok: false, error: 'Invalid or missing session token' });
      return;
    }
    res.status(400).json({ ok: false, error: 'Insufficient wallet balance' });
    return;
  }
  res.json({
    ok: true,
    balance: result.user.balance,
    history: result.user.history,
    payout: result.payout,
    tx: result.tx,
  });
});

// POST /api/wallet/charge { amount, label }
app.post('/api/wallet/charge', (req, res) => {
  const token = extractToken(req);
  const amount = Number(req.body?.amount);
  const label = req.body?.label || 'Buy-in';
  if (isNaN(amount) || amount <= 0) {
    res.status(400).json({ ok: false, error: 'Invalid charge amount' });
    return;
  }
  const result = Database.charge(token, amount, label);
  if (!result) {
    const user = Database.getUserByToken(token);
    if (!user) {
      res.status(401).json({ ok: false, error: 'Invalid or missing session token' });
      return;
    }
    res.status(400).json({ ok: false, error: 'Insufficient wallet balance' });
    return;
  }
  res.json({
    ok: true,
    balance: result.user.balance,
    history: result.user.history,
    tx: result.tx,
  });
});

// POST /api/wallet/credit { amount, label }
app.post('/api/wallet/credit', (req, res) => {
  const token = extractToken(req);
  const amount = Number(req.body?.amount);
  const label = req.body?.label || 'Winnings';
  if (isNaN(amount) || amount <= 0) {
    res.status(400).json({ ok: false, error: 'Invalid credit amount' });
    return;
  }
  const result = Database.credit(token, amount, label);
  if (!result) {
    res.status(401).json({ ok: false, error: 'Invalid or missing session token' });
    return;
  }
  res.json({
    ok: true,
    balance: result.user.balance,
    history: result.user.history,
    tx: result.tx,
  });
});

// --- Authoritative shot resolution ---
app.post('/resolve-shot', async (req, res) => {
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

  if (input.cueBallId !== undefined && typeof input.cueBallId !== 'number') {
    res.status(400).json({ ok: false, error: 'Invalid cueBallId parameter' });
    return;
  }

  try {
    const result = await resolveShot({
      balls: input.balls,
      angle: input.angle,
      power: input.power,
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
  console.log(`Gateway 9-Ball server listening on :${PORT}`);
});
