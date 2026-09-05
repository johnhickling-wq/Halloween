// The mystery of Ashcombe: clues, acts, scripted events and endings.
import * as THREE from 'three';
import { terrainHeight, WATER_LEVEL } from './world/terrain.js';

export const CLUES = {
  letter: {
    title: 'A letter, postmarked Ashcombe', kind: 'hand', at: null,
    text: `Rook Lane, Ashcombe
the 14th of October

My dear {name},

You will not remember me. I am your grandmother's sister, and I have not had the courage to write in all these years. I am old now, and there are things that ought to be said to you face to face, and one thing that ought to be put into your hands before I go.

Come to Ashcombe on the last night of October. Come after dark — the roads are quiet then, and the village keeps early hours. Follow the lanterns from the road; they will be lit for you. My cottage is the last on Rook Lane. The door will be open.

Do not stop to speak to anyone on the way.

Your loving aunt,
Maud`,
    journal: 'The letter that brought me here. I never knew I had a great-aunt. The lanterns were lit, as promised. Nobody is about.',
  },
  notice: {
    title: 'Parish notice', kind: 'type', at: [9.5, 12.5],
    text: `PARISH OF ASHCOMBE
ALL HALLOWS' EVE — THE VIGIL

All parishioners will assemble at the lych gate at the eleventh hour, bearing lanterns.

Doors are to be left unlocked. Fires are to be left burning. Lanterns are to be set at every step, so that our guest may find the way.

No person is to remain within the village bounds after the bell.

There will be no exceptions. Those who are absent will be counted, as they were counted in 1901.

By order of the Parish Council
J. Whitlock, Chairman`,
    thought: 'The whole village has gone somewhere. A "Vigil", at the lych gate beyond the church, at eleven. Every door unlocked, every fire left burning, every lantern lit... for a guest.',
    journal: 'Everyone has gone to a "Vigil" at the lych gate, north of the church, at eleven o\'clock. They left the fires burning and the lanterns lit for a guest. I am the only stranger here.',
  },
  pub_ledger: {
    title: 'The Hanged Man — Visitors\' Book', kind: 'hand', at: [22, -2],
    text: `<s>31st Oct. 1876 — Mr. R. Vance, of Taunton — Room 2 — departed 1st Nov.</s>
31st October 1901 — Mr. T. Ashby, commercial traveller, of Bristol — Room 2 — <em>departed 1st Nov.</em>
31st October 1926 — Miss E. Cole, of London — Room 2 — <em>departed 1st Nov.</em>
31st October 1951 — Cpl. J. Ferris, on leave — Room 2 — <em>departed 1st Nov.</em>
31st October 1976 — Mrs. A. Whitlock (née Pye) — Room 2 — <em>departed 1st Nov.</em>
31st October 2001 — Mr. D. Okafor, of Leeds — Room 2 — <em>departed 1st Nov.</em>
31st October 2026 — {name} — Room 2 — <span class="blank"></span>`,
    thought: 'One guest every twenty-five years. Always the thirty-first of October. Always "departed" the next morning. The last line is in fresh ink, and it has my name on it. I have not booked a room.',
    journal: 'The inn takes one guest every twenty-five years, always on the 31st of October, always "departed" the next day. The newest entry is mine. Room 2 is kept ready.',
  },
  blackboard: {
    title: 'The blackboard', kind: 'chalk', at: [-22, -3],
    text: `Why we keep the Vigil

1. Because of the Pestilence, 1626.
2. Because of the Promise.
3. Because he is patient.

Homework: do not look at him.`,
    thought: 'Chalk. A child\'s lesson, set out like the catechism. He is patient. Do not look at him.',
    journal: 'The children are taught the Vigil like scripture: the Pestilence of 1626, a Promise, and someone — something — that is patient. They are told not to look at him.',
  },
  drawings: {
    title: 'Children\'s drawings', kind: 'crayon', at: [-22, -3],
    text: `Crayon on sugar paper, pinned in a row.

A line of small figures with yellow lanterns walks towards a ring of grey stones. The moon is enormous. Behind them, taller than the houses, taller than the church, a thin black figure with a white head and no face.

Underneath, in a careful hand:

THE TALLOW MAN COMES FOR THE GUEST
SO HE DOESNT COME FOR US`,
    thought: 'Every child in this room has drawn the same thing. They draw him the way other children draw the postman.',
    journal: 'The children draw a tall figure with a white, faceless head — "the Tallow Man". He comes for the guest so that he does not come for them.',
  },
  maud_photo: {
    title: 'A photograph on the mantel', kind: 'print', at: [-70, -30],
    text: `A woman in her sixties, stern and straight-backed, standing before this cottage in a summer that must be seventy years gone. Someone has kept the frame polished.

On the back, in pencil, in the same hand as the letter in your pocket:

<i>Maud Hale — Rook Lane — 1959. Do not forget what we owe.</i>`,
    thought: 'It is the same hand. The same loops, the same way of crossing a T. She wrote to me a fortnight ago... didn\'t she?',
    journal: 'Maud Hale was real, and this was her cottage. The handwriting on the photograph is the same as the letter — but the photograph is seventy years old.',
  },
  maud_draft: {
    title: 'A letter, unfinished', kind: 'hand', at: [-70, -30],
    text: `Rook Lane, Ashcombe
the 14th of October

My dear <s>Daniel</s> <s>Anne</s> <s>Christopher</s> {name},

You will not remember me. I am your grandmother's sister, and I have not had the courage to write in all these years —

<i>(the same sentence, copied out eleven times, the loops growing surer with every attempt)</i>

— follow the lanterns from the road; they will be lit for you. My cottage is the last on Rook Lane. The door will be open. Do not stop to speak to anyone on the way.

<i>(and beneath, in a different, hurried hand:)</i>

Practise the M. Hers was rounder. The Council want it posted by Friday.`,
    thought: 'Someone sat at this desk two weeks ago and learned to write like a dead woman. They tried other names before they settled on mine.',
    journal: 'Someone forged the letter in Maud\'s hand, at her own desk, on the Parish Council\'s instruction. They tried three other names before mine. I was chosen.',
  },
  maud_grave: {
    title: 'A headstone by the path', kind: 'carved', at: [-9.5, -41.5],
    text: `MAUD HALE
of Rook Lane
1897 – 1961

She wrote the letters`,
    thought: '1961. Sixty-five years dead. "She wrote the letters" — plural. How many of them did she write, before someone else had to learn her hand?',
    journal: 'Maud Hale died in 1961. My "aunt" has been dead for sixty-five years. She wrote the letters — she was the one who used to lure the guests here.',
  },
  guest_graves: {
    title: 'A row of plain stones', kind: 'carved', at: [12, -65],
    text: `A GUEST OF THIS PARISH — departed 1st November 1901
A GUEST OF THIS PARISH — departed 1st November 1926
A GUEST OF THIS PARISH — departed 1st November 1951
A GUEST OF THIS PARISH — departed 1st November 1976
A GUEST OF THIS PARISH — departed 1st November 2001

No names. The parish did not think the guests needed them.`,
    thought: 'Five stones, twenty-five years apart, and every one of them departed on the morning after the Vigil. There is room at the end of the row for a sixth.',
    journal: 'Five nameless guests are buried along the north wall, each "departed" on the 1st of November, twenty-five years apart. The next date in the sequence is tomorrow.',
  },
  fresh_grave: {
    title: 'A new stone', kind: 'carved', at: [18.2, -65],
    text: `{NAME}
A GUEST OF THIS PARISH
departed
1st November 2026

The grave in front of it has been dug this evening. The spade is still wet. The earth is heaped ready.`,
    thought: 'They have carved my name. They have dug my grave. They knew I would come, because they wrote the letter that brought me.',
    journal: 'My headstone is already carved and my grave is already dug, along the north wall with the other guests. The date on it is tomorrow.',
  },
  well: {
    title: 'The well', kind: 'print', at: [0, 4],
    text: `The water is a long way down and does not reflect the lantern.

Names are scratched into the stone of the rim, dozens of them, one over another, some so old they are only the ghosts of letters:

<i>T. Ashby. E. Cole. J. Ferris. A. Whitlock. D. Okafor.</i>

And freshly cut, the stone still pale in the grooves:

<i>{name}</i>`,
    thought: 'The same names as the visitors\' book. Someone in this village has already scratched mine into the stone, and they did it with care.',
    journal: 'The guests\' names are scratched into the rim of the well — T. Ashby, E. Cole, J. Ferris, A. Whitlock, D. Okafor — and mine, cut fresh this week.',
  },
  vicar_diary: {
    title: 'The diary of the Reverend Thomas Ashdown', kind: 'hand', at: [-38, -40],
    text: `October the 30th.

I have preached against it for thirty-one years, and for thirty-one years they have nodded in their pews and gone up to the stones regardless. Tomorrow at eleven I am to ring the bell, as every rector before me has rung it, and the guest will hear it and follow the lanterns, as guests always do. The bell is a summons. It has always been a summons. The dead woman's letter only gets them as far as the village.

But I have found something in the old register that the Council do not know I have read.

In 1726 the guest — a tinker named Wray — did not go to the stones. He came into the church instead, and he rang the bell himself, with his own hands, three times; and the thing in the marsh could not abide it. It withdrew. Ashcombe lost no one that year. And in the spring the Council hanged Wray for the failure of the Vigil, and the inn has borne his likeness on its sign ever since.

A refusal, then. That is all it has ever taken. A guest who will not be led.

God forgive me, I will ring the bell at eleven. I have not the courage for anything else. But I have left the tower unlocked, and I have written this where a stranger might find it.`,
    thought: 'The bell is a summons — but a guest once rang it back, three times, and the thing withdrew. The vicar has left the tower unlocked. So there is a choice, if I am brave enough to make it.',
    journal: 'The Reverend Ashdown\'s diary: the bell is a summons, rung by the rector. But in 1726 the guest, Wray, rang the bell himself — three times — and the thing in the marsh withdrew. The tower is unlocked. "A guest who will not be led."',
  },
  register: {
    title: 'The Parish Register, 1626', kind: 'print', at: [10, -52],
    text: `<i>In this yeare the Pestilence tooke eleven score of this parish, and the Reverend Master Hallam went oute to the stones in the marsh on the Eve of All Hallowes, and there made the Promise: that the parish should keepe the Vigil every five-and-twentieth yeare, and give unto the marsh its Guest, being a stranger led hither and not of our blood; and the Pestilence departed from us that same night.</i>

<i>And the people did name the thing that came for the Guest the Tallow Man, for the whiteness of his head; and they were bid not to looke upon him.</i>

Four hundred years of entries follow. The last, in fresh ink, reads only: <i>2026 — {name}.</i>`,
    thought: 'Four hundred years to the night. They have kept their promise sixteen times. I am the seventeenth.',
    journal: 'The register: in 1626 the rector promised the marsh a stranger every twenty-five years, and the plague ended. The parish has kept its promise sixteen times. Tonight is the four-hundredth anniversary.',
  },
  widow_note: {
    title: 'A note on the table', kind: 'hand', flavour: true,
    text: `Gone up to the Vigil. Supper is in the oven for after — don't wait up, and don't go looking.

If the guest knocks, be polite, and point them north.

— Mother`,
    thought: 'Be polite. Point them north.',
  },
};

