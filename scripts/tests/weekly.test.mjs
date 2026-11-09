import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { renderMarkdown } from '../dashboard.mjs';
import { adviceFrom, collectWeek, lastWeek, parseDay, renderReport, sourceOf, usageOfLog, weekRange, writeWeekly } from '../weekly.mjs';
import { makeCopy } from './_helpers.mjs';

// The week used throughout: Monday 2 November to Sunday 8 November 2026, local time.
const iso = (day, h = 12, m = 0, month = 11) => new Date(2026, month - 1, day, h, m).toISOString();
const local = (day, h, m) => `2026-11-${String(day).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const WEEK = weekRange(new Date(2026, 10, 3));
const jsonl = (rows) => `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`;
const put = (root, file, text) => {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
};

const result = (cost, models) => JSON.stringify({ type: 'result', subtype: 'success', is_error: false, num_turns: 4, result: 'done', total_cost_usd: cost, modelUsage: Object.fromEntries(Object.entries(models).map(([name, [costUSD, inputTokens, outputTokens]]) => [name, { inputTokens, outputTokens, cacheReadInputTokens: 5, cacheCreationInputTokens: 6, costUSD }])) });
const limit = (utilization, resetsAt, extra = {}) => JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', unifiedWindows: { five_hour: { utilization, resetsAt, status: 'allowed' }, seven_day: { utilization: 0.5, resetsAt: 9_999_999_999 }, ...extra } } });

describe('which week', () => {
  it('runs from Monday 00:00 to the next Monday 00:00, local time', () => {
    const w = weekRange(new Date(2026, 10, 8, 23, 59)); // Sunday night
    assert.deepEqual([w.monday, w.sunday], ['2026-11-02', '2026-11-08']);
    assert.deepEqual([w.start, w.end], [new Date(2026, 10, 2), new Date(2026, 10, 9)]);
    assert.deepEqual(w.days, ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
    assert.equal(weekRange(new Date(2026, 10, 9, 0, 0)).monday, '2026-11-09');
    assert.equal(weekRange(new Date(2026, 10, 2, 0, 0)).monday, '2026-11-02');
    assert.equal(weekRange(new Date(2026, 9, 31)).monday, '2026-10-26'); // a Saturday, across a month
  });

  it('defaults to the week that has just ended', () => {
    assert.equal(lastWeek(new Date(2026, 10, 9, 9, 0)).monday, '2026-11-02'); // Monday 09:00, when the report runs
    assert.equal(lastWeek(new Date(2026, 10, 14, 12, 0)).monday, '2026-11-02'); // Saturday
    assert.equal(lastWeek(new Date(2026, 10, 8, 23, 0)).monday, '2026-10-26'); // Sunday night: that week is not over
    assert.equal(lastWeek(new Date(2026, 0, 5)).monday, '2025-12-29'); // across a year
  });

  it('reads a day, and refuses anything that is not one', () => {
    assert.deepEqual(parseDay('2026-11-04'), new Date(2026, 10, 4));
    for (const bad of ['', 'today', '2026-13-01', '2026-02-30', '04-11-2026', null]) assert.equal(parseDay(bad), null, String(bad));
  });
});

describe('what one run log says about plan use', () => {
  it('adds up the cost per model, and the rise of the 5-hour window in each window it saw', () => {
    const log = [
      '{"type":"system","subtype":"init"}',
      'not json at all',
      limit(0.8, 1000), limit(0.86, 1000), limit(0.95, 1000), // one window: 0.80 to 0.95
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'a quoted "type":"result" inside a message' }] } }),
      limit(0.02, 2000), limit(0.1, 2000), // the next window, after a reset: 0.02 to 0.10
      JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { unifiedWindows: { seven_day: { utilization: 0.5, resetsAt: 3000 } } } }), // a report with no 5-hour window
      result(2.5, { 'claude-opus-5-5': [2, 100, 200], 'claude-sonnet-5-5': [0.5, 10, 20] }),
    ].join('\n');
    const u = usageOfLog(log);
    assert.equal(u.sessions, 1);
    assert.equal(u.cost, 2.5);
    assert.deepEqual(u.models['claude-opus-5-5'], { cost: 2, input: 100, output: 200, cacheRead: 5, cacheWrite: 6 });
    assert.equal(u.models['claude-sonnet-5-5'].cost, 0.5);
    assert.equal(u.points, 23);
  });

  it('adds the sessions of a log that was written to twice, and reads an empty or odd log as nothing', () => {
    const u = usageOfLog([limit(0.1, 1000), result(1, { 'claude-haiku-5-5': [1, 1, 1] }), limit(0.4, 1000), result(0.5, { 'claude-haiku-5-5': [0.5, 1, 1] })].join('\n'));
    assert.deepEqual([u.sessions, u.cost, u.models['claude-haiku-5-5'].cost, u.points], [2, 1.5, 1.5, 30]);
    assert.deepEqual(usageOfLog(''), { cost: 0, models: {}, points: 0, sessions: 0 });
    assert.equal(usageOfLog('{"type":"result","is_error":false,"num_turns":0}').sessions, 0, 'a result line with no cost is not a session');
  });
});

describe('where a lead came from', () => {
  it('is the host of its first evidence link, without www, skipping superseded and empty items', () => {
    assert.equal(sourceOf({ evidence: [{ url: 'https://www.producthunt.com/products/x' }] }), 'producthunt.com');
    assert.equal(sourceOf({ evidence: [{ url: 'https://old.example/x', superseded: true }, { claim: 'no link' }, { url: 'https://News.YCombinator.com/item?id=1' }] }), 'news.ycombinator.com');
    assert.equal(sourceOf({ evidence: [] }), 'unknown');
    assert.equal(sourceOf({ evidence: [{ url: 'not a link' }] }), 'unknown');
    assert.equal(sourceOf(undefined), 'unknown');
  });
});

// A week of fixture data, made so each number below can be counted by hand.
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'weekly-test-'));
  const lead = (id, company, evidence, imported, note = '') => ({ id, company, product: 'motionrepo', status: 'qualified', evidence, history: [{ at: imported, event: 'imported', status: 'new', note }] });
  const ph = Array.from({ length: 6 }, (_, i) => lead(`L-a000000${i + 1}`, `PH ${i + 1}`, [{ url: 'https://www.producthunt.com/products/p' }, { url: 'https://other.example' }], i < 3 ? '2026-11-03' : '2026-10-20', i === 3 ? 'pipeline/inbox/2026-11-02-older-1.jsonl' : ''));
  const hn = Array.from({ length: 10 }, (_, i) => lead(`L-b00000${String(i + 1).padStart(2, '0')}`, `HN ${i + 1}`, [{ url: 'https://news.ycombinator.com/item?id=1' }], '2026-11-08'));
  const noSource = lead('L-none0001', 'No Source', [], '2026-11-09'); // imported the Monday after: not this week
  put(root, 'pipeline/leads.jsonl', jsonl([...ph, ...hn, noSource, { ...ph[0], company: 'PH 1 (newer line)' }]));

  const sends = [];
  const send = (id, to, subject, mode, at, leadId) => sends.push({ at, kind: 'outreach', mode, to, subject, draft: `outputs/outreach/${leadId}.md`, email: 1, lead: leadId, message_id: `<${id}>` });
  // 6 live sends of subject 1 to Product Hunt leads, 3 test copies of it, 10 live sends of subject 2 to Hacker News leads
  ph.forEach((l, i) => send(`ph${i + 1}`, `ph${i + 1}@example.test`, 'Your launch video', 'live', iso(3 + (i % 3), 10 + i), l.id));
  for (const t of ['purab', 'tanvi', 'mohit']) send(`t-${t}`, `${t}@team.test`, '[TEST] Your launch video', 'test', iso(4, 15), ph[0].id);
  hn.forEach((l, i) => send(`hn${i + 1}`, `hn${i + 1}@example.test`, 'A quick question', 'live', iso(5 + (i % 3), 9 + i), l.id));
  send('demo1', 'me@panscience.test', 'Your launch video', 'demo', iso(4, 9), ph[0].id);
  send('before', 'x@example.test', 'Your launch video', 'live', new Date(2026, 10, 1, 23, 59).toISOString(), ph[1].id); // Sunday before
  send('after', 'x@example.test', 'Your launch video', 'live', new Date(2026, 10, 9, 0, 0).toISOString(), ph[1].id); // Monday after
  sends.push({ at: iso(4, 11), kind: 'report', mode: 'test', to: 'mohit@team.test', subject: '[Send report] x', for: '<ph1>', message_id: '<report1>' });
  put(root, 'ops/send-log.jsonl', jsonl(sends));

  const reply = (id, kind, forId, received, leadId) => ({ at: received, received, message_id: `<r-${id}>`, from: 'someone@example.test', subject: 'Re: x', kind, mode: 'live', sent_to: 'x@example.test', send_message_id: `<${forId}>`, lead: leadId });
  put(root, 'ops/replies.jsonl', jsonl([
    reply('1', 'reply', 'ph1', iso(4, 16), ph[0].id),
    reply('2', 'opt_out', 'ph2', iso(5, 9), ph[1].id),
    reply('3', 'auto_reply', 'hn1', iso(6, 9), hn[0].id),
    reply('4', 'reply', 'ph3', iso(9, 10), ph[2].id), // the Monday after: not received this week, but it answers a send from this week
  ]));

  put(root, 'ops/outreach.jsonl', jsonl([
    { at: iso(4, 9), kind: 'draft-request', leads: [ph[0].id], task: 'J-1', by: 'x' },
    { at: iso(5, 9), kind: 'email-decision', decision: 'approve', emails: ['outputs/outreach/a.md#1', 'outputs/outreach/a.md#2', 'outputs/outreach/b.md#1'], by: 'x' },
    { at: iso(6, 9), kind: 'email-decision', decision: 'approve', emails: ['outputs/outreach/c.md#1'], by: 'x' },
    { at: iso(6, 10), kind: 'email-decision', decision: 'decline', emails: ['outputs/outreach/c.md#2', 'outputs/outreach/c.md#3'], by: 'x' },
    { at: iso(9, 9), kind: 'email-decision', decision: 'decline', emails: ['outputs/outreach/d.md#1'], by: 'x' }, // after the week
  ]));

  // a run from before Jarvis kept `leads_found`: its report names the lead and the file it was imported from
  put(root, 'outputs/reports/J-20261102-02.md', '# Older lead run\n\nImported pipeline/inbox/2026-11-02-older-1.jsonl: L-a0000004 qualified.\n');
  put(root, 'ops/queue.json', JSON.stringify([
    { id: 'J-20261102-02', task: 'Older lead run', status: 'done', added: local(2, 9, 0), started: local(2, 9, 1), finished: local(2, 10, 0), report: 'outputs/reports/J-20261102-02.md' },
    { id: 'J-20261103-01', task: 'Lead sprint | for motionrepo', status: 'done', added: local(3, 9, 0), started: local(3, 9, 1), finished: local(3, 10, 0), leads_found: ['L-a0000001', 'L-a0000002', 'L-a0000003'] },
    { id: 'J-20261104-01', task: 'Nightly lead sweep for motionrepo', status: 'done', added: local(4, 2, 0), started: local(4, 2, 1), finished: local(4, 3, 0), leads_found: [] },
    { id: 'J-20261105-01', task: 'Draft emails for the new leads', status: 'needs_approval', added: local(5, 9, 0), started: local(5, 9, 1), finished: local(5, 9, 30), leads_found: [] },
    { id: 'J-20261106-01', task: 'An older task with no log kept', status: 'done', added: local(6, 9, 0), started: local(6, 9, 1), finished: local(6, 11, 0) },
    { id: 'J-20261028-01', task: 'Last week', status: 'done', added: local(28, 9, 0), started: local(28, 9, 1), finished: '2026-10-28 10:00', leads_found: ['L-x'] },
    { id: 'J-20261109-01', task: 'The Monday after', status: 'done', added: local(9, 0, 0), started: local(9, 0, 1), finished: local(9, 0, 5), leads_found: [] },
    { id: 'J-20261107-01', task: 'Still waiting', status: 'queued', added: local(7, 9, 0) },
  ]));
  put(root, 'ops/runs/J-20261103-01.log', [limit(0.1, 5000), result(2.5, { 'claude-opus-5-5': [2, 100, 200], 'claude-sonnet-5-5': [0.5, 10, 20] }), limit(0.3, 5000)].join('\n'));
  put(root, 'ops/runs/J-20261104-01.log', [limit(0.3, 5000), result(1, { 'claude-sonnet-5-5': [1, 1, 1] }), limit(0.38, 5000)].join('\n'));
  // the drafting lane keeps one log per step; the task's own log holds only a result line with no cost
  put(root, 'ops/runs/J-20261105-01.log', '{"type":"result","is_error":false,"result":"ok","num_turns":0}\n');
  put(root, 'ops/runs/lane/J-20261105-01-1-outreach.log', [limit(0.38, 5000), result(0.4, { 'claude-sonnet-5-5': [0.4, 1, 1] }), limit(0.4, 5000)].join('\n'));
  put(root, 'ops/runs/lane/J-20261105-01-2-evaluator.log', [limit(0.4, 5000), result(0.1, { 'claude-haiku-5-5': [0.1, 1, 1] }), limit(0.41, 5000)].join('\n'));

  const draft = (id, drafted) => put(root, `outputs/outreach/${id}.md`, `---\nlead: ${id}\ncompany: ${id === 'L-a0000001' ? 'PH 1' : `Company ${id}`}\ndrafted_on: ${drafted}\n---\n\n## Email 1\n\nSubject: hi\n\nBody.\n`);
  draft('L-a0000001', '2026-11-04');
  draft('L-a0000002', '2026-11-05');
  draft('L-a0000003', '2026-10-30'); // before the week
  put(root, 'outputs/outreach/test-purab.md', '# not a draft\n');
  put(root, 'outputs/reviews/T-20261104-01-r1.md', '# Review of outputs/outreach/L-a0000001.md\n\n**Verdict: PASS, 90/100.**\n');
  put(root, 'outputs/reviews/T-20261105-01-r1.md', '# Review of outputs/outreach/L-a0000002.md\n\n**Verdict: REVISE, 60/100.**\n');
  return root;
}

