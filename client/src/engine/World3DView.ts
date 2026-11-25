import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CLASS_DEFS,
  MAP_SIZE,
  MONSTER_TEMPLATES,
  RARITY_META,
  SAFE_SPAWN,
  distance,
  getPowerTier,
  type MapId,
} from '@mmorpg/shared';
import type { GameClient } from '../net/GameClient.js';
import type { AutoBattleController } from '../auto/AutoBattleController.js';
import { getPortalsForMap } from './LivingWorldLayer.js';
import {
  createSkyDome,
  createRuneCircleMesh,
  createLavaPoolMesh,
  buildTerrainMaps,
  createInstancedGrass,
} from './WorldShaders.js';

interface LoadedAsset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

interface Unit3D {
  root: THREE.Group;
  modelGroup: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  clips: Record<string, THREE.AnimationAction>;
  currentClip: string;
  hpFill: THREE.Mesh;
  selfRing?: THREE.Mesh;
  interpX: number;
  interpZ: number;
  yaw: number;
  attackTimer: number;
  hitFlashTimer: number;
}

export class World3DView {
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private loader = new GLTFLoader();
  private assets = new Map<string, LoadedAsset>();

  private mapGroup = new THREE.Group();
  private entityGroup = new THREE.Group();
  private dropGroup = new THREE.Group();
  private shaderTimeUniforms: Array<THREE.IUniform<number>> = [];
  private fxGroup = new THREE.Group();

  private playerUnits = new Map<string, Unit3D>();
  private monsterUnits = new Map<string, Unit3D>();
  private dropMeshes = new Map<string, THREE.Object3D>();
  private petMesh: THREE.Object3D | null = null;
  private petMixer: THREE.AnimationMixer | null = null;
  private mountMesh: THREE.Object3D | null = null;
  private mountId: string | null = null;
  private mountMixer: THREE.AnimationMixer | null = null;

  private groundMesh!: THREE.Mesh;
  private targetRing!: THREE.Mesh;
  private moveMarker!: THREE.Mesh;
  private moveMarkerAlpha = 0;
  private autoAnchorRing!: THREE.Mesh;
  private flickers: Array<{ light: THREE.PointLight; base: number; phase: number }> = [];
  private particles: THREE.Points | null = null;

  private raycaster = new THREE.Raycaster();
  private pointerNDC = new THREE.Vector2();
  private lastFrameMs = performance.now();
  private lastRenderMs = 0;
  private lastPortalAt = 0;
  private currentMapId: MapId = 'vale_eldoria';

  public selectedMonsterId: string | null = null;
  public batterySaver = false;

  constructor(
    private mountEl: HTMLElement,
    private client: GameClient,
    private autoCtrl: AutoBattleController,
    private onTargetChanged: () => void
  ) {}

  public async init() {
    const w = this.mountEl.clientWidth || 420;
    const h = this.mountEl.clientHeight || 680;

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.5, 160);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;

    this.mountEl.appendChild(this.renderer.domElement);

    // PBR Environment Map so metallic armor, gold, and blades reflect light instead of black
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 1.05;

