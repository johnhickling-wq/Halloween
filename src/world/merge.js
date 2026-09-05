// Merges static meshes by material into spatial chunks to cut draw calls.
import * as THREE from 'three';

const CELL = 64;

function sliceAttr(attr, start, count, itemSize, fill = 0) {
  if (!attr) { return new Float32Array(count * itemSize).fill(fill); }
  return Float32Array.from(attr.array.subarray(start * itemSize, (start + count) * itemSize));
}

export function mergeStatic(world) {
  const root = world.group;
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const remove = [];
  const nm = new THREE.Matrix3();
  const v = new THREE.Vector3();
  const walk = (o) => {
    if (o.userData.dynamic || o.userData.keep) return;
    if (o.isInstancedMesh || o.isSprite || o.isPoints || o.isLight) return;
    if (o.isMesh) {
      if (o.userData.interact || o.children.length) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.some(m => !(m.isMeshStandardMaterial || m.isMeshBasicMaterial))) return;
      const src = o.geometry;
      if (!src.attributes.position || src.attributes.position.count > 40000) return;
      const geo = src.index ? src.toNonIndexed() : src;
      const total = geo.attributes.position.count;
      const groups = geo.groups.length ? geo.groups : [{ start: 0, count: total, materialIndex: 0 }];
      nm.getNormalMatrix(o.matrixWorld);
      o.getWorldPosition(v);
      const cell = `${Math.floor(v.x / CELL)}|${Math.floor(v.z / CELL)}`;
      for (const gr of groups) {
        const count = Math.min(gr.count, total - gr.start);
        if (count <= 0) continue;
        const mat = mats[gr.materialIndex] ?? mats[0];
        if (!mat) continue;
        const pos = sliceAttr(geo.attributes.position, gr.start, count, 3);
        const nor = sliceAttr(geo.attributes.normal, gr.start, count, 3);
        const uv = sliceAttr(geo.attributes.uv, gr.start, count, 2);
        for (let i = 0; i < count; i++) {
          v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(o.matrixWorld);
          pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
          v.set(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]).applyMatrix3(nm).normalize();
          nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z;
        }
        const key = mat.uuid + '|' + cell;
        let b = buckets.get(key);
        if (!b) { b = { mat, parts: [], n: 0, cast: false }; buckets.set(key, b); }
        b.parts.push({ pos, nor, uv }); b.n += count; b.cast = b.cast || o.castShadow;
      }
      if (geo !== src) geo.dispose();
      remove.push(o);
      return;
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  for (const o of remove) o.parent.remove(o);
  let meshes = 0;
  for (const b of buckets.values()) {
    const pos = new Float32Array(b.n * 3), nor = new Float32Array(b.n * 3), uv = new Float32Array(b.n * 2);
    let off = 0;
    for (const p of b.parts) { pos.set(p.pos, off * 3); nor.set(p.nor, off * 3); uv.set(p.uv, off * 2); off += p.pos.length / 3; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, b.mat);
    m.castShadow = b.cast; m.receiveShadow = true;
    m.name = 'merged';
    root.add(m);
    meshes++;
  }
  return { removed: remove.length, meshes };
}
