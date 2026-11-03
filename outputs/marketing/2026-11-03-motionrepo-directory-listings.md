# MotionRepo: directory listing plan for Indian launch directories (T-20261103-13)

Date: 2026-11-03. Product: motionrepo. Segment served: launch-active, founder-led Indian software product startups (`outputs/research/2026-10-30-motionrepo-channel-map.md`, line 3). Everything here is a draft. Nothing was submitted, signed up for, uploaded or sent. Every claim in the listing text carries `[UNCONFIRMED]` (reason in "Before choosing any venue", check 1), so no listing can be submitted yet. One marker closing a paragraph covers every claim in that paragraph.

## Outcome

Set before drafting.

| Item | Value |
|---|---|
| Metric | Trial sign-ups arriving from each listing's link |
| Source | MotionRepo's own sign-up records, read per venue through a tagged link. No such tagging or source record is known to exist today, so this is a developer handoff. Until it exists, the result is "no data", never zero |
| Baseline | No data, 2026-11-03 |
| Threshold | Three trial sign-ups from one listing. Reason: the first goal is any sign-up from segment 1, and a smaller count is too thin to read. The count is a decision marker, not a forecast |
| Window | Fourteen days after that listing goes live, read on day fifteen |
| Owner | shivam-G05 |

## Before choosing any venue

| Check | Result | Evidence |
|---|---|---|
| 1. Fact sheet confirmed, and the page a listing opens says the same | Blocked, carried on | Frontmatter says `status: confirmed` (`knowledge/products/motionrepo.md:2`), but line 20 says "All of this file is `proposed`". Per the skill the frontmatter wins, and because line 20 covers every fact, every claim is `[UNCONFIRMED]`. Fix is pending in `knowledge/proposals/2026-11-03-motionrepo-stale-status-lines.md` (row 1). I opened https://motionrepo.panscience.ai on 2026-11-03: it agrees on what the product makes, the read-only repo access and "Free for 14 days". It does not mention GitHub-only sign-in or Claude, so the listings go further than the homepage on those two points; the sheet backs them (lines 66, 92) |
| 2. A visitor can try the product today through the allowed call to action | Pass | "Use 'start the free trial'" (line 29); the "Start free" / "Get started" button links to `/dashboard/` (line 121); the homepage "Get started" goes to `/dashboard/` (opened 2026-11-03) |
| 3. Assets exist and a person has approved them | Blocked | The sheet lists no approved image or video and forbids `collateral_platform_walkthrough_hollywood.mp4` (line 156). No asset, no submission |
| 4. Channel map read; a venue it marks unverified stays so until a person opens its rules | Pass for Peerlist and Product Hunt; blocked for LaunchPad India | Channel map lines 21-22 list Peerlist and Product Hunt. Line 37 and line 46 mark LaunchPad India unverified. Its Terms were read by an agent on 2026-11-03 (T-12 file), but the skill asks for a person to open the rules. Also, line 37 says a search summary described a "reviewed" cohort; the Terms (section 4, re-read today) describe no review step. A person should confirm in a browser |

## Venues

The channel map holds three launch directories. Rows 4 and 5 are gaps; no copy is written for them.

| # | Venue | URL | India label (T-12 file) | Rules URL and date read | Recommended order and why | Status |
|---|---|---|---|---|---|---|
| 1 | Peerlist Launchpad | https://help.peerlist.io/individual/launchpad | (b) India-leaning; the skew is unsourced | https://help.peerlist.io/individual/launchpad and https://help.peerlist.io/individual/launchpad/guidelines-faqs.md, re-read 2026-11-03; FAQ read 2026-11-03 per T-12 | First. Channel map priority 1; weekly window; rules read by two agents; builders are the segment. Open risk: needs a Verified individual profile, effort unknown | drafted; blocked by checks 1 and 3 |
| 2 | LaunchPad India | https://launchpadindia.co | (a) India-specific | https://launchpadindia.co/terms, re-read 2026-11-03; homepage per T-12, 2026-11-03 | Second, and only after a person opens its rules (check 4). It is the one page that is India-specific, and no identity hurdle is stated. One launch per 90 days, so choose the date once. T-12 ranked it first; I rank it second because the skill starts from the channel map order and this venue is still unverified by a person. If Peerlist verification proves hard, move it up | drafted; blocked by checks 1, 3 and 4 |
| 3 | Product Hunt | https://www.producthunt.com/launch | (c) Global | https://www.producthunt.com/launch, re-read 2026-11-03 | Third. Channel map priority 3: heavy for unknown makers, and nothing on its page points to India. One launch, so keep it until there is a trial-based reason to launch | drafted; blocked by checks 1 and 3 |
| 4 | Gap: no further Indian launch directory in the channel map | none | not verified | none read | Candidate named by T-12 and not verified: IndiHunt (T-12 file, section 5, question 3). Outside the channel map, so to `researcher` | not verified |
| 5 | Gap: none named | none | not verified | none read | No candidate exists in either file. AIBoomi Demo Rooms are events, r/developersIndia and FOSS United are communities, Show HN is global and its rules discourage a sign-in product. None is stretched into a directory | not verified |

