// Procedural English village buildings: cottages, the inn, the schoolhouse, the vicarage, the church.
import * as THREE from 'three';
import { terrainHeight } from './terrain.js';
import { RNG } from '../util/noise.js';

const WALL_T = 0.36;
export const TILE = 2.6; // metres per wall texture tile

// Scale BoxGeometry UVs so textures tile in world units.
export function boxUV(geo, w, h, d, s = TILE) {
  const uv = geo.attributes.uv;
  const scales = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = scales[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * su / s, uv.getY(i) * sv / s);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export function mkBox(w, h, d, mat, s = TILE, shadow = true) {
  const geo = boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, s);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

export function makeMaterials(tex) {
  const std = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, ...extra });
  const M = {
    stone: std(tex.stoneWall),
    stoneDark: std(tex.stoneWallDark),
    timber: std(tex.timber),
    brick: std(tex.brick),
    plaster: std(tex.plasterInt, { roughness: 1 }),
    wood: std(tex.wood),
    woodDark: std(tex.woodDark),
    floor: std(tex.floor, { roughness: 0.8 }),
    thatch: std(tex.thatch, { roughness: 1 }),
    slate: std(tex.slate, { roughness: 0.65 }),
    iron: new THREE.MeshStandardMaterial({ map: tex.iron, roughness: 0.55, metalness: 0.75, color: 0x9a9a9a }),
    winLit: new THREE.MeshStandardMaterial({ map: tex.winLit.map, emissiveMap: tex.winLit.emissiveMap, emissive: 0xffb060, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.1 }),
    winDark: new THREE.MeshStandardMaterial({ map: tex.winDark.map, roughness: 0.25, metalness: 0.3 }),
    winLitSmall: new THREE.MeshStandardMaterial({ map: tex.winLitSmall.map, emissiveMap: tex.winLitSmall.emissiveMap, emissive: 0xffb060, emissiveIntensity: 1.6, roughness: 0.3 }),
    stained: new THREE.MeshStandardMaterial({ map: tex.stained.map, emissiveMap: tex.stained.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4, side: THREE.DoubleSide }),
    door: new THREE.MeshStandardMaterial({ map: tex.door, roughness: 0.85 }),
    doorDark: new THREE.MeshStandardMaterial({ map: tex.doorDark, roughness: 0.85 }),
    paper: new THREE.MeshStandardMaterial({ map: tex.paper, roughness: 1, side: THREE.DoubleSide }),
    ember: new THREE.MeshStandardMaterial({ color: 0x200800, emissive: 0xff5a10, emissiveIntensity: 2.2, roughness: 1 }),
    candle: new THREE.MeshStandardMaterial({ color: 0xf0e6c8, roughness: 0.6 }),
    flame: new THREE.MeshBasicMaterial({ color: 0xffd090 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x5a1c1c, roughness: 1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xa88a40, roughness: 0.4, metalness: 0.8 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x8a7a55, roughness: 1 }),
  };
  return M;
}

// ---------------------------------------------------------------------------
// Door: hinge group + leaf + frame + collider
export class Door {
  constructor(world, parent, M, opts) {
    // opts: x, z (local centre of opening), yaw (local rotation; 0 = opening faces +z), width, height, wallT, locked, label, mat, worldYaw, groupPos, name, inward
    const { x, z, yaw = 0, width = 1.0, height = 2.1, wallT = WALL_T, locked = false, name = 'door', mat = M.door } = opts;
    this.world = world; this.locked = locked; this.name = name; this.open = false; this.angle = 0; this.target = 0;
    this.onToggle = null; this.lockedMsg = opts.lockedMsg || 'Locked.';
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
    parent.add(g);
    this.group = g;
    // frame
    const post = mkBox(0.1, height + 0.08, wallT + 0.06, M.woodDark);
    const pL = post.clone(); pL.position.set(-width / 2 - 0.05, (height + 0.08) / 2, 0); g.add(pL);
    const pR = post.clone(); pR.position.set(width / 2 + 0.05, (height + 0.08) / 2, 0); g.add(pR);
    const lintel = mkBox(width + 0.2, 0.12, wallT + 0.06, M.woodDark); lintel.position.set(0, height + 0.06, 0); g.add(lintel);
    // step
    const step = mkBox(width + 0.4, 0.08, 0.5, M.stone, 1); step.position.set(0, 0.04, wallT / 2 + 0.25); g.add(step);
    // hinge at left post
    const hinge = new THREE.Group(); hinge.position.set(-width / 2, 0, 0); hinge.userData.dynamic = true; g.add(hinge);
    this.hinge = hinge;
    const leafGeo = boxUV(new THREE.BoxGeometry(width - 0.04, height - 0.04, 0.07), width, height, 0.07, 1);
    // door texture on front/back, dark wood on edges
    const leaf = new THREE.Mesh(leafGeo, [M.woodDark, M.woodDark, M.woodDark, M.woodDark, mat, mat]);
    leaf.position.set((width - 0.04) / 2, (height - 0.04) / 2 + 0.02, 0);
    leaf.castShadow = true; leaf.receiveShadow = true;
    hinge.add(leaf);
    this.leaf = leaf;
    // knob
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.iron); knob.position.set(width - 0.16, height * 0.48, 0.06); hinge.add(knob);
    const knob2 = knob.clone(); knob2.position.z = -0.06; hinge.add(knob2);
    leaf.userData.interact = { label: () => this.open ? 'Close door' : (this.locked ? 'Try the door' : 'Open door'), action: { type: 'door', door: this } };
    world.interactables.push(leaf);
    // collider in world space: compute from parent transform
    parent.updateMatrixWorld(true);
    const wp = new THREE.Vector3(); g.getWorldPosition(wp);
    const q = new THREE.Quaternion(); g.getWorldQuaternion(q);
    const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    this.collider = world.colliders.addOBB(wp.x, wp.z, width / 2 + 0.1, wallT / 2 + 0.05, e.y, 'door');
    world.doors.push(this);
    world.dynamic.push(this);
  }
  toggle() {
    if (this.locked) { return false; }
    this.open = !this.open;
    this.target = this.open ? (this.inward === false ? -1.75 : 1.75) : 0;
    this.collider.enabled = !this.open;
    if (this.onToggle) this.onToggle(this.open);
    return true;
  }
  setOpen(v) { if (this.open !== v) this.toggle(); }
  update(dt) {
    const d = this.target - this.angle;
    if (Math.abs(d) > 0.001) {
      this.angle += d * Math.min(1, 4 * dt);
      this.hinge.rotation.y = this.angle;
    }
  }
}

