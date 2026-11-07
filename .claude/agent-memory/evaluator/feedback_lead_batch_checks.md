---
name: lead-batch-checks
description: Lead batch review habits - test observed gaps on the cited listing and YouTube, use GitHub API and oEmbed through WebFetch, recompute tier with a fair score
metadata:
  type: feedback
---

Don't accept an `observed_gap` because the company's own homepage reproduces it. Open the other URLs the gap rests on and look for the opposite, especially a listing's media section, plus the company's YouTube channel.

**Budget (2026-11-07):** the list below is checks to choose from by risk, not a list to run on every lead. About 8 pages a lead in round 1, in parallel; widen only on a lead where something fails. In T-20261106-04 r1, 66 fetches found one wrong date out of 24 claims.

**Why:** in T-20261030-06 "no demo video" was true of the homepage, but the directory page cited as evidence 1 showed a demo video, and a tier B Go rested on that gap. The gate only trusts the submitted score, so it cannot catch this.

**How to apply:**
- `curl` is blocked here. WebFetch works on `api.github.com` (release dates with year, tags, org created_at, commits) and on `youtube.com/oembed?url=...&format=json` (title and author when the watch page returns nothing).
- If GitHub's page omits a year or a release conflicts with the README, check the API before accepting "unresolved".
- Check the org page for a contact the batch missed.
- Recompute score and tier with fair numbers and say whether the gate verdict changes, including how close a lead sits to a tier line.
- Check which downstream task the gate verdict feeds (ops/board.md) and say to hold it if the Go is wrong.
- Check next_action against skill rules (Discord or anything needing a login breaks lead-research).
- Test "not found" claims directly: `producthunt.com/products/<slug>`, `hn.algolia.com/api/v1/search?query=<name>`, PeerPush, a domain-limited YouTube WebSearch, then oEmbed each video for its author. In r2 these found listings and six videos a batch said didn't exist.
- **Read the lead-sources skill's blocked list (rule 3 and "blocked to agents") before any social fetch.** Since 2026-11-05: no X/Twitter mirrors (fxtwitter included), and LinkedIn is 403. In T-20261106-01 r1 I used fxtwitter before reading the rule and had to disclose it as a policy flag. For X, hand a person the exact profile URL in a fix.
- oEmbed does not take channel URLs (real channels 404), so it can't test a channel. A handle page that loads has a title only, and a matching handle can belong to a stranger: leave owner to a person.
- Score parts before adding them up. If the total lands on a tier line, say so, don't nudge it, and keep the lead `new` until the open check is done.
- An open check that tests the lead's premise (is there a gap at all?) blocks `qualified`; unknowns that only lower quality don't. Conditions in `ops/approvals.md` aren't read by `gateOf` or `set-status`, so they enforce nothing.
- After a PASS, read the downstream board line literally. "Depends on PASS and gate" can be met by a Go on a `new` lead under `--status all`; say to hold it.
- If a batch copies your own earlier findings, say you are partly reviewing yourself, and recheck 20% live. `seen` is stamped by the importer, so it doesn't show who looked.
- Rejections on "site doesn't say": open /about, /privacy, /terms and /changelog, LinkedIn and Product Hunt (follow the site's own link, not a guessed slug). In T-20261101-03 these overturned "no founder, place or team" on a homepage-only read. Check each "unknown"/"fail" against the stated excuse, and "public code" against "code on GitHub".
- Social profiles linked from a lead's pages (X in the Product Hunt or maker site links) are where launch videos hide: earlier rounds found videos there on several rows. Agents can't open them now, so a gap scoped without them must carry a "person checks <URL>" next action, and no draft may cite the gap until then. GitHub `api.github.com/users/<login>` is allowed and often gives location, company and the blog link.
- Studio sites: open every "Work with us"/services link or subdomain (work.<domain>). In T-20261106-01 r1 a "small studio" selling client builds sat one link from a page the batch read, and the agency disqualifier went untested.
- T4 on a release: read the previous major's release notes too (API `releases` body) and check when the product first went public (about page "v1.0.0", press). A minor release on a product public since an earlier year that ships often matches the Repowise "segment 2" ruling: hold for a person, don't pass.
- need_evidence resting only on `inferred` items is unjustified: lead-schema line 22 says inferred "sets timing only".
- "Page failed to load": retry it, and read the check-links output, which may show it loaded. Compare any exemption with earlier rulings on parallel rows (Graphite vs MailMark).
- Read the words on the page, not only the links: "no embed" can sit beside text describing the recording. Then test "a person must" items: most were agent work.
- check-links flags a 404 that an item reports as its finding. Read the claim before treating it as a dead source.
- "No handle known": open the maker's GitHub profile and portfolio before repeating it. In T-20261101-05 r2 both showed the X handle, and my r1 had made the same false claim.
- Read the text of swept posts, not just dates and media: "no source names him" sat beside his own "I built X" post.
- Open rows hide imports. In T-20261101-06 r1 three "open" rows looked like six-test passes. Open any blog field from a GitHub profile (it led to the product site), site-linked Product Hunt `/makers`, `/terms` ("laws of India, where I live"), `/contact`, and follow the links in posts the file already cites. Test 3 and 5 standards must match across rows.
- Give full URLs in fixes: "/makers" sent a specialist to a 404 on the product site when I meant Product Hunt. `producthunt.com/products/<slug>/launches` gives the exact launch date and `/makers` the team when the product page shows only "Launched 10d ago".
- Before passing test 4, read the product's own pages for "early access", "waitlist", "coming soon". In T-20261101-06 r1 I passed a waitlist on a listing and legal-page date. Read a maker's other product on its own site, headline included, before accepting a one-line category.
- check-links uses up GitHub's unauthenticated API limit, so API WebFetches then return 403 and restricted counts jump. Fetch API URLs first, or use github.com release pages. Check what "held by the reviewer" claims against your earlier table.
- "Powered by <site>" footers: open that site's team/editorial page and its tool list. In T-20261106-04 they named the founder and showed a free screen recorder (the Cool Analytics question), on a site the batch said it read.
- LaunchPad India "Launched <date>" may be a listing date (its home: "new launches and established products compete every Monday"). Compare with the site's /policies and article dates and the earlier notes' row for the same company; apply the batch's own Smler-type standard to every row.
- LaunchPad listing pages are JS shells to WebFetch, but the home page renders: "This Week's Launches" > "New Launches" / "Established Products", with the city per entry. Use it for the section and city before calling either "browser-only" (T-20261106-04 r2: it settled both). The list rolls over Monday 9:59 IST, so tell the person the date.
- JetBrains update notes can hold changelog history ("1.0.0: first release") inside a later listed update; judge the listed version and its cdate, not words in the notes.
- JetBrains: convert cdate yourself (`date -u -r <seconds>`); a vendor-text search missed a plugin that a name search found. Read each plugin's update notes ("first release" vs "Renamed"/"Now freemium").
- iTunes `lookup?id=<id>&country=in` gives the INR price and the current version date the store page omits. GitHub `/repos/<o>/<r>/contents/` shows whether a "public repo" holds code or only a README.
- A maker under 18 is excluded by knowledge/company.md line 39 ("never contact anyone under 18"), not a person's policy call; don't repeat the age or name in the review.
- "A person confirms T3/headcount" next actions: read every comment in the cited Show HN thread (`hn.algolia.com/api/v1/search?query=<name>` lists them) and compare with the Dottr precedent (named founder passes; unknown size lowers icp_fit). In T-20261105-01 a second co-founder named himself there. Also open the parent company's own page for studio or "bespoke software" wording, and check the studio rule is applied the same way as on other rows. Contact-quality labels feed only the import cap, not `gateOf`.
