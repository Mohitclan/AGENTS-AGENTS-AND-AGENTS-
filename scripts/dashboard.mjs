#!/usr/bin/env node
// A page for running the team: give it a task, watch it work, read the result. It's built from the
// repo's own files on every load and only listens on this computer. Its only actions go through
// jarvis.mjs (add, run, cancel), so sends and other outside actions still wait in ops/approvals.md.
//
//   node scripts/dashboard.mjs              serve it at http://127.0.0.1:4317
//   node scripts/dashboard.mjs --port 5000  on another port
//   node scripts/dashboard.mjs --once       print the page and exit
//   node scripts/dashboard.mjs --hash       read a password on stdin and print its hash
//
// To put it online behind HTTPS, see docs/DEPLOY-team-page.md. TEAM_PAGE_PASSWORD_HASH turns on the
// sign-in, and TEAM_PAGE_HOST is the public name. The page refuses to start with a name and no hash.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { closeSync, existsSync, fstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, posix } from 'node:path';
import { frontmatter, isMain, ROOT } from './_shared.mjs';
import { ART_SCRIPT, ART_STYLE, renderMap, renderWalkthrough, signInArt } from './dashboard-art.mjs';

const DEFAULT_PORT = 4317;
const REACHED = ['new', 'qualified', 'drafted', 'approved', 'contacted', 'replied', 'meeting', 'trial', 'won'];
const TASK_LABEL = { needs_approval: 'Needs a yes', needs_input: 'Needs an answer', done: 'Done', running: 'Running', queued: 'Queued', failed: 'Failed', blocked: 'Blocked', check: 'Check the report' };
const STOP_AT = Number(process.env.JARVIS_STOP_AT || 0.85);
const MAX_TASK = 2000;
const MAX_BODY = 16 * 1024;
const COOKIE = 'team_session';
const SESSION_MS = 12 * 3_600_000;
const LOCK_MS = 15 * 60_000;
const MAX_TRIES = 5; // from one address, per LOCK_MS
const MAX_TRIES_ALL = 30; // from everywhere, per LOCK_MS
const STAGE_LABEL = { new: 'Found', qualified: 'Qualified', drafted: 'Drafted', disqualified: 'Ruled out' };
const VIEWABLE = /^outputs\/(outreach|reports|reviews|research|sales)\/[\w.-]+\.md$/;

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const read = (root, file) => {
  try {
    return readFileSync(join(root, file), 'utf8');
  } catch {
    return '';
  }
};
const readJson = (root, file, fallback) => {
  try {
    return JSON.parse(read(root, file));
  } catch {
    return fallback;
  }
};
const plain = (text) => String(text ?? '').replace(/\*\*|`/g, '');
const shorten = (text, max) => {
  const clean = plain(text).trim();
  const sentence = /^.{10,}?[.?!](?=\s|$)/.exec(clean)?.[0] ?? clean;
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
};
const viewLink = (file) => `/view?file=${encodeURIComponent(file)}`;
const emailsLink = (file) => `${viewLink(file)}#email-1`;

// ---- reading the team's files ---------------------------------------------------------------

export function parseApprovals(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^\| A-\d/.test(line))
    .map((line) => {
      const [id, task, action, files, risk, decision, by, date] = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      return { id, task, action, files, risk, decision, by, date };
    });
}

function loadLeads(root) {
  return read(root, 'pipeline/leads.jsonl')
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

// The review score for a lead's sequence, taken from the review named on its approval rows.
function reviewOf(root, id, approvals) {
  const row = approvals.find((a) => a.files?.includes(`outputs/outreach/${id}.md`) && /outputs\/reviews\//.test(a.files));
  const file = row && /outputs\/reviews\/[\w.-]+\.md/.exec(row.files)?.[0];
  if (!file) return null;
  const line = read(root, file).split(/\r?\n/).find((l) => l.includes(id) && l.includes('PASS'));
  const score = line && (/PASS\*{0,2}\s*\|\s*(\d{2,3})\/100/.exec(line) ?? /\*\*(\d{2,3})\*\*\s*\|\s*\*\*PASS/.exec(line))?.[1];
  return score ? { score: Number(score), file } : null;
}

function loadAgents(root) {
  const dir = join(root, '.claude', 'agents');
  if (!existsSync(dir)) return [];
  const done = {};
  for (const line of read(root, 'ops/board.md').split(/\r?\n/)) {
    const agent = /^\| T-\d/.test(line) ? line.split('|')[3] : '';
    for (const name of agent.split(/[^\w-]+/).filter(Boolean)) done[name] = (done[name] || 0) + 1;
  }
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const fm = frontmatter(readFileSync(join(dir, f), 'utf8')) || {};
      const name = fm.name || f.replace(/\.md$/, '');
      return { name, description: fm.description || '', model: fm.model || '', tasks: done[name] || 0, backup: name.endsWith('-fallback') };
    });
}

function describeTool({ name, input = {} }, root) {
  const path = String(input.file_path || input.path || '').replaceAll('\\', '/').replace(`${root.replaceAll('\\', '/')}/`, '');
  if (name === 'Agent' || name === 'Task') return `Handed work to ${input.subagent_type || 'an agent'}: ${input.description || ''}`;
  if (name === 'Write' || name === 'Edit') return `Wrote ${path}`;
  if (name === 'Read') return `Read ${path}`;
  if (name === 'Grep' || name === 'Glob') return 'Searched the files';
  if (name === 'WebSearch') return `Searched the web: ${input.query || ''}`;
  if (name === 'WebFetch') return `Opened ${input.url || 'a page'}`;
  if (name === 'Bash') return input.description || 'Ran a command';
  return `Used ${name}`;
}

// The latest steps of a running task, newest first, from the end of its log.
export function recentSteps(root, id, limit = 6) {
  const file = join(root, 'ops', 'runs', `${id}.log`);
  if (!existsSync(file)) return [];
  const fd = openSync(file, 'r');
  const size = fstatSync(fd).size;
  const length = Math.min(size, 256 * 1024);
  const buffer = Buffer.alloc(length);
  readSync(fd, buffer, 0, length, size - length);
  closeSync(fd);
  const steps = [];
  for (const line of buffer.toString('utf8').split('\n')) {
    try {
      const event = JSON.parse(line);
      if (event.type !== 'assistant') continue;
      for (const block of event.message?.content ?? []) if (block.type === 'tool_use') steps.push(describeTool(block, root));
    } catch {
      // the first and last lines of the tail can be cut off
    }
  }
  return steps.slice(-limit).reverse();
}

