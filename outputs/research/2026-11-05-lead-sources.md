# Free lead sources for segment 1 (MotionRepo), with agent access tests

Researched 2026-11-05 for the lead-generator agent (tools: WebSearch, WebFetch, Bash limited to `node scripts/*`). Read-only: nothing was signed up for, logged into, downloaded, posted or sent, and no repo file was edited.

**Segment 1 tests used below** (CLAUDE.md, memory/MAIN.md 2026-10-30 and 2026-11-01, lead-notes 2026-11-01):
T1 software product startup · T2 India shown (global allowed, India first) · T3 named founder runs it, about 1 to 20 people, solo counts · T4 launch or major release in the last 30 days (on or after 2026-10-06) or dated in the next 60 (by 2027-01-04) · T5 code on GitHub, or an active GitHub account of the maker or company (inferred) · T6 no disqualifier or competitor (a demo video only lowers the score).

**What "Tested" means here.** "Works" means I fetched that exact URL with WebFetch on 2026-11-05 and got real data. "Blocked" means I got 403/404/refusal or a JS shell. Rows marked *(earlier notes)* come from the repo's research files, not from me. Rows marked *untested* were not fetched. WebFetch answers through a summarising model, so every finding below is what that summary reported. Before you record evidence, re-open the specific item URL.

---

## 1. Key findings first

