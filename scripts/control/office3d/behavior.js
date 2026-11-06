// What each agent does in the office, and why. No Three.js: the scene asks this module for a goal
// and plays it, and the tests check the rules directly.
//
// Real work always comes first. The server works out each agent's state from real events (see
// avatarStatus in scripts/control.mjs): idle, working, researching, success, waiting, error, paused.
// Those states pick the activity below. An agent with no work is not at its desk: a desk is for work. It
// roams (coffee, the window, the sofa, a chat, a stroll, the bookshelf), moving on when it has had its turn
// at a place, and goes to its desk only when the server gives it something to do. An animation never decides
// anything about a task: a thumbs-up plays because the server said "success".

import { DESKS, SPOTS } from './layout.js';

// The kind of work each role does at its desk when the server says "working".
export const ROLE_WORK = {
  developer: 'coding',
  'seo-aeo': 'coding',
  evaluator: 'analyzing',
  coordinator: 'planning',
  researcher: 'writing',
  'lead-generator': 'writing',
  'knowledge-base': 'writing',
  outreach: 'writing',
  sales: 'writing',
  marketing: 'writing',
  'demo-handler': 'writing',
  'docs-handler': 'writing',
};

// Activity → where it happens, the pose, what the body does there, and the face.
//   place: 'desk' (the agent's own seat), or a spot kind from layout.js
//   loop:  the procedural layer played while there (see characters.js)
//   once:  a clip played on arrival
export const ACTIVITIES = {
  coding: { place: 'desk', pose: 'sit', loop: 'type', pace: 1.3, label: 'Coding at the desk' },
  writing: { place: 'desk', pose: 'sit', loop: 'type', pace: 0.9, think: true, label: 'Writing at the desk' },
  analyzing: { place: 'desk', pose: 'sit', loop: 'read', think: true, label: 'Reviewing at the desk' },
  researching: { place: 'desk', pose: 'sit', loop: 'read', scroll: true, label: 'Reading the web at the desk' },
  planning: { place: 'board', pose: 'stand', loop: 'present', label: 'Planning at the task display' },
  waiting: { place: 'desk', pose: 'stand', loop: 'wait', face: { Surprised: 0.25 }, look: 'board', label: 'Waiting on a colleague or on you' },
  error: { place: 'desk', pose: 'stand', loop: 'upset', once: 'No', face: { Sad: 0.85 }, label: 'Stopped: the last step failed' },
  success: { place: 'here', pose: 'stand', loop: 'still', once: 'ThumbsUp', label: 'Finished its part' },
  paused: { place: 'lounge', pose: 'sit', loop: 'rest', label: 'Paused until the plan window resets' },
  // ambient, only when idle
  coffee: { place: 'coffee', pose: 'stand', loop: 'drink', ambient: true, dwell: [18, 30], cooldown: 150, label: 'Getting a coffee' },
  window: { place: 'window', pose: 'stand', loop: 'gaze', ambient: true, dwell: [14, 24], cooldown: 120, label: 'Thinking by the window' },
  lounge: { place: 'lounge', pose: 'sit', loop: 'rest', ambient: true, dwell: [30, 60], cooldown: 150, label: 'Resting in the lounge' },
  meeting: { place: 'meeting', pose: 'stand', loop: 'chat', ambient: true, social: true, dwell: [18, 30], cooldown: 180, label: 'Chatting at the meeting table' },
  huddle: { place: 'huddle', pose: 'stand', loop: 'chat', ambient: true, social: true, dwell: [12, 20], cooldown: 150, label: 'A quick word in the middle' },
  // a stroll walks 3-5 waypoints round the office, pausing a few seconds at each
  stroll: { place: 'stroll', pose: 'stand', loop: 'look', ambient: true, dwell: [3, 6], legs: [3, 5], cooldown: 60, label: 'Stretching their legs' },
  shelf: { place: 'shelf', pose: 'stand', loop: 'browse', ambient: true, dwell: [12, 22], cooldown: 200, label: 'Browsing the bookshelf' },
  desk: { place: 'desk', pose: 'sit', loop: 'rest', ambient: true, dwell: [15, 35], cooldown: 0, label: 'At the desk, between tasks' },
  // while the speaker plays: agents with no work dance on the rug (never an agent that has work)
  dance: { place: 'dance', pose: 'stand', loop: 'dance', label: 'Dancing to the music' },
  // errands from real events
  brief: { place: 'brief', pose: 'stand', loop: 'chat', label: 'Getting the brief from the Captain' },
  visit: { place: 'visit', pose: 'stand', loop: 'chat', label: 'Asking a colleague' },
  deliver: { place: 'tray', pose: 'stand', loop: 'still', once: 'Yes', label: 'Leaving something for you to approve' },
};

// The activity a real state asks for, or null when the agent is idle and may choose.
export function activityFor(state, agent) {
  switch (state) {
    case 'working':
      return ROLE_WORK[agent] || 'writing';
    case 'researching':
      return 'researching';
    case 'waiting':
    case 'error':
    case 'success':
    case 'paused':
      return state;
    default:
      return null;
  }
}

