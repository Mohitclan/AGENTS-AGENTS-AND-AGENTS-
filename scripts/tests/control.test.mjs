import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { after, describe, it } from 'node:test';
import { agentDetail, avatarStatus, loadRoster, ownerOf, parseRun, readFile, snapshot } from '../control.mjs';
import { hashPassword } from '../dashboard.mjs';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

const line = (e) => JSON.stringify(e);
const use = (parent, id, name, input) => line({ type: 'assistant', parent_tool_use_id: parent, message: { content: [{ type: 'tool_use', id, name, input }] } });
const done = (parent, id, content, isError = false) => line({ type: 'user', parent_tool_use_id: parent, message: { content: [{ type: 'tool_result', tool_use_id: id, content, is_error: isError }] } });
const RUN = [
  use(null, 'a1', 'Agent', { subagent_type: 'researcher', description: 'Find launches' }),
  use('a1', 't1', 'WebSearch', { query: 'indian dev tools launch' }),
  use('a1', 't2', 'WebFetch', { url: 'https://peerlist.io/launchpad' }),
  done('a1', 't2', 'Request failed with status code 403', true),
  use('a1', 'a2', 'Agent', { subagent_type: 'knowledge-base', description: 'Check a fact' }),
  use('a2', 't3', 'Read', { file_path: '/repo/knowledge/products/motionrepo.md' }),
  done('a1', 'a2', 'RESULT\nstatus: done\nsummary: Fact is on line 42.'),
  done(null, 'a1', 'RESULT\nstatus: blocked\nsummary: Peerlist refused every request.'),
  use(null, 'a3', 'Agent', { subagent_type: 'sales', description: 'Call notes' }),
  done(null, 'a3', 'FALLBACK: sales failed 3 times; run sales-fallback.'),
  use(null, 'a4', 'Agent', { subagent_type: 'sales-fallback', description: 'Call notes' }),
  use('a4', 't4', 'Write', { file_path: '/repo/outputs/sales/x.md' }),
].join('\n');

describe('control: reading a run', () => {
  const { events, working } = parseRun(RUN, { id: 'J-20261102-09', started: '2026-11-02 10:00', status: 'running' }, '/repo');
  const of = (agent) => events.filter((e) => e.agent === agent);

  it('credits each step to the agent that took it, including nested asks', () => {
    assert.deepEqual(of('researcher').map((e) => e.kind), ['start', 'web', 'web', 'error', 'handoff', 'result']);
    assert.ok(of('knowledge-base').some((e) => e.kind === 'read' && e.text === 'Read knowledge/products/motionrepo.md'));
    assert.ok(of('coordinator').some((e) => e.kind === 'handoff' && e.to === 'researcher'));
  });

  it('records failures with the reason', () => {
    assert.match(of('researcher').find((e) => e.kind === 'error').text, /peerlist\.io.*403/);
    const result = of('researcher').find((e) => e.kind === 'result');
    assert.equal(result.status, 'failed');
    assert.match(result.text, /Peerlist refused/);
    assert.ok(of('sales').some((e) => e.kind === 'fallback' && e.status === 'failed'));
    assert.equal(of('sales').find((e) => e.kind === 'result').status, 'failed');
  });

  it('counts a backup as its agent, and knows who is still working', () => {
    assert.deepEqual(working.map((w) => [w.agent, w.backup]), [['sales', true]]);
    assert.ok(of('sales').some((e) => e.kind === 'file' && e.ref === 'outputs/sales/x.md'));
  });

  it('gives every event a time and an id', () => {
    assert.ok(events.every((e) => e.at && e.id));
  });
});

describe('control: the whole picture', () => {
  it('lists the main agents in order, without backups', () => {
    const names = loadRoster(repo.dir).map((a) => a.name);
    assert.equal(names[0], 'coordinator');
    assert.ok(names.includes('researcher'));
    assert.ok(!names.some((n) => n.endsWith('-fallback')));
  });

  it('builds a snapshot with agents, KPIs, feed and flags, and shows a live run', () => {
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    const started = new Date(Date.now() - 2 * 60_000).toLocaleString('sv-SE').slice(0, 16); // local "YYYY-MM-DD HH:MM", as Jarvis writes it
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify([{ id: 'J-20261102-09', task: 'Find launches', status: 'running', added: started, started }]));
    writeFileSync(repo.path('ops', 'runs', 'J-20261102-09.log'), RUN);
    writeFileSync(repo.path('ops', 'runs', 'jarvis.lock'), String(process.pid));
    const s = snapshot(repo.dir);
    assert.equal(s.live, true);
    // The coordinator waits while sales (on its backup) works.
    assert.equal(s.agents.find((a) => a.name === 'coordinator').status, 'waiting');
    const sales = s.agents.find((a) => a.name === 'sales');
    assert.equal(sales.status, 'working');
    assert.equal(sales.backupActive, true);
    assert.equal(s.agents.find((a) => a.name === 'researcher').status, 'error');
    assert.ok(s.feed.length > 0);
    assert.equal(typeof s.kpis.found, 'number');
  });

  it("gives an agent's page its outputs, failures and memory", () => {
    const d = agentDetail(repo.dir, 'researcher');
    assert.ok(d.failures.some((e) => e.kind === 'error'));
    assert.ok(Array.isArray(d.memory.lessons));
    assert.equal(agentDetail(repo.dir, 'nobody'), null);
  });

  it('reads only team documents', () => {
    assert.equal(ownerOf('outputs/research/x.md'), 'researcher');
    assert.ok(readFile(repo.dir, 'ops/board.md'));
    for (const bad of ['.env', '../x.md', 'outputs/../.env', 'pipeline/leads.jsonl', 'scripts/control.mjs', 'ops/mail-config.json']) {
      assert.equal(readFile(repo.dir, bad), null, bad);
    }
  });
});

