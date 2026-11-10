import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo.dir, CLAUDE_BIN: FAKE, JARVIS_TASK_ID: '', JARVIS_POLL_MS: '200', ...env },
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
    jarvis(['add', 'This will hit the limit for motionrepo']);
    jarvis(['add', 'Behind it, also motionrepo']);
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

describe('lanes: products side by side', () => {
  const timeline = () => readFileSync(repo.path('ops', 'runs', 'fake-timeline.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const at = (task, event) => timeline().find((e) => e.id === task.id && e.event === event).at;
  const lanesDir = () => repo.path('ops', 'runs', 'lanes');
  const startRunner = () => {
    const child = spawn(process.execPath, [join('scripts', 'jarvis.mjs'), 'run'], { cwd: repo.dir, env: { ...process.env, CLAUDE_PROJECT_DIR: repo.dir, CLAUDE_BIN: FAKE, JARVIS_TASK_ID: '', JARVIS_POLL_MS: '200' }, stdio: 'ignore' });
    return { child, closed: new Promise((done) => child.on('close', done)) };
  };

  it('records each task\'s product when it is added', () => {
    jarvis(['add', 'Find leads for Peel Press']);
    jarvis(['add', 'Write something general']);
    jarvis(['add', 'Compare motionrepo with peelpress']);
    assert.deepEqual(queue().map((t) => t.product), ['peelpress', null, null]);
  });

  it('runs two products at the same time: both start before either finishes', () => {
    jarvis(['add', 'Slow motionrepo job']);
    jarvis(['add', 'Slow peelpress job']);
    const r = jarvis(['run']);
    assert.equal(r.code, 0, r.out);
    const [a, b] = [byTask('motionrepo job'), byTask('peelpress job')];
    assert.deepEqual([a.status, b.status], ['done', 'done']);
    assert.ok(at(a, 'start') < at(b, 'end') && at(b, 'start') < at(a, 'end'), 'the two runs overlapped');
    assert.match(r.out, /\[motionrepo\] .*→ researcher: Fake research/);
    assert.match(r.out, /\[peelpress\] .*→ researcher: Fake research/);
    assert.ok(existsSync(repo.path('ops', 'runs', `${a.id}.log`)) && existsSync(repo.path('ops', 'runs', `${b.id}.log`)), 'each task keeps its own log');
    assert.equal(existsSync(repo.path('ops', 'runs', 'jarvis.lock')), false);
    assert.deepEqual(existsSync(lanesDir()) ? readdirSync(lanesDir()) : [], [], 'lane locks are released');
  });

  it('keeps a product\'s second task waiting while other products run', () => {
    jarvis(['add', 'Slow motionrepo first']);
    jarvis(['add', 'Slow motionrepo second']);
    jarvis(['add', 'Slow peelpress only']);
    jarvis(['run']);
    const [first, second, other] = [byTask('motionrepo first'), byTask('motionrepo second'), byTask('peelpress only')];
    assert.deepEqual([first.status, second.status, other.status], ['done', 'done', 'done']);
    assert.ok(at(second, 'start') >= at(first, 'end'), 'the second MotionRepo task started after the first ended');
    assert.ok(at(other, 'start') < at(first, 'end'), 'Peelpress did not wait behind MotionRepo\'s second task');
  });

  it('runs one at a time with JARVIS_LANES=1, and a task with no product gets a lane of its own', () => {
    jarvis(['add', 'Slow motionrepo job']);
    jarvis(['add', 'Slow peelpress job']);
    jarvis(['run'], { JARVIS_LANES: '1' });
    assert.ok(at(byTask('peelpress job'), 'start') >= at(byTask('motionrepo job'), 'end'));
    rmSync(repo.path('ops', 'runs'), { recursive: true, force: true });
    jarvis(['add', 'Slow general job one']);
    jarvis(['add', 'Slow general job two']);
    jarvis(['run']);
    assert.ok(at(byTask('job one'), 'start') < at(byTask('job two'), 'end') && at(byTask('job two'), 'start') < at(byTask('job one'), 'end'));
  });

  it('starts a task added while a lane is busy as soon as its lane is free', async () => {
    jarvis(['add', 'Slow motionrepo long job']);
    const { closed } = startRunner();
    await new Promise((done) => setTimeout(done, 700));
    jarvis(['add', 'Slow peelpress late job']);
    assert.equal(jarvis(['run']).code, 1, 'a second run does not start; the live one picks the task up');
    await closed;
    const [a, b] = [byTask('long job'), byTask('late job')];
    assert.deepEqual([a.status, b.status], ['done', 'done']);
    assert.ok(at(b, 'start') < at(a, 'end'), 'the late task started while the first was still running');
  });

  it('applies the plan guard to every lane', () => {
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    writeFileSync(repo.path('ops', 'runs', 'plan-limits.json'), JSON.stringify({ at: new Date().toISOString(), windows: { five_hour: { utilization: 0.9, resetsAt: Math.floor(Date.now() / 1000) + 600 } } }));
    jarvis(['add', 'Slow motionrepo job']);
    jarvis(['add', 'Slow peelpress job']);
    const r = jarvis(['run']);
    assert.match(r.out, /Not starting .*5-hour window is at 90%/);
    assert.deepEqual(queue().map((t) => t.status), ['queued', 'queued']);
  });

  it('starts nothing more once a running task reports a full window, but lets the others finish', () => {
    for (const p of ['motionrepo', 'peelpress', 'pitchlight']) jarvis(['add', `Slow ${p} job`]);
    jarvis(['run'], { JARVIS_LANES: '2', FAKE_UTIL: '0.9' });
    assert.deepEqual(queue().map((t) => t.status), ['done', 'done', 'queued'], 'two ran side by side below the guard; the third waited for the window');
    assert.ok(existsSync(repo.path('ops', 'runs', 'resume-after-limit.json')), 'mission control is told to resume after the reset');
  });

  it('puts every task a crashed runner left running back in the queue, and clears its lane locks', () => {
    jarvis(['add', 'Interrupted motionrepo job']);
    jarvis(['add', 'Interrupted peelpress job']);
    writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify(queue().map((t) => ({ ...t, status: 'running', started: '2026-11-10 01:00' }))));
    mkdirSync(lanesDir(), { recursive: true });
    for (const t of queue()) writeFileSync(join(lanesDir(), `${t.id}.lock`), '999999');
    writeFileSync(repo.path('ops', 'runs', 'jarvis.lock'), '999999');
    const r = jarvis(['run']);
    assert.equal(r.code, 0, r.out);
    assert.deepEqual(queue().map((t) => t.status), ['done', 'done']);
    assert.deepEqual(readdirSync(lanesDir()), []);
  });

  it('holds a lane lock for each running task while it runs', async () => {
    jarvis(['add', 'Slow motionrepo job']);
    jarvis(['add', 'Slow peelpress job']);
    const { child, closed } = startRunner();
    await new Promise((done) => setTimeout(done, 700));
    const locks = readdirSync(lanesDir()).sort();
    assert.deepEqual(locks, queue().map((t) => `${t.id}.lock`).sort());
    assert.equal(readFileSync(join(lanesDir(), locks[0]), 'utf8'), String(child.pid));
    await closed;
  });
});

describe('every lead task also drafts the outreach', () => {
  const text = (...p) => readFileSync(repo.path(...p), 'utf8');
  it('tells the coordinator, the briefs and CLAUDE.md to draft for qualified leads without being asked', () => {
    assert.match(text('.claude', 'agents', 'coordinator.md'), /Every lead task goes on to outreach, without being asked/);
    assert.doesNotMatch(text('.claude', 'agents', 'coordinator.md'), /Leads stop at leads/);
    assert.match(text('.claude', 'skills', 'task-briefs', 'SKILL.md'), /Every lead task also drafts the outreach, without asking/);
    assert.doesNotMatch(text('.claude', 'skills', 'task-briefs', 'SKILL.md'), /Draft only when asked|don't chain into outreach/);
    assert.match(text('CLAUDE.md'), /Every lead task also drafts the outreach for the leads that pass review and qualify, without being asked/);
  });
  it('puts it in the nightly sweep and the project lead sprint, and in main memory instead of the old entry', () => {
    for (const f of [['ops', 'schedule.json'], ['scripts', 'schedule.mjs'], ['scripts', 'projects.mjs']]) {
      assert.match(text(...f), /then draft emails for the leads that qualify/);
      assert.doesNotMatch(text(...f), /stop at leads: no drafts|statuses set; no drafts/);
    }
    const memory = text('memory', 'MAIN.md');
    assert.match(memory, /2026-11-10 · Outreach \(from 2026-11-10\): every lead task also drafts outreach/);
    assert.doesNotMatch(memory, /lead tasks stop at leads unless the request asks for drafts/);
  });
  it('no longer tells people to ask for drafts of the leads a run found', () => {
    assert.doesNotMatch(text('scripts', 'outreach.mjs'), /Nothing is drafted or sent unless a person asks/);
    assert.doesNotMatch(text('scripts', 'jarvis.mjs'), /can be drafted now/);
  });
});
