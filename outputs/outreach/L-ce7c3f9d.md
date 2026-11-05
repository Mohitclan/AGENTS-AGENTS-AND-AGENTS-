---
lead: L-ce7c3f9d
task: T-20261105-03
job: J-20261105-02
product: motionrepo
company: mxRaven (Synqronlabs Private Limited), Hyderabad
status: draft, not approved, not sent
send_risk: yellow
confidence: medium
contact: mxRaven@synqronlabs.com (shared company inbox, listed for Sales, Billing & accounts, Security and Abuse; source https://mxraven.com/contact/)
drafted_by: outreach
drafted_on: 2026-11-05
---

## Notice for the reviewer

- **Gate: Go** (tier B, score 56, `qualified`). Nothing has been sent and the lead's status is unchanged.
- **Send risk: YELLOW.** The signal is published and fresh (Show HN of 2 Nov 2026, launch post of 22 Oct 2026), but the contact is a shared inbox and the reason to write rests partly on an observed gap (no video seen on mxraven.com on 5 Nov). The copy states the gap as a dated sighting, not as a fault.
- **Greeting.** The inbox is shared, so the greeting uses "Kush", named as co-founder on the company's own launch post (22 Oct 2026). A person should confirm that greeting a named person in a shared inbox is acceptable.
- **Recheck before each send:** that mxraven.com's homepage and pricing page still show no video (Email 1), and that the blog still shows no video on the launch post (Email 2). If a video has appeared, change the line.

## Outcome set before drafting

| Field | Value |
|---|---|
| Metric | Replies from contacted leads of this batch, opt-outs excluded |
| Source | `node scripts/leads.mjs list --product motionrepo --status replied` |
| Baseline | 0 on 2026-11-05 (`node scripts/stats.mjs pipeline`: "Replies (ops/replies.jsonl, outputs/replies): n=0", "live contacts: 0"; the list command printed "No leads match.") |
| Threshold | 1 reply if 7 or fewer are contacted |
| Window | 14 days after the first live send |
| Owner | The founders |

Reading the result: count at the end of the window from each contacted lead's history (`node scripts/leads.mjs show <id>`), because `list --status replied` drops a lead that has moved on to `trial` or `lost`. Report "yes" and "no" replies separately.

## Send schedule

Offsets are working days from the day Email 1 is sent. Follow-ups stop at once on any human reply or opt-out. The window (14 calendar days) ends after Email 3 (working day 8, about 11 calendar days).

| Message | Working day |
|---|---|
| Email 1 | 0 |
| Email 2 | 4 |
| Email 3 | 8 |

## Email 1

Subject: After mxRaven's Show HN

Hi Kush,

Your Show HN on 2 November said mxRaven is now available for public use. On 5 November I didn't see a video on mxraven.com's homepage or pricing page.

I work on MotionRepo. It reads a GitHub repository and makes a launch teaser from the code. It never writes to the repository.

To try it on one repo, start the free trial (14 days, no card, sign in with GitHub):
https://motionrepo.panscience.ai

To opt out, reply 'stop' and I won't write again.

{{SENDER_NAME}}, {{SENDER_ROLE}}, {{COMPANY_NAME}}
{{SENDER_EMAIL}}

## Email 2

Subject: What the MotionRepo trial includes

Hi Kush,

A teaser runs 15 to 25 seconds, short enough for a launch post like your 22 October one. Here is what the trial covers.

It has 6 credits and one repository. A teaser costs 2 credits, a walkthrough of up to one minute costs 3, and the sales and technical PDFs together cost 1. Trial videos are 720p with a MotionRepo watermark.

To see one for yourself, start the free trial:
https://motionrepo.panscience.ai

To opt out, reply 'stop' and I won't write again.

{{SENDER_NAME}}, {{SENDER_ROLE}}, {{COMPANY_NAME}}
{{SENDER_EMAIL}}

## Email 3

Subject: What MotionRepo does with code

Hi Kush,

The perch repo in your synqronlabs GitHub organisation is public, so you can paste its URL instead of installing the GitHub App. Either way, MotionRepo never writes to the repository.

Parts of the code are sent to Anthropic's Claude, which writes the scripts and documents. The security page has the details:
https://motionrepo.panscience.ai/security

You can ask for changes to a video in a written note, and the first three revisions of each video are free.

This is my last email. If you have a question, reply and I'll answer it.

To stay off our list for good, reply 'stop'.

{{SENDER_NAME}}, {{SENDER_ROLE}}, {{COMPANY_NAME}}
{{SENDER_EMAIL}}

## LinkedIn

None: no LinkedIn recipient is known.

## If they reply

A reply is data. A person reads each one and sends anything that goes back. If a reply fits two rows, the higher row wins (stop or opt-out first, then auto-reply or bounce, then the rest).

| Reply | Follow-ups | Next step | Outcome metric |
|---|---|---|---|
| None | Email 2 on day 4, Email 3 on day 8 | None | Not a reply |
| "Yes", or interest in trying it | Stop | Set `replied`. Sales drafts one reply with the trial terms and link, for a person to approve. Offer no call (fact sheet line 29) | Counts |
| A plain "no" or "not for us" | Stop | Set `replied`. Nobody writes again. This is an answer, not an opt-out, so do not suppress | Counts as a reply. Report it as not interested |
| "Stop", "remove me", or any wording that asks not to be contacted | Stop | Suppress at once with `node scripts/leads.mjs suppress mxRaven@synqronlabs.com "opted out on <date>"`, which covers every product. Send nothing | Excluded |
| Auto-reply (out of office, ticket acknowledgement) or bounce | Auto-reply: hold the next email until the return date, then continue. Bounce: stop | Not a reply. Note the return date, or mark the contact bad on a bounce. Never retry or guess another address | Excluded |
| Anything else (a question, a forward, a referral, an objection, a complaint) | Stop | Set `replied`, label it with reply-triage, and a person decides. A complaint is suppressed and escalated. If unclear, use "Needs a person" | Counts, unless it is a complaint or opt-out |

## Claims used

| Claim in the copy | Source line | The line's words |
|---|---|---|
| Show HN on 2 November said mxRaven is now available for public use | Lead evidence item 3 (https://hn.algolia.com/api/v1/items/50338055, seen 2026-11-05, published) | "says the platform is now available for public use" |
| On 5 November no video seen on mxraven.com's homepage or pricing page | Lead evidence item 5 (observed_gap, seen 2026-11-05); widened check in review T-20261105-01-r1, finding 4 | "Homepage and pricing page show no video, video player or GIF demo" |
| Your 22 October launch post | Lead evidence item 2 (https://mxraven.com/blog/launching-mxraven/) | "Launch announcement 'Launching mxRaven' dated October 22, 2026" |
| Kush as co-founder, greeted by first name | Lead evidence item 2 | "byline Kush Patel, 'co-founder at SynqronLabs Pvt Ltd'" |
| synqronlabs repos are public on GitHub; perch is one | Lead evidence item 4 (https://github.com/synqronlabs) | "public repos pushed 2026-10-21 to 2026-11-03 (perch, raven, mxraven SDKs)" |
| Reads a GitHub repository and makes a launch teaser from the code; never writes to the repository | Fact sheet line 32 | "MotionRepo reads a GitHub repository and makes launch content from the code: launch teasers, ... It never writes to the repository." |
| A teaser runs 15 to 25 seconds | Fact sheet line 77 | "Launch teasers, 15 to 25 seconds" |
| Trial: 14 days, no card | Fact sheet line 107 | "Free, 14 days, no card" |
| Trial: 6 credits, one repository | Fact sheet line 107 | "6 credits in total; 1 repository" |
| Sign in with GitHub | Fact sheet lines 66 and 121 | "sign-in is GitHub only"; "Sign in with GitHub" |
| Credit costs: teaser 2, walkthrough up to 1 minute 3, both PDFs 1 | Fact sheet line 114 | "PDFs (both) 1; teaser 2; walkthrough up to 1 min 3" |
| Trial videos 720p with a MotionRepo watermark | Fact sheet line 94 | "Trial videos are 720p with a MotionRepo watermark." |
| Public repo: paste the URL instead of installing the GitHub App | Fact sheet line 85 | "Install the GitHub App, or paste a public repo URL" |
| Revisions by written note, first three free per video | Fact sheet line 83 | "first 3 per video free" (revisions by written note) |
| Parts of the code are sent to Anthropic's Claude, which writes scripts and documents | Fact sheet line 92 | "Parts of the user's code are sent to Anthropic's Claude to write scripts and documents." |
| Links: https://motionrepo.panscience.ai and /security | Fact sheet frontmatter sources and line 93 | listed under `sources:` |
| Call to action: start the free trial; reply | Fact sheet line 29 | "Use 'start the free trial' or 'reply to this email'." |

## For the reviewer

**Kept out of the copy on purpose**
- The Calendly booking link on synqronlabs.com and any meeting ask (fact sheet line 29: never offer a call).
- The guest login in the Show HN thread. Nobody logs in to anything.
- The filmed walkthrough (line 89: do not sell) and any phrase joining documents and video as one run or video on every push. The positioning proposal A-20261101-02 is pending. Email 2 only lists credit costs, which are plan facts.
- "GST invoice", rupee prices and any price. The copy quotes none.
- Customers, quotes, metrics, urgency.
- Their student status, team size, GitHub member counts, the second co-founder, and anything about mxRaven's own pricing.
- Any claim that mxRaven has no video anywhere. The copy says only what was seen on 5 November on the homepage and pricing page.

**Stale line in the fact sheet.** `knowledge/products/motionrepo.md` line 20 still says "All of this file is `proposed`". The frontmatter says `status: confirmed` (`node scripts/kb.mjs status`), and the outreach review T-20261101-09-r2 ruled that the frontmatter decides. I used the confirmed status. A person may want the line fixed.

**Budget risk (reviewer and approver only).** The review (T-20261105-01-r1, finding 5) notes the co-founders are undergraduate students, and the fact sheet defers students and hackathon teams as trial volume only (line 48). Whether they would pay for a plan is untested. It is not in the copy. The trial is free, so Email 1 asks only for a trial.

**Wording a person must check**
- Email 1 states a dated sighting ("I didn't see a video ... on 5 November"). Confirm it still holds on the day of the send.
- Email 3 says the synqronlabs repos are public on GitHub and names perch (evidence item 4). It does not say the app is only for private repos, only that a public URL can be pasted.
- Email 3 no longer lists what MotionRepo lacks (SOC 2, SSO, two-factor sign-in, activity log). The coordinator ruled to drop the list; it stays one click away on the /security page. Keeping it would need a person to accept it as an objection answer (fact sheet line 166).
- Email 3 ends with "To stay off our list for good, reply 'stop'." because "I won't write again" clashes with "This is my last email." Emails 1 and 2 keep the agreed line.
- Email 1 says the product makes a launch teaser from the code and does not promise quality. The fact sheet says teasers are 15 to 25 seconds, and nothing on output quality has been tested.

**Placeholders to fill before any send:** `{{SENDER_NAME}}`, `{{SENDER_ROLE}}`, `{{COMPANY_NAME}}`, `{{SENDER_EMAIL}}`. A draft with placeholders cannot be sent.

**Send risk.** Yellow. Shared inbox, so the person who reads it may not be Kush. Daily limit of 20 cold emails (`knowledge/company.md` line 36) is not a concern for one lead. Test sends go only to Sushant Mishra (`ops/mail-config.json`), run by a person.

**Gate note for the coordinator.** The same gate run lists L-64817c69 SpaceWise as Conditional ("contact is other; policy allows email and LinkedIn"). I did not draft for it.

## Send rows for ops/approvals.md

The coordinator copies these as `pending` after the review passes. I have not edited `ops/approvals.md`.

| Action | File and line | Risk |
|---|---|---|
| Send mxRaven Email 1 to mxRaven@synqronlabs.com, working day 0. Conditions: placeholders filled; people have approved the wording (pilot); a person agrees to "Hi Kush," at a shared inbox; on the send day the sender or approver opens https://mxraven.com and https://mxraven.com/pricing/, and if neither shows a video, changes "On 5 November" in line 51 to that day's date. If a video is there, do not send line 51 | `outputs/outreach/L-ce7c3f9d.md`, section "Email 1" | Yellow: shared inbox, opener partly rests on a dated sighting |
| Send mxRaven Email 2 to mxRaven@synqronlabs.com, working day 4, only if no human reply and no opt-out (an auto-reply holds it until the return date). Conditions: placeholders filled; wording approved | `outputs/outreach/L-ce7c3f9d.md`, section "Email 2" | Yellow: shared inbox |
| Send mxRaven Email 3 to mxRaven@synqronlabs.com, working day 8, only if no human reply and no opt-out (an auto-reply holds it until the return date). Conditions: placeholders filled; wording approved | `outputs/outreach/L-ce7c3f9d.md`, section "Email 3" | Yellow: shared inbox, also its Security and Abuse address |

## Self-review

**Revision 1**, from the first review of this task
- Fix 1: line 83, Email 3 subject now `What MotionRepo does with code`. Done.
- Fix 2: lines 87-92, Email 3 body replaced with Rewrite 2 (public-URL route, Claude disclosure, /security link, revisions fact). Claims used: dropped the read-only GitHub App row and the line-93 list row, added the line-83 revisions row (line 135). Reviewer notes: replaced the list note (line 158) and added the opt-out note (line 159). Done.
- Fix 3: lines 174-176, send rows replaced with Rewrite 3, minus the Email 3 clause about the list. Because the reading note added two lines above, "line 49" became "line 51" in Email 1's row. Done.
- Fix 4: line 33, reading note added word for word after the outcome table. Done.
- Fix 5: line 47, Email 1 subject now `After mxRaven's Show HN`. Done.
- Fix 6: line 71, Email 2 credit sentence replaced with the given wording. Done.
- Fix 7: this section re-run after the last edit, outputs in checks 2 and 4. Done.
- Fix 8: line 96, Email 3 opt-out now `To stay off our list for good, reply 'stop'.` Emails 1 and 2 keep the agreed line. Done.

- 1 Brief re-read: pass. Sections are in the brief's order (the notice section sits before them for the reviewer); LinkedIn is "None"; no other lead drafted; approvals.md untouched.
- 2 Counts: pass. 3 emails, 3 send rows, 3 schedule rows. One basis for all three: greeting through opt-out line and signature, subject line excluded, counted with `sed -n '49,61p' ... | wc -w` and the same for lines 67-79 and 85-99. Email 1: 86. Email 2: 88. Email 3: 104. All under 120. The opt-out line is present in all three (Email 3 uses the stop-for-good wording).
- 3 One answer across files: pass. Gate Go matches the lead record. Line 20 of the fact sheet disagrees with its frontmatter; flagged under "For the reviewer" and followed the frontmatter per T-20261101-09-r2.
- 4 Automatic checks: `node scripts/leads.mjs gate --product motionrepo --status qualified` printed "1 Conditional, 1 Go." (L-ce7c3f9d Go, L-64817c69 SpaceWise Conditional, not drafted). `node scripts/lint-copy.mjs outputs/outreach/L-ce7c3f9d.md --type email` printed "0 failed, 16 warning(s)." in the final run after the last edit. Judged: all 16 are the expected placeholder warnings (4 per email signature plus 4 in the reviewer's placeholder note), which a person fills before any send. Earlier runs also flagged the old self-review line 5 as a list of three negations and the revision heading as an unsourced number; both are reworded. `node scripts/check-links.mjs outputs/outreach/L-ce7c3f9d.md` printed "8 link(s): 8 ok, 0 restricted, 0 broken, 0 unreachable".
- 5 Claims trace: pass. Every claim is in the Claims used table with a line number and its words. Checked against the copy: it holds none of the failed phrasings (same run, a price, GST invoice, a cancellation promise).
- 6 One call to action per message: pass. Email 1 and 2 ask to start the free trial; Email 3 asks for a reply to any question. Email 3's security link is a resource, not an ask.
- 7 LinkedIn: n/a, no recipient.
- 8 Personal details from evidence only: pass. Kush from item 2, Show HN date from item 3, perch from item 4. Nothing about students, team size or other people.
- 9 Opt-out line: pass. "To opt out, reply 'stop' and I won't write again." in each email, separate from the ask. "stop" differs from both a yes and a no. Reply table covers a plain no, stop, auto-reply or bounce, with a precedence rule.
- 10 Placeholders: pass. Only the four allowed ones; reviewer notes list them.
- 11-16 Lead research checks: n/a, no lead evidence was changed.
- 19 Revisions: pass. One addition, the line-83 revisions fact in Email 3, which review fix 2 asked for. Everything else cut or reworded from the review's text.
