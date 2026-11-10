import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { SCHEDULED_TASKS, decidePost, parseConversations, parsePost, postsState, urlKey, whereOf } from '../posts.mjs';
import { makeCopy } from './_helpers.mjs';

const day = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const T = day();
const Y = day(-1);
const wait = (ms = 25) => new Promise((r) => setTimeout(r, ms)); // a review must be newer than its post

const POSTS = 'outputs/marketing/posts';
const INTENT = 'outputs/research/intent';
const post = (name) => `${POSTS}/${name}`;
const LINKEDIN = `${T}-linkedin-launch-video.md`;
const X = `${T}-x-weekend.md`;
const DEVTO = `${T}-devto-outline.md`;
const BLUESKY = `${T}-bluesky-late.md`;
const REDDIT = `${T}-reddit-docs.md`;

const linkedinText = `---
channel: linkedin
product: motionrepo
task: T-20261109-01
---

We shipped on a Friday and the launch video was still a screen recording.

So we pointed MotionRepo at the repo instead.

## First comment

https://motionrepo.panscience.ai

## Claims used

- MotionRepo reads a GitHub repo and makes launch videos and PDFs.
`;

const intentToday = `# Buyer-intent watch: motionrepo, ${T}

Queries run: "launch video from repo", "demo gif readme".

## 1. Looking for a way to make a launch video from a repo

- URL: https://www.reddit.com/r/SaaS/comments/abc123/launch_video/
- Where: Reddit r/SaaS
- Posted: ${Y}
- Quote: "I keep recording our demo by hand every release and it takes a whole day."
- Why it fits: asks how to make a demo from a repo.

Suggested reply:
> We make MotionRepo, which turns a GitHub repo into launch videos and PDFs. Glad to say how it works.
>
> No pressure either way.

## 2. Show HN: docs tools that make me rewrite everything

**URL:** https://news.ycombinator.com/item?id=424242
**Quote:** "Every docs tool I try wants me to rewrite things."
**Why it fits:** complains about the docs tools they use.
**Suggested reply:**
Which docs tool was it? Happy to compare notes.

## 3. A link that is not a link

- URL: javascript:alert(1)
- Quote: "hello"
Suggested reply: ignore me

## Not kept

- https://example.com/login-wall was behind a login.
`;

const intentYesterday = `# Buyer-intent watch: motionrepo, ${Y}

## 1. The same Hacker News thread again

- URL: https://news.ycombinator.com/item?id=424242&utm_source=feed#c1
- Quote: "Every docs tool I try wants me to rewrite things."
Suggested reply: An older version of the reply.

## 2. How do you keep a demo video current?

- URL: https://dev.to/someone/how-do-you-keep-a-demo-video-current-123
- Where: dev.to
- Quote: "Our demo video is a year old and nobody dares redo it."
- Why it fits: a stale demo video.
Suggested reply: We hit the same thing, which is why we built MotionRepo.
`;

