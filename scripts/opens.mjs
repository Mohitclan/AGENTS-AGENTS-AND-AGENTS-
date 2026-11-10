#!/usr/bin/env node
// Who opened which email, and how often. Reads the opens the tracker recorded (tracker/worker.js, set up with
// tracker/README.md) and joins them to ops/send-log.jsonl, where scripts/send-email.mjs logs each send's `track` id.
// Mission control fetches them every 10 minutes and shows them on the Emails page.
//
//   node scripts/opens.mjs              fetch the newest opens from the tracker, then print one row per tracked send
//   node scripts/opens.mjs --no-fetch   print from the copy saved at the last fetch (ops/opens.json)
//
// An open is a weak signal, never proof that a person read the email: Apple Mail loads images by itself when an email
// arrives (via "apple"), Gmail fetches the image once through its proxy and caches it (so repeat opens often don't
// show), and many work mail apps block images (so real opens never show). Never branch a sequence on opens and never
// mention them to the recipient.
//
// Exports: fetchOpens(root, { fetch, env }) -> { ok, text, count }; savedOpens(root) -> { fetched_at, opens };
// opensOfSend(send, opens) -> { count, first, last, auto, via } | null; opensRows(root) -> rows for the table.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, isMain, loadSecret, printTable } from './_shared.mjs';

const SAVED = 'ops/opens.json';
const FETCH_MS = 15_000;

const readJson = (file, fallback) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const readJsonl = (file) => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((l) => {
  try {
    return [JSON.parse(l)];
  } catch {
    return [];
  }
}) : []);

function trackerOf(root) {
  const t = readJson(join(root, 'ops', 'mail-config.json'), {}).tracking;
  return t?.enabled && /^https:\/\/[^\s/]+/.test(t.base_url || '') ? t.base_url.replace(/\/+$/, '') : '';
}

// Fetches every open from the tracker and saves them to ops/opens.json. Never throws.
export async function fetchOpens(root = ROOT, { fetch: get = globalThis.fetch, env = process.env } = {}) {
  const base = trackerOf(root);
  if (!base) return { ok: false, text: 'Open tracking is off: set tracking.enabled and tracking.base_url in ops/mail-config.json (tracker/README.md).', count: 0 };
  const token = loadSecret('TRACKER_READ_TOKEN', root, env);
  if (!token) return { ok: false, text: 'TRACKER_READ_TOKEN is not set in .env (tracker/README.md, step 5).', count: 0 };
  try {
    const res = await get(`${base}/opens`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(FETCH_MS) });
    if (!res.ok) return { ok: false, text: `The tracker answered ${res.status}${res.status === 401 ? ': TRACKER_READ_TOKEN does not match its READ_TOKEN' : ''}.`, count: 0 };
    const opens = await res.json();
    writeFileSync(join(root, SAVED), `${JSON.stringify({ fetched_at: new Date().toISOString(), opens }, null, 2)}\n`);
    return { ok: true, text: `Fetched opens for ${Object.keys(opens).length} email(s).`, count: Object.keys(opens).length };
  } catch (error) {
    return { ok: false, text: `Could not reach the tracker: ${error.message}`, count: 0 };
  }
}

export function savedOpens(root = ROOT) {
  const saved = readJson(join(root, SAVED), null);
  return saved && typeof saved.opens === 'object' ? saved : { fetched_at: null, opens: {} };
}

// One send's opens. `auto` counts the loads that may not be a person: Apple Mail's own loading, and anything in the
// first minute after the send (mail scanners and proxies fetch at once).
export function opensOfSend(send, opens) {
  const rec = send?.track && opens[send.track];
  if (!rec?.count) return null;
  const sentAt = Date.parse(send.at);
  const auto = (rec.hits || []).filter((h) => h.via === 'apple' || Date.parse(h.at) - sentAt < 60_000).length;
  const via = [...new Set((rec.hits || []).map((h) => h.via))];
  return { count: rec.count, first: rec.first, last: rec.last, auto, via };
}

export function opensRows(root = ROOT) {
  const { opens } = savedOpens(root);
  return readJsonl(join(root, 'ops', 'send-log.jsonl'))
    .filter((s) => s.kind === 'outreach' && s.track)
    .map((s) => {
      const o = opensOfSend(s, opens);
      return {
        sent: s.at.slice(0, 16).replace('T', ' '),
        to: s.to,
        subject: s.subject,
        opens: o ? String(o.count) : '0',
        last: o ? o.last.slice(0, 16).replace('T', ' ') : '',
        note: !o ? 'not opened yet (or images blocked)' : o.auto === o.count ? 'may be automatic, not a person' : o.via.includes('gmail') ? 'Gmail caches the image: repeat opens may not show' : '',
      };
    });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== '--no-fetch')) {
    console.error('Usage: node scripts/opens.mjs [--no-fetch]');
    process.exit(1);
  }
  if (!args.includes('--no-fetch')) {
    const r = await fetchOpens(ROOT);
    console.log(r.text);
  }
  const rows = opensRows(ROOT);
  if (!rows.length) {
    console.log('No tracked emails yet. Emails get an open pixel once tracking is on in ops/mail-config.json.');
    return;
  }
  printTable(rows, ['sent', 'to', 'subject', 'opens', 'last', 'note']);
  console.log(`\nTimes are UTC. Last fetch: ${savedOpens(ROOT).fetched_at || 'never'}. An open is a hint, not proof that someone read it.`);
}

if (isMain(import.meta.url)) main();
