# MotionRepo segment 1 lead batch 2, 2026-11-05 (T-20261105-05)

Run by lead-generator. Product: motionrepo. Batch file: `pipeline/inbox/2026-11-05-motionrepo-2.jsonl`. Earlier notes (`outputs/research/2026-11-05-motionrepo-lead-notes.md`) were not edited. HubSpot, X, LinkedIn and logins were not used. Dedupe was done by hand against `node scripts/leads.mjs list --product motionrepo` (9 leads at the start), the earlier 23 candidates and every row of `pipeline/human-research.md`, by root domain, parent company and brand variant. None of the 22 candidates below matched an existing lead, except the open candidates this run was asked to finish (Blobz, NovaLabs.in, Skopaq AI, Borehole, Coincide, RapidCue, Review Router).

Assumptions made under autopilot (a person can reverse any of them):
1. Review Router is recorded as rejected on T2 by citing review T-20261105-01-r1 (finding 9); I did not re-open tenpace.com.
2. T4 window is 2026-10-06 to 2027-01-04 (30 days back, 60 ahead of 2026-11-05).
3. For Illos.dev, T2 rests on the maker's own site (naved.xyz), because illos.dev states no country; scored at medium confidence and flagged for a person.
4. A paid product whose only contact is a product-named or general inbox (hello@) is scored as a general inbox, reachability capped at 5. A personal gmail on a page (pmithunish@gmail.com on kadal.cc, navedux@gmail.com on naved.xyz) is not used.
5. Dottr (optional in the brief) was not re-tested and is not counted.

## 1. Summary

- Candidates checked: 22.
- Imported: 2 of 22 (Kadal Deck, L-efbb45da, tier C, score 48; Illos.dev, L-449ce286, tier C, score 49; both status new).
- Rejected: 10 of 22 (positive evidence for a failed test).
- Open: 10 of 22 (a test is unknown; what would settle each is in section 6). Only RapidCue's existing row in `pipeline/human-research.md` was updated (status cell and a dated note); no new human-research rows, because the other open rows are settled by an agent or have no sign of fit.
- Stop rule: about 25 candidates was nearly reached (22), and the last searches in a row found nothing new: the Show HN city queries (11 cities, 0 India-based paid products), the Ask HN and comment buyer-intent queries (0 buyers), and the two last GitHub org searches. Imported 2 of the 6 allowed. No near-match was stretched to reach the count.
- Both leads are tier C and neither shows a stated need. Kadal Deck already has a launch film; Illos.dev has an observed gap (no video on three pages) but no stated need. A person decides whether either deserves a draft.
- Share of new leads whose need evidence rests on a dated, published intent item: 0 of 2.

## 2. Sources tried

All fetched on 2026-11-05 without a login.

