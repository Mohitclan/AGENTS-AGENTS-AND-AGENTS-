// Be where buyers ask: the Posts page in mission control. It lists two things the team prepares and a person
// uses by hand. Nothing here, and nothing on the page, posts anywhere: a person copies the text and posts it.
//
//   Posts          social posts the marketing agent drafts, one file each:
//                  outputs/marketing/posts/YYYY-MM-DD-<channel>-<slug>.md
//                  Frontmatter: channel (linkedin, x, devto, bluesky or reddit), product, task. Below it, the post text.
//                  After the text, optional `## First comment` (a link goes there, not in the post), `## Claims used`,
//                  `## For the reviewer`: they are not part of the post.
//                  A post counts as reviewed when a review in outputs/reviews/ names its path above a **Verdict: PASS
//                  line (the same rule as outreach drafts) and the post has not changed since. Only a reviewed post
//                  can be approved. After approving, the page offers Copy text and a link to the channel's compose
//                  page; the person posts it and marks it posted.
//   Conversations  public posts where people ask for what the product does, found by the researcher's daily
//                  buyer-intent watch: outputs/research/intent/YYYY-MM-DD.md, one `## ` section per find with its
//                  URL, where, a short quote, why it fits and a `Suggested reply:` block. A person copies the reply,
//                  answers by hand, and marks it posted or skips it. The same thread found on two days shows once.
//
// What a person decided is kept in ops/posts.jsonl (approve, decline, posted, skip), with who and when. An approval
// or a decline counts only for the version of the post the person saw: if the file changes afterwards it needs a
// new review and a new decision. Text in these files is written by agents from public pages: it is shown as text,
// and only http(s) links are ever made clickable.
//
// Exports:
//   postsState(root)                          what the page shows: { posts, conversations, counts, channels }
//   decidePost(root, id, decision, by, note)  records a person's decision, or says why not: { ok, status, message }
//   parsePost(text, name), parseConversations(text, file)   the file parsers (used by the tests)
//   SCHEDULED_TASKS                           the two recurring tasks, for the scheduler
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, frontmatter } from './_shared.mjs';
import { readReview } from './send-tests.mjs';

const POSTS = 'outputs/marketing/posts';
const INTENT = 'outputs/research/intent';
const REVIEWS = 'outputs/reviews';
const LOG = 'ops/posts.jsonl';
const POST_DAYS = 45; // posts older than this drop off the page
const CONVERSATION_DAYS = 14; // a thread older than this is not worth answering
const MAX_FINDS = 25; // per intent file

// The recurring tasks the scheduler runs. `every` is 'daily HH:MM' or 'weekly <day> HH:MM'; `skip_over` is the share
// of the plan's usage above which the scheduler skips the run.
export const SCHEDULED_TASKS = [
  {
    id: 'buyer-intent-watch',
    name: 'Buyer-intent watch',
    every: 'daily 03:00',
    task: 'Buyer-intent watch for motionrepo, run by community-manager: with the buyer-intent-search skill, find up to 8 public posts from the last 2 days where people ask how to make a launch video, a demo or docs from a repo, or complain about the tools they use; save them with a suggested reply each to outputs/research/intent/<date>.md; post nothing.',
    skip_over: 0.6,
  },
  {
    id: 'weekly-social-posts',
    name: 'Weekly social posts',
    every: 'weekly mon 10:00',
    task: "Plan and draft this week's social posts for motionrepo: social-planner writes the week's calendar (outputs/marketing/calendar/), then social-writer drafts 3 LinkedIn posts in the founder's voice (linkedin-founder skill), 2 X posts and 1 dev.to post outline, from confirmed facts only, each saved to outputs/marketing/posts/ and reviewed by the evaluator; publish nothing.",
    skip_over: 0.6,
  },
  {
    id: 'weekly-social-report',
    name: 'Weekly social report',
    every: 'weekly mon 11:00',
    task: 'Weekly social report for motionrepo: social-analyst reads ops/posts.jsonl and ops/social-metrics.jsonl (when they exist) and writes outputs/marketing/social-weekly-<date>.md with what worked, honest about small numbers, and up to three tests for next week; publish nothing.',
    skip_over: 0.6,
  },
];

