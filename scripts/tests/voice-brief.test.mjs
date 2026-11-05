import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { agentBrief, findAgent, teamBrief } from '../voice-brief.mjs';

const NOW = Date.parse('2026-11-05T13:00:00');
const agent = (name, extra = {}) => ({ name, status: 'idle', doing: null, lastAt: null, counts: { outputs: 0, tasks: 0, web: 0, fails: 0, passes: 0 }, ...extra });
const snap = (extra = {}) => ({
  agents: ['coordinator', 'evaluator', 'knowledge-base', 'researcher', 'lead-generator', 'outreach', 'sales', 'marketing', 'demo-handler', 'docs-handler', 'developer'].map((n) => agent(n)),
  running: null,
  tasks: [],
  usage: { fiveHour: { used: 38, reset: false }, weekly: { used: 24, reset: false } },
  kpis: { found: 11, qualified: 1, drafted: 4, contacted: 0, replied: 0 },
  flags: [],
  pilot: false,
  ...extra,
});

describe('voice briefing: the team', () => {
  it('says nothing is running, how the last task ended, and the plan and lead numbers', () => {
    const text = teamBrief(snap({ tasks: [{ id: 'J-1', title: 'Find leads.', status: 'failed', finished: '2026-11-05 12:48' }] }), NOW);
    assert.match(text, /^Nothing is running right now\. The last task was J-1, Find leads\. It ended as failed at 12:48\./);
    assert.doesNotMatch(text, /\.\./, 'no doubled full stops');
    assert.match(text, /38 percent of the five hour window, 24 percent of the weekly window/);
    assert.match(text, /Leads: 11 found, 1 qualified, 4 drafted, 0 contacted, 0 replied\./);
    assert.match(text, /Nothing is waiting for a person\./);
  });

  it('names the running task, how long ago it started and who is working on what', () => {
    const agents = snap().agents.map((a) => (a.name === 'researcher' ? { ...a, status: 'researching', doing: 'Searching the web for RepoClip news' } : a));
    const text = teamBrief(snap({ agents, running: { id: 'J-2', title: 'Competitor check', started: '2026-11-05 12:40' } }), NOW);
    assert.match(text, /Right now the team is on J-2: Competitor check\. It started at 12:40, 20 minutes ago\./);
    assert.match(text, /Working now: researcher, Searching the web for RepoClip news\./);
  });

  it('says so when the coordinator is busy and no specialist is', () => {
    assert.match(teamBrief(snap({ running: { id: 'J-3', title: 'x', started: '2026-11-05 12:59' } }), NOW), /no specialist is busy at this moment/);
  });

  it('reports trouble, things waiting for a person, and the pilot rule', () => {
    const agents = snap().agents.map((a) => (a.name === 'sales' ? { ...a, status: 'error', doing: 'Stopped by the plan limit' } : a));
    const text = teamBrief(snap({ agents, pilot: true, flags: [{ kind: 'task', text: 'needs input: pick a segment' }, { kind: 'knowledge', text: 'a proposal' }] }), NOW);
    assert.match(text, /Trouble: sales, Stopped by the plan limit\./);
    assert.match(text, /1 thing needs a person\. The first is: needs input: pick a segment\./);
    assert.match(text, /only test copies go to Purab, Tanvi and Mohit/);
  });

  it('counts a plan window that has reset as zero', () => {
    const text = teamBrief(snap({ usage: { fiveHour: { used: 80, reset: true }, weekly: { used: 24, reset: false } } }), NOW);
    assert.match(text, /0 percent of the five hour window/);
  });
});

describe('voice briefing: one agent', () => {
  it('understands names, gems and plain words', () => {
    const s = snap();
    for (const [said, name] of [['lead generator', 'lead-generator'], ['the lead-generator', 'lead-generator'], ['leads', 'lead-generator'], ['owl', 'evaluator'], ['the researcher agent', 'researcher'], ['code buddy', 'developer'], ['docs', 'docs-handler'], ['captain', 'coordinator'], ['knowledge', 'knowledge-base']]) {
      assert.equal(findAgent(s, said), name, said);
    }
    assert.equal(findAgent(s, 'banana'), null);
    assert.equal(findAgent(s, ''), null);
  });

  it('says what a working agent is doing and when it last did anything', () => {
    const agents = snap().agents.map((a) => (a.name === 'outreach' ? { ...a, status: 'working', doing: 'Editing the mxRaven sequence', lastAt: '2026-11-05T12:58:00', counts: { outputs: 2, tasks: 1, web: 0, fails: 3, passes: 0 } } : a));
    const text = agentBrief(snap({ agents }), 'bunny', NOW);
    assert.equal(text, 'The outreach is working: Editing the mxRaven sequence. Its last activity was 2 minutes ago. It has 2 saved outputs, 1 task on the board and 3 failures this week.');
  });

  it('says an idle agent is idle, and lists the team when the name is unknown', () => {
    assert.match(agentBrief(snap(), 'sales', NOW), /^The sales is idle\./);
    assert.match(agentBrief(snap(), 'banana', NOW), /^I don't know an agent called banana\. The team is coordinator, evaluator, knowledge base/);
  });
});
