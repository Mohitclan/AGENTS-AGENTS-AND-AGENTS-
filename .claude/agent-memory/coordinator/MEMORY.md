# coordinator memory

What coordinator has learned. Claude Code loads the first 200 lines into every coordinator run.

- 2026-10-30 · Check any example claim in a brief against the fact sheet first. Specialists treat examples as cleared wording. (source: outputs/reviews/T-20261030-07-r1.md · by: coordinator)
- 2026-11-01 · Subagents can't cd or use git -C, so they inherit the session folder. cd into repos/<slug> before launching a developer or code review, and cd back before anyone needs node scripts or agent memory. (source: outputs/reviews/T-20261101-02-r1.md · by: coordinator)
- 2026-11-01 · Before a code task, check the clone has dependencies: npm ci and git fetch aren't on the allow list, so a code review can't reach 80 without a person's test run. Say so in the brief instead of spending revisions. (source: outputs/reviews/T-20261101-01-r2.md · by: coordinator)
- 2026-11-01 · When a request allows one review, the revision goes back unreviewed. Keep its leads new, say so plainly in the report, and don't add a second review on a specialist's suggestion. (source: J-20261101-04 brief and outputs/reviews/T-20261101-06-r1.md · by: coordinator)
- 2026-11-01 · In a multi-lead review, ask for a verdict per lead and whether the fixes change any test result. One failing lead then doesn't hold the others, and a passed lead can be qualified even when the batch is REVISE. If only wording changes after a PASS, say so in the report. Copy with no PASS keeps its lead qualified, not drafted. (source: outputs/reviews/T-20261101-06-r2.md · by: coordinator)
- 2026-11-01 · The leads status guard reads the whole command line, so decision-status words in a note or a chained list step block a legitimate set-status. Run set-status on its own with a plain note. (source: J-20261101-07 run · by: coordinator)