// Small, stable differences between agents: some like coffee, some the window.
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function personality(agent) {
  const h = hash(agent);
  const w = (shift) => 0.5 + ((h >> shift) % 10) / 10;
  // `pace` is how fast this agent walks; the rest weigh its idle choices
  return { coffee: w(0), window: w(4), lounge: w(8), meeting: w(12), huddle: w(16), stroll: w(2), shelf: w(6) * 0.7, desk: 0.6 + ((h >> 20) % 10) / 10, pace: 0.85 + ((h >> 24) % 30) / 100 };
}

export const placesOf = (kind) => SPOTS.filter((s) => s.kind === kind);

// The office settings from what was saved. Agents with no work roam unless the person pressed "Reduced motion"
// (saved as motion: 'reduced'). The computer's own reduce-motion setting only calms the camera, and an older save that
// held it as `reduced` is ignored, so nobody stays seated because of a setting the person never chose here.
export const initialPrefs = (saved = {}) => ({ ambient: true, ...saved, reduced: saved?.motion === 'reduced' });

// What to tell the person when their own settings keep agents at their desks, so a seated office is never a mystery.
// Nothing (an empty string) when agents are free to roam.
export function roamNote(prefs) {
  if (prefs?.reduced) return 'Reduced motion is on, so agents with no work stay at their desks. Press Reduced motion to turn it off.';
  if (prefs?.ambient === false) return 'Roaming is off, so agents with no work stay at their desks. Press Ambient to turn it on.';
  return '';
}

// Pick an ambient activity for an idle agent. `memory` holds when it last did each activity;
// `taken` is the set of spot ids already claimed; `partners` are other idle agents free to join a
// chat. Returns { activity, spot, dwell, partner?, partnerSpot? }. Never the desk, unless there is
// nowhere at all to go.
export function pickIdle({ agent, now, memory = {}, taken = new Set(), partners = [], rand = Math.random, justMoved = false }) {
  const p = personality(agent);
  const usable = (a) => {
    const free = placesOf(a.place).filter((s) => !taken.has(s.id));
    return a.social ? free.length >= 2 && partners.length > 0 : free.length > 0;
  };
  const roaming = Object.entries(ACTIVITIES).filter(([name, a]) => a.ambient && name !== 'desk');
  const options = [];
  for (const [name, a] of roaming) {
    if (now - (memory[name] ?? -Infinity) < a.cooldown * 1000) continue;
    if (usable(a)) options.push({ name, weight: p[name] * (justMoved ? 0.75 : 1) });
  }
  if (!options.length) {
    // Everything was done recently: repeat what was done longest ago, rather than sit at the desk.
    const again = roaming.filter(([, a]) => usable(a)).sort((x, y) => (memory[x[0]] ?? -Infinity) - (memory[y[0]] ?? -Infinity))[0];
    options.push({ name: again ? again[0] : 'desk', weight: 1 });
  }
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = rand() * total;
  let choice = options[options.length - 1];
  for (const o of options) {
    r -= o.weight;
    if (r <= 0) {
      choice = o;
      break;
    }
  }
  const a = ACTIVITIES[choice.name];
  const [lo, hi] = a.dwell;
  const dwell = (lo + rand() * (hi - lo)) * 1000;
  if (choice.name === 'desk') return { activity: 'desk', spot: null, dwell };
  const free = placesOf(a.place).filter((s) => !taken.has(s.id));
  const spot = free[Math.floor(rand() * free.length)];
  if (a.legs) {
    const [l0, l1] = a.legs;
    return { activity: choice.name, spot: spot.id, dwell, legs: l0 + Math.floor(rand() * (l1 - l0 + 1)) };
  }
  if (!a.social) return { activity: choice.name, spot: spot.id, dwell };
  const other = free.find((s) => s.id !== spot.id);
  return { activity: choice.name, spot: spot.id, dwell, partner: partners[Math.floor(rand() * partners.length)], partnerSpot: other.id };
}

// The steps between where an agent is and a goal, so nothing conflicts: a mug goes back on the
// counter before anything else, a seated agent stands before it walks, and it sits only on arrival.
//   from: { place, pose: 'sit' | 'stand', holding: null | 'mug' }
//   goal: { place, pose }
export function stepsTo(from, goal) {
  const steps = [];
  const moving = from.place !== goal.place;
  if (from.holding && (moving || goal.pose === 'sit')) steps.push('putDown');
  if (from.pose === 'sit' && (moving || goal.pose === 'stand')) steps.push('standUp');
  if (moving) steps.push('walk');
  steps.push('face');
  if (goal.pose === 'sit' && (moving || from.pose !== 'sit')) steps.push('sitDown');
  steps.push('loop');
  return steps;
}

export const deskPlace = (agent) => `desk:${agent}`;
export const hasDesk = (agent) => DESKS.some((d) => d.agent === agent);
