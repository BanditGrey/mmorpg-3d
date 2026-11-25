import * as THREE from 'three';
import { HeroClass } from '@mmorpg/shared';

export interface Rig3D {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  capeOrTail?: THREE.Object3D;
  auraMesh?: THREE.Object3D;
  hpFillMesh: THREE.Mesh;
  animTime: number;
  attackTimer: number;
  hitFlashTimer: number;
  baseScale: number;
}

type Archetype = 'hero' | 'slime' | 'wolf' | 'orc' | 'boss_golem';

interface FlashTarget {
  mat: THREE.MeshStandardMaterial;
  baseEmissive: THREE.Color;
  baseIntensity: number;
}

interface RigUserData {
  archetype: Archetype;
  flashTargets: FlashTarget[];
  hpWidth: number;
  extraLegs?: [THREE.Group, THREE.Group];
  selfRing?: THREE.Mesh;
}

const ATTACK_DURATION = 0.36;
const HIT_FLASH_DURATION = 0.22;
const FLASH_COLOR = new THREE.Color(0xff4444);

function makePBR(
  color: number,
  options: {
    metalness?: number;
    roughness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
    side?: THREE.Side;
  } = {},
  flashTargets?: FlashTarget[]
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: options.metalness ?? 0.25,
    roughness: options.roughness ?? 0.55,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
  });

  if (flashTargets) {
    flashTargets.push({
      mat,
      baseEmissive: mat.emissive.clone(),
      baseIntensity: mat.emissiveIntensity,
    });
  }

  return mat;
}

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  pos: [number, number, number] = [0, 0, 0],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
  castShadow = true
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = castShadow;
  parent.add(mesh);
  return mesh;
}

