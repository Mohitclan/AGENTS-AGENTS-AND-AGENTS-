// The drawings on the team page: the map of the agents, the walkthrough and the sign-in picture.
// Everything here is inline SVG and CSS built from plain data, so it works with no images, no
// outside scripts and no JavaScript. dashboard.mjs decides what data to pass in.
//
// The map has a fixed set of parts. Live data changes only text and `data-*` attributes on parts
// that carry a `data-k` key, so the page can patch the map in place without restarting its motion.

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const n1 = (n) => Math.round(n * 10) / 10;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---- the agents' little pictures (drawn in a 34 by 34 box) -----------------------------------

const GLYPH = {
  coordinator: '<circle cx="17" cy="17" r="11"/><circle cx="17" cy="17" r="4.5" class="fa"/><path d="M17 2v7M17 25v7M2 17h7M25 17h7M6.5 6.5l4.5 4.5M23 23l4.5 4.5M27.5 6.5L23 11M11 23l-4.5 4.5"/>',
  'knowledge-base': '<path class="fa" d="M17 9C13 6 8 6 3 8v20c5-2 10-2 14 1 4-3 9-3 14-1V8c-5-2-10-2-14 1z"/><path d="M17 9v20"/>',
  researcher: '<circle cx="14" cy="14" r="9" class="fa"/><path d="M21 21l10 10" stroke-width="4"/>',
  'lead-generator': '<path class="fa" d="M3 5h28L20 18v10l-6 4V18z"/>',
  outreach: '<rect x="3" y="8" width="28" height="19" class="fa"/><path d="M3 9l14 11L31 9"/>',
  sales: '<path class="fa" d="M3 5h28v18H16l-8 7v-7H3z"/><path d="M10 12h14M10 17h9"/>',
  marketing: '<path class="fa" d="M4 13l17-8v24L4 21z"/><path d="M25 11c4 1 6 3 6 6s-2 5-6 6M9 21l2.5 8h4l-2-7"/>',
  'demo-handler': '<rect x="3" y="5" width="28" height="19" class="fa"/><path d="M14 10l8 4.5-8 4.5z" class="fi"/><path d="M10 30h14M17 24v6"/>',
  'docs-handler': '<path class="fa" d="M7 2h14l7 7v23H7z"/><path d="M21 2v7h7M11 16h13M11 21h13M11 26h8"/>',
  developer: '<path d="M11 8L3 17l8 9M23 8l8 9-8 9"/><path d="M20 5l-6 24" stroke-width="3"/>',
  evaluator: '<rect x="5" y="6" width="24" height="26" class="fa"/><path d="M11 6V3h12v3"/><path d="M10 20l5 5 9-11" stroke-width="3"/>',
};

// ---- the map ---------------------------------------------------------------------------------

const W = 1330;
const H = 780;
const CX = 545;
const CY = 390;
const NW = 150;
const NH = 64;
const RX = 370;
const RY = 250;
const TX = 470;
const TY = 345;
const STUB = 45;
const HUB = 70;
const GX = 1170;
const CYCLE = 24;

// Clockwise round the hub from the upper left. The first five are the lead chain.
const RING = [['researcher', -155], ['lead-generator', -120], ['outreach', -90], ['sales', -60], ['demo-handler', -25], ['developer', 35], ['docs-handler', 70], ['marketing', 110], ['knowledge-base', 145]];
const CHAIN = RING.slice(0, 5).map(([name]) => name);
const spot = (deg) => [CX + RX * Math.cos((deg * Math.PI) / 180), CY + RY * Math.sin((deg * Math.PI) / 180)];
const trackY = (x, top) => CY + (top ? -1 : 1) * TY * Math.sqrt(Math.max(0, 1 - ((x - CX) / TX) ** 2));
const TICKET = `M0 0H${NW}V${NH / 2 - 6}a6 6 0 0 0 0 12V${NH}H0V${NH / 2 + 6}a6 6 0 0 0 0-12Z`;

// Where a line from a box's centre toward `to` leaves the box, moved `gap` further along.
function edge(c, hw, hh, to, gap = 0) {
  const dx = to[0] - c[0];
  const dy = to[1] - c[1];
  const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  const len = Math.hypot(dx, dy);
  return [c[0] + dx * t + (dx / len) * gap, c[1] + dy * t + (dy / len) * gap];
}

function head(x1, y1, x2, y2, s = 10) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (d) => `${n1(x2 - s * Math.cos(a + d))},${n1(y2 - s * Math.sin(a + d))}`;
  return `<polygon points="${n1(x2)},${n1(y2)} ${p(0.45)} ${p(-0.45)}"/>`;
}

// ---- the demo loop: one task's whole trip, drawn with SVG animation on a shared clock --------

const at = (s) => n1((s / CYCLE) * 10000) / 10000;
function blink(spans, fade = 0.15) {
  const keys = [0];
  const vals = [0];
  for (const [a, b] of spans) {
    keys.push(at(a), at(a + fade), at(b - fade), at(b));
    vals.push(0, 1, 1, 0);
  }
  keys.push(1);
  vals.push(0);
  return `<animate attributeName="opacity" dur="${CYCLE}s" repeatCount="indefinite" keyTimes="${keys.join(';')}" values="${vals.join(';')}"/>`;
}
function series(attr, type, stops) {
  const keys = [0, ...stops.map(([t]) => at(t)), 1];
  const vals = [stops[0][1], ...stops.map(([, v]) => v), stops.at(-1)[1]];
  return `<animateTransform attributeName="${attr}" type="${type}" dur="${CYCLE}s" repeatCount="indefinite" calcMode="linear" keyTimes="${keys.join(';')}" values="${vals.join(';')}"/>`;
}
// A token that rides along `path`. stops are [seconds, how far along from 0 to 1].
function ride(path, stops, shape) {
  const keys = [0, ...stops.map(([t]) => at(t)), 1];
  const pts = [0, ...stops.map(([, p]) => p), stops.at(-1)[1]];
  pts[0] = stops[0][1];
  return `<g class="tok demo-only" opacity="0">${shape}${blink([[stops[0][0], stops.at(-1)[0]]], 0.12)}<animateMotion dur="${CYCLE}s" repeatCount="indefinite" calcMode="linear" keyPoints="${pts.join(';')}" keyTimes="${keys.join(';')}" path="${path}"/></g>`;
}

