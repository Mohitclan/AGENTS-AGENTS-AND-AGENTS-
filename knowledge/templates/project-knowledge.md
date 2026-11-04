# Project knowledge form (`knowledge.md`)

Form version 2 · 2026-11-04 · Owner: knowledge-base · Audience: our own team (internal)

One person on the team fills in one copy of this form for each product or project. The knowledge-base agent turns the filled copy into `knowledge/products/<slug>.md` with `status: proposed`. A person then confirms that sheet (section 2). How the agent converts and updates the sheet, and the proof that this form holds everything the agents read, is in `knowledge/templates/project-knowledge-conversion.md`. You do not need that file to fill this one in.

This file is a form, not knowledge: it has no `status:` line and agents never quote it.

What stays in `knowledge/company.md` and is not repeated here: the company profile, the discount policy, the allowed channels, the daily sending limit, the opt-out rule, the base brand voice and the default approvers. The team decisions in `memory/MAIN.md` also bind every project. A project may be stricter than either, never looser. If you want something looser, write it as a request in section U; it has no effect until a person approves it.

Contents: 1 Rules · 2 What happens after you hand it in · 3 How to copy the form · then the form itself: Part 1, Part 2, and sections T, U and V

---

## 1. Rules for filling it in

1. **Every fact has a source.** A source is one of: an exact page URL; a repo path with line numbers (`repos/<slug>/src/billing/plans.ts:12-30`); `told by <name> on <YYYY-MM-DD>`; or `seen live by <name> on <YYYY-MM-DD>`. A fact that comes from your own knowledge is `told by <your name> on <date>`. The filled form as a whole counts as told by `filled_by` on `last_updated` (told by suryanshu on 2026-11-04, `memory/MAIN.md`), but each fact still gets its own source so a reader can check it. Prices, plan limits, customer names and metrics need a source dated within the last 90 days.
2. **Mark who may hear it.** Every table you copy has an Audience column. Write `public` if the fact may be said to customers once a person confirms the sheet. Write `internal` if it must never reach a customer (costs, roadmap, known bugs, security gaps, private plans, customer names). Outside tables, end the line with `[public]` or `[internal]`. A row with no mark is treated as internal at conversion and listed under Open questions; the agent never guesses `public`.
3. **Never leave a field blank, and never guess.** Write the value, or `unknown` (you have not found out), `none` (you checked and there is nothing) or `n/a` (does not apply). A blank field counts as not done. Each `unknown` also goes into section U with who can answer it. In Part 2 you may write `not filled yet` once for a whole section; it is listed under Open questions and the work that needs it waits.
4. **Label opinions.** A belief no source shows starts with `Hypothesis (low|medium|high):` and says what would test it, for instance `Hypothesis (low): small teams do this by hand. Test: ask three customers.` Never write a belief as a fact, and never invent a customer, quote, metric, price, discount or feature.
5. **One claim, one source.** Do not join two true facts into a new claim. "Prices plus <rate>% tax" and "we send invoices" do not make "tax invoice" unless a source says that exact thing. "No yearly plan" does not mean "cancel any time". Write what the source says, in its words.
6. **When sources disagree, record both.** Put the two statements and their sources in section T. Do not pick one, and do not put either in the other sections as settled until a named person decides.
7. **No secrets and no private data.** No passwords, API keys, tokens, `.env` contents, internal-only URLs (staging, admin, private chat links) or customer personal data. For an internal document or a demo login, name the system and the entry title (for example `Drive: onboarding emails v2`), never the URL or the login. Phrases heard on calls are attributed by role, never by name, and stay `internal` unless section L records permission to cite them. Quote public sources only for what a business published in a professional capacity.
8. **Keep the version and date current.** Every edit that changes a fact bumps `version` by one, updates `last_updated`, and adds a line to the change log (section V). A typo fix needs none of these.

---

## 2. What happens after you hand it in

