// A robot of an office's crew (crew.js) in 3D: a white helmet head whose black visor shows the face from the robot
// designs, a hoodie with a glowing "AI", and its gear (headphones, antenna, cat ears or a bow). It is built from
// plain shapes and moves itself (walks, sits, types), so it needs no model file. It answers the same calls as the
// 3D people (office3d/characters.js) that world3d.js makes, so an office mixes both freely.
//
//   const bot = new RobotBuddy(LOOKS.buddy, { name: 'crew:pixel', face })   face: the look's face texture
//   scene.add(bot.root)
//   bot.play('Walking') / play('Idle'), bot.transition('Sitting', s), bot.liftTo(0, s), bot.setLayers({ type: 1 })
//   bot.update(seconds), bot.dispose()
//
// Sized for the cast: about 1.1 m tall, most of it head, sitting on a 0.32 m seat; it faces +z.
import * as THREE from '/vendor/three/build/three.module.js';

const HIP = 0.28; // hip height when standing
const SIT_LIFT = 0.1; // how much higher the hips are when sitting on a seat
const ease = (v, goal, rate, dt) => v + (goal - v) * Math.min(1, rate * dt);

// The glowing "AI" on the chest, drawn once per colour.
function chestText(color) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.font = '800 52px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 18;
  g.fillStyle = color;
  g.fillText('AI', 64, 34);
  g.fillStyle = '#ffffff';
  g.globalAlpha = 0.7;
  g.fillText('AI', 64, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class RobotBuddy {
  constructor(look, { name, face }) {
    this.rig = { walkSpeed: 1, seatHeight: 0.32, sitBack: 0.2 };
    this.root = new THREE.Group();
    this.root.name = name;
    this.owned = [];
    this.mode = 'idle';
    this.sit = 0;
    this.sitGoal = 0;
    this.sitRate = 3;
    this.walk = 0;
    this.walkRate = 1;
    this.phase = 0;
    this.t = Math.random() * 10;
    this.layer = 'rest';

    const own = (x) => {
      this.owned.push(x);
      return x;
    };
    const mat = (color, extra = {}) => own(new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, ...extra }));
    const glow = (color, k = 1.6) => mat(color, { emissive: color, emissiveIntensity: k });
    const shell = mat('#f3f4f8', { roughness: 0.28, metalness: 0.15 });
    const cloth = mat(look.hoodie, { roughness: 0.92 });
    const trim = mat(look.trim, { roughness: 0.5 });
    const dark = mat('#2a2f3a', { roughness: 0.4, metalness: 0.4 });
    const add = (parent, geo, m, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(own(geo), m);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.agent = name; // clicks on any part find the robot
      parent.add(mesh);
      return mesh;
    };

    // body: everything above the floor, moved back and up as one when it sits
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.hips = new THREE.Group();
    this.hips.position.y = HIP;
    this.body.add(this.hips);

    // legs: a thigh and a shin each, bending at the knee
    this.legs = [-1, 1].map((side) => {
      const thigh = new THREE.Group();
      thigh.position.x = side * 0.085;
      this.hips.add(thigh);
      add(thigh, new THREE.CylinderGeometry(0.075, 0.068, 0.14, 16), cloth, [0, -0.07, 0]);
      const knee = new THREE.Group();
      knee.position.y = -0.13;
      thigh.add(knee);
      add(knee, new THREE.CylinderGeometry(0.064, 0.06, 0.11, 16), shell, [0, -0.055, 0]);
      add(knee, new THREE.SphereGeometry(0.075, 16, 10), shell, [0, -0.125, 0.025]).scale.set(1, 0.6, 1.45);
      return { thigh, knee };
    });

    // torso: the hoodie, its pocket and the glowing AI
    this.torso = new THREE.Group();
    this.torso.position.y = HIP;
    this.body.add(this.torso);
    add(this.torso, new THREE.CylinderGeometry(0.18, 0.215, 0.3, 26), cloth, [0, 0.15, 0]);
    add(this.torso, new THREE.SphereGeometry(0.18, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), cloth, [0, 0.3, 0]).scale.set(1, 0.7, 1);
    add(this.torso, new THREE.TorusGeometry(0.205, 0.03, 10, 26), cloth, [0, 0.015, 0], [Math.PI / 2, 0, 0]);
    add(this.torso, new THREE.BoxGeometry(0.22, 0.07, 0.03), cloth, [0, 0.06, 0.2], [-0.1, 0, 0]);
    const ai = own(chestText(look.glow));
    const label = add(this.torso, new THREE.PlaneGeometry(0.17, 0.085), own(new THREE.MeshBasicMaterial({ map: ai, transparent: true, depthWrite: false })), [0, 0.15, 0.2], [-0.1, 0, 0]);
    label.castShadow = false;
    if (look.gear.includes('strings')) for (const x of [-0.05, 0.05]) add(this.torso, new THREE.CylinderGeometry(0.009, 0.009, 0.12, 6), trim, [x, 0.25, 0.185], [-0.15, 0, 0]);
    if (look.gear.includes('stripes')) for (const x of [-1, 1]) add(this.torso, new THREE.BoxGeometry(0.012, 0.24, 0.012), glow(look.trim, 1.4), [x * 0.19, 0.15, 0.07], [0, 0, x * 0.11]);
    if (look.hood === 'down') add(this.torso, new THREE.TorusGeometry(0.13, 0.055, 10, 22), cloth, [0, 0.32, -0.09], [-1.15, 0, 0]);

    // arms: a sleeve and a white glove, swinging from the shoulder
    this.arms = [-1, 1].map((side) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.215, 0.26, 0);
      this.torso.add(arm);
      add(arm, new THREE.SphereGeometry(0.07, 14, 10), cloth);
      add(arm, new THREE.CylinderGeometry(0.068, 0.062, 0.2, 16), cloth, [0, -0.1, 0]);
      if (look.gear.includes('stripes')) add(arm, new THREE.BoxGeometry(0.01, 0.17, 0.01), glow(look.trim, 1.4), [side * 0.066, -0.1, 0]);
      add(arm, new THREE.SphereGeometry(0.078, 16, 12), shell, [0, -0.225, 0.01]);
      return arm;
    });

    // head: the helmet, the visor with the face, and the gear. Its shape is a slightly wide ball.
    this.head = new THREE.Group();
    this.head.position.y = 0.56;
    this.torso.add(this.head);
    const skull = new THREE.Group();
    skull.scale.set(1.2, 1.0, 1.08);
    this.head.add(skull);
    add(skull, new THREE.SphereGeometry(0.27, 36, 24), shell);
    // The visor: a patch of a ball just outside the helmet, facing forward, showing the face picture.
    this.faceMat = mat('#ffffff', { map: face, emissive: '#ffffff', emissiveMap: face, emissiveIntensity: 0.9, roughness: 0.18, metalness: 0.1, transparent: true, alphaTest: 0.4 });
    add(skull, new THREE.SphereGeometry(0.273, 40, 18, Math.PI / 2 - 1.1, 2.2, Math.PI / 2 - 0.52, 1.15), this.faceMat).castShadow = false;
    if (look.gear.includes('headphones')) {
      for (const x of [-1, 1]) {
        add(skull, new THREE.CylinderGeometry(0.09, 0.09, 0.07, 24), shell, [x * 0.27, -0.01, 0], [0, 0, Math.PI / 2]);
        add(skull, new THREE.TorusGeometry(0.058, 0.013, 8, 24), glow(look.trim, 1.6), [x * 0.307, -0.01, 0], [0, Math.PI / 2, 0]);
      }
      add(skull, new THREE.TorusGeometry(0.28, 0.022, 8, 28, Math.PI), dark, [0, -0.01, -0.02]);
    }
    if (look.gear.includes('antenna')) {
      add(skull, new THREE.CylinderGeometry(0.012, 0.012, 0.11, 8), dark, [0, 0.31, 0]);
      add(skull, new THREE.SphereGeometry(0.038, 14, 10), shell, [0, 0.38, 0]);
    }
    if (look.hood === 'up') {
      // A hood over the head, open at the front so the face shows.
      const hood = add(this.head, new THREE.SphereGeometry(0.33, 30, 20, Math.PI / 2 + 0.9, Math.PI * 2 - 1.8, 0, 2.2), mat(look.hoodie, { roughness: 0.92, side: THREE.DoubleSide }), [0, 0.02, -0.035]);
      hood.scale.set(1.18, 1.0, 1.08);
    }
    if (look.gear.includes('catears')) {
      for (const x of [-1, 1]) {
        add(this.head, new THREE.ConeGeometry(0.085, 0.15, 4), cloth, [x * 0.19, 0.33, -0.03], [0, 0, -x * 0.35]);
        add(this.head, new THREE.ConeGeometry(0.05, 0.1, 4), glow(look.trim, 1.8), [x * 0.185, 0.32, 0.01], [0, 0, -x * 0.35]);
      }
    }
    if (look.gear.includes('bow')) {
      const bow = mat(look.trim, { roughness: 0.6 });
      for (const x of [-1, 1]) add(this.head, new THREE.ConeGeometry(0.07, 0.12, 12), bow, [0.2 + x * 0.065, 0.31, 0], [0, 0, x * (Math.PI / 2)]);
      add(this.head, new THREE.SphereGeometry(0.036, 12, 8), bow, [0.2, 0.31, 0]);
    }
  }

  get base() {
    if (this.mode === 'walk') return 'Walking';
    return this.sitGoal ? 'Sitting' : 'Idle';
  }

  sitNow() {
    this.sit = this.sitGoal = 1;
    this.mode = 'idle';
  }

  // Sitting down (or anything else named like the people's clips: walking, standing about).
  transition(name, seconds = 0.8) {
    if (name === 'Sitting') {
      this.sitGoal = 1;
      this.sitRate = 3 / Math.max(0.2, seconds);
      this.mode = 'idle';
    } else this.play(name);
  }

  // Getting up from the seat (the people lift their hips back to standing height).
  liftTo(to, seconds = 0.35) {
    this.sitGoal = to > 0 ? 1 : 0;
    this.sitRate = 3 / Math.max(0.15, seconds);
  }

  play(name) {
    this.mode = name === 'Walking' ? 'walk' : 'idle';
    if (this.mode === 'walk') this.sitGoal = 0;
  }

  setWalkRate(rate) {
    this.walkRate = rate;
  }

  // What the hands do while seated: type, read, think, wait or rest.
  setLayers(map = {}) {
    this.layer = ['type', 'read', 'think', 'wait'].find((k) => map[k]) || 'rest';
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    this.sit = ease(this.sit, this.sitGoal, this.sitRate, dt);
    this.walk = ease(this.walk, this.mode === 'walk' ? 1 : 0, 8, dt);
    if (this.mode === 'walk') this.phase += dt * 7.5 * this.walkRate;
    const s = this.sit;
    const w = this.walk * (1 - s);
    const swing = Math.sin(this.phase) * 0.55 * w;

    // Sitting: hips back over the seat and a little up; thighs forward, shins down.
    this.body.position.set(0, SIT_LIFT * s + Math.abs(Math.sin(this.phase)) * 0.025 * w + Math.sin(t * 2.1) * 0.006, -this.rig.sitBack * s);
    this.legs.forEach(({ thigh, knee }, i) => {
      const side = i ? -1 : 1;
      thigh.rotation.x = side * swing - (Math.PI / 2) * s;
      knee.rotation.x = Math.max(0, -Math.cos(this.phase + i * Math.PI)) * 0.5 * w + (Math.PI / 2) * s;
    });
    // Arms: swing when walking; at the desk, forward to type or read, or resting on the lap.
    const reach = { type: -1.05, read: -0.85, think: -1.9, wait: -0.35, rest: -0.35 }[this.layer] * s;
    this.arms.forEach((arm, i) => {
      const side = i ? 1 : -1;
      const tap = this.layer === 'type' ? Math.sin(t * 16 + i * Math.PI) * 0.07 * s : 0;
      arm.rotation.x = side * swing * 0.9 + reach + tap + Math.sin(t * 1.3 + i) * 0.03 * (1 - s);
      arm.rotation.z = -side * (0.12 + 0.04 * Math.sin(t * 0.9)) * (1 - w * 0.5);
    });
    // A curious head: it tilts and looks about when not walking.
    this.head.rotation.z = Math.sin(t * 0.7) * 0.06;
    this.head.rotation.y = Math.sin(t * 0.43) * 0.22 * (1 - this.walk);
    this.head.rotation.x = this.layer === 'type' || this.layer === 'read' ? 0.12 * s : 0;
    this.faceMat.emissiveIntensity = 0.85 + Math.sin(t * 2.6) * 0.08;
  }

  dispose() {
    for (const x of this.owned) x.dispose?.();
    this.owned.length = 0;
  }
}
