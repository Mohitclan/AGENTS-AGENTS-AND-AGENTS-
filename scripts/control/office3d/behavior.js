// What each agent does in the office, and why. No Three.js: the scene asks this module for a goal
// and plays it, and the tests check the rules directly.
//
// Real work always comes first. The server works out each agent's state from real events (see
// avatarStatus in scripts/control.mjs): idle, working, researching, success, waiting, error, paused.
// Those states pick the activity below. Only an idle agent gets an ambient activity (coffee, the
// window, the sofa, a chat), chosen with cooldowns so nobody wanders without a reason. An animation
// never decides anything about a task: a thumbs-up plays because the server said "success".

import { DESKS, SPOTS } from './layout.js';

// The kind of work each role does at its desk when the server says "working".
export const ROLE_WORK = {
  developer: 'coding',
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
  coffee: { place: 'coffee', pose: 'stand', loop: 'drink', ambient: true, dwell: [16, 26], cooldown: 240, label: 'Getting a coffee' },
  window: { place: 'window', pose: 'stand', loop: 'gaze', ambient: true, dwell: [14, 24], cooldown: 180, label: 'Thinking by the window' },
  lounge: { place: 'lounge', pose: 'sit', loop: 'rest', ambient: true, dwell: [25, 45], cooldown: 300, label: 'Resting in the lounge' },
  meeting: { place: 'meeting', pose: 'stand', loop: 'chat', ambient: true, social: true, dwell: [18, 30], cooldown: 300, label: 'Chatting at the meeting table' },
  huddle: { place: 'huddle', pose: 'stand', loop: 'chat', ambient: true, social: true, dwell: [12, 20], cooldown: 240, label: 'A quick word in the middle' },
  desk: { place: 'desk', pose: 'sit', loop: 'rest', ambient: true, dwell: [30, 70], cooldown: 0, label: 'At the desk, between tasks' },
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
  return { coffee: w(0), window: w(4), lounge: w(8), meeting: w(12), huddle: w(16), desk: 1.4 + ((h >> 20) % 10) / 10, stroll: 0.85 + ((h >> 24) % 30) / 100 };
}

export const placesOf = (kind) => SPOTS.filter((s) => s.kind === kind);

// Pick an ambient activity for an idle agent. `memory` holds when it last did each activity;
// `taken` is the set of spot ids already claimed; `partners` are other idle agents free to join a
// chat. Returns { activity, spot, dwell, partner?, partnerSpot? }.
export function pickIdle({ agent, now, memory = {}, taken = new Set(), partners = [], rand = Math.random, justMoved = false }) {
  const p = personality(agent);
  const options = [];
  for (const [name, a] of Object.entries(ACTIVITIES)) {
    if (!a.ambient) continue;
    if (name === 'desk') {
      options.push({ name, weight: p.desk * (justMoved ? 2.5 : 1) });
      continue;
    }
    if (now - (memory[name] ?? -Infinity) < a.cooldown * 1000) continue;
    const free = placesOf(a.place).filter((s) => !taken.has(s.id));
    if (a.social ? free.length < 2 || !partners.length : !free.length) continue;
    options.push({ name, weight: p[name] * (justMoved ? 0.4 : 1) });
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
