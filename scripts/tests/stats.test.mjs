// Tests for scripts/stats.mjs. Fixtures only: nothing here reads the real pipeline, send log or reviews.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { HELD_FOR_PERSON, MOVED_FORWARD, OBJECTION_LABELS, OBJECTION_RECOVERED, Z95, objectionStats, parseReview, rateOf, replyRate, reviewName, reviewStats, wilson, windowClosed } from '../stats.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'stats.mjs');
const near = (a, b, eps = 0.0006) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const AS_OF = Date.parse('2026-12-01T00:00:00Z');

// ---------- Wilson interval ----------

test('wilson: known values for a 95% interval', () => {
  const half = wilson(5, 10);
  near(half[0], 0.2366);
  near(half[1], 0.7634);
  const none = wilson(0, 10);
  assert.equal(none[0], 0);
  near(none[1], 0.2775);
  const all = wilson(10, 10);
  near(all[0], 0.7225);
  near(all[1], 1, 1e-12);
  const one = wilson(1, 10);
  near(one[0], 0.0179);
  near(one[1], 0.4042);
});

test('wilson: each bound solves the defining equation, so the formula is not just copied', () => {
  for (const [k, n] of [[3, 12], [7, 40], [81, 263]]) {
    const p = k / n;
    for (const bound of wilson(k, n)) {
      // The Wilson bounds are the proportions x with (p - x)^2 = z^2 x (1 - x) / n.
      near((p - bound) ** 2, (Z95 ** 2 * bound * (1 - bound)) / n, 1e-9);
    }
  }
});

test('wilson: no trials gives no interval', () => {
  assert.ok(Number.isNaN(wilson(0, 0)[0]));
});

// ---------- the minimum sample ----------

test('rateOf: below the minimum there is no rate and no interval', () => {
  const r = rateOf(4, 9, 10);
  assert.equal(r.enough, false);
  assert.equal(r.rate, null);
  assert.equal(r.low, null);
  assert.equal(r.message, 'not enough data (n=9, need ≥10)');
  assert.equal(rateOf(4, 10, 10).enough, true);
  assert.equal(rateOf(4, 10, 10).rate, 0.4);
});

// ---------- closed windows, demo sends, reply rate ----------

const day = (n) => new Date(Date.parse('2026-11-01T09:00:00Z') + n * 86_400_000).toISOString();
const send = (lead, at, extra = {}) => ({ at, kind: 'outreach', mode: 'live', to: `${lead.toLowerCase()}@example.com`, lead, message_id: `<${lead}-${at}>`, ...extra });
const reply = (lead, kind, at, extra = {}) => ({ kind, mode: 'live', lead, sent_to: `${lead.toLowerCase()}@example.com`, received: at, ...extra });

test('windowClosed: closed only after the full window', () => {
  const start = Date.parse('2026-11-01T00:00:00Z');
  assert.equal(windowClosed(start, 14, Date.parse('2026-11-14T23:59:59Z')), false);
  assert.equal(windowClosed(start, 14, Date.parse('2026-11-15T00:00:00Z')), true);
});

test('reply rate: only closed windows count, and open ones are reported apart', () => {
  const sends = [send('A', day(0)), send('B', day(0)), send('C', day(10)), send('D', day(12))];
  const replies = [reply('A', 'reply', day(3)), reply('D', 'reply', day(13))];
  // 2026-11-16: A and B closed (sent 15 days ago), C and D still open.
  const r = replyRate({ sends, replies, asOfMs: Date.parse('2026-11-16T09:00:00Z'), min: 1 });
  assert.equal(r.closed, 2);
  assert.equal(r.still_open, 2);
  assert.equal(r.replied, 1, 'the reply from D is inside an open window and must not count');
  assert.equal(r.rate, 0.5);
  assert.equal(r.n, 2);
});

