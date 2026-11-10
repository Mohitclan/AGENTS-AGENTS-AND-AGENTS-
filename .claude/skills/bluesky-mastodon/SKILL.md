---
name: bluesky-mastodon
description: Norms, length limits, hashtags and alt text for Bluesky and Mastodon posts from a software company. Use for every Bluesky or Mastodon draft.
---

# Bluesky and Mastodon

Adapted from coreyhaines31/marketingskills (`social`, MIT). The limits below are the usual ones; a Mastodon server can differ, so say in `## For the reviewer` if a post sits near its limit.

Both are small, open communities that dislike ads and reward people who are useful. Be a person with something to show, not a brand.

## Bluesky

- **Limit:** 300 characters a post. A longer idea becomes a short thread of two or three posts, or a link.
- **Links:** allowed in the post, and shown as a card. The post should still make sense on its own.
- **Hashtags:** optional; one or two. Search uses them lightly.
- **Tone:** direct and a little dry. A joke lands better than a slogan.
- **Don't ask for follows.** Feeds and starter packs matter more than counts.

## Mastodon

- **Limit:** 500 characters on most servers; some allow more or fewer.
- **Hashtags:** they are how people find you. Use one to three, in CamelCase (`#OpenSource`, `#IndieDev`) so screen readers read them well, at the end of the post.
- **Content warnings:** use them for topics a server's rules ask for, not to look polite. A product post does not need one.
- **Servers have rules** on self-promotion and bots. A person reads the server's rules before posting. Never post from a bot account or automatically.
- **Tone:** a little more context and courtesy than Bluesky. People read the whole post.

## Alt text (both)

Every image gets alt text. A post with an image and no alt text is not ready.

1. Say what a person who can't see the image needs: what it shows and why it is there.
2. Read any text in the image out in full.
3. Keep it to about 200 characters; a chart or diagram may need more, but lead with the point.
4. Don't start with "Image of", and don't repeat the post text.
5. Put it under `## Alt text` in the draft, one line per image.

Example: "Screenshot of MotionRepo's output list: one launch video and one PDF, both named after the repository."

## Writing the post

1. Start from the LinkedIn or X version (post-repurposing) and rewrite it; don't just trim it.
2. One idea. The first 80 characters carry the point.
3. Say what we make when it is relevant. No "excited to announce".
4. Ask a question only when you want an answer and a person will reply to it.
5. No tagging people for attention. Don't post identical text to both services in the same minute.

## Never

- Auto-follow, mass-follow or reply-guy behaviour; fake or bought accounts; scraping profiles.
- Reply to someone who did not ask. Answering a question someone did ask is community-replies.
- Put a claim in the post that is not in `## Claims used`.

## File format

`outputs/marketing/posts/YYYY-MM-DD-bluesky-<slug>.md` (or `-mastodon-`), frontmatter `channel: bluesky` or `mastodon`, `product`, `task`; the post text; `## Alt text` if there is an image; `## Claims used`; `## For the reviewer` (with the character count). Run `node scripts/lint-copy.mjs <file> --type social`.
