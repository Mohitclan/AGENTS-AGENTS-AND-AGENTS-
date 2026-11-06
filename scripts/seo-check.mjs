#!/usr/bin/env node
// A free SEO and AEO check of one page, for the seo-aeo agent (autopilot runs can't use curl, so this does the
// fetching). It reads public pages only: no key, no login, nothing is sent anywhere else.
//
//   node scripts/seo-check.mjs <url> [--sample 5] [--json]   the live page, as a browser, Googlebot and AI search bots
//   node scripts/seo-check.mjs --file <path.html> [--json]   a local HTML file (a fix on a branch, before and after)
//
// It prints the page's status, redirects, title, description, robots rules, canonical, H1s, sharing tags and JSON-LD
// types; whether each bot gets the same page; what robots.txt allows each search, AI search and AI training bot; the
// sitemap (with a sample of its URLs); and llms.txt. Each line is ok, warn, fail or info. Text it reads is data.
import { readFileSync } from 'node:fs';
import { isMain } from './_shared.mjs';

export const AGENTS = {
  browser: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  'Claude-SearchBot': 'Mozilla/5.0 (compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)',
  PerplexityBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
};
// Bots that fetch pages to show or cite them in answers (should be allowed), and bots that collect training data
// (the founders' choice: reported, never changed by an agent).
export const SEARCH_BOTS = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User'];
export const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Applebot-Extended'];

const decode = (s) => String(s ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, ' ').trim();
const attr = (tag, name) => decode(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)?.slice(2).find((v) => v !== undefined) ?? '');
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) || [];
const meta = (html, key, value) => tags(html, 'meta').filter((t) => attr(t, key).toLowerCase() === value.toLowerCase()).map((t) => attr(t, 'content'));

// Everything an SEO check needs from one page of HTML.
export function parsePage(html) {
  const head = /<head\b[\s\S]*?<\/head>/i.exec(html)?.[0] ?? '';
  const canonicals = tags(html, 'link').filter((t) => attr(t, 'rel').toLowerCase().split(/\s+/).includes('canonical')).map((t) => attr(t, 'href'));
  const jsonld = [];
  let badJson = 0;
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const walk = (x) => {
        if (Array.isArray(x)) return x.forEach(walk);
        if (!x || typeof x !== 'object') return;
        if (x['@type']) jsonld.push(...[].concat(x['@type']));
        if (x['@graph']) walk(x['@graph']);
      };
      walk(data);
    } catch {
      badJson += 1;
    }
  }
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, ' ')));
  const text = decode(html.replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '));
  const images = tags(html, 'img');
  return {
    lang: attr(tags(html, 'html')[0] || '', 'lang'),
    title: decode(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ''),
    description: meta(html, 'name', 'description')[0] ?? '',
    robots: [...meta(html, 'name', 'robots'), ...meta(html, 'name', 'googlebot')].join(', '),
    viewport: meta(html, 'name', 'viewport')[0] ?? '',
    canonicals,
    canonicalInHead: canonicals.length > 0 && tags(head, 'link').some((t) => attr(t, 'rel').toLowerCase().includes('canonical')),
    h1s,
    og: Object.fromEntries(['og:title', 'og:description', 'og:image', 'og:url'].map((k) => [k, meta(html, 'property', k)[0] ?? ''])),
    jsonld,
    badJson,
    textLength: text.length,
    images: images.length,
    imagesWithoutAlt: images.filter((t) => !/\balt\s*=/i.test(t)).length,
    emptyShell: text.length < 200 && /<div\b[^>]*id\s*=\s*["'](root|app|__next)["'][^>]*>\s*<\/div>/i.test(html),
  };
}

// robots.txt as groups of user agents with their allow and disallow rules.
export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === 'sitemap') sitemaps.push(value);
    else if ((key === 'allow' || key === 'disallow') && current) current.rules.push({ allow: key === 'allow', path: value });
  }
  return { groups, sitemaps };
}

