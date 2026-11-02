import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { after, describe, it } from 'node:test';
import { decision, makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

// A proposed knowledge file of the tests' own: the repo's real ones may already be confirmed.
writeFileSync(repo.path('knowledge', 'fixture.md'), '---\nstatus: proposed\nowner: test\n---\n\n# Fixture\n\n- **Name:** Company name\n');

const guard = (tool_name, tool_input, extra = {}) => decision(repo.hook('guard.mjs', { tool_name, tool_input, ...extra }));
const write = (file_path, content) => guard('Write', { file_path, content });
const edit = (file_path, old_string, new_string) => guard('Edit', { file_path, old_string, new_string });
const bash = (command, extra) => guard('Bash', { command }, extra);
const read = (file_path) => guard('Read', { file_path });

describe('knowledge', () => {
  it('blocks writing a confirmed file', () => assert.equal(write('knowledge/x.md', '---\nstatus: confirmed\n---\n'), 'block'));
  it('blocks a quoted confirmed status', () => assert.equal(write('knowledge/x.md', '---\nstatus: "confirmed"\n---\n'), 'block'));
  it('allows a proposed file', () => assert.equal(write('knowledge/x.md', '---\nstatus: proposed\n---\n'), 'allow'));
  it('blocks editing the whole status line', () => assert.equal(edit('knowledge/fixture.md', 'status: proposed', 'status: confirmed'), 'block'));
  it('blocks editing only the value', () => assert.equal(edit('knowledge/fixture.md', 'proposed', 'confirmed'), 'block'));
  it('blocks the value plus the next line', () => assert.equal(edit('knowledge/fixture.md', 'proposed\nowner', 'confirmed\nowner'), 'block'));
  it('allows editing body text', () => assert.equal(edit('knowledge/fixture.md', 'Company name', 'Acme'), 'allow'));
  // Windows and macOS ignore case in paths; on Linux Knowledge/ is a different folder.
  const caseInsensitive = process.platform !== 'linux';
  it('ignores letter case in the path', { skip: !caseInsensitive }, () => assert.equal(edit('Knowledge/fixture.md', 'proposed', 'confirmed'), 'block'));
  it('checks every edit in a MultiEdit', () =>
    assert.equal(
      guard('MultiEdit', {
        file_path: 'knowledge/fixture.md',
        edits: [
          { old_string: 'Company name', new_string: 'Acme' },
          { old_string: 'proposed', new_string: 'confirmed' },
        ],
      }),
      'block',
    ));
  it('locks a confirmed file', () => {
    assert.equal(repo.run('kb.mjs', 'confirm', 'knowledge/fixture.md').code, 0);
    assert.equal(edit('knowledge/fixture.md', 'Company name', 'Acme'), 'block');
    if (caseInsensitive) assert.equal(edit('KNOWLEDGE/fixture.md', 'Company name', 'Acme'), 'block');
  });
});

describe('pipeline and logs', () => {
  it('blocks writing leads.jsonl', () => assert.equal(write('pipeline/leads.jsonl', 'x'), 'block'));
  it('blocks it in another letter case', () => assert.equal(write('Pipeline/leads.jsonl', 'x'), 'block'));
  it('allows an outputs file', () => assert.equal(write('outputs/research/a.md', 'x'), 'allow'));
  it('blocks editing the agent-call log', () => assert.equal(write('ops/messages.md', 'x'), 'block'));
  it('blocks editing the fallback log', () => assert.equal(edit('ops/fallbacks.md', 'Fallbacks', 'x'), 'block'));
  it('blocks writing attempt records', () => assert.equal(write('ops/runs/a.json', '{}'), 'block'));
  it('blocks editing the Jarvis queue', () => {
    assert.equal(write('ops/queue.json', '[]'), 'block');
    assert.equal(write('ops/queue.md', 'x'), 'block');
  });
  it('blocks editing the opt-out list', () => assert.equal(write('pipeline/suppression.jsonl', 'x'), 'block'));
  it('blocks editing the gate log', () => assert.equal(write('ops/gate-log.jsonl', 'x'), 'block'));
  it('blocks editing the send log', () => assert.equal(write('ops/send-log.jsonl', 'x'), 'block'));
  it('blocks editing the reply log', () => assert.equal(edit('ops/replies.jsonl', 'a', 'b'), 'block'));
  it('allows writing a report', () => assert.equal(write('outputs/reports/J-20261030-01.md', 'x'), 'allow'));
});

describe('sending', () => {
  const row = (id, decision) => `| ${id} | T-1 | Send Email 1 to a@b.com | f | r | ${decision} | | |`;
  writeFileSync(repo.path('ops', 'approvals.md'), `| ID | Task | Action | Files | Risk | Decision | By | Date |\n|---|---|---|---|---|---|---|---|\n${row('A-9', 'pending')}\n`);

  it('asks before a real send', () => assert.equal(bash('node scripts/send-email.mjs --draft d.md --email 1 --to a@b.com --approval A-9'), 'ask'));
  it('asks before the mail settings change', () => assert.equal(edit('ops/mail-config.json', 'sushant', 'someone'), 'ask'));
  it('allows a dry run', () => assert.equal(bash('node scripts/send-email.mjs --draft d.md --email 1 --to a@b.com --dry-run'), 'allow'));
  it('asks before a pending row becomes Yes', () => assert.equal(edit('ops/approvals.md', '| pending |', '| Yes, approved |'), 'ask'));
  it('asks before a new row is written with Yes', () =>
    assert.equal(edit('ops/approvals.md', row('A-9', 'pending'), `${row('A-9', 'pending')}\n${row('A-10', '**Yes**')}`), 'ask'));
  it('allows adding a pending row', () =>
    assert.equal(edit('ops/approvals.md', row('A-9', 'pending'), `${row('A-9', 'pending')}\n${row('A-10', 'pending')}`), 'allow'));
});

describe('memory', () => {
  it('blocks writing main memory directly', () => assert.equal(write('memory/MAIN.md', 'x'), 'block'));
  it('lets an agent write its own memory', () =>
    assert.equal(guard('Write', { file_path: '.claude/agent-memory/sales/MEMORY.md', content: 'x' }, { agent_id: 'a1', agent_type: 'sales' }), 'allow'));
  it("lets a fallback write its main agent's memory", () =>
    assert.equal(
      guard('Write', { file_path: '.claude/agent-memory/sales/MEMORY.md', content: 'x' }, { agent_id: 'a1', agent_type: 'sales-fallback' }),
      'allow',
    ));
  it("blocks an agent writing another agent's memory", () =>
    assert.equal(guard('Write', { file_path: '.claude/agent-memory/sales/MEMORY.md', content: 'x' }, { agent_id: 'a1', agent_type: 'outreach' }), 'block'));
  it('asks before removing memory', () => assert.equal(bash('node scripts/memory.mjs remove main 1'), 'ask'));
  it('allows adding memory', () => assert.equal(bash('node scripts/memory.mjs add main "x" --source y --by z'), 'allow'));
  it('asks before changing skills', () => assert.equal(bash('node scripts/skills.mjs give sales cold-email'), 'ask'));
  it('allows listing skills', () => assert.equal(bash('node scripts/skills.mjs list'), 'allow'));
});

describe('.env files', () => {
  it('blocks .env', () => assert.equal(read('repos/app/.env'), 'block'));
  it('blocks .env.local', () => assert.equal(read('repos/app/.env.local'), 'block'));
  it('blocks .ENV', () => assert.equal(read('.ENV'), 'block'));
  it('allows .env.example', () => assert.equal(read('repos/app/.env.example'), 'allow'));
  it('allows a file that only starts with .env', () => assert.equal(read('repos/app/.environment.md'), 'allow'));
  it('blocks cat .env', () => assert.equal(bash('cat repos/app/.env'), 'block'));
  it('blocks sourcing .env.production', () => assert.equal(bash('source ./.env.production && npm start'), 'block'));
  it('allows cat .env.example', () => assert.equal(bash('cat repos/app/.env.example'), 'allow'));
  it('allows process.env', () => assert.equal(bash('node -e console.log(process.env.HOME)'), 'allow'));
});

describe('commands that need a person', () => {
  it('asks before kb confirm', () => assert.equal(bash('node scripts/kb.mjs confirm knowledge/fixture.md'), 'ask'));
  it('asks before kb confirm spelled differently', () => assert.equal(bash('node scripts//kb.mjs confirm knowledge/fixture.md'), 'ask'));
  it('allows kb status', () => assert.equal(bash('node scripts/kb.mjs status'), 'allow'));
  it('asks before approved', () => assert.equal(bash('node scripts/leads.mjs set-status L-1 approved ok'), 'ask'));
  it('asks before contacted', () => assert.equal(bash('node scripts/leads.mjs set-status L-1 contacted sent'), 'ask'));
  it('asks before won', () => assert.equal(bash('node scripts/leads.mjs set-status L-1 won signed'), 'ask'));
  it('asks before --force', () => assert.equal(bash('node scripts/leads.mjs set-status L-1 new --force'), 'ask'));
  it('asks before lifting a hold', () => assert.equal(bash('node scripts/leads.mjs release L-1 decided'), 'ask'));
  it('allows putting a lead on hold', () => assert.equal(bash('node scripts/leads.mjs hold L-1 why --owner founders'), 'allow'));
  it('allows drafted', () => assert.equal(bash('node scripts/leads.mjs set-status L-1 drafted seq'), 'allow'));
  it('asks before a script outside scripts/', () => assert.equal(bash('node scripts/../evil.mjs'), 'ask'));
  it('allows leads list', () => assert.equal(bash('node scripts/leads.mjs list'), 'allow'));
  it('ignores input that is not a hook payload', () => assert.equal(decision(repo.hook('guard.mjs', 'not json')), 'allow'));
});