export const TOTAL_CLUES = Object.keys(CLUES).filter(k => !CLUES[k].flavour && k !== 'letter').length;

export class Story {
  constructor(game) {
    this.g = game;
    this.clues = CLUES;
    this.name = 'Alice Marlow';
    this.found = [];
    this.newClues = new Set();
    this.act = 0;
    this.flags = {};
    this.timers = [];
    this.actTime = 0;
    this.startTime = 0;
    this.bellRings = 0;
    this.ending = null;
    this.objectiveText = '';
  }
  get clueCount() { return this.found.filter(id => !this.clues[id].flavour && id !== 'letter').length; }
  after(secs, fn) { this.timers.push({ t: secs, fn }); }
  objective(text) { this.objectiveText = text; this.g.ui.objective(text); }

  begin(name) {
    this.name = name || this.name;
    this.startTime = this.g.time;
    this.act = 1; this.actTime = 0;
    this.found.push('letter');
    this.g.ui.clues(0, TOTAL_CLUES);
    this.objective('Follow the lanterns into Ashcombe. Aunt Maud\'s cottage is the last house on Rook Lane.');
    this.after(3, () => this.g.ui.say('The clock on the church tower says a quarter to eleven. Every window in the village is lit.', 6));
    this.after(10, () => this.g.ui.say('No one is about.', 3));
  }

