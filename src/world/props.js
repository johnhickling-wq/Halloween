// Village furniture: lamps, pumpkins, walls, gravestones, the well, signposts, scarecrows, gates, stones.
import * as THREE from 'three';
import { terrainHeight } from './terrain.js';
import { mkBox, Door } from './buildings.js';
import { RNG } from '../util/noise.js';
import { gravestoneTexture, pumpkinTextures, fingerpostTexture } from '../util/textures.js';
import { hash2 } from '../util/noise.js';

const UP = new THREE.Vector3(0, 1, 0);

export function lampPost(world, M, x, z, lit = true) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); world.group.add(g);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.4, 8), M.iron); post.position.y = 1.7; post.castShadow = true; g.add(post);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), M.iron); base.position.y = 0.25; g.add(base);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), M.iron); arm.position.set(0, 3.35, 0.15); g.add(arm);
  const head = new THREE.Group(); head.position.set(0, 3.55, 0); g.add(head);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: lit ? 0xffb050 : 0x000000, emissiveIntensity: 1.1, transparent: true, opacity: 0.55, roughness: 0.1 });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.45, 0.34), glassMat); head.add(glass);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.25, 4), M.iron); cap.position.y = 0.34; cap.rotation.y = Math.PI / 4; head.add(cap);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), M.iron); finial.position.y = 0.5; head.add(finial);
  for (let i = 0; i < 4; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.03), M.iron); const a = i * Math.PI / 2 + Math.PI / 4; bar.position.set(Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17); head.add(bar); }
  if (lit) {
    const L = world.addLight(new THREE.Vector3(x, y + 3.5, z), 0xffb060, 5.5, 14, 0.5);
    world.lamps = world.lamps || [];
    world.lamps.push({ light: L, mat: glassMat, pos: new THREE.Vector3(x, y + 3.5, z) });
  }
  world.colliders.addCircle(x, z, 0.18, 'lamp');
  return g;
}

const pumpkinGeo = new THREE.SphereGeometry(0.3, 18, 12);
const stemGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.15, 6);
const pumpkinMats = [];
export function jackOLantern(world, M, x, z, yaw = 0, scale = 1, y = null, seed = 0) {
  if (pumpkinMats.length === 0) for (let i = 0; i < 3; i++) { const t = pumpkinTextures(i + 1); pumpkinMats.push(new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissiveMap, emissive: 0xffa040, emissiveIntensity: 2.2, roughness: 0.6 })); }
  const gy = y ?? terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, gy, z); g.rotation.y = yaw; g.scale.setScalar(scale); world.group.add(g);
  const mat = pumpkinMats[seed % pumpkinMats.length];
  const body = new THREE.Mesh(pumpkinGeo, mat); body.scale.set(1, 0.78, 1); body.position.y = 0.24; body.castShadow = true; g.add(body);
  const stem = new THREE.Mesh(stemGeo, M.woodDark); stem.position.y = 0.52; stem.rotation.z = 0.2; g.add(stem);
  const wp = new THREE.Vector3(0, 0.25, 0.25).applyAxisAngle(UP, yaw).multiplyScalar(scale).add(g.position);
  const L = world.addLight(wp, 0xff8a30, 2.2 * scale, 5 * scale, 1.5, 2);
  world.pumpkins = world.pumpkins || [];
  world.pumpkins.push({ light: L, mesh: body });
  return g;
}

// Dry stone wall along a polyline. h = height.
export function stoneWall(world, M, pts, h = 1.1, thick = 0.5, tag = 'wall') {
  const g = new THREE.Group(); world.group.add(g);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0) + thick * 0.6;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const ang = Math.atan2(z1 - z0, x1 - x0);
    const y0 = terrainHeight(x0, z0), y1 = terrainHeight(x1, z1);
    const ymin = Math.min(y0, y1), ymax = Math.max(y0, y1);
    const hh = h + (ymax - ymin) + 0.4;
    const m = mkBox(len, hh, thick, M.stoneDark, 1.6);
    m.position.set(cx, ymin - 0.4 + hh / 2, cz); m.rotation.y = -ang; g.add(m);
    const cap = mkBox(len + 0.02, 0.12, thick + 0.1, M.stone, 1.2);
    cap.position.set(cx, ymin + h + 0.06 - 0.02 + (ymax - ymin), cz); cap.rotation.y = -ang; g.add(cap);
    world.colliders.addSegment(x0, z0, x1, z1, thick / 2, tag);
  }
  return g;
}

