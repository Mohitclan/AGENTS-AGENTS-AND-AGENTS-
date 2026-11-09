// Two things mission control watches for a person while a task runs:
//   - stuck agents: an agent at work that has shown no new step for a while (the Kitchen Timer idea from Nonilion:
//     time spent in one state, with an alert);
//   - the task's time budget: how long the running task has taken against how long tasks usually take, with
//     warnings as the end comes near (Nonilion's meeting timer idea).
// No browser code here, so it is tested directly. Times are milliseconds since 1970.

export const STUCK_MIN = 10; // minutes without a new step before an agent at work counts as stuck
export const BUDGET = { fallback: 45, min: 20, max: 90 }; // minutes
export const WARN_AT = [15, 10, 5, 1, 0]; // minutes left when a warning is given; 0 means "over budget"

const BUSY = new Set(['working', 'researching']);
const at = (s) => Date.parse(String(s || '').replace(' ', 'T')); // queue times are local "YYYY-MM-DD HH:MM"

// Agents at work with no new step for STUCK_MIN minutes, longest first: [{ name, minutes, doing }].
export function stuckAgents(snap, now = Date.now(), limit = STUCK_MIN) {
  if (!snap?.live) return [];
  return (snap.agents || [])
    .filter((a) => BUSY.has(a.status) && a.lastAt)
    .map((a) => ({ name: a.name, doing: a.doing || '', minutes: Math.floor((now - Date.parse(a.lastAt)) / 60_000) }))
    .filter((a) => a.minutes >= limit)
    .sort((a, b) => b.minutes - a.minutes);
}

// How long a task usually takes: the median of the last ten finished tasks, a little over, kept within sensible
// bounds. With no history yet, the fallback.
export function usualMinutes(tasks = []) {
  const done = tasks
    .filter((t) => t.status !== 'running' && t.status !== 'queued' && t.started && t.finished)
    .map((t) => (at(t.finished) - at(t.started)) / 60_000)
    .filter((m) => m > 2 && Number.isFinite(m))
    .slice(0, 10);
  if (done.length < 3) return BUDGET.fallback;
  const sorted = [...done].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return Math.min(BUDGET.max, Math.ceil(Math.max(BUDGET.min, median * 1.15) / 5) * 5); // a little over, up to the next 5
}

// The running task against its budget: { id, elapsed, budget, left, level } with level 'ok', 'near' (5 minutes or
// less left) or 'over'. Null when nothing is running.
export function taskBudget(snap, now = Date.now()) {
  if (!snap?.live || !snap.running?.started) return null;
  const elapsed = Math.max(0, Math.floor((now - at(snap.running.started)) / 60_000));
  const budget = usualMinutes(snap.tasks);
  const left = budget - elapsed;
  return { id: snap.running.id, elapsed, budget, left, level: left < 0 ? 'over' : left <= 5 ? 'near' : 'ok' };
}

// The warning to give now, if a threshold was crossed since the last check: the minutes it is for, or null.
export function budgetWarning(prevLeft, left) {
  if (prevLeft === null || prevLeft === undefined) return null;
  // The most urgent threshold crossed (a long gap between checks can cross several).
  return [...WARN_AT].reverse().find((m) => prevLeft > m && left <= m) ?? null;
}
