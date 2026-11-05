// Stands in for `claude -p --output-format json` in the guide tests. Records what it was run with and sent, then
// replies according to FAKE_MODE: ok (default, answer in FAKE_ANSWER), error, garbage or slow.
import { appendFileSync } from 'node:fs';

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  if (process.env.FAKE_RECORD) appendFileSync(process.env.FAKE_RECORD, `${JSON.stringify({ args: process.argv.slice(2), input })}\n`);
  const mode = process.env.FAKE_MODE || 'ok';
  if (mode === 'slow') return void setInterval(() => undefined, 1000);
  if (mode === 'garbage') return void console.log('this is not json');
  if (mode === 'error') return void console.log(JSON.stringify({ type: 'result', is_error: true, result: 'Claude usage limit reached.' }));
  return void console.log(JSON.stringify({ type: 'result', is_error: false, result: process.env.FAKE_ANSWER ?? 'The leads are on the Leads page.\nOPEN: leads' }));
});
