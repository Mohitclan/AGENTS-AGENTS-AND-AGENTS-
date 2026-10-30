# Sales and growth team for Claude Code

An AI team that helps sell our SaaS products: a coordinator that plans and delegates, an evaluator that checks every deliverable, and nine specialists covering knowledge, research, leads, outreach, sales, marketing, demos, docs and development. Each specialist has its own memory, preloaded skills, a short list of colleagues it may ask directly, and a fallback agent that takes over if it fails three times. Everything they produce is a draft in this folder. Nothing is sent, published, pushed or written to a CRM without your yes.

It runs entirely on a Claude Max plan: no API key, no paid tools. Keep extra usage switched off; the only limit is the plan's usage window.

## Docs

- [Architecture](docs/ARCHITECTURE.md): how the system works, with diagrams
- [Rollout plan](docs/PLAN.md): phases, tasks, owners, done-when tests, risks
- [Status log](docs/ROADMAP.md): what's done, decided and blocked
- [PDF of the architecture and plan](docs/AI-Sales-Growth-Team.pdf), rebuilt with `node scripts/build-docs-pdf.mjs` (needs Google Chrome and internet)

## The team

| Agent | Model | Does |
|---|---|---|
| `coordinator` | Opus | Your main session. Plans, delegates, routes handoffs, tracks the board and approvals, reports |
| `evaluator` | Opus | Runs automated checks, verifies sources, scores work against `evaluation/rubrics.md` |
| `knowledge-base` | Sonnet | Builds product fact sheets from websites and repos; answers product questions |
| `researcher` | Sonnet | Markets, competitors, channels |
| `lead-generator` | Sonnet | Finds, evidences and scores leads; imports them through the lead script |
| `outreach` | Sonnet | Email and LinkedIn sequences for qualified leads |
| `sales` | Sonnet | Replies, call prep, proposals, objections, pipeline reviews |
| `marketing` | Sonnet | Positioning, landing pages, SEO, content, launches, PR |
| `demo-handler` | Sonnet | Demo plans, scripts, environment checklists, follow-ups |
| `docs-handler` | Sonnet | Help docs, onboarding guides, one-pagers, docs audits |
| `developer` | Sonnet | Small sales-blocking fixes on a local branch, with tests |
| `<agent>-fallback` | The other model | One per specialist and the evaluator. Takes over after three failed attempts |

To change cost or quality, edit the `model:` line in an agent's file (`haiku`, `sonnet` or `opus`), then run `node scripts/fallbacks.mjs sync` so its fallback follows. If a model is overloaded, Claude Code switches to `fallbackModel` in `settings.json` (Sonnet, then Haiku).

## How a request flows

```
You ──▶ coordinator ──▶ specialist ──▶ file in outputs/ ──▶ evaluator
             ▲                                                  │
             └──── PASS: report to you   REVISE: back to specialist (max 2)
                   Anything external: ops/approvals.md, waits for your yes
```

- **Asking each other.** A specialist can call the colleagues listed under `can_ask:` in its file, one level deep, for a fact or a small piece of work. A hook blocks anyone else and logs every call in `ops/messages.md`. Bigger work goes back to the coordinator as a handoff, up to three steps from your original request.
- **Retries and fallbacks.** Every specialist must end with a RESULT block. A hook sends a reply without one back, up to three attempts. After the third, the hook tells the coordinator to give the task to `<agent>-fallback`, and logs the switch in `ops/fallbacks.md`. If the fallback fails too, the task is escalated to you.
- **Memory.** `memory/MAIN.md` is the main memory every agent loads. Each agent also has its own in `.claude/agent-memory/<agent>/MEMORY.md`. Feed either with `/teach`.
- **Skills.** Playbooks in `.claude/skills/`. Each agent preloads the ones listed under `skills:` in its file; change that with `/give-skill`.
- Every task is tracked in `ops/board.md`; every action that needs approval is recorded in `ops/approvals.md`.

```
coordinator ──▶ outreach ──(asks)──▶ knowledge-base      allowed: in outreach's can_ask list
                   │ no RESULT block
                   ├─▶ attempt 2 ─▶ attempt 3 ─▶ still none
                   ▼
coordinator ◀── FALLBACK note ──▶ outreach-fallback ──▶ evaluator ──▶ you
```

## What's enforced by code, and what by instructions

| Rule | Enforced by |
|---|---|
| Agents can't edit confirmed knowledge or mark knowledge confirmed | `scripts/guard.mjs` hook: blocks the edit, checking the file as it would be after the edit, in any letter case |
| Leads are only written through `scripts/leads.mjs` | Hook, plus the script's validation (required evidence, sourced contacts, valid score, duplicate merging), a lock so parallel runs don't overwrite each other, and an allowed order of statuses |
| Confirming knowledge needs you | `settings.json` and the hook ask before any command that runs `kb.mjs confirm` |
| Lead statuses `approved`, `contacted` and `won`, and `set-status --force`, need you | The hook asks |
| `git push` and PR commands need you | `settings.json` asks; force-push is denied |
| `.env` files can't be read, in any folder (`.env.example` can) | The hook blocks Read and Bash; `settings.json` deny rules as a backup |
| An agent calls only the colleagues in its `can_ask` list, one level deep; fallbacks call nobody | `scripts/team-hooks.mjs` blocks other calls; `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=2` stops deeper chains |
| A reply without a RESULT block is retried, then handed to the fallback after three attempts | `scripts/team-hooks.mjs` (SubagentStop and PostToolUse hooks); the coordinator launches the fallback when the hook tells it to |
| Main memory is written only through the memory script; agents write only their own memory; the call and fallback logs can't be edited | The guard hook |
| Removing memory and changing skills need you | The hook asks |
| Drafts only, no invented facts, approval list, review before reporting | Agent instructions and `CLAUDE.md` |

