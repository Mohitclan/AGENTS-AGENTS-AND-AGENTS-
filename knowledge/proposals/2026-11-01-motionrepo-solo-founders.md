---
status: proposed
product: motionrepo
date: 2026-11-01
targets:
  - knowledge/products/motionrepo.md
---

# Proposal: segment 1 includes solo founders

shivam-G05 decided on 2026-11-01 that solo founders count as segment 1. The fact sheet is `status: confirmed`, so agents can't change it. The decision is in main memory, so the team already works to it; this proposal brings the fact sheet into line. The human applies these changes by editing the file, then re-confirming it with `node scripts/kb.mjs confirm knowledge/products/motionrepo.md`.

## Changes

Words that change are in **bold**.

| Line | Current text | Proposed text |
|---|---|---|
| 42 | launch-active, founder-led Indian software product startups, about 2 to 20 people, with a launch or major release in the next 60 days. | launch-active, founder-led Indian software product startups, about **1 to 20 people, solo founders included**, with a launch or major release in the next 60 days. **[told by shivam-G05 on 2026-11-01]** |
| 45 | 1. Founder-led Indian product startups with a launch within 60 days. | 1. Founder-led Indian product startups**, solo founders included,** with a launch within 60 days. |

## What does not change

- Line 55 already gives a company range of 1 to 20 staff, so it stays.
- Every other segment 1 test stays: software product, India, a named founder, a launch or major release in the next 60 days, code on GitHub, no disqualifier.
- Line 48 still defers open-source maintainers and students. A solo maker of a free tool with no paid plan or business behind it is in that group, not segment 1.
- The market brief (`outputs/research/2026-10-30-motionrepo-market-brief.md`) stays as written, since it records what was researched on 2026-10-30.

## Further change: launch and video tests

Claude applied these on 2026-11-01 for the re-run, when shivam-G05 said "do h and a3". They are not yet a person's decision, and a person can reverse them.

- **Launch test:** a launch or major release in the last 30 days passes, as does one dated in the next 60 days. Line 62 already treats a launch just posted as a trigger.
- **Video test:** a product demo video lowers a lead's score and no longer rejects it. Lines 59 and 60 list it as a low-confidence signal, and the disqualifiers at lines 63 to 67 don't include it.
- **GitHub test:** an active GitHub account of the maker or company counts as evidence, recorded as inferred, because a private repo can't be seen.

If a person keeps these, line 42 should read "with a launch or major release in the last 30 days or the next 60 days", and line 45 "with a launch in that window".

## Why it fits the product

Starter is written for "one person launching their products" and has 1 seat. [repos/motionrepo/frontend/content/pricing.ts:36-60; repos/motionrepo/src/billing/plans.ts:58-83]

The open risk grows: whether one person pays Rs 3,199 a month plus GST was already unmeasured for teams, and is more doubtful for a maker with little revenue.
