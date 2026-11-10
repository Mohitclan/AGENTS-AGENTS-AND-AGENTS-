// Keep going: a campaign doesn't stop to wait for a person. When a task for a product ends with emails drafted, and
// nobody steps in within two minutes (a new task for that product, or Stop on the Campaigns page), the next lead
// batch for that product starts by itself. Its leads get drafts too, so the campaign carries on until a limit below
// holds it. A person approves the waiting drafts later, all together, on the Emails page: nothing is ever approved
// or sent by this. Mission control calls runKeepGoing() every 15 seconds.
//
// Limits, so a campaign left alone can't use up the plan:
//   - the plan's 5-hour window under 60% and the 7-day window under 80% (otherwise it waits, and goes on after a reset);
//   - at most 20 leads per product with drafts waiting for a person (more would only pile up unread);
//   - at most 6 batches started this way per product per day;
//   - a batch that drafted nothing ends the chain (no new leads were found to write to).
// State: ops/keep-going.json { on, since, stopped: { <task id>: { by, at } }, chained: [{ from, to, product, at }] }.
//
//   node scripts/keep-going.mjs status     what is counting down, and what holds
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, isMain } from './_shared.mjs';
import { productName, productOf } from './lanes.mjs';
import { draftsState, latestLeads } from './outreach.mjs';
import { windowShare } from './schedule.mjs';

export const WAIT_MS = 2 * 60_000;
export const LIMITS = { fiveHour: 0.6, sevenDay: 0.8, waiting: 20, perDay: 6 };
const FILE = ['ops', 'keep-going.json'];
const FINISHED = new Set(['done', 'needs_input', 'needs_approval']);
const LOOK_BACK_MS = 6 * 3_600_000; // a task that ended longer ago than this (mission control was off) starts nothing

const readJson = (f, fallback) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};
const at = (s) => {
  const t = Date.parse(String(s || '').replace(' ', 'T'));
  return Number.isFinite(t) ? t : 0;
};
const istDay = (ms) => new Date(ms + 5.5 * 3_600_000).toISOString().slice(0, 10);

// The switch is off until a person turns it on on the Campaigns page. `since` is when it was first seen, so tasks that ended before the
// feature existed never start a chain.
export function loadKeepGoing(root = ROOT, now = Date.now()) {
  const file = join(root, ...FILE);
  const s = readJson(file, null);
  if (s && typeof s === 'object') return { on: s.on === true, since: s.since || new Date(now).toISOString(), stopped: s.stopped || {}, chained: Array.isArray(s.chained) ? s.chained : [] };
  // off until a person turns it on (2026-11-10: agents run once a day, otherwise only when asked)
  const fresh = { on: false, since: new Date(now).toISOString(), stopped: {}, chained: [] };
  saveKeepGoing(root, fresh);
  return fresh;
}
export function saveKeepGoing(root, state) {
  writeFileSync(join(root, ...FILE), `${JSON.stringify(state, null, 2)}\n`);
}

export const taskText = (product) => {
  const name = productName(product);
  return `Keep going for ${name}: find the next batch of new ${name} leads that fit its ideal customer, with evidence, and draft emails for those that qualify. The last batch's drafts are waiting for a person's approval on the Emails page: don't wait for it.`;
};

function sevenDayShare(root, now) {
  const w = readJson(join(root, 'ops', 'runs', 'plan-limits.json'), null)?.windows?.seven_day;
  if (!w || typeof w.utilization !== 'number') return null;
  return (w.resetsAt || 0) * 1000 > now ? w.utilization : 0;
}

