// Procedural canvas textures. Everything in the game is drawn at load time; no image files.
import * as THREE from 'three';
import { RNG, fbm2 } from './noise.js';

function canvas(size, h = size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = h;
  return c;
}

export function toTexture(c, { repeat = true, srgb = true, aniso = 8, filter = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  else { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; }
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (!filter) { t.magFilter = THREE.NearestFilter; }
  t.needsUpdate = true;
  return t;
}

// ---- pixel helpers -------------------------------------------------------
function grain(ctx, w, h, amount, rng, mono = true) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (mono) {
      const n = (rng.next() - 0.5) * amount * 255;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    } else {
      d[i] += (rng.next() - 0.5) * amount * 255;
      d[i + 1] += (rng.next() - 0.5) * amount * 255;
      d[i + 2] += (rng.next() - 0.5) * amount * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function mottle(ctx, w, h, count, rMin, rMax, colors, alpha, rng) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const x = rng.float(0, w), y = rng.float(0, h), r = rng.float(rMin, rMax);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = rng.pick(colors);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

// Draw a wrapped shape (tiles across edges) by drawing at 9 offsets
function wrapped(ctx, w, h, x, y, margin, fn) {
  const xs = [0], ys = [0];
  if (x < margin) xs.push(1); else if (x > w - margin) xs.push(-1);
  if (y < margin) ys.push(1); else if (y > h - margin) ys.push(-1);
  for (const dx of xs) for (const dy of ys) {
    if (dx === 0 && dy === 0) { fn(); continue; }
    ctx.save(); ctx.translate(dx * w, dy * h); fn(); ctx.restore();
  }
}

function rgb(r, g, b) { return `rgb(${r | 0},${g | 0},${b | 0})`; }
function rgba(r, g, b, a) { return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }

// ---- surfaces ------------------------------------------------------------
export function grassTexture(size = 512) {
  const rng = new RNG(11);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#2e3a22'; ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, size, 90, 30, 140, ['#26311c', '#3a4527', '#20291a', '#4a4f2a', '#2b3a26'], 0.5, rng);
  // blades
  for (let i = 0; i < 6000; i++) {
    const x = rng.float(0, size), y = rng.float(0, size), l = rng.float(3, 9);
    const dx = rng.float(-2, 2);
    const v = rng.float(0.6, 1.15);
    ctx.strokeStyle = rgba(46 * v + 10, 66 * v, 30 * v, 0.55);
    ctx.lineWidth = rng.float(0.6, 1.4);
    wrapped(ctx, size, size, x, y, 12, () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y - l); ctx.stroke(); });
  }
  // dead leaves
  for (let i = 0; i < 160; i++) {
    const x = rng.float(0, size), y = rng.float(0, size);
    ctx.fillStyle = rgba(rng.float(90, 140), rng.float(50, 80), rng.float(20, 35), 0.55);
    ctx.beginPath(); ctx.ellipse(x, y, rng.float(2, 5), rng.float(1.2, 2.5), rng.float(0, 3.14), 0, 6.283); ctx.fill();
  }
  grain(ctx, size, size, 0.12, rng);
  return toTexture(c);
}

export function mudTexture(size = 512) {
  const rng = new RNG(23);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#4a3b2b'; ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, size, 120, 20, 120, ['#3a2e21', '#5a4a36', '#2f2620', '#6a5a44', '#40352a'], 0.55, rng);
  // puddles (darker, smoother)
  mottle(ctx, size, size, 14, 30, 90, ['#22201f', '#1d1c1f'], 0.6, rng);
  // pebbles
  for (let i = 0; i < 700; i++) {
    const x = rng.float(0, size), y = rng.float(0, size), r = rng.float(1, 4);
    const v = rng.float(0.7, 1.3);
    ctx.fillStyle = rgb(110 * v, 100 * v, 90 * v);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * rng.float(0.6, 1), rng.float(0, 3), 0, 6.283); ctx.fill();
    ctx.fillStyle = rgba(0, 0, 0, 0.35);
    ctx.beginPath(); ctx.ellipse(x + r * 0.4, y + r * 0.5, r * 0.8, r * 0.5, 0, 0, 6.283); ctx.fill();
  }
  // cart ruts / grass tufts
  for (let i = 0; i < 300; i++) {
    const x = rng.float(0, size), y = rng.float(0, size);
    ctx.strokeStyle = rgba(60, 75, 40, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng.float(-3, 3), y - rng.float(3, 8)); ctx.stroke();
  }
  grain(ctx, size, size, 0.14, rng);
  return toTexture(c);
}

export function cobbleTexture(size = 512) {
  const rng = new RNG(31);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#1b1a1c'; ctx.fillRect(0, 0, size, size);
  const cols = 9, rows = 11;
  const cw = size / cols, ch = size / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const off = (j % 2) * cw * 0.5;
    const x = i * cw + off + rng.float(-3, 3), y = j * ch + rng.float(-2, 2);
    const w = cw * rng.float(0.78, 0.9), h = ch * rng.float(0.74, 0.88);
    const v = rng.float(0.75, 1.25);
    const base = [95 * v, 92 * v, 96 * v];
    wrapped(ctx, size, size, x, y, 80, () => {
      const g = ctx.createRadialGradient(x + w * 0.35, y + h * 0.3, 2, x + w * 0.5, y + h * 0.5, Math.max(w, h) * 0.75);
      g.addColorStop(0, rgb(base[0] + 55, base[1] + 55, base[2] + 60));
      g.addColorStop(0.6, rgb(base[0], base[1], base[2]));
      g.addColorStop(1, rgb(base[0] * 0.45, base[1] * 0.45, base[2] * 0.5));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.35);
      ctx.fill();
    });
  }
  mottle(ctx, size, size, 40, 30, 120, ['#3a3f4a', '#2a2622', '#4a4a44'], 0.25, rng);
  // wet highlights
  mottle(ctx, size, size, 25, 10, 40, ['#8a95a8'], 0.18, rng);
  grain(ctx, size, size, 0.1, rng);
  return toTexture(c);
}

