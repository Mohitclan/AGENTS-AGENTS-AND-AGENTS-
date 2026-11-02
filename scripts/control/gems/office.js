// The Working view: an office where each agent sits at its desk and visibly reacts to its real
// state, and walks when real events happen: to the coordinator's table to pick up or hand in work,
// to a colleague's desk when it asks them something, the evaluator to stamp a review. Movement is
// CSS transitions on position, run one step at a time per agent; nothing loops in JavaScript.
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
const OUTBOX = [90, 93];
const DESK_H = 11; // desk height, % of room height
const SIT = 1.6; // how far above the floor line a seated agent's feet are (hidden by the desk)

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function deskSVG(agent, label) {
  const t = identityFor(agent).theme;
  return `<svg class="o-desk-svg" viewBox="-2 -30 124 100" aria-hidden="true">
    <ellipse cx="60" cy="66" rx="56" ry="4" fill="#5b4a7a" opacity=".12"/>
    <rect x="4" y="-24" width="38" height="27" rx="4" fill="#3b3757"/>
    <rect class="o-screen" x="7" y="-21" width="32" height="21" rx="2" fill="${t.soft}"/>
    <rect class="o-screen-glow" x="7" y="-21" width="32" height="21" rx="2" fill="${t.primary}"/>
    <path class="o-code" d="M11 -15h12M11 -10h18M11 -5h9" stroke="${t.ink}" stroke-width="2" stroke-linecap="round"/>
    <rect x="19" y="3" width="8" height="10" fill="#3b3757"/><rect x="12" y="12" width="22" height="4" rx="2" fill="#3b3757"/>
    <path d="M6 22h108l-6 42H12z" fill="#f6e3cf"/><path d="M12 64h96l-3 3H15z" fill="#e2c7ad"/>
    <path d="M2 16h116a4 4 0 0 1 4 4v2a2 2 0 0 1-2 2H0a2 2 0 0 1-2-2v-2a4 4 0 0 1 4-4z" fill="#ffeedd"/><path d="M0 22h120v3H0z" fill="#e9cfb5"/>
    <rect x="46" y="11" width="28" height="6" rx="2" fill="#fff" stroke="#e7d6c5"/>
    <rect x="88" y="4" width="11" height="13" rx="3" fill="#fff"/><path d="M99 7a4 4 0 0 1 0 7" fill="none" stroke="#fff" stroke-width="2.4"/><rect x="88" y="4" width="11" height="3" fill="${t.primary}"/>
    <path d="M108 16c-2-6 0-12 5-14-1 5 2 9 1 14zM111 16c1-5 5-8 8-8-3 3-4 6-5 8z" fill="#8fd6a8"/><rect x="106" y="11" width="11" height="6" rx="2" fill="#f0a98b"/>
    <rect x="34" y="40" width="52" height="13" rx="4" fill="#fffaf3" stroke="${t.primary}" stroke-width="1.5"/>
    <text x="60" y="49.5" text-anchor="middle" font-family="ui-rounded, system-ui, sans-serif" font-size="8" font-weight="700" fill="${t.ink}">${esc(label)}</text>
  </svg>`;
}

const TABLE_SVG = `<svg class="o-table-svg" viewBox="0 0 200 90" aria-hidden="true">
  <ellipse cx="100" cy="84" rx="92" ry="6" fill="#5b4a7a" opacity=".12"/>
  <rect x="92" y="40" width="16" height="42" rx="4" fill="#d9bfa6"/><ellipse cx="100" cy="82" rx="30" ry="5" fill="#cdb196"/>
  <ellipse cx="100" cy="34" rx="96" ry="26" fill="#ffeedd"/><ellipse cx="100" cy="30" rx="96" ry="24" fill="#fff6ec"/>
  <ellipse cx="100" cy="30" rx="80" ry="17" fill="none" stroke="#f1dcc6" stroke-width="2"/>
  <g transform="translate(56 18)"><rect width="22" height="14" rx="2" fill="#fff" stroke="#e7d6c5"/><path d="M4 5h14M4 9h10" stroke="#c9b6e8" stroke-width="1.6"/></g>
  <circle cx="148" cy="26" r="7" fill="#fff"/><circle cx="148" cy="26" r="4" fill="#c8a17c"/>
</svg>`;

