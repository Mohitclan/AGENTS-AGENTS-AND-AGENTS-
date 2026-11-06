// The gate into the 3D office: two dark doors meet in the middle with the panscience mark on a round plate across the
// seam, so each door carries half of it. The mark draws itself, "Welcome to the panscience environment" appears, and
// once the office behind is ready the doors swing open and light spills through. A click or any key opens them at
// once; reduced motion turns it into a short fade. It covers the whole window while the 3D office builds.
import { LOGO } from './logo.js';

export const MIN_MS = 2300; // long enough to read the welcome
export const MAX_WAIT_MS = 9000; // the doors open even if the office is still loading (its own loading screen shows)
const OPEN_MS = 1500;

const medallion = () => {
  const lines = LOGO.parts.map((d) => `<path d="${d}" pathLength="1"/>`).join('');
  const shapes = LOGO.parts.map((d) => `<path d="${d}"/>`).join('');
  return `<div class="gate-medal"><svg viewBox="0 0 ${LOGO.w} ${LOGO.h}" aria-hidden="true"><g class="gm-fill">${shapes}</g><g class="gm-line">${lines}</g></svg></div>`;
};

// Shows the gate. Call ready() when the office behind it can be seen; the returned `done` resolves once it is gone.
export function playGate({ calm = matchMedia('(prefers-reduced-motion: reduce)').matches, minMs = MIN_MS, maxWaitMs = MAX_WAIT_MS } = {}) {
  const el = document.createElement('div');
  el.className = `gate${calm ? ' calm' : ''}`;
  el.setAttribute('role', 'presentation');
  const door = (side) => `<div class="gate-door gate-${side}"><div class="gate-panels"><i></i><i></i><i></i></div><div class="gate-handle"></div>${medallion()}</div>`;
  el.innerHTML = `
    <div class="gate-light"></div>
    <div class="gate-frame">${door('l')}${door('r')}</div>
    <div class="gate-text">
      <p class="gate-kicker">panscience</p>
      <h1>Welcome to the <b>panscience</b> environment</h1>
      <p class="gate-sub">Opening the 3D office<span>.</span><span>.</span><span>.</span></p>
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
