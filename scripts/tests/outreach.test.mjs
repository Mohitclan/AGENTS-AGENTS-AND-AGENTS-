import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { localIntent, outreachIntent } from '../control/gems/voice.js';
import { parseTargets } from '../send-tests.mjs';
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

  it('ticks or crosses single emails by voice, and never takes "stop all" as declining everything', () => {
    assert.deepEqual(outreachIntent('approve email 2 for puzari'), { kind: 'email', decision: 'approve', emails: ['puzari:2'] });
    assert.deepEqual(outreachIntent('send the first email to puzari'), { kind: 'email', decision: 'approve', emails: ['puzari:1'] });
    assert.deepEqual(outreachIntent("don't send the third email to puzari cloud"), { kind: 'email', decision: 'decline', emails: ['puzari cloud:3'] });
    assert.deepEqual(outreachIntent('decline the emails for puzari'), { kind: 'email', decision: 'decline', emails: ['puzari'] });
    assert.deepEqual(outreachIntent('approve all pending emails'), { kind: 'email', decision: 'approve', emails: 'all' });
    assert.deepEqual(outreachIntent('reject all'), { kind: 'email', decision: 'decline', emails: 'all' });
    assert.equal(outreachIntent('stop all'), null);
    assert.equal(outreachIntent('cancel all'), null);
    assert.deepEqual(localIntent('open pending emails'), { kind: 'open', hash: '#/emails' });
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

describe('the Emails page: one email at a time', () => {
  const repo = makeCopy();
  let base;
  let child;
  const draft = 'outputs/outreach/L-0000000d.md';
  before(async () => {
    rmSync(repo.path('outputs', 'outreach'), { recursive: true, force: true });
    mkdirSync(repo.path('outputs', 'outreach'), { recursive: true });
    writeFileSync(repo.path('pipeline', 'leads.jsonl'), [lead('L-0000000d', 'Delta Cloud'), lead('L-0000000e', 'Echo')].map((l) => JSON.stringify(l)).join('\n') + '\n');
    writeFileSync(repo.path('ops', 'queue.json'), '[]');
    writeFileSync(repo.path('ops', 'outreach.jsonl'), '');
    writeFileSync(repo.path(draft), '---\nlead: L-0000000d\n---\n\n## Email 1\n\nSubject: First\n\nHello one.\n\n## Email 2\n\nSubject: Second\n\nHello two.\n\n## Email 3\n\nSubject: Third\n\nHello three.\n');
    writeFileSync(repo.path('outputs', 'outreach', 'L-0000000e.md'), '---\nlead: L-0000000e\n---\n\n## Email 1\n\nSubject: Not yet\n\nUnreviewed.\n');
    await new Promise((r) => setTimeout(r, 20));
    writeFileSync(repo.path('outputs', 'reviews', 'T-20261109-09-r1.md'), `# Review of ${draft}\n\n**Verdict: PASS, 88/100.**\n`);
    child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: { ...process.env, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => {
    child?.kill();
    repo.remove();
  });
  const post = (body) => fetch(`${base}/api/outreach/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Team-Page': '1' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
  const state = async () => (await (await fetch(`${base}/api/state`)).json()).outreach;

  it('lists every drafted email with its subject and text, and counts only passed ones as waiting', async () => {
    const o = await state();
    assert.equal(o.pending, 3);
    const delta = o.emails.filter((e) => e.lead === 'L-0000000d');
    assert.deepEqual(delta.map((e) => [e.n, e.of, e.subject, e.state]), [[1, 3, 'First', 'pending'], [2, 3, 'Second', 'pending'], [3, 3, 'Third', 'pending']]);
    assert.equal(delta[1].body, 'Hello two.');
    assert.equal(o.emails.find((e) => e.lead === 'L-0000000e').state, 'waiting', 'not reviewed: no tick or cross');
  });

  it('declines one email by a spoken name, keeps it declined, and approving the draft then leaves it out', async () => {
    const r = await post({ emails: ['delta cloud:2'], decision: 'decline', by: 'voice' });
    assert.equal(r.status, 200, r.message);
    assert.equal(r.message, "Declined email 2 for Delta Cloud: it won't be sent.");
    const o = await state();
    assert.deepEqual(o.emails.filter((e) => e.lead === 'L-0000000d').map((e) => e.state), ['pending', 'declined', 'pending']);
    assert.equal(o.pending, 2);
    assert.match(o.drafts.find((d) => d.lead === 'L-0000000d').why, /2 of 3 emails still waiting/);
    const again = await post({ emails: [`${draft}#2`], decision: 'decline' });
    assert.equal(again.status, 409);
    assert.match(again.message, /email 2 for Delta Cloud is already declined/i);
    const early = await post({ emails: ['echo:1'], decision: 'approve' });
    assert.equal(early.status, 409);
    assert.match(early.message, /can't be decided yet/);
    assert.equal((await post({ emails: ['nobody'], decision: 'approve' })).status, 409);
    assert.equal((await post({ emails: 'all', decision: 'maybe' })).status, 400);
    const { planEmails } = await import(`${repo.dir}/scripts/outreach.mjs`);
    const { ROOT: copyRoot } = await import(`${repo.dir}/scripts/_shared.mjs`); // the copy's own root, as its server uses
    assert.deepEqual(planEmails(copyRoot, 'all', 'approve').refs, [`${draft}#1`, `${draft}#3`], 'approving all skips the declined email');
  });

  it('logs a tick and tries to send only that email (this copy has no mailbox, so the send fails and may be retried)', async () => {
    const r = await post({ emails: [{ draft, n: 1 }], decision: 'approve', by: 'Mohit' });
    assert.match(r.message, /^Approved, but sending had a problem/);
    const log = readFileSync(repo.path('ops', 'outreach.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(log.at(-1).emails, [`${draft}#1`]);
    assert.equal(log.at(-1).by, 'Mohit');
    const one = (await state()).emails.find((e) => e.ref === `${draft}#1`);
    assert.deepEqual([one.state, one.sent], ['approved', 0]);
    assert.notEqual((await post({ emails: [`${draft}#1`], decision: 'approve' })).status, 409, 'an approved email that never went out can be tried again');
    assert.equal((await post({ emails: [`${draft}#1`], decision: 'decline' })).status, 409, 'an approved email cannot be declined');
  });

  it('sends only the named emails of a draft', () => {
    const t = parseTargets([`${draft}#3`, `${draft}#1`, 'outputs/outreach/L-0000000e.md']);
    assert.deepEqual([...t.get(draft)], [3, 1]);
    assert.equal(t.get('outputs/outreach/L-0000000e.md'), null);
    assert.equal(parseTargets([`${draft}#2`, draft]).get(draft), null, 'the whole draft wins');
  });
});

describe('the guard keeps sending a person\'s decision', () => {
  const repo = makeCopy();
  after(() => repo.remove());
  const bash = (command) => decision(repo.hook('guard.mjs', { tool_name: 'Bash', tool_input: { command }, cwd: repo.dir }));
  it('asks before an agent approves drafts, asks for drafts, or sends test emails', () => {
    assert.equal(bash('node scripts/outreach.mjs approve all'), 'ask');
    assert.equal(bash('node scripts/outreach.mjs draft new'), 'ask');
    assert.equal(bash('node scripts/outreach.mjs decline puzari:2'), 'ask');
    assert.equal(bash('node scripts/send-tests.mjs outputs/outreach/L-1.md'), 'ask');
    assert.equal(bash('node scripts/send-tests.mjs outputs/outreach/L-1.md --dry-run'), 'allow');
    assert.equal(bash('node scripts/outreach.mjs status'), 'allow');
  });
});

