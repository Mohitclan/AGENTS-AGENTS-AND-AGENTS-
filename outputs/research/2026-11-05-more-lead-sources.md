# More free lead sources for segment 1 (MotionRepo): second access test

Date: 2026-11-05. Tested by a research agent using WebFetch and WebSearch only: no logins, keys, paid tools, mirrors or caches. Every URL below was opened today. Sources already in `.claude/skills/lead-sources/SKILL.md` or in `outputs/research/2026-11-05-lead-sources.md` were not re-tested, except where a new URL pattern was tried (for example the Wellfound role-and-city list).

Segment tests: T1 software product (paid), T2 India, T3 named founder and about 1-20 people, T4 launch in the last 30 days or dated in the next 60, T5 GitHub or an active maker account, T6 no disqualifier or competitor.

## 1. Key findings

- **Indian startup news RSS is the best new way to get T2 and T3 together.** Indian Startup News (`indianstartupnews.com/rss`), Entrackr (`entrackr.com/rss`) and Indian Startup Times (`indianstartuptimes.com/feed/`) all work. Their items name the founders and the city, give an exact date, and often give the round stage. Indian Startup News also sometimes states launch timing, for example "raises Rs 3 crore just 8 months after its launch". The catch is that most items are not software, or are funded companies with marketing staff. Pre-seed, seed and angel items are where segment 1 fits.
- **AlternativeTo's "New App Releases" is the only global launch list that showed an origin country for each app.** It also shows pricing and licence. Each app's about page adds the date added, the developer and the website. Only 1-3 of every 25 apps were Indian, and all four Indian apps seen today were free and open source (they fail T1). It is useful as a country filter, not as a big supply.
- **DEV.to `tag=india` adds a new India pass to the DEV.to API.** 7 of 30 articles were Indian builders writing about their own product. The posts are dated, but author location is usually null.
- **Bing News RSS works and robots.txt allows it.** Use it for city-based and stage-based queries such as `"Bengaluru-based" launches` or `pre-seed India SaaS`. It is noisy, so treat it as a discovery feed only. **Google News RSS also returned results, but its robots.txt disallows `/rss` for all agents, so don't use it.** I fetched it twice before I checked robots.txt; those results are not used anywhere as evidence.
- **Hashnode is no longer a free API.** Hashnode's announcement says: "Every API request, queries and mutations, now requires a Pro plan on your publication." Tag pages (`hashnode.com/n/<tag>`) render as text with authors and relative dates, but profiles don't show a location.
- **Small launch boards (Uneed, StartupBase, Fazier, Microlaunch) have usable product pages,** with the maker name, a paid or free label and sometimes an exact launch date. None of them shows a location, so they have the same T2 problem as Show HN and DevHunt.
- **Indian accelerator and VC portfolio pages are weak for segment 1.** They give names and sometimes founders, but no launch dates, rarely websites, and the companies are funded. NSRCEL is the best of them: its cards show the founder, website and stage.
- **Blocked or unusable:** Moneycontrol and Livemint (WebFetch refuses the domain); Business Standard RSS, YourStory category feeds and article pages, BW Disrupt, Toolify, Figma Community, Instahyre, Devpost and Gust (all 403); F6S (405); Unstop (cookie wall); VS Code Marketplace search, Zapier new apps and NowLaunch (JS-only or empty). Details are in sections 4 and 5.

## 2. Ranked table (best first for Indian, founder-led software startups)