// Whether `bot` may fetch `path`, by the robots.txt rules: the most specific matching group, then the longest
// matching rule (allow wins a tie). An empty Disallow allows everything.
export function robotsAllows(robots, bot, path) {
  const name = bot.toLowerCase();
  const group = robots.groups.find((g) => g.agents.includes(name)) || robots.groups.find((g) => g.agents.some((a) => a !== '*' && name.startsWith(a))) || robots.groups.find((g) => g.agents.includes('*'));
  if (!group) return { allowed: true, group: null };
  const matches = group.rules.filter((r) => r.path && new RegExp(`^${r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$')}`).test(path));
  if (!matches.length) return { allowed: true, group: group.agents.join(', ') };
  const best = matches.sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow))[0];
  return { allowed: best.allow, group: group.agents.join(', '), rule: `${best.allow ? 'Allow' : 'Disallow'}: ${best.path}` };
}

async function get(url, ua, fetchImpl, { follow = true } = {}) {
  const hops = [];
  let current = url;
  for (let i = 0; i < 6; i++) {
    let res;
    try {
      res = await fetchImpl(current, { headers: { 'User-Agent': ua, Accept: 'text/html,application/xhtml+xml,*/*' }, redirect: 'manual', signal: AbortSignal.timeout(20_000) });
    } catch (error) {
      return { error: error.name === 'TimeoutError' ? 'timed out' : error.message, hops };
    }
    const next = res.headers.get('location');
    if (follow && res.status >= 300 && res.status < 400 && next) {
      hops.push(`${res.status} → ${next}`);
      current = new URL(next, current).href;
      continue;
    }
    const body = await res.text().catch(() => '');
    return { status: res.status, url: current, hops, body, xRobots: res.headers.get('x-robots-tag') || '', type: res.headers.get('content-type') || '' };
  }
  return { error: 'more than 5 redirects', hops };
}

