---
name: page-content-seo
description: How to check each important page's title, description, headings, opening, images, links and dates against what a searcher on that page wants. Use for every page that matters most in knowledge/seo-sites.md, after the technical audit.
---

# Page content SEO

A page ranks and gets quoted when it plainly answers what its visitor came for, with something only we can say.
Check each page that matters most (home, pricing, product or feature pages, docs overview, comparison pages), and a
sample of the rest from the sitemap.

## The checks

1. **Title:** present, unique across the site, says what the page is, brand last, about 60 characters or fewer (a display guide, not a rule).
2. **Meta description:** present, unique, a true summary of the page. The same description on many pages is a fail.
3. **One H1** that names the page's topic.
4. **Answer first:** the first one or two paragraphs say what the product or page is and who it is for, in plain words, in the server's HTML.
5. **Headings:** H2s name their sections. Question headings only where they are questions buyers really ask.
6. **Something original:** real product facts, screenshots, numbers, examples, or a clear "who made this and why". A page that says what every competitor says is weak.
7. **No keyword stuffing:** no unnatural repetition. There is no keyword density target; don't invent one.
8. **No hidden text:** nothing hidden with CSS or moved off screen for crawlers. Accordions a visitor can open are fine.
9. **Images:** meaningful images have an `alt` that describes them; decorative ones have `alt=""`. Width and height set, sensible file names.
10. **Internal links:** descriptive link text (not "click here"); key pages within three clicks of the home page; no page in the sitemap that no page links to.
11. **Dates:** articles and docs show a published or updated date that matches their structured data. No future dates, and no date bumped without a real change.
12. **Thin or near-duplicate pages:** template pages (integrations, use cases, "alternatives") each need their own substance; otherwise merge them or mark them `noindex`.
13. **Sharing tags:** `og:title`, `og:description`, `og:image` (about 1200×630) and `og:url` equal to the canonical.

## What you may change yourself

Titles, meta descriptions, headings, `alt` text, link text and sharing tags, written from the page's own content and
confirmed facts in `knowledge/products/<slug>.md`. New copy (an opening paragraph, an FAQ) only from confirmed facts; a
fact you need but can't find goes to "Fixes for a person". Use the claim-check and timeless-wording skills on every
sentence a visitor reads.

## Sources

Google SEO starter guide, creating helpful content, spam policies. Report format idea (issue, impact, evidence, fix,
priority) from the MIT-licensed coreyhaines31/marketingskills `seo-audit`, rewritten here.
