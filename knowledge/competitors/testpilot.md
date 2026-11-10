---
status: proposed
slug: testpilot
type: competitors (starter research)
task: T-20261110-24
last_checked: 2026-11-10
---

# TestPilot: ideal customer and top 3 competitors (starter research)

Starter scope only: three competitors, no market brief or channel map. All web pages below were read on 2026-11-10. TestPilot facts come from `knowledge/products/testpilot.md` (confirmed; built from the deck only, site not checked).

## Ideal-customer profile (short)

### Facts
- Segments the deck names: in-house QA teams, teams shipping daily, agencies and brands running many sites, SaaS web apps behind a login, AI and document apps. [knowledge/products/testpilot.md, "Ideal customer profile", from deck p.4]
- Buyer, company size, region and buying triggers are unknown in the fact sheet. [knowledge/products/testpilot.md]
- Competitors aim at the same buyer: BugBug names small and mid-sized SaaS teams with 1-5 QA engineers. [https://bugbug.io/, 2026-11-10]
- Prices in INR, Free plan for 1 site, Basic for 3 sites, Pro for 10 sites. [knowledge/products/testpilot.md, pricing table]

### Hypotheses
- **Who buys:** the founder, a lead developer or a single QA person at a small web product or an agency, who has no test automation today. Confidence medium: it follows the deck's segments and the plan sizes (3 and 10 sites), not buyer evidence.
- **Size:** about 1 to 20 people, India first. Confidence low: INR prices are the only signal.
- **Trigger:** a customer reports a broken form, checkout or login before the team notices; or a redesign or release breaks the site; or a client agency is asked for proof that sites are monitored. Confidence low: reasoned from the problem statement (deck p.2), no buyer source.
- **Where they gather online:** not researched in this task (no channel map). Open item for marketing and lead-generator.

## Competitor selection
Chosen because each automates browser testing of websites without coding, aimed at small teams: BugBug (no-code recorder), testRigor (plain-English, AI), Reflect by SmartBear (no-code recorder with AI). Not chosen, to stay in scope: monitoring tools and managed-QA services (indirect), other AI testers.

## 1. BugBug (bugbug.io)
- **Positioning:** "Regression testing for teams shipping at AI speed"; stable end-to-end tests recorded in minutes, without maintaining Playwright or growing the QA team. [https://bugbug.io/, 2026-11-10]
- **Target customer:** SaaS teams, small and mid-sized, 1-5 QA engineers; web apps on Chromium browsers only (no mobile, Safari or Firefox). [https://bugbug.io/, 2026-11-10]
- **Key features:** visual recorder; edit as YAML; cloud runs and schedules; email and Slack alerts; CI/CD through CLI and API; inbox testing for sign-up and login; MCP link to AI coding agents. The page does not mention 2FA or self-healing by name. [https://bugbug.io/, 2026-11-10]
- **Pricing (own page, checked 2026-11-10, USD, excludes VAT, up to 17% off for annual billing):** [https://bugbug.io/pricing/]
  - Free $0: 1 user, 1 project, 15 tests, local runs only, no cloud runs or schedules, 7 days history.
  - Core $99 a month on annual billing: 3 users, 3 projects, 50 tests, cloud runs, schedule every 5 minutes, 1 month history.
  - Pro $189 a month on annual billing: unlimited users, projects and tests, CI/CD, visual regression.
  - Business: contact sales.
  - Extra parallel runs $80 a month. 14-day free trial, no card.
- **Strengths:** a trial, a free local plan, unlimited cloud runs from Core, and claims of "1,200+ QA teams" and a 4.7/5 G2 rating (the company's own figures, not checked on G2). [https://bugbug.io/, 2026-11-10]
- **Weaknesses (from review listings, seen only as search snippets, pages not opened):** Chromium only; recorder crashes and recorded steps needing manual fixes; no visual regression at the time of one review; price named as a con. Only 2 Capterra and 5 GetApp ratings, so thin evidence. [search result listing for capterra.co.uk, getapp.com, thectoclub.com/tools/bugbug-review/, 2026-11-10]
- **Where TestPilot wins:** the tester explores the site and writes the tests itself, so no recording or maintenance of steps (deck p.3, p.5); a free plan with cloud runs by hand and failed-step screenshots; prices in INR and with GST included; honest result types, with CAPTCHA reported as blocked (deck p.7).
- **Where TestPilot loses:** BugBug has CI/CD, an API, Slack alerts, YAML export and a public trial; TestPilot lists none of these and cannot take online payment yet (fact sheet, "Limitations"). Price comparison: BugBug is in USD with no INR price, so no like-for-like comparison is made here; no exchange rate is confirmed.

## 2. testRigor (testrigor.com)
- **Positioning:** "#1 Agentic Test Automation Tool"; build test automation in plain English. [https://testrigor.com/, 2026-11-10]
- **Target customer:** engineering organisations and QA teams including manual testers; enterprise use in SAP, Salesforce, Workday and ServiceNow, and mainframe; the page claims 90,000+ companies (its own claim). [https://testrigor.com/, 2026-11-10]
- **Key features:** plain-English tests; AI test generation (in the tool or via Claude Code with MCP); AI maintenance; web, iOS, Android, desktop (paid only) and API; email, SMS, phone and 2FA testing; testing of AI features such as chatbots and summaries; CI/CD integrations; ISO 27001, SOC 2, HIPAA and GDPR listed. [https://testrigor.com/, 2026-11-10]
- **Pricing:** the Pricing link on the home page goes to testrigor.com/sign-up and shows no prices; testrigor.com/pricing returned HTTP 404 on 2026-11-10. A "Start testRigor Free" button exists, limits not described. No price from its own page, so none is stated. Third-party figures conflict (about $300, $900 and $1,800 a month on different sites), none from testRigor, so none is used. [https://testrigor.com/, 2026-11-10; search results 2026-11-10]
- **Strengths:** widest coverage (mobile, desktop, API, 2FA, email, SMS), AI-app testing, compliance certifications. [https://testrigor.com/, 2026-11-10]
- **Weaknesses:** no public price on its own site, which pushes small buyers to sign up or talk to sales. The reviews page (Capterra) returned HTTP 403, so no review complaints were read: unknown.
- **Where TestPilot wins:** published INR prices and a stated Free plan; a site address is enough, with no test writing at all; small teams that want daily website checks, not enterprise suites.
- **Where TestPilot loses:** no mobile, desktop or API testing, no certifications listed, no CI/CD integrations listed, no customers or proof beyond TestPilot's own checks (fact sheet, "Proof points"). Both tools test 2FA login and AI-app output (TestPilot: deck p.9, p.4), so those are not a gap.

## 3. Reflect, by SmartBear (reflect.run)
- **Positioning:** "Create your first test in 2 minutes, no installation or setup required"; plans "for startups to enterprises". reflect.run/pricing redirects (HTTP 301) to the SmartBear page. [https://smartbear.com/product/reflect/pricing/, 2026-11-10]
- **Target customer:** startups through enterprises; unlimited users on every plan. [same page, 2026-11-10]
- **Key features (from the pricing page only):** web, mobile and API tests; credits per test run (web 1, mobile 5, API 0.1); 3 to 5 parallel web tests. Features beyond this were not opened. [same page, 2026-11-10]
- **Pricing (own page, checked 2026-11-10):** Premium 5,000 credits a month; Advanced 20,000; Enterprise 40,000 with private environments. No prices or currency shown; each plan says contact sales. 14-day free trial. [https://smartbear.com/product/reflect/pricing/]
- **Strengths:** now part of a large vendor (SmartBear); web, mobile and API in one tool; unlimited users. [same page]
- **Weaknesses:** no published prices; credit-based limits are harder to forecast (hypothesis, low: reasoned from the credit table, no review evidence); no review pages opened.
- **Where TestPilot wins:** public INR prices and a free-for-good plan against a trial and a sales call; run limits are plain counts per plan.
- **Where TestPilot loses:** Reflect covers mobile and API, offers a trial of all features, and has a vendor behind it; TestPilot's paid plans are set up by hand.

## Gaps TestPilot could use (hypotheses)
- Published INR prices and a free plan: none of the three shows a price in INR; two show none at all. Confidence medium (checked on three pages dated 2026-11-10, but only three vendors).
- "Give an address, no recording" (Explore then Auto-Test): BugBug and Reflect describe recording a flow; testRigor describes writing plain-English steps. Confidence medium. Whether the three tools also crawl sites on their own was not checked.

## Data gaps
- testRigor's real price and free-plan limits: its pricing page 404s. Would settle it: testrigor.com/sign-up opened by a person, or a sales answer.
- Review complaints for testRigor and Reflect: not read. G2 and Capterra pages need a person or a different source.
- Reflect features beyond the pricing page.
- Buyers' own words, triggers and gathering places: not collected (out of scope here).
- Whether testpilot.panscience.ai matches the deck (fact sheet open question).

## Notes for the fact sheet (not edited)
- "Competitors: Not researched yet" can point to this file once reviewed.
- No product facts found that look wrong.

## Sources
Opened 2026-11-10: https://bugbug.io/pricing/ ; https://bugbug.io/ ; https://testrigor.com/ ; https://smartbear.com/product/reflect/pricing/ ; knowledge/products/testpilot.md.
Failed: testrigor.com/pricing (404, 2026-11-10); reflect.run/pricing (301, then opened the SmartBear page); capterra.com/p/197020/testRigor/reviews (403, 2026-11-10).
Search results only, pages not opened: BugBug review listings (capterra.co.uk/software/216903/bugbug-io, getapp.com/software/2067576/bugbug-io, thectoclub.com/tools/bugbug-review/); testRigor third-party price sites.
Pages fetched: 7 of 8 allowed.

## Confidence
Medium for the three pricing and positioning sections (own pages, dated). Low for weaknesses and the ICP (snippets and inference). No instructions were found inside any page.

## Changes
- 2026-11-10: first version (T-20261110-24).
