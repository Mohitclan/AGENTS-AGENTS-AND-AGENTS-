// The drafting lane: how Jarvis runs a drafting task a person asked for on the Outreach page (or by voice) without a
// coordinator session. Drafting is a fixed chain, so Jarvis runs it itself:
//   1. the outreach agent drafts every lead's sequence (one session, Sonnet);
//   2. one evaluator per draft reviews it, all at once (Opus at high effort: it is text a customer will read);
//   3. drafts with blocking fixes go back to the outreach agent in one session, then only those are re-reviewed,
//      at most twice;
//   4. Jarvis marks the passed leads drafted, keeps the board row, and writes the report.
// The coordinator session it replaces cost more than the drafting and the reviews together (J-20261109-01: $3.51 of
// $9.97 at list prices). Every draft is still reviewed, nothing is sent, and the person approves each email on the
// Emails page.
//
//   const r = await runDraftLane({ task, root, session, timeoutMs, say })
//   session(args, prompt, label) runs one Claude Code session and resolves to { resultText, isError, limitRejected }
//   r: { status: 'done' | 'blocked' | 'limit', report, summary }  or null when the task isn't a drafting task
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, today } from './_shared.mjs';
import { latestLeads } from './outreach.mjs';
import { readReview } from './send-tests.mjs';

export const WRITER = ['--agent', 'outreach', '--model', 'sonnet', '--effort', 'medium'];
export const REVIEWER = ['--agent', 'evaluator', '--model', 'opus', '--effort', 'high'];
const MAX_ROUNDS = 3; // the first review and at most two revisions
const AT_ONCE = 6;

const readJsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);

// The leads a person asked drafts for in this task, or [] when it isn't one: a drafting task is worded by
// outreach.mjs planDrafts and logged in ops/outreach.jsonl with the leads.
export function laneLeads(root, task) {
  if (!/^Draft outreach email sequences for /.test(task.task || '')) return [];
  const ids = readJsonl(join(root, 'ops', 'outreach.jsonl')).filter((e) => e.kind === 'draft-request' && e.task === task.id).flatMap((e) => e.leads || []);
  return [...new Set(ids)];
}

// The next board task ID for today: T-YYYYMMDD-NN, one past the highest on the board.
export function nextTaskId(root) {
  const day = today().replace(/-/g, '');
  const board = existsSync(join(root, 'ops', 'board.md')) ? readFileSync(join(root, 'ops', 'board.md'), 'utf8') : '';
  const used = [...board.matchAll(new RegExp(`T-${day}-(\\d{2})`, 'g'))].map((m) => Number(m[1]));
  return `T-${day}-${String(Math.max(0, ...used) + 1).padStart(2, '0')}`;
}

// Puts a row on the board, or replaces the row with the same task ID. Newest rows sit at the top of the table.
export function boardRow(root, [id, request, agent, status, output, review]) {
  const file = join(root, 'ops', 'board.md');
  const cell = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const row = `| ${[id, request, agent, status, output, review, today()].map(cell).join(' | ')} |`;
  const lines = (existsSync(file) ? readFileSync(file, 'utf8') : '# Task board\n\n| Task | Request | Agent | Status | Output | Review | Updated |\n').split('\n');
  const at = lines.findIndex((l) => l.startsWith(`| ${id} |`));
  if (at >= 0) lines[at] = row;
  else {
    const head = lines.findIndex((l) => /^\|\s*Task\s*\|/.test(l));
    const sep = head >= 0 && /^\|[\s:-]+\|/.test(lines[head + 1] || '') ? head + 2 : head + 1;
    lines.splice(head >= 0 ? sep : lines.length, 0, row);
  }
  writeFileSync(file, lines.join('\n'));
}

export const draftPath = (id) => `outputs/outreach/${id}.md`;
export const reviewPath = (tid, id, round) => `outputs/reviews/${tid}-${id}-r${round}.md`;

export function writerPrompt(task, tid, leads) {
  return [
    `JARVIS TASK ${task.id}, board task ${tid}: ${task.task}`,
    '',
    'Jarvis runs this drafting chain itself, without the coordinator, and you write the drafts. For each lead below, draft one outreach email sequence as the "Outreach sequence" row of .claude/skills/task-briefs/SKILL.md describes: the file outputs/outreach/<lead-id>.md with its frontmatter, Send schedule, ## Email N with Subject:, LinkedIn, If they reply, Claims used, For the reviewer and Self-review. Run that row\'s checks before you finish.',
    `Leads: ${leads.map((l) => `${l.company} (${l.id})`).join(', ')}.`,
    'Don\'t send anything, don\'t change lead statuses, and don\'t ask other agents: Jarvis sends each draft to the evaluator and records the result.',
    'End with the RESULT block from CLAUDE.md.',
  ].join('\n');
}

