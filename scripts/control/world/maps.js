// The office maps. Each one is a floor of pictures (in assets/world/) plus what an agent needs to walk on it, in map
// units with (0, 0) at the centre of the map. 100 map units are a metre in the 3D office.
//   w, h      the size of the map in map units
//   image     the picture of a one-picture map, stretched over the whole map
//   floors    the pictures of a map laid from several: [{ image, box: [x1, y1, x2, y2] }] (see `laid` below)
//   walls     line segments agents can't cross: [x1, y1, x2, y2]
//   rooms     named boxes [x1, y1, x2, y2] where agents sit, meet or take a break. kind: 'room' (seats), 'meet'
//             (where hand-offs happen), 'break' (where agents with nothing to do wander), 'other' (a label only)
// A map laid from pictures can also have:
//   seats     where the agents of a room sit, at the desks drawn in the picture: [{ room, at, face, chair }]. face is
//             the way the agent looks ('up', 'down', 'left', 'right' on the picture, or degrees clockwise from down);
//             chair is 'office' (the default), 'armchair', 'lounge', 'stool' or 'none'. A seat with `perch: true` is a
//             chair in a meeting or break room that idle agents sit on for a while, never anyone's own
//   props     the furniture, built in 3D by world/props3d.js: [{ k, at, size: [width, depth], face, ... }]. Solid
//             furniture (desks, counters, racks...) becomes `blocks` that agents walk around
//   lights    coloured lamps in the 3D office: [{ at, color, power }]
//   entrance  where a visitor starts walking in the 3D office: { at, face }
//   mood      the 3D office's colours: { light, glow, wall, cap }
// The space-station campus comes from PanScience Innovations' Nonilion project (public/world and
// src/util/mapData*.ts, 2025); a company name painted on it was covered with the PanScience Innovations logo. The
// two studios are laid from office designs the founders chose on 2026-11-09 (the Social Media Studio's office
// picture carries its artist's credit, cthulhu_architect, which stays on the floor).
// To add a map: put its pictures in assets/world/, add an entry here, and check it on the Offices page with "Show
// walls" turned on.

// Furniture agents walk around rather than through. Chairs, rugs, lights and wall screens are not in the way.
export const SOLID = new Set(['desk', 'table', 'counter', 'rack', 'cabinet', 'crate', 'kiosk', 'plant', 'sofa', 'shelf', 'lighttable', 'console', 'side', 'roundtable']);

const FACE = { down: 0, left: 90, up: 180, right: 270 };
// A facing as degrees clockwise from down on the picture: 'right' is 270, 45 is down and to the left.
export const turnOf = (face = 0) => (typeof face === 'number' ? face : FACE[face] ?? 0);

// The pictures of a map, each with the box it covers.
export const floorsOf = (map) => map.floors || [{ image: map.image, box: [-map.w / 2, -map.h / 2, map.w / 2, map.h / 2] }];

// One picture laid on a map. Its walls, rooms, seats, furniture and lights are traced in the picture's own pixels
// (`t`), and land in map units: the picture's top-left corner goes to `at`, each pixel is `scale` map units, and
// `crop` is the pixel the saved picture starts from when it was cut from a bigger one. A wall is a line through
// several points: [x1, y1, x2, y2, x3, y3, ...].
function laid({ image, px: [pw, ph], at: [x0, y0], scale, crop: [cx, cy] = [0, 0] }, t) {
  const r = (v) => Math.round(v * 10) / 10;
  const P = ([x, y]) => [r(x0 + (x - cx) * scale), r(y0 + (y - cy) * scale)];
  const walls = [];
  for (const line of t.walls || []) {
    for (let i = 2; i + 1 < line.length; i += 2) walls.push([...P([line[i - 2], line[i - 1]]), ...P([line[i], line[i + 1]])]);
  }
  return {
    floor: { image, box: [x0, y0, r(x0 + pw * scale), r(y0 + ph * scale)] },
    walls,
    rooms: (t.rooms || []).map((room) => ({ ...room, box: [...P(room.box.slice(0, 2)), ...P(room.box.slice(2))] })),
    seats: (t.seats || []).map((s) => ({ ...s, at: P(s.at) })),
    props: (t.props || []).map((p) => ({ ...p, at: P(p.at), size: p.size.map((v) => r(v * scale)) })),
    lights: (t.lights || []).map((l) => ({ ...l, at: P(l.at) })),
    entrance: t.entrance && { ...t.entrance, at: P(t.entrance.at) },
  };
}

