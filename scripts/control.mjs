#!/usr/bin/env node
// Mission control: one page to run the team from. Give the team a task, watch each agent work in
// real time, read what each one produced, and see every failure and why. Built from the repo's own
// files (run logs, queue, board, reviews, logs, leads); its only actions go through jarvis.mjs
// (add, run, cancel), so sends and other outside actions still wait in ops/approvals.md.
//
//   node scripts/control.mjs              serve it at http://127.0.0.1:4318
//   node scripts/control.mjs --port 5000  on another port
//   node scripts/control.mjs --state      print the state as JSON and exit
//
// Online: the same sign-in as the team page. TEAM_PAGE_PASSWORD_HASH turns it on (make one with
// `node scripts/dashboard.mjs --hash`) and TEAM_PAGE_HOST is the public name; it refuses to start
// with a name and no hash. See docs/DEPLOY-team-page.md, with this script and port instead.
//
// Live activity comes from the Jarvis run logs (ops/runs/<id>.log, Claude Code's stream-json). Each
// tool call inside a sub-agent carries the id of the Agent call that started it, so every web search,
// page fetch, file write and failure is credited to the agent that made it.
import { createHash } from 'node:crypto';
import { closeSync, existsSync, fstatSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { ROOT, frontmatter, isMain } from './_shared.mjs';
import { act, collect, createAuth, parseApprovals, renderMarkdown, sameSite } from './dashboard.mjs';

const DEFAULT_PORT = 4318;
const STATIC = join(ROOT, 'scripts', 'control');
const COOKIE = 'control_session';
const SESSION_MS = 12 * 3_600_000;
const MAX_BODY = 16 * 1024;
const MAX_LOG = 8 * 1024 * 1024;
const TICK_MS = 1500;

// The order agents appear in. Others found in .claude/agents/ follow.
export const ORDER = ['coordinator', 'evaluator', 'knowledge-base', 'researcher', 'lead-generator', 'outreach', 'sales', 'marketing', 'demo-handler', 'docs-handler', 'developer'];
// Who owns the files under each folder, for outputs and for activity found only as a file.
const OWNER = [
  [/^outputs\/research\//, 'researcher'], [/^outputs\/outreach\//, 'outreach'], [/^outputs\/sales\//, 'sales'],
  [/^outputs\/marketing\//, 'marketing'], [/^outputs\/demos\//, 'demo-handler'], [/^outputs\/docs\//, 'docs-handler'],
  [/^outputs\/dev\//, 'developer'], [/^outputs\/reviews\//, 'evaluator'], [/^outputs\/reports\//, 'coordinator'],
  [/^outputs\/replies\//, 'sales'], [/^knowledge\//, 'knowledge-base'], [/^pipeline\/inbox\//, 'lead-generator'],
];
export const ownerOf = (path) => OWNER.find(([re]) => re.test(path))?.[1] ?? null;
const READABLE = /^(outputs\/([\w-]+\/)?[\w.-]+\.md|knowledge\/([\w-]+\/)?[\w.-]+\.md|docs\/[\w.-]+\.md|ops\/(board|approvals|queue)\.md)$/;

// ---- small readers -------------------------------------------------------------------------------

const read = (root, file) => {
  try {
    return readFileSync(join(root, file), 'utf8');
  } catch {
    return '';
  }
};
const readJsonl = (root, file) => read(root, file).split('\n').filter((l) => l.trim()).flatMap((l) => {
  try {
    return [JSON.parse(l)];
  } catch {
    return [];
  }
});
const list = (root, dir, ext = '.md') => {
  try {
    return readdirSync(join(root, dir)).filter((f) => f.endsWith(ext));
  } catch {
    return [];
  }
};
const mtime = (root, file) => {
  try {
    return statSync(join(root, file)).mtime.toISOString();
  } catch {
    return null;
  }
};
const tableRows = (text, first) => text.split(/\r?\n/).filter((l) => first.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
const clip = (text, max = 160) => {
  const t = String(text ?? '').replace(/\s+/g, ' ').replace(/[`*]/g, '').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};
// "2026-11-02 10:45" (local time, as Jarvis and the hooks write it) or an ISO string.
const toIso = (value) => {
  if (!value) return null;
  const t = Date.parse(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) ? value.replace(' ', 'T') : value);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};
// The date a file is about, from an id or date in its name (T-20261102-01, J-20261102-01,
// 2026-11-02-...), else its modification time. A fresh clone gives every file the same mtime.
const ID_DATE = /(?:^|[^\d])(20\d{2})-?(\d{2})-?(\d{2})(?!\d)/;
function fileDate(root, path) {
  const m = ID_DATE.exec(path.split('/').pop());
  const round = Number(/-r(\d+)\.md$/.exec(path)?.[1] || 0);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 6 + round, 0)).toISOString() : mtime(root, path);
}
const baseName = (agent) => String(agent || '').replace(/-fallback$/, '');
const eventId = (...parts) => createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12);

// ---- the agents ----------------------------------------------------------------------------------

export function loadRoster(root = ROOT) {
  const dir = join(root, '.claude', 'agents');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
  const agents = files.map((f) => {
    const text = readFileSync(join(dir, f), 'utf8');
    const fm = frontmatter(text) || {};
    const block = (key) => (new RegExp(`^${key}:\\n((?:[ \\t]+- .+\\n?)+)`, 'm').exec(text)?.[1] ?? '').split('\n').map((l) => l.replace(/^\s+- /, '').trim()).filter(Boolean);
    return { name: fm.name || f.replace(/\.md$/, ''), description: fm.description || '', model: fm.model || '', skills: block('skills'), canAsk: block('can_ask'), fallback: fm.fallback || null };
  });
  const names = new Set(agents.map((a) => a.name));
  return agents
    .filter((a) => !a.name.endsWith('-fallback'))
    .map((a) => ({ ...a, hasBackup: names.has(`${a.name}-fallback`) }))
    .sort((a, b) => (ORDER.indexOf(a.name) + 1 || 99) - (ORDER.indexOf(b.name) + 1 || 99) || a.name.localeCompare(b.name));
}

// ---- run logs ------------------------------------------------------------------------------------

const textOf = (content) => (typeof content === 'string' ? content : Array.isArray(content) ? content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('\n') : '');

function describe(block, root) {
  const input = block.input || {};
  const path = String(input.file_path || input.path || '').replaceAll('\\', '/').replace(`${root.replaceAll('\\', '/')}/`, '');
  switch (block.name) {
    case 'WebSearch': return { kind: 'web', text: `Searched the web: ${clip(input.query, 120)}` };
    case 'WebFetch': return { kind: 'web', text: `Opened ${clip(input.url, 140)}`, url: input.url };
    case 'Write': case 'Edit': case 'MultiEdit': return { kind: 'file', text: `${block.name === 'Write' ? 'Wrote' : 'Edited'} ${path}`, ref: path };
    case 'Read': return { kind: 'read', text: `Read ${path}`, ref: path };
    case 'Grep': case 'Glob': return { kind: 'read', text: `Searched files for ${clip(input.pattern, 60)}` };
    case 'Bash': return { kind: 'command', text: clip(input.description || input.command, 140) };
    case 'TodoWrite': return { kind: 'plan', text: 'Updated its plan' };
    default: return { kind: 'tool', text: `Used ${block.name}` };
  }
}

// Turns one run log into events, plus the agents still working (an Agent call with no result yet).
export function parseRun(text, task = {}, root = ROOT) {
  const events = [];
  const owners = new Map(); // Agent call id -> agent name as called (may be a -fallback)
  const calls = new Map(); // tool call id -> { agent, text }
  const open = new Map(); // Agent call id -> { agent, backup, task, at }
  let n = 0;
  const push = (e) => events.push({ n: n++, task: task.id || null, ...e });
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const at = event.timestamp || null;
    const parent = event.parent_tool_use_id || null;
    const who = parent ? owners.get(parent) ?? 'coordinator' : 'coordinator';
    if (event.type === 'assistant') {
      for (const block of event.message?.content ?? []) {
        if (block.type !== 'tool_use') continue;
        if (block.name === 'Agent' || block.name === 'Task') {
          const called = String(block.input?.subagent_type || 'agent');
          const agent = baseName(called);
          const what = clip(block.input?.description || block.input?.prompt, 120);
          owners.set(block.id, called);
          open.set(block.id, { agent, backup: called !== agent, what, at });
          calls.set(block.id, { agent: baseName(who), text: `Asked ${agent} to: ${what}` });
          push({ at, agent: baseName(who), kind: 'handoff', to: agent, status: 'ok', text: `${parent ? 'Asked' : 'Handed work to'} ${agent}${called !== agent ? ' (backup)' : ''}: ${what}` });
          push({ at, agent, kind: 'start', status: 'ok', backup: called !== agent, text: `Started${called !== agent ? ' as backup' : ''}: ${what}` });
        } else {
          const d = describe(block, root);
          calls.set(block.id, { agent: baseName(who), text: d.text });
          push({ at, agent: baseName(who), status: 'ok', ...d });
        }
      }
    } else if (event.type === 'user') {
      for (const block of event.message?.content ?? []) {
        if (block.type !== 'tool_result') continue;
        const id = block.tool_use_id;
        const body = textOf(block.content);
        if (open.has(id)) {
          const o = open.get(id);
          open.delete(id);
          const said = /^\s*status:\s*(done|blocked|needs_input)/im.exec(body)?.[1];
          const summary = /^\s*summary:\s*(.+)$/im.exec(body)?.[1];
          const gaveUp = /FALLBACK:|ESCALATE:/.test(body);
          const status = block.is_error || gaveUp || said === 'blocked' ? 'failed' : said === 'needs_input' ? 'warn' : 'ok';
          const why = block.is_error ? clip(body, 200) : clip(summary || body, 200);
          push({ at, agent: o.agent, kind: 'result', status, backup: o.backup, text: `${status === 'failed' ? 'Failed' : status === 'warn' ? 'Needs input' : 'Finished'}: ${why || o.what}` });
          if (/FALLBACK:|ESCALATE:/.test(body)) push({ at, agent: o.agent, kind: 'fallback', status: 'failed', text: clip(/(FALLBACK|ESCALATE):[^\n]*/.exec(body)[0], 200) });
        } else if (block.is_error) {
          const call = calls.get(id);
          push({ at, agent: call?.agent || baseName(who), kind: 'error', status: 'failed', text: `${call?.text || 'A step'} failed: ${clip(body, 180)}` });
        }
      }
    } else if (event.type === 'result') {
      push({ at, agent: 'coordinator', kind: 'run', status: event.is_error ? 'failed' : 'ok', text: `${task.id || 'Task'} ${event.is_error ? 'failed' : 'finished'}: ${clip(event.result, 180)}` });
    }
  }
  // Stream events don't always carry a time; spread those over the task's run so they sort.
  const from = Date.parse(toIso(task.started) || '') || null;
  const to = Date.parse(toIso(task.finished) || '') || Date.now();
  events.forEach((e) => {
    if (!e.at && from) e.at = new Date(from + ((to - from) * (e.n + 1)) / (events.length + 1)).toISOString();
    e.id = eventId(task.id, e.n, e.text);
  });
  return { events, working: [...open.values()] };
}

const logCache = new Map();
function readRun(root, task) {
  const file = join(root, 'ops', 'runs', `${task.id}.log`);
  if (!existsSync(file)) return { events: [], working: [] };
  const st = statSync(file);
  const key = `${file}|${st.size}|${st.mtimeMs}|${task.status}|${task.finished}`;
  const hit = logCache.get(file);
  if (hit?.key === key) return hit.value;
  const fd = openSync(file, 'r');
  const size = fstatSync(fd).size;
  const length = Math.min(size, MAX_LOG);
  const buffer = Buffer.alloc(length);
  readSync(fd, buffer, 0, length, size - length);
  closeSync(fd);
  const value = parseRun(buffer.toString('utf8'), task, root);
  logCache.set(file, { key, value });
  return value;
}

// ---- every other source of events ----------------------------------------------------------------

function reviewFacts(root, file) {
  const text = read(root, `outputs/reviews/${file}`);
  const m = /\b(PASS|REVISE|ESCALATE)\b[^\n]{0,60}?(\d{1,3})\s*\/\s*100/.exec(text) || /\b(PASS|REVISE|ESCALATE)\b/.exec(text);
  return { verdict: m?.[1] || null, score: m?.[2] ? Number(m[2]) : null, task: /^(T-\d{8}-\d{2})/.exec(file)?.[1] || null, round: /-r(?:eview-r)?(\d+)\.md$/.exec(file)?.[1] || (/-review\.md$/.test(file) ? '1' : null) };
}

function boardRows(root) {
  return tableRows(read(root, 'ops/board.md'), /^\| T-\d/).map(([id, request, agent, status, output, review, updated]) => ({ id, request, agent: baseName(agent?.split(/[^\w-]/)[0]), status, output, review, updated }));
}

export function allEvents(root = ROOT, queue = null) {
  const events = [];
  const tasks = queue ?? (() => {
    try {
      return JSON.parse(read(root, 'ops/queue.json') || '[]');
    } catch {
      return [];
    }
  })();
  const working = [];
  for (const t of tasks) {
    events.push({ id: eventId('q', t.id, 'add'), at: toIso(t.added), agent: 'coordinator', kind: 'run', status: 'ok', task: t.id, text: `${t.id} queued: ${clip(t.task, 140)}` });
    if (t.started) events.push({ id: eventId('q', t.id, 'start'), at: toIso(t.started), agent: 'coordinator', kind: 'run', status: 'ok', task: t.id, text: `${t.id} started` });
    if (t.finished) {
      const bad = ['failed', 'blocked'].includes(t.status);
      events.push({ id: eventId('q', t.id, 'end', t.status), at: toIso(t.finished), agent: 'coordinator', kind: 'run', status: bad ? 'failed' : t.status === 'done' ? 'ok' : 'warn', task: t.id, ref: t.report || null, text: `${t.id} ended: ${t.status.replace('_', ' ')}${t.note ? ` (${clip(t.note, 120)})` : ''}` });
    }
    const run = readRun(root, t);
    events.push(...run.events.map(({ n, ...e }) => e));
    if (t.status === 'running') working.push(...run.working.map((w) => ({ ...w, task: t.id })));
  }
  // Agent-to-agent calls the hook logged (covers runs whose logs aren't on this machine).
  const seen = new Set(events.filter((e) => e.kind === 'handoff').map((e) => `${e.agent}|${e.to}|${clip(e.text, 400).split(': ').slice(1).join(': ').slice(0, 40)}`));
  for (const [when, from, to, task, what] of tableRows(read(root, 'ops/messages.md'), /^\| \d{4}-/)) {
    const key = `${baseName(from)}|${baseName(to)}|${clip(what, 400).slice(0, 40)}`;
    if (seen.has(key)) continue;
    events.push({ id: eventId('m', when, from, to, what), at: toIso(when), agent: baseName(from), kind: 'handoff', to: baseName(to), status: 'ok', task, text: `${from === 'coordinator' ? 'Handed work to' : 'Asked'} ${to}: ${clip(what, 140)}` });
  }
  for (const [when, agent, task, what, next] of tableRows(read(root, 'ops/fallbacks.md'), /^\| \d{4}-/)) {
    events.push({ id: eventId('f', when, agent, task), at: toIso(when), agent: baseName(agent), kind: 'fallback', status: 'failed', task, text: `${clip(what, 160)}${next ? ` → ${clip(next, 80)}` : ''}` });
  }
  const board = boardRows(root);
  const ownerOfTask = new Map(board.map((r) => [r.id, r.agent]));
  for (const file of list(root, 'outputs/reviews')) {
    const r = reviewFacts(root, file);
    const at = fileDate(root, `outputs/reviews/${file}`);
    const ref = `outputs/reviews/${file}`;
    const score = r.score ? ` ${r.score}/100` : '';
    events.push({ id: eventId('r', file), at, agent: 'evaluator', kind: 'review', status: 'ok', verdict: r.verdict, task: r.task, ref, text: `Reviewed ${r.task || file}${r.round ? ` (round ${r.round})` : ''}: ${r.verdict || 'no verdict'}${score}` });
    const owner = ownerOfTask.get(r.task);
    if (owner && r.verdict && r.verdict !== 'PASS') events.push({ id: eventId('rv', file), at, agent: owner, kind: 'revise', status: 'failed', task: r.task, ref, text: `Sent back by review${r.round ? ` round ${r.round}` : ''}: ${r.verdict}${score}` });
  }
  for (const row of board.filter((r) => r.status === 'blocked')) {
    events.push({ id: eventId('b', row.id), at: toIso(row.updated) || null, agent: row.agent, kind: 'blocked', status: 'failed', task: row.id, text: `Blocked: ${clip(row.request, 150)}` });
  }
  for (const e of readJsonl(root, 'ops/gate-log.jsonl').slice(-400)) {
    const owner = ownerOf(e.file) || 'coordinator';
    const fails = e.failures?.length || 0;
    events.push({ id: eventId('g', e.at, e.file, fails, e.warnings), at: toIso(e.at), agent: owner, kind: 'check', status: e.passed ? 'ok' : 'failed', ref: e.file, text: `Copy check on ${e.file}: ${e.passed ? 'passed' : `${fails} failed`}${e.warnings ? `, ${e.warnings} warnings` : ''}${fails ? ` (${clip(e.failures.map((f) => f.rule || f.id || f).join(', '), 80)})` : ''}` });
  }
  for (const s of readJsonl(root, 'ops/send-log.jsonl')) {
    events.push({ id: eventId('s', s.at, s.message_id || s.error), at: s.at, agent: 'system', kind: 'send', status: s.error ? 'failed' : 'ok', ref: s.draft || null, text: s.kind === 'report' ? `Send report ${s.error ? 'failed' : 'emailed'} to ${s.to}${s.error ? `: ${clip(s.error, 100)}` : ''}` : `${s.mode === 'demo' ? 'Demo email' : 'Email'} sent to ${s.to}: ${clip(s.subject, 100)}` });
  }
  for (const r of readJsonl(root, 'ops/replies.jsonl')) {
    events.push({ id: eventId('rp', r.message_id), at: r.received || r.at, agent: 'system', kind: 'reply', status: ['opt_out', 'complaint', 'bounce'].includes(r.kind) ? 'failed' : 'ok', ref: r.file, text: `${r.kind.replace('_', ' ')} from ${r.from}${r.lead ? ` (${r.lead})` : ''}` });
  }
  for (const lead of readJsonl(root, 'pipeline/leads.jsonl')) {
    (lead.history || []).forEach((h, i) => {
      const status = h.status || '';
      const agent = ['drafted'].includes(status) ? 'outreach' : ['approved', 'contacted', 'replied', 'meeting', 'trial', 'won', 'lost'].includes(status) ? 'system' : 'lead-generator';
      const verb = h.event === 'imported' ? 'Found' : h.event === 'status' ? `Moved to ${status}` : h.event === 'updated' ? 'Re-researched' : h.event;
      events.push({ id: eventId('l', lead.id, i), at: toIso(h.at), agent, kind: 'lead', status: status === 'disqualified' ? 'warn' : 'ok', lead: lead.id, text: `${verb}: ${clip(lead.company, 60)}${h.note ? ` (${clip(h.note, 90)})` : ''}` });
    });
  }
  events.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  return { events, working, board };
}

// ---- what each agent produced ------------------------------------------------------------------

function outputsOf(root, name) {
  const dirs = ['outputs/research', 'outputs/outreach', 'outputs/sales', 'outputs/marketing', 'outputs/demos', 'outputs/docs', 'outputs/dev', 'outputs/reviews', 'outputs/reports', 'outputs/replies', 'knowledge', 'knowledge/products', 'knowledge/competitors', 'knowledge/proposals', 'pipeline/inbox'];
  const files = [];
  for (const dir of dirs) {
    for (const f of list(root, dir, dir === 'pipeline/inbox' ? '.jsonl' : '.md')) {
      const path = `${dir}/${f}`;
      if (ownerOf(path) !== name || f === 'README.md' || f === '_template.md') continue;
      const text = dir === 'pipeline/inbox' ? '' : read(root, path);
      const title = clip(/^# (.+)$/m.exec(text)?.[1] || f.replace(/\.(md|jsonl)$/, ''), 110);
      const extra = dir === 'outputs/reviews' ? reviewFacts(root, f) : null;
      files.push({ path, title, at: fileDate(root, path), kind: dir.split('/').pop(), readable: READABLE.test(path), ...(extra && { verdict: extra.verdict, score: extra.score }) });
    }
  }
  return files.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function memoryOf(root, name) {
  const dir = `.claude/agent-memory/${name}`;
  const lessons = read(root, `${dir}/MEMORY.md`).split('\n').filter((l) => /^- /.test(l)).map((l) => clip(l.replace(/^- /, ''), 300));
  return { lessons, files: list(root, dir).filter((f) => f !== 'MEMORY.md') };
}

// ---- the whole picture -------------------------------------------------------------------------

const FAIL = new Set(['failed']);
const RECENT_MS = 10 * 60_000;

// What an agent's avatar shows, from real events only: idle, working, researching (its latest step
// was a web search or fetch), success or error (its result in the last 10 minutes), waiting (the
// coordinator while others work, or an agent that needs input) and paused (tasks held by the usage
// guard). Nothing here is ever set by an animation.
export function avatarStatus({ name, live, busy, inRun = [], mine = [], working = [], paused = false, latestTask = null, now = Date.now() }) {
  const recent = (iso) => iso && now - Date.parse(iso) < RECENT_MS;
  if (name === 'coordinator') {
    if (live && working.length) return { status: 'waiting', doing: `Waiting for ${[...new Set(working.map((w) => w.agent))].join(', ')}` };
    if (live) return { status: 'working', doing: inRun[0]?.text || 'Planning the task' };
    if (paused) return { status: 'paused', doing: 'Tasks wait for the plan window to reset' };
    if (latestTask && ['needs_input', 'needs_approval'].includes(latestTask.status) && recent(toIso(latestTask.finished))) return { status: 'waiting', doing: 'Waiting for your answer' };
    return { status: 'idle', doing: null };
  }
  if (busy) {
    const last = inRun.find((e) => e.kind !== 'start');
    return { status: last?.kind === 'web' ? 'researching' : 'working', doing: last?.text || busy.what || 'Working' };
  }
  const result = mine.find((e) => e.kind === 'result');
  if (result && recent(result.at)) {
    const status = result.status === 'failed' ? 'error' : result.status === 'warn' ? 'waiting' : 'success';
    return { status, doing: result.text };
  }
  return { status: paused ? 'paused' : 'idle', doing: null };
}

export function snapshot(root = ROOT) {
  const base = collect(root);
  const roster = loadRoster(root);
  const { events, working, board } = allEvents(root, [...base.tasks].reverse());
  const live = base.runAlive && base.running;
  const runEvents = live ? events.filter((e) => e.task === base.running.id) : [];
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  // Tasks are waiting but the plan's usage guard won't let them start.
  const paused = !live && !!base.usage?.full && base.tasks.some((t) => t.status === 'queued');
  const agents = roster.map((a) => {
    const mine = events.filter((e) => e.agent === a.name);
    const busy = live && working.find((w) => w.agent === a.name);
    const inRun = runEvents.filter((e) => e.agent === a.name);
    const { status, doing } = avatarStatus({ name: a.name, live: !!live, busy, inRun, mine, working, paused, latestTask: base.tasks[0] });
    return {
      ...a,
      status,
      backupActive: !!busy?.backup,
      doing,
      lastAt: mine[0]?.at || null,
      counts: {
        outputs: outputsOf(root, a.name).length,
        tasks: board.filter((r) => r.agent === a.name).length,
        web: mine.filter((e) => e.kind === 'web').length,
        fails: mine.filter((e) => FAIL.has(e.status) && e.at >= weekAgo).length,
        passes: events.filter((e) => e.kind === 'review' && e.verdict === 'PASS' && board.find((r) => r.id === e.task)?.agent === a.name).length,
      },
    };
  });
  const leads = base.leads;
  const by = (s) => leads.filter((l) => l.status === s).length;
  const approvals = parseApprovals(read(root, 'ops/approvals.md'));
  const flags = [
    ...base.pending.map((p) => ({ kind: 'approval', id: p.id, text: clip(p.action, 140), ref: /outputs\/[\w/.-]+\.md/.exec(p.files || '')?.[0] || 'ops/approvals.md', risk: clip(p.risk, 160) })),
    ...base.tasks.filter((t) => ['needs_approval', 'needs_input', 'blocked', 'failed'].includes(t.status)).map((t) => ({ kind: 'task', id: t.id, text: `${t.status.replace('_', ' ')}: ${clip(t.title, 120)}`, ref: t.report || null })),
    ...events.filter((e) => ['fallback', 'blocked'].includes(e.kind)).slice(0, 10).map((e) => ({ kind: e.kind, id: e.task, text: `${e.agent}: ${e.text}`, ref: e.ref || null })),
    ...list(root, 'knowledge/proposals').filter((f) => f !== 'README.md').map((f) => ({ kind: 'knowledge', id: f.replace(/\.md$/, ''), text: `Proposal waiting for a person to apply and confirm: ${f}`, ref: `knowledge/proposals/${f}` })),
  ];
  const reviews = events.filter((e) => e.kind === 'review');
  return {
    at: new Date().toISOString(),
    live: !!live,
    running: base.running ? { id: base.running.id, title: base.running.title, started: base.running.started } : null,
    usage: base.usage,
    kpis: {
      found: leads.length, qualified: by('qualified'), drafted: by('drafted'), contacted: by('contacted'), replied: by('replied'), ruledOut: by('disqualified'),
      sendsWaiting: base.sends.length, decisions: base.others.length,
      reviewsPassed: reviews.filter((e) => e.verdict === 'PASS').length, reviewsRevised: reviews.filter((e) => e.verdict && e.verdict !== 'PASS').length,
      failuresWeek: events.filter((e) => e.status === 'failed' && e.at >= weekAgo).length,
      webWeek: events.filter((e) => e.kind === 'web' && e.at >= weekAgo).length,
    },
    agents,
    feed: events.filter((e) => e.kind !== 'read').slice(0, 60),
    flags,
    tasks: base.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, added: t.added, started: t.started, finished: t.finished, report: t.report, note: t.note })),
    leads: leads.map((l) => ({ id: l.id, company: l.company, status: l.status, tier: l.tier, score: l.score, segment: l.segment, contact: l.contact?.channel || null, evidence: (l.evidence || []).filter((e) => !e.superseded).length, next: l.next_action, sequence: l.sequence, review: l.review, hold: l.hold?.reason || null, updated: l.updated_at, reason: l.disqualify_reason || null })),
    approvals: approvals.length,
  };
}

export function agentDetail(root, name) {
  const roster = loadRoster(root);
  const agent = roster.find((a) => a.name === name);
  if (!agent) return null;
  const { events, board } = allEvents(root);
  const mine = events.filter((e) => e.agent === name);
  return {
    agent,
    outputs: outputsOf(root, name),
    tasks: board.filter((r) => r.agent === name).map((r) => ({ ...r, request: clip(r.request, 220), output: clip(r.output, 160) })),
    events: mine.slice(0, 600),
    failures: mine.filter((e) => e.status === 'failed' || e.status === 'warn').slice(0, 200),
    memory: memoryOf(root, name),
    calls: events.filter((e) => e.kind === 'handoff' && e.to === name).slice(0, 100),
  };
}

export function readFile(root, path) {
  const clean = String(path || '').replace(/^\/+/, '');
  if (!READABLE.test(clean) || clean.includes('..')) return null;
  const text = read(root, clean);
  if (!text) return null;
  return { path: clean, title: clip(/^# (.+)$/m.exec(text)?.[1] || clean.split('/').pop(), 120), at: mtime(root, clean), owner: ownerOf(clean), html: renderMarkdown(text, clean) };
}

// What changes when anything the page shows changes: sizes and times of the files it reads.
function signature(root) {
  const parts = [];
  const add = (file) => {
    try {
      const st = statSync(join(root, file));
      parts.push(`${file}:${st.size}:${st.mtimeMs}`);
    } catch {
      parts.push(`${file}:-`);
    }
  };
  ['ops/queue.json', 'ops/board.md', 'ops/approvals.md', 'ops/messages.md', 'ops/fallbacks.md', 'ops/gate-log.jsonl', 'ops/send-log.jsonl', 'ops/replies.jsonl', 'pipeline/leads.jsonl', 'ops/runs/jarvis.lock', 'ops/runs/plan-limits.json'].forEach(add);
  for (const dir of ['ops/runs', 'outputs/reviews', 'outputs/reports', 'outputs/research', 'outputs/outreach', 'outputs/sales', 'outputs/dev', 'knowledge/proposals']) {
    for (const f of list(root, dir, dir === 'ops/runs' ? '.log' : '.md')) add(`${dir}/${f}`);
  }
  return createHash('sha1').update(parts.join('\n')).digest('hex');
}

// ---- the server ----------------------------------------------------------------------------------

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const STATIC_FILES = /^(app\.js|app\.css|signin\.js|gems\/[\w-]+\.(js|css))$/;
const isLocal = (host) => /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host || '');
const goodHost = (host, site) => (site ? host === site : isLocal(host));
const cookieHeader = (value, site, age) => `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${site ? '; Secure' : ''}`;
const readCookie = (header) => new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]+)`).exec(header || '')?.[1];

const shell = (body, script) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SubE Gems · Mission control</title><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/gems/gems.css"><link rel="stylesheet" href="/gems/office.css"><link rel="stylesheet" href="/gems/ui.css"><link rel="stylesheet" href="/gems/home.css"></head><body>${body}<script type="module" src="/${script}"></script></body></html>`;
const APP = shell('<div id="app" class="app"><noscript>Mission Control needs JavaScript.</noscript></div>', 'app.js');
const SIGN_IN = shell('<main class="signin"><form id="signin" class="signin-card"><div class="brand"><span class="brand-mark"></span>SubE Gems</div><p>Sign in to run the sales team.</p><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required><button type="submit">Sign in</button><p id="msg" role="status"></p></form></main>', 'signin.js');

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--state')) {
    process.stdout.write(`${JSON.stringify(snapshot(), null, 2)}\n`);
    return;
  }
  const site = process.env.TEAM_PAGE_HOST || null;
  const stored = process.env.TEAM_PAGE_PASSWORD_HASH || null;
  if (site && !stored?.startsWith('scrypt:')) {
    console.error('TEAM_PAGE_HOST needs TEAM_PAGE_PASSWORD_HASH: the page must not go online without a sign-in. Make one with node scripts/dashboard.mjs --hash.');
    process.exit(1);
  }
  const auth = stored ? createAuth(stored) : null;
  const state = () => ({ ...snapshot(ROOT), signOut: !!auth });
  const flag = args.indexOf('--port');
  const port = flag >= 0 ? Number(args[flag + 1]) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 0) {
    console.error('Usage: node scripts/control.mjs [--port <number>] [--state]');
    process.exit(1);
  }

  // One shared ticker: when the files change, every open page gets the new state.
  const streams = new Set();
  let lastSig = '';
  let lastState = null;
  const tick = () => {
    if (!streams.size) return;
    let sig;
    try {
      sig = signature(ROOT);
    } catch {
      return;
    }
    if (sig === lastSig) return;
    lastSig = sig;
    try {
      lastState = JSON.stringify(state());
    } catch (error) {
      lastState = JSON.stringify({ error: error.message });
    }
    for (const res of streams) res.write(`event: state\ndata: ${lastState}\n\n`);
  };
  setInterval(tick, TICK_MS).unref();
  setInterval(() => {
    for (const res of streams) res.write(': keep-alive\n\n');
  }, 20_000).unref();

  const send = (res, status, body, type = 'text/plain', extra = {}) => {
    res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Content-Security-Policy': CSP, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...extra });
    res.end(body);
  };
  const json = (res, status, data, extra) => send(res, status, JSON.stringify(data), 'application/json', extra);

  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const path = url.pathname;
    if (!goodHost(req.headers.host, site)) return send(res, 403, 'Open this page at its own address.');
    const token = readCookie(req.headers.cookie);
    const signedIn = !auth || auth.valid(token);
    try {
      if (req.method === 'GET') {
        const file = path.slice(1);
        if (STATIC_FILES.test(file) && existsSync(join(STATIC, file))) return send(res, 200, readFileSync(join(STATIC, file), 'utf8'), TYPES[file.slice(file.lastIndexOf('.'))]);
        if (!signedIn) return path.startsWith('/api/') ? json(res, 401, { message: 'Sign in first.' }) : send(res, 200, SIGN_IN, 'text/html');
        if (path === '/') return send(res, 200, APP, 'text/html');
        if (path === '/api/state') return json(res, 200, state());
        if (path === '/api/logs') return json(res, 200, allEvents(ROOT).events.slice(0, 3000));
        const agent = /^\/api\/agents\/([\w-]+)$/.exec(path);
        if (agent) {
          const detail = agentDetail(ROOT, agent[1]);
          return detail ? json(res, 200, detail) : json(res, 404, { message: 'No such agent.' });
        }
        if (path === '/api/file') {
          const doc = readFile(ROOT, url.searchParams.get('path'));
          return doc ? json(res, 200, doc) : json(res, 404, { message: 'That file is not available here.' });
        }
        if (path === '/api/stream') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
          res.write(`event: state\ndata: ${lastState && streams.size ? lastState : JSON.stringify(state())}\n\n`);
          streams.add(res);
          req.on('close', () => streams.delete(res));
          return undefined;
        }
        return send(res, 404, 'Not found.');
      }
      if (req.method !== 'POST') return send(res, 405, 'Use GET or POST.');
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > MAX_BODY) req.destroy();
      });
      req.on('end', () => {
        const from = { host: req.headers.host, origin: req.headers.origin, marker: req.headers['x-team-page'], body, site };
        if (!sameSite(from)) return json(res, 403, { message: 'Use the page itself.' });
        if (path === '/login' && auth) {
          let password = '';
          try {
            password = String(JSON.parse(body || '{}').password ?? '');
          } catch {
            // an unreadable request counts as a wrong password
          }
          const result = auth.signIn(password, (site && req.headers['x-real-ip']) || req.socket.remoteAddress);
          if (result.token) return json(res, 200, { message: 'Signed in.' }, { 'Set-Cookie': cookieHeader(result.token, site, SESSION_MS / 1000) });
          return json(res, result.locked ? 429 : 401, { message: result.locked ? 'Too many tries. Wait 15 minutes and try again.' : 'That password is wrong.' });
        }
        if (path === '/logout') {
          auth?.signOut(token);
          return json(res, 200, { message: 'Signed out.' }, { 'Set-Cookie': cookieHeader('', site, 0) });
        }
        if (!signedIn) return json(res, 401, { message: 'Sign in first.' });
        const action = path.replace(/^\/api/, '');
        const out = act(ROOT, action, from);
        lastSig = ''; // show the change at once
        return send(res, out.status, out.body, 'application/json');
      });
      return undefined;
    } catch (error) {
      return json(res, 500, { message: `That didn't work: ${error.message}` });
    }
  });
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Pick another with --port.` : error.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => console.log(`Mission control: http://127.0.0.1:${server.address().port}${auth ? ' (sign-in on)' : ''}`));
}

if (isMain(import.meta.url)) main();
