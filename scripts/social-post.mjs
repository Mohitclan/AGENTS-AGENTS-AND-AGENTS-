#!/usr/bin/env node
// Publishes one approved post through the platform's official, free API: Bluesky, Mastodon, dev.to (as a draft) or
// LinkedIn. X and Reddit are never published to: a person copies the text (Posts page).
//
//   node scripts/social-post.mjs --post <file> --approval <A-id> [--dry-run]
//
// Nothing is published without a person's click. A publish needs --approval <A-id>, a row in ops/approvals.md that
// says Yes and names the post file and the channel; mission control writes that row when a person presses
// "Publish to <channel>" on the Posts page (writePostApproval). It is refused when the post is not approved on the
// Posts page (a post that changed after its approval needs a new review and approval), when that version of the file
// was already published, when the text is over the channel's limit, or when the channel's credentials are not set.
// --dry-run runs every check and says what would be sent, with no network call and no log line.
//
// Credentials come from the environment or the git-ignored .env (loadSecret in _shared.mjs): BLUESKY_HANDLE,
// BLUESKY_APP_PASSWORD, MASTODON_INSTANCE, MASTODON_TOKEN, DEVTO_API_KEY, LINKEDIN_ACCESS_TOKEN, LINKEDIN_AUTHOR
// (LINKEDIN_API_VERSION optional). They are never printed, logged or written.
// Every publish and every refusal is logged to ops/social-log.jsonl; a publish is also recorded as `posted`, with
// its link, in ops/posts.jsonl. A dev.to post is saved as a draft: a person presses Publish on dev.to.
//
// Exports:
//   publish(root, { post, approval, dryRun, fetchFn, env, by, now })   -> { ok, channel, url, id, draft, message, reason }
//   publishFromPage(root, { id, by }, deps)  what the page's button does: checks, writes the approval row, publishes
//   writePostApproval(root, { by, post, channel, now })   the approval row; returns its id
//   preflight(root, post, env)               the checks that need no approval row
//   ADAPTERS, postBluesky, postMastodon, postDevto, postLinkedin   one per channel: (ctx) -> { id, url, draft? }
//   linkFacets(text), linkedinEscape(text), instanceUrl(value), PublishError
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve, sep } from 'node:path';
import { ROOT, isMain, loadSecret } from './_shared.mjs';
import { CHANNELS, decidePost, parsePost, postsState } from './posts.mjs';
import { SOCIAL, SETUP_DOC } from './social-accounts.mjs';
import { approvalAllows, parseArgs } from './send-email.mjs';

const POSTS = 'outputs/marketing/posts';
const LOG = 'ops/social-log.jsonl';
const LINKEDIN_VERSION = '202511';

export class PublishError extends Error {
  constructor(message, { expired = false } = {}) {
    super(message);
    this.expired = expired;
  }
}

const clip = (s, n) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const graphemes = (s) => (typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s)].length : [...s].length);
const readJsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
export const versionOf = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

// ---------- helpers for the adapters ----------

// One request. A network failure or a refusal becomes a PublishError with words a person can act on; the request
// (and so any token in it) is never part of the message.
async function call(fetchFn, name, channel, url, init) {
  let res;
  try {
    res = await fetchFn(url, init);
  } catch {
    throw new PublishError(`Couldn't reach ${name}. Check the connection and try again.`);
  }
  const raw = await res.text().catch(() => '');
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (res.status === 401 || (res.status === 403 && channel === 'linkedin')) {
    const fix = SOCIAL[channel].vars.length ? SOCIAL[channel].vars.join(' and ') : 'the credentials';
    throw new PublishError(channel === 'linkedin' ? `LinkedIn token expired: reconnect (new token in LINKEDIN_ACCESS_TOKEN; see ${SETUP_DOC}#linkedin).` : `${name} did not accept the credentials: check ${fix} (see ${SETUP_DOC}#${SOCIAL[channel].anchor}).`, { expired: true });
  }
  if (!res.ok) {
    const why = data.message || data.error_description || data.error || data.errors || raw;
    throw new PublishError(`${name} refused the post (${res.status}): ${clip(typeof why === 'string' ? why : JSON.stringify(why), 200) || 'no reason given'}`);
  }
  return { res, data };
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Link facets for Bluesky: each http(s) link in the text, with its position in UTF-8 bytes.
export function linkFacets(text) {
  const enc = new TextEncoder();
  const facets = [];
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    const url = m[0].replace(/[.,;:!?)\]]+$/, '');
    if (!url) continue;
    const byteStart = enc.encode(text.slice(0, m.index)).length;
    facets.push({ index: { byteStart, byteEnd: byteStart + enc.encode(url).length }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }] });
  }
  return facets;
}

