// Trees, yews, reeds, and the marsh water.
import * as THREE from 'three';
import { terrainHeight, PATHS, distToPath, CHURCHYARD, MARSH, WATER_LEVEL } from './terrain.js';
import { RNG, noise2 } from '../util/noise.js';

// Merge non-indexed geometries with position/normal/uv
function mergeGeos(geos) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2);
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

export function makeBareTree(seed, scale = 1) {
  const rng = new RNG(seed);
  const parts = [];
  const up = new THREE.Vector3(0, 1, 0);
  const branch = (pos, dir, len, radius, depth) => {
    const geo = new THREE.CylinderGeometry(radius * (depth >= 3 ? 0.35 : 0.7), radius, len, depth === 0 ? 7 : 5, 1, true).toNonIndexed();
    const uvs = geo.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setY(i, uvs.getY(i) * len / 1.6);
    geo.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    geo.applyQuaternion(q);
    geo.translate(pos.x, pos.y, pos.z);
    parts.push(geo);
    if (depth >= 4 || radius < 0.02) return;
    const end = pos.clone().addScaledVector(dir, len);
    const n = depth === 0 ? 3 : rng.int(2, 3);
    for (let i = 0; i < n; i++) {
      // rotate dir by a random angle around a perpendicular axis
      const perp = new THREE.Vector3(rng.float(-1, 1), rng.float(-0.2, 0.2), rng.float(-1, 1)).normalize();
      const axis = perp.cross(dir).normalize();
      const ang = rng.float(0.35, 0.95) * (depth === 0 ? 1.1 : 1);
      const nd = dir.clone().applyAxisAngle(axis, ang);
      nd.y += 0.25; nd.normalize();
      // twisted: add some rotation around the parent direction
      nd.applyAxisAngle(dir, rng.float(0, Math.PI * 2) * 0.3);
      branch(end, nd, len * rng.float(0.6, 0.78), radius * rng.float(0.55, 0.68), depth + 1);
    }
  };
  const lean = new THREE.Vector3(rng.float(-0.12, 0.12), 1, rng.float(-0.12, 0.12)).normalize();
  branch(new THREE.Vector3(0, -0.3, 0), lean, rng.float(2.4, 3.4) * scale, 0.32 * scale, 0);
  const geo = mergeGeos(parts);
  parts.forEach(p => p.dispose());
  return geo;
}

export function makeYew() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.18, 0.28, 1.6, 7, 1, true).toNonIndexed(); trunk.translate(0, 0.5, 0); parts.push(trunk);
  return { trunk: mergeGeos([trunk]), foliage: (() => {
    const c1 = new THREE.ConeGeometry(1.9, 3.6, 9, 1, true).toNonIndexed(); c1.translate(0, 2.9, 0);
    const c2 = new THREE.ConeGeometry(1.35, 2.8, 8, 1, true).toNonIndexed(); c2.translate(0, 4.6, 0);
    const c3 = new THREE.ConeGeometry(0.8, 2.0, 7, 1, true).toNonIndexed(); c3.translate(0, 6.0, 0);
    return mergeGeos([c1, c2, c3]);
  })() };
}

function blocked(x, z, world) {
  // near a path?
  for (const p of PATHS) if (distToPath(x, z, p) < p.w + 2.5) return true;
  // churchyard rectangle (with margin) except we allow yews placed explicitly
  if (x > CHURCHYARD.x0 - 3 && x < CHURCHYARD.x1 + 3 && z > CHURCHYARD.z0 - 3 && z < CHURCHYARD.z1 + 3) return true;
  // square / green
  if (x > -16 && x < 16 && z > -10 && z < 20) return true;
  // field
  if (x > 26 && x < 66 && z > 24 && z < 62) return true;
  // stones island
  if (Math.hypot(x - 16, z + 120) < 16) return true;
  // buildings
  for (const b of (world.buildings || [])) {
    const gx = b.group.position.x, gz = b.group.position.z;
    const r = Math.max(b.spec.w, b.spec.d) * 0.75 + 3.5;
    if (Math.hypot(x - gx, z - gz) < r) return true;
  }
  // church
  if (x > -18 && x < 16 && z > -60 && z < -42) return true;
  // water
  const h = terrainHeight(x, z);
  if (h < WATER_LEVEL + 0.4) return true;
  return false;
}

