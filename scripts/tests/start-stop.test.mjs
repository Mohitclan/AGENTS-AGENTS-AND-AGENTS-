import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { browserCommand } from '../control.mjs';
import { isMissionControl, listeners } from '../stop.mjs';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
const scratch = mkdtempSync(join(tmpdir(), 'start-stop-'));
after(() => repo.remove());

// Stands in for the browser: writes the address it was asked to open.
const recorder = join(scratch, 'record-open.mjs');
writeFileSync(recorder, "import { appendFileSync } from 'node:fs'; appendFileSync(process.env.OPEN_RECORD, process.argv.slice(2).join(' ') + '\\n');\n");
const record = join(scratch, 'opened.txt');
const env = { ...process.env, MISSION_OPEN_CMD: `${process.execPath} ${recorder}`, OPEN_RECORD: record, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' };
const control = (...args) => spawn(process.execPath, [repo.path('scripts', 'control.mjs'), ...args], { cwd: repo.dir, env });
const urlOf = (child) => new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
const opened = async (url) => {
  for (let i = 0; i < 40; i++) {
    if (existsSync(record) && readFileSync(record, 'utf8').includes(url)) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
};
const exited = (child) => new Promise((resolve) => child.on('close', resolve));

describe('start: the page and the browser together', () => {
  it('picks Chrome on a Mac when it is there, the default browser when not, and the right command elsewhere', () => {
    const url = 'http://127.0.0.1:4318';
    assert.deepEqual(browserCommand(url, { platform: 'darwin', env: {}, has: () => true }), ['open', ['-a', 'Google Chrome', url]]);
    assert.deepEqual(browserCommand(url, { platform: 'darwin', env: {}, has: () => false }), ['open', [url]]);
    assert.deepEqual(browserCommand(url, { platform: 'win32', env: {} }), ['cmd', ['/c', 'start', '', url]]);
    assert.deepEqual(browserCommand(url, { platform: 'linux', env: {} }), ['xdg-open', [url]]);
    assert.deepEqual(browserCommand(url, { platform: 'darwin', env: { MISSION_OPEN_CMD: 'open -a Safari' }, has: () => true }), ['open', ['-a', 'Safari', url]]);
  });

  it('with --open, starts the server and opens the browser at its address; without it, opens nothing', async () => {
    const plain = control('--port', '0');
    const plainUrl = await urlOf(plain);
    await new Promise((r) => setTimeout(r, 600));
    assert.equal(existsSync(record) && readFileSync(record, 'utf8').includes(plainUrl), false, 'no browser without --open');
    plain.kill();
    await exited(plain);

    const both = control('--port', '0', '--open');
    const url = await urlOf(both);
    assert.equal(await opened(url), true, 'the browser was asked to open the page');
    assert.equal((await fetch(url)).status, 200);
    both.kill();
    await exited(both);
  });

  it('with --open and the page already running, just opens it and stops, instead of failing', async () => {
    const first = control('--port', '0');
    const url = await urlOf(first);
    const port = new URL(url).port;
    try {
      const again = control('--port', port, '--open');
      let out = '';
      again.stdout.on('data', (d) => { out += d; });
      assert.equal(await exited(again), 0);
      assert.match(out, /already running at/);
      assert.equal(await opened(`http://127.0.0.1:${port}`), true);
      const without = control('--port', port);
      assert.equal(await exited(without), 1, 'plain start still reports the port is in use');
    } finally {
      first.kill();
      await exited(first);
    }
  });
});

describe('stop: only mission control, and it says what it left alone', () => {
  it('recognises mission control by its command line', () => {
    assert.equal(isMissionControl('node scripts/control.mjs'), true);
    assert.equal(isMissionControl('/usr/local/bin/node /Users/me/agent agent/team/scripts/control.mjs --open'), true);
    assert.equal(isMissionControl('node scripts/jarvis.mjs run'), false);
    assert.equal(isMissionControl('python3 -m http.server 4318'), false);
    assert.equal(isMissionControl('node server.js'), false);
  });

  it('reads who is listening on a port', () => {
    const calls = [];
    const run = (cmd, args) => {
      calls.push(cmd);
      return cmd === 'lsof' ? { stdout: '123\n456\n' } : { stdout: args[3] === '123' ? 'node scripts/control.mjs\n' : 'something else\n' };
    };
    assert.deepEqual(listeners(4318, run), [{ pid: 123, command: 'node scripts/control.mjs' }, { pid: 456, command: 'something else' }]);
    assert.deepEqual(listeners(4318, () => ({ stdout: '' })), []);
  });

  it('stops a running mission control, and leaves any other program on the port alone', async () => {
    const mc = control('--port', '0');
    const url = await urlOf(mc);
    const port = new URL(url).port;
    const stop = spawnSync(process.execPath, [repo.path('scripts', 'stop.mjs'), '--port', port], { cwd: repo.dir, encoding: 'utf8' });
    assert.match(stop.stdout, /Stopped mission control \(process \d+\)\./);
    await exited(mc);
    await assert.rejects(fetch(url), 'the page is gone');

    const other = createServer((_, res) => res.end('not mission control'));
    await new Promise((r) => other.listen(0, '127.0.0.1', r));
    const otherPort = other.address().port;
    try {
      const left = spawnSync(process.execPath, [repo.path('scripts', 'stop.mjs'), '--port', String(otherPort)], { cwd: repo.dir, encoding: 'utf8' });
      assert.match(left.stdout, /Mission control is not running on port/);
      assert.equal((await fetch(`http://127.0.0.1:${otherPort}`)).status, 200, 'still up');
    } finally {
      other.close();
    }
  });

  it('says when a task is still running, and that it was left alone', () => {
    mkdirSync(repo.path('ops', 'runs'), { recursive: true });
    writeFileSync(repo.path('ops', 'runs', 'jarvis.lock'), String(process.pid));
    const out = spawnSync(process.execPath, [repo.path('scripts', 'stop.mjs'), '--port', '1'], { cwd: repo.dir, encoding: 'utf8' });
    assert.match(out.stdout, /A task is still running and was left alone/);
  });
});
