// The robot crew: front-end-only members of an office whose team has no agents yet. They sit at the seats of the
// office's planned roles (offices.js `crew`), walk about, and can be followed or ridden along with in 3D, but they
// have no skills, memory or tasks: nothing on mission control's server knows them. When a real agent is trained for
// one of these roles, it takes the seat (offices.js `seats`) and the robot leaves the list.
//
// Five looks, from the robot designs the founders chose on 2026-11-09. Each look's face (the black visor with its
// glowing eyes) is cut from that picture into assets/crew/<look>-face.png, its head into <look>-badge.png for the 2D
// map. world/robot3d.js builds the 3D robot from the rest:
//   hoodie, trim   the hoodie's colour and the colour of its details (strings, rings, ears)
//   glow           the colour of the glowing "AI" on the chest
//   hood           'up' (over the head) or 'down' (bunched behind the neck)
//   gear           extras on the head: headphones, antenna, cat ears, bow; drawstrings or glowing stripes on the hoodie
// No browser code here, so the tests check it.

export const LOOKS = {
  buddy: { hoodie: '#eef0f5', trim: '#3d8bff', glow: '#4aa3ff', hood: 'down', gear: ['headphones', 'strings'] },
  shadow: { hoodie: '#1d1d24', trim: '#3ff0ff', glow: '#3ff0ff', hood: 'up', gear: ['catears'] },
  sweetie: { hoodie: '#ff8fbf', trim: '#ff5fa8', glow: '#ff7ab8', hood: 'up', gear: ['bow'] },
  curious: { hoodie: '#eef0f5', trim: '#3d8bff', glow: '#4aa3ff', hood: 'down', gear: ['headphones', 'antenna'] },
  wink: { hoodie: '#e9eff6', trim: '#3ff0ff', glow: '#3ff0ff', hood: 'down', gear: ['headphones', 'stripes'] },
};

export const faceOf = (look) => `/assets/crew/${look}-face.png`;
export const badgeOf = (look) => `/assets/crew/${look}-badge.png`;

// A crew member's name among the office's walkers, kept apart from agent names.
export const crewKey = (id) => `crew:${id}`;

// A role inside a sentence: "the frontend developer", but "the QA tester" and "the DevOps engineer".
export const roleText = (role) => role.replace(/^[A-Z][a-z]+\b/, (w) => w.toLowerCase());
