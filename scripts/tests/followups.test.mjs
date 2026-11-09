// Follow-ups on their day: which approved emails are due, and sendDue sending them, skipping them or leaving them.
// The sender is injected, so nothing is sent.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ACME, COBALT, draftPath, outreachFixture, ref } from './_outreach-fixture.mjs';

const MON = '2026-11-09T05:00:00Z'; // Email 1 goes out live
const TUE = '2026-11-10T06:00:00Z'; // a person ticks Email 2 and 3
const THU = new Date('2026-11-12T05:00:00Z');
const FRI = new Date('2026-11-13T04:00:00Z'); // 9:30 in India: Email 2's day (working day 4)
const SAT = new Date('2026-11-14T10:00:00Z');
const WED_NEXT = new Date('2026-11-18T05:00:00Z');
const THU_NEXT = new Date('2026-11-19T05:00:00Z'); // Email 3's day (working day 8)

describe('working days', () => {
  let o;
  before(async () => {
    const fx = await outreachFixture();
    o = await fx.mod('outreach.mjs');
    fx.repo.remove();
  });

  it('counts working days from a day, skipping Saturdays and Sundays', () => {
    assert.equal(o.addWorkingDays('2026-11-09', 0), '2026-11-09');
    assert.equal(o.addWorkingDays('2026-11-09', 4), '2026-11-13', 'Monday + 4 is Friday');
    assert.equal(o.addWorkingDays('2026-11-09', 8), '2026-11-19');
    assert.equal(o.addWorkingDays('2026-11-12', 4), '2026-11-18', 'Thursday + 4 is the Wednesday after');
    assert.equal(o.addWorkingDays('2026-11-13', 1), '2026-11-16', 'Friday + 1 is Monday');
    assert.equal(o.addWorkingDays('2026-11-14', 1), '2026-11-16', 'a Saturday start counts from Monday');
    assert.equal(o.addWorkingDays('2026-11-09', 12), '2026-11-25');
  });

  it('names a day the way people say it, and a day in India', () => {
    assert.equal(o.formatDay('2026-11-16'), 'Mon 16 Nov');
    assert.equal(o.formatDay('2026-12-01'), 'Tue 1 Dec');
    assert.equal(o.istDay(Date.parse('2026-11-09T18:29:00Z')), '2026-11-09');
    assert.equal(o.istDay(Date.parse('2026-11-09T18:31:00Z')), '2026-11-10', 'half past midnight in India');
  });

  it('reads the draft\'s send schedule, and Email 1 is always day 0', () => {
    const text = '## Send schedule\n\n| Message | Working day |\n|---|---|\n| Email 1 | 0 |\n| Email 2 | 4 |\n| Email 3 | 8 |\n| LinkedIn connection note | Not schedulable |\n';
    assert.deepEqual([...o.scheduleOf(text)], [[1, 0], [2, 4], [3, 8]]);
    assert.deepEqual([...o.scheduleOf('## Email 1\n\nSubject: x\n')], [[1, 0]]);
  });
});

