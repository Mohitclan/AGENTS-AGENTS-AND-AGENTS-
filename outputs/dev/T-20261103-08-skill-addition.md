# Draft addition to `.claude/skills/early-stage-guardrails/SKILL.md`

Task T-20261103-08, package P4. A draft: nothing here has been installed, and `.claude/skills/` is untouched. Skills change only with a person's yes.

## Where it goes

One new section in `.claude/skills/early-stage-guardrails/SKILL.md`, after `## Experiments` and before `## When something goes wrong`. It also replaces one sentence inside `## Experiments`.

**Edit 1.** In `## Experiments`, replace

```
Never report "80%" from six interviews; report "5 of 6".
```

with

```
Never report "80%" from six interviews; report "5 of 6". A script gives you that number (see "Counts and rates").
```

**Edit 2.** Insert the section below.

---

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

---

## What was adapted, and what was not

- **Adapted (ideas, in our own words):** a script computes every count and rate and prints its sample size; it refuses to print a rate below a minimum sample; only closed windows count; rates carry a 95% Wilson interval.
- **Sources:** La Growth Machine `gtm-system`, MIT: `outreach-icp-finder` and `objection-analyzer` (https://github.com/LaGrowthMachine/gtm-system/blob/main/skills/fuel-my-pipeline/outreach-icp-finder/SKILL.md). Corey Haines `marketingskills`, MIT: the `analytics` skill, for closed windows (https://github.com/coreyhaines31/marketingskills). Review of the survey row: `outputs/reviews/T-20261103-02-r2.md`.
- **Not adopted:** the source's own thresholds for segment analysis (100 contacted, 20 replies, 30 per cell) and its stratified-lift and "stop contacting" steps. Those belong to the later `outcome-analysis` skill, not built here. Our minimum is 10 (assumption 3 in `outputs/reports/2026-11-03-gtm-adoption-shortlist.md`), and the person approving can change it with `--min`.
- **Also on install:** the survey proposed a one-line note in the researcher, sales and evaluator briefs; the text and the reasons are in the next section.

## Who loads it, and the brief line

`early-stage-guardrails` is preloaded only by `.claude/agents/coordinator.md` (checked: it is the only agent file that lists it under `skills:`). Installing the section there does not by itself reach the people who write the counts. Two ways, for the approver to pick (agent files are not edited here):

- **A. The coordinator adds one line to every brief** for researcher, sales and evaluator (the task-briefs skill is where that line would go).
- **B. Add the same line to those agents' own files.** `sales` and `evaluator` have Bash and can run the script. `researcher` and `marketing` have no Bash tool, so they cannot run it: for them the coordinator runs the command and pastes its output into the brief, and they quote that.

The brief line, ready to paste:

> Any pipeline, reply, review or objection count or rate you report comes from `node scripts/stats.mjs` (pipeline, reply-rate, reviews, objections), quoted with its n. Where it prints "not enough data", write that. Never type, estimate or add up such a number, and never change an answer because of a rate while n is below 15. If you can't run the script, use the output pasted in this brief; if there is none, say "no figure yet".
