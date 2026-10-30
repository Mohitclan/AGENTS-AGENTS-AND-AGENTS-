---
name: env-flag-semantics
description: When a fact sheet claims an env flag gates a feature, check the parsing in config code, not just the .env.example comment
metadata:
  type: feedback
---

Before accepting a "website vs env config" conflict, read how the flag is parsed in the config code. Many flags are "on unless set to 0".

**Why:** In the T-20261030-01 review, the author read `USER_AUTO_REGENERATE=` (blank) as "off unless set". The code (`config.ts`) treats blank as on, so the listed conflict was false.

**How to apply:** For any conflict or limitation that rests on an env var, grep the flag name under `src/` and read the parse expression. Do the same for `fetch` summaries that report "instructions to AI agents". Those can be the fetch tool echoing your own prompt.