// ---------------------------------------------------------------------------
function gableRoof(g, M, w, d, wallTop, spec) {
  const pitch = spec.roofPitch ?? 0.85;
  const ov = spec.roof === 'thatch' ? 0.55 : 0.4;
  const halfD = d / 2 + ov;
  const rise = halfD * pitch;
  const thick = spec.roof === 'thatch' ? 0.38 : 0.14;
  const mat = spec.roof === 'thatch' ? M.thatch : M.slate;
  const slope = Math.hypot(halfD, rise);
  const ang = Math.atan2(rise, halfD);
  const len = w + 2 * (spec.roof === 'thatch' ? 0.45 : 0.3);
  for (const s of [1, -1]) {
    const slab = mkBox(len, thick, slope + 0.1, mat, spec.roof === 'thatch' ? 2.2 : 2.0);
    slab.position.set(0, wallTop + rise / 2 + thick * 0.4, s * halfD / 2);
    slab.rotation.x = s * ang;
    g.add(slab);
  }
  // ridge
  const ridge = mkBox(len + 0.05, thick * 0.9, thick * 1.6, mat, 1.5);
  ridge.position.set(0, wallTop + rise + thick * 0.3, 0);
  g.add(ridge);
  // gable ends (triangles) with wall material
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(0, rise * (d / 2) / halfD + 0.02); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false });
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / TILE, uv.getY(i) / TILE);
  const wallMat = spec.wallMat;
  for (const s of [1, -1]) {
    const gb = new THREE.Mesh(geo, wallMat); gb.castShadow = true; gb.receiveShadow = true;
    gb.rotation.y = Math.PI / 2;
    gb.position.set(s > 0 ? w / 2 - WALL_T : -w / 2, wallTop, 0);
    g.add(gb);
  }
  return { rise, ov };
}

function windowsFor(spec, w, d, storeys, storeyH, doorX) {
  const wins = [];
  const addRow = (side, length, y, avoid) => {
    const n = Math.max(1, Math.round(length / 2.9));
    for (let i = 0; i < n; i++) {
      const p = (i + 0.5) / n * length - length / 2;
      if (avoid !== null && Math.abs(p - avoid) < 1.15) continue;
      wins.push({ side, p, y });
    }
  };
  for (let s = 0; s < storeys; s++) {
    const y = 1.5 + s * storeyH;
    addRow('front', w, y, s === 0 ? doorX : null);
    addRow('back', w, y, null);
    if (d > 5 && spec.sideWindows !== false) { addRow('left', d, y, null); addRow('right', d, y, null); }
  }
  return wins;
}

