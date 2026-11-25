import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface CatalogEntry {
  id: string;
  name: string;
  category: 'Heróis' | 'Mascote' | 'Montarias' | 'Chefes' | 'Monstros';
}

const CATALOG: CatalogEntry[] = [
  { id: 'warrior', name: 'Guerreiro', category: 'Heróis' },
  { id: 'mage', name: 'Mago', category: 'Heróis' },
  { id: 'archer', name: 'Arqueiro', category: 'Heróis' },
  { id: 'assassin', name: 'Assassino', category: 'Heróis' },
  { id: 'paladin', name: 'Paladino', category: 'Heróis' },

  { id: 'pet_fairy', name: 'Fada Dourada Auto-Loot', category: 'Mascote' },

  { id: 'mount_horse', name: 'Cavalo de Guerra', category: 'Montarias' },
  { id: 'mount_wolf', name: 'Lobo das Sombras', category: 'Montarias' },
  { id: 'mount_lava', name: 'Corcel Vulcânico', category: 'Montarias' },
  { id: 'mount_griffin', name: 'Grifo Celestial', category: 'Montarias' },
  { id: 'mount_dragon', name: 'Dragão do Abismo', category: 'Montarias' },

  { id: 'ancient_lich', name: 'Lich Soberano (Lv.40)', category: 'Chefes' },
  { id: 'sand_golem', name: 'Colosso de Areia (Lv.42)', category: 'Chefes' },
  { id: 'boss_golem', name: 'Golem Ancestral (Lv.52)', category: 'Chefes' },
  { id: 'ice_dragon', name: 'Drakkar de Gelo (Lv.74)', category: 'Chefes' },
  { id: 'abyss_lord', name: 'Senhor do Abismo (Lv.100)', category: 'Chefes' },
  { id: 'celestial_warden', name: 'Guardião Astral (Lv.125)', category: 'Chefes' },
  { id: 'eternal_emperor', name: 'Imperador Eterno (Lv.180)', category: 'Chefes' },

  { id: 'slime', name: 'Slime Esmeralda', category: 'Monstros' },
  { id: 'wolf', name: 'Lobo Cinzento', category: 'Monstros' },
  { id: 'bandit', name: 'Bandido do Vale', category: 'Monstros' },
  { id: 'spider', name: 'Aranha Sombria', category: 'Monstros' },
  { id: 'treant', name: 'Ente Corrompido', category: 'Monstros' },
  { id: 'wraith', name: 'Espectro da Névoa', category: 'Monstros' },
  { id: 'orc', name: 'Orc Saqueador', category: 'Monstros' },
  { id: 'orc_shaman', name: 'Xamã de Krag', category: 'Monstros' },
  { id: 'skeleton_knight', name: 'Guardião da Cripta', category: 'Monstros' },
  { id: 'scarab', name: 'Escaravelho Dourado', category: 'Monstros' },
  { id: 'magma_elem', name: 'Elemental de Magma', category: 'Monstros' },
  { id: 'frost_yeti', name: 'Yeti Glacial', category: 'Monstros' },
  { id: 'abyss_fiend', name: 'Demônio Abissal', category: 'Monstros' },
  { id: 'seraph_fallen', name: 'Serafim Caído', category: 'Monstros' },
  { id: 'void_stalker', name: 'Caçador do Vazio', category: 'Monstros' },
];

type ReviewStatus = 'pending' | 'approved' | 'rejected';
interface ReviewRecord {
  status: ReviewStatus;
  note: string;
}

const STORAGE_KEY = 'eldoria_glb_reviews_v1';
const reviews: Record<string, ReviewRecord> = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
function saveReviews() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

const canvas = document.getElementById('viewer-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b101b);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

scene.add(new THREE.HemisphereLight(0xb4d4ff, 0x1e242c, 1.2));
const key = new THREE.DirectionalLight(0xfff1d6, 2.0);
key.position.set(4, 6, 5);
scene.add(key);

const grid = new THREE.GridHelper(6, 12, 0x475569, 0x1e293b);
scene.add(grid);

const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 60);
camera.position.set(2.2, 1.8, 3.2);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0.9, 0);

