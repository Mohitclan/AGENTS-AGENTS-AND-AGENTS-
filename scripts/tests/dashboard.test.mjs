import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { act, collect, escapeHtml, handle, parseApprovals, recentSteps, renderMarkdown } from '../dashboard.mjs';
import { makeCopy } from './_helpers.mjs';

let copy;
const HOST = '127.0.0.1:4317';
const lead = (fields) => JSON.stringify({ id: 'L-11111111', company: 'Acme (Parent Ltd)', status: 'drafted', score: 60, tier: 'B', next_action: 'Do it.', ...fields });
const row = (id, action, decision) => `| ${id} | T-1 | ${action} | outputs/outreach/L-11111111.md, outputs/reviews/T-1-r1.md | risk | ${decision} | | |`;

before(() => {
  copy = makeCopy();
  mkdirSync(copy.path('pipeline'), { recursive: true });
  mkdirSync(copy.path('outputs', 'outreach'), { recursive: true });
  mkdirSync(copy.path('outputs', 'reviews'), { recursive: true });
  mkdirSync(copy.path('ops', 'runs'), { recursive: true });
  writeFileSync(copy.path('.env'), 'SECRET=never-show-this\n');
  writeFileSync(
    copy.path('pipeline', 'leads.jsonl'),
    [lead({}), lead({ id: 'L-22222222', company: '<img src=x onerror=alert(1)>', status: 'disqualified', fit_reason: 'Not a fit.' }), lead({ id: 'L-33333333', company: 'Held', status: 'new', hold: { reason: 'Ask first.' } })].join('\n'),
  );
  writeFileSync(copy.path('outputs', 'outreach', 'L-11111111.md'), '---\nstatus: draft, not sent\n---\n# Draft\n\nHi from {{SENDER_NAME}}.\n');
  writeFileSync(copy.path('outputs', 'reviews', 'T-1-r1.md'), '| L-11111111 Acme | **PASS** | 87/100 | fine |\n');
  writeFileSync(copy.path('ops', 'approvals.md'), [row('A-1', 'Send Email 1', 'pending'), row('A-2', 'Send Email 2', 'Approved'), row('A-3', 'Approve the answers', 'pending')].join('\n'));
  writeFileSync(copy.path('ops', 'queue.json'), JSON.stringify([{ id: 'J-1', task: 'Find leads for the team.', status: 'running', started: '2026-11-02 10:00' }]));
  writeFileSync(
    copy.path('ops', 'runs', 'J-1.log'),
    `${JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Agent', input: { subagent_type: 'researcher', description: 'Check a lead' } }] } })}\nnot json\n`,
  );
});
after(() => copy.dir && rmSync(copy.dir, { recursive: true, force: true }));

test('counts come from the files: only pending sends wait, and a passed review is found', () => {
  const data = collect(copy.dir);
  assert.equal(data.sends.length, 1);
  assert.equal(data.others.length, 1);
  assert.equal(data.leads[0].review.score, 87);
  assert.equal(data.running.id, 'J-1');
  assert.match(data.running.steps[0], /researcher/);
});

test('the page shows the numbers and escapes what came from outside', () => {
  const { status, body } = handle(copy.dir, 'GET', '/', HOST);
  assert.equal(status, 200);
  assert.match(body, /1 sequence is ready, 1 send is waiting for a person, and 0 leads have been contacted/);
  assert.match(body, /Acme <em>87\/100/);
  assert.match(body, /L-11111111\.md#email-1/);
  assert.ok(!body.includes('<img src=x'));
  assert.ok(body.includes('&lt;img src=x'));
});

test('the page only answers on this computer', () => {
  assert.equal(handle(copy.dir, 'POST', '/', HOST).status, 405);
  assert.equal(handle(copy.dir, 'GET', '/', 'evil.example').status, 403);
  assert.equal(handle(copy.dir, 'GET', '/nope', HOST).status, 404);
});

test('a draft opens, and nothing outside the outputs folders does', () => {
  const page = handle(copy.dir, 'GET', '/view?file=outputs/outreach/L-11111111.md', HOST);
  assert.equal(page.status, 200);
  assert.match(page.body, /<mark>\{\{SENDER_NAME\}\}<\/mark>/);
  assert.match(page.body, /Draft, not sent\./);
  for (const file of ['.env', '../.env', 'outputs/outreach/../../.env', 'ops/approvals.md', 'outputs/outreach/L-11111111.txt', 'outputs%2Foutreach%2F..%2F..%2F.env']) {
    assert.equal(handle(copy.dir, 'GET', `/view?file=${file}`, HOST).status, 404, file);
  }
});

test('Markdown links keep to http and to viewable files', () => {
  const html = renderMarkdown('[bad](javascript:alert(1)) [ok](https://a.example) [rep](../reviews/T-1-r1.md) [secret](../../.env) <script>x</script>', 'outputs/reports/J-1.md');
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('href="https://a.example"'));
  assert.ok(html.includes('/view?file=outputs%2Freviews%2FT-1-r1.md'));
  assert.ok(!html.includes('.env"'));
  assert.ok(!html.includes('<script>'));
});

