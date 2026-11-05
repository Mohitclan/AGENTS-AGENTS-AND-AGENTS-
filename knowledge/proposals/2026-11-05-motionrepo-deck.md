---
status: proposed
product: motionrepo
date: 2026-11-05
targets:
  - knowledge/products/motionrepo.md
---

# Proposal: what the MotionRepo pitch deck adds to, and disagrees with, the confirmed fact sheet

The user shared the MotionRepo pitch deck in chat on 2026-11-05. It is saved as `knowledge/decks/motionrepo.pdf` (13 slides, text in `knowledge/decks/motionrepo.txt`). `knowledge/products/motionrepo.md` is confirmed, so agents can't edit it. A person decides each row below, edits the file, then re-confirms it with `node scripts/kb.mjs confirm knowledge/products/motionrepo.md`.

Until then, agents use the confirmed sheet. Where the deck disagrees with it, the sheet wins, and the deck should not be sent to a prospect until the conflicts in part 1 are settled.

## 1. Conflicts: the deck and the confirmed sheet say different things

| # | Topic | Confirmed sheet says | Deck says | Decide |
|---|---|---|---|---|
| C1 | Number of tones | "14 tones, 3 formats (landscape, vertical, square) plus square loop" (line 79, from `site.ts:155`) | "Eight tones, from polished to playful, or match a video you like" (p.7) | Which number is true today? Fix the other source |
| C2 | Documents made | "a sales PDF and a technical PDF" (line 32, line 81) | "Three documents: a user guide, a technical guide and a sales deck" (p.5, p.8, p.12 "all three documents 1") | This is the sheet's open Conflict 5 (line 175). The deck sides with the env example's three. If three is right, change lines 32, 81 and 114 and close Conflict 5 |
| C3 | GST on prices | Quote every price as "+ 18% GST" (Pricing and plans) | ₹3,199 and ₹13,199 a month with no mention of GST (p.12) | Add "+ 18% GST" to the deck before it goes to anyone, or confirm the prices include it |

## 2. New claims the deck makes that the sheet doesn't have

Each needs a person to confirm it before agents state it as fact. Until then an agent must mark it `[UNCONFIRMED]` or leave it out.

| # | Claim | Deck page | Suggested place in the sheet |
|---|---|---|---|
| N1 | "A teaser in about ten minutes" | p.10 | Features, teaser row. A speed claim: needs a measured source before use |
| N2 | "Every video is checked first. If one fails, the last good version stays." | p.11 | Features, new row |
| N3 | Documents can be refreshed "yourself in one click", besides regenerate on push | p.8 | Features, regenerate row (line 84) |
| N4 | Tone names shown: Cinematic, Sketchbook, Polished, Bold, made "from the same real product. Nobody edited them." | p.6 | Demo assets: if those frames are real output, they are the first approved sample. Confirm before using |
| N5 | Use cases: product launches, agencies, sales teams, customer onboarding, release updates ("a 20-second clip"), investor updates ("two minutes") | p.9 | Ideal customer profile. Wider than the current first segment (founder-led Indian startups); a person decides whether outreach uses them |
| N6 | Positioning lines: "Your code, turned into a launch." and "You ship the product. We'll make the launch." | p.1, p.13 | One-liner or brand voice, if approved |

## 3. Where the deck agrees with the sheet (no change needed)

Plans and limits (Free Trial 14 days, 6 credits, 1 project, videos up to 1 minute; Starter ₹3,199, 15 credits, 5 projects, Full HD, no watermark; Pro ₹13,199, team of five, 50 credits, 25 projects, priority queue; Enterprise self-hosted, no credit limit) on p.12. Credit costs for teaser (2) and walkthrough (3 to 6) on p.12. Teaser 15 to 25 seconds and walkthrough 30 seconds to 3 minutes on p.5. Read-only access and choosing which repos it may see on p.4 and p.11. Revisions by note with the previous version kept on p.7. Self-hosting for enterprises on p.11. Wide, vertical or square with optional voice on p.7. Contact launch@panscience.xyz and motionrepo.panscience.ai on p.13. Free trial with no card as the call to action on p.13.
