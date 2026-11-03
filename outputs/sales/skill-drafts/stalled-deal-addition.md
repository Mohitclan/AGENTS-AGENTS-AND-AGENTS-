# Draft addition to `.claude/skills/stalled-deal/SKILL.md`

Task T-20261103-06, package P5, survey part B row 21. Revision 1. A draft: nothing here has been installed.

## Where it goes

Two edits to `.claude/skills/stalled-deal/SKILL.md`.

**Edit 1.** Insert the new section below directly after the `# Stalled deal` title and before `## First, name why it stalled`.

**Edit 2.** Change that next heading to `## If it went quiet, name why`.

---

## Quiet or declined?

- **Quiet:** they wrote to us at least once, then went silent. A lead that never replied is still in the outreach sequence.
- **Declined:** they said no, chose another option, left, the company closed, or they opted out.

A decline skips the cause table: record the reason in their words, with the option they chose, and stop writing. Retire it, or Watch it if the reason was timing and they gave a date.

- **An opt-out is always Retire.** `node scripts/leads.mjs suppress <email> "opted out on <date>"`; never Watch or Re-enter. `suppress` sets the lead to `disqualified`; don't also mark it `lost`.
- Silence and a plain "no" to a question are not opt-outs; if unsure, mark it needs a person.
- Never relabel a decline as stalled.
- **If the contact left the company,** a new person there is a **new contact**: they get their own fit and contact checks and their own approvals, and nothing carries over. Retire the old contact.

If quiet, rule out an auto-reply, a holiday or a date they gave, and wait for it. Use no fixed count of silent days. Then use the cause table. A "still a priority?" note gives its true reason for writing and a plain way to say no.

---

## Sources

- Louis Blythe, `Sales-Skills`, skill `ghost-recovery-sequences`: https://github.com/louisblythe/Sales-Skills/blob/main/skills/ghost-recovery-sequences/SKILL.md (seen 2026-11-03; the "Ghost vs Dead" part, lines 31-47; the dropped pretext lines are at lines 235-236, 261-262, 274 and 336).
- Licence: ideas only. The README says "MIT", but `LICENSE` returns 404 and the GitHub licence field is empty, so no licence is established. Every sentence above is our own; the shared-phrase check is in the README.
- **Adapted:** the split between a buyer who went quiet and one who declined, the "company went away" case, and the list of things that look like silence but aren't.
- **Dropped:** the pretext lines (a "cleaning out my pipeline" question, a "saw an article and thought of you" hook, a "was just helping a similar company" claim and a "saw the news" opener), because each gives a reason for writing that isn't true; the silence-day bands, which have no source; the 10 to 20% revival figure; the text-message and channel-rotation steps, since company policy allows only email and LinkedIn; the automated sending flows.
- **Revision 1:** Edit 3 (a line in `## When to stop`) was folded into the section, so there are two edits. An opt-out is always Retire, because suppression disqualifies the lead and the lead script allows `disqualified` back to `new`.