// What each product's campaign is doing about the next batch: one entry per product whose latest finished task
// drafted emails. { product, name, from, state: 'counting' | 'due' | 'holding' | 'stopped' | 'started', startsAt, reason, to }
export function keepGoingPlan(root = ROOT, now = Date.now(), { queue = readJson(join(root, 'ops', 'queue.json'), []), drafts = null, leads = null } = {}) {
  const state = loadKeepGoing(root, now);
  const tasks = (Array.isArray(queue) ? queue : []).map((t) => ({ ...t, product: t.product || productOf(t.task) }));
  const allLeads = leads || latestLeads(root);
  const allDrafts = (drafts || draftsState(root, allLeads)).filter((d) => d.kind === 'sequence');
  const productOfLead = (id) => allLeads.get(id)?.product || null;
  const since = at(state.since);
  const out = [];
  const products = [...new Set(tasks.map((t) => t.product).filter(Boolean))];
  for (const product of products) {
    const mine = tasks.filter((t) => t.product === product);
    const busy = mine.find((t) => ['queued', 'running'].includes(t.status));
    const last = mine.filter((t) => FINISHED.has(t.status) && at(t.finished)).sort((a, b) => at(a.finished) - at(b.finished)).pop();
    if (!last || at(last.finished) < since || now - at(last.finished) > LOOK_BACK_MS) continue;
    // drafts written while that task ran (a minute either side for clock rounding)
    const from = at(last.started) - 60_000;
    const to = at(last.finished) + 120_000;
    const drafted = allDrafts.filter((d) => productOfLead(d.lead) === product && at(d.at) >= from && at(d.at) <= to);
    if (!drafted.length) continue;
    const name = productName(product);
    const base = { product, name, from: last.id, startsAt: at(last.finished) + WAIT_MS, drafted: drafted.length };
    const chained = state.chained.find((c) => c.from === last.id);
    if (chained) {
      out.push({ ...base, state: 'started', to: chained.to, reason: `The next ${name} batch started as ${chained.to}.` });
      continue;
    }
    const hold = (reason) => out.push({ ...base, state: 'holding', reason });
    if (!state.on) continue;
    if (state.stopped[last.id]) {
      out.push({ ...base, state: 'stopped', reason: `Stopped by ${state.stopped[last.id].by}. Start the next batch from the card when you're ready.` });
      continue;
    }
    if (busy) continue; // a person gave this product another task: that is what runs next
    const waiting = allDrafts.filter((d) => productOfLead(d.lead) === product && d.mails.some((m) => m.state === 'pending')).length;
    if (waiting >= LIMITS.waiting) {
      hold(`${waiting} ${name} leads have drafts waiting for you, so no more are found until you approve or decline some.`);
      continue;
    }
    const today = state.chained.filter((c) => c.product === product && istDay(at(c.at)) === istDay(now)).length;
    if (today >= LIMITS.perDay) {
      hold(`${today} ${name} batches started by themselves today, the most in a day. It goes on tomorrow.`);
      continue;
    }
    const five = windowShare(root, now);
    if (five != null && five >= LIMITS.fiveHour) {
      hold(`The plan's 5-hour window is ${Math.round(five * 100)}% used. The next ${name} batch starts once it is under ${LIMITS.fiveHour * 100}%.`);
      continue;
    }
    const seven = sevenDayShare(root, now);
    if (seven != null && seven >= LIMITS.sevenDay) {
      hold(`The plan's 7-day window is ${Math.round(seven * 100)}% used, so batches don't start by themselves until it resets.`);
      continue;
    }
    out.push({ ...base, state: now >= base.startsAt ? 'due' : 'counting', reason: `${drafted.length} ${name} draft(s) wait for your approval. The next batch starts by itself; you can approve later.` });
  }
  return out;
}

// Starts every batch that is due. addTask and startQueued come from dashboard.mjs (injected, so tests start no
// session). Returns [{ product, from, to, message }] for each one started.
export function runKeepGoing(root = ROOT, now = Date.now(), { addTask, startQueued, ...opts } = {}) {
  const due = keepGoingPlan(root, now, opts).filter((p) => p.state === 'due');
  if (!due.length) return [];
  const state = loadKeepGoing(root, now);
  const started = [];
  for (const p of due) {
    const added = addTask(root, taskText(p.product), { split: false });
    if (!added?.id) continue;
    state.chained.push({ from: p.from, to: added.id, product: p.product, at: new Date(now).toISOString() });
    started.push({ product: p.product, from: p.from, to: added.id, message: `Keep going: queued ${added.id}, the next ${p.name} batch (after ${p.from}).` });
  }
  state.chained = state.chained.slice(-200);
  saveKeepGoing(root, state);
  if (started.length) {
    try {
      startQueued(root);
    } catch {
      // queued; mission control or a person starts it
    }
  }
  return started;
}

// A person on the Campaigns page: stop the countdown after one task, or switch keep-going off or on.
export function stopAfter(root, taskId, by = 'a person', now = Date.now()) {
  const state = loadKeepGoing(root, now);
  if (!/^J-\d{8}-\d+$/.test(String(taskId))) return { ok: false, message: 'That is not a task ID.' };
  state.stopped[taskId] = { by: String(by).slice(0, 60), at: new Date(now).toISOString() };
  saveKeepGoing(root, state);
  return { ok: true, message: `Stopped. No batch starts by itself after ${taskId}.` };
}
export function setKeepGoing(root, on, now = Date.now()) {
  const state = loadKeepGoing(root, now);
  state.on = !!on;
  saveKeepGoing(root, state);
  return { ok: true, on: state.on, message: state.on ? 'Keep going is on: when a batch of drafts is waiting, the next lead batch starts after two minutes.' : 'Keep going is off: campaigns stop after each batch.' };
}

export function keepGoingState(root = ROOT, now = Date.now(), opts = {}) {
  const { on } = loadKeepGoing(root, now);
  return { on, waitMinutes: WAIT_MS / 60_000, limits: LIMITS, products: keepGoingPlan(root, now, opts) };
}

if (isMain(import.meta.url)) {
  const s = keepGoingState(ROOT);
  console.log(`Keep going is ${s.on ? 'on' : 'off'}.`);
  for (const p of s.products) console.log(`${p.name}: ${p.state}${p.state === 'counting' ? ` (starts ${new Date(p.startsAt).toLocaleTimeString()})` : ''}. ${p.reason}`);
  if (!s.products.length) console.log('Nothing is waiting to go on.');
}
