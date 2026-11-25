import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import {
  MapId,
  MAP_SIZE,
  SAFE_SPAWN,
  TILE_HEIGHT,
  TILE_WIDTH,
  toIsometric,
} from '@mmorpg/shared';
import { getAtlas, WorldTextureAtlas } from './TextureAtlas.js';

export interface PortalDef {
  x: number;
  y: number;
  toMap: MapId;
  label: string;
}

const MAP_PORTALS: Record<MapId, ReadonlyArray<PortalDef>> = {
  vale_eldoria: [
    { x: 38, y: 24, toMap: 'floresta_sombria', label: 'Bosque Crepuscular' },
  ],
  floresta_sombria: [
    { x: 10, y: 24, toMap: 'vale_eldoria', label: 'Vale de Eldoria' },
    { x: 38, y: 24, toMap: 'acampamento_orc', label: 'Terras de Krag' },
  ],
  acampamento_orc: [
    { x: 10, y: 24, toMap: 'floresta_sombria', label: 'Bosque Crepuscular' },
    { x: 38, y: 24, toMap: 'ruinas_antigas', label: 'Cripta dos Antigos' },
  ],
  ruinas_antigas: [
    { x: 10, y: 24, toMap: 'acampamento_orc', label: 'Terras de Krag' },
    { x: 38, y: 24, toMap: 'deserto_escaravelho', label: 'Dunas de Solari' },
  ],
  deserto_escaravelho: [
    { x: 10, y: 24, toMap: 'ruinas_antigas', label: 'Cripta dos Antigos' },
    { x: 38, y: 24, toMap: 'santuario_golem', label: 'Santuário Vulcânico' },
  ],
  santuario_golem: [
    { x: 24, y: 38, toMap: 'deserto_escaravelho', label: 'Dunas de Solari' },
    { x: 38, y: 24, toMap: 'pico_gelido', label: 'Pico Glacial' },
  ],
  pico_gelido: [
    { x: 10, y: 24, toMap: 'santuario_golem', label: 'Santuário Vulcânico' },
    { x: 38, y: 24, toMap: 'abismo_eterno', label: 'Abismo Eterno' },
  ],
  abismo_eterno: [
    { x: 24, y: 38, toMap: 'pico_gelido', label: 'Pico Glacial' },
    { x: 38, y: 24, toMap: 'cidadela_celestial', label: 'Cidadela Celestial' },
  ],
  cidadela_celestial: [
    { x: 10, y: 24, toMap: 'abismo_eterno', label: 'Abismo Eterno' },
    { x: 38, y: 24, toMap: 'torre_eterna', label: 'Torre da Eternidade' },
  ],
  torre_eterna: [
    { x: 24, y: 38, toMap: 'cidadela_celestial', label: 'Cidadela Celestial' },
  ],
};

export function getPortalsForMap(mapId: MapId): Array<{ x: number; y: number; toMap: MapId; label: string }> {
  return MAP_PORTALS[mapId].map((p) => ({ ...p }));
}

interface FlameAnim {
  outerFlame: Graphics;
  innerFlame: Graphics;
  halo: Sprite;
  phase: number;
  baseHaloAlpha: number;
  baseHaloScaleX: number;
  baseHaloScaleY: number;
}

interface TreeAnim {
  sprite: Sprite;
  phase: number;
  amplitude: number;
  speed: number;
}

interface ObeliskAnim {
  halo: Sprite;
  phase: number;
}

interface PortalAnim {
  vortex: Sprite;
  halo: Sprite;
  phase: number;
}

type ParticleKind = 'sanctuary' | 'firefly' | 'ember' | 'ash';

interface AmbientParticle {
  sprite: Sprite;
  kind: ParticleKind;
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  baseAlpha: number;
  maxRange: number;
}

const BIOME_SLIME = { x: 14, y: 14 };
const BIOME_WOLF = { x: 34, y: 15 };

