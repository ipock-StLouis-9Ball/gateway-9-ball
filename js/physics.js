// ============================================================================
// physics.js — Generic 2D pool table physics (table-space units, inches).
// Fixed-timestep, impulse-based ball collisions, cushion reflection with
// pocket mouth gaps, rolling friction, and pocket capture.
//
// Pure & deterministic: given the same inputs it produces the same result.
// This module is the boundary that later moves behind a Cloud Run endpoint.
// ============================================================================

import { TABLE } from './config.js';

// Pocket centers (corners + side). x in [0,W], y in [0,H].
export function pocketCenters(W = TABLE.width, H = TABLE.height) {
  return [
    { x: 0, y: 0 }, // top-left
    { x: W / 2, y: 0 }, // top-middle
    { x: W, y: 0 }, // top-right
    { x: 0, y: H }, // bottom-left
    { x: W / 2, y: H }, // bottom-middle
    { x: W, y: H }, // bottom-right
  ];
}

// Distance from a value to a gap region. Returns true if `pos` lies within
// any pocket-mouth gap along the wall (i.e., no cushion there).
function inMouth(pos, gaps) {
  for (const [lo, hi] of gaps) if (pos >= lo && pos <= hi) return true;
  return false;
}

// Precompute mouth gaps (half-width) for each wall.
const MW = TABLE.pocketRadius * 0.92; // mouth half-width
function wallGaps(W, H) {
  return {
    left: [[0, MW], [H - MW, H]], // y gaps
    right: [[0, MW], [H - MW, H]],
    top: [[0, MW], [W / 2 - MW, W / 2 + MW], [W - MW, W]], // x gaps
    bottom: [[0, MW], [W / 2 - MW, W / 2 + MW], [W - MW, W]],
  };
}

export class Physics {
  constructor(W = TABLE.width, H = TABLE.height) {
    this.W = W;
    this.H = H;
    this.r = TABLE.ballRadius;
    this.gaps = wallGaps(W, H);
    this.pockets = pocketCenters(W, H);
    this.captureR = TABLE.pocketRadius * 0.82;
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
      // spin: cue ball english — modest curve. Angular damping wears spin
      // off exponentially over distance so backspin/topspin/side fade naturally;
      // cleared near rest so the shot always resolves (no perpetual drift).
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

    // Cushion reflections (with pocket mouth gaps). Emits 'rail' events so the
    // rules engine can enforce the post-contact rail requirement.
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

    // Ball-ball collisions (O(n^2), n<=10)
    for (let i = 0; i < moving.length; i++) {
      for (let j = i + 1; j < moving.length; j++) {
        this._resolveBallPair(moving[i], moving[j], events);
      }
    }

    // Pocket capture
    for (const b of moving) {
      for (let p = 0; p < this.pockets.length; p++) {
        const pc = this.pockets[p];
        const d = Math.hypot(b.x - pc.x, b.y - pc.y);
        if (d < this.captureR) {
          b.pocketed = true;
          b.vx = 0;
          b.vy = 0;
          b.pocketIndex = p;
          events.push({ type: 'pocket', ball: b.id, pocket: p });
          break;
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
    // separate
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;
    // relative velocity along normal
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) return; // separating
    const e = TABLE.ballRestitution;
    const j = (-(1 + e) * velAlongNormal) / 2; // equal mass
    const ix = j * nx;
    const iy = j * ny;
    a.vx -= ix;
    a.vy -= iy;
    b.vx += ix;
    b.vy += iy;
    events.push({ type: 'hit', a: a.id, b: b.id, speed: Math.abs(velAlongNormal) });
  }

  // Are all balls at rest?
  atRest(balls) {
    return balls.every((b) => b.pocketed || (b.vx === 0 && b.vy === 0));
  }
}

// Set cue-ball english (spin) offsets in [-1,1]. englishX = side spin,
// englishY = draw/follow. Stored on the ball; physics applies mild curve.
export function setEnglish(cue, ex, ey) {
  cue.englishX = ex;
  cue.englishY = ey;
}
