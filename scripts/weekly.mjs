#!/usr/bin/env node
// The weekly results report: what the AI sales team did in one week, from its own files, and what to do more
// and less of. It reads the send, reply, outreach and queue logs, the leads, the drafts and reviews, and each
// run's log. No Claude session and no paid service is used, and nothing is sent: it only writes one file.
//
//   node scripts/weekly.mjs                     the week that just ended (Monday to Sunday, local time)
//   node scripts/weekly.mjs --week 2026-11-02   that week (any day in it will do; the Monday names the file)
//
// Writes outputs/reports/weekly-YYYY-MM-DD.md, where the date is the Monday. Mission control runs it every Monday
// at 09:00 (ops/schedule.json) and lists the reports on its Reports page. Running it again for the same week
// writes the file again, with whatever has arrived since.
//
// What it counts (a rate is shown only from 10 sends, as in scripts/stats.mjs):
//   Emails sent: outreach rows of ops/send-log.jsonl sent in the week, by mode (live, test copy, demo). Each
//     test copy is one row, so one approved email is three test copies while the pilot lasts.
//   Replies: ops/replies.jsonl rows received in the week, by kind. The reply rate is over the week's sends
//     (demo sends left out, a send whose email bounced left out of both sides): the share that got an answer
//     (a reply, opt-out or complaint; auto-replies and bounces are not answers), whenever the answer came. By
//     subject line ("[TEST] " removed) and by lead source (the host of the lead's first evidence link).
//   Leads found: finished runs in ops/queue.json with `leads_found` (for a run from before Jarvis kept it: the
//     leads its report names that it imported), and leads imported in the week.
//   Drafts: files in outputs/outreach/ drafted in the week (`drafted_on`, else the file's date), and whether the
//     newest review that names each says PASS.
//   Approved and declined: the `email-decision` rows of ops/outreach.jsonl made in the week.
//   Plan use: for each run that finished in the week, its log's result lines (ops/runs/<id>.log and the
//     drafting lane's ops/runs/lane/<id>-*.log): the list-price cost (a proxy for plan use, not money charged),
//     per model, and the 5-hour window points the run used: the rise of `five_hour.utilization` across the
//     run's rate_limit_event lines (a little under the truth: the first reading comes after the first call).
//
// Exports: weekRange, lastWeek, parseDay, sourceOf, collectWeek, usageOfLog, adviceFrom, renderReport, writeWeekly.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, frontmatter, isMain } from './_shared.mjs';
import { DEFAULT_MIN, RESPONDED, parseJsonl, rateOf, showRate } from './stats.mjs';
import { latestLeads, leadsOfTask } from './outreach.mjs';
import { readReview } from './send-tests.mjs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_ROWS = 15;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nice = (d) => `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const money = (x) => `$${x.toFixed(2)}`;
const cell = (text) => String(text ?? '').replace(/\s+/g, ' ').replace(/\|/g, '/').trim();

// ---- the week ------------------------------------------------------------------------------------

