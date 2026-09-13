// ============================================================================
// physics.js — Generic 2D pool table physics (table-space units, inches).
// Substep Euler integration, pre-cushion pocket trigger capture, line-segment
// cushion reflection with true mouth gaps, rolling drag, and ball impulse collisions.
//
// Pure & deterministic: given the same inputs it produces the same result.
// ============================================================================

import { TABLE } from './config.js';

export function getPocketBlueprint(W = TABLE.width, H = TABLE.height) {
  if (TABLE.pockets) {
    return TABLE.pockets.map((p, idx) => ({
      id: p.id,
      type: p.id.includes('side') ? 'side' : 'corner',
      x: p.center.x,
      y: p.center.y,
      trigger_radius: p.triggerRadius,
      index: idx
    }));
  }
  return [
    { id: 'bottom_left', type: 'corner', x: -0.85, y: -0.85, trigger_radius: 2.65, index: 0 },
    { id: 'bottom_right', type: 'corner', x: 88.85, y: -0.85, trigger_radius: 2.65, index: 1 },
    { id: 'top_left', type: 'corner', x: -0.85, y: 44.85, trigger_radius: 2.65, index: 2 },
    { id: 'top_right', type: 'corner', x: 88.85, y: 44.85, trigger_radius: 2.65, index: 3 },
    { id: 'bottom_side', type: 'side', x: 44.0, y: -1.00, trigger_radius: 2.40, index: 4 },
    { id: 'top_side', type: 'side', x: 44.0, y: 45.00, trigger_radius: 2.40, index: 5 },
  ];
}

export function pocketCenters(W = TABLE.width, H = TABLE.height) {
  return getPocketBlueprint(W, H).map(p => ({ x: p.x, y: p.y }));
}