- The knowledge-base agent builds `knowledge/products/<slug>.md` with `status: proposed` and adds the project to the Products table in `CLAUDE.md` (`.claude/agents/knowledge-base.md`, step 6 of "Building a product fact sheet").
- Research and fact-sheet work may start at once. The coordinator holds lead finding, lead scoring, outreach, sales and demo work until a person confirms the sheet. Any fact used before then is marked `[UNCONFIRMED]` (`CLAUDE.md`, Knowledge rules).
- A person confirms the sheet from the UI: a signed-in person types yes, and the confirm is recorded with their name and date (told by suryanshu on 2026-11-04, `memory/MAIN.md`). Agents never confirm anything.
- Part 1 is what lead finding and outreach need. Lead finding and outreach do not start until every Part 1 section is filled with real values (`none` counts if you checked, `unknown` does not).
- Part 2 is what replies, demos, proposals, docs and listings need. Fill it in before those start.
- The sheet becomes `confirmed` as a whole. Facts marked `internal` stay out of anything a customer sees.

---

## 3. How to copy the form

1. Make a new file named `knowledge.md`.
2. Copy the lines between the two `COPY` markers, but not the markers themselves.
3. The first line of your file must be `---`. If anything comes before it (a heading, a code fence, a blank line), the agent cannot read the frontmatter.
4. Replace every `<...>` prompt. Add table rows as needed. Keep every section, even one you mark `n/a`.

Frontmatter fields (this table is guidance and is not part of the copy):

| Field | What to write | Who uses it |
|---|---|---|
| `name`, `slug`, `website` | Name as customers see it; lowercase with hyphens; full https URL | Every agent; `scripts/leads.mjs` matches a lead's `product` to the slug |
| `repo` | `owner/repo`, or `none` | knowledge-base, docs-handler, demo-handler and developer clone and read it |
| `stage` | `live` (customers can use it today), `beta` (a limited group can) or `building` (nobody outside the team can) | People. No script or agent file reads it (checked by grep). It stays because `knowledge/products/_template.md` has it |
| `owner` | One named person who answers questions | The coordinator, when it routes a question |
| `filled_by` | Your name | The "told by" name for this form |
| `approver_outreach`, `approver_content`, `approver_code`, `approver_discounts` | A name, or `company default` | The coordinator's approval rows; sales for discounts |
| `version`, `last_updated` | `1` and today's date `YYYY-MM-DD`; see rule 8 | knowledge-base, for staleness and diffs |

Source for the frontmatter: `told by <filled_by> on <last_updated>`.

<!-- COPY FROM HERE -->
---
name: <product name as customers see it>
slug: <product name in lowercase with hyphens>
website: <full website URL starting with https://>
repo: <owner/repo, or none>
stage: <live | beta | building>
owner: <one named person who answers questions about this project>
filled_by: <your name>
approver_outreach: <name, or company default>
approver_content: <name, or company default>
approver_code: <name, or company default>
approver_discounts: <name, or company default>
version: 1
last_updated: <YYYY-MM-DD>
---

# <Product name>: project knowledge

Form version 2. Filled by <name> on <date>.

## Part 1: needed before lead finding and outreach

### A. Identity

Done when: the name, the selling entity and the contact email have real values.

| Field | Value | Audience | Source |
|---|---|---|---|
| Customer-facing name, written exactly as customers see it | <...> | public | <...> |
| Other names (former names, repo name, internal codename) | <...> | internal | <...> |
| Company or legal entity that sells it (as on invoices) | <...> | <public or internal> | <...> |
| Public contact email for customers | <...> | public | <...> |
| Not to be confused with (similar names, sister products) | <...> | internal | <...> |

### B. One-liner

Done when: the one-liner is filled. Add what it never does if buyers worry about it.

| Item | Answer | Audience | Source |
|---|---|---|---|
| What it does, for whom, and the outcome they get, in one sentence of plain words | <...> | public | <...> |
| What it never does | <...> | public | <...> |

