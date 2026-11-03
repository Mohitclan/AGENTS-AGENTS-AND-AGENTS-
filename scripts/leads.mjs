#!/usr/bin/env node
// Lead pipeline. pipeline/leads.jsonl is the system of record and only this script writes it.
// Format and scoring: pipeline/lead-schema.md
//
//   node scripts/leads.mjs import <batch.jsonl>                 validate a batch; add new leads, merge duplicates
//   node scripts/leads.mjs check                                validate the whole pipeline
//   node scripts/leads.mjs list [--product p] [--status s] [--tier A]
//   node scripts/leads.mjs show <id>
//   node scripts/leads.mjs set-status <id[,id...]> <status> [note] [--force]
//   node scripts/leads.mjs export-csv                           rewrite pipeline/leads.csv
//   node scripts/leads.mjs suppress <domain|email|profile URL> "<reason>"   never contact them again, across every product
//   node scripts/leads.mjs gate [--product p] [--status s]      Go, Conditional or Stop for each lead before outreach
//   node scripts/leads.mjs hold <id> "<reason>" --owner <who>   stop all outreach to a lead until a person releases it
//   node scripts/leads.mjs release <id> "<note>"                lift a hold
//   node scripts/leads.mjs supersede <id> <n> "<why>"           mark evidence item n as wrong or out of date
//   node scripts/leads.mjs next <id> "<action>"                 update a lead's next action
import { createHash } from 'node:crypto';
import {
  appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync, writeSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { PERSONAL_MAIL, ROOT, classifySuppression, daysSince, describeSuppression, fail, printTable, suppressionMatch, suppressionProblem, today } from './_shared.mjs';

const PIPELINE = join(ROOT, 'pipeline');
const DB = join(PIPELINE, 'leads.jsonl');
const CSV = join(PIPELINE, 'leads.csv');
const LOCK = join(PIPELINE, 'leads.lock');
const SUPPRESSION = join(PIPELINE, 'suppression.jsonl');
const PRODUCTS = join(ROOT, 'knowledge', 'products');

const STATUSES = ['new', 'qualified', 'disqualified', 'drafted', 'approved', 'contacted', 'replied', 'meeting', 'trial', 'won', 'lost'];
const NOTE_REQUIRED = new Set(['disqualified', 'approved', 'contacted', 'won', 'lost']);
// Which statuses may follow each one (pipeline/lead-schema.md). --force skips this to correct a mistake.
const NEXT = {
  new: ['qualified', 'disqualified'],
  qualified: ['drafted', 'disqualified'],
  disqualified: ['new'],
  drafted: ['approved', 'qualified', 'disqualified'],
  approved: ['contacted', 'drafted'],
  contacted: ['replied', 'lost'],
  replied: ['meeting', 'trial', 'won', 'lost'],
  meeting: ['trial', 'won', 'lost'],
  trial: ['won', 'lost'],
  won: [],
  lost: ['qualified'],
};
const LOCK_WAIT_MS = 15_000;
const LOCK_STALE_MS = 120_000;
const CHANNELS = ['email', 'linkedin', 'form', 'phone', 'other'];
const SIGNALS = ['published', 'observed_gap', 'inferred']; // how we know: pipeline/lead-schema.md
const FRESH_DAYS = 90;
const SIGNAL_DAYS = 60; // a signal older than this can't be the reason to write
const GATE_CHANNELS = new Set(['email', 'linkedin']); // knowledge/company.md, outreach policy
const OUTREACH_STATUSES = new Set(['drafted', 'approved', 'contacted']);
// Contact quality: a named person beats a shared inbox, and a support desk isn't a sales route.
const SUPPORT_INBOX = /^(support|help|helpdesk|care|customercare|customerservice|service|billing|abuse|security|legal|privacy|no-?reply|donotreply)@/i;
const GENERAL_INBOX = /^(hello|hi|hey|info|contact|team|founders?|sales|marketing|admin|office|mail|enquir(y|ies)|inquir(y|ies))@/i;
const REACHABILITY_CAP = { general: 5, support: 3 };
const SCORE_PARTS = { icp_fit: 40, need_evidence: 30, timing: 20, reachability: 10 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isUrl = (s) => {
  try {
    return ['http:', 'https:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
};
const domainOf = (url) => new URL(url).hostname.toLowerCase().replace(/^www\./, '');
const idFor = (domain, product) => `L-${createHash('sha1').update(`${domain}|${product}`).digest('hex').slice(0, 8)}`;
const tierOf = (score) => (score >= 75 ? 'A' : score >= 50 ? 'B' : 'C');
const totalOf = (b) => Object.keys(SCORE_PARTS).reduce((sum, k) => sum + (Number.isInteger(b?.[k]) ? b[k] : 0), 0);
const toRel = (p) => relative(ROOT, p).split(sep).join('/');

function productSlugs() {
  if (!existsSync(PRODUCTS)) return new Set();
  return new Set(
    readdirSync(PRODUCTS)
      .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md')
      .map((f) => f.slice(0, -3)),
  );
}

// Field checks shared by batch import and the full pipeline check.
function validate(lead, products) {
  const errors = [];
  const text = (key, min = 1) => {
    if (typeof lead[key] !== 'string' || lead[key].trim().length < min) {
      errors.push(`${key} is required${min > 1 ? ` (at least ${min} characters)` : ''}`);
    }
  };
  text('company');
  text('fit_reason', 20);
  text('score_rationale');
  text('next_action');
  if (!isUrl(lead.website)) errors.push('website must be an http(s) URL');
  if (!products.has(lead.product)) errors.push(`product "${lead.product}" has no fact sheet in knowledge/products/`);

  if (!Array.isArray(lead.evidence) || !lead.evidence.length) errors.push('evidence needs at least one { claim, url }');
  else {
    lead.evidence.forEach((ev, i) => {
      if (typeof ev?.claim !== 'string' || !ev.claim.trim()) errors.push(`evidence[${i}].claim is required`);
      if (!isUrl(ev?.url)) errors.push(`evidence[${i}].url must be an http(s) URL`);
      if (ev?.signal != null && !SIGNALS.includes(ev.signal)) errors.push(`evidence[${i}].signal must be one of: ${SIGNALS.join(', ')}`);
      if (ev?.dated != null && (!DATE.test(ev.dated) || ev.dated > today())) errors.push(`evidence[${i}].dated must be a YYYY-MM-DD date, not in the future`);
    });
  }

  const parts = lead.score_breakdown;
  if (!parts || typeof parts !== 'object') errors.push('score_breakdown is required');
  else {
    for (const [key, max] of Object.entries(SCORE_PARTS)) {
      if (!Number.isInteger(parts[key]) || parts[key] < 0 || parts[key] > max) {
        errors.push(`score_breakdown.${key} must be a whole number from 0 to ${max}`);
      }
    }
  }

  if (!DATE.test(lead.researched_at || '') || lead.researched_at > today()) {
    errors.push('researched_at must be a YYYY-MM-DD date, not in the future');
  }

  if (lead.contact != null) {
    const c = lead.contact;
    if (!CHANNELS.includes(c.channel)) errors.push(`contact.channel must be one of: ${CHANNELS.join(', ')}`);
    if (typeof c.value !== 'string' || !c.value.trim()) errors.push('contact.value is required when a contact is given');
    if (!isUrl(c.source_url)) errors.push('contact.source_url must link to where the contact was published');
    if (c.channel === 'email' && !EMAIL.test(c.value || '')) errors.push('contact.value is not a valid email address');
  }

  if (lead.competitor != null && !(typeof lead.competitor === 'string' && lead.competitor.trim())) {
    errors.push('competitor must say who the competitor is, e.g. "RepoClip, a direct competitor"');
  }

  if (lead.status != null && !STATUSES.includes(lead.status)) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  if (lead.status === 'disqualified' && !(typeof lead.disqualify_reason === 'string' && lead.disqualify_reason.trim())) {
    errors.push('disqualify_reason is required for a disqualified lead');
  }
  return errors;
}

function mergeEvidence(existing, incoming) {
  const seen = new Set(existing.map((e) => `${e.url}|${e.claim}`));
  const merged = [...existing];
  for (const e of incoming) {
    const key = `${e.url}|${e.claim.trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ claim: e.claim.trim(), url: e.url, seen: e.seen || today(), ...(e.signal ? { signal: e.signal } : {}), ...(e.dated ? { dated: e.dated } : {}) });
    }
  }
  return merged;
}

// Agents can run this script in parallel, so every change holds pipeline/leads.lock from load to
// save; otherwise the last writer wins and the other changes are lost. Released when the process exits.
function lock() {
  mkdirSync(PIPELINE, { recursive: true });
  const start = Date.now();
  for (;;) {
    try {
      const fd = openSync(LOCK, 'wx');
      writeSync(fd, `${process.pid}\n`);
      closeSync(fd);
      process.on('exit', () => {
        try {
          unlinkSync(LOCK);
        } catch {
          // already gone
        }
      });
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    let age;
    try {
      age = Date.now() - statSync(LOCK).mtimeMs;
    } catch {
      continue; // released between our two calls
    }
    if (age > LOCK_STALE_MS) {
      try {
        unlinkSync(LOCK);
      } catch {
        // another run removed it first
      }
      continue;
    }
    if (Date.now() - start > LOCK_WAIT_MS) {
      fail('Another run of leads.mjs is changing the pipeline. Try again; if none is running, delete pipeline/leads.lock.');
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
}

function load() {
  if (!existsSync(DB)) return [];
  return readFileSync(DB, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch {
        return fail(`pipeline/leads.jsonl line ${i + 1} is not valid JSON. Fix or restore the file before continuing.`);
      }
    });
}

function save(leads) {
  mkdirSync(PIPELINE, { recursive: true });
  const tmp = `${DB}.tmp`;
  writeFileSync(tmp, leads.map((l) => JSON.stringify(l)).join('\n') + (leads.length ? '\n' : ''));
  renameSync(tmp, DB);
  writeCsv(leads);
}

function writeCsv(leads) {
  const cols = ['id', 'product', 'tier', 'score', 'status', 'company', 'website', 'segment', 'industry', 'country', 'size',
    'fit_reason', 'next_action', 'contact_channel', 'contact_value', 'contact_source', 'evidence_urls', 'researched_at', 'updated_at'];
  const cell = (v) => {
    let s = String(v ?? '');
    // Excel and Sheets run a cell starting with = + - @ as a formula, and these values come from web pages.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = leads.map((l) => ({
    ...l,
    contact_channel: l.contact?.channel,
    contact_value: l.contact?.value,
    contact_source: l.contact?.source_url,
    evidence_urls: (l.evidence || []).map((e) => e.url).join(' | '),
  }));
  writeFileSync(CSV, [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n');
}

function contactQuality(contact) {
  if (!contact?.value) return 'none';
  if (contact.channel !== 'email') return 'direct';
  if (SUPPORT_INBOX.test(contact.value)) return 'support';
  return GENERAL_INBOX.test(contact.value) ? 'general' : 'direct';
}

function suppressions() {
  if (!existsSync(SUPPRESSION)) return [];
  return readFileSync(SUPPRESSION, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

// The one opt-out match, in _shared.mjs so scripts/send-email.mjs uses the same rules: an email address
// covers that person, a profile URL covers that page, a company domain covers it, its subdomains and
// addresses on it. An old entry that is a bare shared host (linkedin.com) blocks every lead on that host until a
// person replaces it; `check` fails while one exists.
function suppressedBy(lead, list) {
  return suppressionMatch(list, { contact: lead.contact?.value, website: lead.website, domain: lead.domain });
}

// Entries in pipeline/suppression.jsonl that are not an email, a profile URL or a company domain: an old bare
// shared host (linkedin.com), a hand-written site root, a personal mail domain, a bare suffix. Each one is named
// with what it does now and what to do. A shared-root entry blocks every lead on that site until a person fixes it.
function entryProblemsOf(list) {
  return list.map((s) => ({ s, why: suppressionProblem(s) })).filter((x) => x.why)
    .map(({ s, why }) => `"${s.value}" (${s.reason || 'no reason'}): ${why}. Re-enter the person with: node scripts/leads.mjs suppress <email address or profile URL> "<reason>", then a person removes this line`);
}

function warnAboutEntries(list) {
  for (const p of entryProblemsOf(list)) console.error(`WARNING: pipeline/suppression.jsonl ${p}`);
}

function suppress(value, reason) {
  if (!value?.trim() || !reason?.trim()) fail('Usage: node scripts/leads.mjs suppress <domain|email|profile URL> "<reason>"');
  const entry = classifySuppression(value);
  if (entry.error) fail(entry.error);
  value = entry.value;
  lock();
  if (suppressions().some((s) => s.value === value)) {
    console.log(`${value} is already suppressed.`);
    return;
  }
  appendFileSync(SUPPRESSION, `${JSON.stringify({ value, reason: reason.trim(), at: today() })}\n`);
  const list = suppressions();
  const leads = load();
  const hit = leads.filter((l) => suppressedBy(l, list) && !['disqualified', 'lost', 'won'].includes(l.status));
  for (const lead of hit) {
    lead.history.push({ at: today(), event: 'status', from: lead.status, status: 'disqualified', note: `suppressed: ${reason.trim()}` });
    lead.status = 'disqualified';
    lead.disqualify_reason = `suppressed: ${reason.trim()}`;
    lead.updated_at = today();
  }
  if (hit.length) save(leads);
  console.log(`Suppressed ${value}.${hit.length ? ` ${hit.length} open lead(s) disqualified.` : ''}`);
}

// Critical signals. Any one forces a Stop, whatever the lead's score or tier: a high score can't hide a
// disqualifier. Each comes from a rule we already wrote down, and returns the reason to print, or nothing.
// The list only adds Stop reasons, so it can turn a Go or Conditional into a Stop and never the reverse.
// Missing data (no contact, no evidence) is checked separately in gateOf.
const CRITICAL_SIGNALS = [
  // Opt-outs are final (CLAUDE.md hard rule 7).
  (lead, list) => {
    const hit = suppressedBy(lead, list);
    return hit && `suppressed (${describeSuppression(hit)})`;
  },
  // Disqualified or lost (pipeline/lead-schema.md, statuses).
  (lead) => ['disqualified', 'lost'].includes(lead.status) && `status is ${lead.status}`,
  // A person put the lead on hold (leads.mjs hold).
  (lead) => lead.hold && `on hold (${lead.hold.owner}): ${lead.hold.reason}`,
  // knowledge/company.md, outreach policy: never contact competitors.
  (lead) => lead.competitor && `competitor${typeof lead.competitor === 'string' && lead.competitor.trim() ? `: ${lead.competitor.trim()}` : ''}`,
  // knowledge/company.md, outreach policy: never contact personal (non-work) email addresses.
  (lead) => {
    const host = lead.contact?.channel === 'email' ? String(lead.contact.value || '').toLowerCase().split('@').pop() : '';
    return PERSONAL_MAIL.has(host) && `personal email address (${host})`;
  },
  // memory/MAIN.md, 2026-10-30: a support-only inbox never gets a Go. A support desk isn't a sales route.
  (lead) => contactQuality(lead.contact) === 'support' && 'support-only inbox',
];

// The last check before outreach is drafted or sent. Conditional means a person decides.
function gateOf(lead, list) {
  const stop = CRITICAL_SIGNALS.map((signal) => signal(lead, list)).filter(Boolean);
  const conditional = [];
  if (!lead.contact?.value) stop.push('no published contact');
  else if (!GATE_CHANNELS.has(lead.contact.channel)) conditional.push(`contact is ${lead.contact.channel}; policy allows email and LinkedIn`);
  const evidence = (lead.evidence || []).filter((e) => !e.superseded);
  if (!evidence.length) stop.push('no evidence');
  const age = daysSince(lead.researched_at);
  if (age === null || age > FRESH_DAYS) conditional.push(`researched ${age ?? '?'} days ago; recheck the evidence`);
  if (lead.tier === 'C') conditional.push('tier C');
  if (evidence.some((e) => !e.signal)) conditional.push('evidence with no signal class');
  const real = evidence.filter((e) => e.signal && e.signal !== 'inferred');
  if (evidence.length && !real.length) conditional.push('only inferred signals');
  const newest = Math.min(...real.map((e) => daysSince(e.dated || e.seen) ?? Infinity));
  if (real.length && newest > SIGNAL_DAYS) conditional.push(`newest signal is ${Number.isFinite(newest) ? newest : '?'} days old`);
  const notes = [...stop, ...conditional].join('; ');
  // A Go means a person or the evaluator has reviewed the lead, so a new lead can't have one yet.
  const verdict = stop.length ? 'Stop' : lead.status === 'new' ? 'Not reviewed' : conditional.length ? 'Conditional' : 'Go';
  return { verdict, why: notes };
}

function gate(args) {
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const product = flag('product');
  const status = flag('status') || 'qualified';
  const list = suppressions();
  warnAboutEntries(list);
  const leads = load().filter((l) => (!product || l.product === product) && (status === 'all' || l.status === status));
  if (!leads.length) {
    console.log('No leads match.');
    return;
  }
  const rows = leads.map((l) => ({ id: l.id, tier: l.tier, contact: contactQuality(l.contact), company: l.company, ...gateOf(l, list) }));
  printTable(rows, ['id', 'tier', 'verdict', 'contact', 'company', 'why']);
  const counts = rows.reduce((c, r) => ({ ...c, [r.verdict]: (c[r.verdict] || 0) + 1 }), {});
  console.log(`\n${Object.entries(counts).map(([v, n]) => `${n} ${v}`).join(', ')}. Fix a Stop at the source, then run the gate again.`);
  if (counts.Stop) process.exit(1);
}

function importBatch(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) fail(`No such file: ${file}`);
  const products = productSlugs();
  if (!products.size) fail('No product fact sheets in knowledge/products/ yet. Add a product before importing leads.');

  const blocklist = suppressions();
  const problems = [];
  const batch = [];
  const lineOfKey = new Map();
  readFileSync(path, 'utf8').split('\n').forEach((raw, i) => {
    if (!raw.trim()) return;
    const n = i + 1;
    let lead;
    try {
      lead = JSON.parse(raw);
    } catch (err) {
      problems.push(`line ${n}: not valid JSON (${err.message})`);
      return;
    }
    const errors = validate(lead, products);
    if (lead.status != null && !['new', 'disqualified'].includes(lead.status)) {
      errors.push('a batch may only use status "new" or "disqualified"');
    }
    if (lead.score != null && lead.score !== totalOf(lead.score_breakdown)) {
      errors.push(`score ${lead.score} doesn't match the breakdown total ${totalOf(lead.score_breakdown)}`);
    }
    if (suppressedBy(lead, blocklist)) errors.push('this company or contact is on the suppression list');
    const quality = contactQuality(lead.contact);
    if (lead.score_breakdown?.reachability > (REACHABILITY_CAP[quality] ?? 10)) {
      errors.push(`score_breakdown.reachability can be at most ${REACHABILITY_CAP[quality]} for a ${quality} inbox`);
    }
    if (errors.length) {
      problems.push(...errors.map((e) => `line ${n} (${lead.company || 'no company'}): ${e}`));
      return;
    }
    const key = `${domainOf(lead.website)}|${lead.product}`;
    if (lineOfKey.has(key)) {
      problems.push(`line ${n}: same company and product as line ${lineOfKey.get(key)} (${key})`);
      return;
    }
    lineOfKey.set(key, n);
    batch.push(lead);
  });

  if (problems.length) {
    fail(`Nothing imported. Fix these ${problems.length} problem(s) and run the import again:\n- ${problems.join('\n- ')}`);
  }

  lock();
  const leads = load();
  const byId = new Map(leads.map((l) => [l.id, l]));
  const now = today();
  const source = toRel(path);
  const touched = [];
  let added = 0;
  let updated = 0;

  for (const lead of batch) {
    const domain = domainOf(lead.website);
    const id = idFor(domain, lead.product);
    const score = totalOf(lead.score_breakdown);
    const fields = {
      company: lead.company.trim(),
      website: lead.website,
      domain,
      product: lead.product,
      segment: lead.segment || '',
      industry: lead.industry || '',
      country: lead.country || '',
      size: lead.size || '',
      fit_reason: lead.fit_reason.trim(),
      score_breakdown: Object.fromEntries(Object.keys(SCORE_PARTS).map((k) => [k, lead.score_breakdown[k]])),
      score,
      tier: tierOf(score),
      score_rationale: lead.score_rationale.trim(),
      next_action: lead.next_action.trim(),
      researched_at: lead.researched_at,
      researched_by: lead.researched_by || 'lead-generator',
    };
    if (lead.contact) {
      const { name = '', role = '', channel, value, source_url } = lead.contact;
      fields.contact = { name, role, channel, value: value.trim(), source_url };
    }
    // A critical signal in the gate. Re-importing a lead without it never clears it.
    if (lead.competitor) fields.competitor = lead.competitor.trim();

    const existing = byId.get(id);
    if (existing) {
      Object.assign(existing, fields, { evidence: mergeEvidence(existing.evidence || [], lead.evidence), updated_at: now });
      existing.history.push({ at: now, event: 'updated', note: `re-researched (${source})` });
      touched.push(existing);
      updated++;
    } else {
      const status = lead.status || 'new';
      const created = {
        id,
        ...fields,
        evidence: mergeEvidence([], lead.evidence),
        status,
        ...(status === 'disqualified' ? { disqualify_reason: lead.disqualify_reason.trim() } : {}),
        created_at: now,
        updated_at: now,
        history: [{ at: now, event: 'imported', status, note: source }],
      };
      leads.push(created);
      byId.set(id, created);
      touched.push(created);
      added++;
    }
  }

  save(leads);
  console.log(`Imported ${source}: ${added} added, ${updated} updated. The pipeline has ${leads.length} lead(s).\n`);
  printTable(touched.map(row), ['id', 'product', 'tier', 'score', 'status', 'company']);
}

function check() {
  const leads = load();
  const products = productSlugs();
  const problems = [];
  const ids = new Set();
  for (const lead of leads) {
    const label = `${lead.id || '(no id)'} ${lead.company || ''}`.trim();
    for (const e of validate(lead, products)) problems.push(`${label}: ${e}`);
    if (!STATUSES.includes(lead.status)) problems.push(`${label}: unknown status "${lead.status}"`);
    if (isUrl(lead.website) && lead.id !== idFor(domainOf(lead.website), lead.product)) {
      problems.push(`${label}: id doesn't match its website and product`);
    }
    if (ids.has(lead.id)) problems.push(`${label}: duplicate id`);
    ids.add(lead.id);
    if (lead.score !== totalOf(lead.score_breakdown) || lead.tier !== tierOf(lead.score)) {
      problems.push(`${label}: score or tier doesn't match the breakdown`);
    }
    if (!Array.isArray(lead.history) || !lead.history.length) problems.push(`${label}: missing history`);
  }
  const messages = [];
  const block = (n, file, items) => `${n} problem(s) in ${file}:\n- ${items.join('\n- ')}`;
  if (problems.length) messages.push(block(problems.length, 'pipeline/leads.jsonl', problems));
  const entryProblems = entryProblemsOf(suppressions());
  if (entryProblems.length) messages.push(block(entryProblems.length, 'pipeline/suppression.jsonl', entryProblems));
  if (messages.length) fail(messages.join('\n'));
  console.log(`OK: ${leads.length} lead(s), no problems found.`);
}

function row(l) {
  return {
    id: l.id,
    product: l.product,
    tier: l.tier,
    score: l.score,
    status: l.status,
    updated: l.updated_at,
    company: l.company,
    next_action: l.next_action.length > 60 ? `${l.next_action.slice(0, 57)}...` : l.next_action,
  };
}

function list(args) {
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const product = flag('product');
  const status = flag('status');
  const tier = flag('tier')?.toUpperCase();
  const leads = load().filter(
    (l) => (!product || l.product === product) && (!status || l.status === status) && (!tier || l.tier === tier),
  );
  if (!leads.length) {
    console.log('No leads match.');
    return;
  }
  leads.sort((a, b) => a.tier.localeCompare(b.tier) || b.score - a.score);
  printTable(leads.map(row), ['id', 'product', 'tier', 'score', 'status', 'updated', 'company', 'next_action']);
  const counts = leads.reduce((c, l) => ({ ...c, [l.status]: (c[l.status] || 0) + 1 }), {});
  console.log(`\n${leads.length} lead(s): ${Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(', ')}`);
}

// Current evidence first, so nobody reads a corrected claim as the latest one.
function show(id) {
  const lead = load().find((l) => l.id === id);
  if (!lead) fail(`No lead with id ${id}`);
  const numbered = (lead.evidence || []).map((e, n) => ({ n, ...e }));
  const evidence = [...numbered.filter((e) => !e.superseded), ...numbered.filter((e) => e.superseded)];
  console.log(JSON.stringify({ ...lead, evidence }, null, 2));
}

// Changes one lead while holding the lock, and records it in the lead's history.
function changeLead(id, change) {
  lock();
  const leads = load();
  const lead = leads.find((l) => l.id === id);
  if (!lead) fail(`No lead with id ${id}`);
  const event = change(lead);
  lead.history.push({ at: today(), ...event });
  lead.updated_at = today();
  save(leads);
  return lead;
}

function hold(id, reason, owner) {
  if (!id || !reason?.trim() || !owner?.trim()) fail('Usage: node scripts/leads.mjs hold <id> "<reason>" --owner <who>');
  const lead = changeLead(id, (l) => {
    l.hold = { reason: reason.trim(), owner: owner.trim(), at: today() };
    return { event: 'hold', note: reason.trim() };
  });
  console.log(`${lead.id} ${lead.company} is on hold, owned by ${owner.trim()}.`);
}

function release(id, note) {
  if (!id || !note?.trim()) fail('Usage: node scripts/leads.mjs release <id> "<note>"');
  const lead = changeLead(id, (l) => {
    if (!l.hold) fail(`${id} isn't on hold.`);
    delete l.hold;
    return { event: 'release', note: note.trim() };
  });
  console.log(`${lead.id} ${lead.company} is off hold.`);
}

function supersede(id, n, why) {
  if (!id || !/^\d+$/.test(n || '') || !why?.trim()) fail('Usage: node scripts/leads.mjs supersede <id> <evidence number> "<why>"');
  const lead = changeLead(id, (l) => {
    const item = l.evidence?.[Number(n)];
    if (!item) fail(`${id} has no evidence item ${n}.`);
    item.superseded = { why: why.trim(), at: today() };
    return { event: 'supersede', note: `evidence ${n}: ${why.trim()}` };
  });
  console.log(`Evidence ${n} on ${lead.company} is marked superseded.`);
}

function setNext(id, action) {
  if (!id || !action?.trim()) fail('Usage: node scripts/leads.mjs next <id> "<action>"');
  const lead = changeLead(id, (l) => {
    l.next_action = action.trim();
    return { event: 'next', note: action.trim() };
  });
  console.log(`Updated the next action on ${lead.company}.`);
}

function setStatus(idList, status, note, force) {
  if (!idList || !status) fail('Usage: node scripts/leads.mjs set-status <id[,id...]> <status> [note] [--force]');
  if (!STATUSES.includes(status)) fail(`status must be one of: ${STATUSES.join(', ')}`);
  if (NOTE_REQUIRED.has(status) && !note?.trim()) fail(`A note is required when setting a lead to "${status}".`);

  lock();
  const leads = load();
  const ids = idList.split(',').map((s) => s.trim()).filter(Boolean);
  const missing = ids.filter((id) => !leads.some((l) => l.id === id));
  if (missing.length) fail(`Nothing changed. Unknown lead id(s): ${missing.join(', ')}`);

  const chosen = leads.filter((l) => ids.includes(l.id));
  const blocklist = suppressions();
  const barred = OUTREACH_STATUSES.has(status) ? chosen.filter((l) => suppressedBy(l, blocklist)) : [];
  if (barred.length) fail(`Nothing changed. Suppressed, never contact: ${barred.map((l) => `${l.id} ${l.company}`).join(', ')}`);
  const held = OUTREACH_STATUSES.has(status) ? chosen.filter((l) => l.hold) : [];
  if (held.length) fail(`Nothing changed. On hold: ${held.map((l) => `${l.id} ${l.company} (${l.hold.reason})`).join(', ')}`);
  // Setting the same status again only adds a note to the history.
  const blocked = chosen.filter((l) => !force && l.status !== status && !NEXT[l.status]?.includes(status));
  if (blocked.length) {
    fail(
      `Nothing changed. These lead(s) can't move to "${status}":\n` +
        blocked.map((l) => `- ${l.id} is "${l.status}"; next can be: ${NEXT[l.status]?.join(', ') || 'nothing'}`).join('\n') +
        '\nTo correct a mistake, add --force.',
    );
  }

  const now = today();
  for (const lead of chosen) {
    lead.history.push({ at: now, event: 'status', from: lead.status, status, note: note?.trim() || '', ...(force ? { forced: true } : {}) });
    lead.status = status;
    if (status === 'disqualified') lead.disqualify_reason = note.trim();
    else delete lead.disqualify_reason;
    lead.updated_at = now;
  }
  save(leads);
  console.log(`Set ${ids.length} lead(s) to ${status}.`);
}

const [command, ...args] = process.argv.slice(2);
switch (command) {
  case 'import':
    if (!args[0]) fail('Usage: node scripts/leads.mjs import <batch.jsonl>');
    importBatch(args[0]);
    break;
  case 'check':
    check();
    break;
  case 'list':
    list(args);
    break;
  case 'show':
    if (!args[0]) fail('Usage: node scripts/leads.mjs show <id>');
    show(args[0]);
    break;
  case 'set-status': {
    const rest = args.filter((a) => a !== '--force');
    setStatus(rest[0], rest[1], rest.slice(2).join(' '), rest.length < args.length);
    break;
  }
  case 'suppress':
    suppress(args[0], args.slice(1).join(' '));
    break;
  case 'gate':
    gate(args);
    break;
  case 'hold': {
    const i = args.indexOf('--owner');
    hold(args[0], args.slice(1, i < 0 ? undefined : i).join(' '), i < 0 ? '' : args.slice(i + 1).join(' '));
    break;
  }
  case 'release':
    release(args[0], args.slice(1).join(' '));
    break;
  case 'supersede':
    supersede(args[0], args[1], args.slice(2).join(' '));
    break;
  case 'next':
    setNext(args[0], args.slice(1).join(' '));
    break;
  case 'export-csv':
    lock();
    writeCsv(load());
    console.log(`Wrote ${toRel(CSV)}`);
    break;
  default:
    fail('Usage: node scripts/leads.mjs import <file> | check | list [--product p] [--status s] [--tier A] | show <id> | set-status <ids> <status> [note] [--force] | export-csv | suppress <domain|email|profile URL> "<reason>" | gate [--product p] [--status s] | hold <id> "<reason>" --owner <who> | release <id> "<note>" | supersede <id> <n> "<why>" | next <id> "<action>"');
}