describe('due follow-ups', () => {
  let fx;
  let o;
  let f;
  before(async () => {
    fx = await outreachFixture();
    o = await fx.mod('outreach.mjs');
    f = await fx.mod('followups.mjs');
  });
  after(() => fx.repo.remove());

  // Live, Email 1 went out on Monday, and a person ticked Email 2 and 3 on Tuesday.
  const scheduled = async () => {
    fx.reset();
    await fx.goLive();
    fx.sent(ACME, 1, { at: MON });
    await o.decideEmails(fx.root, [ref(ACME, 2), ref(ACME, 3)], 'approve', 'Mohit', '', { send: async () => ({ ok: true }), now: TUE });
  };
  const due = (now) => f.dueFollowups(fx.root, now).map((d) => `${d.draft.split('/').pop()}#${d.n}`);

  it('has nothing due before the working day', async () => {
    await scheduled();
    assert.deepEqual(due(THU), []);
    assert.deepEqual(due(new Date(MON)), []);
  });

  it('has Email 2 due on its day, and keeps it due over the weekend if the computer was off', async () => {
    await scheduled();
    assert.deepEqual(due(FRI), ['L-0000000a.md#2']);
    assert.deepEqual(due(SAT), ['L-0000000a.md#2']);
    const [item] = f.dueFollowups(fx.root, FRI);
    assert.deepEqual([item.company, item.n, item.due, item.to, item.name, item.by], ['Acme', 2, '2026-11-13', 'jane@acme.test', 'Jane', 'Mohit']);
    assert.match(item.approval, /^A-20261110-\d\d$/);
  });

  it('holds Email 3 until Email 2 has gone, then sends it on its own day', async () => {
    await scheduled();
    assert.deepEqual(due(WED_NEXT), ['L-0000000a.md#2'], 'Email 3 is not due yet, and Email 2 still waits');
    fx.sent(ACME, 2, { at: FRI.toISOString() });
    assert.deepEqual(due(WED_NEXT), []);
    assert.deepEqual(due(THU_NEXT), ['L-0000000a.md#3']);
  });

  it('treats a declined earlier email as settled, so the next follow-up still goes', async () => {
    await scheduled();
    await o.decideEmails(fx.root, [ref(ACME, 2)], 'decline', 'Mohit');
    assert.deepEqual(due(FRI), []);
    assert.deepEqual(due(THU_NEXT), ['L-0000000a.md#3']);
  });

  it('has nothing due while the pilot is on, and nothing that was only ticked in the pilot', async () => {
    await scheduled();
    const { setPilot } = await fx.mod('golive.mjs');
    setPilot(fx.root, false, 'test');
    assert.deepEqual(due(THU_NEXT), [], 'back in the pilot: nothing is sent from here');
    fx.reset();
    await o.decideEmails(fx.root, [ref(ACME, 1)], 'approve', 'Mohit', '', { tests: async () => ({ ok: true, sent: 3, text: '' }) });
    fx.sent(ACME, 1, { at: MON });
    await fx.goLive();
    assert.deepEqual(due(THU_NEXT), [], 'a test-copy tick is not an approval to send for real');
  });
});