// Where each channel's compose page is, and the length it allows (null: no fixed limit worth warning about).
export const CHANNELS = {
  linkedin: { label: 'LinkedIn', compose: 'https://www.linkedin.com/feed/?shareActive=true', limit: 3000 },
  x: { label: 'X', compose: 'https://x.com/compose/post', limit: 280 },
  devto: { label: 'dev.to', compose: 'https://dev.to/new', limit: null },
  bluesky: { label: 'Bluesky', compose: 'https://bsky.app/intent/compose', limit: 300 },
  reddit: { label: 'Reddit', compose: 'https://www.reddit.com/submit', limit: null },
  mastodon: { label: 'Mastodon', compose: '', limit: 500 },
};
const ALIASES = { twitter: 'x', 'x.com': 'x', 'dev.to': 'devto', dev: 'devto', bsky: 'bluesky', fediverse: 'mastodon', 'bluesky.app': 'bluesky' };

const readJsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
const mtime = (f) => { try { return statSync(f).mtimeMs; } catch { return 0; } };
const clip = (s, max) => { const t = String(s ?? '').trim(); return t.length > max ? `${t.slice(0, max - 1)}…` : t; };
const dateOf = (name) => /^(\d{4}-\d{2}-\d{2})/.exec(name)?.[1] || '';
// How old a file is, by the date in its name, in days (null when the name has no date).
const ageDays = (date) => { const t = Date.parse(`${date}T12:00:00Z`); return Number.isNaN(t) ? null : (Date.now() - t) / 86_400_000; };
const isUrl = (s) => /^https?:\/\/[^\s<>"']+$/i.test(String(s || '').trim());

// ---------- reviews ----------

// Every review that names a post or an intent file: { file, text, at }. Read once per page state.
function reviewTexts(root) {
  const dir = join(root, REVIEWS);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    try {
      const text = readFileSync(join(dir, name), 'utf8');
      if (text.includes(`${POSTS}/`) || text.includes(`${INTENT}/`)) out.push({ file: `${REVIEWS}/${name}`, text, at: statSync(join(dir, name)).mtimeMs });
    } catch { /* a review being written: skip it this time */ }
  }
  return out;
}

// The newest review that names this file and gives a verdict: { file, verdict, score, stale } (stale: the file
// changed after the review), or null.
function reviewOf(reviews, path, changedMs) {
  let best = null;
  for (const r of reviews) {
    const { verdict, names } = readReview(r.text, path);
    if (names && verdict && (!best || r.at > best.at)) best = { ...r, verdict };
  }
  if (!best) return null;
  const line = best.text.slice(best.text.search(/^[*_\s]*Verdict[*_\s]*:[*_\s]*(PASS|REVISE|ESCALATE)\b/im)).trimStart().split('\n')[0]; // the verdict line
  const score = /(\d{1,3})\s*\/\s*100/.exec(line)?.[1];
  return { file: best.file, verdict: best.verdict, score: score ? Number(score) : null, stale: best.at < changedMs };
}

// ---------- decisions ----------

// A decision's link: the optional link a person gives when marking a post as posted comes in the note.
const linkOf = (note) => (isUrl(note) ? String(note).trim() : '');

function decisions(root) {
  return readJsonl(join(root, LOG)).filter((e) => e.id && ['approve', 'decline', 'posted', 'skip'].includes(e.decision));
}

// ---------- posts ----------

const EXTRA = /^##[ \t]+(First comment|Claims used|For the reviewer|Self-review|Notes)\b.*$/im;

