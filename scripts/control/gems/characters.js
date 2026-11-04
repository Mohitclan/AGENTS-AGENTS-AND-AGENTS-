// Character assets: the SVG parts every Gem is built from. One shared rig (viewBox 0 0 160 200,
// feet at y≈190, head centred at 80,76) so every character has the same proportions, the same face
// system and the same animation hooks:
//   .gm-root > .gm-figure > .gm-legs (.gm-leg-l/.gm-leg-r) .gm-body .gm-prop .gm-arm-l/.gm-arm-r
//   .gm-head > .gm-face > .gm-brows .gm-eyes-{open,focus,happy,closed} .gm-mouth-{smile,open,o,flat,worry}
//   .gm-fx-{working,researching,success,waiting,error,paused}
// gems.css shows the right expression and effect for each state. Pure functions with no DOM access,
// so they run in the browser and in Node tests. To add a look, add a part below and use it in
// identities.js; to replace the art entirely, return your own SVG with the same class names.

const DARK = '#2f2440';

// ---- shared pieces -----------------------------------------------------------------------------

function eyesOpen(c, { y = 84, l = 65, r = 95, rx = 6.8, ry = 8.2 } = {}) {
  const eye = (x) => `<g class="gm-eye"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"/><ellipse cx="${x}" cy="${y + ry * 0.45}" rx="${rx * 0.72}" ry="${ry * 0.38}" fill="#fff" opacity=".14"/><circle cx="${x + rx * 0.36}" cy="${y - ry * 0.4}" r="${rx * 0.38}" fill="#fff"/><circle cx="${x - rx * 0.32}" cy="${y + ry * 0.28}" r="${rx * 0.16}" fill="#fff" opacity=".85"/></g>`;
  return `<g class="gm-eyes gm-eyes-open">${eye(l)}${eye(r)}</g>`;
}

// Focused: the same glossy eyes, a little narrower and looking down at the work.
function eyesFocus(c, { y = 84, l = 65, r = 95, rx = 6.8, ry = 8.2 } = {}) {
  const fy = y + 1.2;
  const fry = ry * 0.8;
  const eye = (x) => `<g class="gm-eye"><ellipse cx="${x}" cy="${fy}" rx="${rx * 0.96}" ry="${fry}" fill="${c}"/><circle cx="${x + rx * 0.3}" cy="${fy + fry * 0.05}" r="${rx * 0.3}" fill="#fff"/><circle cx="${x - rx * 0.3}" cy="${fy + fry * 0.45}" r="${rx * 0.14}" fill="#fff" opacity=".85"/></g>`;
  return `<g class="gm-eyes gm-eyes-focus">${eye(l)}${eye(r)}</g>`;
}