| Source and query | Returned | Verdict |
|---|---|---|
| Open candidates: Show HN item 50086216 (Blobz), github.com/lirena00/blobz, lirena.in, blobz.lirena.in/pricing (404), api.github.com/users/LiReNa00 | Three comments all by the author; MIT components plus a paid hosted API; no country anywhere; his site lists "Software Engineer at LocalHost HQ, Jul 2026 to present" | Blobz stays open on T2, T3 |
| api.github.com/orgs/Novalabs-in, `/repos`, saitejabandaru.com | Bengaluru; 15 newest repos all MIT, last pushed 2026-07-13; blog is a personal data-scientist page | NovaLabs rejected on T1 |
| skopaq.com, skopaq.com/about (404), api.github.com/orgs/Skopaq-AI/repos | Registered office Hyderabad; no founders, team size or prices; "Let's Talk"; target is satellite operators | Skopaq stays open |
| borehole.dev, borehole.dev/terms | Operated by AELaboratories, Sanford, North Carolina; governed by North Carolina law | Borehole rejected on T2 |
| producthunt.com/products/coincide | "free, open-source native Mac app" (MIT); maker Apoorv Darshan | Coincide rejected on T1 |
| rapidcue.ai, /pricing.html, /terms-and-conditions.html, /contact-us.html, /blog.html; Peerlist resume and project pages (403); WebSearch for the directors | Bengaluru address, Indian law, paid seat plans; no founders named; blog shows no posts | RapidCue stays open (T3, T4, T5) |
| Show HN, Algolia, `created_at_i>1791244800`, single-term queries: delhi, mumbai, chennai, gurugram, noida, ahmedabad, jaipur, kochi, kolkata, indore, hyderabad | delhi 29+ hits (fuzzy matches, none shows India); mumbai 2; chennai 1; gurugram 0; noida 3; ahmedabad 0; jaipur 0; kochi 2 (one repeated post); kolkata 0; indore 1; hyderabad 0 | Ran dry: no hit names an Indian paid product. Algolia matches loosely, so none of these hits proves a city |
| GitHub org search `type:org location:<city> created:>2026-01-01 repos:>2`: delhi 1, mumbai 1, chennai 2, gurugram 0, noida 1, ahmedabad 1, jaipur 1, kochi 0, kolkata 3, indore 0 | 10 orgs; 5 opened: DebugSwift, yggdrasilhq, Kadal, RajISG, E-Motioner-X-SBS | Kadal found here; the other four rejected or open |
| GitHub org search `location:india created:>2026-09-20 repos:>1 sort=joined`: 348 total, 40 listed; `location:bangalore created:>2026-09-01`: 2 | 4 orgs opened: smollabs, SentioGate, Crawlexa, P95 Labs | None passes; see section 6 |
| DevHunt `/upcoming` | 103 tools in 4 weeks (40 on 10 Nov, 22 on 17 Nov, 19 on 24 Nov, 22 on 1 Dec); no location or pricing label on the list | 6 tool pages opened: PingWise, mailkube, CodeReviewr, HaiPay, honest-ci, CueHQ.Social (404). Terms read for PingWise, honest-ci, mailkube, CodeReviewr (522 twice) and HaiPay (403). None shows India |
| Product Hunt `/feed` (50 entries) | All but Sonari, Hira, LidCommit and Country Filter for X are new this run; no location shown | None opened; no signal of India or of a paid founder-led product that was not already tested. Ran dry |
| LaunchPad India `launchpadindia.co` | 34 new launches and 4 established, with cities, no dates, plus a list of last-week and last-month products | Illos.dev found in the last-month list. WebSearch on AiGrowBot and Synra found nothing that ties them to a founder or a city. Most listed products are SMB or consumer apps, not GitHub-based |
| Illos.dev: illos.dev, /about, /terms, /pricing, /changelog, /alternatives, naved.xyz, Product Hunt product, launches and makers pages, api.github.com/users/navedux, `/repos/navedux/illos-skills`, `/users/navedux/events/public` | See section 5 | Imported |
| Kadal Deck: kadal.cc, kadal.cc/terms, deck.kadal.cc, /terms, /changelog/, pmithunish.com, `api.github.com/repos/kadalcc/deck` releases, contributors, `/orgs/kadalcc/members`, YouTube `@kadalcc/videos` | See section 5 | Imported |

GitHub API calls this run: about 47 (shared hourly allowance of 60, so none was refused). Blocked or refused: Peerlist (403), haipay.net/terms (403), codereviewr.app/terms (522 twice), borehole.dev none, YouTube channel page (loaded without video data).

## 3. Buyer-intent search

Queries run (HN Algolia, from 2026-10-06 unless said):
- Show HN: `repo to video` (18 hits read).
- comments: `"launch video" github` (2 hits), `"product hunt" video launch` (0 hits), `repoclip` since 2026-07-08 (0 hits).
- Ask HN: `demo video` (5 hits, all by one author).

Phrase kinds covered: "alternative to a rival" (repoclip: 0), "built their own" (repo to video Show HN), "asking how to solve it" (Ask HN), "Product Hunt launch video" (named workflow). Kinds not run for lack of budget: migrating away, pricing pain, missing feature.

Kept as a lead: 0. Kept for the language bank: 0 new.
- Ask HN 50359931 (4 Nov, "Leave a comment if you need a product demo video") has no comments (`children` is empty); 50367264 (4 Nov) has one comment, by the same poster; 50129647 and 50177313 are surveys by the same poster who promotes a demo-video tool; all are makers of a competing product, not buyers.
- The Show HN hits for repo-to-video are open-source tools (Gauge, Dub Anything and others); their writers are makers.
- The "launch video" comment hits are a project link (Cloudroom) and a job-seeker post; neither shows a need.

