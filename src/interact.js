import * as THREE from 'three';

export class Interact {
  constructor(game) {
    this.g = game;
    this.ray = new THREE.Raycaster();
    this.ray.far = 3.4;
    this.hit = null;
    this.center = new THREE.Vector2(0, 0);
  }
  update() {
    const g = this.g;
    if (g.ui.open || !(g.input.locked || g.debug) || g.player.frozen) { g.ui.prompt(null); this.hit = null; return; }
    this.ray.setFromCamera(this.center, g.camera);
    const hits = this.ray.intersectObjects(g.world.interactables, false);
    let h = null;
    for (const hit of hits) { const o = hit.object; if (o.visible && o.userData.interact && o.userData.interact.enabled !== false) { h = o; break; } }
    this.hit = h;
    if (h) {
      const lab = h.userData.interact.label;
      g.ui.prompt(typeof lab === 'function' ? lab() : lab);
      if (g.input.pressed.has('KeyE')) g.story.handle(h.userData.interact.action, h);
    } else g.ui.prompt(null);
  }
}
