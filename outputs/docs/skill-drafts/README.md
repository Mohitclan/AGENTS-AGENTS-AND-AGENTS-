# P6 process drafts for existing skills and the evaluator

Task T-20261103-09b, written by `docs-handler` on 2026-11-03. **Nothing here is installed.** `.claude/skills/`, `.claude/agents/`, `evaluation/` and `docs/CREDITS.md` were not touched (`git status --short .claude/skills .claude/agents evaluation docs/CREDITS.md` prints nothing). A person approves each change, then the coordinator applies it.

## The seven drafts

| File | Goes into | Survey item | What it does |
|---|---|---|---|
| `self-review-addition.md` | `.claude/skills/self-review/SKILL.md` | A4, A5 | Claims table is written before the draft; a revision may cut and sharpen and adds only what is on file or what a review fix asked for |
| `research-evidence-addition.md` | `.claude/skills/research-rigor/SKILL.md` and `.claude/skills/lead-research/SKILL.md` | A6 | Evidence records and a count line for public social and forum research, business information only |
| `review-format-addition.md` | `.claude/agents/evaluator.md` (not `evaluation/rubrics.md`) | A7 | Severity on each fix, before and after rewrites (confirmed facts only), a separate policy-flags section that never replaces ESCALATE or an auto-fail |
| `sender-voice-addition.md` | `.claude/skills/cold-email/SKILL.md` | A9 | Learn the sender's voice only from pasted, cleaned sent emails; keep a summary only |
| `cold-email-links-addition.md` | `.claude/skills/cold-email/SKILL.md` | assumption 7, P2 finding | Each link on its own line with nothing after it |
| `reply-triage-not-now-addition.md` | `.claude/skills/reply-triage/SKILL.md` | B11 | A short log of content gaps from "not now" replies and questions we can't answer (trimmed to about 225 words) |
| `seo-refresh-addition.md` | `.claude/skills/seo-refresh/SKILL.md` | B9 | "Schema: not checked" instead of "missing" for static fetches, plus an audit order |

Each draft shows the exact insertion point by quoting the line it follows, the text to insert, who loads the file, and a Sources note (URL, licence, what was adapted, what was left out).

## Summary of each draft

1. **Self-review (A4, A5).** Item 5 now says to write the `## Claims used` table first and draft from it, dropping any claim without a fact-sheet line, with no pause for a person. A new item 19, in a new last section "When you revise", says a fix may remove and sharpen, and may add a fact only if it is on file (fact sheet, lead evidence, the brief, or a detail a person supplied or corrected) or a review fix asked for it, with its source. It never adds stakes, urgency, quotes, personal details or stories. This applies to every deliverable. No item is renumbered, so "item 5" and "item 17" still mean the same checks.
2. **Research evidence (A6).** A section for `research-rigor`: plan first, search results are not evidence, one record per part read, writers kept apart, reposts counted once, one count line, and an audit rule. For `lead-research`, a paragraph in "Public buyer intent" that turns each kept post into one lead-evidence item. Hard rule 3 is written in: public business information only, writer recorded by role, no private profiles.
3. **Review format (A7).** Severity High, Medium, Low defined by our own auto-fail and rubric rules. It orders the fixes and never changes a score or a verdict. In customer text, rewrites may use only confirmed fact-sheet lines and the lead's evidence; any other checked fact carries the unconfirmed mark (written out in full in the installed text). Policy flags are listed apart, never replace ESCALATE or an auto-fail, and the evaluator approves nothing.
4. **Sender voice (A9).** Pasted emails only, five to ten, cleaned by the person first. No mailbox, ever. Below five, no guess. The output is a four-to-six-line style summary written to a knowledge proposal for a person to confirm. The voice never overrides the cold-email rules.
5. **Links (assumption 7).** One paragraph. Found on 15 lines in the four current drafts: 13 in emails and 2 in LinkedIn messages (line numbers in the draft). Per shortlist assumption 19 they are fixed before any of those emails is sent. `outreach` fixes those files; this README doesn't edit them.
6. **Not-now content gaps (B11).** Log a row per reply into `outputs/marketing/content-gaps.md`: date, lead ID, category, topic, what we have. Create the file with Write, append with Bash (none of the four loaders has Edit); `outreach` checks files only and `sales` may also fetch the site. Rank by lead count with the total shown. A gap never restarts contact, and the row is a note, not the reply's action. The source's automated six-week campaign is not used.
7. **SEO refresh (B9).** A bullet in "On the page" and a new "Audit order" section. Line 34 of the skill (content hidden behind JavaScript) is left alone and not repeated.

