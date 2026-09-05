import * as THREE from 'three';
import { buildTerrain, WATER_LEVEL, terrainHeight } from './world/terrain.js';
import { Sky } from './world/sky.js';
import { World, LightPool } from './world/world.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { PostFX } from './postfx.js';
import { createTextures, buildVillage } from './world/village.js';
import { makeMaterials } from './world/buildings.js';
import { plantTrees, plantReeds, makeWater } from './world/nature.js';
import { GroundMist, Leaves, Wisps, Smoke, Bats } from './world/fx.js';
import { mergeStatic } from './world/merge.js';
import { UI, escapeHtml } from './ui.js';
import { Story, CLUES } from './story.js';
import { Interact } from './interact.js';
import { AudioSys } from './audio.js';
import { Entities } from './entities.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');

class Game {
  constructor() {
    this.settings = { sensitivity: 1, bob: 1 };
    this.quality = params.get('q') || document.getElementById('quality').value || 'high';
    this.time = 0;
    this.fear = 0;
    this.dark = 0;
    this.pulse = 0;
    this.lampFlicker = 0;
    this.started = false;
    this.paused = false;
    this.debug = DEBUG;
    this.dawn = false;
    this.dawnT = 0;
    this.timeScale = DEBUG ? parseFloat(params.get('ts') || '1') : 1;
    this.frameMs = 0; this.frames = 0;
  }

  async init() {
    const app = document.getElementById('app');
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 'high' ? 1.5 : 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = this.quality !== 'low';
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    app.insertBefore(renderer.domElement, app.firstChild);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    this.fogColor = new THREE.Color(0x182030);
    this.fogNight = this.fogColor.clone();
    this.fogDawn = new THREE.Color(0x8a94a0);
    scene.fog = new THREE.FogExp2(this.fogColor, 0.016);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.08, 1400);
    this.camera = camera;
    this.ui = new UI();
    this.audio = new AudioSys();

    await this.yieldFrame('drawing the village…');
    const tex = this.tex = await createTextures((f) => this.yieldFrame(`drawing the village… ${Math.round(f * 100)}%`));
    this.materials = makeMaterials(tex);

    // sky + moon
    const moonDir = new THREE.Vector3(0.55, 0.42, -0.72).normalize();
    this.sky = new Sky(moonDir);
    scene.add(this.sky.mesh);
    const moon = new THREE.DirectionalLight(0x9fb4d8, 1.7);
    moon.position.copy(moonDir).multiplyScalar(120);
    moon.castShadow = this.quality !== 'low';
    moon.shadow.mapSize.set(this.quality === 'high' ? 2048 : 1024, this.quality === 'high' ? 2048 : 1024);
    moon.shadow.camera.near = 20; moon.shadow.camera.far = 260;
    moon.shadow.camera.left = -70; moon.shadow.camera.right = 70; moon.shadow.camera.top = 70; moon.shadow.camera.bottom = -70;
    moon.shadow.bias = -0.0008; moon.shadow.normalBias = 0.05;
    scene.add(moon); scene.add(moon.target);
    this.moon = moon;
    this.moonColorNight = moon.color.clone(); this.moonColorDawn = new THREE.Color(0xffd0a0);
    const hemi = new THREE.HemisphereLight(0x3a4a66, 0x1a140c, 0.75);
    scene.add(hemi);
    this.hemi = hemi;

    // world
    await this.yieldFrame('laying the cobbles…');
    this.world = new World(scene, tex, this.quality);
    const terrain = buildTerrain(tex, this.quality === 'low' ? 170 : 272);
    terrain.userData.keep = true;
    this.world.group.add(terrain);
    this.lightPool = new LightPool(scene, this.quality === 'high' ? 10 : this.quality === 'medium' ? 6 : 3);
    await this.yieldFrame('raising the church…');
    this.village = buildVillage(this.world, this.materials);
    await this.yieldFrame('planting the woods…');
    this.mergeStats = mergeStatic(this.world);
    console.log('[merge]', JSON.stringify(this.mergeStats));
    plantTrees(this.world, this.materials);
    plantReeds(this.world);
    makeWater(this.world, moonDir, this.fogColor);
    this.fx = {
      mist: new GroundMist(scene, tex, this.fogColor, this.quality === 'low' ? 16 : 34),
      leaves: new Leaves(scene, tex, this.quality === 'low' ? 80 : 220),
      wisps: new Wisps(scene, tex),
      smoke: new Smoke(scene, tex, this.world.chimneys || []),
      bats: new Bats(scene, tex),
    };

