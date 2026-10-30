import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

const lead = (company, website, parts) => ({
  company,
  website,
  product: 'demo',
  fit_reason: 'Sells online and is hiring a support lead to handle volume.',
  evidence: [{ claim: 'Hiring a support lead', url: `${website}/careers` }],
  score_breakdown: parts,
  score_rationale: 'Clear fit and a public hiring signal.',
  next_action: 'Draft outreach',
  researched_at: '2026-10-29',
});
const leads = () => readFileSync(repo.path('pipeline', 'leads.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const status = (...args) => repo.run('leads.mjs', 'set-status', ...args).code;
let a;
let b;

before(() => {
  writeFileSync(repo.path('knowledge', 'products', 'demo.md'), '---\nstatus: proposed\n---\n# Demo\n');
  mkdirSync(repo.path('pipeline', 'inbox'), { recursive: true });
  writeFileSync(
    repo.path('pipeline', 'inbox', 'batch.jsonl'),
    [
      lead('=HYPERLINK("http://x","click")', 'https://example.com', { icp_fit: 32, need_evidence: 24, timing: 15, reachability: 6 }),
      lead('Other Co', 'https://other.example', { icp_fit: 10, need_evidence: 10, timing: 5, reachability: 5 }),
    ]
      .map((l) => JSON.stringify(l))
      .join('\n'),
  );
  const r = repo.run('leads.mjs', 'import', 'pipeline/inbox/batch.jsonl');
  assert.equal(r.code, 0, r.stderr);
  [a, b] = leads().map((l) => l.id);
});

describe('status order', () => {
  it('refuses new -> contacted', () => assert.equal(status(a, 'contacted', 'sent'), 1));
  it('allows new -> qualified -> drafted', () => {
    assert.equal(status(a, 'qualified'), 0);
    assert.equal(status(a, 'drafted', 'sequence written'), 0);
  });
  it('allows the same status again as a note', () => assert.equal(status(a, 'drafted', 'sequence v2'), 0));
  it('refuses drafted -> won', () => assert.equal(status(a, 'won', 'x'), 1));
  it('allows it with --force and records that', () => {
    assert.equal(status(a, 'won', 'correcting a mistake', '--force'), 0);
    const last = leads()[0].history.at(-1);
    assert.equal(last.forced, true);
    assert.equal(last.note, 'correcting a mistake');
  });
  it('changes nothing when one id in a list is refused', () => {
    assert.equal(status(`${a},${b}`, 'qualified'), 1);
    assert.equal(leads()[1].status, 'new');
  });
  it('refuses unknown ids', () => assert.equal(status('L-nope', 'qualified'), 1));
  it('clears the disqualify reason when a lead is reopened', () => {
    assert.equal(status(b, 'disqualified', 'not a fit'), 0);
    assert.equal(status(b, 'new', 'reopened'), 0);
    assert.equal(leads()[1].disqualify_reason, undefined);
  });
  it('still passes the full check', () => assert.equal(repo.run('leads.mjs', 'check').code, 0));
});

describe('csv', () => {
  it('escapes values that spreadsheets would run as formulas', () => {
    const csv = readFileSync(repo.path('pipeline', 'leads.csv'), 'utf8');
    assert.match(csv, /"'=HYPERLINK\(""http:\/\/x"",""click""\)"/);
  });
});

describe('lock', () => {
  it('is released after each run', () => assert.equal(existsSync(repo.path('pipeline', 'leads.lock')), false));
  it('is released after a run that fails', () => {
    assert.equal(status(a, 'qualified'), 1);
    assert.equal(existsSync(repo.path('pipeline', 'leads.lock')), false);
  });
  it('keeps every change when eight runs write at once', async () => {
    const codes = await Promise.all(Array.from({ length: 8 }, (_, i) => repo.runAsync('leads.mjs', 'set-status', b, 'new', `parallel ${i}`)));
    assert.deepEqual(codes, Array(8).fill(0));
    assert.equal(leads()[1].history.filter((h) => /^parallel/.test(h.note)).length, 8);
  });
  it('takes over a stale lock', () => {
    const lock = repo.path('pipeline', 'leads.lock');
    writeFileSync(lock, '1\n');
    const old = new Date(Date.now() - 10 * 60_000);
    utimesSync(lock, old, old);
    assert.equal(status(b, 'new', 'after a stale lock'), 0);
  });
});
