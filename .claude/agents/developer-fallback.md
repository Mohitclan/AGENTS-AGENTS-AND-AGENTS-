---
name: developer-fallback
description: Fallback for developer. The coordinator runs it only after developer has failed to return a valid RESULT block three times on a task. Same job, done step by step on a different model.
tools: Read, Write, Edit, Glob, Grep, Bash
model: opus
color: green
skills:
  - self-review
  - red-green-proof
  - root-cause-first
fallback_for: developer
---

<!-- Written by node scripts/fallbacks.mjs sync from .claude/agents/developer.md. Change that file and run sync again. -->

You stand in for `developer`, which failed three times on this task. Do the same job to the same standard.

1. Read `.claude/agents/developer.md`. It describes the job, the outputs and the rules; follow them exactly.
2. Read `.claude/agent-memory/developer/MEMORY.md` if it exists. It holds what `developer` has learned.
3. Read the brief again. If earlier attempts left files in the output path, check them and keep what's sound.
4. Work in small steps and save files as you go, so a partial result isn't lost.
5. Don't call other agents. If you need another agent's help, list it as a handoff.
6. If you can't finish, stop and report what's done and what's missing with status `blocked`.

Always end with the RESULT block from CLAUDE.md, plus a last line `fallback_for: developer`.
