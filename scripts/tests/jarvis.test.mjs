import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

const FAKE = fileURLToPath(new URL('./fake-claude.mjs', import.meta.url));
const jarvis = (args, env = {}) => {
  const r = spawnSync(process.execPath, [join('scripts', 'jarvis.mjs'), ...args], {
    cwd: repo.dir,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo.dir, CLAUDE_BIN: FAKE, JARVIS_TASK_ID: '', ...env },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};
const queue = () => JSON.parse(readFileSync(repo.path('ops', 'queue.json'), 'utf8'));
const byTask = (words) => queue().find((t) => t.task.includes(words));

beforeEach(() => {
  for (const f of [['ops', 'queue.json'], ['ops', 'queue.md'], ['ops', 'runs'], ['outputs', 'reports']]) rmSync(repo.path(...f), { recursive: true, force: true });
});

describe('queue', () => {
  it('adds tasks with dated ids and a readable copy', () => {
    assert.equal(jarvis(['add', 'Research', 'the', 'market']).code, 0);
    jarvis(['add', 'Write a blog post']);
    const [a, b] = queue();
    assert.match(a.id, /^J-\d{8}-01$/);
    assert.match(b.id, /^J-\d{8}-02$/);
    assert.equal(a.task, 'Research the market');
    assert.equal(a.status, 'queued');
    assert.match(readFileSync(repo.path('ops', 'queue.md'), 'utf8'), /\| J-\d{8}-01 \| Research the market \| queued \|/);
  });
  it('refuses an empty task', () => assert.equal(jarvis(['add']).code, 1));
  it('cancels a queued task', () => {
    jarvis(['add', 'Something to cancel']);
    assert.equal(jarvis(['cancel', queue()[0].id]).code, 0);
    assert.equal(queue().length, 0);
  });
});

describe('running', () => {
  it('runs the queue in order and records the reports', () => {
    jarvis(['add', 'First task']);
    jarvis(['add', 'Second task, needs approval']);
    const r = jarvis(['run']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /→ researcher: Fake research/);
    const first = byTask('First');
    assert.equal(first.status, 'done');
    assert.equal(first.report, `outputs/reports/${first.id}.md`);
    assert.match(readFileSync(repo.path(first.report), 'utf8'), new RegExp(`Done \\(${first.id}\\)`), 'the task sees its own JARVIS_TASK_ID');
    assert.equal(byTask('Second').status, 'needs_approval');
    assert.match(readFileSync(repo.path('ops', 'queue.md'), 'utf8'), /needs you/);
  });
  it('stops after --max tasks', () => {
    jarvis(['add', 'One']);
    jarvis(['add', 'Two']);
    jarvis(['run', '--max', '1']);
    assert.deepEqual(queue().map((t) => t.status), ['done', 'queued']);
  });
  it('marks a failed task and carries on', () => {
    jarvis(['add', 'Please fail now']);
    jarvis(['add', 'After the failure']);
    jarvis(['run']);
    assert.equal(byTask('Please fail').status, 'failed');
    assert.match(readFileSync(repo.path(byTask('Please fail').report), 'utf8'), /Something broke/);
    assert.equal(byTask('After the failure').status, 'done');
  });
  it('writes a report when the coordinator gives no JARVIS block', () => {
    jarvis(['add', 'Task with no report']);
    jarvis(['run']);
    const t = byTask('no report');
    assert.equal(t.status, 'check');
    assert.match(readFileSync(repo.path(t.report), 'utf8'), /forgot the block/);
  });
  it('counts lessons the task recorded', () => {
    jarvis(['add', 'Please add a lesson']);
    jarvis(['run']);
    assert.match(byTask('add a lesson').note, /1 lesson\(s\) recorded/);
  });
  it('do runs only the new task', () => {
    jarvis(['add', 'Waiting in line']);
    assert.equal(jarvis(['do', 'Urgent', 'job']).code, 0);
    assert.equal(byTask('Urgent').status, 'done');
    assert.equal(byTask('Waiting').status, 'queued');
  });
});

describe('usage guard', () => {
  it('records the plan windows and refuses to start when one is nearly full', () => {
    jarvis(['add', 'Uses a lot']);
    jarvis(['run'], { FAKE_UTIL: '0.9' });
    assert.match(jarvis(['usage']).out, /5-hour: 90% used/);
    jarvis(['add', 'Next one']);
    const r = jarvis(['run']);
    assert.match(r.out, /Not starting .*5-hour window is at 90%/);
    assert.equal(byTask('Next one').status, 'queued');
  });
  it('can be overridden', () => {
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    writeFileSync(
      repo.path('ops', 'runs', 'plan-limits.json'),
      JSON.stringify({ at: new Date().toISOString(), windows: { five_hour: { utilization: 0.95, resetsAt: Math.floor(Date.now() / 1000) + 600 } } }),
    );
    jarvis(['add', 'Override me']);
    jarvis(['run', '--ignore-limits']);
    assert.equal(byTask('Override me').status, 'done');
  });
  it('ignores a window that has reset', () => {
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    writeFileSync(
      repo.path('ops', 'runs', 'plan-limits.json'),
      JSON.stringify({ at: new Date().toISOString(), windows: { five_hour: { utilization: 0.99, resetsAt: Math.floor(Date.now() / 1000) - 10 } } }),
    );
    jarvis(['add', 'After reset']);
    jarvis(['run']);
    assert.equal(byTask('After reset').status, 'done');
  });
  it('puts a task cut off by the limit back in the queue and stops', () => {
    jarvis(['add', 'This will hit the limit']);
    jarvis(['add', 'Behind it']);
    jarvis(['run', '--ignore-limits']);
    assert.equal(byTask('hit the limit').status, 'queued');
    assert.match(byTask('hit the limit').note, /usage limit/);
    assert.equal(byTask('Behind it').status, 'queued');
  });
});

describe('safety', () => {
  it('refuses to run or queue from inside a Jarvis task', () => {
    assert.equal(jarvis(['run'], { JARVIS_TASK_ID: 'J-20261030-01' }).code, 1);
    assert.equal(jarvis(['add', 'Recursive'], { JARVIS_TASK_ID: 'J-20261030-01' }).code, 1);
    assert.equal(existsSync(repo.path('ops', 'queue.json')), false);
  });
  it('allows only one run at a time', () => {
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    writeFileSync(repo.path('ops', 'runs', 'jarvis.lock'), String(process.pid));
    jarvis(['add', 'Blocked by another run']);
    const r = jarvis(['run']);
    assert.equal(r.code, 1);
    assert.match(r.out, /already going/);
  });
  it('takes over a lock left by a run that died', () => {
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    writeFileSync(repo.path('ops', 'runs', 'jarvis.lock'), '999999');
    jarvis(['add', 'After a crash']);
    assert.equal(jarvis(['run']).code, 0);
    assert.equal(byTask('After a crash').status, 'done');
  });
  it('requeues a task left running by a crash', () => {
    jarvis(['add', 'Interrupted']);
    const q = queue();
    q[0].status = 'running';
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify(q));
    jarvis(['run']);
    assert.equal(byTask('Interrupted').status, 'done');
  });
});

