#!/usr/bin/env node
// Questions for you: what the team's reports ask a person, as cards a person answers in mission control.
//
// Every Jarvis report can end with a "## Questions for you" section of numbered items. Each item becomes a card:
//   - its bold first words are the title; "Yes: ... No: ..." in the text become one-tap answers;
//   - a date after "by" ("answer by 2026-11-08") is its deadline;
//   - leads it names (by ID, or by the company name of a lead on hold) can have their hold lifted with the answer.
// Answers are kept in ops/answers.jsonl with who gave them. Lifting a hold runs `leads.mjs release` on the
// person's click (only a person may lift a hold). "Send answers to the team" queues one Jarvis task that applies
// the answers; nothing runs until a person sends them.
//
//   node scripts/questions.mjs          the open questions, in plain words
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, isMain } from './_shared.mjs';
import { latestLeads } from './outreach.mjs';

const LOG = 'ops/answers.jsonl';
const DAYS = 21; // reports older than this drop off the page
const RECENT_DAYS = 4; // questions newer than this are the ones that count; older ones are folded away
const HEADING = /^##\s+Questions for (you|the founders|a person|people)\b.*$/im;

const readJson = (f, fallback) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return fallback; } };
const readJsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
const plain = (s) => String(s).replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();

// The numbered questions of one report's "Questions for you" section: [{ n, title, text, options, due }].
export function parseQuestions(markdown) {
  const m = HEADING.exec(markdown);
  if (!m) return [];
  const rest = markdown.slice(m.index + m[0].length);
  const end = rest.search(/^##\s/m);
  const section = end < 0 ? rest : rest.slice(0, end);
  const items = [];
  for (const line of section.split('\n')) {
    const start = /^(\d+)\.\s+(.*)$/.exec(line);
    if (start) items.push({ n: Number(start[1]), raw: [start[2]] });
    else if (items.length && line.trim() && /^\s/.test(line)) items.at(-1).raw.push(line.trim());
    else if (items.length && !line.trim()) items.at(-1).gap = true;
    else if (items.length && items.at(-1).gap) break; // a closing paragraph after the list is not part of the last item
  }
  return items.map(({ n, raw }) => {
    const body = raw.join('\n');
    const bold = /^\*\*(.+?)\*\*\s*/.exec(raw[0]);
    const title = plain(bold ? bold[1] : raw[0].split(/(?<=[.?!])\s/)[0]).replace(/[.:]$/, '');
    const text = plain(bold ? body.slice(bold[0].length) : body);
    const yes = /\bYes:\s*(.+?)(?=\s+No:|$)/s.exec(text);
    const no = /\bNo:\s*(.+?)(?=\s+(?:After|Once|Then|If)\b|$)/s.exec(text);
    const first = (s) => s.trim().split(/(?<=[.;])\s/)[0].replace(/\s+-\s.*$/, '');
    const options = yes && no ? [{ label: 'Yes', detail: first(yes[1]) }, { label: 'No', detail: first(no[1]) }] : [];
    const due = /\b(?:by|before)\s+(?:[A-Z][a-z]{2}\s+)?(\d{4}-\d{2}-\d{2})\b/.exec(body)?.[1] || null;
    return { n, title, text, options, due };
  });
}

// Leads a question is about: IDs it names, and leads on hold whose company name it mentions.
function leadsIn(text, leads) {
  const out = new Map();
  for (const id of text.match(/\bL-[0-9a-f]{8}\b/g) || []) if (leads.has(id)) out.set(id, leads.get(id));
  for (const l of leads.values()) {
    if (!l.hold || out.has(l.id)) continue;
    const name = String(l.company || '').split(/\s*\(/)[0].trim();
    if (name.length >= 4 && text.toLowerCase().includes(name.toLowerCase())) out.set(l.id, l);
  }
  return [...out.values()].map((l) => ({ id: l.id, company: l.company, held: !!l.hold }));
}

// Every question from recent reports, newest first, with its answer if it has one.
export function questionsState(root = ROOT) {
  const queue = readJson(join(root, 'ops', 'queue.json'), []);
  const archived = new Set(readJson(join(root, 'ops', 'archive', 'archived.json'), []).map((a) => a.id));
  const leads = latestLeads(root);
  const answers = new Map();
  const sent = new Set();
  for (const e of readJsonl(join(root, LOG))) {
    if (e.kind === 'answer') answers.set(e.id, e);
    if (e.kind === 'sent') for (const id of e.ids || []) sent.add(id);
    // Dismissed: no longer relevant. It counts as dealt with and is never sent to the team.
    if (e.kind === 'dismiss') for (const id of e.ids || []) { answers.set(id, { choice: 'Dismissed', note: '', by: e.by, at: e.at, dismissed: true }); sent.add(id); }
  }
  const cutoff = Date.now() - DAYS * 86_400_000;
  const recentCut = Date.now() - RECENT_DAYS * 86_400_000;
  const reports = [];
  const dir = join(root, 'outputs', 'reports');
  const titles = new Map(queue.map((t) => [t.id, t.task]));
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      const task = /^((?:J|T)-\d{8}-\d+)\.md$/.exec(f)?.[1];
      if (!task || archived.has(task)) continue;
      const path = join(dir, f);
      // The task ID carries the day it ran (J-20261106-02); a file's own date changes whenever it is touched.
      const d = /-(\d{4})(\d{2})(\d{2})-/.exec(task);
      const at = d ? Date.parse(`${d[1]}-${d[2]}-${d[3]}T23:59:59`) : statSync(path).mtimeMs;
      if (at < cutoff) continue;
      reports.push({ task, file: `outputs/reports/${f}`, at, text: readFileSync(path, 'utf8') });
    }
  }
  reports.sort((a, b) => b.at - a.at || b.task.localeCompare(a.task));
  const list = [];
  for (const r of reports) {
    for (const q of parseQuestions(r.text)) {
      const id = `${r.task}#${q.n}`;
      const a = answers.get(id);
      list.push({ id, task: r.task, taskTitle: titles.get(r.task) || '', report: r.file, asked: new Date(r.at).toISOString(), recent: r.at >= recentCut, ...q, leads: leadsIn(`${q.title} ${q.text}`, leads), answer: a ? { choice: a.choice, note: a.note, by: a.by, at: a.at, released: a.released || [], sent: sent.has(id), dismissed: !!a.dismissed } : null });
    }
  }
  return { open: list.filter((q) => !q.answer && q.recent).length, older: list.filter((q) => !q.answer && !q.recent).length, unsent: list.filter((q) => q.answer && !q.answer.sent).length, questions: list };
}

