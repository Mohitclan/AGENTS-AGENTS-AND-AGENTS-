---
name: post-repurposing
description: How to turn one source (a launch note, a fact-sheet section, a customer result, a buyer question) into a LinkedIn post, an X thread, a Bluesky and Mastodon post and a dev.to outline without repeating yourself. Use when one idea needs several channel versions.
---

# Post repurposing

Adapted from coreyhaines31/marketingskills (`social`, "content atoms"; MIT) and charlie947/social-media-skills (`post-formatter` frameworks; MIT). Auto-posting parts are left out.

One source, one idea per post, a different shape per channel. Never paste the same text to every channel.

## Step 1: pull the atoms

From the source, list 3 to 7 single facts or points, each with where it came from (file and line, or "told by <person> on <date>"). A point with no source is not an atom. Mark the one the whole piece turns on: that is the idea.

## Step 2: choose the angle once

Pick one framework for the idea and use it everywhere:

- **Problem, then fix:** the pain, why it persists, what we do about it.
- **Before and after:** what it took, what it takes now (only with a confirmed number).
- **Story, then lesson:** one thing that happened, one thing we took from it.
- **How it works:** three steps a reader could repeat.

## Step 3: write each version

| Channel | Shape | Length | Link |
|---|---|---|---|
| LinkedIn | Hook in the first 200 characters, short lines, one idea, a real question or next step | 100 to 220 words | First comment, not the post |
| X thread | Hook post, then 3 to 6 posts, one atom each (x-threads) | 280 characters a post | Last post |
| Bluesky | One post, plain | 300 characters | In the post is fine |
| Mastodon | The same idea with a little more context | 500 characters on most servers | In the post |
| dev.to | An outline: title, one-line promise, section headings, where code or a screenshot goes (devto-article) | n/a | In the body |

Change the opening and the example between channels. LinkedIn gets the person and the story; X gets the sharpest point; Bluesky and Mastodon get the calm version; dev.to gets the steps.

## Step 4: check each one alone

- Does it make sense without the others? A thread post that only works in sequence needs its number and a hook.
- Is every claim in `## Claims used` with its source? (claim-check)
- Does the first line still work after the cut? (hook-bank)
- Hashtags, mentions and emoji are native to each channel, not copied across.
- Quotes and stories name a person who has said yes; otherwise they stay drafts marked for approval.

## Output

One file per post in `outputs/marketing/posts/` (format in task-briefs). Use the same slug so they sort together: `2026-11-10-linkedin-launch-video-days.md`, `2026-11-10-x-launch-video-days.md`. In each `## For the reviewer`, name the sibling posts that share the idea and say what differs.

## Don't

- Post the same text on every channel on the same day.
- Reuse an old post without saying so and changing it.
- Turn a stranger's post or comment into content except as a short exact quote, and name the writer only if their own public profile does.
