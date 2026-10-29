# AI Sales and Growth Team: Status Log

What's done, what's decided, what's blocked, and how each sprint went. The full plan is in [PLAN.md](PLAN.md); how the system works is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Phase status

| Phase | Status |
|---|---|
| A1 · Built | Done (29 Oct 2026). Scripts and guard hook tested; all 11 agents load in Claude Code. No full sprint run yet |
| A2 · Add products | Waiting for the product list |
| A3 · First sprint | Not started |
| A4 · All products | Not started |
| B · Product signals | Only if needed |
| C · Always-on system | Only if needed |

## Log

- **29 Oct 2026.** Discovery done. Decided to start with selling (research → leads → outreach → sales and demos) using Claude Code agents, with a person approving every external action. Built A1: 11 agents, knowledge base, lead pipeline, review rubrics, guard hook and four slash commands. Tested the lead script (rejects bad batches, merges duplicates, catches tampered scores), the knowledge script, the guard hook and the link checker. Wrote the presentation deck, ARCHITECTURE.md and PLAN.md.
- **29 Oct 2026.** Pushed to GitHub: `Mohitclan/AGENTS-AGENTS-AND-AGENTS-` (public). Lead data files are git-ignored so contact details stay local.

## Decisions

| ID | Decision | Choice | Status |
|---|---|---|---|
| D1 | First workflow to prove | Selling: research → leads → outreach → sales and demos | Decided, 29 Oct 2026 |
| D2 | Where Phase A runs | Claude Code agents in this repo, on the Max plan, a person in the loop | Decided |
| D3 | Phase A storage | Markdown knowledge files with a trust status; leads in JSON Lines behind a validating script | Decided |
| D4 | Agent communication | Hub and spoke: only the coordinator assigns work; at most 3 handoff steps and 2 revisions | Decided |
| D5 | Quality | Automated checks, then an Opus evaluator with per-type rubrics; the evaluator can't approve actions | Decided |
| D6 | Knowledge trust | `proposed` / `confirmed` / `deprecated`; a hook stops agents editing or confirming facts | Decided |
| D7 | Phase C runtime, database and dashboard | Research when Phase C starts | Open |

## Blockers

- The product list: name, website and repo for each of the 5–6 products.
- `knowledge/company.md` needs our answers: pricing and discount policy, outreach policy, voice, approvers.
- Decisions from PLAN.md: first product, approvers, outreach mailbox, where the repo lives.

## Sprint results

| Date | Product | Leads | Held up in review | Contacted | Replies | Meetings | Plan usage | Notes |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