// Build a cottage / inn / house. Returns { group, door, interior:{...} }
export function makeBuilding(world, M, spec) {
  const { x, z, yaw = 0, w = 8, d = 6, storeys = 1, storeyH = 2.75, name = 'house' } = spec;
  const wallMat = spec.wall === 'timber' ? M.timber : spec.wall === 'brick' ? M.brick : spec.wall === 'dark' ? M.stoneDark : M.stone;
  spec.wallMat = wallMat;
  const baseY = spec.baseY ?? terrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, baseY, z); g.rotation.y = yaw; g.name = name;
  world.group.add(g);
  const wallTop = storeys * storeyH + 0.3;
  const interior = spec.interior;
  const doorX = spec.doorX ?? 0;
  const doorW = 1.05, doorH = 2.1;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const toWorld = (lx, lz) => [x + lx * cos + lz * sin, z - lx * sin + lz * cos];

  // foundation plinth
  const plinth = mkBox(w + 0.3, 1.4, d + 0.3, M.stoneDark, 1.8); plinth.position.y = -0.55; g.add(plinth);

  // walls: array of {cx, cz, w, d} in local space
  const wallMats = (inner) => {
    // material array per box face: +x -x +y -y +z -z ; inner face gets plaster if interior
    const arr = [wallMat, wallMat, wallMat, wallMat, wallMat, wallMat];
    if (interior && inner !== undefined) arr[inner] = M.plaster;
    return arr;
  };
  const addWall = (cx, cz, ww, dd, innerFace) => {
    const geo = boxUV(new THREE.BoxGeometry(ww, wallTop, dd), ww, wallTop, dd);
    const m = new THREE.Mesh(geo, wallMats(innerFace)); m.castShadow = true; m.receiveShadow = true;
    m.position.set(cx, wallTop / 2, cz); g.add(m);
    const [wx, wz] = toWorld(cx, cz);
    world.colliders.addOBB(wx, wz, ww / 2, dd / 2, -yaw, name);
  };
  // front wall (local +z) with door opening
  const fz = d / 2 - WALL_T / 2;
  if (interior || spec.realDoor) {
    const leftW = (doorX - doorW / 2) - (-w / 2);
    const rightW = (w / 2) - (doorX + doorW / 2);
    addWall(-w / 2 + leftW / 2, fz, leftW, WALL_T, 5);
    addWall(doorX + doorW / 2 + rightW / 2, fz, rightW, WALL_T, 5);
    const overH = wallTop - doorH - 0.1;
    const over = new THREE.Mesh(boxUV(new THREE.BoxGeometry(doorW + 0.02, overH, WALL_T), doorW, overH, WALL_T), wallMats(5));
    over.position.set(doorX, doorH + 0.1 + overH / 2, fz); over.castShadow = true; g.add(over);
  } else {
    addWall(0, fz, w, WALL_T, 5);
  }
  addWall(0, -fz, w, WALL_T, 4);                         // back
  addWall(-w / 2 + WALL_T / 2, 0, WALL_T, d - 2 * WALL_T, 0); // left (-x): inner face is +x
  addWall(w / 2 - WALL_T / 2, 0, WALL_T, d - 2 * WALL_T, 1);  // right (+x): inner face is -x

  // door
  let door = null;
  if (interior || spec.realDoor) {
    door = new Door(world, g, M, { x: doorX, z: fz, yaw: 0, width: doorW, height: doorH, locked: !!spec.locked, name: name + '-door', lockedMsg: spec.lockedMsg, mat: spec.doorMat || M.door });
  } else {
    // decorative closed door
    const frame = mkBox(doorW + 0.2, doorH + 0.1, 0.1, M.woodDark, 1); frame.position.set(doorX, (doorH + 0.1) / 2, d / 2 + 0.02); g.add(frame);
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), spec.doorMat || M.door); leaf.position.set(doorX, doorH / 2, d / 2 + 0.08); g.add(leaf);
    const step = mkBox(doorW + 0.4, 0.08, 0.5, M.stone, 1); step.position.set(doorX, 0.04, d / 2 + 0.25); g.add(step);
    leaf.userData.interact = { label: 'Try the door', action: { type: 'locked', msg: spec.lockedMsg || 'Locked. Nobody answers.' } };
    world.interactables.push(leaf);
  }

  // windows
  const wins = spec.windows || windowsFor(spec, w, d, storeys, storeyH, doorX);
  const winGeo = new THREE.PlaneGeometry(0.95, 1.3);
  const lit = spec.lit !== false;
  for (const win of wins) {
    const wl = win.lit ?? (lit && Math.random() < 0.75);
    const mat = wl ? M.winLit : M.winDark;
    const mesh = new THREE.Mesh(winGeo, mat);
    let px = 0, pz = 0, ry = 0;
    if (win.side === 'front') { px = win.p; pz = d / 2 + 0.02; ry = 0; }
    else if (win.side === 'back') { px = -win.p; pz = -d / 2 - 0.02; ry = Math.PI; }
    else if (win.side === 'left') { px = -w / 2 - 0.02; pz = win.p; ry = -Math.PI / 2; }
    else { px = w / 2 + 0.02; pz = -win.p; ry = Math.PI / 2; }
    mesh.position.set(px, win.y, pz); mesh.rotation.y = ry;
    g.add(mesh);
    // sill
    const sill = mkBox(1.1, 0.08, 0.14, M.stone, 1); sill.position.copy(mesh.position); sill.position.y -= 0.7; sill.rotation.y = ry;
    sill.translateZ(0.04); g.add(sill);
    if (wl) {
      // faint light spill outside the window
      const wp = new THREE.Vector3(px, win.y - 0.6, pz); wp.applyEuler(new THREE.Euler(0, ry, 0)).multiplyScalar(0); // placeholder
      const dir = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, ry, 0));
      const lp = new THREE.Vector3(px, win.y - 0.5, pz).addScaledVector(dir, 0.6);
      const wpos = lp.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(yaw)).add(new THREE.Vector3(x, baseY, z));
      world.addLight(wpos, 0xffa050, 1.6, 6, 0.4);
    }
    if (interior && win.y < storeyH) {
      const inner = new THREE.Mesh(winGeo, wl ? M.winLit : M.winDark);
      inner.position.copy(mesh.position); inner.rotation.y = ry + Math.PI;
      inner.translateZ(WALL_T + 0.04);
      g.add(inner);
    }
  }

  // roof + chimney
  const { rise } = gableRoof(g, M, w, d, wallTop, spec);
  if (spec.chimney !== false) {
    const cxs = spec.chimneys || [w / 2 - 0.9];
    for (const cx of cxs) {
      const ch = mkBox(0.9, rise + 1.3, 0.9, spec.wall === 'brick' ? M.brick : M.stoneDark, 1.2);
      ch.position.set(cx, wallTop + (rise + 1.3) / 2 - 0.3, 0); g.add(ch);
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), M.brick); pot.position.set(cx, wallTop + rise + 1.15, 0); g.add(pot);
      const [wx, wz] = toWorld(cx, 0);
      if (spec.smoke) world.chimneys = (world.chimneys || []).concat([{ x: wx, y: baseY + wallTop + rise + 1.4, z: wz }]);
    }
  }

  // interior
  let int = null;
  if (interior) {
    int = buildInterior(world, g, M, spec, { w, d, storeyH, wallTop, baseY, toWorld, doorX });
  }
  const result = { group: g, door, interior: int, baseY, toWorld, spec };
  world.buildings = world.buildings || [];
  world.buildings.push(result);
  return result;
}

// Convenience for interior props
function prop(parent, mesh, x, y, z, ry = 0) { mesh.position.set(x, y, z); mesh.rotation.y = ry; parent.add(mesh); return mesh; }

export function candle(world, parent, M, lx, ly, lz, groupPos, yaw, intensity = 1.1) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.18, 8), M.candle); c.position.set(lx, ly + 0.09, lz); parent.add(c);
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), M.flame); f.position.set(lx, ly + 0.21, lz); f.scale.y = 1.6; parent.add(f);
  const wp = new THREE.Vector3(lx, ly + 0.3, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(groupPos);
  world.addLight(wp, 0xffc070, intensity * 1.6, 6, 1.0);
  return c;
}

export function fireplace(world, parent, M, lx, lz, ry, groupPos, yaw, lit = true) {
  const fp = new THREE.Group(); fp.position.set(lx, 0, lz); fp.rotation.y = ry; parent.add(fp);
  const surround = mkBox(1.8, 1.5, 0.5, M.stoneDark, 1.2); surround.position.set(0, 0.75, -0.25); fp.add(surround);
  const hollow = mkBox(1.1, 1.0, 0.5, M.black, 1); hollow.position.set(0, 0.5, -0.2); fp.add(hollow);
  const mantel = mkBox(2.0, 0.1, 0.65, M.woodDark, 1); mantel.position.set(0, 1.55, -0.2); fp.add(mantel);
  const hearth = mkBox(1.8, 0.06, 0.6, M.stoneDark, 1); hearth.position.set(0, 0.03, 0.15); fp.add(hearth);
  if (lit) {
    const embers = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M.ember); embers.scale.set(1.3, 0.5, 0.8); embers.position.set(0, 0.15, -0.15); fp.add(embers);
    const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 6), M.woodDark); logs.rotation.z = Math.PI / 2; logs.position.set(0, 0.2, -0.15); fp.add(logs);
    const wp = new THREE.Vector3(0, 0.5, 0.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(lx, 0, lz)).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(groupPos);
    world.addLight(wp, 0xff7a2a, 7, 11, 1.3);
    world.fires = world.fires || [];
    world.fires.push({ pos: wp });
  } else {
    const ash = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), M.black); ash.scale.set(1.3, 0.3, 0.8); ash.position.set(0, 0.1, -0.15); fp.add(ash);
  }
  return fp;
}

