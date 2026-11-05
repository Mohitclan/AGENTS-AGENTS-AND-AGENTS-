// The 3D office floor plan, in metres. Plain data with no Three.js, so the navigation grid, the
// behaviour rules and the tests all read the same plan the scene is built from.
//
// The room runs x -12..12 (left to right as the camera sees it) and z -8..8 (back wall to the open
// front). Yaw is the direction a character faces: 0 looks toward the camera (+z), PI toward the back
// wall, PI/2 toward +x.

export const ROOM = { minX: -12, maxX: 12, minZ: -8, maxZ: 8, wallHeight: 3.4 };
export const AGENT_RADIUS = 0.3;
export const yawTo = (dx, dz) => Math.atan2(dx, dz);

// Workstations: two benches with seats on both sides. North seats face the camera, south seats
// face the back wall. Each agent has its own seat; the approach point is beside the chair, where a
// character stands before it sits.
const BENCHES = [
  { id: 'bench-a', x: -5.2, z: -3.6, w: 7.4, d: 1.5 },
  { id: 'bench-b', x: -5.2, z: 1.6, w: 7.4, d: 1.5 },
];
const SEAT_ROWS = [
  { bench: 0, side: 'north', xs: [-7.6, -5.2, -2.8], agents: ['researcher', 'coordinator', 'lead-generator'] },
  { bench: 0, side: 'south', xs: [-7.6, -5.2, -2.8], agents: ['knowledge-base', 'evaluator', 'outreach'] },
  { bench: 1, side: 'north', xs: [-7.6, -5.2, -2.8], agents: ['marketing', 'developer', 'sales'] },
  { bench: 1, side: 'south', xs: [-6.4, -4.0], agents: ['docs-handler', 'demo-handler'] },
];

function buildDesks() {
  const desks = [];
  for (const row of SEAT_ROWS) {
    const b = BENCHES[row.bench];
    const north = row.side === 'north';
    const z = north ? b.z - b.d / 2 - 0.55 : b.z + b.d / 2 + 0.55;
    row.xs.forEach((x, i) => {
      const agent = row.agents[i];
      // Approach from the side away from the bench centre, so neighbours don't share an approach.
      const side = x < b.x ? -1 : 1;
      desks.push({
        agent,
        bench: b.id,
        seat: { x, z, yaw: north ? 0 : Math.PI },
        approach: { x: x + side * 0.72, z },
        monitor: { x, z: north ? b.z - 0.2 : b.z + 0.2, yaw: north ? Math.PI : 0 },
      });
    });
  }
  return desks;
}

export const DESKS = buildDesks();
export const deskFor = (agent) => DESKS.find((d) => d.agent === agent) || null;

// Armchairs in the lounge, west of the low table, facing it. The character stands beside one, then sits.
export const ARMCHAIRS = [
  { x: 7.95, z: 2.55 },
  { x: 7.95, z: 3.95 },
];
function ARMCHAIR_SPOTS() {
  return ARMCHAIRS.map((c, i) => ({
    id: `armchair-${i + 1}`, kind: 'lounge', x: c.x, z: c.z, yaw: Math.PI / 2, sit: true,
    approach: { x: c.x, z: c.z + (i === 0 ? -0.85 : 0.85) },
  }));
}

// The music speaker stands at the back edge of the rug; while it plays, agents with no work dance in a ring
// in the middle of the rug: four close in, eight further out, each facing the middle.
export const SPEAKER = { x: 2.5, z: 0.05, r: 0.36 };
export const DANCE_FLOOR = { x: 2.5, z: 2.6 };
function DANCE_RING() {
  const ring = [];
  [[1.0, 4, Math.PI / 4], [1.85, 8, Math.PI / 8]].forEach(([r, n, turn]) => {
    for (let i = 0; i < n; i++) {
      const a = turn + (i * Math.PI * 2) / n;
      const x = DANCE_FLOOR.x + Math.sin(a) * r;
      const z = DANCE_FLOOR.z + Math.cos(a) * r;
      ring.push({ id: `dance-${ring.length + 1}`, kind: 'dance', x, z, yaw: yawTo(DANCE_FLOOR.x - x, DANCE_FLOOR.z - z) });
    }
  });
  return ring;
}

