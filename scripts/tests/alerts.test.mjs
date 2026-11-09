import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { budgetWarning, stuckAgents, taskBudget, usualMinutes } from '../control/gems/watch.js';
import { STEPS } from '../control/gems/tour.js';
import { buildGrid } from '../control/world/nav.js';
import { MAPS } from '../control/world/maps.js';
import { petPlaces } from '../control/world/crowd.js';
import { createPet, DOG } from '../control/world/pet.js';
import { answerQuestion, answersTask, dismissQuestions, parseQuestions, questionsState } from '../questions.mjs';
import { makeCopy } from './_helpers.mjs';

const MIN = 60_000;

describe('stuck agents and the time budget', () => {
  const now = Date.parse('2026-11-08T12:00:00Z');
  const snap = {
    live: true,
    running: { id: 'J-1', started: '2026-11-08 17:00' },
    agents: [
      { name: 'a', status: 'working', lastAt: new Date(now - 12 * MIN).toISOString(), doing: 'Reading a slow page' },
      { name: 'b', status: 'working', lastAt: new Date(now - 3 * MIN).toISOString() },
      { name: 'c', status: 'idle', lastAt: new Date(now - 60 * MIN).toISOString() },
    ],
    tasks: [],
  };

  it('calls an agent at work stuck after ten minutes with no new step, and only while a run is live', () => {
    assert.deepEqual(stuckAgents(snap, now).map((s) => [s.name, s.minutes]), [['a', 12]]);
    assert.deepEqual(stuckAgents({ ...snap, live: false }, now), []);
  });

  it('sets the budget from how long the last tasks took, within bounds, with a fallback', () => {
    assert.equal(usualMinutes([]), 45);
    const task = (m) => ({ status: 'done', started: '2026-11-06 10:00', finished: `2026-11-06 ${String(10 + Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` });
    assert.equal(usualMinutes([task(40), task(50), task(60)]), 60, 'median 50, a little over, rounded to 5');
    assert.equal(usualMinutes([task(200), task(240), task(300)]), 90, 'never more than 90');
  });

  it('warns once per threshold as the end comes near, and when it is over', () => {
    const local = new Date(Date.parse('2026-11-08T17:30:00')); // 30 minutes after a local 17:00 start
    const b = taskBudget(snap, local.getTime());
    assert.deepEqual([b.elapsed, b.budget, b.left, b.level], [30, 45, 15, 'ok']);
    assert.equal(budgetWarning(16, 15), 15);
    assert.equal(budgetWarning(15, 14), null, 'not again');
    assert.equal(budgetWarning(6, 4), 5);
    assert.equal(budgetWarning(20, 0), 0, 'a long gap reports the most urgent');
    assert.equal(budgetWarning(null, 3), null, 'nothing on the first check');
    assert.equal(taskBudget({ ...snap, live: false }), null);
  });
});

