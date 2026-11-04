// The office: each agent sits at its desk and visibly reacts to its real state, and the room reacts to
// real events: an agent walks to the coordinator's table to pick up or hand in work, visits a
// colleague it asks, the evaluator stamps reviews; web lookups, files, checks and leads float up from
// the desk that made them; mail leaves through the window and sends wait in the approval tray.
// The demo (simulator.js) drives the same room through the same calls, always labelled.
// Movement is CSS transitions and the Web Animations API; nothing loops in JavaScript except two
// slow timers (the clock, and a gentle idle fidget now and then).
import { avatarHTML, mountAvatars, setAvatarStatus } from './avatar.js';
import { identityFor } from './identities.js';
import { normalizeState, STATE_LABEL } from './status.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (t, n) => (String(t || '').length > n ? `${String(t).slice(0, n - 1)}…` : String(t || ''));

// Desk positions: x is the desk centre, y the floor line in front of it (percent of the room).
export const SEATS = {
  'knowledge-base': [9, 57], researcher: [24, 57], 'lead-generator': [39, 57],
  outreach: [61, 57], sales: [76, 57], marketing: [91, 57],
  developer: [11, 95], 'docs-handler': [29, 95], evaluator: [50, 95], 'demo-handler': [71, 95],
};
const TABLE = [50, 77];
const OUTBOX = [91, 96];
const TRAY = [90, 80];
const WINDOW = [11, 20];
const SIT = 1.6; // how far above the floor line a seated agent's feet are (hidden by the desk)
const MONITOR_DX = -3.9; // the monitor sits left of the desk centre
const MONITOR_DY = -15;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Text that types itself out, for bubbles and captions. A new text cancels the one still typing.
function typeInto(el, text, cps = 70) {
  clearInterval(el.typer);
  if (reduced() || !text) {
    el.textContent = text;
    return;
  }
  let i = 0;
  el.textContent = '';
  el.typer = setInterval(() => {
    i = Math.min(text.length, i + 2);
    el.textContent = text.slice(0, i);
    if (i >= text.length) clearInterval(el.typer);
  }, 2000 / cps);
}
const muted = () => document.documentElement.classList.contains('gems-muted');

// A small thing each desk is known by.
const DESK_PROP = {
  'knowledge-base': '<rect x="92" y="6" width="22" height="5" rx="1" fill="#9ad8a8"/><rect x="94" y="1" width="18" height="5" rx="1" fill="#f6d77a"/><rect x="93" y="-4" width="20" height="5" rx="1" fill="#b9a8f6"/>',
  researcher: '<circle cx="104" cy="2" r="8" fill="#9fd0f5"/><path d="M96 2h16M104 -6c-4 5-4 11 0 16M104 -6c4 5 4 11 0 16" fill="none" stroke="#5fa4dc" stroke-width="1.2"/><path d="M98 13h12" stroke="#c4a688" stroke-width="3" stroke-linecap="round"/>',
  'lead-generator': '<rect x="94" y="-2" width="18" height="14" rx="2" fill="#fff"/><path d="M97 2h8M97 6h12M97 10h6" stroke="#5cc79c" stroke-width="1.6" stroke-linecap="round"/><circle cx="110" cy="0" r="3" fill="#ff7f9f"/>',
  outreach: '<path d="M92 10h24v4H92z" fill="#e9cfb5"/><rect x="94" y="0" width="20" height="11" rx="1.5" fill="#fff" stroke="#f5b06a"/><path d="M94 0.5l10 6 10-6" fill="none" stroke="#f5b06a" stroke-width="1.2"/>',
  sales: '<rect x="96" y="4" width="18" height="10" rx="3" fill="#46557f"/><path d="M98 4c0-6 14-6 14 0" fill="none" stroke="#46557f" stroke-width="3"/><circle cx="105" cy="9" r="2" fill="#9fd2f7"/>',
  marketing: '<path d="M96 2h14l-2 12h-10z" fill="#ffb08f"/><path d="M100 2l-3-10M104 2l1-11M107 2l4-9" stroke="#c98f5d" stroke-width="1.6"/><circle cx="97" cy="-8" r="2" fill="#ff7fa8"/><circle cx="105" cy="-9" r="2" fill="#8fd3ff"/><circle cx="111" cy="-7" r="2" fill="#ffd56b"/>',
  'demo-handler': '<path d="M96 14l4-16h14l-4 16z" fill="#2f3550"/><path d="M103 1l6 3.5-6 3.5z" fill="#8edcec"/>',
  'docs-handler': '<path d="M94 12q9-4 10 0 1-4 10 0v-12q-9-4-10 0-1-4-10 0z" fill="#fffdf6" stroke="#efc152"/><path d="M104 0v12" stroke="#efc152"/>',
  developer: '<rect x="92" y="-14" width="24" height="18" rx="3" fill="#3b3757"/><rect x="94" y="-12" width="20" height="13" rx="1.5" fill="#1f2340"/><path d="M96 -9h8M96 -6h12M96 -3h6" stroke="#9be7c4" stroke-width="1.4"/><rect x="102" y="4" width="4" height="6" fill="#3b3757"/><rect x="98" y="9" width="12" height="3" rx="1.5" fill="#3b3757"/>',
  evaluator: '<rect x="94" y="6" width="18" height="7" rx="2" fill="#ff9aa8"/><rect x="99" y="-4" width="8" height="10" rx="2" fill="#8a6a4a"/>',
};

