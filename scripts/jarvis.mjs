#!/usr/bin/env node
// Jarvis: hand the team tasks and get finished results back. Each task runs as one coordinator
// session on autopilot (`claude -p`, your Max plan login), in queue order. Tasks for different products run side by
// side (up to JARVIS_LANES at once, default 4, at most one per product; a task with no product has a lane of its own). The
// coordinator runs on Sonnet at medium effort (JARVIS_MODEL and JARVIS_EFFORT change that): it plans and
// hands out work, and the agents and the reviews keep their own models. A drafting task a person asked for
// on the Outreach page skips the coordinator: Jarvis runs that fixed chain itself (scripts/draft-lane.mjs).
//
//   node scripts/jarvis.mjs add "<task>"            queue a task
//   node scripts/jarvis.mjs do "<task>"             queue a task and run it now
//   node scripts/jarvis.mjs run [--max n] [--ignore-limits] [--timeout-min n]
//                                                   work through the queue, oldest first, one lane per product
//   node scripts/jarvis.mjs list                    the queue
//   node scripts/jarvis.mjs cancel <id>             take a queued task off the queue
//   node scripts/jarvis.mjs usage                   how full the plan windows were at the last run
//   node scripts/jarvis.mjs archive <id>... --reason "<why>"
//                                                   take finished tasks (test runs, failed runs) off the queue and
//                                                   out of mission control; nothing is deleted (see archive below)
//
// The queue lives in ops/queue.json (readable copy: ops/queue.md); reports in outputs/reports/.
// Usage guard: Claude Code reports the plan's usage windows in its stream (rate_limit_event). The
// last report is kept in ops/runs/plan-limits.json, and no task starts while a window is at or over
// JARVIS_STOP_AT (default 0.85), since a task cut off by the limit loses its work.
// Lanes: each task has a product (set when it is added, from its text; scripts/lanes.mjs). A running task holds a lane
// lock, ops/runs/lanes/<id>.lock, and ops/runs/jarvis.lock still means "a runner is alive". While any lane is busy the
// runner looks at the queue every JARVIS_POLL_MS (default 3000), so a task added meanwhile starts at once if its lane is free.
// Leads and drafts: each task records the leads it found (leads_found). Every lead task goes on to draft the outreach
// for the leads that pass review and qualify, without being asked (the founder's decision of 2026-11-10); the report
// ends with what is waiting on a person: drafts ready to approve, and leads that could not be drafted, both on mission
// control's Outreach page (scripts/outreach.mjs). Nothing is sent until a person approves a draft there.
// Pilot test emails sent automatically after each task (scripts/send-tests.mjs) only while
// ops/mail-config.json has pilot.auto_test_sends; off since 2026-11-07, when approval took over.
import { spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync, writeSync,
} from 'node:fs';
import { join } from 'node:path';
import { ROOT, fail, printTable, resolveClaude, today, workspaceTrusted } from './_shared.mjs';
import { runDraftLane } from './draft-lane.mjs';
import { laneKey, laneLimit, productOf, startable } from './lanes.mjs';
import { latestLeads, outreachState } from './outreach.mjs';

const OPS = join(ROOT, 'ops');
const RUNS = join(OPS, 'runs');
const QUEUE = join(OPS, 'queue.json');
const QUEUE_MD = join(OPS, 'queue.md');
const ARCHIVE = join(OPS, 'archive');
const ARCHIVED = join(ARCHIVE, 'archived.json');
const REPORTS = join(ROOT, 'outputs', 'reports');
const PLAN_LIMITS = join(RUNS, 'plan-limits.json');
const RUN_LOCK = join(RUNS, 'jarvis.lock');
const LANE_LOCKS = join(RUNS, 'lanes');
const QUEUE_LOCK = join(RUNS, 'queue.lock');
const MAIL_CONFIG = join(OPS, 'mail-config.json');
const STOP_AT = Number(process.env.JARVIS_STOP_AT || 0.85);
const CLAUDE_BIN = resolveClaude();
const DEFAULT_TIMEOUT_MIN = 120;
const POLL_MS = Number(process.env.JARVIS_POLL_MS) || 3000;
const STATUS_LABEL = { needs_approval: 'needs you', needs_input: 'needs you' };
// The coordinator's model and effort: it plans and hands out work, which Sonnet does at a fraction of Opus's use of
// the plan (2026-11-09: Opus was 68 to 95% of every run).
const COORDINATOR = ['--model', process.env.JARVIS_MODEL || 'sonnet', '--effort', process.env.JARVIS_EFFORT || 'medium'];

