import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { DEFAULT_SCHEDULE, describeEvery, dueEntries, ensureSchedule, lastSlot, loadSchedule, nextSlot, parseEvery, runDue, saveSchedule, scheduleState, setEnabled, windowShare } from '../schedule.mjs';
import { makeCopy } from './_helpers.mjs';

// Local times: Monday 9 November 2026 is the date the team's first schedule was written.
const at = (day, h = 0, m = 0) => new Date(2026, 10, day, h, m);
const TEXT = 'Nightly lead sweep for motionrepo: stop at leads: no drafts.';
const task = (extra = {}) => ({ id: 'nightly', name: 'Nightly sweep', kind: 'task', every: 'daily 02:00', task: TEXT, enabled: true, last_run: null, ...extra });
const script = (extra = {}) => ({ id: 'weekly', name: 'Weekly report', kind: 'script', every: 'weekly mon 09:00', script: 'weekly.mjs', enabled: true, last_run: null, ...extra });

// A throwaway folder with only what the scheduler reads and writes.
function folder() {
  const dir = mkdtempSync(join(tmpdir(), 'schedule-test-'));
  mkdirSync(join(dir, 'ops', 'runs'), { recursive: true });
  return dir;
}
const planLimit = (dir, utilization, resetsAt) => writeFileSync(join(dir, 'ops', 'runs', 'plan-limits.json'), JSON.stringify({ at: new Date().toISOString(), windows: { five_hour: { utilization, resetsAt } } }));
const queueOf = (dir, tasks) => writeFileSync(join(dir, 'ops', 'queue.json'), JSON.stringify(tasks));
const entryOf = (dir, id) => loadSchedule(dir).find((e) => e.id === id);

// Stands in for Jarvis and the Claude session: records what would have been queued and started.
function fakes() {
  const calls = { added: [], started: 0 };
  return {
    calls,
    addTask: (_root, text) => {
      calls.added.push(text);
      return { id: `J-20261109-0${calls.added.length}` };
    },
    startQueued: () => {
      calls.started++;
      return { full: undefined, started: true };
    },
  };
}