// A map from laid pictures, with the solid furniture as blocks for walking.
function joined(meta, ...parts) {
  const all = (key) => parts.flatMap((p) => p[key]);
  const props = all('props');
  return {
    ...meta,
    floors: parts.map((p) => p.floor),
    walls: all('walls'),
    rooms: all('rooms'),
    seats: all('seats'),
    props,
    blocks: props.filter((p) => SOLID.has(p.k)).map((p) => ({ at: p.at, size: p.size, turn: turnOf(p.face) })),
    lights: all('lights'),
    entrance: parts.find((p) => p.entrance)?.entrance,
  };
}

// ---- the Developer Studio: a dark work floor with server racks, and a neon boardroom up the corridor ----
const DEV_ORANGE = '#ff7a18';
const devFloor = laid({ image: 'assets/world/dev-floor.jpg', px: [1799, 1799], at: [-630, -360], scale: 0.7 }, {
  walls: [
    [170, 1665, 170, 350, 345, 350, 345, 0],
    [505, 0, 505, 350, 1300, 350, 1300, 400, 1590, 460, 1590, 995, 1700, 995, 1700, 1655, 1110, 1655, 1110, 1799, 780, 1799, 780, 1665, 170, 1665],
  ],
  rooms: [
    { id: 'front', name: 'Frontend pod', box: [300, 360, 790, 1000], kind: 'room' },
    { id: 'back', name: 'Backend pod', box: [880, 470, 1580, 990], kind: 'room' },
    { id: 'coffee', name: 'Coffee point', box: [520, 980, 1110, 1260], kind: 'break' },
    { id: 'qa', name: 'QA lab', box: [180, 1150, 640, 1655], kind: 'room' },
    { id: 'ops', name: 'Ops room', box: [1140, 1150, 1600, 1655], kind: 'room' },
    { id: 'aisle', name: 'Hallway', box: [790, 1260, 1100, 1790], kind: 'other' },
  ],
  seats: [
    { room: 'front', at: [680, 720], face: 'left' },
    { room: 'front', at: [720, 405], face: 'up' },
    { room: 'back', at: [935, 820], face: 'right' },
    { room: 'back', at: [1410, 845], face: 'left' },
    { room: 'qa', at: [395, 1230], face: 'left' },
    { room: 'qa', at: [395, 1360], face: 'left' },
    { room: 'ops', at: [1470, 1440], face: 'left' },
    { room: 'ops', at: [1170, 1290], face: 'right' },
  ],
  props: [
    { k: 'rack', at: [235, 520], size: [310, 130], face: 'right' },
    { k: 'rack', at: [235, 835], size: [300, 130], face: 'right' },
    { k: 'rack', at: [1445, 467], size: [280, 70], face: 12 },
    { k: 'rack', at: [1550, 805], size: [210, 70], face: 'left', tall: 1.3 },
    { k: 'rack', at: [1645, 1320], size: [640, 110], face: 'left' },
    { k: 'screen', at: [660, 356], size: [240, 8], lift: 0.6, tall: 0.8 },
    { k: 'screen', at: [895, 356], size: [150, 8], lift: 0, tall: 1.6, color: '#57d8ff' },
    { k: 'screen', at: [1150, 356], size: [260, 8], lift: 0.7, tall: 0.6, color: '#3fb6d8' },
    { k: 'neon', at: [525, 357], size: [26, 12], tall: 1.9 },
    { k: 'neon', at: [800, 357], size: [26, 12], tall: 1.9 },
    { k: 'neon', at: [1005, 357], size: [26, 12], tall: 1.9 },
    { k: 'neon', at: [1308, 382], size: [26, 12], tall: 1.9 },
    { k: 'cabinet', at: [1265, 555], size: [220, 150], tall: 0.55, top: '#2b3640' },
    { k: 'cabinet', at: [1445, 525], size: [95, 55], tall: 0.45 },
    { k: 'kiosk', at: [1545, 550], size: [80, 90] },
    { k: 'crate', at: [1030, 565], size: [140, 140], face: -20, glow: true },
    { k: 'desk', at: [510, 730], size: [330, 215], glow: true, item: 'papers', face: 'right' },
    { k: 'desk', at: [1175, 835], size: [360, 220], glow: true, item: 'monitor', face: 'down' },
    { k: 'kiosk', at: [675, 975], size: [90, 160] },
    { k: 'counter', at: [320, 1095], size: [300, 80] },
    { k: 'counter', at: [715, 1420], size: [130, 470] },
    { k: 'counter', at: [540, 1630], size: [220, 60] },
    { k: 'desk', at: [270, 1320], size: [300, 140], glow: true, item: 'monitor', face: 'right' },
    { k: 'crate', at: [515, 1300], size: [140, 130], face: 30 },
    { k: 'crate', at: [470, 1525], size: [150, 120], face: -20, glow: true, tall: 0.3 },
    { k: 'counter', at: [1330, 1075], size: [420, 130] },
    { k: 'counter', at: [1075, 1470], size: [120, 360] },
    { k: 'desk', at: [1305, 1285], size: [140, 180], glow: true, item: 'monitor', face: 'left' },
    { k: 'desk', at: [1360, 1430], size: [150, 120], glow: true, face: 'right' },
    { k: 'crate', at: [1490, 1195], size: [150, 90], face: -40, glow: true },
  ],
  lights: [
    { at: [510, 730], color: DEV_ORANGE, power: 2.2 },
    { at: [1175, 845], color: DEV_ORANGE, power: 2.2 },
    { at: [330, 1360], color: DEV_ORANGE, power: 1.8 },
    { at: [1320, 1330], color: DEV_ORANGE, power: 2 },
    { at: [940, 1350], color: '#3fb6d8', power: 1.6 },
  ],
  entrance: { at: [945, 1745], face: 'up' },
});
const devBoardroom = laid({ image: 'assets/world/dev-boardroom.jpg', px: [1799, 1799], at: [-497.5, -900], scale: 0.3 }, {
  walls: [[400, 1799, 80, 1799, 80, 0, 1720, 0, 1720, 1799, 700, 1799]],
  rooms: [{ id: 'boardroom', name: 'Boardroom', box: [90, 10, 1710, 1790], kind: 'meet' }],
  seats: [
    ...[[533, 360], [513, 700], [493, 1060], [473, 1400]].map((at) => ({ room: 'boardroom', at, face: 'right', chair: 'none', perch: true })),
    ...[[1247, 360], [1267, 700], [1297, 1060], [1317, 1400]].map((at) => ({ room: 'boardroom', at, face: 'left', chair: 'none', perch: true })),
  ],
  props: [
    { k: 'table', at: [900, 840], size: [570, 1390] },
    ...[[480, 360], [460, 700], [440, 1060], [420, 1400]].map((at) => ({ k: 'lounge', at, size: [230, 250], face: 'right' })),
    ...[[1300, 360], [1320, 700], [1350, 1060], [1370, 1400]].map((at) => ({ k: 'lounge', at, size: [230, 250], face: 'left' })),
    { k: 'plant', at: [330, 110], size: [200, 200], tall: 0.9 },
    { k: 'plant', at: [1460, 110], size: [200, 200], tall: 0.9 },
  ],
  lights: [
    { at: [900, 500], color: '#ff3df2', power: 2.4 },
    { at: [900, 1250], color: '#ff3df2', power: 2.4 },
  ],
});

