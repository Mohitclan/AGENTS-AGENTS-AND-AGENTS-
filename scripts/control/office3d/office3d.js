// The living 3D office. Same interface as the 2D office (gems/office.js), so the home and the
// Working page can use either: update(), setSpeed(), showCard(), hideCard(), reset(), destroy().
//
// Where each thing comes from:
// - Live: agent states, what each one is doing, and events (handoffs, results, approvals, web
//   reads) come from the server's real stream. They decide where agents go and what they do.
// - Simulation: the narrated demo (gems/simulator.js) drives the same office; the badge says so.
// - Preview: states you set by hand in the Preview panel, to try the behaviours. Nothing runs.
// - Ambient: what idle agents do between tasks (coffee, window, sofa, a chat). It is never shown
//   as work, and an animation ending never changes a task.
// - Music: the speaker on the rug plays the person's own songs (music/ folder). While one plays,
//   agents with no work dance around it; agents with work stay at their desks.

import * as THREE from '/vendor/three/build/three.module.js';
import { OrbitControls } from '/vendor/three/examples/jsm/controls/OrbitControls.js';
import { identityFor } from '../gems/identities.js';
import { BRAND, drawLockup, LOCKUP_RATIO } from '../gems/logo.js';
import { normalizeState, STATE_LABEL, STATES } from '../gems/status.js';
import { Agent } from './agents.js';
import { ACTIVITIES, initialPrefs, roamNote } from './behavior.js';
import { Character, loadRig } from './characters.js';
import { DESKS, deskFor, SPOTS } from './layout.js';
import { musicPlayer } from './music.js';
import { buildGrid } from './nav.js';
import { buildOffice } from './scene.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// The page's policy refuses inline style attributes in HTML, so a colour travels as data-c and is set here.
const paintDots = (el) => {
  for (const d of el.querySelectorAll('[data-c]')) d.style.setProperty('--c', d.dataset.c);
};
const clip = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const KEY = 'panscience.office3d';
const loadPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};
const savePrefs = (p) => {
  try {
    const { reduced, ...saved } = p; // "reduced" is worked out from `motion`, which is what is kept
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // storage refused: the setting lasts for this visit
  }
};

const VIEWS = {
  overview: { label: 'Overview', pos: [0.5, 14.4, 19.8], target: [0, 0, 0.8] }, // far enough back to see the room as a whole, on its base
  desks: { label: 'Desks', pos: [-5.2, 6.4, 7.2], target: [-5.2, 0.5, -1.2] },
  coffee: { label: 'Coffee & meeting', pos: [6.2, 5.2, 4.6], target: [8.2, 0.9, -4.4] },
  lounge: { label: 'Lounge', pos: [3.8, 4.6, 9.2], target: [9.6, 0.5, 3.0] },
  display: { label: 'Task display', pos: [2.6, 3.2, 2.0], target: [2.6, 1.8, -7.8] },
};

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

