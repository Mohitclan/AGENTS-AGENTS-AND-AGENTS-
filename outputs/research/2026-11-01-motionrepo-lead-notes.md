# MotionRepo lead sprint notes (T-20261101-03, 2026-11-01, revision 2)

## Outcome against the brief
- Asked for: as many real segment 1 leads as the evidence supports, up to 15; zero is acceptable.
- Delivered: **0 leads imported.** No batch file was created (no candidate passed all six tests, and an empty batch is not allowed). The 9 human-research rows now stand at **7 rejected** (Ogimg.in, QueueJump, Pippin, Lightning, envgrid on test 3; Trailback, Graphite on test 6) and **2 open** (Astiva AI, chalk). That agrees with `pipeline/human-research.md`.
- Segment 1 was not weakened. No candidate showed all of: named founder, 2 to 20 people, India, a forward launch signal in 60 days, code on GitHub, no demo video.
- Main reasons: 5 of the 9 rows fail test 3 on positive evidence (solo maker: Ogimg, QueueJump, Pippin, Lightning, envgrid); 2 fail test 6 on a demo video the product itself points to or describes (Trailback, Graphite). The 2 open rows are not rejected: Astiva has only unknowns on tests 4 to 6, chalk has no product URL.
- Candidates from my own search did not clear the bar either (table below). 0 added, 0 updated, 0 rejected by the import script.

## Assumption made under autopilot, for a person to overturn
The coordinator ruled, with no human available this run, on two questions the evaluator raised about test 6 (no demo video). Both are assumptions, and a person can reverse either:
- (a) A product demo video linked from the product's own site fails test 6, even if it is hosted on X.
- (b) A product page's own description of a recording of the product fails test 6, even if no media file can be seen by agents. Confidence for this is medium.

If a person overturns (a), Trailback returns to `open`. If a person overturns (b), or plays the Graphite page and finds no clip, Graphite returns to `open`. Neither video was played by me.

## Rules used
- Tests: 1 software product startup; 2 India shown; 3 founder-led, named founder, 2-20 people; 4 launch or major release in the next 60 days (a past launch alone does not meet it); 5 code on GitHub (a private repo is fine for MotionRepo, so no public repo is an unknown, not a fail); 6 no disqualifier, competitor or demo video.
- Each test has one of three states: `pass`, `fail` or `unknown`. `fail` needs positive evidence of failing, with the source. Not seeing something is `unknown`.
- A row failing a test on positive evidence is rejected. A row with only unknowns stays `open`, with what is missing and who can supply it. To be imported, a row must pass all six tests, including test 6.
- Release cadence was not used as an `inferred` basis for test 4 for anyone.