export function stoneWallTexture(size = 512, seed = 41, tint = [1, 1, 1]) {
  const rng = new RNG(seed);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#4a4740'; ctx.fillRect(0, 0, size, size);
  const rows = 9;
  const rh = size / rows;
  for (let j = 0; j < rows; j++) {
    let x = -rng.float(0, 40);
    const y = j * rh;
    while (x < size) {
      const w = rng.float(35, 95), h = rh * rng.float(0.82, 0.92);
      const v = rng.float(0.7, 1.25);
      const base = [128 * v * tint[0], 120 * v * tint[1], 104 * v * tint[2]];
      const xx = x, yy = y + rng.float(1, 4);
      wrapped(ctx, size, size, xx, yy, 110, () => {
        const g = ctx.createLinearGradient(xx, yy, xx, yy + h);
        g.addColorStop(0, rgb(base[0] + 30, base[1] + 30, base[2] + 28));
        g.addColorStop(1, rgb(base[0] * 0.72, base[1] * 0.72, base[2] * 0.72));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.roundRect(xx, yy, w, h, 4); ctx.fill();
        // bevel
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(xx + 2, yy + h - 2); ctx.lineTo(xx + 2, yy + 2); ctx.lineTo(xx + w - 2, yy + 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.moveTo(xx + w - 2, yy + 2); ctx.lineTo(xx + w - 2, yy + h - 2); ctx.lineTo(xx + 2, yy + h - 2); ctx.stroke();
      });
      x += w + rng.float(4, 9);
    }
  }
  mottle(ctx, size, size, 60, 20, 90, ['#6a7a5a', '#3a3a3a', '#8a8060', '#5a6a4a'], 0.22, rng); // lichen/moss & soot
  grain(ctx, size, size, 0.12, rng);
  return toTexture(c);
}

export function brickTexture(size = 512) {
  const rng = new RNG(53);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#5a5048'; ctx.fillRect(0, 0, size, size);
  const rows = 16, cols = 6;
  const bh = size / rows, bw = size / cols;
  for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
    const off = (j % 2) * bw * 0.5;
    const x = i * bw + off, y = j * bh;
    const v = rng.float(0.7, 1.2);
    const r = 128 * v, g = 62 * v, b = 45 * v;
    const grad = ctx.createLinearGradient(x, y, x, y + bh);
    grad.addColorStop(0, rgb(r + 20, g + 12, b + 8));
    grad.addColorStop(1, rgb(r * 0.8, g * 0.8, b * 0.8));
    ctx.fillStyle = grad;
    ctx.fillRect(x + 2, y + 2, bw - 5, bh - 5);
  }
  mottle(ctx, size, size, 70, 20, 90, ['#2a2220', '#4a3a30', '#7a6a50'], 0.25, rng);
  grain(ctx, size, size, 0.12, rng);
  return toTexture(c);
}

export function plasterTimberTexture(size = 512) {
  const rng = new RNG(67);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#c9bea6'; ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, size, 80, 30, 150, ['#b8ad93', '#d8cfb8', '#9e957f', '#a89c84'], 0.5, rng);
  // grime at the bottom
  const g = ctx.createLinearGradient(0, size * 0.6, 0, size);
  g.addColorStop(0, 'rgba(60,50,40,0)'); g.addColorStop(1, 'rgba(60,50,40,0.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  grain(ctx, size, size, 0.1, rng);
  // timber frame: one vertical beam at left, one horizontal at top, one diagonal brace
  const beam = (x, y, w, h) => {
    const bg = ctx.createLinearGradient(x, y, x + w, y + h);
    bg.addColorStop(0, '#2e2218'); bg.addColorStop(0.5, '#3d2e1f'); bg.addColorStop(1, '#241a12');
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    // grain
    ctx.strokeStyle = 'rgba(90,70,45,0.25)';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      if (w > h) { const yy = y + rng.float(2, h - 2); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy + rng.float(-2, 2)); }
      else { const xx = x + rng.float(2, w - 2); ctx.moveTo(xx, y); ctx.lineTo(xx + rng.float(-2, 2), y + h); }
      ctx.stroke();
    }
  };
  beam(0, 0, 34, size); beam(0, 0, size, 30); beam(size * 0.5 - 14, 0, 28, size);
  return toTexture(c);
}

export function woodTexture(size = 512, seed = 71, dark = false) {
  const rng = new RNG(seed);
  const c = canvas(size), ctx = c.getContext('2d');
  const base = dark ? [58, 42, 28] : [110, 82, 52];
  ctx.fillStyle = rgb(...base); ctx.fillRect(0, 0, size, size);
  const planks = 5, pw = size / planks;
  for (let i = 0; i < planks; i++) {
    const v = rng.float(0.8, 1.15);
    const g = ctx.createLinearGradient(i * pw, 0, (i + 1) * pw, 0);
    g.addColorStop(0, rgb(base[0] * v * 0.8, base[1] * v * 0.8, base[2] * v * 0.8));
    g.addColorStop(0.5, rgb(base[0] * v, base[1] * v, base[2] * v));
    g.addColorStop(1, rgb(base[0] * v * 0.75, base[1] * v * 0.75, base[2] * v * 0.75));
    ctx.fillStyle = g; ctx.fillRect(i * pw, 0, pw, size);
    // grain lines
    for (let k = 0; k < 40; k++) {
      const x = i * pw + rng.float(3, pw - 3);
      ctx.strokeStyle = rgba(0, 0, 0, rng.float(0.08, 0.3)); ctx.lineWidth = rng.float(0.5, 1.5);
      ctx.beginPath(); ctx.moveTo(x, 0);
      for (let y = 0; y <= size; y += 32) ctx.lineTo(x + Math.sin(y * 0.02 + k) * 3, y);
      ctx.stroke();
    }
    // plank edge
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(i * pw, 0, 3, size);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(i * pw + 3, 0, 2, size);
    // nails
    for (let k = 0; k < 3; k++) {
      const y = (k + 0.5) * size / 3 + rng.float(-10, 10);
      ctx.fillStyle = '#1a1512'; ctx.beginPath(); ctx.arc(i * pw + pw * 0.5, y, 3, 0, 6.283); ctx.fill();
    }
  }
  grain(ctx, size, size, 0.1, rng);
  return toTexture(c);
}

