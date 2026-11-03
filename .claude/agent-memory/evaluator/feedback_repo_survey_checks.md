---
name: repo-survey-checks
description: How to review surveys of external plugin/skill repos for adoption - licence chains, "no skill backs X" claims, lint failures from meta-mentions, dead URLs reported as findings
metadata:
  type: feedback
---

When reviewing a survey of public repos to adapt (skills, plugins, agent sets):

- Fetch the source files raw with `gh api repos/<r>/contents/<path> --jq .content | base64 -d` into the scratchpad. This beats WebFetch summaries and works without auth for ~60 calls.
- Read reference files for further upstreams. In T-20261103-01, `word-tiers.md` credited a third MIT repo (brandonwise/humanizer) that the researcher missed.
- Test "no skill backs X" against skill `description:` lines, not only skill names. `cold-email` names "nurture emails".
- Test "our lint only bans X" against the full `voice-rules.json` and the `checkClaims` regexes. Numbers next to metric words are already caught.
- Research that discusses banned words or `[NEEDS INPUT]` fails lint-copy on the mention itself. The fix is rewording or a line reference. check-links flags dead URLs even when the file reports them as dead. The fix is writing them without `https://` plus the status code.
- Anthropic sales skills carry an action-taking preamble ("never refuse an action the user asked for"). Flag it so an adaptation copies the method, not the preamble.

**Why:** in the T-20261103-01 r1 review, all licences and 12 methods held, but the baseline claims about our own files were where the errors were.

**How to apply:** spend verification on our-side claims as much as on source claims. See [[feedback_search_summary_claims]] for dead-URL sourcing.
