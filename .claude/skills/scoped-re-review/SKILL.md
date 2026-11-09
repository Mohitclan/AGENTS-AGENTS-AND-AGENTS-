---
name: scoped-re-review
description: How to re-review a revision, or wording changed after a PASS, by checking each earlier fix and only the changed lines, instead of redoing the whole review or skipping it. Use for review round 2 and later, and for any change after a PASS.
---

# Scoped re-review

Second rounds either redo everything (costly) or miss what the fix itself broke. "Wording changed after the PASS, not re-reviewed" should never appear in a report.

1. **Inputs:**
   - the last review's numbered fixes;
   - what changed since then: `git diff <reviewed commit>..HEAD` for code, or a diff against the reviewed copy for documents (the coordinator saves that copy at review time);
   - the specialist's fix log, if there is one.
2. **Give each earlier blocking fix a verdict** (non-blocking fixes weren't sent back, so don't check them), with file:line:
   - ADDRESSED;
   - NOT ADDRESSED;
   - WITHDRAWN (the earlier finding was wrong).
3. **Check only the changed lines for new problems**: new claims, new numbers, and old copies of corrected text elsewhere in the file (grep the whole file for the old words).
   - Re-open a source only when a fix added or changed a fact that rests on it. Sources the last round already verified stay verified. For new sources, check the ones a blocking fix depends on, at most about 5, in parallel.
4. **Out-of-scope observations are listed, but don't extend the loop** or change the verdict, unless one is an auto-fail or touches a hard rule.
5. **Read the self-review lines as typed claims**: ran, passed, edited, not edited. Check each against the output or the diff.
   - STALE: the check passed before a later edit to the same file. Re-run it.
   - PARTIAL: the exit code came from the last command of a chain.
6. **Re-score only the criteria the fixes touched.** Carry the others forward, with a note.
7. **For code, still run the covering tests yourself.** The code rubric needs your own run.
8. **A wording change after a PASS** gets this short check before the report.
9. **Write about 400 words:** the reviewed file and the verdict line, a table of the earlier blocking fixes (number, verdict, file:line), any new problem in the changed lines, the re-scored criteria. Don't repeat the first review. A batch re-reviewed in parallel gets one such file per part that had blocking fixes; parts that passed aren't re-reviewed.
