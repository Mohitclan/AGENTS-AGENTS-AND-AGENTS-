#!/usr/bin/env node
// The one place the team gets a count or a rate from. Read-only: it reads the team's files and
// writes nothing. Nobody types or estimates a number; this script computes it, prints the sample
// size (n), refuses to print a rate below a minimum sample, and counts only closed windows.
//
//   node scripts/stats.mjs pipeline [--json]
//   node scripts/stats.mjs reply-rate [--since <date>] [--window <days>] [--min <n>] [--json]
//   node scripts/stats.mjs reviews [--min <n>] [--list] [--json]
//   node scripts/stats.mjs objections [--window <days>] [--min <n>] [--json]
//
// Shared flags: --as-of <date> (count windows as of that day, for testing), --root <folder>
// (read another copy of the team folder).
//
// Definitions (the same text is in outputs/dev/T-20261103-08.md):
//   Reply rate: live outreach only, never demo sends. The unit is a contact (the lead, else the
//     address). Its 14-day window (ops/approvals.md condition D) starts at the first live send and
//     is closed once 14 days have passed. Only closed contacts are counted. A reply counts if it
//     is a reply, opt-out or complaint that arrived inside the window; auto-replies do not count;
//     a contact whose email bounced is left out of both sides. Rate comes with a 95% Wilson interval.
//   Reviews: a task's revisions are its reviews minus one. A review that holds a per-draft table
//     contributes one result per draft. First-review pass rate = PASS results in each task's first
//     review (round 1) over all results in those reviews.
//   Objections: of the objections whose answer a person sent, with the wait (7 days) over, the
//     share where the buyer wrote back inside the wait. Source: outputs/sales/objection-log.jsonl.
//
// Below the minimum sample (default 10) no rate is printed: "not enough data (n=X, need ≥10)".
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT, frontmatter, isMain } from './_shared.mjs';

export const DEFAULT_MIN = 10;
export const REPLY_WINDOW_DAYS = 14;
export const OBJECTION_WINDOW_DAYS = 7;
const DAY = 86_400_000;
// 97.5th percentile of the normal distribution: a two-sided 95% interval.
export const Z95 = 1.959963984540054;

// A real answer to an outreach email. Auto-replies and bounces are not answers.
export const RESPONDED = new Set(['reply', 'opt_out', 'complaint']);

// Objection-log labels (the reply-triage categories in snake_case, plus `declined` for a flat no
// that is not an opt-out). Only these count as the buyer writing back and keeping the talk going.
export const OBJECTION_LABELS = ['interested', 'objection', 'referral', 'not_now', 'wrong_person', 'needs_person', 'declined', 'opt_out', 'complaint', 'auto_reply', 'bounce', 'unknown'];
export const OBJECTION_RECOVERED = new Set(['interested', 'objection', 'referral', 'needs_person']);

// ---------- pure helpers (tested in scripts/tests/stats.test.mjs) ----------

