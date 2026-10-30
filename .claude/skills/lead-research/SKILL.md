---
name: lead-research
description: How to find companies that fit a product's ICP using free public sources, prove the fit with evidence, and score them. Use when building or updating a lead list or a segment map.
---

# Lead research

## Where to look (free sources only)

| Signal | Where to find it |
|---|---|
| They have the problem | Job posts naming the pain or the tool gap (company careers pages, LinkedIn Jobs, Naukri, Wellfound); complaints in public reviews (G2, Capterra, Play Store, Trustpilot); public forum threads |
| They fit the ICP | The company's own site: about, pricing, customers, team page; public directories and marketplaces (Shopify App Store, Product Hunt, YC and accelerator lists, industry associations) |
| Timing | Funding and launch news, new hires in the buyer role, expansion to a new region, a new regulation that affects them |
| A route in | A contact page, a published company email, a founder's public professional profile |

Don't log in to anything, don't use paid databases, and don't scrape behind a paywall.

## For each company

1. Read the product's ICP and disqualifiers in `knowledge/products/<slug>.md` first.
2. Confirm the basics on their own site: what they do, rough size, country.
3. Find at least one piece of evidence of need or timing, and keep its URL.
4. Score it with the breakdown in `pipeline/lead-schema.md`. A score you can't justify from the evidence is too high.
5. Record a contact only if it's published, with the page where you found it. Never build an email address from a name pattern.

## Scoring sense checks

- `icp_fit` above 30 needs industry, size and region all matching.
- `need_evidence` above 20 needs a specific public signal, not "companies like this usually...".
- `timing` above 10 needs a dated event in the last six months.
- If two of the four parts are guesses, the lead is tier C at best.

## Quality over volume

Ten leads with real evidence beat thirty name-only ones. Stop when sources run dry and say which segment needs better sources.