export function thatchTexture(size = 512) {
  const rng = new RNG(83);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#6b5530'; ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, size, 60, 30, 120, ['#4f3f22', '#8a7040', '#5e4a2a', '#3d3120'], 0.5, rng);
  for (let i = 0; i < 9000; i++) {
    const x = rng.float(0, size), y = rng.float(0, size), l = rng.float(6, 22);
    const v = rng.float(0.5, 1.3);
    ctx.strokeStyle = rgba(120 * v, 95 * v, 50 * v, 0.5); ctx.lineWidth = rng.float(0.6, 1.6);
    wrapped(ctx, size, size, x, y, 24, () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng.float(-1.5, 1.5), y + l); ctx.stroke(); });
  }
  // horizontal darker bands (courses)
  for (let j = 0; j < 4; j++) {
    const y = j * size / 4;
    const g = ctx.createLinearGradient(0, y, 0, y + size / 4);
    g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = g; ctx.fillRect(0, y, size, size / 4);
  }
  mottle(ctx, size, size, 30, 20, 60, ['#5a6a3a', '#2a2a1a'], 0.25, rng); // moss
  grain(ctx, size, size, 0.1, rng);
  return toTexture(c);
}

export function slateTexture(size = 512) {
  const rng = new RNG(97);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#1e222a'; ctx.fillRect(0, 0, size, size);
  const rows = 8, cols = 6;
  const th = size / rows, tw = size / cols;
  for (let j = rows; j >= -1; j--) for (let i = -1; i <= cols; i++) {
    const off = (j % 2) * tw * 0.5;
    const x = i * tw + off, y = j * th;
    const v = rng.float(0.75, 1.2);
    const g = ctx.createLinearGradient(x, y, x, y + th * 1.15);
    g.addColorStop(0, rgb(70 * v, 76 * v, 88 * v));
    g.addColorStop(0.85, rgb(48 * v, 52 * v, 62 * v));
    g.addColorStop(1, rgb(20, 22, 28));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x + 1, y, tw - 3, th * 1.15, [0, 0, 5, 5]); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + tw - 3, y, 2, th * 1.15);
  }
  mottle(ctx, size, size, 50, 20, 80, ['#6a7a5a', '#2a2a2a', '#7a8a9a'], 0.2, rng);
  grain(ctx, size, size, 0.1, rng);
  return toTexture(c);
}

export function barkTexture(size = 256) {
  const rng = new RNG(101);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3128'; ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, size, 40, 20, 80, ['#2a231c', '#4a4034', '#5a5548'], 0.5, rng);
  for (let i = 0; i < 600; i++) {
    const x = rng.float(0, size), y = rng.float(0, size), l = rng.float(10, 60);
    ctx.strokeStyle = rgba(10, 8, 6, rng.float(0.2, 0.7)); ctx.lineWidth = rng.float(0.8, 3);
    wrapped(ctx, size, size, x, y, 64, () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng.float(-3, 3), y + l); ctx.stroke(); });
  }
  for (let i = 0; i < 300; i++) {
    const x = rng.float(0, size), y = rng.float(0, size), l = rng.float(5, 30);
    ctx.strokeStyle = rgba(120, 110, 90, rng.float(0.1, 0.35)); ctx.lineWidth = 1;
    wrapped(ctx, size, size, x, y, 32, () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng.float(-2, 2), y + l); ctx.stroke(); });
  }
  grain(ctx, size, size, 0.1, rng);
  return toTexture(c);
}

export function ironTexture(size = 128) {
  const rng = new RNG(113);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#23252a'; ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, size, 30, 8, 40, ['#5a3a20', '#1a1a1e', '#3a3d44'], 0.5, rng);
  grain(ctx, size, size, 0.14, rng);
  return toTexture(c);
}

export function sackclothTexture(size = 256) {
  const rng = new RNG(131);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#6e5e42'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i += 3) {
    ctx.fillStyle = rgba(0, 0, 0, rng.float(0.1, 0.35)); ctx.fillRect(i, 0, 1, size); ctx.fillRect(0, i, size, 1);
  }
  mottle(ctx, size, size, 40, 20, 90, ['#3a3020', '#8a7a55', '#4a3a25'], 0.5, rng);
  grain(ctx, size, size, 0.12, rng);
  return toTexture(c);
}

export function clothTexture(size = 256) {
  const rng = new RNG(137);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#0d0b0c'; ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, size, 60, 10, 60, ['#1a1416', '#050405', '#221a1c'], 0.6, rng);
  for (let i = 0; i < 400; i++) {
    const x = rng.float(0, size), y = rng.float(0, size), l = rng.float(10, 80);
    ctx.strokeStyle = rgba(40, 30, 32, rng.float(0.2, 0.6)); ctx.lineWidth = rng.float(0.5, 2);
    wrapped(ctx, size, size, x, y, 84, () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng.float(-4, 4), y + l); ctx.stroke(); });
  }
  grain(ctx, size, size, 0.08, rng);
  return toTexture(c);
}