export function createOffice(container, { onOpen, roster }) {
  const names = roster.map((a) => a.name);
  const seatOf = (name) => (name === 'coordinator' ? [TABLE[0], TABLE[1] - 6] : SEATS[name] || [50, 57]);
  container.innerHTML = `
  <div class="office">
    <div class="o-room" id="o-room">
      <div class="o-wall">
        <div class="o-window"><div class="o-sky"></div><span class="o-sun"></span><span class="o-cloud c1"></span><span class="o-cloud c2"></span><span class="o-cloud c3"></span><div class="o-frame"></div></div>
        <div class="o-sign"><span>SubE</span> Gems <small>HQ</small></div>
        <div class="o-board" id="o-board"></div>
        <div class="o-clock" id="o-clock"><i class="o-h"></i><i class="o-m"></i></div>
        <div class="o-shelf"><span class="b1"></span><span class="b2"></span><span class="b3"></span><span class="pot"></span></div>
      </div>
      <div class="o-floor"></div>
      <div class="o-rug"></div>
      <div class="o-plant pl1"></div><div class="o-plant pl2"></div>
      <div class="o-table" id="o-table">${TABLE_SVG}<div class="o-pile" id="o-pile"></div><div class="o-stamp" id="o-stamp">PASS</div></div>
      <div class="o-outbox" id="o-outbox"><svg viewBox="0 0 60 40" aria-hidden="true"><path d="M4 14h52l-4 24H8z" fill="#cfe3ff"/><path d="M2 12h56v4H2z" fill="#a9c8f2"/><rect x="14" y="4" width="22" height="13" rx="2" fill="#fff" stroke="#e2d6f2"/><text x="30" y="33" text-anchor="middle" font-family="ui-rounded, system-ui, sans-serif" font-size="8" font-weight="700" fill="#4d5b7e">OUTBOX</text></svg></div>
      <div class="o-banner" id="o-banner" hidden>Simulation · these agents are not really working</div>
    </div>
  </div>`;
  const room = container.querySelector('#o-room');
  const place = (el, x, y) => {
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
  };

  // Desks and the table.
  for (const name of names.filter((n) => SEATS[n])) {
    const [x, y] = SEATS[name];
    const desk = document.createElement('div');
    desk.className = 'o-desk';
    desk.dataset.agent = name;
    desk.innerHTML = deskSVG(name, identityFor(name).name);
    place(desk, x, y);
    desk.style.zIndex = String(Math.round(y * 10) + 2);
    room.append(desk);
  }
  const table = room.querySelector('#o-table');
  place(table, TABLE[0], TABLE[1]);
  table.style.zIndex = String(Math.round(TABLE[1] * 10) + 2);
  place(room.querySelector('#o-outbox'), OUTBOX[0], OUTBOX[1]);

  // The agents.
  const actors = new Map();
  for (const name of names) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'o-actor seated';
    el.dataset.agent = name;
    el.innerHTML = `<span class="o-bubble" hidden></span><span class="o-paper" aria-hidden="true"></span>${avatarHTML(name, { mode: 'full', size: 'md' })}<span class="o-name">${esc(identityFor(name).name)}</span>`;
    el.addEventListener('click', () => onOpen?.(name));
    room.append(el);
    const [x, y] = seatOf(name);
    const actor = { el, gem: el.querySelector('.gem'), home: [x, y - SIT], pos: [x, y - SIT], queue: Promise.resolve(), away: false };
    el.style.zIndex = String(Math.round(y * 10));
    place(el, ...actor.pos);
    actors.set(name, actor);
  }
  mountAvatars(room);

  // Walking, one step after another per agent.
  const walk = (actor, [x, y], { seated = false } = {}) => new Promise((done) => {
    const [x0, y0] = actor.pos;
    const dist = Math.hypot(x - x0, (y - y0) * 1.6);
    const ms = reduced() ? 0 : Math.max(500, dist * 34);
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
      done();
    }, ms + 30);
  });
  const pause = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));
  const enqueue = (name, steps) => {
    const actor = actors.get(name);
    if (!actor) return;
    actor.queue = actor.queue.then(() => steps(actor)).catch(() => undefined);
  };
  const standBy = (name, [x, y]) => {
    const [hx] = actors.get(name)?.home ?? [x];
    const side = hx < x ? -1 : 1;
    return [x + side * (name === 'coordinator' ? 0 : 9), y];
  };
  const goHome = (actor) => walk(actor, actor.home, { seated: true });

  let pile = 0;
  const visitTable = (name, carry, after) => enqueue(name, async (actor) => {
    actor.el.classList.toggle('o-carry', carry);
    await walk(actor, standBy(name, [TABLE[0], TABLE[1] + 1]));
    await pause(500);
    if (carry) {
      actor.el.classList.remove('o-carry');
      pile = Math.min(pile + 1, 6);
      room.querySelector('#o-pile').dataset.n = String(pile);
    } else actor.el.classList.add('o-carry');
    after?.();
    await pause(700);
    await goHome(actor);
    actor.el.classList.remove('o-carry');
  });
  const visitDesk = (name, target) => enqueue(name, async (actor) => {
    const seat = SEATS[target] || TABLE;
    await walk(actor, standBy(name, [seat[0], seat[1] + 0.5]));
    await pause(1600);
    await goHome(actor);
  });
  const stamp = () => {
    const s = room.querySelector('#o-stamp');
    s.classList.remove('show');
    void s.getBoundingClientRect();
    s.classList.add('show');
  };
  const sendMail = () => {
    if (reduced()) return;
    const m = document.createElement('span');
    m.className = 'o-mail';
    room.append(m);
    place(m, OUTBOX[0], OUTBOX[1] - 6);
    m.animate([{ transform: 'translate(0,0) scale(.8)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: 'translate(-20vw,-40vh) scale(.5)', opacity: 0 }], { duration: 2200, easing: 'ease-in' }).finished.then(() => m.remove());
  };

  // Real (or simulated) events become movement.
  function react(events) {
    for (const e of events) {
      if (e.kind === 'handoff' && e.to && actors.has(e.to)) {
        if (e.agent === 'coordinator' || !actors.has(e.agent)) visitTable(e.to, false);
        else visitDesk(e.to, e.agent);
      } else if (e.kind === 'result' && actors.has(e.agent) && e.agent !== 'coordinator') visitTable(e.agent, true);
      else if (e.kind === 'review') visitTable('evaluator', false, stamp);
      else if (e.kind === 'send' && !/report/i.test(e.text)) sendMail();
    }
  }

  function setStates(agents) {
    for (const a of agents) {
      const actor = actors.get(a.name);
      if (!actor) continue;
      const st = normalizeState(a.status);
      setAvatarStatus(actor.gem, st, { agentLabel: a.name, doing: a.doing });
      actor.el.dataset.status = st;
      actor.el.setAttribute('aria-label', `${identityFor(a.name).name}, ${a.name}: ${STATE_LABEL[st]}${a.doing ? `. ${a.doing}` : ''}. Open its page.`);
      const bubble = actor.el.querySelector('.o-bubble');
      const text = st === 'idle' ? '' : st === 'paused' ? 'Paused' : st === 'success' ? `Done! ${clip(a.doing?.replace(/^Finished:\s*/, ''), 44)}` : st === 'error' ? `Problem: ${clip(a.doing, 46)}` : clip(a.doing || STATE_LABEL[st], 56);
      bubble.hidden = !text;
      bubble.textContent = text;
      bubble.className = `o-bubble b-${st}`;
      room.querySelector(`.o-desk[data-agent="${CSS.escape(a.name)}"]`)?.classList.toggle('busy', st === 'working' || st === 'researching');
    }
  }

  function setBoard(kpis, running, simulated) {
    const note = (label, value, tone) => `<div class="o-note ${tone}"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
    room.querySelector('#o-board').innerHTML = `<div class="o-board-h">${simulated ? 'Demo task' : running ? 'Now' : 'Today'}</div><div class="o-board-task">${esc(clip(simulated ? 'Find launch-active leads and draft emails' : running?.title || 'No task running', 60))}</div><div class="o-notes">${note('leads', kpis?.found ?? 0, 'n1')}${note('drafts', kpis?.drafted ?? 0, 'n2')}${note('to approve', kpis?.sendsWaiting ?? 0, 'n3')}</div>`;
  }

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
    update({ agents, events = [], kpis, running, simulated = false }) {
      room.querySelector('#o-banner').hidden = !simulated;
      room.classList.toggle('sim', simulated);
      setStates(agents);
      setBoard(kpis, running, simulated);
      react(events);
    },
    reset() {
      pile = 0;
      room.querySelector('#o-pile').dataset.n = '0';
      for (const actor of actors.values()) {
        actor.queue = Promise.resolve();
        actor.el.style.transitionDuration = '0ms';
        actor.pos = [...actor.home];
        place(actor.el, ...actor.home);
        actor.el.classList.add('seated');
        actor.el.classList.remove('o-carry');
      }
    },
    destroy() {
      clearInterval(clockTimer);
    },
  };
}
