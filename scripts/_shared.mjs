// Helpers shared by the scripts in this folder. Node 20+, no dependencies.
import { readdirSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// True when the module at metaUrl is the script node was started with. Compares real paths, so a
// symlinked folder (macOS's /var is /private/var) doesn't make a script silently do nothing.
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}

// Local date as YYYY-MM-DD.
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysSince(date) {
  const t = Date.parse(`${date}T00:00:00`);
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86_400_000);
}

// Reads the frontmatter block at the top of a Markdown file into a flat object.
// Only simple `key: value` lines are needed; trailing ` # comments` and surrounding quotes are dropped.
export function frontmatter(text) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].replace(/\s+#.*$/, '').trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return out;
}

export function walk(dir, ext = '.md') {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p, ext);
    return e.name.endsWith(ext) ? [p] : [];
  });
}

export function printTable(rows, columns) {
  const widths = columns.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)));
  const line = (vals) => vals.map((v, i) => String(v ?? '').padEnd(widths[i])).join('  ').trimEnd();
  console.log(line(columns));
  console.log(line(widths.map((w) => '-'.repeat(w))));
  for (const r of rows) console.log(line(columns.map((c) => r[c])));
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}

// ---- Opt-outs (CLAUDE.md hard rule 7) ----
// One place decides who an opt-out covers. scripts/leads.mjs (suppress, import, set-status, gate) and
// scripts/send-email.mjs both call suppressionMatch. leads.mjs runs its command line when imported,
// so the function lives here, where both can import it.
//
// An entry in pipeline/suppression.jsonl is one of:
//   an email address   asha@example.com               covers that address only
//   a company domain   example.com                    covers the domain, its subdomains and addresses on them
//   a profile URL      https://linkedin.com/in/asha   covers that page and the pages below it; a page below a profile
//                                                     is stored as the profile, and a page that names no one is refused
// A shared host (a site many people have a page on) is never a company domain: opting out of one
// profile on it must not opt out everyone else.

// Free consumer mailboxes: knowledge/company.md says never contact personal (non-work) addresses, and an
// opt-out can't be filed against one of these domains, because it would cover everyone who uses it.
export const PERSONAL_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.in', 'yahoo.co.in', 'ymail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'rediffmail.com', 'gmx.com', 'mail.com', 'yandex.com',
]);

// Sites where a person's page is a path on the host: linkedin.com/in/asha, x.com/asha.
const PROFILE_PATH_HOSTS = ['linkedin.com', 'x.com', 'twitter.com', 'github.com', 'gitlab.com', 'medium.com', 'substack.com',
  'facebook.com', 'instagram.com', 'youtube.com', 'producthunt.com', 'peerlist.io', 'wellfound.com', 'threads.net', 'bsky.app', 'dev.to',
  'linktr.ee', 'calendly.com', 'bento.me', 'about.me', 'read.cv'];
// Sites where a person's page is a subdomain: asha.github.io, asha.substack.com. The bare host is shared.
const PROFILE_SUBDOMAIN_HOSTS = ['github.io', 'gitlab.io', 'medium.com', 'substack.com', 'vercel.app', 'netlify.app', 'pages.dev',
  'hashnode.dev', 'notion.site', 'carrd.co', 'webflow.io', 'blogspot.com', 'wordpress.com'];
export const SHARED_HOSTS = [...new Set([...PROFILE_PATH_HOSTS, ...PROFILE_SUBDOMAIN_HOSTS])];
// How a person's page is named on a path host. An opt-out stores only that part, so a post, a message thread or a
// contact-info page that someone pastes in still covers the person, and a page that names no one is refused.
//
// Hosts where the page has a known shape: the first segment is one of `named` and the name follows it
// (linkedin.com/in/asha, bsky.app/profile/asha), or, when `at`, it is an @handle (producthunt.com/@asha).
// Any other page on these hosts is not a person.
const PROFILE_ONLY = {
  'linkedin.com': { named: ['in', 'company', 'school', 'showcase', 'pub'] },
  'wellfound.com': { named: ['u', 'company'] },
  'bsky.app': { named: ['profile'] },
  'substack.com': { named: ['profile'], at: true },
  'producthunt.com': { at: true },
  'threads.net': { at: true },
};
// The other path hosts: the first segment is the handle (x.com/asha, github.com/asha), except these.
// First path segments that name a kind of page and need a name after them: youtube.com/c/acme, github.com/orgs/acme.
const NEEDS_NAME = new Set(['c', 'channel', 'user', 'users', 'orgs', 'groups']);
// facebook.com/people/asha/1000123: the page is the first segment, the name and the id.
const LONG_PROFILES = { 'facebook.com': { people: 3, pages: 3 } };
// First path segments that are never one person's page, on any host.
const NOT_A_PERSON = new Set(['home', 'explore', 'search', 'settings', 'login', 'signup', 'notifications', 'messages', 'feed', 'watch',
  'results', 'playlist', 'hashtag', 'intent', 'share', 'compose', 'topics', 'marketplace', 'features', 'pricing']);
