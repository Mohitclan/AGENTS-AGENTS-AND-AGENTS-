#!/usr/bin/env node
// Is the team ready to do real work? Read-only: it checks the machine and the team's files and
// writes nothing. It never starts an agent, so it uses no plan quota.
//
//   node scripts/pilot-check.mjs [--online] [--json]
//
// Without --online it reads only this folder, and for the mail password it only says whether SMTP_PASS
// is set or a .env file exists. With --online it also signs in to the sending mailbox (SMTP and IMAP:
// nothing is sent and no message is read) and looks up the sender domain's SPF, DKIM and DMARC records.
// Each line is ok, todo (a person has to do something) or warn (works, but worth a look).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { daysSince, frontmatter, isMain, loadMailSecret, resolveClaude, ROOT, workspaceTrusted } from './_shared.mjs';

const STALE_DAYS = 14;

const readJson = (root, rel, fallback) => {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch {
    return fallback;
  }
};
const readLines = (root, rel) => {
  try {
    return readFileSync(join(root, rel), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
};

// The Claude Code command line the background runs use (scripts/jarvis.mjs spawns the same one).
export function claudeCli(env = process.env) {
  const bin = resolveClaude(env);
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 15_000 });
  if (r.error || r.status !== 0) {
    return { status: 'todo', item: 'Claude Code command line', detail: `"${bin}" was not found on this machine. The background agents need it: install Claude Code (npm install -g @anthropic-ai/claude-code), run \`claude\` once and sign in with the Max account through /login.` };
  }
  return { status: 'ok', item: 'Claude Code command line', detail: `${r.stdout.trim()}. Sign-in is checked on the first run: an org login that refuses headless use shows as 403 oauth_not_allowed_for_organization, so use the Max account.` };
}

// Claude Code ignores a folder's allowed commands until it has been told to trust the folder.
export function trust(root, home) {
  const trusted = workspaceTrusted(root, home);
  if (trusted === null) return { status: 'warn', item: 'Folder trusted by Claude Code', detail: "Claude Code's settings file can't be read, so this can't be checked. If every agent command is refused, open a terminal here, run \"claude\" and accept the trust question." };
  return trusted
    ? { status: 'ok', item: 'Folder trusted by Claude Code', detail: 'Yes, so the agents may use the commands this project allows.' }
    : { status: 'todo', item: 'Folder trusted by Claude Code', detail: `No. Once, in a terminal in ${root}: run "claude" and accept the trust question. Until then every agent command is refused and runs fail.` };
}

export function knowledge(root) {
  const out = [];
  for (const [rel, item] of [['knowledge/company.md', 'Company facts'], ['knowledge/products/motionrepo.md', 'MotionRepo facts'], ['knowledge/competitors/motionrepo.md', 'Competitor file']]) {
    let fm = null;
    try {
      fm = frontmatter(readFileSync(join(root, rel), 'utf8'));
    } catch {
      out.push({ status: 'todo', item, detail: `${rel} is missing.` });
      continue;
    }
    const age = fm?.last_verified ? daysSince(fm.last_verified) : null;
    if (fm?.status !== 'confirmed') out.push({ status: 'todo', item, detail: `${rel} is ${fm?.status || 'unmarked'}; only confirmed facts reach a prospect. Confirm it with node scripts/kb.mjs confirm ${rel}.` });
    else if (age !== null && age > STALE_DAYS) out.push({ status: 'warn', item, detail: `Confirmed, but last checked ${age} days ago (${fm.last_verified}). Ask the researcher to re-check it.` });
    else out.push({ status: 'ok', item, detail: `Confirmed${age !== null ? `, checked ${age} day(s) ago` : ''}.` });
  }
  return out;
}

export function pipeline(root) {
  const leads = readLines(root, 'pipeline/leads.jsonl');
  const by = {};
  for (const l of leads) by[l.status] = (by[l.status] || 0) + 1;
  const counts = Object.entries(by).map(([s, n]) => `${n} ${s}`).join(', ') || 'none';
  const active = leads.filter((l) => !['disqualified', 'lost'].includes(l.status)).length;
  return { status: active >= 10 ? 'ok' : 'warn', item: 'Leads', detail: `${leads.length} real leads (${counts}). ${active} still in play${active < 10 ? ': too few for a pilot, so run a lead sprint' : ''}.` };
}

