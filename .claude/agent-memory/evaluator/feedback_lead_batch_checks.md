---
name: lead-batch-checks
description: Lead batch review habits - test observed gaps on the cited listing and YouTube, use GitHub API and oEmbed through WebFetch, recompute tier with a fair score
metadata:
  type: feedback
---

Don't accept an `observed_gap` because the company's own homepage reproduces it. Open every other URL in the same record and look for the opposite, especially a listing's media section, plus the company's YouTube channel.

**Why:** in T-20261030-06 "no demo video" was true of the homepage, but the directory page cited as evidence 1 showed a demo video, and a tier B Go rested on that gap. The gate only trusts the submitted score, so it cannot catch this.

**How to apply:**
- `curl` is blocked here. WebFetch works on `api.github.com` (release dates with year, tags, org created_at, commits) and on `youtube.com/oembed?url=...&format=json` (title and author when the watch page returns nothing).
- If GitHub's page omits a year or a release conflicts with the README, check the API before accepting "unresolved".
- Check the org page for a contact the batch missed.
- Recompute score and tier with fair numbers and say whether the gate verdict changes, including how close a lead sits to a tier line.
- Check which downstream task the gate verdict feeds (ops/board.md) and say to hold it if the Go is wrong.
- Check next_action against skill rules (Discord or anything needing a login breaks lead-research).
- Test "not found" claims directly: `producthunt.com/products/<slug>`, `hn.algolia.com/api/v1/search?query=<name>`, PeerPush, a domain-limited YouTube WebSearch, then oEmbed each video for its author. In r2 these found listings and six videos a batch said didn't exist.
- `linkedin.com/company/<handle>` via WebFetch often gives HQ and size without a login; get the handle from listing pages. A size-unknown claim may be one fetch from settled.
- oEmbed does not take channel URLs (real channels 404), so it can't test a channel. A handle page that loads has a title only, and a matching handle can belong to a stranger: leave owner to a person.
- Score parts before adding them up. If the total lands on a tier line, say so, don't nudge it, and keep the lead `new` until the open check is done.
- An open check that tests the lead's premise (is there a gap at all?) blocks `qualified`; unknowns that only lower quality don't. Conditions in `ops/approvals.md` aren't read by `gateOf` or `set-status`, so they enforce nothing.
- After a PASS, read the downstream board line literally. "Depends on PASS and gate" can be met by a Go on a `new` lead under `--status all`; say to hold it.
- If a batch copies your own earlier findings, say you are partly reviewing yourself, and recheck 20% live. `seen` is stamped by the importer, so it doesn't show who looked.
- check-links flags a 404 that an item reports as its finding. Read the claim before treating it as a dead source.
