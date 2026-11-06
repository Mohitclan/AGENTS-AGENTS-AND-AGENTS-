---
name: seo-fix-report
description: How to write the SEO and AEO report's "Fixes for a person" - the changes the agent couldn't make or a person must decide - ranked by impact, each with evidence, the exact fix, who does it and how to check it. Use at the end of every SEO and AEO run.
---

# The fixes-for-a-person list

A person should be able to act on the top of this list in an afternoon. Rank it, prove each item, and say exactly what
to change.

## Ranking

Sort by tier, then by effort (small first), then by how sure you are.

1. **Blocks visibility:** pages not crawlable or not indexable, an AI search bot blocked, content only after JavaScript, a wrong canonical, server errors.
2. **Wrong or missing signals on pages that make money** (home, pricing, product, comparisons): titles, descriptions, H1, `Organization` and `SoftwareApplication` structured data, a plain statement of what the product is, the answer-first opening.
3. **Quality and coverage:** thin template pages, internal links, images, dates, real FAQs.
4. **Optional:** `llms.txt`, markdown copies of pages, IndexNow, sharing-tag polish.

## Each item

- an ID and the problem in one line
- the pages affected (how many, and up to three URLs)
- the evidence: what you checked, how, the exact output or text you saw, and the date
- `checked`, `not checked` or `couldn't check`
- the fix as a precise instruction (with a code snippet when you know the framework)
- who does it: developer, content writer or owner
- effort: S (under an hour), M (a day), L (more)
- the rule it comes from (Google page, schema.org, crawler docs, or "our rule")
- how to check after the fix

## Rules

- No predicted traffic, ranking or citation gains. No score that looks precise without its method shown.
- Keep apart "Google says", "a study found" and "our rule".
- Ten items at the top; the rest in an appendix.
- End with **Questions for a person**: Search Console and Bing Webmaster checks, the AI-features setting, and decisions only the founders make (training bots in `robots.txt`, `llms.txt`, asking customers for reviews).
- Anything that would go outside this computer (deploying, submitting a sitemap, an IndexNow ping, a directory listing) also goes to `ops/approvals.md` as `pending`.

## Sources

Report fields adapted from the MIT-licensed coreyhaines31/marketingskills (`seo-audit`: issue, impact, evidence, fix,
priority) and AgriciDaniel/claude-seo (priority levels, honest reporting), rewritten here; our landing-page-audit and
verify-before-reporting skills.
