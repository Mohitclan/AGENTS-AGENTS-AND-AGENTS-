// The PanScience Innovations offices. Each office is one team of agents on one map (maps.js). Today only the Sales &
// Marketing HQ has a team; the Developer Studio and the Social Media Studio are ready for theirs: their rooms are
// named and their seats are planned, so a new team moves in by filling `seats` with its agents.
//
//   id       used in the page address (#/world/<id>)
//   seats    agent -> room id on the map: where the agent sits when it works
//   planned  the roles a future team is expected to have, shown as empty seats until agents exist
//   classic  true when the office also has the older 2D and 3D views (#/), which show this team too
//   view3d   true when the office can also be shown in 3D (world/world3d.js), built from its map
//   pet      'dog' for the office dog (world/pet.js), which wanders the floor
//
// No browser code here, so the registry is checked by the tests.

export const OFFICES = [
  {
    id: 'sales',
    name: 'Sales & Marketing HQ',
    team: 'Sales and marketing',
    blurb: 'Finds leads, writes outreach, runs sales and marketing for every PanScience Innovations product.',
    map: 'campus-blue',
    accent: '#4c8dff',
    classic: true,
    view3d: true,
    pet: 'dog',
    seats: {
      coordinator: 'cabin-01',
      'lead-generator': 'office-01',
      'lead-scout': 'office-01',
      researcher: 'office-01',
      evaluator: 'auditorium',
      sales: 'office-02',
      outreach: 'office-02',
      'demo-handler': 'office-02',
      'knowledge-base': 'cabin-02',
      marketing: 'office-03',
      'seo-aeo': 'office-03',
      'docs-handler': 'office-03',
      developer: 'office-03',
    },
    planned: [],
  },
  {
    id: 'developer',
    name: 'Developer Studio',
    team: 'Developers',
    blurb: 'For the developer team: building features, reviewing code, testing and running the products.',
    map: 'dev-studio',
    accent: '#ff7a18',
    view3d: true,
    seats: {},
    planned: [
      { role: 'Frontend developer', room: 'front' },
      { role: 'Product designer', room: 'front' },
      { role: 'Backend developer', room: 'back' },
      { role: 'Data analyst', room: 'back' },
      { role: 'QA tester', room: 'qa' },
      { role: 'Code reviewer', room: 'qa' },
      { role: 'Tech lead', room: 'ops' },
      { role: 'DevOps engineer', room: 'ops' },
    ],
  },
  {
    id: 'social',
    name: 'Social Media Studio',
    team: 'Social media interns',
    blurb: 'For the social media interns: planning, making and posting content, and talking with the community.',
    map: 'social-studio',
    accent: '#ff4fd8',
    view3d: true,
    seats: {},
    planned: [
      { role: 'Content planner', room: 'planning' },
      { role: 'Community manager', room: 'planning' },
      { role: 'Copywriter', room: 'writers' },
      { role: 'Scheduler', room: 'writers' },
      { role: 'Analytics intern', room: 'writers' },
      { role: 'Designer', room: 'design' },
      { role: 'Video editor', room: 'edit' },
      { role: 'Photographer', room: 'shoot' },
    ],
  },
];

export const officeById = (id) => OFFICES.find((o) => o.id === id) || null;

// The office an agent works in, or null.
export const officeOf = (agent) => OFFICES.find((o) => Object.hasOwn(o.seats, agent)) || null;
