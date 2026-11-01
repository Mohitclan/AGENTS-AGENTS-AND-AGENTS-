# MotionRepo solo-founder re-test (T-20261101-05, Jarvis J-20261101-03, 2026-11-01, revision 1)

**Update after review, 2026-11-01:** Pippin is now rejected on test 6, so the result is 0 imported, 6 rejected, 0 open. Claude checked the clip in a browser, not a person, by looking at four muted frames; details are in Pippin's row in `pipeline/human-research.md`. This update has not been reviewed, and the text below is unchanged.

This file supersedes `outputs/research/2026-11-01-motionrepo-lead-notes.md` for these six candidates only: Ogimg.in, QueueJump, Pippin, Lightning, envgrid and MailMark. The old notes file is unchanged and still stands for Trailback, Graphite, Astiva AI, chalk, CodeGraphContext and the rest.

## Outcome against the brief
- Asked for: re-test six candidates that were stopped at test 3 for being solo, now that segment 1 includes solo founders (memory/MAIN.md, 2026-11-01), and say whether any is a real segment 1 lead.
- Result: **0 imported, 5 rejected, 1 open.** No batch file was created because no candidate passed all six tests (an empty batch is not allowed). Counts: 0 added, 0 updated, 0 rejected by the import script.
- Rejected on positive evidence: Ogimg.in, QueueJump and Lightning on test 1 (free open-source tool with no business behind it); envgrid on test 6 (its own site and repo carry product tour videos), with test 1 also failing; MailMark on test 6, medium confidence (assumption 2).
- Open: Pippin. It passes tests 1 to 3. Tests 4, 5 and 6 are unknown. Test 6 is unknown because its only video found is a launch clip on its X account that nothing on its site links to and that I did not play (assumption 3).
- The solo rule did change the picture: test 3 no longer fails for any of the six. The old rejections were replaced by other tests.
- Test 4 stays strict. No dated launch or release by 2026-12-31 was seen for any of the six, including after the X and Show HN sweep below. Release cadence was not used as an inferred basis. No dated forward signal turned up, so nothing is reported for import.

## Assumptions made under autopilot
Each is a coordinator ruling or my reading; a person can overturn it.
1. **Video fails test 6 without playing (rulings (a) and (b)).** A product page's own video or tour, or a repo-embedded clip that the product's site points to, fails test 6 even though I did not play it. Used for envgrid. A person can overturn it. If overturned, envgrid's test 6 goes back to unknown; its test 1 fail stands, so it stays rejected.
2. **MailMark is rejected on test 6, medium confidence (coordinator ruling R1).** It rests on three things: (b) the site's own wording ("Watch how easy it is to set up your domain..." with "Click to play · overview", on a section headed "See Mailmark in action"); a site-linked account (the footer links https://x.com/mailmarkdev, seen by me, and /contact is reported in review r1 to link it, not seen by me); and that account's thread, where a post says "Watch the 1-minute walkthrough above", attached to a 54 s video. Ruling (a) is stretched from a linked post to a post on a linked account whose own thread calls the clip a walkthrough. I did not play any video, and I saw no media file on the home page. MailMark gets the same treatment as Graphite (old notes), with no exemption. If a person plays the clip and it is not a product walkthrough, or rules against the stretch, MailMark returns to open with test 6 unknown.
3. **Pippin stays open on test 6 (coordinator ruling R2).** A launch video on a product's own X account, not linked from the site and not described as a demo by the site or the post, does not by itself fail test 6. Reasons: fact sheet line 59 says "on its site or YouTube channel"; line 60 asks about the product page, and Pippin's has none; the clip is unplayed, and its one known frame (reported in review r1, not seen by me) shows the maker speaking to camera, so nothing shows a product demo. Fail needs positive evidence, and an unplayed clip of unknown content is not that. If a person plays it and it shows the product in use, Pippin is rejected on test 6. What would change: a ruling that any launch video on a product's own account fails the test also rejects Pippin.
4. **One day-job rule (coordinator ruling R3).** A job elsewhere neither fails nor passes test 3. Test 3 asks whether a source names the person as the founder or sole maker running this as a product. Where one does, test 3 passes and the job is a recorded caveat: Pippin ("made by one person"), MailMark ("Founder & Solo Developer"). Where none does, test 3 is unknown for that reason: Lightning, QueueJump, envgrid. If overturned so that a day job fails or weakens test 3, Pippin and MailMark's test 3 become unknown; MailMark is rejected anyway and Pippin stays open.
5. **Test 1 fail for a free tool.** Test 1 fails for a tool that is MIT or free, has no pricing page, and names no company, after I checked for those (brief and fact sheet line 48). QueueJump's fail is medium confidence because it has a hosted sign-up app and I could not rule out a plan beyond the pages and the repo tree I checked.
6. **Founder wording.** "Named founder running the product" is read as: a named person whom the product's own pages or legal pages show operating it. Where no source uses "founder", I record that rather than pass the word (Ogimg, Pippin).
7. Fact sheet line 42 still says 2 to 20; the 2026-11-01 memory entry (1 to 20) takes precedence, as the brief says.

