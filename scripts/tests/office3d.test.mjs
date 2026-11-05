import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Agent } from '../control/office3d/agents.js';
import { ACTIVITIES, activityFor, initialPrefs, pickIdle, ROLE_WORK, stepsTo } from '../control/office3d/behavior.js';
import { DESKS, SPOTS, standPoint } from '../control/office3d/layout.js';
import { blockAround, buildGrid, findPath } from '../control/office3d/nav.js';

const grid = buildGrid();
const places = [...DESKS.map((d) => ({ id: d.agent, ...d.approach })), ...SPOTS.map((s) => ({ id: s.id, ...standPoint(s) }))];

describe('3D office floor plan and walking', () => {
  it('gives every agent its own desk, and every place a walkable spot to stand', () => {
    assert.equal(new Set(DESKS.map((d) => d.agent)).size, 11);
    for (const p of places) assert.ok(grid.walkable(p.x, p.z), `${p.id} is not walkable`);
  });

  it('finds a path between every pair of places that never crosses furniture', () => {
    for (const a of places) {
      for (const b of places) {
        if (a === b) continue;
        const path = findPath(grid, a, b);
        assert.ok(path, `no path ${a.id} -> ${b.id}`);
        for (let i = 1; i < path.length; i++) {
          const p = path[i - 1];
          const q = path[i];
          const n = Math.ceil(Math.hypot(q.x - p.x, q.z - p.z) / 0.05);
          for (let k = 1; k < n; k++) {
            const t = k / n;
            assert.ok(grid.walkable(p.x + (q.x - p.x) * t, p.z + (q.z - p.z) * t), `${a.id} -> ${b.id} crosses a blocked cell`);
          }
        }
      }
    }
  });

  it('walks round someone standing in the way', () => {
    const from = { x: -8.3, z: -1.0 };
    const to = { x: -2.1, z: -1.0 };
    const blocker = { x: -5.2, z: -1.0 };
    const path = findPath(grid, from, to, blockAround(grid, [blocker]));
    assert.ok(path);
    const near = Math.min(...path.map((p) => Math.hypot(p.x - blocker.x, p.z - blocker.z)));
    assert.ok(near > 0.4, `path passes ${near.toFixed(2)} m from the blocker`);
  });
});

describe('3D office behaviour rules', () => {
  it('maps real states to work, and leaves idle agents free to choose', () => {
    assert.equal(activityFor('working', 'developer'), 'coding');
    assert.equal(activityFor('working', 'evaluator'), 'analyzing');
    assert.equal(activityFor('working', 'coordinator'), 'planning');
    assert.equal(activityFor('working', 'outreach'), 'writing');
    assert.equal(activityFor('researching', 'researcher'), 'researching');
    for (const s of ['waiting', 'error', 'success', 'paused']) assert.equal(activityFor(s, 'sales'), s);
    assert.equal(activityFor('idle', 'sales'), null);
    for (const [role, act] of Object.entries(ROLE_WORK)) assert.ok(ACTIVITIES[act], `${role} has no activity ${act}`);
    for (const a of ['coding', 'writing', 'analyzing', 'researching']) assert.equal(ACTIVITIES[a].place, 'desk');
    assert.ok(!ACTIVITIES.coding.ambient && ACTIVITIES.coffee.ambient);
  });

  it('orders steps so nothing conflicts', () => {
    assert.deepEqual(stepsTo({ place: 'coffee-1', pose: 'stand', holding: 'mug' }, { place: 'desk:sales', pose: 'sit' }), ['putDown', 'walk', 'face', 'sitDown', 'loop']);
    assert.deepEqual(stepsTo({ place: 'desk:sales', pose: 'sit', holding: null }, { place: 'window-1', pose: 'stand' }), ['standUp', 'walk', 'face', 'loop']);
    assert.deepEqual(stepsTo({ place: 'desk:sales', pose: 'sit', holding: null }, { place: 'desk:sales', pose: 'stand' }), ['standUp', 'face', 'loop']);
    assert.deepEqual(stepsTo({ place: 'desk:sales', pose: 'sit', holding: null }, { place: 'desk:sales', pose: 'sit' }), ['face', 'loop']);
  });

  it('respects cooldowns, taken places, and needs a partner to chat', () => {
    const now = 1_000_000;
    const recent = { coffee: now - 1000, window: now - 1000, lounge: now - 1000, meeting: now - 1000, huddle: now - 1000, stroll: now - 1000, shelf: now - 1000 };
    // everything was done a moment ago: it repeats something rather than sit at a desk, which is for work
    for (let i = 0; i < 20; i++) assert.ok(['coffee', 'window', 'lounge', 'stroll', 'shelf'].includes(pickIdle({ agent: 'sales', now, memory: recent, rand: () => i / 20 }).activity));
    const everywhere = new Set(SPOTS.filter((s) => s.kind !== 'desk').map((s) => s.id));
    assert.equal(pickIdle({ agent: 'sales', now, memory: recent, taken: everywhere }).activity, 'desk', 'only when there is nowhere at all to go');
    const taken = new Set(SPOTS.filter((s) => s.kind === 'coffee').map((s) => s.id));
    for (let i = 0; i < 50; i++) {
      const p = pickIdle({ agent: 'sales', now, taken, rand: () => (i % 10) / 10 + 0.05 });
      assert.notEqual(p.activity, 'coffee');
      assert.ok(!['meeting', 'huddle'].includes(p.activity), 'chose a chat with nobody to chat with');
    }
    const social = pickIdle({ agent: 'sales', now, partners: ['outreach'], memory: { coffee: now, window: now, lounge: now }, rand: () => 0.999 });
    if (['meeting', 'huddle'].includes(social.activity)) assert.ok(social.partner && social.partnerSpot && social.partnerSpot !== social.spot);
  });
});

