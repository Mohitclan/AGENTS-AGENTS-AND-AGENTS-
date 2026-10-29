---
description: Add a product to the knowledge base by building its fact sheet from the website and repo
argument-hint: <product name> <website url> [owner/repo]
disable-model-invocation: true
---

Add this product to the knowledge base: $ARGUMENTS

1. Have the knowledge-base agent build `knowledge/products/<slug>.md` from the template, using the website and repo given, and add the product to the Products table in CLAUDE.md.
2. Send the fact sheet to the evaluator (work type: product fact sheet).
3. Show me a short summary: what the product does, the ICP, the pricing found, any conflicts between sources, and the open questions.
4. Ask me to answer the open questions. Once I've reviewed the file, I confirm it with `node scripts/kb.mjs confirm knowledge/products/<slug>.md`.
