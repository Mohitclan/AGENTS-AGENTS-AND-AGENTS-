---
name: lead-sources
description: Where to find launch-active, founder-led software startups for free, the exact URL for each source that agents can reach, what each one proves, and the rules for using it. Use with lead-research whenever you build or refresh a lead batch.
---

# Lead sources

Every source here was opened by an agent on 2026-11-05 without a login, key or payment (outputs/research/2026-11-05-lead-sources.md has the full test log). HubSpot is not a lead source: it is only for checking whether a company is already in the CRM. The segment tests below are the segment 1 tests from memory/MAIN.md: T1 software product, T2 India, T3 named founder and about 1-20 people, T4 launch in the last 30 days or dated in the next 60, T5 GitHub code or an active maker account, T6 no disqualifier or competitor.

## Rules for every source

1. **Find with the source, prove with the company.** A listing is a lead, not evidence. Verify T1-T3 on the company's own site (about, pricing, terms, privacy, team) and record that page as the evidence.
2. **Never take a contact from GitHub.** GitHub's Acceptable Use Policies (section 7) forbid using GitHub data, scraped or from the API, for unsolicited email. Use GitHub to qualify a lead only; take the contact from the company's own site.
3. **No logins, no workarounds.** A 403, a JS-only page or a refused domain is a finding: note it and move on. Don't use mirrors or copies of walled sites (an X/Twitter mirror was refused on 2026-11-05). Respect robots.txt (Product Hunt disallows `/search`).
4. **WebFetch summarises.** It can infer a date the page doesn't state. Before recording a date or a name, re-open the item and quote it. Long pages stop at about 100k characters; read the rest with `offset`.
5. **GitHub without a key allows 60 calls an hour and 10 searches a minute, shared by the whole session.** Plan about 50 GitHub calls per batch.
6. **Public business information only.** Founder names from the company's own pages or a dated article; nothing personal.

## The sources, best first

