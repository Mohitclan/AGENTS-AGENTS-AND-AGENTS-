import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, describe, it } from 'node:test';
import { decision, makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

const hook = (payload) => repo.hook('team-hooks.mjs', payload);
const call = (caller, target, extra = {}) =>
  decision(
    hook({
      hook_event_name: 'PreToolUse',
      tool_name: 'Agent',
      ...(caller ? { agent_id: `id-${caller}`, agent_type: caller } : {}),
      tool_input: { subagent_type: target, description: 'Check a price', prompt: 'T-20261030-01: check the price' },
      ...extra,
    }),
  );
const RESULT = 'Done.\n\nRESULT\ntask: T-20261030-01\nstatus: done\noutputs: outputs/x.md\nsummary: ok\n';
const stop = (agentId, agentType, message) =>
  hook({ hook_event_name: 'SubagentStop', agent_id: agentId, agent_type: agentType, last_assistant_message: message });
const finished = (target, agentId, extra = {}) =>
  hook({
    hook_event_name: 'PostToolUse',
    tool_name: 'Agent',
    tool_input: { subagent_type: target, prompt: 'T-20261030-01: research' },
    tool_response: { status: 'completed', agentId, content: [{ type: 'text', text: 'partial' }] },
    ...extra,
  });
const context = (r) => JSON.parse(r.stdout).hookSpecificOutput.additionalContext;

describe('who may call whom', () => {
  it('lets the coordinator call anyone', () => assert.equal(call(null, 'researcher'), 'allow'));
  it('lets the coordinator call a fallback', () => assert.equal(call(null, 'researcher-fallback'), 'allow'));
  it('lets an agent call one in its can_ask list', () => assert.equal(call('outreach', 'knowledge-base'), 'allow'));
  it('blocks an agent not in the list', () => assert.equal(call('outreach', 'developer'), 'block'));
  it('blocks calling itself', () => assert.equal(call('sales', 'sales'), 'block'));
  it('blocks calling a fallback', () => assert.equal(call('sales', 'demo-handler-fallback'), 'block'));
  it('blocks calling the coordinator', () => assert.equal(call('sales', 'coordinator'), 'block'));
  it('blocks a call with no agent named', () => assert.equal(call('sales', undefined), 'block'));
  it('blocks a fallback calling anyone', () => assert.equal(call('sales-fallback', 'knowledge-base'), 'block'));
  it('logs allowed calls', () => {
    const log = readFileSync(repo.path('ops', 'messages.md'), 'utf8');
    assert.match(log, /\| outreach \| knowledge-base \| T-20261030-01 \| Check a price \|/);
    assert.doesNotMatch(log, /\| outreach \| developer \|/);
  });
});

describe('retries', () => {
  it('accepts a reply with a RESULT block', () => assert.equal(decision(stop('run-ok', 'researcher', RESULT)), 'allow'));
  it('accepts a RESULT block written in bold', () =>
    assert.equal(decision(stop('run-bold', 'researcher', '**RESULT**\n- **task:** T-20261030-01\n- **status:** blocked\n')), 'allow'));
  it('sends a reply without one back, twice', () => {
    assert.equal(decision(stop('run-bad', 'researcher', 'I looked around.')), 'retry');
    const second = stop('run-bad', 'researcher', 'Still looking.');
    assert.equal(decision(second), 'retry');
    assert.match(JSON.parse(second.stdout).reason, /Attempt 3 of 3/);
  });
  it('lets it stop after the third failure', () => assert.equal(decision(stop('run-bad', 'researcher', '')), 'allow'));
  it('ignores built-in agents', () => assert.equal(decision(stop('run-x', 'Explore', 'no block')), 'allow'));
  it('rejects an invalid status', () => assert.equal(decision(stop('run-status', 'sales', 'RESULT\ntask: T-1\nstatus: finished\n')), 'retry'));
});

describe('fallbacks', () => {
  it('tells the coordinator to switch after three failures', () => {
    const r = finished('researcher', 'run-bad');
    assert.equal(decision(r), 'context');
    assert.match(context(r), /^FALLBACK: researcher failed.*Launch researcher-fallback now/);
    assert.match(readFileSync(repo.path('ops', 'fallbacks.md'), 'utf8'), /\| researcher \| T-20261030-01 \|.*\| switch to researcher-fallback \|/);
  });
  it('says nothing after a good run', () => assert.equal(decision(finished('researcher', 'run-ok')), 'allow'));
  it('escalates when the fallback fails too', () => {
    for (let i = 0; i < 3; i++) stop('run-fb', 'researcher-fallback', 'nothing');
    const r = finished('researcher-fallback', 'run-fb');
    assert.match(context(r), /^ESCALATE: researcher-fallback/);
  });
  it('switches when the agent call errors out', () => {
    const r = hook({ hook_event_name: 'PostToolUseFailure', tool_name: 'Agent', tool_input: { subagent_type: 'sales' }, error: 'overloaded' });
    assert.match(context(r), /^FALLBACK: sales failed: the agent call errored \(overloaded\)/);
  });
  it('asks the coordinator to check an unrecorded reply without a RESULT block', () =>
    assert.match(context(finished('sales', 'never-seen')), /^CHECK: sales's reply has no RESULT block/));
  it('leaves background runs alone', () =>
    assert.equal(decision(finished('sales', 'run-bad', { tool_response: { status: 'async_launched', agentId: 'run-bad' } })), 'allow'));
  it('leaves built-in agents alone', () => assert.equal(decision(finished('Explore', 'run-bad')), 'allow'));
});
