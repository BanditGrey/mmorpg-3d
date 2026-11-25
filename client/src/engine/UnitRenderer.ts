import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { HeroClass } from '@mmorpg/shared';

export interface UnitRig {
  container: Container;
  bodyGroup: Container;
  weaponPart: Container;
  auraRing?: Graphics;
  hpFill: Graphics;
  animTime: number;
  attackTimer: number;
  hitFlashTimer: number;
}

interface RigMeta {
  baseScale: number;
  hpWidth: number;
  hpHeight: number;
  isSlime: boolean;
  isBoss: boolean;
  baseWeaponRot: number;
  capeSprite?: Sprite;
  tailSprite?: Sprite;
  orbGlowSprite?: Sprite;
}

const rigMetaMap = new WeakMap<UnitRig, RigMeta>();
const textureCache = new Map<string, Texture>();

const ATTACK_DURATION = 0.28;
const HIT_FLASH_DURATION = 0.16;

// ---------------------------------------------------------------------------
// Offscreen Canvas Texture Baking & Painterly Helpers
// ---------------------------------------------------------------------------

function getOrBakeTexture(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): Texture {
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    draw(ctx, width, height);
  }

  const texture = Texture.from(canvas);
  textureCache.set(key, texture);
  return texture;
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: ReadonlyArray<[number, number]>,
): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawRadialGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  innerColor: string,
  midColor: string,
  outerColor: string,
): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.45, midColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawFurStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: ReadonlyArray<{ x1: number; y1: number; x2: number; y2: number; color: string; width: number }>,
): void {
  ctx.lineCap = 'round';
  for (const s of strokes) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Warrior Textures (Cape, Armored Body, Greatsword)
// ---------------------------------------------------------------------------

function getWarriorCapeTexture(): Texture {
  return getOrBakeTexture('warrior_cape_v1', 96, 96, (ctx) => {
    // Flowing crimson cape with folds & gold-stitched hem
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(32, 16);
    ctx.bezierCurveTo(22, 42, 16, 66, 14, 82);
    ctx.lineTo(29, 88);
    ctx.lineTo(44, 81);
    ctx.lineTo(58, 88);
    ctx.lineTo(74, 78);
    ctx.bezierCurveTo(70, 56, 66, 36, 62, 16);
    ctx.closePath();

    const capeGrad = ctx.createLinearGradient(20, 16, 70, 88);
    capeGrad.addColorStop(0, '#991b1b');
    capeGrad.addColorStop(0.55, '#7f1d1d');
    capeGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = capeGrad;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#2a0606';
    ctx.stroke();

    // Vertical velvet fold highlights
    const folds: Array<[number, number, number, number, string]> = [
      [38, 18, 26, 82, 'rgba(220, 38, 38, 0.35)'],
      [48, 18, 46, 79, 'rgba(248, 113, 113, 0.22)'],
      [56, 18, 66, 76, 'rgba(69, 10, 10, 0.5)'],
    ];
    for (const [x1, y1, x2, y2, color] of folds) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2 - 3, (y1 + y2) / 2, x2, y2);
      ctx.stroke();
    }

    // Gold embroidered bottom trim
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(16, 80);
    ctx.lineTo(29, 86);
    ctx.lineTo(44, 79);
    ctx.lineTo(58, 86);
    ctx.lineTo(72, 76);
    ctx.stroke();
    ctx.restore();
  });
}

function getWarriorBodyTexture(): Texture {
  return getOrBakeTexture('warrior_body_v1', 128, 128, (ctx) => {
    // Anchor at (64, 116) -> world scale ~0.52
    // 1. Steel Greaves & Sabatons
    const legGrad = ctx.createLinearGradient(44, 84, 84, 116);
    legGrad.addColorStop(0, '#475569');
    legGrad.addColorStop(0.5, '#1e293b');
    legGrad.addColorStop(1, '#0f172a');

    for (const lx of [47, 67]) {
      drawRoundedRect(ctx, lx, 84, 14, 28, 4);
      ctx.fillStyle = legGrad;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#090d16';
      ctx.stroke();

      // Knee poleyn
      drawRoundedRect(ctx, lx - 1, 91, 16, 8, 3);
      const kneeGrad = ctx.createLinearGradient(lx, 91, lx + 14, 99);
      kneeGrad.addColorStop(0, '#cbd5e1');
      kneeGrad.addColorStop(0.5, '#64748b');
      kneeGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = kneeGrad;
      ctx.fill();
      ctx.stroke();

      // Sabaton
      ctx.beginPath();
      ctx.ellipse(lx + 7, 114, 9.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#334155';
      ctx.fill();
      ctx.stroke();
    }

    // 2. Plate Cuirass (Torso)
    drawPolygon(ctx, [
      [41, 44],
      [87, 44],
      [82, 85],
      [46, 85],
    ]);
    const armorGrad = ctx.createLinearGradient(41, 44, 87, 85);
    armorGrad.addColorStop(0, '#64748b');
    armorGrad.addColorStop(0.4, '#334155');
    armorGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = armorGrad;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#090d16';
    ctx.stroke();

    // Breastplate central sculpted plate & rim light
    drawPolygon(ctx, [
      [50, 46],
      [78, 46],
      [73, 73],
      [55, 73],
    ]);
    const chestGrad = ctx.createLinearGradient(50, 46, 78, 73);
    chestGrad.addColorStop(0, '#94a3b8');
    chestGrad.addColorStop(0.45, '#475569');
    chestGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = chestGrad;
    ctx.fill();

    // Central ridge highlight
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 46);
    ctx.lineTo(64, 74);
    ctx.stroke();

    // Gold chest V-trim
    const goldGrad = ctx.createLinearGradient(44, 46, 84, 62);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.5, '#f59e0b');
    goldGrad.addColorStop(1, '#92400e');
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(45, 47);
    ctx.lineTo(64, 62);
    ctx.lineTo(83, 47);
    ctx.stroke();

    // Leather belt & ornate gold buckle
    drawRoundedRect(ctx, 44, 77, 40, 8, 2);
    ctx.fillStyle = '#451a03';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#090d16';
    ctx.stroke();

    drawRoundedRect(ctx, 58, 75, 12, 11, 2);
    ctx.fillStyle = goldGrad;
    ctx.fill();
    ctx.stroke();

    // 3. Heavy Steel Shoulder Pauldrons
    for (const [cx, dir] of [
      [40, -1],
      [88, 1],
    ] as const) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, 48, 13, 10, dir * -0.2, 0, Math.PI * 2);
      const pGrad = ctx.createRadialGradient(cx - 3, 44, 2, cx, 48, 14);
      pGrad.addColorStop(0, '#cbd5e1');
      pGrad.addColorStop(0.55, '#475569');
      pGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = pGrad;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#090d16';
      ctx.stroke();

      // Gold pauldron rim
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx, 48, 11, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Horned Dark-Iron Helm with Glowing Visor
    // Curved horns
    for (const dir of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(64 + dir * 13, 24);
      ctx.quadraticCurveTo(64 + dir * 29, 16, 64 + dir * 25, 2);
      ctx.quadraticCurveTo(64 + dir * 19, 13, 64 + dir * 9, 18);
      ctx.closePath();
      const hornGrad = ctx.createLinearGradient(64 + dir * 10, 22, 64 + dir * 26, 2);
      hornGrad.addColorStop(0, '#64748b');
      hornGrad.addColorStop(0.6, '#e2e8f0');
      hornGrad.addColorStop(1, '#f8fafc');
      ctx.fillStyle = hornGrad;
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#1e293b';
      ctx.stroke();
    }

    // Helm dome
    drawRoundedRect(ctx, 48, 14, 32, 31, 12);
    const helmGrad = ctx.createRadialGradient(58, 22, 3, 64, 30, 24);
    helmGrad.addColorStop(0, '#64748b');
    helmGrad.addColorStop(0.5, '#1e293b');
    helmGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = helmGrad;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#05080f';
    ctx.stroke();

    // Helm crest & gold brow
    drawRoundedRect(ctx, 61, 11, 6, 16, 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(50, 28);
    ctx.lineTo(64, 32);
    ctx.lineTo(78, 28);
    ctx.stroke();

    // Visor slit & glowing fiery eyes
    drawRoundedRect(ctx, 53, 30, 22, 5.5, 2);
    ctx.fillStyle = '#050508';
    ctx.fill();
    drawRadialGlow(ctx, 59, 32.8, 7, '#fef08a', 'rgba(249, 115, 22, 0.7)', 'rgba(249, 115, 22, 0)');
    drawRadialGlow(ctx, 69, 32.8, 7, '#fef08a', 'rgba(249, 115, 22, 0.7)', 'rgba(249, 115, 22, 0)');

    // 5. Ornate Kite Shield (off-hand left)
    drawPolygon(ctx, [
      [25, 53],
      [45, 53],
      [45, 76],
      [35, 90],
      [25, 76],
    ]);
    const shieldGrad = ctx.createLinearGradient(25, 53, 45, 90);
    shieldGrad.addColorStop(0, '#b91c1c');
    shieldGrad.addColorStop(0.55, '#7f1d1d');
    shieldGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = shieldGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = goldGrad;
    ctx.stroke();

    // Shield cross & boss
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, 57);
    ctx.lineTo(35, 84);
    ctx.moveTo(28, 66);
    ctx.lineTo(42, 66);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(35, 66, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#92400e';
    ctx.stroke();
  });
}

