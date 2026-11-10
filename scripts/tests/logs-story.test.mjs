import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildGroups, duration, filterGroups, isNoise, isProblem, storyLines } from '../control/logs-story.js';

const label = (n) => ({ 'lead-generator': 'Lead generator', 'lead-scout': 'Lead scout', evaluator: 'Evaluator' })[n] || n;
const ev = (at, agent, kind, text, extra = {}) => ({ at: `2026-11-10T10:${at}:00.000Z`, agent, kind, status: 'ok', text, task: 'J-1', ...extra });
const events = [
  ev('00', 'lead-generator', 'handoff', 'Asked lead-scout: sweep Peerlist', { to: 'lead-scout' }),
  ev('01', 'lead-generator', 'handoff', 'Asked lead-scout: sweep HN', { to: 'lead-scout' }),
  ev('02', 'lead-generator', 'handoff', 'Asked lead-scout: sweep PH', { to: 'lead-scout' }),
  ev('03', 'lead-generator', 'handoff', 'Asked lead-scout: sweep Reddit', { to: 'lead-scout' }),
  ev('04', 'lead-scout', 'read', 'Read knowledge/x.md'),
  ev('04', 'lead-scout', 'command', 'Ran grep foo'),
  ev('05', 'evaluator', 'review', 'Reviewed T-1: PASS', { verdict: 'PASS' }),
  ev('06', 'evaluator', 'review', 'Reviewed T-2: PASS', { verdict: 'PASS' }),
  ev('07', 'evaluator', 'review', 'Reviewed T-3: REVISE', { verdict: 'REVISE' }),
  ev('08', 'lead-scout', 'error', 'peerlist.io returned 403', { status: 'failed' }),
  ev('09', 'system', 'send', 'Email sent to a@b.test', { task: null }),
];

describe('logs story', () => {
  it('hides routine steps and merges hand-offs and reviews into plain lines', () => {
    const lines = storyLines(events.filter((e) => e.task), label).map((l) => l.text);
    assert.deepEqual(lines, [
      'Lead generator handed work to 4 lead scouts',
      'Evaluator reviewed 3 deliverables: 2 passed, 1 sent back',
      'Lead scout hit a problem: peerlist.io returned 403',
    ]);
    assert.ok(isNoise(events[4]) && isNoise(events[5]) && !isNoise(events[0]));
  });

  it('marks failures as problems', () => {
    const lines = storyLines(events, label);
    assert.equal(lines.find((l) => /403/.test(l.text)).bad, true);
    assert.ok(isProblem(events[9]));
  });

  it('groups by task, running first then newest, with loose steps last', () => {
    const tasks = [
      { id: 'J-1', title: 'Find leads', status: 'done', product: 'motionrepo', started: '2026-11-10 10:00', finished: '2026-11-10 10:42' },
      { id: 'J-2', title: 'Research', status: 'running', product: 'peelpress', started: '2026-11-09 09:00' },
      { id: 'J-3', title: 'Newest', status: 'done', started: '2026-11-10 11:00', finished: '2026-11-10 11:01' },
    ];
    const more = [...events, { at: '2026-11-09T09:05:00Z', agent: 'researcher', kind: 'web', text: 'x', status: 'ok', task: 'J-2' }, { at: '2026-11-10T11:00:30Z', agent: 'researcher', kind: 'web', text: 'y', status: 'ok', task: 'J-3' }];
    const groups = buildGroups(more, tasks, Date.parse('2026-11-09T10:00:00'));
    assert.deepEqual(groups.map((g) => g.id), ['J-2', 'J-3', 'J-1', '']);
    assert.equal(groups.find((g) => g.id === 'J-1').ms, 42 * 60000);
    assert.equal(groups[0].ms, 3600000);
  });

  it('filters by product, agent, problems and search', () => {
    const groups = buildGroups(events, [{ id: 'J-1', title: 'Find leads', status: 'done', product: 'motionrepo' }]);
    assert.equal(filterGroups(groups, { product: 'peelpress' }).length, 0);
    assert.equal(filterGroups(groups, { product: 'motionrepo' }).length, 1);
    const bad = filterGroups(groups, { problems: true });
    assert.deepEqual(bad.map((g) => g.events.length), [1]);
    assert.equal(filterGroups(groups, { agent: 'evaluator' })[0].events.length, 3);
    assert.equal(filterGroups(groups, { q: 'peerlist' })[0].events.length, 2);
    assert.equal(filterGroups(groups, { q: 'find leads' })[0].events.length, 10);
  });

  it('writes durations a person reads', () => {
    assert.equal(duration(40000), '40 s');
    assert.equal(duration(12 * 60000), '12 min');
    assert.equal(duration(65 * 60000), '1 h 05 min');
  });
});
