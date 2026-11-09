// The furniture of a 3D office, built from a map's `props` (maps.js) out of plain shapes: desks, counters, server
// racks, neon tubes, sofas, plants and the rest, sized to the 3D people (office3d/characters.js), who are 1.25 m tall
// and sit 0.32 m off the floor. Each piece stands at its spot on the map, turned the way it faces; its front is the
// side a person uses (where the chair goes, where a screen shows).
//
//   const kit = createKit({ seat, desk, back, accent })   the cast's seat and desk heights, and the office colour
//   scene.add(kit.prop(p))                                one piece of furniture from maps.js
//   group.add(kit.chair('office'))                        the chair at a seat, for a person facing +z
//   kit.dispose()
import * as THREE from '/vendor/three/build/three.module.js';
import { turnOf } from './maps.js';

const M = 0.01; // metres per map unit

export function createKit({ seat = 0.32, desk = 0.49, back = 0.2, accent = '#4c8dff' } = {}) {
  const geo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
    cone: new THREE.ConeGeometry(0.5, 1, 9),
    ball: new THREE.SphereGeometry(0.5, 14, 10),
  };
  const mats = new Map();
  // One material per look, shared by every piece that has it. `glow` makes it shine with its own colour.
  const mat = (color, { glow = 0, rough = 0.6, metal = 0.15 } = {}) => {
    const key = `${color}|${glow}|${rough}|${metal}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: glow ? color : 0x000000, emissiveIntensity: glow }));
    return mats.get(key);
  };
  const part = (g, shape, m, [sx, sy, sz], [x, y, z], { shadow = true, rx = 0, ry = 0 } = {}) => {
    const mesh = new THREE.Mesh(geo[shape], m);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const dark = mat('#1a2028', { metal: 0.5, rough: 0.45 });
  const metal = mat('#2a2f3a', { metal: 0.6, rough: 0.5 });
  const glowOf = (color, glow = 1.6) => mat(color, { glow, rough: 0.4 });

  // A swivel chair, a sofa seat or a stool, with its seat `back` metres behind the sitter's spot.
  function chairInto(g, kind, { w = 0.42, d = 0.4, color } = {}) {
    if (kind === 'none') return;
    if (kind === 'stool') {
      part(g, 'cyl', mat(color || '#3a3340'), [0.3, seat, 0.3], [0, seat / 2, -back]);
      return;
    }
    if (kind === 'armchair') {
      const m = mat(color || '#2f5a3a', { rough: 0.85 });
      part(g, 'box', m, [w + 0.1, seat, d + 0.08], [0, seat / 2, -back]);
      part(g, 'box', m, [w + 0.1, 0.36, 0.12], [0, seat + 0.16, -back - d / 2]);
      for (const sx of [-1, 1]) part(g, 'box', m, [0.09, 0.16, d + 0.08], [sx * (w / 2 + 0.01), seat + 0.06, -back]);
      return;
    }
    if (kind === 'lounge') {
      const m = mat(color || '#2a1f33', { rough: 0.5, metal: 0.25 });
      part(g, 'box', m, [w, 0.08, d * 0.55], [0, seat, -back + 0.04]);
      part(g, 'box', m, [w, 0.62, 0.08], [0, seat + 0.27, -back - d * 0.3], { rx: -0.42 });
      part(g, 'cyl', metal, [0.06, seat, 0.06], [0, seat / 2, -back]);
      part(g, 'box', metal, [w * 0.9, 0.03, 0.06], [0, 0.03, -back]);
      part(g, 'box', metal, [0.06, 0.03, d * 0.7], [0, 0.03, -back]);
      return;
    }
    const m = mat(color || '#24324f', { rough: 0.8 });
    part(g, 'box', m, [w, 0.06, d], [0, seat - 0.03, -back]);
    part(g, 'box', m, [w - 0.02, 0.42, 0.05], [0, seat + 0.22, -back - d / 2]);
    part(g, 'cyl', metal, [0.05, seat - 0.06, 0.05], [0, (seat - 0.06) / 2, -back]);
    part(g, 'box', metal, [0.4, 0.03, 0.05], [0, 0.03, -back]);
    part(g, 'box', metal, [0.05, 0.03, 0.4], [0, 0.03, -back]);
  }

  // What stands on a desk, at its back edge, showing towards the front.
  function itemOn(g, item, w, d, top) {
    if (item === 'monitor') {
      const sw = Math.min(0.62, w * 0.55);
      part(g, 'box', dark, [sw, 0.3, 0.025], [0, top + 0.2, -d / 2 + 0.08]);
      part(g, 'box', glowOf('#7fd8ff', 0.9), [sw - 0.04, 0.26, 0.004], [0, top + 0.2, -d / 2 + 0.094], { shadow: false });
      part(g, 'box', dark, [0.05, 0.06, 0.05], [0, top + 0.03, -d / 2 + 0.08]);
    } else if (item === 'typewriter') {
      part(g, 'box', mat('#2b2b2e', { metal: 0.4 }), [0.3, 0.09, 0.22], [0, top + 0.045, 0]);
      part(g, 'box', mat('#f4f1ea'), [0.2, 0.14, 0.01], [0, top + 0.15, -0.08], { rx: -0.25 });
    } else if (item === 'papers') {
      const paper = mat('#f1eee6', { rough: 0.9 });
      part(g, 'box', paper, [0.2, 0.012, 0.27], [-w * 0.22, top + 0.006, d * 0.05], { ry: 0.3 });
      part(g, 'box', paper, [0.2, 0.012, 0.27], [w * 0.18, top + 0.012, -d * 0.12], { ry: -0.5 });
    }
  }

  const BUILD = {
    desk(g, p, w, d) {
      const top = desk;
      if (p.glow) {
        part(g, 'box', dark, [w - 0.04, top - 0.04, d - 0.04], [0, (top - 0.04) / 2, 0]);
        part(g, 'box', glowOf('#ff8a2a', 0.5), [w, 0.04, d], [0, top - 0.02, 0]);
      } else {
        part(g, 'box', mat(p.top || '#c9a77c', { rough: 0.55 }), [w, 0.04, d], [0, top - 0.02, 0]);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, 'box', metal, [0.04, top - 0.04, 0.04], [sx * (w / 2 - 0.04), (top - 0.04) / 2, sz * (d / 2 - 0.04)]);
      }
      itemOn(g, p.item, w, d, top);
    },
    table(g, p, w, d) {
      const top = desk + 0.02;
      part(g, 'box', mat('#17131f', { rough: 0.35, metal: 0.4 }), [w, 0.06, d], [0, top, 0]);
      for (const x of [-0.06, 0.06]) part(g, 'box', glowOf('#ff3df2', 2.4), [0.07, 0.02, d * 0.97], [x, top + 0.035, 0], { shadow: false });
      for (const z of [-d * 0.3, d * 0.3]) part(g, 'box', dark, [w * 0.35, top - 0.03, 0.3], [0, (top - 0.03) / 2, z]);
      part(g, 'box', glowOf('#ff3df2', 1.2), [w * 0.45, 0.01, 0.4], [0, 0.006, d / 2 + 0.25], { shadow: false });
    },
    counter(g, p, w, d) {
      const h = p.tall ?? 0.62;
      part(g, 'box', p.color ? mat(p.color, { rough: 0.6 }) : mat('#1c262f', { metal: 0.5, rough: 0.45 }), [w, h, d], [0, h / 2, 0]);
      if (!p.color) {
        part(g, 'box', glowOf(accent, 1.4), [w, 0.02, 0.03], [0, h + 0.005, d / 2 - 0.015], { shadow: false });
        part(g, 'box', glowOf(accent, 1.4), [w, 0.02, 0.03], [0, h + 0.005, -d / 2 + 0.015], { shadow: false });
      }
    },
    rack(g, p, w, d) {
      const h = p.tall ?? 1.75;
      part(g, 'box', mat('#10161d', { metal: 0.6, rough: 0.4 }), [w, h, d], [0, h / 2, 0]);
      const slit = glowOf(accent, 1.8);
      const n = Math.max(3, Math.round(h / 0.3));
      for (let i = 0; i < n; i++) part(g, 'box', slit, [w * 0.86, 0.025, 0.01], [0, 0.22 + (i * (h - 0.4)) / (n - 1), d / 2 + 0.006], { shadow: false });
      const led = glowOf('#57d8ff', 2);
      for (let i = 0; i < Math.floor(w / 0.18); i++) part(g, 'box', led, [0.025, 0.025, 0.01], [-w / 2 + 0.1 + i * 0.18, h - 0.12, d / 2 + 0.006], { shadow: false });
    },
    cabinet(g, p, w, d) {
      const h = p.tall ?? 0.75;
      part(g, 'box', mat(p.top || '#232c36', { rough: 0.55, metal: 0.25 }), [w, h, d], [0, h / 2, 0]);
    },
    crate(g, p, w, d) {
      const h = p.tall ?? 0.42;
      part(g, 'box', p.glow ? glowOf('#ff7a18', 0.55) : mat('#2a333d', { metal: 0.3 }), [w, h, d], [0, h / 2, 0]);
    },
    kiosk(g, p, w, d) {
      part(g, 'box', mat('#1a222b', { metal: 0.5, rough: 0.4 }), [w, 1.0, d], [0, 0.5, 0]);
      part(g, 'box', glowOf('#57d8ff', 1.3), [w * 0.8, 0.28, 0.01], [0, 0.74, d / 2 + 0.006], { shadow: false });
    },
    screen(g, p, w, d) {
      const tall = p.tall ?? 0.8;
      part(g, 'box', glowOf(p.color || accent, 1.1), [w, tall, Math.max(d, 0.03)], [0, (p.lift ?? 0.6) + tall / 2, 0], { shadow: false });
    },
    neon(g, p, w, d) {
      const tall = p.tall ?? 1.8;
      part(g, 'box', glowOf(p.color || accent, 2.4), [w, tall, d], [0, (p.lift ?? 0) + tall / 2, 0], { shadow: false });
    },
    plant(g, p, w, d) {
      const r = Math.min(w, d) / 2;
      const tall = p.tall ?? 0.8;
      part(g, 'cyl', mat('#2c2c34', { rough: 0.7 }), [r * 1.1, 0.3, r * 1.1], [0, 0.15, 0]);
      const leaf = mat(p.spiky ? '#1d3b4a' : '#2f7a4a', { rough: 0.8 });
      part(g, 'cone', leaf, [r * 2, tall, r * 2], [0, 0.3 + tall / 2, 0]);
      if (!p.spiky) part(g, 'ball', leaf, [r * 1.5, tall * 0.5, r * 1.5], [0, 0.32 + tall * 0.25, 0]);
      if (p.bloom) for (let i = 0; i < 5; i++) part(g, 'ball', mat(p.bloom, { rough: 0.6 }), [0.1, 0.1, 0.1], [Math.cos(i * 1.3) * r * 0.7, 0.4 + (i % 3) * tall * 0.2, Math.sin(i * 1.3) * r * 0.7]);
    },
    rug(g, p, w, d) {
      part(g, 'cyl', mat(p.color || '#7b6a58', { rough: 0.95 }), [w, 0.012, d], [0, 0.006, 0], { shadow: false });
    },
    sofa(g, p, w, d) {
      const m = mat(p.color || '#2a2f3a', { rough: 0.85 });
      part(g, 'box', m, [w, 0.24, d], [0, 0.12, 0]);
      part(g, 'box', m, [w, 0.34, 0.14], [0, 0.4, -d / 2 + 0.07]);
      for (const sx of [-1, 1]) part(g, 'box', m, [0.12, 0.16, d], [sx * (w / 2 - 0.06), 0.32, 0]);
    },
    lounge(g, p, w, d) {
      chairInto(g, 'lounge', { w: Math.min(w, 0.7), d: Math.min(d, 0.75) });
      g.children.forEach((c) => c.position.setZ(c.position.z + back)); // a lounge chair stands where it is drawn
    },
    armchair(g, p, w, d) {
      chairInto(g, 'armchair', { w, d });
      g.children.forEach((c) => c.position.setZ(c.position.z + back));
    },
    stool(g, p, w) {
      part(g, 'cyl', mat('#2a2a33'), [w, seat, w], [0, seat / 2, 0]);
    },
    side(g, p, w, d) {
      const wood = mat(p.color || '#8a5a3c', { rough: 0.6 });
      part(g, 'cyl', wood, [w, 0.04, d], [0, desk * 0.9, 0]);
      part(g, 'cyl', wood, [0.07, desk * 0.9, 0.07], [0, desk * 0.45, 0]);
    },
    roundtable(g, p, w, d) {
      BUILD.side(g, p, w, d);
    },
    shelf(g, p, w, d) {
      part(g, 'box', mat('#7a4e33', { rough: 0.7 }), [w, 1.2, d], [0, 0.6, 0]);
      const books = ['#b5452f', '#2f6db5', '#d8b04a', '#3e8a5a'].map((c) => mat(c, { rough: 0.8 }));
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < Math.floor(w / 0.09); i++) part(g, 'box', books[(i + row) % 4], [0.06, 0.24, 0.02], [-w / 2 + 0.07 + i * 0.09, 0.2 + row * 0.38, d / 2 + 0.01], { shadow: false });
      }
    },
    lighttable(g, p, w, d) {
      part(g, 'box', mat('#d9e4ea', { rough: 0.4 }), [w, 0.45, d], [0, 0.225, 0]);
      part(g, 'box', glowOf('#eaf6ff', 0.7), [w - 0.04, 0.02, d - 0.04], [0, 0.46, 0], { shadow: false });
    },
    console(g, p, w, d) {
      part(g, 'box', mat('#0d0f16', { metal: 0.4, rough: 0.35 }), [w, desk, d], [0, desk / 2, 0]);
      for (const x of [-w * 0.3, -w * 0.03]) part(g, 'box', glowOf('#ffd21f', 1.5), [w * 0.25, 0.02, d * 0.55], [x, desk + 0.005, 0], { shadow: false });
      part(g, 'box', glowOf('#ff9a3c', 1.8), [w, 0.03, 0.03], [0, desk - 0.02, d / 2], { shadow: false });
      part(g, 'box', glowOf('#ff4fd8', 1.8), [0.03, 0.03, d], [w / 2, desk - 0.02, 0], { shadow: false });
    },
  };

  return {
    // One piece of furniture, in place on the map.
    prop(p) {
      const g = new THREE.Group();
      const build = BUILD[p.k];
      if (build) build(g, p, p.size[0] * M, p.size[1] * M);
      g.position.set(p.at[0] * M, 0, p.at[1] * M);
      g.rotation.y = (-turnOf(p.face) * Math.PI) / 180;
      return g;
    },
    // The chair at a seat: a person sits facing +z, the seat behind them.
    chair(kind = 'office') {
      const g = new THREE.Group();
      chairInto(g, kind);
      return g;
    },
    dispose() {
      for (const g of Object.values(geo)) g.dispose();
      for (const m of mats.values()) m.dispose();
    },
  };
}
