// Walking without going through furniture: a floor grid with every footprint grown by the
// character's radius, A* over it, and string-pulling so a path is a few straight legs, not a
// staircase. No Three.js here; the tests check paths against the same grid.

import { AGENT_RADIUS, obstacles, ROOM } from './layout.js';

export const CELL = 0.2;

export function buildGrid({ room = ROOM, radius = AGENT_RADIUS, cell = CELL, extra = obstacles() } = {}) {
  const cols = Math.round((room.maxX - room.minX) / cell);
  const rows = Math.round((room.maxZ - room.minZ) / cell);
  const blocked = new Uint8Array(cols * rows);
  const wall = 0.1 + radius; // walls are 0.1 m into the room
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = room.minX + (c + 0.5) * cell;
      const z = room.minZ + (r + 0.5) * cell;
      let hit = x < room.minX + wall || x > room.maxX - wall || z < room.minZ + wall || z > room.maxZ - 0.2;
      for (const b of extra.boxes) {
        if (hit) break;
        hit = Math.abs(x - b.x) < b.w / 2 + radius && Math.abs(z - b.z) < b.d / 2 + radius;
      }
      for (const o of extra.circles) {
        if (hit) break;
        hit = Math.hypot(x - o.x, z - o.z) < o.r + radius;
      }
      blocked[r * cols + c] = hit ? 1 : 0;
    }
  }
  const toCell = (x, z) => [Math.floor((x - room.minX) / cell), Math.floor((z - room.minZ) / cell)];
  const toPoint = (c, r) => ({ x: room.minX + (c + 0.5) * cell, z: room.minZ + (r + 0.5) * cell });
  const inside = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows;
  const isBlocked = (c, r, dyn) => !inside(c, r) || blocked[r * cols + c] === 1 || (dyn ? dyn.has(r * cols + c) : false);
  return { cols, rows, cell, room, blocked, toCell, toPoint, inside, isBlocked, walkable: (x, z) => !isBlocked(...toCell(x, z)) };
}

// Cells around other characters who are standing still, so a path goes round them.
export function blockAround(grid, points, radius = AGENT_RADIUS * 2) {
  const set = new Set();
  const n = Math.ceil(radius / grid.cell);
  for (const p of points) {
    const [pc, pr] = grid.toCell(p.x, p.z);
    for (let dr = -n; dr <= n; dr++) {
      for (let dc = -n; dc <= n; dc++) {
        const c = pc + dc;
        const r = pr + dr;
        if (!grid.inside(c, r)) continue;
        const q = grid.toPoint(c, r);
        if (Math.hypot(q.x - p.x, q.z - p.z) < radius) set.add(r * grid.cols + c);
      }
    }
  }
  return set;
}

function nearestOpen(grid, c, r, dyn) {
  if (!grid.isBlocked(c, r, dyn)) return [c, r];
  for (let d = 1; d < 12; d++) {
    for (let dr = -d; dr <= d; dr++) {
      for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        if (!grid.isBlocked(c + dc, r + dr, dyn)) return [c + dc, r + dr];
      }
    }
  }
  return null;
}

// Straight walk between two points without crossing a blocked cell (sampled every quarter cell,
// so a leg can't clip the corner of a desk between two samples).
export function clearLine(grid, a, b, dyn) {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(dist / (grid.cell * 0.25)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [c, r] = grid.toCell(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
    if (grid.isBlocked(c, r, dyn)) return false;
  }
  return true;
}

// A binary min-heap of [col, row, priority], so a search over the whole floor stays fast.
class Heap {
  constructor() {
    this.items = [];
  }
  get size() {
    return this.items.length;
  }
  push(c, r, f) {
    const a = this.items;
    a.push([c, r, f]);
    let i = a.length - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (a[up][2] <= a[i][2]) break;
      [a[up], a[i]] = [a[i], a[up]];
      i = up;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const end = a.pop();
    if (a.length) {
      a[0] = end;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][2] < a[m][2]) m = l;
        if (r < a.length && a[r][2] < a[m][2]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

// A* with 8 neighbours (no corner cutting), then string-pulled. Returns points from start to goal,
// or null when the goal can't be reached. `dyn` is an optional set of extra blocked cells.
export function findPath(grid, from, to, dyn = null) {
  const start = nearestOpen(grid, ...grid.toCell(from.x, from.z), dyn);
  const goal = nearestOpen(grid, ...grid.toCell(to.x, to.z), dyn);
  if (!start || !goal) return null;
  const { cols } = grid;
  const key = (c, r) => r * cols + c;
  const g = new Map([[key(...start), 0]]);
  const came = new Map();
  const open = new Heap();
  open.push(start[0], start[1], 0);
  const h = (c, r) => {
    const dx = Math.abs(c - goal[0]);
    const dz = Math.abs(r - goal[1]);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  const closed = new Set();
  let found = false;
  while (open.size) {
    const [c, r] = open.pop();
    const k = key(c, r);
    if (closed.has(k)) continue;
    closed.add(k);
    if (c === goal[0] && r === goal[1]) {
      found = true;
      break;
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (grid.isBlocked(nc, nr, dyn)) continue;
        if (dc && dr && (grid.isBlocked(c + dc, r, dyn) || grid.isBlocked(c, r + dr, dyn))) continue;
        const nk = key(nc, nr);
        const cost = g.get(k) + (dc && dr ? Math.SQRT2 : 1);
        if (cost < (g.get(nk) ?? Infinity)) {
          g.set(nk, cost);
          came.set(nk, k);
          open.push(nc, nr, cost + h(nc, nr));
        }
      }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = key(...goal); k !== undefined; k = came.get(k)) cells.push(grid.toPoint(k % cols, Math.floor(k / cols)));
  cells.reverse();
  // String-pull: keep a point only when the straight line past it would hit something.
  const pts = [{ x: from.x, z: from.z }];
  let anchor = pts[0];
  for (let i = 1; i < cells.length; i++) {
    if (!clearLine(grid, anchor, cells[i], dyn)) {
      anchor = cells[i - 1];
      pts.push(anchor);
    }
  }
  const end = grid.walkable(to.x, to.z) ? { x: to.x, z: to.z } : cells[cells.length - 1];
  if (!clearLine(grid, pts[pts.length - 1], end, dyn)) pts.push(cells[cells.length - 1]);
  pts.push(end);
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z) > 0.05);
}

export const pathLength = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z) : 0), 0);