// Which agents a running task has reached, read from its latest steps (newest first). A hand-off
// names the agent; a file written under outputs/<area>/ names the one that owns that area. An agent
// on its backup (`<name>-fallback`) counts for the agent it stands in for.
const AREA_OWNER = { research: 'researcher', outreach: 'outreach', sales: 'sales', marketing: 'marketing', demos: 'demo-handler', docs: 'docs-handler', dev: 'developer', reviews: 'evaluator' };
export function activeAgents(steps, names) {
  const known = new Set(names);
  const seen = [];
  const backup = [];
  for (const step of steps) {
    const raw = /^Handed work to ([\w-]+)/.exec(step)?.[1] ?? AREA_OWNER[/^Wrote outputs\/(\w+)\//.exec(step)?.[1]];
    const name = raw?.replace(/-fallback$/, '');
    if (!name || !known.has(name)) continue;
    if (!seen.includes(name)) seen.push(name);
    if (raw !== name && !backup.includes(name)) backup.push(name);
  }
  return { focus: seen[0] ?? null, seen, backup };
}

function taskTitle(root, task) {
  const h1 = task.report ? /^# (.+)$/m.exec(read(root, task.report))?.[1] : '';
  const title = shorten(h1?.replace(/^Report:?\s*/, '').replace(/^J-\d+-\d+[,:]?\s*/, '') || task.task, 90);
  return title[0].toUpperCase() + title.slice(1);
}

function planUsage(root) {
  const data = readJson(root, 'ops/runs/plan-limits.json', null);
  if (!data?.windows) return null;
  const line = (w) => (w ? { used: Math.round((w.utilization ?? 0) * 100), reset: w.resetsAt * 1000 < Date.now() } : null);
  const full = Object.entries(data.windows).find(([, w]) => w.resetsAt * 1000 > Date.now() && w.utilization >= STOP_AT)?.[0];
  return { at: data.at, fiveHour: line(data.windows.five_hour), weekly: line(data.windows.seven_day), full: full && (full === 'five_hour' ? '5-hour' : 'weekly') };
}

function runAlive(root) {
  const pid = Number(read(root, 'ops/runs/jarvis.lock'));
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

export function collect(root = ROOT) {
  const approvals = parseApprovals(read(root, 'ops/approvals.md'));
  const pending = approvals.filter((a) => a.decision === 'pending');
  const leads = loadLeads(root).map((lead) => {
    const outreach = `outputs/outreach/${lead.id}.md`;
    return { ...lead, sequence: existsSync(join(root, outreach)) ? outreach : null, review: reviewOf(root, lead.id, approvals) };
  });
  const queue = readJson(root, 'ops/queue.json', []);
  const tasks = queue.map((t) => ({ ...t, title: taskTitle(root, t) })).reverse();
  const running = tasks.find((t) => t.status === 'running') ?? null;
  const sprint = /(\d+) candidates/.exec(read(root, 'docs/ROADMAP.md').split('## Sprint results')[1] ?? '')?.[1];
  const steps = running ? recentSteps(root, running.id) : [];
  const agents = loadAgents(root);
  const alive = runAlive(root);
  return {
    leads,
    tasks,
    running: running && { ...running, steps },
    runAlive: alive,
    // Who is busy right now, for the map: null unless a run is alive on a running task.
    working: running && alive ? activeAgents(steps, agents.filter((a) => !a.backup).map((a) => a.name)) : null,
    queued: tasks.filter((t) => t.status === 'queued').reverse(),
    pending,
    sends: pending.filter((a) => /^send /i.test(a.action)),
    others: pending.filter((a) => !/^send /i.test(a.action)),
    agents,
    reviews: existsSync(join(root, 'outputs', 'reviews')) ? readdirSync(join(root, 'outputs', 'reviews')).filter((f) => f.endsWith('.md')).length : 0,
    usage: planUsage(root),
    senderBlank: read(root, 'knowledge/company.md').includes('{{SENDER_NAME}}'),
    candidates: sprint ? Number(sprint) : null,
  };
}

// ---- Markdown, for reading a report or draft -------------------------------------------------

function inline(text, from) {
  const held = [];
  const hold = (html) => `\u0000${held.push(html) - 1}\u0000`;
  const out = escapeHtml(text)
    .replace(/`([^`]+)`/g, (_, code) => hold(`<code>${code}</code>`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
      const href = url.replace(/&amp;/g, '&');
      if (/^https?:\/\//i.test(href)) return hold(`<a href="${escapeHtml(href)}" rel="noreferrer" target="_blank">${label}</a>`);
      const target = posix.normalize(posix.join(posix.dirname(from), href.split('#')[0]));
      return VIEWABLE.test(target) ? hold(`<a href="${escapeHtml(viewLink(target))}">${label}</a>`) : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\{\{[A-Z_]+\}\}/g, (m) => `<mark>${m}</mark>`);
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => held[Number(i)]);
}

export function renderMarkdown(text, from = 'outputs/reports/x.md') {
  const lines = text.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/, '').split(/\r?\n/);
  const html = [];
  const cells = (l) => l.replace(/^\s*\||\|\s*$/g, '').split('|').map((c) => inline(c.trim(), from));
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    const heading = /^(#{1,4}) (.+)$/.exec(line);
    if (!line.trim()) i += 1;
    else if (heading) {
      const level = Math.min(heading[1].length + 1, 4);
      const slug = plain(heading[2]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      html.push(`<h${level} id="${slug}">${inline(heading[2], from)}</h${level}>`);
      i += 1;
    } else if (/^```/.test(line)) {
      const body = [];
      for (i += 1; i < lines.length && !/^```/.test(lines[i]); i += 1) body.push(lines[i]);
      i += 1;
      html.push(`<pre>${escapeHtml(body.join('\n'))}</pre>`);
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      html.push('<hr>');
      i += 1;
    } else if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const head = cells(line).map((c) => `<th>${c}</th>`).join('');
      const rows = [];
      for (i += 2; i < lines.length && /^\s*\|/.test(lines[i]); i += 1) rows.push(`<tr>${cells(lines[i]).map((c) => `<td>${c}</td>`).join('')}</tr>`);
      html.push(`<div class="wide"><table><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`);
    } else if (/^\s*([-*]|\d+\.) /.test(line)) {
      const tag = /^\s*\d/.test(line) ? 'ol' : 'ul';
      const items = [];
      for (; i < lines.length && /^\s*([-*]|\d+\.) /.test(lines[i]); i += 1) items.push(`<li>${inline(lines[i].replace(/^\s*([-*]|\d+\.) /, ''), from)}</li>`);
      html.push(`<${tag}>${items.join('')}</${tag}>`);
    } else if (/^> ?/.test(line)) {
      const body = [];
      for (; i < lines.length && /^> ?/.test(lines[i]); i += 1) body.push(inline(lines[i].replace(/^> ?/, ''), from));
      html.push(`<blockquote>${body.join('<br>')}</blockquote>`);
    } else {
      const body = [];
      for (; i < lines.length && lines[i].trim() && !/^(#{1,4} |```|\s*\||\s*[-*] |\s*\d+\. |> ?)/.test(lines[i]); i += 1) body.push(inline(lines[i], from));
      if (body.length) html.push(`<p>${body.join('<br>')}</p>`);
      else {
        html.push(`<p>${inline(line, from)}</p>`);
        i += 1;
      }
    }
  }
  return html.join('\n');
}

