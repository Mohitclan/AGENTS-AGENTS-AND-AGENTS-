---
status: confirmed
slug: testpilot
name: TestPilot
website: https://testpilot.panscience.ai
repo: unknown
stage: live
owner: raj gupta
last_verified: 2026-11-05
sources:
  - knowledge/decks/testpilot.pdf (14 slides, dated October 2026, shared by the user in chat on 2026-11-05)
  - told by escandita@panscience.ai on 2026-11-05 (owner, contact email, GST)
---

# TestPilot

Every fact below needs a source in brackets: a URL, a repo path with line numbers, or "told by <person> on <date>".
Built on 2026-11-05 from the pitch deck only. The website was not opened, so nothing here has been checked against the live product. The deck is an internal draft in places: the cover still says "[Your name] · [Team]", add-on prices are blank and p.13 has open decisions.

## Owner and approvers
- **Owner:** raj gupta. [told by escandita@panscience.ai on 2026-11-05]
- **Customer contact:** testpilot.testing@gmail.com is the address to give customers. [told by escandita@panscience.ai on 2026-11-05; deck p.14]
- **Discounts, content and outreach approvers:** the approvers named in `knowledge/company.md` until the owner names others.

## One-liner
Automated end-to-end testing for websites: give it an address and it explores the site, writes simple tests, runs them in real Chrome every day and reports what is really broken. [knowledge/decks/testpilot.pdf p.1, p.3]

## Problem it solves
Websites break quietly (a contact form stops sending, a search returns nothing, a menu link leads to an error page) while the site still looks fine, so customers find it first. Checking by hand doesn't scale, and coded test scripts need a developer and break when the design changes. [p.2]

## Ideal customer profile
From the deck's "Who it's for" (p.4); not tested with buyers.
- **Segments:** in-house QA teams; teams shipping daily; agencies and brands that run many websites; SaaS products with web apps behind a login; AI and document apps (checks the summary or answer the product produces). [p.4]
- **Works on:** WordPress, Webflow, Wix, React, Next.js and hand-built sites. [p.4]
- **Buyer:** unknown
- **Company:** unknown size and region; INR prices suggest India first (hypothesis). [p.11]
- **Buying triggers:** unknown
- **Disqualifiers:** sites behind a CAPTCHA on the paths that matter, since TestPilot never bypasses one (hypothesis from p.7-8).

## Personas
Not established.

## Features

The deck calls it "A complete product, not a demo" (p.9) and "Live today" (p.13). Treat these as live until the site is checked.

| Feature | Status | What it does for the user | Source |
|---|---|---|---|
| Explore | live (deck) | Crawls every page, form, button, menu, list and search box, signed in if needed | knowledge/decks/testpilot.pdf p.3, p.5 |
| Auto-Test | live (deck) | Claude writes simple tests in plain words, one feature each, from what the crawl saw | p.3, p.5 |
| Run | live (deck) | Playwright drives real Chrome step by step with a screenshot each step, on demand or on a schedule | p.3, p.5 |
| Verify | live (deck) | Evidence first (the page and its network answers); AI vision only where rules can't decide | p.5 |
| What it tests | live (deck) | Page loads, links (menu and footer; privacy and terms open the right page), navigation, forms (filled with test data and confirmed), search and filters, widgets (tabs, accordions, switches, carousels) | p.6 |
| Honest results | live (deck) | Six result types: site bug, blocked (CAPTCHA), warning, tool error, test issue, not run; only real site bugs count against health. "A false pass is worse than a false fail" | p.7 |
| Safe on live sites | live (deck) | Test addresses only, never a real email or phone; never changes or deletes the signed-in account; never bypasses a CAPTCHA; passwords go only to the site | p.8 |
| Schedules and alerts | live (deck) | Daily runs with a PDF report by email; a short alert when a site is down | p.9 |
| Reports | live (deck) | Per run with step screenshots, plus a health score per project over time | p.9 |
| Self-healing | live (deck) | A moved or renamed button is found again; Regenerate rewrites a test that no longer fits | p.9 |
| Signed-in sites | live (deck) | Login forms, Google/Microsoft sign-in, sessions, tokens, 2FA codes; the login is proven before every run | p.9 |
| Accounts and plans | live (deck) | Sign-up with email codes, plan limits, add-ons, admin area | p.9 |
| Public website | live (deck) | Ten marketing pages, pricing and a Book a demo form | p.9 |
| Online payment | planned | Paid plans are set up by hand today | p.11, p.13 |

## Limitations and known issues
- Paid plans are set up by hand; customers can't pay or upgrade on their own yet. [p.11, p.13]
- Scheduled tests check that a feature works, never today's data. [p.5]
- CAPTCHA-protected steps are reported as blocked, never bypassed. [p.7]

## Pricing and plans
Prices a month; yearly is "two months free". [p.11]

| Plan | Price | Limits | Source |
|---|---|---|---|
| Free | ₹0, free for good | 1 website; 2 Auto-Tests, 5 regenerates, 30 test runs a month; runs by hand only; screenshots of failed steps; 7 days of history; report in the app only; site-down and login-failed alerts | p.11 |
| Basic | ₹1,499 a month, or ₹14,990 a year | 3 websites; 6 Auto-Tests, 30 regenerates, 200 runs a month; scheduled once a day; screenshots of every step; 30 days of history; PDF report to 1 address; alerts | p.11 |
| Pro | ₹4,999 a month, or ₹49,990 a year | 10 websites; 20 Auto-Tests, 100 regenerates, 1,000 runs a month; up to 4 scheduled runs a day; every step plus video; 90 days of history; PDF report to 5 addresses; alerts | p.11 |
| Add-ons | not priced | +5 Auto-Tests, +500 runs (prices blank in the deck: "[₹__]"). Never quote a price | p.11 |
| More than 10 websites | on request | custom plan | p.11 |

Prices include GST; customers pay nothing extra. Quote them as shown, never with "+ GST". [told by escandita@panscience.ai on 2026-11-05]

## Sign-up, trial and checkout
A customer gives the home page address (nothing to install), a test login and 2FA key if the site has one, who gets the PDF reports and how often, and a plan (Free for one site; Basic or Pro for schedules). One Auto-Test then writes the tests in minutes and the first run can start at once. [p.10] Paid plans are set up by hand. [p.11]

## Integrations and API
Claude (writes tests), Playwright with Chrome (runs them), email (PDF reports). [p.3, p.5] No public API mentioned.

## Proof points
About TestPilot itself, not customers: 155 automated checks of TestPilot, all passing; Google Lighthouse mobile scores on its own 10 website pages of 100 SEO, 100 accessibility and about 90 speed. [p.12] No customers, quotes or results.

## Competitors
Not researched yet.

## Demo assets
"See it live: testpilot.panscience.ai"; a Book a demo form on the website. [p.9, p.14]

## Docs and onboarding
None given beyond p.10.

## Common objections and answers
Not sourced. The safety rules on p.8 answer "will it break my live site?".

## Open questions
- Repo?
- Add-on prices (blank in the deck). [p.11]
- p.13 decisions: who owns payments, and which first customers to approach.
- Is testpilot.panscience.ai live and connected to Search Console? p.13 lists setting that address on the server as a next step.
