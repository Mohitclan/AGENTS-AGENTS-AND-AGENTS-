// The characters. Two casts, chosen in office3d.js:
// - people (the default): "Mini Characters" by Kenney (www.kenney.nl, CC0), twelve cute people
//   with one shared skeleton; each agent gets its own (PEOPLE below). assets/people/.
// - robot: "RobotExpressive" by Tomás Laulhé (CC0), face morphs by Don McCurdy, from the three.js
//   examples, cloned per agent and tinted in the agent's colour. assets/robot.glb.
//
// What is real animation and what is procedural, plainly:
// - Real keyframed clips from the models, blended with cross-fades: idle, walk, sit, yes, no and
//   reach (people); idle, walk, sit, stand, thumbs-up, yes, no and wave (robot). The walk clip's
//   speed is matched to the ground speed measured from the clip, so the feet don't slide, and
//   chairs are sized from each cast's own sitting pose.
// - Procedural layers on top (neither model has clips for these): typing, reading and scrolling,
//   a hand to the chin, drinking from a mug, pointing at the display, talking with the hands, and
//   where the head looks. They are bone rotations added after the clips, with eased weights.
//   The people have one joint per arm (no elbows or fingers), so their arms move from the
//   shoulder. It reads well at office distance; it is not motion capture.
// - Faces: the robot's own morph targets (Sad, Surprised, Angry). The people have none.

import * as THREE from '/vendor/three/build/three.module.js';
import { GLTFLoader } from '/vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from '/vendor/three/examples/jsm/utils/SkeletonUtils.js';
import { PEOPLE } from './cast.js';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

// The procedural poses, in radians about the character's own axes (x: its left, y: up, z: forward).
// One table per cast so they can be tuned in one place. "lower" values need an elbow.
const ROBOT_POSE = {
  type: { upper: -0.3, upperIn: 0.1, lower: -0.55, tap: 0.06, head: 0.18 },
  read: { lean: 0.06, upperR: -0.28, lowerR: -0.5, upperL: -0.15, lowerL: -0.35, head: 0.2 },
  think: { upper: -0.75, upperIn: 0.35, lower: -1.7, tilt: 0.16 },
  // the robot's face is well in front of its neck, so the mug comes up and in, not to the ear
  drink: { upper: -0.4, upperLift: -0.8, swing: 0.2, swingLift: 0.4, lower: -0.75, lowerLift: 0.15, sip: -0.35, headBack: -0.12 },
  chat: { upper: -0.2, lower: -0.55 },
  present: { upper: -0.35, point: -0.9, out: -0.25, lower: -0.25 },
  wait: { upper: -0.15, lower: -1.25, inward: 0.25 },
};
// The people's arms rest splayed out and have no elbow, so each pose is a lift (about x) and an
// inward swing (about y), found by searching for the angles that put the hand on the keyboard, the
// mouse, the chin or the mouth (see docs/OFFICE3D.md).
const PEOPLE_POSE = {
  swing: true,
  type: { upper: -1.3, in: 1.2, tap: 0.07, head: 0.06 },
  read: { upperR: -1.2, inR: 0.9, upperL: -1.3, inL: 1.2, lean: 0.04, head: 0.1 },
  think: { upper: -2.1, in: 1.5, tilt: 0.14 },
  drink: { upper: -0.4, upperLift: -1.7, in: 1.4, inLift: 0.1, headBack: -0.16 },
  chat: { upper: -0.6, in: 0.7 },
  present: { upper: -0.6, point: -1.7, in: 0.9 },
  wait: { upper: -0.6, in: 1.4 },
};