### C. Problem, in the customer's words

Done when: there is at least one problem row, either an exact customer phrase with its source or a labelled hypothesis with its test, plus what they do today instead.

A quote is exact and has a source and a date, or it is not a quote. Put your own wording in the last column. Do not mix a buyer's words with a user's words.

| Exact customer phrase, or a labelled hypothesis (`Hypothesis (low, medium or high): ...`) and its test | Said by (role only) | Where and when (URL, or `told by <name> on <date>`) | Buyer or user | Our wording of the problem | Audience |
|---|---|---|---|---|---|
| "<...>" | <...> | <...> | <...> | <...> | internal |

| Item | Answer | Audience | Source |
|---|---|---|---|
| What they do today instead (tools, people, manual work) | <...> | internal | <...> |
| What it costs them, only if a source shows it (time, money, missed events) | <...> | <public or internal> | <...> |
| The job in one line: "When <situation>, I want <outcome>, so I can <benefit>." | <...> | internal | <...> |

### D. Ideal customer profile (segment 1)

Done when: segment 1 is complete, every disqualifier has its reason, and any other segments are named in priority order. The lead-generator scores leads against this section, so every test must be checkable from a public page. Segments 2 and later go in Part 2.

| Item | Answer | Audience | Source |
|---|---|---|---|
| Segment name (leads carry it in their `segment` field) | <...> | internal | <...> |
| Who exactly (industry, what they build or sell) | <...> | internal | <...> |
| Company size (people) | <...> | internal | <...> |
| Region | <...> | internal | <...> |
| Buyer (title) | <...> | internal | <...> |
| User (role, if different) | <...> | internal | <...> |
| How sure are you: tested with buyers / seen in customers / my guess | <...> | internal | <...> |
| Must be true (one test per line, each checkable from a public page) | <...> | internal | <...> |
| Lowers the score but does not reject | <...> | internal | <...> |
| Rejects | <...> | internal | <...> |
| Why this segment fits (tie it to a feature or a limit in sections F and G) | <...> | internal | <...> |

Applies to all segments:

| Item | Answer | Audience | Source |
|---|---|---|---|
| Other segments, names only, best first (or `none`) | <...> | internal | <...> |
| Regions we sell to now | <...> | public | <...> |
| Regions we cannot serve yet, and why (currency, payment, language, law) | <...> | <public or internal> | <...> |
| Buying triggers (events that make them buy now), each with where it can be seen publicly | <trigger> / <where> | internal | <...> |
| Public signals that a company has the problem, each marked `published` (they said it) or `observed_gap` (visible on their public site or repo). A guess is not a signal | <...> | internal | <...> |
| Disqualifiers, each with its reason (who we should not sell to) | <...> | internal | <...> |
| What is not established yet (sizes of segments, willingness to pay) | <...> | internal | <...> |

### F. Features

Done when: every feature a message might mention has a row and a status, and anything we must not offer is marked `do not sell`.

If a feature uses AI, add `Model: <name>, checked <date>` to its "What it does" cell. A feature that exists in the code but is switched off is `do not sell`, not `live`.

- `live`: customers can use it today and someone has seen it work. Fill in "Seen working by".
- `beta`: works for a limited group or has known rough edges. Say which in "What it does".
- `planned`: not available today. Never write a date unless a source gives one; agents still will not quote it.
- `do not sell`: exists but is withdrawn, hidden or unfinished, or must not be offered. Say why.

| Feature | Status | What it does for the user, in plain words | Plans that include it | Seen working by (name, date) | Audience | Source |
|---|---|---|---|---|---|---|
| <...> | <live / beta / planned / do not sell> | <...> | <...> | <...> | <public or internal> | <...> |

### G. Limitations, security and data handling

Done when: both tables are filled, including what happens to customer data and which certifications we do not have. Honest limits protect the lead list and the first call.