export function table(parent, M, x, z, ry, w = 1.4, d = 0.8, h = 0.78) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = ry; parent.add(t);
  const top = mkBox(w, 0.06, d, M.wood, 1); top.position.y = h; t.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = mkBox(0.07, h, 0.07, M.woodDark, 1); leg.position.set(sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08)); t.add(leg); }
  return t;
}

export function chair(parent, M, x, z, ry) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; parent.add(c);
  const seat = mkBox(0.42, 0.05, 0.42, M.wood, 1); seat.position.y = 0.45; c.add(seat);
  const back = mkBox(0.42, 0.5, 0.05, M.wood, 1); back.position.set(0, 0.72, -0.19); c.add(back);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = mkBox(0.04, 0.45, 0.04, M.woodDark, 1); leg.position.set(sx * 0.18, 0.225, sz * 0.18); c.add(leg); }
  return c;
}

function bookMats(M) {
  if (!M._books) M._books = [0x5a2a1a, 0x2a3a5a, 0x3a4a2a, 0x6a5a2a, 0x4a1a2a, 0x2a2a2a, 0x7a6a4a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  return M._books;
}

export function shelf(parent, M, x, z, ry, w = 1.2, h = 2.0) {
  const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; parent.add(s);
  const body = mkBox(w, h, 0.32, M.woodDark, 1); body.position.set(0, h / 2, 0); s.add(body);
  const rng = new RNG(Math.floor(x * 13 + z * 7));
  const cols = bookMats(M);
  for (let r = 0; r < Math.floor(h / 0.4); r++) {
    let bx = -w / 2 + 0.05;
    while (bx < w / 2 - 0.08) {
      const bw = rng.float(0.03, 0.07), bh = rng.float(0.22, 0.32);
      const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.22), rng.pick(cols));
      book.position.set(bx + bw / 2, 0.42 * r + 0.06 + bh / 2, 0.04); s.add(book);
      bx += bw + 0.005;
      if (rng.chance(0.08)) bx += 0.15;
    }
  }
  return s;
}

export function bed(parent, M, x, z, ry) {
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; parent.add(b);
  const frame = mkBox(1.1, 0.35, 2.0, M.woodDark, 1); frame.position.y = 0.3; b.add(frame);
  const mattress = mkBox(1.0, 0.18, 1.9, M.white, 1); mattress.position.y = 0.56; b.add(mattress);
  const blanket = mkBox(1.02, 0.08, 1.2, M.cloth, 1); blanket.position.set(0, 0.68, 0.3); b.add(blanket);
  const head = mkBox(1.1, 0.9, 0.06, M.woodDark, 1); head.position.set(0, 0.6, -1.0); b.add(head);
  return b;
}

export function barrel(parent, M, x, z) {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.85, 10), M.wood); b.position.set(x, 0.43, z); b.castShadow = true; parent.add(b);
  for (const y of [0.25, 0.65]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.015, 6, 14), M.iron); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); parent.add(ring); }
  return b;
}

// A readable paper lying flat (or pinned). Returns the mesh.
export function paperNote(world, parent, M, x, y, z, ry, clueId, label = 'Read', flat = true, size = [0.22, 0.3], mat = null) {
  const geo = new THREE.PlaneGeometry(size[0], size[1]);
  const m = new THREE.Mesh(geo, mat || M.paper);
  m.position.set(x, y, z);
  if (flat) { m.rotation.set(-Math.PI / 2, 0, ry); } else { m.rotation.set(0, ry, 0); }
  parent.add(m);
  m.userData.interact = { label, action: { type: 'clue', id: clueId } };
  world.interactables.push(m);
  return m;
}

function ceilingAndFloor(world, g, M, w, d, storeyH, baseY, toWorld) {
  const floor = mkBox(w - 2 * WALL_T + 0.02, 0.15, d - 2 * WALL_T + 0.02, M.floor, 1.8); floor.position.y = 0.075; floor.castShadow = false; g.add(floor);
  const ceil = mkBox(w - 2 * WALL_T + 0.02, 0.2, d - 2 * WALL_T + 0.02, M.plaster, 2); ceil.position.y = storeyH + 0.1; ceil.castShadow = false; g.add(ceil);
  const n = Math.max(2, Math.round(w / 1.6));
  for (let i = 0; i < n; i++) {
    const beam = mkBox(0.16, 0.22, d - 2 * WALL_T, M.woodDark, 1); beam.position.set(-w / 2 + WALL_T + (i + 0.5) * (w - 2 * WALL_T) / n, storeyH - 0.1, 0); g.add(beam);
  }
  // floor volume in world space (axis-aligned buildings only)
  const c1 = toWorld(-w / 2, -d / 2), c2 = toWorld(w / 2, d / 2);
  world.colliders.addFloor(Math.min(c1[0], c2[0]), Math.min(c1[1], c2[1]), Math.max(c1[0], c2[0]), Math.max(c1[1], c2[1]), baseY + 0.15, 'wood');
}