    // player & systems
    this.input = new Input(renderer.domElement);
    this.player = new Player(camera, this.world, this.input, this.settings);
    const start = this.world.labels.get('start');
    this.player.teleport(start.x, start.z, 0);
    this.player.onStep = (surface, running) => this.audio.footstep(surface, running);
    this.buildLantern();
    this.story = new Story(this);
    this.interact = new Interact(this);
    await this.yieldFrame('waking the crows…');
    this.entities = new Entities(this);
    this.audio.onBeat = () => { this.pulse = 1; };

    this.post = new PostFX(renderer, scene, camera, this.quality);
    window.addEventListener('resize', () => this.onResize());
    this.bindUI();

    this.lastTime = performance.now();
    renderer.info.autoReset = false;
    console.log(`[load] ready @ ${(performance.now() / 1000).toFixed(2)}s`);
    document.getElementById('loading').textContent = '';
    document.getElementById('begin').disabled = false;
    if (DEBUG) this.debugStart();
    this.loop();
  }

  // ---------------- UI wiring ----------------
  bindUI() {
    const ui = this.ui, input = this.input;
    document.getElementById('begin').addEventListener('click', () => this.startGame());
    document.getElementById('playerName').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.startGame(); });
    document.getElementById('resume').addEventListener('click', () => this.resume());
    document.getElementById('again').addEventListener('click', () => location.reload());
    document.getElementById('sens').addEventListener('input', (e) => { this.settings.sensitivity = parseFloat(e.target.value); });
    document.getElementById('bob').addEventListener('input', (e) => { this.settings.bob = parseFloat(e.target.value); });
    document.getElementById('quality').addEventListener('change', (e) => { const u = new URL(location.href); u.searchParams.set('q', e.target.value); location.href = u.toString(); });
    input.onLockChange = (locked) => {
      if (!this.started || this.story.finished) return;
      if (!locked) {
        if (ui.open === 'intro') return;
        ui.hideNote(); ui.hideJournal();
        this.paused = true; ui.screen('pause', true); this.audio.suspend();
        document.getElementById('pauseHint').textContent = this.story.objectiveText || '';
      } else { this.paused = false; ui.screen('pause', false); this.audio.resume(); }
    };
    input.onKeyDown = (code, e) => {
      if (!this.started) return;
      if (ui.open === 'intro') { if (code !== 'Escape') this.finishIntro(); return; }
      if (ui.open === 'note') { if (code === 'KeyE' || code === 'Escape' || code === 'Space' || code === 'KeyJ') { ui.hideNote(); this.audio.paper(); input.pressed.delete(code); } return; }
      if (ui.open === 'journal') { if (code === 'KeyJ' || code === 'Tab' || code === 'Escape' || code === 'KeyE') { ui.hideJournal(); input.pressed.delete(code); } return; }
      if (ui.open === 'ending' || ui.open === 'pause') return;
      if (code === 'KeyJ' || code === 'Tab') { ui.renderJournal(this.story, this.world, this.player); this.audio.paper(); }
    };
    // clicking the canvas while paused resumes
    this.renderer.domElement.addEventListener('click', () => { if (this.started && !this.input.locked && !this.story.finished && ui.open !== 'intro') this.resume(); });
    document.getElementById('pause').addEventListener('click', (e) => { if (e.target.id === 'pause') this.resume(); });
    document.getElementById('intro').addEventListener('click', () => { if (ui.open === 'intro') this.finishIntro(); });
  }
  resume() { this.input.lock(); if (this.debug) { this.paused = false; this.ui.screen('pause', false); } }

  startGame() {
    if (this.started) return;
    const nameEl = document.getElementById('playerName');
    const name = (nameEl.value || '').trim().slice(0, 24) || 'Alice Marlow';
    this.started = true;
    this.audio.start();
    this.ui.screen('title', false);
    this.player.teleport(this.world.labels.get('start').x, this.world.labels.get('start').z, 0);
    // the letter
    const letter = CLUES.letter.text.replaceAll('{name}', escapeHtml(name));
    this.ui.showIntro(letter.replace(/\n/g, '<br>'));
    this.pendingName = name;
    this.introTimer = setTimeout(() => this.finishIntro(), 26000);
  }
  finishIntro() {
    if (this.ui.open !== 'intro') return;
    clearTimeout(this.introTimer);
    this.ui.hideIntro();
    this.input.lock();
    this.ui.fade(false, 'slow');
    this.ui.showHud(true);
    this.story.begin(this.pendingName);
    // if the browser refused pointer lock (no user gesture), fall back to the pause screen so a click can grab it
    setTimeout(() => { if (!this.input.locked && !this.debug && !this.story.finished) { this.paused = true; this.ui.screen('pause', true); document.getElementById('pauseHint').textContent = 'Click Resume to take up the lantern.'; } }, 700);
  }

  buildLantern() {
    const g = new THREE.Group();
    const metal = new THREE.MeshBasicMaterial({ color: 0x0b0b0c });
    const glass = new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.18, depthWrite: false });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 8), glass);
    g.add(body);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.07, 8), metal); cap.position.y = 0.115; g.add(cap);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 8), metal); base.position.y = -0.09; g.add(base);
    for (let i = 0; i < 4; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.16, 0.008), metal); const a = i * Math.PI / 2 + Math.PI / 4; bar.position.set(Math.cos(a) * 0.065, 0, Math.sin(a) * 0.065); g.add(bar); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 12), metal); ring.position.y = 0.17; g.add(ring);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 6), metal); handle.position.y = 0.28; g.add(handle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0a0 }));
    flame.position.y = -0.03; flame.scale.y = 1.8; g.add(flame);
    this.flame = flame;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.blob, color: 0xff9a40, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(0.35); glow.position.y = -0.02; g.add(glow);
    const light = new THREE.PointLight(0xffa552, 9, 18, 2);
    light.position.set(-0.06, 0.0, -0.12);
    g.add(light);
    this.lanternLight = light;
    g.position.set(0.34, -0.30, -0.72);
    g.scale.setScalar(0.7);
    this.lantern = g;
    this.camera.add(g);
    this.scene.add(this.camera);
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
  }

  yieldFrame(msg) {
    const el = document.getElementById('loading');
    if (el && msg) el.textContent = msg;
    if (msg && !msg.includes('%')) console.log(`[load] ${msg} @ ${(performance.now() / 1000).toFixed(2)}s`);
    return new Promise(r => setTimeout(r, 0));
  }

  debugStart() {
    this.ui.screen('title', false);
    this.ui.fade(false, 'fast');
    this.ui.showHud(true);
    this.started = true;
    const x = parseFloat(params.get('x') ?? '0'), z = parseFloat(params.get('z') ?? '128'), yaw = parseFloat(params.get('yaw') ?? '0');
    this.story.begin(params.get('name') || 'Alice Marlow');
    this.player.teleport(x, z, yaw);
    this.player.pitch = parseFloat(params.get('pitch') ?? '0');
    if (params.get('act') === '3') { this.story.act = 2; this.story.strikeEleven(); }
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05) * this.timeScale;
    this.frameMs = this.frameMs * 0.9 + (now - this.lastTime) * 0.1; this.frames++;
    this.lastTime = now;
    const active = this.started && !this.paused && (this.input.locked || this.debug) && this.ui.open !== 'intro';
    if (active) this.time += dt;
    const t = this.time;
    const p = this.player;

    if (active) {
      if (this.ui.open) { this.input.consumeMouse(); } else p.update(dt);
      // deep water blocks the way
      if (terrainHeight(p.pos.x, p.pos.z) < WATER_LEVEL - 0.35 && !p.inside) {
        p.pos.x -= p.vel.x * dt * 2; p.pos.z -= p.vel.z * dt * 2; p.vel.multiplyScalar(0.1);
        if (!this.waterWarned) { this.waterWarned = true; this.ui.say('The water is black and a good deal deeper than it looks.', 3.5); setTimeout(() => { this.waterWarned = false; }, 8000); }
      }
      this.story.update(dt);
      this.entities.update(dt, t);
      this.interact.update();
    }
    this.ui.update(dt);

    // lantern flicker and swing
    const fl = 0.85 + 0.15 * Math.sin(t * 17.3) * Math.sin(t * 5.1) + 0.06 * Math.sin(t * 43.1) - this.lampFlicker * Math.random() * 0.7;
    this.lanternLight.intensity = 9 * Math.max(0.1, fl) * (1 - this.dawn * 0);
    this.flame.scale.set(0.9 + 0.2 * fl, 1.8 * (0.9 + 0.2 * fl), 0.9 + 0.2 * fl);
    const sw = p.lanternSwing;
    this.lantern.rotation.set(sw.y * 0.5 + Math.sin(t * 2.1) * 0.03, 0, -sw.x * 0.5 + Math.sin(t * 1.7) * 0.03);
    this.lantern.position.set(0.34 + sw.x * 0.06, -0.30 + Math.abs(Math.sin(p.bobPhase)) * 0.012 * p.bobAmt, -0.72 + sw.y * 0.06);
    this.lampFlicker = Math.max(0, this.lampFlicker - dt * 0.7);
    this.pulse = Math.max(0, this.pulse - dt * 3);

    // bell rope
    if (this.world.bellRope && this.world.bellRope.pull) {
      const br = this.world.bellRope; br.pull = Math.max(0, br.pull - dt * 1.2);
      const k = Math.sin(br.pull * Math.PI); br.sally.position.y = 1.7 - k * 0.7; br.rope.position.y = 4.5 - k * 0.7;
    }

    // moon shadows follow the player
    const md = this.moon.position.clone().sub(this.moon.target.position).normalize();
    this.moon.target.position.set(Math.round(p.pos.x / 4) * 4, 0, Math.round(p.pos.z / 4) * 4);
    this.moon.position.copy(this.moon.target.position).addScaledVector(md, 120);

    // dawn (the good ending)
    if (this.dawn) {
      this.dawnT = Math.min(1, this.dawnT + dt / 26);
      const k = this.dawnT;
      this.sky.setDawn(k);
      this.scene.fog.density = 0.016 - 0.011 * k;
      this.fogColor.copy(this.fogNight).lerp(this.fogDawn, k);
      this.moon.color.copy(this.moonColorNight).lerp(this.moonColorDawn, k); this.moon.intensity = 1.7 + 2.5 * k;
      this.hemi.intensity = 0.75 + 2.2 * k;
      this.fx.wisps.intensity = Math.max(0, 1 - k * 3);
      this.fx.bats.active = k < 0.3;
    }

    this.sky.update(t);
    this.world.update(dt, t);
    this.fx.mist.update(dt, t, this.camera.position);
    this.fx.leaves.update(dt, t, this.camera.position);
    this.fx.wisps.update(dt, t);
    this.fx.smoke.update(dt, t);
    this.fx.bats.update(dt, t);
    this.lightPool.update(dt, t, this.world.lightSources, this.camera.position, this.lampFlicker);
    // audio
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.audio.setListener(this.camera.position, fwd, this.camera.up);
    const marshNear = Math.max(0, 1 - Math.hypot(p.pos.x - 22, p.pos.z + 114) / 60) * (this.story.act >= 3 ? 0.7 : 0.25);
    this.audio.update(dt, this.fear, marshNear);
    this.renderer.info.reset();
    this.post.render(t, this.fear, this.dark, this.pulse);
    this.stats = { calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles };
    this.input.endFrame();
  }
}

const game = new Game();
window.__game = game;
game.init().catch(e => { console.error(e); const d = document.getElementById('err'); d.style.display = 'block'; d.textContent += e.stack || e; });