export function fenceProcedural(world, M, pts, h = 1.0) {
  const g = new THREE.Group(); world.group.add(g);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 2.2));
    for (let k = 0; k <= n; k++) {
      const t = k / n, px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
      const y = terrainHeight(px, pz);
      const post = mkBox(0.12, h + 0.3, 0.12, M.woodDark, 1); post.position.set(px, y + (h + 0.3) / 2 - 0.3, pz); g.add(post);
    }
    const ang = Math.atan2(z1 - z0, x1 - x0);
    const y0 = terrainHeight(x0, z0), y1 = terrainHeight(x1, z1);
    for (const ry of [0.45, 0.85]) {
      const rail = mkBox(len, 0.08, 0.05, M.wood, 1);
      rail.position.set((x0 + x1) / 2, (y0 + y1) / 2 + ry * h, (z0 + z1) / 2);
      rail.rotation.y = -ang; rail.rotation.z = Math.atan2(y1 - y0, len);
      g.add(rail);
    }
    world.colliders.addSegment(x0, z0, x1, z1, 0.12, 'fence');
  }
  return g;
}

const stoneGeoCache = {};
export function gravestoneProcedural(world, M, x, z, yaw, lines, opts = {}) {
  const y = terrainHeight(x, z);
  const type = opts.type || 'tablet';
  const g = new THREE.Group(); g.position.set(x, y - 0.05, z); g.rotation.y = yaw + (opts.lean ?? 0) * 0; g.rotation.z = opts.lean ?? 0; world.group.add(g);
  const tex = gravestoneTexture(lines, opts.seed ?? (x * 31 + z * 7), !!opts.fresh);
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  const sideMat = opts.fresh ? new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.95 }) : M.stoneDark;
  let body;
  if (type === 'cross') {
    body = new THREE.Group();
    const v = mkBox(0.22, 1.3, 0.16, sideMat, 1); v.position.y = 0.65; body.add(v);
    const hbar = mkBox(0.7, 0.2, 0.16, sideMat, 1); hbar.position.y = 1.0; body.add(hbar);
    const plinth = mkBox(0.6, 0.25, 0.4, sideMat, 1); plinth.position.y = 0.12; body.add(plinth);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), faceMat); plate.position.set(0, 0.13, 0.21); body.add(plate);
    plate.userData.interact = opts.clue ? { label: 'Read the inscription', action: { type: 'clue', id: opts.clue } } : { label: 'Read the inscription', action: { type: 'flavour', text: lines.join(' — ') } };
    world.interactables.push(plate);
  } else {
    const w = opts.w ?? 0.62, h = opts.h ?? 0.95, t = 0.14;
    body = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), [sideMat, sideMat, sideMat, sideMat, faceMat, sideMat]);
    slab.position.y = h / 2; slab.castShadow = true; slab.receiveShadow = true; body.add(slab);
    if (type === 'tablet') {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, t, 16, 1, false, 0, Math.PI), [sideMat, faceMat, sideMat]);
      top.rotation.x = Math.PI / 2; top.rotation.z = 0; top.position.y = h; top.rotation.y = 0;
      // half cylinder facing +z: align axis with z
      top.rotation.set(Math.PI / 2, 0, 0);
      body.add(top);
    }
    slab.userData.interact = opts.clue ? { label: 'Read the inscription', action: { type: 'clue', id: opts.clue } } : { label: 'Read the inscription', action: { type: 'flavour', text: lines.join(' — ') } };
    world.interactables.push(slab);
  }
  g.add(body);
  world.colliders.addCircle(x, z, 0.32, 'grave');
  world.graves = world.graves || [];
  world.graves.push({ x, y, z, group: g });
  return g;
}

