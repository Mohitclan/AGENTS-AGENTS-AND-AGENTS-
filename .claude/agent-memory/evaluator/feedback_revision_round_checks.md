---
name: revision-round-checks
description: What to test on an r2 of a proposal or code-evidence file - repo branch drift, stale row references, universal claims resting on one example, uneven markers
metadata:
  type: feedback
---

On a revision round, go past "was each fix made" and test what the fix introduced.

**Why:** T-20261101-02 r2 had all fixes made, yet the new text held a stale row reference after reordering, a "no single control" claim tested on one hook out of three, and a warning on two of three alternative versions. The clone had also moved to another task's branch since r1.

**How to apply:**
- Read `repos/<slug>/.git/HEAD` first. If the branch changed since the last round, check that branch's diff against the cited lines. `git -C` is refused by the tool gate; `.git/HEAD` and the task's write-up work instead.
- For a "no X does Y" claim, grep every hook or route of that family, not only those the author names.
- When the author cites comments for a behaviour, open the function that enforces it. Words like "main" may be a variable (`defaultBranch`).
- When a marker or warning is applied to several parallel items, check each item has it.
- Check cross-references like "row 4" against the current numbering.
- Run scripts as single commands with relative paths. Chained commands and absolute script paths are refused, but `node scripts/...` alone works.
- If the author queries a quote from your last review, re-open it and correct your own review in writing. In T-20261101-03 r3 my r2 had called a mid-post line the post's opening.
- Check that "agent checks are done" agrees with the file's own "not checked" list, even when your fix supplied that wording.

Related: [[feedback_sales_asset_checks]], [[feedback_search_summary_claims]]
