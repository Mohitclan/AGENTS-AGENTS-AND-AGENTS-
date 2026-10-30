# Credits

Some of the team's skills and checks draw on open-source work. Everything here was rewritten in our own words and adapted to our rules: drafts only, every claim sourced, and no paid tools. No code was copied. The code in `scripts/` is our own.

| Source | Licence | What we took |
|---|---|---|
| [cgallic/kai-cmo-harness](https://github.com/cgallic/kai-cmo-harness) (`harness/`, `knowledge/`, `scripts/quality_gates/`) | MIT for those paths; the rest of the repo is under the Elastic License 2.0, and we used nothing from it | The idea of automatic checks before review (banned words, unsourced numbers, external actions, cold-email rules, SEO), the gate log and repeat-failure mining, evidence tiers and data gaps, the prospect suppression rule, reply categories, tagged meeting prep and its score, the proof library, the hook families and four U's scoring, the positioning evidence ledger, founder-led LinkedIn, the channel score, outcomes declared before work starts, and fixing only the named failure on a retry |
| [shalintripathi/saas-marketing-agents](https://github.com/shalintripathi/saas-marketing-agents) (Copyright (c) 2025 Shivaa Tripathi) | MIT | Capability states, signal classes, the batch gate, inline gap markers, corroboration by independent channels and counts with denominators, the validated or assumed split, stalled-deal diagnosis, the objection register, demo gating, three-verdict gates, the "not yet" list and the language bank |
| [marketingtoolslist/awesome-marketing](https://github.com/marketingtoolslist/awesome-marketing) | MIT | Nothing adopted. It's a list of tools, mostly paid, with no agents or logic, and parts are out of date: for example, it still lists Google Optimize, which Google shut down in 2023 |

## Free tools that fit the ₹0 rule

From that list and our own use: Google Search Console, Google Analytics, Looker Studio, HubSpot's free CRM, the free tier of Ubersuggest, and BeeFree for email layouts. Check each tool's current free plan before relying on it.

## Left out on purpose

- Paid tools and anything needing an API key.
- Auto-sending, and sending from look-alike domains.
- The long persona files, because every line costs tokens on every run.
- Numbers quoted in those repos with no source.
- Their hosted services, and text in the Elastic-licensed parts that steers agents toward the author's own product.
- Legal rulings: they cover US, EU and Canadian email law, not India's DPDP Act. Country rules go to a person, as `knowledge/company.md` says.