export async function createOffice3D(container, { roster = [], immersive = false, onFallback, onRebuild } = {}) {
  // Agents with no work roam by default. Only the person's own "Reduced motion" button keeps them at their desks:
  // the computer's reduce-motion setting calms the camera, but no longer stops the agents (an older save held that
  // setting as "reduced", so it is ignored).
  const osCalm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saved = loadPrefs();
  const prefs = initialPrefs(saved);
  container.innerHTML = `
    <div class="o3${immersive ? ' o3-immersive' : ''}">
      <canvas class="o3-canvas" aria-label="The 3D office. Drag to look around, scroll to zoom, click an agent to see what it is doing."></canvas>
      <div class="o3-labels" aria-hidden="true"></div>
      <div class="o3-stats" aria-label="How many agents are in each state"></div>
      <div class="o3-top">
        <div class="o3-mode" role="status"><i></i><span>Loading the office…</span></div>
        <div class="o3-roam" role="status" hidden></div>
        <div class="o3-tools" role="toolbar" aria-label="Office view">
          <div class="o3-seg" data-views>${Object.entries(VIEWS).map(([k, v]) => `<button type="button" data-view="${k}">${v.label}</button>`).join('')}</div>
          <button type="button" class="o3-btn" data-act="music" aria-pressed="false" title="Play songs on the office speaker. Agents with no work come and dance">♪ Music</button>
          <button type="button" class="o3-btn" data-act="ambient" aria-pressed="${prefs.ambient}" title="Let idle agents get coffee, rest or chat">Ambient</button>
          <button type="button" class="o3-btn" data-act="reduced" aria-pressed="${prefs.reduced}" title="Less movement: idle agents stay at their desks and the camera doesn't glide">Reduced motion</button>
          <button type="button" class="o3-btn" data-act="preview" aria-pressed="false" title="Try agent states without running anything">Preview</button>
          <button type="button" class="o3-btn" data-act="cast" title="Switch between the people and the robots">${prefs.cast === 'robot' ? 'People' : 'Robots'}</button>
          <button type="button" class="o3-btn" data-act="flat" title="Switch to the flat office">2D</button>
        </div>
      </div>
      <aside class="o3-panel" hidden aria-live="polite"></aside>
      <section class="o3-preview" hidden aria-label="Preview states"></section>
      <section class="o3-music" hidden aria-label="Music"></section>
      <div class="o3-caption"></div>
      <div class="o3-loading"><div class="o3-spin"></div><p>Building the office…</p></div>
    </div>`;
  const root = container.querySelector('.o3');
  const $ = (s) => root.querySelector(s);
  const canvas = $('.o3-canvas');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // The cast: one person per agent (Kenney's Mini Characters), or the robot if they can't load.
  const names = (roster.length ? roster.map((a) => a.name) : DESKS.map((d) => d.agent)).filter((n) => deskFor(n));
  let cast = prefs.cast === 'robot' ? 'robot' : 'people';
  let rigs;
  try {
    rigs = await Promise.all(names.map((n) => loadRig(cast, n)));
  } catch (error) {
    if (cast === 'robot') throw error;
    console.warn('3D office: the people did not load, using the robot', error);
    cast = 'robot';
    rigs = await Promise.all(names.map((n) => loadRig(cast, n)));
  }
  const rig = rigs[0];
  const office = buildOffice({ seatHeight: rig.seatHeight, sitBack: rig.sitBack, deskRise: rig.deskRise, renderer });
  const { scene } = office;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(...VIEWS.overview.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...VIEWS.overview.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2.5;
  controls.maxDistance = 30;
  controls.maxPolarAngle = 1.38;
  controls.minPolarAngle = 0.15;
  controls.screenSpacePanning = true;
  controls.update();

  // ---- agents ----
  const grid = buildGrid();
  const world = {
    agents: new Map(),
    claims: new Map(),
    grid,
    rig,
    ambient: prefs.ambient,
    reduced: prefs.reduced,
    lastAmbient: -Infinity,
    party: false, // a song is playing: idle agents dance round the speaker
    spotsOf: (kind) => SPOTS.filter((s) => s.kind === kind),
    showCounterMug: (id, on) => {
      const m = office.mugs.get(id);
      if (m) m.visible = on;
    },
    counterPoint: (s) => new THREE.Vector3(s.mug?.x ?? s.x, 1.0, s.mug?.z ?? s.z - 1),
    monitorPoint: (name) => office.monitors.get(name)?.lookAt || null,
    displayPoint: () => office.display.center,
    headOf: (a) => new THREE.Vector3(a.pos.x, a.pose === 'sit' ? rig.sitTop - 0.15 : rig.height - 0.2, a.pos.z),
    outside: (p) => new THREE.Vector3(p.x + (Math.random() - 0.5) * 6, 1.4 + Math.random(), -14),
  };
  // Says why agents stay seated when the person's own settings are the reason; hidden when they are free to roam.
  function paintRoamNote() {
    const note = roamNote({ ambient: world.ambient, reduced: world.reduced });
    const el = $('.o3-roam');
    el.textContent = note;
    el.hidden = !note;
  }
  paintRoamNote();

  const labels = $('.o3-labels');
  const pickables = [];
  names.forEach((name, index) => {
    const id = identityFor(name);
    const character = new Character(rigs[index], { name, color: id.theme?.primary || '#a58ff0' });
    scene.add(character.root);
    const agent = new Agent({ name, index, character, world });
    world.agents.set(name, agent);
    pickables.push(...character.meshes);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'o3-label';
    el.dataset.agent = name;
    el.style.setProperty('--c', id.theme?.primary || '#a58ff0');
    el.innerHTML = `<span class="o3-name">${esc(id.name)}</span><span class="o3-pill"></span><span class="o3-bubble" hidden></span>`;
    labels.append(el);
    agent.label = el;
  });

  // selection ring
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 40), new THREE.MeshBasicMaterial({ color: 0xb49cff, transparent: true, opacity: 0.9, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  ring.visible = false;
  scene.add(ring);

  // ---- state ----
  let mode = 'live'; // live | sim | preview
  let speed = 1;
  let clock = 0;
  let selected = null;
  let following = false;
  let latest = { agents: [], kpis: null, running: null, board: null };
  const preview = new Map();
  const lastWeb = new Map();

  function applyStates(list, source) {
    for (const a of list || []) {
      const ag = world.agents.get(a.name);
      if (!ag) continue;
      ag.setStatus(normalizeState(a.status), a.doing || '', source, clock);
    }
  }

  // ---- screens ----
  const SCREEN_BG = { idle: ['#231c44', '#3a2d6e'], working: ['#14122a', '#1f1b3d'], researching: ['#f5f7ff', '#e6ebff'], waiting: ['#3a2a07', '#5a4210'], error: ['#3a0d18', '#5c1426'], success: ['#0d3324', '#15523a'], paused: ['#2a2a33', '#3a3a46'] };
  function drawMonitor(name) {
    const m = office.monitors.get(name);
    const ag = world.agents.get(name);
    if (!m || !ag) return;
    const { ctx, canvas: c } = m;
    const st = ag.status;
    const act = ag.goal?.activity;
    const [a, b] = SCREEN_BG[st] || SCREEN_BG.idle;
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.textBaseline = 'top';
    const t = Math.floor(clock / 600);
    if (st === 'working' && (act === 'coding' || ag.name === 'developer')) {
      ctx.font = '18px ui-monospace, monospace';
      const cols = ['#b49cff', '#7fd9b4', '#ffd18f', '#8fd3ff', '#ff9cc2'];
      for (let i = 0; i < 12; i++) {
        const k = (i + t) % 17;
        ctx.fillStyle = cols[k % cols.length];
        const indent = (k % 4) * 22;
        ctx.fillRect(20 + indent, 16 + i * 23, 80 + ((k * 53) % 260), 10);
      }
    } else if (st === 'working') {
      ctx.fillStyle = '#f7f5ff';
      ctx.fillRect(40, 18, c.width - 80, c.height - 36);
      ctx.fillStyle = '#4c3d8a';
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.fillText(clip(ag.doing || 'Draft', 38), 58, 30);
      ctx.fillStyle = '#c8c0e6';
      const lines = 4 + (t % 6);
      for (let i = 0; i < lines; i++) ctx.fillRect(58, 70 + i * 22, c.width - 140 - ((i * 37) % 120), 9);
    } else if (st === 'researching') {
      ctx.fillStyle = '#d9def3';
      ctx.fillRect(0, 0, c.width, 34);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 7, c.width - 28, 20);
      ctx.fillStyle = '#44507a';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(clip(lastWeb.get(name) || ag.doing || 'Searching the web', 54), 22, 10);
      ctx.fillStyle = '#8fa0d8';
      for (let i = 0; i < 7; i++) ctx.fillRect(24, 52 + i * 32 - ((t * 6) % 32), c.width - 60 - ((i * 41) % 140), 12);
    } else {
      ctx.textAlign = 'center';
      ctx.fillStyle = st === 'idle' ? '#cdbfff' : '#ffffff';
      ctx.font = '800 38px ui-rounded, system-ui, sans-serif';
      const head = { waiting: 'Waiting…', error: 'Problem', success: '✓ Done', paused: 'Paused' }[st];
      if (head) ctx.fillText(head, c.width / 2, 96);
      else drawLockup(ctx, (c.width - 64 * LOCKUP_RATIO) / 2, 50, 64, ctx.fillStyle);
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillText(st === 'idle' ? identityFor(name).name : clip(ag.doing, 46), c.width / 2, 156);
      ctx.textAlign = 'left';
    }
    m.tex.needsUpdate = true;
  }

  function drawDisplay() {
    const { ctx, canvas: c, tex } = office.display;
    const g = ctx.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, '#1a1534');
    g.addColorStop(1, '#2b2156');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.textBaseline = 'top';
    const logoWidth = drawLockup(ctx, 40, 18, 50, BRAND.paper);
    ctx.fillStyle = 'rgba(244, 242, 239, .35)';
    ctx.fillRect(40 + logoWidth + 18, 22, 2, 42);
    ctx.fillStyle = BRAND.paper;
    ctx.font = '600 26px system-ui, -apple-system, "Helvetica Neue", sans-serif';
    ctx.fillText('Task display', 40 + logoWidth + 36, 30);
    const chip = { live: ['LIVE', '#3ddc97'], sim: ['SIMULATION', '#ffb020'], preview: ['PREVIEW', '#8fd3ff'] }[mode];
    ctx.font = '700 20px system-ui, sans-serif';
    const cw = ctx.measureText(chip[0]).width + 28;
    ctx.fillStyle = chip[1];
    ctx.beginPath();
    ctx.roundRect(c.width - cw - 40, 26, cw, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#14112a';
    ctx.fillText(chip[0], c.width - cw - 26, 33);
    const board = latest.board;
    const title = board?.title || latest.running?.title || (mode === 'preview' ? 'Preview: no task runs' : 'No task running');
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 40px ui-rounded, system-ui, sans-serif';
    ctx.fillText(clip(title, 44), 40, 84);
    const plan = board?.plan || [];
    ctx.font = '22px system-ui, sans-serif';
    plan.slice(0, 5).forEach((p, i) => {
      ctx.fillStyle = p.done ? '#7fd9b4' : '#d9cff3';
      ctx.fillText(`${p.done ? '✓' : '○'}  ${clip(p.text, 52)}`, 44, 148 + i * 34);
    });
    const k = latest.kpis || {};
    const waiting = latest.pilot ? 'parked (pilot)' : 'to approve'; // in the pilot no send to a lead can go out yet
    const tiles = board ? [['leads', board.leads], ['drafts', board.drafts], [waiting, board.approvals]] : [['leads found', k.found], ['drafted', k.drafted], [waiting, k.sendsWaiting]];
    tiles.forEach(([label, v], i) => {
      const x = 40 + i * 320;
      ctx.fillStyle = ['#3b2f73', '#2f3f73', '#5a3d2a'][i];
      ctx.beginPath();
      ctx.roundRect(x, 340, 296, 110, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 50px ui-rounded, system-ui, sans-serif';
      ctx.fillText(String(v ?? 0), x + 22, 356);
      ctx.fillStyle = '#d9cff3';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(label, x + 22, 414);
    });
    const busy = [...world.agents.values()].filter((a) => ['working', 'researching'].includes(a.status));
    ctx.fillStyle = '#cdbfff';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(busy.length ? `Working: ${busy.map((a) => identityFor(a.name).name).join(', ')}` : 'Everyone is between tasks', 40, 484);
    tex.needsUpdate = true;
  }

  // ---- events from the stream (or the demo) become short errands ----
  const askedBy = new Map();
  function react(events) {
    for (const e of events || []) {
      const who = world.agents.get(e.agent);
      switch (e.kind) {
        case 'handoff': {
          const to = world.agents.get(e.to);
          if (!to) break;
          if (e.agent === 'coordinator' || !who) to.setErrand({ activity: 'brief', place: 'brief', until: clock + 5000 / Math.max(1, speed) });
          else {
            askedBy.set(e.to, e.agent);
            const d = deskFor(e.to);
            const side = d.approach.x > d.seat.x ? 1 : -1;
            const px = d.approach.x + side * 0.55;
            const point = grid.walkable(px, d.approach.z) ? { x: px, z: d.approach.z } : { x: d.approach.x, z: d.approach.z + (d.seat.yaw === 0 ? -0.6 : 0.6) };
            who.setErrand({ activity: 'visit', place: `visit:${e.to}`, point: { ...point, yaw: Math.atan2(d.seat.x - point.x, d.seat.z - point.z) }, partner: e.to, until: clock + 6000 });
          }
          break;
        }
        case 'result': {
          const asker = askedBy.get(e.agent);
          if (asker && who) {
            askedBy.delete(e.agent);
            const d = deskFor(asker);
            const side = d.approach.x > d.seat.x ? 1 : -1;
            const px = d.approach.x + side * 0.55;
            if (grid.walkable(px, d.approach.z)) who.setErrand({ activity: 'visit', place: `visit:${asker}`, point: { x: px, z: d.approach.z, yaw: Math.atan2(d.seat.x - px, 0) }, partner: asker, until: clock + 5000 });
          }
          break;
        }
        case 'approval':
          world.agents.get('coordinator')?.setErrand({ activity: 'deliver', place: 'tray', until: clock + 5000 });
          break;
        case 'web':
          if (who) lastWeb.set(e.agent, /^Searched/.test(e.text) ? e.text.replace(/^Searched the web:\s*/, 'Search: ') : (/https?:\/\/([^/\s]+)/.exec(e.text || '')?.[1] || e.text));
          break;
        default:
          break;
      }
    }
  }

  // ---- labels and the panel ----
  const v3 = new THREE.Vector3();
  function placeLabels() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    for (const ag of world.agents.values()) {
      v3.set(ag.pos.x, ag.pose === 'sit' ? rig.sitTop + 0.12 : rig.height + 0.16, ag.pos.z).project(camera);
      const el = ag.label;
      if (v3.z > 1 || v3.x < -1.1 || v3.x > 1.1 || v3.y < -1.1 || v3.y > 1.1) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      el.style.transform = `translate(${((v3.x + 1) / 2) * w}px, ${((1 - v3.y) / 2) * h}px) translate(-50%, -100%)`;
      el.style.zIndex = String(1000 - Math.round(v3.z * 1000));
    }
  }
  function paintLabel(ag) {
    const st = ag.status;
    const pill = ag.label.querySelector('.o3-pill');
    const text = STATE_LABEL[st];
    if (pill.textContent !== text) {
      pill.textContent = text;
      pill.className = `o3-pill st-${st}`;
    }
    const bubble = ag.label.querySelector('.o3-bubble');
    const say = st === 'idle' ? '' : clip(ag.doing || ACTIVITIES[ag.goal?.activity]?.label || '', 54);
    if (bubble.textContent !== say) {
      bubble.textContent = say;
      bubble.hidden = !say;
    }
    ag.label.classList.toggle('sel', ag.name === selected);
  }
  function paintPanel() {
    const p = $('.o3-panel');
    const ag = selected && world.agents.get(selected);
    if (!ag) {
      p.hidden = true;
      return;
    }
    const id = identityFor(ag.name);
    const d = ag.describe();
    const src = { real: 'From real agent events', sim: 'Simulation (the demo)', preview: 'Preview: a state you set' }[ag.source] || 'From real agent events';
    const why = { state: 'because of its state', errand: 'because of a real event', idle: 'ambient' }[d.why] || '';
    p.hidden = false;
    const html = `<header><span class="o3-dot" data-c="${esc(id.theme?.primary)}"></span><div><b>${esc(id.name)}</b><span>${esc(ag.name)}</span></div><button type="button" data-act="close" aria-label="Close">✕</button></header>
      <p class="o3-state"><span class="o3-pill st-${ag.status}">${esc(STATE_LABEL[ag.status])}</span><span class="o3-src">${esc(src)}</span></p>
      ${ag.doing ? `<p class="o3-doing">${esc(clip(ag.doing, 160))}</p>` : ''}
      <p class="o3-act"><b>In the office:</b> ${esc(d.label)} <span class="muted">(${esc(why)})</span></p>
      <div class="o3-row"><button type="button" data-act="follow" aria-pressed="${following}">${following ? 'Following' : 'Follow'}</button><a href="#/agent/${esc(ag.name)}">Open its page</a></div>`;
    if (p.dataset.html !== html) {
      p.dataset.html = html;
      p.innerHTML = html;
      paintDots(p);
    }
  }
  function select(name) {
    selected = name;
    if (!name) following = false;
    if (name && !$('.o3-music').hidden) showMusic(false); // the two panels share a corner
    paintPanel();
    for (const ag of world.agents.values()) paintLabel(ag);
  }

  // ---- the mode badge, caption, preview panel ----
  // The counts along the bottom: working, free, waiting, done, problem (the last three only when there are any).
  function paintStats() {
    const n = { work: 0, free: 0, wait: 0, done: 0, bad: 0 };
    for (const a of world.agents.values()) {
      const st = a.status;
      if (st === 'working' || st === 'researching') n.work++;
      else if (st === 'waiting' || st === 'paused') n.wait++;
      else if (st === 'success') n.done++;
      else if (st === 'error') n.bad++;
      else n.free++;
    }
    const parts = [['work', 'working'], ['free', 'free'], ['wait', 'waiting'], ['done', 'done'], ['bad', 'problem']]
      .filter(([k]) => n[k] || k === 'work' || k === 'free')
      .map(([k, label]) => `<span class="s-${k}"><i></i><b>${n[k]}</b>${label}</span>`);
    $('.o3-stats').innerHTML = parts.join('');
  }

  function paintMode() {
    const el = $('.o3-mode');
    const live = latest.running ? `Live · ${clip(latest.running.title || latest.running.id, 60)}` : 'Live · real agent states, no task running';
    const text = { live, sim: 'Simulation · a scripted demo, no agent is running', preview: 'Preview · states you set here, nothing runs' }[mode];
    el.className = `o3-mode m-${mode}${mode === 'live' && latest.running ? ' on' : ''}`;
    el.querySelector('span').textContent = text;
    paintStats();
  }
  let captionText = '';
  function setCaption(text) {
    if (text === captionText) return;
    captionText = text;
    const c = $('.o3-caption');
    c.classList.remove('show');
    if (!text) return;
    requestAnimationFrame(() => {
      c.textContent = text;
      c.classList.add('show');
    });
  }
  function paintPreview() {
    const p = $('.o3-preview');
    p.innerHTML = `<header><b>Preview</b><span>Set a state for any agent to see how it behaves. Nothing runs and nothing is saved.</span></header>
      <div class="o3-presets"><button type="button" data-preset="idle">Everyone idle</button><button type="button" data-preset="busy">Busy day</button><button type="button" data-preset="trouble">Problems</button></div>
      <ul>${[...world.agents.values()].map((ag) => `<li><span class="o3-dot" data-c="${esc(identityFor(ag.name).theme?.primary)}"></span><label for="pv-${esc(ag.name)}">${esc(identityFor(ag.name).name)}</label><select id="pv-${esc(ag.name)}" data-agent="${esc(ag.name)}">${STATES.map((s) => `<option value="${s}"${(preview.get(ag.name)?.status || 'idle') === s ? ' selected' : ''}>${esc(STATE_LABEL[s])}</option>`).join('')}</select></li>`).join('')}</ul>
      <button type="button" class="o3-exit" data-act="preview">Back to live</button>`;
    paintDots(p);
  }
  const PRESETS = {
    idle: () => ({}),
    busy: () => ({ coordinator: 'working', researcher: 'researching', 'lead-generator': 'researching', outreach: 'working', developer: 'working', evaluator: 'working', sales: 'waiting' }),
    trouble: () => ({ developer: 'error', outreach: 'waiting', researcher: 'researching', marketing: 'success', 'docs-handler': 'paused' }),
  };
  function setPreview(on) {
    mode = on ? 'preview' : 'live';
    $('[data-act="preview"]').setAttribute('aria-pressed', String(on));
    $('.o3-preview').hidden = !on;
    if (on) {
      preview.clear();
      for (const ag of world.agents.values()) preview.set(ag.name, { status: 'idle', doing: '' });
      paintPreview();
      applyStates([...preview.entries()].map(([name, v]) => ({ name, ...v })), 'preview');
    } else applyStates(latest.agents, 'real');
    paintMode();
    drawDisplay();
  }
  const PREVIEW_DOING = { working: 'Preview: working on a pretend task', researching: 'Preview: reading a pretend page', waiting: 'Preview: waiting for a pretend answer', error: 'Preview: a pretend step failed', success: 'Preview: finished a pretend part', paused: 'Preview: pretend plan limit' };

  // ---- the speaker ----
  const player = musicPlayer();
  const detachPlayer = player.attach();
  function paintMusic() {
    const { songs, index, playing, loaded, error } = player.state;
    world.party = playing;
    $('[data-act="music"]').setAttribute('aria-pressed', String(!$('.o3-music').hidden || playing));
    const p = $('.o3-music');
    if (p.hidden) return;
    const now = songs[index];
    const list = !loaded
      ? '<p class="o3-m-note">Reading the song list…</p>'
      : songs.length
        ? `<ol>${songs.map((s, i) => `<li><button type="button" data-song="${i}" aria-current="${i === index}"${i === index && playing ? ' class="on"' : ''}><span>${i === index && playing ? '♪' : i + 1}</span>${esc(s.title)}</button></li>`).join('')}</ol>`
        : '<p class="o3-m-note">No songs yet. Put your own .mp3 or .m4a files in the <b>music</b> folder of the project, then press Refresh.</p>';
    p.innerHTML = `<header><div><b>Office speaker</b><span>${now ? `${playing ? 'Playing' : 'Paused'}: ${esc(now.title)}` : 'Pick a song'}</span></div><button type="button" data-act="music-close" aria-label="Close">✕</button></header>
      <div class="o3-m-controls">
        <button type="button" data-act="music-play"${songs.length ? '' : ' disabled'}>${playing ? 'Pause' : 'Play'}</button>
        <button type="button" data-act="music-next"${songs.length > 1 ? '' : ' disabled'}>Next</button>
        <button type="button" data-act="music-stop"${now ? '' : ' disabled'}>Stop</button>
        <button type="button" data-act="music-refresh">Refresh</button>
      </div>
      ${error ? `<p class="o3-m-error" role="alert">${esc(error)}</p>` : ''}
      ${list}
      <p class="o3-m-note">While a song plays, agents with no work come and dance. Agents with work stay at their desks.</p>`;
  }
  function showMusic(on) {
    if (on && selected) select(null);
    $('.o3-music').hidden = !on;
    if (on && !player.state.loaded) player.load();
    paintMusic();
  }
  const offMusic = player.onChange(paintMusic);
  const onVoiceMusic = () => showMusic(true); // "play music" said to the voice panel opens the speaker's panel
  addEventListener('panscience:music', onVoiceMusic);

  // ---- input ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...pickables, ...office.speaker.meshes], false)[0];
    if (hit?.object.userData.speaker) return showMusic(true);
    select(hit ? hit.object.userData.agent : null);
  });
  labels.addEventListener('click', (e) => {
    const b = e.target.closest('[data-agent]');
    if (b) select(b.dataset.agent);
  });
  let tween = null;
  function goView(name) {
    const v = VIEWS[name];
    if (!v) return;
    following = false;
    const to = { pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.target) };
    if (name === 'overview') {
      // pull back on narrow screens so the whole room fits across
      const k = THREE.MathUtils.clamp(1.6 / Math.max(0.5, camera.aspect), 1.05, 2.2);
      to.pos.sub(to.target).multiplyScalar(k).add(to.target);
    }
    if (world.reduced || osCalm) {
      camera.position.copy(to.pos);
      controls.target.copy(to.target);
      tween = null;
    } else tween = { t: 0, from: { pos: camera.position.clone(), target: controls.target.clone() }, to };
    for (const b of root.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === name));
  }
  root.addEventListener('click', (e) => {
    const view = e.target.closest('[data-view]')?.dataset.view;
    if (view) goView(view);
    const act = e.target.closest('[data-act]')?.dataset.act;
    const preset = e.target.closest('[data-preset]')?.dataset.preset;
    if (act === 'close') select(null);
    if (act === 'music') showMusic($('.o3-music').hidden);
    if (act === 'music-close') showMusic(false);
    if (act === 'music-play') player.toggle();
    if (act === 'music-next') player.next();
    if (act === 'music-stop') player.stop();
    if (act === 'music-refresh') player.load();
    const song = e.target.closest('[data-song]')?.dataset.song;
    if (song !== undefined) {
      const i = Number(song);
      if (i === player.state.index) player.toggle();
      else player.play(i);
    }
    if (act === 'follow') {
      following = !following;
      paintPanel();
    }
    if (act === 'ambient') {
      world.ambient = !world.ambient;
      prefs.ambient = world.ambient;
      savePrefs(prefs);
      paintRoamNote();
      e.target.setAttribute('aria-pressed', String(world.ambient));
    }
    if (act === 'reduced') {
      world.reduced = !world.reduced;
      prefs.reduced = world.reduced;
      prefs.motion = world.reduced ? 'reduced' : 'full';
      savePrefs(prefs);
      paintRoamNote();
      e.target.setAttribute('aria-pressed', String(world.reduced));
    }
    if (act === 'preview') setPreview(mode !== 'preview');
    if (act === 'cast') {
      prefs.cast = cast === 'robot' ? 'people' : 'robot';
      savePrefs(prefs);
      onRebuild?.();
    }
    if (act === 'flat') {
      prefs.view = '2d';
      savePrefs(prefs);
      onFallback?.('chosen');
    }
    if (preset && mode === 'preview') {
      const map = PRESETS[preset]();
      for (const ag of world.agents.values()) preview.set(ag.name, { status: map[ag.name] || 'idle', doing: PREVIEW_DOING[map[ag.name]] || '' });
      paintPreview();
      applyStates([...preview.entries()].map(([name, v]) => ({ name, ...v })), 'preview');
    }
  });
  root.addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-agent]');
    if (!sel || mode !== 'preview') return;
    preview.set(sel.dataset.agent, { status: sel.value, doing: PREVIEW_DOING[sel.value] || '' });
    applyStates([{ name: sel.dataset.agent, ...preview.get(sel.dataset.agent) }], 'preview');
  });

  // ---- size and the render loop ----
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const frustum = new THREE.Frustum();
  const m4 = new THREE.Matrix4();
  const sphere = new THREE.Sphere(new THREE.Vector3(), 1);
  let raf = 0;
  let last = performance.now();
  let frame = 0;
  let screensAt = 0;
  let displayAt = 0;
  let moving = false;
  controls.addEventListener('start', () => {
    moving = true;
    tween = null;
  });
  controls.addEventListener('end', () => {
    moving = false;
  });
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (document.hidden) {
      last = now;
      return;
    }
    const anyWalking = [...world.agents.values()].some((a) => a.walking);
    const lively = moving || tween || anyWalking || following || world.party;
    // 60 fps while something moves, about 30 when the office is calm or motion is reduced
    const minGap = world.reduced || !lively ? 1000 / 31 : 0;
    if (now - last < minGap) return;
    // Real time, even when the browser draws few frames (up to a quarter second per frame; longer
    // gaps, such as a hidden tab, are skipped rather than replayed).
    const dt = Math.min(0.25, (now - last) / 1000) * speed;
    last = now;
    frameUpdate(dt);
  }
  function frameUpdate(dt) {
    frame += 1;
    // agents think and walk in steps of at most 1/20 s, so a slow frame doesn't make them overshoot
    for (let left = dt; left > 1e-6; left -= 0.05) {
      const step = Math.min(0.05, left);
      clock += step * 1000;
      for (const ag of world.agents.values()) ag.update(step, clock);
    }
    m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(m4);
    for (const ag of world.agents.values()) {
      sphere.center.set(ag.pos.x, 0.8, ag.pos.z);
      const seen = frustum.intersectsSphere(sphere);
      // Off-screen characters animate at a quarter rate: they still move, just cheaper.
      if (seen || frame % 4 === 0) ag.ch.update(seen ? dt : dt * 4);
    }
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / speed / 0.9);
      const k = tween.t * tween.t * (3 - 2 * tween.t);
      camera.position.lerpVectors(tween.from.pos, tween.to.pos, k);
      controls.target.lerpVectors(tween.from.target, tween.to.target, k);
      if (tween.t >= 1) tween = null;
    }
    const sel = selected && world.agents.get(selected);
    if (sel) {
      ring.visible = true;
      ring.position.x = sel.pos.x;
      ring.position.z = sel.pos.z;
      if (following) {
        const tx = sel.pos.x;
        const tz = sel.pos.z;
        const dx = tx - controls.target.x;
        const dz = tz - controls.target.z;
        controls.target.x += dx * 0.06;
        controls.target.z += dz * 0.06;
        camera.position.x += dx * 0.06;
        camera.position.z += dz * 0.06;
      }
    } else ring.visible = false;
    office.speaker.pulse(clock / 1000, world.party);
    controls.update();
    if (clock - screensAt > 600) {
      screensAt = clock;
      for (const name of world.agents.keys()) drawMonitor(name);
      for (const ag of world.agents.values()) paintLabel(ag);
      paintPanel();
    }
    if (clock - displayAt > 2000) {
      displayAt = clock;
      drawDisplay();
    }
    renderer.render(scene, camera);
    placeLabels();
  }

  // first paint
  drawDisplay();
  for (const name of world.agents.keys()) drawMonitor(name);
  $('.o3-loading').remove();
  paintMode();
  paintMusic();
  goView('overview');
  raf = requestAnimationFrame(tick);
  const sky = setInterval(() => office.redrawSky(), 10 * 60_000);

  // for checking the office by hand in the browser console
  window.__office3d = {
    world, camera, controls, select, goView, setPreview, renderer, scene, office, player, showMusic,
    // advance the office by hand, e.g. when the tab is in the background: step(600) is 10 seconds
    step(frames = 60, dt = 1 / 60) {
      for (let i = 0; i < frames; i++) frameUpdate(dt * speed);
    },
  };

  return {
    is3d: true,
    update({ agents, events = [], kpis, running, simulated = false, board = null, caption = null }) {
      latest = { agents: agents || [], kpis: kpis ?? latest.kpis, running: simulated ? null : running, board };
      if (mode === 'preview') return;
      mode = simulated ? 'sim' : 'live';
      applyStates(agents, simulated ? 'sim' : 'real');
      react(events);
      office.tray.set(board ? board.approvals ?? 0 : kpis?.sendsWaiting ?? 0);
      if (caption !== null) setCaption(caption);
      else if (events.length) {
        const e = events[events.length - 1];
        setCaption(`${identityFor(e.agent).name}: ${clip(e.text, 96)}`);
      } else if (!running && !simulated) setCaption('');
      paintMode();
      drawDisplay();
    },
    setSpeed(s) {
      speed = s || 1;
    },
    showCard(name) {
      select(name);
    },
    hideCard() {
      // the panel has its own close button; clicks elsewhere on the page leave it open
    },
    reset() {
      for (const ag of world.agents.values()) ag.reset();
      world.claims.clear();
      askedBy.clear();
      for (const m of office.mugs.values()) m.visible = true;
      setCaption('');
    },
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(sky);
      offMusic();
      removeEventListener('panscience:music', onVoiceMusic);
      detachPlayer();
      ro.disconnect();
      controls.dispose();
      for (const ag of world.agents.values()) ag.ch.dispose();
      renderer.dispose();
      if (window.__office3d?.world === world) delete window.__office3d;
      container.innerHTML = '';
    },
  };
}
