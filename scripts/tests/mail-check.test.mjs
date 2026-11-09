// Mailbox readiness: SPF, DMARC and DKIM from a resolver the test passes in (never the real DNS), and the settings.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { after, describe, it } from 'node:test';
import { formatReadiness, mailReadiness } from '../mail-check.mjs';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

const GOOD = {
  'panscience.xyz': ['v=spf1 include:_spf.google.com ~all'],
  '_dmarc.panscience.xyz': ['v=DMARC1; p=none'],
  'google._domainkey.panscience.xyz': ['v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAabcdefghijklmnop'],
};
const codeError = (code) => Object.assign(new Error(code), { code });

// A resolver that answers from a table; a value that is an Error is thrown, a missing name is "no such record".
const fake = (table, asked = []) => ({
  async resolveTxt(name) {
    asked.push(name);
    const v = table[name];
    if (v instanceof Error) throw v;
    if (!v) throw codeError('ENODATA');
    return v.map((r) => [r.slice(0, 20), r.slice(20)]); // TXT answers come in chunks
  },
});

const config = () => JSON.parse(readFileSync(repo.path('ops', 'mail-config.json'), 'utf8'));
const setConfig = (c) => writeFileSync(repo.path('ops', 'mail-config.json'), JSON.stringify(c));
const item = (r, id) => r.items.find((i) => i.id === id);