// Places agents go to that are not their own desk. `kind` says which activity uses the spot;
// `cap` is 1 for every spot, so two agents never stand in the same place.
export const SPOTS = [
  // coffee station: stand at the counter, facing the machine and the mugs
  { id: 'coffee-1', kind: 'coffee', x: 8.5, z: -6.5, yaw: Math.PI, mug: { x: 8.9, z: -7.55 } },
  { id: 'coffee-2', kind: 'coffee', x: 10.0, z: -6.5, yaw: Math.PI, mug: { x: 10.2, z: -7.55 } },
  // windows: stand and look out at the city
  { id: 'window-1', kind: 'window', x: -10.0, z: -7.0, yaw: Math.PI },
  { id: 'window-2', kind: 'window', x: -6.2, z: -7.0, yaw: Math.PI + 0.25 },
  { id: 'window-3', kind: 'window', x: -1.4, z: -7.0, yaw: Math.PI - 0.2 },
  { id: 'window-4', kind: 'window', x: 5.8, z: -7.0, yaw: Math.PI },
  // sofa: sit, facing into the room
  { id: 'sofa-1', kind: 'lounge', x: 10.95, z: 2.15, yaw: -Math.PI / 2, sit: true, approach: { x: 10.25, z: 2.15 } },
  { id: 'sofa-2', kind: 'lounge', x: 10.95, z: 3.25, yaw: -Math.PI / 2, sit: true, approach: { x: 10.25, z: 3.25 } },
  { id: 'sofa-3', kind: 'lounge', x: 10.95, z: 4.35, yaw: -Math.PI / 2, sit: true, approach: { x: 10.25, z: 4.35 } },
  // standing meeting table: four places around it, facing the middle
  ...[0, 1, 2, 3].map((i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const c = { x: 6.4, z: -2.3 };
    const x = c.x + Math.sin(a) * 1.2;
    const z = c.z + Math.cos(a) * 1.2;
    return { id: `meet-${i + 1}`, kind: 'meeting', x, z, yaw: yawTo(c.x - x, c.z - z) };
  }),
  // the central shared area on the rug, for a quick word standing up
  { id: 'huddle-1', kind: 'huddle', x: 1.9, z: 2.2, yaw: yawTo(0.9, 0.5) },
  { id: 'huddle-2', kind: 'huddle', x: 3.0, z: 2.7, yaw: yawTo(-0.9, -0.5) },
  // the dance floor: a ring round the middle of the rug, facing in, used while the speaker plays music
  ...DANCE_RING(),
  // the task display on the back wall, where the coordinator plans and briefs
  { id: 'board', kind: 'board', x: 2.6, z: -6.5, yaw: Math.PI },
  { id: 'brief', kind: 'brief', x: 3.7, z: -6.2, yaw: Math.PI - 0.35 },
  // the "Needs you" tray at the front, where approvals are dropped off
  { id: 'tray', kind: 'tray', x: 0.6, z: 5.0, yaw: 0 },
  // two armchairs facing the lounge table
  ...ARMCHAIR_SPOTS(),
  // the bookshelves on the left wall: stand and browse
  { id: 'shelf-1', kind: 'shelf', x: -10.85, z: -5.9, yaw: -Math.PI / 2, look: { x: -11.6, y: 1.2, z: -5.9 } },
  { id: 'shelf-2', kind: 'shelf', x: -10.85, z: -4.7, yaw: -Math.PI / 2, look: { x: -11.6, y: 0.9, z: -4.7 } },
  { id: 'shelf-3', kind: 'shelf', x: -10.85, z: 2.8, yaw: -Math.PI / 2, look: { x: -11.6, y: 1.1, z: 2.8 } },
  { id: 'shelf-4', kind: 'shelf', x: -10.85, z: 4.0, yaw: -Math.PI / 2, look: { x: -11.6, y: 1.4, z: 4.0 } },
  // waypoints for a stroll round the office: an idle agent walks a few of these, pausing at each
  ...[[-9.8, -6.4], [-4.0, -6.3], [0.6, -5.6], [4.3, -5.2], [8.6, -4.6], [4.2, -0.4], [0.4, -0.6], [1.0, 3.6], [4.5, 4.6], [6.5, 6.2], [-2.0, 5.6], [-6.0, 5.4], [-10.0, 0.2], [-9.9, 6.0]]
    .map(([x, z], i) => ({ id: `stroll-${i + 1}`, kind: 'stroll', x, z, yaw: yawTo(-x, -z) })),
];
export const spot = (id) => SPOTS.find((s) => s.id === id) || null;

// Furniture: what the scene draws, and what blocks walking. Boxes are axis-aligned footprints
// (x, z centre, w along x, d along z); circles have a radius.
export const MEETING_TABLE = { x: 6.4, z: -2.3, r: 0.6 };
export const COUNTER = { x: 9.4, z: -7.55, w: 4.4, d: 0.7 };
export const SOFA = { x: 11.35, z: 3.25, w: 1.0, d: 3.6 };
export const LOUNGE_TABLE = { x: 9.35, z: 3.25, w: 0.9, d: 1.5 };
export const TRAY = { x: 0.6, z: 5.7, r: 0.3 };
export const DISPLAY = { x: 2.6, y: 1.95, w: 3.6, h: 2.0 };
export const BOOKSHELVES = [
  { x: -11.7, z: -5.3, w: 0.4, d: 2.6 },
  { x: -11.7, z: 3.4, w: 0.4, d: 2.6 },
];
export const PLANTS = [
  { x: -11.2, z: -7.3, r: 0.35, h: 1.6 },
  { x: 0.9, z: -7.35, r: 0.3, h: 1.3 },
  { x: 6.8, z: -7.35, r: 0.3, h: 1.4 },
  { x: 11.35, z: 6.6, r: 0.4, h: 1.7 },
  { x: -0.5, z: 1.6, r: 0.35, h: 1.2 },
  { x: -11.2, z: 6.9, r: 0.35, h: 1.5 },
];
export const RUG = { x: 2.5, z: 2.4, w: 5.4, d: 4.2 };
export const WINDOWS = [
  { x0: -11.4, x1: 0.4 },
  { x0: 4.8, x1: 6.9 },
];

export const BENCH_BOXES = BENCHES;

export function obstacles() {
  const boxes = [];
  const circles = [];
  for (const b of BENCHES) boxes.push({ x: b.x, z: b.z, w: b.w, d: b.d });
  for (const d of DESKS) boxes.push({ x: d.seat.x, z: d.seat.z, w: 0.6, d: 0.6, chair: d.agent });
  boxes.push(COUNTER, SOFA, LOUNGE_TABLE, ...BOOKSHELVES, ...ARMCHAIRS.map((c) => ({ x: c.x, z: c.z, w: 0.8, d: 0.8, chair: 'armchair' })));
  circles.push(MEETING_TABLE, TRAY, SPEAKER, ...PLANTS);
  return { boxes, circles };
}

// Where a character stands at a place: a desk's approach point, a sofa's approach, or the spot.
export const standPoint = (place) => place.approach || place;
