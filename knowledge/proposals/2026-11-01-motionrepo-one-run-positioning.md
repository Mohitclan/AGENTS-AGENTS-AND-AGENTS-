---
status: proposed
task: T-20261101-02
jarvis: J-20261101-01
product: motionrepo
date: 2026-11-01
targets:
  - knowledge/products/motionrepo.md
  - knowledge/competitors/motionrepo.md
---

# Proposal: replace "documents and video from one run" with what the code supports

Both target files are `status: confirmed` in their frontmatter (`knowledge/products/motionrepo.md:2`, `knowledge/competitors/motionrepo.md:2`), so this is an edit to human-approved knowledge, not a draft being promoted. The body text of both still says proposed in places: product line 20 ("All of this file is `proposed`"), and competitor line 17 (which says proposed) and line 19 ("Not yet confirmed by a human"). That stale body text is not part of this proposal. The human applies these changes by editing the two files, then re-confirming them with `node scripts/kb.mjs confirm <file>`.

## Summary

The code does not support "documents and video from one run". The two PDFs are made by one documents run. The video is a separate job on a separate queue, started by a separate request, charged separately, and never started by adding a repository, a repository sync, a push or the Regenerate button. What the code does support is that one product makes both from the same repository. Regeneration on push covers the documents only; a video is not re-made on push.

The replacement drops "one run", says "one repository" instead, and in the passages that tie regeneration to both outputs, limits regeneration to the documents. That second change is not the "one run" idea itself. It comes from the same joined claim, so each passage below marks it separately and the human can leave it out. If it is left out, the passage still says MotionRepo regenerates video, which the code does not do on push.

## Changes

Each row quotes the current text exactly. Words that change are in **bold** in the proposed text. Rows 1 and 4 hold only the "one repository" change. Rows 2, 3 and 5 give two proposed versions: both changes, and "one repository" only, so the human can take the first change alone.

### 1. knowledge/products/motionrepo.md, section "Competitors", line 144 (RepoClip bullet)

- **Current:** `We win (hypothesis, medium) on sales and technical PDFs plus video from one run, an INR price with a GST invoice, and 1080p without a watermark on the first paid plan.`
- **Proposed:** `We win (hypothesis, medium) on sales and technical PDFs plus video from **one repository**, an INR price with a GST invoice, and 1080p without a watermark on the first paid plan.`
- **Why:** "from one run" implies a single run makes both. Evidence 1 to 4 show it does not. "From one repository" is what the code shows (evidence 5). Everything else in the sentence is unchanged, including the "GST invoice" wording. The label stays "(hypothesis, medium)": the win is still a comparison with a competitor's pages, which this evidence does not change.

### 2. knowledge/products/motionrepo.md, section "Competitors", line 152 (positioning gap)

- **Current:** `Positioning gap (hypothesis, medium): "documents and video from one run of the same code, with regeneration built in", plus a rupee price with a GST invoice. Weak spots to prepare for: GitHub-only sign-in, no card payment, no SOC 2, no proof points. [knowledge/competitors/motionrepo.md, Gaps and openings]`
- **Proposed (both changes):** `Positioning gap (hypothesis, medium): "documents and video from **one repository**, with regeneration **of the documents** built in", plus a rupee price with a GST invoice. Weak spots to prepare for: GitHub-only sign-in, no card payment, no SOC 2, no proof points. [knowledge/competitors/motionrepo.md, Gaps and openings]`
- **Proposed ("one repository" only, scoping left out):** `Positioning gap (hypothesis, medium): "documents and video from **one repository**, with regeneration built in", plus a rupee price with a GST invoice. Weak spots to prepare for: GitHub-only sign-in, no card payment, no SOC 2, no proof points. [knowledge/competitors/motionrepo.md, Gaps and openings]` This version still reads as if video regenerates; see the first open question.
- **Why:** "one run of the same code" is replaced by "one repository". "One run" is removed (evidence 1 to 4). "Of the same code" is removed too, because it reads as one snapshot of the code, and evidence 4 shows no code ties the two outputs to one commit and that they can differ by design (user-chosen branch, revisions on the older commit). "One repository" is what the code supports (evidence 5). "Of the documents" is the separate regeneration scoping (evidence 6): push and Regenerate re-make PDFs only. Without it the sentence says video regenerates, which the code does not do. Label unchanged.