describe('trust check', () => {
  const home = (projects) => {
    const dir = join(repo.dir, 'fake-home');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.claude.json'), JSON.stringify({ projects }));
    return { HOME: dir, USERPROFILE: dir, CLAUDE_BIN: process.execPath };
  };
  it('refuses to start in a folder Claude Code does not trust, and says why on the waiting task', () => {
    jarvis(['add', 'Waiting task'], { CLAUDE_BIN: FAKE });
    const r = jarvis(['run'], home({}));
    assert.equal(r.code, 1);
    assert.match(r.out, /doesn't trust this folder yet/);
    assert.match(byTask('Waiting').note, /run "claude", accept the trust question/);
    assert.equal(byTask('Waiting').status, 'queued');
  });
  it('starts once the folder is trusted', () => {
    const r = jarvis(['run'], home({ [realpathSync(repo.dir)]: { hasTrustDialogAccepted: true } }));
    assert.equal(r.code, 0, r.out);
  });
  it('does not check a stand-in script, or when the settings file is missing', () => {
    assert.equal(jarvis(['run'], { HOME: join(repo.dir, 'no-such-home'), CLAUDE_BIN: process.execPath }).code, 0);
    assert.equal(jarvis(['run'], { ...home({}), CLAUDE_BIN: FAKE }).code, 0);
  });
});

describe('spending less of the plan', () => {
  const args = () => readFileSync(repo.path('ops', 'runs', 'fake-args.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const lead = (id, company) => ({ id, company, product: 'motionrepo', status: 'qualified', tier: 'C', score: 49, website: `https://${id}.test`, contact: { channel: 'contact form', where: `https://${id}.test/contact` }, evidence: [], history: [{ at: '2026-11-09', event: 'imported', note: 'test' }] });

  it('runs the coordinator on Sonnet at medium effort, unless told otherwise', () => {
    jarvis(['add', 'A planning task']);
    jarvis(['run']);
    assert.deepEqual(args().at(-1).slice(-4), ['--model', 'sonnet', '--effort', 'medium']);
    jarvis(['add', 'Another task']);
    jarvis(['run'], { JARVIS_MODEL: 'opus', JARVIS_EFFORT: 'high' });
    assert.deepEqual(args().at(-1).slice(-4), ['--model', 'opus', '--effort', 'high']);
  });

  it('runs a drafting task from the Outreach page as the drafting lane: draft, review each at once, fix, re-review, no coordinator', () => {
    writeFileSync(repo.path('pipeline', 'leads.jsonl'), `${[lead('L-0000aaaa', 'Alpha Co'), lead('L-0000bbbb', 'Redo Labs')].map((l) => JSON.stringify(l)).join('\n')}\n`);
    for (const id of ['L-0000aaaa', 'L-0000bbbb']) rmSync(repo.path('outputs', 'outreach', `${id}.md`), { force: true });
    jarvis(['add', 'Draft outreach email sequences for these motionrepo leads: Alpha Co (L-0000aaaa), Redo Labs (L-0000bbbb). A person confirmed drafting.']);
    const t = byTask('Draft outreach email sequences');
    writeFileSync(repo.path('ops', 'outreach.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), kind: 'draft-request', leads: ['L-0000aaaa', 'L-0000bbbb'], task: t.id, by: 'test' })}\n`);
    rmSync(repo.path('ops', 'runs', 'fake-args.jsonl'), { force: true });
    const r = jarvis(['run']);
    assert.equal(r.code, 0, r.out);
    const calls = args();
    assert.ok(!calls.some((a) => !a.includes('--agent')), 'no coordinator session');
    const agents = calls.map((a) => `${a[a.indexOf('--agent') + 1]}/${a[a.indexOf('--model') + 1]}`);
    assert.deepEqual(agents, ['outreach/sonnet', 'evaluator/opus', 'evaluator/opus', 'outreach/sonnet', 'evaluator/opus'], 'draft, two reviews at once, one fix, one re-review');
    const done = byTask('Draft outreach email sequences');
    assert.equal(done.status, 'done', done.note);
    const report = readFileSync(repo.path(done.report), 'utf8');
    assert.match(report, /2 of 2 draft\(s\) passed review and wait for you on the Emails page/);
    assert.match(report, /\| Redo Labs \(L-0000bbbb\) \| outputs\/outreach\/L-0000bbbb\.md \| PASS 90\/100 \(outputs\/reviews\/T-\d{8}-\d{2}-L-0000bbbb-r2\.md\) \|/);
    const leads = readFileSync(repo.path('pipeline', 'leads.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual([...new Set(leads.filter((l) => l.id === 'L-0000aaaa').map((l) => l.status))].at(-1), 'drafted', 'passed leads are marked drafted');
    assert.match(readFileSync(repo.path('ops', 'board.md'), 'utf8'), new RegExp(`\\| T-\\d{8}-\\d{2} \\| ${t.id}: draft outreach sequences for Alpha Co, Redo Labs .*\\| outreach \\| passed \\|`));
    const log = readFileSync(repo.path('ops', 'runs', `${t.id}.log`), 'utf8');
    assert.equal((log.match(/"name":"Agent"/g) || []).length, 5, 'mission control sees each step as an agent at work');
    assert.match(r.out, /→ evaluator: review one outreach draft/);
  });

  it('leaves a task that only mentions drafting to the coordinator', () => {
    jarvis(['add', 'Write a plan for drafting emails next week']);
    rmSync(repo.path('ops', 'runs', 'fake-args.jsonl'), { force: true });
    jarvis(['run']);
    assert.ok(!args()[0].includes('--agent'));
  });
});
