# Draft addition to `.claude/skills/objection-handling/SKILL.md`

Task T-20261103-06, package P5, survey part B row 13. Revision 1. A draft: nothing here has been installed.

## Where it goes

Two edits to `.claude/skills/objection-handling/SKILL.md`, both inside the existing `## Objection register` section, which sits between `## Common objections` and `## Never`.

**Edit 1.** Add these two bullets to the end of the register's bullet list, after "Count again later to see whether the fix worked.":

```
- Log the date a person sent our answer. A draft that wasn't sent is not an answer.
- Mark auto-replies and bounces as events. Never delete a logged line, so counts don't shift.
```

**Edit 2.** Insert the new section below, after the register's bullet list and before `## Never`:

---

## Did the answer work?

A script counts; you label and write. Never work out a rate yourself. Recovery rate: not enough data, no counting script yet (package P4, T-20261103-08). Don't estimate. Log a second objection as its own register line.

**Smokescreen check.** Before answering, mark each yes, no or unknown:

- `pre_information`: it came in their first reply, before they learned anything real.
- `no_specifics`: it names no figure, tool, date or constraint.

Both yes: skip the full answer. Send one calm question that makes it easy to say "this isn't for us", such as whether the hold-up is timing or the product. If they take it, close politely and mark the lead `lost` with their words.

After 7 days of silence, mark `immediate_drop`: our five-step answer used confirmed facts (sales judges; unknown if in doubt) and they went quiet anyway. It adds no message; the next note is the single one in `stalled-deal`. Never show the flag to a buyer.

---

## Sources

- La Growth Machine, `gtm-system`, skill `objection-analyzer`: https://github.com/LaGrowthMachine/gtm-system/blob/main/skills/catch-opportunities/objection-analyzer/SKILL.md (seen 2026-11-03). Recovery and the minimum sample: lines 240-244; "never compute the numbers yourself": lines 53-56; smokescreen: lines 204-208; marking events instead of deleting them: lines 134-141.
- The marker definitions are in the same skill's `references/coaching-rubric.md`, lines 48-56: https://github.com/LaGrowthMachine/gtm-system/blob/main/skills/catch-opportunities/objection-analyzer/references/coaching-rubric.md (seen 2026-11-03).
- The counting rules (7-day wait, minimum sample of 5, which replies do not count): `scripts/analyze.py` lines 21-31, 50-51 and 60 in the same folder (seen 2026-11-03). Read for the rules only; none of its code is used.
- Licence: MIT, Copyright (c) 2026 LaGrowthMachine (https://github.com/LaGrowthMachine/gtm-system/blob/main/LICENSE). The wording above is ours; see the README for the result of the shared-phrase check. The marker names are the source's identifiers, kept so a counting script can match them.

## What was adapted, and what was not

- **Adapted:** the 7-day wait with a pending state; the three markers; the rule that a script counts; marking events and never deleting lines.
- **Changed:** "answered" means a person sent our draft, because we only draft. The source defines `immediate_drop` with a 22-of-27 reply score from a nine-part rubric; we have not adopted that rubric, so ours says our answer followed the five steps and sales judges. Before our answer only two markers can be known, so the flag needs both; the source's two-of-three rule is not used. The source treats a real objection with "dig then reframe"; we use our own five steps, which already ask before answering.
- **Not adopted:** the nine-part reply score and the 22-or-more "clone this" example cut-off; the copy, targeting or product verdicts; the source's habit of printing estimated numbers without its engine (we print "not enough data"); its Python engine, its home-folder playbook and the La Growth Machine connector.
- **Moved out of the skill:** the full recovery-rate definition, its minimum sample and the reply-label mapping. They are a brief for package P4 (T-20261103-08) in the README, not skill text.
