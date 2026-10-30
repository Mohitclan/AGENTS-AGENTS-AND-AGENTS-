#!/usr/bin/env node
// Team memory: the main memory every agent reads (memory/MAIN.md) and each agent's own memory
// (.claude/agent-memory/<agent>/MEMORY.md, loaded by Claude Code through `memory: project`).
//
//   node scripts/memory.mjs add <main|agent> "<text>" --source "<where it came from>" --by <who> [--section decisions|preferences|lessons]
//   node scripts/memory.mjs list [main|agent]       entries, numbered; with no target, a summary of every memory file
//   node scripts/memory.mjs remove <main|agent> <number|text>
//   node scripts/memory.mjs check                    sizes against Claude Code's load limits, duplicates
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { ROOT, fail, printTable, today } from './_shared.mjs';

const MAIN = join(ROOT, 'memory', 'MAIN.md');
const AGENTS = join(ROOT, '.claude', 'agents');
const AGENT_MEMORY = join(ROOT, '.claude', 'agent-memory');
const SECTIONS = ['decisions', 'preferences', 'lessons'];
// Claude Code loads the first 200 lines or 25 KB of an agent's MEMORY.md; warn before that.
const AGENT_WARN = { lines: 180, bytes: 22_000 };
const AGENT_MAX = { lines: 200, bytes: 25_000 };
// The main memory loads into every agent on every task, so it has a tighter budget.
const MAIN_WARN = { lines: 120, bytes: 12_000 };
const MAX_ENTRY = 500;
const SECRET = /(api[_-]?key|secret|password|passwd|token|bearer)\s*[:=]|sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/i;
const toRel = (p) => relative(ROOT, p).split(sep).join('/');

function fileFor(target) {
  if (target === 'main') return MAIN;
  if (!/^[a-z0-9-]+$/.test(target || '')) fail(`Unknown memory target "${target}". Use main or an agent name.`);
  if (target.endsWith('-fallback')) {
    fail(`${target} uses ${target.slice(0, -'-fallback'.length)}'s memory. Add the entry there instead.`);
  }
  if (!existsSync(join(AGENTS, `${target}.md`))) fail(`No agent named "${target}" in .claude/agents/.`);
  return join(AGENT_MEMORY, target, 'MEMORY.md');
}

function read(file) {
  return existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
}

// Entries are the "- " lines; numbering follows their order in the file.
function entries(text) {
  return text
    .split('\n')
    .map((line, index) => ({ line, index }))
    .filter((e) => e.line.startsWith('- '));
}

