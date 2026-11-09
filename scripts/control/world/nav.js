// Walking on an office map: which places an agent can stand on, and the way from one place to another around the
// walls and the furniture. A map's walls are line segments in map units, with (0, 0) at the centre of the map (the
// format the Nonilion maps use); its blocks are furniture footprints (maps.js). The floor is cut into square cells; a
// cell is blocked when its centre is closer to a wall or a block than an agent's radius. Paths are A* over the free
// cells, then smoothed so agents walk straight where they can.
// No browser code here, so it is tested directly.

export const CELL = 25; // map units per cell
export const RADIUS = 18; // how close an agent's centre may come to a wall

// Shortest distance from point (px, py) to the segment a-b.
export function distToSegment(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Is (px, py) within `pad` of a block: a footprint { at, size: [width, depth], turn } turned `turn` degrees clockwise?
export function inBlock(px, py, { at: [cx, cy], size: [bw, bd], turn = 0 }, pad = 0) {
  const a = (turn * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * Math.cos(a) + dy * Math.sin(a);
  const ly = -dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= bw / 2 + pad && Math.abs(ly) <= bd / 2 + pad;
}

// The walkable grid of a map: { cols, rows, free: Uint8Array, toCell, toPoint }.
export function buildGrid({ w, h, walls, blocks = [] }, { cell = CELL, radius = RADIUS, blockPad = RADIUS / 2 } = {}) {
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const free = new Uint8Array(cols * rows).fill(1);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const reach = radius + cell; // walls further than this from a cell can't block it
  for (const s of walls) {
    const [minX, maxX] = [Math.min(s[0], s[2]) - reach, Math.max(s[0], s[2]) + reach];
    const [minY, maxY] = [Math.min(s[1], s[3]) - reach, Math.max(s[1], s[3]) + reach];
    const c0 = Math.max(0, Math.floor((minX - x0) / cell));
    const c1 = Math.min(cols - 1, Math.floor((maxX - x0) / cell));
    const r0 = Math.max(0, Math.floor((minY - y0) / cell));
    const r1 = Math.min(rows - 1, Math.floor((maxY - y0) / cell));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (distToSegment(x0 + (c + 0.5) * cell, y0 + (r + 0.5) * cell, s) < radius) free[r * cols + c] = 0;
      }
    }
  }
  for (const b of blocks) {
    const reachB = Math.hypot(b.size[0], b.size[1]) / 2 + blockPad; // furniture may be passed closer than a wall
    const c0 = Math.max(0, Math.floor((b.at[0] - reachB - x0) / cell));
    const c1 = Math.min(cols - 1, Math.floor((b.at[0] + reachB - x0) / cell));
    const r0 = Math.max(0, Math.floor((b.at[1] - reachB - y0) / cell));
    const r1 = Math.min(rows - 1, Math.floor((b.at[1] + reachB - y0) / cell));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (inBlock(x0 + (c + 0.5) * cell, y0 + (r + 0.5) * cell, b, blockPad)) free[r * cols + c] = 0;
      }
    }
  }
  const toCell = (x, y) => [Math.min(cols - 1, Math.max(0, Math.floor((x - x0) / cell))), Math.min(rows - 1, Math.max(0, Math.floor((y - y0) / cell)))];
  const toPoint = (c, r) => [x0 + (c + 0.5) * cell, y0 + (r + 0.5) * cell];
  const isFree = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && free[r * cols + c] === 1;
  return { cols, rows, cell, free, toCell, toPoint, isFree };
}

// Can a visitor stand at (x, y): inside the map, at least `pad` from every wall, and clear of the furniture? Finer
// than the grid, for the person walking the 3D office.
export function standable(map, x, y, pad = 22) {
  if (Math.abs(x) > map.w / 2 - pad || Math.abs(y) > map.h / 2 - pad) return false;
  for (const s of map.walls) if (distToSegment(x, y, s) < pad) return false;
  for (const b of map.blocks || []) if (inBlock(x, y, b, pad * 0.6)) return false;
  return true;
}

// One step of a walk: the whole move if the walker can stand there, else the move along x only or along y only (so a
// walker slides along a wall instead of sticking to it), else no move. Steps must be shorter than twice `pad`, or a
// walker could step through a wall.
export function stepWithin(map, [x, y], [dx, dy], pad = 22) {
  for (const [nx, ny] of [[x + dx, y + dy], [x + dx, y], [x, y + dy]]) if (standable(map, nx, ny, pad)) return [nx, ny];
  return [x, y];
}