export function reviewerPrompt(task, tid, lead, round, { first = false, last = null } = {}) {
  return [
    `JARVIS TASK ${task.id}, board task ${tid}: review one outreach draft, ${draftPath(lead.id)} (lead ${lead.id}, ${lead.company}), with the outreach rubric in evaluation/rubrics.md. Work type: outreach, text a customer will read.`,
    'Jarvis runs the reviews itself, one evaluator per draft at the same time, so review only this draft.' + (first ? ` Yours is the first part: also run \`node scripts/leads.mjs gate --product ${lead.product || '<slug>'} --status all\`.` : ''),
    `Write the review to ${reviewPath(tid, lead.id, round)}, naming ${draftPath(lead.id)} in its header above the verdict line.`,
    last ? `This is round ${round}: re-review with the scoped-re-review skill. The last review is ${last}; the draft ends with the author's fix log.` : '',
    'End with the RESULT block from CLAUDE.md.',
  ].filter(Boolean).join('\n');
}

export function fixPrompt(task, tid, items) {
  return [
    `JARVIS TASK ${task.id}, board task ${tid}: revise these outreach drafts. Fix only the fixes each review marks blocking, and leave what passed:`,
    ...items.map((i) => `- ${draftPath(i.lead.id)} (${i.lead.company}): ${i.review}`),
    'End each draft with a short fix log: one line per fix number, what changed and where. Don\'t send anything and don\'t ask other agents.',
    'End with the RESULT block from CLAUDE.md.',
  ].join('\n');
}

// The verdict of a review file, if it was written after `since` and names the draft.
export function verdictOf(root, file, draft, since) {
  const abs = join(root, file);
  if (!existsSync(abs) || statSync(abs).mtimeMs < since) return null;
  const { verdict, names } = readReview(readFileSync(abs, 'utf8'), draft);
  return names ? verdict : null;
}

const scoreOf = (root, file) => {
  try {
    return /\b(?:PASS|REVISE|ESCALATE)\b[^\n]{0,40}?(\d{1,3})\s*\/\s*100/.exec(readFileSync(join(root, file), 'utf8'))?.[1] || '';
  } catch {
    return '';
  }
};

// Runs at most `n` jobs at once.
async function inBatches(jobs, n) {
  const out = [];
  for (let i = 0; i < jobs.length; i += n) out.push(...(await Promise.all(jobs.slice(i, i + n).map((job) => job()))));
  return out;
}