| # | Source | URL fetched | Result | What it reveals | Tests | Quality | Example companies surfaced |
|---|---|---|---|---|---|---|---|
| 1 | **Indian Startup News RSS** | `https://indianstartupnews.com/rss` (read with `offset` 100000 and 200000; about 330k characters) | Works (RSS 2.0) | Title, exact IST timestamp, link path (`/funding/`, `/news/`), text naming founders, city and round stage; sometimes "N months after its launch" | T2 strong, T3 (founders named), T4 partial (launch age), T1 | **High** for India and founders; most items are not software or are later-stage | Dispatch Network (Pune, pre-seed, founders Rajit Arya and Navneeth Kannan): https://indianstartupnews.com/funding/dispatch-network-raises-rs-5-crore-in-funding-to-cut-the-empty-kilometres-delivery-riders-pay-for-12776351 · OBSESS (Noida, angel round, "8 months after its launch"): https://indianstartupnews.com/funding/noida-based-fitness-startup-obsess-raises-rs-3-crore-just-8-months-after-its-launch-12776384 |
| 2 | **Entrackr RSS + Snippets** | `https://entrackr.com/rss` (about 196k characters) and `https://entrackr.com/snippets` (HTML) | Both work. `/feed` is 404 (earlier log) | Short dated funding and launch items; pre-seed, seed and angel tags in the titles; the feed text names founders and city | T2, T3, T4 (dated launch items such as "launches AI assistant"), T1 | **Medium-high**; the snippets page flags small rounds quickly | Venomics AI (Bengaluru, pre-seed; biotech, so a T1 risk): https://entrackr.com/snippets/bio-tech-startup-venomics-ai-raises-27-mn-in-pre-seed-round-12785718 · Taghash "Brain" launch: https://entrackr.com/snippets/taghash-launches-ai-assistant-brain-for-investment-funds-12776701 · OneStack: https://entrackr.com/snippets/fintech-infra-startup-onestack-raises-rs-125-cr-from-shepherds-hill-others-12782259 |
| 3 | **Indian Startup Times RSS** | `https://www.indianstartuptimes.com/feed/` (about 131k characters) | Works | Founder interviews ("<Founder> on Building <Product>") plus funding news, with exact dates | T3 strong (the founder is the subject), T2, T1; T4 rarely | **Medium-high**; the interviews often cover early-stage products | OpenChase (Anjan Umamaheswaran; search API for AI agents, "still in its early stages"): https://www.indianstartuptimes.com/interviews/beyond-traditional-search-anjan-umamaheswaran-on-building-openchase-powering-ai-agents-with-real-time-intelligence/ · Belong (Ankur Choudhary): https://www.indianstartuptimes.com/interviews/belong-how-ankur-choudhary-is-building-a-digital-financial-platform-for-global-indians/ |
| 4 | **DEV.to API, India tag** | `https://dev.to/api/articles?tag=india&per_page=30` | Works (JSON) | Dated articles, author username; 7 of 30 were builders posting about their own product | T2 implied (topic, not a location field), T4 (dated post), T5 (`github_username` when filled) | **Medium**; author profiles are often empty (`location: null` for autobot360) | Autobot360 (Hindi and English AI call agent): https://dev.to/autobot360_decee0e0efdcf7/why-we-built-an-ai-call-agent-that-speaks-hindi-and-english-4bbb · VyaparNext: https://dev.to/vyaparnext/closing-the-day-in-ten-minutes-how-we-think-about-designing-an-end-of-day-report-4j06 · jctechlabs (Hindi and English OCR fleet ledger): https://dev.to/jctechlabs/what-sends-a-bill-to-review-routing-rules-for-hindi-english-ocr-in-a-fleet-ledger-3a7 |
| 5 | **AlternativeTo New App Releases** | `https://alternativeto.net/browse/new-apps/`, `?p=2`, `?p=3`; about page `https://alternativeto.net/software/inref/about/`; `/robots.txt` | Works (HTML). robots.txt allows `/browse/new-apps/` and `/software/` (it disallows `/browse/search/` and a `page` query parameter; `p` is not listed) | Per app on the list: **origin country**, pricing (Free, Freemium, Paid) and licence. About page: "Developed by", developer website, app website, date added (`datePublished`), platforms | T2 (origin), T1 (paid or proprietary), T4 soft (date added to AlternativeTo, not a launch date) | **Medium**; few Indian apps (3 of 25 on page 2, 1 of 25 on page 3), and all four Indian apps were free and open source | Indian apps seen, all fail T1: Plexo https://alternativeto.net/software/plexo/about/ · CleanYourTV https://alternativeto.net/software/cleanyourtv/about/ · RemoveMacAI https://alternativeto.net/software/removemacai/about/ |
| 6 | **Bing News RSS search** | `https://www.bing.com/news/search?q=<query>&qft=sortbydate%3d%221%22&format=rss` (tested 4 queries); `/robots.txt` | Works; robots.txt disallows only `/search`, not `/news/search` | Title, source outlet, date, a short description that sometimes names founders | T2 (with city words in the query), T3 sometimes, T4 (launch news) | **Low-medium**; mixes years and topics. The `qft=interval` filter gave only 4 items. Links are Bing redirect URLs, so open the outlet page | CopperPilot (pre-seed; founders Aditya NG, Mohit Bagur and Anish Harsha in the description; via Indian Startup News) · Niyyam (Bengaluru digital mutual fund platform launch, The Print, 2 Nov 2026) |
| 7 | **Inc42 Buzz feed and Funding Galore tag feed** | `https://inc42.com/buzz/feed/` (about 200k characters); `https://inc42.com/tag/funding-galore/feed/` (about 368k characters) | Both work | Buzz: daily news plus a "Startup Spotlight" inside the morning roundup. Funding Galore: weekly table of Date, Name, Sector, Business Model, Round Size, **Round Type (Seed, Pre-Seed)** and Investors, **with no founder or city** | T2, T1 (sector column), stage for size hints | **Medium-low**; the main Inc42 startups feed is already in the skill | Karta (Bengaluru voice AI, founded 2024, in the 5 Nov roundup): https://inc42.com/buzz/physicswallahs-q2-profit-surge-elo-elo-bags-80-mn-more/ · Funding Galore 31 Oct: https://inc42.com/buzz/from-to-cent-to-matiks-indian-startups-raised-over-132-mn-this-week/ |
| 8 | **Uneed tool pages** | `https://www.uneed.best/tool/skoora-ai` (homepage already in the skill) | Works | **Exact launch date** ("Launch Date: Nov 5, 2026"), Paid or Free label, website, publisher handle, socials | T4 (exact date), T1 (paid label) | **Medium** per page; global, no location | Skoora AI (paid, launched 5 Nov 2026): https://www.uneed.best/tool/skoora-ai · TimeLoop: https://www.uneed.best/tool/timeloop |
| 9 | **StartupBase** | `https://startupbase.io/`; `https://startupbase.io/products/findrix` | Works (HTML) | Today's launches with website; product page shows the maker as "Founder @<Product>", a "Launched today" label and an X link | T3 (founder named), T4 (relative date only), T1 | **Medium-low**; no location or pricing | Findrix (maker Iosif Merman): https://startupbase.io/products/findrix · Tsenta: https://startupbase.io/products/tsenta |
| 10 | **Fazier and Microlaunch product pages** | `https://fazier.com/launches/peakflow`; `https://microlaunch.net/p/weftwake` | Works | Fazier: maker name and bio, website, "Paid" with price details, monthly leaderboard. Microlaunch: website, pricing, maker sometimes only in the description | T1 (pricing), T3 (maker) | **Low-medium**; no exact date, no location | PeakFlow (John M., paid): https://fazier.com/launches/peakflow · Weftwake ("Made by one person, Arto Artinian", $7.99 a month): https://microlaunch.net/p/weftwake |
| 11 | **Hashnode tag pages** | `https://hashnode.com/n/saas`, `https://hashnode.com/n/buildinpublic`, profile `https://hashnode.com/@decillionai` | Pages work (text). **GraphQL API: `gql.hashnode.com` returned 522 and now redirects to an announcement saying API use needs a Pro plan** | Post title, author, relative date, blog URL (often on a product-named subdomain). Profile: name, bio, "Joined <month>"; **no location** | T4 soft, T1 (product blogs) | **Low-medium**; no India filter | Decillion (joined November 2026): https://decillionai.hashnode.dev/why-we-gave-our-ai-agents-a-shared-room-instead-of-a-chat-window · HivelyHR: https://hivelyhr.hashnode.dev/designing-a-free-plan-people-can-understand-before-they-sign-up |
| 12 | **JetBrains Marketplace API** | `https://plugins.jetbrains.com/api/searchPlugins?max=20&orderBy=publish%20date`; `https://plugins.jetbrains.com/api/plugins/35805` | Works (JSON) | `pricingModel` (FREE, PAID, FREEMIUM), `cdate` (created, in milliseconds), vendor name, `isTrader`; the plugin record has a contact `email`, `licenseUrl` and `sourceCodeUrl` | T1 (**paid flag**), T4 (created date), T5 (`sourceCodeUrl`) | **Low**; no country; mostly tiny plugins | DrawDiags (3 plugins on 4 Nov 2026, FREE): https://plugins.jetbrains.com/api/plugins/35805 |
| 13 | **Wellfound role and city lists** (new pattern) | `https://wellfound.com/role/l/software-engineer/bangalore` | Works (company pages are still 403) | Company, **size band**, stage, relative job date, city | T2, T3 size band, T1 | **Medium-low**; mostly 11-50 or larger | Actioneer (11-50, Bengaluru): https://wellfound.com/company/actioneer-hq · Altimate AI (11-50, Early Stage) |
| 14 | **Accel Atoms cohort posts** | `https://atoms.accel.com/`; `https://atoms.accel.com/news/meet-the-startups-in-ai-cohort-2026` | Works | Startup, **founders and roles**, one-liner, post date (16 Mar 2026); no website or city | T3, T1; T2 likely but not stated | **Low-medium**; funded pre-seed teams, and the cohort is old for T4 | Dodge AI (Rebhav Bharadwaj, Aditya Thakur) · Persistence AI (Utkarsh Marwaha) |
| 15 | **NSRCEL (IIM Bangalore) portfolio** | `https://nsrcel.org/portfolio/` | Works (24 cards; filters look JS-driven) | Founder, co-founders, **website**, sub-sector, stage (Bootstrapped, Pre-Seed, Seed), venture age band; no city or cohort | T3, T1, T2 implied (Indian incubator) | **Low-medium**; fintech-heavy first page; no dates | Boharr (Vaitheeswaran Santharam, bootstrapped): https://www.boharr.com · Covrzy (Ankit Kamra, pre-seed): https://covrzy.com |
| 16 | **Surge (Peak XV)** | `https://surge.peakxv.com/companies` (redirected from surgeahead.com) | Works; page 2 and the toggles look JS-driven | Names, **founders**, cohort (Surge 12); no website or city | T3 | **Low**; funded, often global | Alma (Nischith Shadagopan M N, Vinod Ganesan) · August AI (Anuruddh Mishra) |
| 17 | **Launching Next RSS + pages** | `https://www.launchingnext.com/` · `/rss/` · `/s/kamiyab/174502/` | Works | Name, website; page gives "Published <date>"; no founder or location | T4 soft, T1 | **Low**; spam-prone (the first RSS item was a gift-card ad) | Kamiyab (.in, free mock tests, published 4 Nov 2026): https://www.kamiyab.in/ |
| 18 | **Official MCP Registry API** | `https://registry.modelcontextprotocol.io/v0/servers?limit=20` | Works (JSON, cursor paging) | Server name (reverse-domain, so it reveals the company domain), description, repository URL, `websiteUrl`, `publishedAt` | T4 (publish date), T5 (repository), T1 hint | **Low** for India (no location) but a good dev-tool launch signal | snag ("gives a coding agent captured console, network, replay and screenshot evidence", published 2026-09-09) · inference.sh |
| 19 | **HasGeek** | `https://hasgeek.com/` | Works | Indian dev events with dates and cities (Rootconf 20-21 Nov, The Fifth Elephant 4-5 Dec, Bengaluru); calls for talks and demos | T2, a T4 hint via event demo slots | **Low** for discovery; use with the event-outreach skill | Rootconf 2026: https://hasgeek.com/rootconf/2026/ |
| 20 | **YC jobs in India** | `https://www.ycombinator.com/jobs/location/india` | Works (24 listings; more behind sign-in) | Company, batch, role, location, pay, relative date | T2 partly, T1 | **Low**; funded YC teams, many remote-US roles | GoSats (W22, Bengaluru) · SigNoz (W21) |