const SLIP = '<rect x="-8" y="-10" width="16" height="20" class="t-slip"/><path d="M-4 -4h8M-4 0h8M-4 4h5" class="t-line"/>';
const FILE = '<path d="M-7 -10h9l5 5v15h-14z" class="t-file"/><path d="M2 -10v5h5M-4 0h8M-4 4h8" class="t-line"/>';
const REVISE = '<rect x="-8" y="-10" width="16" height="20" class="t-bad"/><path d="M-4 -5l8 10M4 -5l-8 10" class="t-line"/>';
const PASSED = '<rect x="-8" y="-10" width="16" height="20" class="t-good"/><path d="M-4 0l3 4 6-8" class="t-line"/>';

function node({ key, label, x, y, st, bk, backup, count, demo = [], note = '', tags = [] }) {
  const tag = tags
    .map(([k, text], i) => {
      const w = Math.round(text.replace(/^\d+/, '000').length * 6.9 + 12);
      return `<g transform="translate(0 ${-20 - i * 19})"><rect class="plate" width="${w}" height="17"/><text class="tg" x="6" y="12.5" data-k="${k}">${esc(text)}</text></g>`;
    })
    .join('');
  return `<g class="node" data-k="n-${key}" data-st="${st}" data-bk="${bk}" transform="translate(${n1(x - NW / 2)} ${n1(y - NH / 2)})">
${backup ? `<path class="shadow" d="${TICKET}" transform="translate(8 8)"/>` : ''}
<path class="halo" d="${TICKET}"/>${demo.length ? `<path class="dhalo demo-only" opacity="0" d="${TICKET}">${blink(demo)}</path>` : ''}
<path class="bd" d="${TICKET}"/>${note ? `<rect class="dbl" x="-5" y="-5" width="${NW + 10}" height="${NH + 10}"/>` : ''}
<path class="perf" d="M42 9V${NH - 9}"/>
<g class="gl" transform="translate(5 17) scale(.9)">${GLYPH[key]}</g>
<text class="nm${label.length > 12 ? ' long' : ''}" x="49" y="27">${esc(label.toUpperCase())}</text>
<text class="ct" x="49" y="47" data-k="c-${key}">${esc(count)}</text>
${backup ? `<text class="bkt" x="${NW}" y="${NH + 21}" text-anchor="end">BACKUP IN</text>` : ''}
<g class="tags">${tag}</g>
</g>`;
}

