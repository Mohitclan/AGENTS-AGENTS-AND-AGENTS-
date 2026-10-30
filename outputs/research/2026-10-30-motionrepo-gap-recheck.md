# MotionRepo gap recheck: Repowise and Deplexo

- **Task:** T-20261030-08 (job J-20261030-04), product `motionrepo`
- **Checked:** 2026-10-30, by lead-generator
- **Leads:** L-4d574242 Repowise, L-75e81825 Deplexo
- **Scope:** facts only. No drafts, no rescoring, no import, no status change, nothing written to `pipeline/`.

## Method, and its main limit

**I could not fetch raw HTML.** `curl` was refused in this non-interactive session (it needs an approval that nobody can give here), so I could not run the `<video` / `.mp4` / `youtube` / `iframe` grep you asked for. Every surface below was read with **WebFetch**, which returns the page as converted text plus link targets and image paths, not raw HTML.

What that means:

- A `<video>`, `<iframe>`, Loom or YouTube **link** on the page would normally show up as a link or image path, and none did. That is good evidence, not proof.
- An embed that a script injects after load, or one that the conversion dropped, would be invisible to me. Repowise's site is a Next.js app (`/_next/image` paths seen), so this cannot be ruled out. Deplexo's rendering stack is unknown.
- Each WebFetch result said the same thing about itself. Where I write "no video seen", read it as "none in the converted text".
- **Cheap way to close this:** a person runs `curl -sL <url> | grep -oiE '<video|\.mp4|\.webm|youtube|youtu\.be|vimeo|loom|wistia|<iframe'` on the surfaces marked "text only". About ten minutes.

Other methods used: **GitHub API via WebFetch** (JSON text, reliable for dates and tags) and **HN Algolia API via WebFetch**.

Only index pages were opened for the blogs, changelog and docs. Individual posts and deep docs pages were not, so a video inside one of them is not ruled out.

No instructions aimed at an agent were found in any page. Repowise's homepage has an "Ask AI about repowise" block of prefilled prompts for visitors; I did not act on it.

---

## 1. Repowise (L-4d574242)

### Surfaces

