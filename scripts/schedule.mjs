#!/usr/bin/env node
// The scheduler: work the team does on a clock, so nobody has to remember to ask. Mission control calls
// runDue() every minute. The entries live in ops/schedule.json, a list of:
//
//   { id, name, kind: 'task' | 'script', every, task | script, enabled, last_run, skip_over }
//
//   every      'daily HH:MM' or 'weekly mon HH:MM', in this computer's local time
//   task       the text of a Jarvis task. Queuing it puts it on ops/queue.json like a task typed into the page,
//              so it runs as a Claude Code session and uses the plan
//   script     a file under scripts/ (and its arguments), run with `node`. No Claude, no plan use
//   enabled    only an entry with `enabled: true` runs; the Reports page switches it on and off
//   last_run   when the entry last ran (an ISO time). It is what keeps an entry from running twice in one
//              day (or week), also across restarts of mission control
//   skip_over  tasks only: a share of the plan's 5-hour window, such as 0.6. Above it, nothing is queued; the
//              check is repeated every minute until the window drops (it resets) or the catch-up time ends
//   catch_up_hours  tasks only, optional: how long after its time an entry may still start (default 6). Late
//              than that, that day (or week) is skipped. A script is never skipped: it runs when it is found
//              overdue within its day or week
//   last_note  written by the scheduler: what happened the last time (a plain sentence)
//
// A task entry is not queued when the same text is already queued or running: that day's run is then taken
// to be done. Nothing here starts a run at port 0 (the tests) or when MISSION_SCHEDULE=off; see control.mjs.
//
//   node scripts/schedule.mjs         the entries: when each runs next and when it last ran
//
// Exports: loadSchedule, saveSchedule, ensureSchedule, dueEntries, isDue, runDue, setEnabled, scheduleState,
// windowShare, parseEvery, describeEvery, lastSlot, nextSlot, DEFAULT_SCHEDULE, CATCH_UP_HOURS.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, isMain, printTable } from './_shared.mjs';
import { addTask as dashboardAddTask, startQueued as dashboardStartQueued } from './dashboard.mjs';

export const CATCH_UP_HOURS = 6;
const SCRIPT_TIMEOUT_MS = 120_000;
const SCHEDULE = 'ops/schedule.json';

// What a new copy of the team starts with (also committed as ops/schedule.json).
export const DEFAULT_SCHEDULE = [
  {
    id: 'nightly-leads',
    name: 'Nightly lead sweep',
    kind: 'task',
    every: 'daily 02:00',
    task: 'Nightly lead sweep for motionrepo: only products launched in the last 2 days on the launch boards in the lead-sources skill (Product Hunt, Show HN, Peerlist, the Indian launch boards). Prove at most 5 leads, stop early when nothing new turns up, and stop at leads: no drafts.',
    enabled: true,
    last_run: null,
    skip_over: 0.6,
  },
  {
    id: 'weekly-report',
    name: 'Weekly results report',
    kind: 'script',
    every: 'weekly mon 09:00',
    script: 'weekly.mjs',
    enabled: true,
    last_run: null,
  },
];

// ---- when ----------------------------------------------------------------------------------------

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 'daily 02:00' -> { type: 'daily', hour: 2, minute: 0 }; 'weekly mon 09:00' -> { type: 'weekly', day: 1, ... }; else null.
export function parseEvery(text) {
  const t = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const time = '([01]?\\d|2[0-3]):([0-5]\\d)';
  const daily = new RegExp(`^daily ${time}$`).exec(t);
  if (daily) return { type: 'daily', hour: Number(daily[1]), minute: Number(daily[2]) };
  const weekly = new RegExp(`^weekly ([a-z]+) ${time}$`).exec(t);
  const day = weekly ? DAYS.findIndex((d, i) => weekly[1] === d || weekly[1] === DAY_NAMES[i].toLowerCase()) : -1;
  return day >= 0 ? { type: 'weekly', day, hour: Number(weekly[2]), minute: Number(weekly[3]) } : null;
}