// The week that holds a date: from Monday 00:00 to the next Monday 00:00 in local time.
export function weekRange(date) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  const days = Array.from({ length: 7 }, (_, i) => ymd(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
  return { monday: days[0], sunday: days[6], start, end, days };
}

// The week that has just ended: the one before the week that holds `now`.
export function lastWeek(now = Date.now()) {
  const d = weekRange(now).start;
  return weekRange(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
}

// "YYYY-MM-DD" as a local date, or null.
export function parseDay(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text ?? '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return ymd(d) === m[0] ? d : null;
}

// A time from a log: an ISO time, or Jarvis's local "YYYY-MM-DD HH:MM" (read as local time).
const timeOf = (value) => {
  if (!value) return NaN;
  const s = String(value);
  return Date.parse(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.replace(' ', 'T') : /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s);
};

// ---- reading the files ---------------------------------------------------------------------------

const readText = (root, file) => {
  try {
    return readFileSync(join(root, file), 'utf8');
  } catch {
    return '';
  }
};
const readRows = (root, file) => parseJsonl(readText(root, file)).rows;
const listDir = (root, dir, ext) => {
  try {
    return readdirSync(join(root, dir)).filter((n) => n.endsWith(ext)).sort();
  } catch {
    return [];
  }
};
const mtimeMs = (root, file) => {
  try {
    return statSync(join(root, file)).mtimeMs;
  } catch {
    return 0;
  }
};

// Where a lead came from: the host of its first evidence link, "www." removed. 'unknown' when there is none.
export function sourceOf(lead) {
  for (const item of lead?.evidence || []) {
    if (item?.superseded || !item?.url) continue;
    try {
      return new URL(item.url).hostname.toLowerCase().replace(/^www\./, '') || 'unknown';
    } catch {
      // not a link: try the next item
    }
  }
  return 'unknown';
}

const subjectOf = (send) => String(send.subject || '(no subject)').replace(/^\s*\[TEST\]\s*/i, '').replace(/\s+/g, ' ').trim() || '(no subject)';

// The cost and the 5-hour window points in one run log (stream-json lines). Lines that aren't a result or a rate
// limit report are skipped without being parsed, so a long log is cheap to read.
export function usageOfLog(text) {
  const out = { cost: 0, models: {}, points: 0, sessions: 0 };
  const windows = new Map(); // a window's reset time -> [lowest, highest] utilization seen
  for (const line of String(text || '').split('\n')) {
    if (!/"type"\s*:\s*"(result|rate_limit_event)"/.test(line)) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === 'result' && typeof event.total_cost_usd === 'number') {
      out.sessions++;
      out.cost += event.total_cost_usd;
      for (const [name, m] of Object.entries(event.modelUsage || {})) {
        const t = (out.models[name] ||= { cost: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
        t.cost += m.costUSD || 0;
        t.input += m.inputTokens || 0;
        t.output += m.outputTokens || 0;
        t.cacheRead += m.cacheReadInputTokens || 0;
        t.cacheWrite += m.cacheCreationInputTokens || 0;
      }
    } else if (event.type === 'rate_limit_event') {
      const w = event.rate_limit_info?.unifiedWindows?.five_hour;
      if (typeof w?.utilization !== 'number') continue;
      const key = String(w.resetsAt ?? '');
      const seen = windows.get(key) || [w.utilization, w.utilization];
      windows.set(key, [Math.min(seen[0], w.utilization), Math.max(seen[1], w.utilization)]);
    }
  }
  out.points = Math.round([...windows.values()].reduce((sum, [lo, hi]) => sum + (hi - lo) * 100, 0) * 100) / 100;
  return out;
}

// One task's use: its own log plus the drafting lane's logs. `logged` is false when this computer has none.
function usageOfTask(root, id) {
  const files = [`ops/runs/${id}.log`, ...listDir(root, 'ops/runs/lane', '.log').filter((n) => n.startsWith(`${id}-`)).map((n) => `ops/runs/lane/${n}`)].filter((f) => existsSync(join(root, f)));
  const total = { cost: 0, models: {}, points: 0, sessions: 0, logged: files.length > 0 };
  for (const f of files) {
    const u = usageOfLog(readText(root, f));
    total.cost += u.cost;
    total.points += u.points;
    total.sessions += u.sessions;
    for (const [name, m] of Object.entries(u.models)) {
      const t = (total.models[name] ||= { cost: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
      for (const k of Object.keys(t)) t[k] += m[k];
    }
  }
  total.points = Math.round(total.points * 100) / 100;
  return total;
}

// ---- the numbers ---------------------------------------------------------------------------------

const tally = (rows) => {
  const by = new Map();
  for (const r of rows) {
    const g = by.get(r.name) || { name: r.name, sent: 0, replied: 0 };
    g.sent++;
    if (r.answered) g.replied++;
    by.set(r.name, g);
  }
  return [...by.values()].sort((a, b) => b.sent - a.sent || b.replied - a.replied || a.name.localeCompare(b.name));
};

// Everything the report says, for one week (from weekRange), as plain data.
export function collectWeek(root, week) {
  const inWeek = (value) => {
    const t = timeOf(value);
    return t >= week.start.getTime() && t < week.end.getTime();
  };
  const leads = latestLeads(root);

  // emails sent
  const allSends = readRows(root, 'ops/send-log.jsonl').filter((s) => s.kind === 'outreach');
  const sends = allSends.filter((s) => inWeek(s.at));
  const mode = (m) => sends.filter((s) => s.mode === m).length;
  const sent = { live: mode('live'), test: mode('test'), demo: mode('demo'), other: sends.filter((s) => !['live', 'test', 'demo'].includes(s.mode)).length, total: sends.length };

  // replies
  const replies = readRows(root, 'ops/replies.jsonl');
  const received = replies.filter((r) => inWeek(r.received || r.at));
  const kinds = {};
  for (const r of received) kinds[r.kind || 'unknown'] = (kinds[r.kind || 'unknown'] || 0) + 1;
  const optOuts = received.filter((r) => r.kind === 'opt_out').map((r) => r.lead || null);
  const answers = (s) => replies.some((r) => RESPONDED.has(r.kind) && (r.send_message_id ? r.send_message_id === s.message_id : r.lead && r.lead === s.lead && r.sent_to === s.to));
  const bounces = (s) => replies.some((r) => r.kind === 'bounce' && (r.send_message_id ? r.send_message_id === s.message_id : r.sent_to === s.to));
  const rows = sends.filter((s) => s.mode !== 'demo' && !bounces(s)).map((s) => ({ mode: s.mode, name: subjectOf(s), source: sourceOf(leads.get(s.lead)), answered: answers(s) }));
  const rate = (list) => rateOf(list.filter((r) => r.answered).length, list.length, DEFAULT_MIN);
  const bySubject = tally(rows);
  const bySource = tally(rows.map((r) => ({ ...r, name: r.source })));
  // Only live sends can be answered by a lead: a test copy goes to a team member, so it never counts against a
  // subject line or a source.
  const live = rows.filter((r) => r.mode === 'live');
  const liveBySubject = tally(live);
  const liveBySource = tally(live.map((r) => ({ ...r, name: r.source })));

  // leads
  const queue = readText(root, 'ops/queue.json');
  let tasks = [];
  try {
    tasks = JSON.parse(queue || '[]');
  } catch {
    tasks = [];
  }
  tasks = Array.isArray(tasks) ? tasks : [];
  const finished = tasks.filter((t) => inWeek(t.finished));
  // A run counts when it recorded `leads_found` (Jarvis does, from 2026-11-07) or, for an older run, when its report
  // names leads that were imported from a file the report names (leadsOfTask in outreach.mjs).
  const leadRuns = finished
    .map((t) => ({ t, ids: Array.isArray(t.leads_found) ? t.leads_found : leadsOfTask(root, t, leads) }))
    .filter(({ t, ids }) => Array.isArray(t.leads_found) || ids.length)
    .map(({ t, ids }) => ({ id: t.id, task: t.task, found: ids.length, finished: t.finished }));
  const imported = [...leads.values()].filter((l) => (l.history || []).some((h) => h.event === 'imported' && week.days.includes(String(h.at || '').slice(0, 10)))).length;

  // drafts, and the newest review that names each
  const reviews = listDir(root, 'outputs/reviews', '.md').map((n) => ({ file: `outputs/reviews/${n}`, text: readText(root, `outputs/reviews/${n}`), at: mtimeMs(root, `outputs/reviews/${n}`) }));
  const drafts = [];
  for (const n of listDir(root, 'outputs/outreach', '.md')) {
    const path = `outputs/outreach/${n}`;
    const fm = frontmatter(readText(root, path));
    if (!fm?.lead) continue;
    const day = /^\d{4}-\d{2}-\d{2}$/.test(fm.drafted_on || '') ? fm.drafted_on : ymd(new Date(mtimeMs(root, path)));
    if (!week.days.includes(day)) continue;
    let best = null;
    for (const r of reviews) {
      const { verdict, names } = readReview(r.text, path);
      if (names && (!best || r.at > best.at)) best = { verdict, at: r.at };
    }
    drafts.push({ lead: fm.lead, company: fm.company || leads.get(fm.lead)?.company || fm.lead, day, verdict: best?.verdict || null });
  }
  const decisions = readRows(root, 'ops/outreach.jsonl').filter((e) => e.kind === 'email-decision' && inWeek(e.at));
  const count = (which) => decisions.filter((e) => e.decision === which).reduce((n, e) => n + (e.emails || []).length, 0);

  // plan use
  const runs = finished.map((t) => ({ id: t.id, task: t.task, status: t.status, finished: t.finished, ...usageOfTask(root, t.id) }));
  const models = {};
  for (const r of runs) for (const [name, m] of Object.entries(r.models)) models[name] = (models[name] || 0) + m.cost;

  return {
    week,
    sent,
    received: { kinds, total: received.length, answers: received.filter((r) => RESPONDED.has(r.kind)).length },
    optOuts,
    rates: { all: rate(rows), live: rate(rows.filter((r) => r.mode === 'live')), test: rate(rows.filter((r) => r.mode === 'test')) },
    bySubject,
    bySource,
    liveBySubject,
    liveBySource,
    leads: { runs: leadRuns, found: leadRuns.reduce((n, r) => n + r.found, 0), quiet: leadRuns.filter((r) => r.found === 0).length, imported },
    drafts: { written: drafts, passed: drafts.filter((d) => d.verdict === 'PASS').length },
    decisions: { approved: count('approve'), declined: count('decline') },
    plan: { runs, cost: runs.reduce((n, r) => n + r.cost, 0), points: Math.round(runs.reduce((n, r) => n + r.points, 0) * 100) / 100, models, logged: runs.filter((r) => r.logged).length },
  };
}

// ---- what to do more and less of -----------------------------------------------------------------

// 2 to 4 plain lines from simple rules: the source and the subject line with the most replies; a subject line or a
// source with no replies after 10 sends; a lead run that found nothing and used the most of the plan. When too
// little qualifies it says so, instead of guessing.
export function adviceFrom(data) {
  const best = (list) => list.filter((g) => g.replied > 0).sort((a, b) => b.replied - a.replied || b.replied / b.sent - a.replied / a.sent || b.sent - a.sent)[0];
  const silent = (list) => list.filter((g) => g.sent >= DEFAULT_MIN && g.replied === 0).sort((a, b) => b.sent - a.sent)[0];
  const got = (g) => `${plural(g.replied, 'reply', 'replies')} from ${plural(g.sent, 'send')}`;
  const more = [];
  const less = [];
  const source = best(data.bySource);
  if (source) more.push(`Do more of: leads from ${source.name}. They gave the most replies: ${got(source)}.`);
  const subject = best(data.bySubject);
  if (subject) more.push(`Do more of: the subject line "${subject.name}": ${got(subject)}.`);
  const quietSubject = silent(data.liveBySubject || []);
  if (quietSubject) less.push(`Do less of: the subject line "${quietSubject.name}". No replies after ${plural(quietSubject.sent, 'send')}.`);
  const quietSource = silent(data.liveBySource || []);
  if (quietSource) less.push(`Do less of: leads from ${quietSource.name}. No replies after ${plural(quietSource.sent, 'send')}.`);
  const empty = data.leads.runs
    .filter((r) => r.found === 0)
    .map((r) => ({ id: r.id, points: data.plan.runs.find((p) => p.id === r.id)?.points || 0 }))
    .sort((a, b) => b.points - a.points)[0];
  if (empty && empty.points > 0) less.push(`Do less of: runs that find no leads. ${empty.id} found none and used about ${empty.points} points of the 5-hour window.`);
  const lines = [...more.slice(0, 2), ...less.slice(0, 2)];
  if (!more.length) lines.unshift(`Not enough replies yet to say what to do more of: ${plural(data.sent.live + data.sent.test, 'email')} sent, ${plural(data.received.answers, 'answer')} received. A subject line or a source is judged from ${DEFAULT_MIN} sends.`);
  if (!less.length && lines.length < 2) lines.push(`Nothing to do less of yet: no subject line or source has had ${DEFAULT_MIN} live sends without a reply (test copies go to the team, so they don't count).`);
  return lines.slice(0, 4);
}

// ---- the report ----------------------------------------------------------------------------------

const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)];
const cut = (rows) => [rows.slice(0, MAX_ROWS), rows.length > MAX_ROWS ? `${rows.length - MAX_ROWS} more not shown.` : ''];
const rateCell = (g) => (g.sent >= DEFAULT_MIN ? `${((g.replied / g.sent) * 100).toFixed(0)}%` : '-');
const modelName = (name) => name.replace(/^claude-/, '');
const VERDICT = { PASS: 'passed', REVISE: 'sent back', ESCALATE: 'escalated' };
const percentOf = (r) => (r.enough ? `${(r.rate * 100).toFixed(1)}%` : '-');

export function renderReport(data, { now = new Date() } = {}) {
  const { week, sent, received, plan } = data;
  const all = data.rates.all;
  const last = new Date(week.end.getFullYear(), week.end.getMonth(), week.end.getDate() - 1);
  const out = [`# Weekly results: ${nice(week.start)} to ${nice(last)} ${last.getFullYear()}`, '',
    `How the PanScience Innovations AI sales team did from Monday ${week.monday} to Sunday ${week.sunday} (local time), counted from its own files. No Claude session was used to make this report. Made on ${ymd(now)}.`, ''];
  const section = (title, ...body) => out.push(`## ${title}`, '', ...body.flat(Infinity), '');

  section('At a glance', [
    `- Emails sent: ${sent.total} (live ${sent.live}, test copies ${sent.test}, demo ${sent.demo}${sent.other ? `, other ${sent.other}` : ''})`,
    `- Replies received: ${received.total}; real answers (a reply, opt-out or complaint): ${received.answers}; opt-outs: ${data.optOuts.length}`,
    `- Reply rate: ${all.enough ? `${percentOf(all)} (${all.k} of ${all.n} sends)` : `no rate yet (${all.k} of ${all.n} sends answered; a rate needs ${DEFAULT_MIN} sends)`}`,
    `- Leads found: ${data.leads.found} in ${plural(data.leads.runs.length, 'run')}; ${data.leads.imported} new in the pipeline`,
    `- Drafts written: ${data.drafts.written.length}, passed review: ${data.drafts.passed}`,
    `- Emails approved: ${data.decisions.approved}, declined: ${data.decisions.declined}`,
    `- Plan use: ${!plan.runs.length ? 'no runs finished' : !plan.logged ? `${plural(plan.runs.length, 'run')} finished, none with a log on this computer` : `${money(plan.cost)} at list prices over ${plural(plan.runs.length, 'run')}, about ${plan.points} points of the 5-hour window`}`,
  ]);

  section('Do more of, do less of', adviceFrom(data).map((l) => `- ${l}`));

  section('Emails sent', sent.total
    ? [table(['Mode', 'Sent'], [['Live', sent.live], ['Test copies', sent.test], ['Demo', sent.demo], ...(sent.other ? [['Other', sent.other]] : []), ['All', sent.total]]), '',
      'A test copy goes to a team member, not to a lead; while the pilot lasts one approved email is three test copies.']
    : 'No data yet: no emails were sent this week.');

  const kinds = Object.entries(received.kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k.replace(/_/g, ' '), n]);
  const people = data.optOuts.filter(Boolean);
  section('Replies', !received.total && !sent.total
    ? 'No data yet: no emails were sent and no replies came in.'
    : [kinds.length ? table(['Received this week', 'Count'], kinds) : 'No replies came in this week.', '',
      `Reply rate, over this week's sends (demo sends and bounced emails left out): ${showRate(all).replace(/\.?$/, '.')}`, '',
      table(['Sends', 'Answered', 'Of', 'Rate'], [['Live', data.rates.live.k, data.rates.live.n, percentOf(data.rates.live)], ['Test copies', data.rates.test.k, data.rates.test.n, percentOf(data.rates.test)], ['All', all.k, all.n, percentOf(all)]]), '',
      `Opt-outs: ${data.optOuts.length}${people.length ? ` (${people.join(', ')})` : ''}.`]);

  for (const [title, list, label] of [['By subject line', data.bySubject, 'Subject line'], ['By lead source', data.bySource, 'Source (first evidence link)']]) {
    const [shown, more] = cut(list);
    section(title, list.length
      ? [table([label, 'Sent', 'Replied', 'Rate'], shown.map((g) => [g.name, g.sent, g.replied, rateCell(g)])), '', `Live and test sends together. A rate shows from ${DEFAULT_MIN} sends.${more ? ` ${more}` : ''}`]
      : 'No data yet: no emails to count.');
  }

  const found = data.leads.runs.filter((r) => r.found > 0);
  section('Leads found', !data.leads.runs.length && !data.leads.imported
    ? 'No data yet: no run finished this week and no lead was imported.'
    : [found.length ? table(['Run', 'Task', 'Leads', 'Finished'], found.map((r) => [r.id, r.task.slice(0, 80), r.found, r.finished])) : 'No run found a lead this week.', '',
      `${plural(data.leads.found, 'lead')} found by ${plural(data.leads.runs.length, 'run')}; ${plural(data.leads.quiet, 'run')} found none. ${plural(data.leads.imported, 'lead')} imported into the pipeline this week.`]);

  const [drafts, moreDrafts] = cut(data.drafts.written);
  section('Drafts and decisions', !data.drafts.written.length && !data.decisions.approved && !data.decisions.declined
    ? 'No data yet: no draft was written and no email was approved or declined this week.'
    : [`Drafts written: ${data.drafts.written.length}. Passed review: ${data.drafts.passed}. Emails approved: ${data.decisions.approved}. Emails declined: ${data.decisions.declined}.`,
      ...(drafts.length ? ['', table(['Lead', 'Company', 'Drafted', 'Review'], drafts.map((d) => [d.lead, d.company, d.day, VERDICT[d.verdict] || 'not reviewed yet']))] : []), ...(moreDrafts ? ['', moreDrafts] : [])]);

  const [runs, moreRuns] = cut(plan.runs);
  const byModel = (r) => Object.entries(r.models).sort((a, b) => b[1].cost - a[1].cost).map(([n, m]) => `${modelName(n)} ${money(m.cost)}`).join(', ') || '-';
  section('Plan use', !plan.runs.length
    ? 'No data yet: no run finished this week.'
    : [table(['Run', 'Task', 'List price', 'By model', '5-hour points'], runs.map((r) => [r.id, r.task.slice(0, 60), r.logged ? money(r.cost) : 'no log here', r.logged ? byModel(r) : '-', r.logged ? r.points : '-'])),
      ...(moreRuns ? ['', moreRuns] : []), '',
      `Total: ${money(plan.cost)} and about ${plan.points} points of the 5-hour window over ${plural(plan.runs.length, 'run')} (${plan.logged} with a log on this computer).`,
      ...(Object.keys(plan.models).length ? ['', 'By model:', '', table(['Model', 'List price', 'Share'], Object.entries(plan.models).sort((a, b) => b[1] - a[1]).map(([n, c]) => [modelName(n), money(c), plan.cost ? `${Math.round((c / plan.cost) * 100)}%` : '-']))] : []), '',
      'Costs are the list prices of the tokens a run used: a proxy for plan use, not money charged. Points are how far the 5-hour window rose while the run went on, read from its own log.']);

  while (out.at(-1) === '') out.pop();
  return `${out.join('\n')}\n`;
}

// Collects the week and writes outputs/reports/weekly-<Monday>.md. Returns { path, markdown, data }.
export function writeWeekly(root, week, { now = new Date() } = {}) {
  const data = collectWeek(root, week);
  const markdown = renderReport(data, { now });
  const path = `outputs/reports/weekly-${week.monday}.md`;
  mkdirSync(join(root, 'outputs', 'reports'), { recursive: true });
  writeFileSync(join(root, path), markdown);
  return { path, markdown, data };
}

function main() {
  const args = process.argv.slice(2);
  const flag = args.indexOf('--week');
  let week = lastWeek();
  if (flag >= 0) {
    const day = parseDay(args[flag + 1]);
    if (!day) {
      console.error('Usage: node scripts/weekly.mjs [--week YYYY-MM-DD]');
      process.exit(1);
    }
    week = weekRange(day);
  } else if (args.length) {
    console.error('Usage: node scripts/weekly.mjs [--week YYYY-MM-DD]');
    process.exit(1);
  }
  const { path, data } = writeWeekly(ROOT, week);
  console.log(`Wrote ${path} (${plural(data.sent.total, 'email')}, ${plural(data.received.total, 'reply', 'replies')}, ${plural(data.plan.runs.length, 'run')}).`);
}

if (isMain(import.meta.url)) main();
