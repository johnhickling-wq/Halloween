// Things that move in the dark: the Tallow Man, crows, scarecrows, the villagers.
import * as THREE from 'three';
import { terrainHeight, WATER_LEVEL } from './world/terrain.js';
import { RNG } from './util/noise.js';

const UP = new THREE.Vector3(0, 1, 0);

export class TallowMan {
  constructor(game) {
    this.g = game;
    const M = game.materials, tex = game.tex;
    const g = new THREE.Group(); g.name = 'tallow';
    const cloth = new THREE.MeshStandardMaterial({ map: tex.cloth, roughness: 1, color: 0xd0d0d0 });
    const wax = new THREE.MeshStandardMaterial({ color: 0xe6dcc8, roughness: 0.3, emissive: 0x6a6050, emissiveIntensity: 0.9 });
    this.legs = [];
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.55, 6), cloth); leg.position.set(s * 0.13, 0.775, 0); const pivot = new THREE.Group(); pivot.position.set(s * 0.13, 1.55, 0); leg.position.set(0, -0.775, 0); pivot.add(leg); g.add(pivot); this.legs.push(pivot); }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 1.3, 8), cloth); body.position.y = 2.15; g.add(body);
    // ragged hem
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const rag = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 4), cloth); rag.position.set(Math.cos(a) * 0.3, 1.35, Math.sin(a) * 0.3); rag.rotation.x = Math.PI; g.add(rag); }
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.26), cloth); shoulders.position.y = 2.78; g.add(shoulders);
    this.arms = [];
    for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.36, 2.76, 0); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.15, 6), cloth); arm.position.y = -0.575; pivot.add(arm); g.add(pivot); this.arms.push(pivot); }
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6), wax); neck.position.y = 2.95; g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), wax); head.scale.set(1, 1.55, 1.05); head.position.y = 3.3; g.add(head);
    this.head = head;
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.4; const drip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18 + (i % 2) * 0.12, 5), wax); drip.position.set(Math.cos(a) * 0.14, 3.05 - (i % 2) * 0.05, Math.sin(a) * 0.14); drip.rotation.x = Math.PI; g.add(drip); }
    // the lantern in the right hand: sickly green
    const lan = new THREE.Group(); lan.position.set(0, -1.2, 0.1); this.arms[1].add(lan);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 8), new THREE.MeshBasicMaterial({ color: 0x9affc8, transparent: true, opacity: 0.5 })); lan.add(glass);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.08, 8), new THREE.MeshBasicMaterial({ color: 0x050505 })); cap.position.y = 0.14; lan.add(cap);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.blob, color: 0x7affc0, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(0.9); lan.add(glow);
    this.light = new THREE.PointLight(0x80ffc0, 0, 16, 1.6); lan.add(this.light);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    g.visible = false;
    game.scene.add(g);
    this.group = g;
    this.state = 'hidden';
    this.seen = 0; this.unseen = 0; this.moves = 0; this.maxMoves = 2; this.minDist = 14;
    this.stalking = false;
    this.nextAmbient = 40;
    this.rng = new RNG(606);
    this.frustum = new THREE.Frustum();
    this.pm = new THREE.Matrix4();
    this.sphere = new THREE.Sphere(new THREE.Vector3(), 0.9);
    this.walkTarget = null; this.arrived = false; this.walkT = 0;
    this.fearTarget = 0;
    this.everSeen = false;
  }
  placeOnGround(x, z) { this.group.position.set(x, terrainHeight(x, z), z); }
  appearAt(x, z, opts = {}) {
    if (this.state === 'walking') return;
    this.placeOnGround(x, z);
    this.group.visible = true; this.state = 'standing'; this.seen = 0; this.unseen = 0; this.moves = 0;
    this.maxMoves = opts.moves ?? 2; this.minDist = opts.minDist ?? 12; this.stungThisAppearance = false;
    this.light.intensity = 6;
    this.face(this.g.player.pos);
  }
  appearNearPlayer(dist, behind = true) {
    const p = this.g.player;
    for (let i = 0; i < 12; i++) {
      const ang = p.yaw + (behind ? Math.PI : 0) + this.rng.float(-1.3, 1.3);
      const x = p.pos.x - Math.sin(ang) * dist, z = p.pos.z - Math.cos(ang) * dist;
      if (this.validSpot(x, z)) { this.appearAt(x, z, { moves: this.stalking ? 3 : 2, minDist: this.stalking ? 9 : 13 }); return true; }
    }
    return false;
  }
  validSpot(x, z) {
    if (Math.hypot(x, z) > 140) return false;
    if (terrainHeight(x, z) < WATER_LEVEL + 0.3) return false;
    if (this.g.world.colliders.floorAt(x, z)) return false;
    // not inside the churchyard walls unless the player is there too
    return true;
  }
  vanish() { this.group.visible = false; this.state = 'hidden'; this.light.intensity = 0; this.scheduleAmbient(); }
  scheduleAmbient() { this.nextAmbient = this.stalking ? this.rng.float(22, 40) : this.rng.float(45, 90); }
  face(target) { const d = Math.atan2(target.x - this.group.position.x, target.z - this.group.position.z); this.group.rotation.y = d; }
  isVisible(camera) {
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    this.sphere.center.copy(this.group.position); this.sphere.center.y += 3.2;
    return this.frustum.intersectsSphere(this.sphere) && this.sphere.center.distanceTo(camera.position) < 95;
  }
  beginApproach(from, player) {
    this.state = 'walking'; this.group.visible = true; this.light.intensity = 8;
    this.group.position.copy(from); this.group.position.y = terrainHeight(from.x, from.z) - 3.2; // rises out of the water
    this.walkT = 0; this.arrived = false; this.walkTarget = player;
  }
  update(dt, t) {
    const g = this.g, p = g.player, cam = g.camera;
    if (this.state === 'walking') {
      this.walkT += dt;
      const rise = Math.min(1, this.walkT / 4);
      const target = this.walkTarget.pos;
      const dx = target.x - this.group.position.x, dz = target.z - this.group.position.z;
      const d = Math.hypot(dx, dz);
      this.face(target);
      if (rise >= 1 && d > 1.6) { const sp = 1.25 * dt; this.group.position.x += dx / d * sp; this.group.position.z += dz / d * sp; }
      const gy = terrainHeight(this.group.position.x, this.group.position.z);
      this.group.position.y = Math.max(gy, gy - 3.2 * (1 - rise));
      const sw = Math.sin(this.walkT * 3.2) * (rise >= 1 && d > 1.6 ? 0.55 : 0);
      this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw;
      this.arms[0].rotation.x = -sw * 0.5; this.arms[1].rotation.x = 0.4 + Math.sin(t * 2) * 0.05;
      if (d <= 1.6) this.arrived = true;
      this.fearTarget = 1;
      g.fear += (1 - g.fear) * Math.min(1, dt);
      return;
    }
    // ambient appearances
    if (g.story.act >= 2 && this.state === 'hidden' && !g.story.ending) {
      this.nextAmbient -= dt;
      if (this.nextAmbient <= 0 && !p.inside && !g.ui.open) { if (!this.appearNearPlayer(this.rng.float(28, 44), true)) this.nextAmbient = 10; }
    }
    if (this.state === 'standing') {
      const vis = this.isVisible(cam) && !g.ui.open;
      const dist = this.group.position.distanceTo(p.pos);
      // subtle life: sway, head tilt toward the player
      this.group.rotation.z = Math.sin(t * 0.7) * 0.01;
      this.head.rotation.x = -0.15 + Math.sin(t * 0.5) * 0.04;
      this.arms[1].rotation.x = 0.45 + Math.sin(t * 1.3) * 0.04;
      this.light.intensity = 6 + Math.sin(t * 9) * 1.2;
      if (vis) {
        this.seen += dt; this.unseen = 0;
        if (!this.stungThisAppearance) { this.stungThisAppearance = true; this.everSeen = true; g.audio.stingerLow(); g.audio.whisperBurst(); g.lampFlicker = 0.8; }
        this.fearTarget = Math.min(1, Math.max(0.35, 1.3 - dist / 40));
        if (this.seen > 5) { this.face(p.pos); g.lampFlicker = 0.5; }
      } else {
        this.unseen += dt; this.fearTarget = Math.max(0, this.fearTarget - dt * 0.15);
        if (this.unseen > 0.45 && this.seen > 0.2) {
          if (this.moves < this.maxMoves && dist > this.minDist) {
            // step closer along the line to the player, offset a little so he is not dead ahead
            const k = 0.55; const nx = this.group.position.x + (p.pos.x - this.group.position.x) * k + this.rng.float(-3, 3), nz = this.group.position.z + (p.pos.z - this.group.position.z) * k + this.rng.float(-3, 3);
            if (this.validSpot(nx, nz)) { this.placeOnGround(nx, nz); this.face(p.pos); }
            this.moves++; this.seen = 0; this.unseen = 0;
          } else if (this.seen > 3.5 || this.moves >= this.maxMoves) { this.vanish(); }
          else { this.seen = 0; this.unseen = 0; }
        }
        if (this.unseen > 25) this.vanish();
      }
      // never let him be too close for comfort unless stalking
      if (dist < 4 && !this.stalking) this.vanish();
    } else this.fearTarget = Math.max(0, this.fearTarget - dt * 0.2);
    // fear follows target
    const target = Math.max(this.fearTarget, g.story.act === 3 ? 0.08 : 0);
    g.fear += (target - g.fear) * Math.min(1, (target > g.fear ? 1.6 : 0.35) * dt);
  }
}