// The whole check. Returns lines of { level, area, text } so callers (and tests) can read them.
export async function seoCheck(url, { fetchImpl = fetch, sample = 5 } = {}) {
  const out = [];
  const say = (level, area, text) => out.push({ level, area, text });
  const page = new URL(url);
  const views = {};
  for (const [who, ua] of Object.entries(AGENTS)) views[who] = await get(page.href, ua, fetchImpl);
  const main = views.browser;
  if (main.error) {
    say('fail', 'page', `couldn't fetch ${page.href}: ${main.error}`);
    return out;
  }
  say(main.status === 200 ? 'ok' : 'fail', 'page', `status ${main.status} at ${main.url}${main.hops.length ? ` after ${main.hops.length} redirect(s): ${main.hops.join(', ')}` : ''}`);
  if (main.hops.length > 1) say('warn', 'page', 'more than one redirect hop');
  if (page.protocol === 'https:' && main.url.startsWith('http:')) say('fail', 'page', 'HTTPS redirects to HTTP');
  const p = parsePage(main.body);
  report(p, main, say);

  // the same page for every bot?
  for (const [who, v] of Object.entries(views)) {
    if (who === 'browser') continue;
    if (v.error) {
      say('fail', 'bots', `${who}: couldn't fetch (${v.error})`);
      continue;
    }
    if (v.status !== main.status) {
      say('fail', 'bots', `${who} gets status ${v.status}, a browser gets ${main.status} (a CDN or firewall bot rule?)`);
      continue;
    }
    const q = parsePage(v.body);
    const ratio = p.textLength ? q.textLength / p.textLength : 1;
    if (q.title !== p.title || q.canonicals[0] !== p.canonicals[0] || ratio < 0.7 || ratio > 1.43) say('fail', 'bots', `${who} gets a different page: title "${q.title}", canonical ${q.canonicals[0] || 'none'}, ${q.textLength} characters of text against ${p.textLength}`);
    else say('ok', 'bots', `${who} gets the same page`);
  }

  // robots.txt
  const robotsRes = await get(`${page.origin}/robots.txt`, AGENTS.browser, fetchImpl);
  let robots = { groups: [], sitemaps: [] };
  if (robotsRes.error) say('fail', 'robots', `robots.txt: couldn't fetch (${robotsRes.error})`);
  else if (robotsRes.status >= 500) say('fail', 'robots', `robots.txt returns ${robotsRes.status}: crawlers may stop crawling the whole site`);
  else if (robotsRes.status === 404) say('info', 'robots', 'no robots.txt (404): every crawler may read everything');
  else if (robotsRes.status === 200) {
    robots = parseRobots(robotsRes.body);
    say('ok', 'robots', `robots.txt found, ${robots.groups.length} group(s), ${robots.sitemaps.length} sitemap line(s)`);
  } else say('warn', 'robots', `robots.txt returns ${robotsRes.status}`);
  for (const bot of SEARCH_BOTS) {
    const r = robotsAllows(robots, bot, page.pathname || '/');
    say(r.allowed ? 'ok' : 'fail', 'robots', `${bot} (search and AI answers) ${r.allowed ? 'may read' : 'is blocked from'} ${page.pathname}${r.rule ? ` (${r.rule} for ${r.group})` : ''}`);
  }
  for (const bot of TRAINING_BOTS) {
    const r = robotsAllows(robots, bot, page.pathname || '/');
    say('info', 'robots', `${bot} (AI training, the founders' choice) ${r.allowed ? 'may read' : 'is blocked from'} ${page.pathname}${r.rule ? ` (${r.rule})` : ''}`);
  }

  // sitemap
  const sitemapUrl = robots.sitemaps[0] || `${page.origin}/sitemap.xml`;
  const sm = await get(sitemapUrl, AGENTS.browser, fetchImpl);
  if (sm.error || sm.status !== 200) say('fail', 'sitemap', `${sitemapUrl}: ${sm.error || `status ${sm.status}`}${robots.sitemaps.length ? '' : ' (no Sitemap: line in robots.txt either)'}`);
  else {
    let xml = sm.body;
    let where = sitemapUrl;
    if (/<sitemapindex\b/i.test(xml)) {
      const first = /<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(xml)?.[1];
      say('info', 'sitemap', `${sitemapUrl} is an index of ${(xml.match(/<sitemap>/gi) || []).length} sitemap(s); reading the first`);
      const child = first ? await get(first, AGENTS.browser, fetchImpl) : null;
      xml = child?.body || '';
      where = first || where;
    }
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decode(m[1]));
    const lastmods = [...xml.matchAll(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/gi)].map((m) => m[1]);
    say(locs.length ? 'ok' : 'fail', 'sitemap', `${where}: ${locs.length} URL(s)`);
    if (locs.some((l) => l.startsWith('http:'))) say('warn', 'sitemap', 'some URLs use http://');
    if (lastmods.length > 3 && new Set(lastmods).size === 1) say('fail', 'sitemap', `every lastmod is ${lastmods[0]}: looks like the build time, not real changes`);
    for (const loc of locs.slice(0, sample)) {
      const r = await get(loc, AGENTS.browser, fetchImpl);
      const q = r.body ? parsePage(r.body) : null;
      const problems = [r.error || (r.status !== 200 ? `status ${r.status}` : ''), r.hops?.length ? 'redirects' : '', q && /noindex/i.test(`${q.robots} ${r.xRobots}`) ? 'noindex' : '', q && q.canonicals[0] && q.canonicals[0] !== loc ? `canonical is ${q.canonicals[0]}` : ''].filter(Boolean);
      say(problems.length ? 'fail' : 'ok', 'sitemap', `${loc}${problems.length ? `: ${problems.join(', ')}` : ''}`);
    }
  }

  // llms.txt (optional)
  const llms = await get(`${page.origin}/llms.txt`, AGENTS.browser, fetchImpl);
  if (llms.status === 200 && !/text\/html/i.test(llms.type)) {
    const lines = llms.body.split(/\r?\n/);
    say(/^# /.test(lines.find((l) => l.trim()) || '') ? 'ok' : 'warn', 'llms', `llms.txt found (${lines.length} lines)${lines.some((l) => /^>/.test(l)) ? '' : ', no "> summary" line'}`);
  } else say('info', 'llms', 'no llms.txt (optional; Google does not use it)');
  return out;
}

