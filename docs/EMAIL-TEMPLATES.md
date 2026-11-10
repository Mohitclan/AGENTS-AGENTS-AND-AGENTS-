# Outreach email templates (for approval)

These are the templates the outreach agent uses today (the `email-template` skill), shown as they reach a lead. Edit this file: change the wording, cross out what you don't want, add notes. Once you are happy, tell Claude, and the agents will draft every email this way. Nothing goes to a real lead until you approve the final version.

`{{...}}` is filled for each lead from its research; `[...]` is a note on what goes there.

## The sequence

| Email | When | Purpose |
|---|---|---|
| Email 1 | Day 0 | First contact: about them, then us, a walkthrough offer. Logo signature |
| Email 2 | 4 working days later, only if no reply | Short reminder, an easy first step, the same offer. Logo signature, opt-out line |
| Email 3 | 7 more working days, only if no reply | Last email: answer the main worry, then stop. Logo signature, opt-out line |

Every follow-up stops at once if they reply or opt out.

## Email 1: first contact (approved 2026-11-10, under 150 words)

The human gave this template on 2026-11-10, and the `email-template` skill now uses it word for word. Only the `{{...}}` parts change per lead.

```
Subject: {{Company}}'s {{topic}}            [2 to 5 words, about them]

Hi {{First name}},

I came across {{Company}} and noticed that {{one specific fact about them, from public research: a launch, a release, a post, a hire}}.

With {{the business activity or challenge behind it}}, {{the problem our product solves}} can often take valuable time and resources away from {{their core priorities}}.

I'm from the PanScience Innovations team, and we {{what the product does, present tense}} to help {{who it is for}} achieve {{the main outcome}}.

{{Optional: one proof point, result, use case or attached resource, from confirmed facts only.}}

I'd be glad to walk you through how {{Product}} could help {{Company}} on a short call or briefing, whenever suits you.

Best regards,
PanScience Innovations              [sent as the logo signature: docs/brand/email-signature.html]
```

Rules: no opt-out line on Email 1 (follow-ups keep theirs), no links in the body, no hype words, no exclamation marks.

## Email 2: follow-up (set 2026-11-10, 45 to 75 words, same thread)

Goes 4 working days after Email 1, only if there's no reply. Ends with the logo signature, then the opt-out line.

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

## Email 3: last email (set 2026-11-10, 45 to 75 words, same thread)

Goes 7 working days after Email 2, only if there's still no reply. Ends with the logo signature, then the opt-out line.

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

Every email, first, follow-up and last, signs off with "Best regards," and the logo signature. The copy checker fails an email without it, so it can't be sent. To change any wording, edit these blocks (and tell Claude, so the `email-template` skill matches).

## An older example (Illos, 97/100, written before the 2026-11-10 template: its day 8 and wording are out of date)

**Email 1. Subject: Illos's launch content**

> Hi Naved,
>
> Illos launched on Product Hunt on 20 October, and the changelog shows Toolkit 0.4.1 on 4 November, so you're shipping often.
>
> My guess, and it may be wrong, is that every release leaves launch material to make by hand.
>
> I'm PanScience Launch from PanScience Innovations, and our product MotionRepo reads a GitHub repository and makes launch content from the code: launch teasers, motion walkthrough videos, and a sales PDF and a technical PDF. It never writes to the repository.
>
> It works only from GitHub. Would it be useful for Illos?
>
> To opt out, reply 'stop' and I won't write again.
>
> PanScience Launch, Launch team, PanScience Innovations
> launch@panscience.xyz

**Email 2 (day 4). Subject: Re: Illos's launch content**

> Hi Naved,
>
> My first note was about MotionRepo and Illos's launch. In short, it makes launch teasers, walkthrough videos and two PDFs from a GitHub repository.
>
> You can paste a public repo URL, so the public navedux/illos-skills repo could be a first try. The trial is free for 14 days, with no card, 6 credits and one repository. To try it, start the free trial:
> https://motionrepo.panscience.ai

**Email 3 (day 8). Subject: Re: Illos's launch content**

> Hi Naved,
>
> My earlier notes were about MotionRepo and Illos's launch. It reads a repository through the GitHub App, or from a pasted public repo URL, and never writes to it.
>
> It only reads your repository and never writes to it. The security page explains how your code is handled:
> https://motionrepo.panscience.ai/security
>
> This is my last email. Reply with any question.

## Things worth deciding before going live

1. **Who signs the emails.** Today it is "PanScience Launch, Launch team" from launch@panscience.xyz, a team name rather than a person. Founders usually get more replies writing as themselves: give a name and role (the sending address can stay launch@).
2. **Decided on 2026-11-10: no AI names in emails.** No email says which AI the product uses (no Claude, Anthropic and the like). A worry about code is answered with what the product does with the repository and the security page link. The copy checker fails an email that names one, and it can't be sent.
3. **Decided on 2026-11-10: follow-ups use Email 1's offer.** Both follow-ups offer the same "short call or briefing, whenever suits you" as Email 1 (no 15-minute call, no proposed day); the follow-up may add the free trial as an easy first step.
4. **Opt-out line:** "To opt out, reply 'stop' and I won't write again." under the signature of Email 2 and 3. Email 1 has none, by your choice; US and EU rules expect a way to opt out in every commercial email, so consider adding the same line under Email 1's signature too.
5. **Anything you always or never want said**, such as a price, a discount, or a client name the fact sheet allows.
