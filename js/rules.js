// ============================================================================
// rules.js — Regulation-style 9-ball rules + the authoritative shot resolver.
//
// resolveShot() is the server-authority contract: it takes the shot intent and
// the full ball state, runs the simulation to rest, and returns the final
// state + rule outcome. For the MVP this runs locally in the browser; in
// production the client sends only the intent to a Cloud Run endpoint that
// runs this exact function and returns the result. Either way, the BACKEND
// decides ball positions, pockets, fouls, and the winner — never the client.
// ============================================================================

import { Physics, setEnglish } from './physics.js';
import { TABLE } from './config.js';

const CUE_ID = 0;

// --- Rack layout (diamond: 1 apex, 9 center) ---------------------------------
export function createRack() {
  const W = TABLE.width;
  const H = TABLE.height;
  const r = TABLE.ballRadius;
  const footX = W * 0.70; // apex (1-ball) on the foot spot
  const cy = H / 2;
  const s = r * 2; // center-to-center spacing

  // Diamond rows extending +x from the apex.
  const layout = [
    [[0, 0]], // row0: apex = 1
    [[-1, -1], [1, 1]], // row1: 2 balls  (dx, dy) in units of s/2
    [[-2, -2], [0, 0], [2, 2]], // row2: 3 balls (center = 9)
    [[-1, -1], [1, 1]], // row3: 2 balls
    [[0, 0]], // row4: back
  ];
  // Ball assignment per row (9 in center).
  const assign = [
    [1],
    [6, 2],
    [3, 9, 8],
    [7, 4],
    [5],
  ];

  const balls = [];
  layout.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const id = assign[ri][ci];
      balls.push({
        id,
        x: footX + ri * s,
        y: cy + cell[1] * r, // dy = cell[1] * r
        vx: 0,
        vy: 0,
        pocketed: false,
        pocketIndex: -1,
        englishX: 0,
        englishY: 0,
      });
    });
  });

  // Cue ball behind the head string.
  balls.push({
    id: CUE_ID,
    x: W * 0.25,
    y: cy,
    vx: 0,
    vy: 0,
    pocketed: false,
    pocketIndex: -1,
    englishX: 0,
    englishY: 0,
  });

  return balls;
}

// Map power [0..1] to cue-ball launch speed (inches/sec).
const MAX_SPEED = 115;
export function speedForPower(power) {
  return Math.max(0, Math.min(1, power)) * MAX_SPEED;
}

// --- The authoritative shot resolver ----------------------------------------
// input: { balls, angle, power, english:{x,y}, cueBallId, shotMode }
//   shotMode: 'NORMAL' (default) | 'PUSH_OUT' (relaxes first-contact &
//   no-rail rules; spots the 9 if pocketed; ends the inning for take/pass).
// returns: { balls, events, frames, firstContact, pocketed, cueScratched,
//            lowestAtStart, foul, foulReason, continueShooting, rackWinner,
//            pushOut, hash }
export function resolveShot(input) {
  const shotMode = input.shotMode === 'PUSH_OUT' ? 'PUSH_OUT' : 'NORMAL';
  const phys = new Physics();
  const balls = input.balls.map((b) => ({ ...b }));
  const cue = balls.find((b) => b.id === input.cueBallId);
  if (!cue || cue.pocketed)
    return { balls, events: [], frames: [], firstContact: null, pocketed: [],
      cueScratched: false, lowestAtStart: null, foul: true, foulReason: 'No cue ball',
      continueShooting: false, rackWinner: null, pushOut: false, hash: '' };

  const lowestAtStart = lowestBall(balls);

  // Apply english (spin) to cue ball.
  setEnglish(cue, input.english.x || 0, input.english.y || 0);

  // Launch cue ball.
  const speed = speedForPower(input.power);
  cue.vx = Math.cos(input.angle) * speed;
  cue.vy = Math.sin(input.angle) * speed;

  // Simulate to rest, collecting downsampled trajectory frames for replay.
  const events = [];
  const frames = [];
  const MAX_STEPS = 4000;
  const dt = 1 / 120;
  const deadline = Date.now() + 5000; // 5-second CPU limit safeguard
  frames.push(snapshotFrame(balls, 0));
  for (let i = 1; i <= MAX_STEPS; i++) {
    const ev = phys.step(balls, dt);
    events.push(...ev);
    if (i % 4 === 0) frames.push(snapshotFrame(balls, i * dt)); // ~30fps
    if (phys.atRest(balls)) break;
    if (i % 100 === 0 && Date.now() > deadline) {
      for (const b of balls) { b.vx = 0; b.vy = 0; }
      break;
    }
    if (i === MAX_STEPS) { for (const b of balls) { b.vx = 0; b.vy = 0; } }
  }
  // Clear english after the shot.
  cue.englishX = 0;
  cue.englishY = 0;

  // Push-out: spot the 9 if it was pocketed (never a win on a push-out).
  if (shotMode === 'PUSH_OUT') {
    const nine = balls.find((b) => b.id === 9);
    if (nine && nine.pocketed) {
      nine.pocketed = false;
      nine.x = TABLE.width * 0.7;
      nine.y = TABLE.height / 2;
      nine.vx = 0; nine.vy = 0;
    }
  }

  // Analyze.
  const firstContact = firstContactBall(events);
  const pocketed = events.filter((e) => e.type === 'pocket').map((e) => e.ball);
  const cueScratched = pocketed.includes(CUE_ID);
  const outcome = evaluateRules({ balls, events, firstContact, pocketed, cueScratched, lowestAtStart, shotMode });

  return {
    balls,
    events,
    frames,
    firstContact,
    pocketed,
    cueScratched,
    lowestAtStart,
    ...outcome,
    hash: stateHash(balls),
  };
}