// Local time, YYYY-MM-DD HH:MM.
const now = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${today()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
// Console lines of a task start with its product, so lines of tasks running side by side can be told apart.
const say = (t, text) => console.log(String(text).split('\n').map((l) => (l ? `[${t.product || 'general'}] ${l}` : l)).join('\n'));
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const pidAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
};

// ---- queue ---------------------------------------------------------------------------------

function loadQueue() {
  if (!existsSync(QUEUE)) return [];
  try {
    return JSON.parse(readFileSync(QUEUE, 'utf8'));
  } catch {
    return fail('ops/queue.json is not valid JSON. Fix or restore it before continuing.');
  }
}

function renderQueue(queue) {
  const cell = (s) => String(s ?? '').replace(/\s+/g, ' ').replace(/\|/g, '\\|');
  const rows = queue.map(
    (t) =>
      `| ${t.id} | ${cell(t.task.length > 90 ? `${t.task.slice(0, 87)}...` : t.task)} | ${STATUS_LABEL[t.status] || t.status} | ` +
      `${t.report ? `[report](../${t.report})` : ''} | ${t.added} | ${t.finished || ''} | ${cell(t.note || '')} |`,
  );
  writeFileSync(
    QUEUE_MD,
    '# Jarvis queue\n\nWritten by `scripts/jarvis.mjs`; don\'t edit by hand. Add a task with `node scripts/jarvis.mjs add "<task>"`, ' +
      'run the queue with `node scripts/jarvis.mjs run`.\n\n| ID | Task | Status | Report | Added | Finished | Note |\n|---|---|---|---|---|---|---|\n' +
      (rows.length ? `${rows.join('\n')}\n` : ''),
  );
}

// Every change to the queue holds a short lock, so `add` can run while a queue run is going.
function withQueue(fn) {
  mkdirSync(RUNS, { recursive: true });
  const start = Date.now();
  for (;;) {
    try {
      closeSync(openSync(QUEUE_LOCK, 'wx'));
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      if (Date.now() - start > 10_000) {
        try {
          unlinkSync(QUEUE_LOCK); // left behind by a crash; queue edits take milliseconds
        } catch {
          // gone already
        }
        continue;
      }
      sleep(50);
    }
  }
  try {
    const queue = loadQueue();
    const result = fn(queue);
    const tmp = `${QUEUE}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(queue, null, 2)}\n`);
    renameSync(tmp, QUEUE);
    renderQueue(queue);
    return result;
  } finally {
    try {
      unlinkSync(QUEUE_LOCK);
    } catch {
      // gone already
    }
  }
}

function update(id, fields) {
  withQueue((queue) => Object.assign(queue.find((t) => t.id === id) || {}, fields));
}

function add(task) {
  task = (task || '').replace(/\s+/g, ' ').trim();
  if (!task) fail('Usage: node scripts/jarvis.mjs add "<task>"');
  const entry = withQueue((queue) => {
    const prefix = `J-${today().replace(/-/g, '')}-`;
    // the next number after any task of today's, archived ones included, so an ID is never used twice
    const n = Math.max(0, ...[...queue, ...loadArchived()].filter((t) => t.id.startsWith(prefix)).map((t) => Number(t.id.slice(prefix.length)) || 0)) + 1;
    const created = { id: `${prefix}${String(n).padStart(2, '0')}`, task, product: productOf(task), status: 'queued', added: now() };
    queue.push(created);
    return created;
  });
  console.log(`Queued ${entry.id}: ${entry.task}`);
  return entry;
}

