# Lead format

`pipeline/leads.jsonl` holds one lead per line. Only `node scripts/leads.mjs` writes it; a hook blocks direct edits.

## Adding leads

1. Write a batch to `pipeline/inbox/YYYY-MM-DD-<product>-<n>.jsonl`, one JSON object per line.
2. Run `node scripts/leads.mjs import pipeline/inbox/<file>.jsonl`.
3. If the script lists problems, nothing was imported. Fix every problem and run it again.

The script assigns each lead an ID from its domain and product, so importing the same company for the same product again updates the existing lead instead of creating a duplicate. It also computes the score and tier.

## Fields in a batch

| Field | Required | Notes |
|---|---|---|
| `company` | Yes | Company name |
| `website` | Yes | `https://...`; its domain is used to detect duplicates |
| `product` | Yes | Slug of a product with a file in `knowledge/products/` |
| `segment`, `industry`, `country`, `size` | No | Free text |
| `fit_reason` | Yes | Why this company fits the product, at least 20 characters |
| `evidence` | Yes | List of `{ "claim": "...", "url": "https://...", "signal": "published" }`, at least one. `signal` is optional: `published` (they said it), `observed_gap` (visible on their public surface) or `inferred` (our guess, which sets timing only). See the signal-outreach skill |
| `score_breakdown` | Yes | Whole numbers: `icp_fit` 0-40, `need_evidence` 0-30, `timing` 0-20, `reachability` 0-10 |
| `score_rationale` | Yes | One line explaining the score |
| `contact` | No | `{ "name", "role", "channel", "value", "source_url" }`. `channel` is `email`, `linkedin`, `form`, `phone` or `other`. `source_url` must show where the contact was published |
| `next_action` | Yes | The next step for this lead |
| `researched_at` | Yes | `YYYY-MM-DD` |
| `researched_by` | No | Defaults to `lead-generator` |
| `status` | No | `new` (default) or `disqualified` with a `disqualify_reason` |
| `competitor` | No | Who the competitor is, e.g. `"RepoClip, a direct competitor"`, when the lead is one of our competitors (`knowledge/company.md`: never contact competitors). A critical signal: the gate shows a Stop. Re-importing a lead without it does not clear it, and no command clears or corrects it (only a person editing `pipeline/leads.jsonl`). While a competitor question is still open, use `hold` (it has `release`); set `competitor` only once it is settled |

## Scoring

| Part | Max | What earns points |
|---|---|---|
| `icp_fit` | 40 | Industry, size, region and buyer role match the product's ICP |
| `need_evidence` | 30 | Public evidence of the problem: job posts, reviews, complaints, tooling gaps |
| `timing` | 20 | A recent trigger: funding, hiring, launch, new regulation, contract renewal |
| `reachability` | 10 | A published route to the right person |

Tier A is a score of 75 or more, tier B is 50-74 and tier C is below 50.

## Statuses

`new` → `qualified` (passed review) or `disqualified` → `drafted` (outreach written) → `approved` (human approved sending) → `contacted` (human sent) → `replied` → `meeting` → `trial` → `won` or `lost`.

Change a status with `node scripts/leads.mjs set-status <id[,id...]> <status> "<note>"`. A note is required for `disqualified`, `approved`, `contacted`, `won` and `lost`. Setting the status a lead already has only adds the note to its history.

The script allows only these moves:

| From | To |
|---|---|
| `new` | `qualified`, `disqualified` |
| `qualified` | `drafted`, `disqualified` |
| `disqualified` | `new` |
| `drafted` | `approved`, `qualified` (redraft), `disqualified` |
| `approved` | `contacted`, `drafted` |
| `contacted` | `replied`, `lost` |
| `replied` | `meeting`, `trial`, `won`, `lost` |
| `meeting` | `trial`, `won`, `lost` |
| `trial` | `won`, `lost` |
| `won` | none |
| `lost` | `qualified` |

`approved`, `contacted` and `won` record a person's decision, so Claude Code asks a person before an agent sets them. To correct a mistake, add `--force`; that asks too, and the history marks the change as forced.

## Example batch line

```json
{"company":"Example Goods","website":"https://example.com","product":"your-product-slug","segment":"Mid-size D2C brands","industry":"E-commerce","country":"India","size":"51-200","fit_reason":"Sells online across three marketplaces and is hiring a support lead to handle rising ticket volume.","evidence":[{"claim":"Careers page lists a customer support lead role citing growing ticket volume","url":"https://example.com/careers"}],"score_breakdown":{"icp_fit":32,"need_evidence":24,"timing":15,"reachability":6},"score_rationale":"Strong fit and a public hiring signal; no named contact yet.","contact":{"name":"","role":"","channel":"form","value":"https://example.com/contact","source_url":"https://example.com/contact"},"next_action":"Draft outreach through the contact form referencing the support-lead hire.","researched_at":"2026-10-29"}
```