// What the map needs, in one place: the funnel counts come from the leads file.
// model: { agents:[{name,tasks,backup}], requests, reviews, funnel:{found,qualified,drafted,contacted,sends}, working }
export function renderMap(model) {
  const { agents, funnel, working } = model;
  const known = new Map(agents.filter((a) => !a.backup).map((a) => [a.name, a]));
  const backups = new Set(agents.filter((a) => a.backup).map((a) => a.name.replace(/-fallback$/, '')));
  const live = !!working;
  const stOf = (name) => (working?.focus === name ? 'work' : working?.seen.includes(name) ? 'seen' : 'idle');
  const bkOf = (name) => (working?.backup.includes(name) ? 'on' : 'off');
  const tasks = (name) => plural(known.get(name)?.tasks ?? 0, 'task');
  const hub = [CX, CY];

  const pos = Object.fromEntries(RING.map(([name, deg]) => [name, spot(deg)]));
  const evalPos = [CX + TX, CY];
  const route = (name) => {
    const [x, y] = pos[name];
    const top = y < CY;
    const sx = x + STUB;
    const ty = trackY(sx, top);
    return { sx, ty, top, d: `M${n1(sx)} ${n1(top ? y - NH / 2 : y + NH / 2)}L${n1(sx)} ${n1(ty)}A${TX} ${TY} 0 0 ${top ? 1 : 0} ${evalPos[0]} ${CY}` };
  };
  const spokeEnd = (name) => edge(pos[name], NW / 2, NH / 2, hub, 6);
  const spokeD = (name) => {
    const e = spokeEnd(name);
    return `M${CX} ${CY}L${n1(e[0])} ${n1(e[1])}`;
  };

  // lines under everything
  const tracks = ['M', 'M'].map((_, i) => {
    const top = i === 0;
    const sx = CX - 310;
    return `M${sx} ${n1(trackY(sx, top))}A${TX} ${TY} 0 0 ${top ? 1 : 0} ${evalPos[0]} ${CY}`;
  });
  const stubs = RING.map(([name]) => {
    const r = route(name);
    const [x, y] = pos[name];
    return `<path d="M${n1(r.sx)} ${n1(r.top ? y - NH / 2 : y + NH / 2)}L${n1(r.sx)} ${n1(r.ty)}"/><circle cx="${n1(r.sx)}" cy="${n1(r.ty)}" r="4.5" class="knot"/>`;
  }).join('');
  const spokes = RING.map(([name]) => {
    const e = spokeEnd(name);
    return `<g class="spoke" data-k="s-${name}" data-st="${stOf(name) === 'work' ? 'work' : 'idle'}"><path d="${spokeD(name)}"/><g class="arrowhead">${head(CX, CY, e[0], e[1], 9)}</g><g class="lt live-only" opacity="1"><circle r="5.5" class="t-live"/><animateMotion dur="2.4s" repeatCount="indefinite" path="${spokeD(name)}"/></g></g>`;
  }).join('');
  const links = CHAIN.slice(0, -1).map((a, i) => {
    const b = CHAIN[i + 1];
    const p = edge(pos[a], NW / 2, NH / 2, pos[b], 4);
    const q = edge(pos[b], NW / 2, NH / 2, pos[a], 4);
    return `<path class="link-o" d="M${n1(p[0])} ${n1(p[1])}L${n1(q[0])} ${n1(q[1])}"/><path class="link-m" d="M${n1(p[0])} ${n1(p[1])}L${n1(q[0])} ${n1(q[1])}"/><g class="link-h">${head(p[0], p[1], q[0], q[1], 11)}</g>`;
  }).join('');

  const leadTags = {
    'lead-generator': [['t-found', `${funnel.found} FOUND`], ['t-qual', `${funnel.qualified} QUALIFIED`]],
    outreach: [['t-draft', `${funnel.drafted} DRAFTED`]],
    sales: [['t-contact', `${funnel.contacted} CONTACTED`]],
  };

  const nodes = RING.map(([name]) =>
    node({
      key: name,
      label: name,
      x: pos[name][0],
      y: pos[name][1],
      st: stOf(name),
      bk: bkOf(name),
      backup: backups.has(name),
      count: tasks(name),
      demo: name === 'outreach' ? [[3.4, 4.8], [12.0, 13.2]] : [],
      tags: leadTags[name] ?? [],
    }),
  ).join('\n');

  const evaluator = node({
    key: 'evaluator',
    label: 'evaluator',
    x: evalPos[0],
    y: CY,
    st: stOf('evaluator'),
    bk: bkOf('evaluator'),
    backup: backups.has('evaluator'),
    count: plural(model.reviews, 'review'),
    demo: [[7.4, 10.2], [15.4, 17.6]],
    note: 'checkpoint',
  });

  const hubPts = Array.from({ length: 8 }, (_, k) => {
    const a = ((22.5 + 45 * k) * Math.PI) / 180;
    return `${n1(CX + HUB * Math.cos(a))},${n1(CY + HUB * Math.sin(a))}`;
  }).join(' ');
  const hubSt = live ? 'work' : 'idle';
  const hubG = `<g class="hubg" data-k="n-coordinator" data-st="${hubSt}">
<circle class="dots" cx="${CX}" cy="${CY}" r="112"/>
<polygon class="halo" points="${hubPts}"/><polygon class="dhalo demo-only" opacity="0" points="${hubPts}">${blink([[1.8, 3.0], [10.8, 12.0]])}</polygon>
<polygon class="bd" points="${hubPts}"/>
<g class="gl" transform="translate(${CX - 23} ${CY - 46}) scale(1.35)">${GLYPH.coordinator}</g>
<text class="nm" x="${CX}" y="${CY + 24}" text-anchor="middle">COORDINATOR</text>
<text class="ct" x="${CX}" y="${CY + 42}" text-anchor="middle" data-k="c-coordinator">${esc(plural(model.requests, 'request'))}</text>
</g>`;

  const you = `<g class="you"><circle cx="62" cy="${CY - 30}" r="14" class="ink-fill"/><path d="M34 ${CY + 18}c0-20 12-28 28-28s28 8 28 28z" class="ink-fill"/><text class="nm" x="62" y="${CY + 40}" text-anchor="middle">YOU</text><text class="ct" x="62" y="${CY + 56}" text-anchor="middle">GIVE A TASK</text></g>`;

  const toHubY = CY;
  const flow = `
<path class="line-ink" d="M106 ${toHubY}L${CX - 70} ${toHubY}"/><g class="head-ink">${head(106, toHubY, CX - 64, toHubY, 11)}</g>
<path class="revise" d="M${evalPos[0] - NW / 2} ${CY}L${CX + 76} ${CY}"/><g class="head-bad">${head(evalPos[0] - NW / 2, CY, CX + 66, CY, 11)}</g>
<path class="line-good" d="M${evalPos[0] + NW / 2} ${CY}L${GX - 14} ${CY}"/><g class="head-good">${head(evalPos[0] + NW / 2, CY, GX - 8, CY, 11)}</g>`;

  const route1 = route('outreach');
  const youHub = `M110 ${toHubY}L${CX - 60} ${toHubY}`;
  const toEval = `M${evalPos[0] - NW / 2} ${CY}L${CX + 50} ${CY}`;
  const toGate = `M${evalPos[0] + NW / 2} ${CY}L${GX - 8} ${CY}L${GX + 148} ${CY}`;
  const demoTokens = [
    ride(youHub, [[0.6, 0], [2.4, 1]], SLIP),
    ride(spokeD('outreach'), [[2.4, 0], [3.8, 1]], SLIP),
    ride(route1.d, [[4.2, 0], [8.0, 1]], FILE),
    ride(toEval, [[9.8, 0], [11.0, 1]], REVISE),
    ride(spokeD('outreach'), [[11.0, 0], [12.2, 1]], SLIP),
    ride(route1.d, [[12.8, 0], [15.8, 1]], FILE),
    ride(toGate, [[17.2, 0], [18.2, 0.32], [19.4, 0.32], [20.8, 1]], PASSED),
  ].join('\n');
  const youLive = `<g class="live-only"><g class="lt" opacity="1"><circle r="5.5" class="t-live"/><animateMotion dur="3s" repeatCount="indefinite" path="${youHub}"/></g></g>`;

  const verdict = `<g class="demo-only verdicts" transform="translate(${evalPos[0]} ${CY + NH / 2 + 24})" text-anchor="middle">
<g opacity="0"><rect class="plate bad" x="-34" y="-14" width="68" height="20"/><text class="tg" y="1">REVISE</text>${blink([[9.0, 11.2]])}</g>
<g opacity="0"><rect class="plate good" x="-26" y="-14" width="52" height="20"/><text class="tg" y="1">PASS</text>${blink([[16.6, 18.8]])}</g></g>`;

  const sendsText = esc(funnel.sends);
  const gate = `<g class="gt" data-k="gate" data-st="${funnel.sends ? 'wait' : 'idle'}" transform="translate(${GX} ${CY})">
<rect class="dhalo-box demo-only" opacity="0" x="-86" y="-116" width="184" height="148">${blink([[17.8, 21.2]])}</rect>
<circle cx="-48" cy="-88" r="12" class="ink-fill"/><path d="M-72 -52c0-16 10-25 24-25s24 9 24 25z" class="ink-fill"/>
<rect class="slip" x="4" y="-56" width="56" height="26"/><text class="yes anim-gate" x="32" y="-36" text-anchor="middle" opacity="0">YES${blink([[18.6, 21.9]], 0.2)}</text>
<g class="stamp anim-gate"><rect x="18" y="-106" width="8" height="22" class="ink-fill"/><rect x="8" y="-84" width="28" height="9" class="stamp-base"/>${series('transform', 'translate', [[0.001, '0 0'], [18.0, '0 0'], [18.5, '0 22'], [18.9, '0 22'], [19.4, '0 0']])}</g>
<path class="post" d="M-5 -50h10v100h-10z"/>
<g class="still-only"><rect x="18" y="-106" width="8" height="22" class="ink-fill"/><rect x="8" y="-84" width="28" height="9" class="stamp-base"/><rect class="garm-s" x="0" y="-6" width="84" height="12" fill="url(#p-stripe)"/></g>
<g class="garm anim-gate"><rect x="0" y="-6" width="84" height="12"/>${series('transform', 'rotate', [[0.001, '0 0 0'], [19.0, '0 0 0'], [19.5, '80 0 0'], [20.9, '80 0 0'], [21.5, '0 0 0']])}</g>
<text class="kick" x="-76" y="106">APPROVAL GATE</text>
<text class="bigx" x="-76" y="148" data-k="g-n">${sendsText}</text>
<text class="ct" x="-76" y="168">sends waiting for a yes</text>
<text class="ct" x="-76" y="184">ops/approvals.md</text>
</g>`;

  const outside = `<g class="outside"><rect x="${GX + 92}" y="0" width="${W - GX - 92}" height="${H}" class="band"/><path d="M${GX + 92} 0V${H}" class="wall"/><text class="kick" transform="translate(${GX + 130} ${CY}) rotate(90)" text-anchor="middle">OUTSIDE THIS FOLDER: SEND · POST · PUBLISH · PUSH · DEPLOY</text></g>`;

  const defs = `<defs>
<pattern id="p-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="pa"/><path d="M0 0V6" class="pb"/></pattern>
<pattern id="p-stripe" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" class="pm"/><rect width="8" height="16" class="pk"/></pattern>
<pattern id="p-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.5" class="pv"/></pattern>
<pattern id="p-wall" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M0 0V10" class="pw"/></pattern>
</defs>`;

  const desc =
    'You give a task to the coordinator, the hub in the middle. It hands work to nine specialists around it: researcher, lead-generator, outreach, sales and demo-handler form the lead chain, and developer, docs-handler, marketing and knowledge-base support them. Each specialist saves a file, and the file goes to the evaluator. A score of 80 or more passes to the approval gate where a person says yes. A lower score goes back to the specialist, at most twice. Each specialist has a backup that steps in after three failed attempts. Nothing leaves the folder without a person\'s yes.';

  const caption = live
    ? `Working now: the coordinator is running a task${working.focus ? `, and its latest hand-off was to ${working.focus}` : ''}.${working.backup.length ? ` ${working.backup.join(', ')} is on its backup.` : ''}`
    : 'Nothing is running, so this plays the usual trip of one task: you, the coordinator, a specialist, the evaluator, then a person\'s yes.';

  const svg = `<svg class="mapsvg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="map-t" aria-describedby="map-d" xmlns="http://www.w3.org/2000/svg" focusable="false">
<title id="map-t">The team as a system of agents</title><desc id="map-d">${esc(desc)}</desc>
${defs}
<g class="tracks"><path class="belt" d="${tracks[0]}"/><path class="belt" d="${tracks[1]}"/><path class="beltc" d="${tracks[0]}"/><path class="beltc" d="${tracks[1]}"/><g class="stubs">${stubs}</g></g>
<text class="lbl" x="${CX}" y="30" text-anchor="middle">EACH SPECIALIST SAVES A FILE IN outputs/. THE FILE RIDES TO THE EVALUATOR.</text>
<text class="lbl" x="${CX}" y="${H - 14}" text-anchor="middle">NOTHING IS SENT. A FILE IS ONLY A DRAFT.</text>
<g class="spokes">${spokes}</g>
<g class="chain">${links}</g>
<text class="lbl chain-lbl" x="${n1(pos.outreach[0] - 40)}" y="${n1(pos.outreach[1] - 66)}" text-anchor="middle">LEAD CHAIN</text>
${flow}
<text class="lbl bad" x="${n1((CX + 76 + evalPos[0] - NW / 2) / 2)}" y="${CY - 12}" text-anchor="middle">REVISE, AT MOST 2 ROUNDS</text>
<text class="ct" x="${n1((CX + 76 + evalPos[0] - NW / 2) / 2)}" y="${CY + 22}" text-anchor="middle">SCORE UNDER 80</text>
<text class="lbl good" x="${n1((evalPos[0] + NW / 2 + GX - 8) / 2)}" y="${CY - 12}" text-anchor="middle">PASS</text>
<text class="ct" x="${n1((evalPos[0] + NW / 2 + GX - 8) / 2)}" y="${CY + 22}" text-anchor="middle">80+</text>
<text class="lbl" x="${n1((110 + CX - 70) / 2)}" y="${CY - 12}" text-anchor="middle">YOUR TASK</text>
<g class="tokens">${demoTokens}${youLive}</g>
${you}
${nodes}
${hubG}
<text class="kick" x="${evalPos[0] - 15}" y="${CY - NH / 2 - 10}" text-anchor="end">CHECKPOINT</text>
${evaluator}
${verdict}
${gate}
${outside}
</svg>`;

  // The same story as a short list, for narrow screens
  const item = (name, extra = '') =>
    `<li data-k="m-${name}" data-st="${stOf(name)}"><b>${esc(name)}</b> <small data-k="mc-${name}">${esc(tasks(name))}</small>${extra}${backups.has(name) ? ' <span class="bk">has a backup</span>' : ''}</li>`;
  const list = `<ol class="route">
<li class="r-you"><b>You</b> give a task</li>
<li data-k="m-coordinator" data-st="${hubSt}"><b>coordinator</b> <small data-k="mc-coordinator">${esc(plural(model.requests, 'request'))}</small> plans it and hands it out</li>
<li class="r-group"><span class="kick">Lead chain</span><ol>
${item('researcher')}${item('lead-generator', ` <em data-k="mt-found">${funnel.found} found, ${funnel.qualified} qualified</em>`)}${item('outreach', ` <em data-k="mt-draft">${funnel.drafted} drafted</em>`)}${item('sales', ` <em data-k="mt-contact">${funnel.contacted} contacted</em>`)}${item('demo-handler')}
</ol></li>
<li class="r-group"><span class="kick">Support</span><ol>
${item('developer')}${item('docs-handler')}${item('marketing')}${item('knowledge-base')}
</ol></li>
<li data-k="m-evaluator" data-st="${stOf('evaluator')}"><b>evaluator</b> <small data-k="mc-evaluator">${esc(plural(model.reviews, 'review'))}</small> 80 or more passes; lower goes back to the specialist, at most 2 times</li>
<li class="r-gate"><b>A person says yes</b> <small data-k="mg-n">${funnel.sends} ${funnel.sends === 1 ? 'send is' : 'sends are'} waiting</small> Nothing leaves this folder without it</li>
</ol>`;

  const key = `<dl class="key">
<dt><i class="sw sw-hatch"></i></dt><dd>The shadow behind an agent is its backup. It takes the same job, on a different model, after 3 failed attempts.</dd>
<dt><i class="sw sw-chain"></i></dt><dd>The lead chain: researcher, lead-generator, outreach, sales, demo-handler. Counts sit on the agents that make them.</dd>
<dt><i class="sw sw-belt"></i></dt><dd>A finished file riding to the evaluator.</dd>
<dt><i class="sw sw-bad"></i></dt><dd>REVISE sends the file back to the specialist.</dd>
<dt><i class="sw sw-stripe"></i></dt><dd>The gate. Sending, posting, publishing and deploying all wait for a person.</dd>
</dl>`;

  return `<section id="map" class="map" data-k="map" data-mode="${live ? 'live' : 'demo'}" aria-labelledby="map-h">
<div class="maphead"><h2 id="map-h">How the team is wired</h2><button class="quiet" type="button" data-pause="1" aria-pressed="false" hidden>Pause motion</button></div>
<p class="mapcap" data-k="cap" aria-live="polite">${esc(caption)}</p>
${svg}
${list}
${key}
</section>`;
}