export function plantTreesProcedural(world, M) {
  const rng = new RNG(4242);
  const barkMat = new THREE.MeshStandardMaterial({ map: world.tex.bark, roughness: 1 });
  const variants = [makeBareTree(1, 1.0), makeBareTree(2, 1.25), makeBareTree(3, 0.9), makeBareTree(4, 1.4)];
  const positions = [];
  const tries = world.quality === 'low' ? 1400 : 2600;
  for (let i = 0; i < tries; i++) {
    const a = rng.float(0, Math.PI * 2), r = 58 + Math.pow(rng.float(0, 1), 0.7) * 92;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > 150) continue;
    // density from noise so there are clearings and thickets
    const dens = noise2(x * 0.02 + 5, z * 0.02) * 0.5 + 0.5;
    if (rng.float(0, 1) > 0.25 + dens * 0.9 * Math.min(1, (r - 56) / 30)) continue;
    if (blocked(x, z, world)) continue;
    let ok = true;
    for (const p of positions) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < 5.5 * 5.5) { ok = false; break; }
    if (!ok) continue;
    positions.push([x, z]);
  }
  // a few trees inside the village
  for (const [x, z] of [[-30, 26], [28, -14], [-33, -18], [52, -6], [-8, 70], [9, 78], [-14, 86], [30, 3], [-58, 4], [-76, -36], [-62, -36], [-80, -22], [34, -30], [-28, -56], [-30, -70], [30, -74], [40, -60], [26, -40]]) {
    if (!blocked(x, z, world) || Math.hypot(x, z) < 80) positions.push([x, z]);
  }
  world.treePositions = positions;
  // split among variants
  const counts = new Array(variants.length).fill(0);
  const assign = positions.map((p, i) => { const v = (i * 7 + Math.floor(Math.abs(p[0] * 3))) % variants.length; counts[v]++; return v; });
  const dummy = new THREE.Object3D();
  variants.forEach((geo, v) => {
    if (!counts[v]) return;
    const im = new THREE.InstancedMesh(geo, barkMat, counts[v]);
    im.castShadow = true; im.receiveShadow = true;
    let k = 0;
    positions.forEach((p, i) => {
      if (assign[i] !== v) return;
      const y = terrainHeight(p[0], p[1]);
      dummy.position.set(p[0], y, p[1]);
      dummy.rotation.set(0, rng.float(0, Math.PI * 2), 0);
      const s = rng.float(0.85, 1.25);
      dummy.scale.set(s, s * rng.float(0.9, 1.15), s);
      dummy.updateMatrix();
      im.setMatrixAt(k++, dummy.matrix);
      world.colliders.addCircle(p[0], p[1], 0.42 * s, 'tree');
    });
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    world.group.add(im);
  });
  // yews in the churchyard and scattered evergreens
  const yew = makeYew();
  const yewMat = new THREE.MeshStandardMaterial({ color: 0x0e1a0c, roughness: 1 });
  const yewSpots = [[-20, -40], [20, -40], [-21, -50], [22, -58], [-14, -64], [12, -60], [22, -48], [-22, -62], [-66, -40], [-76, -20], [-58, -30]];
  const rngY = new RNG(9);
  // evergreens in the woods
  for (let i = 0; i < 90; i++) {
    const a = rngY.float(0, Math.PI * 2), r = 70 + rngY.float(0, 78);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > 150 || blocked(x, z, world)) continue;
    let ok = true; for (const p of positions) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < 16) { ok = false; break; }
    if (ok) yewSpots.push([x, z]);
  }
  const tIm = new THREE.InstancedMesh(yew.trunk, barkMat, yewSpots.length);
  const fIm = new THREE.InstancedMesh(yew.foliage, yewMat, yewSpots.length);
  fIm.castShadow = true; fIm.receiveShadow = true;
  yewSpots.forEach((p, i) => {
    const y = terrainHeight(p[0], p[1]);
    const s = rngY.float(0.8, 1.3);
    dummy.position.set(p[0], y, p[1]); dummy.rotation.set(0, rngY.float(0, 6.28), 0); dummy.scale.set(s, s * rngY.float(0.9, 1.2), s); dummy.updateMatrix();
    tIm.setMatrixAt(i, dummy.matrix); fIm.setMatrixAt(i, dummy.matrix);
    world.colliders.addCircle(p[0], p[1], 0.5 * s, 'tree');
  });
  tIm.frustumCulled = false; fIm.frustumCulled = false;
  world.group.add(tIm); world.group.add(fIm);
  world.yewPositions = yewSpots;
}

