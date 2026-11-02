import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { act, activeAgents, checkPassword, collect, createAuth, escapeHtml, handle, hashPassword, parseApprovals, recentSteps, renderLive, renderMarkdown, renderSignIn, sameSite } from '../dashboard.mjs';
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

test('a password is stored as a hash and checked against it', () => {
  const stored = hashPassword('correct horse battery');
  assert.ok(!stored.includes('correct'));
  assert.ok(checkPassword('correct horse battery', stored));
  assert.ok(!checkPassword('wrong password here', stored));
  assert.ok(!checkPassword('anything', 'not-a-hash'));
});

test('wrong passwords lock an address, and it recovers after the wait', () => {
  let time = 1_000_000;
  const auth = createAuth(hashPassword('correct horse battery'), () => time);
  for (let i = 0; i < 5; i += 1) assert.equal(auth.signIn('nope', '1.1.1.1').token, undefined);
  assert.equal(auth.signIn('correct horse battery', '1.1.1.1').locked, true, 'the right password is refused while locked');
  assert.ok(auth.signIn('correct horse battery', '2.2.2.2').token, 'another address still gets in');
  time += 16 * 60_000;
  assert.ok(auth.signIn('correct horse battery', '1.1.1.1').token);
});

test('guessing from many addresses locks every address', () => {
  const auth = createAuth(hashPassword('correct horse battery'), () => 1_000_000);
  for (let i = 0; i < 30; i += 1) auth.signIn('nope', `10.0.0.${i}`);
  assert.equal(auth.signIn('correct horse battery', '9.9.9.9').locked, true);
});

test('a session ends when it expires or on sign-out', () => {
  let time = 1_000_000;
  const auth = createAuth(hashPassword('correct horse battery'), () => time);
  const { token } = auth.signIn('correct horse battery', 'a');
  assert.ok(auth.valid(token));
  assert.ok(!auth.valid('made-up'));
  assert.ok(!auth.valid(undefined));
  time += 13 * 3_600_000;
  assert.ok(!auth.valid(token));
  const next = auth.signIn('correct horse battery', 'a').token;
  auth.signOut(next);
  assert.ok(!auth.valid(next));
});

test('online, only the public HTTPS address counts', () => {
  const site = 'team.example.com';
  assert.ok(sameSite({ host: site, origin: `https://${site}`, marker: '1', site }));
  assert.ok(!sameSite({ host: site, origin: `http://${site}`, marker: '1', site }));
  assert.ok(!sameSite({ host: '127.0.0.1:4317', origin: 'http://127.0.0.1:4317', marker: '1', site }));
  assert.equal(handle(copy.dir, 'GET', '/', HOST, { site }).status, 403);
  assert.equal(handle(copy.dir, 'GET', '/', site, { site }).status, 200);
});

test('the sign-in page says nothing about the team', () => {
  const html = renderSignIn();
  for (const word of ['Pippin', 'leads', 'approvals', 'jarvis']) assert.ok(!html.toLowerCase().includes(word.toLowerCase()), word);
});

test('the page will not start online without a sign-in', () => {
  const r = spawnSync(process.execPath, [copy.path('scripts', 'dashboard.mjs'), '--port', '0'], { env: { ...process.env, TEAM_PAGE_HOST: 'team.example.com', TEAM_PAGE_PASSWORD_HASH: '' }, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /must not go online without a sign-in/);
});

test('--hash refuses a short password', () => {
  const run = (input) => spawnSync(process.execPath, [copy.path('scripts', 'dashboard.mjs'), '--hash'], { input, encoding: 'utf8' });
  assert.equal(run('short').status, 1);
  assert.match(run('a long enough password\n').stdout, /^scrypt:[a-f0-9]+:[a-f0-9]+\n$/);
});

test('with a sign-in, nothing works until the password is right', async () => {
  const server = spawn(process.execPath, [copy.path('scripts', 'dashboard.mjs'), '--port', '0'], {
    env: { ...process.env, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: hashPassword('correct horse battery') },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  try {
    const base = await new Promise((done) => server.stdout.once('data', (chunk) => done(/http:\S+/.exec(String(chunk))[0])));
    const headers = { Origin: base, 'X-Team-Page': '1', 'Content-Type': 'application/json' };
    const post = (path, body, extra = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body) });

    const home = await (await fetch(`${base}/`)).text();
    assert.ok(home.includes('id="signin"'));
    assert.ok(!home.includes('Held'), 'no lead data before sign-in');
    assert.equal((await fetch(`${base}/live`)).status, 401);
    assert.ok((await (await fetch(`${base}/view?file=outputs/outreach/L-11111111.md`)).text()).includes('id="signin"'));
    assert.equal((await post('/tasks', { task: 'x' })).status, 401);
    assert.equal((await post('/login', { password: 'wrong' })).status, 401);
    assert.equal((await post('/login', { password: 'correct horse battery' }, { Origin: 'https://evil.example' })).status, 403);

    const signedIn = await post('/login', { password: 'correct horse battery' });
    assert.equal(signedIn.status, 200);
    const setCookie = signedIn.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly; SameSite=Strict/);
    const Cookie = setCookie.split(';')[0];
    assert.equal((await fetch(`${base}/live`, { headers: { Cookie } })).status, 200);
    assert.ok((await (await fetch(`${base}/`, { headers: { Cookie } })).text()).includes('Sign out'));
    assert.equal((await fetch(`${base}/view?file=.env`, { headers: { Cookie } })).status, 404);

    assert.equal((await post('/logout', {}, { Cookie })).status, 200);
    assert.equal((await fetch(`${base}/live`, { headers: { Cookie } })).status, 401);
  } finally {
    server.kill();
  }
});

