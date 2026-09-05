// Procedural Web Audio soundscape. No samples: everything is synthesised.
export class AudioSys {
  constructor() { this.ctx = null; this.ready = false; this.fear = 0; this.listenerPos = { x: 0, y: 0, z: 0 }; }
  start() {
    if (this.ready) return;
    const C = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = C;
    this.master = C.createGain(); this.master.gain.value = 0.9; this.master.connect(C.destination);
    this.sfx = C.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.master);
    this.amb = C.createGain(); this.amb.gain.value = 1; this.amb.connect(this.master);
    // noise buffer
    const len = C.sampleRate * 2;
    const buf = C.createBuffer(1, len, C.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; }
    this.noiseBuf = buf;
    const wbuf = C.createBuffer(1, len, C.sampleRate); const wd = wbuf.getChannelData(0); for (let i = 0; i < len; i++) wd[i] = Math.random() * 2 - 1;
    this.whiteBuf = wbuf;
    this.startWind(); this.startDrone(); this.startHeart(); this.startWhispers();
    this.nextOwl = 8 + Math.random() * 20;
    this.nextCrow = 30 + Math.random() * 30;
    this.ready = true;
  }
  noise(white = false) { const s = this.ctx.createBufferSource(); s.buffer = white ? this.whiteBuf : this.noiseBuf; s.loop = true; return s; }
  // ---- positional helper: returns a node to connect a source into
  spatial(pos, ref = 6, max = 160) {
    const C = this.ctx;
    const p = C.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = ref; p.maxDistance = max; p.rolloffFactor = 1.1;
    if (pos) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; }
    p.connect(this.sfx);
    return p;
  }
  setListener(pos, fwd, up) {
    if (!this.ready) return;
    const L = this.ctx.listener, t = this.ctx.currentTime;
    if (L.positionX) { L.positionX.setTargetAtTime(pos.x, t, 0.05); L.positionY.setTargetAtTime(pos.y, t, 0.05); L.positionZ.setTargetAtTime(pos.z, t, 0.05);
      L.forwardX.setTargetAtTime(fwd.x, t, 0.05); L.forwardY.setTargetAtTime(fwd.y, t, 0.05); L.forwardZ.setTargetAtTime(fwd.z, t, 0.05);
      L.upX.setTargetAtTime(up.x, t, 0.05); L.upY.setTargetAtTime(up.y, t, 0.05); L.upZ.setTargetAtTime(up.z, t, 0.05); }
    else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z); }
    this.listenerPos = pos;
  }
  env(gain, t0, a, peak, dur, tail = 0.05) { const g = gain.gain; g.cancelScheduledValues(t0); g.setValueAtTime(0.0001, t0); g.exponentialRampToValueAtTime(peak, t0 + a); g.exponentialRampToValueAtTime(0.0001, t0 + a + dur); return t0 + a + dur + tail; }

  // ---------------- ambient layers ----------------
  startWind() {
    const C = this.ctx;
    this.windGain = C.createGain(); this.windGain.gain.value = 0.55; this.windGain.connect(this.amb);
    for (let i = 0; i < 2; i++) {
      const src = this.noise(); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 300 + i * 250; bp.Q.value = 0.6;
      const g = C.createGain(); g.gain.value = 0.35;
      const pan = C.createStereoPanner();
      const lfo = C.createOscillator(); lfo.frequency.value = 0.07 + i * 0.05; const lfoG = C.createGain(); lfoG.gain.value = 180; lfo.connect(lfoG); lfoG.connect(bp.frequency); lfo.start();
      const lfo2 = C.createOscillator(); lfo2.frequency.value = 0.11 + i * 0.03; const lfo2G = C.createGain(); lfo2G.gain.value = 0.22; lfo2.connect(lfo2G); lfo2G.connect(g.gain); lfo2.start();
      const lfo3 = C.createOscillator(); lfo3.frequency.value = 0.05 + i * 0.02; const lfo3G = C.createGain(); lfo3G.gain.value = 0.8; lfo3.connect(lfo3G); lfo3G.connect(pan.pan); lfo3.start();
      src.connect(bp); bp.connect(g); g.connect(pan); pan.connect(this.windGain); src.start();
    }
  }
  startDrone() {
    const C = this.ctx;
    this.droneGain = C.createGain(); this.droneGain.gain.value = 0.05; this.droneGain.connect(this.amb);
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lp.connect(this.droneGain);
    [55, 55.6, 82.4, 110.7].forEach((f, i) => { const o = C.createOscillator(); o.type = i < 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; const g = C.createGain(); g.gain.value = i < 2 ? 0.5 : 0.25; o.connect(g); g.connect(lp); o.start(); });
    // fear layer: high dissonant sines with tremolo
    this.fearGain = C.createGain(); this.fearGain.gain.value = 0; this.fearGain.connect(this.amb);
    [660, 698, 1320].forEach((f, i) => { const o = C.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = C.createGain(); g.gain.value = 0.05 / (i + 1); const trem = C.createOscillator(); trem.frequency.value = 4 + i * 1.7; const tg = C.createGain(); tg.gain.value = 0.03; trem.connect(tg); tg.connect(g.gain); trem.start(); o.connect(g); g.connect(this.fearGain); o.start(); });
  }
  startHeart() { this.heartTimer = 0; this.heartGain = this.ctx.createGain(); this.heartGain.gain.value = 1; this.heartGain.connect(this.sfx); }
  thump(vol, pitch = 1) {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime;
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70 * pitch, t); o.frequency.exponentialRampToValueAtTime(38 * pitch, t + 0.16);
    const g = C.createGain(); this.env(g, t, 0.012, vol, 0.17);
    o.connect(g); g.connect(this.heartGain); o.start(t); o.stop(t + 0.3);
  }
  startWhispers() {
    const C = this.ctx;
    this.whisperGain = C.createGain(); this.whisperGain.gain.value = 0; this.whisperGain.connect(this.amb);
    this.whisperTarget = 0;
    for (let i = 0; i < 3; i++) {
      const src = this.noise(true);
      const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + i * 700; bp.Q.value = 6;
      const g = C.createGain(); g.gain.value = 0;
      const pan = C.createStereoPanner(); pan.pan.value = (i - 1) * 0.8;
      src.connect(bp); bp.connect(g); g.connect(pan); pan.connect(this.whisperGain); src.start();
      // gate: random syllables
      const gate = () => { if (!this.ready) return; const t = C.currentTime; const dur = 0.05 + Math.random() * 0.18; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.5, t + dur * 0.4); g.gain.linearRampToValueAtTime(0, t + dur); bp.frequency.setValueAtTime(600 + Math.random() * 2200, t); setTimeout(gate, (dur + 0.03 + Math.random() * 0.35) * 1000); };
      setTimeout(gate, i * 200);
    }
  }
  setWhispers(level) { this.whisperTarget = Math.max(0, Math.min(1, level)); }
  whisperBurst() { if (!this.ready) return; this.whisperBurstT = 4; }
  stopWhispers() { this.whisperTarget = 0; this.whisperBurstT = 0; this.whispersOff = true; }

  update(dt, fear, whisperNear) {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime;
    this.fear = fear;
    this.fearGain.gain.setTargetAtTime(fear * 0.5, t, 0.5);
    this.droneGain.gain.setTargetAtTime(0.05 + fear * 0.04, t, 0.5);
    // heartbeat
    if (fear > 0.08) {
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) { const bpm = 62 + fear * 70; this.heartTimer = 60 / bpm; this.thump(0.25 * fear); setTimeout(() => this.thump(0.16 * fear, 0.9), 150); this.onBeat && this.onBeat(); }
    }
    // whispers
    if (this.whisperBurstT > 0) this.whisperBurstT -= dt;
    const w = this.whispersOff ? 0 : Math.max(this.whisperTarget, whisperNear || 0, this.whisperBurstT > 0 ? 0.8 : 0);
    this.whisperGain.gain.setTargetAtTime(w * 0.22, t, 0.6);
    // owls & distant crows
    this.nextOwl -= dt; if (this.nextOwl <= 0) { this.nextOwl = 18 + Math.random() * 35; if (!this.whispersOff) this.owl(); }
    this.nextCrow -= dt; if (this.nextCrow <= 0) { this.nextCrow = 25 + Math.random() * 40; this.crowCaw({ x: this.listenerPos.x + (Math.random() - 0.5) * 80, y: 12, z: this.listenerPos.z + (Math.random() - 0.5) * 80 }, 0.35); }
  }

  // ---------------- one-shots ----------------
  owl() {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime;
    const pan = C.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(this.sfx);
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(pan);
    const hoot = (t0, f, dur, vol) => { const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t0); o.frequency.linearRampToValueAtTime(f * 0.92, t0 + dur); const g = C.createGain(); this.env(g, t0, 0.08, vol, dur); o.connect(g); g.connect(lp); o.start(t0); o.stop(t0 + dur + 0.2); };
    const v = 0.05 + Math.random() * 0.04;
    hoot(t, 390, 0.25, v); hoot(t + 0.35, 380, 0.22, v * 0.9); hoot(t + 0.75, 360, 0.7, v);
  }
  crowCaw(pos, vol = 0.6, n = 0) {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime;
    const out = this.spatial(pos, 8, 140);
    const count = n || (2 + Math.floor(Math.random() * 3));
    for (let i = 0; i < count; i++) {
      const t0 = t + i * (0.28 + Math.random() * 0.1);
      const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(720 + Math.random() * 80, t0); o.frequency.exponentialRampToValueAtTime(420, t0 + 0.18);
      const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.2;
      const g = C.createGain(); this.env(g, t0, 0.02, vol * 0.5, 0.17);
      o.connect(bp); bp.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.3);
      const nz = this.noise(true); const ng = C.createGain(); this.env(ng, t0, 0.01, vol * 0.25, 0.14); const nb = C.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 2200; nb.Q.value = 2; nz.connect(nb); nb.connect(ng); ng.connect(out); nz.start(t0); nz.stop(t0 + 0.25);
    }
  }
  bell(pos, vol = 1) {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime;
    const out = this.spatial(pos, 30, 400); out.rolloffFactor = 0.6;
    const f = 246; // roughly a B tenor bell
    const partials = [[0.5, 0.6, 9], [1, 1, 7], [1.183, 0.55, 5.5], [1.506, 0.35, 4.5], [2.0, 0.5, 3.5], [2.514, 0.22, 2.5], [2.662, 0.2, 2.2], [3.011, 0.15, 1.8], [4.166, 0.08, 1.2]];
    for (const [r, a, dec] of partials) {
      const o = C.createOscillator(); o.type = 'sine'; o.frequency.value = f * r * (1 + (Math.random() - 0.5) * 0.002);
      const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a * 0.32 * vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.1);
    }
    // clapper strike
    const nz = this.noise(true); const ng = C.createGain(); this.env(ng, t, 0.003, 0.35 * vol, 0.06); const hp = C.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800; nz.connect(hp); hp.connect(ng); ng.connect(out); nz.start(t); nz.stop(t + 0.2);
  }
  footstep(surface, running) {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime;
    const vol = (running ? 0.5 : 0.32) * (0.85 + Math.random() * 0.3);
    const nz = this.noise(true); const g = C.createGain(); const f = C.createBiquadFilter();
    let dur = 0.09, freq = 900, type = 'lowpass', q = 0.8, v = vol;
    if (surface === 'stone') { type = 'bandpass'; freq = 1700 + Math.random() * 500; q = 1.3; dur = 0.07; v = vol * 0.9; }
    else if (surface === 'mud') { freq = 480; dur = 0.16; v = vol * 0.8; }
    else if (surface === 'wood') { freq = 700; dur = 0.11; v = vol * 1.1; }
    else if (surface === 'water') { type = 'highpass'; freq = 600; dur = 0.22; v = vol * 1.0; }
    else { freq = 750; dur = 0.1; v = vol * 0.6; }
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    this.env(g, t, 0.006, v, dur);
    nz.connect(f); f.connect(g); g.connect(this.sfx); nz.start(t); nz.stop(t + dur + 0.1);
    if (surface === 'wood') { const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.1); const og = C.createGain(); this.env(og, t, 0.005, vol * 0.5, 0.1); o.connect(og); og.connect(this.sfx); o.start(t); o.stop(t + 0.2); }
    if (surface === 'stone' && running) { const o = C.createOscillator(); o.type = 'triangle'; o.frequency.value = 2400; const og = C.createGain(); this.env(og, t, 0.002, vol * 0.08, 0.03); o.connect(og); og.connect(this.sfx); o.start(t); o.stop(t + 0.05); }
  }
  door(open, pos) {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime; const out = this.spatial(pos, 3, 60);
    const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(open ? 160 : 210, t); o.frequency.exponentialRampToValueAtTime(open ? 240 : 140, t + 0.7);
    const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 5;
    const g = C.createGain(); this.env(g, t, 0.15, 0.12, 0.55);
    o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t + 1);
    // latch
    const t1 = t + (open ? 0.05 : 0.75);
    const nz = this.noise(true); const ng = C.createGain(); this.env(ng, t1, 0.003, 0.3, 0.05); const hp = C.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2500; nz.connect(hp); hp.connect(ng); ng.connect(out); nz.start(t1); nz.stop(t1 + 0.15);
    if (!open) { const o2 = C.createOscillator(); o2.type = 'sine'; o2.frequency.setValueAtTime(90, t1); o2.frequency.exponentialRampToValueAtTime(50, t1 + 0.12); const g2 = C.createGain(); this.env(g2, t1, 0.004, 0.35, 0.12); o2.connect(g2); g2.connect(out); o2.start(t1); o2.stop(t1 + 0.25); }
  }
  doorLocked(pos) {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime; const out = this.spatial(pos, 3, 60);
    for (let i = 0; i < 3; i++) { const t0 = t + i * 0.09; const nz = this.noise(true); const g = C.createGain(); this.env(g, t0, 0.003, 0.25, 0.04); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800 + i * 300; bp.Q.value = 3; nz.connect(bp); bp.connect(g); g.connect(out); nz.start(t0); nz.stop(t0 + 0.1); }
  }
  doorSlamFar() {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime;
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3); const g = C.createGain(); this.env(g, t, 0.005, 0.35, 0.35);
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; o.connect(lp); lp.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.6);
    const nz = this.noise(true); const ng = C.createGain(); this.env(ng, t, 0.005, 0.12, 0.2); const nl = C.createBiquadFilter(); nl.type = 'lowpass'; nl.frequency.value = 500; nz.connect(nl); nl.connect(ng); ng.connect(this.sfx); nz.start(t); nz.stop(t + 0.4);
  }
  paper() {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime;
    for (let i = 0; i < 2; i++) { const t0 = t + i * 0.13; const nz = this.noise(true); const g = C.createGain(); this.env(g, t0, 0.02, 0.09, 0.12); const hp = C.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500; nz.connect(hp); hp.connect(g); g.connect(this.sfx); nz.start(t0); nz.stop(t0 + 0.3); }
  }
  stingerLow() {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime;
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(150, t); lp.frequency.exponentialRampToValueAtTime(1600, t + 1.4); lp.frequency.exponentialRampToValueAtTime(120, t + 3.2); lp.connect(this.sfx);
    [55, 58.3, 110, 116.5].forEach((f, i) => { const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const g = C.createGain(); this.env(g, t, 0.9, 0.12 / (1 + i * 0.5), 2.2); o.connect(g); g.connect(lp); o.start(t); o.stop(t + 3.5); });
    const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(880, t + 0.2); o.frequency.linearRampToValueAtTime(1240, t + 1.2); const g = C.createGain(); this.env(g, t + 0.2, 0.4, 0.035, 0.7); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 4; o.connect(bp); bp.connect(g); g.connect(this.sfx); o.start(t + 0.2); o.stop(t + 1.6);
  }
  exhale() {
    if (!this.ready) return;
    const C = this.ctx, t = C.currentTime;
    const nz = this.noise(); const g = C.createGain(); this.env(g, t, 1.2, 0.5, 3.5); const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(90, t + 4.5); nz.connect(lp); lp.connect(g); g.connect(this.sfx); nz.start(t); nz.stop(t + 5);
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(48, t); o.frequency.exponentialRampToValueAtTime(28, t + 4); const og = C.createGain(); this.env(og, t, 1.0, 0.4, 3.5); o.connect(og); og.connect(this.sfx); o.start(t); o.stop(t + 5);
  }
  birds() {
    if (!this.ready) return;
    const C = this.ctx;
    const chirp = () => {
      if (!this.ready || this.stopped) return;
      const t = C.currentTime; const pan = C.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(this.sfx);
      const n = 2 + Math.floor(Math.random() * 4); const base = 2200 + Math.random() * 1800;
      for (let i = 0; i < n; i++) { const t0 = t + i * (0.09 + Math.random() * 0.06); const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), t0); o.frequency.exponentialRampToValueAtTime(base * (1.1 + Math.random() * 0.3), t0 + 0.05); const g = C.createGain(); this.env(g, t0, 0.01, 0.05, 0.06); o.connect(g); g.connect(pan); o.start(t0); o.stop(t0 + 0.15); }
      setTimeout(chirp, 400 + Math.random() * 1800);
    };
    chirp(); setTimeout(chirp, 700); setTimeout(chirp, 1500);
    this.windGain.gain.setTargetAtTime(0.25, C.currentTime, 6);
  }
  fadeOut(secs) { if (!this.ready) return; this.master.gain.setTargetAtTime(0, this.ctx.currentTime, secs / 3); this.stopped = true; }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
}
