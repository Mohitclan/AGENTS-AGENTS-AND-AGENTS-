// Reads and writes the frontmatter of the agent files in .claude/agents/.
// Values are strings, or arrays for YAML block lists such as:
//
//   skills:
//     - fact-sourcing
//
// Claude Code ignores keys it doesn't know, so the team's own keys live here too:
//   can_ask:       agents this one may call directly (enforced by scripts/team-hooks.mjs)
//   fallback:      the agent the coordinator switches to after three failed attempts
//   fallback_for:  on a fallback agent, the agent it stands in for
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './_shared.mjs';

export const AGENTS_DIR = join(ROOT, '.claude', 'agents');
export const MAIN_AGENT = 'coordinator';

export function agentNames() {
  if (!existsSync(AGENTS_DIR)) return [];
  return readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3))
    .sort();
}

export const isFallback = (name) => name.endsWith('-fallback');

export function readAgent(name) {
  const file = join(AGENTS_DIR, `${name}.md`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { name, file, fields: {}, order: [], body: text };
  const fields = {};
  const order = [];
  let listKey = null;
  for (const line of m[1].split('\n')) {
    const item = /^\s+-\s*(.*)$/.exec(line);
    if (item && listKey) {
      if (item[1].trim()) fields[listKey].push(item[1].trim().replace(/^(["'])(.*)\1$/, '$2'));
      continue;
    }
    const kv = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/.exec(line);
    if (!kv) continue;
    order.push(kv[1]);
    if (kv[2].trim() === '') {
      fields[kv[1]] = [];
      listKey = kv[1];
    } else {
      fields[kv[1]] = kv[2].trim();
      listKey = null;
    }
  }
  return { name, file, fields, order, body: text.slice(m[0].length) };
}

export function writeAgent(agent) {
  const keys = [...agent.order, ...Object.keys(agent.fields).filter((k) => !agent.order.includes(k))];
  const lines = [];
  for (const key of keys) {
    const value = agent.fields[key];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (!value.length) continue;
      lines.push(`${key}:`, ...value.map((v) => `  - ${v}`));
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  writeFileSync(agent.file, `---\n${lines.join('\n')}\n---\n${agent.body.startsWith('\n') ? '' : '\n'}${agent.body}`);
}

export const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);

// Splits a tools line on commas that aren't inside parentheses, e.g. "Agent(a, b), Read".
export function splitTools(tools) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of tools || '') {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      if (current.trim()) out.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}
