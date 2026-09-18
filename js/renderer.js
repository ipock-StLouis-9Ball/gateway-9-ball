// Fix table sizing before deriving offsets and scale.
// The previous implementation referenced playW/playH/scale before assigning them.
// Keep the playfield aspect ratio and fit it inside the available canvas.
_computeTableRect() {
  const W = TABLE.width;
  const H = TABLE.height;
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