// ---- the page --------------------------------------------------------------------------------

const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const reached = (lead, stage) => REACHED.indexOf(lead.status) >= REACHED.indexOf(stage);
const leadName = (lead) => escapeHtml(lead.company.replace(/\s*\(.*\)$/, ''));

function chip(lead) {
  const name = leadName(lead);
  const note = lead.hold ? ' <em>on hold</em>' : lead.review ? ` <em>${lead.review.score}/100</em>` : '';
  return lead.sequence ? `<a class="chip" href="${emailsLink(lead.sequence)}">${name}${note}</a>` : `<span class="chip">${name}${note}</span>`;
}

function renderLine(data) {
  const live = data.leads.filter((l) => l.status !== 'disqualified');
  const out = data.leads.length - live.length;
  const contacted = live.filter((l) => reached(l, 'contacted')).length;
  const drafted = live.filter((l) => reached(l, 'drafted'));
  const stop = (n, label, note, chips = []) =>
    `<li class="stop"><strong>${n}</strong><span>${label}</span>${note ? `<small>${note}</small>` : ''}<div class="chips">${chips.map(chip).join('')}</div></li>`;
  return `<section class="hero" aria-labelledby="sum">
  <h1 id="sum">${count(drafted.length, 'sequence is', 'sequences are')} ready, ${count(data.sends.length, 'send is', 'sends are')} waiting for a person, and ${count(contacted, 'lead has', 'leads have')} been contacted.</h1>
  <ol class="line">
    ${stop(data.leads.length, 'leads found', out ? `${out} ruled out` : '', live.filter((l) => l.status === 'new'))}
    ${stop(live.filter((l) => reached(l, 'qualified')).length, 'qualified', '', live.filter((l) => l.status === 'qualified'))}
    ${stop(drafted.length, 'drafted and passed review', '', live.filter((l) => l.status === 'drafted'))}
    <li class="gate"><div class="bar" aria-hidden="true"></div><div><strong>${data.sends.length}</strong><span>sends need a person's yes</span>${data.senderBlank ? '<small>Sender details are still blank</small>' : ''}</div></li>
    <li class="stop after"><strong>${contacted}</strong><span>contacted</span><small>Agents can't send</small></li>
  </ol>
</section>`;
}

// The lead counts and waiting sends shown on the map.
function funnel(data) {
  const live = data.leads.filter((l) => l.status !== 'disqualified');
  const count = (stage) => live.filter((l) => reached(l, stage)).length;
  return { found: data.leads.length, qualified: count('qualified'), drafted: count('drafted'), contacted: count('contacted'), sends: data.sends.length };
}

function renderNow(data) {
  const t = data.running;
  const stopped = t && !data.runAlive;
  const canStart = (data.queued.length > 0 || stopped) && !data.runAlive && !data.usage?.full;
  const waiting = data.queued.map((q) => `<li>${escapeHtml(q.title)} <button class="quiet" type="button" data-cancel="${escapeHtml(q.id)}">Cancel</button></li>`);
  const parts = [];
  if (t && !stopped) {
    const steps = t.steps.length ? t.steps.map((s) => `<li>${escapeHtml(shorten(s, 110))}</li>`).join('') : '<li>Starting the coordinator</li>';
    parts.push(`<p><span class="dot on"></span><b>Working now:</b> ${escapeHtml(t.title)} <small>started ${escapeHtml(t.started || '')}</small></p><ul>${steps}</ul>`);
  } else if (stopped) parts.push(`<p><span class="dot"></span><b>Stopped:</b> ${escapeHtml(t.title)}. The run ended before this task finished, so it needs starting again.</p>`);
  else parts.push('<p><span class="dot"></span>No task is running.</p>');
  if (waiting.length) parts.push(`<p class="next">Waiting to start:</p><ul class="waiting">${waiting.join('')}</ul>`);
  if (data.usage?.full) parts.push(`<p class="bad">New tasks can't start: the plan's ${data.usage.full} window is at ${Math.round(STOP_AT * 100)}% or more. They'll wait until it resets.</p>`);
  if (canStart) parts.push('<button type="button" data-run="1">Start waiting tasks</button>');
  return `<section class="now${t && !stopped ? '' : ' idle'}">${parts.join('')}</section>`;
}

function renderTasks(data) {
  const rows = data.tasks.slice(0, 8).map((t) => {
    const title = escapeHtml(t.title);
    return `<li><span class="st ${escapeHtml(t.status)}">${escapeHtml(TASK_LABEL[t.status] || t.status)}</span>${t.report ? `<a href="${viewLink(t.report)}">${title}</a>` : `<span>${title}</span>`}</li>`;
  });
  return `<section aria-labelledby="tasks"><h2 id="tasks">Latest tasks</h2><ul class="tasks">${rows.join('') || '<li>No tasks yet. Give one with <code>node scripts/jarvis.mjs do</code>.</li>'}</ul></section>`;
}

function renderLeads(data) {
  const row = (l) => {
    const seq = l.sequence ? `<a href="${emailsLink(l.sequence)}">Read the emails</a>` : '';
    const stage = l.hold && l.status !== 'disqualified' ? 'On hold' : STAGE_LABEL[l.status] || l.status;
    const why = l.status === 'disqualified' ? l.fit_reason : l.hold ? l.hold.reason : l.status === 'drafted' ? 'A person reads the emails and approves each send.' : l.next_action;
    return `<tr><th scope="row">${leadName(l)}</th><td>${escapeHtml(stage)}</td><td class="num">${l.review ? `${l.review.score}/100` : ''}</td><td class="num">${escapeHtml(l.score)}</td><td>${escapeHtml(shorten(why, 140))}</td><td>${seq}</td></tr>`;
  };
  const head = '<thead><tr><th scope="col">Company</th><th scope="col">Stage</th><th scope="col">Review</th><th scope="col">Fit</th><th scope="col">Next</th><th scope="col"><span class="hidden">Draft</span></th></tr></thead>';
  const live = data.leads.filter((l) => l.status !== 'disqualified').sort((a, b) => REACHED.indexOf(b.status) - REACHED.indexOf(a.status));
  const out = data.leads.filter((l) => l.status === 'disqualified');
  return `<section aria-labelledby="leads"><h2 id="leads">Leads</h2>
  ${data.candidates ? `<p class="note">The last sprint checked ${data.candidates} candidates. Only the ones that were imported are listed.</p>` : ''}
  <div class="wide"><table>${head}<tbody>${live.map(row).join('')}</tbody></table></div>
  ${out.length ? `<details><summary>${count(out.length, 'lead')} ruled out</summary><div class="wide"><table>${head}<tbody>${out.map(row).join('')}</tbody></table></div></details>` : ''}
</section>`;
}

