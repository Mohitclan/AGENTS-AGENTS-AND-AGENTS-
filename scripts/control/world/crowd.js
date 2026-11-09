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
import { findPath, pathLength, pointAlong, spotsIn } from './nav.js';

// Where seats go in a room: its middle, leaving the top edge (walls and furniture) and the bottom edge (the label).
export const inner = ([x1, y1, x2, y2]) => [x1 + 50, y1 + 80, x2 - 50, y2 - 90];

// An office's seats (agent -> point, spread over its room), the seats of roles planned but not yet filled
// ([{ role, at }]), and the spots idle agents wander to (in its break and meeting rooms).
export function officeLayout(office, map, grid) {
  const rooms = new Map(map.rooms.map((r) => [r.id, r]));
  const byRoom = new Map();
  for (const [agent, room] of Object.entries(office.seats)) {
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room).push(agent);
  }
  const seats = new Map();
  for (const [room, agents] of byRoom) {
    const spots = spotsIn(grid, inner(rooms.get(room).box), agents.length, 130);
    agents.forEach((a, i) => seats.set(a, spots[i] || spots[0]));
  }
  const plannedBy = new Map();
  for (const p of office.planned || []) {
    if (!rooms.has(p.room)) continue;
    if (!plannedBy.has(p.room)) plannedBy.set(p.room, []);
    plannedBy.get(p.room).push(p.role);
  }
  const planned = [];
  for (const [room, roles] of plannedBy) {
    const spots = spotsIn(grid, inner(rooms.get(room).box), roles.length, 130);
    roles.forEach((role, i) => planned.push({ role, at: spots[i] || spots[0] }));
  }
  const wander = map.rooms.filter((r) => r.kind === 'break' || r.kind === 'meet').flatMap((r) => spotsIn(grid, inner(r.box), 6, 110));
  return { seats, planned, wander };
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
