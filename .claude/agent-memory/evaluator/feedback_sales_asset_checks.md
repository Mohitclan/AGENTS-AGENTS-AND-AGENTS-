---
name: sales-asset-checks
description: For sales assets, hunt inferred contract terms in "so you can..." clauses, re-measure reported length, and check for stale body status text
metadata:
  type: feedback
---

Matching every number is not enough on a sales asset. Read Say lines for terms the author inferred, and measure length yourself.

**Why:** in T-20261030-03 every price matched, but "no yearly plan, so you can stop after the launch" was a contract term with no source, and the terms page was unpublished. The author reported about 650 words; `wc -w` gave 745. Self-hosting was also offered against "code goes to a third party" while it still runs on the customer's own Claude account.

**How to apply:** grep `knowledge/` for cancel, refund and lock-in whenever an asset implies freedom to stop. Run `wc -w` rather than trusting the reported count. Check that each remedy actually removes the objection. Read the fact sheet's "Common objections" section, which may say answers need human approval. Frontmatter `status:` governs, but report stale "proposed" body text. In Bash, avoid one command mentioning both kb.mjs and "confirm" (the guard blocks it even for a grep), and run a single simple command, because compound ones and inline scripts may need approval. See [[search-summary-claims]].

Also trace joined phrases part by part, and test "we make no claim" wording against the rest of the card. In r2 of the same task, "GST invoice" merged two sourced facts (invoice; plus 18% GST) that no primary source joins, and I had told sales to keep it in r1 while listing it as unverified. Never say "keep" about something you list as unverified. The same card said it made no claim about RepoClip's PDFs, yet its next step routed PDF buyers to us, which is the same claim by implication. Rendering: `node -e`, `python -c`, `awk`, `where` and `pdflatex --version` all need approval here, and no renderer is on PATH, so plan to estimate and say so.

On a re-review, reconcile the previous `wc -w -c` figures against the listed fixes: if the word and byte changes add up exactly, no other edit happened, without needing a saved copy. Run `check-links.mjs` with relative paths; an absolute path needs approval. When you write replacement wording, test it against the vendor's FAQ yourself: in r2 my "no GitHub account" fix missed that RepoClip needs GitHub for private repos.
