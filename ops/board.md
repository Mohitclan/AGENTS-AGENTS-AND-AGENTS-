# Task board

Kept by the coordinator, newest first. Statuses: `planned`, `in_progress`, `in_review`, `revise`, `fallback`, `passed`, `awaiting_approval`, `done`, `blocked`, `cancelled`.

| Task | Request | Agent | Status | Output | Review | Updated |
|---|---|---|---|---|---|---|
| T-20261030-02 | MotionRepo market brief, competitor file, channel map; answer Q2 (segments, first segment + region) and Q10 (competitors, dated prices, win/lose) | researcher | passed | outputs/research/2026-10-30-motionrepo-market-brief.md, knowledge/competitors/motionrepo.md (proposed), outputs/research/2026-10-30-motionrepo-channel-map.md | PASS 94/100 after 1 revision (r1 REVISE 78; outputs/reviews/T-20261030-02-r2.md) | 2026-10-30 |
| T-20261030-01 | Build MotionRepo fact sheet (slug `motionrepo`) from website + repo; add to CLAUDE.md Products table. Continued: apply answers from outputs/research/2026-10-30-motionrepo-open-questions.md, owner shivam-G05, leave Q2/Q10 open; then fill ICP + Competitors from T-02 | knowledge-base | passed (awaiting human `kb.mjs confirm`) | knowledge/products/motionrepo.md (proposed; answers applied, ICP + Competitors filled, Q2/Q10 cleared) | PASS 93/100 (outputs/reviews/T-20261030-01-review-r3.md; r2 PASS 86) | 2026-10-30 |

**Suggestions (not yet tasks):**
- knowledge-base: optional wording alignment N1 (buyer roles, lines 52 vs 71) and N2 (team size, line 55) before confirm. (from T-20261030-01 r3 review)
- researcher or human: open the unverified venues in a browser (LaunchPad India, r/developersIndia rules, directories/newsletters/podcasts section of the channel map); optional removal of the unsourced Canva ₹4,500 figure in knowledge/competitors/motionrepo.md line 93. (from T-20261030-02)
- lead-generator: segment 1 lead batch (launch-active, founder-led Indian startups) from Peerlist Launchpad, Product Hunt India, AIBoomi, GitHub orgs with a recent release. Wait for fact-sheet confirmation before any outreach. (from T-20261030-02)
- marketing: Peerlist + Product Hunt launch plan around "documents plus video from one run". (from T-20261030-02)
- developer/human: product decision on card/UPI checkout and a sign-up without GitHub (weak points vs RepoClip). (from T-20261030-02)
- developer: update the site (incl. live /security page "approved by hand") and README trial-approval text; sign-ups are now auto-approved (PR #39, `USER_AUTO_APPROVE`). (from T-20261030-01, answer Q4)
- developer: fix the GST mismatch: `frontend/content/pricing.ts` says prices are charged exactly as shown, but the live pricing FAQ says "+ 18% GST". Align code/site. (from T-20261030-01, answer Q3)
- knowledge-base: possible separate Own360 fact sheet, if the human confirms Own360 is its own product. (from T-20261030-01)
