# SubE Gem avatars

Every agent has a small animated character, a "gem", that shows what the agent is really doing. You see them in mission control (`node scripts/control.mjs`):

- **The opening:** a black intro. The SubE Gems crystal draws itself in light, the gems pop into orbit, and the view flies through the crystal into the office. About three seconds; a click, a tap or any key skips it.
- **Home** (`#/`): the office full screen, with no chrome. The glowing dot at the top opens the navigation, and clicking a gem shows a card with its state and a link to its page. "Watch the demo" plays the narrated demo task. On a phone, the room keeps its height and you swipe sideways.
- **Working** (`#/working`): the same office with the "Who's doing what" list and the live feed beside it.
- **Overview, the sidebar, the agent pages:** live gems beside each agent.
- **Gem gallery** (`#/gems`): every gem in every state, at any size, with a simulator.
- **The dock:** a floating companion in the corner. It can be hidden, resized, muted, or popped out on top of other windows.

## The gems

| Gem | Agent | Character | Concept or extension |
|---|---|---|---|
| Code Buddy | developer | Hoodie coder with a laptop | Concept |
| Research Gem | researcher | Curious, round glasses, magnifier | Concept |
| Creative Gem | marketing | Cheerful, space buns, palette and brush | Concept |
| Cat Gem | lead-generator | Small cat in a mint hoodie, with a magnet | Concept |
| Penguin Gem | sales | Cozy penguin with headphones and a scarf | Concept |
| Panda Gem | knowledge-base | Relaxed panda in a sweater, with tea | Concept |
| Captain Gem | coordinator | Headset and clipboard | Family extension |
| Owl Gem | evaluator | Wise owl with spectacles and a stamp | Family extension |
| Bunny Gem | outreach | Bunny with a scarf and an envelope | Family extension |
| Fox Gem | demo-handler | Fox in a hoodie, with a demo screen | Family extension |
| Scribe Gem | docs-handler | Braid, sweater, open notebook | Family extension |
| System | scripts | A small crystal with a face | For sends, replies and checks |

The six concepts come from the brief. There are 11 agents, so five more were drawn in the same style so that no two agents share a face. A backup agent (`<name>-fallback`) wears its main agent's gem, and the page marks it "On backup".

## States, and where they come from

The server works out each state from real events in `avatarStatus()` in `scripts/control.mjs`. An animation never sets a state.

| State | When | What the gem does |
|---|---|---|
| Idle | Not on a task | Gentle float and breathing, blinks |
| Working | Its agent call is open and its latest step isn't a web lookup | Focused eyes, determined brows, typing, screen glow |
| Researching | Its latest step in an open call is a web search or fetch | Curious "o" mouth, raised brows, head tilts and glances, a "?" |
| Success | Its result in the last 10 minutes was done | Happy eyes, open smile, sparkles, a short hop when it happens |
| Waiting | The coordinator while others work, an agent that needs input, or the coordinator waiting for you | Slow sway, a "…" bubble |
| Error | Its result failed or was blocked, or it went to its backup, in the last 10 minutes | Worried brows and mouth, a sweat drop. No flashing |
| Paused | Tasks are queued but the plan's usage guard holds them | Eyes closed, still, slow z's |

In the office, real events also make gems walk:
- **A hand-off:** the agent walks to the coordinator's table to pick up the task.
- **A result:** the agent carries a paper to the table.
- **A review:** the Owl walks to the table and stamps PASS.
- **An ask:** when one agent asks another, the one asked walks over to the asker's desk.

The room shows the rest of the real activity as it happens:
- **Monitors:** each one shows what its agent is doing: code while working, a browser while researching, a check when done, a warning on a problem, a sleep screen when paused.
- **Chips:** small labels float up from the desk for web lookups (the site or search), files written, copy checks, leads found and failures.
- **Desks:** papers pile up on a desk as its agent writes files.
- **Mail:** emails sent leave through the window, and replies fly in to the Penguin's desk.
- **Approvals:** the "Waiting for you" tray shows how many sends wait for your approval.
- **Room:** the window, sky, skyline and lights follow the time of day.
- **Idle gems:** they do a small stretch or glance now and then. This happens only while they really are idle.

Only events from the last three minutes animate. Opening the page never replays old ones.

**The demo.** "Watch the demo" on the home and Working pages plays a narrated, 90-second task (`gems/simulator.js`). It has play/pause, 1× and 2× speed, restart and a progress bar. It shows:
- the task arriving and the plan going up on the board;
- web research, including a blocked site;
- agents asking each other for facts;
- leads being imported;
- a review that says REVISE, then PASS;
- copy checks and drafts;
- an agent failing over to its backup;
- the sends landing in the approval tray.

Captions explain each step. While it plays, the room says "Simulation", real updates wait, and the dock keeps showing real status. Ending the demo puts the room back on real data. The gallery uses the same script, looped, for its simulator.

## How it's built

Plain ES modules and CSS, with no build step and no new dependency. That matches the rest of mission control, which has no framework.