The choice of first venue stays with the human.

## Listing: Peerlist Launchpad

Angle: builder to builders. Leads with what the tool reads and makes. Field limits: the pages read state no character limits. The mandatory fields are name, tagline, cover image and demo link (guidelines page, 2026-11-03); description and tags are not mentioned, so their limits and existence are not stated.

- **Name:** MotionRepo
- **Tagline** (55 characters, counted by me): Turn a GitHub repo into a launch teaser and walkthrough `[UNCONFIRMED]`
- **Short description:** MotionRepo reads a GitHub repository and makes a launch teaser, a walkthrough video, a sales PDF and a technical PDF from the code. It never writes to your repo. `[UNCONFIRMED]`
- **Long description:**

  Shipping a build and still no launch video?

  MotionRepo reads a GitHub repository and makes launch content from the code: launch teasers, motion walkthrough videos, a sales PDF and a technical PDF. `[UNCONFIRMED]`

  Teasers run 15 to 25 seconds. Walkthroughs run 30 seconds to 3 minutes, depending on the plan; on the free trial, up to 1 minute. Pick from 14 tones and 3 formats: landscape, vertical and square. `[UNCONFIRMED]`

  Install the GitHub App, or paste a public repo URL. MotionRepo never writes to your repository. `[UNCONFIRMED]`

  Know before you try it: sign-in is with GitHub only, and parts of your code are sent to Anthropic's Claude to write the scripts and documents. Trial videos are 720p with a MotionRepo watermark. `[UNCONFIRMED]`

  The free trial is 14 days, with no card. `[UNCONFIRMED]`
- **Category and tags:** the field names are not stated on the pages read. Suggested for a person to match to the real form: developer tools, video, documentation, launch.
- **Links:** website https://motionrepo.panscience.ai (use a Peerlist-tagged form once the developer handoff exists). Demo link (mandatory field): what it accepts is not stated; the only demo the sheet allows is the live product with the free trial (line 155). A person decides what goes there.
- **Assets needed (to be made and approved by a person):** cover image (mandatory); logo; optional teaser video if a person approves one. A teaser made on the free trial carries a watermark (line 94), so a person decides whether to use it. No asset, no submission.
- **Maker's first comment** (a draft for the submitter to approve and edit; the submitter is a person to be chosen by the founders, owner shivam-G05, on a Verified individual Peerlist profile):

  What you get: a launch teaser, a walkthrough video, a sales PDF and a technical PDF, all made from the repo's code. `[UNCONFIRMED]`

  What to know first: GitHub sign-in only, parts of the code go to Anthropic's Claude, and trial videos are watermarked. `[UNCONFIRMED]`

  Start the free trial and tell us what you would change:

  https://motionrepo.panscience.ai
- **Rules followed:** no upvote request; no DMs to strangers with the launch link; no resharing of the link on Scroll; feedback asked for in comments (guidelines page, 2026-11-03). No discount, no proof, no customers.

## Listing: LaunchPad India

Angle: founder outcome and fit, with who it suits and who it does not. Field limits: the Terms set no character or field limits (re-read 2026-11-03); the submission form's fields are not stated. The Terms require a "live, operational product" (section 4); `stage: live` is on the sheet (line 7).

