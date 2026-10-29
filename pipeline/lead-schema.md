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
| `evidence` | Yes | List of `{ "claim": "...", "url": "https://..." }`, at least one |
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

Change a status with `node scripts/leads.mjs set-status <id[,id...]> <status> "<note>"`. A note is required for `disqualified`, `approved`, `contacted`, `won` and `lost`.

## Example batch line

```json
{"company":"Example Goods","website":"https://example.com","product":"your-product-slug","segment":"Mid-size D2C brands","industry":"E-commerce","country":"India","size":"51-200","fit_reason":"Sells online across three marketplaces and is hiring a support lead to handle rising ticket volume.","evidence":[{"claim":"Careers page lists a customer support lead role citing growing ticket volume","url":"https://example.com/careers"}],"score_breakdown":{"icp_fit":32,"need_evidence":24,"timing":15,"reachability":6},"score_rationale":"Strong fit and a public hiring signal; no named contact yet.","contact":{"name":"","role":"","channel":"form","value":"https://example.com/contact","source_url":"https://example.com/contact"},"next_action":"Draft outreach through the contact form referencing the support-lead hire.","researched_at":"2026-10-29"}
```

## Other commands

```bash
node scripts/leads.mjs list --product <slug> --status qualified --tier A
node scripts/leads.mjs show <id>
node scripts/leads.mjs check
node scripts/leads.mjs export-csv
```
