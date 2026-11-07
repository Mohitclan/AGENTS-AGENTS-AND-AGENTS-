import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { after, describe, it } from 'node:test';
import { hashPassword } from '../dashboard.mjs';
import { BRAND, drawLockup, drawLogo, faviconHref, LOCKUP, LOCKUP_RATIO, lockupSvg, LOGO, LOGO_D, LOGO_RATIO, logoSvg, WORDMARK, wordmarkSvg } from '../control/gems/logo.js';
import { makeCopy } from './_helpers.mjs';

const numbers = (d) => [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));

// The box a path's points span (control points included), so a shape can be checked to sit flush in its box.
const span = (d) => {
  const all = numbers(d);
  const xs = all.filter((_, i) => i % 2 === 0);
  const ys = all.filter((_, i) => i % 2 === 1);
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
};
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);

describe('the PanScience Innovations logo', () => {
  it('has a mark of four closed shapes (the outer stroke, the S, the i and its dot) that fill their box', () => {
    assert.equal(LOGO.parts.length, 4);
    for (const part of LOGO.parts) assert.match(part, /^M[\d LC-]+Z$/);
    assert.ok(near(span(LOGO_D), [0, LOGO.w, 0, LOGO.h]), String(span(LOGO_D)));
    assert.equal(LOGO.h, 1000);
    assert.ok(Math.abs(LOGO_RATIO - 0.885) < 0.01, 'the mark keeps the supplied pictures\' proportions');
  });

  it('has the "PANSCIENCE INNOVATIONS" wordmark, flush in its box, beside the mark as in the supplied picture', () => {
    assert.match(WORDMARK.d, /^M[\d LZM-]+Z$/);
    assert.ok(near(span(WORDMARK.d), [0, WORDMARK.w, 0, WORDMARK.h]), String(span(WORDMARK.d)));
    assert.equal(LOCKUP.h, LOGO.h);
    assert.equal(LOCKUP.w, LOCKUP.word.x + WORDMARK.w);
    assert.ok(LOCKUP.word.x > LOGO.w, 'the wordmark starts after the mark');
    assert.ok(Math.abs(LOCKUP.word.y + WORDMARK.h / 2 - LOGO.h / 2) < 40, 'and is centred on it');
    assert.equal(BRAND.name, 'PanScience Innovations');
  });

  it('gives the wordmark and the full logo as inline SVG in the colour of the text around it', () => {
    const word = wordmarkSvg('w', BRAND.name);
    assert.match(word, new RegExp(`^<svg class="w" viewBox="0 0 ${WORDMARK.w} ${WORDMARK.h}"`));
    assert.match(word, /role="img" aria-label="PanScience Innovations"/);
    const full = lockupSvg('brand-logo', BRAND.name);
    assert.match(full, new RegExp(`^<svg class="brand-logo" viewBox="0 0 ${LOCKUP.w} ${LOCKUP.h}"`));
    assert.ok(full.includes(LOGO_D) && full.includes(WORDMARK.d));
    assert.match(full, new RegExp(`transform="translate\\(${LOCKUP.word.x} ${LOCKUP.word.y}\\)"`));
    assert.equal((full.match(/fill="currentColor"/g) || []).length, 2);
  });

  it('is inline SVG in the colour of the text around it, and says what it is only when it should', () => {
    const svg = logoSvg('brand-mark', BRAND.name);
    assert.match(svg, new RegExp(`^<svg class="brand-mark" viewBox="0 0 ${LOGO.w} ${LOGO.h}"`));
    assert.ok(svg.includes(`<path fill="currentColor" d="${LOGO_D}"/>`));
    assert.match(svg, /role="img" aria-label="PanScience Innovations"/);
    assert.match(logoSvg('decor'), /aria-hidden="true"/);
    assert.doesNotMatch(logoSvg('decor'), /aria-label/);
  });

  it('makes a tab icon: the dark mark on a warm light tile, as a data address', () => {
    const href = faviconHref();
    assert.match(href, /^data:image\/svg\+xml,/);
    const svg = decodeURIComponent(href.replace('data:image/svg+xml,', ''));
    assert.ok(svg.includes(`fill="${BRAND.paper}"`) && svg.includes(`fill="${BRAND.ink}"`));
    assert.ok(svg.includes(LOGO_D));
    assert.ok(href.length < 12000, 'small enough for a tab icon');
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

  it('draws the full logo on a canvas, with the letters filled even-odd so their holes stay open', () => {
    const fills = [];
    const ctx = { save() {}, restore() {}, translate() {}, scale() {}, fill: (p, rule) => fills.push([p.d, rule]), set fillStyle(v) {} };
    globalThis.Path2D = class { constructor(d) { this.d = d; } };
    const width = drawLockup(ctx, 0, 0, 100, '#fff');
    assert.deepEqual(fills, [[LOGO_D, undefined], [WORDMARK.d, 'evenodd']]);
    assert.ok(Math.abs(width - 100 * LOCKUP_RATIO) < 1e-9);
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
      assert.match(page, /<div class="brand"><svg class="brand-logo"[^>]*aria-label="PanScience Innovations"/);
      assert.match(page, /<title>PanScience Innovations · Mission control<\/title>/);
      assert.equal((await fetch(`${base}/gems/logo.js`)).status, 200, 'the browser can load the mark');
    } finally {
      child.kill();
    }
  });

  it('is what the page header and the opening use, with no gem artwork left in the opening', async () => {
    const { readFileSync } = await import('node:fs');
    const intro = readFileSync(repo.path('scripts', 'control', 'gems', 'intro.js'), 'utf8');
    assert.match(intro, /import \{ BRAND, LOGO, logoSvg, wordmarkSvg \} from '\.\/logo\.js'/);
    assert.match(intro, /wordmarkSvg\('intro-word'\)/);
    assert.doesNotMatch(intro, /IDENTITIES|badgeImg|intro-gem|intro-orbit/);
    assert.match(readFileSync(repo.path('scripts', 'control', 'app.js'), 'utf8'), /lockupSvg\('brand-logo', BRAND\.name\)/);
    const gate = readFileSync(repo.path('scripts', 'control', 'gems', 'gate.js'), 'utf8');
    assert.match(gate, /wordmarkSvg\('gate-word'\)/);
    assert.match(gate, /Welcome to the <b>\$\{BRAND\.name\}<\/b> environment/);
    assert.match(readFileSync(repo.path('scripts', 'control', 'gems', 'office.js'), 'utf8'), /lockupSvg\('o-sign-logo', BRAND\.name\)/);
    assert.match(readFileSync(repo.path('scripts', 'control', 'office3d', 'scene.js'), 'utf8'), /drawLockup\(ctx, 20, 28, 200, BRAND\.ink\)/);
  });
});
