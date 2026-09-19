// ============================================================================
// game.js — Game loop, input, aiming via Rapier2D shape-casting, replay loop.
// ============================================================================

import { createRack, speedForPower, stateHash } from './rules.js';
import { TABLE } from './config.js';
import { resolveShotRemote, hasBackend } from './resolverClient.js';
import { queuePocketDropAnimation } from './renderer.js';
import { RapierPoolWorld, CUE_ID, initRapier } from './rapierPhysics.js';
import { audioManager } from './audioManager.js';

export class Game {
  constructor(canvas, renderer, opts = {}) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.balls = [];
    this.state = 'IDLE';
    this.currentPlayer = 0; // 0 = you, 1 = AI
    this.aimAngle = 0;
    this.power = 0.6;
    this.english = { x: 0, y: 0 };
    this.shotTimer = 45;
    this.lastTime = 0;
    this.running = false;
    this.aiTimer = 0;
    this.message = '';
    // Rules state
    this.isBreakShot = true;
    this.pushOutAvailable = false;
    this.pendingPushDecision = null;
    this.consecutiveFouls = [0, 0];
    // Replay state
    this.replay = null;
    this.replayElapsed = 0;

    this.rapierWorld = null;

    this._setupUserGestureAudio();
  }

  _setupUserGestureAudio() {
    const handleGesture = () => {
      audioManager.init();
      audioManager.resume();
    };
    window.addEventListener('pointerdown', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });
  }

  async asyncInit() {
    await initRapier();
    audioManager.init();
  }

  start() {
    this.newRack(true);
    this.running = true;
    this.lastTime = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.rapierWorld) {
      this.rapierWorld.destroy();
      this.rapierWorld = null;
    }
  }

  newRack(firstRack = false) {
    this.balls = createRack();
    this.aimAngle = 0;
    this.power = 0.6;
    this.english = { x: 0, y: 0 };
    this.shotTimer = 45;
    this.isBreakShot = true;
    this.pushOutAvailable = false;
    this.pendingPushDecision = null;
    this.consecutiveFouls = [0, 0];
    this.replay = null;
    this.replayElapsed = 0;
    this.state = this.currentPlayer === 1 ? 'AI_THINKING' : 'AIMING';
    this.message = this.currentPlayer === 0 ? 'Your break' : 'Opponent breaks';
    if (this.state === 'AI_THINKING') this.aiTimer = 1.2;

    this._syncRapierAimWorld();
    this._updateAim();
    this._pushHud();
  }

  _syncRapierAimWorld() {
    if (this.rapierWorld) {
      this.rapierWorld.destroy();
    }
    this.rapierWorld = new RapierPoolWorld();
    for (const b of this.balls) {
      this.rapierWorld.addBall(b.id, b.x, b.y, b.pocketed);
    }
  }

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
      pocketedBalls: this.balls.filter((b) => b.pocketed && b.id !== CUE_ID).map((b) => b.id).sort((a, b) => a - b),
      match: m,
      isPractice: !!this.opts.practice,
      pushOutAvailable: this.pushOutAvailable && this.state === 'AIMING' && this.currentPlayer === 0,
      pendingPushDecision: this.pendingPushDecision && this.state === 'PUSH_DECISION',
      fouls: this.consecutiveFouls,
      hasBackend: hasBackend(),
    };
  }

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
    if (!cue) {
      this.renderer.aim = null;
      return;
    }

    this._syncRapierAimWorld();
    const castRes = this.rapierWorld.castAimLine(cue.x, cue.y, this.aimAngle);

    this.renderer.aim = {
      angle: this.aimAngle,
      power: this.power,
      ghost: castRes.ghost,
      target: castRes.target,
      isCushion: castRes.isCushion,
      reflectedDir: castRes.reflectedDir,
    };
  }

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

    const shotInput = {
      balls: this.balls.map((b) => ({ ...b })),
      angle: this.aimAngle,
      power: this.power,
      cueBallId: CUE_ID,
      shotMode,
    };

    this.pushOutAvailable = false;
    this.state = 'REPLAYING';
    this.message = '';

    // Trigger cue stick strike animation on renderer
    if (this.renderer && typeof this.renderer.triggerStrikeAnimation === 'function') {
      this.renderer.triggerStrikeAnimation(this.aimAngle, this.power, cue.x, cue.y);
    }

    this.renderer.aim = null;
    this._pushHud();

    audioManager.playCueStrike(speedForPower(this.power));

    const result = await resolveShotRemote(shotInput);
    if (!this.running) return;

    this.replay = {
      frames: result.frames,
      outcome: result,
      finalBalls: result.balls,
      events: result.events || [],
      playedEvents: new Set(),
    };
    this.replayElapsed = 0;
    if (result.frames && result.frames.length) this._applyFrame(result.frames[0]);
    this._pushHud();
  }

  _applyFrame(frame) {
    if (!frame) return;
    for (const fb of frame.balls) {
      const b = this.balls.find((x) => x.id === fb.id);
      if (!b) continue;
      if (fb.pocketed && !b.pocketed) {
        const pockets = TABLE.pockets || [];
        const pIdx = fb.pocketIndex ?? 0;
        const pocket = pockets[pIdx] || { center: { x: fb.x, y: fb.y } };
        queuePocketDropAnimation(b, pocket);
      }
      b.x = fb.x;
      b.y = fb.y;
      b.pocketed = fb.pocketed;
    }
  }

  _finishShot() {
    const finalBalls = this.replay.finalBalls;
    if (finalBalls) {
      for (const fb of finalBalls) {
        const b = this.balls.find((x) => x.id === fb.id);
        if (!b) continue;
        b.x = fb.x;
        b.y = fb.y;
        b.pocketed = fb.pocketed;
        b.vx = 0;
        b.vy = 0;
      }
    }
    const outcome = this.replay.outcome;
    this.replay = null;
    this.replayElapsed = 0;

    this._syncRapierAimWorld();
    this._applyOutcome(outcome);
  }

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
      const fps = Math.max(60, this.replay.frames.length / 2.5);
      const idx = Math.min(this.replay.frames.length - 1, Math.floor(this.replayElapsed * fps));
      this._applyFrame(this.replay.frames[idx]);

      // Play audio events corresponding to current replay elapsed time
      if (this.replay.events) {
        for (let i = 0; i < this.replay.events.length; i++) {
          const e = this.replay.events[i];
          if (!this.replay.playedEvents.has(i) && e.t <= this.replayElapsed) {
            this.replay.playedEvents.add(i);
            if (e.type === 'hit') {
              audioManager.playBallHit(e.speed || 10);
            } else if (e.type === 'rail') {
              audioManager.playCushionHit(e.speed || 10);
            } else if (e.type === 'pocket') {
              audioManager.playPocketDrop();
            }
          }
        }
      }

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
  }

  _applyOutcome(outcome) {
    const shooter = this.currentPlayer;

    if (outcome.rackWinner === 'shooter') {
      this._rackWon(shooter);
      return;
    }

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

    this.consecutiveFouls[shooter] = 0;

    if (this.isBreakShot) {
      this.isBreakShot = false;
      this.pushOutAvailable = true;
    }

    if (outcome.continueShooting) {
      this.state = this.currentPlayer === 1 ? 'AI_THINKING' : 'AIMING';
      this.shotTimer = 45;
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
        cue.vx = 0;
        cue.vy = 0;
      }
      this.state = this.currentPlayer === 1 ? 'AI_THINKING' : 'BALL_IN_HAND';
      this.aiTimer = 1.2;
    } else {
      this.state = this.currentPlayer === 1 ? 'AI_THINKING' : 'AIMING';
      this.aiTimer = 1.2;
    }
    this.shotTimer = 45;
    this.aimAngle = 0;
    this._updateAim();
    this._pushHud();
  }

  takePush() {
    if (this.state !== 'PUSH_DECISION' || !this.pendingPushDecision) return;
    this.pendingPushDecision = null;
    this.state = 'AIMING';
    this.message = 'You take the shot';
    this.shotTimer = 45;
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
    this.shotTimer = 45;
    this._updateAim();
    this._pushHud();
  }

  placeCueBall(tx, ty) {
    if (this.state !== 'BALL_IN_HAND') return;
    const r = TABLE.ballRadius;
    tx = Math.max(r, Math.min(TABLE.width - r, tx));
    ty = Math.max(r, Math.min(TABLE.height - r, ty));
    const cue = this.balls.find((b) => b.id === CUE_ID);
    const ok = this.balls.every((b) => b.id === CUE_ID || b.pocketed || Math.hypot(b.x - tx, b.y - ty) > r * 2.1);
    if (!ok) return;
    cue.x = tx;
    cue.y = ty;
    this.state = 'AIMING';
    this._updateAim();
    this._pushHud();
  }

  _rackWon(winner, reason) {
    const m = this.opts.match;
    const why = reason ? ` (${reason})` : '';
    if (!m) {
      this.message = (winner === 0 ? 'Rack won' : 'Opponent won the rack') + why;
      setTimeout(() => {
        if (this.running) this.newRack();
      }, 1400);
      this.state = 'RACK_OVER';
      this._pushHud();
      return;
    }
    m.racksWon[winner]++;
    const need = Math.ceil(m.bestOf / 2);
    if (m.racksWon[winner] >= need) {
      this._matchOver(winner);
      return;
    }
    this.message =
      (winner === 0 ? `Rack won — ${m.racksWon[0]}-${m.racksWon[1]}` : `Opponent won rack — ${m.racksWon[0]}-${m.racksWon[1]}`) + why;
    this.state = 'RACK_OVER';
    this._pushHud();
    setTimeout(() => {
      if (this.running) this.newRack();
    }, 1600);
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

  _aiShoot() {
    const cue = this.balls.find((b) => b.id === CUE_ID && !b.pocketed);
    if (!cue) return;
    const live = this.balls.filter((b) => !b.pocketed && b.id !== CUE_ID);
    if (!live.length) return;
    const target = live.reduce((a, b) => (a.id < b.id ? a : b));

    if (this.pushOutAvailable) {
      const wantsPush = Math.random() < 0.25;
      if (wantsPush) {
        this.aimAngle = Math.atan2(-cue.y + TABLE.height / 2, TABLE.width / 2 - cue.x) + (Math.random() - 0.5) * 0.2;
        this.power = 0.5;
        this._executeShot('PUSH_OUT');
        return;
      }
    }

    this.aimAngle = Math.atan2(target.y - cue.y, target.x - cue.x) + (Math.random() - 0.5) * 0.04;
    const dist = Math.hypot(target.x - cue.x, target.y - cue.y);
    this.power = Math.min(0.95, 0.45 + dist / 120 + Math.random() * 0.15);
    this._updateAim();
    this._executeShot('NORMAL');
  }

  _aiDecidePush() {
    const dec = this.pendingPushDecision;
    if (!dec) return;
    if (Math.random() < 0.5) {
      this.pendingPushDecision = null;
      this.state = 'AIMING';
      this._aiShoot();
    } else {
      this.passPush();
    }
  }
}