function list() {
  const queue = loadQueue();
  if (!queue.length) {
    console.log('The queue is empty. Add a task with node scripts/jarvis.mjs add "<task>".');
    return;
  }
  printTable(
    queue.map((t) => ({ id: t.id, status: STATUS_LABEL[t.status] || t.status, task: t.task.length > 60 ? `${t.task.slice(0, 57)}...` : t.task, report: t.report || '' })),
    ['id', 'status', 'task', 'report'],
  );
}

function cancel(id) {
  const result = withQueue((queue) => {
    const i = queue.findIndex((t) => t.id === id);
    if (i < 0) return `No task ${id}.`;
    if (queue[i].status !== 'queued') return `${id} is ${queue[i].status}; only queued tasks can be cancelled.`;
    queue.splice(i, 1);
    return null;
  });
  if (result) fail(result);
  console.log(`Cancelled ${id}.`);
}

// Archiving: a person takes finished tasks they don't want counted (test runs, smoke tests, failed runs) off the
// queue. Each task's run log and report move to ops/archive/<id>/, and ops/archive/archived.json keeps the task with
// its start and finish times. Jarvis runs one task at a time, so mission control leaves out every step stamped inside
// an archived task's window. Nothing is deleted: move the files back and return the entry to ops/queue.json to undo.
function loadArchived() {
  try {
    return JSON.parse(readFileSync(ARCHIVED, 'utf8'));
  } catch {
    return [];
  }
}

function archive(ids, reason) {
  if (!ids.length || !reason) fail('Usage: node scripts/jarvis.mjs archive <id>... --reason "<why>"');
  for (const id of ids) {
    const t = loadQueue().find((x) => x.id === id);
    if (!t) fail(`No task ${id} in the queue.`);
    if (['queued', 'running'].includes(t.status)) fail(`${id} is ${t.status}; only finished tasks can be archived.`);
  }
  const moved = withQueue((queue) => {
    const picked = queue.filter((t) => ids.includes(t.id));
    const archived = loadArchived();
    for (const t of picked) {
      const dir = join(ARCHIVE, t.id);
      mkdirSync(dir, { recursive: true });
      const files = [];
      for (const from of [join(RUNS, `${t.id}.log`), t.report && join(ROOT, t.report)].filter(Boolean)) {
        if (!existsSync(from)) continue;
        const to = join(dir, from.split('/').pop());
        renameSync(from, to);
        files.push(to.slice(ROOT.length + 1));
      }
      archived.push({ ...t, archived: now(), reason, files });
      queue.splice(queue.indexOf(t), 1);
    }
    writeFileSync(ARCHIVED, `${JSON.stringify(archived, null, 2)}\n`);
    return picked.map((t) => t.id);
  });
  console.log(`Archived ${moved.join(', ')} to ops/archive/. Mission control no longer shows them.`);
}

// ---- plan usage guard ----------------------------------------------------------------------

function readLimits() {
  try {
    return JSON.parse(readFileSync(PLAN_LIMITS, 'utf8'));
  } catch {
    return null;
  }
}

function recordLimits(info) {
  const windows = {};
  for (const [name, w] of Object.entries(info?.unifiedWindows ?? {})) {
    if (typeof w?.utilization === 'number' && typeof w?.resetsAt === 'number') windows[name] = { utilization: w.utilization, resetsAt: w.resetsAt };
  }
  if (!Object.keys(windows).length && typeof info?.rateLimitType === 'string' && typeof info.utilization === 'number') {
    windows[info.rateLimitType] = { utilization: info.utilization, resetsAt: info.resetsAt };
  }
  if (!Object.keys(windows).length) return;
  mkdirSync(RUNS, { recursive: true });
  writeFileSync(PLAN_LIMITS, JSON.stringify({ at: new Date().toISOString(), windows }, null, 2));
}

const windowLabel = (name) => ({ five_hour: '5-hour', seven_day: 'weekly' })[name] || name.replace(/_/g, ' ');
const resetTime = (sec) => new Date(sec * 1000).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