- **Name:** MotionRepo
- **Tagline** (67 characters, counted by me): Launch teaser, walkthrough video and two PDFs from your GitHub repo `[UNCONFIRMED]`
- **Short description:** Launching a product and short on time? MotionRepo makes a launch teaser, a walkthrough video, a sales PDF and a technical PDF from your GitHub repository. Prices are in rupees. `[UNCONFIRMED]`
- **Long description:**

  MotionRepo reads a GitHub repository and makes launch content from the code: launch teasers, motion walkthrough videos, a sales PDF and a technical PDF. `[UNCONFIRMED]`

  Price: Starter is ₹3,199/month + 18% GST. The free trial is 14 days, with no card. Paid plans are paid by invoice today. `[UNCONFIRMED]`

  Who it fits: a product whose code is on GitHub, since sign-in is with GitHub only. `[UNCONFIRMED]`

  Who it does not fit: anyone who needs SOC 2 or ISO 27001 certification, SSO or two-factor sign-in. MotionRepo has none of them. Parts of your code are sent to Anthropic's Claude to write the scripts and documents. `[UNCONFIRMED]`
- **Category and tags:** category names are not stated on the pages read. The homepage has Free Tools and Freemium Tools sections; MotionRepo is a paid product with a free trial, so a person chooses the category and does not call it free. Suggested tags: developer tools, video, documentation, launch.
- **Links:** website https://motionrepo.panscience.ai (LaunchPad-tagged form once the developer handoff exists).
- **Assets needed (to be made and approved by a person):** logo; at least one image or teaser if the form asks (form fields not read). No asset, no submission.
- **Maker's first comment** (draft; the platform's comment features are not described on the pages read, so use only if the form offers one):

  MotionRepo makes a launch teaser, a walkthrough video, a sales PDF and a technical PDF from your GitHub repository. The free trial is 14 days with no card. Parts of your code are sent to Anthropic's Claude, and sign-in is with GitHub only. `[UNCONFIRMED]`

  Start the free trial and tell us which part of the launch kit you would use first:

  https://motionrepo.panscience.ai
- **Rules followed:** no vote manipulation (Terms section 6); one launch and a 90-day gap before any relaunch (section 9); no coming-soon wording (section 4).

## Listing: Product Hunt

Angle: global readers, plain statement of what it does, with the limits first. Field limits: the launch page states none and links to a content checklist that its text did not show (read 2026-11-03), so every limit is "not stated". Submit steps on the page: log in, choose Submit, choose New Product, enter the product URL.

- **Name:** MotionRepo
- **Tagline** (50 characters, counted by me): Launch videos and PDFs, made from your GitHub repo `[UNCONFIRMED]`
- **Short description:** MotionRepo reads a GitHub repository and makes launch teasers, walkthrough videos, a sales PDF and a technical PDF from the code. It does not write to the repository. `[UNCONFIRMED]`
- **Long description:**

  Ready to ship, but no launch video or sales PDF yet?

  MotionRepo reads a GitHub repository and makes launch content from the code: launch teasers (15 to 25 seconds), motion walkthrough videos (30 seconds to 3 minutes, depending on the plan; on the free trial, up to 1 minute), a sales PDF and a technical PDF. `[UNCONFIRMED]`

  You choose from 14 tones and 3 formats: landscape, vertical and square. `[UNCONFIRMED]`

  Limits, stated plainly: sign-in is with GitHub only. Parts of your code are sent to Anthropic's Claude to write scripts and documents. There is no SOC 2 or ISO 27001 certification and no SSO. Prices are in rupees (Starter: ₹3,199/month + 18% GST) and paid plans are paid by invoice today. `[UNCONFIRMED]`

  The free trial is 14 days, with no card. Trial videos are 720p with a watermark. `[UNCONFIRMED]`
- **Category and tags:** topics are not stated on the page read. Suggested for a person to match: developer tools, video, marketing.
- **Links:** website https://motionrepo.panscience.ai (Product Hunt-tagged form once the developer handoff exists). The launch link may be shared anywhere (launch page).
- **Assets needed (to be made and approved by a person):** logo or thumbnail; gallery images; optional video. The exact list is in Product Hunt's content checklist, which a person must open. No asset, no submission.
- **Maker's first comment** (draft for the submitter's own personal maker account; company accounts are prohibited):

  Plain summary: MotionRepo turns a GitHub repo into a launch teaser, a walkthrough video, a sales PDF and a technical PDF. `[UNCONFIRMED]`

  It is not for everyone. Sign-in is GitHub only, and parts of the code go to Anthropic's Claude. `[UNCONFIRMED]`

  Start the free trial, then leave a comment here on what you would change:

  https://motionrepo.panscience.ai
