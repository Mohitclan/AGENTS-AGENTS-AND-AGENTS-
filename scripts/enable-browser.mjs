#!/usr/bin/env node
// Turns on the lead agents' browser for team runs. A person runs this, because it changes the project's permissions
// (.claude/settings.json), which agents and Claude may not change themselves.
//
//   node scripts/enable-browser.mjs           show what would change
//   node scripts/enable-browser.mjs --apply   make the change
//
// It switches on the `playwright` server from .mcp.json, allows its reading tools (open, read, find, scroll, click,
// back, wait, tabs, close) and denies the rest (typing, forms, uploads, scripts, screenshots), so even an agent file
// that listed them couldn't use them.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain } from './_shared.mjs';

const FILE = join(import.meta.dirname, '..', '.claude', 'settings.json');
const P = 'mcp__playwright__';
export const ALLOW = ['browser_navigate', 'browser_snapshot', 'browser_find', 'browser_navigate_back', 'browser_wait_for', 'browser_press_key', 'browser_click', 'browser_tabs', 'browser_close'].map((t) => P + t);
export const DENY = ['browser_type', 'browser_fill_form', 'browser_file_upload', 'browser_run_code_unsafe', 'browser_evaluate', 'browser_drag', 'browser_drop', 'browser_select_option', 'browser_handle_dialog', 'browser_take_screenshot'].map((t) => P + t);

export function withBrowser(settings) {
  const s = structuredClone(settings);
  s.permissions ??= {};
  const add = (key, items) => {
    s.permissions[key] ??= [];
    for (const t of items) if (!s.permissions[key].includes(t)) s.permissions[key].push(t);
  };
  add('allow', ALLOW);
  add('deny', DENY);
  s.enabledMcpjsonServers = [...new Set([...(s.enabledMcpjsonServers || []), 'playwright'])].sort();
  return s;
}

if (isMain(import.meta.url)) {
  const before = JSON.parse(readFileSync(FILE, 'utf8'));
  const after = withBrowser(before);
  const added = [
    ...after.permissions.allow.filter((t) => !before.permissions?.allow?.includes(t)).map((t) => `allow ${t}`),
    ...after.permissions.deny.filter((t) => !before.permissions?.deny?.includes(t)).map((t) => `deny  ${t}`),
    ...(before.enabledMcpjsonServers?.includes('playwright') ? [] : ['turn on the playwright server']),
  ];
  if (!added.length) {
    console.log('The browser is already on. Nothing to change.');
    process.exit(0);
  }
  console.log(`${process.argv.includes('--apply') ? 'Changed' : 'Would change'} .claude/settings.json:\n  ${added.join('\n  ')}`);
  if (process.argv.includes('--apply')) writeFileSync(FILE, `${JSON.stringify(after, null, 2)}\n`);
  else console.log('\nRun again with --apply to make the change.');
}
