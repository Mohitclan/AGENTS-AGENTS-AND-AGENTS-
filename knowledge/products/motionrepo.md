---
status: confirmed
slug: motionrepo
name: MotionRepo
website: https://motionrepo.panscience.ai
repo: PanScienceInnovation/Collateral-Pipeline
stage: live
owner: shivam-G05
last_verified: 2026-10-30
sources:
  - https://motionrepo.panscience.ai
  - https://motionrepo.panscience.ai/pricing
  - https://motionrepo.panscience.ai/security
  - repos/motionrepo (main branch, package.json version 1.0.0)
---

# MotionRepo

Every fact below needs a source in brackets: a URL, a repo path with line numbers, or "told by <person> on <date>".
All of this file is `proposed` (agent draft, not human-reviewed). Website content was read 2026-10-30. Repo paths are relative to the project root.
Items marked "decided for shivam-G05 on 2026-10-30" were decided by Claude from the repo and live site at shivam-G05's request (details in `outputs/research/2026-10-30-motionrepo-open-questions.md`). The founders can override any of them.

## Owner and approvers
- **Owner:** shivam-G05 (engineering and product). [decided for shivam-G05 on 2026-10-30; evidence: all 41 PRs in PanScienceInnovation/Collateral-Pipeline were authored and merged by shivam-G05, per `gh pr list --state merged`]
- **Code merges:** shivam-G05. [same decision and evidence]
- **Discounts, content and outreach approvers:** the approvers named in `knowledge/company.md` (the founders until others are named). [same decision and evidence; knowledge/company.md]

