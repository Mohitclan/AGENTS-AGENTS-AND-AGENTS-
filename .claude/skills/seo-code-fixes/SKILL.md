---
name: seo-code-fixes
description: How to fix SEO and AEO problems in a site's code on a local branch, with the smallest change, per framework (Next.js, React with Vite, plain HTML, Astro), and proof that it worked. Use when knowledge/seo-sites.md names a repository for the site.
---

# Fixing SEO and AEO in the code

## Workflow

1. `git status` is clean in `repos/<slug>`. Create the branch `agent/<task-id>-seo`.
2. Find how the site is built and where the page head comes from (layout files, a head component, a static `index.html`). Note it in the report.
3. Make **one fix per commit**, each tied to a finding in your report (its ID).
4. Prove it: for static HTML, run `node scripts/seo-check.mjs --file repos/<slug>/<path>.html` before and after. For a framework, show the changed source and say the change is "not built here" (team runs can't run a site's build); a person checks it with a preview build before merging.
5. Run the project's tests and lint if it has them (`npm test`, `npm run lint`) and record the results, including failures.
6. Never push, merge or deploy. Never change `robots.txt` rules for training bots (`GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`).

## Next.js, App Router

- Titles, descriptions and canonicals: `export const metadata` or `generateMetadata` in `layout.tsx` and `page.tsx` (Server Components only). Set `metadataBase` once in the root layout, `alternates.canonical` per page.
- `app/sitemap.ts` and `app/robots.ts`. Take `lastModified` from real content dates, never `new Date()` on every build.
- Sharing images: `opengraph-image` files beside the route.
- JSON-LD: a plain `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />` in the page or layout. Not `next/script`.
- If metadata streams in late on dynamic routes, check that the title and canonical still reach crawlers in the first HTML.

## Next.js, Pages Router

`next/head` in each page, site-wide tags in `_document`, and a sitemap from `next-sitemap` or a generated `public/sitemap.xml`.

## React with Vite (a single-page app)

- The real fix is pre-rendering the marketing pages at build time (React Router's `prerender`, or moving those pages to a static site generator). That is usually a bigger change than this agent should make: list it for a person with the effort it takes.
- Head tags: React 19 hoists `<title>`, `<meta>` and `<link>` written in components; on React 18 use `react-helmet-async` if the project already has it. Neither helps crawlers that don't run JavaScript unless the page is pre-rendered, so say so.
- Don't add "dynamic rendering" that serves bots different HTML: Google calls it a workaround and it looks like cloaking.

## Plain HTML

Edit the `<head>` of each page directly (title, description, canonical, sharing tags, JSON-LD) and keep `robots.txt` and
`sitemap.xml` at the web root.

## Astro

Set `site` in `astro.config.mjs`; use `@astrojs/sitemap` if it is already a dependency (it writes `sitemap-index.xml`);
one shared head component for title, description, canonical (`new URL(Astro.url.pathname, Astro.site)`) and sharing
tags; JSON-LD with `<script type="application/ld+json" set:html={JSON.stringify(data)} />`; `public/robots.txt` with a
`Sitemap:` line.

## Adding a dependency

Don't. If a fix needs a new package, list it for a person.

## Done means

Every change maps to a finding; before and after are shown; tests and lint pass or their failures are recorded; there is
no unrelated diff; and the report's "Fixed on the branch" says what a person does after merging (deploy, request
indexing in Search Console, submit the sitemap).

## Sources

Next.js metadata, sitemap and JSON-LD guides; React 19 `<title>` docs; React Router pre-rendering; Astro sitemap guide;
Google dynamic rendering. Framework patterns informed by the MIT-licensed onvoyage-ai/gtm-engineer-skills and
AgriciDaniel/claude-seo, rewritten here (their "allow every bot" and "lastModified: new Date()" defaults are excluded).