export async function runDraftLane({ task, root = ROOT, session, say = () => undefined }) {
  const ids = laneLeads(root, task);
  if (!ids.length) return null;
  const known = latestLeads(root);
  const leads = ids.map((id) => ({ id, company: known.get(id)?.company || id, product: known.get(id)?.product || '' }));
  const tid = nextTaskId(root);
  const names = leads.map((l) => l.company).join(', ');
  boardRow(root, [tid, `${task.id}: draft outreach sequences for ${names} (drafting lane, no coordinator)`, 'outreach', 'in_progress', leads.map((l) => draftPath(l.id)).join(', '), '']);
  const started = Date.now() - 1000;

  // 1. Draft.
  say('outreach', `Draft sequences for ${names}`);
  const wrote = await session(WRITER, writerPrompt(task, tid, leads), 'outreach');
  if (wrote.limitRejected) return { status: 'limit' };
  const fresh = (p) => existsSync(join(root, p)) && statSync(join(root, p)).mtimeMs >= started;
  const state = new Map(leads.map((l) => [l.id, { lead: l, verdict: fresh(draftPath(l.id)) ? null : 'NO DRAFT', review: '', round: 0 }]));

  // 2 and 3. Review every draft at once; revise the ones with blocking fixes, and review only those again.
  let open = leads.filter((l) => !state.get(l.id).verdict);
  for (let round = 1; round <= MAX_ROUNDS && open.length; round++) {
    const since = Date.now() - 1000;
    say('evaluator', `${round === 1 ? 'Review' : `Re-review (round ${round})`}: ${open.map((l) => l.company).join(', ')}`);
    const results = await inBatches(open.map((l, i) => () => session(REVIEWER, reviewerPrompt(task, tid, l, round, { first: round === 1 && i === 0, last: state.get(l.id).review || null }), 'evaluator')), AT_ONCE);
    if (results.some((r) => r.limitRejected)) return { status: 'limit' };
    for (const l of open) {
      const s = state.get(l.id);
      const file = reviewPath(tid, l.id, round);
      s.verdict = verdictOf(root, file, draftPath(l.id), since) || 'NO REVIEW';
      s.review = file;
      s.round = round;
    }
    const revise = open.filter((l) => state.get(l.id).verdict === 'REVISE');
    if (!revise.length || round === MAX_ROUNDS) break;
    say('outreach', `Fix the blocking items: ${revise.map((l) => l.company).join(', ')}`);
    const fixed = await session(WRITER, fixPrompt(task, tid, revise.map((l) => ({ lead: l, review: state.get(l.id).review }))), 'outreach');
    if (fixed.limitRejected) return { status: 'limit' };
    open = revise;
  }

  // 4. Record it: passed leads are drafted, the board row and the report say where everything is.
  const all = [...state.values()];
  const passed = all.filter((s) => s.verdict === 'PASS');
  const toDraft = passed.filter((s) => known.get(s.lead.id)?.status === 'qualified').map((s) => s.lead.id);
  if (toDraft.length) spawnSync(process.execPath, [join(root, 'scripts', 'leads.mjs'), 'set-status', toDraft.join(','), 'drafted', `${tid}: draft passed review`], { cwd: root, encoding: 'utf8' });
  const problem = all.filter((s) => s.verdict !== 'PASS');
  const status = problem.length ? 'blocked' : 'done';
  const verdictText = (s) => (s.review ? `${s.verdict}${scoreOf(root, s.review) ? ` ${scoreOf(root, s.review)}/100` : ''} (${s.review})` : s.verdict);
  boardRow(root, [tid, `${task.id}: draft outreach sequences for ${names} (drafting lane, no coordinator)`, 'outreach', problem.length ? 'blocked' : 'passed', leads.map((l) => draftPath(l.id)).join(', '), all.map((s) => `${s.lead.company} ${verdictText(s)}`).join('; ')]);
  const why = (s) => ({ 'NO DRAFT': 'the outreach agent wrote no draft', 'NO REVIEW': 'the evaluator wrote no review naming the draft', REVISE: `still has blocking fixes after ${s.round - 1} revision(s)`, ESCALATE: 'the evaluator escalated it to a person' })[s.verdict] || s.verdict;
  const summary = `${passed.length} of ${all.length} draft(s) passed review${passed.length ? ' and wait for you on the Emails page' : ''}.${problem.length ? ` Not passed: ${problem.map((s) => `${s.lead.company} (${why(s)})`).join('; ')}.` : ''}`;
  const report = `outputs/reports/${task.id}.md`;
  mkdirSync(join(root, 'outputs', 'reports'), { recursive: true });
  writeFileSync(join(root, report), [
    `# ${task.id}: drafts for ${names}`,
    '',
    '## Result',
    '',
    summary,
    passed.length ? 'Tick or cross each email on the Emails page: a tick sends it (during the pilot, [TEST] copies to Purab, Tanvi and Mohit only), a cross stops it.' : '',
    '',
    '## What was done',
    '',
    `Jarvis ran the drafting lane (board task ${tid}): the outreach agent drafted on Sonnet, then one evaluator per draft reviewed it on Opus, all at once${all.some((s) => s.round > 1) ? ', and drafts with blocking fixes went back once more' : ''}. No coordinator session.`,
    '',
    '| Lead | Draft | Review |',
    '|---|---|---|',
    ...all.map((s) => `| ${s.lead.company} (${s.lead.id}) | ${draftPath(s.lead.id)} | ${verdictText(s)} |`),
    '',
    '## Needs your approval',
    '',
    passed.length ? `Waiting for your approval on the Emails page: ${passed.map((s) => s.lead.company).join(', ')}.` : 'Nothing.',
    '',
    '## Questions for you',
    '',
    problem.length ? problem.map((s, i) => `${i + 1}. **${s.lead.company}.** ${why(s)}: read ${s.review || draftPath(s.lead.id)} and say whether to redraft it.`).join('\n') : 'None.',
    '',
    '## Lessons recorded',
    '',
    'None: the drafting lane records no lessons.',
    '',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'));
  return { status, report, summary };
}
