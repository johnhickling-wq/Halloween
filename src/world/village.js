// Assembles the village of Ashcombe.
import * as THREE from 'three';
import * as T from '../util/textures.js';
import { terrainHeight, CHURCHYARD } from './terrain.js';
import { makeMaterials, makeBuilding, makeChurch, mkBox, paperNote } from './buildings.js';
import { lampPost, jackOLantern, stoneWall, fence, gravestone, openGrave, well, signpost, scarecrow, hangingLantern, noticeBoard, bench, cart, trough, logPile, standingStone, lychGate } from './props.js';
import { RNG } from '../util/noise.js';

export async function createTextures(progress) {
  const tex = {};
  const steps = [
    ['grass', () => T.grassTexture()], ['mud', () => T.mudTexture()], ['cobble', () => T.cobbleTexture()], ['noise', () => T.noiseTexture()],
    ['stoneWall', () => T.stoneWallTexture(512, 41, [1, 1, 1])], ['stoneWallDark', () => T.stoneWallTexture(512, 43, [0.68, 0.7, 0.74])],
    ['timber', () => T.plasterTimberTexture()], ['brick', () => T.brickTexture()], ['plasterInt', () => T.plasterInteriorTexture()],
    ['wood', () => T.woodTexture(512, 71, false)], ['woodDark', () => T.woodTexture(512, 77, true)], ['floor', () => T.floorboardsTexture()],
    ['thatch', () => T.thatchTexture()], ['slate', () => T.slateTexture()], ['bark', () => T.barkTexture()], ['iron', () => T.ironTexture()],
    ['sack', () => T.sackclothTexture()], ['cloth', () => T.clothTexture()],
    ['winLit', () => T.windowTextures(true, 2, 3, 5)], ['winDark', () => T.windowTextures(false, 2, 3, 6)], ['winLitSmall', () => T.windowTextures(true, 2, 2, 7)],
    ['stained', () => T.stainedGlassTextures()], ['door', () => T.doorTexture(3)], ['doorDark', () => T.doorTexture(4, [50, 38, 28])],
    ['paper', () => T.paperTexture(1)], ['photo', () => T.photoTexture()], ['book', () => T.bookTexture()],
    ['pubBoard', () => T.signTexture('CLOSED\nFOR THE VIGIL', 512, 360, { bg: '#1d2622', fg: '#e8e8e0', border: '#5b3d22', size: 62 })],
    ['chalkboard', () => T.chalkboardTexture()], ['drawings', () => [1, 2, 3, 4].map(i => T.childDrawingTexture(i))],
    ['clock', () => T.clockTexture()], ['sally', () => T.sallyTexture()],
    ['plaque', () => T.signTexture('RING FOR THE VIGIL\nRING FOR THE GUEST', 512, 256, { bg: '#5a4a20', fg: '#e8d8a0', border: '#8a7a40', size: 44 })],
    ['notice', () => T.noticeBoardTexture()], ['mist', () => T.mistTexture()], ['blob', () => T.softBlobTexture()],
    ['leaf', () => T.leafTexture()], ['bat', () => T.batTexture()], ['crow', () => T.crowTexture()],
    ['pubSign', () => T.signTexture('THE\nHANGED MAN', 512, 400, { bg: '#1a1410', fg: '#d9c9a3', border: '#8a7a5a', size: 70 })],
    ['villageSign', () => T.signTexture('ASHCOMBE\nplease drive carefully\nthe village keeps early hours', 640, 300, { bg: '#0e1410', fg: '#e0d8c0', border: '#c8c0a0', size: 46 })],
    ['smithySign', () => T.signTexture('J. HALE & SON\nSMITHS', 512, 220, { bg: '#1a1410', fg: '#d9c9a3', border: '#8a7a5a', size: 56 })],
  ];
  let i = 0;
  for (const [k, fn] of steps) {
    tex[k] = fn();
    if (progress && (++i % 6 === 0)) await progress(i / steps.length);
  }
  return tex;
}

const rngV = new RNG(2026);

