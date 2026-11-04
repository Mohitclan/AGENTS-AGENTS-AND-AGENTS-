---
name: live-demo
description: How to run a demo where the prospect uses MotionRepo on their own repo (a reverse demo), and how to keep any live demo safe when a render is slow or fails. Use with demo-script for every demo plan and call.
---

# Live demo

MotionRepo works on the buyer's own repo, and there's no separate demo account (see the fact sheet). So the strongest demo is the prospect connecting their own repo, and every live render spends real trial credits and time.

## Reverse demo: they drive

1. **Agree the topic ahead, and say the call is theirs.** They drive; we watch, ask and take notes.
2. **Send prep with the agenda.**
   - Which repo to use: a public URL, or a private repo through the GitHub App.
   - Signing in starts their free trial.
   - Parts of the code go to Anthropic's Claude (fact sheet), so they choose the repo knowing that.

   Whether an organisation's repo needs an admin to install the App isn't on file: `[NEEDS INPUT: knowledge-base]`.
3. **Goals first**: what they're launching, when, and what good looks like.
4. **They share their screen**, sign in, connect the repo and start one output. Note where they hesitate, what they look for and what they work around.
5. **Promise a written answer** to every question, then send one: one item per question, using steps from the docs and links from the fact sheet. Anything with no doc goes to docs-handler.
6. **Recap before ending** and get each point confirmed. Then start the trial plan (trial-to-paid).

**Use the standard demo instead** (demo-script, on a sample repo the team owns, presented as a tour) when they can't connect any repo yet (pre-launch or a client's confidential code), or the call is to show something new.

## Running any live demo safely

1. **Map pain to feature first.** One row each: their pain in their words, a feature that is live per claim-check, the outcome, and proof (a proof-library row or "none"). If the pain column is empty, don't show that feature.
2. **A fallback for every live step.** Keep a ready-made output for each workflow, made on the team's own trial account from a sample repo the team owns. If a render is slow or fails: one calm line, switch to the ready-made output, send the real result afterwards. Never troubleshoot live. Render time isn't on file: `[NEEDS INPUT: developer, measured render time]`.
3. **Budget the credits.** Count the credits each live step uses (fact sheet) before the call, and keep demo-script's reset rule.
4. **Questions mid-demo.** Answer now if it's about the current screen, comes from the person who decides, or could end the deal (price, security, GitHub-only sign-in). Otherwise park it where everyone can see it, and clear every parked item before the end.
5. **Show one honest limit** that matters to them, from claim-check's "not supported" list.
6. **Screen hygiene**: notifications off, a clean browser profile, no other customers' data, no credentials visible, readable zoom.
7. **Check in after each workflow**: "Does this match what you deal with?"
8. **If a competitor comes up**, say where they're strong and what we do, following the battlecard rules.
9. **Record only with permission.** Send the recap the same day, and debrief with discovery-call's debrief steps.

## Never

- Ask the prospect for credentials, or record their screen showing private code without their yes.
- Offer extra credits or a longer trial: `[NEEDS APPROVAL]`.
- Use invented proof points. Proof comes only from proof-library rows.