describe('schedule times', () => {
  it('reads "daily HH:MM" and "weekly day HH:MM" and refuses anything else', () => {
    assert.deepEqual(parseEvery('daily 02:00'), { type: 'daily', hour: 2, minute: 0 });
    assert.deepEqual(parseEvery('weekly mon 09:00'), { type: 'weekly', day: 1, hour: 9, minute: 0 });
    assert.deepEqual(parseEvery(' Weekly  Sunday 9:30 '), { type: 'weekly', day: 0, hour: 9, minute: 30 });
    for (const bad of ['', 'hourly', 'daily 25:00', 'daily 2', 'weekly funday 09:00', 'weekly mon', null, undefined]) assert.equal(parseEvery(bad), null, String(bad));
    assert.equal(describeEvery('daily 02:00'), 'Every day at 02:00');
    assert.equal(describeEvery('weekly mon 09:00'), 'Every Monday at 09:00');
    assert.equal(describeEvery('soon'), null);
  });

  it('finds the latest and the next time a schedule names', () => {
    assert.deepEqual(lastSlot('daily 02:00', at(9, 2, 0)), at(9, 2, 0));
    assert.deepEqual(lastSlot('daily 02:00', at(9, 1, 59)), at(8, 2, 0));
    assert.deepEqual(lastSlot('daily 02:00', at(9, 23, 59)), at(9, 2, 0));
    assert.deepEqual(nextSlot('daily 02:00', at(9, 2, 0)), at(10, 2, 0));
    assert.deepEqual(lastSlot('weekly mon 09:00', at(9, 9, 0)), at(9, 9, 0));
    assert.deepEqual(lastSlot('weekly mon 09:00', at(9, 8, 59)), at(2, 9, 0));
    assert.deepEqual(lastSlot('weekly mon 09:00', at(14, 12, 0)), at(9, 9, 0)); // Saturday
    assert.deepEqual(nextSlot('weekly mon 09:00', at(9, 9, 0)), at(16, 9, 0));
    assert.deepEqual(lastSlot('daily 02:00', new Date(2026, 10, 1, 1, 0)), new Date(2026, 9, 31, 2, 0)); // across a month
  });

  it('is due from its time, not before, and only while it is on', () => {
    assert.deepEqual(dueEntries([task()], at(9, 1, 59)), []);
    assert.equal(dueEntries([task()], at(9, 2, 0)).length, 1);
    assert.equal(dueEntries([task()], at(9, 2, 1)).length, 1);
    assert.deepEqual(dueEntries([task({ enabled: false })], at(9, 2, 0)), []);
    assert.deepEqual(dueEntries([task({ enabled: undefined })], at(9, 2, 0)).length, 0);
    assert.deepEqual(dueEntries([task({ every: 'whenever' })], at(9, 2, 0)), []);
  });

  it('runs once a day: after it ran, not again until the next day', () => {
    const ran = task({ last_run: at(9, 2, 0).toISOString() });
    assert.deepEqual(dueEntries([ran], at(9, 2, 1)), []);
    assert.deepEqual(dueEntries([ran], at(9, 7, 0)), []);
    assert.deepEqual(dueEntries([ran], at(10, 1, 59)), []);
    assert.equal(dueEntries([ran], at(10, 2, 0)).length, 1);
    // an earlier day's run does not count for today
    assert.equal(dueEntries([task({ last_run: at(8, 2, 0).toISOString() })], at(9, 2, 5)).length, 1);
  });

  it('runs once a week, on its day', () => {
    assert.equal(dueEntries([script()], at(8, 23, 59)).length, 1); // never run: the week that began on Monday 2 November is still open
    const ran = script({ last_run: at(9, 9, 0).toISOString() });
    assert.deepEqual(dueEntries([ran], at(9, 9, 1)), []);
    assert.deepEqual(dueEntries([ran], at(15, 23, 59)), []);
    assert.equal(dueEntries([ran], at(16, 9, 0)).length, 1);
    assert.equal(dueEntries([script({ last_run: at(2, 9, 0).toISOString() })], at(9, 9, 0)).length, 1);
    assert.deepEqual(dueEntries([script({ last_run: at(2, 9, 0).toISOString() })], at(9, 8, 59)), []);
  });

  it('lets a task start only within its catch-up time, and a script any time in its day or week', () => {
    assert.equal(dueEntries([task()], at(9, 8, 0)).length, 1); // 6 hours after 02:00
    assert.deepEqual(dueEntries([task()], at(9, 8, 1)), []);
    assert.deepEqual(dueEntries([task()], at(9, 14, 0)), []);
    assert.equal(dueEntries([task({ catch_up_hours: 12 })], at(9, 14, 0)).length, 1);
    assert.equal(dueEntries([script({ every: 'daily 09:00' })], at(9, 23, 0)).length, 1);
    assert.equal(dueEntries([script()], at(13, 15, 0)).length, 1); // Friday, report not yet made
  });
});

describe('the plan share', () => {
  const dir = folder();
  after(() => rmSync(dir, { recursive: true, force: true }));
  const soon = Math.round(at(9, 2, 0).getTime() / 1000) + 3600;

  it('reads the 5-hour window, counts a reset window as empty, and knows nothing without a report', () => {
    assert.equal(windowShare(dir, at(9, 2, 0)), null);
    planLimit(dir, 0.72, soon);
    assert.equal(windowShare(dir, at(9, 2, 0)), 0.72);
    assert.equal(windowShare(dir, at(9, 4, 0)), 0); // reset since the report
    writeFileSync(join(dir, 'ops', 'runs', 'plan-limits.json'), JSON.stringify({ windows: { seven_day: { utilization: 0.9, resetsAt: soon } } }));
    assert.equal(windowShare(dir, at(9, 2, 0)), null);
  });
});

