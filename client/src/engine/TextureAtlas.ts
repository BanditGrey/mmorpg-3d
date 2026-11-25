import { Texture } from 'pixi.js';

export interface WorldTextureAtlas {
  tile_stone: Texture;
  tile_grass: Texture;
  tile_forest: Texture;
  tile_orc_earth: Texture;
  tile_volcanic: Texture;
  tile_magma: Texture;

  prop_pine_tree: Texture;
  prop_oak_tree: Texture;
  prop_brazier: Texture;
  prop_campfire: Texture;
  prop_ruin_pillar: Texture;
  prop_magma_obelisk: Texture;
  prop_portal_vortex: Texture;
  prop_radial_glow: Texture;
}

let cachedAtlas: WorldTextureAtlas | null = null;

function createCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D context for TextureAtlas');
  }
  return { canvas, ctx };
}

function traceDiamond(ctx: CanvasRenderingContext2D, w: number, h: number, inset = 0): void {
  const hw = w / 2;
  const hh = h / 2;
  ctx.beginPath();
  ctx.moveTo(hw, inset * 0.5);
  ctx.lineTo(w - inset, hh);
  ctx.lineTo(hw, h - inset * 0.5);
  ctx.lineTo(inset, hh);
  ctx.closePath();
}

function drawDiamondBevel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  topHighlight: string,
  bottomShadow: string,
  borderStroke: string
): void {
  const hw = w / 2;
  const hh = h / 2;

  // Top-left sunlit bevel
  ctx.beginPath();
  ctx.moveTo(1, hh);
  ctx.lineTo(hw, 0.5);
  ctx.lineTo(w - 1, hh);
  ctx.strokeStyle = topHighlight;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Bottom-right ambient shadow bevel
  ctx.beginPath();
  ctx.moveTo(1, hh);
  ctx.lineTo(hw, h - 0.5);
  ctx.lineTo(w - 1, hh);
  ctx.strokeStyle = bottomShadow;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Outer seam
  traceDiamond(ctx, w, h, 0.25);
  ctx.strokeStyle = borderStroke;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function bakeStoneTile(): Texture {
  const w = 64;
  const h = 32;
  const { canvas, ctx } = createCanvas(w, h);

  ctx.save();
  traceDiamond(ctx, w, h);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#3a4356');
  grad.addColorStop(0.5, '#2b3242');
  grad.addColorStop(1, '#1e2431');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Inner flagstone sheen
  const sheen = ctx.createRadialGradient(w * 0.38, h * 0.35, 2, w * 0.5, h * 0.5, 28);
  sheen.addColorStop(0, 'rgba(180, 205, 245, 0.16)');
  sheen.addColorStop(1, 'rgba(10, 14, 22, 0.18)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  // Chiseled flagstone seams
  ctx.strokeStyle = 'rgba(15, 19, 28, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 10);
  ctx.lineTo(36, 18);
  ctx.lineTo(44, 14);
  ctx.moveTo(16, 18);
  ctx.lineTo(28, 12);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(165, 185, 220, 0.18)';
  ctx.beginPath();
  ctx.moveTo(20, 11);
  ctx.lineTo(36, 19);
  ctx.stroke();

  ctx.restore();
  drawDiamondBevel(ctx, w, h, 'rgba(180, 200, 235, 0.3)', 'rgba(8, 10, 16, 0.65)', 'rgba(12, 16, 24, 0.75)');
  return Texture.from(canvas);
}

function bakeGrassTile(): Texture {
  const w = 64;
  const h = 32;
  const { canvas, ctx } = createCanvas(w, h);

  ctx.save();
  traceDiamond(ctx, w, h);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#235938');
  grad.addColorStop(0.55, '#194229');
  grad.addColorStop(1, '#12301e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Soft sunlit moss patch
  const moss = ctx.createRadialGradient(26, 13, 2, 30, 15, 24);
  moss.addColorStop(0, 'rgba(74, 222, 128, 0.22)');
  moss.addColorStop(1, 'rgba(12, 28, 18, 0)');
  ctx.fillStyle = moss;
  ctx.fillRect(0, 0, w, h);

  // Painterly grass blades
  const blades: ReadonlyArray<[number, number, number, string]> = [
    [18, 17, -4, '#348c54'],
    [20, 18, -5, '#4ade80'],
    [29, 13, -4, '#2f7a49'],
    [32, 14, -5, '#4ade80'],
    [41, 18, -4, '#2d7546'],
    [43, 19, -3, '#3c995c'],
    [25, 22, -4, '#2b6e42'],
    [36, 21, -5, '#3aa15f'],
  ];
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  for (const [bx, by, dy, color] of blades) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + 1.5, by + dy * 0.6, bx + 2.5, by + dy);
    ctx.stroke();
  }

  ctx.restore();
  drawDiamondBevel(ctx, w, h, 'rgba(134, 239, 172, 0.16)', 'rgba(6, 16, 10, 0.45)', 'rgba(10, 22, 14, 0.5)');
  return Texture.from(canvas);
}

function bakeForestTile(): Texture {
  const w = 64;
  const h = 32;
  const { canvas, ctx } = createCanvas(w, h);

  ctx.save();
  traceDiamond(ctx, w, h);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#163123');
  grad.addColorStop(0.55, '#10241a');
  grad.addColorStop(1, '#0b1912');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Humus & root shadow
  const humus = ctx.createRadialGradient(34, 16, 2, 32, 16, 22);
  humus.addColorStop(0, 'rgba(68, 52, 36, 0.25)');
  humus.addColorStop(1, 'rgba(8, 16, 12, 0)');
  ctx.fillStyle = humus;
  ctx.fillRect(0, 0, w, h);

  // Pine needles
  ctx.strokeStyle = 'rgba(56, 118, 82, 0.55)';
  ctx.lineWidth = 1;
  const needles: ReadonlyArray<[number, number, number, number]> = [
    [20, 14, 25, 16],
    [22, 17, 27, 15],
    [35, 11, 40, 13],
    [38, 19, 44, 17],
    [28, 22, 33, 20],
  ];
  for (const [x1, y1, x2, y2] of needles) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
  drawDiamondBevel(ctx, w, h, 'rgba(74, 150, 105, 0.14)', 'rgba(5, 10, 8, 0.5)', 'rgba(7, 14, 10, 0.55)');
  return Texture.from(canvas);
}

function bakeOrcEarthTile(): Texture {
  const w = 64;
  const h = 32;
  const { canvas, ctx } = createCanvas(w, h);

  ctx.save();
  traceDiamond(ctx, w, h);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#3b2c21');
  grad.addColorStop(0.5, '#2c2017');
  grad.addColorStop(1, '#1e1610');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Scorched soot smudge
  const soot = ctx.createRadialGradient(30, 17, 2, 30, 17, 20);
  soot.addColorStop(0, 'rgba(18, 13, 12, 0.45)');
  soot.addColorStop(1, 'rgba(18, 13, 12, 0)');
  ctx.fillStyle = soot;
  ctx.fillRect(0, 0, w, h);

  // Gravel pebbles & dry cracks
  ctx.fillStyle = 'rgba(110, 88, 68, 0.45)';
  ctx.beginPath();
  ctx.ellipse(22, 16, 2.2, 1.2, 0.2, 0, Math.PI * 2);
  ctx.ellipse(39, 14, 1.8, 1.0, -0.3, 0, Math.PI * 2);
  ctx.ellipse(33, 21, 1.5, 0.9, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(20, 14, 10, 0.55)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(26, 11);
  ctx.lineTo(31, 16);
  ctx.lineTo(29, 20);
  ctx.stroke();

  ctx.restore();
  drawDiamondBevel(ctx, w, h, 'rgba(180, 140, 105, 0.18)', 'rgba(10, 7, 5, 0.55)', 'rgba(16, 12, 8, 0.6)');
  return Texture.from(canvas);
}

function bakeVolcanicTile(): Texture {
  const w = 64;
  const h = 32;
  const { canvas, ctx } = createCanvas(w, h);

  ctx.save();
  traceDiamond(ctx, w, h);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#261a1f');
  grad.addColorStop(0.5, '#1a1115');
  grad.addColorStop(1, '#100a0d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle warm ember reflection on basalt facets
  const warm = ctx.createRadialGradient(32, 14, 2, 32, 16, 24);
  warm.addColorStop(0, 'rgba(255, 92, 32, 0.14)');
  warm.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);

  // Sharp basalt fractures
  ctx.strokeStyle = 'rgba(8, 5, 7, 0.8)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(18, 15);
  ctx.lineTo(30, 13);
  ctx.lineTo(42, 18);
  ctx.moveTo(30, 13);
  ctx.lineTo(33, 22);
  ctx.stroke();

  ctx.restore();
  drawDiamondBevel(ctx, w, h, 'rgba(255, 130, 80, 0.18)', 'rgba(5, 3, 4, 0.7)', 'rgba(12, 7, 9, 0.75)');
  return Texture.from(canvas);
}

function bakeMagmaTile(): Texture {
  const w = 64;
  const h = 32;
  const { canvas, ctx } = createCanvas(w, h);

  ctx.save();
  traceDiamond(ctx, w, h);
  ctx.clip();

  // Obsidian crust
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#241417');
  grad.addColorStop(1, '#12090b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Molten underglow
  const glow = ctx.createRadialGradient(32, 16, 2, 32, 16, 26);
  glow.addColorStop(0, 'rgba(255, 95, 15, 0.65)');
  glow.addColorStop(0.6, 'rgba(255, 50, 0, 0.25)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Branching magma seam (outer red-orange -> mid orange -> white-gold core)
  const drawSeam = (stroke: string, width: number) => {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(12, 16);
    ctx.lineTo(25, 13);
    ctx.lineTo(35, 18);
    ctx.lineTo(50, 15);
    ctx.moveTo(25, 13);
    ctx.lineTo(29, 22);
    ctx.stroke();
  };

  drawSeam('rgba(255, 60, 0, 0.85)', 4.2);
  drawSeam('#ff922b', 2.2);
  drawSeam('#ffe066', 0.95);

  ctx.restore();
  drawDiamondBevel(ctx, w, h, 'rgba(255, 120, 50, 0.3)', 'rgba(12, 5, 5, 0.75)', 'rgba(255, 75, 20, 0.35)');
  return Texture.from(canvas);
}

function bakePineTree(): Texture {
  const w = 64;
  const h = 96;
  const { canvas, ctx } = createCanvas(w, h);
  const cx = w / 2;
  const baseY = h - 8;

  // Ground shadow
  ctx.fillStyle = 'rgba(4, 8, 6, 0.48)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 2, 19, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bark trunk with grain
  const trunkGrad = ctx.createLinearGradient(cx - 4, baseY - 24, cx + 4, baseY);
  trunkGrad.addColorStop(0, '#4a3222');
  trunkGrad.addColorStop(0.5, '#352216');
  trunkGrad.addColorStop(1, '#21140d');
  ctx.fillStyle = trunkGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 4.5, baseY + 1);
  ctx.lineTo(cx + 4.5, baseY + 1);
  ctx.lineTo(cx + 2.5, baseY - 22);
  ctx.lineTo(cx - 2.5, baseY - 22);
  ctx.closePath();
  ctx.fill();

  // Layered pine boughs (bottom to top)
  const tiers: ReadonlyArray<{ y: number; halfW: number; tipY: number; dark: string; light: string }> = [
    { y: baseY - 14, halfW: 23, tipY: baseY - 40, dark: '#0c2419', light: '#1a4a33' },
    { y: baseY - 30, halfW: 19, tipY: baseY - 56, dark: '#102e20', light: '#21593e' },
    { y: baseY - 45, halfW: 15, tipY: baseY - 70, dark: '#143827', light: '#286b4a' },
    { y: baseY - 59, halfW: 10, tipY: baseY - 82, dark: '#18422e', light: '#327f59' },
  ];

  for (const tier of tiers) {
    const grad = ctx.createLinearGradient(cx - tier.halfW, tier.tipY, cx + tier.halfW, tier.y);
    grad.addColorStop(0, tier.light);
    grad.addColorStop(0.65, tier.dark);
    grad.addColorStop(1, '#081710');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, tier.tipY);
    ctx.lineTo(cx + tier.halfW, tier.y);
    ctx.quadraticCurveTo(cx, tier.y + 5, cx - tier.halfW, tier.y);
    ctx.closePath();
    ctx.fill();

    // Soft rim highlight on left edge
    ctx.strokeStyle = 'rgba(110, 210, 150, 0.24)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, tier.tipY + 1);
    ctx.lineTo(cx - tier.halfW + 2, tier.y - 1);
    ctx.stroke();
  }

  return Texture.from(canvas);
}

function bakeOakTree(): Texture {
  const w = 76;
  const h = 92;
  const { canvas, ctx } = createCanvas(w, h);
  const cx = w / 2;
  const baseY = h - 8;

  // Ground shadow
  ctx.fillStyle = 'rgba(4, 8, 6, 0.48)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 2, 23, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gnarled trunk
  const trunkGrad = ctx.createLinearGradient(cx - 6, baseY - 30, cx + 6, baseY);
  trunkGrad.addColorStop(0, '#593d2b');
  trunkGrad.addColorStop(0.55, '#3b2619');
  trunkGrad.addColorStop(1, '#24160e');
  ctx.fillStyle = trunkGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 7, baseY + 2);
  ctx.quadraticCurveTo(cx - 3, baseY - 12, cx - 4, baseY - 30);
  ctx.lineTo(cx + 4, baseY - 30);
  ctx.quadraticCurveTo(cx + 3, baseY - 12, cx + 7, baseY + 2);
  ctx.closePath();
  ctx.fill();

  // Painterly foliage clusters
  const puffs: ReadonlyArray<{ x: number; y: number; r: number; c0: string; c1: string }> = [
    { x: cx - 15, y: baseY - 36, r: 15, c0: '#215437', c1: '#0d2618' },
    { x: cx + 15, y: baseY - 35, r: 14, c0: '#1f4f34', c1: '#0c2316' },
    { x: cx, y: baseY - 32, r: 16, c0: '#26613f', c1: '#102b1c' },
    { x: cx - 9, y: baseY - 49, r: 16, c0: '#2f754c', c1: '#143623' },
    { x: cx + 9, y: baseY - 48, r: 15, c0: '#2b6b45', c1: '#133220' },
    { x: cx - 2, y: baseY - 58, r: 15, c0: '#3d915f', c1: '#1b472e' },
  ];

  for (const p of puffs) {
    const grad = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.35, 2, p.x, p.y, p.r);
    grad.addColorStop(0, p.c0);
    grad.addColorStop(1, p.c1);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  return Texture.from(canvas);
}

function bakeBrazier(): Texture {
  const w = 48;
  const h = 64;
  const { canvas, ctx } = createCanvas(w, h);
  const cx = w / 2;
  const baseY = h - 8;

  // Shadow
  ctx.fillStyle = 'rgba(5, 7, 10, 0.55)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 2, 14, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone pedestal with bevel
  const pedGrad = ctx.createLinearGradient(cx - 10, baseY - 20, cx + 10, baseY);
  pedGrad.addColorStop(0, '#525d73');
  pedGrad.addColorStop(0.5, '#374151');
  pedGrad.addColorStop(1, '#1f2937');
  ctx.fillStyle = pedGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 9, baseY);
  ctx.lineTo(cx + 9, baseY);
  ctx.lineTo(cx + 6, baseY - 20);
  ctx.lineTo(cx - 6, baseY - 20);
  ctx.closePath();
  ctx.fill();

  // Iron bowl
  const bowlGrad = ctx.createLinearGradient(cx - 13, baseY - 26, cx + 13, baseY - 16);
  bowlGrad.addColorStop(0, '#374151');
  bowlGrad.addColorStop(0.5, '#1f2937');
  bowlGrad.addColorStop(1, '#111827');
  ctx.fillStyle = bowlGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 13, baseY - 25);
  ctx.lineTo(cx + 13, baseY - 25);
  ctx.lineTo(cx + 8, baseY - 17);
  ctx.lineTo(cx - 8, baseY - 17);
  ctx.closePath();
  ctx.fill();

  // Bronze rim
  ctx.strokeStyle = '#b48a4e';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - 13, baseY - 25);
  ctx.lineTo(cx + 13, baseY - 25);
  ctx.stroke();

  // Glowing coal bed
  const coalGrad = ctx.createRadialGradient(cx, baseY - 25, 1, cx, baseY - 25, 9);
  coalGrad.addColorStop(0, '#ffe066');
  coalGrad.addColorStop(0.5, '#ff6b1a');
  coalGrad.addColorStop(1, '#8c2208');
  ctx.fillStyle = coalGrad;
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 25, 8.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  return Texture.from(canvas);
}

