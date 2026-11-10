---
name: content-calendar
description: How to plan a week of social content across channels from launches, confirmed product facts, customer proof and buyer questions, with one idea in many formats. Use for the weekly calendar and any "what should we post" request.
---

# Content calendar

Adapted from coreyhaines31/marketingskills (`social`, MIT) and charlie947/social-media-skills (`content-matrix`, MIT). Posting automation, scheduling-tool steps and engagement pods from those repos are left out: a person posts everything by hand.

A calendar is a short list of ideas, each with a channel, a format, a fact source and a way to measure it. It is not a grid to fill.

## Before planning

1. Set the outcome first (early-stage-guardrails): for example "3 replies or profile visits from target accounts", not "reach". Name the metric and where it is read (the Posts page, `ops/social-metrics.jsonl`).
2. Read last week's `outputs/marketing/social-weekly-*.md`, if one exists, and keep what worked.
3. Gather raw material, in this order:
   - **Launches and changes:** the fact sheet in `knowledge/products/<slug>.md` (confirmed lines only).
   - **Proof:** quotes and numbers that pass the proof-library skill. No proof yet means no proof posts.
   - **Buyer questions:** the latest `outputs/research/intent/*.md` finds, in the buyers' words.
   - **Build notes:** things the team really did this week, told by a named person.

## Pillars

Pick three or four, each tied to a buyer problem (founders launching a product without a video or docs team):

| Pillar | Example for MotionRepo |
|---|---|
| Problem | Why a launch video takes a week of someone's time |
| How it works | What a repo becomes, step by step |
| Proof | A customer result, only if confirmed |
| Build in public | A decision the team made, told by the person who made it |

A promotional post (an offer or a sign-up) is at most one in five.

## One idea, many formats

Plan ideas first, then dress each for its channel (the post-repurposing skill does the rewriting):

| Channel | Share of the week | Typical format |
|---|---|---|
| LinkedIn (founder) | 3 posts | Short story or lesson; a carousel a fortnight (visual-briefs) |
| X | 2 posts or 1 thread | One point, or a thread (x-threads) |
| Bluesky and Mastodon | 2 posts | The same idea, shorter, with alt text (bluesky-mastodon) |
| dev.to | 1 outline a week, 1 article a month | A how-to from the repo (devto-article) |
| Reddit | Comments only, unless a subreddit allows posts | Answer a question (reddit-community) |

Three or four strong posts beat daily filler. If the week has one good idea, plan one idea and say so.

## The calendar file

Save `outputs/marketing/calendar/YYYY-Www.md` (ISO week):

- **Outcome and metric** at the top.
- **Last week's learning** in one line, or "no data yet".
- A table, one row per post: day, channel, pillar, the idea in one sentence, fact source (file and line), format, who must approve (a named person for any quote or story), and the file name the writer will use.
- **Not planned, and why** (for example "no proof posts: no confirmed customer result").
- **Questions for a person.**

## Checks

- Every idea has a fact source. A row that says "TBD" is dropped.
- No two rows make the same point for the same channel.
- Days are spread out; no more than one LinkedIn post a day.
- Any date, launch or event is checked against its source, not remembered.
- Nothing in the calendar says "schedule" or "auto-post". Publishing is a person's click on the Posts page.

## Example row

| Tue | LinkedIn | Problem | "Our last launch video took four days. Most of it was waiting." | told by <founder> on <date>, needs their yes | story, about 120 words | `2026-11-10-linkedin-launch-video-days.md` |
