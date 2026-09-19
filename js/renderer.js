// ============================================================================
// renderer.js — 2D Canvas Pool Table Renderer Engine.
// Renders 2D table graphics directly onto HTML5 2D Canvas:
// 1. Table Background Layer: './assets/table_futuristic.jpg'
// 2. Dropping Balls Animation Layer
// 3. Ball Shadows Layer: './assets/shadow.svg'
// 4. Ball Sprites Layer: './assets/ball-0.svg' .. './assets/ball-9.svg'
// 5. Aim & Cue Stick Overlay Layer
// ============================================================================

import { TABLE, BALL_COLORS, BALL_SKINS, CUE_STICKS } from './config.js';

const CUE_ID = 0;
const ASSET_DIR = './assets';

// Active dropping ball visual transitions
const droppingBalls = [];

export function queuePocketDropAnimation(ball, pocket) {
  droppingBalls.push({
    ballId: ball.id,
    color: ball.color || BALL_COLORS[ball.id] || '#FFFFFF',
    number: ball.id || 0,
    x: ball.x,
    y: ball.y,
    targetX: pocket.center ? pocket.center.x : (pocket.x ?? ball.x),
    targetY: pocket.center ? pocket.center.y : (pocket.y ?? ball.y),
    scale: 1.0,
    opacity: 1.0,
    progress: 0.0,
    duration: 0.28 // Duration in seconds (280ms)
  });
}

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = settings;

    this.tableRect = { x: 0, y: 0, w: 0, h: 0 };
    this.playfieldRect = { x: 0, y: 0, w: 0, h: 0 };
    this.playOffset = { x: 0, y: 0 };
    this.playW = 0;
    this.playH = 0;
    this.scale = 1;
    this.cssW = 0;
    this.cssH = 0;
    this.aim = null;
    this.strikeAnim = null;
    this.lastTime = performance.now();

    this._initAssets();
    this.resize();
  }

  _initAssets() {
    this.imagesLoaded = 0;

    const loadImg = (path) => {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        this.imagesLoaded++;
      };
      img.onerror = (e) => {
        console.warn(`[Renderer] Asset load failed for ${path}, fallback will be used.`, e);
      };
      return img;
    };

    this.tableFuturisticImg = loadImg(`${ASSET_DIR}/table_futuristic.jpg`);
    this.feltImg = loadImg(`${ASSET_DIR}/felt.svg`);
    this.frameImg = loadImg(`${ASSET_DIR}/pool_table_frame.svg`);
    this.shadowImg = loadImg(`${ASSET_DIR}/shadow.svg`);
    this.cushionShadowImg = loadImg(`${ASSET_DIR}/cushion-shadow.svg`);

    this.cueImgs = {};
    for (const [id, cueObj] of Object.entries(CUE_STICKS)) {
      if (cueObj.asset) {
        this.cueImgs[id] = loadImg(cueObj.asset);
      }
    }

    this.currentBallScheme = null;
    this.ballImgs = {};
    this._loadBallScheme(this.settings ? this.settings.balls : 'classic');
  }

  _loadBallScheme(schemeId) {
    const loadImg = (path) => {
      const img = new Image();
      img.src = path;
      img.onerror = (e) => {
        console.warn(`[Renderer] Ball asset load failed for ${path}`, e);
      };
      return img;
    };

    const schemeInfo = BALL_SKINS[schemeId] || BALL_SKINS.classic;
    this.currentBallScheme = schemeId;

    // Cue ball (ball 0) is ALWAYS default across all schemes
    this.ballImgs[0] = loadImg(`${ASSET_DIR}/ball-0.svg`);

    for (let i = 1; i <= 9; i++) {
      if (schemeInfo && schemeInfo.schemeDir) {
        this.ballImgs[i] = loadImg(`${schemeInfo.schemeDir}/ball-${i}.svg`);
      } else {
        this.ballImgs[i] = loadImg(`${ASSET_DIR}/ball-${i}.svg`);
      }
    }
  }

  resize() {
    const cssW = Math.max(300, this.canvas.clientWidth || Math.round(window.innerWidth * 0.8));
    const cssH = Math.max(150, this.canvas.clientHeight || window.innerHeight);
    const dpr = window.devicePixelRatio || 1;
    this.cssW = cssW;
    this.cssH = cssH;

    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);

    this._computeTableRect();
  }

  _computeTableRect() {
    const W = TABLE.width; // 100 inches
    const H = TABLE.height; // 50 inches (2:1 aspect ratio)
    const availW = Math.max(1, this.cssW);
    const availH = Math.max(1, this.cssH);
    const margin = Math.max(2, Math.min(availW, availH) * 0.005);
    const maxW = Math.max(1, availW - margin * 2);
    const maxH = Math.max(1, availH - margin * 2);

    const scale = Math.min(maxW / W, maxH / H);
    const playW = W * scale;
    const playH = H * scale;
    const offsetX = (availW - playW) / 2;
    const offsetY = (availH - playH) / 2;

    this.scale = scale;
    this.playW = playW;
    this.playH = playH;
    this.playfieldRect = { x: offsetX, y: offsetY, w: playW, h: playH };
    this.playOffset = { x: 0, y: 0 };
    this.tableRect = { x: offsetX, y: offsetY, w: playW, h: playH };
  }

  coordTransform(x, y) {
    const pf = this.playfieldRect;
    return {
      x: pf.x + (x / TABLE.width) * pf.w,
      y: pf.y + pf.h - (y / TABLE.height) * pf.h,
    };
  }

  toPx(tx, ty) {
    return this.coordTransform(tx, ty);
  }

  pxToIn(px, py) {
    const pf = this.playfieldRect;
    return {
      x: ((px - pf.x) / pf.w) * TABLE.width,
      y: ((pf.y + pf.h - py) / pf.h) * TABLE.height,
    };
  }

  ballRadiusPx() {
    return (TABLE.ballRadius / TABLE.width) * this.playfieldRect.w;
  }

  triggerStrikeAnimation(angle, power, cueX, cueY) {
    this.strikeAnim = {
      angle,
      power,
      x: cueX,
      y: cueY,
      progress: 0,
      duration: 0.12 // 120ms strike forward
    };
  }

  draw(balls) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const cssW = Math.max(300, this.canvas.clientWidth || Math.round(window.innerWidth * 0.8));
    const cssH = Math.max(150, this.canvas.clientHeight || window.innerHeight);
    if (Math.abs(cssW - this.cssW) > 2 || Math.abs(cssH - this.cssH) > 2 || this.playfieldRect.w === 0) {
      this.resize();
      console.log('[Renderer] Resized! cssW:', cssW, 'cssH:', cssH, 'playfield:', this.playfieldRect);
    }

    const dpr = window.devicePixelRatio || 1;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.settings && this.settings.balls && this.settings.balls !== this.currentBallScheme) {
      this._loadBallScheme(this.settings.balls);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    // 0. Render Table Graphic Layer (full canvas)
    if (this.tableFuturisticImg && this.tableFuturisticImg.complete && this.tableFuturisticImg.naturalWidth > 0) {
      ctx.drawImage(this.tableFuturisticImg, 0, 0, this.cssW, this.cssH);
    } else {
      ctx.fillStyle = '#0a1d12';
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }

    // 1. Felt details (head spot, foot spot, head string) and cushion drop shadows
    this.drawTableFelt(ctx);

    // 2. Render Dropping Balls animation
    this.renderDroppingBalls(ctx, dt);

    // 3. Ball shadows (under active balls)
    const rp = this.ballRadiusPx();
    for (const b of balls) {
      if (b.pocketed) continue;
      const p = this.toPx(b.x, b.y);
      const shadowSize = rp * 2.4;
      const offsetX = rp * 0.25;
      const offsetY = rp * 0.35;
      if (this.shadowImg && this.shadowImg.complete && this.shadowImg.naturalWidth > 0) {
        ctx.drawImage(this.shadowImg, p.x - shadowSize / 2 + offsetX, p.y - shadowSize / 2 + offsetY, shadowSize, shadowSize);
      } else {
        ctx.beginPath();
        ctx.ellipse(p.x + offsetX, p.y + offsetY, rp * 1.1, rp * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();
      }
    }

    // 4. Ball sprites
    for (const b of balls) {
      if (b.pocketed) continue;
      const p = this.toPx(b.x, b.y);
      const ballImg = this.ballImgs[b.id];
      if (ballImg && ballImg.complete && ballImg.naturalWidth > 0) {
        ctx.drawImage(ballImg, p.x - rp, p.y - rp, rp * 2, rp * 2);
      } else {
        this._drawBallFallback(ctx, b.id, p.x, p.y, rp);
      }
    }

    // 5. Aim Overlay (cue stick, aiming vector, ghost ball, target lines)
    this._drawAim(ctx, balls);

    // 6. Strike Animation Layer (when shot is released)
    this._drawStrike(ctx, dt);

    ctx.restore();
  }

  renderDroppingBalls(ctx, dt) {
    for (let i = droppingBalls.length - 1; i >= 0; i--) {
      const drop = droppingBalls[i];
      drop.progress += dt / drop.duration;

      if (drop.progress >= 1.0) {
        droppingBalls.splice(i, 1);
        continue;
      }

      // Cubic ease-in to simulate accelerating downward pull into the cup
      const t = drop.progress;
      const easeIn = t * t * t;

      // Interpolate towards pocket center while shrinking
      const currentX = drop.x + (drop.targetX - drop.x) * easeIn;
      const currentY = drop.y + (drop.targetY - drop.y) * easeIn;
      drop.scale = 1.0 - (0.55 * easeIn);     // Shrink down to 45% of original radius
      drop.opacity = 1.0 - (0.85 * easeIn);   // Fade down to 15% opacity inside the cup

      // Convert simulation inches to canvas pixels
      const canvasPos = this.toPx(currentX, currentY);
      const radiusPx = ((TABLE.ballRadius * drop.scale) / TABLE.width) * this.playfieldRect.w;

      ctx.save();
      ctx.globalAlpha = Math.max(0, drop.opacity);

      // Ball Body
      const ballImg = this.ballImgs[drop.number];
      if (ballImg && ballImg.complete && ballImg.naturalWidth > 0) {
        ctx.drawImage(ballImg, canvasPos.x - radiusPx, canvasPos.y - radiusPx, radiusPx * 2, radiusPx * 2);
      } else {
        ctx.beginPath();
        ctx.arc(canvasPos.x, canvasPos.y, radiusPx, 0, Math.PI * 2);
        ctx.fillStyle = drop.color;
        ctx.fill();
      }

      // Dark falloff vignette on top of dropping ball
      ctx.beginPath();
      ctx.arc(canvasPos.x, canvasPos.y, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 0, 0, ${easeIn * 0.65})`;
      ctx.fill();

      ctx.restore();
    }
  }

  _drawBallFallback(ctx, id, x, y, rp) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, rp, 0, Math.PI * 2);
    const color = id === CUE_ID ? '#f8f7f0' : (BALL_COLORS[id] || '#ffffff');
    ctx.fillStyle = color;
    ctx.fill();

    if (id === 9) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - rp, y - rp, rp * 2, rp * 2);
      ctx.fillStyle = color;
      ctx.fillRect(x - rp, y - rp * 0.5, rp * 2, rp);
      ctx.restore();
    }

    if (id !== CUE_ID) {
      const numR = rp * 0.45;
      ctx.beginPath();
      ctx.arc(x, y, numR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#d0d0d0';
      ctx.stroke();

      ctx.fillStyle = '#111111';
      ctx.font = `bold ${Math.round(rp * 0.6)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(id.toString(), x, y + rp * 0.04);
    }
    ctx.restore();
  }

  _drawAim(ctx, balls) {
    if (!this.aim) return;
    const cue = balls.find((b) => b.id === CUE_ID && !b.pocketed);
    if (!cue) return;

    const rp = this.ballRadiusPx();
    const p = this.toPx(cue.x, cue.y);
    const ang = this.aim.angle;
    const dir = { x: Math.cos(ang), y: Math.sin(ang) };
    const ghost = this.aim.ghost;
    const target = this.aim.target;

    ctx.save();

    const equippedCueId = this.settings ? this.settings.cue : 'maple';
    const cueImg = this.cueImgs ? this.cueImgs[equippedCueId] : null;

    // Drawn 6 pool ball diameters (12 ball radii) away from cue ball at all times while aiming
    const baseGap = rp * 12;
    const pullBack = rp * 3 * (this.aim.power || 0);
    const gap = baseGap + pullBack;
    const sx = p.x - dir.x * gap;
    const sy = p.y - dir.y * gap;

    if (cueImg && cueImg.complete && cueImg.naturalWidth > 0) {
      const stickLen = rp * 14;
      const stickHeight = rp * 0.875; // Maintains 800:50 (16:1) aspect ratio

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang + Math.PI);
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.drawImage(cueImg, 0, -stickHeight / 2, stickLen, stickHeight);
      ctx.restore();
    } else {
      const stickLen = rp * 11;
      const bx = sx - dir.x * stickLen;
      const by = sy - dir.y * stickLen;
      const sg = ctx.createLinearGradient(sx, sy, bx, by);
      sg.addColorStop(0, '#e8e2d0');
      sg.addColorStop(0.1, '#c98a4a');
      sg.addColorStop(1, '#5a2f18');
      ctx.strokeStyle = sg;
      ctx.lineWidth = rp * 0.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    if (ghost) {
      const gp = this.toPx(ghost.x, ghost.y);
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(p.x + dir.x * rp, p.y + dir.y * rp);
      ctx.lineTo(gp.x, gp.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, rp, 0, Math.PI * 2);
      ctx.stroke();

      if (this.aim.isCushion && this.aim.reflectedDir) {
        const rdir = this.aim.reflectedDir;
        const bounceLen = rp * 7;
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(120,255,170,0.85)';
        ctx.beginPath();
        ctx.moveTo(gp.x, gp.y);
        ctx.lineTo(gp.x + rdir.x * bounceLen, gp.y + rdir.y * bounceLen);
        ctx.stroke();
      } else if (target) {
        const nx = target.x - ghost.x;
        const ny = target.y - ghost.y;
        const nlen = Math.hypot(nx, ny) || 1;
        const nxn = nx / nlen, nyn = ny / nlen;
        const defLen = rp * 6;
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(120,255,170,0.85)';
        const tp = this.toPx(target.x, target.y);
        ctx.beginPath();
        ctx.moveTo(tp.x, tp.y);
        ctx.lineTo(tp.x + nxn * defLen, tp.y + nyn * defLen);
        ctx.stroke();

        const dot = dir.x * nxn + dir.y * nyn;
        let tx = dir.x - dot * nxn;
        let ty = dir.y - dot * nyn;
        const tlen = Math.hypot(tx, ty);
        if (tlen > 0.08) {
          tx /= tlen; ty /= tlen;
          const carLen = rp * 5;
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = 'rgba(180,210,255,0.7)';
          ctx.beginPath();
          ctx.moveTo(gp.x, gp.y);
          ctx.lineTo(gp.x + tx * carLen, gp.y + ty * carLen);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  _drawStrike(ctx, dt) {
    if (!this.strikeAnim) return;

    this.strikeAnim.progress += dt / this.strikeAnim.duration;
    if (this.strikeAnim.progress >= 1.0) {
      this.strikeAnim = null;
      return;
    }

    const rp = this.ballRadiusPx();
    const p = this.toPx(this.strikeAnim.x, this.strikeAnim.y);
    const ang = this.strikeAnim.angle;
    const dir = { x: Math.cos(ang), y: Math.sin(ang) };

    const t = Math.min(1.0, this.strikeAnim.progress);
    // Smooth ease-out move forward from 12*rp down to cue ball contact (rp * 1.0)
    const startGap = rp * 12 + rp * 3 * (this.strikeAnim.power || 0);
    const endGap = rp * 1.0;
    const gap = startGap + (endGap - startGap) * Math.sin(t * Math.PI * 0.5);

    const sx = p.x - dir.x * gap;
    const sy = p.y - dir.y * gap;

    const equippedCueId = this.settings ? this.settings.cue : 'maple';
    const cueImg = this.cueImgs ? this.cueImgs[equippedCueId] : null;

    ctx.save();
    ctx.globalAlpha = 1.0 - t * 0.3; // Slight fade at the end of strike

    if (cueImg && cueImg.complete && cueImg.naturalWidth > 0) {
      const stickLen = rp * 14;
      const stickHeight = rp * 0.875;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang + Math.PI);
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.drawImage(cueImg, 0, -stickHeight / 2, stickLen, stickHeight);
      ctx.restore();
    } else {
      const stickLen = rp * 11;
      const bx = sx - dir.x * stickLen;
      const by = sy - dir.y * stickLen;
      const sg = ctx.createLinearGradient(sx, sy, bx, by);
      sg.addColorStop(0, '#e8e2d0');
      sg.addColorStop(0.1, '#c98a4a');
      sg.addColorStop(1, '#5a2f18');
      ctx.strokeStyle = sg;
      ctx.lineWidth = rp * 0.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTableFelt(ctx) {
    // Draws head spot and foot spot on the felt surface
    const headPx = this.toPx(25.0, 25.0);
    const footPx = this.toPx(75.0, 25.0);
    const spotR = Math.max(2, this.ballRadiusPx() * 0.18);

    ctx.save();
    // Head Spot
    ctx.beginPath();
    ctx.arc(headPx.x, headPx.y, spotR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 20, 20, 0.6)';
    ctx.fill();

    // Foot Spot
    ctx.beginPath();
    ctx.arc(footPx.x, footPx.y, spotR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 20, 20, 0.6)';
    ctx.fill();

    // Subtle Head String line
    const pTopHead = this.toPx(25.0, 50.0);
    const pBotHead = this.toPx(25.0, 0.0);
    ctx.beginPath();
    ctx.moveTo(pTopHead.x, pTopHead.y);
    ctx.lineTo(pBotHead.x, pBotHead.y);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
