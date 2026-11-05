import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sendTask } from '../voice-task.mjs';

const reply = (status, body) => async () => ({ status, ok: status < 400, json: async () => body });

describe('voice task', () => {
  it('posts the task the way the task box does, with the Origin and marker header mission control checks', async () => {
    let seen;
    const fetchFn = async (url, init) => {
      seen = { url, init };
      return { status: 200, ok: true, json: async () => ({ message: 'J-20261105-09 is starting.', id: 'J-20261105-09' }) };
    };
    const r = await sendTask('  Find   five leads\nthis week ', { port: 4318, fetchFn });
    assert.deepEqual(r, { ok: true, message: 'J-20261105-09 is starting.', id: 'J-20261105-09' });
    assert.equal(seen.url, 'http://127.0.0.1:4318/api/tasks');
    assert.equal(seen.init.method, 'POST');
    assert.equal(seen.init.headers.Origin, 'http://127.0.0.1:4318');
    assert.equal(seen.init.headers['X-Team-Page'], '1');
    assert.deepEqual(JSON.parse(seen.init.body), { task: 'Find five leads this week' });
  });

  it('says when mission control is not running, when sign-in is on, and when it refuses', async () => {
    const down = await sendTask('x', { fetchFn: async () => { throw new Error('ECONNREFUSED'); } });
    assert.equal(down.ok, false);
    assert.match(down.message, /Mission control is not running at http:\/\/127\.0\.0\.1:4318\. Start it with npm start/);
    assert.match((await sendTask('x', { fetchFn: reply(401, { message: 'Sign in first.' }) })).message, /wants a sign-in/);
    assert.deepEqual(await sendTask('x', { fetchFn: reply(400, { message: 'Keep the task under 2000 characters.' }) }), { ok: false, message: 'Keep the task under 2000 characters.' });
    assert.match((await sendTask('x', { fetchFn: reply(500, null) })).message, /refused it \(500\)/);
  });

  it('sends nothing for an empty or over-long task', async () => {
    let called = false;
    const fetchFn = async () => { called = true; return { status: 200, ok: true, json: async () => ({}) }; };
    assert.equal((await sendTask('   ', { fetchFn })).ok, false);
    assert.equal((await sendTask('a'.repeat(2001), { fetchFn })).ok, false);
    assert.equal(called, false);
  });
});
