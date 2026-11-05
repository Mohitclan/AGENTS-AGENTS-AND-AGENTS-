import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { after, describe, it } from 'node:test';
import { hashPassword } from '../dashboard.mjs';
import { BRAND, drawLogo, faviconHref, LOGO, LOGO_D, LOGO_RATIO, logoSvg } from '../control/gems/logo.js';
import { makeCopy } from './_helpers.mjs';

const numbers = (d) => [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));

describe('the panscience mark', () => {
  it('is two closed shapes that fill their box exactly, so it sits flush wherever it is placed', () => {
    assert.equal(LOGO.parts.length, 2);
    for (const part of LOGO.parts) assert.match(part, /^M[\d. ]+Z$/);
    const all = numbers(LOGO_D);
    const xs = all.filter((_, i) => i % 2 === 0);
    const ys = all.filter((_, i) => i % 2 === 1);
    assert.deepEqual([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], [0, LOGO.w, 0, LOGO.h]);
    assert.equal(LOGO_RATIO, LOGO.w / LOGO.h);
  });

  it('is inline SVG in the colour of the text around it, and says what it is only when it should', () => {
    const svg = logoSvg('brand-mark', 'panscience');
    assert.match(svg, /^<svg class="brand-mark" viewBox="0 0 968 1318"/);
    assert.match(svg, /<path fill="currentColor" d="M916 377/);
    assert.match(svg, /role="img" aria-label="panscience"/);
    assert.match(logoSvg('decor'), /aria-hidden="true"/);
    assert.doesNotMatch(logoSvg('decor'), /aria-label/);
  });

  it('makes a tab icon: the dark mark on a warm light tile, as a data address', () => {
    const href = faviconHref();
    assert.match(href, /^data:image\/svg\+xml,/);
    const svg = decodeURIComponent(href.replace('data:image/svg+xml,', ''));
    assert.ok(svg.includes(`fill="${BRAND.paper}"`) && svg.includes(`fill="${BRAND.ink}"`));
    assert.ok(svg.includes(LOGO_D));
    assert.ok(href.length < 2000, 'small enough for a tab icon');
  });

  it('draws on a canvas at the height asked for, and says how wide it came out', () => {
    const calls = [];
    const ctx = { save: () => calls.push('save'), restore: () => calls.push('restore'), translate: (x, y) => calls.push(['translate', x, y]), scale: (a, b) => calls.push(['scale', a, b]), fill: (p) => calls.push(['fill', p.d]), set fillStyle(v) { calls.push(['color', v]); } };
    globalThis.Path2D = class { constructor(d) { this.d = d; } };
    const width = drawLogo(ctx, 10, 20, 200, '#fff');
    assert.deepEqual(calls[1], ['translate', 10, 20]);
    assert.deepEqual(calls[2], ['scale', 200 / LOGO.h, 200 / LOGO.h]);
    assert.deepEqual(calls.at(-2), ['fill', LOGO_D]);
    assert.ok(Math.abs(width - 200 * LOGO_RATIO) < 1e-9);
    delete globalThis.Path2D;
  });
});

describe('the mark on the pages', () => {
  const repo = makeCopy();
  after(() => repo.remove());

  it('is on the sign-in page and in the tab icon', async () => {
    const child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: { ...process.env, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: hashPassword('a long enough password') } });
    const base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
    try {
      const page = await (await fetch(`${base}/`)).text();
      assert.match(page, /<link rel="icon" href="data:image\/svg\+xml,/);
      assert.match(page, /<div class="brand"><svg class="brand-mark"[^>]*aria-label="panscience"/);
      assert.equal((await fetch(`${base}/gems/logo.js`)).status, 200, 'the browser can load the mark');
    } finally {
      child.kill();
    }
  });

  it('is what the page header and the opening use, with no gem artwork left in the opening', async () => {
    const { readFileSync } = await import('node:fs');
    const intro = readFileSync(repo.path('scripts', 'control', 'gems', 'intro.js'), 'utf8');
    assert.match(intro, /import \{ LOGO, logoSvg \} from '\.\/logo\.js'/);
    assert.doesNotMatch(intro, /IDENTITIES|badgeImg|intro-gem|intro-orbit/);
    assert.match(readFileSync(repo.path('scripts', 'control', 'app.js'), 'utf8'), /logoSvg\('brand-mark', 'panscience'\)/);
  });
});