Share of leads whose need evidence rests on a dated, published intent item: 0 of 2. Both leads come from a source search (GitHub org search, LaunchPad India) and the need is inferred or an observed gap.

## 4. Per-test table

pass, fail, unknown. T4 window: 2026-10-06 to 2027-01-04. "M" = medium confidence. Every cell with a URL was read this run unless it says "per notes" or "per review".

| # | Candidate | T1 | T2 | T3 | T4 | T5 | T6 | Outcome |
|---|---|---|---|---|---|---|---|---|
| 1 | Kadal Deck | pass: https://deck.kadal.cc (Starter $4, Pro $8 a month) | pass: https://deck.kadal.cc/terms (laws of India, Chennai) | pass M: https://deck.kadal.cc ("Mithunish Prabhakaran, who builds all of it"; studio wording kept as a caveat) | pass: https://deck.kadal.cc/changelog/ ("0.1.0 9 October 2026 · first release") | pass: https://github.com/kadalcc/deck | pass: no competitor, no disqualifier; a launch video exists and only lowers the score (https://deck.kadal.cc) | imported |
| 2 | Illos.dev | pass M: https://illos.dev/pricing ($89 Pro, $299 Team, one time; a skill and illustration library) | pass M: https://naved.xyz ("Bengaluru, India"); illos.dev names no country | pass M: https://illos.dev/about ("Naved Alam created Illos and runs it"); https://www.producthunt.com/products/illos-dev/makers (one maker) | pass: https://www.producthunt.com/products/illos-dev/launches ("Launched on October 20th, 2026") | pass: https://github.com/navedux/illos-skills (maker's active account; product code itself is not public) | pass: https://illos.dev/alternatives (nine rivals, none a video or repo-to-video tool) | imported |
| 3 | Blobz (lirena00) | pass: paid hosted API, $49.90 a year per notes (https://blobz.lirena.in); components are MIT (https://github.com/lirena00/blobz) | unknown: https://lirena.in (no country); GitHub location reads "Valley Of Incognito" | unknown: https://lirena.in (employed as "Software Engineer at LocalHost HQ, Jul 2026 to present"; word founder absent) | pass: Show HN item 50086216, 14 Oct 2026 per notes (date not re-read) https://hn.algolia.com/api/v1/items/50086216 | pass: https://github.com/lirena00/blobz | unknown | open |
| 4 | NovaLabs.in | fail: https://api.github.com/orgs/Novalabs-in/repos (15 newest repos all MIT; org description "open-source products") | pass: https://api.github.com/orgs/Novalabs-in (Bengaluru) | unknown: https://www.saitejabandaru.com (personal page; no link to NovaLabs) | unknown: newest push 2026-07-13, no launch | pass: same repos | unknown | rejected |
| 5 | Skopaq AI | unknown: https://skopaq.com ("Let's Talk", no prices) | pass: https://skopaq.com (registered office Hyderabad) | unknown: https://skopaq.com (founders not named) | unknown | pass: https://api.github.com/orgs/Skopaq-AI/repos | unknown: same page (named target is satellite operators; not ruled on) | open |
| 6 | Borehole (AELaboratories) | pass: https://devhunt.org/tool/borehole (euro prices per notes) | fail: https://borehole.dev/terms ("governed by the law of the State of North Carolina, United States") | pass M: https://borehole.dev ("Built by Andrew Edmond") | pass: https://devhunt.org/tool/borehole per notes | unknown | unknown | rejected |
| 7 | Coincide (Apoorv Darshan) | fail: https://www.producthunt.com/products/coincide ("free, open-source native Mac app", MIT) | unknown | pass M: same page (one maker) | unknown: launch week of 4 Nov, exact date not on the page | pass: https://github.com/apoorvdarshan/coincide | unknown | rejected |
| 8 | RapidCue (Anonimo Interactive) | pass M: https://rapidcue.ai/pricing.html (seat plans, 7-day trial) | pass: https://rapidcue.ai/terms-and-conditions.html ("laws of India", Bengaluru courts) | unknown: no founders on the terms, contact or home page | unknown: https://rapidcue.ai/blog.html (no posts listed) | unknown: no GitHub on the site | unknown: no video on the home page; sells a sales CRM | open |
| 9 | Review Router (Tenpace) | pass: https://review-router.tenpace.com per notes | fail: per review, https://tenpace.com/terms-of-service ("Tenpace Inc.", United States law); not re-opened by me; see outputs/reviews/T-20261105-01-r1.md finding 9 | unknown | pass: https://devhunt.org/tool/review-router per notes | unknown | unknown | rejected |
| 10 | DebugSwift | fail: https://api.github.com/orgs/DebugSwift ("A technology agency in Kolkata") | pass: same (Kolkata) | unknown | unknown | pass: same org | unknown | rejected |
| 11 | yggdrasilhq | fail: https://api.github.com/orgs/yggdrasilhq ("Free software") | pass: same (Kolkata) | unknown | unknown | pass: same org | unknown | rejected |
| 12 | RajISG LLC | unknown | unknown: https://api.github.com/orgs/RajISG-BP (location Mumbai, but the description calls it "a Wyoming, USA entity"; both recorded) | unknown | unknown | pass: same org | unknown | open |
| 13 | E-Motioner-X-SBS | fail: https://api.github.com/orgs/E-Motioner-X-SBS (research lab at IISER Kolkata) | pass: same | unknown | unknown | pass: same org | unknown | rejected |
| 14 | PingWise | pass: https://devhunt.org/tool/pingwise (freemium, prepaid packs) | fail: https://pingwise.com/terms ("a sole proprietorship registered in Greece", Greek law) | pass M: same ("operated by Alexandros Kyrlis") | pass: https://devhunt.org/tool/pingwise ("Launching November 10, 2026") | unknown | unknown | rejected |
| 15 | honest-ci | pass: https://devhunt.org/tool/honest-ci (paid team tiers) | fail (M): https://honest-ci.dev/terms (governed by the laws of the People's Republic of China, Shanghai courts; operator's country not stated) | pass M: same ("Wenchao Gou, the developer of honest-ci") | pass: https://devhunt.org/tool/honest-ci (17 Nov) | unknown | unknown | rejected |
| 16 | Crawlexa | fail (M): https://api.github.com/orgs/Crawlexa ("a managed web data extraction provider", a service; site not opened) | pass: same (India) | unknown | unknown | pass: same org (3 repos) | unknown | rejected |
| 17 | CodeReviewr | unknown: https://devhunt.org/tool/codereviewr (listed "Free", description says pay for developers who ship) | unknown: codereviewr.app/terms (522 twice, page not read) | pass M: https://devhunt.org/tool/codereviewr (maker named) | pass: same (10 Nov) | unknown | unknown | open |
| 18 | mailkube | pass: https://devhunt.org/tool/mailkube (paid tiers from $6) | unknown: https://mailkube.com/ (no operator or country; data stored in the EU) | unknown: maker "Fourat" on DevHunt, no role | pass: https://devhunt.org/tool/mailkube (10 Nov) | pass: https://github.com/mailkube | unknown | open |
| 19 | HaiPay | pass: https://devhunt.org/tool/haipay (paid card rates) | unknown: haipay.net/terms (403, page not read) | unknown | pass: https://devhunt.org/tool/haipay (10 Nov) | unknown | unknown | open |
| 20 | SentioGate | unknown: https://sentiogate.app (free beta, no prices) | unknown: GitHub org location India only (https://api.github.com/orgs/SentioGate) | unknown: no founder named | unknown: no launch date | pass: same org (6 repos) | unknown | open |
| 21 | P95 Labs | unknown: https://www.p95labs.com (no price or license on the page) | unknown: GitHub org location Bangalore (https://api.github.com/orgs/p95labs) | unknown: "Solo-built, pre-users, alpha", no name on the page | unknown: v0.2.0-alpha.1 undated | pass: source linked on the site | unknown | open |
| 22 | smollabs | unknown | unknown: GitHub org location India (https://api.github.com/orgs/smollabs), created 2026-11-04 | unknown | unknown | pass: same org (6 repos) | unknown | open |

Recount: 22 rows = 2 imported (#1, #2) + 10 rejected (#4, #6, #7, #9, #10, #11, #13, #14, #15, #16) + 10 open (#3, #5, #8, #12, #17, #18, #19, #20, #21, #22).

## 5. Imported leads

### L-efbb45da, Kadal Deck (Kadal, run by Mithunish Prabhakaran), tier C, score 48

- Breakdown: icp_fit 25, need_evidence 5, timing 13, reachability 5.
- Rationale: a paid, hosted AI presentation app run by one named person in Chennai, with a first public release 27 days ago, 14 releases between 26 Oct and 2 Nov and a public repo. Need is weak: the site already has a launch film and a click-through tour, and no gap was found. Team size is not stated. The one need item is inferred (release cadence), never to be mentioned to them.
- Evidence re-opened before hand-in: https://deck.kadal.cc/changelog/ ("0.1.0 9 October 2026 · first release"; "The first public release: the engine opens, and the hosted service starts taking decks"; "0.11 0.11.0 to 0.11.2 · 28 October to 2 November 2026"; "A new home page with the launch film and the tour you can click through"). https://deck.kadal.cc ("Mithunish Prabhakaran, who builds all of it"; "The studio behind these: we build AI products end to end, for your team too"; "The whole show in 44 seconds. Sound on."; Starter "$4 a month", Pro "$8 a month"). https://deck.kadal.cc/terms ("run by Mithunish Prabhakaran, an individual based in Chennai, Tamil Nadu, India, trading as Kadal"; "governed by the laws of India"; last updated 25 October 2026). GitHub: v0.11.3 published 2026-11-02T20:40:46Z; contributors pmithunish (340) and github-actions (47); org kadalcc public members: pmithunish only.
- Launch note: T4 passes on the dated first public release (9 October 2026). A future launch date was not found; the changelog lists no upcoming item.
- Competitor check: an AI presentation app. The competitor file lists no presentation tool; Canva is the nearest indirect category (manual design), and Kadal Deck is a presentation app, not a video or repo-to-video tool.
- Contact: hello@kadal.cc, page https://deck.kadal.cc ("Anything else: hello@kadal.cc, or ask on Discord."; also in the footer). General inbox: reachability capped at 5. Not used: pmithunish@gmail.com (a personal address, on kadal.cc/terms) and the same address from the repo README (GitHub is not a contact source). No person's address is published.
- Gate verdict: Not reviewed (tier C).
- Open questions for a person: (1) The home page calls Kadal Studio "the studio behind these ... we build AI products end to end, for your team too", while the terms call the operator "an individual". Does this make Kadal a studio (a separate segment), or one founder with a trade name? (2) The site already has a launch film: is a lead with no found gap worth a draft? (3) His own site (https://pmithunish.com) says he is "doing an M.Tech in AI at SRMIST"; a student, which I recorded and did not score.

### L-449ce286, Illos.dev (Naved Alam), tier C, score 49

- Breakdown: icp_fit 22, need_evidence 8, timing 14, reachability 5.
- Rationale: one named maker, Bengaluru (from his own site), paid licence, public GitHub skill repo, Product Hunt launch 20 Oct 2026 and a release on 4 Nov. icp_fit is held below 25 because India rests on the maker's own site only, he has a day job at NodeOps, and the product is an illustration library more than an app with a repo. Need is an observed gap on three pages with no stated intent.
- Evidence re-opened before hand-in: https://illos.dev/about ("Naved Alam created Illos and runs it."; "On 20 October 2026, with three themes."; "Interface, the fourth, came on 1 November 2026."). https://www.producthunt.com/products/illos-dev/launches ("Launched on October 20th, 2026"; media is the logo GIF only). https://www.producthunt.com/products/illos-dev/makers ("Naved Alam: Design engineer, building Illos.dev"). https://illos.dev/changelog (15 dated entries, 2026-10-04 to 2026-11-04; no upcoming items). https://naved.xyz ("Bengaluru, India"; "My new product, Illos, is live"; "CreateOS at NodeOps"). GitHub navedux/illos-skills: MIT, pushed 2026-11-04T18:11:21Z, homepage illos.dev; maker's events of 2-3 Nov.
- Observed gap, 2026-11-05: no video element, embed or YouTube link on https://illos.dev; Product Hunt launches page media is a logo GIF and the product page shows four static images; the changelog has no "launch" or "video" wording. Checked: illos.dev home, Product Hunt product and launches pages, changelog. Not checked: YouTube (no channel is linked from the site), X (not an allowed source). A launch video MotionRepo makes would close this gap; recheck YouTube before any send.
- Dates in conflict: the Product Hunt product page links a leaderboard dated 4 November 2026, while the launches page says 20 October. I used the launches page.
- Pricing conflict: the Product Hunt maker comment (per the fetch summary) says Pro $49 at launch and "a year of new illustrations and updates", while the pricing page says "$89, one time" and the changelog has an entry "Lifetime updates" (29 Oct). The lead uses the pricing page.
- Competitor check: the alternatives page names nine rivals (unDraw, Storyset, LottieFiles, SketchValley Motion, DrawKit, Icons8 Ouch, IconScout, Blush, Shadcn UI Kit); none is in the competitor file.
- Contact: hello@illos.dev, page https://illos.dev (the refunds answer says to write to it; the pricing page lists none). General inbox: reachability capped at 5. Not used: navedux@gmail.com (personal, on naved.xyz), and his LinkedIn link on naved.xyz (not opened).
- Gate verdict: Not reviewed (tier C).
- Open questions for a person: (1) Is India on the maker's own site enough for T2 when illos.dev names no country and the price is in US dollars with no GST? (2) His day job is shipping CreateOS at NodeOps: does a side product by an employee count as founder-led? (3) Does an illustration-library product need launch videos and PDFs from a repo, given its repo is only the free skill?

## 6. Rejected and open candidates

Rejected (failed test and source are in the table):
- 4 NovaLabs.in: free, open source (T1). Newest push 2026-07-13.
- 6 Borehole: a North Carolina company (T2).
- 7 Coincide: free and open source (T1).
- 9 Review Router: a US company (T2), per review T-20261105-01-r1, not re-opened.
- 10 DebugSwift: an agency (T1). 11 yggdrasilhq: free software (T1). 13 E-Motioner-X-SBS: a research lab (T1).
- 14 PingWise: Greek sole proprietorship (T2). 15 honest-ci: Chinese governing law, operator country not stated (T2, medium; if its maker is in India the row should reopen, but nothing says so).
- 16 Crawlexa: a managed data extraction service (T1, medium; its site crawlexa.com was not opened).

Open, with what would settle each (a row is added to `pipeline/human-research.md` only where a person is needed; none is added, as RapidCue already has a row):
- 3 Blobz: T2 (no country on any page I read), T3 (employed full time; word founder absent), T6. An agent could read the Blobz docs at blobz.lirena.in for a company or country; the pricing path returned 404. Low chance.
- 5 Skopaq AI: T3 and T4. The site names no founders; the target is satellite operators with a "Let's Talk" call to action, which points to enterprise (T6). An agent could read its privacy or terms pages (not found at /about). Low chance.
- 8 RapidCue: T3, T4, T5. The row in `pipeline/human-research.md` was updated: T2 now passes (Indian law, Bengaluru). Missing: founders and size, a dated launch, GitHub. Who: a person reading the Peerlist listing (403 to agents), or an approved question to biz@rapidcue.ai.
- 12 RajISG LLC: T1, T2, T3. The org record says Mumbai and "a Wyoming, USA entity". An agent could read contentauthenticity.rajisg.com terms.
- 17 CodeReviewr: T2 and T5. Terms returned 522 twice; an agent can retry later.
- 18 mailkube: T2 and T3. No operator or country on the page; terms returned 404. An agent could read docs.mailkube.com.
- 19 HaiPay: T2, T3, T5. Terms returned 403 to agents; a payments company may also meet T6. Low chance.
- 20 SentioGate: T1, T2, T3, T4. A free beta, no founder named, no country. An agent could read sentiogate.app/terms and /privacy.
- 21 P95 Labs: T1, T3, T4. "Solo-built, pre-users, alpha", no price, no name on the page. A launch is not near. Low chance.
- 22 smollabs: everything but T5 unknown; the org has no description or site and was created 2026-11-04. Low chance.

Dottr: not re-tested (optional in the brief); its Delaware address makes T2 unlikely.

Segment 1 is still thin on free sources. Two sources found the leads (GitHub org search by city, LaunchPad India's last-month list); Show HN and DevHunt returned no Indian paid product, because neither shows a location. A person with a login would help most with Peerlist Launchpad and Product Hunt India.

## 7. Pages read and not opened

Read: every URL in section 4 except those marked "per notes" or "per review"; plus https://api.github.com/orgs/kadalcc, `/repos`, `/members`, https://api.github.com/repos/kadalcc/deck/contributors, https://www.producthunt.com/products/illos-dev, https://illos.dev/terms, https://hn.algolia.com/api/v1/items/50359931 and 50367264, the Algolia search pages listed in sections 2 and 3, https://devhunt.org/upcoming, https://www.producthunt.com/feed, https://launchpadindia.co.

Not opened or failed:
- rapidcue.ai/terms and /pricing (404; the real pages end in .html), peerlist.io/rapidcue/resume and /project/rapidcue (403), skopaq.com/about (404), blobz.lirena.in/pricing (404), codereviewr.app/terms (522 twice), mailkube.com/terms (404), haipay.net/terms (403), devhunt.org/tool/cuehq-social (404). Written without links on purpose: they are findings, not sources.
- https://www.youtube.com/@kadalcc/videos loaded without video data, so Kadal's YouTube content is unknown.
- The Algolia `delhi` page was cut at 29 hits (last 8,429 characters unread).
- Not opened for lack of any sign of fit: the GitHub orgs RSL-Quantum, dnyxacademy, accelerate-muj, koherarchitecture, Mobintix-Technologies, the other 34 orgs in the India list of 40 (for example WhiteboxAcademy, MiidayStudio-org, drdpdev, yoink-d; names alone showed no product), and the 50 Product Hunt feed entries other than those already tested.
- Not tried: HubSpot (not authorised), LinkedIn, X, Peerlist, Reddit.

## 8. Instructions found in web content

None found. Several pages offered actions (Kadal's "ask on Discord", Illos's "write to hello@illos.dev", a Show HN post offering to make demo videos on request); none was acted on, and nobody was contacted.

## 9. Self-review

- Re-read the brief: pass. Notes have sections 1 to 9 in the order asked; the batch file is at the asked path; `pipeline/human-research.md` changed only in the RapidCue row (a dated note at the start of its Notes cell; the Status cell stays open); no draft, no contact, no `set-status`, `hold` or `next`, no HubSpot; the earlier notes were not edited.
- Counts match the body: pass. Recount of the section 4 table: 22 rows = 2 imported + 10 rejected + 10 open; the same figures appear in section 1.
- `node scripts/leads.mjs import pipeline/inbox/2026-11-05-motionrepo-2.jsonl`: "Imported pipeline/inbox/2026-11-05-motionrepo-2.jsonl: 2 added, 0 updated. The pipeline has 11 lead(s)."
- `node scripts/leads.mjs check`: "OK: 11 lead(s), no problems found."
- `node scripts/leads.mjs gate --product motionrepo --status all`: "4 Stop, 4 Conditional, 1 Go, 2 Not reviewed." The two new leads, L-efbb45da and L-449ce286, show "Not reviewed" with reason "tier C"; the 4 Stops are earlier leads (Groundrule, SigNoz, Repowise, Cool Analytics); the one Go is mxRaven, reviewed earlier. The gate prints contact quality "general" for both new inboxes.
- `node scripts/check-links.mjs outputs/research/2026-11-05-motionrepo-lead-notes-2.md`: "62 link(s): 62 ok, 0 restricted, 0 broken, 0 unreachable" (the first run found 2 broken and 1 unreachable and 1 restricted, all pages that returned 404, 522 or 403; they are now plain text in sections 4 and 7 as findings: fixed).
- Not seen is unknown, not fail: pass. A fail appears only where a page said so: "free, open-source", "technology agency", "Free software", Greek law, Chinese law, North Carolina law, research lab, "managed web data extraction provider" (medium).
- Published and inferred kept apart: pass. One inferred item (release cadence) on Kadal Deck, labelled; the no-video gap is `observed_gap` and lists the surfaces checked.
- Dates attributed: pass. 9 Oct from the Kadal changelog; 2 Nov from the GitHub release record; 20 Oct from the Product Hunt launches page; 4 Nov from the Illos changelog; conflicts (Illos launch date, Illos update terms) shown side by side.
- Re-opened three sources before hand-in and quoted them: pass. The Kadal changelog, the Kadal home page and the Illos about page were re-fetched and quoted in section 5.
- Contacts: pass. Both are published business inboxes with their page; no address was built from a name; GitHub was not a contact source; the personal gmail addresses were left out.
- Known weakness: Illos.dev T2 rests on the maker's own site, and Kadal's "studio" wording is unresolved; both are listed as questions for a person.