describe('control: avatar states come from real events', () => {
  const now = Date.parse('2026-11-02T10:00:00Z');
  const ago = (min) => new Date(now - min * 60_000).toISOString();
  const st = (o) => avatarStatus({ now, name: 'researcher', ...o }).status;

  it('working or researching only while an agent call is open', () => {
    assert.equal(st({ live: true, busy: { agent: 'researcher' }, inRun: [{ kind: 'file', text: 'Wrote x' }] }), 'working');
    assert.equal(st({ live: true, busy: { agent: 'researcher' }, inRun: [{ kind: 'web', text: 'Opened x' }] }), 'researching');
    assert.equal(st({ live: false, busy: null, inRun: [{ kind: 'web' }] }), 'idle');
  });

  it('success and error last ten minutes after a real result', () => {
    assert.equal(st({ mine: [{ kind: 'result', status: 'ok', at: ago(2) }] }), 'success');
    assert.equal(st({ mine: [{ kind: 'result', status: 'failed', at: ago(2) }] }), 'error');
    assert.equal(st({ mine: [{ kind: 'result', status: 'warn', at: ago(2) }] }), 'waiting');
    assert.equal(st({ mine: [{ kind: 'result', status: 'ok', at: ago(30) }] }), 'idle');
  });

  it('the coordinator waits on agents or on you, and pauses when the plan is full', () => {
    const c = (o) => avatarStatus({ now, name: 'coordinator', ...o }).status;
    assert.equal(c({ live: true, working: [{ agent: 'researcher' }] }), 'waiting');
    assert.equal(c({ live: true, working: [] }), 'working');
    assert.equal(c({ live: false, paused: true }), 'paused');
    assert.equal(c({ live: false, latestTask: { status: 'needs_approval', finished: ago(1) } }), 'waiting');
    assert.equal(c({ live: false }), 'idle');
    assert.equal(st({ paused: true }), 'paused');
  });
});

describe('control: the server', () => {
  const start = (env) => new Promise((resolve) => {
    const child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: { ...process.env, ...env } });
    child.stdout.on('data', (d) => {
      const port = /:(\d+)/.exec(String(d))?.[1];
      if (port) resolve({ child, base: `http://127.0.0.1:${port}` });
    });
  });

  it('refuses to go online without a sign-in', async () => {
    const child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { env: { ...process.env, TEAM_PAGE_HOST: 'team.example.com', TEAM_PAGE_PASSWORD_HASH: '' } });
    const code = await new Promise((r) => child.on('close', r));
    assert.equal(code, 1);
  });

  it('shows no team data until signed in, and serves it after', async () => {
    const { child, base } = await start({ TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: hashPassword('correct horse battery') });
    try {
      assert.equal((await fetch(`${base}/api/state`)).status, 401);
      const page = await (await fetch(`${base}/`)).text();
      assert.match(page, /Sign in/);
      assert.doesNotMatch(page, /Pippin|leads\.jsonl/);
      const origin = base;
      const bad = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Team-Page': '1', Origin: origin }, body: JSON.stringify({ password: 'wrong one' }) });
      assert.equal(bad.status, 401);
      const ok = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Team-Page': '1', Origin: origin }, body: JSON.stringify({ password: 'correct horse battery' }) });
      assert.equal(ok.status, 200);
      const cookie = ok.headers.get('set-cookie').split(';')[0];
      const state = await (await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })).json();
      assert.ok(Array.isArray(state.agents));
      assert.equal(state.signOut, true);
      const csp = (await fetch(`${base}/`, { headers: { Cookie: cookie } })).headers.get('content-security-policy');
      assert.match(csp, /script-src 'self'/);
      const cross = await fetch(`${base}/api/tasks`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{"task":"x"}' });
      assert.equal(cross.status, 403);
    } finally {
      child.kill();
    }
  });
});
