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
7. **Opt-out:** "If this isn't relevant, reply 'no' and I won't write again."

Under 120 words. Read it aloud; if a sentence sounds like an ad, cut it.

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
