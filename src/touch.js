// Touch controls: a floating thumb-stick to walk, drag anywhere on the right to look,
// and a small set of buttons. Feeds the ordinary Input object so the rest of the game
// does not know or care whether it is being played with a mouse or a thumb.

const STICK_RADIUS = 56;   // px of travel for full tilt
const RUN_AT = 0.86;       // stick tilt beyond this starts running
const TAP_MS = 1200;       // deliberately loose: drift, not duration, tells a tap from a look-drag,
                           // and on a stuttering device a real tap can straddle several long frames
const TAP_SLOP = 14;       // px of drift allowed before it counts as looking around, not tapping

export class TouchControls {
  constructor(game, input) {
    this.g = game;
    this.input = input;
    this.enabled = false;
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.look = { id: null, lx: 0, ly: 0, t0: 0, moved: 0 };
    this.build();
  }

  build() {
    const root = document.createElement('div');
    root.id = 'touch';
    root.innerHTML = `
      <div id="touchLook"></div>
      <div id="touchMove"></div>
      <div id="touchStick"><div class="ring"></div><div class="knob"></div></div>
      <div id="touchBtns">
        <button id="btnInteract" class="tbtn wide" aria-label="Examine">EXAMINE</button>
        <div class="row">
          <button id="btnJournal" class="tbtn" aria-label="Journal">JOURNAL</button>
          <button id="btnPause" class="tbtn" aria-label="Pause">❚❚</button>
        </div>
      </div>`;
    document.getElementById('app').appendChild(root);
    this.root = root;
    this.stickEl = root.querySelector('#touchStick');
    this.knobEl = root.querySelector('.knob');
    this.btnInteract = root.querySelector('#btnInteract');

    const moveZone = root.querySelector('#touchMove');
    const lookZone = root.querySelector('#touchLook');

    // ---- movement stick ----
    moveZone.addEventListener('pointerdown', (e) => {
      if (this.stick.id !== null) return;
      this.stick.id = e.pointerId;
      try { moveZone.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety, not a requirement */ }
      this.stick.ox = e.clientX; this.stick.oy = e.clientY;
      this.stick.x = 0; this.stick.y = 0;
      this.stickEl.style.left = e.clientX + 'px';
      this.stickEl.style.top = e.clientY + 'px';
      this.stickEl.classList.add('on');
      e.preventDefault();
    });
    moveZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stick.id) return;
      let dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy;
      const d = Math.hypot(dx, dy);
      if (d > STICK_RADIUS) { dx *= STICK_RADIUS / d; dy *= STICK_RADIUS / d; }
      this.stick.x = dx / STICK_RADIUS; this.stick.y = dy / STICK_RADIUS;
      this.knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      e.preventDefault();
    });
    const endStick = (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.id = null; this.stick.x = 0; this.stick.y = 0;
      this.stickEl.classList.remove('on');
      this.knobEl.style.transform = 'translate(-50%, -50%)';
    };
    moveZone.addEventListener('pointerup', endStick);
    moveZone.addEventListener('pointercancel', endStick);

    // ---- look drag (and tap to examine) ----
    lookZone.addEventListener('pointerdown', (e) => {
      if (this.look.id !== null) return;
      this.look.id = e.pointerId;
      try { lookZone.setPointerCapture(e.pointerId); } catch (err) { /* ditto */ }
      this.look.lx = e.clientX; this.look.ly = e.clientY;
      this.look.t0 = performance.now(); this.look.moved = 0;
      e.preventDefault();
    });
    lookZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.look.id) return;
      const dx = e.clientX - this.look.lx, dy = e.clientY - this.look.ly;
      this.look.lx = e.clientX; this.look.ly = e.clientY;
      this.look.moved += Math.abs(dx) + Math.abs(dy);
      // touch drags cover fewer pixels than a mouse sweep, so they are scaled up
      this.input.addLook(dx * 1.75, dy * 1.75);
      e.preventDefault();
    });
    const endLook = (e) => {
      if (e.pointerId !== this.look.id) return;
      const dt = performance.now() - this.look.t0;
      const quick = dt < TAP_MS && this.look.moved < TAP_SLOP;
      this.lastTap = { dt: Math.round(dt), moved: Math.round(this.look.moved), quick, enabled: this.enabled };
      this.look.id = null;
      if (quick && this.enabled) this.input.press('KeyE');
    };
    lookZone.addEventListener('pointerup', endLook);
    lookZone.addEventListener('pointercancel', endLook);
    lookZone.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    moveZone.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });

    // ---- buttons ----
    const tap = (el, fn) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); });
      el.addEventListener('pointerup', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('down'); fn(); });
      el.addEventListener('pointercancel', () => el.classList.remove('down'));
      el.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
      el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
    };
    tap(this.btnInteract, () => this.input.press('KeyE'));
    tap(root.querySelector('#btnJournal'), () => this.input.press('KeyJ'));
    tap(root.querySelector('#btnPause'), () => this.g.pauseFromTouch());
  }

  enable() {
    this.enabled = true;
    this.input.touchMode = true;
    document.body.classList.add('touch');
    this.root.classList.add('on');
  }

  // The overlay is hidden whenever a screen (note, journal, pause) is open.
  setVisible(v) { this.root.classList.toggle('hidden', !v); }

  hot(v) { this.btnInteract.classList.toggle('hot', !!v); }

  update() {
    if (!this.enabled) return;
    const s = this.stick;
    const mag = Math.hypot(s.x, s.y);
    if (this.stick.id !== null && mag > 0.12) {
      this.input.axes.x = s.x; this.input.axes.y = s.y; this.input.axes.active = true;
      this.input.setVirtual('ShiftLeft', mag > RUN_AT);
    } else {
      this.input.axes.x = 0; this.input.axes.y = 0; this.input.axes.active = false;
      this.input.setVirtual('ShiftLeft', false);
    }
  }
}

// Coarse pointer with no hover is the reliable signal; iPadOS Safari also reports as
// a Mac, so a touch-capable "desktop" counts too.
export function isTouchDevice() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia && window.matchMedia('(hover: none)').matches;
  const points = navigator.maxTouchPoints > 0;
  return points && (coarse || noHover);
}

export function isPhone() {
  const s = window.screen || {};
  const short = Math.min(s.width || 9999, s.height || 9999, window.innerWidth || 9999, window.innerHeight || 9999);
  return isTouchDevice() && short <= 520;
}
