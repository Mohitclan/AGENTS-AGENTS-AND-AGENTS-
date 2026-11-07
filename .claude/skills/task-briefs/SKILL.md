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
| SEO and AEO | seo-aeo | `outputs/seo/<slug>/YYYY-MM-DD.md`: summary, Since the last run, Fixed on the branch (local branch `agent/<task-id>-seo` in `repos/<slug>`, never pushed), Fixes for a person ranked by impact, Checks with URLs | `check-links` on the report; the repo's tests and lint if it changed code | SEO and AEO |

**Lead batch size.** Brief lead-generator to screen widely and import every lead that passes, with no fixed cap on imports. The default stop rule: about 60 candidates screened by its scouts (lead-scout, three or four source groups run at once), the best 20 to 30 proved, or five searches in a row with nothing new. The scouts' lists go to `outputs/research/scout/`; they are candidates, not evidence.

## Pilot rules (from 2026-11-02, main memory)

1. Research, scraping and drafting run freely. Nothing goes to a prospect.
2. Every outreach draft goes to people for a wording review before any send. That review is the person's approval on mission control's Outreach page (a button, or by voice): approving a draft that passed review sends it. Don't add `ops/approvals.md` rows for outreach drafts, and end the task `done` with the drafts listed as "Waiting for your approval on the Outreach page".
3. Test emails go only to the pilot test recipients (Purab, Tanvi and Mohit: `pilot.test_recipients` in `ops/mail-config.json`), from launch@panscience.xyz; the script refuses everyone else, whatever approvals say. Since 2026-11-07 nothing is sent after a task: the person approves each passed draft on the Outreach page, and that sends its [TEST] copies (`scripts/outreach.mjs`, which runs `scripts/send-tests.mjs`). Nobody runs a send to a lead, and no agent runs `send-email.mjs`, `send-tests.mjs` or `outreach.mjs approve`.
4. Agent runs use the shared Max plan: keep chains short, reuse earlier outputs, and don't start optional work.
5. **Draft only when asked.** A request for leads ("find leads", "generate five leads") stops after the lead batch: don't chain into outreach. The report says how many leads can be drafted, and the person asks for drafts on the Outreach page or by voice. Chain into outreach only when the request asks for drafts ("and draft emails", "and confirm the drafts", "write outreach"), or when it is a drafting task from the Outreach page (it says a person confirmed drafting).
