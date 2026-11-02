// The avatar gallery: every gem, every state, any size, plus a simulator. States picked here are
// previews you set by hand, and the page says so; it never shows real agent status.
import { avatarHTML, mountAvatars, setAvatarStatus } from './avatar.js';
import { IDENTITIES, SYSTEM } from './identities.js';
import { createSimulator } from './simulator.js';
import { STATE_HINT, STATE_LABEL, STATES } from './status.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createGallery(container) {
  const all = [...IDENTITIES, SYSTEM];
  const opts = { state: 'idle', size: 140, mode: 'full' };
  container.innerHTML = `
  <div class="page-h"><h1>Gem gallery</h1><p class="muted">Every agent's character, in every state. The states on this page are previews you pick; they are not what the agents are doing.</p></div>
  <section class="card gal-controls">
    <div class="gal-row"><span class="gal-label">State</span><div class="seg" id="gal-states" role="group" aria-label="Preview state">${STATES.map((s) => `<button type="button" data-state="${s}" aria-pressed="${s === opts.state}" title="${esc(STATE_HINT[s])}">${esc(STATE_LABEL[s])}</button>`).join('')}</div></div>
    <div class="gal-row">
      <label class="gal-label" for="gal-size">Size</label><input id="gal-size" type="range" min="28" max="260" value="${opts.size}"><output id="gal-size-out">${opts.size}px</output>
      <span class="gal-label">Mode</span><div class="seg" id="gal-modes" role="group" aria-label="Mode">${['full', 'badge', 'desk'].map((m) => `<button type="button" data-mode="${m}" aria-pressed="${m === opts.mode}">${m}</button>`).join('')}</div>
    </div>
    <div class="gal-row">
      <button type="button" class="ghost" data-moment="start">Play "starts work"</button>
      <button type="button" class="ghost" data-moment="done">Play "finishes"</button>
      <button type="button" class="ghost" data-moment="oops">Play "hits a problem"</button>
      <span class="spacer"></span>
      <label class="check"><input type="checkbox" id="gal-sim"> Run the simulator</label>
    </div>
    <p class="sim-note" id="gal-sim-note" hidden>Simulation: a scripted demo task is driving these avatars. No agent is running.</p>
  </section>
  <section class="gal-grid" id="gal-grid"></section>
  <section class="card">
    <div class="sec-h"><h2>Every gem in every state</h2><span class="muted tiny">Small size, to check many at once</span></div>
    <div class="wide"><table class="gal-matrix"><thead><tr><th></th>${STATES.map((s) => `<th>${esc(STATE_LABEL[s])}</th>`).join('')}</tr></thead><tbody>${all.map((id) => `<tr><th>${esc(id.name)}</th>${STATES.map((s) => `<td>${avatarHTML(id.agent, { status: s, size: 64, mode: 'full' })}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  </section>`;

  const grid = container.querySelector('#gal-grid');
  const paint = () => {
    grid.innerHTML = all.map((id) => `<article class="gal-card${id.concept ? ' concept' : ''}" data-agent="${esc(id.agent)}">
      <div class="gal-stage">${avatarHTML(id.agent, { status: opts.state, size: Math.round(opts.size), mode: opts.mode })}</div>
      <h3>${esc(id.name)}</h3>
      <div class="muted tiny"><code>${esc(id.id)}</code> · agent <b>${esc(id.agent)}</b></div>
      <p class="gal-text">${esc(id.personality)}</p>
      <div class="gal-swatches"><i data-c="${esc(id.theme.primary)}"></i><i data-c="${esc(id.theme.soft)}"></i><i data-c="${esc(id.theme.ink)}"></i>${id.concept ? '<span class="tag">One of the six concepts</span>' : '<span class="tag">Family extension</span>'}</div>
    </article>`).join('');
    for (const i of grid.querySelectorAll('[data-c]')) i.style.background = i.dataset.c;
    mountAvatars(grid);
  };
  paint();
  mountAvatars(container);

  const pressed = (sel, attr, value) => container.querySelectorAll(`${sel} [data-${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === value)));
  container.querySelector('#gal-states').addEventListener('click', (e) => {
    const b = e.target.closest('[data-state]');
    if (!b) return;
    sim.stop();
    container.querySelector('#gal-sim').checked = false;
    container.querySelector('#gal-sim-note').hidden = true;
    opts.state = b.dataset.state;
    pressed('#gal-states', 'state', opts.state);
    for (const el of grid.querySelectorAll('.gem')) setAvatarStatus(el, opts.state, { tip: `Preview: ${STATE_LABEL[opts.state]}` });
  });
  container.querySelector('#gal-modes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    opts.mode = b.dataset.mode;
    pressed('#gal-modes', 'mode', opts.mode);
    paint();
  });
  const size = container.querySelector('#gal-size');
  size.addEventListener('input', () => {
    opts.size = Number(size.value);
    container.querySelector('#gal-size-out').textContent = `${opts.size}px`;
    for (const el of grid.querySelectorAll('.gem')) el.style.setProperty('--gem-size', `${opts.size}px`);
  });
  container.addEventListener('click', (e) => {
    const m = e.target.closest('[data-moment]')?.dataset.moment;
    if (!m) return;
    for (const el of grid.querySelectorAll('.gem')) {
      el.classList.remove('gem-start', 'gem-done', 'gem-oops');
      void el.getBoundingClientRect();
      el.classList.add(`gem-${m}`);
      setTimeout(() => el.classList.remove(`gem-${m}`), 1300);
    }
  });

  const sim = createSimulator(({ states }) => {
    for (const card of grid.querySelectorAll('.gal-card')) {
      const s = states[card.dataset.agent];
      setAvatarStatus(card.querySelector('.gem'), s?.status || 'idle', { tip: `Simulation: ${STATE_LABEL[s?.status || 'idle']}${s?.doing ? `. ${s.doing}` : ''}` });
    }
  });
  container.querySelector('#gal-sim').addEventListener('change', (e) => {
    container.querySelector('#gal-sim-note').hidden = !e.target.checked;
    if (e.target.checked) sim.start();
    else {
      sim.stop();
      for (const el of grid.querySelectorAll('.gem')) setAvatarStatus(el, opts.state);
    }
  });

  return { destroy: () => sim.stop() };
}
