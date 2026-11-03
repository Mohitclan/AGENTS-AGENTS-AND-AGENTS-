# P5 sales skill drafts

Task T-20261103-06, revision 1. Three drafts, written by `sales` on 2026-11-03. **Nothing here is installed.** `.claude/skills/` was not touched (`git status --short .claude/skills` prints nothing). The coordinator installs after the human's yes.

| File | What it is |
|---|---|
| `proposal/SKILL.md` | A new skill, ready to copy to `.claude/skills/proposal/SKILL.md` |
| `objection-handling-addition.md` | Two edits for `objection-handling`, with exact placement |
| `stalled-deal-addition.md` | Two edits for `stalled-deal`, with exact placement (three in round 1; Edit 3 was folded in) |

## Revision 1

The evaluator's round 1 review (`outputs/reviews/T-20261103-06-r1.md`, REVISE 73/100) listed 17 fixes. All 17 are applied as written, with the three coordinator decisions below. Nothing else was changed.

| Fix | Where | What was done |
|---|---|---|
| 1 | proposal | Cut from 578 to 426 words (frontmatter included). The review aimed at about 390; fixes 2, 3, 4 and 5 add about 50 words, so 426 is what the cuts leave. Description shortened; steps 2 and 4 of "Before you write" merged; claims table kept once; "20%" now points to `knowledge/company.md`; the trial-terms bullet and the sending bullet cut |
| 2 | proposal | Price: "Quote the price and tax note as the fact sheet gives them. For a sum, show each line; never work out tax or a tax-inclusive total." |
| 3 | proposal | Shared plan: with no buyer date, list steps and owners and ask for their date at the call |
| 4 | proposal | Handoff is "for the coordinator to pass to `developer`", since `sales` can't call `developer` (`sales.md` `can_ask`) |
| 5 | proposal | The approver box is removed before sending; the approval row in `ops/approvals.md` names the text to send |
| 6 | proposal, README | Both short phrases that matched `close-plan` were reworded; see "Shared-phrase check" |
| 7 | objection | The flag needs both `pre_information` and `no_specifics` before answering; `immediate_drop` is judged only after 7 days and adds no message (the next note is the single one in `stalled-deal`); the smokescreen share is covered by "Never work out a rate yourself" and the P4 note (line 64) |
| 8 | objection | `immediate_drop` now reads: our five-step answer used confirmed facts (sales judges; unknown if in doubt) and they went quiet anyway |
| 9 | objection | The reply-label wording was in the recovery definition, which moved to the P4 note below, where it uses "Needs a person" |
| 10 | objection, P4 note | The mapping from reply-triage categories to "wrote back" is in the P4 note. The skill carries "Log a second objection as its own register line" |
| 11 | objection | The recovery rate is one line in the skill. Section plus Edit 1 bullets went from 395 to 196 words (Edit 1 bullets 34, section 162). The review aimed at about 170 |
| 12 | objection | The line names "package P4, T-20261103-08" so it can be found and removed |
| 13 | stalled | "An opt-out is always Retire" with the full suppress command; never Watch or Re-enter |
| 14 | stalled | "The company closed" added to Declined |
| 15 | stalled | Section 169 words (from 268; the review aimed at about 140). Five decline bullets became three; "which option they chose" moved into the reason; Edit 3 folded into the section. The "contact left, new person is a new contact" bullet was dropped in the merge |
| 16 | README | Word counts and loaders corrected below |
| 17 | README | "No text copied" corrected; see "Shared-phrase check" |

The wording fixes below were made after the r2 PASS (91/100, `outputs/reviews/T-20261103-06-r2.md`), at the coordinator's request; they change wording only. (1) `proposal` line 31 now removes the claims table as well as the approver box before sending. (2) The stalled addition says `suppress` sets the lead to `disqualified`, so don't also mark it `lost`. (3) The stalled addition has the "contact left the company" bullet back: a new person there is a new contact, with their own checks and approvals, and the old contact is retired; this is the coordinator's logged decision and the human may reverse it. (4) Fix 7 above now says the smokescreen share is covered by "Never work out a rate yourself" and the P4 note (line 64). Counts after the fixes, from `wc -w`: `proposal` 431, stalled section 215 (fix 15's 169 above is the round 1 figure).

Lint after the wording fixes (`node scripts/lint-copy.mjs`, general), last lines: `proposal/SKILL.md (general): 0 failed, 4 warning(s).` / `stalled-deal-addition.md (general): 0 failed, 0 warning(s).` / `README.md (general): 0 failed, 3 warning(s).` (warnings are marker names written in the text). `git status --short .claude/skills` prints nothing.