function renderTeam(data) {
  const main = data.agents.filter((a) => !a.backup);
  const backups = data.agents.length - main.length;
  const order = (a) => (a.name === 'coordinator' ? 0 : a.name === 'evaluator' ? 1 : 2);
  const record = (a) => {
    if (a.name === 'coordinator') return `Planned ${count(data.tasks.length, 'request')}`;
    if (a.name === 'evaluator') return `Wrote ${count(data.reviews, 'review')}`;
    return a.tasks ? `${count(a.tasks, 'task')} so far` : 'No tasks yet';
  };
  const rows = [...main].sort((a, b) => order(a) - order(b) || b.tasks - a.tasks).map(
    (a) => `<li><h3>${escapeHtml(a.name.replace(/-/g, ' '))}</h3><p>${escapeHtml(shorten(a.description, 170))}</p><small>${record(a)}${a.model ? `, runs on ${escapeHtml(a.model[0].toUpperCase() + a.model.slice(1))}` : ''}</small></li>`,
  );
  return `<section aria-labelledby="team"><h2 id="team">The team</h2>
  <p class="note">${count(main.length, 'agent')}, plus ${count(backups, 'backup')} that take over after 3 failed attempts.</p>
  <ul class="team">${rows.join('')}</ul></section>`;
}

function renderApprovals(data) {
  const byLead = new Map();
  for (const a of data.sends) {
    const id = /outputs\/outreach\/(L-[\w]+)\.md/.exec(a.files)?.[1] ?? '';
    byLead.set(id, [...(byLead.get(id) ?? []), a]);
  }
  const sends = [...byLead].map(([id, rows]) => {
    const lead = data.leads.find((l) => l.id === id);
    return `<li><b>${lead ? leadName(lead) : 'Other'}</b> ${count(rows.length, 'send')} waiting${lead?.sequence ? `, <a href="${emailsLink(lead.sequence)}">read the drafts</a>` : ''}</li>`;
  });
  const others = data.others.map((a) => `<li>${escapeHtml(shorten(a.action, 220))}</li>`);
  return `<section class="gatebox" aria-labelledby="yes"><h2 id="yes">Waiting for a person</h2>
  <p class="note">Reviews check quality. Only a person can approve a send, and each yes covers one action.</p>
  <div class="split"><div><h3>Sends</h3><ul class="plainlist">${sends.join('') || '<li>No sends are waiting.</li>'}</ul></div>
  <div><h3>Other decisions</h3><ul class="plainlist">${others.join('') || '<li>No other decisions are waiting.</li>'}</ul></div></div></section>`;
}

