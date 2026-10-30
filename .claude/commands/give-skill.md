---
description: Give an agent a skill it loads on every run, or take one away
argument-hint: <agent-name> <skill-name> [remove]
disable-model-invocation: true
---

Change an agent's skills: $ARGUMENTS

1. Run `node scripts/skills.mjs list` to see the skills and who has them.
2. If the skill doesn't exist yet, offer to create it with `/new-skill`.
3. To give it: `node scripts/skills.mjs give <agent> <skill>`. To take it away (when I said "remove"): `node scripts/skills.mjs take <agent> <skill>`. Both update the agent's fallback too, and Claude Code asks me to allow them.
4. Run `node scripts/fallbacks.mjs check`, then tell me what the agent now loads. Skills take effect on the agent's next run; for the coordinator, after a restart.