| Surface | URL | Method | Result | Status |
|---|---|---|---|---|
| Homepage | https://repowise.dev/ | WebFetch, text only | No video, YouTube, Vimeo, Loom, Wistia or iframe. Only `.webp` images. Social links: GitHub and Discord only, no YouTube or X or LinkedIn. Footer has `hello@repowise.dev` | Holds |
| About | https://repowise.dev/about | WebFetch, text only | No video. Co-founders listed: Raghav Chamadiya, Swati Ahuja. `hello@repowise.dev` shown. Links: GitHub, Discord, cal.com demo booking, docs | Holds |
| Features | https://repowise.dev/features | WebFetch, text only | No video or GIF. Static images only | Holds |
| Pricing | https://repowise.dev/pricing | WebFetch, text only | No video. Price is inconsistent on the page itself: card says "$12/month", "Billed $144 a year"; banner says "Pro moves to $20/mo, or $16/mo billed yearly, in November" | Holds (no video). Price text conflicts, do not quote |
| Changelog | https://repowise.dev/changelog | WebFetch, text only | No video. Static `.webp` release images (e.g. `v0-59-0.webp`). Latest entries: v0.59.0 "October 26, 2026", v0.58.0 "October 23, 2026", v0.57.0 "October 16, 2026" | Holds. Dates differ from GitHub, see below |
| Blog index | https://repowise.dev/blog | WebFetch, text only, page 1 of 13 | No video. 12 posts all dated Oct 29, 2026 (comparison and review articles). Individual posts not opened | Holds for the index only |
| Foresight | https://repowise.dev/foresight | WebFetch, text only | No video. "Foresight is coming to Repowise hosted and enterprise." Waitlist button. "We write when it opens for your team." No date, no window | Holds. Still undated |
| Docs | https://docs.repowise.dev/ | WebFetch, text only | No video or GIF on the landing page. Deep pages not opened | Holds for the landing page only |
| README | https://raw.githubusercontent.com/repowise-dev/repowise/main/README.md | WebFetch of the raw file | No mp4, YouTube, Loom or Vimeo link. One GIF: `.github/assets/lens.gif` (Lens in Claude Code on Django). Many `.webp`/`.png`/`.svg` images. Badges "Open the live Repowise demo" and "Explore Repowise's own code" link to repowise.dev. Foresight appears as image alt text "Coming to repowise.dev: Foresight" and "is where Foresight arrives first". No date. No Product Hunt, Show HN or PeerPush link | Holds, with GIF |
| PyPI | https://pypi.org/project/repowise/ | WebFetch, text only (first 100,000 of 119,690 characters) | Latest 0.59.0, 25 Oct 2026. Two GIFs described: a "Demo" GIF (a real Claude Code session, ranked fix queue, system map) and the Lens GIF. No YouTube link. Project links: docs (a GitHub file), homepage, issues, repository | Holds, with GIFs. Last ~20,000 characters not read |
| GitHub releases | https://api.github.com/repos/repowise-dev/repowise/releases/latest | WebFetch of API JSON | `v0.59.0`, published `2026-10-25T15:43:44Z`, not a pre-release. Previous: v0.58.0 `2026-10-20T19:02:09Z`. Release body mentions no Foresight, video, demo or launch | Holds: the record is current |
| Product Hunt | https://www.producthunt.com/products/repowise | WebFetch, text only | 1 follower. Text "Launched in 2026" with no day. Gallery: three JPEG images, no video. Team tab exists, no makers listed in what I saw. I did not open `/launches` this time | Holds. Day of launch unknown |
| PeerPush | https://peerpush.com/p/repowise | WebFetch, text only | "Published on Jul 11, 2026". Maker comment by @swatiahujaahuja "Jun 14, 2026". Nine screenshots, no video. Links X `@repowise_dev` and the LinkedIn company page. 6 upvotes | Holds |
| Show HN / HN | https://hn.algolia.com/api/v1/search?query=repowise&tags=story | WebFetch of API JSON | Show HN by raghavchamadiya `2026-04-06T20:15:26Z`, 1 point. Other HN posts by the founders' accounts: 2026-06-09, 06-17, 06-18. Nothing after 2026-06-18 | Holds. All stale |
| YouTube channel | https://www.youtube.com/@repowise/videos and `/about` | WebFetch | Returned only the title "repowise - YouTube" and YouTube's footer. No video list, description or links. **Could not read.** | **Couldn't check** |
| New launch or demo | HN search above; web search "repowise.dev Foresight launch date waitlist" | WebFetch, WebSearch | HN: nothing since June. Web search returned only unrelated "Foresight" products. No new launch, no new demo found | Nothing new found. Not proof of absence |

### Motion content that exists (exactly)

- **GIFs, owned by Repowise:** `lens.gif` in the README (and on PyPI); a "Demo" GIF on the PyPI page, described as a real Claude Code session. The `demo.gif` filename in the lead record is from review r2; I saw it described on PyPI but did not see the filename.
- **Live product:** the README links "Open the live Repowise demo" and a repo explorer on repowise.dev. A cal.com booking page for demos is linked from /about.
- **YouTube:** a person's check of `@repowise/videos` earlier today found 3 explainer videos of about 4 minutes on other topics and no product demo; the site does not link the channel and its owner is unconfirmed. **I could not see the channel, so I have no better evidence. That finding stands, and I have not seen it myself.** Review r2 reported six third-party YouTube videos; I did not re-look those up.
- **No narrated product walkthrough or launch video** found on any surface I could read.

### Foresight date

None. Sources checked: /foresight, the README, the latest release body, HN, web search. The page says only "coming" and "We write when it opens for your team." Foresight cannot be a timing signal.

### Release version and date

Latest release is **v0.59.0, published 2026-10-25T15:43:44Z (GitHub API)**. The record already says this, so it is current. The site changelog dates the same release "October 26" and v0.58.0 "October 23", against GitHub's 2026-10-25 and 2026-10-20. The two sources disagree and I cannot say which is right. Use "late October" or cite GitHub's date.

### Verdict: gap narrowed