// ---- how the team works: six steps, each with a small drawing -------------------------------

const BUST = '<circle cx="0" cy="-8" r="9" class="ink-fill"/><path d="M-19 26c0-15 8-23 19-23s19 8 19 23z" class="ink-fill"/>';

const STEP_ART = [
  // 1 you hand over a task
  `<g transform="translate(40 52)">${BUST}</g><text class="ct" x="40" y="108" text-anchor="middle">YOU</text>
<g class="a-drop"><rect x="150" y="10" width="46" height="62" class="w-slip"/><path d="M158 26h30M158 36h30M158 46h20" class="w-l"/></g>
<rect x="124" y="56" width="98" height="62" class="w-box"/><path d="M136 70h74" class="w-slot"/><text class="ct" x="173" y="102" text-anchor="middle">COORDINATOR</text>
<path d="M66 50l54 8" class="w-dash"/>`,
  // 2 the coordinator hands it out
  `<polygon points="68,45 82,45 92,55 92,69 82,79 68,79 58,69 58,55" transform="translate(-16 3)" class="w-box"/><circle cx="59" cy="65" r="5" class="w-m"/>
<path d="M84 65L168 28" class="w-dash"/><path d="M84 65L168 65" class="w-dash a-flow"/><path d="M84 65L168 102" class="w-dash"/>
<rect x="168" y="17" width="58" height="22" class="w-box"/><rect x="168" y="54" width="58" height="22" class="w-box a-pick"/><rect x="168" y="91" width="58" height="22" class="w-box"/>
<text class="ct" x="59" y="104" text-anchor="middle">COORDINATOR</text>`,
  // 3 a specialist writes a file
  `<path d="M12 36h70v44H12z" class="w-box"/><circle cx="32" cy="58" r="9" class="w-m"/><path d="M50 52h24M50 64h16" class="w-l"/><path d="M82 58h50" class="w-dash a-flow"/>
<path d="M132 22h26l6 8h36v88h-68z" class="w-box"/><text class="ct" x="143" y="17">outputs/</text>
<path d="M142 50h48" class="w-l a-line"/><path d="M142 64h48" class="w-l a-line l2"/><path d="M142 78h48" class="w-l a-line l3"/><path d="M142 92h30" class="w-l a-line l4"/>`,
  // 4 the evaluator scores it
  `<defs><pattern id="h4" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="pa"/><path d="M0 0V6" class="pb"/></pattern></defs>
<rect x="22" y="58" width="196" height="16" class="w-box"/><rect x="22" y="58" width="156" height="16" fill="url(#h4)" class="w-hatch"/><rect x="178" y="58" width="40" height="16" class="w-good"/>
<text class="ct" x="22" y="94">REVISE</text><text class="ct" x="218" y="94" text-anchor="end">PASS: 80+</text>
<g class="a-needle"><path d="M0 0l-8-12h16z" class="w-ink"/></g>
<path d="M150 30c-30-24-90-24-100 2" class="w-bad-line a-loop"/><path d="M44 26l6 8 7-8" class="w-l"/><text class="ct" x="100" y="14" text-anchor="middle">BACK, AT MOST 2 TIMES</text>`,
  // 5 a backup steps in
  `<defs><pattern id="h5" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="pa"/><path d="M0 0V6" class="pb"/></pattern></defs>
<path d="M40 40h100v50H40z" class="w-hatch a-step" fill="url(#h5)"/><g class="a-fail"><path d="M22 22h100v50H22z" class="w-box"/><path d="M34 36h40M34 50h28" class="w-l"/></g>
<g class="w-x"><path d="M150 26l12 12M162 26l-12 12" class="a-x x1"/><path d="M168 26l12 12M180 26l-12 12" class="a-x x2"/><path d="M186 26l12 12M198 26l-12 12" class="a-x x3"/></g>
<text class="ct" x="174" y="62" text-anchor="middle">3 TRIES</text><text class="ct" x="40" y="110">BACKUP, ANOTHER MODEL</text>`,
  // 6 a person says yes
  `<defs><pattern id="h6" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" class="pm"/><rect width="7" height="14" class="pk"/></pattern></defs>
<g transform="translate(46 70)">${BUST}</g>
<rect x="104" y="60" width="62" height="30" class="w-slip"/><text class="yes2 a-yes" x="135" y="82" text-anchor="middle">YES</text>
<g class="a-stamp"><rect x="130" y="14" width="9" height="26" class="w-ink"/><rect x="118" y="40" width="33" height="10" class="w-stamp"/></g>
<rect x="188" y="40" width="8" height="64" class="w-ink"/><g class="a-arm"><rect x="196" y="76" width="30" height="9" fill="url(#h6)" class="w-arm"/></g><text class="ct" x="130" y="112" text-anchor="middle">NOTHING LEAVES WITHOUT IT</text>`,
];

