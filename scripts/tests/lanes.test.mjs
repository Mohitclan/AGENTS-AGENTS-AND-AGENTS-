import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { after, afterEach, beforeEach, describe, it } from 'node:test';
import { snapshot } from '../control.mjs';
import { act, addTask, collect } from '../dashboard.mjs';
import { laneKey, laneLimit, productOf, productsIn, splitByProduct, startable } from '../lanes.mjs';
import { makeCopy } from './_helpers.mjs';

describe('product detection', () => {
  it('finds a product by slug or name, in any case, with or without the space', () => {
    assert.equal(productOf('Find leads for motionrepo'), 'motionrepo');
    assert.equal(productOf('write posts about MOTION REPO'), 'motionrepo');
    assert.equal(productOf('Peel press launch plan'), 'peelpress');
    assert.equal(productOf('a Pitch Light landing page audit'), 'pitchlight');
    assert.equal(productOf('TestPilot and test-pilot docs'), 'testpilot');
    assert.equal(productOf('Test Pilot pricing page'), 'testpilot');
  });
  it('gives null when none or unclear', () => {
    assert.equal(productOf('Research the market'), null);
    assert.equal(productOf(''), null);
    assert.equal(productOf('Compare MotionRepo with Peelpress'), null);
    assert.equal(productOf('Find products launched in the last 2 days'), null);
  });
  it('lists the products named, in order, or all four for "all products" and "every product"', () => {
    assert.deepEqual(productsIn('Peelpress, then MotionRepo'), ['peelpress', 'motionrepo']);
    assert.deepEqual(productsIn('Run leads for all products'), ['motionrepo', 'testpilot', 'pitchlight', 'peelpress']);
    assert.equal(productsIn('every product needs a post').length, 4);
  });
});

describe('splitting a task by product', () => {
  it('leaves a task for one product, or none, alone', () => {
    assert.deepEqual(splitByProduct('Find leads for MotionRepo'), [{ product: 'motionrepo', task: 'Find leads for MotionRepo' }]);
    assert.deepEqual(splitByProduct('Plan next week'), [{ product: null, task: 'Plan next week' }]);
  });
  it('makes one task per named product with the same wording', () => {
    assert.deepEqual(splitByProduct('Find 5 leads for MotionRepo, Peelpress and Pitchlight, then draft emails'), [
      { product: 'motionrepo', task: 'Find 5 leads for MotionRepo, then draft emails' },
      { product: 'peelpress', task: 'Find 5 leads for Peelpress, then draft emails' },
      { product: 'pitchlight', task: 'Find 5 leads for Pitchlight, then draft emails' },
    ]);
    assert.deepEqual(splitByProduct('Weekly check on motionrepo & test pilot').map((t) => t.task), ['Weekly check on MotionRepo', 'Weekly check on TestPilot']);
  });
  it('makes one task per product for "all products" and "every product"', () => {
    const all = splitByProduct('Run a lead sprint for all products');
    assert.deepEqual(all.map((t) => t.product), ['motionrepo', 'testpilot', 'pitchlight', 'peelpress']);
    assert.equal(all[1].task, 'Run a lead sprint for TestPilot');
    assert.equal(splitByProduct('Write a launch post for every product, short').at(-1).task, 'Write a launch post for Peelpress, short');
  });
});

describe('which tasks can start', () => {
  const t = (id, product, status = 'queued') => ({ id, product, status });
  it('starts one per product, oldest first, and keeps a general task in a lane of its own', () => {
    const q = [t('a', 'motionrepo'), t('b', 'motionrepo'), t('c', 'peelpress'), t('d', null), t('e', null)];
    assert.deepEqual(startable(q, 4).map((x) => x.id), ['a', 'c', 'd', 'e']);
    assert.notEqual(laneKey(q[3]), laneKey(q[4]));
  });
  it('holds a lane while its task is running, and counts running tasks against the limit', () => {
    assert.deepEqual(startable([t('a', 'motionrepo', 'running'), t('b', 'motionrepo'), t('c', 'peelpress')], 4).map((x) => x.id), ['c']);
    assert.deepEqual(startable([t('a', 'motionrepo', 'running'), t('b', 'peelpress'), t('c', 'pitchlight')], 2).map((x) => x.id), ['b']);
    assert.deepEqual(startable([t('a', 'motionrepo'), t('b', 'peelpress')], 1).map((x) => x.id), ['a']);
  });
  it('reads JARVIS_LANES, default 4, at least 1', () => {
    assert.equal(laneLimit({}), 4);
    assert.equal(laneLimit({ JARVIS_LANES: '2' }), 2);
    assert.equal(laneLimit({ JARVIS_LANES: '0' }), 4);
    assert.equal(laneLimit({ JARVIS_LANES: '-3' }), 1);
  });
});