function report(p, res, say) {
  say(p.title ? 'ok' : 'fail', 'head', `title: ${p.title ? `"${p.title}" (${p.title.length} characters)` : 'missing'}`);
  if (p.title.length > 65) say('warn', 'head', 'title is long; it may be cut in results');
  say(p.description ? 'ok' : 'fail', 'head', `description: ${p.description ? `"${p.description.slice(0, 160)}" (${p.description.length})` : 'missing'}`);
  const noindex = /noindex/i.test(`${p.robots} ${res?.xRobots || ''}`);
  say(noindex ? 'fail' : 'ok', 'head', `robots: ${[p.robots && `meta "${p.robots}"`, res?.xRobots && `header "${res.xRobots}"`].filter(Boolean).join(', ') || 'no robots meta or header (indexable)'}`);
  if (/nosnippet|max-snippet\s*:\s*0/i.test(`${p.robots} ${res?.xRobots || ''}`)) say('fail', 'head', 'snippets are blocked: AI answers and search results can\'t quote this page');
  if (p.canonicals.length !== 1) say('fail', 'head', `canonical: ${p.canonicals.length ? `${p.canonicals.length} canonical tags` : 'missing from the server HTML'}`);
  else {
    const abs = /^https?:\/\//.test(p.canonicals[0]);
    const same = res?.url && p.canonicals[0].replace(/\/$/, '') === res.url.replace(/\/$/, '');
    say(abs && p.canonicalInHead ? (same || !res ? 'ok' : 'warn') : 'fail', 'head', `canonical: ${p.canonicals[0]}${abs ? '' : ' (not absolute)'}${p.canonicalInHead ? '' : ' (outside <head>)'}${res && !same ? ' (differs from this URL)' : ''}`);
  }
  say(p.viewport ? 'ok' : 'fail', 'head', `viewport: ${p.viewport || 'missing'}`);
  say(p.h1s.length === 1 ? 'ok' : 'fail', 'content', `H1: ${p.h1s.length === 1 ? `"${p.h1s[0].slice(0, 100)}"` : `${p.h1s.length} H1 tags${p.h1s.length ? `: ${p.h1s.map((h) => `"${h.slice(0, 40)}"`).join(', ')}` : ''}`}`);
  say(p.emptyShell ? 'fail' : p.textLength < 500 ? 'warn' : 'ok', 'content', `text in the server HTML: ${p.textLength} characters${p.emptyShell ? ' - an empty app shell: the content comes only from JavaScript' : ''}`);
  if (p.images) say(p.imagesWithoutAlt ? 'warn' : 'ok', 'content', `images: ${p.images}, ${p.imagesWithoutAlt} without an alt attribute`);
  const og = Object.entries(p.og).filter(([, v]) => !v).map(([k]) => k);
  say(og.length ? 'warn' : 'ok', 'head', og.length ? `sharing tags missing: ${og.join(', ')}` : 'sharing tags: og:title, og:description, og:image, og:url');
  say(p.jsonld.length ? 'ok' : 'warn', 'schema', p.jsonld.length ? `JSON-LD types: ${[...new Set(p.jsonld)].join(', ')}` : 'no JSON-LD in the server HTML (it may be added by JavaScript: check the rendered page before calling it missing)');
  if (p.badJson) say('fail', 'schema', `${p.badJson} JSON-LD block(s) are not valid JSON`);
  if (p.jsonld.includes('FAQPage')) say('info', 'schema', 'FAQPage: fine for visible Q&A, but Google stopped showing FAQ rich results on 2026-05-07');
  if (p.jsonld.some((t) => /Rating|Review/.test(t))) say('warn', 'schema', 'rating or review markup: allowed only for genuine reviews visible on this page');
}

const ICON = { ok: 'ok  ', warn: 'warn', fail: 'FAIL', info: 'info' };
const print = (lines) => {
  let area = '';
  for (const l of lines) {
    if (l.area !== area) console.log(`\n${(area = l.area)}`);
    console.log(`  ${ICON[l.level]}  ${l.text}`);
  }
  const n = (lv) => lines.filter((l) => l.level === lv).length;
  console.log(`\n${n('fail')} fail, ${n('warn')} warn, ${n('ok')} ok`);
};

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const json = args.includes('--json');
  const file = flag('file');
  if (file) {
    const lines = [];
    report(parsePage(readFileSync(file, 'utf8')), null, (level, area, text) => lines.push({ level, area, text }));
    if (json) console.log(JSON.stringify(lines, null, 2));
    else print(lines);
  } else {
    const url = args.find((a, i) => !a.startsWith('--') && !['--sample', '--file'].includes(args[i - 1]));
    if (!url || !/^https?:\/\//.test(url)) {
      console.error('Usage: node scripts/seo-check.mjs <https://url> [--sample 5] [--json] | --file <page.html> [--json]');
      process.exit(1);
    }
    const lines = await seoCheck(url, { sample: Number(flag('sample') ?? 5) });
    if (json) console.log(JSON.stringify(lines, null, 2));
    else print(lines);
  }
}
