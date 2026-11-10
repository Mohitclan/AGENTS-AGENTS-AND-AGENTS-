// Live sends from a tick, the go-live switch, and the refusals. Nothing here can reach a real mailbox: the sender is
// injected, or the mailbox settings point at a port nobody listens on, or send-email.mjs runs with --dry-run.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { after, before, describe, it } from 'node:test';
import { ACME, COBALT, FORMO, draftPath, outreachFixture, ref } from './_outreach-fixture.mjs';

const MON = '2026-11-09T05:00:00Z';
const TUE = '2026-11-10T06:00:00Z';

// A stand-in for send-email.mjs: records its arguments and, like the real one, logs a live send.
const sender = (fx, { ok = true, text = 'Sent.', calls = [] } = {}) => ({
  calls,
  async send(root, args) {
    calls.push(args);
    const get = (flag) => args[args.indexOf(flag) + 1];
    if (ok) fx.append('ops/send-log.jsonl', { at: new Date().toISOString(), kind: 'outreach', mode: 'live', to: get('--to'), subject: 'x', draft: get('--draft'), email: Number(get('--email')), lead: get('--lead'), approval: get('--approval'), message_id: `<${calls.length}@ourco.test>` });
    return { ok, text };
  },
});
const argOf = (args, flag) => args[args.indexOf(flag) + 1];

describe('a tick while the pilot is on', () => {
  let fx;
  before(async () => { fx = await outreachFixture(); });
  after(() => fx.repo.remove());

  it('sends [TEST] copies as before: no approval row, no real send, and the tick is logged as made during the pilot', async () => {
    fx.reset();
    const { decideEmails, planEmails } = await fx.mod('outreach.mjs');
    const rows = fx.read('ops/approvals.md');
    const calls = { tests: [], send: [] };
    const r = await decideEmails(fx.root, [ref(ACME, 1)], 'approve', 'Mohit', '', {
      tests: async (root, refs) => { calls.tests.push(refs); return { ok: true, sent: 3, text: '' }; },
      send: async (...a) => { calls.send.push(a); return { ok: true }; },
    });
    assert.deepEqual(calls.tests, [[ref(ACME, 1)]]);
    assert.deepEqual(calls.send, []);
    assert.deepEqual([r.ok, r.sent, r.message], [true, 3, undefined], 'the page keeps its test-copy message');
    assert.equal(fx.read('ops/approvals.md'), rows);
    const entry = fx.jsonl('ops/outreach.jsonl').at(-1);
    assert.deepEqual([entry.kind, entry.decision, entry.live, entry.by, entry.approvals], ['email-decision', 'approve', false, 'Mohit', undefined]);
    // a lead with only a contact form is no problem for a test copy
    assert.deepEqual(planEmails(fx.root, [ref(FORMO, 1)], 'approve').refs, [ref(FORMO, 1)]);
  });

  it('never schedules a follow-up: Email 2 sends its test copy at once', async () => {
    fx.reset();
    const { decideEmails } = await fx.mod('outreach.mjs');
    const calls = [];
    await decideEmails(fx.root, [ref(ACME, 2)], 'approve', 'Mohit', '', { tests: async (root, refs) => { calls.push(refs); return { ok: true, sent: 3, text: '' }; } });
    assert.deepEqual(calls, [[ref(ACME, 2)]]);
    const mail = (await fx.mod('outreach.mjs')).draftsState(fx.root)[0].mails;
    assert.equal(mail.some((m) => m.state === 'scheduled'), false);
  });
});