// The fullest window that hasn't reset since the last report and is at or over the threshold.
// When the plan's usage stops the queue, a note for mission control: once the window has reset, it starts the
// waiting tasks again by itself (scripts/dashboard.mjs resumeIfDue), so a long queue finishes with nobody watching.
const RESUME = join(RUNS, 'resume-after-limit.json');
function noteResume(resetsAt) {
  mkdirSync(RUNS, { recursive: true });
  const latest = Math.max(resetsAt || 0, ...Object.values(readLimits()?.windows ?? {}).filter((w) => w.utilization >= STOP_AT).map((w) => w.resetsAt || 0));
  writeFileSync(RESUME, JSON.stringify({ at: new Date().toISOString(), resetsAt: latest || Math.round(Date.now() / 1000) + 3600 }));
}

function blockedWindow() {
  const nowSec = Date.now() / 1000;
  return Object.entries(readLimits()?.windows ?? {})
    .filter(([, w]) => w.resetsAt > nowSec && w.utilization >= STOP_AT)
    .map(([name, w]) => ({ name, ...w }))
    .sort((a, b) => b.utilization - a.utilization)[0];
}

function usage() {
  const limits = readLimits();
  if (!limits) {
    console.log('No usage reported yet. It is recorded after the first Jarvis task.');
    return;
  }
  const nowSec = Date.now() / 1000;
  for (const [name, w] of Object.entries(limits.windows)) {
    const state = w.resetsAt <= nowSec ? 'has reset since' : `resets ${resetTime(w.resetsAt)}`;
    console.log(`${windowLabel(name)}: ${Math.round(w.utilization * 100)}% used (${state})`);
  }
  console.log(`Reported ${limits.at.slice(0, 16).replace('T', ' ')} UTC. Tasks don't start at ${Math.round(STOP_AT * 100)}% or more (JARVIS_STOP_AT).`);
}

// ---- running a task ------------------------------------------------------------------------

function prompt(t) {
  return (
    `JARVIS TASK ${t.id}: ${t.task}\n\n` +
    'Run this on autopilot, as described under "Autopilot" in your agent file: the whole chain, reviews and the after-task ' +
    `review, without stopping to ask. Write the report to outputs/reports/${t.id}.md and end your reply with the JARVIS block.`
  );
}

// Runs one session and reads its stream: the coordinator's by default, or one step of the drafting lane (its own
// agent, model and log). Never rejects.
function runSession(t, timeoutMs, { extra = COORDINATOR, input = prompt(t), log = join(RUNS, `${t.id}.log`), echo = true } = {}) {
  return new Promise((resolve) => {
    const args = ['-p', '--permission-mode', 'acceptEdits', '--output-format', 'stream-json', '--verbose', ...extra];
    const [cmd, cmdArgs] = /\.(m?js)$/.test(CLAUDE_BIN) ? [process.execPath, [CLAUDE_BIN, ...args]] : [CLAUDE_BIN, args];
    const out = { resultText: '', isError: false, limitRejected: false, sawResult: false, turns: 0 };
    let child;
    try {
      // JARVIS_TASK_ID stops the task from starting Jarvis runs of its own.
      child = spawn(cmd, cmdArgs, { cwd: ROOT, env: { ...process.env, JARVIS_TASK_ID: t.id }, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      resolve({ ...out, isError: true, resultText: `Could not start Claude Code (${CLAUDE_BIN}): ${err.message}` });
      return;
    }
    const timer = setTimeout(() => {
      out.timedOut = true;
      child.kill();
    }, timeoutMs);
    let buffer = '';
    let stderr = '';
    const handle = (line) => {
      if (!line.trim()) return;
      appendFileSync(log, `${line}\n`);
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        return;
      }
      if (event.type === 'rate_limit_event') {
        const info = event.rate_limit_info ?? {};
        recordLimits(info);
        if (info.status === 'rejected') out.limitRejected = true;
      } else if (event.type === 'assistant' && echo) {
        for (const block of event.message?.content ?? []) {
          if (block.type === 'tool_use' && block.name === 'Agent') {
            say(t, `  ${now().slice(11)} → ${block.input?.subagent_type || 'agent'}: ${block.input?.description || ''}`);
          }
        }
      } else if (event.type === 'result') {
        out.sawResult = true;
        out.resultText = typeof event.result === 'string' ? event.result : '';
        out.isError = !!event.is_error;
        out.turns = event.num_turns || 0;
      }
    };
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      lines.forEach(handle);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ...out, isError: true, resultText: `Could not start Claude Code (${CLAUDE_BIN}): ${err.message}` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      handle(buffer);
      if (!out.sawResult) {
        out.isError = true;
        out.resultText = out.timedOut ? `Stopped after ${Math.round(timeoutMs / 60000)} minutes.` : `Claude Code exited (${code}) without a result. ${stderr.trim().slice(-500)}`;
      }
      if (/usage limit|rate limit|limit reached/i.test(out.resultText) && out.isError) out.limitRejected = true;
      resolve(out);
    });
    child.stdin.on('error', () => undefined);
    child.stdin.end(input);
  });
}