// ... and on one host: posts, reels, messages and other pages that sit beside the profiles, not under them.
const NOT_A_HANDLE = {
  'x.com': ['i', 'tos', 'privacy', 'about', 'account'],
  'github.com': ['sponsors', 'collections', 'trending', 'enterprise', 'about', 'new'],
  'gitlab.com': ['explore', 'dashboard', 'users', 'new'],
  'instagram.com': ['p', 'reel', 'reels', 'tv', 'stories', 'direct', 'accounts'],
  'youtube.com': ['shorts', 'live', 'embed', 'feed', 'post'],
  'facebook.com': ['permalink.php', 'story.php', 'photo', 'photo.php', 'photos', 'reel', 'reels', 'stories', 'video', 'videos', 'events', 'sharer', 'sharer.php', 'plugins', 'dialog', 'login.php'],
  'medium.com': ['tag', 'me', 'plans', 'membership', 'm', 'creators'],
  'peerlist.io': ['jobs', 'scroll', 'companies', 'events', 'blog'],
  'dev.to': ['t', 'tags', 'listings', 'dashboard', 'new', 'enter', 'videos', 'pod', 'readinglist', 'top', 'latest', 'api'],
  'calendly.com': ['app', 'event_types'],
};
// Hosts whose profile URL has no @, though people often type one: x.com/@asha is x.com/asha.
const AT_DROPPED = new Set(['x.com', 'instagram.com', 'github.com', 'gitlab.com', 'facebook.com', 'peerlist.io', 'dev.to', 'linktr.ee',
  'calendly.com', 'bento.me', 'about.me', 'read.cv']);
const dropAt = (host, path) => (AT_DROPPED.has(host) ? path.replace(/^\/@(?=[^/])/, '/') : path);
// A page that is named by a query parameter, not by its path: facebook.com/profile.php?id=123.
const QUERY_IDENTIFIED = { 'facebook.com': { 'profile.php': 'id' } };

// Common two-part public suffixes (co.uk). A host that is only a suffix, or only one label (de, me), is not a company.
const MULTI_SUFFIXES = new Set(['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk', 'com.au', 'net.au', 'org.au',
  'edu.au', 'gov.au', 'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in', 'ac.in', 'edu.in', 'gov.in', 'res.in', 'co.nz', 'org.nz',
  'net.nz', 'co.za', 'org.za', 'com.br', 'net.br', 'org.br', 'com.cn', 'net.cn', 'org.cn', 'co.jp', 'ne.jp', 'or.jp', 'com.mx', 'com.sg',
  'com.hk', 'co.kr', 'com.tr', 'com.ar', 'com.my', 'co.id', 'com.ph', 'com.pk', 'com.ng', 'co.ke', 'com.eg', 'com.sa', 'com.vn', 'com.tw',
  'co.il', 'com.co', 'com.ua', 'com.pl']);

// Other names for the same site. Threads moved from threads.net to threads.com on 2025-04-24; both are stored as
// threads.net, so an entry or a lead written either way meets the other.
const ALIAS_HOSTS = { 'threads.com': 'threads.net', 'fb.com': 'facebook.com', 'instagr.am': 'instagram.com', 'angel.co': 'wellfound.com' };

const underHost = (host, base) => host === base || host.endsWith(`.${base}`);
const isEmail = (s) => /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(s);
const isPublicSuffix = (host) => !host.includes('.') || MULTI_SUFFIXES.has(host);
const isSharedHost = (host) => SHARED_HOSTS.some((b) => underHost(host, b));

// The same site under its other names: www., m., mobile., LinkedIn's country sites, Facebook's web./mbasic./touch.
// hosts, twitter.com for x.com, and the ALIAS_HOSTS above.
// Never cuts a host down to a public suffix: mobile.de stays mobile.de, www.com stays www.com.
function canonicalHost(host) {
  let h = String(host).toLowerCase().replace(/\.$/, '');
  const www = h.replace(/^www\./, '');
  if (www !== h && !isPublicSuffix(www)) h = www;
  const mobile = h.replace(/^(m|mobile)\./, '');
  if (mobile !== h && (isSharedHost(mobile) || ALIAS_HOSTS[mobile])) h = mobile;
  if (underHost(h, 'linkedin.com')) h = 'linkedin.com';
  if (/^(web|mbasic|touch)\.facebook\.com$/.test(h)) h = 'facebook.com';
  if (h === 'twitter.com') h = 'x.com';
  return ALIAS_HOSTS[h] ?? h;
}