// Line-segment cushion collision clamping for truncated rails
function resolveSegmentCushions(ball, events = []) {
  const cushions = TABLE.cushions || [];
  const radius = ball.radius || TABLE.ballRadius;
  const restitution = TABLE.physics?.cushionRestitution ?? TABLE.cushionRestitution;

  for (const c of cushions) {
    const l2 = (c.p2.x - c.p1.x) ** 2 + (c.p2.y - c.p1.y) ** 2;
    if (l2 === 0) continue;
    let t = ((ball.x - c.p1.x) * (c.p2.x - c.p1.x) + (ball.y - c.p1.y) * (c.p2.y - c.p1.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = c.p1.x + t * (c.p2.x - c.p1.x);
    const projY = c.p1.y + t * (c.p2.y - c.p1.y);

    const dx = ball.x - projX;
    const dy = ball.y - projY;
    const dist = Math.hypot(dx, dy);

    if (dist < radius) {
      // Normal calculation
      const nx = dist > 0.0001 ? dx / dist : c.normal.x;
      const ny = dist > 0.0001 ? dy / dist : c.normal.y;

      // Positional separation
      ball.x = projX + nx * radius;
      ball.y = projY + ny * radius;

      // Impulse reflection along cushion normal
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        ball.vx -= (1 + restitution) * dot * nx;
        ball.vy -= (1 + restitution) * dot * ny;
        events.push({ type: 'rail', ball: ball.id, wall: c.id });
      }
    }
  }
}

function resolveBallPair(b1, b2, events = []) {
  if (b1.collidable === false || b2.collidable === false) return;
  const r1 = b1.radius || TABLE.ballRadius;
  const r2 = b2.radius || TABLE.ballRadius;
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const dist = Math.hypot(dx, dy);
  const minDist = r1 + r2;

  if (dist < minDist && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;

    // Positional separation (50/50 split)
    const overlap = 0.5 * (minDist - dist);
    b1.x -= nx * overlap;
    b1.y -= ny * overlap;
    b2.x += nx * overlap;
    b2.y += ny * overlap;

    // Impulse resolution
    const m1 = b1.mass || TABLE.ball?.mass || 0.17;
    const m2 = b2.mass || TABLE.ball?.mass || 0.17;
    const kx = b1.vx - b2.vx;
    const ky = b1.vy - b2.vy;
    const velAlongNormal = kx * nx + ky * ny;

    if (velAlongNormal > 0) {
      const e = TABLE.physics?.ballRestitution ?? TABLE.ballRestitution;
      const p = (1 + e) * velAlongNormal / (m1 + m2);

      b1.vx -= p * m2 * nx;
      b1.vy -= p * m2 * ny;
      b2.vx += p * m1 * nx;
      b2.vy += p * m1 * ny;

      events.push({ type: 'hit', a: b1.id, b: b2.id, speed: Math.abs(velAlongNormal) });
    }
  }
}

export function updatePhysicsStep(balls, dt, subSteps = 8, onBallPocketed = null) {
  const events = [];
  const subDt = dt / subSteps;
  const pockets = TABLE.pockets || getPocketBlueprint().map(p => ({
    id: p.id,
    center: { x: p.x, y: p.y },
    triggerRadius: p.trigger_radius
  }));

  for (let s = 0; s < subSteps; s++) {
    // 1. Integration (Euler update) & Drag
    for (const ball of balls) {
      if (ball.active === false || ball.pocketed) continue;
      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;

      // Apply linear rolling drag
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > 0) {
        const friction = TABLE.physics?.rollingFriction ?? 0.015;
        const drop = speed * friction * subDt * 60;
        const newSpeed = Math.max(0, speed - drop);
        if (newSpeed === 0) {
          ball.vx = 0;
          ball.vy = 0;
        } else {
          ball.vx = (ball.vx / speed) * newSpeed;
          ball.vy = (ball.vy / speed) * newSpeed;
        }
      }

      // Cue ball spin/english decay & curve
      if (ball.englishX || ball.englishY) {
        const damp = Math.exp(-TABLE.spinDamping * subDt);
        ball.englishX *= damp;
        ball.englishY *= damp;
        if (speed > 1.2) {
          ball.vx += (ball.englishX || 0) * subDt * 6;
          ball.vy += (ball.englishY || 0) * subDt * 6;
        } else {
          ball.englishX = 0;
          ball.englishY = 0;
        }
      }
    }

    // 2. Pocket Trigger Detection (Must precede cushion collision)
    for (const ball of balls) {
      if (ball.active === false || ball.pocketed) continue;
      for (let pIdx = 0; pIdx < pockets.length; pIdx++) {
        const pocket = pockets[pIdx];
        const dx = pocket.center.x - ball.x;
        const dy = pocket.center.y - ball.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < pocket.triggerRadius * pocket.triggerRadius) {
          const dot = ball.vx * dx + ball.vy * dy;
          const speed = Math.hypot(ball.vx, ball.vy);

          if (dot > 0 || speed < 0.5) { // Ball tracking into pocket throat or resting in throat
            ball.pocketed = true;
            ball.active = false;
            ball.collidable = false;
            ball.vx = 0;
            ball.vy = 0;
            ball.pocketIndex = pIdx;

            events.push({ type: 'pocket', ball: ball.id, pocket: pIdx, pocketObj: pocket });

            if (typeof onBallPocketed === 'function') {
              onBallPocketed(ball, pocket);
            }
            break;
          }
        }
      }
    }

    // 3. Segmented Cushion Collisions
    for (const ball of balls) {
      if (ball.active === false || ball.pocketed) continue;
      resolveSegmentCushions(ball, events);
    }

    // 4. Ball-to-Ball Impulse Collision Resolution
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (balls[i].active === false || balls[j].active === false) continue;
        if (balls[i].pocketed || balls[j].pocketed) continue;
        resolveBallPair(balls[i], balls[j], events);
      }
    }
  }

  return events;
}

export class Physics {
  constructor(W = TABLE.width, H = TABLE.height, onBallPocketed = null) {
    this.W = W;
    this.H = H;
    this.r = TABLE.ballRadius;
    this.pocketSpecs = getPocketBlueprint(W, H);
    this.pockets = pocketCenters(W, H);
    this.onBallPocketed = onBallPocketed;
  }

  step(balls, dt) {
    return updatePhysicsStep(balls, dt, 8, this.onBallPocketed);
  }

  atRest(balls) {
    return balls.every((b) => b.pocketed || b.active === false || (b.vx === 0 && b.vy === 0));
  }
}

export function setEnglish(cue, ex, ey) {
  cue.englishX = ex;
  cue.englishY = ey;
}
