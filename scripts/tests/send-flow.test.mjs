// The live path end to end, against a local SMTP sink that relays nothing: an approved send, its
// report, the lead marked contacted, a reply read from saved messages, and the follow-up refused.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
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

describe('the test send path', () => {
  it('sends a [TEST] copy of a real lead\'s draft to a named team member, leaving the lead alone', async () => {
    const id = JSON.parse(readFileSync(repo.path('pipeline', 'leads.jsonl'), 'utf8').trim().split('\n').pop()).id;
    const before = show(id).status;
    const config = JSON.parse(readFileSync(repo.path('ops', 'mail-config.json'), 'utf8'));
    config.pilot = { allow_only: ['sender@ourco.test'], test_recipients: ['mohit@ourco.test'] };
    writeFileSync(repo.path('ops', 'mail-config.json'), JSON.stringify(config));
    const start = received.length;
    // no approval row is needed: the test list is the person's decision
    const code = await run('send-email.mjs', '--draft', 'outputs/outreach/test-sendflow.md', '--email', '1', '--to', 'mohit@ourco.test', '--to-name', 'Mohit', '--lead', id);
    assert.equal(code, 0);
    const mail = received.slice(start);
    assert.deepEqual(mail.map((m) => m.rcpt[0]), ['<mohit@ourco.test>', '<founder@ourco.test>']);
    assert.match(mail[0].text, /Subject: \[TEST\] /);
    assert.ok(mail[0].text.includes('Hi Mohit,'));
    assert.match(mail[1].text, /TEST: sent to a pilot test recipient/);
    assert.equal(show(id).status, before);
    const log = readFileSync(repo.path('ops', 'send-log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(log.find((e) => e.to === 'mohit@ourco.test').mode, 'test');
  });

  it('still refuses anyone not on the pilot lists', async () => {
    const start = received.length;
    const code = await run('send-email.mjs', '--draft', 'outputs/outreach/test-sendflow.md', '--email', '1', '--to', 'someone@else.test', '--approval', 'A-T1');
    assert.equal(code, 1);
    assert.equal(received.length, start);
  });
});

describe('pilot test emails after a review (send-tests.mjs, run by Jarvis)', () => {
  const draftFile = 'outputs/outreach/test-sendflow.md';
  const review = (name, verdict) => writeFileSync(repo.path('outputs', 'reviews', name), `# Review\n\n- Reviewed: \`${draftFile}\`\n\n**Verdict: ${verdict}, 90/100.**\n`);
  const setDraftTime = (ms) => utimesSync(repo.path(draftFile), new Date(ms), new Date(ms));
  const FAKE = fileURLToPath(new URL('./fake-claude.mjs', import.meta.url));
  const jarvis = (...args) => new Promise((done) => {
    const child = spawn(process.execPath, ['scripts/jarvis.mjs', ...args], { cwd: repo.dir, env: { ...process.env, CLAUDE_PROJECT_DIR: repo.dir, CLAUDE_BIN: FAKE, JARVIS_TASK_ID: '' } });
    child.on('close', (code) => done(code));
  });
  const lastReport = () => {
    const q = JSON.parse(readFileSync(repo.path('ops', 'queue.json'), 'utf8'));
    return readFileSync(repo.path(q[q.length - 1].report), 'utf8');
  };

  before(() => {
    const config = JSON.parse(readFileSync(repo.path('ops', 'mail-config.json'), 'utf8'));
    config.pilot = {
      allow_only: ['sender@ourco.test'],
      test_recipients: ['mohit@ourco.test', 'tanvi@ourco.test'],
      test_names: { 'mohit@ourco.test': 'Mohit', 'tanvi@ourco.test': 'Tanvi' },
      auto_test_sends: true,
    };
    writeFileSync(repo.path('ops', 'mail-config.json'), JSON.stringify(config));
    writeFileSync(repo.path('ops', 'send-log.jsonl'), ''); // the copy sent above would count as already sent
    setDraftTime(Date.now() - 60000); // older than every review below
  });

  it('sends each email of a passed draft to every test recipient, greeted by name, with no report emails', async () => {
    review('T-auto-r1.md', 'PASS');
    const start = received.length;
    assert.equal(await run('send-tests.mjs', draftFile), 0);
    const mail = received.slice(start);
    // 2 emails x 2 testers; the lead (asha@testco.test) and the report address get nothing
    assert.deepEqual(mail.map((m) => m.rcpt[0]).sort(), ['<mohit@ourco.test>', '<mohit@ourco.test>', '<tanvi@ourco.test>', '<tanvi@ourco.test>']);
    assert.ok(mail.every((m) => /Subject: \[TEST\] /.test(m.text)));
    assert.ok(mail.some((m) => m.text.includes('Hi Tanvi,')));
  });

  it('does not send the same copies twice', async () => {
    const start = received.length;
    assert.equal(await run('send-tests.mjs', draftFile), 0);
    assert.equal(received.length, start);
  });

  it('sends nothing while the newest review asks for changes, or the draft changed after its PASS', () => {
    setDraftTime(Date.now() - 30000);
    review('T-auto-r2.md', 'REVISE');
    assert.match(repo.run('send-tests.mjs', draftFile).stdout, /not sent, its newest review says REVISE/);
    review('T-auto-r3.md', 'PASS');
    setDraftTime(Date.now() + 60000);
    assert.match(repo.run('send-tests.mjs', draftFile).stdout, /not sent, it changed after its last review/);
  });

  it('Jarvis sends the copies after a task and adds them to its report', async () => {
    const start = received.length;
    assert.equal(await jarvis('do', 'Write a passed draft'), 0);
    assert.deepEqual(received.slice(start).map((m) => m.rcpt[0]).sort(), ['<mohit@ourco.test>', '<tanvi@ourco.test>']);
    assert.match(lastReport(), /## Test emails \(sent by Jarvis after the task\)[\s\S]*2 sent, 0 failed/);
  });

  it('Jarvis sends nothing when the mail settings changed during the task', async () => {
    const start = received.length;
    await jarvis('do', 'Write a passed draft and touch the mail settings');
    assert.equal(received.length, start);
    assert.match(lastReport(), /Not sent: ops\/mail-config\.json changed during the task/);
  });
});
