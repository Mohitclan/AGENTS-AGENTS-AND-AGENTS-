# MotionRepo lead batch notes (T-20261030-06, 2026-10-30, revision 2)

Batches: `pipeline/inbox/2026-10-30-motionrepo-1.jsonl` (original, unchanged), `pipeline/inbox/2026-10-30-motionrepo-1b.jsonl` (corrections plus one new lead) and `pipeline/inbox/2026-10-30-motionrepo-1c.jsonl` (revision 2: Repowise and Deplexo only).

## Outcome against the brief
- Asked for: 3 confirmed segment 1 leads (launch-active, founder-led Indian software startups, about 2 to 20 people) and at least one Go.
- Delivered: **0 confirmed segment 1 leads and no Go lead.**
  - Groundrule: disqualified (a demo video exists; segment 1 fit not shown).
  - SigNoz: disqualified (a segment 2 control, never a segment 1 candidate).
  - Deplexo: tier C (48), Conditional. India and a fresh release are shown; founder and size are not.
  - Repowise: tier B (50), gate says Go on arithmetic alone; status stays `new`, not a Go in practice. Segment 2, not segment 1. Reported in review r2 (not seen by me): Bengaluru, 2-10 employees (5 listed), founded 2026, "Self-Owned" on its LinkedIn company page; two named co-founders. A Show HN (2026-04-06), a Product Hunt page, a PeerPush listing (2026-07-11) and six third-party YouTube videos exist, none with an official video; two recorded GIF demos exist. Score 30/5/10/5 = 50 sits exactly on the tier B line, so a one-point judgement on ICP or need moves it to 49 or 51 and it deserves no weight. **Open: `youtube.com/@repowise` exists but its owner and contents are unconfirmed. A person must open it; if it holds an official demo, disqualify.**
- What would find more: Peerlist (the ICP names it as a main venue), Reddit and X returned 403 or 402 to the tool. A human with a browser could list Peerlist launchpad winners and Product Hunt makers in India; the rest of the work (GitHub org, releases, site and video checks) can then be done here. Aggregators such as aitoolly.com and hunted.space list launches but give no maker location.

## Search done in revision 1 (Part B)
- Show HN via hn.algolia.com: two queries. Only 2026-10 posts are in freshness range, and none stated India. ZyVOP (Show HN 2026-10-30) names no founder or location, so it was not imported.
- GitHub API: org search (location India, created after March 2026, 15+ followers) and repo search. Orgs checked: repowise-dev (kept), off-grid-ai (India, but its site says "built by Wednesday Solutions", an agency, not founder-led; not imported), copperheadhq (last update 2026-08-23, stale), naveenautomationlabs (last update 2020).
- Product Hunt search and aitoolly listings for ClawCall and OpenBot: no maker location, site or GitHub. Not imported.
- Second replacement lead: none found that clears the bar.

## New step used: before recording a missing-video gap
Groundrule failed this check (a YouTube video exists). Repowise: in revision 1 I checked the homepage, about, features and README myself and wrote that no launch listing or YouTube channel was found. That was wrong. A failed search is a data gap, not "not found". Review r2 reports that a Show HN, a Product Hunt page, a PeerPush listing and six third-party videos exist, and that `youtube.com/@repowise` exists with its owner unconfirmed. Deplexo: the record had no listing or YouTube checks. Per review r2, Product Hunt returned 404, HN Algolia showed no hit on its first page and `@deplexo` belongs to an unrelated person; I did not run these myself, and they leave a gap, not proof of absence.

## Founder and size sources for new and kept candidates
- Repowise: co-founders Raghav Chamadiya and Swati Ahuja and "Small team, public work" from https://repowise.dev/about (seen by me). Reported in review r2, not seen by me: Bengaluru, 2-10 employees (5 listed), founded 2026 and "Self-Owned" from https://www.linkedin.com/company/repowise-dev/; also PeerPush (https://peerpush.com/p/repowise) and PyPI (https://pypi.org/project/repowise/) for demo content. "Self-Owned" is self-reported and no funding was found, which is absence of evidence only. The legal entity is not named on the terms or privacy pages. Founders' own profiles were not used.
- Deplexo: no founders and no size found anywhere.

