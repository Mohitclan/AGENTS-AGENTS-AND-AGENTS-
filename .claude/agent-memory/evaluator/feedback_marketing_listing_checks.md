---
name: marketing-listing-checks
description: For directory and launch listings, test plan-wide feature claims against the trial limits, catch roadmap words like "yet", check the author's claims about our own site against the live page, and score four U's per listing
metadata:
  type: feedback
---

A claims table that matches the sheet word for word is not the whole check on listings. Read every listing sentence for what it implies next to the CTA.

**Why:** in T-20261103-13 r1 all 15 claims rows were exact, yet:
- "Walkthroughs run 30 seconds to 3 minutes" sat beside a free-trial CTA, though the trial is capped at 1 minute.
- "does not fit yet" implied a SOC 2 and SSO roadmap.
- "Made for founders" had no sheet line, because the ICP is a hypothesis.
- The author's internal claim that the homepage samples were "fictional sample data" was wrong: `site.ts:149` and the live page say MotionRepo made them from Interlister.
- One listing had no hook, scoring Urgent 1, which caps the ICP criterion at 3.

**How to apply:**
- For each feature range, check the plan table for the trial limit.
- Grep the copy for "yet", "soon" and "coming".
- Fetch the homepage to test every statement the author makes about our own site.
- Score the four U's per listing, and say which pass mark (10 or 12) you used.
- The CTA must use the sheet's exact words. A venue-encouraged comment ask is fine as an addition, but say so.
- Test a hook's nouns against the sheet's feature names. A "hooks, not claims" label does not clear an implied claim. In r2 "one-pager" stretched "a sales PDF", and the repo blog showed the PDF has several pages. Grep the repo blog for the noun before ruling.
- An untracked deliverable has no diff. Say so when an author disputes what an earlier round quoted.

Related: [[outreach-checks]], [[sales-asset-checks]].
