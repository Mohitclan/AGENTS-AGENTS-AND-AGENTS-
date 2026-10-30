# MotionRepo: answers to the fact sheet's open questions

Task T-20261030-01. On 2026-10-30, shivam-G05, who wrote and merged all 41 MotionRepo PRs, asked Claude to decide these from the GitHub repo and the live site. Cite each answer in the fact sheet as "decided for shivam-G05 on 2026-10-30" plus the evidence given. The founders can override any of them.

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | Owner and approvers | **Owner: shivam-G05** (engineering and product). Code merges for MotionRepo: shivam-G05. Discounts, content and outreach: the approvers in `knowledge/company.md` (founders until named). | All 41 PRs in PanScienceInnovation/Collateral-Pipeline were authored and merged by shivam-G05 (`gh pr list --state merged`) |
| 3 | GST | **Quote prices as "₹3,199/month + 18% GST"**, which is what the live site tells prospects. The code comment saying prices are charged exactly as shown is about the online billing hub, which isn't taking payments yet. Flag the mismatch for engineering. | Live pricing FAQ on https://motionrepo.panscience.ai/pricing/ says prices are plus 18% GST; `frontend/content/blog/posts-workflow.ts:325`; `frontend/content/pricing.ts:12-13` |
| 4 | Trial approval | **Automatic.** New GitHub sign-ups are approved at once and the 14-day trial starts. The site and README lines that mention waiting for approval are out of date: hand this to the developer. | PR #39 "Approve new GitHub sign-ups automatically for now", merged 2026-10-27 (`USER_AUTO_APPROVE`, on unless 0) |
| 5 | Payment | **By invoice today; the plan changes once it's paid. Card and UPI are "coming"**, as the live site says. Don't offer online payment. | Live pricing page: "invoice; your plan changes as soon as it is paid. Card and UPI payment online is coming"; PR #10: "Until online payment exists, the admin assigns" |
| 6 | Self-hosting | **No public price. "Price on request"**: any self-hosting quote or terms are `[NEEDS APPROVAL]`. Sales may describe it (runs on the customer's servers with their own Claude account) but not price it. | Pricing page self-hosted card; `frontend/content/blog/posts-under-the-hood.ts:246,268,287` |
| 7 | Discounts | **No discounts for MotionRepo.** Company policy allows them only on annual plans, and MotionRepo has none. Any discount request goes to the approvers. | `knowledge/company.md`; `frontend/content/pricing.ts:13` "There are no yearly plans" |
| 8 | Contact email | **launch@panscience.xyz is correct**: it's set on purpose, and the domain has Google Workspace mail. | `frontend/content/contact.json`; PR #4 "The site's contact email is launch@panscience.xyz"; MX for panscience.xyz is aspmx.l.google.com |
| 9 | Customers, quotes, demo | **None to use.** The site's customer logos and quotes are fictional samples, hidden in production. Don't name customers or use quotes. Don't use `collateral_platform_walkthrough_hollywood.mp4` with prospects: nothing on the site or in the docs references it, so it isn't an approved public asset. Demos use the live product with the free trial. | PR #4 ("fictional sample content, tagged Sample data ... A production build hides them"); grep for the file finds no references |
| 11 | Own360 | **A separate enterprise product (27 self-hosted apps), not part of MotionRepo.** Leave it out of the MotionRepo sheet and don't create an Own360 sheet until someone names it as one of our products. | `Own360_Stack_Brochure (1).pdf`, pages 1-2 |
| 12 | Launched? | **`stage: live`**: anyone can sign up and use it (dashboard live, sign-ups auto-approved). But the website's launch checklist isn't finished: there's no security email and no booking link. So outreach must **not** offer "book a call"; the call to action is "start the free trial" or "reply to this email". | `frontend/content/contact.json` (`securityEmail` and `bookingUrl` null); https://motionrepo.panscience.ai/.well-known/security.txt returns 404; `/dashboard/` returns 200 |

Still open, for the researcher (task T-20261030-02):

- **Q2, ideal customer profile and first segment:** rank segments for MotionRepo with evidence and recommend the first segment and region. The working assumption is Indian software teams on GitHub.
- **Q10, competitors:** direct and indirect competitors with their prices and where MotionRepo wins or loses.

Handoffs to record on the board as suggestions:

- developer: update the site and README approval text (Q4), and fix the GST statement in `pricing.ts` or the site (Q3).
