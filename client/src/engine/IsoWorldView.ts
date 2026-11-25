import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  CLASS_DEFS,
  MONSTER_TEMPLATES,
  RARITY_META,
  TILE_HEIGHT,
  TILE_WIDTH,
  distance,
  toCartesian,
  toIsometric,
  type MapId,
} from '@mmorpg/shared';
import type { GameClient } from '../net/GameClient.js';
import type { AutoBattleController } from '../auto/AutoBattleController.js';
import { LivingWorldLayer, getPortalsForMap } from './LivingWorldLayer.js';
import {
  createHeroRig,
  createMonsterRig,
  triggerAttackAnim,
  triggerHitFlash,
  updateUnitRig,
  type UnitRig,
} from './UnitRenderer.js';

interface EntityVisual {
  rig: UnitRig;
  interpX: number;
  interpY: number;
  facingRight: boolean;
}

export class IsoWorldView {
  private app = new Application();
  private worldContainer = new Container();
  private livingWorld = new LivingWorldLayer();
  private dropLayer = new Container();
  private entityLayer = new Container();
  private fxLayer = new Container();

  private playerVisuals = new Map<string, EntityVisual>();
  private monsterVisuals = new Map<string, EntityVisual>();
  private dropVisuals = new Map<string, Graphics>();
  private targetRing = new Graphics();
  private moveMarker = new Graphics();
  private moveMarkerAlpha = 0;
  private lastPortalAt = 0;

  public selectedMonsterId: string | null = null;
  public batterySaver = false;

  constructor(
    private mountEl: HTMLElement,
    private client: GameClient,
    private autoCtrl: AutoBattleController,
    private onTargetChanged: () => void
  ) {}