export function openGrave(world, M, x, z, yaw) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; world.group.add(g);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.0), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 }));
  hole.rotation.x = -Math.PI / 2; hole.position.set(0, 0.03, 0.4); g.add(hole);
  const rim = mkBox(1.3, 0.12, 2.4, M.stoneDark, 1); rim.material = new THREE.MeshStandardMaterial({ map: world.tex.mud, roughness: 1 }); rim.position.set(0, 0.02, 0.4); g.add(rim);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 6), new THREE.MeshStandardMaterial({ map: world.tex.mud, roughness: 1 })); mound.scale.set(1.0, 0.45, 1.3); mound.position.set(1.4, 0.1, 0.4); g.add(mound);
  const spade = new THREE.Group(); spade.position.set(1.2, 0, -0.5); spade.rotation.z = -0.35; g.add(spade);
  const shaft = mkBox(0.04, 1.3, 0.04, M.woodDark, 1); shaft.position.y = 0.65; spade.add(shaft);
  const blade = mkBox(0.2, 0.3, 0.02, M.iron, 1); blade.position.y = 0.15; spade.add(blade);
  world.colliders.addBox(x - 0.55, z - 0.7, x + 0.55, z + 1.5, 'grave');
  return g;
}

export function well(world, M, x, z) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); world.group.add(g);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.9, 16, 1, true), M.stoneDark); ring.position.y = 0.45; ring.material = M.stoneDark; g.add(ring);
  const ringIn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.9, 16, 1, true), new THREE.MeshStandardMaterial({ map: world.tex.stoneWallDark, roughness: 1, side: THREE.BackSide })); ringIn.position.y = 0.45; g.add(ringIn);
  const cap = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 16), M.stone); cap.rotation.x = -Math.PI / 2; cap.position.y = 0.905; g.add(cap);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.8, 16), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.05, metalness: 0.6 })); water.rotation.x = -Math.PI / 2; water.position.y = -3.0; g.add(water);
  for (const s of [-1, 1]) { const post = mkBox(0.14, 2.2, 0.14, M.woodDark, 1); post.position.set(s * 1.0, 1.1, 0); g.add(post); }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.3, 8), M.woodDark); beam.rotation.z = Math.PI / 2; beam.position.y = 2.0; g.add(beam);
  const handle = mkBox(0.05, 0.4, 0.05, M.iron, 1); handle.position.set(1.15, 2.2, 0); g.add(handle);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 6), M.rope); rope.position.y = 1.4; g.add(rope);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.25, 10, 1, true), M.woodDark); bucket.position.y = 0.85; bucket.material.side = THREE.DoubleSide; g.add(bucket);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.8, 4), M.slate); roof.position.y = 2.6; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  cap.userData.interact = { label: 'Look into the well', action: { type: 'clue', id: 'well' } };
  world.interactables.push(cap);
  world.colliders.addCircle(x, z, 1.15, 'well');
  world.mark('well', x, y, z);
  return g;
}

export function signpost(world, M, x, z, arms) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); world.group.add(g);
  const post = mkBox(0.14, 3.0, 0.14, M.white, 1); post.position.y = 1.5; g.add(post);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.white); finial.position.y = 3.05; g.add(finial);
  arms.forEach((a, i) => {
    const tex = fingerpostTexture(a.text, true);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.05), [M.white, M.white, M.white, M.white, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })]);
    arm.position.set(0, 2.5 - i * 0.36, 0); arm.rotation.y = a.angle;
    arm.translateX(0.75 + 0.07);
    g.add(arm);
  });
  world.colliders.addCircle(x, z, 0.15, 'sign');
  return g;
}