// The controller with a stand-in character: it checks the rules, not the drawing.
function office() {
  const ch = () => ({
    actions: { Sitting: { time: 0, getClip: () => ({ duration: 1 }) } },
    sitNow() {},
    root: { position: { set() {} }, rotation: {} },
    play() {}, setWalkRate() {}, transition() { return new Promise(() => {}); }, gesture() { return Promise.resolve(); },
    setLayers(l) { this.layers = l; }, setFace() {}, holdMug(on) { this.mug = on; }, look: null,
  });
  const world = {
    agents: new Map(), claims: new Map(), grid, rig: { walkSpeed: 1.37 }, ambient: true, reduced: false, lastAmbient: -Infinity,
    spotsOf: (k) => SPOTS.filter((s) => s.kind === k), showCounterMug() {}, counterPoint: () => ({}), monitorPoint: () => ({}), displayPoint: () => ({}), headOf: (a) => a.pos, outside: () => ({}),
  };
  DESKS.forEach((d, index) => world.agents.set(d.agent, new Agent({ name: d.agent, index, character: ch(), world })));
  return world;
}

async function run(world, seconds, states = () => ({}), each = () => {}) {
  const dt = 1 / 30;
  for (let f = 0, clock = 0; f < seconds * 30; f++) {
    await null; // let gesture promises settle, as the browser would between frames
    clock += dt * 1000;
    const s = states(clock / 1000);
    for (const a of world.agents.values()) {
      a.setStatus(s[a.name] || 'idle', '', 'real', clock);
      a.update(dt, clock);
    }
    each(world, clock);
  }
}

describe('3D office agents', () => {
  it('sends agents to the right place for their real state', async () => {
    const world = office();
    const busy = { developer: 'working', researcher: 'researching', coordinator: 'working', sales: 'waiting', outreach: 'error', 'docs-handler': 'paused' };
    await run(world, 40, () => busy);
    const goal = (n) => world.agents.get(n).goal;
    assert.equal(goal('developer').key, 'coding@desk:developer');
    assert.equal(goal('developer').pose, 'sit');
    assert.equal(goal('researcher').key, 'researching@desk:researcher');
    assert.equal(goal('coordinator').key, 'planning@board');
    assert.equal(goal('sales').key, 'waiting@desk:sales');
    assert.equal(goal('sales').pose, 'stand');
    assert.equal(goal('outreach').activity, 'error');
    assert.match(goal('docs-handler').key, /^paused@sofa-\d$/);
    for (const n of ['developer', 'researcher', 'coordinator', 'sales', 'outreach', 'docs-handler']) assert.equal(world.agents.get(n).phase?.kind === 'walk', false, `${n} is still walking`);
  });

  it('never puts two agents in one place, and never types holding a mug', async () => {
    const world = office();
    let checked = 0;
    await run(world, 600, (t) => (t > 300 && t < 420 ? { developer: 'working', outreach: 'working', sales: 'researching' } : {}), (w) => {
      const owners = new Map();
      for (const a of w.agents.values()) {
        const id = a.goal?.spotId;
        if (id && a.phase?.kind === 'loop') {
          assert.ok(!owners.has(id), `${a.name} and ${owners.get(id)} share ${id}`);
          owners.set(id, a.name);
        }
        const loop = a.goal && ACTIVITIES[a.goal.activity].loop;
        if (a.phase?.kind === 'loop' && (loop === 'type' || loop === 'read')) assert.equal(a.holding, null, `${a.name} works holding a mug`);
        checked += 1;
      }
    });
    assert.ok(checked > 1000);
  });

  it('lets idle agents move about, but not all at once', async () => {
    const world = office();
    let most = 0;
    const went = new Set();
    await run(world, 600, () => ({}), (w) => {
      const walking = [...w.agents.values()].filter((a) => a.walking && a.goal?.why === 'idle').length;
      most = Math.max(most, walking);
      for (const a of w.agents.values()) if (a.goal?.why === 'idle' && a.goal.activity !== 'desk') went.add(a.goal.activity);
    });
    assert.ok(went.size >= 3, `only ${[...went].join(', ')}`);
    assert.ok(most <= 6, `${most} idle agents walking at once`);
  });

  it('stays at the desk when ambient movement is off', async () => {
    const world = office();
    world.ambient = false;
    await run(world, 120);
    for (const a of world.agents.values()) assert.equal(a.goal.key, `desk@desk:${a.name}`);
  });
});

