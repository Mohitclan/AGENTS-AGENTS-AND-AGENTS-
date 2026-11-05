#!/usr/bin/env node
// Is the team ready to do real work? Read-only: it checks the machine and the team's files and
// writes nothing. It never starts an agent, so it uses no plan quota, and it never reads a secret:
// for the mail password it only says whether SMTP_PASS is set or a .env file exists.
//
//   node scripts/pilot-check.mjs [--json]
//
// Each line is ok, todo (a person has to do something) or warn (works, but worth a look).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { daysSince, frontmatter, isMain, ROOT } from './_shared.mjs';

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
  const bin = env.CLAUDE_BIN || 'claude';
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 15_000 });
  if (r.error || r.status !== 0) {
    return { status: 'todo', item: 'Claude Code command line', detail: `"${bin}" was not found in this shell. The background agents need it: install Claude Code (npm install -g @anthropic-ai/claude-code), run \`claude\` once and sign in with the Max account through /login.` };
  }
  return { status: 'ok', item: 'Claude Code command line', detail: `${r.stdout.trim()}. Sign-in is checked on the first run: an org login that refuses headless use shows as 403 oauth_not_allowed_for_organization, so use the Max account.` };
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
    ? { status: 'todo', item: 'Tasks waiting on a person', detail: `${waiting.length}: ${waiting.map((t) => `${t.id} (${t.status.replace('_', ' ')})`).join(', ')}. Each report in outputs/reports/ ends with the question or the approval it needs.` }
    : { status: 'ok', item: 'Tasks waiting on a person', detail: 'None.' });
  if (queued.length) out.push({ status: 'warn', item: 'Queued tasks', detail: `${queued.length} will start with the next run: ${queued.map((t) => t.id).join(', ')}.` });
  return out;
}

export function mail(root, env = process.env) {
  const cfg = readJson(root, 'ops/mail-config.json', {});
  const allow = cfg.pilot?.allow_only || [];
  const out = [];
  out.push(allow.length
    ? { status: 'ok', item: 'Send guard', detail: `Pilot on: emails can only go to ${allow.join(', ')}. A prospect is reached only after people approve the draft and suryanshu changes this list.` }
    : { status: 'warn', item: 'Send guard', detail: 'The pilot allow-list is empty, so approved sends can reach prospects.' });
  const pass = env.SMTP_PASS ? 'set in this shell' : existsSync(join(root, '.env')) ? 'a .env file exists (its contents are not read here)' : null;
  out.push(pass
    ? { status: 'ok', item: 'Mail password', detail: `SMTP_PASS: ${pass}. Needed for sends and for reading replies.` }
    : { status: 'todo', item: 'Mail password', detail: `No SMTP_PASS on this machine. Add a Gmail app password for ${cfg.smtp?.user || 'the sending inbox'} to .env as SMTP_PASS=... before any send or reply check.` });
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
  return [claudeCli(env), ...knowledge(root), pipeline(root), ...queue(root), ...mail(root, env), plan(root)];
}

if (isMain(import.meta.url)) {
  const rows = check();
  if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
  else {
    const mark = { ok: 'ok  ', todo: 'TODO', warn: 'warn' };
    for (const r of rows) console.log(`${mark[r.status]}  ${r.item}: ${r.detail}`);
    const todo = rows.filter((r) => r.status === 'todo').length;
    console.log(todo ? `\n${todo} thing(s) for a person before the pilot runs for real.` : '\nReady for real runs.');
  }
}
