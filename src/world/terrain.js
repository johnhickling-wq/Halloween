// Heightfield terrain with a three-way splat (grass / mud / cobble) blended in the fragment shader.
import * as THREE from 'three';
import { fbm2, noise2, smoothstep, mix } from '../util/noise.js';

export const WORLD_SIZE = 340;
export const WATER_LEVEL = -1.5;

// Key regions (x east, z south; north is -z)
export const CHURCHYARD = { x0: -24, x1: 24, z0: -68, z1: -36, h: 1.6 };
export const MARSH = { x: 22, z: -114, r: 44, depth: 3.4 };
export const ISLAND = { x: 16, z: -120, r: 11, h: 3.0 };

// Paths: polylines with half-width. type 'mud' | 'cobble'. raise = minimum height (causeway)
export const PATHS = [
  { name: 'high-street-south', pts: [[0, 150], [0.5, 120], [-0.5, 95], [0, 70], [0, 40], [0, 18]], w: 3.4, type: 'mud' },
  { name: 'high-street', pts: [[0, 18], [0, 0], [0, -14], [0, -36]], w: 3.2, type: 'cobble' },
  { name: 'church-path', pts: [[0, -36], [-1, -41], [-5, -45.5]], w: 1.5, type: 'cobble' },
  { name: 'church-path-n', pts: [[-5, -45.5], [-8, -47], [-14, -50], [-16, -58], [-8, -64], [0, -68]], w: 1.2, type: 'mud' },
  { name: 'east-lane', pts: [[0, 8], [20, 8], [40, 8], [62, 7], [80, 4]], w: 2.6, type: 'mud' },
  { name: 'west-lane', pts: [[0, 8], [-16, 8], [-34, 8], [-52, 9]], w: 2.6, type: 'mud' },
  { name: 'rook-lane', pts: [[-16, 8], [-30, -2], [-46, -12], [-58, -18], [-70, -24.5]], w: 2.0, type: 'mud' },
  { name: 'vicarage-path', pts: [[0, -30], [-20, -32], [-38, -34.5]], w: 1.4, type: 'mud' },
  { name: 'field-track', pts: [[6, 22], [16, 30], [22, 44]], w: 1.6, type: 'mud' },
  { name: 'causeway', pts: [[0, -68], [1, -80], [5, -92], [10, -104], [14, -112], [16, -118]], w: 1.8, type: 'mud', raise: -1.05 },
];

// Locally flattened footprints for buildings outside the level core
export const FLATS = [
  { x: -70, z: -30, r: 8, h: 0 },
];

// Cobbled square around the green
const SQUARE = { x0: -13, x1: 13, z0: -6, z1: 17, green: { x: 0, z: 4, r: 7 } };

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + dx * t, qz = az + dz * t;
  return Math.hypot(px - qx, pz - qz);
}

