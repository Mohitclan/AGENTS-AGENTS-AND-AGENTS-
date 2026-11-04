#!/usr/bin/env node
// Knowledge base status and confirmation.
//
//   node scripts/kb.mjs status            every knowledge file with its status and age
//   node scripts/kb.mjs confirm <file>    mark a file confirmed (human approval: settings.json asks first)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { ROOT, daysSince, fail, frontmatter, markConfirmed, printTable, today, walk } from './_shared.mjs';

const KB = join(ROOT, 'knowledge');
const STALE_AFTER_DAYS = 90;
// Folders that hold forms, copies and applied proposals, not live knowledge.
const NOT_KNOWLEDGE = ['knowledge/templates/', 'knowledge/inbox/', 'knowledge/history/', 'knowledge/proposals/applied/'];
const toRel = (p) => relative(ROOT, p).split(sep).join('/');

const [command, arg] = process.argv.slice(2);
if (command === 'status') status();
else if (command === 'confirm' && arg) confirm(arg);
else fail('Usage: node scripts/kb.mjs status | confirm <file>');

function status() {
  const rows = [];
  let proposals = 0;
  for (const file of walk(KB)) {
    const rel = toRel(file);
    if (rel.endsWith('/_template.md') || rel.endsWith('/README.md')) continue;
    if (NOT_KNOWLEDGE.some((dir) => rel.startsWith(dir))) continue;
    if (rel.startsWith('knowledge/proposals/')) {
      proposals++;
      continue;
    }
    const fm = frontmatter(readFileSync(file, 'utf8'));
    const age = fm?.last_verified ? daysSince(fm.last_verified) : null;
    const flags = [];
    if (!fm) flags.push('no frontmatter');
    else {
      if (!fm.status) flags.push('no status');
      if (age === null) flags.push('no last_verified date');
      else if (age > STALE_AFTER_DAYS) flags.push(`stale: ${age} days`);
    }
    rows.push({ status: fm?.status || '-', verified: fm?.last_verified || '-', file: rel, flags: flags.join(', ') });
  }

  if (!rows.length) console.log('No knowledge files yet. Add a product with /add-product.');
  else {
    rows.sort((a, b) => a.file.localeCompare(b.file));
    printTable(rows, ['status', 'verified', 'file', 'flags']);
    const counts = rows.reduce((c, r) => ({ ...c, [r.status]: (c[r.status] || 0) + 1 }), {});
    console.log(`\n${Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(', ')}`);
  }
  console.log(`${proposals} pending proposal(s) in knowledge/proposals/`);
}

function confirm(arg) {
  const file = resolve(process.cwd(), arg);
  const rel = toRel(file);
  if (!rel.startsWith('knowledge/') || !existsSync(file)) fail(`Not a knowledge file: ${arg}`);
  if (rel.startsWith('knowledge/proposals/')) {
    fail('Proposals are not confirmed directly. Apply the change to the target file, then confirm that file.');
  }
  if (rel.endsWith('/_template.md')) fail('The template is not knowledge.');

  const confirmed = markConfirmed(readFileSync(file, 'utf8'));
  if (confirmed === null) fail(`${rel} has no frontmatter.`);

  writeFileSync(file, confirmed);
  console.log(`Confirmed ${rel} (last_verified ${today()}).`);
}