function resize() {
  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 600;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const loader = new GLTFLoader();
let currentModel: THREE.Object3D | null = null;
let mixer: THREE.AnimationMixer | null = null;
let currentId = CATALOG[0].id;
let activeFilter: 'all' | ReviewStatus = 'all';
let wireframeOn = false;

function applyWireframe(obj: THREE.Object3D, wf: boolean) {
  obj.traverse((ch) => {
    if ((ch as THREE.Mesh).isMesh) {
      const mat = (ch as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((m) => ((m as THREE.MeshStandardMaterial).wireframe = wf));
      else if (mat) (mat as THREE.MeshStandardMaterial).wireframe = wf;
    }
  });
}

function loadModel(id: string) {
  currentId = id;
  const entry = CATALOG.find((c) => c.id === id)!;
  const rev = reviews[id] ?? { status: 'pending', note: '' };
  (document.getElementById('note-input') as HTMLInputElement).value = rev.note;
  document.getElementById('model-info')!.textContent = `Carregando ${entry.name} (${id}.glb)...`;
  renderSidebar();

  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }
  mixer = null;
  const animBar = document.getElementById('anim-clips')!;
  animBar.innerHTML = '';

  loader.load(`/models/${id}.glb`, (gltf) => {
    if (currentId !== id) return;
    currentModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(currentModel);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    controls.target.set(0, Math.max(0.4, center.y), 0);
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    camera.position.set(maxDim * 1.4, center.y + maxDim * 0.55, maxDim * 1.9);

    applyWireframe(currentModel, wireframeOn);
    scene.add(currentModel);

    let tris = 0;
    let meshes = 0;
    currentModel.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        meshes++;
        const geo = (ch as THREE.Mesh).geometry;
        tris += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
      }
    });
    document.getElementById('model-info')!.textContent =
      `${entry.name} (${id}.glb) • ${meshes} malhas • ${Math.round(tris)} tris • ${gltf.animations.length} animações`;

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(currentModel);
      const actions = ['Idle', 'Walk', 'Attack'];
      const hasSuffixes = gltf.animations.some((c) => actions.some((a) => c.name.endsWith('_' + a) || c.name === a));
      if (hasSuffixes) {
        const available = actions.filter((a) => gltf.animations.some((c) => c.name.endsWith('_' + a) || c.name === a));
        available.forEach((act, idx) => {
          const btn = document.createElement('button');
          btn.className = `act ${idx === 0 ? 'active' : ''}`;
          btn.textContent = act;
          const playAct = () => {
            mixer!.stopAllAction();
            gltf.animations
              .filter((c) => c.name.endsWith('_' + act) || c.name === act)
              .forEach((c) => mixer!.clipAction(c).play());
            animBar.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
          };
          btn.onclick = playAct;
          animBar.appendChild(btn);
          if (idx === 0) playAct();
        });
      } else {
        gltf.animations.forEach((clip, idx) => {
          const btn = document.createElement('button');
          btn.className = `act ${idx === 0 ? 'active' : ''}`;
          btn.textContent = clip.name || `Clip ${idx + 1}`;
          btn.onclick = () => {
            mixer!.stopAllAction();
            mixer!.clipAction(clip).play();
            animBar.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
          };
          animBar.appendChild(btn);
          if (idx === 0) mixer!.clipAction(clip).play();
        });
      }
    } else {
      animBar.innerHTML = '<span style="font-size:11px;color:#94a3b8">Sem clipes de animação</span>';
    }
  });
}

function renderSidebar() {
  const counts = { approved: 0, rejected: 0, pending: 0 };
  for (const c of CATALOG) counts[(reviews[c.id]?.status ?? 'pending') as ReviewStatus]++;
  document.getElementById('summary-counts')!.innerHTML =
    `<span style="color:#4ade80">✔ ${counts.approved}</span> <span style="color:#f87171">✖ ${counts.rejected}</span> <span>⏳ ${counts.pending}</span>`;

  const list = document.getElementById('model-list')!;
  list.innerHTML = '';
  const cats: CatalogEntry['category'][] = ['Heróis', 'Mascote', 'Montarias', 'Chefes', 'Monstros'];
  for (const cat of cats) {
    const items = CATALOG.filter((c) => {
      const st = reviews[c.id]?.status ?? 'pending';
      return c.category === cat && (activeFilter === 'all' || st === activeFilter);
    });
    if (items.length === 0) continue;
    const h = document.createElement('div');
    h.className = 'cat-label';
    h.textContent = `${cat} (${items.length})`;
    list.appendChild(h);
    for (const it of items) {
      const st = reviews[it.id]?.status ?? 'pending';
      const btn = document.createElement('button');
      btn.className = `m-item ${it.id === currentId ? 'active' : ''}`;
      btn.innerHTML = `<span>${it.name}</span><span class="badge ${st}">${st === 'approved' ? 'OK' : st === 'rejected' ? 'NO' : '...'}</span>`;
      btn.onclick = () => loadModel(it.id);
      list.appendChild(btn);
    }
  }
}

document.querySelectorAll('.f-btn').forEach((b) => {
  b.addEventListener('click', () => {
    activeFilter = (b as HTMLElement).dataset.f as any;
    document.querySelectorAll('.f-btn').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    renderSidebar();
  });
});

document.getElementById('btn-wire')!.onclick = () => {
  wireframeOn = !wireframeOn;
  document.getElementById('btn-wire')!.textContent = `Wireframe: ${wireframeOn ? 'ON' : 'OFF'}`;
  if (currentModel) applyWireframe(currentModel, wireframeOn);
};

function setStatus(status: ReviewStatus) {
  const note = (document.getElementById('note-input') as HTMLInputElement).value.trim();
  reviews[currentId] = { status, note };
  saveReviews();
  const idx = CATALOG.findIndex((c) => c.id === currentId);
  const next = CATALOG[idx + 1];
  renderSidebar();
  if (next) loadModel(next.id);
}

document.getElementById('btn-approve')!.onclick = () => setStatus('approved');
document.getElementById('btn-reject')!.onclick = () => setStatus('rejected');

document.getElementById('btn-export')!.onclick = () => {
  const lines = CATALOG.map((c) => {
    const r = reviews[c.id] ?? { status: 'pending', note: '' };
    return `- [${r.status.toUpperCase()}] ${c.id} (${c.name})${r.note ? `: ${r.note}` : ''}`;
  }).join('\n');
  navigator.clipboard?.writeText(lines);
  const blob = new Blob([lines], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'eldoria_aprovacao_3d.md';
  a.click();
};

let lastT = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  mixer?.update(dt);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
renderSidebar();
loadModel(CATALOG[0].id);
loop();