### Decisions used (coordinator's, logged as assumptions; a person can reverse them)

- **Minimum sample:** below 10 answered objections, show counts only, no rate. Never change an answer because of the rate below 15.
- **"Not now" replies** count as the buyer writing back, but not as "moved forward". "Moved forward" is reported as its own count.
- **A second objection** counts as writing back, on its own register line with its own 7-day clock.

## Summary of each change

**1. `proposal` (new skill, survey A10).** `sales.md` line 32 promises "Proposals and quotes" and no skill backs it. The new skill gives a nine-part order: today, wanted, proposal, price, cost and value, if you wait, why us, limits and terms, shared plan. It starts from the method of Anthropic's `close-plan` (a business case in the buyer's words, then a plan worked back from their date). Our rules are built in:
- Prices, limits and terms come only from the fact sheet and `knowledge/company.md`, in the fact sheet's own wording. A sum shows each line and never works out tax or a tax-inclusive total.
- Cost and value uses only figures the buyer gave, each with its source. Proof comes only from proof-library rows with permission.
- Discounts follow policy in `knowledge/company.md`, are always `[NEEDS APPROVAL]` and never apply to monthly plans. Any term not in confirmed knowledge is `[NEEDS APPROVAL]`, and the lesson in sales memory is written in: a billing period is not a cancellation term.
- A "For the approver" box lists every open approval and is removed before sending. A proposal with an open marker can't be sent, and sending is its own approval.

**2. `objection-handling` addition (survey B13).** A new section, "Did the answer work?", plus two register bullets. The recovery rate is one line for now: "not enough data, no counting script yet (package P4, T-20261103-08). Don't estimate." The smokescreen check uses two markers before answering and a third, `immediate_drop`, after 7 days. Placement: inside `## Objection register`, before `## Never`.

**3. `stalled-deal` addition (survey B21, ideas only).** A new first section, "Quiet or declined?", before the cause table. A decline is recorded in the buyer's words and the writing stops. An opt-out is always Retire. A quiet buyer goes on to the existing table. The silence-day thresholds are not used. Placement: after the title, with a heading rename.

## Brief for P4 (T-20261103-08): the full recovery-rate definition

Kept out of the skill so six agent files don't carry it. P4's script should implement it, and the person approving P4 can change any number here.

- **Rate:** answered objections where the buyer wrote back, out of answered objections with at least 7 days since the answer was sent. "Answered" means a person sent our draft, with the date logged. Under 7 days is pending and is in neither the top nor the bottom of the fraction.
- **Wrote back** is a real reply that keeps the talk going. Label it with a reply-triage category, in code so the list can't drift:
  - Counts: Interested, Objection (a second objection, on its own register line and clock), Referral, Wrong person, and Not now.
  - Does not count: Auto-reply, Bounce, Opt-out, Complaint, silence, and a flat "not interested" with no new reason.
  - Needs a person: held out of both sides until a person labels it.
- **Moved forward** is a separate count, shown beside the rate: Interested only for now (the source's set is interested, question, curious; whether Referral joins is the approver's call). Not now counts as wrote back but not as moved forward, so a chain of objections or "later" replies doesn't read as success.
- **Sample size:** print n with every rate ("3 of 7, n=7"). Below 10 answered, print counts only and no percentage. From 10, print the percentage with n. Never change an answer because of the rate below 15. The source's own limits: minimum 5 (`analyze.py` line 51), confidence low at 5-9, medium at 10-19, high at 20 or more (line 497), no product verdict below 15 (line 69). Ours are stricter because our volume is low (8 leads, none contacted, 20-email daily cap) and one reply moves a rate of 5 by 20 points.
- **Smokescreen share:** same minimum and the same printing rule.
- **Sources for the rules:** the source skill lines 240-244; `analyze.py` lines 21-31 (handled, pending, recovered), 50, 51, 60 (`RECOVERY_EXCLUDED`), 65-66 (`POST_CATEGORIES`, which has no objection label, so counting a second objection is our reading), 72 (`PROGRESSED`).

## Which agents should load `proposal`

- **`sales`**: add `proposal` to the `skills:` list in `.claude/agents/sales.md`.
- **`sales-fallback`**: needs no hand edit. Its file is generated from `sales.md`, so run `node scripts/fallbacks.mjs sync` after the edit.
- **No one else.** Every preloaded skill costs tokens on every run of that agent. Others can read it by name when a task calls for it.

