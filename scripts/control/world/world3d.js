// An office in 3D, built from its map's logic rather than drawn by hand: the map's pictures are the floor, its walls
// (maps.js) are raised into real walls, its furniture (props3d.js) stands where the pictures show it, and the agents
// are the 3D people of the 3D office (office3d/characters.js) walking the same paths as on the 2D map (crowd.js,
// nav.js). An agent with work sits at its desk and types; an idle one gets up and wanders to the kitchen or the
// boardroom and back.
//
//   const view = await createWorld3D(container, { office, map, label, onOpen })
//   view.update(agents)   agents as in the page's state: { name, status, doing }
//   view.follow(name)     keep the camera on one agent (null to stop)
//   view.ride(name)       see the office the way that agent does (null to stop)
//   view.destroy()
//
// Map units become metres at 100 to 1 (a 3000-unit map is a 30 m floor). Four ways to look:
//   Top, Angle   the whole floor. Drag to orbit, right-drag or arrow keys to pan, scroll to zoom
//   Walk         you, on foot, at the people's eye height: W A S D or the arrows to walk, drag to look, Shift to run
//   Ride along   behind one agent's shoulder, or through its eyes, as it works and walks about
// Walls rise to full height when you are inside. Name tags are page elements placed over the canvas each frame.
import * as THREE from '/vendor/three/build/three.module.js';
import { OrbitControls } from '/vendor/three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from '/vendor/three/examples/jsm/utils/BufferGeometryUtils.js';
import { identityFor } from '../gems/identities.js';
import { normalizeState, STATE_LABEL } from '../gems/status.js';
import { Character, loadRig } from '../office3d/characters.js';
import { AT_SEAT, createCrowd, officeLayout, petPlaces, SPEED } from './crowd.js';
import { floorsOf, turnOf } from './maps.js';
import { createPet, DOG, sheet } from './pet.js';
import { buildGrid, findPath, nearestFree, stepWithin, standable } from './nav.js';
import { createKit } from './props3d.js';

const M = 0.01; // metres per map unit
const PET = '__pet'; // what "follow" holds while following the office dog
const WALL = { low: 1.05, high: 2.1, thick: 0.14 }; // wall heights: seen from above, and when you are inside
const EYE = 1.1; // a visitor's eye height, for 1.25 m people
const WALK = { speed: 150, run: 260, turn: 1.9 }; // map units a second, and radians a second when turning by keys
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// What a seated agent's hands do, by what it is doing (the layers of office3d/characters.js).
const HANDS = { working: { type: 1 }, researching: { read: 1 }, waiting: { wait: 1 }, error: { think: 1 }, success: { rest: 1 }, idle: { rest: 1 } };
const yawOf = (face) => (-turnOf(face) * Math.PI) / 180; // a facing on the map, as a turn about the vertical
const KEYS = {
  fwd: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA'],
  right: ['KeyD'],
  turnL: ['ArrowLeft', 'KeyQ'],
  turnR: ['ArrowRight', 'KeyE'],
  run: ['ShiftLeft', 'ShiftRight'],
};
const MOVE_KEYS = new Set(Object.values(KEYS).flat());