  // ---------------- interactions ----------------
  handle(action, mesh) {
    const g = this.g, ui = g.ui, au = g.audio;
    if (!action) return;
    switch (action.type) {
      case 'clue': this.readClue(action.id, mesh); break;
      case 'door': {
        const d = action.door;
        if (d.locked) { au.doorLocked(this.meshPos(mesh)); ui.say(d.lockedMsg || 'Locked.', 3.5); this.onLockedDoor(d); }
        else { d.toggle(); au.door(d.open, this.meshPos(mesh)); this.onDoor(d); }
        break;
      }
      case 'locked': au.doorLocked(this.meshPos(mesh)); ui.say(action.msg || 'Locked.', 3.5); break;
      case 'flavour': au.paper(); ui.showNote({ title: action.title || 'You look closer', kind: action.kind || 'print', text: action.text, thought: action.thought }, this.name); break;
      case 'bell': this.ringBell(); break;
    }
  }
  meshPos(mesh) { const v = new THREE.Vector3(); if (mesh) mesh.getWorldPosition(v); else v.copy(this.g.player.pos); return v; }

  readClue(id, mesh) {
    const c = this.clues[id];
    if (!c) return;
    const g = this.g;
    g.audio.paper();
    g.ui.showNote(c, this.name);
    if (!this.found.includes(id)) {
      this.found.push(id);
      if (!c.flavour) {
        this.newClues.add(id);
        g.ui.clues(this.clueCount, TOTAL_CLUES);
        g.ui.toast('Added to your journal', 2.5);
      }
      this.onClueFound(id);
    }
  }

