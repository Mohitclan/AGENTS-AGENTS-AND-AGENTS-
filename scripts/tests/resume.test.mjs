import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { after, describe, it } from 'node:test';
import { markResume, resumeIfDue } from '../dashboard.mjs';
import { makeCopy } from './_helpers.mjs';

// The queue restarts by itself once the plan window that stopped it has reset. Each case leaves the queue in a
// state where nothing may start, or checks the note before any start, so no agent run begins in a test.
describe('waiting tasks resume after the plan window resets', () => {
  const repo = makeCopy();
  after(() => repo.remove());
  const note = (resetsAt) => writeFileSync(repo.path('ops', 'runs', 'resume-after-limit.json'), JSON.stringify({ at: 'x', resetsAt }));
  const queue = (tasks) => writeFileSync(repo.path('ops', 'queue.json'), JSON.stringify(tasks));
  const noteLeft = () => existsSync(repo.path('ops', 'runs', 'resume-after-limit.json'));
  mkdirSync(repo.path('ops', 'runs'), { recursive: true });

  it('records the latest reset of the full windows when the queue is held back', () => {
    const soon = Math.round(Date.now() / 1000) + 600;
    const later = soon + 600;
    writeFileSync(repo.path('ops', 'runs', 'plan-limits.json'), JSON.stringify({ windows: { five_hour: { utilization: 0.9, resetsAt: soon }, seven_day: { utilization: 0.95, resetsAt: later } } }));
    markResume(repo.dir);
    assert.ok(noteLeft());
    assert.equal(resumeIfDue(repo.dir, Date.now()), null, 'not before the reset');
    assert.ok(noteLeft());
    assert.equal(resumeIfDue(repo.dir, later * 1000 + 30_000), null, 'not within the minute of grace');
  });

  it('does nothing without a note, and clears the note when nothing is waiting', () => {
    writeFileSync(repo.path('ops', 'runs', 'plan-limits.json'), JSON.stringify({ windows: {} }));
    queue([{ id: 'J-1', status: 'done' }]);
    note(1);
    assert.equal(resumeIfDue(repo.dir), null);
    assert.ok(!noteLeft(), 'nothing waiting: the note goes');
    assert.equal(resumeIfDue(repo.dir), null, 'no note: nothing to do');
  });

  it('waits while a newer usage report says a window is still full', () => {
    queue([{ id: 'J-1', status: 'queued' }]);
    note(1);
    writeFileSync(repo.path('ops', 'runs', 'plan-limits.json'), JSON.stringify({ windows: { five_hour: { utilization: 0.99, resetsAt: Math.round(Date.now() / 1000) + 3600 } } }));
    assert.equal(resumeIfDue(repo.dir), null);
    assert.ok(noteLeft());
  });

  it('leaves a run that is already going alone', () => {
    writeFileSync(repo.path('ops', 'runs', 'plan-limits.json'), JSON.stringify({ windows: {} }));
    writeFileSync(repo.path('ops', 'runs', 'jarvis.lock'), String(process.pid)); // this test's own process: alive
    note(1);
    assert.equal(resumeIfDue(repo.dir), null);
    assert.ok(!noteLeft());
  });
});