It is **narrowed**, not gone, and the narrowed form is thin.

The most that can honestly be said, as one dated sentence:

> On 2026-10-30 I could not find a narrated product walkthrough or launch video on repowise.dev, its docs landing page, its GitHub README or its PyPI page, which show the product through screenshots and short GIFs; I could not read the YouTube channel `@repowise`, which the site does not link.

Why narrowed:

- The first lead record said "no video or YouTube". The YouTube side is not established: the channel exists, a person found explainer videos there, and I could not see it. "No YouTube channel" and "no video anywhere" would both be false or unsupported.
- The product is already shown in motion in two places (GIFs), and a live demo exists. A claim of "no demo" would be wrong. Only "no narrated walkthrough/launch video that I could find" is safe.
- Closes gap rule 2: MotionRepo makes launch teasers and motion walkthroughs from a repo, so the narrowed gap is one our product addresses. Whether Repowise wants one, given its own GIFs, is the open question and it is only a question.

Recommendation: the lead is writable only as an observation plus a question, about walkthrough or launch video, with no mention of YouTube. If the person who opened the channel can confirm the owner and that it holds no product walkthrough, the wording is cleaner. If the owner is Repowise and the three videos include anything product-led, treat the gap as gone.

### Safe to say / not safe to say (Repowise)

**Safe to say**

| Line | Evidence | Signal |
|---|---|---|
| Repowise shipped v0.59.0 on 25 Oct 2026 (GitHub) and v0.58.0 on 20 Oct. Releases are about weekly. | https://api.github.com/repos/repowise-dev/repowise/releases/latest | `published` |
| On 30 Oct 2026 I couldn't find a narrated walkthrough or launch video on the site, README or PyPI page; the product is shown with screenshots and short GIFs. Ask: is that on purpose? | https://repowise.dev/ , https://raw.githubusercontent.com/repowise-dev/repowise/main/README.md , https://pypi.org/project/repowise/ | `observed_gap` (narrow form above; recheck before each send; text-only check) |
| Foresight is announced as coming to hosted and enterprise, with a waitlist (no date). Fine as a question ("when Foresight opens, how will you show it?"). Not a dated event. | https://repowise.dev/foresight | `published` |
| Co-founders are listed on the About page as Raghav Chamadiya and Swati Ahuja. | https://repowise.dev/about | `published` |
| A pricing change is announced for November. Do not quote figures: the pricing page contradicts itself and the homepage says $15/$20. | https://repowise.dev/pricing | `published` |
| Contact `hello@repowise.dev` is still shown at its `source_url`. General inbox. | https://repowise.dev/about | `published` |

**Not safe to say**

| Line | Why | Signal |
|---|---|---|
| "You have no YouTube channel" or "no video anywhere" | The channel exists and the person who opened it saw videos. I could not read it | `observed_gap` (unsafe) |
| Anything about what is on `@repowise` | Owner unconfirmed, I could not read it, and the site does not link it | `observed_gap` (unsafe) |
| "You have no demo" | A live demo link, a cal.com demo page and demo GIFs exist | `observed_gap` (unsafe) |
| Show HN of 6 Apr 2026, PeerPush listing of 11 Jul 2026 | Stale, see freshness | `published` (stale) |
| "You launched on Product Hunt" | Page says only "Launched in 2026", no day. Review r2 reported no launches; I did not reopen `/launches` | `inferred` |
| "You are struggling with launch content", "you need a video", "you are founder-led" or "funded/unfunded" | Our guess. LinkedIn "Self-Owned" is self-reported | `inferred` |
| 2-10 employees, Bengaluru | From a LinkedIn page I did not reopen; reported in review r2 | `published` (not rechecked by me) |

### Freshness on 2026-10-30 (60-day line is 2026-08-31)

