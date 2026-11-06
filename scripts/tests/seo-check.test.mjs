import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { readAgent, splitTools } from '../_agents.mjs';
import { parsePage, parseRobots, robotsAllows, seoCheck } from '../seo-check.mjs';
import { makeCopy } from './_helpers.mjs';

const GOOD = `<!doctype html><html lang="en"><head><title>MotionRepo: launch videos from your code</title>
<meta name="description" content="Turn a repository into a launch video.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://example.test/">
<meta property="og:title" content="MotionRepo"><meta property="og:description" content="x"><meta property="og:image" content="https://example.test/og.png"><meta property="og:url" content="https://example.test/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"PanScience"},{"@type":"SoftwareApplication","name":"MotionRepo"}]}</script>
</head><body><h1>Your repo, turned into a launch video.</h1><p>${'MotionRepo reads your code and makes a launch video. '.repeat(20)}</p><img src="a.png" alt="A frame"></body></html>`;
const SHELL = '<!doctype html><html><head><title>App</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>';

// A small fake site: each URL maps to [status, body, headers]; bots can be given their own answer.
function site(pages, byBot = {}) {
  return async (url, { headers }) => {
    const ua = headers['User-Agent'];
    const bot = Object.keys(byBot).find((b) => ua.includes(b));
    const [status, body, extra = {}] = (bot && byBot[bot][url]) || pages[url] || [404, 'not found'];
    return new Response(body, { status, headers: { 'content-type': 'text/html', ...extra } });
  };
}

describe('seo-check: reading a page', () => {
  it('finds the title, description, canonical, H1, sharing tags and JSON-LD types, including a @graph', () => {
    const p = parsePage(GOOD);
    assert.equal(p.title, 'MotionRepo: launch videos from your code');
    assert.deepEqual(p.canonicals, ['https://example.test/']);
    assert.equal(p.canonicalInHead, true);
    assert.equal(p.h1s.length, 1);
    assert.deepEqual(p.jsonld, ['Organization', 'SoftwareApplication']);
    assert.equal(p.imagesWithoutAlt, 0);
    assert.equal(p.emptyShell, false);
  });

  it('spots an empty app shell and broken JSON-LD', () => {
    assert.equal(parsePage(SHELL).emptyShell, true);
    assert.equal(parsePage('<script type="application/ld+json">{nope</script>').badJson, 1);
  });
});

describe('seo-check: robots.txt', () => {
  const robots = parseRobots(`User-agent: *\nDisallow: /admin\nAllow: /admin/public\n\nUser-agent: GPTBot\nUser-agent: CCBot\nDisallow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\nSitemap: https://example.test/sitemap.xml`);
  it('uses the most specific group, the longest rule, and lets Allow win a tie', () => {
    assert.equal(robotsAllows(robots, 'Googlebot', '/pricing').allowed, true);
    assert.equal(robotsAllows(robots, 'Googlebot', '/admin/x').allowed, false);
    assert.equal(robotsAllows(robots, 'Googlebot', '/admin/public/x').allowed, true);
    assert.equal(robotsAllows(robots, 'GPTBot', '/').allowed, false);
    assert.equal(robotsAllows(robots, 'CCBot', '/docs').allowed, false, 'two agents can share a group');
    assert.equal(robotsAllows(robots, 'OAI-SearchBot', '/').allowed, true);
    assert.deepEqual(robots.sitemaps, ['https://example.test/sitemap.xml']);
    assert.equal(robotsAllows(parseRobots(''), 'ClaudeBot', '/').allowed, true, 'no rules means allowed');
  });
});

