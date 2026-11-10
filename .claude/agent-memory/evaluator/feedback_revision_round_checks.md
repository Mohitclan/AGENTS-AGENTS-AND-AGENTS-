---
name: revision-round-checks
description: What to test on an r2 - repo branch drift, stale row references, universal claims on one example, uneven markers, full-text rewrites, live lead record vs corrected inbox file
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
- Test the coordinator's description of the revision against the file. In T-20261103-01 r2 the brief said a quote was "kept, labelled", but the file had dropped it. Judge what is in the file, and say where the brief is wrong.
- Grep the whole file for leftovers of a corrected claim, such as summary lines or "same gap" phrases. Fixed rows often leave a stale echo elsewhere.
- Check that "agent checks are done" agrees with the file's own "not checked" list, even when your fix supplied that wording.

- Test every new "do not X" human check against CLAUDE.md hard rules, even when the brief dictated it. In T-20261103-09a r2 "do not record a LinkedIn opt-out by URL" had no fallback and pulled against hard rule 7 ("suppress at once"). Also check that the file's own RESULT block doesn't say `questions: none` over open questions in the body.

- When a tool list will drive a permissions change, curl the docs page's raw HTML and grep each tool's description; don't trust a fetch summary. Then check that the allow-list doesn't block a tool the docs say to call first (HubSpot's `tool_guidance` before `query_crm_data`, T-20261103-02 r2). Also check that the configured endpoint matches the documented one, because tool sets can differ.

- Write rewrites as full replacement text, never "...": in T-20261106-01 r2 my R5 shortened a `next_action` opening to "...", and the author kept a stale opening that re-asked questions r1 had settled.
- When an author says my quote isn't on the page, fetch "every sentence containing <keyword>" before ruling: the SafetyClip page held both wordings in different sections.
- Lead fixes arrive as a corrected inbox file plus later coordinator `next`/`hold`/status commands. Judge the live record (`leads.mjs show`) and its `history` order, and flag any stale field left in the inbox file, because re-importing it overwrites the live one.
- Before accepting "Stop only because of a hold", read `gateOf` and its CRITICAL_SIGNALS list to confirm the hold is the sole Stop source.
- Redaction rounds: grep the surname and town (not first names) across the whole repo, ops/runs logs included, and test the author's "files still holding it" list. In T-20261106-04 r2 two listed files named a different maker who shared two first names, and two run logs were missed. Before writing "this review records neither X", grep my own review: r1 quoted the age in a fix row and a rewrite "Now:" line.
- When a stock sentence replaces a removed one (e.g. the read-only line under the no-AI-vendor rule), read the sentence before it: in T-20261110-16 the new line repeated the previous sentence's "never writes" clause. Untracked drafts have no diff, so check against the earlier review's line references and say the diff couldn't be proved.

Related: [[feedback_sales_asset_checks]], [[feedback_search_summary_claims]], [[feedback_lead_batch_checks]]
