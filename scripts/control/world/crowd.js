// Who walks where in an office, for both views of it (the 2D map and the 3D office). An agent with work sits at its
// own seat; an idle agent now and then gets up and goes to a free spot in a break or meeting room, then back. The
// views only draw what this decides. Positions are in map units (maps.js); paths come from nav.js.
//
//   const crowd = createCrowd({ grid, seats, wander })
//   crowd.setStatus(name, status)   what the agent is doing now (an agent with work heads back to its seat)
//   crowd.tick()                    now and then starts one idle walk (call about once a second)
//   crowd.advance(seconds)          moves the walkers; returns the names that arrived
//   crowd.actors                    name -> { at, heading, path, status, atSeat }
//
// No browser code here, so it is tested directly.
import { LOOKS, crewKey } from './crew.js';
import { findPath, pathLength, pointAlong, spotsIn } from './nav.js';

// Where seats go in a room: its middle, leaving the top edge (walls and furniture) and the bottom edge (the label).
// A small room keeps less of an edge.
export const inner = ([x1, y1, x2, y2]) => {
  const side = Math.min(50, (x2 - x1) * 0.15);
  return [x1 + side, y1 + Math.min(80, (y2 - y1) * 0.2), x2 - side, y2 - Math.min(90, (y2 - y1) * 0.2)];
};

// An office's seats (agent -> point), how each one is sat on (agent -> { face, chair, fixed }), the seats of roles
// planned but not yet filled ([{ role, at, face, chair, fixed }]), the spots idle agents wander to (in its break and
// meeting rooms), and which of those spots are chairs to sit on (perches: "x,y" -> face). An office's robot crew
// (offices.js `crew`) sits in its planned roles' seats: each robot is in `seats` and `how` under crewKey(id), listed
// in `crew`, and its role is no longer an empty planned seat. `looks` (agent -> look) lists the real agents whose office
// gives them a robot look (offices.js `looks`); an unknown look is ignored, so the agent keeps its usual picture. A room's seats are the chairs drawn on its map (maps.js `seats`), in order; when a room
// has more people than chairs, or none drawn, the rest are spread over the room and get a desk of their own in 3D.
export function officeLayout(office, map, grid) {
  const rooms = new Map(map.rooms.map((r) => [r.id, r]));
  const own = (map.seats || []).filter((s) => !s.perch);
  const perches = (map.seats || []).filter((s) => s.perch);
  const placesIn = (room, n) => {
    const fixed = own.filter((s) => s.room === room).slice(0, n).map((s) => ({ at: s.at, face: s.face ?? 0, chair: s.chair || 'office', fixed: true }));
    const spread = n > fixed.length ? spotsIn(grid, inner(rooms.get(room).box), n - fixed.length, 130) : [];
    const rest = Array.from({ length: n - fixed.length }, (_, i) => ({ at: spread[i] || spread[0] || fixed[0]?.at, face: 0, chair: 'office', fixed: false }));
    return [...fixed, ...rest];
  };
  const byRoom = (pairs) => {
    const out = new Map();
    for (const [who, room] of pairs) {
      if (!rooms.has(room)) continue;
      if (!out.has(room)) out.set(room, []);
      out.get(room).push(who);
    }
    return out;
  };
  const seats = new Map();
  const how = new Map();
  for (const [room, agents] of byRoom(Object.entries(office.seats))) {
    placesIn(room, agents.length).forEach((place, i) => {
      seats.set(agents[i], place.at);
      how.set(agents[i], place);
    });
  }
  const planned = [];
  const crew = [];
  const robotFor = new Map((office.crew || []).map((c) => [c.role, c]));
  for (const [room, roles] of byRoom((office.planned || []).map((p) => [p.role, p.room]))) {
    placesIn(room, roles.length).forEach((place, i) => {
      const robot = robotFor.get(roles[i]);
      if (!robot) return planned.push({ role: roles[i], ...place });
      const key = crewKey(robot.id);
      seats.set(key, place.at);
      how.set(key, place);
      crew.push({ key, ...robot });
      return undefined;
    });
  }
  const wander = map.rooms.filter((r) => r.kind === 'break' || r.kind === 'meet').flatMap((r) => spotsIn(grid, inner(r.box), 6, 110));
  wander.push(...perches.map((p) => p.at));
  const looks = new Map(Object.entries(office.looks || {}).filter(([who, look]) => seats.has(who) && Object.hasOwn(LOOKS, look)));
  return { seats, how, planned, crew, looks, wander, perches: new Map(perches.map((p) => [p.at.join(), p.face])) };
}