export class Crows {
  constructor(game) {
    this.g = game;
    this.rng = new RNG(303);
    this.items = [];
    const perches = [];
    for (const gr of (game.world.graves || [])) perches.push([gr.x, gr.y + 1.05, gr.z]);
    for (const [x, z] of [[5.5, -36], [-5.5, -36], [24, -50], [-24, -60], [-40, -8], [-30, -1]]) perches.push([x, terrainHeight(x, z) + 1.25, z]);
    for (const b of (game.world.buildings || [])) { const gp = b.group.position; perches.push([gp.x, gp.y + (b.spec.storeys || 1) * (b.spec.storeyH || 2.75) + 3.4, gp.z]); }
    perches.push([0, terrainHeight(0, 4) + 3.1, 4]);
    this.perches = perches;
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: game.tex.crow, color: 0x000000, transparent: true, depthWrite: false, fog: true }));
      s.scale.set(0.5, 0.5, 1);
      game.scene.add(s);
      const it = { s, state: 'perched', v: new THREE.Vector3(), t: 0, respawn: 0 };
      this.perchRandom(it, null);
      this.items.push(it);
    }
  }
  perchRandom(it, awayFrom) {
    for (let k = 0; k < 20; k++) {
      const p = this.rng.pick(this.perches);
      if (awayFrom && Math.hypot(p[0] - awayFrom.x, p[2] - awayFrom.z) < 25) continue;
      it.s.position.set(p[0] + this.rng.float(-0.2, 0.2), p[1], p[2] + this.rng.float(-0.2, 0.2)); it.state = 'perched'; it.s.visible = true; it.s.scale.set(0.5, 0.5, 1);
      return;
    }
  }
  scatterNear(pos, radius) {
    let n = 0;
    for (const it of this.items) if (it.state === 'perched' && it.s.position.distanceTo(pos) < radius) { this.fly(it, pos); n++; }
    if (n) this.g.audio.crowCaw(pos, 0.7, 3);
  }
  fly(it, from) {
    it.state = 'flying'; it.t = 0;
    const away = new THREE.Vector3().subVectors(it.s.position, from).setY(0).normalize();
    if (away.lengthSq() < 0.01) away.set(1, 0, 0);
    it.v.copy(away).multiplyScalar(this.rng.float(4, 7)).add(new THREE.Vector3(this.rng.float(-2, 2), this.rng.float(3, 5), this.rng.float(-2, 2)));
  }
  update(dt, t) {
    const p = this.g.player.pos;
    for (const it of this.items) {
      if (it.state === 'perched') {
        it.s.position.y += Math.sin(t * 3 + it.s.position.x) * 0.0006;
        if (it.s.position.distanceTo(p) < 7.5) { this.fly(it, p); this.g.audio.crowCaw(it.s.position, 0.8, 2); }
      } else if (it.state === 'flying') {
        it.t += dt;
        it.s.position.addScaledVector(it.v, dt);
        it.v.y -= 0.3 * dt; it.v.y = Math.max(it.v.y, 1.5);
        const flap = 0.7 + 0.3 * Math.abs(Math.sin(t * 18 + it.s.position.x));
        it.s.scale.set(0.6, 0.6 * flap, 1);
        if (it.t > 5) { it.state = 'gone'; it.s.visible = false; it.respawn = this.rng.float(40, 90); }
      } else { it.respawn -= dt; if (it.respawn <= 0) this.perchRandom(it, p); }
    }
  }
}

