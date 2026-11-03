---
name: objection-handling
description: A method for answering sales objections honestly, plus the common SaaS objections and how to prepare for them. Use for replies, call prep, battlecards and demo talk tracks.
---

# Objection handling

## The method

1. **Acknowledge** the concern in their words. Don't argue with it.
2. **Ask** one question to find what's behind it. "Too expensive" can mean no budget, no clear value, or a cheaper tool they like.
3. **Answer** the real concern with confirmed facts: a feature, a limit, a price or a proof point from `knowledge/`.
4. **Check** that it landed: "Does that cover it?"
5. **Next step:** a small, specific one.

If the honest answer is "we don't do that", say so, and say what we do instead. Losing a bad-fit deal early is a good outcome.

## Common objections

| Objection | Usually means | Prepare |
|---|---|---|
| "Too expensive" | Value isn't clear, or the budget sits elsewhere | The cost of their current workaround; the plan that fits; trial terms from the pricing policy |
| "We already use X" | Switching feels risky | Where we beat X, from the competitor file; what migration takes |
| "Not a priority now" | No trigger yet | The trigger from their evidence; a light follow-up date |
| "Need to check with my team" | They aren't the buyer, or need help selling it inside | A one-pager they can forward; offer a short call with the buyer |
| "Does it do Y?" | A real requirement | The fact sheet's live, beta and planned status. Planned isn't "yes" |
| "Is our data safe?" | Security review ahead | Only documented security facts; anything else goes to the human |

## Objection register

Keep `outputs/sales/<slug>-objections.md` as a running list:

- Log the buyer's own words, with source and date.
- Class each one: timing, budget, authority, trust, fit or competition.
- Rank by count, with a denominator: "4 of 9 replies".
- Give each top objection an owner who can fix it upstream, such as docs, the website or the product.
- Count again later to see whether the fix worked.
- Log the date a person sent our answer. A draft that wasn't sent is not an answer.
- Mark auto-replies and bounces as events. Never delete a logged line, so counts don't shift.

## Did the answer work?

A script counts; you label and write. Never work out a rate yourself. Recovery rate: not enough data, no counting script yet (package P4, T-20261103-08). Don't estimate. Log a second objection as its own register line.

**Smokescreen check.** Before answering, mark each yes, no or unknown:

- `pre_information`: it came in their first reply, before they learned anything real.
- `no_specifics`: it names no figure, tool, date or constraint.

Both yes: skip the full answer. Send one calm question that makes it easy to say "this isn't for us", such as whether the hold-up is timing or the product. If they take it, close politely and mark the lead `lost` with their words.

After 7 days of silence, mark `immediate_drop`: our five-step answer used confirmed facts (sales judges; unknown if in doubt) and they went quiet anyway. It adds no message; the next note is the single one in `stalled-deal`. Never show the flag to a buyer.

## Never

Promise features, discounts, deadlines or terms that aren't in confirmed knowledge. Write them as `[NEEDS APPROVAL]` for the human.
