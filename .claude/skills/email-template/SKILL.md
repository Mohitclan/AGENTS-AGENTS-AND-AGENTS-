---
name: email-template
description: The house template for writing outreach emails. First emails follow a fixed layout ("I came across <company> and noticed that ...", ending with a walkthrough offer and a "Best regards" signature); also forward emails, follow-ups and LinkedIn notes, with exact length, subject, structure and wording rules. Use for every outreach or sales email draft.
---

# Email template

The house style for every outreach email: conversational, one person writing to another. Where this skill and `cold-email` differ on wording, length, subject or follow-ups, this skill wins. `cold-email` still owns compliance: the opt-out line (except on the first email, see below), links on their own line, send risk, the never-contact list and the lint run.

## First email

Every first email follows this layout, given by the human on 2026-11-10, and nothing else: no extra paragraph, line or opt-out line. Keep the fixed wording exactly; fill each `<...>` from the lead's evidence and the product's confirmed fact sheet. `{{...}}` are left as they are: `scripts/send-email.mjs` fills them from `ops/mail-config.json`.

```
Subject: <2-5 words about them>

Hi <first name>,

I came across <company> and noticed that <one specific, sourced observation: their product, a recent launch, a post, a hire>.

With <the business activity or challenge behind that observation>, <the specific problem our product solves> can often take valuable time and resources away from <their core priorities>.

I'm from the {{COMPANY_NAME}} team, and we <briefly what the product does, present tense> to help <target audience> achieve <key benefit or outcome>.

<Optional: one proof point, result, use case or attached resource, from confirmed facts only. Leave the whole paragraph out if there is none.>

I'd be glad to walk you through how <product> could help <company> on a short call or briefing, whenever suits you.

Best regards,
{{COMPANY_NAME}}
```

1. **Subject:** 2-5 words, sentence case with a capital first word, about them: "their thing + topic", e.g. "Acme's release videos". Never about us, never "Re:" or "Fwd:".
2. **The observation** is one real fact from the lead's evidence, specific enough that it couldn't be sent to another company. Never a guess dressed as a fact.
3. **The problem line** names the problem our product solves for them, in plain words. If it's a guess about their situation, keep "can often", which already says so.
4. **"and we ..."** keeps the template's shape exactly: "and we <verb what the product does> to help <audience> achieve <outcome>", e.g. "and we turn a GitHub repository into launch videos and product PDFs to help software teams achieve a polished launch without a video team". Don't swap it for "we built <product>, which ...". The product is named in the closing line. Confirmed facts only; never "we're building", "beta" or "pilot".
5. **The proof paragraph** is optional: one proof point, result, use case or attached resource, from confirmed facts only. It states something about the product, never a condition or a question ("if your code is on GitHub..."). None is better than a weak one. If a deck or file is attached, name it here ("I've attached our two-page overview").
6. **The closing line** is the offer of a walkthrough, worded as above. Don't add a second question or a booking link.
7. **Signature:** only `{{COMPANY_NAME}}` under "Best regards,": no person's name or role, since the email speaks for the team ("I'm from the {{COMPANY_NAME}} team", the human's wording on 2026-11-10). Nothing after it: no opt-out line (the human's choice on 2026-11-10, replacing the 2026-11-05 "keep opt-out" choice for first emails). Follow-ups keep their opt-out line. Write the line as `{{COMPANY_NAME}}`, never a signature of your own: when the email is sent, `scripts/send-email.mjs` shows the company's logo signature (`docs/brand/email-signature.html`) in its place.

