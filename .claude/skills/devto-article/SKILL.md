---
name: devto-article
description: How to write a dev.to article or an outline for one: a how-to a developer can follow, with honest disclosure, tags and a canonical link. Use for dev.to drafts and outlines.
---

# dev.to article

Adapted from coreyhaines31/marketingskills (`content-strategy` and `social`, MIT). Auto-publishing and cross-posting steps are left out.

Developers on dev.to read to learn something they can use today. A product mention earns its place only when the product is part of how the thing is done.

## Pick the article

Start from a real buyer question (an `outputs/research/intent/` find, a question sales keeps hearing) that a developer can answer with steps. "How to make a launch video from your repo" fits; "Why we are great" does not. One problem per article.

## Outline (what the weekly task usually delivers)

1. **Title** that names the job in the reader's words, under 70 characters.
2. **The promise** in one line: what the reader will have at the end.
3. **Who it is for** and what they need first.
4. **Sections:** four to six headings, each a step or a decision. Under each, one line on what goes there and which code, command or screenshot goes with it.
5. **Where the product appears:** one section at most, where it is the tool, with a sentence that says we make it.
6. **What it does not do:** a confirmed limit, stated plainly.
7. **Tags:** up to four, from dev.to's own list (for example `webdev`, `opensource`, `tutorial`); check that they exist.
8. **Sources:** the fact-sheet lines each claim rests on.

A full article is 700 to 1,500 words. Send an outline first unless a person asked for the full piece.

## Writing it

- The first 150 words state the problem and the result. No history of the problem.
- Show code or commands that work. Never invent output, a screenshot or a benchmark. If something was not run, say "not run here" in `## For the reviewer`.
- Disclose in the first paragraph: "I work on MotionRepo at PanScience Innovations" (use the named author) or "we make MotionRepo". Never present it as an independent review.
- Compare with other tools only with dated facts (comparison-page skill).
- End with something to do next and one link to the product page, not three.
- If the same text lives on our site, set `canonical_url`; never publish the same text in both places without it.

## Format

`outputs/marketing/posts/YYYY-MM-DD-devto-<slug>.md`, frontmatter `channel: devto`, `product`, `task`, then the article or outline as a person would paste it into dev.to's editor (Markdown). Put the dev.to header lines (`title`, `tags`, `published: false`) in a code block under `## For the reviewer`, so nothing is published by accident. Then `## Claims used`.

## Checks

- `node scripts/lint-copy.mjs <file> --type seo --keyword "<phrase>"` for an article, `--type social` for an outline.
- `node scripts/check-links.mjs <file>`.
- Every claim is confirmed knowledge or a source you opened.
- A reader could follow the steps with nothing but the article.
- Draft only. Publishing is a person's click.
