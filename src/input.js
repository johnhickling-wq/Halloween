// Keyboard + pointer-lock mouse input.
export class Input {
  constructor(dom) {
    this.dom = dom;
    this.keys = new Set();
    this.dx = 0; this.dy = 0;
    this.locked = false;
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
    window.addEventListener('blur', () => this.keys.clear());
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
  down(...codes) { for (const c of codes) if (this.keys.has(c)) return true; return false; }
  consumeMouse() { const r = [this.dx, this.dy]; this.dx = 0; this.dy = 0; return r; }
  endFrame() { this.pressed.clear(); }
}
