# Connecting social accounts

Mission control can publish an approved post for you. You approve it on the Posts page, press **Publish to <channel>**, confirm once, and it goes out through the platform's own free API. Nothing is ever published without that click.

Each account needs a few values. **You put them in the `.env` file yourself** (in the folder where mission control runs; it is never committed). One line per value, no spaces around `=`:

```
BLUESKY_HANDLE=yourname.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Restart nothing: open the Posts page and press **Check again** under Connected accounts. The page only says which values are set, never what they are. Don't paste these values into chat or into any file an agent can write.

## Bluesky

1. In Bluesky open Settings, Privacy and security, **App passwords**, then **Add App Password**. Name it `mission control`.
2. Copy the password it shows once (`xxxx-xxxx-xxxx-xxxx`). Use an app password, never your account password.
3. In `.env`: `BLUESKY_HANDLE` (your handle, like `name.bsky.social`) and `BLUESKY_APP_PASSWORD`.

Limit: 300 characters. Links in the text become clickable links.

## Mastodon

1. On your Mastodon server open Preferences, Development, **New application**.
2. Name it `mission control`. Tick only the scope **write:statuses** (untick the others).
3. Save, open the application and copy **Your access token**.
4. In `.env`: `MASTODON_INSTANCE` (your server, like `mastodon.social`) and `MASTODON_TOKEN`.

Limit: 500 characters on most servers.

## dev.to

1. On dev.to open Settings, Extensions, **Generate API key**. Describe it as `mission control`.
2. In `.env`: `DEVTO_API_KEY`.

The post is saved to dev.to as a **draft**. Open it there, check it and press **Publish** yourself.

## LinkedIn

LinkedIn needs a developer app, and its token lasts 60 days.

1. Go to the [LinkedIn developer portal](https://www.linkedin.com/developers/apps) and create an app. It needs a LinkedIn Page of the company; choose PanScience Innovations.
2. On the app's **Products** tab request **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect**. Both are free and are usually granted at once.
3. On the **Auth** tab add a redirect URL you control (for example `http://localhost:8765/callback`). Note the Client ID and Client Secret.
4. Get a token with the scope `w_member_social` (add `openid profile` as well). The easiest way is the portal's **OAuth token tools** page: create a token, tick `w_member_social`, `openid` and `profile`, sign in as the person who will post, and copy the access token. It is valid for 60 days.
5. Get your person id: call `https://api.linkedin.com/v2/userinfo` with the token (`Authorization: Bearer <token>`). The `sub` field is the id. Your author value is `urn:li:person:` followed by that id.
6. In `.env`: `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_AUTHOR` (like `urn:li:person:AbCdEf123`).

When the token expires, publishing says **token expired: reconnect**. Repeat step 4 and replace `LINKEDIN_ACCESS_TOKEN`. LinkedIn dates its API versions; if it ever refuses the version, set `LINKEDIN_API_VERSION` to a current one such as `202611`.

Limit: 3,000 characters. The first comment is not posted: copy it from the page.

## X and Reddit

These stay by hand. X charges for posting through its API, and Reddit only gives API access after an approval that a new account will not get. The Posts page keeps **Copy text**, **Open X** or **Open Reddit**, and **Mark posted** for them.

## If something goes wrong

- *Not connected*: a value is missing from `.env`. The panel names it.
- *Did not accept the credentials*: the value is wrong or was revoked. Make a new one.
- Every publish and every refusal is logged in `ops/social-log.jsonl`, and the daily metrics job (`scripts/social-metrics.mjs`, 08:00) reads the public numbers of what was published into `ops/social-metrics.jsonl`.
