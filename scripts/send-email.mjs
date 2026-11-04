#!/usr/bin/env node
// Sends one email from a reviewed outreach draft, logs it, and emails a send report to the
// reporting founder (ops/mail-config.json → report_to).
//
//   node scripts/send-email.mjs --draft <file> --email <n> --to <address> [--to-name <name>]
//                               [--lead <id>] [--approval <A-id>] [--dry-run]
//
// Demo mode: --to is the sender's own address. Nothing reaches a prospect, so no approval is needed.
// Live mode: any other --to. Needs --approval <id> whose row in ops/approvals.md says Yes/Approved
// and names the recipient. Live sends are refused when the recipient is suppressed, the copy fails
// lint-copy, today's live sends have reached the daily limit, or the person or company has answered
// (ops/replies.jsonl, kept by scripts/replies.mjs).
//
// Secrets: the SMTP password comes from the SMTP_PASS environment variable, else from .env.
// It is never printed or logged.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { ROOT, isMain, suppressionMatch } from './_shared.mjs';
import { replyStop } from './replies.mjs';

const CONFIG = join(ROOT, 'ops', 'mail-config.json');
const SEND_LOG = join(ROOT, 'ops', 'send-log.jsonl');
const REPLY_LOG = join(ROOT, 'ops', 'replies.jsonl');
const APPROVALS = join(ROOT, 'ops', 'approvals.md');
const SUPPRESSION = join(ROOT, 'pipeline', 'suppression.jsonl');
const LEADS = join(ROOT, 'pipeline', 'leads.jsonl');
const REVIEWS = join(ROOT, 'outputs', 'reviews');

// ---------- pure helpers (tested in scripts/tests/send-email.test.mjs) ----------

export function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--')) out[a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = argv[++i];
  }
  return out;
}

export function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (m) for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^(\w+):\s*(.*)$/);
    if (k) fm[k[1]] = k[2].trim();
  }
  return fm;
}

// Returns { subject, body, total } for "## Email <n>", ending at the next "## " heading.
export function parseEmail(text, n) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const total = lines.filter((l) => /^## Email \d+\s*$/.test(l)).length;
  const start = lines.findIndex((l) => new RegExp(`^## Email ${n}\\s*$`).test(l));
  if (start < 0) throw new Error(`no "## Email ${n}" section in the draft`);
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  const part = lines.slice(start + 1, end);
  const at = part.findIndex((l) => /^\s*subject\s*:/i.test(l));
  if (at < 0) throw new Error(`Email ${n} has no Subject line`);
  const subject = part[at].replace(/^\s*subject\s*:\s*/i, '').trim();
  const body = part.slice(at + 1).join('\n').trim();
  return { subject, body, total };
}

export function fillPlaceholders(text, sender) {
  const map = { SENDER_NAME: sender.name, SENDER_ROLE: sender.role, COMPANY_NAME: sender.company, SENDER_EMAIL: sender.email };
  const filled = text.replace(/\{\{(\w+)\}\}/g, (m, k) => (map[k] ? map[k] : m));
  const left = [...new Set(filled.match(/\{\{\w+\}\}/g) || [])];
  if (left.length) throw new Error(`placeholders still unfilled: ${left.join(', ')}`);
  return filled;
}

// Demo mode only: greet the person actually receiving the email.
export function regreet(body, name) {
  return name ? body.replace(/^(Hi|Hello|Dear)\s+[^,\n]+,/, `$1 ${name},`) : body;
}

// The same match the lead gate uses (suppressionMatch in _shared.mjs): the address, its domain or a parent domain.
export function isSuppressed(address, list) {
  return suppressionMatch(list, { contact: address }) || null;
}

