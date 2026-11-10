// The Logs page as a story: events grouped by task, one plain line per step, noise kept out of sight.
// Pure functions (no document), so node tests can run them. Events are the feed of control.mjs:
// { at, agent, kind, status, text, task, to, ref, verdict }.

// Steps that are plumbing, not story: file reads, searches, shell checks, tool calls, plans.
const NOISE = new Set(['read', 'command', 'tool', 'plan']);
export const isNoise = (e) => NOISE.has(e.kind);
// A problem: a failed step, or one of the kinds that only exist when something went wrong.
export const isProblem = (e) => e.status === 'failed' || ['error', 'fallback', 'blocked', 'revise'].includes(e.kind);
export const TASK_BAD = new Set(['failed', 'blocked']);

const time = (v) => {
  const t = Date.parse(String(v || '').replace(' ', 'T'));
  return Number.isNaN(t) ? 0 : t;
};

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const clip = (s, n = 140) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const after = (text) => clip(String(text || '').split(': ').slice(1).join(': '), 110);

// Seconds, minutes or hours as a person says them: "40 s", "12 min", "1 h 05 min".
export function duration(ms) {
  if (!(ms >= 0)) return '';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

// Merges a run of similar steps into one plain line. `label` turns an agent ID into its name.
// Steps come oldest first. Each line: { at, agent, text, bad, ref, count, ids }.
export function storyLines(events, label = (n) => n) {
  const lines = [];
  const last = () => lines.at(-1);
  for (const e of [...events].filter((x) => !isNoise(x)).sort((a, b) => time(a.at) - time(b.at))) {
    const who = label(e.agent);
    const bad = isProblem(e);
    const prev = last();
    const same = (kind, extra = true) => prev && prev.kind === kind && prev.agent === e.agent && !prev.bad && !bad && extra;
    if (e.kind === 'handoff' && same('handoff', prev?.to === e.to)) {
      prev.count += 1;
      prev.what.push(after(e.text));
      prev.text = `${who} handed work to ${plural(prev.count, label(e.to).toLowerCase())}`;
      continue;
    }
    if (e.kind === 'web' && same('web')) { prev.count += 1; prev.text = `${who} looked up ${plural(prev.count, 'web page')}`; continue; }
    if (e.kind === 'file' && same('file')) { prev.count += 1; prev.text = `${who} saved ${plural(prev.count, 'file')}`; continue; }
    if (e.kind === 'review' && same('review')) {
      prev.count += 1;
      if (e.verdict === 'PASS') prev.passed += 1;
      prev.text = `${who} reviewed ${plural(prev.count, 'deliverable')}: ${prev.passed} passed${prev.count > prev.passed ? `, ${prev.count - prev.passed} sent back` : ''}`;
      prev.bad = false;
      continue;
    }
    const line = { at: e.at, agent: e.agent, kind: e.kind, to: e.to, ref: e.ref || '', bad, count: 1, passed: 0, what: [], text: '' };
    if (e.kind === 'handoff') { line.what.push(after(e.text)); line.text = `${who} handed work to ${label(e.to)}: ${after(e.text)}`.replace(/: $/, ''); }
    else if (e.kind === 'web') line.text = `${who} looked up a web page`;
    else if (e.kind === 'file') line.text = `${who} saved ${clip(e.text.replace(/^(Wrote|Edited|Saved|Created)\s+/i, ''), 80)}`;
    else if (e.kind === 'review') { line.passed = e.verdict === 'PASS' ? 1 : 0; line.bad = false; line.text = `${who} reviewed a deliverable: ${e.verdict === 'PASS' ? '1 passed' : `${e.verdict || 'no verdict'}, sent back`}`; }
    else if (e.kind === 'revise') line.text = `${who}: ${clip(e.text)}`;
    else if (e.kind === 'result') line.text = bad ? `${who} could not finish: ${clip(e.text)}` : `${who} finished: ${clip(e.text)}`;
    else if (e.kind === 'error') line.text = `${who} hit a problem: ${clip(e.text)}`;
    else if (e.kind === 'fallback') line.text = `${who} failed, so its backup took over: ${clip(e.text)}`;
    else if (e.kind === 'blocked') line.text = `${who} is stuck. ${clip(e.text.replace(/^Blocked:\s*/, ''))}`;
    else if (e.kind === 'start') line.text = `${who} started: ${clip(e.text)}`;
    else line.text = e.agent === 'system' || e.kind === 'run' ? clip(e.text) : `${who}: ${clip(e.text)}`;
    lines.push(line);
  }
  return lines;
}

// One group per task, newest first, plus a last group of steps that belong to no task (sends, replies, lead moves).
// Running tasks sort first. `tasks` is the state's task list (id, title, status, product, started, finished, report).
export function buildGroups(events, tasks = [], now = Date.now()) {
  const byTask = new Map();
  const loose = [];
  for (const e of events) {
    if (e.task) (byTask.get(e.task) || byTask.set(e.task, []).get(e.task)).push(e);
    else loose.push(e);
  }
  const known = new Map(tasks.map((t) => [t.id, t]));
  const groups = [...byTask.entries()].map(([id, evs]) => {
    const t = known.get(id);
    const started = t?.started ? time(t.started) : Math.min(...evs.map((e) => time(e.at)).filter(Boolean));
    const ended = t?.finished ? time(t.finished) : 0;
    const running = t?.status === 'running';
    return {
      id, title: t?.title || id, product: t?.product || null, status: t?.status || 'unknown', report: t?.report || '', note: t?.note || '', running,
      started: Number.isFinite(started) && started ? started : 0, finished: ended,
      ms: started && (ended || running) ? (ended || now) - started : null,
      events: evs,
    };
  });
  groups.sort((a, b) => (Number(b.running) - Number(a.running)) || (b.started - a.started) || b.id.localeCompare(a.id));
  if (loose.length) groups.push({ id: '', title: 'Not part of a task', product: null, status: 'other', report: '', running: false, started: 0, finished: 0, ms: null, events: loose });
  return groups;
}

// Applies the page's filters: { product, agent, problems, q }. A group stays when any of its steps does; with a
// search that matches the header (task ID, title) the whole group stays.
export function filterGroups(groups, { product = '', agent = '', problems = false, q = '' } = {}) {
  const needle = q.trim().toLowerCase();
  const out = [];
  for (const g of groups) {
    if (product && g.product !== product) continue;
    const head = `${g.id} ${g.title}`.toLowerCase();
    const headHit = !!needle && head.includes(needle);
    const events = g.events.filter((e) => (!agent || e.agent === agent) && (!problems || isProblem(e))
      && (headHit || !needle || `${e.text} ${e.ref || ''} ${e.agent}`.toLowerCase().includes(needle)));
    if (!events.length) {
      // a failed task with no logged step of its own still counts as a problem when only problems are asked for
      if (!(problems && TASK_BAD.has(g.status) && !agent && !needle)) continue;
    }
    out.push({ ...g, events, problems: events.filter(isProblem).length });
  }
  return out;
}
