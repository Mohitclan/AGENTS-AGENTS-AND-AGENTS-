# MotionRepo segment 1 lead batch, 2026-11-05 (T-20261105-01)

Run by lead-generator. Product: motionrepo. Batch file: `pipeline/inbox/2026-11-05-motionrepo-1.jsonl`. CRM duplicate check not done (HubSpot not authorised). Dedupe was done by hand against `node scripts/leads.mjs list --product motionrepo` (8 leads at the start) and every row of `pipeline/human-research.md`, by root domain, parent company and brand variant; none of the 23 candidates below matched an existing lead or row.

## 1. Summary

- Candidates checked: 23.
- Imported: 1 of 23 (mxRaven, L-ce7c3f9d, tier B, score 56, status new).
- Rejected: 12 of 23 (positive evidence for a failed test).
- Open: 10 of 23 (a test is unknown; what would settle each is in section 6). Two of them, Sonari and InfraCanvas, were added as new rows to `pipeline/human-research.md` because only a person can settle them.
- Stop rule: about 25 candidates (23 checked, plus 2 intent items that were not candidates) was reached, and the last several searches (DevHunt tool pages, Product Hunt leaderboards, the four web searches) found no new India-based, founder-led, paid product; the batch is 1 lead, not 8, and no near-match was stretched.
- Segment 1 is thin on the free sources: of 23, 8 were free or open source (fail test 1), and the India signal is rare on Show HN, DevHunt and Product Hunt (none of them shows location).

## 2. Sources tried

All fetched on 2026-11-05 without a login.

| Source and query | Returned | Verdict |
|---|---|---|
| Show HN, Algolia, `created_at_i>1791244800,points>5`, `restrictSearchableAttributes=url&query=.in` | 3 hits (Biblio Times, Blobz, a Korean-handwriting RNN) | Blobz kept as a candidate; others not Indian software products |
| Show HN, `points>3&query=india` | 18 hits; none names India (matches on "indie", "individual"); one title says "Indian bank narrations" (Panini, free open source) | Ran dry for India |
| Show HN, query `bangalore` (30 days+), `bengaluru`, `"from india"` | bangalore 0 hits; bengaluru 1 (a Sanskrit speech model, a model on Hugging Face, not a company); `"from india"` 1 (mxRaven, 2 Nov) | mxRaven found here |
| Show HN with `OR` between cities, and `"solo founder"` phrases | 0 hits both (Algolia does not read `OR`) | Query form failed; single-term queries used instead |
| DevHunt `/upcoming` | 103 tools in 4 weeks (10 Nov to 1 Dec); no location on any | 5 tool pages opened (Review Router, Borehole, WTFM, SuperSpecs, InfraCanvas); 5,832 more scheduled, not listed by the page |
| Product Hunt feed `/feed` (50 entries) | 50 entries; location absent | 5 product pages opened (LidCommit, Scrawl, Country Filter for X, Hira, Sonari) |
| Product Hunt leaderboards 2026/11/2 and 2026/11/4 | 10 products each; no makers or location shown | Ran dry; mostly funded |
| LaunchPad India `launchpadindia.co` | 34 new launches with city, no date, no maker | Only one WebSearch follow-up (ConnectVault) found no founder or code; the rest are mostly not GitHub-based |
| GitHub org search by city, `created:>2026-01-01+repos:>3` (India, Bengaluru, Hyderabad, Pune) | India (created after 2026-06-01): 30 orgs, mostly institutes, hobby or non-product; Bengaluru 6 (Deplexo already a lead); Hyderabad 1; Pune 1 | 5 orgs opened: Novalabs-in, regalium-os, manyxlabs, Skopaq-AI, LambdaQ-Labs |
| dev.to `showdev` top 7 days | 30 articles; no India field | Ran dry (tutorials, hobby, personal projects) |
| Inc42 "30 Startups To Watch, October 2026" | 11 software startups, funded or enterprise (voice AI for enterprises, manufacturing OS) | Ran dry for segment 1; the last 34,451 characters of the page were not read |
| WebSearch: 4 queries (Indian solo founder Product Hunt; Show HN India; no designer/video editor; RepoClip alternative) | Undated blogs, stale Product Hunt posts (6 to 8 months old), no named RepoClip alternative | Ran dry |

