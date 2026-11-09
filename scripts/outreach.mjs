#!/usr/bin/env node
// Outreach in mission control: the leads each run found, asking the team to draft emails for them, and a
// person's approval of each finished draft. Nothing is drafted or sent unless a person asks:
//   1. A run that found leads shows them on the Outreach page ("This run found 3 leads"). Drafting them is a
//      new Jarvis task, started by the page's button, a voice command, or a command that said "and draft".
//   2. Drafts appear on the Outreach page once written, with their review. Only a PASS can be approved.
//   3. Approving sends at once. While the pilot is on (ops/mail-config.json), that is [TEST] copies to the pilot
//      test recipients only, through scripts/send-tests.mjs; the lead gets nothing. A person decides a whole draft
//      (the Outreach page) or one email at a time (the Emails page: a tick sends that email, a cross declines it, and
//      a declined email is never sent unless the person ticks it later). Approving a draft sends only its emails
//      still waiting for a decision.
// Every request and decision is logged in ops/outreach.jsonl with who made it.
//
//   node scripts/outreach.mjs [status]                      what is ready to draft and to decide, in plain words
//   node scripts/outreach.mjs draft new|<lead ...>          ask the team to draft emails (the newest run's leads, or named ones)
//   node scripts/outreach.mjs approve all|<lead[:n] ...>    approve emails that passed review, and send them
//   node scripts/outreach.mjs decline all|<lead[:n] ...>    decline emails, so they are not sent
//
// draft, approve and decline go through mission control (it has to be running), the same way the page does. A lead
// can be named by its ID (L-1ac84fe1) or by a word of its company name (puzari); `puzari:2` is its second email.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, isMain } from './_shared.mjs';
import { fillPlaceholders, parseEmail } from './send-email.mjs';
import { emailNumbers, reviewOf } from './send-tests.mjs';

const OUTREACH = 'outputs/outreach';
const LOG = 'ops/outreach.jsonl';
const RUN_DAYS = 14; // runs older than this drop off the page
const ACTIVE = new Set(['queued', 'running']);

const readJsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
const readJson = (f, fallback) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return fallback; } };
// Is a Jarvis run alive? Its lock file holds the process ID (a lock left by a run that died doesn't count).
function runAlive(root) {
  let pid = 0;
  try { pid = Number(readFileSync(join(root, 'ops', 'runs', 'jarvis.lock'), 'utf8').trim()); } catch { return false; }
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}
const mtime = (f) => { try { return statSync(f).mtimeMs; } catch { return 0; } };

// The newest record of every lead (pipeline/leads.jsonl keeps each change as a new line).
export function latestLeads(root = ROOT) {
  const leads = new Map();
  for (const l of readJsonl(join(root, 'pipeline', 'leads.jsonl'))) if (l.id) leads.set(l.id, l);
  return leads;
}

// The leads a finished task found. Jarvis records them on the task (leads_found) since 2026-11-07; for older
// tasks, the lead IDs its report names whose import came from an inbox file the report also names.
export function leadsOfTask(root, task, leads = latestLeads(root)) {
  if (Array.isArray(task.leads_found)) return task.leads_found.filter((id) => leads.has(id));
  const report = task.report && existsSync(join(root, task.report)) ? readFileSync(join(root, task.report), 'utf8') : '';
  if (!report) return [];
  const named = [...new Set(report.match(/\bL-[0-9a-f]{8}\b/g) || [])];
  return named.filter((id) => {
    const imported = (leads.get(id)?.history || []).find((h) => h.event === 'imported');
    const file = String(imported?.note || '').split('/').pop();
    return file && report.includes(file);
  });
}

const draftPath = (id) => `${OUTREACH}/${id}.md`;
// The first sentence of a reason, cut to fit a line.
const short = (s) => { const first = String(s || '').split(/(?<=[.:;])\s/)[0].replace(/[.:;]$/, ''); return first.length > 140 ? `${first.slice(0, 137)}…` : first; };