export const RIGS = {
  people: {
    url: (agent) => `/assets/people/character-${PEOPLE[agent] || 'male-c'}.glb`,
    height: 1.25,
    bones: { head: 'head', torso: 'torso', upperL: 'arm-left', upperR: 'arm-right', handR: 'arm-right', legs: ['leg-left', 'leg-right'], hips: 'torso' },
    clips: { Idle: 'idle', Walking: 'walk', Sitting: 'sit', ThumbsUp: 'emote-yes', Yes: 'emote-yes', No: 'emote-no', Wave: 'interact-right', Reach: 'interact-right' },
    pose: PEOPLE_POSE,
    seatHeight: 0.32,
    deskRise: 0.17,
    tint: false,
  },
  robot: {
    url: () => '/assets/robot.glb',
    height: 1.42,
    bones: { neck: 'Neck', head: 'Head', torso: 'Torso', abdomen: 'Abdomen', upperL: 'UpperArm.L', upperR: 'UpperArm.R', lowerL: 'LowerArm.L', lowerR: 'LowerArm.R', handL: 'Palm2.L', handR: 'Palm2.R', feet: ['Foot.L', 'Foot.R'], hips: 'Hips' },
    clips: { Idle: 'Idle', Walking: 'Walking', Sitting: 'Sitting', Standing: 'Standing', ThumbsUp: 'ThumbsUp', Yes: 'Yes', No: 'No', Wave: 'Wave' },
    pose: ROBOT_POSE,
    deskRise: 0.21,
    tint: true,
  },
};
const ONCE = new Set(['Sitting', 'Standing', 'ThumbsUp', 'Yes', 'No', 'Wave', 'Reach']);
const HOLD = new Set(['Sitting']);

// GLTFLoader drops the dots from node names ("Foot.L" is "FootL"), so look up both spellings.
const byName = (root, name) => (name ? root.getObjectByName(name) || root.getObjectByName(name.replace(/[.:/[\]]/g, '')) : null);

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const approach = (v, target, rate, dt) => v + (target - v) * Math.min(1, rate * dt);

