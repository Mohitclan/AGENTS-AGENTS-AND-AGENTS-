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

## Email 1: first contact (60 to 100 words)

```
Subject: {{Company}}'s {{topic}}            [2 to 5 words, about them, e.g. "Illos's launch content"]

Hi {{First name}},

{{One specific fact about them, from public research: a launch, a release, a post, a hire.}}

{{An honest guess at the problem it causes them, said as a guess.}}

I'm {{Sender name}} from PanScience Innovations, and our product {{Product}} {{what it does, in one sentence, present tense}}.

{{At most one proof point, from confirmed facts only. Leave it out rather than use a weak one.}}

Would it be useful for {{Company}}?

To opt out, reply 'stop' and I won't write again.

{{Sender name}}, {{Sender role}}, PanScience Innovations
{{Sender email}}
```

Rules: no links in Email 1, no attachments unless named, no hype words, no exclamation marks, never open with us.

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
> Parts of the code are sent to Anthropic's Claude, which writes the scripts and documents. The security page has the details:
> https://motionrepo.panscience.ai/security
>
> This is my last email. Reply with any question.

## Things worth deciding before going live

1. **Who signs the emails.** Today it is "PanScience Launch, Launch team" from launch@panscience.xyz, a team name rather than a person. Founders usually get more replies writing as themselves: give a name and role (the sending address can stay launch@).
2. **Email 3's opening worry.** It tells the lead that code goes to Anthropic's Claude. That is honest and required somewhere, but you may prefer "It never writes to your repository; the security page explains how your code is handled" with the link, and leave the detail to the page.
3. **Follow-ups: a call or the trial?** The skill says follow-ups offer a 15-minute call and propose a day ("Would Thursday afternoon work?"). The drafts offer the free trial instead. Pick one.
4. **One opt-out line everywhere.** The drafts use two wordings; keep "To opt out, reply 'stop' and I won't write again."
5. **Anything you always or never want said**, such as a price, a discount, or a client name the fact sheet allows.
