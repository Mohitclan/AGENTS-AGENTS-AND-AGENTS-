// The floating companion: a small dock in the corner of the page showing the gems that are busy,
// with controls to hide it, resize it, mute effects and pop it out.
//
// Pop-out: in Chrome and Edge (116+) the dock moves into a Document Picture-in-Picture window, which
// stays on top of other desktop apps. Other browsers get a small popup window that the operating
// system treats like any other window. A web page can't float over the desktop by itself; a true
// always-on-top overlay on every browser needs a desktop shell such as Electron or Tauri, which this
// project doesn't have.
import { avatarHTML, mountAvatars, setAvatarStatus } from './avatar.js';
import { identityFor } from './identities.js';
import { normalizeState, STATE_LABEL } from './status.js';

const KEY = 'subegems.dock';
const SIZES = { s: 44, m: 64, l: 96 };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function load() {
  try {
    return { open: true, size: 'm', muted: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { open: true, size: 'm', muted: false };
  }
}
function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // private windows can refuse storage; the dock still works for this visit
  }
}

// "2 working · 5 done · 1 waiting", or "All quiet".
function summary(list) {
  const count = (states) => list.filter((a) => states.includes(normalizeState(a.status))).length;
  const parts = [[count(['working', 'researching']), 'working'], [count(['success']), 'done'], [count(['waiting']), 'waiting'], [count(['error']), 'with a problem'], [count(['paused']), 'paused']];
  const text = parts.filter(([n]) => n).map(([n, w]) => `${n} ${w}`).join(' · ');
  return text || 'All quiet';
}

