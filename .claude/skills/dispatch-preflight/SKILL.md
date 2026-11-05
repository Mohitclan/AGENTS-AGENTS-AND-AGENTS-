---
name: dispatch-preflight
description: The coordinator's checks before launching specialists - can each task actually be done with the owner's tools and inputs, do tasks conflict, how much effort and when to stop, and how to launch. Use before every delegation and every chain.
---

# Dispatch preflight

Many costly failures could have been seen before dispatch: tests that couldn't run, an agent with no shell asked to lint, a lead test that launch listings can never meet.

## 1. Can each task be done?

For each task, check that:
- the owner's `tools:` line covers every step in the brief (shell, WebFetch, Write);
- every command the brief asks for is on the allow list in `.claude/settings.json`. In this repo the test suite is `node scripts/test.mjs`; plain `node --test` is refused;
- its input files exist;
- a customer-facing task has a confirmed fact sheet;
- a code task's repo has its dependencies installed;
- every test in the brief can be met from sources the agent can reach (lead-sources lists what's blocked).

For each "no": run the step yourself, change the brief, or ask once. State any score ceiling in the brief.

## 2. Launch in the foreground

Launch every specialist with `run_in_background: false`. In background mode, a Bash call that would need a prompt is refused, and the agent comes back blocked for reasons that have nothing to do with its work (J-20261104-01).

## 3. Do tasks conflict?

- **One row per pair of tasks** that share a file, output, branch or definition: what one produces and what the other uses.
- **One row per task**: does the brief contradict itself, a hard rule, a skill rule or a rubric auto-fail?
- **Rule on each row**, and log it under Assumptions as "Ruling: what, why, cost if wrong".

"The scan is clean" only counts with the rows written.

## 4. Effort and a stop rule in every brief

- **Scale to the task**: one agent and a few sources for a lookup; two to four parallel tasks for a comparison; more only for broad research.
- **Give a stop rule**, for example "stop when N candidates are checked, or after 5 searches in a row find nothing new".

## 5. Parallel only when independent

No shared file, branch or state, and never two writers on one file.

## 6. Brief additions

- Say what earlier tasks decided that this brief can't know.
- Hand over file paths, never pasted history.

## Never

- Let "decide and keep going" cover sends, posts, pushes or confirming knowledge. Those still need a person's specific yes.
