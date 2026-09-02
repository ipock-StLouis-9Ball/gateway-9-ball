// ============================================================================
// config.js — All game constants, economy, and regulation-style specs.
// All money values are SIMULATED (demo currency). One place to change them.
// ============================================================================

// --- Economy (simulated currency, "Demo Bucks" / DB$) -----------------------
// Money is rounded to the cent everywhere.
const round2 = (n) => Math.round(n * 100) / 100;

export const ECONOMY = {
  currencySymbol: 'DB$',
  startingBalance: 25.0,

  // Match pot tiers. Each player buys in for half the pot.
  // $5=$2.50x2, $7=$3.50x2, $10=$5x2, $15=$7.50x2, $20=$10x2
  potTiers: [5, 7, 10, 15, 20],
  buyInForPot: (pot) => pot / 2,

  // House rake: 11% flat across every pot tier (standard skill-gaming margin).
  // $5→$0.55, $7→$0.77, $10→$1.10, $15→$1.65, $20→$2.20.
  rakeForPot: (pot) => round2(pot * 0.11),

  // Deposits: lower tiers kept; the Square processor fee (2.9% + $0.30) is
  // passed to the user at checkout. The full deposit amount is credited.
  depositOptions: [2.5, 5.0, 10.0, 20.0],
  depositFee: (amount) => round2(amount * 0.029 + 0.30),

  // Withdrawals: $10.00 minimum. Fee = $0.30 + 10% of amount, floored at $1.50
  // (covers payment-gateway fixed cost on small payouts).
  withdrawFee: (amount) => Math.max(1.5, round2(0.30 + amount * 0.10)),
  withdrawMin: 10.0,

  bestOf: 3, // first to 2 racks wins the match
};

// --- Regulation-style table & ball geometry (table-space units) -------------
// A regulation 9-foot table: playing surface ~50" x 100" (2:1 ratio).
// We work in arbitrary "inches" and scale to pixels at render time.
export const TABLE = {
  width: 100, // playfield width (long axis), inches
  height: 50, // playfield height (short axis), inches
  railThickness: 7.5,
  ballRadius: 1.125, // 2.25" diameter regulation ball
  pocketRadius: 2.4, // pocket mouth capture radius
  cushionRestitution: 0.85, // K-66 rubber: ~85% energy retained off rail
  ballRestitution: 0.88, // ball-ball: ~88% energy retained
  friction: 2.3, // rolling deceleration (inches/sec^2) — felt cloth drag
  spinDamping: 1.6, // english/spin wears off exponentially over distance
  stopThreshold: 1.0, // below this speed, ball stops
};

// Standard 9-ball colors (1-9). Cue ball is white.
export const BALL_COLORS = {
  1: '#f5c518', // yellow
  2: '#1f4ed8', // blue
  3: '#d6271c', // red
  4: '#5b2a9e', // purple
  5: '#e8741a', // orange
  6: '#1f7a34', // green
  7: '#7a2e1a', // maroon
  8: '#1a1a1a', // black
  9: '#f5c518', // yellow stripe (rendered with stripe)
};

export const TABLE_COLORS = {
  classic: { felt: '#1a6b3a', rail: '#3a2418', railEdge: '#5a3624' },
  tournament: { felt: '#16557f', rail: '#2a1d12', railEdge: '#4a2e1c' },
  // Maroon cloth with medium cherry wood rails (the requested look).
  maroon: { felt: '#800d0d', rail: '#3d1c06', railEdge: '#5a2a18', cushion: '#5c1616', plate: '#c9b074' },
  crimson: { felt: '#7a1f2e', rail: '#1d1410', railEdge: '#3a2620' },
  midnight: { felt: '#1d2a4a', rail: '#0d0f1a', railEdge: '#222638' },
};

export const CUE_STICKS = {
  maple: { name: 'Hard Maple', tip: '#3a2a1a', shaft: '#d9b27a' },
  carbon: { name: 'Carbon Pro', tip: '#1a1a1a', shaft: '#2b2b2b' },
  mahogany: { name: 'Mahogany', tip: '#2a1410', shaft: '#7a4a2a' },
  electric: { name: 'Electric Blue', tip: '#0a1a3a', shaft: '#2f7fd6' },
};

export const BALL_SKINS = {
  classic: { name: 'Classic', colors: BALL_COLORS },
  neon: {
    name: 'Neon',
    colors: {
      1: '#fff200', 2: '#00d4ff', 3: '#ff2e4e', 4: '#c93eff', 5: '#ff8a00',
      6: '#19ff7a', 7: '#ff5a2a', 8: '#0a0a0a', 9: '#fff200',
    },
  },
  matte: {
    name: 'Matte',
    colors: {
      1: '#e8c34a', 2: '#3a64c8', 3: '#c83828', 4: '#6a3aa8', 5: '#d8661a',
      6: '#3a8a4a', 7: '#8a4a3a', 8: '#222222', 9: '#e8c34a',
    },
  },
};

export const STORE_ITEMS = {
  tables: Object.entries(TABLE_COLORS).map(([id, v]) => ({
    id, name: id.charAt(0).toUpperCase() + id.slice(1),
    price: id === 'classic' ? 0 : 8,
  })),
  cues: Object.entries(CUE_STICKS).map(([id, v]) => ({
    id, name: v.name, price: id === 'maple' ? 0 : 12,
  })),
  balls: Object.entries(BALL_SKINS).map(([id, v]) => ({
    id, name: v.name, price: id === 'classic' ? 0 : 10,
  })),
};
