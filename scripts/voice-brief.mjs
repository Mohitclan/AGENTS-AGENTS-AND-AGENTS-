#!/usr/bin/env node
// A plain-English briefing of what the team is doing right now, written to be read aloud by the voice
// agent. Read-only: it reads the same live run logs as mission control and writes nothing.
//
//   node scripts/voice-brief.mjs              the whole team
//   node scripts/voice-brief.mjs <agent>      one agent, by name or by a plain word (leads, research, owl, ...)
import { isMain, ROOT } from './_shared.mjs';

// Words people use for each agent: its name, its gem, and a few plain ones.
const WORDS = {
  coordinator: ['coordinator', 'captain', 'team'],
  evaluator: ['evaluator', 'owl', 'reviewer', 'review'],
  'knowledge-base': ['knowledge', 'panda', 'knowledge base'],
  researcher: ['researcher', 'research'],
  'lead-generator': ['lead generator', 'leads', 'lead', 'cat'],
  outreach: ['outreach', 'bunny', 'emails'],
  sales: ['sales', 'penguin'],
  marketing: ['marketing', 'creative'],
  'demo-handler': ['demo', 'demos', 'fox'],
  'docs-handler': ['docs', 'scribe', 'documentation'],
  developer: ['developer', 'code buddy', 'dev', 'code'],
};

const clip = (s, n = 160) => (String(s).length > n ? `${String(s).slice(0, n - 1).trimEnd()}…` : String(s));
// A task title as the end of a spoken sentence: no trailing full stop to double up with ours.
const title = (s, n) => clip(s, n).replace(/[.\s]+$/, '');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// The agent a person means, or null: "the lead generator", "leads", "owl" and "evaluator" all work.
export function findAgent(snap, said) {
  const word = String(said || '').toLowerCase().replace(/[-_]/g, ' ').replace(/^the\s+/, '').replace(/\s+agent$/, '').trim();
  if (!word) return null;
  const names = snap.agents.map((a) => a.name);
  const exact = names.find((n) => n.replace(/-/g, ' ') === word);
  if (exact) return exact;
  return names.find((n) => (WORDS[n] || []).includes(word)) || names.find((n) => n.replace(/-/g, ' ').includes(word)) || null;
}

// Local "YYYY-MM-DD HH:MM", as Jarvis writes it, or an ISO time, to minutes ago.
const minutesAgo = (when, now) => {
  const t = Date.parse(String(when).includes('T') ? when : String(when).replace(' ', 'T'));
  return Number.isNaN(t) ? null : Math.max(0, Math.round((now - t) / 60_000));
};
const since = (when, now) => {
  const m = minutesAgo(when, now);
  if (m === null) return '';
  if (m < 1) return 'just now';
  return m < 90 ? `${plural(m, 'minute')} ago` : `${Math.round(m / 60)} hours ago`;
};
const clock = (when) => String(when).slice(-5);

export function teamBrief(snap, now = Date.now()) {
  const out = [];
  if (snap.running) {
    out.push(`Right now the team is on ${snap.running.id}: ${title(snap.running.title, 110)}. It started at ${clock(snap.running.started)}, ${since(snap.running.started, now)}.`);
    const busy = snap.agents.filter((a) => ['working', 'researching'].includes(a.status));
    out.push(busy.length
      ? `Working now: ${busy.map((a) => `${a.name.replace(/-/g, ' ')}, ${clip(a.doing || 'working', 90)}`).join('; ')}.`
      : 'The coordinator is planning or checking; no specialist is busy at this moment.');
  } else {
    const last = snap.tasks[0];
    out.push('Nothing is running right now.');
    if (last) out.push(`The last task was ${last.id}, ${title(last.title, 90)}. It ${last.status === 'done' ? 'finished' : `ended as ${last.status.replace('_', ' ')}`}${last.finished ? ` at ${clock(last.finished)}` : ''}.`);
    const queued = snap.tasks.filter((t) => t.status === 'queued').length;
    if (queued) out.push(`${plural(queued, 'task is', 'tasks are')} waiting in the queue.`);
  }
  const failing = snap.agents.filter((a) => a.status === 'error');
  if (failing.length) out.push(`Trouble: ${failing.map((a) => `${a.name.replace(/-/g, ' ')}, ${clip(a.doing || 'failed', 90)}`).join('; ')}.`);
  const u = snap.usage;
  if (u?.fiveHour || u?.weekly) out.push(`Plan usage: ${u.fiveHour ? `${u.fiveHour.reset ? 0 : u.fiveHour.used} percent of the five hour window` : ''}${u.fiveHour && u.weekly ? ', ' : ''}${u.weekly ? `${u.weekly.reset ? 0 : u.weekly.used} percent of the weekly window` : ''}.`);
  const k = snap.kpis;
  out.push(`Leads: ${k.found} found, ${k.qualified} qualified, ${k.drafted} drafted, ${k.contacted} contacted, ${k.replied} replied.`);
  const waiting = snap.flags.filter((f) => f.kind !== 'knowledge');
  if (waiting.length) out.push(`${plural(waiting.length, 'thing needs', 'things need')} a person. The first ${waiting.length > 3 ? 'three are' : waiting.length === 1 ? 'is' : 'are'}: ${waiting.slice(0, 3).map((f) => clip(f.text, 70)).join('; ')}.`);
  else out.push('Nothing is waiting for a person.');
  if (snap.pilot) out.push('The pilot is on: only test copies go to Purab, Tanvi and Mohit, and no lead is emailed.');
  return out.join(' ');
}

export function agentBrief(snap, said, now = Date.now()) {
  const name = findAgent(snap, said);
  if (!name) return `I don't know an agent called ${said}. The team is ${snap.agents.map((a) => a.name.replace(/-/g, ' ')).join(', ')}.`;
  const a = snap.agents.find((x) => x.name === name);
  const label = name.replace(/-/g, ' ');
  const out = [];
  const doing = a.doing ? clip(a.doing, 140) : '';
  out.push(['working', 'researching'].includes(a.status) ? `The ${label} is working: ${doing}.` : a.status === 'idle' ? `The ${label} is idle.` : `The ${label} is ${a.status}${doing ? `: ${doing}` : ''}.`);
  if (a.lastAt) out.push(`Its last activity was ${since(a.lastAt, now)}.`);
  const c = a.counts;
  out.push(`It has ${plural(c.outputs, 'saved output')}, ${plural(c.tasks, 'task')} on the board and ${plural(c.fails, 'failure')} this week.`);
  return out.join(' ');
}

if (isMain(import.meta.url)) {
  const { snapshot } = await import('./control.mjs'); // loaded only here, so mission control can import this file
  const snap = snapshot(ROOT);
  const said = process.argv.slice(2).join(' ').trim();
  console.log(said ? agentBrief(snap, said) : teamBrief(snap));
}
