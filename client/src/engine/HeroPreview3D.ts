import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { HeroClass } from '@mmorpg/shared';

export class HeroPreview3D {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private rafId = 0;
  private lastT = performance.now();
  private currentClass: HeroClass | null = null;
  private mode: 'full' | 'portrait' = 'full';
  private helmMesh: THREE.Group | null = null;
  private auraRing: THREE.Mesh | null = null;
  private loader = new GLTFLoader();

  public attach(canvas: HTMLCanvasElement, heroClass: HeroClass, mode: 'full' | 'portrait' = 'full') {
    if (this.renderer && this.renderer.domElement === canvas && this.currentClass === heroClass && this.mode === mode) {
      return;
    }
    this.dispose();
    this.currentClass = heroClass;
    this.mode = mode;

    const w = canvas.clientWidth || (mode === 'portrait' ? 54 : 180);
    const h = canvas.clientHeight || (mode === 'portrait' ? 54 : 240);
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.scene.clear();
    const hemi = new THREE.HemisphereLight(0xfef3c7, 0x1e293b, 1.2);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff1d6, 1.9);
    key.position.set(2.5, 4, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x60a5fa, 0.9);
    rim.position.set(-2.5, 2.5, -2.5);
    this.scene.add(rim);

    // Pedestal / Aura ring
    const ring = new THREE.Mesh(
      mode === 'portrait' ? new THREE.RingGeometry(0.28, 0.34, 32) : new THREE.RingGeometry(0.42, 0.56, 32),
      new THREE.MeshBasicMaterial({ color: 0xc89b3c, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    if (mode === 'portrait') {
      ring.position.set(0, 1.42, -0.25);
    } else {
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
    }
    this.auraRing = ring;
    this.scene.add(ring);

    this.camera.aspect = w / h;
    if (mode === 'portrait') {
      this.camera.position.set(0.18, 1.48, 0.92);
      this.camera.lookAt(0, 1.42, 0);
    } else {
      this.camera.position.set(0, 1.25, 3.35);
      this.camera.lookAt(0, 0.88, 0);
    }
    this.camera.updateProjectionMatrix();

    this.loader.load(`/models/${heroClass}.glb`, (gltf) => {
      if (!this.renderer) return;
      this.model = gltf.scene;
      this.model.scale.setScalar(1.0);
      this.scene.add(this.model);
      if (this.helmMesh) {
        this.helmMesh.position.set(0, 1.56, 0.02);
        this.model.add(this.helmMesh);
      }
      if (gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        const idle = gltf.animations.find((a) => a.name.toLowerCase().includes('idle')) ?? gltf.animations[0];
        this.mixer.clipAction(idle).play();
      }
    });

    this.lastT = performance.now();
    const tick = () => {
      if (!this.renderer) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastT) / 1000);
      this.lastT = now;
      if (this.model) {
        if (this.mode === 'portrait') {
          this.model.rotation.y = Math.sin(now * 0.0014) * 0.22;
        } else {
          this.model.rotation.y += dt * 0.65;
        }
      }
      this.mixer?.update(dt);
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public setPortraitVisuals(helmColorHex: number | null, auraHex: number) {
    if (this.auraRing) {
      (this.auraRing.material as THREE.MeshBasicMaterial).color.setHex(auraHex);
    }
    if (this.helmMesh) {
      this.helmMesh.parent?.remove(this.helmMesh);
      this.helmMesh = null;
    }
    if (helmColorHex !== null) {
      const grp = new THREE.Group();
      const crown = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.032, 8, 20),
        new THREE.MeshStandardMaterial({ color: helmColorHex, metalness: 0.75, roughness: 0.25, emissive: helmColorHex, emissiveIntensity: 0.25 })
      );
      crown.rotation.x = Math.PI / 2 - 0.15;
      const crest = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.14, 6),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 })
      );
      crest.position.set(0, 0.08, 0.13);
      crest.rotation.x = 0.25;
      grp.add(crown, crest);
      grp.position.set(0, 1.56, 0.02);
      this.helmMesh = grp;
      this.model?.add(grp);
    }
  }

  public dispose() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.mixer = null;
    this.model = null;
    this.currentClass = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
