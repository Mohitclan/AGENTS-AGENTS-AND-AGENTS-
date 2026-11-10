---
name: x-threads
description: How to write short X posts and threads for a founder-led B2B software product: structure, length, hooks, when a thread is worth it, and what to leave out. Use for any X draft.
---

# X posts and threads

Adapted from coreyhaines31/marketingskills (`social`, X norms; MIT). Posting and scheduling steps are left out.

X rewards a sharp point said quickly. Most weeks, one or two single posts are enough; a thread is for an idea that needs steps.

## Limits

- 280 characters a post (the Posts page warns above that). A link counts as 23 characters.
- Aim for under 240, so a quote-post has room.
- Hashtags: none or one. Never a row of them.

## Single post

1. One point. One fact. No second idea after "and".
2. Lead with the claim or the number, not the setup.
3. Say who it is for: "If you ship a product alone..." beats a general truth.
4. End on the point, not on "thoughts?".

Test: could a stranger repeat it in one sentence?

## Thread (3 to 6 posts)

Use a thread when the reader needs steps, a short story or a comparison. If it fits in one post, it is one post.

| Post | Job |
|---|---|
| 1 | The hook: the problem or the result, in the reader's words. A promise the thread keeps. |
| 2 to N-1 | One atom each: a step, a reason, a number. Each makes sense if quoted alone. |
| Last | What to do next, or the honest limit. A link goes here, not in post 1. |

Number the posts ("2/5") only when there are four or more. Keep post 1 under 240 characters.

## Rules for our team

- Every number and feature comes from confirmed knowledge and is listed in `## Claims used`.
- Write "I" only when a named person has approved the voice; otherwise write as the product team ("we make").
- Say we make the product whenever it matters to the point.
- No replies to strangers from this skill. That is community-replies, and a person posts it.
- No invented customers, screenshots or metrics.
- No engagement bait ("RT if", "like if you agree"), no tagging people to get their attention, no bought reach.

## File format

`outputs/marketing/posts/YYYY-MM-DD-x-<slug>.md`, frontmatter `channel: x`, `product`, `task`. For a thread, put the posts in order, separated by a line of `---`, each under its limit. A link for a single post goes under `## First comment`; for a thread it goes in the last post (say so in `## For the reviewer`).

## Example (shape only; the facts are placeholders)

1. "Launch week is when you have the least time to make a video. [one confirmed fact about what MotionRepo makes from a repo]"
2. "Step 1: [what you give it]."
3. "Step 2: [what it makes]."
4. "What it does not do: [a confirmed limit]."

## Check before hand-in

Run `node scripts/lint-copy.mjs <file> --type social`, count the characters of each post, and read the hook on its own.