| Signal | Date | Age | Fresh? |
|---|---|---|---|
| v0.59.0 release | 2026-10-25 (GitHub) / Oct 26 (site) | 5 days | Fresh. Routine release, not a launch |
| v0.58.0 release | 2026-10-20 | 10 days | Fresh |
| 12 blog posts | 2026-10-29 | 1 day | Fresh. Content marketing, not a launch |
| Announced November price change | "in November", day unstated | upcoming | Fresh, but figures conflict |
| Foresight | no date | n/a | Cannot date, so cannot be the reason to write |
| Product Hunt page | "2026", no day | n/a | Cannot date |
| PeerPush listing | 2026-07-11 | 111 days | **Stale** |
| PeerPush maker comment | 2026-06-14 | 138 days | **Stale** |
| Show HN | 2026-04-06 | 207 days | **Stale** |
| Founders' other HN posts | 2026-06-09 to 06-18 | 134 to 143 days | **Stale** |
| Org created | 2026-03-29 | 215 days | Stale (background only) |

There is no fresh launch signal. Nothing fresh is a launch or a funding event, so the reason to write would rest entirely on the narrowed gap. By the signal-outreach skill's freshness rule, the stale items cannot carry an email.

---

## 2. Deplexo (L-75e81825)

### Surfaces

| Surface | URL | Method | Result | Status |
|---|---|---|---|---|
| Homepage | https://deplexo.com/ | WebFetch, text only | No video tag, mp4, YouTube, Vimeo, Loom or GIF. Static dashboard mockup; `/logo.webp` and inline SVG icons. No social links except Discord (`dsc.gg/deplexo`). Contact link is Cloudflare-obfuscated and decodes to `support@deplexo.com` | Holds |
| About | https://deplexo.com/about | WebFetch, text only | No video. "SP Ring Road, Ambli / Ahmedabad, Gujarat 380006 / India". "© 2026 Deplexo". No person, no CIN or GST, no legal name | Holds |
| Terms | https://deplexo.com/terms | WebFetch, text only | Operator named only as "Deplexo". No legal suffix, no person, no jurisdiction | Nothing found |
| Privacy | https://deplexo.com/privacy | WebFetch, text only | Same: "Deplexo", no controller, no grievance officer, no person | Nothing found |
| Blog index | https://deplexo.com/blog | WebFetch, text only | Four posts, all "September 2026", no bylines, no video, no launch announcement. Individual posts not opened | Holds for the index only |
| Docs | https://docs.deplexo.com/ | WebFetch, text only | No video or GIF on the landing page. Sections: Getting started, Build and deploy, Configuration, Operations, Reference, Help and policies. `support@deplexo.com` shown. Deep pages not opened | Holds for the landing page only |
| Org page | https://github.com/Deplexo | WebFetch, text only | Location "Bengaluru, India". Website deplexo.com. Email `contact@deplexo.com`. "No public members." 8 followers. docs, cli, examples updated Oct 28, 2026; .github Sep 26, 2026. No video links | Holds |
| Org API | https://api.github.com/orgs/Deplexo | WebFetch of API JSON | name Deplexo; email `contact@deplexo.com`; location Bengaluru, India; created `2026-05-03T13:35:17Z`; 4 public repos; no `twitter_username` | Holds |
| cli README | https://raw.githubusercontent.com/Deplexo/cli/main/README.md | WebFetch of the raw file | No images, GIFs, video or links to YouTube/Loom/Vimeo. States "The latest stable release is v0.2.0". Support email `support@deplexo.com`. Apache-2.0. No names | Holds |
| examples repo | https://github.com/Deplexo/examples | WebFetch, text only | Only the logo image. No video. Contributors section empty. 18 commits, no dates shown | Holds |
| docs repo | https://github.com/Deplexo/docs | WebFetch, text only | Only the logo. No video. Contributors empty. 13 commits | Holds |
| Releases | https://api.github.com/repos/Deplexo/cli/releases | WebFetch of API JSON | 5 releases. Newest **v0.1.0**, `2026-10-05T08:56:15Z`, not a pre-release. Betas: beta.5 `2026-10-05T08:39:32Z`, beta.3 `2026-09-26T12:00:46Z`, beta.2 `2026-09-26T09:28:02Z`, beta.1 `2026-09-26T08:59:42Z` | Holds |
| Releases page | https://github.com/Deplexo/cli/releases | WebFetch, text only | v0.1.0 marked Latest, 05 Oct. v0.2.0 not mentioned | Holds. Page lags the tag |
| Tags | https://api.github.com/repos/Deplexo/cli/tags | WebFetch of API JSON | Seven tags: v0.2.0, v0.1.0, beta.1 to beta.5 | Holds |
| v0.2.0 tag object | https://api.github.com/repos/Deplexo/cli/git/tags/1c3919ec0907a6af675eef5c7781fd09734ad77f | WebFetch of API JSON | tag `v0.2.0`, tagger `deplexohq`, date `2026-10-28T21:04:23Z`, message "v0.2.0" | Holds (I opened it myself this time) |
| Product Hunt | https://www.producthunt.com/products/deplexo | WebFetch | HTTP 404 | Nothing found; a 404 is not proof there is no listing elsewhere |
| Hacker News | `hn.algolia.com/api/v1/search?query=deplexo` and `...query=deplexo.com&restrictSearchableAttributes=url` | WebFetch of API JSON | First query: 20 fuzzy hits on "deploy" and "duplex" words, none about deplexo.com. Second (URL field): 0 hits | No hit found |
| YouTube search | https://www.youtube.com/results?search_query=deplexo | WebFetch | Page loaded without results (nav and footer only) | **Couldn't check** |
| YouTube handle | https://www.youtube.com/@deplexo | WebFetch | Title "victor marcelo - YouTube". Not a Deplexo channel | Not Deplexo's |
| Web search | "Deplexo" with founder, YouTube and LinkedIn terms (3 searches) | WebSearch | Nothing about Deplexo. Only similar names (Deplo, Depixed and others), which I did not follow | Nothing found |

