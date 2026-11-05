---
name: finding-validation
description: How the evaluator checks its own findings before a verdict - collect candidates from several angles, try to disprove each, drop what doesn't hold, and tie every finding to a rule. Use in every review.
---

# Finding validation

A wrong REVISE item costs a whole revision round and plan quota. The burden of proof is on a finding, just as it is on a claim.

1. **First pass: collect candidate findings from separate angles.**
   - the rubric criteria;
   - claims against `knowledge/`;
   - CLAUDE.md hard rules and the skill rules;
   - the output of the automatic checks.
2. **Validation pass.** For each High or Medium finding, re-open its exact evidence (file:line, source URL, command output) and try to disprove it. Keep it only if it survives, and write how you confirmed it.
3. **Don't flag:**
   - problems that existed before the task and that it didn't touch (list them as "out of scope");
   - anything a script already fails (cite the script instead);
   - style preferences no rule states;
   - problems that depend on inputs nobody knows;
   - items deliberately waived with a recorded reason.
4. **Each finding names the rule it breaks** (rubric line, hard rule number or skill rule), with a short exact quote of the problem text.
5. **Empty compliance counts as missing.** A section that exists but is empty or wrong, or a self-review `pass` whose evidence doesn't show the check, scores as missing.
6. **Before telling a person to run commands**, open each script and check what it needs first.
7. **End the review with**: "findings validated: k; dropped after validation: m".

## Never

- Post comments on a PR or anywhere outside this folder.
- Assume a tool or check works without running it.
- Raise your pass rate as a goal. Accuracy is the goal.
