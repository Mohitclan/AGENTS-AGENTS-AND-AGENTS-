---
status: proposed
task: T-20261103-10
product: motionrepo
date: 2026-11-03
targets:
  - knowledge/products/motionrepo.md
  - knowledge/competitors/motionrepo.md
---

# Proposal: remove stale "proposed" and "not confirmed" lines from two confirmed MotionRepo files

Both target files say `status: confirmed` in their frontmatter (`knowledge/products/motionrepo.md:2`, `knowledge/competitors/motionrepo.md:2`), and `node scripts/kb.mjs status` lists both as confirmed, verified 2026-10-30. Their bodies still carry status text from before a person confirmed them. Under CLAUDE.md, status lives in the frontmatter, so these lines are stale. They make the files disagree with themselves, and the draft `comparison-page` skill stops on that disagreement (review `outputs/reviews/T-20261103-05-r1.md`, point 6(a), lines 150-151). Both files are confirmed, so agents can't edit them. A person applies the changes below, then re-confirms each file with `node scripts/kb.mjs confirm <file>`.

This proposal changes status wording only. It adds no facts and changes no claim.

## Order of application

Match each line by its text, not its number. Five other proposals are pending in `knowledge/proposals/`. Only two touch these files.

| Proposal | Touches | Overlap with this one |
|---|---|---|
| `2026-11-01-motionrepo-one-run-positioning.md` | product lines 144 and 152; competitor lines 49, 98 and 101 | Competitor line 49 only. Its row 3 replaces the whole line, and both of its proposed versions end with `[UNCONFIRMED].`. |
| `2026-11-01-motionrepo-solo-founders.md` | product lines 42 and 45 | None. It does not touch lines 20, 142 or 190. |
| `2026-11-01-company-details.md`, `2026-11-02-company-details-filled.md`, `2026-11-03-brand-voice.md` | `knowledge/company.md` and a new `brand-voice.md` | None. They don't edit either MotionRepo file. |

Every change in the one-run and solo-founders proposals replaces a single line with a single line, so no line numbers shift whichever order you apply them in. Matching by text is still safer.

Recommended order:

1. Apply `2026-11-01-motionrepo-one-run-positioning.md` first. Its row 3 pastes a whole replacement for competitor line 49. Applying this proposal's competitor line 49 note first, if you chose to act on it, would be overwritten.
2. Apply `2026-11-01-motionrepo-solo-founders.md` in either position. It is independent of this one.
3. Apply this proposal. Its rows 1 to 5 sit on lines none of the others edit, so they can go in any order.
4. Re-confirm each file once, after all edits to it are in: `node scripts/kb.mjs confirm knowledge/products/motionrepo.md` and `node scripts/kb.mjs confirm knowledge/competitors/motionrepo.md`. Confirming resets the verified date and vouches for the whole file, so read the other applied changes before confirming.

If you apply this proposal before the one-run proposal, rows 1 to 5 still work. Only the optional note on competitor line 49 (below) depends on the order.

## Changes

Words removed are in the Current column. The Proposed column is the full replacement text.

### 1. knowledge/products/motionrepo.md, line 20 (opening block)

- **Current:** `All of this file is `proposed` (agent draft, not human-reviewed). Website content was read 2026-10-30. Repo paths are relative to the project root.`
- **Proposed:** `Website content was read 2026-10-30. Repo paths are relative to the project root.`
- **Why:** removes the status claim that contradicts line 2. The two sentences that stay are about sources, not status.

### 2. knowledge/products/motionrepo.md, line 142 (section "Competitors", opening paragraph)

- **Current:** `Researched 2026-10-30 in task T-20261030-02 (reviewed 94/100). All `proposed`, from vendor pages read through a summarising tool; re-read before using in anything a customer sees. Dated prices and sources are in `knowledge/competitors/motionrepo.md` and go stale after 90 days. Prices are in each vendor's currency, not converted to INR (no dated exchange rate), so make no "cheaper than X" claim.`
- **Proposed:** `Researched 2026-10-30 in task T-20261030-02 (reviewed 94/100). Built from vendor pages read through a summarising tool; re-read before using in anything a customer sees. Dated prices and sources are in `knowledge/competitors/motionrepo.md` and go stale after 90 days. Prices are in each vendor's currency, not converted to INR (no dated exchange rate), so make no "cheaper than X" claim.`
- **Why:** "All `proposed`" is the stale status claim. The real caveat in the same sentence (vendor pages were read through a summarising tool; re-read before customer use) stays. "Built from" replaces "All `proposed`," only so the sentence still reads; it adds no claim. The "(hypothesis, medium)" labels on individual competitor claims further down are unchanged, so removing "All `proposed`" does not turn any hypothesis into a fact.

