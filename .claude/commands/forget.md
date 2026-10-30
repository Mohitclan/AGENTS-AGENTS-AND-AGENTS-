---
description: Remove an entry from team memory or from one agent's memory
argument-hint: <main | agent-name> <entry number or words from the entry>
disable-model-invocation: true
---

Remove from memory: $ARGUMENTS

1. Run `node scripts/memory.mjs list <target>` and find the entry I mean. If more than one could match, show them and ask which.
2. Show me the entry and remove it with `node scripts/memory.mjs remove <target> <number>`. Claude Code asks me to allow the removal.
3. If the entry was wrong rather than out of date, ask whether something correct should replace it, and add that with `/teach`.