// One step of the drafting lane: a session of its own, logged in ops/runs/lane/, shown in the task's own log as the
// agent being handed work and finishing, the way a coordinator's call would be, so mission control shows who works.
function laneStep(t, timeoutMs) {
  let n = 0;
  const main = join(RUNS, `${t.id}.log`);
  const note = (e) => appendFileSync(main, `${JSON.stringify({ timestamp: new Date().toISOString(), ...e })}\n`);
  mkdirSync(join(RUNS, 'lane'), { recursive: true });
  return async (extra, input, agent) => {
    const id = `lane-${++n}`;
    const what = input.split('\n')[0].replace(/^JARVIS TASK \S+, board task \S+: /, '').slice(0, 140);
    say(t, `  ${now().slice(11)} → ${agent}: ${what}`);
    note({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'Agent', input: { subagent_type: agent, description: what } }] } });
    const out = await runSession(t, timeoutMs, { extra, input, log: join(RUNS, 'lane', `${t.id}-${n}-${agent}.log`), echo: false });
    note({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: out.isError, content: out.resultText || '(no reply)' }] } });
    return out;
  };
}

function jarvisBlock(text) {
  const at = text.lastIndexOf('JARVIS');
  const tail = at >= 0 ? text.slice(at) : '';
  return {
    status: /^[\s*_-]*status[\s*_:]+(done|needs_approval|needs_input|blocked)\b/im.exec(tail)?.[1],
    report: /^[\s*_-]*report[\s*_:]+`?([^\s`]+)/im.exec(tail)?.[1],
  };
}

// Entries in main memory and every agent's MEMORY.md: shows how many lessons a task recorded.
function memoryEntries() {
  const files = [join(ROOT, 'memory', 'MAIN.md')];
  const agentMemory = join(ROOT, '.claude', 'agent-memory');
  if (existsSync(agentMemory)) for (const d of readdirSync(agentMemory)) files.push(join(agentMemory, d, 'MEMORY.md'));
  return files.reduce((n, f) => n + (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.startsWith('- ')).length : 0), 0);
}

const readText = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');

// Sends the pilot test emails for drafts that passed review during the task. The mail settings hold
// the recipient list, so if they changed during the task nothing is sent and a person checks them.
// Returns null when there is nothing to say.
function testSends(startedMs, mailConfigBefore) {
  const config = readText(MAIL_CONFIG);
  let pilot;
  try {
    pilot = JSON.parse(config).pilot || {};
  } catch {
    return null;
  }
  if (!pilot.auto_test_sends) return null;
  const since = new Date(startedMs).toISOString();
  if (config !== mailConfigBefore) {
    return { ok: false, sent: 0, text: `Not sent: ops/mail-config.json changed during the task, and it holds the recipient list. A person checks the change, then runs: node scripts/send-tests.mjs --since ${since}` };
  }
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'send-tests.mjs'), '--since', since], { cwd: ROOT, encoding: 'utf8' });
  const text = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (r.status === 0 && /^Nothing to send: no outreach draft changed/.test(text)) return null;
  return { ok: r.status === 0, sent: Number(/: (\d+) sent,/.exec(text)?.[1] || 0), text: text || `send-tests.mjs exited ${r.status}` };
}

