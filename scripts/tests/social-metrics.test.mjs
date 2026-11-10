import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { collect } from '../social-metrics.mjs';

const root = mkdtempSync(join(tmpdir(), 'social-metrics-'));
after(() => rmSync(root, { recursive: true, force: true }));
const now = new Date('2026-11-10T08:00:00Z');
const at = '2026-11-08T10:00:00.000Z';
const entry = (o) => ({ at, ok: true, mode: 'live', post: `outputs/marketing/posts/p-${o.channel}.md`, ...o });
const lines = (...rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status });

function fake(routes) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), headers: init.headers || {} });
    const hit = Object.entries(routes).find(([k]) => String(url).includes(k));
    return hit ? (typeof hit[1] === 'function' ? hit[1]() : hit[1]) : new Response('{}', { status: 404 });
  };
  fn.calls = calls;
  return fn;
}

describe('collect', () => {
  it('reads each channel\'s public numbers, appends one row per post, and leaves secrets out', async () => {
    mkdirSync(join(root, 'ops'), { recursive: true });
    writeFileSync(join(root, 'ops/social-log.jsonl'), lines(
      entry({ channel: 'bluesky', id: 'at://did:plc:a/app.bsky.feed.post/1', url: 'https://bsky.app/profile/did:plc:a/post/1' }),
      entry({ channel: 'mastodon', id: '55', instance: 'https://mastodon.example', url: 'https://mastodon.example/@a/55' }),
      entry({ channel: 'devto', id: '4242', url: 'https://dev.to/a/x', draft: true }),
      entry({ channel: 'linkedin', id: 'urn:li:share:9', url: 'https://www.linkedin.com/feed/update/urn:li:share:9/' }),
      { at, ok: false, mode: 'live', channel: 'bluesky', post: 'outputs/marketing/posts/refused.md', reason: 'no' },
      entry({ channel: 'bluesky', id: 'at://did:plc:a/app.bsky.feed.post/old', at: '2026-01-01T00:00:00Z' }),
    ));
    const f = fake({
      'getPosts': () => reply({ posts: [{ uri: 'at://did:plc:a/app.bsky.feed.post/1', likeCount: 5, repostCount: 2, replyCount: 1, quoteCount: 0 }] }),
      '/api/v1/statuses/55': () => reply({ favourites_count: 7, reblogs_count: 3, replies_count: 2 }),
      'articles/me/all': () => reply([{ id: 4242, public_reactions_count: 11, comments_count: 4, page_views_count: 230, published: false }]),
      'socialActions': () => reply({ message: 'forbidden' }, 403),
    });
    const env = { MASTODON_TOKEN: 'tok-SECRET', DEVTO_API_KEY: 'key-SECRET', LINKEDIN_ACCESS_TOKEN: 'li-SECRET' };
    const r = await collect(root, { fetchFn: f, env, now });
    const by = Object.fromEntries(r.rows.map((x) => [x.channel, x]));
    assert.deepEqual(by.bluesky.metrics, { likes: 5, reposts: 2, replies: 1, quotes: 0 });
    assert.deepEqual(by.mastodon.metrics, { favourites: 7, boosts: 3, replies: 2 });
    assert.deepEqual(by.devto.metrics, { reactions: 11, comments: 4, page_views: 230, published: false });
    assert.equal(by.bluesky.url, 'https://bsky.app/profile/did:plc:a/post/1');
    assert.equal(r.rows.length, 3, 'the old post and the refusal are not read');
    assert.deepEqual(r.skipped.map((s) => [s.channel, s.reason]), [['linkedin', 'the token may not read post numbers']]);
    // one request per channel call, with the key only in headers
    assert.equal(f.calls.find((c) => c.url.includes('articles/me')).headers['api-key'], 'key-SECRET');
    assert.ok(f.calls.find((c) => c.url.includes('getPosts')).url.startsWith('https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=at%3A%2F%2F'));
    const written = readFileSync(join(root, 'ops/social-metrics.jsonl'), 'utf8');
    assert.equal(written.trim().split('\n').length, 3);
    assert.doesNotMatch(written + JSON.stringify(r), /SECRET/);
    assert.equal(JSON.parse(written.split('\n')[0]).at, now.toISOString());
  });

  it('reads LinkedIn numbers when the token allows it, skips channels with no key, and reports a failing platform without writing a row', async () => {
    rmSync(join(root, 'ops/social-metrics.jsonl'), { force: true });
    writeFileSync(join(root, 'ops/social-log.jsonl'), lines(
      entry({ channel: 'linkedin', id: 'urn:li:share:9' }),
      entry({ channel: 'devto', id: '1' }),
      entry({ channel: 'bluesky', id: 'at://did:plc:a/app.bsky.feed.post/2' }),
    ));
    const f = fake({
      'socialActions': () => reply({ likesSummary: { totalLikes: 9 }, commentsSummary: { totalFirstLevelComments: 2 } }),
      'getPosts': () => reply({}, 500),
    });
    const r = await collect(root, { fetchFn: f, env: { LINKEDIN_ACCESS_TOKEN: 'x' }, now });
    assert.deepEqual(r.rows.map((x) => [x.channel, x.metrics]), [['linkedin', { likes: 9, comments: 2 }]]);
    assert.deepEqual(r.skipped.map((s) => [s.channel, s.reason]), [['devto', 'no DEVTO_API_KEY']]);
    assert.deepEqual(r.errors.map((s) => [s.channel, s.reason]), [['bluesky', 'Bluesky answered 500']]);
    assert.equal(readFileSync(join(root, 'ops/social-metrics.jsonl'), 'utf8').trim().split('\n').length, 1);
  });

  it('does nothing, and makes no request, when nothing was published', async () => {
    rmSync(join(root, 'ops/social-log.jsonl'), { force: true });
    rmSync(join(root, 'ops/social-metrics.jsonl'), { force: true });
    const f = fake({});
    const r = await collect(root, { fetchFn: f, env: {}, now });
    assert.deepEqual([r.rows.length, r.skipped.length, r.errors.length, f.calls.length], [0, 0, 0, 0]);
    assert.equal(existsSync(join(root, 'ops/social-metrics.jsonl')), false);
  });
});
