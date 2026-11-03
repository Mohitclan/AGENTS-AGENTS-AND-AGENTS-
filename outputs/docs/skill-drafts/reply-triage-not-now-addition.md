# Draft addition to `.claude/skills/reply-triage/SKILL.md`: a content-gap list

Task T-20261103-09b, package P6, survey part B item 11. A draft: nothing here has been installed.

## What changes

Today a "Not now" reply gets a follow-up date and nothing else. A reply can also ask for something we have no page, guide or proof for. This section turns those replies into a short list of content topics, ranked by how many leads are waiting on each, so the marketing calendar can use it.

It only logs. It sends nothing and starts no campaign.

## Where it goes

### Edit 1: the "Not now" row

The table row currently reads:

```
| Not now | "Try next quarter" | Set a follow-up date, with no pitch |
```

Change its last cell to:

```
| Not now | "Try next quarter" | Set a follow-up date, with no pitch. If they gave a reason we have no content for, log it (see Content gaps) |
```

### Edit 2: a new section

Insert it between the table and `## Rules`. The last table row reads:

```
| Needs a person | Legal, security, custom terms, anything unclear | Hold. Write what they asked and why you stopped |
```

## Text to insert

---

## Content gaps

A "not now" that names a reason, or a question we have no content for, is a gap. Log it for marketing. The row is a note, not the reply's action: the reply still gets one category and one action (rule 1).

1. **Which replies.** "Not now", or a request we have no content for. Never log an opt-out, complaint, bounce, auto-reply or suppressed contact.
2. **Look first** in `outputs/docs/`, `outputs/marketing/` and `knowledge/products/<slug>.md`. `sales` may also fetch the public site; without a web tool, write "site not checked". If something answers it, point to it in your draft and log nothing.
3. **One row per reply** in `outputs/marketing/content-gaps.md`: date, lead ID, category, the topic in a few words of your own, what we have today. Create the file with Write; after that append with Bash (`cat >> outputs/marketing/content-gaps.md <<'EOF'`, the row, `EOF`) and never rewrite it. No names, email addresses or pasted reply text.
4. **Rank by lead count**, listing the lead IDs per topic and the count with its total ("2 of 9 logged replies"), never a bare percentage.
5. **Hand it on.** When a topic has two or more leads, say so in your RESULT.
6. **A gap never restarts contact.** "Not now" still means a follow-up date and no pitch; a person decides whether to write once content exists.

---

## Who loads it, and the cost

`reply-triage` is preloaded by `outreach` and `sales` (and their fallbacks). Checked in `.claude/agents/*.md` on 2026-11-03: none of the four has Edit; all four have Write and Bash. Only `sales` and `sales-fallback` have WebFetch, and `outreach` and `outreach-fallback` do not. So the steps above use Write to create the file, a Bash append (a quoted heredoc) to add rows, and a plain note for what was not checked. `marketing` doesn't load this skill; it reads `outputs/marketing/content-gaps.md` when the coordinator hands it a topic. The section adds about 225 words (counted with the heading and numbers), plus 8 in the table row. It was cut from about 335 at the coordinator's decision: four agents load it on every run, but it only matters when a real reply arrives. No rule was dropped. The cuts were the restated approval and no-campaign sentences, the line about the package P4 script, and the tool explanation in item 2, which now sits in this note.

## Things to decide

- **File location.** `outputs/marketing/content-gaps.md`, since marketing owns the content calendar. This is shortlist assumption 17 (`outputs/reports/2026-11-03-gtm-adoption-shortlist.md`), accepted as the default. A different path is fine; change it in item 3.
- **Threshold.** The source has no minimum number of leads before a topic is passed on. "Two or more" in item 5 is also in assumption 17. It is our starting rule, not the source's, and a person can change it.

## Sources

Adapted from the content-gap report in `outbound-nurture-engine`:

https://github.com/LaGrowthMachine/gtm-system/blob/main/skills/catch-opportunities/outbound-nurture-engine/SKILL.md

Licence: MIT, Copyright (c) 2026 LaGrowthMachine (LICENSE opened 2026-11-03).

- Adapted: rank the pains that "not now" leads voiced, which no existing content answers, by how many leads wait on each; use the waiting leads' stated needs as the content plan (lines 81 and 129 of the file, read raw on 2026-11-03).
- Left out, with reasons:
  - the six-week automated campaign, the per-lead sentences written into custom attributes, and the duplicate-and-launch steps (auto-sending; our drafts-only and approval rules);
  - the engine script, the content library index and the match scoring (third-party code; we have no content library to match yet);
  - every write to the vendor's platform, its widget, and the prompts that mention the vendor and add tracked sign-up links.