export function plasterInteriorTexture(size = 256) {
  const rng = new RNG(139);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#b9ab90'; ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, size, 50, 20, 100, ['#a89a7e', '#c8bca2', '#8f8266'], 0.5, rng);
  mottle(ctx, size, size, 12, 30, 90, ['#5a5040', '#6a5a48'], 0.25, rng); // damp
  grain(ctx, size, size, 0.08, rng);
  return toTexture(c);
}

export function floorboardsTexture(size = 512) { return woodTexture(size, 173, true); }

// ---- windows -------------------------------------------------------------
// returns { map, emissiveMap } for a window pane with frame; lit adds warm glow
export function windowTextures(lit, cols = 2, rows = 3, seed = 5) {
  const rng = new RNG(seed);
  const w = 256, h = 384;
  const c = canvas(w, h), ctx = c.getContext('2d');
  const e = canvas(w, h), ectx = e.getContext('2d');
  // frame
  ctx.fillStyle = '#2b2620'; ctx.fillRect(0, 0, w, h);
  ectx.fillStyle = '#000'; ectx.fillRect(0, 0, w, h);
  const m = 18; // frame margin
  const pw = (w - 2 * m) / cols, ph = (h - 2 * m) / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = m + i * pw + 5, y = m + j * ph + 5, ww = pw - 10, hh = ph - 10;
    // glass
    const g = ctx.createLinearGradient(x, y, x + ww, y + hh);
    g.addColorStop(0, '#1a2230'); g.addColorStop(0.5, '#0d1118'); g.addColorStop(1, '#232b38');
    ctx.fillStyle = g; ctx.fillRect(x, y, ww, hh);
    // reflection streak
    ctx.fillStyle = 'rgba(150,170,200,0.10)';
    ctx.beginPath(); ctx.moveTo(x, y + hh); ctx.lineTo(x + ww * 0.4, y); ctx.lineTo(x + ww * 0.6, y); ctx.lineTo(x + ww * 0.2, y + hh); ctx.fill();
    if (lit) {
      const eg = ectx.createRadialGradient(x + ww * 0.5, y + hh * 0.6, 2, x + ww * 0.5, y + hh * 0.5, Math.max(ww, hh));
      const flick = rng.float(0.8, 1);
      eg.addColorStop(0, rgb(255 * flick, 190 * flick, 110 * flick));
      eg.addColorStop(1, rgb(200 * flick, 110 * flick, 40 * flick));
      ectx.fillStyle = eg; ectx.fillRect(x, y, ww, hh);
      // curtain edge silhouette
      ectx.fillStyle = 'rgba(0,0,0,0.75)';
      if (i === 0) ectx.fillRect(x, y, ww * 0.22, hh);
      if (i === cols - 1) ectx.fillRect(x + ww * 0.78, y, ww * 0.22, hh);
      // sill objects
      if (j === rows - 1 && rng.chance(0.5)) { ectx.fillStyle = 'rgba(0,0,0,0.85)'; ectx.beginPath(); ectx.ellipse(x + ww * 0.5, y + hh * 0.85, ww * 0.18, hh * 0.15, 0, 0, 6.283); ectx.fill(); }
      ctx.fillStyle = 'rgba(255,190,110,0.35)'; ctx.fillRect(x, y, ww, hh);
    }
  }
  // mullions bevel
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2; ctx.strokeRect(m - 2, m - 2, w - 2 * m + 4, h - 2 * m + 4);
  // stone surround
  ctx.strokeStyle = '#6a6458'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
  return { map: toTexture(c, { repeat: false }), emissiveMap: toTexture(e, { repeat: false }) };
}

export function stainedGlassTextures() {
  const rng = new RNG(7);
  const w = 256, h = 512;
  const c = canvas(w, h), ctx = c.getContext('2d');
  const e = canvas(w, h), ectx = e.getContext('2d');
  ctx.fillStyle = '#1a1a1c'; ctx.fillRect(0, 0, w, h);
  ectx.fillStyle = '#000'; ectx.fillRect(0, 0, w, h);
  // gothic arch mask
  const arch = (cx) => { cx.beginPath(); cx.moveTo(20, h - 10); cx.lineTo(20, 130); cx.quadraticCurveTo(20, 20, w / 2, 20); cx.quadraticCurveTo(w - 20, 20, w - 20, 130); cx.lineTo(w - 20, h - 10); cx.closePath(); };
  const palette = ['#b3202a', '#1e4a9a', '#d9a11a', '#237a3a', '#7a2a8a', '#c85a1a', '#2a8aa0'];
  [ctx, ectx].forEach((cx, k) => {
    cx.save(); arch(cx); cx.clip();
    const cell = 26;
    for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) {
      const col = rng.pick(palette);
      cx.fillStyle = k === 0 ? col : col;
      cx.globalAlpha = k === 0 ? 0.55 : rng.float(0.5, 1);
      cx.fillRect(x, y, cell, cell);
    }
    cx.globalAlpha = 1;
    // central figure: a tall dark shape (the saint... or something else)
    cx.fillStyle = k === 0 ? '#0a0a0a' : '#000';
    cx.beginPath(); cx.ellipse(w / 2, 150, 22, 28, 0, 0, 6.283); cx.fill();
    cx.beginPath(); cx.moveTo(w / 2 - 40, h - 20); cx.lineTo(w / 2 - 28, 180); cx.lineTo(w / 2 + 28, 180); cx.lineTo(w / 2 + 40, h - 20); cx.closePath(); cx.fill();
    // leading
    cx.strokeStyle = k === 0 ? '#111' : '#000'; cx.lineWidth = 3;
    for (let y = 0; y < h; y += cell) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(w, y); cx.stroke(); }
    for (let x = 0; x < w; x += cell) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, h); cx.stroke(); }
    cx.restore();
  });
  // stone surround
  ctx.strokeStyle = '#5a564e'; ctx.lineWidth = 16; arch(ctx); ctx.stroke();
  return { map: toTexture(c, { repeat: false }), emissiveMap: toTexture(e, { repeat: false }) };
}