function getWarriorSwordTexture(): Texture {
  return getOrBakeTexture('warrior_sword_v1', 96, 96, (ctx) => {
    // Grip pivot at (48, 74)
    // Pommel
    const goldGrad = ctx.createLinearGradient(36, 66, 60, 86);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.5, '#f59e0b');
    goldGrad.addColorStop(1, '#78350f');

    ctx.beginPath();
    ctx.arc(48, 86, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = goldGrad;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#1c1917';
    ctx.stroke();

    // Leather grip
    drawRoundedRect(ctx, 45, 72, 6, 12, 1.5);
    ctx.fillStyle = '#451a03';
    ctx.fill();
    ctx.stroke();

    // Crossguard
    drawPolygon(ctx, [
      [35, 70],
      [48, 65],
      [61, 70],
      [59, 75],
      [48, 72],
      [37, 75],
    ]);
    ctx.fillStyle = goldGrad;
    ctx.fill();
    ctx.stroke();

    // Broad gleaming steel blade
    drawPolygon(ctx, [
      [42, 68],
      [43.5, 18],
      [48, 6],
      [52.5, 18],
      [54, 68],
    ]);
    const bladeGrad = ctx.createLinearGradient(42, 38, 54, 38);
    bladeGrad.addColorStop(0, '#f8fafc');
    bladeGrad.addColorStop(0.45, '#cbd5e1');
    bladeGrad.addColorStop(0.55, '#64748b');
    bladeGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bladeGrad;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // Central fuller & specular edge
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, 65);
    ctx.lineTo(48, 18);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(44, 65);
    ctx.lineTo(45, 18);
    ctx.lineTo(48, 8);
    ctx.stroke();
  });
}

// ---------------------------------------------------------------------------
// Mage Textures (Robe & Hood, Crystal Staff, Pulsing Orb Glow)
// ---------------------------------------------------------------------------