describe('questions for you', () => {
  const REPORT = `# J-20261107-01

## Questions for you

1. **Kadal Deck, answer by 2026-11-08.** Does the agency rule cover it? Yes: disqualify. No: qualify (tier C). After 2026-11-08 it leaves the window.
2. **Competitors.** Does "never contact competitors" cover Acme Tools?
   - one more line of detail

Once you answer, a person lifts the hold.

## Assumptions made
`;

  it('reads numbered questions, their titles, yes/no answers and deadlines, and stops at the next section', () => {
    const qs = parseQuestions(REPORT);
    assert.equal(qs.length, 2);
    assert.deepEqual([qs[0].title, qs[0].due], ['Kadal Deck, answer by 2026-11-08', '2026-11-08']);
    assert.deepEqual(qs[0].options, [{ label: 'Yes', detail: 'disqualify.' }, { label: 'No', detail: 'qualify (tier C).' }]);
    assert.equal(qs[1].title, 'Competitors');
    assert.equal(qs[1].options.length, 0);
    assert.match(qs[1].text, /one more line of detail/);
    assert.doesNotMatch(qs[1].text, /Once you answer/, 'the closing paragraph is not part of the last question');
    assert.deepEqual(parseQuestions('# No questions here'), []);
  });

  describe('answering in a copy of the project', () => {
    const repo = makeCopy();
    after(() => repo.remove());
    before(() => {
      writeFileSync(repo.path('outputs', 'reports', 'J-20261107-01.md'), REPORT);
      writeFileSync(repo.path('ops', 'answers.jsonl'), '');
      const lead = { id: 'L-0000abcd', company: 'Acme Tools', product: 'motionrepo', status: 'new', hold: { reason: 'Competitor question', owner: 'founders', at: '2026-11-07' }, history: [] };
      writeFileSync(repo.path('pipeline', 'leads.jsonl'), `${JSON.stringify(lead)}\n`);
    });

    it('finds the leads a question is about, saves an answer, lifts a ticked hold, and hands the answers to the team once', () => {
      const s = questionsState(repo.dir);
      const q2 = s.questions.find((q) => q.id === 'J-20261107-01#2');
      assert.deepEqual(q2.leads, [{ id: 'L-0000abcd', company: 'Acme Tools', held: true }]);
      assert.equal(answerQuestion(repo.dir, { id: 'J-20261107-01#2', choice: '', note: '' }).ok, false, 'an empty answer is refused');
      const r = answerQuestion(repo.dir, { id: 'J-20261107-01#2', note: 'Not a competitor: go ahead', release: ['L-0000abcd'], by: 'Mohit' });
      assert.equal(r.ok, true);
      assert.match(r.message, /Hold lifted on 1 lead/);
      const leads = readFileSync(repo.path('pipeline', 'leads.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
      assert.equal(leads.at(-1).hold, undefined, 'the hold is gone');
      const plan = answersTask(repo.dir, 'Mohit');
      assert.deepEqual(plan.ids, ['J-20261107-01#2']);
      assert.match(plan.task, /Not a competitor: go ahead \(hold already lifted on L-0000abcd\)/);
      assert.match(plan.task, /Draft nothing new and send nothing/);
      assert.equal(dismissQuestions(repo.dir, ['J-20261107-01#1']).ok, true);
      const after = questionsState(repo.dir);
      assert.equal(after.questions.find((q) => q.id === 'J-20261107-01#1').answer.dismissed, true);
      assert.equal(answersTask(repo.dir).ids.length, 1, 'a dismissed question is never sent to the team');
    });
  });
});

describe('the office dog', () => {
  it('trots to a place on the floor, then does something dog-like, and every frame it shows exists', () => {
    const map = MAPS['campus-blue'];
    const grid = buildGrid(map);
    let n = 7;
    const pet = createPet({ grid, places: petPlaces(map, grid), rand: () => ((n = (n * 9301 + 49297) % 233280) / 233280) });
    // Does the step from a to b cross a wall line?
    const side = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    const crosses = (a, b) => map.walls.some(([x1, y1, x2, y2]) => side(a, b, [x1, y1]) * side(a, b, [x2, y2]) < 0 && side([x1, y1], [x2, y2], a) * side([x1, y1], [x2, y2], b) < 0);
    const seen = new Set();
    let prev = pet.look().at;
    for (let i = 0; i < 4000; i++) {
      pet.step(0.1);
      const v = pet.look();
      seen.add(v.anim);
      assert.ok(v.frame >= 0 && v.frame < DOG[v.anim].frames, `${v.anim} frame ${v.frame}`);
      assert.ok(!crosses(prev, v.at), `never walks through a wall (step ${i})`);
      prev = v.at;
    }
    assert.ok(seen.has('run'), 'it moves');
    assert.ok(seen.size >= 4, `it does several things: ${[...seen]}`);
  });
});

describe('the first-visit tour', () => {
  it('has six steps, each with a title and words, pointing at pages that exist', () => {
    assert.equal(STEPS.length, 6);
    for (const s of STEPS) assert.ok(s.title && s.text.length > 40);
    const app = readFileSync(new URL('../control/app.js', import.meta.url), 'utf8');
    for (const s of STEPS.filter((x) => x.go)) assert.ok(app.includes(`data-nav="${s.go.replace('#/', '')}"`), s.go);
  });
});

describe('the new pieces on mission control', () => {
  const repo = makeCopy();
  let base;
  let child;
  before(async () => {
    child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: { ...process.env, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => {
    child?.kill();
    repo.remove();
  });

  it('serves the sounds, the dog and the new scripts, and shows the questions in the state', async () => {
    assert.equal((await fetch(`${base}/assets/sounds/done.mp3`)).headers.get('content-type'), 'audio/mpeg');
    assert.equal((await fetch(`${base}/assets/sounds/ping.wav`)).headers.get('content-type'), 'audio/wav');
    assert.equal((await fetch(`${base}/assets/dog/run.png`)).status, 200);
    for (const f of ['gems/sounds.js', 'gems/watch.js', 'gems/tour.js', 'world/pet.js']) assert.equal((await fetch(`${base}/${f}`)).status, 200, f);
    const state = await (await fetch(`${base}/api/state`)).json();
    assert.ok(Array.isArray(state.questions.questions));
  });

  it('takes answers only from the page itself, and refuses to send when there is nothing new', async () => {
    const plain = await fetch(`${base}/api/questions/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(plain.status, 403);
    const send = await fetch(`${base}/api/questions/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Team-Page': '1' }, body: '{}' });
    assert.equal(send.status, 409);
  });
});
