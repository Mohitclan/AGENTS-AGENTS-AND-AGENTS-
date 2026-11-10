// Email open tracker (asked for by the human on 2026-11-10): a Cloudflare Worker on the free plan.
// scripts/send-email.mjs puts a 1x1 image, <base>/o/<id>.gif, in each HTML email, with a fresh random id per send.
// Each time a mail app loads it, this records the time and which kind of fetcher loaded it. It never stores an IP
// address or the full user agent, and it does not know who an id belongs to: only ops/send-log.jsonl on our side does.
//
//   GET /o/<32 hex>.gif   records an open, returns the image (never cached, so each load reaches us)
//   GET /opens            every id's record, as JSON; needs "Authorization: Bearer <READ_TOKEN>"
//
// Storage: the KV namespace bound as OPENS, one key per id ("o:<id>"): { count, first, last, hits: [{ at, via }] }.
// via: gmail (Google's image proxy: it fetches once and caches, so repeat opens often don't reach us), apple (Apple
// Mail loads images itself when the email arrives, so it may not be a person), outlook, yahoo or other.
// Setup and deploy: tracker/README.md.

const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0));
const PIXEL = /^\/o\/([0-9a-f]{32})\.gif$/;
const MAX_HITS = 50;

export function viaOf(userAgent = '', org = '') {
  if (/GoogleImageProxy/i.test(userAgent)) return 'gmail';
  if (/apple/i.test(org)) return 'apple';
  if (/YahooMailProxy/i.test(userAgent)) return 'yahoo';
  if (/microsoft|outlook/i.test(`${org} ${userAgent}`)) return 'outlook';
  return 'other';
}

async function record(env, id, request, at = new Date().toISOString()) {
  const key = `o:${id}`;
  const rec = (await env.OPENS.get(key, 'json')) || { count: 0, first: null, last: null, hits: [] };
  const via = viaOf(request.headers.get('User-Agent') || '', request.cf?.asOrganization || '');
  rec.count += 1;
  rec.first ||= at;
  rec.last = at;
  rec.hits = [...rec.hits, { at, via }].slice(-MAX_HITS);
  await env.OPENS.put(key, JSON.stringify(rec));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pixel = PIXEL.exec(url.pathname);
    if (pixel && request.method === 'GET') {
      ctx.waitUntil(record(env, pixel[1], request));
      return new Response(GIF, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' },
      });
    }
    if (url.pathname === '/opens' && request.method === 'GET') {
      if (!env.READ_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.READ_TOKEN}`) return new Response('Not allowed', { status: 401 });
      const out = {};
      let cursor;
      do {
        const page = await env.OPENS.list({ prefix: 'o:', cursor });
        for (const k of page.keys) out[k.name.slice(2)] = await env.OPENS.get(k.name, 'json');
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
    }
    return new Response('Not found', { status: 404 });
  },
};
