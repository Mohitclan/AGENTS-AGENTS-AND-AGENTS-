# Skill research for the agents, 2026-11-05

Two read-only web surveys run on 2026-11-05 at the human's request, to find skills that make each agent better. Part A covers outreach, sales, demo-handler, lead-generator and researcher; part B covers marketing, docs-handler, knowledge-base, developer, evaluator and coordinator. What was adopted, and in which skill, is in the table below; everything else is kept here for later.

| Adopted skill | Agents | From proposal |
|---|---|---|
| warm-intro | outreach | A1 |
| event-outreach | outreach | A2 |
| discovery-call | sales, demo-handler | A4, with A6 (call debrief) folded in |
| trial-to-paid | sales | A5 |
| live-demo | demo-handler | A7 and A8 merged |
| buyer-intent-search | lead-generator, researcher | A9 |
| lead-sources (launch timing section) | lead-generator | A10, folded into lead-sources |
| market-sizing | researcher | A11 |
| rival-teardown | researcher | A12 |
| red-green-proof | developer | B D1 |
| root-cause-first | developer | B D2 |
| finding-validation | evaluator | B E1 |
| scoped-re-review | evaluator | B E3 |
| dispatch-preflight | coordinator | B C1, plus the foreground rule from J-20261104-01 |
| verify-before-reporting | coordinator | B C3 |
| timeless-wording | docs-handler, marketing, sales, demo-handler | B H1 |
| help-article-types | docs-handler | B H2, with the step trace from H3 |
| feature-status-trace | knowledge-base | B K2 |
| atomic-fact-check | knowledge-base | B K1 |
| press-pitch | marketing | B M1 |

Not adopted yet: A3 sample-offer (main source has no licence; needs a spend approval), A13 research-synthesis (no interviews yet), B D3, B E2 (needs a person to label), B C2, B H3 cold read, B K3, B M3.

# Part A: outreach, sales, demo-handler, lead-generator, researcher

# New skills for outreach, sales, demo-handler, lead-generator and researcher

Researched 2026-11-05. Read-only: nothing was cloned, installed or saved from any source. Source files were read as raw text (GitHub raw URLs and the GitHub API, unauthenticated). Licences come from each repo's own LICENSE file. Everything below is a summary in my own words; no template text is meant to be copied.

**Baseline I compared against:** `CLAUDE.md`, the five agent files, every skill they preload (cold-email, signal-outreach, hook-bank, reply-triage, objection-handling, self-review, meeting-prep, stalled-deal, claim-check, competitive-battlecard, proof-library, proposal, demo-script, lead-research, fact-sourcing, research-rigor), `docs/CREDITS.md`, both 2026-11-03 GTM surveys, `knowledge/products/motionrepo.md`, `evaluation/rubrics.md`, `pipeline/lead-schema.md`, `memory/MAIN.md` and each agent's memory.

**Already reviewed, so not re-proposed:** anthropics/knowledge-work-plugins (sales and marketing skills that survey A read), gtmagents/gtm-agents, wshobson/agents, davepoon/buildwithclaude, coreyhaines31/marketingskills, alirezarezvani/claude-skills, louisblythe/Sales-Skills, LaGrowthMachine/gtm-system. Where a proposal below touches an earlier survey item (A13, B17, B22), it says so and explains what is different.

## Summary

| # | Proposed skill | Load into | Main source (licence) | Value |
|---|---|---|---|---|
| 1 | `warm-intro` | outreach | TheCraigHewitt/sales-skills `referral-intro` (MIT) + PostHog handbook (MIT) | High |
| 2 | `event-outreach` | outreach (researcher supplies events) | TheCraigHewitt `event-networking` (MIT) + goose-skills `list-sources` (MIT) | Medium-high |
| 3 | `sample-offer` | outreach, sales | PostHog handbook (MIT) + chadboyda `video-outreach` (no licence file: ideas only) | Medium |
| 4 | `discovery-call` | sales, demo-handler | PostHog `outbound-sales` and `how-to-do-discovery` (MIT) + TheCraigHewitt `discovery-call` (MIT) | High |
| 5 | `trial-to-paid` | sales (demo-handler reads it) | PostHog `running-trials` and onboarding success plan (MIT) | High |
| 6 | `call-debrief` | sales, demo-handler | TheCraigHewitt `call-debrief` (MIT) | Medium |
| 7 | `reverse-demo` | demo-handler | PostHog `reverse-demo-calls` and `sandboxes` (MIT) | High |
| 8 | `demo-run-of-show` | demo-handler | TheCraigHewitt `demo-script` (MIT) | Medium-high |
| 9 | `buyer-intent-search` | lead-generator, researcher | goose-skills `research-audience/references/list-sources.md` (MIT) + HN Search API | High |
| 10 | `launch-timing-sources` | lead-generator | goose-skills `list-sources.md` and `account-sourcing` (MIT) + GitHub Docs (CC BY 4.0) | High |
| 11 | `market-sizing` | researcher | goose-skills `research-market-market-pass` (MIT) | High |
| 12 | `rival-teardown` | researcher | goose-skills `research-competitors-rival-pass` (MIT) | Medium |
| 13 | `research-synthesis` | researcher | anthropics/knowledge-work-plugins `product-management/synthesize-research` (Apache-2.0) | Low now, higher once interviews exist |

Shared skills: `discovery-call` and `call-debrief` serve both sales and demo-handler; `buyer-intent-search` also helps the researcher's language bank.

What I'd do first, if only three: **`reverse-demo`** (it fits a product that works on the buyer's own repo), **`trial-to-paid`** (sales.md promises trial-to-paid plans and no skill backs them), and **`launch-timing-sources`** (it answers the 2026-11-01 lesson that launch listings only show past launches).

---

## Outreach

Today outreach writes cold email and LinkedIn only. Its skills cover the cold message well (shape, signals, hooks, replies, compliance). What's missing is **every route that isn't cold**: introductions, events, and what happens after a prospect says yes to a sample.

### 1. `warm-intro` (outreach)

**Sources.** https://github.com/TheCraigHewitt/sales-skills/blob/main/skills/referral-intro/SKILL.md (LICENSE: MIT, "Copyright (c) 2026 Craig Hewitt"; file last changed 2026-03-10). The "Asking for introductions" part of https://github.com/PostHog/posthog.com/blob/master/contents/handbook/growth/sales/getting-people-to-talk-to-you.md (LICENSE: everything under `/contents/` is MIT, "Copyright (c) 2020-2025 PostHog Inc."; the rest of that website repo may not be reused, so use only `/contents/` pages).