// LinkedIn's post text treats ( ) { } [ ] < > @ | ~ _ * \ as markup: escape them so the text shows as written. A # stays
// so hashtags work.
export const linkedinEscape = (text) => text.replace(/([\\|{}@[\]()<>~_*])/g, '\\$1');

// The https address of a Mastodon server from what a person typed ("mastodon.social" or "https://mastodon.social/").
export function instanceUrl(value) {
  const v = String(value || '').trim();
  const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  if (u.protocol !== 'https:') throw new PublishError('MASTODON_INSTANCE must be an https address, such as mastodon.social.');
  return u.origin;
}

// ---------- adapters: ctx is { text, title, secret(name), fetchFn, now } ----------

export async function postBluesky({ text, secret, fetchFn, now = new Date() }) {
  const base = 'https://bsky.social';
  const { data: session } = await call(fetchFn, 'Bluesky', 'bluesky', `${base}/xrpc/com.atproto.server.createSession`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ identifier: secret('BLUESKY_HANDLE'), password: secret('BLUESKY_APP_PASSWORD') }),
  });
  if (!session.accessJwt || !session.did) throw new PublishError('Bluesky did not start a session: check BLUESKY_HANDLE and BLUESKY_APP_PASSWORD.');
  const record = { $type: 'app.bsky.feed.post', text, createdAt: now.toISOString() };
  const facets = linkFacets(text);
  if (facets.length) record.facets = facets;
  const { data } = await call(fetchFn, 'Bluesky', 'bluesky', `${base}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST', headers: { ...JSON_HEADERS, Authorization: `Bearer ${session.accessJwt}` },
    body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', record }),
  });
  const rkey = String(data.uri || '').split('/').pop();
  if (!data.uri || !rkey) throw new PublishError('Bluesky answered without the post address.');
  return { id: data.uri, url: `https://bsky.app/profile/${session.did}/post/${rkey}` };
}

export async function postMastodon({ text, secret, fetchFn }) {
  const instance = instanceUrl(secret('MASTODON_INSTANCE'));
  const { data } = await call(fetchFn, 'Mastodon', 'mastodon', `${instance}/api/v1/statuses`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${secret('MASTODON_TOKEN')}`, 'Idempotency-Key': versionOf(text) },
    body: JSON.stringify({ status: text, visibility: 'public' }),
  });
  if (!data.id) throw new PublishError('Mastodon answered without the post id.');
  return { id: String(data.id), url: data.url || `${instance}/web/statuses/${data.id}`, instance };
}

export async function postDevto({ text, title, secret, fetchFn }) {
  const heading = /^#\s+(.+)$/m.exec(text);
  const name = clip(title || heading?.[1] || text.split('\n')[0].replace(/^#+\s*/, ''), 128);
  const body = heading && !title ? text.replace(heading[0], '').trim() : text;
  const { data } = await call(fetchFn, 'dev.to', 'devto', 'https://dev.to/api/articles', {
    method: 'POST',
    headers: { ...JSON_HEADERS, Accept: 'application/vnd.forem.api-v1+json', 'api-key': secret('DEVTO_API_KEY') },
    body: JSON.stringify({ article: { title: name, body_markdown: body, published: false } }),
  });
  if (!data.id) throw new PublishError('dev.to answered without the article id.');
  return { id: String(data.id), url: data.url || `https://dev.to/dashboard`, draft: true };
}

export async function postLinkedin({ text, secret, fetchFn }) {
  const version = secret('LINKEDIN_API_VERSION') || LINKEDIN_VERSION;
  const { res } = await call(fetchFn, 'LinkedIn', 'linkedin', 'https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${secret('LINKEDIN_ACCESS_TOKEN')}`, 'LinkedIn-Version': version, 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify({
      author: secret('LINKEDIN_AUTHOR'),
      commentary: linkedinEscape(text),
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });
  const id = res.headers?.get?.('x-restli-id') || '';
  if (!id) throw new PublishError('LinkedIn accepted the post but sent no id: check your LinkedIn feed.');
  return { id, url: `https://www.linkedin.com/feed/update/${id}/` };
}

export const ADAPTERS = { bluesky: postBluesky, mastodon: postMastodon, devto: postDevto, linkedin: postLinkedin };