### Tag and release facts

- **Latest GitHub Release:** v0.1.0, `2026-10-05T08:56:15Z` (25 days before 2026-10-30). First stable. Betas from 2026-09-26.
- **Latest tag:** v0.2.0, tagger date `2026-10-28T21:04:23Z` (2 days). It has **no GitHub Release**, so the Releases page and API are behind the tag and the cli README ("latest stable release is v0.2.0").

### Founder, team or registration record

**None found.** Not on the homepage, About, Terms, Privacy, blog, docs, org page (no public members), READMEs (no contributors) or in three web searches. The tagger name `deplexohq` is an account handle, not a person. The legal operator is given only as "Deplexo", with no company suffix or registration number.

Not checked, so this is a data gap and not a "no": the Indian MCA company register and Udyam, LinkedIn (the web search found no company page, but search is not a lookup), X, and WHOIS. Those need a person with a browser or a captcha.

Also unresolved: Bengaluru (GitHub) vs Ahmedabad (site). Both are India; don't state a city to them.

### Verdict: gap holds

I could read nothing that contradicts it, with the limits stated at the top. The gap is one absence across the homepage, About, blog index, docs landing page and the three repos' READMEs.

Dated sentence: **On 2026-10-30 I could not find a video on deplexo.com, its blog index, the docs landing page, or the READMEs of the cli, docs and examples repos, which show a static dashboard mockup and a logo.**

Weaker spots:

- **No launch listing found**: Product Hunt 404, no HN hit. Weak, not proof that none exists.
- **YouTube not established either way**: the search page did not load, and `@deplexo` belongs to someone else. Say nothing about YouTube.
- **Text-only check.** Deep docs pages and individual blog posts were not opened.
- The lead's need rests on this one absence. Founder, size and buyer remain unknown, so it is still a low-confidence lead.

### Safe to say / not safe to say (Deplexo)

**Safe to say**