function eyesArc(c, cls, up, { y = 84, l = 65, r = 95, w = 7 } = {}) {
  const arc = (x) => `<path d="M${x - w} ${y + (up ? 2 : -2)}q${w} ${up ? -9 : 7} ${w * 2} 0" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
  return `<g class="gm-eyes ${cls}">${arc(l)}${arc(r)}</g>`;
}

function brows(c, { y = 70, l = 65, r = 95 } = {}) {
  return `<g class="gm-brows"><path class="gm-brow gm-brow-l" d="M${l - 6} ${y}q6 -3.4 12 0" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path class="gm-brow gm-brow-r" d="M${r - 6} ${y}q6 -3.4 12 0" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/></g>`;
}

function mouths({ y = 98, x = 80, ink = '#7a3348', inner = '#e46a86', kind = 'human' } = {}) {
  if (kind === 'beak' && STILL) return `<g class="gm-mouths"><path d="M${x - 6} ${y - 4}q6 -3 12 0l-6 7z" fill="#ffb347"/></g>`;
  if (kind === 'beak') {
    return `<g class="gm-mouths"><g class="gm-mouth gm-mouth-smile gm-mouth-flat gm-mouth-worry"><path d="M${x - 6} ${y - 4}q6 -3 12 0l-6 7z" fill="#ffb347"/><path d="M${x - 6} ${y - 4}q6 2 12 0" fill="none" stroke="#e8902a" stroke-width="1"/></g><g class="gm-mouth gm-mouth-open gm-mouth-o"><path d="M${x - 6.5} ${y - 5}q6.5 -3 13 0l-6.5 5z" fill="#ffb347"/><path d="M${x - 5} ${y}h10l-5 5z" fill="#f59a30"/><ellipse cx="${x}" cy="${y + 0.5}" rx="3" ry="1.4" fill="#d9536f"/></g></g>`;
  }
  const cat = kind === 'cat';
  if (STILL) return `<g class="gm-mouths"><path class="gm-mouth gm-mouth-smile" d="${cat ? `M${x - 7} ${y}q3.5 3.4 7 0q3.5 3.4 7 0` : `M${x - 5} ${y}q5 4.2 10 0`}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  return `<g class="gm-mouths">
    <path class="gm-mouth gm-mouth-smile" d="${cat ? `M${x - 7} ${y}q3.5 3.4 7 0q3.5 3.4 7 0` : `M${x - 5} ${y}q5 4.2 10 0`}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="gm-mouth gm-mouth-open"><path d="M${x - 6} ${y - 1}q6 11 12 0z" fill="${inner}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="${x}" cy="${y + 4.6}" rx="3.2" ry="1.8" fill="#ff9fb3"/></g>
    <ellipse class="gm-mouth gm-mouth-o" cx="${x}" cy="${y + 1}" rx="2.6" ry="3.1" fill="${inner}" stroke="${ink}" stroke-width="1.4"/>
    <path class="gm-mouth gm-mouth-flat" d="M${x - 4} ${y + 1}h8" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>
    <path class="gm-mouth gm-mouth-worry" d="M${x - 6} ${y + 2}q3 -3.4 6 0q3 3.4 6 0" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>
  </g>`;
}

const blush = (y = 94, l = 54, r = 106, c = '#ff9fb8') => `<ellipse cx="${l}" cy="${y}" rx="6.2" ry="3.6" fill="${c}" opacity=".55"/><ellipse cx="${r}" cy="${y}" rx="6.2" ry="3.6" fill="${c}" opacity=".55"/>`;

let STILL = false; // set by characterSVG for the duration of one render

function face(look, o = {}) {
  const c = look.eye || DARK;
  const variants = STILL ? '' : `${eyesFocus(c, o)}${eyesArc(c, 'gm-eyes-happy', true, o)}${eyesArc(c, 'gm-eyes-closed', false, o)}`;
  return `<g class="gm-face">${o.under || ''}${blush(o.blushY, o.blushL, o.blushR, look.blush)}${brows(look.brow || c, o)}${eyesOpen(c, o)}${variants}${o.over || ''}${mouths({ kind: o.mouth || 'human', y: o.mouthY })}</g>`;
}

// Effects shown per state (gems.css picks one). Placed top right of the head.
function effects(theme) {
  const spark = (x, y, s, c) => `<path d="M${x} ${y - s}q${s * 0.18} ${s * 0.82} ${s} ${s}q${-s * 0.82} ${s * 0.18} ${-s} ${s}q${-s * 0.18} ${-s * 0.82} ${-s} ${-s}q${s * 0.82} ${-s * 0.18} ${s} ${-s}z" fill="${c}"/>`;
  return `<g class="gm-fx">
    <g class="gm-fx-working"><path d="M122 46l-6 5 6 5M134 46l6 5-6 5" fill="none" stroke="${theme.ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M130 44l-4 14" stroke="${theme.ink}" stroke-width="2.2" stroke-linecap="round"/></g>
    <g class="gm-fx-researching"><circle cx="130" cy="38" r="11" fill="#fff" stroke="${theme.primary}" stroke-width="2"/><text x="130" y="43.5" text-anchor="middle" font-family="ui-rounded, system-ui, sans-serif" font-weight="800" font-size="15" fill="${theme.ink}">?</text></g>
    <g class="gm-fx-success">${spark(128, 34, 7, '#ffd56b')}${spark(142, 54, 4.5, theme.primary)}${spark(34, 40, 5, '#ffb3cf')}<circle cx="120" cy="56" r="2" fill="#9be7c4"/><circle cx="40" cy="58" r="1.8" fill="#ffd56b"/></g>
    <g class="gm-fx-waiting"><path d="M112 30h34a8 8 0 0 1 8 8v6a8 8 0 0 1-8 8h-24l-6 6v-6h-4a8 8 0 0 1-8-8v-6a8 8 0 0 1 8-8z" fill="#fff" stroke="${theme.primary}" stroke-width="1.8"/><circle class="gm-dot1" cx="121" cy="41" r="2.6" fill="${theme.ink}"/><circle class="gm-dot2" cx="129" cy="41" r="2.6" fill="${theme.ink}"/><circle class="gm-dot3" cx="137" cy="41" r="2.6" fill="${theme.ink}"/></g>
    <g class="gm-fx-error"><path d="M118 58c0 0-6 8-6 11a6 6 0 0 0 12 0c0-3-6-11-6-11z" fill="#a9dcff" stroke="#6fb6e8" stroke-width="1.2"/><circle cx="135" cy="36" r="9" fill="#ffe2a8" stroke="#f0b44c" stroke-width="1.6"/><path d="M135 31v6M135 40.5v.2" stroke="#9a5c00" stroke-width="2.6" stroke-linecap="round"/></g>
    <g class="gm-fx-paused"><text class="gm-z1" x="118" y="46" font-family="ui-rounded, system-ui, sans-serif" font-weight="800" font-size="11" fill="${theme.ink}" opacity=".8">z</text><text class="gm-z2" x="127" y="36" font-family="ui-rounded, system-ui, sans-serif" font-weight="800" font-size="15" fill="${theme.ink}" opacity=".7">Z</text></g>
  </g>`;
}

// ---- hair (humans) -----------------------------------------------------------------------------

const HAIR = {
  messy: (c, hl) => ({
    back: `<path d="M38 86C32 50 54 30 80 30c26 0 48 20 42 56c-4-10-8-16-12-20H50c-4 4-8 10-12 20z" fill="${c}"/>`,
    front: `<path d="M42 72C44 50 60 38 80 38s36 12 38 34l-7-8-4 9-8-12-6 10-8-13-6 11-7-12-5 11-6-10-5 9z" fill="${c}"/><path d="M76 38c2-11 13-14 18-9-6 0-10 4-10 10z" fill="${c}"/><path d="M58 46q10-6 22-6" fill="none" stroke="${hl}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`,
  }),
  bob: (c, hl) => ({
    back: `<path d="M36 102C30 56 54 32 80 32s50 24 44 70z" fill="${c}"/>`,
    front: `<path d="M40 100c-2-30 4-48 20-54 10-4 30-4 40 0 16 6 22 24 20 54-1 3-6 3-7-1 0-16-3-30-13-36-8 6-24 8-38 2-8 4-14 16-15 34-1 4-6 4-7 1z" fill="${c}"/><path d="M60 50q16-8 34-2" fill="none" stroke="${hl}" stroke-width="3" stroke-linecap="round" opacity=".5"/>`,
  }),
  buns: (c, hl) => ({
    back: `<circle cx="48" cy="42" r="14" fill="${c}"/><circle cx="112" cy="42" r="14" fill="${c}"/><circle cx="44" cy="38" r="4" fill="${hl}" opacity=".5"/><circle cx="108" cy="38" r="4" fill="${hl}" opacity=".5"/><path d="M38 86C32 52 54 32 80 32s48 20 42 54z" fill="${c}"/>`,
    front: `<path d="M41 76c-1-24 15-38 39-38s40 14 39 38c-6-10-14-14-22-13-4-6-10-8-17-4-7-4-13-2-17 4-8-1-16 3-22 13z" fill="${c}"/><circle cx="106" cy="50" r="4.5" fill="#fff6a8"/><circle cx="106" cy="50" r="2" fill="#ffd56b"/>`,
  }),
  wavy: (c, hl) => ({
    back: `<path d="M38 88C32 52 54 32 80 32s48 20 42 56c-4-12-10-20-16-24H54c-6 4-12 12-16 24z" fill="${c}"/>`,
    front: `<path d="M41 78c-1-26 17-42 41-42 22 0 38 14 37 36-5-12-15-16-23-14-6-6-20-8-30 0-8-2-18 4-25 20z" fill="${c}"/><path d="M66 58c5 6 0 13-5 13 4-4 4-9 5-13z" fill="${c}"/><path d="M62 46q14-8 32-4" fill="none" stroke="${hl}" stroke-width="3" stroke-linecap="round" opacity=".5"/>`,
  }),
  braid: (c, hl) => ({
    back: `<path d="M38 92C32 54 54 32 80 32s48 22 42 60z" fill="${c}"/>`,
    front: `<path d="M41 82c-1-28 17-44 39-44s40 16 39 44c-5-16-17-26-37-28l-2 6-2-6c-20 2-32 12-37 28z" fill="${c}"/><g fill="${c}"><ellipse cx="44" cy="100" rx="7" ry="8"/><ellipse cx="42" cy="114" rx="6.5" ry="7.5"/><ellipse cx="41" cy="127" rx="6" ry="7"/><ellipse cx="41" cy="139" rx="5.4" ry="6.4"/></g><path d="M36 147l5-4 5 4-5 4z" fill="#ff9fb8"/><path d="M60 48q16-7 32-3" fill="none" stroke="${hl}" stroke-width="3" stroke-linecap="round" opacity=".45"/>`,
  }),
};

