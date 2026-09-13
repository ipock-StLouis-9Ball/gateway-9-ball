// ============================================================================
// rapierPhysics.js — Deterministic Rapier2D (Rust-to-WASM) physics layer.
// WPA regulation table geometry, 120Hz fixed timestep integration, continuous
// collision detection (CCD), sensor-based pocket triggers, and exact diamond rack.
// ============================================================================

import RAPIER from '@dimforge/rapier2d-compat';
import { TABLE } from './config.js';

let rapierInitialized = false;

export async function initRapier() {
  if (!rapierInitialized) {
    await RAPIER.init();
    rapierInitialized = true;
  }
  return RAPIER;
}

export const CUE_ID = 0;
export const FIXED_TIMESTEP = 1.0 / 120.0; // 120Hz fixed physics timestep
const BALL_RADIUS = TABLE.ballRadius; // 1.125 inches
const BALL_DIAMETER = BALL_RADIUS * 2.0; // 2.25 inches
const BALL_MASS = TABLE.ball?.mass || 0.17;

// Linear damping simulating Simonis worsted wool felt rolling friction
const LINEAR_DAMPING = 0.85;
const ANGULAR_DAMPING = 1.0;

export function getPocketBlueprint(W = TABLE.width, H = TABLE.height) {
  if (TABLE.pockets) {
    return TABLE.pockets.map((p, idx) => ({
      id: p.id,
      type: p.id.includes('side') ? 'side' : 'corner',
      x: p.center.x,
      y: p.center.y,
      trigger_radius: p.triggerRadius,
      index: idx,
    }));
  }
  return [
    { id: 'bottom_left', type: 'corner', x: -0.4, y: -0.4, trigger_radius: 2.5, index: 0 },
    { id: 'bottom_right', type: 'corner', x: 88.4, y: -0.4, trigger_radius: 2.5, index: 1 },
    { id: 'top_left', type: 'corner', x: -0.4, y: 44.4, trigger_radius: 2.5, index: 2 },
    { id: 'top_right', type: 'corner', x: 88.4, y: 44.4, trigger_radius: 2.5, index: 3 },
    { id: 'bottom_side', type: 'side', x: 44.0, y: -0.6, trigger_radius: 2.2, index: 4 },
    { id: 'top_side', type: 'side', x: 44.0, y: 44.6, trigger_radius: 2.2, index: 5 },
  ];
}

export function createRegulationRackPositions() {
  const apexX = 66.0; // Foot spot
  const apexY = 22.0; // Center Y
  const cueX = 22.0;  // Head spot
  const cueY = 22.0;

  const epsilon = 0.005; // Spacing epsilon to prevent overlap explosion on frame 0
  const d = BALL_DIAMETER + epsilon; // 2.255 inches
  const rowDX = d * (Math.sqrt(3.0) / 2.0); // Row spacing along X axis

  // Shuffle 2-8
  const otherBalls = [2, 3, 4, 5, 6, 7, 8];
  for (let i = otherBalls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherBalls[i], otherBalls[j]] = [otherBalls[j], otherBalls[i]];
  }

  // Row 1: Apex = 1-ball
  // Row 2: 2 random
  // Row 3: 2 random + 9-ball strictly at center
  // Row 4: 2 random
  // Row 5: 1 random
  const positions = [];

  // Cue Ball (0-ball)
  positions.push({ id: CUE_ID, x: cueX, y: cueY });

  // Row 1 (1 ball)
  positions.push({ id: 1, x: apexX, y: apexY });

  // Row 2 (2 balls)
  positions.push({ id: otherBalls[0], x: apexX + rowDX, y: apexY - d / 2.0 });
  positions.push({ id: otherBalls[1], x: apexX + rowDX, y: apexY + d / 2.0 });

  // Row 3 (3 balls, 9-ball strictly in center)
  positions.push({ id: otherBalls[2], x: apexX + rowDX * 2, y: apexY - d });
  positions.push({ id: 9,              x: apexX + rowDX * 2, y: apexY });
  positions.push({ id: otherBalls[3], x: apexX + rowDX * 2, y: apexY + d });

  // Row 4 (2 balls)
  positions.push({ id: otherBalls[4], x: apexX + rowDX * 3, y: apexY - d / 2.0 });
  positions.push({ id: otherBalls[5], x: apexX + rowDX * 3, y: apexY + d / 2.0 });

  // Row 5 (1 ball)
  positions.push({ id: otherBalls[6], x: apexX + rowDX * 4, y: apexY });

  return positions;
}