const STEPS = [
  ['You give the team a task', 'Type it in the box on this page. It goes to the coordinator, which plans the work and keeps the board.'],
  ['The coordinator hands it out', 'It picks the specialist for each part. Leads move along a chain: researcher, lead-generator, outreach, then sales and demos.'],
  ['A specialist does the work and saves a file', 'Research, a lead list, an email draft, a page: each result is a file in outputs/. Nothing is sent.'],
  ['The evaluator scores it', 'A score of 80 or more passes. Anything lower goes back to the specialist, at most 2 revisions, then it comes to you.'],
  ['A backup steps in when one fails', 'If a specialist fails the same task 3 times, its backup, on a different model, takes the job.'],
  ['A person says yes', 'Sending, posting, publishing and deploying wait in ops/approvals.md. Nothing leaves this folder until a person approves that action.'],
];

export function renderWalkthrough() {
  const items = STEPS.map(
    ([title, text], i) => `<li class="step" style="--d:${i * 90}ms"><span class="no" aria-hidden="true">${i + 1}</span>
<svg viewBox="0 0 240 124" aria-hidden="true" focusable="false">${STEP_ART[i]}</svg>
<h3>${esc(title)}</h3><p>${esc(text)}</p></li>`,
  ).join('\n');
  return `<section class="how" aria-labelledby="how-h"><h2 id="how-h">How the team works</h2><ol class="steps">${items}</ol></section>`;
}