// ---- outfits -----------------------------------------------------------------------------------

const TORSO = 'M46 168C44 136 52 116 80 110s36 26 34 58c-14 5-54 5-68 0z';

function outfit(look) {
  const c = look.outfitColor;
  const t = look.trim;
  switch (look.outfit) {
    case 'hoodie':
      return `<path d="${TORSO}" fill="${c}"/><path d="M56 114c6-9 42-9 48 0-6 8-42 8-48 0z" fill="${t}"/><path d="M73 118v16M87 118v16" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".85"/><circle cx="73" cy="135.5" r="2" fill="#fff"/><circle cx="87" cy="135.5" r="2" fill="#fff"/><path d="M62 148h36v9q-18 6-36 0z" fill="${t}" opacity=".7"/>`;
    case 'cardigan':
      return `<path d="${TORSO}" fill="${c}"/><path d="M68 112l12 24 12-24z" fill="#fffaf2"/><path d="M68 112l12 24M92 112l-12 24" stroke="${t}" stroke-width="2.4"/><circle cx="80" cy="144" r="2.2" fill="${t}"/><circle cx="80" cy="154" r="2.2" fill="${t}"/><path d="M48 162q32 8 64 0" stroke="${t}" stroke-width="3" fill="none"/>`;
    case 'overalls':
      return `<path d="${TORSO}" fill="#fffaf4"/><path d="M60 130h40v38q-20 4-40 0z" fill="${c}"/><path d="M62 132l-6-18M98 132l6-18" stroke="${c}" stroke-width="5" stroke-linecap="round"/><circle cx="64" cy="134" r="2.2" fill="${t}"/><circle cx="96" cy="134" r="2.2" fill="${t}"/><path d="M80 146c-3-4-9-1-6 4l6 5 6-5c3-5-3-8-6-4z" fill="${t}"/><path d="M58 122h44" stroke="#f3d9e3" stroke-width="2" opacity=".8"/>`;
    case 'jacket':
      return `<path d="${TORSO}" fill="${c}"/><path d="M70 112l10 18 10-18" fill="#fffaf2"/><path d="M66 113l14 28-8 4-12-26zM94 113l-14 28 8 4 12-26z" fill="${t}"/><path d="M98 138l2.4 5 5.4.6-4 3.6 1.2 5.3-5-2.8-5 2.8 1.2-5.3-4-3.6 5.4-.6z" fill="#ffd56b"/>`;
    case 'sweater':
      return `<path d="${TORSO}" fill="${c}"/><path d="M64 113c6-6 26-6 32 0v6c-6-4-26-4-32 0z" fill="${t}"/><path d="M48 160q32 9 64 0M48 164q32 9 64 0" stroke="${t}" stroke-width="2.4" fill="none"/><path d="M60 134l6 6 6-6 6 6 6-6 6 6 6-6" stroke="${t}" stroke-width="2" fill="none" opacity=".8"/>`;
    default:
      return `<path d="${TORSO}" fill="${c}"/>`;
  }
}

