import * as THREE from 'three';
import { Colliders } from './collision.js';
import { terrainHeight, isCobbled, isMud, WATER_LEVEL } from './terrain.js';

// Holds everything static about the village: meshes, colliders, interactables, and light pool.
export class World {
  constructor(scene, tex, quality) {
    this.scene = scene;
    this.tex = tex;
    this.quality = quality;
    this.group = new THREE.Group();
    this.group.name = 'world';
    scene.add(this.group);
    this.colliders = new Colliders();
    this.interactables = [];      // meshes with userData.interact
    this.lightSources = [];       // { pos: Vector3, color, intensity, distance, flicker, obj }
    this.dynamic = [];            // objects with update(dt, t)
    this.doors = [];
    this.labels = new Map();      // named positions (for the story)
    this.materials = {};
  }
  groundAt(x, z) {
    const f = this.colliders.floorAt(x, z);
    const t = terrainHeight(x, z);
    if (f) return Math.max(f.y, t - 0.5) === f.y ? f.y : t;
    return t;
  }
  surfaceAt(x, z) {
    if (terrainHeight(x, z) < WATER_LEVEL + 0.15) return 'water';
    if (isCobbled(x, z)) return 'stone';
    if (isMud(x, z)) return 'mud';
    return 'grass';
  }
  addLight(pos, color, intensity, distance, flicker = 1, decay = 2) {
    const L = { pos: pos.clone(), color: new THREE.Color(color), intensity, distance, flicker, decay, on: true, seed: Math.random() * 100 };
    this.lightSources.push(L);
    return L;
  }
  mark(name, x, y, z, extra = {}) { this.labels.set(name, { x, y, z, ...extra }); return this.labels.get(name); }
  update(dt, t) { for (const d of this.dynamic) d.update(dt, t); }
}

// Pool of real point lights assigned to the nearest light sources every frame.
export class LightPool {
  constructor(scene, count) {
    this.lights = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 10, 2);
      l.castShadow = false;
      scene.add(l);
      this.lights.push(l);
    }
    this.timer = 0;
  }
  update(dt, t, sources, camPos, flicker = 0) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.25;
      // sort sources by distance (cheap: only every quarter second)
      const arr = sources.filter(s => s.on);
      arr.sort((a, b) => a.pos.distanceToSquared(camPos) - b.pos.distanceToSquared(camPos));
      this.assigned = arr.slice(0, this.lights.length);
    }
    const a = this.assigned || [];
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i], s = a[i];
      if (!s) { l.intensity = 0; continue; }
      l.position.copy(s.pos);
      l.color.copy(s.color);
      l.distance = s.distance;
      l.decay = s.decay;
      const f = s.flicker > 0 ? (1 - s.flicker * 0.25 * (0.5 + 0.5 * Math.sin(t * 13.7 + s.seed) * Math.sin(t * 7.3 + s.seed * 2.1) + 0.3 * Math.sin(t * 31 + s.seed))) : 1;
      l.intensity = s.intensity * f * (flicker > 0 ? (1 - flicker * Math.random() * 0.8) : 1);
    }
  }
}
