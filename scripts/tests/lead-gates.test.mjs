import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

const today = new Date().toISOString().slice(0, 10);
const lead = (company, website, extra = {}) => ({
  company,
  website,
  product: 'demo',
  fit_reason: 'Ships software weekly and has a launch coming up soon.',
  evidence: [{ claim: 'Launch announced', url: `${website}/blog`, signal: 'published' }],
  score_breakdown: { icp_fit: 32, need_evidence: 24, timing: 15, reachability: 6 },
  score_rationale: 'Clear fit and a public launch.',
  contact: { name: 'Asha', role: 'Founder', channel: 'email', value: `asha@${new URL(website).hostname}`, source_url: `${website}/contact` },
  next_action: 'Draft outreach',
  researched_at: today,
  ...extra,
});
const load = () => readFileSync(repo.path('pipeline', 'leads.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const byCompany = (name) => load().find((l) => l.company === name);
const importLeads = (name, leads) => {
  writeFileSync(repo.path('pipeline', 'inbox', `${name}.jsonl`), leads.map((l) => JSON.stringify(l)).join('\n'));
  return repo.run('leads.mjs', 'import', `pipeline/inbox/${name}.jsonl`);
};
const gate = (...args) => repo.run('leads.mjs', 'gate', '--product', 'demo', ...args);

before(() => {
  writeFileSync(repo.path('knowledge', 'products', 'demo.md'), '---\nstatus: proposed\n---\n# Demo\n');
  mkdirSync(repo.path('pipeline', 'inbox'), { recursive: true });
  const r = importLeads('first', [
    lead('Go Co', 'https://go.example'),
    lead('Inferred Co', 'https://inferred.example', { evidence: [{ claim: 'Might launch', url: 'https://inferred.example/blog', signal: 'inferred' }] }),
    lead('Form Co', 'https://form.example', { contact: { channel: 'form', value: 'https://form.example/contact', source_url: 'https://form.example/contact' } }),
    lead('No Contact Co', 'https://nocontact.example', { contact: undefined }),
    lead('Stale Co', 'https://stale.example', { researched_at: '2025-01-01' }),
    lead('Tier C Co', 'https://tierc.example', { score_breakdown: { icp_fit: 10, need_evidence: 10, timing: 5, reachability: 5 } }),
    lead('Optout Co', 'https://optout.example'),
    lead('Person Co', 'https://person.example'),
  ]);
  assert.equal(r.code, 0, r.stderr);
});

describe('signal classes', () => {
  it('keeps the class on the evidence', () => assert.equal(byCompany('Go Co').evidence[0].signal, 'published'));
  it('refuses an unknown class', () => {
    const r = importLeads('bad-signal', [lead('Bad', 'https://bad.example', { evidence: [{ claim: 'x', url: 'https://bad.example', signal: 'hunch' }] })]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /signal must be one of/);
  });
});

describe('batch gate', () => {
  it('gives each lead a verdict and a reason', () => {
    const out = gate('--status', 'all').stdout;
    const line = (name) => out.split('\n').find((l) => l.includes(name));
    assert.match(line('Go Co'), /\bGo\b/);
    assert.match(line('Inferred Co'), /Conditional.*only inferred signals/);
    assert.match(line('Form Co'), /Conditional.*contact is form/);
    assert.match(line('Stale Co'), /Conditional.*recheck the evidence/);
    assert.match(line('Tier C Co'), /Conditional.*tier C/);
    assert.match(line('No Contact Co'), /Stop.*no published contact/);
  });
  it('exits 1 when any lead is a Stop', () => assert.equal(gate('--status', 'all').code, 1));
  it('looks at qualified leads by default', () => assert.match(gate().stdout, /No leads match/));
  it('passes when every lead in view is a Go or Conditional', () => {
    assert.equal(repo.run('leads.mjs', 'set-status', byCompany('Go Co').id, 'qualified').code, 0);
    assert.equal(gate().code, 0);
  });
});

describe('contact quality', () => {
  const inbox = (name, value, reachability) =>
    lead(name, `https://${name}.example`, {
      contact: { channel: 'email', value: `${value}@${name}.example`, source_url: `https://${name}.example/contact` },
      score_breakdown: { icp_fit: 32, need_evidence: 24, timing: 15, reachability },
    });
  it('caps a general inbox', () => {
    const r = importLeads('cap-general', [inbox('hellocap', 'hello', 6)]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /at most 5 for a general inbox/);
  });
  it('caps a support inbox', () => {
    const r = importLeads('cap-support', [inbox('supportcap', 'support', 4)]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /at most 3 for a support inbox/);
  });
  it('lets a general inbox reach Go, shown as general', () => {
    assert.equal(importLeads('ok-general', [inbox('generalok', 'hello', 5)]).code, 0);
    assert.match(gate('--status', 'all').stdout.split('\n').find((l) => l.includes('generalok.example') || l.includes('generalok')), /\bGo\s+general\b/);
  });
  it('never gives a support-only inbox a Go', () => {
    assert.equal(importLeads('ok-support', [inbox('supportok', 'support', 3)]).code, 0);
    assert.match(gate('--status', 'all').stdout.split('\n').find((l) => l.includes('supportok')), /Conditional\s+support.*support-only inbox/);
  });
  it('treats a named address as direct', () => assert.match(gate('--status', 'all').stdout.split('\n').find((l) => l.includes('Go Co')), /\bGo\s+direct\b/));
});

describe('suppression', () => {
  it('disqualifies open leads for a domain, and applies across imports', () => {
    assert.equal(repo.run('leads.mjs', 'suppress', 'https://www.optout.example/about', 'opted out by email on 30 Oct').code, 0);
    const l = byCompany('Optout Co');
    assert.equal(l.status, 'disqualified');
    assert.match(l.disqualify_reason, /suppressed: opted out/);
    assert.equal(repo.run('leads.mjs', 'check').code, 0);
    const r = importLeads('again', [lead('Optout Co', 'https://optout.example')]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /suppression list/);
  });
  it('covers a single email address', () => {
    assert.equal(repo.run('leads.mjs', 'suppress', 'asha@person.example', 'asked not to be contacted').code, 0);
    assert.equal(byCompany('Person Co').status, 'disqualified');
  });
  it('blocks outreach statuses even if a lead is forced back', () => {
    const id = byCompany('Optout Co').id;
    assert.equal(repo.run('leads.mjs', 'set-status', id, 'new', 'reopened').code, 0);
    assert.equal(repo.run('leads.mjs', 'set-status', id, 'qualified').code, 0);
    const r = repo.run('leads.mjs', 'set-status', id, 'drafted', 'seq', '--force');
    assert.equal(r.code, 1);
    assert.match(r.stderr, /Suppressed, never contact/);
  });
  it('shows up as a Stop in the gate', () => assert.match(gate().stdout, /Optout Co\s+suppressed|Stop.*suppressed/));
  it('needs a reason', () => assert.equal(repo.run('leads.mjs', 'suppress', 'x.example').code, 1));
  it('adds an entry only once', () => {
    repo.run('leads.mjs', 'suppress', 'twice.example', 'one');
    assert.match(repo.run('leads.mjs', 'suppress', 'twice.example', 'two').stdout, /already suppressed/);
  });
});
