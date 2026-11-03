# What to adopt from the public sales and marketing plugins, skills and connectors

Date: 2026-11-03. Prepared by the coordinator from two reviewed surveys:

- **Part A**, plugins and agent sets: [outputs/research/2026-11-03-gtm-survey-a-plugins-agents.md](../research/2026-11-03-gtm-survey-a-plugins-agents.md). Review: **PASS 96/100**, [outputs/reviews/T-20261103-01-r2.md](../reviews/T-20261103-01-r2.md).
- **Part B**, skill libraries and connectors: [outputs/research/2026-11-03-gtm-survey-b-skills-connectors.md](../research/2026-11-03-gtm-survey-b-skills-connectors.md). Review: **PASS 96/100**, [outputs/reviews/T-20261103-02-r2.md](../reviews/T-20261103-02-r2.md).

Both surveys' automatic checks were re-run after the last revision. lint-copy shows 0 failed for both. check-links shows 15 of 15 OK for A, and 13 OK plus 2 HubSpot sign-in pages (401, expected) for B. Their own self-review lines still say "not run", because the researchers had no shell.

**Ground rules for everything below.** We adapt, never install: `claude plugin install` and `npx skills add` would run third-party code and hooks with this folder's permissions. Everything is rewritten in our own words, keeps the MIT or Apache notices, and gets a row in `docs/CREDITS.md`. Every new copy check is a **warning only**. Adding or changing a skill needs your yes, because the guard asks a person.

## Sources and licences (checked by the reviewers)