test('reply rate: a window flag changes what is closed', () => {
  const sends = [send('A', day(0))];
  const asOfMs = Date.parse('2026-11-09T09:00:00Z');
  assert.equal(replyRate({ sends, replies: [], asOfMs, min: 1 }).closed, 0);
  assert.equal(replyRate({ sends, replies: [], asOfMs, windowDays: 7, min: 1 }).closed, 1);
});

test('reply rate: demo sends and their replies are excluded', () => {
  const sends = [send('A', day(0)), send('B', day(0), { mode: 'demo' }), { at: day(0), kind: 'report', mode: 'live', to: 'x@example.com' }];
  const replies = [reply('A', 'reply', day(2)), reply('B', 'reply', day(2), { mode: 'demo' })];
  const r = replyRate({ sends, replies, asOfMs: AS_OF, min: 1 });
  assert.equal(r.live_sends, 1);
  assert.equal(r.closed, 1);
  assert.equal(r.replied, 1);
  assert.equal(r.demo_sends_excluded, 1);
});

test('reply rate: a demo-mode reply that carries a live contact\'s lead is not counted', () => {
  const sends = [send('A', day(0))];
  const r = replyRate({ sends, replies: [reply('A', 'reply', day(2), { mode: 'demo' })], asOfMs: AS_OF, min: 1 });
  assert.equal(r.closed, 1);
  assert.equal(r.replied, 0, 'a demo reply must not turn a live contact into a reply');
  assert.equal(replyRate({ sends, replies: [reply('A', 'reply', day(2))], asOfMs: AS_OF, min: 1 }).replied, 1, 'the same reply in live mode does count');
});

test('reply rate: a reply exactly at the end of the window counts, one second later does not', () => {
  const sends = [send('A', day(0))];
  const edge = replyRate({ sends, replies: [reply('A', 'reply', day(14))], asOfMs: AS_OF, min: 1 });
  assert.equal(edge.replied, 1);
  const after = replyRate({ sends, replies: [reply('A', 'reply', new Date(Date.parse(day(14)) + 1000).toISOString())], asOfMs: AS_OF, min: 1 });
  assert.equal(after.replied, 0);
  assert.equal(after.late_replies_not_counted, 1);
});

test('reply rate: a reply dated before the first send is not counted', () => {
  const r = replyRate({ sends: [send('A', day(5))], replies: [reply('A', 'reply', day(2))], asOfMs: AS_OF, min: 1 });
  assert.equal(r.replied, 0);
  assert.equal(r.replies_dated_before_first_send_not_counted, 1);
  assert.equal(r.late_replies_not_counted, 0);
});

test('reply rate: only demo sends means n=0 and no rate', () => {
  const r = replyRate({ sends: [send('B', day(0), { mode: 'demo' })], replies: [], asOfMs: AS_OF });
  assert.equal(r.n, 0);
  assert.equal(r.rate, null);
  assert.equal(r.message, 'not enough data (n=0, need ≥10)');
});

test('reply rate: auto-replies, late replies and bounces', () => {
  const sends = [send('A', day(0)), send('B', day(0)), send('C', day(0)), send('D', day(0))];
  const replies = [
    reply('A', 'auto_reply', day(1)),
    reply('B', 'reply', day(20)),
    reply('C', 'bounce', day(0)),
    reply('D', 'opt_out', day(2)),
  ];
  const r = replyRate({ sends, replies, asOfMs: AS_OF, min: 1 });
  assert.equal(r.bounced, 1);
  assert.equal(r.closed, 3, 'the bounced contact is left out of both sides');
  assert.equal(r.replied, 1, 'only D answered inside the window; an auto-reply is not an answer');
  assert.equal(r.late_replies_not_counted, 1);
});

test('reply rate: follow-ups to one contact count once, with the window from the first send', () => {
  const sends = [send('A', day(0)), send('A', day(4)), send('A', day(8))];
  const r = replyRate({ sends, replies: [reply('A', 'reply', day(9))], asOfMs: AS_OF, min: 1 });
  assert.equal(r.live_sends, 3);
  assert.equal(r.contacts, 1);
  assert.equal(r.closed, 1);
  assert.equal(r.replied, 1);
});

