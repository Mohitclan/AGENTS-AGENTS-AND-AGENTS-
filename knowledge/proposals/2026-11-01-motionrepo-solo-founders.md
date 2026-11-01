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

## Why it fits the product

Starter is written for "one person launching their products" and has 1 seat. [repos/motionrepo/frontend/content/pricing.ts:36-60; repos/motionrepo/src/billing/plans.ts:58-83]

The open risk grows: whether one person pays Rs 3,199 a month plus GST was already unmeasured for teams, and is more doubtful for a maker with little revenue.
