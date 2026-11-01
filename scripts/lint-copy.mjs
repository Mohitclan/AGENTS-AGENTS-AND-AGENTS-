#!/usr/bin/env node
// Automatic checks on a draft, run before the evaluator reads it: a machine can catch these for free.
// Word lists live in evaluation/voice-rules.json. Every run is logged in ops/gate-log.jsonl.
//
//   node scripts/lint-copy.mjs <file> [--type general|email|social|seo] [--keyword "<phrase>"] [--no-log]
//   node scripts/lint-copy.mjs mine [--min 3]     failures that keep repeating, as candidate lessons
//
// Types: general (reports, proposals, plans), email (outreach sequences), social, seo (web pages, posts).
// Exit 1 if anything fails. Warnings are for the author and the evaluator to judge.
// Method adapted from kai-cmo-harness scripts/quality_gates (MIT); see docs/CREDITS.md.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { ROOT, fail, printTable } from './_shared.mjs';

const RULES = JSON.parse(readFileSync(join(ROOT, 'evaluation', 'voice-rules.json'), 'utf8'));
const LOG = join(ROOT, 'ops', 'gate-log.jsonl');
const TYPES = ['general', 'email', 'social', 'seo'];
const OPT_OUT = /\b(opt.?out|unsubscribe|reply ['"“]?(no|stop|remove)|won['’]t write again|not relevant|no more emails)\b/i;
const SUBJECT_MAX_WORDS = 6;
const EMAIL_MAX_WORDS = 120;
const toRel = (p) => relative(ROOT, p).split(sep).join('/');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (w) => new RegExp(`(?<![\\w-])${escapeRe(w).replace(/['’]/g, "['’]")}(?![\\w-])`, 'i');
const countWords = (s) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

