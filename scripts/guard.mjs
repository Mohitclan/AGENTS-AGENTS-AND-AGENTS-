#!/usr/bin/env node
// Claude Code PreToolUse hook for Write, Edit, Read and Bash (configured in .claude/settings.json).
// Runs for the main session and for every subagent. Exit code 2 blocks the call,
// and the message on stderr goes back to the agent. An "ask" decision on stdout makes
// Claude Code ask the human, even for a command the allow list would let through.
//
//   - Confirmed knowledge files are read-only for agents.
//   - Agents can't mark knowledge as confirmed.
//   - pipeline/leads.jsonl is written only by scripts/leads.mjs.
//   - Confirming knowledge, and lead statuses that record a human decision, always ask.
//   - .env files can't be read in any folder (.env.example and similar are fine).
//   - memory/MAIN.md is written only by scripts/memory.mjs; an agent writes only its own agent memory.
//   - The logs that scripts/team-hooks.mjs keeps (ops/runs/, ops/messages.md, ops/fallbacks.md) can't be edited.
//   - Removing memory and changing an agent's skills always ask.
import { existsSync, readFileSync } from 'node:fs';
import { basename, relative, resolve, sep } from 'node:path';
import { frontmatter } from './_shared.mjs';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0); // not a hook payload; nothing to guard
}

const tool = input.tool_name;
const args = input.tool_input || {};
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

// Statuses that mean a person approved, sent or closed something (pipeline/lead-schema.md).
const HUMAN_STATUSES = ['approved', 'contacted', 'won'];
const ENV_EXAMPLE = /^\.env\.(example|sample|template|dist)$/i;
const isEnvFile = (name) => /^\.env(\.|$)/i.test(name) && !ENV_EXAMPLE.test(name);

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function ask(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason },
    }),
  );
  process.exit(0);
}

if (tool === 'Read' && args.file_path) {
  if (isEnvFile(basename(args.file_path))) block(`${args.file_path} may hold secrets and can't be read. Use the .env.example file instead.`);
  process.exit(0);
}

if (tool === 'Bash' && typeof args.command === 'string') {
  const cmd = args.command;
  for (const word of cmd.split(/[\s'"`;&|<>()=]+/)) {
    if (isEnvFile(word.split(/[\\/]/).pop())) block(`This command touches ${word}, which may hold secrets. Leave .env files alone.`);
  }
  if (/\bkb\.mjs\b/.test(cmd) && /\bconfirm\b/.test(cmd)) {
    ask('Confirming knowledge needs a person. Check the file first, then allow this only if you approve it.');
  }
  if (/\bleads\.mjs\b/.test(cmd) && /\bset-status\b/.test(cmd)) {
    if (new RegExp(`\\b(${HUMAN_STATUSES.join('|')})\\b`).test(cmd)) {
      ask(`Lead statuses ${HUMAN_STATUSES.join(', ')} record a person's decision. Allow this only if that happened.`);
    }
    if (/--force\b/.test(cmd)) ask('--force skips the lead status order. Allow this only to correct a mistake.');
  }
  if (/\bmemory\.mjs\b/.test(cmd) && /\bremove\b/.test(cmd)) ask('This removes an entry from team memory.');
  if (/\bskills\.mjs\b/.test(cmd) && /\b(give|take|new)\b/.test(cmd)) ask("This changes an agent's skills or adds a skill.");
  if (/\bnode\s+\S*\.\./.test(cmd)) ask('This runs a script outside scripts/.');
  process.exit(0);
}

if (!['Write', 'Edit', 'MultiEdit'].includes(tool) || !args.file_path) process.exit(0);

const abs = resolve(input.cwd || root, args.file_path);
// Windows and macOS ignore case in paths, so Knowledge/x.md is the same file as knowledge/x.md.
const rel = relative(root, abs).split(sep).join('/').toLowerCase();

if (rel === 'pipeline/leads.jsonl') {
  block(
    'pipeline/leads.jsonl is written only by scripts/leads.mjs. Write your batch to ' +
      'pipeline/inbox/<file>.jsonl and run: node scripts/leads.mjs import pipeline/inbox/<file>.jsonl',
  );
}

if (rel === 'memory/main.md') {
  block(
    'memory/MAIN.md is written only by scripts/memory.mjs, so every entry has a date, source and author. Run: ' +
      'node scripts/memory.mjs add main "<text>" --source "<where it came from>" --by <your agent name>',
  );
}

if (rel.startsWith('ops/runs/') || rel === 'ops/messages.md' || rel === 'ops/fallbacks.md') {
  block(`${rel} is a log kept by scripts/team-hooks.mjs and can't be edited.`);
}

// Inside a subagent the hook input names the agent; it may write only its own memory
// (a fallback may write the memory of the agent it stands in for).
const memoryOwner = /^\.claude\/agent-memory\/([^/]+)\//.exec(rel)?.[1];
if (memoryOwner && input.agent_id && input.agent_type) {
  const writer = input.agent_type.toLowerCase();
  if (writer !== memoryOwner && writer !== `${memoryOwner}-fallback`) {
    block(`${input.agent_type} can't write ${memoryOwner}'s memory. Ask the coordinator, or use node scripts/memory.mjs add ${memoryOwner} ...`);
  }
}

// The file's text once the edits are applied, so a change to part of the status line is caught too.
function afterEdits(edits) {
  const lf = (s) => String(s ?? '').replace(/\r\n/g, '\n');
  let text = existsSync(abs) ? lf(readFileSync(abs, 'utf8')) : '';
  for (const e of edits) {
    const from = lf(e.old_string);
    const to = lf(e.new_string);
    if (!from) text = to;
    else text = e.replace_all ? text.split(from).join(to) : text.replace(from, () => to);
  }
  return text;
}

if (rel.startsWith('knowledge/')) {
  if (existsSync(abs) && frontmatter(readFileSync(abs, 'utf8'))?.status === 'confirmed') {
    block(
      `${rel} is confirmed knowledge and is read-only for agents. ` +
        'Write the change as a proposal in knowledge/proposals/YYYY-MM-DD-<slug>.md instead.',
    );
  }

  const edits = tool === 'Write' ? [] : args.edits || [args];
  const confirms =
    tool === 'Write'
      ? frontmatter(args.content || '')?.status === 'confirmed'
      : frontmatter(afterEdits(edits))?.status === 'confirmed' ||
        edits.some((e) => /^status:[ \t]*["']?confirmed\b/m.test(e.new_string || ''));
  if (confirms) {
    block(
      'Agents cannot mark knowledge as confirmed. Leave status: proposed; ' +
        'a human confirms the file with node scripts/kb.mjs confirm <file>.',
    );
  }
}

process.exit(0);