const BRAZIER_COORDS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 21, y: 21 },
  { x: 27, y: 21 },
  { x: 21, y: 27 },
  { x: 27, y: 27 },
];

const ELDORIA_PILLAR_COORDS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 19, y: 24 },
  { x: 29, y: 24 },
  { x: 24, y: 19 },
  { x: 24, y: 29 },
  { x: 18, y: 32 },
  { x: 11, y: 31 },
  { x: 30, y: 31 },
];

const ORC_CAMPFIRE_COORDS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 20, y: 20 },
  { x: 28, y: 20 },
  { x: 19, y: 28 },
  { x: 29, y: 28 },
  { x: 24, y: 14 },
  { x: 15, y: 24 },
];

const ORC_TOTEM_COORDS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 16, y: 17 },
  { x: 32, y: 17 },
  { x: 16, y: 31 },
  { x: 32, y: 31 },
  { x: 24, y: 11 },
  { x: 24, y: 36 },
  { x: 13, y: 21 },
  { x: 35, y: 27 },
];

const GOLEM_OBELISK_COORDS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 17, y: 20 },
  { x: 31, y: 20 },
  { x: 17, y: 28 },
  { x: 31, y: 28 },
  { x: 24, y: 15 },
  { x: 24, y: 33 },
];

const PORTAL_LABEL_STYLE = new TextStyle({
  fontFamily: 'Cinzel, Georgia, serif',
  fontSize: 12,
  fontWeight: 'bold',
  fill: '#e0f2fe',
  stroke: { color: '#050810', width: 3 },
  dropShadow: {
    color: '#000000',
    blur: 4,
    distance: 1,
    alpha: 0.85,
  },
});