export function doorTexture(seed = 3, color = [92, 66, 40]) {
  const rng = new RNG(seed);
  const w = 256, h = 512;
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = rgb(...color); ctx.fillRect(0, 0, w, h);
  const planks = 5, pw = w / planks;
  for (let i = 0; i < planks; i++) {
    const v = rng.float(0.8, 1.15);
    ctx.fillStyle = rgb(color[0] * v, color[1] * v, color[2] * v); ctx.fillRect(i * pw, 0, pw, h);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(i * pw, 0, 3, h);
    for (let k = 0; k < 30; k++) {
      ctx.strokeStyle = rgba(0, 0, 0, rng.float(0.05, 0.25)); ctx.lineWidth = 1;
      const x = i * pw + rng.float(4, pw - 4);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + rng.float(-3, 3), h); ctx.stroke();
    }
  }
  // iron straps
  ctx.fillStyle = '#1c1b1d';
  [0.18, 0.5, 0.82].forEach(f => { ctx.fillRect(10, h * f - 10, w - 20, 20); });
  ctx.fillStyle = '#3a3a3e';
  [0.18, 0.5, 0.82].forEach(f => { for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(30 + k * (w - 60) / 4, h * f, 4, 0, 6.283); ctx.fill(); } });
  // handle ring
  ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(w * 0.78, h * 0.52, 16, 0, 6.283); ctx.stroke();
  grain(ctx, w, h, 0.1, rng);
  return toTexture(c, { repeat: false });
}

// ---- pumpkin ------------------------------------------------------------
export function pumpkinTextures(seed = 1) {
  const rng = new RNG(seed);
  const w = 512, h = 256;
  const c = canvas(w, h), ctx = c.getContext('2d');
  const e = canvas(w, h), ectx = e.getContext('2d');
  // base orange with ridges
  ctx.fillStyle = '#d9641c'; ctx.fillRect(0, 0, w, h);
  const ridges = 12;
  for (let i = 0; i < ridges; i++) {
    const x = (i / ridges) * w;
    const g = ctx.createLinearGradient(x, 0, x + w / ridges, 0);
    g.addColorStop(0, 'rgba(60,20,0,0.55)'); g.addColorStop(0.35, 'rgba(255,150,60,0.15)'); g.addColorStop(0.7, 'rgba(255,170,80,0.1)'); g.addColorStop(1, 'rgba(60,20,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, w / ridges + 1, h);
  }
  mottle(ctx, w, h, 30, 10, 60, ['#8a3a10', '#f0a040', '#5a3a1a'], 0.3, rng);
  grain(ctx, w, h, 0.08, rng);
  // face drawn centred at u=0.25 (which faces +z on a SphereGeometry)
  ectx.fillStyle = '#000'; ectx.fillRect(0, 0, w, h);
  const cx = w * 0.25, cy = h * 0.5;
  const face = (cx2, fill) => {
    cx2.fillStyle = fill;
    const style = rng.int(0, 2);
    // eyes
    const eyeY = cy - 22, eyeDX = 38;
    for (const s of [-1, 1]) {
      cx2.beginPath();
      if (style === 0) { cx2.moveTo(cx + s * eyeDX - 22, eyeY + 14); cx2.lineTo(cx + s * eyeDX, eyeY - 22); cx2.lineTo(cx + s * eyeDX + 22, eyeY + 14); }
      else if (style === 1) { cx2.moveTo(cx + s * eyeDX - 24, eyeY - 4); cx2.lineTo(cx + s * eyeDX + 6 * s, eyeY - 22); cx2.lineTo(cx + s * eyeDX + 24, eyeY + 14); cx2.lineTo(cx + s * eyeDX - 10, eyeY + 16); }
      else { cx2.arc(cx + s * eyeDX, eyeY, 18, 0, 6.283); }
      cx2.closePath(); cx2.fill();
    }
    // nose
    cx2.beginPath(); cx2.moveTo(cx - 12, cy + 14); cx2.lineTo(cx, cy - 6); cx2.lineTo(cx + 12, cy + 14); cx2.closePath(); cx2.fill();
    // mouth: jagged grin
    cx2.beginPath(); cx2.moveTo(cx - 70, cy + 28);
    const teeth = 7;
    for (let i = 0; i <= teeth; i++) { const x = cx - 70 + (140 / teeth) * i; cx2.lineTo(x, cy + 28 + (i % 2 ? 0 : 14)); }
    cx2.lineTo(cx + 70, cy + 28); cx2.quadraticCurveTo(cx, cy + 90, cx - 70, cy + 28); cx2.closePath(); cx2.fill();
    // a tooth or two
    cx2.fillStyle = '#000'; cx2.fillRect(cx - 30, cy + 52, 14, 18); cx2.fillRect(cx + 18, cy + 50, 12, 16);
  };
  face(ectx, '#ffb347');
  // carved edges in colour map: darker inside
  ctx.globalCompositeOperation = 'source-over';
  face(ctx, '#2a1005');
  // glow bleed
  const gl = ectx.createRadialGradient(cx, cy + 10, 10, cx, cy + 10, 120);
  gl.addColorStop(0, 'rgba(255,120,30,0.35)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ectx.globalCompositeOperation = 'lighter'; ectx.fillStyle = gl; ectx.fillRect(0, 0, w, h);
  return { map: toTexture(c, { repeat: false }), emissiveMap: toTexture(e, { repeat: false }) };
}

// ---- inscriptions --------------------------------------------------------
const stoneBases = {};
function stoneBase(fresh) {
  const key = fresh ? 'fresh' : 'old';
  if (stoneBases[key]) return stoneBases[key];
  const rng = new RNG(fresh ? 3 : 5);
  const w = 256, h = 384;
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = fresh ? '#8a8a86' : '#5e6058'; ctx.fillRect(0, 0, w, h);
  mottle(ctx, w, h, 40, 20, 80, fresh ? ['#9a9a96', '#7a7a76'] : ['#4a4e46', '#6e7264', '#7a8a6a', '#3a3e38', '#8a8a70'], 0.5, rng);
  if (!fresh) mottle(ctx, w, h, 30, 6, 30, ['#8a9a50', '#c0b060', '#3a3a30'], 0.35, rng);
  grain(ctx, w, h, 0.1, rng);
  stoneBases[key] = c;
  return c;
}

export function gravestoneTexture(lines, seed = 1, fresh = false) {
  const rng = new RNG(seed);
  const w = 256, h = 384;
  const c = canvas(w, h), ctx = c.getContext('2d');
  // reuse a cached weathered base, flipped/offset per stone for variety
  const base = stoneBase(fresh);
  ctx.save();
  if (rng.chance(0.5)) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(base, 0, -rng.int(0, 60));
  ctx.drawImage(base, 0, h - rng.int(0, 60) - 60);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const n = lines.length;
  const startY = h * 0.22;
  const lineH = Math.min(46, (h * 0.7) / Math.max(n, 1));
  lines.forEach((ln, i) => {
    const size = i === 0 ? 30 : (ln.length > 22 ? 18 : 24);
    ctx.font = `${size}px 'IM Fell English SC', 'Times New Roman', serif`;
    const y = startY + i * lineH;
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillText(ln, w / 2 + 1, y + 1, w - 30);
    ctx.fillStyle = fresh ? '#2a2a2a' : '#1e2020'; ctx.fillText(ln, w / 2, y, w - 30);
  });
  ctx.strokeStyle = 'rgba(20,20,20,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(w / 2, 22); ctx.lineTo(w / 2, 62); ctx.moveTo(w / 2 - 14, 36); ctx.lineTo(w / 2 + 14, 36); ctx.stroke();
  return toTexture(c, { repeat: false });
}

export function paperTexture(seed = 1, scribble = true) {
  const rng = new RNG(seed);
  const w = 256, h = 320;
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#cfc09a'; ctx.fillRect(0, 0, w, h);
  mottle(ctx, w, h, 30, 20, 100, ['#b8a77e', '#dccfaa', '#a8956a'], 0.5, rng);
  if (scribble) {
    ctx.strokeStyle = 'rgba(40,30,60,0.75)'; ctx.lineWidth = 1.5;
    for (let j = 0; j < 12; j++) {
      const y = 40 + j * 22;
      ctx.beginPath(); ctx.moveTo(24, y);
      let x = 24;
      while (x < w - 30 - rng.float(0, 60)) { x += rng.float(3, 9); ctx.lineTo(x, y + rng.float(-4, 4)); }
      ctx.stroke();
    }
  }
  grain(ctx, w, h, 0.08, rng);
  return toTexture(c, { repeat: false });
}

export function signTexture(text, w = 512, h = 160, opts = {}) {
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = opts.bg || '#2a2420'; ctx.fillRect(0, 0, w, h);
  const rng = new RNG(opts.seed || 9);
  mottle(ctx, w, h, 20, 20, 90, ['#1a1512', '#3a3028'], 0.5, rng);
  ctx.strokeStyle = opts.border || '#8a7a5a'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = opts.fg || '#d9c9a3'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  const size = opts.size || Math.min(h / (lines.length + 0.6), 64);
  ctx.font = `${size}px 'IM Fell English SC', 'Times New Roman', serif`;
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15, w - 40));
  return toTexture(c, { repeat: false });
}

