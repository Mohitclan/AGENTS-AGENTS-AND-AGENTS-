#!/usr/bin/env node
// Automatic checks on a draft, run before the evaluator reads it: a machine can catch these for free.
// Word lists live in evaluation/voice-rules.json. Every run is logged in ops/gate-log.jsonl.
//
//   node scripts/lint-copy.mjs <file> [--type general|email|social|seo] [--keyword "<phrase>"] [--no-log]
//   node scripts/lint-copy.mjs mine [--min 3]     failures that keep repeating, as candidate lessons
//
// Types: general (reports, proposals, plans), email (outreach sequences), social, seo (web pages, posts).
// Exit 1 if anything fails. Warnings are for the author and the evaluator to judge.
// Style signals (superlatives, unsourced quotes, vocabulary, rhythm, em dashes, tracking parameters,
// email sequences) only ever warn; none of them is proof of anything about who wrote the text.
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

// ---- Style signals (warnings only) ---------------------------------------------------------------
// Added in T-20261103-04 (A1, A3, A18, B6, B16). None of these can fail a check: a signal means "look
// at this wording", not "this is wrong". Method ideas adapted from public MIT and Apache-2.0 projects;
// the wording, lists and thresholds are ours. See docs/CREDITS.md.
const LEADING_CLAIM = /\b(?:(?:the|a|an|our|its|their)\s+leading\b|leading\s+(?:provider|platform|tool|solution|brand|company|vendor|player|choice|source|name)s?\b|(?:industry|market|category)[- ]leading\b)/i;
const RANK_ONE = /(?<![\w&])#1(?!\w)/;
const QUOTED = /"([^"\n]*)"|“([^”\n]*)”/g;
const QUOTE_MIN_WORDS = 6;
// Quoted speech: someone is said to have said it. A quoted page excerpt or a line of our own copy is not.
const SPEECH_CUE = /\b(said|says|told|wrote|writes|tweeted|posted|replied|according to|testimonial|quotes?d?|described|put it)\b|["”]\s*[—–-]\s*[A-Z]/i;
// "the only" is a claim when it names a product or a way; "the only person named" is not.
const ONLY_CLAIM = /\bthe only (?:[\w-]+ ){0,2}?(?:tool|platform|product|app|solution|service|way|option|choice|company|provider|vendor|software)\b/i;
const NEGATED = /\b(do not|don't|never|avoid|must not|can't|cannot|not claim)\b/i;
const VAGUE_ATTRIBUTION = /\b(experts|researchers|analysts|studies|research|surveys|industry observers|many people|some people|most people|critics)\s+(say|says|suggest|suggests|believe|agree|show|shows|have found|has found|have shown|has shown)\b/i;
// Wording that reads as filler, a chatbot leftover or inflated importance. One warning per match.
const STYLE_PATTERNS = [
  [/\bplays? an? (crucial|pivotal|vital|key|important|significant) role\b/i, 'template phrase "plays a ... role"'],
  [/\b(serves?|stands?) as an? (testament|reminder|beacon)\b|\ba testament to\b/i, 'template phrase "a testament to"'],
  [/\bin the (realm|world|landscape) of\b/i, 'template phrase "in the realm/world of"'],
  [/\bever[- ](evolving|changing|growing)\b/i, 'template phrase "ever-evolving"'],
  [/\bit(?:'s|’s| is) worth (mentioning|highlighting|emphasi[sz]ing)\b/i, 'template phrase "it is worth mentioning"'],
  [/\bwhen it comes to\b/i, 'template phrase "when it comes to"'],
  [/\bnot only\b[^.\n]{1,80}\bbut also\b/i, 'the "not only X but also Y" formula'],
  [/\bas an ai (language )?model\b|\bas of my (last|latest) (update|training)\b|\bmy knowledge cut-?off\b/i, 'a chatbot disclaimer left in the text'],
  [/\bi hope this helps\b|\blet me know if you(?:'d|’d| would) like\b|\bgreat question\b/i, 'a chatbot sign-off left in the text'],
  [/\blet(?:'s|’s) (dive|delve|explore|unpack|break (it|this) down|get started)\b/i, 'a "Let\'s ..." opener'],
  [/\b(marks?|marked) a (pivotal|turning|significant|new) (moment|point|era|chapter)\b|\bsetting the stage for\b|\bpaves? the way\b/i, 'inflated importance'],
  [/\bthe future (looks|is) (bright|promising)\b|\bonly time will tell\b|\bexciting (times|things) (lie )?ahead\b/i, 'a future-narrative closer'],
  [/^\W*(in summary|to sum up|to summari[sz]e|in short|all in all|overall),/i, 'a generic conclusion opener'],
  [/\b(may|might|could|can) (potentially|possibly|perhaps)\b|\bit could be argued\b/i, 'stacked hedges'],
];
// B16: shapes that read as pattern rather than as a person. Customer-facing types only: in a report a
// list of three "no" items is an honest scope statement (7 hits in 4 of 28 files in the first pass).
const SHAPE_PATTERNS = [
  [/\b(no|not|never|without)\b[^,.;:\n]{1,30},\s+(and\s+)?(no|not|never|without)\b[^,.;:\n]{1,30},\s+(and\s+|or\s+)?(no|not|never|without)\b/i, 'a list of three negations'],
  [/,\s+(and\s+)?(making|ensuring|allowing|enabling|helping|providing|giving|creating|driving|delivering|reducing|improving|streamlining)\b[^.;\n]*,\s+(and\s+)?(making|ensuring|allowing|enabling|helping|providing|giving|creating|driving|delivering|reducing|improving|streamlining)\b/i, 'two trailing "-ing" clauses piled onto one sentence'],
];
const AI_TRACKING_VALUE = /^(chatgpt(\.com)?|openai(\.com)?|perplexity(\.ai)?|claude(\.ai)?|gemini(\.google\.com)?|copilot(\.microsoft\.com)?|grok(\.com)?|deepseek(\.com)?|poe(\.com)?|bard)$/i;
const URL_RE = /https?:\/\/[^\s<>)\]"'`]+/g;

const hasSourceNear = (lines, i) => {
  const near = lines.slice(Math.max(0, i - 2), i + 3).join(' ').toLowerCase();
  return RULES.sourceMarkers.some((m) => near.includes(m));
};

// Units for the cluster and rhythm checks: a paragraph, a list item or a table row each stand alone.
function units(lines, start) {
  const out = [];
  let cur = null;
  lines.forEach((line, i) => {
    if (i < start) return;
    const t = line.trim();
    if (!t || /^#{1,6}\s/.test(t) || /^[-=]{3,}$/.test(t)) {
      cur = null;
      return;
    }
    if (/^\|/.test(t) || /^([-*+]|\d+[.)])\s/.test(t)) {
      out.push({ line: i + 1, text: t, prose: false });
      cur = null;
      return;
    }
    if (cur) cur.text += ` ${t}`;
    else {
      cur = { line: i + 1, text: t, prose: true };
      out.push(cur);
    }
  });
  return out;
}

const plain = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(URL_RE, ' ').replace(/[*_`]/g, '');
const sentencesOf = (s) => plain(s).split(/(?<=[.!?])\s+(?=["“'(\[]?[A-Z])/).map((x) => x.trim()).filter((x) => countWords(x) > 0);

// A1: claims of being the only, the fastest, the leader or better than someone, and quotes with no source.
function checkSuperlatives(lines, start, report) {
  lines.forEach((line, i) => {
    if (i < start || !line.trim() || /^\s*#/.test(line)) return;
    const sourced = hasSourceNear(lines, i);
    const hits = RULES.superlatives.filter((w) => wordRe(w).test(line));
    if (ONLY_CLAIM.test(line)) hits.push('the only');
    if (LEADING_CLAIM.test(line)) hits.push('leading');
    if (RANK_ONE.test(line)) hits.push('#1');
    if (hits.length && !sourced && !NEGATED.test(line)) report.warn('superlative', i + 1, `${hits.map((h) => `"${h}"`).join(', ')}: a claim that needs a source within two lines, or plainer wording`);
    if (VAGUE_ATTRIBUTION.test(line) && !sourced) report.warn('vague-attribution', i + 1, `"${line.match(VAGUE_ATTRIBUTION)[0]}": name who, and cite it`);
    if (!sourced && !OPT_OUT.test(line) && SPEECH_CUE.test(line)) {
      for (const m of line.matchAll(QUOTED)) {
        const q = m[1] ?? m[2];
        if (countWords(q) >= QUOTE_MIN_WORDS && !/\{\{/.test(q)) {
          report.warn('unsourced-quote', i + 1, `a quotation with no source within two lines: "${q.slice(0, 50)}"`);
          break;
        }
      }
    }
  });
}

// A3: tiered vocabulary, clusters, density and rhythm. Our own lists, in evaluation/voice-rules.json.
function checkVocabulary(lines, start, words, report, type) {
  lines.forEach((line, i) => {
    if (i < start) return;
    const found = Object.entries(RULES.tier1).filter(([w]) => wordRe(w).test(line));
    if (found.length) report.warn('vocab-tier1', i + 1, found.map(([w, better]) => `"${w}" (try: ${better})`).join('; '));
    for (const [re, name] of type === 'general' ? STYLE_PATTERNS : [...STYLE_PATTERNS, ...SHAPE_PATTERNS]) if (re.test(line)) report.warn('template-phrase', i + 1, name);
  });
  const all = units(lines, start);
  for (const u of all) {
    const hit = RULES.tier2.filter((w) => wordRe(w).test(u.text));
    if (hit.length >= RULES.tierClusterMin) report.warn('vocab-cluster', u.line, `${hit.length} mild filler words in one paragraph: ${hit.map((w) => `"${w}"`).join(', ')}`);
  }
  const text = lines.slice(start).join('\n');
  let t3 = 0;
  for (const w of RULES.tier3) t3 += (text.match(new RegExp(wordRe(w).source, 'gi')) || []).length;
  if (words >= 100 && t3 >= 3 && (t3 / words) * 100 > RULES.tier3LimitPercent) {
    report.warn('vocab-density', 0, `${t3} common padding words in ${words} words (${((t3 / words) * 100).toFixed(1)}%); keep under ${RULES.tier3LimitPercent}%`);
  }
  checkRhythm(all.filter((u) => u.prose), report);
}

// Rhythm: sentences all about the same length, or three in a row that start with the same word.
const RHYTHM_MIN_SENTENCES = 10;
const RHYTHM_SKIP = new Set(['the', 'a', 'an', 'it']); // repeated openers that read fine: all 4 first-pass hits were these
const RHYTHM_MIN_SPREAD = 0.4;
function checkRhythm(prose, report) {
  const lengths = [];
  for (const u of prose) {
    const s = sentencesOf(u.text);
    s.forEach((x) => lengths.push(countWords(x)));
    for (let k = 0; k + 2 < s.length; k++) {
      const first = s.slice(k, k + 3).map((x) => (x.match(/[\p{L}']+/u) || [''])[0].toLowerCase());
      if (first[0] && !RHYTHM_SKIP.has(first[0]) && first[0] === first[1] && first[1] === first[2]) {
        report.warn('rhythm', u.line, `three sentences in a row start with "${first[0]}"`);
        break;
      }
    }
  }
  if (lengths.length >= RHYTHM_MIN_SENTENCES) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const sd = Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length);
    if (mean >= 8 && sd / mean < RHYTHM_MIN_SPREAD) report.warn('rhythm', 0, `${lengths.length} sentences all close to ${Math.round(mean)} words (spread ${(sd / mean).toFixed(2)}, under ${RHYTHM_MIN_SPREAD}); vary the length`);
  }
}

// Em dashes are never banned. Warn above about one per 1,000 words; a single one is always fine.
function checkEmDashes(lines, start, words, report) {
  let count = 0;
  let first = 0;
  lines.forEach((line, i) => {
    if (i < start) return;
    const n = (line.replace(/\|\s*—\s*(?=\|)/g, '|').match(/—/g) || []).length;
    if (n && !first) first = i + 1;
    count += n;
  });
  const allowed = Math.max(1, (words / 1000) * RULES.emDashPer1000Words);
  if (count > allowed) report.warn('em-dash', first, `${count} em dashes in ${words} words, above about ${RULES.emDashPer1000Words} per 1,000. A style signal, not a ban: a person decides`);
}

// A18, all types: a tracking parameter naming an AI assistant means the link was copied from an
// assistant's answer, not opened. It lives here, not in check-links.mjs, which strips trailing
// punctuation before testing a link. (Punctuation stuck to a URL is an email check: see checkSequence.)
function checkUrls(lines, start, report) {
  lines.forEach((line, i) => {
    if (i < start) return;
    for (const m of line.matchAll(URL_RE)) {
      const raw = m[0];
      const url = raw.replace(/[.,;:!?*_]+$/, '');
      let params = [];
      try {
        params = [...new URL(url).searchParams];
      } catch {
        continue;
      }
      const bad = params.filter(([, v]) => AI_TRACKING_VALUE.test(v));
      if (bad.length) report.warn('ai-url-param', i + 1, `${bad.map(([k, v]) => `${k}=${v}`).join(', ')} in ${url.slice(0, 60)}: copied from an assistant's answer? Open the page and cite the clean URL`);
    }
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

// B6, sequence level: what checkEmails can't see because it reads each email alone. Warnings only.
const MEETING_ASK = /\b(book|schedule|set up|grab|hop on|jump on|get on)\b[^.?!\n]{0,25}\b(call|demo|meeting|chat)\b|\bcalendly\b|\b(quick|short|15[- ]minute|20[- ]minute|30[- ]minute|\d+[- ]min(ute)?)\s+(call|chat|demo)\b|\bcan we (talk|chat|speak|jump)\b/i;
const EXISTING_BOOKING_ASK = /\bbook (a|your) (call|demo|meeting)\b|\bcalendly\b/i;

// The one ask an email ends on: the last question, else the last sentence with a link in it.
function ctaOf(part, subjectAt) {
  const body = part.filter((l, k) => k !== subjectAt && !/^#/.test(l) && l.trim() && !/^\W*(best|thanks|regards|cheers)\b/i.test(l) && !/^\{\{/.test(l.trim()));
  const sentences = plain(body.join(' ')).split(/(?<=[.!?])\s+/).filter((s) => s.trim() && !OPT_OUT.test(s));
  const q = [...sentences].reverse().find((s) => s.includes('?'));
  const sentence = q || [...sentences].reverse().find((s) => /https?:\/\//.test(s)) || '';
  const raw = body.join(' ');
  if (!sentence) return 'none';
  if (MEETING_ASK.test(sentence) || /\b(call|chat|meeting|calendar|zoom)\b/i.test(sentence)) return 'meeting';
  if (/\b(send|share|forward|want me to|should i|shall i)\b/i.test(sentence)) return 'send';
  if (/\b(try|sign up|trial|start|see (it|the|a))\b/i.test(sentence) || (!q && /https?:\/\//.test(raw))) return 'link';
  return q ? 'question' : 'none';
}

function checkSequence(lines, start, report) {
  const emails = splitEmails(lines, start);
  const subjects = new Map();
  let previous = null;
  for (const email of emails) {
    const part = lines.slice(email.from, email.to);
    const subjectAt = part.findIndex((l) => /^\W*subject\W*:/i.test(l));
    const subject = subjectAt >= 0 ? part[subjectAt].replace(/^\W*subject\W*:\W*/i, '').replace(/^(re|fwd?)\s*:\s*/i, '').trim().toLowerCase() : '';
    if (subject) {
      if (subjects.has(subject)) report.warn('email-sequence', email.from + 1, `email ${email.n} repeats the subject of email ${subjects.get(subject)}; make each subject distinct`);
      else subjects.set(subject, email.n);
    }
    const text = part.filter((l, k) => k !== subjectAt && !/^#/.test(l)).join(' ');
    if (email.n === 1 && MEETING_ASK.test(text) && !EXISTING_BOOKING_ASK.test(text)) report.warn('email-sequence', email.from + 1, 'email 1 asks for a call or meeting; the first step should be a question or a sample, not a meeting');
    const stuck = [...text.matchAll(URL_RE)].map((m) => m[0]).find((u) => /[.,;:!?*_]$/.test(u));
    if (stuck) report.warn('url-punctuation', email.from + 1, `email ${email.n}: "${stuck.slice(-1)}" is stuck to the end of a link (${stuck.slice(0, 50)}) and can break it; leave a space or a line break after the URL`);
    const cta = ctaOf(part, subjectAt);
    if (cta !== 'none' && cta === previous?.cta) report.warn('email-sequence', email.from + 1, `email ${email.n} ends on the same kind of ask as email ${previous.n} (${cta}); change the ask from one email to the next`);
    previous = { n: email.n, cta };
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
  const words = checkWords(lines, start, report);
  checkMarkers(lines, start, report);
  checkClaims(lines, start, report, type === 'general' || type === 'seo' ? 'fail' : 'warn');
  checkSuperlatives(lines, start, report);
  checkVocabulary(lines, start, words, report, type);
  checkEmDashes(lines, start, words, report);
  checkUrls(lines, start, report);
  if (type === 'general') checkMutations(lines, start, report);
  if (type === 'email') {
    checkEmails(lines, start, report);
    checkSequence(lines, start, report);
  }
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
