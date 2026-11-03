---
name: cold-email
description: How to write honest, short cold emails, LinkedIn notes and follow-ups that get replies, and the compliance checks every draft must pass. Use for outreach sequences, replies and nurture emails.
---

# Cold email

## Shape of a first email

1. **Subject:** six words or fewer, specific, lowercase is fine. Never "Re:" or "Fwd:" on a first email.
2. **Opening line:** one fact from the lead's own evidence, e.g. the job post, the review, the launch. No "Hope you're well".
3. **Their problem**, in the words their evidence uses.
4. **One outcome** our product delivers, from confirmed facts only. One, not a feature list.
5. **One small ask:** "Worth trying on one repo?" or "Should I send a sample?" Check the product's fact sheet first: use only offers it allows, and only assets that exist. Not "book a demo on my calendar".
6. **Signature:** a real person's name and role, the company and website.
7. **Opt-out:** "To opt out, reply 'stop' and I won't write again." Never use "no" as the opt-out word: a plain no to a question must not become a permanent block.

Under 120 words. Read it aloud; if a sentence sounds like an ad, cut it.

**Links.** Put each link on its own line with nothing after it: no full stop, comma, bracket or quotation mark. Punctuation stuck to a link can become part of it and break it. The line before says what the link is and ends with a colon, for example "Your sample is here:". If the ask is the link, that line is the ask. This holds for every message you draft with this skill, including follow-ups, replies and LinkedIn messages. Use only links from the fact sheet or the lead's evidence. A link in the signature sits on its own line too.

## Follow-ups

Two to three, spaced 3-5 working days apart. Each adds one new thing: a short resource, a relevant proof point, a different angle. Never "just bumping this". The last one closes politely and leaves the door open.

## LinkedIn

Connection note under 300 characters, tied to the same evidence, no pitch. One follow-up after they accept.

## Structure and variants

Think hook, bridge, call to action: their situation, why it matters to them, one small ask. For each lead, offer up to three angles and pick the one its evidence supports best: pain first, insight first or proof first. No proof means no proof-first version.

Never open with "I came across", "I wanted to reach out", "I noticed", "We help companies like yours", or any first sentence starting with "I".

Grade the send risk before handing in:

- **Green:** published business contact, fresh published signal.
- **Yellow:** older signal, or a gap-based opener.
- **Red:** inferred signal or an unclear contact. Don't draft; flag it.
- **Hold:** the copy is fine but a policy question is open, such as whether the lead counts as a competitor. Put the lead on hold with `node scripts/leads.mjs hold`. Nothing goes out until a person releases it.

Run `node scripts/lint-copy.mjs <file> --type email` before you hand in. It checks every email's subject, length, opener and opt-out line. A clean run says nothing about whether claims are true.

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

## Never

- Invented familiarity ("loved your post") unless the evidence includes that post.
- Invented results, customers, urgency, scarcity or discounts.
- Misleading subject lines, fake threads, or pretending to be a customer.
- Contacting anyone on the "never contact" list in `knowledge/company.md`, or anyone who opted out.

## Compliance check before handing in

- Real sender and a working way to reply.
- Opt-out line present.
- Business contact published by the company or person, with its source recorded.
- For contacts in the EU, the UK, the US or India, follow the outreach policy in `knowledge/company.md`; if it doesn't cover a country, flag it for the human instead of guessing the law.
