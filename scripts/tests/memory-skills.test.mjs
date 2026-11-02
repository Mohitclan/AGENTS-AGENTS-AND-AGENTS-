import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { after, describe, it } from 'node:test';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

const memory = (...args) => repo.run('memory.mjs', ...args);
const skills = (...args) => repo.run('skills.mjs', ...args);
const text = (...p) => readFileSync(repo.path(...p), 'utf8');

describe('memory', () => {
  it('adds to a main memory section', () => {
    const r = memory('add', 'main', 'Founders reply to every lead within a day', '--source', 'told by Mohit on 2026-10-30', '--by', 'test', '--section', 'preferences');
    assert.equal(r.code, 0, r.stderr);
    const main = text('memory', 'MAIN.md');
    const preferences = main.slice(main.indexOf('## Preferences'), main.indexOf('## Lessons'));
    assert.match(preferences, /- \d{4}-\d{2}-\d{2} · Founders reply to every lead within a day \(source: told by Mohit on 2026-10-30 · by: test\)/);
  });
  it('needs a source', () => assert.equal(memory('add', 'main', 'No source here', '--by', 'test').code, 1));
  it('needs an author', () => assert.equal(memory('add', 'main', 'No author here', '--source', 'x').code, 1));
  it('refuses secrets', () => assert.equal(memory('add', 'main', 'api_key: abc123', '--source', 'x', '--by', 'test').code, 1));
  it("doesn't add a duplicate", () => {
    memory('add', 'main', 'Founders reply to every lead within a day', '--source', 'x', '--by', 'test');
    assert.equal(text('memory', 'MAIN.md').match(/Founders reply/g).length, 1);
  });
  it("creates an agent's memory file", () => {
    assert.equal(memory('add', 'outreach', 'Indian D2C founders answer on LinkedIn more than email', '--source', 'outputs/reviews/T-1-r1.md', '--by', 'coordinator').code, 0);
    assert.match(text('.claude', 'agent-memory', 'outreach', 'MEMORY.md'), /^# outreach memory[\s\S]*- \d{4}-\d{2}-\d{2} · Indian D2C founders/);
  });
  it('sends fallback entries to the main agent', () => assert.equal(memory('add', 'outreach-fallback', 'x', '--source', 'y', '--by', 'z').code, 1));
  it('refuses unknown agents', () => assert.equal(memory('add', 'nobody', 'x', '--source', 'y', '--by', 'z').code, 1));
  it('lists and removes by number', () => {
    assert.match(memory('list', 'outreach').stdout, /^\s+1 {2}\d{4}-\d{2}-\d{2} · Indian D2C/);
    assert.equal(memory('remove', 'outreach', '1').code, 0);
    assert.doesNotMatch(text('.claude', 'agent-memory', 'outreach', 'MEMORY.md'), /Indian D2C/);
  });
  it('removes by words only when they match one entry', () => {
    memory('add', 'main', 'Lesson about pricing pages', '--source', 'x', '--by', 'test');
    memory('add', 'main', 'Lesson about pricing emails', '--source', 'x', '--by', 'test');
    assert.equal(memory('remove', 'main', 'pricing').code, 1);
    assert.equal(memory('remove', 'main', 'pricing emails').code, 0);
    assert.match(text('memory', 'MAIN.md'), /pricing pages/);
  });
  it('passes the check', () => assert.equal(memory('check').code, 0));
});

describe('fallback agents', () => {
  it('match their main agents as committed', () => {
    const r = repo.run('fallbacks.mjs', 'check');
    assert.equal(r.code, 0, r.stderr);
  });
  it('are exactly what sync writes', () => {
    const files = readdirSync(repo.path('.claude', 'agents')).filter((f) => f.endsWith('-fallback.md'));
    const before = Object.fromEntries(files.map((f) => [f, text('.claude', 'agents', f)]));
    assert.equal(repo.run('fallbacks.mjs', 'sync').code, 0);
    for (const f of files) assert.equal(text('.claude', 'agents', f), before[f], `${f} differs from what sync writes`);
  });
  it('every main agent except the coordinator has one', () => {
    const names = readdirSync(repo.path('.claude', 'agents')).filter((f) => f.endsWith('.md') && !f.endsWith('-fallback.md') && f !== 'coordinator.md');
    for (const f of names) assert.ok(existsSync(repo.path('.claude', 'agents', f.replace('.md', '-fallback.md'))), f);
  });
});

describe('skills', () => {
  it('every preloaded skill exists', () => assert.doesNotMatch(skills('list').stdout, /Missing skills/));
  it('gives a skill to an agent and its fallback', () => {
    assert.equal(skills('give', 'developer', 'fact-sourcing').code, 0);
    assert.match(text('.claude', 'agents', 'developer.md'), /\nskills:\n {2}- self-review\n {2}- fact-sourcing\n/);
    assert.match(text('.claude', 'agents', 'developer-fallback.md'), /\nskills:\n {2}- self-review\n {2}- fact-sourcing\n/);
    assert.equal(repo.run('fallbacks.mjs', 'check').code, 0);
  });
  it('takes it away again', () => {
    assert.equal(skills('take', 'developer', 'fact-sourcing').code, 0);
    assert.doesNotMatch(text('.claude', 'agents', 'developer.md'), /fact-sourcing/);
    assert.doesNotMatch(text('.claude', 'agents', 'developer-fallback.md'), /fact-sourcing/);
    assert.match(text('.claude', 'agents', 'developer.md'), /\nskills:\n {2}- self-review\n/);
  });
  it("keeps the rest of the agent's file as it was", () => {
    const body = (s) => s.slice(s.indexOf('\n---\n'));
    const before = text('.claude', 'agents', 'sales.md');
    skills('give', 'sales', 'demo-script');
    skills('take', 'sales', 'demo-script');
    assert.equal(body(text('.claude', 'agents', 'sales.md')), body(before));
    assert.equal(text('.claude', 'agents', 'sales.md'), before);
  });
  it('refuses a skill that does not exist', () => assert.equal(skills('give', 'sales', 'nope').code, 1));
  it('refuses to change a fallback directly', () => assert.equal(skills('give', 'sales-fallback', 'cold-email').code, 1));
  it('creates a new skill', () => {
    assert.equal(skills('new', 'pricing-rules', 'How we quote prices and discounts. Use for proposals.').code, 0);
    assert.match(text('.claude', 'skills', 'pricing-rules', 'SKILL.md'), /^---\nname: pricing-rules\ndescription: How we quote/);
    assert.equal(skills('new', 'pricing-rules', 'again').code, 1);
    assert.equal(skills('new', 'Bad Name', 'x').code, 1);
  });
});
