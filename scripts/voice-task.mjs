#!/usr/bin/env node
// Hands the team a task the way the task box on mission control does: the same request, so the task is
// queued, the run starts in the background, and the plan's usage guard still applies. Used by the voice
// agent once the person has said "go start". Mission control has to be running (npm start).
//
//   node scripts/voice-task.mjs "<the task, in the person's words>"
//
// Prints one plain sentence: "J-... is starting.", "... is queued, and starts after the current task.",
// or why it could not be sent.
import { isMain } from './_shared.mjs';

const MAX_TASK = 2000; // the task box's limit

export async function sendTask(task, { port = Number(process.env.CONTROL_PORT) || 4318, fetchFn = fetch } = {}) {
  const text = String(task || '').replace(/\s+/g, ' ').trim();
  if (!text) return { ok: false, message: 'There is no task to send.' };
  if (text.length > MAX_TASK) return { ok: false, message: `That task is too long: keep it under ${MAX_TASK} characters.` };
  const origin = `http://127.0.0.1:${port}`;
  let res;
  try {
    res = await fetchFn(`${origin}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Team-Page': '1' },
      body: JSON.stringify({ task: text }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, message: `Mission control is not running at ${origin}. Start it with npm start in the team folder, then try again.` };
  }
  let data = {};
  try {
    data = (await res.json()) || {};
  } catch {
    // not JSON: report the status below
  }
  if (res.status === 401) return { ok: false, message: 'Mission control wants a sign-in, so the task was not sent. Send it from the browser.' };
  return res.ok ? { ok: true, message: data.message || 'The task was sent.', id: data.id } : { ok: false, message: data.message || `Mission control refused it (${res.status}).` };
}

if (isMain(import.meta.url)) {
  const result = await sendTask(process.argv.slice(2).join(' '));
  console.log(result.message);
  process.exitCode = result.ok ? 0 : 1;
}