**Cost, measured with `wc -w` on 2026-11-03, counting every line that would be installed:**

| Skill | Today | Added | After | Loaded by |
|---|---|---|---|---|
| `proposal` (new) | 0 | 431 (frontmatter 37, body 394) | 431 | `sales`, `sales-fallback` |
| `objection-handling` | 387 | 196 (Edit 1 bullets 34, Edit 2 section 162) | 583 (+51%) | six agent files: `sales`, `outreach`, `demo-handler` and their three fallbacks |
| `stalled-deal` | 300 | 215 (the section; Edit 2 is a heading rename) | 515 (+72%) | `sales`, `sales-fallback` |

Round 1 reported 362 and 242, which left out the Edit 1 and Edit 3 lines, and named three loaders instead of six files.

## CREDITS rows (for `docs/CREDITS.md`)

```
| [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (`sales/skills/close-plan`) | Apache-2.0 | The order of a business case (present state and its cost, the outcome wanted, the proposal mapped to it, the cost against the return, the risk of waiting, why us) and a shared action plan worked back from the buyer's date. Method only, in our words; a 4-word-run check finds no shared text in the installed skill. Left out: its opening rule block (take requested actions through connectors and never refuse them), its connectors and its CRM write-back |
| [LaGrowthMachine/gtm-system](https://github.com/LaGrowthMachine/gtm-system) (`objection-analyzer`) | MIT, Copyright (c) 2026 LaGrowthMachine | The smokescreen check (two markers before answering, one after 7 days), the 7-day wait, the rule that a script does the counting, and marking events instead of deleting them. The marker names are the source's identifiers. No code, scoring rubric or connector used |
| [louisblythe/Sales-Skills](https://github.com/louisblythe/Sales-Skills) (`ghost-recovery-sequences`) | No licence file (the README says MIT, `LICENSE` returns 404, GitHub's licence field is empty), so ideas only | The split between a buyer who went quiet and one who declined. Nothing copied |
```

Licence checks, run 2026-11-03: GitHub API `license` is `apache-2.0` for anthropics, `mit` for LaGrowthMachine, and `null` for louisblythe. The LGM `LICENSE` file opens "MIT License / Copyright (c) 2026 LaGrowthMachine".

### Shared-phrase check

Round 1 said "no text copied" and "nothing is pasted". That was not literally true. The evaluator found three short verbatim phrases: "mapped to each outcome" and "what delay costs in their terms" in the proposal, and "sits outside both sides of the fraction" in the objection draft. Short phrases like these are allowed by Apache-2.0 (with the CREDITS notice) and MIT, but the claim should have said so.

In revision 1 I reworded them and re-ran the check: I fetched the raw source files and compared every 4-word run in the text that would be installed (the whole proposal; the objection Edit 1 bullets and section; the stalled section) against the matching source files (`close-plan/SKILL.md`; `objection-analyzer/SKILL.md` and `references/coaching-rubric.md`; `ghost-recovery-sequences/SKILL.md`). Result: 0 shared runs in each. The first pass on the proposal found "mapped to each outcome" and "on the next call"; both were reworded. The drafts' Sources blocks still quote short strings from the sources on purpose, to name what was dropped (the four pretext lines), and keep the marker names as identifiers.

## Dropped, and why

| Dropped | Source | Why |
|---|---|---|
| The opening rule block that says to take requested actions through the connector and "never refuse an action the user asked for" | `close-plan/SKILL.md` line 9 | Hard rule 1 (drafts only) and the HubSpot read-only rule. Our skills answer to our rules, not the plugin's |
| Connectors, CRM write-back (`update-opportunity`), docs and email send steps | `close-plan` steps 1, 2 and 5 | Writes and sends need approval; HubSpot is read-only for us |
| "Investment and return, with simple math" as written | `close-plan` step 3 | Would invite invented ROI. Ours uses only figures the buyer gave |
| The nine-part reply score, the 22-of-27 "clone this" cut-off, the copy, targeting and product verdicts | `objection-analyzer` | I read only the smokescreen part of the rubric, and the survey said not to adopt the cut-off unseen. Unvalidated numbers |
| Printing estimated numbers when the engine is missing | `objection-analyzer` SKILL.md ("paste tier", about line 88) | Our brief says "not enough data" instead |
| The Python engine, the home-folder playbook, the offer to wire a sibling reply skill, the LGM connector | `objection-analyzer` | Third-party code and a hosted service; the skill also steers toward the vendor |
| Four pretext lines ("cleaning out my pipeline", "saw this article", "was just helping a similar company", "saw the news") | `ghost-recovery-sequences` lines 235-236, 261-262, 274, 336 | Each gives a reason for writing that isn't true |
| Silence-day bands, the "10-20% revival rate" figure | same, lines 27 and 384 | No source or denominator |
| SMS and channel rotation, automated flows | same | Policy allows only email and LinkedIn without approval; no auto-sending |