describe('a tick with the pilot off: Email 1 goes to the lead', () => {
  let fx;
  before(async () => { fx = await outreachFixture(); });
  after(() => fx.repo.remove());

  it('writes an approval row for the person\'s decision, then sends with --approval, --lead, --to and --to-name', async () => {
    fx.reset();
    await fx.goLive();
    const { decideEmails, draftsState, planEmails } = await fx.mod('outreach.mjs');
    const { approvalAllows } = await fx.mod('send-email.mjs');
    const s = sender(fx);
    assert.deepEqual(planEmails(fx.root, [ref(ACME, 1)], 'approve').refs, [ref(ACME, 1)]);
    const r = await decideEmails(fx.root, [ref(ACME, 1)], 'approve', 'Mohit', '', { send: s.send, now: MON });
    assert.equal(r.message, 'Approved email 1 for Acme: sent to jane@acme.test.');
    assert.deepEqual([r.ok, r.sent], [true, 1]);
    assert.equal(s.calls.length, 1);
    const args = s.calls[0];
    assert.deepEqual(args.slice(0, 10), ['--draft', draftPath(ACME), '--email', '1', '--lead', ACME, '--to', 'jane@acme.test', '--to-name', 'Jane']);
    const id = argOf(args, '--approval');
    assert.match(id, /^A-20261109-\d\d$/);
    const row = fx.read('ops/approvals.md').split('\n').find((l) => l.startsWith(`| ${id} |`));
    assert.match(row, /\| Send Email 1 of outputs\/outreach\/L-0000000a\.md to jane@acme\.test \(Acme\) \|/);
    assert.match(row, /\| Yes, approved on the Emails page \| Mohit \| 2026-11-09 \|$/);
    assert.equal(approvalAllows(fx.read('ops/approvals.md'), id, 'jane@acme.test').ok, true, 'send-email.mjs accepts the row');
    assert.equal(approvalAllows(fx.read('ops/approvals.md'), id, 'someone@else.test').ok, false, 'and only for this recipient');
    const entry = fx.jsonl('ops/outreach.jsonl').at(-1);
    assert.deepEqual([entry.decision, entry.live, entry.by, entry.approvals], ['approve', true, 'Mohit', { [ref(ACME, 1)]: id }]);
    const mail = draftsState(fx.root).find((d) => d.lead === ACME).mails[0];
    assert.deepEqual([mail.state, mail.liveSent, mail.liveTo, mail.retry], ['approved', 1, 'jane@acme.test', false]);
  });

  it('refuses a lead whose contact is a contact form, with a plain message, and logs nothing', async () => {
    fx.reset();
    await fx.goLive();
    const { planEmails, decideEmails } = await fx.mod('outreach.mjs');
    const plan = planEmails(fx.root, [ref(FORMO, 1)], 'approve');
    assert.equal(plan.error, 'Formo has no published email address (its contact is a contact form): send it by hand.');
    const s = sender(fx);
    const rows = fx.read('ops/approvals.md');
    const r = await decideEmails(fx.root, [ref(FORMO, 1)], 'approve', 'Mohit', '', { send: s.send });
    assert.equal(r.ok, false);
    assert.equal(r.message, 'Approved email 1 for Formo, but it did not go: Formo has no published email address (its contact is a contact form): send it by hand.');
    assert.deepEqual(s.calls, []);
    assert.equal(fx.read('ops/approvals.md'), rows, 'no approval row for a send that cannot happen');
    assert.deepEqual(fx.jsonl('ops/outreach.jsonl').filter((e) => e.kind === 'email-decision'), [], 'and the email stays waiting');
  });

  it('says why for the other contacts that are not an email address', async () => {
    fx.reset();
    await fx.goLive();
    const { recipientOf } = await fx.mod('outreach.mjs');
    const d = { company: 'Zed', lead: 'L-z', kind: 'sequence' };
    assert.match(recipientOf({ contact: { channel: 'linkedin', value: 'https://linkedin.com/in/x' } }, d).refuse, /^Zed has no published email address \(its contact is a LinkedIn profile\): send it by hand$/);
    assert.match(recipientOf({ contact: { channel: 'phone', value: '+1 555' } }, d).refuse, /its contact is a phone number/);
    assert.match(recipientOf({ contact: { channel: 'other', value: 'x' } }, d).refuse, /its contact is not an email address/);
    assert.match(recipientOf({}, d).refuse, /no contact is recorded/);
    assert.match(recipientOf({ contact: { channel: 'email', value: 'nonsense' } }, d).refuse, /does not look right/);
    assert.deepEqual(recipientOf({ contact: { channel: 'email', value: 'mailto:Hi@Zed.test', name: 'Zoe' } }, d), { to: 'hi@zed.test', name: 'Zoe' });
  });

  it('with "all", leaves out the emails that cannot be sent for real and names them', async () => {
    fx.reset();
    await fx.goLive();
    const { planEmails } = await fx.mod('outreach.mjs');
    const all = planEmails(fx.root, 'all', 'approve');
    assert.equal(all.refs.some((r) => r.includes(FORMO)), false);
    assert.equal(all.refs.length, 6, 'Acme and Cobalt, three emails each');
    assert.deepEqual(all.skipped.map((m) => m.slice(0, 5)), ['Formo', 'Formo', 'Formo']);
    // during the pilot nothing is left out
    const { setPilot } = await fx.mod('golive.mjs');
    setPilot(fx.root, false, 'test');
    assert.equal(planEmails(fx.root, 'all', 'approve').refs.length, 9);
  });

  it('says why a send did not go, keeps the email retryable and the approval row on record', async () => {
    fx.reset();
    await fx.goLive();
    const { decideEmails, draftsState, planEmails } = await fx.mod('outreach.mjs');
    const s = sender(fx, { ok: false, text: 'Mode: LIVE\nNot sent: jane@acme.test is on the opt-out list (opted out by reply)' });
    const r = await decideEmails(fx.root, [ref(ACME, 1)], 'approve', 'Mohit', '', { send: s.send, now: MON });
    assert.equal(r.ok, false);
    assert.equal(r.message, 'Approved email 1 for Acme, but it did not go: jane@acme.test is on the opt-out list (opted out by reply).');
    const mail = draftsState(fx.root).find((d) => d.lead === ACME).mails[0];
    assert.deepEqual([mail.state, mail.retry, mail.liveSent], ['approved', true, 0]);
    assert.match(fx.read('ops/approvals.md'), /to jane@acme\.test \(Acme\) .* Yes, approved on the Emails page \| Mohit/);
    assert.deepEqual(planEmails(fx.root, [ref(ACME, 1)], 'approve').refs, [ref(ACME, 1)], 'the person can try again');
  });

  it('refuses a second tick on an email that already went, and a tick while it is still going out', async () => {
    fx.reset();
    await fx.goLive();
    const { decideEmails, planEmails } = await fx.mod('outreach.mjs');
    let release;
    const slow = { async send() { await new Promise((r) => { release = r; }); return { ok: true, text: 'Sent.' }; } };
    const first = decideEmails(fx.root, [ref(ACME, 1)], 'approve', 'Mohit', '', { send: slow.send, now: MON });
    assert.match(planEmails(fx.root, [ref(ACME, 1)], 'approve').error, /^Email 1 for Acme is being sent right now\.$/);
    const second = await decideEmails(fx.root, [ref(ACME, 1)], 'approve', 'Mohit', '', { send: sender(fx).send, now: MON });
    assert.equal(second.ok, false);
    assert.match(second.message, /it is being sent right now/);
    release();
    assert.equal((await first).sent, 1);
    fx.sent(ACME, 1, { at: MON }); // as send-email.mjs logs it
    assert.match(planEmails(fx.root, [ref(ACME, 1)], 'approve').error, /already (approved and sent|went to the lead)/);
    assert.equal(fx.read('ops/approvals.md').split('\n').filter((l) => l.includes('to jane@acme.test (Acme)')).length, 1, 'the refused tick wrote no second row');
  });

  it('does not let a tick made during the pilot send for real later: after the pilot ends it is waiting again', async () => {
    fx.reset();
    const { decideEmails, draftsState } = await fx.mod('outreach.mjs');
    const { setPilot } = await fx.mod('golive.mjs');
    const calls = [];
    await decideEmails(fx.root, [ref(ACME, 1), ref(ACME, 2)], 'approve', 'Mohit', '', { tests: async () => ({ ok: true, sent: 6, text: '' }), send: sender(fx, { calls }).send });
    assert.deepEqual(draftsState(fx.root).find((d) => d.lead === ACME).mails.map((m) => m.state), ['approved', 'approved', 'pending']);
    setPilot(fx.root, true, 'test');
    assert.deepEqual(draftsState(fx.root).find((d) => d.lead === ACME).mails.map((m) => m.state), ['pending', 'pending', 'pending']);
    assert.deepEqual(calls, []);
    setPilot(fx.root, false, 'test');
    assert.deepEqual(draftsState(fx.root).find((d) => d.lead === ACME).mails.map((m) => m.state), ['approved', 'approved', 'pending'], 'back in the pilot, the test approvals count again');
  });

  it('a cross is only logged, and a declined email can be sent after all', async () => {
    fx.reset();
    await fx.goLive();
    const { decideEmails, planEmails, draftsState } = await fx.mod('outreach.mjs');
    const s = sender(fx);
    await decideEmails(fx.root, [ref(COBALT, 1)], 'decline', 'Mohit', '', { send: s.send });
    assert.deepEqual(s.calls, []);
    assert.equal(draftsState(fx.root).find((d) => d.lead === COBALT).mails[0].state, 'declined');
    assert.deepEqual(planEmails(fx.root, [ref(COBALT, 1)], 'approve').refs, [ref(COBALT, 1)]);
  });
});

