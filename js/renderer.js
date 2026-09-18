// ============================================================================
// renderer.js — 2D Canvas Pool Table Renderer Engine.
// Renders 2D table graphics directly onto HTML5 2D Canvas:
// 1. Table Background Layer: './assets/table_futuristic.jpg'
// 2. Dropping Balls Animation Layer
// 3. Ball Shadows Layer: './assets/shadow.svg'
// 4. Ball Sprites Layer: './assets/ball-0.svg' .. './assets/ball-9.svg'
// 5. Aim & Cue Stick Overlay Layer
// ============================================================================

import { TABLE, BALL_COLORS } from './config.js';

const CUE_ID = 0;
const ASSET_DIR = './assets';

// Active dropping ball visual transitions
const droppingBalls = [];

export function queuePocketDropAnimation(ball, pocket) {
  droppingBalls.push({
    ballId: ball.id,
    color: ball.color || BALL_COLORS[ball.id] || "#FFFFFF",
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

    this.ballImgs = {};
    for (let i = 0; i <= 9; i++) {
      this.ballImgs[i] = loadImg(`${ASSET_DIR}/ball-${i}.svg`);
    }
  }

  resize() {
    const cssW = this.canvas.clientWidth || (window.innerWidth * 0.8);
    const cssH = this.canvas.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.cssW = cssW;
    this.cssH = cssH;

    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);

    this._computeTableRect();
  }

  _computeTableRect() {
    const availW = this.cssW;
    const availH = this.cssH;

    // Maintain 2:1 aspect ratio for 100" x 50" WPA playing surface
    let playW = availW;
    let playH = availW / 2;
    if (playH > availH) {
      playH = availH;
      playW = availH * 2;
    }

    const offsetX = (availW - playW) / 2;
    const offsetY = (availH - playH) / 2;

    this.scale = playW / TABLE.width; // pixels per inch
    this.playfieldRect = {
      x: offsetX,
      y: offsetY,
      w: playW,
      h: playH,
    };

    this.tableRect = { ...this.playfieldRect };
    this.playOffset = { x: 0, y: 0 };
    this.playW = this.playfieldRect.w;
    this.playH = this.playfieldRect.h;
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

  draw(balls) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    // 1. WPA Programmatic Table Frame, Sloped Inner Cushions, Pocket Cuts & Ruby Red Diamonds
    this.drawBeveledRails(ctx);
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

    const stickLen = rp * 11;
    const gap = rp * 1.15;
    const sx = p.x - dir.x * gap;
    const sy = p.y - dir.y * gap;
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

  drawBeveledRails(ctx) {
    const pf = this.playfieldRect;
    const p00 = this.toPx(0, 0);
    const p100_50 = this.toPx(100, 50);

    // Cushion depth in pixels (~2.0 inches)
    const cushionPx = 2.0 * this.scale;
    // Outer rail width in pixels (~5.5 inches)
    const railWidthPx = 5.5 * this.scale;

    // Boundary pixel rectangles
    // Felt surface inner bed: [p00.x, p100_50.y, pf.w, pf.h]
    const bedLeft = p00.x;
    const bedRight = p100_50.x;
    const bedTop = p100_50.y;
    const bedBottom = p00.y;

    // Cushion Outer Boundary
    const cushLeft = bedLeft - cushionPx;
    const cushRight = bedRight + cushionPx;
    const cushTop = bedTop - cushionPx;
    const cushBottom = bedBottom + cushionPx;

    // Rail Frame Outer Boundary
    const railLeft = cushLeft - railWidthPx;
    const railRight = cushRight + railWidthPx;
    const railTop = cushTop - railWidthPx;
    const railBottom = cushBottom + railWidthPx;

    ctx.save();

    // 1. HEAVY OUTER WOOD RAIL FRAME (Rich hardwood tone with bevel gradients)
    const woodGrad = ctx.createLinearGradient(railLeft, railTop, railRight, railBottom);
    woodGrad.addColorStop(0, '#2e1c12');
    woodGrad.addColorStop(0.3, '#4a2e1d');
    woodGrad.addColorStop(0.5, '#3a2214');
    woodGrad.addColorStop(0.8, '#4f3220');
    woodGrad.addColorStop(1, '#20120a');

    ctx.fillStyle = woodGrad;
    ctx.beginPath();
    ctx.rect(railLeft, railTop, railRight - railLeft, railBottom - railTop);
    // Cut out inner cushion bed
    ctx.rect(cushLeft, cushTop, cushRight - cushLeft, cushBottom - cushTop);
    ctx.fill('evenodd');

    // Outer Wood Bevel Shadow
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeRect(railLeft, railTop, railRight - railLeft, railBottom - railTop);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeRect(cushLeft, cushTop, cushRight - cushLeft, cushBottom - cushTop);

    // 2. INNER CUSHION / SLOPE (Beach Blond Sand color matching cloth: #c5b294 / #f4ebd0)
    // Render 4 sloped cushion trapezoids (Top, Bottom, Left, Right) leading down to playing bed

    // Bottom Cushion (Y = 0)
    const bCushGrad = ctx.createLinearGradient(0, cushBottom, 0, bedBottom);
    bCushGrad.addColorStop(0, '#a89678');
    bCushGrad.addColorStop(0.4, '#c5b294');
    bCushGrad.addColorStop(1, '#e3d6be');

    ctx.fillStyle = bCushGrad;
    ctx.beginPath();
    ctx.moveTo(cushLeft, cushBottom);
    ctx.lineTo(cushRight, cushBottom);
    ctx.lineTo(bedRight, bedBottom);
    ctx.lineTo(bedLeft, bedBottom);
    ctx.closePath();
    ctx.fill();

    // Top Cushion (Y = 50)
    const tCushGrad = ctx.createLinearGradient(0, cushTop, 0, bedTop);
    tCushGrad.addColorStop(0, '#a89678');
    tCushGrad.addColorStop(0.4, '#c5b294');
    tCushGrad.addColorStop(1, '#e3d6be');

    ctx.fillStyle = tCushGrad;
    ctx.beginPath();
    ctx.moveTo(cushLeft, cushTop);
    ctx.lineTo(cushRight, cushTop);
    ctx.lineTo(bedRight, bedTop);
    ctx.lineTo(bedLeft, bedTop);
    ctx.closePath();
    ctx.fill();

    // Left Cushion (X = 0)
    const lCushGrad = ctx.createLinearGradient(cushLeft, 0, bedLeft, 0);
    lCushGrad.addColorStop(0, '#a89678');
    lCushGrad.addColorStop(0.4, '#c5b294');
    lCushGrad.addColorStop(1, '#e3d6be');

    ctx.fillStyle = lCushGrad;
    ctx.beginPath();
    ctx.moveTo(cushLeft, cushTop);
    ctx.lineTo(cushLeft, cushBottom);
    ctx.lineTo(bedLeft, bedBottom);
    ctx.lineTo(bedLeft, bedTop);
    ctx.closePath();
    ctx.fill();

    // Right Cushion (X = 100)
    const rCushGrad = ctx.createLinearGradient(cushRight, 0, bedRight, 0);
    rCushGrad.addColorStop(0, '#a89678');
    rCushGrad.addColorStop(0.4, '#c5b294');
    rCushGrad.addColorStop(1, '#e3d6be');

    ctx.fillStyle = rCushGrad;
    ctx.beginPath();
    ctx.moveTo(cushRight, cushTop);
    ctx.lineTo(cushRight, cushBottom);
    ctx.lineTo(bedRight, bedBottom);
    ctx.lineTo(bedRight, bedTop);
    ctx.closePath();
    ctx.fill();

    // Cushion Nose Edge Highlight Line & Inner Drop Shadow
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.strokeRect(bedLeft, bedTop, bedRight - bedLeft, bedBottom - bedTop);

    // Inner shadow on playing bed cast by cushion noses
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = cushionPx * 0.8;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.strokeRect(bedLeft, bedTop, bedRight - bedLeft, bedBottom - bedTop);
    ctx.shadowBlur = 0;

    // 3. RECESSED POCKET OUTLETS & DROPS
    // Corner & Side pocket cutouts recessed into rail structure
    const pockets = [
      { id: 'bl', center: { x: 0, y: 0 }, radius: 2.8 * this.scale },
      { id: 'br', center: { x: 100, y: 0 }, radius: 2.8 * this.scale },
      { id: 'tl', center: { x: 0, y: 50 }, radius: 2.8 * this.scale },
      { id: 'tr', center: { x: 100, y: 50 }, radius: 2.8 * this.scale },
      { id: 'bs', center: { x: 50, y: 0 }, radius: 2.5 * this.scale },
      { id: 'ts', center: { x: 50, y: 50 }, radius: 2.5 * this.scale },
    ];

    pockets.forEach((p) => {
      const pPx = this.toPx(p.center.x, p.center.y);
      const pocketGrad = ctx.createRadialGradient(pPx.x, pPx.y, p.radius * 0.2, pPx.x, pPx.y, p.radius);
      pocketGrad.addColorStop(0, '#0a0806');
      pocketGrad.addColorStop(0.7, '#181410');
      pocketGrad.addColorStop(1, '#3a2b20');

      ctx.beginPath();
      ctx.arc(pPx.x, pPx.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = pocketGrad;
      ctx.fill();

      // Pocket Rim Brass / Leather Liner Highlight
      ctx.strokeStyle = '#221912';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });

    // 4. PROGRAMMATICALLY DERIVED RUBY RED DIAMOND INLAYS (18 TOTAL)
    // 3 diamonds per rail segment calculated at linear interpolation fractions (0.25, 0.50, 0.75) strictly between adjacent pocket center points
    const diamondRailSegments = [
      // Bottom Long Rail 1: (0,0) -> (50,0) [canvas Y increases downward]
      { p1: { x: 0, y: 0 }, p2: { x: 50, y: 0 }, offset: { x: 0, y: cushionPx + railWidthPx * 0.5 } },
      // Bottom Long Rail 2: (50,0) -> (100,0)
      { p1: { x: 50, y: 0 }, p2: { x: 100, y: 0 }, offset: { x: 0, y: cushionPx + railWidthPx * 0.5 } },
      // Top Long Rail 1: (0,50) -> (50,50)
      { p1: { x: 0, y: 50 }, p2: { x: 50, y: 50 }, offset: { x: 0, y: -cushionPx - railWidthPx * 0.5 } },
      // Top Long Rail 2: (50,50) -> (100,50)
      { p1: { x: 50, y: 50 }, p2: { x: 100, y: 50 }, offset: { x: 0, y: -cushionPx - railWidthPx * 0.5 } },
      // Left Short Rail: (0,0) -> (0,50)
      { p1: { x: 0, y: 0 }, p2: { x: 0, y: 50 }, offset: { x: -cushionPx - railWidthPx * 0.5, y: 0 } },
      // Right Short Rail: (100,0) -> (100,50)
      { p1: { x: 100, y: 0 }, p2: { x: 100, y: 50 }, offset: { x: cushionPx + railWidthPx * 0.5, y: 0 } },
    ];

    const fractions = [0.25, 0.50, 0.75];
    const diamondSizePx = Math.max(5, Math.round(0.85 * this.scale));

    diamondRailSegments.forEach((segment) => {
      fractions.forEach((f) => {
        const inX = segment.p1.x + f * (segment.p2.x - segment.p1.x);
        const inY = segment.p1.y + f * (segment.p2.y - segment.p1.y);
        const basePx = this.toPx(inX, inY);

        const diaX = basePx.x + segment.offset.x;
        const diaY = basePx.y + segment.offset.y;

        // Draw High-Contrast Ruby Red Diamond Inlay
        ctx.save();
        ctx.translate(diaX, diaY);
        ctx.rotate(Math.PI / 4);

        const diaGrad = ctx.createLinearGradient(-diamondSizePx, -diamondSizePx, diamondSizePx, diamondSizePx);
        diaGrad.addColorStop(0, '#ff4d6d');
        diaGrad.addColorStop(0.5, '#e0115f');
        diaGrad.addColorStop(1, '#800020');

        ctx.fillStyle = diaGrad;
        ctx.beginPath();
        ctx.rect(-diamondSizePx / 2, -diamondSizePx / 2, diamondSizePx, diamondSizePx);
        ctx.fill();

        // Ruby Bevel Rim & Glow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.restore();
      });
    });

    ctx.restore();
  }
}