function snapshotFrame(balls, t) {
  return { t, balls: balls.map((b) => ({ id: b.id, x: b.x, y: b.y, pocketed: b.pocketed })) };
}

// Pure rule evaluation shared by resolveShot (server contract) and the live
// game loop (animation). Same inputs => same verdict, no duplication.
export function evaluateRules({ balls, events, firstContact, pocketed, cueScratched, lowestAtStart, shotMode = 'NORMAL' }) {
  let foul = false;
  let foulReason = '';
  let rackWinner = null;
  let continueShooting = false;
  const isPushOut = shotMode === 'PUSH_OUT';

  if (!isPushOut) {
    if (firstContact === null) {
      foul = true;
      foulReason = 'No ball contacted';
    } else if (firstContact !== lowestAtStart) {
      foul = true;
      foulReason = `Must hit the ${lowestAtStart}-ball first`;
    }
  }

  // 9 pocketed legally (normal shot, legal contact, no scratch) wins the rack.
  if (pocketed.includes(9) && !foul && !isPushOut) {
    rackWinner = 'shooter';
  }

  // Scratching the cue ball is always a foul (even on a push-out).
  if (cueScratched) {
    foul = true;
    if (!foulReason) foulReason = 'Scratched the cue ball';
  }

  if (!isPushOut && !foul && !rackWinner) {
    const pocketedSomething = pocketed.length > 0;
    const railHit = events.some((e) => e.type === 'rail');
    if (!pocketedSomething && !railHit) {
      foul = true;
      foulReason = 'No ball reached a rail';
    }
  }

  // 9 pocketed via a foul is not a win (ball-in-hand instead).
  if (pocketed.includes(9) && foul) rackWinner = null;

  if (!foul && !rackWinner) {
    const legalPocket = pocketed.some((id) => id !== 9 && id !== CUE_ID);
    continueShooting = legalPocket && !isPushOut; // push-out always ends the inning
  }

  return { foul, foulReason, rackWinner, continueShooting, pushOut: isPushOut, lowestAtStart };
}

// Helpers --------------------------------------------------------------------
function lowestBall(balls) {
  const live = balls.filter((b) => !b.pocketed && b.id !== CUE_ID);
  if (!live.length) return null;
  return Math.min(...live.map((b) => b.id));
}

function firstContactBall(events) {
  // Cue ball may be either side of a collision pair, so check both.
  const hit = events.find((e) => e.type === 'hit' && (e.a === CUE_ID || e.b === CUE_ID));
  if (!hit) return null;
  return hit.a === CUE_ID ? hit.b : hit.a;
}

export function stateHash(balls) {
  // Simple deterministic hash of ball positions (authority/anti-cheat seed).
  const s = balls
    .map((b) => `${b.id}:${b.pocketed ? 'p' : `${b.x.toFixed(2)},${b.y.toFixed(2)}`}`)
    .join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