test('reply rate: --since keeps contacts by their first send, not single sends', () => {
  const since = Date.parse('2026-11-03T00:00:00Z'); // day(2) is the first day after it
  const sends = [send('A', day(0)), send('B', day(5)), send('A', day(10))];
  const r = replyRate({ sends, replies: [reply('A', 'reply', day(17))], asOfMs: AS_OF, sinceMs: since, min: 1 });
  assert.equal(r.contacts, 1, 'A was first emailed before --since, so A is out even though a follow-up is later');
  assert.equal(r.contacts_before_since_excluded, 1);
  assert.equal(r.live_sends, 1);
  assert.equal(r.replied, 0, 'A\'s late reply (day 17 from its first send) must not be counted through the follow-up');
  assert.equal(r.late_replies_not_counted, 0);
});

test('reply rate: the rate appears once n reaches the minimum, with an interval', () => {
  const sends = Array.from({ length: 10 }, (_, i) => send(`L${i}`, day(0)));
  const replies = [reply('L0', 'reply', day(2)), reply('L1', 'reply', day(2))];
  const r = replyRate({ sends, replies, asOfMs: AS_OF });
  assert.equal(r.enough, true);
  assert.equal(r.rate, 0.2);
  assert.ok(r.low < 0.2 && r.high > 0.2);
});

// ---------- reviews ----------

const review = (verdictLine, table = '') => `# Review\n\n${verdictLine}\n\n${table}\n`;

test('reviewName: round numbers and old file names', () => {
  assert.deepEqual(reviewName('T-20261030-01-review.md'), { task: 'T-20261030-01', round: 1 });
  assert.deepEqual(reviewName('T-20261030-01-review-r3.md'), { task: 'T-20261030-01', round: 3 });
  assert.deepEqual(reviewName('T-20261101-09-r2.md'), { task: 'T-20261101-09', round: 2 });
  assert.equal(reviewName('notes.md'), null);
});

test('reviews: revisions are reviews minus one, not REVISE verdicts', () => {
  const files = [
    { name: 'T-20261110-01-r1.md', text: review('**Verdict: REVISE, 60/100.**') },
    { name: 'T-20261110-01-r2.md', text: review('**Verdict: REVISE, 70/100.**') },
    { name: 'T-20261110-01-r3.md', text: review('**Verdict: PASS, 90/100.**') },
    { name: 'T-20261110-02-r1.md', text: review('**Verdict: PASS, 88/100.**') },
  ];
  const s = reviewStats(files, 1);
  assert.equal(s.tasks, 2);
  assert.equal(s.revisions_total, 2, 'task 1 has 3 reviews, so 2 revisions; task 2 has 0');
  assert.equal(s.avg_revisions, 1);
  assert.equal(s.per_task[0].revisions, 2);
  assert.equal(s.first_review_results, 2);
  assert.equal(s.first_review_passes, 1);
});

test('reviews: a split verdict counts each draft, not only the first', () => {
  const table = '| Lead | Score | Verdict | Why |\n|---|---|---|---|\n| A | 80 | **PASS** | x |\n| B | 60 | **REVISE** | y |\n| C | 50 | **ESCALATE** | z |\n| Overall | 50 | **REVISE** | lowest |\n';
  const parsed = parseReview(review('## Verdict: REVISE overall. A PASS, B REVISE', table));
  assert.equal(parsed.source, 'table');
  assert.equal(parsed.warning, null, 'the headline verdict REVISE is among the table verdicts');
  assert.deepEqual(parsed.results.map((r) => r.verdict), ['PASS', 'REVISE', 'ESCALATE']);
  const s = reviewStats([{ name: 'T-20261110-03-r1.md', text: review('x', table) }], 1);
  assert.equal(s.first_review_results, 3);
  assert.equal(s.first_review_passes, 1);
  assert.equal(s.revisions_total, 0);
});

