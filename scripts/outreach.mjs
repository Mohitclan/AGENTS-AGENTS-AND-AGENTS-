#!/usr/bin/env node
// Outreach in mission control: the leads each run found, asking the team to draft emails for them, and a
// person's approval of each finished draft. Every lead task drafts the outreach for the leads that qualify by itself
// (the founder's decision of 2026-11-10); nothing is sent unless a person approves it:
//   1. A run that found leads shows them on the Outreach page ("This run found 3 leads"). The run drafts the ones that
//      qualify; a lead left without a draft is drafted again by a new Jarvis task, started by the page's button or a
//      voice command.
//   2. Drafts appear on the Outreach page once written, with their review. Only a PASS can be approved.
//   3. Approving sends at once. While the pilot is on (ops/mail-config.json), that is [TEST] copies to the pilot
//      test recipients only, through scripts/send-tests.mjs; the lead gets nothing. A person decides a whole draft
//      (the Outreach page) or one email at a time (the Emails page: a tick sends that email, a cross declines it, and
//      a declined email is never sent unless the person ticks it later). Approving a draft sends only its emails
//      still waiting for a decision.
//   4. With the pilot off (the Emails page's "End the pilot", see golive.mjs), a tick sends the email to the lead
//      for real, through send-email.mjs, under an approval row this module writes in ops/approvals.md (who, date,
//      recipient, draft and email number; "Yes, approved on the Emails page"). Email 1 goes at once. Email 2 or 3
//      ticked before its day is scheduled: it goes on its working day, counted from the day Email 1 went out live
//      (scripts/followups.mjs does the sending). A lead whose contact is not an email address is refused: a person
//      sends it by hand. A tick made during the pilot never becomes a live send later: after the pilot ends, such
//      an email is waiting for a decision again.
//   5. Drafts of answers to replies (outputs/outreach/replies/<lead>-<k>.md, written for a reply recorded by
//      scripts/replies.mjs) are listed and ticked like any other email. An answer goes to the person who replied.
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
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, isMain } from './_shared.mjs';
import { pilotStatus } from './golive.mjs';
import { opensOfSend, savedOpens } from './opens.mjs';
import { recordedReplies } from './replies.mjs';
import { fillPlaceholders, parseEmail } from './send-email.mjs';
import { emailNumbers, reviewOf } from './send-tests.mjs';

const OUTREACH = 'outputs/outreach';
const ANSWERS = `${OUTREACH}/replies`; // drafted answers to replies: L-<id>-<k>.md
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
const splitRef = (ref) => { const [path, n] = String(ref).split('#'); return [path, Number(n)]; };

// A person's decisions on single emails, newest last: "path#n" -> { decision, at, by, note, live, approval }.
// `live` is true when the pilot was off at the time (an approve then was a real send or a scheduled one) and
// `approval` is the row it wrote in ops/approvals.md. A decision logged before this existed has neither: it was
// made during the pilot.
function emailDecisions(root) {
  const out = new Map();
  for (const e of readJsonl(join(root, LOG))) {
    if (e.kind === 'email-decision') for (const ref of e.emails || []) out.set(ref, { decision: e.decision, at: e.at, by: e.by, note: e.note || '', live: e.live === true, approval: e.approvals?.[ref] || '' });
  }
  return out;
}

