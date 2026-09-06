// CC0 model library: loads glTF/GLB files, flattens them into simple mesh groups,
// dedupes materials so the static merger can batch them, and places instances.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { terrainHeight } from './terrain.js';


// Resolve relative to this module so the paths work from index.html, dev pages and GitHub Pages subpaths.
const ROOT = new URL('../../', import.meta.url).href;
const KK = ROOT + 'assets/kaykit-halloween-bits/';
const KG = ROOT + 'assets/kenney/graveyard/';
const KN = ROOT + 'assets/kenney/nature/';
const KS = ROOT + 'assets/kenney/survival/';

// height: scale uniformly so the model is this tall (metres). scale: explicit multiplier (applied after height).
// collider: 'circle' | 'box' | 'none'; cr: circle radius as a fraction of the footprint half-width.
export const MANIFEST = {
  // --- KayKit Halloween Bits (CC0, Kay Lousberg) ---
  tree_dead_large: { url: KK + 'tree_dead_large.gltf', scale: 1.15, collider: 'circle', cr: 0.16 },
  tree_dead_large_decorated: { url: KK + 'tree_dead_large_decorated.gltf', scale: 1.15, collider: 'circle', cr: 0.16 },
  tree_dead_medium: { url: KK + 'tree_dead_medium.gltf', scale: 1.2, collider: 'circle', cr: 0.18 },
  tree_dead_small: { url: KK + 'tree_dead_small.gltf', scale: 1.2, collider: 'circle', cr: 0.2 },
  pine_orange_large: { url: KK + 'tree_pine_orange_large.gltf', scale: 1.1, collider: 'circle', cr: 0.14 },
  pine_orange_medium: { url: KK + 'tree_pine_orange_medium.gltf', scale: 1.15, collider: 'circle', cr: 0.16 },
  pine_yellow_large: { url: KK + 'tree_pine_yellow_large.gltf', scale: 1.1, collider: 'circle', cr: 0.14 },
  pine_yellow_medium: { url: KK + 'tree_pine_yellow_medium.gltf', scale: 1.15, collider: 'circle', cr: 0.16 },
  kk_gravestone: { url: KK + 'gravestone.gltf', height: 1.15, collider: 'box' },
  kk_grave_a: { url: KK + 'grave_A.gltf', height: 1.0, collider: 'box' },
  kk_grave_a_destroyed: { url: KK + 'grave_A_destroyed.gltf', height: 0.7, collider: 'box' },
  kk_grave_b: { url: KK + 'grave_B.gltf', height: 1.05, collider: 'box' },
  kk_gravemarker_a: { url: KK + 'gravemarker_A.gltf', height: 0.9, collider: 'box' },
  kk_gravemarker_b: { url: KK + 'gravemarker_B.gltf', height: 0.9, collider: 'box' },
  kk_crypt: { url: KK + 'crypt.gltf', height: 4.6, collider: 'box' },
  kk_shrine: { url: KK + 'shrine.gltf', height: 2.2, collider: 'box' },
  kk_shrine_candles: { url: KK + 'shrine_candles.gltf', height: 2.2, collider: 'box', lightAt: [0, 1.3, 0.5] },
  kk_arch_gate: { url: KK + 'arch_gate.gltf', height: 3.2, collider: 'none' },
  kk_arch: { url: KK + 'arch.gltf', height: 3.2, collider: 'none' },
  kk_fence: { url: KK + 'fence.gltf', height: 1.35, collider: 'none' },
  kk_fence_broken: { url: KK + 'fence_broken.gltf', height: 1.35, collider: 'none' },
  kk_fence_pillar: { url: KK + 'fence_pillar.gltf', height: 1.6, collider: 'none' },
  kk_bench: { url: KK + 'bench.gltf', height: 0.95, collider: 'box' },
  kk_bench_decorated: { url: KK + 'bench_decorated.gltf', height: 1.0, collider: 'box' },
  kk_post_lantern: { url: KK + 'post_lantern.gltf', height: 3.0, collider: 'circle', cr: 0.12, lightNode: 'post_lantern_lantern' },
  kk_post_skull: { url: KK + 'post_skull.gltf', height: 2.2, collider: 'circle', cr: 0.15 },
  kk_lantern_standing: { url: KK + 'lantern_standing.gltf', height: 0.7, collider: 'none', lightAt: [0, 0.6, 0] },
  kk_lantern_hanging: { url: KK + 'lantern_hanging.gltf', height: 0.55, collider: 'none', lightAt: [0, 0.4, 0] },
  kk_pumpkin_jack: { url: KK + 'pumpkin_orange_jackolantern.gltf', height: 0.5, collider: 'none', glow: [0, 0.45, 0] },
  kk_pumpkin_jack_y: { url: KK + 'pumpkin_yellow_jackolantern.gltf', height: 0.5, collider: 'none', glow: [0, 0.45, 0] },
  kk_pumpkin: { url: KK + 'pumpkin_orange.gltf', height: 0.45, collider: 'none' },
  kk_pumpkin_small: { url: KK + 'pumpkin_orange_small.gltf', height: 0.3, collider: 'none' },
  kk_coffin: { url: KK + 'coffin.gltf', height: 0.6, collider: 'box' },
  kk_skull: { url: KK + 'skull.gltf', height: 0.22, collider: 'none' },
  kk_skull_candle: { url: KK + 'skull_candle.gltf', height: 0.3, collider: 'none', lightAt: [0, 0.3, 0] },
  kk_bone_a: { url: KK + 'bone_A.gltf', height: 0.12, collider: 'none' },
  kk_ribcage: { url: KK + 'ribcage.gltf', height: 0.35, collider: 'none' },
  kk_candle_triple: { url: KK + 'candle_triple.gltf', height: 0.3, collider: 'none', lightAt: [0, 0.32, 0] },
  kk_candle: { url: KK + 'candle.gltf', height: 0.22, collider: 'none', lightAt: [0, 0.24, 0] },
  kk_plaque: { url: KK + 'plaque.gltf', height: 1.2, collider: 'box' },
  kk_pillar: { url: KK + 'pillar.gltf', height: 1.6, collider: 'box' },
  kk_floor_dirt_grave: { url: KK + 'floor_dirt_grave.gltf', scale: 1.0, collider: 'none' },
  // --- Kenney Graveyard Kit (CC0) ---
  gy_gravestone_round: { url: KG + 'gravestone-round.glb', height: 1.0, collider: 'box' },
  gy_gravestone_bevel: { url: KG + 'gravestone-bevel.glb', height: 1.0, collider: 'box' },
  gy_gravestone_wide: { url: KG + 'gravestone-wide.glb', height: 0.9, collider: 'box' },
  gy_gravestone_roof: { url: KG + 'gravestone-roof.glb', height: 1.1, collider: 'box' },
  gy_gravestone_decorative: { url: KG + 'gravestone-decorative.glb', height: 1.2, collider: 'box' },
  gy_gravestone_broken: { url: KG + 'gravestone-broken.glb', height: 0.7, collider: 'box' },
  gy_gravestone_cross: { url: KG + 'gravestone-cross.glb', height: 1.2, collider: 'box' },
  gy_gravestone_cross_large: { url: KG + 'gravestone-cross-large.glb', height: 1.8, collider: 'box' },
  gy_cross_wood: { url: KG + 'cross-wood.glb', height: 1.0, collider: 'box' },
  gy_grave: { url: KG + 'grave.glb', height: 0.25, collider: 'none' },
  gy_grave_border: { url: KG + 'grave-border.glb', height: 0.25, collider: 'none' },
  gy_crypt_small: { url: KG + 'crypt-small.glb', height: 3.4, collider: 'box' },
  gy_crypt: { url: KG + 'crypt.glb', height: 3.8, collider: 'box' },
  gy_crypt_large: { url: KG + 'crypt-large.glb', height: 4.4, collider: 'box' },
  gy_pillar_obelisk: { url: KG + 'pillar-obelisk.glb', height: 2.6, collider: 'box' },
  gy_pillar_square: { url: KG + 'pillar-square.glb', height: 1.6, collider: 'box' },
  gy_urn_round: { url: KG + 'urn-round.glb', height: 0.7, collider: 'none' },
  gy_urn_square: { url: KG + 'urn-square.glb', height: 0.7, collider: 'none' },
  gy_lightpost_single: { url: KG + 'lightpost-single.glb', height: 3.4, collider: 'circle', cr: 0.12, lightTop: true },
  gy_lightpost_double: { url: KG + 'lightpost-double.glb', height: 3.6, collider: 'circle', cr: 0.12, lightTop: true },
  gy_lantern_glass: { url: KG + 'lantern-glass.glb', height: 0.55, collider: 'none', lightAt: [0, 0.4, 0] },
  gy_lantern_candle: { url: KG + 'lantern-candle.glb', height: 0.5, collider: 'none', lightAt: [0, 0.35, 0] },
  gy_fire_basket: { url: KG + 'fire-basket.glb', height: 1.0, collider: 'circle', cr: 0.5, lightAt: [0, 0.9, 0] },
  gy_iron_fence: { url: KG + 'iron-fence.glb', height: 1.3, collider: 'none' },
  gy_iron_fence_damaged: { url: KG + 'iron-fence-damaged.glb', height: 1.3, collider: 'none' },
  gy_iron_fence_column: { url: KG + 'iron-fence-border-column.glb', height: 1.5, collider: 'none' },
  gy_iron_fence_gate: { url: KG + 'iron-fence-border-gate.glb', height: 1.5, collider: 'none' },
  gy_stone_wall: { url: KG + 'stone-wall.glb', height: 1.1, collider: 'none' },
  gy_stone_wall_damaged: { url: KG + 'stone-wall-damaged.glb', height: 1.1, collider: 'none' },
  gy_stone_wall_column: { url: KG + 'stone-wall-column.glb', height: 1.3, collider: 'none' },
  gy_pumpkin_carved: { url: KG + 'pumpkin-carved.glb', height: 0.48, collider: 'none', glow: [0, 0.42, 0] },
  gy_pumpkin_tall_carved: { url: KG + 'pumpkin-tall-carved.glb', height: 0.62, collider: 'none', glow: [0, 0.5, 0] },
  gy_pumpkin: { url: KG + 'pumpkin.glb', height: 0.42, collider: 'none' },
  gy_pumpkin_tall: { url: KG + 'pumpkin-tall.glb', height: 0.55, collider: 'none' },
  gy_pine: { url: KG + 'pine.glb', height: 7.5, collider: 'circle', cr: 0.12 },
  gy_pine_crooked: { url: KG + 'pine-crooked.glb', height: 7.0, collider: 'circle', cr: 0.12 },
  gy_pine_fall: { url: KG + 'pine-fall.glb', height: 7.5, collider: 'circle', cr: 0.12 },
  gy_pine_fall_crooked: { url: KG + 'pine-fall-crooked.glb', height: 7.0, collider: 'circle', cr: 0.12 },
  gy_rocks: { url: KG + 'rocks.glb', height: 0.7, collider: 'circle', cr: 0.8 },
  gy_rocks_tall: { url: KG + 'rocks-tall.glb', height: 1.2, collider: 'circle', cr: 0.8 },
  gy_trunk: { url: KG + 'trunk.glb', height: 0.5, collider: 'box' },
  gy_trunk_long: { url: KG + 'trunk-long.glb', height: 0.5, collider: 'box' },
  gy_bench: { url: KG + 'bench.glb', height: 0.9, collider: 'box' },
  gy_bench_damaged: { url: KG + 'bench-damaged.glb', height: 0.9, collider: 'box' },
  gy_coffin_old: { url: KG + 'coffin-old.glb', height: 0.55, collider: 'box' },
  gy_shovel_dirt: { url: KG + 'shovel-dirt.glb', height: 1.1, collider: 'none' },
  gy_hay_bale: { url: KG + 'hay-bale.glb', height: 0.9, collider: 'box' },
  gy_altar_stone: { url: KG + 'altar-stone.glb', height: 1.0, collider: 'box' },
  gy_debris: { url: KG + 'debris.glb', height: 0.3, collider: 'none' },
  gy_candle_multiple: { url: KG + 'candle-multiple.glb', height: 0.3, collider: 'none', lightAt: [0, 0.3, 0] },
  // --- Kenney Nature Kit (CC0) ---
  nk_oak_fall: { url: KN + 'tree_oak_fall.glb', height: 7.5, collider: 'circle', cr: 0.12 },
  nk_oak_dark: { url: KN + 'tree_oak_dark.glb', height: 7.5, collider: 'circle', cr: 0.12 },
  nk_default_fall: { url: KN + 'tree_default_fall.glb', height: 6.5, collider: 'circle', cr: 0.12 },
  nk_default_dark: { url: KN + 'tree_default_dark.glb', height: 6.5, collider: 'circle', cr: 0.12 },
  nk_detailed_fall: { url: KN + 'tree_detailed_fall.glb', height: 7.0, collider: 'circle', cr: 0.12 },
  nk_detailed_dark: { url: KN + 'tree_detailed_dark.glb', height: 7.0, collider: 'circle', cr: 0.12 },
  nk_thin_dark: { url: KN + 'tree_thin_dark.glb', height: 6.0, collider: 'circle', cr: 0.15 },
  nk_thin_fall: { url: KN + 'tree_thin_fall.glb', height: 6.0, collider: 'circle', cr: 0.15 },
  nk_tall_dark: { url: KN + 'tree_tall_dark.glb', height: 8.5, collider: 'circle', cr: 0.12 },
  nk_tall_fall: { url: KN + 'tree_tall_fall.glb', height: 8.5, collider: 'circle', cr: 0.12 },
  nk_pine_tall_a: { url: KN + 'tree_pineTallA.glb', height: 9.0, collider: 'circle', cr: 0.1 },
  nk_pine_tall_b: { url: KN + 'tree_pineTallB.glb', height: 9.5, collider: 'circle', cr: 0.1 },
  nk_pine_tall_c: { url: KN + 'tree_pineTallC.glb', height: 9.0, collider: 'circle', cr: 0.1 },
  nk_pine_default_a: { url: KN + 'tree_pineDefaultA.glb', height: 7.0, collider: 'circle', cr: 0.12 },
  nk_pine_round_a: { url: KN + 'tree_pineRoundA.glb', height: 6.5, collider: 'circle', cr: 0.12 },
  nk_pine_small_a: { url: KN + 'tree_pineSmallA.glb', height: 4.0, collider: 'circle', cr: 0.15 },
  nk_simple_dark: { url: KN + 'tree_simple_dark.glb', height: 5.5, collider: 'circle', cr: 0.14 },
  nk_small_dark: { url: KN + 'tree_small_dark.glb', height: 3.5, collider: 'circle', cr: 0.18 },
  nk_rock_large_a: { url: KN + 'rock_largeA.glb', height: 1.2, collider: 'circle', cr: 0.85 },
  nk_rock_large_b: { url: KN + 'rock_largeB.glb', height: 1.0, collider: 'circle', cr: 0.85 },
  nk_rock_large_c: { url: KN + 'rock_largeC.glb', height: 0.9, collider: 'circle', cr: 0.85 },
  nk_rock_small_a: { url: KN + 'rock_smallA.glb', height: 0.4, collider: 'none' },
  nk_rock_small_b: { url: KN + 'rock_smallB.glb', height: 0.35, collider: 'none' },
  nk_stone_tall_a: { url: KN + 'stone_tallA.glb', height: 2.6, collider: 'circle', cr: 0.7 },
  nk_stone_tall_b: { url: KN + 'stone_tallB.glb', height: 3.0, collider: 'circle', cr: 0.7 },
  nk_stone_tall_c: { url: KN + 'stone_tallC.glb', height: 2.4, collider: 'circle', cr: 0.7 },
  nk_stone_tall_d: { url: KN + 'stone_tallD.glb', height: 2.8, collider: 'circle', cr: 0.7 },
  nk_stone_tall_e: { url: KN + 'stone_tallE.glb', height: 2.5, collider: 'circle', cr: 0.7 },
  nk_stump_old: { url: KN + 'stump_old.glb', height: 0.5, collider: 'circle', cr: 0.8 },
  nk_stump_old_tall: { url: KN + 'stump_oldTall.glb', height: 1.0, collider: 'circle', cr: 0.7 },
  nk_log: { url: KN + 'log.glb', height: 0.45, collider: 'box' },
  nk_log_stack: { url: KN + 'log_stack.glb', height: 0.9, collider: 'box' },
  nk_log_stack_large: { url: KN + 'log_stackLarge.glb', height: 1.1, collider: 'box' },
  nk_bush: { url: KN + 'plant_bush.glb', height: 0.9, collider: 'none' },
  nk_bush_large: { url: KN + 'plant_bushLarge.glb', height: 1.3, collider: 'none' },
  nk_bush_detailed: { url: KN + 'plant_bushDetailed.glb', height: 1.0, collider: 'none' },
  nk_grass_leafs: { url: KN + 'grass_leafs.glb', height: 0.5, collider: 'none' },
  nk_grass_large: { url: KN + 'grass_large.glb', height: 0.6, collider: 'none' },
  nk_mushroom_red_group: { url: KN + 'mushroom_redGroup.glb', height: 0.3, collider: 'none' },
  nk_mushroom_tan_group: { url: KN + 'mushroom_tanGroup.glb', height: 0.3, collider: 'none' },
  nk_hanging_moss: { url: KN + 'hanging_moss.glb', height: 1.5, collider: 'none' },
  nk_fence_simple: { url: KN + 'fence_simple.glb', height: 1.0, collider: 'none' },
  nk_fence_planks: { url: KN + 'fence_planks.glb', height: 1.0, collider: 'none' },
  nk_fence_gate: { url: KN + 'fence_gate.glb', height: 1.1, collider: 'none' },
  nk_sign: { url: KN + 'sign.glb', height: 1.6, collider: 'circle', cr: 0.3 },
  nk_campfire_logs: { url: KN + 'campfire_logs.glb', height: 0.5, collider: 'circle', cr: 0.6 },
  // --- Kenney Survival Kit (CC0) ---
  sv_barrel: { url: KS + 'barrel.glb', height: 0.85, collider: 'circle', cr: 0.9 },
  sv_barrel_open: { url: KS + 'barrel-open.glb', height: 0.85, collider: 'circle', cr: 0.9 },
  sv_box: { url: KS + 'box.glb', height: 0.6, collider: 'box' },
  sv_box_large: { url: KS + 'box-large.glb', height: 0.9, collider: 'box' },
  sv_bucket: { url: KS + 'bucket.glb', height: 0.35, collider: 'none' },
  sv_chest: { url: KS + 'chest.glb', height: 0.6, collider: 'box' },
  sv_signpost: { url: KS + 'signpost.glb', height: 2.4, collider: 'circle', cr: 0.2 },
  sv_shovel: { url: KS + 'tool-shovel.glb', height: 1.1, collider: 'none' },
  sv_axe: { url: KS + 'tool-axe.glb', height: 0.8, collider: 'none' },
  sv_planks: { url: KS + 'resource-planks.glb', height: 0.4, collider: 'box' },
  sv_wood: { url: KS + 'resource-wood.glb', height: 0.5, collider: 'box' },
  sv_tree_log: { url: KS + 'tree-log.glb', height: 0.5, collider: 'box' },
  sv_anvil: { url: KS + 'workbench-anvil.glb', height: 0.9, collider: 'box' },
  sv_workbench: { url: KS + 'workbench.glb', height: 1.0, collider: 'box' },
};