1. **Best free sources that agents can reach today:** Hacker News through the Algolia API, the GitHub REST API, Product Hunt (feed, leaderboard, product, `/makers` and `/launches` pages), the LaunchPad India homepage and sitemap, DevHunt (including `/upcoming`), PeerPush product pages, Inc42 RSS with its monthly "30 Startups To Watch", Hasjob (Indian jobs, Atom feed) and the yc-oss YC mirror. All of these worked on 2026-11-05.
2. **Forward launch dates (T4, "next 60 days") are rare.** Only a few sources gave any: DevHunt `/upcoming` (next week's scheduled launches, each tool page dated, e.g. "Review Router … launches Nov 10, 2026"); GitHub milestones `due_on` and pre-release tags; and AIBoomi Demo Room dates (13, 14 and 18 Nov 2026). hunted.space `/upcoming-products` listed just one product. Product Hunt's `/coming-soon` now shows only today's launches. The 2026-11-01 rule lets a launch in the last 30 days pass T4, so past-launch feeds are usable again.
3. **Compliance findings the skill must state:**
   - **GitHub Acceptable Use Policies, section 7** says information from GitHub, "whether scraped, collected through our API, or obtained otherwise", may not be used for spam, which includes "sending unsolicited emails to users". The section also forbids selling personal information. ([docs.github.com](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)) Use GitHub only to qualify a lead (T2, T4, T5, size). Never take a contact email from a GitHub profile, org or commit. Take the contact from the company's own site.
   - **The X mirror `api.fxtwitter.com` was refused today** by this session's safety classifier ("Walled Content from a Copy"). Earlier runs used it (lead-notes 2026-11-01). Stop using it: X facts need a person.
   - **Reddit:** WebFetch refuses `www.reddit.com` and `old.reddit.com` outright, so Reddit needs a person.
   - **Remote OK's API terms** require a followed link back and naming Remote OK as the source.
4. **LinkedIn company pages returned 403 today.** The notes from 2026-11-01 say they loaded then. Treat LinkedIn as unreliable and do not build a step on it.
5. **WebFetch limits:** it truncates at 100,000 characters (use `offset`, or smaller `hitsPerPage`/`per_page`), caches for 15 minutes, and summarises (it sometimes infers dates, as it did on hunted.space). Unauthenticated GitHub allows 60 core requests per hour and 10 search requests per minute, per `https://api.github.com/rate_limit`, which I fetched. All GitHub calls in a session share that budget. One option is a read-only `node scripts/lead-sources.mjs` that fetches these JSON/RSS endpoints and returns exact fields. It would fit the Bash allowlist, but a person would have to approve adding it. I did not create it.

---

## 2. Ranked catalogue: sources that worked for an agent (tested 2026-11-05)

Ranked by (a) agent access, (b) density of segment 1 fits, (c) how many tests the source settles and (d) how exact its dates are.

| # | Source | Test result | URL / query to use | What it yields | Tests it helps | Signal quality and false positives | Limits / terms |
|---|---|---|---|---|---|---|---|
| 1 | **Hacker News Show HN (Algolia API)** | Works (JSON) | `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&numericFilters=created_at_i>1791244800,points>5&hitsPerPage=50` (1791244800 = 2026-10-06) | title, product URL, HN handle, exact `created_at`, points, `story_text` (often "I'm X, founder…", sometimes location) | T4 strong (dated post), T1, T5 when the URL is GitHub, T2 sometimes | **High** for timing. FPs: hobby and student projects, open source with no business, big companies. `query=india` also matches "Indian languages". HN user `about` is often empty (tested: `ku5h` has none) | No key. Rate limit not confirmed today (a third party cites 10,000 per hour per IP). Keep it polite |
| 2 | **GitHub REST API** (discovery + verification) | Works (JSON) | New Indian orgs: `https://api.github.com/search/users?q=type:org+location:India+created:>2025-09-01+repos:>2&per_page=30` (also try Bengaluru, Bangalore, Pune, Hyderabad, Chennai, Delhi, Gurugram, Noida, Mumbai). Org: `/orgs/<org>`. Repos: `/orgs/<org>/repos?sort=pushed`. Releases: `/repos/<o>/<r>/releases?per_page=5`. Milestones: `/repos/<o>/<r>/milestones?state=open`. User: `/users/<u>` | org: `blog`, `location`, `email`, `is_verified`, `created_at`. User: `name`, `company`, `blog`, `location`, `twitter_username`. Releases: `published_at`, `prerelease`. Milestones: `due_on` | T5 (direct), T2 (location field), T4 (dated releases, pre-releases, milestone due dates), T3 (one member or contributor counts, size hints) | **High** for T5 and T2. The org search returned `repowise-dev` and `off-grid-ai`, which earlier runs had already found as candidates, so it surfaces real fits. FPs: institutes and training firms (`lordsinstitute`, `tensorik-technologies`), ROM and dev communities. `founder location:Bengaluru` user search is noisy (198 hits, mixed) | 60 core requests per hour and 10 search requests per minute unauthenticated (rate_limit endpoint). **AUP section 7: no unsolicited email from GitHub data** |
| 3 | **Product Hunt** (feed, leaderboard, product pages) | Works | Feed: `https://www.producthunt.com/feed` (Atom, 50 entries). Day: `https://www.producthunt.com/leaderboard/daily/2026/11/4`. Product: `/products/<slug>`. Makers: `/products/<slug>/makers`. Exact date: `/products/<slug>/launches` | Feed: product name, PH URL, published date, an author name. Product page: website link, "Launched Xd ago". Makers: name and headline (e.g. "CS Student @ IIT Patna"). Launches: "Launched on October 10th, 2026" | T4 (exact date on `/launches`), T3 (makers), T1 | **Medium-high.** No location on PH, so T2 needs another source. The feed author can be a hunter rather than a maker (the CardPointers 8 entry lists Chris Messina), so confirm on `/makers`. The feed is not strictly recent (one entry is dated 2026-09-01). The leaderboard top 10 is mostly funded companies (Render, OpusClip) | robots.txt allows `/products`, `/leaderboard`, `/feed`, and disallows `/search*`, `/@*/*`, `/r/*` except `/r/p/*`. The GraphQL API needs a developer token (a person would have to sign up; untested) |
| 4 | **LaunchPad India** | Homepage and sitemap work. **Listing pages are JS-only** (no fields) | `https://launchpadindia.co` · `https://launchpadindia.co/sitemap.xml` (`/listing/<slug>` and `/profile/<username>` with `lastmod`) | This week: 34 New Launches and 4 Established, each with name, tagline, category and **city**. No maker or website | T2 (city), T4 (weekly cohort, Monday 10 AM IST, per the 2026-11-03 notes), T1 partly | **Medium.** The only India-specific launch board agents can read. FPs: the city field is unreliable (Stockholm, Shanghai and NY appear); some products are not software (NueGo buses, a consulting LLP, mushroom extracts); some come from large companies. About 22 of 34 showed an Indian city | Free. Terms read 2026-11-03. Find each product's site with WebSearch, then verify there |
| 5 | **DevHunt** (dev tools, GitHub sign-in) | Works | This week: `https://devhunt.org` · **Next week: `https://devhunt.org/upcoming`** · Tool: `https://devhunt.org/tool/<slug>` | Name, tagline, launch week. The tool page adds maker name, DevHunt profile, website and launch date | **T4 forward** (scheduled Tuesday launches), T1, T5 hint (makers sign in with GitHub, so avatars are GitHub-hosted) | **Medium-high** for dev tools. Global; nothing shows India. FPs: big-company tools, directories. Tool pages showed no repo link in the 2 I opened | Free, HTML |
| 6 | **PeerPush** | Web pages work. **API needs a free key** (a person would have to sign up) | `https://peerpush.com` (today's launches) · `https://peerpush.com/p/<slug>` | The product page showed founder name and role, HQ, founded date, website, X and LinkedIn (Astiva: "Satish Kumar, Co-Founder and CEO", Bengaluru, founded 2025-12-23) | T3, T2, T1. T4 only as "Published on" (not labelled a launch date) | **Medium-high** per page, but the homepage gives no dates or founders | API: `https://peerpush.com/api/v1/launches?days=N`, 5,000 requests per hour per key, key required (untested, needs a person) |
| 7 | **Inc42** (RSS + monthly "30 Startups To Watch") | Works (RSS + full article) | `https://inc42.com/startups/feed/` · `https://inc42.com/feed/` · example: `https://inc42.com/startups/30-startups-to-watch-startups-that-caught-our-eye-in-october-2026/` | "30 to Watch": all 30 startups with **founders named**, founded year, HQ city, sector, website link | T2 strong, T3 (named founders, no size), T1, T4 sometimes ("public launch in October 2026") | **Medium.** About half are not software (snacks, agritech, spacetech). Some are funded. The main feed is mostly earnings news | Feeds are about 200 to 580k characters, so use `offset`. Weekly "Funding Galore" exists, but WebSearch found no current edition |
| 8 | **YC via the yc-oss mirror + Launch HN** | Works (JSON). The official YC directory and `/launches` are JS shells | `https://yc-oss.github.io/api/batches/fall-2026.json` (about 350k characters: offsets 0, 100000, 200000, 300000) · `https://yc-oss.github.io/api/tags/india.json` · `https://yc-oss.github.io/api/companies/hiring.json` · Launch HN: `https://hn.algolia.com/api/v1/search_by_date?tags=launch_hn&hitsPerPage=20` | `team_size`, `all_locations`, `launched_at`, website, one-liner, `isHiring`, status | T3 (team size, often 1 to 3), T4 (`launched_at`; Launch HN date), T1 | **Medium** globally, **low** for India: no India location in the 61 companies I checked in the second chunk of the Fall 2026 batch; `tags/india.json` has 35 companies, the newest from S23. Check "funded with marketing staff" (T6) | Unofficial mirror, rebuilt daily from YC's Algolia index. No licence stated |
| 9 | **Hasjob** (Indian tech jobs) | Works (HTML + Atom) | `https://hasjob.co/feed` | Job title, company, **company domain in the URL path** (`/venport.in/yqg7j`), city, date | T2, T1, T3 hint ("Founding Engineer" posts) | **Medium-low.** FPs: staffing firms, services firms, AI-trainer gigs | Free |
| 10 | **DEV.to API (#showdev)** | Works (JSON) | `https://dev.to/api/articles?tag=showdev&per_page=30` · author: `https://dev.to/api/users/by_username?url=<username>` | Article, date, author name, `github_username`, `website_url`, `twitter_username`, `location` (often null) | T5 (GitHub username), T4 (dated "I built X" posts), T2 rarely | **Low-medium.** Many are tutorials, not products. Plenty of Indian authors, but location is rarely filled in | Free, no key |
| 11 | **BetaList** | Works (HTML + Atom) | `https://feeds.feedburner.com/BetaList` (25 items) · `https://betalist.com/startups/<slug>` | Name, tagline, date featured. **No founder, website or location** (site reached through `/visit` redirect) | T4 soft (pre-launch or beta startups) | **Low-medium.** It is the closest thing to "about to launch", but every other field has to come from elsewhere | Free |
| 12 | **OpenAlternative RSS** (open-source products) | Works | `https://openalternative.co/rss/tools.xml` | Name, date listed, **company website** | T5 likely (listed tools are open source), T1 | **Medium-low.** Global; many are mature projects | Free |
| 13 | **Apple iTunes Search API** (Mac/iOS apps) | Works (JSON) | `https://itunes.apple.com/search?term=<kw>&country=in&entity=macSoftware&limit=50` (or `entity=software`) | `sellerName`, `sellerUrl`, `releaseDate`, **`currentVersionReleaseDate`**, `version` | T4 (version date = release), T1. T2 only if seller or site shows it | **Low-medium.** Many solo devs; `country=in` is the storefront, not the developer's country | Free. Developer emails are not in the API |
| 14 | **Chrome Web Store detail pages** | Detail pages work; category pages lack developer data | `https://chromewebstore.google.com/detail/<slug>/<id>` | Developer name, **website, published email, address**, trader status, version, last updated, users | T4 (last updated), T2 (address), contact route (published business email) | **Medium** per page, but discovery is weak (category pages list names only) | Free |
| 15 | **WordPress.org plugins API** | Works (JSON) | `https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[browse]=new&request[per_page]=50` | name, author, author_profile, homepage, `added`, `last_updated`, installs | T4 (added date), T1, T5 sometimes (homepage on GitHub) | **Low.** Many agencies and tiny plugins. T6 risk: agencies doing client work | Free |
| 16 | **Open VSX API** (VS Code-compatible extensions) | Works (JSON) | `https://open-vsx.org/api/-/search?sortBy=timestamp&sortOrder=desc&size=50` | namespace, name, version, timestamp. No homepage | T4, T1 | **Low** | Free |
| 17 | **HN "Who is hiring" (Algolia)** | Works | `https://hn.algolia.com/api/v1/search?tags=comment,story_50338728&query=India&hitsPerPage=50` (thread for Nov 2026 = 50338728, 244 comments) | Company, location, remote, sometimes size | T1, T2, T3 hint | **Low** for India (11 hits, mostly large firms) | Free |
| 18 | **Microlaunch / Fazier / Uneed / FoundrList** | Homepages and feeds work | `https://microlaunch.net` · `https://fazier.com` · `https://www.uneed.best` · `https://www.foundrlist.com/feeds/products.xml` | Name, tagline, product page, sometimes the website. Maker shown only sometimes (Microlaunch) | T4 ("today"), T1 | **Low-medium.** Global; thin fields; product pages untested | Free |
| 19 | **Wellfound list pages** | Lists work; **company pages 403** | `https://wellfound.com/startups/location/india` (1,977 startups, 198 pages) · `https://wellfound.com/location/india` (jobs) | Name, tagline, **size band** (1-10, 11-50…) | T3 size, T2 | **Medium** for size, but the founder pages are blocked | robots.txt allows `/company`, but it returns 403; don't work around it |
| 20 | **Cutshort jobs** | Works | `https://cutshort.io/jobs/startup-jobs` | Company, city, stage label (Bootstrapped, Raised funding) | T2, T1 | **Low** (recruiters, services firms) | Free |
| 21 | **AIBoomi + Luma** | Both load. Luma city pages show no dates in the text | `https://aiboomi.org` (Demo Rooms: Hyderabad 13 Nov, NCR 14 Nov, Bengaluru 18 Nov 2026; ONE '27 on 2-5 Mar 2027) · `https://airadar.aiboomi.org/` · `https://luma.com/bengaluru` | Event names and hosts. AIRadar features named startups | T2, a "demoing soon" hint for T4 | **Low-medium.** Presenter lists are not published ahead; a person may see them at the event | Free |
| 22 | **Console.dev** | Works | `https://console.dev/tools` | Dev tools reviewed weekly, with dates | T1, T4 soft | **Low** for segment 1 (often funded, global) | Free |
| 23 | **npm registry search** | Works (JSON) | `https://registry.npmjs.org/-/v1/search?text=<kw>&size=20` | publisher, maintainers, repository, homepage, date | T5, T4 | **Low** (libraries, not startups) | Free |
| 24 | **Google Play search** | Partly works | `https://play.google.com/store/search?q=<kw>&c=apps` | App name, developer, package. **No dates** | T1 | **Low** | Free |
| 25 | **Lobsters / Mastodon hashtags / Medium tag RSS** | All work | `https://lobste.rs/t/show.json` · `https://mastodon.social/api/v1/timelines/tag/buildinpublic?limit=40` · `https://medium.com/feed/tag/product-launch` | Posts with handles and dates | T4 soft | **Low** (noisy, rarely Indian startups) | Free |
| 26 | **AppSumo** | Works | `https://appsumo.com/software/?sort=latest` | Product, category, "New!" badge | T1 | **Low** (no founders or dates) | Free |
| 27 | **Antler / Upekkha / eChai / startups.fm / YourStory RSS** | Load | `https://www.antler.co/portfolio` · `https://upekkha.io/` · `https://echai.ventures/<city>/saas` · `https://startups.fm/startups/country/india` · `https://yourstory.com/feed` | Portfolio names, some founders, founded year | T2, T1 | **Low** (funded, B2B, or stale: the eChai Vizag page says it has been inactive since 2024) | Free |

### Verification helpers (not discovery, but they settle tests)

| Helper | Test result | URL | Settles |
|---|---|---|---|
| HN item with text and comments | Works *(earlier notes; Algolia search tested today)* | `https://hn.algolia.com/api/v1/items/<objectID>` | Exact Show HN text ("I'm X from India"), date |
| HN Firebase | Works | `https://hacker-news.firebaseio.com/v0/showstories.json` (160 IDs) · `/v0/user/<id>.json` | Item IDs only; user `about` often empty |
| GitHub releases Atom (does not use the REST quota, not verified) | Works | `https://github.com/<o>/<r>/releases.atom` | T4 release dates, author |
| GitHub releases API | Works | `https://api.github.com/repos/<o>/<r>/releases?per_page=5` | `published_at`, `prerelease` (an rc or beta suggests a major release is coming) |
| GitHub milestones | Works (tested repo had `due_on: null`) | `https://api.github.com/repos/<o>/<r>/milestones?state=open` | Forward T4 when `due_on` is set |
| GitHub trending | Works (HTML, "Built by") | `https://github.com/trending?since=weekly` | T5, a traction hint. Mostly big orgs |
| GitHub README search for launch badges | Works, noisy | `https://api.github.com/search/repositories?q=producthunt+in:readme+created:>2026-09-01&sort=updated` (15 hits) | T4 and T5 together |
| Product Hunt `/launches` and `/makers` | Works | see row 3 | T4 exact date, T3 |
| Domain age (RDAP) | Google Registry works; rdap.org 403 | `https://pubapi.registry.google/rdap/domain/<name>.app` (`.app`/`.dev`; trailback.app registered 2026-09-28) | "New company" support for T4 and T1. Other TLDs need their own registry RDAP (untested) |

---

## 3. How to use the top sources (step by step)

**A. Show HN (best all-round, dated launches).**
1. Fetch `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&numericFilters=created_at_i>1791244800,points>5&hitsPerPage=50`. Change the timestamp each run to "today minus 30 days".
2. For India first, run two more queries: `&query=india` (title, text and URL), and `&restrictSearchableAttributes=url&query=.in`, then keep only hosts that end in `.in` or `.co.in`. On 2026-11-05, 7 of the 15 newest hits on the second query were real `.in` hosts.
3. Open each kept item at `/api/v1/items/<objectID>` for the post text: founder, "from India", solo or team.
4. Then verify the product site's about, privacy and terms pages (T1, T2, T3, company name) and GitHub (T5). Take contacts only from the product site.
5. Watch for these false positives: student or hobby projects, free open source with no paid plan (deferred segment, fails T1), and docs-from-code tools such as `codocly.in` ("Generate technical documentation from your codebase"), which may be competitors (T6). Check those against knowledge/competitors/motionrepo.md.

**B. GitHub (finds Indian code-first teams, and proves T5).**
1. Run the org search by city (row 2), with `created:>` about 12 to 18 months back and `repos:>2`. Each call uses 1 of the 10 search requests allowed per minute.
2. For each org: `/orgs/<org>` (blog, location, is_verified) and then `/orgs/<org>/repos?sort=pushed&per_page=5`. Skip orgs with no `blog` (no product site) and institutes or training firms.
3. For T4: `releases.atom` on the main repo (a major version in the last 30 days), a pre-release tag, or a milestone with a `due_on` date.
4. For T3: a one-member org or a small contributor list is a hint only. A sole contributor is not proof of a solo founder (lead-notes 2026-11-01).
5. Never take a contact email from GitHub (AUP section 7). Budget about 50 core calls per hour for the whole session.

**C. Product Hunt (dated launches, named makers).**
1. Read `https://www.producthunt.com/feed` and the last 7 daily leaderboards (`/leaderboard/daily/YYYY/M/D`).
2. For each candidate: `/products/<slug>` (website), `/products/<slug>/makers` (names and headlines), `/products/<slug>/launches` (exact date, T4).
3. PH shows no location, so take T2 from the product site's terms or privacy page, the maker's GitHub location, or LaunchPad India.
4. Drop well-known funded brands. Treat a feed author as a possible hunter until `/makers` lists them.

**D. LaunchPad India (India-specific weekly cohort).**
1. Fetch `https://launchpadindia.co` after Monday 10 AM IST. Keep the New Launches that show an Indian city and a software tagline.
2. Listing pages are JS-only, so find the product's own site with WebSearch (`"<product name>" <city>`) and verify it there (T1 to T3). Use `sitemap.xml` (`/listing/<slug>` `lastmod`) to date entries roughly; `lastmod` is not a launch date.
3. A weekly launch date from the homepage cohort counts for T4 only when the listing date is shown or the site confirms it.

**E. DevHunt (the only tested source of scheduled launches).**
1. `https://devhunt.org/upcoming`: list next week's tools. Open `/tool/<slug>` for the maker, website and "launches <date>".
2. Verify location and founder on the website. Search GitHub for the product or maker for T5.

**F. PeerPush (founder, HQ and founded date on one page).**
1. Scan `https://peerpush.com` daily. Open `/p/<slug>` for founder, role, HQ, founded date and socials.
2. A "Published on" date is not a launch date. Confirm T4 elsewhere (PH `/launches`, changelog, Show HN).

**G. Inc42 "30 Startups To Watch" (Indian, founders named).**
1. Monthly: find the newest edition in `https://inc42.com/startups/feed/`. Open the article and read it with `offset` if it is long.
2. Keep software startups founded 2024 to 2026 with no large round. Founder names come from the article (T3: named). Size and T4 still need the company site.

**H. YC (global; team size given).**
1. Read `batches/<season>-<year>.json` in 100k-character chunks. Keep `team_size` ≤ 20. Check `all_locations` for India (rare). Date T4 with `launched_at` or a Launch HN post.
2. Check T6: a YC company with in-house marketing or design staff is disqualified for now.

---

## 4. Sources that need a person (add rows to `pipeline/human-research.md`)

| Source | Agent result | What a person should copy into a row |
|---|---|---|
| **Peerlist Launchpad** `https://peerlist.io/launchpad` | 403 (retested 2026-11-05; also 2026-10-30, 11-01, 11-03) | Weekly Monday cohort: product, website, maker, headline, launch date. India-leaning |
| **LaunchPad India listing pages** `https://launchpadindia.co/listing/<slug>` | JS-only, no fields (tested) | Website and maker name for each Indian New Launch |
| **Product Hunt India makers** | Pages load, but PH shows no location and `/search` is disallowed by robots | Makers whose PH profile says India; upcoming "notify me" pages |
| **X / Twitter** (`#buildinpublic`, "launching on Product Hunt", founder posts) | x.com 402 *(earlier notes)*. The fxtwitter mirror was refused today; don't use it | Dated launch announcements (T4 forward), founder bios, demo videos (T6 score) |
| **LinkedIn** company pages and founder posts | 403 today (it loaded on 2026-11-01, per notes) | Size band, HQ, "we're launching" posts |
| **Reddit** r/developersIndia, r/SideProject, r/SaaS, r/indiehackers | WebFetch refuses the domain | Showcase posts by Indian founders (no names or handles in rows, per lead-research skill) |
| **Indie Hackers** products and posts | 403 (tested) | Founder-led products, revenue notes |
| **Wellfound company pages** `/company/<slug>` | 403 (tested); list pages load | Founder names, size, founded year |
| **There's An AI For That** "just launched" | 403 (tested) | New AI tools and makers |
| **Bluesky** search | 403 on the public search API (tested) | Launch posts |
| **IndiHunt** (Indian daily launchpad) | `indihunt.in` returned 503 (tested); real URL unknown | Confirm the URL, then the daily Indian launches |
| **AIBoomi Demo Rooms** (13, 14, 18 Nov 2026) | Event pages load; presenter lists are not published | Startups demoing, with founder names (attend or read the recap) |
| **Startup India / DPIIT portal** | JS shell, no data (tested) | Recognised startups by sector and city |
| **MCA company data** (Zauba Corp, Tofler, data.gov.in) | Zauba 403, Tofler search 404 (tested); data.gov.in needs an API key (untested, sign-up) | Company registration (T2) and directors (T3 founder name). Public business info only |
| **PeerPush API, Product Hunt API** | Both need a key or token (sign-up) | A person could create keys, but the team runs with no paid tools and agents may not sign up |
| **Shopify App Store** search | Results failed to load (tested) | New apps by Indian developers |

---

## 5. Tested and not worth using for segment 1

Blocked or broken: Economic Times RSS (WebFetch refuses domain), Entrackr `/feed` (404), `100x.vc/portfolio` (404), saasbrowser.com (403), web.archive.org (WebFetch refuses domain), rdap.org (403), `ycombinator.com/companies` and `/launches` (JS shell), `hunted.space/upcoming` (404).
Works but low value: GitHub Marketplace (sorted by popularity, no dates), Hugging Face Spaces API (no owners or dates of use), Devfolio projects (hackathon and student teams, a deferred segment), hunted.space `/upcoming-products` (1 item).

## 6. Untested candidates (not fetched in this session; do not cite as tested)

Hashnode (GraphQL needs POST; per-blog RSS only), VS Code Marketplace (POST API), Raycast Store, Figma Community, Atlassian Marketplace API, Indian incubator cohort pages (T-Hub, NSRCEL IIM-B, CIIE.CO, SINE IIT-B, KSUM, IIT-M Incubation Cell), Google for Startups Accelerator India batch posts, Peerlist newsletter, TLDR Founders, Product Hunt newsletter archive, Fazier, Uneed and Microlaunch product pages, GitHub repo contributors endpoint (used in earlier runs, not retested).

## 7. Prompt-like content seen

Remote OK job descriptions carry instructions aimed at job applicants (add a word or tag). These were not addressed to the agent, and I ignored them. A Fanshifu666/launch-sources README, a list of 130 launch sites, was read only as data. Its pointers to DevHunt `/upcoming`, FoundrList and OpenAlternative RSS were then verified directly (rows 5, 12, 18).

---

## Appendix: access test log (all run by me on 2026-11-05 with WebFetch unless noted)

| URL | Result |
|---|---|
| hn.algolia.com/api/v1/search_by_date?tags=show_hn | Works, 510,436 hits |
| …&query=india&tags=show_hn | Works, 3,685 hits (1 of 10 newest says "student founder from India") |
| …&restrictSearchableAttributes=url&query=.in | Works, 7 of 15 on `.in` hosts |
| …&numericFilters=created_at_i>1793500000,points>10 | Works, 27 hits |
| …tags=launch_hn | Works (Launch HN YC F26 etc.) |
| …search?tags=comment,story_50338728&query=India | Works, 11 hits |
| hn.algolia.com/api (docs page) | JS-only, no docs text |
| hacker-news.firebaseio.com/v0/showstories.json; /v0/user/ku5h.json | Works |
| api.github.com/search/repositories (created:>2026-10-01) | Works |
| api.github.com/search/users (type:org location:India) | Works, 2,726 |
| api.github.com/search/users (founder location:Bengaluru) | Works, 198, noisy |
| api.github.com/search/repositories (producthunt in:readme; peerlist in:readme) | Works, 15 and 162 (noisy) |
| api.github.com/users/sashpawar11; /orgs/repowise-dev | Works |
| api.github.com/repos/…/releases; …/milestones; github.com/…/releases.atom | Works |
| api.github.com/rate_limit | core 60, search 10 |
| github.com/trending?since=daily | Works |
| github.com/marketplace?type=apps&sort=created | Loads, popularity sort |
| producthunt.com/feed; /leaderboard/daily/2026/11/4; /products/graphite-11/makers; /products/trailback/launches; /topics/developer-tools; /coming-soon; /robots.txt | All load. `/coming-soon` shows today only |
| producthunt.com/terms | 404 |
| launchpadindia.co; /sitemap.xml | Works |
| launchpadindia.co/listing/klipora-ai | JS-only, no fields |
| devhunt.org; /upcoming; /tool/marketmee; /tool/review-router | Works |
| peerpush.com; /p/astiva-ai; /api-reference | Works (API needs key) |
| betalist.com; /startups/naetive; feeds.feedburner.com/BetaList | Works |
| uneed.best (works); uneed.best/launches (404) | |
| microlaunch.net; fazier.com; foundrlist.com/feeds/products.xml; openalternative.co/rss/tools.xml | Works |
| dev.to/api/articles?tag=showdev; dev.to/api/users/by_username | Works |
| lobste.rs/t/show.json; mastodon.social/api/v1/timelines/tag/buildinpublic; medium.com/feed/tag/product-launch | Works |
| inc42.com/feed/; /startups/feed/; 30 Startups To Watch Oct 2026 article | Works |
| yourstory.com/feed | Works |
| entrackr.com/feed | 404 |
| economictimes.indiatimes.com RSS | WebFetch refuses domain |
| startupindia.gov.in search | JS shell |
| upekkha.io | Loads (logos) |
| 100x.vc/portfolio | 404 |
| antler.co/portfolio | Loads, India filter not applied |
| aiboomi.org | Works (event dates) |
| lu.ma/bengaluru → luma.com/bengaluru | Loads, no dates in text |
| yc-oss.github.io/api/batches/fall-2026.json (offsets 0 and 100000); /tags/india.json; raw README | Works |
| yc-oss.github.io/api/ | 404 |
| ycombinator.com/launches; /companies?batch=… | JS shell |
| remoteok.com/api | Works (terms: link back, name Remote OK) |
| hasjob.co; hasjob.co/feed | Works |
| cutshort.io/jobs/startup-jobs | Works |
| wellfound.com/location/india; /startups/location/india; /robots.txt | Works |
| wellfound.com/company/rampwork-1 | 403 |
| itunes.apple.com/search; registry.npmjs.org search; open-vsx.org search; api.wordpress.org plugins | Works |
| chromewebstore.google.com category (no developer); detail page (developer, site, email, address) | Works |
| play.google.com/store/search | Works, no dates |
| apps.shopify.com/search | Results failed to load |
| huggingface.co/api/spaces | Works, low value |
| appsumo.com/software/?sort=latest | Works |
| hunted.space; /robots.txt (Allow all); /upcoming-products (1 item) | Works |
| hunted.space/upcoming | 404 |
| console.dev/tools | Works |
| devfolio.co/projects | Works (4 projects) |
| echai.ventures/visakhapatnam/saas (works, stale); /bangalore/saas (404); startups.fm/startups/country/india (works) | |
| pubapi.registry.google/rdap/domain/trailback.app | Works |
| rdap.org/domain/trailback.app | 403 |
| web.archive.org CDX | WebFetch refuses domain |
| zaubacorp.com search | 403 |
| tofler.in/search | 404 |
| saasbrowser.com/list-of-saas-in-IN | 403 |
| theresanaiforthat.com/just-launched/ | 403 |
| indiehackers.com/products | 403 |
| public.api.bsky.app searchPosts | 403 |
| peerlist.io/launchpad | 403 |
| www.reddit.com/r/SideProject/new/.rss; old.reddit.com search.json | WebFetch refuses domain |
| linkedin.com/company/aroice | 403 |
| api.fxtwitter.com/2/profile/… | **Refused by the safety classifier ("Walled Content from a Copy")** |
| indihunt.in | 503 |
| docs.github.com Acceptable Use (section 7) and REST rate limits | Read |
| WebSearch: IndiHunt; "site:peerlist.io project…"; "launching on Product Hunt" India; VayuTik; Inc42 Funding Galore; HN Algolia rate limit | Ran. Snippets only, no lead evidence |