  public async init() {
    await this.app.init({
      resizeTo: this.mountEl,
      backgroundColor: 0x06080d,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    this.mountEl.appendChild(this.app.canvas);
    this.entityLayer.sortableChildren = true;

    this.livingWorld.buildWorld();
    this.worldContainer.addChild(this.livingWorld.groundLayer);
    this.worldContainer.addChild(this.dropLayer);
    this.worldContainer.addChild(this.moveMarker);
    this.worldContainer.addChild(this.targetRing);
    this.worldContainer.addChild(this.livingWorld.propLayer);
    this.worldContainer.addChild(this.entityLayer);
    this.worldContainer.addChild(this.livingWorld.lightLayer);
    this.worldContainer.addChild(this.livingWorld.particleLayer);
    this.worldContainer.addChild(this.fxLayer);
    this.app.stage.addChild(this.worldContainer);

    this.setupPointerInput();

    this.app.ticker.maxFPS = 60;
    this.app.ticker.add((ticker) => this.renderFrame(ticker.deltaMS / 1000));
  }

  public setBatterySaver(enabled: boolean) {
    this.batterySaver = enabled;
    this.app.ticker.maxFPS = enabled ? 18 : 60;
  }

  public loadMap(mapId: MapId) {
    this.selectedMonsterId = null;
    this.autoCtrl.currentTargetId = null;
    this.livingWorld.buildWorld(mapId);
    this.lastPortalAt = Date.now();
  }

  private setupPointerInput() {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on('pointerdown', (e) => {
      const local = this.worldContainer.toLocal(e.global);
      const cart = toCartesian(local.x, local.y);

      // Select monster target
      const clickedMob = this.client.monsters.find((m) => distance(cart, m) <= 1.25);
      if (clickedMob) {
        this.selectedMonsterId = clickedMob.id;
        this.autoCtrl.currentTargetId = clickedMob.id;
        this.onTargetChanged();
        return;
      }

      // Pickup drop
      const clickedDrop = this.client.drops.find((d) => distance(cart, d) <= 1.0);
      if (clickedDrop && distance({ x: this.client.localX, y: this.client.localY }, clickedDrop) <= 2.4) {
        this.client.send({ type: 'pickup', dropId: clickedDrop.id });
        return;
      }

      // Tap-to-move (triggers manual override if AUTO is active)
      this.autoCtrl.triggerManualOverride();
      this.client.sendMove(cart.x, cart.y);

      const iso = toIsometric(cart.x, cart.y);
      this.moveMarker.clear();
      this.moveMarker.ellipse(iso.x, iso.y, 14, 7).stroke({ color: 0x38bdf8, width: 2 });
      this.moveMarkerAlpha = 1;
    });
  }

  private renderFrame(dt: number) {
    this.autoCtrl.update();
    this.livingWorld.update(dt);

    // Client-side prediction for local player
    const dMove = Math.hypot(
      this.client.localTargetX - this.client.localX,
      this.client.localTargetY - this.client.localY
    );
    if (dMove > 0.05) {
      const speed = CLASS_DEFS[this.client.heroClass].moveSpeed;
      const step = Math.min(dMove, speed * dt);
      this.client.localX += ((this.client.localTargetX - this.client.localX) / dMove) * step;
      this.client.localY += ((this.client.localTargetY - this.client.localY) / dMove) * step;
    }

    // Center camera smoothly on local player
    const camIso = toIsometric(this.client.localX, this.client.localY);
    const viewW = this.app.screen.width;
    const viewH = this.app.screen.height;
    this.worldContainer.x = viewW / 2 - camIso.x;
    this.worldContainer.y = viewH * 0.44 - camIso.y;

    if (this.moveMarkerAlpha > 0) {
      this.moveMarkerAlpha = Math.max(0, this.moveMarkerAlpha - dt * 1.8);
      this.moveMarker.alpha = this.moveMarkerAlpha;
    }

    // Check portal collision for seamless map travel
    const now = Date.now();
    if (now - this.lastPortalAt > 2500) {
      const portals = getPortalsForMap(this.client.mapId);
      const hit = portals.find((pt) => distance({ x: this.client.localX, y: this.client.localY }, pt) <= 1.2);
      if (hit) {
        this.lastPortalAt = now;
        this.client.send({ type: 'change_map', mapId: hit.toMap });
      }
    }

    this.syncPlayers(dt);
    this.syncMonsters(dt);
    this.syncDrops();
    this.syncCombatTexts();
    this.updateTargetRing();
  }

  private syncPlayers(dt: number) {
    const activeIds = new Set<string>();
    for (const p of this.client.players) {
      activeIds.add(p.id);
      let vis = this.playerVisuals.get(p.id);
      if (!vis) {
        const rig = createHeroRig(p.name, p.heroClass, p.id === this.client.playerId);
        vis = { rig, interpX: p.x, interpY: p.y, facingRight: true };
        this.playerVisuals.set(p.id, vis);
        this.entityLayer.addChild(rig.container);
      }

      const prevIsoX = toIsometric(vis.interpX, vis.interpY).x;
      let isMoving = false;

      if (p.id === this.client.playerId) {
        isMoving = Math.hypot(this.client.localTargetX - this.client.localX, this.client.localTargetY - this.client.localY) > 0.08;
        vis.interpX = this.client.localX;
        vis.interpY = this.client.localY;
      } else {
        const dist = Math.hypot(p.x - vis.interpX, p.y - vis.interpY);
        isMoving = dist > 0.06;
        vis.interpX += (p.x - vis.interpX) * Math.min(1, dt * 12);
        vis.interpY += (p.y - vis.interpY) * Math.min(1, dt * 12);
      }

      const iso = toIsometric(vis.interpX, vis.interpY);
      if (Math.abs(iso.x - prevIsoX) > 0.25) {
        vis.facingRight = iso.x >= prevIsoX;
      }
      vis.rig.container.x = iso.x;
      vis.rig.container.y = iso.y;
      vis.rig.container.zIndex = iso.y;

      updateUnitRig(vis.rig, dt, isMoving, vis.facingRight, p.hp / Math.max(1, p.maxHp), false);
    }

    for (const [id, vis] of this.playerVisuals.entries()) {
      if (!activeIds.has(id)) {
        this.entityLayer.removeChild(vis.rig.container);
        this.playerVisuals.delete(id);
      }
    }
  }

  private syncMonsters(dt: number) {
    const activeIds = new Set<string>();
    for (const m of this.client.monsters) {
      activeIds.add(m.id);
      let vis = this.monsterVisuals.get(m.id);
      const tpl = MONSTER_TEMPLATES[m.templateId];
      if (!vis) {
        const rig = createMonsterRig(m.templateId, `${m.name} Lv.${m.level}`, tpl.scale, tpl.isBoss);
        vis = { rig, interpX: m.x, interpY: m.y, facingRight: true };
        this.monsterVisuals.set(m.id, vis);
        this.entityLayer.addChild(rig.container);
      }

      const prevIsoX = toIsometric(vis.interpX, vis.interpY).x;
      const isMoving = Math.hypot(m.x - vis.interpX, m.y - vis.interpY) > 0.05;
      vis.interpX += (m.x - vis.interpX) * Math.min(1, dt * 12);
      vis.interpY += (m.y - vis.interpY) * Math.min(1, dt * 12);

      const iso = toIsometric(vis.interpX, vis.interpY);
      if (Math.abs(iso.x - prevIsoX) > 0.25) {
        vis.facingRight = iso.x >= prevIsoX;
      }
      vis.rig.container.x = iso.x;
      vis.rig.container.y = iso.y;
      vis.rig.container.zIndex = iso.y;

      updateUnitRig(vis.rig, dt, isMoving, vis.facingRight, m.hp / Math.max(1, m.maxHp), true);
    }

    for (const [id, vis] of this.monsterVisuals.entries()) {
      if (!activeIds.has(id)) {
        this.entityLayer.removeChild(vis.rig.container);
        this.monsterVisuals.delete(id);
      }
    }
  }

  private syncDrops() {
    const activeIds = new Set<string>();
    for (const d of this.client.drops) {
      activeIds.add(d.id);
      let g = this.dropVisuals.get(d.id);
      if (!g) {
        g = new Graphics();
        const color =
          d.templateId === 'gold'
            ? 0xfacc15
            : Number(RARITY_META[d.rarity].color.replace('#', '0x'));
        // Gem / coin diamond shape with glow halo
        g.circle(0, 0, d.templateId === 'gold' ? 7 : 10).fill({ color, alpha: 0.22 });
        g.poly([0, -6, 5, 0, 0, 6, -5, 0])
          .fill({ color })
          .stroke({ color: 0xffffff, width: 1.2 });
        this.dropVisuals.set(d.id, g);
        this.dropLayer.addChild(g);
      }
      const iso = toIsometric(d.x, d.y);
      g.x = iso.x;
      g.y = iso.y;
    }

    for (const [id, g] of this.dropVisuals.entries()) {
      if (!activeIds.has(id)) {
        this.dropLayer.removeChild(g);
        this.dropVisuals.delete(id);
      }
    }
  }

  private syncCombatTexts() {
    const now = Date.now();
    this.fxLayer.removeChildren();
    this.client.combatTexts = this.client.combatTexts.filter((ct) => now - ct.createdAt < 750);
    this.client.skillEffects = this.client.skillEffects.filter((fx) => now - fx.createdAt < 380);

    // Draw Auto-Battle Anchor zone ring when active
    if (this.autoCtrl.config.enabled && this.autoCtrl.config.anchorMode !== 'unlimited') {
      const isoA = toIsometric(this.autoCtrl.anchorX, this.autoCtrl.anchorY);
      const rTiles = this.autoCtrl.config.anchorMode === 'short' ? 4.5 : 11;
      const anchorG = new Graphics()
        .ellipse(isoA.x, isoA.y, rTiles * (TILE_WIDTH / 2), rTiles * (TILE_HEIGHT / 2))
        .stroke({ color: 0x22c55e, width: 1.5, alpha: 0.35 });
      this.fxLayer.addChild(anchorG);
    }

    // Draw Skill VFX shockwaves & trigger rig animations once
    for (const fx of this.client.skillEffects) {
      if (!fx.triggered) {
        fx.triggered = true;
        if (fx.attackerId) {
          const att = this.playerVisuals.get(fx.attackerId);
          if (att) triggerAttackAnim(att.rig);
        }
        if (fx.targetId) {
          const tgt = this.monsterVisuals.get(fx.targetId);
          if (tgt) triggerHitFlash(tgt.rig);
        }
      }

      const age = (now - fx.createdAt) / 380;
      const iso = toIsometric(fx.x, fx.y);
      const ring = new Graphics()
        .ellipse(iso.x, iso.y, fx.radius * (0.4 + age * 0.8), fx.radius * 0.55 * (0.4 + age * 0.8))
        .stroke({ color: fx.color, width: 2.5, alpha: 1 - age });
      this.fxLayer.addChild(ring);
    }

    for (const ct of this.client.combatTexts) {
      const age = (now - ct.createdAt) / 750;
      const iso = toIsometric(ct.x, ct.y);
      const txt = new Text({
        text: ct.text,
        style: {
          fontSize: 15,
          fontWeight: 'bold',
          fill: ct.color,
          stroke: { color: 0x000000, width: 3 },
        },
      });
      txt.anchor.set(0.5);
      txt.x = iso.x;
      txt.y = iso.y - 32 - age * 26;
      txt.alpha = 1 - age;
      this.fxLayer.addChild(txt);
    }
  }

  private updateTargetRing() {
    this.targetRing.clear();
    const targetId = this.selectedMonsterId ?? this.autoCtrl.currentTargetId;
    if (!targetId) return;
    const vis = this.monsterVisuals.get(targetId);
    if (!vis) return;
    this.targetRing
      .ellipse(vis.rig.container.x, vis.rig.container.y, 20, 11)
      .stroke({ color: 0xef4444, width: 2 });
  }
}