export function chalkboardTexture() {
  const w = 512, h = 320;
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#1d2622'; ctx.fillRect(0, 0, w, h);
  const rng = new RNG(19);
  mottle(ctx, w, h, 40, 20, 120, ['#2a352f', '#141c18', '#3a3a3a'], 0.4, rng);
  ctx.fillStyle = 'rgba(230,230,220,0.85)'; ctx.font = "28px 'Caveat', 'Segoe Print', cursive"; ctx.textAlign = 'left';
  const lines = ['Why we keep the Vigil', '1. Because of the Pestilence, 1626', '2. Because of the Promise', '3. Because he is patient', '', 'Homework: do not look at him'];
  lines.forEach((l, i) => ctx.fillText(l, 30, 50 + i * 42));
  ctx.strokeStyle = 'rgba(230,230,220,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, 62); ctx.lineTo(290, 64); ctx.stroke();
  // frame
  ctx.strokeStyle = '#5b3d22'; ctx.lineWidth = 18; ctx.strokeRect(0, 0, w, h);
  return toTexture(c, { repeat: false });
}

export function childDrawingTexture(seed = 1) {
  const rng = new RNG(seed);
  const w = 384, h = 288;
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#c9c4b0'; ctx.fillRect(0, 0, w, h);
  mottle(ctx, w, h, 20, 20, 90, ['#b8b3a0', '#d8d3c0'], 0.5, rng);
  ctx.lineCap = 'round'; ctx.lineWidth = 4;
  // ground
  ctx.strokeStyle = '#3a7a2a'; ctx.beginPath(); ctx.moveTo(10, h - 40); ctx.lineTo(w - 10, h - 36); ctx.stroke();
  // stones ring
  ctx.strokeStyle = '#555';
  for (let i = 0; i < 6; i++) { const x = w - 110 + i * 16, hh = 20 + rng.float(0, 14); ctx.beginPath(); ctx.moveTo(x, h - 42); ctx.lineTo(x, h - 42 - hh); ctx.stroke(); }
  // people with lanterns
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 32, y = h - 60;
    ctx.strokeStyle = rng.pick(['#2a3a9a', '#9a2a2a', '#2a2a2a']);
    ctx.beginPath(); ctx.arc(x, y - 22, 8, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 8); ctx.moveTo(x, y + 8); ctx.lineTo(x - 6, y + 22); ctx.moveTo(x, y + 8); ctx.lineTo(x + 6, y + 22); ctx.moveTo(x, y - 8); ctx.lineTo(x + 12, y); ctx.stroke();
    ctx.fillStyle = '#e8c020'; ctx.beginPath(); ctx.arc(x + 14, y + 4, 6, 0, 6.283); ctx.fill();
  }
  // the tall figure
  ctx.strokeStyle = '#111'; ctx.lineWidth = 6;
  const tx = w - 60;
  ctx.beginPath(); ctx.moveTo(tx, h - 42); ctx.lineTo(tx, 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx - 30, 90); ctx.lineTo(tx + 30, 90); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx, h - 42); ctx.lineTo(tx - 14, h - 10); ctx.moveTo(tx, h - 42); ctx.lineTo(tx + 14, h - 10); ctx.stroke();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(tx, 32, 12, 16, 0, 0, 6.283); ctx.fill();
  // text
  ctx.fillStyle = '#b3261e'; ctx.font = "22px 'Caveat', 'Segoe Print', cursive"; ctx.textAlign = 'left';
  ctx.fillText('THE TALLOW MAN COMES FOR THE GUEST', 14, 30);
  ctx.fillText('SO HE DOESNT COME FOR US', 14, 58);
  return toTexture(c, { repeat: false });
}