Also tested, low value (all work):
- **PyPI newest packages RSS** (`https://pypi.org/rss/packages.xml`): name, date and sometimes an author email. No location.
- **Atlassian Marketplace API** (`https://marketplace.atlassian.com/rest/2/addons?filter=recent&limit=10`): vendor name and `lastModified`. The vendor endpoint `/rest/2/vendors/81` returns 410.
- **Hugging Face API** (`https://huggingface.co/api/models?author=sarvamai&sort=createdAt&direction=-1`; `/api/organizations/sarvamai/overview`): `createdAt` only. No location or website.
- **GitHub README search** (`https://api.github.com/search/repositories?q=%22made+in+india%22+in:readme+created:%3E2026-08-01`): 352 hits, mostly student or free projects. No paid product among the 15 checked.
- **Medium tag RSS** (`https://medium.com/feed/tag/indian-startups`): 1 founder post in 10 (ReasonateAI, by a student founder).
- **echai Bengaluru SaaS** (`https://echai.ventures/bengaluru/saas`): 37 companies, mostly large (Postman, Hasura).
- **Titan Capital** (`https://www.titancapital.vc/portfolio`): 13 names, mostly large.
- **Antler India** (`https://www.antler.co/location/india`): a featured strip, no websites.
- **T-Hub** (`https://t-hub.co/`): 11 featured founders, no websites.
- **Latka** (`https://getlatka.com/companies/countries/india/cities/bengalore`): 1 company.
- **StartupTalky RSS** (`https://startuptalky.com/rss/`): works, but it is listicles and news; no early-stage items.
- **Analytics India Magazine RSS** (`https://analyticsindiamag.com/feed/`): works; enterprise news, rarely small startups.

