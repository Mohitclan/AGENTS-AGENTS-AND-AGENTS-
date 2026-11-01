# AI Sales and Growth Team: Status Log

What's done, what's decided, what's blocked, and how each sprint went. The full plan is in [PLAN.md](PLAN.md); how the system works is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Phase status

| Phase | Status |
|---|---|
| A1 · Built | ✅ Done (29 Oct 2026). Scripts and guard hook tested; all 11 agents load in Claude Code |
| A1+ · Memory, skills, fallbacks | ✅ Done (30 Oct 2026). 21 agents, 5 skills, retry and fallback hooks; a live run found one bug, now fixed |
| J1 · Jarvis core | ✅ Done (30 Oct 2026). `/do` and `jarvis.mjs` with a queue, usage guard, reports and after-task lessons; 122 tests pass; first live task passed at 95/100 |
| A2 · Add products | 🟡 In progress. Company policies and MotionRepo confirmed; 4–5 products to go |
| H · Hardening | 🟡 Build done (1 Nov 2026), 190 tests pass. Waiting on people: decisions, company details, merging the site fix and positioning proposal |
| A3 · First sprint | 🟡 Blocked. The 1 Nov sprint and a re-test that counted solo founders found no lead that meets segment 1. Nothing drafted or sent |
| J2 · Learning organisation | Not started |
| J3 · Skill library and checks | ✅ Done (30 Oct 2026). 18 skills, automatic copy checks, opt-out list and lead gate, from three open-source repos; 170 tests pass; not yet used in a live sprint |
| J4 · Autopilot | Not started |
| A4 · All products | Not started |
| J5 · More departments | When wanted |
| B · Product signals | Only if needed |
| C · Always-on system | Only if needed (scheduling moved to J4) |

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
- **30 Oct 2026.** Live check with `claude -p`:
  - The session started as the coordinator. `can_ask` blocked outreach → developer and allowed outreach → knowledge-base, and every call was logged.
  - Researcher's reply without a RESULT block was retried once, then passed.
  - It found a bug: a RESULT block whose summary mentioned "RESULT" was rejected, which caused a needless fallback. Fixed, with a test added.
- **30 Oct 2026.** `knowledge/company.md` confirmed: discounts up to 20%, annual plans only; email and LinkedIn at 20 a day; Indian English. Company details are `{{PLACEHOLDERS}}` until the founders supply them.
- **30 Oct 2026.** MotionRepo added. Its open questions were decided from the GitHub repo, PRs and live site.
  - Fact sheet 93/100 and competitor file, both confirmed.
  - Market brief and channel map 94/100. First segment: founder-led Indian software startups of 2–20 people with a launch due. Direct competitor: RepoClip.
- **30 Oct 2026.** Built J1, the Jarvis core:
  - `/do` and `scripts/jarvis.mjs` (queue, runner, plan-usage guard), autopilot rules for the coordinator, reports in `outputs/reports/`, and lessons recorded after each task.
  - 122 tests pass.
  - First live task, J-20261030-01: a MotionRepo battlecard, PASS 95/100 after two revisions, with 3 lessons for sales and 1 for main memory. Its answers wait for approval as A-20261030-01.
  - The 5-hour window reached 83% during the run.

- **30 Oct 2026.** Studied three open-source marketing repos and built J3, with credits in `docs/CREDITS.md`:
  - `scripts/lint-copy.mjs`: automatic checks before review, a gate log, and mining of repeat failures.
  - `leads.mjs`: a global opt-out list (`suppress`), a Go, Conditional or Stop gate (`gate`), and evidence signal classes.
  - 13 new skills: claim-check, signal-outreach, reply-triage, meeting-prep, stalled-deal, research-rigor, competitive-battlecard, proof-library, hook-bank, positioning, linkedin-founder, seo-refresh, early-stage-guardrails. Five existing skills upgraded.
  - Agents and rubrics now use the checks. Customer-facing work declares its outcome before drafting.
  - Took: kai-cmo-harness (MIT parts only) for logic, saas-marketing-agents for methods. awesome-marketing added nothing useful: it's a list of mostly paid tools.

- **1 Nov 2026.** Built the code side of phase H:
  - Copy checks now cover every email and warn on two questions. They found Repowise's Email 2 at 122 words.
  - The lead gate adds Not reviewed, signal age and missing signal checks, plus `hold`, `release`, `supersede` and `next`.
  - Repowise is on hold until a person decides. 190 tests pass.
