# Main memory

The team's shared memory. Every agent reads it at the start of every task (`CLAUDE.md` imports it). It holds decisions, preferences and lessons learned. Product and company facts don't go here: they live in `knowledge/` and need a person to confirm them.

Add and remove entries with `/teach` and `/forget`, or with `node scripts/memory.mjs`. A hook blocks direct edits, so every entry has a date, a source and an author. Keep it short: every line costs tokens on every task.

## Decisions

- 2026-10-30 · The team runs only on the Claude Max plan: no API key, no paid tools, and extra usage stays off. (source: told by the founders on 2026-10-30 · by: human)
- 2026-10-30 · A parent company or studio does not count as founder-led unless a named founder runs the product and the whole team is small; otherwise it is a separate segment. (source: told by shivam-G05 on 2026-10-30 · by: human)
- 2026-10-30 · Keep segment 1 as defined for now, and add human-assisted research from Peerlist and Product Hunt India rather than weakening the criteria. (source: told by shivam-G05 on 2026-10-30 · by: human)
- 2026-10-30 · A lead with no known founder may get a draft, but it is marked low confidence and a person approves it before sending. (source: told by shivam-G05 on 2026-10-30 · by: human)
- 2026-10-30 · General inboxes such as hello@ or contact@ are valid contacts with a lower contact-quality score. A support-only inbox never gets a Go. (source: told by shivam-G05 on 2026-10-30 · by: human)
- 2026-11-01 · Segment 1 includes solo founders: a named founder running the product alone counts, so the range is about 1 to 20 people. This changes only the 2-person minimum; every other segment 1 test stays. (source: told by shivam-G05 on 2026-11-01 · by: human)
- 2026-11-01 · Segment 1 tests for now: a launch or major release in the last 30 days, or dated in the next 60, passes test 4. A product demo video lowers a lead's score and no longer rejects it. An active GitHub account of the maker or company counts as inferred evidence for test 5. Claude's call, not yet a person's; a person can reverse it. (source: asked by shivam-G05 on 2026-11-01: do h and a3 · by: coordinator)
- 2026-11-02 · Pilot (from 2026-11-02): agents may research, scrape and draft freely, but nothing is sent to a prospect until people have reviewed and approved the draft's wording. Test sends go only to Sushant Mishra (sushant.789.mishra@gmail.com); ops/mail-config.json enforces this with pilot.allow_only. (source: told by suryanshu on 2026-11-02 · by: human)
- 2026-11-02 · Agent runs on the Max plan are allowed only as limited tests during the pilot; a person is asked before each run that uses plan limits. (source: told by suryanshu on 2026-11-02 · by: human)
- 2026-11-02 · Send reports from scripts/send-email.mjs go to Sushant Mishra (sushant.789.mishra@gmail.com) during the pilot, until suryanshu changes it; they went to Raj before. (source: told by suryanshu on 2026-11-02 · by: human)
- 2026-11-03 · Copy checks warn when a text uses more than about one em dash per 1,000 words; em dashes are never banned outright. (source: told by suryanshu on 2026-11-03 ("do recommended") · by: coordinator)
- 2026-11-03 · Agents may only read from HubSpot: lead-generator, sales and their backups get ten named read-only HubSpot tools, never a wildcard. Any CRM change goes to a person first. (source: told by suryanshu on 2026-11-03 (A-20261103-01) · by: coordinator)

## Preferences

- 2026-11-03 · The human wants the coordinator to decide and keep going without asking before each step: make the safest reasonable call, record it as an assumption, and list open questions at the end. Sends, posts, pushes and confirming knowledge still need a person's specific yes. (source: told by suryanshu on 2026-11-03 ("you are allowed dont ask me before every command") · by: coordinator)

## Lessons

- 2026-10-30 · Joining two confirmed facts can create a new unconfirmed claim ('18% GST' + 'invoice' is not 'GST invoice'). The joined claim needs its own primary source. (source: outputs/reviews/T-20261030-03-r2.md · by: coordinator)
- 2026-10-30 · The lead gate's Go is arithmetic only: it trusts the score and doesn't read claims, and with --status all it shows Go on a lead that hasn't passed review. A Go needs both a passed review and a qualified status before anyone drafts. (source: outputs/reviews/T-20261030-06-r3.md · by: coordinator)
- 2026-10-30 · A clean lint-copy says nothing about whether claims are true: it passed drafts holding an auto-fail claim. It checks form only, so only a review clears copy. (source: outputs/reviews/T-20261030-07-r1.md · by: coordinator)
- 2026-11-01 · Launch listings show launches that already happened, so they cannot show segment 1's launch in the next 60 days. Plan another source for that test, or a person, instead of expecting it from listings. A past launch alone does not pass it. (source: outputs/reviews/T-20261101-03-r3.md · by: coordinator)