const files = new Map();
// Load a cast's model for one agent and measure it: the scale for the cast's height, the ground
// speed of the walk clip, and the sitting pose (so chairs and desks fit the character).
export async function loadRig(kind = 'people', agent = '') {
  const spec = RIGS[kind];
  const url = spec.url(agent);
  if (!files.has(url)) files.set(url, new GLTFLoader().loadAsync(url));
  const gltf = await files.get(url);
  const probe = cloneSkinned(gltf.scene);
  probe.updateMatrixWorld(true); // skinned parts are measured from their bones, so pose them first
  const box = new THREE.Box3().setFromObject(probe, true);
  const scale = spec.height / (box.max.y - box.min.y);
  probe.scale.multiplyScalar(scale);
  probe.updateMatrixWorld(true);
  const byClip = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
  const clips = {};
  for (const [logical, real] of Object.entries(spec.clips)) if (byClip[real]) clips[logical] = byClip[real];
  const mixer = new THREE.AnimationMixer(probe);

  // Walk speed: how fast the planted foot moves backward under the body. The people have no foot
  // bones, so their foot is the point under each hip, carried by the leg.
  const walk = mixer.clipAction(clips.Walking).play();
  mixer.setTime(0);
  probe.updateMatrixWorld(true);
  const feet = spec.bones.feet
    ? spec.bones.feet.map((n) => {
      const bone = byName(probe, n);
      return () => bone.getWorldPosition(new THREE.Vector3());
    })
    : spec.bones.legs.map((n) => {
      const bone = byName(probe, n);
      const hip = bone.getWorldPosition(new THREE.Vector3());
      const local = bone.worldToLocal(new THREE.Vector3(hip.x, 0, hip.z));
      return () => bone.localToWorld(local.clone());
    });
  const steps = 96;
  const dt = clips.Walking.duration / steps;
  const speeds = [];
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    mixer.setTime(i * dt);
    probe.updateMatrixWorld(true);
    const pts = feet.map((f) => f());
    const low = pts[0].y < pts[1].y ? 0 : 1;
    if (prev && prev.low === low) speeds.push(Math.abs(pts[low].z - prev.z) / dt);
    prev = { low, z: pts[low].z };
  }
  speeds.sort((a, b) => a - b);
  const walkSpeed = speeds[Math.floor(speeds.length * 0.6)] || 1;
  walk.stop();

  // The right hand, for the mug: the arm's farthest point in the idle pose, in the arm's own space.
  let handOffset = null;
  const handBone = byName(probe, spec.bones.handR);
  if (kind === 'people' && handBone && clips.Idle) {
    const idle = mixer.clipAction(clips.Idle).play();
    mixer.setTime(0.01);
    probe.updateMatrixWorld(true);
    const shoulder = handBone.getWorldPosition(new THREE.Vector3());
    let far = null;
    const v = new THREE.Vector3();
    probe.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      for (let i = 0; i < o.geometry.attributes.position.count; i++) {
        o.getVertexPosition(i, v);
        o.localToWorld(v);
        // the right side of the body, below the shoulder
        if (v.x < shoulder.x && v.y < shoulder.y && (!far || v.x < far.x)) far = v.clone();
      }
    });
    if (far) handOffset = handBone.worldToLocal(far.add(new THREE.Vector3(0.02, 0.01, 0)));
    idle.stop();
  }

  // The sitting pose: where the hips end up, and how far they move back from the feet.
  const sit = mixer.clipAction(clips.Sitting);
  sit.setLoop(THREE.LoopOnce, 1);
  sit.clampWhenFinished = true;
  sit.play();
  mixer.setTime(clips.Sitting.duration);
  probe.updateMatrixWorld(true);
  const hipBone = byName(probe, spec.bones.hips);
  const hips = hipBone ? hipBone.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
  const sitBack = Math.max(0, -hips.z);
  let seatHeight = spec.seatHeight;
  let sitLift = 0;
  if (seatHeight === undefined) {
    // the robot sits on its own thighs: the seat is their underside
    seatHeight = Infinity;
    probe.traverse((o) => {
      if (o.isMesh && /^Leg\.?[LR]/.test(o.name)) seatHeight = Math.min(seatHeight, new THREE.Box3().setFromObject(o, true).min.y);
    });
    if (!Number.isFinite(seatHeight)) seatHeight = hips.y * 0.85;
    seatHeight = Math.max(0.18, seatHeight);
  } else {
    // the people's sit clip sits on the floor; lift them so their hips rest on the seat
    sitLift = seatHeight + 0.03 - hips.y;
  }
  const sitBox = new THREE.Box3().setFromObject(probe, true);
  sit.stop();
  return { kind, spec, gltf, clips, scale, walkSpeed, seatHeight, sitBack, sitLift, deskRise: spec.deskRise, handOffset, height: spec.height, sitTop: sitBox.max.y + sitLift };
}

function makeMug(color = 0xffffff) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.1, 16), mat);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.008, 6, 12, Math.PI), mat);
  handle.position.set(0.045, 0, 0);
  handle.rotation.z = -Math.PI / 2;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.036, 16), new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.2 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.04;
  g.add(cup, handle, coffee);
  g.traverse((o) => {
    o.castShadow = true;
  });
  return g;
}
export { makeMug };

