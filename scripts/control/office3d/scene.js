// The office itself, built from the floor plan in layout.js: floor, walls with a city outside the
// windows, the two workbenches with ergonomic chairs and monitors, the coffee station, the
// standing meeting table, the lounge, bookshelves, plants, pendant lamps, violet light strips,
// the task display and the "Needs you" tray. Everything is simple geometry with physically based
// materials and canvas textures, so it loads instantly and needs no downloaded scene file. There
// are no people in it: the agents are added separately (characters.js).

import * as THREE from '/vendor/three/build/three.module.js';
import { RoomEnvironment } from '/vendor/three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from '/vendor/three/examples/jsm/utils/BufferGeometryUtils.js';
import { ARMCHAIRS, BENCH_BOXES, BOOKSHELVES, COUNTER, DESKS, DISPLAY, LOUNGE_TABLE, MEETING_TABLE, PLANTS, ROOM, RUG, SOFA, SPOTS, TRAY, WINDOWS } from './layout.js';
import { makeMug } from './characters.js';

const VIOLET = 0x8b6cff;

function canvasTexture(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  return { canvas: c, ctx, tex };
}

// A seeded random, so the city and the books look the same on every visit.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function plankFloor(ctx, w, h) {
  const rand = seeded(11);
  const rows = 8;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rand() * 200;
    while (x < w) {
      const len = 180 + rand() * 220;
      const tone = 150 + Math.floor(rand() * 26);
      ctx.fillStyle = `rgb(${tone + 38},${tone + 4},${tone - 40})`;
      ctx.fillRect(x, r * rh, len, rh);
      for (let g = 0; g < 7; g++) {
        ctx.strokeStyle = `rgba(90,55,25,${0.05 + rand() * 0.07})`;
        ctx.beginPath();
        const y = r * rh + rand() * rh;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + len * 0.3, y + (rand() - 0.5) * 6, x + len * 0.7, y + (rand() - 0.5) * 6, x + len, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(60,35,15,.35)';
      ctx.fillRect(x, r * rh, 2, rh);
      x += len;
    }
    ctx.fillStyle = 'rgba(60,35,15,.3)';
    ctx.fillRect(0, r * rh, w, 2);
  }
}

