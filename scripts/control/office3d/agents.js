// One controller per agent: it turns the agent's state into a goal (behavior.js), plans the steps
// to reach it (put the mug down, stand up, walk, turn, sit), and plays them on the character
// (characters.js). One step runs at a time, so an agent can't type while it holds a coffee, and a
// goal that changes mid-step waits for the step to end, except a walk, which re-routes at once.
//
// Moving: paths come from the floor grid (nav.js). While walking, an agent that meets another
// gives way by a fixed order, and walks round anyone standing still. Every place holds one agent.

import { ACTIVITIES, activityFor, deskPlace, personality, pickIdle, stepsTo } from './behavior.js';
import { deskFor, spot, yawTo } from './layout.js';
import { blockAround, findPath } from './nav.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class Agent {
  constructor({ name, index, character, world }) {
    this.name = name;
    this.index = index;
    this.ch = character;
    this.world = world;
    this.desk = deskFor(name);
    this.me = personality(name);
    const seat = this.desk?.seat || { x: 0, z: 0, yaw: 0 };
    this.pos = { x: seat.x, z: seat.z };
    this.yaw = seat.yaw;
    this.pose = this.desk ? 'sit' : 'stand';
    this.place = deskPlace(name);
    this.holding = null;
    this.status = 'idle';
    this.doing = '';
    this.source = 'real';
    this.goal = null; // { key, activity, place, pose, stand, seat, spotId, until, why }
    this.steps = [];
    this.phase = null;
    this.ambient = null; // { activity, spot, until, partner }
    this.errand = null; // { activity, place, until, look }
    this.memory = {};
    this.v = 0;
    this.wait = 0;
    this.replanAt = 0;
    this.nextThink = 0;
    this.nextGesture = 0;
    this.statusSince = 0;
    this.onceDone = null;
    if (this.pose === 'sit') this.ch.sitNow();
    this.sync();
  }

  sync() {
    this.ch.root.position.set(this.pos.x, 0, this.pos.z);
    this.ch.root.rotation.y = this.yaw;
  }

  get walking() {
    return this.phase?.kind === 'walk';
  }

  setStatus(status, doing, source, now) {
    if (status !== this.status) {
      this.status = status;
      this.statusSince = now;
      this.onceDone = null;
      if (activityFor(status, this.name)) this.ambient = null;
    }
    this.doing = doing || '';
    this.source = source;
  }

  // A short visit caused by a real event (a brief, a question to a colleague, an approval).
  setErrand(errand) {
    this.errand = errand;
  }

  // ---- what the agent should be doing now ----
  wanted(now) {
    if (this.errand && now > this.errand.until) this.errand = null;
    if (this.errand) return this.resolve(this.errand.activity, this.errand.place, 'errand', this.errand);
    let act = activityFor(this.status, this.name);
    if (act === 'success' && this.onceDone === 'success') act = null;
    if (act) {
      if (act === 'paused') return this.resolve('paused', this.freeSpot('lounge') || deskPlace(this.name), 'state');
      if (act === 'planning' && this.claimable('board')) return this.resolve('planning', 'board', 'state');
      if (act === 'planning') return this.resolve('writing', deskPlace(this.name), 'state');
      return this.resolve(act, ACTIVITIES[act].place === 'here' ? 'here' : deskPlace(this.name), 'state');
    }
    // idle: ambient, unless the person paused it
    if (!this.world.ambient || this.world.reduced) return this.resolve('desk', deskPlace(this.name), 'idle');
    // Time at a place counts from arrival, so a long walk doesn't eat the visit. A trip that never
    // arrives (blocked for over 90 s) is given up.
    const amb = this.ambient;
    if (!amb || (now > amb.until && (amb.arrived || amb.activity === 'desk' || now - (amb.at ?? 0) > 90000))) this.chooseAmbient(now);
    const a = this.ambient;
    return this.resolve(a.activity, a.spot || deskPlace(this.name), 'idle', a);
  }

  claimable(id) {
    const owner = this.world.claims.get(id);
    return !owner || owner === this.name;
  }

  freeSpot(kind) {
    const s = [...this.world.spotsOf(kind)].find((p) => this.claimable(p.id));
    return s?.id || null;
  }

  chooseAmbient(now) {
    const w = this.world;
    const prev = this.ambient;
    // on the move: an idle agent that hasn't reached its place yet (standing up counts too)
    const moving = [...w.agents.values()].filter((a) => a.goal?.why === 'idle' && a.place !== a.goal.place).length;
    // One new trip every few seconds, and at most four idle agents on the move, so the office is
    // lively but not busy. (Several agents decide in the same frame, so any two choices are also
    // kept 1.2 s apart.)
    const tooBusy = now - w.lastAmbient < 4000 || now - (w.lastChoice ?? -Infinity) < 1200 || moving >= 4;
    if (prev?.activity === 'stroll' && prev.legs > 1) {
      // a stroll carries on to its next waypoint, unless the floor is full right now
      if (moving >= 4) {
        prev.until = now + 2000;
        return;
      }
      const taken = new Set([...w.claims.keys()]);
      const next = w.spotsOf('stroll').filter((s) => !taken.has(s.id) && s.id !== prev.spot && !(prev.seen || []).includes(s.id));
      if (next.length) {
        // prefer a waypoint that isn't far away, so a stroll wanders instead of crossing the room
        next.sort((a, b) => Math.hypot(a.x - this.pos.x, a.z - this.pos.z) - Math.hypot(b.x - this.pos.x, b.z - this.pos.z));
        const s = next[Math.floor(Math.random() * Math.min(3, next.length))];
        const [lo, hi] = ACTIVITIES.stroll.dwell;
        const dwell = (lo + Math.random() * (hi - lo)) * 1000;
        this.ambient = { activity: 'stroll', spot: s.id, legs: prev.legs - 1, seen: [...(prev.seen || []), prev.spot], dwell, until: now + dwell, since: prev.since, at: now };
        return;
      }
    }
    if (!prev) {
      // first visit: everyone starts at the desk, and the first agents get up within a few seconds
      this.ambient = { activity: 'desk', spot: null, until: now + 800 + Math.random() * 6000, since: now, first: true };
      return;
    }
    if (tooBusy) {
      prev.until = now + 5000; // stay a little longer where you are
      return;
    }
    const taken = new Set([...w.claims.entries()].filter(([, who]) => who !== this.name).map(([id]) => id));
    const partners = [...w.agents.values()].filter((a) => a !== this && a.status === 'idle' && !a.errand && !a.walking && (!a.ambient || a.ambient.activity === 'desk') && now - (a.ambient?.since ?? 0) > 20000);
    // after sitting since the page loaded, the first choice is always a trip
    const pick = pickIdle({ agent: this.name, now, memory: this.memory, taken, partners: partners.map((p) => p.name), justMoved: !!prev && prev.activity !== 'desk', noDesk: !!prev?.first });
    this.ambient = { ...pick, until: now + pick.dwell, since: now, at: now };
    w.lastChoice = now;
    if (pick.partner && moving >= 3) {
      // a chat needs two walkers; not now
      this.ambient = { activity: 'desk', spot: null, until: now + 8000, since: now };
      return;
    }
    if (pick.activity !== 'desk') {
      this.memory[pick.activity] = now;
      w.lastAmbient = now;
    }
    if (pick.partner) {
      const other = w.agents.get(pick.partner);
      other.ambient = { activity: pick.activity, spot: pick.partnerSpot, dwell: pick.dwell, until: now + pick.dwell, since: now, at: now, partner: this.name };
      other.memory[pick.activity] = now;
      this.ambient.partner = other.name;
    }
  }

  resolve(activity, place, why, extra = {}) {
    const a = ACTIVITIES[activity];
    const key = `${activity}@${place}`;
    if (this.goal?.key === key) return this.goal;
    let stand;
    let seat = null;
    let spotId = null;
    if (place === 'here') stand = this.pose === 'sit' && this.desk ? { ...this.desk.approach, yaw: this.desk.seat.yaw } : { x: this.pos.x, z: this.pos.z, yaw: this.yaw };
    else if (place.startsWith('desk:')) {
      const d = this.desk;
      stand = { ...d.approach, yaw: d.seat.yaw };
      if (a.pose === 'sit') seat = d.seat;
    } else if (place.startsWith('visit:')) {
      const p = extra.point;
      stand = { x: p.x, z: p.z, yaw: p.yaw };
    } else {
      const s = spot(place);
      spotId = s.id;
      stand = s.approach ? { ...s.approach, yaw: s.yaw } : { x: s.x, z: s.z, yaw: s.yaw };
      if (s.sit) seat = s;
    }
    return { key, activity, place, pose: seat ? 'sit' : 'stand', stand, seat, spotId, why, partner: extra.partner, look: extra.look };
  }

  // ---- the step machine ----
  update(dt, now) {
    const want = this.wanted(now);
    if (want.key !== this.goal?.key) this.retarget(want, now);
    if (this.replan && (!this.phase || ['walk', 'face', 'loop', 'stuck'].includes(this.phase.kind))) {
      this.replan = false;
      this.plan();
    }
    if (!this.phase) this.nextStep(now);
    if (this.phase) this.runPhase(dt, now);
    this.sync();
  }

  retarget(goal, now) {
    const w = this.world;
    if (goal.spotId && !this.claimable(goal.spotId)) {
      // someone got there first: try again shortly, at the desk meanwhile
      if (this.ambient) this.ambient.until = now;
      goal = this.resolve('desk', deskPlace(this.name), 'idle');
    }
    if (this.goal?.spotId && this.goal.spotId !== goal.spotId && w.claims.get(this.goal.spotId) === this.name) w.claims.delete(this.goal.spotId);
    if (goal.spotId) w.claims.set(goal.spotId, this.name);
    this.goal = goal;
    // A sit, stand, gesture or mug step finishes first; a walk, a turn or a loop gives way now.
    this.replan = true;
  }

  plan() {
    const g = this.goal;
    const from = { place: this.place, pose: this.pose, holding: this.holding };
    this.steps = stepsTo(from, { place: g.place, pose: g.pose });
    this.phase = null;
  }

  nextStep(now) {
    const step = this.steps.shift();
    if (!step) return;
    const g = this.goal;
    const ch = this.ch;
    switch (step) {
      case 'putDown':
        this.phase = { kind: 'putDown', t: 0, dur: 0.9 };
        ch.setLayers({ drink: 0 });
        if (ch.actions.Reach) ch.gesture('Reach', 0.85); // the people reach out to the counter
        break;
      case 'standUp': {
        const to = this.lastStand || this.desk?.approach || this.pos;
        this.phase = { kind: 'standUp', t: 0, dur: 0.95, from: { ...this.pos }, to: { x: to.x, z: to.z } };
        ch.setLayers({});
        ch.look = null;
        ch.transition('Standing', 0.95);
        break;
      }
      case 'walk':
        this.place = 'moving';
        this.phase = { kind: 'walk', path: this.route(g.stand), i: 1 };
        ch.setLayers({});
        ch.setFace({});
        ch.look = null;
        if (!this.phase.path) this.phase = { kind: 'stuck', t: 0, dur: 1.2 };
        break;
      case 'face':
        this.phase = { kind: 'face', yaw: g.stand.yaw };
        break;
      case 'sitDown':
        this.phase = { kind: 'sitDown', t: 0, dur: 0.95, from: { ...this.pos }, to: { x: g.seat.x, z: g.seat.z } };
        this.lastStand = { x: this.pos.x, z: this.pos.z };
        ch.transition('Sitting', 0.95);
        break;
      case 'loop':
        this.place = g.place;
        this.enterLoop(now);
        break;
      default:
        break;
    }
  }

  route(to) {
    const w = this.world;
    const still = [...w.agents.values()].filter((a) => a !== this && !a.walking && dist(a.pos, this.pos) < 6).map((a) => a.pos);
    const dyn = still.length ? blockAround(w.grid, still) : null;
    return findPath(w.grid, this.pos, to, dyn) || findPath(w.grid, this.pos, to);
  }

  runPhase(dt, now) {
    const p = this.phase;
    const ch = this.ch;
    const done = () => {
      this.phase = null;
    };
    switch (p.kind) {
      case 'putDown': {
        p.t += dt;
        ch.look = this.goal ? null : ch.look;
        if (p.t > 0.5 && this.holding) {
          this.holding = null;
          ch.holdMug(false);
          this.world.showCounterMug(this.mugSpot, true);
        }
        if (p.t >= p.dur) done();
        break;
      }
      case 'pickUp': {
        p.t += dt;
        if (p.t > 0.45 && !this.holding) {
          this.holding = 'mug';
          this.mugSpot = p.spot;
          ch.holdMug(true);
          this.world.showCounterMug(p.spot, false);
        }
        if (p.t >= p.dur) {
          this.phase = { kind: 'loop' };
          this.setLoopLayers(now);
        }
        break;
      }
      case 'standUp':
      case 'sitDown': {
        p.t += dt;
        const k = ease(p.kind === 'sitDown' ? (p.t - 0.1) / (p.dur - 0.2) : p.t / (p.dur - 0.15));
        this.pos.x = p.from.x + (p.to.x - p.from.x) * k;
        this.pos.z = p.from.z + (p.to.z - p.from.z) * k;
        if (p.t >= p.dur) {
          this.pose = p.kind === 'sitDown' ? 'sit' : 'stand';
          if (this.pose === 'stand') ch.play('Idle', 0.3);
          done();
        }
        break;
      }
      case 'face': {
        const diff = wrap(p.yaw - this.yaw);
        const step = Math.sign(diff) * Math.min(Math.abs(diff), 4.5 * dt);
        this.yaw += step;
        if (this.pose === 'stand') ch.play(Math.abs(diff) > 0.3 ? 'Walking' : 'Idle', 0.25, 0.6);
        if (Math.abs(diff) < 0.03) {
          this.yaw = p.yaw;
          ch.play(this.pose === 'sit' ? 'Sitting' : 'Idle', 0.25);
          done();
        }
        break;
      }
      case 'walk':
        this.walk(dt, now);
        break;
      case 'stuck':
        p.t += dt;
        ch.play('Idle', 0.3);
        if (p.t >= p.dur) {
          this.phase = null;
          this.steps.unshift('walk');
        }
        break;
      case 'gesture':
        // the clip's end event moves on; this only guards against a gesture that never ends
        p.t = (p.t || 0) + dt;
        if (p.t > 4) {
          this.phase = { kind: 'loop' };
          this.setLoopLayers(now);
        }
        break;
      case 'loop':
        this.loop(dt, now);
        break;
      default:
        break;
    }
  }

  walk(dt, now) {
    const p = this.phase;
    const ch = this.ch;
    const path = p.path;
    const vmax = 1.05 * this.me.pace;
    let target = path[p.i];
    while (target && p.i < path.length - 1 && dist(this.pos, target) < 0.15) target = path[++p.i];
    const remaining = dist(this.pos, path[path.length - 1]);
    if (!target || (p.i >= path.length - 1 && dist(this.pos, target) < 0.04)) {
      this.v = 0;
      ch.play('Idle', 0.3);
      this.phase = null;
      return;
    }
    const dx = target.x - this.pos.x;
    const dz = target.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    const want = yawTo(dx, dz);
    const diff = wrap(want - this.yaw);
    this.yaw += Math.sign(diff) * Math.min(Math.abs(diff), 5.5 * dt);
    const align = Math.max(0.1, Math.cos(Math.min(Math.abs(diff), Math.PI / 2)));
    let limit = vmax * align * Math.min(1, 0.25 + remaining / 0.7);

    // others: give way to someone in front, walk round anyone standing still
    for (const o of this.world.agents.values()) {
      if (o === this) continue;
      const ox = o.pos.x - this.pos.x;
      const oz = o.pos.z - this.pos.z;
      const od = Math.hypot(ox, oz);
      if (od > 1.0) continue;
      const ahead = (ox * dx + oz * dz) / (od * d || 1);
      if (od < 0.5 && od > 0.001) {
        const push = (0.5 - od) * 0.6;
        const nx = this.pos.x - (ox / od) * push;
        const nz = this.pos.z - (oz / od) * push;
        if (this.world.grid.walkable(nx, nz)) {
          this.pos.x = nx;
          this.pos.z = nz;
        }
      }
      if (ahead < 0.55 || od > 0.85) continue;
      if (o.walking) {
        if (o.index < this.index) {
          limit = 0;
          this.wait += dt;
        } else limit = Math.min(limit, vmax * 0.45);
      } else if (now > this.replanAt) {
        this.replanAt = now + 900;
        const path2 = this.route(this.goal.stand);
        if (path2) {
          p.path = path2;
          p.i = 1;
        } else limit = 0;
      } else limit = 0;
    }
    if (this.wait > 1.6 && limit === 0) {
      this.wait = 0;
      const path2 = this.route(this.goal.stand);
      if (path2) {
        p.path = path2;
        p.i = 1;
      }
    }
    if (limit > 0) this.wait = 0;
    this.v += (limit - this.v) * Math.min(1, (limit > this.v ? 3 : 6) * dt);
    if (this.v > 0.02) {
      const step = Math.min(this.v * dt, d);
      this.pos.x += (dx / d) * step;
      this.pos.z += (dz / d) * step;
      ch.play('Walking', 0.28);
      ch.setWalkRate(Math.max(0.35, this.v / (ch.rig?.walkSpeed || this.world.rig.walkSpeed)));
    } else ch.play('Idle', 0.3);
  }

  enterLoop(now) {
    const g = this.goal;
    const a = ACTIVITIES[g.activity];
    const ch = this.ch;
    if (g.why === 'idle' && this.ambient && !this.ambient.arrived) {
      this.ambient.arrived = true;
      if (this.ambient.dwell) this.ambient.until = now + this.ambient.dwell;
    }
    ch.setFace(a.face || {});
    ch.pace = a.pace || 1;
    this.nextThink = now + 6000 + Math.random() * 6000;
    this.nextGesture = now + 3000 + Math.random() * 5000;
    if (a.loop === 'drink' && !this.holding) {
      const s = spot(g.spotId);
      this.phase = { kind: 'pickUp', t: 0, dur: 0.9, spot: s.id };
      ch.look = this.world.counterPoint(s);
      ch.setLayers({});
      if (ch.actions.Reach) ch.gesture('Reach', 0.85);
      return;
    }
    const once = a.once && this.onceDone !== `${g.activity}@${this.statusSince}` ? a.once : null;
    if (once && this.pose === 'stand') {
      this.phase = { kind: 'gesture' };
      ch.setLayers({});
      ch.gesture(once).then(() => {
        if (g.activity === 'success') this.onceDone = 'success';
        else this.onceDone = `${g.activity}@${this.statusSince}`;
        if (this.phase?.kind === 'gesture') {
          this.phase = { kind: 'loop' };
          this.setLoopLayers(now);
        }
      });
      return;
    }
    this.phase = { kind: 'loop' };
    this.setLoopLayers(now);
  }

  setLoopLayers(now) {
    const g = this.goal;
    const a = ACTIVITIES[g.activity];
    const ch = this.ch;
    const L = {};
    if (a.loop === 'type') L.type = 1;
    if (a.loop === 'read') L.read = 1;
    if (a.loop === 'drink') L.drink = 1;
    if (a.loop === 'chat') L.chat = 0.8;
    if (a.loop === 'present') L.present = 1;
    if (a.loop === 'upset') L.upset = 1;
    if (a.loop === 'rest') L.rest = 1;
    if (a.loop === 'wait') L.wait = 1;
    ch.setLayers(L);
    ch.look = this.lookPoint(a, g, now);
  }

  lookPoint(a, g, now) {
    const w = this.world;
    if (a.loop === 'type' || a.loop === 'read' || (g.activity === 'desk' && this.pose === 'sit' && Math.sin(now / 9000 + this.index) > 0.2)) return w.monitorPoint(this.name);
    if (a.loop === 'present' || a.look === 'board' || g.activity === 'brief') return w.displayPoint();
    if (a.loop === 'chat') {
      const other = g.partner && w.agents.get(g.partner);
      if (other) return w.headOf(other);
      if (g.look) return g.look;
      return null;
    }
    if (a.loop === 'gaze') return w.outside(this.pos);
    if (a.loop === 'browse') return spot(g.spotId)?.look || null;
    if (a.loop === 'look') return this.glance();
    return null;
  }

  // Somewhere nearby to look at while pausing on a stroll.
  glance() {
    const turn = this.yaw + (Math.random() - 0.5) * 2.4;
    return { x: this.pos.x + Math.sin(turn) * 3, y: 0.9 + Math.random() * 0.8, z: this.pos.z + Math.cos(turn) * 3 };
  }

  loop(dt, now) {
    const g = this.goal;
    const a = ACTIVITIES[g.activity];
    const ch = this.ch;
    if (a.loop === 'chat') {
      ch.look = this.lookPoint(a, g, now);
      if (now > this.nextGesture && this.pose === 'stand') {
        this.nextGesture = now + 6000 + Math.random() * 6000;
        if (Math.random() < 0.45) {
          this.phase = { kind: 'gesture' };
          ch.gesture(Math.random() < 0.8 ? 'Yes' : 'Wave', 1.9).then(() => {
            if (this.phase?.kind === 'gesture') this.phase = { kind: 'loop' };
          });
        }
      }
    }
    // a pause to think during writing and reviewing
    if (a.think && now > this.nextThink) {
      const thinking = !this.thinkUntil || now > this.thinkUntil;
      if (thinking && !this.thinkUntil) {
        this.thinkUntil = now + 2600;
        ch.setLayers({ think: 1, read: a.loop === 'read' ? 0.3 : 0 });
        ch.look = null;
      } else if (this.thinkUntil && now > this.thinkUntil) {
        this.thinkUntil = 0;
        this.nextThink = now + 7000 + Math.random() * 7000;
        this.setLoopLayers(now);
      }
    }
    if (g.activity === 'desk' && this.pose === 'sit' && Math.random() < dt * 0.05) ch.look = this.lookPoint(a, g, now);
    if (a.loop === 'gaze' && Math.random() < dt * 0.08) ch.look = this.world.outside(this.pos);
    if (a.loop === 'look' && Math.random() < dt * 0.6) ch.look = this.glance();
    // browsing: now and then a hand to the chin, as if reading a spine
    if (a.loop === 'browse' && Math.random() < dt * 0.05) ch.setLayers({ think: ch.target?.think ? 0 : 1 });
  }

  // Put the agent back at its desk at once (the demo's reset).
  reset() {
    const seat = this.desk.seat;
    if (this.goal?.spotId && this.world.claims.get(this.goal.spotId) === this.name) this.world.claims.delete(this.goal.spotId);
    if (this.holding) this.world.showCounterMug(this.mugSpot, true);
    this.holding = null;
    this.ch.holdMug(false);
    this.pos = { x: seat.x, z: seat.z };
    this.yaw = seat.yaw;
    this.pose = 'sit';
    this.place = deskPlace(this.name);
    this.goal = null;
    this.phase = null;
    this.steps = [];
    this.ambient = null;
    this.errand = null;
    this.status = 'idle';
    this.v = 0;
    this.ch.setLayers({});
    this.ch.setFace({});
    this.ch.look = null;
    this.ch.sitNow();
    this.sync();
  }

  describe() {
    const g = this.goal;
    const a = g && ACTIVITIES[g.activity];
    const moving = this.walking ? 'Walking: ' : '';
    return { label: `${moving}${a?.label || 'At the desk'}`, why: g?.why || 'idle' };
  }
}
