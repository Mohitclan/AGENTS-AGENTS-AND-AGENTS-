# Sales and growth team for Claude Code

An AI team that helps sell our SaaS products: a coordinator that plans and delegates, an evaluator that checks every deliverable, and nine specialists covering knowledge, research, leads, outreach, sales, marketing, demos, docs and development. Everything they produce is a draft in this folder. Nothing is sent, published, pushed or written to a CRM without your yes.

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

To change cost or quality, edit the `model:` line in an agent's file (`haiku`, `sonnet` or `opus`).

## How a request flows

```
You ──▶ coordinator ──▶ specialist ──▶ file in outputs/ ──▶ evaluator
             ▲                                                  │
             └──── PASS: report to you   REVISE: back to specialist (max 2)
                   Anything external: ops/approvals.md, waits for your yes
```

- Specialists never talk to each other directly. They list handoffs in their result, and the coordinator decides whether to act on them, up to three steps from your original request.
- Every task is tracked in `ops/board.md`; every action that needs approval is recorded in `ops/approvals.md`.

## What's enforced by code, and what by instructions

| Rule | Enforced by |
|---|---|
| Agents can't edit confirmed knowledge or mark knowledge confirmed | `scripts/guard.mjs` hook: blocks the edit |
| Leads are only written through `scripts/leads.mjs` | Hook, plus the script's validation (required evidence, sourced contacts, valid score, duplicate merging) |
| Confirming knowledge needs you | `settings.json` always asks before `kb.mjs confirm` |
| `git push` and PR commands need you | `settings.json` asks; force-push is denied |
| `.env` files can't be read | `settings.json` deny rules |
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
4. **Check the agents loaded** with `/agents`. You should see the eleven project agents.
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
| `/weekly-review` | Pipeline, board and knowledge status, with next actions |

You can also just ask the coordinator in plain language, for example "Audit the landing page and onboarding for <product> and list what's costing us sign-ups."

## Scripts

```bash
node scripts/leads.mjs list --product <slug> --status qualified --tier A
node scripts/leads.mjs show <lead-id>
node scripts/leads.mjs set-status <lead-id> contacted "sent from Gmail on 2026-11-02"
node scripts/leads.mjs check
node scripts/kb.mjs status
node scripts/check-links.mjs <file>
```

`pipeline/leads.csv` is rewritten after every change, so you can open the pipeline in Excel or Google Sheets.

## Folder map

```
CLAUDE.md                 shared context: products, team, protocol, rules
.claude/agents/           the eleven agents
.claude/commands/         slash commands
.claude/settings.json     main agent, permissions, hook
.mcp.json                 HubSpot, Notion, Slack connections (OAuth, no secrets)
docs/                     architecture, rollout plan, status log, PDF
knowledge/                company.md, products/, competitors/, proposals/
pipeline/                 leads.jsonl, leads.csv, inbox/, lead-schema.md
outputs/                  research, outreach, sales, marketing, demos, docs, dev, reviews
ops/                      board.md, approvals.md
evaluation/rubrics.md     scoring rules per work type
scripts/                  leads, knowledge, link checks, guard hook, docs PDF
repos/                    product repo clones (not committed)
```

## Privacy

`pipeline/leads.jsonl` and `leads.csv` contain business contact details. Keep this folder in a private repo, honour opt-outs, and delete leads you no longer need.