**The method.**
1. **Who can introduce.** Only people a team member names ("told by <person> on <date>"): founders' contacts, investors, community organisers (AIBoomi, Peerlist), early users once they exist. The agent never browses mutual connections; that needs a login. The coordinator keeps the list of referrers and targets.
2. **Earn the ask.** Ask a referrer only after something of value has passed between you. Never more than once a quarter per referrer. Never batch the same ask to many referrers: that's cold outreach in disguise.
3. **Be specific.** Name one person, or one company and role, plus why now (from the target's lead evidence, with its signal class). "Know anyone who…?" asks get nothing.
4. **Do the referrer's work.** Draft two pieces:
   - **The ask to the referrer:** under 100 words above the blurb. Who, why them, why now, and an easy way to say no.
   - **A forwardable blurb:** 3-4 sentences the referrer can send as is. Our product in one line from a confirmed fact-sheet line, why it fits the target, and one call to action the fact sheet allows (start the free trial or reply). No results or "we helped X" until a proof-library row with permission exists.
5. **After the intro.** Draft a reply the same day: thank the referrer, say you're moving them to Bcc, one line tied to the target's situation, one call to action, the opt-out line from cold-email. If there's no answer, one follow-up after 3 working days with something new, then stop. Pestering burns the referrer.
6. **If the referrer says no.** One thank-you line, and no second ask that quarter.
7. **Close the loop** with the referrer at each stage: reply received, call held, trial started, paid or not. Each one is a short draft for a person to send.
8. **Log it.** Each intro gets a lead record note: referrer ID (no personal details beyond a published professional contact), date asked, outcome.

**Gap it fills.** Nothing today drafts a non-cold first touch. cold-email assumes a published business contact and a cold opener. For founder-led Indian startups, segment 1, the founders' network and AIBoomi are named routes in, but no skill turns them into drafts.

**How to measure.** Count intro asks drafted, asks sent, intros made, replies and trials started, as X of N with `node scripts/stats.mjs`. Compare the reply rate with cold sends only once both arms pass the minimum sample in early-stage-guardrails. Until then, report "too thin to read". Also track the evaluator's rubric-4 scores on intro drafts: personalisation from evidence, confirmed facts only.

**Conflicts and what to leave out.**
- The source's conversion figures for warm versus cold, in-person versus email and LinkedIn are unsourced. Drop them.
- Drop its tip to like and comment on the target's posts before asking. That is outward engagement, which is a person's action (hard rule 1) and marketing's `linkedin-founder` territory.
- Drop "[Calendar link]": the fact sheet says there is no booking link.
- Drop customer-result claims: there are no proof rows yet.
- Its "no cash incentives" rule fits. Any gift or perk is `[NEEDS APPROVAL]`.
- Run the suppression and never-contact checks on the target before asking anyone for an intro.
- Its CRM fields map onto `leads.mjs` notes. HubSpot stays read-only.

### 2. `event-outreach` (outreach; the researcher's channel map supplies the events)

**Sources.** https://github.com/TheCraigHewitt/sales-skills/blob/main/skills/event-networking/SKILL.md (MIT, 2026 Craig Hewitt; last changed 2026-03-10). The "Events" rules in https://github.com/gooseworks-ai/goose-skills/blob/main/skills/marketing/research-audience/references/list-sources.md (LICENSE: MIT, "Copyright (c) 2026 GooseWorks"; file last changed 2026-10-24).

**The method.**
1. **Pick events** from the channel map, for example AIBoomi events and Demo Rooms (`outputs/research/2026-10-30-motionrepo-channel-map.md` row 2). Write down only events a team member says they will attend, or that publish a speaker or demo lineup. Look 180 days ahead and 90 days back.
2. **Build targets from public pages only:** speaker lists, demo-day lineups, sponsor and exhibitor pages, workshop hosts. A talk or a demo slot is the evidence, with its date (signal `published`). Never use attendee or RSVP lists, even if a page shows them, and never use event apps behind a login.
3. **Tier the targets:**
   - must-meet (5-10): already a lead, or a strong fit;
   - should-meet (15-25);
   - everyone else.

   Each target goes through `leads.mjs` like any lead, gate included.
4. **Before the event**, 1-3 weeks out, and only for must-meets whose contact is published: a short note that names the event and their talk or demo, says the founder will be there, and makes one small ask, such as a 10-minute chat at the event. Times and places are filled in by the person attending.
5. **Founder's one-page brief for the day:**
   - a 30-second introduction that ends in a question, not a pitch;
   - three qualifying questions: what's hard about launching, how they do it today, whether it's worth continuing after the event;
   - a note format: pain in their words, how they do it now, the next step agreed, and heat (hot, warm or cool).
6. **Same-day follow-up drafts** from the founder's notes, tagged `prospect_said` as in meeting-prep:
   - hot: the agreed next step;
   - warm: one useful resource that exists;
   - cool: a short note, no list sign-up.

   Then follow the cold-email follow-up limits.
7. **Speaking and demo slots:** if a founder gets a slot, the follow-up uses the talk as the shared context.

**Gap it fills.** The channel map names in-person venues as the top channels, but no outreach skill turns an event into drafts, and nothing stops an agent from treating an attendee list as a lead source.

**How to measure.** Per event: targets listed; notes drafted, then sent by a person; conversations the founder logged; follow-ups sent; replies and trials, as X of N. Compare with cold-email sends using the same script and minimum sample.

**Conflicts and what to leave out.**
- The ROI and break-even maths uses rates we don't have. Our tool budget is ₹0, so it's attend-only.
- Drop the unsourced "most ROI comes before the event" percentage.
- Drop "send a calendar invite": booking is a person's action.
- Drop the note field for personal details such as family or hobbies (hard rule 3 and self-review item 8).
- Drop "add them to our newsletter": that's sign-up without consent.
- Drop the phone-call step in its cadence: phone isn't our channel.
- Never scrape event apps.

### 3. `sample-offer` (outreach writes the offer and the follow-up; sales uses it in replies)

**Sources.** https://github.com/chadboyda/agent-gtm-skills/blob/main/skills/video-outreach/SKILL.md, its "made this for you" pattern. The README says MIT, but the repo has **no LICENSE file**, so this is ideas only and nothing is copied. https://github.com/PostHog/posthog.com/blob/master/contents/handbook/growth/sales/getting-people-to-talk-to-you.md (MIT `/contents/`): reasons to talk must be genuinely helpful, never clickbait, and a short video of observations works. https://github.com/PostHog/posthog.com/blob/master/contents/handbook/growth/sales/sandboxes.md (MIT): the prospect's own data beats made-up data.

**The method.**
1. **Offer before you make.** cold-email already allows "Should I send a sample?". This skill covers what happens next. Make a sample only after the prospect says yes, from a repo they name or a public repo URL they confirm. Never make one first and send it unasked.
2. **Sample brief**, for the person who makes it, since agents can't use the product UI:
   - the repo URL (public, or whichever repo they point us to);
   - which output: a launch teaser, 15-25 seconds per the fact sheet;
   - the tone, from the fact sheet's tone list;
   - what the sample shows and doesn't (trial videos are 720p with a watermark, per fact-sheet line 94);
   - who makes it, and from which account.
3. **Delivery draft:**
   - one line saying what it is and that it was made from their repo;
   - the link on its own line (cold-email link rule);
   - one question about whether it fits their next launch;
   - the opt-out line;
   - no claims beyond the fact sheet.

   Never publish or post the sample, and never use it as proof (proof-library rule 6).
4. **Next step:** the free trial on their own account (`trial-to-paid`), or a reverse demo (`reverse-demo`).
5. **Record:** the date offered, the date accepted, who made it, and when the link expires (a demo-script rule: every published demo has an owner and an expiry).

**Gap it fills.** Today the call to action "send a sample" leads nowhere: there's no rule for consent, who makes the sample, labelling, or the delivery email.

**How to measure.** Sample offers accepted, as X of N offers sent; samples delivered; trials started after a sample, with `stats.mjs` and the minimum sample.

**Conflicts and what to leave out.**
- **Spend.** Each sample uses product credits. The market brief puts the internal cost at about $2 per teaser (fact-sheet line 186, internal only). Each sample is an approval row in `ops/approvals.md`.
- **Data.** Parts of the code go to Anthropic's Claude (fact-sheet line 92). That's why it must be consent first, and why private repos only happen on their own account.
- Drop from the source: AI avatar and lip-sync tools (Tavus, HeyGen), watch-time tracking with "call within 5 minutes", tracking pixels, its unsourced conversion figures, and paid video tools.

---

## Sales

Sales already has strong reply, objection, proposal and stalled-deal skills. The gaps are the **live conversation itself**, the **trial** (promised in `sales.md`, with no skill behind it) and **learning from each call**.

### 4. `discovery-call` (sales; demo-handler uses its first half before a demo)

**Sources.**
- https://github.com/PostHog/posthog.com/blob/master/contents/handbook/growth/sales/outbound-sales.md, the "How TAEs talk to outbounded prospects" section (MIT `/contents/`; last changed 2026-10-29).
- https://github.com/PostHog/posthog.com/blob/master/contents/handbook/growth/sales/how-to-do-discovery.md (MIT; 2026-07-27).
- https://github.com/TheCraigHewitt/sales-skills/blob/main/skills/discovery-call/SKILL.md (MIT, 2026; a SPIN-derived question ladder, deflections, no-show handling).

**The method.**
1. **Hypothesis first.** One line from the lead's evidence: the trigger and the likely pain, marked `inferred` (meeting-prep tags).
2. **Open honestly.** We contacted them, so say so. Then ask what made them take the call. If the answer is vague, offer the hypothesis and ask whether it's true for them. Say you'll keep it short if it isn't.
3. **Agree a short agenda:** their situation, what works and what doesn't, a short look at the product only if relevant, then whether there's a next step.
4. **Question ladder.** One or two questions per rung; follow-ups beat scripts. Open questions start with "what", "how", "tell me" or "walk me through".
   - **Situation:** how they made launch videos and docs last time, and who did it.
   - **Problem:** what was hard.
   - **Implication:** what happened as a result: a delay, a launch without a video, docs out of date.
   - **Need-payoff:** what fixing it would change, in their words.
   - **Goal:** what they're launching next, and when. This is the timing test for segment 1.
5. **Qualify on four yes-or-no tests, live:**
   - a specific pain;
   - a visible effect in time or money, in their words;
   - a dated need within about six months;
   - the person can decide, or has a route to who does. In segment 1 this is usually the founder.

   Fewer than four: disqualify politely, give an honest pointer (for example, come back when the next launch has a date) and mark the lead in `leads.mjs` with their words.
6. **Pitch only with permission:** "Based on what you said, can I show you how it works?" Then 2-3 minutes from confirmed facts only (claim-check).
7. **Ask the direct question:** does this solve the problem they described? Then wait for the answer.
8. **One next step**, agreed on the call by the person running it: start the free trial on their repo, a reverse demo, or a call with someone else. No next step means no opportunity.
9. **Deflections:**
   - "Just send me information": ask what exactly would help, then send only that.
   - "What does it cost?": **answer from the fact sheet**. Our prices are public, so dodging would be dishonest.
   - "We're happy as we are": ask what made them take the call.
   - "Just exploring": ask what changed. If nothing, close politely.
10. **No-shows:** after 5-10 minutes, one short note with an easy way out. After three reschedules, offer an async option, the recorded demo, instead of another slot.
11. **Champion check**, only for multi-person teams: who else feels this, and how they choose tools.
12. **Recap the same day** in their words (meeting-prep "After the meeting"). Commitments beyond knowledge are `[NEEDS APPROVAL]`.

**Gap it fills.** meeting-prep builds the page and asks for three to five questions, but nothing teaches how to run the call, qualify live, handle a deflection, disqualify kindly or handle a no-show. Survey B item 22 (one objective per meeting) is covered by step 8. This adds the rest.

**How to measure.** Share of first calls whose recap shows a dated next step or an explicit disqualification, as X of N recaps. First-review pass rate on call-prep files (`node scripts/stats.mjs reviews`). The rubric-5 score for "moves the deal one clear step forward".

**Conflicts and what to leave out.**
- Craig's tip to quote what "other companies in your space" pay is an invented benchmark. Drop it.
- So is working out their costs at an assumed hourly rate. Use only figures the buyer gave (proposal skill).
- So is his "don't give price yet" deflection: our prices are public.
- PostHog's quoted 7/38/55 communication split is a misapplied stat. Drop it.
- So are PostHog's revenue thresholds (the $20k ARR line).
- Drop "record every call" unless the prospect agrees. Consent wording and India's DPDP rules go to a person.
- Drop calendar links: there's no booking link.
- Research on the person stays professional and public (hard rule 3).

### 5. `trial-to-paid` (sales; demo-handler reads it after a reverse demo)

**Sources.**
- https://github.com/PostHog/posthog.com/blob/master/contents/handbook/growth/sales/running-trials.md (MIT `/contents/`; last changed 2026-10-29).
- https://github.com/PostHog/posthog.com/blob/master/contents/handbook/customer-success/onboarding-success-plan.md (MIT; a weekly "your commitments / our commitments" plan).

**The method**, adapted to the fact sheet: a 14-day trial, 6 credits, one repository, no card, starting at the first dashboard view (fact-sheet lines 107 and 122).
1. **Who gets an assisted trial plan:** a prospect in conversation who is starting or has started the trial. Skip the plan, but not the trial, when there is no dated need or they are only comparing prices. The self-serve trial stays open to everyone.
2. **Day 0 comes first.** Their own repository is connected and their first output has been generated. Nothing else in the plan starts until that's done.
3. **Write success criteria in their words**, for example "a teaser for our Peerlist launch on <date>". Add a dated timeline worked back from their launch date (the proposal skill's shared plan). They agree to it; it is never imposed.
4. **Two-column plan:** what they do (connect the repo, pick the output, give feedback) and what we do. Our side is limited to what the fact sheet and docs allow: answering questions, pointing to docs, a short review call.
5. **Rhythm over 14 days:**
   - Days 1-3: first output.
   - Days 4-7: a second output (a walkthrough or the PDFs) and feedback.
   - Around day 7: a short check on the criteria.
   - Days 8-14: the decision.

   Talk about plan and price in parallel, from the fact sheet only. Don't leave it to the last day.
6. **Reading engagement.** Use only what the buyer says, or counts a person reads from product records. If things go quiet, send one helpful note (an answer to their last question, or a doc that exists), then the single "still a priority?" note from stalled-deal.
7. **Extensions and extra credits** aren't in the fact sheet, so they are `[NEEDS APPROVAL]`. If approved, ask for something legitimate in return, such as a decision date or a feedback call, never pressure.
8. **Wrap-up:** a feedback session, a check on each criterion (met, partly met or missed), the plan that fits, then a proposal (proposal skill) or an honest close: Retire or Watch (stalled-deal).

**Gap it fills.** sales.md lists "Trial-to-paid plans" as an output, but no preloaded skill says what a plan contains. The sign-up nurture in cold-email covers marketing emails to sign-ups, and it is currently HELD. It doesn't cover a prospect who is in conversation and on a trial.

**How to measure.**
- Trials in conversation reaching Day 0 within 3 days, as X of N.
- Trials converting to paid within the trial window, as X of N.
- Both from `stats.mjs`, with the minimum sample and the read date set before the first plan.
- Rubric 5 on each plan, especially "prices and terms match confirmed knowledge".

**Conflicts and what to leave out.**
- PostHog's session replay to watch trial users: privacy, and we have no access.
- Adding people to shared Slack channels without asking (the "getting people to talk" page): leave it out.
- Revenue thresholds, procurement and order-form mechanics.
- "Get it signed by trial end" as a target: a true end date is fine, invented urgency is not.

### 6. `call-debrief` (sales; demo-handler after demos)

**Source.** https://github.com/TheCraigHewitt/sales-skills/blob/main/skills/call-debrief/SKILL.md (MIT, 2026; last changed 2026-03-10).

**The method.**
1. **No notes, no debrief.** Work from the founder's notes or a transcript the prospect agreed to. Never work from the meeting title. This is survey A item A13, kept as rule 1.
2. **Plan versus reality**, the core of the debrief. Take each goal and question from the meeting-prep page and mark it done, partly done or missed, with the evidence line: their words, tagged `prospect_said`.
3. **Facts before feelings.** "It went well" isn't a finding. Record what they said about pain, timing, decision and next step.
4. **Signals as tagged quotes:**
   - strong: asking how setup or onboarding works, asking for something to share with a colleague, asking what the first weeks look like;
   - weak: "interesting", "let me think about it", an unspecific "send me info";
   - red flags: "just exploring", "we'll discuss internally" with no date, repeated rescheduling, price before value, one person engaged on a group call.

   Signals come from words only. Never infer them from tone or body language.
5. **Every call ends with a next step or a disqualification.** If not, the debrief says so first.
6. **Kill or shelf:** use stalled-deal's verdicts (Re-enter, Watch, Retire) and its single closing note. No new breakup template.
7. **Patterns across calls**, after about 10 debriefs:
   - talking too much;
   - skipping the money question;
   - vague next steps;
   - pitching before the problem is clear.

   With a transcript, count open versus closed questions, mark where the pitch started before the problem was stated, and list missed follow-ups. Output: one coaching line for the founder.
8. **Hand-offs:** new objections go to the objection register with exact words, and content gaps go through reply-triage's list.

**Gap it fills.** meeting-prep's "After the meeting" drafts a recap for the prospect. Nothing checks the call against its plan or builds lessons across calls. Survey A's A13 covered only the no-notes rule.

**How to measure.** Share of calls with a debrief that names a next step or a disqualification. Over 10 or more debriefs, whether the most frequent missed item drops; the counts come from a script, not the model.

**Conflicts and what to leave out.**
- Craig's 30-point engagement score duplicates meeting-prep's score. Use plan versus reality instead.
- Drop the unsourced "memory half-life" figures, the body-language reading, and "record every call" without consent.
- Drop the CRM update step: HubSpot is read-only, so it becomes a handoff.

---

## Demo-handler

demo-handler has demo-script, objection-handling, meeting-prep, claim-check and self-review. The fact sheet says demos run **on the live product with the free trial and no separate demo account exists** (fact-sheet line 155). MotionRepo also works on the buyer's own GitHub repository. Two consequences follow: the best demo is the buyer's own repo, and a live demo spends real trial credits and render time.

### 7. `reverse-demo` (demo-handler)

**Sources.**
- https://github.com/PostHog/posthog.com/blob/master/contents/handbook/growth/sales/reverse-demo-calls.md (MIT `/contents/`; last changed 2026-10-05). It credits Clay with popularising the term; Clay's own blog has no licence, so its ideas aren't used.
- https://github.com/PostHog/posthog.com/blob/master/contents/handbook/growth/sales/sandboxes.md (MIT; 2026-10-29): sample data is a fallback, framed as a tour, not a trial.

**The method.**
1. **Agree the topic ahead, and say the call is theirs.** They drive; we watch, ask and take notes.
2. **Pre-call prep**, sent with the agenda:
   - which repo they'll use: a public URL, or a private repo through the GitHub App (fact-sheet line 85);
   - that signing in starts their 14-day trial;
   - that parts of the code go to Anthropic's Claude (fact-sheet line 92), so they choose the repo knowing that.

   Whether an org repo needs an admin to install the App is not on file: `[NEEDS INPUT: knowledge-base]`.
3. **Goals first:** what they're launching, when, and what "good" looks like (discovery-call's goal question).
4. **They share their screen**, sign in, connect their repo and start one output. We narrate only when asked, and note where they hesitate, what they look for and what they work around.
5. **Say up front** that every question gets a written answer after the call, so they needn't remember anything.
6. **Recap before ending:** read back each point and have them confirm it.
7. **After the call:** one written follow-up per item, using steps from existing docs and links from the fact sheet. Anything with no doc goes to docs-handler. Then the trial plan (`trial-to-paid`).
8. **When not to use it:** they can't connect any repo yet (pre-launch code, a client's confidential code), or the call is about something new we're showing. Then use demo-script's standard demo, with the team's own sample repo described as a tour, not a trial.