// Wilson score interval for k successes in n trials. Returns [low, high] as fractions.
export function wilson(k, n, z = Z95) {
  if (!(n > 0)) return [NaN, NaN];
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

// One rate, or a refusal. Below `min` there is no rate and no interval.
export function rateOf(k, n, min = DEFAULT_MIN) {
  if (n < min) return { k, n, min, enough: false, rate: null, low: null, high: null, message: `not enough data (n=${n}, need ≥${min})` };
  const [low, high] = wilson(k, n);
  return { k, n, min, enough: true, rate: k / n, low, high, message: null };
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
export function showRate(r) {
  if (!r.enough) return `${r.message}. Counts so far: ${r.k} of ${r.n}, no rate.`;
  return `${pct(r.rate)} (${r.k} of ${r.n}, n=${r.n}); 95% Wilson interval ${pct(r.low)} to ${pct(r.high)}`;
}

// Parses YYYY-MM-DD or an ISO time to milliseconds, or null.
export function toMs(value) {
  if (!value) return null;
  const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00Z` : String(value));
  return Number.isNaN(t) ? null : t;
}

// A window is closed once `days` full days have passed since `startMs`.
export function windowClosed(startMs, days, asOfMs) {
  return startMs + days * DAY <= asOfMs;
}

export function parseJsonl(text) {
  const rows = [];
  let bad = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      bad++;
    }
  }
  return { rows, bad };
}

// Reply rate over live outreach. `sends` are ops/send-log.jsonl rows, `replies` are reply records
// ({ kind, mode, lead, sent_to, send_message_id, received | at }).
export function replyRate({ sends, replies, windowDays = REPLY_WINDOW_DAYS, asOfMs = Date.now(), sinceMs = null, min = DEFAULT_MIN }) {
  const outreach = sends.filter((s) => s.kind === 'outreach');
  const live = outreach.filter((s) => s.mode === 'live' && (sinceMs == null || toMs(s.at) >= sinceMs));
  const demoExcluded = outreach.filter((s) => s.mode === 'demo').length;
  const otherMode = outreach.filter((s) => s.mode !== 'live' && s.mode !== 'demo').length;

  const groups = new Map();
  for (const s of [...live].sort((a, b) => toMs(a.at) - toMs(b.at))) {
    const key = s.lead || String(s.to || '').toLowerCase();
    if (!groups.has(key)) groups.set(key, { key, firstAt: toMs(s.at), sends: 0, tos: new Set(), ids: new Set(), kinds: {} });
    const g = groups.get(key);
    g.sends++;
    if (s.to) g.tos.add(String(s.to).toLowerCase());
    if (s.message_id) g.ids.add(String(s.message_id).toLowerCase());
  }

  const liveReplies = replies.filter((r) => r.mode === 'live');
  const belongs = (g, r) => (r.lead && r.lead === g.key) || (r.send_message_id && g.ids.has(String(r.send_message_id).toLowerCase())) || (r.sent_to && g.tos.has(String(r.sent_to).toLowerCase()));
  let late = 0;
  for (const g of groups.values()) {
    g.bounced = false;
    g.responded = false;
    for (const r of liveReplies.filter((x) => belongs(g, x))) {
      if (r.kind === 'bounce') g.bounced = true;
      const at = toMs(r.received) ?? toMs(r.at);
      const inside = at != null && at <= g.firstAt + windowDays * DAY;
      if (RESPONDED.has(r.kind)) {
        if (inside) {
          g.responded = true;
          g.kinds[r.kind] = (g.kinds[r.kind] || 0) + 1;
        } else late++;
      }
    }
  }

  const all = [...groups.values()];
  const bounced = all.filter((g) => g.bounced);
  const counted = all.filter((g) => !g.bounced);
  const closed = counted.filter((g) => windowClosed(g.firstAt, windowDays, asOfMs));
  const open = counted.filter((g) => !windowClosed(g.firstAt, windowDays, asOfMs));
  const k = closed.filter((g) => g.responded).length;
  const by = {};
  for (const g of closed) for (const [kind, c] of Object.entries(g.kinds)) by[kind] = (by[kind] || 0) + c;
  return {
    window_days: windowDays,
    as_of: new Date(asOfMs).toISOString().slice(0, 10),
    since: sinceMs == null ? null : new Date(sinceMs).toISOString().slice(0, 10),
    live_sends: live.length,
    contacts: all.length,
    bounced: bounced.length,
    still_open: open.length,
    closed: closed.length,
    replied: k,
    reply_kinds: by,
    late_replies_not_counted: late,
    demo_sends_excluded: demoExcluded,
    other_mode_sends_excluded: otherMode,
    ...rateOf(k, closed.length, min),
  };
}

// ----- reviews -----

const TOKEN = /\b(PASS|REVISE|ESCALATE|FAIL)\b/;
const cellsOf = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const plain = (s) => s.replace(/[*`]/g, '').trim();

// "T-20261030-01-review.md" is round 1, "...-review-r2.md" and "...-r2.md" are round 2.
export function reviewName(file) {
  const m = /^(T-\d{8}-\d{2})(?:-review)?(?:-r(\d+))?\.md$/.exec(file);
  return m ? { task: m[1], round: m[2] ? Number(m[2]) : 1 } : null;
}

// One result per draft: a table in the top of the file whose header has a Verdict column.
function tableResults(lines) {
  const top = lines.slice(0, 45);
  for (let i = 0; i + 1 < top.length; i++) {
    if (!top[i].trim().startsWith('|') || !/^\|?[\s:|-]+\|?$/.test(top[i + 1].trim())) continue;
    const head = cellsOf(top[i]).map((c) => plain(c).toLowerCase());
    const col = head.findIndex((c) => /^(per-lead |final |batch )?verdict$/.test(c));
    if (col < 0) continue;
    const out = [];
    for (let j = i + 2; j < lines.length && lines[j].trim().startsWith('|'); j++) {
      const cells = cellsOf(lines[j]);
      const label = plain(cells[0] || '');
      if (/^(overall|batch|total)\b/i.test(label)) continue;
      const t = TOKEN.exec(plain(cells[col] || '').replace(/\bPASS (line|mark)\b/g, ''));
      if (t) out.push({ label, verdict: t[1] });
    }
    if (out.length) return out;
  }
  return [];
}

// Verdicts of one review file: per-draft table first, then the frontmatter, then the Verdict line.
export function parseReview(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const rows = tableResults(lines);
  if (rows.length) return { results: rows, source: 'table', warning: null };
  const fm = frontmatter(text);
  const fv = fm?.verdict && TOKEN.exec(fm.verdict.toUpperCase());
  if (fv) return { results: [{ label: 'review', verdict: fv[1] }], source: 'frontmatter', warning: null };
  for (const line of lines.slice(0, 40)) {
    const at = line.search(/verdict/i);
    if (at < 0) continue;
    const after = plain(line.slice(at)).replace(/\bPASS (line|mark)\b/g, '');
    const t = TOKEN.exec(after);
    if (!t) continue;
    const seen = [...new Set(after.match(new RegExp(TOKEN.source, 'g')) || [])];
    return { results: [{ label: 'review', verdict: t[1] }], source: 'headline', warning: seen.length > 1 ? `headline names ${seen.join(' and ')}; counted ${t[1]}, the first` : null };
  }
  return { results: [], source: null, warning: 'no verdict found' };
}

// files: [{ name, text }]
export function reviewStats(files, min = DEFAULT_MIN) {
  const tasks = new Map();
  const skipped = [];
  const warnings = [];
  for (const f of files) {
    const id = reviewName(f.name);
    if (!id) {
      skipped.push(f.name);
      continue;
    }
    const parsed = parseReview(f.text);
    if (parsed.warning) warnings.push(`${f.name}: ${parsed.warning}`);
    if (!tasks.has(id.task)) tasks.set(id.task, []);
    tasks.get(id.task).push({ file: f.name, round: id.round, ...parsed });
  }
  const rows = [];
  const gaps = [];
  let firstResults = 0;
  let firstPass = 0;
  let revisions = 0;
  let reviewCount = 0;
  for (const [task, list] of [...tasks].sort(([a], [b]) => a.localeCompare(b))) {
    list.sort((a, b) => a.round - b.round);
    const first = list[0];
    const hasFirst = first.round === 1;
    if (!hasFirst) gaps.push(`${task}: no round 1 review file (earliest is r${first.round}); left out of the first-review pass rate; its revisions are reviews − 1, so the true count may be higher`);
    revisions += list.length - 1;
    reviewCount += list.length;
    if (hasFirst) {
      firstResults += first.results.length;
      firstPass += first.results.filter((r) => r.verdict === 'PASS').length;
    }
    rows.push({
      task,
      reviews: list.length,
      revisions: list.length - 1,
      first_review: hasFirst ? first.results.map((r) => r.verdict).join(' + ') || 'unknown' : 'not seen',
      last_review: list[list.length - 1].results.map((r) => r.verdict).join(' + ') || 'unknown',
    });
  }
  return {
    review_files: reviewCount,
    tasks: rows.length,
    skipped_files: skipped,
    first_review_results: firstResults,
    first_review_passes: firstPass,
    first_review_pass_rate: rateOf(firstPass, firstResults, min),
    revisions_total: revisions,
    avg_revisions: rows.length >= min ? revisions / rows.length : null,
    avg_revisions_message: rows.length >= min ? null : `not enough data (n=${rows.length}, need ≥${min})`,
    gaps,
    warnings,
    per_task: rows,
  };
}

// ----- objections -----

// rows: objection-log lines. The latest line for an id wins; nothing in the file is ever deleted.
export function objectionStats(rows, { windowDays = OBJECTION_WINDOW_DAYS, asOfMs = Date.now(), min = DEFAULT_MIN } = {}) {
  const latest = new Map();
  rows.forEach((r, i) => latest.set(r.id ?? `line-${i}`, r));
  const all = [...latest.values()];
  const answered = all.filter((r) => toMs(r.answer_sent) != null);
  const notAnswered = all.length - answered.length;
  const out = { logged: all.length, not_answered_yet: notAnswered, bounced: 0, pending: 0, unlabelled: 0, unknown_labels: [], late_replies_not_counted: 0 };
  let n = 0;
  let k = 0;
  for (const r of answered) {
    const sent = toMs(r.answer_sent);
    const label = r.reply_category ?? null;
    if (label === 'bounce') {
      out.bounced++;
      continue;
    }
    if (!windowClosed(sent, windowDays, asOfMs)) {
      out.pending++;
      continue;
    }
    if (label === 'unknown' || (label && !OBJECTION_LABELS.includes(label))) {
      out.unlabelled++;
      if (label !== 'unknown') out.unknown_labels.push(`${r.id ?? '?'}: ${label}`);
      continue;
    }
    n++;
    const at = toMs(r.reply_at);
    const inside = at != null && at >= sent && at <= sent + windowDays * DAY;
    if (label && OBJECTION_RECOVERED.has(label)) {
      if (inside) k++;
      else out.late_replies_not_counted++;
    }
  }
  return { window_days: windowDays, as_of: new Date(asOfMs).toISOString().slice(0, 10), ...out, closed: n, recovered: k, ...rateOf(k, n, min) };
}

// ---------- reading the team's files ----------

const readText = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null);