## 3. Per-source notes

**Indian Startup News** (`https://indianstartupnews.com/rss`). `/feed` is 404 and `/rss` works. The feed is long (about 330k characters), so read it in three calls with `offset`. Filter on the `/funding/` link path and the words pre-seed, seed and angel. The item text gives founders and city directly, for example "Noida-based fitness startup OBSESS raises Rs 3 crore just 8 months after its launch". That is a launch age, not a launch date, so date T4 from the company. As always, prove T1-T3 on the company site.

**Entrackr** (`https://entrackr.com/rss`, `https://entrackr.com/snippets`). The snippets section is the quickest scan for small rounds and product launches. The RSS text named the Venomics AI co-founders and placed the company in Bengaluru, while the snippets page title alone did not. Use the RSS for the evidence and the snippets page for the scan.

**Indian Startup Times** (`https://www.indianstartuptimes.com/feed/`). The `/interviews/` items are founder Q&As. That makes them good T3 evidence (a dated article naming the founder), and they also describe the product. Funding items are mostly later-stage.

**DEV.to `tag=india`** (`https://dev.to/api/articles?tag=india&per_page=30`). Indian builders tag their own product stories "india" when the product is India-specific (Hindi, GST, SSC exams, kirana). Check the author with `https://dev.to/api/users/by_username?url=<username>`; autobot360's profile was empty, so find the company site with WebSearch. Other tags worth the same call: `indianstartup`, `buildinpublic` (global).

