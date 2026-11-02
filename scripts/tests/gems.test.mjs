import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { ROOT } from '../_shared.mjs';
import { avatarHTML } from '../control/gems/avatar.js';
import { characterSVG } from '../control/gems/characters.js';
import { IDENTITIES, identityFor, SYSTEM } from '../control/gems/identities.js';
import { normalizeState, STATES } from '../control/gems/status.js';

const agents = readdirSync(join(ROOT, '.claude', 'agents')).filter((f) => f.endsWith('.md') && !f.includes('-fallback')).map((f) => f.replace(/\.md$/, ''));

describe('gems: identities', () => {
  it('every agent has its own character', () => {
    for (const a of agents) assert.equal(identityFor(a).agent, a, `${a} has no identity`);
    assert.equal(new Set(IDENTITIES.map((i) => i.agent)).size, IDENTITIES.length);
    assert.equal(new Set(IDENTITIES.map((i) => i.id)).size, IDENTITIES.length);
  });

  it('keeps the six concepts', () => {
    assert.deepEqual(IDENTITIES.filter((i) => i.concept).map((i) => i.name), ['Code Buddy', 'Research Gem', 'Creative Gem', 'Cat Gem', 'Penguin Gem', 'Panda Gem']);
  });

  it('a backup agent wears its main agent\'s character; scripts get the gem', () => {
    assert.equal(identityFor('sales-fallback').id, 'penguin-gem');
    assert.equal(identityFor('system'), SYSTEM);
  });

  it('every identity has a theme, motion settings and a badge crop', () => {
    for (const i of [...IDENTITIES, SYSTEM]) {
      for (const k of ['primary', 'soft', 'ink']) assert.match(i.theme[k], /^#[0-9a-f]{6}$/i, `${i.id} ${k}`);
      assert.equal(i.badge.split(' ').length, 4, i.id);
      assert.ok(i.motion && typeof i.motion.float === 'number', i.id);
    }
  });
});

describe('gems: rendering', () => {
  const parts = ['gm-root', 'gm-head', 'gm-face', 'gm-eyes-open', 'gm-eyes-focus', 'gm-eyes-happy', 'gm-eyes-closed', 'gm-mouth-smile', 'gm-mouth-open', 'gm-mouth-worry', ...STATES.filter((s) => s !== 'idle').map((s) => `gm-fx-${s}`)];

  it('every character has the parts each state needs', () => {
    for (const i of [...IDENTITIES, SYSTEM]) {
      const svg = characterSVG(i, { uid: 't' });
      for (const p of parts) assert.ok(svg.includes(p), `${i.id} lacks ${p}`);
      assert.ok(!svg.includes('undefined'), `${i.id} has an undefined value`);
      assert.match(svg, /^<svg[^>]+viewBox="0 0 160 200"/);
    }
  });

  it('a still badge has only the idle face and no effects', () => {
    const svg = characterSVG(identityFor('researcher'), { uid: 's', still: true });
    for (const p of ['gm-eyes-focus', 'gm-eyes-happy', 'gm-mouth-worry', 'gm-fx']) assert.ok(!svg.includes(p), p);
    assert.ok(svg.includes('gm-eyes-open'));
  });

  it('avatarHTML sets state, size, mode and an accessible label', () => {
    const html = avatarHTML('researcher', { status: 'researching', size: 'lg', mode: 'badge' });
    assert.match(html, /class="gem gem-badge gem-lg st-researching"/);
    assert.match(html, /role="img" aria-label="Research Gem: Researching"/);
    assert.match(avatarHTML('sales', { size: 72 }), /data-px="72"/);
    assert.match(avatarHTML('sales', { status: 'nonsense' }), /st-idle/);
  });

  it('gives each avatar its own gradient ids', () => {
    const ids = [avatarHTML('sales'), avatarHTML('sales')].map((h) => /id="(g\d+)-sh"/.exec(h)[1]);
    assert.notEqual(ids[0], ids[1]);
  });

  it('turns older status words into states', () => {
    assert.equal(normalizeState('done'), 'success');
    assert.equal(normalizeState('failed'), 'error');
    assert.equal(normalizeState('working'), 'working');
  });
});
