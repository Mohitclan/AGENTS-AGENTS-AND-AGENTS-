import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import worker, { viaOf } from '../../tracker/worker.js';
import { fetchOpens, opensOfSend, opensRows, savedOpens } from '../opens.mjs';
import { trackerBase, withPixel } from '../send-email.mjs';

const ID = 'a'.repeat(32);

// A stand-in for Cloudflare's KV namespace and the request context.
function fakeEnv(token = 'secret') {
  const store = new Map();
  return {
    READ_TOKEN: token,
    OPENS: {
      get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null),
      put: async (k, v) => store.set(k, v),
      list: async ({ prefix }) => ({ keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
    },
  };
}
const ctx = () => {
  const jobs = [];
  return { waitUntil: (p) => jobs.push(p), done: () => Promise.all(jobs) };
};
const hit = async (env, path, headers = {}, cf) => {
  const c = ctx();
  const req = new Request(`https://t.example${path}`, { headers });
  if (cf) Object.defineProperty(req, 'cf', { value: cf });
  const res = await worker.fetch(req, env, c);
  await c.done();
  return res;
};

describe('the tracker (tracker/worker.js)', () => {
  it('returns an uncached image and counts each load, with the kind of fetcher and no IP', async () => {
    const env = fakeEnv();
    const res = await hit(env, `/o/${ID}.gif`, { 'User-Agent': 'Mozilla/5.0 (via ggpht.com GoogleImageProxy)', 'CF-Connecting-IP': '1.2.3.4' });
    assert.equal(res.headers.get('Content-Type'), 'image/gif');
    assert.match(res.headers.get('Cache-Control'), /no-store/);
    await hit(env, `/o/${ID}.gif`, {}, { asOrganization: 'Apple Inc.' });
    const rec = await env.OPENS.get(`o:${ID}`);
    assert.equal(rec.count, 2);
    assert.deepEqual(rec.hits.map((h) => h.via), ['gmail', 'apple']);
    assert.doesNotMatch(JSON.stringify(rec), /1\.2\.3\.4|Mozilla/, 'never stores the IP or the user agent');
  });
  it('lists the opens only with the read token', async () => {
    const env = fakeEnv('s3cret');
    await hit(env, `/o/${ID}.gif`);
    assert.equal((await hit(env, '/opens')).status, 401);
    assert.equal((await hit(env, '/opens', { Authorization: 'Bearer wrong' })).status, 401);
    const ok = await hit(env, '/opens', { Authorization: 'Bearer s3cret' });
    assert.equal((await ok.json())[ID].count, 1);
    assert.equal((await hit(fakeEnv(''), '/opens', { Authorization: 'Bearer ' })).status, 401, 'no token set: nobody reads');
  });
  it('ignores anything that is not a pixel of a 32-character id', async () => {
    const env = fakeEnv();
    assert.equal((await hit(env, '/o/123.gif')).status, 404);
    assert.equal((await hit(env, '/')).status, 404);
  });
  it('names the fetcher', () => {
    assert.equal(viaOf('YahooMailProxy; https://help.yahoo.com'), 'yahoo');
    assert.equal(viaOf('', 'Microsoft Corporation'), 'outlook');
    assert.equal(viaOf('Mozilla/5.0', 'Some ISP'), 'other');
  });
});

describe('the pixel in send-email', () => {
  it('is on only with tracking enabled and an https address', () => {
    assert.equal(trackerBase({ tracking: { enabled: true, base_url: 'https://t.example.workers.dev/' } }), 'https://t.example.workers.dev');
    assert.equal(trackerBase({ tracking: { enabled: false, base_url: 'https://t.example' } }), '');
    assert.equal(trackerBase({ tracking: { enabled: true, base_url: 'http://t.example' } }), '');
    assert.equal(trackerBase({}), '');
  });
  it('goes at the very end of the email', () => {
    const html = withPixel('<div><p>Hi</p>\n</div>', 'https://t.example', ID);
    assert.match(html, new RegExp(`<p>Hi</p>\\n<img src="https://t\\.example/o/${ID}\\.gif" width="1" height="1" alt=""[^>]*>\\n</div>$`));
  });
});

describe('reading opens back (scripts/opens.mjs)', () => {
  const root = mkdtempSync(join(tmpdir(), 'opens-'));
  after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'ops'));
  const config = (tracking) => writeFileSync(join(root, 'ops', 'mail-config.json'), JSON.stringify({ tracking }));

  it('says why it cannot fetch while tracking is off or the token is missing', async () => {
    config({ enabled: false, base_url: '' });
    assert.match((await fetchOpens(root, { env: {} })).text, /tracking is off/i);
    config({ enabled: true, base_url: 'https://t.example' });
    assert.match((await fetchOpens(root, { env: {} })).text, /TRACKER_READ_TOKEN is not set/);
  });
  it('fetches with the token and saves the opens', async () => {
    config({ enabled: true, base_url: 'https://t.example' });
    let asked;
    const fetch = async (url, opts) => {
      asked = { url, auth: opts.headers.Authorization };
      return { ok: true, status: 200, json: async () => ({ [ID]: { count: 3, first: '2026-11-10T10:00:30Z', last: '2026-11-10T12:00:00Z', hits: [{ at: '2026-11-10T10:00:30Z', via: 'apple' }, { at: '2026-11-10T11:00:00Z', via: 'other' }, { at: '2026-11-10T12:00:00Z', via: 'other' }] } }) };
    };
    const r = await fetchOpens(root, { fetch, env: { TRACKER_READ_TOKEN: 'tok' } });
    assert.ok(r.ok, r.text);
    assert.deepEqual(asked, { url: 'https://t.example/opens', auth: 'Bearer tok' });
    assert.equal(savedOpens(root).opens[ID].count, 3);
    const refused = await fetchOpens(root, { fetch: async () => ({ ok: false, status: 401 }), env: { TRACKER_READ_TOKEN: 'x' } });
    assert.match(refused.text, /401: TRACKER_READ_TOKEN does not match/);
    assert.equal(savedOpens(root).opens[ID].count, 3, 'a failed fetch keeps the last copy');
  });
  it('counts a send\'s opens, marking the ones that may be automatic', () => {
    const { opens } = savedOpens(root);
    const o = opensOfSend({ at: '2026-11-10T10:00:00Z', track: ID }, opens);
    assert.deepEqual([o.count, o.auto, o.last], [3, 1, '2026-11-10T12:00:00Z']);
    assert.equal(opensOfSend({ at: '2026-11-10T10:00:00Z' }, opens), null, 'an untracked send');
  });
  it('lists one row per tracked send', () => {
    writeFileSync(join(root, 'ops', 'send-log.jsonl'), [
      { at: '2026-11-10T10:00:00.000Z', kind: 'outreach', mode: 'test', to: 'p@x.com', subject: '[TEST] Hello', track: ID },
      { at: '2026-11-10T10:05:00.000Z', kind: 'outreach', mode: 'test', to: 'p@x.com', subject: '[TEST] Other', track: 'b'.repeat(32) },
      { at: '2026-11-10T10:06:00.000Z', kind: 'report', to: 'm@x.com' },
      { at: '2026-11-10T10:07:00.000Z', kind: 'outreach', mode: 'test', to: 'p@x.com', subject: 'untracked' },
    ].map((e) => JSON.stringify(e)).join('\n'));
    const rows = opensRows(root);
    assert.deepEqual(rows.map((r) => [r.subject, r.opens]), [['[TEST] Hello', '3'], ['[TEST] Other', '0']]);
    assert.match(rows[1].note, /not opened yet/);
    assert.ok(readFileSync(join(root, 'ops', 'opens.json'), 'utf8').includes(ID));
  });
});