describe('queuing a task', () => {
  let dir;
  before(() => {
    dir = folder();
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  it('queues a due task once, starts the queue, and records last_run', () => {
    saveSchedule(dir, [task({ skip_over: 0.6 })]);
    const f = fakes();
    const first = runDue(dir, at(9, 2, 0), f);
    assert.deepEqual(first.map((r) => [r.id, r.action, r.task]), [['nightly', 'queued', 'J-20261109-01']]);
    assert.deepEqual(f.calls.added, [TEXT]);
    assert.equal(f.calls.started, 1);
    const saved = entryOf(dir, 'nightly');
    assert.equal(saved.last_run, at(9, 2, 0).toISOString());
    assert.equal(saved.last_note, 'Queued J-20261109-01');
    assert.equal(saved.skip_over, 0.6, 'the rest of the entry is kept');
  });

  it('never queues it twice the same day, also when mission control restarts', () => {
    const f = fakes();
    assert.deepEqual(runDue(dir, at(9, 2, 1), f), []);
    assert.deepEqual(runDue(dir, at(9, 2, 30), f), []);
    assert.deepEqual(runDue(dir, at(9, 6, 0), f), []);
    assert.deepEqual(f.calls.added, []);
    // a restart is a new reader of the same file
    assert.deepEqual(runDue(dir, at(9, 2, 2), fakes()), []);
  });

  it('queues it again the next day', () => {
    const f = fakes();
    assert.equal(runDue(dir, at(10, 2, 0), f)[0].action, 'queued');
    assert.equal(f.calls.added.length, 1);
    assert.equal(entryOf(dir, 'nightly').last_run, at(10, 2, 0).toISOString());
  });

  it('does nothing before its time, and nothing when it is off', () => {
    saveSchedule(dir, [task()]);
    const f = fakes();
    assert.deepEqual(runDue(dir, at(9, 1, 59), f), []);
    saveSchedule(dir, [task({ enabled: false })]);
    assert.deepEqual(runDue(dir, at(9, 2, 30), f), []);
    assert.equal(f.calls.added.length, 0);
    assert.equal(entryOf(dir, 'nightly').last_run, null);
  });

  it('does not queue it when the same text is already queued or running, and counts that day as done', () => {
    for (const status of ['queued', 'running']) {
      saveSchedule(dir, [task()]);
      queueOf(dir, [{ id: 'J-20261108-01', task: `  ${TEXT.replace(': ', ':\n')}  `, status }]);
      const f = fakes();
      const r = runDue(dir, at(9, 2, 0), f);
      assert.deepEqual(r.map((x) => x.action), ['already-queued'], status);
      assert.match(r[0].message, new RegExp(`already ${status} as J-20261108-01`));
      assert.equal(f.calls.added.length, 0);
      assert.equal(f.calls.started, 0);
      assert.deepEqual(runDue(dir, at(9, 3, 0), f), [], 'the day is taken as done');
    }
  });

  it('queues it when the same text only finished earlier, or a different task is waiting', () => {
    saveSchedule(dir, [task()]);
    queueOf(dir, [{ id: 'J-20261108-01', task: TEXT, status: 'done' }, { id: 'J-20261108-02', task: 'Something else', status: 'queued' }]);
    const f = fakes();
    assert.equal(runDue(dir, at(9, 2, 0), f)[0].action, 'queued');
  });

  it('tries again next minute when the task could not be queued, without marking the day done', () => {
    saveSchedule(dir, [task()]);
    queueOf(dir, []);
    const down = { addTask: () => ({ error: 'the queue is locked' }), startQueued: () => assert.fail('nothing was queued to start') };
    const r = runDue(dir, at(9, 2, 0), down);
    assert.deepEqual(r.map((x) => x.action), ['failed']);
    assert.match(entryOf(dir, 'nightly').last_note, /the queue is locked/);
    assert.equal(entryOf(dir, 'nightly').last_run, null);
    const f = fakes();
    assert.equal(runDue(dir, at(9, 2, 1), f)[0].action, 'queued');
  });

  it('still counts the task as queued when starting the queue throws', () => {
    saveSchedule(dir, [task()]);
    const r = runDue(dir, at(9, 2, 0), { addTask: () => ({ id: 'J-20261109-07' }), startQueued: () => { throw new Error('no spawn'); } });
    assert.equal(r[0].action, 'queued');
    assert.equal(entryOf(dir, 'nightly').last_run, at(9, 2, 0).toISOString());
  });
});

describe('skip_over: the plan share a task waits for', () => {
  let dir;
  before(() => {
    dir = folder();
  });
  after(() => rmSync(dir, { recursive: true, force: true }));
  const reset = Math.round(at(9, 7, 0).getTime() / 1000); // the window the plan is in resets at 07:00

  it('queues nothing while the 5-hour window is above the share, and tries again each minute', () => {
    saveSchedule(dir, [task({ skip_over: 0.6 })]);
    planLimit(dir, 0.72, reset);
    const f = fakes();
    for (const [h, m] of [[2, 0], [2, 1], [2, 2], [3, 30]]) {
      const r = runDue(dir, at(9, h, m), f);
      assert.deepEqual(r.map((x) => x.action), ['waiting']);
      assert.match(r[0].message, /5-hour window is 72% used, over 60%/);
    }
    assert.equal(f.calls.added.length, 0);
    assert.equal(f.calls.started, 0);
    assert.equal(entryOf(dir, 'nightly').last_run, null, 'a waiting entry is not marked as run');
  });

  it('queues it the minute the window falls to the share or below', () => {
    const f = fakes();
    planLimit(dir, 0.6, reset); // not above 0.6
    assert.equal(runDue(dir, at(9, 3, 31), f)[0].action, 'queued');
    assert.equal(f.calls.added.length, 1);
  });

  it('queues it once the window has reset, although the last report said it was full', () => {
    saveSchedule(dir, [task({ skip_over: 0.6 })]);
    planLimit(dir, 0.95, reset);
    const f = fakes();
    assert.equal(runDue(dir, at(9, 6, 59), f)[0].action, 'waiting');
    assert.equal(runDue(dir, at(9, 7, 1), f)[0].action, 'queued'); // 5 hours and 1 minute after 02:00: still inside the catch-up time
  });

  it('skips that day when the window does not clear before its catch-up time, and tries again the next day', () => {
    saveSchedule(dir, [task({ skip_over: 0.6 })]);
    const longReset = Math.round(at(9, 20, 0).getTime() / 1000);
    planLimit(dir, 0.9, longReset);
    const f = fakes();
    assert.equal(runDue(dir, at(9, 7, 59), f)[0].action, 'waiting');
    assert.deepEqual(runDue(dir, at(9, 8, 1), f), []);
    planLimit(dir, 0.1, longReset); // the window clears, but the day is skipped
    assert.deepEqual(runDue(dir, at(9, 12, 0), f), []);
    assert.equal(f.calls.added.length, 0);
    assert.equal(entryOf(dir, 'nightly').last_run, null);
    assert.equal(runDue(dir, at(10, 2, 0), f)[0].action, 'queued');
    assert.equal(f.calls.added.length, 1);
  });

  it('holds nothing back when no report of the window exists, or the entry has no skip_over', () => {
    saveSchedule(dir, [task({ skip_over: 0.6 })]);
    rmSync(join(dir, 'ops', 'runs', 'plan-limits.json'));
    assert.equal(runDue(dir, at(11, 2, 0), fakes())[0].action, 'queued');
    saveSchedule(dir, [task()]);
    planLimit(dir, 0.99, Math.round(at(12, 7, 0).getTime() / 1000));
    assert.equal(runDue(dir, at(12, 2, 0), fakes())[0].action, 'queued');
  });

  it('checks the same text is not queued before it checks the plan', () => {
    saveSchedule(dir, [task({ skip_over: 0.6 })]);
    queueOf(dir, [{ id: 'J-20261112-01', task: TEXT, status: 'queued' }]);
    planLimit(dir, 0.9, Math.round(at(13, 7, 0).getTime() / 1000));
    assert.equal(runDue(dir, at(13, 2, 0), fakes())[0].action, 'already-queued');
  });
});

describe('a script entry', () => {
  let dir;
  before(() => {
    dir = folder();
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    writeFileSync(join(dir, 'scripts', 'mark.mjs'), "import { appendFileSync } from 'node:fs';\nappendFileSync(new URL('../marks.txt', import.meta.url), `${process.argv.slice(2).join(' ')}\\n`);\nconsole.log('Marked it.');\n");
    writeFileSync(join(dir, 'scripts', 'boom.mjs'), "console.error('it broke');\nprocess.exit(3);\n");
  });
  after(() => rmSync(dir, { recursive: true, force: true }));
  const marks = () => (existsSync(join(dir, 'marks.txt')) ? readFileSync(join(dir, 'marks.txt'), 'utf8').trim().split('\n') : []);

  it('runs node scripts/<script> with its arguments, uses no task and no plan, and runs once a week', () => {
    saveSchedule(dir, [script({ script: 'mark.mjs --week 2026-11-02' })]);
    planLimit(dir, 0.99, Math.round(at(9, 20, 0).getTime() / 1000)); // a full plan holds back a task, not a script
    const f = fakes();
    const r = runDue(dir, at(9, 9, 0), f);
    assert.deepEqual(r.map((x) => [x.action, x.message]), [['ran', 'Ran Weekly report. Marked it.']]);
    assert.deepEqual(marks(), ['--week 2026-11-02']);
    assert.equal(f.calls.added.length, 0);
    assert.equal(f.calls.started, 0);
    assert.equal(entryOf(dir, 'weekly').last_run, at(9, 9, 0).toISOString());
    assert.equal(entryOf(dir, 'weekly').last_note, 'Ran mark.mjs --week 2026-11-02: Marked it.');
    assert.deepEqual(runDue(dir, at(9, 9, 1), f), []);
    assert.deepEqual(runDue(dir, at(14, 9, 0), f), []);
    assert.deepEqual(marks().length, 1);
    assert.equal(runDue(dir, at(16, 9, 0), f)[0].action, 'ran');
    assert.equal(marks().length, 2);
  });

  it('records a failing script and does not run it again that week', () => {
    saveSchedule(dir, [script({ script: 'boom.mjs' })]);
    const r = runDue(dir, at(9, 9, 0), fakes());
    assert.deepEqual(r.map((x) => x.action), ['failed']);
    assert.match(r[0].message, /Weekly report failed: Exit 3: it broke/);
    assert.match(entryOf(dir, 'weekly').last_note, /^Failed: Exit 3: it broke/);
    assert.deepEqual(runDue(dir, at(9, 9, 1), fakes()), []);
  });

  it('runs only a .mjs file directly under scripts/', () => {
    for (const bad of ['../marks.txt', '../../etc/passwd', 'mark.mjs/../../x.mjs', 'nothing.mjs', 'mark.js', '']) {
      saveSchedule(dir, [script({ script: bad })]);
      const r = runDue(dir, at(9, 9, 0), fakes());
      assert.deepEqual(r.map((x) => x.action), ['failed'], bad);
    }
    assert.equal(marks().length, 2, 'nothing ran');
  });
});

describe('the schedule file', () => {
  let dir;
  before(() => {
    dir = folder();
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  it('starts with the nightly lead sweep, the weekly report, the buyer-intent watch and the weekly posts', () => {
    const [nightly, weekly, intent, posts, social] = DEFAULT_SCHEDULE;
    assert.deepEqual([social.id, social.every, social.skip_over], ['weekly-social-report', 'weekly mon 11:00', 0.6]);
    assert.equal(nightly.id, 'nightly-leads');
    assert.equal(nightly.every, 'daily 02:00');
    assert.equal(nightly.enabled, true);
    assert.equal(nightly.skip_over, 0.6);
    assert.match(nightly.task, /^Nightly lead sweep for motionrepo: only products launched in the last 2 days on the launch boards in the lead-sources skill that agents can read \(Product Hunt, Show HN, the Indian launch boards\)\. Prove at most 5 leads, stop early when nothing new turns up, and stop at leads: no drafts\.$/);
    assert.deepEqual([weekly.id, weekly.kind, weekly.every, weekly.script, weekly.enabled], ['weekly-report', 'script', 'weekly mon 09:00', 'weekly.mjs', true]);
    assert.deepEqual([intent.id, intent.kind, intent.every, intent.enabled, intent.skip_over], ['buyer-intent-watch', 'task', 'daily 03:00', true, 0.6]);
    assert.deepEqual([posts.id, posts.kind, posts.every, posts.enabled], ['weekly-social-posts', 'task', 'weekly mon 10:00', true]);
    // the committed file holds the defaults (what a running server writes into it, last_run and a note, is its own)
    const shape = ({ last_run, last_note, enabled, ...rest }) => rest;
    assert.deepEqual(JSON.parse(readFileSync(new URL('../../ops/schedule.json', import.meta.url), 'utf8')).map(shape), DEFAULT_SCHEDULE.map(shape));
  });

  it('creates ops/schedule.json when it is missing, and leaves an existing one alone', () => {
    assert.equal(existsSync(join(dir, 'ops', 'schedule.json')), false);
    assert.equal(loadSchedule(dir).length, 5,'a missing file reads as the defaults');
    assert.equal(existsSync(join(dir, 'ops', 'schedule.json')), false, 'reading writes nothing');
    ensureSchedule(dir);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'ops', 'schedule.json'), 'utf8')), DEFAULT_SCHEDULE);
    saveSchedule(dir, [task()]);
    ensureSchedule(dir);
    assert.deepEqual(loadSchedule(dir).map((e) => e.id), ['nightly']);
  });

  it('reports a file that is not a list instead of overwriting it', () => {
    writeFileSync(join(dir, 'ops', 'schedule.json'), '{ not json');
    assert.throws(() => loadSchedule(dir), /not valid JSON/);
    assert.throws(() => runDue(dir, at(9, 2, 0), fakes()), /not valid JSON/);
    assert.equal(readFileSync(join(dir, 'ops', 'schedule.json'), 'utf8'), '{ not json');
    writeFileSync(join(dir, 'ops', 'schedule.json'), '{"a":1}');
    assert.throws(() => loadSchedule(dir), /must be a list/);
    assert.match(scheduleState(dir).error, /must be a list/);
  });

  it('switches an entry on and off, and says no to anything else', () => {
    saveSchedule(dir, [task(), script()]);
    assert.deepEqual(setEnabled(dir, 'nightly', false).entry.enabled, false);
    assert.equal(entryOf(dir, 'nightly').enabled, false);
    assert.equal(entryOf(dir, 'weekly').enabled, true);
    assert.equal(setEnabled(dir, 'nightly', true).entry.enabled, true);
    assert.deepEqual(setEnabled(dir, 'nope', true), { status: 404, error: 'No such schedule.' });
    assert.deepEqual(setEnabled(dir, 'nightly', 'yes'), { status: 400, error: 'Say on or off.' });
    assert.deepEqual(setEnabled(dir, 'nightly', undefined), { status: 400, error: 'Say on or off.' });
  });

  it('describes each entry for the page: when, next, last run, and whether the plan holds it back', () => {
    saveSchedule(dir, [task({ skip_over: 0.6, last_run: at(8, 2, 0).toISOString(), last_note: 'Queued J-20261108-01' }), script({ enabled: false }), task({ id: 'odd', every: 'sometimes' })]);
    planLimit(dir, 0.8, Math.round(at(9, 7, 0).getTime() / 1000));
    mkdirSync(join(dir, 'outputs', 'reports'), { recursive: true });
    for (const n of ['weekly-2026-11-02.md', 'weekly-2026-10-26.md', 'J-20261106-01.md', 'weekly-draft.md']) writeFileSync(join(dir, 'outputs', 'reports', n), '# x\n');
    const s = scheduleState(dir, at(9, 3, 0));
    const [nightly, weekly, odd] = s.entries;
    assert.deepEqual([nightly.id, nightly.when, nightly.enabled, nightly.due, nightly.next, nightly.last_run, nightly.note], ['nightly', 'Every day at 02:00', true, true, at(10, 2, 0).toISOString(), at(8, 2, 0).toISOString(), 'Queued J-20261108-01']);
    assert.equal(nightly.waiting, "Waiting: the plan's 5-hour window is 80% used (limit 60%)");
    assert.deepEqual([weekly.enabled, weekly.next, weekly.waiting], [false, null, null]);
    assert.match(odd.when, /Can't read "sometimes"/);
    assert.deepEqual(s.weekly.map((w) => [w.week, w.path]), [['2026-11-02', 'outputs/reports/weekly-2026-11-02.md'], ['2026-10-26', 'outputs/reports/weekly-2026-10-26.md']]);
  });
});

describe('the Reports page: schedules over HTTP', () => {
  const repo = makeCopy();
  let base;
  let child;
  const jsonOf = (r) => r.json().then((j) => ({ status: r.status, ...j }));
  const post = (path, body, headers = { Origin: base, 'X-Team-Page': '1' }) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(jsonOf);
  before(async () => {
    saveSchedule(repo.dir, structuredClone(DEFAULT_SCHEDULE));
    mkdirSync(repo.path('outputs', 'reports'), { recursive: true });
    writeFileSync(repo.path('outputs', 'reports', 'weekly-2026-11-02.md'), '# Weekly results: Mon 2 Nov to Sun 8 Nov 2026\n\n## At a glance\n\n| Mode | Sent |\n| --- | --- |\n| Live | 0 |\n');
    child = spawn(process.execPath, [repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: repo.dir, env: { ...process.env, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => {
    child?.kill();
    repo.remove();
  });

  it('puts the schedules and the weekly reports into the page state', async () => {
    const { schedule } = await (await fetch(`${base}/api/state`)).json();
    assert.deepEqual(schedule.entries.map((e) => [e.id, e.when, e.enabled]), [['nightly-leads', 'Every day at 02:00', true], ['weekly-report', 'Every Monday at 09:00', true], ['buyer-intent-watch', 'Every day at 03:00', true], ['weekly-social-posts', 'Every Monday at 10:00', true], ['weekly-social-report', 'Every Monday at 11:00', true]]);
    assert.ok(schedule.entries.every((e) => e.last_run === null && typeof e.next === 'string'));
    assert.deepEqual(schedule.weekly.map((w) => [w.week, w.path]), [['2026-11-02', 'outputs/reports/weekly-2026-11-02.md']]);
  });

  it('opens a weekly report in the file viewer', async () => {
    const doc = await (await fetch(`${base}/api/file?path=outputs/reports/weekly-2026-11-02.md`)).json();
    assert.match(doc.title, /^Weekly results: Mon 2 Nov/);
    assert.match(doc.html, /<table>/);
  });

  it('switches a schedule off and on from the page, and the file keeps it', async () => {
    const off = await post('/api/schedule/toggle', { id: 'nightly-leads', enabled: false });
    assert.equal(off.status, 200, off.message);
    assert.deepEqual([off.message, off.enabled], ['Nightly lead sweep is off.', false]);
    assert.equal(JSON.parse(readFileSync(repo.path('ops', 'schedule.json'), 'utf8')).find((e) => e.id === 'nightly-leads').enabled, false);
    assert.equal(JSON.parse(readFileSync(repo.path('ops', 'schedule.json'), 'utf8')).find((e) => e.id === 'weekly-report').enabled, true);
    const { schedule } = await (await fetch(`${base}/api/state`)).json();
    assert.deepEqual(schedule.entries.map((e) => [e.id, e.enabled, e.next === null]).slice(0, 2), [['nightly-leads', false, true], ['weekly-report', true, false]]);
    const on = await post('/api/schedule/toggle', { id: 'nightly-leads', enabled: true });
    assert.deepEqual([on.status, on.message], [200, 'Nightly lead sweep is on.']);
  });

  it('refuses an unknown schedule, a switch that is not on or off, and anyone but the page itself', async () => {
    assert.equal((await post('/api/schedule/toggle', { id: 'nope', enabled: true })).status, 404);
    const odd = await post('/api/schedule/toggle', { id: 'nightly-leads', enabled: 'maybe' });
    assert.deepEqual([odd.status, odd.message], [400, 'Say on or off.']);
    assert.equal((await post('/api/schedule/toggle', { id: 'nightly-leads', enabled: false }, {})).status, 403);
    const r = await fetch(`${base}/api/schedule/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example', 'X-Team-Page': '1' }, body: '{}' });
    assert.equal(r.status, 403);
    assert.equal(JSON.parse(readFileSync(repo.path('ops', 'schedule.json'), 'utf8')).find((e) => e.id === 'nightly-leads').enabled, true, 'none of those changed it');
  });

  it('writes the weekly report itself when its entry runs, with no Claude session', () => {
    // the week is named here so the test does not depend on today's date; the default entry names none
    const entries = loadSchedule(repo.dir).map((e) => (e.kind === 'task' ? { ...e, enabled: false } : { ...e, script: 'weekly.mjs --week 2026-11-02' }));
    saveSchedule(repo.dir, entries);
    const f = fakes();
    const r = runDue(repo.dir, at(9, 9, 0), f);
    assert.deepEqual(r.map((x) => [x.id, x.action]), [['weekly-report', 'ran']]);
    assert.match(r[0].message, /Wrote outputs\/reports\/weekly-2026-11-02\.md/);
    assert.ok(existsSync(repo.path('outputs', 'reports', 'weekly-2026-11-02.md')));
    assert.match(readFileSync(repo.path('outputs', 'reports', 'weekly-2026-11-02.md'), 'utf8'), /^# Weekly results: Mon 2 Nov to Sun 8 Nov 2026\n/);
    assert.equal(f.calls.added.length, 0);
    assert.equal(f.calls.started, 0);
    assert.deepEqual(runDue(repo.dir, at(9, 9, 5), f), []);
  });
});