// A picture for the sign-in page. It shows nothing about the team.
export const signInArt = () =>
  `<svg class="lockart" viewBox="0 0 320 300" aria-hidden="true" focusable="false">
<defs><pattern id="p-s1" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#e2a527"/><rect width="7" height="14" fill="#1c1a15"/></pattern>
<pattern id="p-s2" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.6" fill="#e0482d"/></pattern></defs>
<circle cx="150" cy="140" r="122" fill="url(#p-s2)"/>
<path d="M104 128V92c0-26 16-42 41-42s41 16 41 42v36" fill="none" stroke="#1c1a15" stroke-width="12"/>
<rect x="78" y="124" width="134" height="104" fill="#faf5ea" stroke="#1c1a15" stroke-width="3"/>
<circle cx="145" cy="170" r="11" fill="#1c1a15"/><path d="M145 176v30" stroke="#1c1a15" stroke-width="7"/>
<path d="M20 262H300" stroke="#1c1a15" stroke-width="3"/>
<rect x="244" y="150" width="12" height="112" fill="#1c1a15"/>
<g class="a-lock"><rect x="170" y="238" width="74" height="12" fill="url(#p-s1)" stroke="#1c1a15" stroke-width="2.5"/></g>
</svg>`;

// ---- styles and script for the drawings ------------------------------------------------------

