# MotionRepo market brief (T-20261030-02, answers fact-sheet Q2)

Date: 2026-10-30. Author: researcher. Product facts come from `knowledge/products/motionrepo.md` (status: proposed, so every product fact here is [UNCONFIRMED]) and `outputs/research/2026-10-30-motionrepo-open-questions.md` (decided for shivam-G05 on 2026-10-30; founders can override). Every web source below was opened on 2026-10-30 unless stated.

## 1. Answer in brief

- The working assumption ("Indian software teams on GitHub") is right on region and wrong on scope. It is too broad to sell to. GitHub counts about 21.9 million developers in India, with 5.2 million added in 2025 [https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/]. That counts developers, not buyers. Most of them are employees with no launch to publicise and no budget.
- Recommended first segment: **launch-active, founder-led Indian software product startups** (about 2 to 20 people, public or private GitHub repos, a launch or major release in the next 60 days). Region: **India**, starting with the cities that host the community events in the channel map (Bengaluru, Hyderabad, Pune, NCR, Chennai).
- Sell to these three first, in order: (1) founder-led Indian product startups, (2) Indian dev-tool and AI-API companies with frequent releases, (3) Indian product-engineering studios and agencies that ship launches for clients.
- Why India first: the product is priced in INR, billed by invoice with 18% GST added, and it has no card or UPI checkout [UNCONFIRMED; open-questions Q3 and Q5; https://motionrepo.panscience.ai/pricing]. Those three facts suit an Indian company that wants a GST invoice and are friction for almost anyone else. A competitor bills in USD, and Indian cards often decline USD recurring charges (section 5).

## 2. Facts that bound the choice

Product limits that shape fit (all [UNCONFIRMED], from the fact sheet and the live pricing page):
- Starter ₹3,199 a month, Pro ₹13,199 a month, both plus 18% GST; payment by invoice for now; 14-day free trial with 6 credits and no card [https://motionrepo.panscience.ai/pricing, read 2026-10-30].
- GitHub sign-in only [fact sheet, citing repos/motionrepo/README.md:90].
- No SOC 2, ISO 27001, SSO or two-factor sign-in, and parts of the code go to Anthropic's Claude [https://motionrepo.panscience.ai/security, per fact sheet].
- The site names six use cases: product launches, release notes, sales PDFs, developer relations, agencies, and investor or board updates [https://motionrepo.panscience.ai/use-cases].
- No customers, quotes or demo account to use (open-questions Q9). Call to action is "start free trial" or "reply", never "book a call" (Q12).

Market facts:
- India had about 21.9 million developers on GitHub in 2025, second only to the US, and GitHub projects 57.5 million by 2030 [GitHub Octoverse, URL above].
- Nasscom-Zinnov estimates roughly 31,000 to 34,000 start-ups in its 2026 report press release, though the sentence is about venture formation so the scope is not exact. It also counts over 4,200 DeepTech start-ups, with 550+ founded in 2025 [https://zinnov.com/press-releases/indias-tech-start-ups-at-a-strategic-inflection-point-as-funding-rises-to-9-1-bn-nasscom-zinnov-tech-start-up-report-2026/]. These are the upper bounds for reachable companies, not leads.
- AIBoomi (formerly SaaSBoomi) says it has 6,500 community members [https://aiboomi.org]. The SaaSBoomi page says 4,000+ startups and 6,000+ founders (older figure) [https://saasboomi.org].
- Launch-video pain in the buyer's own words is thin and anecdotal. One founder posted that a landing-page video would have cost "yet another day" of editing and recorded about 30 takes [https://dev.to/twankrui/from-building-to-selling-ep15-1cg2]. Another listed "No video demo" as a flaw of a failed first Product Hunt launch [https://hackernoon.com/lite/i-turned-a-failed-product-hunt-launch-into-a-top-3-win-on-a-budget]. Reddit threads could not be read (the fetch tool is blocked there), so I have no direct Reddit quotes.
- A direct competitor exists: RepoClip turns a GitHub repo into a narrated demo video, with USD plans from $24 a month [https://repoclip.io; https://repoclip.io/pricing]. Details are in `knowledge/competitors/motionrepo.md`.
- Product Hunt does not allow company accounts and bans asking for upvotes [https://www.producthunt.com/launch]. Show HN does not accept landing pages or sign-up pages and wants products people can try without sign-up [https://news.ycombinator.com/showhn.html]. That affects how a launch-active startup gets attention, and how we reach them.

## 3. Segments ranked

Scoring is my judgment on a 1 to 5 scale (5 = best) and is a hypothesis, not a measurement. Confidence: medium for ranks 1 to 3 (fit-with-limits scores rest on sourced product facts), low for the Pain and Budget scores (inferred from anecdotes, no price test). The evidence column holds the facts behind it.

| Rank | Segment | Pain | Budget | Reachability | Fit with limits | Evidence and notes |
|---|---|---|---|---|---|---|
| 1 | Founder-led Indian product startups, 2 to 20 people, launch or release within 60 days | 4 | 3 | 5 | 5 | Launch assets are a visible gap in launch posts (DEV and Hackernoon links above). India has launch venues and communities built for them: Peerlist Launchpad opens a new launch window every Monday [https://help.peerlist.io/individual/launchpad], AIBoomi Demo Rooms in Hyderabad (13 Nov 2026) and Noida (14 Nov 2026) [https://aiboomi.org]. INR price, GST invoice and invoice payment all suit them. Budget is the open question: ₹3,199 a month is a founder's discretionary spend, not a procurement item. Starter fits (1 seat, 5 repos). |
| 2 | Indian dev-tool, API and AI-product companies that ship often (devrel, release notes) | 4 | 4 | 3 | 3 | The site's use cases name developer relations and release notes [https://motionrepo.panscience.ai/use-cases]. Regenerate-on-push suits fast release cadence. Risks: their customers may ask about SOC 2, and they are better placed than most to build videos in-house with a tool like Remotion (free for companies of up to three people) [https://www.remotion.pro/license]. |
| 3 | Indian product-engineering studios and agencies delivering launches for clients | 3 | 4 | 3 | 3 | The site names agencies and a "full launch kit" [use-cases URL]. Pro (5 seats, 25 repos) is built for them. Risk: client code is sent to Anthropic's Claude, and clients may refuse that. The Pro price is more than four times Starter, so the sale is bigger. |
| 4 | Global indie hackers and solo makers paying in USD | 4 | 2 | 4 | 1 | Large, vocal, and already served by RepoClip's USD tiers [https://repoclip.io/pricing]. MotionRepo has no card checkout and an INR price list with GST, so this segment cannot buy easily today. Revisit when card or UPI payment is live (open-questions Q5, "coming"). |
| 5 | Open-source maintainers (India is a large open-source hub; the Octoverse says India overtook the US as the largest contributor base to public and open source projects [https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/], opened 2026-10-30) | 3 | 1 | 5 | 3 | Good for awareness and showcase content, poor for revenue. Remotion is free for small teams [https://www.remotion.pro/license], and RepoClip has a free tier for public repos [https://repoclip.io/pricing]. |
| 6 | Students and hackathon teams | 2 | 1 | 4 | 3 | FOSS Hack and campus clubs exist [https://fossunited.org] but budget is near zero. Use for trial volume only. |
| 7 | Overseas dev-tool companies (US and Europe) | 4 | 5 | 2 | 1 | Highest budgets, but invoice-only payment, INR prices and GST are friction. Defer until payment and USD pricing are decided. |
| 8 | Funded product companies with their own marketing and design staff | 2 | 4 | 2 | 2 | They already own the work and may ask for SOC 2 or SSO, which MotionRepo lacks [security page, per fact sheet]. Treat as disqualified for now. |
| 9 | Enterprises and regulated industries | n/a | n/a | n/a | 0 | Disqualified: no SOC 2, ISO 27001 or SSO, and code goes to a third-party model [security page, per fact sheet]. |

## 4. First three segments to sell to, and why

1. **Founder-led Indian product startups.** They decide alone, can start a trial the same day, and feel launch-day pressure. The rupee price and GST invoice remove the friction a USD competitor has. Message angle (hypothesis, confidence low to medium; untested with buyers, see H1 and H6): "Your repo already knows what you shipped. Get the launch teaser and the sales PDF from it, not from a weekend of editing." Offer: free trial, 6 credits, which covers a teaser (2) plus both PDFs (1) plus a one-minute walkthrough (3), exactly 6 [credit costs from the fact sheet; https://motionrepo.panscience.ai/pricing].
2. **Indian dev-tool and AI-API companies.** Higher budget, a repeat need (every release), and a combination the recording tools lack: documents and video from one run, with regeneration on push built into the product (opt-in on Starter and Pro). RepoClip can also remake video on release through its GitHub Action, so do not sell regeneration alone (H3). Use Starter first and upsell to Pro for 5 seats.
3. **Indian product studios and agencies.** Larger order value and many launches a year. Send only to those who work on their own or non-confidential repos until the data-handling answer is ready (open objection, no approved answer yet).

## 5. Buying triggers (observable, all hypotheses unless sourced)

- A Product Hunt, Peerlist Launchpad or Show HN launch being prepared or just posted (Peerlist opens a new window every Monday).
- A new GitHub release or a changelog entry in the last 30 to 90 days on a repo with active commits.
- A founder post asking for demo-video help.
- No product video on the product page or YouTube channel.
- A hiring post for a marketing or design role, which suggests the gap is felt now.
Confidence: low to medium. None of these were validated against actual buyers, and the fact sheet already lists the same signals as hypotheses.

## 6. Price anchors (checked 2026-10-30; full table in the competitor file)

| Anchor | Price | Source |
|---|---|---|
| MotionRepo Starter / Pro | ₹3,199 / ₹13,199 a month, plus 18% GST | https://motionrepo.panscience.ai/pricing |
| RepoClip Starter / Pro / Agency | $24 / $66 / $166 a month | https://repoclip.io/pricing |
| Arcade Pro | $59 a month ($49 on annual) | https://www.arcade.software/pricing |
| Supademo Scale | $50 per creator a month ($38 annual) | https://www.supademo.com/pricing |
| HeyGen Creator | $29 a month | https://www.heygen.com/pricing |
| Remotion Creators | $25 per seat a month; free for companies of up to three people | https://www.remotion.pro/license |
| Mintlify Pro | $450 a month on annual billing | https://mintlify.com/pricing |

I did not convert USD to INR because I have no sourced exchange rate for today. Do not claim "cheaper than X" until someone converts at a dated rate.

## 7. Hypotheses

| # | Hypothesis | Confidence | Reason |
|---|---|---|---|
| H1 | Launch-active founder-led Indian startups are the best first segment | medium | Fit with INR, invoice and GST is a fact; pain and willingness to pay are inferred from anecdotes, not measured |
| H2 | A USD price would hurt conversion with Indian buyers because recurring USD card charges can fail on Indian cards | medium | DataCamp's help page says Indian cards can decline recurring USD payments and moved new customers to INR billing from 26 May 2026 [https://support.datacamp.com/hc/en-us/articles/5765247890199-Payment-Issues-Related-to-the-Reserve-Bank-of-India]. One vendor's experience, not a market study |
| H3 | Documents plus video from one run, with regeneration built into the product, is the differentiator against RepoClip. Regeneration alone is not | medium | RepoClip's FAQ states a public API and an official GitHub Action that can make videos from CI/CD on every release [https://repoclip.io, opened 2026-10-30], so it can regenerate video too, with user setup. I found no document generation on its pages |
| H4 | Agencies will be blocked often by client data rules | low | No agency evidence gathered |
| H5 | Invoice-only payment will lose some trials at the pay step | medium | Competitors take cards; no MotionRepo conversion data exists |
| H6 | The buyer in segment 1 is the founder or the lead engineer | low | The fact sheet lists the buyer as a hypothesis |

## 8. Main risks

1. **No proof.** No customers, quotes, reviews or metrics may be used (open-questions Q9). Every message rests on the product alone. Mitigation: lead with the free trial.
2. **Payment friction.** Invoice-only payment and an unfinished launch checklist (no security email, no booking link) slow every sale (open-questions Q5, Q12).
3. **Trust and data.** Code is sent to Anthropic's Claude and there is no SOC 2 [security page, per fact sheet]. This removes segments 8 and 9 and may slow 2 and 3.
4. **Direct competition.** RepoClip does the same core job in USD and already has a free tier. MotionRepo's trial needs GitHub sign-in, while RepoClip says no GitHub account is needed to sign up [https://repoclip.io].
5. **DIY alternative.** Remotion is free for small teams [https://www.remotion.pro/license], and free tools like DeepWiki cover public-repo documentation [https://docs.devin.ai/work-with-devin/deepwiki].
6. **Evidence gaps.** I could not read G2, Capterra, GetApp, Reddit, Indie Hackers or Peerlist pages (403 or blocked), so buyer-language evidence is thin and comes from two blog posts.
7. **Unit cost.** The fact sheet says an internal cost of about $4 per documents run and $2 per teaser [UNCONFIRMED, internal]. At 15 Starter credits a month that cost could be close to the price. Ask the founders before pushing volume. This is internal, not for customers.

## 9. What I could not establish

- How many Indian startups meet the "launch-active, GitHub, no video" test. The lead-generator can size it.
- Whether buyers would pay ₹3,199 plus GST. No price test exists.
- Buyer language from Reddit, Indie Hackers and review sites.
- A current Canva price from Canva's own page (403).

## 10. Handoffs and questions

- `lead-generator`: build a first list of segment 1 (Peerlist Launchpad and Product Hunt India launches, AIBoomi demo-room cohorts, GitHub orgs with a release in 90 days and no product video). Tier by the fact sheet's signals. Exclude competitors (company policy: never contact competitors) and RepoClip.
- `marketing`: positioning gaps are "documents and video from one run of the same code, with regeneration built in" (not "regenerate on push" alone, since RepoClip has a GitHub Action), "rupee price with GST invoice", and "free 14-day trial". Do not claim cheaper than anyone until prices are converted at a dated rate.
- `knowledge-base`: record the competitors file as the answer to Q10 and cite this brief for Q2, as "researched 2026-10-30, hypothesis".
- Questions for the human: do you want to test overseas buyers after card/UPI is live? Is the internal cost per run a limit on how many credits can be given in trials?
