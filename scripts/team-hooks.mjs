#!/usr/bin/env node
// Claude Code hooks for how the agents work together (configured in .claude/settings.json).
//
//   PreToolUse Agent          an agent may call only the agents in its can_ask list; every call is logged in ops/messages.md
//   SubagentStop              a reply without a valid RESULT block is sent back to the agent, up to three attempts in all
//   PostToolUse Agent         after three failed attempts, tells the coordinator to run the agent's fallback
//   PostToolUseFailure Agent  the same, when the agent call itself errors out
//
// Attempt counts live in ops/runs/<agent-id>.json (git-ignored, pruned after a week).
// Switches to a fallback are logged in ops/fallbacks.md.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAIN_AGENT, agentNames, isFallback, list, readAgent } from './_agents.mjs';
import { ROOT } from './_shared.mjs';

const MAX_ATTEMPTS = 3;
const RUNS = join(ROOT, 'ops', 'runs');
const MESSAGES = join(ROOT, 'ops', 'messages.md');
const FALLBACKS = join(ROOT, 'ops', 'fallbacks.md');
const RUN_TTL_MS = 7 * 86_400_000;
const TASK_ID = /\bT-\d{8}-\d{2}\b/;

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0); // not a hook payload
}
const event = input.hook_event_name;
const args = input.tool_input || {};

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function addContext(text) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text } }));
  process.exit(0);
}

function now() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const cell = (s) => String(s ?? '').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();

function appendRow(file, header, row) {
  mkdirSync(join(ROOT, 'ops'), { recursive: true });
  if (!existsSync(file)) writeFileSync(file, header);
  appendFileSync(file, `| ${row.map(cell).join(' | ')} |\n`);
}

// Our own agents, not built-in ones such as Explore or general-purpose.
const isTeamAgent = (name) => !!name && name !== MAIN_AGENT && agentNames().includes(name);

// A reply counts only if it ends with the RESULT block from CLAUDE.md: at least a task and a valid status.
// The block's own lines can mention "RESULT" too (e.g. "summary: it replied with a RESULT block"),
// so try each occurrence from the last one back.
function validResult(text) {
  const s = String(text || '');
  for (let at = s.lastIndexOf('RESULT'); at >= 0; at = at > 0 ? s.lastIndexOf('RESULT', at - 1) : -1) {
    const tail = s.slice(at);
    if (/^[\s>*_-]*task[\s*_:]+\S/im.test(tail) && /^[\s>*_-]*status[\s*_:]+(done|blocked|needs_input)\b/im.test(tail)) return true;
  }
  return false;
}

function replyText(response) {
  if (typeof response === 'string') return response;
  const content = response?.content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === 'string' ? c : c?.text || '')).join('\n');
  return typeof content === 'string' ? content : JSON.stringify(response ?? '');
}

// Falls back to the transcript when the hook input has no last_assistant_message.
function lastMessage() {
  if (typeof input.last_assistant_message === 'string') return input.last_assistant_message;
  const path = input.agent_transcript_path;
  if (!path || !existsSync(path)) return '';
  const lines = readFileSync(path, 'utf8').trim().split('\n').reverse();
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'assistant') return replyText(entry.message);
    } catch {
      // skip a partial line
    }
  }
  return '';
}

const runFile = (id) => join(RUNS, `${String(id).replace(/[^\w.-]/g, '_')}.json`);
function loadRun(id) {
  try {
    return JSON.parse(readFileSync(runFile(id), 'utf8'));
  } catch {
    return null;
  }
}
function saveRun(id, run) {
  mkdirSync(RUNS, { recursive: true });
  writeFileSync(runFile(id), JSON.stringify(run, null, 2));
}
function pruneRuns() {
  if (!existsSync(RUNS)) return;
  for (const f of readdirSync(RUNS)) {
    try {
      if (Date.now() - statSync(join(RUNS, f)).mtimeMs > RUN_TTL_MS) unlinkSync(join(RUNS, f));
    } catch {
      // gone already
    }
  }
}

function logFallback(agent, why, next) {
  appendRow(
    FALLBACKS,
    '# Fallbacks\n\nEvery time an agent failed three times and the work moved to its fallback, or a fallback failed too. Written by `scripts/team-hooks.mjs`.\n\n| When | Agent | Task | What went wrong | Next |\n|---|---|---|---|---|\n',
    [now(), agent, (String(args.prompt || '').match(TASK_ID) || ['-'])[0], why, next],
  );
}

