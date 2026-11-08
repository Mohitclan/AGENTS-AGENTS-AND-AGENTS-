// An office in 3D, built from its map's logic rather than drawn by hand: the map picture is the floor, the map's
// walls (maps.js, from Nonilion) are raised into real walls, each agent's seat gets a desk and a chair, and the
// agents are the 3D people of the 3D office (office3d/characters.js) walking the same paths as on the 2D map
// (crowd.js, nav.js). An agent with work sits at its desk and types; an idle one gets up and wanders to the kitchen
// or the boardroom and back.
//
//   const view = await createWorld3D(container, { office, map, label, onOpen })
//   view.update(agents)   agents as in the page's state: { name, status, doing }
//   view.follow(name)     keep the camera on one agent (null to stop)
//   view.destroy()
//
// Map units become metres at 100 to 1 (a 3000-unit map is a 30 m floor). Drag to orbit, right-drag or arrow keys to
// pan, scroll to zoom. Name tags are page elements placed over the canvas each frame.
import * as THREE from '/vendor/three/build/three.module.js';
import { OrbitControls } from '/vendor/three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from '/vendor/three/examples/jsm/utils/BufferGeometryUtils.js';
import { identityFor } from '../gems/identities.js';
import { normalizeState, STATE_LABEL } from '../gems/status.js';
import { Character, loadRig } from '../office3d/characters.js';
import { AT_SEAT, createCrowd, officeLayout, SPEED } from './crowd.js';
import { buildGrid } from './nav.js';