| Limitation or fact | Who it affects | What we say when asked | Audience | Source |
|---|---|---|---|---|
| <...> | <...> | <...> | <public or internal> | <...> |

| Question | Answer | Audience | Source |
|---|---|---|---|
| Where does customer data go (our servers, third-party processors, AI providers)? | <...> | <public or internal> | <...> |
| Which certifications or audits do we hold (write each, or `none`)? | <...> | <public or internal> | <...> |
| Which security features are missing (single sign-on, two-factor sign-in, activity log)? | <...> | internal | <...> |
| What sign-in methods exist, and what does that rule out? | <...> | <public or internal> | <...> |
| Quotas and caps (what happens when they run out)? | <...> | <public or internal> | <...> |
| Known bugs or out-of-date public text that customers could notice | <...> | internal | <...> |
| Public security or privacy page and its contact | <...> | public | <...> |

### H. Pricing

Done when: every plan a message could mention has a quotable price, the currency and tax wording are filled, and the discount row is filled. If prices are not public, write `do not quote` and say who may.

Fill in the currency and tax wording first. Write every price exactly as it may be quoted, with its tax wording each time. Check each price against the live page and note the date. Indian customers are quoted in INR (`knowledge/company.md`, Pricing and discount policy).

| Field | Value | Audience | Source (date checked) |
|---|---|---|---|
| Currency (code and symbol) | <...> | public | <...> |
| Tax wording, exactly as it may be quoted | <...> | public | <...> |
| Does the displayed price include tax? | <yes / no / unknown> | public | <...> |
| Billing periods that exist (monthly, annual, usage) | <...> | public | <...> |
| Annual plan exists? | <yes / no> | public | <...> |

| Plan (customer-facing name) | Internal id (if different) | Price, exactly as quotable (`<symbol><amount>/month + <tax rate>% <tax name>`) | Limits (users, usage, features) | Audience | Source (date checked) |
|---|---|---|---|---|---|
| <...> | <...> | <...> | <...> | public | <...> |

| Item | Value | Audience | Source (date checked) |
|---|---|---|---|
| Discounts this project offers today (`none`, or each one with its conditions) | <...> | internal | <...> |

A project may offer no more than `knowledge/company.md` allows (Pricing and discount policy). Every discount is marked `[NEEDS APPROVAL]` and drafted for the discounts approver. Agents never offer one.

### I. Sign-up, trial and payment

Done when: every row has a real value. List the standard trial only. Longer trials, custom pilots and free extensions are `[NEEDS APPROVAL]` (`knowledge/company.md`, Pricing and discount policy).

| Question | Answer | Audience | Source |
|---|---|---|---|
| How does a new user sign up and sign in? What does it rule out? | <...> | <public or internal> | <...> |
| Which email addresses do sign-ups give (work, personal, either)? | <...> | internal | <...> |
| Where does the "start" button go? (public URL) | <...> | public | <...> |
| Is there a free trial? Length, limits, card needed? | <...> | public | <...> |
| When does the trial clock start, and what happens when it ends? | <...> | public | <...> |
| Is sign-up approved automatically or by a person? | <...> | internal | <...> |
| Time from sign-up to the first useful result, only as a source states it | <...> | <public or internal> | <...> |
| How does a customer pay today (steps from choosing a plan to being active)? | <...> | <public or internal> | <...> |
| Payment methods that work today | <...> | public | <...> |
| Payment methods described as coming or not yet live (agents must not offer these) | <...> | internal | <...> |
| Which tax or invoice documents we issue, in the exact words a source uses | <...> | <public or internal> | <...> |
| Who handles payment or billing problems, and how customers reach them | <...> | public | <...> |
| Where a person can read counts of sign-ups, first outputs and paid plans (system name, never a login), and who supplies them | <...> | internal | <...> |

### J. Calls to action

