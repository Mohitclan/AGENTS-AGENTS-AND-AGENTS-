// The opening: a black screen where the panscience crystal draws itself in light, the name appears,
// the gems pop into orbit, and the view flies through the crystal into the office. About three
// seconds; a click, a tap or any key skips it, and reduced motion turns it into a short fade.
import { badgeImg } from './avatar.js';
import { IDENTITIES } from './identities.js';

const HOLD_MS = 3100;
const OUT_MS = 950;

export function playIntro() {
  return new Promise((resolve) => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.createElement('div');
    el.className = `intro${calm ? ' calm' : ''}`;
    el.setAttribute('role', 'presentation');
    el.innerHTML = `
      <div class="intro-glow"></div>
      <div class="intro-stars">${Array.from({ length: 28 }, () => '<i></i>').join('')}</div>
      <div class="intro-stage">
        <div class="intro-orbit">${IDENTITIES.map((i) => `<span class="intro-badge">${badgeImg(i.agent, i.name)}</span>`).join('')}</div>
        <svg class="intro-gem" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="ig-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6e7"/><stop offset=".5" stop-color="#cbbcff"/><stop offset="1" stop-color="#a9dcff"/></linearGradient>
            <linearGradient id="ig-b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#b49cff"/></linearGradient>
            <linearGradient id="ig-sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
            <clipPath id="ig-clip"><path d="M60 10l44 30-12 68H28L16 40z"/></clipPath>
          </defs>
          <g class="ig-fill">
            <path d="M60 10l44 30H16z" fill="url(#ig-b)"/>
            <path d="M16 40h88l-12 68H28z" fill="url(#ig-a)"/>
            <path d="M60 10L44 40l16 68 16-68z" fill="#fff" opacity=".35"/>
          </g>
          <g clip-path="url(#ig-clip)"><rect class="ig-sweep" x="-60" y="0" width="40" height="120" fill="url(#ig-sweep)" transform="skewX(-20)"/></g>
          <path class="ig-line" d="M60 10l44 30-12 68H28L16 40z"/>
          <path class="ig-line ig-inner" d="M16 40h88M60 10L44 40l16 68 16-68L60 10"/>
        </svg>
        <h1 class="intro-title">pan<span>science</span></h1>
        <p class="intro-sub">Your AI sales team is getting to work</p>
      </div>
      <button type="button" class="intro-skip">Skip</button>`;
    document.body.append(el);
    const badges = el.querySelectorAll('.intro-badge');
    badges.forEach((b, i) => {
      const angle = (360 / badges.length) * i - 90;
      b.style.setProperty('--a', `${angle}deg`);
      b.style.animationDelay = `${1300 + i * 70}ms`;
    });
    el.querySelectorAll('.intro-stars i').forEach((s) => {
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.random() * 100}%`;
      s.style.animationDelay = `${(Math.random() * 2).toFixed(2)}s`;
    });

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