- **1 Nov 2026.** Phase H content, J-20261101-01: `/security`, README and the pricing comment corrected on local branch `agent/T-20261101-01` in the MotionRepo repo (`285480d`), not pushed. The frontend type check passes; the backend tests need app credentials and weren't run. The positioning proposal passed at 92/100, waiting for a person.
- **1 Nov 2026.** Phase A3 sprint, J-20261101-02: 9 Peerlist candidates plus 4 from search; none met all six segment 1 tests, so no lead was imported and nothing was drafted. Most were solo makers, and no candidate showed a launch due in 60 days, because launch listings show past launches. Review passed at 89/100 after two revisions.
- **1 Nov 2026.** Solo founders now count as segment 1 (D11). Re-test J-20261101-03 of the six candidates stopped for being solo: none imported. Three are free tools, two have demo videos, and Pippin was rejected afterwards when its X clip showed the product in use. Review passed at 84/100 after one revision; the Pippin change came after the review. No candidate has passed the launch test yet. Fact sheet change proposed in `knowledge/proposals/2026-11-01-motionrepo-solo-founders.md`.
- **1 Nov 2026.** shivam-G05 approved pushing and opening PRs. `phase-h-a3` is PR #5, and the MotionRepo site fix is Collateral-Pipeline PR #42. Neither is merged, and nothing was deployed.

## Decisions

| ID | Decision | Choice | Status |
|---|---|---|---|
| D1 | First workflow to prove | Selling: research → leads → outreach → sales and demos | Decided, 29 Oct 2026 |
| D2 | Where Phase A runs | Claude Code agents in this repo, on the Max plan, a person in the loop | Decided |
| D3 | Phase A storage | Markdown knowledge files with a trust status; leads in JSON Lines behind a validating script | Decided |
| D4 | Agent communication | The coordinator assigns work; specialists may call the agents in their `can_ask` list, one level deep; at most 3 handoff steps and 2 revisions (updated 30 Oct 2026) | Decided |
| D5 | Quality | Automated checks, then an Opus evaluator with per-type rubrics; the evaluator can't approve actions | Decided |
| D6 | Knowledge trust | `proposed` / `confirmed` / `deprecated`; a hook stops agents editing or confirming facts | Decided |
| D7 | Phase C runtime, database and dashboard | Research when Phase C starts | Open |
| D8 | How the team runs unattended | Jarvis: headless `claude -p` coordinator sessions on the Max plan login, one task at a time, stopping at 85% plan usage; no API key or Agent SDK | Decided, 30 Oct 2026 |
| D10 | Outside playbooks | Rewrite in our own words as short skills, MIT sources only, credited in `docs/CREDITS.md`; no long persona files, because they cost tokens on every run | Decided, 30 Oct 2026 |
| D9 | Fallbacks | One fallback agent per specialist and the evaluator, on the other model, after 3 failed attempts; then escalate | Decided, 30 Oct 2026 |
| D11 | Solo founders | Count as segment 1: about 1 to 20 people, every other test unchanged | Decided, 1 Nov 2026 |

## Blockers

- **Segment 1 launch and video tests:** no candidate has passed the launch test, and four of the five that sell or plan to sell something failed the no-video test. A person decides whether to loosen them before the next sprint.
- **The rest of the product list:** name, website and repo for each of the other 4–5 products (Interlister?).
- **Company details** in `knowledge/company.md` are placeholders: name, website, sender, markets, approvers.
- **Approval A-20261030-01:** use the MotionRepo battlecard answers with prospects?
- **Approval A-20261030-02:** does "never contact competitors" cover Repowise? It stays on hold until a person answers.
- **Knowledge proposals:** the solo-founders and one-run positioning changes wait for a person to apply them and confirm the fact sheet again.
- **MotionRepo site fix:** [Collateral-Pipeline PR #42](https://github.com/PanScienceInnovation/Collateral-Pipeline/pull/42) needs review, merge and deploy. A person decides the wording at `dashboard/plan/page.tsx:368`, which depends on what the billing Hub charges.
- **Phases H and A3:** [PR #5](https://github.com/Mohitclan/AGENTS-AGENTS-AND-AGENTS-/pull/5) needs review and merge into main.

## Sprint results

| Date | Product | Leads | Held up in review | Contacted | Replies | Meetings | Plan usage | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 Nov 2026 | MotionRepo | 0 | – | 0 | – | – | Not recorded | J-20261101-02 and solo re-test J-20261101-03. 13 candidates: 11 rejected or not added, 2 open. Nothing drafted |
