# Draft additions to `research-rigor` and `lead-research`

Task T-20261103-09b, package P6, survey item A6. A draft: nothing here has been installed.

## What changes

Public social and forum research gets a method that lets a reader check every claim: a plan before collecting, one record per part that was read, search results kept apart from evidence, commenters kept apart from post authors, reposts counted once, and one count line that says what was found, read, left out and unreachable.

The method is written for **public business information only** (hard rule 3). It records what a business or a person published in a professional capacity. It doesn't collect a private person's profile, history or contact details.

Two files change, because two different agents do this work:

| File | Loaded by | What it gets |
|---|---|---|
| `.claude/skills/research-rigor/SKILL.md` | `researcher`, `knowledge-base` (and fallbacks) | The full method, as a new section |
| `.claude/skills/lead-research/SKILL.md` | `lead-generator`, `researcher` (and fallbacks) | A short paragraph added to "Public buyer intent", pointing at the full method |

`lead-generator` doesn't preload `research-rigor`, so the `lead-research` paragraph is complete on its own for lead work and tells the agent to read the other skill by its path only when a task is mostly social research.

## Edit 1: `research-rigor`

Insert a new section after the end of `## The language bank` (its last line is "...Mark each phrase adopt, bridge or refuse.") and before `## Free competitor sources`.

---

## Public social and forum research

For posts, threads and comments on public sites. Read public pages only: never log in, post, reply, follow or message, and don't get round a login wall or paywall. Whatever you can't open is an access gap. Record only what a business, or a person acting for one, published in a professional capacity. Skip private people's profiles, other posts and contact details.

1. **Plan first.** Before collecting, write the question, the sites, the date range, how you will pick posts, the most you will read and when you stop. Record any change and why.
2. **Search results are not evidence.** A result, snippet or preview only tells you what to open. It cannot back a claim about a page you haven't read.
3. **One record per part you read:** the post text, each comment, a linked page. Opening a thread doesn't mean you read its comments, and media you couldn't view is "not inspected". Each record has an `id`, a `source` (one per thread), the `url`, `found via` (the search result that led you there), the `part`, the `writer` (post author, commenter or reposter, plus any professional capacity the page states), the date shown (or unknown) and the date you read it, a `state` (found only, read, or couldn't open and why), the `words` (a short exact quote), a `duplicate group`, and `left out` (no, or why). Write `unknown` rather than leaving a field blank or guessing.
4. **Keep writers apart.** A comment belongs to its commenter, not to the post's author. A repost's added comment is the reposter's own, and a repost with its original is one voice. "The writer said X" is not "X is true".
5. **Counts stay inside what you read** ("3 of 12 comments read"). Likes and views don't show how many people feel something. Give one count line: found N, read M parts from K threads, left out and couldn't open (each with reasons). An empty search is a limit of the search, never evidence that nobody talks about it.
6. **Auditing a report:** name the rule each weak claim breaks and what evidence would support it. Don't supply a source yourself.

---

## Edit 2: `lead-research`

In `## Public buyer intent`, the paragraph currently reads:

```
Forum and community posts can reveal buyers, but a keyword hit is only a candidate. Keep one only if the writer is a likely buyer, the intent is clear, and you have their exact words with the URL. Read public pages only, and never post or reply.
```

Add this paragraph straight after it (same section):

---

Each post you keep becomes one evidence item in the lead record: the exact words (a short quote), the URL of that post or comment, `signal: published`, and `dated` when the page shows a date. Say whether the words come from the post or from a comment, and give the writer's role (post author or commenter, plus any job title the page states), never a name or handle. A comment is never credited to the post's author. A search result you didn't open is not evidence, and neither is an empty search; list the search under data gaps. Record the company and its published professional contact, not a private person's profile, other posts or contact details. For a task that is mostly social research, first read the "Public social and forum research" section of `.claude/skills/research-rigor/SKILL.md` (you don't preload that skill, so open the file).

---

## Who this affects

- Only agents that research can read public pages: `researcher` and `knowledge-base` have WebFetch and WebSearch, `lead-generator` too. None of them gains a new tool or a new permission. No step needs a shell.
- The new section sits beside rules that already exist: counts with denominators (rule 3 of "When a finding is real"), "say so when a source is silent" (rule 4) and "never synthesise a quote" (rule 5). It adds the plan, the record fields, the writer split and the count line.
- Cost (see the README for exact word counts): Edit 1 adds about 365 words to `research-rigor`; Edit 2 adds about 145 to `lead-research`. If that is too much for every `researcher` and `knowledge-base` run, cut rule 6 (auditing) first.

## Sources

Adapted from `social-evidence-research`:

https://github.com/wshobson/agents/blob/main/plugins/content-marketing/skills/social-evidence-research/SKILL.md

and its evidence-record reference:

https://github.com/wshobson/agents/blob/main/plugins/content-marketing/skills/social-evidence-research/references/evidence-record.md

Licence: MIT, Copyright (c) 2024 Seth Hobson (LICENSE opened 2026-11-03).

- Adapted: the plan before collecting, search results as discovery only, one record per inspected part, post author kept apart from commenter, duplicate groups counted once, the count line (found, inspected, excluded, access gaps), "an empty search is a limit, not absence", and the audit of a report.
- Left out, with reasons:
  - exports and user-supplied captures of accounts (bulk personal data; we use public pages only);
  - the `profile` part and any inspection of private people's accounts (hard rule 3);
  - image, audio and video parts (our fetch tool can't view media; the draft says "not inspected");
  - the full 22-field record, cut to the fields named in rule 3, and the report template layout (our research files have their own sections);
  - the author handle field (replaced by a role, so a person isn't named by default).
