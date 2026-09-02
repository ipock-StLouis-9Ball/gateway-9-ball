// ============================================================================
// renderer.js — Canvas drawing: shaded table, 3D-shaded balls with drop
// shadows, cue stick, aim line + ghost ball, and pocket depth.
// Table-space (inches) is mapped to canvas pixels via a tableRect.
// ============================================================================

import { TABLE, TABLE_COLORS, BALL_COLORS, BALL_SKINS, CUE_STICKS } from './config.js';

const CUE_ID = 0;

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = settings; // {table, cue, balls}
    this.tableRect = { x: 0, y: 0, w: 0, h: 0 };
    this.aim = null; // {angle, power, ghost:{x,y}} or null
    this.placeCue = null; // {x,y} ball-in-hand placement target
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssW = rect.width;
    this.cssH = rect.height;
    this._computeTableRect();
  }

  // Table is shifted up-left, leaving the right strip for the HUD panel.
  _computeTableRect() {
    const W = TABLE.width;
    const H = TABLE.height;
    const rail = TABLE.railThickness;
    // Available area: left ~72% of canvas width, full height minus margins.
    const availW = this.cssW * 0.72;
    const availH = this.cssH - 24;
    const aspect = (W + rail * 2) / (H + rail * 2);
    let drawW = availW;
    let drawH = drawW / aspect;
    if (drawH > availH) {
      drawH = availH;
      drawW = drawH * aspect;
    }
    const scale = drawW / (W + rail * 2);
    this.scale = scale;
    // Shift up & left: small margin from top-left corner.
    this.tableRect = {
      x: 16,
      y: 12,
      w: drawW,
      h: drawH,
    };
    this.playOffset = { x: rail * scale, y: rail * scale };
    this.playW = W * scale;
    this.playH = H * scale;
  }

  // table-space (inches) -> canvas pixels
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
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    this._drawTable();
    this._drawBalls(balls);
    if (this.aim) this._drawAim(balls);
  }

  _tableColors() {
    return TABLE_COLORS[this.settings.table] || TABLE_COLORS.classic;
  }
  _ballColor(id) {
    const skin = BALL_SKINS[this.settings.balls] || BALL_SKINS.classic;
    return skin.colors[id] || '#fff';
  }

  _drawTable() {
    const ctx = this.ctx;
    const tr = this.tableRect;
    const cols = this._tableColors();
    const r = TABLE.railThickness * this.scale;

    // Outer wood rail with bevel.
    ctx.save();
    const railGrad = ctx.createLinearGradient(tr.x, tr.y, tr.x, tr.y + tr.h);
    railGrad.addColorStop(0, cols.railEdge);
    railGrad.addColorStop(0.5, cols.rail);
    railGrad.addColorStop(1, cols.railEdge);
    ctx.fillStyle = railGrad;
    this._roundRect(tr.x, tr.y, tr.w, tr.h, r * 0.8);
    ctx.fill();

    // Rail highlight (top edge sheen).
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    this._roundRect(tr.x + 2, tr.y + 2, tr.w - 4, r * 0.4, r * 0.4);
    ctx.fill();

    // Felt playfield with radial shading (lighter center, darker edges).
    const px = tr.x + this.playOffset.x;
    const py = tr.y + this.playOffset.y;
    const pw = this.playW;
    const ph = this.playH;
    const cx = px + pw / 2;
    const cy = py + ph / 2;
    const feltGrad = ctx.createRadialGradient(cx, cy, Math.min(pw, ph) * 0.1, cx, cy, Math.max(pw, ph) * 0.7);
    feltGrad.addColorStop(0, this._lighten(cols.felt, 0.12));
    feltGrad.addColorStop(0.6, cols.felt);
    feltGrad.addColorStop(1, this._darken(cols.felt, 0.28));
    ctx.fillStyle = feltGrad;
    ctx.fillRect(px, py, pw, ph);

    // Inner cushion edge shadow (vignette inside the playfield).
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    const vig = ctx.createRadialGradient(cx, cy, Math.min(pw, ph) * 0.3, cx, cy, Math.max(pw, ph) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vig;
    ctx.fillRect(px, py, pw, ph);
    ctx.restore();

    // Diamond sight markers on rails.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const W = TABLE.width;
    const H = TABLE.height;
    const mark = (tx, ty, off) => {
      const p = this.toPx(tx, ty);
      ctx.beginPath();
      ctx.arc(p.x + off.x, p.y + off.y, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    };
    for (let i = 1; i <= 3; i++) {
      const tx = (W / 4) * i;
      mark(tx, 0, { x: 0, y: -r * 0.55 });
      mark(tx, H, { x: 0, y: r * 0.55 });
    }
    for (let i = 1; i <= 1; i++) {
      mark(0, H / 2, { x: -r * 0.55, y: 0 });
      mark(W, H / 2, { x: r * 0.55, y: 0 });
    }

    // Pockets (dark wells with inner shadow).
    const pockets = [
      [0, 0], [W / 2, 0], [W, 0], [0, H], [W / 2, H], [W, H],
    ];
    const pr = TABLE.pocketRadius * this.scale;
    for (const [tx, ty] of pockets) {
      const p = this.toPx(tx, ty);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr);
      g.addColorStop(0, '#000');
      g.addColorStop(0.7, '#000');
      g.addColorStop(1, this._darken(cols.felt, 0.4));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawBalls(balls) {
    const ctx = this.ctx;
    const rp = this.ballRadiusPx();
    // Draw shadows first for all live balls.
    for (const b of balls) {
      if (b.pocketed) continue;
      const p = this.toPx(b.x, b.y);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(p.x + rp * 0.18, p.y + rp * 0.22, rp * 0.95, rp * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Draw balls.
    for (const b of balls) {
      if (b.pocketed) continue;
      this._drawBall(b, rp);
    }
  }

  _drawBall(b, rp) {
    const ctx = this.ctx;
    const p = this.toPx(b.x, b.y);
    const isCue = b.id === CUE_ID;
    const base = isCue ? '#f7f7f0' : this._ballColor(b.id);
    const isStripe = b.id === 9; // 9-ball is a stripe

    ctx.save();
    // Sphere shading: highlight upper-left, dark lower-right.
    const hl = { x: p.x - rp * 0.35, y: p.y - rp * 0.35 };
    const grad = ctx.createRadialGradient(hl.x, hl.y, rp * 0.1, p.x, p.y, rp);
    grad.addColorStop(0, this._lighten(base, 0.45));
    grad.addColorStop(0.45, base);
    grad.addColorStop(1, this._darken(base, 0.4));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rp, 0, Math.PI * 2);
    ctx.fill();

    if (isStripe) {
      // White stripe band across the middle.
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, rp, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#f7f7f0';
      ctx.fillRect(p.x - rp, p.y - rp * 0.42, rp * 2, rp * 0.84);
      ctx.restore();
    }

    // Number circle.
    if (!isCue) {
      ctx.fillStyle = '#f7f7f0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, rp * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.font = `700 ${Math.max(7, rp * 0.62)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(b.id), p.x, p.y + 1);
    }

    // Glossy highlight.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(p.x - rp * 0.32, p.y - rp * 0.32, rp * 0.32, rp * 0.2, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawAim(balls) {
    const ctx = this.ctx;
    const cue = balls.find((b) => b.id === CUE_ID && !b.pocketed);
    if (!cue) return;
    const rp = this.ballRadiusPx();
    const p = this.toPx(cue.x, cue.y);
    const ang = this.aim.angle;
    const cueColors = CUE_STICKS[this.settings.cue] || CUE_STICKS.maple;

    // Aim line + ghost ball prediction.
    const ghost = this.aim.ghost; // table-space or null
    const lineLen = this.playW * 0.9;
    const ex = p.x + Math.cos(ang) * lineLen;
    const ey = p.y + Math.sin(ang) * lineLen;

    ctx.save();
    // Cue stick (behind the cue ball, opposite the aim direction).
    const stickLen = rp * 12;
    const sx = p.x - Math.cos(ang) * (rp + rp * 0.4);
    const sy = p.y - Math.sin(ang) * (rp + rp * 0.4);
    const bx = sx - Math.cos(ang) * stickLen;
    const by = sy - Math.sin(ang) * stickLen;
    const stickGrad = ctx.createLinearGradient(sx, sy, bx, by);
    stickGrad.addColorStop(0, cueColors.tip);
    stickGrad.addColorStop(0.12, cueColors.shaft);
    stickGrad.addColorStop(1, this._darken(cueColors.shaft, 0.35));
    ctx.strokeStyle = stickGrad;
    ctx.lineWidth = rp * 0.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // Aim guide line.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(ang) * rp, p.y + Math.sin(ang) * rp);
    if (ghost) {
      const gp = this.toPx(ghost.x, ghost.y);
      ctx.lineTo(gp.x, gp.y);
      // Ghost ball.
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, rp, 0, Math.PI * 2);
      ctx.stroke();
      // Post-contact projection.
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(120,255,170,0.5)';
      ctx.beginPath();
      ctx.moveTo(gp.x, gp.y);
      ctx.lineTo(gp.x + Math.cos(ang) * rp * 6, gp.y + Math.sin(ang) * rp * 6);
      ctx.stroke();
    } else {
      ctx.lineTo(ex, ey);
    }
    ctx.restore();
  }

  // --- helpers ---
  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  _hex(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  _lighten(hex, amt) {
    const [r, g, b] = this._hex(hex);
    return `rgb(${Math.min(255, r + (255 - r) * amt) | 0},${Math.min(255, g + (255 - g) * amt) | 0},${Math.min(255, b + (255 - b) * amt) | 0})`;
  }
  _darken(hex, amt) {
    const [r, g, b] = this._hex(hex);
    return `rgb(${(r * (1 - amt)) | 0},${(g * (1 - amt)) | 0},${(b * (1 - amt)) | 0})`;
  }
}
