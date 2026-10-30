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
- **29 Oct 2026.** Pushed to GitHub: `Mohitclan/AGENTS-AGENTS-AND-AGENTS-`, then made the repo private. Lead data (`pipeline/leads.jsonl`, `pipeline/leads.csv`, `pipeline/inbox/`) is committed so the team shares one pipeline. Keep the repo private.
- **30 Oct 2026.** Closed guardrail gaps found in a code review. The guard hook now catches an edit that changes only the word `confirmed`, ignores letter case in paths, blocks `.env` reads in any folder (through Read or Bash), and asks a person before any `kb.mjs confirm` and before lead statuses `approved`, `contacted` and `won`. `leads.mjs` locks the pipeline while writing, enforces the status order (`--force` to correct mistakes), and escapes spreadsheet formulas in `leads.csv`. The PDF build finds Chrome on Windows and Linux.
- **30 Oct 2026.** Added memory, skills, direct agent calls and fallbacks, all on the Max plan with no paid tools:
  - Main memory `memory/MAIN.md`, which every agent loads, and per-agent memory (`memory: project`), fed with `/teach` and `/forget` and `scripts/memory.mjs`.
  - Five skills preloaded per agent, managed with `/give-skill`, `/new-skill` and `scripts/skills.mjs`.
  - Direct agent-to-agent calls limited to each agent's `can_ask` list, one level deep and logged.
  - A retry hook (three attempts per reply), plus a fallback agent for each specialist and the evaluator, with switches logged.
  - `fallbackModel` for model outages, and a test suite (`node scripts/test.mjs`).
  - Not yet run in a live session.

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
