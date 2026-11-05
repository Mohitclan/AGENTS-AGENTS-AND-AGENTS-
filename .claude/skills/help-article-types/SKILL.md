---
name: help-article-types
description: How to structure a help article - pick one type (getting started, how-to, reference, explanation, troubleshooting, FAQ, known limitation), title it in the customer's words, and write steps a new user can follow. Use for every help doc, guide and FAQ.
---

# Help article types

The help-doc rubric weights "a new user can follow it", "covers real questions" and "one task, numbered steps".

1. **One type per article.** Ask two questions: is the reader doing something or understanding something, and are they learning or working?

   | Reader is | Type |
   |---|---|
   | Doing and learning | Getting started, or a tutorial |
   | Doing and working | How-to |
   | Understanding and working | Reference |
   | Understanding and learning | Explanation |

   Support types: troubleshooting, FAQ, known limitation. If an article mixes types, split it.
2. **Titles in the customer's words**: the research-rigor language bank, or the exact error text ("Fix: video job stays queued").
3. **The first sentence states the task or the problem.** An FAQ answers in its first sentence.
4. **Getting started** covers one core outcome, such as the first video or doc from a repo. Keep it short and cut setup the reader doesn't need. Sections:
   - before you start (from confirmed facts: GitHub account, repo access, trial limits);
   - the steps;
   - "Check it worked";
   - next steps.
5. **Steps:**
   - numbered, one action each;
   - place before action ("On the **Projects** page, click...");
   - goal before action ("To regenerate the docs, ...");
   - "Optional:" as a prefix;
   - the result after the action;
   - UI labels in bold, exactly as the product's strings;
   - no "above", "below" or "please".
6. **Troubleshooting**: the symptom first, then the cause in plain words, then the most likely fix first, then "Still stuck?" with the confirmed support channel.
7. **Known limitation**: what doesn't work, and the workaround. Never a fix date (timeless-wording).
8. **Step trace.** For each step, keep the evidence that the button, page or command exists: repo path:line or a live URL with the date. A step with no evidence is marked `[VERIFY]`.
9. **Metadata block**: type, audience, date checked, code sources, review-by date.

## Never

- Sign in to the product or enter credentials to check a step. A person does that.
- Promise a fix date.
