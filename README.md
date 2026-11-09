# Sales and growth team for Claude Code

An AI team that helps sell our SaaS products: a coordinator that plans and delegates, an evaluator that checks every deliverable, and nine specialists covering knowledge, research, leads, outreach, sales, marketing, demos, docs and development. Each specialist has its own memory, preloaded skills, a short list of colleagues it may ask directly, and a fallback agent that takes over if it fails three times. Everything they produce is a draft in this folder. Nothing is sent, published, pushed or written to a CRM without your yes.

It runs entirely on a Claude Max plan: no API key, no paid tools. Keep extra usage switched off; the only limit is the plan's usage window.

## Docs

- [Architecture](docs/ARCHITECTURE.md): how the system works, with diagrams
- [Rollout plan](docs/PLAN.md): phases, tasks, owners, done-when tests, risks
- [Status log](docs/ROADMAP.md): what's done, decided and blocked
- [Credits](docs/CREDITS.md): open-source work our skills and checks draw on
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
| An opt-out is final, across every product | `leads.mjs suppress`: imports refused, outreach statuses blocked. `replies.mjs check` suppresses clear opt-out and complaint replies at once |
| A real send needs a person | The hook asks before any `send-email.mjs` run that is not `--dry-run`, and before anyone writes a Yes into `ops/approvals.md`. A live send then marks the lead `contacted`. Pilot exception: after each task, Jarvis sends [TEST] copies of drafts that passed review to `pilot.test_recipients` only (`scripts/send-tests.mjs`, on while `pilot.auto_test_sends` is true). After a person ends the pilot on the Emails page (types `go live`), a tick there is that person's yes: the page writes the approval row, sends the email, and schedules a follow-up ticked early for its working day (`scripts/followups.mjs`). Nothing else ends the pilot |
| Any answer stops the sequence | `replies.mjs` records replies, opt-outs and bounces in `ops/replies.jsonl`; `send-email.mjs` refuses a live send to anyone at a company that answered, or to an address that bounced |
| Drafts pass automatic checks before review | `scripts/lint-copy.mjs`; the evaluator treats a failure as REVISE |
| Drafts only, no invented facts, approval list, review before reporting | Agent instructions and `CLAUDE.md` |

The instruction-based rules depend on the agents following them, and Claude Code's normal permission prompts are the backstop. Keep the default permission mode so actions outside the allow list ask you first.

## Run it from the browser (the pilot)

Once per machine: install Claude Code, run `claude` once in this folder and accept the trust question, and save the mail password in `.env` (`SMTP_PASS=...`, a Google app password for the sending mailbox). Then:

```bash
npm install            # once
npm run check          # what is ready and what is not, including a mailbox sign-in test (sends nothing)
npm start              # starts mission control and opens it in Chrome (or your default browser), together
npm run stop           # stops mission control; a task that is running keeps going
```