### 3. knowledge/competitors/motionrepo.md, section RepoClip, "Where MotionRepo wins", line 49

- **Current:** `- **Where MotionRepo wins (hypothesis, medium):** sales and technical PDFs plus video from one run, with regeneration built into the product (RepoClip can also remake video on release, but through its API or GitHub Action that the user sets up in CI); INR price with a GST invoice for Indian buyers; 1080p without a watermark on its first paid plan [UNCONFIRMED].`
- **Proposed (both changes):** `- **Where MotionRepo wins (hypothesis, medium):** sales and technical PDFs plus video from **one repository**, with regeneration **of the PDFs** built into the product (**RepoClip can remake video on release, through its API or GitHub Action that the user sets up in CI; MotionRepo does not remake video on push**); INR price with a GST invoice for Indian buyers; 1080p without a watermark on its first paid plan [UNCONFIRMED].`
- **Proposed ("one repository" only, scoping left out):** `- **Where MotionRepo wins (hypothesis, medium):** sales and technical PDFs plus video from **one repository**, with regeneration built into the product (RepoClip can also remake video on release, but through its API or GitHub Action that the user sets up in CI); INR price with a GST invoice for Indian buyers; 1080p without a watermark on its first paid plan [UNCONFIRMED].` In this version the parenthetical is unchanged and still implies MotionRepo remakes video too ("also ... but"). Only the human's choice on the first open question removes that.
- **Why:** same as rows 1 and 2. Rewording the parenthetical is part of the scoping change, not the "one run" change. In the earlier draft the parenthetical was kept as it was, and "also ... but" only works if MotionRepo remakes video too, so the scoped sentence still implied that. The new parenthetical states both sides: RepoClip can remake video on release (competitor file line 50 and its FAQ, unchanged), and MotionRepo does not remake video on push (evidence 6). Labels "(hypothesis, medium)" and "[UNCONFIRMED]" unchanged.

### 4. knowledge/competitors/motionrepo.md, section "Gaps and openings", line 98 (item 1)

- **Current:** `1. No competitor page I read pairs launch video with sales and technical PDFs from one repository run. (medium; I read vendor pages only)`
- **Proposed:** `1. No competitor page I read pairs launch video with sales and technical PDFs **for one repository**. (medium; I read vendor pages only)`
- **Why:** "repository run" has the same "one run" idea. This is a finding about competitors' pages, so the evidence here is about what MotionRepo offers, not about what competitors lack. Label "(medium; I read vendor pages only)" unchanged. This line was not in the brief's list; the grep found it.

### 5. knowledge/competitors/motionrepo.md, section "Gaps and openings", line 101 (item 4)

- **Current:** `4. "Documents plus video from one run, with regeneration built into the product" is the differentiator. "Video on every release" alone is not: RepoClip offers it via its GitHub Action. (medium)`
- **Proposed (both changes):** `4. "Documents plus video from **one repository**, with regeneration **of the documents** built into the product" is the differentiator. "Video on every release" alone is not: RepoClip offers it via its GitHub Action. (medium)`
- **Proposed ("one repository" only, scoping left out):** `4. "Documents plus video from **one repository**, with regeneration built into the product" is the differentiator. "Video on every release" alone is not: RepoClip offers it via its GitHub Action. (medium)`
- **Why:** same as rows 1 and 2. The second sentence is unchanged and now matters more: MotionRepo has no video-on-every-release feature, so it must not compete on that. Label "(medium)" unchanged.

## What holds and what does not

| Claim | Verdict | Basis |
|---|---|---|
| Sales PDF and technical PDF come from one run | Holds | Evidence 1 |
| Documents and video come from one run | Not supported | Evidence 2 to 4 |
| Documents and video start from one action or one repository sync | Not supported | Evidence 3 |
| Documents and video share a commit | No code ties them. Not claimed | Evidence 4 |
| Both are made from the same repository, in one product, on one plan | Supported by code | Evidence 5 |
| Regeneration on push is built in | Holds for documents only | Evidence 6 |
| Video is regenerated on push | Not supported. A video is made again only when the user asks | Evidence 6 |

The battlecard's "two PDFs from the same run" (`outputs/sales/2026-10-30-motionrepo-battlecard.md:14`) is correct on this evidence. It names only the two PDFs, and evidence 1 supports that.

## Evidence

All paths are under `repos/motionrepo/`, read on 2026-11-01. Static reading only; I did not run the product.