function deskSVG(agent, label) {
  const t = identityFor(agent).theme;
  const id = `clip-${agent}`;
  const lines = (n, w = [14, 20, 10, 17, 12, 19]) => Array.from({ length: n }, (_, i) => `<rect x="10" y="${-20 + i * 4}" width="${w[i % w.length]}" height="1.8" rx=".9" fill="${i % 3 === 0 ? t.primary : t.ink}" opacity="${i % 3 === 0 ? 1 : 0.55}"/>`).join('');
  return `<svg class="o-desk-svg" viewBox="-2 -30 124 100" aria-hidden="true">
    <defs><clipPath id="${id}"><rect x="7" y="-21" width="32" height="21" rx="2"/></clipPath></defs>
    <ellipse cx="60" cy="66" rx="56" ry="4" fill="#5b4a7a" opacity=".14"/>
    <ellipse class="o-desk-glow" cx="24" cy="18" rx="30" ry="8" fill="${t.primary}"/>
    <rect x="4" y="-24" width="38" height="27" rx="4" fill="#3b3757"/>
    <g clip-path="url(#${id})">
      <rect x="7" y="-21" width="32" height="21" fill="${t.soft}"/>
      <g class="s-idle"><path d="M23 -17l6 4-2 8h-8l-2-8z" fill="${t.primary}" opacity=".8"/><path d="M23 -17l6 4h-12z" fill="#fff" opacity=".5"/></g>
      <g class="s-code"><g class="o-scroll">${lines(12)}</g></g>
      <g class="s-web"><rect x="7" y="-21" width="32" height="5" fill="#fff"/><circle cx="10" cy="-18.5" r="1" fill="#ff8fab"/><circle cx="13" cy="-18.5" r="1" fill="#ffd56b"/><circle cx="16" cy="-18.5" r="1" fill="#9be7c4"/><rect x="19" y="-19.8" width="18" height="2.6" rx="1.3" fill="${t.soft}"/><g class="o-scroll"><rect x="10" y="-14" width="26" height="6" rx="1" fill="${t.primary}" opacity=".45"/><rect x="10" y="-6" width="18" height="1.8" rx=".9" fill="${t.ink}" opacity=".6"/><rect x="10" y="-2" width="24" height="1.8" rx=".9" fill="${t.ink}" opacity=".45"/><rect x="10" y="2" width="26" height="6" rx="1" fill="${t.primary}" opacity=".3"/><rect x="10" y="10" width="20" height="1.8" rx=".9" fill="${t.ink}" opacity=".5"/><rect x="10" y="14" width="26" height="6" rx="1" fill="${t.primary}" opacity=".45"/></g></g>
      <g class="s-ok"><circle cx="23" cy="-10.5" r="6.5" fill="#5ccf95"/><path d="M20 -10.5l2.2 2.2 4.4-4.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g class="s-err"><path d="M23 -18l7 12.5H16z" fill="#ffc96b"/><path d="M23 -14v4.5M23 -8.2v.2" stroke="#7a4a00" stroke-width="1.8" stroke-linecap="round"/></g>
      <g class="s-wait"><circle cx="17" cy="-10.5" r="1.8" fill="${t.ink}"/><circle cx="23" cy="-10.5" r="1.8" fill="${t.ink}"/><circle cx="29" cy="-10.5" r="1.8" fill="${t.ink}"/></g>
      <g class="s-off"><rect x="7" y="-21" width="32" height="21" fill="#2b2846"/><text x="29" y="-6" font-family="ui-rounded, system-ui, sans-serif" font-size="6" font-weight="800" fill="#8a86b8">z</text></g>
    </g>
    <rect x="19" y="3" width="8" height="10" fill="#3b3757"/><rect x="12" y="12" width="22" height="4" rx="2" fill="#3b3757"/>
    <path d="M6 22h108l-6 42H12z" fill="#f6e3cf"/><path d="M12 64h96l-3 3H15z" fill="#e2c7ad"/><path d="M18 30h84l-2 10H20z" fill="#efd6bd" opacity=".6"/>
    <path d="M2 16h116a4 4 0 0 1 4 4v2a2 2 0 0 1-2 2H0a2 2 0 0 1-2-2v-2a4 4 0 0 1 4-4z" fill="#ffeedd"/><path d="M0 22h120v3H0z" fill="#e9cfb5"/>
    <rect class="o-keys" x="46" y="11" width="28" height="6" rx="2" fill="#fff" stroke="#e7d6c5"/>
    <g class="o-papers"><rect x="76" y="8" width="11" height="8" rx="1" fill="#fff" stroke="#e7dcef"/><rect x="77" y="6.6" width="11" height="8" rx="1" fill="#fff" stroke="#e7dcef"/><rect x="76.4" y="5.2" width="11" height="8" rx="1" fill="#fff" stroke="#e7dcef"/></g>
    <g class="o-steam" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"><path d="M82 2q-2-3 0-6t0-6"/><path d="M86 2q-2-3 0-6t0-6"/></g>
    <g class="o-mug"><rect x="80" y="4" width="8" height="10" rx="2.4" fill="#fff"/><path d="M88 6.5a3 3 0 0 1 0 5" fill="none" stroke="#fff" stroke-width="2"/><rect x="80" y="4" width="8" height="2.4" fill="${t.primary}"/></g>
    ${DESK_PROP[agent] || ''}
    <rect x="34" y="40" width="52" height="13" rx="4" fill="#fffaf3" stroke="${t.primary}" stroke-width="1.5"/>
    <text x="60" y="49.5" text-anchor="middle" font-family="ui-rounded, system-ui, sans-serif" font-size="8" font-weight="700" fill="${t.ink}">${esc(label)}</text>
  </svg>`;
}