function renderUsage(usage) {
  if (!usage) return '';
  const part = (label, w) => (w ? `${label} ${w.reset ? 'has reset' : `${w.used}% used`}` : '');
  const at = new Date(usage.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `<p class="usage">Plan: ${[part('5-hour', usage.fiveHour), part('weekly', usage.weekly)].filter(Boolean).join(', ')}. Last reading ${escapeHtml(at)}.</p>`;
}

// The two parts of the page that refresh; the task box sits between them, so typing isn't lost.
const SPLIT = '<!--split-->';
const renderDiagram = (data) =>
  renderMap({ agents: data.agents, requests: data.tasks.length, reviews: data.reviews, funnel: funnel(data), working: data.working ?? null });
export const renderLive = (data) =>
  [renderLine(data), renderDiagram(data), SPLIT, renderNow(data), `<div class="two">`, renderTasks(data), renderLeads(data), `</div>`, renderTeam(data), renderApprovals(data)].join('\n');

const TASK_BOX = `<section class="ask"><form id="ask">
<label for="task">Give the team a task</label>
<div class="askrow"><textarea id="task" rows="2" maxlength="${MAX_TASK}" required></textarea><button type="submit">Start task</button></div>
<p class="note">Keep it small: one broad task can use a whole 5-hour window. Nothing leaves this computer without a person's yes.</p>
<p id="said" role="status"></p>
</form></section>`;

const STYLE = `
:root{--paper:#f3ecdf;--card:#faf5ea;--ink:#1c1a15;--muted:#5a5446;--verm:#e0482d;--verm-ink:#b3321a;--green:#0f5a4a;--mustard:#e2a527;--faint:#d6cbb3;--gut:clamp(1rem,4vw,3.5rem);--head:"Big Shoulders Display","Arial Narrow",Impact,sans-serif;--serif:"Newsreader",Georgia,"Times New Roman",serif;--mono:"IBM Plex Mono",ui-monospace,Consolas,monospace}
*{box-sizing:border-box}
body{margin:0;background:var(--paper) radial-gradient(rgba(28,26,21,.09) 1px,transparent 1.3px) 0 0/8px 8px;color:var(--ink);font:400 1.125rem/1.55 var(--serif)}
h1,h2,h3{font-family:var(--head);margin:0}
a{color:var(--ink);text-decoration-thickness:2px;text-decoration-color:var(--verm);text-underline-offset:.18em}
a:hover{background:var(--mustard)}
a:focus-visible,button:focus-visible,textarea:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--verm);outline-offset:3px}
code{font:500 .86em var(--mono);background:var(--card);border:1px solid var(--faint);padding:.05em .3em}
button{font:600 .82rem var(--mono);letter-spacing:.08em;text-transform:uppercase;background:var(--ink);color:var(--paper);border:2px solid var(--ink);border-radius:0;padding:.7rem 1.2rem;cursor:pointer;box-shadow:4px 4px 0 var(--verm);transition:transform .08s,box-shadow .08s}
button:hover{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--verm)}
button:active{transform:translate(4px,4px);box-shadow:0 0 0 var(--verm)}
button.quiet{background:none;color:var(--verm-ink);border:0;box-shadow:none;padding:0 .2rem;text-decoration:underline;font-weight:500;letter-spacing:0;text-transform:none;transform:none}
button.quiet:hover{background:var(--mustard);color:var(--ink);box-shadow:none}
button:disabled{opacity:.55;cursor:wait}
textarea,input{font:inherit;color:inherit;width:100%;padding:.6rem .8rem;border:2px solid var(--ink);border-radius:0;background:var(--card)}
textarea{resize:vertical;font:400 .95rem/1.6 var(--mono)}
.hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.kick{font:600 .72rem var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--verm-ink)}

.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:.5rem 2rem;padding:1rem var(--gut) .7rem;border-top:10px solid var(--ink);border-bottom:2px solid var(--ink);background:var(--paper)}
.plate{display:flex;flex-direction:column;gap:.15rem}
.plate b{font:900 clamp(2rem,4vw,3rem)/.9 var(--head);text-transform:uppercase;letter-spacing:.02em;text-shadow:3px 3px 0 var(--verm)}
.top nav{display:flex;gap:1.4rem;flex-wrap:wrap;font:500 .8rem var(--mono);letter-spacing:.06em;text-transform:uppercase}
.tools{display:flex;gap:1.2rem;align-items:baseline;flex-wrap:wrap}
.usage{margin:0;font:500 .78rem var(--mono);color:var(--muted)}
.top .quiet{margin-left:0}

.hero{max-width:1500px;margin:0 auto;padding:clamp(1.5rem,3.5vw,3rem) var(--gut) 0}
.hero h1{font:900 clamp(2.3rem,5.2vw,4.6rem)/.95 var(--head);text-transform:uppercase;letter-spacing:.005em;margin:0 0 2rem;max-width:17em;padding-left:1.1rem;border-left:12px solid var(--verm)}
.line{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr 1.3fr 1.25fr .85fr;border-top:4px solid var(--ink);border-bottom:1px solid var(--ink)}
.stop,.gate{position:relative;min-width:0;padding:.9rem 1rem 1rem 1.1rem;border-left:1px dashed var(--ink)}
.stop:first-child{border-left:0;padding-left:0}
.stop strong,.gate strong{display:block;font:900 clamp(3rem,6.5vw,5.5rem)/.9 var(--head);text-shadow:.045em .045em 0 var(--mustard)}
.stop span,.gate span{display:block;font:600 .8rem/1.3 var(--mono);letter-spacing:.06em;text-transform:uppercase;margin-top:.5rem}
.stop small,.gate small{display:block;color:var(--muted);font:500 .78rem/1.4 var(--mono);margin-top:.25rem}
.gate{display:flex;gap:1rem;padding-left:2.3rem;border-left:0}
.gate strong{color:var(--verm);text-shadow:.045em .045em 0 var(--ink)}
.bar{position:absolute;left:0;top:0;bottom:0;width:16px;background:repeating-linear-gradient(45deg,var(--ink) 0 6px,var(--mustard) 6px 12px);border-right:2px solid var(--ink)}
.stop.after{background:var(--ink);color:var(--paper);border-left:0}
.stop.after strong{text-shadow:.045em .045em 0 var(--verm)}
.stop.after small{color:#d9cfb8}
.chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.7rem}
.chip{display:inline-block;font:500 .78rem var(--mono);background:var(--card);color:var(--ink);border:1px solid var(--ink);padding:.1rem .45rem;text-decoration:none;white-space:nowrap}
a.chip{box-shadow:2px 2px 0 var(--ink)}
a.chip:hover{background:var(--mustard)}
.chip em{font-style:normal;color:var(--green);font-weight:600}

.body{max-width:1500px;margin:0 auto;padding:0 var(--gut) 3rem}
.ask{margin-top:2.25rem;border-top:3px solid var(--ink);padding-top:1rem}
.ask form{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,9fr);gap:.4rem 2rem;align-items:start}
.ask label{grid-row:1/4;font:900 clamp(1.8rem,3vw,2.6rem)/.95 var(--head);text-transform:uppercase}
.ask label::before{content:"Work order";display:block;font:600 .7rem var(--mono);letter-spacing:.16em;color:var(--verm-ink);margin-bottom:.4rem}
.askrow{display:flex;gap:1rem;align-items:stretch}
.askrow button{flex:none}
.ask .note{margin:0}
.note{color:var(--muted);font:italic 400 1rem/1.45 var(--serif);margin:-.2rem 0 .9rem}
#said{margin:0;font:600 .9rem var(--mono);color:var(--green)}
#said:empty{display:none}
#said.bad,.bad{color:var(--verm-ink);font-weight:600}
.now{position:relative;margin:1.75rem 0 0;padding:1rem 1.25rem 1rem 1.9rem;background:var(--card);border:2px solid var(--ink);box-shadow:6px 6px 0 var(--faint)}
.now::before{content:"";position:absolute;left:.55rem;top:.6rem;bottom:.6rem;border-left:3px dotted var(--ink)}
.now.idle{background:transparent;border-style:dashed;box-shadow:none}
.now p{margin:0}.now .next{margin-top:.7rem;font:600 .75rem var(--mono);letter-spacing:.1em;text-transform:uppercase}.now .bad{margin:.6rem 0}.now>button{margin-top:.8rem}
.now ul{margin:.5rem 0 0;padding-left:1.4rem;color:var(--muted);font-size:1rem}
.now small{color:var(--muted);font:500 .78rem var(--mono)}
.dot{display:inline-block;width:.7em;height:.7em;background:var(--faint);border:1.5px solid var(--ink);margin-right:.55em}
.dot.on{background:var(--verm);animation:pulse 1.2s steps(2,jump-none) infinite}
@keyframes pulse{50%{opacity:.25}}
.two{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,8fr);gap:0 3.5rem}
h2{font:900 clamp(1.9rem,3.2vw,2.6rem)/1 var(--head);text-transform:uppercase;letter-spacing:.01em;margin:2.75rem 0 .8rem;display:flex;align-items:center;gap:.6rem}
h2::before{content:"";flex:none;width:.5em;height:.5em;background:var(--verm)}
h3{font:800 1.3rem/1.05 var(--head);text-transform:uppercase;letter-spacing:.03em}
.tasks{list-style:none;margin:0;padding:0;border-top:3px solid var(--ink)}
.tasks li{display:grid;grid-template-columns:8.8rem minmax(0,1fr);gap:.75rem;padding:.6rem 0;border-bottom:1px solid var(--faint)}
.st{align-self:start;justify-self:start;font:600 .68rem/1.2 var(--mono);letter-spacing:.08em;text-transform:uppercase;border:2px solid currentColor;padding:.18rem .45rem;transform:rotate(-1.5deg);color:var(--muted)}
.st.done,.st.running{color:var(--green)}
.st.needs_approval,.st.needs_input{background:var(--mustard);color:var(--ink);border-color:var(--ink)}
.st.failed,.st.blocked{color:var(--verm-ink)}
.wide{overflow-x:auto}
table{border-collapse:collapse;width:100%}
th,td{text-align:left;vertical-align:top;padding:.55rem .9rem .55rem 0;border-bottom:1px solid var(--faint)}
thead th{font:600 .68rem var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);border-top:3px solid var(--ink);border-bottom:1px solid var(--ink)}
tbody th{font-weight:700}
.num{font:500 .88rem var(--mono);white-space:nowrap}
td:last-child{white-space:nowrap;padding-right:0}
details{margin-top:.9rem}summary{cursor:pointer;font:600 .8rem var(--mono);letter-spacing:.06em;text-transform:uppercase}
.team{list-style:none;margin:0;padding:0;border-top:3px solid var(--ink)}
.team li{display:grid;grid-template-columns:minmax(9rem,2fr) minmax(0,6fr) minmax(8rem,3fr);gap:.2rem 1.75rem;align-items:baseline;padding:.75rem 0;border-bottom:1px solid var(--faint)}
.team li:nth-child(-n+2){padding:1.1rem 0;border-bottom:2px solid var(--ink)}
.team li:nth-child(-n+2) h3{font-size:2.1rem;text-shadow:2px 2px 0 var(--mustard)}
.team p{margin:0}.team small{color:var(--muted);font:500 .78rem/1.4 var(--mono)}
.gatebox{margin-top:3rem;position:relative;padding-top:1.4rem}
.gatebox::before{content:"";position:absolute;left:0;right:0;top:0;height:14px;background:repeating-linear-gradient(45deg,var(--ink) 0 8px,var(--mustard) 8px 16px);border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
.gatebox h2{margin-top:.6rem}
.split{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,8fr);gap:1rem 3.5rem}
.plainlist{list-style:none;margin:.5rem 0 0;padding:0}
.plainlist li{position:relative;padding:.4rem 0 .4rem 1.3rem;border-bottom:1px dotted var(--ink)}
.plainlist li::before{content:"";position:absolute;left:0;top:.85rem;width:.6rem;height:.6rem;background:var(--mustard);border:1.5px solid var(--ink)}

.doc{max-width:50rem;margin:0 auto;padding:1.5rem var(--gut) 4rem}
.doc h2{font-size:2.2rem;margin-top:2.25rem}.doc h3{font-size:1.5rem;margin-top:1.9rem}.doc h4{font:800 1.1rem var(--head);text-transform:uppercase;letter-spacing:.04em;margin:1.4rem 0 .25rem}
.doc pre{background:var(--ink);color:var(--paper);padding:1rem;overflow-x:auto;white-space:pre-wrap;font:400 .85rem/1.55 var(--mono)}
.doc blockquote{margin:1rem 0;padding:.4rem 1rem;border-left:8px solid var(--mustard);background:var(--card)}
.doc li{margin:.25rem 0}
.doc hr{border:0;border-top:3px double var(--ink);margin:2rem 0}
.banner{display:inline-block;font:700 .82rem var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--verm-ink);border:3px solid var(--verm-ink);padding:.3rem .8rem;transform:rotate(-1.5deg);margin:1rem 0}
mark{background:var(--mustard);color:var(--ink);padding:0 .25em;font-weight:600}

.signin{display:grid;grid-template-columns:minmax(0,6fr) minmax(0,5fr);min-height:100vh}
.signin .art{display:flex;align-items:center;justify-content:center;padding:2rem;background:var(--mustard);border-right:10px solid var(--ink)}
.lockart{width:min(100%,26rem);height:auto}
.signin .ticket{align-self:center;padding:clamp(1.5rem,6vw,5rem)}
.signin h1{font:900 clamp(2.6rem,6vw,4.5rem)/.9 var(--head);text-transform:uppercase;margin:.3rem 0 1.5rem;text-shadow:3px 3px 0 var(--verm)}
.signin label{display:block;margin-bottom:.3rem;font:600 .75rem var(--mono);letter-spacing:.14em;text-transform:uppercase}
.signin button{margin-top:1rem}
.signin #said{margin-top:.8rem}
@media (prefers-reduced-motion:no-preference){
.a-lock{transform-box:fill-box;transform-origin:100% 50%;animation:lift 3.8s ease-in-out infinite}
}
@keyframes lift{0%,30%{transform:rotate(0)}55%,80%{transform:rotate(26deg)}100%{transform:rotate(0)}}
@media (max-width:900px){
.line{grid-template-columns:minmax(0,1fr)}
.stop,.gate,.stop:first-child{border-left:0;border-top:1px dashed var(--ink);padding:.8rem 0 .9rem}
.stop:first-child{border-top:0}
.gate{padding-left:2.2rem}
.stop.after{padding-left:1rem}
.two,.split{grid-template-columns:minmax(0,1fr)}
.ask form{grid-template-columns:minmax(0,1fr)}
.ask label{grid-row:auto}
.askrow{flex-direction:column}
.tasks li{grid-template-columns:minmax(0,1fr);gap:.3rem}
.team li{grid-template-columns:minmax(0,1fr)}
.signin{grid-template-columns:minmax(0,1fr)}
.signin .art{border-right:0;border-bottom:10px solid var(--ink);padding:1rem}
.lockart{width:min(60%,14rem)}
.top nav{order:3;width:100%}
}
@media (prefers-reduced-motion:reduce){.dot.on{animation:none}}
`;

const SCRIPT = `
const hero=document.getElementById('hero'),live=document.getElementById('live'),said=document.getElementById('said');
const form=document.getElementById('ask'),box=document.getElementById('task');
let last='';
${ART_SCRIPT}
async function refresh(){try{const res=await fetch('/live');if(res.status===401){location.reload();return}const html=await res.text();if(html===last)return;last=html;
const [top,rest]=html.split('${SPLIT}');const open=live.querySelector('details')?.open;
setTop(top);live.innerHTML=rest;if(open)live.querySelector('details').open=true}catch{}}
async function post(path,body){const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Team-Page':'1'},body:JSON.stringify(body||{})});
const out=await res.json();said.textContent=out.message;said.className=res.ok?'':'bad';refresh();return res.ok}
form.addEventListener('submit',async(e)=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;
try{if(await post('/tasks',{task:box.value}))box.value=''}catch{said.textContent="The page can't reach the server. Check that dashboard.mjs is still running.";said.className='bad'}button.disabled=false});
box.addEventListener('keydown',(e)=>{if(e.key==='Enter'&&e.ctrlKey)form.requestSubmit()});
document.addEventListener('click',(e)=>{const b=e.target.closest('button');if(!b)return;
if(b.dataset.signout)post('/logout');if(b.dataset.run)post('/run');if(b.dataset.cancel)post('/tasks/'+b.dataset.cancel+'/cancel')});
setInterval(refresh,3000);
`;

const SIGN_IN_SCRIPT = `
const form=document.getElementById('signin'),said=document.getElementById('said');
form.addEventListener('submit',async(e)=>{e.preventDefault();said.textContent='';
try{const res=await fetch('/login',{method:'POST',headers:{'Content-Type':'application/json','X-Team-Page':'1'},body:JSON.stringify({password:document.getElementById('password').value})});
if(res.ok){location.reload();return}said.textContent=(await res.json()).message}catch{said.textContent="The page can't reach the server. Try again."}said.className='bad'});
`;

const FONTS = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&amp;display=swap';

function shell(title, head, body, script = '', extraStyle = '') {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<script>document.documentElement.className='js'</script>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${STYLE}${extraStyle}</style></head>
<body>${head}${body}${script ? `<script>${script}</script>` : ''}</body></html>`;
}

export function renderPage(data, signOut = false) {
  const [top, rest] = renderLive(data).split(SPLIT);
  const out = signOut ? '<button class="quiet" type="button" data-signout="1">Sign out</button>' : '';
  const nav = '<nav aria-label="On this page"><a href="#ask">Give a task</a><a href="#map-h">The wiring</a><a href="#how-h">How it works</a></nav>';
  const bar = `<header class="top"><div class="plate"><span class="kick">Control room</span><b>AI sales team</b></div>${nav}<div class="tools">${renderUsage(data.usage)}${out}</div></header>`;
  return shell('Sales team', bar, `<main><div id="hero">${top}</div><div class="body">${TASK_BOX}<div id="live">${rest}</div></div>${renderWalkthrough()}</main>`, SCRIPT, ART_STYLE);
}

// Shows nothing about the team, because anyone on the internet can reach it.
export const renderSignIn = () =>
  shell(
    'Sign in',
    '',
    `<main class="signin"><div class="art">${signInArt()}</div><div class="ticket"><span class="kick">Control room</span><h1>AI sales team</h1><form id="signin"><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Sign in</button><p id="said" role="status"></p></form></div></main>`,
    SIGN_IN_SCRIPT,
  );

export function renderView(root, file) {
  if (!VIEWABLE.test(file) || !existsSync(join(root, file))) return null;
  const text = read(root, file);
  const fm = frontmatter(text);
  const banner = fm?.status ? `<p class="banner">${escapeHtml(fm.status[0].toUpperCase() + fm.status.slice(1))}.</p>` : '';
  const head = `<header class="top"><div class="plate"><span class="kick">Control room</span><b>AI sales team</b></div><nav><a href="/">Back to the team</a></nav></header>`;
  return shell(file.split('/').pop(), head, `<main class="doc">${banner}${renderMarkdown(text, file)}</main>`);
}

// ---- the server ------------------------------------------------------------------------------

const CSP = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const isLocal = (host) => /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host || '');
// `site` is the public name when the page is online behind HTTPS.
const goodHost = (host, site) => (site ? host === site : isLocal(host));
export const sameSite = ({ host, origin, marker, site }) => goodHost(host, site) && origin === (site ? `https://${site}` : `http://${host}`) && marker === '1';

export function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 32).toString('hex')}`;
}

export function checkPassword(password, stored) {
  const [kind, salt, hash] = stored.split(':');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  return timingSafeEqual(scryptSync(String(password), Buffer.from(salt, 'hex'), 32), Buffer.from(hash, 'hex'));
}

// Sessions live in memory, so a restart signs everyone out. Wrong passwords lock one address after
// MAX_TRIES and every address after MAX_TRIES_ALL, so a password can't be guessed by brute force.
export function createAuth(stored, clock = Date.now) {
  const sessions = new Map();
  const tries = new Map();
  let all = { count: 0, since: 0 };
  const fresh = (entry) => (clock() - entry.since < LOCK_MS ? entry : { count: 0, since: clock() });
  return {
    signIn(password, address) {
      all = fresh(all);
      const mine = fresh(tries.get(address) ?? { count: 0, since: 0 });
      if (mine.count >= MAX_TRIES || all.count >= MAX_TRIES_ALL) return { locked: true };
      if (!checkPassword(password, stored)) {
        if (tries.size > 10_000) tries.clear();
        tries.set(address, { ...mine, count: mine.count + 1 });
        all = { ...all, count: all.count + 1 };
        return {};
      }
      tries.delete(address);
      const token = randomBytes(32).toString('hex');
      sessions.set(token, clock() + SESSION_MS);
      return { token };
    },
    valid(token) {
      if (!token || !sessions.has(token)) return false;
      if (sessions.get(token) > clock()) return true;
      sessions.delete(token);
      return false;
    },
    signOut: (token) => sessions.delete(token),
  };
}

const cookieHeader = (value, site, age) => `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${site ? '; Secure' : ''}`;
const readCookie = (header) => new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]+)`).exec(header || '')?.[1];