// What the task left for a person on the Outreach page, in plain words, or '' when nothing.
function waitingOnPerson(id, leadsFound) {
  let state;
  try {
    state = outreachState(ROOT);
  } catch {
    return '';
  }
  const lines = [];
  const found = latestLeads(ROOT);
  const ready = leadsFound.filter((l) => found.get(l)?.status === 'qualified' && !found.get(l)?.hold);
  if (leadsFound.length) {
    // A lead task drafts the outreach for the leads that qualify by itself, so what is left here is a lead whose draft didn't happen.
    lines.push(`- This run found ${leadsFound.length} lead(s); ${ready.length ? `${ready.length} qualified but still have no draft. Ask the team to try again with the button on the Outreach page, or say "draft emails for the new leads".` : 'every one that qualified has a draft, and the others did not qualify.'}`);
  }
  const drafts = state.drafts.filter((d) => d.state === 'ready');
  if (drafts.length) lines.push(`- ${drafts.length} draft(s) passed review and wait for your approval: ${drafts.map((d) => d.company).join(', ')}. Approving one sends it (during the pilot, [TEST] copies to the pilot test recipients only).`);
  return lines.join('\n');
}

async function runTask(t, timeoutMs) {
  say(t, `\n${t.id} started: ${t.task}`);
  update(t.id, { status: 'running', started: now(), note: '' });
  const startedMs = Date.now() - 1000; // file times can be coarser than a millisecond
  const mailConfigBefore = readText(MAIL_CONFIG);
  const lessonsBefore = memoryEntries();
  // Tasks for other products run at the same time and import leads too: count only this task's product (or any, with no product).
  const mine = (lead) => !t.product || lead.product === t.product;
  const leadsOf = () => new Map([...latestLeads(ROOT)].filter(([, lead]) => mine(lead)));
  const leadsBefore = new Set(leadsOf().keys());
  const lane = await runDraftLane({ task: t, session: laneStep(t, timeoutMs) });
  if (lane && lane.status !== 'limit') appendFileSync(join(RUNS, `${t.id}.log`), `${JSON.stringify({ type: 'result', is_error: false, result: lane.summary, num_turns: 0 })}\n`);
  const out = !lane ? await runSession(t, timeoutMs)
    : lane.status === 'limit' ? { limitRejected: true, resultText: '' }
    : { resultText: `${lane.summary}\n\nJARVIS\nstatus: ${lane.status}\nreport: ${lane.report}\n`, isError: false, turns: 0 };
  const lessons = memoryEntries() - lessonsBefore;

  if (out.limitRejected) {
    update(t.id, { status: 'queued', note: `stopped by the plan's usage limit at ${now()}; runs again on the next jarvis run` });
    say(t, `${t.id} was stopped by the plan's usage limit. It's back in the queue.`);
    return 'limit';
  }

  const block = jarvisBlock(out.resultText);
  const status = out.isError ? 'failed' : block.status || 'check';
  // Only a report written during this task counts; an older file at that path is someone else's.
  const fresh = (p) => existsSync(join(ROOT, p)) && statSync(join(ROOT, p)).mtimeMs >= startedMs;
  const report = block.report && fresh(block.report) ? block.report : `outputs/reports/${t.id}.md`;
  if (!fresh(report)) {
    // The coordinator didn't write one (or the run failed): keep what it said, so nothing is lost.
    mkdirSync(REPORTS, { recursive: true });
    writeFileSync(
      join(ROOT, report),
      `# ${t.id}\n\n**Task:** ${t.task}\n\n**Status:** ${status}. The coordinator didn't write a report, so this is its final reply.\n\n${out.resultText || '(no reply)'}\n`,
    );
  }
  const leadsFound = [...leadsOf().keys()].filter((id) => !leadsBefore.has(id));
  const waiting = waitingOnPerson(t.id, leadsFound);
  if (waiting) appendFileSync(join(ROOT, report), `\n## Waiting for you on the Outreach page\n\n${waiting}\n`);
  const sends = testSends(startedMs, mailConfigBefore);
  if (sends) {
    appendFileSync(join(ROOT, report), `\n## Test emails (sent by Jarvis after the task)\n\n${sends.text}\n`);
    say(t, sends.text);
  }
  const note = [
    out.isError ? out.resultText.slice(0, 120) : '',
    status === 'check' ? 'no JARVIS block; read the report' : '',
    lessons > 0 ? `${lessons} lesson(s) recorded` : '',
    sends ? (sends.ok ? `${sends.sent} test email(s) sent` : 'test emails had a problem; see the report') : '',
  ]
    .filter(Boolean)
    .join('; ');
  update(t.id, { status, report, finished: now(), turns: out.turns, note, leads_found: leadsFound });
  say(t, `${t.id} ${STATUS_LABEL[status] || status}. Report: ${report}`);
  return status;
}