export function scarecrow(world, M, x, z, yaw) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; g.userData.dynamic = true; world.group.add(g);
  const pole = mkBox(0.08, 2.4, 0.08, M.woodDark, 1); pole.position.y = 1.2; g.add(pole);
  const cross = mkBox(1.6, 0.07, 0.07, M.woodDark, 1); cross.position.y = 1.75; g.add(cross);
  const sackMat = new THREE.MeshStandardMaterial({ map: world.tex.sack, roughness: 1 });
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.2, 8), new THREE.MeshStandardMaterial({ map: world.tex.cloth, roughness: 1 })); coat.position.y = 1.3; coat.castShadow = true; g.add(coat);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.75, 6), new THREE.MeshStandardMaterial({ map: world.tex.cloth, roughness: 1 })); arm.rotation.z = Math.PI / 2; arm.position.set(s * 0.6, 1.75, 0); g.add(arm); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), sackMat); head.position.y = 2.15; head.scale.set(0.9, 1.1, 0.9); g.add(head);
  // stitched face: two dark buttons and a stitched mouth
  for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), M.black); eye.position.set(s * 0.08, 2.19, 0.19); g.add(eye); }
  const mouth = mkBox(0.14, 0.02, 0.02, M.black, 1); mouth.position.set(0, 2.06, 0.2); g.add(mouth);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.22, 10), M.black); hat.position.y = 2.42; g.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 12), M.black); brim.position.y = 2.31; g.add(brim);
  // straw at the wrists and neck
  for (const p of [[-0.98, 1.75, 0], [0.98, 1.75, 0], [0, 1.9, 0]]) { const straw = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0xa8905a, roughness: 1 })); straw.position.set(...p); straw.rotation.z = p[0] < 0 ? Math.PI / 2 : p[0] > 0 ? -Math.PI / 2 : 0; g.add(straw); }
  world.colliders.addCircle(x, z, 0.3, 'scarecrow');
  world.scarecrows = world.scarecrows || [];
  world.scarecrows.push({ group: g, baseYaw: yaw, x, z });
  return g;
}

export function hangingLanternProcedural(world, M, x, z, lit = true, tall = 2.2) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); world.group.add(g);
  const pole = mkBox(0.08, tall, 0.08, M.woodDark, 1); pole.position.y = tall / 2; g.add(pole);
  const hook = mkBox(0.35, 0.05, 0.05, M.iron, 1); hook.position.set(0.15, tall - 0.05, 0); g.add(hook);
  const lan = new THREE.Group(); lan.position.set(0.3, tall - 0.4, 0); g.add(lan);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: lit ? 0xffa040 : 0x000000, emissiveIntensity: 2.0, transparent: true, opacity: 0.5, roughness: 0.1 });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.22, 8), glassMat); lan.add(glass);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.1, 8), M.iron); cap.position.y = 0.16; lan.add(cap);
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 8), M.iron); bottom.position.y = -0.12; lan.add(bottom);
  const L = world.addLight(new THREE.Vector3(x + 0.3, y + tall - 0.4, z), 0xffa050, lit ? 3.5 : 0, 9, 1.0);
  L.on = lit;
  world.colliders.addCircle(x, z, 0.1, 'lantern');
  world.pathLanterns = world.pathLanterns || [];
  world.pathLanterns.push({ light: L, mat: glassMat, group: lan });
  return { group: g, light: L, mat: glassMat };
}

export function noticeBoard(world, M, x, z, yaw) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; world.group.add(g);
  for (const s of [-1, 1]) { const post = mkBox(0.12, 2.4, 0.12, M.woodDark, 1); post.position.set(s * 0.9, 1.2, 0); g.add(post); }
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 0.08), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, new THREE.MeshStandardMaterial({ map: world.tex.notice, roughness: 1 }), M.woodDark]);
  board.position.set(0, 1.6, 0); g.add(board);
  const roof = mkBox(2.1, 0.06, 0.5, M.slate, 1); roof.position.set(0, 2.32, 0.05); roof.rotation.x = 0.25; g.add(roof);
  board.userData.interact = { label: 'Read the notice', action: { type: 'clue', id: 'notice' } };
  world.interactables.push(board);
  world.colliders.addOBB(x, z, 1.0, 0.15, -yaw, 'board');
  world.mark('notice', x, y, z);
  return g;
}