export const ART_STYLE = `
.map{max-width:1500px;margin:0 auto;padding:2.25rem var(--gut) 1rem}
.maphead{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;border-bottom:3px solid var(--ink);margin-bottom:.5rem}
.maphead h2{margin:0 0 .35rem;border:0;padding:0}
.mapcap{font:500 .82rem/1.45 var(--mono);color:var(--muted);max-width:68ch;margin:.5rem 0 1rem}
.mapsvg{display:block;width:100%;height:auto;overflow:visible}
.mapsvg text{font-family:var(--mono);fill:var(--ink)}
.mapsvg .nm{font-weight:600;font-size:11.5px;letter-spacing:.01em}
.mapsvg .nm.long{font-size:11px;letter-spacing:0}
.mapsvg .ct{font-weight:500;font-size:11px;fill:var(--muted)}
.mapsvg .kick{font-weight:600;font-size:11px;letter-spacing:.14em;fill:var(--verm-ink)}
.mapsvg .lbl{font-weight:600;font-size:11px;letter-spacing:.06em;fill:var(--muted)}
.mapsvg .lbl.bad{fill:var(--verm-ink)}.mapsvg .lbl.good{fill:var(--green)}
.mapsvg .chain-lbl{fill:var(--ink);letter-spacing:.2em}
.mapsvg .bigx{font:900 52px var(--head);fill:var(--ink)}
.mapsvg .tg{font-weight:600;font-size:11px;fill:var(--paper);letter-spacing:.03em}
.mapsvg .yes{font:900 24px var(--head);fill:var(--verm-ink);letter-spacing:.06em}
.mapsvg .plate{fill:var(--ink)}.mapsvg .plate.bad{fill:var(--verm-ink)}.mapsvg .plate.good{fill:var(--green)}
.mapsvg .bd{fill:var(--card);stroke:var(--ink);stroke-width:2.2}
.mapsvg .shadow{fill:url(#p-hatch);stroke:var(--ink);stroke-width:1.5}
.mapsvg .pa{fill:var(--card)}.mapsvg .pb{stroke:var(--ink);stroke-width:1.6}
.mapsvg .pm{fill:var(--mustard)}.mapsvg .pk{fill:var(--ink)}.mapsvg .pv{fill:var(--verm)}.mapsvg .pw{stroke:var(--ink);stroke-width:1;opacity:.35}
.mapsvg .dots{fill:url(#p-dots);opacity:.55}
.mapsvg .halo,.mapsvg .dhalo{fill:none;stroke:var(--verm);stroke-width:8;opacity:0;stroke-linejoin:round}
.mapsvg .dhalo-box{fill:none;stroke:var(--verm);stroke-width:2.5;stroke-dasharray:7 5}
.mapsvg .dbl{fill:none;stroke:var(--ink);stroke-width:1.2}
.mapsvg .perf{stroke:var(--ink);stroke-width:1.2;stroke-dasharray:2 4}
.mapsvg .gl{fill:none;stroke:var(--ink);stroke-width:2.1;stroke-linecap:square;stroke-linejoin:miter}
.mapsvg .gl .fa{fill:var(--mustard)}.mapsvg .gl .fi{fill:var(--ink)}
.mapsvg .bkt{display:none;font-weight:600;font-size:11px;letter-spacing:.12em;fill:var(--ink)}
.mapsvg .node[data-bk=on] .bkt{display:block}
.mapsvg .node[data-bk=on] .shadow{fill:var(--mustard)}
.mapsvg .node[data-st=seen] .bd{fill:#f2dfa8}
.mapsvg .node[data-st=work] .bd,.mapsvg .hubg[data-st=work] .bd{fill:var(--mustard)}
.mapsvg .node[data-st=work] .ct,.mapsvg .hubg[data-st=work] .ct{fill:var(--ink)}
.mapsvg .node[data-st=work] .gl .fa,.mapsvg .hubg[data-st=work] .gl .fa{fill:var(--card)}
.mapsvg .node[data-st=work] .halo,.mapsvg .hubg[data-st=work] .halo{opacity:1;animation:halo 1.5s ease-in-out infinite}
.mapsvg .belt{fill:none;stroke:var(--ink);stroke-width:7}
.mapsvg .beltc{fill:none;stroke:var(--card);stroke-width:2.4;stroke-dasharray:9 7}
.mapsvg .stubs path{fill:none;stroke:var(--ink);stroke-width:3}
.mapsvg .knot{fill:var(--card);stroke:var(--ink);stroke-width:2.2}
.mapsvg .spoke path{fill:none;stroke:var(--ink);stroke-width:1.6;stroke-dasharray:2 6;opacity:.7}
.mapsvg .spoke .arrowhead{fill:var(--ink);opacity:.7}
.mapsvg .spoke[data-st=work] path{stroke:var(--verm);stroke-width:3.2;stroke-dasharray:9 6;opacity:1;animation:flow .8s linear infinite}
.mapsvg .spoke[data-st=work] .arrowhead{fill:var(--verm);opacity:1}
.mapsvg .spoke:not([data-st=work]) .lt{display:none}
.mapsvg .link-o{fill:none;stroke:var(--ink);stroke-width:9}
.mapsvg .link-m{fill:none;stroke:var(--mustard);stroke-width:5}
.mapsvg .link-h{fill:var(--mustard);stroke:var(--ink);stroke-width:1.6}
.mapsvg .line-ink{fill:none;stroke:var(--ink);stroke-width:3}.mapsvg .head-ink{fill:var(--ink)}
.mapsvg .revise{fill:none;stroke:var(--verm);stroke-width:3;stroke-dasharray:9 6}.mapsvg .head-bad{fill:var(--verm)}
.mapsvg .line-good{fill:none;stroke:var(--green);stroke-width:4}.mapsvg .head-good{fill:var(--green)}
.mapsvg .ink-fill{fill:var(--ink)}
.mapsvg .t-slip{fill:var(--mustard);stroke:var(--ink);stroke-width:1.6}
.mapsvg .t-file{fill:var(--card);stroke:var(--ink);stroke-width:1.6}
.mapsvg .t-bad{fill:var(--verm);stroke:var(--ink);stroke-width:1.6}
.mapsvg .t-good{fill:#9ad1bf;stroke:var(--ink);stroke-width:1.6}
.mapsvg .t-live{fill:var(--verm);stroke:var(--ink);stroke-width:1.6}
.mapsvg .t-line{fill:none;stroke:var(--ink);stroke-width:1.4}
.mapsvg .slip{fill:var(--card);stroke:var(--ink);stroke-width:2}
.mapsvg .post{fill:var(--ink)}
.mapsvg .garm rect{fill:url(#p-stripe);stroke:var(--ink);stroke-width:2}
.mapsvg .stamp-base{fill:var(--verm);stroke:var(--ink);stroke-width:2}
.mapsvg .band{fill:url(#p-wall)}.mapsvg .wall{stroke:var(--ink);stroke-width:2.5;stroke-dasharray:10 6}
.mapsvg .gt[data-st=wait] .bigx{fill:var(--verm-ink)}
.mapsvg .still-only{display:none}.mapsvg .garm-s{stroke:var(--ink);stroke-width:2}
.map[data-mode=live] .demo-only,.map[data-mode=live] .anim-gate{display:none}
.map[data-mode=live] .still-only{display:inline}
.map[data-mode=demo] .live-only{display:none}
.route{display:none;list-style:none;margin:.5rem 0 0;padding:0 0 0 1.2rem;border-left:4px solid var(--ink);position:relative}
.route li{position:relative;padding:.35rem 0 .35rem .9rem;font-size:1rem}
.route li::before{content:"";position:absolute;left:-1.62rem;top:.85rem;width:.7rem;height:.7rem;background:var(--card);border:2px solid var(--ink)}
.route li[data-st=work]::before{background:var(--verm);animation:blip 1.3s steps(2,jump-none) infinite}
.route li[data-st=seen]::before{background:var(--mustard)}
.route li[data-st=work]>b{background:var(--mustard);padding:0 .25em}
.route ol{list-style:none;margin:.2rem 0 0;padding:0 0 0 .5rem;border-left:2px dashed var(--ink)}
.route small,.route em{font:500 .78rem var(--mono);color:var(--muted);font-style:normal}
.route .bk{font:600 .66rem var(--mono);letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--ink);padding:0 .3em}
.route .r-group::before{background:var(--ink)}
.route .r-gate::before{background:repeating-linear-gradient(45deg,var(--ink) 0 3px,var(--mustard) 3px 6px)}
.route b{font-family:var(--mono);font-size:.9rem}
.route .kick,.how .kick{font:600 .68rem var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--verm-ink)}
.key{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.5rem 1rem;margin:1.25rem 0 0;padding-top:.8rem;border-top:1px solid var(--ink);font-size:.95rem;max-width:62rem}
.key dt{margin:0}.key dd{margin:0;color:var(--muted)}
.sw{display:block;width:2.6rem;height:.9rem;border:2px solid var(--ink);margin-top:.35rem}
.sw-hatch{background:repeating-linear-gradient(45deg,var(--card) 0 3px,var(--ink) 3px 4.5px)}
.sw-chain{background:var(--mustard);border-width:3px}
.sw-belt{background:repeating-linear-gradient(90deg,var(--ink) 0 8px,var(--card) 8px 12px)}
.sw-bad{border:0;border-top:3px dashed var(--verm);height:0;margin-top:.7rem}
.sw-stripe{background:repeating-linear-gradient(45deg,var(--ink) 0 5px,var(--mustard) 5px 10px)}
@keyframes halo{50%{opacity:.25}}
@keyframes flow{to{stroke-dashoffset:-15}}
@keyframes blip{50%{opacity:.25}}
@media (max-width:1279px){.mapsvg,[data-pause]{display:none!important}.route{display:block}}
.map.still *{animation-play-state:paused!important}

.how{max-width:1500px;margin:0 auto;padding:1.5rem var(--gut) 1rem}
.how h2{margin-top:1rem}
.steps{list-style:none;margin:1.5rem 0 0;padding:0;display:grid;grid-template-columns:minmax(0,7fr) minmax(0,6fr);gap:0 clamp(2rem,6vw,6rem);counter-reset:s}
.step{position:relative;padding:4.6rem 0 1.6rem;border-top:3px solid var(--ink);max-width:36rem}
.step:nth-child(even){margin-top:4.5rem;justify-self:start}
.step:nth-child(odd){justify-self:end}
.step .no{position:absolute;top:-.1rem;right:0;font:900 clamp(4.5rem,8vw,7rem)/.8 var(--head);color:transparent;-webkit-text-stroke:2px var(--ink);letter-spacing:-.02em}
.step:nth-child(even) .no{right:auto;left:0}
.step svg{display:block;width:min(100%,19rem);height:auto;overflow:visible}
.step h3{font:800 1.45rem/1.1 var(--head);text-transform:uppercase;letter-spacing:.02em;margin:.6rem 0 .3rem}
.step p{margin:0;max-width:30rem}
.step svg text{font-family:var(--mono);fill:var(--ink)}
.step .ct{font-size:9.5px;font-weight:500;fill:var(--muted);letter-spacing:.04em}
.step .w-box{fill:var(--card);stroke:var(--ink);stroke-width:2.2}
.step .w-slip{fill:var(--mustard);stroke:var(--ink);stroke-width:2}
.step .w-l{fill:none;stroke:var(--ink);stroke-width:2.4}
.step .w-dash{fill:none;stroke:var(--ink);stroke-width:2.2;stroke-dasharray:3 6}
.step .w-m{fill:var(--mustard);stroke:var(--ink);stroke-width:2}
.step .w-slot{stroke:var(--ink);stroke-width:5}
.step .w-ink,.step .ink-fill{fill:var(--ink)}
.step .w-hatch{stroke:var(--ink);stroke-width:2}
.step .w-good{fill:var(--green);stroke:var(--ink);stroke-width:2}
.step .w-bad-line{fill:none;stroke:var(--verm);stroke-width:3;stroke-dasharray:7 5}
.step .w-x path{fill:none;stroke:var(--verm);stroke-width:4;stroke-linecap:square}
.step .w-stamp{fill:var(--verm);stroke:var(--ink);stroke-width:2}
.step .w-arm{stroke:var(--ink);stroke-width:2}
.step .yes2{font:900 24px var(--head);fill:var(--verm-ink);letter-spacing:.06em}
.step .a-pick{fill:var(--mustard)}
.step .p-hatch,.step .pa{fill:var(--card)}
.step .pb{stroke:var(--ink);stroke-width:1.6}
.step .pm{fill:var(--mustard)}.step .pk{fill:var(--ink)}
@media (max-width:900px){
.steps{grid-template-columns:minmax(0,1fr)}
.step,.step:nth-child(even),.step:nth-child(odd){justify-self:stretch;margin-top:0;max-width:none}
.step:nth-child(even) .no{left:auto;right:0}
}
@media (prefers-reduced-motion:no-preference){
.js .step{opacity:0;transform:translateY(22px)}
.js .step.in{opacity:1;transform:none;transition:opacity .7s ease var(--d),transform .7s ease var(--d)}
.js .step [class^="a-"],.js .step [class*=" a-"]{animation-play-state:paused}
.js .step.in [class^="a-"],.js .step.in [class*=" a-"]{animation-play-state:running}
.a-drop{animation:drop 1.6s cubic-bezier(.5,0,.3,1) .4s both}
.a-flow{animation:flow .9s linear infinite}
.a-pick{animation:pick 2.4s steps(1) .6s both}
.a-line{stroke-dasharray:60;animation:draw .7s ease-out .4s both}
.a-line.l2{animation-delay:.9s}.a-line.l3{animation-delay:1.4s}.a-line.l4{animation-delay:1.9s}
.a-needle{transform:translate(190px,56px);animation:needle 4.6s ease-in-out .5s both}
.a-loop{animation:flow 1.2s linear infinite}
.a-fail{animation:fail 1s ease-in 2s both}
.a-step{animation:step 1s ease-out 2.6s both}
.a-x{animation:pop .3s ease-out both}.a-x.x1{animation-delay:.4s}.a-x.x2{animation-delay:1s}.a-x.x3{animation-delay:1.6s}
.a-stamp{animation:slam 2.2s ease-in .6s both}
.a-yes{animation:imprint 2.2s steps(1) .6s both}
.a-arm{transform-box:fill-box;transform-origin:0 50%;animation:swing 2.6s ease-in-out 1.6s both}
}
@keyframes drop{from{transform:translateY(-40px)}to{transform:none}}
@keyframes pick{from{fill:var(--card)}to{fill:var(--mustard)}}
@keyframes draw{from{stroke-dashoffset:60}to{stroke-dashoffset:0}}
@keyframes needle{0%{transform:translate(24px,56px)}30%{transform:translate(120px,56px)}45%{transform:translate(120px,56px)}62%{transform:translate(50px,56px)}100%{transform:translate(190px,56px)}}
@keyframes fail{from{opacity:1}to{opacity:.3}}
@keyframes step{from{transform:translate(-18px,-18px)}to{transform:translate(-14px,-14px)}}
@keyframes pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
@keyframes swing{0%{transform:rotate(0)}40%{transform:rotate(-70deg)}100%{transform:rotate(-70deg)}}
@keyframes slam{0%{transform:translateY(-18px)}60%{transform:translateY(-18px)}75%{transform:translateY(8px)}100%{transform:translateY(0)}}
@keyframes imprint{0%{opacity:0}74%{opacity:0}75%{opacity:1}100%{opacity:1}}
@media (prefers-reduced-motion:reduce){
.mapsvg .tok,.mapsvg .dhalo,.mapsvg .dhalo-box,.mapsvg .verdicts,.mapsvg .lt{display:none}
.mapsvg .anim-gate{display:none}
.mapsvg .still-only{display:inline}
.mapsvg *,.route *{animation:none!important}
}
`;