function bakeCampfire(): Texture {
  const w = 48;
  const h = 48;
  const { canvas, ctx } = createCanvas(w, h);
  const cx = w / 2;
  const cy = h - 14;

  // Ground scorch shadow
  const scorch = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
  scorch.addColorStop(0, 'rgba(10, 6, 4, 0.72)');
  scorch.addColorStop(1, 'rgba(10, 6, 4, 0)');
  ctx.fillStyle = scorch;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone ring
  const stones: ReadonlyArray<[number, number, number]> = [
    [-12, 0, 3.2],
    [-8, 4.5, 3.4],
    [0, 6, 3.6],
    [8, 4.5, 3.4],
    [12, 0, 3.2],
    [-8, -4.2, 2.8],
    [8, -4.2, 2.8],
  ];
  for (const [sx, sy, r] of stones) {
    const sg = ctx.createRadialGradient(cx + sx - 1, cy + sy - 1, 0.5, cx + sx, cy + sy, r);
    sg.addColorStop(0, '#78716c');
    sg.addColorStop(1, '#292524');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(cx + sx, cy + sy, r, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crossed charred logs
  ctx.strokeStyle = '#3b2416';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy + 2);
  ctx.lineTo(cx + 8, cy - 3);
  ctx.moveTo(cx + 9, cy + 2);
  ctx.lineTo(cx - 8, cy - 3);
  ctx.stroke();

  // Hot ember core
  const ember = ctx.createRadialGradient(cx, cy - 1, 1, cx, cy - 1, 7.5);
  ember.addColorStop(0, '#fff3b0');
  ember.addColorStop(0.5, '#ff5400');
  ember.addColorStop(1, 'rgba(150, 30, 0, 0)');
  ctx.fillStyle = ember;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, 7.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  return Texture.from(canvas);
}

function bakeRuinPillar(): Texture {
  const w = 48;
  const h = 76;
  const { canvas, ctx } = createCanvas(w, h);
  const cx = w / 2;
  const baseY = h - 8;

  // Shadow
  ctx.fillStyle = 'rgba(5, 7, 10, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 2, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pedestal
  const pedGrad = ctx.createLinearGradient(cx - 10, baseY - 8, cx + 10, baseY);
  pedGrad.addColorStop(0, '#5a657d');
  pedGrad.addColorStop(1, '#2b3240');
  ctx.fillStyle = pedGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 10, baseY + 1);
  ctx.lineTo(cx + 10, baseY + 1);
  ctx.lineTo(cx + 8, baseY - 7);
  ctx.lineTo(cx - 8, baseY - 7);
  ctx.closePath();
  ctx.fill();

  // Fluted stone shaft
  const shaftGrad = ctx.createLinearGradient(cx - 7, baseY - 48, cx + 7, baseY - 7);
  shaftGrad.addColorStop(0, '#64708a');
  shaftGrad.addColorStop(0.45, '#475166');
  shaftGrad.addColorStop(1, '#262c38');
  ctx.fillStyle = shaftGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 6.5, baseY - 7);
  ctx.lineTo(cx + 6.5, baseY - 7);
  ctx.lineTo(cx + 6, baseY - 44);
  ctx.lineTo(cx + 1, baseY - 50);
  ctx.lineTo(cx - 6, baseY - 41);
  ctx.closePath();
  ctx.fill();

  // Fluting lines
  ctx.strokeStyle = 'rgba(18, 22, 30, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 2.5, baseY - 8);
  ctx.lineTo(cx - 2.5, baseY - 43);
  ctx.moveTo(cx + 2.5, baseY - 8);
  ctx.lineTo(cx + 2.5, baseY - 46);
  ctx.stroke();

  // Carved glowing rune accent
  ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
  ctx.fillRect(cx - 1.5, baseY - 26, 3, 7);

  return Texture.from(canvas);
}