export function plantReeds(world) {
  const rng = new RNG(31337);
  // reed cluster: 3 crossed blades
  const blade = new THREE.PlaneGeometry(0.09, 1.5, 1, 3).toNonIndexed(); blade.translate(0, 0.75, 0);
  const b2 = blade.clone().rotateY(Math.PI / 3), b3 = blade.clone().rotateY(-Math.PI / 3);
  const geo = mergeGeos([blade, b2, b3]);
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a4a2c, roughness: 1, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = { value: 0 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 wp = instanceMatrix * vec4(position, 1.0);
          float sway = sin(uTime * 1.3 + wp.x * 0.5 + wp.z * 0.3) * 0.12 + sin(uTime * 2.7 + wp.z) * 0.05;
          float k = uv.y * uv.y;
          transformed.x += sway * k; transformed.z += sway * 0.4 * k;
        }`);
    mat.userData.shader = sh;
  };
  const spots = [];
  for (let x = MARSH.x - 60; x < MARSH.x + 60; x += 1.1) for (let z = MARSH.z - 60; z < MARSH.z + 60; z += 1.1) {
    const px = x + rng.float(-0.5, 0.5), pz = z + rng.float(-0.5, 0.5);
    const h = terrainHeight(px, pz);
    if (h > WATER_LEVEL - 0.35 && h < WATER_LEVEL + 0.5 && rng.chance(0.55)) {
      if (Math.hypot(px - 16, pz + 120) < 9) continue;
      let onPath = false; for (const p of PATHS) if (p.raise !== undefined && distToPath(px, pz, p) < p.w + 0.5) onPath = true;
      if (!onPath) spots.push([px, pz, h]);
    }
  }
  const im = new THREE.InstancedMesh(geo, mat, spots.length);
  const dummy = new THREE.Object3D();
  spots.forEach((s, i) => { dummy.position.set(s[0], s[2] - 0.1, s[1]); dummy.rotation.set(0, rng.float(0, 6.28), 0); const k = rng.float(0.7, 1.3); dummy.scale.set(k, k, k); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
  im.frustumCulled = false; im.receiveShadow = true;
  world.group.add(im);
  world.dynamic.push({ update: (dt, t) => { if (mat.userData.shader) mat.userData.shader.uniforms.uTime.value = t; } });
  return im;
}

export function makeWater(world, moonDir, fogColor) {
  const geo = new THREE.PlaneGeometry(110, 120, 1, 1);
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uMoonDir: { value: moonDir.clone().normalize() }, uSky: { value: new THREE.Color(0x1a2438) }, uDeep: { value: new THREE.Color(0x03050a) },
  }]);
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: true, transparent: true,
    vertexShader: `
      varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uMoonDir; uniform vec3 uSky; uniform vec3 uDeep;
      varying vec3 vWorld;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
      void main() {
        vec2 p = vWorld.xz;
        float t = uTime * 0.25;
        float h1 = vnoise(p * 0.9 + vec2(t, t * 0.6)), h2 = vnoise(p * 2.3 - vec2(t * 0.7, t * 0.4));
        float e = 0.08;
        float dx = (vnoise((p + vec2(e, 0.0)) * 0.9 + vec2(t, t * 0.6)) - h1) + 0.5 * (vnoise((p + vec2(e, 0.0)) * 2.3 - vec2(t * 0.7, t * 0.4)) - h2);
        float dz = (vnoise((p + vec2(0.0, e)) * 0.9 + vec2(t, t * 0.6)) - h1) + 0.5 * (vnoise((p + vec2(0.0, e)) * 2.3 - vec2(t * 0.7, t * 0.4)) - h2);
        vec3 n = normalize(vec3(-dx * 0.9, 1.0, -dz * 0.9));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        vec3 col = mix(uDeep, uSky, 0.15 + 0.85 * fres);
        vec3 R = reflect(-uMoonDir, n);
        float spec = pow(max(dot(R, V), 0.0), 180.0);
        col += vec3(1.0, 0.95, 0.8) * spec * 0.9;
        col += vec3(0.6, 0.65, 0.7) * pow(max(dot(reflect(-uMoonDir, n), V), 0.0), 12.0) * 0.06;
        gl_FragColor = vec4(col, 0.94);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(MARSH.x, WATER_LEVEL, MARSH.z);
  mesh.renderOrder = 1;
  world.group.add(mesh);
  world.dynamic.push({ update: (dt, t) => { uniforms.uTime.value = t; } });
  return mesh;
}


// ---------------------------------------------------------------------------
// Model-based woods (CC0 packs), instanced per species. Falls back to the procedural trees.
function pickWeighted(rng, table) {
  let total = 0; for (const [, w] of table) total += w;
  let r = rng.float(0, total);
  for (const [name, w] of table) { r -= w; if (r <= 0) return name; }
  return table[table.length - 1][0];
}

export function plantTrees(world, M) {
  const lib = world.assets;
  if (!lib || !lib.has('tree_dead_large')) return plantTreesProcedural(world, M);
  const rng = new RNG(4242);
  const positions = [];
  const tries = world.quality === 'low' ? 1500 : 2800;
  for (let i = 0; i < tries; i++) {
    const a = rng.float(0, Math.PI * 2), r = 58 + Math.pow(rng.float(0, 1), 0.7) * 92;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > 150) continue;
    const dens = noise2(x * 0.02 + 5, z * 0.02) * 0.5 + 0.5;
    if (rng.float(0, 1) > 0.25 + dens * 0.95 * Math.min(1, (r - 56) / 30)) continue;
    if (blocked(x, z, world)) continue;
    let ok = true;
    for (const p of positions) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < 5.2 * 5.2) { ok = false; break; }
    if (!ok) continue;
    positions.push([x, z]);
  }
  const village = [[-30, 26], [28, -14], [-33, -18], [52, -6], [-8, 70], [9, 78], [-14, 86], [30, 3], [-58, 4], [-76, -36], [-62, -36], [-80, -22], [34, -30], [-28, -56], [-30, -70], [30, -74], [40, -60], [26, -40], [-22, 46], [22, 66], [-46, 30], [60, 30]];
  for (const [x, z] of village) positions.push([x, z]);
  world.treePositions = positions;
  const woodsTable = [['tree_dead_large', 24], ['tree_dead_medium', 13], ['tree_dead_small', 5], ['nk_thin_dark', 14], ['nk_tall_dark', 12], ['nk_oak_dark', 4], ['nk_pine_tall_a', 6], ['nk_pine_tall_b', 5], ['nk_pine_tall_c', 5], ['gy_pine_crooked', 7], ['nk_oak_fall', 3], ['nk_default_fall', 2], ['pine_orange_large', 3], ['tree_dead_large_decorated', 2]];
  const villageTable = [['tree_dead_large', 5], ['tree_dead_large_decorated', 2], ['nk_oak_dark', 3], ['nk_oak_fall', 3], ['tree_dead_medium', 2]];
  const groups = new Map();
  const add = (name, tr) => { if (!lib.has(name)) name = 'tree_dead_large'; let arr = groups.get(name); if (!arr) { arr = []; groups.set(name, arr); } arr.push(tr); };
  positions.forEach((p, i) => {
    const r = Math.hypot(p[0], p[1]);
    const name = pickWeighted(rng, r < 60 ? villageTable : woodsTable);
    add(name, { x: p[0], z: p[1], yaw: rng.float(0, Math.PI * 2), scale: rng.float(0.85, 1.25) });
  });
  // churchyard yews and scattered evergreens
  const yewSpots = [[-20, -40], [20, -40], [-21, -50], [22, -58], [-14, -64], [12, -60], [22, -48], [-22, -62], [-66, -40], [-76, -20], [-58, -30]];
  const rngY = new RNG(9);
  for (const [x, z] of yewSpots) add(rngY.chance(0.5) ? 'gy_pine' : 'nk_pine_default_a', { x, z, yaw: rngY.float(0, 6.28), scale: rngY.float(0.8, 1.15) });
  for (let i = 0; i < 90; i++) {
    const a = rngY.float(0, Math.PI * 2), r = 70 + rngY.float(0, 78);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > 150 || blocked(x, z, world)) continue;
    let ok = true; for (const p of positions) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < 16) { ok = false; break; }
    if (!ok) continue;
    positions.push([x, z]);
    add(pickWeighted(rngY, [['nk_pine_tall_a', 3], ['nk_pine_tall_b', 3], ['gy_pine', 2], ['nk_pine_round_a', 2]]), { x, z, yaw: rngY.float(0, 6.28), scale: rngY.float(0.85, 1.2) });
  }
  world.yewPositions = yewSpots;
  for (const [name, transforms] of groups) lib.instanced(world, name, transforms, true);
}

