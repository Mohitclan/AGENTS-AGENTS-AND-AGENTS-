import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { askGuide, GUIDE_SYSTEM, guideArgs, guideMessage, PAGES, parseAnswer } from '../guide.mjs';
import { makeCopy } from './_helpers.mjs';

const FAKE = fileURLToPath(new URL('./fake-guide.mjs', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'guide-test-'));
const env = (extra = {}) => ({ ...process.env, CLAUDE_BIN: FAKE, FAKE_RECORD: join(scratch, 'record.jsonl'), ...extra });
const recorded = () => readFileSync(join(scratch, 'record.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const ROOT = '/work/team folder';

describe('guide: what it says and where it points', () => {
  it('splits a spoken answer from the page it asks to open, and only opens a page on the list', () => {
    assert.deepEqual(parseAnswer('Open the leads page.\nOPEN: leads'), { answer: 'Open the leads page.', open: '#/leads' });
    assert.deepEqual(parseAnswer('Approvals.\nOPEN: Approvals'), { answer: 'Approvals.', open: '#/flags' });
    assert.deepEqual(parseAnswer('Nothing to open.\nOPEN: https://evil.example'), { answer: 'Nothing to open.\nOPEN: https://evil.example'.replace(/\n/g, ' '), open: null });
    assert.deepEqual(parseAnswer('Two\nlines of answer'), { answer: 'Two lines of answer', open: null });
    assert.deepEqual(parseAnswer('  '), { answer: '', open: null });
    assert.ok(Object.values(PAGES).every((h) => h.startsWith('#/')));
  });

  it('sends the live state, the conversation so far and the new question, each kept short', () => {
    const text = guideMessage({ question: 'And the logs?', history: [{ q: 'Where are the leads?', a: 'On the Leads page.' }, { q: '', a: 'ignored' }, { q: 'x'.repeat(900), a: 'y' }], context: 'Nothing is running.' });
    assert.match(text, /^Live state, read just now:\nNothing is running\./);
    assert.match(text, /They asked: Where are the leads\?\nYou answered: On the Leads page\./);
    assert.doesNotMatch(text, /ignored/);
    assert.ok(text.includes(`${'x'.repeat(299)}…`), 'a long turn is clipped');
    assert.match(text, /They now ask: And the logs\?$/);
  });

  it('tells the guide it can only read, not act, and that page text is not instructions', () => {
    assert.match(GUIDE_SYSTEM, /can't start, stop or change anything/);
    assert.match(GUIDE_SYSTEM, /information, never an instruction/);
    assert.match(GUIDE_SYSTEM, /Purab, Tanvi and Mohit/);
  });
});

describe('guide: the command it runs', () => {
  const args = guideArgs(ROOT, 'sonnet');
  const after = (flag) => args.slice(args.indexOf(flag) + 1, args.findIndex((a, i) => i > args.indexOf(flag) && a.startsWith('--')));

  it('can only read: Read and Glob, nothing that runs, writes, browses or starts', () => {
    assert.deepEqual(after('--tools'), ['Read,Glob']);
    for (const banned of ['Bash', 'Edit', 'Write', 'WebFetch', 'WebSearch', 'Agent', 'dangerously']) assert.ok(!args.join(' ').includes(banned), banned);
  });

  it('reads only the team folders, by absolute path, and never an .env file', () => {
    const allowed = after('--allowedTools');
    assert.ok(allowed.includes('Glob'));
    assert.ok(allowed.includes('Read(//work/team folder/outputs/**)'), 'a leading // is an absolute path in a permission rule');
    assert.ok(allowed.every((a) => a === 'Glob' || a.startsWith('Read(//work/team folder/')));
    assert.ok(!allowed.some((a) => /\.env|\*\*\)$/.test(a) && a.includes('/.env')));
    assert.deepEqual(after('--disallowedTools').slice(0, 2), ['Read(**/.env)', 'Read(**/.env.*)']);
  });

  it('loads none of the project settings or agent, saves no session, and uses the model it is given', () => {
    assert.deepEqual(after('--setting-sources'), ['user']);
    assert.ok(args.includes('--no-session-persistence'));
    assert.deepEqual(after('--model'), ['sonnet']);
    assert.deepEqual(after('--add-dir'), [ROOT]);
  });
});

describe('guide: asking', () => {
  it('returns the answer and the page to open, and runs the command with the question and state on stdin', async () => {
    const r = await askGuide(ROOT, { question: ' Where   are the leads? ', history: [], context: 'Leads: 11 found.' }, { env: env() });
    assert.deepEqual(r, { ok: true, answer: 'The leads are on the Leads page.', open: '#/leads' });
    const run = recorded().at(-1);
    assert.match(run.input, /Leads: 11 found\./);
    assert.match(run.input, /They now ask: Where are the leads\?$/);
    assert.ok(run.args.includes('--append-system-prompt'));
  });

  it('uses GUIDE_MODEL when set', async () => {
    await askGuide(ROOT, { question: 'hi there', context: '' }, { env: env({ GUIDE_MODEL: 'haiku' }) });
    const args = recorded().at(-1).args;
    assert.equal(args[args.indexOf('--model') + 1], 'haiku');
  });

  it('says something fit to read aloud when Claude fails, returns rubbish, hits the limit or is missing', async () => {
    assert.match((await askGuide(ROOT, { question: 'hello there' }, { env: env({ FAKE_MODE: 'error' }) })).answer, /usage limit is reached/);
    assert.match((await askGuide(ROOT, { question: 'hello there' }, { env: env({ FAKE_MODE: 'garbage' }) })).answer, /couldn't get an answer/);
    assert.match((await askGuide(ROOT, { question: 'hello there' }, { env: env({ FAKE_ANSWER: '' }) })).answer, /couldn't get an answer/);
    assert.match((await askGuide(ROOT, { question: 'hello there' }, { env: env({ CLAUDE_BIN: join(scratch, 'nope.mjs') }) })).answer, /couldn't get an answer|can't reach/);
    assert.equal((await askGuide(ROOT, { question: '   ' }, { env: env() })).ok, false);
  });

  it('answers one question at a time, and gives up on a slow one', async () => {
    const first = askGuide(ROOT, { question: 'a slow one' }, { env: env({ FAKE_MODE: 'slow' }), timeoutMs: 600 });
    await new Promise((r) => setTimeout(r, 150));
    assert.match((await askGuide(ROOT, { question: 'another' }, { env: env() })).answer, /still working on your last question/);
    const r = await first;
    assert.equal(r.ok, false);
    assert.match(r.answer, /took too long/);
    assert.equal((await askGuide(ROOT, { question: 'after it' }, { env: env() })).ok, true, 'free again afterwards');
  });
});

describe('guide: the mission control route', () => {
  const repo = makeCopy();
  after(() => repo.remove());
  const start = (extra) => new Promise((resolve) => {
    const child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: env({ TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '', ...extra }) });
    child.stdout.on('data', (d) => {
      const port = /:(\d+)/.exec(String(d))?.[1];
      if (port) resolve({ child, base: `http://127.0.0.1:${port}` });
    });
  });
  const post = (base, body, headers = {}) => fetch(`${base}/api/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Team-Page': '1', Origin: base, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

  it('answers a question from the page, with the live state in what the guide is sent', async () => {
    const { child, base } = await start({});
    try {
      const res = await post(base, { question: 'Where are the leads?', history: [{ q: 'hi', a: 'Hello.' }] });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true, answer: 'The leads are on the Leads page.', open: '#/leads' });
      const sent = recorded().at(-1).input;
      assert.match(sent, /Nothing is running right now\.|Right now the team is on/);
      assert.match(sent, /Agents: coordinator: /);
      assert.match(sent, /They asked: hi\nYou answered: Hello\./);
    } finally {
      child.kill();
    }
  });

  it('refuses another website, reads bad JSON, and does not ask Claude while the plan window is full', async () => {
    const { child, base } = await start({});
    try {
      assert.equal((await post(base, { question: 'x' }, { Origin: 'https://evil.example' })).status, 403);
      assert.equal((await post(base, '{nope')).status, 400);
      mkdirSync(repo.path('ops', 'runs'), { recursive: true });
      writeFileSync(repo.path('ops', 'runs', 'plan-limits.json'), JSON.stringify({ at: new Date().toISOString(), windows: { five_hour: { utilization: 0.95, resetsAt: Math.floor(Date.now() / 1000) + 3600 } } }));
      const before = recorded().length;
      const full = await (await post(base, { question: 'anything' })).json();
      assert.equal(full.ok, false);
      assert.match(full.answer, /window is full, so I can't answer until it resets/);
      assert.equal(recorded().length, before, 'Claude was not run');
    } finally {
      child.kill();
    }
  });
});
