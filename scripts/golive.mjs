// The pilot switch: is real email allowed to reach leads, and the one way to change that.
//
// While ops/mail-config.json lists anyone under pilot.allow_only or pilot.test_recipients, nobody else can
// receive email (send-email.mjs refuses), and a tick on the Emails page sends [TEST] copies. "End the pilot"
// moves both lists aside into pilot.paused, so the file lists nobody and live sends are allowed. "Back to pilot"
// puts the same lists back exactly as they were. Each change is logged in ops/outreach.jsonl as
// { kind: 'pilot', live: true | false, by, at }.
//
// Only mission control's page does this (POST /api/pilot, after a person types "go live"): no command line and no
// agent. This module has no command line on purpose.
//
// Exports: pilotStatus(root) -> { on, recipients, names, paused: { at, by } | null };
// setPilot(root, live, by, now) -> { ok, live, message }.
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const configPath = (root) => join(root, 'ops', 'mail-config.json');

function readConfig(root) {
  try {
    return JSON.parse(readFileSync(configPath(root), 'utf8'));
  } catch {
    return null;
  }
}

// Is the pilot on, who may receive email while it is, and whether "Back to pilot" has lists to restore.
export function pilotStatus(root) {
  const pilot = readConfig(root)?.pilot || {};
  const recipients = [...new Set([...(pilot.allow_only || []), ...(pilot.test_recipients || [])].map((a) => String(a).toLowerCase()))];
  const paused = pilot.paused && typeof pilot.paused === 'object' ? { at: pilot.paused.at || null, by: pilot.paused.by || '' } : null;
  return { on: recipients.length > 0, recipients, names: pilot.test_names || {}, paused };
}

// End the pilot (live true) or go back to it (live false). Returns { ok, live, message }; nothing changes when
// ok is false.
export function setPilot(root, live, by = 'a person', now = new Date()) {
  const config = readConfig(root);
  if (!config) return { ok: false, live: false, message: 'ops/mail-config.json cannot be read, so the pilot was not changed.' };
  const pilot = (config.pilot ||= {});
  const on = pilotStatus(root).on;
  const at = new Date(now).toISOString();
  if (live) {
    if (!on) return { ok: false, live: true, message: 'The pilot is already off.' };
    pilot.paused = { allow_only: pilot.allow_only || [], test_recipients: pilot.test_recipients || [], at, by };
    pilot.allow_only = [];
    pilot.test_recipients = [];
  } else {
    if (on) return { ok: false, live: false, message: 'The pilot is already on.' };
    if (!pilot.paused || typeof pilot.paused !== 'object') return { ok: false, live: false, message: 'No pilot lists were set aside, so there is nothing to restore. Add the test recipients to ops/mail-config.json by hand.' };
    pilot.allow_only = pilot.paused.allow_only || [];
    pilot.test_recipients = pilot.paused.test_recipients || [];
    delete pilot.paused;
  }
  const file = configPath(root);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`);
  renameSync(tmp, file);
  if (existsSync(join(root, 'ops'))) appendFileSync(join(root, 'ops', 'outreach.jsonl'), `${JSON.stringify({ at, kind: 'pilot', live, by })}\n`);
  return {
    ok: true,
    live,
    message: live
      ? 'The pilot is off. A tick on the Emails page now sends to the lead, and approved follow-ups go out on their day.'
      : 'Back in the pilot: a tick sends [TEST] copies to the test recipients only, and scheduled follow-ups wait.',
  };
}