describe('seo-check: a whole site', () => {
  const pages = {
    'https://example.test/': [200, GOOD],
    'https://example.test/robots.txt': [200, 'User-agent: *\nAllow: /\nUser-agent: PerplexityBot\nDisallow: /\nSitemap: https://example.test/sitemap.xml', { 'content-type': 'text/plain' }],
    'https://example.test/sitemap.xml': [200, '<urlset><url><loc>https://example.test/</loc><lastmod>2026-11-06</lastmod></url><url><loc>https://example.test/gone</loc><lastmod>2026-11-06</lastmod></url><url><loc>https://example.test/a</loc><lastmod>2026-11-06</lastmod></url><url><loc>https://example.test/b</loc><lastmod>2026-11-06</lastmod></url></urlset>', { 'content-type': 'application/xml' }],
  };

  it('flags a blocked AI search bot, a CDN block, a dead sitemap URL and build-time lastmods, and reports training bots without judging', async () => {
    const lines = await seoCheck('https://example.test/', { fetchImpl: site(pages, { 'OAI-SearchBot': { 'https://example.test/': [403, 'Access denied'] } }), sample: 2 });
    const has = (level, re) => lines.some((l) => l.level === level && re.test(l.text));
    assert.ok(has('ok', /^status 200/));
    assert.ok(has('fail', /^PerplexityBot \(search and AI answers\) is blocked/));
    assert.ok(has('fail', /^OAI-SearchBot gets status 403/));
    assert.ok(has('ok', /^Googlebot gets the same page/));
    assert.ok(has('fail', /gone: status 404/));
    assert.ok(has('fail', /every lastmod is 2026-11-06/));
    assert.ok(has('info', /^GPTBot \(AI training/), 'training bots are information only');
    assert.ok(!lines.some((l) => l.level === 'fail' && /GPTBot|ClaudeBot|CCBot/.test(l.text)));
    assert.ok(has('info', /no llms.txt/));
  });

  it('fails a page that only JavaScript fills in, and one served differently to Googlebot', async () => {
    const lines = await seoCheck('https://example.test/', { fetchImpl: site({ ...pages, 'https://example.test/': [200, SHELL] }, { Googlebot: { 'https://example.test/': [200, GOOD] } }), sample: 0 });
    assert.ok(lines.some((l) => l.level === 'fail' && /empty app shell/.test(l.text)));
    assert.ok(lines.some((l) => l.level === 'fail' && /^Googlebot gets a different page/.test(l.text)));
  });

  it('checks a local file from a branch with --file', () => {
    const repo = makeCopy();
    try {
      writeFileSync(repo.path('page.html'), GOOD);
      const r = repo.run('seo-check.mjs', '--file', repo.path('page.html'), '--json');
      assert.equal(r.code, 0, r.stderr);
      const lines = JSON.parse(r.stdout);
      assert.ok(lines.some((l) => l.level === 'ok' && /JSON-LD types: Organization, SoftwareApplication/.test(l.text)));
    } finally {
      repo.remove();
    }
  });
});

describe('the seo-aeo agent', () => {
  it('has its skills, a desk in both offices, a person and a character, and the reading-only browser', async () => {
    const agent = readAgent('seo-aeo');
    for (const s of ['site-technical-audit', 'page-content-seo', 'saas-structured-data', 'ai-answer-visibility', 'seo-code-fixes', 'seo-fix-report']) {
      assert.ok(agent.fields.skills.includes(s), s);
      assert.ok(readAgent('seo-aeo-fallback').fields.skills.includes(s), `fallback ${s}`);
      assert.match(readFileSync(join(import.meta.dirname, '..', '..', '.claude', 'skills', s, 'SKILL.md'), 'utf8'), /^---\nname: /);
    }
    const tools = splitTools(agent.fields.tools);
    assert.ok(!tools.some((t) => /browser_(type|fill_form|evaluate|run_code)/.test(t)));
    const { DESKS } = await import('../control/office3d/layout.js');
    const { PEOPLE } = await import('../control/office3d/cast.js');
    const { SEATS } = await import('../control/gems/office.js');
    const { identityFor } = await import('../control/gems/identities.js');
    assert.ok(DESKS.some((d) => d.agent === 'seo-aeo'));
    assert.ok(PEOPLE['seo-aeo']);
    assert.ok(SEATS['seo-aeo']);
    assert.equal(identityFor('seo-aeo').name, 'Rank Gem');
    assert.match(readFileSync(join(import.meta.dirname, '..', '..', '.claude', 'agents', 'coordinator.md'), 'utf8'), /Agent\([^)]*\bseo-aeo\b/);
    assert.match(agent.body, /Never[\s\S]*Push/);
    assert.match(agent.body, /Block or unblock an AI crawler/);
  });
});