// ---- the Social Media Studio: the writers' office, and a neon shoot studio at the end of its hallway ----
const socialOffice = laid({ image: 'assets/world/social-office.jpg', px: [1213, 1138], at: [-1201, -740], scale: 1.3, crop: [0, 395] }, {
  walls: [
    [0, 1275, 0, 405, 1213, 405, 1213, 1095],
    [345, 405, 345, 1095],
    [868, 405, 868, 1095],
    [868, 838, 1130, 838],
    [1180, 838, 1213, 838],
    [0, 1095, 88, 1095],
    [168, 1095, 500, 1095],
    [608, 1095, 1120, 1095],
    [1200, 1095, 1213, 1095, 1213, 1119.6],
    [0, 1275, 1213, 1275, 1213, 1250.4],
  ],
  rooms: [
    { id: 'writers', name: "Writers' room", box: [10, 412, 338, 1088], kind: 'room' },
    { id: 'planning', name: 'Planning office', box: [352, 412, 862, 1088], kind: 'meet' },
    { id: 'design', name: 'Design lab', box: [875, 412, 1208, 832], kind: 'room' },
    { id: 'edit', name: 'Edit suite', box: [875, 845, 1208, 1088], kind: 'room' },
    { id: 'hall', name: 'Hallway', box: [5, 1100, 1208, 1270], kind: 'other' },
  ],
  seats: [
    { room: 'writers', at: [262, 590], face: 'up' },
    { room: 'writers', at: [262, 765], face: 'up' },
    { room: 'writers', at: [262, 940], face: 'up' },
    { room: 'planning', at: [607, 640], face: 'down' },
    { room: 'planning', at: [518, 805], face: 'up', chair: 'armchair' },
    { room: 'planning', at: [692, 805], face: 'up', chair: 'armchair' },
    { room: 'design', at: [1108, 575], face: 'right' },
    { room: 'design', at: [1012, 575], face: 'left', chair: 'stool' },
    { room: 'edit', at: [1015, 985], face: 'right' },
    { room: 'planning', at: [442, 930], face: 'right', chair: 'none', perch: true },
    { room: 'planning', at: [442, 1010], face: 'right', chair: 'none', perch: true },
  ],
  props: [
    ...[530, 707, 882].map((y) => ({ k: 'desk', at: [258, y], size: [128, 58], top: '#c98f6b', item: 'typewriter' })),
    { k: 'plant', at: [213, 1048], size: [70, 70], tall: 0.55, bloom: '#d8333a' },
    { k: 'plant', at: [302, 1052], size: [55, 55], tall: 0.7 },
    { k: 'cabinet', at: [475, 440], size: [200, 55], tall: 0.7, top: '#8a5a3c' },
    { k: 'cabinet', at: [735, 440], size: [200, 55], tall: 0.7, top: '#8a5a3c' },
    { k: 'shelf', at: [388, 640], size: [165, 60], face: 'right' },
    { k: 'desk', at: [606, 708], size: [258, 75], top: '#a87252', item: 'papers', face: 'up' },
    { k: 'sofa', at: [390, 970], size: [180, 70], face: 'right', color: '#a0704d' },
    { k: 'side', at: [390, 832], size: [60, 60] },
    { k: 'roundtable', at: [780, 1010], size: [90, 90] },
    { k: 'plant', at: [825, 843], size: [55, 55], tall: 0.8 },
    { k: 'cabinet', at: [842, 705], size: [32, 80], tall: 0.8, top: '#8a5a3c' },
    { k: 'lighttable', at: [950, 575], size: [75, 175] },
    { k: 'desk', at: [1180, 575], size: [130, 66], top: '#b07c55', item: 'monitor', face: 'left' },
    { k: 'counter', at: [1000, 805], size: [245, 38], tall: 0.45, color: '#7b5236' },
    { k: 'desk', at: [1078, 1012], size: [135, 56], top: '#b07c55', item: 'monitor', face: 'left' },
    { k: 'desk', at: [1012, 1052], size: [75, 55], top: '#b07c55' },
    { k: 'cabinet', at: [893, 975], size: [30, 190], tall: 0.7, top: '#8a5a3c' },
  ],
  lights: [
    { at: [180, 760], color: '#d6ecff', power: 1.2 },
    { at: [606, 760], color: '#ffd9a0', power: 1.4 },
    { at: [1040, 650], color: '#e8f6ff', power: 1.1 },
  ],
  entrance: { at: [600, 1235], face: 'up' },
});
const socialNeon = laid({ image: 'assets/world/social-neon.jpg', px: [1649, 1799], at: [375.9, -378], scale: 0.5, crop: [150, 0] }, {
  walls: [
    [220, 1160, 220, 220, 1700, 220, 1700, 1790, 220, 1790, 220, 1500],
    [150, 1160, 220, 1160],
    [150, 1500, 220, 1500],
  ],
  rooms: [
    { id: 'shoot', name: 'Neon studio', box: [230, 230, 1290, 1785], kind: 'room' },
    { id: 'lounge', name: 'Lounge', box: [1300, 640, 1690, 1785], kind: 'break' },
  ],
  seats: [
    { room: 'shoot', at: [600, 1430], face: 'down' },
    { room: 'shoot', at: [850, 1430], face: 'down' },
    { room: 'shoot', at: [1240, 625], face: 'up' },
    { room: 'shoot', at: [440, 360], face: 'left' },
    { room: 'shoot', at: [440, 490], face: 'left' },
    { room: 'lounge', at: [1372, 974], face: 70, chair: 'none', perch: true },
    { room: 'lounge', at: [1517, 909], face: 70, chair: 'none', perch: true },
  ],
  props: [
    { k: 'desk', at: [305, 440], size: [400, 170], top: '#2a2140', item: 'papers', face: 'right' },
    { k: 'neon', at: [228, 310], size: [8, 200], lift: 0.95, tall: 0.06, color: '#ff4fd8' },
    { k: 'desk', at: [1240, 470], size: [240, 180], top: '#15172a', item: 'monitor', face: 'down' },
    { k: 'lounge', at: [1460, 360], size: [140, 130], face: 45 },
    { k: 'lounge', at: [1410, 960], size: [170, 150], face: 70 },
    { k: 'lounge', at: [1555, 895], size: [170, 110], face: 70 },
    { k: 'side', at: [1460, 1400], size: [90, 90] },
    { k: 'plant', at: [1560, 1530], size: [150, 150], tall: 0.6, spiky: true },
    { k: 'console', at: [725, 1565], size: [490, 150], face: 'up' },
    { k: 'neon', at: [1692, 360], size: [8, 460], lift: 1.25, tall: 0.06, color: '#cfeaff' },
    { k: 'neon', at: [1692, 1060], size: [8, 580], lift: 1.25, tall: 0.06, color: '#cfeaff' },
    { k: 'neon', at: [430, 226], size: [330, 8], lift: 1.65, tall: 0.06, color: '#d58cff' },
    { k: 'neon', at: [755, 226], size: [170, 8], lift: 1.4, tall: 0.06, color: '#ff4fd8' },
    { k: 'neon', at: [1410, 226], size: [340, 8], lift: 1.65, tall: 0.06, color: '#bfe3ff' },
  ],
  lights: [
    { at: [650, 430], color: '#ff3df2', power: 2.6 },
    { at: [1450, 900], color: '#2f8cff', power: 2.4 },
    { at: [900, 1650], color: '#b44dff', power: 2 },
  ],
});