## Before outreach

`node scripts/leads.mjs gate --product <slug>` gives each qualified lead a verdict (add `--status all` for every status):

- **Go:** reviewed, and ready for drafts.
- **Not reviewed:** still `new`, so it can't be a Go yet. Any concerns are listed.
- **Conditional:** a person decides: non-email or LinkedIn contact, research over 90 days old, tier C, evidence with no signal class, only inferred signals, or a newest signal over 60 days old.
- **Stop:** any critical signal (below), no published contact, or no current evidence. Fix it at the source and run the gate again.

**Critical signals.** Any one of these forces a Stop, whatever the lead's score or tier, so a high score can't hide a disqualifier. The gate prints each reason. They can only turn a Go or Conditional into a Stop, never the other way.

| Signal | Reason shown | Where it comes from |
|---|---|---|
| Suppressed | `suppressed (<entry>)` | The contact, the lead's website or its domain matches an entry in `pipeline/suppression.jsonl` by the one matcher described under Suppression (CLAUDE.md hard rule 7) |
| Disqualified or lost | `status is disqualified` / `status is lost` | The lead's `status` |
| On hold | `on hold (<owner>): <reason>` | `leads.mjs hold` |
| Competitor | `competitor: <who>` | The optional `competitor` field; `knowledge/company.md`, never contact competitors |
| Personal email address | `personal email address (<domain>)` | An email contact on a free consumer mailbox such as gmail.com; `knowledge/company.md`, never contact personal (non-work) addresses |
| Support-only inbox | `support-only inbox` | Contact quality `support` (support@, help@, billing@); `memory/MAIN.md` 2026-10-30, never a Go |

A Go still doesn't read the claims, so a passed review is what clears them.

Signal age comes from an evidence item's optional `dated` field (when the event happened), or else the date we saw it.

## Hold, corrections and next actions

- `node scripts/leads.mjs hold <id> "<reason>" --owner <who>` stops all outreach to a lead while a person decides. `release <id> "<note>"` lifts it, and Claude Code asks a person first.
- `node scripts/leads.mjs supersede <id> <n> "<why>"` marks evidence item n as wrong or out of date. It stays in the record but no longer counts, and `show` lists it last.
- `node scripts/leads.mjs next <id> "<action>"` updates a lead's next action.

## Contact quality

The gate shows each lead's contact quality:

| Quality | Example | Reachability cap |
|---|---|---|
| direct | A named person's published address or LinkedIn profile | 10 |
| general | hello@, info@, contact@, team@ | 5 |
| support | support@, help@, billing@ | 3, and always a Stop in the gate |

The import refuses a score above the cap.

## Suppression

`node scripts/leads.mjs suppress <domain|email|profile URL> "<reason>"` adds an opt-out to `pipeline/suppression.jsonl`. It applies across every product: open leads are disqualified at once, imports are refused, and a suppressed lead can't move to `drafted`, `approved` or `contacted`. Removing an entry is a person's decision, made by editing the file.

An entry is one of three kinds:

| Kind | Example | Covers |
|---|---|---|
| Email address | `asha@example.com` | That address only |
| Company domain | `example.com` | The domain, its subdomains, and any address on them. `notexample.com` is not covered |
| Profile URL | `https://linkedin.com/in/asha` | The person's page and the pages below it. Only the profile part is stored (see below), with a lower-case host and path, no `www.`, fragment or trailing slash, and no query (except the `id` of `facebook.com/profile.php`); `twitter.com` is stored as `x.com` |

