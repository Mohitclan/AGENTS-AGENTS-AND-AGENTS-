---
name: skill-draft-writing
description: Traps when drafting skill additions that talk about markers, placeholders, source rules or figures - lint-copy and the overlap check fire on prose that merely mentions them
metadata:
  type: feedback
---

When writing a draft that describes a rule (rather than applying it), the automatic checks still fire on the words used to describe it.

**Why:** in T-20261103-09b, lint-copy failed on "[name]" (read as an unfilled placeholder) and on a quoted source figure with no source line nearby. A 6-word overlap script (the evaluator runs one) also flagged quoted source headings and stock phrases in "adapted:" notes.

**How to apply:**
- Describe markers and placeholders in words ("the needs-input marker", "a neutral label such as the buyer"), never as the literal bracketed text.
- Don't quote a source's figure in a "left out" note; say "an unsourced percentage".
- Run a 6-word overlap check of each draft against the raw source files before hand-in, and reword hits in the Sources notes too (functional code lines and URLs can stay, say so).
- Read sources raw with curl into the scratchpad, not through WebFetch summaries, so line numbers in the Sources notes are real.
- For each skill edit, list the loading agents' `skills:` and `tools:` first; a pointer to a skill the loader doesn't preload needs a standalone paragraph.