// Where an office pet may trot to: a few spots in every named room.
export const petPlaces = (map, grid) => map.rooms.filter((r) => r.kind !== 'other').flatMap((r) => spotsIn(grid, inner(r.box), 3, 120));

export const AT_SEAT = new Set(['working', 'researching', 'waiting', 'error', 'success']);
export const SPEED = 140; // map units per second: about a walking pace when 100 units are a metre

export function createCrowd({ grid, seats, wander = [], maxWalking = 3, dwell = [8000, 20000], speed = SPEED, rand = Math.random, now = () => Date.now() }) {
  const actors = new Map();
  for (const [name, seat] of seats) {
    actors.set(name, { name, at: [...seat], heading: [0, 1], path: null, total: 0, walked: 0, status: 'idle', target: [...seat], atSeat: true, until: now() + 2000 + rand() * 8000 });
  }
  const same = (a, b) => Math.abs(a[0] - b[0]) < 1 && Math.abs(a[1] - b[1]) < 1;
  const settled = new Set(); // stopped without walking (a walk cancelled where it began): reported by advance()

  // Sends an agent to a point. Returns false when it is already there or there is no way.
  function walk(a, to) {
    if (same(a.at, to)) {
      if (a.path) settled.add(a.name); // it was about to leave: it stays, and the views hear that it has arrived
      a.path = null;
      a.target = [...to];
      a.atSeat = same(to, seats.get(a.name));
      return false;
    }
    const path = findPath(grid, a.at, to);
    if (!path) return false;
    a.path = path;
    a.total = pathLength(path);
    a.walked = 0;
    a.target = [...to];
    a.atSeat = false;
    return true;
  }

  return {
    actors,
    setStatus(name, status) {
      const a = actors.get(name);
      if (!a) return;
      a.status = status;
      // Work waits for no one: an agent away from its seat goes straight back, even mid-walk.
      if (AT_SEAT.has(status) && !same(a.target, seats.get(name))) walk(a, seats.get(name));
    },
    tick() {
      const t = now();
      if ([...actors.values()].filter((a) => a.path).length >= maxWalking) return null;
      const ready = [...actors.values()].filter((a) => !AT_SEAT.has(a.status) && !a.path && t >= a.until);
      if (!ready.length) return null;
      const a = ready[Math.floor(rand() * ready.length)];
      a.until = t + dwell[0] + rand() * (dwell[1] - dwell[0]);
      const seat = seats.get(a.name);
      // Away from its seat: half the time it goes back. Otherwise to a spot nobody else is heading for.
      const taken = new Set([...actors.values()].filter((b) => b !== a).map((b) => b.target.join()));
      const free = wander.filter((p) => !taken.has(p.join()) && !same(p, a.at));
      const goHome = !same(a.at, seat) && rand() < 0.5;
      const to = goHome || !free.length ? seat : free[Math.floor(rand() * free.length)];
      return walk(a, to) ? a.name : null;
    },
    advance(dt) {
      const arrived = [...settled];
      settled.clear();
      for (const a of actors.values()) {
        if (!a.path) continue;
        a.walked = Math.min(a.total, a.walked + speed * dt);
        const p = pointAlong(a.path, a.walked);
        if (Math.hypot(p[0] - a.at[0], p[1] - a.at[1]) > 0.01) a.heading = [p[0] - a.at[0], p[1] - a.at[1]];
        a.at = p;
        if (a.walked >= a.total) {
          a.path = null;
          a.atSeat = same(a.at, seats.get(a.name));
          arrived.push(a.name);
        }
      }
      return arrived;
    },
    walking: () => [...actors.values()].some((a) => a.path),
  };
}
