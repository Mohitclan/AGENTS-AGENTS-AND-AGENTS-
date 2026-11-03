---
task: T-20261103-01
kind: research survey, part A of 2 (plugins and agent sets)
author: researcher
date: 2026-11-03
status: proposed
---

# GTM survey, part A: public sales and marketing plugins and agent sets

Everything below was seen on 2026-11-03. Evidence tags: **[repo]** read in the source repo, **[blog]** read in a blog or other secondary page, **[inferred]** my reasoning.

How "read" should be understood: the fetch tool returns a summary written by a small model, not the raw file. I quote at most a line or two. Before anyone adapts a candidate, a person (or the owning agent) should open the named file and confirm it says what this survey says.

## Summary: top 5 adoptions, ranked

All five are adaptations in our own words. Nothing is installed or cloned.

1. **A1. Superlative, comparative and unattributed-quote screen in `lint-copy.mjs`** (idea from Anthropic `marketing/skills/brand-review`). It is small to build and closes a narrower gap than it first looked. The `hard` list (`evaluation/voice-rules.json` lines 3-15, about 60 terms) already fails hype words, and `checkClaims` already fails a number plus a metric word with no source nearby. What is never caught: "the only", "fastest", "leading", "number one" and "better than", and a quotation with no source [repo, reviewer check in `outputs/reviews/T-20261103-01-r1.md`, 2026-11-03]. Value high, effort small, Apache-2.0.
2. **A2. A real brand-voice document** (voice spectrum, "we are / we are not", sentences that fit and don't), proposed under `knowledge/proposals/`. Today the voice is one line in `knowledge/company.md` (lines 41-42). Value high, effort small, Apache-2.0.
3. **A3. Tiered vocabulary and rhythm checks in `lint-copy.mjs` and `voice-rules.json`** (from wshobson `avoid-ai-writing`, itself derived from conorbronsdon/avoid-ai-writing; its word tiers are adapted from brandonwise/humanizer, per `word-tiers.md` lines 14-16; all three MIT). Our lint fails on one banned word and has no cluster, density or rhythm logic. Value high, effort medium, MIT.
4. **A4. Claim inventory before drafting** (from Anthropic `sales/skills/create-an-asset`). Write the list of claims, each with its fact-sheet line, before the asset, and drop any claim without a line. Our `self-review` item 5 does this only after drafting. Value medium, effort small, Apache-2.0.
5. **A5. Rewrite guardrail** (from `avoid-ai-writing`): a revision may remove and sharpen but may not add first-person voice, invented stakes, performed candour or facts the draft lacked. It supports hard rule 2. Value medium, effort small, MIT.

Next in line: A10 (proposal skill with business case, because `sales.md` promises "Proposals and quotes" but no skill backs it) and A11 (sign-up nurture skill, same gap for `marketing.md`).

**Net finding.** Of the five sources, only Anthropic's two plugins and wshobson's `avoid-ai-writing` and `social-evidence-research` held anything we lack. `gtmagents/gtm-agents` and `davepoon` are mostly generic prompts with unsourced numbers or paid tools. Agents4Marketing could not be read (repo no longer public as far as I can tell).

## What we already have (baseline used for comparison)

- Agents: `.claude/agents/*.md`, 11 plus fallbacks. Skills: the 20 listed by Glob under `.claude/skills/`: claim-check, cold-email, competitive-battlecard, demo-script, early-stage-guardrails, fact-sourcing, hook-bank, lead-research, linkedin-founder, meeting-prep, objection-handling, positioning, proof-library, reply-triage, research-rigor, seo-refresh, self-review, signal-outreach, stalled-deal, task-briefs. I could not run `node scripts/skills.mjs list` (no shell in this session); agent-to-skill mapping comes from the `skills:` lines in each agent file. Finding: the evaluator ran `node scripts/skills.mjs list` on 2026-11-03 and it shows the same 20 skills with the same agent mapping, so this baseline holds [outputs/reviews/T-20261103-01-r1.md].
- `scripts/lint-copy.mjs`: banned words (`hard`), flagged and weak words, 7 voice regexes, unsourced-number check, hedge check, external-action check, email checks (subject at most 6 words, at most 120 words, opener, opt-out, one question), social and SEO checks. `evaluation/voice-rules.json`: word lists only.
- Already credited, so not re-proposed: kai-cmo-harness and saas-marketing-agents (`docs/CREDITS.md`).
- Not read: `evaluation/rubrics.md` in full (grep for severity, rewrite, superlative, testimonial found nothing), `/weekly-review`, `knowledge/competitors/`. Check them before adopting A7, A8 or A15.

---

## 1. anthropics/knowledge-work-plugins

**Ownership and licence**
- URL: https://github.com/anthropics/knowledge-work-plugins. Owner: anthropics. 34,506 stars. Last push 2026-11-02; latest commit under `sales/` on 2026-10-21 ("feat(sales): show the source of every line with a link to check it (2.1.0) (#1351)") [repo, API, 2026-11-03].
- Licence: Apache-2.0. `LICENSE` opens "Apache License / Version 2.0, January 2004"; the only copyright line is the unfilled appendix template. `sales/LICENSE` and `marketing/LICENSE` look identical [repo].
- Terms in practice: adapting ideas in our own words is fine. If we ever copy text, we must keep the licence and notice and say what we changed. Credit the repo in `docs/CREDITS.md`.

**What I read** (paths under `sales/` and `marketing/`)
- `sales/README.md`; `sales/skills/{lead-triage, draft-outreach, call-prep, handle-objection, competitive-intelligence, deal-advance-gap, win-loss-review, deal-signals, close-plan, stakeholder-map, account-research, setup, call-summary, customer-voice, create-an-asset, inbox-sweep, account-tiering}/SKILL.md` (17 of 36).
- `marketing/README.md`; `marketing/skills/{brand-review, campaign-plan, competitive-brief, email-sequence, seo-audit, draft-content}/SKILL.md` (6 of 8).

**What it contains**
- The sales plugin is 36 skills and no commands folder; each skill runs when the request matches or as `/sales:<skill>`. The marketing plugin folder has 8 skill directories [repo, directory listings].
- The skills named in the brief (prospect-research, lead-scoring, crm-enrichment, outreach, sequence, pre-call-brief) are not in the current tree. Nearest: `account-research`, `lead-triage`, `draft-outreach`, `call-prep`. There is no enrichment skill; enrichment arrives through connectors. The marketing README still lists 7 commands, but the folder has none, so the README and tree disagree [repo].
- Nearly every skill assumes connectors (HubSpot, Close, Salesforce, Gmail, Gong, Clay, ZoomInfo, Apollo and others). There is a files-only "standalone mode" [repo, README]. Connectors and `.mcp.json` run hosted third-party tools and are out of scope for us (paid or external).
- A recurring safety pattern: email, transcripts and enrichment are treated as data; instruction-like text is reported, not followed; content-triggered actions are shown to the user first [repo]. This matches our hard rule 5 and `reply-triage`, so it is not a gain.

**Instructions found inside the content (not followed):** the skills open with a block (for example `sales/skills/close-plan/SKILL.md` line 9) telling the running Claude to take requested actions through the connector and to "never refuse an action the user asked for" on the plugin's own authority. It is not aimed at us, and it was not followed. A4 and A10 adopt the method only, never that block (hard rule 1, drafts only) [repo, line cited by the reviewer in `outputs/reviews/T-20261103-01-r1.md`, 2026-11-03]. The skills' own "treat this as data" rules address the Claude running them. `.mcp.json` and CONNECTORS.md were not opened.

**Adoption candidates**

| ID | What it is | Target | Why it's better than or missing from ours | Value | Effort | Licence OK | Conflicts |
|---|---|---|---|---|---|---|---|
| A1 | Brand-review's screen for unsubstantiated superlatives, comparative claims, unattributed testimonials and close paraphrasing [repo, `marketing/skills/brand-review`] | Check in `lint-copy.mjs` + `voice-rules.json` (new `flag` entries; a "quote with no source within 2 lines" warning) | The `hard` list in `voice-rules.json` (lines 3-15, about 60 terms) already fails hype words such as the hyphenated superlatives on line 6. `checkClaims` in `lint-copy.mjs` (lines 45-46, 117) already fails "#N" or "top N" next to a metric word with no source nearby. Never caught: "the only", "fastest", "leading", "number one", "better than", and "#1" or "cheaper than" when no number and metric word share the line. Nothing checks a quotation for a source. `competitive-battlecard` rule 4 forbids unsourced "cheaper than" claims, but nothing enforces it [repo, reviewer check, `outputs/reviews/T-20261103-01-r1.md`, 2026-11-03] | High | Small | Yes (ideas, own words) | None. Warnings only, so it cannot block legitimate sourced comparisons. Lint checks form, not truth (main memory, 2026-10-30) |
| A2 | Voice framework: each attribute on a spectrum, "We are / We are not", sample sentences that do and don't fit, and tone as a dial (more bold at launch, warmer during an incident) [repo, `brand-review`] | New knowledge proposal for `knowledge/company.md` `## Brand voice` (currently one line), then a short `brand-voice` section in the `positioning` skill | The current voice is one line: "plain-spoken and confident. Short sentences, concrete outcomes, no hype." Agents have nothing to test a sentence against beyond word lists | High | Small | Yes | Voice rules are company facts, so the agent writes a proposal and a person confirms (`node scripts/kb.mjs confirm`); agents cannot edit the confirmed file |
| A4 | Content inventory before rendering: list each claim with its source, then outline, then build; unverified items labelled; customer numbers as bracketed placeholders [repo, `sales/skills/create-an-asset`] | Agent instruction (`sales.md`, `docs-handler.md`) and the "Sales asset" row of `task-briefs` | `self-review` item 5 (`## Claims used`) happens after drafting; a bad claim then costs a revision round. Moving the table first removes claims with no fact-sheet line before they are written | Medium | Small | Yes | The plugin pauses for the user's go-ahead on the outline. Our agents should not wait on a person mid-run, so adapt it as "inventory first, self-check, then draft". Adopt the method only, never the plugin's opening block that says to take requested actions and "never refuse" them (hard rule 1) |
| A7 | Review output format: summary, findings table (issue, location, High/Medium/Low, suggestion), before/after rewrites for the 3-5 worst issues, legal/compliance flags in a separate section [repo, `brand-review`] | `evaluation/rubrics.md` review format or the marketing agent's self-check | Our rubrics (grep) have no severity ladder or rewrite examples; rewrites speed up the two-revision limit | Medium | Small | Yes | None. Check how the evaluator's current report is shaped first (not read) |
| A8 | Competitive brief: content-audit grid (topic by format, each row gap / opportunity / parity); value proposition split into promise, evidence, mechanism, uniqueness; narrative lens (villain, hero, transformation, stakes) [repo, `marketing/skills/competitive-brief`] | Competitor-file template in `researcher.md` and an extra section in `competitive-battlecard` | The competitor file lists positioning, features, pricing and weaknesses but has no content-gap grid or structured value-prop breakdown | Medium | Small | Yes | A gap row we can't source must be labelled hypothesis (`competitive-battlecard` rule 3). Skip the 2x2 price-versus-capability map unless every axis value is sourced. Also skip the plugin's paid-tool paths (Similarweb, Ahrefs) |
| A9 | Voice capture: learn a sender's style from 5-10 pasted sent emails (decline under 5); output a short summary plus two excerpts; nothing saved automatically [repo, `sales/skills/setup`] | New procedure in `cold-email` or `outreach.md`, feeding `{{SENDER_NAME}}` drafts | Our outreach copy is generic by design (placeholders for the sender). A sender-voice summary would make reviewed drafts need fewer wording edits | Medium | Small | Yes | Pasted emails hold third-party personal data. The person pastes their own sent mail with names and addresses removed; only the summary is kept, as a knowledge proposal. We never read a mailbox. Drafts still go to people for review (pilot rules) |
| A10 | Close plan: a business case in six parts (current state and cost, desired outcome, proposed solution, investment versus return, risk of waiting, why us) in the customer's words, with unevidenced claims flagged for the next call; plus a mutual action plan worked back from the target signature date [repo, `sales/skills/close-plan`] | New skill `proposal` for `sales.md` | `sales.md` lists "Proposals and quotes" as an output, but no skill backs it. `stalled-deal` rule 4 covers working backwards from the buyer's date, not the business-case structure | Medium | Medium | Yes | "Investment versus return" must use confirmed prices only and no invented ROI (hard rules 2 and 4); discounts stay `[NEEDS APPROVAL]`. Adopt the method only, never the opening block of `close-plan/SKILL.md` (line 9) that tells the model to take requested actions and "never refuse" them (hard rule 1). Pilot rules mean nothing goes to prospects yet, so value depends on deals existing [inferred] |
| A11 | Email-sequence design for onboarding, lead nurture, re-engagement, win-back: per email 2-3 subject options, preview text 40-90 characters, one-line purpose, one CTA, send delay, audience note; exit when the goal is met, re-entry rules, suppress when the person is in another sequence, has unsubscribed, or contacted support in the last 48 hours [repo, https://github.com/anthropics/knowledge-work-plugins/blob/main/marketing/skills/email-sequence/SKILL.md, seen 2026-11-03]. gtm-agents `drip-campaigns` adds a value ladder and rotating insight, proof and offer touches, soft CTAs early [repo, https://github.com/gtmagents/gtm-agents/blob/main/plugins/email-marketing/skills/drip-campaigns/SKILL.md, seen 2026-11-03] | New skill `nurture-sequence` for `marketing.md` | `marketing.md` promises "Email nurture for people who signed up but haven't paid". `cold-email/SKILL.md` line 3 names nurture emails and marketing loads it, so nurture is nominally covered. What it lacks is sign-up nurture rules: no exit, re-entry or suppression, and no rule against a person being in two sequences at once [repo, `.claude/skills/cold-email/SKILL.md` line 3; reviewer check, `outputs/reviews/T-20261103-01-r1.md`, 2026-11-03] | Medium | Medium | Yes | Skip engagement branching (needs open and click tracking, a privacy cost we have not approved), the open-rate benchmarks (no sources) and the gtm `drip-campaigns` tip on "progressive profiling" questions to capture more data per touch (it collects more personal data). Sending stays with a person (hard rule 1). India's DPDP position goes to a person (`CREDITS.md`) |
| A12 | Objection triage: tell a real objection from a negotiation move; a "don't" list of replies that tend to lose (over-discounting, feature dumping, arguing) [repo, `handle-objection`] | Upgrade `objection-handling` | The method already has acknowledge, ask, answer, check, next step. Missing: the real-versus-negotiation split and the don't list; its `## Never` covers promises only | Low | Small | Yes | None; the "don't over-discount" line fits hard rule 4. The plugin's reliance on win/loss history needs data we don't have yet |
| A13 | Recap rule: with no transcript or notes, ask for them and do not draft from the meeting title; follow-up under 150 words with attach placeholders; recipients from the calendar or CRM, never from the transcript [repo, `call-summary`] | `meeting-prep` "After the meeting" | Ours says "Draft a recap the same day" with no rule against drafting without notes | Low | Small | Yes | None |
| A14 | Only flag the qualification gaps that block the next stage; sequence by owner (customer, us, other); give the earliest credible close date [repo, `deal-advance-gap`] | `stalled-deal` or a pipeline-review step in `sales.md` | `stalled-deal` diagnoses why a deal stopped; it doesn't list what is still needed to advance | Low | Small | Yes | None |
| A15 | Signals thresholds scaled to sales-cycle length; "a quiet digest is the success case"; open the whole thread before calling it silent [repo, `deal-signals`] | `/weekly-review` command or `stalled-deal` | Ours has no time thresholds. Opening the full thread parallels our `self-review` item 15 | Low | Small | Yes | The 14-day and 21-day thresholds are the plugin's own; label as starting points |
| A16 | Fit-by-engagement 2x2 with an action per quadrant; low fit with high engagement means one discovery call to confirm fit or disqualify [repo, `account-tiering`] | Note in `lead-research` or `sales.md` for sign-ups and trial users | Our tiers A/B/C use fit and evidence only; nothing handles a low-fit person who is engaging | Low | Small | Yes | The 6-of-10 cutoff is the plugin's; we have no engagement data feed |
| A17 | SEO audit output: severity (Critical to Low), effort tiers (quick win 1-2 hours, moderate half a day, substantial multi-day), "Quick Wins this week / Strategic this quarter"; title 50-60 and meta 150-160 characters, one H1, thin under 300 words, stale after 12 months [repo, `seo-audit`] | `seo-refresh` skill and `checkSeo` in `lint-copy.mjs` | `checkSeo` already fails a missing H1, an H1 without the keyword, and AI-search overclaims (`lint-copy.mjs` lines 185-186, 196), and warns under 300 words. Missing: a title or meta length check, a check for more than one H1, and effort tiers [repo, reviewer check, `outputs/reviews/T-20261103-01-r1.md`, 2026-11-03] | Low | Small | Yes | The character ranges are common conventions the plugin states without sources. Make them warnings and label them conventions. Ahrefs and Semrush paths: paid, out |

**Rejected from this source**

| Item | Reason |
|---|---|
| `lead-triage` (P0-P2 with response SLAs, ownership check first) | Overlaps `leads.mjs` scoring, tiers and the suppression list. SLAs need a team and a CRM owner field we don't have |
| `draft-outreach` | Overlaps `cold-email` (120 words, one CTA, no filler opener, hooks from cited sources). Subject 4-7 words versus our 6 or fewer. Its sequence-enrol and CRM steps are writes (hard rule 1) |
| `account-research` | Overlaps `lead-research` and `signal-outreach` (six-month signal window, inferred labelled, unverifiable fit flagged) |
| `call-prep` | Overlaps `meeting-prep`. Its Gong-per-call citation technique needs a call recorder |
| `competitive-intelligence`, `win-loss-review`, `customer-voice` | Overlap `competitive-battlecard`, `objection-handling` register, `research-rigor` language bank (counts with denominators, verbatim quotes). They need CRM or Gong history we don't have |
| `stakeholder-map` | Useful only with multi-person deals. The "champion must have taken a concrete action" test is worth a line later; "dark contacts" encourages collecting more personal data |
| `inbox-sweep` | Mailbox access and CRM matching. Overlaps `reply-triage`. Its caps (25 emails, 10 drafts) are worth remembering only if reply volume grows |
| `campaign-plan` | Overlaps `early-stage-guardrails`. Budget-split guidance is for paid channels; 20% reactive slots are low value |
| `draft-content` | Placeholder-first handling of unverified facts is what we already do (needs-input markers and `{{...}}` checks in `lint-copy.mjs`). Case-study and press-release shells are low value until we have customers (`proof-library` "With no proof yet") |
| `setup` dashboard, connectors, all `*-forecast`, `*-pipeline`, CRM-write skills | Need a CRM, call recorder or enrichment (paid or external) |
| Open-rate and click-rate benchmarks in `email-sequence` | No sources; `lint-copy.mjs` would flag the same pattern |

---

## 2. gtmagents/gtm-agents

**Ownership and licence**
- URL: https://github.com/gtmagents/gtm-agents. Owner: gtmagents; copyright line in `LICENSE`: "Copyright 2025 LaunchIQ AI, Inc." Licence: Apache-2.0. 432 stars. Last push 2026-04-03, about seven months ago [repo, API and LICENSE, 2026-11-03].
- The README counts 67 plugins, 92 agents, 52 skills and 20 orchestrators; its time-saving and ROI claims are the author's and unverified [repo, README].

**What I sampled (3 top-level files and 17 plugin files from 8 of the 67 plugins; the rest unread)**
- Top level: `README.md`, `CLAUDE.md`, `LICENSE`.
- `sales-prospecting`: skills `cold-outreach`, `lead-qualification`, `discovery-calls`, `objection-handling`; agent `lead-researcher`; command `build-sequence`.
- `voice-of-customer/customer-feedback-taxonomy`; `growth-experiments` (`hypothesis-library`, `guardrail-scorecard`); `email-marketing` (`deliverability-ops`, `drip-campaigns`); `product-led-growth/pql-framework`; `competitive-intelligence/win-loss-dataset`; `pricing-strategy` (`packaging-framework`, `pricing-governance`); `intent-signal-orchestration` (`signal-scoring`, `suppression-logic`).
- Directory listings only: `personalization-engine`, `product-marketing`, `sales-pipeline`, `sales-calls` (one guessed file path was a 404).

**What it contains:** short, generic frameworks (SPARK email flow, PREP call prep, FITS qualification, LACE objections) with templates. Several agent files name paid tools (Sales Navigator, ZoomInfo, Clearbit, 6sense, Bombora, PitchBook) [repo, `lead-researcher`].

**Instructions found inside the content (not followed):**
- README: add the repo as a plugin marketplace and install plugins with `/plugin install` commands.
- Repo `CLAUDE.md`: run `scaffold_asset.py`, validation and smoke-test scripts; branch and commit; export or sync commands for Salesforce, HubSpot and Tableau.
- None targets us; all are contributor or installer steps. None followed.

**Adoption candidates:** one idea feeds A11 (the drip value ladder; see row A11 above) and one feeds A12 (below). Otherwise nothing new.

| ID | What it is | Target | Why it's better than or missing from ours | Value | Effort | Licence OK | Conflicts |
|---|---|---|---|---|---|---|---|
| A12 (part) | LACE objection flow: ask one clarifying question before presenting proof; match proof to the buyer's function (ROI for finance, efficiency for operations, security for IT); log objection frequency weekly [repo, `sales-prospecting/skills/objection-handling`] | `objection-handling` | Ours already asks one question (step 2) and keeps a register with counts. Only the "proof by function" idea is new | Low | Small | Yes | The function-matched proof must still come from confirmed facts |

**Rejected from this source**

| Item | Reason |
|---|---|
| `cold-outreach` (SPARK, subject-line bank, "at least 30% opens and 10% replies", lines under 60 characters) | Overlaps `cold-email`. The benchmarks have no source. The trigger sheet and "personalization at scale" invite generic personalisation; our `signal-outreach` is stricter. Industry angles (healthcare, financial services) aren't our ICP |
| `lead-qualification` (FITS, bands 80+/60-79/40-59) | Overlaps `leads.mjs` scoring (`pipeline/lead-schema.md`). Bands and weights unexplained |
| `discovery-calls` (PREP, MEDDICC/BANT overlay) | Overlaps `meeting-prep` and `demo-script`. The time boxes total 20 minutes for a "30-minute call" |
| `lead-researcher` agent | Names paid sources; says "avoid aggressive data scraping" but gives no limits. `lead-research` is stricter |
| `build-sequence` | Overlaps `cold-email`. Stops on a positive reply, which `reply-triage` rule 2 already does. Includes call openers and voicemail scripts (a channel we don't use) |
| `customer-feedback-taxonomy`, `win-loss-dataset`, `hypothesis-library`, `guardrail-scorecard` | Overlap the `research-rigor` language bank, the objection register and the "assumed, with test" list. They need volume we don't have. Their one gate ("one supporting data point before prioritising") is already how `research-rigor` treats a one-channel theme |
| `pql-framework` | Needs product-usage telemetry. Parked: revisit when MotionRepo trials produce usage data [inferred] |
| `pricing-strategy` (packaging fences, discount approval matrix) | Prices and discounts come only from confirmed knowledge and the human (hard rule 4). We don't invent tiers or fences |
| `deliverability-ops` | No numbers, no look-alike-domain advice (good), but it mostly restates SPF/DKIM/DMARC basics. Fold into a developer checklist only if sending infrastructure changes |
| `signal-scoring`, `suppression-logic` | "Two independent signals for a high-effort play" is already in `research-rigor` ("three channels beat one") and demo gating. Suppression is covered by `leads.mjs suppress` and `reply-triage` |

---

## 3. wshobson/agents

**Ownership and licence**
- URL: https://github.com/wshobson/agents. Owner: wshobson. 42,123 stars. Last push 2026-11-02; latest commit shown 2026-10-30, "fix: bump changed plugins and require version bumps in CI (#799)" [repo].
- Licence: MIT. `LICENSE` reads "MIT License / Copyright (c) 2024 Seth Hobson" [repo].
- `plugins/` has 92 plugins. The business, marketing or sales ones: `brand-landingpage`, `business-analytics`, `content-marketing`, `customer-sales-automation`, `hermes-tweet`, `seo-analysis-monitoring`, `seo-content-creation`, `seo-technical-optimization`, `social-publishing`, `startup-business-analyst`, plus `avoid-ai-writing` (a writing-quality skill that matters to us) [repo, directory listing].

**What I read**
- `plugins/customer-sales-automation/agents/{sales-automator, customer-support}.md`.
- `plugins/avoid-ai-writing/` `README.md`, `skills/avoid-ai-writing/SKILL.md`, `references/pattern-catalog.md`, `references/word-tiers.md`.
- `plugins/content-marketing/skills/social-evidence-research/SKILL.md`.
- READMEs of `startup-business-analyst` and `brand-landingpage`.

**Upstream:** the `avoid-ai-writing` README says its catalog and word tables come from `conorbronsdon/avoid-ai-writing`, MIT; that repo's LICENSE reads "MIT License / Copyright (c) 2026 Conor Bronsdon" [repo]. Separately, `word-tiers.md` lines 14-16 say the tiering is adapted from `brandonwise/humanizer`, which is also MIT (licence checked by the reviewer, 2026-11-03, `outputs/reviews/T-20261103-01-r1.md`). So three MIT notices apply to anything we derive from it.

**What it contains:** `sales-automator` and `customer-support` are generic one-page prompts, no sample copy, no sources [repo]. `avoid-ai-writing` and `social-evidence-research` are specific and well built.

**Instructions found inside the content (not followed):** `brand-landingpage` tells the user to install Node 18+, an SDK and an API key for a design tool (Stitch). Not followed.

**Adoption candidates**

| ID | What it is | Target | Why it's better than or missing from ours | Value | Effort | Licence OK | Conflicts |
|---|---|---|---|---|---|---|---|
| A3 | Tiered vocabulary and structural checks. Word tiers: Tier 1 always replace (49 frequency-marker words plus 10 plain clarity edits), Tier 2 flag when two or more sit in one paragraph (40), Tier 3 flag only at about 3% density, or a repeated phrase (13 words, 10 phrases). Pattern severity P0 (credibility: cutoff disclaimers, chatbot artifacts, vague attributions, significance inflation, unfilled placeholders), P1 (template phrases, "Let's" openers, bold overuse, em-dash overuse, hedge stacks, future-narrative closers, bare-noun bullet lists), P2 (uniform paragraph length, compulsive threes, generic conclusions). It weights rhythm most [repo, `SKILL.md`, `word-tiers.md`, `pattern-catalog.md`] | `evaluation/voice-rules.json` (add `tier2` and `tier3` lists) and `lint-copy.mjs` (cluster and density warnings; rhythm warning) | `voice-rules.json` fails on a single `hard` word and `lint-copy.mjs` has 7 voice regexes. No cluster or density logic, so it can't catch a draft that is full of mild tells. It also lacks words the tier list calls out: "delve", "tapestry", "realm", "embark", "robust", "pivotal" are not in our lists; "comprehensive" appears only inside one `hard` phrase (`voice-rules.json` line 11) | High | Medium | Yes (MIT, three notices: wshobson, conorbronsdon, brandonwise. Choose our own word list, write our own replacement suggestions, keep the MIT notices, and credit all three in `docs/CREDITS.md`, because single words cannot be reworded) | Keep new checks as warnings, not failures, to avoid false fails on legitimate use ("robust" is a normal engineering word). The skill itself says flags are writing-quality signals, not proof of authorship, so never present lint output as "AI detection". The Stanford figure in the file is the author's; not opened, so don't reuse it |
| A5 | Rewrite guardrail: a rewrite may remove and sharpen but may not add first-person voice, invented stakes, false contrarianism, performed candour ("let's be honest") or facts; edit mode skips quotes, code and tables; re-audit after rewriting, capped at two passes [repo, `SKILL.md`] | `self-review` (one check), `linkedin-founder` "Avoid sounding generated", and the revision instruction in agent files | `linkedin-founder` tells writers to cut formula lines but doesn't forbid adding things when fixing a flagged draft. A revision that adds colour is how an invented detail gets in, which hard rule 2 forbids. Our `VOICE_PATTERNS` already catch "I'll be honest" | Medium | Small | Yes (MIT) | None |
| A6 | Evidence record method for public social and forum material: protocol written before collecting; search results and snippets are discovery-only; each inspected post, comment or segment gets its own record with an ID and locator; commenters kept apart from post authors; reposts grouped; report counts for found, inspected, excluded and access gaps; audit mode names the broken rule per unsupported claim; never post, follow, log in or bypass gates [repo, `content-marketing/skills/social-evidence-research`] | Upgrade `research-rigor` ("When a finding is real") and `lead-research` "Public buyer intent" | `lead-research` already asks for exact words and a URL, and `self-review` 14-15 separate opened from unopened sources. Missing: the up-front protocol, the inspected-versus-discovered count line, and keeping commenter and author apart (so a reply is not credited to the post's author) | Medium | Small | Yes (MIT) | Fully aligned with our no-login, no-posting rules |
| A18 | Flag AI-tool tracking parameters in cited URLs (a P0 pattern in the catalog) [repo, `pattern-catalog.md`] | `scripts/check-links.mjs` warning | A research link with an AI-chat tracking parameter is a sign it was copied from an assistant answer, not opened. `fact-sourcing` already says AI summaries are not sources | Low | Small | Yes | None |

**Rejected from this source**

| Item | Reason |
|---|---|
| `sales-automator`, `customer-support` agents | Generic; overlap `cold-email`, `reply-triage`, `outreach.md`. No method |
| `startup-business-analyst` (market sizing, financial model, `/business-case`) | The README doesn't show where inputs come from; risk of invented TAM and projections (hard rule 2). Our research must be sourced |
| `brand-landingpage` | Needs an API key and SDK for a design tool; our `developer` agent owns landing-page changes. Brand-interview questions are worth a later look but low priority |
| `social-publishing`, `hermes-tweet` | Names suggest posting. Not read; posting is out (hard rule 1) |
| `seo-*` plugins, `business-analytics`, `content-marketing/agents` | Not read (two README fetches returned 404). Treat as unknown, not as rejected on merit |

---

## 4. davepoon/claude-code-subagents-collection

**Ownership and licence**
- The URL redirects to https://github.com/davepoon/buildwithclaude, a hub for agents, skills, commands, hooks and plugins (README: 117 agents) [repo, page, 2026-11-03]. Owner: davepoon. Licence: MIT; `LICENSE` reads "MIT License / Copyright (c) 2025 davepoon". Stars: 3,711 (GitHub API, checked by the reviewer on 2026-11-03, `outputs/reviews/T-20261103-01-r1.md`; my own call returned 403).
- Latest commit shown on the commits page: 2026-11-02, "Add wudland 0.1.0" [repo]. That is a repo-wide commit, not specific to the agents I read.

**What I read:** plugin folder listings and these files in `plugins/agents-sales-marketing/agents/`: `content-marketer.md`, `social-media-copywriter.md`, `twitter-ai-influencer-manager.md`, `social-media-clip-creator.md`; and `plugins/agents-business-finance/agents/business-analyst.md`.

**What it contains:** the sales and marketing plugin lists 7 agents (content-marketer, customer-support, risk-manager, sales-automator, social-media-clip-creator, social-media-copywriter, twitter-ai-influencer-manager); business-finance lists 4 (business-analyst, legal-advisor, payment-integration, quant-analyst); media-content lists 11 podcast-production agents. The pages said "View all files", so lists may be incomplete [repo]. `sales-automator` and `customer-support` carry the same names as the wshobson files I read; I did not open the davepoon copies and assume they are the same [inferred].

**Instructions found inside the content (not followed):** none aimed at us.

**Adoption candidates:** none.

**Rejected / parked**

| Item | Reason |
|---|---|
| `content-marketer` | Generic. It asks for "keywords with search volume data" with no named source, so it invites invented figures |
| `social-media-copywriter` | Written for one podcast, uses a retrieval tool, and recommends "FOMO" framing, which conflicts with `cold-email` "Never invented urgency" |
| `twitter-ai-influencer-manager` | Posts, schedules, replies and likes through the Twitter API: against hard rule 1 and `linkedin-founder` ("no engagement bots") |
| `business-analyst` | Generic metrics list (CAC, LTV, churn, TAM/SAM/SOM); no sourcing rule |
| `social-media-clip-creator` | Parked, low value: ffmpeg commands to cut vertical and horizontal clips from long video, with JSON output. Free tooling, but `marketing.md` has no shell tool. Revisit if a demo-video repurposing task appears; the `developer` agent would own it |
| `agents-media-content` (11 podcast agents) | Not our workflow |

---

## 5. Agents4Marketing

**Could not be read. Findings are ideas-only at best, and there are no candidates.**

- The article at aiproductivity.ai/news/agents4marketing-open-source-claude-code-marketing/ (HTTP 410 Gone, checked 2026-11-03; written without the scheme because the page is dead) returned 410 to both URL forms I tried. I have no source for anything it said: my only description of it came from a search snippet of a page that returns 410, so none of it is used here.
- GitHub repo search for "Agents4Marketing" returned 0 repositories (API, 2026-11-03).
- A listing on vuink.com (submitted 2026-03-08 per that page) names the repo as `TheCMOAI/Agents4Marketing` and describes 10 agents with rules, workflows, quality checklists and decision-tree playbooks, a shared knowledge base, a CLAUDE.md, and 15 industry verticals that are mostly local trades (plumbing, HVAC, roofing and so on) plus ecommerce. It quotes the author, not a third party, on where the system came from. That is the author's own claim per vuink, and nothing outside vuink supports it [blog, secondary, page not showing the README].
- github.com/TheCMOAI/Agents4Marketing returned HTTP 404 (checked 2026-11-03; written without the scheme because the page is dead); the raw README returned 404; the owner's profile lists two public repositories (`World`, `thecmo-claude-plugin`), neither of which is this one [repo, 2026-11-03]. My API call for the repo returned 403, which I read as rate-limiting. The reviewer's later API call returned 404 for the repo and its licence (`outputs/reviews/T-20261103-01-r1.md`, 2026-11-03), so the repo is not readable, but whether it was deleted, renamed or made private is still **unknown**.
- Licence: unknown, so there is nothing we may adapt. Content in the source is trade-business marketing, not B2B SaaS, so the loss looks small [inferred, low confidence].
- Name collision: agent4m.com is an unrelated Arizona real-estate photography business [blog].
- Suggested next step for a person: if you have a copy, a link or the author's name, give it to the coordinator and I can read it. Otherwise drop it.

---

## Combined adoption table (sorted by value, then effort)

| ID | Candidate | Source | Target | Value | Effort | Licence OK |
|---|---|---|---|---|---|---|
| A1 | Superlative, comparative and unattributed-quote screen | Anthropic marketing `brand-review` | `lint-copy.mjs`, `voice-rules.json` | High | Small | Yes |
| A2 | Brand-voice document (spectrum, we are / we are not, samples) | Anthropic marketing `brand-review` | knowledge proposal for `company.md`, then `positioning` | High | Small | Yes |
| A3 | Tiered vocabulary, cluster, density and rhythm checks | wshobson `avoid-ai-writing` (upstream conorbronsdon and brandonwise, MIT) | `lint-copy.mjs`, `voice-rules.json` | High | Medium | Yes (MIT x3) |
| A4 | Claim inventory before drafting | Anthropic sales `create-an-asset` | `sales.md`, `docs-handler.md`, `task-briefs` | Medium | Small | Yes |
| A5 | Rewrite guardrail: remove and sharpen, never add | wshobson `avoid-ai-writing` | `self-review`, `linkedin-founder`, revision instructions | Medium | Small | Yes |
| A6 | Evidence records and count line for public-intent research | wshobson `social-evidence-research` | `research-rigor`, `lead-research` | Medium | Small | Yes |
| A7 | Review format: severity table, before/after rewrites, compliance flags | Anthropic marketing `brand-review` | `evaluation/rubrics.md` or marketing self-check | Medium | Small | Yes |
| A8 | Content-gap grid and value-prop breakdown | Anthropic marketing `competitive-brief` | competitor-file template, `competitive-battlecard` | Medium | Small | Yes |
| A9 | Sender voice capture from pasted emails | Anthropic sales `setup` | `cold-email` / `outreach.md` | Medium | Small | Yes |
| A10 | Proposal skill: business case and mutual action plan | Anthropic sales `close-plan` | new skill for `sales.md` | Medium | Medium | Yes |
| A11 | Sign-up nurture skill with exit, re-entry and suppression rules | Anthropic marketing `email-sequence` (+ gtm `drip-campaigns`) | new skill for `marketing.md` | Medium | Medium | Yes |
| A12 | Objection triage: negotiation versus real; don't list; proof by function | Anthropic `handle-objection` + gtm LACE | `objection-handling` | Low | Small | Yes |
| A13 | Recap rule: no notes, no recap | Anthropic `call-summary` | `meeting-prep` | Low | Small | Yes |
| A14 | Next-stage gap filter | Anthropic `deal-advance-gap` | `stalled-deal` / `sales.md` | Low | Small | Yes |
| A15 | Cycle-scaled stall thresholds; open the thread before calling it silent | Anthropic `deal-signals` | `/weekly-review`, `stalled-deal` | Low | Small | Yes |
| A16 | Fit-by-engagement 2x2 | Anthropic `account-tiering` | `lead-research` / `sales.md` | Low | Small | Yes |
| A17 | SEO lint and audit tiers (title, meta, one H1, effort tiers) | Anthropic marketing `seo-audit` | `seo-refresh`, `checkSeo` | Low | Small | Yes |
| A18 | AI-tracking-parameter warning in cited links | wshobson `avoid-ai-writing` | `scripts/check-links.mjs` | Low | Small | Yes |

Licence column: "Yes" means we may adapt the idea and credit the source in `docs/CREDITS.md`. For A3 this means choosing our own words, writing our own suggestions and keeping the MIT notices for all three upstreams. No other row needs copied text, so none needs a verbatim notice. No candidate comes from a source without a licence.

## Hypotheses (my inferences)

| # | Hypothesis | Confidence | Reason |
|---|---|---|---|
| H1 | A1 and A3 will catch more form problems before review than they cause false warnings, if kept as warnings | Medium | The tier method is designed to reduce false hits, but I have not run it on our drafts. Cheapest test: run the new patterns over the last 20 files in `outputs/` and count hits per file |
| H2 | A2 will cut wording revisions on outreach and landing copy | Low | Plausible, since word lists don't say what "plain-spoken and confident" sounds like. No data on why past reviews returned REVISE for tone (check `lint-copy.mjs mine` and `outputs/reviews/`) |
| H3 | The proposal and nurture gaps (A10, A11) matter once real replies and sign-ups exist | Medium | The agent files promise these outputs. For proposals (A10) no skill backs it, which holds across all 20 skills. For nurture (A11), `cold-email` line 3 nominally covers nurture emails, so the real gap is sign-up nurture rules (exit, re-entry, suppression). Whether volume exists yet: unknown, pilot rules still hold sends back |
| H4 | The gtm-agents and davepoon collections are unlikely to improve if we sample more | Medium | The 17 gtm files and 5 davepoon files I read were generic and unsourced. I read about 8 of 67 gtm plugins, so a good one could be missed |
| H5 | Agents4Marketing holds little for a B2B SaaS team | Low | Based on a listing that says its verticals are local trades, not on the files |

## Data gaps and what I couldn't read

- **Agents4Marketing:** repo not reachable (above). The blog post is 410 Gone.
- **GitHub API rate limit:** after about 40 calls the API began returning 403 for unauthenticated requests. As a result I could not list some plugin folders via the API (the davepoon star count, 3,711, is now a finding from the reviewer's check; see section 4); I used github.com tree pages and raw files instead. Two wshobson README fetches returned 404 (`business-analytics`, `seo-content-creation`).
- **Anthropic sales plugin, 19 of 36 skills unread:** account-context, account-plan, crm-hygiene-check, customer-health, daily-briefing, deal-review, deal-slip-scenario, end-of-day, expansion-whitespace, forecast, log-activity, pipeline-review, rep-context, renewal-radar, route-lead, schedule-meeting, team-pipeline, update-opportunity, weekly-wrap. Also unread: `.mcp.json`, `CONNECTORS.md`. Marketing: `content-creation` and `performance-report` unread.
- **gtm-agents:** about 59 of 67 plugins unread, including `personalization-engine`, `product-marketing`, `sales-pipeline`, `sales-calls`, all industry plugins and the 20 orchestrators.
- **wshobson:** `content-marketing` agents, three `seo-*` plugins, `social-publishing`, `hermes-tweet`, `hr-legal-compliance` unread.
- **davepoon:** 6 of 22 business-adjacent agent files unread; lists may be incomplete.
- **Fetch summaries:** all "[repo]" reads came through the fetch tool's summarising model; exact wording and numbers (word-tier counts, thresholds) should be confirmed against the files before implementation.
- **Our side:** `evaluation/rubrics.md`, `/weekly-review`, `knowledge/competitors/` not read. (`node scripts/skills.mjs list` is no longer a gap: the reviewer ran it and it shows the same 20 skills; see the baseline section.)

## Self-review

- 1. Re-read the brief: pass. Summary with top 5, one section per source (ownership, contents, candidates, rejected), combined table sorted by value then effort, "couldn't read", RESULT block. Instructions found are listed per source. Not asked for and not added: no skill, agent, script or memory file was edited.
- 2. Counts match the body: pass. 36 sales skills, 17 read, 19 unread (19 listed by name). 8 marketing skills, 6 read, 2 unread. 18 candidates (A1-A18) in the combined table; per-source tables carry A1, A2, A4, A7-A17 (Anthropic), A12 part (gtm), A3, A5, A6, A18 (wshobson). Top 5 equals the first five table rows. Word-tier sizes: 49 + 10 + 40 + 13 = 112 words, matching the README's "112 words".
- 3. One answer per question: pass. The Agents4Marketing client-count figure with no source was removed in revision 1, so no disagreement remains.
- 4. Automatic checks: not run by me (this session has no shell tool). I did not run `node scripts/check-links.mjs` or `node scripts/lint-copy.mjs --type general` on the revised file. The coordinator will run both and add the last line of each here. After the revision I expect the earlier lint failures and the two dead-URL results to be cleared, but that is unconfirmed until they run.
- 14. Primary over secondary: pass for the four readable sources (repo files, LICENSE files, commit pages). Agents4Marketing rests on secondary pages only and says so.
- 15. Sources I couldn't open are listed as not opened: pass (410, 404 and 403 results are reported as findings).
- Revision 1 re-check: re-opened the `email-sequence` and gtm `drip-campaigns` file pages (both load, and say what A11 claims about exit, re-entry, suppression, value ladder and progressive profiling) and `word-tiers.md` (adapted from brandonwise/humanizer), 2026-11-03.
- Re-opened for verification (first round): re-fetched `gtm-agents/LICENSE` (copyright line), the wshobson and davepoon commit pages (dates), and wshobson `avoid-ai-writing/SKILL.md` (tier names, derivation) and `word-tiers.md` (counts); each matched what is written above.

Sources (all seen 2026-11-03): https://github.com/anthropics/knowledge-work-plugins, https://github.com/gtmagents/gtm-agents, https://github.com/wshobson/agents, https://github.com/conorbronsdon/avoid-ai-writing (LICENSE only), https://github.com/davepoon/buildwithclaude, https://github.com/TheCMOAI, https://vuink.com/post/tvguho-d-dpbz/TheCMOAI/Agents4Marketing. Not opened or dead: aiproductivity.ai/news/agents4marketing-open-source-claude-code-marketing/ (HTTP 410, 2026-11-03) and github.com/TheCMOAI/Agents4Marketing (HTTP 404, 2026-11-03).

File-level sources for A1-A5 and A10 (seen 2026-11-03): https://github.com/anthropics/knowledge-work-plugins/blob/main/marketing/skills/brand-review/SKILL.md (A1, A2), https://github.com/anthropics/knowledge-work-plugins/blob/main/sales/skills/create-an-asset/SKILL.md (A4), https://github.com/anthropics/knowledge-work-plugins/blob/main/sales/skills/close-plan/SKILL.md (A10), https://github.com/wshobson/agents/blob/main/plugins/avoid-ai-writing/skills/avoid-ai-writing/SKILL.md (A3, A5), https://github.com/wshobson/agents/blob/main/plugins/avoid-ai-writing/skills/avoid-ai-writing/references/word-tiers.md (A3), https://github.com/wshobson/agents/blob/main/plugins/avoid-ai-writing/skills/avoid-ai-writing/references/pattern-catalog.md (A3, A5, A18). Also: https://github.com/anthropics/knowledge-work-plugins/blob/main/marketing/skills/email-sequence/SKILL.md and https://github.com/gtmagents/gtm-agents/blob/main/plugins/email-marketing/skills/drip-campaigns/SKILL.md (A11). Licences and the reviewer's checks: `outputs/reviews/T-20261103-01-r1.md`.

## Revision 1 (2026-11-03)

Changes made for review r1 fixes 1-12. Nothing else was altered.

1. Summary item 1 and the A1 row: the lint gap is restated. `voice-rules.json` `hard` already has about 60 terms and `checkClaims` already fails a number plus a metric word with no source. The real gap is "the only", "fastest", "leading", "number one", "better than", and unsourced quotes. Banned terms are no longer written out; they are referred to by list and line.
2. A3 "Why" cell: the banned phrase is replaced by a pointer to `voice-rules.json` line 11.
3. `draft-content` row: the literal marker is now "needs-input markers".
4. A11 row: exact file URLs added for `email-sequence` and gtm `drip-campaigns`. The Sources section now lists file URLs for A1-A5, A10 and A11.
5. A11 "Why" cell and H3: `cold-email` line 3 nominally covers nurture. The gap is sign-up nurture rules (exit, re-entry, suppression, one sequence at a time). H3 now says "no skill" holds for proposals only.
6. A3 credits: brandonwise/humanizer (MIT) added as the third credit in the summary, upstream paragraph, A3 row, combined table and licence note. "Re-express lists in our own words" is replaced by: choose our own word list, write our own suggestions, keep the MIT notices.
7. Agents4Marketing: the client-count figure and the "Disagreement" bullet are removed. The two dead URLs are written without the scheme, with status code (410 and 404) and date checked.
8. A17: `checkSeo` is described correctly (fails missing H1, H1 without the keyword, AI-search overclaims).
9. Instructions found (Anthropic section), A4 and A10: the skills' opening block telling the model to take requested actions and "never refuse" them is recorded. A4 and A10 adopt the method only (hard rule 1).
10. A11 "Conflicts": gtm's "progressive profiling" tip is excluded because it collects more personal data.
11. Skills-list and davepoon star-count gaps are now findings, citing the review: `skills.mjs list` shows the same 20 skills, and buildwithclaude has 3,711 stars. (source: outputs/reviews/T-20261103-01-r1.md)
12. Self-review item 4 now says I did not run lint-copy or check-links; the coordinator will run both and add the last line of each.