const TABLE_SVG = `<svg class="o-table-svg" viewBox="0 0 200 90" aria-hidden="true">
  <ellipse cx="100" cy="84" rx="92" ry="6" fill="#5b4a7a" opacity=".14"/>
  <rect x="92" y="40" width="16" height="42" rx="4" fill="#d9bfa6"/><ellipse cx="100" cy="82" rx="30" ry="5" fill="#cdb196"/>
  <ellipse cx="100" cy="34" rx="96" ry="26" fill="#ffeedd"/><ellipse cx="100" cy="30" rx="96" ry="24" fill="#fff6ec"/>
  <ellipse cx="100" cy="30" rx="80" ry="17" fill="none" stroke="#f1dcc6" stroke-width="2"/>
  <circle cx="148" cy="26" r="7" fill="#fff"/><circle cx="148" cy="26" r="4" fill="#c8a17c"/>
</svg>`;

const SKYLINE = `<svg class="o-skyline" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
  <g class="o-city-back" fill="#c9c2ec"><rect x="0" y="52" width="22" height="48"/><rect x="24" y="40" width="16" height="60"/><rect x="44" y="58" width="20" height="42"/><rect x="66" y="34" width="14" height="66"/><rect x="84" y="48" width="24" height="52"/><rect x="112" y="30" width="16" height="70"/><rect x="132" y="54" width="22" height="46"/><rect x="158" y="42" width="18" height="58"/><rect x="180" y="56" width="20" height="44"/></g>
  <g class="o-city-front" fill="#b3a9e4"><rect x="8" y="66" width="26" height="34"/><rect x="38" y="60" width="18" height="40"/><rect x="60" y="72" width="30" height="28"/><rect x="96" y="62" width="20" height="38"/><rect x="120" y="70" width="28" height="30"/><rect x="152" y="64" width="22" height="36"/><rect x="178" y="74" width="22" height="26"/></g>
  <g class="o-city-lights" fill="#ffe59a"><rect x="12" y="70" width="3" height="3"/><rect x="20" y="78" width="3" height="3"/><rect x="42" y="66" width="3" height="3"/><rect x="48" y="74" width="3" height="3"/><rect x="70" y="40" width="3" height="3"/><rect x="72" y="50" width="3" height="3"/><rect x="100" y="68" width="3" height="3"/><rect x="116" y="38" width="3" height="3"/><rect x="122" y="46" width="3" height="3"/><rect x="126" y="76" width="3" height="3"/><rect x="138" y="80" width="3" height="3"/><rect x="160" y="50" width="3" height="3"/><rect x="164" y="70" width="3" height="3"/><rect x="186" y="80" width="3" height="3"/></g>
</svg>`;

