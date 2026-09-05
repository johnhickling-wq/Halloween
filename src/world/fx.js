// Atmosphere: ground mist, falling leaves, marsh wisps, chimney smoke, bats.
import * as THREE from 'three';
import { terrainHeight, MARSH, WATER_LEVEL } from './terrain.js';
import { RNG, noise2 } from '../util/noise.js';

export class GroundMist {
  constructor(scene, tex, fogColor, count = 34) {
    this.sprites = [];
    this.rng = new RNG(55);
    const col = fogColor.clone().multiplyScalar(2.2);
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({ map: tex.mist, color: col, transparent: true, opacity: 0.16, depthWrite: false, fog: true });
      const s = new THREE.Sprite(m);
      s.scale.set(this.rng.float(12, 22), this.rng.float(4, 7), 1);
      s.userData.speed = this.rng.float(0.3, 0.8);
      s.userData.phase = this.rng.float(0, 6.28);
      s.renderOrder = 2;
      scene.add(s); this.sprites.push(s);
    }
    this.placed = false;
    // extra permanent mist in the marsh
    this.marsh = [];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.SpriteMaterial({ map: tex.mist, color: col, transparent: true, opacity: 0.2, depthWrite: false, fog: true });
      const s = new THREE.Sprite(m);
      const a = this.rng.float(0, 6.28), r = this.rng.float(5, 42);
      const x = MARSH.x + Math.cos(a) * r, z = MARSH.z + Math.sin(a) * r;
      s.position.set(x, Math.max(terrainHeight(x, z), WATER_LEVEL) + 1.4, z);
      s.scale.set(this.rng.float(14, 26), this.rng.float(4, 8), 1);
      s.userData.base = s.position.clone(); s.userData.phase = this.rng.float(0, 6.28);
      s.renderOrder = 2;
      scene.add(s); this.marsh.push(s);
    }
  }
  place(s, px, pz, anywhere) {
    const a = this.rng.float(0, 6.28), r = anywhere ? this.rng.float(6, 48) : 46;
    const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
    s.position.set(x, Math.max(terrainHeight(x, z), WATER_LEVEL) + 1.0, z);
  }
  update(dt, t, p) {
    if (!this.placed) { for (const s of this.sprites) this.place(s, p.x, p.z, true); this.placed = true; }
    for (const s of this.sprites) {
      s.position.x += s.userData.speed * dt; s.position.z += Math.sin(t * 0.2 + s.userData.phase) * 0.2 * dt;
      s.position.y = Math.max(terrainHeight(s.position.x, s.position.z), WATER_LEVEL) + 1.0 + Math.sin(t * 0.3 + s.userData.phase) * 0.25;
      if (s.position.distanceTo(p) > 52) this.place(s, p.x, p.z, false);
      s.material.opacity = 0.11 + 0.06 * Math.sin(t * 0.4 + s.userData.phase);
    }
    for (const s of this.marsh) { s.position.x = s.userData.base.x + Math.sin(t * 0.15 + s.userData.phase) * 2.5; s.material.opacity = 0.16 + 0.07 * Math.sin(t * 0.3 + s.userData.phase); }
  }
}