**Shared hosts never count as a company domain.** Opting out one person on a site many people share must not opt out everyone else, so `suppress` refuses a bare shared host (`linkedin.com`, `x.com`, `twitter.com`, `github.com`, `github.io`, `medium.com`, `substack.com`, `linktr.ee` and the others in `SHARED_HOSTS` in `scripts/_shared.mjs`) and tells you to give the profile URL. A page on a shared host is stored as the person's profile, never as the page you gave: `https://x.com/asha/status/123` is stored as `https://x.com/asha`, `linkedin.com/in/asha/overlay/contact-info` and `linkedin.com/comm/in/asha` as `https://linkedin.com/in/asha`, `github.com/asha/repo` as `https://github.com/asha`, `https://asha.github.io/repo` as `https://asha.github.io`, and `suppress` prints a line saying so. Each path host has its own shape in `scripts/_shared.mjs` (`PROFILE_ONLY`, `NEEDS_NAME`, `LONG_PROFILES`, `NOT_A_HANDLE`): `linkedin.com/in/<name>` (also `company`, `school`, `showcase`, `pub`), `x.com/<handle>`, `github.com/<name>`, `facebook.com/people/<name>/<id>`, `producthunt.com/@<name>` and so on. A page that names no one is refused with the same message, because a stored copy would cover nobody: `linkedin.com/messaging/...`, `linkedin.com/feed/update/...`, `linkedin.com/posts/...`, `x.com/i/...`, `x.com/messages/...`, `instagram.com/direct/...`, `instagram.com/p/...`, `youtube.com/watch?v=...`, `linkedin.com/in` (needs the name), `x.com/home`, `youtube.com/c` (needs the name), `github.com/orgs`. Give the profile URL instead. The lists are curated: a page on a path host that the lists do not know is read as a handle, so a new section name on a listed host can be stored as a made-up "person" (it covers nobody real, and `suppress` prints the zero-match note when no open lead matched). A page on a host the lists do not list at all (`t.me`, `cal.com`) is stored as that whole host. Two forms of the same address are folded: an `@` before a handle where the real URL has none (`x.com/@asha` is `x.com/asha`; also Instagram, GitHub, GitLab, Facebook, Peerlist, linktr.ee, dev.to and the like), and the other names of a site (`threads.com` is stored as `threads.net`; `web.`, `mbasic.`, `touch.` and `m.facebook.com` and `fb.com` as `facebook.com`; `instagr.am` as `instagram.com`; `angel.co` as `wellfound.com`). The `@` is kept where it is part of the real URL (YouTube, Medium, Product Hunt, Threads), and a lone `@` is refused. Two URL forms of one person that are different pages (`medium.com/@asha` and `asha.medium.com`, `youtube.com/asha` and `youtube.com/@asha`) are not folded: if a person has both, suppress both. The one query kept is the one that names a page: `facebook.com/profile.php?id=123` is stored with its `id`, and `profile.php` without one is refused.

**Other values `suppress` refuses:** a bare free-mail domain (`gmail.com`, `outlook.com`, `proton.me`, the `PERSONAL_MAIL` list in `scripts/_shared.mjs`), because it would cover every address there (give the person's address instead); a bare public suffix (`co.uk`, `com.au`, `de`); a domain that starts with `.` or `*.` or holds a `*` (an opt-out on `acme.com` already covers its subdomains); and anything that is not an email, a profile URL or a domain. `mailto:` is stripped and the address stored, and so are brackets, quotes and a trailing `.` `,` `;` `?` pasted around it (`<asha@acme.com>`, `asha@acme.com.`, `"asha@acme.com"`); `Asha <asha@acme.com>` and `"asha"@acme.com` are refused with "give the bare address or URL". A trailing `,` or `)` is also taken off a pasted URL. `www.` is dropped from a domain, and `m.`/`mobile.` only on a shared host, so `mobile.de` stays `mobile.de` and `www.com` stays `www.com`.

When `suppress` disqualifies no open lead it prints `No open lead matched; check the entry covers the person.` and still exits 0, because a lead imported later must be blocked. Read that line: it is the cue that the entry may not be the person's own profile or address.

**There is one matcher, `suppressionMatch` in `scripts/_shared.mjs`.** The gate, the at-once disqualify in `suppress`, import, `set-status` and `scripts/send-email.mjs` all call it, so they cannot disagree. It checks the contact (an email address or a URL), the lead's website and the lead's stored domain. A profile-URL entry matches a contact or website URL that is that page or below it, on a `/` boundary (`in/asha` covers `in/asha/details/experience` and `in.linkedin.com/in/asha`, not `in/asha-b`); it cannot match an email address, so a person who opts out by LinkedIn and also has an email contact needs both recorded.

**An old or hand-written entry that is a shared-host root fails safe.** A bare shared host (`linkedin.com`, written before this rule, when `suppress` dropped the profile path) or a site root written by hand (`https://www.linkedin.com/`, `https://linkedin.com/in`) keeps blocking every lead on that host, and the gate shows `suppressed (legacy linkedin.com: re-enter as a profile URL)`, so the opt-out is not lost. `node scripts/leads.mjs check` exits 1 while one exists, and `gate` prints a warning, naming the entry. Re-enter the person with `suppress <profile URL>`, then a person removes the old line. `check` fails the same way for an entry that covers nobody (a bare suffix, `.acme.com`, `*.acme.com`, text that is not a domain), a whole mail service, or a stored shared-host URL longer than a profile (`https://x.com/asha/status/1`: it is still honoured, read as `https://x.com/asha`, and the line should be re-entered). A hand-written page that names no one (`linkedin.com/messaging/thread/...`) is read as a site root and blocks that site until replaced. A hand-written `www.acme.com` is read as `acme.com`, and `mailto:` is stripped at match time.

## Other commands

```bash
node scripts/leads.mjs list --product <slug> --status qualified --tier A
node scripts/leads.mjs show <id>
node scripts/leads.mjs check
node scripts/leads.mjs export-csv
```