describe('mail readiness: DNS', () => {
  it('is ready when SPF names Google, DMARC and DKIM exist and the settings are filled in', async () => {
    const asked = [];
    const r = await mailReadiness(repo.dir, { resolver: fake(GOOD, asked), env: { SMTP_PASS: 'x' } });
    assert.equal(r.domain, 'panscience.xyz');
    assert.deepEqual(r.items.map((i) => [i.id, i.status]), [['spf', 'ok'], ['dmarc', 'ok'], ['dkim', 'ok'], ['sender', 'ok'], ['limit', 'ok'], ['imap', 'ok'], ['password', 'ok']]);
    assert.equal(r.ok, true);
    assert.deepEqual(asked.sort(), ['_dmarc.panscience.xyz', 'google._domainkey.panscience.xyz', 'panscience.xyz'], 'looks up the sender domain only');
  });

  it('says what to add for each record that is missing, in one sentence', async () => {
    const r = await mailReadiness(repo.dir, { resolver: fake({}), env: { SMTP_PASS: 'x' } });
    assert.deepEqual(['spf', 'dmarc', 'dkim'].map((id) => item(r, id).status), ['missing', 'missing', 'missing']);
    assert.match(item(r, 'spf').fix, /TXT record on panscience\.xyz.*include:_spf\.google\.com/);
    assert.match(item(r, 'dmarc').fix, /_dmarc\.panscience\.xyz.*v=DMARC1/);
    assert.match(item(r, 'dkim').fix, /google\._domainkey\.panscience\.xyz/);
    assert.equal(r.ok, false);
    assert.equal(r.missing, 3);
    for (const i of r.items.filter((x) => x.status !== 'ok')) assert.equal(i.fix.split(/\.\s/).length, 1, `one sentence: ${i.fix}`);
  });

  it('finds an SPF record that does not let Google send, and two SPF records', async () => {
    const other = await mailReadiness(repo.dir, { resolver: fake({ ...GOOD, 'panscience.xyz': ['v=spf1 include:mailgun.org ~all'] }), env: { SMTP_PASS: 'x' } });
    assert.equal(item(other, 'spf').status, 'missing');
    assert.match(item(other, 'spf').fix, /Add include:_spf\.google\.com to the SPF record/);
    const two = await mailReadiness(repo.dir, { resolver: fake({ ...GOOD, 'panscience.xyz': ['v=spf1 include:_spf.google.com ~all', 'v=spf1 include:mailgun.org ~all'] }), env: { SMTP_PASS: 'x' } });
    assert.match(item(two, 'spf').fix, /one/);
    const unrelated = await mailReadiness(repo.dir, { resolver: fake({ ...GOOD, 'panscience.xyz': ['google-site-verification=abc', 'v=spf1 include:_spf.google.com -all'] }), env: { SMTP_PASS: 'x' } });
    assert.equal(item(unrelated, 'spf').status, 'ok', 'other TXT records on the domain are ignored');
  });

  it('treats a DKIM record with no key as missing', async () => {
    const r = await mailReadiness(repo.dir, { resolver: fake({ ...GOOD, 'google._domainkey.panscience.xyz': ['v=DKIM1; k=rsa; p='] }), env: { SMTP_PASS: 'x' } });
    assert.equal(item(r, 'dkim').status, 'missing');
  });

  it('reports a failed lookup as "couldn\'t check", never as missing and never as a crash', async () => {
    const down = { 'panscience.xyz': codeError('ETIMEOUT'), '_dmarc.panscience.xyz': codeError('ECONNREFUSED'), 'google._domainkey.panscience.xyz': new Error('boom') };
    const r = await mailReadiness(repo.dir, { resolver: fake(down), env: { SMTP_PASS: 'x' } });
    assert.deepEqual(['spf', 'dmarc', 'dkim'].map((id) => item(r, id).status), ['unknown', 'unknown', 'unknown']);
    assert.match(item(r, 'spf').fix, /^Couldn't check SPF \(ETIMEOUT\)/);
    assert.equal(r.unknown, 3);
    assert.equal(r.ok, false, 'not ready until it has been checked');
    assert.equal(item(r, 'sender').status, 'ok', 'the settings are still checked');
  });

  it('gives up on a resolver that never answers', async () => {
    const hang = { resolveTxt: () => new Promise(() => {}) };
    const r = await mailReadiness(repo.dir, { resolver: hang, env: { SMTP_PASS: 'x' }, timeoutMs: 30 });
    assert.deepEqual(['spf', 'dmarc', 'dkim'].map((id) => item(r, id).status), ['unknown', 'unknown', 'unknown']);
    assert.match(item(r, 'spf').fix, /ETIMEOUT/);
  });

  it('can skip DNS altogether', async () => {
    const r = await mailReadiness(repo.dir, { resolver: null, env: { SMTP_PASS: 'x' } });
    assert.deepEqual(['spf', 'dmarc', 'dkim'].map((id) => item(r, id).status), ['unknown', 'unknown', 'unknown']);
  });
});

describe('mail readiness: settings', () => {
  const original = config();
  const check = async (change, env = { SMTP_PASS: 'x' }) => {
    const c = structuredClone(original);
    change(c);
    setConfig(c);
    try {
      return await mailReadiness(repo.dir, { resolver: fake(GOOD), env });
    } finally {
      setConfig(original);
    }
  };

  it('wants the sender name, role, company and email filled in', async () => {
    const r = await check((c) => { c.sender.role = ''; c.sender.company = '{{COMPANY_NAME}}'; });
    assert.equal(item(r, 'sender').status, 'missing');
    assert.match(item(r, 'sender').fix, /sender role, company/);
  });

  it('wants a daily limit of 20 or less while the mailbox warms up', async () => {
    assert.equal(item(await check((c) => { c.daily_limit = 20; }), 'limit').status, 'ok');
    assert.equal(item(await check((c) => { c.daily_limit = 5; }), 'limit').status, 'ok');
    const high = item(await check((c) => { c.daily_limit = 21; }), 'limit');
    assert.equal(high.status, 'missing');
    assert.match(high.fix, /20 or less/);
    assert.equal(item(await check((c) => { delete c.daily_limit; }), 'limit').status, 'missing');
    assert.equal(item(await check((c) => { c.daily_limit = 0; }), 'limit').status, 'missing');
  });

  it('wants the IMAP settings, and a mail password', async () => {
    const r = await check((c) => { delete c.imap; }, {});
    assert.equal(item(r, 'imap').status, 'missing');
    assert.equal(item(r, 'password').status, 'missing');
    assert.match(item(r, 'password').fix, /SMTP_PASS/);
    assert.equal(item(await check((c) => { c.imap.port = 0; }), 'imap').status, 'missing');
  });

  it('does not run without the settings file', async () => {
    const copy = makeCopy();
    try {
      writeFileSync(copy.path('ops', 'mail-config.json'), '{ not json');
      const r = await mailReadiness(copy.dir, { resolver: fake(GOOD), env: {} });
      assert.deepEqual(r.items.map((i) => [i.id, i.status]), [['config', 'missing']]);
    } finally {
      copy.remove();
    }
  });

  it('prints a checklist a person can read', async () => {
    const r = await mailReadiness(repo.dir, { resolver: fake({ 'panscience.xyz': ['v=spf1 include:_spf.google.com ~all'] }), env: {} });
    const text = formatReadiness(r);
    assert.match(text, /Mailbox readiness for panscience\.xyz/);
    assert.match(text, /ok\s+SPF on panscience\.xyz/);
    assert.match(text, /MISSING\s+DMARC on panscience\.xyz/);
    assert.match(text, /\d+ missing, 0 could not be checked\./);
  });
});