export class Leaves {
  constructor(scene, tex, count = 220) {
    const geo = new THREE.PlaneGeometry(0.16, 0.16);
    const mat = new THREE.MeshStandardMaterial({ map: tex.leaf, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.rng = new RNG(77);
    this.items = [];
    for (let i = 0; i < count; i++) this.items.push({ p: new THREE.Vector3(), v: this.rng.float(0.5, 1.2), ph: this.rng.float(0, 6.28), rs: this.rng.float(1, 4), init: false });
    this.dummy = new THREE.Object3D();
  }
  spawn(it, p) {
    it.p.set(p.x + this.rng.float(-22, 22), 0, p.z + this.rng.float(-22, 22));
    it.p.y = terrainHeight(it.p.x, it.p.z) + this.rng.float(2, 11);
    it.init = true;
  }
  update(dt, t, p) {
    const d = this.dummy;
    this.items.forEach((it, i) => {
      if (!it.init || it.p.distanceTo(p) > 30) this.spawn(it, p);
      it.p.y -= it.v * dt;
      it.p.x += (Math.sin(t * 1.1 + it.ph) * 0.8 + 0.5) * dt;
      it.p.z += Math.cos(t * 0.9 + it.ph) * 0.6 * dt;
      if (it.p.y < terrainHeight(it.p.x, it.p.z) - 0.2) this.spawn(it, p);
      d.position.copy(it.p);
      d.rotation.set(t * it.rs + it.ph, t * it.rs * 0.7, it.ph);
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class Wisps {
  constructor(scene, tex, count = 26) {
    this.sprites = [];
    this.rng = new RNG(99);
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({ map: tex.blob, color: 0x6affc0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
      const s = new THREE.Sprite(m);
      const a = this.rng.float(0, 6.28), r = this.rng.float(6, 40);
      const x = MARSH.x + Math.cos(a) * r, z = MARSH.z + Math.sin(a) * r;
      s.userData.base = new THREE.Vector3(x, Math.max(terrainHeight(x, z), WATER_LEVEL) + 0.6, z);
      s.userData.ph = this.rng.float(0, 6.28);
      s.scale.setScalar(0.5);
      scene.add(s); this.sprites.push(s);
    }
    this.intensity = 1;
  }
  update(dt, t) {
    for (const s of this.sprites) {
      const b = s.userData.base, ph = s.userData.ph;
      s.position.set(b.x + noise2(t * 0.15 + ph, ph) * 3, b.y + 0.4 + Math.sin(t * 0.7 + ph) * 0.35 + noise2(ph, t * 0.1) * 0.6, b.z + noise2(ph * 2, t * 0.15 + ph) * 3);
      const pulse = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.7 + ph * 3), 3);
      s.material.opacity = pulse * 0.55 * this.intensity;
      s.scale.setScalar(0.35 + pulse * 0.35);
    }
  }
}

export class Smoke {
  constructor(scene, tex, chimneys, per = 7) {
    this.parts = [];
    this.rng = new RNG(13);
    for (const c of chimneys) for (let i = 0; i < per; i++) {
      const m = new THREE.SpriteMaterial({ map: tex.blob, color: 0x8a8a90, transparent: true, opacity: 0.2, depthWrite: false, fog: true });
      const s = new THREE.Sprite(m);
      s.userData = { c, life: this.rng.float(0, 1), speed: this.rng.float(0.6, 1.0), ph: this.rng.float(0, 6.28) };
      scene.add(s); this.parts.push(s);
    }
  }
  update(dt, t) {
    for (const s of this.parts) {
      const u = s.userData;
      u.life += dt * 0.12 * u.speed;
      if (u.life > 1) u.life -= 1;
      const l = u.life;
      s.position.set(u.c.x + l * 3.5 + Math.sin(t + u.ph) * 0.3, u.c.y + l * 7, u.c.z + Math.cos(t * 0.7 + u.ph) * 0.4 + l * 1.5);
      s.scale.setScalar(0.8 + l * 4.5);
      s.material.opacity = 0.22 * Math.min(1, l * 5) * (1 - l);
    }
  }
}

export class Bats {
  constructor(scene, tex, count = 9) {
    this.sprites = [];
    this.rng = new RNG(21);
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({ map: tex.bat, color: 0x000000, transparent: true, opacity: 0.95, depthWrite: false, fog: true });
      const s = new THREE.Sprite(m);
      s.userData = { ph: this.rng.float(0, 6.28), r: this.rng.float(6, 16), sp: this.rng.float(0.6, 1.2), f: this.rng.float(14, 22) };
      scene.add(s); this.sprites.push(s);
    }
    this.center = new THREE.Vector3(2, 24, -52);
    this.active = true;
  }
  update(dt, t) {
    for (const s of this.sprites) {
      const u = s.userData;
      const a = t * u.sp + u.ph;
      s.position.set(this.center.x + Math.cos(a) * u.r + Math.sin(a * 2.3) * 3, this.center.y + Math.sin(a * 1.7) * 3, this.center.z + Math.sin(a) * u.r * 0.8);
      const flap = 0.55 + 0.45 * Math.abs(Math.sin(t * u.f + u.ph));
      s.scale.set(1.1, 0.55 * flap, 1);
      s.visible = this.active;
    }
  }
}