// The path segments that name one person on a path host, or null when the page names no one (a message thread, a post,
// a bare section). Pages below the profile are cut off: x.com/asha/status/1 is x.com/asha.
function profileSegments(host, segs) {
  const s = host === 'linkedin.com' && segs[0] === 'comm' ? segs.slice(1) : segs;
  const [first] = s;
  if (!first || first === '@') return null;
  const only = PROFILE_ONLY[host];
  if (only) {
    if (only.named?.includes(first)) return s.length >= 2 ? s.slice(0, 2) : null;
    return only.at && first.length > 1 && first.startsWith('@') ? [first] : null;
  }
  if (NOT_A_PERSON.has(first) || NOT_A_HANDLE[host]?.includes(first)) return null;
  const keep = LONG_PROFILES[host]?.[first] ?? (NEEDS_NAME.has(first) ? 2 : 1);
  return s.length >= keep ? s.slice(0, keep) : null;
}

// The shared host a host belongs to, or null. A path host counts only as itself; a subdomain host
// counts as itself and for everything under it.
function sharedHostOf(host) {
  return PROFILE_PATH_HOSTS.find((b) => host === b) || PROFILE_SUBDOMAIN_HOSTS.find((b) => underHost(host, b)) || null;
}

// An email address with any mailto: wrapper taken off, or the text unchanged.
const stripMailto = (s) => (/^mailto:/i.test(s) ? s.replace(/^mailto:/i, '').split('?')[0] : s);

// Reads text as a web address, with or without http(s)://. Returns null for an email or anything else.
function parseWebAddress(text) {
  let s = String(text ?? '').trim();
  if (!s || /\s/.test(s) || isEmail(stripMailto(s))) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return ['http:', 'https:'].includes(u.protocol) && u.hostname.includes('.') ? u : null;
  } catch {
    return null;
  }
}

// https://host/path with the host and path lower-case, and no www., query, fragment or trailing slash.
// The one query kept is the one that names a page (facebook.com/profile.php?id=123).
export function normalizeProfileUrl(text) {
  const u = parseWebAddress(text);
  if (!u) return null;
  const host = canonicalHost(u.hostname);
  const path = dropAt(host, u.pathname.toLowerCase()).replace(/\/+$/, '').replace(host === 'linkedin.com' ? /^\/comm(?=\/)/ : /^$/, '');
  const param = QUERY_IDENTIFIED[host]?.[path.split('/')[1]];
  const id = param && u.searchParams.get(param);
  return `https://${host}${path}${id ? `?${param}=${id.toLowerCase()}` : ''}`;
}