function loadAll(root) {
  const jsonl = (rel) => parseJsonl(readText(join(root, rel)));
  const sends = jsonl('ops/send-log.jsonl');
  const log = jsonl('ops/replies.jsonl');
  // A saved reply that the log does not mention still counts (replies.mjs writes both together).
  const known = new Set(log.rows.map((r) => r.file));
  const replyDir = join(root, 'outputs', 'replies');
  const fromFiles = existsSync(replyDir)
    ? readdirSync(replyDir).filter((n) => n.endsWith('.md') && !known.has(`outputs/replies/${n}`)).map((n) => {
        const fm = frontmatter(readFileSync(join(replyDir, n), 'utf8')) || {};
        return { kind: fm.kind, mode: fm.mode, lead: fm.lead || null, sent_to: fm.sent_to, received: fm.received, file: `outputs/replies/${n}` };
      })
    : [];
  return { sends, replies: [...log.rows, ...fromFiles], badLines: sends.bad + log.bad };
}

function countBy(list, key) {
  const out = {};
  for (const x of list) {
    const v = typeof key === 'function' ? key(x) : x[key];
    out[v ?? 'none'] = (out[v ?? 'none'] || 0) + 1;
  }
  return out;
}

const LEAD_STATUSES = ['new', 'qualified', 'disqualified', 'drafted', 'approved', 'contacted', 'replied', 'meeting', 'trial', 'won', 'lost'];