export function queue(root) {
  const q = readJson(root, 'ops/queue.json', []);
  const waiting = q.filter((t) => ['needs_input', 'needs_approval'].includes(t.status));
  const queued = q.filter((t) => t.status === 'queued');
  const out = [];
  out.push(waiting.length
    ? { status: 'warn', item: 'Tasks waiting on a person', detail: `${waiting.length}: ${waiting.map((t) => `${t.id} (${t.status.replace('_', ' ')})`).join(', ')}. Each report in outputs/reports/ ends with the question or the approval it needs.` }
    : { status: 'ok', item: 'Tasks waiting on a person', detail: 'None.' });
  if (queued.length) out.push({ status: 'warn', item: 'Queued tasks', detail: `${queued.length} will start with the next run: ${queued.map((t) => t.id).join(', ')}.` });
  return out;
}

export function mail(root, env = process.env) {
  const cfg = readJson(root, 'ops/mail-config.json', {});
  const allow = cfg.pilot?.allow_only || [];
  const testers = cfg.pilot?.test_recipients || [];
  const out = [];
  out.push(allow.length
    ? { status: 'ok', item: 'Send guard', detail: `Pilot on: the send script refuses every address except ${allow.join(', ')}, so no prospect can be emailed.` }
    : { status: 'warn', item: 'Send guard', detail: 'The pilot allow-list is empty, so approved sends can reach prospects.' });
  out.push(cfg.pilot?.auto_test_sends && testers.length
    ? { status: 'ok', item: 'Test emails', detail: `After each task, Jarvis sends every email of each draft that passed review to ${testers.join(', ')} as [TEST] copies, with no questions.` }
    : testers.length
      ? { status: 'ok', item: 'Test emails', detail: `Sent when a person approves a draft that passed review on the Outreach page (button or voice): [TEST] copies to ${testers.join(', ')}. Nothing is sent automatically after a task.` }
      : { status: 'warn', item: 'Test emails', detail: 'No pilot test recipients in ops/mail-config.json, so approving a draft has nobody to send to.' });
  const pass = env.SMTP_PASS ? 'set in this shell' : existsSync(join(root, '.env')) ? 'a .env file exists (its contents are not read here)' : null;
  out.push(pass
    ? { status: 'ok', item: 'Mail password', detail: `SMTP_PASS: ${pass}. Needed for sends and for reading replies.` }
    : { status: 'todo', item: 'Mail password', detail: `No SMTP_PASS on this machine. Add a Gmail app password for ${cfg.smtp?.user || 'the sending inbox'} to .env as SMTP_PASS=... before any send or reply check.` });
  return out;
}

// What the sender domain's DNS says about who may send for it. Pure, so it is tested with plain records.
export function senderAuth(domain, { spf = [], dmarc = [], dkim = [] }) {
  const out = [];
  out.push(spf.some((t) => /^v=spf1\b/i.test(t))
    ? { status: 'ok', item: 'Sender SPF', detail: `${domain} publishes an SPF record.` }
    : { status: 'warn', item: 'Sender SPF', detail: `${domain} has no SPF record. Test emails work, but real clients' mail servers may send the emails to spam. Whoever manages the domain's DNS adds a TXT record "v=spf1 include:_spf.google.com ~all".` });
  out.push(dkim.some((t) => /^v=DKIM1\b/i.test(t))
    ? { status: 'ok', item: 'Sender DKIM', detail: `${domain} publishes a Google DKIM key (the Workspace admin must also have switched signing on).` }
    : { status: 'warn', item: 'Sender DKIM', detail: `No Google DKIM key found for ${domain}. In the Google Workspace admin console, generate one and publish it in DNS.` });
  const policy = /\bp=(\w+)/i.exec(dmarc.find((t) => /^v=DMARC1\b/i.test(t)) || '')?.[1];
  out.push(policy
    ? { status: 'ok', item: 'Sender DMARC', detail: `${domain} has a DMARC policy (p=${policy.toLowerCase()}).` }
    : { status: 'warn', item: 'Sender DMARC', detail: `${domain} has no DMARC record. Add a TXT record at _dmarc.${domain} such as "v=DMARC1; p=none".` });
  return out;
}