test('reviews: frontmatter and headline verdicts, and "PASS line" is not a verdict', () => {
  assert.equal(parseReview('---\ntask: T-1\nverdict: PASS\n---\n\nbody').results[0].verdict, 'PASS');
  const p = parseReview('- **Verdict: REVISE.** Score 88/100, above the PASS line.');
  assert.equal(p.results[0].verdict, 'REVISE');
  assert.equal(p.warning, null);
  assert.equal(parseReview('no verdict here').results.length, 0);
});

test('reviews: a task whose round 1 file is missing is flagged, left out of the first-review rate, and its r2 proves one revision', () => {
  const s = reviewStats([{ name: 'T-20261110-04-r2.md', text: review('**Verdict: PASS, 83/100.**') }], 1);
  assert.equal(s.gaps.length, 1);
  assert.equal(s.first_review_results, 0);
  assert.equal(s.per_task[0].reviews, 1, 'one file');
  assert.equal(s.per_task[0].revisions, 1, 'the r2 file proves an r1 review took place');
  assert.equal(s.revisions_total, 1);
  const gap = reviewStats([{ name: 'T-20261110-06-r1.md', text: review('**Verdict: REVISE.**') }, { name: 'T-20261110-06-r3.md', text: review('**Verdict: PASS.**') }], 1);
  assert.equal(gap.per_task[0].revisions, 2, 'r1 and r3 files: three rounds happened');
});

test('reviews: a lettered sub-task review file is read, not skipped', () => {
  assert.deepEqual(reviewName('T-20261103-09a-r1.md'), { task: 'T-20261103-09a', round: 1 });
  const s = reviewStats([{ name: 'T-20261103-09a-r1.md', text: review('**Verdict: PASS.**') }, { name: 'T-20261103-09b-r1.md', text: review('**Verdict: REVISE.**') }], 1);
  assert.equal(s.skipped_files.length, 0);
  assert.equal(s.tasks, 2);
});

test('reviews: a check table is not read as drafts, and a table that contradicts the headline raises a warning', () => {
  const checks = '| Item | Verdict | Evidence |\n|---|---|---|\n| A1 superlatives | PASS | x |\n| A3 tiers | PASS | y |\n| B16 | PASS | z |\n';
  const p = parseReview('---\nverdict: REVISE\n---\n\n# r\n\n' + checks);
  assert.equal(p.source, 'frontmatter', 'the Item | Verdict table must not be counted as three PASS drafts');
  assert.deepEqual(p.results.map((r) => r.verdict), ['REVISE']);
  const drafts = '| Draft | Score | Verdict |\n|---|---|---|\n| A | 90 | PASS |\n| B | 91 | PASS |\n';
  const q = parseReview('---\nverdict: REVISE\n---\n\n' + drafts);
  assert.equal(q.source, 'table');
  assert.match(q.warning, /table verdicts are PASS but the frontmatter verdict is REVISE/);
});

test('reviews: under the minimum, no pass rate and no average', () => {
  const s = reviewStats([{ name: 'T-20261110-05-r1.md', text: review('**Verdict: PASS, 90/100.**') }], 10);
  assert.equal(s.first_review_pass_rate.enough, false);
  assert.equal(s.avg_revisions, null);
  assert.match(s.avg_revisions_message, /not enough data \(n=1, need ≥10\)/);
});

// ---------- objections ----------

const objection = (id, sent, label, replyAt) => ({ id, answer_sent: sent, reply_category: label, reply_at: replyAt });

