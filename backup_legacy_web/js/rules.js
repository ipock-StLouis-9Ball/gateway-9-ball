// ============================================================================
// rules.js — Regulation 9-ball rules + Rapier2D authoritative shot resolver.
//
// resolveShot() is the server-authority contract: it takes shot intent and
// ball positions, runs the Rapier2D simulation at 120Hz to rest, and returns
// an immutable ledger of final ball states, frames, and rule outcomes.
// ============================================================================

import {
  initRapier,
  RapierPoolWorld,
  createRegulationRackPositions,
  CUE_ID,
  FIXED_TIMESTEP,
} from './rapierPhysics.js';
import { TABLE } from './config.js';

// --- Regulation Rack Creation ---
export function createRack() {
  const rackPos = createRegulationRackPositions();
  return rackPos.map((p) => ({
    id: p.id,
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    pocketed: false,
    pocketIndex: -1,
    englishX: 0,
    englishY: 0,
  }));
}

// Map power [0..1] to cue-ball launch speed (inches/sec).
const MAX_SPEED = 200; // Inches per second launch speed
export function speedForPower(power) {
  return Math.max(0, Math.min(1, power)) * MAX_SPEED;
}

// --- The Authoritative Rapier2D Shot Resolver ---
// input: { balls, angle, power, cueBallId, shotMode }
export async function resolveShot(input) {
  await initRapier();

  const shotMode = input.shotMode === 'PUSH_OUT' ? 'PUSH_OUT' : 'NORMAL';
  const cueId = input.cueBallId ?? CUE_ID;
  const poolWorld = new RapierPoolWorld();

  const ballsInput = input.balls || [];
  const cueInput = ballsInput.find((b) => b.id === cueId);

  if (!cueInput || cueInput.pocketed) {
    poolWorld.destroy();
    return {
      balls: ballsInput,
      events: [],
      frames: [],
      firstContact: null,
      pocketed: [],
      cueScratched: false,
      lowestAtStart: null,
      foul: true,
      foulReason: 'No cue ball',
      continueShooting: false,
      rackWinner: null,
      pushOut: false,
      hash: '',
    };
  }

  const lowestAtStart = lowestBall(ballsInput);

  // Add all balls to Rapier world
  for (const b of ballsInput) {
    poolWorld.addBall(b.id, b.x, b.y, b.pocketed);
  }

  // Apply linear cue strike impulse
  const speed = speedForPower(input.power);
  poolWorld.applyCueStrike(cueId, input.angle, speed);

  const events = [];
  const frames = [];
  const MAX_STEPS = 3600; // Maximum 30 seconds at 120Hz
  let stepCount = 0;

  // Frame 0 snapshot
  frames.push({ t: 0, balls: poolWorld.getBallStates() });

  // Synchronous headless fast-forward simulation at 120Hz
  while (stepCount < MAX_STEPS) {
    stepCount++;
    const stepTime = stepCount * FIXED_TIMESTEP;
    const frameEvents = poolWorld.step();
    for (const e of frameEvents) {
      e.t = stepTime;
      events.push(e);
    }

    // Downsample frames every 4 steps (~30fps replay trajectory)
    if (stepCount % 4 === 0) {
      frames.push({
        t: stepTime,
        balls: poolWorld.getBallStates(),
      });
    }

    if (poolWorld.isAtRest()) {
      break;
    }
  }

  // Final frame snapshot
  frames.push({
    t: stepCount * FIXED_TIMESTEP,
    balls: poolWorld.getBallStates(),
  });

  let finalBalls = poolWorld.getBallStates();
  poolWorld.destroy();

  // Push-out: spot the 9 if pocketed
  if (shotMode === 'PUSH_OUT') {
    const nine = finalBalls.find((b) => b.id === 9);
    if (nine && nine.pocketed) {
      nine.pocketed = false;
      nine.x = TABLE.width * 0.25; // Left side foot spot area
      nine.y = TABLE.height / 2;
      nine.vx = 0;
      nine.vy = 0;
    }
  }

  const firstContact = firstContactBall(events, cueId);
  const pocketed = events.filter((e) => e.type === 'pocket').map((e) => e.ball);
  const cueScratched = pocketed.includes(cueId);

  const outcome = evaluateRules({
    balls: finalBalls,
    events,
    firstContact,
    pocketed,
    cueScratched,
    lowestAtStart,
    shotMode,
    cueId,
  });

  return {
    balls: finalBalls,
    events,
    frames,
    firstContact,
    pocketed,
    cueScratched,
    lowestAtStart,
    ...outcome,
    hash: stateHash(finalBalls),
  };
}

export function evaluateRules({
  balls,
  events,
  firstContact,
  pocketed,
  cueScratched,
  lowestAtStart,
  shotMode = 'NORMAL',
  cueId = CUE_ID,
}) {
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

  if (pocketed.includes(9) && !foul && !isPushOut) {
    rackWinner = 'shooter';
  }

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

  if (pocketed.includes(9) && foul) rackWinner = null;

  if (!foul && !rackWinner) {
    const legalPocket = pocketed.some((id) => id !== 9 && id !== cueId);
    continueShooting = legalPocket && !isPushOut;
  }

  return { foul, foulReason, rackWinner, continueShooting, pushOut: isPushOut, lowestAtStart };
}

function lowestBall(balls) {
  const live = balls.filter((b) => !b.pocketed && b.id !== CUE_ID);
  if (!live.length) return null;
  return Math.min(...live.map((b) => b.id));
}

function firstContactBall(events, cueId = CUE_ID) {
  const hit = events.find((e) => e.type === 'hit' && (e.a === cueId || e.b === cueId));
  if (!hit) return null;
  return hit.a === cueId ? hit.b : hit.a;
}

export function stateHash(balls) {
  const s = balls
    .map((b) => `${b.id}:${b.pocketed ? 'p' : `${b.x.toFixed(2)},${b.y.toFixed(2)}`}`)
    .join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
