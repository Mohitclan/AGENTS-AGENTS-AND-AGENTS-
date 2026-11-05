#!/usr/bin/env node
// Pilot test emails: every email of an outreach draft that passed review goes as a [TEST] copy to
// each pilot test recipient (ops/mail-config.json → pilot.test_recipients), through the test mode of
// send-email.mjs. A person chose those recipients and allowed these sends without asking, so no
// approval row is needed; the lead is never emailed and its status never changes. Jarvis runs this
// after each task while pilot.auto_test_sends is true.
//
//   node scripts/send-tests.mjs --since <ISO time> [--dry-run]    drafts changed since then (Jarvis)
//   node scripts/send-tests.mjs <draft> [<draft> ...] [--dry-run]  these drafts
//
// A draft counts as passed when the newest review that names it in its header (above the
// **Verdict: line) is newer than the draft and says PASS. A copy already sent since the draft last
// changed is not sent again. Each send skips its own report email; the summary printed here goes
// into the Jarvis report instead.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, isMain } from './_shared.mjs';

const CONFIG = join(ROOT, 'ops', 'mail-config.json');
const SEND_LOG = join(ROOT, 'ops', 'send-log.jsonl');
const OUTREACH = 'outputs/outreach';
const REVIEWS = 'outputs/reviews';

const readJsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []);
const mtime = (rel) => statSync(join(ROOT, rel)).mtimeMs;

// The review's overall verdict, and whether its header (the text above the verdict) names the draft.
export function readReview(text, draft) {
  const m = /^[*_\s]*Verdict[*_\s]*:[*_\s]*(PASS|REVISE|ESCALATE)\b/im.exec(text);
  if (!m) return { verdict: null, names: false };
  return { verdict: m[1].toUpperCase(), names: text.slice(0, m.index).includes(draft) };
}

// The newest review of this draft: { file, verdict, stale } (stale: the draft changed after it), or null.
export function reviewOf(draft) {
  if (!existsSync(join(ROOT, REVIEWS))) return null;
  let best = null;
  for (const name of readdirSync(join(ROOT, REVIEWS)).filter((n) => n.endsWith('.md'))) {
    const file = `${REVIEWS}/${name}`;
    const { verdict, names } = readReview(readFileSync(join(ROOT, file), 'utf8'), draft);
    if (!names) continue;
    const at = mtime(file);
    if (!best || at > best.at) best = { file, verdict, at };
  }
  return best && { file: best.file, verdict: best.verdict, stale: best.at < mtime(draft) };
}

export const emailNumbers = (text) => [...text.matchAll(/^## Email (\d+)\s*$/gm)].map((m) => Number(m[1]));

function draftsSince(sinceMs) {
  if (!existsSync(join(ROOT, OUTREACH))) return [];
  return readdirSync(join(ROOT, OUTREACH))
    .filter((n) => n.endsWith('.md'))
    .map((n) => `${OUTREACH}/${n}`)
    .filter((f) => mtime(f) >= sinceMs)
    .sort();
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const at = argv.indexOf('--since');
  const sinceMs = at >= 0 ? Date.parse(argv[at + 1]) : NaN;
  if (at >= 0 && Number.isNaN(sinceMs)) {
    console.error('usage: node scripts/send-tests.mjs --since <ISO time> | <draft> [<draft> ...]  [--dry-run]');
    process.exit(1);
  }
  const drafts = at >= 0 ? draftsSince(sinceMs) : argv.filter((a) => !a.startsWith('--')).map((a) => a.replace(/\\/g, '/'));
  if (at < 0 && !drafts.length) {
    console.error('usage: node scripts/send-tests.mjs --since <ISO time> | <draft> [<draft> ...]  [--dry-run]');
    process.exit(1);
  }

  const pilot = JSON.parse(readFileSync(CONFIG, 'utf8')).pilot || {};
  const testers = pilot.test_recipients || [];
  const names = pilot.test_names || {};
  if (!drafts.length) return console.log('Nothing to send: no outreach draft changed during the task.');
  if (!testers.length) return console.log('Nothing to send: ops/mail-config.json lists no pilot test recipients.');

  const log = readJsonl(SEND_LOG);
  const lines = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const draft of drafts) {
    if (!existsSync(join(ROOT, draft))) {
      lines.push(`- ${draft}: not found`);
      failed++;
      continue;
    }
    const review = reviewOf(draft);
    const why = !review ? 'no review names it yet'
      : review.verdict !== 'PASS' ? `its newest review says ${review.verdict || 'no verdict'} (${review.file})`
      : review.stale ? `it changed after its last review (${review.file}), so it needs a re-review first`
      : '';
    if (why) {
      lines.push(`- ${draft}: not sent, ${why}`);
      skipped++;
      continue;
    }
    lines.push(`- ${draft} (review ${review.file}: PASS)`);
    const changed = mtime(draft);
    for (const n of emailNumbers(readFileSync(join(ROOT, draft), 'utf8'))) {
      for (const to of testers) {
        const who = names[to] ? `${names[to]} <${to}>` : to;
        const done = log.some((e) => e.kind === 'outreach' && e.mode === 'test' && e.draft === draft && e.email === n && e.to === to.toLowerCase() && Date.parse(e.at) >= changed);
        if (done) {
          lines.push(`  - Email ${n} → ${who}: already sent since the draft last changed`);
          continue;
        }
        const r = spawnSync(
          process.execPath,
          [join(ROOT, 'scripts', 'send-email.mjs'), '--draft', draft, '--email', String(n), '--to', to, ...(names[to] ? ['--to-name', names[to]] : []), '--no-report', ...(dryRun ? ['--dry-run'] : [])],
          { cwd: ROOT, encoding: 'utf8' },
        );
        if (r.status === 0) {
          sent++;
          lines.push(`  - Email ${n} → ${who}: ${dryRun ? 'would send (dry run)' : 'sent'}`);
        } else {
          failed++;
          lines.push(`  - Email ${n} → ${who}: FAILED, ${((r.stderr || r.stdout || '').trim().split('\n').pop() || `exit ${r.status}`).replace(/^Not sent: /, '')}`);
        }
      }
    }
  }
  const verb = dryRun ? 'would be sent' : 'sent';
  console.log(`Pilot test emails, from the sender in ops/mail-config.json to ${testers.length} test recipient(s) only; no lead was emailed: ${sent} ${verb}, ${failed} failed, ${skipped} draft(s) not sent.\n`);
  console.log(lines.join('\n'));
  if (failed) process.exitCode = 1;
}

if (isMain(import.meta.url)) main();