test('objections: only answers a person sent, with the 7-day wait over', () => {
  const rows = [
    objection('O1', '2026-11-01', 'interested', '2026-11-03'),
    objection('O2', '2026-11-01', null, null),
    objection('O3', '2026-11-01', 'auto_reply', '2026-11-01'),
    objection('O4', '2026-11-05', 'interested', '2026-11-06'),
    objection('O5', null, null, null),
    objection('O6', '2026-11-01', 'bounce', null),
    objection('O7', '2026-11-01', 'unknown', '2026-11-02'),
    objection('O8', '2026-11-01', 'interested', '2026-11-20'),
  ];
  const s = objectionStats(rows, { asOfMs: Date.parse('2026-11-10T00:00:00Z'), min: 1 });
  assert.equal(s.not_answered_yet, 1);
  assert.equal(s.pending, 1, 'O4 is under 7 days old');
  assert.equal(s.bounced, 1);
  assert.equal(s.unlabelled, 1);
  assert.equal(s.closed, 4, 'O1, O2, O3 and O8');
  assert.equal(s.recovered, 1, 'only O1; O8 wrote back after the wait');
  assert.equal(s.late_replies_not_counted, 1);
});

test('objections: the latest line for an id wins and below the minimum there is no rate', () => {
  const rows = [objection('O1', '2026-11-01', null, null), objection('O1', '2026-11-01', 'objection', '2026-11-04')];
  const s = objectionStats(rows, { asOfMs: Date.parse('2026-11-20T00:00:00Z') });
  assert.equal(s.logged, 1);
  assert.equal(s.recovered, 1);
  assert.equal(s.enough, false);
  assert.equal(s.rate, null);
  assert.ok(OBJECTION_RECOVERED.has('interested') && !OBJECTION_RECOVERED.has('opt_out') && !OBJECTION_RECOVERED.has('auto_reply') && !OBJECTION_RECOVERED.has('declined'));
});

// Every label has exactly one place: wrote back (k), moved forward, in n only, or out of n.
// `side` is where one answered, closed objection with a reply inside the wait must land.
const LABEL_SIDES = {
  interested: { n: 1, k: 1, moved: 1 },
  objection: { n: 1, k: 1, moved: 0 },
  referral: { n: 1, k: 1, moved: 0 },
  not_now: { n: 1, k: 1, moved: 0 },
  wrong_person: { n: 1, k: 1, moved: 0 },
  needs_person: { n: 0, k: 0, moved: 0, held_for_person: 1 },
  declined: { n: 1, k: 0, moved: 0 },
  opt_out: { n: 1, k: 0, moved: 0 },
  complaint: { n: 1, k: 0, moved: 0 },
  auto_reply: { n: 1, k: 0, moved: 0 },
  bounce: { n: 0, k: 0, moved: 0, bounced: 1 },
  unknown: { n: 0, k: 0, moved: 0, unlabelled: 1 },
};

test('objections: every label is pinned to its side (wrote back, moved forward, in n only, left out)', () => {
  assert.deepEqual(Object.keys(LABEL_SIDES).sort(), [...OBJECTION_LABELS].sort(), 'a new label needs a line in this table');
  for (const [label, want] of Object.entries(LABEL_SIDES)) {
    const s = objectionStats([objection('O1', '2026-11-01', label, '2026-11-02')], { asOfMs: Date.parse('2026-11-20T00:00:00Z'), min: 1 });
    assert.equal(s.closed, want.n, `${label}: n`);
    assert.equal(s.recovered, want.k, `${label}: wrote back`);
    assert.equal(s.moved_forward.k, want.moved, `${label}: moved forward`);
    assert.equal(s.held_for_person, want.held_for_person ?? 0, `${label}: held for a person`);
    assert.equal(s.bounced, want.bounced ?? 0, `${label}: bounced`);
    assert.equal(s.unlabelled, want.unlabelled ?? 0, `${label}: unlabelled`);
  }
  assert.deepEqual([...OBJECTION_RECOVERED].sort(), ['interested', 'not_now', 'objection', 'referral', 'wrong_person']);
  assert.deepEqual([...MOVED_FORWARD], ['interested']);
  assert.deepEqual([...HELD_FOR_PERSON], ['needs_person']);
});

