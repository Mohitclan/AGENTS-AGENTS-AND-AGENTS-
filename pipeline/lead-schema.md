# Lead format

`pipeline/leads.jsonl` holds one lead per line. Only `node scripts/leads.mjs` writes it; a hook blocks direct edits.

## Adding leads

1. Write a batch to `pipeline/inbox/YYYY-MM-DD-<product>-<n>.jsonl`, one JSON object per line.
2. Run `node scripts/leads.mjs import pipeline/inbox/<file>.jsonl`.
3. If the script lists problems, nothing was imported. Fix every problem and run it again.

The script assigns each lead an ID from its domain and product, so importing the same company for the same product again updates the existing lead instead of creating a duplicate. It also computes the score and tier.

## Fields in a batch

| Field | Required | Notes |
|---|---|---|
| `company` | Yes | Company name |
| `website` | Yes | `https://...`; its domain is used to detect duplicates |
| `product` | Yes | Slug of a product with a file in `knowledge/products/` |
| `segment`, `industry`, `country`, `size` | No | Free text |
| `fit_reason` | Yes | Why this company fits the product, at least 20 characters |
| `evidence` | Yes | List of `{ "claim": "...", "url": "https://...", "signal": "published" }`, at least one. `signal` is optional: `published` (they said it), `observed_gap` (visible on their public surface) or `inferred` (our guess, which sets timing only). See the signal-outreach skill |
| `score_breakdown` | Yes | Whole numbers: `icp_fit` 0-40, `need_evidence` 0-30, `timing` 0-20, `reachability` 0-10 |
| `score_rationale` | Yes | One line explaining the score |
| `contact` | No | `{ "name", "role", "channel", "value", "source_url" }`. `channel` is `email`, `linkedin`, `form`, `phone` or `other`. `source_url` must show where the contact was published |
| `next_action` | Yes | The next step for this lead |
| `researched_at` | Yes | `YYYY-MM-DD` |
| `researched_by` | No | Defaults to `lead-generator` |
| `status` | No | `new` (default) or `disqualified` with a `disqualify_reason` |

## Scoring

| Part | Max | What earns points |
|---|---|---|
| `icp_fit` | 40 | Industry, size, region and buyer role match the product's ICP |
| `need_evidence` | 30 | Public evidence of the problem: job posts, reviews, complaints, tooling gaps |
| `timing` | 20 | A recent trigger: funding, hiring, launch, new regulation, contract renewal |
| `reachability` | 10 | A published route to the right person |

Tier A is a score of 75 or more, tier B is 50-74 and tier C is below 50.

## Statuses

`new` → `qualified` (passed review) or `disqualified` → `drafted` (outreach written) → `approved` (human approved sending) → `contacted` (human sent) → `replied` → `meeting` → `trial` → `won` or `lost`.

Change a status with `node scripts/leads.mjs set-status <id[,id...]> <status> "<note>"`. A note is required for `disqualified`, `approved`, `contacted`, `won` and `lost`. Setting the status a lead already has only adds the note to its history.

The script allows only these moves:

| From | To |
|---|---|
| `new` | `qualified`, `disqualified` |
| `qualified` | `drafted`, `disqualified` |
| `disqualified` | `new` |
| `drafted` | `approved`, `qualified` (redraft), `disqualified` |
| `approved` | `contacted`, `drafted` |
| `contacted` | `replied`, `lost` |
| `replied` | `meeting`, `trial`, `won`, `lost` |
| `meeting` | `trial`, `won`, `lost` |
| `trial` | `won`, `lost` |
| `won` | none |
| `lost` | `qualified` |

`approved`, `contacted` and `won` record a person's decision, so Claude Code asks a person before an agent sets them. To correct a mistake, add `--force`; that asks too, and the history marks the change as forced.

## Example batch line

```json
{"company":"Example Goods","website":"https://example.com","product":"your-product-slug","segment":"Mid-size D2C brands","industry":"E-commerce","country":"India","size":"51-200","fit_reason":"Sells online across three marketplaces and is hiring a support lead to handle rising ticket volume.","evidence":[{"claim":"Careers page lists a customer support lead role citing growing ticket volume","url":"https://example.com/careers"}],"score_breakdown":{"icp_fit":32,"need_evidence":24,"timing":15,"reachability":6},"score_rationale":"Strong fit and a public hiring signal; no named contact yet.","contact":{"name":"","role":"","channel":"form","value":"https://example.com/contact","source_url":"https://example.com/contact"},"next_action":"Draft outreach through the contact form referencing the support-lead hire.","researched_at":"2026-10-29"}
```

## Before outreach

`node scripts/leads.mjs gate --product <slug>` gives each qualified lead a verdict (add `--status all` for every status):

- **Go:** reviewed, and ready for drafts.
- **Not reviewed:** still `new`, so it can't be a Go yet. Any concerns are listed.
- **Conditional:** a person decides: non-email or LinkedIn contact, a support-only inbox, research over 90 days old, tier C, evidence with no signal class, only inferred signals, or a newest signal over 60 days old.
- **Stop:** suppressed, disqualified, on hold, no published contact, or no current evidence. Fix it at the source and run the gate again.

A Go still doesn't read the claims, so a passed review is what clears them.

Signal age comes from an evidence item's optional `dated` field (when the event happened), or else the date we saw it.

## Hold, corrections and next actions

- `node scripts/leads.mjs hold <id> "<reason>" --owner <who>` stops all outreach to a lead while a person decides. `release <id> "<note>"` lifts it, and Claude Code asks a person first.
- `node scripts/leads.mjs supersede <id> <n> "<why>"` marks evidence item n as wrong or out of date. It stays in the record but no longer counts, and `show` lists it last.
- `node scripts/leads.mjs next <id> "<action>"` updates a lead's next action.

## Contact quality

The gate shows each lead's contact quality:

| Quality | Example | Reachability cap |
|---|---|---|
| direct | A named person's published address or LinkedIn profile | 10 |
| general | hello@, info@, contact@, team@ | 5 |
| support | support@, help@, billing@ | 3, and never a Go |

The import refuses a score above the cap.

## Suppression

`node scripts/leads.mjs suppress <domain|email> "<reason>"` adds an opt-out to `pipeline/suppression.jsonl`. It applies across every product: open leads are disqualified at once, imports are refused, and a suppressed lead can't move to `drafted`, `approved` or `contacted`. A domain covers the whole company; an email address covers that person. Removing an entry is a person's decision, made by editing the file.

## Other commands

```bash
node scripts/leads.mjs list --product <slug> --status qualified --tier A
node scripts/leads.mjs show <id>
node scripts/leads.mjs check
node scripts/leads.mjs export-csv
```
