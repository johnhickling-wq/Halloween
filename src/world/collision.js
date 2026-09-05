// Simple 2D (XZ) collision world: boxes, circles and thick segments, spatially hashed.
const CELL = 8;

export class Colliders {
  constructor() { this.grid = new Map(); this.all = []; this.floors = []; }
  _key(cx, cz) { return cx * 73856 + cz; }
  _insert(c) {
    const x0 = Math.floor(c.bx0 / CELL), x1 = Math.floor(c.bx1 / CELL);
    const z0 = Math.floor(c.bz0 / CELL), z1 = Math.floor(c.bz1 / CELL);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const k = this._key(x, z);
      let arr = this.grid.get(k);
      if (!arr) { arr = []; this.grid.set(k, arr); }
      arr.push(c);
    }
    this.all.push(c);
    return c;
  }
  addBox(x0, z0, x1, z1, tag) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    return this._insert({ type: 'box', x0, z0, x1, z1, bx0: x0, bz0: z0, bx1: x1, bz1: z1, enabled: true, tag });
  }
  // rotated box: centre, half extents, yaw
  addOBB(cx, cz, hw, hd, yaw, tag) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const ext = Math.abs(c) * hw + Math.abs(s) * hd, extz = Math.abs(s) * hw + Math.abs(c) * hd;
    return this._insert({ type: 'obb', cx, cz, hw, hd, c, s, bx0: cx - ext, bx1: cx + ext, bz0: cz - extz, bz1: cz + extz, enabled: true, tag });
  }
  addCircle(x, z, r, tag) {
    return this._insert({ type: 'circle', x, z, r, bx0: x - r, bz0: z - r, bx1: x + r, bz1: z + r, enabled: true, tag });
  }
  addSegment(x0, z0, x1, z1, r, tag) {
    return this._insert({ type: 'seg', x0, z0, x1, z1, r, bx0: Math.min(x0, x1) - r, bz0: Math.min(z0, z1) - r, bx1: Math.max(x0, x1) + r, bz1: Math.max(z0, z1) + r, enabled: true, tag });
  }
  addFloor(x0, z0, x1, z1, y, tag) { this.floors.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y, tag }); }
  floorAt(x, z) {
    let best = null;
    for (const f of this.floors) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) { if (!best || f.y > best.y) best = f; }
    return best;
  }
  // Push a circle (px,pz,r) out of all colliders. Returns [x, z, hit]
  resolve(px, pz, r) {
    let hit = null;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      const x0 = Math.floor((px - r) / CELL), x1 = Math.floor((px + r) / CELL);
      const z0 = Math.floor((pz - r) / CELL), z1 = Math.floor((pz + r) / CELL);
      const seen = new Set();
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
        const arr = this.grid.get(this._key(gx, gz));
        if (!arr) continue;
        for (const c of arr) {
          if (!c.enabled || seen.has(c)) continue;
          seen.add(c);
          if (px + r < c.bx0 || px - r > c.bx1 || pz + r < c.bz0 || pz - r > c.bz1) continue;
          let nx = 0, nz = 0, depth = 0;
          if (c.type === 'box') {
            // closest point on box
            const qx = Math.max(c.x0, Math.min(px, c.x1)), qz = Math.max(c.z0, Math.min(pz, c.z1));
            let dx = px - qx, dz = pz - qz;
            let d = Math.hypot(dx, dz);
            if (d === 0) {
              // inside: push out along the smallest axis
              const l = px - c.x0, rr = c.x1 - px, t = pz - c.z0, b = c.z1 - pz;
              const m = Math.min(l, rr, t, b);
              if (m === l) { nx = -1; nz = 0; } else if (m === rr) { nx = 1; nz = 0; } else if (m === t) { nx = 0; nz = -1; } else { nx = 0; nz = 1; }
              depth = m + r;
            } else if (d < r) { nx = dx / d; nz = dz / d; depth = r - d; }
          } else if (c.type === 'obb') {
            // transform into box local space
            const lx = (px - c.cx) * c.c + (pz - c.cz) * c.s;
            const lz = -(px - c.cx) * c.s + (pz - c.cz) * c.c;
            const qx = Math.max(-c.hw, Math.min(lx, c.hw)), qz = Math.max(-c.hd, Math.min(lz, c.hd));
            let dx = lx - qx, dz = lz - qz;
            const d = Math.hypot(dx, dz);
            let lnx = 0, lnz = 0;
            if (d === 0) {
              const l = lx + c.hw, rr = c.hw - lx, t = lz + c.hd, b = c.hd - lz;
              const m = Math.min(l, rr, t, b);
              if (m === l) lnx = -1; else if (m === rr) lnx = 1; else if (m === t) lnz = -1; else lnz = 1;
              depth = m + r;
            } else if (d < r) { lnx = dx / d; lnz = dz / d; depth = r - d; }
            if (depth > 0) { nx = lnx * c.c - lnz * c.s; nz = lnx * c.s + lnz * c.c; }
          } else if (c.type === 'circle') {
            const dx = px - c.x, dz = pz - c.z; const d = Math.hypot(dx, dz);
            if (d < r + c.r) { if (d === 0) { nx = 1; nz = 0; } else { nx = dx / d; nz = dz / d; } depth = r + c.r - d; }
          } else if (c.type === 'seg') {
            const dx = c.x1 - c.x0, dz = c.z1 - c.z0; const l2 = dx * dx + dz * dz;
            let t = l2 > 0 ? ((px - c.x0) * dx + (pz - c.z0) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
            const qx = c.x0 + dx * t, qz = c.z0 + dz * t;
            const ex = px - qx, ez = pz - qz; const d = Math.hypot(ex, ez);
            if (d < r + c.r) { if (d === 0) { nx = -dz / Math.sqrt(l2 || 1); nz = dx / Math.sqrt(l2 || 1); } else { nx = ex / d; nz = ez / d; } depth = r + c.r - d; }
          }
          if (depth > 0) { px += nx * depth; pz += nz * depth; moved = true; hit = c; }
        }
      }
      if (!moved) break;
    }
    return [px, pz, hit];
  }
}
