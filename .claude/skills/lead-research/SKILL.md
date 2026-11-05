---
name: lead-research
description: How to find companies that fit a product's ICP using free public sources, prove the fit with evidence, and score them. Use when building or updating a lead list or a segment map.
---

# Lead research

## Where to look (free sources only)

For the exact sources agents can reach, with the URL to fetch and what each proves, follow the lead-sources skill. The table below is what to look for.

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

## Before you record a gap or "not found"

Look beyond the homepage first: listing sites (Product Hunt, PeerPush, Peerlist), Show HN, YouTube, the README and docs, LinkedIn, and any demo or booking page. Check what the lead sells against our competitor file, including indirect categories. Give an evidence item a `dated` field when the event has its own date.

## Who counts as founder-led

A parent company, studio or group doesn't count as founder-led, unless a named founder actually runs the product and the whole team is small (about 20 or fewer). Otherwise it's a separate segment: note it, and don't force it into this one.

## Contact quality

A named person beats a shared inbox. General inboxes such as hello@ are valid, but reachability is capped at 5 of 10. A support-only inbox is capped at 3 and can't get a Go.

## Human-found candidates

Start from `pipeline/human-research.md`. People add makers there from sites agents can't load, such as Peerlist and Product Hunt India. Treat each row as a candidate, not a fact: verify it from sources you can reach, cite those sources, and mark the row `imported` or `rejected` with the reason. If you can't verify a row, leave it open and say what's missing.

Don't weaken the segment to fill a batch. Fewer real leads beat more weak ones. A failed lookup is a data gap, not "not found".

## Public buyer intent

Forum and community posts can reveal buyers, but a keyword hit is only a candidate. Keep one only if the writer is a likely buyer, the intent is clear, and you have their exact words with the URL. Read public pages only, and never post or reply.

Each post you keep becomes one evidence item in the lead record: the exact words (a short quote), the URL of that post or comment, `signal: published`, and `dated` when the page shows a date. Say whether the words come from the post or from a comment, and give the writer's role (post author or commenter, plus any job title the page states), never a name or handle. A comment is never credited to the post's author. A search result you didn't open is not evidence, and neither is an empty search; list the search under data gaps. Record the company and its published professional contact, not a private person's profile, other posts or contact details. For a task that is mostly social research, first read the "Public social and forum research" section of `.claude/skills/research-rigor/SKILL.md` (you don't preload that skill, so open the file).

## Before handing in

- Record each piece of evidence's `signal` class (see the signal-outreach skill).
- Run `node scripts/leads.mjs gate --product <slug> --status all` and fix or drop every Stop.
- If a company matches a disqualifier, import it as `disqualified` so nobody researches it again.

## Scoring sense checks

- `icp_fit` above 30 needs industry, size and region all matching.
- `need_evidence` above 20 needs a specific public signal, not "companies like this usually...".
- `timing` above 10 needs a dated event in the last six months.
- If two of the four parts are guesses, the lead is tier C at best.

## Quality over volume

Ten leads with real evidence beat thirty name-only ones. Stop when sources run dry and say which segment needs better sources.