export const ART_SCRIPT = `
function patchMap(a,b){
const sync=(x,y)=>{for(const at of y.attributes)if(at.name.startsWith('data-')&&at.name!=='data-k'&&x.getAttribute(at.name)!==at.value)x.setAttribute(at.name,at.value);
if(!y.children.length&&x.textContent!==y.textContent)x.textContent=y.textContent};
sync(a,b);const mine=new Map([...a.querySelectorAll('[data-k]')].map((e)=>[e.dataset.k,e]));
for(const e of b.querySelectorAll('[data-k]')){const m=mine.get(e.dataset.k);if(m)sync(m,e)}}
// The old map stays in the page, so its CSS animations and SVG clock carry on. Only the nodes round it are swapped.
function setTop(html){const old=document.getElementById('map');const t=document.createElement('template');t.innerHTML=html;const fresh=t.content.getElementById('map');
if(!old||!fresh||old.parentNode!==hero||fresh.parentNode!==t.content){hero.innerHTML=html;return}
patchMap(old,fresh);const kids=[...t.content.childNodes],i=kids.indexOf(fresh);
while(hero.firstChild!==old)hero.firstChild.remove();while(old.nextSibling)old.nextSibling.remove();
old.before(...kids.slice(0,i));old.after(...kids.slice(i+1))}
const steps=document.querySelectorAll('.step');
if('IntersectionObserver' in window){const io=new IntersectionObserver((list)=>{for(const e of list)if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}},{threshold:.2});steps.forEach((s)=>io.observe(s))}else steps.forEach((s)=>s.classList.add('in'));
const pauser=document.querySelector('[data-pause]');
if(pauser){pauser.hidden=false;pauser.addEventListener('click',()=>{const map=document.getElementById('map'),svg=map.querySelector('svg');const still=map.classList.toggle('still');
if(still)svg.pauseAnimations();else svg.unpauseAnimations();pauser.setAttribute('aria-pressed',String(still));pauser.textContent=still?'Play motion':'Pause motion'})}
`;
