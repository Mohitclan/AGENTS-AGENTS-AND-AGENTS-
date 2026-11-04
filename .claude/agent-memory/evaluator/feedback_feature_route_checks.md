---
name: feature-route-checks
description: For reviews of new server routes plus UI (mission control features), run tests on a git archive, probe state machines with leftover files, uncaught throws in req 'end', fallback values, guard coverage of "server only" files, and UI catch-all enums
metadata:
  type: feedback
---

Green tests on a spec's own test list don't prove a feature. In T-20261104-18 r1, 27/27 passed, yet probes found a rollback (a leftover older proposal was offered again after a newer one was applied), a server crash (a throw inside `req.on('end')` sits outside the request's try/catch), and a fallback (a confirmed sheet's version taken from an unconfirmed upload).

**Why:** Builders test the happy path and the spec's list. Defects live in leftover files, error paths and fallback chains.

**How to apply:**
- Run the suite on `git archive <branch>` in the scratchpad. The main folder's untracked `.claude/worktrees/` gets copied by `makeCopy` into every test: 17 min there vs 43 s on the archive.
- For any "take the newest X" rule, leave an older X behind after applying a newer one, and see whether it's offered again.
- Plant a file where a folder should be (e.g. `knowledge/inbox`) and POST, to see whether the server survives.
- For each `a || b || c` fallback, ask which state makes `b` wrong (e.g. an upload that isn't confirmed yet).
- For each "written only by the server" file in a spec, run `guard.mjs` with a Write payload (`makeCopy().hook`). New files are not covered by default.
- When the server has a catch-all enum value (`other`), check whether the UI's "not in list" test sweeps it into a special state.
- Check that the task text the server writes agrees with the template it tells the agent to follow.
- For a human-confirm route, check the request is bound to what the person reviewed (hash or version). A new path that lets an agent edit the file under review widens the race; open dialogs are not re-checked on refresh (T-20261104-18 r2).
- For a UI "latest X" picker, test same-version ties across dates against the server's order.
- When a test comment says "the agent edits the sheet", check the test really does; skipping the step can make it assert a defect.
- Keep r1 probe and mutant scripts in the scratchpad; in r2 re-run them unchanged on a fresh archive, then add mutants aimed at each fix.

Related: [[code-change-checks]], [[ui-review-checks]]
