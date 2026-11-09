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
    map: 'hackathon',
    accent: '#2fd27c',
    view3d: true,
    seats: {},
    planned: [
      { role: 'Tech lead', room: 'hall' },
      { role: 'Frontend developer', room: 'pod-1' },
      { role: 'Backend developer', room: 'pod-2' },
      { role: 'DevOps engineer', room: 'pod-3' },
      { role: 'Code reviewer', room: 'pod-4' },
      { role: 'QA tester', room: 'pod-5' },
      { role: 'Product designer', room: 'pod-6' },
      { role: 'Data analyst', room: 'pod-8' },
    ],
  },
  {
    id: 'social',
    name: 'Social Media Studio',
    team: 'Social media interns',
    blurb: 'For the social media interns: planning, making and posting content, and talking with the community.',
    map: 'strand',
    accent: '#ff9f43',
    view3d: true,
    seats: {},
    planned: [
      { role: 'Content planner', room: 'planning' },
      { role: 'Copywriter', room: 'content-desks' },
      { role: 'Photographer', room: 'shoot' },
      { role: 'Video editor', room: 'edit' },
      { role: 'Designer', room: 'design' },
      { role: 'Community manager', room: 'community' },
      { role: 'Scheduler', room: 'open-desks' },
      { role: 'Analytics intern', room: 'meeting' },
    ],
  },
];

export const officeById = (id) => OFFICES.find((o) => o.id === id) || null;

// The office an agent works in, or null.
export const officeOf = (agent) => OFFICES.find((o) => Object.hasOwn(o.seats, agent)) || null;
