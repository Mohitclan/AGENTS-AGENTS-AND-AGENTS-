import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { localIntent, outreachIntent } from '../control/gems/voice.js';
import { decision, makeCopy } from './_helpers.mjs';

const lead = (id, company, extra = {}) => ({ id, company, product: 'motionrepo', status: 'qualified', tier: 'C', score: 49, website: `https://${company.toLowerCase()}.test`, history: [{ at: '2026-11-07', event: 'imported', note: 'pipeline/inbox/x.jsonl' }], ...extra });
const finished = new Date().toISOString().slice(0, 16).replace('T', ' ');

describe('outreach by voice', () => {
  it('asks for drafts for the newest run or named leads, and approves all or named drafts', () => {
    assert.deepEqual(outreachIntent('draft emails for the new leads'), { kind: 'draft', leads: 'new' });
    assert.deepEqual(outreachIntent('confirm the drafts'), { kind: 'draft', leads: 'new' });
    assert.deepEqual(outreachIntent('draft emails for puzari and kadal'), { kind: 'draft', leads: ['puzari', 'kadal'] });
    assert.deepEqual(outreachIntent('approve all drafts'), { kind: 'approve', drafts: 'all' });
    assert.deepEqual(outreachIntent('approve the emails for puzari'), { kind: 'approve', drafts: ['puzari'] });
    assert.deepEqual(localIntent('open outreach'), { kind: 'open', hash: '#/outreach' });
  });

  it('leaves longer requests to the team, so "find leads and draft emails" is still a task', () => {
    assert.equal(localIntent('find five leads and draft emails for them'), null);
    assert.equal(outreachIntent('approve it'), null);
  });
});

describe('the Outreach page state', () => {
  const repo = makeCopy();
  let base;
  let child;
  before(async () => {
    rmSync(repo.path('outputs', 'outreach'), { recursive: true, force: true }); // only this test's drafts
    mkdirSync(repo.path('outputs', 'outreach'), { recursive: true });
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    const leads = [
      lead('L-00000001', 'Alpha'),
      lead('L-00000002', 'Beta', { status: 'new', hold: { reason: 'Agency question. More words.', owner: 'founders' } }),
      lead('L-00000003', 'Gamma'),
    ];
    writeFileSync(repo.path('pipeline', 'leads.jsonl'), leads.map((l) => JSON.stringify(l)).join('\n') + '\n');
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify([{ id: 'J-20261107-01', task: 'find leads', status: 'done', finished, report: 'outputs/reports/J-20261107-01.md', leads_found: ['L-00000001', 'L-00000002', 'L-00000003'] }]));
    writeFileSync(repo.path('ops', 'outreach.jsonl'), '');
    // A full plan window, so asking for drafts only queues the task: no agent run starts in the test.
    writeFileSync(repo.path('ops', 'runs', 'plan-limits.json'), JSON.stringify({ at: new Date().toISOString(), windows: { five_hour: { utilization: 0.99, resetsAt: Date.now() / 1000 + 3600 } } }));
    writeFileSync(repo.path('outputs', 'outreach', 'L-00000003.md'), '---\nlead: L-00000003\n---\n\n## Email 1\n\nSubject: hi\n\nHi there,\n\nBody.\n');
    await new Promise((r) => setTimeout(r, 20));
    writeFileSync(repo.path('outputs', 'reviews', 'T-20261107-09-r1.md'), '# Review of outputs/outreach/L-00000003.md\n\n**Verdict: PASS, 90/100.**\n');
    child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: { ...process.env, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => {
    child?.kill();
    repo.remove();
  });
  const post = (path, body) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Team-Page': '1' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));

  it('shows what each run found, which leads can be drafted, and the drafts waiting for approval', async () => {
    const { outreach } = await (await fetch(`${base}/api/state`)).json();
    const run = outreach.runs[0];
    assert.equal(run.task, 'J-20261107-01');
    assert.deepEqual(run.ready, ['L-00000001']);
    assert.deepEqual(run.leads.map((l) => l.state), ['ready', 'held', 'drafted']);
    assert.match(run.leads[1].why, /^On hold: Agency question$/);
    assert.deepEqual(outreach.drafts.map((d) => [d.lead, d.state]), [['L-00000003', 'ready']]);
    const status = repo.run('outreach.mjs', 'status');
    assert.match(status.stdout, /J-20261107-01 found 3 leads/);
    assert.match(status.stdout, /1 draft\(s\) waiting for approval: Gamma/);
  });

  it('refuses to draft a lead on hold, and to approve a lead with no passed draft', async () => {
    const held = await post('/api/outreach/draft', { leads: ['beta'] });
    assert.equal(held.status, 409);
    assert.match(held.message, /Nothing to draft\. Beta: On hold: Agency question/);
    const none = await post('/api/outreach/approve', { drafts: ['alpha'] });
    assert.equal(none.status, 409);
    assert.match(none.message, /Can't approve yet: Alpha: no draft yet/);
    const unknown = await post('/api/outreach/approve', { drafts: ['zeta'] });
    assert.match(unknown.message, /couldn't find these leads: zeta/);
  });

  it('shows a draft\'s emails as the reader gets them, and only drafts', async () => {
    const doc = await (await fetch(`${base}/api/outreach/emails?draft=outputs/outreach/L-00000003.md`)).json();
    assert.deepEqual(doc.emails.map((e) => [e.n, e.subject]), [[1, 'hi']]);
    assert.match(doc.emails[0].body, /^Hi there,\n\nBody\.$/);
    assert.equal((await fetch(`${base}/api/outreach/emails?draft=ops/mail-config.json`)).status, 404);
  });

  it('accepts only same-site requests', async () => {
    const r = await fetch(`${base}/api/outreach/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(r.status, 403);
  });

  it('queues a drafting task for the ready leads only, and logs who asked', async () => {
    const r = await post('/api/outreach/draft', { leads: 'new', by: 'voice' });
    assert.equal(r.status, 200, r.message);
    assert.deepEqual(r.leads, ['L-00000001']);
    assert.match(r.message, /^Drafting emails for 1 lead\(s\) in J-\d{8}-\d+\. It starts by itself when the plan's 5-hour window resets\./);
    const { readFileSync } = await import('node:fs');
    const queued = JSON.parse(readFileSync(repo.path('ops', 'queue.json'), 'utf8')).find((t) => t.id === r.id);
    assert.match(queued.task, /Draft outreach email sequences for these motionrepo leads: Alpha \(L-00000001\), found in J-20261107-01\. voice confirmed drafting/);
    assert.match(queued.task, /Don't send anything/);
    assert.match(readFileSync(repo.path('ops', 'outreach.jsonl'), 'utf8'), /"kind":"draft-request","leads":\["L-00000001"\],"task":"J-\d+-\d+","by":"voice"/);
  });
});

describe('the guard keeps sending a person\'s decision', () => {
  const repo = makeCopy();
  after(() => repo.remove());
  const bash = (command) => decision(repo.hook('guard.mjs', { tool_name: 'Bash', tool_input: { command }, cwd: repo.dir }));
  it('asks before an agent approves drafts, asks for drafts, or sends test emails', () => {
    assert.equal(bash('node scripts/outreach.mjs approve all'), 'ask');
    assert.equal(bash('node scripts/outreach.mjs draft new'), 'ask');
    assert.equal(bash('node scripts/send-tests.mjs outputs/outreach/L-1.md'), 'ask');
    assert.equal(bash('node scripts/send-tests.mjs outputs/outreach/L-1.md --dry-run'), 'allow');
    assert.equal(bash('node scripts/outreach.mjs status'), 'allow');
  });
});

