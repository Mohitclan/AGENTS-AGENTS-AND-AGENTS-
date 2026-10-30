---
name: claim-check
description: How to grade what our product can actually do before anyone says it to a prospect. Use whenever you write or review a statement about a feature, an integration, security, a timeline or a result.
---

# Claim check

A feature in the docs or the code doesn't prove it works for this buyer. Grade each claim before using it.

| State | Meaning | How to say it |
|---|---|---|
| Supported today | Live, and a person or test has seen it work | State it plainly |
| Supported with effort | Works, but needs setup or a workaround | State it and name the effort |
| Roadmap, no date | Planned or built but switched off | "Not available today." Never give or imply a date |
| Not supported | It doesn't do this | Say so, then say what it does instead |

## Rules

1. Name the source for the grade: a fact sheet line, a repo path, or "told by <person> on <date>".
2. Give the same answer in every document. If two files disagree, stop and flag it; don't pick one.
3. "I don't know" is a valid answer. Record it as a question with an owner, not a guess.
4. A claim about an AI feature names which model does the work and when that was last checked.
5. Don't stretch a claim: "supports GitHub" doesn't mean "supports private GitHub repos" unless a source says so.
6. Joining two true facts can make a new, unproven claim. "18% GST" plus "invoice" isn't "GST invoice". The joined claim needs its own source.

## Gaps in drafts

Mark anything you couldn't settle inline, so it can't slip through:

- `[NEEDS INPUT: what's missing, who can answer]` for a fact you lack. The automatic check fails a draft with one left in.
- `[NEEDS APPROVAL]` for a commitment only a person can make.
- `[UNCONFIRMED]` for a fact from a file that isn't confirmed yet.