**AlternativeTo** (`https://alternativeto.net/browse/new-apps/`). It is the only global launch list here that shows origin country and pricing on the list itself. Scan pages 1-3 each run for India plus Paid or Freemium plus Proprietary. robots.txt carries `Content-Signal: ai-train=no, search=yes, ai-input=yes`, which allows AI answers, and disallows `/browse/search/` and query parameters such as `page`, `sort` and `q`. Use only `?p=N` paging, or page 1 alone if in doubt. The date added is the AlternativeTo listing date, not a launch date.

**Bing News RSS** (`https://www.bing.com/news/search?q=...&format=rss`). Allowed by robots.txt. Useful queries: `"Bengaluru-based" OR "Pune-based" OR "Hyderabad-based" launches AI platform` and `India startup pre-seed AI SaaS founder`. Add `&qft=sortbydate%3d%221%22` for newest first. Results mix in old articles (one from 2022), so check every date. Links go through `bing.com/news/apiclick.aspx`; take the outlet URL from the `url=` parameter and open the outlet directly.

**Google News RSS: robots disallow.** `https://news.google.com/rss/search?q=...` returned good results: 28 items for a pre-seed query, including Myca, CurvetAI (Pune) and Bucketlistt. But `news.google.com/robots.txt` has `User-agent: *` / `Disallow: /`, and its `Allow` lines don't cover `/rss`. Agents must not use it. A person may.

