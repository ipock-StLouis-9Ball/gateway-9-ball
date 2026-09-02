// ============================================================================
// renderer.js — Orthographic Babylon.js Pool Table Renderer Engine.
// Enforces hardcoded 80vw viewport layout and 2:1 ratio plane layers:
// 1. Base Felt Plane: 'assets/felt.svg' (2:1 playing surface)
// 2. Shadows Plane Layer: 'assets/shadow.svg' under active balls
// 3. Balls Plane Layer: Composite textured ball meshes with numbers & templates
// 4. Aim Overlay Plane Layer: Guide lines & cue stick graphic
// 5. Upper Rail Plane: 'assets/frame.svg' layered over table with alpha blending
// ============================================================================

import { TABLE, BALL_COLORS } from './config.js';

const CUE_ID = 0;
const ASSET_DIR = 'assets';

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;

    this.tableRect = { x: 0, y: 0, w: 0, h: 0 };
    this.playOffset = { x: 0, y: 0 };
    this.playW = 0;
    this.playH = 0;
    this.scale = 1;
    this.cssW = 0;
    this.cssH = 0;
    this.aim = null;

    // Load ball template image for composite rendering
    this.ballTemplateImg = new Image();
    this.ballTemplateLoaded = false;
    this.ballTemplateImg.onload = () => {
      this.ballTemplateLoaded = true;
      this._rebuildBallMaterials();
    };
    this.ballTemplateImg.src = `${ASSET_DIR}/ball_template.svg`;

    this._initBabylon();
    this.resize();
  }

  _initBabylon() {
    // 1. Create Babylon Engine & Scene attached to the 80vw canvas
    this.engine = new BABYLON.Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    // Light
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), this.scene);
    light.intensity = 1.0;

    // 2. Fixed top-down OrthographicCamera positioned overhead looking straight down
    this.camera = new BABYLON.TargetCamera('OrthographicCamera', new BABYLON.Vector3(0, 100, 0), this.scene);
    this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    this.camera.upVector = new BABYLON.Vector3(0, 0, -1); // +Z is down on screen, matching 2D canvas Y
    this.camera.setTarget(new BABYLON.Vector3(0, 0, 0));
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;

    // 3. Build plane layers
    this._createPlanes();
    this._createBallAndShadowMeshes();
  }

  _createPlanes() {
    // Layer 1: Base Felt Plane (2:1 aspect ratio playing surface)
    this.feltPlane = BABYLON.MeshBuilder.CreatePlane('feltPlane', { width: 1, height: 1 }, this.scene);
    this.feltPlane.rotation.x = Math.PI / 2;
    this.feltPlane.position.y = 0;

    const feltMat = new BABYLON.StandardMaterial('feltMat', this.scene);
    const feltTex = new BABYLON.Texture(`${ASSET_DIR}/felt.svg`, this.scene);
    feltMat.diffuseTexture = feltTex;
    feltMat.emissiveTexture = feltTex;
    feltMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    feltMat.disableLighting = true;
    feltMat.backFaceCulling = false;
    this.feltPlane.material = feltMat;

    // Layer 4: Upper Rail Plane (frame overlay layered directly over felt and balls)
    this.framePlane = BABYLON.MeshBuilder.CreatePlane('framePlane', { width: 1, height: 1 }, this.scene);
    this.framePlane.rotation.x = Math.PI / 2;
    this.framePlane.position.y = 2.0;

    const frameMat = new BABYLON.StandardMaterial('frameMat', this.scene);
    const frameTex = new BABYLON.Texture(`${ASSET_DIR}/pool_table_frame.svg`, this.scene);
    frameTex.hasAlpha = true;
    frameMat.diffuseTexture = frameTex;
    frameMat.emissiveTexture = frameTex;
    frameMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    frameMat.useAlphaFromDiffuseTexture = true;
    frameMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    frameMat.disableLighting = true;
    frameMat.backFaceCulling = false;
    this.framePlane.material = frameMat;

    // Layer 5: Aim Overlay Plane Layer (renders cue stick & vector guides)
    this.aimPlane = BABYLON.MeshBuilder.CreatePlane('aimPlane', { width: 1, height: 1 }, this.scene);
    this.aimPlane.rotation.x = Math.PI / 2;
    this.aimPlane.position.y = 1.5;

    this.aimTexture = null;
    this.aimMat = new BABYLON.StandardMaterial('aimMat', this.scene);
    this.aimMat.disableLighting = true;
    this.aimMat.backFaceCulling = false;
    this.aimPlane.material = this.aimMat;
  }

  _createBallAndShadowMeshes() {
    this.ballMeshes = {};
    this.shadowMeshes = {};
    this.ballMaterials = {};

    // Common shadow material
    const shadowMat = new BABYLON.StandardMaterial('shadowMat', this.scene);
    const shadowTex = new BABYLON.Texture(`${ASSET_DIR}/shadow.svg`, this.scene);
    shadowTex.hasAlpha = true;
    shadowMat.diffuseTexture = shadowTex;
    shadowMat.emissiveTexture = shadowTex;
    shadowMat.useAlphaFromDiffuseTexture = true;
    shadowMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    shadowMat.disableLighting = true;
    shadowMat.backFaceCulling = false;

    for (let i = 0; i <= 9; i++) {
      // Shadow mesh (Layer 2)
      const shadowMesh = BABYLON.MeshBuilder.CreatePlane(`shadow_${i}`, { size: 1 }, this.scene);
      shadowMesh.rotation.x = Math.PI / 2;
      shadowMesh.position.y = 0.4;
      shadowMesh.material = shadowMat;
      this.shadowMeshes[i] = shadowMesh;

      // Ball mesh (Layer 3)
      const ballMesh = BABYLON.MeshBuilder.CreatePlane(`ball_${i}`, { size: 1 }, this.scene);
      ballMesh.rotation.x = Math.PI / 2;
      ballMesh.position.y = 1.0;
      this.ballMeshes[i] = ballMesh;

      this.ballMaterials[i] = this._createBallMaterial(i);
      ballMesh.material = this.ballMaterials[i];
    }
  }

  _createBallMaterial(id) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const radius = size / 2;
    const color = id === CUE_ID ? '#ffffff' : (BALL_COLORS[id] || '#ffffff');

    if (id === CUE_ID) {
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#f7f7f0';
      ctx.fill();
      if (this.ballTemplateLoaded) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(this.ballTemplateImg, 0, 0, size, size);
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

      if (this.ballTemplateLoaded) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(this.ballTemplateImg, 0, 0, size, size);
        ctx.globalCompositeOperation = 'source-over';
      }
      this._drawBallNumber(ctx, id, size);
    } else {
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (this.ballTemplateLoaded) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(this.ballTemplateImg, 0, 0, size, size);
        ctx.globalCompositeOperation = 'source-over';
      }
      this._drawBallNumber(ctx, id, size);
    }

    const dynTex = new BABYLON.Texture(canvas.toDataURL(), this.scene);
    dynTex.hasAlpha = true;

    const mat = new BABYLON.StandardMaterial(`ballMat_${id}`, this.scene);
    mat.diffuseTexture = dynTex;
    mat.emissiveTexture = dynTex;
    mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    mat.useAlphaFromDiffuseTexture = true;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    return mat;
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

  _rebuildBallMaterials() {
    for (let i = 0; i <= 9; i++) {
      this.ballMaterials[i] = this._createBallMaterial(i);
      if (this.ballMeshes[i]) {
        this.ballMeshes[i].material = this.ballMaterials[i];
      }
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

    this.engine.resize();

    // Configure top-down orthographic camera frustum matching viewport CSS pixels
    this.camera.orthoLeft = cssW / 2;
    this.camera.orthoRight = -cssW / 2;
    this.camera.orthoTop = cssH / 2;
    this.camera.orthoBottom = -cssH / 2;
    this.camera.position.set(cssW / 2, 100, cssH / 2);
    this.camera.setTarget(new BABYLON.Vector3(cssW / 2, 0, cssH / 2));

    this._computeTableRect();
    this._updatePlanesGeometry();
  }

  _computeTableRect() {
    const W = TABLE.width; // 100 inches
    const H = TABLE.height; // 50 inches (2:1 aspect ratio)
    const rail = TABLE.railThickness; // 7.5 inches
    const outerW = W + rail * 2; // 115
    const outerH = H + rail * 2; // 65

    const availW = this.cssW;
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
    this.playW = W * scale;
    this.playH = H * scale;
  }

  _updatePlanesGeometry() {
    // 1. Felt Plane (tight 2:1 rectangle surface)
    const px = this.tableRect.x + this.playOffset.x;
    const py = this.tableRect.y + this.playOffset.y;
    this.feltPlane.scaling.set(this.playW, this.playH, 1);
    this.feltPlane.position.set(px + this.playW / 2, 0, py + this.playH / 2);

    // 2. Frame Plane (outer rail dimensions overlay, viewBox 1600x900 with 1240x540 inner cutout)
    const frameW = this.playW * (1600 / 1240);
    const frameH = this.playH * (900 / 540);
    this.framePlane.scaling.set(frameW, frameH, 1);
    this.framePlane.position.set(px + this.playW / 2, 2.0, py + this.playH / 2);

    // 3. Aim Overlay Plane
    if (this.aimTexture) {
      this.aimTexture.dispose();
    }
    const texW = Math.max(1, Math.round(this.cssW));
    const texH = Math.max(1, Math.round(this.cssH));
    this.aimTexture = new BABYLON.DynamicTexture('aimTexture', { width: texW, height: texH }, this.scene, false);
    this.aimTexture.hasAlpha = true;
    this.aimMat.diffuseTexture = this.aimTexture;
    this.aimMat.emissiveTexture = this.aimTexture;
    this.aimMat.useAlphaFromDiffuseTexture = true;
    this.aimMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

    this.aimPlane.scaling.set(this.cssW, this.cssH, 1);
    this.aimPlane.position.set(this.cssW / 2, 1.5, this.cssH / 2);
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
    const rp = this.ballRadiusPx();

    // Position active ball and shadow meshes
    for (const b of balls) {
      const ballMesh = this.ballMeshes[b.id];
      const shadowMesh = this.shadowMeshes[b.id];
      if (!ballMesh || !shadowMesh) continue;

      if (b.pocketed) {
        ballMesh.setEnabled(false);
        shadowMesh.setEnabled(false);
      } else {
        ballMesh.setEnabled(true);
        shadowMesh.setEnabled(true);

        const p = this.toPx(b.x, b.y);

        // Ball mesh
        ballMesh.scaling.set(rp * 2, rp * 2, 1);
        ballMesh.position.set(p.x, 1.0, p.y);

        // Shadow mesh
        const offsetX = rp * 0.25;
        const offsetY = rp * 0.35;
        const sw = rp * 2.4;
        const sh = rp * 2.4;
        shadowMesh.scaling.set(sw, sh, 1);
        shadowMesh.position.set(p.x + offsetX, 0.4, p.y + offsetY);
      }
    }

    // Render aim graphics overlay
    this._drawAim(balls);

    // Render Babylon scene
    this.scene.render();
  }

  _drawAim(balls) {
    if (!this.aimTexture) return;
    const ctx = this.aimTexture.getContext();
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    if (this.aim) {
      const cue = balls.find((b) => b.id === CUE_ID && !b.pocketed);
      if (cue) {
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
    }

    this.aimTexture.update();
  }

  drawTableFelt(arg1, arg2, arg3, arg4, arg5) {
    // Fallback compatibility method if called directly
  }

  drawBeveledRails(arg1, arg2, arg3, arg4, arg5, arg6) {
    // Fallback compatibility method if called directly
  }
}