GitHub API calls this run: about 19 of the 50 allowed.

Blocked or refused this run: none hit. Not tried because the skill says they are blocked: Peerlist, LinkedIn, Reddit, X, Wellfound company pages, Product Hunt search.

## 3. Buyer-intent search

Queries run (all HN Algolia, 30 days from 2026-10-06 unless said):
- comments: `"launch video"` (8 hits read), `"launch video" agency` (20 requested; the one relevant hit read), `"demo video"` (41 hits, 30 read);
- stories: `"product hunt" launch video` (0 hits);
- Show HN `"from india"` (1 hit);
- web: "no designer / no video editor founder launch demo video", "RepoClip alternative launch video from GitHub repo".

Phrase types not run for lack of budget: "migrating away from", "pain about price", "missing feature" for rivals (RepoClip, Supademo, Arcade).

Kept as dated, published intent items: 1, for the language bank only, not a lead:
- A commenter on an HN story titled "Opus 5.5 made our product launch video (linked)", comment of 2026-10-15 (https://hn.algolia.com/api/v1/items/50106617), words: "We've been hacking on a side product and needed a launch video for it, but didn't want to pay an agency to make it." Role: comment author. Not a lead: the comment names no company, the writer says the video was made with an AI coding tool already, and no profile matching a company was opened.

Also seen, not kept: two Show HN or story items of 2 to 4 Nov 2026 (HN 50363062 and 50344846) are tools that make product videos, so the writers are makers of competing tools, not buyers. A third, in the October "Who wants to be hired" thread, is a freelancer's "AI Demo Video Builder", not a buyer.

Share of imported leads whose need-evidence rests on a dated, published intent item: 0 of 1. mxRaven's need evidence is an observed gap (no video on three pages) plus a launch, with no stated intent. Buyer intent search found no founder in India saying they need a launch video in the window.

## 4. Per-test table

pass, fail, unknown. T4 window: on or after 2026-10-06, or dated ahead up to 2027-01-04.

| # | Candidate | T1 | T2 | T3 | T4 | T5 | T6 | Outcome |
|---|---|---|---|---|---|---|---|---|
| 1 | mxRaven (Synqronlabs) | pass: https://mxraven.com/pricing/ | pass: https://mxraven.com/legal/terms/ | pass (medium): https://mxraven.com/blog/launching-mxraven/ | pass: same page, "October 22, 2026" | pass: https://github.com/synqronlabs | pass: https://synqronlabs.com | imported |
| 2 | Sonari | pass: https://playsonari.com/ | pass: https://playsonari.com/terms | pass (medium): https://playsonari.com/privacy | pass: https://www.producthunt.com/products/sonari/launches | unknown: https://playsonari.com/support | unknown: https://playsonari.com/ (video player; lowers score only) | open |
| 3 | InfraCanvas (Bytestrix) | pass: https://infracanvas.app | unknown: https://api.github.com/orgs/bytestrix (location India, nothing on site) | unknown: https://bytestrix.com | pass: https://devhunt.org/tool/infracanvas | pass: https://github.com/bytestrix/InfraCanvas | unknown: https://devhunt.org/@ByteStrix ("a product studio") | open |
| 4 | Blobz (lirena00) | pass: https://blobz.lirena.in (paid hosted API, $49.90 a year) | unknown: https://lirena.in | unknown: https://lirena.in (no "founder"; a full-time engineer role is listed) | pass: Show HN 2026-10-14 (item 50086216), https://hn.algolia.com/api/v1/items/50086216 | pass: https://github.com/lirena00/blobz | unknown | open |
| 5 | LidCommit | fail: https://www.producthunt.com/products/lidcommit ("100% free and open-source under MIT") | unknown | unknown | unknown | pass | unknown | rejected |
| 6 | Scrawl | fail: https://www.producthunt.com/products/scrawl-2 (Free, open source) | unknown | unknown | unknown | pass | unknown | rejected |
| 7 | Country Filter for X | fail: https://www.producthunt.com/products/country-filter-for-x-2 ("Free, open source (MIT)") | unknown | unknown | unknown | pass | unknown | rejected |
| 8 | Hira | fail (medium): https://www.producthunt.com/products/hira (Pricing "Free") | unknown | unknown | unknown | unknown | unknown | rejected |
| 9 | Manyx Labs | fail: https://www.manyxlabs.com ("Use them today, free." "No signup, no ads.") | pass: same page, "Bengaluru" | unknown | unknown | pass | unknown | rejected |
| 10 | Regalium | fail (medium): https://api.github.com/orgs/regalium-os (description is a luxury real-estate development) | pass: same | unknown | unknown | unknown | unknown | rejected |
| 11 | LambdaQ Labs | unknown | pass: https://api.github.com/orgs/LambdaQ-Labs (Pune) | unknown | unknown | pass | fail (medium): same record, "AI for government work" (site not opened) | rejected |
| 12 | LiteLambda | unknown | unknown | pass: https://www.producthunt.com/p/undefined/i-built-a-serverless-platform-for-indian-devs-pay-with-upi-no-credit-card-ever (named founder) | fail: same page, "8mo ago" | unknown | unknown | rejected |
| 13 | LLMeter | unknown | unknown | unknown | fail: https://www.producthunt.com/p/undefined/student-founder-from-india-building-dev-tools-for-ai-products-2 ("6mo ago", "SDK in progress") | unknown | unknown | rejected |
| 14 | WTFM | fail: https://devhunt.org/tool/wtfm (free, Apache-2.0) | unknown | unknown | pass: same ("Launching November 10, 2026") | unknown | unknown | rejected |
| 15 | SuperSpecs | fail: https://devhunt.org/tool/superspecs (free, MIT) | unknown | unknown | pass: same | pass | unknown | rejected |
| 16 | TapCraft | unknown | unknown | unknown | pass: https://devhunt.org/upcoming (week of 10 Nov) | unknown | fail (medium): same page tagline, "Turns mobile screen recordings into demo videos", the demo-video category in the competitor file; tool page not opened | rejected |
| 17 | NovaLabs.in | unknown | pass: https://api.github.com/orgs/Novalabs-in (Bengaluru) | unknown | unknown | pass | unknown | open |
| 18 | Skopaq AI | unknown | pass: https://api.github.com/orgs/Skopaq-AI (Hyderabad) | unknown | unknown | pass | unknown: same record, "high-stakes operations", site not opened | open |
| 19 | Foundco | unknown | unknown | unknown: https://hunted.space/product/foundco (maker not named) | unknown | unknown | unknown | open |
| 20 | Review Router (Tenpace) | pass: https://review-router.tenpace.com ($5 per developer a month) | unknown: no location on the site | unknown | pass: https://devhunt.org/tool/review-router | unknown (no GitHub link) | unknown | open |
| 21 | Borehole | pass: https://devhunt.org/tool/borehole (euro prices) | unknown | unknown | pass: same | unknown | unknown | open |
| 22 | Apoorv Darshan products (Coincide) | unknown | unknown | unknown | unknown | pass | unknown | open |
| 23 | ConnectVault | unknown | unknown (LaunchPad city: Pune) | unknown | unknown | unknown | unknown | open |

For #23, the LaunchPad homepage lists "Pune" as the city, but the listing page is JS-only and no company page was found, so T2 stays unknown.

## 5. Imported leads

### L-ce7c3f9d, mxRaven (Synqronlabs Private Limited), tier B, score 56

- Breakdown: icp_fit 27, need_evidence 10, timing 14, reachability 5.
- Rationale: fits segment 1 on India, a sold product, a small founder team and GitHub; need rests only on an observed gap (no video on three pages) with no stated intent; launch 14 days before today and Show HN 3 days before; the contact is a general sales inbox, so reachability is capped at 5; headcount is not stated, so icp_fit stays under 30.
- Evidence read and re-opened: terms (company registered in Hyderabad, governed by Indian law); pricing ($5 to $100 a month, USD, no INR or GST mention); the launch post "October 22, 2026·Kush Patel", "my co-founders and I are undergraduate students"; Show HN of 2026-11-02 "I am Kush, a student founder from India building mxRaven"; GitHub org synqronlabs (17 repos, pushed 2026-10-21 to 2026-11-03, 3 public members); no video seen on the homepage, pricing page or blog (what was checked: those three; YouTube and Product Hunt not checked).
- Contact: mxRaven@synqronlabs.com, "Sales" channel, from https://mxraven.com/contact/. A named person is the launch-post author Kush Patel ("co-founder at SynqronLabs Pvt Ltd"), but no personal address is published; none was built. The gate prints contact quality "direct" because the address is not a hello@ style prefix; the page shows it is a shared company inbox, so I capped reachability at 5 as for a general inbox. Treat it as general.
- Gate verdict: Not reviewed (expected until the coordinator qualifies it).
- Open questions for a person: how many co-founders and staff (the post says "co-founders" without naming them; GitHub shows three public members); whether a launch video exists on YouTube or Product Hunt; that the lead is outside the usual "product page with a demo" pattern: it is a developer API product, so MotionRepo's launch video and PDFs may fit less than for an app.

## 6. Rejected and open candidates

Rejected (the failed test and evidence are in the table; short form here):
- 5 LidCommit, 6 Scrawl, 7 Country Filter for X, 14 WTFM, 15 SuperSpecs: free and open source (test 1). Scrawl's maker is Kit Langton, not shown to be in India.
- 8 Hira: listed as "Free"; JW is named as founder with a launch team of three; no India shown. Rejected on test 1 at medium confidence; a pricing page was not opened.
- 9 Manyx Labs: free, no signup.
- 10 Regalium: a real-estate development, not software.
- 11 LambdaQ Labs: description says it builds "AI for government work" (test 6, regulated or enterprise), from the GitHub org record; the site lambdaq.org was not opened.
- 12 LiteLambda and 13 LLMeter: posts are 8 and 6 months old with no newer dated launch found.
- 16 TapCraft: the tagline puts it in the demo-video category (competitor file, indirect and direct sections); I did not open the tool page.

Open, with what would settle each:
- 2 Sonari: test 5. Needs a GitHub account tied to Shubhra Saha. Who: a person checking the Mac App Store listing or the maker's X; or an approved outbound question. Row added to human-research.md.
- 3 InfraCanvas: test 3 (no founder named; "a product studio" is a separate segment unless a named founder runs the product). Who: a person on DevHunt when logged in. Row added to human-research.md.
- 4 Blobz: tests 2, 3. His site gives no country and lists a full-time engineer role; the word founder is absent. Who: an agent could read the Show HN thread comments and the Blobz repo README; not done for budget.
- 17 NovaLabs.in: site not opened; description says "open-source products", so test 1 likely fails. Who: an agent, one fetch of the org blog and repos.
- 18 Skopaq AI: site skopaq.com not opened; "Agent systems for high-stakes operations" and a Private Limited with 42 repos point to an enterprise customer base (test 6), team size unknown. Who: an agent, a fetch of skopaq.com.
- 19 Foundco: maker, date and site unknown (hunted.space did not name them). Who: a person on Product Hunt.
- 20 Review Router: no location or founder on the site; launch 10 Nov 2026 on DevHunt. Who: an agent could read tenpace.com/terms-of-service for jurisdiction.
- 21 Borehole: no location; euro prices; the maker is "a former technical due diligence practitioner". Who: an agent on borehole.dev terms.
- 22 Apoorv Darshan: his products found (Country Filter for X is free) and a dev.to Coincide post; the portfolio page loaded title only. Who: an agent could read the Coincide Product Hunt page.
- 23 ConnectVault: one search found only a directory listing, no founder or code. Who: a person on LaunchPad India's listing page, which is JS-only for agents.

## 7. Pages read and pages not opened

Read: all the URLs in section 4, plus https://mxraven.com, /about/, /contact/, /blog/, https://synqronlabs.com, https://kush.in, https://github.com/libkush, https://api.github.com/orgs/synqronlabs (and /repos, /members), https://playsonari.com/privacy, /terms, /support, https://shubhrasaha.com, Product Hunt Sonari /launches and /makers, the DevHunt `/upcoming` page, Algolia item 50338055 and 50106617.

Not opened or failed: the bytestrix.com /privacy page (404); manyxlabs.com has no terms or privacy link; apoorvdarshan.com loaded title only; the Inc42 article's last 34,451 characters; the 5,832 DevHunt tools beyond the first four weeks; the LaunchPad India listing pages (JS-only); Product Hunt `/p/...` posts show relative dates only ("8mo ago", "6mo ago"); lirena.in's last 18,001 characters were not read in the blobz.lirena.in fetch. Not tried: HubSpot (not authorised), LinkedIn, X, Peerlist, Reddit.

## 8. Instructions found in web content

None found. One Show HN comment by the mxRaven maker mentions login details for a sandbox dashboard; the fetch tool omitted them, I did not look for them, and nothing from it was used or recorded.

## 9. Self-review

- Re-read the brief: pass. Batch file, import, notes with sections 1 to 9 in order, `human-research.md` rows appended only (no existing rows edited), no drafts, nobody contacted, HubSpot not called. The batch holds 1 lead, below the 8 asked, by the stop rule.
- Counts match the body: pass. 23 candidates in the table = 1 imported + 12 rejected + 10 open (recounted from section 4: rejected are #5 to #16, open are #2 to #4 and #17 to #23, imported #1).
- Automatic checks:
  - `node scripts/leads.mjs import pipeline/inbox/2026-11-05-motionrepo-1.jsonl`: "Imported ... 1 added, 0 updated. The pipeline has 9 lead(s)."
  - `node scripts/leads.mjs check`: "OK: 9 lead(s), no problems found."
  - `node scripts/leads.mjs gate --product motionrepo --status all`: "4 Stop, 4 Conditional, 1 Not reviewed. Fix a Stop at the source, then run the gate again." The 4 Stops are earlier leads (Groundrule, SigNoz, Repowise, Cool Analytics); the one new lead, L-ce7c3f9d, is "Not reviewed" as expected.
  - `node scripts/check-links.mjs outputs/research/2026-11-05-motionrepo-lead-notes.md`: "45 link(s): 45 ok, 0 restricted, 0 broken, 0 unreachable" (first run found 2 broken: a truncated Algolia URL, fixed, and the bytestrix privacy 404, now plain text).
- Not seen is unknown, not fail: pass. A fail appears only where a page said so (free, open source, "8mo ago", "AI for government work", real estate).
- Published and inferred kept apart: pass. mxRaven evidence items are each one thing a page says; the video gap is `observed_gap`; no inferred item.
- Dates attributed: pass. 22 Oct from the blog byline, 2 Nov from the HN item, 4 Nov from the Product Hunt launches page, 10 Nov from the DevHunt tool page.
- Re-opened three sources before hand-in: pass. The blog (byline and the "co-founders" sentence), the terms (company registration, Indian law) and the Show HN story were re-opened and quoted; the Show HN date comes from the Algolia JSON in two separate fetches.
- Contacts: pass. Published business inbox with page; nothing from GitHub or built from a pattern.
- Known weakness: the gate shows "direct" for the mxRaven inbox; recorded in section 5, not changed.