function buildInterior(world, g, M, spec, ctx) {
  const { w, d, storeyH, baseY, toWorld, doorX } = ctx;
  const gp = g.position, yaw = g.rotation.y;
  ceilingAndFloor(world, g, M, w, d, storeyH, baseY, toWorld);
  const iw = w - 2 * WALL_T, id = d - 2 * WALL_T;
  const int = { items: {} };
  const kind = spec.interior;
  const addCol = (lx, lz, hw, hd) => { const [wx, wz] = toWorld(lx, lz); world.colliders.addOBB(wx, wz, hw, hd, -yaw, 'furniture'); };
  if (kind === 'cottage' || kind === 'maud') {
    const lit = kind !== 'maud';
    fireplace(world, g, M, -iw / 2 + WALL_T / 2 + 0.25, -0.3, Math.PI / 2, gp, yaw, lit); addCol(-iw / 2 + 0.3, -0.3, 0.3, 0.95);
    table(g, M, 0.6, -0.6, 0.1); addCol(0.6, -0.6, 0.7, 0.4);
    chair(g, M, 0.1, -1.3, 0); chair(g, M, 1.2, 0.1, Math.PI);
    bed(g, M, iw / 2 - 0.75, -id / 2 + 1.2, 0); addCol(iw / 2 - 0.75, -id / 2 + 1.2, 0.55, 1.0);
    shelf(g, M, -1.0, -id / 2 + 0.18, 0, 1.4, 1.8); addCol(-1.0, -id / 2 + 0.18, 0.7, 0.17);
    if (lit) candle(world, g, M, 0.5, 0.84, -0.5, gp, yaw);
    if (kind === 'maud') {
      // a cold hearth, a dusty writing desk with the draft letter, the photograph on the mantel
      table(g, M, iw / 2 - 0.8, id / 2 - 1.0, Math.PI / 2, 1.2, 0.6); addCol(iw / 2 - 0.8, id / 2 - 1.0, 0.35, 0.65);
      chair(g, M, iw / 2 - 1.45, id / 2 - 1.0, Math.PI / 2);
      candle(world, g, M, iw / 2 - 0.8, 0.84, id / 2 - 1.45, gp, yaw, 1.4);
      int.items.draft = paperNote(world, g, M, iw / 2 - 0.85, 0.82, id / 2 - 0.9, 0.3, 'maud_draft', 'Read the letter');
      // photograph on the mantel
      const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.28), new THREE.MeshStandardMaterial({ map: world.tex.photo, roughness: 0.8 }));
      photo.position.set(-iw / 2 + WALL_T / 2 + 0.55, 1.75, -0.3); photo.rotation.y = Math.PI / 2; photo.rotation.x = -0.15; g.add(photo);
      const frame = mkBox(0.28, 0.34, 0.02, M.woodDark, 1); frame.position.copy(photo.position); frame.rotation.copy(photo.rotation); frame.translateZ(-0.012); g.add(frame);
      photo.userData.interact = { label: 'Look at the photograph', action: { type: 'clue', id: 'maud_photo' } };
      world.interactables.push(photo);
      int.items.photo = photo;
      // a rocking chair facing the door (as if someone was waiting)
      chair(g, M, -0.4, 0.9, Math.PI);
      // dust sheets: white boxes over furniture
      const sheet = mkBox(1.2, 0.9, 0.9, M.white, 1); sheet.position.set(-1.2, 0.45, id / 2 - 0.9); g.add(sheet); addCol(-1.2, id / 2 - 0.9, 0.6, 0.45);
    }
  } else if (kind === 'pub') {
    // bar along the back wall
    const bar = mkBox(iw * 0.6, 1.1, 0.7, M.woodDark, 1); bar.position.set(-iw * 0.12, 0.55, -id / 2 + 1.4); g.add(bar); addCol(-iw * 0.12, -id / 2 + 1.4, iw * 0.3, 0.35);
    const barTop = mkBox(iw * 0.6 + 0.1, 0.06, 0.8, M.wood, 1); barTop.position.set(-iw * 0.12, 1.13, -id / 2 + 1.4); g.add(barTop);
    const backShelf = shelf(g, M, -iw * 0.12, -id / 2 + 0.18, 0, iw * 0.5, 2.2);
    // bottles on the bar
    const bottleMats = [0x2a5a2a, 0x5a2a1a, 0x3a3a6a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0.1 }));
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.26, 8), bottleMats[i % 3]); b.position.set(-iw * 0.12 - 1.2 + i * 0.35, 1.29, -id / 2 + 1.25); g.add(b); }
    // tankards
    for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.12, 8), M.brass); t.position.set(-iw * 0.12 + 0.6 + i * 0.25, 1.22, -id / 2 + 1.55); g.add(t); }
    fireplace(world, g, M, iw / 2 - WALL_T / 2 - 0.25, 0.2, -Math.PI / 2, gp, yaw, true); addCol(iw / 2 - 0.3, 0.2, 0.3, 0.95);
    // tables with chairs
    const spots = [[-2.2, 1.2], [1.2, 1.4], [-0.6, -0.4]];
    for (const [tx, tz] of spots) { table(g, M, tx, tz, 0.2, 1.1, 0.8); addCol(tx, tz, 0.55, 0.4); chair(g, M, tx - 0.75, tz, Math.PI / 2); chair(g, M, tx + 0.75, tz, -Math.PI / 2); }
    // half-drunk drinks left on a table
    for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.13, 8), M.brass); t.position.set(-2.2 + (i - 1) * 0.3, 0.85, 1.2 + (i % 2) * 0.2); g.add(t); }
    barrel(g, M, -iw / 2 + 0.6, id / 2 - 0.7); barrel(g, M, -iw / 2 + 1.3, id / 2 - 0.6); addCol(-iw / 2 + 0.95, id / 2 - 0.65, 0.7, 0.35);
    candle(world, g, M, 1.2, 0.84, 1.4, gp, yaw); candle(world, g, M, -0.6, 0.84, -0.4, gp, yaw);
    // guest book on the bar
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.3), new THREE.MeshStandardMaterial({ map: world.tex.book, roughness: 0.9 }));
    book.position.set(-iw * 0.12 + 1.5, 1.18, -id / 2 + 1.4); book.rotation.y = -0.2; g.add(book);
    book.userData.interact = { label: 'Read the guest book', action: { type: 'clue', id: 'pub_ledger' } };
    world.interactables.push(book);
    int.items.ledger = book;
    // a chalk board: "CLOSED FOR THE VIGIL"
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.7), new THREE.MeshStandardMaterial({ map: world.tex.pubBoard, roughness: 1 }));
    board.position.set(iw / 2 - WALL_T / 2 - 0.02, 1.9, -1.5); board.rotation.y = -Math.PI / 2; g.add(board);
  } else if (kind === 'school') {
    // rows of desks facing the back wall where the blackboard hangs
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const tx = -iw / 2 + 1.2 + c * (iw - 2.4) / 2, tz = -id / 2 + 2.6 + r * 1.5;
      table(g, M, tx, tz, 0, 0.9, 0.55, 0.7); addCol(tx, tz, 0.45, 0.28);
      chair(g, M, tx, tz + 0.5, Math.PI);
    }
    table(g, M, 0, -id / 2 + 1.2, Math.PI, 1.5, 0.7); addCol(0, -id / 2 + 1.2, 0.75, 0.35);
    chair(g, M, 0, -id / 2 + 0.7, 0);
    candle(world, g, M, 0.4, 0.84, -id / 2 + 1.2, gp, yaw, 1.3);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshStandardMaterial({ map: world.tex.chalkboard, roughness: 1 }));
    board.position.set(0, 1.7, -id / 2 + 0.02); g.add(board);
    board.userData.interact = { label: 'Read the blackboard', action: { type: 'clue', id: 'blackboard' } };
    world.interactables.push(board);
    int.items.board = board;
    // children's drawings pinned on the side wall
    for (let i = 0; i < 4; i++) {
      const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshStandardMaterial({ map: world.tex.drawings[i % world.tex.drawings.length], roughness: 1 }));
      dm.position.set(-iw / 2 + WALL_T / 2 + 0.02, 1.45 + (i % 2) * 0.55, -id / 2 + 1.6 + Math.floor(i / 2) * 0.8 + (i % 2) * 0.1); dm.rotation.y = Math.PI / 2; dm.rotation.z = (i % 2 ? -1 : 1) * 0.04; g.add(dm);
      if (i === 1) { dm.userData.interact = { label: 'Look at the drawings', action: { type: 'clue', id: 'drawings' } }; world.interactables.push(dm); int.items.drawings = dm; }
    }
    fireplace(world, g, M, iw / 2 - WALL_T / 2 - 0.25, 0.5, -Math.PI / 2, gp, yaw, true); addCol(iw / 2 - 0.3, 0.5, 0.3, 0.95);
    // small coats on hooks: dark boxes
    for (let i = 0; i < 5; i++) { const coat = mkBox(0.3, 0.6, 0.12, M.black, 1); coat.position.set(-1.6 + i * 0.5, 1.3, id / 2 - WALL_T / 2 - 0.1); g.add(coat); }
  } else if (kind === 'vicarage') {
    // study: desk with diary, bookshelves, fire
    fireplace(world, g, M, -iw / 2 + WALL_T / 2 + 0.25, 0.4, Math.PI / 2, gp, yaw, true); addCol(-iw / 2 + 0.3, 0.4, 0.3, 0.95);
    const desk = table(g, M, 1.0, -id / 2 + 1.3, Math.PI, 1.6, 0.8); addCol(1.0, -id / 2 + 1.3, 0.8, 0.4);
    chair(g, M, 1.0, -id / 2 + 1.9, Math.PI);
    candle(world, g, M, 0.4, 0.84, -id / 2 + 1.3, gp, yaw, 1.6); candle(world, g, M, 1.6, 0.84, -id / 2 + 1.2, gp, yaw, 1.2);
    int.items.diary = paperNote(world, g, M, 1.0, 0.83, -id / 2 + 1.35, -0.15, 'vicar_diary', 'Read the diary', true, [0.32, 0.42], new THREE.MeshStandardMaterial({ map: world.tex.book, roughness: 0.9 }));
    shelf(g, M, -1.5, -id / 2 + 0.18, 0, 2.0, 2.3); addCol(-1.5, -id / 2 + 0.18, 1.0, 0.17);
    shelf(g, M, iw / 2 - 0.18, -0.5, -Math.PI / 2, 2.4, 2.3); addCol(iw / 2 - 0.18, -0.5, 0.17, 1.2);
    // armchair by the fire
    chair(g, M, -iw / 2 + 1.5, 0.4, Math.PI / 2);
    // crucifix on the wall
    const cv = mkBox(0.05, 0.6, 0.04, M.woodDark, 1); cv.position.set(0, 2.1, -id / 2 + WALL_T / 2 + 0.03); g.add(cv);
    const ch = mkBox(0.36, 0.05, 0.04, M.woodDark, 1); ch.position.set(0, 2.22, -id / 2 + WALL_T / 2 + 0.03); g.add(ch);
    table(g, M, -0.5, id / 2 - 1.2, 0, 1.0, 0.7); addCol(-0.5, id / 2 - 1.2, 0.5, 0.35);
    // a half-packed suitcase
    const cas = mkBox(0.7, 0.25, 0.45, M.woodDark, 1); cas.position.set(-0.5, 0.93, id / 2 - 1.2); g.add(cas);
  }
  return int;
}