function bakeMagmaObelisk(): Texture {
  const w = 52;
  const h = 92;
  const { canvas, ctx } = createCanvas(w, h);
  const cx = w / 2;
  const baseY = h - 8;

  // Shadow
  ctx.fillStyle = 'rgba(8, 3, 5, 0.68)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 2, 16, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Obsidian pedestal
  const baseGrad = ctx.createLinearGradient(cx - 12, baseY - 14, cx + 12, baseY);
  baseGrad.addColorStop(0, '#362229');
  baseGrad.addColorStop(1, '#140c0f');
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 11, baseY + 1);
  ctx.lineTo(cx + 11, baseY + 1);
  ctx.lineTo(cx + 8, baseY - 14);
  ctx.lineTo(cx - 8, baseY - 14);
  ctx.closePath();
  ctx.fill();

  // Left lit facet & right dark facet of obsidian spire
  ctx.fillStyle = '#2d1b22';
  ctx.beginPath();
  ctx.moveTo(cx - 7, baseY - 14);
  ctx.lineTo(cx, baseY - 68);
  ctx.lineTo(cx, baseY - 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#170d11';
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 14);
  ctx.lineTo(cx, baseY - 68);
  ctx.lineTo(cx + 7, baseY - 14);
  ctx.closePath();
  ctx.fill();

  // Etched magma veins
  ctx.strokeStyle = '#ff5a1f';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 3, baseY - 18);
  ctx.lineTo(cx, baseY - 38);
  ctx.lineTo(cx + 3, baseY - 22);
  ctx.stroke();

  // Glowing core crystal
  const crystalGrad = ctx.createRadialGradient(cx, baseY - 38, 1, cx, baseY - 38, 9);
  crystalGrad.addColorStop(0, '#fff3b0');
  crystalGrad.addColorStop(0.45, '#ff6b1a');
  crystalGrad.addColorStop(1, 'rgba(255, 45, 0, 0)');
  ctx.fillStyle = crystalGrad;
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 52);
  ctx.lineTo(cx + 4.5, baseY - 36);
  ctx.lineTo(cx, baseY - 24);
  ctx.lineTo(cx - 4.5, baseY - 36);
  ctx.closePath();
  ctx.fill();

  return Texture.from(canvas);
}

