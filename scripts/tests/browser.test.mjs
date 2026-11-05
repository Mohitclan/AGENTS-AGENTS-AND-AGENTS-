import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { readAgent, splitTools } from '../_agents.mjs';
import { ALLOW, DENY, withBrowser } from '../enable-browser.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const browser = JSON.parse(readFileSync(join(ROOT, '.mcp.json'), 'utf8')).mcpServers.playwright;
const READ_ONLY = ['browser_navigate', 'browser_snapshot', 'browser_find', 'browser_navigate_back', 'browser_wait_for', 'browser_press_key', 'browser_click', 'browser_tabs', 'browser_close'];
const browserTools = (name) => splitTools(readAgent(name).fields.tools).filter((t) => t.startsWith('mcp__playwright__')).map((t) => t.replace('mcp__playwright__', ''));

describe('the lead agents\' browser', () => {
  it('runs a pinned version, hidden, with a fresh empty profile and no screenshots', () => {
    assert.equal(browser.command, 'npx');
    assert.match(browser.args.find((a) => a.startsWith('@playwright/mcp@')), /^@playwright\/mcp@\d+\.\d+\.\d+$/);
    for (const flag of ['--headless', '--isolated']) assert.ok(browser.args.includes(flag), flag);
    assert.equal(browser.args[browser.args.indexOf('--image-responses') + 1], 'omit');
    for (const risky of ['--extension', '--user-data-dir', '--storage-state', '--cdp-endpoint', '--allow-unrestricted-file-access', '--caps']) assert.ok(!browser.args.includes(risky), risky);
  });

  it('refuses the sites that stay person-only', () => {
    const blocked = browser.args[browser.args.indexOf('--blocked-origins') + 1].split(';');
    for (const site of ['https://www.linkedin.com', 'https://x.com', 'https://twitter.com', 'https://www.reddit.com', 'https://peerlist.io', 'https://www.indiehackers.com', 'https://wellfound.com']) assert.ok(blocked.includes(site), site);
  });

  it('gives the lead agents reading tools only: no typing, forms, uploads or scripts', () => {
    for (const name of ['lead-generator', 'lead-generator-fallback', 'lead-scout', 'lead-scout-fallback']) {
      const tools = browserTools(name);
      assert.deepEqual([...tools].sort(), [...READ_ONLY].sort(), name);
    }
    for (const name of ['outreach', 'sales', 'developer', 'coordinator']) assert.deepEqual(browserTools(name), [], `${name} has the browser`);
  });

  it('allows exactly the reading tools in the project settings, and denies typing, forms, uploads and scripts', () => {
    assert.deepEqual(ALLOW.map((t) => t.replace('mcp__playwright__', '')).sort(), [...READ_ONLY].sort());
    for (const t of ['browser_type', 'browser_fill_form', 'browser_file_upload', 'browser_run_code_unsafe', 'browser_evaluate']) assert.ok(DENY.includes(`mcp__playwright__${t}`), t);
    const once = withBrowser({ permissions: { allow: ['WebSearch'], deny: [] } });
    assert.deepEqual(withBrowser(once), once, 'running it twice changes nothing');
    assert.deepEqual(once.enabledMcpjsonServers, ['playwright']);
    assert.equal(once.permissions.allow[0], 'WebSearch');
  });

  it('lets only the lead agent call the scouts, and the scouts call nobody', () => {
    assert.ok(readAgent('lead-generator').fields.can_ask.includes('lead-scout'));
    assert.equal(readAgent('lead-scout').fields.can_ask, undefined);
    assert.ok(!splitTools(readAgent('lead-scout').fields.tools).some((t) => /^(Agent|Bash|Edit)\b/.test(t)), 'a scout can only read and write its list');
  });
});
