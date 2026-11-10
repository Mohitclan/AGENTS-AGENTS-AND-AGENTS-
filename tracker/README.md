# Email open tracker

Shows who opened which email and how many times, on mission control's Emails page and with `node scripts/opens.mjs`.

It is a tiny Cloudflare Worker (`worker.js`) on Cloudflare's free plan. `scripts/send-email.mjs` puts a 1x1 invisible image with a fresh random ID in each HTML email; each time a mail app loads that image, the Worker counts it. It stores the time and the kind of mail app (Gmail, Apple, Outlook, Yahoo, other), never an IP address, and it can't tell who an ID belongs to: only `ops/send-log.jsonl` on our side links an ID to an email.

## Read this first: what an "open" means

An open is a hint, not proof that a person read the email.

- **Apple Mail** (iPhone, iPad, Mac) loads images by itself when the email arrives, so an email can show as opened when nobody looked. Mission control marks these "maybe automatic".
- **Gmail** fetches the image once through its own proxy and caches it, so repeat opens often don't show up.
- **Many work mail apps block images**, so a real open never shows up.

Never change a sequence because of opens, and never mention them to the person.

## Set it up (about 15 minutes, once)

You need a free Cloudflare account and a terminal in this folder. `npx` downloads Cloudflare's `wrangler` tool the first time.

1. **Create a Cloudflare account** at https://dash.cloudflare.com/sign-up (free plan is enough).

2. **Sign in from the terminal.** A browser window opens; approve it.

   ```bash
   cd tracker
   npx wrangler login
   ```

3. **Create the storage.** It prints an `id = "..."` line. Paste that id into `wrangler.toml` in place of `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

   ```bash
   npx wrangler kv namespace create OPENS
   ```

4. **Choose a read password** (any long random text, for example from a password manager) and give it to the Worker. It asks for the value without showing it.

   ```bash
   npx wrangler secret put READ_TOKEN
   ```

5. **Deploy.** It prints the Worker's address, like `https://panscience-mail-opens.<your-name>.workers.dev`.

   ```bash
   npx wrangler deploy
   ```

6. **Tell our side about it.**
   - In `ops/mail-config.json`, under `tracking`, set `"enabled": true` and `"base_url"` to the address from step 5.
   - Add the same read password from step 4 to the git-ignored `.env` as `TRACKER_READ_TOKEN=...`. Never put it in any other file.

7. **Check it.** Open `<base_url>/o/00000000000000000000000000000000.gif` in a browser (a blank page means it works), then run:

   ```bash
   node scripts/opens.mjs
   ```

From then on every HTML email `send-email.mjs` sends carries the image (the dry run prints `Open tracking: on`), and mission control fetches the opens every 10 minutes.

## Turn it off

Set `"enabled": false` in `ops/mail-config.json`. New emails go without the image; opens already recorded stay readable.
