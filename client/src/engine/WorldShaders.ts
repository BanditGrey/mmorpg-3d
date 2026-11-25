import * as THREE from 'three';
import { MAP_SIZE, SAFE_SPAWN, type MapId } from '@mmorpg/shared';

export function createSkyDome(): { mesh: THREE.Mesh; uniforms: Record<string, THREE.IUniform> } {
  const uniforms: Record<string, THREE.IUniform> = {
    uTopColor: { value: new THREE.Color(0x0b1628) },
    uMidColor: { value: new THREE.Color(0x17323b) },
    uBottomColor: { value: new THREE.Color(0x1c3d34) },
    uSunDir: { value: new THREE.Vector3(0.5, 0.7, 0.45).normalize() },
    uSunColor: { value: new THREE.Color(0xffd28a) },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uBottomColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      varying vec3 vWorldDir;
      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(uBottomColor, uMidColor, smoothstep(0.0, 0.28, h));
        col = mix(col, uTopColor, smoothstep(0.22, 0.85, h));
        float sunGlow = pow(max(dot(dir, uSunDir), 0.0), 18.0) * 0.45;
        col += uSunColor * sunGlow;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(120, 28, 18), mat);
  return { mesh, uniforms };
}

export function createRuneCircleMesh(): { mesh: THREE.Mesh; uTime: THREE.IUniform<number> } {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  for (const r of [220, 195, 130, 80]) {
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * 80, 256 + Math.sin(a) * 80);
    ctx.lineTo(256 + Math.cos(a) * 220, 256 + Math.sin(a) * 220);
    ctx.stroke();
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(256 + Math.cos(a) * 207, 256 + Math.sin(a) * 207, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  const uTime: THREE.IUniform<number> = { value: 0 };

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: { uTex: { value: tex }, uTime },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTex;
      uniform float uTime;
      varying vec2 vUv;
      vec2 rot(vec2 uv, float a) {
        vec2 p = uv - 0.5;
        float s = sin(a), c = cos(a);
        return vec2(p.x * c - p.y * s, p.x * s + p.y * c) + 0.5;
      }
      void main() {
        vec4 t1 = texture2D(uTex, rot(vUv, uTime * 0.22));
        vec4 t2 = texture2D(uTex, rot(vUv, -uTime * 0.14));
        float pulse = 0.7 + 0.3 * sin(uTime * 2.2);
        vec3 col = (t1.rgb + t2.rgb * 0.6) * pulse;
        float alpha = clamp((t1.a + t2.a * 0.6) * pulse, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(SAFE_SPAWN.x, 0.06, SAFE_SPAWN.y);
  return { mesh, uTime };
}

export function createLavaPoolMesh(): { mesh: THREE.Mesh; uTime: THREE.IUniform<number> } {
  const uTime: THREE.IUniform<number> = { value: 0 };
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 p = vUv * 10.0;
        float n1 = noise(p + vec2(uTime * 0.18, uTime * 0.12));
        float n2 = noise(p * 2.1 - vec2(uTime * 0.14, -uTime * 0.2));
        float t = clamp(n1 * 0.65 + n2 * 0.45, 0.0, 1.0);
        vec3 crust = vec3(0.10, 0.03, 0.03);
        vec3 red = vec3(0.68, 0.10, 0.04);
        vec3 orange = vec3(1.0, 0.45, 0.06);
        vec3 core = vec3(1.0, 0.92, 0.45);
        vec3 col = mix(crust, red, smoothstep(0.25, 0.55, t));
        col = mix(col, orange, smoothstep(0.50, 0.78, t));
        col = mix(col, core, smoothstep(0.76, 0.96, t));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(6.8, 12.2, 48), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(24, -0.06, 14);
  return { mesh, uTime };
}

export function buildTerrainMaps(mapId: MapId): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;

  const b = document.createElement('canvas');
  b.width = S;
  b.height = S;
  const btx = b.getContext('2d')!;

  const baseColors: Record<MapId, string> = {
    vale_eldoria: '#1a3822',
    floresta_sombria: '#162426',
    acampamento_orc: '#4a2e1a',
    ruinas_antigas: '#1b2230',
    deserto_escaravelho: '#6b4f24',
    santuario_golem: '#190d0f',
    pico_gelido: '#2a3c4d',
    abismo_eterno: '#1b0916',
    cidadela_celestial: '#333b52',
    torre_eterna: '#180c2c',
  };
  ctx.fillStyle = baseColors[mapId] ?? '#1a3822';
  ctx.fillRect(0, 0, S, S);
  btx.fillStyle = '#808080';
  btx.fillRect(0, 0, S, S);

  // Organic painterly patches
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    ctx.strokeStyle =
      mapId === 'vale_eldoria'
        ? i % 3 === 0 ? 'rgba(43,92,50,0.28)' : 'rgba(15,38,20,0.28)'
        : mapId === 'floresta_sombria'
        ? i % 3 === 0 ? 'rgba(88,28,135,0.22)' : 'rgba(13,42,38,0.28)'
        : mapId === 'acampamento_orc'
        ? i % 3 === 0 ? 'rgba(122,74,42,0.28)' : 'rgba(38,22,12,0.3)'
        : mapId === 'ruinas_antigas'
        ? i % 3 === 0 ? 'rgba(59,130,246,0.18)' : 'rgba(15,23,42,0.32)'
        : mapId === 'pico_gelido'
        ? i % 3 === 0 ? 'rgba(186,230,253,0.28)' : 'rgba(30,58,88,0.28)'
        : mapId === 'abismo_eterno'
        ? i % 5 === 0 ? 'rgba(244,63,94,0.28)' : 'rgba(18,4,14,0.38)'
        : i % 6 === 0 ? 'rgba(249,115,22,0.28)' : 'rgba(12,5,7,0.36)';
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 18, y - 4 - Math.random() * 10);
    ctx.stroke();

    btx.strokeStyle = i % 2 === 0 ? 'rgba(200,200,200,0.18)' : 'rgba(60,60,60,0.18)';
    btx.lineWidth = 2;
    btx.beginPath();
    btx.moveTo(x, y);
    btx.lineTo(x + (Math.random() - 0.5) * 14, y - 4);
    btx.stroke();
  }

  // Worn dirt paths connecting center to portals/zones
  const px = (wx: number) => (wx / MAP_SIZE) * S;
  const py = (wz: number) => (wz / MAP_SIZE) * S;
  ctx.lineCap = 'round';
  ctx.strokeStyle = mapId === 'vale_eldoria' ? 'rgba(78,58,38,0.68)' : mapId === 'acampamento_orc' ? 'rgba(62,38,22,0.72)' : 'rgba(42,22,20,0.72)';
  ctx.lineWidth = 34;

  const targets =
    mapId === 'vale_eldoria'
      ? [[14, 14], [34, 15], [38, 24]]
      : mapId === 'acampamento_orc'
      ? [[10, 24], [38, 24], [24, 14]]
      : [[24, 38], [24, 14]];

  for (const [tx, tz] of targets) {
    ctx.beginPath();
    ctx.moveTo(px(24), py(24));
    ctx.lineTo(px(tx), py(tz));
    ctx.stroke();
  }

  // Cobblestone center plaza ring
  const cx = px(mapId === 'santuario_golem' ? 24 : SAFE_SPAWN.x);
  const cy = py(mapId === 'santuario_golem' ? 14 : SAFE_SPAWN.y);
  ctx.fillStyle = mapId === 'santuario_golem' ? '#24171a' : '#2e3642';
  ctx.beginPath();
  ctx.arc(cx, cy, 105, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#151921';
  ctx.lineWidth = 3;
  for (const r of [35, 65, 95]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(b);
  return { map, bumpMap };
}

export function createInstancedGrass(mapId: MapId, count: number): THREE.InstancedMesh {
  const geo = new THREE.ConeGeometry(0.08, 0.36, 3);
  geo.translate(0, 0.18, 0);
  const grassColors: Record<MapId, number> = {
    vale_eldoria: 0x2f7d44,
    floresta_sombria: 0x2a4d4b,
    acampamento_orc: 0x7c6230,
    ruinas_antigas: 0x3b4d63,
    deserto_escaravelho: 0xb48a3e,
    santuario_golem: 0x3b2320,
    pico_gelido: 0x93c5fd,
    abismo_eterno: 0x581c45,
    cidadela_celestial: 0xfef08a,
    torre_eterna: 0x9333ea,
  };
  const color = grassColors[mapId] ?? 0x2f7d44;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const inst = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();

  let idx = 0;
  for (let i = 0; i < count * 2 && idx < count; i++) {
    const x = 4 + ((i * 73 + 19) % 40) + Math.sin(i) * 0.4;
    const z = 4 + ((i * 41 + 23) % 40) + Math.cos(i) * 0.4;
    if (Math.hypot(x - 24, z - 24) < 6.5) continue;
    if (mapId === 'santuario_golem' && Math.hypot(x - 24, z - 14) < 12.5) continue;
    dummy.position.set(x, 0, z);
    dummy.rotation.y = (i * 1.7) % (Math.PI * 2);
    dummy.scale.setScalar(0.7 + (i % 5) * 0.22);
    dummy.updateMatrix();
    inst.setMatrixAt(idx++, dummy.matrix);
  }
  inst.count = idx;
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}
