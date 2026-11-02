// The live path end to end, against a local SMTP sink that relays nothing: an approved send, its
// report, the lead marked contacted, a reply read from saved messages, and the follow-up refused.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { ROOT } from '../_shared.mjs';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
const received = [];
let server;

function sink() {
  return createServer((sock) => {
    let buf = '';
    let data = null;
    let rcpt = [];
    const say = (l) => sock.write(`${l}\r\n`);
    say('220 sink');
    sock.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (data) {
          if (line === '.') { received.push({ rcpt, text: data.join('\n') }); data = null; rcpt = []; say('250 OK'); } else data.push(line);
        } else if (/^EHLO/i.test(line)) { say('250-sink'); say('250 AUTH PLAIN'); }
        else if (/^AUTH/i.test(line)) say('235 OK');
        else if (/^RCPT/i.test(line)) { rcpt.push(line.slice(8).trim()); say('250 OK'); }
        else if (/^DATA/i.test(line)) { data = []; say('354 go'); }
        else if (/^QUIT/i.test(line)) { say('221 bye'); sock.end(); }
        else say('250 OK');
      }
    });
    sock.on('error', () => {});
  });
}

const lead = {
  company: 'Testco', website: 'https://testco.test', product: 'motionrepo',
  fit_reason: 'A fictional company used only by this test, never contacted.',
  evidence: [{ claim: 'About page names the founder', url: 'https://testco.test/about', signal: 'published' }],
  score_breakdown: { icp_fit: 30, need_evidence: 20, timing: 10, reachability: 10 }, score_rationale: 'Test lead.',
  contact: { name: 'Asha', role: 'Founder', channel: 'email', value: 'asha@testco.test', source_url: 'https://testco.test/about' },
  next_action: 'Test', researched_at: '2026-11-02',
};

const draft = `---\nproduct: motionrepo\n---\n\n## Send schedule\n\n| Message | Working day |\n|---|---|\n| Email 1 | 0 |\n| Email 2 | 4 |\n\n## Email 1\n\nSubject: Launch video idea\n\nHi Asha,\n\nYour launch is on 20 November. Would a video from your repo help?\n\n{{SENDER_NAME}}, {{COMPANY_NAME}}\n\nReply "stop" and I won't write again.\n\n## Email 2\n\nSubject: Launch video sample\n\nHi Asha,\n\nOne follow-up before your launch. Shall I make a sample from the public repo?\n\n{{SENDER_NAME}}, {{COMPANY_NAME}}\n\nReply "stop" and I won't write again.\n`;

const env = { SMTP_PASS: 'test-only' };
const run = (script, ...args) => new Promise((done) => {
  const child = spawn(process.execPath, [`scripts/${script}`, ...args], { cwd: repo.dir, env: { ...process.env, CLAUDE_PROJECT_DIR: repo.dir } });
  let err = '';
  child.stderr.on('data', (d) => { err += d; });
  child.on('close', (code) => { if (process.env.DEBUG_SENDFLOW && err) console.error(err); done(code); });
});
const show = (id) => JSON.parse(repo.run('leads.mjs', 'show', id).stdout);

before(async () => {
  // Test copies leave node_modules out; send-email.mjs needs nodemailer.
  symlinkSync(join(ROOT, 'node_modules'), repo.path('node_modules'), 'junction');
  server = sink();
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const config = JSON.parse(readFileSync(repo.path('ops', 'mail-config.json'), 'utf8'));
  config.smtp = { host: '127.0.0.1', port: server.address().port, user: 'sender@ourco.test' };
  config.sender.email = 'sender@ourco.test';
  config.report_to = { name: 'Founder', role: 'Founder', email: 'founder@ourco.test' };
  delete config.pilot; // this test is about the live path itself; pilot mode has its own test
  writeFileSync(repo.path('ops', 'mail-config.json'), JSON.stringify(config));
  writeFileSync(repo.path('ops', 'send-log.jsonl'), '');
  mkdirSync(repo.path('pipeline', 'inbox'), { recursive: true });
  writeFileSync(repo.path('pipeline', 'inbox', 'test-sendflow.jsonl'), JSON.stringify(lead) + '\n');
  repo.run('leads.mjs', 'import', 'pipeline/inbox/test-sendflow.jsonl');
  writeFileSync(repo.path('outputs', 'outreach', 'test-sendflow.md'), draft);
  writeFileSync(repo.path('ops', 'approvals.md'), [
    '| ID | Task | Action | Files | Risk | Decision | By | Date |', '|---|---|---|---|---|---|---|---|',
    '| A-T1 | T | Send Email 1 to asha@testco.test | f | r | Yes, approved | tester | 2026-11-02 |',
    '| A-T2 | T | Send Email 2 to asha@testco.test | f | r | Yes, approved | tester | 2026-11-02 |', '',
  ].join('\n'));
  Object.assign(process.env, env);
});

after(() => {
  for (const k of Object.keys(env)) delete process.env[k];
  server?.close();
  repo.remove();
});

describe('the live send path', () => {
  let id;

  it('sends an approved email and its report, and marks the lead contacted', async () => {
    id = JSON.parse(readFileSync(repo.path('pipeline', 'leads.jsonl'), 'utf8').trim().split('\n').pop()).id;
    repo.run('leads.mjs', 'set-status', id, 'qualified', 'test');
    const code = await run('send-email.mjs', '--draft', 'outputs/outreach/test-sendflow.md', '--email', '1', '--to', 'asha@testco.test', '--approval', 'A-T1', '--lead', id);
    assert.equal(code, 0);
    assert.deepEqual(received.map((m) => m.rcpt[0]), ['<asha@testco.test>', '<founder@ourco.test>']);
    assert.ok(received[0].text.includes('Hi Asha,'));
    assert.ok(!received[0].text.includes('{{'));
    assert.equal(show(id).status, 'contacted');
  });

  it('moves the lead to replied and refuses the follow-up once they answer', async () => {
    const sent = JSON.parse(readFileSync(repo.path('ops', 'send-log.jsonl'), 'utf8').split('\n')[0]);
    mkdirSync(repo.path('inbox-test'), { recursive: true });
    writeFileSync(repo.path('inbox-test', '1.json'), JSON.stringify({ messageId: '<r@testco.test>', inReplyTo: sent.message_id, from: 'asha@testco.test', subject: 'Re: Launch video idea', date: '2026-11-03T09:00:00Z', text: 'Yes, tell me more.' }));
    assert.equal(await run('replies.mjs', 'check', '--from', 'inbox-test'), 0);
    assert.equal(show(id).status, 'replied');
    const code = await run('send-email.mjs', '--draft', 'outputs/outreach/test-sendflow.md', '--email', '2', '--to', 'asha@testco.test', '--approval', 'A-T2', '--lead', id);
    assert.equal(code, 1);
    assert.equal(received.length, 2);
  });
});
