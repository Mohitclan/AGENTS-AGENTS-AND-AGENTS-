// Stands in for `claude -p --output-format stream-json` in the Jarvis tests. Reads the prompt on
// stdin and behaves according to words in the task:
//   "please fail"      ends with an error result
//   "hit the limit"    the plan's usage limit stops the session
//   "no report"        replies without writing a report or a JARVIS block
//   "needs approval"   finishes with status needs_approval
//   "add a lesson"     adds an entry to main memory, as the after-task review would
//   "passed draft"     writes an outreach draft and a PASS review of it
//   "mail settings"    changes ops/mail-config.json
// FAKE_UTIL sets the 5-hour window's reported utilization (default 0.2).
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const id = /JARVIS TASK (J-\d{8}-\d{2})/.exec(input)?.[1] || 'J-unknown';
  const emit = (e) => process.stdout.write(`${JSON.stringify(e)}\n`);
  const resetsAt = Math.floor(Date.now() / 1000) + 3600;
  emit({ type: 'system', subtype: 'init', session_id: 'fake' });
  emit({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Agent', input: { subagent_type: 'researcher', description: 'Fake research' } }] } });

  if (/hit the limit/i.test(input)) {
    emit({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', unifiedWindows: { five_hour: { utilization: 1, resetsAt } } } });
    emit({ type: 'result', is_error: true, result: 'Claude usage limit reached.', num_turns: 1 });
    return;
  }
  emit({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', unifiedWindows: { five_hour: { utilization: Number(process.env.FAKE_UTIL || 0.2), resetsAt } } } });

  if (/please fail/i.test(input)) {
    emit({ type: 'result', is_error: true, result: 'Something broke.', num_turns: 2 });
    return;
  }
  if (/add a lesson/i.test(input)) {
    appendFileSync(join(process.cwd(), 'memory', 'MAIN.md'), `- 2026-10-30 · Fake lesson for ${id} (source: test · by: coordinator)\n`);
  }
  if (/passed draft/i.test(input)) {
    const draft = `outputs/outreach/${id}.md`;
    mkdirSync(join(process.cwd(), 'outputs', 'reviews'), { recursive: true });
    writeFileSync(join(process.cwd(), draft), '## Email 1\n\nSubject: Fake launch note\n\nHi Asha,\n\nA fake email.\n\nReply "stop" and I won\'t write again.\n');
    writeFileSync(join(process.cwd(), 'outputs', 'reviews', `${id}-r1.md`), `# Review\n\n- Reviewed: \`${draft}\`\n\n**Verdict: PASS, 90/100.**\n`);
  }
  if (/mail settings/i.test(input)) appendFileSync(join(process.cwd(), 'ops', 'mail-config.json'), '\n');
  if (/no report/i.test(input)) {
    emit({ type: 'result', is_error: false, result: 'I did the thing but forgot the block.', num_turns: 3 });
    return;
  }
  mkdirSync(join(process.cwd(), 'outputs', 'reports'), { recursive: true });
  writeFileSync(join(process.cwd(), 'outputs', 'reports', `${id}.md`), `# ${id}\n\n## Result\nDone (${process.env.JARVIS_TASK_ID}).\n`);
  const status = /needs approval/i.test(input) ? 'needs_approval' : 'done';
  emit({ type: 'result', is_error: false, result: `All finished.\n\nJARVIS\nstatus: ${status}\nreport: outputs/reports/${id}.md\n`, num_turns: 5 });
});
