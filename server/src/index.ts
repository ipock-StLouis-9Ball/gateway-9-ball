// ============================================================================
// index.ts — Gateway 9-Ball authoritative shot resolver & Profile/Wallet server.
// ============================================================================

import express from 'express';
import compression from 'compression';
import { resolveShot } from '../../js/rules.js';
import { Database } from './db.js';
import { createPayPalOrder, capturePayPalOrder, createPayPalPayout, getPayPalCredentials } from './paypal.js';

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
      vaultedPaymentMethod: user.vaultedPaymentMethod,
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

// --- PayPal Deposit Endpoints ---

// POST /api/wallet/deposit/create-order { amount }
app.post('/api/wallet/deposit/create-order', async (req, res) => {
  const token = extractToken(req);
  const user = Database.getUserByToken(token);
  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid or missing session token' });
    return;
  }

  const amount = Number(req.body?.amount);
  if (isNaN(amount) || amount <= 0) {
    res.status(400).json({ ok: false, error: 'Invalid deposit amount' });
    return;
  }

  try {
    const order = await createPayPalOrder(amount);
    res.json({ ok: true, orderId: order.orderId, approvalUrl: order.approvalUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: msg });
  }
});

// POST /api/wallet/deposit/capture-order { orderId, amount }
app.post('/api/wallet/deposit/capture-order', async (req, res) => {
  const token = extractToken(req);
  const user = Database.getUserByToken(token);
  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid or missing session token' });
    return;
  }

  const { orderId, amount: reqAmount } = req.body || {};
  let depositAmount = Number(reqAmount) || 0;

  let vaultedPaymentMethod = {
    vaultId: `vault_card_${Date.now()}`,
    cardLast4: '4242',
    cardBrand: 'Visa (PayPal Vaulted)',
    payerEmail: user.username + '@paypal.com',
  };

  const { clientId, clientSecret } = getPayPalCredentials();

  if (clientId && clientSecret) {
    if (!orderId) {
      res.status(400).json({ ok: false, error: 'Order ID is required' });
      return;
    }
    try {
      const captured = await capturePayPalOrder(orderId);
      if (captured.amount > 0) depositAmount = captured.amount;
      if (captured.vaultedPaymentMethod) {
        vaultedPaymentMethod = {
          ...vaultedPaymentMethod,
          ...captured.vaultedPaymentMethod,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ ok: false, error: `PayPal capture failed: ${msg}` });
      return;
    }
  }

  if (depositAmount <= 0) {
    res.status(400).json({ ok: false, error: 'Invalid deposit amount' });
    return;
  }

  const fee = 0.0; // PayPal deposit fee waived / covered
  const result = Database.deposit(token, depositAmount, fee, vaultedPaymentMethod);
  if (!result) {
    res.status(401).json({ ok: false, error: 'Deposit failed' });
    return;
  }

  res.json({
    ok: true,
    balance: result.user.balance,
    history: result.user.history,
    vaultedPaymentMethod: result.user.vaultedPaymentMethod,
    tx: result.tx,
  });
});

// POST /api/wallet/withdraw { amount, speed: 'standard' | 'instant' }
app.post('/api/wallet/withdraw', async (req, res) => {
  const token = extractToken(req);
  const user = Database.getUserByToken(token);
  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid or missing session token' });
    return;
  }

  const amount = Number(req.body?.amount);
  const speed = req.body?.speed === 'instant' ? 'instant' : 'standard';

  if (isNaN(amount) || amount < 10.0) {
    res.status(400).json({ ok: false, error: 'Minimum withdrawal amount is DB$10.00' });
    return;
  }

  // Dual-speed withdrawal fees:
  // Standard ACH (2-3 days): $0.00 fee
  // Instant Payout (push-to-card): 1.5% processing fee
  const fee = speed === 'instant' ? Math.round(amount * 0.015 * 100) / 100 : 0.0;
  const payoutAmount = Math.round((amount - fee) * 100) / 100;

  const receiverEmail = user.vaultedPaymentMethod?.payerEmail || `${user.username.toLowerCase()}@paypal.com`;

  const { clientId, clientSecret } = getPayPalCredentials();
  if (clientId && clientSecret) {
    try {
      await createPayPalPayout(receiverEmail, payoutAmount, `St. Louis 9 Ball Hustle ${speed.toUpperCase()} Withdrawal`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ ok: false, error: `PayPal payout failed: ${msg}` });
      return;
    }
  }

  const result = Database.withdraw(token, amount, fee);
  if (!result) {
    res.status(400).json({ ok: false, error: 'Insufficient wallet balance' });
    return;
  }

  res.json({
    ok: true,
    balance: result.user.balance,
    history: result.user.history,
    payout: result.payout,
    speed,
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
