// Test helpers: every test works on a throwaway copy of the repo, so nothing real is touched.
// .env is left out, so no test can sign in to the real mailbox.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { ROOT } from '../_shared.mjs';

const SKIP = /^(\.git|\.env|repos|node_modules|\.claude[\\/]agent-memory|\.claude[\\/]worktrees|ops[\\/]runs|ops[\\/]gate-log\.jsonl|pipeline[\\/](leads\.jsonl|leads\.csv|leads\.lock|suppression\.jsonl|inbox))([\\/]|$)/;

export function makeCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'sales-team-test-'));
  cpSync(ROOT, dir, { recursive: true, filter: (src) => !SKIP.test(relative(ROOT, src).split(sep).join('/')) });
  // Every copy starts in the pilot, whatever the real settings say (live since 2026-11-10): tests that need the pilot
  // off end it themselves, the way a person does.
  const mailConfig = join(dir, 'ops', 'mail-config.json');
  if (existsSync(mailConfig)) {
    const config = JSON.parse(readFileSync(mailConfig, 'utf8'));
    if (config.pilot?.paused) {
      for (const k of ['allow_only', 'test_recipients']) if (config.pilot.paused[k]) config.pilot[k] = config.pilot.paused[k];
      delete config.pilot.paused;
      writeFileSync(mailConfig, JSON.stringify(config, null, 2));
    }
  }
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