Done when: the allowed table has at least one row and the never table is filled (`none` if you checked). A call to action is allowed only if the thing it points to exists today and someone has checked it; for instance, never use "book a call" if there is no booking link.

| Allowed call to action (exact wording) | Where it leads (public URL, or "reply to this email") | Checked working by (name, date) | Use in (email, LinkedIn, site, replies) | Audience |
|---|---|---|---|---|
| <...> | <...> | <...> | <...> | public |

| Never use | Why | Audience | Source |
|---|---|---|---|
| <...> | <...> | internal | <...> |

### L. Proof points

Done when: the table has real rows, or one `none` row with the date you checked. Without a row here no "trusted by" wording is possible.

Real customers, metrics, reviews and press only. Numbers and quotes are copied exactly, not rounded or tidied. Sample or demo data is never proof. If permission is unclear, write `none`. Audience is `public` only when permission is `public` or `anonymised`.

| What (exact quote or number, and what it is out of) | Source and date | Who (named with role, or anonymised) | Permission to cite: none / internal only / anonymised / public / withdrawn | Applies to (plan, segment) | Recheck by | Audience |
|---|---|---|---|---|---|---|
| "<...>" | <...> | <...> | <...> | <...> | <...> | <public or internal> |

| Item | Answer | Audience | Source |
|---|---|---|---|
| Withdrawn proof (must come out of every live document) | <...> | internal | <...> |

### M. Competitors and alternatives

Done when: every direct competitor has a row with its website, and each direct one has where we win and where we lose.

Fill in what a buyer could do instead of buying this, including doing nothing and building it themselves. The lead-generator sets the `competitor` field on any lead that matches a row here, and the lead gate then stops that lead (`pipeline/lead-schema.md`, field `competitor`). If you are unsure whether a company is a competitor, write it in section U; do not guess. Competitor prices and features are not collected here: the researcher records them, dated, in `knowledge/competitors/<slug>.md`. Write no price comparison ("cheaper", "better") unless both prices are dated, within 90 days (rule 1) and in the same currency.

| Name | Type: direct / indirect / build it yourself / do nothing | Website | Where we win | Where we lose | Audience | Source |
|---|---|---|---|---|---|---|
| <...> | <...> | <...> | <...> | <...> | internal | <...> |

| Item | Answer | Audience | Source |
|---|---|---|---|
| May we name competitors to customers? (`yes`, `no` or `only in comparison pages`) and who approved | <...> | internal | <...> |
| Why a buyer picks the alternative of doing nothing | <...> | internal | <...> |

### N. Positioning and claims

Done when: the one-sentence positioning, the three key messages and both claim tables are filled. Each allowed claim must trace to a row above. For instance, do not say "enterprise-ready" if section G lists missing certifications.

| Item | Answer | Audience | Source |
|---|---|---|---|
| Positioning in one sentence (for whom, what is different, against what) | <...> | public | <...> |
| Three key messages | <1> / <2> / <3> | public | <...> |
| Has anyone outside the team reacted to this positioning? (who, date) Or write `assumed, test with <cheapest test>` | <...> | internal | <...> |

| Claim we may make (exact wording) | Grade: supported today / supported with effort / roadmap no date / not supported | Rests on (section and row) | Audience |
|---|---|---|---|
| <...> | <...> | <...> | public |

| Claim we must not make | Why | Audience | Source |
|---|---|---|---|
| <...> | <...> | internal | <...> |

### R. Brand voice for this project

Done when: the product-name row and the plan-names row are filled. Write only what differs from the base voice in `knowledge/company.md`. The copy checker (`scripts/lint-copy.mjs`) reads only `evaluation/voice-rules.json`, not this form: agents and the evaluator apply your words by hand. To make a word fail the check, ask a person in section U to add it to that file.