// Reads one opt-out value. Returns { kind, value } with kind email | url | domain | shared-root | invalid.
// `error` is set when `suppress` must refuse the value. An old or hand-written entry can still carry an error:
// a shared-root entry (linkedin.com, https://www.linkedin.com/, https://linkedin.com/in) is read as "this whole
// host", and a person must replace it; an invalid one covers nobody. leads.mjs check fails on both.
function readSuppression(input) {
  // People paste an address with a wrapper or a stop after it: <asha@acme.com>, "asha@acme.com", (asha@acme.com),
  // asha@acme.com. A value stored with them would match nobody, so they come off first.
  const unwrap = (t) => t.replace(/^[<("'\[]+/, '').replace(/[>)"'\],;:.?]+$/, '');
  const raw = unwrap(stripMailto(unwrap(String(input ?? '').trim().toLowerCase())));
  if (/[<>()",;]/.test(raw)) {
    return { kind: 'invalid', value: raw, error: `"${input}" has brackets, quotes or commas inside it. Give the bare address or URL` };
  }
  if (isEmail(raw)) return { kind: 'email', value: raw };
  const hostText = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').split(/[/?#]/)[0];
  if (hostText.startsWith('.') || hostText.includes('*')) {
    return { kind: 'invalid', value: raw, error: `"${input}" has a leading dot or a wildcard, which matches nobody. An opt-out on acme.com already covers its subdomains: give acme.com` };
  }
  const u = parseWebAddress(raw);
  if (!u) return { kind: 'invalid', value: raw, error: `"${input}" is not a domain, an email address or a profile URL` };
  const host = canonicalHost(u.hostname);
  if (isPublicSuffix(host)) {
    return { kind: 'invalid', value: host, error: `"${input}" is a public suffix, not a company. Give the company's own domain` };
  }
  if (PERSONAL_MAIL.has(host)) {
    return { kind: 'domain', value: host, error: `${host} is a personal mail service: suppressing it would cover every address there. Give the person's email address instead` };
  }
  const shared = sharedHostOf(host);
  if (!shared) return { kind: 'domain', value: host };
  const pathHost = PROFILE_PATH_HOSTS.includes(host);
  const only = PROFILE_ONLY[host];
  const shape = only?.named ? `${only.named[0]}/<name>` : only?.at ? '@<name>' : '<name>';
  const example = pathHost ? `https://${host}/${shape}` : `https://<name>.${host}`;
  const root = (why) => ({ kind: 'shared-root', value: host, error: `${why} Give the person's profile URL instead, for example ${example}` });
  const segs = dropAt(host, u.pathname.toLowerCase()).split('/').filter(Boolean);
  if (host === shared && !segs.length) {
    return root(`${host} is a shared site: suppressing it would cover everyone who has a page there.`);
  }
  if (host === shared && !pathHost) {
    return root(`${host} is a shared site: a page on it is not one person.`);
  }
  const full = normalizeProfileUrl(raw);
  if (!pathHost) {
    // A subdomain site (asha.github.io) is the person; a page below it is a page on their site.
    const value = `https://${host}`;
    return { kind: 'url', value, longer: full !== value };
  }
  const idParam = QUERY_IDENTIFIED[host]?.[segs[0]];
  const idValue = idParam && segs.length === 1 && u.searchParams.get(idParam);
  const profile = idParam ? (idValue ? segs : null) : profileSegments(host, segs);
  if (!profile) return root(`"${input}" does not name one person.`);
  const value = normalizeProfileUrl(`https://${host}/${profile.join('/')}${idValue ? `?${idParam}=${idValue}` : ''}`);
  return { kind: 'url', value, longer: full !== value };
}

// What `suppress` should store for a value, or why it can't: { kind: 'email' | 'url' | 'domain', value } or { error }.
export function classifySuppression(input) {
  const { kind, value, error, longer } = readSuppression(input);
  if (error) return { error };
  return longer ? { kind, value, note: `That page is below the person's profile, so the profile, ${value}, is stored.` } : { kind, value };
}

// What is wrong with a stored entry, or '' when it is fine. `leads.mjs check` fails on any entry that has one.
export function suppressionProblem(entry) {
  const { kind, value, error, longer } = readSuppression(entry?.value);
  if (longer) return `it names a page below a profile, so it is read as ${value}`;
  if (!error) return '';
  if (kind === 'shared-root') return `it blocks every lead on ${value}. ${error}`;
  if (kind === 'invalid') return `it covers nobody. ${error}`;
  return error;
}

// How a matched entry reads in the gate: the value, or the old entry's reason to re-enter it.
export function describeSuppression(entry) {
  const { kind, value } = readSuppression(entry?.value);
  return kind === 'shared-root' ? `legacy ${value}: re-enter as a profile URL` : String(entry?.value ?? '');
}

// The first entry in the list that covers this contact, or undefined.
//   contact  the contact's email address or URL
//   website  the lead's website, if any
//   domain   the lead's stored domain, if any
// An old or hand-written shared-root entry covers every lead on that site until a person replaces it: the
// opt-out is not lost, and `leads.mjs check` fails while it exists. An invalid entry covers nobody.
export function suppressionMatch(list, { contact = '', website = '', domain = '' } = {}) {
  const c = stripMailto(String(contact || '').trim().toLowerCase());
  const email = isEmail(c) ? c : '';
  const pages = [c, website].map(normalizeProfileUrl).filter(Boolean);
  const hosts = new Set(email ? [canonicalHost(email.split('@').pop())] : []);
  for (const text of [c, website, domain]) {
    const u = parseWebAddress(text);
    if (u) hosts.add(canonicalHost(u.hostname));
  }
  return (list || []).find((s) => {
    const { kind, value } = readSuppression(s?.value);
    if (kind === 'email') return value === email;
    if (kind === 'url') return pages.some((p) => p === value || p.startsWith(`${value}/`));
    if (kind === 'domain' || kind === 'shared-root') return [...hosts].some((h) => underHost(h, value));
    return false;
  });
}
