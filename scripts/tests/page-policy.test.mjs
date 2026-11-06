import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

const PAGE = join(import.meta.dirname, '..', 'control');
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.name === 'vendor' ? [] : e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : []));

describe('mission control page policy', () => {
  // The page's Content-Security-Policy is style-src 'self': the browser drops a style="..." attribute written into
  // HTML (and logs an error each time), so colours and cursors set that way silently vanish. Set them with
  // element.style or a class instead.
  it('writes no inline style attributes into the page', () => {
    const found = files(PAGE).flatMap((f) => readFileSync(f, 'utf8').split('\n').map((line, i) => [f, i + 1, line]))
      .filter(([, , line]) => /\bstyle\s*=\s*["'`]/.test(line))
      .map(([f, n]) => `${relative(PAGE, f)}:${n}`);
    assert.deepEqual(found, []);
  });
});