## How to ask prospects to act (call to action)
- Use "start the free trial" or "reply to this email". Never offer "book a call": the site has no booking link. [decided for shivam-G05 on 2026-10-30; evidence: `repos/motionrepo/frontend/content/contact.json` has `bookingUrl` and `securityEmail` null; https://motionrepo.panscience.ai/.well-known/security.txt returns 404; `/dashboard/` returns 200]

## One-liner
MotionRepo reads a GitHub repository and makes launch content from the code: launch teasers, motion walkthrough videos, and a sales PDF and a technical PDF. It never writes to the repository. [https://motionrepo.panscience.ai; repos/motionrepo/frontend/content/site.ts:141]

Formerly called the "Collateral Generation Pipeline". [repos/motionrepo/README.md:3]

## Problem it solves
Hypothesis (medium confidence): software teams have to produce launch videos and sales and technical documents by hand, and they go stale as the code changes. Basis: the site says videos and PDFs are updated when the code changes and that the content comes from the code itself. No page states the problem in these words. [https://motionrepo.panscience.ai]

## Ideal customer profile
Researched hypothesis from task T-20261030-02 (researcher, reviewed 94/100), not a human decision and not tested with buyers. Source: `outputs/research/2026-10-30-motionrepo-market-brief.md` (the brief) sections 1, 3, 4, 5, 7 and 9. Segment scores are the researcher's judgment on a 1 to 5 scale. The website does not state its audience outright. [https://motionrepo.panscience.ai]

**Recommended first segment and region (hypothesis H1, confidence medium):** launch-active, founder-led Indian software product startups, about 2 to 20 people, with a launch or major release in the next 60 days. Region: India, starting with Bengaluru, Hyderabad, Pune, NCR and Chennai, where the community events are. Why: the INR price, 18% GST invoice and invoice payment suit them. Fit with the product's limits is a fact; pain and willingness to pay are inferred from two blog posts and not measured (confidence low). [brief sections 1 and 7]

**Segments ranked** (confidence medium for ranks 1 to 3 on fit with the product's limits; low for the pain and budget scores): [brief section 3]
1. Founder-led Indian product startups with a launch within 60 days. One decision-maker, same-day trial, Starter fits (1 seat, 5 repos). Open risk: whether they pay Rs 3,199 a month plus GST.
2. Indian dev-tool, API and AI-product companies that ship often (developer relations, release notes). Higher budget and a repeat need; risks are SOC 2 questions and building videos in-house.
3. Indian product-engineering studios and agencies delivering launches for clients. Larger orders (Pro: 5 seats, 25 repos); risk is client code going to Anthropic's Claude (confidence low).
4. Later or defer: global indie hackers paying in USD (cannot buy easily without card checkout); open-source maintainers (awareness, little revenue); students and hackathon teams (trial volume only); overseas dev-tool companies (invoice-only payment and INR prices are friction).

**Where they gather** (hypothesis): Peerlist Launchpad (a new launch window every Monday), AIBoomi events and Demo Rooms, then one Product Hunt launch. Several other venues could not be opened by the researcher. [brief sections 2 and 3; `outputs/research/2026-10-30-motionrepo-channel-map.md`, Priority order]

- **Buyer:** (hypothesis, low confidence) founder, product lead or head of marketing at a software company with products on GitHub. Plan tiers speak of "one person launching their products" (Starter) and "a team of up to five" (Pro). [repos/motionrepo/frontend/content/pricing.ts:36-60]
- **User:** (hypothesis, low confidence) the same person, or a developer or marketer on a small team. Pro seats are invited by GitHub username. [repos/motionrepo/frontend/content/pricing.ts:62-64]
- **Company:** (hypothesis, low confidence) small software teams. Prices are in INR, so India is the likely first market. [repos/motionrepo/frontend/content/pricing.ts:15]
- **Team size:** (hypothesis, low confidence) 1 to 5 people using the product. Basis: Starter has 1 seat and Pro has 5 seats. [repos/motionrepo/src/billing/plans.ts:58-83] A company can be larger (for example 1 to 20 staff) if the launch is run by a small group; this range is a guess to test, not a finding.
- **Searchable signals:** (hypothesis, low confidence; each can be checked from public pages)
  - A GitHub organisation with at least one public repository and a release or tag in the last 90 days, since the product reads repositories and regenerates on push.
  - A public launch coming up or just done (Product Hunt, Show HN, an announcement post or a changelog entry).
  - No in-house video, design or product-marketing person visible on the company's team page or LinkedIn company page, and no product demo video on its site or YouTube channel.
  - A product page with no launch video, or with screenshots only.
  - Company registered in India (INR pricing), or a founder-led team that is happy to pay by invoice. [repos/motionrepo/frontend/content/pricing.ts:15; https://motionrepo.panscience.ai/pricing]
- **Buying triggers:** (hypothesis, confidence low to medium; none validated with buyers) a Product Hunt, Peerlist or Show HN launch being prepared or just posted; a GitHub release or changelog entry in the last 30 to 90 days on an active repo; a founder post asking for demo-video help; no product video; a hiring post for a marketing or design role. [brief section 5]
- **Disqualifiers:**
  - Enterprises and regulated industries (disqualified for now): the security page says there is no SOC 2, ISO 27001, SSO or two-factor sign-in, and parts of the code go to Anthropic's Claude. [https://motionrepo.panscience.ai/security; brief section 3, rank 9]
  - Funded product companies with their own marketing and design staff (treat as disqualified for now; researcher's judgment): they already own the work and may ask for SOC 2 or SSO. [brief section 3, rank 8]
  - Teams whose code is not on GitHub: sign-in is GitHub only. [repos/motionrepo/README.md:90]
  - Agencies working on confidential client code, until an approved data-handling answer exists. [brief section 4]
- **Not established:** how many Indian startups pass the "launch-active, on GitHub, no video" test (the lead-generator can size it); whether buyers would pay the price; buyer language from Reddit, Indie Hackers and review sites. [brief section 9]

## Personas
Not established as personas. The brief supports only the buyer and user hypotheses above (founder or lead engineer, H6, confidence low) and names no further roles. [brief section 7]

## Features

| Feature | Status | What it does for the user | Source |
|---|---|---|---|
| Launch teasers, 15 to 25 seconds | live | Short motion-graphics launch video from the repo | https://motionrepo.panscience.ai; repos/motionrepo/frontend/content/pricing.ts:77 |
| Motion walkthroughs, 30 seconds to 3 minutes | live | Longer walkthrough video. Max length depends on plan (1, 2 or 3 minutes) | repos/motionrepo/src/billing/plans.ts:44-83 |
| 14 tones, 3 formats (landscape, vertical, square) plus square loop, optional voice | live | Choose the look and sound of a video | repos/motionrepo/frontend/content/site.ts:155, 365 |
| Voice narration | live | Free to add. Site lists 5 voices | repos/motionrepo/frontend/content/site.ts:365; plans.ts:104 |
| Sales PDF and technical PDF | live | Generated together for 1 credit | repos/motionrepo/frontend/content/pricing.ts:76 |
| Style references | live | Show a link, photo or video and a video copies its look. Free. Trial 1, Starter 5, Pro unlimited | repos/motionrepo/frontend/content/site.ts:228; plans.ts:53,66,79 |
| Revisions by written note | live | First 3 per video free, then 1 credit each. Earlier versions kept | repos/motionrepo/src/billing/plans.ts:96-97; website |
| Regenerate on push to main | live (opt-in, Starter and Pro) | Documents are made again when code on main changes, costing credits | repos/motionrepo/src/billing/plans.ts:33-36; site.ts:487 |
| Private and public repositories | live | Install the GitHub App, or paste a public repo URL | repos/motionrepo/README.md:90-95 |
| Team plan (5 seats, shared credits) | live | Pro only | repos/motionrepo/src/billing/plans.ts:71-83 |
| Priority queue | live | Pro jobs start first | repos/motionrepo/src/billing/plans.ts:37,81 |
| Self-hosted license | live (on request) | Runs on the customer's servers with their own Claude account | https://motionrepo.panscience.ai/pricing; site.ts:304-310 |
| Filmed (screen-recorded) walkthrough | built, hidden behind flag; do not sell | Code and a credit price (3, like a one-minute walkthrough) exist, but it is hidden behind the feature flag `NEXT_PUBLIC_FILMED_WALKTHROUGHS`. Not shown to customers; do not offer it | repos/motionrepo/src/billing/plans.ts:108-109 |

## Limitations and known issues
- Parts of the user's code are sent to Anthropic's Claude to write scripts and documents. [https://motionrepo.panscience.ai/security; site.ts:497]
- Security page says video sessions run with "guard rails, not a sandbox". It also says there is no SOC 2 or ISO 27001 certification, no SSO, no two-factor sign-in and no activity log. [https://motionrepo.panscience.ai/security]
- Trial videos are 720p with a MotionRepo watermark. [repos/motionrepo/src/billing/plans.ts:52]
- When credits run out, new work waits until the 1st of the month. [https://motionrepo.panscience.ai/pricing]
- Online card and UPI payment is described as "coming". Do not offer online payment. [https://motionrepo.panscience.ai/pricing; site.ts:319; decided for shivam-G05 on 2026-10-30]
- Site and README text about waiting for approval is out of date (sign-ups are auto-approved); handed to the developer. [decided for shivam-G05 on 2026-10-30; PR #39]
- The website launch checklist is unfinished: no dedicated security email (`securityEmail` is null and there is no security.txt) and no booking link. The live /security page lists launch@panscience.xyz as the security contact. [repos/motionrepo/frontend/content/contact.json:2-5; https://motionrepo.panscience.ai/.well-known/security.txt returns 404; https://motionrepo.panscience.ai/security; decided for shivam-G05 on 2026-10-30]
- No yearly plans. [repos/motionrepo/frontend/content/pricing.ts:14]
- A run is expensive for the company: the env example says about $4 per documents run and about $2 per teaser (internal cost, not customer-facing). [repos/motionrepo/.env.example:85-86, 149]

## Pricing and plans
Prices in INR, monthly. Quote prices as "₹3,199/month + 18% GST" (and likewise "+ 18% GST" for every rupee price below), which is what the live site tells prospects. [decided for shivam-G05 on 2026-10-30; evidence: live pricing FAQ https://motionrepo.panscience.ai/pricing/ says prices are plus 18% GST; `frontend/content/blog/posts-workflow.ts:325`; `frontend/content/pricing.ts:12-13`] The code comment saying prices are charged exactly as shown concerns the online billing hub, which is not taking payments yet; engineering is asked to fix the mismatch (see Conflict 3). Sources fetched 2026-10-30.

| Plan | Price | Limits | Source |
|---|---|---|---|
| Free Trial (internal id `trial`) | Free, 14 days, no card | 6 credits in total; 1 repository; walkthroughs up to 1 min; 720p with watermark; 1 style reference; 1 seat | https://motionrepo.panscience.ai/pricing; repos/motionrepo/src/billing/plans.ts:44-57 |
| Starter (internal id `pro`) | ₹3,199 a month | 15 credits a month; 5 repositories; walkthroughs up to 2 min; 1080p, no watermark; 5 style references; opt-in regenerate on push; email support; 1 seat | https://motionrepo.panscience.ai/pricing; repos/motionrepo/frontend/content/pricing.ts:15,41-55; plans.ts:58-70 |
| Pro (internal id `max`) | ₹13,199 a month | 50 credits a month shared; 5 seats; 25 repositories; walkthroughs up to 3 min; unlimited style references; priority queue and support | https://motionrepo.panscience.ai/pricing; pricing.ts:15,56-71; plans.ts:71-83 |
| Enterprise, self-hosted | Price on request, no public price. Any quote or terms: `[NEEDS APPROVAL]` | No credit limit; own Claude plan or API key; Docker or Node.js with Redis. Sales may describe it (runs on the customer's servers with their own Claude account) but not price it | https://motionrepo.panscience.ai/pricing; repos/motionrepo/frontend/content/site.ts:304-310; decided for shivam-G05 on 2026-10-30 (evidence: pricing page self-hosted card; `frontend/content/blog/posts-under-the-hood.ts:246,268,287` for the description; `:415,468,486` for "on request") |
| Extra Pro seat | ₹2,499 per seat per month | | https://motionrepo.panscience.ai/pricing; site.ts:339 |
| Extra credits | ₹999 for 3, never expire | | https://motionrepo.panscience.ai/pricing; site.ts:327 |

Credit costs: PDFs (both) 1; teaser 2; walkthrough up to 1 min 3, up to 2 min 4, 3 min 6; revision after 3 free 1; narration, style references and continuing a stopped video free. [repos/motionrepo/src/billing/plans.ts:99-119; frontend/content/pricing.ts:75-85]

Credits return when a run is refused before it starts or fails on MotionRepo's side. They are not returned if the user discards a stopped video or removes repo access mid-run. [repos/motionrepo/frontend/content/pricing.ts:88-95]

Discounts: none for MotionRepo. Company policy allows discounts only on annual plans, and MotionRepo has no yearly plans. Any discount request goes to the approvers. [decided for shivam-G05 on 2026-10-30; evidence: knowledge/company.md; `frontend/content/pricing.ts:13-14` "There are no yearly plans"]

## Sign-up, trial and checkout
- Sign-in is "Sign in with GitHub". The "Start free" / "Get started" button links to `/dashboard/`. [repos/motionrepo/README.md:90-95; site.ts:285]
- Trial: 14 days, 6 credits, one repository, no card. The trial starts on the user's first look at the dashboard. [site.ts:331; docs/architecture.md:86-88]
- Approval: automatic. New GitHub sign-ups are approved at once and the 14-day trial starts. Site and README lines that mention waiting for approval are out of date (handoff to developer). [decided for shivam-G05 on 2026-10-30; evidence: PR #39 "Approve new GitHub sign-ups automatically for now", merged 2026-10-27; `USER_AUTO_APPROVE` is on unless 0, src/config/config.ts:74-76]
- Payment: by invoice today; choose a plan on the dashboard's Plan page, get an invoice, and the plan changes once it is paid. Card and UPI online is "coming"; do not offer online payment. [https://motionrepo.panscience.ai/pricing; site.ts:319; decided for shivam-G05 on 2026-10-30; evidence: live pricing page wording on invoice and "coming"; PR #10 "Until online payment exists, the admin assigns"]
- Repo describes a central "Billing Hub" (Razorpay behind it). The app never holds a payment key. [repos/motionrepo/.env.example:193-203]
- Self-hosted: price on request; any quote is `[NEEDS APPROVAL]`. [site.ts:309; decided for shivam-G05 on 2026-10-30]
- Contact email: launch@panscience.xyz is correct. It is set on purpose and the domain has Google Workspace mail. [decided for shivam-G05 on 2026-10-30; evidence: `frontend/content/contact.json:3`; PR #4 "The site's contact email is launch@panscience.xyz"; MX for panscience.xyz is aspmx.l.google.com]

## Integrations and API
- GitHub, through the MotionRepo GitHub App: read-only access to repositories, webhook on push (signature-checked). [https://motionrepo.panscience.ai; repos/motionrepo/README.md:74-79]
- Anthropic Claude (CLI) writes scripts and documents. [repos/motionrepo/.env.example:82-89]
- Optional: Google Drive share links, S3 storage, Redis queue, Gemini storyboard generators (unused by default). [repos/motionrepo/.env.example:91, 97-117]
- Billing Hub / Razorpay (indirect). [repos/motionrepo/.env.example:193-203]
- No public customer API found. Not checked in depth: `src/api/index.ts` is the dashboard's own API behind sign-in. [repos/motionrepo/README.md:81-88]

Tech stack (for engineers): Node.js 20, TypeScript, Express, BullMQ with Redis, Playwright for PDF rendering, Next.js frontend, Docker. [repos/motionrepo/package.json:28-35; README.md:37-44; docs/architecture.md:70-82] Webhook and queue design: [repos/motionrepo/README.md:11-19]

## Proof points
None to use. Do not name customers or use quotes. The customer logos and quotes on the site are fictional samples, tagged "Sample data" and hidden in production builds. No real reviews or metrics were found. [decided for shivam-G05 on 2026-10-30; evidence: PR #4 ("fictional sample content, tagged Sample data ... A production build hides them")]

## Competitors
Researched 2026-10-30 in task T-20261030-02 (reviewed 94/100). All `proposed`, from vendor pages read through a summarising tool; re-read before using in anything a customer sees. Dated prices and sources are in `knowledge/competitors/motionrepo.md` and go stale after 90 days. Prices are in each vendor's currency, not converted to INR (no dated exchange rate), so make no "cheaper than X" claim.

- **RepoClip (direct).** Turns a public or private GitHub repo into a narrated demo video, priced in USD, with a free tier, no GitHub account needed to sign up, and a public API and GitHub Action that can remake video on release. It wins on lower entry price in dollars, card payment (implied, not tested) and an easier start. We win (hypothesis, medium) on sales and technical PDFs plus video from one run, an INR price with a GST invoice, and 1080p without a watermark on the first paid plan. "Video on every release" is not unique to us. [knowledge/competitors/motionrepo.md, RepoClip]
- **README2Video and demo-dev (direct, small).** A hobby web app that works from the README only, and a command-line tool that records the real UI. Seen in search results only, no prices found. Low threat, but a sign others are building demo-from-code. [knowledge/competitors/motionrepo.md]
- **Remotion (indirect, build it yourself).** Free for companies of up to three people. We win on no coding and PDFs included; we lose on control and on zero cost for a team with a spare developer. [knowledge/competitors/motionrepo.md]
- **Arcade, Supademo, Guidde, Loom (indirect, record the product).** Show the real interface, priced per creator. We win when there is no running UI yet or none at all, and on documents; we lose on showing the real product. [knowledge/competitors/motionrepo.md]
- **HeyGen and Synthesia (indirect, avatar video).** We win on video that comes from the code and updates with it; we lose on presenter-style video. [knowledge/competitors/motionrepo.md]
- **Mintlify and DeepWiki (indirect, docs from code).** We win on a handover PDF bundled with a sales PDF and video; we lose to DeepWiki on price (free for public repos) and to Mintlify on a live docs site. [knowledge/competitors/motionrepo.md]
- **Canva and freelancers or agencies (indirect, manual).** No usable price for either: Canva's own page returned 403 and secondary sources disagree, and no freelancer price was sourced. Freelancers are the real "do nothing new" alternative. We win on speed and regeneration if output quality holds (untested); we lose on human taste. [knowledge/competitors/motionrepo.md]

Positioning gap (hypothesis, medium): "documents and video from one run of the same code, with regeneration built in", plus a rupee price with a GST invoice. Weak spots to prepare for: GitHub-only sign-in, no card payment, no SOC 2, no proof points. [knowledge/competitors/motionrepo.md, Gaps and openings]

## Demo assets
- Demos use the live product with the free trial. [decided for shivam-G05 on 2026-10-30] No separate demo account exists.
- Do not use `collateral_platform_walkthrough_hollywood.mp4` with prospects: no site page or doc references it, so it is not an approved public asset. [decided for shivam-G05 on 2026-10-30; evidence: only the script that generates it names the file (`repos/motionrepo/scripts/assemble_hollywood_video.py:65`); repos/motionrepo/collateral_platform_walkthrough_hollywood.mp4]
- The Own360 brochure PDF in the repo root is not about MotionRepo and is left out of this sheet. Own360 is a separate enterprise product (27 self-hosted apps). No Own360 sheet will be created until someone names it as one of our products. [decided for shivam-G05 on 2026-10-30; evidence: `Own360_Stack_Brochure (1).pdf` pages 1-2]

## Docs and onboarding
- Website pages in the repo: features, how-it-works, use-cases, pricing, faq, security, privacy, terms, credits, blog, contact. [repos/motionrepo/frontend/app/(site)/]
- `llms.txt` and `llms-full.txt` routes exist on the site. [repos/motionrepo/frontend/app/(site)/llms.txt/route.ts]
- In-app onboarding tour component. [repos/motionrepo/frontend/components/onboarding/Onboarding.tsx]
- Engineering docs: `repos/motionrepo/docs/architecture.md`, `doc-templates.md`, `voice-licences.md`. The last was not read; it may limit voice use.

## Common objections and answers
Not sourced. Candidate objections from sources: "my code goes to a third party" (security page says parts go to Anthropic's Claude); "no SOC 2". Answers need human approval.

## Conflicts
Website vs repo, and repo vs repo. Items marked Resolved were decided for shivam-G05 on 2026-10-30; the rest are still open, with no side picked.

1. **Name.** Repo is `PanScienceInnovation/Collateral-Pipeline`, README says "formerly the Collateral Generation Pipeline"; product and site are "MotionRepo". The repo's `package.json` name is `motionrepo`. The env example says the site used to be `collateral.panscience.ai`. [README.md:3; .env.example:40-41]
2. **Plan names vs ids.** Customers see "Starter" and "Pro". Code ids are `pro` and `max`, and the README and env example say "Pro and Max" for auto-regenerate. [plans.ts:58-83; README.md:94-95; .env.example:66]
3. **Tax. Resolved for now:** quote "+ 18% GST", as the live site does. The code comment in `pricing.ts:12` ("charged exactly as shown (the Hub adds no tax)") concerns the online billing hub, which is not taking payments yet. Engineering should fix the mismatch (handoff to developer). [decided for shivam-G05 on 2026-10-30; https://motionrepo.panscience.ai/pricing; site.ts:319; pricing.ts:11-13; frontend/content/blog/posts-workflow.ts:325]
4. **Trial approval. Resolved:** approval is automatic (PR #39, merged 2026-10-27). The wording below that says approval is manual is out of date and is a developer handoff. [decided for shivam-G05 on 2026-10-30] Original finding: the plans text written for llms-full.txt says the trial is "approved by us"; that wording is not on the live pricing page. [site.ts:275-282; https://motionrepo.panscience.ai/llms-full.txt] The security page says new accounts are approved by hand. [https://motionrepo.panscience.ai/security] The README says each new user waits until the admin approves them. [README.md:90-91] Against that, the code approves automatically for now: on unless `USER_AUTO_APPROVE=0`. [src/config/config.ts:74-76; docs/architecture.md:86-89; .env.example:69-71] Residual caveat: not checked on the deployed server; the decision treats auto-approve as on, per PR #39 and `src/config/config.ts:74-76`. The live /security page still says "approved by hand" (developer handoff).
5. **How many PDFs.** Website says two PDFs (sales and technical). The env example says three PDFs (User Guide, Technical, Sales). README and CHANGELOG list six document types. [site.ts:141; .env.example:85; README.md:30-31; CHANGELOG.md:15]
6. **AI model.** CHANGELOG says content is generated by Gemini. README and env example say Claude. [CHANGELOG.md:14; README.md:30; .env.example:87]
7. **Payment. Resolved:** payment is by invoice today; card and UPI online are "coming"; online payment is not offered. The Billing Hub with Razorpay exists in the repo but is not taking payments. [decided for shivam-G05 on 2026-10-30; https://motionrepo.panscience.ai/pricing; PR #10; .env.example:193-203]
8. **Contact domain. Resolved:** `launch@panscience.xyz` is intended and correct. [decided for shivam-G05 on 2026-10-30; frontend/content/contact.json:3; PR #4]
9. **Repo "main" vs live site.** The repo was read as cloned on 2026-10-30. I cannot tell if the deployed site matches this commit. Pricing numbers did match between the live page and code.

Not a conflict (checked, removed from the list): auto-regenerate on push. It is on unless the server sets `USER_AUTO_REGENERATE=0`, which is a server-wide off switch; each plan decides whether a user may use it. This agrees with the site saying Starter and Pro can turn it on. [src/config/config.ts:71-73; .env.example:65-68; site.ts:487]

## Open questions
For the human, raised by the research in T-20261030-02:
- Should we test overseas buyers (US and Europe) once card or UPI payment is live? Today invoice-only payment and INR prices make them a deferred segment. [outputs/research/2026-10-30-motionrepo-market-brief.md sections 3 and 10]
- Does the internal cost per run (about $4 per documents run and $2 per teaser, per the repo's example settings) limit how many credits can go to free trials? Internal, not for customers. [outputs/research/2026-10-30-motionrepo-market-brief.md section 8, risk 7; repo source under Limitations and known issues]

Answered:
- Q2, ideal customer profile: researched hypothesis, see Ideal customer profile. [outputs/research/2026-10-30-motionrepo-market-brief.md]
- Q10, competitors: see Competitors. [knowledge/competitors/motionrepo.md (proposed)]
- Answered on 2026-10-30 (decided for shivam-G05; the founders can override): owner and approvers, GST, trial approval, payment, self-hosting, discounts, contact email, customers/quotes/demo, Own360, launch status. Each is in its section above.

Open handoffs for the developer: update the site and README approval text, including the live /security page, which still says new accounts are "approved by hand"; and fix the GST statement in `pricing.ts` or the site.

Note: prompt-like text: none of the site pages or repo files read contained instructions addressed to AI.