### 3. knowledge/products/motionrepo.md, line 190 (section "Open questions", Q10 bullet)

- **Current:** `- Q10, competitors: see Competitors. [knowledge/competitors/motionrepo.md (proposed)]`
- **Proposed:** `- Q10, competitors: see Competitors. [knowledge/competitors/motionrepo.md]`
- **Why:** the bracket labels the competitor file `proposed`, but its frontmatter says `confirmed`.

### 4. knowledge/competitors/motionrepo.md, line 17 (opening paragraph)

- **Current:** `Task T-20261030-02, answers fact-sheet Q10. All prices were read from the vendor's own page on **2026-10-30** and are quoted in the vendor's currency. I did not convert to INR (no dated exchange rate). Re-check before quoting: prices older than 90 days are stale (`.claude/skills/fact-sourcing`). Our own product facts are [UNCONFIRMED] (from `knowledge/products/motionrepo.md`, proposed). Pages were read through a summarising fetch tool, so exact wording should be re-read before it is used in anything customer-facing.`
- **Proposed:** `Task T-20261030-02, answers fact-sheet Q10. All prices were read from the vendor's own page on **2026-10-30** and are quoted in the vendor's currency. I did not convert to INR (no dated exchange rate). Re-check before quoting: prices older than 90 days are stale (`.claude/skills/fact-sourcing`). Pages were read through a summarising fetch tool, so exact wording should be re-read before it is used in anything customer-facing.`
- **Why:** the removed sentence ("Our own product facts are [UNCONFIRMED] (from `knowledge/products/motionrepo.md`, proposed).") is the status claim; the product file is confirmed. **The last sentence stays word for word.** It is a real limit on how the competitor wording can be used, not status text (review point 6(a), first sub-bullet). The sentence "I did not convert to INR" and the 90-day rule also stay.

### 5. knowledge/competitors/motionrepo.md, line 19 (MotionRepo reference)

- **Current:** `MotionRepo reference (for comparison): Starter ₹3,199 a month (15 credits, 1 seat, 5 repos), Pro ₹13,199 a month (50 credits, 5 seats, 25 repos), both plus 18% GST, paid by invoice; 14-day free trial, 6 credits, no card [https://motionrepo.panscience.ai/pricing, 2026-10-30]. Not yet confirmed by a human.`
- **Proposed:** `MotionRepo reference (for comparison): Starter ₹3,199 a month (15 credits, 1 seat, 5 repos), Pro ₹13,199 a month (50 credits, 5 seats, 25 repos), both plus 18% GST, paid by invoice; 14-day free trial, 6 credits, no card [https://motionrepo.panscience.ai/pricing, 2026-10-30].`
- **Why:** the removed sentence is the stale status claim. The figures, source and date are unchanged.

## Other stale or status-like text found

I searched both files (case-insensitive) for `proposed`, `UNCONFIRMED`, `not yet confirmed`, `not confirmed`, `unconfirmed`, `human`, `review`, `draft`, `status`, `pending`, `decided` and `override`. Every hit is listed here, either in rows 1 to 5 above or below with a recommendation.