// Network checks: sign in to the sending mailbox and read the sender domain's DNS. Sends nothing, reads no message.
export async function online(root, env = process.env) {
  const cfg = readJson(root, 'ops/mail-config.json', {});
  const out = [];
  const pass = loadMailSecret(root, env);
  const user = cfg.smtp?.user;
  if (!pass || !user) {
    out.push({ status: 'todo', item: 'Mailbox sign-in', detail: 'No mail password to try. Save SMTP_PASS in .env.' });
  } else {
    try {
      const nodemailer = (await import('nodemailer')).default;
      const smtp = cfg.smtp;
      await nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user, pass }, connectionTimeout: 15_000 }).verify();
      out.push({ status: 'ok', item: 'Sending sign-in (SMTP)', detail: `${user} signs in to ${smtp.host}. Nothing was sent.` });
    } catch (e) {
      out.push({ status: 'todo', item: 'Sending sign-in (SMTP)', detail: `${user} could not sign in: ${String(e.message).slice(0, 120)}. Create a new app password while signed in as that mailbox (2-Step Verification on) and save it in .env.` });
    }
    try {
      const { ImapFlow } = await import('imapflow');
      const imap = cfg.imap || { host: 'imap.gmail.com', port: 993 };
      const client = new ImapFlow({ host: imap.host, port: imap.port, secure: true, auth: { user, pass }, logger: false });
      await client.connect();
      await client.logout();
      out.push({ status: 'ok', item: 'Reply reading (IMAP)', detail: `${user} signs in to ${imap.host}, so answers to our emails can be read. No message was opened.` });
    } catch (e) {
      out.push({ status: 'warn', item: 'Reply reading (IMAP)', detail: `Could not sign in to read replies: ${String(e.message).slice(0, 120)}. Sending still works; replies would not be noticed until IMAP is on.` });
    }
  }
  const domain = String(cfg.sender?.email || '').split('@')[1];
  if (domain) {
    const { promises: dns } = await import('node:dns');
    const txt = async (name) => (await dns.resolveTxt(name).catch(() => [])).map((parts) => parts.join(''));
    out.push(...senderAuth(domain, { spf: await txt(domain), dmarc: await txt(`_dmarc.${domain}`), dkim: await txt(`google._domainkey.${domain}`) }));
  }
  return out;
}

export function plan(root) {
  const data = readJson(root, 'ops/runs/plan-limits.json', null);
  if (!data?.windows) return { status: 'ok', item: 'Plan usage', detail: 'No reading yet; the first run records it, and runs stop at 85%.' };
  const pct = (w) => (w && w.resetsAt * 1000 > Date.now() ? Math.round((w.utilization ?? 0) * 100) : 0);
  const five = pct(data.windows.five_hour);
  const week = pct(data.windows.seven_day);
  return { status: Math.max(five, week) >= 85 ? 'todo' : 'ok', item: 'Plan usage', detail: `5-hour window ${five}%, weekly ${week}% (as of ${data.at || 'the last run'}).` };
}

export function check(root = ROOT, env = process.env) {
  return [claudeCli(env), trust(root), ...knowledge(root), pipeline(root), ...queue(root), ...mail(root, env), plan(root)];
}

if (isMain(import.meta.url)) {
  const rows = check();
  if (process.argv.includes('--online')) rows.push(...(await online(ROOT)));
  if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
  else {
    const mark = { ok: 'ok  ', todo: 'TODO', warn: 'warn' };
    for (const r of rows) console.log(`${mark[r.status]}  ${r.item}: ${r.detail}`);
    const todo = rows.filter((r) => r.status === 'todo').length;
    const warn = rows.filter((r) => r.status === 'warn').length;
    console.log(todo ? `\n${todo} thing(s) for a person before the pilot runs for real.` : `\nReady for pilot runs${warn ? ` (${warn} warning(s) worth a look)` : ''}.`);
  }
}
