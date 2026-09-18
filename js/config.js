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
// Official WPA / BCA Tournament 9-Foot Pool Table Specification:
// Playing bed surface: exactly 100" x 50" (2:1 ratio).
// Rail Assembly: Total Rail Width = 5.0" (Wood Cap: 3 13/16" [3.8125"], Inner Cushion: 1 3/16" [1.1875"]).
// Overall Table Outer Footprint: 110" x 60".
export const TABLE = {
  name: "WPA Regulation 9-Foot Tournament Table",
  units: "inches",
  width: 100.0, // playfield length (x-axis), inches
  height: 50.0, // playfield width (y-axis), inches
  overallWidth: 110.0,
  overallHeight: 60.0,
  totalRailWidth: 5.0,
  woodRailWidth: 3.8125, // 3 13/16 inches
  cushionWidth: 1.1875,  // 1 3/16 inches
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
    // Side pocket bottom facings (X = 47.3125 and 52.6875, facing cut angle 103°, 38.5° from rail line)
    { id: "bottom_side_facing_left",  p1: { x: 47.3125, y: 0.0 }, p2: { x: 47.3125 - 1.25 * Math.cos(38.5 * Math.PI / 180), y: -1.25 * Math.sin(38.5 * Math.PI / 180) } },
    { id: "bottom_side_facing_right", p1: { x: 52.6875, y: 0.0 }, p2: { x: 52.6875 + 1.25 * Math.cos(38.5 * Math.PI / 180), y: -1.25 * Math.sin(38.5 * Math.PI / 180) } },
    // Side pocket top facings
    { id: "top_side_facing_left",  p1: { x: 47.3125, y: 50.0 }, p2: { x: 47.3125 - 1.25 * Math.cos(38.5 * Math.PI / 180), y: 50.0 + 1.25 * Math.sin(38.5 * Math.PI / 180) } },
    { id: "top_side_facing_right", p1: { x: 52.6875, y: 50.0 }, p2: { x: 52.6875 + 1.25 * Math.cos(38.5 * Math.PI / 180), y: 50.0 + 1.25 * Math.sin(38.5 * Math.PI / 180) } },

    // Corner facings (142° facing cut angle -> 19° from rail line, recessing back into throat)
    // Bottom-Left
    { id: "bl_facing_long",  p1: { x: 2.4375, y: 0.0 }, p2: { x: 2.4375 - 1.5 * Math.cos(19 * Math.PI / 180), y: -1.5 * Math.sin(19 * Math.PI / 180) } },
    { id: "bl_facing_short", p1: { x: 0.0, y: 2.4375 }, p2: { x: -1.5 * Math.sin(19 * Math.PI / 180), y: 2.4375 - 1.5 * Math.cos(19 * Math.PI / 180) } },
    // Bottom-Right
    { id: "br_facing_long",  p1: { x: 97.5625, y: 0.0 }, p2: { x: 97.5625 + 1.5 * Math.cos(19 * Math.PI / 180), y: -1.5 * Math.sin(19 * Math.PI / 180) } },
    { id: "br_facing_short", p1: { x: 100.0, y: 2.4375 }, p2: { x: 100.0 + 1.5 * Math.sin(19 * Math.PI / 180), y: 2.4375 - 1.5 * Math.cos(19 * Math.PI / 180) } },
    // Top-Left
    { id: "tl_facing_long",  p1: { x: 2.4375, y: 50.0 }, p2: { x: 2.4375 - 1.5 * Math.cos(19 * Math.PI / 180), y: 50.0 + 1.5 * Math.sin(19 * Math.PI / 180) } },
    { id: "tl_facing_short", p1: { x: 0.0, y: 47.5625 }, p2: { x: -1.5 * Math.sin(19 * Math.PI / 180), y: 47.5625 + 1.5 * Math.cos(19 * Math.PI / 180) } },
    // Top-Right
    { id: "tr_facing_long",  p1: { x: 97.5625, y: 50.0 }, p2: { x: 97.5625 + 1.5 * Math.cos(19 * Math.PI / 180), y: 50.0 + 1.5 * Math.sin(19 * Math.PI / 180) } },
    { id: "tr_facing_short", p1: { x: 100.0, y: 47.5625 }, p2: { x: 100.0 + 1.5 * Math.sin(19 * Math.PI / 180), y: 47.5625 + 1.5 * Math.cos(19 * Math.PI / 180) } }
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
  maple: { name: 'Hard Maple', tip: '#3a2a1a', shaft: '#d9b27a', asset: null },
  cue_newtonian: { name: 'The Newtonian', tip: '#4a2e1b', shaft: '#f2d199', asset: 'assets/cues/cue_newtonian.svg' },
  cue_hustler: { name: 'The Hustler', tip: '#3a2215', shaft: '#b08453', asset: 'assets/cues/cue_hustler.svg' },
  cue_sovereign: { name: 'The Sovereign', tip: '#1f1008', shaft: '#5a1224', asset: 'assets/cues/cue_sovereign.svg' },
  cue_void: { name: 'The Void', tip: '#0d0d0d', shaft: '#2a2d32', asset: 'assets/cues/cue_void.svg' },
  cue_industrialist: { name: 'The Industrialist', tip: '#202020', shaft: '#b0b8c0', asset: 'assets/cues/cue_industrialist.svg' },
};

export const BALL_SKINS = {
  classic: { name: 'Classic', schemeDir: null, colors: BALL_COLORS },
  balls_high_roller: { name: 'High Roller', schemeDir: 'assets/balls/high_roller', colors: BALL_COLORS },
  balls_metallic: { name: 'Polished Metallic', schemeDir: 'assets/balls/balls_metallic', colors: BALL_COLORS },
  balls_pearl: { name: 'Pearlescent Accent', schemeDir: 'assets/balls/balls_pearl', colors: BALL_COLORS },
};

export const STORE_ITEMS = {
  tables: Object.entries(TABLE_COLORS).map(([id, v]) => ({
    id, name: id.charAt(0).toUpperCase() + id.slice(1),
    price: (id === 'classic' || id === 'maroon') ? 0 : 8,
  })),
  cues: [
    { id: 'maple', name: 'Hard Maple', description: 'Standard hard maple cue stick.', price: 0 },
    { id: 'cue_newtonian', name: 'The Newtonian', description: 'Solid oak with inlaid brass physics equations.', price: 2.99 },
    { id: 'cue_hustler', name: 'The Hustler', description: 'Distressed wood with a duct-taped grip and misaligned ferrule.', price: 0.99 },
    { id: 'cue_sovereign', name: 'The Sovereign', description: 'Gold-plated filigree butt with a crushed velvet wrap.', price: 14.99 },
    { id: 'cue_void', name: 'The Void', description: 'Coated in light-absorbing black material, completely reflectionless.', price: 9.99 },
    { id: 'cue_industrialist', name: 'The Industrialist', description: 'Heavy steel shaft with exposed rivets and a raw leather grip.', price: 3.99 },
  ],
  balls: [
    { id: 'classic', name: 'Classic', description: 'Standard regulation tournament pool balls.', price: 0 },
    { id: 'balls_high_roller', name: 'High Roller', description: 'Styled like heavy clay poker chips with metallic inlaid numbers.', price: 5.99 },
    { id: 'balls_metallic', name: 'Polished Metallic', description: 'Anodized titanium and chrome finishes with deep-etched metallic numbers and sharp specular reflections.', price: 4.99 },
    { id: 'balls_pearl', name: 'Pearlescent Accent', description: 'Multi-stage custom automotive pearl coatings with subtle shifting highlights and clean contrast.', price: 5.99 },
  ],
};