// One lead as the page shows it: can it be drafted now, and if not, why not.
function leadView(root, lead, requested, draft = null) {
  const hasDraft = !!draft && draft.state !== 'unreviewed';
  const state = requested ? 'drafting'
    : hasDraft ? 'drafted'
    : lead.hold ? 'held'
    : ['disqualified', 'lost', 'won'].includes(lead.status) ? 'closed'
    // 'drafted' here means an earlier draft nobody reviewed (a reviewed or active one is caught above)
    : lead.status === 'qualified' || lead.status === 'drafted' ? 'ready'
    : 'not-qualified';
  const why = {
    drafted: 'Emails drafted',
    drafting: requested?.stalled ? `Drafting in ${requested.task}, which was interrupted: it restarts with the next run` : `Drafting in ${requested?.task}`,
    held: `On hold: ${short(lead.hold?.reason)}`,
    closed: `Status ${lead.status}`,
    ready: draft ? 'Ready to draft (its old draft was never reviewed)' : 'Ready to draft',
    'not-qualified': `Status ${lead.status}: not qualified yet`,
  }[state];
  return { id: lead.id, company: lead.company, website: lead.website || '', status: lead.status, tier: lead.tier, score: lead.score, state, why, draft: hasDraft ? draftPath(lead.id) : null };
}

// Draft requests whose task is still waiting or running: lead ID -> { task, at, by, stalled }. Once the task ends,
// the draft itself (or its absence) says where the lead stands.
function openRequests(root, queue) {
  const byId = new Map(queue.map((t) => [t.id, t]));
  const open = new Map();
  for (const e of readJsonl(join(root, LOG))) {
    if (e.kind !== 'draft-request') continue;
    const t = byId.get(e.task);
    if (!t || !ACTIVE.has(t.status)) continue;
    // A task left 'running' with no run alive was interrupted: Jarvis puts it back in the queue on its next run.
    const stalled = t?.status === 'running' && !runAlive(root);
    for (const id of e.leads || []) open.set(id, { task: e.task, at: e.at, by: e.by, stalled });
  }
  return open;
}

// Approvals of drafts, newest last: draft path -> { at, by }.
function approvals(root) {
  const out = new Map();
  for (const e of readJsonl(join(root, LOG))) if (e.kind === 'approve') for (const d of e.drafts || []) out.set(d, { at: e.at, by: e.by });
  return out;
}

// One email of a draft, as `<draft path>#<n>`.
export const emailRef = (path, n) => `${path}#${n}`;

// A person's decisions on single emails, newest last: "path#n" -> { decision, at, by, note }.
function emailDecisions(root) {
  const out = new Map();
  for (const e of readJsonl(join(root, LOG))) {
    if (e.kind === 'email-decision') for (const ref of e.emails || []) out.set(ref, { decision: e.decision, at: e.at, by: e.by, note: e.note || '' });
  }
  return out;
}

