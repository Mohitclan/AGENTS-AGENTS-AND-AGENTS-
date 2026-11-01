---
name: code-change-checks
description: For code reviews, open each script before listing it as a command for a human; when tests can't run, state the score ceiling and the order for the last revision
metadata:
  type: feedback
---

Before listing commands for a person to run, open the scripts behind them. Check prerequisites (a build output, a config, a dependency that isn't declared).

**Why:** In T-20261101-01 r1 I listed `typecheck`, `lint` and `check:site` from package.json only. r2 found `check:site` exits 1 without `next build`, and `next lint` has no ESLint installed or configured. The developer copied my list, so my error reached the write-up.

**How to apply:** Read the first lines of each script and grep the dependency in package.json and the lockfile. When a heavily weighted criterion can't be met in the session, give the score ceiling and say whether to ask the human before spending the last revision, so it can carry real results. Also check "result nobody saw" wording: "still works" from code reading must say it wasn't run.
