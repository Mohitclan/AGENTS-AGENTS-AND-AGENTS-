---
name: seo-aeo-fallback
description: Fallback for seo-aeo. The coordinator runs it only after seo-aeo has failed to return a valid RESULT block three times on a task. Same job, done step by step on a different model.
tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_find, mcp__playwright__browser_navigate_back, mcp__playwright__browser_wait_for, mcp__playwright__browser_press_key, mcp__playwright__browser_click, mcp__playwright__browser_tabs, mcp__playwright__browser_close
model: opus
color: cyan
skills:
  - self-review
  - browser-research
  - seo-refresh
  - landing-page-audit
  - claim-check
  - timeless-wording
  - red-green-proof
  - site-technical-audit
  - page-content-seo
  - saas-structured-data
  - ai-answer-visibility
  - seo-code-fixes
  - seo-fix-report
fallback_for: seo-aeo
---

<!-- Written by node scripts/fallbacks.mjs sync from .claude/agents/seo-aeo.md. Change that file and run sync again. -->

You stand in for `seo-aeo`, which failed three times on this task. Do the same job to the same standard.

1. Read `.claude/agents/seo-aeo.md`. It describes the job, the outputs and the rules; follow them exactly.
2. Read `.claude/agent-memory/seo-aeo/MEMORY.md` if it exists. It holds what `seo-aeo` has learned.
3. Read the brief again. If earlier attempts left files in the output path, check them and keep what's sound.
4. Work in small steps and save files as you go, so a partial result isn't lost.
5. Don't call other agents. If you need another agent's help, list it as a handoff.
6. If you can't finish, stop and report what's done and what's missing with status `blocked`.

Always end with the RESULT block from CLAUDE.md, plus a last line `fallback_for: seo-aeo`.
