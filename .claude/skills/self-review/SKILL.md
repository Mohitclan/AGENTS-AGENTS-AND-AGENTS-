---
name: self-review
description: The checks every specialist runs on its own work before handing it in, built from the fixes reviewers asked for most often. Use at the end of every task, before the RESULT block.
---

# Self-review before hand-in

Most first reviews came back REVISE for the same few reasons. Catch them yourself: a revision round costs the whole team plan quota, and the reviewer's time is for judgment, not for errors you could have seen.

Add a `## Self-review` section at the end of the deliverable: one line per check below that applies, marked `pass`, `fixed` or `n/a`, with the evidence (a command and its result, or a line number). Say `fixed` when you changed something because of the check. Never mark `pass` on a check you didn't run: the evaluator re-runs them, and a false `pass` is a REVISE item and a lesson in your memory.

## Every deliverable

1. **Re-read the brief.** Every item it asked for is there, at the path it named, in the shape it asked for. Nothing it didn't ask for was added.
2. **Counts and summaries match the body.** After any edit, recount: "3 of 13", "two leads", totals, tier counts, headings. A summary written before the last change is the commonest stale line.
3. **One answer per question across files.** If this file and the fact sheet, a lead record or an earlier deliverable disagree, flag it under questions. Don't silently pick one.
4. **Automatic checks run and clean:** `node scripts/check-links.mjs <file>` when there are sources, and `node scripts/lint-copy.mjs <file> --type <general|email|social|seo>` for anything a reader sees. Paste the last line of each.

## Anything a prospect or customer will read

5. **Every product claim traces to a confirmed fact-sheet line.** Keep a `## Claims used` table: claim as written, `knowledge/...md` line, the line's own words. If the words differ, the claim is stretched. These have failed review before:
   - "the same run" or "one run" for documents plus video (an automatic fail until the positioning proposal is confirmed);
   - prices not in the fact sheet's form (`₹3,199/month + 18% GST`, not "Rs 3,199");
   - "no yearly plan, so you can stop any time": a billing fact turned into a cancellation promise.
6. **One call to action per message.** A question at the end is the call to action; a second question or link is a second one.
7. **No pitch where the format forbids it.** A LinkedIn connection note introduces you ("I work on MotionRepo.") and asks nothing. "No pitch attached" followed by a pitch is a fail.
8. **Personal details come from the lead's evidence**, quoted or dated, and nothing beyond it: no day jobs, side projects or guesses about the person.
9. **The opt-out line is the agreed one** (see the cold-email skill) and separate from any question.
10. **Placeholders are only `{{SENDER_NAME}}`, `{{SENDER_ROLE}}`, `{{COMPANY_NAME}}`, `{{SENDER_EMAIL}}`**, and the "For the reviewer" notes say what a person must check in the wording before any send.

## Research, lead evidence and fact sheets

11. **"Not seen" is unknown, not fail.** A test fails only on something you read that rules it out. Say which pages you read.
12. **Published and inferred stay apart.** One evidence item states one thing the source says. Put your inference in its own item with `signal: inferred`, or in the notes.
13. **Dates are attributed.** "v0.59.0 was published on GitHub on 25 October", citing the page that shows the date. If two sources disagree, give both.
14. **Primary over secondary.** Cite the company's own page, the repo or the official post, not a summary, directory or search snippet. If you only have the secondary source, say so: "per <directory>, page not opened".
15. **A source you couldn't open is listed as not opened**, never cited as if read. A 403 or 404 is a finding.
16. **Contacts are published, with the page that shows them.** Never construct an address.

## Code

17. **The project's own checks ran** (tests, type check, lint) on your branch, with the commands and results. If one couldn't run, say exactly why and what a person needs to run.
18. **Every place the change touches was searched for**, including customer-facing text that repeats the old wording. List the ones you left alone and why.
