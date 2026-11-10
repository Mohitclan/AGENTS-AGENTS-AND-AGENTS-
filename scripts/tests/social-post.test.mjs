import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { decidePost } from '../posts.mjs';
import { ADAPTERS, linkFacets, linkedinEscape, instanceUrl, preflight, publish, publishFromPage, writePostApproval } from '../social-post.mjs';
import { makeCopy } from './_helpers.mjs';

const T = new Date().toISOString().slice(0, 10);
const wait = (ms = 25) => new Promise((r) => setTimeout(r, ms));
const POSTS = 'outputs/marketing/posts';

const ENV = {
  BLUESKY_HANDLE: 'team.bsky.social', BLUESKY_APP_PASSWORD: 'pw-bsky-SECRET',
  MASTODON_INSTANCE: 'mastodon.example', MASTODON_TOKEN: 'tok-masto-SECRET',
  DEVTO_API_KEY: 'key-devto-SECRET',
  LINKEDIN_ACCESS_TOKEN: 'tok-linkedin-SECRET', LINKEDIN_AUTHOR: 'urn:li:person:abc',
};

// A fake network: every call is kept, and `routes` answers by URL. Nothing here reaches a real server.
function fakeFetch(routes = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : null });
    const hit = Object.entries(routes).find(([k]) => String(url).includes(k));
    if (!hit) return new Response('{}', { status: 404 });
    const v = typeof hit[1] === 'function' ? hit[1](init) : hit[1];
    return v instanceof Response ? v : new Response(JSON.stringify(v.body ?? {}), { status: v.status ?? 200, headers: v.headers || {} });
  };
  fn.calls = calls;
  return fn;
}
const OK = {
  'createSession': { body: { accessJwt: 'jwt-SECRET', did: 'did:plc:abc' } },
  'createRecord': { body: { uri: 'at://did:plc:abc/app.bsky.feed.post/3kxyz', cid: 'c' } },
  '/api/v1/statuses': { body: { id: '1100', url: 'https://mastodon.example/@team/1100' } },
  'dev.to/api/articles': { status: 201, body: { id: 4242, url: 'https://dev.to/team/launch-videos-temp-slug-xyz' } },
  'api.linkedin.com/rest/posts': { status: 201, headers: { 'x-restli-id': 'urn:li:share:777' }, body: {} },
};