export function distToPath(px, pz, path) {
  let d = Infinity;
  const p = path.pts;
  for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(px, pz, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}

// Natural terrain height (without path raising)
function naturalHeight(x, z) {
  const r = Math.hypot(x, z);
  let hills = fbm2(x * 0.0065 + 3.1, z * 0.0065 - 1.7, 4) * 11 + fbm2(x * 0.028 + 7, z * 0.028 + 3, 3) * 1.3;
  const dm = Math.hypot(x - MARSH.x, z - MARSH.z);
  const marshMask = smoothstep(MARSH.r * 0.55, MARSH.r * 1.25, dm);
  const flat = smoothstep(56, 98, r);
  let h = hills * flat * marshMask;
  // marsh basin
  h -= MARSH.depth * (1 - smoothstep(MARSH.r * 0.45, MARSH.r, dm));
  // island with the stones
  const di = Math.hypot(x - ISLAND.x, z - ISLAND.z);
  h += ISLAND.h * (1 - smoothstep(3, ISLAND.r, di));
  // churchyard plateau (rounded rectangle)
  const cx = (CHURCHYARD.x0 + CHURCHYARD.x1) / 2, cz = (CHURCHYARD.z0 + CHURCHYARD.z1) / 2;
  const hx = (CHURCHYARD.x1 - CHURCHYARD.x0) / 2, hz = (CHURCHYARD.z1 - CHURCHYARD.z0) / 2;
  const dxc = Math.max(Math.abs(x - cx) - hx, 0), dzc = Math.max(Math.abs(z - cz) - hz, 0);
  const dc = Math.hypot(dxc, dzc);
  h = mix(h, CHURCHYARD.h, 1 - smoothstep(0, 10, dc));
  // gentle micro-bumps (kept tiny near the core so buildings sit flat)
  h += 0.10 * noise2(x * 0.3, z * 0.3) * (0.4 + 0.6 * flat);
  // world rim
  h += 34 * smoothstep(142, 170, r);
  return h;
}

function rawHeight(x, z) { return naturalHeight(x, z); }
for (const f of FLATS) f.h = rawHeight(f.x, f.z);

function flattened(x, z) {
  let h = naturalHeight(x, z);
  for (const f of FLATS) {
    const d = Math.hypot(x - f.x, z - f.z);
    if (d < f.r + 7) h = mix(f.h, h, smoothstep(f.r, f.r + 7, d));
  }
  return h;
}

export function terrainHeight(x, z) {
  let h = flattened(x, z);
  for (const p of PATHS) {
    if (p.raise === undefined) continue;
    const d = distToPath(x, z, p);
    if (d < p.w + 2.5) {
      const t = 1 - smoothstep(p.w, p.w + 2.5, d);
      h = mix(h, Math.max(h, p.raise), t);
    }
  }
  return h;
}

// splat weights [grass, mud, cobble]
export function splatAt(x, z) {
  let mud = 0, cob = 0;
  for (const p of PATHS) {
    const d = distToPath(x, z, p);
    const wob = noise2(x * 0.15 + 9, z * 0.15) * 0.9;
    const cov = 1 - smoothstep(p.w - 0.6, p.w + 1.2, d + wob);
    if (p.type === 'cobble') cob = Math.max(cob, cov); else mud = Math.max(mud, cov);
  }
  // square
  const inSq = (x > SQUARE.x0 && x < SQUARE.x1 && z > SQUARE.z0 && z < SQUARE.z1);
  if (inSq) {
    const edge = Math.min(x - SQUARE.x0, SQUARE.x1 - x, z - SQUARE.z0, SQUARE.z1 - z);
    let c = smoothstep(0, 1.5, edge);
    const dg = Math.hypot(x - SQUARE.green.x, z - SQUARE.green.z);
    c *= smoothstep(SQUARE.green.r - 0.8, SQUARE.green.r + 0.6, dg);
    cob = Math.max(cob, c);
  }
  // marsh edges are mud
  const h = naturalHeight(x, z);
  if (h < 0.2 && Math.hypot(x - MARSH.x, z - MARSH.z) < MARSH.r * 1.2) mud = Math.max(mud, 1 - smoothstep(-1.2, 0.2, h));
  return [1, mud, cob];
}

export function isCobbled(x, z) { return splatAt(x, z)[2] > 0.5; }
export function isMud(x, z) { return splatAt(x, z)[1] > 0.5; }

export function buildTerrain(tex, segments = 272) {
  const size = WORLD_SIZE;
  const n = segments + 1;
  const pos = new Float32Array(n * n * 3);
  const uv = new Float32Array(n * n * 2);
  const splat = new Float32Array(n * n * 3);
  let k = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i / segments - 0.5) * size;
      const z = (j / segments - 0.5) * size;
      const h = terrainHeight(x, z);
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      uv[k * 2] = x; uv[k * 2 + 1] = z;
      const s = splatAt(x, z);
      splat[k * 3] = s[0]; splat[k * 3 + 1] = s[1]; splat[k * 3 + 2] = s[2];
      k++;
    }
  }
  const idx = new Uint32Array(segments * segments * 6);
  k = 0;
  for (let j = 0; j < segments; j++) for (let i = 0; i < segments; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b;
    idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('splat', new THREE.BufferAttribute(splat, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ map: tex.grass, roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.mudMap = { value: tex.mud };
    shader.uniforms.cobbleMap = { value: tex.cobble };
    shader.uniforms.noiseMap = { value: tex.noise };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 splat; varying vec3 vSplat; varying vec2 vWuv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat; vWuv = position.xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D mudMap; uniform sampler2D cobbleMap; uniform sampler2D noiseMap; varying vec3 vSplat; varying vec2 vWuv;')
      .replace('#include <map_fragment>', `
        vec4 nzL = texture2D(noiseMap, vWuv * 0.013);
        vec4 nzS = texture2D(noiseMap, vWuv * 0.09 + 0.37);
        vec4 gcol = texture2D(map, vWuv * 0.21);
        vec4 gcol2 = texture2D(map, vWuv * 0.047 + 0.5);
        gcol = mix(gcol, gcol2 * 1.1, 0.35);
        vec4 mcol = texture2D(mudMap, vWuv * 0.19);
        vec4 ccol = texture2D(cobbleMap, vWuv * 0.31);
        float mw = smoothstep(0.32, 0.68, vSplat.g + (nzS.g - 0.5) * 0.55);
        float cw = smoothstep(0.35, 0.65, vSplat.b + (nzS.r - 0.5) * 0.35);
        vec4 tcol = mix(gcol, mcol, mw);
        tcol = mix(tcol, ccol, cw);
        tcol.rgb *= 0.72 + 0.56 * nzL.r;
        diffuseColor *= tcol;
      `)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;
        roughnessFactor = mix(roughnessFactor, 0.5, cw);
        roughnessFactor = mix(roughnessFactor, 0.7, mw * 0.6);
      `);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
