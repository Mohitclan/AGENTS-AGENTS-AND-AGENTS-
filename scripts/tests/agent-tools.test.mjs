import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { agentNames, readAgent, splitTools } from '../_agents.mjs';

// HubSpot's MCP server also exposes tools that create, update, delete, send and publish. No hook
// covers mcp__ tools, so the only guard is which tools an agent file lists (hard rule 1).
// Agents may name only these read-only tools, never a wildcard.
const HUBSPOT_READ_ONLY = [
  'get_user_details',
  'get_organization_details',
  'discover_hubspot_schema',
  'search_crm_objects',
  'get_crm_objects',
  'query_crm_data',
  'search_properties',
  'get_properties',
  'search_owners',
  'tool_guidance',
].map((t) => `mcp__hubspot__${t}`);

// The team parser keeps a scalar `tools` value raw, so a YAML flow list ([a, b]) or a quoted string
// ("a, b" or 'a, b') leaves a bracket or quote stuck to the first or last entry. Claude Code reads
// real YAML, so strip them here or a bad first entry would slip past the mcp__ checks.
function toolEntries(tools) {
  return splitTools(Array.isArray(tools) ? tools.join(', ') : tools)
    .map((t) => t.replace(/^[\s[\]'"]+|[\s[\]'"]+$/g, ''))
    .filter(Boolean);
}

// Returns what is wrong with a tools line, if anything. `tools` is the raw value from the
// frontmatter: undefined or empty when there is no tools line. An omitted tools field inherits every
// tool, MCP tools included; an empty list launches the subagent with no tools. Both are rejected
// here: the first is unsafe and the second is almost certainly a mistake.
function hubspotProblems(tools) {
  const entries = toolEntries(tools);
  if (!entries.length) return ['has no tools listed (an omitted tools line inherits every tool, HubSpot writes included)'];
  const problems = [];
  for (const tool of entries.filter((t) => t.startsWith('mcp__'))) {
    if (tool.includes('*')) problems.push(`${tool} is a wildcard`);
    else if (tool.startsWith('mcp__hubspot__') && !HUBSPOT_READ_ONLY.includes(tool)) {
      problems.push(`${tool} is not one of the ten read-only tools`);
    }
  }
  return problems;
}

describe('HubSpot tools in agent files', () => {
  it('lists no wildcard and only the ten read-only tools, in every agent file', () => {
    const problems = [];
    for (const name of agentNames()) {
      for (const p of hubspotProblems(readAgent(name).fields.tools)) problems.push(`${name}: ${p}`);
    }
    assert.deepEqual(problems, []);
  });

  it('is still used by the four agents the fix was written for', () => {
    for (const name of ['lead-generator', 'sales', 'lead-generator-fallback', 'sales-fallback']) {
      const have = toolEntries(readAgent(name).fields.tools).filter((t) => t.startsWith('mcp__hubspot__'));
      assert.deepEqual([...have].sort(), [...HUBSPOT_READ_ONLY].sort(), name);
    }
  });

  it('the check itself rejects a wildcard, a write tool, a misspelt name and a missing tools line', () => {
    assert.equal(hubspotProblems('Read, mcp__hubspot__*').length, 1);
    assert.equal(hubspotProblems('Read, mcp__*').length, 1);
    assert.equal(hubspotProblems(undefined).length, 1);
    assert.equal(hubspotProblems('').length, 1);
    assert.equal(hubspotProblems([]).length, 1);
    assert.equal(hubspotProblems('Read, mcp__hubspot__manage_crm_objects').length, 1);
    assert.equal(hubspotProblems('Read, mcp__hubspot__search_crm_object').length, 1);
    // YAML flow list and quoted forms, with the bad entry first
    assert.equal(hubspotProblems('[mcp__hubspot__manage_crm_objects, Read]').length, 1);
    assert.equal(hubspotProblems('"mcp__*, Read"').length, 1);
    assert.equal(hubspotProblems("'mcp__*, Read'").length, 1);
    assert.equal(hubspotProblems('[Read, mcp__hubspot__*]').length, 1);
    assert.equal(hubspotProblems('[Read, mcp__hubspot__search_crm_objects]').length, 0);
    assert.equal(hubspotProblems('"Read, mcp__hubspot__search_crm_objects"').length, 0);
    assert.equal(hubspotProblems('Read, mcp__hubspot__search_crm_objects, Agent').length, 0);
  });

  it('every agent with HubSpot tools carries the read-only rule', () => {
    for (const name of agentNames()) {
      const a = readAgent(name);
      if (!/mcp__hubspot__/.test(a.fields.tools || '')) continue;
      assert.match(a.body, /HubSpot is read-only for you/, name);
      assert.match(a.body, /Never create, update, delete, send or publish/i, name);
      assert.doesNotMatch(a.body, /unless the human approves/i, name);
    }
  });
});
