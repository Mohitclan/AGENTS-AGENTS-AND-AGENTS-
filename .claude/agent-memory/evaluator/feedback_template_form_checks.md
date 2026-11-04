---
name: template-form-checks
description: How to review fill-in forms and templates that agents later convert into knowledge files (internal guides about our own system)
metadata:
  type: feedback
---

For a form or template that agents convert into knowledge files, test the form's statements about our system against the real files, not against the brief.

**Why:** in T-20261104-15 r1, lint was clean and the coverage was excellent. The REVISE items were all claims about our own system: a "N new sections" count that missed four (check against `_template.md`, not the product sheet); a timing rule contradicting the knowledge-base agent file; a "never-contact list" for competitors when the real mechanism is the lead's `competitor` field; a frontmatter block that `scripts/_shared.mjs` frontmatter() can't parse (must be line 1, and keys can't contain spaces).

**How to apply:**
- Grep every "agent X reads Y" mapping row against the agent file and its skills, both ways: rows naming a reader that doesn't exist (`stage`), and readers left off a row.
- Simulate the copy instructions literally: what is line 1 of the copied file, and does the parser accept it?
- A "default = internal/blank" rule plus tables without that column means undefined conversion. Check every table for the column.
- A form that sets a gate (e.g. "not selectable until confirmed") is policy. Flag it for a person when it is stricter or looser than CLAUDE.md.
- The 2a "minimum" list: test it against the product we already sell. If that product would fail, the minimum pushes fillers to invent.
- Coverage test (r2): check field enums against the file that defines them (`lead-schema.md` signal classes, not the agent file), probe `lint-copy` with a product name containing a hard word or "Todo", and look for support/SLA/retention rows that `proposal` line 26 needs.
- A mechanism written in the present tense ("confirm from the UI") must exist today; otherwise name the current one (`kb.mjs confirm`).
- Before suggesting a rewrite, test it against the confirmed product sheet: my r1 "any lead that matches a competitor row" would Stop MotionRepo's agency segment (indirect row), and my "tell the coordinator the same day" was weaker than hard rule 7's "at once". Correct my own wording in writing next round.

- r3: test every "default X, a person can change it" against the form's own "never looser" line and `company.md`. A filler is a person, so "default `yes` for direct competitors" let a form loosen never-contact. Also compare each coordinator answer with how it was worded ("direct yes" had become a default).
- Self-review `grep -c` counts usually leave out the self-review's own lines. Re-run them, and call it a wording fix, not a false pass.

Related: [[revision-round-checks]], [[guide-proposal-checks]]