| File and line | Text | Recommendation |
|---|---|---|
| Product line 142 | "All `proposed`" | Fixed in row 2. Was named on the board. |
| Product line 190 | "(proposed)" | Fixed in row 3. Was named on the board. |
| Competitor line 49 | trailing `[UNCONFIRMED]` | **Leave as it is in this proposal.** See the note below. Was named on the board. |
| Product line 21 | "Items marked "decided for shivam-G05 on 2026-10-30" were decided by Claude ... The founders can override any of them." | Leave. It labels how a set of answers was reached, not the file's status. It is accurate whatever the status. Question 1 below asks whether the 2026-10-30 confirmation was meant to cover those items. |
| Product lines 24, 29, 96, 97, 98, 103, 110, 118, 123, 124, 126, 127, 139, 155, 156, 157, 169, 173, 174, 177, 178, 191 (every line other than 21 that carries the text; `grep -n "decided for"`) | `[decided for shivam-G05 on 2026-10-30 ...]` tags | Leave. Provenance labels, not status claims. |
| Product line 40 | "Researched hypothesis ... not a human decision and not tested with buyers." | **Not decided here; question 4 for the human.** "Not tested with buyers" still holds. "Not a human decision" may no longer hold: main memory records shivam-G05's segment 1 decisions on 2026-10-30 and 2026-11-01, and the pending solo-founders proposal adds "[told by shivam-G05 on 2026-11-01]" to product line 42. Once that proposal is applied, lines 40 and 42 would contradict each other inside one section. |
| Product lines 68, 150 and competitor line 95 | "Not established"; "not yet tested by me" | Leave. Gaps in evidence, not status. |
| Product line 166 | "Answers need human approval." | Leave. A rule about objection answers. |
| Competitor lines 27, 45, 47, 48, 50, 79, 84, 111 | "unverified", "confirmed on its FAQ", "Leads to verify" | Leave. These describe how well a competitor's claims were verified, not our files' status. Line 111 is a dated change-log entry. |
| Product line 75 | "Status" (column header of the Features table) | Leave. An ordinary column name, not a claim about the file's status. |
| Product line 184 | "For the human, raised by the research in T-20261030-02:" | Leave. A lead-in to a list of questions, not status. |
| Competitor line 54 | "**Reviews:** none found" | Leave. Says no reviews were found for a competitor; not about our files. |
| Competitor line 85 | "a human-looking speaker" | Leave. Describes a competitor's video style. |
| Competitor line 93 | the word "review" in a Canva price entry (a dated third-party review, `knowledge/competitors/motionrepo.md:93`) | Leave. Names a third-party source for a price, not status. |
| Competitor line 94 | "the lead-generator or a human should ask a few founders what they paid" | Leave. A suggested next step for a price gap, not status. |
| Competitor line 105 | "Review-site content from G2, Capterra, GetApp and Reddit was blocked" | Leave. A data gap about review sites. |
| Competitor line 49 vs. any other `[UNCONFIRMED]` | Only two lines in the competitor file carry the marker (17 and 49). The product file has none. | Nothing else to remove. |

### Note on competitor line 49

Line 49 ends `1080p without a watermark on its first paid plan [UNCONFIRMED].` The marker is not only stale status text:

- The bullet also says "INR price with a GST invoice for Indian buyers". The product file has "+ 18% GST" (line 103) and "Payment: by invoice today" (line 124), but no source I found for a "GST invoice". A lesson in main memory (2026-10-30) says that joining those two facts makes a new, unsourced claim. The board already holds this as an open item: `ops/board.md` line 65 names competitor line 49 and product lines 42, 144 and 152 and competitor line 99 together, "once the human answers the GST invoice question".
- Choosing A, B or C for line 49 does not settle the join elsewhere. Competitor line 99 ("A rupee price with a GST invoice is a real difference for Indian companies. (medium)") and product lines 42, 144 and 152 carry the same unsourced "GST invoice" join with no `[UNCONFIRMED]` marker, only a hypothesis label. Row 4 also removes the line 17 sentence that marked "our own product facts" `[UNCONFIRMED]`, which used to cover line 99 as a blanket marker. After row 4, line 99 carries the join with only its "(medium)" label. That stays with the board item (`ops/board.md` line 65).
- The "1080p, no watermark" clause is supported by confirmed product line 108 ("1080p, no watermark" for Starter). So the marker may be needed for only part of the sentence.

Options for the person (I have not chosen):

- **A. Leave line 49 as is** until the GST invoice question is answered. This is the default in this proposal.
- **B. Remove the marker** if the GST invoice question is settled in favour of the claim. The text then ends `...on its first paid plan.`
- **C. Move the marker** to the part that is unsupported: `INR price with a GST invoice for Indian buyers [UNCONFIRMED]; 1080p without a watermark on its first paid plan.`

If you choose B or C, apply the one-run proposal's row 3 first (see Order of application), then edit the line by text.

## What this proposal does not change

- No new facts, prices, claims or sources. Every removed phrase is a status claim; every kept phrase was in the file already, except the connecting word "Built" in row 2.
- The one-run, scoping, solo-founders and "GST invoice" questions. They stay in their own proposals.
- The "(hypothesis, medium)" labels, `[NEEDS APPROVAL]` markers and `[decided for ...]` tags.

## Evidence