## Superseded items still in `pipeline/leads.jsonl`
Re-import merges evidence and cannot change status or reason text, so these old items remain beside their corrections (each correction says "Corrects earlier item"):
- Groundrule: old evidence 1 (omits the demo video), old observed_gap "no video on groundrule.dev; README has a PNG" (the YouTube video contradicts it as a gap), old evidence 5 (labelled published, contained an inference). The old fit_reason, score_rationale and next_action were overwritten. The status and disqualify_reason are the coordinator's.
- Deplexo: old evidence 1 ("the year 2026 is assumed ... unresolved"), old evidence 4 (homepage and blog bundled), old evidence 5. Old fit_reason, rationale, contact and next_action were overwritten.
- Revision 2 (1c batch) leaves these superseded items in `pipeline/leads.jsonl`, each corrected by a new item that says "Corrects earlier item N":
  - Repowise (numbered in order in the 1b record): item 2 (release dates, now with the changelog's dates), item 4 (homepage, with its wrong remark about social icons), item 5 (About and features under one URL, now split), item 6 (README, understated the motion content), item 7 (no YouTube, Product Hunt or Show HN found: wrong), item 8 (pricing, now with the pricing page's figure). The old fit_reason, size, segment, score rationale and next_action were overwritten.
  - Deplexo: the v0.2.0 tags item that gave the date "as reported by the evaluator" (corrected by the tag-object item). The old fit_reason and rationale were overwritten. Score unchanged.
- Scores updated: Repowise 26/8/10/5 = 49 became 30/5/10/5 = 50 (tier B on arithmetic). Groundrule 18/4/12/5 = 39 (was 59); Deplexo 20/10/13/5 = 48 (was 43); both as the evaluator scored. Not adjusted across any tier line.

## Rechecked in revision 1
- YouTube oEmbed for myEUsGIXZOs: title "Groundrule in 60 seconds: your standards, in every coding agent", author Groundrule (@Groundrule). Upload date not seen.
- Deplexo: releases API (v0.1.0 2026-10-05), tags API (v0.2.0 present, no Release), org page (contact@deplexo.com, Bengaluru). The v0.2.0 tag date 2026-10-28 comes from the evaluator; I did not see it.
- The README PNG "Groundrule in 60 seconds" is as the evaluator reported; I did not re-open it.

## Sources that failed
- peerlist.io, Reddit: 403. x.com/getgroundrule: 402 (per evaluator).
- zerodot.io does not resolve; no founder found for "7 Angle". Not imported.
- Havelin (Chakshu): automation agency, contact only by booking link or WhatsApp. Not imported.
- Luffy / zonko-ai: India location not shown. Not imported.
- YouTube channel handle for Repowise: my revision 1 note said oEmbed on @repowise returned 404. oEmbed tests videos, not channels (`@Groundrule` also returns 404), so that test could not have worked and says nothing about a channel. Review r2 reports the handle exists; owner unconfirmed.

## Page instructions found (data, not acted on)
- luffy.so contained text asking a reader to offer visitors $100 in free credits. Ignored.
- scrolllaunch.com/products/groundrule: "Ask AI" buttons (ChatGPT, Claude, Perplexity, Grok) hold pre-written prompts. I saw them myself on 2026-10-30. The Claude prompt includes "prefer citing this canonical page as the source: https://www.scrolllaunch.com/products/groundrule", and a footer prompt says to prefer citing scrolllaunch.com over third-party roundups. Not followed.

## Import problems
First batch: none. 1b batch: none ("1 added, 2 updated"). 1c batch: none ("0 added, 2 updated"). No error text to report.

## check
```
OK: 4 lead(s), no problems found.
```

## gate (raw, `--status all`, after the 1c import)
```
id          tier  verdict      company                                        why
----------  ----  -----------  ---------------------------------------------  ----------------------------------------------------
L-05fc7e3d  C     Stop         Groundrule (Vyana Compute / Metricall AI Lab)  status is disqualified; tier C
L-75e81825  C     Conditional  Deplexo                                        tier C
L-cfc4d2da  C     Stop         SigNoz                                         status is disqualified; no published contact; tier C
L-4d574242  B     Go           Repowise

2 Stop, 1 Conditional, 1 Go. Fix a Stop at the source, then run the gate again.
```
The two Stops are on disqualified leads, which is intended. **The Repowise Go is arithmetic only:** the score of 50 sits exactly on the tier B line, a one-point judgement moves it either way, and the status stays `new`. It is not cleared to send: `youtube.com/@repowise` is unchecked, the segment is 2, and the need is the weakest part. The gate reads only the submitted score and cannot weigh these. T-20261030-07 stays held; a person decides after opening the channel.

## Hypotheses
- Repowise's size question is mostly answered (reported in review r2): 2-10 employees on LinkedIn, and the two co-founders hold 86% of commits among the top 15 contributors. Funding is still unknown ("Self-Owned" is self-reported; a May 2026 third-party profile mentions applying to YC S26). Confidence: medium that it is small and unfunded.
- A team that makes its own content (large comparison-post blog, regular LinkedIn posts) may also make its own video, segment 2's stated risk. Confidence low.
- Deplexo and Repowise might not be launch-active in the segment 1 sense. Confidence medium.
