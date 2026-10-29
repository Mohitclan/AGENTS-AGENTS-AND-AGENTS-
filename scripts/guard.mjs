#!/usr/bin/env node
// Claude Code PreToolUse hook for Write and Edit (configured in .claude/settings.json).
// Runs for the main session and for every subagent. Exit code 2 blocks the call,
// and the message on stderr goes back to the agent.
//
//   - Confirmed knowledge files are read-only for agents.
//   - Agents can't mark knowledge as confirmed.
//   - pipeline/leads.jsonl is written only by scripts/leads.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { frontmatter } from './_shared.mjs';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0); // not a hook payload; nothing to guard
}

const tool = input.tool_name;
const args = input.tool_input || {};
if (!['Write', 'Edit', 'MultiEdit'].includes(tool) || !args.file_path) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const abs = resolve(input.cwd || root, args.file_path);
const rel = relative(root, abs).split(sep).join('/');

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

if (rel === 'pipeline/leads.jsonl') {
  block(
    'pipeline/leads.jsonl is written only by scripts/leads.mjs. Write your batch to ' +
      'pipeline/inbox/<file>.jsonl and run: node scripts/leads.mjs import pipeline/inbox/<file>.jsonl',
  );
}

if (rel.startsWith('knowledge/')) {
  if (existsSync(abs) && frontmatter(readFileSync(abs, 'utf8'))?.status === 'confirmed') {
    block(
      `${rel} is confirmed knowledge and is read-only for agents. ` +
        'Write the change as a proposal in knowledge/proposals/YYYY-MM-DD-<slug>.md instead.',
    );
  }

  const confirms =
    tool === 'Write'
      ? frontmatter(args.content || '')?.status === 'confirmed'
      : [args.new_string, ...(args.edits || []).map((e) => e.new_string)].some((s) =>
          /^status:[ \t]*confirmed\b/m.test(s || ''),
        );
  if (confirms) {
    block(
      'Agents cannot mark knowledge as confirmed. Leave status: proposed; ' +
        'a human confirms the file with node scripts/kb.mjs confirm <file>.',
    );
  }
}

process.exit(0);
