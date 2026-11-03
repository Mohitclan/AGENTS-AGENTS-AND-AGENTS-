---
name: seo-refresh
description: How to choose keywords, improve existing pages and stay honest about search and AI answer engines, with free tools only. Use for keyword briefs, page audits, blog plans and AI search questions.
---

# SEO and AI search

## Qualify every keyword

Read the live search result before writing anything. Give each keyword one verdict:

- **Qualify:** real intent, and our product honestly answers it.
- **Conditional:** worth it if something changes. Say what.
- **Kill:** wrong intent, or dominated by pages we can't beat.

Check that the buyer would really search it, what's ranking now, and whether we could rank with a better page. No volume tools? Use Google Search Console (ours), autocomplete, "people also ask", and buyers' language from the research.

## Improve what ranks first

1. Refresh pages already getting impressions before writing new ones.
2. Exclude brand searches when judging a page.
3. Change one thing per page per grading window, and write down what and when.
4. Verdict for each piece: publish, hold or cut.

## Audit order

When you audit a page or a site, go in this order and report the first failing step first. A page that can't be indexed gains nothing from a better title.

1. **Can it be found and indexed?** `robots.txt`, the sitemap, `noindex` tags, canonical tags, redirects. Search Console (ours) shows indexing; a person reads it for you.
2. **Does the page work?** It loads and reads properly on a phone. Google's PageSpeed Insights is free.
3. **On the page.** The checks in the next section.
4. **Does the content deserve to rank?** Compare it with what ranks now for the keyword, as in "Qualify every keyword".
5. **Links and mentions from others.** Earned only. No link buying.

In your findings, label each step as checked, not checked, or couldn't be checked, and say what you used. A fetch can't settle step 1 or the schema question on its own.

## On the page

- The keyword is in the title, the H1, one H2 and the first paragraph, naturally.
- Answer the question in the first 120 words.
- Short paragraphs, real examples, and at least two internal links.
- Check with `node scripts/lint-copy.mjs <file> --type seo --keyword "<phrase>"`.
- **Schema and structured data.** A fetch may not show structured data (JSON-LD), whether it sits in the HTML or is added by JavaScript after the page loads, so a fetch that shows none proves nothing. Write "schema: not checked" and say why. Never write "missing" or "present" from a fetch. Ask a person to check the rendered page: open the browser's developer console on the page and run `document.querySelectorAll('script[type="application/ld+json"]')`, or run the page through Google's free Rich Results Test (below). List it under questions until they answer.

https://search.google.com/test/rich-results

## AI answer engines

- Make sure `robots.txt` doesn't block the AI crawlers you want, and that content isn't hidden behind JavaScript.
- Clear headings, direct answers and honest comparison pages are what get cited.
- Being named on third-party "best tools" lists and review sites matters as much as your own pages.
- Never promise a ranking or citation in ChatGPT, Claude or Perplexity. Claimed lifts from "AI optimisation" need a source, and most don't have one.

## Hold for now

Programmatic SEO and link-buying schemes. Earn links through real work, and leave paid tools out.
