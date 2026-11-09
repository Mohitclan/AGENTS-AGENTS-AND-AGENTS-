import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { AT_SEAT, createCrowd, officeLayout } from '../control/world/crowd.js';
import { floorsOf, MAPS, SOLID, turnOf } from '../control/world/maps.js';
import { buildGrid, clearLine, distToSegment, findPath, inBlock, pathLength, pointAlong, spotsIn, standable, stepWithin } from '../control/world/nav.js';
import { officeById, officeOf, OFFICES } from '../control/world/offices.js';
import { makeCopy } from './_helpers.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const mid = ([x1, y1, x2, y2]) => [(x1 + x2) / 2, (y1 + y2) / 2];

describe('walking on a map', () => {
  // A 1000 x 1000 room cut in two by a wall with one gap at the bottom.
  const box = { w: 1000, h: 1000, walls: [[0, -500, 0, 300]] };
  const grid = buildGrid(box);

  it('measures the distance to a wall segment, and blocks cells next to a wall', () => {
    assert.equal(distToSegment(10, 0, [0, -500, 0, 300]), 10);
    assert.equal(distToSegment(0, 400, [0, -500, 0, 300]), 100);
    assert.equal(grid.isFree(...grid.toCell(5, 0)), false);
    assert.equal(grid.isFree(...grid.toCell(200, 0)), true);
    assert.equal(clearLine(grid, [-200, 0], [200, 0]), false, 'the wall is in the way');
    assert.equal(clearLine(grid, [-200, 400], [200, 400]), true, 'the gap is clear');
  });

  it('walks around the wall through the gap, never through it', () => {
    const path = findPath(grid, [-200, -300], [200, -300]);
    assert.ok(path, 'there is a way');
    assert.deepEqual(path[0], [-200, -300]);
    assert.deepEqual(path.at(-1), [200, -300]);
    assert.ok(path.some(([, y]) => y > 300), 'it goes down to the gap');
    for (let i = 1; i < path.length; i++) assert.ok(clearLine(grid, path[i - 1], path[i]), `leg ${i} crosses no wall`);
    assert.ok(pathLength(path) > 1200, 'longer than the straight line through the wall');
    assert.deepEqual(pointAlong([[0, 0], [100, 0]], 30), [30, 0]);
  });

  it('finds no way into a sealed box', () => {
    const sealed = buildGrid({ w: 1000, h: 1000, walls: [[-100, -100, 100, -100], [100, -100, 100, 100], [100, 100, -100, 100], [-100, 100, -100, -100]] });
    assert.equal(findPath(sealed, [-400, -400], [0, 0]), null);
  });

  it('spreads standing places over a room, on free floor', () => {
    const spots = spotsIn(grid, [-480, -480, -60, 480], 4);
    assert.equal(spots.length, 4);
    for (const s of spots) assert.ok(grid.isFree(...grid.toCell(...s)));
    assert.ok(Math.max(...spots.map((s) => s[1])) - Math.min(...spots.map((s) => s[1])) > 300, 'not all on one row');
  });
});

describe('who walks where (crowd.js)', () => {
  const map = MAPS['campus-blue'];
  const office = officeById('sales');
  const grid = buildGrid(map);
  const { seats, wander } = officeLayout(office, map, grid);

  it('gives every agent of the office a seat inside its own room, and break spots to wander to', () => {
    assert.equal(seats.size, Object.keys(office.seats).length);
    for (const [agent, [x, y]] of seats) {
      const [x1, y1, x2, y2] = map.rooms.find((r) => r.id === office.seats[agent]).box;
      assert.ok(x >= x1 && x <= x2 && y >= y1 && y <= y2, `${agent} sits in ${office.seats[agent]}`);
    }
    assert.ok(wander.length >= 6);
  });

  it('lets idle agents wander one at a time, never more than allowed, and sends anyone given work back to its seat', () => {
    let clock = 0;
    let n = 0;
    const crowd = createCrowd({ grid, seats, wander, maxWalking: 2, now: () => clock, rand: () => ((n = (n * 9301 + 49297) % 233280) / 233280) });
    clock = 60_000; // past everyone's first wait
    const first = crowd.tick();
    assert.ok(first, 'an idle agent gets up');
    assert.ok(crowd.tick());
    assert.equal(crowd.tick(), null, 'no more than two walking');
    // Give the first walker work: it turns round for its seat at once.
    crowd.setStatus(first, 'working');
    assert.ok(AT_SEAT.has('working'));
    assert.deepEqual(crowd.actors.get(first).target, seats.get(first));
    for (let i = 0; i < 400 && crowd.walking(); i++) crowd.advance(0.1);
    const a = crowd.actors.get(first);
    assert.equal(a.path, null);
    assert.ok(a.atSeat, 'back at its seat');
    assert.ok(Math.hypot(a.at[0] - seats.get(first)[0], a.at[1] - seats.get(first)[1]) < 1);
    // A working agent never wanders.
    clock += 1e9;
    for (let i = 0; i < 30; i++) {
      const who = crowd.tick();
      assert.notEqual(who, first);
      for (let j = 0; j < 400 && crowd.walking(); j++) crowd.advance(0.1);
    }
  });
});

