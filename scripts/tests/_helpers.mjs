// Test helpers: every test works on a throwaway copy of the repo, so nothing real is touched.
// .env is left out, so no test can sign in to the real mailbox.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { ROOT } from '../_shared.mjs';

const SKIP = /^(\.git|\.env|repos|node_modules|\.claude[\\/]agent-memory|\.claude[\\/]worktrees|ops[\\/]runs|ops[\\/]gate-log\.jsonl|pipeline[\\/](leads\.jsonl|leads\.csv|leads\.lock|suppression\.jsonl|inbox))([\\/]|$)/;

export function makeCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'sales-team-test-'));
  cpSync(ROOT, dir, { recursive: true, filter: (src) => !SKIP.test(relative(ROOT, src).split(sep).join('/')) });
  const env = { ...process.env, CLAUDE_PROJECT_DIR: dir };
  const node = (args, input) => {
    const r = spawnSync(process.execPath, args, { cwd: dir, env, input, encoding: 'utf8' });
    return { code: r.status, stdout: r.stdout, stderr: r.stderr };
  };
  return {
    dir,
    path: (...p) => join(dir, ...p),
    // Runs a hook script with a JSON payload on stdin.
    hook: (script, payload) => node([join('scripts', script)], typeof payload === 'string' ? payload : JSON.stringify(payload)),
    run: (script, ...args) => node([join('scripts', script), ...args]),
    runAsync: (script, ...args) =>
      new Promise((done) => {
        const child = spawn(process.execPath, [join('scripts', script), ...args], { cwd: dir, env });
        child.on('close', (code) => done(code));
      }),
    remove: () => rmSync(dir, { recursive: true, force: true }),
  };
}

// What a hook decided: block (exit 2), ask, a block decision for SubagentStop, or allow.
export function decision(result) {
  if (result.code === 2) return 'block';
  const out = result.stdout.trim();
  if (!out) return 'allow';
  const json = JSON.parse(out);
  if (json.decision === 'block') return 'retry';
  if (json.hookSpecificOutput?.permissionDecision === 'ask') return 'ask';
  if (json.hookSpecificOutput?.additionalContext) return 'context';
  return 'allow';
}
