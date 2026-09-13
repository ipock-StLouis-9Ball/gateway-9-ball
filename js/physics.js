// ============================================================================
// physics.js — Generic 2D pool table physics (table-space units, inches).
// Fixed-timestep, impulse-based ball collisions, cushion reflection with
// pocket mouth gaps, rolling friction, and pocket capture.
//
// Pure & deterministic: given the same inputs it produces the same result.
// Exact alignment to pool_table_frame.svg pocket cutouts and cushion bevels.
// ============================================================================

import { TABLE } from './config.js';

// Pocket definitions matching the JSON table blueprint (origin at bottom-left [0,0] to top-right [88, 44]).
// Note: y=0 is top rail in canvas coordinates, y=44 is bottom rail.
export function getPocketBlueprint(W = TABLE.width, H = TABLE.height) {
  return [
    { id: 'top_left_corner', type: 'corner', x: 0.0, y: 0.0, trigger_radius: 2.6, mouth_width: 4.875 },
    { id: 'top_right_corner', type: 'corner', x: W, y: 0.0, trigger_radius: 2.6, mouth_width: 4.875 },
    { id: 'bottom_left_corner', type: 'corner', x: 0.0, y: H, trigger_radius: 2.6, mouth_width: 4.875 },
    { id: 'bottom_right_corner', type: 'corner', x: W, y: H, trigger_radius: 2.6, mouth_width: 4.875 },
    { id: 'top_side', type: 'side', x: W / 2, y: 0.0, trigger_radius: 2.4, mouth_width: 5.25 },
    { id: 'bottom_side', type: 'side', x: W / 2, y: H, trigger_radius: 2.4, mouth_width: 5.25 },
  ];
}

export function pocketCenters(W = TABLE.width, H = TABLE.height) {
  return getPocketBlueprint(W, H).map(p => ({ x: p.x, y: p.y }));
}

// Distance from a value to a gap region. Returns true if `pos` lies within
// any pocket-mouth gap along the wall (i.e., no cushion there).
function inMouth(pos, gaps) {
  for (const [lo, hi] of gaps) if (pos >= lo && pos <= hi) return true;
  return false;
}

// Precompute mouth gaps matching cushion cutouts
function wallGaps(W, H) {
  return {
    left: [[0, 3.2], [H - 3.2, H]],
    right: [[0, 3.2], [H - 3.2, H]],
    top: [[0, 3.2], [W / 2 - 2.6, W / 2 + 2.6], [W - 3.2, W]],
    bottom: [[0, 3.2], [W / 2 - 2.6, W / 2 + 2.6], [W - 3.2, W]],
  };
}

export class Physics {
  constructor(W = TABLE.width, H = TABLE.height) {
    this.W = W;
    this.H = H;
    this.r = TABLE.ballRadius;
    this.gaps = wallGaps(W, H);
    this.pocketSpecs = getPocketBlueprint(W, H);
    this.pockets = pocketCenters(W, H);
  }

  // Step the world by dt (seconds). Mutates balls in place. Returns events.
  step(balls, dt) {
    const events = [];
    const moving = balls.filter((b) => !b.pocketed);

    // Integrate motion + friction
    for (const b of moving) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // rolling friction (deceleration opposite to velocity)
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 0) {
        const dec = TABLE.friction * dt;
        if (dec >= sp) {
          b.vx = 0;
          b.vy = 0;
        } else {
          const f = (sp - dec) / sp;
          b.vx *= f;
          b.vy *= f;
        }
      }
      if (sp < TABLE.stopThreshold) {
        b.vx = 0;
        b.vy = 0;
      }
      // spin: cue ball english — modest curve.
      if (b.englishX || b.englishY) {
        const damp = Math.exp(-TABLE.spinDamping * dt);
        b.englishX *= damp;
        b.englishY *= damp;
        const sp2 = Math.hypot(b.vx, b.vy);
        if (sp2 > 1.2) {
          b.vx += (b.englishX || 0) * dt * 6;
          b.vy += (b.englishY || 0) * dt * 6;
        } else {
          b.englishX = 0;
          b.englishY = 0;
        }
      }
    }

    // Cushion reflections (with pocket mouth gaps).
    for (const b of moving) {
      const r = this.r;
      // left wall
      if (b.x - r < 0) {
        if (!inMouth(b.y, this.gaps.left)) {
          b.x = r;
          if (b.vx < 0) { b.vx = -b.vx * TABLE.cushionRestitution; events.push({ type: 'rail', ball: b.id, wall: 'left' }); }
        }
      }
      // right wall
      if (b.x + r > this.W) {
        if (!inMouth(b.y, this.gaps.right)) {
          b.x = this.W - r;
          if (b.vx > 0) { b.vx = -b.vx * TABLE.cushionRestitution; events.push({ type: 'rail', ball: b.id, wall: 'right' }); }
        }
      }
      // top wall
      if (b.y - r < 0) {
        if (!inMouth(b.x, this.gaps.top)) {
          b.y = r;
          if (b.vy < 0) { b.vy = -b.vy * TABLE.cushionRestitution; events.push({ type: 'rail', ball: b.id, wall: 'top' }); }
        }
      }
      // bottom wall
      if (b.y + r > this.H) {
        if (!inMouth(b.x, this.gaps.bottom)) {
          b.y = this.H - r;
          if (b.vy > 0) { b.vy = -b.vy * TABLE.cushionRestitution; events.push({ type: 'rail', ball: b.id, wall: 'bottom' }); }
        }
      }
    }

    // Ball-ball collisions
    for (let i = 0; i < moving.length; i++) {
      for (let j = i + 1; j < moving.length; j++) {
        this._resolveBallPair(moving[i], moving[j], events);
      }
    }

    // Pocket capture using blueprint trigger radius + velocity alignment check
    for (const b of moving) {
      for (let p = 0; p < this.pocketSpecs.length; p++) {
        const pocket = this.pocketSpecs[p];
        const dx = b.x - pocket.x;
        const dy = b.y - pocket.y;
        const dist = Math.hypot(dx, dy);

        if (dist < pocket.trigger_radius) {
          const speed = Math.hypot(b.vx, b.vy);
          // Velocity alignment check: vector pointing toward pocket center
          const toPocketX = pocket.x - b.x;
          const toPocketY = pocket.y - b.y;
          const alignment = speed > 0.001
            ? (b.vx * toPocketX + b.vy * toPocketY) / (speed * dist || 1)
            : 1.0;

          if (alignment > 0.25 || speed < 30) {
            b.pocketed = true;
            b.vx = 0;
            b.vy = 0;
            b.pocketIndex = p;
            events.push({ type: 'pocket', ball: b.id, pocket: p });
            break; // ball can only be in one pocket
          }
        }
      }
    }

    return events;
  }

  _resolveBallPair(a, b, events) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.r * 2;
    if (dist === 0 || dist >= minDist) return;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) return;
    const e = TABLE.ballRestitution;
    const j = (-(1 + e) * velAlongNormal) / 2;
    const ix = j * nx;
    const iy = j * ny;
    a.vx -= ix;
    a.vy -= iy;
    b.vx += ix;
    b.vy += iy;
    events.push({ type: 'hit', a: a.id, b: b.id, speed: Math.abs(velAlongNormal) });
  }

  atRest(balls) {
    return balls.every((b) => b.pocketed || (b.vx === 0 && b.vy === 0));
  }
}

export function setEnglish(cue, ex, ey) {
  cue.englishX = ex;
  cue.englishY = ey;
}
