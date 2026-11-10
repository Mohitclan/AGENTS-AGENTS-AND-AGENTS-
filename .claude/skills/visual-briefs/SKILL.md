---
name: visual-briefs
description: How to write carousel, image and screenshot briefs a person or tool can produce, with alt text, for social posts. Use when a post needs a visual and no one has made it.
---

# Visual briefs

Adapted from charlie947/social-media-skills (`gemini-carousel` brief and approval step, `graphic-designer`; MIT). Its image-prompt steps for a named tool are reduced to a plain brief, and no image is generated or posted by an agent.

We write the brief; a person (or a design tool they run) makes the image. Nothing in a visual may state anything the post's `## Claims used` does not.

## When a post needs a visual

- A how-to or a before-and-after: a screenshot or a short sequence.
- A story post: usually no image. A plain post often does better than a decorated one.
- A carousel (LinkedIn): when the idea has 5 to 9 steps or a comparison.
- Never a stock photo of "people at laptops", and never an invented dashboard or customer logo.

## Single image or screenshot brief

1. **Purpose:** what the reader should get in two seconds.
2. **Source:** a real screenshot of the real product (name the screen and the steps to reach it), or a simple diagram.
3. **What to show and what to hide:** crop to the point; hide emails, tokens, names.
4. **Text on the image:** at most 8 words, in the exact words to use.
5. **Size:** LinkedIn 1200 x 627 (landscape) or 1080 x 1350 (portrait); X 1600 x 900; Bluesky and Mastodon about 1200 x 675.
6. **Alt text** (bluesky-mastodon skill): what it shows and why, under about 200 characters.

## Carousel brief (LinkedIn, 1080 x 1350, 6 to 10 slides)

1. **Cover:** the hook, 8 words or fewer.
2. **Body slides:** one point each; headline up to 8 words, body up to 15; each point sourced.
3. **Last slide:** the takeaway or next step. A call to action only for a real, approved offer or link.
4. **Style:** colours, fonts and logo from the brand files (`docs/brand`, the logo as "PanScience Innovations"); the same on every slide; the cover and last slide look different from the body.
5. **Order the argument** before the design: problem, why it persists, steps, limit, next step.

Write it as a table: slide number, headline, body text, visual, source line.

## Approval step

A person approves the brief before anything is made. Put it in `## For the reviewer`: "Brief only; nothing produced." After the visual is made, the finished image gets checked at full and thumbnail size for typos, clipping, legibility and facts. A post changed after review needs a new review.

## Where it goes

Under `## Visual brief` in the post file (frontmatter and text as in task-briefs), plus `## Alt text`. Keep the post readable without the image.

## Checks

- Every number or word on the image appears in `## Claims used`.
- No real person's face or name appears without their yes.
- Contrast is readable on a phone; text is not smaller than the body of a slide.
- No fake testimonials, ratings or logos. No image is made to look like a screenshot of something that does not exist.
- Alt text is there for every image.