| Item | Answer | Audience | Source |
|---|---|---|---|
| How to write the product name (capitals, spaces, never abbreviated as) | <...> | public | <...> |
| Customer-facing plan names, and any internal ids never to use | <...> | public | <...> |
| Words customers use that we should adopt | <...> | internal | <...> |
| Words to avoid for this product, with the reason | <...> | internal | <...> |
| Terms that mean something specific here (define each) | <...> | public | <...> |
| Spelling and units (for example Indian English, local currency words) | <...> | internal | <...> |

### S. Outreach rules for this project

Done when: every row has a real value. This section can narrow `knowledge/company.md` but not widen it.

| Item | Answer | Audience | Source |
|---|---|---|---|
| Channels allowed for this project (a subset of those in `knowledge/company.md`) | <...> | internal | <...> |
| Does this project need a different sender from the one in `ops/mail-config.json`? (`no`, or who and why; only a person can change that file) | <...> | internal | <...> |
| Offers a message may make (free trial, sample output, resource) and where each can be seen | <...> | public | <...> |
| Regions or kinds of company never contacted cold, and why | <...> | internal | <...> |
| Never-contact additions: company domains (not private people), each with its reason | <...> | internal | <...> |
| Current customers, as company names, so nobody cold-emails them | <...> | internal | <...> |

Never-contact domains: the agent cannot write the suppression list (`CLAUDE.md`, Where things live). The knowledge-base agent hands each domain to the coordinator as an item for a person to run `node scripts/leads.mjs suppress <domain> "<reason>"`.

An opt-out is never written in this form. Tell the coordinator the same day, so it is suppressed with `node scripts/leads.mjs suppress` (`CLAUDE.md`, hard rule 7).

## Part 2: needed before replies, demos, proposals, docs and listings

Fill in each section below, or write `not filled yet` under its heading (rule 3).

### D (continued). Segments 2 and later, and where buyers gather

Copy the segment 1 table from Part 1 once for each further segment, with its priority number in the segment name. Then:

| Where they gather: venue, URL, what happens there, its rules on self-promotion | Audience | Source |
|---|---|---|
| <...> | internal | <...> |

### E. Personas

One row per role that takes part in a purchase. Use `unknown` rather than inventing a persona.

| Persona | Job title(s) | Role in the purchase (buyer, user, influencer, blocker) | Goals | Worries about changing | Where they read or ask for help | Phrases they use (exact, with source; by role, not name) | Audience |
|---|---|---|---|---|---|---|---|
| <...> | <...> | <...> | <...> | <...> | <...> | "<...>" (<source>) | internal |

### H (continued). Other pricing items

| Item | Value | Audience | Source (date checked) |
|---|---|---|---|
| Add-ons, extra seats, extra usage packs | <...> | <public or internal> | <...> |
| Usage costs (credits, overage), written as the product shows them | <...> | public | <...> |
| What is refunded or returned, and what is not | <...> | <public or internal> | <...> |
| Custom, enterprise or self-hosted: public price or on request? Who may quote? | <...> | internal | <...> |
| Anything about cancellation or refunds that a source states (do not infer it from the billing period) | <...> | <public or internal> | <...> |

### K. Integrations and API

"Supports X" does not mean "supports every kind of X", so state the exact scope (public or private, read or write, which plans).

| Integration or API | What it does | Direction (read, write, both) | Status (live / beta / planned / do not sell) | Scope and limits | Audience | Source |
|---|---|---|---|---|---|---|
| <...> | <...> | <...> | <...> | <...> | <public or internal> | <...> |

| Item | Answer | Audience | Source |
|---|---|---|---|
| Public customer API: yes with docs URL / no / unknown | <...> | public | <...> |
| Third-party services that receive customer data | <...> | <public or internal> | <...> |
| Tech stack and how to run it locally, for engineers only | <...> | internal | <...> |

### O. Common objections and approved answers

Objections buyers actually raise, in their words. An answer uses only facts from the sections above. Leave "Approved by" as `not approved` until a named person signs it off; agents treat unapproved answers as drafts for a person. Fill this in before sending is turned on, because the first reply will need it.

