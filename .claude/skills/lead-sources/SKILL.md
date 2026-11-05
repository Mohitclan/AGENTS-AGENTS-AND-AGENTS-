---
name: lead-sources
description: Where to find launch-active, founder-led software startups for free, the exact URL for each source that agents can reach, what each one proves, and the rules for using it. Use with lead-research whenever you build or refresh a lead batch.
---

# Lead sources

Every source here was opened by an agent on 2026-11-05 without a login, key or payment (test logs: outputs/research/2026-11-05-lead-sources.md and outputs/research/2026-11-05-more-lead-sources.md). Pages marked **browser** need JavaScript: read them with the team's browser (browser-research skill); everything else is WebFetch. HubSpot is not a lead source: it is only for checking whether a company is already in the CRM. The segment tests below are the segment 1 tests from memory/MAIN.md: T1 software product, T2 India, T3 named founder and about 1-20 people, T4 launch in the last 30 days or dated in the next 60, T5 GitHub code or an active maker account, T6 no disqualifier or competitor.

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
| 4 | LaunchPad India | `https://launchpadindia.co` and `/sitemap.xml` | T2 (city), T4 (this Monday's cohort), T1 | Product pages need the browser (row 13); without it, find each site with WebSearch (`"<name>" <city>`). Some cities are abroad; some entries aren't software |
| 5 | DevHunt | `https://devhunt.org/upcoming`; `/tool/<slug>` | **T4 forward** (scheduled date), maker, site | Global; T2 from the site |
| 6 | PeerPush | `https://peerpush.com/p/<slug>` | T3 (founder and role), T2 (HQ), founded date | "Published on" is not a launch date |
| 7 | Inc42 | `https://inc42.com/startups/feed/`; the monthly "30 Startups To Watch" article | T2, T3 (founders named), founded year, city | About half aren't software; some are funded (check T6) |
| 8 | YC (yc-oss mirror) | `https://yc-oss.github.io/api/batches/<season>-<year>.json` (read in 100k chunks), `/tags/india.json`; Launch HN through Algolia `tags=launch_hn` | T3 (`team_size`), T4 (`launched_at`), T1 | Few Indian companies; funded teams with marketing staff may fail T6 |
| 9 | Hasjob | `https://hasjob.co/feed` | T2, T1; "founding engineer" posts hint at size | Staffing and services firms |
| 10 | DEV.to | `https://dev.to/api/articles?tag=showdev&per_page=30` | T5 (`github_username`), T4 | Mostly tutorials |
| 11 | Small launch boards | `https://feeds.feedburner.com/BetaList`, `https://openalternative.co/rss/tools.xml`, `https://foundrlist.com/feeds/products.xml`, microlaunch.net, fazier.com, uneed.best | T4, T1 | Thin data: name, date, sometimes a site |
| 12 | Marketplaces | Chrome Web Store detail pages; `https://itunes.apple.com/search?term=<kw>&country=in&entity=macSoftware`; WordPress `api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[browse]=new`; `open-vsx.org/api/-/search?sortBy=timestamp&sortOrder=desc` | T4 (release dates), developer and site; Chrome detail pages often publish a business email | Weak for discovery; App Store `country` is the store, not the maker |
| 13 | **LaunchPad India product pages (browser)** | URLs from `https://launchpadindia.co/sitemap.xml` (WebFetch; about 700 `/listing/<slug>` pages); open each with the browser. The full list `/products` is about 350k characters: use `browser_find` on it, or the sitemap, never one whole snapshot | **T2 (city), T4 (exact "Launched <date>"), T3 (a FOUNDER block with name and city), T1 (Free or Paid label)** and the website, all on one page | Mostly small consumer and AI tools; a "Free" label may be out of date (read the site's pricing). The founder's X, Instagram and LinkedIn links are personal: never follow or record them |
| 14 | Indian startup news feeds | `https://indianstartupnews.com/rss` (about 330k characters: read with `offset` 0, 100000, 200000; keep `/funding/` items at pre-seed, seed or angel); `https://entrackr.com/rss` and `https://entrackr.com/snippets`; `https://www.indianstartuptimes.com/feed/` (the `/interviews/` items) | **T2 and T3 from a dated article**: city, founders, stage; sometimes the launch age | Most items aren't software, and funded rounds can fail T6. Get T1 and T4 from the company's own site |
| 15 | Inc42 sub-feeds | `https://inc42.com/buzz/feed/` (the morning roundup's "Startup Spotlight"); `https://inc42.com/tag/funding-galore/feed/` (weekly table with round type) | T2, stage; Spotlight names founders | Funding Galore names no founder or city |
| 16 | DEV.to India pass | `https://dev.to/api/articles?tag=india&per_page=30` | T4 (dated post), T5 (`github_username`); an India signal from the topic | The topic isn't a location: confirm T2 on the site. About a quarter are builders posting their own product |
| 17 | AlternativeTo new apps | `https://alternativeto.net/browse/new-apps/?p=N`, then `/software/<slug>/about/` | **Origin country on the list**, pricing, licence; the about page adds date added, developer and site | Only 1-3 in 25 are Indian, often free open source. robots.txt allows these paths, not `/browse/search/` |
| 18 | More launch boards with dates or makers | `https://www.uneed.best/tool/<slug>` (exact "Launch Date", Paid label); `https://startupbase.io/` and `/products/<slug>` ("Founder @Product", "Launched today"); `https://fazier.com/launches/<slug>`; `https://microlaunch.net/p/<slug>`; `https://www.launchingnext.com/rss/` | T4, T1, T3 | Global, no location. Launching Next has spam |
| 19 | Indian programmes and portfolios | `https://nsrcel.org/portfolio/` (founders, website, stage incl. Bootstrapped); `https://atoms.accel.com/news/...` cohort posts; `https://surge.peakxv.com/companies`; `https://www.ycombinator.com/jobs/location/india`; Wellfound role lists such as `https://wellfound.com/role/l/software-engineer/bangalore` (WebFetch only: the browser refuses wellfound.com) | T3 (founders), T2, size band | Few dates, so T4 comes from elsewhere; funded teams may fail T6. Paging and filters need the browser |
| 20 | Developer registries | `https://plugins.jetbrains.com/api/searchPlugins?max=20&orderBy=publish%20date` (`pricingModel` PAID or FREEMIUM is a real paid flag); `https://registry.modelcontextprotocol.io/v0/servers?limit=20` (`publishedAt`, repository, website); VS Code Marketplace newest (**browser**) | T1, T4, T5 | No location: T2 from the site. A contact `email` in an API record is still not a source for outreach unless the company's site shows it |

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

1. **Discover, in parallel.** lead-generator sends one lead-scout per group, all in one message:
   - **A, Indian boards (browser):** LaunchPad India product pages from the sitemap, newest first (13), and the LaunchPad India home after Monday 10 AM IST (4).
   - **B, Indian news and programmes:** the Indian startup news feeds (14), Inc42 and its sub-feeds (7, 15), NSRCEL, YC India jobs and Wellfound role lists (19), Hasjob (9).
   - **C, global launch boards:** Show HN for the last 30 days plus the two India passes (1), DevHunt upcoming (5), the Product Hunt feed and last 7 leaderboards (3), AlternativeTo new apps (17), the other boards (11, 18).
   - **D, developers:** the GitHub org search by city (2), DEV.to showdev and India (10, 16), registries and marketplaces (12, 20), and the buyer-intent-search queries.
   A group a scout can't reach (blocked, empty) is reported, not retried another way.
2. **Shortlist:** drop free open source, services firms, large or funded brands, and anything in knowledge/competitors/.
3. **Prove:** on each shortlisted company's own site, find T1-T3 and the contact. Date T4 from the launch page, a release or a dated post, and quote the date.
4. **Record:** one evidence item per fact, with the URL you read, as lead-research says. Say which sources you tried and which ran dry.

## Sources only a person can read

These are blocked to agents, in WebFetch and in the browser alike: Peerlist Launchpad, Product Hunt makers by location, X/Twitter, LinkedIn (403 since 2026-11-05), Reddit, Indie Hackers, Wellfound company pages, the Startup India portal, company registry data (MCA), AIBoomi Demo Room presenter lists, and the PeerPush and Product Hunt APIs (they need keys). Also not used: Google News RSS (its robots.txt disallows `/rss`), Bing News RSS (WebSearch does the same job), Hashnode's GraphQL API (needs a paid plan; its tag pages work but show no location), and sites that refused agents on 2026-11-05 (Moneycontrol, Livemint, Business Standard and YourStory category feeds, Toolify, Figma Community, Instahyre, Devpost, Gust, F6S). Ask the coordinator to list what you need from them, and add the rows a person copies to `pipeline/human-research.md` (company, site, maker, date, where they saw it). Treat those rows as candidates and verify them as above.
