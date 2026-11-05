// Where an agent with no work goes in the flat office. A desk is for work: with nothing to do an agent gets up and
// wanders the open floor, and goes back to its desk only when it is given work. (The 3D office does the same, with
// more places: coffee, the sofas, the window.) No browser code here, so the rules are tested directly.

// Spots on the open floor between and beside the two rows of desks, in percent of the room (x, y).
export const ROAM_SPOTS = [[8, 76], [22, 75], [36, 69], [64, 69], [78, 75], [92, 76], [28, 85], [72, 85], [50, 66], [50, 90], [14, 66], [86, 66]];
export const MAX_WALKING = 4; // at most this many agents on the move at once, so the room is lively but not a crowd
export const DWELL_MS = [9000, 22000];

// Picks one trip for this moment, or null. `actors` are { name, status, busy, spot, roamUntil }:
//   busy      the agent is already doing something in the room (an errand, a walk)
//   spot      the index in ROAM_SPOTS where it stands now, or null at its desk
//   roamUntil when it has stayed long enough where it is (a time, as from Date.now())
export function planRoam({ actors, now, rand = Math.random }) {
  if (actors.filter((a) => a.busy).length >= MAX_WALKING) return null;
  const ready = actors.filter((a) => a.status === 'idle' && !a.busy && now >= (a.roamUntil ?? 0));
  if (!ready.length) return null;
  const actor = ready[Math.floor(rand() * ready.length)];
  const taken = new Set(actors.filter((a) => a.spot !== null && a.spot !== undefined && a.name !== actor.name).map((a) => a.spot));
  const free = ROAM_SPOTS.map((_, i) => i).filter((i) => !taken.has(i) && i !== actor.spot);
  if (!free.length) return null;
  const spot = free[Math.floor(rand() * free.length)];
  const [lo, hi] = DWELL_MS;
  return { name: actor.name, spot, dwell: lo + rand() * (hi - lo) };
}
