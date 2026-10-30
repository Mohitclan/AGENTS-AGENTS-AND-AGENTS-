---
status: confirmed
slug: motionrepo
owner: researcher
last_verified: 2026-10-30
sources:
  - https://repoclip.io/pricing
  - https://www.remotion.pro/license
  - https://www.supademo.com/pricing
  - https://www.arcade.software/pricing
  - https://www.heygen.com/pricing
  - https://mintlify.com/pricing
---

# MotionRepo: competitors

Task T-20261030-02, answers fact-sheet Q10. All prices were read from the vendor's own page on **2026-10-30** and are quoted in the vendor's currency. I did not convert to INR (no dated exchange rate). Re-check before quoting: prices older than 90 days are stale (`.claude/skills/fact-sourcing`). Our own product facts are [UNCONFIRMED] (from `knowledge/products/motionrepo.md`, proposed). Pages were read through a summarising fetch tool, so exact wording should be re-read before it is used in anything customer-facing.

MotionRepo reference (for comparison): Starter ₹3,199 a month (15 credits, 1 seat, 5 repos), Pro ₹13,199 a month (50 credits, 5 seats, 25 repos), both plus 18% GST, paid by invoice; 14-day free trial, 6 credits, no card [https://motionrepo.panscience.ai/pricing, 2026-10-30]. Not yet confirmed by a human.

## Summary table

| Competitor | Type | Entry paid price (checked 2026-10-30) | Source |
|---|---|---|---|
| RepoClip | Direct | $24 a month (Starter) | https://repoclip.io/pricing |
| README2Video | Direct (hobby) | not found | https://dev.to/fracabu/readme2video-transform-any-github-readme-into-a-professional-promo-video-1ihk |
| demo-dev | Direct (open tool, unverified) | not found | https://pi.dev/packages/demo-dev?page=15 |
| Remotion | Indirect (build it yourself) | Free up to 3 people; $25 per seat a month | https://www.remotion.pro/license |
| Arcade | Indirect (interactive demos) | $59 a month ($49 annual) | https://www.arcade.software/pricing |
| Supademo | Indirect (interactive demos) | $50 per creator a month ($38 annual) | https://www.supademo.com/pricing |
| Guidde | Indirect (how-to videos) | $29 per creator a month ($19 annual) | https://www.guidde.com/pricing |
| HeyGen | Indirect (avatar video) | $29 a month (Creator) | https://www.heygen.com/pricing |
| Synthesia | Indirect (avatar video) | $19 a month ($14 annual) | https://www.synthesia.io/pricing |
| Loom | Indirect (screen recording) | $18 per user a month | https://www.loom.com/pricing |
| Mintlify | Indirect (docs) | $450 a month annual; $540 monthly | https://mintlify.com/pricing |
| DeepWiki | Indirect (docs, free) | Free (low effort) | https://docs.devin.ai/work-with-devin/deepwiki |
| Canva | Indirect (manual design) | Not verified; Canva's page returned 403 | see entry |
| Freelancers or agencies | Indirect (outsourcing) | No price sourced | none |

## Direct competitors

### RepoClip
- **Positioning:** turns any public or private GitHub repository into a narrated product demo video [https://repoclip.io, 2026-10-30].
- **Target customer:** developers and open-source maintainers; use cases listed are feature announcements, investor pitches, social content and open-source promotion [https://repoclip.io].
- **Key features:** reads the code and README, writes a script, makes visuals, voiceover and music; its FAQ states "a Public API and an official GitHub Action" that can generate videos from a CI/CD pipeline, so a video can be remade on every release [https://repoclip.io (FAQ); API docs page opens at https://repoclip.io/docs/api; both opened 2026-10-30]. Aspect ratios (16:9, 9:16, 1:1) are unverified: they are not on repoclip.io, and the GetApp listing that mentioned them could not be opened. First video free, no card, no GitHub account needed to sign up [https://repoclip.io].
- **Pricing, checked 2026-10-30** [https://repoclip.io/pricing]: Free $0 (1 image video a month, 720p, watermark, public repos only); Starter $24 a month or $290 a year (50 credits, watermark, private repos); Pro $66 a month or $790 a year (200 credits, 1080p, no watermark, commercial licence); Agency $166 a month or $1,990 a year (800 credits, 4K). Packs: $5 for 40 credits. Video Short (about 25 seconds, 5 AI clips) costs 40 credits; Video Long (about 90 seconds) costs 300 credits and is Agency only. The page shows "$" with no currency code.
- **Strengths:** a lower entry price in dollars; no GitHub account needed to start; a public API and an official GitHub Action (confirmed on its FAQ); 4K on the top plan.
- **Weaknesses:** no reviews could be read (GetApp returned 403). From its own page: the cheapest paid plan carries a watermark, and long videos need the highest plan. A directory listing shows the product published 12 Mar 2026 with a self-reported $100 monthly recurring revenue (a young product) [https://peerpush.com/p/repoclip, opened 2026-10-30]. I found no sales or technical PDF on its pages (hypothesis, medium).
- **Where MotionRepo wins (hypothesis, medium):** sales and technical PDFs plus video from one run, with regeneration built into the product (RepoClip can also remake video on release, but through its API or GitHub Action that the user sets up in CI); INR price with a GST invoice for Indian buyers; 1080p without a watermark on its first paid plan [UNCONFIRMED].
- **Where MotionRepo loses:** RepoClip can be tried without a GitHub account; RepoClip takes online payment (implied by its pricing page; checkout not tested) while MotionRepo is invoice-only today; RepoClip has a public API and an official GitHub Action (confirmed, https://repoclip.io FAQ), so "video on every release" is not unique to us.

### README2Video
- **Positioning:** web app that turns a GitHub README into a promo video [https://dev.to/fracabu/readme2video-transform-any-github-readme-into-a-professional-promo-video-1ihk, seen in search results 2026-10-30; page not opened].
- **Pricing:** not found. **Reviews:** none found.
- **Win/lose:** it works from the README only, which is a thinner input than the code (hypothesis, low). It is a personal project as far as I can tell, so a low threat.

### demo-dev
- **Positioning:** command-line tool that drives a web app in a headless browser, records it, adds AI narration and can plan a demo from the git diff [https://pi.dev/packages/demo-dev?page=15, seen in search results; page not opened].
- **Pricing:** not found.
- **Win/lose:** it records the real UI, which MotionRepo's motion graphics do not (the filmed walkthrough is hidden behind a flag and must not be sold, per the fact sheet). It needs setup by a developer. Treat as a signal that "demo from git diff" is being built by others.

## Indirect competitors

### Remotion (build the video in code)
- **Positioning:** make videos with React code [https://www.remotion.pro/license]. Free for individuals and companies of up to three people.
- **Pricing, checked 2026-10-30** [https://www.remotion.pro/license]: Creators $25 per seat a month; Automators $0.01 per render with a $100 monthly minimum; Enterprise from $500 a month.
- **Strengths:** full control; free for small teams; works with AI agents (per its own page).
- **Weaknesses:** needs a developer's time and design taste; no document output.
- **MotionRepo wins:** no coding and no design skill needed, and PDFs too. **Loses:** control, and zero cost for a team of up to three who have a spare developer.

### Arcade, Supademo, Guidde, Loom (record the product, then edit)
- **Positioning:** capture real product clicks as interactive demos or how-to videos [https://www.arcade.software/pricing; https://www.supademo.com/pricing; https://www.guidde.com/pricing; https://www.loom.com/pricing].
- **Pricing, checked 2026-10-30:**
  - Arcade: Free ($0, 250 one-time credits, 30-second videos, watermark); Pro $59 a month or $49 annual (1,000 credits a month, up to 5 minutes, 4K, 10 seats).
  - Supademo: Free; Scale $50 per creator a month or $38 annual; Business $249 ($199 annual); Growth $450 ($350 annual).
  - Guidde: Free (25 how-to videos); Pro $29 per creator ($19 annual); Business $59 ($39 annual). The page contradicts itself on the Free limit (25 versus unlimited); the FAQ supports 25.
  - Loom: Starter $0 (25 videos); Business $18 per user; Business + AI $24 per user.
- **Strengths:** show the real interface; well known; free tiers.
- **Leads to verify (search summaries, pages not opened):** a search summary said Supademo's most-cited cons on G2 are missing features and recording issues [https://www.g2.com/compare/supademo-vs-testbox-vs-navattic, 2026-10-30; G2 returned 403, so unverified and not for battlecards]. Per-creator pricing is visible on every vendor page above.
- **MotionRepo wins (hypothesis, medium):** needs no recording and no running app, so it can make a teaser before the UI is finished or when the product has no UI (an API or library); sales and technical documents come with it. **Loses:** they show the real product, which is what many buyers want to see.

### HeyGen and Synthesia (presenter or avatar video)
- **Pricing, checked 2026-10-30:** HeyGen Free; Creator $29 a month ($24 annual per its FAQ; 600 credits); Pro $49; Business $149 plus $20 per seat [https://www.heygen.com/pricing]. Synthesia Basic $0; Starter $19 a month ($14 annual); Pro $89 ($59 annual) [https://www.synthesia.io/pricing].
- **Leads to verify (search summaries, pages not opened):** HeyGen reviewers on Trustpilot say credits run out fast and support is slow, per a search summary of Trustpilot, Capterra and Kimola [https://www.trustpilot.com/review/heygen.com?page=2; https://www.capterra.com/p/10015133/HeyGen/reviews/], seen 2026-10-30, pages not opened.
- **MotionRepo wins:** the video comes from the code, so it is accurate to the product and updates with it. **Loses:** presenter-style video with a human-looking speaker, which MotionRepo does not offer.

### Mintlify and DeepWiki (documents from code)
- **Mintlify:** Starter $0 (no AI features or credits); Pro $450 a month annual or $540 monthly; 14-day Pro trial [https://mintlify.com/pricing, 2026-10-30]. A hosted docs site, not a PDF or video.
- **DeepWiki:** free for public GitHub repositories at deepwiki.com; wiki depth above "low" needs a Devin subscription or credits [https://docs.devin.ai/work-with-devin/deepwiki, 2026-10-30].
- **MotionRepo wins:** the technical PDF is a handover document and comes with a sales PDF and video. **Loses:** DeepWiki costs nothing for public repos; Mintlify keeps a live docs site, not a file.

### Canva and hiring a freelancer or agency
- **Canva:** price not verified from Canva (page returned 403 on 2026-10-30). Secondary sources disagree: one summary lists ₹499 a month or ₹3,999 a year, another a May 2026 review lists ₹4,500 a year [search results, 2026-10-30, e.g. https://www.websitebuilderinsider.com/how-much-does-canva-pro-cost-in-india/; page not opened; the second source's link is dead and was removed]. Do not quote either figure.
- **Freelancers and agencies:** no price sourced. This is the real "do nothing new" alternative for a founder with a launch in a week; the lead-generator or a human should ask a few founders what they paid.
- **MotionRepo wins:** speed and regeneration on code change, if the output quality holds up (not yet tested by me). **Loses:** human taste and brand judgement.

## Gaps and openings (hypotheses; confidence in brackets)
1. No competitor page I read pairs launch video with sales and technical PDFs from one repository run. (medium; I read vendor pages only)
2. RepoClip and the recording tools price in USD. A rupee price with a GST invoice is a real difference for Indian companies. (medium)
3. Per-creator seat pricing on Arcade, Supademo and Guidde grows with the team. MotionRepo Pro covers five seats for one price. (medium)
4. "Documents plus video from one run, with regeneration built into the product" is the differentiator. "Video on every release" alone is not: RepoClip offers it via its GitHub Action. (medium)
5. Weak spots to prepare for: no GitHub-free sign-up, no card payment, no SOC 2, no shareable sample or customers.

## Not found
- Review-site content from G2, Capterra, GetApp and Reddit was blocked, so review-based weaknesses are thin.
- Prices for README2Video and demo-dev.
- A current Canva price from Canva.

## Changes
- 2026-10-30: file created (T-20261030-02) by researcher.
- 2026-10-30: revision 1 (T-20261030-02). RepoClip API and GitHub Action corrected to confirmed (its FAQ); aspect ratios marked unverified; PeerPush upgraded to opened; "Weaknesses (reviews)" renamed "Leads to verify"; removed dead prospeo and wiuwi links and the unsourced "9x cliff" remark; gap 4 narrowed.