function switchToFallback(agent, why) {
  if (isFallback(agent)) {
    logFallback(agent, why, 'escalate to a person');
    addContext(
      `ESCALATE: ${agent} (the fallback) also failed: ${why}. Don't retry. Mark the task "blocked" on ops/board.md ` +
        'and tell the human what was tried, what failed and what you need from them.',
    );
  }
  const fallback = readAgent(agent)?.fields.fallback;
  if (!fallback || !readAgent(fallback)) {
    logFallback(agent, why, 'no fallback defined: escalate');
    addContext(`ESCALATE: ${agent} failed (${why}) and has no fallback agent. Mark the task "blocked" on ops/board.md and tell the human.`);
  }
  logFallback(agent, why, `switch to ${fallback}`);
  addContext(
    `FALLBACK: ${agent} failed: ${why}. Launch ${fallback} now with the same brief (same task ID, inputs and output path). ` +
      `Set the task to "fallback" on ops/board.md, send its result to the evaluator as usual, and mention the switch in your report.`,
  );
}

if (event === 'PreToolUse' && input.tool_name === 'Agent') {
  const fromMain = !input.agent_id;
  const caller = fromMain ? MAIN_AGENT : input.agent_type || 'unknown';
  const target = args.subagent_type;
  if (!fromMain) {
    const allowed = list(readAgent(caller)?.fields.can_ask);
    if (isFallback(caller)) block(`${caller} is a fallback and doesn't call other agents. List the handoff in your RESULT block instead.`);
    if (!target) block(`Name the agent to ask: set subagent_type to one of ${allowed.join(', ') || '(none: you may not call other agents)'}.`);
    if (target === caller) block("An agent can't call itself. Do the work, or list a handoff in your RESULT block.");
    if (target === MAIN_AGENT || isFallback(target)) block(`Only the coordinator's session runs ${target}. List a handoff in your RESULT block instead.`);
    if (!allowed.includes(target)) {
      block(
        `${caller} may ask only: ${allowed.join(', ') || 'no other agents'}. For ${target}, list a handoff in your RESULT block and the coordinator decides.`,
      );
    }
  }
  appendRow(
    MESSAGES,
    '# Agent calls\n\nEvery time one agent started another. Written by `scripts/team-hooks.mjs`.\n\n| When | From | To | Task | What |\n|---|---|---|---|---|\n',
    [now(), caller, target || '(none)', (String(args.prompt || '').match(TASK_ID) || ['-'])[0], args.description || String(args.prompt || '').slice(0, 80)],
  );
  process.exit(0);
}

if (event === 'SubagentStop') {
  pruneRuns();
  const agent = input.agent_type;
  const id = input.agent_id;
  if (!id || !isTeamAgent(agent)) process.exit(0);
  const run = loadRun(id) || { agent, failures: 0, started: now() };
  if (validResult(lastMessage())) {
    saveRun(id, { ...run, ok: true, finished: now() });
    process.exit(0);
  }
  run.failures += 1;
  if (run.failures < MAX_ATTEMPTS) {
    saveRun(id, run);
    process.stdout.write(
      JSON.stringify({
        decision: 'block',
        reason:
          `Attempt ${run.failures + 1} of ${MAX_ATTEMPTS}: your reply didn't end with a valid RESULT block (task, and status done, blocked or needs_input). ` +
          'Finish the task, save your files, and end with the RESULT block from CLAUDE.md. If you can\'t finish, say why and use status blocked.',
      }),
    );
    process.exit(0);
  }
  saveRun(id, { ...run, ok: false, failed: true, finished: now() });
  process.exit(0);
}

if ((event === 'PostToolUse' || event === 'PostToolUseFailure') && input.tool_name === 'Agent') {
  const agent = args.subagent_type;
  if (!isTeamAgent(agent)) process.exit(0);
  if (event === 'PostToolUseFailure') switchToFallback(agent, `the agent call errored (${cell(input.error || 'no details').slice(0, 120)})`);

  const response = input.tool_response;
  if (response?.status === 'async_launched' || args.run_in_background) process.exit(0); // no reply yet
  const run = response?.agentId ? loadRun(response.agentId) : null;
  if (run?.failed) switchToFallback(agent, `no valid RESULT block after ${MAX_ATTEMPTS} attempts`);
  if (!run && !validResult(replyText(response))) {
    addContext(
      `CHECK: ${agent}'s reply has no RESULT block and its attempts weren't recorded. If it didn't finish the task, ` +
        `launch ${readAgent(agent)?.fields.fallback || 'its fallback'} with the same brief; if it did, carry on.`,
    );
  }
  process.exit(0);
}

process.exit(0);
