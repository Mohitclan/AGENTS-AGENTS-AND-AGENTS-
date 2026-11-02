---
name: task-briefs
description: The coordinator's fixed brief for each kind of task (inputs, deliverable, checks, what PASS needs) and the pilot rules for sending. Use when delegating any task.
---

# Task briefs

Free-text briefs were a common cause of first-round REVISE: the specialist guessed at the shape, the reviewer judged a different one. Use the brief for the task type, fill every field, and send the same brief to the evaluator.

## Fields of every brief

- **Task:** ID, one-line goal, product slug.
- **Inputs:** file paths only (fact sheet, lead IDs, earlier outputs, reviews to answer).
- **Deliverable:** exact path and the sections it must have, in order.
- **Checks before hand-in:** the self-review skill's checks that apply, plus the commands below.
- **Done means:** what the evaluator needs for a PASS (rubric type in `evaluation/rubrics.md`), and the outcome the work serves (early-stage-guardrails).
- **Out of scope:** what not to do (for example "no drafts", "don't re-import").

## By task type

| Type | Owner | Deliverable and required sections | Commands before hand-in | Rubric |
|---|---|---|---|---|
| Fact sheet | knowledge-base | `knowledge/products/<slug>.md`, status proposed: facts with sources, ICP as hypotheses, pricing, open questions | `check-links` | fact sheet |
| Research | researcher | `outputs/research/YYYY-MM-DD-<slug>-<topic>.md`: findings, sources opened, sources not opened, confidence, open questions | `check-links`, `lint-copy --type general` | research |
| Lead batch | lead-generator | `pipeline/inbox/YYYY-MM-DD-<slug>-<n>.jsonl` imported, plus notes `outputs/research/YYYY-MM-DD-<slug>-lead-notes.md` with a per-test table (pass, fail, unknown) and pages read | `leads.mjs import`, `leads.mjs check`, `leads.mjs gate --product <slug> --status all` | lead batch |
| Outreach sequence | outreach | `outputs/outreach/<lead-id>.md`: frontmatter (`lead`, `task`, `product`, `company`), Send schedule, `## Email N` with `Subject:`, LinkedIn, If they reply, Claims used, For the reviewer, Self-review | `leads.mjs gate`, `lint-copy --type email` | outreach |
| Reply draft | sales | `outputs/sales/<lead-id>-reply-<n>.md`: their words (from `outputs/replies/`), reply-triage label, draft under 120 words, Claims used | `lint-copy --type email` | sales asset |
| Sales asset | sales | `outputs/sales/...`: answers each with a fact-sheet line, `[NEEDS APPROVAL]` on commitments | `lint-copy --type general` | sales asset |
| Content | marketing | `outputs/marketing/...` with the outcome set before drafting | `lint-copy --type <general|social|seo>`, `check-links` | marketing |
| Code fix | developer | local branch in `repos/<slug>`, write-up `outputs/dev/<task>.md`: change, files, checks run, not checked, roll back | the project's own test, type and lint commands | code change |

## Pilot rules (from 2026-11-02, main memory)

1. Research, scraping and drafting run freely. Nothing goes to a prospect.
2. Every outreach draft goes to people for a wording review. Put each email of a reviewed (PASS) sequence in `ops/approvals.md` as `pending`, with the file and line, and say in the report that the wording must be checked first.
3. A test send may go only to Sushant Mishra (`sushant.789.mishra@gmail.com`). `ops/mail-config.json` (`pilot.allow_only`) refuses everyone else, whatever approvals say. Suggest a demo send in the report (`node scripts/send-email.mjs --draft <file> --email 1 --to sushant.789.mishra@gmail.com`); a person runs it.
4. Agent runs use the shared Max plan: keep chains short, reuse earlier outputs, and don't start optional work.