- **Rules followed:** no direct upvote request (people are asked to visit and comment); no company account; one launch, relaunch only for significant new iterations (launch page, 2026-11-03).

## Claims used

Fact sheet: `knowledge/products/motionrepo.md`. All claims `[UNCONFIRMED]` under check 1 (line 20: "All of this file is `proposed`").

| # | Claim in the listings | Line | The line's words | Marker |
|---|---|---|---|---|
| 1 | Reads a GitHub repo and makes launch teasers, walkthrough videos, a sales PDF and a technical PDF from the code | 32 | "MotionRepo reads a GitHub repository and makes launch content from the code: launch teasers, motion walkthrough videos, and a sales PDF and a technical PDF." | `[UNCONFIRMED]` |
| 2 | Never writes to the repository | 32 | "It never writes to the repository." | `[UNCONFIRMED]` |
| 3 | Teasers 15 to 25 seconds | 77 | "Launch teasers, 15 to 25 seconds" | `[UNCONFIRMED]` |
| 4 | Walkthroughs 30 seconds to 3 minutes, depending on the plan; on the free trial, up to 1 minute | 78 and 107 | "Motion walkthroughs, 30 seconds to 3 minutes" and, in the Free Trial row, "walkthroughs up to 1 min" | `[UNCONFIRMED]` |
| 5 | 14 tones, 3 formats (landscape, vertical, square) | 79 | "14 tones, 3 formats (landscape, vertical, square) plus square loop, optional voice" | `[UNCONFIRMED]` |
| 6 | Install the GitHub App, or paste a public repo URL | 85 | "Install the GitHub App, or paste a public repo URL" | `[UNCONFIRMED]` |
| 7 | Free trial 14 days, no card | 107 | "Free, 14 days, no card" | `[UNCONFIRMED]` |
| 8 | Trial videos are 720p with a watermark | 94 | "Trial videos are 720p with a MotionRepo watermark." | `[UNCONFIRMED]` |
| 9 | Sign-in is with GitHub only | 66 | "sign-in is GitHub only" | `[UNCONFIRMED]` |
| 10 | Parts of the code are sent to Anthropic's Claude | 92 | "Parts of the user's code are sent to Anthropic's Claude to write scripts and documents." | `[UNCONFIRMED]` |
| 11 | No SOC 2 or ISO 27001, no SSO, no two-factor sign-in | 93 | "there is no SOC 2 or ISO 27001 certification, no SSO, no two-factor sign-in and no activity log" | `[UNCONFIRMED]` |
| 12 | Starter is ₹3,199/month + 18% GST | 103 and 108 | "Quote prices as "₹3,199/month + 18% GST"" and "Starter (internal id `pro`) | ₹3,199 a month" | `[UNCONFIRMED]` |
| 13 | Paid plans are paid by invoice today | 124 | "Payment: by invoice today" | `[UNCONFIRMED]` |
| 14 | Call to action: start the free trial | 29 | "Use "start the free trial" or "reply to this email"." | `[UNCONFIRMED]` |
| 15 | The product is live (LaunchPad India requires a live product) | 7 | "stage: live" | `[UNCONFIRMED]` |
| 16 | Prices are in rupees | 102 | "Prices in INR, monthly." | `[UNCONFIRMED]` |

Not used on purpose: "documents and video from one run", "updates with it" and "video on every release" (open positioning proposal, `knowledge/proposals/2026-11-01-motionrepo-one-run-positioning.md`; line 144 says the last is "not unique to us"); regenerate on push; any proof, customer, quote or rating (line 139: none exist; the homepage samples section, videos MotionRepo made from Interlister per its own caption (`repos/motionrepo/frontend/content/site.ts:149`, opened 2026-11-03), is not an approved asset in the sheet (lines 155-156), so it is not used or linked as proof until a person decides); card or UPI payment (line 124: do not offer); the Pro price; the hidden filmed walkthrough (line 89). Opening questions such as "Shipping a build and still no launch video?" are hooks, not claims, and so is the Product Hunt opener "Ready to ship, but no launch video or sales PDF yet?". The problem behind them is a hypothesis (line 37) and buyer language is "not established" (line 68).

