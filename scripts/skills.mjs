#!/usr/bin/env node
// Skills: playbooks in .claude/skills/<name>/SKILL.md. An agent preloads the skills listed under
// `skills:` in its file, so their full text is in its context from the first turn.
//
//   node scripts/skills.mjs list                         every skill and the agents that preload it
//   node scripts/skills.mjs give <agent> <skill>         preload a skill into an agent and its fallback
//   node scripts/skills.mjs take <agent> <skill>         stop preloading it
//   node scripts/skills.mjs new <name> "<description>"   create a skill from a template
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { MAIN_AGENT, agentNames, isFallback, list, readAgent, writeAgent } from './_agents.mjs';
import { syncFallbacks } from './fallbacks.mjs';
import { ROOT, fail, frontmatter, printTable } from './_shared.mjs';

const SKILLS = join(ROOT, '.claude', 'skills');
const MAX_PRELOADED = 32; // Claude Code's limit per agent
const toRel = (p) => relative(ROOT, p).split(sep).join('/');

function skillNames() {
  if (!existsSync(SKILLS)) return [];
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(SKILLS, e.name, 'SKILL.md')))
    .map((e) => e.name)
    .sort();
}

const skillMeta = (name) => frontmatter(readFileSync(join(SKILLS, name, 'SKILL.md'), 'utf8')) || {};

function mainAgent(name) {
  if (!name) fail('Name an agent.');
  if (isFallback(name)) fail(`${name} copies its skills from ${name.slice(0, -'-fallback'.length)}. Change that agent instead.`);
  const agent = readAgent(name);
  if (!agent) fail(`No agent named "${name}". Agents: ${agentNames().filter((n) => !isFallback(n)).join(', ')}`);
  return agent;
}

function save(agent) {
  writeAgent(agent);
  if (agent.fields.fallback) syncFallbacks(agent.name);
}

function listSkills() {
  const users = new Map();
  const missing = [];
  for (const name of agentNames().filter((n) => !isFallback(n))) {
    for (const skill of list(readAgent(name).fields.skills)) {
      if (!users.has(skill)) users.set(skill, []);
      users.get(skill).push(name);
    }
  }
  const names = skillNames();
  for (const [skill, agents] of users) if (!names.includes(skill)) missing.push(`${skill} (preloaded by ${agents.join(', ')})`);
  if (!names.length) console.log('No skills yet. Create one with node scripts/skills.mjs new <name> "<description>".');
  else {
    const rows = names.map((s) => {
      const d = skillMeta(s).description || '';
      return { skill: s, agents: (users.get(s) || []).join(', ') || '-', description: d.length > 70 ? `${d.slice(0, 67)}...` : d };
    });
    printTable(rows, ['skill', 'agents', 'description']);
  }
  if (missing.length) console.log(`\nMissing skills that agents try to preload: ${missing.join('; ')}`);
}

function give(agentName, skill) {
  const agent = mainAgent(agentName);
  if (!skillNames().includes(skill)) fail(`No skill "${skill}" in .claude/skills/. Skills: ${skillNames().join(', ') || 'none'}`);
  if (skillMeta(skill)['disable-model-invocation'] === 'true') {
    fail(`${skill} has disable-model-invocation: true, so Claude Code can't preload it into an agent.`);
  }
  const skills = list(agent.fields.skills);
  if (skills.includes(skill)) {
    console.log(`${agent.name} already preloads ${skill}.`);
    return;
  }
  if (skills.length >= MAX_PRELOADED) fail(`${agent.name} already preloads ${MAX_PRELOADED} skills, Claude Code's limit.`);
  agent.fields.skills = [...skills, skill];
  if (!agent.order.includes('skills')) agent.order.splice(agent.order.indexOf('model') + 1 || agent.order.length, 0, 'skills');
  save(agent);
  console.log(`${agent.name} now preloads: ${agent.fields.skills.join(', ')}${agent.fields.fallback ? ` (and ${agent.fields.fallback})` : ''}.`);
  if (agent.name === MAIN_AGENT) console.log('Restart the session for the coordinator to pick it up.');
}

function take(agentName, skill) {
  const agent = mainAgent(agentName);
  const skills = list(agent.fields.skills);
  if (!skills.includes(skill)) {
    console.log(`${agent.name} doesn't preload ${skill}.`);
    return;
  }
  agent.fields.skills = skills.filter((s) => s !== skill);
  save(agent);
  console.log(`${agent.name} now preloads: ${agent.fields.skills.join(', ') || 'no skills'}.`);
}

function create(name, description) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name || '')) fail('Skill names are lowercase words joined by hyphens, e.g. pricing-rules.');
  if (!description?.trim()) fail('Give a one-sentence description: what the skill teaches and when to use it.');
  const dir = join(SKILLS, name);
  if (existsSync(dir)) fail(`${toRel(dir)} already exists.`);
  const title = name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${description.replace(/\s+/g, ' ').trim()}\n---\n\n# ${title}\n\n` +
      'Write what the agent should know and do: the steps, the rules, good and bad examples, and where the facts come from.\n',
  );
  console.log(`Created ${toRel(join(dir, 'SKILL.md'))}. Fill it in, then: node scripts/skills.mjs give <agent> ${name}`);
}

const [command, a, ...rest] = process.argv.slice(2);
switch (command) {
  case 'list':
    listSkills();
    break;
  case 'give':
    give(a, rest[0]);
    break;
  case 'take':
    take(a, rest[0]);
    break;
  case 'new':
    create(a, rest.join(' '));
    break;
  default:
    fail('Usage: node scripts/skills.mjs list | give <agent> <skill> | take <agent> <skill> | new <name> "<description>"');
}