export function benchProcedural(world, M, x, z, yaw) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; world.group.add(g);
  const seat = mkBox(1.6, 0.06, 0.4, M.wood, 1); seat.position.y = 0.45; g.add(seat);
  const back = mkBox(1.6, 0.4, 0.05, M.wood, 1); back.position.set(0, 0.75, -0.18); g.add(back);
  for (const s of [-1, 1]) { const leg = mkBox(0.08, 0.45, 0.4, M.iron, 1); leg.position.set(s * 0.7, 0.22, 0); g.add(leg); }
  world.colliders.addOBB(x, z, 0.8, 0.25, -yaw, 'bench');
  return g;
}

export function cart(world, M, x, z, yaw) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; world.group.add(g);
  const bed = mkBox(1.2, 0.35, 2.0, M.woodDark, 1); bed.position.y = 0.75; g.add(bed);
  for (const s of [-1, 1]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 14), M.woodDark); wheel.rotation.z = Math.PI / 2; wheel.position.set(s * 0.68, 0.5, 0.2); g.add(wheel); }
  const shaft = mkBox(0.06, 0.06, 1.6, M.woodDark, 1); shaft.position.set(0.4, 0.6, 1.6); shaft.rotation.x = -0.25; g.add(shaft);
  const shaft2 = shaft.clone(); shaft2.position.x = -0.4; g.add(shaft2);
  // hay / pumpkins in the cart
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd9641c, roughness: 0.7 })); p.scale.y = 0.8; p.position.set((i % 2 - 0.5) * 0.5, 1.05, (Math.floor(i / 2) - 0.5) * 0.7); g.add(p); }
  world.colliders.addOBB(x, z, 0.7, 1.1, -yaw, 'cart');
  return g;
}

export function trough(world, M, x, z, yaw) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; world.group.add(g);
  const body = mkBox(1.8, 0.6, 0.7, M.stoneDark, 1); body.position.y = 0.3; g.add(body);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.05, metalness: 0.5 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.55; g.add(water);
  world.colliders.addOBB(x, z, 0.9, 0.35, -yaw, 'trough');
  return g;
}

export function logPileProcedural(world, M, x, z, yaw) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; world.group.add(g);
  const logGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8);
  const logMat = new THREE.MeshStandardMaterial({ map: world.tex.bark, roughness: 1 });
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5 - r; i++) { const l = new THREE.Mesh(logGeo, logMat); l.rotation.x = Math.PI / 2; l.position.set(-0.5 + i * 0.25 + r * 0.125, 0.12 + r * 0.22, 0); g.add(l); }
  world.colliders.addOBB(x, z, 0.7, 0.5, -yaw, 'logs');
  return g;
}

export function standingStone(world, M, x, z, h, yaw, seed = 1) {
  const y = terrainHeight(x, z);
  const rng = new RNG(seed);
  const geo = new THREE.BoxGeometry(0.9 + rng.float(-0.2, 0.3), h, 0.6 + rng.float(-0.1, 0.2), 2, 3, 2);
  // knock the vertices about for an irregular monolith
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const k = 1 + rng.float(-0.12, 0.12) * (py > 0 ? 0.6 : 1);
    pos.setXYZ(i, px * k * (py > h * 0.3 ? 0.85 : 1), py + rng.float(-0.05, 0.05) * h, pz * k);
  }
  geo.computeVertexNormals();
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.6, uv.getY(i) * h / 2.6);
  const m = new THREE.Mesh(geo, M.stoneDark); m.position.set(x, y + h / 2 - 0.3, z); m.rotation.y = yaw; m.rotation.z = rng.float(-0.06, 0.06); m.castShadow = true; m.receiveShadow = true;
  world.group.add(m);
  world.colliders.addCircle(x, z, 0.55, 'stone');
  return m;
}