test('Markdown tables, lists and headings render', () => {
  const html = renderMarkdown('## Title\n\n- one\n- two\n\n| A | B |\n|---|---|\n| 1 | **2** |\n');
  assert.match(html, /<h3 id="title">Title<\/h3>/);
  assert.match(html, /<li>two<\/li>/);
  assert.match(html, /<td><strong>2<\/strong><\/td>/);
});

test('a task given on the page runs through Jarvis and shows its report', async () => {
  const repo = makeCopy();
  const saved = { bin: process.env.CLAUDE_BIN, id: process.env.JARVIS_TASK_ID };
  process.env.CLAUDE_BIN = fileURLToPath(new URL('./fake-claude.mjs', import.meta.url));
  process.env.JARVIS_TASK_ID = '';
  try {
    const page = { host: HOST, origin: `http://${HOST}`, marker: '1' };
    assert.equal(act(repo.dir, '/tasks', { ...page, body: '{"task":"  "}' }).status, 400);
    const added = act(repo.dir, '/tasks', { ...page, body: JSON.stringify({ task: 'Say hello; & "quote" $(rm -rf x)' }) });
    assert.equal(added.status, 200);
    const { id } = JSON.parse(added.body);
    const entry = () => JSON.parse(readFileSync(repo.path('ops', 'queue.json'), 'utf8')).find((t) => t.id === id);
    assert.ok(entry().task.includes('$(rm -rf x)'), 'the task is stored as plain text');
    for (let i = 0; i < 100 && !entry().finished; i += 1) await new Promise((done) => setTimeout(done, 100));
    assert.ok(entry().finished, 'the task finished');
    assert.ok(handle(repo.dir, 'GET', '/', HOST).body.includes(encodeURIComponent(entry().report)));
  } finally {
    if (saved.bin === undefined) delete process.env.CLAUDE_BIN;
    else process.env.CLAUDE_BIN = saved.bin;
    if (saved.id === undefined) delete process.env.JARVIS_TASK_ID;
    else process.env.JARVIS_TASK_ID = saved.id;
    rmSync(repo.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test('other websites and bad requests cannot act', () => {
  const page = { host: HOST, origin: `http://${HOST}`, marker: '1', body: '{"task":"x"}' };
  assert.equal(act(copy.dir, '/tasks', { ...page, origin: 'https://evil.example' }).status, 403);
  assert.equal(act(copy.dir, '/tasks', { ...page, marker: undefined }).status, 403);
  assert.equal(act(copy.dir, '/tasks', { ...page, host: 'evil.example' }).status, 403);
  assert.equal(act(copy.dir, '/tasks', { ...page, body: 'not json' }).status, 400);
  assert.equal(act(copy.dir, '/tasks/../../x/cancel', page).status, 404);
});

test('a full plan window keeps a task queued, and it can be cancelled', () => {
  const repo = makeCopy();
  try {
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    const resetsAt = Math.floor(Date.now() / 1000) + 3600;
    writeFileSync(repo.path('ops', 'runs', 'plan-limits.json'), JSON.stringify({ at: new Date().toISOString(), windows: { seven_day: { utilization: 0.9, resetsAt } } }));
    const page = { host: HOST, origin: `http://${HOST}`, marker: '1' };
    const added = JSON.parse(act(repo.dir, '/tasks', { ...page, body: '{"task":"Wait"}' }).body);
    assert.match(added.message, /can't start until the plan's weekly window resets/);
    assert.equal(act(repo.dir, '/run', { ...page, body: '' }).status, 409);
    assert.equal(act(repo.dir, `/tasks/${added.id}/cancel`, { ...page, body: '' }).status, 200);
    assert.equal(act(repo.dir, `/tasks/${added.id}/cancel`, { ...page, body: '' }).status, 409);
  } finally {
    rmSync(repo.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test('small helpers cope with missing and awkward input', () => {
  assert.equal(escapeHtml(null), '');
  assert.deepEqual(parseApprovals('no table here'), []);
  assert.deepEqual(recentSteps(copy.dir, 'J-none'), []);
});