function flag(args, name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function add(target, args) {
  const file = fileFor(target);
  const text = (args[0] || '').replace(/\s+/g, ' ').trim();
  const source = (flag(args, 'source') || '').replace(/\s+/g, ' ').trim();
  const by = (flag(args, 'by') || '').replace(/\s+/g, ' ').trim();
  const section = (flag(args, 'section') || 'lessons').toLowerCase();

  if (!text || text.startsWith('--')) fail('Nothing to add. Usage: node scripts/memory.mjs add <main|agent> "<text>" --source "..." --by <who>');
  if (text.length > MAX_ENTRY) fail(`Entries are at most ${MAX_ENTRY} characters; this one has ${text.length}. Keep one idea per entry.`);
  if (!source) fail('--source is required: a URL, a file path, or "told by <person> on <date>".');
  if (!by) fail('--by is required: the agent or person adding the entry.');
  if (SECRET.test(`${text} ${source}`)) fail('This looks like it contains a secret or credential. Memory never holds secrets.');
  if (target === 'main' && !SECTIONS.includes(section)) fail(`--section must be one of: ${SECTIONS.join(', ')}`);

  let content = read(file);
  const normalised = text.toLowerCase();
  if (entries(content).some((e) => e.line.toLowerCase().includes(normalised))) {
    console.log(`Already in ${toRel(file)}; nothing added.`);
    return;
  }

  const entry = `- ${today()} · ${text} (source: ${source} · by: ${by})`;
  if (target === 'main') {
    const lines = content.split('\n');
    const heading = lines.findIndex((l) => l.trim().toLowerCase() === `## ${section}`);
    if (heading < 0) fail(`memory/MAIN.md has no "## ${section[0].toUpperCase()}${section.slice(1)}" heading. Restore it first.`);
    let end = heading + 1;
    while (end < lines.length && !lines[end].startsWith('## ')) end++;
    while (end > heading + 1 && !lines[end - 1].trim()) end--;
    lines.splice(end, 0, ...(end === heading + 1 ? ['', entry] : [entry]));
    content = lines.join('\n');
  } else {
    if (!content) content = `# ${target} memory\n\nWhat ${target} has learned. Claude Code loads the first 200 lines into every ${target} run.\n`;
    content = `${content.replace(/\n*$/, '\n')}${entries(content).length ? '' : '\n'}${entry}\n`;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content.endsWith('\n') ? content : `${content}\n`);
  console.log(`Added to ${toRel(file)}:\n${entry}`);
  warnSize(file, target === 'main' ? MAIN_WARN : AGENT_WARN);
}

function list(target) {
  if (!target) {
    const rows = memoryFiles().map((f) => {
      const text = read(f.file);
      return { memory: f.target, entries: entries(text).length, lines: text.split('\n').length, kb: (Buffer.byteLength(text) / 1024).toFixed(1), file: toRel(f.file) };
    });
    if (!rows.length) console.log('No memory yet.');
    else printTable(rows, ['memory', 'entries', 'lines', 'kb', 'file']);
    return;
  }
  const file = fileFor(target);
  const found = entries(read(file));
  if (!found.length) {
    console.log(`No entries in ${toRel(file)} yet.`);
    return;
  }
  found.forEach((e, i) => console.log(`${String(i + 1).padStart(3)}  ${e.line.slice(2)}`));
}

function remove(target, which) {
  const file = fileFor(target);
  if (!which) fail('Usage: node scripts/memory.mjs remove <main|agent> <number|text>');
  const lines = read(file).split('\n');
  const found = entries(lines.join('\n'));
  let hit;
  if (/^\d+$/.test(which)) {
    hit = found[Number(which) - 1];
    if (!hit) fail(`${toRel(file)} has ${found.length} entr${found.length === 1 ? 'y' : 'ies'}; there is no number ${which}.`);
  } else {
    const matches = found.filter((e) => e.line.toLowerCase().includes(which.toLowerCase()));
    if (!matches.length) fail(`No entry in ${toRel(file)} contains "${which}".`);
    if (matches.length > 1) {
      fail(`"${which}" matches ${matches.length} entries. Remove one by number:\n${matches.map((m) => `${found.indexOf(m) + 1}  ${m.line.slice(2)}`).join('\n')}`);
    }
    hit = matches[0];
  }
  lines.splice(hit.index, 1);
  writeFileSync(file, lines.join('\n'));
  console.log(`Removed from ${toRel(file)}:\n${hit.line}`);
}

function memoryFiles() {
  const files = existsSync(MAIN) ? [{ target: 'main', file: MAIN }] : [];
  const names = existsSync(AGENTS)
    ? readdirSync(AGENTS).filter((f) => f.endsWith('.md') && !f.endsWith('-fallback.md')).map((f) => f.slice(0, -3)).sort()
    : [];
  for (const name of names) {
    const file = join(AGENT_MEMORY, name, 'MEMORY.md');
    if (existsSync(file)) files.push({ target: name, file });
  }
  return files;
}

function warnSize(file, limits) {
  const text = read(file);
  const lines = text.split('\n').length;
  const bytes = statSync(file).size;
  if (lines > limits.lines || bytes > limits.bytes) {
    console.log(`\nNote: ${toRel(file)} is ${lines} lines, ${(bytes / 1024).toFixed(1)} KB. Prune it with node scripts/memory.mjs remove.`);
  }
}

function check() {
  const problems = [];
  const warnings = [];
  for (const { target, file } of memoryFiles()) {
    const text = read(file);
    const lines = text.split('\n').length;
    const bytes = Buffer.byteLength(text);
    const rel = toRel(file);
    if (target === 'main') {
      if (lines > MAIN_WARN.lines || bytes > MAIN_WARN.bytes) warnings.push(`${rel}: ${lines} lines, ${(bytes / 1024).toFixed(1)} KB; every agent loads it on every task`);
    } else if (lines > AGENT_MAX.lines || bytes > AGENT_MAX.bytes) {
      problems.push(`${rel}: ${lines} lines, ${(bytes / 1024).toFixed(1)} KB; Claude Code loads only the first 200 lines or 25 KB`);
    } else if (lines > AGENT_WARN.lines || bytes > AGENT_WARN.bytes) {
      warnings.push(`${rel}: ${lines} lines, close to the 200-line load limit`);
    }
    const seen = new Map();
    for (const e of entries(text)) {
      const key = e.line.replace(/^- \d{4}-\d{2}-\d{2} · /, '').replace(/ \(source: .*$/, '').toLowerCase();
      if (seen.has(key)) warnings.push(`${rel}: duplicate entry "${key.slice(0, 60)}"`);
      seen.set(key, true);
      if (SECRET.test(e.line)) problems.push(`${rel}: an entry looks like it holds a secret`);
    }
  }
  for (const w of warnings) console.log(`WARN  ${w}`);
  if (problems.length) fail(`${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  console.log(`OK: ${memoryFiles().length} memory file(s) checked.`);
}

const [command, target, ...args] = process.argv.slice(2);
switch (command) {
  case 'add':
    add(target, args);
    break;
  case 'list':
    list(target);
    break;
  case 'remove':
    remove(target, args.join(' '));
    break;
  case 'check':
    check();
    break;
  default:
    fail('Usage: node scripts/memory.mjs add <main|agent> "<text>" --source "..." --by <who> [--section s] | list [target] | remove <target> <n|text> | check');
}