## Candidate table
| Candidate | 1 | 2 | 3 | 4 | 5 | 6 | Decision |
|---|---|---|---|---|---|---|---|
| Trailback | pass | pass (trailback.app/about, "small team based in India") | unknown (named founder: Pavan GK, whose X bio reads "Solo founder"; /about says "small team"; LinkedIn for Hara Infotech shows one named employee and no size; both sources recorded, size not settled) | unknown (18 releases 2-29 Oct, none planned) | unknown (no GitHub link) | **fail** (launch video of 95.2 s posted 6 Oct 2026 by the founder at https://x.com/ItsPavanGK/status/2107311381368193144, which trailback.app's testimonials link to; not played) | Rejected, test 6 |
| Astiva AI | pass | pass (astiva.ai/terms: Bangalore, Indian law; LinkedIn: Bengaluru) | pass (co-founder named on Product Hunt, Satish Kanaujiya; peerpush.com lists Satish Kumar, Co-Founder and CEO; LinkedIn 2-10, 6 listed) | unknown (nothing dated ahead seen) | unknown (GitHub only as built-with tool) | unknown (no video; Calendly demo; an in-house Digital Marketing Lead was welcomed 8 Oct; funding and design staff unchecked) | Open |
| Ogimg.in | pass | pass (GxAditya GitHub: India) | fail (GxAditya sole contributor) | unknown | pass (GxAditya/ogimg, MIT) | unknown | Rejected, test 3 |
| QueueJump | pass | unknown (no location on profile) | fail (arpitboss sole contributor on the repo) | unknown | pass (arpitboss/Queue-Jump) | unknown | Rejected, test 3 |
| Pippin | pass | pass (usepippin.com/privacy: Shubham Padia, India) | fail (same page: "made by one person") | unknown | unknown (closed beta, no link) | unknown | Rejected, test 3 |
| Graphite (AROICE) | pass | pass ("Made in India"; graphite.aroice.in/about: Aryan at AROICE, in India; AROICE-HQ lists India) | unknown (Aryan is the only person named; LinkedIn self-reports 2-10; see Graphite note) | unknown (seven releases 13-22 Oct, latest 1.5.0; native apps and UPI "on the way", undated; 13 Nov is a price deadline, not a launch) | unknown (no graphite repo among 11 of 11 AROICE-HQ repos, nor among 19 visible Aryan-Techie repos) | **fail** (the home page's "See it" section says the clip is "Recorded in the live app"; no media file seen by me) | Rejected, test 6 (medium confidence) |
| chalk | unknown | unknown | unknown | unknown | unknown | unknown | Open; product URL missing |
| Lightning | pass | pass (Goa, India) | fail (sole repo owner, OneShield Software listed as company) | unknown | pass (sashpawar11/lightning) | unknown | Rejected, test 3 |
| envgrid | pass | pass (India) | fail (only owner plus dependabot) | unknown | pass (Achal13jain/envgrid, pushed 2026-10-31) | unknown | Rejected, test 3 |
| MailMark (own search) | pass | pass (Show HN, "I am Debasish from India") | fail ("Founder & Solo Developer") | unknown | unknown (npm only seen) | unknown | Not added, test 3 |
| CodeGraphContext (own search) | pass | pass (org lists India) | unknown (README names Shashank Shekhar Singh as creator; team size unknown) | unknown | pass | fail (YouTube demo video linked in README) | Not added, test 6 |
| Tensorik Technologies (own search) | fail (education and services company, https://github.com/tensorik-technologies: courses, workshops, web development) | pass (org page lists India) | unknown | unknown | pass (org exists) | unknown | Not added, test 1 |
| Observal (own search) | unknown | pass (https://github.com/Observal lists India) | unknown | unknown | pass | unknown | Not added; org tagline reads "Moved to AgenticResourceRegistry" |
| Repowise, Off-Grid | n/a | | | | | | Handled in the 2026-10-30 batch |

Tensorik and Observal org pages were found by a GitHub search and opened by me this revision (URLs in the table). They are not leads and nothing depends on them.

### Trailback: what the rejection rests on
- Seen by me this revision, through the third-party mirror api.fxtwitter.com (x.com itself was not read by me): the post https://x.com/ItsPavanGK/status/2107311381368193144 by Pavan GK (@ItsPavanGK), dated 6 Oct 2026, text beginning "Launching Trailback.app - for MacOS & Windows", with one attached video of 95.2 seconds at 1920x1080. Review r2 quoted a different opening line ("Trailback remembers the trail."); I did not see that wording and it does not change the finding.
- Seen by me: trailback.app links to that post (the home page repeats the link in its testimonials, and links the X account in the footer; /about links to the same account), and shows "Watch it work · 1 min" next to the buy button with no URL attached in my fetch.
- Reported in review r2, not seen by me: the testimonial dated 7 Oct 2026 reading "Curious what tool you used for the video generation", with "View original" pointing to that post.
- I did not play the video, so I do not say what it shows. The rejection rests on assumption (a) above: a launch video that the site points to fails test 6. A person playing the video, or ruling against (a), could overturn it.
- Test 3: Pavan GK is the named founder (X bio "Solo founder", location India). That bio disagrees with /about ("small team based in India") and LinkedIn (one named employee). Both are recorded; test 3 stays `unknown`. Reported in review r2, not seen by me: his 31 Oct posts report $150 monthly revenue from 18 licenses.

### Graphite: what the rejection rests on
- Seen by me: graphite.aroice.in has a "See it" section whose text begins "Recorded in the live app: typing a note...", and it describes a quiet music track that stays off until the visitor turns sound on. No video element, media file or URL appeared in my fetch, which was a text fetch and would not show a script-loaded player.
- Reported in review r2, not seen by me: the section is headed "Fifteen seconds of Graphite"; the press kit (/press/) and the Product Hunt gallery are stills. (In revision 1 I saw 4 Product Hunt screenshots.)
- The rejection rests on assumption (b) above: the product's own page describes a recording of the app. I confirm the page's statement, not a file. A person who opens the page and finds no clip that plays can return the row to `open`.
- My revision 1 check for this wording looked at aryantechie.com/work/graphite, the wrong page; the wording is on the product home page.
- Test 3 stays `unknown`, not `fail`. Seen by me: /about names only "Aryan (also shown as Aryan Techie) at AROICE, in India" and describes no team. Reported in review r2, not seen by me: Product Hunt's team tab lists one person; the @aroicehq X bio points to @aryantechie; /privacy and /terms say "AROICE, India" with no company form. Against that stands the LinkedIn company page I loaded in revision 1, which self-reports 2-10 employees. Unlike Lightning and envgrid, there is no GitHub contributor list to show a sole owner, because no graphite repo is public. That is why this row is `unknown` on test 3, and it does not change the decision.
- Other facts seen by me: Graphite is a paid product, Pro from $3.99 a month, with Pro Lifetime at a $29 founding price until 13 Nov 2026 23:59 UTC (then $59) and a 30-day Pro trial open for sign-up until the same date. Those are price dates, not launches, so test 4 stays unknown.

### Astiva AI: founder and staff facts
- Founder name differs by source, so I name no single spelling: Satish Kanaujiya, maker and co-founder (https://www.producthunt.com/products/astiva-ai, seen by me); Satish Kumar, Co-Founder and CEO, headquartered in Bengaluru with operations in San Francisco, founded 23 Dec 2025 (https://peerpush.com/p/astiva-ai, seen by me). Reported in review r2, not seen by me: a dev.to article agreeing with PeerPush, and a blog byline "Satish K".
- Avirup Sarkar is not a founder. https://x.com/AstivaAi/status/2108073386509566252, dated 8 Oct 2026 and read through the fxtwitter mirror, welcomes him as the new Digital Marketing Lead. Reported in review r2, not seen by me: welcome posts for a Key Account Executive (15 Oct), a Business Development Executive (29 Oct) and a Full Stack Engineering Intern (6 Oct).
- Test 6 is `unknown`. An in-house Digital Marketing Lead counts against the fact-sheet signal, but the disqualifier also needs funding and design staff, and both are unchecked.
- Test 4: product-page roadmap items are undated. Reported in review r2, not seen by me: nothing dated ahead in 16 X posts (5-30 Oct), 38 blog titles, or the roadmap post, whose items are labelled Q1-Q4 2025.

## Per-candidate checks (revision 1, plus the sources I re-opened in revision 2)
Pages opened by me in revision 1, with what each showed:
- Astiva: https://astiva.ai/terms (Astiva Technologies Pvt Ltd, Koramangala, Bangalore, Indian law); https://astiva.ai/privacy (company name, no address, contact email obfuscated); https://astiva.ai/contact (emails obfuscated, X and LinkedIn, no named staff); https://astiva.ai/ (no video, Calendly demo, no about, changelog, GitHub or careers link); https://www.linkedin.com/company/astiva-ai (loaded: Bengaluru, 2-10 employees, 6 listed, a BD Trainee hiring post, no launch posts); https://www.producthunt.com/products/astiva-ai (maker and co-founder Satish Kanaujiya, "Launched 5mo ago", one PNG, no upcoming launch; re-opened in revision 2, same). Founder and staff sources: see the Astiva section above.
- Trailback: https://trailback.app/about, /privacy, /contact (Hara Infotech Pvt Ltd, "small team based in India", no named people, support@trailback.app); https://trailback.app/changelog (18 releases, 2 to 29 Oct 2026, 2.7.0 latest, nothing planned); https://trailback.app/ ("Watch it work · 1 min" with no URL; re-opened in revision 2); https://www.producthunt.com/products/trailback (Pavan GK maker, 5 screenshots, "Launched 22d ago", 2.0 announced 20 days ago, no upcoming); https://www.linkedin.com/company/hara-infotech (loaded: no HQ or size, one named employee). Revision 2: the launch post and the founder's X profile through the fxtwitter mirror (see the Trailback section).
- Graphite: https://graphite.aroice.in/ (no source link; "See it" section text; re-opened in revision 2); https://aryantechie.com/work/graphite (first person, no other credits, screenshots only; footer YouTube link goes to the AROICE channel); https://www.producthunt.com/products/graphite-11 (maker Aryan Techie, "Launched 10d ago" in revision 1, 4 screenshots); https://why.aroice.in/ (WHY, "Coming soon", undated sign-up); https://github.com/AROICE-HQ (India, one member); https://www.linkedin.com/company/aroice (loaded: 2-10 employees, founded 2025, no HQ listed, WHY teaser). Opened by me in revision 2: https://graphite.aroice.in/changelog (seven releases, 13 to 22 Oct 2026, latest 1.5.0); https://graphite.aroice.in/pricing (prices and the 13 Nov dates above, UPI "coming later", native apps "on the way", both undated); https://graphite.aroice.in/about; https://api.github.com/orgs/AROICE-HQ/repos (11 repos: .github, ashes, argon, monkeybar and seven omarchy-* repos; none graphite); https://api.github.com/users/Aryan-Techie/repos (19 repos visible, none graphite; the response was cut off, so the list may be longer). Not re-opened by me: /privacy, /terms, /press.
- Pippin: https://usepippin.com/privacy. MailMark: https://hn.algolia.com/api/v1/items/47653287 and https://mailmark.dev/about. CodeGraphContext: https://github.com/CodeGraphContext/CodeGraphContext (creator named, demo video https://youtu.be/KYYSdxhg1xU); title and author confirmed at https://www.youtube.com/oembed?url=https://youtu.be/KYYSdxhg1xU&format=json (Shashank Shekhar Singh). I did not play the video; the title is "Introducing CodeGraphContext- A Graphical Context of your Codebase for your LLMs", which is a product introduction.
- Not re-opened, reported in review r1, not seen by me: ogimg, queuejump, lightning, envgrid GitHub pages (those four decisions were confirmed by the review and are unchanged). Peerlist pages: 403, not opened.

## Not checked or not shown
- Product Hunt listing pages and LinkedIn company pages did load through WebFetch (outcomes above). The earlier note that LinkedIn is unreliable was wrong; it was never tried.
- Peerlist pages: 403, not opened. Peerlist URLs in the rows are the human's, cited as "where it was seen".
- envgrid.pages.dev and cgc.codes loaded title-only (JavaScript sites).
- The Hara domain guess `hara.in` did not resolve; it was a lookup only and no contact was taken from it.
- Astiva funding and design staff; the Astiva blog, roadmap post and X history (checked in review r2, not by me); who sits behind Hara Infotech Pvt Ltd; Graphite's @aroice YouTube channel (video list did not load for the reviewer); the Aryan-Techie repos beyond the first 19.

## Next actions (one per open row)
Each step says who does it.
- Astiva AI. Agent checks are done (X, blog, roadmap post, listings). The remaining step is a question to the company about a dated launch and whether the code is on GitHub. That is an outbound message, so it needs an approval item: **the coordinator** records it in `ops/approvals.md` and the human decides. I have not written any message to Astiva. **Import** only if the answer lets all six tests pass, test 6 included, and by then the founder's name must be settled from sources (it differs today); name no single spelling until then.
- chalk: **a person**, or a browser session they run, opens https://peerlist.io/garvnanwani/project/chalk and copies the product URL into the chalk row in `pipeline/human-research.md`. Peerlist returns 403 to every team agent, so no agent can do it. After that, **the lead-generator** runs the six tests.
- Optional, **a person**, only to overturn a rejection: play the Trailback launch video, and open graphite.aroice.in to see whether the "See it" clip plays.

## Sources that failed or gave little
- peerlist.io: 403. Not retried.
- x.com: reported in review r2 to return 402, not seen by me. All X facts here (Trailback launch post and bio, Astiva welcome post) were read through the third-party mirror api.fxtwitter.com, so a person should confirm them on X.
- Trailback demo video: a web search in revision 1 found nothing, but that was the wrong route. The video is the founder's X launch post, one link from the site (see the Trailback section).
- envgrid.pages.dev and cgc.codes: title only.
- Web search for "chalk learning labs Garv Nanwani": nothing relevant.
- Tensorik and Observal: the GitHub org pages were found in revision 2 (URLs in the table).
- https://peerpush.net/p/astiva-ai redirected (301) to https://peerpush.com/p/astiva-ai, which I then read.

## Page instructions found
None. No fetched page held instructions aimed at an AI or reader.

## Hypotheses
- The Peerlist Launchpad weekly list is mostly solo makers or products with a video (confidence medium): 5 of 9 rows were proven solo and 2 more fail on a launch video, so 7 of 9 were rejected. Of the other 2, Astiva passes tests 1 to 3 and chalk is unchecked. Segment 1 candidates are probably rarer there than on accelerator lists. AIBoomi or startup-registry listings were not tried.
- Astiva AI is the closest to segment 1 (confidence low to medium), with a caveat: it passes tests 1 to 3, but it now has an in-house Digital Marketing Lead, which counts against the fact-sheet signal for test 6. A dated launch, GitHub code, and funding and design staff would settle it.

## Fix log (review r1)
1. Astiva reopened; tests re-run; terms, LinkedIn, Product Hunt cited; "No founder, place or team" and "sells to marketers" removed; missing items stated.
2. Trailback: /about wording, test 2 pass; changelog cadence added.
3. Graphite: LinkedIn 2-10 and first-person case study recorded side by side; test 4 unknown; "one-person brand likely" removed.
4. Pippin: test 2 pass, test 3 fail, citing usepippin.com/privacy; "names no maker, location" and "no repo for MotionRepo to read" deleted.
5. MailMark: test 2 pass from the Show HN post.
6. CodeGraphContext: maintainer named; test 6 fail (linked demo video); "A person could look at it" dropped.
7. Test 5 now "code on GitHub"; "no link" is unknown.
8. Test 4 "none seen" changed to unknown everywhere; rule added under "Rules used".
9. "They failed tests 2 or 3 first" and "Only Trailback showed a video link" deleted. What was actually run in revision 1, row by row: Astiva: terms, privacy, contact, home, LinkedIn, Product Hunt, one web search. Trailback: about, privacy, contact, changelog, home, Product Hunt, LinkedIn, one web search. Graphite: home, the aryantechie.com case study, Product Hunt, why.aroice.in, the AROICE-HQ GitHub org, LinkedIn. Not run in revision 1 for Graphite: /about, /privacy, /terms, /changelog; for Astiva: the blog. (Revision 2 opened Graphite /about, /pricing and /changelog, but still not /privacy, /terms or the Astiva blog.)
10. LinkedIn tried and reported; the "agents cannot read these" line removed.
11. Recounted: 5 of 9 proven solo, shown above.
12. URLs added for each fact.
13. Next actions list added.
14. Outcome counts and main reason updated.

## Fix log (review r2, revision 2)
All 13 fixes applied; the per-fix list is in the RESULT reply. Counts are now 7 rejected, 2 open, 0 imported.

## check (raw)
```
OK: 4 lead(s), no problems found.
```

## gate, `--status all` (raw)
```
id          tier  verdict      contact  company                                        why
----------  ----  -----------  -------  ---------------------------------------------  -----------------------------------------------------------------------------------------------------------------------
L-05fc7e3d  C     Stop         general  Groundrule (Vyana Compute / Metricall AI Lab)  status is disqualified; tier C
L-75e81825  C     Conditional  general  Deplexo                                        tier C
L-cfc4d2da  C     Stop         none     SigNoz                                         status is disqualified; no published contact; tier C
L-4d574242  B     Stop         general  Repowise                                       on hold (founders): Does never contact competitors cover it? It sells generated docs and compares itself with DeepWiki.

3 Stop, 1 Conditional. Fix a Stop at the source, then run the gate again.
```
Exit code 1 because of the Stops, all existing before this task (two disqualified, one on hold). None comes from this task.

## Import
Not run: no batch file. Counts: 0 added, 0 updated, 0 rejected by the import script. Existing leads L-4d574242 (on hold) and L-75e81825 (tier C) were left alone.