| Line | Evidence | Signal |
|---|---|---|
| Deplexo published CLI v0.1.0 on 5 Oct 2026, after betas from 26 Sep. | https://api.github.com/repos/Deplexo/cli/releases | `published` |
| The cli repo has a v0.2.0 tag from 28 Oct 2026, and the README calls v0.2.0 the latest stable. (Say "tagged"; there is no GitHub Release for it.) | https://api.github.com/repos/Deplexo/cli/git/tags/1c3919ec0907a6af675eef5c7781fd09734ad77f | `published` |
| On 30 Oct 2026 I couldn't find a video on the homepage, docs landing page or repo READMEs. Ask: is that on purpose? | https://deplexo.com/ , https://docs.deplexo.com/ , https://raw.githubusercontent.com/Deplexo/cli/main/README.md | `observed_gap` (recheck before each send; text-only check) |
| Deplexo describes itself as a way to "deploy and manage websites, APIs, and bots", with a GitHub org in Bengaluru. | https://api.github.com/orgs/Deplexo | `published` |
| Contact `contact@deplexo.com` is still shown at its `source_url`. General inbox. `support@deplexo.com` also appears on the docs, cli README and homepage link, but it is a support route. | https://github.com/Deplexo | `published` |

**Not safe to say**

| Line | Why | Signal |
|---|---|---|
| A founder's or team member's name | None found anywhere. `deplexohq` is a handle | `inferred` |
| "You are a small team", "founder-led", "solo" | Hints only (org created 2026-05-03, one account tagging). No size or founder source | `inferred` |
| "You launched on Product Hunt or HN" | Product Hunt 404; HN no hit. Equally, don't claim they have not | `inferred` |
| "You have no YouTube channel" | The search page did not load; the `@deplexo` handle is another person's | `inferred` |
| Which city they are in | GitHub says Bengaluru, the site says Ahmedabad | `published` (conflicting) |
| "You need launch videos" or any statement of struggle | Our guess | `inferred` |
| The v0.1.0 release as "the launch" | It is a CLI release. No launch announcement exists on the blog | `inferred` |

### Freshness on 2026-10-30 (60-day line is 2026-08-31)

| Signal | Date | Age | Fresh? |
|---|---|---|---|
| cli v0.2.0 tag | 2026-10-28 | 2 days | Fresh. No GitHub Release |
| docs, cli, examples repos updated | 2026-10-28 | 2 days | Fresh |
| cli v0.1.0 (first stable) | 2026-10-05 | 25 days | Fresh. Best candidate reason, together with the gap |
| Betas beta.1 to beta.3 | 2026-09-26 | 34 days | Fresh but superseded |
| Blog posts | "September 2026", no day | at most 30 days | Fresh by month only |
| Org created | 2026-05-03 | 180 days | Stale (background only) |

---

## 3. Contact addresses

| Lead | Address | Source URL in record | Still there on 2026-10-30? |
|---|---|---|---|
| Repowise | `hello@repowise.dev` | https://repowise.dev/about | Yes. Shown on /about and in the homepage footer |
| Deplexo | `contact@deplexo.com` | https://github.com/Deplexo | Yes. Shown in the org sidebar and in the GitHub org API |

Both are general inboxes (reachability capped at 5). Neither is a named person. Deplexo's contact address does not appear on deplexo.com itself, only on GitHub; the site's contact link goes to `support@deplexo.com`.

## 4. Data gaps

- Raw HTML for every surface (curl was refused). Closes with the grep command in the Method section.
- `youtube.com/@repowise`: unreadable to my tools; the person's finding is unverified by me, and the owner is unconfirmed.
- Repowise: individual blog posts, docs deep pages, the last ~20,000 characters of the PyPI page, and `producthunt.com/products/repowise/launches` (not reopened).
- Repowise: LinkedIn size and location, and the six third-party videos, were not rechecked by me. They are in the record from review r2.
- Deplexo: YouTube search (page did not render), MCA and Udyam registers, LinkedIn, X, WHOIS, deep docs pages, individual blog posts.
- A date for Foresight. None published.

## 5. For the coordinator

- Repowise: gap narrowed, thin, no fresh launch signal. A draft is possible only as a narrow, dated observation plus a question, and only if a person is happy with that. If the channel owner is confirmed as Repowise and its videos include product content, the gap is gone and the lead should be disqualified as with Groundrule.
- Deplexo: gap holds; fresh v0.1.0 (25 days) and v0.2.0 tag (2 days); founder and size still unknown, so low confidence stands.
- The lead record's wording "the official channel" should be "the handle" until the owner is confirmed (a known defect from review r3).
