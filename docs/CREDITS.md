# Credits

Some of the team's skills and checks draw on open-source work. Everything here was rewritten in our own words and adapted to our rules: drafts only, every claim sourced, and no paid tools. No code was copied. The code in `scripts/` is our own.

| Source | Licence | What we took |
|---|---|---|
| [cgallic/kai-cmo-harness](https://github.com/cgallic/kai-cmo-harness) (`harness/`, `knowledge/`, `scripts/quality_gates/`) | MIT for those paths; the rest of the repo is under the Elastic License 2.0, and we used nothing from it | The idea of automatic checks before review (banned words, unsourced numbers, external actions, cold-email rules, SEO), the gate log and repeat-failure mining, evidence tiers and data gaps, the prospect suppression rule, reply categories, tagged meeting prep and its score, the proof library, the hook families and four U's scoring, the positioning evidence ledger, founder-led LinkedIn, the channel score, outcomes declared before work starts, and fixing only the named failure on a retry |
| [shalintripathi/saas-marketing-agents](https://github.com/shalintripathi/saas-marketing-agents) (Copyright (c) 2025 Shivaa Tripathi) | MIT | Capability states, signal classes, the batch gate, inline gap markers, corroboration by independent channels and counts with denominators, the validated or assumed split, stalled-deal diagnosis, the objection register, demo gating, three-verdict gates, the "not yet" list and the language bank |
| [wshobson/agents](https://github.com/wshobson/agents) (`plugins/avoid-ai-writing`) (Copyright (c) 2024 Seth Hobson) | MIT | The idea of a tiered word list (always replace, flag in a cluster, flag only at high density), pattern groups by seriousness, weighting sentence rhythm, the AI-tool tracking-parameter warning (A18, from `references/pattern-catalog.md`) and the shapes of the pattern groups (vague attributions, chatbot leftovers, inflated importance, future-narrative closers). Used in `scripts/lint-copy.mjs` and `evaluation/voice-rules.json`. Our own word list, our own plainer-word suggestions and our own thresholds, rewritten, not copied. Every check only warns |
| [conorbronsdon/avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) (Copyright (c) 2026 Conor Bronsdon) | MIT | The upstream of the row above: the pattern catalogue and word tables the wshobson plugin derives from. Same use and same handling: ideas only, our own lists. The MIT notice is kept here because single words can't be reworded |
| [brandonwise/humanizer](https://github.com/brandonwise/humanizer) (Copyright (c) 2026 Brandon Wise) | MIT | The word-tier approach the wshobson `word-tiers.md` says it was adapted from. Same use and same handling |
| [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (`marketing/skills/brand-review`) | Apache-2.0 | The idea of screening copy for unsupported superlatives and comparisons ("the only", "fastest", "leading", "number one", "better than") and for quotations with no source. Used in `scripts/lint-copy.mjs`. Rewritten as our own patterns; nothing copied |
| [LaGrowthMachine/gtm-system](https://github.com/LaGrowthMachine/gtm-system) (`multichannel-campaign-builder`) (Copyright (c) 2026 LaGrowthMachine) | MIT | The idea of checking an email sequence as a whole: distinct subjects, step 1 never asks for a meeting, no kind of ask twice in a row, and no punctuation stuck to a URL. Used in `checkSequence` in `scripts/lint-copy.mjs`. Our own rules and wording. Its em-dash ban is the vendor's house style, so we did not take it: we warn on density and never ban (team decision, 2026-11-03) |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (`copywriting`) (Copyright (c) 2025 Corey Haines) | MIT | The idea of flagging lists of negations and trailing-clause pile-ons beyond the existing "it's X, not Y" patterns. Used in `scripts/lint-copy.mjs`. Our own patterns, for customer-facing types only; nothing copied |
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
