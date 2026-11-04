---
name: verify-before-reporting
description: How the coordinator checks what specialists say they did before repeating it to a person - treat RESULT blocks as claims, re-run quick checks, write report facts as typed claims, and keep a ledger in long chains. Use before every report.
---

# Verify before reporting

A specialist's report can describe an edit it didn't make. A person acts on what our report says, so every line in it must be true when you write it.

1. **Treat each specialist's RESULT block as claims, not facts.** Before a report line repeats one:
   - grep the file for the edit;
   - for code, read `git log` and the diff;
   - re-run the one-line commands whose results you quote (lint-copy, check-links, `leads.mjs check`), after the last edit.
2. **Write report facts as typed claims** (ran, passed, edited, not edited, nothing sent), each with its command or file:line. If the file changed after the check, mark the claim STALE and re-run the check.
3. **Keep a ledger in long chains.** For each step: the file or commit, the review round and any ruling, written into the report draft as you go. After a long context, trust the ledger and `git log` over memory.
4. **Wording changed after a PASS?** Send it for a scoped re-review (scoped-re-review) before you report.
5. **No "should", "probably" or "all pass"** in Result lines. Give the counts: "lint-copy on 7 files: 0 failed, 0 warnings".
6. **Say what you didn't check.** "Not verified: <thing>, because <reason>" is better than silence.

## Never

- Put personal data in the ledger.
- Correct a past report silently. Add a dated "Update after this report" line.
