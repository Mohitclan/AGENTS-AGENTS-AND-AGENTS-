// Fresh start: clears mission control's data and logs, for a clean start in production. Nothing is deleted: every
// file is moved into a backup folder outside the project (~/panscience-backups/fresh-start-<time>/, same paths), so
// a copy of the project made afterwards carries none of it, and anything can be put back by moving it home again.
//
//   node scripts/fresh-start.mjs           shows what would be cleared and what stays (changes nothing)
//   node scripts/fresh-start.mjs --yes     clears it
//   --backup <dir>                         back up somewhere else
//
// Cleared: every lead and lead batch, every draft, review, report, research file and other output, the task queue,
// the board, approvals, agent-call and fallback logs, the send, reply, decision, post and open logs, the run logs,
// archived runs, questions and keep-going state. The schedule keeps its entries and switches but forgets when each
// last ran. The board, approvals and logs keep their headings, so the team writes into them as before.
//
// Kept: the opt-out list (pipeline/suppression.jsonl: an opt-out is final, hard rule 7), knowledge (fact sheets,
// competitor files, proposals), knowledge confirmations, main memory and each agent's memory (the founders'
// decisions and the lessons), agents, skills, settings (ops/mail-config.json, .env), docs, music and the code.
// It refuses while a task is running.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { ROOT, isMain } from './_shared.mjs';

// Files moved out whole (a missing one is skipped).
const MOVE = [
  'pipeline/leads.jsonl', 'pipeline/leads.csv', 'pipeline/inbox', 'pipeline/human-research.md', 'pipeline/test-shivam.jsonl',
  'ops/queue.json', 'ops/answers.jsonl', 'ops/archive', 'ops/gate-log.jsonl', 'ops/keep-going.json', 'ops/outreach.jsonl',
  'ops/send-log.jsonl', 'ops/replies.jsonl', 'ops/posts.jsonl', 'ops/social-metrics.jsonl', 'ops/opens.json', 'ops/runs',
];
// Logs and lists that keep their heading (everything up to the table's |---| row) and lose their rows.
const RESET = ['ops/board.md', 'ops/approvals.md', 'ops/messages.md', 'ops/fallbacks.md', 'ops/queue.md'];
// Every file under outputs/ goes, except the folders' README files.
const OUTPUTS = 'outputs';
export const KEPT = ['pipeline/suppression.jsonl', 'pipeline/lead-schema.md', 'knowledge/', 'ops/confirmations.jsonl', 'ops/mail-config.json', 'ops/schedule.json (entries and switches)', 'memory/MAIN.md', '.claude/agent-memory/', '.claude/agents/', '.claude/skills/', '.env', 'docs/', 'music/', 'outputs/**/README.md'];

const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
export const heading = (text) => {
  const lines = text.split('\n');
  const sep = lines.findIndex((l) => /^\|\s*-{3}/.test(l));
  return sep < 0 ? text : `${lines.slice(0, sep + 1).join('\n')}\n`;
};
const count = (path) => (statSync(path).isDirectory() ? files(path).length : 1);

// What a fresh start would do: { move: [{ path, files }], outputs: [paths], reset: [path], schedule: bool, running }
export function freshPlan(root = ROOT) {
  const move = MOVE.filter((p) => existsSync(join(root, p))).map((p) => ({ path: p, files: count(join(root, p)) }));
  const outputs = existsSync(join(root, OUTPUTS)) ? files(join(root, OUTPUTS)).map((f) => relative(root, f)).filter((f) => !/(^|\/)README\.md$/.test(f)) : [];
  const reset = RESET.filter((p) => existsSync(join(root, p)) && heading(readFileSync(join(root, p), 'utf8')) !== readFileSync(join(root, p), 'utf8'));
  let pid = 0;
  try {
    pid = Number(readFileSync(join(root, 'ops', 'runs', 'jarvis.lock'), 'utf8').trim());
  } catch {
    // no runner
  }
  let running = false;
  if (pid) {
    try {
      process.kill(pid, 0);
      running = true;
    } catch {
      // a lock left by a runner that died
    }
  }
  return { move, outputs, reset, schedule: existsSync(join(root, 'ops', 'schedule.json')), running };
}

function moveInto(root, rel, backup) {
  const from = join(root, rel);
  const to = join(backup, rel);
  mkdirSync(dirname(to), { recursive: true });
  try {
    renameSync(from, to);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    cpSync(from, to, { recursive: true });
    rmSync(from, { recursive: true, force: true });
  }
}

export function freshStart(root = ROOT, { backup = join(homedir(), 'panscience-backups', `fresh-start-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`) } = {}) {
  const plan = freshPlan(root);
  if (plan.running) throw new Error('A task is running. Wait for it to finish (or stop it), then run this again.');
  mkdirSync(backup, { recursive: true });
  for (const m of plan.move) moveInto(root, m.path, backup);
  for (const f of plan.outputs) moveInto(root, f, backup);
  for (const p of plan.reset) {
    const text = readFileSync(join(root, p), 'utf8');
    mkdirSync(dirname(join(backup, p)), { recursive: true });
    writeFileSync(join(backup, p), text);
    writeFileSync(join(root, p), heading(text));
  }
  // starting files the scripts expect
  writeFileSync(join(root, 'ops', 'queue.json'), '[]\n');
  mkdirSync(join(root, 'ops', 'runs'), { recursive: true });
  if (plan.schedule) {
    const file = join(root, 'ops', 'schedule.json');
    const text = readFileSync(file, 'utf8');
    mkdirSync(join(backup, 'ops'), { recursive: true });
    writeFileSync(join(backup, 'ops', 'schedule.json'), text);
    const entries = JSON.parse(text).map(({ last_run: _r, last_note: _n, ...e }) => ({ ...e, last_run: null }));
    writeFileSync(file, `${JSON.stringify(entries, null, 2)}\n`);
  }
  const moved = plan.move.reduce((n, m) => n + m.files, 0) + plan.outputs.length;
  return { backup, moved, reset: plan.reset.length };
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--backup');
  const plan = freshPlan(ROOT);
  if (!args.includes('--yes')) {
    console.log('Fresh start: what would be cleared (nothing has changed yet)\n');
    for (const m of plan.move) console.log(`  ${m.path}${m.files > 1 ? ` (${m.files} files)` : ''}`);
    console.log(`  outputs/: ${plan.outputs.length} files (drafts, reviews, reports, research and the rest)`);
    for (const p of plan.reset) console.log(`  ${p}: rows cleared, heading kept`);
    if (plan.schedule) console.log('  ops/schedule.json: entries and switches kept, last runs forgotten');
    console.log(`\nKept: ${KEPT.join(', ')}.`);
    console.log(`\n${plan.running ? 'A task is running: wait for it before clearing.' : 'Everything is moved to a backup folder in ~/panscience-backups/, not deleted. Run with --yes to clear.'}`);
  } else {
    try {
      const r = freshStart(ROOT, at >= 0 ? { backup: args[at + 1] } : {});
      console.log(`Fresh start done: ${r.moved} files moved and ${r.reset} logs cleared. The backup is in ${r.backup}. Restart mission control to see the empty pages.`);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  }
}
