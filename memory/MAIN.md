# Main memory

The team's shared memory. Every agent reads it at the start of every task (`CLAUDE.md` imports it). It holds decisions, preferences and lessons learned. Product and company facts don't go here: they live in `knowledge/` and need a person to confirm them.

Add and remove entries with `/teach` and `/forget`, or with `node scripts/memory.mjs`. A hook blocks direct edits, so every entry has a date, a source and an author. Keep it short: every line costs tokens on every task.

## Decisions

- 2026-10-30 · The team runs only on the Claude Max plan: no API key, no paid tools, and extra usage stays off. (source: told by the founders on 2026-10-30 · by: human)

## Preferences

## Lessons

- 2026-10-30 · Joining two confirmed facts can create a new unconfirmed claim ('18% GST' + 'invoice' is not 'GST invoice'). The joined claim needs its own primary source. (source: outputs/reviews/T-20261030-03-r2.md · by: coordinator)
