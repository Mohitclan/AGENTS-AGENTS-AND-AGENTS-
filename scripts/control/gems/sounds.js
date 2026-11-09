// Short sounds for things a person should notice, from Nonilion's bell and notification sounds:
//   done        a task finished
//   attention   something waits for you: a draft to approve, a question to answer
//   ping        a warning: an agent looks stuck, the task is running out of time
// On by default; the switch in the top bar turns them off, and the choice is kept in this browser. Browsers only play
// sound after the person has clicked or typed on the page once, so the first alerts of a fresh page may be silent.
const FILES = { done: '/assets/sounds/done.mp3', attention: '/assets/sounds/attention.mp3', ping: '/assets/sounds/ping.wav' };
const KEY = 'mc.sounds';
let on = true;
try {
  on = localStorage.getItem(KEY) !== 'off';
} catch {
  // private window: on until the page closes
}
let lastAt = 0;

export const soundsOn = () => on;

export function setSounds(value) {
  on = !!value;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // private window
  }
}

// Plays one of the sounds, at most one every two seconds so a burst of updates stays a single chime.
export function chime(kind = 'attention') {
  if (!on || !FILES[kind] || Date.now() - lastAt < 2000) return;
  lastAt = Date.now();
  const audio = new Audio(FILES[kind]);
  audio.volume = kind === 'ping' ? 0.5 : 0.65;
  audio.play().catch(() => undefined); // blocked until the page has been clicked once
}
