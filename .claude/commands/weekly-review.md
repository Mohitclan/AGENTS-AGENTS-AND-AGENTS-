---
description: Weekly review of the pipeline, task board and knowledge base, with next actions
disable-model-invocation: true
---

Prepare the weekly review:

1. Pipeline: run `node scripts/leads.mjs list` for counts by product and status, leads with no change for more than 7 days, and replies waiting for an answer.
2. Board: open, blocked and awaiting-approval items in `ops/board.md` and `ops/approvals.md`.
3. Knowledge: run `node scripts/kb.mjs status` for unconfirmed and stale files and pending proposals.
4. Ask sales for a pipeline review with the next action for each open lead.
5. Report in under one page: what moved this week, what's stuck and why, the three most valuable actions for next week (each with an owner agent), and the decisions I need to make.