// An approval row allows a send only if its Decision cell starts with Yes or Approved and the row
// names the recipient.
export function approvalAllows(approvalsText, id, to) {
  const row = approvalsText.split(/\r?\n/).find((l) => l.startsWith(`| ${id} |`));
  if (!row) return { ok: false, why: `${id} is not in ops/approvals.md` };
  const cells = row.split('|').map((c) => c.trim());
  const decision = cells[6] || '';
  if (!/^(\*\*)?(yes|approved)\b/i.test(decision)) return { ok: false, why: `${id} decision is "${decision || 'empty'}", not a yes` };
  if (!row.toLowerCase().includes(to.toLowerCase())) return { ok: false, why: `${id} does not name ${to}` };
  return { ok: true, decision, by: cells[7] || '', date: cells[8] || '' };
}

// Next message after Email n from the draft's "Send schedule" table, if any.
export function nextInSequence(text, n) {
  const m = text.match(new RegExp(`\\|\\s*Email ${n + 1}\\s*\\|\\s*(\\d+)\\s*\\|`));
  return m ? { email: n + 1, day: Number(m[1]) } : null;
}

export function buildReport(r) {
  const lines = [
    `Hi ${r.reportTo.name},`,
    '',
    `An email just went out from the sales pipeline. Details below.`,
    '',
    `Mode:        ${r.demo ? "DEMO: sent to the sender's own inbox; no prospect was contacted" : 'LIVE: sent to a prospect'}`,
    `Sent at:     ${r.sentAt}`,
    `From:        ${r.from}`,
    `To:          ${r.to}`,
    `Subject:     ${r.subject}`,
    `Message ID:  ${r.messageId}`,
    `SMTP reply:  ${r.response}`,
    '',
    `Product:     ${r.product || 'not stated'}`,
    `Lead:        ${r.lead || 'none'}${r.company ? ` (${r.company})` : ''}${r.leadStatus ? `, status ${r.leadStatus}` : ''}`,
    `Draft:       ${r.draft}, Email ${r.n} of ${r.total}`,
    `Task:        ${r.task || 'not stated'}`,
    `Review:      ${r.review || 'no review file found'}`,
    `Approval:    ${r.approval}`,
    '',
    'Checks before sending:',
    `- Placeholders filled: yes`,
    `- Opt-out list: ${r.suppressed ? `MATCH (${r.suppressed})` : 'clear'}`,
    `- Copy check (lint-copy): ${r.lint}`,
    `- Live sends today: ${r.liveToday} of ${r.dailyLimit}`,
    '',
    `Next step:   ${r.next}`,
    '',
    '----- Copy of the email -----',
    `Subject: ${r.subject}`,
    '',
    r.body,
    '----- End -----',
    '',
    'This report was generated by scripts/send-email.mjs and logged in ops/send-log.jsonl.',
  ];
  return lines.join('\n');
}

// ---------- side effects ----------

function loadSecret() {
  if (process.env.SMTP_PASS) return process.env.SMTP_PASS;
  const file = join(ROOT, '.env');
  if (!existsSync(file)) return '';
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*SMTP_PASS\s*=\s*(.*)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

const readJsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []);

function latestReview(task) {
  if (!task || !existsSync(REVIEWS)) return null;
  const files = readdirSync(REVIEWS).filter((f) => f.startsWith(task)).sort();
  if (!files.length) return null;
  const file = files[files.length - 1];
  const text = readFileSync(join(REVIEWS, file), 'utf8');
  const m = text.match(/\b(PASS|REVISE|ESCALATE)\b[^\n]{0,40}?(\d{1,3})\s*\/\s*100/);
  return `outputs/reviews/${file}${m ? `: ${m[1]} ${m[2]}/100` : ''}`;
}

function lintEmail(subject, body) {
  const tmp = join(tmpdir(), `send-email-lint-${process.pid}.md`);
  writeFileSync(tmp, `## Email 1\n\nSubject: ${subject}\n\n${body}\n`);
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'lint-copy.mjs'), tmp, '--type', 'email', '--no-log'], { encoding: 'utf8' });
  rmSync(tmp, { force: true });
  const m = (r.stdout || '').match(/(\d+) failed, (\d+) warning/);
  return { ok: r.status === 0, text: m ? `${m[1]} failed, ${m[2]} warning(s)` : `exit ${r.status}` };
}

