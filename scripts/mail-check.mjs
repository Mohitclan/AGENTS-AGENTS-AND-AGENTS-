#!/usr/bin/env node
// Is the sending mailbox ready for real email? Checks the sender's domain in DNS (SPF, DMARC, DKIM) and the
// settings in ops/mail-config.json, and says for each item whether it is ok or missing and what to do about it
// in one sentence. Mission control's Emails page shows the same list beside the "End the pilot" button.
//
//   node scripts/mail-check.mjs           print the checklist (exit 1 while anything is not ok)
//   node scripts/mail-check.mjs --json    the same as JSON
//
// A DNS lookup that fails for any reason other than "no such record" (no network, a timeout, a resolver
// error) is reported as "couldn't check", never as missing and never as a crash.
//
// Exports: mailReadiness(root, { resolver, env, timeoutMs }) -> { domain, items, ok, missing, unknown, checkedAt };
// each item is { id, label, status: 'ok' | 'missing' | 'unknown', detail, fix }. formatReadiness(result)
// -> text. The resolver is anything with resolveTxt(name) (node:dns's promises API); a test passes its own.
// Pass resolver: null to skip DNS (every DNS item is then "couldn't check").
import dns from 'node:dns';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, isMain, loadMailSecret } from './_shared.mjs';

const GOOGLE_SPF = '_spf.google.com';
const WARMUP_LIMIT = 20; // emails a day while a new mailbox warms up
const LOOKUP_MS = 5000;
// Answers that mean "the record isn't there", as opposed to "the lookup didn't work".
const NO_RECORD = new Set(['ENODATA', 'ENOTFOUND', 'NXDOMAIN']);

const item = (id, label, status, detail, fix = '') => ({ id, label, status, detail, fix });

function defaultResolver() {
  return new dns.promises.Resolver({ timeout: 3000, tries: 2 });
}

// The TXT records at a name, each as one string: { records } or { error: 'missing' | 'unknown', why }.
async function lookupTxt(resolver, name, ms) {
  if (!resolver) return { error: 'unknown', why: 'DNS lookups are switched off' };
  let timer;
  try {
    const rows = await Promise.race([
      resolver.resolveTxt(name),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('timed out'), { code: 'ETIMEOUT' })), ms); }),
    ]);
    return { records: (rows || []).map((chunks) => [].concat(chunks).join('')) };
  } catch (error) {
    const code = error?.code || '';
    return NO_RECORD.has(code) ? { error: 'missing', why: 'no such record' } : { error: 'unknown', why: code || error?.message || 'the lookup failed' };
  } finally {
    clearTimeout(timer);
  }
}

const unknownFix = (what, why) => `Couldn't check ${what} (${why}): try again in a minute, or look the record up yourself.`;

function checkSpf(domain, found) {
  const label = `SPF on ${domain}`;
  if (found.error === 'unknown') return item('spf', label, 'unknown', found.why, unknownFix('SPF', found.why));
  const spf = (found.records || []).filter((r) => /^v=spf1(\s|$)/i.test(r.trim()));
  if (!spf.length) return item('spf', label, 'missing', 'no SPF record', `Add a TXT record on ${domain} with the value "v=spf1 include:${GOOGLE_SPF} ~all".`);
  if (spf.length > 1) return item('spf', label, 'missing', `${spf.length} SPF records`, `Merge the SPF records on ${domain} into one, because a domain may have only one.`);
  const hasGoogle = new RegExp(`(include:|redirect=)${GOOGLE_SPF.replace('.', '\\.')}(\\s|$)`, 'i').test(spf[0]);
  return hasGoogle
    ? item('spf', label, 'ok', spf[0].trim())
    : item('spf', label, 'missing', `${spf[0].trim()} (no Google include)`, `Add include:${GOOGLE_SPF} to the SPF record on ${domain}, so Google may send for it.`);
}

function checkDmarc(domain, found) {
  const label = `DMARC on ${domain}`;
  if (found.error === 'unknown') return item('dmarc', label, 'unknown', found.why, unknownFix('DMARC', found.why));
  const dmarc = (found.records || []).filter((r) => /^v=DMARC1\b/i.test(r.trim()));
  if (!dmarc.length) return item('dmarc', label, 'missing', 'no DMARC record', `Add a TXT record at _dmarc.${domain} with the value "v=DMARC1; p=none" to start, then tighten it once mail is flowing.`);
  if (dmarc.length > 1) return item('dmarc', label, 'missing', `${dmarc.length} DMARC records`, `Keep one DMARC record at _dmarc.${domain}, because receivers ignore the domain's policy when there are several.`);
  return item('dmarc', label, 'ok', dmarc[0].trim());
}

function checkDkim(domain, found) {
  const label = `DKIM on ${domain}`;
  if (found.error === 'unknown') return item('dkim', label, 'unknown', found.why, unknownFix('DKIM', found.why));
  const key = (found.records || []).find((r) => /\bp=[A-Za-z0-9+/=\s]{20,}/.test(r));
  if (!key) return item('dkim', label, 'missing', `no DKIM key at google._domainkey.${domain}`, `Turn on DKIM in the Google Workspace Admin console (Gmail, Authenticate email) and add the TXT record it shows at google._domainkey.${domain}.`);
  return item('dkim', label, 'ok', `a key is published at google._domainkey.${domain}`);
}