// The free cell nearest to (x, y), searching outwards ring by ring. Returns [c, r] or null.
export function nearestFree(grid, x, y, maxRings = 12) {
  const [c, r] = grid.toCell(x, y);
  if (grid.isFree(c, r)) return [c, r];
  for (let d = 1; d <= maxRings; d++) {
    let best = null;
    for (let dr = -d; dr <= d; dr++) {
      for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d || !grid.isFree(c + dc, r + dr)) continue;
        const dist = dc * dc + dr * dr;
        if (!best || dist < best[2]) best = [c + dc, r + dr, dist];
      }
    }
    if (best) return [best[0], best[1]];
  }
  return null;
}

// Can an agent walk in a straight line between two points without coming near a wall? Checks the cells on the way.
export function clearLine(grid, [ax, ay], [bx, by]) {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / (grid.cell / 2));
  for (let i = 1; i < steps; i++) {
    const [c, r] = grid.toCell(ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps);
    if (!grid.isFree(c, r)) return false;
  }
  return true;
}

// The way from one point to another as a list of points (map units), or null when there is none. A* on the grid
// with diagonal steps that never cut a wall corner, then the path is pulled straight wherever the line is clear.
export function findPath(grid, from, to) {
  const start = nearestFree(grid, ...from);
  const goal = nearestFree(grid, ...to);
  if (!start || !goal) return null;
  const { cols } = grid;
  const key = (c, r) => r * cols + c;
  const startK = key(...start);
  const goalK = key(...goal);
  const g = new Map([[startK, 0]]);
  const came = new Map();
  const open = new MinHeap();
  const hEst = (c, r) => Math.hypot(c - goal[0], r - goal[1]);
  open.push(startK, hEst(...start));
  const closed = new Set();
  while (open.size) {
    const k = open.pop();
    if (k === goalK) break;
    if (closed.has(k)) continue;
    closed.add(k);
    const c = k % cols;
    const r = (k - c) / cols;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (!grid.isFree(nc, nr)) continue;
        if (dr && dc && (!grid.isFree(c + dc, r) || !grid.isFree(c, r + dr))) continue; // no corner cutting
        const nk = key(nc, nr);
        const cost = g.get(k) + (dr && dc ? Math.SQRT2 : 1);
        if (cost < (g.get(nk) ?? Infinity)) {
          g.set(nk, cost);
          came.set(nk, k);
          open.push(nk, cost + hEst(nc, nr));
        }
      }
    }
  }
  if (!g.has(goalK)) return null;
  const cells = [goalK];
  while (cells[0] !== startK) cells.unshift(came.get(cells[0]));
  const points = cells.map((k) => grid.toPoint(k % cols, (k - (k % cols)) / cols));
  points[0] = [...from];
  points[points.length - 1] = [...to];
  // Pull the path straight: from each point, jump to the furthest later point in clear sight.
  const out = [points[0]];
  let i = 0;
  while (i < points.length - 1) {
    let j = points.length - 1;
    while (j > i + 1 && !clearLine(grid, points[i], points[j])) j--;
    out.push(points[j]);
    i = j;
  }
  return out;
}

// Total length of a path, in map units.
export const pathLength = (path) => path.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0), 0);

// The point a walker has reached after `dist` map units along the path.
export function pointAlong(path, dist) {
  let left = dist;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1];
    const [bx, by] = path[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (left <= seg) return [ax + ((bx - ax) * left) / (seg || 1), ay + ((by - ay) * left) / (seg || 1)];
    left -= seg;
  }
  return [...path[path.length - 1]];
}

// Up to `n` standing places inside a room's box ([x1, y1, x2, y2]), spread on a grid, each on free floor and at
// least `gap` apart.
export function spotsIn(grid, [x1, y1, x2, y2], n, gap = 90) {
  const out = [];
  const pad = gap / 2;
  for (let y = y1 + pad; y <= y2 - pad; y += gap) {
    for (let x = x1 + pad; x <= x2 - pad; x += gap) {
      const [c, r] = grid.toCell(x, y);
      if (grid.isFree(c, r)) out.push([x, y]);
    }
  }
  // Spread the chosen spots over the room rather than filling the first row.
  if (out.length <= n) return out;
  const step = out.length / n;
  return Array.from({ length: n }, (_, i) => out[Math.floor(i * step + step / 2)]);
}

class MinHeap {
  constructor() {
    this.k = [];
    this.p = [];
  }
  get size() {
    return this.k.length;
  }
  push(key, pri) {
    const { k, p } = this;
    k.push(key);
    p.push(pri);
    let i = k.length - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (p[up] <= p[i]) break;
      [k[up], k[i]] = [k[i], k[up]];
      [p[up], p[i]] = [p[i], p[up]];
      i = up;
    }
  }
  pop() {
    const { k, p } = this;
    const top = k[0];
    const lastK = k.pop();
    const lastP = p.pop();
    if (k.length) {
      k[0] = lastK;
      p[0] = lastP;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && p[l] < p[m]) m = l;
        if (r < k.length && p[r] < p[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [p[m], p[i]] = [p[i], p[m]];
        i = m;
      }
    }
    return top;
  }
}
