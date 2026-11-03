// Rendering and animation control for the Gem avatars.
//
//   avatarHTML(agent, { status, size, mode, label, tip })  markup for one avatar
//   mountAvatars(root)                                      give new avatars their colours, timing and
//                                                           off-screen pausing; call after inserting
//   setAvatarStatus(el, status, { tip, label })             change state, with a short start/finish moment
//   badgeImg(agent)                                         a cheap static <img> badge for long lists
//
// size: 'xs' 28px · 'sm' 44px · 'md' 88px · 'lg' 140px · 'xl' 220px, or a number of pixels.
// mode: 'full' (whole character), 'badge' (round head crop), 'desk' (behind a desk: no held prop).
// All motion is CSS (gems.css): no animation loop runs in JavaScript, avatars off screen are paused,
// and prefers-reduced-motion turns movement off while keeping expressions.
import { characterSVG } from './characters.js';
import { identityFor } from './identities.js';
import { describeState, normalizeState, STATE_LABEL } from './status.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SIZES = new Set(['xs', 'sm', 'md', 'lg', 'xl']);
let seq = 0;

export function avatarHTML(agent, { status = 'idle', size = 'md', mode = 'full', label = '', tip = '' } = {}) {
  const id = identityFor(agent);
  const st = normalizeState(status);
  const sizeClass = SIZES.has(size) ? ` gem-${size}` : '';
  const px = typeof size === 'number' ? ` data-px="${Math.round(size)}"` : '';
  const aria = esc(label || `${id.name}: ${STATE_LABEL[st]}`);
  return `<span class="gem gem-${esc(mode)}${sizeClass} st-${st}" data-gem="${esc(id.id)}" data-agent="${esc(agent)}" data-status="${st}"${px} role="img" aria-label="${aria}"${tip ? ` data-tip="${esc(tip)}"` : ''}>${characterSVG(id, { uid: `g${seq += 1}`, viewBox: mode === 'badge' ? id.badge : undefined })}</span>`;
}

// One shared observer pauses avatars that are scrolled out of view.
const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
  for (const e of entries) e.target.classList.toggle('gem-off', !e.isIntersecting);
}, { rootMargin: '120px' });
const watched = new Set();

export function mountAvatars(root = document, { observe = true } = {}) {
  for (const el of root.querySelectorAll('.gem:not([data-mounted])')) {
    el.dataset.mounted = '1';
    const id = identityFor(el.dataset.agent);
    const s = el.style;
    s.setProperty('--gem-primary', id.theme.primary);
    s.setProperty('--gem-soft', id.theme.soft);
    s.setProperty('--gem-ink', id.theme.ink);
    s.setProperty('--gem-blink', `${id.motion.blink || 5}s`);
    s.setProperty('--gem-blink-delay', `${(-Math.random() * (id.motion.blink || 5)).toFixed(2)}s`);
    s.setProperty('--gem-float', `${-(id.motion.float || 1.5)}px`);
    s.setProperty('--gem-tilt', `${id.motion.tilt || 4}deg`);
    s.setProperty('--gem-phase', `${(-Math.random() * 4).toFixed(2)}s`);
    if (el.dataset.px) s.setProperty('--gem-size', `${el.dataset.px}px`);
    if (!observe) continue; // e.g. a pop-out window, whose page this observer can't see
    observer?.observe(el);
    watched.add(el);
  }
  // Forget avatars that left the page.
  for (const el of watched) {
    if (!el.isConnected) {
      observer?.unobserve(el);
      watched.delete(el);
    }
  }
}

const MOMENTS = ['gem-start', 'gem-done', 'gem-oops'];
const busy = (st) => st === 'working' || st === 'researching';

export function setAvatarStatus(el, status, { tip, label, agentLabel, doing } = {}) {
  if (!el) return;
  const st = normalizeState(status);
  const prev = el.dataset.status;
  const id = identityFor(el.dataset.agent);
  const line = tip ?? describeState(id, agentLabel || el.dataset.agent, st, doing);
  el.dataset.tip = line;
  el.setAttribute('aria-label', label || line);
  if (prev === st) return;
  el.classList.remove(`st-${prev}`);
  el.classList.add(`st-${st}`);
  el.dataset.status = st;
  // A short moment when work starts or ends; skipped when effects are muted.
  const moment = busy(st) && !busy(prev) ? 'gem-start' : st === 'success' ? 'gem-done' : st === 'error' ? 'gem-oops' : null;
  if (!moment || document.documentElement.classList.contains('gems-muted')) return;
  // Restart the moment on the next frame, so a status change never forces a layout.
  el.classList.remove(...MOMENTS);
  requestAnimationFrame(() => {
    el.classList.add(moment);
    clearTimeout(el.gemTimer);
    el.gemTimer = setTimeout(() => el.classList.remove(moment), 1300);
  });
}

// Static badges for tables and logs: one data: URL per character, so hundreds of rows cost little.
const badgeCache = new Map();
export function badgeImg(agent, label = '') {
  const id = identityFor(agent);
  if (!badgeCache.has(id.id)) {
    const [x, y, w, h] = id.badge.split(' ').map(Number);
    const svg = characterSVG(id, { uid: `b-${id.id}`, still: true, viewBox: id.badge })
      .replace('<g class="gm-root">', `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${id.theme.soft}"/><g class="gm-root">`);
    badgeCache.set(id.id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  }
  return `<img class="gem-img" src="${badgeCache.get(id.id)}" alt="${esc(label)}" title="${esc(label || id.name)}" width="24" height="24" loading="lazy">`;
}