// A setting someone really filled in: not empty and not a leftover placeholder.
const filled = (v) => typeof v === 'string' && v.trim() !== '' && !/\{\{|^\s*(todo|tbd|changeme|xxx)\s*$|^\s*your[ -]/i.test(v);

function checkConfig(config, env, root) {
  const out = [];
  const sender = config.sender || {};
  const empty = ['name', 'role', 'company', 'email'].filter((k) => !filled(sender[k]));
  out.push(empty.length
    ? item('sender', 'Sender details', 'missing', `not filled in: ${empty.join(', ')}`, `Fill in sender ${empty.join(', ')} in ops/mail-config.json, because they go into every signature.`)
    : item('sender', 'Sender details', 'ok', `${sender.name}, ${sender.role}, ${sender.company} <${sender.email}>`));
  const limit = config.daily_limit;
  if (!(Number(limit) > 0)) out.push(item('limit', 'Daily limit', 'missing', 'no daily_limit', `Set daily_limit in ops/mail-config.json to ${WARMUP_LIMIT} or less while the mailbox warms up.`));
  else if (Number(limit) > WARMUP_LIMIT) out.push(item('limit', 'Daily limit', 'missing', `${limit} a day`, `Lower daily_limit in ops/mail-config.json to ${WARMUP_LIMIT} or less until the mailbox has warmed up.`));
  else out.push(item('limit', 'Daily limit', 'ok', `${limit} live emails a day at most`));
  const imap = config.imap || {};
  out.push(filled(imap.host) && Number(imap.port) > 0
    ? item('imap', 'Inbox settings (IMAP)', 'ok', `${imap.host}:${imap.port}`)
    : item('imap', 'Inbox settings (IMAP)', 'missing', 'host or port not set', 'Add imap host and port (imap.gmail.com, 993) to ops/mail-config.json, so replies can be read.'));
  out.push(loadMailSecret(root, env)
    ? item('password', 'Mail password', 'ok', 'set (not shown)')
    : item('password', 'Mail password', 'missing', 'no SMTP_PASS', 'Add SMTP_PASS (a Google app password) to the environment or to the git-ignored .env file.'));
  return out;
}

export async function mailReadiness(root = ROOT, { resolver, env = process.env, timeoutMs = LOOKUP_MS } = {}) {
  let config = null;
  try {
    config = JSON.parse(readFileSync(join(root, 'ops', 'mail-config.json'), 'utf8'));
  } catch {
    config = null;
  }
  const items = [];
  const domain = /^[^@\s]+@([^@\s]+\.[^@\s]+)$/.exec(String(config?.sender?.email || '').trim())?.[1]?.toLowerCase() || '';
  if (!config) {
    items.push(item('config', 'Mail settings', 'missing', 'ops/mail-config.json cannot be read', 'Restore ops/mail-config.json, which holds the sender and the SMTP and IMAP settings.'));
  } else if (!domain) {
    for (const [id, name] of [['spf', 'SPF'], ['dmarc', 'DMARC'], ['dkim', 'DKIM']]) items.push(item(id, `${name} on the sender's domain`, 'unknown', 'no sender address', `Fill in sender email in ops/mail-config.json first, so the ${name} record can be looked up.`));
  } else {
    const r = resolver === undefined ? defaultResolver() : resolver;
    const [spf, dmarc, dkim] = await Promise.all([lookupTxt(r, domain, timeoutMs), lookupTxt(r, `_dmarc.${domain}`, timeoutMs), lookupTxt(r, `google._domainkey.${domain}`, timeoutMs)]);
    items.push(checkSpf(domain, spf), checkDmarc(domain, dmarc), checkDkim(domain, dkim));
  }
  if (config) items.push(...checkConfig(config, env, root));
  const count = (s) => items.filter((i) => i.status === s).length;
  return { domain, items, ok: items.every((i) => i.status === 'ok'), missing: count('missing'), unknown: count('unknown'), checkedAt: new Date().toISOString() };
}

export function formatReadiness(result) {
  const mark = { ok: 'ok     ', missing: 'MISSING', unknown: 'UNKNOWN' };
  const lines = [`Mailbox readiness${result.domain ? ` for ${result.domain}` : ''}`, ''];
  for (const i of result.items) {
    lines.push(`  ${mark[i.status]}  ${i.label}${i.detail ? `: ${i.detail}` : ''}`);
    if (i.fix) lines.push(`           ${i.fix}`);
  }
  lines.push('', result.ok ? 'Everything checked is ok.' : `${result.missing} missing, ${result.unknown} could not be checked.`);
  return lines.join('\n');
}

async function main() {
  const result = await mailReadiness(ROOT);
  console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : formatReadiness(result));
  process.exitCode = result.ok ? 0 : 1;
}

if (isMain(import.meta.url)) await main();