test('objections: not_now and wrong_person count as wrote back but not as moved forward; needs_person is held out of both sides', () => {
  const rows = [
    objection('O1', '2026-11-01', 'interested', '2026-11-02'),
    objection('O2', '2026-11-01', 'not_now', '2026-11-02'),
    objection('O3', '2026-11-01', 'wrong_person', '2026-11-02'),
    objection('O4', '2026-11-01', 'needs_person', '2026-11-02'),
    objection('O5', '2026-11-01', 'auto_reply', '2026-11-02'),
  ];
  const s = objectionStats(rows, { asOfMs: Date.parse('2026-11-20T00:00:00Z'), min: 1 });
  assert.equal(s.closed, 4, 'needs_person is in neither side');
  assert.equal(s.recovered, 3);
  assert.equal(s.rate, 0.75);
  assert.equal(s.moved_forward.k, 1);
  assert.equal(s.moved_forward.n, 4);
  assert.equal(s.held_for_person, 1);
});

test('objections: a reply on the last day of the wait counts, the day after does not, and one dated before the answer does not', () => {
  const asOfMs = Date.parse('2026-11-30T00:00:00Z');
  const one = (replyAt) => objectionStats([objection('O1', '2026-11-01', 'interested', replyAt)], { asOfMs, min: 1 });
  assert.equal(one('2026-11-08').recovered, 1, 'exactly 7 days after the answer');
  assert.equal(one('2026-11-09').recovered, 0);
  assert.equal(one('2026-11-09').late_replies_not_counted, 1);
  const before = one('2026-10-30');
  assert.equal(before.recovered, 0, 'a reply dated before the answer was sent is not a reply to it');
  assert.equal(before.moved_forward.k, 0);
  assert.equal(before.closed, 1);
});

test('objections: the smokescreen share counts only answers whose two markers are both known', () => {
  const m = (id, pre, none) => ({ ...objection(id, '2026-11-01', 'interested', '2026-11-02'), pre_information: pre, no_specifics: none });
  const rows = [m('O1', 'yes', 'yes'), m('O2', 'yes', 'no'), m('O3', 'no', 'no'), m('O4', 'unknown', 'yes'), m('O5', undefined, undefined), m('O6', 'yes', 'yes')];
  const s = objectionStats(rows, { asOfMs: Date.parse('2026-11-20T00:00:00Z'), min: 1 });
  assert.equal(s.smokescreen.k, 2, 'O1 and O6 have both markers yes');
  assert.equal(s.smokescreen.n, 4, 'O1, O2, O3 and O6 have both markers known');
  assert.equal(s.smokescreen.answers_without_both_markers, 2);
  assert.equal(s.smokescreen.rate, 0.5);
  const none = objectionStats([objection('O1', '2026-11-01', 'interested', '2026-11-02')], { asOfMs: Date.parse('2026-11-20T00:00:00Z'), min: 1 });
  assert.equal(none.smokescreen.n, 0);
  assert.equal(none.smokescreen.enough, false, 'no markers logged: no smokescreen share');
  const few = objectionStats(rows, { asOfMs: Date.parse('2026-11-20T00:00:00Z') });
  assert.equal(few.smokescreen.enough, false, 'below the minimum of 10 there is no percentage');
  assert.equal(few.moved_forward.enough, false);
});

