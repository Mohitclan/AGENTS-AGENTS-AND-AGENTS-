#!/usr/bin/env node
// Jarvis: hand the team tasks and get finished results back. Each task runs as one coordinator
// session on autopilot (`claude -p`, your Max plan login), one task at a time, in queue order.
//
//   node scripts/jarvis.mjs add "<task>"            queue a task
//   node scripts/jarvis.mjs do "<task>"             queue a task and run it now
//   node scripts/jarvis.mjs run [--max n] [--ignore-limits] [--timeout-min n]
//                                                   work through the queue, oldest first
//   node scripts/jarvis.mjs list                    the queue
//   node scripts/jarvis.mjs cancel <id>             take a queued task off the queue
//   node scripts/jarvis.mjs usage                   how full the plan windows were at the last run
//
// The queue lives in ops/queue.json (readable copy: ops/queue.md); reports in outputs/reports/.
// Usage guard: Claude Code reports the plan's usage windows in its stream (rate_limit_event). The
// last report is kept in ops/runs/plan-limits.json, and no task starts while a window is at or over
// JARVIS_STOP_AT (default 0.85), since a task cut off by the limit loses its work.
// Pilot test emails: after each task, scripts/send-tests.mjs sends [TEST] copies of every outreach
// draft that passed review during it to the pilot test recipients only (never a lead), and the
// result is added to the task's report. On while ops/mail-config.json has pilot.auto_test_sends.
import { spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync, writeSync,
} from 'node:fs';
import { join } from 'node:path';
import { ROOT, fail, printTable, today } from './_shared.mjs';

const OPS = join(ROOT, 'ops');
const RUNS = join(OPS, 'runs');
const QUEUE = join(OPS, 'queue.json');
const QUEUE_MD = join(OPS, 'queue.md');
const REPORTS = join(ROOT, 'outputs', 'reports');
const PLAN_LIMITS = join(RUNS, 'plan-limits.json');
const RUN_LOCK = join(RUNS, 'jarvis.lock');
const QUEUE_LOCK = join(RUNS, 'queue.lock');
const MAIL_CONFIG = join(OPS, 'mail-config.json');
const STOP_AT = Number(process.env.JARVIS_STOP_AT || 0.85);
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const DEFAULT_TIMEOUT_MIN = 120;
const STATUS_LABEL = { needs_approval: 'needs you', needs_input: 'needs you' };

// Local time, YYYY-MM-DD HH:MM.
const now = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${today()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
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
    const n = queue.filter((t) => t.id.startsWith(prefix)).length + 1;
    const created = { id: `${prefix}${String(n).padStart(2, '0')}`, task, status: 'queued', added: now() };
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

// Runs one coordinator session and reads its stream. Never rejects.
function runSession(t, timeoutMs) {
  return new Promise((resolve) => {
    const args = ['-p', '--permission-mode', 'acceptEdits', '--output-format', 'stream-json', '--verbose'];
    const [cmd, cmdArgs] = /\.(m?js)$/.test(CLAUDE_BIN) ? [process.execPath, [CLAUDE_BIN, ...args]] : [CLAUDE_BIN, args];
    const log = join(RUNS, `${t.id}.log`);
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
      } else if (event.type === 'assistant') {
        for (const block of event.message?.content ?? []) {
          if (block.type === 'tool_use' && block.name === 'Agent') {
            console.log(`  ${now().slice(11)} → ${block.input?.subagent_type || 'agent'}: ${block.input?.description || ''}`);
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
    child.stdin.end(prompt(t));
  });
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

async function runTask(t, timeoutMs) {
  console.log(`\n${t.id} started: ${t.task}`);
  update(t.id, { status: 'running', started: now(), note: '' });
  const startedMs = Date.now() - 1000; // file times can be coarser than a millisecond
  const mailConfigBefore = readText(MAIL_CONFIG);
  const lessonsBefore = memoryEntries();
  const out = await runSession(t, timeoutMs);
  const lessons = memoryEntries() - lessonsBefore;

  if (out.limitRejected) {
    update(t.id, { status: 'queued', note: `stopped by the plan's usage limit at ${now()}; runs again on the next jarvis run` });
    console.log(`${t.id} was stopped by the plan's usage limit. It's back in the queue.`);
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
  const sends = testSends(startedMs, mailConfigBefore);
  if (sends) {
    appendFileSync(join(ROOT, report), `\n## Test emails (sent by Jarvis after the task)\n\n${sends.text}\n`);
    console.log(sends.text);
  }
  const note = [
    out.isError ? out.resultText.slice(0, 120) : '',
    status === 'check' ? 'no JARVIS block; read the report' : '',
    lessons > 0 ? `${lessons} lesson(s) recorded` : '',
    sends ? (sends.ok ? `${sends.sent} test email(s) sent` : 'test emails had a problem; see the report') : '',
  ]
    .filter(Boolean)
    .join('; ');
  update(t.id, { status, report, finished: now(), turns: out.turns, note });
  console.log(`${t.id} ${STATUS_LABEL[status] || status}. Report: ${report}`);
  return status;
}

// Only one queue run at a time: two would compete for the same plan window and the same board.
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
      if (pid && pidAlive(pid)) fail(`A Jarvis run is already going (process ${pid}). Add tasks with jarvis.mjs add; that run picks them up.`);
      try {
        unlinkSync(RUN_LOCK); // left by a run that crashed
      } catch {
        // another run removed it first
      }
    }
  }
  fail('Could not take the Jarvis run lock.');
}

async function run(opts) {
  if (process.env.JARVIS_TASK_ID) fail(`Already inside Jarvis task ${process.env.JARVIS_TASK_ID}. List follow-ups under "Suggested next tasks" instead.`);
  takeRunLock();
  // A task left "running" by a run that crashed goes back to the queue.
  withQueue((queue) => queue.filter((t) => t.status === 'running').forEach((t) => Object.assign(t, { status: 'queued', note: 'previous run was interrupted' })));

  const timeoutMs = (opts.timeoutMin || DEFAULT_TIMEOUT_MIN) * 60_000;
  let ran = 0;
  for (;;) {
    if (opts.max && ran >= opts.max) break;
    const next = loadQueue().find((t) => t.status === 'queued' && (!opts.only || t.id === opts.only));
    if (!next) break;
    const blocked = !opts.ignoreLimits && blockedWindow();
    if (blocked) {
      console.log(
        `\nNot starting ${next.id}: the plan's ${windowLabel(blocked.name)} window is at ${Math.round(blocked.utilization * 100)}% ` +
          `(stop at ${Math.round(STOP_AT * 100)}%), so a task could be cut off. It resets ${resetTime(blocked.resetsAt)}. ` +
          'Run jarvis again after that, or use --ignore-limits.',
      );
      break;
    }
    const result = await runTask(next, timeoutMs);
    ran++;
    if (result === 'limit') break;
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
  default:
    fail('Usage: node scripts/jarvis.mjs add "<task>" | do "<task>" | run [--max n] [--ignore-limits] [--timeout-min n] | list | cancel <id> | usage');
}