// The city outside, by time of day.
export function drawSkyline(ctx, w, h, hour = new Date().getHours()) {
  const night = hour < 6 || hour >= 19;
  const dusk = !night && (hour >= 17 || hour < 8);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (night) {
    g.addColorStop(0, '#120c2e');
    g.addColorStop(0.6, '#2a1d5c');
    g.addColorStop(1, '#4b3a86');
  } else if (dusk) {
    g.addColorStop(0, '#3d3a8c');
    g.addColorStop(0.55, '#c77dba');
    g.addColorStop(1, '#ffc49b');
  } else {
    g.addColorStop(0, '#8fb8ff');
    g.addColorStop(0.65, '#cfe0ff');
    g.addColorStop(1, '#f3eaff');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rand = seeded(42);
  if (night) {
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.6})`;
      ctx.fillRect(rand() * w, rand() * h * 0.45, 1.5, 1.5);
    }
  }
  for (const layer of [0, 1]) {
    let x = 0;
    while (x < w) {
      const bw = 40 + rand() * 90;
      const bh = h * (layer ? 0.3 + rand() * 0.45 : 0.25 + rand() * 0.3);
      const base = layer ? (night ? '#1b1640' : dusk ? '#4a3d7a' : '#8a92b8') : night ? '#2b2560' : dusk ? '#6b5a9a' : '#aab3d6';
      ctx.fillStyle = base;
      ctx.fillRect(x, h - bh, bw - 4, bh);
      if (layer) {
        for (let wy = h - bh + 10; wy < h - 6; wy += 12) {
          for (let wx = x + 6; wx < x + bw - 10; wx += 10) {
            const lit = rand() < (night ? 0.45 : 0.12);
            ctx.fillStyle = lit ? (night ? 'rgba(255,214,140,.85)' : 'rgba(255,255,255,.5)') : 'rgba(0,0,0,.12)';
            ctx.fillRect(wx, wy, 5, 6);
          }
        }
      }
      x += bw;
    }
  }
}

function lamp(color = 0xfff1d6) {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  cord.position.y = 0.45;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.24, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x2d2840, metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2 }));
  bulb.position.y = -0.08;
  g.add(cord, shade, bulb);
  return g;
}

// Everything that never moves is merged into one mesh per material and shadow setting: the same
// picture with a few dozen draw calls instead of well over a thousand.
function bakeStatic(scene) {
  const groups = new Map();
  const remove = [];
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!o.isMesh || o.userData.dynamic) return;
    for (let p = o.parent; p; p = p.parent) if (p.userData.dynamic) return;
    if (o.material.map || o.material.transparent) return; // canvas screens and glass stay as they are
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!groups.has(key)) groups.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    g.applyMatrix4(o.matrixWorld);
    groups.get(key).geos.push(g);
    remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  for (const { material, cast, receive, geos } of groups.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, material);
    m.castShadow = cast;
    m.receiveShadow = receive;
    m.matrixAutoUpdate = false;
    scene.add(m);
  }
}

export function buildOffice({ seatHeight = 0.45, sitBack = 0.2, deskRise = 0.21, renderer }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15122a);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  const deskTop = seatHeight + deskRise; // where the cast's hands reach when seated (from characters.js)
  const M = {
    wood: new THREE.MeshStandardMaterial({ color: 0xc99a6b, roughness: 0.55 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.6 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xc7cad6, metalness: 0.85, roughness: 0.28 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1d1b26, metalness: 0.3, roughness: 0.45 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x3a3352, roughness: 0.92 }),
    sofa: new THREE.MeshStandardMaterial({ color: 0x7a68a8, roughness: 0.95 }),
    cushion: new THREE.MeshStandardMaterial({ color: 0xb7a6e3, roughness: 0.95 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xf1edf7, roughness: 0.9 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xd9cff3, roughness: 0.85 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf8f7fb, roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1 }),
    tableGlass: new THREE.MeshStandardMaterial({ color: 0xe8e4ff, transparent: true, opacity: 0.55, roughness: 0.08, metalness: 0.2 }),
    led: new THREE.MeshStandardMaterial({ color: VIOLET, emissive: VIOLET, emissiveIntensity: 2.4 }),
    pot: new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.6 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4f9a5e, roughness: 0.75, flatShading: true }),
    leaf2: new THREE.MeshStandardMaterial({ color: 0x3f7f4f, roughness: 0.75, flatShading: true }),
  };
  const box = (w, h, d, mat, x, y, z, { cast = true, receive = true } = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    scene.add(m);
    return m;
  };
  const cyl = (rt, rb, h, mat, x, y, z, seg = 20) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  // ---- lights ----
  scene.add(new THREE.HemisphereLight(0xe9e0ff, 0x5a4636, 0.38));
  const sun = new THREE.DirectionalLight(0xffe7c7, 2.1);
  sun.position.set(-6, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 11;
  sun.shadow.camera.bottom = -11;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun);
  scene.add(sun.target);
  const violetA = new THREE.PointLight(VIOLET, 9, 13, 2);
  violetA.position.set(-6, 3.1, -7.2);
  const violetB = new THREE.PointLight(0xb08cff, 7, 12, 2);
  violetB.position.set(9, 3.0, -1);
  const warm = new THREE.PointLight(0xffd7a8, 5, 9, 2);
  warm.position.set(9.4, 2.4, 3.2);
  scene.add(violetA, violetB, warm);

  // ---- floor, rug, walls ----
  const floorTex = canvasTexture(1024, 1024, plankFloor, { repeat: [9, 6] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.maxX - ROOM.minX, ROOM.maxZ - ROOM.minZ), new THREE.MeshStandardMaterial({ map: floorTex.tex, roughness: 0.42, metalness: 0.02 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const rugTex = canvasTexture(512, 400, (ctx, w, h) => {
    ctx.fillStyle = '#5b4a8f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c9b8ff';
    ctx.lineWidth = 8;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 3;
    ctx.strokeRect(44, 44, w - 88, h - 88);
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(RUG.w, RUG.d), new THREE.MeshStandardMaterial({ map: rugTex.tex, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(RUG.x, 0.006, RUG.z);
  rug.receiveShadow = true;
  scene.add(rug);

  const H = ROOM.wallHeight;
  const backZ = ROOM.minZ + 0.05;
  // back wall: solid below the sill and above the head of each window, glass in between
  const sill = 0.55;
  const head = 2.95;
  let x = ROOM.minX;
  const spans = [...WINDOWS].sort((a, b) => a.x0 - b.x0);
  for (const w of spans) {
    if (w.x0 > x) box(w.x0 - x, H, 0.1, M.wall, (x + w.x0) / 2, H / 2, backZ);
    const cx = (w.x0 + w.x1) / 2;
    const ww = w.x1 - w.x0;
    box(ww, sill, 0.1, M.wall, cx, sill / 2, backZ);
    box(ww, H - head, 0.1, M.wall, cx, (H + head) / 2, backZ);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, head - sill), M.glass);
    glass.position.set(cx, (sill + head) / 2, backZ + 0.01);
    scene.add(glass);
    for (let fx = w.x0; fx <= w.x1 + 0.01; fx += ww / Math.max(1, Math.round(ww / 1.6))) box(0.05, head - sill, 0.08, M.black, fx, (sill + head) / 2, backZ + 0.03, { cast: false });
    box(ww, 0.05, 0.12, M.black, cx, sill, backZ + 0.04, { cast: false });
    box(ww, 0.05, 0.12, M.black, cx, head, backZ + 0.04, { cast: false });
    x = w.x1;
  }
  if (x < ROOM.maxX) box(ROOM.maxX - x, H, 0.1, M.accent, (x + ROOM.maxX) / 2, H / 2, backZ);
  box(0.1, H, ROOM.maxZ - ROOM.minZ, M.wall, ROOM.minX + 0.05, H / 2, 0);
  box(0.1, H, ROOM.maxZ - ROOM.minZ, M.wall, ROOM.maxX - 0.05, H / 2, 0);
  // skirting and the violet light strip along the top of the walls
  box(ROOM.maxX - ROOM.minX, 0.04, 0.04, M.led, 0, H - 0.08, backZ + 0.08, { cast: false });
  box(0.04, 0.04, ROOM.maxZ - ROOM.minZ, M.led, ROOM.minX + 0.12, H - 0.08, 0, { cast: false });
  box(0.04, 0.04, ROOM.maxZ - ROOM.minZ, M.led, ROOM.maxX - 0.12, H - 0.08, 0, { cast: false });

  // the city
  const sky = canvasTexture(2048, 512, (ctx, w, h) => drawSkyline(ctx, w, h));
  const city = new THREE.Mesh(new THREE.PlaneGeometry(36, 9), new THREE.MeshBasicMaterial({ map: sky.tex, toneMapped: false }));
  city.position.set(-2, 2.6, ROOM.minZ - 4);
  scene.add(city);

  // ---- workbenches, chairs, monitors ----
  const monitors = new Map();
  for (const b of BENCH_BOXES) {
    box(b.w, 0.05, b.d, M.wood, b.x, deskTop - 0.025, b.z);
    for (const sx of [-1, 1]) {
      box(0.06, deskTop - 0.05, b.d - 0.1, M.metal, b.x + sx * (b.w / 2 - 0.15), (deskTop - 0.05) / 2, b.z);
    }
    box(b.w - 0.4, 0.3, 0.02, M.accent, b.x, deskTop + 0.15, b.z, { cast: false });
  }
  for (const d of DESKS) {
    const { seat, monitor } = d;
    // ergonomic chair: five-star base, gas lift, seat, mesh back
    const chair = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.3), M.black);
      leg.position.set(Math.sin((i / 5) * Math.PI * 2) * 0.15, 0.05, Math.cos((i / 5) * Math.PI * 2) * 0.15);
      leg.rotation.y = (i / 5) * Math.PI * 2;
      chair.add(leg);
    }
    const lift = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, seatHeight - 0.1, 10), M.metal);
    lift.position.y = (seatHeight - 0.1) / 2 + 0.05;
    const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.46), M.fabric);
    seatMesh.position.y = seatHeight - 0.035;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.05), M.fabric);
    back.position.set(0, seatHeight + 0.32, -0.25);
    back.rotation.x = -0.12;
    const lumbar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), M.metal);
    lumbar.position.set(0, seatHeight + 0.08, -0.25);
    chair.add(lift, seatMesh, back, lumbar);
    chair.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    chair.position.set(seat.x - Math.sin(seat.yaw) * sitBack, 0, seat.z - Math.cos(seat.yaw) * sitBack);
    chair.rotation.y = seat.yaw;
    scene.add(chair);
    // monitor, keyboard, mouse, a desk plant or a notebook
    const mon = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.04), M.metal);
    stand.position.y = 0.14;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.16), M.metal);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.4, 0.03), M.black);
    frame.position.y = 0.42;
    const screen = canvasTexture(512, 300, () => {});
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }));
    glow.position.set(0, 0.42, 0.017);
    mon.add(stand, foot, frame, glow);
    mon.traverse((o) => {
      if (o.isMesh && o !== glow) o.castShadow = true;
    });
    mon.position.set(monitor.x, deskTop, monitor.z);
    mon.rotation.y = monitor.yaw;
    scene.add(mon);
    const toward = seat.yaw === 0 ? -1 : 1; // from the monitor toward the seat, along z
    box(0.44, 0.02, 0.15, M.white, seat.x, deskTop + 0.01, monitor.z + toward * 0.3, { cast: false });
    box(0.06, 0.02, 0.09, M.white, seat.x + 0.32, deskTop + 0.01, monitor.z + toward * 0.3, { cast: false });
    monitors.set(d.agent, { ...screen, mesh: glow, lookAt: new THREE.Vector3(monitor.x, deskTop + 0.42, monitor.z) });
  }

  // ---- coffee station ----
  box(COUNTER.w, 0.9, COUNTER.d, M.white, COUNTER.x, 0.45, COUNTER.z);
  box(COUNTER.w + 0.06, 0.05, COUNTER.d + 0.06, M.darkWood, COUNTER.x, 0.925, COUNTER.z);
  box(COUNTER.w, 0.03, 0.3, M.darkWood, COUNTER.x, 1.75, ROOM.minZ + 0.2);
  box(COUNTER.w, 0.03, 0.3, M.darkWood, COUNTER.x, 2.15, ROOM.minZ + 0.2);
  const machine = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.38), M.black);
  body.position.y = 0.25;
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.02), M.metal);
  front.position.set(0, 0.34, 0.2);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8), M.metal);
  spout.position.set(0, 0.2, 0.15);
  const drip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.14), M.metal);
  drip.position.set(0, 0.02, 0.14);
  const ledM = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.led);
  ledM.position.set(0.14, 0.42, 0.21);
  machine.add(body, front, spout, drip, ledM);
  machine.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  machine.position.set(8.0, 0.95, COUNTER.z);
  scene.add(machine);
  const mugs = new Map();
  const palette = [0xffffff, 0xd9cff3, 0xffd6a5, 0xbde0fe];
  SPOTS.filter((s) => s.mug).forEach((s, i) => {
    const m = makeMug(palette[i % palette.length]);
    m.position.set(s.mug.x, 1.0, s.mug.z + 0.12);
    m.userData.dynamic = true;
    scene.add(m);
    mugs.set(s.id, m);
  });
  for (let i = 0; i < 4; i++) {
    const m = makeMug(palette[(i + 2) % palette.length]);
    m.position.set(10.9 + (i % 2) * 0.14, 1.83 + Math.floor(i / 2) * 0.4, ROOM.minZ + 0.2);
    scene.add(m);
  }
  // a small sign over the counter
  const sign = canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2a2342';
    ctx.fillRect(0, 0, w, h);
    ctx.font = '600 54px ui-rounded, system-ui, sans-serif';
    ctx.fillStyle = '#e8ddff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☕  coffee bar', w / 2, h / 2);
  });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshBasicMaterial({ map: sign.tex, toneMapped: false }));
  signMesh.position.set(COUNTER.x, 2.6, ROOM.minZ + 0.11);
  scene.add(signMesh);

  // ---- standing meeting table ----
  cyl(MEETING_TABLE.r, MEETING_TABLE.r, 0.03, M.tableGlass, MEETING_TABLE.x, 1.05, MEETING_TABLE.z, 40);
  cyl(0.04, 0.05, 1.03, M.metal, MEETING_TABLE.x, 0.52, MEETING_TABLE.z);
  cyl(0.28, 0.3, 0.03, M.metal, MEETING_TABLE.x, 0.015, MEETING_TABLE.z, 30);

  // ---- lounge ----
  const sofaBase = Math.max(0.1, seatHeight - 0.1);
  box(SOFA.w, sofaBase, SOFA.d, M.sofa, SOFA.x, sofaBase / 2, SOFA.z);
  box(0.22, seatHeight + 0.45, SOFA.d, M.sofa, SOFA.x + SOFA.w / 2 - 0.11, (seatHeight + 0.45) / 2, SOFA.z);
  for (const sz of [-1, 1]) box(SOFA.w, seatHeight + 0.18, 0.2, M.sofa, SOFA.x, (seatHeight + 0.18) / 2, SOFA.z + sz * (SOFA.d / 2 - 0.1));
  for (let i = 0; i < 3; i++) box(0.72, 0.1, 1.06, M.cushion, SOFA.x - 0.1, sofaBase + 0.05, SOFA.z - 1.1 + i * 1.1);
  for (let i = 0; i < 2; i++) box(0.14, 0.34, 0.5, M.cushion, SOFA.x + 0.28, seatHeight + 0.2, SOFA.z - 0.6 + i * 1.2).rotation.z = 0.25;
  // armchairs facing the low table; set back by the cast's sitting offset, like the desk chairs
  for (const c of ARMCHAIRS) {
    const cx = c.x - sitBack;
    box(0.8, sofaBase, 0.8, M.sofa, cx, sofaBase / 2, c.z);
    box(0.62, 0.1, 0.62, M.cushion, cx + 0.05, sofaBase + 0.05, c.z);
    box(0.18, seatHeight + 0.4, 0.8, M.sofa, cx - 0.31, (seatHeight + 0.4) / 2, c.z);
    for (const sz of [-1, 1]) box(0.8, seatHeight + 0.14, 0.14, M.sofa, cx, (seatHeight + 0.14) / 2, c.z + sz * 0.33);
  }
  box(LOUNGE_TABLE.w, 0.04, LOUNGE_TABLE.d, M.wood, LOUNGE_TABLE.x, 0.3, LOUNGE_TABLE.z);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.04, 0.28, 0.04, M.metal, LOUNGE_TABLE.x + sx * 0.38, 0.14, LOUNGE_TABLE.z + sz * 0.68);
  box(0.24, 0.05, 0.32, new THREE.MeshStandardMaterial({ color: 0xff9f9f }), LOUNGE_TABLE.x, 0.345, LOUNGE_TABLE.z - 0.3);
  box(0.22, 0.04, 0.3, new THREE.MeshStandardMaterial({ color: 0x9fd3ff }), LOUNGE_TABLE.x + 0.02, 0.39, LOUNGE_TABLE.z - 0.28);

  // ---- bookshelves ----
  const rand = seeded(7);
  const bookMats = [0x6c5ce7, 0xa29bfe, 0xfd79a8, 0xffeaa7, 0x81ecec, 0x55efc4, 0xfab1a0, 0x2d3436].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  for (const s of BOOKSHELVES) {
    box(s.w, 2.2, s.d, M.darkWood, s.x, 1.1, s.z);
    for (let level = 0; level < 5; level++) {
      const y = 0.08 + level * 0.43;
      box(s.w + 0.02, 0.03, s.d - 0.04, M.wood, s.x + 0.02, y, s.z);
      let z = s.z - s.d / 2 + 0.08;
      while (z < s.z + s.d / 2 - 0.12) {
        const bw = 0.04 + rand() * 0.05;
        const bh = 0.24 + rand() * 0.12;
        if (rand() < 0.12) {
          z += 0.15;
          continue;
        }
        box(0.24, bh, bw, bookMats[Math.floor(rand() * bookMats.length)], s.x + 0.06, y + 0.015 + bh / 2, z, { receive: false });
        z += bw + 0.01;
      }
    }
  }

  // ---- plants ----
  for (const p of PLANTS) {
    cyl(p.r, p.r * 0.8, 0.45, M.pot, p.x, 0.225, p.z);
    const leaves = 7;
    for (let i = 0; i < leaves; i++) {
      const a = (i / leaves) * Math.PI * 2 + rand();
      const rr = p.r * (0.3 + rand() * 0.6);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(p.r * (0.55 + rand() * 0.35), 0), i % 2 ? M.leaf : M.leaf2);
      leaf.position.set(p.x + Math.sin(a) * rr, 0.45 + (p.h - 0.45) * (0.35 + rand() * 0.6), p.z + Math.cos(a) * rr);
      leaf.scale.y = 1.3;
      leaf.castShadow = true;
      scene.add(leaf);
    }
  }

  // ---- pendant lamps ----
  for (const b of BENCH_BOXES) for (const lx of [-2.4, 0, 2.4]) {
    const l = lamp();
    l.position.set(b.x + lx, 2.75, b.z);
    scene.add(l);
  }
  const ml = lamp(0xe6dcff);
  ml.position.set(MEETING_TABLE.x, 2.2, MEETING_TABLE.z);
  scene.add(ml);
  const benchLight = new THREE.PointLight(0xffe6c4, 4, 8, 2);
  benchLight.position.set(-5.2, 2.2, -1);
  scene.add(benchLight);

  // ---- task display on the back wall ----
  const disp = canvasTexture(1024, 568, () => {});
  const dispFrame = box(DISPLAY.w + 0.1, DISPLAY.h + 0.1, 0.06, M.black, DISPLAY.x, DISPLAY.y, backZ + 0.08, { cast: false });
  dispFrame.receiveShadow = false;
  const dispMesh = new THREE.Mesh(new THREE.PlaneGeometry(DISPLAY.w, DISPLAY.h), new THREE.MeshBasicMaterial({ map: disp.tex, toneMapped: false }));
  dispMesh.position.set(DISPLAY.x, DISPLAY.y, backZ + 0.115);
  scene.add(dispMesh);
  box(DISPLAY.w, 0.03, 0.03, M.led, DISPLAY.x, DISPLAY.y - DISPLAY.h / 2 - 0.12, backZ + 0.1, { cast: false });

  // ---- the "Needs you" tray ----
  cyl(0.06, 0.08, 1.0, M.metal, TRAY.x, 0.5, TRAY.z);
  cyl(0.22, 0.22, 0.02, M.metal, TRAY.x, 0.01, TRAY.z);
  box(0.5, 0.05, 0.38, M.darkWood, TRAY.x, 1.02, TRAY.z);
  const papers = [];
  for (let i = 0; i < 6; i++) {
    const p = box(0.32, 0.008, 0.24, M.white, TRAY.x + (rand() - 0.5) * 0.04, 1.05 + i * 0.012, TRAY.z + (rand() - 0.5) * 0.04, { cast: false });
    p.rotation.y = (rand() - 0.5) * 0.3;
    p.visible = false;
    p.userData.dynamic = true;
    papers.push(p);
  }
  const trayTag = canvasTexture(256, 96, () => {});
  const tagMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshBasicMaterial({ map: trayTag.tex, toneMapped: false, transparent: true }));
  tagMesh.position.set(TRAY.x, 1.32, TRAY.z);
  scene.add(tagMesh);
  const drawTag = (n) => {
    const { ctx, canvas } = trayTag;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = n ? '#ffb020' : '#3a3352';
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 30);
    ctx.fill();
    ctx.fillStyle = n ? '#1d1500' : '#d9cff3';
    ctx.font = '700 40px ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n ? `Needs you · ${n}` : 'Needs you · 0', canvas.width / 2, canvas.height / 2 + 2);
    trayTag.tex.needsUpdate = true;
  };
  drawTag(0);

  // ---- wall logo ----
  const logo = canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = '800 150px ui-rounded, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#ffb3cf');
    g.addColorStop(0.5, '#b49cff');
    g.addColorStop(1, '#8fd3ff');
    ctx.fillStyle = g;
    ctx.fillText('panscience', 20, h / 2);
  });
  const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: logo.tex, transparent: true, toneMapped: false }));
  logoMesh.position.set(ROOM.minX + 0.12, 2.75, -0.8);
  logoMesh.rotation.y = Math.PI / 2;
  scene.add(logoMesh);

  bakeStatic(scene);

  return {
    scene,
    sun,
    monitors,
    mugs,
    deskTop,
    display: { ...disp, mesh: dispMesh, center: new THREE.Vector3(DISPLAY.x, DISPLAY.y, backZ) },
    tray: {
      set(n) {
        papers.forEach((p, i) => {
          p.visible = i < Math.min(papers.length, n);
        });
        drawTag(n);
      },
      center: new THREE.Vector3(TRAY.x, 1.05, TRAY.z),
    },
    sky,
    redrawSky() {
      drawSkyline(sky.ctx, sky.canvas.width, sky.canvas.height);
      sky.tex.needsUpdate = true;
    },
  };
}