const hhmm = (e) => `${String(e.hour).padStart(2, '0')}:${String(e.minute).padStart(2, '0')}`;
export function describeEvery(every) {
  const e = typeof every === 'string' ? parseEvery(every) : every;
  if (!e) return null;
  return e.type === 'daily' ? `Every day at ${hhmm(e)}` : `Every ${DAY_NAMES[e.day]} at ${hhmm(e)}`;
}

const atTime = (date, e) => {
  const d = new Date(date);
  d.setHours(e.hour, e.minute, 0, 0);
  return d;
};

// The latest moment at or before `now` that the schedule names: today's 02:00 (or yesterday's, before 02:00 today).
export function lastSlot(every, now = Date.now()) {
  const e = typeof every === 'string' ? parseEvery(every) : every;
  if (!e) return null;
  const at = new Date(now);
  let slot = atTime(at, e);
  if (e.type === 'weekly') {
    slot.setDate(slot.getDate() - ((slot.getDay() - e.day + 7) % 7));
    slot = atTime(slot, e);
  }
  if (slot > at) {
    slot.setDate(slot.getDate() - (e.type === 'weekly' ? 7 : 1));
    slot = atTime(slot, e);
  }
  return slot;
}

// The first moment after `now` that the schedule names.
export function nextSlot(every, now = Date.now()) {
  const e = typeof every === 'string' ? parseEvery(every) : every;
  const slot = lastSlot(e, now);
  if (!slot) return null;
  slot.setDate(slot.getDate() + (e.type === 'weekly' ? 7 : 1));
  return atTime(slot, e);
}

// ---- the file ------------------------------------------------------------------------------------

const readJson = (root, file, fallback) => {
  try {
    return JSON.parse(readFileSync(join(root, file), 'utf8'));
  } catch {
    return fallback;
  }
};

// The entries. A missing file gives the defaults (nothing is written); a file that isn't a list throws, so a
// hand edit gone wrong is reported instead of being overwritten.
export function loadSchedule(root = ROOT) {
  const file = join(root, SCHEDULE);
  if (!existsSync(file)) return structuredClone(DEFAULT_SCHEDULE);
  let list;
  try {
    list = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${SCHEDULE} is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(list)) throw new Error(`${SCHEDULE} must be a list of entries.`);
  return list.filter((e) => e && typeof e === 'object' && typeof e.id === 'string').map((e) => ({ ...e, kind: e.kind === 'script' ? 'script' : 'task', enabled: e.enabled === true }));
}

export function saveSchedule(root, entries) {
  const file = join(root, SCHEDULE);
  mkdirSync(join(root, 'ops'), { recursive: true });
  writeFileSync(`${file}.tmp`, `${JSON.stringify(entries, null, 2)}\n`);
  renameSync(`${file}.tmp`, file);
}

// Writes the defaults when there is no file yet. Returns the entries.
export function ensureSchedule(root = ROOT) {
  const entries = loadSchedule(root);
  if (!existsSync(join(root, SCHEDULE))) saveSchedule(root, entries);
  return entries;
}

// ---- what is due ---------------------------------------------------------------------------------

// Is this entry due by the clock? On, its latest time has come, it hasn't run since that time, and (for a task) it
// isn't later than its catch-up time. A day's (or week's) time that passed unused is not made up the next day.
export function isDue(entry, now = Date.now()) {
  if (!entry?.enabled) return false;
  const every = parseEvery(entry.every);
  if (!every) return false;
  const at = new Date(now);
  const slot = lastSlot(every, at);
  if (Date.parse(entry.last_run || '') >= slot.getTime()) return false;
  if (entry.kind === 'script') return true;
  const hours = Number(entry.catch_up_hours) > 0 ? Number(entry.catch_up_hours) : CATCH_UP_HOURS;
  return at.getTime() - slot.getTime() <= hours * 3_600_000;
}

export const dueEntries = (entries, now = Date.now()) => entries.filter((e) => isDue(e, now));

