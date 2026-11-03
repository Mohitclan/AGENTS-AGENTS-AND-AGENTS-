# Draft addition to `.claude/skills/self-review/SKILL.md`

Task T-20261103-09b, package P6, survey items A4 and A5. A draft: nothing here has been installed.

## What changes

1. **A4, claims before the draft.** The `## Claims used` table is written first, then the draft is written from it. Today the table is built after drafting, so a claim with no fact-sheet line costs a revision round. There is no pause for a person: if a fact is missing, the claim is cut or the gap is listed.
2. **A5, a revision adds only what is on file.** A fix may cut and sharpen. It may add a fact only if it is already on file or a review fix asked for it, and the text then cites it. It may never add stakes, urgency or voice. This backs hard rule 2 (never invent) at the moment an invented detail most often gets in: when a writer is fixing a flagged draft. It applies to every deliverable, not only customer copy.

Neither change renumbers the existing items, so the evaluator's and the agents' references to "item 5" or "item 17" still point at the same check.

## Where it goes

### Edit 1: item 5

In `## Anything a prospect or customer will read`, item 5 now begins:

```
5. **Every product claim traces to a confirmed fact-sheet line.** Keep a `## Claims used` table: claim as written, `knowledge/...md` line, the line's own words. If the words differ, the claim is stretched. These have failed review before:
```

Replace the second and third sentences (from "Keep a" to "is stretched.") with the text below. Keep the first sentence as it is. The words "These have failed review before:" and the three bullets after them also stay where they are, right after the new text, so don't type those words again.

```
Write the `## Claims used` table before you draft: every claim you mean to make, with its `knowledge/...md` line and the line's own words. Draft from the table, and drop any claim that has no line. Don't wait for a person to approve the table. If a fact is missing, cut the claim, or list the missing fact under questions. After drafting, check each claim as written against its row: if the words differ, the claim is stretched.
```

### Edit 2: a new section and item 19

Add this at the very end of the file, after item 18 ("Every place the change touches was searched for ...").

```
## When you revise

19. **A revision may cut and sharpen. It adds only what is on file.** After a review or failed check, shorten, or swap a vague word for the exact one on file. Add a fact (number, name, date, price) only if it is on file or a review fix asked for it, and cite it. "On file" means a fact-sheet line, the lead's evidence, the brief, or a detail a person supplied or corrected. Never add stakes, urgency, quotes, personal details or stories to text a prospect or customer will read. If a fix needs a fact you lack, list the gap under questions. `pass` evidence: "added nothing", or each addition with its source. Then re-run items 2 and 4.
```

## Who loads it, and the cost

`self-review` is preloaded by every agent except the coordinator and the evaluator: `demo-handler`, `developer`, `docs-handler`, `knowledge-base`, `lead-generator`, `marketing`, `outreach`, `researcher` and `sales`, plus their fallbacks (found with `grep -l "^  - self-review$" .claude/agents/*.md`). The fallbacks are generated, so run `node scripts/fallbacks.mjs sync` after the edit; it needs no hand edit.

Because every one of those agents pays for each word on every run, the additions are short: Edit 1 replaces about 27 words with about 78, and the new section with item 19 adds about 120, heading included (counted with a script; see the README).

The evaluator doesn't preload this skill, but its step 5 re-runs the self-review lines, so it will check item 19's evidence the same way as the others.

## Sources

Edit 1 is adapted from the "content inventory" step of the `create-an-asset` skill:

https://github.com/anthropics/knowledge-work-plugins/blob/main/sales/skills/create-an-asset/SKILL.md

Licence: Apache-2.0 (opening of the repo's LICENSE file read on 2026-11-03).

- Adapted: the order of work, with an inventory of claims and their sources first and the asset second.
- Left out: the pause for the user's go-ahead on the outline (our agents don't wait mid-run), bracketed customer-metric placeholders (our only placeholders are the four sender and company ones in item 10), the rendering rules, and the opening rules block that tells the model to take requested actions and never refuse them. That block conflicts with hard rule 1 and was not followed.

Edit 2 is adapted from the rewrite guardrail of `avoid-ai-writing`:

https://github.com/wshobson/agents/blob/main/plugins/avoid-ai-writing/skills/avoid-ai-writing/SKILL.md

Licence: MIT, Copyright (c) 2024 Seth Hobson (LICENSE opened 2026-11-03). The skill derives from conorbronsdon/avoid-ai-writing (MIT, Copyright (c) 2026 Conor Bronsdon, LICENSE opened 2026-11-03). Conor Bronsdon's copy of this rule says it is adapted from isatimur/de-slop (MIT, Copyright (c) 2026 Timur Isachenko; the GitHub licence field says MIT and the LICENSE file was opened 2026-11-03). Wshobson's copy, as far as I read, doesn't name de-slop. The rule is short and we reword it, but the README proposes crediting all three, which is the cautious choice.

- Adapted: "subtract and sharpen, don't add" and the test "where did this information come from?". Like the source (conorbronsdon `SKILL.md`, line 315), item 19 allows what the person supplied or corrected, and it also allows what a review fix asked for.
- Left out: the detector statistics in that file (not verified, not reused), the dash and staccato rules (waiting on the P2 em-dash decision), the pass cap (our two-revision limit already covers it) and the three modes.