function bakePortalVortex(): Texture {
  const size = 96;
  const { canvas, ctx } = createCanvas(size, size);
  const cx = size / 2;
  const cy = size / 2;

  // Outer arcane aura
  const aura = ctx.createRadialGradient(cx, cy, 4, cx, cy, 46);
  aura.addColorStop(0, 'rgba(224, 247, 255, 0.95)');
  aura.addColorStop(0.25, 'rgba(56, 189, 248, 0.78)');
  aura.addColorStop(0.6, 'rgba(139, 92, 246, 0.42)');
  aura.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, size, size);

  // Swirling spiral energy arms
  for (let arm = 0; arm < 4; arm++) {
    const baseAngle = (arm * Math.PI) / 2;
    ctx.strokeStyle = arm % 2 === 0 ? 'rgba(125, 211, 252, 0.85)' : 'rgba(192, 132, 252, 0.75)';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let t = 0; t <= 24; t++) {
      const frac = t / 24;
      const r = 6 + frac * 34;
      const a = baseAngle + frac * Math.PI * 1.45;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Outer rune ring
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bright core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.55, 'rgba(125, 211, 252, 0.85)');
  core.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();

  return Texture.from(canvas);
}

function bakeRadialGlow(): Texture {
  const size = 128;
  const { canvas, ctx } = createCanvas(size, size);
  const c = size / 2;

  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.12)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return Texture.from(canvas);
}

/**
 * Returns the singleton cached raster texture atlas.
 * Textures are baked once on offscreen canvases and reused across map switches.
 */
export function getAtlas(): WorldTextureAtlas {
  if (!cachedAtlas) {
    cachedAtlas = {
      tile_stone: bakeStoneTile(),
      tile_grass: bakeGrassTile(),
      tile_forest: bakeForestTile(),
      tile_orc_earth: bakeOrcEarthTile(),
      tile_volcanic: bakeVolcanicTile(),
      tile_magma: bakeMagmaTile(),

      prop_pine_tree: bakePineTree(),
      prop_oak_tree: bakeOakTree(),
      prop_brazier: bakeBrazier(),
      prop_campfire: bakeCampfire(),
      prop_ruin_pillar: bakeRuinPillar(),
      prop_magma_obelisk: bakeMagmaObelisk(),
      prop_portal_vortex: bakePortalVortex(),
      prop_radial_glow: bakeRadialGlow(),
    };
  }
  return cachedAtlas;
}
