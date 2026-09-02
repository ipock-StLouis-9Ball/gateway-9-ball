// ============================================================================
// game.js — Game loop, input (aim/power/english/shoot), turn handling, the
// push-out + three-foul rules, a simple AI opponent, and best-of-3 match flow.
//
// Shot resolution goes through resolverClient.resolveShotRemote(), which runs
// the authoritative resolver on the backend in the sandbox preview and falls
// back to the in-browser resolver on a static host (e.g. GitHub Pages). The
// resolver returns trajectory frames + a rule outcome; the client replays the
// frames for animation and applies the (server-authoritative) outcome.
// ============================================================================

import { Physics } from './physics.js';
import { createRack, speedForPower, stateHash } from './rules.js';
import { TABLE } from './config.js';
import { resolveShotRemote, hasBackend } from './resolverClient.js';

const CUE_ID = 0;

export class Game {
  constructor(canvas, renderer, opts = {}) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.ctx = canvas.getContext('2d');
    this.physics = new Physics();
    this.opts = opts; // { practice, pot, buyIn, onHud, onMatchOver, wallet }
    this.balls = [];
    this.state = 'IDLE';
    this.currentPlayer = 0; // 0 = you, 1 = AI
    this.aimAngle = 0;
    this.power = 0.6;
    this.english = { x: 0, y: 0 };
    this.shotTimer = 30;
    this.lastTime = 0;
    this.accumulator = 0;
    this.running = false;
    this.aiTimer = 0;
    this.message = '';
    // Rules state
    this.isBreakShot = true;
    this.pushOutAvailable = false;
    this.pendingPushDecision = null; // { pusher, chooser }
    this.consecutiveFouls = [0, 0];
    // Replay state
    this.replay = null; // { frames, outcome, finalBalls }
    this.replayElapsed = 0;
  }

  start() {
    this.newRack(true);
    this.running = true;
    this.lastTime = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
  }

  newRack(firstRack = false) {
    this.balls = createRack();
    this.aimAngle = 0;
    this.power = 0.6;
    this.english = { x: 0, y: 0 };
    this.shotTimer = 30;
    this.isBreakShot = true;
    this.pushOutAvailable = false;
    this.pendingPushDecision = null;
    this.consecutiveFouls = [0, 0];
    this.replay = null;
    this.replayElapsed = 0;
    this.state = this.currentPlayer === 1 ? 'AI_THINKING' : 'AIMING';
    this.message = this.currentPlayer === 0 ? 'Your break' : 'Opponent breaks';
    if (this.state === 'AI_THINKING') this.aiTimer = 1.2;
    this._updateAim();
    this._pushHud();
  }

  // --- HUD bridge ---
  _pushHud() {
    if (this.opts.onHud) this.opts.onHud(this.hud());
  }
  hud() {
    const m = this.opts.match || null;
    return {
      state: this.state,
      currentPlayer: this.currentPlayer,
      shotTimer: Math.ceil(this.shotTimer),
      message: this.message,
      power: this.power,
      english: this.english,
      ballsLeft: this.balls.filter((b) => !b.pocketed && b.id !== CUE_ID).length,
      match: m,
      isPractice: !!this.opts.practice,
      pushOutAvailable: this.pushOutAvailable && this.state === 'AIMING' && this.currentPlayer === 0,
      pendingPushDecision: this.pendingPushDecision && this.state === 'PUSH_DECISION',
      fouls: this.consecutiveFouls,
      hasBackend: hasBackend(),
    };
  }

  // --- Input setters (called by app.js controls) ---
  setPower(p) {
    this.power = Math.max(0, Math.min(1, p));
    this._pushHud();
  }
  setEnglish(ex, ey) {
    this.english = { x: Math.max(-1, Math.min(1, ex)), y: Math.max(-1, Math.min(1, ey)) };
    this._pushHud();
  }
  setAimFromPoint(px, py) {
    if (this.state !== 'AIMING') return;
    const cue = this.balls.find((b) => b.id === CUE_ID && !b.pocketed);
    if (!cue) return;
    const inP = this.renderer.pxToIn(px, py);
    this.aimAngle = Math.atan2(inP.y - cue.y, inP.x - cue.x);
    this._updateAim();
  }

  _updateAim() {
    if (this.state !== 'AIMING' && this.state !== 'AI_THINKING') {
      this.renderer.aim = null;
      return;
    }
    const cue = this.balls.find((b) => b.id === CUE_ID && !b.pocketed);
    if (!cue) { this.renderer.aim = null; return; }
    const r = TABLE.ballRadius;
    const ghost = this._ghostBall(cue, this.aimAngle, r);
    this.renderer.aim = { angle: this.aimAngle, power: this.power, ghost: ghost ? ghost.pos : null, target: ghost ? ghost.target : null };
  }

  _ghostBall(cue, angle, r) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let bestT = Infinity;
    let target = null;
    for (const b of this.balls) {
      if (b.pocketed || b.id === CUE_ID) continue;
      const ex = b.x - cue.x;
      const ey = b.y - cue.y;
      const proj = ex * dx + ey * dy;
      if (proj < 0) continue;
      const disc = proj * proj - (ex * ex + ey * ey - (2 * r) * (2 * r));
      if (disc < 0) continue;
      const t = proj - Math.sqrt(disc);
      if (t > 0 && t < bestT) { bestT = t; target = b; }
    }
    if (bestT === Infinity) return null;
    return { pos: { x: cue.x + dx * bestT, y: cue.y + dy * bestT }, target: { x: target.x, y: target.y } };
  }

  // --- Shot execution (async: resolver may be remote) ---
  shoot() {
    if (this.state !== 'AIMING') return;
    this._executeShot('NORMAL');
  }
  pushOut() {
    if (this.state !== 'AIMING' || !this.pushOutAvailable) return;
    this._executeShot('PUSH_OUT');
  }

  async _executeShot(shotMode) {
    const cue = this.balls.find((b) => b.id === CUE_ID && !b.pocketed);
    if (!cue) return;
    // Snapshot the pre-shot state for the authoritative resolver.
    const shotInput = {
      balls: this.balls.map((b) => ({ ...b })),
      angle: this.aimAngle,
      power: this.power,
      english: { ...this.english },
      cueBallId: CUE_ID,
      shotMode,
    };
    this.pushOutAvailable = false; // push-out option is consumed by this shot
    this.state = 'REPLAYING';
    this.message = '';
    this.renderer.aim = null;
    this._pushHud();

    const result = await resolveShotRemote(shotInput);
    if (!this.running) return;
    this.replay = { frames: result.frames, outcome: result, finalBalls: result.balls };
    this.replayElapsed = 0;
    // Snap to frame 0 immediately so the cue ball doesn't visually jump.
    if (result.frames && result.frames.length) this._applyFrame(result.frames[0]);
    this._pushHud();
  }

  _applyFrame(frame) {
    if (!frame) return;
    for (const fb of frame.balls) {
      const b = this.balls.find((x) => x.id === fb.id);
      if (!b) continue;
      b.x = fb.x; b.y = fb.y; b.pocketed = fb.pocketed;
    }
  }

  _finishShot() {
    // Snap to the resolver's final ball state (authoritative).
    const finalBalls = this.replay.finalBalls;
    if (finalBalls) {
      for (const fb of finalBalls) {
        const b = this.balls.find((x) => x.id === fb.id);
        if (!b) continue;
        b.x = fb.x; b.y = fb.y; b.pocketed = fb.pocketed;
        b.vx = 0; b.vy = 0; b.englishX = 0; b.englishY = 0;
      }
    }
    const outcome = this.replay.outcome;
    this.replay = null;
    this.replayElapsed = 0;
    this._applyOutcome(outcome);
  }

  // --- Main loop ---
  _loop = (now = performance.now()) => {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this._update(dt);
    this.renderer.draw(this.balls);
    requestAnimationFrame(this._loop);
  };

  _update(dt) {
    if (this.state === 'REPLAYING') {
      if (!this.replay) return;
      this.replayElapsed += dt;
      // Replay long shots faster so every shot animates in ~2.5s, not 8s.
      const fps = Math.max(60, this.replay.frames.length / 2.5);
      const idx = Math.min(this.replay.frames.length - 1, Math.floor(this.replayElapsed * fps));
      this._applyFrame(this.replay.frames[idx]);
      if (this.replayElapsed * fps >= this.replay.frames.length - 1) {
        this._finishShot();
      }
    } else if (this.state === 'AIMING') {
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) {
        this.shotTimer = 0;
        this._endTurn(true, 'Shot time expired');
      }
    } else if (this.state === 'AI_THINKING') {
      this.aiTimer -= dt;
      this.shotTimer -= dt;
      if (this.aiTimer <= 0) {
        if (this.pendingPushDecision) this._aiDecidePush();
        else this._aiShoot();
      }
    } else if (this.state === 'BALL_IN_HAND') {
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) this._endTurn(true, 'Shot time expired');
    }
    // PUSH_DECISION: no timer pressure (waits for player choice)
  }

  _applyOutcome(outcome) {
    const shooter = this.currentPlayer;

    if (outcome.rackWinner === 'shooter') {
      this._rackWon(shooter);
      return;
    }

    // Push-out (clean, no scratch): opponent chooses take or pass-back.
    if (outcome.pushOut && !outcome.foul) {
      const pusher = shooter;
      const chooser = 1 - shooter;
      this.pendingPushDecision = { pusher, chooser };
      this.currentPlayer = chooser;
      this.message = chooser === 0 ? 'Opponent pushed out — take or pass?' : 'You pushed out — opponent decides';
      this.state = chooser === 1 ? 'AI_THINKING' : 'PUSH_DECISION';
      this.aiTimer = 1.4;
      this.aimAngle = 0;
      this._updateAim();
      this._pushHud();
      return;
    }

    if (outcome.foul) {
      this.consecutiveFouls[shooter] += 1;
      if (this.consecutiveFouls[shooter] >= 3) {
        this._rackWon(1 - shooter, 'Three consecutive fouls');
        return;
      }
      this._endTurn(true, outcome.foulReason);
      return;
    }

    // Legal shot: reset this shooter's foul count.
    this.consecutiveFouls[shooter] = 0;

    // After a legal break, the shooter who comes to the table next may exercise
    // a push-out (only on the shot immediately following the break).
    if (this.isBreakShot) {
      this.isBreakShot = false;
      this.pushOutAvailable = true;
    }

    if (outcome.continueShooting) {
      this.state = this.currentPlayer === 1 ? 'AI_THINKING' : 'AIMING';
      this.shotTimer = 30;
      this.message = this.currentPlayer === 0 ? 'Nice shot — continue' : 'Opponent continues';
      this.aiTimer = 1.4;
      this._updateAim();
      this._pushHud();
      return;
    }

    this._endTurn(false, 'Safety — turn passes');
  }

  _endTurn(foul, reason) {
    if (foul) this.message = `Foul: ${reason}`;
    this.currentPlayer = 1 - this.currentPlayer;
    if (foul) {
      const cue = this.balls.find((b) => b.id === CUE_ID);
      if (cue && cue.pocketed) {
        cue.pocketed = false;
        cue.x = TABLE.width * 0.25;
        cue.y = TABLE.height / 2;
        cue.vx = 0; cue.vy = 0;
      }
      this.state = this.currentPlayer === 1 ? 'AI_THINKING' : 'BALL_IN_HAND';
      this.aiTimer = 1.2;
    } else {
      this.state = this.currentPlayer === 1 ? 'AI_THINKING' : 'AIMING';
      this.aiTimer = 1.2;
    }
    this.shotTimer = 30;
    this.aimAngle = 0;
    this._updateAim();
    this._pushHud();
  }

  // Push-out decision (human chooser): take the shot or pass it back.
  takePush() {
    if (this.state !== 'PUSH_DECISION' || !this.pendingPushDecision) return;
    this.pendingPushDecision = null;
    this.state = 'AIMING';
    this.message = 'You take the shot';
    this.shotTimer = 30;
    this._updateAim();
    this._pushHud();
  }
  passPush() {
    if (this.state !== 'PUSH_DECISION' || !this.pendingPushDecision) return;
    const pusher = this.pendingPushDecision.pusher;
    this.pendingPushDecision = null;
    this.currentPlayer = pusher;
    this.state = pusher === 1 ? 'AI_THINKING' : 'AIMING';
    this.aiTimer = 1.4;
    this.message = pusher === 0 ? 'You passed back' : 'Opponent passes back';
    this.shotTimer = 30;
    this._updateAim();
    this._pushHud();
  }

  // Ball-in-hand: player places cue ball (app.js drag calls this).
  placeCueBall(tx, ty) {
    if (this.state !== 'BALL_IN_HAND') return;
    const r = TABLE.ballRadius;
    tx = Math.max(r, Math.min(TABLE.width - r, tx));
    ty = Math.max(r, Math.min(TABLE.height - r, ty));
    const cue = this.balls.find((b) => b.id === CUE_ID);
    const ok = this.balls.every((b) => b.id === CUE_ID || b.pocketed || Math.hypot(b.x - tx, b.y - ty) > r * 2.1);
    if (!ok) return;
    cue.x = tx; cue.y = ty;
    this.state = 'AIMING';
    this._updateAim();
    this._pushHud();
  }

  _rackWon(winner, reason) {
    const m = this.opts.match;
    const why = reason ? ` (${reason})` : '';
    if (!m) {
      this.message = (winner === 0 ? 'Rack won' : 'Opponent won the rack') + why;
      setTimeout(() => { if (this.running) this.newRack(); }, 1400);
      this.state = 'RACK_OVER';
      this._pushHud();
      return;
    }
    m.racksWon[winner]++ ;
    const need = Math.ceil(m.bestOf / 2);
    if (m.racksWon[winner] >= need) {
      this._matchOver(winner);
      return;
    }
    this.message = (winner === 0 ? `Rack won — ${m.racksWon[0]}-${m.racksWon[1]}` : `Opponent won rack — ${m.racksWon[0]}-${m.racksWon[1]}`) + why;
    this.state = 'RACK_OVER';
    this._pushHud();
    setTimeout(() => { if (this.running) this.newRack(); }, 1600);
  }

  _matchOver(winner) {
    this.state = 'MATCH_OVER';
    const m = this.opts.match;
    if (winner === 0) {
      this.opts.wallet?.credit(m.pot - m.rake, 'Match winnings');
      m.result = { winner: 0, payout: m.pot - m.rake, rake: m.rake };
      this.message = `Match won — +DB$${(m.pot - m.rake).toFixed(2)} (rake DB$${m.rake.toFixed(2)})`;
    } else {
      m.result = { winner: 1, payout: 0, rake: m.rake };
      this.message = `Match lost — DB$${m.buyIn.toFixed(2)} entry`;
    }
    this._pushHud();
    if (this.opts.onMatchOver) this.opts.onMatchOver(m);
  }

  // --- Simple AI ---
  _firstContact(events) {
    const hit = events.find((e) => e.type === 'hit' && (e.a === CUE_ID || e.b === CUE_ID));
    if (!hit) return null;
    return hit.a === CUE_ID ? hit.b : hit.a;
  }
  _lowestLive() {
    const live = this.balls.filter((b) => !b.pocketed && b.id !== CUE_ID);
    return live.length ? Math.min(...live.map((b) => b.id)) : null;
  }

  // Does the cue ball have a clear line to the target (any pocketable shot)?
  _aiHasLineToTarget(cue, target) {
    const r = TABLE.ballRadius;
    const dx = target.x - cue.x;
    const dy = target.y - cue.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    for (const b of this.balls) {
      if (b.pocketed || b.id === CUE_ID || b.id === target.id) continue;
      // perpendicular distance from this ball to the cue->target line
      const px = b.x - cue.x, py = b.y - cue.y;
      const proj = px * ux + py * uy;
      if (proj < 0 || proj > len) continue;
      const perp = Math.abs(px * uy - py * ux);
      if (perp < r * 1.9) return false; // blocked
    }
    return true;
  }

  _aiShoot() {
    const cue = this.balls.find((b) => b.id === CUE_ID && !b.pocketed);
    if (!cue) return;
    const live = this.balls.filter((b) => !b.pocketed && b.id !== CUE_ID);
    if (!live.length) return;
    const target = live.reduce((a, b) => (a.id < b.id ? a : b));
    const r = TABLE.ballRadius;

    // Break-shot push-out option: occasionally push out when available.
    if (this.pushOutAvailable) {
      const wantsPush = !this._aiHasLineToTarget(cue, target) || Math.random() < 0.25;
      if (wantsPush) {
        // Send the cue ball on a gentle safety into open space.
        this.aimAngle = Math.atan2(-cue.y + TABLE.height / 2, TABLE.width / 2 - cue.x) + (Math.random() - 0.5) * 0.2;
        this.power = 0.5;
        this.english = { x: 0, y: 0 };
        this._executeShot('PUSH_OUT');
        return;
      }
    }

    const toTarget = Math.atan2(target.y - cue.y, target.x - cue.x);
    let pk = this.physics.pockets[0], bd = Infinity;
    for (const p of this.physics.pockets) {
      const d = Math.hypot(target.x - p.x, target.y - p.y);
      if (d < bd) { bd = d; pk = p; }
    }
    const px = Math.cos(toTarget + Math.PI / 2);
    const py = Math.sin(toTarget + Math.PI / 2);
    const cutDir = (target.x - pk.x) * px + (target.y - pk.y) * py;
    const offset = (cutDir < 0 ? -1 : 1) * r * 0.7;
    const aimX = target.x + px * offset;
    const aimY = target.y + py * offset;
    this.aimAngle = Math.atan2(aimY - cue.y, aimX - cue.x) + (Math.random() - 0.5) * 0.04;
    const dist = Math.hypot(target.x - cue.x, target.y - cue.y);
    this.power = Math.min(0.95, 0.45 + dist / 120 + Math.random() * 0.15);
    this.english = { x: 0, y: 0 };
    this._updateAim();
    this._executeShot('NORMAL');
  }

  // AI decides take/pass after the opponent's push-out.
  _aiDecidePush() {
    const dec = this.pendingPushDecision;
    if (!dec) return;
    const cue = this.balls.find((b) => b.id === CUE_ID && !b.pocketed);
    const live = this.balls.filter((b) => !b.pocketed && b.id !== CUE_ID);
    const target = live.length ? live.reduce((a, b) => (a.id < b.id ? a : b)) : null;
    const take = cue && target && this._aiHasLineToTarget(cue, target);
    if (take) {
      this.pendingPushDecision = null;
      this.state = 'AIMING';
      this._aiShoot();
    } else {
      this.passPush(); // pass back to the pusher
    }
  }
}
