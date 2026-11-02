// The demo: a scripted, narrated walk through one whole task, for showing how the team works without
// running agents. It never touches the server, and every view that plays it says "Simulation".
// createDemo() gives play, pause, speed, restart and progress; createSimulator() is the simple
// looping version the gallery uses.

const TASK = 'Find 3 launch-active leads for MotionRepo and draft emails for the best one';
const PLAN = ['Research launches', 'Find and score leads', 'Review the leads', 'Draft the emails', 'Review the drafts'];

// One step: at (ms at 1x), caption, set { agent: [state, doing, backup?] }, events, board changes.
export const STEPS = [
  { at: 0, caption: 'You give the team a task.', board: { title: TASK, plan: [], leads: 0, drafts: 0, approvals: 0 }, events: [{ kind: 'task', agent: 'coordinator', text: TASK }] },
  { at: 2600, caption: 'The Captain plans the work and writes it on the board.', set: { coordinator: ['working', 'Planning the task'] } },
  { at: 4800, board: { plan: PLAN.map((text) => ({ text, done: false })) }, events: [{ kind: 'plan', agent: 'coordinator', text: 'Wrote a 5-step plan' }] },
  { at: 6800, caption: 'Each step goes to the right specialist.', set: { coordinator: ['waiting', 'Waiting for the Researcher'], researcher: ['working', 'Reading the brief'] }, events: [{ kind: 'handoff', agent: 'coordinator', to: 'researcher', text: 'Handed work to researcher: Find launch-active startups' }] },
  { at: 10200, caption: 'The Researcher searches the web.', set: { researcher: ['researching', 'Searched the web: Indian dev tools launching this month'] }, events: [{ kind: 'web', agent: 'researcher', text: 'Searched the web: Indian dev tools launching this month' }] },
  { at: 12800, set: { researcher: ['researching', 'Opened producthunt.com/topics/developer-tools'] }, events: [{ kind: 'web', agent: 'researcher', text: 'Opened https://producthunt.com/topics/developer-tools' }] },
  { at: 15200, caption: 'A blocked site is logged, not hidden, and another source is tried.', set: { researcher: ['researching', 'Peerlist blocked us: trying GitHub instead'] }, events: [{ kind: 'error', agent: 'researcher', status: 'failed', text: 'Opened https://peerlist.io/launchpad failed: 403' }] },
  { at: 17800, set: { researcher: ['researching', 'Opened github.com/topics/cli'] }, events: [{ kind: 'web', agent: 'researcher', text: 'Opened https://github.com/topics/cli' }] },
  { at: 20200, set: { researcher: ['working', 'Writing up 5 candidates'] }, events: [{ kind: 'file', agent: 'researcher', ref: 'outputs/research/launch-candidates.md', text: 'Wrote outputs/research/launch-candidates.md' }] },
  { at: 22200, caption: 'Finished work goes back to the Captain’s table.', set: { researcher: ['success', 'Finished: 5 candidates with launch dates'], coordinator: ['working', 'Reading the research'] }, board: { done: 0 }, events: [{ kind: 'result', agent: 'researcher', text: 'Finished: 5 candidates with launch dates' }] },
  { at: 25200, caption: 'The Lead generator checks each company’s own site.', set: { researcher: ['idle', ''], coordinator: ['waiting', 'Waiting for the Lead generator'], 'lead-generator': ['researching', 'Opened kitebyte.test/about'] }, events: [{ kind: 'handoff', agent: 'coordinator', to: 'lead-generator', text: 'Handed work to lead-generator: Qualify 5 candidates' }, { kind: 'web', agent: 'lead-generator', text: 'Opened https://kitebyte.test/about' }] },
  { at: 28400, caption: 'Agents can ask each other for facts.', set: { 'lead-generator': ['waiting', 'Waiting for Knowledge'], 'knowledge-base': ['working', 'Checking the fact sheet'] }, events: [{ kind: 'handoff', agent: 'lead-generator', to: 'knowledge-base', text: 'Asked knowledge-base: Does a 3-person team fit the ICP?' }] },
  { at: 32000, set: { 'knowledge-base': ['success', 'Yes: fact sheet line 52'], 'lead-generator': ['working', 'Scoring 5 candidates'] }, events: [{ kind: 'result', agent: 'knowledge-base', text: 'Finished: the ICP fits, fact sheet line 52' }] },
  { at: 34400, caption: 'Leads are imported with evidence for every claim.', set: { 'knowledge-base': ['idle', ''] }, board: { leads: 1 }, events: [{ kind: 'lead', agent: 'lead-generator', text: 'Found: Kitebyte Labs (tier A, 82)' }] },
  { at: 35400, board: { leads: 2 }, events: [{ kind: 'lead', agent: 'lead-generator', text: 'Found: Nimbus Notes (tier B, 68)' }] },
  { at: 36400, board: { leads: 3 }, events: [{ kind: 'lead', agent: 'lead-generator', text: 'Found: Orbitly (tier B, 61)' }] },
  { at: 37800, set: { 'lead-generator': ['success', '3 qualified, 2 ruled out'] }, board: { done: 1 }, events: [{ kind: 'result', agent: 'lead-generator', text: 'Finished: 3 qualified, 2 ruled out' }] },
  { at: 40400, caption: 'Nothing reaches you unreviewed.', set: { 'lead-generator': ['idle', ''], coordinator: ['waiting', 'Waiting for the Evaluator'], evaluator: ['working', 'Opening every source'] }, events: [{ kind: 'handoff', agent: 'coordinator', to: 'evaluator', text: 'Handed work to evaluator: Review the lead batch' }] },
  { at: 43800, caption: 'Weak work is sent back with exact fixes.', set: { evaluator: ['success', 'REVISE 74: one date has no source'], 'lead-generator': ['working', 'Fixing the undated source'] }, events: [{ kind: 'review', agent: 'evaluator', verdict: 'REVISE', text: 'Reviewed the batch: REVISE 74/100' }, { kind: 'handoff', agent: 'coordinator', to: 'lead-generator', text: 'Sent back to lead-generator: fix 1' }] },
  { at: 47600, set: { 'lead-generator': ['success', 'Fixed: date now from GitHub'], evaluator: ['working', 'Checking the fix'] }, events: [{ kind: 'result', agent: 'lead-generator', text: 'Finished: fix 1 done' }] },
  { at: 50200, set: { evaluator: ['success', 'PASS 88/100'], 'lead-generator': ['idle', ''] }, board: { done: 2 }, events: [{ kind: 'review', agent: 'evaluator', verdict: 'PASS', text: 'Reviewed the batch: PASS 88/100' }] },
  { at: 52800, caption: 'Outreach drafts the emails from the evidence.', set: { evaluator: ['idle', ''], coordinator: ['waiting', 'Waiting for Outreach'], outreach: ['working', 'Drafting Email 1 for Kitebyte'] }, events: [{ kind: 'handoff', agent: 'coordinator', to: 'outreach', text: 'Handed work to outreach: Draft a sequence for Kitebyte' }] },
  { at: 56400, set: { outreach: ['working', 'Drafting Emails 2 and 3'] }, events: [{ kind: 'file', agent: 'outreach', ref: 'outputs/outreach/L-kitebyte.md', text: 'Wrote outputs/outreach/L-kitebyte.md' }] },
  { at: 59200, caption: 'Every draft passes the automatic copy checks.', events: [{ kind: 'check', agent: 'outreach', status: 'ok', text: 'Copy check passed: 0 failed' }] },
  { at: 61000, set: { outreach: ['success', '3 emails drafted, nothing sent'] }, board: { drafts: 3, done: 3 }, events: [{ kind: 'result', agent: 'outreach', text: 'Finished: 3 emails drafted, nothing sent' }] },
  { at: 63600, set: { outreach: ['idle', ''], evaluator: ['working', 'Reviewing the drafts'], coordinator: ['waiting', 'Waiting for the Evaluator'] }, events: [{ kind: 'handoff', agent: 'coordinator', to: 'evaluator', text: 'Handed work to evaluator: Review the drafts' }] },
  { at: 67200, set: { evaluator: ['success', 'PASS 87/100'] }, board: { done: 4 }, events: [{ kind: 'review', agent: 'evaluator', verdict: 'PASS', text: 'Reviewed the drafts: PASS 87/100' }] },
  { at: 69800, caption: 'Sales prepares the call notes.', set: { evaluator: ['idle', ''], coordinator: ['waiting', 'Waiting for Sales'], sales: ['working', 'Preparing call notes'] }, events: [{ kind: 'handoff', agent: 'coordinator', to: 'sales', text: 'Handed work to sales: Prepare call notes' }] },
  { at: 73200, caption: 'If an agent fails three times, its backup takes over.', set: { sales: ['error', 'No result after 3 tries'] }, events: [{ kind: 'fallback', agent: 'sales', status: 'failed', text: 'FALLBACK: sales failed 3 times; run sales-fallback' }] },
  { at: 76000, set: { sales: ['working', 'Backup: writing the call notes', true] }, events: [{ kind: 'handoff', agent: 'coordinator', to: 'sales', text: 'Handed work to sales (backup): Prepare call notes' }] },
  { at: 79600, set: { sales: ['success', 'Call notes ready'] }, events: [{ kind: 'result', agent: 'sales', text: 'Finished on the backup: call notes ready' }] },
  { at: 82000, caption: 'The Captain writes the report.', set: { sales: ['idle', ''], coordinator: ['working', 'Writing the report'] }, events: [{ kind: 'file', agent: 'coordinator', ref: 'outputs/reports/J-demo.md', text: 'Wrote outputs/reports/J-demo.md' }] },
  { at: 85000, caption: 'The sends wait in your tray. Nothing goes out without your yes.', set: { coordinator: ['waiting', 'Waiting for your yes'] }, board: { approvals: 3 }, events: [{ kind: 'approval', agent: 'coordinator', text: '3 sends wait for your approval' }] },
  { at: 90000, caption: 'Done: 3 qualified leads and 3 reviewed drafts. Your turn.' },
];
export const DEMO_MS = 96000;