function jarvis(root, ...args) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
  return spawnSync(process.execPath, [join(root, 'scripts', 'jarvis.mjs'), ...args], { cwd: root, env, encoding: 'utf8', windowsHide: true });
}

// Starts a queue run. It stays attached to this console: on Windows, a process with no console
// can't start the agent's own child processes.
export function startRun(root) {
  if (runAlive(root)) return false;
  mkdirSync(join(root, 'ops', 'runs'), { recursive: true });
  const log = openSync(join(root, 'ops', 'runs', 'dashboard-run.log'), 'a');
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
  const child = spawn(process.execPath, [join(root, 'scripts', 'jarvis.mjs'), 'run'], { cwd: root, env, stdio: ['ignore', log, log], windowsHide: true });
  closeSync(log);
  child.on('error', () => undefined);
  child.unref();
  return true;
}

// Puts a task on the Jarvis queue as plain text (never through a shell). Returns { id } or { error }.
export function addTask(root, task) {
  const added = jarvis(root, 'add', task);
  const id = /^Queued (J-\d+-\d+):/m.exec(added.stdout || '')?.[1];
  return added.status === 0 && id ? { id } : { error: (added.stderr || 'no reason given').trim().slice(0, 200) };
}

// Starts the queue unless the plan's usage guard says to wait. Returns { full } (the window that is
// full, if any) and { started } (false when a run was already going or the guard held it back).
export function startQueued(root) {
  const full = planUsage(root)?.full;
  return full ? { full, started: false } : { full: undefined, started: startRun(root) };
}

