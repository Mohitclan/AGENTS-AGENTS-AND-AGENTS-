# Marketing memory

- No shell in this agent: ask docs-handler (can_ask) to run `lint-copy.mjs` and `check-links.mjs` and paste raw output. Write the file first, request all checks in one call.
- `lint-copy --type general` fails a line that has a metric word (sign-ups, users, reviews, teams) plus a digit with a unit (%, days, hours) and no source marker within two lines. Write numbers as words in skills and plans.
- Knowledge files can say `status: confirmed` in frontmatter while the body still says "proposed" (seen in motionrepo product and competitor files, 2026-11-03). Flag it, pick neither.
- New skills should stay within 29 to 64 lines like the existing 20; a first draft of 70 lines needed trimming.
