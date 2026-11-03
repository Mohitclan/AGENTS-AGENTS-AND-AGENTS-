---
status: proposed
date: 2026-11-03
task: T-20261103-07
adoption: A2 (outputs/research/2026-11-03-gtm-survey-a-plugins-agents.md, "A2. A real brand-voice document")
targets:
  - knowledge/brand-voice.md (new file)
  - knowledge/company.md (one added line, section "Brand voice")
---

# Proposal: a brand-voice guide

## What this is, and where it goes

**Today.** Our voice is four lines in `knowledge/company.md`, section "Brand voice" (lines 41-45): a tone line, words we use, words we avoid, and spelling. They say what to avoid. They don't show what "plain-spoken and confident" sounds like.

**Proposal.** Add a separate file, `knowledge/brand-voice.md`, whose text is under "Change 1" below. Add one pointer line to `knowledge/company.md` ("Change 2"). Leave the other four Brand voice lines in `company.md` as they are.

**Why a separate file and not a longer section in `company.md`:**

1. `company.md` holds policy: discounts, sending limits, approvers, never-contact. A person who confirms it is approving those. A style guide with judgment calls in it should be confirmed on its own, so a doubt about one tone line can't hold up the policy file.
2. The guide is about 100 lines and only matters when copy is being written. Nothing loads files conditionally: agents read the files their instructions name. `marketing.md` and `outreach.md` send writers to the voice in `company.md`; `sales.md`, `docs-handler.md` and `demo-handler.md` name no voice source at all (Follow-up 1). A separate file keeps `company.md` short for every agent that reads it.
3. A confirmed file can't hold unsettled lines cleanly. The guide has a few lines marked "hypothesis, needs a person". Those are easier to settle and re-confirm in a file of their own.

**The cost, and how it is handled.** Two places now mention voice, so they could drift. The pointer line in Change 2 and the guide's "Order of authority" give the same order: `company.md` "Brand voice", `voice-rules.json`, `lint-copy.mjs` and the `cold-email` skill win over the guide. The guide copies none of the word lists; it points to `evaluation/voice-rules.json`, so there is one list.

**Why the pointer in `company.md` is needed.** `.claude/agents/marketing.md` line 39 and `.claude/agents/outreach.md` line 26 send agents to "the brand voice in `knowledge/company.md`". Without the pointer, no agent would find the new file. I have not edited those agent files. A person may prefer to point them at the new file directly (Follow-ups, below).

## Change 1: new file `knowledge/brand-voice.md`

Copy the text between the fences. The `status:` line stays `proposed` until a person runs `node scripts/kb.mjs confirm knowledge/brand-voice.md`.

````markdown
---
status: proposed
owner: founders
last_verified: 2026-11-03
sources:
  - knowledge/company.md, section "Brand voice" (told by the founders on 2026-10-30)
  - evaluation/voice-rules.json and scripts/lint-copy.mjs (the checks we already run)
  - outputs/sales/2026-10-30-motionrepo-battlecard.md (approved, A-20261030-01, 2026-11-02)
  - outputs/outreach/L-ab940a31.md and L-4ad62a74.md (PASS 87, review T-20261101-09-r2)
  - .claude/skills/cold-email/SKILL.md, .claude/skills/positioning/SKILL.md
  - structure only: anthropics/knowledge-work-plugins, marketing/skills/brand-review (Apache-2.0)
---

# Brand voice

How we write. This file holds no product facts, prices or claims; those come from the fact sheets. It covers anything a prospect, customer or reader sees, and the battlecards and notes that sales says out loud. Research notes follow `fact-sourcing` instead.

**Order of authority.** The "Brand voice" section of `knowledge/company.md`, `evaluation/voice-rules.json`, `scripts/lint-copy.mjs` and, for email and LinkedIn, the `cold-email` skill come first; this file shows them in use. If this file differs from any of them, they win. A line marked **[hypothesis, needs a person]** is a default drawn from our own copy, not a decision: follow it unless a person says otherwise.

## The voice in one line

Plain-spoken and confident, with short sentences and concrete outcomes (`company.md`, "Tone"). In the approved battlecard and the two reviewed drafts (PASS 87; drafts, not approved or sent) the confidence comes from saying what is true and what isn't, not from adjectives. **[hypothesis, needs a person]** Treat "says its limits out loud" as part of the voice, not only as a rule.

## Voice spectrum

Where we sit on each line, with the evidence for it.

