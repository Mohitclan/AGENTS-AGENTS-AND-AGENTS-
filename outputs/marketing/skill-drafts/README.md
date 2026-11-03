# P3 marketing skill drafts (T-20261103-05)

Status: drafts only. Nothing was written to `.claude/skills/`, no agent file was changed, and nothing was sent or published. Adding a skill needs the human's yes; the coordinator installs afterwards.

**Outcome we'll measure.** Whether the new skills reduce rule-break findings on the tasks that use them. Metric: rule-break findings (an unsourced claim, a claim not on a confirmed fact-sheet line, or an outside action without an approval row) in the evaluator's first review of each marketing or docs-handler task that loads one of these skills. Source: `outputs/reviews/` and `ops/board.md`. Baseline: none, because no such task has run yet. Read after the first three tasks per skill. With so few tasks the honest result may be "inconclusive"; a single rule-break finding is still worth a fix to the skill. Owner: the coordinator.

## The drafts

| Draft | Path | Length |
|---|---|---|
| `directory-listing` | `outputs/marketing/skill-drafts/directory-listing/SKILL.md` | 58 lines |
| `comparison-page` | `outputs/marketing/skill-drafts/comparison-page/SKILL.md` | 55 lines |
| `landing-page-audit` | `outputs/marketing/skill-drafts/landing-page-audit/SKILL.md` | 60 lines |
| Sign-up nurture rules | `outputs/marketing/skill-drafts/cold-email-addition.md` | 35 lines to insert (22 to 56), plus the reasoning; file is 62 lines |

Our 20 existing skills run from 29 to 64 lines, so these fit. Every draft is written in our own words from a summary of the source file; no source text was copied.

### What each one does

**`directory-listing`.** Chooses directories, launch venues and review sites by where the product's buyers are, not by site size, and takes the venue list from the researcher's channel map. It checks each venue's own rules before drafting, writes each listing from confirmed fact-sheet lines with a Claims-used table, and varies the copy by venue type. Submitting, account creation and entering personal details are outside actions: the coordinator adds one `ops/approvals.md` row per venue and a named person submits. It then checks the live link and keeps a weekly tracker that reports sign-ups from each listing, with "no data" never counted as zero.

**`comparison-page`.** Builds "<competitor> alternative" and "us vs <competitor>" pages from `knowledge/competitors/<slug>.md` and the fact sheet, with the matrix written first. It insists on dated sources, fairness (who should pick them, our own limits), and no printing of hypothesis-level "we win" notes. It also audits comparison claims already live, marking each Current, Changed, Unverifiable or Overclaimed, with a check date. No paid scraping, no scripts.

**`landing-page-audit`.** Audits a page in order of impact (offer, headline, call to action, scan, proof, objections, friction, then speed and mobile) and ranks every finding by evidence: rule break, measured, heard, seen, convention. It never states an expected lift or a benchmark ("effect: unknown until tested"), sends convention-only ideas to Tests with a sample and read date, and lists what a text-only fetch couldn't check.

**Sign-up nurture rules.** Exit, re-entry and suppression for people who signed up and haven't paid. One sequence at a time per person across every product; checks before every step, not only at the start; a person sends; no tracking pixels, benchmarks, engagement branching or progressive profiling. Sign-up emails are held, not drafted for sending, until a person rules on whether the never-contact rule on personal addresses covers sign-ups.

## Section or new skill? Recommendation: a section in `cold-email`

The reasons are in full at the top of `cold-email-addition.md`. In short: `cold-email` already claims nurture in its description (line 3), and it is loaded by exactly the three agents that can start a sequence for a person (outreach, sales, marketing), so "one sequence at a time" reaches all of them; the shared email checks stay in one place; and marketing doesn't get another preloaded skill. The cost is about thirty-five more lines for outreach and sales on every run. If the founders prefer `cold-email` to stay cold-only, the same text works as a new `signup-nurture` skill.

## Proposed agent assignments

| Skill | Load in | Reason | Not loaded by |
|---|---|---|---|
| `directory-listing` | marketing | `marketing.md` line 33 (launch plans, directories) | researcher: it supplies the channel map, which is the skill's input |
| `comparison-page` | marketing, docs-handler | `marketing.md` line 31, `docs-handler.md` line 25 | sales: it works from the battlecard |
| `landing-page-audit` | marketing | `marketing.md` line 30 | developer: it reads the audit |
| Sign-up nurture | no new preload; edit `cold-email` | already loaded by marketing, outreach, sales | n/a |