describe('sending what is due', () => {
  let fx;
  let o;
  let f;
  before(async () => {
    fx = await outreachFixture();
    o = await fx.mod('outreach.mjs');
    f = await fx.mod('followups.mjs');
  });
  after(() => fx.repo.remove());

  const scheduled = async () => {
    fx.reset();
    await fx.goLive();
    fx.sent(ACME, 1, { at: MON });
    await o.decideEmails(fx.root, [ref(ACME, 2), ref(ACME, 3)], 'approve', 'Mohit', '', { send: async () => ({ ok: true }), now: TUE });
  };
  const maker = (reply = { ok: true, text: 'Sent.' }) => {
    const calls = [];
    return { calls, send: async (root, args) => { calls.push(args); return typeof reply === 'function' ? reply(args) : reply; } };
  };
  const arg = (args, flag) => args[args.indexOf(flag) + 1];
  const notes = (kind) => fx.jsonl('ops/outreach.jsonl').filter((e) => e.kind === kind);
  const mailOf = (n, now = FRI) => o.draftsState(fx.root, undefined, undefined, now).find((d) => d.lead === ACME).mails[n - 1];

  it('sends nothing before the day', async () => {
    await scheduled();
    const s = maker();
    const r = await f.sendDue(fx.root, THU, { send: s.send });
    assert.deepEqual([r.sent, r.skipped, r.failed, r.held], [[], [], [], []]);
    assert.deepEqual(s.calls, []);
  });

  it('sends Email 2 on its day under the approval row written at the tick, to the lead', async () => {
    await scheduled();
    const s = maker();
    const r = await f.sendDue(fx.root, FRI, { send: s.send });
    assert.deepEqual(r.sent.map((x) => x.n), [2]);
    assert.equal(s.calls.length, 1);
    const args = s.calls[0];
    assert.deepEqual(args.slice(0, 10), ['--draft', draftPath(ACME), '--email', '2', '--lead', ACME, '--to', 'jane@acme.test', '--to-name', 'Jane']);
    assert.equal(arg(args, '--approval'), mailOf(2).approval, 'the row the person\'s tick wrote');
    assert.deepEqual([notes('followup-skip').length, notes('followup-error').length], [0, 0]);
    // the real row names the recipient, which is all send-email.mjs asks of it
    const { approvalAllows } = await fx.mod('send-email.mjs');
    assert.equal(approvalAllows(fx.read('ops/approvals.md'), arg(args, '--approval'), 'jane@acme.test').ok, true);
  });

  it('does not send the same follow-up twice', async () => {
    await scheduled();
    const s = maker((args) => { fx.sent(ACME, Number(arg(args, '--email')), { at: FRI.toISOString() }); return { ok: true, text: 'Sent.' }; });
    await f.sendDue(fx.root, FRI, { send: s.send });
    await f.sendDue(fx.root, FRI, { send: s.send });
    assert.equal(s.calls.length, 1);
    assert.equal(mailOf(2).state, 'approved');
    assert.equal(mailOf(2).liveSent, 1);
  });

  it('does not run twice at once', async () => {
    await scheduled();
    let release;
    const slow = { calls: 0, send: async () => { slow.calls++; await new Promise((r) => { release = r; }); return { ok: true, text: 'Sent.' }; } };
    const first = f.sendDue(fx.root, FRI, { send: slow.send });
    const second = await f.sendDue(fx.root, FRI, { send: slow.send });
    assert.equal(second.busy, true);
    release();
    await first;
    assert.equal(slow.calls, 1);
  });

  it('skips a follow-up when someone at the company replied, and records why', async () => {
    await scheduled();
    fx.append('ops/replies.jsonl', { at: '2026-11-11T08:00:00Z', received: '2026-11-11T07:55:00Z', message_id: '<r1@acme.test>', from: 'cto@acme.test', subject: 'Re: First', kind: 'reply', mode: 'live', sent_to: 'jane@acme.test', lead: ACME, email: 1, file: 'outputs/replies/x.md' });
    const s = maker();
    const r = await f.sendDue(fx.root, FRI, { send: s.send });
    assert.deepEqual(s.calls, []);
    assert.equal(r.skipped.length, 1);
    assert.equal(r.skipped[0].reason, 'cto@acme.test answered on 2026-11-11 (reply)');
    assert.deepEqual(notes('followup-skip').map((e) => [e.ref, e.reason]), [[ref(ACME, 2), 'cto@acme.test answered on 2026-11-11 (reply)']]);
    const mail = mailOf(2);
    assert.deepEqual([mail.state, mail.skip], ['skipped', 'cto@acme.test answered on 2026-11-11 (reply)']);
    const email = o.outreachState(fx.root, FRI).emails.find((e) => e.ref === ref(ACME, 2));
    assert.match(email.why, /^Approved by Mohit, but skipped: cto@acme\.test answered on 2026-11-11 \(reply\)$/);
    // it is not tried again, and Email 3 is skipped for the same reason on its own day
    assert.deepEqual((await f.sendDue(fx.root, SAT, { send: s.send })).skipped, []);
    assert.deepEqual((await f.sendDue(fx.root, THU_NEXT, { send: s.send })).skipped.map((x) => x.n), [3]);
    assert.deepEqual(s.calls, []);
  });

  it('skips a follow-up to an address on the opt-out list, and a lead that is on hold or already replied', async () => {
    await scheduled();
    fx.append('pipeline/suppression.jsonl', { value: 'acme.test', reason: 'opted out', at: '2026-11-11' });
    const r = await f.sendDue(fx.root, FRI, { send: maker().send });
    assert.equal(r.skipped[0].reason, 'jane@acme.test is on the opt-out list');
    await scheduled();
    fx.write('pipeline/leads.jsonl', fx.read('pipeline/leads.jsonl') + `${JSON.stringify({ ...fx.leads[0], status: 'replied' })}\n`);
    assert.equal((await f.sendDue(fx.root, FRI, { send: maker().send })).skipped[0].reason, 'Acme is replied, so a person is in touch');
    await scheduled();
    fx.write('pipeline/leads.jsonl', fx.read('pipeline/leads.jsonl') + `${JSON.stringify({ ...fx.leads[0], hold: { reason: 'Agency question. More words.', owner: 'founders' } })}\n`);
    assert.equal((await f.sendDue(fx.root, FRI, { send: maker().send })).skipped[0].reason, 'Acme is on hold: Agency question');
  });

  it('skips when send-email.mjs refuses on purpose, and says so; a changed address means ticking it again', async () => {
    await scheduled();
    const refused = maker({ ok: false, text: 'Not sent: lint-copy failed: 1 failed, 0 warning(s)' });
    assert.equal((await f.sendDue(fx.root, FRI, { send: refused.send })).skipped[0].reason, 'lint-copy failed: 1 failed, 0 warning(s)');
    await scheduled();
    const changed = maker({ ok: false, text: 'Not sent: A-20261110-01 does not name jane@acme.test' });
    const r = await f.sendDue(fx.root, FRI, { send: changed.send });
    assert.match(r.skipped[0].reason, /^its address or approval changed since it was ticked/);
    const { planEmails } = await fx.mod('outreach.mjs');
    assert.deepEqual(planEmails(fx.root, [ref(ACME, 2)], 'approve').refs, [ref(ACME, 2)], 'a skipped email can be ticked again');
  });

  it('keeps a follow-up that failed for another reason and tries again after an hour, not every ten minutes', async () => {
    await scheduled();
    const down = maker({ ok: false, text: 'Not sent: connect ECONNREFUSED 127.0.0.1:9' });
    const first = await f.sendDue(fx.root, FRI, { send: down.send });
    assert.deepEqual([first.failed.length, first.skipped.length], [1, 0]);
    assert.equal(first.failed[0].reason, 'connect ECONNREFUSED 127.0.0.1:9');
    assert.equal(notes('followup-error').length, 1);
    assert.equal(mailOf(2).state, 'approved', 'still due, not skipped');
    assert.equal(mailOf(2).retry, true);
    // the failure was just now, by the real clock; move it to the test's clock
    fx.write('ops/outreach.jsonl', fx.jsonl('ops/outreach.jsonl').map((e) => JSON.stringify(e.kind === 'followup-error' ? { ...e, at: FRI.toISOString() } : e)).join('\n') + '\n');
    const soon = await f.sendDue(fx.root, new Date(+FRI + 600_000), { send: down.send });
    assert.deepEqual([soon.held.length, soon.failed.length], [1, 0]);
    assert.match(soon.held[0].reason, /^the last try failed \(connect ECONNREFUSED 127\.0\.0\.1:9\); trying again later$/);
    assert.equal(down.calls.length, 1, 'no second try after ten minutes');
    const later = maker();
    const again = await f.sendDue(fx.root, new Date(+FRI + 3_700_000), { send: later.send });
    assert.deepEqual(again.sent.map((x) => x.n), [2]);
  });

  it('holds follow-ups once today\'s live sends reach the daily limit', async () => {
    await scheduled();
    const config = fx.config();
    config.daily_limit = 1;
    fx.write('ops/mail-config.json', JSON.stringify(config, null, 2));
    fx.sent(COBALT, 1, { at: FRI.toISOString(), to: 'hi@cobalt.test' });
    const s = maker();
    const r = await f.sendDue(fx.root, FRI, { send: s.send });
    assert.deepEqual([r.sent.length, r.held.length], [0, 1]);
    assert.match(r.held[0].reason, /daily limit of 1 live emails is reached; it goes tomorrow/);
    assert.deepEqual(s.calls, []);
    assert.deepEqual(notes('followup-skip'), [], 'waiting is not skipping');
  });

  it('sends nothing while the pilot is on', async () => {
    await scheduled();
    const { setPilot } = await fx.mod('golive.mjs');
    setPilot(fx.root, false, 'test');
    const s = maker();
    const r = await f.sendDue(fx.root, THU_NEXT, { send: s.send });
    assert.deepEqual([r.sent, r.skipped, r.failed, r.held], [[], [], [], []]);
    assert.deepEqual(s.calls, []);
  });

  it('a rehearsal sends nothing and records nothing', async () => {
    await scheduled();
    fx.append('ops/replies.jsonl', { at: '2026-11-11T08:00:00Z', received: '2026-11-11T07:55:00Z', message_id: '<r2@acme.test>', from: 'jane@acme.test', kind: 'reply', mode: 'live', sent_to: 'jane@acme.test', lead: ACME, file: 'outputs/replies/x.md' });
    const before = fx.read('ops/outreach.jsonl');
    const s = maker();
    const r = await f.sendDue(fx.root, FRI, { send: s.send, dryRun: true });
    assert.equal(r.skipped.length, 1);
    assert.equal(fx.read('ops/outreach.jsonl'), before);
    fx.write('ops/replies.jsonl', '');
    assert.deepEqual((await f.sendDue(fx.root, FRI, { send: s.send, dryRun: true })).sent.map((x) => [x.n, x.dry]), [[2, true]]);
    assert.deepEqual(s.calls, []);
  });
});