export function createOffice(container, { onOpen, roster, immersive = false }) {
  const names = roster.map((a) => a.name);
  const seatOf = (name) => (name === 'coordinator' ? [TABLE[0], TABLE[1] - 6] : SEATS[name] || [50, 57]);
  let speed = 1;
  container.innerHTML = `
  <div class="office${immersive ? ' immersive-office' : ''}">
    <div class="o-room" id="o-room">
      <div class="o-wall"><div class="o-wall-trim"></div></div>
      <div class="o-window"><div class="o-sky"></div><span class="o-sun"></span><span class="o-cloud c1"></span><span class="o-cloud c2"></span><span class="o-cloud c3"></span>${SKYLINE}<div class="o-frame"></div><div class="o-sill"></div></div>
      <div class="o-sign"><span>pan</span>science <small>HQ</small></div>
      <div class="o-poster"><i></i></div>
      <div class="o-board" id="o-board"></div>
      <div class="o-clock" id="o-clock"><i class="o-h"></i><i class="o-m"></i><b></b></div>
      <div class="o-shelf"><span class="b1"></span><span class="b2"></span><span class="b3"></span><span class="b4"></span><span class="pot"></span></div>
      <div class="o-lamps"><span class="l1"></span><span class="l2"></span><span class="l3"></span></div>
      <div class="o-fairy" aria-hidden="true">${Array.from({ length: 26 }, () => '<i></i>').join('')}</div>
      <div class="o-floor"></div>
      <div class="o-beam"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="o-rug"></div>
      <div class="o-plant pl1"></div><div class="o-plant pl2"></div>
      <div class="o-table" id="o-table">${TABLE_SVG}<div class="o-pile" id="o-pile" data-n="0"></div><div class="o-taskcard" id="o-taskcard" hidden></div><div class="o-stamp" id="o-stamp"></div></div>
      <div class="o-tray" id="o-tray"><svg viewBox="0 0 70 60" aria-hidden="true"><rect x="6" y="30" width="58" height="28" rx="4" fill="#d9bfa6"/><rect x="6" y="30" width="58" height="5" fill="#c9ab8e"/><path d="M10 22h50l-3 10H13z" fill="#ffe7f0"/><g class="o-tray-papers"><rect x="18" y="12" width="34" height="12" rx="1.5" fill="#fff" stroke="#f3c3d6"/><rect x="20" y="9" width="34" height="12" rx="1.5" fill="#fff" stroke="#f3c3d6"/><rect x="17" y="6" width="34" height="12" rx="1.5" fill="#fff" stroke="#f3c3d6"/></g></svg><span class="o-tray-label">Waiting for you</span><b class="o-tray-n" id="o-tray-n">0</b></div>
      <div class="o-outbox" id="o-outbox"><svg viewBox="0 0 60 40" aria-hidden="true"><path d="M4 14h52l-4 24H8z" fill="#cfe3ff"/><path d="M2 12h56v4H2z" fill="#a9c8f2"/><rect x="14" y="4" width="22" height="13" rx="2" fill="#fff" stroke="#e2d6f2"/><text x="30" y="33" text-anchor="middle" font-family="ui-rounded, system-ui, sans-serif" font-size="8" font-weight="700" fill="#4d5b7e">OUTBOX</text></svg></div>
      <div class="o-tint"></div>
      <div class="o-glow"><span class="g1"></span><span class="g2"></span><span class="g3"></span></div>
      <div class="o-banner" id="o-banner" hidden>Simulation · these agents are not really working</div>
      <div class="o-caption" id="o-caption" aria-live="polite"></div>
      <div class="o-pop" id="o-pop" hidden></div>
    </div>
  </div>`;
  const room = container.querySelector('#o-room');
  const place = (el, x, y) => {
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
  };

  // Desks, table, tray, outbox.
  const desks = new Map();
  for (const name of names.filter((n) => SEATS[n])) {
    const [x, y] = SEATS[name];
    const desk = document.createElement('div');
    desk.className = 'o-desk';
    desk.dataset.agent = name;
    desk.dataset.screen = 'idle';
    desk.dataset.papers = '0';
    desk.innerHTML = deskSVG(name, identityFor(name).name);
    place(desk, x, y);
    desk.style.zIndex = String(Math.round(y * 10) + 2);
    desk.classList.add('o-enter');
    desk.style.animationDelay = `${150 + desks.size * 60}ms`;
    desk.addEventListener('animationend', (ev) => {
      if (ev.animationName === 'o-enter-rise') desk.classList.remove('o-enter');
    });
    room.append(desk);
    desks.set(name, desk);
  }
  const table = room.querySelector('#o-table');
  place(table, TABLE[0], TABLE[1]);
  table.style.zIndex = String(Math.round(TABLE[1] * 10) + 2);
  place(room.querySelector('#o-tray'), TRAY[0], TRAY[1]);
  place(room.querySelector('#o-outbox'), OUTBOX[0], OUTBOX[1]);
  room.querySelector('#o-tray').style.zIndex = String(Math.round(TRAY[1] * 10));

  // The agents.
  const actors = new Map();
  for (const name of names) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'o-actor seated';
    el.dataset.agent = name;
    el.dataset.status = 'idle';
    el.innerHTML = `<span class="o-bubble" hidden></span><span class="o-paper" aria-hidden="true"></span><span class="o-backup" hidden>On backup</span>${avatarHTML(name, { mode: 'full', size: 'md' })}<span class="o-name">${esc(identityFor(name).name)}</span>`;
    el.addEventListener('click', () => onOpen?.(name, el));
    room.append(el);
    const [x, y] = seatOf(name);
    const actor = { name, el, gem: el.querySelector('.gem'), home: [x, y - SIT], pos: [x, y - SIT], queue: Promise.resolve(), status: 'idle', doing: '' };
    el.style.zIndex = String(Math.round(y * 10));
    place(el, ...actor.pos);
    el.classList.add('o-enter');
    el.style.animationDelay = `${500 + actors.size * 90}ms`;
    el.addEventListener('animationend', (ev) => {
      if (ev.animationName === 'o-enter-pop') el.classList.remove('o-enter');
    });
    actors.set(name, actor);
  }
  mountAvatars(room);

  // ---- movement ----
  const pause = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms / speed));
  const pulse = (el, cls, ms = 450) => {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  };
  const walk = (actor, [x, y], { seated = false } = {}) => new Promise((done) => {
    const [x0, y0] = actor.pos;
    const dist = Math.hypot(x - x0, (y - y0) * 1.6);
    const ms = reduced() ? 0 : Math.max(650, dist * 38) / speed;
    if (actor.el.classList.contains('seated')) pulse(actor.el, 'o-rise');
    actor.el.classList.toggle('o-left', x < x0 - 0.5);
    actor.el.classList.remove('seated');
    actor.gem.classList.add('gem-walk');
    actor.el.style.transitionDuration = `${ms}ms`;
    actor.el.style.zIndex = String(Math.round(Math.max(y, y0) * 10) + 3);
    place(actor.el, x, y);
    actor.pos = [x, y];
    setTimeout(() => {
      actor.gem.classList.remove('gem-walk');
      actor.el.style.zIndex = String(Math.round(y * 10) + (seated ? 0 : 3));
      actor.el.classList.toggle('seated', seated);
      if (seated) {
        actor.el.classList.remove('o-left');
        pulse(actor.el, 'o-sit');
      }
      done();
    }, ms + 40);
  });
  const enqueue = (name, steps) => {
    const actor = actors.get(name);
    if (!actor) return;
    actor.queue = actor.queue.then(() => steps(actor)).catch(() => undefined);
  };
  const standBy = (name, [x, y]) => {
    const [hx] = actors.get(name)?.home ?? [x];
    return [x + (hx < x ? -1 : 1) * 9, y];
  };
  const goHome = (actor) => walk(actor, actor.home, { seated: true });

  // A card or envelope flying across the room, in room percentages.
  const fly = (cls, [x0, y0], [x1, y1], { ms = 1400, html = '' } = {}) => new Promise((done) => {
    if (reduced()) return done();
    const el = document.createElement('span');
    el.className = `o-fly ${cls}`;
    el.innerHTML = html;
    room.append(el);
    place(el, x0, y0);
    const r = room.getBoundingClientRect();
    const dx = ((x1 - x0) / 100) * r.width;
    const dy = ((y1 - y0) / 100) * r.height;
    const lift = Math.min(r.height * 0.18, Math.abs(dx) * 0.35 + 30);
    el.animate([
      { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.1 },
      { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - lift}px)) scale(1.1) rotate(-6deg)`, offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.9)`, opacity: 1, offset: 0.92 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.5)`, opacity: 0 },
    ], { duration: ms / speed, easing: 'cubic-bezier(.45,.05,.35,1)' }).finished.then(() => {
      el.remove();
      done();
    });
    return undefined;
  });

  // Little labels floating up from a desk: web lookups, files, checks, leads.
  const chips = new Map();
  const chip = (agent, kind, text) => {
    if (reduced()) return;
    const [x, y] = agent === 'coordinator' ? [TABLE[0], TABLE[1] - 14] : (SEATS[agent] ? [SEATS[agent][0] + MONITOR_DX, SEATS[agent][1] + MONITOR_DY] : null) || [];
    if (x === undefined) return;
    const live = chips.get(agent) || 0;
    if (live >= 3) return;
    chips.set(agent, live + 1);
    const el = document.createElement('span');
    el.className = `o-chip c-${kind}`;
    el.innerHTML = `<i aria-hidden="true"></i>${esc(clip(text, 42))}`;
    room.append(el);
    place(el, x, y);
    el.style.zIndex = '2500';
    el.animate([
      { transform: 'translate(-50%, 0) scale(.7)', opacity: 0 },
      { transform: 'translate(-50%, -40%) scale(1)', opacity: 1, offset: 0.12 },
      { transform: 'translate(-50%, -150%) scale(1)', opacity: 1, offset: 0.78 },
      { transform: 'translate(-50%, -190%) scale(.96)', opacity: 0 },
    ], { duration: 3200 / Math.min(speed, 1.5), easing: 'ease-out', delay: live * 260 }).finished.then(() => {
      el.remove();
      chips.set(agent, Math.max(0, (chips.get(agent) || 1) - 1));
    });
  };

  let pile = 0;
  const visitTable = (name, carry, after) => enqueue(name, async (actor) => {
    actor.el.classList.toggle('o-carry', carry);
    await walk(actor, standBy(name, [TABLE[0], TABLE[1] + 1]));
    await pause(450);
    if (carry) {
      actor.el.classList.remove('o-carry');
      pile = Math.min(pile + 1, 6);
      room.querySelector('#o-pile').dataset.n = String(pile);
    } else actor.el.classList.add('o-carry');
    after?.(actor);
    await pause(750);
    await goHome(actor);
    actor.el.classList.remove('o-carry');
  });
  const visitDesk = (name, target, carry = false) => enqueue(name, async (actor) => {
    const seat = SEATS[target] || TABLE;
    actor.el.classList.toggle('o-carry', carry);
    await walk(actor, standBy(name, [seat[0], seat[1] + 0.5]));
    await pause(carry ? 900 : 1800);
    actor.el.classList.remove('o-carry');
    if (carry) addPaper(target);
    await goHome(actor);
  });
  const askedBy = new Map(); // agent asked -> the colleague who asked it, so the answer goes back there
  const stamp = (verdict) => {
    const s = room.querySelector('#o-stamp');
    s.textContent = verdict === 'PASS' ? 'PASS' : 'REVISE';
    s.className = `o-stamp ${verdict === 'PASS' ? 'pass' : 'revise'}`;
    void s.offsetWidth;
    s.classList.add('show');
  };
  const addPaper = (agent) => {
    const desk = desks.get(agent);
    if (desk) desk.dataset.papers = String(Math.min(3, Number(desk.dataset.papers) + 1));
  };
  const domain = (text) => /https?:\/\/([^/\s]+)/.exec(text || '')?.[1]?.replace(/^www\./, '') || '';

  // ---- events: real ones from the stream, or the demo's ----
  function react(events) {
    for (const e of events) {
      const who = e.agent;
      switch (e.kind) {
        case 'task':
          room.querySelector('#o-taskcard').hidden = true;
          fly('f-task', [50, 4], [TABLE[0], TABLE[1] - 9], { ms: 1600, html: '<b>New task</b>' }).then(() => {
            const card = room.querySelector('#o-taskcard');
            card.textContent = clip(e.text, 70);
            card.hidden = false;
            pulse(card, 'pop', 600);
          });
          break;
        case 'handoff':
          if (e.to && actors.has(e.to)) {
            if (who === 'coordinator' || !actors.has(who)) visitTable(e.to, false);
            else {
              askedBy.set(e.to, who);
              visitDesk(e.to, who);
            }
          }
          break;
        case 'result':
          if (askedBy.has(who)) {
            visitDesk(who, askedBy.get(who), true);
            askedBy.delete(who);
          } else if (actors.has(who) && who !== 'coordinator') visitTable(who, true);
          break;
        case 'review':
          visitTable('evaluator', false, () => stamp(e.verdict || (/PASS/.test(e.text) ? 'PASS' : 'REVISE')));
          break;
        case 'web':
          chip(who, 'web', /^Searched/.test(e.text) ? e.text.replace(/^Searched the web:\s*/, '') : domain(e.text) || e.text);
          break;
        case 'file':
          chip(who, 'file', (e.ref || e.text || '').split('/').pop());
          addPaper(who);
          break;
        case 'command':
          chip(who, 'cmd', e.text);
          break;
        case 'check':
          chip(who, e.status === 'failed' ? 'bad' : 'ok', e.status === 'failed' ? 'Copy check failed' : 'Copy check passed');
          break;
        case 'lead':
          chip('lead-generator', 'lead', e.text.replace(/^Found:\s*/, '+ '));
          break;
        case 'error':
          chip(who, 'bad', domain(e.text) ? `${domain(e.text)} blocked` : 'A step failed');
          break;
        case 'fallback':
          chip(who, 'bad', 'Handing to the backup');
          break;
        case 'plan':
          chip('coordinator', 'file', e.text);
          break;
        case 'approval':
          fly('f-paper', [TABLE[0], TABLE[1] - 8], [TRAY[0], TRAY[1] - 8], { ms: 1500 });
          break;
        case 'send':
          if (!/report/i.test(e.text)) fly('f-mail', [OUTBOX[0], OUTBOX[1] - 6], WINDOW, { ms: 2000 });
          break;
        case 'reply':
          fly('f-mail in', WINDOW, [SEATS.sales[0], SEATS.sales[1] - 14], { ms: 2000 });
          break;
        default:
          break;
      }
    }
  }

  // ---- states ----
  const SCREEN = { idle: 'idle', working: 'code', researching: 'web', success: 'ok', waiting: 'wait', error: 'err', paused: 'off' };
  function setStates(agents) {
    for (const a of agents) {
      const actor = actors.get(a.name);
      if (!actor) continue;
      const st = normalizeState(a.status);
      actor.status = st;
      actor.doing = a.doing || '';
      setAvatarStatus(actor.gem, st, { agentLabel: a.name, doing: a.doing });
      actor.el.dataset.status = st;
      actor.el.setAttribute('aria-label', `${identityFor(a.name).name}, ${a.name}: ${STATE_LABEL[st]}${a.doing ? `. ${a.doing}` : ''}`);
      actor.el.querySelector('.o-backup').hidden = !(a.backup || a.backupActive);
      const bubble = actor.el.querySelector('.o-bubble');
      const text = st === 'idle' ? '' : st === 'paused' ? 'Paused' : st === 'success' ? `Done! ${clip(a.doing?.replace(/^Finished:\s*/, ''), 44)}` : st === 'error' ? `Problem: ${clip(a.doing, 46)}` : clip(a.doing || STATE_LABEL[st], 56);
      if (bubble.dataset.text !== text) {
        bubble.dataset.text = text;
        bubble.hidden = !text;
        bubble.className = `o-bubble b-${st}`;
        typeInto(bubble, text);
      }
      const desk = desks.get(a.name);
      if (desk) {
        desk.dataset.screen = SCREEN[st];
        desk.classList.toggle('busy', st === 'working' || st === 'researching');
      }
    }
  }

  function setBoard({ title, plan, leads, drafts, approvals }, mode) {
    const note = (label, value, tone) => `<div class="o-note ${tone}"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
    const steps = (plan || []).slice(0, 5).map((p) => `<li class="${p.done ? 'done' : ''}">${esc(p.text)}</li>`).join('');
    room.querySelector('#o-board').innerHTML = `<div class="o-board-h">${esc(mode)}</div><div class="o-board-task">${esc(clip(title || 'No task running', 70))}</div>${steps ? `<ol class="o-plan">${steps}</ol>` : ''}<div class="o-notes">${note('leads', leads ?? 0, 'n1')}${note('drafts', drafts ?? 0, 'n2')}${note('to approve', approvals ?? 0, 'n3')}</div>`;
    const n = room.querySelector('#o-tray-n');
    if (n.textContent !== String(approvals ?? 0)) {
      n.textContent = String(approvals ?? 0);
      pulse(room.querySelector('#o-tray'), 'bump', 700);
    }
    room.querySelector('#o-tray').classList.toggle('empty', !approvals);
  }

  let lastCaption = '';
  function setCaption(text) {
    if (text === lastCaption) return;
    lastCaption = text;
    const c = room.querySelector('#o-caption');
    c.classList.remove('show');
    if (!text) return;
    setTimeout(() => {
      c.classList.add('show');
      typeInto(c, text, 90);
    }, 180);
  }

  // A gentle idle fidget now and then, only for agents that really are idle.
  const FIDGETS = ['look', 'stretch', 'sway'];
  const fidget = setInterval(() => {
    if (reduced() || muted() || document.hidden) return;
    const idle = [...actors.values()].filter((a) => a.status === 'idle' && a.el.classList.contains('seated'));
    if (!idle.length) return;
    const a = idle[Math.floor(Math.random() * idle.length)];
    pulse(a.el, `fidget-${FIDGETS[Math.floor(Math.random() * FIDGETS.length)]}`, 2600);
  }, 3800);

  const clock = () => {
    const d = new Date();
    const c = room.querySelector('#o-clock');
    c.querySelector('.o-h').style.transform = `rotate(${(d.getHours() % 12) * 30 + d.getMinutes() / 2}deg)`;
    c.querySelector('.o-m').style.transform = `rotate(${d.getMinutes() * 6}deg)`;
    const h = d.getHours();
    room.classList.toggle('night', h < 6 || h >= 19);
    room.classList.toggle('dusk', (h >= 17 && h < 19) || (h >= 6 && h < 8));
  };
  clock();
  const clockTimer = setInterval(clock, 30_000);

  return {
    update({ agents, events = [], kpis, running, simulated = false, board = null, caption = null }) {
      room.querySelector('#o-banner').hidden = !simulated;
      room.classList.toggle('sim', simulated);
      setStates(agents);
      if (board) setBoard(board, 'Demo task');
      else setBoard({ title: running?.title, leads: kpis?.found, drafts: kpis?.drafted, approvals: kpis?.sendsWaiting }, running ? 'Now' : 'Today');
      if (caption !== null) setCaption(caption);
      else if (events.length) {
        const e = events[events.length - 1];
        setCaption(`${identityFor(e.agent).name}: ${clip(e.text, 90)}`);
      } else if (!running) setCaption('');
      react(events);
    },
    setSpeed(s) {
      speed = s;
    },
    showCard(name, html) {
      const pop = room.querySelector('#o-pop');
      const actor = actors.get(name);
      if (!actor) return;
      pop.innerHTML = html;
      pop.hidden = false;
      place(pop, actor.pos[0], actor.pos[1] - 17);
    },
    hideCard() {
      room.querySelector('#o-pop').hidden = true;
    },
    reset() {
      pile = 0;
      askedBy.clear();
      room.querySelector('#o-pile').dataset.n = '0';
      room.querySelector('#o-taskcard').hidden = true;
      for (const d of desks.values()) d.dataset.papers = '0';
      for (const actor of actors.values()) {
        actor.queue = Promise.resolve();
        actor.el.style.transitionDuration = '0ms';
        actor.pos = [...actor.home];
        place(actor.el, ...actor.home);
        actor.el.classList.add('seated');
        actor.el.classList.remove('o-carry', 'o-left');
      }
      setCaption('');
    },
    destroy() {
      clearInterval(clockTimer);
      clearInterval(fidget);
    },
  };
}
