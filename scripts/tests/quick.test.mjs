import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { makeCopy } from './_helpers.mjs';

const lead = (id, company, status, extra = {}) => ({ id, company, product: 'motionrepo', status, tier: 'C', score: 49, history: [{ at: '2026-11-09', event: 'imported', note: 'test' }], ...extra });

describe('quick answers: questions about where things stand cost no agent run', () => {
  const repo = makeCopy();
  let quickAnswer;
  let base;
  let child;
  before(async () => {
    writeFileSync(repo.path('pipeline', 'leads.jsonl'), `${[lead('L-00000001', 'Alpha', 'qualified'), lead('L-00000002', 'Beta', 'new', { hold: { reason: 'Agency?', owner: 'founders' } }), lead('L-00000003', 'Gamma', 'drafted')].map((l) => JSON.stringify(l)).join('\n')}\n`);
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify([{ id: 'J-20261109-05', task: 'Find leads for motionrepo', status: 'running' }, { id: 'J-20261109-06', task: 'Research rivals', status: 'queued' }]));
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    writeFileSync(repo.path('ops', 'runs', 'plan-limits.json'), JSON.stringify({ windows: { five_hour: { utilization: 0.4, resetsAt: Date.now() / 1000 + 3600 }, seven_day: { utilization: 0.51, resetsAt: Date.now() / 1000 + 7200 } } }));
    ({ quickAnswer } = await import(`${repo.dir}/scripts/quick.mjs`));
    child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: { ...process.env, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => {
    child?.kill();
    repo.remove();
  });

  it('answers counts, the queue and the plan from the files', async () => {
    const { ROOT } = await import(`${repo.dir}/scripts/_shared.mjs`);
    assert.equal(quickAnswer('How many leads do we have?', ROOT), "There are 3 leads for motionrepo: 1 qualified, 1 new, 1 drafted. 1 is on hold for a person's answer.");
    assert.match(quickAnswer('Count the leads in pipeline/leads.jsonl by status and put the counts in the report', ROOT), /^There are 3 leads/);
    assert.equal(quickAnswer("what's running?", ROOT), 'J-20261109-05 is running: Find leads for motionrepo. 1 task is queued.');
    assert.match(quickAnswer('how much of the plan is used', ROOT), /^At the last run, the 5-hour window is 40% used \(resets \d\d:\d\d\), and the weekly window is 51% used/);
  });

  it('leaves anything that asks for work to the team', () => {
    for (const t of ['find five more leads for motionrepo', 'draft emails for the new leads', 'research how many leads competitors get', 'plan a launch for pitchlight', 'Write the outreach sequence for Alpha']) assert.equal(quickAnswer(t), null, t);
  });

  it('answers a question typed in the task box without queueing a task', async () => {
    const before = readFileSync(repo.path('ops', 'queue.json'), 'utf8');
    const r = await fetch(`${base}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Team-Page': '1' }, body: JSON.stringify({ task: 'how many leads do we have' }) });
    const body = await r.json();
    assert.equal(r.status, 200);
    assert.equal(body.quick, true);
    assert.match(body.message, /^There are 3 leads/);
    assert.equal(readFileSync(repo.path('ops', 'queue.json'), 'utf8'), before, 'nothing was queued');
  });
});