describe('furniture and the visitor on foot', () => {
  // A 1000 x 1000 room with a desk in the middle, turned a quarter.
  const room = { w: 1000, h: 1000, walls: [[-500, -500, 500, -500], [500, -500, 500, 500], [500, 500, -500, 500], [-500, 500, -500, -500]], blocks: [{ at: [0, 0], size: [400, 100], turn: 90 }] };

  it('turns a footprint clockwise on the map, and keeps walkers off it', () => {
    assert.equal(turnOf('right'), 270);
    assert.equal(turnOf(45), 45);
    assert.ok(inBlock(0, 150, room.blocks[0]), 'turned a quarter, the long side runs down the map');
    assert.ok(!inBlock(150, 0, room.blocks[0]));
    const grid = buildGrid(room);
    assert.equal(grid.isFree(...grid.toCell(0, 0)), false);
    const path = findPath(grid, [-300, 0], [300, 0]);
    assert.ok(path && path.some(([, y]) => Math.abs(y) > 200), 'walks round the desk');
  });

  it('lets a visitor walk, slide along a wall, and never pass through a wall or a desk', () => {
    assert.ok(standable(room, -300, 0));
    assert.ok(!standable(room, -490, 0), 'too close to the wall');
    assert.ok(!standable(room, 0, 100), 'on the desk');
    assert.deepEqual(stepWithin(room, [-300, 0], [10, 0]), [-290, 0]);
    // Into the wall at a slant: it slides along it instead of stopping dead.
    assert.deepEqual(stepWithin(room, [-470, 0], [-10, 10]), [-470, 10]);
    // Walking hard at the desk for a long while never gets onto it.
    let at = [-300, 120];
    for (let i = 0; i < 200; i++) at = stepWithin(room, at, [15, 0]);
    assert.ok(!inBlock(...at, room.blocks[0]), `stopped at ${at}`);
    assert.ok(at[0] < -60);
  });
});

describe('the office maps', () => {
  const kit = readFileSync(join(ROOT, 'scripts', 'control', 'world', 'props3d.js'), 'utf8');
  const kinds = new Set([...kit.matchAll(/^ {4}(\w+)\(g, p/gm)].map((m) => m[1]));
  for (const [id, map] of Object.entries(MAPS)) {
    it(`${id}: its pictures exist, its rooms are inside it, and every room can reach the meeting room`, () => {
      for (const file of [...floorsOf(map).map((f) => f.image), map.thumb]) assert.ok(existsSync(join(ROOT, 'scripts', 'control', file)), file);
      assert.ok(map.walls.length > 10);
      const meet = map.rooms.filter((r) => r.kind === 'meet');
      assert.equal(meet.length, 1, 'one meeting room');
      assert.ok(map.rooms.some((r) => r.kind === 'break'), 'a break room');
      const grid = buildGrid(map);
      for (const r of map.rooms) {
        const [x1, y1, x2, y2] = r.box;
        assert.ok(x1 < x2 && y1 < y2 && x1 >= -map.w / 2 && x2 <= map.w / 2 && y1 >= -map.h / 2 && y2 <= map.h / 2, `${r.id} box`);
        const spots = spotsIn(grid, r.box, 4);
        assert.ok(spots.length >= 4, `${r.id} has room for four`);
        assert.ok(findPath(grid, spots[0], mid(meet[0].box)), `${r.id} reaches ${meet[0].id}`);
      }
    });
  }

  for (const [id, map] of Object.entries(MAPS).filter(([, m]) => m.floors)) {
    it(`${id}: its pictures meet without gaps, its furniture can be built, and every seat is on open floor a visitor can walk to`, () => {
      for (const f of map.floors) {
        const [x1, y1, x2, y2] = f.box;
        assert.ok(x1 >= -map.w / 2 - 1 && x2 <= map.w / 2 + 1 && y1 >= -map.h / 2 - 1 && y2 <= map.h / 2 + 1, `${f.image} lies on the map`);
      }
      for (const p of map.props) assert.ok(kinds.has(p.k), `props3d.js builds a ${p.k}`);
      assert.equal(map.blocks.length, map.props.filter((p) => SOLID.has(p.k)).length);
      const grid = buildGrid(map);
      assert.ok(map.entrance && standable(map, ...map.entrance.at), 'a visitor can stand at the way in');
      for (const s of map.seats) {
        assert.ok(map.rooms.some((r) => r.id === s.room), `${s.room} exists`);
        assert.ok(standable(map, ...s.at, 10), `the seat at ${s.at} in ${s.room} is clear of walls and desks`);
        assert.ok(findPath(grid, map.entrance.at, s.at), `the seat at ${s.at} can be walked to`);
      }
      // A visitor on foot reaches every named room from the way in (a flood fill over the floor, in 10-unit steps).
      const seen = new Set([map.entrance.at.map((v) => Math.round(v / 10)).join()]);
      const todo = [map.entrance.at.map((v) => Math.round(v / 10) * 10)];
      while (todo.length) {
        const [x, y] = todo.pop();
        for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
          const k = `${(x + dx) / 10},${(y + dy) / 10}`;
          if (!seen.has(k) && standable(map, x + dx, y + dy)) {
            seen.add(k);
            todo.push([x + dx, y + dy]);
          }
        }
      }
      const reached = [...seen].map((k) => k.split(',').map((v) => Number(v) * 10));
      for (const r of map.rooms) assert.ok(reached.some(([x, y]) => x >= r.box[0] && x <= r.box[2] && y >= r.box[1] && y <= r.box[3]), `a visitor can walk into ${r.id}`);
    });
  }
});

