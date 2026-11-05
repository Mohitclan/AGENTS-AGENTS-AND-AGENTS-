import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { claudeCli, knowledge, mail, pipeline, queue } from '../pilot-check.mjs';

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
    assert.equal(queue(root)[0].status, 'todo');
    assert.match(queue(root)[0].detail, /^1: J-1 \(needs input\)/);
  });

  it('never reads the mail password, only whether one is there', () => {
    const root = team({ 'ops/mail-config.json': JSON.stringify({ pilot: { allow_only: ['a@b.c'] }, smtp: { user: 'a@b.c' } }) });
    assert.deepEqual(mail(root, {}).map((r) => r.status), ['ok', 'todo']);
    assert.equal(mail(root, { SMTP_PASS: 'x' })[1].status, 'ok');
    writeFileSync(join(root, '.env'), 'SMTP_PASS=secret');
    assert.doesNotMatch(mail(root, {})[1].detail, /secret/);
  });
});