function pumpkinsAtDoor(world, M, b, count = 2) {
  // b: building result; door at local (doorX, d/2)
  const { spec } = b;
  const d = spec.d ?? 6;
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const lx = (spec.doorX ?? 0) + side * (0.85 + rngV.float(0, 0.2)), lz = d / 2 + 0.7 + rngV.float(0, 0.3);
    const [wx, wz] = b.toWorld(lx, lz);
    jackOLantern(world, M, wx, wz, (spec.yaw || 0) + rngV.float(-0.3, 0.3), 0.85 + rngV.float(0, 0.3), null, rngV.int(0, 2));
  }
}

const EPITAPHS = [
  ['SACRED', 'to the memory of', 'THOMAS PYE', '1791 – 1848', 'He kept the Vigil'],
  ['IN MEMORY OF', 'AGNES WRAY', 'died 1809', 'aged 71 years', 'Not lost but gone before'],
  ['HERE LIETH', 'WILLIAM COLE', 'yeoman of this parish', '1702 – 1769'],
  ['ELIZABETH ASHDOWN', 'wife of the Rector', '1834 – 1901', 'She kept the Vigil'],
  ['JOHN HALE', 'blacksmith', '1866 – 1926', 'He would not look'],
  ['MARY TALLOW', '1611 – 1626', 'The first', 'of the Pestilence'],
  ['HENRY OKE', 'sexton of this parish', 'for 40 years', '1852 – 1928'],
  ['ANN & SUSAN PYE', 'infants', '1826'],
  ['ROBERT MARLOW', 'churchwarden', '1900 – 1976', 'He counted them all'],
  ['DOROTHY VANCE', '1919 – 2001', 'She lit the lanterns'],
  ['GEORGE WHITLOCK', 'of the Parish Council', '1921 – 1999'],
  ['SAMUEL ASHBY', 'innkeeper', '1799 – 1851', 'Room Two is kept ready'],
  ['ELLEN COLE', 'schoolmistress', '1871 – 1951', 'She taught them not to look'],
  ['THE HALE FAMILY', 'of Rook Lane', '1600 –'],
  ['PETER OKAFOR', '—', 'A stranger here', 'as we are all'],
  ['IN LOVING MEMORY', 'of a good dog', 'BLACKIE', 'who would not cross the gate'],
];