const scarf = (c, t) => `<path d="M54 112c8 8 44 8 52 0l2 8c-10 9-46 9-56 0z" fill="${c}"/><path d="M92 118l8 22-8 2-6-20z" fill="${c}"/><path d="M93 136l7 4M91 131l7 4" stroke="${t}" stroke-width="1.6"/>`;

// ---- arms and legs -----------------------------------------------------------------------------

function arms(pose, sleeve, hand) {
  const arm = (cls, d, hx, hy) => `<g class="${cls}"><path d="${d}" fill="none" stroke="${sleeve}" stroke-width="12.5" stroke-linecap="round"/><circle cx="${hx}" cy="${hy}" r="6.6" fill="${hand}"/></g>`;
  if (pose === 'hold') {
    return { left: arm('gm-arm-l', 'M55 122C46 134 48 146 60 150', 62, 150), right: arm('gm-arm-r', 'M105 122C114 134 112 146 100 150', 98, 150) };
  }
  if (pose === 'raise') {
    return { left: arm('gm-arm-l', 'M53 122C45 132 43 146 47 154', 47, 156), right: arm('gm-arm-r', 'M107 122C119 118 122 106 117 98', 116, 96) };
  }
  return { left: arm('gm-arm-l', 'M53 122C45 132 43 146 47 154', 47, 156), right: arm('gm-arm-r', 'M107 122C115 132 117 146 113 154', 113, 156) };
}

function legs(pants, shoes, short = false) {
  const top = short ? 170 : 158;
  const h = short ? 12 : 26;
  return `<g class="gm-legs"><g class="gm-leg-l"><rect x="63" y="${top}" width="14" height="${h}" rx="7" fill="${pants}"/><ellipse cx="69" cy="${top + h + 1}" rx="10" ry="5.4" fill="${shoes}"/></g><g class="gm-leg-r"><rect x="83" y="${top}" width="14" height="${h}" rx="7" fill="${pants}"/><ellipse cx="91" cy="${top + h + 1}" rx="10" ry="5.4" fill="${shoes}"/></g></g>`;
}

// ---- props -------------------------------------------------------------------------------------