test('small helpers cope with missing and awkward input', () => {
  assert.equal(escapeHtml(null), '');
  assert.deepEqual(parseApprovals('no table here'), []);
  assert.deepEqual(recentSteps(copy.dir, 'J-none'), []);
});

test('the running task shows which agents it has reached, and a backup counts for its agent', () => {
  const names = ['coordinator', 'researcher', 'sales', 'evaluator'];
  const steps = ['Wrote outputs/reviews/T-1-r1.md', 'Handed work to sales-fallback: Reply', 'Handed work to an agent: x', 'Handed work to researcher: Check', 'Wrote ops/board.md', 'Wrote outputs/outreach/L-1.md'];
  const got = activeAgents(steps, names);
  assert.equal(got.focus, 'evaluator');
  assert.deepEqual(got.seen, ['evaluator', 'sales', 'researcher']);
  assert.deepEqual(got.backup, ['sales']);
  assert.deepEqual(activeAgents(['Read x'], names), { focus: null, seen: [], backup: [] });
});

test('the map plays a demo when nothing runs, and lights the working agent when a run is alive', () => {
  assert.equal(collect(copy.dir).working, null, 'a log without a live run is not work in progress');
  const idle = handle(copy.dir, 'GET', '/', HOST).body;
  assert.match(idle, /id="map"[^>]*data-mode="demo"/);
  assert.match(idle, /<svg class="mapsvg"[^>]*role="img"[^>]*aria-labelledby="map-t map-d"/);
  for (const name of ['researcher', 'lead-generator', 'outreach', 'sales', 'demo-handler', 'developer', 'docs-handler', 'marketing', 'knowledge-base', 'evaluator']) assert.ok(idle.includes(`data-k="n-${name}"`), name);
  assert.match(idle, /data-k="g-n">1</, 'the waiting sends show at the gate');
  assert.match(idle, /data-k="t-found">3 FOUND</);

  const repo = makeCopy();
  try {
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify([{ id: 'J-1', task: 'Find leads.', status: 'running', started: '2026-11-02 10:00' }]));
    writeFileSync(repo.path('ops', 'runs', 'J-1.log'), `${JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Agent', input: { subagent_type: 'researcher', description: 'Look' } }] } })}
`);
    writeFileSync(repo.path('ops', 'runs', 'jarvis.lock'), String(process.pid));
    const data = collect(repo.dir);
    assert.equal(data.working.focus, 'researcher');
    const html = renderLive(data);
    assert.match(html, /id="map"[^>]*data-mode="live"/);
    assert.match(html, /data-k="n-researcher" data-st="work"/);
    assert.match(html, /data-k="n-sales" data-st="idle"/);
    assert.equal(html.split('<!--split-->').length, 2, 'the live refresh still has two parts');
    assert.ok(html.split('<!--split-->')[0].includes('id="map"'), 'the map sits in the first part, which the page patches in place');
  } finally {
    rmSync(repo.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test('the page uses its own fonts and colours, and keeps the walkthrough readable without scripts', () => {
  const body = handle(copy.dir, 'GET', '/', HOST).body;
  const faces = [...body.matchAll(/--(?:head|serif|mono):([^;]*);|href="(https:\/\/fonts\.googleapis[^"]*)"/g)].map((m) => m[1] ?? m[2]).join(' ');
  for (const font of ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open+Sans', 'Open Sans', 'Space+Grotesk', 'DM+Sans', 'Manrope', 'Jakarta', 'Outfit', 'Geist', 'Atkinson', 'Bricolage', 'system-ui']) assert.ok(!faces.includes(font), font);
  assert.match(body, /family=Big\+Shoulders\+Display/);
  assert.match(body, /<h2 id="how-h">How the team works<\/h2>/);
  assert.equal((body.match(/class="step"/g) ?? []).length, 6);
  assert.ok(!/purple|violet|indigo|backdrop-filter/i.test(body));
});

test('the sign-in page has a picture but no team data', () => {
  const html = renderSignIn();
  assert.match(html, /<svg class="lockart"[^>]*aria-hidden="true"/);
  assert.ok(!html.includes('id="map"'));
});
