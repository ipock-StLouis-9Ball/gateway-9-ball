// ============================================================================
// renderer.js — 2D Canvas Pool Table Renderer Engine.
// Renders 2D layered SVG/PNG table graphics directly onto HTML5 2D Canvas:
// 1. Base Felt Layer: './assets/felt.png' or './assets/felt.svg' (2:1 playing surface)
// 2. Pocket Wells & Cushion Shadows Layer
// 3. Ball Shadows Layer: './assets/shadow.svg'
// 4. Ball Sprites Layer: './assets/ball-0.svg' .. './assets/ball-9.svg'
// 5. Aim & Cue Stick Overlay Layer
// 6. Upper Rail Frame Layer: './assets/pool_table_frame.svg'
// ============================================================================

import { TABLE, BALL_COLORS } from './config.js';

const CUE_ID = 0;
const ASSET_DIR = './assets';

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = settings;

    this.tableRect = { x: 0, y: 0, w: 0, h: 0 };
    this.playOffset = { x: 0, y: 0 };
    this.playW = 0;
    this.playH = 0;
    this.scale = 1;
    this.cssW = 0;
    this.cssH = 0;
    this.aim = null;

    this._initAssets();
    this.resize();
  }

  _initAssets() {
    this.imagesLoaded = 0;

    // Helper to load image cleanly
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

    this.feltImg = loadImg(`${ASSET_DIR}/felt.png`);
    this.frameImg = loadImg(`${ASSET_DIR}/pool_table_frame.svg`);
    this.shadowImg = loadImg(`${ASSET_DIR}/shadow.svg`);
    this.cushionShadowImg = loadImg(`${ASSET_DIR}/cushion-shadow.svg`);
    this.pocketWellImg = loadImg(`${ASSET_DIR}/pocket-well.svg`);

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
    const W = TABLE.width; // 100 inches
    const H = TABLE.height; // 50 inches (2:1 aspect ratio)
    // pool_table_frame.svg viewBox is 1200 x 700 with playfield cutout 1000 x 500 (from 100,100 to 1100,600).
    const outerW = W * (1200 / 1000); // 120 inches
    const outerH = H * (700 / 500);   // 70 inches

    const availW = this.cssW;
    const availH = this.cssH;

    const margin = Math.max(8, Math.min(availW, availH) * 0.025);
    const maxW = availW - margin * 2;
    const maxH = availH - margin * 2;

    const scale = Math.min(maxW / outerW, maxH / outerH);
    const drawFrameW = outerW * scale;
    const drawFrameH = outerH * scale;

    this.scale = scale;
    this.tableRect = {
      x: (availW - drawFrameW) / 2,
      y: (availH - drawFrameH) / 2,
      w: drawFrameW,
      h: drawFrameH,
    };
    // Playing area is offset by 10 inches relative to frame top-left
    this.playOffset = { x: 10 * scale, y: 10 * scale };
    this.playW = W * scale;
    this.playH = H * scale;
  }

  toPx(tx, ty) {
    return {
      x: this.tableRect.x + this.playOffset.x + tx * this.scale,
      y: this.tableRect.y + this.playOffset.y + ty * this.scale,
    };
  }

  pxToIn(px, py) {
    return {
      x: (px - this.tableRect.x - this.playOffset.x) / this.scale,
      y: (py - this.tableRect.y - this.playOffset.y) / this.scale,
    };
  }

  ballRadiusPx() {
    return TABLE.ballRadius * this.scale;
  }

  draw(balls) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    const px = this.tableRect.x + this.playOffset.x;
    const py = this.tableRect.y + this.playOffset.y;

    // 1. Felt playing surface
    if (this.feltImg && this.feltImg.complete && this.feltImg.naturalWidth > 0) {
      ctx.drawImage(this.feltImg, px, py, this.playW, this.playH);
    } else {
      ctx.fillStyle = '#6b1f2b'; // maroon felt fallback
      ctx.fillRect(px, py, this.playW, this.playH);
    }

    // 2. Cushion shadow overlay over felt bed
    if (this.cushionShadowImg && this.cushionShadowImg.complete && this.cushionShadowImg.naturalWidth > 0) {
      ctx.drawImage(this.cushionShadowImg, px, py, this.playW, this.playH);
    }

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

    // 6. Upper Pool Table Frame Overlay
    if (this.frameImg && this.frameImg.complete && this.frameImg.naturalWidth > 0) {
      ctx.drawImage(this.frameImg, this.tableRect.x, this.tableRect.y, this.tableRect.w, this.tableRect.h);
    } else {
      ctx.lineWidth = 12 * this.scale;
      ctx.strokeStyle = '#5c2d16';
      ctx.strokeRect(this.tableRect.x, this.tableRect.y, this.tableRect.w, this.tableRect.h);
    }

    ctx.restore();
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

      if (target) {
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
    } else {
      const lineLen = this.playW * 0.95;
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(p.x + dir.x * rp, p.y + dir.y * rp);
      ctx.lineTo(p.x + dir.x * lineLen, p.y + dir.y * lineLen);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTableFelt() {}
  drawBeveledRails() {}
}
