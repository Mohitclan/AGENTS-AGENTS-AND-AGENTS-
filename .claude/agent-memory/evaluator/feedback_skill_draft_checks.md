---
name: skill-draft-checks
description: How to review drafted skills or skill sections before install - loader tools and preloads, rules inherited from the host skill, ID-vs-address conflicts, six-word overlap script
metadata:
  type: feedback
---

For a drafted skill or a section inserted into an existing skill, test every instruction against each agent that would load it, not just the author.

**Why:** in T-20261103-05 the nurture section for `cold-email` read well alone but failed in its host. It said "Compliance applies", and the host's Compliance needs a published business contact, which no sign-up has. It also said "you can't run it" to outreach and sales, who have Bash. And it kept only an ID, then asked for a suppression check that keys on email or domain.

**How to apply:**
- List each loader's `tools:` and `skills:` (awk the agent files). Flag shell-only steps (lint-copy, leads.mjs) and cross-skill references the loader doesn't preload.
- Read the host skill's sections that the new text says "apply to it", and test each one against the new audience.
- Check that the data the skill lets an agent hold (an ID, a domain) is enough for every check it asks that agent to run.
- To test for pasted text, download the raw sources and compare 6-word runs (the ngram script in the scratchpad works).
- Check each "Taken" credit against the text the draft actually carries, not only against the source.
- Include fallbacks in the loader list: marketing-fallback has no Agent tool, so "ask docs-handler" or "hand it to an agent" can't apply to it (T-20261103-05 r2).
- When an ID-vs-address fix lands, test every lookup in the section, not just the one flagged: `leads.jsonl` keys on contact/domain too. Also flag "only X sees it" lines that the earlier steps already break.

- When a draft says "do X" and the host skill turns X into a status change (Retire = mark `lost`), run that change through the `leads.mjs` transition table after any earlier script step: `suppress` already sets `disqualified`, which can't go to `lost` (T-20261103-06 r2).
- A word-count target in a fix list must allow for the words the other fixes ask the author to add, or the r2 will be "over target" because of my own fixes. When I tell the author to merge bullets into N themes, list every bullet's job, or one gets dropped (the "contact left" case, T-20261103-06).
- A "remove before sending" rule for one internal part (the approver box) needs the same rule for every other internal part in the file (the claims table).

- Read `tools:` from the agent files, not the runtime agent listing: the listing shows Edit on primaries whose files lack it, and fallbacks (outreach-, sales-) have no Edit at all. "Add rows with Edit" and "search the site" (outreach has no WebFetch) failed this way in T-20261103-09b.
- Test any "never add" or "only cut" revision rule against what REVISE fixes actually ask for (add a source, a date, an `[UNCONFIRMED]` mark, a newly verified fact). If the rule is absolute, it contradicts the review loop for every loader that does research or code.
- For a change to the evaluator's own instructions, check that every new section leaves the rubric's ESCALATE and auto-fail paths in force, and that suggested rewrites can't bring unconfirmed facts into customer copy.
- Authors paste my fix wording verbatim, so test it before writing it: any place I name must exist as a file or path (the "proof library" is a skill, not a store), a line range I cite must be grepped across the whole file (brand-voice cited `cold-email` at 7 lines, I gave 2), and a scope word must be the host's own ("reader-facing" vs "a prospect or customer will read"). Three of the r2 residuals in T-20261103-09b were mine.
- "Append with Bash `>>`" works under acceptEdits (run log shows `cat >> ... <<'EOF'` accepted by config); a table row needs a quoted heredoc, because unquoted `|` pipes.

Related: [[skill-survey-checks]], [[revision-round-checks]].
