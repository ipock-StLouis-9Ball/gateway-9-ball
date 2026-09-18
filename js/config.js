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

  // Deposits via PayPal Checkout
  depositOptions: [2.5, 5.0, 10.0, 20.0],
  depositFee: (_amount) => 0.0,

  // Withdrawals: $10.00 minimum.
  // Standard ACH (2-3 days): $0 fee.
  // Instant Payout (push-to-card): 1.5% fee.
  withdrawMin: 10.0,
  withdrawFeeStandard: (_amount) => 0.0,
  withdrawFeeInstant: (amount) => round2(amount * 0.015),

  bestOf: 3, // first to 2 racks wins the match
};

// --- Regulation-style table & ball geometry (table-space units) -------------
// A regulation 9-foot table: playing surface ~50" x 100" (2:1 ratio).
// We work in arbitrary "inches" and scale to pixels at render time.
export const TABLE = {
  name: "WPA Regulation 9-Foot Tournament Table",
  units: "inches",
  width: 100.0, // playfield length (x-axis), inches
  height: 50.0, // playfield width (y-axis), inches
  overallWidth: 112.0,
  overallHeight: 62.0,
  railWidth: 6.0,
  ballRadius: 1.125, // 2.25" diameter
  cushionRestitution: 0.85, // K-66 rubber profile
  ballRestitution: 0.96, // ball-ball restitution
  friction: 12.5, // rolling friction
  spinDamping: 2.5, // spin damping
  stopThreshold: 0.8, // velocity threshold to stop ball
  playingSurface: {
    width: 50.0,
    length: 100.0
  },
  ball: {
    radius: 1.125,
    diameter: 2.25,
    mass: 0.17
  },
  physics: {
    rollingFriction: 0.015,
    cushionRestitution: 0.85,
    jawRestitution: 0.12, // Absorbs bounce in pocket jaws
    ballRestitution: 0.96
  },
  // WPA Exact Pocket Center Points (Corner: 0,0 / 100,0 / 0,50 / 100,50; Side: 50,0 / 50,50)
  pockets: [
    { id: "bottom_left",   center: { x: 0.0, y: 0.0 },   triggerRadius: 2.8 },
    { id: "bottom_right",  center: { x: 100.0, y: 0.0 },  triggerRadius: 2.8 },
    { id: "top_left",      center: { x: 0.0, y: 50.0 },  triggerRadius: 2.8 },
    { id: "top_right",     center: { x: 100.0, y: 50.0 }, triggerRadius: 2.8 },
    { id: "bottom_side",   center: { x: 50.0, y: 0.0 },   triggerRadius: 2.5 },
    { id: "top_side",      center: { x: 50.0, y: 50.0 },  triggerRadius: 2.5 }
  ],
  // WPA Exact Cushion Nose Segments & Pocket Jaw Facings
  // Corner mouth: 4 7/8" (± 2.4375"), Facing cut angle 142°
  // Side mouth: 5 3/8" (± 2.6875"), Facing cut angle 103°
  cushions: [
    // Bottom Long Rail (Y = 0)
    { id: "bottom_left_rail",  p1: { x: 2.4375, y: 0.0 }, p2: { x: 47.3125, y: 0.0 }, normal: { x: 0, y: 1 } },
    { id: "bottom_right_rail", p1: { x: 52.6875, y: 0.0 }, p2: { x: 97.5625, y: 0.0 }, normal: { x: 0, y: 1 } },
    // Top Long Rail (Y = 50)
    { id: "top_left_rail",     p1: { x: 2.4375, y: 50.0 }, p2: { x: 47.3125, y: 50.0 }, normal: { x: 0, y: -1 } },
    { id: "top_right_rail",    p1: { x: 52.6875, y: 50.0 }, p2: { x: 97.5625, y: 50.0 }, normal: { x: 0, y: -1 } },
    // Left Short Rail (X = 0)
    { id: "left_short_rail",   p1: { x: 0.0, y: 2.4375 }, p2: { x: 0.0, y: 47.5625 }, normal: { x: 1, y: 0 } },
    // Right Short Rail (X = 100)
    { id: "right_short_rail",  p1: { x: 100.0, y: 2.4375 }, p2: { x: 100.0, y: 47.5625 }, normal: { x: -1, y: 0 } },

    // Pocket Jaw Facing Colliders (recessing outward into pocket throats)
    // Side pocket bottom facings (X = 47.3125 and 52.6875, angled back at 103° total / 51.5° each side)
    { id: "bottom_side_facing_left",  p1: { x: 47.3125, y: 0.0 }, p2: { x: 47.3125 - 1.25 * Math.cos(51.5 * Math.PI / 180), y: -1.25 * Math.sin(51.5 * Math.PI / 180) } },
    { id: "bottom_side_facing_right", p1: { x: 52.6875, y: 0.0 }, p2: { x: 52.6875 + 1.25 * Math.cos(51.5 * Math.PI / 180), y: -1.25 * Math.sin(51.5 * Math.PI / 180) } },
    // Side pocket top facings
    { id: "top_side_facing_left",  p1: { x: 47.3125, y: 50.0 }, p2: { x: 47.3125 - 1.25 * Math.cos(51.5 * Math.PI / 180), y: 50.0 + 1.25 * Math.sin(51.5 * Math.PI / 180) } },
    { id: "top_side_facing_right", p1: { x: 52.6875, y: 50.0 }, p2: { x: 52.6875 + 1.25 * Math.cos(51.5 * Math.PI / 180), y: 50.0 + 1.25 * Math.sin(51.5 * Math.PI / 180) } },

    // Corner facings (142° facing cut angle -> 71° from rail wall)
    // Bottom-Left
    { id: "bl_facing_long",  p1: { x: 2.4375, y: 0.0 }, p2: { x: 2.4375 - 1.5 * Math.cos(71 * Math.PI / 180), y: -1.5 * Math.sin(71 * Math.PI / 180) } },
    { id: "bl_facing_short", p1: { x: 0.0, y: 2.4375 }, p2: { x: -1.5 * Math.sin(71 * Math.PI / 180), y: 2.4375 - 1.5 * Math.cos(71 * Math.PI / 180) } },
    // Bottom-Right
    { id: "br_facing_long",  p1: { x: 97.5625, y: 0.0 }, p2: { x: 97.5625 + 1.5 * Math.cos(71 * Math.PI / 180), y: -1.5 * Math.sin(71 * Math.PI / 180) } },
    { id: "br_facing_short", p1: { x: 100.0, y: 2.4375 }, p2: { x: 100.0 + 1.5 * Math.sin(71 * Math.PI / 180), y: 2.4375 - 1.5 * Math.cos(71 * Math.PI / 180) } },
    // Top-Left
    { id: "tl_facing_long",  p1: { x: 2.4375, y: 50.0 }, p2: { x: 2.4375 - 1.5 * Math.cos(71 * Math.PI / 180), y: 50.0 + 1.5 * Math.sin(71 * Math.PI / 180) } },
    { id: "tl_facing_short", p1: { x: 0.0, y: 47.5625 }, p2: { x: -1.5 * Math.sin(71 * Math.PI / 180), y: 47.5625 + 1.5 * Math.cos(71 * Math.PI / 180) } },
    // Top-Right
    { id: "tr_facing_long",  p1: { x: 97.5625, y: 50.0 }, p2: { x: 97.5625 + 1.5 * Math.cos(71 * Math.PI / 180), y: 50.0 + 1.5 * Math.sin(71 * Math.PI / 180) } },
    { id: "tr_facing_short", p1: { x: 100.0, y: 47.5625 }, p2: { x: 100.0 + 1.5 * Math.sin(71 * Math.PI / 180), y: 47.5625 + 1.5 * Math.cos(71 * Math.PI / 180) } }
  ]
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
  futuristic: { felt: '#E8D5B5', rail: '#2a2d32', railEdge: '#00E5FF', diamond: '#E0115F', cushion: '#d2c2a5', plate: 'rgba(0, 229, 255, 0.4)' },
  classic: { felt: '#1a6b3a', rail: '#3a2418', railEdge: '#5a3624', diamond: '#ffffff' },
  tournament: { felt: '#16557f', rail: '#2a1d12', railEdge: '#4a2e1c', diamond: '#ffffff' },
  maroon: { felt: '#800d0d', rail: '#3d1c06', railEdge: '#5a2a18', cushion: '#5c1616', plate: '#c9b074', diamond: '#ffffff' },
  crimson: { felt: '#7a1f2e', rail: '#1d1410', railEdge: '#3a2620', diamond: '#ffffff' },
  midnight: { felt: '#1d2a4a', rail: '#0d0f1a', railEdge: '#222638', diamond: '#ffffff' },
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