| # | Source | URL to fetch | What it proves | Watch out for |
|---|---|---|---|---|
| 1 | Hacker News Show HN | `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&numericFilters=created_at_i>EPOCH,points>5&hitsPerPage=50` (EPOCH = 30 days ago); India passes: add `&query=india`, or `&restrictSearchableAttributes=url&query=.in`; one post: `/api/v1/items/<id>` | T4 (exact date), T1; the post text often names the founder and city | Student and hobby projects, free open source (fails T1), large companies; "india" also matches "Indian languages" |
| 2 | GitHub REST API | `https://api.github.com/search/users?q=type:org+location:<city>+created:>2025-09-01+repos:>2&per_page=30`, then `/orgs/<org>`, `/orgs/<org>/repos?sort=pushed`, `/repos/<o>/<r>/releases`, `/repos/<o>/<r>/milestones?state=open`, `https://github.com/<o>/<r>/releases.atom` | T5, T2 (location), T4 (release dates, `prerelease`, milestone `due_on` for a future launch) | Institutes, training firms, communities; skip orgs with no `blog` URL. A single contributor hints at a solo founder but doesn't prove it |
| 3 | Product Hunt | `https://www.producthunt.com/feed`; `/leaderboard/daily/YYYY/M/D`; `/products/<slug>`; `/products/<slug>/makers`; `/products/<slug>/launches` | T4 (exact launch date), T3 (makers), T1 | No location: get T2 elsewhere. The feed's author may be a hunter, not a maker. Leaderboard tops are mostly funded companies |
| 4 | LaunchPad India | `https://launchpadindia.co` and `/sitemap.xml` | T2 (city), T4 (this Monday's cohort), T1 | Listing pages are JS-only; find each site with WebSearch (`"<name>" <city>`). Some cities are abroad; some entries aren't software |
| 5 | DevHunt | `https://devhunt.org/upcoming`; `/tool/<slug>` | **T4 forward** (scheduled date), maker, site | Global; T2 from the site |
| 6 | PeerPush | `https://peerpush.com/p/<slug>` | T3 (founder and role), T2 (HQ), founded date | "Published on" is not a launch date |
| 7 | Inc42 | `https://inc42.com/startups/feed/`; the monthly "30 Startups To Watch" article | T2, T3 (founders named), founded year, city | About half aren't software; some are funded (check T6) |
| 8 | YC (yc-oss mirror) | `https://yc-oss.github.io/api/batches/<season>-<year>.json` (read in 100k chunks), `/tags/india.json`; Launch HN through Algolia `tags=launch_hn` | T3 (`team_size`), T4 (`launched_at`), T1 | Few Indian companies; funded teams with marketing staff may fail T6 |
| 9 | Hasjob | `https://hasjob.co/feed` | T2, T1; "founding engineer" posts hint at size | Staffing and services firms |
| 10 | DEV.to | `https://dev.to/api/articles?tag=showdev&per_page=30` | T5 (`github_username`), T4 | Mostly tutorials |
| 11 | Small launch boards | `https://feeds.feedburner.com/BetaList`, `https://openalternative.co/rss/tools.xml`, `https://foundrlist.com/feeds/products.xml`, microlaunch.net, fazier.com, uneed.best | T4, T1 | Thin data: name, date, sometimes a site |
| 12 | Marketplaces | Chrome Web Store detail pages; `https://itunes.apple.com/search?term=<kw>&country=in&entity=macSoftware`; WordPress `api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[browse]=new`; `open-vsx.org/api/-/search?sortBy=timestamp&sortOrder=desc` | T4 (release dates), developer and site; Chrome detail pages often publish a business email | Weak for discovery; App Store `country` is the store, not the maker |

Also useful to check a lead:
- **Domain age:** RDAP, for example `https://pubapi.registry.google/rdap/domain/<name>.app`. A young domain supports T4.
- **Startup size band:** `https://wellfound.com/startups/location/india` (the list pages load; company pages are 403).

## Launch timing (test 4)

- **Past launches count as `published` when dated**: a GitHub release (use `published_at`, not the tag date), a Show HN post, a Product Hunt or Peerlist launch page, or a changelog entry.
- **Upcoming launches count as `published` only with a date on a public page**:
  - a dated announcement;
  - an event lineup or demo-day slot;
  - DevHunt's scheduled date;
  - a public GitHub milestone with `due_on`, recorded as "release milestone due <date>", not as a launch.
- **Not enough on their own**: a waitlist or "coming soon" with no date stays unknown.
- **A date predicted from release cadence is `inferred`.** It can set priority, but it never passes test 4 and is never mentioned to the prospect.
- **An empty search is a data gap, never "no launch".**
- **Dedupe** on the root domain, the parent company and brand variants. A subsidiary of an excluded parent is excluded too.

## A batch, step by step

1. **Discover:** run the Show HN query (last 30 days, then the two India passes), today's DevHunt upcoming, the Product Hunt feed with the last 7 leaderboards, and, after Monday 10 AM IST, LaunchPad India. Add the GitHub org search by city when T5 matters.
2. **Shortlist:** drop free open source, services firms, large or funded brands, and anything in knowledge/competitors/.
3. **Prove:** on each shortlisted company's own site, find T1-T3 and the contact. Date T4 from the launch page, a release or a dated post, and quote the date.
4. **Record:** one evidence item per fact, with the URL you read, as lead-research says. Say which sources you tried and which ran dry.

## Sources only a person can read

These are blocked to agents: Peerlist Launchpad, LaunchPad India listing pages, Product Hunt makers by location, X/Twitter, LinkedIn (403 since 2026-11-05), Reddit, Indie Hackers, Wellfound company pages, the Startup India portal, company registry data (MCA), AIBoomi Demo Room presenter lists, and the PeerPush and Product Hunt APIs (they need keys). Ask the coordinator to list what you need from them, and add the rows a person copies to `pipeline/human-research.md` (company, site, maker, date, where they saw it). Treat those rows as candidates and verify them as above.