const PROPS = {
  laptop: (t) => ({ pose: 'hold', svg: `<rect x="55" y="124" width="50" height="33" rx="5" fill="#e4e8f5"/><rect x="55" y="124" width="50" height="33" rx="5" fill="none" stroke="#c4cbe0" stroke-width="1.4"/><circle class="gm-glow" cx="80" cy="140" r="4.6" fill="${t.primary}"/><circle cx="64" cy="131" r="3.2" fill="#ffb3cf"/><rect x="92" y="146" width="8" height="5" rx="1.5" fill="#9be7c4"/><path d="M50 157h60l-4 5H54z" fill="#c9cfe3"/>` }),
  magnifier: (t) => ({ pose: 'raise', svg: `<g class="gm-tool"><path d="M118 98l8-14" stroke="#8a6a4a" stroke-width="4.6" stroke-linecap="round"/><circle cx="131" cy="75" r="11" fill="#eaf6ff" fill-opacity=".7" stroke="${t.ink}" stroke-width="3.4"/><path d="M125 71q4-4 9-3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g>` }),
  palette: (t) => ({ pose: 'raise', svg: `<path d="M38 140c-4-12 8-20 20-16 10 3 10 10 4 12-4 1-3 6 2 7 4 2 0 9-8 9-10 0-16-4-18-12z" fill="#fff4e0" stroke="#e8c9a0" stroke-width="1.4"/><circle cx="44" cy="136" r="2.6" fill="#ff8fab"/><circle cx="51" cy="131" r="2.6" fill="#8fd3ff"/><circle cx="58" cy="133" r="2.6" fill="#ffd56b"/><circle cx="47" cy="145" r="2.6" fill="#9be7c4"/><g class="gm-tool"><path d="M117 98l10-22" stroke="#c98f5d" stroke-width="3.4" stroke-linecap="round"/><path d="M125 79l5-9c2 2 2 6-1 10z" fill="${t.primary}"/></g>` }),
  magnet: (t) => ({ pose: 'raise', svg: `<g class="gm-tool"><path d="M107 86v-10a10 10 0 0 1 20 0v10h-6v-10a4 4 0 0 0-8 0v10z" fill="#ff7f9f"/><rect x="107" y="84" width="6" height="5" fill="#e9eef8"/><rect x="121" y="84" width="6" height="5" fill="#e9eef8"/></g><g class="gm-spark"><path d="M134 64l4-3M136 72h5M100 64l-4-3" stroke="${t.primary}" stroke-width="2" stroke-linecap="round"/></g>` }),
  tea: (t) => ({ pose: 'hold', svg: `<path d="M68 132h24v16a8 8 0 0 1-8 8h-8a8 8 0 0 1-8-8z" fill="#fff" stroke="#d9e6f2" stroke-width="1.4"/><path d="M92 136a6 6 0 0 1 0 12" fill="none" stroke="#fff" stroke-width="3.4"/><rect x="68" y="132" width="24" height="5" fill="${t.primary}"/><path d="M80 141c-3-3-7 0-4 3l4 3 4-3c3-3-1-6-4-3z" fill="#ffb3cf"/><g class="gm-steam" fill="none" stroke="#c9d8ea" stroke-width="2" stroke-linecap="round"><path d="M74 128q-3-5 0-9t0-9"/><path d="M84 128q-3-5 0-9t0-9"/></g>` }),
  stamp: (t) => ({ pose: 'hold', svg: `<rect x="60" y="140" width="40" height="18" rx="3" fill="#fffaf0" stroke="#eadcc0" stroke-width="1.2"/><path d="M70 149l5 5 10-10" fill="none" stroke="#5ccf95" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><g class="gm-tool"><rect x="72" y="118" width="16" height="12" rx="4" fill="#8a6a4a"/><rect x="68" y="129" width="24" height="8" rx="2" fill="${t.primary}"/></g>` }),
  envelope: (t) => ({ pose: 'hold', svg: `<rect x="58" y="130" width="44" height="28" rx="4" fill="#fffdf8" stroke="#eadfd2" stroke-width="1.4"/><path d="M59 131l21 15 21-15" fill="none" stroke="#eadfd2" stroke-width="1.6"/><path d="M80 150c-3.4-4-9.6-1-6.4 4l6.4 5 6.4-5c3.2-5-3-8-6.4-4z" fill="${t.primary}"/>` }),
  board: (t) => ({ pose: 'hold', svg: `<rect x="56" y="124" width="48" height="34" rx="5" fill="#2f3550"/><rect x="59" y="127" width="42" height="28" rx="3" fill="${t.soft}"/><path class="gm-glow" d="M76 134l12 7-12 7z" fill="${t.ink}"/>` }),
  clipboard: (t) => ({ pose: 'hold', svg: `<rect x="60" y="122" width="40" height="38" rx="4" fill="#c9a27c"/><rect x="64" y="128" width="32" height="29" rx="2" fill="#fffdf6"/><rect x="72" y="119" width="16" height="7" rx="2.5" fill="#9aa3bd"/><path d="M68 136l3 3 5-6M68 146l3 3 5-6" fill="none" stroke="#5ccf95" stroke-width="2.2" stroke-linecap="round"/><path d="M80 136h12M80 146h10" stroke="#c9cfe3" stroke-width="2.2" stroke-linecap="round"/>` }),
  notebook: (t) => ({ pose: 'hold', svg: `<path d="M56 130q12-5 24 0v28q-12-5-24 0z" fill="#fffdf6" stroke="#eadfd2" stroke-width="1.2"/><path d="M104 130q-12-5-24 0v28q12-5 24 0z" fill="#fffdf6" stroke="#eadfd2" stroke-width="1.2"/><path d="M61 138h14M61 144h12M85 138h14M85 144h10" stroke="${t.primary}" stroke-width="1.8" stroke-linecap="round"/>` }),
  none: () => ({ pose: 'rest', svg: '' }),
};