export class RapierPoolWorld {
  constructor() {
    this.RAPIER = RAPIER;
    // Zero gravity for 2D pool table top-down plane
    this.world = new RAPIER.World({ x: 0.0, y: 0.0 });
    this.world.timestep = FIXED_TIMESTEP;

    this.eventQueue = new RAPIER.EventQueue(true);
    this.pocketSensors = new Map(); // handle -> pocketSpec
    this.cushionColliders = new Set(); // handle
    this.ballBodies = new Map(); // ballId -> { body, collider, id }
    this.bodyToBallId = new Map(); // body.handle -> ballId
    this.pocketedBalls = new Map(); // ballId -> pocketIndex

    this._buildTableGeometry();
  }

  _buildTableGeometry() {
    const cushions = TABLE.cushions || [];
    const restitution = TABLE.physics?.cushionRestitution ?? TABLE.cushionRestitution ?? 0.85;

    // Static body for all cushions & static geometry
    const staticBodyDesc = RAPIER.RigidBodyDesc.fixed();
    const staticBody = this.world.createRigidBody(staticBodyDesc);

    cushions.forEach((c) => {
      const p1 = { x: c.p1.x, y: c.p1.y };
      const p2 = { x: c.p2.x, y: c.p2.y };
      const colliderDesc = RAPIER.ColliderDesc.segment(p1, p2)
        .setRestitution(restitution)
        .setFriction(0.0);
      const collider = this.world.createCollider(colliderDesc, staticBody);
      this.cushionColliders.add(collider.handle);
    });

    // Pocket Sensors
    const pockets = getPocketBlueprint();
    pockets.forEach((p) => {
      const sensorDesc = RAPIER.ColliderDesc.ball(p.trigger_radius)
        .setTranslation(p.x, p.y)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      const sensorCollider = this.world.createCollider(sensorDesc, staticBody);
      this.pocketSensors.set(sensorCollider.handle, p);
    });
  }

  addBall(id, x, y, pocketed = false) {
    if (this.ballBodies.has(id)) {
      this.removeBall(id);
    }

    if (pocketed) {
      this.pocketedBalls.set(id, 0);
      return;
    }

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y)
      .setLinearDamping(LINEAR_DAMPING)
      .setAngularDamping(ANGULAR_DAMPING)
      .setCcdEnabled(true); // Continuous Collision Detection to permanently prevent tunneling

    const body = this.world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.ball(BALL_RADIUS)
      .setRestitution(TABLE.physics?.ballRestitution ?? TABLE.ballRestitution ?? 0.96)
      .setFriction(0.0)
      .setMass(BALL_MASS)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    const collider = this.world.createCollider(colliderDesc, body);

