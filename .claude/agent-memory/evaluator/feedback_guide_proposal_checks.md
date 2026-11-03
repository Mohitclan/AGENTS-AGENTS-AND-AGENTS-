---
name: guide-proposal-checks
description: How to review style-guide or knowledge proposals that cite our own drafts as evidence - "all/every/only" claims, PASS vs approved, line-number collisions between proposals, unmarked judgment calls
metadata:
  type: feedback
---

When a guide's evidence column says "all", "every" or "only", check each item it covers, not a sample. Also check every "approved" label against the cited draft's frontmatter `status:` and `ops/approvals.md`.

**Why:** in T-20261103-07 r1, three of the four mismatches were universal claims that one item disproved: "every battlecard entry has a Weak line", "L-ab940a31 is all 'I'", "only first-name greetings". The guide also called PASS drafts "approved copy" while their frontmatter said "not approved". Spot-checking cited line numbers alone would have missed all of them.

**How to apply:**
- Once the marked hypotheses are listed, grep the rest of the guide for the same idea stated as a rule (tables, checklists). In that review, judgment 1 showed up unmarked twice.
- Flag style rules that no source states, such as a spelling or punctuation rule inferred from absence, even when they seem harmless.
- When two proposals target the same file, check whether either one edits by line number. If so, an insert from the other shifts its lines, and the order they're applied in matters.
- Check that the guide's "order of authority" line and the pointer line name the same sources, and that they cover lint-copy and the relevant skill.
- Add up the score table before writing the verdict line.
- For a "leave this line" recommendation, check it against main-memory decisions and what other pending proposals will add. In T-20261103-10, "not a human decision" (product line 40) would contradict a "[told by ...]" tag that the solo-founders proposal adds to line 42.
- Compare self-reported lint counts with `ops/gate-log.jsonl` timestamps. A self-review edited after the last run is often off by one, because it quotes a marker itself.
- In r1 too, grep corrected words ("approved", "dated fact", "!") across the whole file, including text meant for another file (suggested CREDITS rows). In T-20261103-07 I missed "approved copy" in the CREDITS row until r2.

Related: [[revision-round-checks]], [[skill-survey-checks]].