Body about 90-110 words; the whole email, with greeting and signature, stays under 150 (the copy checker's limit). Use contractions.

## Forward email (when we can only reach a colleague or general inbox)

- 50-80 words, two parts: a 2-line ask to the person we reached, then a few lines written for the real owner that read well when forwarded.
- Subject about their company, never "Please pass to…". Name the owner only if research found them.
- Never "you're the person I could reach".
- **Senior people are never asked to forward** (CXO, founder, MD, VP, partner, general counsel, director). They get a normal first email, which may ask whether it sits with their team.

## Follow-ups and the last email

Every sequence is three emails: the first email, one follow-up and the last email. Each follows its fixed layout below, set on 2026-11-10 when the founder asked for "the template used, and with signature on every email" (see `docs/EMAIL-TEMPLATES.md`). Keep the fixed wording exactly; fill each `<...>`. All three sign off with "Best regards," and `{{COMPANY_NAME}}`, which `scripts/send-email.mjs` turns into the logo signature; lint-copy fails an email without it. The follow-up and the last email go in the same thread and end with the opt-out line under the signature.

**Email 2, the follow-up** (4 working days after the first email, only if there's no reply; body 45-75 words):

```
Subject: Re: <email 1's subject, exactly>

Hi <first name>,

My note on <the weekday email 1 goes, or "last week"> was about <the topic of email 1's observation, in a few words>.

We <what the product does, present tense, shorter than in email 1> to help <company> <the key outcome>.

<Optional: one new thing from confirmed facts: an easy first step such as the free trial with its confirmed terms, a proof point, or a resource. Leave the whole paragraph out if there is none.>

I'd be glad to walk you through how <product> could help <company> on a short call or briefing, whenever suits you.

Best regards,
{{COMPANY_NAME}}

To opt out, reply 'stop' and I won't write again.
```

**Email 3, the last email** (7 working days after the follow-up, only if there's still no reply; body 45-75 words):

```
Subject: Re: <email 1's subject, exactly>

Hi <first name>,

My earlier notes were about <the same topic>.

<The most likely worry for this company, answered in one or two lines from confirmed facts, e.g. "MotionRepo only reads your repository and never writes to it.">

<Optional: the page that answers it, such as the security page, on its own line.>

This is my last note on this. If it's useful later, reply to this email and we'll walk you through it.

Best regards,
{{COMPANY_NAME}}

To opt out, reply 'stop' and I won't write again.
```

**Send schedule** in every draft (working days from Email 1): Email 1 on day 0, Email 2 on day 4, Email 3 on day 11 (7 working days after Email 2). Write it as the draft's `## Send schedule` table; `scripts/followups.mjs` sends from it.

Rules for both: never start with "I", never "just following up", "circling back" or "bumping this", no second question, no booking link, no new claim that isn't in the fact sheet. Write the first email's send day into the brief; never guess what day it is.

## Answers to replies

An answer to a lead's reply is a real email too: it ends with "Best regards," and `{{COMPANY_NAME}}` on the next line (the logo signature), then the opt-out line, like the follow-ups. lint-copy fails it otherwise.

## LinkedIn note

Under 300 characters, tied to the same evidence, same "product is ready" wording, no pitch.

## Claims

- Confirmed knowledge (`knowledge/`) is the only source of claims. Never invent numbers, clients or partnerships.
- Never name a client unless the fact sheet says we may; describe them as the fact sheet does.
- Label benchmarks as directional. Never pitch a planned feature as live.

## Before handing in

Ask: would a careful reviewer send this as-is to this person at this company? Judge the fit (right company, right person, real evidence) and the writing; the weaker half decides. If the answer is no, fix it or flag it under `## For the reviewer`.

## Never

- "We build", "we're building", "in development", "beta", "early access", "design partner", "pilot partner".
- "Circling back", "just following up", "bumping this", guilt, or ending on a negative.
- In a follow-up: asking whether it belongs to someone else, or offering to leave it ("if it sits with someone else, happy to leave it with you").
- Brochure phrases, hype words, exclamation marks, links in a first email, or typos.
- Changing the fixed wording of the first-email layout, or opening a first email any other way.
- A sender name in the body that differs from the signature.
- Naming the AI behind a product in any email: no Claude, Anthropic, Gemini, OpenAI, GPT or "AI model" (the founder's rule of 2026-11-10; lint-copy fails it and send-email.mjs won't send it). For a worry about code or data, say what the product does with the repository (it only reads it and never writes to it) and link the product's security page in a follow-up.