**Inc42 sub-feeds.** `https://inc42.com/buzz/feed/` works, and the morning roundup carries a "Startup Spotlight" on one early company (Karta, Bengaluru voice AI). `https://inc42.com/tag/funding-galore/feed/` gives the weekly table with Round Type, but no founder or city. `https://inc42.com/tag/startup-spotlight/feed/` returned the homepage HTML, not a feed. `https://inc42.com/datalabs/hot-early-stage-startups/` is 404.

**Hashnode.** The GraphQL API is no longer free. A GET query to `gql.hashnode.com` returned 522, the root redirects to `https://hashnode.com/announcements/graphql-api`, and that page says every API request requires a Pro plan. That is a paid tool, so it is out. Tag pages and profiles work as plain text, but profiles show no location. Per-blog RSS still exists (not re-tested).

**Uneed, StartupBase, Fazier, Microlaunch product pages.** These were untested in the first log. Uneed is the best of the four: it shows an exact "Launch Date" and a Paid label. StartupBase shows "Founder @<Product>". All four are global and show no location, so T2 must come from the company site.

**JetBrains Marketplace.** The only marketplace API seen today with a machine-readable **paid** flag (`pricingModel`). The vendor has no country field.

**Accelerators and VCs.**
- **NSRCEL** (`/portfolio/`): founder and website per card.
- **Accel Atoms** (`/news/meet-the-startups-in-...`): founders, no websites.
- **Surge** (`/companies`): founders, no websites.
- **Titan Capital, Inflection Point** (`https://www.ipventures.in/portfolio`, logos only), **Antler, T-Hub:** logos or a featured strip only.
- **100X.VC:** the homepage has no portfolio page, and `/portfolio-companies` is 404.
- **Better Capital:** `/portfolio` is 404.
- **SaaSBoomi:** no startup directory.
- **CIIE.CO** (`www.ciie.co`) and **Nasscom 10000 Startups** (`10000startups.com`): DNS lookup failed.

None of these gives a launch date. Use them only to add T3 founder names to a lead found elsewhere.

**WebSearch snippets for walled sites.** I tested `site:peerlist.io/*/project`, LinkedIn posts and `site:indiehackers.com`. The results carry page titles and sometimes one line of text. One Peerlist project page surfaced (`peerlist.io/amit_turan/project/launchpad-india`, LaunchPad India itself), but no snippet gave a product name, site, city and date together. The LinkedIn query returned profiles and company pages, not posts. Verdict: not a usable source. Snippets alone never prove a test, and opening the pages is blocked.

## 4. Browser-only (would need a real JS-rendering browser, and a person if a login is involved)

| Source | URL fetched | What the agent got |
|---|---|---|
| VS Code Marketplace search | `https://marketplace.visualstudio.com/search?sortBy=PublishedDate&target=VSCode` | Header and footer only; listings load by script (the API is POST-only) |
| Zapier new apps | `https://zapier.com/apps/categories/new` | "No apps match your current filters" and "Loading" |
| NowLaunch (Indian launch board) | `https://www.nowlaunch.in/` | "0 live startup launches"; the list renders client-side |
| Unstop (Indian hackathons) | `https://unstop.com/hackathons` | Cookie wall ("Cookies are disabled"), no listings |
| LaunchPad India listing pages | (already in the skill) | JS-only |
| Surge page 2 / NSRCEL filters / Titan Capital counters | see table | The first page renders; paging and filters need JS |
| Devfolio project galleries | `https://devfolio.co/hackathons` | The hackathon list works (dates, Online or Offline), but "See projects" targets are not in the text |
| Google Workspace Marketplace | `https://workspace.google.com/marketplace/search/new` | Loads, but shows popular apps; no newest sort without JS |

