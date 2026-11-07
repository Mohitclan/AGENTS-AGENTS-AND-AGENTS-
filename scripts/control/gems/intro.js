// The opening: a warm light screen where the PanScience Innovations mark draws itself, fills in, and the wordmark appears beneath it,
// with a faint copy of the mark behind. About three seconds, then it fades into the page. A click, a tap or any key
// skips it, and reduced motion turns it into a short fade.
import { BRAND, LOGO, logoSvg, wordmarkSvg } from './logo.js';

const HOLD_MS = 3000;
const OUT_MS = 800;

export function playIntro() {
  return new Promise((resolve) => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.createElement('div');
    el.className = `intro${calm ? ' calm' : ''}`;
    el.setAttribute('role', 'presentation');
    // The drawn outline needs each shape on its own, with a length of 1 so one dash setting fits both.
    const shapes = LOGO.parts.map((d) => `<path d="${d}"/>`).join('');
    const lines = LOGO.parts.map((d) => `<path d="${d}" pathLength="1"/>`).join('');
    el.innerHTML = `
      <div class="intro-mark-faint">${logoSvg('')}</div>
      <div class="intro-stage">
        <svg class="intro-logo" viewBox="0 0 ${LOGO.w} ${LOGO.h}" aria-hidden="true">
          <g class="il-fill">${shapes}</g>
          <g class="il-line">${lines}</g>
        </svg>
        <h1 class="intro-title" aria-label="${BRAND.name}">${wordmarkSvg('intro-word')}</h1>
        <p class="intro-sub">Your AI sales team is getting to work</p>
      </div>
      <button type="button" class="intro-skip">Skip</button>`;
    document.body.append(el);

    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      el.classList.add('out');
      document.documentElement.classList.add('arrive');
      setTimeout(() => {
        el.remove();
        document.documentElement.classList.remove('arrive');
        removeEventListener('keydown', finish);
        resolve();
      }, calm ? 250 : OUT_MS);
    };
    el.addEventListener('click', finish);
    addEventListener('keydown', finish);
    setTimeout(finish, calm ? 500 : HOLD_MS);
  });
}