// How full the plan's 5-hour window is, 0 to 1, from ops/runs/plan-limits.json (Jarvis keeps it). A window that has reset
// since the last report counts as empty. null when no report exists: nothing is known, so nothing is held back.
export function windowShare(root, now = Date.now()) {
  const w = readJson(root, 'ops/runs/plan-limits.json', null)?.windows?.five_hour;
  if (!w || typeof w.utilization !== 'number') return null;
  return (w.resetsAt || 0) * 1000 > new Date(now).getTime() ? w.utilization : 0;
}

const squash = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();
const percent = (x) => `${Math.round(x * 100)}%`;

// Runs a script entry: `node scripts/<file> <args>`, no shell. Returns { ok, text }.
function runScript(root, entry) {
  const [file, ...args] = squash(entry.script).split(' ');
  if (!/^[\w.-]+\.mjs$/.test(file || '') || !existsSync(join(root, 'scripts', file))) return { ok: false, text: `There is no script ${file || '(none)'} under scripts/.` };
  const out = spawnSync(process.execPath, [join(root, 'scripts', file), ...args], {
    cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8', timeout: SCRIPT_TIMEOUT_MS, windowsHide: true,
  });
  const said = squash((out.status === 0 ? out.stdout : out.stderr || out.stdout || out.error?.message || '').split('\n').filter((l) => l.trim()).pop());
  return out.status === 0 ? { ok: true, text: said } : { ok: false, text: `Exit ${out.status ?? 'none'}${said ? `: ${said}` : ''}`.slice(0, 200) };
}

// Does whatever is due now. `addTask(root, text)` -> { id } | { error } and `startQueued(root)` are injected so tests
// start no Claude session; mission control passes the real ones from dashboard.mjs. Returns one result per due
// entry: { id, name, action: 'queued' | 'ran' | 'already-queued' | 'waiting' | 'failed', message }. A 'waiting' entry
// (held by skip_over) changes nothing and is checked again at the next call.
export function runDue(root = ROOT, now = Date.now(), { addTask = dashboardAddTask, startQueued = dashboardStartQueued } = {}) {
  const at = new Date(now);
  const entries = loadSchedule(root);
  const due = dueEntries(entries, at);
  if (!due.length) return [];
  const queue = readJson(root, 'ops/queue.json', []);
  const share = windowShare(root, at);
  const results = [];
  let changed = false;
  const note = (entry, text, ran) => {
    if (ran) entry.last_run = at.toISOString();
    if (entry.last_note !== text || ran) changed = true;
    entry.last_note = text;
  };
  for (const entry of due) {
    const name = entry.name || entry.id;
    if (entry.kind === 'script') {
      const r = runScript(root, entry);
      note(entry, r.ok ? `Ran ${squash(entry.script)}${r.text ? `: ${r.text}` : ''}` : `Failed: ${r.text}`, true);
      results.push({ id: entry.id, name, action: r.ok ? 'ran' : 'failed', message: r.ok ? `Ran ${name}. ${r.text}`.trim() : `${name} failed: ${r.text}` });
      continue;
    }
    const text = squash(entry.task);
    if (!text) {
      note(entry, 'Failed: the entry has no task text', false);
      results.push({ id: entry.id, name, action: 'failed', message: `${name} has no task text.` });
      continue;
    }
    const twin = (Array.isArray(queue) ? queue : []).find((t) => ['queued', 'running'].includes(t.status) && squash(t.task) === text);
    if (twin) {
      note(entry, `Not queued: the same task is already ${twin.status} (${twin.id})`, true);
      results.push({ id: entry.id, name, action: 'already-queued', message: `${name}: the same task is already ${twin.status} as ${twin.id}.` });
      continue;
    }
    if (typeof entry.skip_over === 'number' && share != null && share > entry.skip_over) {
      results.push({ id: entry.id, name, action: 'waiting', message: `${name} is waiting: the plan's 5-hour window is ${percent(share)} used, over ${percent(entry.skip_over)}.` });
      continue;
    }
    const added = addTask(root, text);
    if (!added?.id) {
      note(entry, `Failed: the task wasn't queued (${added?.error || 'no reason given'})`, false);
      results.push({ id: entry.id, name, action: 'failed', message: `${name} wasn't queued: ${added?.error || 'no reason given'}` });
      continue;
    }
    let started = false;
    try {
      started = !!startQueued(root)?.started;
    } catch {
      // the task is queued; a person can start it from the page
    }
    note(entry, `Queued ${added.id}`, true);
    results.push({ id: entry.id, name, action: 'queued', task: added.id, message: `Queued ${added.id} for ${name}${started ? ' and started the queue' : ''}.` });
    queue.push({ id: added.id, task: text, status: 'queued' }); // so a second entry with the same text isn't queued too
  }
  if (changed) saveSchedule(root, entries);
  return results;
}