describe('the offices', () => {
  it('seat every agent of the team exactly once, in rooms that exist', () => {
    const agents = readdirSync(join(ROOT, '.claude', 'agents')).filter((f) => f.endsWith('.md') && !f.endsWith('-fallback.md')).map((f) => f.replace(/\.md$/, ''));
    for (const a of agents) assert.equal(OFFICES.filter((o) => Object.hasOwn(o.seats, a)).length, 1, `${a} has one seat`);
    assert.equal(officeOf('lead-generator').id, 'sales');
    for (const o of OFFICES) {
      const map = MAPS[o.map];
      assert.ok(map, `${o.id} map`);
      const rooms = new Set(map.rooms.map((r) => r.id));
      for (const [agent, room] of Object.entries(o.seats)) assert.ok(rooms.has(room), `${o.id}: ${agent} sits in ${room}`);
      for (const p of o.planned) assert.ok(rooms.has(p.room), `${o.id}: ${p.role} sits in ${p.room}`);
      assert.ok(Object.keys(o.seats).length || o.planned.length, `${o.id} has a team or planned seats`);
    }
  });

  it('are the three the founders asked for, each on its own map', () => {
    assert.deepEqual(OFFICES.map((o) => o.id), ['sales', 'developer', 'social']);
    assert.equal(new Set(OFFICES.map((o) => o.map)).size, 3);
    assert.equal(officeById('nope'), null);
    assert.deepEqual(OFFICES.filter((o) => o.view3d).map((o) => o.id), ['sales', 'developer', 'social'], 'every office can be seen in 3D');
  });
});

describe('the offices on mission control', () => {
  const repo = makeCopy();
  let base;
  let child;
  before(async () => {
    child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: { ...process.env, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => {
    child?.kill();
    repo.remove();
  });

  it('serves the map code, its stylesheet and the pictures', async () => {
    for (const f of ['world/worldview.js', 'world/world3d.js', 'world/props3d.js', 'world/crowd.js', 'world/nav.js', 'world/maps.js', 'world/offices.js', 'world/world.css']) assert.equal((await fetch(`${base}/${f}`)).status, 200, f);
    for (const f of ['dev-floor', 'dev-boardroom', 'social-office', 'social-neon']) assert.equal((await fetch(`${base}/assets/world/${f}.jpg`)).status, 200, f);
    const pic = await fetch(`${base}/assets/world/campus-blue.jpg`);
    assert.equal(pic.status, 200);
    assert.equal(pic.headers.get('content-type'), 'image/jpeg');
    assert.equal((await fetch(`${base}/assets/world/../app.js`)).status, 404);
    assert.match(await (await fetch(`${base}/`)).text(), /<link rel="stylesheet" href="\/world\/world\.css">/);
  });
});
