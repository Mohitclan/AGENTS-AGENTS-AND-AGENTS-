#!/usr/bin/env node
// Lead pipeline. pipeline/leads.jsonl is the system of record and only this script writes it.
// Format and scoring: pipeline/lead-schema.md
//
//   node scripts/leads.mjs import <batch.jsonl>                 validate a batch; add new leads, merge duplicates
//   node scripts/leads.mjs check                                validate the whole pipeline
//   node scripts/leads.mjs list [--product p] [--status s] [--tier A]
//   node scripts/leads.mjs show <id>
//   node scripts/leads.mjs set-status <id[,id...]> <status> [note]
//   node scripts/leads.mjs export-csv                           rewrite pipeline/leads.csv
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { ROOT, fail, printTable, today } from './_shared.mjs';

const PIPELINE = join(ROOT, 'pipeline');
const DB = join(PIPELINE, 'leads.jsonl');
const CSV = join(PIPELINE, 'leads.csv');
const PRODUCTS = join(ROOT, 'knowledge', 'products');

const STATUSES = ['new', 'qualified', 'disqualified', 'drafted', 'approved', 'contacted', 'replied', 'meeting', 'trial', 'won', 'lost'];
const NOTE_REQUIRED = new Set(['disqualified', 'approved', 'contacted', 'won', 'lost']);
const CHANNELS = ['email', 'linkedin', 'form', 'phone', 'other'];
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
      merged.push({ claim: e.claim.trim(), url: e.url, seen: e.seen || today() });
    }
  }
  return merged;
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
    const s = String(v ?? '');
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

function importBatch(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) fail(`No such file: ${file}`);
  const products = productSlugs();
  if (!products.size) fail('No product fact sheets in knowledge/products/ yet. Add a product before importing leads.');

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
  if (problems.length) fail(`${problems.length} problem(s) in pipeline/leads.jsonl:\n- ${problems.join('\n- ')}`);
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

function show(id) {
  const lead = load().find((l) => l.id === id);
  if (!lead) fail(`No lead with id ${id}`);
  console.log(JSON.stringify(lead, null, 2));
}

function setStatus(idList, status, note) {
  if (!idList || !status) fail('Usage: node scripts/leads.mjs set-status <id[,id...]> <status> [note]');
  if (!STATUSES.includes(status)) fail(`status must be one of: ${STATUSES.join(', ')}`);
  if (NOTE_REQUIRED.has(status) && !note?.trim()) fail(`A note is required when setting a lead to "${status}".`);

  const leads = load();
  const ids = idList.split(',').map((s) => s.trim()).filter(Boolean);
  const missing = ids.filter((id) => !leads.some((l) => l.id === id));
  if (missing.length) fail(`Nothing changed. Unknown lead id(s): ${missing.join(', ')}`);

  const now = today();
  for (const lead of leads.filter((l) => ids.includes(l.id))) {
    lead.history.push({ at: now, event: 'status', from: lead.status, status, note: note?.trim() || '' });
    lead.status = status;
    if (status === 'disqualified') lead.disqualify_reason = note.trim();
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
  case 'set-status':
    setStatus(args[0], args[1], args.slice(2).join(' '));
    break;
  case 'export-csv':
    writeCsv(load());
    console.log(`Wrote ${toRel(CSV)}`);
    break;
  default:
    fail('Usage: node scripts/leads.mjs import <file> | check | list [--product p] [--status s] [--tier A] | show <id> | set-status <ids> <status> [note] | export-csv');
}
