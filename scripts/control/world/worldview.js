// One office's live map: the map picture, its rooms named, and the office's agents as Gem avatars that walk the
// corridors. Where an agent goes follows what it is doing:
//   working, researching, waiting, error, done   at its own seat, in its room (offices.js)
//   idle                                         now and then gets up: the break room, the meeting room, back
// An office with no team yet shows its planned seats instead.
//
//   const world = createWorld(container, { office, map, onOpen })
//   world.update(agents)     agents as in the page's state: { name, status, doing }
//   world.destroy()
//
// Pan by dragging, zoom with the wheel or the buttons. Agents and labels are elements on a stage that is moved with
// a CSS transform, set from JavaScript (the page's security policy refuses inline style attributes in markup).
import { avatarHTML, mountAvatars, setAvatarStatus } from '../gems/avatar.js';
import { identityFor } from '../gems/identities.js';
import { normalizeState, STATE_LABEL } from '../gems/status.js';
import { badgeOf, roleText } from './crew.js';
import { AT_SEAT, createCrowd, officeLayout, petPlaces } from './crowd.js';
import { createPet, sheet } from './pet.js';
import { floorsOf } from './maps.js';
import { buildGrid } from './nav.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SPEED = 260; // map units per second: faster than in 3D, so walks read on a small map