describe('Email 2 and 3 ticked before their day', () => {
  let fx;
  before(async () => { fx = await outreachFixture(); });
  after(() => fx.repo.remove());
  const mails = async (id, now) => (await fx.mod('outreach.mjs')).draftsState(fx.root, undefined, undefined, now).find((d) => d.lead === id).mails;

  it('is scheduled for its working day, counted from the day Email 1 went out live', async () => {
    fx.reset();
    await fx.goLive();
    fx.sent(ACME, 1, { at: MON });
    const { decideEmails, outreachState } = await fx.mod('outreach.mjs');
    const s = sender(fx);
    const r = await decideEmails(fx.root, [ref(ACME, 2), ref(ACME, 3)], 'approve', 'Mohit', '', { send: s.send, now: TUE });
    assert.deepEqual(s.calls, [], 'nothing goes yet');
    assert.equal(r.message, 'Approved email 2 for Acme: scheduled for Fri 13 Nov. Approved email 3 for Acme: scheduled for Thu 19 Nov.');
    const [, two, three] = await mails(ACME, new Date(TUE));
    assert.deepEqual([two.state, two.due, two.dueText, two.after], ['scheduled', '2026-11-13', 'Fri 13 Nov', 0]);
    assert.deepEqual([three.state, three.due], ['scheduled', '2026-11-19']);
    assert.match(three.approval, /^A-20261110-\d\d$/, 'the approval row is written at the tick, for the send on the day');
    // the Emails page's list says so
    const email = outreachState(fx.root, new Date(TUE)).emails.find((e) => e.ref === ref(ACME, 2));
    assert.deepEqual([email.state, email.dueText], ['scheduled', 'Fri 13 Nov']);
    assert.match(email.why, /^Approved by Mohit\. Goes on Fri 13 Nov, only if nobody has replied$/);
    assert.match(outreachState(fx.root, new Date(TUE)).emails.find((e) => e.ref === ref(ACME, 3)).why, /Goes on Thu 19 Nov/);
  });

  it('skips the weekend when it counts', async () => {
    fx.reset();
    await fx.goLive();
    fx.sent(ACME, 1, { at: '2026-11-12T08:00:00Z' }); // a Thursday
    const { decideEmails } = await fx.mod('outreach.mjs');
    await decideEmails(fx.root, [ref(ACME, 2)], 'approve', 'Mohit', '', { send: sender(fx).send, now: '2026-11-13T05:00:00Z' });
    const [, two] = await mails(ACME, new Date('2026-11-13T05:00:00Z'));
    assert.deepEqual([two.state, two.due, two.dueText], ['scheduled', '2026-11-18', 'Wed 18 Nov'], 'Fri 13 is day 1, Mon 16 day 2, Tue 17 day 3, Wed 18 day 4');
  });

  it('counts the day in India: a send at 11pm UTC belongs to the next day', async () => {
    fx.reset();
    await fx.goLive();
    fx.sent(ACME, 1, { at: '2026-11-09T23:00:00Z' }); // 4:30 on Tuesday 10 November in India
    const { decideEmails } = await fx.mod('outreach.mjs');
    await decideEmails(fx.root, [ref(ACME, 2)], 'approve', 'Mohit', '', { send: sender(fx).send, now: '2026-11-10T01:00:00Z' });
    assert.equal((await mails(ACME, new Date('2026-11-10T01:00:00Z')))[1].due, '2026-11-16', 'Wed 11, Thu 12, Fri 13, Mon 16');
  });

  it('goes at once when its day has already come', async () => {
    fx.reset();
    await fx.goLive();
    fx.sent(ACME, 1, { at: '2026-11-02T05:00:00Z' });
    const { decideEmails } = await fx.mod('outreach.mjs');
    const s = sender(fx);
    const r = await decideEmails(fx.root, [ref(ACME, 2)], 'approve', 'Mohit', '', { send: s.send, now: MON });
    assert.equal(r.message, 'Approved email 2 for Acme: sent to jane@acme.test.');
    assert.equal(argOf(s.calls[0], '--email'), '2');
  });

  it('waits for Email 1 to go, and shows that instead of a date', async () => {
    fx.reset();
    await fx.goLive();
    const { decideEmails, outreachState } = await fx.mod('outreach.mjs');
    const s = sender(fx);
    const r = await decideEmails(fx.root, [ref(ACME, 2)], 'approve', 'Mohit', '', { send: s.send, now: MON });
    assert.equal(r.message, 'Approved email 2 for Acme: it goes on working day 4 after Email 1 is sent.');
    assert.deepEqual(s.calls, []);
    const email = outreachState(fx.root, new Date(MON)).emails.find((e) => e.ref === ref(ACME, 2));
    assert.deepEqual([email.state, email.due, email.after], ['scheduled', null, 1]);
    assert.match(email.why, /Goes on working day 4 after Email 1 is sent once Email 1 is sent or declined/);
  });

  it('is refused when Email 1 was declined, because there is no day to count from', async () => {
    fx.reset();
    await fx.goLive();
    const { decideEmails, planEmails } = await fx.mod('outreach.mjs');
    await decideEmails(fx.root, [ref(ACME, 1)], 'decline', 'Mohit');
    assert.match(planEmails(fx.root, [ref(ACME, 2)], 'approve').error, /^Email 2 for Acme can't go: Email 1 was not sent, so there is no start day to count from\.$/);
  });

  it('can be cancelled with a cross while it is scheduled', async () => {
    fx.reset();
    await fx.goLive();
    fx.sent(ACME, 1, { at: MON });
    const { decideEmails, planEmails } = await fx.mod('outreach.mjs');
    await decideEmails(fx.root, [ref(ACME, 2)], 'approve', 'Mohit', '', { send: sender(fx).send, now: TUE });
    assert.equal((await mails(ACME, new Date(TUE)))[1].state, 'scheduled');
    assert.match(planEmails(fx.root, [ref(ACME, 2)], 'approve').error, /already scheduled/);
    assert.deepEqual(planEmails(fx.root, [ref(ACME, 2)], 'decline').refs, [ref(ACME, 2)]);
    await decideEmails(fx.root, [ref(ACME, 2)], 'decline', 'Mohit');
    assert.equal((await mails(ACME, new Date(TUE)))[1].state, 'declined');
  });
});

describe('the pilot switch itself', () => {
  let fx;
  let g;
  before(async () => {
    fx = await outreachFixture();
    g = await fx.mod('golive.mjs');
  });
  after(() => fx.repo.remove());

  it('is on while either list names anyone, and says who may receive email', () => {
    fx.reset();
    const pilot = fx.config().pilot;
    assert.deepEqual(g.pilotStatus(fx.root), { on: true, recipients: [...new Set([...pilot.allow_only, ...pilot.test_recipients])], names: pilot.test_names, paused: null });
    const config = fx.config();
    config.pilot.allow_only = [];
    fx.write('ops/mail-config.json', JSON.stringify(config));
    assert.equal(g.pilotStatus(fx.root).on, true, 'test_recipients alone keep the pilot on');
    config.pilot.test_recipients = [];
    fx.write('ops/mail-config.json', JSON.stringify(config));
    assert.equal(g.pilotStatus(fx.root).on, false);
  });

  it('puts back exactly the two lists it moved, even when they differ', () => {
    fx.reset();
    const config = fx.config();
    config.pilot.allow_only = ['Boss@Ourco.test', 'a@ourco.test'];
    config.pilot.test_recipients = ['a@ourco.test'];
    fx.write('ops/mail-config.json', `${JSON.stringify(config, null, 2)}\n`);
    const before = fx.read('ops/mail-config.json');
    assert.equal(g.setPilot(fx.root, true, 'Mohit', new Date('2026-11-09T10:00:00Z')).ok, true);
    const off = fx.config().pilot;
    assert.deepEqual([off.allow_only, off.test_recipients], [[], []]);
    assert.deepEqual(off.paused, { allow_only: ['Boss@Ourco.test', 'a@ourco.test'], test_recipients: ['a@ourco.test'], at: '2026-11-09T10:00:00.000Z', by: 'Mohit' });
    assert.deepEqual(g.pilotStatus(fx.root).paused, { at: '2026-11-09T10:00:00.000Z', by: 'Mohit' });
    assert.equal(g.setPilot(fx.root, false, 'Mohit').ok, true);
    assert.equal(fx.read('ops/mail-config.json'), before, 'byte for byte');
    assert.deepEqual(fx.jsonl('ops/outreach.jsonl').filter((e) => e.kind === 'pilot').map((e) => [e.live, e.by]), [[true, 'Mohit'], [false, 'Mohit']]);
  });

  it('changes nothing when there is nothing to do: already off, already on, nothing set aside, or no settings', () => {
    fx.reset();
    const before = fx.read('ops/mail-config.json');
    assert.deepEqual(g.setPilot(fx.root, false, 'x'), { ok: false, live: false, message: 'The pilot is already on.' });
    assert.equal(fx.read('ops/mail-config.json'), before);
    g.setPilot(fx.root, true, 'x');
    assert.deepEqual(g.setPilot(fx.root, true, 'x'), { ok: false, live: true, message: 'The pilot is already off.' });
    const config = fx.config();
    delete config.pilot.paused; // someone edited the file: the lists are gone and nothing was set aside
    fx.write('ops/mail-config.json', JSON.stringify(config));
    assert.match(g.setPilot(fx.root, false, 'x').message, /^No pilot lists were set aside/);
    fx.write('ops/mail-config.json', '{ broken');
    assert.match(g.setPilot(fx.root, true, 'x').message, /cannot be read/);
    assert.equal(g.pilotStatus(fx.root).on, false, 'unreadable settings are not a pilot: send-email.mjs would refuse them anyway');
  });
});

describe('a draft with no send day for its follow-ups', () => {
  const DUNE = 'L-0000000d';
  let fx;
  before(async () => {
    const { lead } = await import('./_outreach-fixture.mjs');
    fx = await outreachFixture({ extraLeads: [lead(DUNE, 'Dune', { name: '', role: '', channel: 'email', value: 'hi@dune.test', source_url: 'https://dune.test' })], noSchedule: [DUNE] });
  });
  after(() => fx.repo.remove());

  it('can send Email 1 but cannot schedule Email 2, because it has no day to wait for', async () => {
    await fx.goLive();
    const { planEmails } = await fx.mod('outreach.mjs');
    assert.deepEqual(planEmails(fx.root, [ref(DUNE, 1)], 'approve').refs, [ref(DUNE, 1)]);
    assert.equal(planEmails(fx.root, [ref(DUNE, 2)], 'approve').error, "Email 2 for Dune has no send day in the draft's schedule, so it can't be scheduled.");
  });
});

describe('the go-live switch, on the page', () => {
  let fx;
  let child;
  let base;
  let pilotBefore;
  before(async () => {
    fx = await outreachFixture();
    pilotBefore = fx.config().pilot;
    // the mailbox points at a closed port, there is no password, and DNS lookups are off
    child = spawn(process.execPath, [fx.repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: fx.repo.dir, env: { ...process.env, SMTP_PASS: '', MAIL_CHECK_DNS: 'off', TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => {
    child?.kill();
    fx.repo.remove();
  });
  const post = (path, body, headers = { Origin: base, 'X-Team-Page': '1' }) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
  const state = async () => (await (await fetch(`${base}/api/state`)).json()).outreach;

  it('starts in the pilot, and shows the mailbox checklist (settings checked, DNS "couldn\'t check" with lookups off)', async () => {
    assert.deepEqual((await state()).pilot, { on: true, canRestore: false, pausedAt: null, pausedBy: '' });
    const r = await (await fetch(`${base}/api/mail/readiness`)).json();
    assert.deepEqual(r.items.map((i) => [i.id, i.status]), [['spf', 'unknown'], ['dmarc', 'unknown'], ['dkim', 'unknown'], ['sender', 'ok'], ['limit', 'ok'], ['imap', 'ok'], ['password', 'missing']]);
    assert.equal(r.ok, false);
  });

  it('only the page can switch it: a request from elsewhere is refused', async () => {
    assert.equal((await post('/api/pilot', { live: true, confirm: 'go live' }, {})).status, 403);
    assert.equal((await post('/api/pilot', { live: true, confirm: 'go live' }, { Origin: 'http://evil.example', 'X-Team-Page': '1' })).status, 403);
    assert.equal((await state()).pilot.on, true);
  });

  it('asks the person to type "go live" before it ends the pilot', async () => {
    for (const confirm of [undefined, '', 'yes', 'go']) {
      const r = await post('/api/pilot', { live: true, confirm });
      assert.equal(r.status, 400);
      assert.equal(r.message, 'Type go live to end the pilot.');
    }
    assert.deepEqual(fx.config().pilot, pilotBefore, 'nothing changed');
  });

  it('moves both pilot lists aside, logs who did it, and shows Live', async () => {
    const r = await post('/api/pilot', { live: true, confirm: '  Go Live ', by: 'Mohit' });
    assert.equal(r.status, 200, r.message);
    assert.match(r.message, /^The pilot is off\./);
    const pilot = fx.config().pilot;
    assert.deepEqual([pilot.allow_only, pilot.test_recipients], [[], []]);
    assert.deepEqual([pilot.paused.allow_only, pilot.paused.test_recipients], [pilotBefore.allow_only, pilotBefore.test_recipients]);
    assert.equal(pilot.paused.by, 'Mohit');
    const log = fx.jsonl('ops/outreach.jsonl').filter((e) => e.kind === 'pilot');
    assert.deepEqual(log.map((e) => [e.live, e.by]), [[true, 'Mohit']]);
    assert.match(log[0].at, /^\d{4}-\d\d-\d\dT/);
    assert.deepEqual(Object.keys(await state()).includes('pilot') && (await state()).pilot, { on: false, canRestore: true, pausedAt: pilot.paused.at, pausedBy: 'Mohit' });
    assert.equal((await post('/api/pilot', { live: true, confirm: 'go live' })).status, 409, 'already off');
  });

  it('refuses a contact form with a plain message, and tries a real send for an email contact (this copy has no mailbox)', async () => {
    const form = await post('/api/outreach/decide', { emails: [ref(FORMO, 1)], decision: 'approve', by: 'Mohit' });
    assert.equal(form.status, 409);
    assert.equal(form.message, 'Formo has no published email address (its contact is a contact form): send it by hand.');
    const acme = await post('/api/outreach/decide', { emails: [ref(ACME, 1)], decision: 'approve', by: 'Mohit' });
    assert.equal(acme.status, 500, acme.message);
    assert.match(acme.message, /^Approved email 1 for Acme, but it did not go: no SMTP password/, 'every check passed, then there was no mailbox to send with');
    assert.match(fx.read('ops/approvals.md'), /\| Send Email 1 of outputs\/outreach\/L-0000000a\.md to jane@acme\.test \(Acme\) \|.*\| Yes, approved on the Emails page \| Mohit \|/);
    assert.deepEqual(fx.jsonl('ops/send-log.jsonl'), [], 'nothing was sent');
  });

  it('puts the pilot back exactly as it was', async () => {
    const r = await post('/api/pilot', { live: false, by: 'Mohit' });
    assert.equal(r.status, 200, r.message);
    assert.deepEqual(fx.config().pilot, pilotBefore);
    assert.equal(JSON.stringify(fx.config().pilot), JSON.stringify(pilotBefore), 'same order too');
    assert.deepEqual(fx.jsonl('ops/outreach.jsonl').filter((e) => e.kind === 'pilot').map((e) => e.live), [true, false]);
    assert.equal((await state()).pilot.on, true);
    assert.equal((await post('/api/pilot', { live: false })).status, 409, 'already on');
  });
});

describe('a real send through send-email.mjs (dry run, so nothing is sent)', () => {
  let fx;
  before(async () => {
    fx = await outreachFixture();
    await fx.goLive();
  });
  after(() => fx.repo.remove());
  const dry = (...args) => fx.repo.run('send-email.mjs', ...args, '--dry-run');

  it('accepts the arguments the page uses, under the row the page writes', async () => {
    const { writeApproval } = await fx.mod('outreach.mjs');
    const id = writeApproval(fx.root, { by: 'Mohit', to: 'jane@acme.test', company: 'Acme', path: draftPath(ACME), n: 1, now: MON });
    const r = dry('--draft', draftPath(ACME), '--email', '1', '--lead', ACME, '--to', 'jane@acme.test', '--to-name', 'Jane', '--approval', id);
    assert.equal(r.code, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /Mode: LIVE/);
    assert.match(r.stdout, new RegExp(`Approval: ${id}: Yes, approved on the Emails page \\(Mohit, 2026-11-09\\)`));
    assert.match(r.stdout, /Dry run: nothing sent/);
  });

  it('refuses the same email to the same person a second time', async () => {
    const { writeApproval } = await fx.mod('outreach.mjs');
    const id = writeApproval(fx.root, { by: 'Mohit', to: 'jane@acme.test', company: 'Acme', path: draftPath(ACME), n: 1, now: MON });
    fx.sent(ACME, 1, { at: MON });
    const r = dry('--draft', draftPath(ACME), '--email', '1', '--lead', ACME, '--to', 'jane@acme.test', '--approval', id);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /Not sent: Email 1 of outputs\/outreach\/L-0000000a\.md already went to jane@acme\.test on 2026-11-09/);
    const other = dry('--draft', draftPath(ACME), '--email', '2', '--lead', ACME, '--to', 'jane@acme.test', '--approval', id);
    assert.equal(other.code, 0, 'Email 2 is another email');
  });
});

describe('a real send through send-email.mjs (a local sink: no mail leaves this computer)', () => {
  // The same sink the live-path test uses: it speaks just enough SMTP to take a message and relays nothing.
  let fx;
  let sink;
  let child;
  let base;
  const received = [];
  before(async () => {
    const { createServer } = await import('node:net');
    const { symlinkSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { ROOT } = await import('../_shared.mjs');
    sink = createServer((sock) => {
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
    await new Promise((done) => sink.listen(0, '127.0.0.1', done));
    fx = await outreachFixture();
    symlinkSync(join(ROOT, 'node_modules'), fx.repo.path('node_modules'), 'junction'); // send-email.mjs needs nodemailer
    const config = fx.config();
    config.smtp = { host: '127.0.0.1', port: sink.address().port, user: 'sender@ourco.test' };
    config.sender.email = 'sender@ourco.test';
    config.report_to = { name: 'Founder', role: 'Founder', email: 'founder@ourco.test' };
    fx.write('ops/mail-config.json', JSON.stringify(config, null, 2));
    await fx.goLive();
    child = spawn(process.execPath, [fx.repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: fx.repo.dir, env: { ...process.env, SMTP_PASS: 'test-only', MAIL_CHECK_DNS: 'off', TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => {
    child?.kill();
    sink?.close();
    fx?.repo.remove();
  });
  const post = (body) => fetch(`${base}/api/outreach/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Team-Page': '1' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));

  it('a tick sends Email 1 to the lead and its report, and schedules Email 2', async () => {
    const r = await post({ emails: [ref(ACME, 1)], decision: 'approve', by: 'Mohit' });
    assert.equal(r.status, 200, r.message + (r.detail || ''));
    assert.equal(r.message, 'Approved email 1 for Acme: sent to jane@acme.test.');
    assert.deepEqual(received.map((m) => m.rcpt[0]), ['<jane@acme.test>', '<founder@ourco.test>'], 'the lead, then the send report');
    assert.match(received[0].text, /Subject: First/);
    assert.ok(!received[0].text.includes('{{'));
    const log = fx.jsonl('ops/send-log.jsonl').filter((e) => e.kind === 'outreach');
    assert.deepEqual(log.map((e) => [e.mode, e.to, e.email, e.lead]), [['live', 'jane@acme.test', 1, ACME]]);
    assert.match(log[0].approval, /^A-\d{8}-\d\d$/);
    const two = await post({ emails: [ref(ACME, 2)], decision: 'approve', by: 'Mohit' });
    assert.equal(two.status, 200, two.message);
    assert.match(two.message, /^Approved email 2 for Acme: scheduled for (Mon|Tue|Wed|Thu|Fri) \d{1,2} \w{3}\.$/);
    assert.equal(received.length, 2, 'the follow-up did not go');
  });

  it('a second tick on the same email is refused, and nothing more goes out', async () => {
    const r = await post({ emails: [ref(ACME, 1)], decision: 'approve', by: 'Mohit' });
    assert.equal(r.status, 409);
    assert.match(r.message, /^Email 1 for Acme already went to the lead\.$|^Email 1 for Acme is already approved and sent\.$/);
    assert.equal(received.length, 2);
  });

  // Production (2026-11-10): after go live, every email reaches the lead itself, as a real email in the house format,
  // never as a [TEST] copy and never to the pilot's test inboxes.
  it('sends the first email to the lead with no [TEST] mark, the logo signature, and none of the pilot inboxes', () => {
    const toLead = received[0];
    assert.deepEqual(toLead.rcpt, ['<jane@acme.test>']);
    assert.doesNotMatch(toLead.text, /\[TEST\]/);
    assert.match(toLead.text, /Content-Type: text\/html/i, 'it goes as HTML');
    assert.match(toLead.text, /Content-Type: image\/png/i, 'with the logo signature attached inline');
    assert.match(toLead.text, /Best regards,/);
    const pilot = ['1609purab@gmail.com', 'tanvinishad.official@gmail.com', 'mohitkumar.sep08@gmail.com'];
    for (const m of received) for (const to of m.rcpt) assert.ok(!pilot.some((p) => to.includes(p)), `went to a pilot inbox: ${to}`);
  });

  it('sends a ticked follow-up to the lead on its day, also with the logo signature', async () => {
    const { sendDue } = await fx.mod('followups.mjs');
    const before = received.length;
    const was = process.env.SMTP_PASS;
    process.env.SMTP_PASS = 'test-only';
    let r;
    try {
      r = await sendDue(fx.root, new Date(Date.now() + 21 * 86_400_000)); // well past Email 2's working day
    } finally {
      if (was === undefined) delete process.env.SMTP_PASS;
      else process.env.SMTP_PASS = was;
    }
    assert.equal(r.sent.length, 1, JSON.stringify(r));
    const followUp = received.slice(before).find((m) => m.rcpt[0] === '<jane@acme.test>');
    assert.ok(followUp, 'the follow-up reached the lead');
    assert.doesNotMatch(followUp.text, /\[TEST\]/);
    assert.match(followUp.text, /Subject: Second/);
    assert.match(followUp.text, /Content-Type: image\/png/i, 'logo signature on the follow-up too');
    assert.match(followUp.text, /reply 'stop'|reply =E2=80=98stop|reply &#39;stop/i, 'the follow-up keeps its opt-out line');
  });
});
