#!/usr/bin/env node
// Follow-ups on their day. A person who ticks Email 2 or 3 on the Emails page before it is due (with the pilot off)
// schedules it: it goes on its working day, counted from the day Email 1 went out live (the draft's "Send schedule":
// offsets in working days, Saturdays and Sundays skipped), and only if nobody has replied and the lead isn't
// suppressed. Mission control calls sendDue every 10 minutes. While the pilot is on, nothing is scheduled or sent
// from here: a tick sends [TEST] copies at once, as before.
//
//   node scripts/followups.mjs              what is scheduled, and what is due today
//   node scripts/followups.mjs --dry-run    what sendDue would send or skip right now; sends and records nothing
//
// Exports:
//   dueFollowups(root, now)        the approved follow-ups whose working day has come and whose earlier emails are
//                                  settled: [{ ref, draft, lead, company, n, due, to, name, approval, by }]
//   sendDue(root, now, deps)       sends each one through send-email.mjs, under the approval row written when the
//                                  person ticked it. An email that must not go (the person replied, the address is on
//                                  the opt-out list, the lead is closed or on hold, ...) is not sent; the reason is
//                                  recorded in ops/outreach.jsonl as { kind: 'followup-skip' } and the Emails page shows
//                                  it as skipped. A send that fails for another reason (no network, the daily limit) is
//                                  tried again, at most once an hour. Resolves to { sent, skipped, failed, held }.
// deps: { send, dryRun } replace the real sender (tests) or make it a rehearsal.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, isMain } from './_shared.mjs';
import { pilotStatus } from './golive.mjs';
import { claimSend, draftsState, followupNotes, formatDay, istDay, latestLeads, recipientOf, releaseSend, sendLive } from './outreach.mjs';
import { replyStop } from './replies.mjs';
import { isSuppressed } from './send-email.mjs';

const RETRY_MS = 60 * 60_000; // a failed send is tried again after an hour
// What send-email.mjs says when it refuses on purpose, as opposed to failing: trying again would not help.
const REFUSED = /opt-out list|bounced on|answered on|already went to|\bis (?:disqualified|lost|won)\b|on hold|does not name|is not in ops\/approvals|decision is|lint-copy failed|placeholders still unfilled|no "## Email|has no Subject/i;