    // Base Lighting
    const hemi = new THREE.HemisphereLight(0xb4d4ff, 0x1e242c, 1.25);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1d6, 2.0);
    sun.position.set(18, 28, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 90;
    const d = 28;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(0x60a5fa, 0.75);
    rim.position.set(-18, 14, -18);
    this.scene.add(rim);

    const sky = createSkyDome();
    this.scene.add(sky.mesh);

    this.scene.add(this.mapGroup, this.dropGroup, this.entityGroup, this.fxGroup);

    // Preload all real GLB models
    const modelNames = [
      'warrior',
      'mage',
      'archer',
      'assassin',
      'paladin',
      'slime',
      'wolf',
      'orc',
      'boss_golem',
      'ancient_lich',
      'sand_golem',
      'ice_dragon',
      'abyss_lord',
      'celestial_warden',
      'eternal_emperor',
      'bandit',
      'spider',
      'treant',
      'wraith',
      'orc_shaman',
      'skeleton_knight',
      'scarab',
      'magma_elem',
      'frost_yeti',
      'abyss_fiend',
      'seraph_fallen',
      'void_stalker',
      'pet_fairy',
      'mount_horse',
      'mount_wolf',
      'mount_lava',
      'mount_griffin',
      'mount_dragon',
      'pine_tree',
      'oak_tree',
      'brazier',
      'campfire',
      'obelisk',
      'portal',
      'pillar',
      'rock_spire',
      'chest',
      'coin',
      'tile_plaza',
      'tile_arena',
      'tile_grove',
      'tile_ruins',
    ];
    await Promise.all(modelNames.map((n) => this.preloadGlb(n)));

    this.buildSharedMarkers();
    this.buildWorld3D('vale_eldoria');
    this.setupPointerInput();

    window.addEventListener('resize', () => {
      const nw = this.mountEl.clientWidth || 420;
      const nh = this.mountEl.clientHeight || 680;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh);
    });

    const loop = (now: number) => {
      requestAnimationFrame(loop);
      if (this.batterySaver && now - this.lastRenderMs < 55) return;
      this.lastRenderMs = now;
      const dt = Math.min(0.08, (now - this.lastFrameMs) / 1000);
      this.lastFrameMs = now;
      this.renderFrame(dt);
    };
    requestAnimationFrame(loop);
  }

  private async preloadGlb(name: string) {
    try {
      const gltf: GLTF = await this.loader.loadAsync(`/models/${name}.glb`);
      gltf.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      // Normalize scale to world units using bounding box
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 0.01);
      const targetSize = name.startsWith('tile_')
        ? 9.0
        : name.includes('tree')
        ? 3.8
        : name === 'boss_golem'
        ? 3.1
        : name === 'portal'
        ? 3.0
        : name === 'obelisk' || name === 'pillar' || name === 'rock_spire'
        ? 2.8
        : name === 'coin' || name === 'chest'
        ? 0.75
        : 1.95;
      const normScale = targetSize / maxDim;
      gltf.scene.scale.multiplyScalar(normScale);
      gltf.scene.position.y -= box.min.y * normScale;

      const wrapper = new THREE.Group();
      wrapper.add(gltf.scene);
      this.assets.set(name, { scene: wrapper, animations: gltf.animations ?? [] });
    } catch (err) {
      console.warn(`[World3D] Failed to load /models/${name}.glb:`, err);
    }
  }

  public setBatterySaver(enabled: boolean) {
    this.batterySaver = enabled;
  }

  public loadMap(mapId: MapId) {
    this.selectedMonsterId = null;
    this.autoCtrl.currentTargetId = null;
    this.buildWorld3D(mapId);
    this.lastPortalAt = Date.now();
  }

  private buildSharedMarkers() {
    this.targetRing = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.78, 28),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
    );
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.position.y = 0.04;
    this.targetRing.visible = false;
    this.scene.add(this.targetRing);

    this.moveMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.5, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true })
    );
    this.moveMarker.rotation.x = -Math.PI / 2;
    this.moveMarker.position.y = 0.04;
    this.moveMarker.visible = false;
    this.scene.add(this.moveMarker);

    this.autoAnchorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.0, 48),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    );
    this.autoAnchorRing.rotation.x = -Math.PI / 2;
    this.autoAnchorRing.position.y = 0.03;
    this.autoAnchorRing.visible = false;
    this.scene.add(this.autoAnchorRing);
  }

  private buildWorld3D(mapId: MapId) {
    this.currentMapId = mapId;
    this.mapGroup.clear();
    this.flickers = [];
    this.particles = null;

    const fogColors: Record<MapId, number> = {
      vale_eldoria: 0x0d151c,
      floresta_sombria: 0x0c1418,
      acampamento_orc: 0x1a1510,
      ruinas_antigas: 0x0e1524,
      deserto_escaravelho: 0x241a0d,
      santuario_golem: 0x1a0b09,
      pico_gelido: 0x132233,
      abismo_eterno: 0x140614,
      cidadela_celestial: 0x1e2438,
      torre_eterna: 0x120824,
    };
    const fogColor = fogColors[mapId] ?? 0x0d151c;
    this.scene.background = new THREE.Color(fogColor);
    this.scene.fog = new THREE.FogExp2(fogColor, 0.018);
    this.shaderTimeUniforms = [];

    // 3D Displaced Biome Terrain (caldera depression, perimeter hills, bump-mapped cobble & dirt)
    const { map: tex, bumpMap } = buildTerrainMaps(mapId);
    const groundGeo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 64, 64);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i) + MAP_SIZE / 2;
      const lz = -posAttr.getY(i) + MAP_SIZE / 2;
      const edgeDist = Math.min(lx, MAP_SIZE - lx, lz, MAP_SIZE - lz);
      const hill = edgeDist < 6 ? Math.pow((6 - edgeDist) / 6, 1.8) * 3.4 : 0;
      const ripple = Math.sin(lx * 0.45) * Math.cos(lz * 0.45) * 0.12;
      let caldera = 0;
      if (mapId === 'santuario_golem') {
        const dc = Math.hypot(lx - 24, lz - 14);
        if (dc < 12) caldera = -Math.max(0, 1 - dc / 12) * 0.85;
      }
      posAttr.setZ(i, hill + caldera + (Math.hypot(lx - 24, lz - 24) > 6 ? ripple : 0));
    }
    groundGeo.computeVertexNormals();

    this.groundMesh = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ map: tex, bumpMap, bumpScale: 0.22, roughness: 0.88, metalness: 0.04 })
    );
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(MAP_SIZE / 2, 0, MAP_SIZE / 2);
    this.groundMesh.receiveShadow = true;
    this.mapGroup.add(this.groundMesh);

    // Place real GLB props & tiles per map
    if (mapId === 'vale_eldoria') {
      this.spawnProp('tile_plaza', SAFE_SPAWN.x, SAFE_SPAWN.y, 1.05);
      this.spawnProp('pillar', 12, 12, 1.0);
      this.spawnProp('pillar', 16, 16, 1.0);
      this.spawnProp('rock_spire', 33, 14, 1.1);
      this.spawnProp('rock_spire', 36, 17, 0.9);

      for (const [bx, bz] of [[21, 21], [27, 21], [21, 27], [27, 27]]) {
        this.spawnProp('brazier', bx, bz, 1.0, true, 0xff7b29);
      }
      for (let i = 0; i < 24; i++) {
        const tx = ((i * 19 + 7) % 40) + 4;
        const tz = ((i * 29 + 11) % 40) + 4;
        if (Math.hypot(tx - 24, tz - 24) < 7) continue;
        this.spawnProp(i % 2 === 0 ? 'pine_tree' : 'oak_tree', tx, tz, 0.9 + (i % 3) * 0.15);
      }
    } else if (mapId === 'acampamento_orc') {
      this.spawnProp('tile_ruins', 24, 24, 1.15);
      for (const [cx, cz] of [[18, 18], [30, 18], [18, 30], [30, 30], [24, 12]]) {
        this.spawnProp('campfire', cx, cz, 1.15, true, 0xff6a1a);
        this.spawnProp('pillar', cx + 1.8, cz, 1.0);
      }
      for (let i = 0; i < 14; i++) {
        const tx = ((i * 23 + 5) % 38) + 5;
        const tz = ((i * 17 + 9) % 38) + 5;
        if (Math.hypot(tx - 24, tz - 24) < 5) continue;
        this.spawnProp('rock_spire', tx, tz, 0.95);
      }
    } else if (mapId === 'floresta_sombria') {
      this.spawnProp('tile_ruins', 24, 24, 1.1);
      for (const [bx, bz] of [[20, 20], [28, 20], [20, 28], [28, 28]]) {
        this.spawnProp('brazier', bx, bz, 1.0, true, 0xa855f7);
      }
      for (let i = 0; i < 20; i++) {
        const tx = ((i * 21 + 5) % 40) + 4;
        const tz = ((i * 27 + 9) % 40) + 4;
        if (Math.hypot(tx - 24, tz - 24) < 6) continue;
        this.spawnProp('pine_tree', tx, tz, 1.05);
      }
    } else if (mapId === 'ruinas_antigas') {
      this.spawnProp('tile_arena', 24, 14, 1.25);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        this.spawnProp('pillar', 24 + Math.cos(ang) * 9, 14 + Math.sin(ang) * 9, 1.15);
      }
      this.spawnProp('obelisk', 18, 26, 1.1, true, 0x38bdf8);
      this.spawnProp('obelisk', 30, 26, 1.1, true, 0x38bdf8);
    } else if (mapId === 'pico_gelido') {
      this.spawnProp('tile_arena', 24, 14, 1.3);
      for (let i = 0; i < 16; i++) {
        const tx = ((i * 19 + 6) % 38) + 5;
        const tz = ((i * 23 + 8) % 38) + 5;
        if (Math.hypot(tx - 24, tz - 14) < 8 || Math.hypot(tx - 24, tz - 28) < 5) continue;
        this.spawnProp('rock_spire', tx, tz, 1.15);
      }
      this.spawnProp('obelisk', 18, 22, 1.2, true, 0x7dd3fc);
      this.spawnProp('obelisk', 30, 22, 1.2, true, 0x7dd3fc);
    } else if (mapId === 'deserto_escaravelho') {
      this.spawnProp('tile_arena', 24, 14, 1.25);
      for (let i = 0; i < 12; i++) {
        const tx = ((i * 21 + 5) % 38) + 5;
        const tz = ((i * 19 + 8) % 38) + 5;
        if (Math.hypot(tx - 24, tz - 14) < 7) continue;
        this.spawnProp('rock_spire', tx, tz, 1.1);
      }
      this.spawnProp('obelisk', 18, 22, 1.15, true, 0xfacc15);
      this.spawnProp('obelisk', 30, 22, 1.15, true, 0xfacc15);
    } else if (mapId === 'cidadela_celestial') {
      this.spawnProp('tile_plaza', 24, 14, 1.35);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        this.spawnProp('pillar', 24 + Math.cos(ang) * 9, 14 + Math.sin(ang) * 9, 1.25);
      }
      this.spawnProp('obelisk', 18, 22, 1.2, true, 0xfde047);
      this.spawnProp('obelisk', 30, 22, 1.2, true, 0xfde047);
    } else if (mapId === 'torre_eterna') {
      this.spawnProp('tile_arena', 24, 14, 1.4);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        this.spawnProp('obelisk', 24 + Math.cos(ang) * 9.5, 14 + Math.sin(ang) * 9.5, 1.35, true, 0xc084fc);
      }
    } else if (mapId === 'abismo_eterno') {
      this.spawnProp('tile_arena', 24, 14, 1.4);
      const lava = createLavaPoolMesh();
      lava.mesh.position.set(24, 0.05, 14);
      this.mapGroup.add(lava.mesh);
      this.shaderTimeUniforms.push(lava.uTime);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        this.spawnProp('obelisk', 24 + Math.cos(ang) * 9.5, 14 + Math.sin(ang) * 9.5, 1.3, true, 0xf43f5e);
      }
    } else {
      this.spawnProp('tile_arena', 24, 14, 1.3);
      const lava = createLavaPoolMesh();
      lava.mesh.position.set(24, 0.05, 14);
      this.mapGroup.add(lava.mesh);
      this.shaderTimeUniforms.push(lava.uTime);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        this.spawnProp('obelisk', 24 + Math.cos(ang) * 9, 14 + Math.sin(ang) * 9, 1.2, true, 0xff5500);
      }
    }

    if (mapId === 'vale_eldoria') {
      const rune = createRuneCircleMesh();
      rune.mesh.position.set(24, 0.22, 24);
      this.mapGroup.add(rune.mesh);
      this.shaderTimeUniforms.push(rune.uTime);
    }

    const grass = createInstancedGrass(mapId, this.batterySaver ? 400 : 1200);
    this.mapGroup.add(grass);

    // Portals
    for (const p of getPortalsForMap(mapId)) {
      this.spawnProp('portal', p.x, p.y, 1.15, true, 0x38bdf8);
    }

    // 3D Ambient Particles
    const pCount = 120;
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pos[i * 3] = Math.random() * MAP_SIZE;
      pos[i * 3 + 1] = 0.4 + Math.random() * 3.5;
      pos[i * 3 + 2] = Math.random() * MAP_SIZE;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pColor = mapId === 'santuario_golem' ? 0xf97316 : mapId === 'acampamento_orc' ? 0xfbbf24 : 0x4ade80;
    this.particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: pColor, size: 0.16, transparent: true, opacity: 0.75 })
    );
    this.mapGroup.add(this.particles);
  }

  private spawnProp(name: string, x: number, z: number, scale: number, withLight = false, lightColor = 0xff8833) {
    const asset = this.assets.get(name);
    if (!asset) return;
    const clone = asset.scene.clone(true);
    clone.position.set(x, 0, z);
    clone.scale.setScalar(scale);
    this.mapGroup.add(clone);

    if (withLight) {
      const light = new THREE.PointLight(lightColor, 3.2, 11, 1.6);
      light.position.set(x, 1.6, z);
      this.mapGroup.add(light);
      this.flickers.push({ light, base: 3.2, phase: Math.random() * 10 });
    }
  }

  private createTerrainTexture(mapId: MapId): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    const baseGrad = ctx.createLinearGradient(0, 0, 512, 512);
    if (mapId === 'vale_eldoria') {
      baseGrad.addColorStop(0, '#14291b');
      baseGrad.addColorStop(1, '#1c3824');
    } else if (mapId === 'acampamento_orc') {
      baseGrad.addColorStop(0, '#2a2116');
      baseGrad.addColorStop(1, '#3a2c1c');
    } else {
      baseGrad.addColorStop(0, '#180d10');
      baseGrad.addColorStop(1, '#241112');
    }
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Organic grass/soil/magma brush strokes instead of dots
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.strokeStyle =
        mapId === 'vale_eldoria'
          ? i % 3 === 0 ? 'rgba(52,168,83,0.22)' : 'rgba(14,32,20,0.28)'
          : mapId === 'acampamento_orc'
          ? i % 3 === 0 ? 'rgba(146,96,42,0.22)' : 'rgba(28,20,12,0.3)'
          : i % 6 === 0 ? 'rgba(249,115,22,0.35)' : 'rgba(12,6,8,0.38)';
      ctx.lineWidth = mapId === 'vale_eldoria' ? 1.5 : 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 14, y - 4 - Math.random() * 8);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    return tex;
  }

  private setupPointerInput() {
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);

      // Check monster hitboxes
      const mobHits = this.raycaster.intersectObjects([...this.monsterUnits.values()].map((u) => u.root), true);
      if (mobHits.length > 0) {
        let obj: THREE.Object3D | null = mobHits[0].object;
        while (obj && !obj.userData.monsterId) obj = obj.parent;
        if (obj?.userData.monsterId) {
          this.selectedMonsterId = obj.userData.monsterId as string;
          this.autoCtrl.currentTargetId = this.selectedMonsterId;
          this.onTargetChanged();
          return;
        }
      }

      // Raycast ground plane
      const hits = this.raycaster.intersectObject(this.groundMesh);
      if (hits.length > 0) {
        const pt = hits[0].point;
        this.autoCtrl.triggerManualOverride();
        this.client.sendMove(pt.x, pt.z);
        this.moveMarker.position.set(pt.x, 0.05, pt.z);
        this.moveMarker.visible = true;
        this.moveMarkerAlpha = 1;
      }
    });
  }

  private renderFrame(dt: number) {
    this.autoCtrl.update();

    // Local prediction
    const dMove = Math.hypot(this.client.localTargetX - this.client.localX, this.client.localTargetY - this.client.localY);
    if (dMove > 0.05) {
      const speed = CLASS_DEFS[this.client.heroClass].moveSpeed;
      const step = Math.min(dMove, speed * dt);
      this.client.localX += ((this.client.localTargetX - this.client.localX) / dMove) * step;
      this.client.localY += ((this.client.localTargetY - this.client.localY) / dMove) * step;
    }

    // Isometric-angle 3D camera follow (cinematic hero scale & horizon depth)
    this.camera.position.set(this.client.localX + 10.2, 11.8, this.client.localY + 10.2);
    this.camera.lookAt(this.client.localX, 0.9, this.client.localY);

    // Portal collision
    const now = Date.now();
    if (now - this.lastPortalAt > 2500) {
      const hit = getPortalsForMap(this.currentMapId).find(
        (pt) => distance({ x: this.client.localX, y: this.client.localY }, pt) <= 1.25
      );
      if (hit) {
        this.lastPortalAt = now;
        this.client.send({ type: 'change_map', mapId: hit.toMap });
      }
    }

    // Flicker lights & animate shaders/particles
    for (const u of this.shaderTimeUniforms) {
      u.value += dt;
    }
    const t = now * 0.004;
    for (const f of this.flickers) {
      f.light.intensity = f.base + Math.sin(t * 2.5 + f.phase) * 0.45;
    }
    if (this.particles) {
      const attr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        let y = attr.getY(i) + dt * 0.55;
        if (y > 4.2) y = 0.3;
        attr.setY(i, y);
      }
      attr.needsUpdate = true;
    }

    if (this.moveMarkerAlpha > 0) {
      this.moveMarkerAlpha = Math.max(0, this.moveMarkerAlpha - dt * 1.8);
      (this.moveMarker.material as THREE.MeshBasicMaterial).opacity = this.moveMarkerAlpha;
      if (this.moveMarkerAlpha <= 0) this.moveMarker.visible = false;
    }

    this.syncUnits(dt);
    this.syncDrops(dt);
    this.syncFx(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private createUnit3D(assetKey: string, label: string, scale: number, isSelf: boolean, hpColor: number, tint?: number): Unit3D {
    const root = new THREE.Group();
    const asset = this.assets.get(assetKey);
    const modelGroup = asset ? asset.scene.clone(true) : new THREE.Group();
    if (tint !== undefined) {
      modelGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (m.material instanceof THREE.MeshStandardMaterial) {
            const mat = m.material.clone();
            const tc = new THREE.Color(tint);
            mat.color.lerp(tc, 0.72);
            if (mat.emissiveIntensity > 0) mat.emissive.lerp(tc, 0.65);
            m.material = mat;
          }
        }
      });
    }
    modelGroup.scale.setScalar(scale);
    root.add(modelGroup);

    let selfRing: THREE.Mesh | undefined;
    if (isSelf) {
      selfRing = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.68, 24),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
      );
      selfRing.rotation.x = -Math.PI / 2;
      selfRing.position.y = 0.03;
      root.add(selfRing);
    }

    // 3D HP Bar & Label Sprite
    const hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.11),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
    );
    hpBg.position.set(0, 2.25 * scale, 0);
    hpBg.quaternion.copy(this.camera.quaternion);
    root.add(hpBg);

    const hpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.06, 0.08),
      new THREE.MeshBasicMaterial({ color: hpColor, side: THREE.DoubleSide })
    );
    hpFill.position.set(0, 2.25 * scale, 0.01);
    hpFill.quaternion.copy(this.camera.quaternion);
    root.add(hpFill);

    const nameSprite = this.makeLabelSprite(label, isSelf ? '#fbbf24' : '#f1f5f9');
    nameSprite.position.set(0, 2.55 * scale, 0);
    root.add(nameSprite);

    let mixer: THREE.AnimationMixer | null = null;
    const clips: Record<string, THREE.AnimationAction> = {};
    if (asset && asset.animations.length > 0) {
      mixer = new THREE.AnimationMixer(modelGroup);
      for (const clip of asset.animations) {
        const lower = clip.name.toLowerCase();
        if (lower.includes('walk') || lower.includes('run')) {
          if (!clips.Walk) clips.Walk = mixer.clipAction(clip);
        } else if (lower.includes('attack') || lower.includes('slash') || lower.includes('hit') || lower.includes('bite') || lower.includes('cast')) {
          if (!clips.Attack) clips.Attack = mixer.clipAction(clip);
        } else if (lower.includes('idle')) {
          if (!clips.Idle) clips.Idle = mixer.clipAction(clip);
        }
      }
      if (!clips.Idle) clips.Idle = mixer.clipAction(asset.animations[0]);
      clips.Idle?.play();
    }

    return {
      root,
      modelGroup,
      mixer,
      clips,
      currentClip: 'Idle',
      hpFill,
      selfRing,
      interpX: 0,
      interpZ: 0,
      yaw: 0,
      attackTimer: 0,
      hitFlashTimer: 0,
    };
  }

  private makeLabelSprite(text: string, color: string): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 384;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.font = 'bold 24px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.strokeText(text, 192, 42);
    ctx.fillStyle = color;
    ctx.fillText(text, 192, 42);
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(3.2, 0.58, 1);
    return sp;
  }

  private syncUnits(dt: number) {
    // Players
    const pIds = new Set<string>();
    for (const p of this.client.players) {
      pIds.add(p.id);
      let u = this.playerUnits.get(p.id);
      if (!u) {
        u = this.createUnit3D(p.heroClass, p.name, 0.95, p.id === this.client.playerId, 0x22c55e);
        u.interpX = p.x;
        u.interpZ = p.y;
        this.playerUnits.set(p.id, u);
        this.entityGroup.add(u.root);
      }
      const prevX = u.interpX;
      const prevZ = u.interpZ;
      let isMoving = false;
      if (p.id === this.client.playerId) {
        isMoving = Math.hypot(this.client.localTargetX - this.client.localX, this.client.localTargetY - this.client.localY) > 0.08;
        u.interpX = this.client.localX;
        u.interpZ = this.client.localY;
        if (u.selfRing && this.client.vitals) {
          const tier = getPowerTier(this.client.vitals.cp);
          (u.selfRing.material as THREE.MeshBasicMaterial).color.setHex(tier.auraHex);
          const maxUp = Object.values(this.client.equipment).reduce((m, it) => Math.max(m, it?.upgradeLevel ?? 0), 0);
          const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.08 + (maxUp >= 10 ? 0.14 : 0);
          u.selfRing.scale.setScalar(pulse);
        }
      } else {
        isMoving = Math.hypot(p.x - u.interpX, p.y - u.interpZ) > 0.06;
        u.interpX += (p.x - u.interpX) * Math.min(1, dt * 12);
        u.interpZ += (p.y - u.interpZ) * Math.min(1, dt * 12);
      }
      const dx = u.interpX - prevX;
      const dz = u.interpZ - prevZ;
      if (Math.hypot(dx, dz) > 0.005) u.yaw = Math.atan2(dx, dz);
      this.updateUnit3D(u, dt, isMoving, p.hp / Math.max(1, p.maxHp));
    }
    for (const [id, u] of this.playerUnits.entries()) {
      if (!pIds.has(id)) {
        this.entityGroup.remove(u.root);
        this.playerUnits.delete(id);
      }
    }

    // Monsters
    const mIds = new Set<string>();
    for (const m of this.client.monsters) {
      mIds.add(m.id);
      let u = this.monsterUnits.get(m.id);
      if (!u) {
        const tpl = MONSTER_TEMPLATES[m.templateId];
        u = this.createUnit3D(tpl.modelId ?? m.templateId, `${m.name} Lv.${m.level}`, tpl.scale, false, 0xef4444, tpl.tint);
        u.root.userData.monsterId = m.id;
        u.interpX = m.x;
        u.interpZ = m.y;
        this.monsterUnits.set(m.id, u);
        this.entityGroup.add(u.root);
      }
      const prevX = u.interpX;
      const prevZ = u.interpZ;
      const isMoving = Math.hypot(m.x - u.interpX, m.y - u.interpZ) > 0.05;
      u.interpX += (m.x - u.interpX) * Math.min(1, dt * 12);
      u.interpZ += (m.y - u.interpZ) * Math.min(1, dt * 12);
      const dx = u.interpX - prevX;
      const dz = u.interpZ - prevZ;
      if (Math.hypot(dx, dz) > 0.005) u.yaw = Math.atan2(dx, dz);
      this.updateUnit3D(u, dt, isMoving, m.hp / Math.max(1, m.maxHp));
    }
    for (const [id, u] of this.monsterUnits.entries()) {
      if (!mIds.has(id)) {
        this.entityGroup.remove(u.root);
        this.monsterUnits.delete(id);
      }
    }

    // Target ring
    const tgtId = this.selectedMonsterId ?? this.autoCtrl.currentTargetId;
    const tgtUnit = tgtId ? this.monsterUnits.get(tgtId) : undefined;
    if (tgtUnit) {
      this.targetRing.position.set(tgtUnit.interpX, 0.05, tgtUnit.interpZ);
      this.targetRing.visible = true;
    } else {
      this.targetRing.visible = false;
    }
  }

  private updateUnit3D(u: Unit3D, dt: number, isMoving: boolean, hpRatio: number) {
    u.root.position.set(u.interpX, 0, u.interpZ);
    u.modelGroup.rotation.y = u.yaw;
    u.hpFill.scale.x = Math.max(0.001, Math.min(1, hpRatio));
    for (const child of u.root.children) {
      if ((child as THREE.Mesh).geometry?.type === 'PlaneGeometry') {
        child.quaternion.copy(this.camera.quaternion);
      }
    }

    if (u.attackTimer > 0) u.attackTimer = Math.max(0, u.attackTimer - dt);
    const nextClip = u.attackTimer > 0 && u.clips.Attack ? 'Attack' : isMoving && u.clips.Walk ? 'Walk' : 'Idle';
    if (nextClip !== u.currentClip && u.clips[nextClip]) {
      u.clips[u.currentClip]?.fadeOut(0.15);
      u.clips[nextClip].reset().fadeIn(0.15).play();
      u.currentClip = nextClip;
    }
    u.mixer?.update(dt);
  }

  private syncDrops(dt: number) {
    const ids = new Set<string>();
    for (const d of this.client.drops) {
      ids.add(d.id);
      let mesh = this.dropMeshes.get(d.id);
      if (!mesh) {
        const asset = this.assets.get(d.templateId === 'gold' ? 'coin' : 'chest');
        if (asset) {
          mesh = asset.scene.clone(true);
        } else {
          const color = d.templateId === 'gold' ? 0xfacc15 : Number(RARITY_META[d.rarity].color.replace('#', '0x'));
          mesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.25, 0),
            new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 })
          );
        }
        mesh.position.set(d.x, 0.25, d.y);
        this.dropMeshes.set(d.id, mesh);
        this.dropGroup.add(mesh);
      }
      mesh.rotation.y += dt * 1.8;
    }
    for (const [id, mesh] of this.dropMeshes.entries()) {
      if (!ids.has(id)) {
        this.dropGroup.remove(mesh);
        this.dropMeshes.delete(id);
      }
    }
  }

  private syncFx(dt: number) {
    const now = Date.now();
    this.fxGroup.clear();
    if (this.client.vitals?.petActive) {
      if (!this.petMesh) {
        const asset = this.assets.get('pet_fairy');
        if (asset) {
          this.petMesh = asset.scene.clone(true);
          this.petMesh.scale.setScalar(0.95);
          this.scene.add(this.petMesh);
          if (asset.animations.length > 0) {
            this.petMixer = new THREE.AnimationMixer(this.petMesh);
            this.petMixer.clipAction(asset.animations[0]).play();
          }
        }
      }
      if (this.petMesh) {
        this.petMesh.visible = true;
        const nowSec = now * 0.001;
        const ang = nowSec * 2.2;
        this.petMesh.position.set(
          this.client.localX + Math.cos(ang) * 0.95,
          0.65 + Math.sin(nowSec * 3.8) * 0.1,
          this.client.localY + Math.sin(ang) * 0.95
        );
        this.petMesh.rotation.y = -ang + Math.PI;
        this.petMixer?.update(dt);
      }
    } else if (this.petMesh) {
      this.petMesh.visible = false;
    }
    const eqMount = this.client.equipment.mount?.templateId ?? null;
    if (eqMount !== this.mountId) {
      if (this.mountMesh) {
        this.scene.remove(this.mountMesh);
        this.mountMesh = null;
        this.mountMixer = null;
      }
      this.mountId = eqMount;
      if (eqMount) {
        const asset = this.assets.get(eqMount);
        if (asset) {
          this.mountMesh = asset.scene.clone(true);
          this.mountMesh.scale.setScalar(0.85);
          this.scene.add(this.mountMesh);
          if (asset.animations.length > 0) {
            this.mountMixer = new THREE.AnimationMixer(this.mountMesh);
            this.mountMixer.clipAction(asset.animations[0]).play();
          }
        }
      }
    }
    if (this.mountMesh) {
      const selfU = this.playerUnits.get(this.client.playerId);
      this.mountMesh.position.set(this.client.localX, 0, this.client.localY);
      if (selfU) this.mountMesh.rotation.y = selfU.yaw;
      this.mountMixer?.update(dt);
    }
    this.client.combatTexts = this.client.combatTexts.filter((ct) => now - ct.createdAt < 750);
    this.client.skillEffects = this.client.skillEffects.filter((fx) => now - fx.createdAt < 380);

    if (this.autoCtrl.config.enabled && this.autoCtrl.config.anchorMode !== 'unlimited') {
      const r = this.autoCtrl.config.anchorMode === 'short' ? 4.5 : 11;
      this.autoAnchorRing.position.set(this.autoCtrl.anchorX, 0.03, this.autoCtrl.anchorY);
      this.autoAnchorRing.scale.setScalar(r);
      this.autoAnchorRing.visible = true;
    } else {
      this.autoAnchorRing.visible = false;
    }

    for (const fx of this.client.skillEffects) {
      if (!fx.triggered) {
        fx.triggered = true;
        const att = fx.attackerId ? this.playerUnits.get(fx.attackerId) : undefined;
        if (att) att.attackTimer = 0.45;
      }
      const age = (now - fx.createdAt) / 380;
      const isAoe = fx.radius > 28;
      const att = fx.attackerId ? this.playerUnits.get(fx.attackerId) : undefined;
      if (att) {
        const dx = fx.x - att.interpX;
        const dz = fx.y - att.interpZ;
        const dist = Math.hypot(dx, dz);
        if (dist > 1.8) {
          const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.09, dist, 6),
            new THREE.MeshBasicMaterial({ color: fx.color, transparent: true, opacity: (1 - age) * 0.85 })
          );
          beam.position.set(att.interpX + dx * 0.5, 0.95, att.interpZ + dz * 0.5);
          beam.rotation.z = Math.PI / 2;
          beam.rotation.y = -Math.atan2(dz, dx);
          this.fxGroup.add(beam);
        } else {
          const slash = new THREE.Mesh(
            new THREE.RingGeometry(0.55, 0.78, 18, 1, 0, Math.PI * 1.1),
            new THREE.MeshBasicMaterial({ color: fx.color, side: THREE.DoubleSide, transparent: true, opacity: (1 - age) * 0.9 })
          );
          slash.position.set(fx.x, 0.95, fx.y);
          slash.rotation.set(0.6, age * 4, 0.4);
          this.fxGroup.add(slash);
        }
      }
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.4 + age * (isAoe ? 2.6 : 1.6), 0.55 + age * (isAoe ? 2.6 : 1.6), 24),
        new THREE.MeshBasicMaterial({ color: fx.color, side: THREE.DoubleSide, transparent: true, opacity: 1 - age })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(fx.x, 0.08, fx.y);
      this.fxGroup.add(ring);
      if (isAoe) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.75 * (1 - age * 0.4), 2.2 * (1 - age * 0.5), 12, 1, true),
          new THREE.MeshBasicMaterial({ color: fx.color, side: THREE.DoubleSide, transparent: true, opacity: (1 - age) * 0.55 })
        );
        pillar.position.set(fx.x, 1.0, fx.y);
        this.fxGroup.add(pillar);
      }
    }

    for (const ct of this.client.combatTexts) {
      const age = (now - ct.createdAt) / 750;
      const sp = this.makeLabelSprite(ct.text, ct.color);
      sp.position.set(ct.x, 1.8 + age * 1.4, ct.y);
      if (ct.isCrit) sp.scale.multiplyScalar(1.38);
      (sp.material as THREE.SpriteMaterial).opacity = 1 - age;
      this.fxGroup.add(sp);
    }
  }
}