// A POST from the page. The Origin and custom header keep other websites from reaching it.
export function act(root, path, { host, origin, marker, body, site }) {
  const reply = (status, message, extra = {}) => ({ status, type: 'json', body: JSON.stringify({ message, ...extra }) });
  if (!sameSite({ host, origin, marker, site })) return reply(403, 'Use the team page itself.');
  const full = planUsage(root)?.full;
  const start = (id) => {
    if (full) return reply(200, `${id} is queued. It can't start until the plan's ${full} window resets.`, { id });
    return reply(200, startRun(root) ? `${id} is starting.` : `${id} is queued, and starts after the current task.`, { id });
  };
  if (path === '/tasks') {
    let task;
    try {
      task = String(JSON.parse(body || '{}').task ?? '').trim();
    } catch {
      return reply(400, 'That request could not be read.');
    }
    if (!task) return reply(400, 'Write a task first.');
    if (task.length > MAX_TASK) return reply(400, `Keep the task under ${MAX_TASK} characters.`);
    const added = addTask(root, task);
    return added.id ? start(added.id) : reply(500, `The task wasn't queued: ${added.error}`);
  }
  if (path === '/run') {
    if (full) return reply(409, `Tasks can't start until the plan's ${full} window resets.`);
    return reply(200, startRun(root) ? 'Starting the waiting tasks.' : 'A run is already going.');
  }
  const cancel = /^\/tasks\/(J-\d{8}-\d+)\/cancel$/.exec(path);
  if (cancel) {
    const done = jarvis(root, 'cancel', cancel[1]);
    return done.status === 0 ? reply(200, `Cancelled ${cancel[1]}.`) : reply(409, (done.stderr || 'It could not be cancelled.').trim().slice(0, 200));
  }
  return reply(404, 'Page not found.');
}