function pipelineStats(root) {
  const leads = parseJsonl(readText(join(root, 'pipeline', 'leads.jsonl')));
  const byStatus = countBy(leads.rows, 'status');
  const ordered = {};
  for (const s of [...LEAD_STATUSES, ...Object.keys(byStatus)]) if (byStatus[s] != null) ordered[s] = byStatus[s];

  const dir = join(root, 'outputs', 'outreach');
  const files = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.md')) : [];
  let draftFiles = 0;
  let emails = 0;
  let notDrafts = 0;
  for (const n of files) {
    const text = readFileSync(join(dir, n), 'utf8');
    if (!frontmatter(text)?.lead) {
      notDrafts++;
      continue;
    }
    draftFiles++;
    emails += (text.match(/^## Email \d+\s*$/gm) || []).length;
  }

  const { sends, replies, badLines } = loadAll(root);
  const outreach = sends.rows.filter((s) => s.kind === 'outreach');
  const queue = (() => {
    try {
      return JSON.parse(readText(join(root, 'ops', 'queue.json')) || '[]');
    } catch {
      return [];
    }
  })();
  return {
    leads: { n: leads.rows.length, by_status: ordered },
    drafts: { draft_files: draftFiles, emails_drafted: emails, files_without_lead_skipped: notDrafts },
    sends: { n: outreach.length, by_mode: countBy(outreach, 'mode'), contacts_live: new Set(outreach.filter((s) => s.mode === 'live').map((s) => s.lead || String(s.to).toLowerCase())).size },
    replies: { n: replies.length, by_kind: countBy(replies, 'kind'), by_mode: countBy(replies, 'mode') },
    jarvis_queue: { n: queue.length, by_status: countBy(queue, 'status') },
    unreadable_lines: leads.bad + badLines,
  };
}

// ---------- command line ----------

function die(message) {
  console.error(message);
  process.exit(1);
}

export function parseArgs(argv) {
  const out = { _: [] };
  const valued = new Set(['since', 'window', 'min', 'as-of', 'root']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) out._.push(a);
    else if (valued.has(a.slice(2))) {
      const v = argv[++i];
      if (v == null || v.startsWith('--')) die(`${a} needs a value`);
      out[a.slice(2)] = v;
    } else if (a === '--json' || a === '--list') out[a.slice(2)] = true;
    else die(`unknown flag ${a}`);
  }
  return out;
}

function intFlag(args, name, fallback) {
  if (args[name] == null) return fallback;
  const n = Number(args[name]);
  if (!Number.isInteger(n) || n < 1) die(`--${name} needs a whole number of at least 1`);
  return n;
}

function dateFlag(args, name) {
  if (args[name] == null) return null;
  const t = toMs(args[name]);
  if (t == null) die(`--${name} needs a date like 2026-11-03`);
  return t;
}

const out = (json, data, text) => console.log(json ? JSON.stringify(data, null, 2) : text);
const kv = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';

function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  const root = args.root ? resolve(args.root) : ROOT;
  const min = intFlag(args, 'min', DEFAULT_MIN);
  const asOfMs = dateFlag(args, 'as-of') ?? Date.now();
  const json = Boolean(args.json);

  if (cmd === 'pipeline') {
    const s = pipelineStats(root);
    const lines = [
      `Leads (pipeline/leads.jsonl): n=${s.leads.n}`,
      `  by status: ${kv(s.leads.by_status)}`,
      `Drafts (outputs/outreach): n=${s.drafts.draft_files} draft file(s), ${s.drafts.emails_drafted} email(s) written`,
      `Sends (ops/send-log.jsonl, outreach only): n=${s.sends.n}; by mode: ${kv(s.sends.by_mode)}; live contacts: ${s.sends.contacts_live}`,
      `Replies (ops/replies.jsonl, outputs/replies): n=${s.replies.n}; by kind: ${kv(s.replies.by_kind)}; by mode: ${kv(s.replies.by_mode)}`,
      `Jarvis queue (ops/queue.json): n=${s.jarvis_queue.n}; by status: ${kv(s.jarvis_queue.by_status)}`,
      'These are counts, not rates. For a rate use reply-rate, reviews or objections.',
    ];
    if (s.unreadable_lines) lines.push(`Warning: ${s.unreadable_lines} unreadable line(s) were skipped.`);
    return out(json, { command: 'pipeline', ...s }, lines.join('\n'));
  }

  if (cmd === 'reply-rate') {
    const { sends, replies, badLines } = loadAll(root);
    const r = replyRate({
      sends: sends.rows,
      replies,
      windowDays: intFlag(args, 'window', REPLY_WINDOW_DAYS),
      asOfMs,
      sinceMs: dateFlag(args, 'since'),
      min,
    });
    const lines = [
      `Reply rate, live outreach only (demo sends never count). As of ${r.as_of}${r.since ? `, sends since ${r.since}` : ''}.`,
      `Window: ${r.window_days} days from the first live send to each contact. Only closed windows count.`,
      `Live sends: ${r.live_sends} to ${r.contacts} contact(s). Closed: ${r.closed}. Still open: ${r.still_open}. Bounced, left out: ${r.bounced}.`,
      `Demo sends excluded: ${r.demo_sends_excluded}. Replies that came after the window, not counted: ${r.late_replies_not_counted}.`,
      showRate(r),
    ];
    if (r.enough) lines.push(`Replies by kind: ${kv(r.reply_kinds)}. A rate shows what happened, not why.`);
    if (badLines) lines.push(`Warning: ${badLines} unreadable log line(s) were skipped.`);
    return out(json, { command: 'reply-rate', ...r }, lines.join('\n'));
  }

  if (cmd === 'reviews') {
    const dir = join(root, 'outputs', 'reviews');
    const files = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.md')).map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') })) : [];
    const s = reviewStats(files, min);
    const lines = [
      `Reviews (outputs/reviews): ${s.review_files} review file(s) for ${s.tasks} task(s).`,
      `First-review pass rate: ${showRate(s.first_review_pass_rate)} (results counted per draft; split verdicts count each draft)`,
      `Average revisions per task: ${s.avg_revisions == null ? `${s.avg_revisions_message}` : `${s.avg_revisions.toFixed(2)} (${s.revisions_total} revisions over n=${s.tasks} tasks; revisions = reviews − 1)`}`,
    ];
    if (s.skipped_files.length) lines.push(`Not review files by name, skipped: ${s.skipped_files.join(', ')}`);
    for (const g of s.gaps) lines.push(`Gap: ${g}`);
    for (const w of s.warnings) lines.push(`Check: ${w}`);
    if (args.list) {
      lines.push('', 'task              reviews  revisions  first review      last review');
      for (const t of s.per_task) lines.push(`${t.task.padEnd(17)} ${String(t.reviews).padEnd(8)} ${String(t.revisions).padEnd(10)} ${t.first_review.padEnd(17)} ${t.last_review}`);
    }
    return out(json, { command: 'reviews', ...s }, lines.join('\n'));
  }

  if (cmd === 'objections') {
    const file = join(root, 'outputs', 'sales', 'objection-log.jsonl');
    const parsed = parseJsonl(readText(file));
    if (!parsed.rows.length) return out(json, { command: 'objections', available: false, message: 'no objection data yet', source: 'outputs/sales/objection-log.jsonl' }, 'no objection data yet (the sales agent writes outputs/sales/objection-log.jsonl; format in outputs/dev/T-20261103-08.md)');
    const s = objectionStats(parsed.rows, { windowDays: intFlag(args, 'window', OBJECTION_WINDOW_DAYS), asOfMs, min });
    const lines = [
      `Objection recovery rate (outputs/sales/objection-log.jsonl). As of ${s.as_of}.`,
      `Logged: ${s.logged}. Answer not sent yet: ${s.not_answered_yet}. Still inside the ${s.window_days}-day wait: ${s.pending}. Bounced, left out: ${s.bounced}. Reply not labelled yet, left out: ${s.unlabelled}.`,
      showRate(s),
      'The rate shows whether the talk went on, not whether they agreed.',
    ];
    for (const u of s.unknown_labels) lines.push(`Check: label not recognised, left out: ${u}`);
    if (parsed.bad) lines.push(`Warning: ${parsed.bad} unreadable line(s) were skipped.`);
    return out(json, { command: 'objections', available: true, ...s }, lines.join('\n'));
  }

  die('Usage: node scripts/stats.mjs pipeline | reply-rate [--since <date>] [--window <days>] | reviews [--list] | objections   (all take --min <n>, --json, --as-of <date>, --root <folder>)');
}

if (isMain(import.meta.url)) main();