describe('3D office: no work means no desk', () => {
  it('never picks the desk for free time while there is anywhere to go, partner or not', () => {
    const now = 5_000_000;
    for (let i = 0; i < 400; i++) {
      for (const agent of ['sales', 'developer', 'outreach', 'evaluator']) {
        const p = pickIdle({ agent, now, memory: i % 3 ? {} : { coffee: now, lounge: now }, partners: i % 2 ? ['marketing'] : [], rand: () => ((i * 37) % 100) / 100 });
        assert.notEqual(p.activity, 'desk', `${agent} chose the desk on draw ${i}`);
      }
    }
  });

  it('has every idle agent away from its desk within a minute, and keeps them out', async () => {
    const world = office();
    let atDesk = 0;
    await run(world, 300, () => ({}), (w, clock) => {
      if (clock < 60_000) return;
      for (const a of w.agents.values()) if (a.goal?.why === 'idle' && a.goal.activity === 'desk') atDesk++;
    });
    assert.equal(atDesk, 0, `${atDesk} agent-frames at a desk with no work`);
  });

  it('puts the agents with work at their desks while the others roam, and lets them out again when the work ends', async () => {
    const world = office();
    const working = { developer: 'working', researcher: 'researching' };
    const awayFromDesk = new Set();
    let developerLeft = false;
    await run(world, 400, (t) => (t < 200 ? working : {}), (w, clock) => {
      const t = clock / 1000;
      const goalOf = (n) => w.agents.get(n).goal;
      if (t > 60 && t < 200) {
        assert.equal(goalOf('developer').key, 'coding@desk:developer');
        assert.equal(goalOf('researcher').key, 'researching@desk:researcher');
        for (const a of w.agents.values()) if (!working[a.name] && a.goal?.why === 'idle' && a.goal.activity !== 'desk') awayFromDesk.add(a.name);
      }
      if (t > 260 && goalOf('developer').why === 'idle' && goalOf('developer').activity !== 'desk') developerLeft = true;
    });
    assert.ok(awayFromDesk.size >= 6, `only ${awayFromDesk.size} idle agents went anywhere while two were working`);
    assert.ok(developerLeft, 'the developer stayed at the desk after its work ended');
  });
});

describe('3D office settings', () => {
  it('lets agents roam by default, and only the person\'s own Reduced motion button seats them', () => {
    assert.deepEqual(initialPrefs({}), { ambient: true, reduced: false });
    assert.equal(initialPrefs().reduced, false);
    assert.equal(initialPrefs({ motion: 'reduced' }).reduced, true);
    assert.equal(initialPrefs({ motion: 'full' }).reduced, false);
  });

  it('ignores an older save that held the computer\'s reduce-motion setting as "reduced"', () => {
    assert.equal(initialPrefs({ reduced: true, cast: 'robot' }).reduced, false);
    assert.equal(initialPrefs({ reduced: true, cast: 'robot' }).cast, 'robot', 'the rest of the save is kept');
  });

  it('keeps ambient off when the person turned it off', () => {
    assert.equal(initialPrefs({ ambient: false }).ambient, false);
  });
});

describe('3D office cast', () => {
  it('gives every agent its own person, and every model file is there', async () => {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { ROOT } = await import('../_shared.mjs');
    const { PEOPLE } = await import('../control/office3d/cast.js');
    const agents = DESKS.map((d) => d.agent);
    assert.deepEqual(Object.keys(PEOPLE).sort(), [...agents].sort());
    assert.equal(new Set(Object.values(PEOPLE)).size, agents.length, 'two agents share a person');
    for (const file of Object.values(PEOPLE)) assert.ok(existsSync(join(ROOT, 'scripts', 'control', 'assets', 'people', `character-${file}.glb`)), file);
    assert.ok(existsSync(join(ROOT, 'scripts', 'control', 'assets', 'people', 'Textures', 'colormap.png')));
  });
});
