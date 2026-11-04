---
name: demo-pack-checks
description: Checks for demo plans, call prep and post-demo follow-ups reviewed together (use case 2) — spoken lines from hypothesis rows, repo-only facts, cross-file tags
metadata:
  type: feedback
---

When reviewing a demo plan plus call prep plus follow-up as one pack:

- Read every spoken objection answer against the *label* of the line it cites, not just the line number. Confirmed fact sheets hold "We win (hypothesis, medium)" rows; lifting those into a script is a fixable auto-fail. "GST invoice" is the recurring one (main memory lesson 2026-10-30).
- Repo-only facts (e.g. tone names from `site.ts`) spoken in a script are a policy flag even when labelled "repo only" internally; check the live site too, it may show fewer.
- The local clone may sit on an agent branch, not main: read cited lines with `git show main:<path>`.
- Settle "can the trial do X" claims in code (e.g. `assertUserMayImport`, webhook charge path), not just docs.
- Compare meeting-prep tags across files: unsent drafts tagged `seller_said` in one file vs "nothing" in another.
- Look for an outcome-metric variant gap: if the prospect may start a trial on the call, the follow-up CTA "start the free trial" needs an alternate.
- On r2, test my own r1 fix wording: a new tag (`published`) not in the file's tag key, or a "what we pair" line that invites an unsourced competitor gap. Recount word limits with `wc -w` (it counts bullet dashes) before suggesting added words.
- curl to api.github.com rate-limits from this machine; WebFetch the API URLs instead.

**Why:** T-20261104-14 (2026-11-04): the lint passed all four files while the demo plan stated a hypothesis as fact; the cross-file issues only showed in a side-by-side table.
**How to apply:** for any multi-file sales/demo pack, build the cross-file table (credits, shown, regenerate, CTA, tags, agenda) before scoring. Related: [[outreach-checks]], [[sales-asset-checks]].