  onClueFound(id) {
    const g = this.g;
    if ((id === 'maud_photo' || id === 'maud_draft') && this.act === 1) {
      this.act = 2; this.actTime = 0;
      this.after(1.5, () => this.objective('Maud is not here, and the letter was not hers. Search the village for answers before the clock strikes eleven.'));
      this.after(2.5, () => g.ui.say('The door behind you swings shut in a draught that does not exist.', 4.5));
      this.after(2.5, () => { if (g.village.maud.door) { g.village.maud.door.setOpen(false); g.audio.door(false, g.village.maud.door.leaf.getWorldPosition(new THREE.Vector3())); } });
      this.flags.firstSightingPending = true;
    }
    if (id === 'fresh_grave') {
      this.after(2, () => g.entities.tallow.appearAt(20, -84, { moves: 1 }));
      this.after(2.5, () => g.audio.stingerLow());
    }
    if (id === 'widow_note') { this.after(3, () => { g.audio.doorSlamFar(); g.ui.say('Somewhere in the village, a door slams.', 3, true); }); }
    if (id === 'vicar_diary' && this.act >= 3) this.objective('The bell has rung for you. The lanterns lead north through the lych gate into the marsh — or the church stands open, and Wray rang the bell three times.');
    if (id === 'vicar_diary') this.flags.knowsBell = true;
    if (id === 'blackboard' || id === 'drawings') { this.after(4, () => g.entities.crows.scatterNear(g.player.pos, 40)); }
    if (this.act === 2 && this.clueCount >= 6 && !this.flags.elevenScheduled) { this.flags.elevenScheduled = true; this.flags.elevenWhenOutside = true; }
  }

  onDoor(d) {
    const g = this.g;
    if (d.name === 'maud-door' && !this.flags.enteredMaud) {
      this.flags.enteredMaud = true;
      g.ui.say('The door is open, as promised. The cottage is dark and cold. No fire has been lit here in a very long time.', 6);
    }
    if (d.name === 'church-door' && d.open && !this.flags.churchEntered) {
      this.flags.churchEntered = true;
      g.ui.say('Candles burn the length of the nave. The rope of the great bell hangs in the tower to the left.', 6);
    }
    if (d.name === 'lych-gate' && d.open && !this.flags.lychOpened) {
      this.flags.lychOpened = true;
      g.ui.say('Beyond the gate, the path drops into the marsh. Lanterns hang all along it, newly lit.', 5);
      g.audio.whisperBurst();
    }
  }
  onLockedDoor(d) {
    if (d.name === 'lych-gate' && !this.flags.lychTried) { this.flags.lychTried = true; this.g.ui.say('Something in the marsh beyond breathes out, very slowly.', 4, true); this.g.audio.whisperBurst(); }
  }