function istNow() {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' }) + ' IST';
}

function die(msg) {
  console.error(`Not sent: ${msg}`);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.draft || !args.email || !args.to) die('usage: node scripts/send-email.mjs --draft <file> --email <n> --to <address> [--to-name <name>] [--lead <id>] [--approval <A-id>] [--dry-run]');
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
  const n = Number(args.email);
  const to = args.to.trim().toLowerCase();
  const demo = to === config.sender.email.toLowerCase();
  // Pilot: while pilot.allow_only lists anyone, nobody else can receive an email from this script,
  // whatever ops/approvals.md says. The send report still goes to report_to.
  const allowed = (config.pilot?.allow_only || []).map((a) => a.toLowerCase());
  if (allowed.length && !allowed.includes(to)) die(`pilot mode: only ${allowed.join(', ')} may receive emails (ops/mail-config.json pilot.allow_only). Drafts for ${to} wait for people to approve the wording and end the pilot rule`);
  const draftPath = join(ROOT, args.draft);
  if (!existsSync(draftPath)) die(`${args.draft} not found`);
  const text = readFileSync(draftPath, 'utf8');
  const fm = frontmatter(text);
  const leadId = args.lead || fm.lead || '';
  const lead = readJsonl(LEADS).find((l) => l.id === leadId);

  // Build the email.
  let parsed;
  try { parsed = parseEmail(text, n); } catch (e) { die(e.message); }
  let body;
  try { body = fillPlaceholders(parsed.body, config.sender); } catch (e) { die(e.message); }
  if (demo) body = regreet(body, args.toName || config.sender.name.split(' ')[0]);
  const subject = demo ? `[DEMO] ${parsed.subject}` : parsed.subject;

  // Checks.
  const suppressed = isSuppressed(to, readJsonl(SUPPRESSION));
  if (suppressed) die(`${to} is on the opt-out list (${suppressed.reason})`);
  if (!demo) {
    const answered = replyStop(to, readJsonl(REPLY_LOG));
    const when = (answered?.received || answered?.at || '').slice(0, 10);
    if (answered?.kind === 'bounce') die(`${answered.sent_to} bounced on ${when} (${answered.file}). Find another published contact`);
    if (answered) die(`${answered.from} answered on ${when} (${answered.kind}, ${answered.file}), so the sequence has stopped. A person decides what goes next`);
  }
  const lint = lintEmail(parsed.subject, body);
  const log = readJsonl(SEND_LOG);
  const today = new Date().toISOString().slice(0, 10);
  const liveToday = log.filter((e) => e.mode === 'live' && e.kind === 'outreach' && e.at.startsWith(today)).length;
  let approval = 'not needed (demo: sent to the sender only)';
  if (!demo) {
    if (!args.approval) die('a live send needs --approval <A-id> from ops/approvals.md');
    const ok = approvalAllows(readFileSync(APPROVALS, 'utf8'), args.approval, to);
    if (!ok.ok) die(ok.why);
    if (!lint.ok) die(`lint-copy failed: ${lint.text}`);
    if (liveToday >= config.daily_limit) die(`daily limit reached: ${liveToday} of ${config.daily_limit} live sends today`);
    if (lead && ['disqualified', 'lost', 'won'].includes(lead.status)) die(`${leadId} is ${lead.status}`);
    if (lead?.hold) die(`${leadId} is on hold: ${lead.hold.reason}`);
    approval = `${args.approval}: ${ok.decision} (${ok.by}, ${ok.date})`;
  }
  const next = nextInSequence(text, n);
  const nextText = demo
    ? `none. Demo send; the lead's status is unchanged${next ? ` (in a live run, Email ${next.email} would follow on working day ${next.day} if there is no reply)` : ''}.`
    : `${lead ? `${leadId} is marked contacted by this script (the approval above is the person's decision). ` : ''}${next ? `Email ${next.email} on working day ${next.day}, only if there is no reply.` : 'This was the last email in the sequence.'}`;

  const from = `${config.sender.name} <${config.sender.email}>`;
  const reportBase = {
    reportTo: config.report_to, demo, from, to, subject, body, n, total: parsed.total,
    draft: relative(ROOT, draftPath).replace(/\\/g, '/'), product: fm.product, lead: leadId, company: lead?.company || fm.company,
    leadStatus: lead?.status, task: fm.task, review: latestReview(fm.task), approval, suppressed: null,
    lint: lint.text, liveToday: liveToday + (demo ? 0 : 1), dailyLimit: config.daily_limit, next: nextText,
  };

  console.log(`Mode: ${demo ? 'DEMO' : 'LIVE'}\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\nLint: ${lint.text}\nApproval: ${approval}\nReport to: ${config.report_to.name} <${config.report_to.email}>\n`);
  if (args.dryRun) {
    console.log('--- email ---\n' + body + '\n--- report preview ---\n' + buildReport({ ...reportBase, sentAt: '(dry run)', messageId: '(dry run)', response: '(dry run)' }));
    console.log('\nDry run: nothing sent, nothing logged.');
    return;
  }

  const pass = loadSecret();
  if (!pass) die('no SMTP password: set SMTP_PASS or add it to .env');
  const nodemailer = (await import('nodemailer')).default;
  const transport = nodemailer.createTransport({ host: config.smtp.host, port: config.smtp.port, secure: config.smtp.port === 465, auth: { user: config.smtp.user, pass } });

  const info = await transport.sendMail({ from, to, subject, text: body });
  const sentAt = istNow();
  const entry = { at: new Date().toISOString(), kind: 'outreach', mode: demo ? 'demo' : 'live', to, subject, draft: reportBase.draft, email: n, lead: leadId || null, approval: demo ? null : args.approval, message_id: info.messageId };
  appendFileSync(SEND_LOG, JSON.stringify(entry) + '\n');
  console.log(`Sent. Message ID ${info.messageId} (${info.response})`);

  // A live send under a Yes row is the person's decision to contact this lead, so record it, so that
  // replies.mjs can move the lead on when they answer.
  if (!demo && lead) {
    const steps = ['drafted', 'approved', 'contacted'];
    const at = steps.indexOf(lead.status);
    const todo = lead.status === 'qualified' ? steps : at >= 0 ? steps.slice(at + 1) : [];
    for (const status of todo) {
      const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'leads.mjs'), 'set-status', leadId, status, `Email ${n} sent ${today} to ${to} under ${args.approval}`], { encoding: 'utf8' });
      if (r.status !== 0) {
        console.error(`Sent, but ${leadId} could not be set to ${status}: ${(r.stderr || r.stdout).trim()}`);
        break;
      }
      reportBase.leadStatus = status;
    }
    if (reportBase.leadStatus === 'contacted') console.log(`${leadId} is now contacted.`);
  }

  const report = buildReport({ ...reportBase, sentAt, messageId: info.messageId, response: info.response });
  const reportSubject = `[Send report] ${demo ? 'DEMO' : 'LIVE'} · ${subject} → ${to}`;
  try {
    const r = await transport.sendMail({ from, to: `${config.report_to.name} <${config.report_to.email}>`, subject: reportSubject, text: report });
    appendFileSync(SEND_LOG, JSON.stringify({ at: new Date().toISOString(), kind: 'report', mode: entry.mode, to: config.report_to.email, subject: reportSubject, for: info.messageId, message_id: r.messageId }) + '\n');
    console.log(`Report sent to ${config.report_to.email}. Message ID ${r.messageId}`);
  } catch (e) {
    appendFileSync(SEND_LOG, JSON.stringify({ at: new Date().toISOString(), kind: 'report', mode: entry.mode, to: config.report_to.email, for: info.messageId, error: e.message }) + '\n');
    console.error(`The email was sent, but the report to ${config.report_to.email} failed: ${e.message}`);
    process.exit(2);
  }
}

if (isMain(import.meta.url)) {
  main().catch((e) => die(e.message));
}
