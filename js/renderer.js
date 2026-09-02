// ============================================================================
// renderer.js — Texture-composited 2D top-down pool table.
// Loads pre-rendered high-res sprite/texture PNGs (felt, cherry wood rail,
// pocket wells, metal plates, shaded ball sprites, drop shadows) and composites
// them with layered drop-shadow overlays for a polished, grounded look.
// Canvas is a compositor + dynamic aim/ball positions only — no crude
// procedural per-pixel drawing at runtime.
// ============================================================================

import { TABLE, TABLE_COLORS, BALL_COLORS } from './config.js';

const CUE_ID = 0;
const ASSET_DIR = 'assets';

const ASSETS = {
  felt: `${ASSET_DIR}/felt.png`,
  wood: `${ASSET_DIR}/rail-wood.png`,
  well: `${ASSET_DIR}/pocket-well.png`,
  plate: `${ASSET_DIR}/pocket-plate.png`,
  ballShadow: `${ASSET_DIR}/ball-shadow.png`,
  cushionShadow: `${ASSET_DIR}/cushion-shadow.png`,
  balls: { 0: `${ASSET_DIR}/ball-0.png`, 1: `${ASSET_DIR}/ball-1.png`, 2: `${ASSET_DIR}/ball-2.png`, 3: `${ASSET_DIR}/ball-3.png`, 4: `${ASSET_DIR}/ball-4.png`, 5: `${ASSET_DIR}/ball-5.png`, 6: `${ASSET_DIR}/ball-6.png`, 7: `${ASSET_DIR}/ball-7.png`, 8: `${ASSET_DIR}/ball-8.png`, 9: `${ASSET_DIR}/ball-9.png` },
};

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = settings; // {table, cue, balls}
    this.tableRect = { x: 0, y: 0, w: 0, h: 0 };
    this.aim = null; // {angle, power, ghost, target}
    this.placeCue = null;
    this.imgs = {};
    this.ready = false;
    this._woodPattern = null;
    this._loadAssets();
  }

  _loadAssets() {
    let remaining = 0;
    const keys = ['felt', 'wood', 'well', 'plate', 'ballShadow', 'cushionShadow'];
    for (const k of keys) {
      remaining++;
      const img = new Image();
      img.onload = img.onerror = () => { remaining--; if (remaining === 0) this.ready = true; };
      img.src = ASSETS[k];
      this.imgs[k] = img;
    }
    for (let i = 0; i <= 9; i++) {
      remaining++;
      const img = new Image();
      img.onload = img.onerror = () => { remaining--; if (remaining === 0) this.ready = true; };
      img.src = ASSETS.balls[i];
      this.imgs['ball' + i] = img;
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.cssW = rect.width;
    this.cssH = rect.height;
    this._computeTableRect();
    this._woodPattern = null; // rebuild pattern at new scale
  }

  // Table fills the left 80% of canvas (right 20% is controls overlay).
  _computeTableRect() {
    const W = TABLE.width;
    const H = TABLE.height;
    const rail = TABLE.railThickness;
    const tableAspect = (W + rail * 2) / (H + rail * 2);
    const availW = this.cssW * 0.8;
    const availH = this.cssH;
    let drawW = availW;
    let drawH = drawW / tableAspect;
    if (drawH > availH) {
      drawH = availH;
      drawW = drawH * tableAspect;
    }
    const scale = drawW / (W + rail * 2);
    this.scale = scale;
    this.tableRect = {
      x: (availW - drawW) / 2,
      y: (availH - drawH) / 2,
      w: drawW,
      h: drawH,
    };
    this.playOffset = { x: rail * scale, y: rail * scale };
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
  ballRadiusPx() { return TABLE.ballRadius * this.scale; }

  _tableColors() { return TABLE_COLORS[this.settings.table] || TABLE_COLORS.maroon; }

  draw(balls) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    // Rich cherry-wood background gradient behind table area (left 80%)
    const bg = ctx.createLinearGradient(0, 0, 0, this.cssH);
    bg.addColorStop(0, '#96562e');
    bg.addColorStop(0.5, '#6e3c20');
    bg.addColorStop(1, '#4a2814');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.cssW * 0.8, this.cssH);

    this._drawTable();
    this._drawBalls(balls);
    if (this.aim) this._drawAim(balls);
  }

  _drawTable() {
    const ctx = this.ctx;
    const tr = this.tableRect;
    const cols = this._tableColors();
    const W = TABLE.width;
    const H = TABLE.height;
    const r = TABLE.railThickness * this.scale;
    const pockets = [[0,0],[W/2,0],[W,0],[0,H],[W/2,H],[W,H]];
    // Playfield rect (inside the rails) — computed early, used by several layers.
    const px = tr.x + this.playOffset.x;
    const py = tr.y + this.playOffset.y;
    const pw = this.playW;
    const ph = this.playH;

    // 1. Table drop shadow (soft, grounded depth).
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 10;
    this._roundRect(tr.x, tr.y, tr.w, tr.h, r * 0.5);
    ctx.fillStyle = cols.rail;
    ctx.fill();
    ctx.restore();

    // 2. Cherry wood rail (texture stretched to fill the table rect = rails).
    const wood = this.imgs.wood;
    if (this.ready && wood && wood.complete && wood.naturalWidth) {
      ctx.save();
      this._roundRect(tr.x, tr.y, tr.w, tr.h, r * 0.5);
      ctx.clip();
      ctx.drawImage(wood, tr.x, tr.y, tr.w, tr.h);
      ctx.restore();
    } else {
      ctx.fillStyle = cols.rail;
      this._roundRect(tr.x, tr.y, tr.w, tr.h, r * 0.5);
      ctx.fill();
    }

    // Metallic gold inlay trim around inner rail edge
    ctx.save();
    ctx.strokeStyle = 'rgba(232, 183, 90, 0.45)';
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.strokeRect(px - r * 0.1, py - r * 0.1, pw + r * 0.2, ph + r * 0.2);
    ctx.restore();

    // 3. Metallic pocket plates (under the rail edge, around each pocket).
    if (this.ready && this.imgs.plate && this.imgs.plate.complete) {
      const pr = TABLE.pocketRadius * this.scale;
      const plateR = pr * 1.7;
      for (const [tx, ty] of pockets) {
        const p = this.toPx(tx, ty);
        ctx.drawImage(this.imgs.plate, p.x - plateR, p.y - plateR, plateR * 2, plateR * 2);
      }
    }

    // 4. Felt playfield (texture stretched to the 2:1 playfield rect).
    const felt = this.imgs.felt;
    if (this.ready && felt && felt.complete && felt.naturalWidth) {
      ctx.drawImage(felt, px, py, pw, ph);
    } else {
      const cx = px + pw / 2, cy = py + ph / 2;
      const g = ctx.createRadialGradient(cx, cy, Math.min(pw, ph) * 0.1, cx, cy, Math.max(pw, ph) * 0.7);
      g.addColorStop(0, this._lighten(cols.felt, 0.12));
      g.addColorStop(0.6, cols.felt);
      g.addColorStop(1, this._darken(cols.felt, 0.28));
      ctx.fillStyle = g;
      ctx.fillRect(px, py, pw, ph);
    }

    // 5. Cushion inner-edge drop shadow (grounds the cushions on the felt).
    if (this.ready && this.imgs.cushionShadow && this.imgs.cushionShadow.complete) {
      const cs = this.imgs.cushionShadow;
      const sw = r * 0.9;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
      // top
      ctx.drawImage(cs, px, py, pw, sw);
      // bottom (flipped)
      ctx.save();
      ctx.translate(0, py + ph);
      ctx.scale(1, -1);
      ctx.drawImage(cs, px, 0, pw, sw);
      ctx.restore();
      // left (rotated)
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(cs, 0, 0, ph, sw);
      ctx.restore();
      // right
      ctx.save();
      ctx.translate(px + pw, py + ph);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(cs, 0, 0, ph, sw);
      ctx.restore();
      ctx.restore();
    }

    // 6. K-66 cushion nose bevels (vector trapezoids, broken at pocket mouths).
    this._drawCushions(cols);

    // 7. Diamond sight markers on rails.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
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

    // 8. Recessed pocket drop-holes (dark wells) on top of felt/cushion.
    if (this.ready && this.imgs.well && this.imgs.well.complete) {
      const pr = TABLE.pocketRadius * this.scale;
      const wellR = pr * 1.05;
      for (const [tx, ty] of pockets) {
        const p = this.toPx(tx, ty);
        ctx.drawImage(this.imgs.well, p.x - wellR, p.y - wellR, wellR * 2, wellR * 2);
      }
    }
  }

  // K-66 cushion nose bevels (141deg nose), broken at pocket mouths to form
  // the recessed facing cuts. Vector trapezoids with a cushion-cloth gradient.
  _drawCushions(cols) {
    const ctx = this.ctx;
    const W = TABLE.width;
    const H = TABLE.height;
    const cushionColor = cols.cushion || this._darken(cols.felt, 0.15);
    const noseDepth = TABLE.railThickness * 0.55 * this.scale;
    const facing = TABLE.pocketRadius * 0.5 * this.scale;

    const drawWall = (isHorizontal, fixed, gaps) => {
      ctx.save();
      const a = this.toPx(0, fixed);
      const grad = isHorizontal
        ? ctx.createLinearGradient(0, a.y - noseDepth, 0, a.y + noseDepth)
        : ctx.createLinearGradient(a.x - noseDepth, 0, a.x + noseDepth, 0);
      grad.addColorStop(0, this._lighten(cushionColor, 0.12));
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
          ctx.lineTo(pb.x - f1 - facing * 0.3, pb.y + noseDepth * dir);
          ctx.lineTo(pa.x + f0 + facing * 0.3, pa.y + noseDepth * dir);
        } else {
          const pa = this.toPx(fixed, s0);
          const pb = this.toPx(fixed, s1);
          const dir = fixed === 0 ? 1 : -1;
          const f0 = s0 === 0 ? 0 : facing * 0.5;
          const f1 = s1 === end ? 0 : facing * 0.5;
          ctx.moveTo(pa.x, pa.y + f0);
          ctx.lineTo(pb.x, pb.y - f1);
          ctx.lineTo(pb.x + noseDepth * dir, pb.y - f1 - facing * 0.3);
          ctx.lineTo(pa.x + noseDepth * dir, pa.y + f0 + facing * 0.3);
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

  _drawBalls(balls) {
    const ctx = this.ctx;
    const rp = this.ballRadiusPx();
    const shadow = this.imgs.ballShadow;
    const shadowReady = this.ready && shadow && shadow.complete;
    // Drop shadows first (grounded depth under every live ball).
    for (const b of balls) {
      if (b.pocketed) continue;
      const p = this.toPx(b.x, b.y);
      if (shadowReady) {
        const sw = rp * 2.1, sh = rp * 1.0;
        ctx.drawImage(shadow, p.x - sw / 2 + rp * 0.15, p.y - sh / 2 + rp * 0.25, sw, sh);
      } else {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(p.x + rp * 0.18, p.y + rp * 0.22, rp * 0.95, rp * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    // Ball sprites.
    for (const b of balls) {
      if (b.pocketed) continue;
      this._drawBall(b, rp);
    }
  }

  _drawBall(b, rp) {
    const ctx = this.ctx;
    const p = this.toPx(b.x, b.y);
    const img = this.imgs['ball' + b.id];
    if (this.ready && img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, p.x - rp, p.y - rp, rp * 2, rp * 2);
    } else {
      // High-grade 3D sphere fallback with multi-stop radial gradient
      const base = b.id === CUE_ID ? '#f7f7f0' : (BALL_COLORS[b.id] || '#fff');
      const g = ctx.createRadialGradient(p.x - rp * 0.35, p.y - rp * 0.35, rp * 0.1, p.x, p.y, rp);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, this._lighten(base, 0.35));
      g.addColorStop(0.75, base);
      g.addColorStop(1, this._darken(base, 0.45));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rp, 0, Math.PI * 2);
      ctx.fill();
    }

    // Realistic 3D glossy specular lighting highlight overlay on all balls
    ctx.save();
    const hl = ctx.createRadialGradient(
      p.x - rp * 0.3, p.y - rp * 0.35, rp * 0.05,
      p.x - rp * 0.15, p.y - rp * 0.15, rp * 0.75
    );
    hl.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    hl.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
    hl.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rp, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Clean 2D vector aim with true tangent-line physics:
  //  - direct cue→ghost line
  //  - object-ball deflection along the collision normal n = (target - ghost)
  //  - cue-ball carom along the tangent t = dir - (dir·n)n
  _drawAim(balls) {
    const ctx = this.ctx;
    const cue = balls.find((b) => b.id === CUE_ID && !b.pocketed);
    if (!cue) return;
    const rp = this.ballRadiusPx();
    const p = this.toPx(cue.x, cue.y);
    const ang = this.aim.angle;
    const dir = { x: Math.cos(ang), y: Math.sin(ang) };
    const ghost = this.aim.ghost;
    const target = this.aim.target;

    ctx.save();

    // Cue stick graphic behind the cue ball (opposite the aim direction).
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
      // Direct cue→ghost aim line (crisp dashed vector).
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(p.x + dir.x * rp, p.y + dir.y * rp);
      ctx.lineTo(gp.x, gp.y);
      ctx.stroke();

      // Ghost ball (contact position) ring.
      ctx.setLineDash([]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, rp, 0, Math.PI * 2);
      ctx.stroke();

      // True tangent-line deflection physics.
      if (target) {
        const nx = target.x - ghost.x;
        const ny = target.y - ghost.y;
        const nlen = Math.hypot(nx, ny) || 1;
        const nxn = nx / nlen, nyn = ny / nlen;
        // Object-ball deflection along the collision normal (~3 ball diameters).
        const defLen = rp * 6;
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(120,255,170,0.85)';
        const tp = this.toPx(target.x, target.y);
        ctx.beginPath();
        ctx.moveTo(tp.x, tp.y);
        ctx.lineTo(tp.x + nxn * defLen, tp.y + nyn * defLen);
        ctx.stroke();
        // Cue-ball carom along the tangent t = dir - (dir·n)n (skip if ~0).
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
      // No object ball in the way: long aim line to the rail.
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
