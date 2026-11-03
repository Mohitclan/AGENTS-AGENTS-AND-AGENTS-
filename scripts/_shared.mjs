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
//   a profile URL      https://linkedin.com/in/asha   covers that page and the pages below it
// A shared host (a site many people have a page on) is never a company domain: opting out of one
// profile on it must not opt out everyone else.

// Sites where a person's page is a path on the host: linkedin.com/in/asha, x.com/asha.
const PROFILE_PATH_HOSTS = ['linkedin.com', 'x.com', 'twitter.com', 'github.com', 'gitlab.com', 'medium.com', 'substack.com',
  'facebook.com', 'instagram.com', 'youtube.com', 'producthunt.com', 'peerlist.io', 'wellfound.com', 'threads.net', 'bsky.app', 'dev.to'];
// Sites where a person's page is a subdomain: asha.github.io, asha.substack.com. The bare host is shared.
const PROFILE_SUBDOMAIN_HOSTS = ['github.io', 'gitlab.io', 'medium.com', 'substack.com', 'vercel.app', 'netlify.app', 'pages.dev',
  'hashnode.dev', 'notion.site', 'carrd.co', 'webflow.io', 'blogspot.com', 'wordpress.com'];
export const SHARED_HOSTS = [...new Set([...PROFILE_PATH_HOSTS, ...PROFILE_SUBDOMAIN_HOSTS])];
// linkedin.com/in alone would cover every member, so a LinkedIn entry needs two path segments (in/asha, company/acme).
const MIN_PATH_SEGMENTS = { 'linkedin.com': 2 };

const underHost = (host, base) => host === base || host.endsWith(`.${base}`);
const isEmail = (s) => /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(s);

// The same site under its other names: www., m., mobile., LinkedIn's country sites, twitter.com for x.com.
function canonicalHost(host) {
  let h = String(host).toLowerCase().replace(/\.$/, '').replace(/^(www|m|mobile)\./, '');
  if (underHost(h, 'linkedin.com')) h = 'linkedin.com';
  if (h === 'twitter.com') h = 'x.com';
  return h;
}

// The shared host a host belongs to, or null. A path host counts only as itself; a subdomain host
// counts as itself and for everything under it.
function sharedHostOf(host) {
  return PROFILE_PATH_HOSTS.find((b) => host === b) || PROFILE_SUBDOMAIN_HOSTS.find((b) => underHost(host, b)) || null;
}

// Reads text as a web address, with or without http(s)://. Returns null for an email or anything else.
function parseWebAddress(text) {
  let s = String(text ?? '').trim();
  if (!s || /\s/.test(s) || isEmail(s)) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return ['http:', 'https:'].includes(u.protocol) && u.hostname.includes('.') ? u : null;
  } catch {
    return null;
  }
}

// https://host/path with the host and path lower-case, and no www., query, fragment or trailing slash.
export function normalizeProfileUrl(text) {
  const u = parseWebAddress(text);
  if (!u) return null;
  return `https://${canonicalHost(u.hostname)}${u.pathname.toLowerCase().replace(/\/+$/, '')}`;
}

// What `suppress` should store for a value, or why it can't: { kind: 'email' | 'url' | 'domain', value } or { error }.
export function classifySuppression(input) {
  const raw = String(input ?? '').trim().toLowerCase();
  if (isEmail(raw)) return { kind: 'email', value: raw };
  const u = parseWebAddress(raw);
  if (!u) return { error: `"${input}" is not a domain, an email address or a profile URL` };
  const host = canonicalHost(u.hostname);
  const path = u.pathname.replace(/\/+$/, '');
  const shared = sharedHostOf(host);
  if (!shared) return { kind: 'domain', value: host };
  const example = PROFILE_PATH_HOSTS.includes(host) ? `https://${host}/${host === 'linkedin.com' ? 'in/<name>' : '<name>'}` : `https://<name>.${host}`;
  if (host === shared && !path) {
    return { error: `${host} is a shared site: suppressing it would cover everyone who has a page there. Give the person's profile URL instead, for example ${example}` };
  }
  if (path.split('/').filter(Boolean).length < (MIN_PATH_SEGMENTS[host] || 0)) {
    return { error: `"${input}" does not name one person. Give the full profile URL, for example ${example}` };
  }
  return { kind: 'url', value: normalizeProfileUrl(raw) };
}

// An old entry that is a bare shared host (linkedin.com, x.com): `suppress` used to drop the profile path and
// store this. It matches nothing; `leads.mjs check` warns that it must be re-entered as a profile URL.
export function isBareSharedHostEntry(entry) {
  const v = String(entry?.value ?? '').trim().toLowerCase();
  return !v.includes('@') && !v.includes('/') && SHARED_HOSTS.includes(canonicalHost(v));
}

// The first entry in the list that covers this contact, or undefined.
//   contact  the contact's email address or URL
//   website  the lead's website, if any
//   domain   the lead's stored domain, if any
export function suppressionMatch(list, { contact = '', website = '', domain = '' } = {}) {
  const c = String(contact || '').trim().toLowerCase();
  const email = isEmail(c) ? c : '';
  const pages = [c, website].map(normalizeProfileUrl).filter(Boolean);
  const hosts = new Set(email ? [email.split('@').pop()] : []);
  for (const text of [c, website, domain]) {
    const u = parseWebAddress(text);
    if (u) hosts.add(canonicalHost(u.hostname));
  }
  return (list || []).find((s) => {
    const v = String(s?.value ?? '').trim().toLowerCase();
    if (!v || isBareSharedHostEntry(s)) return false;
    if (isEmail(v)) return v === email;
    if (v.includes('/')) {
      const url = normalizeProfileUrl(v);
      return !!url && pages.some((p) => p === url || p.startsWith(`${url}/`));
    }
    return [...hosts].some((h) => underHost(h, v));
  });
}
