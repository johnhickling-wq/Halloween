import * as THREE from 'three';
import { clamp } from './util/noise.js';

const EYE = 1.62;
const RADIUS = 0.36;

export class Player {
  constructor(camera, world, input, settings) {
    this.camera = camera;
    this.world = world;
    this.input = input;
    this.settings = settings;
    this.pos = new THREE.Vector3(0, 0, 0);      // feet position
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;   // facing north (-z)
    this.pitch = 0;
    this.roll = 0;
    this.bobPhase = 0;
    this.bobAmt = 0;
    this.groundY = 0;
    this.speedMul = 1;
    this.frozen = false;     // no movement (cutscenes) but can look
    this.lookLocked = false;
    this.onStep = null;      // (surface, running) callback
    this.surface = 'grass';
    this.moving = false;
    this.running = false;
    this.headOffset = new THREE.Vector3();
    this.lanternSwing = new THREE.Vector2();
    this.lanternVel = new THREE.Vector2();
    this.lastVel = new THREE.Vector3();
    this.inside = null;
    this.camera.rotation.order = 'YXZ';
    this.tmp = new THREE.Vector3();
  }

  teleport(x, z, yaw) {
    this.pos.set(x, this.world.groundAt(x, z), z);
    if (yaw !== undefined) this.yaw = yaw;
    this.groundY = this.pos.y;
    this.vel.set(0, 0, 0);
    this.updateCamera(0);
  }

  update(dt) {
    const input = this.input;
    if (!this.lookLocked) {
      const [dx, dy] = input.consumeMouse();
      const s = 0.0022 * this.settings.sensitivity;
      this.yaw -= dx * s;
      this.pitch = clamp(this.pitch - dy * s, -1.45, 1.45);
    } else input.consumeMouse();

    // movement
    let fwd = 0, side = 0;
    if (!this.frozen) {
      if (input.down('KeyW', 'ArrowUp')) fwd += 1;
      if (input.down('KeyS', 'ArrowDown')) fwd -= 1;
      if (input.down('KeyA', 'ArrowLeft')) side -= 1;
      if (input.down('KeyD', 'ArrowRight')) side += 1;
    }
    const running = (input.down('ShiftLeft', 'ShiftRight')) && fwd > 0;
    this.running = running;
    const len = Math.hypot(fwd, side) || 1;
    fwd /= len; side /= len;
    const maxSpeed = (running ? 5.6 : 3.1) * this.speedMul;
    const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
    // forward vector for yaw (camera looks down -z when yaw = 0)
    const fx = -sinY, fz = -cosY;
    const rx = cosY, rz = -sinY;
    const tx = (fx * fwd + rx * side) * maxSpeed, tz = (fz * fwd + rz * side) * maxSpeed;
    const accel = (fwd || side) ? 14 : 18;
    this.vel.x += (tx - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (tz - this.vel.z) * Math.min(1, accel * dt);
    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.moving = speed > 0.3;

    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    const [cx, cz] = this.world.colliders.resolve(nx, nz, RADIUS);
    // world bounds
    const rr = Math.hypot(cx, cz);
    if (rr > 152) { const k = 152 / rr; nx = cx * k; nz = cz * k; } else { nx = cx; nz = cz; }
    // block if the slope is too steep (cheap: compare ground heights)
    const gNew = this.world.groundAt(nx, nz);
    if (gNew - this.groundY > 0.9) { nx = this.pos.x; nz = this.pos.z; this.vel.multiplyScalar(0.2); }
    this.pos.x = nx; this.pos.z = nz;
    const g = this.world.groundAt(nx, nz);
    this.groundY += (g - this.groundY) * Math.min(1, 12 * dt);
    this.pos.y = this.groundY;
    this.inside = this.world.colliders.floorAt(nx, nz);
    this.surface = this.inside ? (this.inside.tag || 'wood') : this.world.surfaceAt(nx, nz);

    // head bob & footsteps
    const bobSpeed = (running ? 11.5 : 8.2);
    if (this.moving) {
      const prev = this.bobPhase;
      this.bobPhase += dt * bobSpeed * Math.min(1, speed / 2.5);
      this.bobAmt += (1 - this.bobAmt) * Math.min(1, 6 * dt);
      if (Math.floor(prev / Math.PI) !== Math.floor(this.bobPhase / Math.PI)) {
        if (this.onStep) this.onStep(this.surface, running, Math.floor(this.bobPhase / Math.PI) % 2);
      }
    } else {
      this.bobAmt += (0 - this.bobAmt) * Math.min(1, 4 * dt);
    }
    const bobScale = this.settings.bob;
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.045 * this.bobAmt * bobScale * (running ? 1.4 : 1);
    const bobX = Math.sin(this.bobPhase * 0.5) * 0.02 * this.bobAmt * bobScale;
    this.headOffset.set(bobX, bobY, 0);
    // camera roll from strafing
    const targetRoll = -side * 0.012 * bobScale;
    this.roll += (targetRoll - this.roll) * Math.min(1, 5 * dt);
    this.updateCamera(dt);

    // lantern swing: driven by acceleration (spring)
    const ax = (this.vel.x - this.lastVel.x) / Math.max(dt, 1e-3), az = (this.vel.z - this.lastVel.z) / Math.max(dt, 1e-3);
    this.lastVel.copy(this.vel);
    // acceleration in camera space
    const localF = ax * fx + az * fz, localR = ax * rx + az * rz;
    this.lanternVel.x += (-localR * 0.004 - this.lanternSwing.x * 30 - this.lanternVel.x * 4.5) * dt;
    this.lanternVel.y += (-localF * 0.004 - this.lanternSwing.y * 30 - this.lanternVel.y * 4.5) * dt;
    this.lanternSwing.x += this.lanternVel.x * dt;
    this.lanternSwing.y += this.lanternVel.y * dt;
  }

  updateCamera(dt) {
    const c = this.camera;
    c.position.set(this.pos.x + this.headOffset.x, this.pos.y + EYE + this.headOffset.y, this.pos.z);
    // sway the head slightly with idle breathing
    const t = performance.now() * 0.001;
    c.position.y += Math.sin(t * 1.3) * 0.008;
    c.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
  }

  get forward() { return this.tmp.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
}
