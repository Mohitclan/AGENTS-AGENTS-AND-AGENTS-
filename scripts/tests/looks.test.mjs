import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { LOOKS, crewKey } from '../control/world/crew.js';
import { createCrowd, officeLayout } from '../control/world/crowd.js';
import { MAPS } from '../control/world/maps.js';
import { buildGrid } from '../control/world/nav.js';
import { OFFICES } from '../control/world/offices.js';

// A fixture office on the Social Media Studio's map: two real agents, one with a robot look, and one robot of the crew.
const map = MAPS['social-studio'];
const grid = buildGrid(map);
const fixture = {
  id: 'fixture', name: 'Fixture', team: 'Fixture team', map: 'social-studio', accent: '#fff',
  seats: { 'social-analyst': 'writers', copywriter: 'writers', ghost: 'nowhere' },
  looks: { 'social-analyst': 'shadow', copywriter: 'not-a-look', ghost: 'buddy', stranger: 'wink' },
  planned: [{ role: 'Designer', room: 'design' }],
  crew: [{ id: 'rosie', name: 'Rosie', role: 'Designer', look: 'sweetie' }],
};

describe('robot looks for real agents (crowd.js)', () => {
  const layout = officeLayout(fixture, map, grid);

  it('lists the seated agents whose office gives them a known look, and ignores unknown looks, unseated agents and strangers', () => {
    assert.deepEqual([...layout.looks], [['social-analyst', 'shadow']]);
    assert.ok(Object.hasOwn(LOOKS, 'shadow'));
  });

  it('keeps the agent in the walkers with its seat, apart from the office crew robots', () => {
    assert.ok(layout.seats.has('social-analyst') && layout.how.has('social-analyst'));
    assert.deepEqual(layout.crew.map((c) => c.key), [crewKey('rosie')]);
    assert.ok(!layout.looks.has(crewKey('rosie')), 'a crew robot has its look in `crew`');
  });

  it('walks and takes status like any agent: it heads to its seat when it has work', () => {
    let clock = 0;
    let n = 1;
    const crowd = createCrowd({ grid, seats: layout.seats, wander: layout.wander, now: () => clock, rand: () => ((n = (n * 9301 + 49297) % 233280) / 233280) });
    clock = 60_000;
    const walker = crowd.tick();
    assert.ok(walker);
    for (let i = 0; i < 600 && crowd.walking(); i++) crowd.advance(0.1);
    crowd.setStatus('social-analyst', 'working');
    for (let i = 0; i < 600 && crowd.walking(); i++) crowd.advance(0.1);
    const a = crowd.actors.get('social-analyst');
    assert.equal(a.status, 'working');
    assert.deepEqual(a.at.map(Math.round), layout.seats.get('social-analyst').map(Math.round));
  });

  it('leaves offices without looks as they were: every real office has an empty list, or only valid looks', () => {
    for (const o of OFFICES) {
      const l = officeLayout(o, MAPS[o.map], buildGrid(MAPS[o.map]));
      for (const [who, look] of l.looks) assert.ok(Object.hasOwn(o.seats, who) && LOOKS[look], `${o.id}: ${who}`);
      if (!o.looks) assert.equal(l.looks.size, 0);
    }
  });
});

describe('drawing a looked agent (world3d.js, worldview.js)', () => {
  const src = (f) => readFileSync(new URL(`../control/world/${f}`, import.meta.url), 'utf8');

  it('3D: a looked agent is a RobotBuddy with that look, no person rig is loaded for it, and its face texture is loaded', () => {
    const s = src('world3d.js');
    assert.match(s, /const \{ [^}]*\blooks\b[^}]* \} = officeLayout/);
    assert.match(s, /names\.filter\(\(n\) => !crewBy\.has\(n\) && !looks\.has\(n\)\)/);
    assert.match(s, /\.\.\.looks\.values\(\)/);
    assert.match(s, /const look = robot\?\.look \|\| looks\.get\(name\);\s+const ch = look\s+\? new RobotBuddy\(LOOKS\[look\], \{ name, face: faces\[look\] \}\)\s+: new Character/);
  });

  it('2D: a looked agent shows badgeOf(look) instead of the Gem, and the update skips the Gem it does not have', () => {
    const s = src('worldview.js');
    assert.match(s, /looks\.has\(name\)[\s\S]{0,200}badgeOf\(looks\.get\(name\)\)/);
    assert.match(s, /a\.el\.querySelector\('\.gem'\)\) setAvatarStatus/);
  });
});
