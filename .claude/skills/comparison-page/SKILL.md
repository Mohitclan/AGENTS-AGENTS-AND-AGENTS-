---
name: comparison-page
description: How to write a fair "<competitor> alternative" or "us vs <competitor>" page from dated competitor facts, and how to audit comparison claims already in our copy. Use for comparison and alternative pages and for checking any comparison claim.
---

# Comparison pages

Both draft; a person publishes.

Open with the outcome you'll measure. Run the keyword through seo-refresh (`.claude/skills/seo-refresh/SKILL.md`) first: a comparison keyword qualifies only if the buyer would really search it.

## Inputs, and when to stop

1. Facts about them come from `knowledge/competitors/<slug>.md`, facts about us from `knowledge/products/<slug>.md`. Only lines in a file whose frontmatter says `status: confirmed` may be stated as fact. If the frontmatter and the body disagree about status, use the frontmatter, mark each fact the body calls unconfirmed `[UNCONFIRMED]` in the draft, list the conflict as a handoff to `knowledge-base`, and carry on. Don't stop the task. This is the one exception to claim-check rule 2 (stop and flag). A line in the file calling the whole file unconfirmed covers every fact in it.
2. Each competitor fact needs the vendor's own page URL and a check date. Prices and plan limits older than ninety days are stale (fact-sourcing): re-read the vendor page with WebFetch and write the change as a proposal in `knowledge/proposals/`. Agents don't edit confirmed files.
3. No paid scraping or SEO-data tools; the vendor's own pricing, docs and changelog pages are enough. Review sites that block the fetch give no usable facts: list them under "Not found".
4. Signing up for a competitor's product is a person's job. Until a person has used it and written down what they saw, a missing feature is only "not listed on their <page> (as of <date>)". A cross or "not available" needs their own docs or a person's confirmation.

## Choose the page

Four shapes, picked by the keyword verdict: "<competitor> alternative" (a reader ready to switch), "<competitor> alternatives" (still researching; list only options with a sourced entry in our files, and don't pad to a number), "us vs <competitor>" (direct), and "<A> vs <B>" with us as a third option (needs sourced files on both; lowest priority).

## Build the table first

Write the matrix by hand from the competitor file before any prose: each product's own page, the source, the check date. A fact lives once, in the competitor file. Keep a "used on" list in the page plan so a corrected fact is fixed everywhere.

## Write the page

1. **Answer first:** two or three sentences on who each option suits, keyword inside the first 120 words.
2. **Then one paragraph per difference that matters to the buyer.** Keep three things apart: the fact (sourced, dated), what it means for the buyer (marked "our reading"), and the recommendation.
3. **Who should pick them** comes before who should pick us, drawn from the competitor file's "Strengths" and "Where <us> loses" lines. If the buyer is better off with them, say so (competitive-battlecard rule 5, in `.claude/skills/competitive-battlecard/SKILL.md`).
4. **Our limits** go in, in plain words, from the fact sheet. A page that hides them isn't fair.
5. **Prices** in each vendor's own currency, dated. No "cheaper than" unless both are in one currency at a dated rate (battlecard rule 4).
6. **Say what changed on their side, never why.** No guessed motives.
7. **Our "we win" notes are mostly hypotheses** (battlecard rule 3): not printed, and not hinted at with advice like "need X? use us". State what our product does from confirmed lines and let the reader compare.
8. No switcher quotes, logos or migration claims without a proof-library row (`.claude/skills/proof-library/SKILL.md`) or a fact-sheet line. Legal and trademark questions go to a person.

## Audit claims already live

For comparison claims in pages, battlecards and emails, table: claim, where, status, check date, source, fix.

- **Current:** true today, with source and date. No date, not Current.
- **Changed:** now wrong; give the current wording.
- **Unverifiable:** no current source; soften or remove.
- **Overclaimed:** stated as fact without support; rewrite or remove.

Fix public pages first, then sales assets, then internal notes. Report "X of Y claims current".

## Before hand-in

Run `node scripts/lint-copy.mjs <file> --type seo --keyword "<phrase>"`. It needs a shell: if you have none (marketing), ask `docs-handler` to run it and paste the last line, or list it as a handoff. Never promise a ranking or an AI-answer citation (seo-refresh). Suggest `developer` to build the page and `docs-handler` for a help-centre version.

## Sources

Adapted from `competitors` in https://github.com/coreyhaines31/marketingskills (MIT, Copyright (c) 2025 Corey Haines) and `competitor-alternatives` in https://github.com/alirezarezvani/claude-skills (MIT, Copyright (c) 2025 Alireza Rezvani). Taken: the four page shapes, one dated data file feeding every page, the claim-audit statuses, absence written as a dated observation, fact, interpretation and recommendation kept apart, saying what changed on their side and never why, "who should and shouldn't switch". Left out: both sources' scripts and any paid scraping.
