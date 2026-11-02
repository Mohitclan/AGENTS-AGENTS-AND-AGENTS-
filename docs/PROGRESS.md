# Project progress

Last updated: 2 November 2026. This is a snapshot. The full plan is in [PLAN.md](PLAN.md), and the running log and decisions are in [ROADMAP.md](ROADMAP.md).

## Where it stands

The AI sales team works end to end on the Claude Max plan with no extra cost. You give it a task on a local web page, a team of agents does the work, and a report comes back.

It has checked real candidates for MotionRepo and drafted emails, but **no email has been sent, so there are no replies, customers or revenue yet**. The page isn't online yet either.

| Measure | Now |
|---|---|
| Agents | 21: 11 main and 10 backups |
| Skills | 18 |
| Automated tests | 209, all passing |
| Products added | 1 of 5–6 (MotionRepo) |
| Jarvis tasks run | 11: 2 done and 9 waiting on a person |
| Leads | 8: 3 drafted, 1 qualified, 1 on hold, 3 ruled out |
| Email sequences that passed review | 3: Pippin 87/100, Graphite 87/100, Deplexo 83/100 |
| Leads contacted | 0 |
| Approvals waiting | 14: 12 sends and 2 other decisions |

## Phases

| Phase | Status |
|---|---|
| A1: Built | ✅ Done |
| A1+: Memory, skills, fallbacks | ✅ Done |
| J1: Jarvis core | ✅ Done |
| J3: Skill library and checks | ✅ Done |
| A2: Add products | 🟡 In progress: MotionRepo confirmed, 4–5 products to go |
| H: Hardening | 🟡 Build done, waiting on people |
| A3: First sprint | 🟡 Waiting on people: drafts passed, nothing sent |
| J2: Learning organisation | Not started |
| J4: Autopilot | Not started |
| A4: All products | Not started |
| J5: More departments | When wanted |
| B: Product signals | Only if needed |
| C: Always-on system | Only if needed |

## Added on 2 November

- **Team page:** `node scripts/dashboard.mjs` opens http://127.0.0.1:4317. You can give a task, watch its steps, read the report and cancel waiting tasks. It also shows the leads, the team and pending approvals. Approvals are still decided in chat.
- **Real test:** task J-20261102-01 ran from the page's task box through to its report.
- **Sign-in:** a password that's required before the page can run on a public address.
- **Deployment steps:** [DEPLOY-team-page.md](DEPLOY-team-page.md).
- **Merged:** PRs #6, #7 and #8, and Collateral-Pipeline PR #43.

## What's blocking progress

**First sends**
- Fill in the sender name, role, company name and email.
- Name the approvers and the never-contact list.
- Read the drafts and approve or decline the 12 sends. Two of them are Deplexo LinkedIn messages with no recipient yet, so they can't go out as they stand.
- Open https://motionrepo.panscience.ai and /security in a browser and check the page text. Both load, but nobody has confirmed the deployed wording.

**Decisions**
- Keep or reverse Claude's two calls: D12 (loosened launch, video and GitHub tests) and D13 (Repowise treated as a competitor).
- Does "never contact competitors" cover a maker's other product? This decides Cool Analytics.
- May SpaceWise get a draft by X? It has no other contact.
- Approve the MotionRepo battlecard answers (A-20261030-01).
- Apply the three proposals in `knowledge/proposals/` and confirm the files again: company details, solo founders and one-run positioning.

**MotionRepo site**
- Confirm PRs #42 and #43 are deployed.
- Check whether the billing Hub adds GST.

**Going online**
- Get the server owner's OK, because the server is shared with MotionRepo production.
- Decide which Claude plan the team uses online. The server's login also runs customer videos.
- Add the DNS record for `team.panscience.ai`.
- Run the deployment steps. The address doesn't resolve yet.

**Other products**
- List the name, website and repo for each of the other 4–5 products.

## Plan usage

At the last reading on 2 November, the 5-hour window was at 88% and the weekly window at 90%. No new task starts at 85% or more, so tasks can't run until the weekly window resets on Tuesday at 18:30.

## Next steps, in order

1. Give the demo. MotionRepo and the team page both work today.
2. Fill in the sender details, approve the first sends, and send them by hand.
3. Track replies for 14 days. The goal is at least 1 reply if up to 7 leads are contacted, or 2 if 8–15 are.
4. Add the remaining products.
5. Put the team page online.
6. Start J2 and J4 once real replies show what the team should learn from.