function createNameSprite(
  label: string,
  color: string,
  isBold = true
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fontSize = 42;
    ctx.font = `${isBold ? '700' : '600'} ${fontSize}px "Segoe UI", system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(label);
    const pillW = Math.min(480, Math.max(120, metrics.width + 48));
    const pillH = 64;
    const pillX = (canvas.width - pillW) / 2;
    const pillY = (canvas.height - pillH) / 2;

    // Dark translucent pill backdrop
    ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Crisp outline + text
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeText(label, canvas.width / 2, canvas.height / 2 + 1);

    ctx.fillStyle = color;
    ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.9, 0.48, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function createHpBar(
  root: THREE.Group,
  yPos: number,
  width: number,
  fillColor: number
): THREE.Mesh {
  const hpGroup = new THREE.Group();
  hpGroup.position.set(0, yPos, 0);
  // Tilt slightly upward so it reads cleanly from both isometric and chase cameras
  hpGroup.rotation.x = -0.35;

  const height = 0.11;
  const bgMat = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.06, height + 0.05), bgMat);
  hpBg.renderOrder = 18;
  hpGroup.add(hpBg);

  const fillMat = new THREE.MeshBasicMaterial({
    color: fillColor,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const hpFillMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), fillMat);
  hpFillMesh.position.z = 0.008;
  hpFillMesh.renderOrder = 19;
  hpGroup.add(hpFillMesh);

  root.add(hpGroup);
  return hpFillMesh;
}

function createBipedLimbs(
  bodyPivot: THREE.Group,
  legColor: number,
  bootColor: number,
  armColor: number,
  gloveColor: number,
  flashTargets: FlashTarget[],
  metallic = false
): {
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
} {
  const metal = metallic ? 0.65 : 0.15;
  const rough = metallic ? 0.35 : 0.65;

  const legMat = makePBR(legColor, { metalness: metal, roughness: rough }, flashTargets);
  const bootMat = makePBR(bootColor, { metalness: 0.35, roughness: 0.5 }, flashTargets);
  const armMat = makePBR(armColor, { metalness: metal, roughness: rough }, flashTargets);
  const gloveMat = makePBR(gloveColor, { metalness: 0.4, roughness: 0.45 }, flashTargets);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0.62, 0);
  addMesh(leftLeg, new THREE.CylinderGeometry(0.095, 0.08, 0.46, 10), legMat, [0, -0.23, 0]);
  addMesh(leftLeg, new THREE.BoxGeometry(0.16, 0.16, 0.24), bootMat, [0, -0.52, 0.03]);
  bodyPivot.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.14, 0.62, 0);
  addMesh(rightLeg, new THREE.CylinderGeometry(0.095, 0.08, 0.46, 10), legMat, [0, -0.23, 0]);
  addMesh(rightLeg, new THREE.BoxGeometry(0.16, 0.16, 0.24), bootMat, [0, -0.52, 0.03]);
  bodyPivot.add(rightLeg);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.34, 1.22, 0);
  addMesh(leftArm, new THREE.CylinderGeometry(0.08, 0.068, 0.42, 10), armMat, [0, -0.21, 0]);
  addMesh(leftArm, new THREE.SphereGeometry(0.085, 10, 10), gloveMat, [0, -0.45, 0]);
  bodyPivot.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.34, 1.22, 0);
  addMesh(rightArm, new THREE.CylinderGeometry(0.08, 0.068, 0.42, 10), armMat, [0, -0.21, 0]);
  addMesh(rightArm, new THREE.SphereGeometry(0.085, 10, 10), gloveMat, [0, -0.45, 0]);
  bodyPivot.add(rightArm);

  return { leftArm, rightArm, leftLeg, rightLeg };
}

function buildKiteShield(
  primaryColor: number,
  trimColor: number,
  crestColor: number,
  flashTargets: FlashTarget[]
): THREE.Group {
  const shield = new THREE.Group();
  const faceMat = makePBR(primaryColor, { metalness: 0.72, roughness: 0.3 }, flashTargets);
  const trimMat = makePBR(trimColor, { metalness: 0.85, roughness: 0.22 }, flashTargets);
  const crestMat = makePBR(crestColor, { metalness: 0.3, roughness: 0.4, emissive: crestColor, emissiveIntensity: 0.25 }, flashTargets);

  // Upper shield plate & tapered lower tip
  addMesh(shield, new THREE.BoxGeometry(0.34, 0.34, 0.05), faceMat, [0, 0.08, 0]);
  addMesh(shield, new THREE.ConeGeometry(0.22, 0.32, 4), faceMat, [0, -0.22, 0], [Math.PI, Math.PI / 4, 0], [1, 1, 0.22]);
  // Gold/Trim border
  addMesh(shield, new THREE.BoxGeometry(0.38, 0.05, 0.06), trimMat, [0, 0.25, 0]);
  addMesh(shield, new THREE.BoxGeometry(0.05, 0.34, 0.06), trimMat, [-0.17, 0.08, 0]);
  addMesh(shield, new THREE.BoxGeometry(0.05, 0.34, 0.06), trimMat, [0.17, 0.08, 0]);
  // Center boss/crest
  addMesh(shield, new THREE.OctahedronGeometry(0.08, 0), crestMat, [0, 0.06, 0.035], [0, 0, 0], [1, 1.3, 0.5]);

  return shield;
}

export function createHeroModel3D(
  name: string,
  heroClass: HeroClass,
  isSelf: boolean
): Rig3D {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const flashTargets: FlashTarget[] = [];
  let capeOrTail: THREE.Object3D | undefined;
  let auraMesh: THREE.Object3D | undefined;

  let limbs: ReturnType<typeof createBipedLimbs>;

  if (heroClass === 'warrior') {
    limbs = createBipedLimbs(bodyPivot, 0x475569, 0x334155, 0x64748b, 0x94a3b8, flashTargets, true);

    const steelMat = makePBR(0x64748b, { metalness: 0.8, roughness: 0.28 }, flashTargets);
    const goldMat = makePBR(0xfbbf24, { metalness: 0.88, roughness: 0.2 }, flashTargets);
    const capeMat = makePBR(0xb91c1c, { metalness: 0.1, roughness: 0.78, side: THREE.DoubleSide }, flashTargets);
    const hornMat = makePBR(0xe2e8f0, { metalness: 0.65, roughness: 0.3 }, flashTargets);
    const visorMat = makePBR(0xf59e0b, { metalness: 0.2, roughness: 0.2, emissive: 0xf59e0b, emissiveIntensity: 1.4 }, flashTargets);

    // Steel plate torso + gold trim
    addMesh(bodyPivot, new THREE.CylinderGeometry(0.27, 0.22, 0.66, 8), steelMat, [0, 0.96, 0]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.46, 0.12, 0.34), goldMat, [0, 0.66, 0]); // Gold belt
    addMesh(bodyPivot, new THREE.BoxGeometry(0.36, 0.22, 0.36), goldMat, [0, 1.12, 0.02]); // Chest trim

    // Pauldrons
    addMesh(bodyPivot, new THREE.SphereGeometry(0.16, 10, 10), steelMat, [-0.36, 1.26, 0], [0, 0, 0.3], [1.1, 0.85, 1.1]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.16, 10, 10), steelMat, [0.36, 1.26, 0], [0, 0, -0.3], [1.1, 0.85, 1.1]);
    addMesh(bodyPivot, new THREE.TorusGeometry(0.14, 0.025, 6, 12), goldMat, [-0.36, 1.24, 0], [Math.PI / 2, 0.25, 0]);
    addMesh(bodyPivot, new THREE.TorusGeometry(0.14, 0.025, 6, 12), goldMat, [0.36, 1.24, 0], [Math.PI / 2, -0.25, 0]);

    // Horned iron helm + glowing visor
    addMesh(bodyPivot, new THREE.CylinderGeometry(0.19, 0.2, 0.34, 10), steelMat, [0, 1.5, 0]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.19, 10, 10), steelMat, [0, 1.62, 0]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.24, 0.06, 0.08), visorMat, [0, 1.52, 0.17]);
    addMesh(bodyPivot, new THREE.ConeGeometry(0.055, 0.28, 8), hornMat, [-0.21, 1.68, 0], [0, 0, 0.65]);
    addMesh(bodyPivot, new THREE.ConeGeometry(0.055, 0.28, 8), hornMat, [0.21, 1.68, 0], [0, 0, -0.65]);

    // Crimson flowing cape
    const capeGroup = new THREE.Group();
    capeGroup.position.set(0, 1.24, -0.21);
    addMesh(capeGroup, new THREE.PlaneGeometry(0.56, 0.92, 4, 4), capeMat, [0, -0.46, -0.04], [0.16, 0, 0]);
    bodyPivot.add(capeGroup);
    capeOrTail = capeGroup;

    // Kite shield on leftArm
    const shield = buildKiteShield(0x475569, 0xfbbf24, 0xdc2626, flashTargets);
    shield.position.set(-0.08, -0.34, 0.14);
    shield.rotation.y = -Math.PI / 3;
    limbs.leftArm.add(shield);

    // Metallic greatsword on rightArm
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -0.44, 0.08);
    swordGroup.rotation.x = Math.PI / 2.4;
    addMesh(swordGroup, new THREE.CylinderGeometry(0.03, 0.03, 0.24, 8), goldMat, [0, -0.1, 0]);
    addMesh(swordGroup, new THREE.BoxGeometry(0.28, 0.05, 0.07), goldMat, [0, 0.02, 0]); // Crossguard
    addMesh(swordGroup, new THREE.BoxGeometry(0.09, 0.88, 0.025), hornMat, [0, 0.48, 0]); // Blade
    addMesh(swordGroup, new THREE.ConeGeometry(0.064, 0.18, 4), hornMat, [0, 1.0, 0], [0, Math.PI / 4, 0], [1, 1, 0.35]);
    limbs.rightArm.add(swordGroup);
  } else if (heroClass === 'mage') {
    limbs = createBipedLimbs(bodyPivot, 0x1e1b4b, 0x312e81, 0x312e81, 0xe0f2fe, flashTargets, false);

    const indigoMat = makePBR(0x312e81, { metalness: 0.2, roughness: 0.65 }, flashTargets);
    const hoodMat = makePBR(0x1e1b4b, { metalness: 0.15, roughness: 0.72 }, flashTargets);
    const goldMat = makePBR(0xf59e0b, { metalness: 0.85, roughness: 0.22 }, flashTargets);
    const cyanGlow = makePBR(0x22d3ee, { metalness: 0.1, roughness: 0.15, emissive: 0x06b6d4, emissiveIntensity: 1.6 }, flashTargets);
    const darkFaceMat = makePBR(0x09090b, { metalness: 0.05, roughness: 0.9 }, flashTargets);

    // Royal-indigo & gold-trimmed robe
    addMesh(bodyPivot, new THREE.CylinderGeometry(0.22, 0.38, 0.92, 12), indigoMat, [0, 0.56, 0]);
    addMesh(bodyPivot, new THREE.CylinderGeometry(0.24, 0.22, 0.38, 10), indigoMat, [0, 1.12, 0]);
    addMesh(bodyPivot, new THREE.TorusGeometry(0.23, 0.032, 8, 16), goldMat, [0, 0.94, 0], [Math.PI / 2, 0, 0]); // Gold sash
    addMesh(bodyPivot, new THREE.TorusGeometry(0.37, 0.025, 8, 16), goldMat, [0, 0.12, 0], [Math.PI / 2, 0, 0]); // Robe hem trim

    // Hooded head with glowing cyan eyes
    addMesh(bodyPivot, new THREE.SphereGeometry(0.21, 12, 12), hoodMat, [0, 1.52, -0.02]);
    addMesh(bodyPivot, new THREE.ConeGeometry(0.22, 0.34, 10), hoodMat, [0, 1.68, -0.08], [-0.45, 0, 0]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.15, 10, 10), darkFaceMat, [0, 1.5, 0.07]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.032, 8, 8), cyanGlow, [-0.065, 1.52, 0.19]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.032, 8, 8), cyanGlow, [0.065, 1.52, 0.19]);

    // Floating orbiting arcane ring (auraMesh)
    const auraGroup = new THREE.Group();
    auraGroup.position.set(0, 1.02, 0);
    addMesh(auraGroup, new THREE.TorusGeometry(0.56, 0.022, 8, 28), cyanGlow, [0, 0, 0], [Math.PI / 2.2, 0.2, 0], [1, 1, 1], false);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      addMesh(
        auraGroup,
        new THREE.OctahedronGeometry(0.055, 0),
        cyanGlow,
        [Math.cos(a) * 0.56, 0.04 * (i % 2 === 0 ? 1 : -1), Math.sin(a) * 0.56],
        [0, 0, 0],
        [1, 1.4, 1],
        false
      );
    }
    bodyPivot.add(auraGroup);
    auraMesh = auraGroup;

    // Ornate crystal staff with glowing cyan orb on rightArm
    const staff = new THREE.Group();
    staff.position.set(0, -0.42, 0.08);
    staff.rotation.x = Math.PI / 3;
    const woodMat = makePBR(0x451a03, { metalness: 0.15, roughness: 0.65 }, flashTargets);
    addMesh(staff, new THREE.CylinderGeometry(0.028, 0.025, 1.35, 8), woodMat, [0, 0.3, 0]);
    addMesh(staff, new THREE.TorusGeometry(0.09, 0.02, 8, 12), goldMat, [0, 0.98, 0], [0, Math.PI / 2, 0]);
    addMesh(staff, new THREE.SphereGeometry(0.1, 12, 12), cyanGlow, [0, 1.06, 0]);
    limbs.rightArm.add(staff);
  } else if (heroClass === 'archer') {
    limbs = createBipedLimbs(bodyPivot, 0x3f2e18, 0x451a03, 0x166534, 0x78350f, flashTargets, false);

    const emeraldMat = makePBR(0x166534, { metalness: 0.15, roughness: 0.68 }, flashTargets);
    const hoodMat = makePBR(0x14532d, { metalness: 0.1, roughness: 0.72 }, flashTargets);
    const leatherMat = makePBR(0x78350f, { metalness: 0.2, roughness: 0.6 }, flashTargets);
    const bowMat = makePBR(0x92400e, { metalness: 0.25, roughness: 0.45 }, flashTargets);
    const arrowGlow = makePBR(0x10b981, { metalness: 0.2, roughness: 0.2, emissive: 0x34d399, emissiveIntensity: 1.3 }, flashTargets);
    const skinMat = makePBR(0xf1c27d, { metalness: 0.05, roughness: 0.7 }, flashTargets);

    // Forest-emerald ranger tunic + leather straps
    addMesh(bodyPivot, new THREE.CylinderGeometry(0.24, 0.26, 0.68, 10), emeraldMat, [0, 0.95, 0]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.42, 0.1, 0.34), leatherMat, [0, 0.68, 0]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.1, 0.62, 0.36), leatherMat, [0, 0.98, 0], [0, 0, 0.4]);

    // Hooded head
    addMesh(bodyPivot, new THREE.SphereGeometry(0.18, 12, 12), skinMat, [0, 1.5, 0.03]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), hoodMat, [0, 1.54, -0.02], [-0.3, 0, 0]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.026, 8, 8), arrowGlow, [-0.06, 1.52, 0.19]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.026, 8, 8), arrowGlow, [0.06, 1.52, 0.19]);

    // Quiver on back
    const quiver = new THREE.Group();
    quiver.position.set(-0.1, 1.05, -0.22);
    quiver.rotation.z = -0.35;
    addMesh(quiver, new THREE.CylinderGeometry(0.07, 0.055, 0.48, 8), leatherMat, [0, 0, 0]);
    addMesh(quiver, new THREE.ConeGeometry(0.04, 0.1, 6), arrowGlow, [-0.02, 0.27, 0]);
    addMesh(quiver, new THREE.ConeGeometry(0.04, 0.1, 6), arrowGlow, [0.02, 0.26, 0.02]);
    bodyPivot.add(quiver);

    // Curved elven bow on leftArm
    const bow = new THREE.Group();
    bow.position.set(-0.04, -0.42, 0.12);
    bow.rotation.y = Math.PI / 2;
    addMesh(bow, new THREE.TorusGeometry(0.42, 0.024, 8, 20, Math.PI * 1.15), bowMat, [-0.15, 0, 0], [0, 0, -Math.PI * 0.57]);
    const stringMat = makePBR(0xe2e8f0, { metalness: 0.1, roughness: 0.4 }, flashTargets);
    addMesh(bow, new THREE.CylinderGeometry(0.006, 0.006, 0.78, 6), stringMat, [-0.05, 0, 0]);
    limbs.leftArm.add(bow);

    // Glowing emerald arrow on rightArm
    const arrow = new THREE.Group();
    arrow.position.set(0, -0.44, 0.12);
    arrow.rotation.x = Math.PI / 2;
    addMesh(arrow, new THREE.CylinderGeometry(0.014, 0.014, 0.65, 6), arrowGlow, [0, 0.15, 0]);
    addMesh(arrow, new THREE.ConeGeometry(0.04, 0.11, 4), arrowGlow, [0, 0.5, 0]);
    limbs.rightArm.add(arrow);
  } else if (heroClass === 'assassin') {
    limbs = createBipedLimbs(bodyPivot, 0x18181b, 0x09090b, 0x2e1065, 0x18181b, flashTargets, false);

    const obsidianMat = makePBR(0x18181b, { metalness: 0.5, roughness: 0.38 }, flashTargets);
    const violetMat = makePBR(0x2e1065, { metalness: 0.3, roughness: 0.55 }, flashTargets);
    const scarfMat = makePBR(0x4c1d95, { metalness: 0.15, roughness: 0.72, side: THREE.DoubleSide }, flashTargets);
    const purpleGlow = makePBR(0xa855f7, { metalness: 0.3, roughness: 0.2, emissive: 0x9333ea, emissiveIntensity: 1.5 }, flashTargets);

    // Dark-violet & obsidian stealth tunic
    addMesh(bodyPivot, new THREE.CylinderGeometry(0.23, 0.2, 0.64, 8), obsidianMat, [0, 0.96, 0]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.34, 0.34, 0.28), violetMat, [0, 1.08, 0.02]);
    addMesh(bodyPivot, new THREE.TorusGeometry(0.21, 0.03, 6, 12), purpleGlow, [0, 0.68, 0], [Math.PI / 2, 0, 0]);

    // Rogue cowl + glowing purple eyes
    addMesh(bodyPivot, new THREE.SphereGeometry(0.19, 10, 10), obsidianMat, [0, 1.5, 0]);
    addMesh(bodyPivot, new THREE.CylinderGeometry(0.19, 0.21, 0.16, 10), violetMat, [0, 1.4, 0.02]); // Face mask
    addMesh(bodyPivot, new THREE.SphereGeometry(0.03, 8, 8), purpleGlow, [-0.065, 1.52, 0.175]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.03, 8, 8), purpleGlow, [0.065, 1.52, 0.175]);

    // Flowing dark scarf (capeOrTail)
    const scarf = new THREE.Group();
    scarf.position.set(0, 1.32, -0.18);
    addMesh(scarf, new THREE.PlaneGeometry(0.24, 0.85, 2, 4), scarfMat, [-0.06, -0.4, -0.05], [0.24, 0, -0.12]);
    addMesh(scarf, new THREE.PlaneGeometry(0.18, 0.7, 2, 4), scarfMat, [0.08, -0.32, -0.04], [0.28, 0, 0.15]);
    bodyPivot.add(scarf);
    capeOrTail = scarf;

    // Dual curved shadow daggers on leftArm and rightArm
    const buildDagger = (flip: number): THREE.Group => {
      const d = new THREE.Group();
      d.position.set(0, -0.45, 0.08);
      d.rotation.x = Math.PI / 2.2;
      addMesh(d, new THREE.CylinderGeometry(0.022, 0.022, 0.16, 6), obsidianMat, [0, -0.04, 0]);
      addMesh(d, new THREE.BoxGeometry(0.12, 0.03, 0.04), purpleGlow, [0, 0.04, 0]);
      addMesh(d, new THREE.ConeGeometry(0.045, 0.42, 4), obsidianMat, [0.02 * flip, 0.25, 0], [0, 0, -0.14 * flip], [0.6, 1, 0.25]);
      return d;
    };
    limbs.leftArm.add(buildDagger(-1));
    limbs.rightArm.add(buildDagger(1));
  } else {
    // paladin
    limbs = createBipedLimbs(bodyPivot, 0xe2e8f0, 0xfbbf24, 0xf8fafc, 0xfbbf24, flashTargets, true);

    const whitePlate = makePBR(0xf8fafc, { metalness: 0.72, roughness: 0.25 }, flashTargets);
    const goldMat = makePBR(0xfbbf24, { metalness: 0.9, roughness: 0.18 }, flashTargets);
    const holyGlow = makePBR(0xfde047, { metalness: 0.2, roughness: 0.15, emissive: 0xfacc15, emissiveIntensity: 1.45 }, flashTargets);
    const plumeMat = makePBR(0xdc2626, { metalness: 0.1, roughness: 0.65 }, flashTargets);

    // Radiant gold & white plate armor
    addMesh(bodyPivot, new THREE.CylinderGeometry(0.28, 0.23, 0.68, 8), whitePlate, [0, 0.96, 0]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.38, 0.26, 0.36), goldMat, [0, 1.1, 0.02]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.48, 0.12, 0.35), goldMat, [0, 0.66, 0]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.17, 10, 10), goldMat, [-0.37, 1.26, 0], [0, 0, 0.25], [1.1, 0.85, 1.1]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.17, 10, 10), goldMat, [0.37, 1.26, 0], [0, 0, -0.25], [1.1, 0.85, 1.1]);

    // Plumed knight helm
    addMesh(bodyPivot, new THREE.CylinderGeometry(0.19, 0.21, 0.34, 10), whitePlate, [0, 1.5, 0]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.19, 10, 10), goldMat, [0, 1.62, 0]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.24, 0.055, 0.08), holyGlow, [0, 1.52, 0.17]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.08, 0.22, 0.34), plumeMat, [0, 1.78, -0.06], [-0.25, 0, 0]);

    // Golden holy aura ring (auraMesh)
    const holyAura = new THREE.Group();
    holyAura.position.set(0, 0.95, 0);
    addMesh(holyAura, new THREE.TorusGeometry(0.58, 0.024, 8, 28), holyGlow, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    addMesh(holyAura, new THREE.TorusGeometry(0.46, 0.016, 8, 24), holyGlow, [0, 0.35, 0], [Math.PI / 2.3, 0.2, 0], [1, 1, 1], false);
    bodyPivot.add(holyAura);
    auraMesh = holyAura;

    // Kite shield on leftArm
    const shield = buildKiteShield(0xf8fafc, 0xfbbf24, 0xfde047, flashTargets);
    shield.position.set(-0.08, -0.34, 0.14);
    shield.rotation.y = -Math.PI / 3;
    limbs.leftArm.add(shield);

    // Heavy golden warhammer on rightArm
    const hammer = new THREE.Group();
    hammer.position.set(0, -0.44, 0.08);
    hammer.rotation.x = Math.PI / 2.4;
    addMesh(hammer, new THREE.CylinderGeometry(0.032, 0.028, 0.85, 8), whitePlate, [0, 0.24, 0]);
    addMesh(hammer, new THREE.BoxGeometry(0.26, 0.22, 0.36), goldMat, [0, 0.68, 0]);
    addMesh(hammer, new THREE.BoxGeometry(0.28, 0.12, 0.38), holyGlow, [0, 0.68, 0]);
    limbs.rightArm.add(hammer);
  }

  // Self ground ring
  let selfRing: THREE.Mesh | undefined;
  if (isSelf) {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    selfRing = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.68, 32), ringMat);
    selfRing.rotation.x = -Math.PI / 2;
    selfRing.position.y = 0.02;
    selfRing.renderOrder = 5;
    root.add(selfRing);
  }

  const hpWidth = 1.15;
  const hpFillMesh = createHpBar(root, 2.12, hpWidth, isSelf ? 0x22c55e : 0x38bdf8);

  const nameSprite = createNameSprite(name, isSelf ? '#fde047' : '#f8fafc');
  nameSprite.position.set(0, 2.42, 0);
  root.add(nameSprite);

  const userData: RigUserData = {
    archetype: 'hero',
    flashTargets,
    hpWidth,
    selfRing,
  };
  root.userData = userData;

  return {
    root,
    bodyPivot,
    leftArm: limbs.leftArm,
    rightArm: limbs.rightArm,
    leftLeg: limbs.leftLeg,
    rightLeg: limbs.rightLeg,
    capeOrTail,
    auraMesh,
    hpFillMesh,
    animTime: Math.random() * 10,
    attackTimer: 0,
    hitFlashTimer: 0,
    baseScale: 1,
  };
}

export function createMonsterModel3D(
  templateId: string,
  label: string,
  scale: number,
  isBoss = false
): Rig3D {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  bodyPivot.scale.setScalar(scale);
  root.add(bodyPivot);

  const flashTargets: FlashTarget[] = [];
  let leftArm = new THREE.Group();
  let rightArm = new THREE.Group();
  let leftLeg = new THREE.Group();
  let rightLeg = new THREE.Group();
  let capeOrTail: THREE.Object3D | undefined;
  let auraMesh: THREE.Object3D | undefined;
  let extraLegs: [THREE.Group, THREE.Group] | undefined;
  let archetype: Archetype = 'orc';
  let topHeight = 2.0;

  if (templateId === 'slime') {
    archetype = 'slime';
    topHeight = 1.05;

    const outerMat = makePBR(
      0x10b981,
      {
        metalness: 0.05,
        roughness: 0.12,
        transparent: true,
        opacity: 0.82,
      },
      flashTargets
    );
    const coreMat = makePBR(
      0x84cc16,
      {
        metalness: 0.1,
        roughness: 0.25,
        emissive: 0x65a30d,
        emissiveIntensity: 1.1,
      },
      flashTargets
    );
    const eyeMat = makePBR(0x09090b, { metalness: 0.2, roughness: 0.1 }, flashTargets);
    const glintMat = makePBR(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.9 }, flashTargets);

    // Translucent emerald dome + glowing lime inner core
    addMesh(bodyPivot, new THREE.SphereGeometry(0.55, 20, 16), outerMat, [0, 0.44, 0], [0, 0, 0], [1.15, 0.85, 1.15]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.28, 14, 12), coreMat, [0, 0.42, 0], [0, 0, 0], [1, 0.9, 1], false);

    // 3D eyes
    addMesh(bodyPivot, new THREE.SphereGeometry(0.085, 10, 10), eyeMat, [-0.19, 0.5, 0.53]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.085, 10, 10), eyeMat, [0.19, 0.5, 0.53]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.028, 8, 8), glintMat, [-0.17, 0.53, 0.6], [0, 0, 0], [1, 1, 1], false);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.028, 8, 8), glintMat, [0.21, 0.53, 0.6], [0, 0, 0], [1, 1, 1], false);

    bodyPivot.add(leftArm, rightArm, leftLeg, rightLeg);
  } else if (templateId === 'wolf') {
    archetype = 'wolf';
    topHeight = 1.25;

    const furMat = makePBR(0x64748b, { metalness: 0.12, roughness: 0.78 }, flashTargets);
    const darkFurMat = makePBR(0x334155, { metalness: 0.15, roughness: 0.82 }, flashTargets);
    const amberEye = makePBR(0xf59e0b, { metalness: 0.2, roughness: 0.2, emissive: 0xf59e0b, emissiveIntensity: 1.5 }, flashTargets);
    const noseMat = makePBR(0x09090b, { metalness: 0.3, roughness: 0.25 }, flashTargets);

    // Quadruped body + chest ruff
    addMesh(bodyPivot, new THREE.BoxGeometry(0.46, 0.44, 0.96), furMat, [0, 0.66, 0]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.28, 10, 10), darkFurMat, [0, 0.72, 0.36], [0, 0, 0], [1, 1, 1.1]);

    // Head, snout, pointed ears, glowing amber eyes
    const head = new THREE.Group();
    head.position.set(0, 0.88, 0.56);
    addMesh(head, new THREE.BoxGeometry(0.32, 0.3, 0.34), furMat, [0, 0, 0]);
    addMesh(head, new THREE.BoxGeometry(0.18, 0.16, 0.28), darkFurMat, [0, -0.05, 0.26]); // Snout
    addMesh(head, new THREE.SphereGeometry(0.045, 8, 8), noseMat, [0, -0.02, 0.4]);
    addMesh(head, new THREE.ConeGeometry(0.075, 0.22, 4), darkFurMat, [-0.11, 0.22, -0.04], [0, 0, 0.2]);
    addMesh(head, new THREE.ConeGeometry(0.075, 0.22, 4), darkFurMat, [0.11, 0.22, -0.04], [0, 0, -0.2]);
    addMesh(head, new THREE.SphereGeometry(0.036, 8, 8), amberEye, [-0.09, 0.05, 0.17]);
    addMesh(head, new THREE.SphereGeometry(0.036, 8, 8), amberEye, [0.09, 0.05, 0.17]);
    bodyPivot.add(head);

    // 4 articulated legs (leftLeg/rightLeg = back legs, extraLegs = front legs)
    const buildWolfLeg = (x: number, z: number): THREE.Group => {
      const leg = new THREE.Group();
      leg.position.set(x, 0.52, z);
      addMesh(leg, new THREE.CylinderGeometry(0.075, 0.055, 0.48, 8), darkFurMat, [0, -0.24, 0]);
      addMesh(leg, new THREE.BoxGeometry(0.11, 0.08, 0.15), furMat, [0, -0.48, 0.03]);
      bodyPivot.add(leg);
      return leg;
    };

    leftLeg = buildWolfLeg(-0.17, -0.34);
    rightLeg = buildWolfLeg(0.17, -0.34);
    const frontLeft = buildWolfLeg(-0.17, 0.34);
    const frontRight = buildWolfLeg(0.17, 0.34);
    extraLegs = [frontLeft, frontRight];

    bodyPivot.add(leftArm, rightArm);

    // Bushy tail (capeOrTail)
    const tail = new THREE.Group();
    tail.position.set(0, 0.72, -0.48);
    addMesh(tail, new THREE.ConeGeometry(0.11, 0.52, 8), darkFurMat, [0, -0.05, -0.22], [-Math.PI / 2.6, 0, 0]);
    bodyPivot.add(tail);
    capeOrTail = tail;
  } else if (templateId === 'boss_golem') {
    archetype = 'boss_golem';
    topHeight = 2.5;

    const obsidianMat = makePBR(0x1c1917, { metalness: 0.35, roughness: 0.85 }, flashTargets);
    const cragMat = makePBR(0x292524, { metalness: 0.25, roughness: 0.9 }, flashTargets);
    const magmaMat = makePBR(0xf97316, { metalness: 0.15, roughness: 0.2, emissive: 0xf97316, emissiveIntensity: 1.7 }, flashTargets);

    // Towering craggy obsidian torso & legs
    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.26, 0.82, 0);
    addMesh(leftLeg, new THREE.DodecahedronGeometry(0.24, 0), obsidianMat, [0, -0.26, 0], [0, 0, 0], [0.9, 1.4, 0.95]);
    addMesh(leftLeg, new THREE.BoxGeometry(0.32, 0.26, 0.42), cragMat, [0, -0.68, 0.05]);
    bodyPivot.add(leftLeg);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.26, 0.82, 0);
    addMesh(rightLeg, new THREE.DodecahedronGeometry(0.24, 0), obsidianMat, [0, -0.26, 0], [0, 0, 0], [0.9, 1.4, 0.95]);
    addMesh(rightLeg, new THREE.BoxGeometry(0.32, 0.26, 0.42), cragMat, [0, -0.68, 0.05]);
    bodyPivot.add(rightLeg);

    // Craggy torso + glowing magma core & cracks
    addMesh(bodyPivot, new THREE.DodecahedronGeometry(0.56, 0), obsidianMat, [0, 1.35, 0], [0, 0.3, 0], [1.15, 1.1, 0.85]);
    addMesh(bodyPivot, new THREE.OctahedronGeometry(0.26, 0), magmaMat, [0, 1.34, 0.32], [0, 0, 0], [1, 1.2, 0.55]); // Magma core
    addMesh(bodyPivot, new THREE.BoxGeometry(0.62, 0.06, 0.52), magmaMat, [0, 1.42, 0.06], [0.1, 0, 0.25]); // Magma crack
    addMesh(bodyPivot, new THREE.BoxGeometry(0.52, 0.05, 0.48), magmaMat, [0, 1.18, 0.06], [-0.15, 0, -0.2]);

    // Craggy head + magma eyes
    addMesh(bodyPivot, new THREE.DodecahedronGeometry(0.26, 0), cragMat, [0, 2.02, 0.08]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.11, 0.05, 0.08), magmaMat, [-0.09, 2.04, 0.28]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.11, 0.05, 0.08), magmaMat, [0.09, 2.04, 0.28]);

    // Massive stone gauntlets on leftArm & rightArm
    const buildGauntletArm = (x: number): THREE.Group => {
      const arm = new THREE.Group();
      arm.position.set(x, 1.68, 0);
      addMesh(arm, new THREE.DodecahedronGeometry(0.24, 0), cragMat, [0, -0.1, 0]);
      addMesh(arm, new THREE.CylinderGeometry(0.16, 0.14, 0.52, 7), obsidianMat, [0, -0.44, 0]);
      addMesh(arm, new THREE.BoxGeometry(0.34, 0.38, 0.36), cragMat, [0, -0.82, 0.04]);
      addMesh(arm, new THREE.BoxGeometry(0.28, 0.08, 0.38), magmaMat, [0, -0.92, 0.06]); // Magma knuckles
      bodyPivot.add(arm);
      return arm;
    };
    leftArm = buildGauntletArm(-0.68);
    rightArm = buildGauntletArm(0.68);

    // Orbiting 3D rune crystals (auraMesh)
    const crystals = new THREE.Group();
    crystals.position.set(0, 1.42, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      addMesh(
        crystals,
        new THREE.OctahedronGeometry(0.12, 0),
        magmaMat,
        [Math.cos(a) * 0.98, Math.sin(i * 1.3) * 0.22, Math.sin(a) * 0.98],
        [0.3, a, 0.2],
        [0.8, 1.5, 0.8],
        false
      );
    }
    bodyPivot.add(crystals);
    auraMesh = crystals;
  } else {
    // orc (and default fallback)
    archetype = 'orc';
    topHeight = 2.05;

    const orcSkin = makePBR(0x4d7c0f, { metalness: 0.1, roughness: 0.68 }, flashTargets);
    const darkSkin = makePBR(0x3f6212, { metalness: 0.1, roughness: 0.72 }, flashTargets);
    const leatherMat = makePBR(0x78350f, { metalness: 0.2, roughness: 0.65 }, flashTargets);
    const boneMat = makePBR(0xe7e5e4, { metalness: 0.15, roughness: 0.5 }, flashTargets);
    const warpaintMat = makePBR(0xdc2626, { metalness: 0.1, roughness: 0.6 }, flashTargets);
    const steelMat = makePBR(0x64748b, { metalness: 0.75, roughness: 0.32 }, flashTargets);
    const eyeGlow = makePBR(0xef4444, { emissive: 0xdc2626, emissiveIntensity: 1.2 }, flashTargets);

    const limbs = createBipedLimbs(bodyPivot, 0x3f6212, 0x451a03, 0x4d7c0f, 0x365314, flashTargets, false);
    leftArm = limbs.leftArm;
    rightArm = limbs.rightArm;
    leftLeg = limbs.leftLeg;
    rightLeg = limbs.rightLeg;

    // Muscular olive-green torso + leather belt
    addMesh(bodyPivot, new THREE.CylinderGeometry(0.32, 0.24, 0.7, 8), orcSkin, [0, 0.98, 0]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.48, 0.14, 0.36), leatherMat, [0, 0.66, 0]);
    // Crimson warpaint across chest
    addMesh(bodyPivot, new THREE.BoxGeometry(0.46, 0.08, 0.36), warpaintMat, [0, 1.12, 0.02], [0, 0, 0.28]);

    // Head, tusks, crimson warpaint
    addMesh(bodyPivot, new THREE.SphereGeometry(0.21, 10, 10), darkSkin, [0, 1.52, 0.02]);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.26, 0.05, 0.06), warpaintMat, [0, 1.54, 0.19]); // Face warpaint
    addMesh(bodyPivot, new THREE.SphereGeometry(0.03, 8, 8), eyeGlow, [-0.07, 1.55, 0.2]);
    addMesh(bodyPivot, new THREE.SphereGeometry(0.03, 8, 8), eyeGlow, [0.07, 1.55, 0.2]);
    // Tusks
    addMesh(bodyPivot, new THREE.ConeGeometry(0.032, 0.14, 6), boneMat, [-0.08, 1.44, 0.22], [0.35, 0, 0.15]);
    addMesh(bodyPivot, new THREE.ConeGeometry(0.032, 0.14, 6), boneMat, [0.08, 1.44, 0.22], [0.35, 0, -0.15]);

    // Spiked bone shoulder pad on leftArm
    addMesh(leftArm, new THREE.SphereGeometry(0.18, 8, 8), boneMat, [-0.04, 0.04, 0], [0, 0, 0], [1.1, 0.85, 1.1]);
    addMesh(leftArm, new THREE.ConeGeometry(0.045, 0.22, 6), boneMat, [-0.14, 0.16, 0], [0, 0, 0.6]);
    addMesh(leftArm, new THREE.ConeGeometry(0.045, 0.2, 6), boneMat, [-0.06, 0.18, 0.1], [0.5, 0, 0.2]);

    // Heavy 3D battleaxe on rightArm
    const axe = new THREE.Group();
    axe.position.set(0, -0.44, 0.08);
    axe.rotation.x = Math.PI / 2.4;
    addMesh(axe, new THREE.CylinderGeometry(0.032, 0.028, 0.92, 8), leatherMat, [0, 0.28, 0]);
    addMesh(axe, new THREE.BoxGeometry(0.06, 0.36, 0.28), steelMat, [0, 0.66, 0.12]);
    addMesh(axe, new THREE.BoxGeometry(0.06, 0.3, 0.22), steelMat, [0, 0.66, -0.1]);
    rightArm.add(axe);
  }

  const hpWidth = isBoss ? 1.7 : 1.1;
  const hpY = topHeight * scale + 0.24;
  const hpFillMesh = createHpBar(root, hpY, hpWidth, isBoss ? 0xf97316 : 0xef4444);

  const nameSprite = createNameSprite(
    isBoss ? `★ ${label}` : label,
    isBoss ? '#fb923c' : '#fca5a5'
  );
  nameSprite.position.set(0, hpY + 0.32, 0);
  root.add(nameSprite);

  const userData: RigUserData = {
    archetype,
    flashTargets,
    hpWidth,
    extraLegs,
  };
  root.userData = userData;

  return {
    root,
    bodyPivot,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    capeOrTail,
    auraMesh,
    hpFillMesh,
    animTime: Math.random() * 10,
    attackTimer: 0,
    hitFlashTimer: 0,
    baseScale: scale,
  };
}

function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

export function updateRig3D(
  rig: Rig3D,
  dt: number,
  isMoving: boolean,
  targetYaw: number,
  hpRatio: number,
  isMonster: boolean
): void {
  rig.animTime += dt;
  const t = rig.animTime;
  const data = rig.root.userData as Partial<RigUserData>;
  const archetype: Archetype = data.archetype ?? (isMonster ? 'orc' : 'hero');

  // Smoothly rotate bodyPivot toward targetYaw
  const turnAlpha = Math.min(1, dt * 12);
  rig.bodyPivot.rotation.y = lerpAngle(rig.bodyPivot.rotation.y, targetYaw, turnAlpha);

  // Reset base body offset
  let bodyY = 0;

  if (archetype === 'slime') {
    // Squash-and-stretch for slime
    const freq = isMoving ? 9 : 3.2;
    const amp = isMoving ? 0.18 : 0.07;
    const wave = Math.sin(t * freq);
    const sy = rig.baseScale * (1 + wave * amp);
    const sxz = rig.baseScale * (1 - wave * (amp * 0.5));
    rig.bodyPivot.scale.set(sxz, sy, sxz);
    if (isMoving) {
      bodyY = Math.max(0, Math.sin(t * freq)) * 0.18 * rig.baseScale;
    }
  } else if (archetype === 'wolf') {
    // Quadruped walk / idle
    const swing = isMoving ? Math.sin(t * 12) * 0.65 : 0;
    rig.leftLeg.rotation.x = swing;
    rig.rightLeg.rotation.x = -swing;
    if (data.extraLegs) {
      data.extraLegs[0].rotation.x = -swing;
      data.extraLegs[1].rotation.x = swing;
    }
    bodyY = isMoving ? Math.abs(Math.sin(t * 12)) * 0.06 : Math.sin(t * 2.8) * 0.015;
    if (rig.capeOrTail) {
      rig.capeOrTail.rotation.y = Math.sin(t * (isMoving ? 10 : 4)) * 0.25;
    }
  } else {
    // Biped walk / idle breathing
    if (isMoving) {
      const walkWave = Math.sin(t * 10);
      rig.leftLeg.rotation.x = walkWave * 0.65;
      rig.rightLeg.rotation.x = -walkWave * 0.65;
      rig.leftArm.rotation.x = -walkWave * 0.45;
      rig.rightArm.rotation.x = walkWave * 0.45;
      bodyY = Math.abs(walkWave) * 0.05;
    } else {
      const damp = Math.min(1, dt * 10);
      rig.leftLeg.rotation.x *= 1 - damp;
      rig.rightLeg.rotation.x *= 1 - damp;
      rig.leftArm.rotation.x *= 1 - damp;
      rig.rightArm.rotation.x *= 1 - damp;
      bodyY = Math.sin(t * 2.5) * 0.02;
    }

    if (rig.capeOrTail) {
      rig.capeOrTail.rotation.x = (isMoving ? 0.22 : 0.06) + Math.sin(t * (isMoving ? 8 : 2.6)) * 0.08;
    }
  }

  // Aura rotation
  if (rig.auraMesh) {
    rig.auraMesh.rotation.y += dt * 1.4;
    rig.auraMesh.position.y += Math.sin(t * 3) * 0.001;
  }

  // Attack swing animation
  if (rig.attackTimer > 0) {
    rig.attackTimer = Math.max(0, rig.attackTimer - dt);
    const progress = 1 - rig.attackTimer / ATTACK_DURATION;
    const swing = Math.sin(progress * Math.PI);
    if (archetype === 'slime') {
      rig.bodyPivot.position.z = swing * 0.22 * rig.baseScale;
    } else if (archetype === 'wolf') {
      rig.bodyPivot.position.z = swing * 0.24 * rig.baseScale;
      rig.bodyPivot.rotation.x = -swing * 0.22;
    } else {
      rig.rightArm.rotation.x = -swing * 1.45;
      rig.leftArm.rotation.x = -swing * 0.45;
      rig.bodyPivot.rotation.x = swing * 0.14;
    }
  } else {
    rig.bodyPivot.position.z = 0;
    rig.bodyPivot.rotation.x = 0;
  }

  rig.bodyPivot.position.y = bodyY;

  // Emissive hit-flash
  if (data.flashTargets) {
    if (rig.hitFlashTimer > 0) {
      rig.hitFlashTimer = Math.max(0, rig.hitFlashTimer - dt);
      const intensity = (rig.hitFlashTimer / HIT_FLASH_DURATION) * 1.6;
      for (const target of data.flashTargets) {
        target.mat.emissive.copy(FLASH_COLOR);
        target.mat.emissiveIntensity = Math.max(target.baseIntensity, intensity);
      }
    } else {
      for (const target of data.flashTargets) {
        if (target.mat.emissiveIntensity !== target.baseIntensity) {
          target.mat.emissive.copy(target.baseEmissive);
          target.mat.emissiveIntensity = target.baseIntensity;
        }
      }
    }
  }

  // HP bar scale (left-anchored)
  const clampedHp = Math.max(0.0001, Math.min(1, hpRatio));
  const hpWidth = data.hpWidth ?? 1.1;
  rig.hpFillMesh.scale.x = clampedHp;
  rig.hpFillMesh.position.x = -((1 - clampedHp) * hpWidth) / 2;
}

export function triggerAttack3D(rig: Rig3D): void {
  rig.attackTimer = ATTACK_DURATION;
}

export function triggerHitFlash3D(rig: Rig3D): void {
  rig.hitFlashTimer = HIT_FLASH_DURATION;
}
