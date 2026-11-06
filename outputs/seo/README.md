# SEO and AEO reports

One folder per product (`outputs/seo/<slug>/`), one report per run (`YYYY-MM-DD.md`), written by the `seo-aeo` agent.
Each report says what changed since the last run, what the agent fixed on a local branch in `repos/<slug>`
(never pushed), and the fixes a person has to make, ranked by impact. The sites it checks are listed in
`knowledge/seo-sites.md`.