// ---------- the checks ----------

const no = (reason, extra = {}) => ({ ok: false, reason, ...extra });

// Everything that needs no approval row: where the post is, what its channel is, that a person approved this version
// of it on the Posts page, that it was not published already, that it fits, and that the channel is connected.
export function preflight(root, post, env = process.env) {
  const rel = String(post || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const abs = resolve(root, rel);
  const dir = resolve(root, POSTS) + sep;
  if (!rel || !abs.startsWith(dir) || !abs.endsWith('.md') || !existsSync(abs)) return no(`${rel || 'no post'} is not a post file under ${POSTS}/.`);
  const path = relative(root, abs).split(sep).join('/');
  const file = readFileSync(abs, 'utf8');
  const parsed = parsePost(file, path.split('/').pop());
  const channel = parsed.channel;
  const ch = CHANNELS[channel];
  const base = { path, channel, sha: versionOf(file), parsed };
  if (!ch) return no(`${path} names no channel I know.`, base);
  if (!ADAPTERS[channel]) return no(`${ch.label} is not published to from here: copy the text and post it yourself (${channel === 'x' ? "X's posting API is paid" : 'Reddit needs approval for its API'}).`, base);
  if (!parsed.text) return no('The post has no text.', base);
  const state = postsState(root).posts.find((p) => p.id === path);
  if (!state) return no(`${path} is not on the Posts page.`, base);
  if (state.state === 'posted') return no(`${path} is already marked posted.`, base);
  if (state.state !== 'approved') {
    const was = readJsonl(join(root, 'ops/posts.jsonl')).some((e) => e.id === path && e.decision === 'approve');
    return no(was && state.gate !== 'ready' ? `${path} changed after it was approved: it needs a new review and a new approval.` : `${path} is not approved on the Posts page.`, base);
  }
  const done = readJsonl(join(root, LOG)).find((e) => e.ok && e.mode === 'live' && e.post === path && e.sha === base.sha);
  if (done) return no(`This version of ${path} was already published on ${String(done.at).slice(0, 10)}${done.url ? ` (${done.url})` : ''}.`, base);
  const size = graphemes(parsed.text);
  if (ch.limit && size > ch.limit) return no(`The post is ${size} characters; ${ch.label} allows ${ch.limit}.`, base);
  const missing = SOCIAL[channel].vars.filter((n) => !loadSecret(n, root, env));
  if (missing.length) return no(`${ch.label} is not connected: set ${missing.join(' and ')} (see ${SETUP_DOC}#${SOCIAL[channel].anchor}).`, { ...base, notConnected: true });
  return { ok: true, ...base, label: ch.label };
}

// ---------- the approval row ----------

const istDay = (ms) => new Date(ms + 19_800_000).toISOString().slice(0, 10);

// A row in ops/approvals.md for one publish a person pressed: who, date, post file and channel. publish() reads it
// back (approvalAllows): the Decision starts with Yes and the row names the post and the channel. Returns its ID.
export function writePostApproval(root, { by, post, channel, now = new Date() }) {
  const file = join(root, 'ops', 'approvals.md');
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '# Approvals\n\n| ID | Task | Action | Files to review | Risk | Decision | By | Date |\n|---|---|---|---|---|---|---|---|\n';
  const day = istDay(+now);
  const stem = `A-${day.replace(/-/g, '')}-`;
  const last = Math.max(0, ...[...text.matchAll(new RegExp(`\\| ${stem}(\\d+) \\|`, 'g'))].map((m) => Number(m[1])));
  const id = `${stem}${String(last + 1).padStart(2, '0')}`;
  const cell = (v) => String(v ?? '').replace(/[|\r\n]+/g, ' ').trim();
  const label = CHANNELS[channel]?.label || channel;
  const row = `| ${id} | Posts page | Publish to ${cell(label)}: ${cell(post)} | ${cell(post)} | A real post on a public account: pressed on the Posts page after the post passed review and was approved | Yes, approved on the Posts page | ${cell(by)} | ${day} |`;
  mkdirSync(join(root, 'ops'), { recursive: true });
  writeFileSync(file, `${text}${text.endsWith('\n') ? '' : '\n'}${row}\n`);
  return id;
}

// ---------- publish ----------

const claimed = new Set(); // posts being published right now (a double click)

const logLine = (root, entry) => {
  mkdirSync(join(root, 'ops'), { recursive: true });
  appendFileSync(join(root, LOG), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
};

// Publishes one approved post. Always resolves: { ok: true, channel, url, id, draft, message } or { ok: false, reason }.
// A refusal or a failure is logged (not in a dry run).
export async function publish(root, { post, approval, dryRun = false, fetchFn = globalThis.fetch, env = process.env, by = '', now = new Date() } = {}) {
  const refuse = (r, extra = {}) => {
    if (!dryRun) logLine(root, { ok: false, mode: 'live', channel: r.channel || '', post: r.path || String(post || ''), approval: approval || null, by: extra.by || by || null, reason: r.reason });
    return { ok: false, channel: r.channel || '', reason: r.reason, message: r.reason };
  };
  const pre = preflight(root, post, env);
  if (!pre.ok) return refuse(pre);
  if (!approval) return refuse(no('a publish needs --approval <A-id> from ops/approvals.md', pre));
  const approvals = existsSync(join(root, 'ops/approvals.md')) ? readFileSync(join(root, 'ops/approvals.md'), 'utf8') : '';
  const ok = approvalAllows(approvals, approval, pre.path);
  if (!ok.ok) return refuse(no(ok.why, pre));
  const row = approvals.split(/\r?\n/).find((l) => l.startsWith(`| ${approval} |`)) || '';
  // The channel is named apart from the file name, which may contain it too.
  if (!row.split(pre.path).join(' ').toLowerCase().includes(pre.label.toLowerCase())) return refuse(no(`${approval} does not name ${pre.label}`, pre));
  const approver = ok.by || by || 'a person';
  if (dryRun) return { ok: true, dryRun: true, channel: pre.channel, message: `Dry run: would publish ${pre.path} to ${pre.label} (${graphemes(pre.parsed.text)} characters)${pre.channel === 'devto' ? ' as a draft' : ''}. Nothing sent, nothing logged.` };
  if (claimed.has(pre.path)) return refuse(no(`${pre.path} is being published right now.`, pre));
  claimed.add(pre.path);
  try {
    const secret = (name) => loadSecret(name, root, env);
    let r;
    try {
      r = await ADAPTERS[pre.channel]({ text: pre.parsed.text, title: pre.parsed.title, secret, fetchFn, now, env });
    } catch (e) {
      return refuse(no(e instanceof PublishError ? e.message : `${pre.label} did not take the post: ${clip(e.message, 120)}`, pre), { by: approver });
    }
    logLine(root, { ok: true, mode: 'live', channel: pre.channel, post: pre.path, sha: pre.sha, id: r.id, url: r.url, ...(r.instance ? { instance: r.instance } : {}), ...(r.draft ? { draft: true } : {}), approval, by: approver });
    const marked = decidePost(root, pre.path, 'posted', approver, r.url);
    const message = r.draft
      ? `Saved to dev.to as a draft: open it and press Publish there.`
      : `Published to ${pre.label}.`;
    return { ok: true, channel: pre.channel, url: r.url, id: r.id, draft: !!r.draft, message: marked.ok ? message : `${message} (It could not be marked posted: ${marked.message})` };
  } finally {
    claimed.delete(pre.path);
  }
}

// What the Posts page's button does: the checks first (so a refused post leaves no approval row), then the row naming
// the person, the post and the channel, then the publish. `id` is the post's path.
export async function publishFromPage(root, { id, by = 'a person on the page' }, deps = {}) {
  const env = deps.env || process.env;
  const pre = preflight(root, String(id || ''), env);
  if (!pre.ok) return { ok: false, status: 409, reason: pre.reason, message: pre.reason };
  const approval = writePostApproval(root, { by, post: pre.path, channel: pre.channel, now: deps.now });
  const r = await publish(root, { post: pre.path, approval, fetchFn: deps.fetchFn || globalThis.fetch, env, by, now: deps.now });
  return { ...r, status: r.ok ? 200 : 502, approval };
}

// ---------- command line ----------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.post) {
    console.error('usage: node scripts/social-post.mjs --post <file> --approval <A-id> [--dry-run]');
    process.exit(1);
  }
  const r = await publish(ROOT, { post: args.post, approval: args.approval, dryRun: args.dryRun });
  if (!r.ok) {
    console.error(`Not published: ${r.reason}`);
    process.exit(1);
  }
  console.log(r.message + (r.url ? `\n${r.url}` : ''));
}

if (isMain(import.meta.url)) main().catch((e) => { console.error(`Not published: ${e.message}`); process.exit(1); });