/** Deterministic 2D hash returning [0, 1). */
function hash2D(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 2D value noise returning [0, 1). */
function valueNoise2D(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const n00 = hash2D(xi, yi);
  const n10 = hash2D(xi + 1, yi);
  const n01 = hash2D(xi, yi + 1);
  const n11 = hash2D(xi + 1, yi + 1);

  const nx0 = n00 + (n10 - n00) * u;
  const nx1 = n01 + (n11 - n01) * u;
  return nx0 + (nx1 - nx0) * v;
}

function createGlowSprite(
  atlas: WorldTextureAtlas,
  color: number,
  alpha: number,
  scaleX: number,
  scaleY: number
): Sprite {
  const sprite = new Sprite(atlas.prop_radial_glow);
  sprite.anchor.set(0.5);
  sprite.tint = color;
  sprite.alpha = alpha;
  sprite.scale.set(scaleX, scaleY);
  return sprite;
}

export class LivingWorldLayer {
  public groundLayer = new Container();
  public propLayer = new Container();
  public lightLayer = new Container();
  public particleLayer = new Container();

  private elapsed = 0;
  private flames: FlameAnim[] = [];
  private trees: TreeAnim[] = [];
  private obelisks: ObeliskAnim[] = [];
  private portals: PortalAnim[] = [];
  private particles: AmbientParticle[] = [];

  private sanctuaryRuneSpinner: Graphics | null = null;
  private sanctuaryHalo: Sprite | null = null;

  constructor() {
    this.propLayer.sortableChildren = true;
    this.lightLayer.blendMode = 'add';
  }

  public buildWorld(mapId: MapId = 'vale_eldoria'): void {
    this.clearWorld();
    const atlas = getAtlas();

    this.buildTerrain(mapId, atlas);
    this.buildPortals(mapId, atlas);

    if (mapId === 'vale_eldoria') {
      this.buildSanctuaryRune(atlas);
      this.buildBraziers(BRAZIER_COORDS, atlas);
      this.buildPillars(ELDORIA_PILLAR_COORDS, atlas, 0xffffff);
      this.buildEldoriaTrees(atlas);
      this.buildEldoriaParticles(atlas);
    } else if (mapId === 'acampamento_orc') {
      this.buildCampfires(ORC_CAMPFIRE_COORDS, atlas);
      this.buildPillars(ORC_TOTEM_COORDS, atlas, 0xc89a80);
      this.buildOrcTrees(atlas);
      this.buildOrcParticles(atlas);
    } else {
      this.buildMagmaObelisks(GOLEM_OBELISK_COORDS, atlas);
      this.buildVolcanicParticles(atlas);
    }
  }

  private clearWorld(): void {
    this.groundLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.propLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.lightLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.particleLayer.removeChildren().forEach((c) => c.destroy({ children: true }));

    this.flames = [];
    this.trees = [];
    this.obelisks = [];
    this.portals = [];
    this.particles = [];
    this.sanctuaryRuneSpinner = null;
    this.sanctuaryHalo = null;
    this.elapsed = 0;
  }

  private buildTerrain(mapId: MapId, atlas: WorldTextureAtlas): void {
    const terrainContainer = new Container();

    for (let x = 0; x < MAP_SIZE; x++) {
      for (let y = 0; y < MAP_SIZE; y++) {
        const iso = toIsometric(x, y);
        const n = hash2D(x, y);
        const patch = valueNoise2D(x * 0.28, y * 0.28);

        let tex: Texture = atlas.tile_grass;
        let tint = 0xffffff;

        if (mapId === 'vale_eldoria') {
          const distSafe = Math.hypot(x - SAFE_SPAWN.x, y - SAFE_SPAWN.y);
          const distSlime = Math.hypot(x - BIOME_SLIME.x, y - BIOME_SLIME.y);
          const distWolf = Math.hypot(x - BIOME_WOLF.x, y - BIOME_WOLF.y);

          if (distSafe <= 4.6) {
            tex = atlas.tile_stone;
            tint = n > 0.65 ? 0xf2f6ff : 0xdde4f0;
          } else if (distWolf <= 9.5) {
            const trailWave = Math.sin(x * 0.45) * 1.4 + (y - 15) * 0.65;
            const isTrail = Math.abs(trailWave) < 1.15 && distWolf < 8.2;
            tex = isTrail ? atlas.tile_orc_earth : atlas.tile_forest;
            tint = n > 0.6 ? 0xf4f8f5 : 0xe4ede7;
          } else if (distSlime <= 9.0) {
            tex = atlas.tile_grass;
            tint = patch > 0.55 ? 0xffffff : 0xe8f5ec;
          } else {
            tex = patch > 0.56 ? atlas.tile_forest : atlas.tile_grass;
            tint = (x + y) % 2 === 0 ? 0xf8faf9 : 0xe9efec;
          }
        } else if (mapId === 'acampamento_orc') {
          const distCenter = Math.hypot(x - 24, y - 24);
          const ridgeNoise = valueNoise2D(x * 0.22 + 11, y * 0.22 + 7);
          const isCanyonRim = distCenter > 15.5 || (ridgeNoise > 0.72 && distCenter > 6.5);
          if (isCanyonRim) {
            tex = atlas.tile_volcanic;
            tint = n > 0.5 ? 0xf0e4dc : 0xdccbc2;
          } else {
            tex = atlas.tile_orc_earth;
            tint = patch > 0.6 ? 0xd9ccc2 : 0xffffff;
          }
        } else {
          // santuario_golem: Obsidian fortress surrounded by glowing magma tiles
          const dx = Math.abs(x - 24);
          const dy = Math.abs(y - 24);
          const chebyshev = Math.max(dx, dy);
          const isBridge = dx <= 2 && y >= 24 && y <= 40;
          const isFortressCore = chebyshev <= 5;
          const isFortressWall = chebyshev <= 9 && !isFortressCore;
          const isMagmaMoat = (chebyshev >= 10 && chebyshev <= 13 && !isBridge) || (chebyshev > 16 && patch > 0.68);

          if (isFortressCore || isBridge) {
            tex = atlas.tile_stone;
            tint = 0xc8bec9;
          } else if (isMagmaMoat) {
            tex = atlas.tile_magma;
            tint = n > 0.5 ? 0xffffff : 0xf5dcd0;
          } else if (isFortressWall) {
            tex = atlas.tile_volcanic;
            tint = 0xf2e4e8;
          } else {
            tex = patch > 0.72 ? atlas.tile_magma : atlas.tile_volcanic;
            tint = 0xded3d7;
          }
        }

        const tile = new Sprite(tex);
        tile.anchor.set(0.5);
        tile.position.set(iso.x, iso.y);
        tile.width = TILE_WIDTH;
        tile.height = TILE_HEIGHT;
        tile.tint = tint;
        terrainContainer.addChild(tile);
      }
    }

    terrainContainer.cacheAsTexture(true);
    this.groundLayer.addChild(terrainContainer);

    if (mapId === 'santuario_golem') {
      const centerIso = toIsometric(24, 24);
      const ambientGlow = createGlowSprite(atlas, 0xff4500, 0.34, 4.2, 2.2);
      ambientGlow.position.set(centerIso.x, centerIso.y);
      this.lightLayer.addChild(ambientGlow);
    }
  }

  private buildPortals(mapId: MapId, atlas: WorldTextureAtlas): void {
    const portalDefs = MAP_PORTALS[mapId];
    portalDefs.forEach((def, idx) => {
      const iso = toIsometric(def.x, def.y);
      const container = new Container();
      container.position.set(iso.x, iso.y);
      container.zIndex = iso.y;

      const isoWrapper = new Container();
      isoWrapper.scale.set(1, 0.52);

      const vortex = new Sprite(atlas.prop_portal_vortex);
      vortex.anchor.set(0.5);
      vortex.scale.set(0.88);
      isoWrapper.addChild(vortex);
      container.addChild(isoWrapper);

      const label = new Text({ text: def.label, style: PORTAL_LABEL_STYLE });
      label.anchor.set(0.5, 1);
      label.position.set(0, -34);
      container.addChild(label);

      this.propLayer.addChild(container);

      const glowColor = def.toMap === 'santuario_golem' ? 0xf97316 : 0x38bdf8;
      const halo = createGlowSprite(atlas, glowColor, 0.62, 1.45, 0.85);
      halo.position.set(iso.x, iso.y - 6);
      this.lightLayer.addChild(halo);

      this.portals.push({
        vortex,
        halo,
        phase: idx * 2.1,
      });

      this.spawnParticleGroup(
        atlas,
        'sanctuary',
        10,
        def.x,
        def.y,
        45,
        glowColor,
        0.065
      );
    });
  }

  private buildSanctuaryRune(atlas: WorldTextureAtlas): void {
    const iso = toIsometric(SAFE_SPAWN.x, SAFE_SPAWN.y);
    const runeWrapper = new Container();
    runeWrapper.position.set(iso.x, iso.y);
    runeWrapper.scale.set(1, 0.5);

    const rune = new Graphics();
    const outerR = 46;
    const innerR = 32;

    rune.circle(0, 0, outerR).stroke({ color: 0xd4af37, width: 2, alpha: 0.72 });
    rune.circle(0, 0, outerR - 5).stroke({ color: 0x38bdf8, width: 1.5, alpha: 0.58 });
    rune.circle(0, 0, innerR).stroke({ color: 0xd4af37, width: 1.5, alpha: 0.65 });

    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      rune
        .moveTo(cos * innerR, sin * innerR)
        .lineTo(cos * outerR, sin * outerR)
        .stroke({ color: 0x7dd3fc, width: 1.4, alpha: 0.68 });

      const midR = (innerR + outerR) * 0.5;
      rune.circle(cos * midR, sin * midR, 2.5).fill({ color: 0xfde047, alpha: 0.88 });
    }

    const starPts: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const r = i % 2 === 0 ? innerR - 4 : innerR * 0.48;
      starPts.push(Math.cos(a) * r, Math.sin(a) * r);
    }
    rune.poly(starPts).stroke({ color: 0x38bdf8, width: 1.4, alpha: 0.6 });

    runeWrapper.addChild(rune);
    this.groundLayer.addChild(runeWrapper);
    this.sanctuaryRuneSpinner = rune;

    const halo = createGlowSprite(atlas, 0x38bdf8, 0.42, 1.3, 0.72);
    halo.position.set(iso.x, iso.y);
    this.lightLayer.addChild(halo);
    this.sanctuaryHalo = halo;
  }

  private buildBraziers(coords: ReadonlyArray<{ x: number; y: number }>, atlas: WorldTextureAtlas): void {
    coords.forEach((coord, idx) => {
      const iso = toIsometric(coord.x, coord.y);
      const container = new Container();
      container.position.set(iso.x, iso.y);
      container.zIndex = iso.y;

      const base = new Sprite(atlas.prop_brazier);
      base.anchor.set(0.5, 0.875);
      container.addChild(base);

      const outerFlame = new Graphics();
      outerFlame.poly([-6, -24, 0, -42, 6, -24, 0, -20]).fill({ color: 0xff5a1f, alpha: 0.9 });

      const innerFlame = new Graphics();
      innerFlame.poly([-3.2, -24, 0, -35, 3.2, -24, 0, -21]).fill({ color: 0xffd166, alpha: 0.96 });

      container.addChild(outerFlame);
      container.addChild(innerFlame);
      this.propLayer.addChild(container);

      const halo = createGlowSprite(atlas, 0xff7b29, 0.68, 1.5, 0.95);
      halo.position.set(iso.x, iso.y - 24);
      this.lightLayer.addChild(halo);

      this.flames.push({
        outerFlame,
        innerFlame,
        halo,
        phase: idx * 1.73,
        baseHaloAlpha: 0.68,
        baseHaloScaleX: 1.5,
        baseHaloScaleY: 0.95,
      });
    });
  }

  private buildCampfires(coords: ReadonlyArray<{ x: number; y: number }>, atlas: WorldTextureAtlas): void {
    coords.forEach((coord, idx) => {
      const iso = toIsometric(coord.x, coord.y);
      const container = new Container();
      container.position.set(iso.x, iso.y);
      container.zIndex = iso.y;

      const base = new Sprite(atlas.prop_campfire);
      base.anchor.set(0.5, 0.72);
      container.addChild(base);

      const outerFlame = new Graphics();
      outerFlame.poly([-7, -4, 0, -25, 7, -4, 0, 0]).fill({ color: 0xff5400, alpha: 0.9 });

      const innerFlame = new Graphics();
      innerFlame.poly([-3.5, -4, 0, -18, 3.5, -4, 0, -1]).fill({ color: 0xffe066, alpha: 0.96 });

      container.addChild(outerFlame);
      container.addChild(innerFlame);
      this.propLayer.addChild(container);

      const halo = createGlowSprite(atlas, 0xff6b1a, 0.72, 1.7, 1.05);
      halo.position.set(iso.x, iso.y - 10);
      this.lightLayer.addChild(halo);

      this.flames.push({
        outerFlame,
        innerFlame,
        halo,
        phase: idx * 1.37 + 0.5,
        baseHaloAlpha: 0.72,
        baseHaloScaleX: 1.7,
        baseHaloScaleY: 1.05,
      });

      this.spawnParticleGroup(atlas, 'ember', 5, coord.x, coord.y, 24, 0xff7b29, 0.055);
    });
  }

  private buildMagmaObelisks(coords: ReadonlyArray<{ x: number; y: number }>, atlas: WorldTextureAtlas): void {
    coords.forEach((coord, idx) => {
      const iso = toIsometric(coord.x, coord.y);
      const obelisk = new Sprite(atlas.prop_magma_obelisk);
      obelisk.anchor.set(0.5, 0.91);
      obelisk.position.set(iso.x, iso.y);
      obelisk.zIndex = iso.y;
      this.propLayer.addChild(obelisk);

      const halo = createGlowSprite(atlas, 0xff4d00, 0.65, 1.45, 0.95);
      halo.position.set(iso.x, iso.y - 28);
      this.lightLayer.addChild(halo);

      this.obelisks.push({
        halo,
        phase: idx * 1.15,
      });
    });
  }

  private buildPillars(
    coords: ReadonlyArray<{ x: number; y: number }>,
    atlas: WorldTextureAtlas,
    tint: number
  ): void {
    for (const coord of coords) {
      const iso = toIsometric(coord.x, coord.y);
      const pillar = new Sprite(atlas.prop_ruin_pillar);
      pillar.anchor.set(0.5, 0.9);
      pillar.position.set(iso.x, iso.y);
      pillar.zIndex = iso.y;
      pillar.tint = tint;
      this.propLayer.addChild(pillar);
    }
  }

  private isEldoriaPropBlocked(x: number, y: number): boolean {
    if (Math.hypot(x - SAFE_SPAWN.x, y - SAFE_SPAWN.y) <= 5.0) return true;
    for (const p of MAP_PORTALS.vale_eldoria) {
      if (Math.hypot(x - p.x, y - p.y) < 3.0) return true;
    }
    for (const b of BRAZIER_COORDS) {
      if (Math.hypot(x - b.x, y - b.y) < 1.5) return true;
    }
    for (const r of ELDORIA_PILLAR_COORDS) {
      if (Math.hypot(x - r.x, y - r.y) < 1.5) return true;
    }
    return false;
  }

  private buildEldoriaTrees(atlas: WorldTextureAtlas): void {
    for (let x = 2; x < MAP_SIZE - 2; x += 2) {
      for (let y = 2; y < MAP_SIZE - 2; y += 2) {
        if (this.isEldoriaPropBlocked(x, y)) continue;

        const n = hash2D(x * 7 + 3, y * 11 + 5);
        const distWolf = Math.hypot(x - BIOME_WOLF.x, y - BIOME_WOLF.y);
        const distSlime = Math.hypot(x - BIOME_SLIME.x, y - BIOME_SLIME.y);

        let density = 0.1;
        let isPine = n > 0.55;

        if (distWolf <= 9.5) {
          density = 0.4;
          isPine = true;
        } else if (distSlime <= 9.0) {
          density = 0.28;
          isPine = n > 0.72;
        }

        if (n > density) continue;

        if (distWolf <= 9.0) {
          const trailWave = Math.sin(x * 0.45) * 1.4 + (y - 15) * 0.65;
          if (Math.abs(trailWave) < 1.6) continue;
        }

        const iso = toIsometric(x, y);
        const sprite = new Sprite(isPine ? atlas.prop_pine_tree : atlas.prop_oak_tree);
        sprite.anchor.set(0.5, 0.91);
        sprite.position.set(iso.x, iso.y);
        sprite.zIndex = iso.y;
        const scale = 0.85 + hash2D(x, y) * 0.32;
        sprite.scale.set(scale);
        this.propLayer.addChild(sprite);

        this.trees.push({
          sprite,
          phase: n * Math.PI * 2,
          amplitude: 0.022 + n * 0.014,
          speed: 1.05 + n * 0.5,
        });
      }
    }
  }

  private buildOrcTrees(atlas: WorldTextureAtlas): void {
    for (let x = 3; x < MAP_SIZE - 3; x += 3) {
      for (let y = 3; y < MAP_SIZE - 3; y += 3) {
        if (Math.hypot(x - 24, y - 24) < 12) continue;
        let nearPortal = false;
        for (const p of MAP_PORTALS.acampamento_orc) {
          if (Math.hypot(x - p.x, y - p.y) < 3.5) nearPortal = true;
        }
        if (nearPortal) continue;

        const n = hash2D(x * 13 + 1, y * 17 + 9);
        if (n > 0.22) continue;

        const iso = toIsometric(x, y);
        const sprite = new Sprite(atlas.prop_oak_tree);
        sprite.anchor.set(0.5, 0.91);
        sprite.position.set(iso.x, iso.y);
        sprite.zIndex = iso.y;
        sprite.tint = 0x7d6b58;
        sprite.scale.set(0.82 + n * 0.35);
        this.propLayer.addChild(sprite);

        this.trees.push({
          sprite,
          phase: n * Math.PI * 2,
          amplitude: 0.016,
          speed: 0.95 + n * 0.4,
        });
      }
    }
  }

  private buildEldoriaParticles(atlas: WorldTextureAtlas): void {
    this.spawnParticleGroup(atlas, 'sanctuary', 18, SAFE_SPAWN.x, SAFE_SPAWN.y, 130, 0xfde047, 0.07);
    this.spawnParticleGroup(atlas, 'firefly', 14, BIOME_SLIME.x, BIOME_SLIME.y, 180, 0x4ade80, 0.075);
    this.spawnParticleGroup(atlas, 'firefly', 12, BIOME_WOLF.x, BIOME_WOLF.y, 190, 0x2dd4bf, 0.075);
  }

  private buildOrcParticles(atlas: WorldTextureAtlas): void {
    this.spawnParticleGroup(atlas, 'ember', 16, 24, 24, 220, 0xff6b1a, 0.065);
    this.spawnParticleGroup(atlas, 'ash', 18, 24, 24, 260, 0xa8a29e, 0.05);
  }

  private buildVolcanicParticles(atlas: WorldTextureAtlas): void {
    this.spawnParticleGroup(atlas, 'ember', 28, 24, 24, 240, 0xff5a1f, 0.075);
    this.spawnParticleGroup(atlas, 'ash', 20, 24, 24, 280, 0x9ca3af, 0.055);
  }

  private spawnParticleGroup(
    atlas: WorldTextureAtlas,
    kind: ParticleKind,
    count: number,
    tileX: number,
    tileY: number,
    maxRange: number,
    color: number,
    scale: number
  ): void {
    const origin = toIsometric(tileX, tileY);

    for (let i = 0; i < count; i++) {
      const seedA = hash2D(i * 13 + tileX, tileY * 7 + i);
      const seedB = hash2D(i * 29 + tileY, tileX * 11 + i);

      const angle = seedA * Math.PI * 2;
      const dist = seedB * maxRange;
      const x = origin.x + Math.cos(angle) * dist;
      const y = origin.y + Math.sin(angle) * dist * 0.55 - (kind === 'ember' ? seedA * 40 : 12);

      const sprite = new Sprite(atlas.prop_radial_glow);
      sprite.anchor.set(0.5);
      sprite.tint = color;
      sprite.scale.set(scale);
      sprite.position.set(x, y);

      const baseAlpha = kind === 'ember' ? 0.9 : kind === 'ash' ? 0.55 : 0.78;
      sprite.alpha = baseAlpha;
      this.particleLayer.addChild(sprite);

      this.particles.push({
        sprite,
        kind,
        originX: origin.x,
        originY: origin.y,
        x,
        y,
        vx: (seedA - 0.5) * (kind === 'firefly' ? 16 : kind === 'ash' ? 14 : 8),
        vy: kind === 'ember' ? -(18 + seedB * 22) : kind === 'ash' ? -(8 + seedB * 10) : (seedB - 0.5) * 10,
        phase: seedA * Math.PI * 2,
        speed: 1.5 + seedB * 2.2,
        baseAlpha,
        maxRange,
      });
    }
  }

  public update(dt: number): void {
    const clampedDt = Math.min(dt, 0.1);
    this.elapsed += clampedDt;

    // 1. Sanctuary rune rotation & halo pulse
    if (this.sanctuaryRuneSpinner) {
      this.sanctuaryRuneSpinner.rotation += clampedDt * 0.35;
    }
    if (this.sanctuaryHalo) {
      const pulse = 0.88 + Math.sin(this.elapsed * 2.1) * 0.12;
      this.sanctuaryHalo.alpha = 0.42 * pulse;
      this.sanctuaryHalo.scale.set(1.3 * pulse, 0.72 * pulse);
    }

    // 2. Portals swirling vortex & pulse
    for (let i = 0; i < this.portals.length; i++) {
      const p = this.portals[i];
      p.vortex.rotation += clampedDt * 1.45;
      const pulse = 0.9 + Math.sin(this.elapsed * 2.6 + p.phase) * 0.12;
      p.halo.alpha = 0.55 * pulse;
      p.halo.scale.set(1.45 * pulse, 0.85 * pulse);
    }

    // 3. Torch / Campfire flame flicker
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      const waveA = Math.sin(this.elapsed * 11.5 + f.phase);
      const waveB = Math.cos(this.elapsed * 17.3 + f.phase * 1.7);
      const flicker = 1 + waveA * 0.12 + waveB * 0.06;

      f.outerFlame.scale.set(1 + waveB * 0.08, flicker);
      f.outerFlame.skew.x = waveA * 0.09;
      f.innerFlame.scale.set(1 + waveA * 0.07, flicker * 0.96);

      f.halo.alpha = f.baseHaloAlpha + waveA * 0.1 + waveB * 0.05;
      const haloScale = 1 + waveA * 0.05;
      f.halo.scale.set(f.baseHaloScaleX * haloScale, f.baseHaloScaleY * haloScale);
    }

    // 4. Magma obelisk pulse
    for (let i = 0; i < this.obelisks.length; i++) {
      const ob = this.obelisks[i];
      const pulse = 0.75 + Math.sin(this.elapsed * 2.8 + ob.phase) * 0.25;
      ob.halo.alpha = 0.45 + pulse * 0.35;
      const s = 0.92 + pulse * 0.14;
      ob.halo.scale.set(1.45 * s, 0.95 * s);
    }

    // 5. Tree canopy wind sway
    for (let i = 0; i < this.trees.length; i++) {
      const tree = this.trees[i];
      tree.sprite.rotation = Math.sin(this.elapsed * tree.speed + tree.phase) * tree.amplitude;
    }

    // 6. Ambient particles (lightweight 60fps transform updates)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const t = this.elapsed * p.speed + p.phase;

      if (p.kind === 'ember' || p.kind === 'ash') {
        p.x += (p.vx + Math.sin(t) * 10) * clampedDt;
        p.y += p.vy * clampedDt;
        const heightOffset = p.originY - p.y;
        p.sprite.alpha = p.baseAlpha * Math.max(0, 1 - heightOffset / 90);

        if (heightOffset > 90) {
          p.x = p.originX + Math.sin(t * 1.9) * p.maxRange * 0.75;
          p.y = p.originY + Math.cos(t * 1.3) * p.maxRange * 0.35;
        }
      } else if (p.kind === 'firefly') {
        p.x += (p.vx + Math.cos(t) * 14) * clampedDt;
        p.y += (p.vy + Math.sin(t * 1.3) * 8) * clampedDt;
        p.sprite.alpha = p.baseAlpha * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.6)));

        if (Math.hypot(p.x - p.originX, (p.y - p.originY) * 1.7) > p.maxRange) {
          p.x = p.originX + (p.originX - p.x) * 0.8;
          p.y = p.originY + (p.originY - p.y) * 0.8;
        }
      } else {
        p.x += Math.cos(t * 0.7) * 8 * clampedDt;
        p.y += (-6 + Math.sin(t) * 4) * clampedDt;
        p.sprite.alpha = p.baseAlpha * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4)));

        if (p.originY - p.y > 65 || Math.abs(p.x - p.originX) > p.maxRange) {
          p.x = p.originX + Math.sin(t * 2.1) * p.maxRange * 0.7;
          p.y = p.originY + 18;
        }
      }

      p.sprite.position.set(p.x, p.y);
    }
  }
}