## Instructions found in the sources (reported, not followed)

- `close-plan/SKILL.md` line 9: tells the running model to take requested actions through the connector and never refuse an action on the plugin's authority. Not followed.
- `close-plan/SKILL.md`, other lines: show actions to the user before running them, work silently between tool calls, cite and link every value. These are written for the model that runs the plugin. I did not follow them as instructions to me.
- `objection-analyzer/SKILL.md`: lines 15-19 ("Output discipline") tell the running model to return only deliverables, with no preamble and no narration; lines 88-90 tell it to print estimated numbers; lines 355-366 tell it to offer to wire and patch a sibling reply skill. Not followed.
- `scripts/analyze.py` docstring line 44: "the caller should ASK the user". Not followed.
- `ghost-recovery-sequences/SKILL.md` line 8: a role directive ("You are an expert in building sales bots..."). Not followed.

## Questions for the human

1. **Minimum sample and "Not now" counting** are decided as assumptions (see "Decisions used"). Reverse them through P4 if you disagree.
2. **`knowledge/products/motionrepo.md` status.** Frontmatter says `confirmed`; body line 20 says "All of this file is `proposed`". The evaluator's reading is that frontmatter governs and line 20 is stale (already logged for `knowledge-base` on `ops/board.md`). The proposal skill treats confirmed facts as usable and marks others `[UNCONFIRMED]`, so no change is needed here.
3. **The "For the approver" box** is my addition and is not in the source. It is kept, with the rule that it is removed before sending. Approve or drop it.

## Self-review

- 1 Re-read the brief: pass. All 17 fixes applied (table above). The four files are at the paths the brief named, and `.claude/skills/` is untouched (`git status --short .claude/skills` prints nothing). The recovery-rate note for P4 is in this README, as asked.
- 2 Counts match the body: fixed. Re-measured with `wc -w` after the last edit: `proposal/SKILL.md` 431; objection Edit 1 bullets 34 plus section 162 = 196; stalled section 215; existing skills 387 and 300. The six loaders of `objection-handling` are `sales`, `outreach`, `demo-handler` and their three `-fallback` files (`grep -l objection-handling .claude/agents/*.md`); `stalled-deal` is loaded by `sales` and `sales-fallback`. Targets in the review were about 390, 170 and 140; I am over on all three (431, 196, 215), because the required additions (tax rule, no-date rule, opt-out rule, approver-box rule) cost words.
- 3 One answer per question across files: pass. The discount rule points to `knowledge/company.md` instead of restating it. Marker names and the "one line" wording match between the objection draft and the P4 note.
- 4 Automatic checks: pass, re-run after the final edit of the drafts. Lint (general): `proposal/SKILL.md` 0 failed, 4 warning(s); objection addition 0 failed, 0 warning(s); stalled addition 0 failed, 0 warning(s); README 0 failed, 3 warning(s). The warnings are marker names written in the text (`[NEEDS APPROVAL]`, `[UNCONFIRMED]`). `check-links`: proposal 0 link(s); objection 3 link(s): 3 ok; stalled 1 link(s): 1 ok; README 3 link(s): 3 ok. None broken.
- 11, 14, 15 Source handling: pass. The raw files were fetched with curl on 2026-11-03: `close-plan/SKILL.md` (107 lines), `objection-analyzer/SKILL.md` (406), `references/coaching-rubric.md` (255), `scripts/analyze.py` (1714; lines 44, 50, 51, 60, 65, 69, 72 and 497 checked again this round), `ghost-recovery-sequences/SKILL.md` (442). The `references/` folder of `ghost-recovery-sequences` and the rest of the rubric were not read, and I adopted nothing from them.
- "Nothing copied" claim: fixed. Tested with a 4-word-run comparison (see "Shared-phrase check"): 0 shared runs in the installed text of all three drafts.
- Memory lesson "no contract term from plan facts": applied in `proposal` item 8. Lesson "competitor gap labelled hypothesis": the skill states no competitor claim. Lesson "joined claims": fix 2 applies it to "+ 18% GST" sums.
- Not run: no test of the skills on a real proposal or reply, because no deal or answered objection exists yet. The skills are untested.