export function createDemo(onFrame, { loop = true } = {}) {
  let t = 0;
  let idx = 0;
  let speed = 1;
  let playing = false;
  let timer = null;
  let n = 0;
  let states = {};
  let board = {};
  let caption = '';

  const apply = (step, events) => {
    if (step.caption) caption = step.caption;
    for (const [agent, [status, doing, backup]] of Object.entries(step.set || {})) states[agent] = { status, doing, backup: !!backup };
    if (step.board) {
      const { done, ...rest } = step.board;
      board = { ...board, ...rest };
      if (Number.isInteger(done) && board.plan?.[done]) board.plan = board.plan.map((p, i) => (i === done ? { ...p, done: true } : p));
    }
    for (const e of step.events || []) events.push({ status: 'ok', ...e, id: `demo-${n += 1}`, at: new Date().toISOString(), simulated: true });
  };
  const frame = (events, reset = false) => onFrame({ states: { ...states }, events, caption, board: { ...board }, progress: Math.min(1, t / DEMO_MS), playing, speed, reset });
  const restartState = () => {
    t = 0;
    idx = 0;
    states = {};
    board = {};
    caption = '';
  };
  const tick = () => {
    if (!playing) return;
    t += 100 * speed;
    const events = [];
    while (idx < STEPS.length && STEPS[idx].at <= t) apply(STEPS[idx++], events);
    if (t >= DEMO_MS) {
      if (loop) {
        restartState();
        frame([], true);
        return;
      }
      playing = false;
    }
    frame(events);
  };

  return {
    play() {
      if (playing) return;
      playing = true;
      if (!timer) timer = setInterval(tick, 100);
      if (t === 0) frame([], true);
    },
    pause() {
      playing = false;
      frame([]);
    },
    toggle() {
      if (playing) this.pause();
      else this.play();
    },
    restart() {
      restartState();
      frame([], true);
      this.play();
    },
    setSpeed(s) {
      speed = s;
      frame([]);
    },
    stop() {
      playing = false;
      clearInterval(timer);
      timer = null;
      restartState();
    },
    get playing() {
      return playing;
    },
    get speed() {
      return speed;
    },
  };
}

// The looping, statuses-only version (the gallery).
export function createSimulator(onTick) {
  const demo = createDemo(({ states, events, reset }) => onTick({ states, events, reset }));
  return {
    start: () => demo.play(),
    stop: () => demo.stop(),
    get running() {
      return demo.playing;
    },
  };
}
