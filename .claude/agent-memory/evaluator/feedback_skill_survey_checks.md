---
name: skill-survey-checks
description: How to review surveys of external skill repos and MCP connectors - verbatim source reads, licence checks, adopted-method screening, hook coverage of MCP tools
metadata:
  type: feedback
---

When the GitHub API rate-limits (403 on every call), shallow-clone the repos into the scratchpad (`git clone --depth 1 --no-checkout`, then `git show HEAD:<path>`), which also works when Windows long paths fail checkout. This gives verbatim text, unlike the researcher's fetch summaries. Check nested LICENSE files and per-skill `license:` frontmatter, not just the root file.

**Why:** in T-20261103-02 the verbatim reads confirmed every licence. They also showed that an "adopted" method (Corey's Product Hunt warm-up) contained account-farming the researcher's summary hid.

**How to apply:**
- Read the source text of every adopted method for deceptive or outward steps buried inside it, and for unsourced figures that need listing as rejected.
- For any MCP connector, check that the `.claude/settings.json` hook matchers cover `mcp__*` tools: they didn't in 2026-11. Count every agent file with the wildcard, fallbacks included.
- List the vendor's full write-tool table yourself.
- `[R]`-style evidence marks are not lint-copy source markers, so expect unsourced-number FAILs on quoted-to-reject figures.

**Skill drafts built from those surveys (T-20261103-06):**
- Test "nothing copied" with a 4-gram `comm -12` diff of draft against source. It found short verbatim phrases that the author's claims denied.
- Check each new rule against our own skills: the label sets in reply-triage, the five steps in objection-handling, and the lead-status moves in `pipeline/lead-schema.md`. Imported rules clashed with all three.
- Check when each marker can be judged against the action it triggers. One marker was only knowable after the action it was meant to prevent.
- Count every inserted line, and every loader including the fallbacks, when sizing a skill's token cost.

Related: [[search-summary-claims]], [[revision-round-checks]].