// A person's on/off switch. Returns { ok, entry } or { status, error }.
export function setEnabled(root, id, enabled) {
  if (typeof enabled !== 'boolean') return { status: 400, error: 'Say on or off.' };
  const entries = loadSchedule(root);
  const entry = entries.find((e) => e.id === id);
  if (!entry) return { status: 404, error: 'No such schedule.' };
  entry.enabled = enabled;
  saveSchedule(root, entries);
  return { ok: true, entry };
}

// ---- for the Reports page ------------------------------------------------------------------------

// outputs/reports/weekly-YYYY-MM-DD.md, newest week first.
export function weeklyReports(root = ROOT) {
  let names = [];
  try {
    names = readdirSync(join(root, 'outputs', 'reports'));
  } catch {
    return [];
  }
  return names.flatMap((n) => {
    const week = /^weekly-(\d{4}-\d{2}-\d{2})\.md$/.exec(n)?.[1];
    if (!week) return [];
    const path = `outputs/reports/${n}`;
    return [{ path, week, at: statSync(join(root, path)).mtime.toISOString() }];
  }).sort((a, b) => b.week.localeCompare(a.week));
}

// What the page shows: each entry with its time in words, when it runs next, when it last ran, and whether it is
// held back by the plan; and the weekly reports written so far.
export function scheduleState(root = ROOT, now = Date.now()) {
  const at = new Date(now);
  let entries;
  try {
    entries = loadSchedule(root);
  } catch (error) {
    return { entries: [], weekly: weeklyReports(root), error: error.message };
  }
  const due = new Set(dueEntries(entries, at).map((e) => e.id));
  const share = windowShare(root, at);
  return {
    entries: entries.map((e) => {
      const every = parseEvery(e.every);
      const held = due.has(e.id) && e.kind === 'task' && typeof e.skip_over === 'number' && share != null && share > e.skip_over;
      return {
        id: e.id,
        name: e.name || e.id,
        kind: e.kind,
        when: describeEvery(every) || `Can't read "${e.every}"`,
        enabled: e.enabled,
        next: e.enabled && every ? nextSlot(every, at).toISOString() : null,
        due: due.has(e.id),
        waiting: held ? `Waiting: the plan's 5-hour window is ${percent(share)} used (limit ${percent(e.skip_over)})` : null,
        last_run: e.last_run || null,
        note: e.last_note || '',
      };
    }),
    weekly: weeklyReports(root),
  };
}

function main() {
  const state = scheduleState(ROOT);
  if (state.error) {
    console.error(state.error);
    process.exit(1);
  }
  const stamp = (iso) => (iso ? new Date(iso).toLocaleString('sv-SE').slice(0, 16) : '');
  printTable(state.entries.map((e) => ({ id: e.id, when: e.when, on: e.enabled ? 'on' : 'off', next: e.enabled ? stamp(e.next) : '', last: stamp(e.last_run) || 'never', note: e.waiting || e.note })), ['id', 'when', 'on', 'next', 'last', 'note']);
}

if (isMain(import.meta.url)) main();
