# Blockers

Diagnosis of 2 November 2026, on branch `reply-handling`. Health checks: leads OK (8), memory OK, fallbacks OK (10), knowledge 3 confirmed with 4 proposals pending, tests 252/252. Tick items off as they're done.

## People need to provide or decide

### To run at all
- [ ] **A Claude login the agents can use.** On suryanshu@panscience.ai, headless Claude Code (`claude -p`, which Jarvis, `/do` and the team page's task box use) returns 403 `oauth_not_allowed_for_organization`. Either a panscience.ai admin enables Claude Code on the subscription for the organization, or the team runs on a machine signed in to a Max plan that allows it. The plan's weekly window was at 92% at the last reading; it resets Tuesday 3 Nov, 18:30 IST.
- [ ] **The Gmail app password, on the sending machine only.** Set `SMTP_PASS` in that terminal or in `.env`. Never paste it into chat or a committed file. Both sending and the reply check need it; the same password opens IMAP.
- [x] **Who gets the send reports:** Sushant, during the pilot, until suryanshu changes it (decided 2 Nov; `ops/mail-config.json` `report_to`). Emails are sent from Sushant's Gmail.
- [ ] **Confirm the company details.** Apply `knowledge/proposals/2026-11-02-company-details-filled.md` (and the 1 Nov one) to `knowledge/company.md`, then `node scripts/kb.mjs confirm knowledge/company.md`.

### Before the first real sends
- [ ] **Read and decide the 12 pending sends** in `ops/approvals.md`: Pippin ×3, Graphite ×3, Deplexo ×4, plus 2 Deplexo LinkedIn messages that have no recipient and can't go.
- [ ] **Check the live wording** of https://motionrepo.panscience.ai and `/security` (condition B in approvals).
- [ ] **Say where A-20261030-01 came from.** The battlecard approval changed to "Yes" in Sushant's commit `1a27220` with no note.
- [ ] **Decisions still open:** D12 (loosened launch, video and GitHub tests), D13 (Repowise as a competitor), whether "never contact competitors" covers a maker's other product (Cool Analytics), and whether SpaceWise may be contacted on X.
- [ ] **Apply the other proposals** (solo founders, one-run positioning) and confirm the product and competitor files again.
- [ ] **Answer the 9 Jarvis tasks marked "needs you"** (`node scripts/jarvis.mjs list`); each report ends with its questions.

### Team and repo
- [ ] **The other developer pushes their work:** branches `agent/T-20261102-02`, `-03` and `-04`, and the loose files listed in their progress PDF. Their queue's J-20261102-02 clashes with another task of the same ID.
- [ ] **Merge `reply-handling`** (this work) through a PR.
- [ ] **Decide whether `node_modules/` stays committed.** It is now, and the new IMAP library adds about 8 packages.
- [ ] **Windows checkout:** after `.gitattributes` lands, Sushant runs `git rm --cached -r . && git reset --hard` once (or re-clones) so files come back with LF endings.
- [ ] **The other 4–5 products:** name, website and repo for each.
- [ ] **Putting the team page online:** the server owner's OK, a DNS record for `team.panscience.ai`, and which Claude plan the server uses.
- [ ] **Before real volume:** a dedicated sending domain with SPF, DKIM and DMARC, and 2–4 weeks of warm-up. A handful of first sends from Gmail is fine.

## System gaps, fixed on `reply-handling`

| Gap | Fix |
|---|---|
| An agent could write its own Yes into `ops/approvals.md` and run a live send | The guard hook asks a person before any `send-email.mjs` run that isn't `--dry-run`, and before any edit that turns a row into Yes or Approved |
| Nothing read replies; follow-ups would go to people who answered or opted out | `scripts/replies.mjs check` (and `watch --every 15`): opt-outs suppressed, `contacted` → `replied`, bounces flagged, follow-ups refused per company |
| A lead stayed `drafted` after a live send, so replies couldn't move it | `send-email.mjs` marks the lead `contacted` after an approved live send |
| Scripts silently did nothing when the folder was reached through a symlink (macOS `/var` → `/private/var`); this is why two dashboard tests failed on this Mac | Shared `isMain()` compares real paths; used by dashboard, send-email, replies and fallbacks |
| CRLF checkouts on Windows broke two tests | `.gitattributes` keeps LF everywhere |
| The send and reply logs could be edited by agents | The guard blocks both |
| Pilot rule "test sends to Sushant only" was instructions alone | `pilot.allow_only` in `ops/mail-config.json`: `send-email.mjs` refuses every other recipient; the hook asks before anyone edits that file |
| First reviews mostly came back REVISE for the same reasons | New `self-review` skill for every specialist (checks drawn from 12 first-round reviews), `task-briefs` for the coordinator; the evaluator checks the self-review and the `Claims used` table |
| The live send path had no automated test | `scripts/tests/send-flow.test.mjs`: approved send through a local SMTP sink, report, `contacted`, reply, follow-up refused |

## System gaps still open (next to build)

1. ~~Show sends and replies on the team page.~~ Done in mission control (`scripts/control.mjs`): sends, replies, reviews, copy checks, backups and every agent step, live. Hosting it needs the same items as the team page above.
2. Run the reply check automatically inside an autopilot loop (phase J4), and queue a sales task for each new reply.
3. Hindi opt-out phrases.
4. A scorecard of fixed test tasks to measure agent quality (first-pass PASS rate, revisions, quota).
5. Data-collection scripts that need no model calls (website, job boards, GitHub), so lead research needs fewer agent calls.