// Kenney's flat palette is bright and cartoonish; remap by material name to muted night colours.
const RECOLOUR = {
  leafsDark: 0x1c3220, leafsGreen: 0x243d22, leafsFall: 0x7a3c14, grass: 0x2a4622,
  woodBark: 0x4a3628, dirt: 0x463628, woodBarkDark: 0x3a2c24, woodBirch: 0x8a8070, wood: 0x6a4a30, woodDark: 0x4a3020, woodInner: 0xb09878,
  stone: 0x7a7a74, stoneDark: 0x55554f, colorRed: 0x8a2a24, colorTan: 0xb08a5a, _defaultMat: 0xd8d0c0,
};

// Textured pack materials get a mild desaturate/darken so they sit in the moonlight.
function muteTexturedMaterial(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, 0.62) * 0.82;`);
  };
  mat.customProgramCacheKey = () => 'muted';
}

const _box = new THREE.Box3();
const _v = new THREE.Vector3();

export class AssetLib {
  constructor() {
    this.loader = new GLTFLoader();
    this.templates = new Map();
    this.materials = new Map();   // signature -> shared material
  }

  // Load a set of manifest names in parallel. Missing/failed files are logged and skipped.
  async loadAll(names, onProgress) {
    let done = 0;
    await Promise.all(names.map(async (n) => {
      try { await this.load(n); } catch (e) { console.warn('[assets] failed', n, e.message || e); }
      done++; if (onProgress) onProgress(done / names.length);
    }));
  }

  async load(name) {
    if (this.templates.has(name)) return this.templates.get(name);
    const entry = MANIFEST[name];
    if (!entry) throw new Error('unknown asset ' + name);
    const gltf = await this.loader.loadAsync(entry.url);
    const pack = entry.url.slice(0, entry.url.lastIndexOf('/'));
    const root = this.flatten(gltf.scene, pack);
    _box.setFromObject(root);
    const size = _box.getSize(new THREE.Vector3());
    let scale = 1;
    if (entry.height) scale = entry.height / Math.max(size.y, 1e-3);
    if (entry.scale) scale *= entry.scale;
    const t = { name, entry, root, scale, size: size.clone().multiplyScalar(scale), min: _box.min.clone().multiplyScalar(scale), max: _box.max.clone().multiplyScalar(scale), center: _box.getCenter(new THREE.Vector3()).multiplyScalar(scale) };
    // a named node for light attachment
    if (entry.lightNode) {
      const n = root.children.find(c => c.name === entry.lightNode);
      if (n) { const b = new THREE.Box3().setFromObject(n); t.lightPos = b.getCenter(new THREE.Vector3()).multiplyScalar(scale); }
    }
    if (!t.lightPos && entry.lightAt) t.lightPos = new THREE.Vector3(entry.lightAt[0], entry.lightAt[1] * t.size.y / (entry.height || t.size.y), entry.lightAt[2]);
    if (!t.lightPos && entry.lightTop) t.lightPos = new THREE.Vector3(t.center.x, t.max.y - t.size.y * 0.12, t.center.z);
    this.templates.set(name, t);
    return t;
  }

  // Bake the node hierarchy into a flat group of meshes (so the static merger and instancing can use them).
  flatten(scene, pack) {
    scene.updateMatrixWorld(true);
    const g = new THREE.Group();
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const m = new THREE.Mesh(o.geometry, this.shareMaterial(o.material, pack));
      m.name = o.name;
      m.applyMatrix4(o.matrixWorld);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    });
    return g;
  }

  // Materials from different files that look the same are replaced by one shared instance.
  shareMaterial(mat, pack = '') {
    if (Array.isArray(mat)) return mat.map(m => this.shareMaterial(m, pack));
    const map = mat.map;
    // textured materials are shared per pack (each pack uses one atlas), flat ones per name/colour
    const key = (map ? ('tex|' + pack + '|' + (mat.name || 'mat')) : ('flat|' + (mat.name || '') + '|' + (mat.color ? mat.color.getHexString() : ''))) + '|' + (mat.vertexColors ? 'vc' : '') + '|' + (mat.transparent ? 't' : '');
    const rekey = (!map && mat.name && RECOLOUR[mat.name] !== undefined) ? ('re|' + mat.name) : key;
    let shared = this.materials.get(rekey);
    if (!shared) {
      const color = (!map && mat.name && RECOLOUR[mat.name] !== undefined) ? new THREE.Color(RECOLOUR[mat.name]) : (mat.color ? mat.color.clone() : new THREE.Color(0xffffff));
      shared = new THREE.MeshStandardMaterial({
        map: map || null, color,
        vertexColors: !!mat.vertexColors, roughness: Math.max(0.82, mat.roughness ?? 1), metalness: 0,
        transparent: !!mat.transparent, opacity: mat.opacity ?? 1, alphaTest: mat.alphaTest || 0, side: mat.side ?? THREE.FrontSide,
      });
      shared.name = 'asset:' + (mat.name || 'mat');
      if (map) { map.anisotropy = 4; map.colorSpace = THREE.SRGBColorSpace; muteTexturedMaterial(shared); }
      this.materials.set(rekey, shared);
    }
    return shared;
  }

  has(name) { return this.templates.has(name); }
  template(name) { const t = this.templates.get(name); if (!t) throw new Error('asset not loaded: ' + name); return t; }

  // A fresh instance (meshes share geometry and material with the template).
  instance(name, extraScale = 1) {
    const t = this.template(name);
    const g = t.root.clone(true);
    g.scale.setScalar(t.scale * extraScale);
    g.userData.asset = name;
    return g;
  }

  // Place an instance on the ground (or at y) with a collider. Returns the group.
  place(world, name, x, z, opts = {}) {
    const t = this.template(name);
    const s = opts.scale ?? 1;
    const g = this.instance(name, s);
    const y = opts.y ?? terrainHeight(x, z) + (opts.dy ?? 0);
    g.position.set(x, y, z);
    g.rotation.y = opts.yaw ?? 0;
    if (opts.tilt) g.rotation.z = opts.tilt;
    (opts.parent || world.group).add(g);
    const col = opts.collider ?? t.entry.collider;
    const sx = t.size.x * s, sz = t.size.z * s;
    if (col === 'circle') world.colliders.addCircle(x, z, Math.max(sx, sz) * 0.5 * (t.entry.cr ?? 0.5), name);
    else if (col === 'box') world.colliders.addOBB(x + Math.cos(opts.yaw ?? 0) * t.center.x * s + Math.sin(opts.yaw ?? 0) * t.center.z * s, z - Math.sin(opts.yaw ?? 0) * t.center.x * s + Math.cos(opts.yaw ?? 0) * t.center.z * s, sx / 2, sz / 2, -(opts.yaw ?? 0), name);
    if (t.lightPos && opts.light !== false) {
      const lp = t.lightPos.clone().multiplyScalar(s).applyAxisAngle(new THREE.Vector3(0, 1, 0), opts.yaw ?? 0).add(g.position);
      g.userData.light = world.addLight(lp, opts.lightColor ?? 0xffa050, opts.lightIntensity ?? 3, opts.lightDistance ?? 8, opts.flicker ?? 1.0);
      if (opts.lightOff) { g.userData.light.on = false; g.userData.light.intensity = 0; }
    }
    if (t.entry.glow && opts.glow !== false) {
      // a small emissive core inside carved pumpkins
      const gp = t.entry.glow;
      const core = new THREE.Mesh(new THREE.SphereGeometry(t.size.y * s * 0.36, 10, 8), glowMat());
      core.position.set(gp[0] * s, gp[1] * s, gp[2] * s);
      core.userData.keep = true;
      g.add(core);
      const lp = new THREE.Vector3(gp[0] * s, gp[1] * s, gp[2] * s).add(g.position);
      g.userData.light = world.addLight(lp, 0xff8a30, 2.2 * s, 5 * s, 1.5, 2);
    }
    return g;
  }

  // Instanced trees: one InstancedMesh per template mesh. transforms: [{x,z,yaw,scale}]
  instanced(world, name, transforms, colliders = true) {
    const t = this.template(name);
    const dummy = new THREE.Object3D();
    const meshes = [];
    for (const src of t.root.children) {
      const im = new THREE.InstancedMesh(src.geometry, src.material, transforms.length);
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      im.userData.keep = true;
      transforms.forEach((tr, i) => {
        const s = t.scale * (tr.scale ?? 1);
        dummy.position.set(tr.x, tr.y ?? terrainHeight(tr.x, tr.z), tr.z);
        dummy.rotation.set(0, tr.yaw ?? 0, 0);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        dummy.matrix.multiply(src.matrix);
        im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      world.group.add(im);
      meshes.push(im);
    }
    if (colliders && t.entry.collider === 'circle') {
      for (const tr of transforms) world.colliders.addCircle(tr.x, tr.z, Math.max(t.size.x, t.size.z) * 0.5 * (t.entry.cr ?? 0.5) * (tr.scale ?? 1), name);
    }
    return meshes;
  }
}

let _glow = null;
function glowMat() { if (!_glow) _glow = new THREE.MeshBasicMaterial({ color: 0xffb040 }); return _glow; }

// Everything the village currently uses (loaded up front).
export const DEFAULT_SET = [
  'tree_dead_large', 'tree_dead_large_decorated', 'tree_dead_medium', 'tree_dead_small', 'pine_orange_large', 'pine_yellow_medium',
  'nk_thin_dark', 'nk_tall_dark', 'nk_oak_dark', 'nk_oak_fall', 'nk_default_fall', 'nk_pine_tall_a', 'nk_pine_tall_b', 'nk_pine_tall_c', 'nk_pine_default_a', 'nk_pine_round_a', 'gy_pine', 'gy_pine_crooked', 'nk_small_dark',
  'gy_gravestone_round', 'gy_gravestone_bevel', 'gy_gravestone_wide', 'gy_gravestone_roof', 'gy_gravestone_decorative', 'gy_gravestone_broken', 'gy_gravestone_cross', 'gy_gravestone_cross_large', 'gy_cross_wood',
  'kk_gravestone', 'kk_grave_a', 'kk_grave_b', 'kk_gravemarker_a', 'kk_gravemarker_b', 'gy_grave_border',
  'kk_crypt', 'gy_crypt_small', 'gy_pillar_obelisk', 'gy_urn_round', 'gy_urn_square', 'kk_arch', 'gy_fire_basket', 'kk_shrine_candles', 'gy_shovel_dirt',
  'kk_skull', 'kk_bone_a', 'kk_ribcage', 'kk_post_lantern', 'kk_lantern_standing', 'kk_bench', 'gy_bench', 'gy_bench_damaged',
  'nk_fence_planks', 'nk_fence_simple', 'nk_rock_large_a', 'nk_rock_large_b', 'nk_rock_large_c', 'nk_rock_small_a', 'nk_rock_small_b', 'gy_rocks',
  'nk_stump_old', 'nk_stump_old_tall', 'nk_log', 'nk_log_stack', 'nk_log_stack_large', 'nk_bush', 'nk_bush_large', 'nk_bush_detailed', 'nk_mushroom_red_group', 'nk_mushroom_tan_group',
  'sv_barrel', 'sv_barrel_open', 'sv_box', 'sv_box_large', 'sv_anvil', 'gy_hay_bale', 'gy_pumpkin', 'gy_pumpkin_tall', 'kk_pumpkin', 'kk_pumpkin_small', 'gy_trunk_long',
];
