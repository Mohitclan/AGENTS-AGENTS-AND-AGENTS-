---
name: ai-answer-visibility
description: AEO and GEO - how to make our pages reachable, readable and quotable for ChatGPT search, Claude, Perplexity, Copilot and Google's AI features, without tricks. Use in every SEO and AEO run after the technical audit.
---

# Being found and quoted in AI answers

AI assistants answer from pages they can fetch and understand. Google says its AI Overviews and AI Mode use ordinary
search: an indexed page that can show a snippet, with no special markup. So AEO is mostly good SEO, plus making sure
the AI search bots are let in and that each page states its facts plainly enough to quote.

## The checks

1. **AI search bots allowed:** `robots.txt` lets `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Googlebot` and `Bingbot` read the public marketing and docs pages. One of them blocked is a **critical fail**. `node scripts/seo-check.mjs` reports each bot.
2. **Training bots are the founders' choice:** report what `robots.txt` says for `GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot` and `Applebot-Extended`, and what allowing or blocking each means. **Never change these rules yourself.**
3. **Not blocked by the CDN or firewall:** seo-check fetches the page with the AI bots' user agents. A 403, a challenge page or an empty body for a bot that `robots.txt` allows is a fail (usually a Cloudflare or firewall bot setting a person must change).
4. **Snippets allowed:** no `nosnippet`, `max-snippet:0` or widespread `data-nosnippet` on pages we want quoted.
5. **Text in the server's HTML:** most AI fetchers don't run JavaScript, so the answer must be in the HTML the server sends (site-technical-audit check 7).
6. **Clear about what we are:** the home and about pages say in plain text what the product is, its category, who it is for, the company's name and where it is based, with the same words in the `Organization` and `SoftwareApplication` structured data and `sameAs` links.
7. **Answer first, in blocks that stand alone:** each key page (product, pricing, each feature, comparisons, docs overview) answers its main question in the first one to three sentences under a heading that says what follows, and names the product instead of saying "it". This is our working rule, not a Google requirement.
8. **Facts that can be checked:** real numbers, dates and named sources where they are true. A 2023 study of generative engines (Aggarwal et al., "GEO") found that adding quotations, statistics and cited sources raised how often a page was used in answers, while keyword stuffing lowered it; results varied by engine and topic. **Never invent a statistic, quote or customer.**
9. **Real FAQs:** questions buyers actually ask (from sales calls, replies and support), answered in visible text on the page they belong to.
10. **Current facts:** prices, plan limits and integrations on the site match the fact sheet; a changelog or updated date where it helps.
11. **`llms.txt` (optional, low priority):** if there is one, check it follows llmstxt.org (an H1, a one-paragraph summary in a blockquote, H2 sections of links) and that its links work. If there isn't, list it as an option, never as a failure: Google says it doesn't use it. It is most useful for developer products with docs.
12. **Where else we are described:** note which review sites, directories, GitHub and Wikipedia or Wikidata describe the product; gaps go to the coordinator for the directory-listing skill. No fake mentions, ever.

## Only a person can do

The Search Console setting that includes the site in AI features and its generative AI report, Bing Webmaster Tools'
AI performance report, and spot-checks in ChatGPT, Perplexity, Claude and Gemini (a person asks five to ten real buyer
questions and notes which pages get cited). Don't script searches on Google: automated queries break its rules.

## Sources

Google: AI features and your website, optimising for generative AI features (2026); OpenAI, Anthropic and Perplexity
crawler documentation; llmstxt.org; Aggarwal et al., KDD 2024 (arXiv:2311.09735); Bing Webmaster Guidelines. Ideas
from the MIT-licensed AgriciDaniel/claude-seo, addyosmani/web-quality-skills and zubair-trabzada/geo-seo-claude,
rewritten here.