export class ScarecrowWatch {
  constructor(game) { this.g = game; this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4(); this.sphere = new THREE.Sphere(new THREE.Vector3(), 1.5); this.vanished = false; }
  vanishOne() {
    const sc = (this.g.world.scarecrows || [])[1];
    if (!sc || this.vanished) return;
    this.vanished = true;
    // leave only the bare cross
    sc.group.children.forEach((c, i) => { if (i >= 2) c.visible = false; });
    sc.gone = true;
  }
  update() {
    const g = this.g, cam = g.camera, p = g.player.pos;
    const list = g.world.scarecrows || [];
    if (!list.length) return;
    this.pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    for (const sc of list) {
      if (sc.gone) continue;
      const d = Math.hypot(sc.x - p.x, sc.z - p.z);
      if (d > 70) continue;
      this.sphere.center.set(sc.x, sc.group.position.y + 1.8, sc.z);
      const vis = this.frustum.intersectsSphere(this.sphere);
      if (!vis) sc.group.rotation.y = Math.atan2(p.x - sc.x, p.z - sc.z);
    }
  }
}

export class Villagers {
  constructor(game) {
    this.g = game;
    this.group = new THREE.Group(); this.group.visible = false;
    const cloth = new THREE.MeshStandardMaterial({ map: game.tex.cloth, roughness: 1, color: 0x6a6a6a });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa040, emissiveIntensity: 3.0, transparent: true, opacity: 0.7 });
    this.figs = [];
    const rng = new RNG(1626);
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + rng.float(-0.06, 0.06), r = 10.2 + rng.float(-0.4, 0.6);
      const x = 16 + Math.cos(a) * r, z = -120 + Math.sin(a) * r;
      const f = new THREE.Group(); f.position.set(x, terrainHeight(x, z), z);
      f.rotation.y = Math.atan2(16 - x, -120 - z); // face the centre
      const h = rng.float(1.5, 1.85);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, h, 8), cloth); body.position.y = h / 2; f.add(body);
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), cloth); hood.position.y = h + 0.1; f.add(hood);
      const arm = new THREE.Group(); arm.position.set(0.25, h * 0.6, 0); f.add(arm);
      const lan = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), glassMat); lan.position.set(0.15, -0.1, 0.25); arm.add(lan);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: game.tex.blob, color: 0xffa050, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(1.6); glow.position.copy(lan.position); arm.add(glow);
      this.group.add(f);
      this.figs.push({ f, arm, ph: rng.float(0, 6.28), h });
      // a few of their lanterns are real lights
      if (i % 3 === 0) { const L = game.world.addLight(new THREE.Vector3(x, terrainHeight(x, z) + h * 0.6, z), 0xffa050, 3.5, 10, 0.8); L.on = false; this.figs[this.figs.length - 1].L = L; }
    }
    game.scene.add(this.group);
    this.raised = 0; this.raising = false;
  }
  show() { this.group.visible = true; for (const fg of this.figs) if (fg.L) fg.L.on = true; }
  raise() { this.raising = true; }
  update(dt, t) {
    if (!this.group.visible) return;
    if (this.raising) this.raised = Math.min(1, this.raised + dt * 0.5);
    for (const fg of this.figs) {
      fg.arm.rotation.x = -0.2 - this.raised * 1.6 + Math.sin(t * 1.1 + fg.ph) * 0.03;
      fg.f.position.y = terrainHeight(fg.f.position.x, fg.f.position.z) + Math.sin(t * 0.8 + fg.ph) * 0.01;
    }
  }
}

export class Entities {
  constructor(game) {
    this.tallow = new TallowMan(game);
    this.crows = new Crows(game);
    this.scarecrows = new ScarecrowWatch(game);
    this.villagers = new Villagers(game);
  }
  update(dt, t) { this.tallow.update(dt, t); this.crows.update(dt, t); this.scarecrows.update(); this.villagers.update(dt, t); }
}
