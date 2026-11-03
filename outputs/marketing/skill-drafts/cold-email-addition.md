# Sign-up nurture: a section to add to `cold-email`

Task T-20261103-05. A draft for the coordinator to install after the human says yes. Nothing here has been written to `.claude/skills/`.

## Recommendation: a section in `cold-email`, not a new skill

1. **The skill already claims it.** Line 3 of `.claude/skills/cold-email/SKILL.md` says "Use for outreach sequences, replies and nurture emails", and marketing loads it. Its nurture coverage is thin, so the fix is to fill it in.
2. **The rule has to reach every agent that can start a sequence.** "One sequence at a time per person" only works if each agent that can message a person sees it. Those agents are `outreach` (cold sequences), `sales` (trial-to-paid follow-ups) and `marketing` (sign-up nurture), and they're exactly the three agents that load `cold-email`. A marketing-only skill would leave the other two unaware of it.
3. **One place for the shared checks.** Sign-up emails use the same shape rules (subject length, body length, one ask, opt-out line, `--type email` lint) and the same Never and Compliance sections, apart from the differences the section itself states (contact source, send-risk grades, follow-up cap). Two skills would carry two answers to the same question.
4. **No new preloaded skill for marketing.** Marketing goes from nine to twelve skills with the other three drafts; this keeps it from reaching thirteen.

Cost: `outreach` and `sales` carry 35 extra lines on every run. The section is kept short for that reason. If the founders would rather keep `cold-email` cold-only, the same text works as a new `signup-nurture` skill loaded by `marketing`, `sales` and `outreach`.

## Where it goes

Insert it as a new `##` section immediately before `## Never`. The Never and Compliance sections that follow still apply to it, except where the section's own "How this differs from cold email" paragraph says otherwise. No change to the frontmatter description is needed.

## Text to insert

---

## Sign-up nurture

For people who made an account and haven't paid. They aren't cold contacts: they asked for the product, so each email helps them use it. Never apply this section to someone who hasn't signed up. All of it is draft work; a person sends.

**How this differs from cold email.** The contact is the address the person signed up with, not a business contact published by the company or person. So the Compliance line that asks for a published business contact, and the Green, Yellow and Red send-risk grades that depend on it, don't apply here. The "two to three follow-ups" cap doesn't bind a plan either: the trial sets its length. Every other check in Never and Compliance still applies: real sender, a working way to reply, the opt-out line, no invented claims, the never-contact list, and the country rules.

**Held until a person rules.** `knowledge/company.md` line 39 says never contact "personal (non-work) email addresses". It doesn't say whether that covers people who gave us their address by signing up, and MotionRepo sign-in is GitHub only (`knowledge/products/motionrepo.md` line 66), so many sign-ups will use personal addresses. Until a person rules, sign-up emails are held, not drafted for sending: write a plan and template wording marked HELD if asked, draft nothing for a named person, and request no approval row for any send. Ask the coordinator to put the question to the founders.

**Before any draft** (once the hold is lifted)

1. A person gives you the facts: who signed up, when, what they've done. Name the source. Don't infer behaviour. Don't ask for a mailbox or a user list. Keep as little personal data as the plan needs: the draft, the roster and your RESULT carry an ID from the product's records, never an address.
2. The agent that drafts the step runs the suppression and never-contact check, using the address read from the sign-up record at check time, and uses it for the checks only. Check it and its domain against the suppression data (`pipeline/suppression.jsonl`, the list `node scripts/leads.mjs` reads; it matches an exact email or a whole domain) and against the never-contact list in `knowledge/company.md`. A match means no draft. A personal address means hold, unless a person has ruled sign-ups exempt; a competitor means hold and ask a person.
3. One sequence at a time per person, across every product. Look in the lead record (`pipeline/leads.jsonl`, looked up with the same check-time address), the pending rows in `ops/approvals.md` and `outputs/marketing/nurture-roster.md` (ID, sequence, step, date; no addresses). If one is open, don't start another, and say which. Once a sales conversation is open, sales owns the person and nurture stops.
4. Consent wording and country rules for sign-ups, India's DPDP Act included, go to a person. Don't guess the law.

**The plan, one per sequence.** Trigger. The one goal, as an event a person can see in product records, with a call to action the fact sheet allows. Exit events. A length no longer than the trial or offer the fact sheet states. For each email: up to two subject options (six words or fewer), a one-line purpose, a body inside the length limit above, one call to action, timing as days after the trigger, and a skip condition. Each email has one job: help them take the next real step, show something useful, or ask. Order the jobs so early emails help and show, and the ask comes after something useful. A proof email needs a proof-library row (`.claude/skills/proof-library/SKILL.md`); without one, show a real output. Use the same opt-out line as above.

**Exit.** Take the person out when they:

- pay;
- reply (follow `.claude/skills/reply-triage/SKILL.md`; sales owns them);
- opt out (hard rule 7: suppress at once with `node scripts/leads.mjs suppress <email> "<reason>"`. With a shell (outreach, sales), run it yourself now. Marketing has no shell: hand the opt-out to an agent that has one, or to a person, in that same message, and don't wait for your RESULT. Don't write the address into the draft, the roster or the RESULT. marketing-fallback has no Agent tool either: it lists the opt-out under `handoffs:` with the sign-up ID only, never the address);
- have a bounced address;
- have a support thread open (pause until it closes);
- reach the end of the sequence.

Remove their pending steps when they exit.

**Re-entry.** Only on a new trigger event, such as a lapse after a paid plan, after a gap a person sets, and with that person's yes. Never after an opt-out. Nobody re-enters a sequence they're still in.

**Check before every step**, not only at the start. Before each email a person checks the exit list and the suppression list that day. A person sends each email, or approves its exact text and sends it themselves, with the request in `ops/approvals.md`. No scheduling tool sends on its own.

**Measure** with counts a person supplies from the product's records: trial started, first output made, plan chosen, replies, opt-outs. Report them as X of N with the window. Write down the smallest sample worth reading, and the read date, before the first send (`.claude/skills/early-stage-guardrails/SKILL.md`); if N is below it, say "too thin to read". No tracking pixels or click-tracking links, no open-rate figures, no benchmarks. Branch only on events a person can see (paid, replied, opted out, support open), never on opens or clicks.

**Never** ask questions in an email to build a profile of the person: ask only what you need to help them. Never invent urgency; "your trial ends" is fine only when the fact sheet gives the trial length and the date is true. Extensions, longer trials and discounts go to the approvers. Until a person rules whether sign-up emails count toward the daily limit in `knowledge/company.md`, count them.

---

## Sources

Adapted from `email-sequence` in https://github.com/anthropics/knowledge-work-plugins (Apache-2.0) and `drip-campaigns` in https://github.com/gtmagents/gtm-agents (Apache-2.0, Copyright 2025 LaunchIQ AI, Inc.). Taken: exit conditions, re-entry rules, suppression when a person is in another sequence or has opted out or is in a support conversation, one job per email, and the idea of a value ladder (help and show before the ask). Left out: open-rate and click benchmarks, engagement branching, tracking, send-time tests, platform and CRM wiring, and progressive profiling.
