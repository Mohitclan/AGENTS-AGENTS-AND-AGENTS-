import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { loadSecret } from '../_shared.mjs';
import { SETUP_DOC, accountsState, connected } from '../social-accounts.mjs';

const root = mkdtempSync(join(tmpdir(), 'social-accounts-'));

describe('loadSecret', () => {
  it('reads the environment first, then .env (quotes and export allowed), and never an invalid name', () => {
    writeFileSync(join(root, '.env'), 'DEVTO_API_KEY="from-file"\nexport MASTODON_TOKEN = tok\n# BLUESKY_HANDLE=commented\n');
    assert.equal(loadSecret('DEVTO_API_KEY', root, {}), 'from-file');
    assert.equal(loadSecret('DEVTO_API_KEY', root, { DEVTO_API_KEY: ' from-env ' }), 'from-env');
    assert.equal(loadSecret('MASTODON_TOKEN', root, {}), 'tok');
    assert.equal(loadSecret('BLUESKY_HANDLE', root, {}), '');
    assert.equal(loadSecret('not a name(', root, {}), '');
    rmSync(join(root, '.env'));
  });
});

describe('accountsState', () => {
  it('says per channel which variables are set, never their values, and what to do', () => {
    const env = { BLUESKY_HANDLE: 'a.bsky.social', BLUESKY_APP_PASSWORD: 'secret-value', LINKEDIN_AUTHOR: 'urn:li:person:1' };
    const s = accountsState(root, env);
    assert.deepEqual(s.map((a) => a.id), ['bluesky', 'mastodon', 'devto', 'linkedin', 'x', 'reddit']);
    const by = Object.fromEntries(s.map((a) => [a.id, a]));
    assert.equal(by.bluesky.connected, true);
    assert.deepEqual(by.bluesky.vars, [{ name: 'BLUESKY_HANDLE', set: true }, { name: 'BLUESKY_APP_PASSWORD', set: true }]);
    assert.equal(by.linkedin.connected, false, 'half a login is not connected');
    assert.deepEqual(by.linkedin.missing, ['LINKEDIN_ACCESS_TOKEN']);
    assert.match(by.linkedin.todo, /Set LINKEDIN_ACCESS_TOKEN in \.env/);
    assert.equal(by.devto.connected, false);
    assert.equal(by.devto.setup, `${SETUP_DOC}#devto`);
    for (const id of ['x', 'reddit']) assert.deepEqual([by[id].publish, by[id].connected, by[id].setup], [false, false, `${SETUP_DOC}#x-and-reddit`]);
    assert.doesNotMatch(JSON.stringify(s), /secret-value|a\.bsky\.social|urn:li:person/);
    assert.equal(connected(root, 'bluesky', env), true);
    assert.equal(connected(root, 'x', env), false);
  });

  it('reads .env too, and the setup doc has a section for every channel', async () => {
    writeFileSync(join(root, '.env'), 'DEVTO_API_KEY=k\n');
    assert.equal(accountsState(root, {}).find((a) => a.id === 'devto').connected, true);
    const { readFileSync } = await import('node:fs');
    const doc = readFileSync(new URL('../../docs/SOCIAL-SETUP.md', import.meta.url), 'utf8');
    for (const h of ['## Bluesky', '## Mastodon', '## dev.to', '## LinkedIn', '## X and Reddit', 'write:statuses', 'Share on LinkedIn', 'Sign In with LinkedIn using OpenID Connect', 'w_member_social', 'urn:li:person:']) assert.ok(doc.includes(h), h);
    rmSync(root, { recursive: true, force: true });
  });
});