export function createWorld(container, { office, map, onOpen, label = (name) => name }) {
  const grid = buildGrid(map);
  // The name on an agent's tag: its Gem name, or its job title when it has no Gem of its own.
  const gemName = (name) => (identityFor(name).name === name ? label(name) : identityFor(name).name);
  const roomById = new Map(map.rooms.map((r) => [r.id, r]));
  const { seats: seatOf, planned, crew, wander } = officeLayout(office, map, grid);
  const crewBy = new Map(crew.map((c) => [c.key, c])); // the office's robots (crew.js): front end only
  const crowd = createCrowd({ grid, seats: seatOf, wander, speed: SPEED });

  container.innerHTML = `
    <div class="wv" tabindex="0" aria-label="${esc(office.name)} map">
      <div class="wv-stage"><canvas class="wv-walls" hidden></canvas></div>
      <div class="wv-tools">
        <button type="button" data-z="in" aria-label="Zoom in">+</button>
        <button type="button" data-z="out" aria-label="Zoom out">−</button>
        <button type="button" data-z="fit">Fit</button>
        <label class="wv-check"><input type="checkbox" data-walls> Show walls</label>
      </div>
      <div class="wv-pop" hidden></div>
    </div>`;
  const root = container.querySelector('.wv');
  root.classList.toggle('pixel', !map.floors); // the Nonilion maps are pixel art: keep their pixels sharp up close
  const stage = root.querySelector('.wv-stage');
  const pop = root.querySelector('.wv-pop');

  // Stage size: one map unit is `unit` pixels on the stage; the view moves and zooms the whole stage.
  const unit = 0.32;
  const sw = map.w * unit;
  const sh = map.h * unit;
  stage.style.width = `${sw}px`;
  stage.style.height = `${sh}px`;
  const toStage = ([x, y]) => [(x + map.w / 2) * unit, (y + map.h / 2) * unit];
  // The floor: one picture, or several laid side by side (maps.js `floors`).
  for (const f of floorsOf(map)) {
    const img = document.createElement('img');
    img.className = 'wv-map';
    img.alt = '';
    img.draggable = false;
    img.src = `/${f.image}`;
    const [x1, y1] = toStage(f.box.slice(0, 2));
    const [x2, y2] = toStage(f.box.slice(2));
    Object.assign(img.style, { width: `${x2 - x1}px`, height: `${y2 - y1}px`, transform: `translate(${x1}px, ${y1}px)` });
    stage.prepend(img);
  }
  const place = (el, p) => {
    const [x, y] = toStage(p);
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`; // centred on the spot
  };

  // Room labels, and the planned seats of an office with no team yet.
  for (const r of map.rooms) {
    if (r.kind === 'other') continue;
    const el = document.createElement('div');
    el.className = `wv-room k-${r.kind}`;
    el.textContent = r.name;
    stage.append(el);
    place(el, [(r.box[0] + r.box[2]) / 2, r.box[3] - 28]); // along the room's bottom edge, clear of the seats
  }
  for (const seat of planned) {
    const el = document.createElement('div');
    el.className = 'wv-planned';
    el.innerHTML = `<span class="wv-chair" aria-hidden="true"></span><span>${esc(seat.role)}</span>`;
    stage.append(el);
    place(el, seat.at);
  }

  // The agents.
  const actors = new Map();
  for (const [name] of seatOf) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'wv-agent';
    el.dataset.agent = name;
    const robot = crewBy.get(name);
    el.innerHTML = robot
      ? `<img class="wv-bot" src="${badgeOf(robot.look)}" alt=""><span class="wv-name">${esc(robot.name)}</span>`
      : `${avatarHTML(name, { size: 'sm', mode: 'badge' })}<span class="wv-name">${esc(gemName(name))}</span><span class="wv-doing" hidden></span>`;
    stage.append(el);
    const at = [...seatOf.get(name)];
    place(el, at);
    actors.set(name, { name, el, status: 'idle', doing: '' });
  }
  mountAvatars(stage);

  // The office dog: a sprite sheet stepped through by a small timer of its own (it moves even when no agent does).
  let petTimer = 0;
  if (office.pet === 'dog') {
    const pet = createPet({ grid, places: petPlaces(map, grid) });
    const el = document.createElement('div');
    el.className = 'wv-pet';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i></i>';
    stage.append(el);
    const sprite = el.firstChild;
    let shown = '';
    let before = performance.now();
    petTimer = setInterval(() => {
      const now = performance.now();
      pet.step(Math.min(0.25, (now - before) / 1000));
      before = now;
      const v = pet.look();
      place(el, v.at);
      if (v.anim !== shown) {
        sprite.style.backgroundImage = `url(${sheet(v.anim)})`;
        shown = v.anim;
      }
      sprite.style.backgroundPosition = `${-v.frame * 64}px 0`;
      el.classList.toggle('left', v.left);
    }, 70);
  }

  // Walking: one animation loop that runs only while someone is on the move. The crowd decides where; this draws.
  let raf = 0;
  let last = 0;
  const run = () => {
    if (raf || !crowd.walking()) return;
    last = performance.now();
    raf = requestAnimationFrame(step);
  };
  function step(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    crowd.advance(dt);
    for (const c of crowd.actors.values()) {
      const a = actors.get(c.name);
      place(a.el, c.at);
      a.el.classList.toggle('walking', !!c.path);
      if (c.path) a.el.classList.toggle('left', c.heading[0] < 0);
    }
    raf = crowd.walking() ? requestAnimationFrame(step) : 0;
  }
  const timer = setInterval(() => {
    if (crowd.tick()) run();
  }, 1200);

  // Pan and zoom.
  let z = 1;
  let tx = 0;
  let ty = 0;
  const apply = () => {
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
    root.classList.toggle('zoomed', z > fitZ * 1.4);
  };
  let fitZ = 1;
  const fit = () => {
    const { width, height } = root.getBoundingClientRect();
    fitZ = Math.min(width / sw, height / sh) * 0.98;
    z = fitZ;
    tx = (width - sw * z) / 2;
    ty = (height - sh * z) / 2;
    apply();
  };
  const zoomAt = (factor, cx, cy) => {
    const nz = Math.min(fitZ * 6, Math.max(fitZ * 0.8, z * factor));
    tx = cx - ((cx - tx) * nz) / z;
    ty = cy - ((cy - ty) * nz) / z;
    z = nz;
    apply();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(root);
  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = root.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  let drag = null;
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, label, .wv-pop')) return;
    drag = { x: e.clientX, y: e.clientY, tx, ty, moved: false };
    root.setPointerCapture(e.pointerId);
  });
  root.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    tx = drag.tx + dx;
    ty = drag.ty + dy;
    apply();
  });
  root.addEventListener('pointerup', () => {
    if (drag && !drag.moved) pop.hidden = true;
    drag = null;
  });
  root.querySelector('.wv-tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-z]');
    if (!b) return;
    const r = root.getBoundingClientRect();
    if (b.dataset.z === 'fit') fit();
    else zoomAt(b.dataset.z === 'in' ? 1.3 : 1 / 1.3, r.width / 2, r.height / 2);
  });

  // "Show walls": the lines agents walk around, and the furniture they step round, to check a map's data.
  const wallsCanvas = root.querySelector('.wv-walls');
  root.querySelector('[data-walls]').addEventListener('change', (e) => {
    wallsCanvas.hidden = !e.target.checked;
    if (wallsCanvas.hidden || wallsCanvas.dataset.drawn) return;
    wallsCanvas.dataset.drawn = '1';
    wallsCanvas.width = sw;
    wallsCanvas.height = sh;
    wallsCanvas.style.width = `${sw}px`;
    wallsCanvas.style.height = `${sh}px`;
    const ctx = wallsCanvas.getContext('2d');
    ctx.strokeStyle = 'rgba(255, 45, 85, .9)';
    ctx.lineWidth = 3;
    for (const [x1, y1, x2, y2] of map.walls) {
      ctx.beginPath();
      ctx.moveTo(...toStage([x1, y1]));
      ctx.lineTo(...toStage([x2, y2]));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 214, 10, .9)';
    ctx.lineWidth = 2;
    for (const b of map.blocks || []) {
      const [cx, cy] = toStage(b.at);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(((b.turn || 0) * Math.PI) / 180);
      ctx.strokeRect((-b.size[0] / 2) * unit, (-b.size[1] / 2) * unit, b.size[0] * unit, b.size[1] * unit);
      ctx.restore();
    }
  });

  // Click an agent: a small card with what it is doing, and a way to its page.
  stage.addEventListener('click', (e) => {
    const el = e.target.closest('.wv-agent');
    if (!el) return;
    const a = actors.get(el.dataset.agent);
    const robot = crewBy.get(a.name);
    if (robot) {
      pop.innerHTML = `<b>${esc(robot.name)}</b><span class="muted"> · ${esc(robot.role)}</span><div><span class="st-pill st-paused">In training</span></div><p>A robot of the ${esc(office.team.toLowerCase())} crew. It has no skills or tasks yet: it shows where the ${esc(roleText(robot.role))} will work.</p>`;
      pop.hidden = false;
      return;
    }
    const st = normalizeState(a.status);
    pop.innerHTML = `<b>${esc(gemName(a.name))}</b><span class="muted"> · ${esc(label(a.name))}</span><div><span class="st-pill st-${esc(st)}">${esc(STATE_LABEL[st])}</span></div>${a.doing ? `<p>${esc(a.doing)}</p>` : ''}<button type="button" class="small primary" data-open="${esc(a.name)}">Open its page</button>`;
    pop.hidden = false;
  });
  pop.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (b) onOpen?.(b.dataset.open);
  });

  return {
    update(agents = []) {
      for (const info of agents) {
        const a = actors.get(info.name);
        if (!a) continue;
        const st = normalizeState(info.status);
        if (st !== a.status) setAvatarStatus(a.el.querySelector('.gem'), st, { agentLabel: label(a.name), doing: info.doing });
        a.status = st;
        a.doing = info.doing || '';
        const bubble = a.el.querySelector('.wv-doing');
        bubble.hidden = !(AT_SEAT.has(st) && a.doing);
        bubble.textContent = a.doing.length > 60 ? `${a.doing.slice(0, 59)}…` : a.doing;
        a.el.classList.toggle('busy', st === 'working' || st === 'researching');
        crowd.setStatus(a.name, st);
        run();
      }
    },
    destroy() {
      clearInterval(timer);
      clearInterval(petTimer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.innerHTML = '';
    },
  };
}