  // ---------------- act 3: the bell ----------------
  strikeEleven() {
    if (this.act >= 3) return;
    const g = this.g;
    this.act = 3; this.actTime = 0;
    g.ui.sayNow('The church clock strikes eleven.', 4, true);
    const bellPos = g.world.labels.get('bell');
    const bp = new THREE.Vector3(bellPos.x, bellPos.y + 14, bellPos.z);
    for (let i = 0; i < 11; i++) this.after(0.5 + i * 3.1, () => { g.audio.bell(bp, 1.0); g.lampFlicker = 1.0; });
    this.after(9, () => g.ui.say('Far to the north, beyond the lych gate, lanterns are being lit one by one.', 6));
    this.after(4, () => {
      // unlock the gate and the church, light the causeway
      if (g.world.lychGate) { g.world.lychGate.locked = false; if (g.world.lychGate.chain) g.world.lychGate.chain.visible = false; g.world.lychGate.lockedMsg = ''; }
      if (g.world.church) g.world.church.door.locked = false;
      const L = g.world.causewayLanterns || [];
      L.forEach((l, i) => this.after(1 + i * 1.4, () => { l.light.on = true; l.light.intensity = 3.5; l.mat.emissive.setHex(0xffa040); }));
    });
    this.after(20, () => g.entities.villagers.show());
    this.after(36, () => {
      const base = 'The bell has rung for you. The lanterns lead north through the lych gate into the marsh — or the church door stands open, and the bell rope hangs in the tower.';
      this.objective(this.flags.knowsBell ? base + ' Wray rang it three times.' : base);
    });
    this.after(40, () => g.ui.say('Whispering, from the direction of the marsh. It might be the reeds.', 5, true));
    g.fx.wisps.intensity = 1.8;
    g.entities.tallow.stalking = true;
    g.entities.scarecrows.vanishOne();
  }

  ringBell() {
    const g = this.g;
    if (this.ending) return;
    this.bellRings++;
    const bellPos = g.world.labels.get('bell');
    const bp = new THREE.Vector3(bellPos.x, bellPos.y + 14, bellPos.z);
    g.audio.bell(bp, 1.3);
    g.lampFlicker = 1.0;
    if (g.world.bellRope) { g.world.bellRope.pull = 1; }
    if (this.bellRings === 1) g.ui.sayNow('The rope is heavier than you expected. Somewhere above, the great bell swings and speaks.', 4);
    if (this.bellRings === 2) g.ui.sayNow('Again. The whole tower hums with it. Out in the marsh, the whispering has stopped.', 4);
    if (this.bellRings >= 3) this.endBell();
  }