export function photoTexture() {
  const w = 256, h = 320;
  const c = canvas(w, h), ctx = c.getContext('2d');
  const rng = new RNG(29);
  // sepia photo of a woman before a cottage
  ctx.fillStyle = '#d6c6a4'; ctx.fillRect(0, 0, w, h); // mount
  ctx.fillStyle = '#6a5a44'; ctx.fillRect(20, 20, w - 40, h - 60);
  const sky = ctx.createLinearGradient(0, 20, 0, 160); sky.addColorStop(0, '#a89878'); sky.addColorStop(1, '#8a7a5a');
  ctx.fillStyle = sky; ctx.fillRect(20, 20, w - 40, 140);
  // cottage
  ctx.fillStyle = '#7a6a54'; ctx.fillRect(40, 110, 170, 110);
  ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); ctx.moveTo(30, 112); ctx.lineTo(125, 50); ctx.lineTo(220, 112); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a2018'; ctx.fillRect(60, 140, 26, 34); ctx.fillRect(150, 140, 26, 34); ctx.fillRect(105, 160, 30, 60);
  // woman
  ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.moveTo(85, 260); ctx.lineTo(95, 180); ctx.lineTo(125, 180); ctx.lineTo(135, 260); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c9b090'; ctx.beginPath(); ctx.arc(110, 166, 13, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#3a3028'; ctx.beginPath(); ctx.arc(110, 158, 14, 3.3, 6.1); ctx.fill();
  // vignette & age
  const v = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, 200);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(20, 20, w - 40, h - 60);
  mottle(ctx, w, h, 20, 5, 30, ['#f0e0c0', '#4a3a20'], 0.25, rng);
  ctx.fillStyle = '#3a2a1a'; ctx.font = "18px 'Caveat', cursive"; ctx.textAlign = 'center'; ctx.fillText('Maud — Rook Lane, 1959', w / 2, h - 16);
  return toTexture(c, { repeat: false });
}

export function noticeBoardTexture() {
  const w = 512, h = 384;
  const c = canvas(w, h), ctx = c.getContext('2d');
  const rng = new RNG(37);
  ctx.fillStyle = '#4a3a2a'; ctx.fillRect(0, 0, w, h);
  mottle(ctx, w, h, 30, 20, 100, ['#3a2a1a', '#5a4a3a'], 0.5, rng);
  const paper = (x, y, pw, ph, rot, title) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#d9cfae'; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = '#7a1010'; ctx.beginPath(); ctx.arc(0, -ph / 2 + 8, 4, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#2a2018'; ctx.font = "bold 13px 'IM Fell English SC', serif"; ctx.textAlign = 'center'; ctx.fillText(title, 0, -ph / 2 + 28, pw - 10);
    ctx.strokeStyle = 'rgba(40,30,20,0.6)'; ctx.lineWidth = 1;
    for (let i = 0; i < Math.floor((ph - 50) / 12); i++) { ctx.beginPath(); ctx.moveTo(-pw / 2 + 10, -ph / 2 + 44 + i * 12); ctx.lineTo(pw / 2 - 10 - rng.float(0, 30), -ph / 2 + 44 + i * 12); ctx.stroke(); }
    ctx.restore();
  };
  paper(150, 150, 190, 230, -0.04, 'PARISH NOTICE — THE VIGIL');
  paper(370, 120, 150, 150, 0.06, 'HARVEST SUPPER');
  paper(380, 280, 170, 120, -0.05, 'LOST: BLACK DOG');
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 20; ctx.strokeRect(0, 0, w, h);
  return toTexture(c, { repeat: false });
}

