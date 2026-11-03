---
name: stalled-deal
description: How to diagnose a deal that has gone quiet or ended in no decision, and what to do next. Use when a lead in replied, meeting or trial has stopped moving, or for pipeline reviews.
---

# Stalled deal

## Quiet or declined?

- **Quiet:** they wrote to us at least once, then went silent. A lead that never replied is still in the outreach sequence.
- **Declined:** they said no, chose another option, left, the company closed, or they opted out.

A decline skips the cause table: record the reason in their words, with the option they chose, and stop writing. Retire it, or Watch it if the reason was timing and they gave a date.

- **An opt-out is always Retire.** `node scripts/leads.mjs suppress <email> "opted out on <date>"`; never Watch or Re-enter. `suppress` sets the lead to `disqualified`; don't also mark it `lost`.
- Silence and a plain "no" to a question are not opt-outs; if unsure, mark it needs a person.
- Never relabel a decline as stalled.
- **If the contact left the company,** a new person there is a **new contact**: they get their own fit and contact checks and their own approvals, and nothing carries over. Retire the old contact.

If quiet, rule out an auto-reply, a holiday or a date they gave, and wait for it. Use no fixed count of silent days. Then use the cause table. A "still a priority?" note gives its true reason for writing and a plain way to say no.

## If it went quiet, name why

| Cause | Sign | What helps |
|---|---|---|
| Status quo | "We're fine for now", no pain felt | Show the cost of today's way. Don't add urgency |
| Indecision | They agree it's good but can't choose or fear a mistake | Lower the risk: one recommendation, a narrow first step, a way out |
| Wrong person | Keen user, no budget | Ask to bring in the buyer, with a one-pager they can forward |
| Lost to another option | They've gone quiet after comparing | Ask directly, and record why |

Fake urgency makes indecision worse. Never invent a deadline.

## Rules

1. Give one recommendation, not a menu of options.
2. Cap further evaluation: agree what they need to see, and by when.
3. Offer a narrow first phase with a clear way out. Anything beyond a standard trial is `[NEEDS APPROVAL]`.
4. Plan backward from the buyer's own date, with steps they own. It's a shared plan, never leverage.
5. Send at most one "is this still a priority?" note, then close the loop politely.

## When to stop

Mark the lead with a verdict and a reason:

- **Re-enter:** a new signal has appeared.
- **Watch:** right fit, wrong time. Set a date to check.
- **Retire:** poor fit, so mark it `lost`.

Record the buyer's stated reason in their words. A CRM reason, a sales call and a neutral conversation answer different questions, so note which one you have.
