// Keyboard + pointer-lock mouse input, with a parallel path for touch controls
// (virtual keys, analog movement axes and look deltas) so the game can be played
// with a thumb without the rest of the code knowing the difference.
export class Input {
  constructor(dom) {
    this.dom = dom;
    this.keys = new Set();
    this.virtual = new Set();          // keys held by on-screen controls
    this.axes = { x: 0, y: 0, active: false };  // analog stick, -1..1
    this.dx = 0; this.dy = 0;
    this.locked = false;
    this.touchMode = false;
    this.onLockChange = null;
    this.onKeyDown = null;
    this.pressed = new Set(); // keys pressed this frame
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      const k = e.code;
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if (this.onKeyDown) this.onKeyDown(k, e);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.virtual.clear(); });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX || 0; this.dy += e.movementY || 0;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) this.keys.clear();
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }
  lock() {
    if (this.locked) return;
    try {
      const p = this.dom.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => this._plainLock());
    } catch (e) { this._plainLock(); }
  }
  _plainLock() {
    try { const p = this.dom.requestPointerLock(); if (p && p.catch) p.catch(() => { /* refused: the pause screen offers a click to retry */ }); } catch (e) { /* ignore */ }
  }
  unlock() { if (this.locked) document.exitPointerLock(); }

  // The game is being driven if the mouse is captured or we are on touch controls.
  get active() { return this.locked || this.touchMode; }

  down(...codes) { for (const c of codes) if (this.keys.has(c) || this.virtual.has(c)) return true; return false; }
  setVirtual(code, held) { if (held) this.virtual.add(code); else this.virtual.delete(code); }
  // A single synthetic tap: seen by per-frame checks and by the keydown handlers.
  press(code) { this.pressed.add(code); if (this.onKeyDown) this.onKeyDown(code, { preventDefault() {} }); }
  addLook(dx, dy) { this.dx += dx; this.dy += dy; }
  consumeMouse() { const r = [this.dx, this.dy]; this.dx = 0; this.dy = 0; return r; }
  endFrame() { this.pressed.clear(); }
}