export function lychGate(world, M, x, z, yaw = 0) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; world.group.add(g);
  const w = 2.6;
  for (const s of [-1, 1]) for (const t of [-1, 1]) { const post = mkBox(0.22, 2.9, 0.22, M.woodDark, 1); post.position.set(s * w / 2, 1.45, t * 0.9); g.add(post); }
  for (const t of [-1, 1]) { const beam = mkBox(w + 0.4, 0.2, 0.2, M.woodDark, 1); beam.position.set(0, 2.9, t * 0.9); g.add(beam); }
  const spec = { roof: 'slate', roofPitch: 0.8, wallMat: M.woodDark };
  // little roof: two slabs
  for (const s of [1, -1]) { const slab = mkBox(w + 1.0, 0.1, 1.5, M.slate, 1.5); slab.position.set(0, 3.45, s * 0.6); slab.rotation.x = s * 0.75; g.add(slab); }
  const ridge = mkBox(w + 1.0, 0.1, 0.16, M.slate, 1); ridge.position.set(0, 3.95, 0); g.add(ridge);
  // gate (a picket door) across the middle
  const gateGroup = new THREE.Group(); g.add(gateGroup);
  const door = new Door(world, gateGroup, M, { x: 0, z: 0, yaw: 0, width: w - 0.3, height: 1.4, wallT: 0.2, locked: true, name: 'lych-gate', lockedMsg: 'The lych gate is chained. Beyond it, the path drops away into the marsh.', mat: M.woodDark });
  // make the leaf look like a picket gate: add slats over the leaf
  door.leaf.material = new THREE.MeshBasicMaterial({ visible: false });
  door.inward = false;
  const slats = new THREE.Group(); door.hinge.add(slats);
  for (let i = 0; i < 8; i++) { const sl = mkBox(0.1, 1.3, 0.05, M.woodDark, 1); sl.position.set(0.15 + i * (w - 0.6) / 7, 0.72, 0); slats.add(sl); }
  for (const yy of [0.35, 1.1]) { const rail = mkBox(w - 0.3, 0.08, 0.06, M.woodDark, 1); rail.position.set((w - 0.3) / 2, yy, 0.03); slats.add(rail); }
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 12), M.iron); chain.position.set(w - 0.45, 0.75, 0.05); door.hinge.add(chain);
  door.chain = chain;
  world.mark('lychgate', x, y, z);
  world.lychGate = door;
  return door;
}


// ---------------------------------------------------------------------------
// Model-backed props (CC0 packs). Each falls back to the procedural version if the model is missing.
const GRAVE_MODELS = ['gy_gravestone_round', 'gy_gravestone_bevel', 'gy_gravestone_wide', 'gy_gravestone_roof', 'gy_gravestone_decorative', 'kk_gravestone', 'kk_grave_a', 'kk_grave_b', 'kk_gravemarker_a', 'kk_gravemarker_b', 'gy_gravestone_round', 'kk_gravestone', 'gy_gravestone_bevel'];
const CROSS_MODELS = ['gy_gravestone_cross', 'gy_cross_wood', 'gy_gravestone_cross_large', 'gy_gravestone_cross'];

export function gravestone(world, M, x, z, yaw, lines, opts = {}) {
  const lib = world.assets;
  if (!lib || !lib.has('gy_gravestone_round')) return gravestoneProcedural(world, M, x, z, yaw, lines, opts);
  const y = terrainHeight(x, z);
  const rng = new RNG(opts.seed ?? Math.floor(Math.abs(x * 31 + z * 7)));
  let pool = opts.type === 'cross' ? CROSS_MODELS : GRAVE_MODELS;
  if (opts.fresh) pool = ['gy_gravestone_round'];
  let name = opts.model || rng.pick(pool);
  if (!lib.has(name)) name = 'gy_gravestone_round';
  if (!opts.fresh && !opts.clue && rng.chance(0.12) && lib.has('gy_gravestone_broken')) name = 'gy_gravestone_broken';
  const scale = opts.scaleMul ?? rng.float(0.9, 1.12);
  const g = lib.place(world, name, x, z, { yaw, tilt: opts.lean ?? 0, scale });
  const action = opts.clue ? { type: 'clue', id: opts.clue } : { type: 'flavour', text: lines.join(' — ') };
  g.traverse((o) => { if (o.isMesh) { o.userData.interact = { label: 'Read the inscription', action }; world.interactables.push(o); } });
  if (opts.clue || opts.fresh || opts.inscribe) {
    // a carved panel on the face of the stone
    const t = lib.template(name);
    const tex = gravestoneTexture(lines, opts.seed ?? 1, !!opts.fresh);
    const w = t.size.x * scale * 0.72, h = t.size.y * scale * 0.5;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    const off = new THREE.Vector3(0, t.size.y * scale * 0.5, t.max.z * scale + 0.012).applyAxisAngle(UP, yaw);
    plane.position.set(x + off.x, y + off.y, z + off.z);
    plane.rotation.y = yaw;
    plane.userData.interact = { label: 'Read the inscription', action };
    world.interactables.push(plane);
    world.group.add(plane);
  }
  world.graves = world.graves || [];
  world.graves.push({ x, y, z, group: g });
  return g;
}