- Frontmatter status: `knowledge/products/motionrepo.md:2`, `knowledge/competitors/motionrepo.md:2`; `node scripts/kb.mjs status` on 2026-11-03 (both confirmed, verified 2026-10-30).
- Reviews that raised it: `outputs/reviews/T-20261103-05-r1.md` lines 150-151; also `outputs/reviews/T-20261030-03-r1.md` lines 76-80 (names product lines 20 and 142 and competitor lines 17 and 19), `outputs/reviews/T-20261101-02-r1.md` line 91 and `outputs/reviews/T-20261101-09-r2.md` line 184 (seen as search hits for product line 20; not read in full).
- Board item: `ops/board.md` line 65.
- Both files were added in one commit, 127a94d, "Add MotionRepo: confirmed fact sheet, competitor file and market research" (`git log`).

## Why it matters

The draft `comparison-page` skill stops when a file's frontmatter and body disagree on status, so until these lines are fixed every MotionRepo comparison would be blocked. The same disagreement is already in the `directory-listing` and `landing-page-audit` drafts' scope (review point 5), and it makes agents unsure whether to mark MotionRepo facts `[UNCONFIRMED]` in customer-facing copy.

## Questions for the human

1. Did your 2026-10-30 confirmation cover the items decided by Claude for shivam-G05 (product line 21), or should any of them be re-checked? This proposal leaves line 21 as it is.
2. Competitor line 49: option A, B or C above?
3. Re-confirm the files after applying? Doing so resets `last_verified` to the confirmation date for the whole file.
4. Product line 40 says the ICP is "not a human decision and not tested with buyers". Main memory records your segment 1 decisions on 2026-10-30 and 2026-11-01, and the solo-founders proposal adds "[told by shivam-G05 on 2026-11-01]" to line 42. Once that proposal is applied, lines 40 and 42 would contradict each other. Should line 40 keep "not a human decision", or be reworded? This proposal does not change line 40.

## Self-review

- 1. Re-read the brief: pass. Items 1 to 6 are all here (rows 1 to 5; competitor line 17 caveat kept in row 4; order of application section; "Other stale status text" table; "What this proposal does not change"; this section). Only this file was written.
- 2. Counts match the body: pass. "Five other proposals" are the five files other than `README.md` in `knowledge/proposals/` (`ls` showed 5 plus the README, matching `kb.mjs status` "5 pending"); I excluded this one. "Only two touch these files": one-run and solo-founders (target lists read). Five change rows, numbered 1 to 5.
- 3. One answer per question: pass. Line 49 appears in the one-run proposal (row 3, kept `[UNCONFIRMED]`) and here (left as is by default); the two don't conflict. The board's line 65 grouping is cited.
- 4. Quotes exact: pass. A script took each Current string from rows 1 to 5 and compared it with the target file's line at the stated number: 5 of 5 identical. Another check found no `proposed`, `UNCONFIRMED` or `Not yet confirmed` text in any of the five Proposed strings. `grep -n "decided for"` was used to correct my first list of provenance-tag lines (fixed: lines 25, 26, 125, 175 and 176 do not carry the tag and were removed from the list; 21, 110 and 157 were added).
- 5. Claim against the lessons in main memory: fixed. I first drafted line 49 as stale status text to remove. Reading the product file for "GST invoice" (grep for "invoice" found no source for the joined claim) and the 2026-10-30 lesson changed it to "leave, with options".
- Automatic checks: `node scripts/check-links.mjs` returned "1 link(s): 0 ok, 0 restricted, 0 broken, 1 unreachable" (https://motionrepo.panscience.ai/pricing timed out from here; it is cited only as the source inside quoted competitor line 19). `node scripts/lint-copy.mjs ... --type general` was re-run after the post-r1 fixes and its last line is: `knowledge/proposals/2026-11-03-motionrepo-stale-status-lines.md (general): 0 failed, 12 warning(s).` (the r1 review counted 11 before these fixes added a note and a question). The warnings are the open-marker warnings for the two markers `[UNCONFIRMED]` and `[NEEDS APPROVAL]` that appear inside quoted file text, in option descriptions and in this section, which are quotations, not open gaps.
- Post-review edit: the six wording fixes from `outputs/reviews/T-20261103-10-r1.md` (seven hits listed, exact quote of product line 124, product line 40 moved to question 4, the "GST invoice" note on competitor line 99 and product lines 42, 144 and 152, this count, the "Built" exception) were made after the r1 PASS, in task T-20261103-10.
- Items 5 to 8, 10 to 18 of the skill: n/a (not customer copy, not research, not code).
