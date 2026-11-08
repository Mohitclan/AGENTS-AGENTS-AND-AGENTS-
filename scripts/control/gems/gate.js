// The gate into the 3D office: two dark doors meet in the middle with the PanScience Innovations mark on a round plate across the
// seam, so each door carries half of it. The mark draws itself, the "PANSCIENCE INNOVATIONS" wordmark and "Welcome to the PanScience Innovations environment" appear, and
// once the office behind is ready the doors swing open and light spills through. A click or any key opens them at
// once; reduced motion turns it into a short fade. It covers the whole window while the 3D office builds.
import { BRAND, LOGO, wordmarkSvg } from './logo.js';

export const MIN_MS = 2300; // long enough to read the welcome
export const MAX_WAIT_MS = 9000; // the doors open even if the office is still loading (its own loading screen shows)
const OPEN_MS = 1500;

const medallion = () => {
  const lines = LOGO.parts.map((d) => `<path d="${d}" pathLength="1"/>`).join('');
  const shapes = LOGO.parts.map((d) => `<path d="${d}"/>`).join('');
  return `<div class="gate-medal"><svg viewBox="0 0 ${LOGO.w} ${LOGO.h}" aria-hidden="true"><g class="gm-fill">${shapes}</g><g class="gm-line">${lines}</g></svg></div>`;
};

// Shows the gate. Call ready() when the office behind it can be seen; the returned `done` resolves once it is gone.
// title: the place being entered ("Developer Studio"); sub: the line under it. Defaults are for the 3D office.
export function playGate({ calm = matchMedia('(prefers-reduced-motion: reduce)').matches, minMs = MIN_MS, maxWaitMs = MAX_WAIT_MS, title = '', sub = 'Opening the 3D office' } = {}) {
  const safe = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const el = document.createElement('div');
  el.className = `gate${calm ? ' calm' : ''}`;
  el.setAttribute('role', 'presentation');
  const door = (side) => `<div class="gate-door gate-${side}"><div class="gate-panels"><i></i><i></i><i></i></div><div class="gate-handle"></div>${medallion()}</div>`;
  el.innerHTML = `
    <div class="gate-light"></div>
    <div class="gate-frame">${door('l')}${door('r')}</div>
    <div class="gate-text">
      <p class="gate-kicker" aria-label="${BRAND.name}">${wordmarkSvg('gate-word')}</p>
      <h1>${title ? `Welcome to the <b>${safe(title)}</b>` : `Welcome to the <b>${BRAND.name}</b> environment`}</h1>
      <p class="gate-sub">${safe(sub)}<span>.</span><span>.</span><span>.</span></p>
    </div>
    <button type="button" class="gate-skip">Skip</button>`;
  document.body.append(el);

  let isReady = false;
  let opened = false;
  let resolveDone;
  const done = new Promise((r) => {
    resolveDone = r;
  });
  const started = performance.now();
  const open = () => {
    if (opened) return;
    opened = true;
    removeEventListener('keydown', open);
    el.classList.add('open');
    setTimeout(() => {
      el.remove();
      resolveDone();
    }, calm ? 350 : OPEN_MS);
  };
  const maybeOpen = () => {
    if (isReady && performance.now() - started >= (calm ? 400 : minMs)) open();
  };
  el.addEventListener('click', open);
  addEventListener('keydown', open);
  const tick = setInterval(() => {
    if (opened) return clearInterval(tick);
    maybeOpen();
  }, 100);
  setTimeout(open, maxWaitMs);
  return {
    el,
    done,
    ready() {
      isReady = true;
      maybeOpen();
    },
    open,
  };
}
