---
name: env-sushant-machine
description: Sushant Mishra's Windows machine differs from the authoring machine: CRLF checkout makes 2 tests fail, no repos/ clone, no gh CLI
metadata:
  type: reference
---

On Sushant Mishra's machine (suryanshu@panscience.ai, user `susha`), as of 2026-11-02:

- `core.autocrlf=true`, so `node scripts/test.mjs` shows 2 failures (`fallback agents › are exactly what sync writes`, `skills › keeps the rest of the agent's file as it was`). They compare exact strings against LF files; not a logic regression. Fix is `git config core.autocrlf false` + re-checkout, or a `.gitattributes` with `* text=auto eol=lf`.
- `repos/` isn't cloned, so no developer task can run until `repos/motionrepo` exists.
- `gh` isn't installed; PR state can't be checked from the shell.

**How to apply:** before reporting a test failure or launching a developer task from this machine, check these three first instead of spending agent runs on them.
