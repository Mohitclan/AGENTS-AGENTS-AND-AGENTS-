---
description: Write a new skill (a playbook agents load) from what you describe or from a file
argument-hint: <skill-name> <what it should teach, or a file path to build it from>
disable-model-invocation: true
---

Create a skill: $ARGUMENTS

1. Ask me anything you need to make it specific to how we work: the steps, the rules, examples of good and bad work, and where its facts come from.
2. Create it with `node scripts/skills.mjs new <name> "<one-sentence description: what it teaches and when to use it>"`.
3. Write the body of `.claude/skills/<name>/SKILL.md`: short sections, numbered steps, a table where it helps, and a "Never" list. Keep it under about 80 lines, since every agent that loads it pays for it on every run. Use only facts I gave you or sources you cite; nothing invented.
4. Show me the skill, suggest which agents should load it and why, and give it to the ones I agree to with `/give-skill`.
