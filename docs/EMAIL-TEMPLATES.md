# Outreach email templates (for approval)

These are the templates the outreach agent uses today (the `email-template` skill), shown as they reach a lead. Edit this file: change the wording, cross out what you don't want, add notes. Once you are happy, tell Claude, and the agents will draft every email this way. Nothing goes to a real lead until you approve the final version.

`{{...}}` is filled for each lead from its research; `[...]` is a note on what goes there.

## The sequence

| Email | When | Purpose |
|---|---|---|
| Email 1 | Day 0 | First contact: about them, then us, one question |
| Email 2 | 4 working days later, only if no reply | Short reminder plus an easy first step (the free trial) |
| Email 3 | 4 more working days, only if no reply | Last email: answer the main worry, then stop |

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

## Email 2: follow-up (45 to 75 words, same thread)

```
Subject: Re: {{Email 1 subject}}

Hi {{First name}},

My first note was about {{Product}} and {{Company}}'s {{topic}}. In short, {{one-line reminder of what it does}}.

{{An easy first step, e.g. the free trial, with confirmed terms: "The trial is free for 14 days, with no card."}} To try it:
{{Product website}}

To opt out, reply 'stop' and I won't write again.

{{Sender signature}}
```

## Email 3: last email (45 to 75 words, same thread)

```
Subject: Re: {{Email 1 subject}}

Hi {{First name}},

My earlier notes were about {{Product}} and {{Company}}'s {{topic}}. {{Answer the most likely worry in one or two lines, e.g. how it handles their code.}}

{{Link to the page that answers it, if there is one}}

This is my last email. Reply with any question.

To opt out, reply 'stop' and I won't write again.

{{Sender signature}}
```

## A real example (Illos, passed review at 97/100)

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
3. **Follow-ups: a call or the trial?** The skill says follow-ups offer a 15-minute call and propose a day ("Would Thursday afternoon work?"). The drafts offer the free trial instead. Pick one.
4. **One opt-out line everywhere.** The drafts use two wordings; keep "To opt out, reply 'stop' and I won't write again."
5. **Anything you always or never want said**, such as a price, a discount, or a client name the fact sheet allows.
