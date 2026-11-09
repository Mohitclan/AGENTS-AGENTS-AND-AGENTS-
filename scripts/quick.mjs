// Quick answers: a short question about where things stand ("how many leads", "which emails are waiting", "what's
// running", "how much of the plan is used") is answered at once from the files, instead of starting an agent run
// for it. A run costs at least a coordinator session (about $2 to $3.50 of plan use at list prices, 2026-11-09); these
// answers cost nothing. The task box and voice send every task through quickAnswer first; anything that asks for
// work (find, draft, write, research...) goes to the team as before.
//
//   quickAnswer(text, root) -> one or two plain sentences, or null when it isn't a quick question
//
// No browser code here, so it is tested directly.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './_shared.mjs';
import { latestLeads, outreachState } from './outreach.mjs';
import { questionsState } from './questions.mjs';

const WORK = /\b(find|draft|write|research|create|build|send|post|update|fix|review|prepare|make|add|remove|delete|change|analy[sz]e|compare|scrape|look for|search)\b|\bplan (a|an|our|my|the next|for)\b/;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const readJson = (f, fallback) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};
const clock = (sec) => new Date(sec * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const ANSWERS = [
  {
    // "How many leads do we have?", "leads by status", "pipeline summary", "count the leads by status"
    test: /\b(how many|count|number of|total)\b[^.]*\bleads?\b|\bleads? (by|per) status\b|\b(lead|pipeline) (count|counts|status|summary|numbers)\b|^(show|list) (me )?(the |my |all )?(leads|pipeline)$/,
    answer(root) {
      const leads = [...latestLeads(root).values()];
      if (!leads.length) return 'There are no leads yet.';
      const by = {};
      for (const l of leads) by[l.status] = (by[l.status] || 0) + 1;
      const order = ['qualified', 'new', 'drafted', 'approved', 'contacted', 'replied', 'meeting', 'trial', 'won', 'lost', 'disqualified'];
      const parts = order.filter((s) => by[s]).map((s) => `${by[s]} ${s}`);
      const held = leads.filter((l) => l.hold).length;
      const products = [...new Set(leads.map((l) => l.product).filter(Boolean))];
      return `There are ${plural(leads.length, 'lead')}${products.length > 1 ? ` across ${products.length} products` : products[0] ? ` for ${products[0]}` : ''}: ${parts.join(', ')}.${held ? ` ${held} ${held === 1 ? 'is' : 'are'} on hold for a person's answer.` : ''}`;
    },
  },
  {
    // "Which emails are waiting?", "how many drafts are pending", "outreach status"
    test: /\b(how many|which|what|any)\b[^.]*\b(e-?mails?|drafts?)\b[^.]*\b(waiting|pending|ready|approve|approval|to approve)\b|\bpending (e-?mails?|drafts?)\b|\boutreach status\b/,
    answer(root) {
      const o = outreachState(root);
      const pending = o.emails.filter((e) => e.state === 'pending');
      const by = new Map();
      for (const e of pending) by.set(e.company, (by.get(e.company) || 0) + 1);
      const inReview = o.drafts.filter((d) => ['in-review', 'revise', 'changed'].includes(d.state)).length;
      const toDraft = o.runs.reduce((n, r) => n + r.ready.length, 0);
      return [
        pending.length ? `${plural(pending.length, 'email')} ${pending.length === 1 ? 'is' : 'are'} waiting for your tick or cross on the Emails page: ${[...by].map(([c, n]) => `${c} ${n}`).join(', ')}.` : 'No email is waiting for your decision.',
        inReview ? `${plural(inReview, 'draft')} ${inReview === 1 ? 'is' : 'are'} still in review.` : '',
        toDraft ? `${plural(toDraft, 'lead')} can be drafted now.` : '',
      ].filter(Boolean).join(' ');
    },
  },
  {
    // "Any open questions?", "how many questions for me"
    test: /\b(how many|which|what|any)\b[^.]*\bquestions?\b|\bopen questions\b|\bquestions for me\b/,
    answer(root) {
      const q = questionsState(root);
      return q.open ? `You have ${plural(q.open, 'open question')} on the Questions page.${q.unsent ? ` ${plural(q.unsent, 'answer')} ${q.unsent === 1 ? 'is' : 'are'} not sent to the team yet.` : ''}` : 'No questions are waiting for you.';
    },
  },
  {
    // "What's running?", "is anything queued", "queue status"
    test: /\b(what('s| is)|anything|is (a|any) (task|run))\b[^.]*\b(running|queued|in the queue|going)\b|\bqueue status\b/,
    answer(root) {
      const queue = readJson(join(root, 'ops', 'queue.json'), []);
      const running = queue.find((t) => t.status === 'running');
      const queued = queue.filter((t) => t.status === 'queued').length;
      const short = (s) => (s.length > 90 ? `${s.slice(0, 89)}…` : s);
      return `${running ? `${running.id} is running: ${short(running.task)}.` : 'Nothing is running.'} ${queued ? `${plural(queued, 'task')} ${queued === 1 ? 'is' : 'are'} queued.` : 'Nothing is queued.'}`;
    },
  },
  {
    // "How much of the plan is used?", "token usage", "5-hour limit"
    test: /\b(plan|token|usage|limit)s? (usage|left|used|status)\b|\bhow much\b[^.]*\b(plan|limit|usage|tokens?)\b|\b(5|five)[- ]hour (window|limit)\b|\bweekly (window|limit)\b/,
    answer(root) {
      const w = readJson(join(root, 'ops', 'runs', 'plan-limits.json'), null)?.windows;
      if (!w) return 'The plan\'s usage shows up after the first task runs.';
      const line = (label, x) => (!x ? '' : x.resetsAt * 1000 < Date.now() ? `the ${label} window has reset` : `the ${label} window is ${Math.round(x.utilization * 100)}% used (resets ${clock(x.resetsAt)})`);
      const parts = [line('5-hour', w.five_hour), line('weekly', w.seven_day)].filter(Boolean);
      return `At the last run, ${parts.join(', and ')}.`;
    },
  },
];

export function quickAnswer(text, root = ROOT) {
  const t = String(text || '').toLowerCase().replace(/^(please|hey|ok|okay|so|can you|could you|tell me|let me know)\s+/g, '').replace(/[?.!]+$/, '').trim();
  if (!t || t.length > 160 || WORK.test(t)) return null;
  const hit = ANSWERS.find((a) => a.test.test(t));
  if (!hit || !existsSync(root)) return null;
  try {
    return hit.answer(root);
  } catch {
    return null; // a file it reads is broken: let the team handle the question
  }
}