    this.ballBodies.set(id, { body, collider, id });
    this.bodyToBallId.set(body.handle, id);
  }

  removeBall(id, pocketIndex = 0) {
    const entry = this.ballBodies.get(id);
    if (entry) {
      this.bodyToBallId.delete(entry.body.handle);
      this.world.removeRigidBody(entry.body);
      this.ballBodies.delete(id);
    }
    if (!this.pocketedBalls.has(id)) {
      this.pocketedBalls.set(id, pocketIndex);
    }
  }

  applyCueStrike(id, angle, speed) {
    const entry = this.ballBodies.get(id);
    if (!entry) return;

    const impulseX = Math.cos(angle) * speed * BALL_MASS;
    const impulseY = Math.sin(angle) * speed * BALL_MASS;
    entry.body.applyImpulse({ x: impulseX, y: impulseY }, true);
  }

  step() {
    this.world.step(this.eventQueue);

    const frameEvents = [];

    // Process collision & sensor events
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      if (!started) return;

      // Check pocket sensor collision
      let pocketSpec = this.pocketSensors.get(handle1) || this.pocketSensors.get(handle2);
      let otherHandle = this.pocketSensors.get(handle1) ? handle2 : handle1;

      if (pocketSpec) {
        // Find ball colliding with sensor
        for (const [id, entry] of this.ballBodies.entries()) {
          if (entry.collider.handle === otherHandle) {
            if (!this.pocketedBalls.has(id)) {
              frameEvents.push({ type: 'pocket', ball: id, pocket: pocketSpec.index, pocketObj: pocketSpec });
              this.pocketedBalls.set(id, pocketSpec.index);
            }
            break;
          }
        }
        return;
      }

      // Check ball-ball or ball-rail collision
      let ball1Id = null;
      let ball2Id = null;
      let isRail = false;

      for (const [id, entry] of this.ballBodies.entries()) {
        if (entry.collider.handle === handle1) ball1Id = id;
        if (entry.collider.handle === handle2) ball2Id = id;
      }

      if (this.cushionColliders.has(handle1) || this.cushionColliders.has(handle2)) {
        isRail = true;
      }

      if (ball1Id !== null && ball2Id !== null) {
        const b1 = this.ballBodies.get(ball1Id);
        const b2 = this.ballBodies.get(ball2Id);
        let impulse = 1.0;
        if (b1 && b2) {
          const v1 = b1.body.linvel();
          const v2 = b2.body.linvel();
          impulse = Math.hypot(v1.x - v2.x, v1.y - v2.y);
        }
        frameEvents.push({ type: 'hit', a: ball1Id, b: ball2Id, impulse });
      } else if ((ball1Id !== null || ball2Id !== null) && isRail) {
        const bId = ball1Id !== null ? ball1Id : ball2Id;
        const b = this.ballBodies.get(bId);
        let impulse = 1.0;
        if (b) {
          const v = b.body.linvel();
          impulse = Math.hypot(v.x, v.y);
        }
        frameEvents.push({ type: 'rail', ball: bId, impulse });
      }
    });

    // Remove pocketed balls from physics simulation after recording event
    for (const [pId, pIdx] of this.pocketedBalls.entries()) {
      if (this.ballBodies.has(pId)) {
        this.removeBall(pId, pIdx);
      }
    }

    return frameEvents;
  }

  isAtRest() {
    for (const entry of this.ballBodies.values()) {
      if (entry.body.isSleeping()) continue;
      const linvel = entry.body.linvel();
      const speed = Math.hypot(linvel.x, linvel.y);
      if (speed > 0.05) return false;
    }
    return true;
  }

  getBallStates() {
    const states = [];
    // Active balls
    for (const [id, entry] of this.ballBodies.entries()) {
      const pos = entry.body.translation();
      const vel = entry.body.linvel();
      states.push({
        id,
        x: pos.x,
        y: pos.y,
        vx: vel.x,
        vy: vel.y,
        pocketed: false,
        pocketIndex: -1,
      });
    }
    // Pocketed balls
    for (const [id, pocketIndex] of this.pocketedBalls.entries()) {
      states.push({
        id,
        x: -100,
        y: -100,
        vx: 0,
        vy: 0,
        pocketed: true,
        pocketIndex: pocketIndex ?? 0,
      });
    }
    states.sort((a, b) => a.id - b.id);
    return states;
  }

  // Native Ray/Shape Casting for Ghost Ball & Aim Guide Prediction
  castAimLine(cueX, cueY, angle) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const targetDistance = 200.0;
    const maxToi = 200.0;
    const shape = new RAPIER.Ball(BALL_RADIUS);

    let targetBall = null;
    let ghostPos = null;
    let isCushion = false;
    let reflectedDir = null;

    const cueEntry = this.ballBodies.get(CUE_ID);
    const filterFlags = RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
    const filterExcludeCollider = cueEntry ? cueEntry.collider : undefined;

    // Cast ball shape along aiming ray
    const hit = this.world.castShape(
      { x: cueX, y: cueY },
      0.0,
      { x: dirX, y: dirY },
      shape,
      targetDistance,
      true,
      filterFlags,
      undefined,
      filterExcludeCollider,
      undefined,
      (collider) => {
        return cueEntry ? collider.handle !== cueEntry.collider.handle : true;
      }
    );

    if (hit) {
      ghostPos = { x: cueX + dirX * hit.toi, y: cueY + dirY * hit.toi };

      // Identify hit collider
      if (this.cushionColliders.has(hit.collider.handle)) {
        isCushion = true;
        const witness = hit.witness1 || hit.witness2;
        if (witness) {
          const nx = hit.normal1 ? hit.normal1.x : (cueX - ghostPos.x);
          const ny = hit.normal1 ? hit.normal1.y : (cueY - ghostPos.y);
          const nlen = Math.hypot(nx, ny) || 1;
          const unx = nx / nlen, uny = ny / nlen;
          const dot = dirX * unx + dirY * uny;
          reflectedDir = { x: dirX - 2 * dot * unx, y: dirY - 2 * dot * uny };
        }
      } else {
        for (const [id, entry] of this.ballBodies.entries()) {
          if (entry.collider.handle === hit.collider.handle) {
            targetBall = { id, x: entry.body.translation().x, y: entry.body.translation().y };
            break;
          }
        }
      }
    }

    return {
      ghost: ghostPos,
      target: targetBall,
      isCushion,
      reflectedDir,
    };
  }

  destroy() {
    this.world.free();
  }
}