const M = 0.01; // metres per map unit
const WALL = { height: 1.05, thick: 0.14 };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// What a seated agent's hands do, by what it is doing (the layers of office3d/characters.js).
const HANDS = { working: { type: 1 }, researching: { read: 1 }, waiting: { wait: 1 }, error: { think: 1 }, success: { rest: 1 }, idle: { rest: 1 } };

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
  const { seats, planned, wander } = officeLayout(office, map, grid);
  const crowd = createCrowd({ grid, seats, wander });
  const gemName = (name) => (identityFor(name).name === name ? label(name) : identityFor(name).name);
  const to3 = ([x, y], h = 0) => new THREE.Vector3(x * M, h, y * M);

  container.innerHTML = `
    <div class="w3" tabindex="0" aria-label="${esc(office.name)} in 3D">
      <canvas class="w3-canvas"></canvas>
      <div class="w3-tags"></div>
      <div class="w3-loading">Building the 3D office…</div>
      <div class="wv-tools">
        <button type="button" data-v="top">Top</button>
        <button type="button" data-v="angle">Angle</button>
        <button type="button" data-v="stop" hidden>Stop following</button>
      </div>
      <div class="wv-pop" hidden></div>
    </div>`;
  const root = container.querySelector('.w3');
  const canvas = root.querySelector('.w3-canvas');
  const tagLayer = root.querySelector('.w3-tags');
  const pop = root.querySelector('.wv-pop');
  const stopBtn = root.querySelector('[data-v="stop"]');

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
  const span = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); // visible height per metre of distance
  const views = {
    angle: () => {
      const up = THREE.MathUtils.degToRad(55);
      const d = (Math.max(H * Math.sin(up), W / camera.aspect) / span) * 1.08;
      return { pos: new THREE.Vector3(0, d * Math.sin(up), d * Math.cos(up) + H * 0.04), target: new THREE.Vector3(0, 0, H * 0.04) };
    },
    top: () => ({ pos: new THREE.Vector3(0, (Math.max(H, W / camera.aspect) / span) * 1.05, 0.01), target: new THREE.Vector3(0, 0, 0) }),
  };
  const setView = (v) => {
    const { pos, target } = views[v]();
    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
  };
  setView('angle');
  scene.add(new THREE.HemisphereLight(0xe2ecff, 0x1c2130, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.9);
  sun.position.set(W * 0.4, 28, H * 0.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const reach = Math.max(W, H) / 2 + 1;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 80 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // ---- the floor: the map picture ----
  const disposables = [];
  const floorTex = await new THREE.TextureLoader().loadAsync(`/${map.image}`);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  disposables.push(floor.geometry, floor.material, floorTex);

  // ---- the walls: each line raised into a low wall with a lit top edge, merged into two meshes ----
  const wallParts = [];
  const capParts = [];
  for (const [x1, y1, x2, y2] of map.walls) {
    const len = Math.hypot(x2 - x1, y2 - y1) * M;
    if (len < 0.05) continue;
    const angle = -Math.atan2(y2 - y1, x2 - x1);
    const mid = to3([(x1 + x2) / 2, (y1 + y2) / 2]);
    const g = new THREE.BoxGeometry(len + WALL.thick, WALL.height, WALL.thick);
    g.rotateY(angle);
    g.translate(mid.x, WALL.height / 2, mid.z);
    wallParts.push(g);
    const c = new THREE.BoxGeometry(len + WALL.thick, 0.04, WALL.thick + 0.02);
    c.rotateY(angle);
    c.translate(mid.x, WALL.height + 0.02, mid.z);
    capParts.push(c);
  }
  const accent = new THREE.Color(office.accent || '#4c8dff');
  const walls = new THREE.Mesh(mergeGeometries(wallParts), new THREE.MeshStandardMaterial({ color: 0x343c52, roughness: 0.62, metalness: 0.35 }));
  walls.castShadow = true;
  walls.receiveShadow = true;
  const caps = new THREE.Mesh(mergeGeometries(capParts), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.7 }));
  scene.add(walls, caps);
  for (const g of [...wallParts, ...capParts]) g.dispose();
  disposables.push(walls.geometry, walls.material, caps.geometry, caps.material);

  // ---- the people ----
  const names = [...seats.keys()];
  const rigs = await Promise.all(names.map((n) => loadRig('people', n)));
  const rig0 = rigs[0];

  // A desk and a chair at each seat. Seated agents face +z (towards the default camera), the desk in front of them.
  const deskTop = (rig0?.seatHeight ?? 0.32) + (rig0?.deskRise ?? 0.21);
  const mat = {
    desk: new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 0.55 }),
    leg: new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.5, metalness: 0.6 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x24324f, roughness: 0.8 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x0d1220, emissive: accent, emissiveIntensity: 0.55 }),
  };
  disposables.push(...Object.values(mat));
  const furniture = new THREE.Group();
  const box = (w, h, d, m, x, y, z, parent) => {
    const g = new THREE.BoxGeometry(w, h, d);
    disposables.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // Planned roles get the same desk, empty, until their agent exists.
  for (const seat of [...seats.values(), ...planned.map((s) => s.at)]) {
    const p = to3(seat);
    const g = new THREE.Group();
    g.position.copy(p);
    box(0.95, 0.05, 0.5, mat.desk, 0, deskTop - 0.025, 0.5, g);
    for (const sx of [-0.42, 0.42]) box(0.05, deskTop - 0.05, 0.42, mat.leg, sx, (deskTop - 0.05) / 2, 0.5, g);
    const screen = box(0.42, 0.26, 0.02, mat.screen, 0, deskTop + 0.15, 0.66, g);
    screen.rotation.x = -0.15;
    const sh = rig0?.seatHeight ?? 0.32;
    const back = -(rig0?.sitBack ?? 0.2);
    box(0.4, 0.06, 0.38, mat.seat, 0, sh - 0.03, back, g);
    box(0.38, 0.4, 0.05, mat.seat, 0, sh + 0.22, back - 0.2, g);
    box(0.04, sh - 0.06, 0.04, mat.leg, 0, (sh - 0.06) / 2, back, g);
    furniture.add(g);
  }
  scene.add(furniture);

  const people = new Map();
  names.forEach((name, i) => {
    const id = identityFor(name);
    const ch = new Character(rigs[i], { name, color: id.theme?.primary || '#a58ff0' });
    ch.root.position.copy(to3(seats.get(name)));
    ch.root.rotation.y = 0;
    ch.sitNow();
    ch.setLayers(HANDS.idle);
    scene.add(ch.root);
    const tag = document.createElement('button');
    tag.type = 'button';
    tag.className = 'w3-tag';
    tag.dataset.agent = name;
    tag.innerHTML = `<span class="w3-name">${esc(gemName(name))}</span><span class="wv-doing" hidden></span>`;
    tagLayer.append(tag);
    people.set(name, { name, ch, tag, seated: true, status: 'idle', doing: '', yaw: 0 });
  });

  const plannedTags = planned.map((s) => {
    const el = document.createElement('div');
    el.className = 'w3-tag planned';
    el.innerHTML = `<span class="w3-name">${esc(s.role)}</span><span class="w3-soon">planned seat</span>`;
    tagLayer.append(el);
    return { el, at: to3(s.at, 1.0) };
  });

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
      p.yaw = 0;
      p.ch.root.rotation.y = 0;
      p.ch.transition('Sitting', 0.8);
      p.ch.setLayers(HANDS[p.status] || HANDS.idle);
    } else {
      p.ch.play('Idle', 0.3);
      // Face the middle of the room it stopped in, roughly: towards the map centre is good enough.
      p.yaw = Math.atan2(-c.at[0], -c.at[1]);
    }
  };

  // ---- the loop ----
  let following = null;
  let raf = 0;
  let last = performance.now();
  const v = new THREE.Vector3();
  const head = new THREE.Vector3();
  const size = { w: 1, h: 1 };
  const placeTag = (el, world) => {
    v.copy(world).project(camera);
    const hidden = v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1;
    el.classList.toggle('off', hidden);
    if (!hidden) el.style.transform = `translate(${((v.x + 1) / 2) * size.w}px, ${((1 - v.y) / 2) * size.h}px) translate(-50%, -100%)`;
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
      placeTag(p.tag, head.set(c.at[0] * M, p.seated ? 1.0 : 1.4, c.at[1] * M));
    }
    for (const name of arrived) settle(people.get(name));
    for (const r of roomTags) placeTag(r.el, r.at);
    for (const s of plannedTags) placeTag(s.el, s.at);
    if (following) {
      const c = crowd.actors.get(following);
      const goal = to3(c.at, 0.6);
      const step = goal.sub(controls.target).multiplyScalar(Math.min(1, dt * 3));
      controls.target.add(step);
      camera.position.add(step);
    }
    controls.update();
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
    pop.innerHTML = `<b>${esc(gemName(name))}</b><span class="muted"> · ${esc(label(name))}</span><div><span class="st-pill st-${esc(st)}">${esc(STATE_LABEL[st])}</span></div>${p.doing ? `<p>${esc(p.doing)}</p>` : ''}<div class="w3-pop-actions"><button type="button" class="small" data-follow="${esc(name)}">Follow</button><button type="button" class="small primary" data-open="${esc(name)}">Open its page</button></div>`;
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
    if (t) showCard(t.dataset.agent);
  });
  const follow = (name) => {
    following = name && people.has(name) ? name : null;
    stopBtn.hidden = !following;
    stopBtn.textContent = following ? `Stop following ${gemName(following)}` : 'Stop following';
  };
  pop.addEventListener('click', (e) => {
    const f = e.target.closest('[data-follow]');
    if (f) {
      follow(f.dataset.follow);
      pop.hidden = true;
    }
    const o = e.target.closest('[data-open]');
    if (o) onOpen?.(o.dataset.open);
  });
  root.querySelector('.wv-tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    if (b.dataset.v === 'stop') follow(null);
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
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      ro.disconnect();
      controls.dispose();
      for (const p of people.values()) p.ch.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      container.innerHTML = '';
    },
  };
}