// ---------- the command line, on a throwaway folder ----------

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'stats-test-'));
  for (const d of ['ops', 'pipeline', 'outputs/outreach', 'outputs/reviews', 'outputs/replies', 'outputs/sales']) mkdirSync(join(root, d), { recursive: true });
  const jl = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  writeFileSync(join(root, 'pipeline', 'leads.jsonl'), jl([{ id: 'L-1', status: 'drafted' }, { id: 'L-2', status: 'new' }, { id: 'L-3', status: 'drafted' }]));
  writeFileSync(join(root, 'ops', 'send-log.jsonl'), jl([send('A', '2026-10-01T09:00:00Z'), send('B', '2026-10-01T09:00:00Z', { mode: 'demo' }), { at: '2026-10-01T09:01:00Z', kind: 'report', mode: 'live' }]));
  writeFileSync(join(root, 'ops', 'replies.jsonl'), jl([{ ...reply('A', 'reply', '2026-10-03T09:00:00Z'), file: 'outputs/replies/a.md' }]));
  writeFileSync(join(root, 'ops', 'queue.json'), JSON.stringify([{ id: 'J-1', status: 'done' }, { id: 'J-2', status: 'needs_input' }]));
  writeFileSync(join(root, 'outputs', 'outreach', 'L-1.md'), '---\nlead: L-1\n---\n\n## Email 1\nSubject: x\n\n## Email 2\nSubject: y\n');
  writeFileSync(join(root, 'outputs', 'reviews', 'T-20261001-01-r1.md'), '**Verdict: REVISE, 60/100.**\n');
  writeFileSync(join(root, 'outputs', 'reviews', 'T-20261001-01-r2.md'), '**Verdict: PASS, 90/100.**\n');
  return root;
}

const cli = (root, ...args) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args, '--root', root], { encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
};

test('cli: every command works on a fixture, with --json, and refuses below the minimum', () => {
  const root = fixtureRoot();
  try {
    const p = JSON.parse(cli(root, 'pipeline', '--json').stdout);
    assert.deepEqual(p.leads, { n: 3, by_status: { new: 1, drafted: 2 } });
    assert.equal(p.drafts.draft_files, 1);
    assert.equal(p.drafts.emails_drafted, 2);
    assert.deepEqual(p.sends.by_mode, { live: 1, demo: 1 });
    assert.equal(p.replies.n, 1);
    assert.equal(p.jarvis_queue.n, 2);

    const rr = cli(root, 'reply-rate', '--as-of', '2026-12-01');
    assert.equal(rr.code, 0);
    assert.match(rr.stdout, /not enough data \(n=1, need ≥10\)/);
    assert.doesNotMatch(rr.stdout, /\d%/);
    const rj = JSON.parse(cli(root, 'reply-rate', '--as-of', '2026-12-01', '--min', '1', '--json').stdout);
    assert.equal(rj.rate, 1);
    assert.equal(rj.demo_sends_excluded, 1);
    const open = JSON.parse(cli(root, 'reply-rate', '--as-of', '2026-10-05', '--min', '1', '--json').stdout);
    assert.equal(open.closed, 0);
    assert.equal(open.still_open, 1);

    const rv = JSON.parse(cli(root, 'reviews', '--json', '--min', '1').stdout);
    assert.equal(rv.revisions_total, 1);
    assert.equal(rv.first_review_passes, 0);

    assert.match(cli(root, 'objections').stdout, /no objection data yet/);
    assert.equal(JSON.parse(cli(root, 'objections', '--json').stdout).available, false);

    assert.notEqual(cli(root, 'reply-rate', '--min', '0').code, 0);
    assert.notEqual(cli(root, 'nonsense').code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('cli: objections read outputs/sales/objection-log.jsonl', () => {
  const root = fixtureRoot();
  try {
    writeFileSync(join(root, 'outputs', 'sales', 'objection-log.jsonl'), [objection('O1', '2026-11-01', 'interested', '2026-11-02')].map((r) => JSON.stringify(r)).join('\n') + '\n');
    const s = JSON.parse(cli(root, 'objections', '--json', '--as-of', '2026-12-01').stdout);
    assert.equal(s.available, true);
    assert.equal(s.n, 1);
    assert.equal(s.enough, false);
    const text = cli(root, 'objections', '--as-of', '2026-12-01').stdout;
    assert.match(text, /not enough data \(n=1, need ≥10\)/);
    assert.match(text, /Moved forward \(interested only\): not enough data/);
    assert.match(text, /Smokescreen share .*: not enough data \(n=0, need ≥10\)/);
    assert.doesNotMatch(text, /\d%/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