// Only one runner at a time: it starts every lane itself, so two runners would start the same task twice.
function takeRunLock() {
  mkdirSync(RUNS, { recursive: true });
  for (let i = 0; i < 2; i++) {
    try {
      const fd = openSync(RUN_LOCK, 'wx');
      writeSync(fd, String(process.pid));
      closeSync(fd);
      process.on('exit', () => {
        try {
          unlinkSync(RUN_LOCK);
        } catch {
          // gone already
        }
      });
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      let pid = 0;
      try {
        pid = Number(readFileSync(RUN_LOCK, 'utf8'));
      } catch {
        continue; // released between our two calls
      }
      if (pid && pidAlive(pid)) fail(`A Jarvis run is already going (process ${pid}). Add tasks with jarvis.mjs add; that run picks them up within seconds when their product's lane is free.`);
      try {
        unlinkSync(RUN_LOCK); // left by a run that crashed
      } catch {
        // another run removed it first
      }
    }
  }
  fail('Could not take the Jarvis run lock.');
}

// One lock per running task: ops/runs/lanes/<id>.lock holds the runner's pid. Mission control reads them to tell which
// tasks are really running; a crashed runner leaves them behind, and the next runner clears them.
const laneLockFile = (id) => join(LANE_LOCKS, `${id}.lock`);
function takeLaneLock(id) {
  mkdirSync(LANE_LOCKS, { recursive: true });
  writeFileSync(laneLockFile(id), String(process.pid));
}
function dropLaneLock(id) {
  try {
    unlinkSync(laneLockFile(id));
  } catch {
    // gone already
  }
}
function clearStaleLaneLocks() {
  if (!existsSync(LANE_LOCKS)) return;
  for (const f of readdirSync(LANE_LOCKS)) {
    let pid = 0;
    try {
      pid = Number(readFileSync(join(LANE_LOCKS, f), 'utf8'));
    } catch {
      continue;
    }
    if (!pid || pid === process.pid || !pidAlive(pid)) dropLaneLock(f.replace(/\.lock$/, ''));
  }
}

