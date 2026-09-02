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

  // Table fills the canvas area; the side columns (controls + players) are
  // laid out by flexbox outside the canvas, so we use the full rect here.
  _computeTableRect() {
    const W = TABLE.width;
    const H = TABLE.height;
    const rail = TABLE.railThickness;
    const availW = this.cssW - 24;
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
    this.tableRect = {
      x: 12,
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
    const W = TABLE.width;
    const H = TABLE.height;
    const isCherry = this.settings.table === 'maroon';
    const pocketList = [
      [0, 0], [W / 2, 0], [W, 0], [0, H], [W / 2, H], [W, H],
    ];

    ctx.save();

    // --- Outer cherry wood rail with procedural grain ---
    this._roundRect(tr.x, tr.y, tr.w, tr.h, r * 0.8);
    ctx.save();
    ctx.clip();
    const railGrad = ctx.createLinearGradient(tr.x, tr.y, tr.x, tr.y + tr.h);
    railGrad.addColorStop(0, this._lighten(cols.rail, 0.18));
    railGrad.addColorStop(0.5, cols.rail);
    railGrad.addColorStop(1, this._darken(cols.rail, 0.22));
    ctx.fillStyle = railGrad;
    ctx.fillRect(tr.x, tr.y, tr.w, tr.h);
    if (isCherry) this._drawWoodGrain(tr.x, tr.y, tr.w, tr.h, cols.rail);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(tr.x, tr.y, tr.w, r * 0.35);
    ctx.restore();

    // --- Polished metallic pocket plates (cast into the rail) ---
    for (const [tx, ty] of pocketList) this._drawPocketPlate(tx, ty, cols);

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
    this._drawFeltNap(px, py, pw, ph);

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

    // --- K-66 cushion nose bevels, broken at pocket mouths (recessed facings) ---
    this._drawCushions(cols);

    // Diamond sight markers on rails.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
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
    mark(0, H / 2, { x: -r * 0.55, y: 0 });
    mark(W, H / 2, { x: r * 0.55, y: 0 });

    // --- Recessed pocket drop-holes cut into the rail ---
    for (const [tx, ty] of pocketList) this._drawPocketHole(tx, ty, cols);

    ctx.restore();
  }

  // Procedural cherry wood grain: layered translucent streaks along the rail.
  _drawWoodGrain(x, y, w, h, baseHex) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.16;
    const dark = this._darken(baseHex, 0.5);
    const light = this._lighten(baseHex, 0.25);
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const streaks = Math.max(10, Math.floor(w / 14));
    for (let i = 0; i < streaks; i++) {
      const t = i / streaks;
      const yy = y + t * h + (rand() - 0.5) * h * 0.12;
      const wob = (rand() - 0.5) * 3;
      ctx.strokeStyle = rand() > 0.5 ? dark : light;
      ctx.lineWidth = 0.6 + rand() * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.bezierCurveTo(x + w * 0.3, yy + wob * 4, x + w * 0.7, yy - wob * 4, x + w, yy + wob);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Subtle felt nap: very light diagonal hatch, barely visible.
  _drawFeltNap(x, y, w, h) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    const step = 6;
    ctx.beginPath();
    for (let d = -h; d < w; d += step) {
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d + h, y + h);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Polished metallic pocket plate (ring) beneath the rail opening.
  _drawPocketPlate(tx, ty, cols) {
    const ctx = this.ctx;
    const p = this.toPx(tx, ty);
    const pr = TABLE.pocketRadius * this.scale;
    const plateR = pr * 1.55;
    const grad = ctx.createLinearGradient(p.x - plateR, p.y - plateR, p.x + plateR, p.y + plateR);
    grad.addColorStop(0, '#e8dcb8');
    grad.addColorStop(0.35, '#8a7748');
    grad.addColorStop(0.5, '#f0e6c8');
    grad.addColorStop(0.7, '#7a6838');
    grad.addColorStop(1, '#d8caa0');
    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, plateR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // K-66 cushion nose bevels (141deg nose), broken at pocket mouths to form
  // the 142deg corner / 103deg side facing cuts. Purely visual — physics
  // coordinates/collision are unchanged.
  _drawCushions(cols) {
    const ctx = this.ctx;
    const W = TABLE.width;
    const H = TABLE.height;
    const cushionColor = cols.cushion || this._darken(cols.felt, 0.15);
    const noseDepth = TABLE.railThickness * 0.34 * this.scale;
    const facing = TABLE.pocketRadius * 0.55 * this.scale;

    const drawWall = (isHorizontal, fixed, gaps) => {
      ctx.save();
      const a = this.toPx(0, fixed);
      const grad = isHorizontal
        ? ctx.createLinearGradient(0, a.y - noseDepth, 0, a.y + noseDepth)
        : ctx.createLinearGradient(a.x - noseDepth, 0, a.x + noseDepth, 0);
      grad.addColorStop(0, this._lighten(cushionColor, 0.15));
      grad.addColorStop(0.5, cushionColor);
      grad.addColorStop(1, this._darken(cushionColor, 0.3));
      ctx.fillStyle = grad;

      const end = isHorizontal ? W : H;
      let cursor = 0;
      const segs = [];
      for (const [lo, hi] of gaps) {
        if (lo > cursor) segs.push([cursor, lo]);
        cursor = Math.max(cursor, hi);
      }
      if (cursor < end) segs.push([cursor, end]);

      for (const [s0, s1] of segs) {
        ctx.beginPath();
        if (isHorizontal) {
          const pa = this.toPx(s0, fixed);
          const pb = this.toPx(s1, fixed);
          const dir = fixed === 0 ? 1 : -1;
          const f0 = s0 === 0 ? 0 : facing * 0.5;
          const f1 = s1 === end ? 0 : facing * 0.5;
          ctx.moveTo(pa.x + f0, pa.y);
          ctx.lineTo(pb.x - f1, pb.y);
          ctx.lineTo(pb.x - f1 - facing * 0.35, pb.y + noseDepth * dir);
          ctx.lineTo(pa.x + f0 + facing * 0.35, pa.y + noseDepth * dir);
        } else {
          const pa = this.toPx(fixed, s0);
          const pb = this.toPx(fixed, s1);
          const dir = fixed === 0 ? 1 : -1;
          const f0 = s0 === 0 ? 0 : facing * 0.5;
          const f1 = s1 === end ? 0 : facing * 0.5;
          ctx.moveTo(pa.x, pa.y + f0);
          ctx.lineTo(pb.x, pb.y - f1);
          ctx.lineTo(pb.x + noseDepth * dir, pb.y - f1 - facing * 0.35);
          ctx.lineTo(pa.x + noseDepth * dir, pa.y + f0 + facing * 0.35);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    drawWall(true, 0, this.gapsFor('top'));
    drawWall(true, H, this.gapsFor('bottom'));
    drawWall(false, 0, this.gapsFor('left'));
    drawWall(false, W, this.gapsFor('right'));
  }

  gapsFor(wall) {
    const W = TABLE.width, H = TABLE.height;
    const mw = TABLE.pocketRadius * 0.92;
    if (wall === 'top' || wall === 'bottom') return [[0, mw], [W / 2 - mw, W / 2 + mw], [W - mw, W]];
    return [[0, mw], [H - mw, H]];
  }

  // Recessed drop-hole cut directly into the rail/cushion corner.
  _drawPocketHole(tx, ty, cols) {
    const ctx = this.ctx;
    const p = this.toPx(tx, ty);
    const pr = TABLE.pocketRadius * this.scale;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr);
    g.addColorStop(0, '#000');
    g.addColorStop(0.65, '#000');
    g.addColorStop(0.85, this._darken(cols.felt, 0.5));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = Math.max(1, pr * 0.08);
    ctx.beginPath();
    ctx.arc(p.x, p.y, pr * 0.98, -2.4, -0.7);
    ctx.stroke();
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
      // Post-contact deflection: short path (~2.5-3 ball diameters) showing
      // the object ball's post-collision direction (along the impact normal).
      if (this.aim.target) {
        const tp = this.toPx(this.aim.target.x, this.aim.target.y);
        const defLen = rp * 5.5; // ~2.75 ball diameters (d=2rp)
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = 'rgba(120,255,170,0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tp.x, tp.y);
        ctx.lineTo(tp.x + Math.cos(ang) * defLen, tp.y + Math.sin(ang) * defLen);
        ctx.stroke();
      }
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
