// Which social accounts mission control can publish to: the Connected accounts panel on the Posts page.
// A channel is connected when every variable it needs is set in the environment or in the git-ignored .env. This
// module only says which variables are set, never their values, and it makes no network call.
//
// Exports:
//   SOCIAL                       per channel: label, the variables it needs, whether it can be published to
//   accountsState(root, env)     [{ id, label, publish, connected, vars: [{ name, set }], missing, todo, setup }]
//   connected(root, channel, env)  true when the channel can be published to and all its variables are set
import { ROOT, loadSecret } from './_shared.mjs';

export const SETUP_DOC = 'docs/SOCIAL-SETUP.md';

export const SOCIAL = {
  bluesky: { label: 'Bluesky', vars: ['BLUESKY_HANDLE', 'BLUESKY_APP_PASSWORD'], anchor: 'bluesky', how: 'Publishes the post.' },
  mastodon: { label: 'Mastodon', vars: ['MASTODON_INSTANCE', 'MASTODON_TOKEN'], anchor: 'mastodon', how: 'Publishes the post.' },
  devto: { label: 'dev.to', vars: ['DEVTO_API_KEY'], anchor: 'devto', how: 'Saves a draft on dev.to: you press Publish there.' },
  linkedin: { label: 'LinkedIn', vars: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR'], anchor: 'linkedin', how: 'Publishes the post. The token lasts 60 days.' },
  x: { label: 'X', vars: [], anchor: 'x-and-reddit', manual: 'X charges for its posting API: copy the text and post it yourself.' },
  reddit: { label: 'Reddit', vars: [], anchor: 'x-and-reddit', manual: 'Reddit needs approval for its API: copy the text and post it yourself.' },
};

export function accountsState(root = ROOT, env = process.env) {
  return Object.entries(SOCIAL).map(([id, c]) => {
    const vars = c.vars.map((name) => ({ name, set: !!loadSecret(name, root, env) }));
    const missing = vars.filter((v) => !v.set).map((v) => v.name);
    const publish = !c.manual;
    const isOn = publish && !missing.length;
    return {
      id,
      label: c.label,
      publish,
      connected: isOn,
      vars,
      missing,
      todo: c.manual || (isOn ? c.how : `Set ${missing.join(' and ')} in .env, then check again.`),
      setup: `${SETUP_DOC}#${c.anchor}`,
    };
  });
}

export const connected = (root, channel, env = process.env) => !!accountsState(root, env).find((a) => a.id === channel)?.connected;