## Candidate table
States: pass, fail, unknown. A bold fail is the reason for rejection.

| Candidate | 1 Software startup | 2 India | 3 Named founder, 1-20 | 4 Launch by 2026-12-31 | 5 Code on GitHub | 6 No disqualifier or demo video | Decision | Change from earlier result |
|---|---|---|---|---|---|---|---|---|
| Ogimg.in | **fail** (about page: "a free, open-source project rather than a company"; no paid tier) | pass | pass (runs it; not called a founder) | unknown | pass | unknown (no video on site or README; X clips exist, see evidence) | Rejected, test 1 | Test 3 was fail, now pass; test 1 now fails on new evidence. Repo moved to org zero-gate-org |
| QueueJump | **fail**, medium (MIT, no pricing, /pricing 404, no company, no billing code in repo tree) | pass (now sourced) | unknown (no source calls him a founder) | unknown | pass | unknown (no video on site, README or maker's X posts seen) | Rejected, test 1 | Test 2 was unknown, now pass; test 3 was fail, now unknown |
| Pippin | pass (medium) | pass | pass (day-job caveat) | unknown | unknown | unknown (launch clip on X, 30.2 s, not played, not linked from the site) | Open | Test 3 was fail, now pass; row was rejected, now open |
| Lightning | **fail** (free MIT, no pricing, no company) | pass | unknown (no source names him as founder of the product) | unknown | pass | unknown (no video on site or README; X clips of 15.0 s and 6.4 s exist) | Rejected, test 1 | Test 3 was fail, now unknown; test 1 now fails |
| envgrid | fail, medium (MIT, no pricing, portfolio project) | pass | unknown (no source calls him a founder) | unknown | pass | **fail** (tour videos on its site and in its releases) | Rejected, test 6 (test 1 also) | Test 3 was fail, now unknown; tests 1 and 6 new |
| MailMark (no human-research row) | pass | pass (Show HN; conflict noted) | pass (day-job, legal-entity and date caveats) | unknown | pass (mobile client repo) | **fail**, medium (site wording plus site-linked account's "1-minute walkthrough" thread; not played) | Rejected, test 6 | Test 3 was fail, now pass; was "Not added, test 3"; this revision was "Open", now rejected |

Totals recounted from this table: 6 candidates; 5 rejected (Ogimg.in, QueueJump, Lightning, envgrid, MailMark); 1 open (Pippin); 0 passing all six tests; 0 imported.

## Evidence per candidate
Sources I opened this session on 2026-11-01 unless marked. Peerlist (peerlist.io) returned 403 to the one page I tried (QueueJump) and was not retried for the others. X facts were read through the third-party mirror api.fxtwitter.com, not x.com; a person should confirm them.

### Ogimg.in (rejected, test 1)
- https://ogimg.in/about (opened twice): "built and maintained by GxAditya as an individual developer"; "a free, open-source project rather than a company". Business model: none described; "no affiliate links, sponsored placements, or paid rankings".
- https://ogimg.in/ (home page): free tool, 45 templates, FAQ says there is "no paid tier"; footer credits GxAditya; no pricing link in the navigation. https://ogimg.in/terms: operated by GxAditya personally; no company, address or country; "the site is free".
- https://raw.githubusercontent.com/zero-gate-org/ogimg/main/README.md: MIT, no pricing, sponsors or roadmap dates, two static screenshots.
- https://api.github.com/repos/GxAditya/ogimg resolves to owner zero-gate-org (Organization). https://api.github.com/orgs/zero-gate-org: location India, one public member, GxAditya (https://api.github.com/orgs/zero-gate-org/members); contributors: GxAditya 25 (https://api.github.com/repos/zero-gate-org/ogimg/contributors). No releases or tags (https://api.github.com/repos/zero-gate-org/ogimg/releases).
- https://github.com/GxAditya: Aditya Kumar, India, "Backend & AI", no company listed, no founder wording. His X profile (https://api.fxtwitter.com/kaditya264) shows no location or business.
- Test 4: https://ogimg.in/changelog shows v2.0.0 on 2 Oct 2026 as latest; the only roadmap item, a server-side API, is "not yet" and undated. X sweep (https://api.fxtwitter.com/2/profile/kaditya264/statuses): the only date ahead of the launch is the Peerlist Launchpad window, "Last day of ogimg on Peerlist Launchpad" on 31 Oct 2026, already closed. Nothing dated ahead.
- Test 6 (site and README): no video on the site or README. X clips on the maker's timeline: "Introducing" post 26 Oct (30 s), 28 Oct (30 s), 29 Oct (19.69 s), 30 Oct (37 s, step-by-step guide). None played. The decision does not change because the row fails test 1.
- Not opened: the /compare/canva and /compare/bannerbear pages. The site compares itself with Canva, which is an indirect competitor category ("Canva and freelancers or agencies") in knowledge/competitors/motionrepo.md; flagged, not used for the decision.

### QueueJump (rejected, test 1, medium)
- https://queuejump.arpitverma.me/: waitlist referral engine with sign-up ("Get Started"), docs link, no price; the "Pro plan" is a referral reward ("Pro plan — 6 months free" under Live positions, reported in review r1 and consistent with what I saw earlier); "(c) 2026 QueueJump" with no maker or company; an "Interactive Demo" widget, no video. https://queuejump.arpitverma.me/pricing: 404.
- https://raw.githubusercontent.com/arpitboss/Queue-Jump/main/README.md: "MIT License. Free to use for personal and commercial projects"; no pricing, hosted plan, roadmap or TODO. https://github.com/arpitboss/Queue-Jump: 26 commits, 1 star; contributors: arpitboss 26 (https://api.github.com/repos/arpitboss/Queue-Jump/contributors). The repo's `homepage` field is the site (https://api.github.com/repos/arpitboss/Queue-Jump).
- Repo tree check (fix 10): https://api.github.com/repos/arpitboss/Queue-Jump/git/trees/main?recursive=1 returned 125 entries (92 files, 33 directories; `truncated` false). No path contains billing, pricing, stripe, razorpay, payment, plan, subscription or checkout. This is closer to positive evidence of no paid product in the repo, but a hosted plan outside the repo is not ruled out, so confidence stays medium. (Review r1 said about 90 paths; my count is 125 entries, 92 of them files.)
- Test 2 source: https://api.fxtwitter.com/arpitverma_123 gives location Greater Noida, India and website queuejump.arpitverma.me; https://github.com/arpitboss says "from India", UTC+5:30. Contact published on that GitHub profile was seen; not used.
- Test 3: nothing calls him a founder; X bio "Learn ~ Build ~ Deploy"; his portfolio https://www.arpitverma.me loaded title only ("Software Engineer"). Sole contributor is not proof of founder.
- Test 4 and 6 (X sweep, https://api.fxtwitter.com/2/profile/arpitverma_123/statuses): one post about QueueJump, 26 Oct 2026, "live on Peerlist today", no video, nothing dated ahead. Show HN search "queuejump": no match for this product (three unrelated hits).

### Pippin (open)
- https://usepippin.com/ (home): Mac to-do app that reads on-screen text; macOS 15, Apple silicon; "free during the beta"; email form for the beta; "See it in action" is an on-page text animation, not a video; contact hello@usepippin.com. The site has no X, GitHub, YouTube or Product Hunt links (true of the site only; see the X account below).
- https://usepippin.com/privacy: "Pippin is made by one person: Shubham Padia, India." Last changed 30 Oct 2026. https://usepippin.com/terms (opened twice): "Pippin is made by Shubham Padia"; "The beta is free. We may charge for later versions."; version 0.1.0 beta. https://usepippin.com/pricing: 404.
- https://usepippin.com/blog/: nine posts, 20-29 Oct 2026, no forward-looking dated statement; the post https://usepippin.com/blog/what-pippin-reads-on-your-mac/ has none and no video.
- Identity and day job (chain, each link seen by me): the maker's X account @wokepadia (https://api.fxtwitter.com/wokepadia) shows name Shubham Padia, India, website https://usepippin.com/, bio "Open source @ Zulip. Dipping my toe in Indiehacking, same as every second person on your timeline." https://shubhamp.in links https://hashnode.com/@wokepadia and https://github.com/shubham-padia, and names Glints as an employer (a past one per my earlier read of the site; I did not re-confirm the tense). https://api.github.com/users/shubham-padia shows name Shubham Padia, India, bio "Full time contributor @zulip". So the name on the Pippin legal pages, the X account that lists usepippin.com, and the GitHub account are linked through shubhamp.in and the shared handle. A full-time role at Zulip (open source) is indicated, not directly stated for Pippin. Per assumption 4 this is a caveat on a test 3 pass, not a fail. A GitHub search for a pippin repo under that account found none.
- X launch video (test 6): https://x.com/usepippin/status/2112885341653020761 (Wed 21 Oct 2026, 12:34 UTC, @usepippin, "Introducing Pippin"; text: "a smart companion that writes your to-do list while you work", beta out at usepippin.com, "free for a limited time"), one video of 30.2 s. The same clip appears on the maker's post https://x.com/wokepadia/status/2112884745982132732 (21 Oct 2026, 12:32 UTC), which @usepippin reposted. I did not play either. The site does not link either post. The maker's other Pippin post, https://x.com/wokepadia/status/2114646642771239065 (26 Oct 2026), says "Pippin is live now on peerlist", with a link card and no video. Under assumption 3 this leaves test 6 unknown.
- Test 4: the posts say "free for a limited time", with no date; nothing else dated ahead on the site, blog or X. Show HN search "usepippin.com": 0 hits. Web search found no Product Hunt listing.

### Lightning (rejected, test 1)
- https://saishpawar.com/lightning: "a free, open-source app launcher and file search for Windows 10 and 11, built in Rust" (short phrase; review r1's own fetch showed "free & open source, MIT licensed"); no pricing, donate or sponsor; no creator named. https://saishpawar.com/lightning/pricing: 404.
- https://raw.githubusercontent.com/sashpawar11/lightning/main/README.md: MIT, no roadmap, static screenshots, no video. https://api.github.com/repos/sashpawar11/lightning: MIT, created 2026-10-20. Contributors: sashpawar11 35 (https://api.github.com/repos/sashpawar11/lightning/contributors). Releases v0.1.0 to v0.5.0, 20-27 Oct 2026, none mentions planned work (https://api.github.com/repos/sashpawar11/lightning/releases). Issues and PRs: 6, no milestones or labels (https://api.github.com/repos/sashpawar11/lightning/issues?state=all&per_page=20).
- Maker: https://api.github.com/users/sashpawar11 gives Saish Pawar, company OneShield Software, Goa, India. https://saishpawar.com: "Associate Software Engineer (Aug 2023 - Present)" at OneShield Software; does not mention Lightning. https://api.fxtwitter.com/sashpawar11: bio "swe", Goa, India, website https://splitframe.app/. I did not test splitframe.app (out of scope). Review r1 recorded that it appears to sell plans with a launch video; that is reported in review r1, not seen by me, and is not a new candidate.
- Test 3: unknown because no source names him as the founder or sole maker of Lightning as a product (the product page names nobody). The job elsewhere is not the reason (assumption 4).
- Test 4 and 6 (X sweep, https://api.fxtwitter.com/2/profile/sashpawar11/statuses): launch post https://x.com/sashpawar11/status/2112769225622421773 (21 Oct 2026, video 15.0 s); v0.4.0 post https://x.com/sashpawar11/status/2113140540950892723 (22 Oct 2026, video 6.4 s); Peerlist post 27 Oct 2026, no video. Nothing dated ahead. Not played. Show HN search "sashpawar11/lightning": 0 hits. The decision does not change because the row fails test 1.

### envgrid (rejected, test 6)
- Videos: https://raw.githubusercontent.com/Achal13jain/envgrid/main/frontend/src/pages/Landing.tsx renders a `TourVideo` with `/envgrid-tour-light.mp4` and `/envgrid-tour-dark.mp4`, aria-label "A short tour of envgrid: the grid, filling a gap, history, compare and the activity log". The README embeds the GIF "A short tour of envgrid" (https://raw.githubusercontent.com/Achal13jain/envgrid/main/README.md). Release `media` (https://api.github.com/repos/Achal13jain/envgrid/releases/tags/media, opened twice): "Videos for the website and the README"; assets envgrid-marketing.mp4, envgrid-tour-dark.mp4, envgrid-tour-light.mp4 (video/mp4) and an .srt subtitle file. Release `media-2` (https://api.github.com/repos/Achal13jain/envgrid/releases/tags/media-2): re-recorded tour videos. I did not play any file. I tried the .srt but the host redirected and I did not follow it.
- Test 1: README, landing source, llms.txt (https://raw.githubusercontent.com/Achal13jain/envgrid/main/frontend/site/llms.txt) and docs/features.md (https://raw.githubusercontent.com/Achal13jain/envgrid/main/docs/features.md) show MIT, "not a cloud service" and no pricing; https://envgrid.pages.dev/pricing is 404; the repo tree has no pricing file (https://api.github.com/repos/Achal13jain/envgrid/git/trees/main?recursive=1). Maker's portfolio https://achal-jain.vercel.app: Jaipur, India; envgrid is a "Featured project"; "Open to roles, collaborations, and interesting problems."
- Test 3: README says "Built by Achal Jain"; nothing calls him a founder; unknown (assumption 4).
- Test 4: features.md lists four undated roadmap items; releases v1.0.0 (9 Oct) to v1.2.0 (25 Oct 2026) (https://api.github.com/repos/Achal13jain/envgrid/releases); open items are three dependabot PRs. No X handle is known, so no timeline sweep. Show HN search "envgrid": no match for this product (a "Show HN: Envgrd" hit is a different name, not checked).
- Contributors: Achal13jain 11, dependabot 3 (https://api.github.com/repos/Achal13jain/envgrid/contributors). The site https://envgrid.pages.dev/ loaded title-only, as before.

### MailMark (rejected, test 6, medium; no human-research row)
- Test 1: https://mailmark.dev/ lists paid plans: Starter $10 a month, Pro $50, Business $100, with a 7-day trial (the trial was not separately checked).
- Test 2: Show HN https://hn.algolia.com/api/v1/items/47653287 (author debasishbarai, 5 Apr 2026). Conflict, recorded side by side: https://mailmark.dev/terms says the operator is "Mailmark Inc." under Delaware law, address "on file with Delaware Secretary of State", updated 15 Sep 2026. I do not settle it.
- Test 3: https://mailmark.dev/about: "Founder & Solo Developer", Debasish Barai, "an independent project", started in 2024. Product Hunt makers page (https://www.producthunt.com/products/mailmark/makers) names Debasish Barai and says "Built solo". Pass under assumption 4, with these caveats recorded side by side:
  - Day job: the Show HN post says "I am not a software developer by profession. I am an electrical engineer working in a power plant in India." (5 Apr 2026, first person, present tense; stated in April 2026, not confirmed since).
  - Legal entity: the Terms say "Mailmark Inc." (Delaware, 15 Sep 2026).
  - Dates: the About page says started in 2024; the LinkedIn page https://www.linkedin.com/company/mailmarkdev shows founded 2026.
  - Size: the same LinkedIn page shows 1 employee, and a post about a month old ends "Next up: fixing payments and getting customer #2". https://mailmark.dev/careers loads and lists 4 open roles, all remote: DevOps / Infrastructure Engineer and Product Designer (full-time); Content & SEO Writer and UGC Video Creator (part-time or contract); it calls Mailmark a "small, passionate team". That the UGC role makes short videos showing Mailmark in use is reported in review r1, not seen by me.
- Test 4: past launches only: Product Hunt Launch 1 on 11 Apr 2026 and Launch 2 on 27 Sep 2026 (https://www.producthunt.com/products/mailmark); three Show HN posts (5 Apr, 17 May, 24 May 2026; https://hn.algolia.com/api/v1/search?query=mailmark.dev&tags=story); blog newest post 1 Nov 2026, no forward-looking item (https://mailmark.dev/blog); docs, changelog (404) and mobile repo have no dated plan. X sweep of @mailmarkdev (https://api.fxtwitter.com/2/profile/mailmarkdev/statuses): nothing dated ahead. Nothing dated ahead was seen.
- Test 5: https://github.com/DebasishBarai/mailmark-mobile-v2 is MIT, 104 commits, README "Mailmark for iOS and Android" linking mailmark.dev; contributors: claude 68, DebasishBarai 36 (https://api.github.com/repos/DebasishBarai/mailmark-mobile-v2/contributors). Public, but it is the mobile client; the main web app repo was not found, and npm https://www.npmjs.com/package/mailmark-sdk returned 403. (Review r1 noted his public repos include shortsai, remotion, remotion-video and revid-landing-page among 18 of 68 it saw; reported in review r1, not seen by me.)
- Test 6 (rejection, see assumption 2):
  - Home page https://mailmark.dev/: section "See Mailmark in action": "Watch how easy it is to set up your domain, create sender mailboxes, and launch your first email campaign." with "Click to play · overview", and a second "Click to play · personalization features". The footer links https://x.com/mailmarkdev. I saw no video, iframe or file reference in what I could read (same on the Vercel mirror https://devmail-nine.vercel.app/), so I confirm the page's wording, not a clip.
  - @mailmarkdev thread of 9 May 2026: https://x.com/mailmarkdev/status/2052951203735339112 opens the thread with a 54 s video; the later post https://x.com/mailmarkdev/status/2052951873964130579 says "Watch the 1-minute walkthrough above" and points to a free trial. Not played; the 54 s clip's content is unknown, except as the thread itself calls it a walkthrough.
  - Nine more clips on 30 Oct 2026, 21.2 to 32.6 s each (for example the SDK clip https://x.com/mailmarkdev/status/2116080713971933305, 23.5 s), one noted in its post as an AI-generated presenter. Not played.
  - Product Hunt gallery: two images. A web search found no YouTube video. Not a MotionRepo competitor (email platform); no other fact-sheet disqualifier seen.
- Published business contacts, not used: support@mailmark.dev (https://mailmark.dev/contact; a support inbox never gets a Go, memory/MAIN.md 2026-10-30). @mailmarkdev is the other published channel. Nothing is drafted or sent.

## Lookups that failed or gave little
- peerlist.io: 403 (QueueJump page tried; the other listings not retried). Listing media for Ogimg, QueueJump, Pippin, Lightning and envgrid is therefore unseen.
- https://ogimg.in/about and /changelog: ECONNRESET on first try, loaded on retry. https://mailmark.dev/careers loaded on this revision's fetch (the first run's ECONNRESET was not retried; fixed above).
- https://www.npmjs.com/package/mailmark-sdk: 403. https://hackernews-dynamic.seasondane.workers.dev/news/48171940: 404 (the Algolia search listed that story, 17 May 2026, so it exists). https://api.fxtwitter.com/AiDebasish: 404.
- X timelines: `api.fxtwitter.com/2/profile/<handle>/statuses` worked for @usepippin, @wokepadia, @mailmarkdev, @sashpawar11, @arpitverma_123 and @kaditya264. It returned 404 for @debasish_barai1 (MailMark maker's personal account, also reported 404 in review r1), for @shubham-padia (a GitHub handle, not an X handle) and for the guessed handles ogimg_in and GxAditya. No X handle is known for envgrid's maker. This corrects the earlier text in this file that said the mirror gave no timelines.
- Show HN (Algolia) was searched by name for Ogimg, QueueJump, Pippin, Lightning and envgrid; no post for any of them was found (Ogimg and envgrid returned only different-named products). The sweep for MailMark found its three past posts.
- https://envgrid.pages.dev/ and https://www.arpitverma.me: title only; repo files were used for envgrid.
- Still not searched: YouTube channels (no channel URL is known for any of the six); personal LinkedIn profiles (the company page for MailMark was read; the maker's personal profile returned 999 in review r1).
- Not played: any video or GIF.

## Next actions (one per open row)
- Pippin. (1) **A person** plays the 30.2 s clip at https://x.com/usepippin/status/2112885341653020761 on x.com and says whether it shows the product in use. If it does, Pippin is rejected on test 6. (2) Only if it is not a product demo, **a person** then decides whether to approve a question to the maker about a dated launch and a GitHub repo (tests 4 and 5, the only reasons left for that question). No approval item is raised now and nothing is drafted. (3) After answers, **the lead-generator** re-runs tests 4 to 6 and imports only if all six pass.
- MailMark. None: it is rejected. A person may overturn assumption 2 by playing the 54 s clip at https://x.com/mailmarkdev/status/2052951203735339112.
- If a person overturns assumption 1 (video fails test 6 without playing), envgrid's test 6 fail goes back to unknown; its test 1 fail would still stand, so it stays rejected.

## Page instructions found
None. No fetched page held instructions aimed at an AI or reader.

## Hypotheses
- Most solo makers on Peerlist Launchpad are free or portfolio projects, not startups (confidence medium): of the 5 Peerlist rows re-tested (Ogimg, QueueJump, Pippin, Lightning, envgrid), 4 were rejected (3 on test 1, 1 on test 6) and 1 (Pippin) is open. MailMark came from my own search, not Peerlist. Allowing solo founders alone does not make this source productive.
- Even makers with paid products tend to post launch clips on X (confidence low: 5 of the 6 candidates have at least one X launch clip or, for envgrid, tour videos in the repo; QueueJump's maker's posts had none). Test 6 may reject many launch-active makers once clips are played; a forward-launch source for test 4 is still the gap.

## Fix log (review r1, fixes 1 to 13)
1. Done. False mirror sentence deleted; sweep recorded with handles that returned 404; X and Show HN removed from "not searched". Test 4 stays unknown for all six.
2. Done. MailMark rejected on test 6, medium; table, heading, evidence, assumptions and counts rewritten; status URLs, nine clips, home-page wording and footer link recorded; not played stated. /contact's link to the account is reported in r1, not seen by me.
3. Done. Assumption 2's exemption deleted; MailMark treated like Graphite.
4. Done. Pippin posts recorded with URLs, date and 30.2 s, not played; ruling R2 applied (open, unknown); "no X listing" replaced; "no X links" now says "of the site only".
5. Done. Identity chain recorded; "unconfirmed" and "nothing links" removed. The reviewer's claim that his X profile "Open source @ Zulip" is the day job is recorded as an indication, not a statement about Pippin.
6. Done. One day-job rule in assumption 4, applied to Pippin, Lightning, MailMark and the rows in human-research.md. No question left open.
7. Done. Show HN post quoted; dated to April 2026; Delaware conflict kept.
8. Done. Careers page (4 roles, "small, passionate team") and LinkedIn (1 employee, founded 2026) added; 2024 and 2026 dates side by side; failed-page text removed.
9. Done. Test 6 cells and rows for Ogimg, QueueJump and Lightning now include the X clips (envgrid's row is a test 6 fail already). The state stays unknown and no decision changes.
10. Done. Repo tree check added: 125 entries (92 files), no billing-related path. My count differs from the review's "about 90 paths".
11. Done. Counts, hypotheses and next actions updated; MailMark outbound step deleted.
12. Done. Agent-doable steps removed; Pippin's next action is a person playing the clip, then a person's decision; nothing routed to support@.
13. Done. Gate output pasted below.
Not applied: nothing. Not checked by me: Peerlist pages, and the r1-only items marked "reported in review r1".

## check (raw)
```
OK: 4 lead(s), no problems found.
```
Run: `node scripts/leads.mjs check`, 2026-11-01. The four leads are the existing ones; none comes from this task.

## gate (raw)
Run: `node scripts/leads.mjs gate --product motionrepo --status all`, 2026-11-01, exit code 1. The Stops are not from this task: all four leads already existed (L-05fc7e3d and L-cfc4d2da are disqualified; L-4d574242 is on hold). No lead was added or changed.
```
id          tier  verdict      contact  company                                        why
----------  ----  -----------  -------  ---------------------------------------------  -----------------------------------------------------------------------------------------------------------------------
L-05fc7e3d  C     Stop         general  Groundrule (Vyana Compute / Metricall AI Lab)  status is disqualified; tier C
L-75e81825  C     Conditional  general  Deplexo                                        tier C
L-cfc4d2da  C     Stop         none     SigNoz                                         status is disqualified; no published contact; tier C
L-4d574242  B     Stop         general  Repowise                                       on hold (founders): Does never contact competitors cover it? It sells generated docs and compares itself with DeepWiki.

3 Stop, 1 Conditional. Fix a Stop at the source, then run the gate again.
```

## check-links (raw)
Run: `node scripts/check-links.mjs outputs/research/2026-11-01-motionrepo-solo-retest.md`, 2026-11-01, exit code 1.
```
86 link(s): 75 ok, 6 restricted, 5 broken, 0 unreachable
BROKEN  404  https://queuejump.arpitverma.me/pricing
BROKEN  404  https://usepippin.com/pricing
BROKEN  404  https://saishpawar.com/lightning/pricing
BROKEN  404  https://envgrid.pages.dev/pricing
BROKEN  404  https://hackernews-dynamic.seasondane.workers.dev/news/48171940
RESTRICTED  403  https://api.github.com/repos/Achal13jain/envgrid/releases/tags/media-2
RESTRICTED  403  https://api.github.com/repos/Achal13jain/envgrid/git/trees/main?recursive=1
RESTRICTED  403  https://api.github.com/repos/Achal13jain/envgrid/releases
RESTRICTED  403  https://api.github.com/repos/Achal13jain/envgrid/contributors
RESTRICTED  403  https://api.github.com/repos/DebasishBarai/mailmark-mobile-v2/contributors
RESTRICTED  403  https://www.npmjs.com/package/mailmark-sdk
```
The five 404s are intended: four are pricing pages cited as "no pricing page exists" (QueueJump, Pippin, Lightning, envgrid) and the fifth is the HN mirror listed as a failed lookup. The six 403s are restricted, not broken: five are GitHub API URLs that the checker's unauthenticated requests were refused on (cause not established, possibly a rate limit; the envgrid and contributors facts come from the first run of this task and were held by the reviewer in r1, and I did not reopen them in this revision), and the npm page is listed as failed. No cited fact depends on a page that is broken for another reason.

## Import
Not run: no batch file (no candidate passed all six tests). Counts: 0 added, 0 updated, 0 rejected by the import script. `pipeline/leads.jsonl` is unchanged by this task.
