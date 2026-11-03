# Draft addition to `.claude/skills/cold-email/SKILL.md`: links on their own line

Task T-20261103-09b, package P6, coordinator assumption 7 and the copy-check finding from P2. A draft: nothing here has been installed.

## The problem

All four current outreach drafts end a link with a full stop. A mail program can treat that stop as part of the web address and send the reader to a page that doesn't exist. `scripts/check-links.mjs` can't see this, because it strips trailing `.,;:!?*_` from a link before it tests it (line 25), so it reports the link as fine.

Lines in the four drafts where a link is followed by a full stop (found with a grep for a web address followed by punctuation, outside tables, on 2026-11-03):

| Draft | Lines |
|---|---|
| `outputs/outreach/L-4ad62a74.md` | 99, 114 |
| `outputs/outreach/L-4d574242.md` | 69, 86, 103, 105, 122 |
| `outputs/outreach/L-75e81825.md` | 73, 90, 107, 109, 126, 143 |
| `outputs/outreach/L-ab940a31.md` | 100, 115 |

That is 15 lines: 13 in emails (in 11 emails) and 2 in LinkedIn messages (`L-4d574242.md` line 122 and `L-75e81825.md` line 143). The `contact:` header line in each draft (line 9 or 10) and line 17 of `L-4d574242.md` also put a bracket or comma after a link, but they are notes for the reviewer, not email text, and they are never sent. The drafts are not edited here. Following shortlist assumption 19 (`outputs/reports/2026-11-03-gtm-adoption-shortlist.md`), the 15 lines are fixed before any of those emails is sent, as a condition on the send approvals. `outreach` makes the fixes in one pass over the four files, when the coordinator asks.

## Where it goes

In `## Shape of a first email`, add a paragraph after this line:

```
Under 120 words. Read it aloud; if a sentence sounds like an ad, cut it.
```

## Text to insert

---

**Links.** Put each link on its own line with nothing after it: no full stop, comma, bracket or quotation mark. Punctuation stuck to a link can become part of it and break it. The line before says what the link is and ends with a colon, for example "Your sample is here:". If the ask is the link, that line is the ask. This holds for every message you draft with this skill, including follow-ups, replies and LinkedIn messages. Use only links from the fact sheet or the lead's evidence. A link in the signature sits on its own line too.

---

## Who loads it, and the cost

`cold-email` is preloaded by `marketing`, `outreach` and `sales` (and their fallbacks). The paragraph is about 100 words. No step needs a shell.

## Checks that go with it

- `scripts/lint-copy.mjs` on `main` has no check for this yet. The check is built as `url-punctuation` (under `--type email` only) on the branch `agent/T-20261103-04` (r1 PASS, pre-merge fixes done, r2 review running, not merged). Its warning accepts "a space or a line break after the URL", which is looser than this paragraph's "nothing after it" on the same line. The skill is the stricter rule. Keep the handoff to `developer` so the check's message matches it.
- Until then, the author checks by searching the draft for a web address followed by punctuation. This draft and the README apply the same rule to their own links.

## Sources

Adapted from the quality bar of `multichannel-campaign-builder`:

https://github.com/LaGrowthMachine/gtm-system/blob/main/skills/get-qualified-meetings/multichannel-campaign-builder/SKILL.md

Licence: MIT, Copyright (c) 2026 LaGrowthMachine (LICENSE opened 2026-11-03).

- Adapted: the single rule "no punctuation stuck to a link, because it breaks link detection" (line 69 of the file, read raw on 2026-11-03).
- Left out: the rest of the quality bar (call-to-action order, subject rules, the ban on dashes), which belongs to package P2 and, for dashes, to the founders' decision on style. Also left out: the skill's sign-up links with tracking parameters and its prompt to mention the vendor, which steer toward the author's product.
