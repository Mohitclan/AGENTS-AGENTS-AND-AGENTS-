// The office dog (sprites from Nonilion, assets/dog/). It trots from room to room on the same paths as the agents,
// then does something dog-like for a while: sniffs around, sits, barks, or lies down and naps. Both views of an
// office draw it from this: the 2D map as a sprite element, the 3D office as a sprite that always faces the camera.
//
//   const pet = createPet({ grid, places })   places: [x, y] points it may trot to (map units)
//   pet.step(seconds)                          moves it and moves its activity on
//   pet.look()                                 { at, left, anim, frame }: what to draw now
//
// No browser code here, so it is tested directly.
import { findPath, pathLength, pointAlong } from './nav.js';

// Each sheet is one row of 64 x 64 frames. once: plays one time and holds its last frame.
export const DOG = {
  idle: { frames: 7, fps: 7 },
  run: { frames: 5, fps: 12 },
  sit: { frames: 8, fps: 8, once: true },
  sniff: { frames: 26, fps: 10 },
  lie: { frames: 12, fps: 9, once: true },
  sleep: { frames: 8, fps: 4 },
  bark: { frames: 12, fps: 12 },
};
export const sheet = (anim) => `/assets/dog/${anim}.png`;

// What it does when it gets somewhere, how often (weights) and for how long (seconds).
const ACTIVITIES = [
  { anim: 'sniff', weight: 30, secs: [3, 6] },
  { anim: 'idle', weight: 20, secs: [3, 7] },
  { anim: 'sit', weight: 20, secs: [6, 14] },
  { anim: 'sleep', weight: 15, secs: [14, 30] }, // lies down first, then sleeps
  { anim: 'bark', weight: 5, secs: [1.5, 2.5] },
];

export function createPet({ grid, places, speed = 230, rand = Math.random, start = null }) {
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const s = { at: [...(start || pick(places))], heading: [1, 0], path: null, total: 0, walked: 0, anim: 'idle', clock: 0, until: 2 };

  function choose() {
    let r = rand() * ACTIVITIES.reduce((n, a) => n + a.weight, 0);
    const act = ACTIVITIES.find((a) => (r -= a.weight) < 0) || ACTIVITIES[0];
    s.anim = act.anim === 'sleep' ? 'lie' : act.anim;
    s.sleepAfter = act.anim === 'sleep' ? DOG.lie.frames / DOG.lie.fps : null;
    s.clock = 0;
    s.until = act.secs[0] + rand() * (act.secs[1] - act.secs[0]);
  }

  function goSomewhere() {
    for (let tries = 0; tries < 5; tries++) {
      const to = pick(places);
      if (Math.hypot(to[0] - s.at[0], to[1] - s.at[1]) < 150) continue;
      const path = findPath(grid, s.at, to);
      if (!path) continue;
      Object.assign(s, { path, total: pathLength(path), walked: 0, anim: 'run', clock: 0 });
      return;
    }
    choose(); // nowhere to go: stay and do something else
  }

  return {
    step(dt) {
      s.clock += dt;
      if (s.path) {
        s.walked = Math.min(s.total, s.walked + speed * dt);
        const p = pointAlong(s.path, s.walked);
        if (Math.hypot(p[0] - s.at[0], p[1] - s.at[1]) > 0.01) s.heading = [p[0] - s.at[0], p[1] - s.at[1]];
        s.at = p;
        if (s.walked >= s.total) {
          s.path = null;
          choose();
        }
        return;
      }
      if (s.sleepAfter !== null && s.sleepAfter !== undefined && s.anim === 'lie' && s.clock >= s.sleepAfter) s.anim = 'sleep';
      if (s.clock >= s.until) goSomewhere();
    },
    look() {
      const d = DOG[s.anim];
      const n = Math.floor((s.anim === 'sleep' && s.sleepAfter ? s.clock - s.sleepAfter : s.clock) * d.fps);
      return { at: s.at, left: s.heading[0] < 0, anim: s.anim, frame: d.once ? Math.min(d.frames - 1, n) : ((n % d.frames) + d.frames) % d.frames, walking: !!s.path };
    },
  };
}