// ---- species: head and body --------------------------------------------------------------------

function human(look, theme) {
  const hair = (HAIR[look.hairStyle] || HAIR.messy)(look.hair, look.hairLight || '#ffffff');
  const extra = [];
  if (look.glasses) extra.push(`<g fill="none" stroke="${look.glasses}" stroke-width="2.2"><circle cx="65" cy="84" r="10.5"/><circle cx="95" cy="84" r="10.5"/><path d="M75.5 83q4.5-3 9 0M54.5 82l-12-3M105.5 82l12-3"/></g>`);
  if (look.headset) extra.push(`<path d="M41 80C40 44 120 44 119 80" fill="none" stroke="${look.headset}" stroke-width="4.4" stroke-linecap="round"/><rect x="34" y="74" width="11" height="16" rx="5" fill="${look.headset}"/><path d="M40 90c0 9 6 14 18 12" fill="none" stroke="${look.headset}" stroke-width="2.4" stroke-linecap="round"/><circle cx="60" cy="102" r="3" fill="${theme.primary}"/>`);
  if (look.beret) extra.push(`<path d="M50 44c4-14 52-16 60 0-8 4-52 4-60 0z" fill="${look.beret}"/><circle cx="82" cy="32" r="3.4" fill="${look.beret}"/>`);
  return {
    back: hair.back,
    head: `<circle cx="40" cy="86" r="6.5" fill="${look.skin}"/><circle cx="120" cy="86" r="6.5" fill="${look.skin}"/><ellipse cx="80" cy="78" rx="40" ry="37" fill="${look.skin}"/><ellipse cx="72" cy="66" rx="20" ry="12" fill="#fff" opacity=".12"/>`,
    face: face(look),
    front: hair.front + extra.join(''),
    body: outfit(look),
    sleeve: look.outfitColor,
    hand: look.skin,
    legs: legs(look.pants || '#6b6f8f', look.shoes || '#fffaf4'),
  };
}

