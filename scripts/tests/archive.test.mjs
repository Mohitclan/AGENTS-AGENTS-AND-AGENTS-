import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { after, describe, it } from 'node:test';
import { agentDetail, snapshot } from '../control.mjs';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

// Two finished tasks: J-...-01 is real, J-...-02 a test run a person archives. Jarvis runs one task at a time,
// so the steps stamped inside -02's window (12:29 to 12:48) belong to it.
function setUp() {
  rmSync(repo.path('ops', 'archive'), { recursive: true, force: true }); // the copy holds the real archive
  const queue = [
    { id: 'J-20261105-01', task: 'Real lead sprint', status: 'done', added: '2026-11-05 10:00', started: '2026-11-05 10:00', finished: '2026-11-05 10:30', report: 'outputs/reports/J-20261105-01.md' },
    { id: 'J-20261105-02', task: 'Smoke test', status: 'failed', added: '2026-11-05 12:29', started: '2026-11-05 12:29', finished: '2026-11-05 12:48', report: 'outputs/reports/J-20261105-02.md' },
  ];
  writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify(queue));
  mkdirSync(repo.path('ops', 'runs'), { recursive: true });
  writeFileSync(repo.path('ops', 'runs', 'J-20261105-02.log'), '');
  writeFileSync(repo.path('outputs', 'reports', 'J-20261105-01.md'), '# Real\n');
  writeFileSync(repo.path('outputs', 'reports', 'J-20261105-02.md'), '# Smoke\n');
  writeFileSync(repo.path('ops', 'messages.md'), [
    '| When | From | To | Task | What |', '|---|---|---|---|---|',
    '| 2026-11-05 10:10 | coordinator | lead-generator | T-20261105-81 | Real brief |',
    '| 2026-11-05 12:35 | coordinator | lead-generator | T-20261105-82 | Smoke brief |',
  ].join('\n'));
  writeFileSync(repo.path('ops', 'fallbacks.md'), '');
  writeFileSync(repo.path('ops', 'board.md'), [
    '| ID | Request | Owner | Status | Output | Review | Updated |', '|---|---|---|---|---|---|---|',
    '| T-20261105-81 | Real batch | lead-generator | done | outputs/research/x.md | PASS | 2026-11-05 |',
    '| T-20261105-82 | Smoke batch | lead-generator | done | outputs/research/y.md | PASS | 2026-11-05 |',
  ].join('\n'));
  const approvals = readFileSync(repo.path('ops', 'approvals.md'), 'utf8').split('\n').filter((l) => !/^\| A-\d/.test(l));
  approvals.push('| A-20261105-81 | T-20261105-81 | Approve the real plan | outputs/research/x.md | low | pending | | |');
  approvals.push('| A-20261105-82 | T-20261105-82 | Approve the smoke plan | outputs/research/y.md | low | pending | | |');
  writeFileSync(repo.path('ops', 'approvals.md'), approvals.join('\n'));
  writeFileSync(repo.path('outputs', 'reviews', 'T-20261105-82-r1.md'), '---\ntask: T-20261105-82\nverdict: PASS\n---\n# Review of the smoke batch\n');
}

describe('archiving test and failed runs', () => {
  it('moves a finished task, its log and its report to ops/archive and takes it off the queue', () => {
    setUp();
    assert.equal(repo.run('jarvis.mjs', 'archive', 'J-20261105-02').code, 1, 'a reason is required');
    const r = repo.run('jarvis.mjs', 'archive', 'J-20261105-02', '--reason', 'smoke test');
    assert.equal(r.code, 0, r.stderr);
    const queue = JSON.parse(readFileSync(repo.path('ops', 'queue.json'), 'utf8'));
    assert.deepEqual(queue.map((t) => t.id), ['J-20261105-01']);
    assert.ok(existsSync(repo.path('ops', 'archive', 'J-20261105-02', 'J-20261105-02.log')));
    assert.ok(existsSync(repo.path('ops', 'archive', 'J-20261105-02', 'J-20261105-02.md')));
    assert.ok(!existsSync(repo.path('outputs', 'reports', 'J-20261105-02.md')));
    const [entry] = JSON.parse(readFileSync(repo.path('ops', 'archive', 'archived.json'), 'utf8'));
    assert.equal(entry.reason, 'smoke test');
    assert.equal(entry.started, '2026-11-05 12:29');
    assert.doesNotMatch(readFileSync(repo.path('ops', 'queue.md'), 'utf8'), /J-20261105-02/);
  });

  it('refuses a task that is still running, one it does not know, and an agent', () => {
    assert.equal(repo.run('jarvis.mjs', 'archive', 'J-20990101-01', '--reason', 'x').code, 1);
    const q = JSON.parse(readFileSync(repo.path('ops', 'queue.json'), 'utf8'));
    q.push({ id: 'J-20261106-01', task: 'Live', status: 'running', added: '2026-11-06 09:57', started: '2026-11-06 09:57' });
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify(q));
    assert.equal(repo.run('jarvis.mjs', 'archive', 'J-20261106-01', '--reason', 'x').code, 1);
  });

  it('leaves every step of an archived run out of the dashboard, and keeps the real ones', () => {
    const snap = snapshot(repo.dir);
    assert.ok(!snap.tasks.some((t) => t.id === 'J-20261105-02'));
    const lead = snap.agents.find((a) => a.name === 'lead-generator');
    assert.equal(lead.counts.tasks, 1, 'only the real board row counts');
    assert.ok(!snap.flags.some((f) => f.id === 'A-20261105-82'), 'the smoke run\'s approval is gone');
    assert.ok(snap.flags.some((f) => f.id === 'A-20261105-81'), 'the real approval stays');
    const evaluator = agentDetail(repo.dir, 'evaluator');
    assert.ok(!evaluator.outputs.some((o) => o.path.includes('T-20261105-82')), 'the smoke run\'s review is gone');
    const coordinator = agentDetail(repo.dir, 'coordinator');
    assert.ok(coordinator.events.some((e) => /Real brief/.test(e.text)), 'the real hand-off stays');
    assert.ok(!coordinator.events.some((e) => /Smoke brief/.test(e.text)), 'the smoke hand-off is gone');
  });

  it('never reuses an archived task\'s ID', () => {
    const q = JSON.parse(readFileSync(repo.path('ops', 'queue.json'), 'utf8')).filter((t) => t.status !== 'running');
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify(q));
    const today = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const prefix = `J-${today.getFullYear()}${p(today.getMonth() + 1)}${p(today.getDate())}-`;
    const archived = JSON.parse(readFileSync(repo.path('ops', 'archive', 'archived.json'), 'utf8'));
    archived.push({ id: `${prefix}07`, task: 'old', status: 'done', started: '2026-01-01 00:00', finished: '2026-01-01 00:01' });
    writeFileSync(repo.path('ops', 'archive', 'archived.json'), JSON.stringify(archived));
    const r = repo.run('jarvis.mjs', 'add', 'Next real task');
    assert.match(r.stdout, new RegExp(`Queued ${prefix}08`));
  });
});
