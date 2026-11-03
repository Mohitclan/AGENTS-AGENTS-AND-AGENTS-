#!/usr/bin/env node
// Fallback agents. Every main agent names one with `fallback: <name>-fallback`. After the main
// agent fails to return a valid RESULT block three times, scripts/team-hooks.mjs tells the
// coordinator to switch to it.
//
//   node scripts/fallbacks.mjs sync     write .claude/agents/<name>-fallback.md for every agent that names one
//   node scripts/fallbacks.mjs check    report missing or out-of-date fallbacks (exit 1 on problems)
//
// A fallback has the main agent's tools (except Agent), skills and colour, runs on a different
// model, reads the main agent's file and memory, and works in small steps.
import { join } from 'node:path';
import { AGENTS_DIR, MAIN_AGENT, agentNames, isFallback, list, readAgent, splitTools, writeAgent } from './_agents.mjs';
import { fail, isMain } from './_shared.mjs';

const MODEL_SWAP = { opus: 'sonnet', sonnet: 'opus', haiku: 'sonnet', fable: 'opus' };

// Fallbacks with HubSpot tools repeat the read-only rule, so it stays in force whatever the main agent's file says.
const HUBSPOT_RULE =
  '7. HubSpot is read-only for you. Never create, update, delete, send or publish anything in HubSpot. ' +
  'If a record should change, list it as a handoff or an approval item for the coordinator. Before proposing any CRM change, ' +
  "fetch the record, confirm its ID belongs to the named company or contact, and quote both the ID and the name in the proposal.\n";

function expected(primary) {
  const p = readAgent(primary);
  const name = p.fields.fallback;
  const fields = {
    name,
    description:
      `Fallback for ${primary}. The coordinator runs it only after ${primary} has failed to return a valid ` +
      'RESULT block three times on a task. Same job, done step by step on a different model.',
    tools: splitTools(p.fields.tools).filter((t) => !/^Agent\b/.test(t)).join(', '),
    model: MODEL_SWAP[p.fields.model] || 'opus',
    color: p.fields.color,
    skills: list(p.fields.skills),
    fallback_for: primary,
  };
  const body = `
<!-- Written by node scripts/fallbacks.mjs sync from .claude/agents/${primary}.md. Change that file and run sync again. -->

You stand in for \`${primary}\`, which failed three times on this task. Do the same job to the same standard.

1. Read \`.claude/agents/${primary}.md\`. It describes the job, the outputs and the rules; follow them exactly.
2. Read \`.claude/agent-memory/${primary}/MEMORY.md\` if it exists. It holds what \`${primary}\` has learned.
3. Read the brief again. If earlier attempts left files in the output path, check them and keep what's sound.
4. Work in small steps and save files as you go, so a partial result isn't lost.
5. Don't call other agents. If you need another agent's help, list it as a handoff.
6. If you can't finish, stop and report what's done and what's missing with status \`blocked\`.
${/mcp__hubspot__/.test(p.fields.tools || '') ? HUBSPOT_RULE : ''}
Always end with the RESULT block from CLAUDE.md, plus a last line \`fallback_for: ${primary}\`.
`;
  return { name, file: join(AGENTS_DIR, `${name}.md`), fields, order: Object.keys(fields), body };
}

function primaries() {
  return agentNames().filter((n) => !isFallback(n) && readAgent(n).fields.fallback);
}

export function syncFallbacks(only) {
  const written = [];
  for (const primary of primaries()) {
    if (only && primary !== only) continue;
    const fb = expected(primary);
    if (fb.name !== `${primary}-fallback`) fail(`${primary}: fallback must be named ${primary}-fallback, not ${fb.name}.`);
    writeAgent(fb);
    written.push(fb.name);
  }
  return written;
}

function check() {
  const problems = [];
  const names = agentNames();
  for (const primary of names.filter((n) => !isFallback(n) && n !== MAIN_AGENT)) {
    const p = readAgent(primary);
    if (!p.fields.fallback) {
      problems.push(`${primary} has no fallback: line`);
      continue;
    }
    const want = expected(primary);
    const have = readAgent(want.name);
    if (!have) {
      problems.push(`${want.name} is missing; run node scripts/fallbacks.mjs sync`);
      continue;
    }
    for (const key of ['tools', 'model', 'color', 'fallback_for']) {
      if ((have.fields[key] || '') !== (want.fields[key] || '')) {
        problems.push(`${want.name}: ${key} is "${have.fields[key] || ''}", expected "${want.fields[key] || ''}"`);
      }
    }
    if (list(have.fields.skills).join(',') !== want.fields.skills.join(',')) {
      problems.push(`${want.name}: skills differ from ${primary}'s`);
    }
  }
  for (const fb of names.filter(isFallback)) {
    const primary = readAgent(fb).fields.fallback_for;
    if (!primary || readAgent(primary)?.fields.fallback !== fb) problems.push(`${fb}: no main agent names it as its fallback`);
  }

  // The coordinator can only launch agents named in its Agent(...) tool list.
  const coordinator = readAgent(MAIN_AGENT);
  const agentTool = splitTools(coordinator?.fields.tools).find((t) => /^Agent\(/.test(t));
  const allowed = new Set((agentTool || '').replace(/^Agent\(|\)$/g, '').split(',').map((s) => s.trim()).filter(Boolean));
  const missing = names.filter((n) => n !== MAIN_AGENT && !allowed.has(n));
  if (missing.length) problems.push(`coordinator's Agent(...) tool list is missing: ${missing.join(', ')}`);

  if (problems.length) fail(`${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  console.log(`OK: ${names.filter(isFallback).length} fallback agent(s) match their main agents.`);
}

if (isMain(import.meta.url)) {
  const [command] = process.argv.slice(2);
  if (command === 'sync') {
    const written = syncFallbacks();
    console.log(written.length ? `Wrote ${written.join(', ')}.` : 'No agent names a fallback.');
  } else if (command === 'check') check();
  else fail('Usage: node scripts/fallbacks.mjs sync | check');
}
