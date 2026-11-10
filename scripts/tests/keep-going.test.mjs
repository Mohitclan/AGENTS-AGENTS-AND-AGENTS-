import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { keepGoingPlan, loadKeepGoing, runKeepGoing, saveKeepGoing, setKeepGoing, stopAfter, taskText, WAIT_MS } from '../keep-going.mjs';

const T0 = Date.parse('2026-11-10T08:00:00Z');
const iso = (ms) => new Date(ms).toISOString();
let root;

// A finished MotionRepo task that drafted emails for two leads, and the state turned on before it.
function world({ drafts = 2, status = 'done', extra = [], pending = true } = {}) {
  const queue = [{ id: 'J-20261110-05', product: 'motionrepo', task: 'Find MotionRepo leads and draft emails', status, started: iso(T0 - 10 * 60_000), finished: iso(T0) }, ...extra];
  const leads = new Map();
  const list = [];
  for (let i = 0; i < drafts; i++) {
    leads.set(`L-${i}`, { id: `L-${i}`, product: 'motionrepo' });
    list.push({ kind: 'sequence', lead: `L-${i}`, at: iso(T0 - 60_000), mails: [{ n: 1, state: pending ? 'pending' : 'approved' }] });
  }
  return { queue, leads, drafts: list };
}
function fakeTasks() {
  const added = [];
  return {
    added,
    addTask: (_root, task, opts) => {
      added.push({ task, opts });
      return { id: `J-20261110-${10 + added.length}` };
    },
    startQueued: () => ({ started: true }),
  };
}

describe('keep going', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'keep-going-'));
    mkdirSync(join(root, 'ops', 'runs'), { recursive: true });
    saveKeepGoing(root, { on: true, since: iso(T0 - 3_600_000), stopped: {}, chained: [] });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('counts down two minutes after a batch of drafts, then starts the next lead batch for that product once', () => {
    const w = world();
    const [p] = keepGoingPlan(root, T0 + 30_000, w);
    assert.equal(p.state, 'counting');
    assert.equal(p.startsAt, T0 + WAIT_MS);
    const fake = fakeTasks();
    assert.deepEqual(runKeepGoing(root, T0 + 60_000, { ...fake, ...w }), []);
    const did = runKeepGoing(root, T0 + WAIT_MS + 1000, { ...fake, ...w });
    assert.equal(did.length, 1);
    assert.equal(fake.added[0].task, taskText('motionrepo'));
    assert.match(fake.added[0].task, /draft emails for those that qualify/);
    assert.deepEqual(fake.added[0].opts, { split: false });
    assert.equal(loadKeepGoing(root).chained[0].from, 'J-20261110-05');
    // never twice for the same batch
    assert.deepEqual(runKeepGoing(root, T0 + WAIT_MS + 20_000, { ...fake, ...w }), []);
    assert.equal(keepGoingPlan(root, T0 + WAIT_MS + 20_000, w)[0].state, 'started');
  });

  it('never approves anything: the drafts stay pending for a person', () => {
    const w = world();
    runKeepGoing(root, T0 + WAIT_MS + 1000, { ...fakeTasks(), ...w });
    assert.ok(w.drafts.every((d) => d.mails.every((m) => m.state === 'pending')));
  });

  it('starts nothing when a person stepped in: Stop, a new task for the product, or the switch off', () => {
    const later = T0 + WAIT_MS + 1000;
    stopAfter(root, 'J-20261110-05', 'Mohit', T0 + 10_000);
    assert.equal(keepGoingPlan(root, later, world())[0].state, 'stopped');
    assert.deepEqual(runKeepGoing(root, later, { ...fakeTasks(), ...world() }), []);

    saveKeepGoing(root, { on: true, since: iso(T0 - 3_600_000), stopped: {}, chained: [] });
    const busy = world({ extra: [{ id: 'J-20261110-06', product: 'motionrepo', task: 'Research MotionRepo', status: 'queued' }] });
    assert.deepEqual(runKeepGoing(root, later, { ...fakeTasks(), ...busy }), []);

    setKeepGoing(root, false);
    assert.deepEqual(keepGoingPlan(root, later, world()), []);
  });

  it('ends the chain after a batch that drafted nothing, a failed task, or a task from before it was on', () => {
    const later = T0 + WAIT_MS + 1000;
    assert.deepEqual(keepGoingPlan(root, later, world({ drafts: 0 })), []);
    assert.deepEqual(keepGoingPlan(root, later, world({ status: 'failed' })), []);
    saveKeepGoing(root, { on: true, since: iso(T0 + 1000), stopped: {}, chained: [] });
    assert.deepEqual(keepGoingPlan(root, later, world()), []);
  });

  it('holds at 20 leads waiting, at 60% of the 5-hour window, and after 6 batches in a day', () => {
    const later = T0 + WAIT_MS + 1000;
    assert.equal(keepGoingPlan(root, later, world({ drafts: 20 }))[0].state, 'holding');
    assert.equal(keepGoingPlan(root, later, world({ drafts: 20, pending: false }))[0].state, 'due'); // decided ones don't count

    writeFileSync(join(root, 'ops', 'runs', 'plan-limits.json'), JSON.stringify({ windows: { five_hour: { utilization: 0.62, resetsAt: (later + 3_600_000) / 1000 } } }));
    const held = keepGoingPlan(root, later, world())[0];
    assert.equal(held.state, 'holding');
    assert.match(held.reason, /62% used/);
    writeFileSync(join(root, 'ops', 'runs', 'plan-limits.json'), JSON.stringify({ windows: { five_hour: { utilization: 0.62, resetsAt: (T0 - 1000) / 1000 } } }));
    assert.equal(keepGoingPlan(root, later, world())[0].state, 'due'); // the window has reset since

    const chained = Array.from({ length: 6 }, (_, i) => ({ from: `J-2026111${i}-01`, to: `J-2026111${i}-02`, product: 'motionrepo', at: iso(T0 - 3_600_000 + i) }));
    saveKeepGoing(root, { on: true, since: iso(T0 - 3_600_000), stopped: {}, chained });
    assert.match(keepGoingPlan(root, later, world())[0].reason, /6 MotionRepo batches/);
  });
});