export function webgl3dAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export async function createWorld3D(container, { office, map, label = (n) => n, onOpen }) {
  const grid = buildGrid(map);
  const { seats, how, planned, wander, perches } = officeLayout(office, map, grid);
  const crowd = createCrowd({ grid, seats, wander });
  const gemName = (name) => (identityFor(name).name === name ? label(name) : identityFor(name).name);
  const to3 = ([x, y], h = 0) => new THREE.Vector3(x * M, h, y * M);
  const mood = { light: 1, glow: 0, ...map.mood };
  const seatYaw = (name) => yawOf(how.get(name)?.face);

  container.innerHTML = `
    <div class="w3" tabindex="0" aria-label="${esc(office.name)} in 3D">
      <canvas class="w3-canvas"></canvas>
      <div class="w3-tags"></div>
      <div class="w3-loading">Building the 3D office…</div>
      <div class="wv-tools">
        <button type="button" data-v="top">Top</button>
        <button type="button" data-v="angle">Angle</button>
        <button type="button" data-v="walk" title="Walk around the office yourself">Walk</button>
        <button type="button" data-v="eyes" hidden>Through their eyes</button>
        <button type="button" data-v="stop" hidden>Stop following</button>
      </div>
      <div class="w3-where" hidden></div>
      <div class="w3-help" hidden></div>
      <div class="w3-pad" hidden aria-label="Walk">
        <button type="button" data-move="turnL" aria-label="Turn left">◀</button>
        <button type="button" data-move="fwd" aria-label="Walk forward">▲</button>
        <button type="button" data-move="back" aria-label="Walk back">▼</button>
        <button type="button" data-move="turnR" aria-label="Turn right">▶</button>
      </div>
      <canvas class="w3-mini" hidden></canvas>
      <div class="wv-pop" hidden></div>
    </div>`;
  const root = container.querySelector('.w3');
  const canvas = root.querySelector('.w3-canvas');
  const tagLayer = root.querySelector('.w3-tags');
  const pop = root.querySelector('.wv-pop');
  const stopBtn = root.querySelector('[data-v="stop"]');
  const eyesBtn = root.querySelector('[data-v="eyes"]');
  const where = root.querySelector('.w3-where');
  const help = root.querySelector('.w3-help');
  const pad = root.querySelector('.w3-pad');
  const mini = root.querySelector('.w3-mini');

  // ---- renderer, camera, light ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b0f1d');
  scene.fog = new THREE.Fog('#0b0f1d', 60, 130);
  const W = map.w * M;
  const H = map.h * M;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.maxPolarAngle = 1.32;
  controls.minDistance = 3;
  controls.maxDistance = Math.max(W, H) * 2;
  controls.listenToKeyEvents(root);
  // The whole floor in view, for the window's shape: seen from 55 degrees up, or straight down. The distance is the
  // one at which the floor's width and its (foreshortened) depth both fit the camera's field of view.
  const span = () => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); // visible height per metre of distance
  const views = {
    angle: () => {
      const up = THREE.MathUtils.degToRad(55);
      const d = (Math.max(H * Math.sin(up), W / camera.aspect) / span()) * 1.08;
      return { pos: new THREE.Vector3(0, d * Math.sin(up), d * Math.cos(up) + H * 0.04), target: new THREE.Vector3(0, 0, H * 0.04) };
    },
    top: () => ({ pos: new THREE.Vector3(0, (Math.max(H, W / camera.aspect) / span()) * 1.05, 0.01), target: new THREE.Vector3(0, 0, 0) }),
  };
  scene.add(new THREE.HemisphereLight(0xe2ecff, 0x1c2130, 1.15 * mood.light));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.9 * mood.light);
  sun.position.set(W * 0.4, 28, H * 0.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const reach = Math.max(W, H) / 2 + 1;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 80 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  for (const l of map.lights || []) {
    const lamp = new THREE.PointLight(l.color, (l.power ?? 2) * 4, 7, 1.6);
    lamp.position.copy(to3(l.at, 1.9));
    scene.add(lamp);
  }

  // ---- the floor: the map's pictures ----
  const disposables = [];
  const loader = new THREE.TextureLoader();
  const floors = floorsOf(map);
  const floorPics = await Promise.all(floors.map(async (f) => {
    const tex = await loader.loadAsync(`/${f.image}`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const [x1, y1, x2, y2] = f.box;
    // A dark office keeps its picture readable: the picture also glows a little by itself (mood.glow).
    const floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, ...(mood.glow ? { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: mood.glow } : {}) });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry((x2 - x1) * M, (y2 - y1) * M), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(((x1 + x2) / 2) * M, 0, ((y1 + y2) / 2) * M);
    floor.receiveShadow = true;
    scene.add(floor);
    disposables.push(floor.geometry, floorMat, tex);
    return { image: tex.image, box: f.box };
  }));

  // ---- the walls: each line raised into a wall with a lit top edge, merged into two meshes ----
  const wallParts = [];
  const capParts = [];
  for (const [x1, y1, x2, y2] of map.walls) {
    const len = Math.hypot(x2 - x1, y2 - y1) * M;
    if (len < 0.05) continue;
    const angle = -Math.atan2(y2 - y1, x2 - x1);
    const mid = to3([(x1 + x2) / 2, (y1 + y2) / 2]);
    const g = new THREE.BoxGeometry(len + WALL.thick, 1, WALL.thick);
    g.rotateY(angle);
    g.translate(mid.x, 0.5, mid.z);
    wallParts.push(g);
    const c = new THREE.BoxGeometry(len + WALL.thick, 0.04, WALL.thick + 0.02);
    c.rotateY(angle);
    c.translate(mid.x, 0.02, mid.z);
    capParts.push(c);
  }
  const accent = new THREE.Color(office.accent || '#4c8dff');
  const capColor = new THREE.Color(mood.cap || office.accent || '#4c8dff');
  const walls = new THREE.Mesh(mergeGeometries(wallParts), new THREE.MeshStandardMaterial({ color: mood.wall || 0x343c52, roughness: 0.62, metalness: 0.35 }));
  walls.castShadow = true;
  walls.receiveShadow = true;
  const caps = new THREE.Mesh(mergeGeometries(capParts), new THREE.MeshStandardMaterial({ color: capColor, emissive: capColor, emissiveIntensity: 0.7 }));
  scene.add(walls, caps);
  for (const g of [...wallParts, ...capParts]) g.dispose();
  disposables.push(walls.geometry, walls.material, caps.geometry, caps.material);
  let wallNow = WALL.low;
  let wallGoal = WALL.low;
  const setWalls = (h) => {
    walls.scale.y = h;
    caps.position.y = h;
  };
  setWalls(wallNow);

  // A ceiling over each picture, only while you are inside: the office is a room again, not a model on a table.
  const ceilMat = new THREE.MeshStandardMaterial({ color: mood.ceiling || '#121722', roughness: 0.9, side: THREE.DoubleSide });
  const ceiling = new THREE.Group();
  const panelMat = new THREE.MeshStandardMaterial({ color: '#dfe9ff', emissive: '#dfe9ff', emissiveIntensity: 0.5 });
  const panelGeo = new THREE.PlaneGeometry(0.9, 0.3);
  for (const f of floors) {
    const [x1, y1, x2, y2] = f.box;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry((x2 - x1) * M, (y2 - y1) * M), ceilMat);
    plane.rotation.x = Math.PI / 2;
    plane.position.set(((x1 + x2) / 2) * M, WALL.high, ((y1 + y2) / 2) * M);
    ceiling.add(plane);
    disposables.push(plane.geometry);
    for (let x = x1 + 150; x < x2 - 100; x += 300) {
      for (let y = y1 + 150; y < y2 - 100; y += 300) {
        const p = new THREE.Mesh(panelGeo, panelMat);
        p.rotation.x = Math.PI / 2;
        p.position.set(x * M, WALL.high - 0.01, y * M);
        ceiling.add(p);
      }
    }
  }
  ceiling.visible = false;
  scene.add(ceiling);
  disposables.push(ceilMat, panelMat, panelGeo);

  // ---- the people ----
  const names = [...seats.keys()];
  const rigs = await Promise.all(names.map((n) => loadRig('people', n)));
  const rig0 = rigs[0] || (await loadRig('people', ''));

  // The furniture from the map, then a chair at every seat. A seat the map draws (maps.js `seats`) is at a desk that
  // is already there; any other seat gets a desk of its own, in front of the person.
  const kit = createKit({ seat: rig0?.seatHeight ?? 0.32, desk: (rig0?.seatHeight ?? 0.32) + (rig0?.deskRise ?? 0.17), back: rig0?.sitBack ?? 0.2, accent: mood.cap || office.accent });
  const furniture = new THREE.Group();
  for (const p of map.props || []) furniture.add(kit.prop(p));
  for (const s of [...names.map((n) => ({ at: seats.get(n), ...how.get(n) })), ...planned]) {
    const g = new THREE.Group();
    g.add(kit.chair(s.chair));
    g.position.copy(to3(s.at));
    g.rotation.y = yawOf(s.face);
    furniture.add(g);
    if (!s.fixed) furniture.add(kit.prop({ k: 'desk', at: [s.at[0], s.at[1] + 50], size: [95, 50], item: 'monitor', face: 'up' }));
  }
  scene.add(furniture);

  const people = new Map();
  names.forEach((name, i) => {
    const id = identityFor(name);
    const ch = new Character(rigs[i], { name, color: id.theme?.primary || '#a58ff0' });
    ch.root.position.copy(to3(seats.get(name)));
    ch.root.rotation.y = seatYaw(name);
    ch.sitNow();
    ch.setLayers(HANDS.idle);
    scene.add(ch.root);
    const tag = document.createElement('button');
    tag.type = 'button';
    tag.className = 'w3-tag';
    tag.dataset.agent = name;
    tag.innerHTML = `<span class="w3-name">${esc(gemName(name))}</span><span class="wv-doing" hidden></span>`;
    tagLayer.append(tag);
    people.set(name, { name, ch, tag, seated: true, status: 'idle', doing: '', yaw: seatYaw(name) });
  });

  const plannedTags = planned.map((s) => {
    const el = document.createElement('div');
    el.className = 'w3-tag planned';
    el.innerHTML = `<span class="w3-name">${esc(s.role)}</span><span class="w3-soon">planned seat</span>`;
    tagLayer.append(el);
    return { el, at: to3(s.at, 1.0) };
  });

  // The office dog: a flat sprite that always faces the camera, its feet on the floor.
  let pet = null;
  let petSprite = null;
  const petTex = {};
  if (office.pet === 'dog') {
    await Promise.all(Object.keys(DOG).map(async (anim) => {
      const tx = await loader.loadAsync(sheet(anim));
      tx.magFilter = THREE.NearestFilter;
      tx.minFilter = THREE.NearestFilter;
      tx.colorSpace = THREE.SRGBColorSpace;
      tx.repeat.set(1 / DOG[anim].frames, 1);
      petTex[anim] = tx;
      disposables.push(tx);
    }));
    pet = createPet({ grid, places: petPlaces(map, grid) });
    petSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: petTex.idle, transparent: true, alphaTest: 0.5 }));
    petSprite.center.set(0.5, 0);
    petSprite.scale.set(1.4, 1.4, 1);
    scene.add(petSprite);
    disposables.push(petSprite.material);
  }

  const petTag = pet ? document.createElement('div') : null;
  if (petTag) {
    petTag.className = 'w3-tag pet';
    petTag.dataset.pet = '1';
    petTag.title = 'Follow the dog';
    petTag.innerHTML = '<span class="w3-name">Office dog</span>';
    tagLayer.append(petTag);
  }

  // Room names, laid along each room's bottom edge.
  const roomTags = map.rooms.filter((r) => r.kind !== 'other').map((r) => {
    const el = document.createElement('div');
    el.className = `wv-room k-${r.kind}`;
    el.textContent = r.name;
    tagLayer.append(el);
    return { el, at: to3([(r.box[0] + r.box[2]) / 2, r.box[3] - 28], 0.05) };
  });
  root.querySelector('.w3-loading').remove();

  // ---- what each person does, from the crowd ----
  const standUp = (p) => {
    if (!p.seated) return;
    p.seated = false;
    p.ch.liftTo(0, 0.35);
    p.ch.setLayers({});
  };
  const settle = (p) => {
    const c = crowd.actors.get(p.name);
    if (c.atSeat) {
      p.seated = true;
      p.yaw = seatYaw(p.name);
      p.ch.root.rotation.y = p.yaw;
      p.ch.transition('Sitting', 0.8);
      p.ch.setLayers(HANDS[p.status] || HANDS.idle);
    } else if (perches.has(c.at.join())) {
      // A chair in the boardroom or the lounge: it sits down for a while.
      p.seated = true;
      p.yaw = yawOf(perches.get(c.at.join()));
      p.ch.root.rotation.y = p.yaw;
      p.ch.transition('Sitting', 0.8);
      p.ch.setLayers(HANDS.idle);
    } else {
      p.ch.play('Idle', 0.3);
      // Face the middle of the room it stopped in, roughly: towards the map centre is good enough.
      p.yaw = Math.atan2(-c.at[0], -c.at[1]);
    }
  };

  // ---- the ways to look: the overview (Top, Angle), on foot (Walk), and riding along with an agent ----
  // The visitor on foot: where they stand (map units), which way they look (yaw, as people's yaw: 0 is down the map)
  // and how far up or down (pitch).
  const start = map.entrance || { at: map.rooms.find((r) => r.kind === 'meet')?.box.reduce((s, v, i) => (s[i % 2] += v / 2, s), [0, 0]) || [0, 0], face: 'up' };
  const me = { at: [...start.at], yaw: yawOf(start.face), pitch: -0.05 };
  const look = { yaw: 0, pitch: 0 }; // while riding: how far the rider's own view is turned away from where it faces
  let mode = 'angle';
  let rider = null; // { name, eyes }
  let following = null;
  const held = new Set();
  const inside = () => mode === 'walk' || mode === 'ride';
  const roomAt = ([x, y]) => map.rooms.find((r) => x >= r.box[0] && x <= r.box[2] && y >= r.box[1] && y <= r.box[3]);

  const setMode = (m) => {
    const was = inside();
    mode = m;
    controls.enabled = !inside();
    camera.fov = inside() ? 70 : 40;
    camera.near = inside() ? 0.05 : 0.1;
    camera.updateProjectionMatrix();
    wallGoal = inside() ? WALL.high : WALL.low;
    root.classList.toggle('inside', inside());
    pad.hidden = mode !== 'walk';
    mini.hidden = !inside();
    where.hidden = !inside();
    eyesBtn.hidden = mode !== 'ride';
    for (const b of root.querySelectorAll('[data-v]')) b.setAttribute('aria-pressed', String(b.dataset.v === mode || (b.dataset.v === 'eyes' && !!rider?.eyes)));
    if (!inside()) {
      held.clear();
      ceiling.visible = false;
      if (was) for (const p of people.values()) p.ch.root.visible = true;
    }
  };
  const setView = (v) => {
    rideWith(null);
    setMode(v);
    const { pos, target } = views[v]();
    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
  };
  const walkIn = () => {
    follow(null);
    rideWith(null);
    if (!standable(map, ...me.at)) {
      // Back to the way in, or the nearest open floor to it.
      const cell = standable(map, ...start.at) ? null : nearestFree(grid, ...start.at);
      me.at = cell ? grid.toPoint(...cell) : [...start.at];
    }
    setMode('walk');
    root.focus({ preventScroll: true });
    showHelp('Walk with W A S D or the arrow keys, drag to look around, hold Shift to run. Esc takes you back to the overview.');
  };
  const rideWith = (name) => {
    if (rider) {
      const p = people.get(rider.name);
      if (p) p.ch.root.visible = true;
    }
    rider = name && people.has(name) ? { name, eyes: rider?.eyes ?? false } : null;
    look.yaw = 0;
    look.pitch = 0;
    if (!rider) {
      stopBtn.hidden = !following;
      return;
    }
    follow(null);
    setMode('ride');
    stopBtn.hidden = false;
    stopBtn.textContent = `Stop riding with ${gemName(name)}`;
    eyesBtn.textContent = rider.eyes ? 'Over the shoulder' : 'Through their eyes';
    root.focus({ preventScroll: true });
    showHelp(`Riding along with ${gemName(name)}. Drag to look around; Esc to stop.`);
  };
  let helpTimer = 0;
  const showHelp = (text) => {
    help.textContent = text;
    help.hidden = false;
    clearTimeout(helpTimer);
    helpTimer = setTimeout(() => {
      help.hidden = true;
    }, 7000);
  };

  // Keys move the visitor; dragging turns the view (the visitor's, or the rider's own look).
  const keyOn = (name) => KEYS[name].some((k) => held.has(k));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && inside()) {
      setView('angle');
      return;
    }
    if (mode !== 'walk' || !MOVE_KEYS.has(e.code) || e.metaKey || e.ctrlKey || e.altKey) return;
    held.add(e.code);
    e.preventDefault();
  });
  root.addEventListener('keyup', (e) => held.delete(e.code));
  root.addEventListener('blur', () => held.clear());
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (inside()) drag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointermove', onDrag);
  function onDrag(e) {
    if (!drag || !inside()) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    const view = mode === 'walk' ? me : look;
    view.yaw -= dx * 0.005;
    view.pitch = Math.max(-1.1, Math.min(0.9, view.pitch - dy * 0.004));
  }
  const endDrag = () => {
    drag = null;
  };
  window.addEventListener('pointerup', endDrag);
  // The on-screen arrows, held down like keys.
  pad.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-move]');
    if (!b) return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    held.add(KEYS[b.dataset.move][0]);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    pad.addEventListener(type, (e) => {
      const b = e.target.closest('[data-move]');
      if (b) held.delete(KEYS[b.dataset.move][0]);
    });
  }

  // The mini-map in a corner while you are inside: the floor, the walls, everyone, and you.
  const miniScale = 170 / Math.max(map.w, map.h);
  mini.width = Math.round(map.w * miniScale);
  mini.height = Math.round(map.h * miniScale);
  const mctx = mini.getContext('2d');
  const toMini = ([x, y]) => [(x + map.w / 2) * miniScale, (y + map.h / 2) * miniScale];
  let miniAt = 0;
  const drawMini = (now) => {
    if (now - miniAt < 90) return;
    miniAt = now;
    mctx.clearRect(0, 0, mini.width, mini.height);
    for (const f of floorPics) {
      const [x1, y1] = toMini(f.box.slice(0, 2));
      const [x2, y2] = toMini(f.box.slice(2));
      mctx.globalAlpha = 0.75;
      mctx.drawImage(f.image, x1, y1, x2 - x1, y2 - y1);
    }
    mctx.globalAlpha = 1;
    mctx.strokeStyle = 'rgba(255, 255, 255, .55)';
    mctx.lineWidth = 1;
    mctx.beginPath();
    for (const [x1, y1, x2, y2] of map.walls) {
      mctx.moveTo(...toMini([x1, y1]));
      mctx.lineTo(...toMini([x2, y2]));
    }
    mctx.stroke();
    for (const c of crowd.actors.values()) {
      const [x, y] = toMini(c.at);
      mctx.fillStyle = rider?.name === c.name ? '#ffd60a' : '#2fd27c';
      mctx.beginPath();
      mctx.arc(x, y, rider?.name === c.name ? 4 : 2.6, 0, Math.PI * 2);
      mctx.fill();
    }
    if (mode === 'walk') {
      const [x, y] = toMini(me.at);
      const a = Math.atan2(Math.cos(me.yaw), Math.sin(me.yaw)); // the screen angle of where you look
      mctx.fillStyle = '#ffffff';
      mctx.beginPath();
      mctx.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
      mctx.lineTo(x + Math.cos(a + 2.5) * 5, y + Math.sin(a + 2.5) * 5);
      mctx.lineTo(x + Math.cos(a - 2.5) * 5, y + Math.sin(a - 2.5) * 5);
      mctx.fill();
    }
  };

  // ---- the loop ----
  let raf = 0;
  let last = performance.now();
  const v = new THREE.Vector3();
  const head = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const size = { w: 1, h: 1 };
  let shownRoom = '';
  // Inside, a tag behind a wall stays hidden: a ray from the eye to the tag, checked a few times a second.
  const sight = new THREE.Raycaster();
  const seen = new Map(); // tag -> { at, hidden }
  const behindWall = (el, world, now) => {
    const was = seen.get(el);
    if (was && now - was.at < 250) return was.hidden;
    aim.copy(world).sub(camera.position);
    const far = aim.length();
    sight.set(camera.position, aim.normalize());
    sight.far = Math.max(0, far - 0.1);
    const hidden = sight.intersectObject(walls, false).length > 0;
    seen.set(el, { at: now, hidden });
    return hidden;
  };
  const placeTag = (el, world, now = 0) => {
    v.copy(world).project(camera);
    const hidden = v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1 || (inside() && behindWall(el, world, now));
    el.classList.toggle('off', hidden);
    if (!hidden) el.style.transform = `translate(${((v.x + 1) / 2) * size.w}px, ${((1 - v.y) / 2) * size.h}px) translate(-50%, -100%)`;
  };
  // Where the camera looks from yaw and pitch, standing at `from` (a Vector3).
  const lookFrom = (from, yaw, pitch) => {
    aim.set(from.x + Math.sin(yaw) * Math.cos(pitch), from.y + Math.sin(pitch), from.z + Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(aim);
  };
  const walkStep = (dt) => {
    const turn = (keyOn('turnL') ? 1 : 0) - (keyOn('turnR') ? 1 : 0);
    me.yaw += turn * WALK.turn * dt;
    const fwd = (keyOn('fwd') ? 1 : 0) - (keyOn('back') ? 1 : 0);
    const side = (keyOn('right') ? 1 : 0) - (keyOn('left') ? 1 : 0);
    if (fwd || side) {
      const speed = (keyOn('run') ? WALK.run : WALK.speed) * dt;
      const norm = Math.hypot(fwd, side);
      // Forward is where you look; your right hand is a quarter turn clockwise from it, seen from above.
      const dx = ((Math.sin(me.yaw) * fwd - Math.cos(me.yaw) * side) / norm) * speed;
      const dy = ((Math.cos(me.yaw) * fwd + Math.sin(me.yaw) * side) / norm) * speed;
      me.at = stepWithin(map, me.at, [dx, dy]);
    }
    camera.position.set(me.at[0] * M, EYE, me.at[1] * M);
    lookFrom(camera.position, me.yaw, me.pitch);
  };
  const rideStep = (dt) => {
    const p = people.get(rider.name);
    const c = crowd.actors.get(rider.name);
    const yaw = p.ch.root.rotation.y + look.yaw;
    p.ch.root.visible = !rider.eyes;
    if (rider.eyes) {
      const eyeH = p.seated ? 0.86 : 1.08;
      camera.position.set(c.at[0] * M + Math.sin(yaw) * 0.12, eyeH, c.at[1] * M + Math.cos(yaw) * 0.12);
      lookFrom(camera.position, yaw, look.pitch + (p.seated ? -0.32 : -0.08));
      return;
    }
    // Over the shoulder: behind and a little above, eased so the camera glides rather than jerks.
    const back = p.seated ? 1.7 : 2.0;
    head.set(c.at[0] * M - Math.sin(yaw) * back + Math.cos(yaw) * 0.3, p.seated ? 1.5 : 1.65, c.at[1] * M - Math.cos(yaw) * back - Math.sin(yaw) * 0.3);
    // Never put the camera through a wall: pull it in towards the agent until it stands clear.
    for (let k = 0; k < 6 && !standable(map, head.x / M, head.z / M, 12); k++) head.lerp(v.set(c.at[0] * M, head.y, c.at[1] * M), 0.3);
    camera.position.lerp(head, Math.min(1, dt * 5));
    const ahead = to3(c.at, p.seated ? 0.55 : 0.75).add(v.set(Math.sin(yaw) * 1.1, look.pitch * 1.5, Math.cos(yaw) * 1.1));
    camera.lookAt(ahead);
  };
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const arrived = crowd.advance(dt);
    for (const p of people.values()) {
      const c = crowd.actors.get(p.name);
      if (c.path) {
        standUp(p);
        if (p.ch.base !== 'Walking') p.ch.play('Walking', 0.25);
        p.ch.setWalkRate(Math.max(0.4, (SPEED * M) / (p.ch.rig.walkSpeed || 1)));
        p.yaw = Math.atan2(c.heading[0], c.heading[1]);
      }
      // Turn smoothly towards where it is going.
      const dy = Math.atan2(Math.sin(p.yaw - p.ch.root.rotation.y), Math.cos(p.yaw - p.ch.root.rotation.y));
      p.ch.root.rotation.y += dy * Math.min(1, dt * 8);
      p.ch.root.position.set(c.at[0] * M, 0, c.at[1] * M);
      p.ch.update(dt);
    }
    for (const name of arrived) settle(people.get(name));
    if (pet) {
      pet.step(dt);
      const pv = pet.look();
      const tx = petTex[pv.anim];
      if (petSprite.material.map !== tx) {
        petSprite.material.map = tx;
        petSprite.material.needsUpdate = true;
      }
      const n = DOG[pv.anim].frames;
      tx.repeat.x = (pv.left ? -1 : 1) / n; // a negative repeat mirrors the frame, so the dog faces where it runs
      tx.offset.x = (pv.left ? pv.frame + 1 : pv.frame) / n;
      petSprite.position.set(pv.at[0] * M, 0, pv.at[1] * M);
    }
    // Walls go up as you step inside and down as you leave; the ceiling closes over you once they are up.
    if (Math.abs(wallNow - wallGoal) > 0.001) {
      wallNow += (wallGoal - wallNow) * Math.min(1, dt * 4);
      if (Math.abs(wallNow - wallGoal) < 0.01) wallNow = wallGoal;
      setWalls(wallNow);
    }
    ceiling.visible = inside() && wallNow > WALL.high - 0.05;
    if (mode === 'walk') walkStep(dt);
    else if (mode === 'ride' && rider) rideStep(dt);
    else {
      if (following) {
        const goal = following === PET ? to3(pet.look().at, 0.3) : to3(crowd.actors.get(following).at, 0.6);
        const step = goal.sub(controls.target).multiplyScalar(Math.min(1, dt * 3));
        controls.target.add(step);
        camera.position.add(step);
      }
      controls.update();
    }
    // Tags after the camera has moved, so they sit on what they name.
    for (const p of people.values()) {
      const c = crowd.actors.get(p.name);
      if (rider?.name === p.name) p.tag.classList.add('off'); // the corner chip already says who you ride with
      else placeTag(p.tag, head.set(c.at[0] * M, p.seated ? 1.0 : 1.4, c.at[1] * M), now);
    }
    if (pet) placeTag(petTag, head.set(pet.look().at[0] * M, 0.95, pet.look().at[1] * M), now);
    for (const r of roomTags) placeTag(r.el, r.at);
    for (const s of plannedTags) placeTag(s.el, s.at, now);
    if (inside()) {
      drawMini(now);
      const spot = mode === 'walk' ? me.at : crowd.actors.get(rider.name).at;
      const room = roomAt(spot)?.name || 'Hallway';
      const text = mode === 'walk' ? `You are in the ${room}` : `${gemName(rider.name)} · ${room}`;
      if (text !== shownRoom) where.textContent = shownRoom = text;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const timer = setInterval(() => crowd.tick(), 1200);

  const resize = () => {
    const r = root.getBoundingClientRect();
    size.w = Math.max(1, r.width);
    size.h = Math.max(1, r.height);
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  resize();
  setView('angle');

  // ---- clicks: a person (on the canvas or its tag) opens a card ----
  const showCard = (name) => {
    const p = people.get(name);
    if (!p) return;
    const st = normalizeState(p.status);
    pop.innerHTML = `<b>${esc(gemName(name))}</b><span class="muted"> · ${esc(label(name))}</span><div><span class="st-pill st-${esc(st)}">${esc(STATE_LABEL[st])}</span></div>${p.doing ? `<p>${esc(p.doing)}</p>` : ''}<div class="w3-pop-actions"><button type="button" class="small" data-follow="${esc(name)}">Follow</button><button type="button" class="small" data-ride="${esc(name)}">Ride along</button><button type="button" class="small primary" data-open="${esc(name)}">Open its page</button></div>`;
    pop.hidden = false;
  };
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects([...people.values()].map((p) => p.ch.root), true).find((h) => h.object.userData.agent);
    if (hit) showCard(hit.object.userData.agent);
    else pop.hidden = true;
  });
  tagLayer.addEventListener('click', (e) => {
    const t = e.target.closest('.w3-tag');
    if (t?.dataset.pet) follow(PET);
    else if (t) showCard(t.dataset.agent);
  });
  function follow(name) {
    following = name === PET && pet ? PET : name && people.has(name) ? name : null;
    if (following && inside()) {
      rideWith(null);
      setMode('angle');
    }
    stopBtn.hidden = !following && !rider;
    if (following) stopBtn.textContent = `Stop following ${following === PET ? 'the dog' : gemName(following)}`;
  }
  pop.addEventListener('click', (e) => {
    const f = e.target.closest('[data-follow]');
    if (f) {
      follow(f.dataset.follow);
      pop.hidden = true;
    }
    const rd = e.target.closest('[data-ride]');
    if (rd) {
      rideWith(rd.dataset.ride);
      pop.hidden = true;
    }
    const o = e.target.closest('[data-open]');
    if (o) onOpen?.(o.dataset.open);
  });
  root.querySelector('.wv-tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    if (b.dataset.v === 'stop') {
      if (rider) setView('angle');
      follow(null);
    } else if (b.dataset.v === 'eyes') {
      rider.eyes = !rider.eyes;
      eyesBtn.textContent = rider.eyes ? 'Over the shoulder' : 'Through their eyes';
      eyesBtn.setAttribute('aria-pressed', String(rider.eyes));
    } else if (b.dataset.v === 'walk') walkIn();
    else {
      follow(null);
      setView(b.dataset.v);
    }
  });

  return {
    update(agents = []) {
      for (const info of agents) {
        const p = people.get(info.name);
        if (!p) continue;
        const st = normalizeState(info.status);
        p.status = st;
        p.doing = info.doing || '';
        crowd.setStatus(p.name, st);
        if (p.seated) p.ch.setLayers(HANDS[st] || HANDS.idle);
        const bubble = p.tag.querySelector('.wv-doing');
        bubble.hidden = !(AT_SEAT.has(st) && p.doing);
        bubble.textContent = p.doing.length > 60 ? `${p.doing.slice(0, 59)}…` : p.doing;
        p.tag.classList.toggle('busy', st === 'working' || st === 'researching');
      }
    },
    follow,
    ride: (name) => (name ? rideWith(name) : setView('angle')),
    walk: walkIn,
    // For checks: where the visitor stands and looks, and whether the way from there to a point is open.
    visitor: () => ({ mode, at: [...me.at], yaw: me.yaw, room: roomAt(me.at)?.id || null, canReach: (to) => !!findPath(grid, me.at, to) }),
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      clearTimeout(helpTimer);
      window.removeEventListener('pointermove', onDrag);
      window.removeEventListener('pointerup', endDrag);
      ro.disconnect();
      controls.dispose();
      for (const p of people.values()) p.ch.dispose();
      for (const d of disposables) d.dispose();
      kit.dispose();
      renderer.dispose();
      container.innerHTML = '';
    },
  };
}
