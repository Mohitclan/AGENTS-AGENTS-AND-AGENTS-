---
status: proposed
slug: peelpress
owner: researcher
last_verified: 2026-11-10
sources:
  - https://madegooddesigns.com/tools/label-maker/
  - https://www.capterra.com/p/10041230/Label-Flow-Pro/
  - https://www.avery.co.uk/software/design-print
  - https://peelpress.panscience.ai
---

# Peelpress: starter research (competitors and ideal customer)

Task T-20261110-20 (J-20261110-07). Starter research only: no market brief, teardown or channel map. Our own facts come from `knowledge/products/peelpress.md` (confirmed). Pages were read through a summarising fetch tool, so re-read exact wording before customer-facing use. Read date for every page below: **2026-11-10**.

## Ideal-customer profile (short)

Facts (from our fact sheet, `knowledge/products/peelpress.md` lines 31-36):
- India first, since pricing is in INR; Pro is described on the site as for "sellers and businesses printing every week".
- Product is A4 sheets only, so thermal-roll users are out.

Hypotheses (all low confidence, none tested with buyers):
- **Who buys:** the owner of a small online shop or marketplace seller who also packs and ships orders. Basis: the site's orders.csv example and Indian sample addresses.
- **Size:** about 1 to 10 people, no dedicated ops staff. Basis: a one-person decision at ₹299 a month.
- **Trigger:** weekly shipping label printing, or a sale season with a jump in orders. Basis: the fact sheet's own trigger guess; no buyer evidence found.
- **Where they gather online:** marketplace seller communities and small-shop maker boards (see the two source groups below). None opened or sized.

## Top 3 competitors

All three are free or low-cost tools that fill an A4 label sheet from a spreadsheet. Whether Indian small sellers use any of them is Unknown.

### 1. Made Good Designs, Label Maker (direct, free)
- **Positioning:** a browser label maker, "Make printable labels for free"; the site says tools are free with "no sign-up, no watermark". [https://madegooddesigns.com/tools/label-maker/, read 2026-11-10]
- **Target customer:** people making jar, product, return-address and shipping labels, including from a spreadsheet. [same page]
- **Features seen:** CSV upload or paste (first row = column names); A4 layouts L7160 (21 per sheet), L7163 (14), L7173 (10), L7165 (8), L7651 (65); Letter sizes; custom layout; alignment test page; work stays in the browser. [same page]
- **Pricing:** no paid plan, row cap or usage cap mentioned on the page. [same page, 2026-11-10]
- **Where we win:** AI reading of PDFs, photos and pasted emails; QR codes that carry each customer's details; skipping used stickers on a part-used sheet; a Pro plan with email support [fact sheet lines 47-57, 73]. The page lists none of these.
- **Where we lose:** it is free with no sign-up and no row limit stated, against our free plan's 50 labels per download and a branding line [fact sheet line 63]. It also lists more standard sheet codes, mostly UK-style (L71xx).
- **Weaknesses from reviews:** none found. Quiet, not "no complaints".

### 2. Avery Design & Print (direct, label-stock brand tool)
- **Positioning:** not read. The page returned 403 on 2026-11-10. A search result described it as an online designer with mail-merge import that is free [search result, not a source].
- **Target customer, features, pricing:** Unknown. Data gap.
- **Where we win or lose:** can't be said. Hypothesis (low): it is built around Avery's own sheet codes, and Indian sellers often buy generic A4 sticker sheets (retail listings such as DESMAT A4 12-label packs appear on Flipkart), so a mm-exact custom layout may matter more to them. Test: read the Avery tool page by hand and ask three sellers what sheets they buy.

### 3. Label Flow Pro (direct, paid)
- **Positioning:** no official site found, so no vendor page read. Capterra lists it with a free tier and a paid Pro plan for batch printing from Excel and CSV. [https://www.capterra.com/p/10041230/Label-Flow-Pro/, search result seen 2026-11-10; page not opened]
- **Pricing:** aggregators show a Pro plan at 12.99 a month (currency shown as euro on one listing, unlabelled on another) and a 169.99 one-time lifetime option. Third party and not opened, so treat as unverified. No INR price found. [same search, 2026-11-10]
- **Where we win or lose:** if the 12.99 figure holds, our Pro at ₹299 a month is lower in nominal terms, but no dated exchange rate was checked, so no claim is made. Data gap.

Indirect option (not researched): Word and Excel mail merge, which needs layout set-up each time.

## Two source groups for lead scouts (hypotheses, not yet swept)

Goal: small Indian online sellers and shops that print labels weekly.

1. **Marketplace seller communities and storefront lists.** Public Flipkart, Meesho and Amazon seller forums or subreddits, plus public seller storefront pages that name a small shop with its own Instagram or website. Access note: reddit.com blocked our fetch tool and meesho.com returned 403 on 2026-11-10, so a scout needs the browser tool or a person, and must read each site's rules on self-promotion first. Confidence: medium that sellers gather here, low that a given shop is small enough.
2. **Launch and maker boards with D2C shops.** Peerlist and Product Hunt India listings (already named for the MotionRepo plan in `memory/MAIN.md`, 2026-10-30) filtered for small India-based shops, plus the shop's own contact page. Confidence: low. Those boards skew to software makers, so expect a low hit rate for physical-goods sellers.

Neither group was opened for this task; evidence they hold weekly label printers is Unknown.

## Sources opened (8 fetch calls, all on 2026-11-10)
- https://madegooddesigns.com/tools/label-maker/ (read)
- https://www.avery.eu/print (301 redirect to avery.co.uk, then 403 on https://www.avery.co.uk/software/design-print; not read)
- https://labelflowpro.com/pricing (404, a guessed URL; not read)
- https://workspace.google.com/marketplace/app/printperfect_labels/442164308183 (too many redirects; not read)
- reddit.com/r/FlipkartSellers (fetch blocked by the tool; not read)
- https://www.meesho.com/ (403; not read)
- Two searches, used only to find names. Search results are not evidence.

## Sources not opened
Avery's own page, Label Flow Pro's own page (none found), the Capterra and GetApp listings, PrintPerfect and the other Google Workspace add-ons, Address Label Maker, any review site, any seller community. The 8-page cap was spent.

## Confidence
Low overall. One competitor page was read in full. Two competitors have no vendor-page pricing, so no price comparison is supported. The customer profile is inference only.

## Open questions
- Which tools do small Indian sellers use today? Ask three by hand.
- Read Avery's page and find Label Flow Pro's real site for pricing.
- Is Flipkart or Meesho the right seller group, or does the shop owner use their own site?
- Does our 50-label free cap bite before a seller's first paid week? Our fact sheet doesn't say.

## Changes
- 2026-11-10: first version (T-20261110-20).