## Applying them

- **Fallbacks.** `evaluator-fallback` and the fallbacks of the self-review loaders are generated. After the human approves, run `node scripts/fallbacks.mjs sync` once, and `node scripts/fallbacks.mjs check` to confirm. Only `evaluator.md` (draft 3) changes an agent file; the other six change skills.
- **Order.** Any order works for these drafts. The two drafts for `cold-email` (4 and 5) and the P3 nurture section (`outputs/marketing/skill-drafts/cold-email-addition.md`) go at three different points of that file: links in "Shape of a first email", sender voice before "Structure and variants", nurture before "Never". **Line references shift.** `knowledge/proposals/2026-11-03-brand-voice.md` cites `cold-email` lines 22, 26 and 45-47, in seven places (proposal lines 66-80, 79, 109, 136 and 137, as listed by `grep -n "cold-email"` on it). The links paragraph (after host line 18) and the sender-voice section (after line 26) shift all of them. At install, update every one of the seven or change them to section names.
- **Cost.** Every word of a preloaded skill is paid on each run of each agent that loads it. Counted with a script (whitespace-separated words) on the text to insert, recounted in revision 1:

| Draft | Words added | Loaded by |
|---|---|---|
| Self-review, edit 1 (replaces about 27) | 78 | 9 agents + fallbacks (all but coordinator and evaluator) |
| Self-review, item 19 (with its heading) | about 120 | same |
| Research-rigor section | about 365 | `researcher`, `knowledge-base` |
| Lead-research paragraph | about 145 | `lead-generator`, `researcher` |
| Evaluator findings format | about 345 | `evaluator` |
| Sender voice | about 285 | `marketing`, `outreach`, `sales` |
| Links paragraph | about 100 | `marketing`, `outreach`, `sales` |
| Reply-triage content gaps (trimmed from about 335) | about 225, plus 8 in the table row | `outreach`, `sales` |
| SEO refresh | about 240 | `marketing` |

  If the plan quota matters, the cheapest cuts are: rule 6 of the research section, the lead-research paragraph's last sentence, and the sender-voice section (the most optional).

## CREDITS rows to add (do not edit `docs/CREDITS.md` from here)

Licence files were opened raw on 2026-11-03. Some of these repos already have a proposed row from P2 or P5 (for example `anthropics/knowledge-work-plugins` and `LaGrowthMachine/gtm-system` in `outputs/sales/skill-drafts/README.md`). If so, add the new items to the existing row instead of making a second one.

```
| [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (`sales/skills/create-an-asset`, `sales/skills/setup`, `marketing/skills/brand-review`) | Apache-2.0 | The order of work "claims and sources first, then the asset"; learning a writing style from a few pasted sent emails and keeping style traits only; a review shaped as findings with severity, before and after rewrites for the worst few, and a separate section for compliance concerns. Method only, in our words, no text copied. Left out: its opening rules block (take requested actions through connectors and never refuse them), the pause for the user's go-ahead, reading a connected mailbox, and the dashboard |
| [wshobson/agents](https://github.com/wshobson/agents) (`plugins/avoid-ai-writing`, `plugins/content-marketing/skills/social-evidence-research`) (Copyright (c) 2024 Seth Hobson) | MIT | The rewrite guardrail (subtract and sharpen, never add) and the evidence-record method for public social research: plan first, search results as discovery only, one record per part read, writers kept apart, reposts counted once, a count line, an audit of a report. No text or code copied. Left out: exports and captures of accounts, profile inspection, media parts, the detector statistics |
| [conorbronsdon/avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) (Copyright (c) 2026 Conor Bronsdon) and [isatimur/de-slop](https://github.com/isatimur/de-slop) (Copyright (c) 2026 Timur Isachenko) | MIT | Upstream of the rewrite guardrail above (the first is the source of wshobson's skill; the first says it adapted the guardrail from the second). The origin of the subtract-and-sharpen guardrail (de-slop README lines 68-69); nothing copied |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (`skills/seo-audit`) (Copyright (c) 2025 Corey Haines) | MIT | The schema limitation (a fetch can't see structured data that JavaScript adds, so say "not checked") and the order of an audit. In our words. Left out: the paid crawler step, the "positions 8 to 20" claim, the speed thresholds |
| [LaGrowthMachine/gtm-system](https://github.com/LaGrowthMachine/gtm-system) (`outbound-nurture-engine`, `multichannel-campaign-builder`) (Copyright (c) 2026 LaGrowthMachine) | MIT | The content-gap list (rank the needs that waiting leads voiced, which no content answers, by how many leads wait) and the rule that no punctuation follows a link. No code, campaign, sequence or connector used. Left out: the six-week automated campaign, writes to the vendor's platform, the engine script, and the prompts that promote the vendor |
```