export function bookTexture(open = true) {
  const w = 256, h = 192;
  const c = canvas(w, h), ctx = c.getContext('2d');
  const rng = new RNG(43);
  ctx.fillStyle = '#3a1a14'; ctx.fillRect(0, 0, w, h);
  if (open) {
    ctx.fillStyle = '#d9cfae'; ctx.fillRect(8, 8, w / 2 - 10, h - 16); ctx.fillRect(w / 2 + 2, 8, w / 2 - 10, h - 16);
    ctx.strokeStyle = 'rgba(40,30,60,0.7)'; ctx.lineWidth = 1;
    for (let p = 0; p < 2; p++) for (let i = 0; i < 12; i++) {
      const x0 = 8 + p * (w / 2 - 6) + 10, y = 24 + i * 13;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w / 2 - 40 - rng.float(0, 30), y + rng.float(-1, 1)); ctx.stroke();
    }
  }
  return toTexture(c, { repeat: false });
}

// RGBA noise for shaders (linear)
export function noiseTexture(size = 256) {
  const c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    // tileable-ish by sampling on a torus
    const a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2;
    const px = Math.cos(a) * 3, py = Math.sin(a) * 3, pz = Math.cos(b) * 3, pw = Math.sin(b) * 3;
    const n1 = fbm2(px + pz, py + pw, 3) * 0.5 + 0.5;
    const n2 = fbm2(px - pw + 10, py + pz + 20, 4) * 0.5 + 0.5;
    const n3 = fbm2(pz * 2 + 30, pw * 2 + 40, 2) * 0.5 + 0.5;
    d[i] = n1 * 255; d[i + 1] = n2 * 255; d[i + 2] = n3 * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false });
}

// soft particle sprites
export function softBlobTexture(size = 128, inner = 0.0) {
  const c = canvas(size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * inner, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return toTexture(c, { repeat: false });
}

export function mistTexture(size = 256, seed = 5) {
  const rng = new RNG(seed);
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    const x = rng.float(size * 0.2, size * 0.8), y = rng.float(size * 0.25, size * 0.75), r = rng.float(size * 0.1, size * 0.3);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
  // fade edges hard
  const edge = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.5);
  edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = edge; ctx.fillRect(0, 0, size, size);
  return toTexture(c, { repeat: false });
}

export function leafTexture() {
  const size = 64;
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = '#c8722a';
  ctx.beginPath(); ctx.moveTo(0, -28); ctx.bezierCurveTo(22, -18, 22, 12, 0, 28); ctx.bezierCurveTo(-22, 12, -22, -18, 0, -28); ctx.fill();
  ctx.strokeStyle = '#6a3a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, 30); ctx.stroke();
  return toTexture(c, { repeat: false });
}

export function batTexture() {
  const w = 128, h = 64;
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(64, 40);
  ctx.bezierCurveTo(50, 20, 20, 10, 4, 30); ctx.bezierCurveTo(14, 26, 24, 30, 26, 40); ctx.bezierCurveTo(34, 34, 44, 36, 50, 46);
  ctx.lineTo(64, 52); ctx.lineTo(78, 46); ctx.bezierCurveTo(84, 36, 94, 34, 102, 40); ctx.bezierCurveTo(104, 30, 114, 26, 124, 30);
  ctx.bezierCurveTo(108, 10, 78, 20, 64, 40); ctx.fill();
  ctx.beginPath(); ctx.arc(64, 38, 6, 0, 6.283); ctx.fill();
  return toTexture(c, { repeat: false });
}

export function crowTexture() {
  const w = 64, h = 64;
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#050505';
  ctx.beginPath(); ctx.ellipse(30, 38, 18, 11, -0.2, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(44, 26, 7, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.moveTo(50, 26); ctx.lineTo(60, 29); ctx.lineTo(50, 30); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14, 42); ctx.lineTo(2, 50); ctx.lineTo(16, 46); ctx.fill();
  ctx.strokeStyle = '#050505'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(26, 48); ctx.lineTo(24, 58); ctx.moveTo(34, 48); ctx.lineTo(34, 58); ctx.stroke();
  return toTexture(c, { repeat: false });
}

export function clockTexture() {
  const s = 256;
  const c = canvas(s), ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1a1e'; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#d9c9a3'; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 10, 0, 6.283); ctx.fill();
  ctx.strokeStyle = '#1a1a1e'; ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(s / 2 + Math.cos(a) * 100, s / 2 + Math.sin(a) * 100); ctx.lineTo(s / 2 + Math.cos(a) * 115, s / 2 + Math.sin(a) * 115); ctx.stroke(); }
  // hands: almost eleven
  ctx.lineWidth = 8; ctx.lineCap = 'round';
  const hr = -Math.PI / 2 + (10.9 / 12) * Math.PI * 2, mn = -Math.PI / 2 + (54 / 60) * Math.PI * 2;
  ctx.beginPath(); ctx.moveTo(s / 2, s / 2); ctx.lineTo(s / 2 + Math.cos(hr) * 60, s / 2 + Math.sin(hr) * 60); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(s / 2, s / 2); ctx.lineTo(s / 2 + Math.cos(mn) * 95, s / 2 + Math.sin(mn) * 95); ctx.stroke();
  return toTexture(c, { repeat: false });
}

export function sallyTexture() {
  const c = canvas(64, 128), ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#a03030' : '#e0e0d0'; ctx.fillRect(0, i * 16, 64, 16); }
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 64; i += 4) ctx.fillRect(i, 0, 1, 128);
  return toTexture(c);
}

export function fingerpostTexture(text, left = true) {
  const w = 512, h = 96;
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#e8e2d0'; ctx.fillRect(0, 0, w, h);
  const rng = new RNG(text.length);
  mottle(ctx, w, h, 20, 10, 60, ['#c8c2b0', '#a8a290'], 0.5, rng);
  ctx.fillStyle = '#1a1a1a'; ctx.font = "44px 'IM Fell English SC', 'Times New Roman', serif"; ctx.textBaseline = 'middle';
  ctx.textAlign = left ? 'left' : 'right'; ctx.fillText(text, left ? 30 : w - 30, h / 2 + 2);
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, w - 8, h - 8);
  return toTexture(c, { repeat: false });
}