describe('the numbers in a week of fixture data', () => {
  let root;
  let data;
  before(() => {
    root = fixture();
    data = collectWeek(root, WEEK);
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  it('counts the emails sent, live against test, leaving out what falls outside the week and what is not outreach', () => {
    assert.deepEqual(data.sent, { live: 16, test: 3, demo: 1, other: 0, total: 20 });
  });

  it('counts the replies received in the week, by kind, and the opt-outs', () => {
    assert.deepEqual(data.received.kinds, { reply: 1, opt_out: 1, auto_reply: 1 });
    assert.deepEqual([data.received.total, data.received.answers], [3, 2]);
    assert.deepEqual(data.optOuts, ['L-a0000002']);
  });

  it('works out the reply rate over the week\'s sends, whenever the answer came, without demo sends or auto-replies', () => {
    // answered sends: ph1 (reply), ph2 (opt-out), ph3 (a reply the next Monday); hn1 only auto-replied
    assert.deepEqual([data.rates.live.k, data.rates.live.n], [3, 16]);
    assert.deepEqual([data.rates.test.k, data.rates.test.n], [0, 3]);
    assert.deepEqual([data.rates.all.k, data.rates.all.n, data.rates.all.enough], [3, 19, true]);
    assert.equal(data.rates.test.enough, false);
  });

  it('leaves a send whose email bounced out of both sides of the rate', () => {
    const more = `${readFileSync(join(root, 'ops', 'replies.jsonl'), 'utf8')}${JSON.stringify({ at: iso(5, 12), received: iso(5, 12), kind: 'bounce', mode: 'live', send_message_id: '<hn2>', sent_to: 'hn2@example.test' })}\n`;
    put(root, 'ops/replies.jsonl', more);
    const bounced = collectWeek(root, WEEK);
    assert.deepEqual([bounced.rates.all.k, bounced.rates.all.n], [3, 18]);
    assert.equal(bounced.received.kinds.bounce, 1);
    assert.equal(bounced.received.answers, 2, 'a bounce is not an answer');
    writeFileSync(join(root, 'ops', 'replies.jsonl'), more.split('\n').slice(0, -2).join('\n') + '\n'); // back to the fixture
  });

  it('breaks it down by subject line (test copies joined to the live subject) and by lead source', () => {
    assert.deepEqual(data.bySubject, [
      { name: 'A quick question', sent: 10, replied: 0 },
      { name: 'Your launch video', sent: 9, replied: 3 },
    ]);
    assert.deepEqual(data.bySource, [
      { name: 'news.ycombinator.com', sent: 10, replied: 0 },
      { name: 'producthunt.com', sent: 9, replied: 3 },
    ]);
  });

  it('counts leads found per finished run, runs that found none, and leads imported in the week', () => {
    assert.deepEqual(data.leads.runs.map((r) => [r.id, r.found]), [['J-20261102-02', 1], ['J-20261103-01', 3], ['J-20261104-01', 0], ['J-20261105-01', 0]]);
    assert.deepEqual([data.leads.found, data.leads.quiet], [4, 2]);
    assert.equal(data.leads.imported, 13, 'three Product Hunt leads on the 3rd and ten Hacker News leads on the 8th, not the one on the 9th');
  });

  it('counts drafts written in the week and how many passed review, and the emails approved and declined', () => {
    assert.deepEqual(data.drafts.written.map((d) => [d.lead, d.company, d.verdict]), [['L-a0000001', 'PH 1', 'PASS'], ['L-a0000002', 'Company L-a0000002', 'REVISE']]);
    assert.equal(data.drafts.passed, 1);
    assert.deepEqual(data.decisions, { approved: 4, declined: 2 });
  });

  it('adds up plan use per run from its log and its drafting-lane logs, and says when a run has no log', () => {
    const byId = Object.fromEntries(data.plan.runs.map((r) => [r.id, r]));
    assert.deepEqual(Object.keys(byId), ['J-20261102-02', 'J-20261103-01', 'J-20261104-01', 'J-20261105-01', 'J-20261106-01']);
    assert.deepEqual([byId['J-20261103-01'].cost, byId['J-20261103-01'].points, byId['J-20261103-01'].logged], [2.5, 20, true]);
    assert.deepEqual(Object.fromEntries(Object.entries(byId['J-20261103-01'].models).map(([n, m]) => [n, m.cost])), { 'claude-opus-5-5': 2, 'claude-sonnet-5-5': 0.5 });
    assert.deepEqual([byId['J-20261104-01'].cost, byId['J-20261104-01'].points], [1, 8]);
    assert.ok(Math.abs(byId['J-20261105-01'].cost - 0.5) < 1e-9);
    assert.equal(byId['J-20261105-01'].points, 3);
    assert.equal(byId['J-20261105-01'].sessions, 2);
    assert.equal(byId['J-20261106-01'].logged, false);
    assert.ok(Math.abs(data.plan.cost - 4) < 1e-9);
    assert.equal(data.plan.points, 31);
    assert.equal(data.plan.logged, 3);
    assert.deepEqual(Object.keys(data.plan.models).sort(), ['claude-haiku-5-5', 'claude-opus-5-5', 'claude-sonnet-5-5']);
    assert.ok(Math.abs(data.plan.models['claude-sonnet-5-5'] - 1.9) < 1e-9);
  });

  it('suggests what to do more and less of, from the counts', () => {
    assert.deepEqual(adviceFrom(data), [
      'Do more of: leads from producthunt.com. They gave the most replies: 3 replies from 9 sends.',
      'Do more of: the subject line "Your launch video": 3 replies from 9 sends.',
      'Do less of: the subject line "A quick question". No replies after 10 sends.',
      'Do less of: leads from news.ycombinator.com. No replies after 10 sends.',
    ]);
  });
});

describe('what to do more and less of', () => {
  const base = { sent: { live: 0, test: 0 }, received: { answers: 0 }, bySubject: [], bySource: [], leads: { runs: [] }, plan: { runs: [] } };
  it('says so when there is not enough to judge, in two lines', () => {
    const lines = adviceFrom({ ...base, sent: { live: 4, test: 0 }, bySubject: [{ name: 'S', sent: 4, replied: 0 }], bySource: [{ name: 'a.test', sent: 4, replied: 0 }] });
    assert.equal(lines.length, 2);
    assert.match(lines[0], /^Not enough replies yet to say what to do more of: 4 emails sent, 0 answers received\./);
    assert.match(lines[1], /^Nothing to do less of yet: no subject line or source has had 10 sends without a reply\.$/);
  });

  it('judges a subject line or a source silent only from 10 sends, and picks the one with the most sends', () => {
    const lines = adviceFrom({ ...base, bySubject: [{ name: 'Nine', sent: 9, replied: 0 }, { name: 'Ten', sent: 10, replied: 0 }, { name: 'Twelve', sent: 12, replied: 0 }], bySource: [{ name: 'a.test', sent: 9, replied: 0 }] });
    assert.deepEqual(lines.filter((l) => /^Do less/.test(l)), ['Do less of: the subject line "Twelve". No replies after 12 sends.']);
  });

  it('prefers the source and subject with the most replies, then the better rate', () => {
    const lines = adviceFrom({ ...base, bySource: [{ name: 'a.test', sent: 20, replied: 2 }, { name: 'b.test', sent: 4, replied: 2 }, { name: 'c.test', sent: 3, replied: 0 }], bySubject: [{ name: 'S1', sent: 1, replied: 1 }] });
    assert.equal(lines[0], 'Do more of: leads from b.test. They gave the most replies: 2 replies from 4 sends.');
    assert.equal(lines[1], 'Do more of: the subject line "S1": 1 reply from 1 send.');
  });

  it('flags the lead run that found nothing and cost the most window points', () => {
    const lines = adviceFrom({ ...base, leads: { runs: [{ id: 'J-1', found: 0 }, { id: 'J-2', found: 0 }, { id: 'J-3', found: 4 }] }, plan: { runs: [{ id: 'J-1', points: 3 }, { id: 'J-2', points: 12 }, { id: 'J-3', points: 40 }] } });
    assert.ok(lines.includes('Do less of: runs that find no leads. J-2 found none and used about 12 points of the 5-hour window.'), lines.join('\n'));
    assert.ok(lines.length >= 2 && lines.length <= 4);
  });
});

describe('the report', () => {
  let root;
  let markdown;
  before(() => {
    root = fixture();
    markdown = renderReport(collectWeek(root, WEEK), { now: new Date(2026, 10, 9, 9, 0) });
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  it('opens with the week, and a glance at every number', () => {
    assert.match(markdown, /^# Weekly results: Mon 2 Nov to Sun 8 Nov 2026\n/);
    assert.match(markdown, /from Monday 2026-11-02 to Sunday 2026-11-08 \(local time\)/);
    assert.match(markdown, /PanScience Innovations AI sales team/);
    assert.match(markdown, /- Emails sent: 20 \(live 16, test copies 3, demo 1\)/);
    assert.match(markdown, /- Replies received: 3; real answers \(a reply, opt-out or complaint\): 2; opt-outs: 1/);
    assert.match(markdown, /- Reply rate: 15\.8% \(3 of 19 sends\)/);
    assert.match(markdown, /- Leads found: 4 in 4 runs; 13 new in the pipeline/);
    assert.match(markdown, /- Drafts written: 2, passed review: 1/);
    assert.match(markdown, /- Emails approved: 4, declined: 2/);
    assert.match(markdown, /- Plan use: \$4\.00 at list prices over 5 runs, about 31 points of the 5-hour window/);
  });

  it('has the tables, with a rate only from 10 sends', () => {
    assert.match(markdown, /\| Live \| 16 \|/);
    assert.match(markdown, /\| Test copies \| 3 \|/);
    assert.match(markdown, /\| A quick question \| 10 \| 0 \| 0% \|/);
    assert.match(markdown, /\| Your launch video \| 9 \| 3 \| - \|/);
    assert.match(markdown, /\| producthunt\.com \| 9 \| 3 \| - \|/);
    assert.match(markdown, /\| J-20261103-01 \| Lead sprint \/ for motionrepo \| 3 \|/, 'a pipe in a task is not a column');
    assert.match(markdown, /\| J-20261103-01 \| Lead sprint \/ for motionrepo \| \$2\.50 \| opus-5-5 \$2\.00, sonnet-5-5 \$0\.50 \| 20 \|/);
    assert.match(markdown, /\| J-20261106-01 \| An older task with no log kept \| no log here \| - \| - \|/);
    assert.match(markdown, /\| L-a0000002 \| Company L-a0000002 \| 2026-11-05 \| sent back \|/);
    assert.match(markdown, /Opt-outs: 1 \(L-a0000002\)\./);
    assert.match(markdown, /list prices .*proxy for plan use, not money charged/);
  });

  it('has the do more and do less lines', () => {
    const section = /## Do more of, do less of\n\n([\s\S]*?)\n\n## /.exec(markdown)[1].split('\n');
    assert.equal(section.length, 4);
    assert.ok(section.every((l) => /^- Do (more|less) of: /.test(l)));
  });

  it('renders as a page in the file viewer: headings, bullets and tables', () => {
    const html = renderMarkdown(markdown, 'outputs/reports/weekly-2026-11-02.md');
    assert.match(html, /<h3 id="at-a-glance">At a glance<\/h3>/);
    assert.equal((html.match(/<table>/g) || []).length >= 6, true);
    assert.match(html, /<li>Emails sent: 20/);
  });
});

describe('a week with no data', () => {
  const root = mkdtempSync(join(tmpdir(), 'weekly-empty-'));
  after(() => rmSync(root, { recursive: true, force: true }));

  it('says "no data yet" in each section and still gives two lines of advice', () => {
    const md = renderReport(collectWeek(root, WEEK), { now: new Date(2026, 10, 9, 9, 0) });
    assert.match(md, /- Emails sent: 0 \(live 0, test copies 0, demo 0\)/);
    assert.match(md, /- Reply rate: no rate yet \(0 of 0 sends answered; a rate needs 10 sends\)/);
    assert.match(md, /- Plan use: no runs finished/);
    for (const text of ['No data yet: no emails were sent this week.', 'No data yet: no emails were sent and no replies came in.', 'No data yet: no emails to count.', 'No data yet: no run finished this week and no lead was imported.', 'No data yet: no draft was written and no email was approved or declined this week.', 'No data yet: no run finished this week.']) assert.ok(md.includes(text), text);
    assert.equal((md.match(/^- Do (more|less) of|^- (Not enough|Nothing to do)/gm) || []).length, 2);
    assert.doesNotMatch(md, /NaN|undefined|null/);
  });

  it('copes with broken lines and a queue that is not a list', () => {
    put(root, 'ops/send-log.jsonl', '{ broken\n');
    put(root, 'ops/queue.json', '{"not":"a list"}');
    put(root, 'ops/replies.jsonl', 'nope\n');
    const data = collectWeek(root, WEEK);
    assert.equal(data.sent.total, 0);
    assert.deepEqual(data.plan.runs, []);
  });
});

describe('node scripts/weekly.mjs', () => {
  const repo = makeCopy();
  after(() => repo.remove());

  it('writes the report for the week that just ended, named by its Monday', () => {
    const monday = lastWeek().monday;
    const r = repo.run('weekly.mjs');
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`^Wrote outputs/reports/weekly-${monday}\\.md \\(\\d+ emails?, \\d+ repl(y|ies), \\d+ runs?\\)\\.`));
    const text = readFileSync(repo.path('outputs', 'reports', `weekly-${monday}.md`), 'utf8');
    assert.match(text, /^# Weekly results: /);
    assert.match(text, /## Do more of, do less of/);
  });

  it('writes the report for the week named with --week, whatever day of it is given', () => {
    for (const day of ['2026-11-02', '2026-11-04', '2026-11-08']) {
      rmSync(repo.path('outputs', 'reports', 'weekly-2026-11-02.md'), { force: true });
      const r = repo.run('weekly.mjs', '--week', day);
      assert.equal(r.code, 0, r.stderr);
      assert.ok(existsSync(repo.path('outputs', 'reports', 'weekly-2026-11-02.md')), day);
      assert.match(readFileSync(repo.path('outputs', 'reports', 'weekly-2026-11-02.md'), 'utf8'), /^# Weekly results: Mon 2 Nov to Sun 8 Nov 2026/);
    }
  });

  it('refuses a week that is not a date, and anything else on the command line', () => {
    for (const args of [['--week', 'last'], ['--week'], ['--week', '2026-02-31'], ['now']]) {
      const r = repo.run('weekly.mjs', ...args);
      assert.equal(r.code, 1, args.join(' '));
      assert.match(r.stderr, /Usage: node scripts\/weekly\.mjs \[--week YYYY-MM-DD\]/);
    }
  });

  it('writes the same file again when run again for the same week', () => {
    const w = writeWeekly(repo.dir, WEEK, { now: new Date(2026, 10, 9, 9, 0) });
    assert.equal(w.path, 'outputs/reports/weekly-2026-11-02.md');
    assert.equal(readFileSync(repo.path(w.path), 'utf8'), w.markdown);
    assert.equal(writeWeekly(repo.dir, WEEK, { now: new Date(2026, 10, 9, 9, 0) }).markdown, w.markdown);
  });
});
