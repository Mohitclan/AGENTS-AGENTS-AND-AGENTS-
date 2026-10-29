#!/usr/bin/env node
// Builds docs/AI-Sales-Growth-Team.pdf from docs/ARCHITECTURE.md and docs/PLAN.md.
// Markdown and Mermaid diagrams are rendered in headless Chrome, so this needs
// Google Chrome and an internet connection (the renderers load from a CDN).
//
//   node scripts/build-docs-pdf.mjs
//   CHROME="/path/to/chrome" node scripts/build-docs-pdf.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, fail } from './_shared.mjs';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SOURCES = ['docs/ARCHITECTURE.md', 'docs/PLAN.md'];
const OUT = join(ROOT, 'docs', 'AI-Sales-Growth-Team.pdf');

if (!existsSync(CHROME)) fail(`Chrome not found at ${CHROME}. Set CHROME to its path.`);

// Relative links between the docs don't work inside a PDF, so show them as plain text.
const docs = SOURCES.map((f) => readFileSync(join(ROOT, f), 'utf8'));
const payload = JSON.stringify(docs).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>AI Sales and Growth Team</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=Space+Grotesk:wght@600;700&display=swap">
<style>
  @page { size: A4; margin: 16mm 15mm; }
  body { font-family: 'IBM Plex Sans', Arial, sans-serif; color: #14213D; font-size: 10pt; line-height: 1.5; }
  h1, h2, h3 { font-family: 'Space Grotesk', Arial, sans-serif; color: #14213D; break-after: avoid; }
  h1 { font-size: 21pt; border-bottom: 3px solid #A84B14; padding-bottom: 6px; margin-top: 0; }
  h2 { font-size: 14pt; margin-top: 22px; }
  h3 { font-size: 11.5pt; }
  table { border-collapse: collapse; width: 100%; font-size: 8.8pt; margin: 8px 0 12px; }
  th, td { border: 1px solid #C9D1DC; padding: 4px 7px; text-align: left; vertical-align: top; }
  th { background: #14213D; color: #F7F5F0; }
  tr { break-inside: avoid; }
  tr:nth-child(even) td { background: #F4F6F9; }
  code { font-family: Menlo, Consolas, monospace; font-size: 8.3pt; background: #EEF1F5; padding: 1px 4px; border-radius: 3px; }
  pre { background: #EEF1F5; padding: 10px; border-radius: 6px; white-space: pre-wrap; font-size: 8.3pt; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  pre.mermaid { background: none; text-align: center; padding: 6px 0; }
  pre.mermaid svg { max-width: 100%; max-height: 220mm; height: auto; }
  ul.contains-task-list { list-style: none; padding-left: 4px; }
  a { color: #1F5FA0; text-decoration: none; }
  .doc + .doc { break-before: page; }
</style>
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
</head><body>
<script>
  const DOCS = ${payload};
  for (const md of DOCS) {
    const div = document.createElement('div');
    div.className = 'doc';
    div.innerHTML = marked.parse(md);
    document.body.appendChild(div);
  }
  for (const a of document.querySelectorAll('a[href]')) {
    if (!/^https?:/.test(a.getAttribute('href'))) a.removeAttribute('href');
  }
  for (const code of document.querySelectorAll('pre > code.language-mermaid')) {
    const pre = code.parentElement;
    pre.className = 'mermaid';
    pre.textContent = code.textContent;
  }
  mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
  mermaid.run({ querySelector: 'pre.mermaid' })
    .then(() => { document.body.dataset.rendered = 'ok'; })
    .catch((err) => { document.body.dataset.rendered = 'error: ' + err.message; });
</script>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'docs-pdf-'));
const page = join(dir, 'docs.html');
writeFileSync(page, html);

// A throwaway profile keeps the build away from the user's own Chrome profile.
const common = ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${join(dir, 'profile')}`, '--virtual-time-budget=30000'];
try {
  // Render once to check every diagram drew, then print.
  const dom = execFileSync(CHROME, [...common, '--dump-dom', pathToFileURL(page).href], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const status = /data-rendered="([^"]*)"/.exec(dom)?.[1] ?? 'not finished';
  const diagrams = (dom.match(/<pre class="mermaid"/g) || []).length;
  const drawn = (dom.match(/<pre class="mermaid"[^>]*data-processed="true"/g) || []).length;
  if (status !== 'ok' || /Syntax error in text/.test(dom)) fail(`Diagrams failed to render (${status}). Check the Mermaid blocks.`);
  execFileSync(CHROME, [...common, '--no-pdf-header-footer', `--print-to-pdf=${OUT}`, pathToFileURL(page).href], { stdio: 'ignore' });
  console.log(`Wrote docs/AI-Sales-Growth-Team.pdf (${drawn}/${diagrams} diagrams rendered).`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
