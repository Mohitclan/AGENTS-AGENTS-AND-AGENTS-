# Approval batch: GTM adoption (2026-11-03)

Everything below was built by the team and passed independent review, except T-20261103-11, whose final review is running. **None of it is live.** Each numbered item is one yes or no.

Decisions made along the way, all reversible, are in [the shortlist's Assumptions table](2026-11-03-gtm-adoption-shortlist.md) (37 rows). Sources and licences are in the two surveys and their reviews.

## A. Code: merge into one branch, push, open a PR into `main`

The branches don't conflict. `agent/T-20261103-03` and `-04` share only P1's first commit, and the others touch different files. `agent/T-20261103-11` already contains `agent/T-20261103-09a`.

| # | Branch | What it does | Review |
|---|---|---|---|
| A1 | `agent/T-20261103-03` | **P1 CRM safety.** lead-generator, sales and their backups may only *read* HubSpot (10 named tools); a test fails if a wildcard or write tool returns | PASS 92 ([r3](../reviews/T-20261103-03-r3.md)) |
| A2 | `agent/T-20261103-04` | **P2 copy checks.** 11 warning-only checks in `lint-copy.mjs` (superlatives, unsourced quotes, word tiers, em-dash density, tracking parameters, email sequences, testimonial shapes); 6 credits rows | PASS 94 ([r2](../reviews/T-20261103-04-r2.md)) |
| A3 | `agent/T-20261103-08` | **P4 honest numbers.** A read-only `scripts/stats.mjs`: pipeline, reply rate, review pass rate and objection recovery, each with n, a minimum of 10, a 95% Wilson interval and closed windows only | PASS 93 ([r2](../reviews/T-20261103-08-r2.md)) |
| A4 | `agent/T-20261103-11` (includes `-09a`) | **P6a lead-gate override:** a critical signal forces Stop. **T-11 opt-out fix:** one matcher everywhere; profile URLs stored whole; free-mail, bare shared hosts and generic pages refused | 09a PASS 94 ([r2](../reviews/T-20261103-09a-r2.md)); T-11 **ESCALATE 79** ([r2](../reviews/T-20261103-11-r2.md)): all fixes hold and it is safer than `main`, but an opt-out recorded by a page *below* a profile (an X post, a LinkedIn thread) still covers no one. **Your call: one more developer round, or merge with a "record only the plain profile URL" rule** |

- **A5.** Merge A1–A4 into one branch, run the full suite, then **push it and open one PR into `main`**. Merging the PR stays with you.

Known test flake, unrelated to this work and present on `main`: `control.test.mjs` fails on Windows with `EBUSY` when it deletes its temp folder. It's on the board as a suggested task.

## B. Skills: install the reviewed drafts

The guard asks a person before each skill change. After install, `node scripts/fallbacks.mjs sync` updates the backup agents, and the CREDITS rows from each README are added to `docs/CREDITS.md`.

| # | Change | Loaded by | Review |
|---|---|---|---|
| B1 | New skill `directory-listing` | marketing | PASS 93 |
| B2 | New skill `comparison-page` | marketing, docs-handler | PASS 93 |
| B3 | New skill `landing-page-audit` | marketing | PASS 93 |
| B4 | Sign-up nurture section in `cold-email` (sign-up emails held until a person rules on personal addresses) | outreach, sales, marketing | PASS 86 |
| B5 | New skill `proposal` (confirmed prices only; discounts to a person) | sales | PASS 92 |
| B6 | Objection-handling addition (recovery rate from the script; smokescreen check) | sales, outreach, demo-handler | PASS 93 |
| B7 | Stalled-deal addition (quiet vs declined; an opt-out always retires) | sales | PASS 84 |
| B8 | Self-review: list claims before drafting; revisions add only what is on file | all specialists | PASS 95 |
| B9 | Research evidence records (public business info, writers by role) | researcher, lead-generator | PASS 95 |
| B10 | Evaluator findings format (severity, rewrites from confirmed facts only) | **changes the evaluator's instructions** | PASS 95 |
| B11 | Sender voice from mail a person pastes in, names removed | outreach, sales, marketing | PASS 95. **Install only if a person agrees to paste their own cleaned sent mail** |
| B12 | Links on their own line in emails | outreach, sales, marketing | PASS 95 |
| B13 | Reply-triage "not now" content-gap log (225 words) | outreach, sales and backups | PASS 95 |
| B14 | seo-refresh: static-fetch schema caveat and audit order | marketing | PASS 95 |
| B15 | early-stage-guardrails: every pipeline, reply, review and objection figure comes from `stats.mjs` | coordinator | PASS 93 |

Drafts: `outputs/marketing/skill-drafts/`, `outputs/sales/skill-drafts/`, `outputs/docs/skill-drafts/`, `outputs/dev/T-20261103-08-skill-addition.md` (on its branch).

## C. Knowledge: apply and confirm (a person's step)

An agent can make the edits. Only you can run `node scripts/kb.mjs confirm <file>`. Apply them in this order:

| # | Proposal | Review |
|---|---|---|
| C1 | `knowledge/proposals/2026-11-01-company-details.md` (fills the `{{PLACEHOLDERS}}`, including sender details and the never-contact list) | earlier |
| C2 | `knowledge/proposals/2026-11-01-motionrepo-one-run-positioning.md` | PASS 92 (A-20261101-02 already approved) |
| C3 | `knowledge/proposals/2026-11-03-motionrepo-stale-status-lines.md` | PASS 84 |
| C4 | `knowledge/proposals/2026-11-01-motionrepo-solo-founders.md` | earlier |
| C5 | `knowledge/proposals/2026-11-03-brand-voice.md`. Re-check its 11 `cold-email` line references after B4 and B12 are installed | PASS 84 |

## D. Questions only you can answer (the drafts take the safe side until then)

1. Does "never contact personal addresses" (`company.md` line 39) cover people who **signed up** for MotionRepo? (Sign-up nurture stays held until you answer.)
2. Is a founder's published Gmail-type product address "personal"? (The lead gate stops it today.)
3. Should a support-only inbox be a hard Stop, or Conditional for a person to decide?
4. Brand-voice hypotheses: "open about our limits" as a named trait, no exclamation marks, names spelled as in the fact sheet, humour, greeting formality.
5. Product line 40 of the MotionRepo fact sheet ("not a human decision") versus shivam-G05's segment decisions (stale-status proposal, question 4).
6. Did shivam-G05 approve the battlecard answers (A-20261030-01)?
7. Optional second safety layer: a PreToolUse hook that blocks HubSpot write tools. This is a settings change, so only a person can make it.

## Still not done

- The SEO title, meta and H1 warnings (A17) are built after A2 merges.
- Optional follow-ups on the board:
  - multi-line `tools:` test
  - three stats edge-case tests
  - the Windows test flakes
