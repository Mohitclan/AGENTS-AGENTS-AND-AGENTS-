// Agent status → avatar state. The server works the state out from real events (see avatarStatus in
// scripts/control.mjs); this module only names the states and turns older words into them. Demo
// states come from simulator.js and are always shown with a "Simulation" label.

export const STATES = ['idle', 'working', 'researching', 'success', 'waiting', 'error', 'paused'];

export const STATE_LABEL = {
  idle: 'Idle', working: 'Working', researching: 'Researching', success: 'Done',
  waiting: 'Waiting', error: 'Hit a problem', paused: 'Paused',
};

export const STATE_HINT = {
  idle: 'Not on a task right now.',
  working: 'On a task: writing, checking or running a script.',
  researching: 'Searching the web or reading a page.',
  success: 'Finished its part in the last few minutes.',
  waiting: 'Waiting on another agent or on you.',
  error: 'Its last step failed or it handed the task to its backup.',
  paused: 'Tasks are held until the plan window resets.',
};

export function normalizeState(status) {
  if (STATES.includes(status)) return status;
  return { done: 'success', failed: 'error', running: 'working' }[status] || 'idle';
}

// One line for a tooltip or a screen reader.
export function describeState(identity, agentLabel, status, doing) {
  const st = normalizeState(status);
  return `${identity.name} (${agentLabel}): ${STATE_LABEL[st]}${doing ? `. ${doing}` : ''}`;
}