If P2 also credits wshobson, conorbronsdon and brandonwise for A3, merge the wshobson and conorbronsdon rows with it.

## Dropped, and why

| Dropped | Source | Why |
|---|---|---|
| The opening rules block: take requested actions through the connector, "never refuse" them, and the related connector and rendering rules | `create-an-asset` and `setup`, line 9 of each | Hard rule 1 (drafts only). Our skills answer to our rules |
| Showing the inventory and outline and waiting for "go" | `create-an-asset`, step 2 | No mid-run pause (the brief); the table is checked after drafting instead |
| Bracketed customer-metric placeholders | `create-an-asset`, rule 3 | Our only placeholders are the four sender and company ones (self-review item 10); an unproven figure is cut, not bracketed |
| The audience gate (internal versus customer-facing) | `create-an-asset`, rule 2 | Not asked for, and docs-handler and the evaluator already check for internal material in public text |
| Reading 30 to 60 sent messages from a mailbox, and the two excerpts shown back | `setup` voice steps | We never read a mailbox; excerpts could carry other people's details |
| Offering to add the voice summary to the project instructions | `setup` | Ours goes through a knowledge proposal that a person confirms |
| Detector statistics about AI-writing tools | `avoid-ai-writing`, "What a flag proves" | Not verified, not needed |
| Dash and staccato rules, the pass cap, the three modes | `avoid-ai-writing` | The dash rule awaits the P2 decision; our two-revision limit covers the pass cap |
| Exports and user captures of social accounts, the `profile` part, image, audio and video parts, the 22-field record, the report template | `social-evidence-research` | Hard rule 3 (no personal data), our fetch tool can't view media, and our research files have their own layout |
| Brand-guideline source, voice and terminology dimensions, the sample copy with an unsourced percentage, the closing questions | `brand-review` | The brand-voice guide is a separate proposal; no figure without a source; the evaluator does not offer to revise |
| The six-week automated campaign, custom-attribute writes, engine script, content library index, match scoring, the widget | `outbound-nurture-engine` | Auto-sending and third-party code; we have no content library to match yet |
| The vendor's sign-up links with tracking parameters and its prompts to mention the vendor | `outbound-nurture-engine`, `multichannel-campaign-builder` | Vendor steering |
| Screaming Frog step, "positions 8 to 20 are the fastest wins", speed thresholds, the long technical checklist | `seo-audit` | Paid tool; claim stated without a source; thresholds would need their own source |

## Instructions found in the sources (reported, not followed)