async function run(opts) {
  if (process.env.JARVIS_TASK_ID) fail(`Already inside Jarvis task ${process.env.JARVIS_TASK_ID}. List follow-ups under "Suggested next tasks" instead.`);
  // An untrusted folder makes Claude Code refuse every command the agents run, so say so now rather than after a wasted run.
  // A .js stand-in for Claude Code (the tests use one) has nothing to trust.
  if (!/\.(m?js)$/.test(CLAUDE_BIN) && !process.env.JARVIS_SKIP_TRUST_CHECK && workspaceTrusted() === false) {
    const why = `Claude Code doesn't trust this folder yet, so it would refuse every command the agents run. Once: open a terminal here, run "claude", accept the trust question, then start the task again (${ROOT}).`;
    withQueue((queue) => queue.filter((q) => q.status === 'queued').forEach((q) => Object.assign(q, { note: why })));
    fail(why);
  }
  takeRunLock();
  // Tasks left "running" by a run that crashed go back to the queue, and so do their lane locks.
  clearStaleLaneLocks();
  withQueue((queue) => queue.filter((t) => t.status === 'running').forEach((t) => Object.assign(t, { status: 'queued', note: 'previous run was interrupted' })));

  const timeoutMs = (opts.timeoutMin || DEFAULT_TIMEOUT_MIN) * 60_000;
  const lanes = laneLimit();
  const active = new Map(); // task id -> its promise, one per running task
  let started = 0;
  let ran = 0;
  let stopped = false; // the plan's limit stopped a task: start nothing more, let the others finish
  let told = false;
  for (;;) {
    if (!stopped && !(opts.max && started >= opts.max)) {
      // The plan guard counts for every lane: nothing starts while a window is full; below it, several start at once.
      const queue = loadQueue().filter((t) => !opts.only || t.id === opts.only || t.status === 'running');
      const next = startable(queue, lanes).slice(0, opts.max ? opts.max - started : undefined);
      const blocked = next.length && !opts.ignoreLimits && blockedWindow();
      if (blocked) {
        if (!told) {
          told = true;
          console.log(
            `\nNot starting ${next[0].id}: the plan's ${windowLabel(blocked.name)} window is at ${Math.round(blocked.utilization * 100)}% ` +
              `(stop at ${Math.round(STOP_AT * 100)}%), so a task could be cut off. It resets ${resetTime(blocked.resetsAt)}. ` +
              'Mission control starts the waiting tasks again once it resets (or run jarvis again then, or use --ignore-limits).',
          );
        }
        noteResume(blocked.resetsAt);
      } else {
        for (const t of next) {
          started++;
          takeLaneLock(t.id);
          // runTask marks the task running before its first await, so the next pass sees the lane as busy.
          const job = runTask(t, timeoutMs).then((result) => {
            dropLaneLock(t.id);
            active.delete(t.id);
            ran++;
            if (result === 'limit') {
              stopped = true;
              noteResume();
            }
          });
          active.set(t.id, job);
        }
      }
    }
    if (!active.size) break;
    // While a lane is busy, look at the queue again every few seconds; a finished task wakes the loop at once.
    await Promise.race([...active.values(), new Promise((done) => setTimeout(done, POLL_MS))]);
  }
  const left = loadQueue().filter((t) => t.status === 'queued').length;
  console.log(`\n${ran} task(s) run. ${left} still queued. The queue is in ops/queue.md.`);
}

// ---- command line --------------------------------------------------------------------------

const [command, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
const words = () => rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && /^--(max|timeout-min)$/.test(rest[i - 1]))).join(' ');

switch (command) {
  case 'add':
    if (process.env.JARVIS_TASK_ID) fail(`Already inside Jarvis task ${process.env.JARVIS_TASK_ID}. List follow-ups under "Suggested next tasks" instead.`);
    add(words());
    break;
  case 'do': {
    if (process.env.JARVIS_TASK_ID) fail(`Already inside Jarvis task ${process.env.JARVIS_TASK_ID}. List follow-ups under "Suggested next tasks" instead.`);
    const entry = add(words());
    await run({ only: entry.id, ignoreLimits: rest.includes('--ignore-limits'), timeoutMin: Number(flag('timeout-min')) || 0 });
    break;
  }
  case 'run':
    await run({ max: Number(flag('max')) || 0, ignoreLimits: rest.includes('--ignore-limits'), timeoutMin: Number(flag('timeout-min')) || 0 });
    break;
  case 'list':
    list();
    break;
  case 'cancel':
    if (!rest[0]) fail('Usage: node scripts/jarvis.mjs cancel <id>');
    cancel(rest[0]);
    break;
  case 'usage':
    usage();
    break;
  case 'archive':
    if (process.env.JARVIS_TASK_ID) fail('Archiving is a person\'s call, not an agent\'s.');
    archive(rest.filter((a, i) => !a.startsWith('--') && rest[i - 1] !== '--reason'), flag('reason'));
    break;
  default:
    fail('Usage: node scripts/jarvis.mjs add "<task>" | do "<task>" | run [--max n] [--ignore-limits] [--timeout-min n] | list | cancel <id> | usage | archive <id>... --reason "<why>"');
}