export class Character {
  constructor(rig, { name, color }) {
    this.name = name;
    this.rig = rig;
    this.pose = rig.spec.pose;
    this.root = new THREE.Group();
    this.root.name = `agent:${name}`;
    this.model = cloneSkinned(rig.gltf.scene);
    this.model.scale.multiplyScalar(rig.scale);
    this.root.add(this.model);
    this.meshes = [];
    const tint = new THREE.Color(color);
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = false;
      o.frustumCulled = false;
      const m = o.material.clone();
      if (rig.spec.tint && m.name === 'Main') {
        m.color.copy(tint);
        m.roughness = 0.42;
        m.metalness = 0.12;
      } else if (rig.spec.tint && m.name === 'Grey') {
        m.color.set(0xe9e6f2);
        m.roughness = 0.5;
      } else if (!rig.spec.tint) m.roughness = 0.7;
      o.material = m;
      o.userData.agent = name;
      this.meshes.push(o);
      if (o.morphTargetDictionary && 'Sad' in o.morphTargetDictionary) this.face = o;
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const [n, clip] of Object.entries(rig.clips)) {
      const a = this.mixer.clipAction(clip);
      if (ONCE.has(n)) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.actions[n] = a;
    }
    const B = rig.spec.bones;
    const b = (n) => byName(this.model, n);
    this.bones = {
      neck: b(B.neck), head: b(B.head), torso: b(B.torso), abdomen: b(B.abdomen),
      upperL: b(B.upperL), upperR: b(B.upperR), lowerL: b(B.lowerL), lowerR: b(B.lowerR),
      handL: b(B.handL), handR: rig.kind === 'people' ? null : b(B.handR),
    };
    // The mug rides in the right hand. Bones live inside the model's own scale, so undo it.
    this.mug = makeMug();
    this.mug.visible = false;
    const hand = b(B.handR) || this.model;
    this.model.updateMatrixWorld(true);
    const ws = hand.getWorldScale(new THREE.Vector3());
    if (rig.handOffset) {
      this.mug.scale.set(1.15 / ws.x, 1.15 / ws.y, 1.15 / ws.z);
      this.mug.position.copy(rig.handOffset);
    } else {
      // a little larger than life, to read in the robot's chunky hand
      this.mug.scale.set(1.7 / ws.x, 1.7 / ws.y, 1.7 / ws.z);
      this.mug.position.set(0.05 / ws.x, 0.07 / ws.y, 0);
    }
    hand.add(this.mug);
    this.base = null;
    this.gesturing = null;
    this.layers = { type: 0, read: 0, think: 0, drink: 0, chat: 0, present: 0, upset: 0, rest: 0, wait: 0 };
    this.target = { ...this.layers };
    this.faceNow = { Sad: 0, Surprised: 0, Angry: 0 };
    this.faceTarget = { Sad: 0, Surprised: 0, Angry: 0 };
    this.saved = new Map(); // bone -> its pose from the clips, before the layers
    this.look = null; // a world point the head turns toward
    this.lookW = 0;
    this.pace = 1;
    this.drinkT = 0;
    this.phase = Math.random() * 10;
    this.t = 0;
    this.lift = { from: 0, to: 0, t: 1, dur: 1 }; // raises the people onto a seat
    this.play('Idle', 0);
    this.mixer.addEventListener('finished', (e) => this.onFinished(e));
  }

  // Seated at once, for the first frame and the demo's reset.
  sitNow() {
    this.play('Sitting', 0);
    const a = this.actions.Sitting;
    a.time = a.getClip().duration;
    this.lift = { from: this.rig.sitLift, to: this.rig.sitLift, t: 1, dur: 1 };
    this.model.position.y = this.rig.sitLift;
  }

  liftTo(to, seconds) {
    this.lift = { from: this.model.position.y, to, t: 0, dur: Math.max(0.05, seconds) };
  }

  // Cross-fade the base body clip.
  play(name, fade = 0.3, timeScale = 1) {
    const next = this.actions[name];
    if (!next) return;
    if (this.base === name) {
      next.timeScale = timeScale;
      return;
    }
    const prev = this.base ? this.actions[this.base] : null;
    next.reset();
    next.enabled = true;
    next.timeScale = timeScale;
    next.setEffectiveWeight(1);
    next.play();
    if (prev && fade > 0) prev.crossFadeTo(next, fade, false);
    else if (prev) prev.stop();
    this.base = name;
  }

  setWalkRate(timeScale) {
    if (this.base === 'Walking') this.actions.Walking.timeScale = timeScale;
  }

  // Sit or stand over `seconds`. The robot has real sit-down and stand-up clips; the people have a
  // sitting pose and no stand-up clip, so they blend into the pose (or back to idle) instead, and
  // are lifted onto the seat as they go.
  transition(name, seconds) {
    this.liftTo(name === 'Sitting' ? this.rig.sitLift : 0, seconds * 0.85);
    const a = this.actions[name];
    if (!a || a.getClip().duration < 0.3) {
      this.pending = null;
      this.play(a ? name : 'Idle', seconds * 0.8);
      return Promise.resolve();
    }
    const scale = a.getClip().duration / seconds;
    return new Promise((resolve) => {
      this.pending = { name, resolve };
      this.play(name, 0.25, scale);
    });
  }

  // A one-off gesture from the model's clips over the current body (standing only).
  gesture(name, seconds) {
    const a = this.actions[name];
    if (!a) return Promise.resolve();
    const back = this.base;
    return new Promise((resolve) => {
      this.pending = { name, resolve, back };
      this.play(name, 0.25, seconds ? a.getClip().duration / seconds : 1);
    });
  }

  onFinished(e) {
    const p = this.pending;
    if (!p || e.action !== this.actions[p.name]) return;
    this.pending = null;
    if (p.back && !HOLD.has(p.name)) this.play(p.back === p.name ? 'Idle' : p.back, 0.35);
    else if (p.name === 'Standing') this.play('Idle', 0.3);
    p.resolve();
  }

  setLayers(map) {
    for (const k of Object.keys(this.target)) this.target[k] = map[k] || 0;
  }

  setFace(map = {}) {
    for (const k of Object.keys(this.faceTarget)) this.faceTarget[k] = map[k] || 0;
  }

  holdMug(on) {
    this.mug.visible = on;
  }

  // Turn a bone about an axis given in the character's own frame (x: its left, y: up, z: forward).
  rot(bone, axis, angle) {
    if (!bone || Math.abs(angle) < 1e-4) return;
    if (!this.saved.has(bone)) this.saved.set(bone, bone.quaternion.clone());
    const rw = this.root.getWorldQuaternion(_rw);
    bone.parent.updateWorldMatrix(true, false);
    const pw = bone.parent.getWorldQuaternion(_pw);
    _q.setFromAxisAngle(axis, angle);
    _w.copy(rw).multiply(_q).multiply(_ri.copy(rw).invert());
    _d.copy(pw).invert().multiply(_w).multiply(pw);
    bone.quaternion.premultiply(_d);
  }

  update(dt) {
    this.t += dt;
    if (this.lift.t < 1) {
      this.lift.t = Math.min(1, this.lift.t + dt / this.lift.dur);
      this.model.position.y = this.lift.from + (this.lift.to - this.lift.from) * ease(this.lift.t);
    }
    // Bones a clip doesn't key keep whatever they had, so undo last frame's layers before the clips
    // run; otherwise the offsets would add up frame after frame.
    for (const [bone, q] of this.saved) bone.quaternion.copy(q);
    this.mixer.update(dt);
    for (const [bone, q] of this.saved) q.copy(bone.quaternion);
    for (const k of Object.keys(this.layers)) this.layers[k] = approach(this.layers[k], this.target[k], 3.2, dt);
    if (this.face) {
      for (const [k, v] of Object.entries(this.faceTarget)) {
        this.faceNow[k] = approach(this.faceNow[k], v, 2.5, dt);
        const i = this.face.morphTargetDictionary[k];
        if (i !== undefined) this.face.morphTargetInfluences[i] = this.faceNow[k];
      }
    }
    this.applyLayers(dt);
  }

  applyLayers(dt) {
    const L = this.layers;
    const B = this.bones;
    const t = this.t + this.phase;
    const any = Object.values(L).some((v) => v > 0.002) || this.look || this.lookW > 0.002;
    if (!any) return;
    this.model.updateMatrixWorld(true);
    const s = (f, p = 0) => Math.sin(t * f + p);

    // Typing: forearms forward to the keyboard, hands tapping at the pace of the work.
    if (L.type > 0.002) {
      const w = L.type;
      const P = this.pose.type;
      const tap = this.pace * 11;
      if (this.pose.swing) {
        this.rot(B.upperL, X, (P.upper + P.tap * s(tap)) * w);
        this.rot(B.upperR, X, (P.upper + P.tap * s(tap, 1.7)) * w);
        this.rot(B.upperL, Y, -P.in * w);
        this.rot(B.upperR, Y, P.in * w);
        this.rot(B.head, X, P.head * w);
      } else {
      this.rot(B.upperL, X, P.upper * w);
      this.rot(B.upperR, X, P.upper * w);
      this.rot(B.upperL, Z, -P.upperIn * w);
      this.rot(B.upperR, Z, P.upperIn * w);
      this.rot(B.lowerL, X, (P.lower + P.tap * s(tap)) * w);
      this.rot(B.lowerR, X, (P.lower + P.tap * s(tap, 1.7)) * w);
      this.rot(B.head, X, P.head * w);
      }
    }
    // Reading: one hand on the mouse with a slow scroll, leaning in a little.
    if (L.read > 0.002) {
      const w = L.read;
      const P = this.pose.read;
      if (this.pose.swing) {
        this.rot(B.upperR, X, (P.upperR + 0.04 * s(2.2)) * w);
        this.rot(B.upperR, Y, P.inR * w);
        this.rot(B.upperL, X, P.upperL * w);
        this.rot(B.upperL, Y, -P.inL * w);
      }
      this.rot(B.torso, X, P.lean * w);
      if (!this.pose.swing) {
        this.rot(B.upperR, X, P.upperR * w);
        this.rot(B.lowerR, X, (P.lowerR + 0.04 * s(2.2)) * w);
        this.rot(B.upperL, X, P.upperL * w);
        this.rot(B.lowerL, X, P.lowerL * w);
      }
      this.rot(B.head, X, (P.head + 0.03 * s(0.7)) * w);
      this.rot(B.head, Y, 0.08 * s(0.35) * w);
    }
    // Thinking: hand to the chin, head tilted.
    if (L.think > 0.002) {
      const w = L.think;
      const P = this.pose.think;
      this.rot(B.upperR, X, P.upper * w);
      if (this.pose.swing) this.rot(B.upperR, Y, P.in * w);
      else {
        this.rot(B.upperR, Z, P.upperIn * w);
        this.rot(B.lowerR, X, P.lower * w);
      }
      this.rot(B.head, Z, P.tilt * w);
      this.rot(B.head, X, -0.08 * w);
    }
    // Drinking: lift the mug to the mouth and tilt it, then lower it (drinkT runs 0..1 per sip).
    if (L.drink > 0.002) {
      const w = L.drink;
      this.drinkT = (this.drinkT + dt / 5.5) % 1;
      const lift = ease(this.drinkT / 0.25) * (1 - ease((this.drinkT - 0.62) / 0.25));
      const sip = ease((this.drinkT - 0.25) / 0.12) * (1 - ease((this.drinkT - 0.5) / 0.12));
      const P = this.pose.drink;
      this.rot(B.upperR, X, (P.upper + P.upperLift * lift) * w);
      if (this.pose.swing) this.rot(B.upperR, Y, (P.in + P.inLift * lift) * w);
      else this.rot(B.upperR, Y, (P.swing + P.swingLift * lift) * w);
      this.rot(B.lowerR, X, (P.lower + P.lowerLift * lift) * w);
      this.rot(B.handR, X, P.sip * sip * w);
      this.rot(B.head, X, (P.headBack * sip + 0.05 * (1 - lift)) * w);
    }
    // Talking: easy hand movement and small nods.
    if (L.chat > 0.002) {
      const w = L.chat;
      const P = this.pose.chat;
      this.rot(B.upperL, X, (P.upper - 0.12 * s(1.3)) * w);
      this.rot(B.lowerL, X, (P.lower - 0.2 * s(1.3, 0.8)) * w);
      this.rot(B.upperR, X, (P.upper - 0.1 * s(1.1, 2)) * w);
      this.rot(B.lowerR, X, (P.lower - 0.15 * s(1.7, 1)) * w);
      if (this.pose.swing) {
        this.rot(B.upperL, Y, -(P.in + 0.25 * s(1.3, 0.8)) * w);
        this.rot(B.upperR, Y, (P.in + 0.25 * s(1.7, 1)) * w);
      }
      this.rot(B.head, X, 0.06 * s(2.1) * w);
    }
    // Presenting at the display: the right arm points at it now and then.
    if (L.present > 0.002) {
      const w = L.present;
      const P = this.pose.present;
      const point = ease(0.5 + 0.5 * s(0.45));
      this.rot(B.upperR, X, (P.upper + P.point * point) * w);
      if (this.pose.swing) this.rot(B.upperR, Y, P.in * w);
      else this.rot(B.upperR, Z, P.out * point * w);
      this.rot(B.lowerR, X, P.lower * w);
      this.rot(B.upperL, X, -0.15 * w);
      this.rot(B.lowerL, X, -0.6 * w);
    }
    // Upset: shoulders in, head down.
    if (L.upset > 0.002) {
      const w = L.upset;
      this.rot(B.head, X, 0.32 * w);
      this.rot(B.torso, X, 0.08 * w);
      this.rot(B.upperL, Z, 0.12 * w);
      this.rot(B.upperR, Z, -0.12 * w);
    }
    // Resting: lean back and look around slowly.
    if (L.rest > 0.002) {
      const w = L.rest;
      this.rot(B.torso, X, -0.12 * w);
      this.rot(B.head, Y, 0.35 * s(0.21) * w);
      this.rot(B.head, X, -0.06 * w);
    }
    // Waiting: weight on one side, glancing about.
    if (L.wait > 0.002) {
      const w = L.wait;
      this.rot(B.head, Y, 0.25 * s(0.3) * w);
      const P = this.pose.wait;
      this.rot(B.upperL, X, P.upper * w);
      this.rot(B.lowerL, X, P.lower * w);
      this.rot(B.upperR, X, P.upper * w);
      this.rot(B.lowerR, X, P.lower * w);
      this.rot(B.lowerL, Y, -P.inward * w);
      this.rot(B.lowerR, Y, P.inward * w);
      if (this.pose.swing) {
        // hands together in front
        this.rot(B.upperL, Y, -P.in * w);
        this.rot(B.upperR, Y, P.in * w);
      }
    }
    // Head toward a point of interest (the screen, the display, a colleague).
    this.lookW = approach(this.lookW, this.look ? 1 : 0, 2.5, dt);
    if (this.look) this.lastLook = this.look;
    if (this.lookW > 0.002 && this.lastLook && B.head) {
      this.root.updateWorldMatrix(true, false);
      const local = this.root.worldToLocal(_v.copy(this.lastLook));
      const head = this.root.worldToLocal(B.head.getWorldPosition(_h));
      const dx = local.x - head.x;
      const dy = local.y - head.y;
      const dz = local.z - head.z;
      const yaw = THREE.MathUtils.clamp(Math.atan2(dx, dz), -1.0, 1.0);
      const pitch = THREE.MathUtils.clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.4, 0.5);
      this.rot(B.neck || B.head, Y, yaw * 0.5 * this.lookW);
      this.rot(B.head, Y, yaw * 0.5 * this.lookW);
      this.rot(B.head, X, pitch * 0.6 * this.lookW);
    }
  }

  dispose() {
    this.mixer.stopAllAction();
    for (const m of this.meshes) m.material.dispose();
  }
}

const _q = new THREE.Quaternion();
const _w = new THREE.Quaternion();
const _ri = new THREE.Quaternion();
const _rw = new THREE.Quaternion();
const _pw = new THREE.Quaternion();
const _d = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _h = new THREE.Vector3();
