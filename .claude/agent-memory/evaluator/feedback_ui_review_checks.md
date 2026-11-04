---
name: ui-review-checks
description: For page or UI code reviews, test client-side claims in headless Chrome with a probe script, set the window size, enumerate contrast for every hover descendant, know headless timing artifacts
metadata:
  type: feedback
---

Test a UI change's client behaviour claims by running the page's own script in headless Chrome, not by reading code.

**Why:** In T-20261102-01 r1, "animations keep running across the refresh" was true for SMIL but false for CSS: detaching and re-attaching a node restarts its CSS animations. Only a probe showed it. The hand-checked contrast list also missed a hover state at 2.85:1, and a "10 px text" claim measured about 8 px. In r2 I found a second hover failure I had missed in r1 (green `em` inside a chip on the mustard hover, 3.74:1), which put the r2 PASS on a knife edge.

**How to apply:**
- Append a `<script>` probe to the `--once` HTML (or build pages with `collect()`/`renderPage()` plus a forced state), then run `chrome --headless=new --window-size=W,H --virtual-time-budget=8000 --dump-dom file:///...` and write results into a `<pre>`. Write probe files with the Write tool; heredocs with nested quotes break.
- To test a refresh path, mock `window.fetch` and call the page's real `refresh()`; wrap globals like `setTop` to count calls.
- In headless=new a window is 22 px wider than `innerWidth`, and there's a 15 px scrollbar. Set the window size so the inner width hits the breakpoint exactly.
- Contrast: in the browser, walk every text node under every hoverable element (`a`, buttons) and compute its colour against the hover background. Child elements with their own colour are the ones that get missed.
- Under virtual time, new CSS animations can stay `pending=true` at 0 ms because few frames are drawn. Check `a.pending` and count rAF calls before calling it a defect.
- Use `--force-prefers-reduced-motion` for motion checks. `Animation` has no `.target`; use `.effect.target` or `.animationName`.
- Measure scaled SVG text: rendered size = font size × (SVG width / viewBox width).
- Mission control pages keep an `EventSource` open, so `--dump-dom` against the live server never settles (it timed out at 90 s). Instead, fetch `/`, `/api/state` and the feature's list from a seeded server, then copy `scripts/control/` to a harness folder. Load a classic `mock.js` (stub `fetch` and `EventSource`), then `app.js` and the probe, both as `type="module"`, over `file://` with `--allow-file-access-from-files`. Check focus after actions that re-render the opener away (T-20261104-18: focus fell to BODY after a confirm).

Related: [[code-change-checks]], [[revision-round-checks]]
