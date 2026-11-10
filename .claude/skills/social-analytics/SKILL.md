---
name: social-analytics
description: What to measure for each social channel, how to read small numbers honestly, and how to turn a week of results into learnings for next week's calendar. Use for the weekly social report.
---

# Social analytics

Adapted from charlie947/social-media-skills (`analytics-dashboard`: quadrants, separate top-post samples from account totals, testable hypotheses; MIT) and coreyhaines31/marketingskills (`social`, metrics; MIT). Scraping, paid analytics tools and projections are left out.

We are small. A week has a handful of posts and numbers in the tens. The job is to learn without fooling ourselves.

## Where the numbers come from

- `ops/posts.jsonl`: which drafts a person approved or posted, and when (read only).
- `ops/social-metrics.jsonl`: results a person recorded per post (read only). If either file is missing or empty, say "no results recorded yet" and write a short report that lists what a person should record; don't make numbers up.
- Posts in `outputs/marketing/posts/` and the calendar in `outputs/marketing/calendar/` for what was planned.
- Numbers typed in from a person's own analytics screen are fine; never log in to anything or scrape a profile.

## What to measure, per channel

| Channel | Look at | Why |
|---|---|---|
| LinkedIn | Impressions, reactions, comments, profile views, connection requests from target accounts | Comments and target-account views beat reactions |
| X | Impressions, replies, profile clicks, link clicks | Replies show interest; impressions alone don't |
| Bluesky, Mastodon | Replies, boosts or reposts, likes | Small audiences: count replies |
| dev.to | Views, reactions, comments, reading time | A saved or commented how-to is a good sign |
| Reddit | Kept or removed, replies, thanks | Removal is the key signal |
| All | Visits and sign-ups that carry a tracking tag, replies to outreach that mention a post | Only these tie to the goal |

Pick the one number that matches the week's stated outcome (in the calendar) and put it first.

## Small-number honesty

1. Say how many posts each statement rests on: "2 of 3 LinkedIn posts" not "LinkedIn works".
2. Fewer than 5 posts of a kind is an observation, not a finding. Label it "hunch".
3. A difference under about 2x on counts in the tens is noise. Don't rank on it.
4. One viral or dead post tells you about that post. Show the median and the range, not only the best.
5. Never project followers or reach forward. Never quote a benchmark you did not read from a source.
6. Missing data is a finding: say which posts had none.
7. Correlation is not cause: a good day for one post may be the day, not the format.

## The weekly file

Save `outputs/marketing/social-weekly-YYYY-MM-DD.md`:

1. **Outcome and result:** the week's stated metric and the number, in one line.
2. **Posts table:** each post, channel, format, the key numbers, source of the numbers.
3. **What worked** (with the count it rests on) and **what didn't**.
4. **Hunches** (under 5 posts) to test next week.
5. **Next week's tests:** at most three, each as "If we <change>, we expect <metric> to <move>, checked on <date>". No guarantees.
6. **Data gaps** and what a person should record.
7. **Don't repeat / do repeat** list for the planner.

## Check before hand-in

- Every number appears in a source file you can name.
- No sentence says "grew", "dropped" or "beat" without a before and after.
- The tests are small enough to run in a week.
- Run `node scripts/lint-copy.mjs <file> --type general`.