1. **The two PDFs come from one documents run.**
   - One queue job runs one orchestrator call: `src/workers/repositoryWorker.ts:12-18, 46-54`.
   - The pipeline is wired as four stages, knowledge, content, presentation and collateral sync: `src/pipeline/PipelineFactory.ts:97-116`.
   - The content stage writes the documents, including the sales and technical ones: `docs/architecture.md:139-145`.
   - They are priced as one charge: `src/billing/plans.ts:100-101` (comment "Sales + technical PDFs: one documents run", 1 credit) and `frontend/content/pricing.ts:76`.
2. **The video is a separate pipeline.**
   - `docs/architecture.md:156-158` says "A separate pipeline, wired in `WalkthroughFactory`".
   - Teasers and motion walkthroughs have their own queue (`walkthrough-teaser`): `src/queue/teaserQueue.ts:5, 18-33`; `docs/architecture.md:224-231`.
   - The documents pipeline has no video stage: `src/pipeline/PipelineFactory.ts:97-116`. Searching `src/pipeline/` and `src/workers/repositoryWorker.ts` for teaser, walkthrough and video finds nothing but one comment (`src/pipeline/failureReason.ts:43`).
3. **No single user action or sync starts both.**
   - **Add repository:** adding a repository charges `CREDITS.docs` (1 credit) and calls `importRepository`, which adds a job to `repositoryQueue` only; a repository already added costs nothing: `src/api/index.ts:505-508`; `src/git/repositoryImportService.ts:137-148`. No video is queued.
   - **Frontend:** the dashboard has no single control that starts both. `useRegenerate` calls `api.regenerate` (`POST /repositories/:name/regenerate`) and is used by the collateral page, the repositories list and the repository page; `useGenerateTeaser` calls `api.generateTeaser` (`POST /repositories/:name/teasers`) and is used only in `frontend/components/teaser-panel.tsx`, which does not use `useRegenerate`: `frontend/lib/queries.ts:250-253, 398-417`; `frontend/lib/api.ts:154, 215-230`. I did not trace every other component that might call the API directly.
   - **Regenerate button:** `POST /repositories/:name/regenerate` charges `CREDITS.docs` and calls `enqueueRegenerate`, which adds a job to `repositoryQueue` only: `src/api/index.ts:557-567`; `src/api/regenerate.ts:16-34`.
   - **GitHub push:** the webhook adds a job to `repositoryQueue` only: `src/webhook/WebhookController.ts:91-116`.
   - **Bootstrap or scan:** the scan calls `enqueueRepository` only, and for a user's repository it queues nothing: `src/bootstrap/bootstrapEngine.ts:223-234, 250-257`.
   - **Video:** a separate route, `POST /repositories/:name/teasers`, charges the video's own credits (teaser 2, walkthrough 3 to 6) and calls `queueTeaser`: `src/api/index.ts:705-716`; `src/billing/plans.ts:99-127`. The only callers of `enqueueTeaser` and `enqueueWalkthrough` are in `src/api/teaser.ts`, `src/api/walkthrough.ts` (reached from `src/api/index.ts:601-608`, 715) and the walkthrough worker's self-heal requeue (`src/workers/walkthroughWorker.ts:153-161`). I found no call from the documents path.
   - The site agrees: `frontend/content/site.ts:181` ("Videos and PDFs are kept separately"). That line answers a question about changing the user's code, so it is supporting only, not the basis.
4. **No shared commit or input is established.**
   - A documents job syncs the clone and passes the synced commit to the orchestrator: `src/workers/repositoryWorker.ts:37-50`.
   - A video job prepares its own worktree for the requested branch, optionally pinned to a commit for a revision or continuation, and records its own HEAD: `src/walkthrough/teaser/TeaserOrchestrator.ts:264-279`; `src/api/teaser.ts:365`.
   - The video's branch is chosen by the user in the request and is optional (`src/api/teaser.ts:365`), while a documents job uses the repository's default branch or a push to main (`src/git/repositoryImportService.ts:126, 141`; a push counts only for the main branch, `src/webhook/WebhookController.ts:88-94`).
   - A video revision or continuation deliberately runs against the older commit the video was written for, falling back to the branch only if that commit is gone: `src/walkthrough/teaser/TeaserOrchestrator.ts:269-278`. So the two outputs can differ in code version by design.
   - I found no code that makes the two use the same commit. I did not trace how `prepareWorktree` picks the branch tip, so whether they coincide in practice is unknown.