| Source | Licence | Verdict |
|---|---|---|
| anthropics/knowledge-work-plugins (sales, marketing) | Apache-2.0 | Richest source. Adopt the methods only, never the "never refuse an action" opening block in its sales skills |
| wshobson/agents (`avoid-ai-writing`, `social-evidence-research`) | MIT, plus conorbronsdon/avoid-ai-writing and brandonwise/humanizer (both MIT) | Adopt |
| coreyhaines31/marketingskills | MIT | Adopt, but **not** its Product Hunt "warm-up" (source lines 159 and 365), reviewer gift cards, paid badges or unsourced figures |
| alirezarezvani/claude-skills | MIT | Adopt |
| LaGrowthMachine/gtm-system | MIT | Adopt; skip its install and automation steps |
| louisblythe/Sales-Skills | No licence file (a fork of Corey's) | Ideas only; 80 of 122 skills are auto-send "AI SDR" skills, rejected |
| gtmagents/gtm-agents | Apache-2.0 | Almost nothing usable: generic, unsourced benchmarks, paid tools, and "progressive profiling" |
| davepoon/buildwithclaude | MIT | Nothing usable |
| Agents4Marketing | Unknown (repo 404, article 410) | Nothing adoptable |

## Connectors

Only **HubSpot**, already in `.mcp.json`, fits "Max plan only, no paid tools". GitHub's official MCP server (MIT, read-only flag) is the closest free source of open lead data and is an option for later. These are not added:
- **Paid:** Apollo, ZoomInfo, FullEnrich, Clay, Gong, Ahrefs, and Salesforce (beyond a free Developer Edition test org).
- **Zapier:** it can send anything, which would bypass `send-email.mjs` and the approval rows.

### Safety finding F1 (needs your decision, A-20261103-01)

No hook covers connector (`mcp__`) tools. Four agents (`lead-generator`, `sales` and both of their backups) may call all 32 HubSpot tools. Eleven of those write: CRM objects, properties, pipelines, marketing email, and blog, landing-page and website publishing. Four of the 11 have no stated confirmation step.

The fix is to limit the four agents to these nine read-only tools, checked against HubSpot's docs page: `get_user_details`, `get_organization_details`, `discover_hubspot_schema`, `search_crm_objects`, `get_crm_objects`, `query_crm_data`, `search_properties`, `get_properties` and `search_owners`. `tool_guidance` is optional as a tenth. A hook is optional too, and yours to add.

**Precondition:** after signing in with `/mcp`, a person lists the tools the configured `/anthropic` endpoint really exposes, because it may offer more than the docs page lists. HubSpot isn't signed in on this machine, so the gap isn't open yet.

## The shortlist, as seven packages

Each package would be one task, with a review, before it lands. "Who" is the specialist that would build it.

| # | Package | What's in it (survey IDs) | Who | Effort | Value |
|---|---|---|---|---|---|
| **P1** | **CRM safety** | F1 read-only HubSpot tools in 4 agent files (B2, A-20261103-01); before any CRM write, confirm the record ID matches the name (B2) | developer, after your yes | Small | **High** |
| **P2** | **Copy-check upgrade** | One task with one test set, in `lint-copy.mjs` and `voice-rules.json`:<br>• warn on "the only", "fastest", "leading", "number one", "better than" and unsourced quotes (A1)<br>• word tiers, clusters, density and rhythm (A3), never called "AI detection"<br>• AI tracking parameters and punctuation stuck to URLs (A18, B6)<br>• sequence-level email checks, `--type email` only (B6)<br>• extra writing tells (B16)<br>• one em-dash density rule | developer | Small to medium | **High** |
| **P3** | **New marketing skills** | `directory-listing` (B3, without the warm-up, gift cards, badges or figures); `comparison-page` (B4, also for docs-handler); `landing-page-audit` (B5); sign-up nurture rules (A11: exit, re-entry, suppression; a person sends) | marketing drafts, then you approve the skills | Medium | **High** |
| **P4** | **Honest numbers** | Counts and rates come from a script, with the sample size printed, a minimum sample and closed windows only (B1). Later, outcome analysis with 95% Wilson intervals and the source's minimum samples (B14) | developer, plus an update to `early-stage-guardrails` | Small, then medium | High |
| **P5** | **Sales skills** | A `proposal` skill (A10: confirmed prices only, discounts marked needs-approval, method only); objection recovery rate and smokescreen check (B13); ghost versus declined in `stalled-deal` (B21, ideas only) | sales drafts, then you approve | Medium | Medium |
| **P6** | **Better process in existing skills** | • list claims before drafting (A4)<br>• rewrites may cut and sharpen, never add (A5)<br>• evidence records for public social research (A6)<br>• review format with severity and rewrites (A7, evaluator)<br>• sender voice from mail you paste in, names removed (A9)<br>• a "not now" content-gap list (B11)<br>• schema caveat for static fetches (B9)<br>• SEO title, meta and H1 warnings (A17)<br>• a critical-signal override in the lead gate (B12, `leads.mjs`) | the owning specialists; developer for B12 and A17 | Small each | Medium |
| **P7** | **Brand-voice guide** | A real voice guide: spectrum, "we are / we are not", sentences that fit and don't (A2). Written as a proposal in `knowledge/proposals/`, which you confirm | knowledge-base | Small | High |

**Suggested order:** P1 first, as it's safety. Then P2, P3, P5 and P7 can run in parallel, because they touch different files. P4 and P6 follow.

**Not now:**
- **Licence checked, method not opened:** A8 and A12–A16.
- **Low value:** B7, B8, B10, B17–B20 and B22–B26.
- **To test before acting:** hypothesis B15, that loading fewer skills per agent saves plan quota.

**Rejected:**
- Product Hunt warm-up (faked engagement)
- auto-send "AI SDR" skills
- paid connectors and Zapier
- progressive profiling
- any "never refuse" block
- Agents4Marketing

## Assumptions made (the human asked on 2026-11-03 not to be asked at each step; any of these can be reversed)

| # | Question | Assumption used | Why |
|---|---|---|---|
| 1 | Does the never-contact rule on personal addresses cover people who signed up? | Yes, until a person rules. Sign-up nurture emails are drafted but **held**, not sent | The safer reading of `company.md` line 39 |
| 2 | Do sign-up emails count toward the 20-a-day limit? | Yes | The safer reading of `company.md` line 36 |
| 3 | Minimum sample for the objection recovery rate | Below 10 answered objections, counts only; never change an answer on the rate below 15 (the source uses 5) | Our volume is small; the reviewer showed one reply moves a rate of 5 by 20 points |
| 4 | Does a second objection, or a "not now", count as the buyer writing back? | Yes, but neither counts as moved forward; that is reported as its own count | Both are replies; only progress is a recovery |
| 5 | Keep the "For the approver" box in the proposal skill? | Keep | It makes every open approval visible |
| 6 | A single em dash in a short text | Passes (a floor of one), then the rate of about 1 per 1,000 words | Fits the decision; avoids noise on short emails |
| 7 | Put links on their own line in emails (all 4 drafts end a link with a full stop) | Yes; added to the cold-email skill at install | A full stop stuck to a link can break it |
| 8 | Brand-voice hypotheses (open about limits, no exclamation marks, names as the fact sheet spells them) | Stay marked as hypotheses; the guide installs only when a person confirms it | Voice is the founders' call |
| 9 | Point sales, docs-handler and demo-handler at the brand-voice guide | Yes, once a person confirms the guide | They write customer-facing copy too |
| 10 | Order of the two `company.md` proposals | Apply 2026-11-02 company details first, then the brand-voice pointer | The first edits by line number |
| 12 | The P1 test now also rejects a literal empty tools list (`tools: []`) | Accept | An agent with no tools would be a mistake, and none uses that form |
| 13 | P5 drafts run over the review word targets (proposal 426 vs ~390; additions 196 and 169 vs ~170 and 140) | Accept | The extra words are the new safety rules (GST, opt-out Retire, approver box) |
| 14 | Lead gate: a support-only inbox becomes Stop (was Conditional) | Accept | Stricter than the 2026-10-30 rule "never gets a Go"; safe side |
| 15 | Lead gate: a personal (Gmail-type) address forces Stop, including solo founders who publish only one | Accept until a person rules | Matches the never-contact rule in company.md; the same question as sign-ups (row 1) |
| 16 | Sender-voice draft (A9): may a person paste their own cleaned sent emails? | Keep the draft; install it only after a person agrees | It handles personal mail, even redacted |
| 17 | Content-gap log path and trigger | outputs/marketing/content-gaps.md; tell marketing once two or more leads raise a topic | Reasonable default; the source sets neither |
| 18 | Self-review additions cost ~200 words for nine agents | Accept both (claims list before drafting, revisions never add) | Both cut first-round REVISE causes seen today |
| 19 | The 15 lines that end a link with a full stop (13 in 11 emails, 2 in LinkedIn messages) | Fix before any of those emails is sent (a condition on the send approvals) | Can break the link; no send is approved yet |
| 20 | Reply-rate unit | Per contact, window from the first live send (not per email) | Follow-ups go only after no reply, so per-send would count one silence three times |
| 21 | What counts as a reply | Reply, opt-out and complaint count; auto-replies do not; bounced contacts are left out of both sides | An opt-out is an answer; a bounce never reached a person |
| 22 | Segment floors (100 contacted, 20 replies, 30 per cell) | Deferred to a later outcome-analysis skill; every rate now uses one minimum of 10 | Our volume is far below those floors |
| 23 | A stalled deal whose contact has left the company | The new person there is a new contact with their own checks and approvals; the old contact is retired | Reviewer note 3 on P5; nothing carries over to someone who never opted in |
| 24 | Self-review item 19 (revisions never add) | Applies to every deliverable; a revision may add only what is on file or what a REVISE fix asks for (a source line, a date, an [UNCONFIRMED] mark, a detail the person supplied) | Otherwise it blocks normal review fixes |
| 25 | Change to the evaluator instructions (A7 review format) | Accept once rewrites use only confirmed or marked facts and policy flags never replace ESCALATE or auto-fail | Severity never changes a score; the evaluator still approves nothing |
| 26 | Unsourced-quote check: name-beside-the-quote shapes also apply to plain text (--type general) at 6 words; minimums 3 words with a named speaker, 5 with none | Accept | Added no hits on 28 real files; warnings only |
| 27 | Reply-triage content-gap addition (335 words, loaded every run by outreach, sales and both fallbacks) | Trim to about 200 words before install, keeping every rule | It only matters when a real reply arrives |
| 28 | Does a referral count as moved forward? | No; only interested, per the P4 brief | A referral is a reply, not progress with this buyer |
| 29 | Smokescreen share rule | Answers with both early markers yes, out of answers where both are known | Matches the objection draft; immediate_drop is judged later |
| 30 | How counts reach agents that cannot run stats.mjs (researcher, marketing) | The coordinator pastes the script output into their briefs; sales and evaluator run it | No new tools for those agents |
| 31 | A bounced answer to an objection | Held out of both sides of the recovery rate (as built) | Same rule as the reply rate; a bounce never reached the buyer |
| 32 | Smokescreen share scope | Only closed, labelled answers count (as built) | Pending answers may still change |
| 33 | Until T-20261103-11 merges, an opt-out from someone reachable only on LinkedIn or X | Record by published email if there is one; otherwise record by URL anyway and hold or disqualify that lead; never leave an opt-out unrecorded | Hard rule 7: an opt-out is final and suppressed at once |
| 34 | Opt-out matching for import and set-status | Use the same wider domain match as the gate | An opt-out should block more, not less |
| 35 | A profile-URL opt-out | Covers that profile and the pages below it | Fails safe |
| 36 | Suppressing a bare free-mail domain (gmail.com and similar) | Refuse it, as for linkedin.com | It would block every contact on that mail service |
| 37 | An old bare shared-host opt-out (such as linkedin.com) after T-20261103-11 merges | Keeps blocking every lead on that host, and check fails, until a person re-enters it as a profile URL | Fails safe; assumption 33 creates such entries before the merge |
| 38 | Stored form for Threads opt-outs | threads.net (threads.com folds into it) | Older stored entries keep matching |
| 11 | P2 branch sits on P1's first commit | Merge P1 first, then P2, at merge time | The two touch no common file |

## What I need from you

1. **A-20261103-01 (CRM safety):** yes or no to the nine read-only HubSpot tools, and whether to include `tool_guidance`.
2. **Which packages to build:** all of P1–P7, or a subset.
3. **The P2 em-dash rule:** a density warning, or no rule at all.