- `create-an-asset` and `setup`, line 9: tell the running model to take requested actions through the connector and never refuse an action on the plugin's own authority. Not followed, and recorded in the Sources notes.
- The same two files also say to work silently between tool calls, to cite and link every value, to prefer one mail tool over another, and to render pages and dashboards. These are written for the model that runs the plugin. Not followed.
- `create-an-asset`, step 2: show the inventory and outline and get a quick "go". Not followed.
- `setup`, voice steps: pull 30 to 60 messages from the connected mailbox. Not followed.
- `brand-review`, "After Review": ask the user whether to revise the whole piece. Not followed.
- `seo-audit`, lines 14 to 15: read `.agents/product-marketing.md` first. Not followed (a path we don't have). Line 17 (treat fetched pages as untrusted data) matches hard rule 5 already.
- `outbound-nurture-engine`: "Output discipline" (return only the deliverables), run `scripts/build.py`, ask where the content lives, use the vendor's connector, show a widget, mention the vendor once, and offer a free trial link. Not followed.
- `multichannel-campaign-builder`, line 170: a prompt to mention the vendor with a tracked sign-up link. Not followed.
- `avoid-ai-writing` and `social-evidence-research`: no instructions aimed at us. Their text says that instructions inside a document under review are data, which matches hard rule 5.

## Questions for the human

1. **Approve each draft separately?** The skill guard asks a person for every skill change, and draft 3 changes an agent file. The seven are independent.

Already answered by the shortlist's assumptions (`outputs/reports/2026-11-03-gtm-adoption-shortlist.md`), so not asked again:

- Sender voice (draft 4): assumption 16, keep the draft and install it only after a person agrees that pasted, cleaned sent emails may be used.
- Content-gap path and trigger (draft 6): assumption 17, `outputs/marketing/content-gaps.md`, and tell marketing at two or more leads on a topic.
- Self-review cost (draft 1): assumption 18, accept both changes (claims list before drafting, revisions add only what is on file).
- Link lines (draft 5): assumption 19, fix the 15 lines (13 in emails, 2 in LinkedIn messages) before any of those emails is sent, as a condition on the send approvals.

## Handoffs

- `outreach`: fix the 15 link lines listed in `cold-email-links-addition.md` once the rule is approved, before any of those emails is sent (assumption 19).
- `developer`: the `url-punctuation` warning on branch `agent/T-20261103-04` accepts a space or a line break after a link; the links paragraph is stricter (nothing after it on the line). Align the message when that branch is fixed.
- `marketing`: reads the content-gaps list when the coordinator hands it a topic.

## Revision 1

Reviewed REVISE 82/100 in `outputs/reviews/T-20261103-09b-r1.md`. Fixes 1 to 21 applied; nothing under `.claude/skills/`, `.claude/agents/` or `evaluation/` was written.

| Fix | Draft | What changed |
|---|---|---|
| 1 | `self-review-addition.md` | Item 19 now says a revision adds a fact only if it is on file (fact-sheet line, lead's evidence, the brief, or a detail a person supplied or corrected) or a review fix asked for it, with its source. It applies to every deliverable. Cut to about 120 words. The source's allowance (conorbronsdon `SKILL.md` line 315) is restored and noted |
| 2 | `self-review-addition.md` | Edit 1 says to keep "These have failed review before:" and add it after the new text |
| 3, 4 | `research-evidence-addition.md` | Writer given by role, never name or handle; the `lead-research` paragraph names `.claude/skills/research-rigor/SKILL.md` and says to open it |
| 5, 6, 7, 8, 9 | `review-format-addition.md` | Rewrites use only confirmed fact-sheet lines and lead evidence in customer text, "up to five", policy flags never replace ESCALATE or an auto-fail, both never-contact places named, "without the unconfirmed mark", severity count updated |
| 10, 11, 12, 13 | `reply-triage-not-now-addition.md` | Write to create, Bash `>>` to append; `outreach` checks files only and writes "site not checked"; the log row is a note, not the reply's action; topic in the writer's own words |
| 14, 15 | `seo-refresh-addition.md` | Fetch described as text conversion that strips script tags; "report the first failing step first" |
| 16, 17 | `cold-email-links-addition.md` | The `url-punctuation` check is built on its branch (not merged) and looser than the skill; fix timing follows assumption 19; 13 email and 2 LinkedIn lines |
| 18 | `README.md` | "Loaders and tools" is now `fixed`, with the fallbacks' tools read |
| 19 | `README.md` | Questions 2 to 5 replaced by pointers to assumptions 16 to 19 |
| 20 | `README.md` | Note that the brand-voice proposal's `cold-email` line references shift at install |
| 21 | `README.md` | de-slop CREDITS wording corrected |

Notes L1 to L9 from the r2 PASS (`outputs/reviews/T-20261103-09b-r2.md`) and the reply-triage trim were applied after that PASS, as wording only; no rule changed and nothing was installed. The trim cut the section from about 335 to about 225 words, using the cuts the review lists.

Coordinator decisions used: item 19 as above; draft 3 accepted once fixes 5 and 6 are in. Counts in the cost table were recounted after the edits.

The first review's lesson, kept for next time: read the `tools:` line of the fallbacks, not only the primary agents, before marking a tools check `pass`.

## Self-review

- 1 Re-read the brief: pass. The seven drafts and this README exist under `outputs/docs/skill-drafts/`, with the file names the brief gave. Each shows the insertion point by quoting a line, is in our own words, has a Sources note (URL, licence, adapted, left out), and keeps to the rules: nothing invented, drafts only, a person approves outside actions. The README covers summaries with targets, CREDITS rows, dropped items, instructions found and this self-review. Not added: nothing outside the brief except the cost table and the handoffs, which the draft format needs.
- 2 Counts match the body: fixed. After trimming, I re-counted the text to insert with a script. The table above matches the draft files' stated costs (I replaced my first estimates in the drafts with the counted figures). The self-review loaders are nine agents (found with grep over `.claude/agents`), 15 link lines (grep count by file: 2, 5, 6 and 2), seven drafts.
- 3 One answer per question across files: pass, with flags. (a) Assumption 7 says the links rule goes in "at install"; draft 5 does that. (b) Three drafts target `cold-email` (P3 nurture, draft 4, draft 5) at three different points; no conflict found by reading the host file. (c) Some CREDITS rows may duplicate P2 or P5 rows; the README says to merge them.
- 4 Automatic checks run and clean: see the table below.
- 11, 14, 15 Source handling: pass. I read these files raw with curl on 2026-11-03 (not a summary): `create-an-asset` (106 lines), `setup` (196), `brand-review` (276), `avoid-ai-writing` SKILL.md (64), `social-evidence-research` SKILL.md (59) and `references/evidence-record.md` and `references/report-template.md`, `seo-audit` lines 1 to 140 of 497, `outbound-nurture-engine` (203), `multichannel-campaign-builder` (grep of line 69 and context), and the four LICENSE files plus conorbronsdon's and isatimur's. Not read: `seo-audit` beyond line 140, the `references/` folders of the LGM skills, and conorbronsdon's full catalog. Nothing adopted from unread parts.
- Overlap with sources: pass. A 6-word overlap script over every draft and the nine source files finds no shared run, apart from the browser console one-liner and the Rich Results Test URL in `seo-refresh-addition.md`, which are functional and can't be reworded. Five earlier overlaps (two quoted headings, three phrases) were reworded.
- Loaders and tools: fixed. The first version marked this `pass` after checking only the primary agents. In revision 1 I read the `tools:` line of every loader on disk, fallbacks included (`grep -H "^tools:" .claude/agents/<name>.md`). `outreach` and `outreach-fallback` have no Edit and no WebFetch; `sales` and `sales-fallback` have WebFetch and no Edit; `marketing` has Edit and WebFetch but no shell and no browser. Draft 6 now creates the file with Write, appends with Bash, and tells `outreach` to write "site not checked". Draft 7's browser check falls to a person. No other draft step needs a tool its loaders lack.
- Re-opened for verification after writing: `multichannel-campaign-builder` line 69 (rule text matches), `outbound-nurture-engine` lines 81 and 129 (content-gap lines match), `seo-audit` lines 40 to 58 (schema limitation and priority order match), and `check-links.mjs` line 25 (it strips trailing punctuation, as draft 5 says).
- Not run: none of the additions has been tested on a real task. The skills stay untested until installed and used.

Last lines of the automatic checks (`node scripts/lint-copy.mjs <file> --type general`, then `node scripts/check-links.mjs <file>`):

| File | lint-copy | check-links |
|---|---|---|
| `self-review-addition.md` | `0 failed, 0 warning(s).` | `2 link(s): 2 ok, 0 restricted, 0 broken, 0 unreachable` |
| `research-evidence-addition.md` | `0 failed, 0 warning(s).` | `2 link(s): 2 ok, 0 restricted, 0 broken, 0 unreachable` |
| `review-format-addition.md` | `0 failed, 3 warning(s).` (expected: three `open-marker` warnings on the written-out unconfirmed marker, which the installed text must contain) | `1 link(s): 1 ok, 0 restricted, 0 broken, 0 unreachable` |
| `sender-voice-addition.md` | `0 failed, 0 warning(s).` | `1 link(s): 1 ok, 0 restricted, 0 broken, 0 unreachable` |
| `cold-email-links-addition.md` | `0 failed, 0 warning(s).` | `1 link(s): 1 ok, 0 restricted, 0 broken, 0 unreachable` |
| `reply-triage-not-now-addition.md` | `0 failed, 0 warning(s).` | `1 link(s): 1 ok, 0 restricted, 0 broken, 0 unreachable` |
| `seo-refresh-addition.md` | `0 failed, 0 warning(s).` | `2 link(s): 2 ok, 0 restricted, 0 broken, 0 unreachable` |
| `README.md` | `0 failed, 0 warning(s).` | `6 link(s): 6 ok, 0 restricted, 0 broken, 0 unreachable` |