The instruction-based rules depend on the agents following them, and Claude Code's normal permission prompts are the backstop. Keep the default permission mode so actions outside the allow list ask you first.

## Setup

1. **Open this folder in Claude Code**: in the Claude desktop app's Code tab, or with the `claude` CLI in a terminal. The CLI installs with:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
2. **Fill in `knowledge/company.md`**, then confirm it:
   ```bash
   node scripts/kb.mjs confirm knowledge/company.md
   ```
3. **Start the team**: a new session in this folder starts as the coordinator. From a terminal:
   ```bash
   claude
   ```
   Approve the HubSpot, Notion and Slack servers from `.mcp.json` if you use them, and sign in with `/mcp`. If you don't use one, remove it from `.mcp.json` and from the agents' `tools` lines.
4. **Check the agents loaded** with `/agents`. You should see 21 project agents: the coordinator, ten specialists and their ten fallbacks. Run the tests once with `node scripts/test.mjs`.
5. **Add each product:**
   ```text
   /add-product <name> <website> <owner/repo>
   ```
   Review the fact sheet in `knowledge/products/`, answer its open questions, then confirm it with `node scripts/kb.mjs confirm knowledge/products/<slug>.md`.
6. **Start selling:**
   ```text
   /lead-sprint <product-slug> 15
   ```

## Commands

| Command | What it does |
|---|---|
| `/add-product <name> <website> [owner/repo]` | Builds and reviews a product fact sheet |
| `/lead-sprint <slug> [n]` | Research if needed, then leads, review, outreach drafts and an approval list |
| `/demo-prep <lead-id> [details]` | Demo plan, call prep and follow-ups for one lead |
| `/weekly-review` | Pipeline, board, knowledge and team health (fallbacks, agent calls, memory size), with next actions |
| `/teach <main\|agent> <fact or file>` | Adds to the main memory or one agent's memory, with a source |
| `/forget <main\|agent> <number or words>` | Removes a memory entry |
| `/give-skill <agent> <skill> [remove]` | Gives an agent a skill it loads on every run, or takes it away |
| `/new-skill <name> <what it teaches>` | Writes a new skill with you |

You can also just ask the coordinator in plain language, for example "Audit the landing page and onboarding for <product> and list what's costing us sign-ups."

## Scripts

```bash
node scripts/leads.mjs list --product <slug> --status qualified --tier A
node scripts/leads.mjs show <lead-id>
node scripts/leads.mjs set-status <lead-id> contacted "sent from Gmail on 2026-11-02"
node scripts/leads.mjs check
node scripts/kb.mjs status
node scripts/check-links.mjs <file>
node scripts/memory.mjs list                  # every memory file; add a name for its entries
node scripts/memory.mjs add main "<entry>" --source "<where from>" --by <you> --section lessons
node scripts/memory.mjs check
node scripts/skills.mjs list                  # skills and which agents load them
node scripts/skills.mjs give <agent> <skill>
node scripts/fallbacks.mjs check              # fallbacks match their agents
node scripts/test.mjs                         # tests for the hooks and scripts
```

`pipeline/leads.csv` is rewritten after every change, so you can open the pipeline in Excel or Google Sheets.

## Folder map

```
CLAUDE.md                 shared context: products, team, protocol, rules
.claude/agents/           the coordinator, ten specialists and ten fallbacks
.claude/agent-memory/     each agent's own memory
.claude/skills/           skills (playbooks) agents preload
.claude/commands/         slash commands
.claude/settings.json     main agent, permissions, hooks, fallback models, nesting depth
.mcp.json                 HubSpot, Notion, Slack connections (OAuth, no secrets)
memory/MAIN.md            main memory, loaded by every agent
docs/                     architecture, rollout plan, status log, PDF
knowledge/                company.md, products/, competitors/, proposals/
pipeline/                 leads.jsonl, leads.csv, inbox/, lead-schema.md
outputs/                  research, outreach, sales, marketing, demos, docs, dev, reviews
ops/                      board.md, approvals.md, messages.md, fallbacks.md, runs/ (not committed)
evaluation/rubrics.md     scoring rules per work type
scripts/                  leads, knowledge, memory, skills, fallbacks, link checks, hooks, tests, docs PDF
repos/                    product repo clones (not committed)
```

## Privacy

`pipeline/leads.jsonl` and `leads.csv` contain business contact details. Keep this folder in a private repo, honour opt-outs, and delete leads you no longer need.
