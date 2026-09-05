// DOM user interface: HUD, notes, journal, map, fades, endings.
import { PATHS, CHURCHYARD } from './world/terrain.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {
      hud: $('hud'), crosshair: $('crosshair'), prompt: $('prompt'), objective: $('objective'), clues: $('clues'), toast: $('toast'), subtitle: $('subtitle'),
      fade: $('fade'), title: $('title'), intro: $('intro'), introLetter: $('introLetter'), note: $('note'), noteTitle: $('noteTitle'), noteBody: $('noteBody'), noteThought: $('noteThought'),
      journal: $('journal'), journalObjective: $('journalObjective'), journalList: $('journalList'), mapCanvas: $('mapCanvas'), pause: $('pause'), ending: $('ending'), endingText: $('endingText'), endingAgain: $('endingAgain'), endingStats: $('endingStats'), damage: $('damage'),
    };
    this.subQueue = [];
    this.subTimer = 0;
    this.subCurrent = null;
    this.toastTimer = 0;
    this.open = null; // 'note' | 'journal' | 'pause' | 'intro' | 'ending'
    this.mapDrawn = false;
  }
  showHud(v) { this.el.hud.classList.toggle('on', v); }
  prompt(text) {
    if (text) { this.el.prompt.innerHTML = `<kbd>E</kbd>${text}`; this.el.prompt.classList.add('on'); this.el.crosshair.classList.add('hot'); }
    else { this.el.prompt.classList.remove('on'); this.el.crosshair.classList.remove('hot'); }
  }
  objective(text) {
    const span = this.el.objective.querySelector('span');
    if (!text) { this.el.objective.classList.remove('on'); return; }
    this.el.objective.classList.remove('on');
    setTimeout(() => { span.textContent = text; this.el.objective.classList.add('on'); }, 400);
    this.currentObjective = text;
  }
  clues(n, total) { this.el.clues.querySelector('span').innerHTML = `Clues <b>${n}</b> / ${total}`; }
  toast(text, secs = 3.5) {
    this.el.toast.textContent = text; this.el.toast.classList.add('on'); this.toastTimer = secs;
  }
  // subtitle queue: {text, secs, sfx}
  say(text, secs = 4, sfx = false) { this.subQueue.push({ text, secs, sfx }); }
  sayNow(text, secs = 4, sfx = false) { this.subQueue.length = 0; this.subTimer = 0; this.subCurrent = null; this.say(text, secs, sfx); }
  update(dt) {
    if (this.toastTimer > 0) { this.toastTimer -= dt; if (this.toastTimer <= 0) this.el.toast.classList.remove('on'); }
    if (this.subCurrent) {
      this.subTimer -= dt;
      if (this.subTimer <= 0) { this.el.subtitle.classList.remove('on'); this.subCurrent = null; this.subTimer = 0.35; }
    } else if (this.subQueue.length && this.subTimer <= 0) {
      const s = this.subQueue.shift();
      this.subCurrent = s; this.subTimer = s.secs;
      this.el.subtitle.textContent = s.text; this.el.subtitle.classList.toggle('sfx', !!s.sfx); this.el.subtitle.classList.add('on');
    } else if (this.subTimer > 0) this.subTimer -= dt;
  }
  fade(toBlack, speed = '') {
    const f = this.el.fade;
    f.classList.remove('slow', 'fast'); if (speed) f.classList.add(speed);
    f.classList.toggle('clear', !toBlack);
  }
  screen(name, on) { const el = this.el[name]; if (el) el.classList.toggle('on', on); if (on) this.open = name; else if (this.open === name) this.open = null; }
  // ------- notes -------
  showNote(clue, name) {
    const e = this.el;
    e.noteTitle.textContent = clue.title || '';
    e.noteBody.className = 'body ' + (clue.kind || 'print');
    e.noteBody.innerHTML = (clue.text || '').replaceAll('{name}', escapeHtml(name)).replaceAll('{NAME}', escapeHtml(name).toUpperCase());
    e.noteThought.textContent = (clue.thought || '').replaceAll('{name}', name);
    e.noteThought.style.display = clue.thought ? '' : 'none';
    this.screen('note', true);
  }
  hideNote() { this.screen('note', false); }
  // ------- journal -------
  renderJournal(story, world, player) {
    const e = this.el;
    e.journalObjective.textContent = story.objectiveText || '';
    e.journalList.innerHTML = '';
    if (!story.found.length) { e.journalList.innerHTML = '<li class="empty">Nothing yet. Only the letter.</li>'; }
    for (const id of story.found) {
      const c = story.clues[id];
      if (!c || !c.journal) continue;
      const li = document.createElement('li');
      li.innerHTML = `<b>${escapeHtml(c.title)}</b>${escapeHtml(c.journal.replaceAll('{name}', story.name))}`;
      if (story.newClues.has(id)) li.classList.add('new');
      e.journalList.appendChild(li);
    }
    story.newClues.clear();
    this.drawMap(world, player, story);
    this.screen('journal', true);
  }
  hideJournal() { this.screen('journal', false); }
  drawMap(world, player, story) {
    const c = this.el.mapCanvas, ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    // world bounds shown: x -90..90, z -135..140
    const x0 = -95, x1 = 95, z0 = -140, z1 = 145;
    const sx = W / (x1 - x0), sz = H / (z1 - z0);
    const P = (x, z) => [(x - x0) * sx, (z - z0) * sz];
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#c9b78c'; ctx.fillRect(0, 0, W, H);
    // marsh
    ctx.fillStyle = 'rgba(80,90,70,0.35)'; ctx.beginPath(); const [mx, mz] = P(22, -114); ctx.ellipse(mx, mz, 44 * sx, 40 * sz, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(60,50,40,0.5)'; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    // woods hatch
    ctx.strokeStyle = 'rgba(60,70,40,0.25)'; ctx.lineWidth = 1;
    for (const p of (world.treePositions || [])) { const [tx, tz] = P(p[0], p[1]); ctx.beginPath(); ctx.arc(tx, tz, 2.2, 0, 6.283); ctx.stroke(); }
    // paths
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const p of PATHS) {
      ctx.strokeStyle = p.type === 'cobble' ? 'rgba(70,60,50,0.9)' : 'rgba(110,85,55,0.8)'; ctx.lineWidth = Math.max(2, p.w * sx * 1.4);
      ctx.beginPath(); p.pts.forEach(([x, z], i) => { const [px, pz] = P(x, z); i ? ctx.lineTo(px, pz) : ctx.moveTo(px, pz); }); ctx.stroke();
    }
    // churchyard
    ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 2; const [cx0, cz0] = P(CHURCHYARD.x0, CHURCHYARD.z0), [cx1, cz1] = P(CHURCHYARD.x1, CHURCHYARD.z1);
    ctx.strokeRect(cx0, cz0, cx1 - cx0, cz1 - cz0);
    // buildings
    ctx.fillStyle = '#3a2a1a';
    for (const b of (world.buildings || [])) {
      const g = b.group; const [bx, bz] = P(g.position.x, g.position.z);
      ctx.save(); ctx.translate(bx, bz); ctx.rotate(-g.rotation.y); ctx.fillRect(-b.spec.w * sx / 2, -(b.spec.d || 6) * sz / 2, b.spec.w * sx, (b.spec.d || 6) * sz); ctx.restore();
    }
    if (world.church) { const ch = world.church; const [bx, bz] = P(ch.cx - 3, ch.cz); ctx.fillRect(bx - 14 * sx, bz - 4.5 * sz, 28 * sx, 9 * sz); }
    // stones
    const [stx, stz] = P(16, -120); ctx.strokeStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(stx, stz, 7 * sx, 0, 6.283); ctx.stroke();
    // labels
    ctx.fillStyle = '#2a1d12'; ctx.font = "13px 'IM Fell English SC', Georgia, serif"; ctx.textAlign = 'center';
    const label = (x, z, t, dy = -8) => { const [lx, lz] = P(x, z); ctx.fillText(t, lx, lz + dy); };
    label(2, -52, 'St. Wystan', -30); label(22, -2, 'The Hanged Man', -22); label(-22, -3, 'School', -20); label(-38, -40, 'Vicarage', -22);
    label(0, 4, 'The Green', 26); label(-70, -30, 'Rook Lane', -20); label(16, -120, 'the stones', -22); label(22, -108, 'THE MARSH', 30);
    label(46, 43, 'field', 0); label(0, 128, 'the road in', 12);
    ctx.font = "italic 12px 'IM Fell English', Georgia, serif";
    label(-60, 80, 'woods', 0); label(70, 100, 'woods', 0); label(-80, -90, 'woods', 0);
    // clue markers for found clues with positions
    if (story) {
      ctx.fillStyle = '#7a1010';
      for (const id of story.found) { const c = story.clues[id]; if (c && c.at) { const [px, pz] = P(c.at[0], c.at[1]); ctx.beginPath(); ctx.arc(px, pz, 3, 0, 6.283); ctx.fill(); } }
    }
    // player
    if (player) {
      const [px, pz] = P(player.pos.x, player.pos.z);
      ctx.save(); ctx.translate(px, pz); ctx.rotate(-player.yaw);
      ctx.fillStyle = '#1a3a8a'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#1a3a8a'; ctx.font = "11px 'IM Fell English', Georgia, serif"; ctx.fillText('you (probably)', px, pz + 18);
    }
    // compass
    ctx.fillStyle = '#2a1d12'; ctx.font = "16px 'IM Fell English SC', Georgia, serif"; ctx.fillText('N', W - 24, 26); ctx.beginPath(); ctx.moveTo(W - 24, 32); ctx.lineTo(W - 24, 58); ctx.lineTo(W - 29, 50); ctx.moveTo(W - 24, 58); ctx.lineTo(W - 19, 50); ctx.strokeStyle = '#2a1d12'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // ------- intro letter -------
  showIntro(html) { this.el.introLetter.innerHTML = html; this.screen('intro', true); setTimeout(() => this.el.introLetter.classList.add('on'), 100); }
  hideIntro() { this.el.introLetter.classList.remove('on'); this.screen('intro', false); }
  // ------- ending -------
  showEnding(title, text, stats) {
    this.el.endingText.innerHTML = `<h2>${escapeHtml(title)}</h2>${text}`;
    this.el.endingStats.textContent = stats || '';
    this.screen('ending', true);
    setTimeout(() => this.el.endingText.classList.add('on'), 300);
    setTimeout(() => this.el.endingAgain.classList.add('on'), 6000);
  }
  damage(v) { this.el.damage.style.opacity = v; }
}

export function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