export function handle(root, method, rawUrl, host, { site, signOut } = {}) {
  if (method !== 'GET') return { status: 405, body: 'Use GET.' };
  if (!goodHost(host, site)) return { status: 403, body: 'Open this page at its own address.' };
  const url = new URL(rawUrl, 'http://127.0.0.1');
  if (url.pathname === '/') return { status: 200, body: renderPage(collect(root), signOut) };
  if (url.pathname === '/live') return { status: 200, body: renderLive(collect(root)) };
  if (url.pathname === '/view') {
    const page = renderView(root, url.searchParams.get('file') || '');
    return page ? { status: 200, body: page } : { status: 404, body: 'That file is not available here.' };
  }
  return { status: 404, body: 'Page not found. Go to / for the team page.' };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--once')) {
    process.stdout.write(renderPage(collect()));
    return;
  }
  if (args.includes('--hash')) {
    const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '');
    if (password.length < 12) {
      console.error('Use a password of at least 12 characters.');
      process.exit(1);
    }
    console.log(hashPassword(password));
    return;
  }
  const site = process.env.TEAM_PAGE_HOST || null;
  const stored = process.env.TEAM_PAGE_PASSWORD_HASH || null;
  if (site && !stored?.startsWith('scrypt:')) {
    console.error('TEAM_PAGE_HOST needs TEAM_PAGE_PASSWORD_HASH: the page must not go online without a sign-in. Make one with --hash.');
    process.exit(1);
  }
  const auth = stored ? createAuth(stored) : null;
  const flag = args.indexOf('--port');
  const port = flag >= 0 ? Number(args[flag + 1]) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 0) {
    console.error('Usage: node scripts/dashboard.mjs [--port <number>] [--once]');
    process.exit(1);
  }
  const send = (res, { status, body, type, cookie }) => {
    const kind = type === 'json' ? 'application/json' : `text/${status === 200 ? 'html' : 'plain'}`;
    const headers = { 'Content-Type': `${kind}; charset=utf-8`, 'Content-Security-Policy': CSP, 'Cache-Control': 'no-store' };
    res.writeHead(status, cookie ? { ...headers, 'Set-Cookie': cookie } : headers);
    res.end(body);
  };
  const json = (status, message, cookie) => ({ status, type: 'json', body: JSON.stringify({ message }), cookie });
  const server = createServer((req, res) => {
    const token = readCookie(req.headers.cookie);
    const signedIn = !auth || auth.valid(token);
    const path = (req.url || '/').split('?')[0];
    if (req.method !== 'POST') {
      try {
        if (signedIn) send(res, handle(ROOT, req.method, req.url, req.headers.host, { site, signOut: !!auth }));
        else if (!goodHost(req.headers.host, site)) send(res, { status: 403, body: 'Open this page at its own address.' });
        else if (path === '/live') send(res, { status: 401, body: 'Sign in first.' });
        else send(res, { status: 200, body: renderSignIn() });
      } catch (error) {
        send(res, { status: 500, body: `The page couldn't be built: ${error.message}` });
      }
      return;
    }
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) req.destroy();
    });
    req.on('end', () => {
      try {
        const from = { host: req.headers.host, origin: req.headers.origin, marker: req.headers['x-team-page'], body, site };
        if (auth && (path === '/login' || path === '/logout') && !sameSite(from)) send(res, json(403, 'Use the team page itself.'));
        else if (auth && path === '/login') {
          let password = '';
          try {
            password = String(JSON.parse(body || '{}').password ?? '');
          } catch {
            // an unreadable request counts as a wrong password
          }
          // nginx sets X-Real-IP; a value sent by the caller only counts when the page is behind it.
          const result = auth.signIn(password, (site && req.headers['x-real-ip']) || req.socket.remoteAddress);
          if (result.token) send(res, json(200, 'Signed in.', cookieHeader(result.token, site, SESSION_MS / 1000)));
          else send(res, json(result.locked ? 429 : 401, result.locked ? 'Too many tries. Wait 15 minutes and try again.' : 'That password is wrong.'));
        } else if (auth && path === '/logout') {
          auth.signOut(token);
          send(res, json(200, 'Signed out.', cookieHeader('', site, 0)));
        } else if (!signedIn) send(res, json(401, 'Sign in first.'));
        else send(res, act(ROOT, path, from));
      } catch (error) {
        send(res, { status: 500, type: 'json', body: JSON.stringify({ message: `That didn't work: ${error.message}` }) });
      }
    });
  });
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Pick another with --port.` : error.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => console.log(`Team page: http://127.0.0.1:${server.address().port}`));
}

if (isMain(import.meta.url)) main();