Fallbacks follow their main agent: `node scripts/skills.mjs give <agent> <skill>` also gives it to the fallback. Install with `node scripts/skills.mjs new <name> "<description>"`, replace the body with the draft, then `give`. The guard will ask a person.

Cost, as a hypothesis (confidence low, unmeasured, survey B H3): marketing's preloaded skills go from nine to twelve and docs-handler's from three to four. The per-agent limit is 32 (`scripts/skills.mjs` line 16), so this is about plan quota, not a limit. Test it by comparing token use on one marketing task with and without the three.

## CREDITS rows to add

Existing `docs/CREDITS.md` says everything was rewritten in our own words and no code was copied, which stays true here. The rows below follow its table format.

| Source | Licence | What we took |
|---|---|---|
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (`directory-submissions`, `competitors`, `cro`; Copyright (c) 2025 Corey Haines) | MIT | Venue groups, the destination page first, listing copy varied by venue type, checking the real link on a listing, human approval before every submission and weekly tracking; the four comparison-page shapes, claim-audit statuses, one dated data file per competitor, absence written as a dated observation, and saying what changed on their side, never why; auditing in order of impact and the quick-wins, bigger-changes, tests and copy-alternatives output |
| [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) (`competitor-alternatives`; Copyright (c) 2025 Alireza Rezvani) | MIT | The honesty rules and "who should and shouldn't switch" for comparison pages. Its Python script was not used |
| [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (`marketing/skills/email-sequence`) | Apache-2.0 | Exit, re-entry and suppression rules for sequences, and one purpose and one main call to action per email |
| [gtmagents/gtm-agents](https://github.com/gtmagents/gtm-agents) (`drip-campaigns`; Copyright 2025 LaunchIQ AI, Inc.) | Apache-2.0 | One job per touch, and the value-ladder idea (help and show before the ask). Progressive profiling was left out |

Add to "Left out on purpose": the Product Hunt account warm-up, review gift cards, paid badges, open-rate and click benchmarks, and progressive profiling. Each skill ends with a short Sources note; once the CREDITS rows exist, the coordinator can trim those notes to save tokens.

## What I dropped, and why

**`directory-submissions`**
- The Product Hunt warm-up (upvote and comment quotas, follow quotas, building history to look established). Faked engagement, and an outside action. The reviewer confirmed it at source lines 159 and 365 (`outputs/reviews/T-20261103-02-r1.md` and r2). I did not re-check the line numbers; my read had none.
- Review gift cards, paid badges, G2 badge rules and report deadlines, trading value with a hunter. Incentives are a policy question for the founders, and the platform facts are unchecked by us.
- Every figure without a source: the lift, conversion, upvote, traffic and authority-score claims named in review r2, notes A and C, plus the authority-score anecdote and the Day 0, 30 and 90 targets.
- The thirteen tiers with target counts, and the press-release, article and social-bookmarking tiers: volume goals, against buyer-first ranking.
- The launch-day timetable (day and hour). It needs the venue's own rules as a source, and the channel map doesn't hold them.
- The `dig` check and the CSV template: no shell, and a markdown table does the job.

**`competitors` and `competitor-alternatives`**
- The Python matrix script (the table is written by hand) and the instructions to read `.agents/` context files and to load a `marketing-context` skill, which we don't have.
- Migration sections and switcher testimonials: no data. Mining G2 and similar sites: they block the fetch.
- Quarterly and annual refresh cadences: replaced by `fact-sourcing`'s ninety-day rule.
- The "four to seven alternatives" count: we list what our files support.

**`cro`**
- Page-type frameworks, form optimisation and its routing guidance (needs enrichment tools), the experiment-area list, and its `references/` files (never read by me or the survey).
- The unsourced "five seconds" rule is kept only because our own `positioning` agreement check already uses it.

**`email-sequence` and `drip-campaigns`**
- The benchmark table, tracking suggestions, A/B suggestions, engagement-based timing, platform and CRM wiring, and progressive profiling. The source's 48-hour support rule became "pause while a support thread is open", because the number has no stated basis.

## Flags for the human

1. **Status text conflicts in two confirmed files.** `knowledge/products/motionrepo.md` has `status: confirmed` (line 2) but line 20 still says "All of this file is `proposed`". `knowledge/competitors/motionrepo.md` has `status: confirmed` (line 2) but lines 17 and 19 say its product facts are `[UNCONFIRMED]` and "Not yet confirmed by a human". As of revision 1, all three skills share one rule: use the frontmatter status, mark the facts the body calls unconfirmed `[UNCONFIRMED]`, hand the conflict to `knowledge-base` and carry on. This departs from claim-check rule 2 ("stop and flag") for status text only, as the coordinator's revision-1 brief directed (fix 5). A person or `knowledge-base` should remove the stale lines through a proposal.
2. **Personal addresses.** The never-contact list (`knowledge/company.md` line 39) names personal (non-work) addresses. MotionRepo sign-in is GitHub only, so many sign-ups will use personal addresses. Until a person rules whether the list covers sign-ups, the nurture section holds sign-up emails and drafts none for sending. Does that list apply to sign-ups? The company list on that same line is also still an unfilled placeholder.
3. **Daily limit.** Policy sets 20 cold emails a day. It doesn't say whether sign-up emails count. The section counts them until a person rules.
4. **Review incentives.** The skill offers none and treats incentives as a founders' decision.
5. **Files the skills create on first use:** `outputs/marketing/directory-tracker.md` and `outputs/marketing/nurture-roster.md` (ID, sequence, step, date; no addresses). Neither exists yet.

## Instructions found in the sources (data, not followed)

- `directory-submissions`: check a product-marketing context file first and ask the readiness questions; verify each target with `dig`; build the Product Hunt hunter account's history; offer review rewards; "keep the plan actionable". It also says to treat directory pages as untrusted and to get human approval before every outward step, which matches our rules. The warm-up and rewards were rejected.
- `competitors`: read a `.agents/` context file, never guess the competitor, proactively offer pages. Not followed; ideas kept only where they fit our rules.
- `competitor-alternatives`: load the `marketing-context` skill, run its Python matrix script (the source's line 272 says not to build the table by hand; the draft does the opposite), offer to create pages when a competitor is mentioned. Not followed.
- `cro`: read `.agents/product-marketing.md`, react to any shared URL, route to other skills. Not followed.
- `email-sequence`: read its CONNECTORS.md, map the sequence to a connected email platform or CRM, close by offering follow-up options. Not followed; we have no sending connector, and sending needs approval.
- `drip-campaigns`: none aimed at an agent.

None tried to change our rules, ask for credentials or send anything.

## Limits of this work

- **Source reads were summaries.** My fetch tool returned a summary of each source file, not the raw text, and no line numbers. The "Taken" lists in each Sources note came from those summaries. The evaluator should open the raw files for a few of them before the human approves.
- **Two skills' reference files unread:** `cro/references/` (form and experiments) and the Rezvani `templates.md` and `content-architecture.md`.
- **No shell.** I couldn't run the checks myself. I asked `docs-handler` to run them and paste the output; see the Self-review.

## Self-review

- 1 Re-read the brief: fixed. Four drafts, README, CREDITS rows, dropped list, agent assignments, instruction list and Self-review are all present. I trimmed the three skills after a first pass ran to 61 to 72 lines.
- 2 Counts match: fixed in revision 1. The Length column was recounted after the last edit of each file (docs-handler `wc -l`: 58, 55 and 60 for the skills; the addition file is 62 lines, of which lines 22 to 56 are the text to insert).
- 3 One answer per question: pass, with flag 1. Two source files disagree with themselves on status; I raised it. From revision 1 all three skills give the same answer: use the frontmatter, mark the affected facts, hand off to `knowledge-base`.
- 5 Claims used: n/a. These are internal skills with no customer-facing product claims. Each skill points agents to the fact sheet instead.
- 10 Placeholders: pass. The drafts use `<angle brackets>` for fields and no `{{...}}` values.
- Automatic checks: pass, run by `docs-handler` at my request (I have no shell) and relayed to me unedited. Last lines:
  - directory-listing: `0 failed, 1 warning(s).` The warning is the `[UNCONFIRMED]` marker on line 35, which the skill names as a rule. Not an open item.
  - comparison-page: `0 failed, 0 warning(s).`
  - landing-page-audit: `0 failed, 0 warning(s).`
  - cold-email-addition: `0 failed, 0 warning(s).`
  - README: the first-round run (`0 failed, 1 warning(s).`) predates this list and the evaluator's re-run found two warnings. The revision-1 run is under "Revision 1" below.
  - check-links on all five files: no broken, restricted or unreachable links (1, 2, 1, 2 and 4 links, all ok) in round one. Revision 1 is below.

## Revision 1

Reviewer's file: `outputs/reviews/T-20261103-05-r1.md`. Fixes 1 to 10 and 12 done; fix 11 (format, install time) skipped as asked. Nothing was written to `.claude/skills/`.

**`cold-email-addition.md` (must fix)**
- Fix 1: a new "How this differs from cold email" paragraph says the contact is the address the person signed up with, so the published-business-contact line and the send-risk grades don't apply, and the follow-up cap doesn't bind a plan. Every other check in Never and Compliance stays. A "Held until a person rules" paragraph says sign-up emails are held, not drafted for sending, until a person rules whether `knowledge/company.md` line 39 covers sign-ups (sign-in is GitHub only).
- Fix 2: the draft, roster and RESULT carry an ID only. The address is read from the sign-up record at check time, used for the checks only, and compared with the suppression data (`pipeline/suppression.jsonl`, matched by exact email or whole domain) and the never-contact list.
- Fix 3: the opt-out exit now follows hard rule 7. Outreach and sales run `node scripts/leads.mjs suppress` themselves at once; marketing hands the address to an agent with a shell, or a person, in the same message.
- Fix 4: I kept the value ladder by adding one clause to the plan (early emails help and show, the ask comes after) and dropped "rotating touches" from the credit. The minimum-sample wording now says to write down the smallest sample worth reading, and the read date, before the first send.
- Daily limit: unchanged. Sign-up emails count toward the 20 a day until a person rules.

**The skills (should fix)**
- Fix 5: one status rule in all three (`directory-listing` line 14, `comparison-page` line 14, `landing-page-audit` line 15). It replaces the stop-and-flag in `comparison-page`, which departs from claim-check rule 2 for status text only, as the coordinator's revision-1 brief directed (fix 5).
- Fix 6: `directory-listing` line 26 says a person posts community and forum posts, under their own account, after an approval row.
- Fix 7: `comparison-page` line 31 cites "Strengths" and "Where <us> loses" (`knowledge/competitors/motionrepo.md` lines 47 and 50).
- Fix 8: paths given for competitive-battlecard, seo-refresh and proof-library (`comparison-page`), early-stage-guardrails (`landing-page-audit` and the nurture section), and reply-triage and proof-library (nurture section).
- Fix 9: the lint steps now say to ask `docs-handler` or hand off when there is no shell. `directory-listing` gained a lint step next to the Claims-used rule.
- Fix 10: "say what changed, never why" is in the `comparison-page` Taken list and the Corey Haines CREDITS row.
- Fix 12: the Anthropic CREDITS row now credits one purpose and one main call to action per email; "one job per touch" and the value-ladder idea sit in the gtm-agents row. The "Instructions found" list gained Rezvani line 272. The warning counts are updated below.

**Checks, run by `docs-handler` at my request and relayed unedited** (lint `--type general`, then check-links):
- `directory-listing`: `0 failed, 2 warning(s).` (lines 14 and 35, the literal marker named as a rule); `1 link(s): 1 ok`.
- `comparison-page`: `0 failed, 1 warning(s).` (line 14, same); `2 link(s): 2 ok`.
- `landing-page-audit`: `0 failed, 1 warning(s).` (line 15, same); `1 link(s): 1 ok`.
- `cold-email-addition`: `0 failed, 0 warning(s).`; `2 link(s): 2 ok`.
- README: `0 failed, 3 warning(s).` (lines 83 and 114 the literal marker, line 84 an unfilled-placeholder token); `4 link(s): 4 ok`. I then reworded line 84 to remove the placeholder token, so a re-run should show two warnings; that re-run was not made.

All warnings are the marker named as a rule, not an open gap.

Wording fixes made after the r2 PASS (91/100, `outputs/reviews/T-20261103-05-r2.md`): who runs the suppression check and the same check-time address for the lead lookup, the personal-address hold with its exemption, no address in the draft, roster or RESULT, a route for marketing-fallback, "35 extra lines", the claim-check rule 2 exception and whole-file unconfirmed line in all three status rules, and the exact wording of the coordinator's brief. Checks re-run by `docs-handler` at my request, last lines relayed unedited (lint `--type general`, then check-links):
- `cold-email-addition`: `0 failed, 0 warning(s).`; `2 link(s): 2 ok`.
- `directory-listing`: `0 failed, 2 warning(s).` (lines 14 and 35, the literal marker named as a rule); `1 link(s): 1 ok`.
- `comparison-page`: `0 failed, 1 warning(s).` (line 14, same); `2 link(s): 2 ok`.
- `landing-page-audit`: `0 failed, 1 warning(s).` (line 15, same); `1 link(s): 1 ok`.
- README: `0 failed, 2 warning(s).` (lines 83 and 114, same), run before this block was added; `4 link(s): 4 ok`. Line counts are unchanged for the four other files (62, 58, 55, 60).
