---
name: outreach-checks
description: For outreach sequences, test our claims against our own repo, read the lead's product against our pitch and competitor categories, and count every email
metadata:
  type: feedback
---

Matching prices is not enough on outreach. Test how the product is described against the repo, and read what the lead sells.

**Why:** in T-20261030-07 every number matched and lint-copy passed, yet "from the same run" was a labelled hypothesis in `knowledge/` that `repos/motionrepo/docs/architecture.md` contradicted ("A separate pipeline"). Repowise was pitched on stale docs while selling docs that rebuild on every commit, and it publishes "repowise vs DeepWiki", a listed competitor type. My lead reviews had said "no disqualifier" without comparing categories.

**How to apply:**
- Grep `knowledge/` for the pitch's key phrase. "Hypothesis" in a confirmed file is still not a fact. Then check `repos/<slug>/docs` and `frontend/content`.
- Open the lead's features page and its comparison posts. Compare what it makes against each competitor category, not just names, in lead reviews too. A category overlap is a human question ("never contact competitors" doesn't say whether indirect counts).
- lint-copy now loops over every email (`checkEmails`), but count bodies yourself with `sed -n 'a,bp' file | wc -w` (run alone it passes).
- Untracked drafts have no git diff. Prove "nothing else changed" with line offsets from r1's cited lines plus word-count deltas; prove a table landed with `sed ... | md5sum`, one per call (`node -e` and chained `diff` need approval).
- In a reply play-through include auto-reply, bounce, mixed answers and a "no" to a follow-up with no question. T-20261101-09 r2: an auto-reply fell to "Anything else" and would have counted.
- Check labels against content: "no pitch attached", "a different angle", "now has". Work out the weekdays of a day-offset schedule and compare the outcome window with the last send.
- Convert UTC dates to the lead's timezone if near midnight.
- Before naming another file in a handoff, read the actual line: a phrase hit can be true in context (the battlecard's "same run" is about two PDFs).
- Every reason that lowers a score needs a numbered fix. In T-07 r1 "Emails 2 and 3 have nothing lead-specific" had none, so it decided r2 after all fixes were done.
- After moving a sentence, reread what comes next: "If that works for you" lost its referent in T-07.
- A PASS on a lead the gate shows as Go reads as clearance. With a human question open, state both ("PASS on copy, question open") and check the blocker is on the lead record, not only in the draft.
- Fix text I write gets the same test as the agent's: in T-07 r3 my "here is what it costs" gave credits with no credits-per-month. Check a coordinator action from the last round was done before relying on it; the blocker was still only in the draft at r3.
- Play each possible reply through the email, stop rules and metric. In T-20261101-09 a yes-or-no Email 1 plus the stock "reply 'no'" opt-out gave "no" several meanings, "yes" hit two conflicting stop rules, and `list --status replied` is current status only.
- Check the greeting against who the evidence says runs it ("team" on a "made by one person" product), and read subjects cold: "your code" reads as if we hold it.
- Run scripts as a single relative command (`node scripts/x.mjs ...`), one per call: chained or absolute-path forms ask for approval.
- `curl` even in a pipe needs approval here; don't work around it, report the limit. Related: [[lead-batch-checks]], [[sales-asset-checks]].