const VOICE_PATTERNS = [
  [/\bhere's the thing\b/i, '"Here\'s the thing"'],
  [/\bi'll be honest\b/i, '"I\'ll be honest"'],
  [/\blet that sink in\b/i, '"Let that sink in"'],
  [/\bhot take\b/i, '"Hot take"'],
  [/\bisn't [^.\n]{1,40}\s[—–-]\s?it's\b/i, 'the "isn\'t X, it\'s Y" formula'],
  [/\baren't [^.\n]{1,40}\s[—–-]\s?they're\b/i, 'the "aren\'t X, they\'re Y" formula'],
  [/\b(it's|that's) (a|an|the) [^.,\n]{1,40}, not (a|an|the)\b/i, 'the "it\'s an X, not a Y" formula'],
];
const MUTATIONS = [
  /\b(send|sending) (the |this |these )?(email|emails|sequence|sequences|dm|dms|message|messages)\b/i,
  /\b(upload|import|push)(ing)? (the |these )?(leads|contacts) (to|into)\b/i,
  /\b(launch|launching|activate|activating) (the |this )?campaign\b/i,
  /\b(publish|publishing) (the |this )?(post|article|page|press release)\b/i,
  /\b(update|updating|delete|deleting) (the )?(crm|hubspot)\b/i,
  /\b(change|changing|raise|raising) (the )?(ad )?budget\b/i,
];
const APPROVAL_CONTEXT = /approval|approved|approve|dry.?run|preview only|do not execute|not yet sent|hold for review|ops\/approvals|a person sends|human sends|you send|draft/i;
const HEDGES = /\b(educated guess|best guess|(i|we) guessed|probably ranks?|likely ranks?|appears to rank)\b/i;
const METRICS = /\b(customers?|users?|clients?|teams?|companies|revenue|arr|mrr|growth|conversions?|conversion rate|traffic|clicks?|ctr|open rates?|reply rates?|response rates?|retention|churn|signups?|sign-ups?|reviews?|ratings?|stars|rankings?|backlinks?|leads|faster|cheaper|saves?|lift|increase[ds]?|reduced?|roi)\b/i;
const NUMBERS = /(\b\d[\d,]*(\.\d+)?\s?(%|x\b|×|times\b|percent\b|k\b|lakhs?\b|crores?\b|hours?\b|days?\b|weeks?\b|minutes?\b)|\btop \d+\b|#\d+\b|\b\d{2,}[\d,]*\+?\s(customers?|users?|clients?|teams?|companies|reviews?|stars|leads|signups?)\b)/i;
const AI_OVERCLAIMS = [
  /\b(guarantee[sd]?|promise[sd]?)\b.{0,40}\b(chatgpt|claude|perplexity|gemini|ai overviews?)\b/i,
  /\brank(s|ing)? (#?\d+ )?(in|on) (chatgpt|claude|perplexity|grok|gemini)\b/i,
  /\bllms\.txt\b.{0,40}\branking factor\b/i,
];

class Report {
  constructor() {
    this.failures = [];
    this.warnings = [];
  }
  fail(code, line, message) {
    this.failures.push({ code, line, message });
  }
  warn(code, line, message) {
    this.warnings.push({ code, line, message });
  }
}

// Lines to check, with fenced code and HTML comments blanked so numbering stays right.
function proseLines(text) {
  let fenced = false;
  return text.split(/\r?\n/).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return '';
    }
    return fenced ? '' : line.replace(/<!--.*?-->/g, '');
  });
}

// Frontmatter isn't copy.
function bodyStart(lines) {
  if (lines[0]?.trim() !== '---') return 0;
  const end = lines.slice(1).findIndex((l) => l.trim() === '---');
  return end < 0 ? 0 : end + 2;
}

function checkWords(lines, start, report) {
  let words = 0;
  let weak = 0;
  lines.forEach((line, i) => {
    if (i < start) return;
    words += countWords(line);
    for (const w of RULES.hard) if (wordRe(w).test(line)) report.fail('banned-word', i + 1, `"${w}"`);
    for (const [w, better] of Object.entries(RULES.flag)) if (wordRe(w).test(line)) report.warn('flagged-word', i + 1, `"${w}": ${better}`);
    for (const w of RULES.weak) weak += (line.match(new RegExp(wordRe(w).source, 'gi')) || []).length;
    for (const [re, name] of VOICE_PATTERNS) if (re.test(line)) report.warn('voice', i + 1, name);
  });
  if (words && (weak / words) * 100 > RULES.weakLimitPer100Words) {
    report.warn('weak-words', 0, `${weak} weak words in ${words} words; keep to ${RULES.weakLimitPer100Words} per 100`);
  }
  return words;
}

function checkMarkers(lines, start, report) {
  lines.forEach((line, i) => {
    if (i < start) return;
    if (/\[NEEDS INPUT\b/i.test(line)) report.fail('needs-input', i + 1, 'unanswered [NEEDS INPUT] marker');
    if (/\b(TBD|TODO|lorem ipsum)\b|\binsert your\b|\[(your|company|name|placeholder)[^\]]*\]/i.test(line)) report.fail('placeholder', i + 1, 'unfilled placeholder');
    for (const m of line.match(/\{\{[A-Z_]+\}\}/g) || []) report.warn('company-placeholder', i + 1, `${m} must be filled in before this goes out`);
    if (/\[(NEEDS APPROVAL|UNCONFIRMED|VERIFY)\]/.test(line)) report.warn('open-marker', i + 1, line.match(/\[(NEEDS APPROVAL|UNCONFIRMED|VERIFY)\]/)[0]);
  });
}

function checkClaims(lines, start, report, severity) {
  const near = (i) => lines.slice(Math.max(0, i - 2), i + 3).join(' ').toLowerCase();
  lines.forEach((line, i) => {
    if (i < start || !line.trim() || /^\s*#/.test(line)) return;
    if (HEDGES.test(line) && !/\b(do not|don't|never|not acceptable)\b/i.test(line)) report.fail('hedged-claim', i + 1, 'a guess stated as a finding');
    if (METRICS.test(line) && NUMBERS.test(line) && !RULES.sourceMarkers.some((m) => near(i).includes(m))) {
      report[severity]('unsourced-number', i + 1, `a number with no source within two lines: "${line.trim().slice(0, 70)}"`);
    }
  });
}

function checkMutations(lines, start, report) {
  lines.forEach((line, i) => {
    if (i < start || !MUTATIONS.some((re) => re.test(line))) return;
    const context = lines.slice(Math.max(0, i - 3), i + 4).join(' ');
    if (!APPROVAL_CONTEXT.test(context)) report.fail('external-action', i + 1, `an external action with no approval wording nearby: "${line.trim().slice(0, 70)}"`);
  });
}

// One entry per email: a heading such as "## Email 2", ending at the next heading of the same or a
// higher level, so a "## LinkedIn" section isn't counted as part of the last email.
function splitEmails(lines, start) {
  const heads = [];
  lines.forEach((l, i) => {
    if (i >= start && /^#{1,5}\s.*\bemail\s*\d/i.test(l)) heads.push(i);
  });
  if (!heads.length) return [{ n: 1, from: start, to: lines.length }];
  return heads.map((from, k) => {
    const level = lines[from].match(/^#+/)[0].length;
    const next = lines.findIndex((l, i) => i > from && new RegExp(`^#{1,${level}}\\s`).test(l));
    return { n: k + 1, from, to: next < 0 ? lines.length : next };
  });
}

function checkEmails(lines, start, report) {
  for (const email of splitEmails(lines, start)) {
    const part = lines.slice(email.from, email.to);
    const subjectAt = part.findIndex((l) => /^\W*subject\W*:/i.test(l));
    const subject = subjectAt >= 0 ? part[subjectAt].replace(/^\W*subject\W*:\W*/i, '').trim() : '';
    const at = (k) => email.from + k + 1;
    if (subjectAt < 0) report.fail('email-subject', email.from + 1, `email ${email.n} has no Subject line`);
    else {
      if (countWords(subject) > SUBJECT_MAX_WORDS) report.fail('email-subject', at(subjectAt), `subject is over ${SUBJECT_MAX_WORDS} words: "${subject}"`);
      if (/^(re|fwd?)\s*:/i.test(subject) && email.n === 1) report.fail('email-subject', at(subjectAt), 'a first email can\'t pretend to be a reply or forward');
    }
    const body = part.filter((l, k) => k !== subjectAt && !/^#/.test(l) && l.trim());
    const text = body.join(' ').replace(/[*_`]/g, '');
    const noGreeting = text.replace(/^(hi|hello|hey|dear)\b[^,.!\n]{0,30}[,.!]\s*/i, '');
    const opener = noGreeting.toLowerCase();
    const bad = RULES.bannedOpeners.find((o) => opener.startsWith(o));
    if (bad) report.fail('email-opener', email.from + 1, `email ${email.n} opens with "${bad}"`);
    else if (/^i\b/i.test(noGreeting)) report.warn('email-opener', email.from + 1, `email ${email.n}'s first sentence starts with "I"; open on their problem`);
    if (countWords(text) > EMAIL_MAX_WORDS) report.fail('email-length', email.from + 1, `email ${email.n} has ${countWords(text)} words; the limit is ${EMAIL_MAX_WORDS}`);
    if (!OPT_OUT.test(text)) report.fail('email-optout', email.from + 1, `email ${email.n} has no opt-out line`);
    if ((text.match(/\?/g) || []).length > 1) report.warn('email-cta', email.from + 1, `email ${email.n} asks more than one question; keep to one call to action`);
    if (/\bbook (a|your) (call|demo|meeting)\b|\bcalendly\b/i.test(text)) report.warn('email-cta', email.from + 1, `email ${email.n} asks for a booking; check the product's fact sheet allows it`);
  }
}

function checkSocial(lines, start, report) {
  const text = lines.slice(start).join('\n').trim();
  if (/https?:\/\//.test(text.slice(0, 600))) report.warn('social-link', 0, 'a link in the post body cuts reach; put it in the first comment');
  const firstLine = text.split('\n')[0] || '';
  if (firstLine.length > 200) report.warn('social-hook', 1, 'the hook should land in the first 200 characters');
}

function checkSeo(lines, start, report, keyword) {
  const body = lines.slice(start);
  const h1 = body.find((l) => /^#\s/.test(l));
  const h2s = body.filter((l) => /^##\s/.test(l));
  const has = (s) => s.toLowerCase().includes(keyword.toLowerCase());
  const text = body.join('\n');
  const words = countWords(text);
  if (!h1) report.fail('seo-h1', 0, 'no H1');
  else if (keyword && !has(h1)) report.fail('seo-keyword', 0, `the H1 doesn't contain "${keyword}"`);
  if (h2s.length < 2) report.warn('seo-structure', 0, 'fewer than two H2s');
  if (keyword && !h2s.some(has)) report.warn('seo-keyword', 0, `no H2 contains "${keyword}"`);
  const first = body.find((l) => l.trim() && !/^#/.test(l)) || '';
  if (keyword && !has(first)) report.warn('seo-keyword', 0, 'the keyword is not in the first paragraph');
  if (countWords(first) > 120) report.warn('seo-structure', 0, 'the first paragraph is over 120 words');
  if (words < 300) report.warn('seo-length', 0, `only ${words} words`);
  const links = (text.match(/\]\(\/[^)]*\)/g) || []).length;
  if (links < 2) report.warn('seo-links', 0, 'fewer than two internal links');
  body.forEach((line, i) => {
    if (AI_OVERCLAIMS.some((re) => re.test(line)) && !/\b(no|not|never|avoid|can't)\b/i.test(line)) report.fail('ai-overclaim', i + start + 1, 'an AI-search result stated as a promise');
    if (countWords(line) > 80 && !/^\|/.test(line)) report.warn('seo-structure', i + start + 1, 'a paragraph over 80 words');
  });
}

function lint(file, type, keyword) {
  const lines = proseLines(readFileSync(file, 'utf8'));
  const start = bodyStart(lines);
  const report = new Report();
  checkWords(lines, start, report);
  checkMarkers(lines, start, report);
  checkClaims(lines, start, report, type === 'general' || type === 'seo' ? 'fail' : 'warn');
  if (type === 'general') checkMutations(lines, start, report);
  if (type === 'email') checkEmails(lines, start, report);
  if (type === 'social') checkSocial(lines, start, report);
  if (type === 'seo') checkSeo(lines, start, report, keyword || '');
  return report;
}

function logRun(file, type, report) {
  appendFileSync(
    LOG,
    `${JSON.stringify({
      at: new Date().toISOString().slice(0, 16),
      file: toRel(file),
      type,
      passed: !report.failures.length,
      failures: report.failures.map((f) => ({ code: f.code, detail: f.code === 'banned-word' ? f.message : undefined })),
      warnings: report.warnings.length,
    })}\n`,
  );
}

function mine(min) {
  if (!existsSync(LOG)) {
    console.log('No gate runs logged yet.');
    return;
  }
  const seen = new Map();
  for (const line of readFileSync(LOG, 'utf8').split('\n').filter(Boolean)) {
    const run = JSON.parse(line);
    for (const f of run.failures) {
      const key = f.detail ? `${f.code} ${f.detail}` : f.code;
      if (!seen.has(key)) seen.set(key, { failure: key, times: 0, files: new Set() });
      const row = seen.get(key);
      row.times++;
      row.files.add(run.file);
    }
  }
  const rows = [...seen.values()].filter((r) => r.times >= min).sort((a, b) => b.times - a.times);
  if (!rows.length) {
    console.log(`Nothing has failed ${min} or more times. A quiet result is a good result.`);
    return;
  }
  printTable(rows.map((r) => ({ failure: r.failure, times: r.times, files: r.files.size })), ['failure', 'times', 'files']);
  console.log('\nThese are candidates for a lesson in the owning agent\'s memory, then a skill rule. A lesson that keeps failing should become a check here.');
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (args[0] === 'mine') mine(Number(flag('min')) || 3);
else {
  const fileArg = args[0];
  if (!fileArg || fileArg.startsWith('--')) fail('Usage: node scripts/lint-copy.mjs <file> [--type general|email|social|seo] [--keyword "<phrase>"] [--no-log] | mine [--min 3]');
  const file = resolve(process.cwd(), fileArg);
  if (!existsSync(file)) fail(`No such file: ${fileArg}`);
  const type = flag('type') || 'general';
  if (!TYPES.includes(type)) fail(`--type must be one of: ${TYPES.join(', ')}`);
  const report = lint(file, type, flag('keyword'));
  if (!args.includes('--no-log')) logRun(file, type, report);
  for (const f of report.failures) console.log(`FAIL  ${f.line ? `line ${f.line}: ` : ''}${f.code}: ${f.message}`);
  for (const w of report.warnings) console.log(`warn  ${w.line ? `line ${w.line}: ` : ''}${w.code}: ${w.message}`);
  console.log(`${toRel(file)} (${type}): ${report.failures.length} failed, ${report.warnings.length} warning(s).`);
  process.exit(report.failures.length ? 1 : 0);
}