  // ---------------- update ----------------
  update(dt) {
    const g = this.g;
    this.actTime += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); } }
    if (this.ending) { this.updateEnding(dt); return; }
    const p = g.player.pos;
    const outside = !g.player.inside;
    // arrival events
    if (this.act === 1) {
      if (!this.flags.enteredVillage && p.z < 62) {
        this.flags.enteredVillage = true;
        const bellPos = g.world.labels.get('bell');
        g.audio.bell(new THREE.Vector3(bellPos.x, bellPos.y + 14, bellPos.z), 0.7);
        g.ui.say('A single bell, somewhere ahead. Then nothing.', 4, true);
        this.after(1.5, () => g.entities.crows.scatterNear(new THREE.Vector3(0, 0, 40), 30));
      }
      if (!this.flags.reachedGreen && Math.hypot(p.x, p.z - 4) < 16) { this.flags.reachedGreen = true; g.ui.toast('THE VILLAGE GREEN', 4); g.ui.say('Pumpkins on every step. A notice board by the well. Rook Lane must be one of these lanes to the west.', 6); }
      if (!this.flags.rookLane && p.x < -28 && p.z < 4 && p.z > -16) { this.flags.rookLane = true; g.ui.toast('ROOK LANE', 4); g.ui.say('The lane narrows between the hedges. The last lamp is out.', 5); }
      if (!this.flags.churchyardEarly && p.z < -33 && Math.abs(p.x) < 30) { this.flags.churchyardEarly = true; g.ui.say('The church door is shut. The graveyard is very full for so small a village.', 5); }
    }
    if (this.act === 2) {
      if (this.flags.firstSightingPending && outside && p.x > -60) {
        this.flags.firstSightingPending = false;
        // stand him far down Rook Lane, toward the village, where the player must walk
        g.entities.tallow.appearAt(-30, -1, { moves: 2, minDist: 16 });
      }
      // the clock strikes eleven when enough has been learned (and the player is outdoors), or eventually anyway
      if ((this.flags.elevenWhenOutside && outside) || this.actTime > 14 * 60) this.strikeEleven();
    }
    if (this.act === 3) {
      // the stones
      const ds = Math.hypot(p.x - 16, p.z + 120);
      if (ds < 5.5) this.endStones();
      if (!this.flags.nearStones && ds < 22) { this.flags.nearStones = true; g.ui.say('They are all here. Every soul in Ashcombe, in a ring, with their lanterns, and their backs to you.', 6); g.audio.whisperBurst(); }
      if (!this.flags.onCauseway && p.z < -75 && p.z > -100) { this.flags.onCauseway = true; g.ui.say('The path is barely wider than your feet. The water on either side is black and does not move.', 5); }
    }
  }

  // ---------------- endings ----------------
  endStones() {
    if (this.ending) return;
    const g = this.g;
    this.ending = { type: 'stones', t: 0 };
    g.player.frozen = true;
    g.entities.villagers.raise();
    g.entities.tallow.beginApproach(new THREE.Vector3(16 + 14, -3, -120 - 8), g.player);
    g.audio.stingerLow(); g.audio.whisperBurst();
    g.fear = 1;
    g.ui.sayNow('As one, they raise their lanterns.', 3.5);
    this.after(4, () => g.ui.say('The water beyond the far stones begins to rise, as though something very tall were standing up in it.', 6));
    this.after(11, () => g.ui.say('Do not look at him.', 3));
    this.after(15, () => g.ui.say('You look.', 2.5));
  }
  endBell() {
    if (this.ending) return;
    const g = this.g;
    this.ending = { type: 'bell', t: 0 };
    g.player.frozen = true;
    g.entities.tallow.vanish();
    g.entities.tallow.stalking = false;
    g.audio.stopWhispers();
    this.after(3, () => g.ui.sayNow('The third stroke rolls out over the roofs and the reeds and the black water, and does not stop rolling.', 6));
    this.after(7, () => { g.audio.exhale(); g.ui.say('Far away, something in the marsh breathes out for the last time.', 5, true); });
    const L = g.world.causewayLanterns || [];
    L.forEach((l, i) => this.after(8 + i * 0.6, () => { l.light.on = false; l.mat.emissive.setHex(0x000000); }));
    this.after(14, () => { g.dawn = true; g.audio.birds(); g.ui.say('Beyond the tower windows the sky is turning grey. It is a long time since you saw a sky do that.', 6); });
    this.after(30, () => this.finish('THE REFUSAL', `Wray's bell rang out three times across the marsh, for the first time in three hundred years, and the thing that waited among the stones found that it could not abide it.

By dawn the fog had gone. The villagers of Ashcombe were found standing in their circle with their lanterns burnt out, quite silent, and would not say what they had seen. Their guest had walked out along the Bridgwater road before first light and did not look back.

The parish register for 2026 has a single line, in a stranger's hand: <i>Rang it myself.</i>

The inn has since changed its name.`));
  }
  updateEnding(dt) {
    const g = this.g;
    const e = this.ending; e.t += dt;
    if (e.type === 'stones') {
      g.fear = 1;
      if (g.entities.tallow.arrived && !e.done) {
        e.done = true;
        g.dark = 1; g.audio.exhale(); g.audio.stopWhispers();
        this.after(2.5, () => this.finish('THE GUEST', `The parish register for 2026 records one guest, departed the first of November.

The villagers of Ashcombe walked home before dawn with their lanterns out, and slept until noon, and did not speak of it. The Hanged Man opened at six. Room 2 was made up fresh.

The stone along the north wall needed no alteration. They had carved it with care.

In twenty-five years there will be another letter.`));
      }
    }
  }
  finish(title, text) {
    const g = this.g;
    if (this.finished) return;
    this.finished = true;
    const mins = Math.max(1, Math.round((g.time - this.startTime) / 60));
    g.ui.fade(true, 'fast');
    setTimeout(() => {
      g.ui.showEnding(title, text.replace(/\n/g, '<br>'), `${this.clueCount} of ${TOTAL_CLUES} clues found · ${mins} minute${mins === 1 ? '' : 's'} in Ashcombe`);
      g.input.unlock();
      g.audio.fadeOut(4);
    }, 900);
  }
}
