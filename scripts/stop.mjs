#!/usr/bin/env node
// Stops mission control (the page's server) if it is running, and says what it left alone.
//
//   node scripts/stop.mjs [--port <number>]      npm run stop does the same
//
// It stops only a process that is really mission control, never whatever else happens to use the port. A task that is
// running keeps going: it is its own process, and stopping one half way loses its work.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain, ROOT } from './_shared.mjs';

const args = process.argv.slice(2);
const flag = args.indexOf('--port');
const PORT = flag >= 0 ? Number(args[flag + 1]) : 4318;

// The processes listening on a port, as { pid, command }.
export function listeners(port, run = spawnSync) {
  const found = run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' });
  return String(found.stdout || '').split('\n').map((l) => Number(l.trim())).filter(Boolean).map((pid) => ({
    pid,
    command: String(run('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }).stdout || '').trim(),
  }));
}

// Only mission control's own server counts.
export const isMissionControl = (command) => /\bnode\b.*scripts\/control\.mjs\b/.test(command);

export function taskRunning(root = ROOT) {
  const file = join(root, 'ops', 'runs', 'jarvis.lock');
  if (!existsSync(file)) return false;
  try {
    process.kill(Number(readFileSync(file, 'utf8')), 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

if (isMain(import.meta.url)) {
  if (!Number.isInteger(PORT) || PORT <= 0) {
    console.error('Usage: node scripts/stop.mjs [--port <number>]');
    process.exit(1);
  }
  const mine = listeners(PORT).filter((p) => isMissionControl(p.command));
  if (!mine.length) console.log(`Mission control is not running on port ${PORT}.`);
  for (const { pid } of mine) {
    process.kill(pid, 'SIGTERM');
    console.log(`Stopped mission control (process ${pid}).`);
  }
  if (taskRunning()) console.log('A task is still running and was left alone. It finishes on its own.');
}