**Gap it fills.** demo-script assumes we drive with "sample data that looks like theirs". For a product that reads the buyer's repository, their own repo is the strongest proof, and it starts the trial on the call. Nothing today covers pre-call prep, data disclosure or written follow-up for a customer-led demo.

**How to measure.**
- Share of demos where the prospect produced an output from their own repo, as X of N.
- Demo-to-paid rate, compared with standard demos once the minimum sample is reached.
- Pains captured per call, from debriefs.
- Rubric 7 scores ("each workflow shown is tied to one of the prospect's pains", "follow-up drafts are ready").

**Conflicts and what to leave out.**
- PostHog's "credit their usage during the demo window": any credits or extension is `[NEEDS APPROVAL]`.
- Its product-specific "self-driving" and "scout" flows.
- Never ask the prospect to share or send credentials. Don't record their screen showing private code without their yes.

### 8. `demo-run-of-show` (demo-handler)

**Source.** https://github.com/TheCraigHewitt/sales-skills/blob/main/skills/demo-script/SKILL.md (MIT, 2026; last changed 2026-03-10). Only the parts our demo-script lacks are used: recovery, the parking lot, handling questions and screen hygiene.

**The method.**
1. **Pain-to-feature map before the script:** pain (their words), feature (live per claim-check), outcome, proof (a proof-library row or "none"). If the pain column is empty, don't show that feature.
2. **A check-in after each workflow:** "Does this match what you deal with?"
3. **Fallback for every live step.** MotionRepo renders take time; how long is not on file (`[NEEDS INPUT: developer, measured render time]`). So keep a pre-made output per workflow, made with the team's trial account on a sample repo the team owns. Prepare one calm line for when something fails, such as showing the version made earlier. Never troubleshoot live, and never say "that shouldn't happen". Afterwards, send the real result or an honest note.
4. **Credit budget.** With no demo account, every live render uses trial credits (6 credits, fact-sheet line 107). Plan the credits per demo, and keep demo-script's rule to reset or replace the account before each demo.
5. **Questions mid-demo:**
   - answer now if it's about the current screen, comes from the decision-maker, or is a deal-breaker (price, security, GitHub-only sign-in);
   - park it if it's coming up in a few minutes or would derail the others.

   Write parked items where everyone can see them, and clear them all before the end.
6. **One honest edge case:** show or state one thing it doesn't do that matters to them, from claim-check's "not supported" list. A buyer trusts a demo more when it isn't only the happy path.
7. **Screen hygiene checklist:** notifications off, a clean browser profile, no other customers' data, no credentials visible, readable zoom.
8. **Competitor asked about:** acknowledge them, say where they're strong, say what we do, using battlecard rules. Never knock them.
9. **Recording:** only with permission, asked at the start. A recap goes out the same day.

**Gap it fills.** demo-script covers the agenda, the earn-the-demo gate and a walk-through the day before, but not what to do when a render is slow or fails, how to handle questions, or the credit cost of live demos without a demo account.

**How to measure.**
- Rubric 7 scores: "timing is realistic and ends with a next step", "environment checklist is complete".
- Count of demos where a fallback was needed and was available, as X of N demos that needed one.
- Share of demos ending with a dated next step.

**Conflicts and what to leave out.**
- The source's sample proof points, for example a named customer and a percentage: invented. Use proof-library rows only.
- Trackable recording links (Loom or Vidyard view tracking).
- "Don't record if the demo is going badly": recording is the buyer's choice, not ours.
- Its executive-only and enterprise sections: segment 1 is founder-led.