const readJsonl = (root, file) => (existsSync(join(root, file)) ? readFileSync(join(root, file), 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : []);
const first = (s) => String(s || '').split(/(?<=[.:;])\s/)[0].replace(/[.:;]$/, '');

// The approved follow-ups that are due: a real approval (ticked with the pilot off), not sent yet, working day reached,
// and every earlier email of the draft sent or declined. Nothing is due while the pilot is on.
export function dueFollowups(root, now = new Date()) {
  if (pilotStatus(root).on) return [];
  const leads = latestLeads(root);
  const today = istDay(+new Date(now));
  return draftsState(root, leads, undefined, now)
    .filter((d) => d.kind === 'sequence')
    .flatMap((d) => d.mails
      .filter((m) => m.live && m.retry && m.n > 1 && m.due && m.due <= today && !m.after)
      .map((m) => {
        const who = recipientOf(leads.get(d.lead), d);
        return { ref: `${d.path}#${m.n}`, draft: d.path, lead: d.lead, company: d.company, n: m.n, due: m.due, to: who.to || '', name: who.name || '', approval: m.approval, by: m.by };
      }));
}

// Why this follow-up must not go, or '' when it may: the same stops send-email.mjs enforces, checked first so the skip
// reads clearly on the page.
function stopReason(item, lead, { replies, suppression }) {
  if (!lead) return `${item.lead} is not in the pipeline any more`;
  if (['disqualified', 'lost', 'won'].includes(lead.status)) return `${lead.company} is ${lead.status}`;
  if (['replied', 'meeting', 'trial'].includes(lead.status)) return `${lead.company} is ${lead.status}, so a person is in touch`;
  if (lead.hold) return `${lead.company} is on hold: ${first(lead.hold.reason)}`;
  if (!item.to) return `${lead.company} has no email address to send to`;
  const listed = isSuppressed(item.to, suppression);
  if (listed) return `${item.to} is on the opt-out list`;
  const answered = replyStop(item.to, replies);
  if (answered) {
    const when = String(answered.received || answered.at || '').slice(0, 10);
    return answered.kind === 'bounce' ? `${answered.sent_to} bounced on ${when}` : `${answered.from} answered on ${when} (${answered.kind.replace('_', ' ')})`;
  }
  return '';
}

let busy = false;

export async function sendDue(root, now = new Date(), deps = {}) {
  const result = { sent: [], skipped: [], failed: [], held: [] };
  if (busy) return { ...result, busy: true };
  busy = true;
  try {
    const due = dueFollowups(root, now);
    if (!due.length) return result;
    const leads = latestLeads(root);
    const stops = { replies: readJsonl(root, 'ops/replies.jsonl'), suppression: readJsonl(root, 'pipeline/suppression.jsonl') };
    let config = {};
    try { config = JSON.parse(readFileSync(join(root, 'ops', 'mail-config.json'), 'utf8')); } catch { /* no settings: no daily limit known */ }
    const today = new Date(now).toISOString().slice(0, 10);
    let liveToday = readJsonl(root, 'ops/send-log.jsonl').filter((e) => e.mode === 'live' && e.kind === 'outreach' && String(e.at).startsWith(today)).length;
    const { error } = followupNotes(root);
    const note = (kind, item, reason) => appendFileSync(join(root, 'ops', 'outreach.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), kind, ref: item.ref, reason, to: item.to })}\n`);
    for (const item of due) {
      const why = stopReason(item, leads.get(item.lead), stops);
      if (why) {
        if (!deps.dryRun) note('followup-skip', item, why);
        result.skipped.push({ ...item, reason: why });
        continue;
      }
      const failedBefore = error.get(item.ref);
      if (failedBefore && +new Date(now) - Date.parse(failedBefore.at) < RETRY_MS) {
        result.held.push({ ...item, reason: `the last try failed (${failedBefore.reason}); trying again later` });
        continue;
      }
      if (config.daily_limit && liveToday >= config.daily_limit) {
        result.held.push({ ...item, reason: `the daily limit of ${config.daily_limit} live emails is reached; it goes tomorrow` });
        continue;
      }
      if (deps.dryRun) {
        result.sent.push({ ...item, dry: true });
        continue;
      }
      if (!claimSend(item.ref)) {
        result.held.push({ ...item, reason: 'it is being sent right now' });
        continue;
      }
      let r;
      try {
        r = await sendLive(root, { path: item.draft, n: item.n, lead: item.lead, to: item.to, name: item.name }, item.approval, deps);
      } finally {
        releaseSend(item.ref);
      }
      if (r.ok) {
        liveToday++;
        result.sent.push(item);
      } else if (REFUSED.test(r.reason)) {
        const reason = /does not name|is not in ops\/approvals|decision is/i.test(r.reason) ? `its address or approval changed since it was ticked (${r.reason}); tick it again` : r.reason;
        note('followup-skip', item, reason);
        result.skipped.push({ ...item, reason });
      } else {
        note('followup-error', item, r.reason);
        result.failed.push({ ...item, reason: r.reason });
      }
    }
    return result;
  } finally {
    busy = false;
  }
}

// ---------- command line (read-only: sending is mission control's timer) ----------

function status(root) {
  const pilot = pilotStatus(root);
  const lines = [pilot.on ? 'The pilot is on: nothing is scheduled or sent from here.' : 'The pilot is off: approved follow-ups go on their day.'];
  const scheduled = draftsState(root).flatMap((d) => d.mails.filter((m) => m.state === 'scheduled').map((m) => `  - ${d.company} email ${m.n}: ${m.dueText ? `goes on ${m.dueText}` : `goes on working day ${m.offset} after Email 1 is sent`}${m.after ? `, after email ${m.after}` : ''} (approved by ${m.by})`));
  lines.push(scheduled.length ? `Scheduled (${scheduled.length}):` : 'Nothing is scheduled.', ...scheduled);
  const due = dueFollowups(root);
  if (due.length) lines.push(`Due now (${due.length}): ${due.map((d) => `${d.company} email ${d.n} (${formatDay(d.due)})`).join(', ')}.`);
  return lines;
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const lines = status(ROOT);
  if (dry) {
    const r = await sendDue(ROOT, new Date(), { dryRun: true });
    lines.push(`Dry run: ${r.sent.length} would be sent, ${r.skipped.length} would be skipped, ${r.held.length} held. Nothing was sent or recorded.`);
    for (const s of r.sent) lines.push(`  - would send ${s.company} email ${s.n} to ${s.to}`);
    for (const s of r.skipped) lines.push(`  - would skip ${s.company} email ${s.n}: ${s.reason}`);
    for (const s of r.held) lines.push(`  - held ${s.company} email ${s.n}: ${s.reason}`);
  }
  console.log(lines.join('\n'));
}

if (isMain(import.meta.url)) await main();
