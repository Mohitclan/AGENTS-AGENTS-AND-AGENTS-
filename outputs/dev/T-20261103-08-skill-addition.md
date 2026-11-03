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

Every count or rate in a report, brief, review or reply comes from `node scripts/stats.mjs`. Never type one, estimate one or work one out by hand, including a total you could add up from a table.

| Need | Command |
|---|---|
| Leads by status, drafts, sends, replies | `node scripts/stats.mjs pipeline` |
| Reply rate on live sends | `node scripts/stats.mjs reply-rate` |
| First-review pass rate, revisions per task | `node scripts/stats.mjs reviews` |
| Objection recovery rate | `node scripts/stats.mjs objections` |

- **Quote n with every number.** Copy the line the script printed, for example "<k> of <n> closed contacts, n=<n>, 95% Wilson interval <low> to <high>".
- **Below the minimum, say "not enough data".** The script prints "not enough data (n=X, need ≥10)" and no rate. Report that line. Do not round up, do not give the raw figure as a percentage, and do not call it a trend. "2 of 6" is allowed as a tally; "33%" is not.
- **Closed windows only.** A send counts once its reply window has closed (14 days). Sends still inside the window are reported as open, never as misses.
- **Live only.** Demo sends never count toward a rate.
- **Report the interval, not only the rate.** A wide interval means the data cannot separate the result from luck. Say so.
- **Wrong or missing data is a finding.** If the script's count looks off, say so and ask a person. Do not fix it in the text. Use `--json` when you need to pass a figure on.
- Without a script for what you need, write "no script for this yet" and name the gap in your handoffs.

---

## What was adapted, and what was not

- **Adapted (ideas, in our own words):** a script computes every count and rate and prints its sample size; it refuses to print a rate below a minimum sample; only closed windows count; rates carry a 95% Wilson interval.
- **Sources:** La Growth Machine `gtm-system`, MIT: `outreach-icp-finder` and `objection-analyzer` (https://github.com/LaGrowthMachine/gtm-system/blob/main/skills/fuel-my-pipeline/outreach-icp-finder/SKILL.md). Corey Haines `marketingskills`, MIT: the `analytics` skill, for closed windows (https://github.com/coreyhaines31/marketingskills). Review of the survey row: `outputs/reviews/T-20261103-02-r2.md`.
- **Not adopted:** the source's own thresholds for segment analysis (100 contacted, 20 replies, 30 per cell) and its stratified-lift and "stop contacting" steps. Those belong to the later `outcome-analysis` skill, not built here. Our minimum is 10 (assumption 3 in `outputs/reports/2026-11-03-gtm-adoption-shortlist.md`), and the person approving can change it with `--min`.
- **Also to update on install:** the one-line note in the researcher, sales and evaluator briefs that the survey proposed ("counts come from `scripts/stats.mjs`"). Agent files are not edited here.