export function fence(world, M, pts, h = 1.0, model = 'nk_fence_planks') {
  const lib = world.assets;
  if (!lib || !lib.has(model)) return fenceProcedural(world, M, pts, h);
  const t = lib.template(model);
  const segLen = Math.max(0.5, t.size.x);
  const g = new THREE.Group(); world.group.add(g);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / segLen));
    const k = (len / n) / segLen;
    const ang = Math.atan2(dz, dx);
    for (let j = 0; j < n; j++) {
      const tt = (j + 0.5) / n;
      const cx = x0 + dx * tt, cz = z0 + dz * tt;
      const alt = hash2(cx * 0.37, cz * 0.53) < 0.2 && lib.has('nk_fence_simple') ? 'nk_fence_simple' : model;
      lib.place(world, alt, cx, cz, { yaw: -ang, scale: k * (h / 1.0), collider: 'none', parent: g });
    }
    world.colliders.addSegment(x0, z0, x1, z1, 0.12, 'fence');
  }
  return g;
}

export function hangingLantern(world, M, x, z, lit = true, tall = 2.2) {
  const lib = world.assets;
  if (!lib || !lib.has('kk_post_lantern')) {
    const r = hangingLanternProcedural(world, M, x, z, lit, tall);
    r.setLit = (v) => { r.light.on = v; r.light.intensity = v ? 3.5 : 0; r.mat.emissive.setHex(v ? 0xffa040 : 0x000000); };
    return r;
  }
  const yaw = hash2(x * 0.11, z * 0.17) * Math.PI * 2;
  const g = lib.place(world, 'kk_post_lantern', x, z, { yaw, scale: tall / 2.6, lightIntensity: 3.5, lightDistance: 9, lightOff: !lit });
  const light = g.userData.light;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: world.tex.blob, color: 0xffa040, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  glow.scale.setScalar(0.7 * tall / 2.6);
  glow.position.copy(light.pos);
  glow.visible = lit;
  world.group.add(glow);
  world.colliders.addCircle(x, z, 0.12, 'lantern');
  const r = { group: g, light, glow, setLit: (v) => { light.on = v; light.intensity = v ? 3.5 : 0; glow.visible = v; } };
  world.pathLanterns = world.pathLanterns || [];
  world.pathLanterns.push(r);
  return r;
}

export function bench(world, M, x, z, yaw) {
  const lib = world.assets;
  const name = hash2(x, z) < 0.5 ? 'kk_bench' : 'gy_bench';
  if (!lib || !lib.has(name)) return benchProcedural(world, M, x, z, yaw);
  return lib.place(world, name, x, z, { yaw: yaw + Math.PI });
}

export function logPile(world, M, x, z, yaw) {
  const lib = world.assets;
  if (!lib || !lib.has('nk_log_stack_large')) return logPileProcedural(world, M, x, z, yaw);
  return lib.place(world, hash2(x, z) < 0.5 ? 'nk_log_stack_large' : 'nk_log_stack', x, z, { yaw });
}
