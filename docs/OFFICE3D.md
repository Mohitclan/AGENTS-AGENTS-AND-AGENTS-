# The 3D office

Mission control's Home and Working pages show the team as a 3D office. The agents work at their desks while the server says they're busy. Between tasks they get coffee, look out of the window, rest on the sofa or chat. It runs in the browser with WebGL 2, needs no build step and no npm install, and uses no paid service. If the 3D office can't load, the flat 2D office takes its place. A **2D** button switches by hand, and the choice is remembered.

## What is real and what is not

| Source | What it drives | Shown as |
|---|---|---|
| **Live** (the server's stream) | Each agent's state (`idle`, `working`, `researching`, `success`, `waiting`, `error`, `paused`, worked out by `avatarStatus` in `scripts/control.mjs`). Events: handoffs, results, approvals, web reads. The task display and the "Needs you" tray | "Live" badge |
| **Simulation** (the narrated demo, `gems/simulator.js`) | The same office, from a script | Amber "Simulation" badge, and SIMULATION on the task display |
| **Preview** (the Preview panel) | States you set by hand, to try the behaviours. Nothing runs and nothing is saved | Blue "Preview" badge |
| **Ambient** | What idle agents do between tasks | The agent panel says "ambient". It is never shown as work |

An animation never decides anything about a task. A thumbs-up plays because the server reported `success`, and a task is never marked done because a clip ended.

## How it is built

All of it is in `scripts/control/office3d/`. The three plain modules have no Three.js and are tested in `scripts/tests/office3d.test.mjs`.

| File | Job |
|---|---|
| `layout.js` | The floor plan in metres: the desks (one per agent), places (coffee, windows, sofa, meeting table, huddle, task display, tray) and the furniture footprints |
| `nav.js` | The floor grid (footprints grown by the agent's radius), A* with a heap, and string-pulled paths. It also blocks cells round agents who are standing still |
| `behavior.js` | The rules. Real state to activity (`ROLE_WORK`, `ACTIVITIES`, `activityFor`). Ambient choice with per-agent personality, cooldowns and free places (`pickIdle`). The step order between two goals (`stepsTo`) |
| `agents.js` | One controller per agent: the goal, the step machine (put the mug down, stand up, walk, turn, sit, loop), avoiding other agents, place claims, and errands from real events |
| `characters.js` | The rigged model, its clips with cross-fades, procedural layers and face morphs |
| `scene.js` | The office geometry, materials, lights, the city, the screens and the task display. Static furniture is merged into one mesh per material |
| `office3d.js` | The renderer, camera and views, labels, agent panel, preview panel, and the hookup to `update()` from the app |
| `mount.js` | Chooses the 3D or 2D office, and falls back to 2D if loading fails |

### From state to place

| State | Role | Activity | Place and pose |
|---|---|---|---|
| `working` | developer | coding | own desk, seated, fast typing |
| `working` | evaluator | analyzing | own desk, seated, reading with pauses to think |
| `working` | coordinator | planning | the task display, standing and pointing |
| `working` | everyone else | writing | own desk, seated, typing with pauses to think |
| `researching` | any | researching | own desk, seated, reading and scrolling |
| `waiting` | any | waiting | beside its desk, standing, glancing at the display |
| `error` | any | error | beside its desk: a head shake (the model's "No" clip), then a sad face |
| `success` | any | success | where it is: a thumbs-up, then back to ambient |
| `paused` | any | paused | a free seat on the sofa |
| `idle` | any | ambient | the desk, coffee, a window, the sofa, a chat at the meeting table or on the rug |

Real events add short errands:
- A coordinator handoff sends the agent to the display for a brief.
- An agent-to-agent question sends the asker to the colleague's desk, and the answer comes back the same way.
- An approval sends the coordinator to the tray.

Ambient trips stay calm:
- Only one new trip starts every 7 seconds, and any two choices are at least 1.5 seconds apart.
- At most three idle agents are on the move at once.
- Each activity has a cooldown.
- **Ambient** off, or **Reduced motion** on, keeps idle agents at their desks.

## The cast

The default cast is **people**: Kenney's "Mini Characters" (CC0). They are twelve cute, chunky people who share one skeleton, and each agent is one of them (`office3d/cast.js`). The **Robots** button switches every agent to the earlier robot model, tinted in the agent's colour, and the choice is remembered. If the people can't load, the robots are used.

| Agent | Person |
|---|---|
| Coordinator | suit and tie (`male-d`) |
| Evaluator | white hair and glasses (`male-e`) |
| Developer | black hair (`male-f`) |
| Docs handler | beard (`male-b`) |
| Sales | round glasses (`male-a`) |
| Marketing | ginger buns (`female-b`) |
| Demo handler | ginger bun and blazer (`female-d`) |
| Knowledge base | grey beanie (`female-c`) |
| Researcher | black hair (`female-e`) |
| Lead generator | auburn hair (`female-f`) |
| Outreach | black bun and purple top (`female-a`) |

The police officer (`male-c`) isn't used. The Unipaws portraits (Figma, CC BY 4.0) are meant for each agent's label and panel. They are not in yet, because exporting them needs a Figma sign-in.

## Animation: what is keyframed and what is procedural

- **Keyframed clips from the models**, blended with cross-fades:
  - People: idle, walk, sit, yes, no, and reach (used to pick up and put down the mug).
  - Robot: idle, walk, sit down, stand up, thumbs-up, nod, head shake and wave.
- **Walking:** the walk clip's speed is matched to the ground speed measured from the clip, so the feet don't slide.
- **Sitting:**
  - Chairs, desks and the sofa are sized from the cast's own sitting pose.
  - The people's sit clip sits on the floor, so they are lifted onto the seat as they sit.
  - They have no stand-up clip, so they blend back to idle.
- **Procedural layers on top:** typing, reading and scrolling, a hand to the chin, drinking from a mug, pointing at the display, talking with the hands, waiting with hands together, and where the head looks. Neither model has clips for these.
  - They are bone rotations added after the clips, eased in and out.
  - The people have one joint per arm (no elbows or fingers), so their arms move from the shoulder: a lift plus an inward swing. The angles came from a search that puts the hand on the keyboard, the mouse, the chin or the mouth.
  - These read well at office distance. They are not motion capture.
- **Faces:** the robot's own morph targets. The people have no face morphs.

**Limitations:**
- The people's arms have no elbows, so typing is a two-handed tap from the shoulder.
- Their legs have no knees, so they sit with their legs straight out, like toddlers on a chair.
- Lifelike characters with fingers, elbows and mocap clips need richer rigged models, which are usually paid. The behaviour, navigation and state code would not change: `characters.js` would get a third entry in `RIGS`.

## Performance

- Static furniture is merged, so a frame takes a few hundred draw calls, not well over a thousand.
- There is one shadow-casting light, and the pixel ratio is capped at 1.5.
- Off-screen characters animate at a quarter of the rate.
- It renders at about 30 fps when nothing moves, at 60 while someone walks or the camera moves, and not at all in a hidden tab.

## Trying it

- Open mission control (`node scripts/control.mjs`, http://127.0.0.1:4318). Use **Preview** to set states, and the view buttons to move the camera.
- Drag to look around, scroll to zoom, and click an agent for its panel. **Follow** keeps the camera on it.
- From the browser console, `__office3d.step(600)` runs the office ahead by 10 seconds, which is useful in a background tab.

## Updating Three.js

```bash
npm install --no-save three@<version> && node scripts/vendor-three.mjs
```

Then update the version in `docs/CREDITS.md`.
