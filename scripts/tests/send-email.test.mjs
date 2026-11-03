import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { approvalAllows, buildReport, fillPlaceholders, isSuppressed, nextInSequence, parseEmail, regreet } from '../send-email.mjs';

const DRAFT = `---
lead: L-1
task: T-1
---

## Send schedule

| Message | Working day |
|---|---|
| Email 1 | 0 |
| Email 2 | 4 |

## Email 1

Subject: A question

Hi Asha,

Body one.

{{SENDER_NAME}}, {{COMPANY_NAME}}

## Email 2

Subject: Second

Hi Asha,

Body two.
`;
const SENDER = { name: 'Sushant Mishra', role: 'Intern', company: 'PanScience Innovations', email: 's@x.com' };

describe('send-email', () => {
  it('reads one email and stops at the next heading', () => {
    const e = parseEmail(DRAFT, 1);
    assert.equal(e.subject, 'A question');
    assert.equal(e.total, 2);
    assert.ok(e.body.includes('Body one.'));
    assert.ok(!e.body.includes('Body two.'));
  });

  it('refuses a missing email', () => {
    assert.throws(() => parseEmail(DRAFT, 3), /no "## Email 3"/);
  });

  it('fills known placeholders and refuses unknown ones', () => {
    assert.equal(fillPlaceholders('{{SENDER_NAME}}, {{COMPANY_NAME}}', SENDER), 'Sushant Mishra, PanScience Innovations');
    assert.throws(() => fillPlaceholders('{{NEVER_CONTACT}}', SENDER), /unfilled: \{\{NEVER_CONTACT\}\}/);
  });

  it('regreets only the greeting line', () => {
    assert.equal(regreet('Hi Asha,\n\nHi Asha, again', 'Sushant'), 'Hi Sushant,\n\nHi Asha, again');
  });

  it('matches the opt-out list by address or domain', () => {
    const list = [{ value: 'acme.com', reason: 'opted out' }];
    assert.ok(isSuppressed('ceo@acme.com', list));
    assert.equal(isSuppressed('ceo@other.com', list), null);
  });

  it('covers subdomains and a profile URL, and an old bare shared-host entry blocks that host', () => {
    const list = [{ value: 'acme.com' }, { value: 'https://linkedin.com/in/asha' }];
    assert.ok(isSuppressed('ceo@mail.acme.com', list));
    assert.equal(isSuppressed('ceo@notacme.com', list), null);
    assert.ok(isSuppressed('https://www.linkedin.com/in/Asha/', list));
    assert.equal(isSuppressed('https://www.linkedin.com/in/lee', list), null);
    assert.equal(isSuppressed('mailto:ceo@acme.com', list)?.value, 'acme.com');
    const old = [...list, { value: 'linkedin.com' }]; // written before profile URLs were stored whole: blocks the host until a person replaces it
    assert.ok(isSuppressed('https://www.linkedin.com/in/lee', old));
    assert.ok(isSuppressed('lee@linkedin.com', old));
    assert.equal(isSuppressed('ceo@other.com', old), null);
  });

  it('allows a send only on a yes that names the recipient', () => {
    const table = [
      '| A-1 | T-1 | Send Email 1 to a@b.com | f | r | Yes, approved | Raj | 2026-11-02 |',
      '| A-2 | T-1 | Send Email 1 to a@b.com | f | r | pending | | |',
    ].join('\n');
    assert.equal(approvalAllows(table, 'A-1', 'a@b.com').ok, true);
    assert.equal(approvalAllows(table, 'A-2', 'a@b.com').ok, false);
    assert.equal(approvalAllows(table, 'A-1', 'other@b.com').ok, false);
    assert.equal(approvalAllows(table, 'A-9', 'a@b.com').ok, false);
  });

  it('finds the next email in the schedule', () => {
    assert.deepEqual(nextInSequence(DRAFT, 1), { email: 2, day: 4 });
    assert.equal(nextInSequence(DRAFT, 2), null);
  });

  it('puts the key details in the report', () => {
    const r = buildReport({ reportTo: { name: 'Raj' }, demo: true, sentAt: 'now', from: 'S <s@x.com>', to: 's@x.com', subject: '[DEMO] A question', messageId: '<id>', response: '250 OK', product: 'motionrepo', lead: 'L-1', draft: 'd.md', n: 1, total: 2, task: 'T-1', review: 'r.md: PASS 87/100', approval: 'not needed', lint: '0 failed', liveToday: 0, dailyLimit: 20, next: 'none', body: 'Body one.' });
    for (const s of ['Hi Raj,', 'DEMO', '<id>', 'L-1', 'PASS 87/100', 'Body one.', 'Email 1 of 2']) assert.ok(r.includes(s), s);
  });
});