## 5. Blocked, refused, dead or disallowed

| Source | URL | Result |
|---|---|---|
| Google News RSS | `https://news.google.com/rss/search?...` | **robots.txt disallow** (`Disallow: /`, no Allow line for `/rss`). Don't use |
| Hashnode GraphQL | `https://gql.hashnode.com/?query=...` | 522; the API now needs a Pro plan (paid) |
| Moneycontrol RSS | `https://www.moneycontrol.com/rss/business.xml` | WebFetch refuses the domain |
| Livemint RSS | `https://www.livemint.com/rss/companies` | WebFetch refuses the domain |
| Business Standard startups RSS | `https://www.business-standard.com/rss/companies/start-ups-10123.rss` | 403 |
| YourStory funding feed and article pages | `https://yourstory.com/feed/category/funding`; `/2026/11/startup-news-and-updates-daily-roundup-november-05-2026` | 403 (the main `yourstory.com/feed` still works, per the earlier log) |
| BW Disrupt RSS | `https://www.bwdisrupt.com/rss` | 403 |
| Toolify new | `https://www.toolify.ai/new` | 403 |
| Figma Community | `https://www.figma.com/community/plugins?...` | 403 |
| Instahyre | `https://www.instahyre.com/jobs-in-bangalore/` | 403 |
| Devpost | `https://devpost.com/software/newest` | 403 |
| Gust | `https://gust.com/search/new?...location=India` | 403 |
| F6S | `https://www.f6s.com/companies/india/lo` | 405 |
| Slack app collection | `https://slack.com/apps/collection/new-and-noteworthy` | 404 |
| startupnews.fyi | `https://startupnews.fyi/feed/` | 404 |
| Indian Startup News `/feed` | `https://indianstartupnews.com/feed` | 404 (use `/rss`) |
| Inc42 Datalabs early-stage list | `https://inc42.com/datalabs/hot-early-stage-startups/` | 404 |
| Better Capital, 100X.VC portfolio | `https://www.better.capital/portfolio`; `https://www.100x.vc/portfolio-companies` | 404 |
| CIIE.CO, Nasscom 10000 Startups | `www.ciie.co`; `10000startups.com` | DNS lookup failed (the real domains may differ; not chased) |
| IndiHunt | `https://www.indihunt.com/` | Parked domain. It exists only as a Product Hunt forum page; the real site is still unknown (the earlier `indihunt.in` test gave 503) |
| Atlassian vendor API | `https://marketplace.atlassian.com/rest/2/vendors/81` | 410 |
| SaaSHub new / TinyLaunch / Startup Stash | `https://www.saashub.com/new`; `https://tinylaunch.com/`; `https://startupstash.com/` | Load, but no dates, sites or location (SaaSHub), no dates or location (TinyLaunch), no listings (Startup Stash). Not worth using |

## 6. How to fold this into the lead-sources skill (suggested, not applied)

1. Add an **"Indian startup news"** row above Inc42: `indianstartupnews.com/rss` (filter `/funding/` plus pre-seed, seed and angel), `entrackr.com/rss` plus `/snippets`, and `indianstartuptimes.com/feed/` (`/interviews/`). Together they prove T2 and T3 from a dated article; T1 and T4 come from the company.
2. Add **AlternativeTo new apps** to the small launch boards row as the one board that shows the country.
3. Add the **DEV.to India pass**: `tag=india`.
4. Add **Bing News RSS** as a discovery-only feed, and **Google News RSS** to the "do not use (robots)" list.
5. Move **Hashnode** from "untested" to "API needs a paid plan".

## 7. Prompt-like content seen

None addressed to the agent. Page and feed text was read only as data.
