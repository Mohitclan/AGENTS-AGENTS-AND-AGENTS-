import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { resolveClaude, workspaceTrusted } from '../_shared.mjs';
import { claudeCli, knowledge, mail, pipeline, queue, senderAuth, trust } from '../pilot-check.mjs';

function team(files) {
  const root = mkdtempSync(join(tmpdir(), 'pilot-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

describe('pilot check', () => {
  it('flags a missing Claude Code command line as a todo', () => {
    assert.equal(claudeCli({ CLAUDE_BIN: '/nope/claude' }).status, 'todo');
  });

  it('wants confirmed knowledge and warns when it is stale', () => {
    const root = team({
      'knowledge/company.md': '---\nstatus: confirmed\nlast_verified: 2020-01-01\n---\n',
      'knowledge/products/motionrepo.md': '---\nstatus: proposed\n---\n',
    });
    assert.deepEqual(knowledge(root).map((r) => r.status), ['warn', 'todo', 'todo']);
  });

  it('counts leads still in play and tasks waiting on a person', () => {
    const root = team({
      'pipeline/leads.jsonl': `${JSON.stringify({ status: 'qualified' })}\n${JSON.stringify({ status: 'disqualified' })}\n`,
      'ops/queue.json': JSON.stringify([{ id: 'J-1', status: 'needs_input' }, { id: 'J-2', status: 'done' }]),
    });
    assert.match(pipeline(root).detail, /^2 real leads .* 1 still in play/);
    assert.equal(queue(root)[0].status, 'warn'); // old tasks are worth a look, but they don't stop a hands-off run
    assert.match(queue(root)[0].detail, /^1: J-1 \(needs input\)/);
  });

  it('never reads the mail password, only whether one is there', () => {
    const root = team({ 'ops/mail-config.json': JSON.stringify({ pilot: { allow_only: ['a@b.c'] }, smtp: { user: 'a@b.c' } }) });
    assert.deepEqual(mail(root, {}).map((r) => r.status), ['ok', 'warn', 'todo']);
    assert.equal(mail(root, { SMTP_PASS: 'x' })[2].status, 'ok');
    writeFileSync(join(root, '.env'), 'SMTP_PASS=secret');
    assert.doesNotMatch(mail(root, {})[2].detail, /secret/);
  });

  it('says whether test emails go out by themselves, and to whom', () => {
    const root = team({ 'ops/mail-config.json': JSON.stringify({ pilot: { allow_only: ['a@b.c'], test_recipients: ['a@b.c'], auto_test_sends: true } }) });
    assert.equal(mail(root, {})[1].status, 'ok');
    assert.match(mail(root, {})[1].detail, /a@b\.c as \[TEST\] copies, with no questions/);
  });

  it('reads the sender domain records: no SPF is a warning, a full set is ok', () => {
    const full = { spf: ['v=spf1 include:_spf.google.com ~all'], dkim: ['v=DKIM1; k=rsa; p=abc'], dmarc: ['v=DMARC1; p=none'] };
    assert.deepEqual(senderAuth('x.test', full).map((r) => r.status), ['ok', 'ok', 'ok']);
    const noSpf = senderAuth('x.test', { ...full, spf: ['google-site-verification=abc'] });
    assert.deepEqual(noSpf.map((r) => r.status), ['warn', 'ok', 'ok']);
    assert.match(noSpf[0].detail, /v=spf1 include:_spf\.google\.com/);
    assert.deepEqual(senderAuth('x.test', {}).map((r) => r.status), ['warn', 'warn', 'warn']);
  });
});

describe('finding Claude Code and its trust', () => {
  const home = (files) => team(files);
  it('uses CLAUDE_BIN first, then the PATH, then where the installers put it', () => {
    const h = home({ '.claude-cli/bin/claude': '#!/bin/sh\n', 'bin/claude': '#!/bin/sh\n' });
    assert.equal(resolveClaude({ CLAUDE_BIN: '/x/claude' }, h), '/x/claude');
    assert.equal(resolveClaude({ PATH: join(h, 'bin') }, h), join(h, 'bin', 'claude'));
    assert.equal(resolveClaude({ PATH: '' }, h), join(h, '.claude-cli', 'bin', 'claude'));
    assert.equal(resolveClaude({ PATH: '' }, home({})), process.platform === 'win32' || !['/opt/homebrew/bin/claude', '/usr/local/bin/claude'].some((f) => existsSync(f)) ? 'claude' : resolveClaude({ PATH: '' }, home({})));
  });

  it('trusts a folder Claude Code was told to trust, or one above it, and not others', () => {
    const h = home({ '.claude.json': JSON.stringify({ projects: { '/work/team': { hasTrustDialogAccepted: true }, '/other': { hasTrustDialogAccepted: false } } }) });
    assert.equal(workspaceTrusted('/work/team', h), true);
    assert.equal(workspaceTrusted('/work/team/sub/folder', h), true);
    assert.equal(workspaceTrusted('/other', h), false);
    assert.equal(workspaceTrusted('/elsewhere', h), false);
    assert.equal(workspaceTrusted('/work/team', home({})), null, 'no settings file: unknown, not untrusted');
    assert.equal(trust('/elsewhere', h).status, 'todo');
    assert.equal(trust('/work/team', h).status, 'ok');
    assert.equal(trust('/work/team', home({})).status, 'warn');
  });
});