Ask the page anything out loud, in Chrome, Edge or Safari (not an app's built-in browser, which blocks the microphone): press the mic button at the top right of mission control, allow the microphone, and say "where are the leads?" or "what is the researcher doing?". A question is answered as soon as you stop talking: the guide (`scripts/guide.mjs`) reads the live team state with Claude Code on your Claude login, read-only, so it counts against your plan's usage limits and costs nothing else. The answer is spoken, and the page may open the right tab. Nothing listens unless the panel is open. To give the team work, say the task and end with "go start", or type it in the box on the Overview page and press **Send to the team**. The agents run it start to finish without asking anything. While `pilot.allow_only` in `ops/mail-config.json` lists addresses, the only emails that go out are [TEST] copies of drafts that passed review, sent to the people in `pilot.test_recipients` after each task; no prospect can be emailed.

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
| `/do <any task>` | **Jarvis:** runs the whole chain on autopilot and gives you the finished result and a report |

## Jarvis: hand over a task, get the result

```bash
node scripts/jarvis.mjs do "Write a one-page MotionRepo battlecard"   # run one task now
node scripts/jarvis.mjs add "Run the first MotionRepo lead sprint, 15 leads"  # queue tasks...
node scripts/jarvis.mjs run                                          # ...and work through them in order
node scripts/jarvis.mjs list                                         # the queue (also ops/queue.md)
node scripts/jarvis.mjs usage                                        # how full your Max plan windows are
```

- **One task, one session.** Each task runs as a headless coordinator session (`claude -p`) on your Max plan login: the whole chain, reviews and revisions, with no questions mid-way.
- **The result** is a report in `outputs/reports/<id>.md`: the result, files, what needs your approval, questions, assumptions made, lessons recorded and suggested next tasks.
- **Nothing leaves the folder.** Sends, posts and pushes still wait in `ops/approvals.md`.
- **Lessons:** after each task, review fixes become lessons in the agents' memory, so the team improves with every task.
- **Usage guard:** no task starts while a plan window is at or over 85% (`JARVIS_STOP_AT`), and a task the limit cuts off goes back in the queue.
- **In the app**, `/do <task>` does the same in your open session.
- **Use the page:** `node scripts/dashboard.mjs` serves http://127.0.0.1:4317, where you give the team a task, watch it work and read the report. It also shows the leads, the team and what's waiting for a person. It only listens on this computer, and its only actions are adding, starting and cancelling Jarvis tasks. Keep its terminal open while a task runs. To put it online with a password, follow [docs/DEPLOY-team-page.md](docs/DEPLOY-team-page.md).

**Mission control** (`node scripts/control.mjs`, http://127.0.0.1:4318) is the fuller page for running the team from a browser, and the one to host on your domain. Every agent has its own animated character, a Gem, that reacts to its real state ([docs/AVATARS.md](docs/AVATARS.md)):

- **Home:** after a short black opening, the 3D office fills the screen; the glowing dot at the top opens the navigation, and "Watch the demo" plays a narrated task from start to approval.
- **Working:** the same 3D office with its lists. Each agent is a character that sits at its desk to code, write, review or research while its real state says so, waits or shows a problem beside its desk, and between tasks gets coffee, rests on the sofa, looks out of the window or chats. A Preview panel tries states without running anything, a demo switch plays a simulated task, and the badge always says which you're seeing. If WebGL isn't available it falls back to the flat office; a **2D** button switches by hand ([docs/OFFICE3D.md](docs/OFFICE3D.md)).
- **Gem gallery:** every gem in every state and size, with a simulator. **The dock** in the corner shows the busy gems and can be hidden, resized, muted or popped out on top of other windows.
- **Overview:** give the team a task, see the queue, the numbers that matter, everything waiting for you and a live feed. Each agent sits at a desk with its own avatar; when a task runs, the agent doing the work lights up, types, and shows what it's doing ("Opened https://…", "Wrote outputs/research/…"), and hand-offs fly from desk to desk.
- **One page per agent:** what it made (each file opens in a reader), everything it did, its failures and why, its tasks on the board, and its memory and skills.
- **Logs:** every step of every agent, as a table or as one column per agent, filtered by agent, kind (web, file, hand-off, review, copy check, email, reply…), failures only, or a search.
- **Leads, Reports, Needs you:** the pipeline, every task report and review, and the approvals, blocked tasks, backups used and knowledge to confirm.

It reads the same files as everything else (the Jarvis run logs give the live view), and its only actions are giving, starting and cancelling tasks. To host it, follow [docs/DEPLOY-team-page.md](docs/DEPLOY-team-page.md), section "Hosting mission control instead".

You can also just ask the coordinator in plain language, for example "Audit the landing page and onboarding for <product> and list what's costing us sign-ups."

## Scripts

```bash
node scripts/leads.mjs list --product <slug> --status qualified --tier A
node scripts/leads.mjs show <lead-id>
node scripts/leads.mjs set-status <lead-id> contacted "sent from Gmail on 2026-11-02"
node scripts/leads.mjs check
node scripts/kb.mjs status
node scripts/check-links.mjs <file>
node scripts/lint-copy.mjs <file> --type email      # automatic checks: general, email, social or seo
node scripts/lint-copy.mjs mine                      # failures that keep repeating
node scripts/send-email.mjs --draft <file> --email <n> --to <address> [--approval <A-id>] [--dry-run]   # one reviewed email; a live send needs a Yes row
node scripts/send-tests.mjs <draft> | --since <ISO time> [--dry-run]   # pilot: [TEST] copies of passed drafts to the test recipients (Jarvis runs it after each task)
node scripts/mail-check.mjs                          # is the sending mailbox ready for real email: SPF, DMARC, DKIM and the mail settings
node scripts/followups.mjs [--dry-run]               # follow-ups a person scheduled on the Emails page: what is due (--dry-run: what would go now)
node scripts/replies.mjs check [--dry-run]           # read the inbox for answers to our sends; act on opt-outs, replies and bounces
node scripts/replies.mjs watch --every 15            # the same check every 15 minutes; keep the terminal open
node scripts/replies.mjs list                        # answers recorded so far (saved in outputs/replies/)
node scripts/leads.mjs gate --product <slug>         # Go, Conditional or Stop before outreach
node scripts/leads.mjs suppress <domain|email|profile URL> "<reason>"   # an opt-out, for good
node scripts/memory.mjs list                  # every memory file; add a name for its entries
node scripts/memory.mjs add main "<entry>" --source "<where from>" --by <you> --section lessons
node scripts/memory.mjs check
node scripts/skills.mjs list                  # skills and which agents load them
node scripts/skills.mjs give <agent> <skill>
node scripts/fallbacks.mjs check              # fallbacks match their agents
node scripts/test.mjs                         # tests for the hooks and scripts
node scripts/jarvis.mjs list                  # the Jarvis queue
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
outputs/                  research, outreach, sales, marketing, demos, docs, dev, reviews, reports (Jarvis)
ops/                      board.md, approvals.md, messages.md, fallbacks.md, queue.json/queue.md (Jarvis), runs/ (not committed)
evaluation/rubrics.md     scoring rules per work type
scripts/                  leads, knowledge, memory, skills, fallbacks, link checks, hooks, tests, docs PDF
repos/                    product repo clones (not committed)
```

## Privacy

`pipeline/leads.jsonl` and `leads.csv` contain business contact details. Keep this folder in a private repo, honour opt-outs, and delete leads you no longer need.