// ---------------------------------------------------------------------------
// The church: nave (E-W), west tower, south porch. Axis-aligned at (cx, cz).
export function makeChurch(world, M, cx, cz, baseY) {
  const g = new THREE.Group(); g.position.set(cx, baseY, cz); g.name = 'church';
  world.group.add(g);
  const nl = 22, nw = 9, nh = 6.2;         // nave length (x), width (z), wall height
  const tw = 6.2, th = 17;                  // tower size, height
  const towerX = -nl / 2 - tw / 2 + 0.4;
  const col = (lx, lz, hw, hd, tag = 'church') => world.colliders.addBox(cx + lx - hw, cz + lz - hd, cx + lx + hw, cz + lz + hd, tag);
  const wall = (lx, lz, w, h, d, mat = M.stone) => { const m = mkBox(w, h, d, mat); m.position.set(lx, h / 2, lz); g.add(m); return m; };
  // plinth
  const pl = mkBox(nl + tw + 1, 1.6, nw + 1, M.stoneDark, 1.8); pl.position.set(-tw / 2 + 0.2, -0.6, 0); g.add(pl);
  // nave walls: north (z-), south (z+) with a door opening in the south wall near the west end
  wall(0, -nw / 2 + WALL_T / 2, nl, nh, WALL_T); col(0, -nw / 2 + WALL_T / 2, nl / 2, WALL_T / 2);
  const doorX = -nl / 2 + 4, doorW = 1.4, doorH = 2.6;
  const sz = nw / 2 - WALL_T / 2;
  const leftW = (doorX - doorW / 2) - (-nl / 2), rightW = nl / 2 - (doorX + doorW / 2);
  wall(-nl / 2 + leftW / 2, sz, leftW, nh, WALL_T); col(-nl / 2 + leftW / 2, sz, leftW / 2, WALL_T / 2);
  wall(doorX + doorW / 2 + rightW / 2, sz, rightW, nh, WALL_T); col(doorX + doorW / 2 + rightW / 2, sz, rightW / 2, WALL_T / 2);
  wall(doorX, sz, doorW + 0.02, nh - doorH - 0.2, WALL_T).position.y = doorH + 0.2 + (nh - doorH - 0.2) / 2;
  // east wall
  wall(nl / 2 - WALL_T / 2, 0, WALL_T, nh, nw - 2 * WALL_T); col(nl / 2 - WALL_T / 2, 0, WALL_T / 2, nw / 2);
  // west wall between nave and tower: with an archway opening
  const archW = 2.2, archH = 3.2;
  const wx = -nl / 2 + WALL_T / 2;
  const sideW = (nw - 2 * WALL_T - archW) / 2;
  wall(wx, -nw / 2 + WALL_T + sideW / 2, WALL_T, nh, sideW); col(wx, -nw / 2 + WALL_T + sideW / 2, WALL_T / 2, sideW / 2);
  wall(wx, nw / 2 - WALL_T - sideW / 2, WALL_T, nh, sideW); col(wx, nw / 2 - WALL_T - sideW / 2, WALL_T / 2, sideW / 2);
  wall(wx, 0, WALL_T, nh - archH, archW + 0.02).position.y = archH + (nh - archH) / 2;
  // tower walls (3 sides + the shared west wall above)
  wall(towerX, -tw / 2 + WALL_T / 2, tw, th, WALL_T); col(towerX, -tw / 2 + WALL_T / 2, tw / 2, WALL_T / 2);
  wall(towerX, tw / 2 - WALL_T / 2, tw, th, WALL_T); col(towerX, tw / 2 - WALL_T / 2, tw / 2, WALL_T / 2);
  wall(towerX - tw / 2 + WALL_T / 2, 0, WALL_T, th, tw - 2 * WALL_T); col(towerX - tw / 2 + WALL_T / 2, 0, WALL_T / 2, tw / 2);
  // tower east wall above the nave roofline
  const te = mkBox(tw - 0.4, th - nh, WALL_T, M.stone); te.position.set(towerX + tw / 2 - 0.2, nh + (th - nh) / 2, 0); te.rotation.y = Math.PI / 2; g.add(te);
  // tower top: parapet + pinnacles + belfry openings
  for (const [px, pz, w, d] of [[towerX, -tw / 2 + 0.2, tw, 0.4], [towerX, tw / 2 - 0.2, tw, 0.4], [towerX - tw / 2 + 0.2, 0, 0.4, tw], [towerX + tw / 2 - 0.2, 0, 0.4, tw]]) {
    const p = mkBox(w, 1.0, d, M.stone); p.position.set(px, th + 0.5, pz); g.add(p);
  }
  for (let i = 0; i < 8; i++) { const c = mkBox(0.5, 0.6, 0.5, M.stone, 1); const ang = i / 8 * Math.PI * 2; const r = tw / 2 - 0.25; c.position.set(towerX + Math.sign(Math.cos(ang)) * r * (Math.abs(Math.cos(ang)) > 0.5 ? 1 : 0.35), th + 1.3, Math.sign(Math.sin(ang)) * r * (Math.abs(Math.sin(ang)) > 0.5 ? 1 : 0.35)); g.add(c); }
  for (const s of [-1, 1]) {
    const bo = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), M.black); bo.position.set(towerX, th - 2.5, s * (tw / 2 + 0.02)); if (s < 0) bo.rotation.y = Math.PI; g.add(bo);
    const bo2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), M.black); bo2.position.set(towerX + s * (tw / 2 + 0.02), th - 2.5, 0); bo2.rotation.y = s * Math.PI / 2; g.add(bo2);
  }
  // clock face on the south side of the tower
  const clock = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), new THREE.MeshStandardMaterial({ map: world.tex.clock, roughness: 0.8 }));
  clock.position.set(towerX, th - 6, tw / 2 + 0.03); g.add(clock);
  // tower floor & roof cap (flat)
  const tf = mkBox(tw - 2 * WALL_T, 0.2, tw - 2 * WALL_T, M.stone, 1.5); tf.position.set(towerX, 0.1, 0); g.add(tf);
  const tc = mkBox(tw - 2 * WALL_T, 0.3, tw - 2 * WALL_T, M.woodDark, 1.5); tc.position.set(towerX, 7.5, 0); g.add(tc); // ringing chamber ceiling
  // nave roof (ridge along x)
  const spec = { roof: 'slate', roofPitch: 1.05, wallMat: M.stone };
  gableRoof(g, M, nl, nw, nh, spec);
  // floor: stone flags
  const fl = mkBox(nl - 2 * WALL_T, 0.15, nw - 2 * WALL_T, M.stoneDark, 1.5); fl.position.y = 0.075; g.add(fl);
  world.colliders.addFloor(cx - nl / 2, cz - nw / 2, cx + nl / 2, cz + nw / 2, baseY + 0.15, 'stone');
  world.colliders.addFloor(cx + towerX - tw / 2, cz - tw / 2, cx + towerX + tw / 2, cz + tw / 2, baseY + 0.2, 'stone');
  // porch around the south door
  const porchD = 2.6, porchW = 3.0;
  const pz = nw / 2 + porchD / 2;
  wall(doorX - porchW / 2 + WALL_T / 2, pz, WALL_T, 3.2, porchD); col(doorX - porchW / 2 + WALL_T / 2, pz, WALL_T / 2, porchD / 2);
  wall(doorX + porchW / 2 - WALL_T / 2, pz, WALL_T, 3.2, porchD); col(doorX + porchW / 2 - WALL_T / 2, pz, WALL_T / 2, porchD / 2);
  const pr = new THREE.Group(); pr.position.set(doorX, 0, pz); pr.rotation.y = Math.PI / 2; g.add(pr);
  gableRoof(pr, M, porchD, porchW, 3.2, { roof: 'slate', roofPitch: 0.9, wallMat: M.stone });
  // the great door (in the south wall)
  const door = new Door(world, g, M, { x: doorX, z: sz, yaw: 0, width: doorW, height: doorH, locked: true, name: 'church-door', lockedMsg: 'The great door is locked. Someone has hung a wreath of dry reeds on it.', mat: M.doorDark });
  // stained glass windows: 3 per side + the east window
  const sg = new THREE.PlaneGeometry(1.3, 2.8);
  for (let i = 0; i < 3; i++) {
    const wxp = -nl / 2 + 6 + i * 5.5;
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(sg, M.stained); m.position.set(wxp, 3.3, s * (nw / 2 + 0.03)); if (s < 0) m.rotation.y = Math.PI; g.add(m);
      const inner = new THREE.Mesh(sg, M.stained); inner.position.set(wxp, 3.3, s * (nw / 2 - WALL_T - 0.03)); if (s > 0) inner.rotation.y = Math.PI; g.add(inner);
      world.addLight(new THREE.Vector3(cx + wxp, baseY + 2.2, cz + s * (nw / 2 + 0.8)), 0xffb070, 1.4, 6, 0.6);
    }
  }
  const east = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.2), M.stained); east.position.set(nl / 2 + 0.03, 3.6, 0); east.rotation.y = Math.PI / 2; g.add(east);
  const eastIn = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.2), M.stained); eastIn.position.set(nl / 2 - WALL_T - 0.03, 3.6, 0); eastIn.rotation.y = -Math.PI / 2; g.add(eastIn);
  // interior: pews, altar, lectern, candles, bell rope
  const gp = g.position;
  for (let i = 0; i < 6; i++) {
    const px = -nl / 2 + 7 + i * 2.0;
    for (const s of [-1, 1]) {
      const pew = mkBox(0.5, 0.5, 2.8, M.woodDark, 1); pew.position.set(px, 0.25 + 0.15, s * 2.4); g.add(pew);
      const back = mkBox(0.08, 1.0, 2.8, M.woodDark, 1); back.position.set(px + 0.25, 0.65 + 0.15, s * 2.4); g.add(back);
      col(px + 0.1, s * 2.4, 0.35, 1.4, 'pew');
    }
  }
  // altar
  const altar = mkBox(1.2, 1.0, 2.6, M.stoneDark, 1); altar.position.set(nl / 2 - 1.6, 0.65, 0); g.add(altar); col(nl / 2 - 1.6, 0, 0.6, 1.3);
  const cloth = mkBox(1.25, 0.08, 2.7, M.white, 1); cloth.position.set(nl / 2 - 1.6, 1.17, 0); g.add(cloth);
  const cross = mkBox(0.06, 0.8, 0.06, M.brass, 1); cross.position.set(nl / 2 - 1.6, 1.6, 0); g.add(cross);
  const crossB = mkBox(0.4, 0.06, 0.06, M.brass, 1); crossB.position.set(nl / 2 - 1.6, 1.8, 0); g.add(crossB);
  for (const s of [-1, 1]) candle(world, g, M, nl / 2 - 1.6, 1.21, s * 0.9, gp, 0, 2.6);
  // lectern with the parish register
  const lect = mkBox(0.12, 1.2, 0.12, M.woodDark, 1); lect.position.set(nl / 2 - 4.5, 0.75, -1.6); g.add(lect); col(nl / 2 - 4.5, -1.6, 0.3, 0.3);
  const lectTop = mkBox(0.7, 0.05, 0.5, M.woodDark, 1); lectTop.position.set(nl / 2 - 4.5, 1.36, -1.6); lectTop.rotation.x = 0.35; lectTop.rotation.y = Math.PI / 2; g.add(lectTop);
  const reg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.36), new THREE.MeshStandardMaterial({ map: world.tex.book, roughness: 0.9 }));
  reg.position.set(nl / 2 - 4.5, 1.42, -1.6); reg.rotation.z = 0.35; reg.rotation.y = 0; reg.rotation.order = 'YZX'; reg.rotation.set(0, Math.PI / 2, -0.35, 'YZX'); g.add(reg);
  reg.userData.interact = { label: 'Read the parish register', action: { type: 'clue', id: 'register' } };
  world.interactables.push(reg);
  candle(world, g, M, nl / 2 - 4.5, 1.4, -2.1, gp, 0, 1.4);
  // wall candles along the nave
  for (let i = 0; i < 4; i++) { const px = -nl / 2 + 4 + i * 5; for (const s of [-1, 1]) { const sconce = mkBox(0.12, 0.08, 0.2, M.iron, 1); sconce.position.set(px, 2.0, s * (nw / 2 - WALL_T - 0.1)); g.add(sconce); candle(world, g, M, px, 2.04, s * (nw / 2 - WALL_T - 0.14), gp, 0, 2.2); } }
  // bell rope in the tower with a striped sally
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6.0, 6), M.rope); rope.position.set(towerX, 4.5, 0); rope.userData.keep = true; g.add(rope);
  const sally = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), new THREE.MeshStandardMaterial({ map: world.tex.sally, roughness: 1 })); sally.position.set(towerX, 1.7, 0); g.add(sally);
  sally.userData.interact = { label: 'Ring the bell', action: { type: 'bell' } };
  world.interactables.push(sally);
  world.bellRope = { rope, sally, group: g };
  // a plaque by the rope
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshStandardMaterial({ map: world.tex.plaque, roughness: 0.9 }));
  plaque.position.set(towerX, 1.9, -tw / 2 + WALL_T + 0.02); g.add(plaque);
  plaque.userData.interact = { label: 'Read the plaque', action: { type: 'flavour', text: 'A brass plaque, polished recently: "RING FOR THE VIGIL. RING FOR THE GUEST." Beneath it, scratched into the stone and much older: "WRAY 1726 — RANG IT HIMSELF".' } };
  world.interactables.push(plaque);
  candle(world, g, M, towerX - 1.8, 1.2, -1.8, gp, 0, 2.0);
  candle(world, g, M, towerX + 1.5, 1.2, 1.9, gp, 0, 2.0);
  // outside lamp by the porch
  world.mark('church_door', cx + doorX, baseY, cz + nw / 2 + porchD + 1);
  world.mark('bell', cx + towerX, baseY, cz);
  world.church = { group: g, door, towerX, cx, cz, baseY, nl, nw, th };
  return world.church;
}