// Every outreach draft for a lead, with its review, where it stands, and each of its emails (`mails`):
//   pending   passed review, waiting for a person's tick or cross
//   approved  ticked (or its draft approved): sent as test copies
//   declined  crossed: not sent
//   waiting   its draft hasn't passed review yet
export function draftsState(root = ROOT, leads = latestLeads(root), requested = openRequests(root, readJson(join(root, 'ops', 'queue.json'), []))) {
  const dir = join(root, OUTREACH);
  if (!existsSync(dir)) return [];
  const approved = approvals(root);
  const decided = emailDecisions(root);
  const sends = readJsonl(join(root, 'ops', 'send-log.jsonl')).filter((e) => e.kind === 'outreach' && e.mode === 'test');
  return readdirSync(dir)
    .filter((n) => /^L-[0-9a-f]+\.md$/.test(n) && !['disqualified', 'lost'].includes(leads.get(n.replace(/\.md$/, ''))?.status))
    .map((n) => {
      const path = `${OUTREACH}/${n}`;
      const id = n.replace(/\.md$/, '');
      const text = readFileSync(join(dir, n), 'utf8');
      const changed = mtime(join(dir, n));
      const review = root === ROOT ? reviewOf(path) : null; // reviewOf reads this folder's reviews
      const since = (d) => d && Date.parse(d.at) >= changed; // a decision on an older version doesn't count
      const ok = approved.get(path);
      const sent = sends.filter((e) => e.draft === path && Date.parse(e.at) >= changed).length;
      const reviewState = !review ? (requested.has(id) || Date.now() - changed < 86_400_000 ? 'in-review' : 'unreviewed')
        : review.verdict !== 'PASS' ? 'revise'
        : review.stale ? 'changed'
        : 'ready';
      // Each email: the newest decision on it since the draft last changed, the draft's own approval included.
      const mails = emailNumbers(text).map((n) => {
        const own = decided.get(emailRef(path, n));
        const pick = [since(ok) && { decision: 'approve', at: ok.at, by: ok.by }, since(own) && own].filter(Boolean).sort((a, b) => a.at.localeCompare(b.at)).pop();
        const state = pick ? (pick.decision === 'approve' ? 'approved' : 'declined') : reviewState === 'ready' ? 'pending' : 'waiting';
        return { n, state, by: pick?.by || '', at: pick?.at || '', note: pick?.note || '', sent: sends.filter((e) => e.draft === path && e.email === n && Date.parse(e.at) >= changed).length };
      });
      const count = (st) => mails.filter((m) => m.state === st).length;
      const allDecided = mails.length > 0 && !count('pending') && !count('waiting');
      const state = allDecided ? (count('approved') ? 'approved' : 'declined') : reviewState;
      const lastBy = mails.filter((m) => m.by).sort((a, b) => a.at.localeCompare(b.at)).pop()?.by || ok?.by || 'a person';
      const why = {
        approved: `${count('declined') ? `${count('approved')} approved, ${count('declined')} declined` : 'Approved'} by ${lastBy}${sent ? `; ${sent} test email(s) sent` : ''}`,
        declined: `Declined by ${lastBy}: not sent`,
        'in-review': 'Waiting for its review',
        unreviewed: 'Never reviewed: ask the team to draft this lead again',
        revise: `Review says ${review?.verdict || 'no verdict'}: being revised`,
        changed: 'Changed after its review: needs a re-review',
        ready: count('approved') + count('declined') ? `Passed review: ${count('pending')} of ${mails.length} emails still waiting for your decision` : 'Passed review: ready for your approval',
      }[state];
      const lead = leads.get(id);
      return { path, lead: id, company: lead?.company || id, emails: mails.length, mails, review: review ? { file: review.file, verdict: review.verdict, stale: review.stale, score: review.score ?? null } : null, state, why, at: new Date(changed).toISOString(), sent };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

// The emails of one draft as the reader would get them: subject and text, with the sender's details filled in.
export function draftEmails(root, path) {
  if (!/^outputs\/outreach\/L-[0-9a-f]+\.md$/.test(String(path)) || !existsSync(join(root, path))) return null;
  const text = readFileSync(join(root, path), 'utf8');
  const sender = readJson(join(root, 'ops', 'mail-config.json'), {}).sender || {};
  const emails = emailNumbers(text).map((n) => {
    const { subject, body } = parseEmail(text, n);
    let filled = body;
    try { filled = fillPlaceholders(body, sender); } catch { /* keep the placeholders */ }
    return { n, subject, body: filled.trim() };
  });
  return { path, emails };
}

// What the Outreach page shows: recent runs that found leads, and the drafts.
export function outreachState(root = ROOT) {
  const queue = readJson(join(root, 'ops', 'queue.json'), []);
  const archived = new Set(readJson(join(root, 'ops', 'archive', 'archived.json'), []).map((a) => a.id));
  const leads = latestLeads(root);
  const requested = openRequests(root, queue);
  const drafts = draftsState(root, leads, requested);
  const draftOf = new Map(drafts.map((d) => [d.lead, d]));
  const cutoff = Date.now() - RUN_DAYS * 86_400_000;
  const shown = new Set(); // a lead appears once, under the newest run that found it
  const runs = queue
    .filter((t) => !ACTIVE.has(t.status) && !archived.has(t.id) && Date.parse(String(t.finished || '').replace(' ', 'T')) >= cutoff)
    .reverse()
    .map((t) => {
      const found = leadsOfTask(root, t, leads).filter((id) => !shown.has(id) && shown.add(id)).map((id) => leadView(root, leads.get(id), requested.get(id), draftOf.get(id)));
      return { task: t.id, title: t.task, finished: t.finished, leads: found, ready: found.filter((l) => l.state === 'ready').map((l) => l.id) };
    })
    .filter((r) => r.leads.length);
  return { runs, drafts, ready: drafts.filter((d) => d.state === 'ready').length, emails: emailsOf(root, drafts), pending: drafts.reduce((n, d) => n + d.mails.filter((m) => m.state === 'pending').length, 0) };
}

// Every drafted email, newest draft first, as the Emails page lists them: who it is for, which of the draft's
// emails it is, its subject and text as the reader gets them, and where it stands.
function emailsOf(root, drafts) {
  const sender = readJson(join(root, 'ops', 'mail-config.json'), {}).sender || {};
  return drafts.flatMap((d) => {
    const text = readFileSync(join(root, d.path), 'utf8');
    return d.mails.map((m) => {
      const { subject, body } = parseEmail(text, m.n);
      let filled = body;
      try { filled = fillPlaceholders(body, sender); } catch { /* keep the placeholders */ }
      const why = {
        pending: 'Passed review: tick to send, cross to stop it',
        approved: `Approved by ${m.by || 'a person'}${m.sent ? `; ${m.sent} test cop${m.sent === 1 ? 'y' : 'ies'} sent` : ''}`,
        declined: `Declined by ${m.by || 'a person'}${m.note ? `: ${m.note}` : ''}. Not sent`,
        waiting: d.why,
      }[m.state];
      return { ref: emailRef(d.path, m.n), draft: d.path, lead: d.lead, company: d.company, n: m.n, of: d.mails.length, subject, body: String(filled).trim(), state: m.state, why, sent: m.sent, review: d.review, at: m.at || d.at };
    });
  });
}

// Turns what a person named into lead IDs: IDs, draft paths, or a word of a company name.
export function resolveLeads(names, leads) {
  const out = [];
  const unknown = [];
  for (const raw of names) {
    const name = String(raw).trim();
    if (!name) continue;
    const id = /L-[0-9a-f]{8}/.exec(name)?.[0];
    if (id && leads.has(id)) { out.push(id); continue; }
    const word = name.toLowerCase();
    const squash = (x) => x.replace(/[^a-z0-9]/g, ''); // "puzari cloud", as a voice hears it, finds PuzariCloud
    let hits = [...leads.values()].filter((l) => String(l.company || '').toLowerCase().includes(word));
    if (!hits.length && squash(word).length > 2) hits = [...leads.values()].filter((l) => squash(String(l.company || '').toLowerCase()).includes(squash(word)));
    if (hits.length === 1) out.push(hits[0].id);
    else unknown.push(hits.length ? `${name} (matches ${hits.length} leads)` : name);
  }
  return { ids: [...new Set(out)], unknown };
}

// Which of these leads can be drafted now, and the task text that asks the team to draft them.
// `which` is 'new' (the newest run with leads ready to draft) or a list of names.
export function planDrafts(root, which, by = 'a person') {
  const state = outreachState(root);
  const leads = latestLeads(root);
  let ids;
  let run = null;
  if (which === 'new' || (Array.isArray(which) && !which.length)) {
    run = state.runs.find((r) => r.ready.length);
    if (!run) return { error: 'No run has leads waiting to be drafted.' };
    ids = run.ready;
  } else {
    const r = resolveLeads(Array.isArray(which) ? which : [which], leads);
    if (r.unknown.length) return { error: `I couldn't find these leads: ${r.unknown.join(', ')}.` };
    ids = r.ids;
  }
  const requested = openRequests(root, readJson(join(root, 'ops', 'queue.json'), []));
  const draftOf = new Map(draftsState(root, leads, requested).map((d) => [d.lead, d]));
  const views = ids.map((id) => leadView(root, leads.get(id), requested.get(id), draftOf.get(id)));
  const ready = views.filter((v) => v.state === 'ready');
  const skipped = views.filter((v) => v.state !== 'ready').map((v) => `${v.company}: ${v.why}`);
  if (!ready.length) return { error: `Nothing to draft. ${skipped.join('; ')}.` };
  const products = [...new Set(ready.map((v) => leads.get(v.id)?.product).filter(Boolean))];
  const list = ready.map((v) => `${v.company} (${v.id})${draftOf.get(v.id) ? `, whose earlier draft ${draftPath(v.id)} was never reviewed: finish or redo it` : ''}`).join(', ');
  const task = [
    `Draft outreach email sequences for these ${products.join(' and ') || ''} leads: ${list}${run ? `, found in ${run.task}` : ''}.`,
    `${by} confirmed drafting for them in mission control on ${new Date().toISOString().slice(0, 10)}: that is the human's say-so to draft these leads even where the gate is Conditional (never for a lead on hold, disqualified or suppressed).`,
    'Get every draft reviewed. Don\'t send anything and don\'t suggest a test send: the person approves each passed draft on the Outreach page, and that sends it.',
  ].join(' ');
  return { ids: ready.map((v) => v.id), task, skipped, run: run?.task || null };
}

export function logRequest(root, ids, task, by) {
  appendFileSync(join(root, LOG), `${JSON.stringify({ at: new Date().toISOString(), kind: 'draft-request', leads: ids, task, by })}\n`);
}

// Which drafts can be approved: 'all' (every draft ready for approval) or names of leads or drafts.
export function planApproval(root, which) {
  const leads = latestLeads(root);
  const drafts = draftsState(root, leads);
  let chosen;
  if (which === 'all' || (Array.isArray(which) && which.length === 1 && /^all$/i.test(which[0]))) {
    chosen = drafts.filter((d) => d.state === 'ready');
    if (!chosen.length) return { error: 'No draft is waiting for approval.' };
  } else {
    const r = resolveLeads(Array.isArray(which) ? which : [which], leads);
    if (r.unknown.length) return { error: `I couldn't find these leads: ${r.unknown.join(', ')}.` };
    chosen = r.ids.map((id) => drafts.find((d) => d.lead === id) || { lead: id, company: leads.get(id)?.company || id, state: 'none', why: 'no draft yet' });
  }
  const blocked = chosen.filter((d) => d.state !== 'ready');
  if (blocked.length) return { error: `Can't approve yet: ${blocked.map((d) => `${d.company}: ${d.why}`).join('; ')}.` };
  return { drafts: chosen.map((d) => d.path), companies: chosen.map((d) => d.company) };
}

// Approves whole drafts: every email of theirs still waiting for a decision is approved and sent; an email the
// person declined stays declined.
export function approveAndSend(root, drafts, by = 'a person') {
  const refs = draftsState(root).filter((d) => drafts.includes(d.path)).flatMap((d) => d.mails.filter((m) => m.state === 'pending').map((m) => emailRef(d.path, m.n)));
  return decideEmails(root, refs, 'approve', by);
}

// Which emails a person's tick (approve) or cross (decline) is for. `which` is 'all' (every email waiting for a
// decision) or a list of: { draft, n } from the page, `<draft path>#<n>`, or a lead's name with an optional email
// number (`puzari`, `puzari:2`, `L-1ac84fe1#2`). A lead named without a number means all its waiting emails.
// Approve takes an email that is waiting or was declined; decline takes only one that is waiting (an approved
// email has been sent). Returns { refs, labels } or { error }.
export function planEmails(root, which, decision) {
  if (!['approve', 'decline'].includes(decision)) return { error: 'Say approve or decline.' };
  const leads = latestLeads(root);
  const drafts = draftsState(root, leads);
  const label = (d, n) => `email ${n} for ${d.company}`;
  if (which === 'all' || (Array.isArray(which) && which.length === 1 && /^all$/i.test(String(which[0])))) {
    const all = drafts.flatMap((d) => d.mails.filter((m) => m.state === 'pending').map((m) => ({ d, n: m.n })));
    if (!all.length) return { error: 'No email is waiting for your decision.' };
    return { refs: all.map(({ d, n }) => emailRef(d.path, n)), labels: all.map(({ d, n }) => label(d, n)) };
  }
  const chosen = [];
  const problems = [];
  for (const item of [].concat(which)) {
    const raw = typeof item === 'object' && item ? `${item.draft}#${item.n}` : String(item).trim();
    const m = /^(.*?)(?:\s*[#:]\s*(\d+))?$/.exec(raw);
    const name = m[1].trim();
    const n = m[2] ? Number(m[2]) : null;
    let draft = drafts.find((d) => d.path === name);
    if (!draft) {
      const r = resolveLeads([name], leads);
      if (r.unknown.length) { problems.push(`I couldn't find ${r.unknown.join(', ')}`); continue; }
      draft = drafts.find((d) => d.lead === r.ids[0]);
      if (!draft) { problems.push(`${leads.get(r.ids[0])?.company || name} has no drafted emails yet`); continue; }
    }
    const mails = draft.mails.filter((x) => (n === null ? x.state === 'pending' : x.n === n));
    if (n !== null && !mails.length) { problems.push(`${draft.company} has no email ${n}`); continue; }
    if (n === null && !mails.length) { problems.push(`${draft.company} has no email waiting for your decision`); continue; }
    for (const x of mails) {
      // An approved email whose test copies all failed to go may be approved again, to try once more.
      const ok = decision === 'approve' ? ['pending', 'declined'].includes(x.state) || (x.state === 'approved' && !x.sent) : x.state === 'pending';
      if (ok) chosen.push({ d: draft, n: x.n });
      else problems.push(`${label(draft, x.n)} ${x.state === 'approved' ? 'is already approved and sent' : x.state === 'declined' ? 'is already declined' : `can't be decided yet (${draft.why.toLowerCase()})`}`);
    }
  }
  if (problems.length) return { error: `${problems.join('; ')}.`.replace(/^./, (c) => c.toUpperCase()) };
  const seen = new Set();
  const unique = chosen.filter(({ d, n }) => !seen.has(emailRef(d.path, n)) && seen.add(emailRef(d.path, n)));
  return { refs: unique.map(({ d, n }) => emailRef(d.path, n)), labels: unique.map(({ d, n }) => label(d, n)) };
}

// Logs a person's decision on single emails. Approved ones are sent at once (pilot: [TEST] copies only, by
// send-tests.mjs); declined ones are only logged. Resolves to { ok, sent, text }. It runs in the background of the
// server, so the page stays live while emails go out.
export function decideEmails(root, refs, decision, by = 'a person', note = '') {
  if (!refs.length) return Promise.resolve({ ok: true, sent: 0, text: '' });
  appendFileSync(join(root, LOG), `${JSON.stringify({ at: new Date().toISOString(), kind: 'email-decision', decision, emails: refs, by, ...(note ? { note: String(note).slice(0, 200) } : {}) })}\n`);
  if (decision !== 'approve') return Promise.resolve({ ok: true, sent: 0, text: '' });
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, 'scripts', 'send-tests.mjs'), ...refs], { cwd: root });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('error', (e) => resolve({ ok: false, sent: 0, text: e.message }));
    child.on('close', (code) => resolve({ ok: code === 0, sent: Number(/: (\d+) sent,/.exec(out)?.[1] || 0), text: out.trim() }));
  });
}

// ---------- command line (the Mac voice agent uses it) ----------

function statusText(s) {
  const lines = [];
  const run = s.runs[0];
  if (!run) lines.push('No recent run found new leads.');
  for (const r of s.runs.slice(0, 3)) {
    lines.push(`${r.task} found ${r.leads.length} lead${r.leads.length === 1 ? '' : 's'}:`);
    for (const l of r.leads) lines.push(`  - ${l.company}: ${l.why}`);
  }
  const ready = s.drafts.filter((d) => d.state === 'ready');
  lines.push(ready.length ? `${ready.length} draft(s) waiting for approval: ${ready.map((d) => d.company).join(', ')}.` : 'No draft is waiting for approval.');
  const pending = s.emails.filter((e) => e.state === 'pending');
  if (pending.length) {
    lines.push(`${pending.length} email(s) waiting for your tick or cross:`);
    for (const e of pending) lines.push(`  - ${e.company} email ${e.n} of ${e.of}: "${e.subject}"`);
  }
  const other = s.drafts.filter((d) => ['in-review', 'revise', 'changed', 'unreviewed'].includes(d.state));
  if (other.length) lines.push(`Still in progress: ${other.map((d) => `${d.company} (${d.why.toLowerCase()})`).join('; ')}.`);
  return lines.join('\n');
}

async function post(path, body, { port = Number(process.env.CONTROL_PORT) || 4318 } = {}) {
  const origin = `http://127.0.0.1:${port}`;
  try {
    const res = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Team-Page': '1' }, body: JSON.stringify(body), signal: AbortSignal.timeout(300_000) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) return { ok: false, message: 'Mission control wants a sign-in. Do this from the browser.' };
    return { ok: res.ok, message: data.message || `Mission control answered ${res.status}.` };
  } catch {
    return { ok: false, message: `Mission control is not running at ${origin}. Start it with npm start in the team folder, then try again.` };
  }
}

async function main() {
  const [cmd = 'status', ...rest] = process.argv.slice(2);
  if (cmd === 'status') return console.log(statusText(outreachState()));
  if (cmd === 'draft') {
    const r = await post('/api/outreach/draft', { leads: !rest.length || /^new$/i.test(rest[0]) ? 'new' : rest, by: 'voice' });
    console.log(r.message);
    process.exitCode = r.ok ? 0 : 1;
    return undefined;
  }
  if (cmd === 'approve' || cmd === 'decline') {
    if (!rest.length) return console.error(`Say which: node scripts/outreach.mjs ${cmd} all|<lead[:email number] ...>`);
    const r = await post('/api/outreach/decide', { emails: /^all$/i.test(rest[0]) ? 'all' : rest, decision: cmd, by: 'voice' });
    console.log(r.message);
    process.exitCode = r.ok ? 0 : 1;
    return undefined;
  }
  console.error('usage: node scripts/outreach.mjs [status] | draft new|<lead ...> | approve all|<lead[:n] ...> | decline all|<lead[:n] ...>');
  process.exitCode = 1;
  return undefined;
}

if (isMain(import.meta.url)) await main();
