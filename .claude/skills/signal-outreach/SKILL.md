---
name: signal-outreach
description: How to use what we know about a prospect honestly, from a public post to a gap on their site. Use when recording lead evidence, choosing what an email may mention, and deciding whether a lead is worth contacting now.
---

# Signal outreach

What you may say depends on how you know it. Record the class in the lead's evidence as `signal`.

| Class (`signal`) | What it is | How it may be used |
|---|---|---|
| `published` | They said it themselves: a job post, launch note, blog, changelog | Name it directly, and link it if helpful |
| `observed_gap` | Something visible on their public site or repo, such as a product page with no demo video | Only as a dated observation plus a question. Recheck it before each send |
| `inferred` | Our guess from other facts | Sets timing and priority only. Never mention it to them |

## Rules for gaps

1. Every gap has a URL, the date you saw it and what you saw.
2. The gap must be one our product closes. Otherwise it's just criticism.
3. Ask, don't judge: "I couldn't find a demo on your launch page. Is that on purpose?" not "Your page lacks a demo."
4. "No gap found" is a valid result. Skip the lead rather than stretch one.

## Freshness

- Treat a launch or funding signal as fresh for 60 days and a job post for 45, unless the post says otherwise.
- A stale signal can't be the reason for the email. Find a newer one or drop the lead.
- Before writing, check the lead isn't suppressed: `node scripts/leads.mjs gate --product <slug>`.

## Hypothesis rule

If your evidence is only a hypothesis, write a research question, not a claim. "How do you handle launch videos today?" is fine. "You're struggling with launch videos" isn't.

## Copy shape

Open on their situation, not on us. One signal per email. If two signals fit, save the second for a follow-up.