| Dimension | One end | Other end | We sit | Evidence |
|---|---|---|---|---|
| Formality | casual | formal | Conversational, professional. Contractions are fine. **[hypothesis, needs a person]** for the exact point | Contractions in the PASS emails: "I'm", "don't", "I'll" (L-ab940a31 lines 79, 115, 117; battlecard line 9) |
| Energy | restrained | excited | Restrained. **[hypothesis, needs a person]** Avoid exclamation marks | `company.md` "no hype" supports "restrained" only. No source makes "no exclamation marks" a rule; observed: zero "!" in the battlecard and both PASS drafts |
| Confidence | hedged | certain | Certain about what a source shows; plainly "not known" about the rest | Battlecard line 21 ("Not known: ..."); `lint-copy.mjs` line 44 fails a guess stated as a finding; hard rule 2 |
| Detail | abstract | concrete | Concrete: a fact from the lead's own evidence, numbers in the fact sheet's own form | `company.md` "concrete outcomes"; L-ab940a31 line 79 (a date); `cold-email` line 11 |
| Pressure | pushy | low-pressure | Low. One small ask, an easy exit | `cold-email` lines 14 and 16; L-ab940a31 lines 83 and 117 |

## We are / we are not

| We are | We are not | Evidence |
|---|---|---|
| Plain: the thing named by its name | Abstract or jargon-heavy | The `flag` list in `voice-rules.json` (lines 16-26) asks for "name the thing" over vague nouns |
| Confident because it is sourced | Confident because it is loud | `company.md` "Words we avoid", last item: any claim with no source; hard rule 2 |
| Specific: a date, a source, a limit | Vague about when, who or how much | `cold-email` line 11 (one fact from the lead's own evidence); L-4ad62a74 line 78 |
| Open about limits **[hypothesis, needs a person]** (judgment 1: stated limits are approved for sales answers; as a trait for all copy it is unsettled) | Silent about limits until asked | Battlecard lines 19 and 25 (what we lack, what we can't show); L-ab940a31 Email 3 lists what we don't have |
| Fair to alternatives | Running a competitor down | Battlecard lines 14-15: no "cheaper" without a conversion, "RepoClip may suit you better" in the cases where it does |
| Clear about what is not known, and who can answer | Guessing, or performing candour | `lint-copy.mjs` lines 28 and 44; battlecard line 21; "honestly" and "frankly" are on the `weak` list |
| Low-pressure: one ask, an exit | Urgent, scarce or discounted by invention | `cold-email` lines 14, 16, 22 and 45-47; L-ab940a31 line 117 ("This is my last email.") |
| Brief: the reader's time first | Padded or warm-up filler | `cold-email` line 18 (under 120 words, read aloud); the `bannedOpeners` list |
| Careful about the future: "coming", no date | Promising roadmap, or giving a date | Battlecard line 30 ("coming"; no date); `positioning` agreement check 3 |
| Indian English | American spelling | `company.md` "Spelling" |

## Sentences that fit

Templates use square brackets. Fill them from the lead's evidence or the fact sheet, never from memory. A fitting sentence is not a sourced one: each claim in it still needs its own fact-sheet line (`self-review` item 5).

| Sentence | What it shows | Source |
|---|---|---|
| "[Their product]'s [event] went out on [date]. That launch is why I'm writing." | One fact from the lead's own evidence as the opening, and the reason for writing in plain words | Modelled on L-ab940a31 line 79 |
| "I work on MotionRepo." | A plain introduction, nothing attached | L-ab940a31 line 81; `self-review` item 7 |
| "So one question: is [their thing] [the fit question]? A yes or a no is plenty." | One small ask, easy to answer | L-ab940a31 line 83 |
| "In case [their situation], here is what you control." | Offers detail only if it applies | L-4ad62a74 line 95 |
| "Our [page] also lists what we don't have: [the items, as the fact sheet states them]." | Says the limits first | Modelled on L-ab940a31 line 115 |
| "If you want [thing we lack], [Competitor] may suit you better." | Fair to an alternative where it is true | Modelled on battlecard line 15 |
| "Not known: [what]. Check with [who]." | An honest gap, with an owner | Battlecard line 21 |
| "This is my last email. If you have a question, reply and I'll answer it." | A polite close with the door open | L-ab940a31 line 117 |
| "To opt out, reply 'stop' and I won't write again." | The agreed opt-out line, kept separate from the ask | `cold-email` line 16 |

## Sentences that don't fit

These are generic shapes, with no claim about our product. The lists of banned, flagged and weak words are in `voice-rules.json`.

| Sentence or shape | Why it doesn't fit | Fit instead |
|---|---|---|
| "We're thrilled to introduce [Product]!" | Energy and exclamation marks **[hypothesis, needs a person]**; says nothing about what it does | State what it does and who for, in a plain sentence |
| "[Product] is the fastest way to [outcome]." | A superlative with no source. The lint doesn't catch it yet (survey A1), so a person must | A number or fact from the fact sheet, in its own form |
| "Unlike [Competitor], we actually care about [thing]." | Runs a competitor down with no source; "actually" is on the `weak` list | Say what we do; if asked, point to the competitor's own site (battlecard line 15) |
| "Reply today, only a few spots left." | Invented urgency and scarcity | One small ask with no clock (`cold-email` lines 45-47) |
| "It isn't about features — it's about results." | The "isn't X, it's Y" formula (`lint-copy.mjs` line 31) | Name the result, drop the contrast |
| "To be honest, ..." or "Here's the thing, ..." | Performed candour. The lint catches "Here's the thing" (`lint-copy.mjs` line 27) and "I'll be honest" (line 28), but not "To be honest", so a person must | Say the thing |
| A greeting about the reader's week, or "I wanted to reach out" | On the `bannedOpeners` list | One fact from the lead's own evidence |
| "We help companies like yours [verb] their [thing]." | A `bannedOpeners` shape, and the claim has no proof | Their own situation, from their own evidence |
| "Organization", "color" | American spelling | "organisation", "colour" (`company.md` "Spelling") |
| "A full GST invoice" when the fact sheet gives only a rate and an invoice | Joins two true facts into a new claim | The two facts, kept apart (lesson in `memory/MAIN.md`, 2026-10-30) |

## Word and style preferences

The word lists live in `evaluation/voice-rules.json` and `company.md`. Don't copy them here. These are the preferences that the lists don't hold.

| Preference | Source |
|---|---|
| Words for what the product does and the result: "saves", "set up in", "works with". Each still needs a source and, for a number, a unit | `company.md` "Words we use" |
| Prices in the form the fact sheet uses, with the ₹ sign. Never "Rs" | `company.md` ("₹ for prices"); `self-review` item 5 records "Rs" failing review |
| "lakh" and "crore" for large Indian amounts | `company.md` "Spelling" |
| Dates as day and month in prose: "21 October". ISO (2026-10-30) for "checked on" notes | L-ab940a31 line 79 ("21 October"); battlecard line 9 ("checked 2026-10-30"). **[hypothesis, needs a person]** |
| "I" for the person writing, "we" and "our" for the company, in outreach as in sales | L-ab940a31 uses "I" (lines 79, 81, 117) and "our"/"we" for the company (lines 115, 119); the battlecard uses "we" (lines 9, 15). `cold-email` line 15 signs with a real person. **[hypothesis, needs a person]** |
| Product and competitor names exactly as the fact sheet spells them **[hypothesis, needs a person]** | The PASS drafts and battlecard follow it. Observed, not stated as a rule anywhere |
| A subject that names the thing, in six words or fewer | `cold-email` line 10; subjects in L-ab940a31 and L-4ad62a74 |

## Tone by situation

| Situation | Adjust | Source |
|---|---|---|
| Cold email | One fact from the lead's own evidence first, one small ask, the opt-out line, under 120 words | `cold-email` lines 10-18 |
| LinkedIn connection note | Introduces you and asks nothing | `self-review` item 7; `cold-email` line 26 |
| Follow-up | Adds one new thing; never a nudge. The last one closes politely | `cold-email` line 22; L-ab940a31 line 117 |
| Objection answer | Say what is true, then where we are weak, then one next step. Concede what is true | Battlecard lines 9, 15, 26 and 31 ("Weak" lines); entry 3 states its gaps in lines 19 and 21 instead |
| A question we can't answer | Write it as not known, with a name | Battlecard line 21 |
| Opt-out or "stop" | No draft. Suppress at once | Hard rule 7 |
| Landing page, docs, one-pager | No approved example yet. Use the same voice; a person reviews tone first. **[hypothesis, needs a person]** | None: gap |

## Before you hand copy in

1. Read it aloud. If a sentence sounds like an ad, cut it (`cold-email` line 18).
2. Take out every adjective that makes a claim with no source behind it.
3. One call to action, and the opt-out line apart from it.
4. In sales answers, every limit a reader would want to know is stated, or marked not known (battlecard lines 19, 21 and 25). For other copy this is **[hypothesis, needs a person]** until question 1 is answered.
5. Indian English spelling, and prices in the fact sheet's form.
6. Run `node scripts/lint-copy.mjs`. A clean run checks form only; it says nothing about whether the claims are true (lesson in `memory/MAIN.md`, 2026-10-30).
````

## Change 2: one line in `knowledge/company.md`

**File and section:** `knowledge/company.md`, section "## Brand voice" (currently lines 41-45).

**Current text (last line of the section):**

```
- **Spelling:** Indian English, e.g. "organisation", "colour", "lakh" and "crore" for Indian amounts, ₹ for prices.
```

**Proposed text (the same line, then one new line):**

```
- **Spelling:** Indian English, e.g. "organisation", "colour", "lakh" and "crore" for Indian amounts, ₹ for prices.
- **Guide:** how this sounds in use (voice spectrum, we are / we are not, sentences that fit and don't) is in `knowledge/brand-voice.md`. If the two differ, this section, `evaluation/voice-rules.json`, `scripts/lint-copy.mjs` and, for email and LinkedIn, the `cold-email` skill win.
```

Then re-confirm the file with `node scripts/kb.mjs confirm knowledge/company.md` (it sets `last_verified` itself).

**Order of application.** The company-details proposal of 2026-11-02 (`knowledge/proposals/2026-11-02-company-details-filled.md`) replaces `company.md` "lines 51-54" (the Approvers rows) by line number. Adding this pointer line after line 45 moves those rows to lines 52-55, so applying 2026-11-02 afterwards would delete the table's separator row and leave a duplicate discounts row with its placeholder. **Apply the 2026-11-02 proposal first, then this pointer line**, or match the lines by text instead of line number.

## Follow-ups (not part of this proposal; a person decides)

1. `.claude/agents/marketing.md` line 39 and `.claude/agents/outreach.md` line 26 could name `knowledge/brand-voice.md` directly. The pointer in Change 2 is enough for those two. `.claude/agents/sales.md`, `docs-handler.md` and `demo-handler.md` name neither `company.md` nor any voice source (grep, 2026-11-03), so they will not find the pointer. The guide covers battlecards, docs and one-pagers, so a person should decide how those three find it: add a line to each agent file naming `knowledge/brand-voice.md`, or leave them out of scope.
2. The `positioning` skill edit (survey A2, "waits until then") waits until this file is confirmed.
3. The lint gap for superlatives, comparisons and unsourced quotes is survey item A1, a separate developer task. Until it ships, the "fastest" row above is caught by a person, not the lint.

## Evidence index

Each line of the guide cites its own source. These are the sources, and how each was used.

| Source | Read on | Used for |
|---|---|---|
| `knowledge/company.md` lines 41-45 | 2026-11-03 | Tone, words we use, words we avoid, Indian English. The base the guide builds on |
| `evaluation/voice-rules.json` lines 3-32 | 2026-11-03 | What is already banned, flagged or weak; `bannedOpeners` |
| `scripts/lint-copy.mjs` lines 26-34, 44 | 2026-11-03 | Seven voice patterns; the rule against a guess stated as a finding |
| `outputs/sales/2026-10-30-motionrepo-battlecard.md` | 2026-11-03 | Approved by shivam-G05 on 2026-11-02 (A-20261030-01, `ops/approvals.md` line 7). Source of the limits-first, fair-to-alternatives and not-known patterns |
| `outputs/outreach/L-ab940a31.md`, `L-4ad62a74.md` | 2026-11-03 | Both PASS 87 (`outputs/reviews/T-20261101-09-r2.md` lines 7-8). Source of the opening fact, the one ask and the close. Drafts only; nothing has been sent |
| `.claude/skills/cold-email/SKILL.md`, `positioning/SKILL.md`, `self-review/SKILL.md` | 2026-11-03 | Email shape, never-do list, the stage guardrail, claim and format checks |
| `memory/MAIN.md` | 2026-11-03 | Lessons used: a joined claim needs its own source (line 26); a clean lint checks form only (line 28) |

Checks I made on these: a count of "!" in the battlecard and both PASS drafts finds 0 in each; the contraction lines cited exist at the line numbers given; the anti-examples contain no product claim.

## Hypotheses and judgment calls

| # | Judgment | Confidence | Reason | Cheapest test |
|---|---|---|---|---|
| 1 | "Says its limits out loud" is a voice trait, not only a rule | Medium | The battlecard and both PASS drafts all do it, and only the battlecard was approved (A-20261030-01); the drafts are unsent drafts. Nothing says the founders want it as a brand trait. The guide marks it in three places: the voice line, the "we are" row and checklist item 4 | Ask a founder (question 1) |
| 2 | The exact formality point, "conversational, professional" | Low | Only three pieces to go on: one internal battlecard and two cold-email sequences. No landing page or doc to compare | A person reads the spectrum and moves the point |
| 3 | Day-and-month dates in prose ("21 October") | Medium | Used in the PASS drafts; the lint doesn't check it; `company.md` is silent | A person says yes or no |
| 4 | "I" for the person writing, "we" and "our" for the company, in outreach as in sales | Medium | Matches the approved battlecard and the two reviewed drafts (L-ab940a31 uses "I" and "our"/"we"); no rule written | A person says yes or no |
| 5 | Landing pages, docs and one-pagers follow the same voice | Low | No approved web or doc copy exists to model on | The first approved landing page becomes the example |
| 6 | Avoid exclamation marks | Medium | `company.md` says "no hype", not "no exclamation marks". The battlecard and both drafts have none, which is observation only | A person says yes or no |
| 7 | Product and competitor names exactly as the fact sheet spells them | Medium | Observed in the battlecard and both drafts; no source states it as a rule | A person says yes or no |

## Open questions for the human

1. Do the founders want "open about limits" kept as a named trait of the voice (judgment 1)? It would then apply to outreach, landing pages and docs, not only to sales answers.
2. Is humour allowed? No approved piece has any, and no source says either way. The guide is silent on it.
3. Is a short form of address wanted, or something more formal for senior buyers? The two reviewed drafts differ: L-ab940a31 greets the maker by first name ("Hi Shubham,"), and L-4ad62a74, written to a general inbox, greets "Hi Graphite team,". Neither is approved copy.
4. Who confirms this file? `company.md` names the approvers as "founders" once the 2026-11-02 proposal is applied; until then, every approval goes to the founders in chat.

## Sources note, for the CREDITS row

Structure only was taken from Anthropic's `knowledge-work-plugins` marketing plugin, skill `brand-review`, section "Brand Voice Reference": a voice spectrum, "we are / we are not", sentences that fit and don't, and word preferences. No text was copied. Every example and every line of evidence comes from our own files above.

- Repo: https://github.com/anthropics/knowledge-work-plugins. Licence: Apache-2.0, per the researcher's reading of `LICENSE` (survey line 42) and the evaluator's check in review T-20261103-01-r2 ("Safe to adopt", row A2).
- File used: `marketing/skills/brand-review/SKILL.md`, opened 2026-11-03 with the fetch tool. That tool returns a summary written by a small model, not the raw file, so I took only the section headings and kinds of content, and quoted nothing. The page itself shows no licence line; the licence comes from the repo.
- The brief named "brand-voice or brand-review". A `brand-voice` skill path returned 404 on 2026-11-03; `brand-review` loads.
- Suggested row for `docs/CREDITS.md` (a person adds it; I have not edited that file):

| Source | Licence | What we took |
|---|---|---|
| [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (`marketing/skills/brand-review`) | Apache-2.0 | The structure of a brand-voice document: a voice spectrum, "we are / we are not", sentences that fit and don't, and word preferences. No text copied; the examples come from our own approved battlecard and two reviewed drafts |

Embedded instructions: the brand-review page tells an agent to ask the user for a style guide when none is set up. That is the skill's own workflow, not an instruction to us, and nothing was done with it.

## Self-review

- 1. Re-read the brief: pass. Where it goes (separate file, with reasons and the cost); spectrum and "we are / we are not", each line tied to a rule, decision or approved piece; fitting and non-fitting sentences from or modelled on the approved battlecard and the two reviewed drafts; no new facts; judgment calls marked; Sources note; this section. Edited nothing else: only this proposal file was written.
- 2. Counts match the body: pass. The spectrum has 5 rows; "we are / we are not" has 10; fitting sentences 9; non-fitting 10; the hypotheses table has 7 rows (judgments 1 to 7), and the proposed text carries 10 inline markers on lines 55, 63, 64, 76, 106, 126, 127, 128, 141 and 148 of this file, plus the definition on line 51 (counted with grep). Judgment 1 has three of the nine markers (lines 55, 76 and 148). Open questions 4. Recounted after the revision.
- 3. One answer per question: pass. Checked the guide against `company.md` lines 41-45 (tone, words, spelling) and `cold-email` (120 words, six-word subject, opt-out text): no difference. The guide's "Order of authority" (line 51) and the pointer in Change 2 now give the same order: `company.md` "Brand voice", `voice-rules.json`, `lint-copy.mjs` and the `cold-email` skill win.
- 4. Automatic checks: pass (re-run after revision 1, and again after the wording fixes below; last line of the latest run: "knowledge/proposals/2026-11-03-brand-voice.md (general): 0 failed, 2 warning(s)."; the same two expected warnings). `node scripts/lint-copy.mjs knowledge/proposals/2026-11-03-brand-voice.md --type general` last line: "knowledge/proposals/2026-11-03-brand-voice.md (general): 0 failed, 2 warning(s)." Both warnings are on this line, which names two lint patterns ("Here's the thing", "Hot take"); expected. The lint blanks fenced text, so it never read the proposed guide. I extracted the text between the 4-backtick fences into a scratch file (`scratchpad/guide.md`, 117 lines) and ran the same command on it, last line: "guide.md (general): 0 failed, 3 warning(s)." The three warnings are the guide naming lint patterns it tells writers to avoid (the "isn't X, it's Y" formula, "Here's the thing", and one more honesty opener), all in its "don't" table; expected. `node scripts/check-links.mjs` on the proposal: "1 link(s): 1 ok, 0 restricted, 0 broken, 0 unreachable" (before this revision; no link was added or changed).
- 5. Claims used: n/a for product claims, since the guide states none. "I work on MotionRepo." is quoted from L-ab940a31 line 81 and `self-review` item 7 as a sentence shape. No price, plan, feature or number about the product appears. Placeholders `{{...}}` are not used.
- 11 to 16 (sources): pass. I re-opened the battlecard, L-ab940a31 and L-4ad62a74 to check each cited line number, `ops/approvals.md` line 7 (approved by shivam-G05, 2026-11-02) and `outputs/reviews/T-20261101-09-r2.md` lines 7-8 (PASS 87 each). The brand-review page was read through the fetch tool's summary only, and says so above.
- Not verified: that the founders want the traits in the guide (judgments 1 to 7); whether landing-page copy should sound the same; the Apache-2.0 licence text was not re-read by me, only the survey and review that record it.

## Revision 1

Round 1 review: `outputs/reviews/T-20261103-07-r1.md` (REVISE 68/100, 11 fixes). Only those fixes were made.

1. Evidence lines corrected: entry 3 of the battlecard has no "Weak" line; L-ab940a31 uses "I" and "our"/"we"; L-4ad62a74 greets "Hi Graphite team,"; only the battlecard is approved, the two PASS drafts are drafts (hypotheses 1 and 4, question 3, voice line).
2. Unmarked judgment calls: "no exclamation marks" and "names exactly as the fact sheet spells them" are now hypotheses 6 and 7; judgment 1 is marked in the "we are" row and checklist item 4; "program" removed from the spelling row; checklist item 2 now says "adjective that makes a claim with no source"; "Dated fact first" now uses the cold-email skill's own words.
3. One order of authority, in the guide and the pointer: `company.md` "Brand voice", `voice-rules.json`, `lint-copy.mjs` and the `cold-email` skill.
4. Change 2 now says to apply the 2026-11-02 company-details proposal first, or match by text; the `last_verified` instruction is dropped.
5. Smaller items: "won't" removed from the contractions line; "To be honest" is now said to be caught by a person; "Careful about the future" replaces the reversed label; the "described, not written out" clause is dropped; the date rule now reads day and month; the self-review lint result is updated.
6. Reach: line 22 reworded, and Follow-up 1 now lists `sales.md`, `docs-handler.md` and `demo-handler.md` for a person to decide.

After the r2 PASS (84/100, `outputs/reviews/T-20261103-07-r2.md`), three wording fixes were made and nothing else: the CREDITS row now says "our own approved battlecard and two reviewed drafts" (line 226); the cold-email fix now reads "One fact from the lead's own evidence" (line 112, and the same narrowing in the "What it shows" cell on line 90 and "the dated opener" on line 190); and the exclamation-marks reason on line 106 now carries the hypothesis marker (inline marker count in self-review item 2 updated from 9 to 10).