export function createDock({ onOpen }) {
  const settings = load();
  let agents = [];
  let pip = null;
  const host = document.createElement('aside');
  host.className = 'gem-dock';
  host.setAttribute('aria-label', 'Busy agents');
  document.body.append(host);
  document.documentElement.classList.toggle('gems-muted', settings.muted);

  const busyFirst = () => {
    const order = { working: 0, researching: 0, error: 1, waiting: 2, success: 3, paused: 4, idle: 5 };
    const shown = agents.filter((a) => normalizeState(a.status) !== 'idle').sort((a, b) => order[normalizeState(a.status)] - order[normalizeState(b.status)]);
    return shown.length ? shown.slice(0, 6) : agents.filter((a) => a.name === 'coordinator');
  };

  function itemsHTML(px) {
    return busyFirst().map((a) => {
      const st = normalizeState(a.status);
      return `<button type="button" class="dock-item" data-open="${esc(a.name)}" title="${esc(`${identityFor(a.name).name}: ${STATE_LABEL[st]}${a.doing ? ` · ${a.doing}` : ''}`)}">${avatarHTML(a.name, { status: st, size: px, mode: 'full' })}<span class="dock-name">${esc(identityFor(a.name).name)}</span><span class="dock-st st-${st}">${esc(STATE_LABEL[st])}</span></button>`;
    }).join('');
  }

  function render() {
    const active = agents.filter((a) => !['idle'].includes(normalizeState(a.status))).length;
    if (!settings.open) {
      host.className = 'gem-dock closed';
      host.innerHTML = `<button type="button" class="dock-fab" data-act="open" aria-label="Show the gems (${summary(agents)})">${avatarHTML('coordinator', { status: active ? 'working' : 'idle', size: 'sm', mode: 'badge' })}${active ? `<b>${active}</b>` : ''}</button>`;
      mountAvatars(host);
      return;
    }
    if (!active && !pip) {
      host.className = 'gem-dock quiet';
      host.innerHTML = `<div class="dock-bar"><span class="dock-quiet">${avatarHTML('coordinator', { status: 'idle', size: 'xs', mode: 'badge' })} All quiet</span><div class="dock-tools">
        <button type="button" data-act="mute" aria-pressed="${settings.muted}" title="${settings.muted ? 'Turn effects on' : 'Mute effects'}">${settings.muted ? '◌' : '●'}</button>
        <button type="button" data-act="pop" title="Pop out: keep the gems on top of other windows">⧉</button>
        <button type="button" data-act="hide" aria-label="Hide" title="Hide">✕</button></div></div>`;
      mountAvatars(host);
      return;
    }
    host.className = `gem-dock size-${settings.size}`;
    host.innerHTML = `<div class="dock-bar"><span>${summary(agents)}</span><div class="dock-tools">
      <button type="button" data-act="size" aria-label="Change size" title="Size">${settings.size.toUpperCase()}</button>
      <button type="button" data-act="mute" aria-pressed="${settings.muted}" title="${settings.muted ? 'Turn effects on' : 'Mute effects'}">${settings.muted ? '◌' : '●'}</button>
      <button type="button" data-act="pop" title="Pop out: keep the gems on top of other windows">⧉</button>
      <button type="button" data-act="hide" aria-label="Hide" title="Hide">✕</button></div></div>
      <div class="dock-items">${pip ? '<p class="dock-note">Shown in the pop-out window.</p>' : itemsHTML(SIZES[settings.size])}</div>`;
    mountAvatars(host);
    if (pip) renderPip();
  }

  function renderPip() {
    const doc = pip.document;
    doc.body.innerHTML = `<div class="pip-dock"><div class="dock-items">${itemsHTML(80)}</div></div>`;
    mountAvatars(doc.body, { observe: false });
  }

  async function popOut() {
    if ('documentPictureInPicture' in window) {
      try {
        pip = await window.documentPictureInPicture.requestWindow({ width: 300, height: 400 });
        for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
          const l = pip.document.createElement('link');
          l.rel = 'stylesheet';
          l.href = link.href;
          pip.document.head.append(l);
        }
        pip.document.title = 'SubE Gems';
        pip.document.body.className = 'pip-body';
        pip.document.documentElement.classList.toggle('gems-muted', settings.muted);
        pip.document.body.addEventListener('click', (e) => {
          const b = e.target.closest('[data-open]');
          if (b) {
            window.focus();
            onOpen?.(b.dataset.open);
          }
        });
        pip.addEventListener('pagehide', () => {
          pip = null;
          render();
        });
        render();
        return;
      } catch {
        pip = null;
      }
    }
    window.open('/#/float', 'subegems-float', 'popup,width=320,height=460');
  }

  host.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const open = e.target.closest('[data-open]')?.dataset.open;
    if (open) return onOpen?.(open);
    if (act === 'open' || act === 'hide') settings.open = act === 'open';
    if (act === 'size') settings.size = { s: 'm', m: 'l', l: 's' }[settings.size];
    if (act === 'mute') {
      settings.muted = !settings.muted;
      document.documentElement.classList.toggle('gems-muted', settings.muted);
      pip?.document.documentElement.classList.toggle('gems-muted', settings.muted);
    }
    if (act === 'pop') return popOut();
    if (act) {
      save(settings);
      render();
    }
    return undefined;
  });

  return {
    update(list) {
      const before = new Map(agents.map((a) => [a.name, `${a.status}|${a.doing}`]));
      const same = list.length === agents.length && list.every((a) => before.get(a.name) === `${a.status}|${a.doing}`);
      const changed = list.filter((a) => before.has(a.name) && before.get(a.name) !== `${a.status}|${a.doing}`);
      const sameSet = busyFirst().map((a) => a.name).join();
      agents = list;
      if (same) return;
      // Keep running animations: update avatars in place when the same gems are shown.
      if (settings.open && !pip && busyFirst().map((a) => a.name).join() === sameSet && host.querySelector('.dock-items .gem') && agents.some((a) => normalizeState(a.status) !== 'idle')) {
        for (const a of changed) {
          const item = host.querySelector(`.dock-item[data-open="${CSS.escape(a.name)}"]`);
          if (!item) continue;
          const st = normalizeState(a.status);
          setAvatarStatus(item.querySelector('.gem'), st, { agentLabel: a.name, doing: a.doing });
          item.querySelector('.dock-st').className = `dock-st st-${st}`;
          item.querySelector('.dock-st').textContent = STATE_LABEL[st];
        }
        host.querySelector('.dock-bar > span').textContent = summary(agents);
        return;
      }
      render();
    },
    setVisible(visible) {
      host.hidden = !visible;
    },
  };
}