// ---------- follow-up timing ----------

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The team works in India: a "day" is a calendar day in IST, so a send at 11pm UTC counts for the next day.
export const istDay = (ms) => new Date(ms + 19_800_000).toISOString().slice(0, 10);
// "2026-11-16" as people say it: "Mon 16 Nov".
export function formatDay(day) {
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? String(day) : `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
// The day that is n working days after `day` (YYYY-MM-DD). Saturdays and Sundays are skipped.
export function addWorkingDays(day, n) {
  let t = Date.parse(`${day}T00:00:00Z`);
  for (let left = n; left > 0;) {
    t += 86_400_000;
    const weekday = new Date(t).getUTCDay();
    if (weekday !== 0 && weekday !== 6) left--;
  }
  return new Date(t).toISOString().slice(0, 10);
}
// The "Send schedule" table of a draft: email number -> working day after Email 1 (Email 1 is day 0).
export function scheduleOf(text) {
  const out = new Map([[1, 0]]);
  for (const m of String(text).matchAll(/^\|\s*Email (\d+)\s*\|\s*(\d+)\s*\|/gm)) out.set(Number(m[1]), Number(m[2]));
  return out;
}

// What the follow-up sender recorded about an email (scripts/followups.mjs): the newest skip and the newest
// failed attempt, by `<draft>#<n>`.
export function followupNotes(root) {
  const skip = new Map();
  const error = new Map();
  for (const e of readJsonl(join(root, LOG))) {
    if (e.kind === 'followup-skip') skip.set(e.ref, { at: e.at, reason: e.reason || 'skipped' });
    else if (e.kind === 'followup-error') error.set(e.ref, { at: e.at, reason: e.reason || 'failed' });
  }
  return { skip, error };
}

// ---------- the drafts ----------

const ANSWER_FILE = /^L-([0-9a-f]+)-(\d+)\.md$/;
export const isAnswerPath = (path) => String(path).startsWith(`${ANSWERS}/`) && ANSWER_FILE.test(String(path).slice(ANSWERS.length + 1));

// Every outreach draft for a lead (and every drafted answer to a reply), with its review, where it stands, and each
// of its emails (`mails`):
//   pending    passed review, waiting for a person's tick or cross
//   approved   ticked (or its draft approved): during the pilot a [TEST] copy was sent; live, it went to the lead
//   scheduled  ticked for a real send, but not due yet: a follow-up goes on its working day after Email 1
//   skipped    ticked, but its day came and it was not sent (the person replied, was opted out, ...): `skip` says why
//   declined   crossed: not sent
//   waiting    its draft hasn't passed review yet
// A tick made during the pilot counts only while the pilot is on: once it ends, that email is pending again.
// `now` is for tests: the day follow-ups are judged against.
export function draftsState(root = ROOT, leads = latestLeads(root), requested = openRequests(root, readJson(join(root, 'ops', 'queue.json'), [])), now = new Date()) {
  const dir = join(root, OUTREACH);
  if (!existsSync(dir)) return [];
  const approved = approvals(root);
  const decided = emailDecisions(root);
  const { skip } = followupNotes(root);
  const sendLog = readJsonl(join(root, 'ops', 'send-log.jsonl')).filter((e) => e.kind === 'outreach');
  const tests = sendLog.filter((e) => e.mode === 'test');
  const lives = sendLog.filter((e) => e.mode === 'live');
  const { opens: opened } = savedOpens(root); // open tracking (scripts/opens.mjs), when it is on
  const pilot = pilotStatus(root);
  const today = istDay(+new Date(now));
  const files = [
    ...readdirSync(dir).filter((n) => /^L-[0-9a-f]+\.md$/.test(n)).map((n) => ({ path: `${OUTREACH}/${n}`, id: n.replace(/\.md$/, ''), k: 0 })),
    ...(existsSync(join(root, ANSWERS)) ? readdirSync(join(root, ANSWERS)).filter((n) => ANSWER_FILE.test(n)).map((n) => { const m = ANSWER_FILE.exec(n); return { path: `${ANSWERS}/${n}`, id: `L-${m[1]}`, k: Number(m[2]) }; }) : []),
  ].filter((f) => !['disqualified', 'lost'].includes(leads.get(f.id)?.status));
  const replies = files.some((f) => f.k) ? recordedReplies(root) : [];
  return files
    .map(({ path, id, k }) => {
      const text = readFileSync(join(root, path), 'utf8');
      const changed = mtime(join(root, path));
      const review = root === ROOT ? reviewOf(path) : null; // reviewOf reads this folder's reviews
      const since = (d) => d && Date.parse(d.at) >= changed; // a decision on an older version doesn't count
      const ok = approved.get(path);
      const sent = tests.filter((e) => e.draft === path && Date.parse(e.at) >= changed).length;
      const liveSent = lives.filter((e) => e.draft === path).length;
      // A lead on hold waits for a person before anything goes out, so its emails aren't offered for a tick (on
      // 2026-11-10 the page offered Komplai's draft while the run had put the lead on hold).
      const held = leads.get(id)?.hold;
      const reviewState = held ? 'held' : !review ? (requested.has(id) || Date.now() - changed < 86_400_000 ? 'in-review' : 'unreviewed')
        : review.verdict !== 'PASS' ? 'revise'
        : review.stale ? 'changed'
        : 'ready';
      const reply = k ? replies.find((r) => r.lead === id && r.k === k) : null;
      const offsets = k ? new Map([[1, 0]]) : scheduleOf(text);
      const first = lives.filter((e) => e.draft === path && e.email === 1).map((e) => Date.parse(e.at)).sort((a, b) => a - b)[0];
      const anchor = first ? istDay(first) : null; // the day Email 1 went out live
      // Each email: the newest decision on it since the draft last changed, the draft's own approval included.
      // A real send is a fact of the world, so it shows whatever has happened to the draft since.
      const mails = emailNumbers(text).map((n) => {
        const own = decided.get(emailRef(path, n));
        let pick = [since(ok) && { decision: 'approve', at: ok.at, by: ok.by }, since(own) && own].filter(Boolean).sort((a, b) => a.at.localeCompare(b.at)).pop();
        if (pick?.decision === 'approve' && !pick.live && !pilot.on) pick = null; // ticked in the pilot: test copies only
        const went = lives.filter((e) => e.draft === path && e.email === n);
        const tracked = sendLog.filter((e) => e.draft === path && e.email === n && e.track);
        const seen = tracked.map((e) => opensOfSend(e, opened)).filter(Boolean);
        const state = went.length ? 'approved' : pick ? (pick.decision === 'approve' ? 'approved' : 'declined') : reviewState === 'ready' ? 'pending' : 'waiting';
        return {
          n, state, by: pick?.by || (went.length ? 'a person' : ''), at: pick?.at || went.at(-1)?.at || '', note: pick?.note || '', approval: pick?.approval || '', live: !!pick?.live,
          sent: tests.filter((e) => e.draft === path && e.email === n && Date.parse(e.at) >= changed).length,
          liveSent: went.length, liveAt: went.at(-1)?.at || '', liveTo: went.at(-1)?.to || '',
          offset: offsets.has(n) ? offsets.get(n) : null, due: null, dueText: '', after: 0, skip: '', retry: false,
          tracked: tracked.length, opens: seen.reduce((t, o) => t + o.count, 0), openedAt: seen.map((o) => o.last).sort().pop() || '', openAuto: seen.reduce((t, o) => t + o.auto, 0),
        };
      });
      // A real approval whose day came but which was not sent: the follow-up sender recorded why.
      for (const m of mails) {
        const s = skip.get(emailRef(path, m.n));
        if (m.state === 'approved' && m.live && !m.liveSent && s && s.at >= m.at) Object.assign(m, { state: 'skipped', skip: s.reason });
      }
      for (const m of mails) {
        const settled = (x) => x.liveSent || ['declined', 'skipped'].includes(x.state);
        m.after = mails.find((x) => x.n < m.n && !settled(x))?.n || 0; // the earlier email still to be sent or decided
        if (!k && m.n > 1 && anchor && m.offset !== null) {
          m.due = addWorkingDays(anchor, m.offset);
          m.dueText = formatDay(m.due);
        }
        // Approved for a real send, not sent yet, and not its turn: scheduled.
        if (m.state === 'approved' && m.live && !m.liveSent && !k && m.n > 1 && (!m.due || m.due > today || m.after)) m.state = 'scheduled';
        m.retry = m.state === 'approved' && (pilot.on ? !m.sent && !m.liveSent : !m.liveSent);
      }
      const count = (st) => mails.filter((m) => m.state === st).length;
      const decidedYes = count('approved') + count('scheduled') + count('skipped');
      const allDecided = mails.length > 0 && !count('pending') && !count('waiting');
      const state = allDecided ? (decidedYes ? 'approved' : 'declined') : reviewState;
      const lastBy = mails.filter((m) => m.by).sort((a, b) => a.at.localeCompare(b.at)).pop()?.by || ok?.by || 'a person';
      const why = {
        approved: `${count('declined') ? `${decidedYes} approved, ${count('declined')} declined` : 'Approved'} by ${lastBy}${sent ? `; ${sent} test email(s) sent` : ''}${liveSent ? `; ${liveSent} sent to the lead` : ''}${count('scheduled') ? `; ${count('scheduled')} scheduled` : ''}`,
        declined: `Declined by ${lastBy}: not sent`,
        held: `Lead on hold: ${held?.reason || 'waiting for a person'}. Release the hold on the Leads page before approving`,
        'in-review': 'Waiting for its review',
        unreviewed: 'Never reviewed: ask the team to draft this lead again',
        revise: `Review says ${review?.verdict || 'no verdict'}: being revised`,
        changed: 'Changed after its review: needs a re-review',
        ready: count('approved') + count('declined') ? `Passed review: ${count('pending')} of ${mails.length} emails still waiting for your decision` : 'Passed review: ready for your approval',
      }[state];
      const lead = leads.get(id);
      return {
        path, lead: id, company: lead?.company || id, kind: k ? 'answer' : 'sequence', reply: reply ? { id: reply.id, from: reply.from, fromName: reply.fromName, label: reply.label, received: reply.received, k } : null,
        emails: mails.length, mails, review: review ? { file: review.file, verdict: review.verdict, stale: review.stale, score: review.score ?? null } : null, state, why, at: new Date(changed).toISOString(), sent, liveSent,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

// The emails of one draft as the reader would get them: subject and text, with the sender's details filled in.
export function draftEmails(root, path) {
  if (!/^outputs\/outreach\/(replies\/)?L-[0-9a-f]+(-\d+)?\.md$/.test(String(path)) || !existsSync(join(root, path))) return null;
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

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

// Where a real send of this draft's emails would go: { to, name }, or { refuse } with why a person must send it by
// hand. An answer goes to the person who replied; a sequence goes to the lead's published contact, which has to be
// an email address.
export function recipientOf(lead, draft) {
  const company = draft.company || lead?.company || draft.lead;
  if (draft.kind === 'answer') {
    const from = String(draft.reply?.from || '').trim();
    return EMAIL.test(from) ? { to: from.toLowerCase(), name: draft.reply.fromName || '' } : { refuse: `${company}: the reply this answers could not be found, so there is no address to send to` };
  }
  const c = lead?.contact;
  const value = String(c?.value || '').replace(/^mailto:/i, '').trim();
  if (c?.channel === 'email' && EMAIL.test(value)) return { to: value.toLowerCase(), name: c.name || '' };
  const how = { form: 'a contact form', linkedin: 'a LinkedIn profile', phone: 'a phone number' }[c?.channel] || 'not an email address';
  return { refuse: `${company} has no published email address (${!c ? 'no contact is recorded' : c.channel === 'email' ? `its email address "${value}" does not look right` : `its contact is ${how}`}): send it by hand` };
}

// What the Outreach and Emails pages show: recent runs that found leads, the drafts, every drafted email, the
// replies, and whether the pilot is on.
export function outreachState(root = ROOT, now = new Date()) {
  const queue = readJson(join(root, 'ops', 'queue.json'), []);
  const archived = new Set(readJson(join(root, 'ops', 'archive', 'archived.json'), []).map((a) => a.id));
  const leads = latestLeads(root);
  const requested = openRequests(root, queue);
  const all = draftsState(root, leads, requested, now);
  const drafts = all.filter((d) => d.kind === 'sequence'); // answers to replies show on the Emails page only
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
  const pilot = pilotStatus(root);
  return {
    runs, drafts, ready: drafts.filter((d) => d.state === 'ready').length, emails: emailsOf(root, all, leads, pilot),
    pending: all.reduce((n, d) => n + d.mails.filter((m) => m.state === 'pending').length, 0),
    pilot: { on: pilot.on, canRestore: !!pilot.paused, pausedAt: pilot.paused?.at || null, pausedBy: pilot.paused?.by || '' },
    replies: repliesState(root, all, queue, leads),
    tracking: trackingState(root),
  };
}

// Open tracking for the Emails page: whether it is on (ops/mail-config.json), when the opens were last fetched, and
// how many tracked emails have been opened.
function trackingState(root) {
  const t = readJson(join(root, 'ops', 'mail-config.json'), {}).tracking || {};
  const { fetched_at: fetchedAt, opens } = savedOpens(root);
  const sends = readJsonl(join(root, 'ops', 'send-log.jsonl')).filter((e) => e.kind === 'outreach' && e.track);
  return { on: !!(t.enabled && t.base_url), fetchedAt, tracked: sends.length, opened: sends.filter((e) => opensOfSend(e, opens)).length };
}

// The replies for the Emails page's Replies tab, newest first (the 30 newest): each with who wrote it, its label,
// its saved text, and where a drafted answer stands: `draft` (the file, once written), `drafting` (the task still
// making it) or `canDraft` (a person can ask for one). Only a person's reply gets an answer: an opt-out, a
// complaint, a bounce or an auto-reply never does.
export function repliesState(root, drafts, queue, leads = latestLeads(root)) {
  const asked = new Map(); // reply id -> its newest draft request
  for (const e of readJsonl(join(root, LOG))) if (e.kind === 'reply-draft') asked.set(e.reply, e);
  const tasks = new Map(queue.map((t) => [t.id, t]));
  return recordedReplies(root).slice(0, 30).map((r) => {
    const draft = r.lead && r.k ? drafts.find((d) => d.kind === 'answer' && d.lead === r.lead && d.reply?.k === r.k) : null;
    const req = asked.get(r.id);
    const drafting = !draft && req && ACTIVE.has(tasks.get(req.task)?.status) ? req.task : null;
    const lead = r.lead ? leads.get(r.lead) : null;
    return {
      ...r, text: r.text.slice(0, 2000), company: lead?.company || (r.lead ? r.lead : ''), draft: draft?.path || null, draftState: draft?.state || null, drafting,
      requested: req ? { task: req.task, auto: !!req.auto, at: req.at } : null,
      canDraft: r.kind === 'reply' && !!r.lead && !!lead && !['disqualified', 'lost', 'won'].includes(lead.status) && !draft && !drafting,
    };
  });
}

// Every drafted email, newest draft first, as the Emails page lists them: who it is for, which of the draft's
// emails it is, its subject and text as the reader gets them, where it would go, and where it stands.
function emailsOf(root, drafts, leads = latestLeads(root), pilot = pilotStatus(root)) {
  const sender = readJson(join(root, 'ops', 'mail-config.json'), {}).sender || {};
  return drafts.flatMap((d) => {
    const text = readFileSync(join(root, d.path), 'utf8');
    const who = recipientOf(leads.get(d.lead), d);
    return d.mails.map((m) => {
      const { subject, body } = parseEmail(text, m.n);
      let filled = body;
      try { filled = fillPlaceholders(body, sender); } catch { /* keep the placeholders */ }
      const day = (iso) => formatDay(istDay(Date.parse(iso)));
      const when = m.dueText ? `Goes on ${m.dueText}` : `Goes on working day ${m.offset} after Email 1 is sent`;
      const why = {
        // with no address, the card says why from cannotSend
        pending: pilot.on ? 'Passed review: tick to send, cross to stop it' : who.to ? `Passed review: tick to send it to ${who.to}, cross to stop it` : "Passed review, but it can't be sent from here",
        approved: m.liveSent
          ? `Sent to ${m.liveTo || who.to} on ${day(m.liveAt)}, approved by ${m.by || 'a person'}`
          : `Approved by ${m.by || 'a person'}${m.sent ? `; ${m.sent} test cop${m.sent === 1 ? 'y' : 'ies'} sent` : ''}${m.retry && !pilot.on ? '; it has not gone out yet' : ''}`,
        scheduled: `Approved by ${m.by || 'a person'}. ${when}${m.after ? ` once Email ${m.after} is sent or declined` : ''}, only if nobody has replied${pilot.on ? '. On hold while the pilot is on' : ''}`,
        skipped: `Approved by ${m.by || 'a person'}, but skipped: ${m.skip}`,
        declined: `Declined by ${m.by || 'a person'}${m.note ? `: ${m.note}` : ''}. Not sent`,
        waiting: d.why,
      }[m.state];
      return {
        ref: emailRef(d.path, m.n), draft: d.path, lead: d.lead, company: d.company, kind: d.kind, reply: d.reply, n: m.n, of: d.mails.length, subject, body: String(filled).trim(), state: m.state, why, sent: m.sent, liveSent: m.liveSent,
        retry: m.retry, due: m.due, dueText: m.dueText, offset: m.offset, after: m.after, skip: m.skip, to: who.to || '', toName: who.name || '', cannotSend: who.refuse || '', review: d.review, at: m.at || d.at, tracked: m.tracked, opens: m.opens, openedAt: m.openedAt, openAuto: m.openAuto,
      };
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
  const drafts = draftsState(root, leads).filter((d) => d.kind === 'sequence'); // answers to replies are ticked on the Emails page
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

// Emails being sent for real right now, so a second tick (a double click, a second tab, the follow-up timer) can't
// send the same email twice while the first is still going out.
const inflight = new Set();
export const isSending = (ref) => inflight.has(ref);
export const claimSend = (ref) => !inflight.has(ref) && !!inflight.add(ref);
export const releaseSend = (ref) => inflight.delete(ref);

// Why a real send of this email can't be made, or '' when it can. Only asked with the pilot off.
function liveRefusal(d, m, leads) {
  const label = `email ${m.n} for ${d.company}`;
  if (m.liveSent) return `${label} already went to ${m.liveTo}`;
  if (inflight.has(emailRef(d.path, m.n))) return `${label} is being sent right now`;
  const lead = leads.get(d.lead);
  const who = recipientOf(lead, d);
  if (who.refuse) return who.refuse;
  if (lead?.hold) return `${d.company} is on hold: ${short(lead.hold.reason)}`;
  if (d.kind === 'sequence' && m.n > 1) {
    if (m.offset === null) return `${label} has no send day in the draft's schedule, so it can't be scheduled`;
    const first = d.mails.find((x) => x.n === 1);
    if (first && !first.liveSent && ['declined', 'skipped'].includes(first.state)) return `${label} can't go: Email 1 was not sent, so there is no start day to count from`;
  }
  return '';
}

// Which emails a person's tick (approve) or cross (decline) is for. `which` is 'all' (every email waiting for a
// decision) or a list of: { draft, n } from the page, `<draft path>#<n>`, or a lead's name with an optional email
// number (`puzari`, `puzari:2`, `L-1ac84fe1#2`). A lead named without a number means all its waiting emails.
// Approve takes an email that is waiting or was declined (or was skipped, or never went out); decline takes one that
// is waiting or scheduled (a sent email can't be recalled). With the pilot off, an approve is refused for an email
// that can't really be sent: its lead has no email address, it is on hold, or it already went out (liveRefusal).
// Returns { refs, labels, skipped } or { error }; with 'all', emails refused that way are left out and listed in
// `skipped`.
export function planEmails(root, which, decision) {
  if (!['approve', 'decline'].includes(decision)) return { error: 'Say approve or decline.' };
  const leads = latestLeads(root);
  const drafts = draftsState(root, leads);
  const live = decision === 'approve' && !pilotStatus(root).on;
  const label = (d, n) => `email ${n} for ${d.company}`;
  if (which === 'all' || (Array.isArray(which) && which.length === 1 && /^all$/i.test(String(which[0])))) {
    const all = drafts.flatMap((d) => d.mails.filter((m) => m.state === 'pending').map((m) => ({ d, m })));
    if (!all.length) return { error: 'No email is waiting for your decision.' };
    const skipped = [];
    const fine = live ? all.filter(({ d, m }) => { const why = liveRefusal(d, m, leads); if (why) skipped.push(why); return !why; }) : all;
    if (!fine.length) return { error: `${skipped.join('; ')}.`.replace(/^./, (c) => c.toUpperCase()) };
    return { refs: fine.map(({ d, m }) => emailRef(d.path, m.n)), labels: fine.map(({ d, m }) => label(d, m.n)), skipped };
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
      // a lead's own sequence; its answers to replies are named by their path (or ticked on the page)
      draft = drafts.find((d) => d.lead === r.ids[0] && d.kind === 'sequence');
      if (!draft) { problems.push(`${leads.get(r.ids[0])?.company || name} has no drafted emails yet`); continue; }
    }
    const mails = draft.mails.filter((x) => (n === null ? x.state === 'pending' : x.n === n));
    if (n !== null && !mails.length) { problems.push(`${draft.company} has no email ${n}`); continue; }
    if (n === null && !mails.length) { problems.push(`${draft.company} has no email waiting for your decision`); continue; }
    for (const x of mails) {
      // An approved email that never went out (its test copies, or its real send, all failed) may be approved again.
      const ok = decision === 'approve' ? ['pending', 'declined', 'skipped'].includes(x.state) || x.retry : ['pending', 'scheduled'].includes(x.state);
      const refusal = ok && live ? liveRefusal(draft, x, leads) : '';
      if (refusal) problems.push(refusal);
      else if (ok) chosen.push({ d: draft, n: x.n });
      else problems.push(`${label(draft, x.n)} ${{ approved: x.liveSent ? 'already went to the lead' : 'is already approved and sent', scheduled: 'is already scheduled', skipped: 'was skipped', declined: 'is already declined' }[x.state] || `can't be decided yet (${draft.why.toLowerCase()})`}`);
    }
  }
  if (problems.length) return { error: `${problems.join('; ')}.`.replace(/^./, (c) => c.toUpperCase()) };
  const seen = new Set();
  const unique = chosen.filter(({ d, n }) => !seen.has(emailRef(d.path, n)) && seen.add(emailRef(d.path, n)));
  return { refs: unique.map(({ d, n }) => emailRef(d.path, n)), labels: unique.map(({ d, n }) => label(d, n)), skipped: [] };
}

// ---------- real sends ----------

// A row in ops/approvals.md for a real send a person ticked: who, date, recipient, draft and email number. send-email.mjs
// reads it (approvalAllows): the Decision starts with Yes and the row names the recipient. Returns the row's ID.
export function writeApproval(root, { by, to, company, path, n, now = new Date() }) {
  const file = join(root, 'ops', 'approvals.md');
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '# Approvals\n\n| ID | Task | Action | Files to review | Risk | Decision | By | Date |\n|---|---|---|---|---|---|---|---|\n';
  const day = istDay(+new Date(now));
  const stem = `A-${day.replace(/-/g, '')}-`;
  const last = Math.max(0, ...[...text.matchAll(new RegExp(`\\| ${stem}(\\d+) \\|`, 'g'))].map((m) => Number(m[1])));
  const id = `${stem}${String(last + 1).padStart(2, '0')}`;
  const cell = (v) => String(v ?? '').replace(/[|\r\n]+/g, ' ').trim();
  const row = `| ${id} | Emails page | Send Email ${n} of ${cell(path)} to ${cell(to)} (${cell(company)}) | ${cell(path)} | A real send to a lead: ticked on the Emails page with the pilot off | Yes, approved on the Emails page | ${cell(by)} | ${day} |`;
  mkdirSync(join(root, 'ops'), { recursive: true });
  writeFileSync(file, `${text}${text.endsWith('\n') ? '' : '\n'}${row}\n`);
  return id;
}

// Runs scripts/send-email.mjs with these arguments. Resolves to { ok, text }: ok when the email went (exit 2 is "sent,
// but the report to the founder failed"), text is what the script printed.
export function runSendEmail(root, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, 'scripts', 'send-email.mjs'), ...args], { cwd: root });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('error', (e) => resolve({ ok: false, text: e.message }));
    child.on('close', (code) => resolve({ ok: code === 0 || (code === 2 && /^Sent\./m.test(out)), text: out.trim() }));
  });
}

// The last line a failed send printed, without its "Not sent: " lead: what to tell a person.
export const reasonOf = (text) => String(text || '').trim().split('\n').pop().replace(/^Not sent:\s*/, '') || 'no reason was given';

// Sends one email to its lead for real, under the approval row already written. `target` is { path, n, lead, to, name }.
// deps.send(root, args) replaces the real send (tests). Resolves to { ok, text, reason }.
export async function sendLive(root, target, approval, deps = {}) {
  const args = ['--draft', target.path, '--email', String(target.n), '--lead', target.lead, '--to', target.to, ...(target.name ? ['--to-name', target.name] : []), '--approval', approval];
  const r = await (deps.send || runSendEmail)(root, args);
  return { ok: !!r.ok, text: r.text || '', reason: r.ok ? '' : reasonOf(r.text) };
}

// What a tick sends: during the pilot, [TEST] copies by send-tests.mjs. Resolves to { ok, sent, text }.
function runSendTests(root, refs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, 'scripts', 'send-tests.mjs'), ...refs], { cwd: root });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('error', (e) => resolve({ ok: false, sent: 0, text: e.message }));
    child.on('close', (code) => resolve({ ok: code === 0, sent: Number(/: (\d+) sent,/.exec(out)?.[1] || 0), text: out.trim() }));
  });
}

// What a person is told after approving with the pilot off: one sentence per email, or a summary for many.
function liveMessage(results) {
  const one = (r) => r.status === 'sent' ? `Approved ${r.label}: sent to ${r.to}.`
    : r.status === 'scheduled' ? `Approved ${r.label}: ${r.due ? `scheduled for ${formatDay(r.due)}` : `it goes on working day ${r.offset} after Email 1 is sent`}.`
    : `Approved ${r.label}, but it did not go: ${r.reason}.`;
  if (results.length <= 3) return results.map(one).join(' ');
  const n = (st) => results.filter((r) => r.status === st).length;
  const failed = results.filter((r) => r.status === 'failed');
  return `Approved ${results.length} emails: ${n('sent')} sent to the leads, ${n('scheduled')} scheduled${failed.length ? `, ${failed.length} did not go (${failed.map((r) => `${r.label}: ${r.reason}`).join('; ')})` : ''}.`;
}

// Logs a person's decision on single emails and acts on it. A decline is only logged. An approve:
//   pilot on   [TEST] copies to the pilot test recipients, by send-tests.mjs
//   pilot off  a real send: an approval row is written for each email, then Email 1 (or an email whose turn has
//              come) goes to the lead at once by send-email.mjs, and a later email whose day has not come is
//              scheduled (scripts/followups.mjs sends it on its day)
// Resolves to { ok, sent, text } and, for a real send, { message, results } too. It runs in the background of the
// server, so the page stays live while emails go out. deps: { send, tests, now } replace the real senders and the
// clock (tests).
export async function decideEmails(root, refs, decision, by = 'a person', note = '', deps = {}) {
  if (!refs.length) return { ok: true, sent: 0, text: '' };
  const now = new Date(deps.now ?? Date.now());
  const live = decision === 'approve' && !pilotStatus(root).on;
  const approvalIds = {};
  const targets = [];
  const claimed = []; // real sends under way: no one else may send these emails until this call is done
  try {
    if (live) {
      const leads = latestLeads(root);
      const drafts = draftsState(root, leads, undefined, now);
      const today = istDay(+now);
      for (const ref of refs) {
        const [path, n] = splitRef(ref);
        const d = drafts.find((x) => x.path === path);
        const m = d?.mails.find((x) => x.n === n);
        const who = d ? recipientOf(leads.get(d.lead), d) : { refuse: 'that email is not available' };
        const label = `email ${n} for ${d?.company || path}`;
        if (!m || who.refuse) { targets.push({ ref, label, status: 'failed', reason: who.refuse || 'that email is not available' }); continue; }
        const goNow = d.kind === 'answer' || n === 1 || (!!m.due && m.due <= today && !m.after);
        if (goNow) {
          if (!claimSend(ref)) { targets.push({ ref, label, status: 'failed', reason: 'it is being sent right now' }); continue; }
          claimed.push(ref);
        }
        approvalIds[ref] = writeApproval(root, { by, to: who.to, company: d.company, path, n, now });
        targets.push({ ref, label, path, n, lead: d.lead, to: who.to, name: who.name, goNow, due: m.due, offset: m.offset });
      }
    }
    // An email that can't be sent for real (no address, ...) is not logged as approved: it stays waiting.
    const logged = live ? targets.filter((t) => t.status !== 'failed').map((t) => t.ref) : refs;
    if (logged.length) appendFileSync(join(root, LOG), `${JSON.stringify({ at: new Date().toISOString(), kind: 'email-decision', decision, emails: logged, by, ...(decision === 'approve' ? { live } : {}), ...(Object.keys(approvalIds).length ? { approvals: approvalIds } : {}), ...(note ? { note: String(note).slice(0, 200) } : {}) })}\n`);
    if (decision !== 'approve') return { ok: true, sent: 0, text: '' };
    if (!live) return await (deps.tests || runSendTests)(root, refs);
    const results = [];
    for (const t of targets) {
      if (t.status === 'failed') results.push(t);
      else if (!t.goNow) results.push({ ...t, status: 'scheduled' });
      else {
        const r = await sendLive(root, t, approvalIds[t.ref], deps);
        results.push({ ...t, status: r.ok ? 'sent' : 'failed', reason: r.reason, text: r.text });
      }
    }
    const sent = results.filter((r) => r.status === 'sent').length;
    const failed = results.filter((r) => r.status === 'failed');
    return { ok: !failed.length, sent, text: results.map((r) => `${r.label}: ${r.status}${r.reason ? ` (${r.reason})` : ''}`).join('\n'), message: liveMessage(results), results: results.map(({ ref, label, status, to, due, reason }) => ({ ref, label, status, to, due, reason })) };
  } finally {
    for (const ref of claimed) releaseSend(ref);
  }
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