5. **Both are made from the same repository, in one product and one plan.**
   - Both are routes under `/repositories/:name` and read the same installed repository: `src/api/index.ts:557, 705`.
   - One plan lists PDFs, a teaser and a walkthrough together: `frontend/content/pricing.ts:38-39, 46`.
   - The site says "Connect GitHub, pick a repository and get a launch teaser, a feature walkthrough and sales and technical PDFs, all made from the code itself": `frontend/content/site.ts:26`.
6. **Regeneration on push covers documents only.**
   - The push path charges `CREDITS.docs` and queues `repositoryQueue`: `src/webhook/WebhookController.ts:91-105`.
   - The site says "the documents are written again" (`frontend/content/site.ts:252`) and "PDFs made again on a push to main, if you turn it on" (`site.ts:291`; `frontend/content/pricing.ts:52`).
   - The fact sheet says documents at `knowledge/products/motionrepo.md:84`, but line 37 of the same file says "videos and PDFs"; see the conflict in Notes.
   - A video is re-made only by a new request, or changed by a written-note revision: `src/api/index.ts:705-718`; `docs/architecture.md:464-478`.

## Why it matters

- "From one run" was the stated differentiator in the fact sheet, the competitor file, the market brief and a pending launch-plan suggestion. It is a labelled hypothesis in a confirmed file, and the product's own architecture doc contradicts it.
- In review T-20261030-07 the same claim in outreach drafts was an auto-fail (`outputs/reviews/T-20261030-07-r1.md:18`, 77-82). The team's lessons say a clean copy check does not clear a false claim, so the source files need fixing before more copy is built on them.
- The stronger claim is not true, but a weaker one is: one product makes the PDFs and the video from the same repository, and keeps the PDFs current on push when the user turns that on. The proposal keeps that as the differentiator rather than dropping it.
- A buyer who reads "regeneration built in" next to "video" would expect a new video whenever the code changes. The code does not do that. RepoClip's GitHub Action can, for example on every release (its FAQ gives "on every release" as an example and does not mention push; https://repoclip.io, read 2026-11-01). Saying so now avoids a false promise in sales and a lost comparison on the first question.

## Notes (not proposed as changes)

- **"GST invoice"** wording in rows 1 to 3 is left exactly as is. It is a separate open item on the board.
- **Other stale or overstated text found, not changed:**
  - `knowledge/products/motionrepo.md:148` ("video that comes from the code and updates with it") and `knowledge/competitors/motionrepo.md:85` ("updates with it") imply the video updates with the code. Per evidence 6, documents regenerate on push and a video is re-made on request. Needs its own proposal.
  - `knowledge/competitors/motionrepo.md:95` ("regeneration on code change") is about Canva and freelancers. It has the same scope issue for video.
  - `docs/architecture.md:143` lists three documents (User Guide, Technical, Sales), while the site and the fact sheet say two PDFs. This is already Conflict 5 in the fact sheet (`knowledge/products/motionrepo.md:175`). Row-level wording above says "sales and technical PDFs", which is unaffected.
- **Softer passages carrying the same idea, not changed (each needs its own proposal):**

  | Passage | Wording | Why it matters |
  |---|---|---|
  | `knowledge/products/motionrepo.md:144` (last sentence), `knowledge/competitors/motionrepo.md:50` | "Video on every release" is not unique to us | Implies MotionRepo has it. Product line 144's last sentence is in the same bullet row 1 edits. Row 4's reasoning (MotionRepo has no such feature) conflicts with these. |
  | `knowledge/competitors/motionrepo.md:101` (second sentence) | "Video on every release" alone is not | Softer form of the same, in row 5. |
  | `knowledge/products/motionrepo.md:150` | "speed and regeneration" | Twin of competitor line 95, listed above. |
  | `knowledge/products/motionrepo.md:149`, `knowledge/competitors/motionrepo.md:90` | "bundled with a sales PDF and video"; "comes with a sales PDF and video" | Soft forms of the "one run" idea. PDFs and video are charged separately (evidence 3). |
  | `knowledge/competitors/motionrepo.md:80` | "sales and technical documents come with it" | Same, weaker; reads as one output. |

