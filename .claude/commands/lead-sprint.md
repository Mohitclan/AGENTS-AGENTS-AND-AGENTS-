---
description: Research, find, score and draft outreach for leads for one product
argument-hint: <product-slug> [number of leads, default 15]
disable-model-invocation: true
---

Run a lead sprint for: $ARGUMENTS

1. Check with `node scripts/kb.mjs status` that `knowledge/products/<slug>.md` exists and is confirmed. If it isn't, stop and tell me what's missing.
2. If there's no market brief, channel map or competitor file for this product from the last 30 days, have the researcher produce them first and send them to the evaluator.
3. Have the lead-generator find and import the requested number of leads (default 15).
4. Send the batch to the evaluator (work type: lead batch). Mark the leads that passed as `qualified` and the ones that failed as `disqualified`, with the reason.
5. Have outreach draft sequences for tier A and B qualified leads, then send them to the evaluator (work type: outreach sequence).
6. Add the sends to `ops/approvals.md` and report: leads by tier, the best five with reasons, review scores, and what I need to approve.