// Rocks, stumps, logs, bushes, mushrooms and the odd bone: instanced clutter for the woods and marsh edges.
export function dressWoods(world) {
  const lib = world.assets;
  if (!lib || !lib.has('nk_rock_large_a')) return;
  const rng = new RNG(777);
  const trees = world.treePositions || [];
  const nearTree = (x, z, d) => { for (const p of trees) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < d * d) return true; return false; };
  const clearOfTrees = (x, z, d) => !nearTree(x, z, d);
  const spots = (count, rMin, rMax, minTreeDist, extra) => {
    const out = [];
    for (let i = 0; i < count * 6 && out.length < count; i++) {
      const a = rng.float(0, Math.PI * 2), r = rMin + rng.float(0, rMax - rMin);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x, z) > 148 || blocked(x, z, world) || !clearOfTrees(x, z, minTreeDist)) continue;
      if (extra && !extra(x, z)) continue;
      out.push({ x, z, yaw: rng.float(0, 6.28), scale: rng.float(0.8, 1.3) });
    }
    return out;
  };
  const put = (name, list) => { if (list.length && lib.has(name)) lib.instanced(world, name, list, true); };
  put('nk_rock_large_a', spots(18, 60, 145, 1.8));
  put('nk_rock_large_b', spots(16, 60, 145, 1.8));
  put('nk_rock_large_c', spots(14, 60, 145, 1.8));
  put('gy_rocks', spots(14, 62, 140, 1.8));
  put('nk_rock_small_a', spots(45, 40, 145, 0.8));
  put('nk_rock_small_b', spots(45, 40, 145, 0.8));
  put('nk_stump_old', spots(22, 62, 145, 2.2));
  put('nk_stump_old_tall', spots(12, 62, 145, 2.2));
  put('nk_log', spots(22, 62, 145, 1.5));
  put('gy_trunk_long', spots(10, 62, 145, 1.8));
  put('nk_bush', spots(70, 58, 145, 1.4));
  put('nk_bush_large', spots(40, 58, 145, 1.6));
  put('nk_bush_detailed', spots(40, 58, 145, 1.4));
  // mushrooms cluster at the feet of trees
  const shrooms = [];
  for (let i = 0; i < 60 && trees.length; i++) { const p = rng.pick(trees); const a = rng.float(0, 6.28); const x = p[0] + Math.cos(a) * rng.float(1.0, 1.8), z = p[1] + Math.sin(a) * rng.float(1.0, 1.8); if (terrainHeight(x, z) > WATER_LEVEL + 0.3) shrooms.push({ x, z, yaw: a, scale: rng.float(0.8, 1.4) }); }
  put('nk_mushroom_red_group', shrooms.slice(0, 30));
  put('nk_mushroom_tan_group', shrooms.slice(30));
  // the marsh keeps what it is given
  const bones = [];
  for (let i = 0; i < 14; i++) { const a = rng.float(0, 6.28), r = rng.float(9, 15); const x = 16 + Math.cos(a) * r, z = -120 + Math.sin(a) * r; if (terrainHeight(x, z) > WATER_LEVEL - 0.05) bones.push({ x, z, yaw: a, scale: rng.float(0.9, 1.3) }); }
  put('kk_bone_a', bones.slice(0, 7));
  put('kk_skull', bones.slice(7, 12));
  put('kk_ribcage', bones.slice(12));
}
