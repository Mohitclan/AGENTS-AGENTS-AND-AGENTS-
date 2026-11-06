---
status: confirmed
owner: founders
last_verified: 2026-11-06
sources:
  - the products table in CLAUDE.md (websites), copied on 2026-11-06
  - told by the founders in chat on 2026-11-06 (the MotionRepo and TestPilot repositories and websites); pitchlight and peelpress repositories found in the organisation, not yet confirmed
---

# Sites for SEO and AEO

The `seo-aeo` agent reads this file at the start of every run. Each row is one website it audits for search engines
(SEO) and for AI answers (AEO). When the row names a GitHub repository the agent can clone, it fixes what it can in
the code on a local branch (never pushed). Everything else goes into its report as fixes for a person.

**To add or change a site:** edit the table, then confirm the file with `node scripts/kb.mjs confirm knowledge/seo-sites.md`.
Agents can't edit a confirmed file, so they never change this list themselves.

| Slug | Website | GitHub repository | Framework (if known) | Pages that matter most | Notes |
|---|---|---|---|---|---|
| motionrepo | https://motionrepo.panscience.ai | PanScienceInnovation/Collateral-Pipeline | unknown | home, pricing, docs | Repository given by the founders on 2026-11-06. The active GitHub login (Mohitclan) can't open it yet: give it read access, or the agent audits the live site only |
| testpilot | https://testpilot.panscience.ai | PanScienceInnovation/Test-pilot | unknown | home, pricing | Repository given by the founders on 2026-11-06. The active GitHub login (Mohitclan) can't open it yet: give it read access, or the agent audits the live site only |
| pitchlight | https://pitchlight.panscience.ai | PanScienceInnovation/pitchlight | unknown (repository is mostly Python) | home, pricing | Repository found in the PanScienceInnovation organisation on 2026-11-06 (readable by the active login); a person confirms it is the one behind this site |
| peelpress | https://peelpress.panscience.ai | PanScienceInnovation/peelpress | unknown (repository is mostly JavaScript) | home, pricing | Repository found in the PanScienceInnovation organisation on 2026-11-06 (readable by the active login); a person confirms it is the one behind this site |

## Columns

- **GitHub repository:** `owner/name`. `unknown` means the agent only audits the live site and reports fixes for a person.
- **Framework:** Next.js, Astro, a Vite or React app, plain HTML, a site builder (Webflow, Framer, WordPress). The agent
  finds out itself when it can read the code; write it here when the site is built in a tool with no repository.
- **Pages that matter most:** the pages it checks first and in most depth. It also follows the sitemap.
- **Notes:** anything it should know, for example "the blog is on a separate platform" or "don't touch the pricing page".
