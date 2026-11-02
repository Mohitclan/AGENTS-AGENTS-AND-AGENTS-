// Status simulator: a scripted, clearly labelled demo of a task, for testing avatars and the office
// without running agents. It never touches the server; views that use it show "Simulation".

const H = (agent, to, what) => ({ kind: 'handoff', agent, to, text: `${agent === 'coordinator' ? 'Handed work to' : 'Asked'} ${to}: ${what}` });
const R = (agent, text, status = 'ok') => ({ kind: 'result', agent, status, text });
const W = (agent, text) => ({ kind: 'web', agent, text });

// [ms from start, { agent: [state, what it's doing] }, ...events]
export const SCRIPT = [
  [0, { coordinator: ['working', 'Planning: find launch-active leads and draft emails'] }],
  [2200, { coordinator: ['waiting', 'Waiting for researcher'], researcher: ['working', 'Starting: find launch-active startups'] }, H('coordinator', 'researcher', 'Find launch-active startups')],
  [5200, { researcher: ['researching', 'Searched the web: Indian dev tools launching this month'] }, W('researcher', 'Searched the web: Indian dev tools launching this month')],
  [8200, { researcher: ['researching', 'Opened producthunt.com/topics/developer-tools'] }, W('researcher', 'Opened producthunt.com/topics/developer-tools')],
  [11000, { researcher: ['success', 'Finished: 5 candidates with launch dates'], coordinator: ['working', 'Reading the research'] }, R('researcher', 'Finished: 5 candidates with launch dates')],
  [13200, { coordinator: ['waiting', 'Waiting for lead-generator'], 'lead-generator': ['working', 'Scoring 5 candidates'], researcher: ['idle', ''] }, H('coordinator', 'lead-generator', 'Qualify 5 candidates')],
  [16000, { 'lead-generator': ['researching', 'Opened kitebyte.test/about'] }, W('lead-generator', 'Opened kitebyte.test/about')],
  [18400, { 'lead-generator': ['waiting', 'Waiting for knowledge-base'], 'knowledge-base': ['working', 'Checking the ICP in the fact sheet'] }, H('lead-generator', 'knowledge-base', 'Confirm the ICP')],
  [21600, { 'knowledge-base': ['success', 'Finished: the ICP matches'], 'lead-generator': ['working', 'Importing 3 leads'] }, R('knowledge-base', 'Finished: the ICP matches')],
  [24200, { 'lead-generator': ['success', 'Finished: 3 leads qualified'], 'knowledge-base': ['idle', ''], coordinator: ['waiting', 'Waiting for evaluator'], evaluator: ['working', 'Reviewing the lead batch'] }, R('lead-generator', 'Finished: 3 leads qualified'), H('coordinator', 'evaluator', 'Review the lead batch')],
  [28000, { evaluator: ['success', 'PASS 86/100'], 'lead-generator': ['idle', ''] }, { kind: 'review', agent: 'evaluator', verdict: 'PASS', text: 'Reviewed the batch: PASS 86/100' }],
  [30200, { evaluator: ['idle', ''], coordinator: ['waiting', 'Waiting for outreach'], outreach: ['working', 'Drafting an email sequence for Kitebyte'] }, H('coordinator', 'outreach', 'Draft a sequence for Kitebyte')],
  [34600, { outreach: ['success', 'Finished: 3 emails drafted, nothing sent'], coordinator: ['waiting', 'Waiting for sales'], sales: ['working', 'Preparing call notes'] }, R('outreach', 'Finished: 3 emails drafted, nothing sent'), H('coordinator', 'sales', 'Prepare call notes')],
  [38000, { sales: ['error', 'No result after 3 tries: handing to the backup'], outreach: ['idle', ''] }, { kind: 'fallback', agent: 'sales', status: 'failed', text: 'FALLBACK: sales failed 3 times; run sales-fallback' }],
  [41000, { sales: ['working', 'Backup: preparing call notes'] }, H('coordinator', 'sales', 'Call notes (backup)')],
  [44600, { sales: ['success', 'Finished on the backup'], coordinator: ['working', 'Writing the report'] }, R('sales', 'Finished on the backup')],
  [47200, { coordinator: ['waiting', 'Waiting for your review of 3 drafts'], sales: ['idle', ''], marketing: ['paused', 'Held: the plan window is over 85%'], 'docs-handler': ['paused', 'Held: the plan window is over 85%'] }, { kind: 'run', agent: 'coordinator', text: 'Task finished: 3 drafts wait for your review' }],
  [54000, { coordinator: ['idle', ''], marketing: ['idle', ''], 'docs-handler': ['idle', ''] }],
];
const LOOP_MS = 57000;

export function createSimulator(onTick) {
  let timers = [];
  let running = false;
  const states = {};
  let n = 0;
  const play = () => {
    for (const k of Object.keys(states)) delete states[k];
    onTick({ states: { ...states }, events: [], reset: true });
    timers = SCRIPT.map(([at, set, ...events]) => setTimeout(() => {
      for (const [agent, [status, doing]] of Object.entries(set)) states[agent] = { status, doing };
      const stamped = events.map((e) => ({ status: 'ok', ...e, id: `sim-${n += 1}`, at: new Date().toISOString(), simulated: true }));
      onTick({ states: { ...states }, events: stamped });
    }, at));
    timers.push(setTimeout(play, LOOP_MS));
  };
  return {
    start() {
      if (running) return;
      running = true;
      play();
    },
    stop() {
      running = false;
      timers.forEach(clearTimeout);
      timers = [];
    },
    get running() {
      return running;
    },
  };
}
