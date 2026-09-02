// ============================================================================
// renderer.js — 5-Layer Composite Pool Table Renderer.
// Loads high-res layer PNGs: felt.png, shadow.png, ball_template.png, frame.png, ui_sidebar.png.
// Enforces explicit draw order:
// 1. Base Layer: felt.png
// 2. Shadows Layer: shadow.png offset under balls
// 3. Balls Layer: ball_template.png with canvas programmatic tinting and crisp text numbers
// 4. Table Overlay: frame.png aligned over table bounds to mask felt & pocket edges
// 5. UI Sidebar: ui_sidebar.png docked vertically on right 20% column
// ============================================================================

import { TABLE, TABLE_COLORS, BALL_COLORS } from './config.js';

const CUE_ID = 0;
const ASSET_DIR = 'assets';

const ASSETS = {
  felt: `${ASSET_DIR}/felt.png`,
  shadow: `${ASSET_DIR}/shadow.png`,
  ballTemplate: `${ASSET_DIR}/ball_template.png`,
  frame: `${ASSET_DIR}/frame.png`,
  uiSidebar: `${ASSET_DIR}/ui_sidebar.png`,
};

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = settings;
    this.tableRect = { x: 0, y: 0, w: 0, h: 0 };
    this.aim = null;
    this.imgs = {};
    this.ready = false;
    this._ballCache = {};
    this._loadAssets();
  }

  _loadAssets() {
    let remaining = 0;
    const keys = ['felt', 'shadow', 'ballTemplate', 'frame', 'uiSidebar'];
    for (const k of keys) {
      remaining++;
      const img = new Image();
      img.onload = img.onerror = () => {
        remaining--;
        if (remaining === 0) this.ready = true;
      };
      img.src = ASSETS[k];
      this.imgs[k] = img;
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const cssW = rect.width || window.innerWidth;
    const cssH = rect.height || window.innerHeight;
    this.cssW = cssW;
    this.cssH = cssH;

    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    this._computeTableRect();
    this._ballCache = {};
  }

  // Calculate table bounds dynamically within the canvas.
  // Left 80% of canvas is reserved for pool table layout, right 20% for ui_sidebar.png overlay.
  // Playable table cloth area maintains strict legal 2:1 tournament aspect ratio (100x50 inches).
  _computeTableRect() {
    const W = TABLE.width; // 100
    const H = TABLE.height; // 50 (2:1 aspect ratio playing surface)
    const rail = TABLE.railThickness; // 7.5
    const outerW = W + rail * 2; // 115
    const outerH = H + rail * 2; // 65

    const availW = this.cssW * 0.8; // Exactly 80% landscape screen width
    const availH = this.cssH;

    const margin = Math.max(8, Math.min(availW, availH) * 0.025);
    const maxW = availW - margin * 2;
    const maxH = availH - margin * 2;

    const scale = Math.min(maxW / outerW, maxH / outerH);
    const drawW = outerW * scale;
    const drawH = outerH * scale;

    this.scale = scale;
    this.tableRect = {
      x: (availW - drawW) / 2,
      y: (availH - drawH) / 2,
      w: drawW,
      h: drawH,
    };
    this.playOffset = { x: rail * scale, y: rail * scale };
    this.playW = W * scale; // Exactly 2:1 ratio (100 * scale)
    this.playH = H * scale; // (50 * scale)
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

  // Explicit 5-layer draw order:
  // 1. Base Layer: felt.png
  // 2. Shadows Layer: shadow.png offset under active balls
  // 3. Balls Layer: ball_template.png with tinting + numbers
  // 4. Table Overlay: frame.png
  // 5. UI Sidebar: ui_sidebar.png
  draw(balls) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    // Layer 1: Base Layer (felt.png)
    this._drawLayer1Felt();

    // Layer 2: Shadows Layer (shadow.png under active ball coordinates)
    this._drawLayer2Shadows(balls);

    // Layer 3: Balls Layer (ball_template.png tinted with numbers + aim graphic)
    this._drawLayer3Balls(balls);
    if (this.aim) this._drawAim(balls);

    // Layer 4: Table Overlay (frame.png to mask felt edges & hide passing balls)
    this._drawLayer4Frame();

    // Layer 5: UI Sidebar (ui_sidebar.png docked vertically on right 20% column)
    this._drawLayer5UISidebar();
  }

  _drawLayer1Felt() {
    const ctx = this.ctx;
    const px = this.tableRect.x + this.playOffset.x;
    const py = this.tableRect.y + this.playOffset.y;
    const pw = this.playW;
    const ph = this.playH;

    // Background fill for left 80% screen space
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, this.cssW * 0.8, this.cssH);

    const felt = this.imgs.felt;
    if (this.ready && felt && felt.complete && felt.naturalWidth) {
      ctx.drawImage(felt, px, py, pw, ph);
    } else {
      this.drawTableFelt(px, py, pw, ph);
    }
  }

  _drawLayer2Shadows(balls) {
    const ctx = this.ctx;
    const rp = this.ballRadiusPx();
    const shadow = this.imgs.shadow;
    const shadowReady = this.ready && shadow && shadow.complete && shadow.naturalWidth;

    const offsetX = rp * 0.25;
    const offsetY = rp * 0.35;
    const sw = rp * 2.4;
    const sh = rp * 2.4;

    for (const b of balls) {
      if (b.pocketed) continue;
      const p = this.toPx(b.x, b.y);
      if (shadowReady) {
        ctx.drawImage(shadow, p.x - sw / 2 + offsetX, p.y - sh / 2 + offsetY, sw, sh);
      } else {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(p.x + offsetX, p.y + offsetY, rp, rp * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  _drawLayer3Balls(balls) {
    const rp = this.ballRadiusPx();
    for (const b of balls) {
      if (b.pocketed) continue;
      this._drawBallComposite(b, rp);
    }
  }

  _drawBallComposite(b, rp) {
    const ctx = this.ctx;
    const p = this.toPx(b.x, b.y);
    const size = Math.max(16, Math.round(rp * 2));
    const cachedCanvas = this._getBallTextureCanvas(b.id, size);

    if (cachedCanvas) {
      ctx.drawImage(cachedCanvas, p.x - rp, p.y - rp, rp * 2, rp * 2);
    } else {
      const base = b.id === CUE_ID ? '#f7f7f0' : (BALL_COLORS[b.id] || '#fff');
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rp, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _getBallTextureCanvas(id, size) {
    const cacheKey = `${id}_${size}`;
    if (this._ballCache[cacheKey]) return this._ballCache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const template = this.imgs.ballTemplate;
    const hasTemplate = this.ready && template && template.complete && template.naturalWidth;

    const radius = size / 2;
    const color = id === CUE_ID ? '#ffffff' : (BALL_COLORS[id] || '#ffffff');

    if (id === CUE_ID) {
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#f7f7f0';
      ctx.fill();

      if (hasTemplate) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(template, 0, 0, size, size);
        ctx.globalCompositeOperation = 'source-over';
      }
    } else if (id === 9) {
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = color;
      ctx.fillRect(0, size * 0.25, size, size * 0.5);
      ctx.restore();

      if (hasTemplate) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(template, 0, 0, size, size);
        ctx.globalCompositeOperation = 'source-over';
      }

      this._drawBallNumber(ctx, id, size);
    } else {
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (hasTemplate) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(template, 0, 0, size, size);
        ctx.globalCompositeOperation = 'source-over';
      }

      this._drawBallNumber(ctx, id, size);
    }

    this._ballCache[cacheKey] = canvas;
    return canvas;
  }

  _drawBallNumber(ctx, id, size) {
    const cx = size / 2;
    const cy = size / 2;
    const numR = size * 0.26;

    ctx.beginPath();
    ctx.arc(cx, cy, numR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.strokeStyle = '#d0d0d0';
    ctx.stroke();

    ctx.fillStyle = '#111111';
    ctx.font = `bold ${Math.round(size * 0.32)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(id.toString(), cx, cy + size * 0.02);

    if (id === 6 || id === 9) {
      ctx.lineWidth = Math.max(1, size * 0.03);
      ctx.strokeStyle = '#111111';
      ctx.beginPath();
      ctx.moveTo(cx - numR * 0.4, cy + numR * 0.65);
      ctx.lineTo(cx + numR * 0.4, cy + numR * 0.65);
      ctx.stroke();
    }
  }

  _drawLayer4Frame() {
    const ctx = this.ctx;
    const tr = this.tableRect;
    const frame = this.imgs.frame;
    if (this.ready && frame && frame.complete && frame.naturalWidth) {
      ctx.drawImage(frame, tr.x, tr.y, tr.w, tr.h);
    } else {
      this.drawBeveledRails(tr.x + this.playOffset.x, tr.y + this.playOffset.y, this.playW, this.playH, this.playOffset.x);
    }
  }

  _drawLayer5UISidebar() {
    const ctx = this.ctx;
    const sidebarX = this.cssW * 0.8;
    const sidebarW = this.cssW * 0.2;
    const sidebarH = this.cssH;

    const sidebarImg = this.imgs.uiSidebar;
    if (this.ready && sidebarImg && sidebarImg.complete && sidebarImg.naturalWidth) {
      ctx.drawImage(sidebarImg, sidebarX, 0, sidebarW, sidebarH);
    } else {
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(sidebarX, 0, sidebarW, sidebarH);
    }
  }

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

  drawTableFelt(arg1, arg2, arg3, arg4, arg5) {
    const ctx = (arg1 && arg1.fillRect) ? arg1 : this.ctx;
    const x = (arg1 && arg1.fillRect) ? arg2 : arg1;
    const y = (arg1 && arg1.fillRect) ? arg3 : arg2;
    const width = (arg1 && arg1.fillRect) ? arg4 : arg3;
    const height = (arg1 && arg1.fillRect) ? arg5 : arg4;

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const outerRadius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 50,
      centerX, centerY, outerRadius
    );
    gradient.addColorStop(0, '#9e1a32');
    gradient.addColorStop(0.6, '#5c0b1a');
    gradient.addColorStop(1, '#1f0207');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  }

  drawBeveledRails(arg1, arg2, arg3, arg4, arg5, arg6) {
    const ctx = (arg1 && arg1.fillRect) ? arg1 : this.ctx;
    const tableX = (arg1 && arg1.fillRect) ? arg2 : arg1;
    const tableY = (arg1 && arg1.fillRect) ? arg3 : arg2;
    const tableWidth = (arg1 && arg1.fillRect) ? arg4 : arg3;
    const tableHeight = (arg1 && arg1.fillRect) ? arg5 : arg4;
    const railWidth = (arg1 && arg1.fillRect) ? arg6 : arg5;

    ctx.fillStyle = '#2b1108';
    ctx.fillRect(tableX - railWidth, tableY - railWidth, tableWidth + (railWidth * 2), tableHeight + (railWidth * 2));
  }
}
