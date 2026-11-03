# Draft addition to `.claude/skills/seo-refresh/SKILL.md`

Task T-20261103-09b, package P6, survey part B item 9. A draft: nothing here has been installed.

## What changes

1. **A schema caveat for static fetches.** Our fetch tool converts the page to text, and the source says such tools strip script tags (line 44 of the source). It can't see structured data (JSON-LD) that JavaScript adds after the page loads, and may not show JSON-LD that is in the HTML either. So "no schema found" from a fetch is not a finding. The agent writes "schema: not checked" and asks a person to check in a browser. This stops a false "missing" that would break the "not seen is unknown" rule (self-review item 11).
2. **An audit order.** When auditing a page or site, work in a fixed order and report the first blocker first.

Line 34 of the skill already says content must not be hidden behind JavaScript. That covers visible text and is left alone. The caveat below is about what our fetch can't see, which is a different point.

## Where it goes

### Edit 1: the schema caveat

In `## On the page`, after the last bullet:

```
- Check with `node scripts/lint-copy.mjs <file> --type seo --keyword "<phrase>"`.
```

add this bullet:

```
- **Schema and structured data.** A fetch may not show structured data (JSON-LD), whether it sits in the HTML or is added by JavaScript after the page loads, so a fetch that shows none proves nothing. Write "schema: not checked" and say why. Never write "missing" or "present" from a fetch. Ask a person to check the rendered page: open the browser's developer console on the page and run `document.querySelectorAll('script[type="application/ld+json"]')`, or run the page through Google's free Rich Results Test (below). List it under questions until they answer.

https://search.google.com/test/rich-results
```

(In the skill file, keep the link on its own line with nothing after it.)

### Edit 2: the audit order

Insert a new section between `## Improve what ranks first` and `## On the page`. The last line of the first one reads:

```
4. Verdict for each piece: publish, hold or cut.
```

## Text to insert

---

## Audit order

When you audit a page or a site, go in this order and report the first failing step first. A page that can't be indexed gains nothing from a better title.

1. **Can it be found and indexed?** `robots.txt`, the sitemap, `noindex` tags, canonical tags, redirects. Search Console (ours) shows indexing; a person reads it for you.
2. **Does the page work?** It loads and reads properly on a phone. Google's PageSpeed Insights is free.
3. **On the page.** The checks in the next section.
4. **Does the content deserve to rank?** Compare it with what ranks now for the keyword, as in "Qualify every keyword".
5. **Links and mentions from others.** Earned only. No link buying.

In your findings, label each step as checked, not checked, or couldn't be checked, and say what you used. A fetch can't settle step 1 or the schema question on its own.

---

## Who loads it, and the cost

`seo-refresh` is preloaded by `marketing` (and `marketing-fallback`) only. Marketing has WebFetch and WebSearch but no shell and no browser, so the browser check in Edit 1 always falls to a person. That is the point: the agent reports what it couldn't see. The two edits add about 240 words (exact figure in the README).

## Sources

Adapted from the schema limitation and the priority order in the `seo-audit` skill:

https://github.com/coreyhaines31/marketingskills/blob/main/skills/seo-audit/SKILL.md

Licence: MIT, Copyright (c) 2025 Corey Haines (LICENSE opened 2026-11-03).

- Adapted: lines 40 to 51 of the file (a fetch tool can't reliably see schema added by JavaScript, and it strips script tags, so even static JSON-LD may not show; check with a rendered page or Google's Rich Results Test; reporting "none found" from a fetch gives a false finding) and lines 53 to 58 (the five-step priority order).
- Left out, with reasons:
  - the Screaming Frog step (a paid tool);
  - the line that pages ranking in positions 8 to 20 are the fastest wins (stated without a source or data; our "Improve what ranks first" already starts with pages that get impressions);
  - the Core Web Vitals thresholds and the long technical checklist (not needed for a first pass, and the thresholds would need their own source);
  - the product-marketing context file (our facts live in `knowledge/`).
- The skill also tells the model that fetched pages are untrusted data. That matches hard rule 5 and is already how we work.