export const MAPS = {
  'campus-blue': {
    name: 'Space-station campus',
    image: 'assets/world/campus-blue.jpg',
    thumb: 'assets/world/campus-blue-thumb.jpg',
    w: 3000,
    h: 3000,
    rooms: [
      { id: 'office-01', name: 'Lead room', box: [-1331, -1275, -694, -769], kind: 'room' },
      { id: 'cabin-01', name: "Captain's cabin", box: [-337, -1275, 375, -656], kind: 'room' },
      { id: 'kitchen', name: 'Kitchen', box: [712, -1144, 1350, -656], kind: 'break' },
      { id: 'auditorium', name: 'Review hall', box: [-1331, -394, -694, 300], kind: 'room' },
      { id: 'boardroom', name: 'Boardroom', box: [-319, -262, 450, 300], kind: 'meet' },
      { id: 'toilets', name: 'Toilets', box: [750, -225, 1181, 244], kind: 'other' },
      { id: 'office-02', name: 'Sales floor', box: [-1406, 675, -694, 1238], kind: 'room' },
      { id: 'cabin-02', name: 'Knowledge library', box: [-281, 712, 412, 1238], kind: 'room' },
      { id: 'office-03', name: 'Marketing and web', box: [712, 712, 1350, 1238], kind: 'room' },
    ],
    walls: [
      [-1500, -1500, 1500, -1500],
      [-1500, -1500, -1500, 1500],
      [-1500, 1500, 1500, 1500],
      [1500, -1500, 1500, 1500],
      [-1290, -1288, 325, -1288],
      [-1337, -1215, -1337, -787],
      [-1270, -728, -1092, -728],
      [-1092, -728, -1092, -395],
      [-971, -728, -971, -395],
      [-971, -728, -745, -728],
      [-680, -1175, -680, -788],
      [-680, -1175, -585, -1175],
      [-585, -1175, -585, -360],
      [-1290, -1288, -1337, -1215],
      [-1270, -728, -1337, -787],
      [-745, -728, -680, -787],
      [-335, -1175, -335, -670],
      [-480, -1175, -335, -1175],
      [-480, -1175, -480, -10],
      [-260, -600, -55, -600],
      [-55, -600, -55, -255],
      [80, -600, 80, -255],
      [80, -600, 340, -600],
      [415, -1245, 415, -1055],
      [415, -1055, 715, -1055],
      [415, -950, 415, -670],
      [415, -950, 500, -950],
      [500, -950, 500, -255],
      [325, -1288, 415, -1245],
      [340, -600, 415, -670],
      [-260, -600, -335, -670],
      [710, -1138, 1370, -1138],
      [710, -1138, 710, -1058],
      [710, -950, 710, -690],
      [610, -950, 710, -950],
      [610, 125, 610, -950],
      [1075, -620, 1300, -620],
      [780, -620, 955, -620],
      [955, -620, 955, -220],
      [1075, -620, 1075, -220],
      [1370, -1140, 1370, -690],
      [1300, -620, 1370, -690],
      [780, -620, 710, -690],
      [-1305, -395, -1092, -395],
      [-971, -395, -725, -395],
      [-1345, -330, -1345, 280],
      [-1275, 335, -1095, 335],
      [-969, 335, -735, 335],
      [-1095, 335, -1095, 688],
      [-969, 335, -969, 688],
      [-585, -358, -700, -358],
      [-585, -250, -670, -250],
      [-585, -250, -585, 875],
      [-670, -250, -670, 280],
      [-725, -395, -700, -358],
      [-670, 280, -735, 335],
      [-1305, -395, -1345, -330],
      [-1345, 280, -1275, 335],
      [-285, -255, -55, -255],
      [-330, -180, -330, -10],
      [-480, -10, -330, -10],
      [-330, 100, -330, 295],
      [-480, 100, -330, 100],
      [-480, 100, -480, 1109],
      [-260, 350, -50, 350],
      [85, 350, 340, 350],
      [-50, 350, -50, 715],
      [85, 350, 85, 715],
      [80, -255, 500, -255],
      [410, -140, 410, 300],
      [500, -140, 410, -140],
      [500, -140, 500, 1000],
      [-285, -255, -330, -180],
      [-260, 350, -330, 295],
      [410, 300, 340, 350],
      [755, -220, 955, -220],
      [1075, -220, 1215, -220],
      [760, 235, 760, 280],
      [760, 125, 760, -220],
      [760, 125, 610, 125],
      [760, 235, 610, 235],
      [610, 235, 610, 755],
      [1015, 335, 1170, 335],
      [805, 335, 925, 335],
      [1015, 725, 1015, 335],
      [925, 725, 925, 335],
      [1215, -220, 1215, 280],
      [1215, 280, 1170, 335],
      [760, 280, 805, 335],
      [-1370, 688, -1095, 688],
      [-969, 688, -670, 688],
      [-1410, 760, -1410, 1210],
      [-1340, 1265, -740, 1265],
      [-670, 688, -670, 875],
      [-670, 980, -670, 1210],
      [-670, 875, -585, 875],
      [-670, 980, -585, 980],
      [-585, 980, -585, 1215],
      [-585, 1215, -280, 1215],
      [-1370, 688, -1410, 760],
      [-1410, 1210, -1340, 1265],
      [-670, 1210, -740, 1265],
      [-280, 715, -50, 715],
      [85, 715, 380, 715],
      [-280, 1110, -280, 715],
      [-480, 1110, -280, 1110],
      [-230, 1260, 330, 1260],
      [380, 1210, 380, 1110],
      [380, 715, 380, 1000],
      [380, 1000, 500, 1000],
      [380, 1110, 610, 1110],
      [380, 1210, 330, 1260],
      [-280, 1215, -230, 1260],
      [720, 725, 925, 725],
      [1015, 725, 1285, 725],
      [720, 860, 720, 1220],
      [720, 755, 720, 725],
      [610, 755, 720, 755],
      [610, 860, 720, 860],
      [610, 860, 610, 1110],
      [785, 1280, 1310, 1280],
      [1375, 770, 1375, 1220],
      [1375, 770, 1285, 725],
      [1310, 1280, 1375, 1220],
      [785, 1280, 720, 1220],
    ],
  },
  'dev-studio': joined({
    name: 'Neon build floor',
    thumb: 'assets/world/dev-studio-thumb.jpg',
    w: 1260,
    h: 1800,
    mood: { light: 0.5, glow: 0.85, wall: '#18222c', cap: DEV_ORANGE },
  }, devFloor, devBoardroom),
  'social-studio': joined({
    name: "Writers' office and neon studio",
    thumb: 'assets/world/social-studio-thumb.jpg',
    w: 2402,
    h: 1480,
    mood: { light: 0.95, glow: 0.4, wall: '#4a3428', cap: '#ff9f43', ceiling: '#3d3330' },
  }, socialOffice, socialNeon),
};