## Approval rows needed

One row per venue for the coordinator to put in `ops/approvals.md`. No batch yes. None is ready to approve until the blockers in "Before choosing any venue" clear. I did not write to `ops/approvals.md`.

| Venue | Listing section | Assets | Rules page and date read | Submitter account type |
|---|---|---|---|---|
| Peerlist Launchpad | `## Listing: Peerlist Launchpad` in this file | Cover image, logo, demo link target and optional teaser: to be made and approved by a person | https://help.peerlist.io/individual/launchpad and the guidelines page, 2026-11-03 | A person to be chosen by the founders (owner shivam-G05), on a Verified individual Peerlist profile; no company profile |
| LaunchPad India | `## Listing: LaunchPad India` in this file | Logo and any image the form asks for: to be made and approved by a person | https://launchpadindia.co/terms, 2026-11-03; a person must also open the rules in a browser first | A person to be chosen by the founders (owner shivam-G05); account type not stated on the pages read |
| Product Hunt | `## Listing: Product Hunt` in this file | Logo or thumbnail, gallery images, optional video: to be made and approved by a person | https://www.producthunt.com/launch, 2026-11-03 | A person to be chosen by the founders (owner shivam-G05), on a personal maker account; company accounts are prohibited |

## Handoffs and open questions

Handoffs:
- `knowledge-base`: apply `knowledge/proposals/2026-11-03-motionrepo-stale-status-lines.md` (row 1 removes line 20) and have a person re-confirm the file. Until then no listing can be submitted.
- `developer`: tagged links per venue and a sign-up source record, so the Outcome metric can be read. Also check that "Get started" reaches `/dashboard/`.
- `researcher`: rows 4 and 5 (any further Indian launch directory, starting with IndiHunt); the Peerlist verification page; LaunchPad India audience size. Also a person to open the Product Hunt content checklist.

Open questions for the human:
1. Which venue first? My order is Peerlist, LaunchPad India, Product Hunt. T-12 ranked LaunchPad India first. The choice is yours.
2. Who is the submitter on each venue? Founders to choose; owner shivam-G05.
3. Who makes and approves the cover image, logo and teaser? A teaser made on the free trial is watermarked.
4. Will a person open the LaunchPad India rules in a browser (check 4)?
5. May a listing send visitors to a page whose samples section shows MotionRepo videos made from Interlister (`repos/motionrepo/frontend/content/site.ts:149`), which the sheet does not list as an approved asset (Demo assets, lines 155-156)? A person decides. Is Interlister one of our products?

## Self-review

Four U's per listing (hook-bank; email and social pass needs 10 of 16, nothing below 2):

| Listing | Useful | Urgent | Unique | Ultra-specific | Total |
|---|---|---|---|---|---|
| Peerlist | 3 | 2 | 2 | 3 | 10 |
| LaunchPad India | 3 | 2 | 2 | 3 | 10 |
| Product Hunt | 3 | 2 | 2 | 3 | 10 |

Urgent is 2 for each because its opening question names a launch the reader has right now (Peerlist, line 50; LaunchPad India, line 81; Product Hunt, line 112). The venue's own window and the trial length are not counted as urgency. The reviewer scored Product Hunt 9 before it had an opener; with one, I score it 10. Unique is 2 because sheet line 144 says video from a repo is not unique to us.

