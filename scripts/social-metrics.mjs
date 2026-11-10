#!/usr/bin/env node
// Reads the public numbers of the posts mission control published (ops/social-log.jsonl) and appends one row per
// post to ops/social-metrics.jsonl, for the social analyst and the weekly report. Runs daily at 08:00 (ops/schedule.json).
//
//   node scripts/social-metrics.mjs
//
//   Bluesky   app.bsky.feed.getPosts on the public API: likes, reposts, replies, quotes (no login)
//   Mastodon  the status on its own server: favourites, boosts, replies (no login)
//   dev.to    your articles with the API key: reactions, comments, page views
//   LinkedIn  skipped unless the token may read post numbers (it usually may not)
// Only posts published in the last 60 days are read. A post that cannot be read is skipped with its reason, never
// guessed. Secrets are never printed, logged or written.
//
// Exports:
//   collect(root, { fetchFn, env, now })  -> { rows, skipped, errors }: the rows written this run
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, isMain, loadSecret } from './_shared.mjs';

const LOG = 'ops/social-log.jsonl';
const OUT = 'ops/social-metrics.jsonl';
const DAYS = 60;

const readJsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

async function getJson(fetchFn, url, headers = {}) {
  let res;
  try {
    res = await fetchFn(url, { headers: { Accept: 'application/json', ...headers } });
  } catch {
    return { status: 0, data: null };
  }
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

export async function collect(root = ROOT, { fetchFn = globalThis.fetch, env = process.env, now = new Date() } = {}) {
  const cutoff = +now - DAYS * 86_400_000;
  const last = new Map(); // one entry per post version: the newest successful live publish
  for (const e of readJsonl(join(root, LOG))) {
    if (e.ok && e.mode === 'live' && e.id && e.channel && Date.parse(e.at) >= cutoff) last.set(`${e.channel}|${e.id}`, e);
  }
  const posts = [...last.values()];
  const rows = [];
  const skipped = [];
  const errors = [];
  const at = now.toISOString();
  const row = (e, metrics) => rows.push({ at, channel: e.channel, post: e.post, id: e.id, url: e.url || '', published: e.at, metrics });
  const skip = (e, reason) => skipped.push({ channel: e.channel, post: e.post, reason });

  // Bluesky: up to 25 posts per request.
  const bsky = posts.filter((e) => e.channel === 'bluesky');
  for (let i = 0; i < bsky.length; i += 25) {
    const chunk = bsky.slice(i, i + 25);
    const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?${chunk.map((e) => `uris=${encodeURIComponent(e.id)}`).join('&')}`;
    const { status, data } = await getJson(fetchFn, url);
    if (status !== 200 || !Array.isArray(data?.posts)) {
      for (const e of chunk) errors.push({ channel: 'bluesky', post: e.post, reason: `Bluesky answered ${status || 'nothing'}` });
      continue;
    }
    for (const e of chunk) {
      const p = data.posts.find((x) => x.uri === e.id);
      if (!p) skip(e, 'Bluesky no longer lists the post');
      else row(e, { likes: num(p.likeCount), reposts: num(p.repostCount), replies: num(p.replyCount), quotes: num(p.quoteCount) });
    }
  }

  for (const e of posts.filter((x) => x.channel === 'mastodon')) {
    if (!e.instance) { skip(e, 'no server recorded'); continue; }
    const token = loadSecret('MASTODON_TOKEN', root, env);
    const { status, data } = await getJson(fetchFn, `${e.instance}/api/v1/statuses/${encodeURIComponent(e.id)}`, token ? { Authorization: `Bearer ${token}` } : {});
    if (status === 200 && data) row(e, { favourites: num(data.favourites_count), boosts: num(data.reblogs_count), replies: num(data.replies_count) });
    else if (status === 404) skip(e, 'Mastodon no longer lists the post');
    else errors.push({ channel: 'mastodon', post: e.post, reason: `Mastodon answered ${status || 'nothing'}` });
  }

  const devto = posts.filter((e) => e.channel === 'devto');
  if (devto.length) {
    const key = loadSecret('DEVTO_API_KEY', root, env);
    if (!key) devto.forEach((e) => skip(e, 'no DEVTO_API_KEY'));
    else {
      const { status, data } = await getJson(fetchFn, 'https://dev.to/api/articles/me/all?per_page=1000', { 'api-key': key, Accept: 'application/vnd.forem.api-v1+json' });
      if (status !== 200 || !Array.isArray(data)) devto.forEach((e) => errors.push({ channel: 'devto', post: e.post, reason: `dev.to answered ${status || 'nothing'}` }));
      else {
        for (const e of devto) {
          const a = data.find((x) => String(x.id) === String(e.id));
          if (!a) skip(e, 'dev.to does not list the article');
          else row(e, { reactions: num(a.public_reactions_count), comments: num(a.comments_count), page_views: num(a.page_views_count), published: a.published === true });
        }
      }
    }
  }

  for (const e of posts.filter((x) => x.channel === 'linkedin')) {
    const token = loadSecret('LINKEDIN_ACCESS_TOKEN', root, env);
    if (!token) { skip(e, 'no LINKEDIN_ACCESS_TOKEN'); continue; }
    const version = loadSecret('LINKEDIN_API_VERSION', root, env) || '202511';
    const { status, data } = await getJson(fetchFn, `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(e.id)}`, { Authorization: `Bearer ${token}`, 'LinkedIn-Version': version, 'X-Restli-Protocol-Version': '2.0.0' });
    if (status === 200 && data) row(e, { likes: num(data.likesSummary?.totalLikes), comments: num(data.commentsSummary?.totalFirstLevelComments) });
    else skip(e, status === 401 || status === 403 ? 'the token may not read post numbers' : `LinkedIn answered ${status || 'nothing'}`);
  }

  if (rows.length) {
    mkdirSync(join(root, 'ops'), { recursive: true });
    appendFileSync(join(root, OUT), rows.map((r) => `${JSON.stringify(r)}\n`).join(''));
  }
  return { rows, skipped, errors };
}

if (isMain(import.meta.url)) {
  collect().then((r) => {
    console.log(`Social metrics: ${r.rows.length} post(s) read, ${r.skipped.length} skipped, ${r.errors.length} problem(s).`);
    for (const s of [...r.skipped, ...r.errors]) console.log(`  ${s.channel} ${s.post}: ${s.reason}`);
  }).catch((e) => { console.error(`Social metrics failed: ${e.message}`); process.exit(1); });
}
