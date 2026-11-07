#!/usr/bin/env node
// Outreach in mission control: the leads each run found, asking the team to draft emails for them, and a
// person's approval of each finished draft. Nothing is drafted or sent unless a person asks:
//   1. A run that found leads shows them on the Outreach page ("This run found 3 leads"). Drafting them is a
//      new Jarvis task, started by the page's button, a voice command, or a command that said "and draft".
//   2. Drafts appear on the Outreach page once written, with their review. Only a PASS can be approved.
//   3. Approving a draft sends it at once. While the pilot is on (ops/mail-config.json), that is [TEST]
//      copies to the pilot test recipients only, through scripts/send-tests.mjs; the lead gets nothing.
// Every request and approval is logged in ops/outreach.jsonl with who made it.
//
//   node scripts/outreach.mjs [status]               what is ready to draft and to approve, in plain words
//   node scripts/outreach.mjs draft new|<lead ...>   ask the team to draft emails (the newest run's leads, or named ones)
//   node scripts/outreach.mjs approve all|<lead ...> approve drafts that passed review, and send them
//
// draft and approve go through mission control (it has to be running), the same way the page does. A lead can
// be named by its ID (L-1ac84fe1) or by a word of its company name (puzari).
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

// Every outreach draft for a lead, with its review and where it stands.
export function draftsState(root = ROOT, leads = latestLeads(root), requested = openRequests(root, readJson(join(root, 'ops', 'queue.json'), []))) {
  const dir = join(root, OUTREACH);
  if (!existsSync(dir)) return [];
  const approved = approvals(root);
  const sends = readJsonl(join(root, 'ops', 'send-log.jsonl')).filter((e) => e.kind === 'outreach' && e.mode === 'test');
  return readdirSync(dir)
    .filter((n) => /^L-[0-9a-f]+\.md$/.test(n) && !['disqualified', 'lost'].includes(leads.get(n.replace(/\.md$/, ''))?.status))
    .map((n) => {
      const path = `${OUTREACH}/${n}`;
      const id = n.replace(/\.md$/, '');
      const text = readFileSync(join(dir, n), 'utf8');
      const changed = mtime(join(dir, n));
      const review = root === ROOT ? reviewOf(path) : null; // reviewOf reads this folder's reviews
      const ok = approved.get(path);
      const approvedNow = ok && Date.parse(ok.at) >= changed;
      const sent = sends.filter((e) => e.draft === path && Date.parse(e.at) >= changed).length;
      const state = approvedNow ? 'approved'
        : !review ? (requested.has(id) || Date.now() - changed < 86_400_000 ? 'in-review' : 'unreviewed')
        : review.verdict !== 'PASS' ? 'revise'
        : review.stale ? 'changed'
        : 'ready';
      const why = {
        approved: `Approved by ${ok?.by || 'a person'}${sent ? `; ${sent} test email(s) sent` : ''}`,
        'in-review': 'Waiting for its review',
        unreviewed: 'Never reviewed: ask the team to draft this lead again',
        revise: `Review says ${review?.verdict || 'no verdict'}: being revised`,
        changed: 'Changed after its review: needs a re-review',
        ready: 'Passed review: ready for your approval',
      }[state];
      const lead = leads.get(id);
      return { path, lead: id, company: lead?.company || id, emails: emailNumbers(text).length, review: review ? { file: review.file, verdict: review.verdict, stale: review.stale } : null, state, why, at: new Date(changed).toISOString(), sent };
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
  return { runs, drafts, ready: drafts.filter((d) => d.state === 'ready').length };
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
    const hits = [...leads.values()].filter((l) => String(l.company || '').toLowerCase().includes(word));
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

// Logs the approval and sends the drafts (pilot: [TEST] copies only, by send-tests.mjs). Resolves to
// { ok, sent, text }. It runs in the background of the server, so the page stays live while emails go out.
export function approveAndSend(root, drafts, by = 'a person') {
  appendFileSync(join(root, LOG), `${JSON.stringify({ at: new Date().toISOString(), kind: 'approve', drafts, by })}\n`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, 'scripts', 'send-tests.mjs'), ...drafts], { cwd: root });
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
  if (cmd === 'approve') {
    if (!rest.length) return console.error('Say which: node scripts/outreach.mjs approve all|<lead ...>');
    const r = await post('/api/outreach/approve', { drafts: /^all$/i.test(rest[0]) ? 'all' : rest, by: 'voice' });
    console.log(r.message);
    process.exitCode = r.ok ? 0 : 1;
    return undefined;
  }
  console.error('usage: node scripts/outreach.mjs [status] | draft new|<lead ...> | approve all|<lead ...>');
  process.exitCode = 1;
  return undefined;
}

if (isMain(import.meta.url)) await main();