// One post file as the page shows it: { channel, product, task, title, text, comment }. `name` is the file name,
// which names the channel when the frontmatter does not.
export function parsePost(text, name = '') {
  const fm = frontmatter(text) || {};
  const body = text.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim();
  const extra = EXTRA.exec(body);
  const main = (extra ? body.slice(0, extra.index) : body).trim();
  let comment = '';
  const c = /^##[ \t]+First comment\b.*$/im.exec(body);
  if (c) {
    const rest = body.slice(c.index + c[0].length);
    const end = rest.search(/^##[ \t]/m);
    comment = (end < 0 ? rest : rest.slice(0, end)).trim();
  }
  const fromName = new RegExp(`^\\d{4}-\\d{2}-\\d{2}-(${Object.keys(CHANNELS).join('|')})-`).exec(name)?.[1];
  const raw = String(fm.channel || fromName || '').trim().toLowerCase();
  const channel = ALIASES[raw] || raw;
  return {
    channel,
    product: String(fm.product || '').trim(),
    task: String(fm.task || '').trim(),
    title: clip(String(fm.title || /^#\s+(.+)$/m.exec(main)?.[1] || ''), 140),
    text: main,
    comment,
  };
}

function postsList(root, reviews, log) {
  const dir = join(root, POSTS);
  if (!existsSync(dir)) return [];
  const posts = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.md') && !/^readme\.md$/i.test(n))) {
    const path = `${POSTS}/${name}`;
    const changed = mtime(join(root, path));
    const date = dateOf(name) || new Date(changed).toISOString().slice(0, 10);
    if (ageDays(date) > POST_DAYS) continue;
    let p;
    try { p = parsePost(readFileSync(join(root, path), 'utf8'), name); } catch { continue; }
    if (!p.text) continue;
    const ch = CHANNELS[p.channel];
    const review = reviewOf(reviews, path, changed);
    const gate = !review ? 'in-review' : review.verdict !== 'PASS' ? 'revise' : review.stale ? 'changed' : 'ready';
    const last = log.filter((e) => e.id === path).at(-1);
    // An approval or a decline counts for the version the person saw; "posted" happened whatever the file did since.
    const counts = last && (last.decision === 'posted' || Date.parse(last.at) >= changed);
    const state = counts ? { approve: 'approved', decline: 'declined', posted: 'posted' }[last.decision] : gate === 'ready' ? 'pending' : 'waiting';
    const by = counts ? last.by || 'a person' : '';
    // Where the review stands, whatever a person has decided: only `ready` lets the post be approved.
    const gateWhy = { 'in-review': 'Waiting for its review', revise: `Review says ${review?.verdict}: being revised`, changed: 'Changed after its review: needs a re-review', ready: 'Passed review: tick to approve, cross to decline' }[gate];
    const why = {
      approved: `Approved by ${by}: copy it and post it yourself`,
      declined: `Declined by ${by}${last?.note ? `: ${last.note}` : ''}. It won't be posted`,
      posted: `Marked posted by ${by}`,
      pending: gateWhy,
      waiting: gateWhy,
    }[state];
    posts.push({
      id: path, path, name, date, channel: p.channel, label: ch?.label || p.channel || 'Unknown channel', compose: ch?.compose || '', limit: ch?.limit ?? null,
      product: p.product, task: p.task, title: p.title, text: p.text, comment: p.comment, chars: [...p.text].length,
      review, gate, gateWhy, state, why, by, at: counts ? last.at : new Date(changed).toISOString(), link: counts ? last.link || '' : '', note: counts ? last.note || '' : '',
      changed: new Date(changed).toISOString(),
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || b.changed.localeCompare(a.changed));
}

// ---------- conversations ----------

const LABELS = { url: /^(url|link)$/i, where: /^(where|source|site|platform)$/i, posted: /^(posted|date|when|found)$/i, quote: /^(quote|they said|excerpt)$/i, fit: /^(why it fits|fit|why)$/i, reply: /^suggested reply$/i };
const LABEL_LINE = /^\s*(?:[-*]\s+)?(?:\*\*|__)?([A-Za-z][A-Za-z ]{1,20}?)(?:\*\*|__)?\s*:\s*(?:\*\*|__)?\s*(.*)$/;
const bare = (s) => s.replace(/^[\s>*_"“'‘]+|[\s*_"”'’]+$/g, '').trim();

// Where a link points, in the words a person uses.
export function whereOf(url) {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
  const known = { 'reddit.com': 'Reddit', 'old.reddit.com': 'Reddit', 'news.ycombinator.com': 'Hacker News', 'x.com': 'X', 'twitter.com': 'X', 'dev.to': 'dev.to', 'bsky.app': 'Bluesky', 'linkedin.com': 'LinkedIn', 'github.com': 'GitHub', 'stackoverflow.com': 'Stack Overflow', 'indiehackers.com': 'Indie Hackers', 'lobste.rs': 'Lobsters', 'producthunt.com': 'Product Hunt' };
  return known[host] || host;
}

// One URL, the same however it is written: no fragment, no tracking parameters, no trailing slash.
export function urlKey(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|ref$|ref_src$|source$)/i.test(k)) u.searchParams.delete(k);
    return `${u.protocol}//${u.hostname.replace(/^www\./, '').toLowerCase()}${u.pathname.replace(/\/+$/, '')}${u.search}`;
  } catch {
    return String(url || '').trim();
  }
}

// The finds of one intent file: [{ n, title, url, where, posted, quote, fit, reply }]. A section without an
// http(s) link is not a find (a search note, say). `n` counts the finds from 1.
export function parseConversations(text) {
  const sections = text.split(/^##[ \t]+/m).slice(1);
  const finds = [];
  for (const section of sections) {
    const [headLine, ...lines] = section.split(/\r?\n/);
    const fields = {};
    let current = null;
    for (const line of lines) {
      const m = LABEL_LINE.exec(line);
      const key = m && Object.keys(LABELS).find((k) => LABELS[k].test(m[1].trim()));
      if (key) {
        current = key;
        fields[key] = m[2] ? [m[2]] : [];
      } else if (current) fields[current].push(line);
    }
    const joined = (k) => (fields[k] || []).join('\n');
    const reply = joined('reply').split(/\r?\n/).filter((l) => !/^\s*(```|~~~)/.test(l)).map((l) => l.replace(/^\s*>\s?/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    // The post's link is the URL field; only a section with no such field may carry it in its heading.
    const url = /https?:\/\/[^\s)>\]"']+/.exec(fields.url ? joined('url') : headLine)?.[0].replace(/[.,;:!?]+$/, '');
    if (!url) continue;
    const heading = headLine.replace(/^\s*#?\d+[.):]?\s+/, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();
    finds.push({
      n: finds.length + 1,
      title: clip(heading, 140),
      url,
      where: clip(bare(joined('where')) || whereOf(url), 40),
      posted: clip(bare(joined('posted')), 40),
      quote: clip(bare(joined('quote').split(/\r?\n/).map((l) => l.replace(/^\s*>\s?/, '')).join(' ').replace(/\s+/g, ' ')), 500),
      fit: clip(bare(joined('fit').replace(/\s+/g, ' ')), 400),
      reply: clip(reply, 3000),
    });
    if (finds.length >= MAX_FINDS) break;
  }
  return finds;
}

function conversationsList(root, reviews, log) {
  const dir = join(root, INTENT);
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir).filter((n) => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(n)).sort().reverse(); // newest file first
  const seen = new Set();
  const out = [];
  for (const name of names) {
    const file = `${INTENT}/${name}`;
    const date = dateOf(name);
    if (ageDays(date) > CONVERSATION_DAYS) continue;
    const changed = mtime(join(root, file));
    let finds;
    try { finds = parseConversations(readFileSync(join(root, file), 'utf8')); } catch { continue; }
    const review = reviewOf(reviews, file, changed);
    for (const f of finds) {
      const key = urlKey(f.url);
      if (seen.has(key)) continue; // the same thread found again on another day
      seen.add(key);
      const id = `${file}#${f.n}`;
      // What a person did with this thread: under this id, or under the same link from another day's file.
      const mine = log.filter((e) => (e.id === id && (!e.url || urlKey(e.url) === key)) || (e.url && urlKey(e.url) === key));
      const last = mine.at(-1);
      const state = last ? { posted: 'posted', skip: 'skipped' }[last.decision] || 'new' : 'new';
      const by = last?.by || 'a person';
      out.push({
        id, file, n: f.n, date, ...f, review, state,
        why: { new: 'Waiting for you', posted: `Marked posted by ${by}`, skipped: `Skipped by ${by}` }[state],
        by: state === 'new' ? '' : by, at: state === 'new' ? new Date(changed).toISOString() : last.at, link: state === 'posted' ? last.link || '' : '',
      });
    }
  }
  return out;
}

// ---------- the page's state ----------

// { posts, conversations, counts, channels }. counts.waiting is what the sidebar shows: reviewed posts waiting for a
// decision plus new conversations.
export function postsState(root = ROOT) {
  const reviews = reviewTexts(root);
  const log = decisions(root);
  const posts = postsList(root, reviews, log);
  const conversations = conversationsList(root, reviews, log);
  const n = (list, state) => list.filter((x) => x.state === state).length;
  const counts = {
    posts: n(posts, 'pending'), approved: n(posts, 'approved'), posted: n(posts, 'posted'), declined: n(posts, 'declined'), inReview: n(posts, 'waiting'),
    conversations: n(conversations, 'new'), replied: n(conversations, 'posted'), skipped: n(conversations, 'skipped'),
  };
  counts.waiting = counts.posts + counts.conversations;
  return { posts, conversations, counts, channels: Object.fromEntries(Object.entries(CHANNELS).map(([k, v]) => [k, { label: v.label, compose: v.compose, limit: v.limit }])) };
}

// ---------- deciding ----------

const NO = (status, message) => ({ ok: false, status, message });

// A person's decision on one post or conversation, by its id (a post's path, or `<intent file>#<n>`):
//   post          approve (only a post that passed review), decline, posted (only an approved post)
//   conversation  posted, skip
// Only the log is written: nothing is posted, here or anywhere. Returns { ok, status, message }.
export function decidePost(root, id, decision, by = 'a person', note = '') {
  if (!['approve', 'decline', 'posted', 'skip'].includes(decision)) return NO(400, 'Say approve, decline, posted or skip.');
  const state = postsState(root);
  const post = state.posts.find((p) => p.id === id);
  const talk = state.conversations.find((c) => c.id === id);
  const item = post || talk;
  if (!item) return NO(404, "I couldn't find that post or conversation. It may have changed: reload the page.");
  const cleanNote = String(note ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
  const link = linkOf(cleanNote);
  const record = (extra = {}) => appendFileSync(join(root, LOG), `${JSON.stringify({ at: new Date().toISOString(), id, decision, by: String(by || 'a person').slice(0, 60), ...(link ? { link } : cleanNote ? { note: cleanNote } : {}), ...extra })}\n`);
  mkdirSync(join(root, 'ops'), { recursive: true });

  if (post) {
    const what = `the ${post.label} post`;
    if (decision === 'skip') return NO(409, 'A post is approved or declined; skipping is for conversations.');
    if (decision === 'approve') {
      if (post.state === 'approved') return NO(409, 'Already approved: copy it and post it yourself.');
      if (post.state === 'posted') return NO(409, 'Already marked posted.');
      // Whatever else a person did with it, only a post whose review passed, and that has not changed since, can be approved.
      if (post.gate !== 'ready') return NO(409, `Can't approve ${what} yet: ${post.gateWhy.charAt(0).toLowerCase()}${post.gateWhy.slice(1)}. Only a post that passed review can be approved.`);
      record();
      return { ok: true, status: 200, message: `Approved ${what}. Copy it and post it yourself: nothing is posted for you.` };
    }
    if (decision === 'decline') {
      if (post.state === 'declined') return NO(409, 'Already declined.');
      if (post.state === 'posted') return NO(409, 'Already marked posted.');
      record();
      return { ok: true, status: 200, message: `Declined ${what}: it won't be posted.` };
    }
    if (post.state === 'posted') return NO(409, 'Already marked posted.');
    if (post.state !== 'approved') return NO(409, 'Approve the post first, then post it and mark it posted.');
    record();
    return { ok: true, status: 200, message: `Marked ${what} as posted${link ? ' with its link' : ''}.` };
  }

  if (decision === 'approve' || decision === 'decline') return NO(409, 'A conversation is marked posted or skipped.');
  if (talk.state === 'posted') return NO(409, 'Already marked posted.');
  if (decision === 'skip' && talk.state === 'skipped') return NO(409, 'Already skipped.');
  record({ url: talk.url });
  return { ok: true, status: 200, message: decision === 'skip' ? 'Skipped.' : `Marked your reply as posted${link ? ' with its link' : ''}.` };
}
