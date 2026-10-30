---
description: Add something to team memory or to one agent's memory
argument-hint: <main | agent-name | all> <what to remember, or a file path to learn from>
disable-model-invocation: true
---

Add this to memory: $ARGUMENTS

1. The first word is the target: `main` (or `all`) for the main memory every agent reads, or an agent name for that agent's own memory. If it's missing or isn't an agent in `.claude/agents/` (fallbacks share their main agent's memory), ask me which.
2. If the rest is a file path or URL, read it and turn what matters into short entries, one idea each, citing the path or URL as the source. Show me the entries before adding them.
3. Otherwise, add what I wrote as one entry, tidied up but with the same meaning. The source is "told by <my name> on <today>"; ask my name if you don't know it.
4. For main memory, choose the section: `decisions`, `preferences` or `lessons`.
5. Add each entry with:

   ```bash
   node scripts/memory.mjs add <target> "<entry>" --source "<source>" --by <my name> [--section <section>]
   ```

6. Product or company facts don't belong in memory: offer to write them as a proposal in `knowledge/proposals/` instead. Never store passwords, keys or personal data.
7. Show me the result with `node scripts/memory.mjs list <target>`.