describe('the adapters (fake network)', () => {
  const secret = (n) => ENV[n] || '';

  it('Bluesky signs in with the handle and app password, then creates a post record with link facets in UTF-8 bytes', async () => {
    const f = fakeFetch(OK);
    const text = 'Café launch 🚀 see https://motionrepo.panscience.ai/demo.';
    const r = await ADAPTERS.bluesky({ text, secret, fetchFn: f, now: new Date('2026-11-10T10:00:00Z') });
    assert.equal(r.url, 'https://bsky.app/profile/did:plc:abc/post/3kxyz');
    assert.equal(r.id, 'at://did:plc:abc/app.bsky.feed.post/3kxyz');
    const [session, create] = f.calls;
    assert.equal(session.url, 'https://bsky.social/xrpc/com.atproto.server.createSession');
    assert.deepEqual(session.body, { identifier: 'team.bsky.social', password: 'pw-bsky-SECRET' });
    assert.equal(create.url, 'https://bsky.social/xrpc/com.atproto.repo.createRecord');
    assert.equal(create.headers.Authorization, 'Bearer jwt-SECRET');
    assert.equal(create.body.repo, 'did:plc:abc');
    assert.equal(create.body.collection, 'app.bsky.feed.post');
    assert.deepEqual([create.body.record.$type, create.body.record.text, create.body.record.createdAt], ['app.bsky.feed.post', text, '2026-11-10T10:00:00.000Z']);
    const [facet] = create.body.record.facets;
    const bytes = new TextEncoder().encode(text);
    assert.equal(new TextDecoder().decode(bytes.slice(facet.index.byteStart, facet.index.byteEnd)), 'https://motionrepo.panscience.ai/demo', 'the trailing full stop is not part of the link');
    assert.deepEqual(facet.features, [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://motionrepo.panscience.ai/demo' }]);
    assert.deepEqual(linkFacets('no links here'), []);
  });

  it('Mastodon posts a public status with the bearer token to the instance (https added)', async () => {
    const f = fakeFetch(OK);
    const r = await ADAPTERS.mastodon({ text: 'Hello fediverse', secret, fetchFn: f });
    assert.deepEqual([r.id, r.url, r.instance], ['1100', 'https://mastodon.example/@team/1100', 'https://mastodon.example']);
    const [c] = f.calls;
    assert.deepEqual([c.method, c.url], ['POST', 'https://mastodon.example/api/v1/statuses']);
    assert.equal(c.headers.Authorization, 'Bearer tok-masto-SECRET');
    assert.deepEqual(c.body, { status: 'Hello fediverse', visibility: 'public' });
    assert.equal(instanceUrl('https://mastodon.social/'), 'https://mastodon.social');
    assert.throws(() => instanceUrl('http://mastodon.social'), /https/);
  });

  it('dev.to creates an article that is not published, titled from the heading', async () => {
    const f = fakeFetch(OK);
    const r = await ADAPTERS.devto({ text: '# Launch videos from a repo\n\n## The problem\n\nText.', title: '', secret, fetchFn: f });
    assert.deepEqual([r.id, r.draft], ['4242', true]);
    const [c] = f.calls;
    assert.equal(c.url, 'https://dev.to/api/articles');
    assert.equal(c.headers['api-key'], 'key-devto-SECRET');
    assert.deepEqual(c.body, { article: { title: 'Launch videos from a repo', body_markdown: '## The problem\n\nText.', published: false } });
  });

  it('LinkedIn posts through the Posts API with the version and Restli headers, escaping markup characters', async () => {
    const f = fakeFetch(OK);
    const r = await ADAPTERS.linkedin({ text: 'We ship (v2) #launch @here', secret, fetchFn: f });
    assert.deepEqual([r.id, r.url], ['urn:li:share:777', 'https://www.linkedin.com/feed/update/urn:li:share:777/']);
    const [c] = f.calls;
    assert.equal(c.url, 'https://api.linkedin.com/rest/posts');
    assert.equal(c.headers.Authorization, 'Bearer tok-linkedin-SECRET');
    assert.match(c.headers['LinkedIn-Version'], /^\d{6}$/);
    assert.equal(c.headers['X-Restli-Protocol-Version'], '2.0.0');
    assert.equal(c.body.author, 'urn:li:person:abc');
    assert.equal(c.body.commentary, 'We ship \\(v2\\) #launch \\@here');
    assert.equal(c.body.visibility, 'PUBLIC');
    assert.equal(c.body.lifecycleState, 'PUBLISHED');
    assert.equal(linkedinEscape('a_b*c'), 'a\\_b\\*c');
  });

  it('LinkedIn answers 401 as an expired token to reconnect, and every adapter turns a wrong login into words without the secret', async () => {
    const f = fakeFetch({ 'api.linkedin.com': { status: 401, body: { message: 'EXPIRED_ACCESS_TOKEN' } } });
    await assert.rejects(ADAPTERS.linkedin({ text: 'x', secret, fetchFn: f }), (e) => e.expired === true && /token expired: reconnect/.test(e.message) && !/SECRET/.test(e.message));
    const g = fakeFetch({ createSession: { status: 401, body: { error: 'AuthenticationRequired' } } });
    await assert.rejects(ADAPTERS.bluesky({ text: 'x', secret, fetchFn: g }), (e) => e.expired && /did not accept the credentials/.test(e.message) && !/SECRET/.test(e.message));
    const h = fakeFetch({ '/api/v1/statuses': { status: 422, body: { error: 'Text too long' } } });
    await assert.rejects(ADAPTERS.mastodon({ text: 'x', secret, fetchFn: h }), /refused the post \(422\): Text too long/);
    await assert.rejects(ADAPTERS.devto({ text: 'x', secret, fetchFn: async () => { throw new Error('offline key-devto-SECRET'); } }), (e) => /Couldn't reach dev\.to/.test(e.message) && !/SECRET/.test(e.message));
  });
});

describe('publishing an approved post', () => {
  const repo = makeCopy();
  let n = 0;
  const logLines = () => (existsSync(repo.path('ops', 'social-log.jsonl')) ? readFileSync(repo.path('ops', 'social-log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);
  const postsLines = () => readFileSync(repo.path('ops', 'posts.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

  // A post that passed review and was approved by a person on the Posts page.
  async function approved(channel, text = 'A short post about launch videos.', { approve = true, review = true } = {}) {
    const name = `${T}-${channel}-t${++n}.md`;
    const path = `${POSTS}/${name}`;
    mkdirSync(repo.path(POSTS), { recursive: true });
    mkdirSync(repo.path('outputs', 'reviews'), { recursive: true });
    writeFileSync(repo.path(path), `---\nchannel: ${channel}\nproduct: motionrepo\n---\n\n${text}\n`);
    await wait();
    if (review) writeFileSync(repo.path('outputs', 'reviews', `T-t${n}-r1.md`), `# Review of ${path}\n\n**Verdict: PASS, 90/100.**\n`);
    await wait();
    if (approve) assert.ok(decidePost(repo.dir, path, 'approve', 'Tanvi').ok);
    return path;
  }
  const row = (id, decision, ...names) => appendFileSync(repo.path('ops', 'approvals.md'), `| ${id} | Posts page | Publish ${names.join(' ')} | ${names[0]} | risk | ${decision} | Tanvi | 2026-11-10 |\n`);
  const go = (post, approval, extra = {}) => publish(repo.dir, { post, approval, env: ENV, fetchFn: fakeFetch(OK), ...extra });
  const approve = (post, channel) => writePostApproval(repo.dir, { by: 'Tanvi', post, channel });
  after(() => repo.remove());

  it('publishes to Bluesky under a Yes row, logs it with the link and who approved, and records posted with the link', async () => {
    const path = await approved('bluesky');
    const id = approve(path, 'bluesky');
    const f = fakeFetch(OK);
    const r = await go(path, id, { fetchFn: f });
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.url, 'https://bsky.app/profile/did:plc:abc/post/3kxyz');
    const [entry] = logLines().filter((e) => e.post === path);
    assert.deepEqual([entry.ok, entry.channel, entry.url, entry.by, entry.approval, entry.mode], [true, 'bluesky', r.url, 'Tanvi', id, 'live']);
    assert.match(entry.sha, /^[0-9a-f]{16}$/);
    const posted = postsLines().filter((e) => e.id === path).at(-1);
    assert.deepEqual([posted.decision, posted.link], ['posted', r.url]);
    assert.doesNotMatch(readFileSync(repo.path('ops', 'social-log.jsonl'), 'utf8') + JSON.stringify(r), /SECRET/);
  });

  it('refuses a second publish of the same file version', async () => {
    const path = await approved('bluesky');
    const id = approve(path, 'bluesky');
    assert.equal((await go(path, id)).ok, true);
    const f = fakeFetch(OK);
    const again = await go(path, approve(path, 'bluesky'), { fetchFn: f });
    assert.equal(again.ok, false);
    assert.match(again.reason, /already (marked posted|published)/);
    assert.equal(f.calls.length, 0, 'no network call');
    // the refusal is logged too
    assert.equal(logLines().filter((e) => e.post === path && e.ok === false).length, 1);
    // a log that says published stops it even when the page state is lost
    const pre = preflight(repo.dir, path, ENV);
    assert.equal(pre.ok, false);
  });

  it('refuses without an approval, with a row that is pending, missing, or does not name the post or the channel', async () => {
    const path = await approved('mastodon');
    const f = fakeFetch(OK);
    const cases = [
      [undefined, /needs --approval/],
      ['A-99999999-01', /not in ops\/approvals\.md/],
    ];
    row('A-20261110-91', 'pending', 'Mastodon', path);
    cases.push(['A-20261110-91', /not a yes/]);
    row('A-20261110-92', 'Yes', 'Mastodon', `${POSTS}/${T}-mastodon-other.md`);
    cases.push(['A-20261110-92', /does not name/]);
    row('A-20261110-93', 'Yes', 'something', path);
    cases.push(['A-20261110-93', /does not name Mastodon/]);
    for (const [id, why] of cases) {
      const r = await go(path, id, { fetchFn: f });
      assert.equal(r.ok, false, String(id));
      assert.match(r.reason, why, String(id));
    }
    assert.equal(f.calls.length, 0);
  });

  it('refuses a post that is not approved, one still waiting for review, and one that changed after its approval', async () => {
    const f = fakeFetch(OK);
    const notApproved = await approved('bluesky', 'Not approved yet.', { approve: false });
    let r = await go(notApproved, approve(notApproved, 'bluesky'), { fetchFn: f });
    assert.match(r.reason, /not approved on the Posts page/);
    const unreviewed = await approved('bluesky', 'Never reviewed.', { review: false, approve: false });
    r = await go(unreviewed, approve(unreviewed, 'bluesky'), { fetchFn: f });
    assert.match(r.reason, /not approved/);
    const changed = await approved('bluesky', 'Before the edit.');
    const id = approve(changed, 'bluesky');
    await wait();
    writeFileSync(repo.path(changed), `---\nchannel: bluesky\n---\n\nAfter the edit.\n`);
    r = await go(changed, id, { fetchFn: f });
    assert.match(r.reason, /changed after it was approved/);
    assert.equal(f.calls.length, 0);
  });

  it('refuses X and Reddit, a file outside the posts folder, a post over the limit and a channel that is not connected', async () => {
    const f = fakeFetch(OK);
    for (const ch of ['x', 'reddit']) {
      const p = await approved(ch);
      const r = await go(p, approve(p, ch), { fetchFn: f });
      assert.match(r.reason, /copy the text and post it yourself/);
    }
    assert.match((await go('ops/approvals.md', 'A-1', { fetchFn: f })).reason, /not a post file/);
    assert.match((await go('../../etc/passwd', 'A-1', { fetchFn: f })).reason, /not a post file/);
    const long = await approved('bluesky', 'x'.repeat(301));
    assert.match((await go(long, approve(long, 'bluesky'), { fetchFn: f })).reason, /301 characters; Bluesky allows 300/);
    const li = await approved('linkedin');
    const r = await go(li, approve(li, 'linkedin'), { fetchFn: f, env: { LINKEDIN_AUTHOR: 'urn:li:person:abc' } });
    assert.match(r.reason, /LinkedIn is not connected: set LINKEDIN_ACCESS_TOKEN/);
    assert.doesNotMatch(r.reason, /urn:li/);
    assert.equal(f.calls.length, 0);
  });

  it('a dry run checks everything, says what it would do, and sends and logs nothing', async () => {
    const path = await approved('devto', '# A title\n\nBody.');
    const id = approve(path, 'devto');
    const before = logLines().length;
    const f = fakeFetch(OK);
    const r = await go(path, id, { dryRun: true, fetchFn: f });
    assert.equal(r.ok, true);
    assert.match(r.message, /Dry run: would publish .* to dev\.to .* as a draft/);
    assert.equal(f.calls.length, 0);
    assert.equal(logLines().length, before);
    const bad = await go(path, 'A-99999999-02', { dryRun: true, fetchFn: f });
    assert.equal(bad.ok, false);
    assert.equal(logLines().length, before, 'a dry-run refusal is not logged');
  });

  it('dev.to publishes as a draft and says so; a LinkedIn 401 is logged as a refusal to reconnect', async () => {
    const d = await approved('devto', '# Draft me\n\nBody.');
    const r = await go(d, approve(d, 'devto'));
    assert.deepEqual([r.ok, r.draft], [true, true]);
    assert.match(r.message, /draft.*press Publish/);
    assert.equal(logLines().find((e) => e.post === d).draft, true);
    const li = await approved('linkedin');
    const bad = await go(li, approve(li, 'linkedin'), { fetchFn: fakeFetch({ 'api.linkedin.com': { status: 401, body: {} } }) });
    assert.equal(bad.ok, false);
    assert.match(bad.reason, /token expired: reconnect/);
    assert.equal(logLines().filter((e) => e.post === li).at(-1).ok, false);
    assert.equal(postsLines().some((e) => e.id === li && e.decision === 'posted'), false, 'a failed publish is not marked posted');
  });

  it('the page action writes the approval row naming the person, post and channel and then publishes; a refused post leaves no row', async () => {
    const path = await approved('mastodon');
    const rows = () => (existsSync(repo.path('ops', 'approvals.md')) ? readFileSync(repo.path('ops', 'approvals.md'), 'utf8') : '');
    const before = rows();
    const bad = await publishFromPage(repo.dir, { id: `${POSTS}/nope.md`, by: 'Tanvi' }, { env: ENV, fetchFn: fakeFetch(OK) });
    assert.equal(bad.ok, false);
    assert.equal(rows(), before, 'no row for a refused post');
    const r = await publishFromPage(repo.dir, { id: path, by: 'Tanvi' }, { env: ENV, fetchFn: fakeFetch(OK) });
    assert.equal(r.ok, true, r.reason);
    const mine = rows().split('\n').find((l) => l.startsWith(`| ${r.approval} |`));
    assert.match(mine, /Publish to Mastodon/);
    assert.ok(mine.includes(path) && mine.includes('Tanvi') && /\| Yes,/.test(mine));
    const none = await publishFromPage(repo.dir, { id: await approved('bluesky'), by: 'T' }, { env: {}, fetchFn: fakeFetch(OK) });
    assert.match(none.reason, /Bluesky is not connected/);
  });
});

describe('POST /api/posts/publish', () => {
  const repo = makeCopy();
  let base;
  let child;
  const post = (body, headers = {}) => fetch(`${base}/api/posts/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
  before(async () => {
    const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(BLUESKY|MASTODON|DEVTO|LINKEDIN)_/.test(k)));
    child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: { ...clean, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => {
    child?.kill();
    repo.remove();
  });

  it('answers only the page itself: no marker, or another origin, is refused', async () => {
    assert.equal((await post({ id: 'x' })).status, 403);
    assert.equal((await post({ id: 'x' }, { Origin: 'https://evil.example', 'X-Team-Page': '1' })).status, 403);
    assert.equal((await post({ id: 'x' }, { Origin: base })).status, 403);
  });

  it('from the page, refuses a missing post and a channel that is not connected, and writes no approval row', async () => {
    const page = { Origin: base, 'X-Team-Page': '1' };
    const r = await post({ id: 'outputs/marketing/posts/none.md', by: 'Tanvi' }, page);
    assert.equal(r.status, 409);
    assert.match(r.message, /not a post file/);
    assert.doesNotMatch(readFileSync(repo.path('ops', 'approvals.md'), 'utf8'), /Posts page/);
  });

  it('lists the accounts without any value', async () => {
    const { accounts } = await (await fetch(`${base}/api/social/accounts`)).json();
    assert.deepEqual(accounts.map((a) => a.id), ['bluesky', 'mastodon', 'devto', 'linkedin', 'x', 'reddit']);
    assert.ok(accounts.filter((a) => a.publish).every((a) => a.connected === false));
  });
});