- 1 Re-read the brief: pass. All eight sections are in the asked order; five venue rows; three listing sections; deliverable 2 at `outputs/marketing/directory-tracker.md`.
- 2 Counts: pass. Three listings, two gap rows, sixteen claims (row 16 added in revision 1), three approval rows, three tagline lengths counted by hand.
- 3 One answer per question: flagged. T-12 and the channel map rank the venues differently (open question 1). Sheet line 20 against line 2 is the check 1 conflict.
- 4 Automatic checks: pending. I have no shell. The coordinator runs `node scripts/check-links.mjs` and `node scripts/lint-copy.mjs <file> --type general` on both files. The `[UNCONFIRMED]` markers are expected to raise open-marker warnings.
- 5 Claims trace to the sheet: pass. Table above; each listing sentence was compared with its row. Two ideas were cut because no line supports them: a "GST invoice" and "one run".
- 6 One call to action per message: fixed, with a note. The first draft marked this `pass` while Product Hunt used "Visit, try the free trial" instead of the sheet's wording (sheet line 29). Now all three first comments use "start the free trial" (lines 70, 98, 130). Each comment still joins a feedback ask to that call to action (Peerlist: "tell us what you would change"; LaunchPad India: "which part of the launch kit you would use first"; Product Hunt: "leave a comment here on what you would change"). I kept it because Peerlist's guidelines ask for support by commenting and Product Hunt asks people to visit and comment; the reviewer decides whether that counts as a second ask.
- Fact recheck: pass for the five pages named. Re-opened on 2026-11-03 after writing: Peerlist guidelines, Peerlist help page, LaunchPad India Terms, Product Hunt launch page and the MotionRepo homepage. Each said what this file claims. Instructions found on pages: the Peerlist guidelines page carries a header telling tools to fetch its documentation index (llms.txt) and discover all pages. It is present as of 2026-11-03 (reported by T-12 and by the reviewer's re-read, not seen in my fetch summaries), and I did not act on it.
- Items 7 to 19: n/a except 19 (no personal details, no research or code). See the revision note.

## Revision 1

Post-PASS wording (r2 notes 1, 2, 4): applied; not re-reviewed.

Round 1 review: `outputs/reviews/T-20261103-13-r1.md`, fixes 1 to 14. Line numbers are the file as it now stands. Item 19: nothing added except what the fixes asked for, each from a sheet line; the tracker was not touched, as it cites sections, not lines.

- Fix 1: removed "Made for founders with a launch coming" from the LaunchPad India first comment (line 96); replaced with rewrite A (sheet lines 32, 107, 92, 66).
- Fix 2: dropped "yet" and split the sentence in LaunchPad India's long description (line 90), as rewrite B (sheet line 93).
- Fix 3: added "depending on the plan; on the free trial, up to 1 minute" to Peerlist (line 54) and Product Hunt (line 114); claims row 4 now cites lines 78 and 107 (line 144).
- Fix 4: Product Hunt first comment now reads "Start the free trial, then leave a comment here on what you would change:" (line 130), rewrite D.
- Fix 5: line 158's note now cites `repos/motionrepo/frontend/content/site.ts:149` and says the samples section is not an approved asset (lines 155-156) so it is not linked until a person decides (rewrite E); open question 5 (line 182) now asks the person to decide and asks whether Interlister is one of our products.
- Fix 6: added the opener "Ready to ship, but no launch video or one-pager yet?" at line 112 of Product Hunt's long description, and named it in the "hooks, not claims" note (line 158).
- Fix 7: four U's note rewritten (line 194); Product Hunt Urgent is 2 for the opener, total 10, and the reason is given for each listing.
- Fix 8: self-review item 6 re-run against the sheet's exact wording and recorded truthfully (see item 6 above).
- Fix 9: added claims row 16, "Prices are in rupees", sheet line 102 (line 156).
- Fix 10: removed the repeated question from LaunchPad India's long description (before line 84); it stays in the short description (line 81) only.
- Fix 11: the "one run" note now names `knowledge/proposals/2026-11-01-motionrepo-one-run-positioning.md` (line 158).
- Fix 12: the instruction-on-page line now says the llms.txt header is present on the Peerlist guidelines page as of 2026-11-03 and was not acted on (item "Fact recheck").
- Fix 13: Peerlist first comment now "tell us what you would change" (line 70); Product Hunt done under fix 4. Line 98 (LaunchPad India) never held the "got wrong" wording, so it is unchanged.
- Fix 14: dropped "and 6 credits" from Peerlist (line 60) and from claims row 7 (line 147); no listing uses credits any more.
- Checks pending: no shell, so the coordinator re-runs `check-links.mjs` and `lint-copy.mjs --type general`.