// Records a person's answer, and lifts the holds they ticked. Returns { ok, message }.
export function answerQuestion(root, { id, choice = '', note = '', release = [], by = 'a person' }) {
  const q = questionsState(root).questions.find((x) => x.id === id);
  if (!q) return { ok: false, message: 'That question was not found.' };
  const answer = String(choice || '').trim();
  const words = String(note || '').trim().slice(0, 2000);
  if (!answer && !words) return { ok: false, message: 'Choose an answer or write one.' };
  const released = [];
  const failed = [];
  for (const leadId of [].concat(release)) {
    if (!q.leads.some((l) => l.id === leadId && l.held)) continue;
    const why = `Answered by ${by} in mission control on ${new Date().toISOString().slice(0, 10)}: ${q.title}: ${[answer, words].filter(Boolean).join('. ')}`.slice(0, 400);
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'leads.mjs'), 'release', leadId, why], { cwd: root, encoding: 'utf8' });
    (r.status === 0 ? released : failed).push(leadId);
  }
  appendFileSync(join(root, LOG), `${JSON.stringify({ at: new Date().toISOString(), kind: 'answer', id, task: q.task, title: q.title, choice: answer, note: words, by, released })}\n`);
  const parts = [`Saved your answer to "${q.title}".`];
  if (released.length) parts.push(`Hold lifted on ${released.length} lead(s).`);
  if (failed.length) parts.push(`Couldn't lift the hold on ${failed.join(', ')}.`);
  return { ok: true, message: parts.join(' ') };
}

// The Jarvis task that hands the answered, unsent questions to the team, and the IDs it covers.
export function answersTask(root, by = 'a person') {
  const unsent = questionsState(root).questions.filter((q) => q.answer && !q.answer.sent);
  if (!unsent.length) return null;
  const lines = unsent.map((q) => `${q.id} "${q.title}": ${[q.answer.choice, q.answer.note].filter(Boolean).join(': ')}${q.answer.released.length ? ` (hold already lifted on ${q.answer.released.join(', ')})` : ''}`);
  return {
    ids: unsent.map((q) => q.id),
    task: [
      `${by} answered ${unsent.length} open question(s) in mission control on ${new Date().toISOString().slice(0, 10)}. These answers are the person's decisions.`,
      `Apply each one: update the leads it covers (set-status, next actions; holds named as lifted are already lifted), and add a decision to main memory where the answer is a rule for the future.`,
      'Answers:',
      ...lines.map((l, i) => `${i + 1}. ${l}`),
      'Report what you changed for each answer. Draft nothing new and send nothing.',
    ].join('\n'),
  };
}

// Marks questions as no longer relevant (an older question the team has moved past).
export function dismissQuestions(root, ids, by = 'a person') {
  const known = new Set(questionsState(root).questions.map((q) => q.id));
  const list = [].concat(ids).filter((id) => known.has(id));
  if (!list.length) return { ok: false, message: 'No such questions.' };
  appendFileSync(join(root, LOG), `${JSON.stringify({ at: new Date().toISOString(), kind: 'dismiss', ids: list, by })}\n`);
  return { ok: true, message: `Dismissed ${list.length} question(s).` };
}

export function markSent(root, ids, task, by) {
  appendFileSync(join(root, LOG), `${JSON.stringify({ at: new Date().toISOString(), kind: 'sent', ids, task, by })}\n`);
}

if (isMain(import.meta.url)) {
  const s = questionsState();
  const open = s.questions.filter((q) => !q.answer && q.recent);
  if (!open.length) console.log('No open questions.');
  for (const q of open) console.log(`${q.id}: ${q.title}${q.due ? ` (answer by ${q.due})` : ''}${q.options.length ? ` [${q.options.map((o) => o.label).join(' / ')}]` : ''}`);
  if (s.older) console.log(`${s.older} older question(s) are folded away on the Questions page.`);
  if (s.unsent) console.log(`${s.unsent} answer(s) not sent to the team yet.`);
}
