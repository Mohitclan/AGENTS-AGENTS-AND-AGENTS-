#!/usr/bin/env node
// A page for running the team: give it a task, watch it work, read the result. It's built from the
// repo's own files on every load and only listens on this computer. Its only actions go through
// jarvis.mjs (add, run, cancel), so sends and other outside actions still wait in ops/approvals.md.
//
//   node scripts/dashboard.mjs              serve it at http://127.0.0.1:4317
//   node scripts/dashboard.mjs --port 5000  on another port
//   node scripts/dashboard.mjs --once       print the page and exit
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, fstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatter, ROOT } from './_shared.mjs';

const DEFAULT_PORT = 4317;
const REACHED = ['new', 'qualified', 'drafted', 'approved', 'contacted', 'replied', 'meeting', 'trial', 'won'];
const TASK_LABEL = { needs_approval: 'Needs a yes', needs_input: 'Needs an answer', done: 'Done', running: 'Running', queued: 'Queued', failed: 'Failed', blocked: 'Blocked', check: 'Check the report' };
const STOP_AT = Number(process.env.JARVIS_STOP_AT || 0.85);
const MAX_TASK = 2000;
const MAX_BODY = 16 * 1024;
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
  return {
    leads,
    tasks,
    running: running && { ...running, steps: recentSteps(root, running.id) },
    runAlive: runAlive(root),
    queued: tasks.filter((t) => t.status === 'queued').reverse(),
    pending,
    sends: pending.filter((a) => /^send /i.test(a.action)),
    others: pending.filter((a) => !/^send /i.test(a.action)),
    agents: loadAgents(root),
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
    <li class="gate"><div class="arm" aria-hidden="true"></div><div><strong>${data.sends.length}</strong><span>sends need a person's yes</span>${data.senderBlank ? '<small>Sender details are still blank</small>' : ''}</div></li>
    <li class="stop after"><strong>${contacted}</strong><span>contacted</span><small>Agents can't send</small></li>
  </ol>
</section>`;
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
  return `<section aria-labelledby="yes"><h2 id="yes">Waiting for a person</h2>
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
export const renderLive = (data) =>
  [renderLine(data), SPLIT, renderNow(data), `<div class="two">`, renderTasks(data), renderLeads(data), `</div>`, renderTeam(data), renderApprovals(data)].join('\n');

const TASK_BOX = `<section class="ask"><form id="ask">
<label for="task">Give the team a task</label>
<div class="askrow"><textarea id="task" rows="2" maxlength="${MAX_TASK}" required></textarea><button type="submit">Start task</button></div>
<p class="note">Keep it small: one broad task can use a whole 5-hour window. Nothing leaves this computer without a person's yes.</p>
<p id="said" role="status"></p>
</form></section>`;

const STYLE = `
:root{--ink:#14283c;--muted:#51636f;--paper:#eef3f4;--panel:#fff;--rail:#0f3d5e;--rail-soft:#8fc1de;--stop:#c2331d;--amber:#f2b63c;--go:#2a7a58;--rule:#cbd8dd}
*{box-sizing:border-box}
button{font:700 1rem "Atkinson Hyperlegible",system-ui,sans-serif;background:var(--rail);color:#fff;border:0;border-radius:4px;padding:.55rem 1.1rem;cursor:pointer}
button:hover{background:#17557f}
button.quiet{background:none;color:var(--stop);padding:0 .3rem;text-decoration:underline;font-weight:400}
button:disabled{opacity:.55;cursor:wait}
textarea{font:inherit;color:inherit;width:100%;padding:.55rem .7rem;border:2px solid var(--rail);border-radius:4px;background:#fff;resize:vertical}
button:focus-visible,textarea:focus-visible{outline:3px solid var(--amber);outline-offset:2px}
body{margin:0;background:var(--paper);color:var(--ink);font:400 1.0625rem/1.5 "Atkinson Hyperlegible",system-ui,sans-serif}
h1,h2,h3,.stop strong,.gate strong{font-family:"Bricolage Grotesque",system-ui,sans-serif}
a{color:var(--rail);text-underline-offset:.15em}
a:focus-visible,summary:focus-visible{outline:3px solid var(--amber);outline-offset:2px}
code{font-size:.92em;background:#dfe9ec;padding:.08em .35em;border-radius:3px}
.top{background:var(--rail);color:#dbe9f1;display:flex;flex-wrap:wrap;gap:.25rem 2rem;justify-content:space-between;align-items:baseline;padding:1rem clamp(1rem,4vw,3.5rem) 0}
.top b{color:#fff;font:700 1.15rem "Bricolage Grotesque",system-ui,sans-serif}
.top a{color:#fff}
.usage{margin:0;font-size:.95rem}
.hero{background:var(--rail);color:#fff;padding:1.75rem clamp(1rem,4vw,3.5rem) 2.5rem}
.hero h1{font-size:clamp(1.8rem,3.5vw,3rem);line-height:1.08;font-weight:700;letter-spacing:-.015em;margin:0 0 2.75rem;max-width:26em}
.line{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr 1.3fr 1.2fr .8fr;gap:0}
.stop{position:relative;border-top:6px solid var(--rail-soft);padding:1.1rem 1.25rem 0 0}
.stop::before{content:"";position:absolute;top:-14px;left:0;width:22px;height:22px;border-radius:50%;background:#fff;border:5px solid var(--rail-soft)}
.stop.after{border-top-style:dashed;border-top-color:#5f8199}
.stop.after::before{background:var(--rail);border-color:#5f8199}
.stop strong,.gate strong{display:block;font-size:clamp(3rem,6vw,5.25rem);line-height:1;font-weight:800}
.stop span,.gate span{display:block;font-size:1.05rem;margin-top:.2rem}
.stop small,.gate small{display:block;color:#bcd3e0;font-size:.95rem}
.chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.7rem}
.chip{background:#fff;color:var(--ink);padding:.12rem .55rem;border-radius:4px;font-size:.95rem;text-decoration:none;white-space:nowrap}
a.chip:hover{background:var(--amber)}
.chip em{font-style:normal;color:var(--muted)}
.gate{position:relative;display:flex;gap:1.1rem;border-top:6px solid var(--rail-soft);padding:1.1rem 1.25rem 0 0}
.arm{flex:none;width:20px;margin-top:-3.6rem;align-self:stretch;border-radius:4px;background:repeating-linear-gradient(-45deg,#fff 0 15px,var(--stop) 15px 30px);box-shadow:0 0 0 2px var(--rail)}
.arm::before{content:"";display:block;width:26px;height:26px;margin:-22px 0 0 -3px;border-radius:50%;background:var(--stop);border:4px solid #fff}
.gate strong{color:var(--amber)}
.body{padding:0 clamp(1rem,4vw,3.5rem) 3rem;max-width:1500px;margin:0 auto}
.ask{margin-top:1.75rem}
.ask label{display:block;font:700 1.75rem/1.2 "Bricolage Grotesque",system-ui,sans-serif;margin-bottom:.6rem}
.askrow{display:flex;gap:.75rem;align-items:stretch}
.askrow button{flex:none}
.ask .note{margin:.5rem 0 0}
#said{margin:.35rem 0 0;font-weight:700;color:var(--go)}
#said:empty{display:none}
#said.bad,.bad{color:var(--stop);font-weight:700}
.now .next{margin-top:.6rem}.now .bad{margin:.5rem 0}.now>button{margin-top:.6rem}
.now{margin:1.5rem 0 0;padding:.9rem 1.1rem;background:var(--panel);border-left:6px solid var(--go)}
.now.idle{border-left-color:var(--rule)}
.now p{margin:0}.now ul{margin:.5rem 0 0;padding-left:1.6rem;color:var(--muted)}
.now small{color:var(--muted)}
.dot{display:inline-block;width:.7em;height:.7em;border-radius:50%;background:var(--rule);margin-right:.5em}
.dot.on{background:var(--go);animation:pulse 1.4s infinite}
@keyframes pulse{50%{opacity:.3}}
.two{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,8fr);gap:0 3.5rem}
h2{font-size:1.75rem;font-weight:700;margin:2.5rem 0 .75rem;letter-spacing:-.01em}
h3{font-size:1.1rem;font-weight:700;margin:0}
.note{color:var(--muted);margin:-.4rem 0 .9rem}
.tasks{list-style:none;margin:0;padding:0}
.tasks li{display:grid;grid-template-columns:8.2rem 1fr;gap:.75rem;padding:.42rem 0;border-top:1px solid var(--rule)}
.st{font-size:.92rem;color:var(--muted)}
.st.needs_approval,.st.needs_input{color:#8a5a00;font-weight:700}
.st.done{color:var(--go);font-weight:700}
.st.running{color:var(--go);font-weight:700}
.st.failed,.st.blocked{color:var(--stop);font-weight:700}
.wide{overflow-x:auto}
table{border-collapse:collapse;width:100%}
th,td{text-align:left;vertical-align:top;padding:.42rem .9rem .42rem 0;border-top:1px solid var(--rule)}
thead th{font-size:.92rem;font-weight:400;color:var(--muted);border-top:0}
.num{white-space:nowrap}
td:last-child{white-space:nowrap;padding-right:0}
.hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
details{margin-top:.75rem}summary{cursor:pointer;color:var(--muted)}
.team{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(19rem,1fr));gap:1.25rem 2.5rem}
.team h3{text-transform:capitalize}
.team p{margin:.1rem 0}.team small{color:var(--muted)}
.team li:nth-child(-n+2) h3{color:var(--rail);font-size:1.3rem}
.split{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,8fr);gap:1rem 3.5rem}
.plainlist{margin:.4rem 0 0;padding-left:1.1rem}
.doc{max-width:56rem;margin:0 auto;padding:1.5rem clamp(1rem,4vw,2rem) 4rem}
.doc h2{font-size:2rem;margin-top:2rem}.doc h3{font-size:1.3rem;margin-top:1.75rem}.doc h4{margin:1.25rem 0 .25rem}
.doc pre{background:#fff;padding:.9rem;overflow-x:auto;white-space:pre-wrap}
.doc blockquote{margin:1rem 0;padding:.25rem 1rem;border-left:5px solid var(--rail-soft);background:#fff}
.doc li{margin:.2rem 0}
.banner{background:#fff5dc;border-left:6px solid var(--amber);padding:.7rem 1rem;margin:1rem 0}
mark{background:var(--amber);color:var(--ink);padding:0 .25em;border-radius:3px}
@media (max-width:900px){
.line{grid-template-columns:1fr}
.stop,.gate{border-top:0;border-left:6px solid var(--rail-soft);padding:.25rem 0 1.5rem 1.4rem}
.stop::before{top:0;left:-14px}
.stop.after{border-top:0;border-left-style:dashed;border-left-color:#5f8199}
.arm{width:auto;height:20px;margin:0;position:absolute;left:-16px;top:-14px;right:30%;align-self:auto}
.arm::before{display:none}
.gate{padding-top:1.1rem}
.two,.split{grid-template-columns:minmax(0,1fr)}
.tasks li{grid-template-columns:1fr;gap:0}
}
@media (prefers-reduced-motion:reduce){.dot.on{animation:none}}
`;

const SCRIPT = `
const hero=document.getElementById('hero'),live=document.getElementById('live'),said=document.getElementById('said');
const form=document.getElementById('ask'),box=document.getElementById('task');
let last='';
async function refresh(){try{const html=await (await fetch('/live')).text();if(html===last)return;last=html;
const [top,rest]=html.split('${SPLIT}');const open=live.querySelector('details')?.open;
hero.innerHTML=top;live.innerHTML=rest;if(open)live.querySelector('details').open=true}catch{}}
async function post(path,body){const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Team-Page':'1'},body:JSON.stringify(body||{})});
const out=await res.json();said.textContent=out.message;said.className=res.ok?'':'bad';refresh();return res.ok}
form.addEventListener('submit',async(e)=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;
try{if(await post('/tasks',{task:box.value}))box.value=''}catch{said.textContent="The page can't reach the server. Check that dashboard.mjs is still running.";said.className='bad'}button.disabled=false});
box.addEventListener('keydown',(e)=>{if(e.key==='Enter'&&e.ctrlKey)form.requestSubmit()});
document.addEventListener('click',(e)=>{const b=e.target.closest('button');if(!b)return;
if(b.dataset.run)post('/run');if(b.dataset.cancel)post('/tasks/'+b.dataset.cancel+'/cancel')});
setInterval(refresh,3000);
`;

function shell(title, head, body, script = '') {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap">
<style>${STYLE}</style></head>
<body>${head}${body}${script ? `<script>${script}</script>` : ''}</body></html>`;
}

export function renderPage(data) {
  const [top, rest] = renderLive(data).split(SPLIT);
  return shell('Sales team', `<header class="top"><b>AI sales team</b>${renderUsage(data.usage)}</header>`, `<main><div id="hero">${top}</div><div class="body">${TASK_BOX}<div id="live">${rest}</div></div></main>`, SCRIPT);
}

export function renderView(root, file) {
  if (!VIEWABLE.test(file) || !existsSync(join(root, file))) return null;
  const text = read(root, file);
  const fm = frontmatter(text);
  const banner = fm?.status ? `<p class="banner">${escapeHtml(fm.status[0].toUpperCase() + fm.status.slice(1))}.</p>` : '';
  const head = `<header class="top" style="padding-bottom:1rem"><a href="/">Back to the team</a></header>`;
  return shell(file.split('/').pop(), head, `<main class="doc">${banner}${renderMarkdown(text, file)}</main>`);
}

// ---- the server ------------------------------------------------------------------------------

const CSP = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'";

const isLocal = (host) => /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host || '');

function jarvis(root, ...args) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
  return spawnSync(process.execPath, [join(root, 'scripts', 'jarvis.mjs'), ...args], { cwd: root, env, encoding: 'utf8', windowsHide: true });
}

// Starts a queue run. It stays attached to this console: on Windows, a process with no console
// can't start the agent's own child processes.
function startRun(root) {
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

// A POST from the page. The Origin and custom header keep other websites from reaching it.
export function act(root, path, { host, origin, marker, body }) {
  const reply = (status, message, extra = {}) => ({ status, type: 'json', body: JSON.stringify({ message, ...extra }) });
  if (!isLocal(host) || origin !== `http://${host}` || marker !== '1') return reply(403, 'Use the page on this computer.');
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
    const added = jarvis(root, 'add', task);
    const id = /^Queued (J-\d+-\d+):/m.exec(added.stdout || '')?.[1];
    return added.status === 0 && id ? start(id) : reply(500, `The task wasn't queued: ${(added.stderr || 'no reason given').trim().slice(0, 200)}`);
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

export function handle(root, method, rawUrl, host) {
  if (method !== 'GET') return { status: 405, body: 'Use GET.' };
  if (!isLocal(host)) return { status: 403, body: 'Open this page on the computer running it.' };
  const url = new URL(rawUrl, 'http://127.0.0.1');
  if (url.pathname === '/') return { status: 200, body: renderPage(collect(root)) };
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
  const flag = args.indexOf('--port');
  const port = flag >= 0 ? Number(args[flag + 1]) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 0) {
    console.error('Usage: node scripts/dashboard.mjs [--port <number>] [--once]');
    process.exit(1);
  }
  const send = (res, { status, body, type }) => {
    const kind = type === 'json' ? 'application/json' : `text/${status === 200 ? 'html' : 'plain'}`;
    res.writeHead(status, { 'Content-Type': `${kind}; charset=utf-8`, 'Content-Security-Policy': CSP, 'Cache-Control': 'no-store' });
    res.end(body);
  };
  const server = createServer((req, res) => {
    if (req.method !== 'POST') {
      try {
        send(res, handle(ROOT, req.method, req.url, req.headers.host));
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
        send(res, act(ROOT, req.url, { host: req.headers.host, origin: req.headers.origin, marker: req.headers['x-team-page'], body }));
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