- **Conflict inside the product sheet, not resolved here:** `knowledge/products/motionrepo.md:37` says "the site says videos and PDFs are updated when the code changes". Line 84 of the same file says documents are made again on a push to main, citing `plans.ts:33-36` and `site.ts:487`. The site sources I opened say documents only: `frontend/content/site.ts:252` ("the documents are written again"), `:291` ("PDFs made again on a push to main, if you turn it on"), `:414`, and the live home page's "Rewritten when the code changes" under Documents (https://motionrepo.panscience.ai, read 2026-11-01 by the reviewer). I found no sentence on the site that says this of video. Both sources are recorded; I have not chosen between them. Which one the fact sheet should keep is a question for the human (see below).
- **Occurrence search:** the only other literal form of "one run" is competitor line 98 (row 4). Lines 42, 103 and 174 of the product sheet carry no "one run" idea (they cover the first segment, pricing, and trial approval). The softer forms are listed above. The brief's lines 144, 152, 49 and 101 are correct.

## Knock-on (read-only; each needs its own change)

Searched the repository outside `repos/` for "one run", "same run", "from one", "same code", "documents plus video", "from one repository" and related forms. For the softer passages in the Notes I also searched `knowledge/` for "video on every release", "updates with", "updated when the code", "bundled with", "comes with a sales", "come with it", "speed and regeneration" and "regeneration on code change". The softer-form search covered `knowledge/` only, not `outputs/`.

| File and line | Wording | What follows from this proposal |
|---|---|---|
| `outputs/research/2026-10-30-motionrepo-market-brief.md:48` | "documents and video from one run, with regeneration on push built into the product (opt-in on Starter and Pro)" | Same two fixes: "one run" out, and regeneration on push scoped to the documents. |
| `outputs/research/2026-10-30-motionrepo-market-brief.md:80` (H3) | "Documents plus video from one run, with regeneration built into the product, is the differentiator against RepoClip" | Same. The reason column compares regeneration with RepoClip's video regeneration, so the narrower scope changes the argument. |
| `outputs/research/2026-10-30-motionrepo-market-brief.md:105` | "documents and video from one run of the same code, with regeneration built in" | Same as row 2. |
| `outputs/sales/2026-10-30-motionrepo-battlecard.md:14` | "a sales PDF and a technical PDF from the same run" | No change needed: it names only the two PDFs (evidence 1). Line 15 on RepoClip's GitHub Action is consistent. |
| `outputs/outreach/L-75e81825.md` lines 82, 86, 143 and `outputs/outreach/L-4d574242.md` lines 78, 82, 122 | Subject "What MotionRepo makes from one repository"; "come together for 1 credit" (two PDFs); "makes a motion walkthrough video plus sales and technical PDFs from a GitHub repository" | None use "one run" or "same run" (searched). "One repository" and "together for 1 credit" are supported (evidence 5 and 1). No change needed on this point. |
| `ops/board.md:34` (marketing suggestion) | "Peerlist + Product Hunt launch plan around 'documents plus video from one run'" | Should not be built on "one run". The supportable angle is one product making PDFs and video from the same repository, with the PDFs regenerating on push. Marketing should not promise video on every push. Also `ops/board.md:7` and `:19` describe this task and need no content change. |
| `knowledge/products/motionrepo.md:148`, `knowledge/competitors/motionrepo.md:85` | "updates with it" | See Notes: a separate proposal. |
| `outputs/reports/J-20261030-04.md:14, 147`; `outputs/reviews/T-20261030-*` | History of the earlier finding | Records; no edit. |

## Open questions for the human

- Is it acceptable to keep the "regeneration of the documents" scoping in rows 2, 3 and 5, or do you want it handled in a separate proposal? Applying only the "one repository" edits leaves the sentence implying video regenerates.
- Should the team test whether a video and the PDFs made one after the other reflect the same commit? Evidence 4 shows no mechanism, and I have not run it. Until then, no copy should say "same commit".
- What should happen to "video on every release is not unique to us" (product line 144, competitor lines 50 and 101)? It implies MotionRepo has that feature. Options: keep it as a statement about RepoClip only, reword it, or drop it. Needs its own proposal.
- Product line 37 says the site states that videos and PDFs are updated when the code changes; the site sources I opened say documents only. Which should the fact sheet keep, or should line 37 be reworded to match line 84? I did not choose.
- Is "from the same repository" the wording marketing should use for the launch plan, or is there a different differentiator you want to test?
