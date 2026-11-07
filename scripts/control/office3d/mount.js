// Picks the office for a page: the 3D one when the browser has WebGL 2 and the person hasn't chosen
// the flat one, else the 2D office (gems/office.js). The returned object works at once: calls made
// while the 3D office is still loading are kept and replayed, and if loading fails the 2D office
// takes over with the same calls. Switching from the 2D office to the 3D one goes through the PanScience Innovations gate
// (gems/gate.js), which covers the office while it builds and opens once it is ready.

import { playGate } from '../gems/gate.js';
import { createOffice } from '../gems/office.js';

const KEY = 'panscience.office3d';
const wants3d = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}').view !== '2d';
  } catch {
    return true;
  }
};
const setView = (view) => {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    localStorage.setItem(KEY, JSON.stringify({ ...p, view }));
  } catch {
    // storage refused
  }
};

export function mountOffice(container, opts) {
  let impl = null;
  let dead = false;
  let lastUpdate = null;
  let speed = 1;
  const flat = (why) => {
    impl?.destroy?.();
    container.innerHTML = '';
    impl = createOffice(container, opts);
    if (why !== 'chosen' && why) {
      const note = document.createElement('p');
      note.className = 'o3-fallback-note';
      note.textContent = `The 3D office couldn't load (${why}), so this is the flat office.`;
      container.prepend(note);
    }
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'o3-to3d';
    back.textContent = '3D office';
    back.addEventListener('click', () => {
      setView('3d');
      go3d({ gate: true });
    });
    container.append(back);
    impl.setSpeed?.(speed);
    if (lastUpdate) impl.update(lastUpdate);
  };
  const go3d = async ({ gate = false } = {}) => {
    const entrance = gate ? playGate() : null;
    impl?.destroy?.();
    impl = null;
    container.innerHTML = '';
    try {
      const { createOffice3D, webglAvailable } = await import('./office3d.js');
      if (!webglAvailable()) throw new Error('this browser has no WebGL 2');
      const o = await createOffice3D(container, { ...opts, onFallback: (why) => flat(why), onRebuild: () => go3d() });
      if (dead) return o.destroy();
      impl = o;
      impl.setSpeed(speed);
      if (lastUpdate) impl.update({ ...lastUpdate, events: [] });
    } catch (error) {
      console.warn('3D office:', error);
      if (!dead) flat(error.message || 'an error');
    } finally {
      entrance?.ready(); // the doors open on the office, or on the flat one if the 3D office couldn't load
    }
  };
  if (wants3d()) go3d();
  else flat('chosen');
  return {
    update(u) {
      lastUpdate = u;
      impl?.update(u);
    },
    setSpeed(s) {
      speed = s;
      impl?.setSpeed?.(s);
    },
    showCard(name, html) {
      impl?.showCard?.(name, html);
    },
    hideCard() {
      impl?.hideCard?.();
    },
    reset() {
      impl?.reset?.();
    },
    destroy() {
      dead = true;
      impl?.destroy?.();
    },
  };
}