| File | Concern |
|---|---|
| `scripts/control/gems/characters.js` | Character assets: the SVG parts (shared chibi rig, face variants, hair, outfits, props, species, state effects) |
| `scripts/control/gems/identities.js` | Avatar identity: id, name, agent, theme, species, look, motion settings, badge crop |
| `scripts/control/gems/avatar.js` | Rendering and animation control: `avatarHTML`, `mountAvatars`, `setAvatarStatus`, `badgeImg` |
| `scripts/control/gems/status.js` | The state vocabulary and labels; the server sets the states |
| `scripts/control/gems/gems.css` | Expressions and motion for every state, walking, moments, tooltip, pausing |
| `scripts/control/gems/office.js` | The office and its event-driven movement, screens, chips, tray and captions |
| `scripts/control/gems/office.css` | The room: wall, window, skyline, lamps, light, desks, gems, chips, captions |
| `scripts/control/gems/intro.js`, `home.css` | The opening animation, the full-screen home, the nav dot and the floating controls |
| `scripts/control/gems/dock.js` | The floating companion: hide, resize, mute, pop-out |
| `scripts/control/gems/gallery.js` | The gallery and its controls |
| `scripts/control/gems/simulator.js` | The narrated demo script and its player (`createDemo`) |
| `scripts/control/gems/ui.css` | Styles for the Working page's lists, the dock, the gallery and the pop-out |

### Using an avatar

```js
import { avatarHTML, mountAvatars, setAvatarStatus } from './gems/avatar.js';

el.innerHTML = avatarHTML('researcher', { status: 'researching', size: 'md', mode: 'full' });
mountAvatars(el);                       // colours, blink timing, pause when off screen
setAvatarStatus(el.querySelector('.gem'), 'success', { doing: 'Finished: 5 candidates' });
```

- **size:** `xs` (28px), `sm` (44px), `md` (88px), `lg` (140px), `xl` (220px), or a number of pixels.
- **mode:** `full` (the whole character, transparent background), `badge` (a round head crop) or `desk` (no held prop).
- **Long lists:** for tables and logs, `badgeImg(agent)` gives a cheap static `<img>`.

### Performance and accessibility
- **Cheap animation:** only `transform` and `opacity` animate, all in CSS. No JavaScript animation loop runs.
- **Pausing:** gems scrolled out of view are paused by one shared `IntersectionObserver`. "Mute effects" in the dock pauses them all.
- **Reduced motion:** with `prefers-reduced-motion`, nothing moves, but expressions still change.
- **Labels:** every gem has `role="img"` and a label with its name, state and current step, plus a hover tooltip.
- **Keyboard:** office gems are buttons that open the agent's page.

## Replacing or adding characters

- **Change a gem's look:** edit its entry in `identities.js`. Use the `look` fields (colours, `hairStyle`, `outfit`, `prop`, `glasses`, `headset`, …) and the `theme`.
- **Give a new agent a gem:** add an entry with a new `id` and the agent's name in `agent`. Until it has one, it gets a neutral placeholder.
- **Add a new hairstyle, outfit, prop or species:** add a function to the matching table in `characters.js` (`HAIR`, `outfit()`, `PROPS`, `SPECIES`), then use it in an identity.
- **Use your own artwork (for example from a designer):** return your own SVG from `characterSVG` for that identity. Keep the class names (`gm-root`, `gm-head`, `gm-eyes-open`/`-focus`/`-happy`/`-closed`, `gm-mouth-smile`/`-open`/`-o`/`-flat`/`-worry`, `gm-arm-l`/`-r`, `gm-leg-l`/`-r`, `gm-prop`, `gm-fx-<state>`), so the states and walking keep working. Draw in a `0 0 160 200` box with the feet near y 190.
- **Check:** run `node scripts/test.mjs`. `gems.test.mjs` checks that every agent has a gem and every gem has every part.

## Limitations

- **The concept image wasn't available.** It didn't come through with the request, so the designs follow the written brief. Colours and details can be matched to the image once it's shared.
- **The pop-out isn't on top everywhere.** In Chrome and Edge (116+) it uses Document Picture-in-Picture, which stays on top of other desktop apps. Other browsers get a normal popup window (`#/float`) that other apps can cover. A web page can't put a character on the desktop by itself; that needs a desktop shell such as Electron or Tauri, which this project doesn't use.
- **Status is as fresh as the run log.** If a run log isn't on the machine serving the page, its agents show as idle.
- **No 3D yet.** See below.

## Upgrading to 3D later

A 3D version needs one modelled, rigged character per gem: a GLB with blend shapes for the eyes and mouth (blink, happy, worried, closed) and animation clips (idle, typing, looking around, hop, walk). None of these exist yet, and they can't be produced faithfully from a single reference image, so this build stays 2D.

When the models exist, the swap is small, because the rest of the system only talks to `avatar.js`:
1. Add a `model` field to each identity in `identities.js`.
2. In `avatarHTML`, render a placeholder element for identities with a model. Mount a Three.js renderer into it in `mountAvatars`, and map `setAvatarStatus` states to clips and blend shapes.
3. Use one shared WebGL renderer for all small avatars, or the page will create too many contexts. Keep the SVG gems for badges and long lists.
4. Serve Three.js from the page's own origin, or widen the page's security policy (`script-src` in `scripts/control.mjs`).