function cat(look, theme) {
  const f = look.fur;
  return {
    back: `<path d="M32 96C26 50 54 30 80 30s54 20 48 66c-14 14-82 14-96 0z" fill="${look.outfitColor}"/>`,
    head: `<path d="M44 62L46 28 74 48z" fill="${f}"/><path d="M116 62L114 28 86 48z" fill="${f}"/><path d="M49 54l1-17 13 11z" fill="#ffb3c7"/><path d="M111 54l-1-17-13 11z" fill="#ffb3c7"/><ellipse cx="80" cy="80" rx="41" ry="35" fill="${f}"/><path d="M70 47q10 6 20 0M74 54q6 3 12 0" fill="none" stroke="${look.stripe}" stroke-width="3" stroke-linecap="round"/><ellipse cx="80" cy="98" rx="14" ry="9" fill="#fff8ef"/>`,
    face: face(look, { mouth: 'cat', mouthY: 100, over: `<path d="M77 93h6l-3 3z" fill="#ff8fab"/><path d="M48 96l-10-2M48 100l-10 2M112 96l10-2M112 100l10 2" stroke="${look.stripe}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>` }),
    front: '',
    body: outfit({ ...look, outfit: 'hoodie' }),
    sleeve: look.outfitColor,
    hand: f,
    legs: legs(f, '#fff8ef', true),
    tail: `<path d="M110 160c20 4 26-18 18-28" fill="none" stroke="${f}" stroke-width="9" stroke-linecap="round"/><path d="M124 136c3-3 5-2 6 0" stroke="${look.stripe}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
}

function penguin(look, theme) {
  const n = look.fur;
  return {
    back: '',
    head: `<ellipse cx="80" cy="78" rx="41" ry="38" fill="${n}"/><path d="M80 62C66 48 42 56 44 82c2 22 20 30 36 26 16 4 34-4 36-26 2-26-22-34-36-20z" fill="#fffdf8"/>`,
    face: face(look, { mouth: 'beak', mouthY: 100, blushY: 96 }),
    front: `<path d="M38 80C38 34 122 34 122 80" fill="none" stroke="${look.headphones}" stroke-width="7" stroke-linecap="round"/><rect x="28" y="68" width="16" height="26" rx="8" fill="${look.headphones}"/><rect x="116" y="68" width="16" height="26" rx="8" fill="${look.headphones}"/><rect x="31" y="72" width="7" height="18" rx="3.5" fill="#fff" opacity=".45"/><path d="M36 94c2 10 10 14 24 12" fill="none" stroke="${look.headphones}" stroke-width="2.4" stroke-linecap="round"/><circle cx="61" cy="106" r="3.2" fill="${theme.ink}"/>`,
    body: `<path d="M44 168C40 134 54 110 80 108s40 26 36 60c-14 6-58 6-72 0z" fill="${n}"/><path d="M58 166c-4-22 6-42 22-44s26 22 22 44c-10 4-34 4-44 0z" fill="#fffdf8"/>${scarf(look.scarf, '#ffffff')}`,
    sleeve: n,
    hand: n,
    legs: `<g class="gm-legs"><g class="gm-leg-l"><ellipse cx="68" cy="186" rx="11" ry="5.6" fill="#ffb347"/></g><g class="gm-leg-r"><ellipse cx="92" cy="186" rx="11" ry="5.6" fill="#ffb347"/></g></g>`,
  };
}

function panda(look, theme) {
  return {
    back: '',
    head: `<circle cx="47" cy="48" r="13" fill="#3d3a4c"/><circle cx="113" cy="48" r="13" fill="#3d3a4c"/><circle cx="47" cy="48" r="6" fill="#5b576c"/><circle cx="113" cy="48" r="6" fill="#5b576c"/><ellipse cx="80" cy="79" rx="42" ry="37" fill="#fdfcfa"/><ellipse cx="72" cy="66" rx="20" ry="11" fill="#fff" opacity=".6"/>`,
    face: face({ ...look, eye: '#1e1b29' }, { under: `<ellipse cx="64" cy="86" rx="11" ry="13.5" transform="rotate(18 64 86)" fill="#4a465b"/><ellipse cx="96" cy="86" rx="11" ry="13.5" transform="rotate(-18 96 86)" fill="#4a465b"/>`, over: '<ellipse cx="80" cy="95" rx="4.6" ry="3.2" fill="#3d3a4c"/>', mouthY: 101, brow: '#3d3a4c' }),
    front: '',
    body: outfit(look),
    sleeve: '#3d3a4c',
    hand: '#3d3a4c',
    legs: legs('#3d3a4c', '#3d3a4c', true),
  };
}

function owl(look, theme) {
  const f = look.fur;
  return {
    back: '',
    head: `<path d="M44 52l-4-22 20 14zM116 52l4-22-20 14z" fill="${f}"/><ellipse cx="80" cy="80" rx="42" ry="38" fill="${f}"/><circle cx="65" cy="84" r="15" fill="#fff6ea"/><circle cx="95" cy="84" r="15" fill="#fff6ea"/>`,
    face: face(look, { mouth: 'beak', mouthY: 101, over: look.glasses ? `<g fill="none" stroke="${look.glasses}" stroke-width="2"><circle cx="65" cy="84" r="16"/><circle cx="95" cy="84" r="16"/></g>` : '' }),
    front: '',
    body: `<path d="M44 168C40 134 54 110 80 108s40 26 36 60c-14 6-58 6-72 0z" fill="${f}"/><path d="M60 166c-4-20 6-38 20-40s24 20 20 40c-10 4-30 4-40 0z" fill="#fff6ea"/><path d="M70 140l4 4 4-4 4 4 4-4 4 4M70 152l4 4 4-4 4 4 4-4 4 4" stroke="${look.trim}" stroke-width="1.6" fill="none"/>`,
    sleeve: look.trim,
    hand: look.trim,
    legs: `<g class="gm-legs"><g class="gm-leg-l"><path d="M62 184l7-6 7 6z" fill="#ffb347"/></g><g class="gm-leg-r"><path d="M84 184l7-6 7 6z" fill="#ffb347"/></g></g>`,
  };
}

function bunny(look, theme) {
  const f = look.fur;
  return {
    back: `<g class="gm-ears"><path d="M56 56C46 26 50 4 60 4s16 22 12 50z" fill="${f}"/><path d="M58 50C52 28 54 12 60 12s9 18 7 38z" fill="#ffc2d4"/><path d="M90 52C92 26 104 10 114 16c8 6-2 24-14 40z" fill="${f}"/><path d="M95 48c3-18 10-28 16-26 4 3-3 16-11 28z" fill="#ffc2d4"/></g>`,
    head: `<ellipse cx="80" cy="80" rx="40" ry="36" fill="${f}"/><ellipse cx="72" cy="68" rx="18" ry="10" fill="#fff" opacity=".5"/>`,
    face: face(look, { mouth: 'cat', mouthY: 100, over: '<ellipse cx="80" cy="93" rx="3.6" ry="2.6" fill="#ff8fab"/>' }),
    front: '',
    body: outfit(look) + scarf(look.scarf, '#ffffff'),
    sleeve: look.outfitColor,
    hand: f,
    legs: legs(f, '#fff', true),
  };
}

function fox(look, theme) {
  const f = look.fur;
  return {
    back: '',
    head: `<path d="M42 66L44 28 72 50z" fill="${f}"/><path d="M118 66L116 28 88 50z" fill="${f}"/><path d="M44 34l1-6 6 5zM116 34l-1-6-6 5z" fill="#4a3a3a"/><path d="M48 58l1-18 13 11zM112 58l-1-18-13 11z" fill="#ffe7cf"/><ellipse cx="80" cy="80" rx="41" ry="36" fill="${f}"/><path d="M40 86c14 4 24 18 40 26 16-8 26-22 40-26-4 20-20 30-40 30s-36-10-40-30z" fill="#fff8f0"/>`,
    face: face(look, { mouth: 'cat', mouthY: 101, over: '<ellipse cx="80" cy="94" rx="4.2" ry="3" fill="#4a3a3a"/>' }),
    front: '',
    body: outfit(look),
    sleeve: look.outfitColor,
    hand: f,
    legs: legs(f, '#4a3a3a', true),
    tail: `<path d="M108 168c26 2 36-22 24-40-6 10-18 14-26 22z" fill="${f}"/><path d="M130 130c-4 6-8 9-12 10 8 0 14-3 16-7z" fill="#fff8f0"/>`,
  };
}

// The scripts' stand-in: a small crystal with a face, no body.
function gem(look, theme) {
  return {
    back: '',
    head: `<path d="M80 34l34 22-8 52H54l-8-52z" fill="${theme.primary}"/><path d="M80 34l34 22H46z" fill="#fff" opacity=".45"/><path d="M80 34l-12 22h24z" fill="#fff" opacity=".35"/><path d="M54 108l26-52 26 52z" fill="#fff" opacity=".12"/>`,
    face: face({ eye: theme.ink, blush: '#ff9fb8' }, { y: 80, l: 70, r: 90, rx: 4.2, ry: 5.2, mouthY: 92, blushY: 90, blushL: 62, blushR: 98 }),
    front: '',
    body: '',
    sleeve: 'none',
    hand: 'none',
    legs: '',
  };
}

const SPECIES = { human, cat, penguin, panda, owl, bunny, fox, gem };

// The full character as one SVG string. `uid` keeps gradient ids unique when many are on a page.
// `still: true` gives a static picture (idle face only, no effects), for <img> badges.
export function characterSVG(identity, { uid = 'g', still = false, viewBox } = {}) {
  STILL = still;
  try {
    const look = identity.look;
    const theme = identity.theme;
    const part = (SPECIES[identity.species] || human)(look, theme);
    const prop = (PROPS[look.prop] || PROPS.none)(theme);
    const a = part.sleeve === 'none' ? { left: '', right: '' } : arms(prop.pose, part.sleeve, part.hand);
    return `<svg class="gm-svg" viewBox="${viewBox || '0 0 160 200'}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<defs><radialGradient id="${uid}-sh" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#3a2a5a" stop-opacity=".3"/><stop offset="1" stop-color="#3a2a5a" stop-opacity="0"/></radialGradient></defs>
<ellipse class="gm-shadow" cx="80" cy="191" rx="40" ry="7" fill="url(#${uid}-sh)"/>
<g class="gm-root"><g class="gm-figure">
${part.tail || ''}${part.legs}
<g class="gm-body">${part.body}</g>
<g class="gm-head">${part.back}${part.head}${part.face}${part.front}</g>
<g class="gm-prop">${prop.svg}</g>
${a.left}${a.right}
${still ? '' : effects(theme)}
</g></g></svg>`;
  } finally {
    STILL = false;
  }
}