**Shared with sales:** `call-debrief` (item 6) after every demo, and `discovery-call` steps 1-5 when the demo opens with discovery (demo-script's minutes 3-8).

---

## Lead-generator

lead-generator's skills already demand evidence, signal classes, freshness and published contacts. Its memory shows two recurring problems: **finding fresh, dated need and timing signals**, especially an upcoming launch (lesson 2026-11-01), and **absence claims**. Both proposals give it better places to look and stricter rules about what counts.

### 9. `buyer-intent-search` (lead-generator; the researcher uses it for the language bank)

**Sources.**
- https://github.com/gooseworks-ai/goose-skills/blob/main/skills/marketing/research-audience/references/list-sources.md (MIT, 2026 GooseWorks; last changed 2026-10-24), its "switch intent" section.
- https://github.com/gooseworks-ai/goose-skills/blob/main/skills/shared/hacker-news-scraper/SKILL.md (MIT): how the Hacker News search API is used.
- The HN Search API itself, https://hn.algolia.com/api. Its doc page wouldn't render through the fetch tool. I confirmed on 2026-11-05 that `search_by_date` with `tags=show_hn` and `numericFilters=created_at_i>…` returns dated items, keyless.

**The method.**
1. **Search pain words, not product words.** Write 15-25 phrases a tired founder would type, in four kinds:
   - staffing pain: no designer, no video person;
   - manual work: recording a screen demo by hand, rewriting docs;
   - cost or time: a launch delayed waiting for the video;
   - one named workflow that hurts: a Product Hunt launch video, a README demo GIF.

   Product words such as "AI video generator" find vendors and builders, not buyers.
2. **Nine kinds of buying language, strongest first**, each with search shapes to try. Run the top two queries per kind:

   | Kind | Strength (source's scale) | Search shapes |
   |---|---|---|
   | Looking for an alternative | 9 | "<rival> alternative" |
   | Migrating | 9 | "moving off <rival>" |
   | Built our own | 9 | Show HN posts of home-made launch-video tooling |
   | Rival pain | 8 | "<rival> doesn't support" |
   | Comparing tools | 8 | "<A> vs <B>" |
   | Scaling pain | 7 | |
   | Price pain | 7 | |
   | Missing feature | 7 | |
   | Problem questions | 6 | "how to make a launch video for…" |

   Rivals come from `knowledge/competitors/motionrepo.md` (RepoClip and others). Use the strength only to order the work. The lead score stays the schema's.
3. **Lookback:** 30 days by default; 90 for rivals' launches and case studies. This matches signal-outreach's freshness windows.
4. **Hacker News:** query `search_by_date` with `tags=story`, then `tags=comment`, and `tags=show_hn` for launches, using `numericFilters=created_at_i>` the lookback start. Dedupe by item ID, and keep the parent story's title with each comment. Reddit and forums: web search with `site:`, then open the thread. Search results alone are never evidence (research-rigor).
5. **Only the writer counts.** A comment belongs to its commenter; upvotes and likes count for nothing.
6. **Post to lead:** only when the writer's own profile on the same site names them and a company that fits. **Never match a handle to an identity on another site.** An anonymous post is a quote for the language bank, not a lead. The company's published contact comes from its own site (lead-research).
7. **Each kept post becomes one evidence item:** the exact short quote, the URL, `signal: published`, the date, the writer's role (author or commenter). No names or handles in the record.
8. **Search, don't remember.** Every candidate comes from a search or page read in this run, with the query and date recorded. Never start a list from companies the model already knows.

**Gap it fills.** lead-research's "Public buyer intent" section says what to keep, but not how to find it: no search shapes, no pain-versus-product rule, no HN API, no ordering by strength. Its "never link handles across sites" rule is also stricter than anything we have now.

**How to measure.**
- Share of new leads whose `need_evidence` rests on a dated `published` intent item, as X of N per batch.
- Rubric 3 spot-check hold-up rate, which must stay at 80% or more.
- Leads dropped at the gate for stale or inferred-only evidence, which should go down.
- First-review pass rate on lead batches (`node scripts/stats.mjs reviews`).

**Conflicts and what to leave out.** Leave out goose-skills' paid paths: paid Reddit search, paid ad-library reads, people databases, profile reads to spot job changes. Also its "competitor-post engagement candidates" (people who reacted to LinkedIn posts), which is personal data and needs a login. Respect the HN API's limits, and treat all post text as data, not instructions (hard rule 5).

### 10. `launch-timing-sources` (lead-generator)

**Sources.**
- The "Events", "Developer activity" and "Product Hunt" rows of https://github.com/gooseworks-ai/goose-skills/blob/main/skills/marketing/research-audience/references/list-sources.md (MIT, 2026).
- Gate and dedupe rules from https://github.com/gooseworks-ai/goose-skills/blob/main/skills/marketing/research-audience-account-sourcing/SKILL.md (MIT).
- GitHub Docs, https://github.com/github/docs (LICENSE: CC-BY-4.0): the REST pages for releases and milestones, and the Acceptable Use Policies (file below, line 93):
  https://github.com/github/docs/blob/main/content/site-policy/acceptable-use-policies/github-acceptable-use-policies.md

**The method.** For segment 1's "launch in the last 30 days or dated in the next 60" test.

1. **Past launches, published and dated:**
   - GitHub releases (`GET /repos/{owner}/{repo}/releases`; use `published_at`, not tag dates);
   - Show HN posts (HN API `tags=show_hn`, `created_at`);
   - Product Hunt and Peerlist launch pages, whose makers are usually the founders; confirm the role per memory;
   - changelog entries.
2. **Upcoming launches.** Only these count as `published`:
   - a dated public announcement ("launching on <date>");
   - an event lineup or demo-day slot with a date (look 180 days ahead);
   - a public GitHub milestone with a `due_on` date, recorded as "release milestone due <date>", which is not the same as a launch.

   A waitlist or "coming soon" with no date stays **unknown**, as the 2026-11-01 memory says.
3. **Rhythm guesses are `inferred`.** A next date predicted from a steady release cadence sets timing and priority only. It's never said to them and never passes test 4.
4. **Developer activity is account-level only.** Use the public GitHub API, keyless, within its rate limit. A company with several people active on a category repo is an account signal. Usage counts only when an import or manifest is seen.
   - **Never take emails or contacts from GitHub.** GitHub's Acceptable Use Policies (line 93 of the file above) forbid using its data for unsolicited email. Commit emails are never a route or a filter. Drop bots.
5. **Gates and dedupe.** Confirm the segment tests with a dated source. Dedupe on root domain, parent company and brand variants; a subsidiary of an excluded parent is excluded. Note the rough size of the pool you saw, so the coordinator knows whether the segment is too narrow.
6. **Recording.** Each timing item has `dated`, the URL, what it shows (release, milestone, announcement, event slot) and its signal class. An empty search is a data gap, never "no launch".

**Gap it fills.** lead-research's timing row lists "funding and launch news" only. The 2026-11-01 lesson says listings show past launches and asks for another source for upcoming ones. Nothing today names GitHub releases and milestones, HN's dated feed or event lineups as timing sources, and nothing covers GitHub's no-email rule.

**How to measure.**
- Segment-1 rows with test 4 left "unknown", as X of N per batch: should go down.
- Leads whose `timing` is above 10 with a dated item from the last six months (lead-research's sense check).
- Rubric 3 spot-check hold-up rate.
- Fewer reviewer fixes about launch evidence (`stats.mjs reviews`).

**Conflicts and what to leave out.**
- goose-skills drops an account when a gate can't be confirmed. Our rule is that "not seen" is unknown and the row stays open (lead-generator memory, 2026-11-01). Keep ours.
- Leave out its people databases and paid reads.

---

## Researcher

The researcher has strong sourcing and evidence rules (fact-sourcing, research-rigor). What it lacks is **a method for numbers**: how many buyers there are and what the category charges. The fact sheet's "Not established" list starts with how many Indian startups pass the segment test.

### 11. `market-sizing` (researcher)

**Source.** https://github.com/gooseworks-ai/goose-skills/blob/main/skills/marketing/research-market-market-pass/SKILL.md (MIT, 2026 GooseWorks; last changed 2026-10-24), sections 1, 2, 5, 7 and 9.

**The method.**
1. **Which market, as a decision.** List the 2-3 categories the product could be filed under, using what buyers call each one: search phrasings, directory categories, community names. Recommend one, and say what changes if another is picked: different rivals, buyers and prices. Name the do-nothing options too: a screen recorder, an agency or freelancer, doing it in-house, no video at all. Positioning stays marketing's; this is evidence for it.
2. **Top-down**, as context only: 2-3 published estimates, each with publisher, year, figure and what it counts, quoted as theirs. Explain why they differ.
3. **Bottom-up reachable market**, per segment: likely buyers × yearly price.
   - **Count in the right unit:** companies that could buy, from directories, launch lists, registries or job-post counts. Never community member counts (for example AIBoomi's 6,500 members aren't 6,500 buyers).
   - **Every input** is sourced or labelled "an assumption, because …".
   - Show the arithmetic in one line per segment, and name the largest input. If it's an assumption, say the total is an order of magnitude.
4. **Reachable isn't winnable.** Never multiply a market count by a trial or conversion benchmark. A share-we-could-win line appears only with a source; with no sales yet, say what would size it.
5. **Pricing norms grouped by what the price buys:** self-serve video tool, docs-from-code tool, agency or freelancer, in-house hire. Give the norm per group. Never average across groups. Each price is dated from its own page (fact-sourcing).
6. **Demand and seasonality,** each line labelled measured, proxy, known pattern but not measured, or unknown. Include dates in the next 90 days: launch-venue cycles, events, budget seasons.
7. **Baselines for next time:** the counts, price norms and dates the next run will compare against, each with source and date.

**Gap it fills.** The market brief has "price anchors" and ranked segments, but no rule for counting buyers, no ban on community counts or conversion benchmarks, and no like-for-like price grouping. These are exactly where invented numbers creep in. Hard rule 2 and research-rigor's "counts with denominators" say what not to do; this says what to do.

**How to measure.**
- Whether the next market brief contains a bottom-up count for segment 1, with every input sourced or labelled.
- Rubric 2 scores for "claims are sourced" and "facts and hypotheses labelled".
- Inputs labelled assumption, as X of N, falling over successive briefs as sources are found.

**Conflicts and what to leave out.**
- The goose-skills "Before you start" setup calls its own MCP tools and offers paid "top-ups". Leave both out.
- Its rule "never stop to ask" conflicts with our `needs_input` status. Keep ours.
- Its Google Trends and AI-answer checks are fine only where free and public; say "couldn't read" otherwise.

### 12. `rival-teardown` (researcher)

**Source.** https://github.com/gooseworks-ai/goose-skills/blob/main/skills/marketing/research-competitors-rival-pass/SKILL.md (MIT, 2026; last changed 2026-10-24).

**The method**, for one competitor per run.
1. **Depth cap:** about 12 searches and 12 page reads. Stop a dimension when two reads add nothing new.
2. **News from the last 90 days**: shutdowns, acquisitions, price changes, launches. Each with its date and what it opens for us, for example a rival's customers needing a new home. Say exactly who bought what.
3. **The biggest launch of the last 90 days**, broken into hook, setup, reveal, proof and call to action. Label how it was read: from the video, from a transcript only, or from page text only.
4. **Pricing for a typical buyer like ours**: what a segment-1 founder making one launch video a month would pay, worked out from the rival's own dated pricing page, in its currency. Note hidden costs and which tier holds the features buyers care about. Keep battlecard rule 4: no "cheaper than" without one currency at a dated rate.
5. **Headline word for word**, who it's for, and the lead claims.
6. **Buyers' voice:** at least one praise and one complaint, verbatim with links, from more than one site where possible. Say which sites, how many reviews were read per site, and any site bias, for example a complaint-heavy site. **Never skip the praise:** it's why their customers stay.
7. **Hiring, customers, search:** open roles by team; named customers, each confirmed, likely or a guess; who ranks for "<rival> alternative".
8. **Couldn't read versus none found.** Pages that need a login or a browser go on a "needs a person" list with the exact URL. Never write "none".
9. **Snapshot for next time:** entry price, typical-buyer cost, headline, roles, review counts and launches, each dated, appended to the competitor file's Changes section.

**Gap it fills.** Our competitor file spec asks for positioning, features, dated prices and review weaknesses. It doesn't ask for the typical-buyer cost, praise alongside complaints with per-site counts, a depth cap, or a news-driven "opening". Survey B item 17 (dated snapshots) is folded into step 9. Survey A item A8 (content-gap grid) isn't repeated.

**How to measure.**
- Rubric 2 spot-checks on competitor files.
- The number of "where we win or lose" lines that sales actually uses in battlecards (competitive-battlecard win and loss notes).
- Fewer reviewer fixes for undated or one-site claims.

**Conflicts and what to leave out.**
- Leave out ad-spend estimates, "best ad" claims and paid ad-library reads.
- Any login-only page (LinkedIn posts, some review sites) goes to a person.
- Our battlecard rules win wherever the two differ: no knocking a rival, and gaps labelled hypothesis are never stated.

### 13. `research-synthesis` (researcher). Low priority now.

**Source.** https://github.com/anthropics/knowledge-work-plugins/blob/main/product-management/skills/synthesize-research/SKILL.md (Apache-2.0; `product-management/LICENSE` is the Apache 2.0 text). Survey A read only the sales and marketing plugins.

**The method.**
1. **Read everything once** before coding anything.
2. **Code each observation**, one per note, generously. Merging codes later is easier than splitting them.
3. **Group codes into themes.** Check each theme against the data; split themes that grow too big; keep outliers rather than forcing them in.
4. **Separate what people did from what they said they want.** Behaviour outranks stated preference. Workarounds are unmet needs.
5. **Each finding** gets one sentence, the evidence (exact quotes with links), how many sources back it, its effect, and its confidence. Aim for 5-8 findings.
6. **Rank by frequency × impact.** Rare but high-impact findings may define a segment.
7. **Disagreement between sources is a finding,** often a segment difference. Never pick one side.
8. **Open questions,** each with the cheapest next method to answer it.

**Gap it fills.** research-rigor covers labels, three-channel corroboration, counts with denominators and the language bank, but not the coding step that turns 40 posts or interview notes into themes.

**How to measure.** Only once there are interviews, win or loss notes, or a large review pull: rubric 2 "gaps and opportunities are specific and usable".

**Conflicts and what to leave out.** Leave out its connector steps, persona templates (CREDITS excludes long personas), survey benchmark comparisons and its opportunity-sizing example figures. Today's inputs are thin, so I'd hold this until the first interviews.

---

## Sources looked at and not used

| Source | Licence (from LICENSE file) | Why not used |
|---|---|---|
| https://github.com/LeadMagic/gtm-skills (read `founder-led/founder-sales`, `sales-plays/product-launch-play`, `prospecting/signal-scoring`) | MIT, Copyright (c) 2026 LeadMagic LLC | Generic, with unsourced reply-rate claims, pressure tactics (an anchored concession ladder, mirroring for discounts, a 48-hour "rapid response" urgency play) and steering to paid enrichment, including its own product. Nothing beyond what we already have |
| https://github.com/sami2919/SignalForce (read `signal-scanner`, `resource-offer`) | MIT | Needs Python scripts, API keys, Sales Navigator and Phantom Buster; unsourced reply-rate claims. Its "seven sweeps" are already in survey B (item 10) |
| https://github.com/sidchaudhary/gtm-skills (read `brand-designer/onboarding-video`) | MIT, Copyright (c) 2026 Sid Chaudhary | Built around the author's own platform; every video ends with a "Powered by Intempt" card. One small idea, building a recorded demo backward from the first-value moment, is already close to demo-script's structure |
| https://github.com/chadboyda/agent-gtm-skills | No LICENSE file (README says MIT) | Ideas only. Used one idea, in `sample-offer`. Rest: paid tools and unsourced benchmarks |
| https://github.com/Cold-IQ/ColdIQ-s-GTM-Skills, https://github.com/ncklrs/startup-os-skills, https://github.com/saberapp/skills | No licence file in any of the three | Not read beyond the listing |
| https://github.com/anthropics/knowledge-work-plugins `sales/skills/pipeline-review` | Apache-2.0 | Read. Its stage rollup and risk flags (stale, slipping, blank next step) need CRM history we don't have; worth a look once `leads.mjs` holds 20+ open deals. Its opening rule block says to take requested actions and never refuse them (not followed; same as survey A noted) |
| https://github.com/anthropics/skills | Mixed (Apache-2.0 for most skills) | No sales or research skills. `webapp-testing` would need Playwright installed, which is against the no-install rule here |
| GitLab handbook, https://gitlab.com/gitlab-com/content-sites/handbook (`content/handbook/solutions-architects/demonstrations.md`) | The repo LICENSE grants MIT "with regard to the GitLab Software"; it doesn't clearly cover handbook text | The demonstrations page is mostly links to internal demo systems. Not used |
| Skill registries found in search (claudskills.com, skills.sh, skillsmp.com, openskillindex.com, clawhub.ai) | n/a | Directories, not sources. Used only to find repos |

## Instructions found inside sources (none followed)

- TheCraigHewitt skills tell the running agent to read `.agents/sales-context.md` and to tell the user to run their `sales-context` skill first.
- goose-skills briefs tell the agent never to stop and ask, to call `gooseworks:*` tools, to offer paid top-ups, and to write to the vendor's own memory paths.
- The LeadMagic README gives install commands (`install.sh`, `gh skill install`, `/plugin install`).
- PostHog's served `.md` pages carry a note addressed to AI agents pointing to its `llms.txt`. I read the GitHub copies instead.
- anthropics `sales/skills/pipeline-review` opens with a block telling the agent to take any action the user asks through connectors.

None of these is aimed at us, and none was acted on.

## Limits of this survey

- **What was read.** I read the raw text of each file named above. For long files (Craig Hewitt's are 400-500 lines) I read the sections the proposals use and the section headings of the rest. goose-skills reference files other than `list-sources.md` and `listening-craft.md` weren't opened.
- **Primary versus secondary.** The HN Search API doc page didn't render through the fetch tool, so its behaviour comes from one live query on 2026-11-05, not from the docs.
- **What didn't produce a good proposal.** I found no permissively licensed source that adds a third strong skill for lead-generator. Account-sourcing hygiene is folded into item 10 rather than padded into a separate skill. For outreach, item 3 is the weakest of the three: its main idea comes from a repo with no licence file, and it depends on a spend approval.
- **Facts still needed** before some skills can be written:
  - MotionRepo's render time (item 8);
  - whether an org repo needs an admin to install the GitHub App (item 7);
  - whether trial extensions or extra credits exist (item 5).

  Each is marked `[NEEDS INPUT]` above.
- **Credits.** Any skill adopted from these needs a `docs/CREDITS.md` row: Craig Hewitt (MIT), PostHog `/contents/` (MIT), GooseWorks (MIT), GitHub Docs (CC BY 4.0, attribution required), Anthropic (Apache-2.0). Each should be in our own words.

# Part B: marketing, docs-handler, knowledge-base, developer, evaluator, coordinator

# New skills for six agents: marketing, docs-handler, knowledge-base, developer, evaluator, coordinator

Research date: 2026-11-05. This was read-only. I edited no repo file and installed or cloned nothing. I read each source file through the GitHub API, or in a browser for GitLab, Google and arXiv. Each licence comes from the source's own LICENSE file, or from the page footer where the source is a web page. Every method below is summarised in my own words. Nothing is copied.

## What I read first, and the baseline for measuring

- **Read in full:** CLAUDE.md; the six agent files; every skill they load (self-review, fact-sourcing, claim-check, early-stage-guardrails, task-briefs, comparison-page, research-rigor); the headings of the other marketing skills; `evaluation/rubrics.md`; `docs/CREDITS.md`.
- **Also read:** both 2026-11-03 surveys and the adoption shortlist; the J- reports; the board; the agents' memory files; review T-20261101-01-r1.
- **Baseline from `node scripts/stats.mjs reviews`** (a read-only script, run today):
  - First-review pass rate: 9 of 40 (n=40), 95% Wilson interval 12.3% to 37.5%.
  - Revisions: 1.22 per task (33 over n=27 tasks).
  - The script can't yet split these by agent or work type. That is a script gap and a developer handoff.
- **One correction to the brief.** I found no docs-handler customer document in `outputs/docs/`, which holds only skill drafts. The roadmap wording that reviews flagged sits elsewhere:
  - "Card and UPI are 'coming'" in the sales battlecard, `outputs/sales/2026-10-30-motionrepo-battlecard.md:30`.
  - "does not fit yet" in the marketing listing plan, flagged in `outputs/reviews/T-20261103-13-r1.md`.
  - Proposal H1 is therefore shared by docs-handler, marketing and sales.
- **Already adopted or reviewed, so not re-proposed:**
  - kai-cmo-harness, saas-marketing-agents and the wshobson / conorbronsdon / humanizer / de-slop writing checks.
  - The Anthropic knowledge-work-plugins **sales and marketing** skills.
  - From Corey Haines: directory-submissions, competitors, cro, seo-audit, analytics, launch, copy-editing and copywriting.
  - alirezarezvani competitor-alternatives and deal-desk; LaGrowthMachine; gtm-agents; louisblythe.
- **New sources used here (not reviewed in either survey):**
  - The same Anthropic repo's **customer-support** and **enterprise-search** plugins.
  - Corey Haines `public-relations`, which survey B line 225 lists as not read.
  - alirezarezvani `engineering/` skills.
  - obra/superpowers, hamelsmu/evals-skills, anthropics/claude-plugins-official.
  - Google's developer documentation style guide, The Good Docs Project and Diátaxis.

## Licences checked (from LICENSE files or page footers)

| Source | Licence | Last change to the cited file | Use |
|---|---|---|---|
| [obra/superpowers](https://github.com/obra/superpowers) | MIT, "Copyright (c) 2025 Jesse Vincent" | 2026-07-24 to 2026-11-03 | Adapt in our words, credit |
| [hamelsmu/evals-skills](https://github.com/hamelsmu/evals-skills) | MIT, "Copyright (c) 2026 Hamel Husain" | 2026-03-03 to 2026-06-10 | Adapt, credit |
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) (code-review, feature-dev, pr-review-toolkit) | Apache-2.0 (repo LICENSE and each plugin's LICENSE) | 2025-11-20 to 2026-10-26 | Adapt, credit |
| [anthropics/skills](https://github.com/anthropics/skills) `skill-creator` | Apache-2.0 (`skills/skill-creator/LICENSE.txt`) | 2026-02-25 | Adapt, credit |
| [anthropics/skills](https://github.com/anthropics/skills) `doc-coauthoring` | **No licence file in that folder.** The README says only that "many" skills are Apache 2.0 | 2025-12-04 | **Ideas only** |
| [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (customer-support, enterprise-search) | Apache-2.0 | 2026-03-13 | Adapt, credit |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) `public-relations` | MIT, "Copyright (c) 2025 Corey Haines" | 2026-10-15 | Adapt, credit |
| [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) (`agent-run-forensics`, `skill-retro`) | MIT, "Copyright (c) 2025 Alireza Rezvani" (SKILL.md frontmatter also says MIT) | 2026-10-31 | Method only, no scripts |
| [Google developer documentation style guide](https://developers.google.com/style) | CC BY 4.0 (page footer; code samples Apache-2.0) | Timeless 2024-10-15, Future 2026-05-19, Procedures 2026-10-27 | Adapt with attribution |
| [The Good Docs Project templates](https://gitlab.com/tgdp/templates) | MIT No Attribution, "Copyright (c) 2024 The Good Docs Project" | Repo activity 2026-11-04 | Adapt freely |
| [Diátaxis](https://diataxis.fr/) ([repo](https://github.com/evildmp/diataxis-documentation-framework)) | CC BY-SA 4.0 (`LICENSE.rst`) | Repo pushed 2026-10-14 | **Ideas only, written fresh**, so share-alike isn't triggered |
| [google-deepmind/long-form-factuality](https://github.com/google-deepmind/long-form-factuality) (SAFE) | Apache-2.0 for `eval/`; MIT for `third_party/factscore` | `eval/safe/README.md` 2024-03-22 (repo pushed 2026-06-18) | Method only |
| [Show HN rules](https://news.ycombinator.com/showhn.html) | No licence | n/a | Venue rules, restated as facts |
| [Doc Detective](https://github.com/doc-detective/doc-detective) | AGPL-3.0 | Pushed 2026-11-04 | **Ideas only**: no code, no install |
| arXiv 2404.12272 ("Who Validates the Validators?") | CC BY 4.0 | 2024 | Ideas, cite |
| arXiv 2306.05685 (MT-Bench), 2410.02736 (CALM), 2309.11495 (CoVe), 2305.14251 (FActScore) | arXiv non-exclusive licence | 2023-2024 | **Ideas only** |
| Anthropic engineering post, ["How we built our multi-agent research system"](https://www.anthropic.com/engineering/multi-agent-research-system) (13 June 2025) | No licence | 2025-06-13 | **Ideas only** |
| [anthropics/claude-code](https://github.com/anthropics/claude-code) plugins | "All rights reserved", commercial terms | n/a | **Don't use.** Use the Apache-2.0 copies in claude-plugins-official instead |

---

## Developer

The developer loads only `self-review`. Rubric 9 puts 30 points on "tests pass, and a test covers the fix" and 25 on "root cause supported by evidence". T-20261101-01 scored 0 of 30 on the first, then spent two reviews (57, then 64) on a change whose tests could never run.

### D1. `red-green-proof` (developer, developer-fallback)

**Sources:**
- [superpowers test-driven-development](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md) and [writing-good-tests.md](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md)
- [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md)
- All MIT. The "can't run, say so" step is our own, built on the evaluator's lesson in `.claude/agent-memory/evaluator/feedback_code_change_checks.md`.

**Method:**
0. **Preflight, before creating the branch.**
   - List the project's own checks: package.json scripts, Makefile, CI workflow files.
   - Open each script. Note what it covers (which folders) and what it needs: lockfile, `node_modules`, build output, env vars.
   - If dependencies are missing and installing isn't allowed, stop before editing. Return `needs_input` with:
     - the exact commands a person must run;
     - the score ceiling (70, because the tests criterion can't score);
     - which checks would still not cover the changed files.
   - Don't commit and send a change for review whose checks can't run, unless the brief says to.
1. **Name the break before writing the test.** One sentence: "fails today because <observed behaviour>; passes when <wanted behaviour>."
   - Expected values are hand-written literals, never computed by the code under test.
   - No assertion whose only subject is a mock.
   - No "change detector" that asserts a constant or exact wording, unless the wording is the fix. For copy or config fixes, assert on the rendered output or on the function that uses the value.
2. **RED.** Run only the new test with the project's runner. Record the command, exit code and message. Confirm it fails for the expected reason, not an import error or typo.
3. **GREEN.** Make the smallest change. Re-run the test, then the full suite, type check and lint. Record exit codes and pass and fail counts. Never write "all pass" when one failed.
4. **Revert proof.** Take the fix out and keep the test (`git stash` on the local branch, or comment the fix out in a scratch copy). The test must fail. Restore the fix; the test must pass. Paste all three results.
5. **Gate on completion claims.**
   - Every "passes", "fixed" or "works" in `outputs/dev/<task>.md` points to a command run after the last edit.
   - "Should", "probably" and "seems" are not allowed in the results section.
   - A check that couldn't run is written "not run: <reason>; a person runs <command>".
6. **Text-only changes.** Say "no behaviour test: text-only change". Run the checks that cover those files, and name which files each check covers.

**Gap it fills:** `self-review` item 17 says checks must run but not how to prove that a test catches the bug, or what to do when nothing can run. developer.md step 6 asks for a test that "fails before and passes after" but gives no proof routine.

**How we'd measure it:**
- Code-change rubric criterion 1 on the first review (baseline: T-20261101-01, 0 of 30).
- Count of code tasks that reach review with zero checks run (target 0: they should return `needs_input` first).
- Revisions per developer task, from `stats.mjs reviews --list` matched to board owners.

**Conflicts and what to leave out:**
- Superpowers' "delete code written before the test" rule. Developer.md forbids deleting files outside the change, so say "rewrite the test first" instead.
- Its worktree and finish-a-branch skills, which merge, push or open PRs (hard rule 1).
- Any dependency install: `npm ci` is refused here, so a person runs it.

### D2. `root-cause-first` (developer, developer-fallback)

**Sources:** [superpowers systematic-debugging](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md) and [root-cause-tracing.md](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/root-cause-tracing.md), both MIT.

**Method:**
1. **Investigate.**
   - Read the whole error.
   - Reproduce it with exact steps, or write down why you can't.
   - Check recent changes (`git log` and diff on the path, merged PRs).
   - For a flow that crosses parts (page, then API, then job, then store), log once what enters and leaves each boundary to find the failing layer. Print only SET or UNSET for config and never values.
2. **Trace backwards.** From the symptom line, ask "what called this, with what value?" until you reach the origin. Fix at the origin.
3. **Compare.** Find a working sibling in the same repo and list every difference.
4. **One hypothesis at a time.**
   - Write it as "X causes it because Y (file:line or output)".
   - Test it with the smallest change.
   - If it fails, form a new hypothesis. Never stack fixes.
5. **Stop rule.** After three failed fixes, stop and return `blocked` with what was tried. Three failures usually mean a design problem, and a person decides.
6. **Write-up section "Root cause":**
   - symptom;
   - origin (file:line);
   - the evidence chain, each link labelled *seen* or *inferred*;
   - hypotheses rejected and why;
   - setting-dependent behaviour tested both ways (developer memory, 2026-11-01).
   - Remove all diagnostic logging before the commit.

**Gap it fills:** developer.md step 4 says "reproduce if you can" but gives no method. Two memory lessons are symptoms of untraced causes:
- a "stays true when the setting is 0" claim that was false;
- a literal grep that missed reworded copy.

**How we'd measure it:**
- Rubric criterion 2 ("root cause supported by evidence", 25 points) on the first review.
- Evaluator findings of the kind "root cause assumed".

**Conflicts and what to leave out:**
- The source's instrumentation example prints signing identities from the keychain. Leave it out: hard rule 6 (no secrets).
- "Discuss with your human partner" becomes status `blocked` plus a question.

### D3. `taking-review-fixes` (developer and fallback first; later any specialist, if it measures well)

**Source:** [superpowers receiving-code-review](https://github.com/obra/superpowers/blob/main/skills/receiving-code-review/SKILL.md), MIT.

**Method:**
1. Read every numbered fix before touching anything. Restate each in one line in a "Fix log" table: fix number, the request, the place.
2. Check each fix against the code before changing it:
   - Is it right for this repo?
   - Would it break something?
   - Is there a reason for the current code?
   - If you can't check it, say what you'd need.
3. If any fix is unclear, implement none of them. The fixes may be linked. Return `needs_input` with the specific question.
4. Push back with evidence (file:line, test output) when a fix is wrong. The coordinator and the evaluator decide. Don't agree for show and don't thank: state what changed.
5. Order the work: blocking first (failing tests, hard-rule or safety items), then simple, then complex. Re-run the covering tests after each fix and the full checks at the end.
6. Fix only the named items (the rule already in CREDITS). Anything else you notice goes to handoffs.
7. Close the Fix log with each fix's state (done, pushed back, needs input), its evidence and its commit.

**Gap it fills:** no skill tells a specialist how to work through a REVISE list. `self-review` item 19 covers only "don't add facts". T-20261103-03 needed two revisions. In T-20261103-08, wrong labels passed the developer's own self-review because the brief's definition wasn't opened.

**How we'd measure it:**
- Revisions per developer task (team baseline 1.22).
- The share of fixes the evaluator marks NOT ADDRESSED in the next round (see E3).
- The number of pushbacks upheld.

**Conflicts and what to leave out:** the source's "remove the unused endpoint (YAGNI)" advice. Deleting code outside the change needs approval.

---

## Evaluator

The evaluator loads only `fact-sourcing` and `claim-check`. Its memory shows its own errors reaching specialists. For example, it listed scripts it hadn't opened and the developer copied them; a misquote was corrected only in a later round. The rubric's 0-5 scores have no anchors.

### E1. `finding-validation` (evaluator, evaluator-fallback)

**Sources:**
- [claude-plugins-official code-review command](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-review/commands/code-review.md), Apache-2.0.
- [skill-creator grader agent](https://github.com/anthropics/skills/blob/main/skills/skill-creator/agents/grader.md), Apache-2.0.

**Method:**
1. **First pass:** collect candidate findings from separate angles: rubric criteria, claims against `knowledge/`, CLAUDE.md hard rules and skill rules, and the automated check output.
2. **Validation pass.** For each High or Medium finding, re-open its exact evidence (file:line, source URL, command output) and try to disprove it.
   - Keep it only if it survives, and write how it was confirmed.
   - The burden of proof is on the finding, just as it is on a claim.
3. **Don't flag:**
   - problems that existed before the task and that it didn't touch (list them as "out of scope");
   - anything a script already fails (cite the script instead);
   - style preferences that no rule states;
   - problems that depend on inputs nobody knows;
   - items deliberately waived with a recorded reason.
4. **Each finding names the rule it breaks:** rubric line, hard rule number or skill rule, with a short exact quote.
5. **Surface compliance fails.** A section that exists but is empty or wrong, or a self-review `pass` whose evidence doesn't show the check, scores as missing.
6. **Before giving a person commands to run**, open each script and check its prerequisites (this is already in memory, and is now a step).
7. **Review footer:** "findings validated: k; dropped after validation: m".

**Gap it fills:** the evaluator has a findings format and severities (adopted 2026-11-03) but no step that tests its own findings. A wrong REVISE fix costs a whole revision round and plan quota.

**How we'd measure it:** findings withdrawn or reversed in a later round (track WITHDRAWN in E3), and specialists' upheld pushbacks (D3). Don't target the pass rate itself.

**Conflicts and what to leave out:**
- Posting PR comments and `gh pr comment` (drafts only).
- "Assume tools work, don't test them": our evaluator must run the checks.
- Parallel haiku/sonnet sub-reviewers: the evaluator's `can_ask` is only knowledge-base, so validation is a second pass by the evaluator itself.

### E2. `judge-calibration` (evaluator; the coordinator runs the agreement check)

**Sources:**
- [evals-skills write-judge-prompt](https://github.com/hamelsmu/evals-skills/blob/main/skills/write-judge-prompt/SKILL.md), [validate-evaluator](https://github.com/hamelsmu/evals-skills/blob/main/skills/validate-evaluator/SKILL.md) and [eval-audit](https://github.com/hamelsmu/evals-skills/blob/main/skills/eval-audit/SKILL.md), all MIT.
- ["Who Validates the Validators?"](https://arxiv.org/abs/2404.12272) (CC BY 4.0), for criteria drift.
- Bias list, ideas only: [MT-Bench](https://arxiv.org/abs/2306.05685) and [CALM](https://arxiv.org/abs/2410.02736).

**Method:**
1. **Anchored scores.**
   - For each rubric criterion, write 2-4 yes/no checks with plain Pass and Fail definitions.
   - The 0-5 score follows from how many checks pass. An auto-fail stays an auto-fail.
   - Write the critique, quoting the evidence, before giving the score.
2. **Code before judgment.** Anything a script can check (lint, links, gate, word counts) is the script's job. Judge only what needs interpretation.
3. **Worked examples.** Per work type, keep one clear pass, one clear fail and one borderline case. Take them from past reviews, with the human's final decision. Never use an example that is also in the measurement set.
4. **Bias checks on every review:**
   - **Length:** don't reward the longer draft.
   - **Authority:** a citation is present, but does it support the claim? Open it.
   - **Revision leniency:** score r2 against the same anchors as r1.
   - **Confident tone:** confident prose is not evidence.
   - **Order:** score each draft in a multi-draft review on its own, and not in file order.
5. **Criteria-drift line.** When a review applies a rule the rubric doesn't state (for example, "a range next to a trial call to action names the trial cap"), record it under "new criterion used". The coordinator can then promote it to the rubric, a skill or memory.
6. **Agreement check, every 20 reviews.**
   - A person labels a sample of past deliverables pass or fail without seeing the verdict.
   - Report TPR (person pass, evaluator pass) and TNR (person fail, evaluator fail) as counts.
   - Below 10 per class, write "not enough data" (our rule in early-stage-guardrails).
   - Aim for at least 80% each, and read every disagreement to fix an anchor.

**Gap it fills:**
- Unanchored 0-5 points decide PASS at 80.
- Nothing measures whether the evaluator agrees with the founders' own judgment.
- Rules invented mid-review live only in 13 memory files.

**How we'd measure it:**
- TPR and TNR from the human-labelled sample. There is no script for this yet: a handoff to developer for `stats.mjs agreement`.
- Consistency: re-score three past deliverables blind and compare the totals.

**Conflicts and what to leave out:**
- The source's binary-only rule clashes with our weighted rubric. Changing `rubrics.md` needs a person, so anchors are the step before that.
- Its Python and sklearn code, bootstrap intervals, bias-correction formula and roughly-100-trace targets. We have 59 review files.
- Synthetic data, review interfaces and observability connectors (Phoenix, Braintrust, LangSmith).
- Labelling must be done by a person, not an agent.

### E3. `scoped-re-review` (evaluator; the coordinator triggers it, including after a PASS)

**Sources:**
- [superpowers re-review-prompt.md](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/re-review-prompt.md) and [references/fix-loop.md](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/references/fix-loop.md), MIT.
- Typed claims and "stale", from [agent-run-forensics](https://github.com/alirezarezvani/claude-skills/blob/main/engineering/agent-run-forensics/skills/agent-run-forensics/SKILL.md), MIT.

**Method:**
1. **Inputs:**
   - the last review's numbered fixes;
   - the change since that review (`git diff <reviewed commit>..HEAD` for code, or a diff against the reviewed copy, which the coordinator saves at review time, for markdown);
   - the specialist's Fix log (D3).
2. **Give each fix a verdict:** ADDRESSED, NOT ADDRESSED or WITHDRAWN (the evaluator was wrong), with file:line.
3. **Check only the changed lines for new problems:**
   - new claims;
   - new numbers;
   - stale copies of the corrected text elsewhere in the file (grep the whole file for the old words, as memory already says).
4. **Out-of-scope observations** are listed but don't extend the loop or change the verdict, unless they are an auto-fail or touch a hard rule.
5. **Self-review lines as typed claims:** ran, passed, edited, not edited. Check each against the output or the diff.
   - **STALE:** the check passed before a later edit to the same file. Re-run it.
   - **PARTIAL:** the exit code came from the last command in a chain.
6. **Re-score only the criteria the fixes touched.** Carry the others forward with a note.
7. **Wording changes after a PASS** get this short check instead of "not re-reviewed".

**Gap it fills:**
- Reports keep saying "wording after the PASS ... not re-reviewed": J-20261103-01 and -02, and board rows T-20261103-05 to -13.
- Second-round reviews either redo everything, which costs quota, or miss what the fix itself broke (evaluator memory, "revision round checks").

**How we'd measure it:**
- "Not re-reviewed" lines in reports (target 0).
- New problems caught in fix diffs.
- Rounds per task.

**Conflicts and what to leave out:**
- The source's "don't re-run the suite". Our code rubric needs the evaluator's own test run, so at least run the covering tests.
- Subagent dispatch and model tiers.
- The forensics Python scripts and hook (method only).

---

## Coordinator

The coordinator loads `early-stage-guardrails` and `task-briefs`. Several costly failures could have been predicted before dispatch:
- tests that couldn't run (T-20261101-01);
- a researcher with no shell asked to run lint;
- a lead test that launch listings can never meet (J-20261101-02: 0 leads after two revisions);
- two proposals editing one confirmed file by line number.

### C1. `dispatch-preflight` (coordinator)

**Sources:**
- [superpowers preflight.md](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/references/preflight.md) and [dispatching-parallel-agents](https://github.com/obra/superpowers/blob/main/skills/dispatching-parallel-agents/SKILL.md), MIT.
- Anthropic's [multi-agent research system post](https://www.anthropic.com/engineering/multi-agent-research-system), ideas only.

**Method, before launching a chain:**
1. **Feasibility, per task.** Check that:
   - the owner's `tools:` line covers every check in the brief (shell, WebFetch, Edit);
   - its inputs exist as files;
   - a customer-facing task has a confirmed fact sheet;
   - a code task's repo has dependencies installed;
   - every test in the brief can be met from sources the agent can reach.

   For each "no": run the check yourself, change the brief, or ask once. State any score ceiling in the brief.
2. **Conflict table.**
   - One row per pair of tasks that share a file, output, branch or definition: what one produces and what the other uses.
   - One row per task: does the brief contradict itself, a hard rule, a skill rule or a rubric auto-fail?
   - Rule on each row and log it in Assumptions as "Ruling: what — why — cost if wrong".
   - "The scan is clean" counts only with the rows written.
3. **Effort budget and stop condition in every brief.**
   - Scale to the task: one agent and a few sources for a lookup; 2-4 parallel tasks for a comparison; more only for broad research.
   - Add a stopping rule, such as "stop when N candidates are checked, or when 5 searches in a row find nothing new". The post saw overspending on simple queries and endless searches for sources that don't exist.
4. **Parallel only when independent.** No shared file, branch or state, and never two writers on one file.
5. **Brief additions.** State what earlier tasks decided that this brief can't know. Hand over file paths, never pasted history.

**Gap it fills:** task-briefs fixes a brief's fields but has no feasibility, conflict or effort check.

**How we'd measure it:**
- Tasks ending `blocked` or `needs_input` for reasons that could have been known before dispatch, counted from reports.
- Revisions per task (baseline 1.22, n=27).
- First-review pass rate (baseline 9 of 40).

**Conflicts and what to leave out:**
- The source's "decide rulings yourself and keep going" never extends to outside actions or approvals.
- Its worktree scripts and model-tier choices (each agent's file fixes its model).
- Implementer subagents that commit, merge or push.

### C2. `failure-mode-review` (coordinator; every 10 closed tasks or monthly)

**Sources:**
- [evals-skills error-analysis](https://github.com/hamelsmu/evals-skills/blob/main/skills/error-analysis/SKILL.md) and [eval-audit](https://github.com/hamelsmu/evals-skills/blob/main/skills/eval-audit/SKILL.md), MIT.
- The filing bar, and "every suggestion cites a run", from [alirezarezvani skill-retro](https://github.com/alirezarezvani/claude-skills/blob/main/engineering/skill-retro/skills/skill-retro/SKILL.md), MIT.

**Method:**
1. **Sample:** every review file since the last pass, plus fallback switches, "Update after this report" notes and "not re-reviewed" items in reports.
2. **For each REVISE, note the first thing that went wrong** as an observation, not an explanation, with the review file and fix number. Errors cascade, so later symptoms go.
3. **Group into 5-10 named categories,** each with a one-sentence definition. Split notes that look alike but have different causes. Examples:
   - claim stretched beyond its fact-sheet line;
   - absence claimed from the homepage alone;
   - check not run, or a false pass;
   - roadmap wording;
   - deliverable shape doesn't match the brief.

   An LLM may help group, but only after 30 notes have been read by hand.
4. **Label every review against every category.** Counts are "k of n reviews" until a script exists. There is no script for this yet: a handoff for `stats.mjs failures`.
5. **Choose the cheapest fix first:** a brief or skill line, then a warning-only lint check (a developer task, and a person approves), then an evaluator check. Build a new skill only after that.
   - **Filing bar:** would a capable agent with the current instructions still fail this way? If not, it's a brief problem.
   - Every proposed change cites the reviews behind it.
6. **Stop** when the last ~10 reviews add no new category.
7. **Output:** `outputs/reports/<date>-failure-modes.md`, with:
   - category, definition, count, example, owner and fix chosen;
   - categories closed since the last pass;
   - lessons to retire from memory.

**Gap it fills:**
- The after-task review records one lesson per task, and the ladder (memory, then skill, then lint) exists, but nothing counts across tasks.
- Memory keeps growing: the evaluator has 13 feedback files.

**How we'd measure it:**
- Share of REVISE reviews in the top three categories, before and after each fix lands (k of n).
- First-review pass rate.
- Memory lines retired.

**Conflicts and what to leave out:**
- The source's ~100-trace target and failure-rate percentages. We have 59 files, so report tallies and follow the n rules.
- Synthetic traces, review interfaces and observability connectors.
- skill-retro's transcript-harvesting scripts: transcripts can hold personal data and secrets.

### C3. `verify-before-reporting` (coordinator)

**Sources:**
- [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md) (its row on delegated agents) and the ledger and ruling format in [subagent-driven-development](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md), MIT.
- [agent-run-forensics](https://github.com/alirezarezvani/claude-skills/blob/main/engineering/agent-run-forensics/skills/agent-run-forensics/SKILL.md), MIT.

**Method:**
1. **Treat each specialist's RESULT block as claims.** Before a report line repeats one:
   - grep the file for the edit;
   - for code, read `git log` and the diff;
   - re-run the one-line commands whose results you quote (lint, links, `leads.mjs check`), after the last edit.
2. **Write report facts as typed claims:** ran, passed, edited, not edited, nothing sent. Each comes with its command or file:line. Mark STALE if the file changed after the check.
3. **Keep a ledger in long `/do` and Jarvis chains:** each step, file or commit, review round and ruling, in the report draft as you go. After context compaction, trust the ledger and `git log` over memory.
4. **Wording changed after a PASS?** Send it for E3 before reporting.
5. **No "should", "probably" or "all pass"** in Result lines without the counts.

**Gap it fills:**
- Coordinator memory (2026-11-03): a specialist's report can describe an edit it didn't make.
- J-20261101-03 needed an "Update after this report" correction.
- The coordinator has no verification skill.

**How we'd measure it:**
- Report statements corrected later, by a person or in a later report.
- "Not re-reviewed" lines (shared with E3).

**Conflicts and what to leave out:**
- Superpowers' workspace scripts and git clean-up steps.
- No personal data in the ledger.

---

## Docs-handler

The docs-handler loads fact-sourcing, claim-check, self-review and comparison-page. It has nothing on article structure, reader testing or time-bound wording. Rubric 8 puts 35 points on "steps match the product" and 25 on "a new user can follow it".

### H1. `timeless-wording` (docs-handler, marketing, sales, demo-handler and their fallbacks)

**Sources:** Google style guide, [Timeless documentation](https://developers.google.com/style/timeless-documentation) and [Future features](https://developers.google.com/style/future), CC BY 4.0. Our claim-check states are the base.

**Method:**
1. Customer-facing text describes what exists today, in the present tense.
2. **Words to find and fix:**
   - coming, soon, yet, not yet, eventually, in the future, upcoming, on the way, planned;
   - currently, at present, now;
   - new, newer, latest, as of this writing, existing, old.
3. **For what isn't available,** use the claim-check forms:
   - "Not available today."
   - "MotionRepo doesn't do X. It does Y instead."

   Never imply a date. "Yet" implies a roadmap (lesson from T-20261103-13).
4. **Unreleased or switched-off features never appear in public text,** even indirectly ("we're adding ...").
5. **When our own live page uses future wording** (for example /pricing's UPI "coming later"), customer text still states today's fact: "Payment is by invoice; card and UPI aren't available today." Quote the page, with its URL and date, only in internal notes.
6. **Exceptions:**
   - dated items (release notes, changelog, a dated post) may say "new in <version or date>";
   - a step may describe a change of state ("after a few seconds the status shows Ready").
7. **Self-review check:** grep for the word list, then fix each hit or justify it.
8. **Suggest a warning-only list** in `voice-rules.json` for `--type general|seo|email`. That is a developer task, and a person approves it.

**Gap it fills:** the same failure across three agents:
- "coming" in the sales battlecard (line 30);
- "does not fit yet" in the marketing listing (review T-20261103-13-r1);
- a marketing memory lesson that says the same.

Following the team's ladder, a repeat lesson becomes a skill rule and then a lint check.

**How we'd measure it:**
- Hits on the word list in customer-facing outputs at hand-in.
- Evaluator findings about roadmap wording over the next 10 customer-facing reviews (target 0).

**Conflicts and what to leave out:** Google's exception for pre-announcements approved by legal counsel. Here any pre-announcement goes to a person through `ops/approvals.md`.

### H2. `help-article-types` (docs-handler, docs-handler-fallback)

**Sources:**
- [knowledge-work-plugins customer-support kb-article](https://github.com/anthropics/knowledge-work-plugins/blob/main/customer-support/skills/kb-article/SKILL.md), Apache-2.0.
- [Good Docs quickstart guide](https://gitlab.com/tgdp/templates/-/blob/main/quickstart/guide_quickstart.md) and the [templates](https://gitlab.com/tgdp/templates) (how-to, troubleshooting), MIT-0.
- [Diátaxis compass](https://diataxis.fr/compass/), CC BY-SA 4.0, ideas only.
- [Google, Procedures](https://developers.google.com/style/procedures), CC BY 4.0.

**Method:**
1. **Pick one type per article** with two questions: is the reader doing or understanding, and learning or working?
   - doing + learning: getting started or tutorial;
   - doing + working: how-to;
   - understanding + working: reference;
   - understanding + learning: explanation;
   - support types: troubleshooting, FAQ, known limitation.

   Split any article that mixes types.
2. **Titles in the customer's words.** Use the research-rigor language bank and exact error text, for example "Fix: video job stays queued".
3. **The first sentence states the task or problem.** An FAQ answers in sentence one.
4. **Getting started** covers one core outcome, such as the first video or doc from a repo. Sections:
   - prerequisites, from confirmed facts (GitHub account, repo access, trial limits);
   - steps;
   - "Check it worked";
   - next steps.

   Keep it short and strip setup the reader doesn't need.
5. **Procedure rules:**
   - numbered steps, one action each;
   - place before action ("On the **Projects** page, click ...");
   - goal before action ("To regenerate the docs, ...");
   - "Optional:" as a prefix;
   - the result after the action;
   - UI labels in bold, exactly as the code's strings;
   - no "above", "below" or "please";
   - a needed key press goes in the same step.
6. **Troubleshooting:** symptoms first, then the cause in plain words, then the most likely fix first, then "Still stuck?" with the confirmed support channel.
7. **Known limitation:** what doesn't work, and the workaround. Never a fix date.
8. **Metadata block:** type, audience, date checked, code sources, review-by date.
9. **Docs audit priority:** questions from calls, objections and the reply content-gap list that have no article, counted k of n.

**Gap it fills:** article structure is three lines in docs-handler.md. Rubric 8 weights "new user can follow it" (25), "covers real questions" (10) and "one task, numbered steps" (10).

**How we'd measure it:** first-review help-doc scores on those three criteria, and rounds to PASS.

**Conflicts and what to leave out:**
- kb-article's "Fix timeline: expected date". It breaks claim-check: no dates.
- Its connectors (support platform, project tracker), helpfulness analytics (no data) and "publish-ready" framing (drafts only).
- Diátaxis is share-alike: describe the compass in our own words and credit it.

### H3. `reader-test` (docs-handler; the cold read is run by the evaluator or a person)

**Sources:**
- [anthropics/skills doc-coauthoring, "Reader Testing"](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md) (no licence file, so ideas only).
- kb-article's "test articles with someone unfamiliar" (Apache-2.0).
- The Good Docs quickstart's "make sure it works" (MIT-0).
- The docs-as-tests idea from [Doc Detective](https://github.com/doc-detective/doc-detective) (AGPL-3.0, so ideas only).

**Method:**
1. **Step trace table, one row per numbered step:**
   - the UI text or command;
   - the evidence it exists: repo path:line of the route, component or label string, or a live URL and the date fetched;
   - the expected result;
   - verified, or `[VERIFY]`.

   A step with no evidence stays `[VERIFY]`. This makes the existing rule systematic.
2. **Predict 5-10 reader questions** from objections, the reply content-gap list and first-hour gaps. Give each an expected answer and a source.
3. **Cold read.** Someone who hasn't seen the work answers each question from the article alone, scored right, wrong or ambiguous.
   - The docs-handler can't launch a fresh agent outside `can_ask`, so the evaluator does this first in a help-doc review, before opening the code. A person can do it instead.
4. **Ambiguity pass:**
   - terms used before they are defined;
   - steps that assume a state no earlier step created;
   - contradictions with other articles or the fact sheet.
5. **Fix, then re-ask** only the failed questions.

**Gap it fills:** nothing currently tests a doc from the reader's side, although 60 rubric points depend on it.

**How we'd measure it:**
- `[VERIFY]` markers left at hand-in.
- Reader questions answered right (k of n).
- First-review scores on rubric 8's first two criteria.

**Conflicts and what to leave out:**
- Driving the live product through GitHub sign-in is a person's job. Agents never enter credentials.
- No Doc Detective install or code (AGPL).
- If a fresh reader agent is wanted, adding it to docs-handler's `can_ask` is a config change that needs a yes.

---

## Knowledge-base

There is no off-the-shelf fact-sheet skill. The three below adapt research on fact-checking long answers, a code-tracing agent, and knowledge-base upkeep.

### K1. `atomic-fact-check` (knowledge-base; evaluator optional for fact-sheet reviews)

**Sources:**
- SAFE, [eval/safe/README.md](https://github.com/google-deepmind/long-form-factuality/blob/main/eval/safe/README.md) (Apache-2.0).
- Ideas only: [FActScore](https://arxiv.org/abs/2305.14251) and [Chain-of-Verification](https://arxiv.org/abs/2309.11495).

**Method:**
1. **Split each fact-sheet line, and each proposal's new text, into atomic facts:** one subject, one property, one value.
2. **Make each fact stand alone.** Replace "it", "this plan" and "the trial" with full names. Add scope: plan, date, currency.
3. **Find joins.** Words like "and", "with", "from one", "the same" and "so" link two facts. The link is its own fact and needs its own source (claim-check rule 6, now with a procedure).
4. **Verification questions, answered blind.** For each fact, write a question ("What starts the video job?"). Answer it from the source alone (repo path:line, live URL, a person) without looking at the draft line. Then compare.
5. **Verdict per fact:**
   - supported (source and date);
   - contradicted (record both under Open questions);
   - not found (leave it empty and add a question);
   - out of scope.
6. **Keep a facts table:** id, atomic fact, source, verified date, verdict. Compound lines list their fact ids.

**Gap it fills:** "documents and video from one run" was a compound claim sitting in a confirmed sheet, until the code showed a separate pipeline (T-20261101-02). Rubric 1 puts 35 points on "spot-checked sources support every fact".

**How we'd measure it:**
- Evaluator spot-check hold rate on fact sheets and proposals.
- Joined claims caught per sheet.
- Corrections to confirmed facts later (target fewer).

**Conflicts and what to leave out:**
- SAFE's paid APIs (Serper, OpenAI), and its use of search snippets as evidence. fact-sourcing says to open the page.
- Atomising a whole sheet costs many tokens, so apply it to new or changed lines and to claims used in customer-facing work.

### K2. `feature-status-trace` (knowledge-base)

**Sources:**
- [claude-plugins-official feature-dev code-explorer](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/feature-dev/agents/code-explorer.md), Apache-2.0.
- [superpowers root-cause-tracing](https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/root-cause-tracing.md), MIT.
- Our own evaluator's live-flag check (`/api/auth/options`, review T-20261101-01-r1).

**Method, per feature claim:**
1. **Entry point:** where a user reaches it (route, page component, API endpoint), as path:line. No entry point means not live.
2. **Flow:** follow the calls to the effect (job queue, store, outside API). Name the step that does what the claim says.
3. **Switches:** flags, env vars and their code defaults, plan gates in pricing config, approvals and caps. Record the behaviour under both settings.
4. **Production evidence:** public pages or endpoints that reveal a switch, with the date seen. Never read `.env` and never sign in.
5. **Tests** that assert the behaviour (path:line).
6. **Status rule:**

   | Status | When |
   |---|---|
   | Live | Entry point, default on, and seen on the live site |
   | Beta | Reachable but flagged, labelled beta or limited |
   | Off | Built but switched off: claim-check's "Roadmap, no date" |
   | Planned | Only in docs, roadmap, TODO or issues |
7. **The source cell holds the trace:** entry, handler, switch (default), live evidence.

**Gap it fills:**
- Rubric 1 puts 20 points on live, beta and planned being correctly separated, and knowledge-base.md step 3 gives no procedure.
- Past slips: the "one run" positioning, and "approved by hand" against an auto-approve flag that is on.

**How we'd measure it:** evaluator corrections to status labels, and proposals that change a status after confirmation.

**Conflicts and what to leave out:** don't change the repo, run the app with secrets, or sign in (hard rules 1 and 6).

### K3. `knowledge-upkeep` (knowledge-base)

**Sources:** knowledge-work-plugins [kb-article](https://github.com/anthropics/knowledge-work-plugins/blob/main/customer-support/skills/kb-article/SKILL.md) (upkeep schedule and lifecycle) and [knowledge-synthesis](https://github.com/anthropics/knowledge-work-plugins/blob/main/enterprise-search/skills/knowledge-synthesis/SKILL.md) (freshness, authority and agreement; what not to merge). Both Apache-2.0.

**Method:**
1. **Each fact gets a `verified:` date and a volatility class.**
   - Volatile: prices, plan limits, trial caps, flags, competitor prices. Re-check before any customer-facing use and at most every 90 days, matching fact-sourcing.
   - Stable: company facts. Every 90 days.
2. **Change watch.** For facts sourced to repo paths, list the commits on those paths since the verified date (`gh api "repos/<owner>/<repo>/commits?path=<path>&since=<date>"`, read-only). Re-check only those facts. Re-fetch cited URLs.
3. **When answering other agents, give a confidence level** from three things:
   - freshness (the date);
   - authority (person, then code, then our own page, then third parties);
   - agreement between sources.

   Say so plainly when an answer rests on one source or an old one.
4. **Don't merge facts that changed over time.** Keep the old and new values with their dates in a Changes log. Proposals show the current and proposed text. Never pick between disagreeing sources (team rule).
5. **Status hygiene scan:**
   - frontmatter status against body lines that say "proposed";
   - proposals that edit by line number;
   - two proposals against the same file, which need an order.
6. **Lifecycle:** proposed, confirmed, needs update (flagged, never edited), deprecated.
7. **Monthly housekeeping note:**
   - `kb.mjs status` ages;
   - facts past their date;
   - commits since verification;
   - open conflicts.

**Gap it fills:**
- knowledge-base.md only flags whole files older than 90 days.
- Memory has three lessons on status mismatches and line-number proposals.

**How we'd measure it:** stale facts caught by knowledge-base before a customer-facing task, against those caught by the evaluator in review.

**Conflicts and what to leave out:**
- knowledge-synthesis's "latest wins" merge rule: we record both.
- Connectors (chat, email, drive) and helpfulness analytics.

---

## Marketing

Marketing is the best-covered agent, with 12 skills. Honestly, only PR is a clear gap. M2 is the shared H1 and M3 is modest.

### M1. `press-pitch` (marketing, marketing-fallback)

**Source:** [Corey Haines public-relations](https://github.com/coreyhaines31/marketingskills/blob/main/skills/public-relations/SKILL.md) and [references/journalist-pitching.md](https://github.com/coreyhaines31/marketingskills/blob/main/skills/public-relations/references/journalist-pitching.md), MIT. Survey B line 225 lists it as not read.

**Method:**
1. **Gate: is PR worth it now?** It needs:
   - a real story: data we own, a founder's sharp opinion, a confirmed milestone, or a customer before-and-after with a proof-library permission;
   - founder time;
   - a page for readers to land on.

   "We exist" before launch goes on the not-yet list (early-stage-guardrails).
2. **Pick one angle:**
   - the founding story;
   - small against large;
   - a broken system the product fixes (never a named competitor).

   The product is the evidence, not the story.
3. **Media list, 20-40 at most, from public pages.** For each journalist, newsletter or podcast record:
   - the last five pieces read (URLs, dates);
   - beat match;
   - whether the outlet reaches the ICP;
   - a published business contact or the outlet's pitch form;
   - "no PR pitches" notes, which are respected.

   Score beat ×3, ICP fit ×2, recency ×1. Reach without a source is "unknown".
4. **Pitch draft, under 150 words:**
   - a subject that predicts the headline;
   - a first line tied to their recent piece;
   - a one-line story;
   - why their readers care;
   - what's new, from confirmed facts;
   - an offer (interview, demo, data);
   - one ask.
5. **Quality bar:**
   - beat checked;
   - a real hook;
   - the journalist could write the story from the email alone;
   - one clear ask;
   - lint clean.
6. **Press page and media kit checklist** from confirmed facts: description, founder bios (the person approves), logos, screenshots, contact.
7. **Outcome before drafting:** placements, sign-ups through a tagged link, sales calls that cite coverage. No ad-value equivalents.

**Gap it fills:** marketing.md promises "press releases, journalist and newsletter pitches". No skill covers them. Survey A judged press-release shells low value with no customers, and this source's "when to skip" gate fits that finding.

**How we'd measure it:** first-review marketing scores on PR drafts and claims traced. Journalist replies k of n need a script that doesn't exist yet.

**Conflicts and what to leave out:**
- Newsjacking's "speed over polish": drafts still go through review.
- Answering HARO or Qwoted queries is sending, so a person does it.
- Domain rating (paid Ahrefs), Muck Rack beyond the free tier, and "AI citation rate" claims.
- Crisis-communication templates: a person owns those.
- Exclusives and embargoes are `[NEEDS APPROVAL]`.
- Journalist details are published professional contacts only, never guessed (hard rules 2 and 3).

### M2. `timeless-wording` (shared, see H1)

Marketing memory already holds the "never 'yet'" lesson. Moving it into a skill is the team's own next step up the ladder.

### M3. `community-launch-post` (marketing; lower priority)

**Source:** [Show HN rules](https://news.ycombinator.com/showhn.html) (no licence: venue rules restated as dated facts).

**Method:**
1. **Eligibility, from the venue's own rules page, dated.**
   - Show HN wants something people can try.
   - Sign-up pages, landing pages and reading material don't count.
   - The rules ask for easy access without sign-up.
   - MotionRepo's trial needs GitHub sign-in. Check whether a no-sign-in sample exists, and flag the risk.
2. **Draft the post in the maker's first person:** what it is, how and why it was built, and what feedback is wanted. Confirmed facts only, no marketing words. The maker posts it.
3. **No vote or comment requests** to friends or the team.
4. **Answer bank** for the maker, from FAQs and confirmed limits.
5. **Track** sign-ups through a tagged link. Objections raised in comments go to the content-gap list.

**Gap it fills:** marketing.md says to launch in the channel map's communities "following each venue's rules". directory-listing covers directories, not discussion sites.

**How we'd measure it:** venue-rule findings in review (target 0).

**Conflicts and what to leave out:** posting is an outside action. No account warm-up (already rejected as faked engagement).

---

## Considered and not proposed

| Source | Licence | Why not now |
|---|---|---|
| [anthropics/skills webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | Apache-2.0 | Playwright checks of UI steps would help the developer and the docs-handler, but Playwright must be installed. Revisit if a person installs it |
| [pr-review-toolkit pr-test-analyzer](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/pr-review-toolkit/agents/pr-test-analyzer.md) | Apache-2.0 | Rating missing tests 1-10 by risk is a useful optional line for D1 or E1, not a skill of its own |
| [Google eng-practices](https://github.com/google/eng-practices) | CC BY 3.0 | Solid review checklist, but last pushed 2024-09, and the evaluator's code checks already go deeper |
| [Corey community-marketing](https://github.com/coreyhaines31/marketingskills/blob/main/skills/community-marketing/SKILL.md) | MIT | About building your own community, and it carries unsourced benchmarks |
| hamelsmu `generate-synthetic-data`, `build-review-interface` | MIT | Need volume and tooling we don't have |
| alirezarezvani `agent-regression-evals`, `skill-retro` scripts | MIT | Python transcript harvesting raises privacy questions and needs installs. Only the methods are used (C2, E3) |

## Measuring whether new skills help (applies to all)

- **Judge each skill on the next 10-15 tasks of its type,** against the baseline above:
  - first-review pass rate, 9 of 40;
  - revisions per task, 1.22.

  Below n=15, report tallies and never change course on a rate (early-stage-guardrails).
- **Script gap:** `stats.mjs reviews` can't filter by owner or work type. Hand off "add `--owner` from `ops/board.md`" to the developer.
- **Optional A/B test** using skill-creator's [blind comparator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/agents/comparator.md) (Apache-2.0):
  - re-run 3 past briefs with and without the new skill;
  - have the evaluator judge the outputs unlabelled.

  This spends Max-plan runs, so ask first (memory rule).
- **Keep each SKILL.md to 40-80 lines.** Every loaded line costs tokens on every run. After this, the developer, evaluator and coordinator would load 3-5 skills each.

## Suggested order

1. H1, `timeless-wording`: small, and fixes a repeat failure in three agents.
2. D1, `red-green-proof`: the developer's biggest score lever (30 points).
3. C1, `dispatch-preflight`: stops revisions spent on blocked tasks.
4. E3, `scoped-re-review`: ends "not re-reviewed".
5. E1, `finding-validation`.
6. K2, `feature-status-trace`.
7. H2, `help-article-types`, and H3, `reader-test`.
8. C2, `failure-mode-review`.
9. E2, `judge-calibration`: needs a person to label.
10. K1, K3, D2, D3, M1, then M3.

Each one follows the team's path: a draft under `outputs/<area>/skill-drafts/`, then an evaluator review, then a person's yes, then `skills.mjs give`, plus a CREDITS row. Credit Google and Diátaxis by name and link. Keep the MIT notices in CREDITS as the team already does.

## Sources

- https://github.com/obra/superpowers (LICENSE); skills/test-driven-development/SKILL.md; skills/test-driven-development/writing-good-tests.md; skills/verification-before-completion/SKILL.md; skills/systematic-debugging/SKILL.md; skills/systematic-debugging/root-cause-tracing.md; skills/receiving-code-review/SKILL.md; skills/dispatching-parallel-agents/SKILL.md; skills/subagent-driven-development/SKILL.md, re-review-prompt.md, references/preflight.md, references/fix-loop.md, references/cannot-verify.md
- https://github.com/hamelsmu/evals-skills (LICENSE); skills/write-judge-prompt, validate-evaluator, error-analysis, eval-audit
- https://github.com/anthropics/claude-plugins-official (LICENSE and plugin LICENSEs); plugins/code-review/commands/code-review.md; plugins/feature-dev/agents/code-explorer.md; plugins/pr-review-toolkit/agents/pr-test-analyzer.md
- https://github.com/anthropics/skills (README); skills/doc-coauthoring/SKILL.md; skills/skill-creator/LICENSE.txt, agents/grader.md, agents/comparator.md
- https://github.com/anthropics/knowledge-work-plugins (LICENSE); customer-support/skills/kb-article/SKILL.md; enterprise-search/skills/knowledge-synthesis/SKILL.md
- https://github.com/coreyhaines31/marketingskills (LICENSE); skills/public-relations/SKILL.md, references/journalist-pitching.md; skills/community-marketing/SKILL.md; skills/social/SKILL.md (headings)
- https://github.com/alirezarezvani/claude-skills (LICENSE); engineering/agent-run-forensics/skills/agent-run-forensics/SKILL.md; engineering/skill-retro/skills/skill-retro/SKILL.md
- https://developers.google.com/style/timeless-documentation ; https://developers.google.com/style/future ; https://developers.google.com/style/procedures
- https://gitlab.com/tgdp/templates (LICENSE); quickstart/guide_quickstart.md
- https://diataxis.fr/compass/ ; https://github.com/evildmp/diataxis-documentation-framework (LICENSE.rst, source/compass.rst)
- https://github.com/google-deepmind/long-form-factuality (LICENSE, eval/safe/README.md)
- https://github.com/doc-detective/doc-detective (licence via API: AGPL-3.0)
- https://github.com/google/eng-practices (LICENSE: CC BY 3.0)
- https://news.ycombinator.com/showhn.html
- https://www.anthropic.com/engineering/multi-agent-research-system
- https://arxiv.org/abs/2404.12272 ; https://arxiv.org/abs/2306.05685 ; https://arxiv.org/abs/2410.02736 ; https://arxiv.org/abs/2309.11495 ; https://arxiv.org/abs/2305.14251
- Search pages used only to find sources, not cited for claims: https://kortix.com/marketplace/hamelsmu--evals-skills/validate-evaluator ; https://awesome.ecosyste.ms/projects/github.com%2Fhamelsmu%2Fevals-skills
