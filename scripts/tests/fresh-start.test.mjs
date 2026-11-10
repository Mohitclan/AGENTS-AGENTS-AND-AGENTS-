import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { freshPlan, freshStart, heading } from '../fresh-start.mjs';

let root;
let backup;
const put = (rel, text) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};
const read = (rel) => readFileSync(join(root, rel), 'utf8');

describe('fresh start', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fresh-'));
    backup = mkdtempSync(join(tmpdir(), 'fresh-backup-'));
    put('pipeline/leads.jsonl', '{"id":"L-1"}\n');
    put('pipeline/inbox/a.jsonl', '{}\n');
    put('pipeline/suppression.jsonl', '{"email":"no@x.test"}\n');
    put('pipeline/lead-schema.md', '# Schema\n');
    put('outputs/outreach/L-1.md', 'draft');
    put('outputs/reports/J-1.md', 'report');
    put('outputs/seo/README.md', '# SEO\n');
    put('ops/queue.json', '[{"id":"J-1"}]\n');
    put('ops/send-log.jsonl', '{}\n');
    put('ops/runs/J-1.log', 'log');
    put('ops/board.md', '# Task board\n\nIntro.\n\n| Task | Agent |\n|---|---|\n| T-1 | outreach |\n');
    put('ops/schedule.json', JSON.stringify([{ id: 'nightly', enabled: false, last_run: '2026-11-10T00:00:00Z', last_note: 'ran' }]));
    put('ops/mail-config.json', '{"smtp":{}}');
    put('ops/confirmations.jsonl', '{"file":"knowledge/products/x.md"}\n');
    put('knowledge/products/motionrepo.md', 'facts');
    put('memory/MAIN.md', '# Main memory\n');
    put('.claude/agent-memory/outreach/MEMORY.md', 'lessons');
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(backup, { recursive: true, force: true });
  });

  it('only shows what it would clear until asked', () => {
    const plan = freshPlan(root);
    assert.ok(plan.move.some((m) => m.path === 'pipeline/inbox' && m.files === 1));
    assert.deepEqual(plan.outputs.sort(), ['outputs/outreach/L-1.md', 'outputs/reports/J-1.md']);
    assert.deepEqual(plan.reset, ['ops/board.md']);
    assert.ok(existsSync(join(root, 'pipeline/leads.jsonl')));
  });

  it('moves the data and logs to the backup, and keeps opt-outs, knowledge, memory and settings', () => {
    const r = freshStart(root, { backup });
    assert.equal(r.backup, backup);
    for (const gone of ['pipeline/leads.jsonl', 'pipeline/inbox/a.jsonl', 'outputs/outreach/L-1.md', 'outputs/reports/J-1.md', 'ops/send-log.jsonl', 'ops/runs/J-1.log']) {
      assert.ok(!existsSync(join(root, gone)), gone);
      assert.ok(existsSync(join(backup, gone)), `backed up: ${gone}`);
    }
    for (const kept of ['pipeline/suppression.jsonl', 'pipeline/lead-schema.md', 'outputs/seo/README.md', 'ops/mail-config.json', 'ops/confirmations.jsonl', 'knowledge/products/motionrepo.md', 'memory/MAIN.md', '.claude/agent-memory/outreach/MEMORY.md']) {
      assert.ok(existsSync(join(root, kept)), kept);
    }
    assert.equal(read('ops/queue.json'), '[]\n');
    assert.equal(read('ops/board.md'), '# Task board\n\nIntro.\n\n| Task | Agent |\n|---|---|\n');
    assert.match(readFileSync(join(backup, 'ops/board.md'), 'utf8'), /T-1/);
    assert.deepEqual(JSON.parse(read('ops/schedule.json')), [{ id: 'nightly', enabled: false, last_run: null }]);
  });

  it('refuses while a task is running', () => {
    put('ops/runs/jarvis.lock', String(process.pid));
    assert.throws(() => freshStart(root, { backup }), /A task is running/);
    assert.ok(existsSync(join(root, 'pipeline/leads.jsonl')));
  });

  it('keeps a log heading up to its table row', () => assert.equal(heading('# A\n\n| x |\n|---|\n| 1 |\n'), '# A\n\n| x |\n|---|\n'));
});
