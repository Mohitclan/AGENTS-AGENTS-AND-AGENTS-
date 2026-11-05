---
name: atomic-fact-check
description: How to check a fact-sheet line or proposal by splitting it into single facts, finding the hidden joins between them, and answering a verification question for each from the source alone. Use for new or changed fact-sheet lines and claims used in customer-facing work.
---

# Atomic fact check

A line can be built from true facts and still say something false. "18% GST" plus "invoice" is not "a GST invoice" (main memory lesson, 2026-10-30).

1. **Split each new or changed line into atomic facts**: one subject, one property, one value.
2. **Make each fact stand alone.** Replace "it", "this plan" and "the trial" with full names. Add the scope: plan, date, currency.
3. **Find the joins.** Words like "and", "with", "from one", "the same" and "so" link two facts. The link is its own fact and needs its own source (claim-check).
4. **Verification questions, answered blind.** For each fact, write a question ("What starts the video job?"). Answer it from the source alone (repo path:line, a live URL, or a person) without looking at the draft line. Then compare the two.
5. **A verdict per fact:**
   - supported (source and date);
   - contradicted (record both under Open questions; never pick a side);
   - not found (leave it empty, and add a question);
   - out of scope.
6. **Keep a facts table**: id, atomic fact, source, date verified, verdict. A compound line lists its fact ids.

Atomising a whole sheet costs many tokens. Do it for new or changed lines, and for claims about to be used in customer-facing work.

## Never

- Use a search snippet as evidence. Open the page (fact-sourcing).
- Merge two dated values into one. Keep both, with their dates, in the Changes log.