describe('the task box and mission control', () => {
  const repo = makeCopy();
  after(() => repo.remove());
  const page = { host: '127.0.0.1:4317', origin: 'http://127.0.0.1:4317', marker: '1' };
  const saved = { id: process.env.JARVIS_TASK_ID, lanes: process.env.JARVIS_LANES };
  const queue = () => JSON.parse(readFileSync(repo.path('ops', 'queue.json'), 'utf8'));
  const say = (task) => JSON.parse(act(repo.dir, '/tasks', { ...page, body: JSON.stringify({ task }) }).body);

  beforeEach(() => {
    process.env.JARVIS_TASK_ID = '';
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    // a runner that is "alive" (this test process), so the page does not start a real one
    writeFileSync(repo.path('ops', 'runs', 'jarvis.lock'), String(process.pid));
    writeFileSync(repo.path('ops', 'queue.json'), '[]');
  });
  afterEach(() => {
    for (const [key, value] of [['JARVIS_TASK_ID', saved.id], ['JARVIS_LANES', saved.lanes]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('splits a task for several products into one task each, and says which start at once and which wait', () => {
    process.env.JARVIS_LANES = '2';
    const r = say('Find leads for MotionRepo, Peelpress and Pitchlight');
    const q = queue();
    assert.deepEqual(q.map((t) => [t.product, t.task]), [['motionrepo', 'Find leads for MotionRepo'], ['peelpress', 'Find leads for Peelpress'], ['pitchlight', 'Find leads for Pitchlight']]);
    assert.equal(r.id, q[0].id);
    assert.deepEqual(r.ids, q.map((t) => t.id));
    assert.equal(r.message, `Queued 3 campaigns: ${q[0].id} MotionRepo, ${q[1].id} Peelpress, ${q[2].id} Pitchlight. MotionRepo and Peelpress start now, side by side. Pitchlight waits: all 2 lanes are busy.`);
  });

  it('says every campaign starts when there are lanes for all of them', () => {
    process.env.JARVIS_LANES = '4';
    const r = say('Write a launch post for every product');
    assert.equal(queue().length, 4);
    assert.match(r.message, /^Queued 4 campaigns: .*MotionRepo.*TestPilot.*Pitchlight.*Peelpress\. MotionRepo, TestPilot, Pitchlight and Peelpress start now, side by side\.$/);
  });

  it('says a product\'s second task waits for the first, and a free product starts', () => {
    const first = say('Find leads for motionrepo');
    assert.match(first.message, /is starting\.$/);
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify(queue().map((t) => ({ ...t, status: 'running' }))));
    assert.match(say('Another motionrepo task').message, /is queued, and starts after the current MotionRepo task\.$/);
    assert.match(say('A peelpress task').message, /is starting\.$/);
  });

  it('adds the tasks Jarvis writes itself without splitting them', () => {
    const r = addTask(repo.dir, 'Draft outreach email sequences for these leads: MotionRepo Co and Peelpress Inc', { split: false });
    assert.equal(r.tasks.length, 1);
    assert.equal(queue().at(-1).product, null);
  });

  it('shows every running task in the state: runs, with each one\'s product, title and agents; live while any is', () => {
    const t = (id, product, task) => ({ id, task, product, status: 'running', added: '2026-11-10 09:00', started: '2026-11-10 09:01' });
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify([t('J-20261110-01', 'motionrepo', 'Find leads for MotionRepo'), t('J-20261110-02', 'peelpress', 'Find leads for Peelpress'), { id: 'J-20261110-03', task: 'Waiting', product: 'peelpress', status: 'queued', added: '2026-11-10 09:02' }]));
    const log = (agent) => `${JSON.stringify({ timestamp: new Date().toISOString(), type: 'assistant', message: { content: [{ type: 'tool_use', id: `x-${agent}`, name: 'Agent', input: { subagent_type: agent, description: `Work as ${agent}` } }] } })}\n`;
    writeFileSync(repo.path('ops', 'runs', 'J-20261110-01.log'), log('lead-generator'));
    writeFileSync(repo.path('ops', 'runs', 'J-20261110-02.log'), log('researcher'));
    const s = snapshot(repo.dir);
    assert.equal(s.live, true);
    assert.deepEqual(s.runs.map((r) => [r.id, r.product, r.agents]), [['J-20261110-01', 'motionrepo', ['lead-generator']], ['J-20261110-02', 'peelpress', ['researcher']]]);
    assert.equal(s.runs[0].title, 'Find leads for MotionRepo');
    assert.equal(s.running.id, 'J-20261110-01', 'running stays the first run');
    assert.deepEqual(s.tasks.map((x) => [x.id, x.product]).sort(), [['J-20261110-01', 'motionrepo'], ['J-20261110-02', 'peelpress'], ['J-20261110-03', 'peelpress']]);
  });

  it('is not live, and has no runs, when the runner is gone or a task\'s lane lock names a dead process', () => {
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify([{ id: 'J-20261110-01', task: 'x', product: 'motionrepo', status: 'running', added: '2026-11-10 09:00', started: '2026-11-10 09:01' }]));
    mkdirSync(repo.path('ops', 'runs', 'lanes'), { recursive: true });
    writeFileSync(repo.path('ops', 'runs', 'lanes', 'J-20261110-01.lock'), '999999');
    assert.deepEqual(collect(repo.dir).runs, []);
    assert.equal(snapshot(repo.dir).live, false);
    writeFileSync(repo.path('ops', 'runs', 'lanes', 'J-20261110-01.lock'), String(process.pid));
    assert.equal(snapshot(repo.dir).runs.length, 1);
    writeFileSync(repo.path('ops', 'runs', 'jarvis.lock'), '999999');
    assert.equal(snapshot(repo.dir).live, false);
  });
});
