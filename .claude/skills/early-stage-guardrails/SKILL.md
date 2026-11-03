---
name: early-stage-guardrails
description: How to plan go-to-market work for an early-stage product, choosing channels and goals that fit the stage and defining success before work starts. Use when planning a campaign, choosing channels or setting targets.
---

# Early-stage guardrails

## Declare the outcome before drafting

Every customer-facing task states, in its brief and in its report:

| Field | Example |
|---|---|
| Metric | Replies from tier A leads |
| Source | `node scripts/leads.mjs list` |
| Baseline | 0, measured today |
| Threshold | 2 replies from 15 contacted |
| Window | 14 days after sending |
| Owner | Who reads the result |

An outcome that wasn't set beforehand can't count as success. Afterwards, call it worked, partial, didn't work, or inconclusive. Inconclusive is a fine answer.

## Choose channels by score

Score each channel 1-5 on: audience density, message fit, speed to a signal, cost, compounding, compliance risk, and our own advantage. Pick one primary, one secondary and one experiment. Drop the rest for now.

## Keep a "not yet" list

Hold these until evidence earns them: paid ads, account-based programs, programmatic SEO, big launches. Say what would change the decision.

## What counts as evidence

- Fit shows in retention, pull and payment, not signups or praise.
- A real deal needs a champion, a budget holder, a costed problem and a trigger.
- Friends and team members aren't evidence.
- Each belief is validated (a dated outside signal) or assumed (name the cheapest test).

## Experiments

Write down the hypothesis, the smallest sample worth reading and the read date before starting. Change one thing at a time. Never report "80%" from six interviews; report "5 of 6". A script gives you that number (see "Counts and rates").

## Counts and rates

Every pipeline, outreach, reply, review and objection count or rate in a report, brief, review or reply comes from a script's printed output, and for those figures the script is `node scripts/stats.mjs`. Never type one, estimate one or work one out by hand, including a total you could add up from one of those tables. (Other numbers are not covered: test totals, rubric score totals, `wc -w` word counts and lint counts come from the tool that prints them.)

| Need | Command |
|---|---|
| Leads by status, drafts, sends, replies | `node scripts/stats.mjs pipeline` |
| Reply rate on live sends | `node scripts/stats.mjs reply-rate` |
| First-review pass rate, revisions per task | `node scripts/stats.mjs reviews` |
| Objection recovery rate, moved forward, smokescreen share | `node scripts/stats.mjs objections` |

- **Quote n with every number.** Copy the line the script printed, for example "<k> of <n> closed contacts, n=<n>, 95% Wilson interval <low> to <high>".
- **Below the minimum, say "not enough data".** The script prints "not enough data (n=X, need ≥10)" and no rate. Report that line. Do not round up, do not give the raw figure as a percentage, and do not call it a trend. "2 of 6" is allowed as a tally; "33%" is not.
- **Never change an answer because of a rate while n is below 15.** From 10 a rate is printed, but it is a rough guide; one reply still moves it a long way. This rule is for the reader, not the script, which only refuses below 10.
- **Closed windows only.** A contact counts once 14 days have passed since its first live send. Contacts still inside the window are reported as open, never as misses.
- **Live only.** Demo sends never count toward a rate.
- **Report the interval, not only the rate.** A wide interval means the data cannot separate the result from luck. Say so.
- **Wrong or missing data is a finding.** If the script's count looks off, say so and ask a person. Do not fix it in the text. Use `--json` when you need to pass a figure on.
- Without a script for what you need, write "no script for this yet" and name the gap in your handoffs.

## When something goes wrong

Fix the check, not just the output. If an error reached a person, add a rule or a lint check so it can't happen again.