| Objection (buyer's words) | Source and date | What is usually behind it | Approved answer (customer-safe) | Facts it rests on (section and row) | Do not say | Approved by (name, date) | Audience |
|---|---|---|---|---|---|---|---|
| "<...>" | <...> | <...> | <...> | <...> | <...> | not approved | <public or internal> |

### P. Demo

Show only features marked `live` in section F. Name the place where the demo login is kept; never write the login. If the demo environment has no public URL, write `internal environment, ask <owner>` and give no address.

| Item | Answer | Audience | Source |
|---|---|---|---|
| Demo type (live product with a trial account, a separate demo account, recorded only) | <...> | internal | <...> |
| Public demo URL | <...> | public | <...> |
| Where the demo account details are kept (system and entry name, never the login) | <...> | internal | <...> |
| Who can give access | <...> | internal | <...> |
| Sample data to use and where it lives | <...> | internal | <...> |
| What to reset before each demo | <...> | internal | <...> |
| What to avoid showing live (slow steps, unfinished screens, private data) | <...> | internal | <...> |

Standard flow (three steps, each tied to a pain from section C):

| Step | What to show | Pain it answers | Minutes | Feature row in F | Audience |
|---|---|---|---|---|---|
| 1 | <...> | <...> | <...> | <...> | internal |

| Demo asset | Allowed or banned | Where it is (public URL, or system and title) | What it shows | Reason / approved by (name, date) | Audience |
|---|---|---|---|---|---|
| <...> | <allowed / banned> | <...> | <...> | <...> | <public or internal> |

### Q. Docs, links and listing assets

Every page or asset a prospect or customer might be sent or find. Public documents get their URL. Internal documents get the system and title, never a URL (rule 7). Note any page you know is out of date.

| Document or asset | Where it is | Audience | Last checked (date) | Known to be out of date? (what is wrong) |
|---|---|---|---|---|
| Help centre or docs home | <...> | <...> | <...> | <...> |
| Getting-started guide | <...> | <...> | <...> | <...> |
| Home or landing page | <...> | <...> | <...> | <...> |
| Pricing page | <...> | <...> | <...> | <...> |
| Security and privacy pages | <...> | <...> | <...> | <...> |
| Terms | <...> | <...> | <...> | <...> |
| Changelog or release notes, with the current release and its date | <...> | <...> | <...> | <...> |
| Onboarding emails and in-app guides | <...> | <...> | <...> | <...> |
| Videos | <...> | <...> | <...> | <...> |
| Existing public listings (directories, launch posts) | <...> | <...> | <...> | <...> |
| Listing assets (logo, screenshots, tagline, descriptions) and who approved them | <...> | <...> | <...> | <...> |

## Sections for both parts

### T. Conflicts between sources

Each disagreement as two statements with their sources. Do not choose between them. When a named person decides, fill in the last two columns and keep the row.

| Topic | Source A says | Source B says | Sections and agents affected | Decided (what) | Decided by (name, date) | Audience |
|---|---|---|---|---|---|---|
| <...> | <...> (<source>) | <...> (<source>) | <...> | not decided | <...> | internal |

### U. Open questions

Everything you marked `unknown`, every `not filled yet` section, and anything you want a person to decide.

| Question | Why it matters (which work is blocked) | Section | Who can answer | Asked on | Audience |
|---|---|---|---|---|---|
| <...> | <...> | <...> | <...> | <...> | internal |

### V. Change log

A new row every time you change a fact. Newest first. Do not delete rows.

| Version | Date | Who | Sections changed | What changed (old value, new value) | Why | Evidence | Audience |
|---|---|---|---|---|---|---|---|
| 1 | <YYYY-MM-DD> | <...> | all | First version | New project | <...> | internal |

<!-- COPY UP TO HERE -->
