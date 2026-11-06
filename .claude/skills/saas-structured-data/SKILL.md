---
name: saas-structured-data
description: How to find, check and write JSON-LD structured data for SaaS pages (Organization, WebSite, SoftwareApplication, Offer, BreadcrumbList, Article) where every value matches what the page shows. Use when auditing or adding structured data.
---

# Structured data for SaaS

Structured data tells search engines and AI assistants exactly what the product is, who makes it and what it costs.
It only helps when it is true: every value must match the visible page and the confirmed fact sheet.

## Finding what is there

- `node scripts/seo-check.mjs <url>` lists the JSON-LD types in the server's HTML. Structured data added by JavaScript only shows on the rendered page: check it there with the browser before calling it missing, or read the repo. A plain fetch alone never settles "missing".
- Each block must be valid JSON with `"@context": "https://schema.org"`. validator.schema.org can check it.

## What each page should carry

- **Home or about:** `Organization` with `name`, `url`, `logo` (an absolute URL to an image crawlers can fetch) and `sameAs` links to the official profiles (LinkedIn, GitHub, X, Crunchbase, Wikidata if any). Reuse one `@id` for the organization across the site.
- **Home:** `WebSite` with `name` and `url`. No `SearchAction`: the sitelinks search box it fed was retired in 2024.
- **Product page:** `SoftwareApplication` or `WebApplication` with `name`, `applicationCategory` (for example `BusinessApplication`), `operatingSystem` (for example `Web`) and `offers` whose `price` and `priceCurrency` match the live pricing page. A price of `0` only if a free plan really exists.
- **Pricing page:** `Offer` per plan only when every price is shown on the page. Never invent a `priceValidUntil`.
- **Docs and blog:** `BreadcrumbList` matching the visible breadcrumb; `Article` or `BlogPosting` with `headline`, true `datePublished` and `dateModified`, an `author` with a profile URL, and an `image`.

## Never

- **Ratings or reviews** (`aggregateRating`, `review`) unless genuine customer reviews are visible on that page and the numbers match them. Reviews the company controls about itself are not eligible. Without them, write "app rich result not eligible: no genuine visible reviews" and move on.
- **FAQ markup to win a rich result.** Google stopped showing FAQ rich results on 2026-05-07. `FAQPage` is still fine for questions and answers that are visible on the page (other engines read it), but say plainly in the report that Google won't show it.
- **HowTo markup:** its rich result was removed in 2023. Leave an accurate existing block alone; don't add new ones.
- A value that disagrees with the page, the title or the sharing tags.

## Writing it in code

Put JSON-LD in a `<script type="application/ld+json">` in the server's HTML, built from the same data the page shows.
In React or Next.js, escape `<` when you serialise: `JSON.stringify(data).replace(/</g, '\\u003c')`. Framework
details are in the seo-code-fixes skill.

## Sources

Google structured data gallery, software app, review snippet guidelines, the 2026 FAQ rich result notice; schema.org.
Ideas from the MIT-licensed AgriciDaniel/claude-seo (dated schema status list) and coreyhaines31/marketingskills
`schema`, rewritten here.