describe('parsing a post file', () => {
  it('reads the channel, product and task, keeps the post text, and leaves the first comment and notes out of it', () => {
    const p = parsePost(linkedinText, LINKEDIN);
    assert.deepEqual([p.channel, p.product, p.task], ['linkedin', 'motionrepo', 'T-20261109-01']);
    assert.equal(p.text, 'We shipped on a Friday and the launch video was still a screen recording.\n\nSo we pointed MotionRepo at the repo instead.');
    assert.equal(p.comment, 'https://motionrepo.panscience.ai');
    assert.doesNotMatch(p.text, /Claims used|First comment/);
  });

  it('takes the channel from the file name when the frontmatter has none, and knows twitter and dev.to', () => {
    assert.equal(parsePost('A tip.\n', `${T}-bluesky-tip.md`).channel, 'bluesky');
    assert.equal(parsePost('---\nchannel: twitter\n---\nA tip.\n', 'x.md').channel, 'x');
    assert.equal(parsePost('---\nchannel: dev.to\n---\nA tip.\n', 'x.md').channel, 'devto');
  });

  it("keeps a dev.to outline's own headings, and finds its title", () => {
    const p = parsePost('---\nchannel: devto\n---\n\n# Launch videos from a repo\n\n## The problem\n\nText.\n\n## The fix\n\nMore.\n\n## For the reviewer\n\nNote.\n', 'd.md');
    assert.equal(p.title, 'Launch videos from a repo');
    assert.match(p.text, /## The problem[\s\S]*## The fix/);
    assert.doesNotMatch(p.text, /For the reviewer|Note\./);
  });
});

describe('parsing an intent file', () => {
  const finds = parseConversations(intentToday);

  it('makes one find of every section that has a link, numbered from 1, and skips search notes and unsafe links', () => {
    assert.deepEqual(finds.map((f) => f.n), [1, 2]);
    assert.deepEqual(finds.map((f) => f.url), ['https://www.reddit.com/r/SaaS/comments/abc123/launch_video/', 'https://news.ycombinator.com/item?id=424242']);
  });

  it('reads the where, the quote, why it fits and the suggested reply, in either label style', () => {
    const [a, b] = finds;
    assert.equal(a.title, 'Looking for a way to make a launch video from a repo');
    assert.equal(a.where, 'Reddit r/SaaS');
    assert.equal(a.posted, Y);
    assert.equal(a.quote, 'I keep recording our demo by hand every release and it takes a whole day.');
    assert.equal(a.fit, 'asks how to make a demo from a repo.');
    assert.equal(a.reply, 'We make MotionRepo, which turns a GitHub repo into launch videos and PDFs. Glad to say how it works.\n\nNo pressure either way.');
    assert.equal(b.where, 'Hacker News', 'taken from the link when the section does not say');
    assert.equal(b.quote, 'Every docs tool I try wants me to rewrite things.');
    assert.equal(b.reply, 'Which docs tool was it? Happy to compare notes.');
  });

  it('takes a link from the heading when there is no URL field, and gives no reply when none is written', () => {
    const [f] = parseConversations('## [A thread](https://lobste.rs/s/abc/a_thread)\n\n- Quote: "need a demo"\n');
    assert.equal(f.url, 'https://lobste.rs/s/abc/a_thread');
    assert.equal(f.title, 'A thread');
    assert.equal(f.where, 'Lobsters');
    assert.equal(f.reply, '');
  });

  it('knows two spellings of one thread are the same, and names the common places', () => {
    assert.equal(urlKey('https://news.ycombinator.com/item?id=424242&utm_source=feed#c1'), urlKey('https://news.ycombinator.com/item?id=424242'));
    assert.equal(urlKey('https://www.reddit.com/r/SaaS/comments/abc123/launch_video/'), urlKey('https://reddit.com/r/SaaS/comments/abc123/launch_video'));
    assert.notEqual(urlKey('https://news.ycombinator.com/item?id=1'), urlKey('https://news.ycombinator.com/item?id=2'));
    assert.deepEqual(['https://x.com/a/status/1', 'https://dev.to/a/b', 'https://bsky.app/profile/a'].map(whereOf), ['X', 'dev.to', 'Bluesky']);
  });
});

describe('the recurring tasks', () => {
  it('are the daily buyer-intent watch and the weekly social posts, each told to post nothing', () => {
    assert.deepEqual(SCHEDULED_TASKS.map((t) => [t.every, t.skip_over]), [['daily 03:00', 0.6], ['weekly mon 10:00', 0.6], ['weekly mon 11:00', 0.6]]);
    for (const t of SCHEDULED_TASKS) assert.ok(t.id && t.name && /(post|publish) nothing/.test(t.task), t.id);
    assert.match(SCHEDULED_TASKS[0].task, /^Buyer-intent watch for motionrepo, run by community-manager: with the buyer-intent-search skill, find up to 8 public posts from the last 2 days .* outputs\/research\/intent\/<date>\.md; post nothing\.$/);
    assert.match(SCHEDULED_TASKS[1].task, /^Plan and draft this week's social posts for motionrepo: social-planner writes .*, then social-writer drafts 3 LinkedIn posts .* 2 X posts and 1 dev\.to post outline, from confirmed facts only, each saved to outputs\/marketing\/posts\/ and reviewed by the evaluator; publish nothing\.$/);
    assert.match(SCHEDULED_TASKS[2].task, /^Weekly social report for motionrepo: social-analyst reads ops\/posts\.jsonl .*; publish nothing\.$/);
  });

  it('is written so it cannot post: the module makes no network call and starts no program', () => {
    const source = readFileSync(new URL('../posts.mjs', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bfetch\(|node:https?|node:net|node:dgram|child_process|\bspawn\(|(?<![.\w])exec(Sync)?\(/);
  });
});

describe('the Posts page: posts, conversations and decisions', () => {
  const repo = makeCopy();
  let base;
  let child;
  const logLines = () => readFileSync(repo.path('ops', 'posts.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const state = async () => (await (await fetch(`${base}/api/state`)).json()).posts;
  const postOf = async (name) => (await state()).posts.find((p) => p.path === post(name));
  const talkOf = async (id) => (await state()).conversations.find((c) => c.id === id);
  const decide = (body) => fetch(`${base}/api/posts/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Team-Page': '1' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));

  before(async () => {
    for (const dir of [POSTS, INTENT]) {
      rmSync(repo.path(dir), { recursive: true, force: true });
      mkdirSync(repo.path(dir), { recursive: true });
    }
    rmSync(repo.path('ops', 'posts.jsonl'), { force: true });
    const w = (rel, text) => writeFileSync(repo.path(rel), text);
    w(post(LINKEDIN), linkedinText);
    w(post(X), '---\nchannel: x\nproduct: motionrepo\n---\n\nWe turn a repo into a launch video. What would you want it to cover?\n');
    w(post(DEVTO), '---\nchannel: devto\nproduct: motionrepo\n---\n\n# Launch videos from a repo\n\n## The problem\n\nText.\n');
    w(post(BLUESKY), '---\nchannel: bluesky\nproduct: motionrepo\n---\n\nShort post that was reviewed.\n');
    w(post(REDDIT), '---\nchannel: reddit\nproduct: motionrepo\n---\n\nHow do you keep docs current?\n');
    w(post('2026-01-01-x-ancient.md'), '---\nchannel: x\n---\n\nAn old post.\n');
    w(`${INTENT}/${T}.md`, intentToday);
    w(`${INTENT}/${Y}.md`, intentYesterday);
    await wait();
    const review = (name, path, verdict) => w(`outputs/reviews/${name}.md`, `# Review of ${path}\n\n**Verdict: ${verdict}.**\n`);
    review('T-fixture-linkedin-r1', post(LINKEDIN), 'PASS, 91/100');
    review('T-fixture-devto-r1', post(DEVTO), 'REVISE, 62/100');
    review('T-fixture-bluesky-r1', post(BLUESKY), 'PASS, 85/100');
    review('T-fixture-reddit-r1', post(REDDIT), 'PASS, 88/100');
    review('T-fixture-intent-r1', `${INTENT}/${T}.md`, 'PASS, 88/100');
    await wait();
    w(post(BLUESKY), '---\nchannel: bluesky\nproduct: motionrepo\n---\n\nShort post, reworded after its review.\n');
    child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: { ...process.env, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => {
    child?.kill();
    repo.remove();
  });

  it('lists each post with its channel, text, compose page and review, and only a passed, unchanged post waits for a decision', async () => {
    const s = await state();
    assert.deepEqual(s.posts.map((p) => p.name).sort(), [BLUESKY, DEVTO, LINKEDIN, REDDIT, X].sort(), 'the old post is left off');
    const li = s.posts.find((p) => p.name === LINKEDIN);
    assert.deepEqual([li.channel, li.label, li.compose, li.state], ['linkedin', 'LinkedIn', 'https://www.linkedin.com/feed/?shareActive=true', 'pending']);
    assert.match(li.text, /^We shipped on a Friday/);
    assert.equal(li.comment, 'https://motionrepo.panscience.ai');
    assert.deepEqual([li.review.verdict, li.review.score, li.review.stale], ['PASS', 91, false]);
    const byName = Object.fromEntries(s.posts.map((p) => [p.name, p]));
    assert.equal(byName[X].state, 'waiting');
    assert.equal(byName[X].why, 'Waiting for its review');
    assert.equal(byName[X].compose, 'https://x.com/compose/post');
    assert.equal(byName[X].limit, 280);
    assert.equal(byName[DEVTO].state, 'waiting');
    assert.equal(byName[DEVTO].compose, 'https://dev.to/new');
    assert.match(byName[DEVTO].why, /^Review says REVISE/);
    assert.equal(byName[BLUESKY].state, 'waiting');
    assert.equal(byName[BLUESKY].review.stale, true);
    assert.match(byName[BLUESKY].why, /^Changed after its review/);
    assert.equal(byName[REDDIT].state, 'pending');
  });

  it('lists each conversation once, newest first, with the review of its file, and counts what waits for a person', async () => {
    const s = await state();
    assert.deepEqual(s.conversations.map((c) => c.id), [`${INTENT}/${T}.md#1`, `${INTENT}/${T}.md#2`, `${INTENT}/${Y}.md#2`], 'the thread found again yesterday shows once');
    const [reddit, hn, devto] = s.conversations;
    assert.deepEqual([reddit.where, hn.where, devto.where], ['Reddit r/SaaS', 'Hacker News', 'dev.to']);
    assert.equal(reddit.review.verdict, 'PASS');
    assert.equal(devto.review, null);
    assert.ok(s.conversations.every((c) => c.state === 'new'));
    assert.deepEqual([s.counts.posts, s.counts.conversations, s.counts.waiting], [2, 3, 5]);
  });

  it('will not approve a post that is unreviewed, being revised, or changed since its review', async () => {
    for (const [name, why] of [[X, /Waiting for its review/i], [DEVTO, /review says REVISE/i], [BLUESKY, /changed after its review/i]]) {
      const r = await decide({ id: post(name), decision: 'approve' });
      assert.equal(r.status, 409, name);
      assert.match(r.message, /Can't approve the .* post yet/);
      assert.match(r.message, why);
      assert.match(r.message, /Only a post that passed review can be approved/);
    }
    assert.equal((await postOfLog()).length, 0, 'nothing was recorded');
  });

  async function postOfLog() {
    try {
      return logLines();
    } catch {
      return [];
    }
  }

  it('approves a reviewed post, records who and when, and then offers it to post by hand', async () => {
    const r = await decide({ id: post(LINKEDIN), decision: 'approve', by: 'Mohit' });
    assert.equal(r.status, 200, r.message);
    assert.match(r.message, /Approved the LinkedIn post\. Copy it and post it yourself: nothing is posted for you\./);
    const last = logLines().at(-1);
    assert.deepEqual([last.id, last.decision, last.by], [post(LINKEDIN), 'approve', 'Mohit']);
    assert.ok(Date.parse(last.at) > 0);
    const li = await postOf(LINKEDIN);
    assert.deepEqual([li.state, li.by], ['approved', 'Mohit']);
    assert.match(li.why, /^Approved by Mohit/);
    assert.deepEqual([(await state()).counts.posts, (await state()).counts.approved], [1, 1]);
    assert.equal((await decide({ id: post(LINKEDIN), decision: 'approve' })).status, 409, 'already approved');
  });

  it('marks an approved post as posted, with the link a person gives, and not before it is approved', async () => {
    const early = await decide({ id: post(REDDIT), decision: 'posted' });
    assert.equal(early.status, 409);
    assert.match(early.message, /Approve the post first/);
    const r = await decide({ id: post(LINKEDIN), decision: 'posted', note: 'https://www.linkedin.com/feed/update/urn:li:activity:1/' });
    assert.equal(r.status, 200, r.message);
    assert.match(r.message, /Marked the LinkedIn post as posted with its link/);
    const li = await postOf(LINKEDIN);
    assert.deepEqual([li.state, li.link], ['posted', 'https://www.linkedin.com/feed/update/urn:li:activity:1/']);
    assert.equal((await decide({ id: post(LINKEDIN), decision: 'decline' })).status, 409, 'a posted post cannot be declined');
    assert.equal((await decide({ id: post(LINKEDIN), decision: 'posted' })).status, 409, 'nor marked posted twice');
  });

  it('declines a post, lets a person approve it after all, and ignores a decision on text that has since changed', async () => {
    const no = await decide({ id: post(REDDIT), decision: 'decline', note: 'not for this subreddit' });
    assert.equal(no.status, 200, no.message);
    let p = await postOf(REDDIT);
    assert.deepEqual([p.state, p.note], ['declined', 'not for this subreddit']);
    assert.match(p.why, /^Declined by a person on the page: not for this subreddit\. It won't be posted/);
    assert.equal((await decide({ id: post(REDDIT), decision: 'decline' })).status, 409);
    assert.equal((await decide({ id: post(REDDIT), decision: 'approve' })).status, 200, 'approve after all');
    assert.equal((await postOf(REDDIT)).state, 'approved');
    await wait();
    writeFileSync(repo.path(post(REDDIT)), '---\nchannel: reddit\nproduct: motionrepo\n---\n\nHow do you keep docs current? Rewritten after the approval.\n');
    p = await postOf(REDDIT);
    assert.equal(p.state, 'waiting', 'the approval was for the old text: it needs a new review');
    assert.match(p.why, /^Changed after its review/);
    assert.equal((await decide({ id: post(REDDIT), decision: 'approve' })).status, 409);
  });

  it('lets a person decline a draft that is stuck in review, but never skip a post', async () => {
    assert.equal((await decide({ id: post(DEVTO), decision: 'decline' })).status, 200);
    assert.equal((await postOf(DEVTO)).state, 'declined');
    const after = await decide({ id: post(DEVTO), decision: 'approve' });
    assert.equal(after.status, 409, 'declining does not get round the review');
    assert.match(after.message, /review says REVISE/i);
    const r = await decide({ id: post(X), decision: 'skip' });
    assert.equal(r.status, 409);
    assert.match(r.message, /skipping is for conversations/);
  });

  it('marks a reply as posted or skips a conversation, and never approves or declines one', async () => {
    const reddit = `${INTENT}/${T}.md#1`;
    const hn = `${INTENT}/${T}.md#2`;
    assert.equal((await decide({ id: reddit, decision: 'approve' })).status, 409);
    assert.equal((await decide({ id: reddit, decision: 'decline' })).status, 409);
    const skipped = await decide({ id: reddit, decision: 'skip', by: 'Tanvi' });
    assert.equal(skipped.status, 200, skipped.message);
    assert.deepEqual([(await talkOf(reddit)).state, (await talkOf(reddit)).by], ['skipped', 'Tanvi']);
    assert.equal((await decide({ id: reddit, decision: 'skip' })).status, 409, 'already skipped');
    const posted = await decide({ id: hn, decision: 'posted', note: 'https://news.ycombinator.com/item?id=999' });
    assert.equal(posted.status, 200, posted.message);
    const c = await talkOf(hn);
    assert.deepEqual([c.state, c.link], ['posted', 'https://news.ycombinator.com/item?id=999']);
    assert.equal((await decide({ id: hn, decision: 'skip' })).status, 409, 'a reply that went out is not skipped');
    assert.equal((await decide({ id: reddit, decision: 'posted' })).status, 200, 'a skipped one can still be answered');
    const s = await state();
    assert.deepEqual([s.counts.conversations, s.counts.replied, s.counts.skipped], [1, 2, 0]);
  });

  it('keeps a thread answered when a later day finds it again', async () => {
    const hnAgain = `${day(1)}.md`;
    writeFileSync(repo.path(`${INTENT}/${hnAgain}`), '## 1. Same thread, found again\n\n- URL: https://news.ycombinator.com/item?id=424242&utm_source=feed\n- Quote: "Every docs tool I try wants me to rewrite things."\nSuggested reply: Newer reply text.\n');
    const s = await state();
    const again = s.conversations.find((c) => c.id === `${INTENT}/${hnAgain}#1`);
    assert.equal(again.state, 'posted');
    assert.equal(again.link, 'https://news.ycombinator.com/item?id=999');
    assert.equal(s.conversations.filter((c) => /424242/.test(c.url)).length, 1);
    assert.equal(s.counts.conversations, 1, 'it does not come back as new');
  });

  it('answers an unknown id, an unknown decision and a bad request, and records nothing for them', async () => {
    const before = logLines().length;
    assert.equal((await decide({ id: post('2026-01-01-x-ancient.md'), decision: 'approve' })).status, 404);
    assert.equal((await decide({ id: 'outputs/marketing/posts/../../../ops/mail-config.json', decision: 'approve' })).status, 404);
    assert.equal((await decide({ id: post(X), decision: 'publish' })).status, 400);
    assert.equal((await decide({ decision: 'approve' })).status, 404);
    const r = await fetch(`${base}/api/posts/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Team-Page': '1' }, body: '{not json' });
    assert.equal(r.status, 400);
    assert.equal(logLines().length, before);
  });

  it('accepts only same-site requests', async () => {
    const before = logLines().length;
    const none = await fetch(`${base}/api/posts/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: post(REDDIT), decision: 'approve' }) });
    assert.equal(none.status, 403);
    const other = await fetch(`${base}/api/posts/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com', 'X-Team-Page': '1' }, body: JSON.stringify({ id: post(REDDIT), decision: 'approve' }) });
    assert.equal(other.status, 403);
    const noMarker = await fetch(`${base}/api/posts/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ id: post(REDDIT), decision: 'approve' }) });
    assert.equal(noMarker.status, 403);
    assert.equal(logLines().length, before, 'a refused request writes nothing');
  });

  it('only ever writes ops/posts.jsonl: the post and intent files are left as they were', async () => {
    const before = readFileSync(repo.path(post(X)), 'utf8');
    await decide({ id: post(X), decision: 'decline' });
    assert.equal(readFileSync(repo.path(post(X)), 'utf8'), before);
    // The same call straight to the module, for a copy with no server involved.
    const direct = decidePost(repo.dir, post(X), 'approve', 'a test');
    assert.equal(direct.ok, false);
    assert.equal(direct.status, 409);
    assert.equal(postsState(repo.dir).posts.find((p) => p.name === X).state, 'declined');
  });
});