export function buildVillage(world, M) {
  const tex = world.tex;
  const ground = (x, z) => terrainHeight(x, z);

  // ---------------- buildings around the square ----------------
  const pub = makeBuilding(world, M, { name: 'pub', x: 22, z: -2, yaw: -Math.PI / 2, w: 13, d: 9, storeys: 2, storeyH: 2.9, wall: 'brick', roof: 'slate', interior: 'pub', doorX: 1.5, chimneys: [-5.2, 5.2], smoke: true });
  pumpkinsAtDoor(world, M, pub, 2);
  {
    // hanging pub sign
    const g = pub.group;
    const bracket = mkBox(1.3, 0.06, 0.06, M.iron, 1); bracket.position.set(-3.5, 4.2, 4.5 + 0.6); g.add(bracket);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.05), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, new THREE.MeshStandardMaterial({ map: tex.pubSign, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: tex.pubSign, roughness: 0.9 })]);
    sign.position.set(-3.5, 3.7, 4.5 + 1.1); sign.rotation.y = Math.PI / 2; g.add(sign);
    world.pubSign = sign;
    const [px, pz] = pub.toWorld(1.5, 6.5);
    world.mark('pub_door', px, ground(px, pz), pz);
  }
  const school = makeBuilding(world, M, { name: 'school', x: -22, z: -3, yaw: Math.PI / 2, w: 12, d: 8, storeys: 1, storeyH: 3.4, wall: 'stone', roof: 'slate', roofPitch: 1.0, interior: 'school', doorX: -3.5, chimneys: [5.3], smoke: true });
  pumpkinsAtDoor(world, M, school, 3);
  {
    // bell-cote on the school roof
    const g = school.group;
    const cote = mkBox(0.8, 1.0, 0.8, M.stone, 1); cote.position.set(0, 3.7 + 2.9 + 0.5, 0); g.add(cote);
    const [px, pz] = school.toWorld(-3.5, 5.5);
    world.mark('school_door', px, ground(px, pz), pz);
  }
  const vicarage = makeBuilding(world, M, { name: 'vicarage', x: -38, z: -40, yaw: 0, w: 11, d: 9, storeys: 2, storeyH: 2.8, wall: 'stone', roof: 'slate', interior: 'vicarage', doorX: 0, chimneys: [-4.3, 4.3], smoke: true });
  pumpkinsAtDoor(world, M, vicarage, 2);
  { const [px, pz] = vicarage.toWorld(0, 6.0); world.mark('vicarage_door', px, ground(px, pz), pz); }
  const widow = makeBuilding(world, M, { name: 'widow', x: -20, z: 21, yaw: Math.PI / 2, w: 7.5, d: 6, storeys: 1, wall: 'stone', roof: 'thatch', interior: 'cottage', doorX: 0.8, smoke: true });
  pumpkinsAtDoor(world, M, widow, 2);
  {
    // supper left on the table, and a note
    const g = widow.group;
    paperNote(world, g, M, 0.75, 0.82, -0.75, 0.4, 'widow_note', 'Read the note');
  }
  const maud = makeBuilding(world, M, { name: 'maud', x: -70, z: -30, yaw: 0, w: 8, d: 7, storeys: 1, wall: 'dark', roof: 'thatch', interior: 'maud', doorX: -0.5, lit: false, chimney: true });
  { const [px, pz] = maud.toWorld(-0.5, 5.5); world.mark('maud_door', px, ground(px, pz), pz); }
  // one cold pumpkin at Maud's door, unlit? keep it lit — 'they will be lit for you'
  pumpkinsAtDoor(world, M, maud, 2);

  // ---------------- other cottages (closed) ----------------
  const cottages = [
    { x: 36, z: 16, yaw: Math.PI, w: 8, d: 6, wall: 'timber', roof: 'thatch' },
    { x: 47, z: 17, yaw: Math.PI + 0.05, w: 8.5, d: 6.5, wall: 'stone', roof: 'slate', storeys: 2, storeyH: 2.6 },
    { x: 58, z: 16, yaw: Math.PI - 0.04, w: 8, d: 6, wall: 'timber', roof: 'thatch' },
    { x: -38, z: 18, yaw: Math.PI, w: 8, d: 6, wall: 'stone', roof: 'thatch' },
    { x: -50, z: 19, yaw: Math.PI + 0.06, w: 9, d: 6.5, wall: 'timber', roof: 'slate', storeys: 2, storeyH: 2.6 },
    { x: 40, z: -3, yaw: 0, w: 9, d: 6, wall: 'stone', roof: 'slate' },
    { x: -42, z: -2, yaw: 0.05, w: 8, d: 6, wall: 'timber', roof: 'thatch' },
    { x: 20, z: 23, yaw: -Math.PI / 2, w: 8, d: 6, wall: 'brick', roof: 'slate' },
    { x: -11, z: 36, yaw: Math.PI / 2, w: 8, d: 6, wall: 'timber', roof: 'thatch' },
    { x: 12, z: 50, yaw: -Math.PI / 2 - 0.05, w: 8, d: 6, wall: 'stone', roof: 'slate' },
    { x: -12, z: 54, yaw: Math.PI / 2 + 0.06, w: 9, d: 6.5, wall: 'stone', roof: 'thatch' },
    { x: -56, z: -12, yaw: Math.PI / 2 + 0.4, w: 7, d: 5.5, wall: 'dark', roof: 'thatch', lit: false },
  ];
  cottages.forEach((c, i) => {
    const b = makeBuilding(world, M, { name: 'cottage' + i, smoke: c.lit !== false && i % 2 === 0, ...c, lockedMsg: ['Locked. The curtains twitch, or perhaps it is the candle.', 'Locked. A radio is playing very quietly inside, or perhaps it is the wind.', 'Locked. Nobody answers.', 'Locked. Through the letterbox: a hall, a coat, a lantern hook with no lantern.'][i % 4] });
    pumpkinsAtDoor(world, M, b, i % 3 === 0 ? 1 : 2);
  });
  // the smithy: dark, with a cold forge and a sign
  const smithy = makeBuilding(world, M, { name: 'smithy', x: 13, z: 31, yaw: -Math.PI / 2, w: 8, d: 6, wall: 'dark', roof: 'slate', lit: false, chimneys: [2.5], lockedMsg: 'Locked. Through the grimy glass: an anvil, a cold forge, and a row of new-forged lantern hooks, each as tall as a man.' });
  {
    const g = smithy.group;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), new THREE.MeshStandardMaterial({ map: tex.smithySign, roughness: 0.9 }));
    sign.position.set(2.0, 2.6, 3.05); g.add(sign);
  }

  // ---------------- the church & churchyard ----------------
  const cy = CHURCHYARD;
  const church = makeChurch(world, M, 2, -52, cy.h);
  // churchyard wall with gaps at the south gate and the lych gate
  const gapS = 1.7, gapN = 1.7;
  stoneWall(world, M, [[cy.x0, cy.z1], [-gapS, cy.z1]]);
  stoneWall(world, M, [[gapS, cy.z1], [cy.x1, cy.z1]]);
  stoneWall(world, M, [[cy.x1, cy.z1], [cy.x1, cy.z0]]);
  stoneWall(world, M, [[cy.x1, cy.z0], [gapN, cy.z0]]);
  stoneWall(world, M, [[-gapN, cy.z0], [cy.x0, cy.z0]]);
  stoneWall(world, M, [[cy.x0, cy.z0], [cy.x0, cy.z1]]);
  // gate posts at the south gate
  for (const s of [-1, 1]) { const p = mkBox(0.5, 1.9, 0.5, M.stone, 1); p.position.set(s * (gapS + 0.25), ground(0, cy.z1) + 0.95, cy.z1); world.group.add(p); }
  lychGate(world, M, 0, cy.z0, 0);
  // path lanterns on the churchyard wall by the gate
  jackOLantern(world, M, -2.6, cy.z1, 0.3, 1.0, ground(0, cy.z1) + 1.16, 0);
  jackOLantern(world, M, 2.6, cy.z1, -0.3, 1.0, ground(0, cy.z1) + 1.16, 1);
  world.mark('churchyard_gate', 0, ground(0, cy.z1), cy.z1 + 1.5);

  // graves
  const graveRng = new RNG(77);
  const gravePositions = [];
  const tryGrave = (x, z, yaw, lines, opts) => { gravePositions.push([x, z]); return gravestone(world, M, x, z, yaw, lines, opts); };
  // east rows
  for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) {
    const x = 16 + r * 2.8 + graveRng.float(-0.3, 0.3), z = -62 + i * 3.0 + graveRng.float(-0.4, 0.4);
    if (Math.abs(z - (-52)) < 5 && x < 15) continue;
    tryGrave(x, z, graveRng.float(-0.15, 0.15), graveRng.pick(EPITAPHS), { type: graveRng.chance(0.2) ? 'cross' : 'tablet', lean: graveRng.float(-0.08, 0.08), seed: graveRng.int(1, 9999), h: graveRng.float(0.8, 1.2) });
  }
  // west rows (beyond the tower)
  for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) {
    const x = -22 + r * 2.8 + graveRng.float(-0.3, 0.3), z = -64 + i * 3.4 + graveRng.float(-0.4, 0.4);
    tryGrave(x, z, Math.PI + graveRng.float(-0.15, 0.15), graveRng.pick(EPITAPHS), { type: graveRng.chance(0.25) ? 'cross' : 'tablet', lean: graveRng.float(-0.1, 0.1), seed: graveRng.int(1, 9999), h: graveRng.float(0.8, 1.2) });
  }
  // south of the nave (between the path and the east wall)
  for (let i = 0; i < 5; i++) {
    const x = 2 + i * 2.6 + graveRng.float(-0.3, 0.3), z = -41 + graveRng.float(-0.6, 0.6);
    tryGrave(x, z, graveRng.float(-0.1, 0.1), graveRng.pick(EPITAPHS), { seed: graveRng.int(1, 9999), lean: graveRng.float(-0.06, 0.06) });
  }
  // Maud Hale's grave — beside the path to the porch
  tryGrave(-9.5, -41.5, 0.15, ['MAUD HALE', 'of Rook Lane', '1897 – 1961', 'She wrote the letters'], { clue: 'maud_grave', seed: 5, h: 1.05 });
  world.mark('maud_grave', -9.5, ground(-9.5, -41.5), -41.5);
  // the guests: a row along the north wall, east of the lych gate
  const guests = [['A GUEST', 'of this parish', 'departed', '1st November 1901'], ['A GUEST', 'of this parish', 'departed', '1st November 1926'], ['A GUEST', 'of this parish', 'departed', '1st November 1951'], ['A GUEST', 'of this parish', 'departed', '1st November 1976'], ['A GUEST', 'of this parish', 'departed', '1st November 2001']];
  guests.forEach((lines, i) => tryGrave(5.5 + i * 2.4, -65.2, Math.PI, lines, { clue: i === 4 ? 'guest_graves' : undefined, seed: 100 + i, w: 0.6, h: 0.9 }));
  // the fresh one, with an open grave in front of it
  world.freshGrave = tryGrave(18.2, -65.2, Math.PI, ['A GUEST', 'of this parish', 'departed', '1st November 2026'], { clue: 'fresh_grave', fresh: true, seed: 999, w: 0.62, h: 0.92 });
  openGrave(world, M, 18.2, -63.4, Math.PI);
  world.mark('fresh_grave', 18.2, ground(18.2, -63.4), -63.4);
  world.gravePositions = gravePositions;

  // ---------------- the square ----------------
  well(world, M, 0, 4);
  noticeBoard(world, M, 9.5, 12.5, -Math.PI / 2 - 0.4);
  bench(world, M, -6, 9, Math.PI / 4 + Math.PI / 2 + 0.3);
  bench(world, M, 6.5, -1, -Math.PI / 4 - Math.PI / 2 - 0.3);
  cart(world, M, -9.5, 14, 0.5);
  trough(world, M, 10, -4, 0.2);
  logPile(world, M, -16, 6, 0.3);
  logPile(world, M, 25, 12, -0.4);
  jackOLantern(world, M, 1.05, 4.6, 0.6, 0.7, ground(0, 4) + 0.9, 2);
  jackOLantern(world, M, -1.0, 3.2, -1.8, 0.7, ground(0, 4) + 0.9, 0);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; const r = 6.5; jackOLantern(world, M, Math.cos(a) * r, 4 + Math.sin(a) * r, -a + Math.PI / 2, 0.9 + (i % 2) * 0.2, null, i % 3); }

  // ---------------- street lamps ----------------
  const lamps = [[3.6, 44], [-3.6, 30], [3.6, 16], [-4.2, -2], [3.8, -14], [-3.8, -26], [3.4, -34.5], [-12.5, -5], [12.5, 15.5], [-12.5, 16], [20, 11], [44, 11], [-24, 11], [-46, 11], [-20, -30], [-6, -44]];
  for (const [x, z] of lamps) lampPost(world, M, x, z, true);
  // one dead lamp on Rook Lane
  lampPost(world, M, -40, -8, false);

  // ---------------- the road in: walls, lanterns, signs ----------------
  stoneWall(world, M, [[5.5, 128], [5.5, 100], [6, 76], [6, 62]], 1.0);
  stoneWall(world, M, [[-5.5, 130], [-5.5, 104], [-6, 80], [-6, 64]], 1.0);
  for (let i = 0; i < 7; i++) { const z = 132 - i * 12; hangingLantern(world, M, (i % 2 ? -4.6 : 4.6), z, true); }
  hangingLantern(world, M, -3.2, 58, true); hangingLantern(world, M, 3.4, 52, true);
  signpost(world, M, 4.2, 58, [{ text: 'ASHCOMBE', angle: Math.PI / 2 }, { text: 'ROOK LANE', angle: Math.PI * 0.8 }, { text: 'BRIDGWATER 9', angle: -Math.PI / 2 }]);
  {
    const x = 6.2, z = 104, y = ground(x, z);
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -0.2; world.group.add(g);
    for (const s of [-1, 1]) { const post = mkBox(0.1, 2.3, 0.1, M.woodDark, 1); post.position.set(s * 0.9, 1.15, 0); g.add(post); }
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.95, 0.06), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, new THREE.MeshStandardMaterial({ map: tex.villageSign, roughness: 0.9 }), M.woodDark]);
    board.position.set(0, 1.8, 0); g.add(board);
    world.colliders.addOBB(x, z, 1.0, 0.1, 0.2, 'sign');
  }
  world.mark('start', 0, ground(0, 128), 128);

  // ---------------- Rook Lane ----------------
  fence(world, M, [[-20, 4], [-34, -6], [-48, -14], [-60, -20]], 1.0);
  fence(world, M, [[-26, 12], [-40, 2], [-54, -8], [-66, -14]], 1.0);
  hangingLantern(world, M, -30, -0.5, true); hangingLantern(world, M, -50, -13, true); hangingLantern(world, M, -64, -21, true);
  jackOLantern(world, M, -63, -23.5, 0.5, 1.1, null, 1);

  // ---------------- the east field with scarecrows ----------------
  fence(world, M, [[28, 26], [64, 26], [64, 60], [28, 60], [28, 47]], 1.0);
  fence(world, M, [[28, 41], [28, 26]], 1.0);
  scarecrow(world, M, 36, 34, 0.4); scarecrow(world, M, 48, 40, -0.6); scarecrow(world, M, 41, 52, 2.4); scarecrow(world, M, 57, 47, 1.3);
  // pumpkin patch
  const patch = new RNG(9);
  for (let i = 0; i < 14; i++) { const x = 30 + patch.float(0, 32), z = 28 + patch.float(0, 30); if (Math.hypot(x - 36, z - 34) < 2) continue; jackOLantern(world, M, x, z, patch.float(0, 6.28), patch.float(0.6, 1.1), null, patch.int(0, 2)); }

  // ---------------- the marsh and the stones ----------------
  const stones = [];
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, r = 7.2;
    const x = 16 + Math.cos(a) * r, z = -120 + Math.sin(a) * r;
    stones.push(standingStone(world, M, x, z, 2.3 + (i % 3) * 0.5, a + Math.PI / 2, i + 1));
  }
  const altar = mkBox(2.4, 0.7, 1.2, M.stoneDark, 1.5); altar.position.set(16, ground(16, -120) + 0.35, -120); altar.rotation.y = 0.3; world.group.add(altar);
  world.colliders.addOBB(16, -120, 1.2, 0.6, -0.3, 'altar');
  world.mark('stones', 16, ground(16, -120), -120);
  world.stones = stones;
  // causeway lanterns: dark until the Vigil begins
  const cw = [[1.6, -76], [-1.2, -84], [4.6, -92], [7.2, -100], [12.2, -106], [15.8, -113]];
  world.causewayLanterns = cw.map(([x, z], i) => hangingLantern(world, M, x, z, false, 2.4));
  // tall iron lantern hooks around the stones (the smith's work)
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + 0.35, r = 10.5;
    const x = 16 + Math.cos(a) * r, z = -120 + Math.sin(a) * r;
    const h = hangingLantern(world, M, x, z, false, 3.0);
    world.causewayLanterns.push(h);
  }

  // south gate of the churchyard: an iron gate standing open (two leaves)
  for (const s of [-1, 1]) {
    const gate = new THREE.Group(); gate.position.set(s * gapS, ground(0, cy.z1), cy.z1); gate.rotation.y = s * 1.9; world.group.add(gate);
    for (let i = 0; i < 6; i++) { const bar = mkBox(0.03, 1.5, 0.03, M.iron, 1); bar.position.set(-s * (0.12 + i * 0.28), 0.8, 0); gate.add(bar); }
    for (const y of [0.25, 1.4]) { const rail = mkBox(1.6, 0.04, 0.04, M.iron, 1); rail.position.set(-s * 0.85, y, 0); gate.add(rail); }
  }
  return { pub, school, vicarage, widow, maud, church };
}
