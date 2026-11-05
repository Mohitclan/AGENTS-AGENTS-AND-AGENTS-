import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DWELL_MS, MAX_WALKING, planRoam, ROAM_SPOTS } from '../control/gems/roam.js';
import { roamNote } from '../control/office3d/behavior.js';

const names = ['coordinator', 'evaluator', 'knowledge-base', 'researcher', 'lead-generator', 'outreach', 'sales', 'marketing', 'demo-handler', 'docs-handler', 'developer'];
const actors = (extra = {}) => names.map((name) => ({ name, status: 'idle', busy: false, spot: null, roamUntil: 0, ...extra[name] }));

describe('the flat office: agents with no work roam', () => {
  it('sends an idle agent to a free spot on the floor, for a while', () => {
    const plan = planRoam({ actors: actors(), now: 1000, rand: () => 0.5 });
    assert.ok(names.includes(plan.name));
    assert.ok(plan.spot >= 0 && plan.spot < ROAM_SPOTS.length);
    assert.ok(plan.dwell >= DWELL_MS[0] && plan.dwell <= DWELL_MS[1]);
  });

  it('never sends an agent that has work, or is busy, or has not stayed long enough', () => {
    const working = Object.fromEntries(names.map((n) => [n, { status: 'working' }]));
    assert.equal(planRoam({ actors: actors(working), now: 1000 }), null, 'everyone is working');
    const busy = Object.fromEntries(names.map((n) => [n, { busy: true }]));
    assert.equal(planRoam({ actors: actors(busy), now: 1000 }), null);
    const resting = Object.fromEntries(names.map((n) => [n, { roamUntil: 5000 }]));
    assert.equal(planRoam({ actors: actors(resting), now: 1000 }), null, 'all still staying where they are');
    assert.ok(planRoam({ actors: actors(resting), now: 5000 }), 'their time is up');
    for (const status of ['researching', 'waiting', 'error', 'success', 'paused']) {
      assert.equal(planRoam({ actors: actors({ sales: { status } }).filter((a) => a.name === 'sales'), now: 1000 }), null, status);
    }
  });

  it('keeps at most a few agents on the move at once', () => {
    const moving = Object.fromEntries(names.slice(0, MAX_WALKING).map((n) => [n, { busy: true }]));
    assert.equal(planRoam({ actors: actors(moving), now: 1000 }), null);
    const fewer = Object.fromEntries(names.slice(0, MAX_WALKING - 1).map((n) => [n, { busy: true }]));
    assert.ok(planRoam({ actors: actors(fewer), now: 1000 }));
  });

  it('never picks a spot someone is standing at, or the spot the agent is already at', () => {
    for (let i = 0; i < 200; i++) {
      const taken = Object.fromEntries(names.slice(0, 5).map((n, k) => [n, { spot: k, roamUntil: 1e12 }]));
      taken.sales = { spot: 5, roamUntil: 0 };
      const plan = planRoam({ actors: actors(taken), now: 1000, rand: () => ((i * 53) % 100) / 100 });
      assert.ok(plan);
      assert.ok(![0, 1, 2, 3, 4].includes(plan.spot), 'a spot already taken');
      if (plan.name === 'sales') assert.notEqual(plan.spot, 5, 'the spot it is already at');
    }
    // nowhere left at all
    const full = names.slice(0, ROAM_SPOTS.length).map((name, k) => ({ name, status: 'idle', busy: false, spot: k, roamUntil: 1e12 }));
    full.push({ name: 'late', status: 'idle', busy: false, spot: null, roamUntil: 0 });
    if (names.length >= ROAM_SPOTS.length) assert.equal(planRoam({ actors: full, now: 1000 }), null);
  });

  it('over time has every idle agent away from its desk, none sharing a spot, and all of them moving on now and then', () => {
    const list = actors().map((a) => ({ ...a, walkingUntil: 0 }));
    const visited = new Map(names.map((n) => [n, new Set()]));
    let now = 0;
    for (let tick = 0; tick < 400; tick++) {
      now += 2200;
      for (const a of list) a.busy = now < a.walkingUntil;
      const plan = planRoam({ actors: list.map(({ name, status, busy, spot, roamUntil }) => ({ name, status, busy, spot, roamUntil })), now, rand: Math.random });
      if (plan) {
        const a = list.find((x) => x.name === plan.name);
        a.spot = plan.spot;
        a.roamUntil = now + plan.dwell;
        a.walkingUntil = now + 3000;
        visited.get(a.name).add(plan.spot);
      }
      const used = list.filter((a) => a.spot !== null).map((a) => a.spot);
      assert.equal(new Set(used).size, used.length, 'two agents on one spot');
      if (tick === 60) assert.equal(list.filter((a) => a.spot === null).length, 0, 'someone is still at a desk after two minutes');
    }
    for (const [name, spots] of visited) assert.ok(spots.size >= 3, `${name} only visited ${spots.size} spots`);
  });
});

describe('the 3D office: saying why agents are seated', () => {
  it('says nothing when agents are free to roam, and names the button when the person\'s own setting seats them', () => {
    assert.equal(roamNote({ ambient: true, reduced: false }), '');
    assert.equal(roamNote({}), '');
    assert.match(roamNote({ ambient: true, reduced: true }), /Reduced motion is on.*Press Reduced motion/);
    assert.match(roamNote({ ambient: false, reduced: false }), /Roaming is off.*Press Ambient/);
    assert.match(roamNote({ ambient: false, reduced: true }), /Reduced motion/, 'reduced motion is the first thing to turn off');
  });
});