function getMageBodyTexture(): Texture {
  return getOrBakeTexture('mage_body_v1', 128, 128, (ctx) => {
    // Anchor at (64, 116) -> scale ~0.52
    // 1. Velvet Royal-Indigo Robe
    drawPolygon(ctx, [
      [47, 46],
      [81, 46],
      [94, 112],
      [64, 117],
      [34, 112],
    ]);
    const robeGrad = ctx.createLinearGradient(34, 46, 94, 117);
    robeGrad.addColorStop(0, '#312e81');
    robeGrad.addColorStop(0.5, '#1e1b4b');
    robeGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = robeGrad;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#05050a';
    ctx.stroke();

    // Draped fabric folds
    const folds: Array<ReadonlyArray<[number, number]>> = [
      [[49, 48], [58, 48], [52, 114], [38, 111]],
      [[70, 48], [79, 48], [88, 111], [74, 114]],
    ];
    for (const poly of folds) {
      drawPolygon(ctx, poly);
      ctx.fillStyle = 'rgba(79, 70, 229, 0.35)';
      ctx.fill();
    }

    // Gold embroidered hem
    const goldGrad = ctx.createLinearGradient(36, 110, 92, 116);
    goldGrad.addColorStop(0, '#f59e0b');
    goldGrad.addColorStop(0.5, '#fef08a');
    goldGrad.addColorStop(1, '#b45309');
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(36, 110);
    ctx.lineTo(64, 115);
    ctx.lineTo(92, 110);
    ctx.stroke();

    // Central embroidered stole
    drawRoundedRect(ctx, 59, 48, 10, 65, 2);
    ctx.fillStyle = '#4338ca';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    // Arcane diamond sigils on stole
    for (const sy of [66, 82, 98]) {
      drawPolygon(ctx, [
        [64, sy - 4],
        [67, sy],
        [64, sy + 4],
        [61, sy],
      ]);
      ctx.fillStyle = '#67e8f9';
      ctx.fill();
    }

    // 2. Layered Shoulder Mantle
    drawPolygon(ctx, [
      [38, 57],
      [46, 42],
      [82, 42],
      [90, 57],
      [64, 65],
    ]);
    const mantleGrad = ctx.createLinearGradient(38, 42, 90, 65);
    mantleGrad.addColorStop(0, '#4338ca');
    mantleGrad.addColorStop(0.6, '#312e81');
    mantleGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = mantleGrad;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Sapphire throat clasp
    drawRadialGlow(ctx, 64, 48, 7, '#e0f2fe', '#38bdf8', 'rgba(56, 189, 248, 0)');
    ctx.beginPath();
    ctx.arc(64, 48, 3.8, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    // 3. Layered Hood & Glowing Arcane Eyes
    drawPolygon(ctx, [
      [46, 44],
      [44, 21],
      [64, 8],
      [84, 21],
      [82, 44],
    ]);
    const hoodGrad = ctx.createRadialGradient(58, 22, 4, 64, 28, 26);
    hoodGrad.addColorStop(0, '#4f46e5');
    hoodGrad.addColorStop(0.55, '#312e81');
    hoodGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = hoodGrad;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    // Gold hood trim
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(48, 41);
    ctx.lineTo(48, 23);
    ctx.lineTo(64, 12);
    ctx.lineTo(80, 23);
    ctx.lineTo(80, 41);
    ctx.stroke();

    // Deep hood shadow
    ctx.beginPath();
    ctx.ellipse(64, 31, 11, 12.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#050508';
    ctx.fill();

    // Glowing cyan eyes with bloom
    drawRadialGlow(ctx, 59, 30, 6.5, '#e0f2fe', 'rgba(56, 189, 248, 0.7)', 'rgba(56, 189, 248, 0)');
    drawRadialGlow(ctx, 69, 30, 6.5, '#e0f2fe', 'rgba(56, 189, 248, 0.7)', 'rgba(56, 189, 248, 0)');
  });
}

function getMageStaffTexture(): Texture {
  return getOrBakeTexture('mage_staff_v1', 96, 96, (ctx) => {
    // Grip pivot at (48, 64)
    // Ebony shaft
    drawRoundedRect(ctx, 45, 24, 6, 66, 2.5);
    const woodGrad = ctx.createLinearGradient(45, 24, 51, 24);
    woodGrad.addColorStop(0, '#78350f');
    woodGrad.addColorStop(0.5, '#451a03');
    woodGrad.addColorStop(1, '#1c0a00');
    ctx.fillStyle = woodGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    // Gold collar & crescent cradle
    drawRoundedRect(ctx, 43, 22, 10, 5, 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(48, 13, 10.5, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

    // Crystal mana orb
    drawRadialGlow(ctx, 48, 13, 14, 'rgba(34, 211, 238, 0.65)', 'rgba(168, 85, 247, 0.3)', 'rgba(124, 58, 237, 0)');
    const orbGrad = ctx.createRadialGradient(45, 10, 1.5, 48, 13, 8.5);
    orbGrad.addColorStop(0, '#f0f9ff');
    orbGrad.addColorStop(0.35, '#22d3ee');
    orbGrad.addColorStop(0.85, '#7c3aed');
    orbGrad.addColorStop(1, '#4c1d95');
    ctx.beginPath();
    ctx.arc(48, 13, 8, 0, Math.PI * 2);
    ctx.fillStyle = orbGrad;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#c084fc';
    ctx.stroke();

    // Specular highlight
    ctx.beginPath();
    ctx.ellipse(45, 9.5, 2.8, 1.6, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
  });
}

function getOrbGlowTexture(): Texture {
  return getOrBakeTexture('mage_orb_glow_v1', 64, 64, (ctx) => {
    drawRadialGlow(
      ctx,
      32,
      32,
      30,
      'rgba(103, 232, 249, 0.9)',
      'rgba(168, 85, 247, 0.45)',
      'rgba(124, 58, 237, 0)',
    );
  });
}

// ---------------------------------------------------------------------------
// Slime Texture (Translucent Emerald Dome, Subsurface Glow & Bubbles)
// ---------------------------------------------------------------------------

function getSlimeBodyTexture(): Texture {
  return getOrBakeTexture('slime_body_v1', 128, 128, (ctx) => {
    // Base at (64, 112) -> scale ~0.46
    // Outer translucent emerald dome
    ctx.beginPath();
    ctx.moveTo(26, 108);
    ctx.bezierCurveTo(22, 64, 42, 46, 64, 46);
    ctx.bezierCurveTo(86, 46, 106, 64, 102, 108);
    ctx.quadraticCurveTo(64, 118, 26, 108);
    ctx.closePath();

    const domeGrad = ctx.createRadialGradient(56, 72, 6, 64, 84, 48);
    domeGrad.addColorStop(0, 'rgba(110, 231, 183, 0.88)');
    domeGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.84)');
    domeGrad.addColorStop(0.88, 'rgba(4, 120, 87, 0.9)');
    domeGrad.addColorStop(1, 'rgba(2, 44, 34, 0.94)');
    ctx.fillStyle = domeGrad;
    ctx.fill();
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = '#064e3b';
    ctx.stroke();

    // Subsurface lime core glow
    drawRadialGlow(
      ctx,
      64,
      86,
      26,
      'rgba(217, 249, 157, 0.78)',
      'rgba(132, 204, 22, 0.42)',
      'rgba(16, 185, 129, 0)',
    );

    // Floating inner bubbles
    const bubbles: Array<[number, number, number]> = [
      [44, 92, 4.2],
      [82, 88, 3.5],
      [55, 68, 2.8],
      [76, 72, 2.2],
      [64, 98, 2.6],
    ];
    for (const [bx, by, br] of bubbles) {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(236, 253, 245, 0.35)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(167, 243, 208, 0.65)';
      ctx.stroke();
    }

    // Glossy specular highlights
    ctx.beginPath();
    ctx.ellipse(49, 64, 10, 5, -0.45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(40, 74, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();

    // Rim light on right edge
    ctx.strokeStyle = 'rgba(167, 243, 208, 0.55)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(86, 56);
    ctx.quadraticCurveTo(98, 72, 97, 94);
    ctx.stroke();

    // Menacing-cute eyes
    for (const ex of [52, 76]) {
      ctx.beginPath();
      ctx.ellipse(ex, 84, 4.6, 6.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#052e16';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ex + 1.2, 82, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ex - 1, 80.5, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  });
}

// ---------------------------------------------------------------------------
// Wolf Textures (Fur-Shaded Prowling Body & Swaying Bushy Tail)
// ---------------------------------------------------------------------------

function getWolfTailTexture(): Texture {
  return getOrBakeTexture('wolf_tail_v1', 96, 96, (ctx) => {
    // Pivot at base (72, 54)
    ctx.beginPath();
    ctx.moveTo(72, 54);
    ctx.bezierCurveTo(54, 32, 24, 24, 18, 44);
    ctx.bezierCurveTo(24, 62, 52, 68, 72, 58);
    ctx.closePath();

    const tailGrad = ctx.createLinearGradient(18, 32, 72, 62);
    tailGrad.addColorStop(0, '#cbd5e1');
    tailGrad.addColorStop(0.45, '#64748b');
    tailGrad.addColorStop(1, '#334155');
    ctx.fillStyle = tailGrad;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    drawFurStrokes(ctx, [
      { x1: 56, y1: 48, x2: 34, y2: 38, color: 'rgba(226, 232, 240, 0.45)', width: 2 },
      { x1: 52, y1: 55, x2: 30, y2: 49, color: 'rgba(30, 41, 59, 0.5)', width: 2 },
    ]);
  });
}

function getWolfBodyTexture(): Texture {
  return getOrBakeTexture('wolf_body_v1', 128, 128, (ctx) => {
    // Anchor at (64, 112) -> scale ~0.48
    // 1. Back legs (darker slate)
    const backLegGrad = ctx.createLinearGradient(34, 82, 46, 112);
    backLegGrad.addColorStop(0, '#475569');
    backLegGrad.addColorStop(1, '#1e293b');
    for (const [lx, ly, lw, lh] of [
      [34, 82, 9, 28],
      [74, 84, 9, 26],
    ]) {
      drawRoundedRect(ctx, lx, ly, lw, lh, 3);
      ctx.fillStyle = backLegGrad;
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    }

    // 2. Quadruped Body
    ctx.beginPath();
    ctx.ellipse(58, 78, 32, 17, -0.05, 0, Math.PI * 2);
    const bodyGrad = ctx.createLinearGradient(32, 60, 84, 96);
    bodyGrad.addColorStop(0, '#94a3b8');
    bodyGrad.addColorStop(0.5, '#64748b');
    bodyGrad.addColorStop(1, '#334155');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Fur texture strokes along back & flank
    drawFurStrokes(ctx, [
      { x1: 42, y1: 68, x2: 34, y2: 72, color: 'rgba(226, 232, 240, 0.45)', width: 2 },
      { x1: 54, y1: 66, x2: 45, y2: 71, color: 'rgba(226, 232, 240, 0.45)', width: 2 },
      { x1: 66, y1: 67, x2: 56, y2: 73, color: 'rgba(226, 232, 240, 0.4)', width: 2 },
      { x1: 48, y1: 82, x2: 38, y2: 86, color: 'rgba(15, 23, 42, 0.4)', width: 2 },
    ]);

    // 3. Silver Chest Ruff
    drawPolygon(ctx, [
      [70, 61],
      [92, 68],
      [88, 90],
      [68, 86],
    ]);
    const ruffGrad = ctx.createLinearGradient(70, 61, 90, 90);
    ruffGrad.addColorStop(0, '#e2e8f0');
    ruffGrad.addColorStop(0.6, '#94a3b8');
    ruffGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = ruffGrad;
    ctx.fill();

    // 4. Front legs & claws
    for (const [lx, ly, lw, lh, col] of [
      [42, 84, 9, 27, '#475569'],
      [81, 84, 10, 27, '#64748b'],
    ] as const) {
      drawRoundedRect(ctx, lx, ly, lw, lh, 3);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(lx + lw / 2 + 2, 111, 5.5, 2.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
    }

    // 5. Pointed Ears, Head & Snout with Fangs
    drawPolygon(ctx, [
      [75, 62],
      [90, 42],
      [93, 62],
    ]);
    ctx.fillStyle = '#475569';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    drawPolygon(ctx, [
      [86, 63],
      [104, 44],
      [102, 65],
    ]);
    ctx.fillStyle = '#64748b';
    ctx.fill();
    ctx.stroke();

    drawPolygon(ctx, [
      [78, 60],
      [102, 60],
      [115, 72],
      [98, 79],
      [78, 77],
    ]);
    const headGrad = ctx.createLinearGradient(78, 60, 115, 79);
    headGrad.addColorStop(0, '#94a3b8');
    headGrad.addColorStop(0.6, '#64748b');
    headGrad.addColorStop(1, '#475569');
    ctx.fillStyle = headGrad;
    ctx.fill();
    ctx.stroke();

    // Fangs
    drawPolygon(ctx, [
      [101, 77],
      [103, 83],
      [106, 77],
    ]);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    // Nose
    ctx.beginPath();
    ctx.arc(114, 71.5, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#09090b';
    ctx.fill();

    // Glowing amber eye
    drawRadialGlow(ctx, 97, 67, 6, '#fef3c7', 'rgba(245, 158, 11, 0.75)', 'rgba(245, 158, 11, 0)');
  });
}

// ---------------------------------------------------------------------------
// Orc Textures (Muscular Marauder Body & Notched Battleaxe)
// ---------------------------------------------------------------------------

function getOrcBodyTexture(): Texture {
  return getOrBakeTexture('orc_body_v1', 128, 128, (ctx) => {
    // Anchor at (64, 116) -> scale ~0.54
    // 1. Legs & Heavy Boots
    for (const lx of [44, 68]) {
      drawRoundedRect(ctx, lx, 84, 15, 29, 4);
      ctx.fillStyle = '#3f6212';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#1a2e05';
      ctx.stroke();

      drawRoundedRect(ctx, lx - 1, 102, 17, 13, 3);
      ctx.fillStyle = '#451a03';
      ctx.fill();
      ctx.stroke();
    }

    // 2. Broad Muscular Olive-Green Torso
    drawPolygon(ctx, [
      [37, 42],
      [91, 42],
      [85, 87],
      [43, 87],
    ]);
    const skinGrad = ctx.createRadialGradient(58, 56, 6, 64, 65, 36);
    skinGrad.addColorStop(0, '#84cc16');
    skinGrad.addColorStop(0.55, '#4d7c0f');
    skinGrad.addColorStop(1, '#1a2e05');
    ctx.fillStyle = skinGrad;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#142404';
    ctx.stroke();

    // Pectoral & abdominal shading
    ctx.strokeStyle = 'rgba(20, 36, 4, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(46, 58);
    ctx.quadraticCurveTo(55, 62, 64, 57);
    ctx.quadraticCurveTo(73, 62, 82, 58);
    ctx.stroke();

    // Battle scar
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(70, 50);
    ctx.lineTo(78, 68);
    ctx.stroke();

    // Crimson warpaint slashes
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.88)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(47, 50);
    ctx.lineTo(59, 63);
    ctx.moveTo(52, 46);
    ctx.lineTo(64, 59);
    ctx.stroke();

    // Iron belt & fur loincloth
    drawRoundedRect(ctx, 42, 81, 44, 8.5, 2);
    ctx.fillStyle = '#451a03';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    drawPolygon(ctx, [
      [54, 88],
      [74, 88],
      [70, 105],
      [58, 105],
    ]);
    ctx.fillStyle = '#78350f';
    ctx.fill();
    ctx.stroke();

    // 3. Bone-Spiked Shoulder Pauldron
    ctx.beginPath();
    ctx.ellipse(38, 47, 13.5, 11, -0.2, 0, Math.PI * 2);
    const pauldronGrad = ctx.createRadialGradient(35, 43, 2, 38, 47, 14);
    pauldronGrad.addColorStop(0, '#78716c');
    pauldronGrad.addColorStop(1, '#292524');
    ctx.fillStyle = pauldronGrad;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#1c1917';
    ctx.stroke();

    // Bone spikes
    drawPolygon(ctx, [
      [28, 43],
      [18, 31],
      [36, 39],
    ]);
    ctx.fillStyle = '#e7e5e4';
    ctx.fill();
    ctx.stroke();

    // 4. Fierce Orc Head, Warpaint & Tusks
    drawRoundedRect(ctx, 48, 17, 32, 27, 9);
    const headGrad = ctx.createRadialGradient(60, 25, 3, 64, 30, 20);
    headGrad.addColorStop(0, '#84cc16');
    headGrad.addColorStop(0.7, '#4d7c0f');
    headGrad.addColorStop(1, '#1a2e05');
    ctx.fillStyle = headGrad;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#142404';
    ctx.stroke();

    // Red brow warpaint
    drawRoundedRect(ctx, 51, 22, 26, 4.5, 1.5);
    ctx.fillStyle = 'rgba(220, 38, 38, 0.88)';
    ctx.fill();

    // Glowing red eyes
    drawRadialGlow(ctx, 57, 29, 5.5, '#fca5a5', 'rgba(239, 68, 68, 0.75)', 'rgba(239, 68, 68, 0)');
    drawRadialGlow(ctx, 71, 29, 5.5, '#fca5a5', 'rgba(239, 68, 68, 0.75)', 'rgba(239, 68, 68, 0)');

    // Protruding ivory tusks
    for (const [tx, dir] of [
      [53, -1],
      [75, 1],
    ] as const) {
      drawPolygon(ctx, [
        [tx, 41],
        [tx + dir * 2, 31],
        [tx - dir * 3.5, 41],
      ]);
      ctx.fillStyle = '#fef3c7';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#78350f';
      ctx.stroke();
    }
  });
}

function getOrcAxeTexture(): Texture {
  return getOrBakeTexture('orc_axe_v1', 96, 96, (ctx) => {
    // Grip pivot at (44, 68)
    drawRoundedRect(ctx, 41, 20, 6.5, 68, 2.5);
    const haftGrad = ctx.createLinearGradient(41, 20, 47.5, 20);
    haftGrad.addColorStop(0, '#78350f');
    haftGrad.addColorStop(0.5, '#451a03');
    haftGrad.addColorStop(1, '#1c0a00');
    ctx.fillStyle = haftGrad;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    // Heavy notched battleaxe blade
    drawPolygon(ctx, [
      [46, 23],
      [69, 12],
      [75, 26],
      [70, 32],
      [74, 38],
      [69, 48],
      [46, 39],
    ]);
    const axeGrad = ctx.createLinearGradient(46, 12, 75, 48);
    axeGrad.addColorStop(0, '#475569');
    axeGrad.addColorStop(0.65, '#64748b');
    axeGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = axeGrad;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Gleaming edge bevel
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(68, 14);
    ctx.lineTo(73.5, 26);
    ctx.moveTo(72.5, 38);
    ctx.lineTo(68, 46);
    ctx.stroke();
  });
}

// ---------------------------------------------------------------------------
// Boss Golem Textures (Craggy Obsidian & Molten Magma Core)
// ---------------------------------------------------------------------------

function getBossGolemBodyTexture(): Texture {
  return getOrBakeTexture('boss_golem_body_v1', 128, 128, (ctx) => {
    // Anchor at (64, 118) -> scale ~0.62
    const stoneGrad = ctx.createLinearGradient(34, 12, 94, 118);
    stoneGrad.addColorStop(0, '#44403c');
    stoneGrad.addColorStop(0.45, '#292524');
    stoneGrad.addColorStop(1, '#0c0a09');

    // 1. Pillar Legs
    for (const poly of [
      [[40, 86], [56, 86], [58, 117], [37, 117]],
      [[72, 86], [88, 86], [91, 117], [70, 117]],
    ] as ReadonlyArray<ReadonlyArray<[number, number]>>) {
      drawPolygon(ctx, poly);
      ctx.fillStyle = '#1c1917';
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#09090b';
      ctx.stroke();
    }

    // 2. Towering Obsidian Torso
    drawPolygon(ctx, [
      [29, 38],
      [99, 38],
      [89, 89],
      [39, 89],
    ]);
    ctx.fillStyle = stoneGrad;
    ctx.fill();
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    // 3. Craggy Shoulder Boulders
    for (const poly of [
      [[18, 48], [32, 28], [48, 41], [38, 60]],
      [[110, 48], [96, 28], [80, 41], [90, 60]],
    ] as ReadonlyArray<ReadonlyArray<[number, number]>>) {
      drawPolygon(ctx, poly);
      ctx.fillStyle = '#1c1917';
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#09090b';
      ctx.stroke();
    }

    // 4. Heavy Left Gauntlet
    drawPolygon(ctx, [
      [19, 62],
      [33, 62],
      [37, 100],
      [16, 96],
    ]);
    ctx.fillStyle = '#1c1917';
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    // 5. Crowned Obsidian Head
    drawPolygon(ctx, [
      [48, 22],
      [54, 10],
      [64, 17],
      [74, 10],
      [80, 22],
      [78, 41],
      [50, 41],
    ]);
    ctx.fillStyle = '#1c1917';
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    // 6. Glowing Molten Magma Veins & Core
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(41, 44);
    ctx.lineTo(57, 57);
    ctx.lineTo(64, 76);
    ctx.lineTo(78, 84);
    ctx.moveTo(87, 46);
    ctx.lineTo(70, 60);
    ctx.moveTo(28, 43);
    ctx.lineTo(40, 52);
    ctx.moveTo(100, 43);
    ctx.lineTo(88, 52);
    ctx.moveTo(25, 72);
    ctx.lineTo(30, 86);
    ctx.stroke();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(44, 46);
    ctx.lineTo(57, 57);
    ctx.lineTo(64, 74);
    ctx.moveTo(85, 47);
    ctx.lineTo(70, 60);
    ctx.stroke();

    // Molten chest core bloom
    drawRadialGlow(ctx, 64, 61, 14, '#fef08a', 'rgba(249, 115, 22, 0.85)', 'rgba(249, 115, 22, 0)');

    // Glowing magma eyes
    drawRadialGlow(ctx, 57, 31, 6, '#fef08a', 'rgba(251, 191, 36, 0.8)', 'rgba(249, 115, 22, 0)');
    drawRadialGlow(ctx, 71, 31, 6, '#fef08a', 'rgba(251, 191, 36, 0.8)', 'rgba(249, 115, 22, 0)');
  });
}

function getBossGolemGauntletTexture(): Texture {
  return getOrBakeTexture('boss_golem_gauntlet_v1', 96, 96, (ctx) => {
    // Pivot at (48, 22)
    drawPolygon(ctx, [
      [39, 18],
      [57, 18],
      [62, 58],
      [36, 58],
    ]);
    const gGrad = ctx.createLinearGradient(36, 18, 62, 58);
    gGrad.addColorStop(0, '#44403c');
    gGrad.addColorStop(0.5, '#1c1917');
    gGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = gGrad;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#050508';
    ctx.stroke();

    // Glowing magma fissure & knuckles
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(45, 26);
    ctx.lineTo(52, 40);
    ctx.lineTo(46, 51);
    ctx.stroke();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });
}

// ---------------------------------------------------------------------------
// Shadow, Ring, HP Bar & Nameplate
// ---------------------------------------------------------------------------

function drawShadowAndRing(
  parent: Container,
  radiusX: number,
  radiusY: number,
  ringColor?: number,
): void {
  const shadow = new Graphics();
  shadow.ellipse(0, 2, radiusX, radiusY).fill({ color: 0x050508, alpha: 0.34 });
  shadow
    .ellipse(0, 2, radiusX * 0.65, radiusY * 0.65)
    .fill({ color: 0x050508, alpha: 0.45 });

  if (ringColor !== undefined) {
    shadow
      .ellipse(0, 2, radiusX + 4, radiusY + 2.5)
      .stroke({ color: ringColor, width: 2, alpha: 0.85 });
    shadow
      .ellipse(0, 2, radiusX + 7, radiusY + 4)
      .stroke({ color: ringColor, width: 1, alpha: 0.3 });
  }

  parent.addChild(shadow);
}

function createHpAndLabel(
  parent: Container,
  label: string,
  topY: number,
  width: number,
  height: number,
  fillColor: number,
  nameColor: number,
  isBoss: boolean,
): Graphics {
  const barX = -width / 2;
  const barY = topY;

  const hpBg = new Graphics();
  hpBg
    .roundRect(barX - 1.5, barY - 1.5, width + 3, height + 3, 3)
    .fill({ color: 0x09090b, alpha: 0.88 })
    .stroke({ color: isBoss ? 0xf59e0b : 0x3f3f46, width: isBoss ? 1.5 : 1, alpha: 0.9 });
  hpBg
    .roundRect(barX, barY, width, height, 2)
    .fill({ color: 0x18181b, alpha: 0.95 });
  parent.addChild(hpBg);

  const hpFill = new Graphics();
  hpFill
    .roundRect(0, 0, width, height, 2)
    .fill({ color: fillColor, alpha: 1 });
  hpFill
    .roundRect(1, 1, Math.max(0, width - 2), Math.max(1, height * 0.35), 1)
    .fill({ color: 0xffffff, alpha: 0.25 });
  hpFill.position.set(barX, barY);
  parent.addChild(hpFill);

  const nameText = new Text({
    text: label,
    style: new TextStyle({
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: isBoss ? 13 : 11,
      fontWeight: 'bold',
      fill: nameColor,
      stroke: { color: 0x09090b, width: 3.5 },
      dropShadow: {
        color: 0x000000,
        alpha: 0.9,
        blur: 3,
        distance: 1,
      },
    }),
  });
  nameText.anchor.set(0.5, 1);
  nameText.position.set(0, barY - 4);
  parent.addChild(nameText);

  return hpFill;
}

// ---------------------------------------------------------------------------
// Rig Builders
// ---------------------------------------------------------------------------

function buildWarriorParts(bodyGroup: Container): {
  weaponPart: Container;
  capeSprite: Sprite;
} {
  const capeSprite = new Sprite(getWarriorCapeTexture());
  capeSprite.anchor.set(0.5, 16 / 96);
  capeSprite.position.set(-2, -37);
  capeSprite.scale.set(0.52);
  bodyGroup.addChild(capeSprite);

  const bodySprite = new Sprite(getWarriorBodyTexture());
  bodySprite.anchor.set(0.5, 116 / 128);
  bodySprite.scale.set(0.52);
  bodyGroup.addChild(bodySprite);

  const weaponPart = new Container();
  weaponPart.position.set(13, -23);

  const swordSprite = new Sprite(getWarriorSwordTexture());
  swordSprite.anchor.set(0.5, 74 / 96);
  swordSprite.scale.set(0.52);
  weaponPart.addChild(swordSprite);

  weaponPart.rotation = 0.22;
  bodyGroup.addChild(weaponPart);

  return { weaponPart, capeSprite };
}

function buildMageParts(bodyGroup: Container): {
  weaponPart: Container;
  auraRing: Graphics;
  orbGlowSprite: Sprite;
} {
  const auraRing = new Graphics();
  auraRing.position.set(0, -33);
  auraRing
    .circle(0, 0, 21)
    .stroke({ color: 0x38bdf8, width: 1.4, alpha: 0.55 });
  auraRing
    .circle(0, 0, 17)
    .stroke({ color: 0xa855f7, width: 1, alpha: 0.45 });
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const rx = Math.cos(angle) * 21;
    const ry = Math.sin(angle) * 21;
    auraRing.circle(rx, ry, 2).fill({ color: 0x67e8f9, alpha: 0.85 });
  }
  bodyGroup.addChild(auraRing);

  const bodySprite = new Sprite(getMageBodyTexture());
  bodySprite.anchor.set(0.5, 116 / 128);
  bodySprite.scale.set(0.52);
  bodyGroup.addChild(bodySprite);

  const weaponPart = new Container();
  weaponPart.position.set(13, -22);

  const staffSprite = new Sprite(getMageStaffTexture());
  staffSprite.anchor.set(0.5, 64 / 96);
  staffSprite.scale.set(0.52);
  weaponPart.addChild(staffSprite);

  const orbGlowSprite = new Sprite(getOrbGlowTexture());
  orbGlowSprite.anchor.set(0.5);
  orbGlowSprite.position.set(0, -26.5);
  orbGlowSprite.scale.set(0.52);
  weaponPart.addChild(orbGlowSprite);

  weaponPart.rotation = 0.14;
  bodyGroup.addChild(weaponPart);

  return { weaponPart, auraRing, orbGlowSprite };
}

function buildSlimeParts(bodyGroup: Container): Container {
  const slimeSprite = new Sprite(getSlimeBodyTexture());
  slimeSprite.anchor.set(0.5, 112 / 128);
  slimeSprite.scale.set(0.46);
  bodyGroup.addChild(slimeSprite);
  return new Container();
}

function buildWolfParts(bodyGroup: Container): {
  weaponPart: Container;
  tailSprite: Sprite;
} {
  const tailSprite = new Sprite(getWolfTailTexture());
  tailSprite.anchor.set(72 / 96, 54 / 96);
  tailSprite.position.set(-13, -15);
  tailSprite.scale.set(0.48);
  bodyGroup.addChild(tailSprite);

  const wolfSprite = new Sprite(getWolfBodyTexture());
  wolfSprite.anchor.set(0.5, 112 / 128);
  wolfSprite.scale.set(0.48);
  bodyGroup.addChild(wolfSprite);

  return { weaponPart: new Container(), tailSprite };
}

function buildOrcParts(bodyGroup: Container): Container {
  const orcSprite = new Sprite(getOrcBodyTexture());
  orcSprite.anchor.set(0.5, 116 / 128);
  orcSprite.scale.set(0.54);
  bodyGroup.addChild(orcSprite);

  const weaponPart = new Container();
  weaponPart.position.set(15, -24);

  const axeSprite = new Sprite(getOrcAxeTexture());
  axeSprite.anchor.set(44 / 96, 68 / 96);
  axeSprite.scale.set(0.54);
  weaponPart.addChild(axeSprite);

  weaponPart.rotation = 0.25;
  bodyGroup.addChild(weaponPart);

  return weaponPart;
}

function buildBossGolemParts(bodyGroup: Container): {
  weaponPart: Container;
  auraRing: Graphics;
} {
  const auraRing = new Graphics();
  auraRing.position.set(0, -36);
  auraRing
    .circle(0, 0, 34)
    .stroke({ color: 0xf97316, width: 1.8, alpha: 0.55 });
  auraRing
    .circle(0, 0, 28)
    .stroke({ color: 0xfbbf24, width: 1, alpha: 0.35 });

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const rx = Math.cos(angle) * 34;
    const ry = Math.sin(angle) * 34;
    auraRing
      .poly([rx - 4, ry, rx, ry - 5, rx + 4, ry, rx, ry + 5])
      .fill({ color: 0x292524 })
      .stroke({ color: 0xf97316, width: 1.4 });
    auraRing.circle(rx, ry, 1.6).fill({ color: 0xfbbf24 });
  }
  bodyGroup.addChild(auraRing);

  const golemSprite = new Sprite(getBossGolemBodyTexture());
  golemSprite.anchor.set(0.5, 118 / 128);
  golemSprite.scale.set(0.62);
  bodyGroup.addChild(golemSprite);

  const weaponPart = new Container();
  weaponPart.position.set(22, -32);

  const gauntletSprite = new Sprite(getBossGolemGauntletTexture());
  gauntletSprite.anchor.set(0.5, 22 / 96);
  gauntletSprite.scale.set(0.62);
  weaponPart.addChild(gauntletSprite);

  bodyGroup.addChild(weaponPart);

  return { weaponPart, auraRing };
}

// ---------------------------------------------------------------------------
// Exported Public API
// ---------------------------------------------------------------------------

export function createHeroRig(
  name: string,
  heroClass: HeroClass,
  isSelf: boolean,
): UnitRig {
  const container = new Container();
  const bodyGroup = new Container();

  const ringColor = isSelf ? 0x38bdf8 : undefined;
  drawShadowAndRing(container, 17, 7.5, ringColor);

  let weaponPart: Container;
  let auraRing: Graphics | undefined;
  let capeSprite: Sprite | undefined;
  let orbGlowSprite: Sprite | undefined;

  if (heroClass === 'mage') {
    const built = buildMageParts(bodyGroup);
    weaponPart = built.weaponPart;
    auraRing = built.auraRing;
    orbGlowSprite = built.orbGlowSprite;
  } else {
    const built = buildWarriorParts(bodyGroup);
    weaponPart = built.weaponPart;
    capeSprite = built.capeSprite;
  }

  container.addChild(bodyGroup);

  const hpWidth = 44;
  const hpHeight = 5;
  const fillColor = heroClass === 'mage' ? 0x38bdf8 : 0x22c55e;
  const nameColor = isSelf ? 0xfef08a : 0xf1f5f9;
  const hpFill = createHpAndLabel(
    container,
    name,
    -66,
    hpWidth,
    hpHeight,
    fillColor,
    nameColor,
    false,
  );

  const rig: UnitRig = {
    container,
    bodyGroup,
    weaponPart,
    auraRing,
    hpFill,
    animTime: Math.random() * Math.PI * 2,
    attackTimer: 0,
    hitFlashTimer: 0,
  };

  rigMetaMap.set(rig, {
    baseScale: 1,
    hpWidth,
    hpHeight,
    isSlime: false,
    isBoss: false,
    baseWeaponRot: weaponPart.rotation,
    capeSprite,
    orbGlowSprite,
  });

  return rig;
}

export function createMonsterRig(
  templateId: string,
  label: string,
  scale: number,
  isBoss = false,
): UnitRig {
  const container = new Container();
  const bodyGroup = new Container();

  const effectiveBoss = isBoss || templateId === 'boss_golem';
  const safeScale = Math.max(0.4, scale || 1);

  drawShadowAndRing(
    container,
    18 * safeScale,
    8 * safeScale,
    effectiveBoss ? 0xf97316 : undefined,
  );

  let weaponPart: Container;
  let auraRing: Graphics | undefined;
  let tailSprite: Sprite | undefined;
  let rawHeight = 48;

  if (templateId === 'slime') {
    weaponPart = buildSlimeParts(bodyGroup);
    rawHeight = 32;
  } else if (templateId === 'wolf') {
    const built = buildWolfParts(bodyGroup);
    weaponPart = built.weaponPart;
    tailSprite = built.tailSprite;
    rawHeight = 36;
  } else if (templateId === 'boss_golem') {
    const built = buildBossGolemParts(bodyGroup);
    weaponPart = built.weaponPart;
    auraRing = built.auraRing;
    rawHeight = 72;
  } else {
    weaponPart = buildOrcParts(bodyGroup);
    rawHeight = 56;
  }

  bodyGroup.scale.set(safeScale);
  container.addChild(bodyGroup);

  const hpWidth = effectiveBoss ? 68 : 44;
  const hpHeight = effectiveBoss ? 6.5 : 5;
  const topY = -(rawHeight * safeScale + 12);
  const hpFill = createHpAndLabel(
    container,
    label,
    topY,
    hpWidth,
    hpHeight,
    effectiveBoss ? 0xf97316 : 0xef4444,
    effectiveBoss ? 0xfbbf24 : 0xfca5a5,
    effectiveBoss,
  );

  const rig: UnitRig = {
    container,
    bodyGroup,
    weaponPart,
    auraRing,
    hpFill,
    animTime: Math.random() * Math.PI * 2,
    attackTimer: 0,
    hitFlashTimer: 0,
  };

  rigMetaMap.set(rig, {
    baseScale: safeScale,
    hpWidth,
    hpHeight,
    isSlime: templateId === 'slime',
    isBoss: effectiveBoss,
    baseWeaponRot: weaponPart.rotation,
    tailSprite,
  });

  return rig;
}

export function triggerAttackAnim(rig: UnitRig): void {
  rig.attackTimer = ATTACK_DURATION;
}

export function triggerHitFlash(rig: UnitRig): void {
  rig.hitFlashTimer = HIT_FLASH_DURATION;
}

export function updateUnitRig(
  rig: UnitRig,
  dt: number,
  isMoving: boolean,
  facingRight: boolean,
  hpRatio: number,
  isMonster: boolean,
): void {
  const meta = rigMetaMap.get(rig);
  const baseScale = meta?.baseScale ?? 1;
  const baseWeaponRot = meta?.baseWeaponRot ?? 0.2;
  const isSlime = meta?.isSlime ?? false;

  rig.animTime += dt;

  // Idle breathing & slime squash-and-stretch
  const breathSpeed = isSlime ? 4.2 : isMoving ? 8.5 : 2.8;
  const breathAmp = isSlime ? 0.085 : 0.028;
  const breathWave = Math.sin(rig.animTime * breathSpeed);

  const dir = facingRight ? 1 : -1;
  const squashX = isSlime ? 1 - breathWave * 0.065 : 1;
  rig.bodyGroup.scale.x = dir * baseScale * squashX;
  rig.bodyGroup.scale.y = baseScale * (1 + breathWave * breathAmp);

  // Walking bounce
  if (isMoving) {
    const bounceSpeed = isMonster ? 11 : 13;
    const bounceAmp = isSlime ? 4.5 : 3.2;
    rig.bodyGroup.y = -Math.abs(Math.sin(rig.animTime * bounceSpeed)) * bounceAmp;
  } else {
    rig.bodyGroup.y = 0;
  }

  // Flowing cape sway (Warrior)
  if (meta?.capeSprite) {
    const capeSpeed = isMoving ? 8.0 : 2.6;
    const capeAmp = isMoving ? 0.13 : 0.05;
    meta.capeSprite.rotation = Math.sin(rig.animTime * capeSpeed) * capeAmp + (isMoving ? 0.1 : 0.02);
    meta.capeSprite.scale.x = 0.52 * (1 + Math.cos(rig.animTime * capeSpeed) * 0.06);
  }

  // Bushy tail wag (Wolf)
  if (meta?.tailSprite) {
    const tailSpeed = isMoving ? 9.5 : 4.0;
    meta.tailSprite.rotation = Math.sin(rig.animTime * tailSpeed) * (isMoving ? 0.24 : 0.14);
  }

  // Pulsing mana orb glow (Mage)
  if (meta?.orbGlowSprite) {
    const pulse = 0.5 + 0.5 * Math.sin(rig.animTime * 4.2);
    meta.orbGlowSprite.alpha = 0.55 + pulse * 0.45;
    meta.orbGlowSprite.scale.set(0.46 + pulse * 0.14);
  }

  // Weapon swing animation
  if (rig.attackTimer > 0) {
    rig.attackTimer = Math.max(0, rig.attackTimer - dt);
    const progress = 1 - rig.attackTimer / ATTACK_DURATION;
    const swing = Math.sin(progress * Math.PI);
    rig.weaponPart.rotation = baseWeaponRot + swing * 1.45 - 0.35 * (1 - progress);
  } else {
    rig.weaponPart.rotation =
      baseWeaponRot + Math.sin(rig.animTime * 2.4) * 0.04;
  }

  // Hit flash
  if (rig.hitFlashTimer > 0) {
    rig.hitFlashTimer = Math.max(0, rig.hitFlashTimer - dt);
    rig.bodyGroup.tint = 0xff6666;
  } else {
    rig.bodyGroup.tint = 0xffffff;
  }

  // Aura rotation (Mage rune halo / Boss magma rune ring)
  if (rig.auraRing) {
    rig.auraRing.rotation += dt * (meta?.isBoss ? 1.15 : 0.85);
  }

  // Smooth HP bar update
  const clampedHp = Math.max(0, Math.min(1, hpRatio));
  rig.hpFill.scale.x = clampedHp;
}
