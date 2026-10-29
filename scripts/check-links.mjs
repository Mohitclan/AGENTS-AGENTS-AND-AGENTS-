#!/usr/bin/env node
// Checks every http(s) link in the given files.
//
//   node scripts/check-links.mjs <file> [file...]
//
// Exits 1 if any link is broken (4xx/5xx) or unreachable. Sites that refuse automated
// checks (401, 403, 429) are listed as "restricted" for a human or WebFetch to verify.
import { readFileSync } from 'node:fs';
import { fail } from './_shared.mjs';

const TIMEOUT_MS = 12_000;
const CONCURRENCY = 6;

const files = process.argv.slice(2);
if (!files.length) fail('Usage: node scripts/check-links.mjs <file> [file...]');

const urls = new Set();
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    fail(`Can't read ${file}`);
  }
  for (const m of text.matchAll(/https?:\/\/[^\s<>"'`\])]+/g)) urls.add(m[0].replace(/[.,;:!?*_]+$/, ''));
}

async function probe(url) {
  const headers = { 'user-agent': 'Mozilla/5.0 (compatible; link-check)' };
  try {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow', headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (head.ok) return { url, status: head.status };
  } catch {
    // Some servers reject or drop HEAD; fall through to GET.
  }
  try {
    const res = await fetch(url, { redirect: 'follow', headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    await res.body?.cancel();
    return { url, status: res.status };
  } catch (err) {
    return { url, status: 0, error: err.cause?.code || err.name };
  }
}

function classify({ status }) {
  if (status === 0) return 'unreachable';
  if (status < 400) return 'ok';
  if ([401, 403, 429].includes(status)) return 'restricted';
  return 'broken';
}

const queue = [...urls];
const results = [];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) results.push(await probe(queue.shift()));
  }),
);

const groups = { ok: [], restricted: [], broken: [], unreachable: [] };
for (const r of results) groups[classify(r)].push(r);

console.log(
  `${results.length} link(s): ${groups.ok.length} ok, ${groups.restricted.length} restricted, ` +
    `${groups.broken.length} broken, ${groups.unreachable.length} unreachable`,
);
for (const kind of ['broken', 'unreachable', 'restricted']) {
  for (const r of groups[kind]) console.log(`${kind.toUpperCase()}  ${r.status || r.error}  ${r.url}`);
}
process.exit(groups.broken.length || groups.unreachable.length ? 1 : 0);
