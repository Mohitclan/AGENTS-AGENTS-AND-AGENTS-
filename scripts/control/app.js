// Mission control's page. One state stream from /api/stream keeps every view current; agent pages,
// logs and documents are fetched when opened. Nothing here can send an email or approve anything:
// the only actions are giving the team a task, starting waiting tasks and cancelling a queued one.
import { avatarHTML, badgeImg, mountAvatars, setAvatarStatus } from './gems/avatar.js';
import { createDock } from './gems/dock.js';
import { createGallery } from './gems/gallery.js';
import { identityFor } from './gems/identities.js';
import { playIntro } from './gems/intro.js';
import { BRAND, lockupSvg } from './gems/logo.js';
import { createDemo } from './gems/simulator.js';
import { normalizeState, STATE_LABEL } from './gems/status.js';
import { playGate } from './gems/gate.js';
import { chime, setSounds, soundsOn } from './gems/sounds.js';
import { startTour } from './gems/tour.js';
import { budgetWarning, STUCK_MIN, stuckAgents, taskBudget } from './gems/watch.js';
import { createVoice } from './gems/voice.js';
import { mountOffice } from './office3d/mount.js';
import { badgeOf, roleText } from './world/crew.js';
import { MAPS } from './world/maps.js';
import { OFFICES, officeById } from './world/offices.js';
import { createWorld3D, webgl3dAvailable } from './world/world3d.js';
import { createWorld } from './world/worldview.js';

// The agents' names and jobs as people read them. Their characters live in gems/identities.js.
const AGENTS = {
  coordinator: ['Coordinator', 'Plans and hands out the work'], evaluator: ['Evaluator', 'Reviews every deliverable'],
  'knowledge-base': ['Knowledge', 'Product and company facts'], researcher: ['Researcher', 'Markets, competitors, channels'],
  'lead-generator': ['Lead generator', 'Finds and scores leads'], outreach: ['Outreach', 'Drafts email sequences'],
  sales: ['Sales', 'Replies, calls, proposals'], marketing: ['Marketing', 'Positioning, content, launches'],
  'demo-handler': ['Demos', 'Demo plans and scripts'], 'docs-handler': ['Docs', 'Help docs and one-pagers'],
  developer: ['Developer', 'Fixes that block sales'], 'lead-scout': ['Lead scout', 'Sweeps lead sources, several at once'],
  'seo-aeo': ['SEO & AEO', 'Search and AI-answer visibility'],
  system: ['System', 'Scripts: sends, replies, checks'],
};
const look = (name) => ({ label: AGENTS[name]?.[0] || name, role: AGENTS[name]?.[1] || '' });
const face = (name) => badgeImg(name, look(name).label);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const KIND = {
  handoff: 'Hand-off', start: 'Started', result: 'Result', web: 'Web', file: 'File', read: 'Read', command: 'Command', plan: 'Plan', tool: 'Tool',
  error: 'Error', fallback: 'Backup', review: 'Review', revise: 'Sent back', blocked: 'Blocked', check: 'Copy check', send: 'Email', reply: 'Reply', lead: 'Lead', run: 'Task',
};
const STATUS = STATE_LABEL;
const TASK_STATUS = { queued: 'Queued', running: 'Running', done: 'Done', needs_approval: 'Needs a yes', needs_input: 'Needs an answer', blocked: 'Blocked', failed: 'Failed', cancelled: 'Cancelled', check: 'Check report' };
const LEAD_ORDER = ['replied', 'contacted', 'approved', 'drafted', 'qualified', 'new', 'disqualified', 'lost', 'won', 'meeting', 'trial'];
const EXAMPLES = [
  ['Lead sprint', 'Find 10 new MotionRepo leads among founder-led Indian software startups with a launch this month, with evidence, and review them.'],
  ['Draft emails', 'Draft an email sequence for every qualified MotionRepo lead with a Go, and have the evaluator review them.'],
  ['Competitor check', 'Check what changed at RepoClip and other MotionRepo competitors in the last 30 days and update the battlecard as a proposal.'],
  ['Weekly review', 'Run the weekly review: pipeline, board, knowledge, failures and what the team should do next.'],
];

const store = { snap: null, logs: null, logsAt: 0, detail: {}, seen: new Set(), primed: false, filters: { agent: '', kind: '', status: '', q: '', view: 'table', reads: false, limit: 400 } };

// ---- helpers -------------------------------------------------------------------------------------

async function api(path, body) {
  const opts = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Team-Page': '1' }, body: JSON.stringify(body) };
  const res = await fetch(path, opts);
  if (res.status === 401) {
    location.reload();
    throw new Error('Sign in first.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

function ago(iso) {
  if (!iso) return '';
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 0) return 'today'; // a file dated only by the ID in its name counts as the end of that day
  if (s < 50) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
const stamp = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function toast(message, bad = false) {
  const el = document.createElement('div');
  el.className = `toast${bad ? ' bad' : ''}`;
  el.textContent = message;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 5000);
}

const chip = (kind) => `<span class="kind k-${esc(kind)}">${esc(KIND[kind] || kind)}</span>`;
const statusChip = (s) => `<span class="pill p-${esc(s)}">${esc(TASK_STATUS[s] || STATUS[s] || s)}</span>`;
const verdictChip = (v, score) => (v ? `<span class="pill ${v === 'PASS' ? 'p-done' : 'p-failed'}">${esc(v)}${score ? ` ${score}` : ''}</span>` : '');
const fileLink = (path, label = 'Open') => (path ? `<a class="open" href="#" data-file="${esc(path)}">${esc(label)}</a>` : '');
const agentName = (name) => look(name).label;
const roster = () => store.snap?.agents ?? [];

function setMeters(root = document) {
  for (const el of $$('[data-pct]', root)) el.style.width = `${Math.max(0, Math.min(100, Number(el.dataset.pct)))}%`;
}

// ---- shell ---------------------------------------------------------------------------------------

function shell() {
  $('#app').innerHTML = `
  <aside class="side" id="side">
    <a class="brand" href="#/">${lockupSvg('brand-logo', BRAND.name)}</a>
    <nav class="nav" aria-label="Pages">
      <a href="#/offices" data-nav="offices">Offices</a>
      <a href="#/" data-nav="home">Home</a>
      <a href="#/working" data-nav="working">Working</a>
      <a href="#/team" data-nav="team">Team</a>
      <a href="#/overview" data-nav="overview">Overview</a>
      <a href="#/logs" data-nav="logs">Logs</a>
      <a href="#/leads" data-nav="leads">Leads</a>
      <a href="#/outreach" data-nav="outreach">Outreach <b class="count" id="outreach-count"></b></a>
      <a href="#/emails" data-nav="emails" class="nav-sub">Emails <b class="count" id="emails-count"></b></a>
      <a href="#/posts" data-nav="posts">Posts <b class="count" id="posts-count" title="Reviewed posts and new conversations waiting for you"></b></a>
      <a href="#/questions" data-nav="questions">Questions <b class="count" id="question-count"></b></a>
      <a href="#/reports" data-nav="reports">Reports</a>
      <a href="#/flags" data-nav="flags">Needs you <b class="count" id="flag-count"></b></a>
      <a href="#/gems" data-nav="gems">Gem gallery</a>
    </nav>
    <div class="side-h">Agents</div>
    <nav class="agents-nav" id="agents-nav" aria-label="Agents"></nav>
    <div class="side-foot" id="usage"></div>
    <button class="ghost small side-tour" id="tour-btn">Take the tour</button>
    <button class="ghost small" id="signout" hidden>Sign out</button>
  </aside>
  <main class="main">
    <header class="top">
      <button class="menu ghost" id="menu" aria-label="Open menu">☰</button>
      <div class="live" id="live"></div>
      <div class="top-run" id="top-run"></div>
      <div class="top-watch"><a class="top-stuck" id="top-stuck" hidden></a><div class="top-budget" id="top-budget" hidden></div>
        <button type="button" class="ghost small top-sound" id="sound-toggle" aria-pressed="true" title="Sounds for finished tasks, drafts to approve, questions and warnings">Sounds on</button></div>
    </header>
    <div id="view" class="view"></div>
  </main>
  <aside class="drawer" id="drawer" aria-hidden="true" aria-labelledby="drawer-title">
    <div class="drawer-head"><div><div class="kicker" id="drawer-kicker"></div><h2 id="drawer-title"></h2></div><button class="ghost" id="drawer-close" aria-label="Close">✕</button></div>
    <article class="doc" id="drawer-body"></article>
  </aside>
  <div class="scrim" id="scrim"></div>
  <button type="button" class="nav-dot" id="nav-dot" aria-label="Show the menu" aria-expanded="false" title="Menu"></button>
  <div class="nav-scrim" id="nav-scrim"></div>
  <div class="toasts" id="toasts" role="status"></div>
  <div class="tokens" id="tokens" aria-hidden="true"></div>`;

  $('#menu').addEventListener('click', () => document.body.classList.toggle('side-open'));
  $('#tour-btn').addEventListener('click', () => startTour({ force: true, navigate: (hash) => { location.hash = hash; } }));
  const sound = $('#sound-toggle');
  const paintSound = () => {
    sound.textContent = soundsOn() ? 'Sounds on' : 'Sounds off';
    sound.setAttribute('aria-pressed', String(soundsOn()));
  };
  paintSound();
  sound.addEventListener('click', () => {
    setSounds(!soundsOn());
    paintSound();
    chime('done'); // a sample, so you hear what they sound like
  });
  const setNav = (open) => {
    document.documentElement.classList.toggle('nav-open', open);
    $('#nav-dot').setAttribute('aria-expanded', String(open));
    $('#nav-dot').setAttribute('aria-label', open ? 'Hide the menu' : 'Show the menu');
  };
  $('#nav-dot').addEventListener('click', () => setNav(!document.documentElement.classList.contains('nav-open')));
  $('#nav-scrim').addEventListener('click', () => setNav(false));
  $('#scrim').addEventListener('click', closeAll);
  $('#drawer-close').addEventListener('click', closeAll);
  // The viewer can open over the project confirm dialog. Tab stays inside the viewer while it does.
  $('#drawer').addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !drawerReturn) return;
    const items = $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', $('#drawer'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (!$('#drawer').contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeAll());
  $('#signout').addEventListener('click', async () => {
    await api('/logout', {}).catch(() => undefined);
    location.reload();
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const file = a.dataset.file || (a.getAttribute('href') || '').match(/^\/view\?file=(.+)$/)?.[1];
    if (file) {
      e.preventDefault();
      openFile(decodeURIComponent(file));
    } else if (a.closest('.side')) document.body.classList.remove('side-open');
  });
}

// Set only when the viewer opens over the project confirm dialog: the element to give focus back to on close.
let drawerReturn = null;

function closeAll() {
  const wasOpen = document.body.classList.contains('drawer-open');
  document.body.classList.remove('side-open', 'drawer-open');
  document.documentElement.classList.remove('nav-open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  if (wasOpen && drawerReturn) {
    const back = drawerReturn;
    drawerReturn = null;
    if (document.contains(back)) back.focus();
  }
}

async function openFile(path) {
  if (projects.modal && !document.body.classList.contains('drawer-open')) drawerReturn = document.activeElement;
  document.body.classList.add('drawer-open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  if (drawerReturn) $('#drawer-close').focus();
  $('#drawer-title').textContent = path.split('/').pop();
  $('#drawer-kicker').textContent = 'Loading…';
  $('#drawer-body').innerHTML = '';
  try {
    const doc = await api(`/api/file?path=${encodeURIComponent(path)}`);
    $('#drawer-title').textContent = doc.title;
    $('#drawer-kicker').innerHTML = `${doc.owner ? `${face(doc.owner)} ${esc(agentName(doc.owner))} · ` : ''}${esc(stamp(doc.at))} · <code>${esc(doc.path)}</code>`;
    $('#drawer-body').innerHTML = doc.html;
    $('#drawer-body').scrollTop = 0;
  } catch (error) {
    $('#drawer-kicker').textContent = '';
    $('#drawer-body').innerHTML = `<p class="muted">${esc(error.message)}</p>`;
  }
}

function updateShell(snap) {
  $('#signout').hidden = !snap.signOut;
  $('#flag-count').textContent = snap.flags.length || '';
  const waiting = (snap.outreach?.ready || 0) + (snap.outreach?.runs || []).reduce((n, r) => n + r.ready.length, 0);
  $('#outreach-count').textContent = waiting || '';
  $('#emails-count').textContent = snap.outreach?.pending || '';
  $('#question-count').textContent = snap.questions?.open || '';
  $('#posts-count').textContent = snap.posts?.counts?.waiting || '';
  $('#live').className = `live ${snap.live ? 'on' : ''}`;
  $('#live').innerHTML = snap.live ? '<i></i>Live' : '<i></i>Idle';
  $('#top-run').innerHTML = snap.running ? `<b>${esc(snap.running.id)}</b> ${esc(snap.running.title)}` : '<span class="muted">No task running. Give the team one on the overview.</span>';
  dock.update(snap.agents);
  const nav = $('#agents-nav');
  if (nav.children.length !== snap.agents.length) {
    nav.innerHTML = snap.agents.map((a) => `<a href="#/agent/${esc(a.name)}" data-nav="agent/${esc(a.name)}" data-agent="${esc(a.name)}">${avatarHTML(a.name, { mode: 'badge', size: 'xs', status: a.status })}<span>${esc(agentName(a.name))}</span><i class="dot"></i></a>`).join('');
    mountAvatars(nav);
  }
  for (const a of snap.agents) {
    const link = nav.querySelector(`[data-agent="${CSS.escape(a.name)}"]`);
    if (!link) continue;
    link.className = `s-${normalizeState(a.status)}${link.classList.contains('active') ? ' active' : ''}`;
    setAvatarStatus($('.gem', link), a.status, { agentLabel: agentName(a.name), doing: a.doing });
    $('.dot', link).title = STATUS[normalizeState(a.status)];
  }
  const u = snap.usage;
  const meter = (label, w) => (w ? `<div class="meter-row"><span>${label}</span><span>${w.reset ? 'reset' : `${w.used}%`}</span></div><div class="meter${w.used >= 85 && !w.reset ? ' hot' : ''}"><i data-pct="${w.reset ? 0 : w.used}"></i></div>` : '');
  $('#usage').innerHTML = `<div class="side-h">Max plan</div>${u ? `${meter('5-hour', u.fiveHour)}${meter('Weekly', u.weekly)}${u.full ? `<p class="warn-text">Tasks wait: the ${esc(u.full)} window is over 85%.</p>` : ''}<p class="muted tiny">As of ${esc(ago(u.at))}</p>` : '<p class="muted tiny">Shown after the first task runs.</p>'}`;
  setMeters($('#usage'));
  markNav();
}

function markNav() {
  const key = location.hash.replace(/^#\/?/, '') || 'home';
  for (const a of $$('[data-nav]')) a.classList.toggle('active', a.dataset.nav === key);
}

// ---- projects ------------------------------------------------------------------------------------
// The Projects panel on the overview: upload a person-written knowledge.md, tick projects, give them
// work, and confirm a sheet. The server does every check; this page only asks. Confirming is typed
// by a person (their name and "confirm <slug>"), and the server records it.

const PJ_ACTIONS = [['research', 'Research'], ['leads', 'Find leads'], ['outreach', 'Draft outreach'], ['demo', 'Demo pack']];
const PJ_MAX = 5; // projects per request; the server refuses more
const PJ_MAX_BYTES = 300 * 1024; // the server's upload limit

const pjName = (p) => p.name || p.slug;
const pjActive = (p) => (p.tasks || []).filter((t) => ['queued', 'running'].includes(t.status));
// A task that is converting or updating the sheet: the server's tasks[].action is 'convert' or 'update'.
// Work tasks (research, leads, outreach, demo) and 'other' (a person's own task that names the project)
// do not count: they must never hide the confirm button.
const pjPreparing = (p) => pjActive(p).some((t) => t.action === 'convert' || t.action === 'update');
const pjPath = (dir, f) => (String(f).includes('/') ? String(f) : `${dir}/${f}`);
const pjDate = (v) => {
  if (!v) return 'not dated';
  const t = Date.parse(v);
  if (Number.isNaN(t)) return String(v);
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...(/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? { timeZone: 'UTC' } : {}) });
};
// Files shown on a card. The server sends inbox and history as [{file}], with repo-relative paths.
// The newest form is the highest version in its name (a repeat of one version ends -2, -3 ...). The server lists
// newest first, but this does not rely on the order: it takes the highest version; for two copies of one version, the
// later date; for the same day, the higher -2/-3 suffix.
const pjFormKey = (f) => {
  const m = String(f).match(/(\d{4}-\d{2}-\d{2})-v(\d+(?:\.\d+){0,2})(?:-(\d+))?\.md$/);
  return m ? { date: m[1], parts: m[2].split('.').map(Number), n: Number(m[3] || 1), v: m[2] } : null;
};
const pjNewer = (a, b) => {
  for (let i = 0; i < 3; i++) if ((a.parts[i] || 0) !== (b.parts[i] || 0)) return (a.parts[i] || 0) > (b.parts[i] || 0);
  if (a.date !== b.date) return a.date > b.date;
  return a.n > b.n;
};
const pjLatestForm = (p) => {
  let best = null;
  for (const x of p.inbox || []) {
    const file = x?.file || x;
    if (!file) continue;
    const key = pjFormKey(file);
    if (!best || !key || !best.key || pjNewer(key, best.key)) best = { file: String(file), key };
  }
  return best;
};
const pjFileLink = (file, label) => `<a class="open" href="#" data-file="${esc(file)}" title="${esc(file)}">${esc(label)}</a>`;
// The slug a form declares, if it declares one, so a card's "Upload new version" can refuse another project's form.
const pjFormSlug = (text) => text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1].match(/^slug:[ \t]*["']?([^"'\r\n#]+?)["']?[ \t]*$/m)?.[1]?.trim() || '';

const projects = {
  list: null,
  error: '',
  sel: new Set(),
  at: 0,
  loading: false,
  uploading: false,
  working: false,
  html: '',
  timer: null,
  modal: null,
  forSlug: '',
  shell() {
    projects.html = '';
    return `
    <section class="projects card" id="projects" aria-labelledby="pj-title">
      <div class="pj-head">
        <div>
          <h2 id="pj-title" tabindex="-1">Projects</h2>
          <p class="muted tiny">Upload a person-written <code>knowledge.md</code>. The team turns it into a fact sheet, and nothing is customer-ready until a person confirms it here.</p>
        </div>
        <div class="pj-up">
          <button type="button" class="primary small" id="pj-pick">Upload knowledge.md</button>
          <span class="muted tiny">or drop the file on this panel</span>
        </div>
      </div>
      <input type="file" id="pj-file" accept=".md,text/markdown,text/plain" hidden>
      <div class="pj-msg" id="pj-msg" role="status" aria-live="polite"></div>
      <div class="pj-bar" role="toolbar" aria-label="Work on the ticked projects">
        <label class="check pj-all"><input type="checkbox" id="pj-all"> Tick all</label>
        <span class="muted tiny pj-count" id="pj-count"></span>
        <span class="spacer"></span>
        ${PJ_ACTIONS.map(([a, label]) => `<button type="button" class="ghost small" data-work="${a}" aria-describedby="pj-why">${esc(label)}</button>`).join('')}
      </div>
      <p class="pj-why tiny" id="pj-why" aria-live="polite"></p>
      <div class="pj-result" id="pj-result" role="status" aria-live="polite"></div>
      <div class="pj-cards" id="pj-cards"><p class="muted">Loading projects…</p></div>
    </section>`;
  },
  bind() {
    const panel = $('#projects');
    $('#pj-pick').addEventListener('click', () => {
      projects.forSlug = '';
      $('#pj-file').click();
    });
    $('#pj-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      const slug = projects.forSlug;
      e.target.value = '';
      projects.forSlug = '';
      projects.upload(file, slug);
    });
    let depth = 0;
    panel.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      depth += 1;
      panel.classList.add('drop');
    });
    panel.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    });
    panel.addEventListener('dragleave', () => {
      depth = Math.max(0, depth - 1);
      if (!depth) panel.classList.remove('drop');
    });
    panel.addEventListener('drop', (e) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      depth = 0;
      panel.classList.remove('drop');
      if (e.dataTransfer.files.length !== 1) return projects.say('Drop one .md file at a time.', true);
      projects.upload(e.dataTransfer.files[0], '');
    });
    $('#pj-all').addEventListener('change', (e) => {
      projects.sel = new Set(e.target.checked ? (projects.list || []).map((p) => p.slug) : []);
      projects.paint();
    });
    $('.pj-bar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-work]');
      if (b) projects.work(b.dataset.work);
    });
    $('#pj-cards').addEventListener('change', (e) => {
      const box = e.target.closest('[data-pick]');
      if (!box) return;
      if (box.checked) projects.sel.add(box.dataset.pick);
      else projects.sel.delete(box.dataset.pick);
      projects.paint();
    });
    $('#pj-cards').addEventListener('click', (e) => {
      const up = e.target.closest('[data-upload]');
      if (up) {
        projects.forSlug = up.dataset.upload;
        $('#pj-file').click();
        return;
      }
      const ok = e.target.closest('[data-confirm]');
      if (ok) projects.openConfirm(ok.dataset.confirm, ok.dataset.fk);
      if (e.target.closest('[data-retry]')) projects.refresh(true);
    });
    $('#pj-result').addEventListener('click', (e) => {
      if (e.target.closest('[data-dismiss]')) $('#pj-result').innerHTML = '';
    });
    projects.paint();
    projects.refresh(true);
    clearInterval(projects.timer);
    projects.timer = setInterval(() => projects.refresh(), 15_000);
  },
  leave() {
    clearInterval(projects.timer);
    projects.timer = null;
    projects.closeModal(false);
  },
  // Called when the state stream ticks; a fetch at most every 5 seconds.
  tick() {
    if (Date.now() - projects.at > 5000) projects.refresh();
  },
  async refresh(force = false) {
    if (!$('#projects') || projects.loading) return;
    if (!force && Date.now() - projects.at < 2000) return;
    projects.loading = true;
    projects.at = Date.now();
    try {
      const list = await api('/api/projects');
      if (!Array.isArray(list)) throw new Error('The server sent something other than a project list.');
      projects.list = list;
      projects.error = '';
      const known = new Set(list.map((p) => p.slug));
      for (const s of [...projects.sel]) if (!known.has(s)) projects.sel.delete(s);
    } catch (error) {
      projects.error = error.message;
    } finally {
      projects.loading = false;
      projects.paint();
    }
  },
  say(text, bad = false) {
    const el = $('#pj-msg');
    if (!el) return toast(text, bad);
    el.textContent = text;
    el.classList.toggle('bad', bad);
  },
  picked() {
    return (projects.list || []).filter((p) => projects.sel.has(p.slug));
  },
  // Why an action is not available for the ticked projects, or '' when it is.
  reason(action) {
    const picked = projects.picked();
    const label = PJ_ACTIONS.find(([a]) => a === action)[1];
    if (!picked.length) return 'Tick a project first.';
    if (picked.length > PJ_MAX) return `Work on at most ${PJ_MAX} projects at a time. Untick ${picked.length - PJ_MAX}.`;
    const no = projects.missing(action);
    return no.length ? `${label} needs confirmed facts first. Not confirmed yet: ${no.join(', ')}.` : '';
  },
  // Names of the ticked projects the action cannot run on.
  missing(action) {
    return projects.picked().filter((p) => !p.canWork?.[action]).map(pjName);
  },
  paint() {
    const box = $('#pj-cards');
    if (!box) return;
    const list = projects.list;
    let html;
    if (!list) html = projects.error ? `<p class="bad-text">Projects could not be loaded: ${esc(projects.error)} <button type="button" class="ghost small" data-retry>Try again</button></p>` : '<p class="muted">Loading projects…</p>';
    else if (!list.length) html = '<p class="muted pj-empty">No projects yet. Upload a <code>knowledge.md</code> to start one.</p>';
    else html = list.map(projects.card).join('');
    if (html !== projects.html) {
      const key = box.contains(document.activeElement) ? document.activeElement.dataset.fk : '';
      box.innerHTML = html;
      projects.html = html;
      if (key) box.querySelector(`[data-fk="${CSS.escape(key)}"]`)?.focus();
    }
    projects.paintBar();
  },
  paintBar() {
    const picked = projects.picked();
    const total = projects.list?.length || 0;
    const all = $('#pj-all');
    all.disabled = !total;
    all.checked = total > 0 && picked.length === total;
    all.indeterminate = picked.length > 0 && picked.length < total;
    $('#pj-count').textContent = picked.length ? `${picked.length} ticked${picked.length > PJ_MAX ? ` (most ${PJ_MAX} at a time)` : ''}` : total ? 'Tick the projects to work on' : '';
    // Buttons that are grey for the same projects share one sentence. One visible line says why;
    // screen readers hear it through aria-describedby.
    const why = new Map();
    for (const b of $$('[data-work]', $('#projects'))) {
      const reason = projects.reason(b.dataset.work);
      b.setAttribute('aria-disabled', String(!!reason));
      b.title = reason;
      const no = projects.missing(b.dataset.work).join(', ');
      if (no && picked.length <= PJ_MAX) why.set(no, [...(why.get(no) || []), b.textContent]);
    }
    $('#pj-why').textContent = picked.length > PJ_MAX ? projects.reason('research') : [...why].map(([no, labels]) => `${labels.join(', ')}: need confirmed facts first. Not confirmed yet: ${no}.`).join(' ');
  },
  card(p) {
    const preparing = pjPreparing(p);
    const update = p.pendingUpdate;
    const needsConfirm = !preparing && (!!update || p.status === 'proposed');
    const chips = [];
    if (p.status === 'confirmed') chips.push(['ok', 'Ready']);
    else if (p.status === 'proposed') chips.push(preparing ? ['info', 'Being prepared'] : ['warn', 'Waiting for your confirm']);
    else chips.push(['', p.status || 'Unknown']);
    if (update) chips.push(['warn', `Update v${update.version} waiting`]);
    else if (preparing && p.status === 'confirmed') chips.push(['info', 'Update being prepared']);
    const history = (p.history || []).map((h) => h?.file || h).filter(Boolean);
    const hist = history.length;
    const form = pjLatestForm(p);
    const tasks = pjActive(p).slice(0, 2);
    const web = /^https?:\/\//i.test(p.website || '') ? `<a href="${esc(p.website)}" target="_blank" rel="noopener noreferrer">${esc(p.website.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''))}</a>` : '<span class="muted">no website</span>';
    const sel = projects.sel.has(p.slug);
    return `<article class="pj-card${sel ? ' on' : ''}" data-slug="${esc(p.slug)}" data-fk="card:${esc(p.slug)}" tabindex="-1" aria-label="${esc(pjName(p))}">
      <div class="pj-top">
        <label class="pj-pick"><input type="checkbox" class="pj-sel" data-pick="${esc(p.slug)}" data-fk="pick:${esc(p.slug)}" ${sel ? 'checked' : ''}><span class="sr">Tick </span><b>${esc(pjName(p))}</b></label>
        <code>${esc(p.slug)}</code>
      </div>
      <div class="pj-chips">${chips.map(([tone, text]) => `<span class="pj-chip ${tone}">${esc(text)}</span>`).join('')}</div>
      <dl class="pj-meta">
        <div><dt>Version</dt><dd>${p.version ? `v${esc(p.version)}` : 'no form yet'}</dd></div>
        <div><dt>Updated</dt><dd>${esc(pjDate(p.lastUpdated))}</dd></div>
        <div><dt>Latest form</dt><dd>${form ? pjFileLink(form.file, form.key ? `v${form.key.v}, ${form.key.date}` : form.file.split('/').pop()) : '<span class="muted">none</span>'}</dd></div>
        <div><dt>History</dt><dd>${hist} earlier ${hist === 1 ? 'version' : 'versions'}${hist ? `<ul class="pj-hist">${history.map((h) => `<li>${pjFileLink(h, h.split('/').pop().replace(/\.md$/, ''))}</li>`).join('')}</ul>` : ''}</dd></div>
        <div><dt>Website</dt><dd>${web}</dd></div>
      </dl>
      ${tasks.length ? `<ul class="pj-tasks">${tasks.map((t) => `<li><code>${esc(t.id)}</code> ${esc(t.action || 'prepare')} ${esc(TASK_STATUS[t.status] || t.status).toLowerCase()}</li>`).join('')}</ul>` : ''}
      <div class="pj-acts">
        ${needsConfirm ? `<button type="button" class="primary small" data-confirm="${esc(p.slug)}" data-fk="confirm:${esc(p.slug)}">${update ? `Review update v${esc(update.version)}` : 'Review and confirm'}</button>` : ''}
        <button type="button" class="ghost small" data-upload="${esc(p.slug)}" data-fk="upload:${esc(p.slug)}" ${projects.uploading ? 'aria-disabled="true"' : ''}>Upload new version</button>
      </div>
    </article>`;
  },
  async upload(file, slug) {
    if (!file) return;
    if (projects.uploading) return projects.say('An upload is still running. Wait a moment.', true);
    if (!/\.md$/i.test(file.name)) return projects.say(`${file.name} is not a .md file. Use the project knowledge form saved as markdown.`, true);
    if (file.size > PJ_MAX_BYTES) return projects.say(`${file.name} is over 300 KB. The form should be far smaller; check the right file was picked.`, true);
    let content;
    try {
      content = await file.text();
    } catch {
      return projects.say(`Could not read ${file.name}.`, true);
    }
    if (!content.startsWith('---')) return projects.say(`${file.name} does not start with a "---" line, so it is not the project knowledge form. Nothing was uploaded.`, true);
    const declared = pjFormSlug(content);
    if (slug && declared && declared !== slug) return projects.say(`This form says its slug is "${declared}", not "${slug}". Nothing was uploaded.`, true);
    projects.uploading = true;
    projects.say(`Uploading ${file.name}…`);
    try {
      const r = await api('/api/projects/upload', { filename: file.name, content });
      const note = r.slug && slug && r.slug !== slug ? ` It was saved as "${r.slug}", not "${slug}".` : '';
      const wait = r.kind === 'new' ? ' The card appears here once the team has written the draft sheet.' : '';
      projects.say(`${r.message || (r.kind === 'update' ? `Update to v${r.version} received.` : `New project received, v${r.version}.`)}${r.taskId ? ` Task ${r.taskId} is queued.` : ''}${wait}${note}`);
      toast(r.message || 'Form uploaded.');
    } catch (error) {
      projects.say(error.message, true);
      toast(error.message, true);
    } finally {
      projects.uploading = false;
      projects.refresh(true);
    }
  },
  async work(action) {
    const reason = projects.reason(action);
    if (reason) return toast(reason, true);
    if (projects.working) return;
    projects.working = true;
    const slugs = projects.picked().map((p) => p.slug);
    const name = (s) => pjName((projects.list || []).find((p) => p.slug === s) || { slug: s });
    const out = $('#pj-result') || document.createElement('div'); // the page may have changed while the request ran
    try {
      const r = await api('/api/projects/work', { slugs, action });
      const queued = r.queued || [];
      const refused = r.refused || [];
      out.innerHTML = `<div class="pj-res">
        <p>${esc(r.message || '')}</p>
        ${queued.length ? `<p class="tiny"><b>Queued</b></p><ul>${queued.map((q) => `<li>${esc(name(q.slug))} <code>${esc(q.taskId)}</code></li>`).join('')}</ul>` : ''}
        ${refused.length ? `<p class="tiny"><b>Refused</b></p><ul class="bad-text">${refused.map((q) => `<li>${esc(name(q.slug))}: ${esc(q.reason)}</li>`).join('')}</ul>` : ''}
        <button type="button" class="ghost small" data-dismiss>Dismiss</button></div>`;
      toast(r.message || `${queued.length} queued, ${refused.length} refused.`, !queued.length);
    } catch (error) {
      out.innerHTML = `<div class="pj-res bad"><p>${esc(error.message)}</p><button type="button" class="ghost small" data-dismiss>Dismiss</button></div>`;
      toast(error.message, true);
    } finally {
      projects.working = false;
      projects.refresh(true);
    }
  },
  // ---- the confirm dialog
  openConfirm(slug, openerKey) {
    const p = (projects.list || []).find((x) => x.slug === slug);
    if (!p || projects.modal) return;
    const kind = p.pendingUpdate ? 'update' : 'new';
    const file = kind === 'update' ? pjPath('knowledge/proposals', p.pendingUpdate.file) : `knowledge/products/${p.slug}.md`;
    const changes = kind === 'update' && p.pendingUpdate.changes ? pjPath('knowledge/proposals', p.pendingUpdate.changes) : '';
    const phrase = `confirm ${p.slug}`;
    // The hash of the text on disk when this dialog opened. The server confirms only that text, so a change after
    // the person started reading ends in a 409 and not in a confirm of something they never saw.
    const sha256 = kind === 'update' ? p.pendingUpdate.sha256 : p.sha256;
    let stale = false;
    const el = document.createElement('div');
    el.className = 'pj-modal';
    el.innerHTML = `<div class="pj-dialog" role="dialog" aria-modal="true" aria-labelledby="pj-m-title" aria-describedby="pj-m-desc">
      <h2 id="pj-m-title">${kind === 'update' ? `Confirm update v${esc(p.pendingUpdate.version)} of ${esc(pjName(p))}` : `Confirm the facts for ${esc(pjName(p))}`}</h2>
      <p id="pj-m-desc"><b>Confirming makes these facts usable in customer-facing work.</b> Read the sheet first${kind === 'update' ? (changes ? ', then the list of changes' : '') : ''}.</p>
      <p><a class="open" href="#" data-file="${esc(file)}">Open ${esc(file.split('/').pop())} to review</a> <span class="muted tiny"><code>${esc(file)}</code></span></p>${changes ? `
      <p><a class="open" href="#" data-file="${esc(changes)}">Open ${esc(changes.split('/').pop())} to see what changed</a></p>` : ''}
      <form id="pj-m-form" autocomplete="off">
        <label><span>Your name</span><input id="pj-m-name" maxlength="80" required></label>
        <label><span>Type <code>${esc(phrase)}</code> to confirm</span><input id="pj-m-phrase" aria-describedby="pj-m-help" spellcheck="false" autocapitalize="off"></label>
        <p class="muted tiny" id="pj-m-help">The Confirm button turns on when your name is filled in and the words match exactly. Your name and today's date are recorded.</p>
        <p class="bad-text pj-err" id="pj-m-err" role="alert"></p>
        <div class="pj-dlg-acts"><button type="button" class="ghost" id="pj-m-cancel">Cancel</button><button type="submit" class="primary" id="pj-m-ok" disabled>Confirm</button></div>
      </form></div>`;
    document.body.append(el);
    document.documentElement.classList.add('pj-locked');
    projects.modal = { el, slug, openerKey };
    const name = $('#pj-m-name', el);
    const typed = $('#pj-m-phrase', el);
    const ok = $('#pj-m-ok', el);
    const check = () => {
      ok.disabled = stale || !(name.value.trim() && typed.value.trim() === phrase);
    };
    name.addEventListener('input', check);
    typed.addEventListener('input', check);
    $('#pj-m-cancel', el).addEventListener('click', () => projects.closeModal());
    $('#pj-m-form', el).addEventListener('submit', async (e) => {
      e.preventDefault();
      check();
      if (ok.disabled) return;
      ok.disabled = true;
      $('#pj-m-err', el).textContent = '';
      try {
        const r = await api(`/api/projects/${encodeURIComponent(slug)}/confirm`, { kind, by: name.value.trim(), phrase: typed.value.trim(), sha256 });
        toast(r.message || `${pjName(p)} confirmed.`);
        // The opener button disappears when the card re-renders as "Ready", so focus goes to the card itself
        // (its data-fk is kept across re-renders by paint()), or to the panel heading if the card is gone.
        projects.closeModal(false);
        ($(`#pj-cards [data-fk="${CSS.escape(`card:${slug}`)}"]`) || $('#pj-title'))?.focus();
      } catch (error) {
        $('#pj-m-err', el).textContent = error.message;
        check();
      } finally {
        await projects.refresh(true); // the card shows the new state either way
        // If the file is no longer the one this dialog was opened on, confirming here can only fail again: the
        // person closes the dialog and opens it again to read the new text. Cancel and the file links keep working.
        const now = (projects.list || []).find((x) => x.slug === slug);
        const current = kind === 'update' ? now?.pendingUpdate?.sha256 : now?.sha256;
        if (projects.modal?.el === el && now && current !== sha256) {
          stale = true;
          $('#pj-m-err', el).textContent = $('#pj-m-err', el).textContent || 'The file changed since you opened it. Review it again.';
          check();
        }
      }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || document.body.classList.contains('drawer-open')) return;
      const items = $$('a[href], button:not([disabled]), input:not([disabled])', el);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    name.focus();
  },
  closeModal(refocus = true) {
    const m = projects.modal;
    if (!m) return;
    m.el.remove();
    projects.modal = null;
    document.documentElement.classList.remove('pj-locked');
    if (!refocus) return;
    const opener = m.openerKey ? $(`[data-fk="${CSS.escape(m.openerKey)}"]`) : null;
    (opener || $('#pj-pick'))?.focus();
  },
};

// Escape closes the dialog, unless the file viewer is open on top of it: then Escape closes the viewer first.
// This runs in the capture phase so it sees the viewer still open, before the shell's own handler closes it.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && projects.modal && !document.body.classList.contains('drawer-open')) projects.closeModal();
}, true);

// ---- overview ------------------------------------------------------------------------------------

const overview = {
  leave() {
    projects.leave();
  },
  build() {
    $('#view').innerHTML = `
    ${projects.shell()}
    <section class="command card">
      <form id="command">
        <div class="command-h"><h1>Give the team a task</h1><p class="muted">Everything runs on its own, with no questions. Test emails go out automatically, only to Purab, Tanvi and Mohit; no prospect is contacted.</p></div>
        <label class="sr" for="task">Task</label>
        <textarea id="task" rows="3" maxlength="2000" placeholder="For example: find 10 MotionRepo leads among Indian dev-tool startups launching this month, and draft emails for the best 3"></textarea>
        <div class="command-row">
          <div class="examples">${EXAMPLES.map(([label], i) => `<button type="button" class="chip-btn" data-example="${i}">${esc(label)}</button>`).join('')}</div>
          <div class="spacer"></div>
          <button type="button" class="ghost" id="run-waiting">Start waiting tasks</button>
          <button type="submit" class="primary" id="send-task">Send to the team</button>
        </div>
      </form>
      <div class="queue" id="queue"></div>
    </section>
    <section class="kpis" id="kpis"></section>
    <div class="grid-main">
      <section class="floor-wrap card">
        <div class="sec-h"><h2>The floor</h2><span class="muted" id="floor-note"></span></div>
        <div class="floor" id="floor"></div>
      </section>
      <aside class="rail">
        <section class="card"><div class="sec-h"><h2>Needs you</h2><a href="#/flags">See all</a></div><ul class="flags" id="flags-mini"></ul></section>
        <section class="card"><div class="sec-h"><h2>Live feed</h2><a href="#/logs">All logs</a></div><ol class="feed" id="feed"></ol></section>
      </aside>
    </div>`;
    $('#command').addEventListener('submit', async (e) => {
      e.preventDefault();
      const task = $('#task').value.trim();
      if (!task) return toast('Write a task first.', true);
      $('#send-task').disabled = true;
      try {
        const r = await api('/api/tasks', { task });
        toast(r.message);
        $('#task').value = '';
      } catch (error) {
        toast(error.message, true);
      } finally {
        $('#send-task').disabled = false;
      }
    });
    $('#run-waiting').addEventListener('click', async () => {
      try {
        toast((await api('/api/run', {})).message);
      } catch (error) {
        toast(error.message, true);
      }
    });
    for (const b of $$('[data-example]')) b.addEventListener('click', () => {
      $('#task').value = EXAMPLES[Number(b.dataset.example)][1];
      $('#task').focus();
    });
    $('#queue').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-cancel]');
      if (!b) return;
      try {
        toast((await api(`/api/tasks/${b.dataset.cancel}/cancel`, {})).message);
      } catch (error) {
        toast(error.message, true);
      }
    });
    projects.bind();
  },
  update(snap) {
    projects.tick();
    const k = snap.kpis;
    const kpi = (label, value, note = '', tone = '') => `<div class="kpi ${tone}"><div class="kpi-v">${esc(value)}</div><div class="kpi-l">${esc(label)}</div>${note ? `<div class="kpi-n">${esc(note)}</div>` : ''}</div>`;
    $('#kpis').innerHTML = [
      kpi('Leads found', k.found, `${k.ruledOut} ruled out`),
      kpi('Qualified', k.qualified),
      kpi('Drafted', k.drafted, 'email sequences'),
      kpi('Sends waiting', k.sendsWaiting, 'for your yes', k.sendsWaiting ? 'warn' : ''),
      kpi('Contacted', k.contacted, `${k.replied} replied`),
      kpi('Reviews', `${k.reviewsPassed} / ${k.reviewsPassed + k.reviewsRevised}`, 'passed', ''),
      kpi('Web lookups', k.webWeek, 'last 7 days'),
      kpi('Failures', k.failuresWeek, 'last 7 days', k.failuresWeek ? 'bad' : ''),
    ].join('');
    const floor = $('#floor');
    if ($$('.desk', floor).length !== snap.agents.length) {
      floor.innerHTML = snap.agents.map(desk).join('');
      mountAvatars(floor);
    }
    for (const a of snap.agents) updateDesk(a);
    const working = snap.agents.filter((a) => ['working', 'researching'].includes(normalizeState(a.status))).length;
    $('#floor-note').textContent = snap.live ? `${working} working now` : 'Nobody is working. Give the team a task.';
    const active = snap.tasks.filter((t) => ['queued', 'running'].includes(t.status));
    const recent = snap.tasks.filter((t) => !['queued', 'running'].includes(t.status)).slice(0, 3);
    $('#queue').innerHTML = [...active, ...recent].map((t) => `<div class="q-row"><span class="q-id">${esc(t.id)}</span><span class="q-title">${esc(t.title)}</span>${statusChip(t.status)}${t.status === 'queued' ? `<button class="ghost small" data-cancel="${esc(t.id)}">Cancel</button>` : ''}${t.report ? fileLink(t.report, 'Report') : ''}</div>`).join('') || '<p class="muted tiny">No tasks yet.</p>';
    $('#flags-mini').innerHTML = snap.flags.slice(0, 6).map(flagItem).join('') || '<li class="muted">Nothing is waiting for you.</li>';
    $('#feed').innerHTML = snap.feed.slice(0, 30).map((e) => feedItem(e, !store.seen.has(e.id) && store.primed)).join('');
  },
};

function desk(a) {
  const l = look(a.name);
  return `<a class="desk s-idle${a.name === 'coordinator' ? ' lead' : ''}" href="#/agent/${esc(a.name)}" data-agent="${esc(a.name)}" id="desk-${esc(a.name)}">
    <div class="desk-av">${avatarHTML(a.name, { mode: 'full', status: a.status })}</div>
    <div class="bubble" hidden></div>
    <div class="desk-info">
      <div class="desk-name">${esc(l.label)}</div>
      <div class="desk-role">${esc(l.role)}</div>
      <div class="desk-status"><i class="dot"></i><span class="st">Idle</span><span class="backup" hidden>On backup</span></div>
      <div class="desk-stats"><span><b data-k="outputs">0</b> outputs</span><span><b data-k="web">0</b> web</span><span class="fails"><b data-k="fails">0</b> fails</span></div>
    </div>
  </a>`;
}

function updateDesk(a) {
  const el = $(`#desk-${CSS.escape(a.name)}`);
  if (!el) return;
  const st = normalizeState(a.status);
  el.classList.remove('s-idle', 's-working', 's-researching', 's-success', 's-waiting', 's-error', 's-paused');
  el.classList.add(`s-${st}`);
  setAvatarStatus($('.gem', el), st, { agentLabel: agentName(a.name), doing: a.doing });
  $('.st', el).textContent = STATUS[st];
  $('.backup', el).hidden = !a.backupActive;
  const bubble = $('.bubble', el);
  bubble.hidden = !a.doing;
  bubble.textContent = a.doing || '';
  for (const b of $$('[data-k]', el)) b.textContent = a.counts[b.dataset.k] ?? 0;
  $('.fails', el).classList.toggle('has', a.counts.fails > 0);
}

function feedItem(e, fresh = false) {
  return `<li class="ev s-${esc(e.status)}${fresh ? ' fresh' : ''}">${face(e.agent)}<div class="ev-body"><div class="ev-top">${chip(e.kind)}${verdictChip(e.verdict)}<span class="ev-agent">${esc(agentName(e.agent))}</span><time title="${esc(stamp(e.at))}">${esc(ago(e.at))}</time></div><div class="ev-text">${esc(e.text)}</div>${e.ref ? fileLink(e.ref) : ''}</div></li>`;
}

function flagItem(f) {
  const label = { approval: 'Approval', task: 'Task', fallback: 'Backup', blocked: 'Blocked', knowledge: 'Knowledge' }[f.kind] || f.kind;
  const clickable = f.kind === 'approval' ? ` data-approval-id="${esc(f.id)}"` : ''; // the pointer cursor is in app.css: an inline style is refused by the page's policy
  return `<li class="flag f-${esc(f.kind)}"${clickable}><span class="pill p-${f.kind === 'approval' ? 'needs_approval' : f.kind === 'knowledge' ? 'queued' : 'failed'}">${esc(label)}</span><div><div>${esc(f.text)}</div>${f.risk ? `<div class="muted tiny">${esc(f.risk)}</div>` : ''}<div class="tiny">${f.id ? `<code>${esc(f.id)}</code> ` : ''}${f.ref ? fileLink(f.ref) : ''}</div></div></li>`;
}

// Something moving between desks: a hand-off, a finished piece of work going back.
function fly(from, to, kind) {
  const a = $(`#desk-${CSS.escape(from)} .desk-av`);
  const b = $(`#desk-${CSS.escape(to)} .desk-av`);
  if (!a || !b || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  const t = document.createElement('div');
  t.className = `token t-${kind}`;
  t.dataset.agent = from;
  t.textContent = kind === 'handoff' ? '✉' : kind === 'review' ? '✓' : '📄';
  $('#tokens').append(t);
  const x0 = ra.left + ra.width / 2 - 14;
  const y0 = ra.top + ra.height / 2 - 14;
  const x1 = rb.left + rb.width / 2 - 14;
  const y1 = rb.top + rb.height / 2 - 14;
  const lift = Math.min(160, Math.abs(x1 - x0) / 2 + 40);
  t.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(.6)`, opacity: 0 },
    { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1, offset: 0.1 },
    { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - lift}px) scale(1.15)`, offset: 0.55 },
    { transform: `translate(${x1}px, ${y1}px) scale(1)`, opacity: 1, offset: 0.92 },
    { transform: `translate(${x1}px, ${y1}px) scale(.4)`, opacity: 0 },
  ], { duration: 1600, easing: 'cubic-bezier(.45,.05,.35,1)' }).finished.then(() => t.remove());
  b.closest('.desk')?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 500, delay: 1400 });
}

function animateNew(snap) {
  if (!store.primed || route().page !== 'overview') return;
  const fresh = snap.feed.filter((e) => !store.seen.has(e.id) && Date.now() - Date.parse(e.at) < 10 * 60_000).slice(0, 5).reverse();
  fresh.forEach((e, i) => setTimeout(() => {
    if (e.kind === 'handoff' && e.to) fly(e.agent, e.to, 'handoff');
    else if (e.kind === 'result') fly(e.agent, 'coordinator', 'result');
    else if (e.kind === 'review') fly('evaluator', 'coordinator', 'review');
  }, i * 450));
}

// ---- one agent -----------------------------------------------------------------------------------

// One agent's page, built to be read at a glance: what it is doing right now (or its last job), then tabs for an
// overview, its jobs one card each (steps folded away), the files it made, its problems grouped by job, and its
// memory. The current job is kept apart from older ones, so a live run never mixes with history.
const STEP = { handoff: 'Handed over', start: 'Started', result: 'Finished', web: 'Looked up', file: 'Edited', read: 'Read', command: 'Ran', plan: 'Planned', tool: 'Used a tool', error: 'Problem', fallback: 'Backup took over', review: 'Review', revise: 'Sent back for fixes', blocked: 'Blocked', check: 'Copy check', send: 'Email', reply: 'Reply', lead: 'Lead', run: 'Task' };
const JOB_STATUS = { live: ['p-running', 'Running now'], done: ['p-done', 'Finished'], failed: ['p-failed', 'Had a problem'], open: ['p-queued', 'Worked on'] };

// Board task (T-...) -> the Jarvis run (J-...) its request names: it is a step of that run.
const runMap = (d) => new Map(d.tasks.map((t) => [t.id, /^(J-\d{8}-\d+)\b/.exec(t.request || '')?.[1]]).filter(([, j]) => j));

// A problem in plain words, from the raw message: what happened and whether anything is wrong.
function plainWhy(text) {
  const s = String(text);
  if (/requires approval|person's decision|deny rule|needs approval|approved this exact/i.test(s)) return 'Blocked by the safety rules: only a person may do this. The agent carried on another way.';
  if (/No such tool available|not available in this session/i.test(s)) return "Tried a tool it doesn't have, then did it another way.";
  if (/^REVISE|sent back|REVISE \d+/i.test(s)) return 'The reviewer sent the work back with fixes to make.';
  if (/Timeout|UNREACHABLE|ECONN|fetch failed|403|404/i.test(s)) return "Some web pages didn't load or no longer exist.";
  if (/Nothing imported|problem\(s\)/i.test(s)) return 'The lead file had a mistake, so nothing was saved until it was fixed.';
  if (/^Exit code \d+/.test(s)) return 'The check found something to fix.';
  return '';
}

// Jobs from the agent's events: one per task ID, newest first; the job running now (if a run is alive) comes first.
function agentJobs(d, snap) {
  const titles = new Map([...(snap?.tasks || []).map((t) => [t.id, t.title]), ...d.tasks.map((t) => [t.id, t.request])]);
  const boardBy = new Map(d.tasks.map((t) => [t.id, t]));
  const liveId = snap?.live ? snap.running?.id : null;
  // A board task (T-...) whose request names a Jarvis task (J-...) is a step of that run: fold it in.
  const runOf = runMap(d);
  for (const [tId, jId] of runOf) if (!boardBy.has(jId)) boardBy.set(jId, boardBy.get(tId));
  const jobs = new Map();
  for (const e of d.events) {
    const id = runOf.get(e.task) || e.task || 'other';
    if (!jobs.has(id)) jobs.set(id, { id, events: [], problems: [], web: 0, files: 0 });
    const j = jobs.get(id);
    j.events.push(e);
    if (e.kind === 'web') j.web++;
    if (e.kind === 'file') j.files++;
    if (e.status === 'failed' || e.kind === 'error') j.problems.push(e);
  }
  return [...jobs.values()].map((j) => {
    j.events.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    j.at = j.events[0]?.at;
    j.result = j.events.find((e) => e.kind === 'result');
    j.title = titles.get(j.id) || (j.id === 'other' ? 'Work outside a task' : '');
    j.board = boardBy.get(j.id);
    j.state = j.id === liveId ? 'live' : j.result ? (j.result.status === 'failed' ? 'failed' : 'done') : 'open';
    return j;
  }).sort((a, b) => (a.state === 'live' ? -1 : b.state === 'live' ? 1 : String(b.at).localeCompare(String(a.at))));
}

// Problems that say the same thing ("Check links ... failed") are one line with a count.
function groupProblems(list) {
  const groups = new Map();
  for (const e of list) {
    const what = String(e.text).split(/ failed:|: /)[0].slice(0, 90);
    const g = groups.get(what) || { what, n: 0, last: e };
    g.n++;
    if (String(e.at) > String(g.last.at)) g.last = e;
    groups.set(what, g);
  }
  return [...groups.values()].sort((a, b) => String(b.last.at).localeCompare(String(a.last.at)));
}

const stepLine = (e) => `<li class="step s-${esc(e.status || 'ok')}"><span class="step-k">${esc(STEP[e.kind] || e.kind)}</span><span class="step-t">${esc(e.text)}</span><time>${esc(ago(e.at))}</time></li>`;
const jobHead = (j) => `<div class="job-top"><code>${esc(j.id === 'other' ? '—' : j.id)}</code><span class="pill ${JOB_STATUS[j.state][0]}">${JOB_STATUS[j.state][1]}</span>${j.board?.review ? verdictChip(/PASS/.test(j.board.review) ? 'PASS' : /REVISE/.test(j.board.review) ? 'REVISE' : '', (/(?:PASS|REVISE) (\d+)/.exec(j.board.review) || [])[1]) : ''}<time>${esc(stamp(j.at))}</time></div>${j.title ? `<div class="job-title">${esc(j.title)}</div>` : ''}`;

const agentView = {
  tab: 'overview',
  open: new Set(),
  build(name) {
    const l = look(name);
    agentView.open = new Set();
    $('#view').innerHTML = `
    <section class="ag-head card">
      <div class="agent-av">${avatarHTML(name, { mode: 'full', size: 'lg' })}</div>
      <div class="ag-who">
        <h1>${esc(l.label)} <span class="ag-gem">${esc(identityFor(name).name)}</span></h1>
        <p class="ag-role" id="ag-desc"></p>
        <div class="ag-status" id="ag-now"></div>
      </div>
      <div class="ag-stats" id="ag-stats"></div>
    </section>
    <section class="card ag-right-now" id="ag-current"><p class="muted">Loading…</p></section>
    <nav class="tabs ag-tabs" id="ag-tabs" role="tablist"></nav>
    <section class="card panel" id="ag-panel"><p class="muted">Loading…</p></section>`;
    $('#ag-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      agentView.tab = b.dataset.tab;
      agentView.paint(name);
    });
    $('#view').addEventListener('click', (e) => {
      const t = e.target.closest('[data-job]');
      if (t) {
        const id = t.dataset.job;
        if (agentView.open.has(id)) agentView.open.delete(id);
        else agentView.open.add(id);
        agentView.paint(name);
        return;
      }
      const go = e.target.closest('[data-goto]');
      if (go) {
        agentView.tab = go.dataset.goto;
        if (go.dataset.open) agentView.open.add(go.dataset.open);
        agentView.paint(name);
      }
    });
    agentView.load(name);
  },
  async load(name) {
    try {
      store.detail[name] = await api(`/api/agents/${encodeURIComponent(name)}`);
      store.detail[name].at = Date.now();
      if (route().arg === name) agentView.paint(name);
    } catch (error) {
      $('#ag-panel').innerHTML = `<p class="muted">${esc(error.message)}</p>`;
    }
  },
  update(snap, name) {
    const a = snap.agents.find((x) => x.name === name);
    if (!a) return;
    mountAvatars($('.agent-av'));
    setAvatarStatus($('.agent-av .gem'), a.status, { agentLabel: agentName(name), doing: a.doing });
    const st = normalizeState(a.status);
    $('#ag-now').innerHTML = `<span class="st-pill st-${esc(st)}">${esc(STATUS[st])}</span>${a.backupActive ? ' <span class="pill p-failed">Its backup is working</span>' : ''}<span class="tag">Model: ${esc(a.model || 'default')}</span>`;
    const c = a.counts;
    $('#ag-stats').innerHTML = [['Files made', c.outputs], ['Passed reviews', c.passes], ['Problems this week', c.fails, c.fails > 0]].map(([label, v, bad]) => `<div class="mini${bad ? ' bad' : ''}"><b>${esc(v)}</b><span>${esc(label)}</span></div>`).join('');
    const d = store.detail[name];
    if (d && (Date.now() - d.at > 4000) && (a.status === 'working' || a.lastAt !== d.lastAt)) {
      d.lastAt = a.lastAt;
      agentView.load(name);
    } else if (d) agentView.paintNow(name);
  },
  // The "Right now" card: the live job and its newest steps, or the last job when idle.
  paintNow(name) {
    const d = store.detail[name];
    const a = store.snap?.agents.find((x) => x.name === name);
    if (!d || !a) return;
    const jobs = agentJobs(d, store.snap);
    const live = jobs.find((j) => j.state === 'live');
    const busy = ['working', 'researching', 'waiting'].includes(normalizeState(a.status));
    const box = $('#ag-current');
    if (live || busy) {
      const j = live || jobs[0];
      const steps = (j?.events || []).filter((e) => e.kind !== 'read').slice(0, 6);
      box.innerHTML = `<div class="rn-k">Right now</div><h2>${esc(a.doing || 'Working')}</h2>${j ? jobHead(j) : ''}<ul class="steps">${steps.map(stepLine).join('') || '<li class="muted">Starting…</li>'}</ul>${j ? `<button type="button" class="small" data-goto="jobs" data-open="${esc(j.id)}">All steps of this job</button>` : ''}`;
      box.classList.add('live');
      return;
    }
    box.classList.remove('live');
    const last = jobs.find((j) => j.result) || jobs[0];
    if (!last) {
      box.innerHTML = '<div class="rn-k">Right now</div><h2>Not working right now</h2><p class="muted">It hasn\'t done any real work yet.</p>';
      return;
    }
    const report = (store.snap?.tasks || []).find((t) => t.id === last.id)?.report;
    box.innerHTML = `<div class="rn-k">Right now</div><h2>Not working right now</h2><div class="rn-last"><div class="rn-k2">Its last job · ${esc(ago(last.at))}</div>${jobHead(last)}${last.result ? `<p class="rn-result">${esc(last.result.text.replace(/^Finished:\s*/, ''))}</p>` : ''}<div class="rn-actions">${report ? `<a class="btn-link" href="#" data-file="${esc(report)}">Open the job's report</a>` : ''}<button type="button" class="small" data-goto="jobs" data-open="${esc(last.id)}">See its steps</button>${last.problems.length ? `<button type="button" class="small" data-goto="problems">${last.problems.length} problem${last.problems.length === 1 ? '' : 's'} on the way</button>` : ''}</div></div>`;
  },
  paint(name) {
    const d = store.detail[name];
    if (!d) return;
    $('#ag-desc').textContent = String(d.agent.description || '').split(/(?<=\.)\s/)[0];
    const jobs = agentJobs(d, store.snap);
    const problems = d.failures.filter((e) => e.kind !== 'lead');
    const tabs = [['overview', 'Overview'], ['jobs', `Jobs (${jobs.filter((j) => j.id !== 'other').length})`], ['files', `Files (${d.outputs.length})`], ['problems', `Problems (${problems.length})`], ['memory', 'Memory and skills']];
    $('#ag-tabs').innerHTML = tabs.map(([t, label]) => `<button role="tab" data-tab="${t}" aria-selected="${t === agentView.tab}">${esc(label)}</button>`).join('');
    agentView.paintNow(name);
    const p = $('#ag-panel');
    const tab = agentView.tab;
    const fileRow = (o) => `<li><div class="row-top">${o.readable ? `<a href="#" data-file="${esc(o.path)}">${esc(o.title)}</a>` : esc(o.title)}${verdictChip(o.verdict, o.score)}</div><div class="muted tiny">${esc(o.kind || '')} · ${esc(stamp(o.at))}</div></li>`;
    if (tab === 'overview') {
      const recent = jobs.filter((j) => j.id !== 'other').slice(0, 5);
      const extra = name === 'lead-generator' ? `<section class="ov-block"><h3>Leads it found</h3>${leadsTable(store.snap?.leads ?? [])}</section>` : '';
      p.innerHTML = `<div class="ov-grid">
        <section class="ov-block"><h3>Recent jobs</h3>${recent.length ? `<ul class="rows">${recent.map((j) => `<li class="job-mini" data-goto="jobs" data-open="${esc(j.id)}">${jobHead(j)}${j.result ? `<div class="muted tiny clamp2">${esc(j.result.text.replace(/^Finished:\s*/, ''))}</div>` : ''}</li>`).join('')}</ul>` : '<p class="muted">No jobs yet.</p>'}</section>
        <section class="ov-block"><h3>Newest files</h3>${d.outputs.length ? `<ul class="rows">${d.outputs.slice(0, 5).map(fileRow).join('')}</ul>${d.outputs.length > 5 ? `<button type="button" class="small" data-goto="files">All ${d.outputs.length} files</button>` : ''}` : '<p class="muted">No files yet.</p>'}</section>
      </div>${extra}`;
    } else if (tab === 'jobs') {
      const reads = store.filters.reads;
      p.innerHTML = `<div class="sec-h"><h3>Jobs, newest first</h3><label class="check"><input type="checkbox" id="ag-reads" ${reads ? 'checked' : ''}> Show file reads in the steps</label></div>
        <div class="jobs">${jobs.map((j) => {
          const open = agentView.open.has(j.id) || (j.state === 'live' && !agentView.open.has(`!${j.id}`));
          const steps = j.events.filter((e) => reads || e.kind !== 'read');
          return `<article class="job${j.state === 'live' ? ' live' : ''}">${jobHead(j)}
            ${j.result ? `<p class="job-result">${esc(j.result.text.replace(/^Finished:\s*/, ''))}</p>` : ''}
            <div class="job-meta"><span>${steps.length} step${steps.length === 1 ? '' : 's'}</span><span>${j.web} web lookup${j.web === 1 ? '' : 's'}</span><span>${j.files} file edit${j.files === 1 ? '' : 's'}</span>${j.problems.length ? `<span class="bad">${j.problems.length} problem${j.problems.length === 1 ? '' : 's'}</span>` : ''}<button type="button" class="small" data-job="${esc(j.id)}">${open ? 'Hide the steps' : 'Show the steps'}</button></div>
            ${open ? `<ul class="steps">${steps.slice(0, agentView.open.has(`all:${j.id}`) ? undefined : 25).map(stepLine).join('')}</ul>${steps.length > 25 && !agentView.open.has(`all:${j.id}`) ? `<button type="button" class="small more" data-job="all:${esc(j.id)}">Show all ${steps.length} steps</button>` : ''}` : ''}</article>`;
        }).join('') || '<p class="muted">No jobs yet.</p>'}</div>`;
      $('#ag-reads').addEventListener('change', (e) => {
        store.filters.reads = e.target.checked;
        agentView.paint(name);
      });
    } else if (tab === 'files') {
      p.innerHTML = `<div class="sec-h"><h3>Files it made</h3><input type="search" id="ag-file-q" class="ag-search" placeholder="Find a file"></div><ul class="rows" id="ag-files">${d.outputs.map(fileRow).join('') || '<li class="muted">No files yet.</li>'}</ul>`;
      $('#ag-file-q').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        $('#ag-files').innerHTML = d.outputs.filter((o) => `${o.title} ${o.path}`.toLowerCase().includes(q)).map(fileRow).join('') || '<li class="muted">No file matches.</li>';
      });
    } else if (tab === 'problems') {
      const byJob = new Map();
      const runOf = runMap(d);
      for (const e of problems) {
        const id = runOf.get(e.task) || e.task || 'other';
        if (!byJob.has(id)) byJob.set(id, []);
        byJob.get(id).push(e);
      }
      const jobOf = new Map(jobs.map((j) => [j.id, j]));
      p.innerHTML = `<h3>Problems, by job</h3><p class="muted tiny">A problem is a step that didn't work: a command refused or failing, a page that wouldn't load, or work the reviewer sent back. Most are retried in the same job: "The job still finished" means it recovered.</p>${[...byJob.entries()].sort((a, b) => String(b[1][0].at).localeCompare(String(a[1][0].at))).map(([id, list]) => {
        const j = jobOf.get(id);
        const recovered = j?.result && j.result.status !== 'failed';
        return `<article class="job">${j ? jobHead(j) : `<div class="job-top"><code>${esc(id)}</code></div>`}${recovered ? '<span class="pill p-done">The job still finished</span>' : ''}<ul class="probs">${groupProblems(list).map((g) => { const raw = String(g.last.text).slice(g.what.length).replace(/^( failed)?:\s*/, ''); const why = plainWhy(raw || g.last.text); return `<li><b>${esc(g.what)}</b>${g.n > 1 ? ` <span class="pill p-failed">${g.n} times</span>` : ''}${why ? `<div class="prob-why">${esc(why)}</div>` : ''}<div class="muted tiny">${esc(raw.slice(0, 180))}${raw.length > 180 ? '…' : ''} · ${esc(ago(g.last.at))}</div></li>`; }).join('')}</ul></article>`;
      }).join('') || '<p class="muted">No problems. Nice.</p>'}`;
    } else {
      p.innerHTML = `<h3>Skills it uses</h3><div class="tags">${d.agent.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join('') || '<span class="muted">None</span>'}</div>
        <h3>Who it can ask</h3><div class="tags">${d.agent.canAsk.map((c) => `<span class="tag">${esc(agentName(c))}</span>`).join('') || '<span class="muted">Nobody</span>'}${d.agent.hasBackup ? '<span class="tag">Has a backup agent</span>' : ''}</div>
        <h3>What it has learned <span class="muted">(${d.memory.lessons.length})</span></h3>${d.memory.lessons.length ? `<ol class="lessons">${d.memory.lessons.map((x) => `<li>${esc(x.replace(/\s*\(source:[^)]*\)\s*$/, ''))}</li>`).join('')}</ol>` : '<p class="muted">No lessons yet.</p>'}`;
    }
  },
};

// ---- logs ----------------------------------------------------------------------------------------

const logs = {
  build() {
    const f = store.filters;
    const agents = [...roster().map((a) => a.name), 'system'];
    $('#view').innerHTML = `
    <div class="page-h"><h1>Logs</h1><p class="muted">Every step every agent took: hand-offs, web lookups, files, reviews, checks, sends and failures.</p></div>
    <section class="card filters">
      <label>Agent <select id="f-agent"><option value="">All agents</option>${agents.map((n) => `<option value="${esc(n)}" ${f.agent === n ? 'selected' : ''}>${esc(agentName(n))}</option>`).join('')}</select></label>
      <label>Kind <select id="f-kind"><option value="">All kinds</option>${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label>Result <select id="f-status"><option value="">All</option><option value="failed" ${f.status === 'failed' ? 'selected' : ''}>Failed only</option><option value="ok" ${f.status === 'ok' ? 'selected' : ''}>OK only</option></select></label>
      <label class="grow">Search <input id="f-q" type="search" value="${esc(f.q)}" placeholder="Company, file, URL…"></label>
      <label class="check"><input type="checkbox" id="f-reads" ${f.reads ? 'checked' : ''}> File reads</label>
      <div class="seg" role="group" aria-label="View"><button data-view="table" aria-pressed="${f.view === 'table'}">Table</button><button data-view="lanes" aria-pressed="${f.view === 'lanes'}">Columns per agent</button></div>
    </section>
    <section id="log-body"><p class="muted">Loading…</p></section>`;
    const on = (id, key, ev = 'change') => $(id).addEventListener(ev, (e) => {
      f[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      f.limit = 400;
      logs.paint();
    });
    on('#f-agent', 'agent');
    on('#f-kind', 'kind');
    on('#f-status', 'status');
    on('#f-q', 'q', 'input');
    on('#f-reads', 'reads');
    $('.seg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (!b) return;
      f.view = b.dataset.view;
      for (const x of $$('.seg button')) x.setAttribute('aria-pressed', String(x === b));
      logs.paint();
    });
    $('#log-body').addEventListener('click', (e) => {
      if (e.target.id === 'more') {
        f.limit += 400;
        logs.paint();
      }
    });
    logs.load(true);
  },
  async load(force) {
    if (!force && Date.now() - store.logsAt < 4000) return;
    store.logsAt = Date.now();
    try {
      store.logs = await api('/api/logs');
      if (route().page === 'logs') logs.paint();
    } catch (error) {
      $('#log-body').innerHTML = `<p class="muted">${esc(error.message)}</p>`;
    }
  },
  update() {
    logs.load(false);
  },
  paint() {
    const f = store.filters;
    const q = f.q.trim().toLowerCase();
    const list = (store.logs || []).filter((e) => (f.reads || e.kind !== 'read') && (!f.agent || e.agent === f.agent) && (!f.kind || e.kind === f.kind)
      && (!f.status || (f.status === 'failed' ? e.status === 'failed' : e.status !== 'failed')) && (!q || `${e.text} ${e.task || ''} ${e.ref || ''}`.toLowerCase().includes(q)));
    const body = $('#log-body');
    if (f.view === 'lanes') {
      const names = f.agent ? [f.agent] : [...roster().map((a) => a.name), 'system'];
      body.innerHTML = `<div class="lanes">${names.map((n) => {
        const mine = list.filter((e) => e.agent === n);
        const bad = mine.filter((e) => e.status === 'failed').length;
        return `<section class="lane" data-agent="${esc(n)}"><header>${face(n)}<div><b>${esc(agentName(n))}</b><div class="muted tiny">${mine.length} entries${bad ? ` · <span class="bad-text">${bad} failed</span>` : ''}</div></div></header><ol class="feed">${mine.slice(0, 80).map((e) => `<li class="ev s-${esc(e.status)}"><div class="ev-body"><div class="ev-top">${chip(e.kind)}${verdictChip(e.verdict)}<time title="${esc(stamp(e.at))}">${esc(ago(e.at))}</time></div><div class="ev-text">${esc(e.text)}</div>${e.ref ? fileLink(e.ref) : ''}</div></li>`).join('') || '<li class="muted tiny">Nothing here.</li>'}</ol></section>`;
      }).join('')}</div>`;
      return;
    }
    const rows = list.slice(0, f.limit);
    body.innerHTML = `<div class="card"><div class="sec-h"><h2>${list.length} entries</h2><span class="muted tiny">Newest first</span></div><div class="wide"><table class="tbl logs-tbl"><thead><tr><th>When</th><th>Agent</th><th>Kind</th><th>What happened</th><th>Task</th><th></th></tr></thead><tbody>${rows.map((e) => `<tr class="s-${esc(e.status)}"><td class="nowrap" title="${esc(e.at)}">${esc(stamp(e.at))}</td><td class="nowrap">${face(e.agent)} ${esc(agentName(e.agent))}</td><td>${chip(e.kind)}</td><td>${esc(e.text)}</td><td class="nowrap">${e.task ? `<code>${esc(e.task)}</code>` : ''}</td><td>${e.ref ? fileLink(e.ref) : ''}</td></tr>`).join('')}</tbody></table></div>${list.length > rows.length ? '<button class="ghost" id="more">Show more</button>' : ''}</div>`;
  },
};

// ---- leads, reports, flags -----------------------------------------------------------------------

function leadsTable(leads) {
  const sorted = [...leads].sort((a, b) => (LEAD_ORDER.indexOf(a.status) - LEAD_ORDER.indexOf(b.status)) || (b.score - a.score));
  return `<h3>Leads <span class="muted">(${leads.length})</span></h3><div class="wide"><table class="tbl"><thead><tr><th>Company</th><th>Stage</th><th>Tier</th><th>Score</th><th>Evidence</th><th>Contact</th><th>Next step</th><th>Emails</th></tr></thead><tbody>${sorted.map((l) => `<tr><td><b>${esc(l.company)}</b><div class="muted tiny">${esc(l.id)}${l.hold ? ` · on hold: ${esc(l.hold)}` : ''}${l.reason ? ` · ${esc(l.reason)}` : ''}</div></td><td>${statusChip(l.status)}</td><td>${esc(l.tier)}</td><td>${esc(l.score)}</td><td>${esc(l.evidence)}</td><td>${esc(l.contact || '—')}</td><td class="muted">${esc(l.next)}</td><td>${l.sequence ? fileLink(l.sequence, 'Drafts') : ''}${l.review ? ` ${verdictChip('PASS', l.review.score)}` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}

const leadsView = {
  build() {
    $('#view').innerHTML = '<div class="page-h"><h1>Leads</h1><p class="muted">Every company the lead generator found, how far each has got, and the drafted emails.</p></div><section class="kpis" id="lead-kpis"></section><section class="card" id="leads-body"></section>';
  },
  update(snap) {
    const k = snap.kpis;
    $('#lead-kpis').innerHTML = [['Found', k.found], ['Qualified', k.qualified], ['Drafted', k.drafted], ['Contacted', k.contacted], ['Replied', k.replied], ['Ruled out', k.ruledOut]].map(([l, v]) => `<div class="kpi"><div class="kpi-v">${v}</div><div class="kpi-l">${l}</div></div>`).join('');
    $('#leads-body').innerHTML = leadsTable(snap.leads);
  },
};

// Schedules and weekly results on the Reports page: what the team does on a clock (ops/schedule.json), each entry
// with an on/off switch that only the page has, and the weekly reports written so far (outputs/reports/weekly-*.md).
const schedWhen = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function schedulesHTML(schedule) {
  if (schedule.error) return `<h2>Schedules</h2><p class="muted">The schedule can't be read: ${esc(schedule.error)}</p>`;
  const rows = schedule.entries.map((e) => `<li class="sched-row${e.enabled ? '' : ' off'}">
    <div class="sched-main">
      <div class="row-top"><span class="sched-name">${esc(e.name)}</span><span class="pill ${e.kind === 'task' ? 'p-queued' : 'p-done'}">${e.kind === 'task' ? 'Uses the plan' : 'No plan use'}</span></div>
      <div class="muted tiny">${esc(e.when)} · ${e.enabled ? `Next: ${esc(e.due ? 'due now' : schedWhen(e.next))}` : 'Off'}</div>
      <div class="muted tiny">${e.last_run ? `Last run: ${esc(schedWhen(e.last_run))}` : 'Never run'}${e.note ? ` · ${esc(e.note)}` : ''}</div>
      ${e.waiting ? `<div class="warn-text">${esc(e.waiting)}</div>` : ''}
    </div>
    <button type="button" class="switch" role="switch" aria-checked="${e.enabled}" data-sched="${esc(e.id)}" aria-label="${esc(e.name)}" title="${e.enabled ? 'Turn off' : 'Turn on'}"></button>
  </li>`).join('');
  return `<h2>Schedules <span class="muted">(${schedule.entries.length})</span></h2><ul class="rows">${rows || '<li class="muted">Nothing is scheduled.</li>'}</ul>`;
}

function weeklyHTML(schedule) {
  const week = (w) => new Date(`${w}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const items = schedule.weekly.map((w) => `<li><a href="#" data-file="${esc(w.path)}">Week of ${esc(week(w.week))}</a><div class="muted tiny">Written ${esc(stamp(w.at))}</div></li>`).join('');
  return `<h2>Weekly results <span class="muted">(${schedule.weekly.length})</span></h2><ul class="rows">${items || '<li class="muted">No weekly report yet. The first one is written when the weekly report is due.</li>'}</ul>`;
}

async function toggleSchedule(event) {
  const sw = event.target.closest('[data-sched]');
  if (!sw) return;
  sw.disabled = true;
  try {
    const done = await api('/api/schedule/toggle', { id: sw.dataset.sched, enabled: sw.getAttribute('aria-checked') !== 'true' });
    sw.setAttribute('aria-checked', String(done.enabled));
    sw.closest('.sched-row').classList.toggle('off', !done.enabled);
    toast(done.message);
  } catch (error) {
    toast(error.message, true);
  } finally {
    sw.disabled = false;
  }
}

const reportsView = {
  schedSig: '',
  build() {
    $('#view').innerHTML = '<div class="page-h"><h1>Reports</h1><p class="muted">The report each task ended with, and every review the evaluator wrote.</p></div><div class="two"><section class="card" id="rep-tasks"></section><section class="card" id="rep-reviews"><p class="muted">Loading reviews…</p></section></div>';
    $('#view .page-h').insertAdjacentHTML('afterend', '<div class="two"><section class="card" id="rep-schedule"></section><section class="card" id="rep-weekly"></section></div>');
    $('#rep-schedule').addEventListener('click', toggleSchedule);
    reportsView.schedSig = '';
    api('/api/agents/evaluator').then((d) => {
      $('#rep-reviews').innerHTML = `<h2>Reviews <span class="muted">(${d.outputs.length})</span></h2><ul class="rows">${d.outputs.map((o) => `<li><a href="#" data-file="${esc(o.path)}">${esc(o.title)}</a> ${verdictChip(o.verdict, o.score)}<div class="muted tiny">${esc(stamp(o.at))}</div></li>`).join('')}</ul>`;
    }).catch((e) => {
      $('#rep-reviews').innerHTML = `<p class="muted">${esc(e.message)}</p>`;
    });
  },
  update(snap) {
    // Painted only when it changes, so a switch a person is tabbing to isn't replaced under them.
    const sig = JSON.stringify(snap.schedule || null);
    if (snap.schedule && sig !== reportsView.schedSig) {
      reportsView.schedSig = sig;
      $('#rep-schedule').innerHTML = schedulesHTML(snap.schedule);
      $('#rep-weekly').innerHTML = weeklyHTML(snap.schedule);
    }
    $('#rep-tasks').innerHTML = `<h2>Task reports <span class="muted">(${snap.tasks.length})</span></h2><ul class="rows">${snap.tasks.map((t) => `<li><div class="row-top"><code>${esc(t.id)}</code>${statusChip(t.status)}</div>${t.report ? `<a href="#" data-file="${esc(t.report)}">${esc(t.title)}</a>` : esc(t.title)}<div class="muted tiny">${esc(t.finished || t.started || t.added || '')}${t.note ? ` · ${esc(t.note)}` : ''}</div></li>`).join('') || '<li class="muted">No tasks yet.</li>'}</ul>`;
  },
};

// Outreach: the leads each run found, a button to have the team draft emails for them, and each finished draft
// with an Approve button. Approving sends it (during the pilot, [TEST] copies to the three test recipients only).
// The same two actions work by voice: "draft emails for the new leads", "approve all drafts".
const LEAD_PILL = { ready: 'p-queued', drafting: 'p-running', drafted: 'p-done', held: 'p-needs_approval', closed: 'p-failed', 'not-qualified': 'p-new' };
const LEAD_LABEL = { ready: 'Ready to draft', drafting: 'Drafting', drafted: 'Drafted', held: 'On hold', closed: 'Closed', 'not-qualified': 'Not qualified' };
const DRAFT_PILL = { ready: 'p-needs_approval', approved: 'p-done', declined: 'p-failed', 'in-review': 'p-running', revise: 'p-failed', changed: 'p-failed', unreviewed: 'p-new' };
const DRAFT_LABEL = { ready: 'Ready to approve', approved: 'Approved', declined: 'Declined', 'in-review': 'In review', revise: 'Being revised', changed: 'Needs re-review', unreviewed: 'Not reviewed' };

// A draft's emails in the side panel, as the reader gets them, with a link to the full file and its notes.
async function openEmails(path, company) {
  document.body.classList.add('drawer-open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('#drawer-title').textContent = company || path.split('/').pop();
  $('#drawer-kicker').textContent = 'Loading…';
  $('#drawer-body').innerHTML = '';
  try {
    const doc = await api(`/api/outreach/emails?draft=${encodeURIComponent(path)}`);
    const draft = store.snap?.outreach?.drafts.find((d) => d.path === path);
    const approve = draft?.state === 'ready' ? ` <button type="button" class="primary small" id="or-drawer-approve">Approve and send</button>` : draft ? ` · ${esc(draft.why)}` : '';
    $('#drawer-kicker').innerHTML = `${doc.emails.length} email${doc.emails.length === 1 ? '' : 's'} · <a href="#" data-file="${esc(path)}">full draft with the reviewer's notes</a>${approve}`;
    $('#or-drawer-approve')?.addEventListener('click', (e) => outreachAction(e.currentTarget, '/api/outreach/approve', { drafts: [draft.lead] }));
    $('#drawer-body').innerHTML = doc.emails.map((e) => `<section class="or-mail"><div class="or-mail-n">Email ${e.n}</div><div class="or-mail-subj">${esc(e.subject)}</div><div class="or-mail-body">${esc(e.body)}</div></section>`).join('') || '<p class="muted">This draft has no emails yet.</p>';
    $('#drawer-body').scrollTop = 0;
  } catch (error) {
    $('#drawer-kicker').textContent = '';
    $('#drawer-body').innerHTML = `<p class="muted">${esc(error.message)}</p>`;
  }
}

async function outreachAction(button, path, body) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = path.endsWith('approve') ? 'Sending…' : 'Starting…';
  try {
    const r = await api(path, { ...body, by: 'a person on the page' });
    toast(r.message);
  } catch (error) {
    toast(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

const outreachView = {
  build() {
    $('#view').innerHTML = `<div class="page-h"><h1>Outreach</h1><p class="muted">Leads the team found, and the emails drafted for them. Nothing is drafted until you ask, and nothing is sent until you approve. Approving sends the draft: during the pilot, as [TEST] copies to Purab, Tanvi and Mohit only, never to the lead. To decide one email at a time, with a tick or a cross, open <a href="#/emails">Emails</a>. By voice: <q>draft emails for the new leads</q>, <q>approve all drafts</q>.</p></div>
      <section class="card"><div class="sec-h"><h2>New leads from runs</h2></div><div id="or-runs"></div></section>
      <section class="card"><div class="sec-h"><h2>Drafted emails</h2><button type="button" class="primary small" id="or-approve-all" hidden></button></div><ul class="rows" id="or-drafts"></ul></section>`;
    $('#view').addEventListener('click', (e) => {
      const mail = e.target.closest('a[data-mails]');
      if (mail) {
        e.preventDefault();
        e.stopPropagation();
        openEmails(mail.dataset.mails, mail.dataset.company);
        return;
      }
      const b = e.target.closest('button[data-or]');
      if (!b) return;
      if (b.dataset.or === 'draft') outreachAction(b, '/api/outreach/draft', { leads: b.dataset.leads.split(',') });
      if (b.dataset.or === 'approve') outreachAction(b, '/api/outreach/approve', { drafts: [b.dataset.lead] });
    });
    $('#or-approve-all').addEventListener('click', (e) => outreachAction(e.currentTarget, '/api/outreach/approve', { drafts: 'all' }));
  },
  update(snap) {
    const o = snap.outreach || { runs: [], drafts: [] };
    $('#or-runs').innerHTML = o.runs.length
      ? o.runs.map((r) => {
        const head = `This run found <b>${r.leads.length}</b> lead${r.leads.length === 1 ? '' : 's'}${r.ready.length ? `. <b>${r.ready.length}</b> can be drafted now.` : '.'}`;
        const ask = r.ready.length
          ? `<button type="button" class="primary" data-or="draft" data-leads="${esc(r.ready.join(','))}">Draft emails for ${r.ready.length === r.leads.length && r.ready.length > 1 ? 'all of them' : r.ready.length === 1 ? 'it' : `the ${r.ready.length} ready`}</button>`
          : '';
        const rows = r.leads.map((l) => `<li><div class="row-top"><b>${esc(l.company)}</b> <span class="pill ${LEAD_PILL[l.state] || ''}">${esc(LEAD_LABEL[l.state] || l.state)}</span>${l.tier ? `<span class="muted tiny">tier ${esc(l.tier)} · score ${esc(l.score)}</span>` : ''}</div><div class="muted tiny">${esc(l.why)}${l.draft ? ` · <a href="#" data-mails="${esc(l.draft)}" data-company="${esc(l.company)}">read the emails</a>` : ''}${l.website ? ` · <a href="${esc(l.website)}" target="_blank" rel="noopener">website</a>` : ''}</div></li>`).join('');
        return `<div class="or-run"><div class="row-top"><code>${esc(r.task)}</code><span class="muted tiny">${esc(r.finished || '')} · ${esc(r.title.length > 80 ? `${r.title.slice(0, 79)}…` : r.title)}</span></div><p>${head}</p><ul class="rows">${rows}</ul>${ask ? `<div class="or-ask">${ask}</div>` : ''}</div>`;
      }).join('')
      : '<p class="muted">No run in the last two weeks found new leads.</p>';
    const ready = o.drafts.filter((d) => d.state === 'ready');
    const all = $('#or-approve-all');
    all.hidden = ready.length < 2;
    all.textContent = `Approve all ${ready.length} and send`;
    $('#or-drafts').innerHTML = o.drafts.length
      ? o.drafts.map((d) => `<li><div class="row-top"><a href="#" data-mails="${esc(d.path)}" data-company="${esc(d.company)}"><b>${esc(d.company)}</b></a> <span class="pill ${DRAFT_PILL[d.state] || ''}">${esc(DRAFT_LABEL[d.state] || d.state)}</span>${d.review ? verdictChip(d.review.verdict) : ''}<span class="muted tiny">${d.emails} email${d.emails === 1 ? '' : 's'} · ${esc(ago(d.at))}</span>${d.state === 'ready' ? `<button type="button" class="primary small or-approve" data-or="approve" data-lead="${esc(d.lead)}">Approve and send</button>` : ''}</div><div class="muted tiny">${esc(d.why)} · <a href="#" data-mails="${esc(d.path)}" data-company="${esc(d.company)}">read the emails</a></div></li>`).join('')
      : '<li class="muted">No emails drafted yet.</li>';
  },
};

// Emails: every drafted email one at a time, under Outreach in the menu. A tick sends that email (during the pilot,
// [TEST] copies to the three test recipients only), a cross declines it so it is never sent. Only emails whose
// draft passed review can be decided. By voice: "approve email 1 for puzari", "decline email 2 for puzari",
// "approve all pending emails".
const EMAIL_TABS = [['pending', 'Pending'], ['all', 'All drafted'], ['approved', 'Sent'], ['declined', 'Declined']];
const EMAIL_LABEL = { pending: 'Waiting for you', approved: 'Sent', declined: 'Declined', waiting: 'In review' };
const EMAIL_PILL = { pending: 'p-needs_approval', approved: 'p-done', declined: 'p-failed', waiting: 'p-running' };

async function decideEmail(button, emails, decision) {
  const card = button.closest('.em-card');
  card?.classList.add('busy');
  for (const b of card ? card.querySelectorAll('button') : [button]) b.disabled = true;
  try {
    const r = await api('/api/outreach/decide', { emails, decision, by: 'a person on the page' });
    toast(r.message);
  } catch (error) {
    toast(error.message, true);
    card?.classList.remove('busy');
    for (const b of card ? card.querySelectorAll('button') : [button]) b.disabled = false;
  }
}

const emailsView = {
  tab: 'pending',
  open: new Set(),
  build() {
    $('#view').innerHTML = `<div class="page-h"><h1>Emails</h1><p class="muted">Every email the team drafted, one at a time. <b>✓</b> sends it, <b>✗</b> stops it. During the pilot ✓ sends [TEST] copies to Purab, Tanvi and Mohit only, never to the lead. Only emails whose draft passed review can be sent. By voice: <q>approve email 1 for PuzariCloud</q>, <q>decline email 2 for PuzariCloud</q>, <q>approve all pending emails</q>.</p></div>
      <div class="em-bar"><div class="em-tabs" role="tablist" aria-label="Which emails">${EMAIL_TABS.map(([k, label]) => `<button type="button" role="tab" data-tab="${k}">${label} <b data-n="${k}"></b></button>`).join('')}</div><button type="button" class="primary small" id="em-all" hidden></button></div>
      <div class="em-list" id="em-list"></div>`;
    $('#view').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        emailsView.tab = tab.dataset.tab;
        emailsView.update(store.snap);
        return;
      }
      const more = e.target.closest('[data-more]');
      if (more) {
        const ref = more.dataset.more;
        if (emailsView.open.has(ref)) emailsView.open.delete(ref);
        else emailsView.open.add(ref);
        more.closest('.em-card').classList.toggle('open', emailsView.open.has(ref));
        more.textContent = emailsView.open.has(ref) ? 'Show less' : 'Read all';
        return;
      }
      const b = e.target.closest('[data-decide]');
      if (b) decideEmail(b, [b.closest('.em-card').dataset.ref], b.dataset.decide);
    });
    $('#em-all').addEventListener('click', (e) => decideEmail(e.currentTarget, 'all', 'approve'));
  },
  update(snap) {
    const all = snap?.outreach?.emails || [];
    const tabs = { pending: all.filter((m) => m.state === 'pending'), all, approved: all.filter((m) => m.state === 'approved'), declined: all.filter((m) => m.state === 'declined') };
    for (const b of $$('[data-tab]')) {
      b.setAttribute('aria-selected', String(b.dataset.tab === emailsView.tab));
      $(`[data-n="${b.dataset.tab}"]`).textContent = tabs[b.dataset.tab].length || '';
    }
    const allBtn = $('#em-all');
    allBtn.hidden = emailsView.tab !== 'pending' || tabs.pending.length < 2;
    allBtn.textContent = `✓ Approve all ${tabs.pending.length}`;
    const shown = tabs[emailsView.tab];
    const empty = { pending: 'No email is waiting for you. New drafts appear here once they pass review.', all: 'No emails drafted yet. Ask for drafts on the Outreach page or by voice.', approved: 'Nothing sent yet.', declined: 'Nothing declined.' }[emailsView.tab];
    $('#em-list').innerHTML = shown.length
      ? shown.map((m) => {
        const open = emailsView.open.has(m.ref);
        const acts = m.state === 'pending'
          ? `<button type="button" class="em-yes" data-decide="approve" title="Approve and send" aria-label="Approve and send email ${m.n} for ${esc(m.company)}">✓</button><button type="button" class="em-no" data-decide="decline" title="Decline: don't send" aria-label="Decline email ${m.n} for ${esc(m.company)}">✗</button>`
          : m.state === 'declined' ? `<button type="button" class="em-yes small-yes" data-decide="approve" aria-label="Send email ${m.n} for ${esc(m.company)} after all">✓ Send after all</button>`
          : m.state === 'approved' && !m.sent ? `<button type="button" class="em-yes small-yes" data-decide="approve" aria-label="Try sending email ${m.n} for ${esc(m.company)} again">✓ Try sending again</button>` : '';
        return `<article class="em-card s-${esc(m.state)}${open ? ' open' : ''}" data-ref="${esc(m.ref)}">
          <header class="em-head"><b>${esc(m.company)}</b><span class="muted tiny">Email ${m.n} of ${m.of}</span><span class="pill ${EMAIL_PILL[m.state] || ''}">${esc(EMAIL_LABEL[m.state] || m.state)}</span>${m.review ? verdictChip(m.review.verdict, m.review.score) : ''}<span class="em-act">${acts}</span></header>
          <div class="em-subj">${esc(m.subject || '(no subject)')}</div>
          <div class="em-body">${esc(m.body)}</div>
          <footer class="em-foot"><button type="button" class="link" data-more="${esc(m.ref)}">${open ? 'Show less' : 'Read all'}</button><span class="muted tiny">${esc(m.why)}${m.at ? ` · ${esc(ago(m.at))}` : ''}</span><a href="#" class="tiny" data-file="${esc(m.draft)}">full draft and review notes</a></footer>
        </article>`;
      }).join('')
      : `<p class="muted em-empty">${esc(empty)}</p>`;
  },
};

// One card per agent with only real work: test and failed runs a person archived are left out by the server.
const teamView = {
  build() {
    $('#view').innerHTML = '<div class="page-h"><h1>Team</h1><p class="muted">What each agent has really done: its latest result, its numbers and its newest work. Test runs and failed runs you archived are left out.</p></div><div class="team-grid" id="team-grid"></div>';
  },
  update(snap) {
    const busy = (a) => (['working', 'researching', 'waiting'].includes(normalizeState(a.status)) ? 0 : 1);
    const agents = [...snap.agents].sort((a, b) => busy(a) - busy(b) || String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
    $('#team-grid').innerHTML = agents.map((a) => {
      const c = a.counts;
      const stat = (v, label, bad = false) => `<div class="tm-stat${bad && v ? ' bad' : ''}"><b>${v}</b><span>${label}</span></div>`;
      const latest = a.latest
        ? `<div class="tm-latest${a.latest.status === 'failed' ? ' bad' : ''}"><div class="tm-k">${a.latest.from === 'run' ? 'Latest result' : 'Latest task'}${a.latest.task ? ` · <code>${esc(a.latest.task)}</code>` : ''}${a.latest.at ? ` · <span class="tm-when">${esc(ago(a.latest.at))}</span>` : ''}</div><p>${a.latest.report ? `<a href="#" data-file="${esc(a.latest.report)}">${esc(a.latest.text)}</a>` : esc(a.latest.text.replace(/^Finished: /, ''))}</p>${a.latest.state ? `<div class="muted tiny">${esc(a.latest.state)}${a.latest.review ? ` · review ${esc(a.latest.review)}` : ''}</div>` : ''}</div>`
        : '<div class="tm-latest"><div class="tm-k">Latest result</div><p class="muted">No real result yet.</p></div>';
      const recent = a.recent?.length
        ? `<ul class="tm-work">${a.recent.map((o) => `<li>${o.readable ? `<a href="#" data-file="${esc(o.path)}">${esc(o.title)}</a>` : esc(o.title)} ${verdictChip(o.verdict, o.score)}<span class="muted tiny"> · ${esc(ago(o.at))}</span></li>`).join('')}</ul>`
        : '<p class="muted tiny">No files yet.</p>';
      return `<section class="card tm-card" data-agent="${esc(a.name)}">
        <header class="tm-head">${avatarHTML(a.name, { mode: 'badge', size: 'sm', status: a.status })}<div><b>${esc(agentName(a.name))}</b><span class="muted tiny">${esc(look(a.name).role)}</span></div>${statusChip(normalizeState(a.status))}</header>
        ${a.doing && ['working', 'researching', 'waiting'].includes(normalizeState(a.status)) ? `<p class="tm-now"><span class="tm-k">Now</span> ${esc(a.doing)}</p>` : ''}
        ${latest}
        <div class="tm-stats">${stat(c.tasks, 'tasks')}${stat(c.outputs, 'files made')}${stat(c.passes, 'reviews passed')}${stat(c.revised ?? 0, 'sent back', true)}${stat(c.web, 'web lookups')}${stat(c.fails, 'failed steps, 7 days', true)}</div>
        <div class="tm-k">Newest work</div>${recent}
        <footer class="tm-foot"><span class="muted tiny">${a.lastAt ? `Last active ${esc(ago(a.lastAt))}` : 'Not active yet'}</span><a href="#/agent/${esc(a.name)}">Every step →</a></footer>
      </section>`;
    }).join('');
  },
};

const flagsView = {
  build() {
    $('#view').innerHTML = '<div class="page-h"><h1>Needs you</h1><p class="muted">Everything waiting on a person. This page never approves or sends: approve sends in <code>ops/approvals.md</code> after reading the drafts.</p></div><div id="flag-groups"></div>';
  },
  update(snap) {
    const groups = [['approval', 'Approvals waiting'], ['task', 'Tasks that need an answer'], ['fallback', 'Agents that needed their backup'], ['blocked', 'Blocked tasks'], ['knowledge', 'Knowledge to confirm']];
    $('#flag-groups').innerHTML = groups.map(([kind, title]) => {
      const items = snap.flags.filter((f) => f.kind === kind);
      return items.length ? `<section class="card"><h2>${esc(title)} <span class="muted">(${items.length})</span></h2><ul class="flags">${items.map(flagItem).join('')}</ul></section>` : '';
    }).join('') || '<section class="card"><p class="muted">Nothing is waiting for you.</p></section>';
  },
};

// ---- the demo, shared by the home and the Working page ------------------------------------------

// Plays the narrated demo task in an office. While it plays the office says "Simulation" and real
// updates wait; ending it puts the office back on real data.
function attachDemo({ office, controls, onFrame, onEnd }) {
  let active = false;
  const demo = createDemo((f) => {
    if (!active) return;
    if (f.reset) office.reset();
    office.setSpeed(f.speed);
    const agents = roster().map((a) => ({ name: a.name, status: f.states[a.name]?.status || 'idle', doing: f.states[a.name]?.doing || '', backup: !!f.states[a.name]?.backup }));
    office.update({ agents, events: f.events, caption: f.caption, board: f.board, simulated: true });
    onFrame?.(agents, f);
    paint(f);
  });
  function paint(f = {}) {
    if (!active) {
      controls.innerHTML = '<div class="demo-ctl"><button type="button" class="go" data-d="start">▶ Watch the demo</button></div>';
      return;
    }
    if (!controls.querySelector('.demo-bar')) {
      controls.innerHTML = '<div class="demo-ctl"><button type="button" data-d="toggle"></button><button type="button" data-d="s1">1×</button><button type="button" data-d="s2">2×</button><button type="button" data-d="restart" title="Start again" aria-label="Start again">↺</button><div class="demo-bar" title="Progress"><i></i></div><button type="button" data-d="exit" title="End the demo" aria-label="End the demo">✕</button></div>';
    }
    const toggle = controls.querySelector('[data-d="toggle"]');
    toggle.textContent = demo.playing ? '❚❚' : '▶';
    toggle.setAttribute('aria-label', demo.playing ? 'Pause' : 'Play');
    controls.querySelector('[data-d="s1"]').setAttribute('aria-pressed', String(demo.speed === 1));
    controls.querySelector('[data-d="s2"]').setAttribute('aria-pressed', String(demo.speed === 2));
    if (f.progress !== undefined) controls.querySelector('.demo-bar i').style.width = `${Math.round(f.progress * 100)}%`;
  }
  controls.addEventListener('click', (e) => {
    const d = e.target.closest('[data-d]')?.dataset.d;
    if (!d) return;
    if (d === 'start') {
      active = true;
      office.reset();
      demo.restart();
    } else if (d === 'exit') {
      active = false;
      demo.stop();
      office.reset();
      office.setSpeed(1);
      onEnd?.();
    } else if (d === 'toggle') demo.toggle();
    else if (d === 's1' || d === 's2') demo.setSpeed(d === 's1' ? 1 : 2);
    else if (d === 'restart') demo.restart();
    paint();
  });
  paint();
  return {
    get active() {
      return active;
    },
    stop() {
      active = false;
      demo.stop();
    },
  };
}

const freshEvents = (snap, first) => (first ? [] : snap.feed.filter((e) => !store.seen.has(e.id) && Date.now() - Date.parse(e.at) < 3 * 60_000).reverse());

// ---- home: the office, full screen ---------------------------------------------------------------

const home = {
  office: null,
  demo: null,
  simAgents: null,
  first: true,
  build() {
    document.documentElement.classList.add('immersive');
    dock.setVisible(false);
    $('#view').innerHTML = `<div class="home" id="home"><div id="home-office"></div>
      <div class="hud hud-status" id="hud-status"><i class="live-dot"></i><span></span></div>
      <div class="hud hud-demo" id="hud-demo"></div></div>`;
    home.office = mountOffice($('#home-office'), { roster: roster(), immersive: true, onOpen: (name) => home.card(name) });
    home.demo = attachDemo({
      office: home.office,
      controls: $('#hud-demo'),
      onFrame: (agents) => {
        home.simAgents = agents;
        $('#hud-status').classList.remove('on');
        $('#hud-status span').textContent = 'Demo · a simulated task, no agent is running';
      },
      onEnd: () => {
        home.first = true;
        home.update(store.snap);
      },
    });
    $('#home').addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || !e.target.closest('.o-actor, .o-pop, .hud')) home.office?.hideCard();
    });
    const h = $('#home');
    h.scrollLeft = (h.scrollWidth - h.clientWidth) / 2; // portrait phones start at the middle of the room
    home.first = true;
  },
  card(name) {
    const list = home.demo.active ? home.simAgents : store.snap?.agents;
    const a = list?.find((x) => x.name === name) || { status: 'idle' };
    const st = normalizeState(a.status);
    home.office.showCard(name, `<h3>${esc(identityFor(name).name)}</h3><p>${esc(agentName(name))} · <b>${esc(STATUS[st])}</b>${home.demo.active ? ' (simulation)' : ''}</p>${a.doing ? `<p>${esc(a.doing)}</p>` : `<p>${esc(identityFor(name).personality)}</p>`}<div class="pop-row"><a href="#/agent/${esc(name)}">Open its page</a><button type="button" data-close>Close</button></div>`);
  },
  update(snap) {
    if (!home.office || home.demo.active) return;
    $('#hud-status').classList.toggle('on', !!snap.live);
    $('#hud-status span').textContent = snap.live ? `Live · ${snap.running?.title || snap.running?.id || 'a task is running'}` : `All quiet · ${snap.agents.length} gems with no work, free to roam`;
    home.office.update({ agents: snap.agents, events: freshEvents(snap, home.first), kpis: snap.kpis, running: snap.running });
    home.first = false;
  },
  leave() {
    document.documentElement.classList.remove('immersive', 'nav-open');
    dock.setVisible(true);
    home.demo?.stop();
    home.office?.destroy();
    home.office = null;
  },
};

// ---- working: the office with its lists ----------------------------------------------------------

const working = {
  office: null,
  demo: null,
  first: true,
  build() {
    $('#view').innerHTML = `
    <div class="office-bar">
      <div><h1>Working</h1><p class="muted" id="w-sub"></p></div>
      <span class="spacer"></span>
      <div id="w-demo"></div>
      <a class="chip-btn" href="#/gems">Gem gallery</a>
    </div>
    <div id="office-host"></div>
    <div class="office-side">
      <section class="card"><div class="sec-h"><h2>Who's doing what</h2><span class="muted tiny" id="w-count"></span></div><ul class="who" id="who"></ul></section>
      <section class="card"><div class="sec-h"><h2>Live feed</h2><a href="#/logs">All logs</a></div><ol class="feed" id="w-feed"></ol></section>
    </div>`;
    const open = (name) => {
      location.hash = `#/agent/${name}`;
    };
    working.office = mountOffice($('#office-host'), { roster: roster(), onOpen: open });
    $('#who').innerHTML = roster().map((a) => `<li><button type="button" data-agent="${esc(a.name)}">${avatarHTML(a.name, { mode: 'badge', size: 'sm', status: a.status })}<span class="who-t"><span class="who-n">${esc(identityFor(a.name).name)}</span> <span class="muted tiny">${esc(agentName(a.name))}</span><span class="who-d"></span></span><span class="st-pill"></span></button></li>`).join('');
    mountAvatars($('#who'));
    $('#who').addEventListener('click', (e) => {
      const b = e.target.closest('[data-agent]');
      if (b) open(b.dataset.agent);
    });
    working.demo = attachDemo({
      office: working.office,
      controls: $('#w-demo'),
      onFrame: (agents, f) => {
        working.paintWho(agents, true);
        $('#w-sub').textContent = 'Demo: a simulated task. No agent is running and nothing is saved.';
        if (f.reset) $('#w-feed').innerHTML = '';
        if (f.events.length) $('#w-feed').insertAdjacentHTML('afterbegin', f.events.map((e) => feedItem({ ...e, text: `[Simulation] ${e.text}` }, true)).join(''));
      },
      onEnd: () => {
        working.first = true;
        working.update(store.snap);
      },
    });
    working.first = true;
  },
  paintWho(agents, simulated = false) {
    for (const a of agents) {
      const b = $(`#who [data-agent="${CSS.escape(a.name)}"]`);
      if (!b) continue;
      const st = normalizeState(a.status);
      setAvatarStatus($('.gem', b), st, { agentLabel: agentName(a.name), doing: a.doing });
      $('.st-pill', b).className = `st-pill st-${st}`;
      $('.st-pill', b).textContent = STATUS[st];
      $('.who-d', b).textContent = a.doing || (st === 'idle' ? 'At the desk' : '');
    }
    const busy = agents.filter((a) => ['working', 'researching'].includes(normalizeState(a.status))).length;
    $('#w-count').textContent = `${busy} working${simulated ? ' (simulated)' : ''}`;
  },
  update(snap) {
    if (!working.office || working.demo.active) return;
    working.office.update({ agents: snap.agents, events: freshEvents(snap, working.first), kpis: snap.kpis, running: snap.running });
    working.first = false;
    working.paintWho(snap.agents);
    $('#w-sub').textContent = snap.live ? `${snap.running?.id}: ${snap.running?.title}` : 'No task is running. The gems roam the office until you give the team one; whoever gets work goes to its desk.';
    $('#w-feed').innerHTML = snap.feed.slice(0, 20).map((e) => feedItem(e, !store.seen.has(e.id) && store.primed)).join('');
  },
  leave() {
    working.demo?.stop();
    working.office?.destroy();
    working.office = null;
  },
};

const gemsView = {
  gallery: null,
  build() {
    $('#view').innerHTML = '<div id="gallery"></div>';
    gemsView.gallery = createGallery($('#gallery'));
  },
  leave() {
    gemsView.gallery?.destroy();
  },
};

// The pop-out window's view: every gem, nothing else.
const floatView = {
  build() {
    document.documentElement.classList.add('float-mode');
    dock.setVisible(false);
    $('#view').innerHTML = `<div class="float-view" id="float">${roster().map((a) => `<a class="dock-item" href="#/agent/${esc(a.name)}" target="subegems-main" data-agent="${esc(a.name)}">${avatarHTML(a.name, { mode: 'full', size: 76, status: a.status })}<span class="dock-name">${esc(identityFor(a.name).name)}</span><span class="dock-st"></span></a>`).join('')}</div>`;
    mountAvatars($('#float'));
  },
  update(snap) {
    for (const a of snap.agents) {
      const item = $(`#float [data-agent="${CSS.escape(a.name)}"]`);
      if (!item) continue;
      const st = normalizeState(a.status);
      setAvatarStatus($('.gem', item), st, { agentLabel: agentName(a.name), doing: a.doing });
      $('.dock-st', item).className = `dock-st st-${st}`;
      $('.dock-st', item).textContent = STATUS[st];
    }
  },
  leave() {
    document.documentElement.classList.remove('float-mode');
    dock.setVisible(true);
  },
};

// ---- questions for you: what the team's reports ask, as cards to answer ----------------------------------

const questionsView = {
  showOlder: false,
  build() {
    $('#view').innerHTML = `<div class="page-h"><h1>Questions for you</h1><p class="muted">What the team asked in its reports. Answer with a tap or in your own words; you can lift a lead's hold with your answer. Answers are saved here; <b>Send answers to the team</b> starts one task that applies them.</p></div>
      <div class="q-bar" id="q-bar"></div><div id="q-list"></div><div id="q-older"></div>`;
    $('#view').addEventListener('click', (e) => {
      const pick = e.target.closest('[data-pick]');
      if (pick) {
        const card = pick.closest('.q-card');
        for (const b of card.querySelectorAll('[data-pick]')) b.setAttribute('aria-pressed', String(b === pick && b.getAttribute('aria-pressed') !== 'true'));
        return;
      }
      const save = e.target.closest('[data-save]');
      if (save) return questionsView.save(save.closest('.q-card'), save);
      const send = e.target.closest('[data-send]');
      if (send) return questionsView.post(send, '/api/questions/send', {});
      const dismiss = e.target.closest('[data-dismiss]');
      if (dismiss) return questionsView.post(dismiss, '/api/questions/dismiss', { ids: dismiss.dataset.dismiss.split(',') });
      const older = e.target.closest('[data-older]');
      if (older) {
        questionsView.showOlder = !questionsView.showOlder;
        questionsView.update(store.snap);
      }
      return undefined;
    });
  },
  async post(button, path, body) {
    const label = button.textContent;
    button.disabled = true;
    try {
      toast((await api(path, { ...body, by: 'a person on the page' })).message);
    } catch (error) {
      toast(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  },
  save(card, button) {
    const choice = card.querySelector('[data-pick][aria-pressed="true"]')?.dataset.pick || '';
    const note = card.querySelector('textarea').value;
    const release = [...card.querySelectorAll('[data-release]:checked')].map((c) => c.dataset.release);
    if (!choice && !note.trim()) return toast('Tap an answer or write one first.', true);
    return questionsView.post(button, '/api/questions/answer', { id: card.dataset.q, choice, note, release });
  },
  card(q) {
    const leads = q.leads.filter((l) => l.held);
    const answered = q.answer && !q.answer.dismissed;
    const head = `<div class="q-top"><code>${esc(q.task)}</code>${q.due ? `<span class="pill ${q.due <= new Date().toISOString().slice(0, 10) ? 'p-failed' : 'p-needs_approval'}">Answer by ${esc(q.due)}</span>` : ''}${answered ? `<span class="pill p-done">Answered${q.answer.sent ? ', sent to the team' : ''}</span>` : ''}<a href="#" data-file="${esc(q.report)}">report</a></div><h3>${esc(q.title)}</h3>`;
    const detail = `<details class="q-detail"${answered ? '' : ' open'}><summary>Details</summary><p>${esc(q.text)}</p></details>`;
    if (answered) {
      return `<article class="q-card done" data-q="${esc(q.id)}">${head}${detail}<p class="q-answer"><b>${esc(q.answer.choice || 'Answer')}</b>${q.answer.note ? `: ${esc(q.answer.note)}` : ''}<span class="muted tiny"> · ${esc(q.answer.by)}, ${esc(ago(q.answer.at))}${q.answer.released.length ? ` · hold lifted on ${q.answer.released.length} lead(s)` : ''}</span></p></article>`;
    }
    const picks = q.options.length
      ? `<div class="q-picks">${q.options.map((o) => `<button type="button" class="q-pick" data-pick="${esc(o.label)}" aria-pressed="false"><b>${esc(o.label)}</b><span>${esc(o.detail)}</span></button>`).join('')}</div>`
      : '';
    const holds = leads.length ? `<div class="q-holds">${leads.map((l) => `<label class="check"><input type="checkbox" data-release="${esc(l.id)}"> Lift the hold on <b>${esc(l.company)}</b></label>`).join('')}</div>` : '';
    return `<article class="q-card" data-q="${esc(q.id)}">${head}${detail}${picks}<textarea rows="2" placeholder="${q.options.length ? 'Add a note (optional)' : 'Your answer'}"></textarea>${holds}<div class="q-actions"><button type="button" class="primary small" data-save>Save answer</button><button type="button" class="ghost small" data-dismiss="${esc(q.id)}">Not relevant</button></div></article>`;
  },
  update(snap) {
    const s = snap.questions || { questions: [] };
    const current = s.questions.filter((q) => q.recent && !q.answer?.dismissed);
    const older = s.questions.filter((q) => !q.recent && !q.answer);
    $('#q-bar').innerHTML = `<span><b>${s.open}</b> open</span>${s.unsent ? `<button type="button" class="primary" data-send>Send ${s.unsent} answer${s.unsent === 1 ? '' : 's'} to the team</button>` : '<span class="muted">Answers you save here wait until you send them.</span>'}`;
    // Keep what someone is typing: only redraw when the questions themselves change.
    const sig = JSON.stringify(current.map((q) => [q.id, q.answer?.at]));
    if (questionsView.sig !== sig) {
      questionsView.sig = sig;
      $('#q-list').innerHTML = current.length ? current.map((q) => questionsView.card(q)).join('') : '<section class="card"><p class="muted">No open questions from the last few days.</p></section>';
    }
    $('#q-older').innerHTML = older.length
      ? `<div class="q-older-bar"><button type="button" class="ghost small" data-older>${questionsView.showOlder ? 'Hide' : 'Show'} ${older.length} older question${older.length === 1 ? '' : 's'}</button><button type="button" class="ghost small" data-dismiss="${esc(older.map((q) => q.id).join(','))}">Dismiss all older</button></div>${questionsView.showOlder ? older.map((q) => questionsView.card(q)).join('') : ''}`
      : '';
  },
};

// ---- the offices: choose an office, and each office's live map ---------------------------------------

// Who works in an office right now, from the page's state.
const officeAgents = (office, snap) => (snap?.agents ?? []).filter((a) => Object.hasOwn(office.seats, a.name));
const BUSY = new Set(['working', 'researching', 'waiting']);

const officesView = {
  build() {
    $('#view').innerHTML = `<div class="offices-page">
      <div class="offices-hero">${lockupSvg('brand-logo', BRAND.name)}<h1>Choose your office</h1><p>Each office is a team of agents with its own floor. Walk in to watch them work.</p></div>
      <div class="offices-grid">${OFFICES.map((o) => {
        const map = MAPS[o.map];
        const team = Object.keys(o.seats);
        const crew = o.crew || [];
        const faces = team.length ? team.slice(0, 5).map((n) => avatarHTML(n, { size: 'xs', mode: 'badge' })).join('') : crew.slice(0, 5).map((c) => `<img src="${badgeOf(c.look)}" alt="${esc(c.name)}" title="${esc(`${c.name}, ${c.role}`)}">`).join('');
        return `<article class="office-card" data-office="${esc(o.id)}">
          <div class="office-pic"><img src="/${esc(map.thumb)}" alt="${esc(map.name)} map" loading="lazy"><span class="office-badge${team.length ? '' : ' soon'}" data-badge>${team.length ? 'Open' : 'Ready for a team'}</span><span class="office-faces">${faces}</span></div>
          <div class="office-body"><div class="office-team">${esc(o.team)}</div><h2>${esc(o.name)}</h2><p>${esc(o.blurb)}</p>
            <div class="office-stats" data-stats>${team.length ? `<span><b>${team.length}</b> agents</span>` : `${crew.length ? `<span><b>${crew.length}</b> robots in training</span><span><b>${o.planned.length - crew.length}</b> open seats</span>` : `<span><b>${o.planned.length}</b> seats planned</span>`}`}<span><b>${map.rooms.filter((r) => r.kind !== 'other').length}</b> rooms</span></div>
            <div class="office-go"><a class="primary" href="#/world/${esc(o.id)}">Enter the office</a>${o.classic ? '<a href="#/">2D and 3D view</a>' : ''}</div></div>
        </article>`;
      }).join('')}</div>
      <p class="offices-note">New teams get their own office: the next ones are the developers and the social media interns.</p></div>`;
    for (const card of $$('.office-card')) card.style.setProperty('--oc', officeById(card.dataset.office).accent);
    mountAvatars($('#view'));
  },
  update(snap) {
    for (const o of OFFICES) {
      const card = $(`.office-card[data-office="${o.id}"]`);
      if (!card || !Object.keys(o.seats).length) continue;
      const busy = officeAgents(o, snap).filter((a) => BUSY.has(normalizeState(a.status))).length;
      const badge = card.querySelector('[data-badge]');
      badge.textContent = busy ? `${busy} working now` : 'Open';
      badge.classList.toggle('live', busy > 0);
    }
  },
};

// Map or 3D, remembered per office. Only offices with a 3D view (offices.js: view3d) offer the switch.
const MODE_KEY = (id) => `world.mode.${id}`;
const savedMode = (office) => {
  if (!office.view3d || !webgl3dAvailable()) return 'map';
  try {
    return localStorage.getItem(MODE_KEY(office.id)) || '3d';
  } catch {
    return '3d';
  }
};

const worldView = {
  world: null,
  office: null,
  mode: 'map',
  build(id) {
    const office = officeById(id) || OFFICES[0];
    const map = MAPS[office.map];
    worldView.office = office;
    const team = Object.keys(office.seats);
    $('#view').innerHTML = `<div class="world-page">
      <div class="world-bar"><h1>${esc(office.name)}</h1><span class="office-team">${esc(office.team)}</span>
        ${office.view3d ? '<div class="world-mode" role="group" aria-label="View"><button type="button" data-mode="map">Map</button><button type="button" data-mode="3d">3D</button></div>' : ''}
        <nav class="world-switch" aria-label="Offices">${OFFICES.map((o) => `<a href="#/world/${esc(o.id)}" class="${o.id === office.id ? 'on' : ''}">${esc(o.name)}</a>`).join('')}<a href="#/offices">All offices</a>${office.classic ? '<a href="#/">2D and 3D view</a>' : ''}</nav></div>
      ${team.length ? '' : `<div class="world-note">This office is ready for the <b>${esc(office.team.toLowerCase())}</b> team.${office.crew?.length ? ` Its robot crew shows how it will work: ${office.crew.map((c) => `${esc(c.name)} (${esc(roleText(c.role))})`).join(', ')}. They have no skills or tasks yet.` : ''} ${office.planned.length > (office.crew?.length || 0) ? `The dashed seats are the other planned roles: ${office.planned.filter((p) => !office.crew?.some((c) => c.role === p.role)).map((p) => esc(p.role)).join(', ')}.` : ''}</div>`}
      <div class="world-map" id="world-map"></div></div>`;
    $('.world-page').style.setProperty('--oc', office.accent);
    $('.world-mode')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b || b.dataset.mode === worldView.mode) return;
      try {
        localStorage.setItem(MODE_KEY(office.id), b.dataset.mode);
      } catch {
        // private window: the choice lasts until the page closes
      }
      worldView.show(b.dataset.mode);
    });
    // The gate plays when you walk in from another page; on the first load the opening animation plays instead.
    worldView.gate = performance.now() > 4000 ? playGate({ title: office.name, sub: `Opening the ${map.name.toLowerCase()}` }) : null;
    worldView.show(savedMode(office));
  },
  // Puts the map or the 3D office in the page, replacing whichever was there.
  async show(mode) {
    const office = worldView.office;
    const map = MAPS[office.map];
    worldView.world?.destroy();
    worldView.world = null;
    worldView.mode = mode;
    for (const b of $$('.world-mode [data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    const opts = { office, map, label: agentName, onOpen: (name) => { location.hash = `#/agent/${name}`; } };
    const ready = () => {
      worldView.gate?.ready();
      worldView.gate = null;
    };
    if (mode === '3d') {
      try {
        const view = await createWorld3D($('#world-map'), opts);
        if (worldView.mode !== '3d' || worldView.office !== office || !$('#world-map')) return view.destroy(); // left meanwhile
        worldView.world = view;
        view.update(officeAgents(office, store.snap));
        ready();
        return undefined;
      } catch (error) {
        toast(`The 3D office couldn't start (${error.message}), so here is the map.`, true);
        worldView.mode = 'map';
        for (const b of $$('.world-mode [data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === 'map'));
      }
    }
    worldView.world = createWorld($('#world-map'), opts);
    worldView.world.update(officeAgents(office, store.snap));
    const img = $('#world-map .wv-map');
    if (img.complete) ready();
    else img.addEventListener('load', ready, { once: true });
    return undefined;
  },
  update(snap) {
    worldView.world?.update(officeAgents(worldView.office, snap));
  },
  leave() {
    worldView.world?.destroy();
    worldView.world = null;
    worldView.gate?.ready();
    worldView.gate = null;
  },
};

// ---- Posts: be where buyers ask --------------------------------------------------------------------
// Two tabs. Posts: social posts the marketing agent drafted; a tick approves one that passed review (then Copy text and a
// link to the channel's compose page appear), a cross declines it, and "Mark posted" records that a person posted it.
// Conversations: public posts where people ask for what the product does, each with a suggested reply to copy.
// Nothing is posted from here or by any agent: the page only helps a person post by hand.
const PO_FILTERS = {
  posts: [['pending', 'To decide'], ['approved', 'Ready to post'], ['posted', 'Posted'], ['declined', 'Declined'], ['all', 'All']],
  conversations: [['new', 'New'], ['posted', 'Replied'], ['skipped', 'Skipped'], ['all', 'All']],
};
const PO_LABEL = { pending: 'Waiting for you', approved: 'Ready to post', posted: 'Posted', declined: 'Declined', waiting: 'In review', new: 'New', skipped: 'Skipped' };
const PO_PILL = { pending: 'p-needs_approval', approved: 'p-queued', posted: 'p-done', declined: 'p-failed', waiting: 'p-running', new: 'p-needs_approval', skipped: 'p-new' };
const safeHref = (url) => (/^https?:\/\/[^\s"'<>]+$/i.test(String(url || '')) ? String(url) : '');

async function copyToClipboard(button, text, what) {
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied ✓';
    toast(`${what} copied.`);
    setTimeout(() => { if (button.isConnected) button.textContent = label; }, 1800);
  } catch {
    toast("Couldn't copy. Select the text on the page and copy it yourself.", true);
  }
}

async function decidePostItem(button, id, decision, note = '') {
  const card = button.closest('.po-card');
  const buttons = card ? [...card.querySelectorAll('button')] : [button];
  card?.classList.add('busy');
  for (const b of buttons) b.disabled = true;
  try {
    const r = await api('/api/posts/decide', { id, decision, note, by: 'a person on the page' });
    toast(r.message);
    postsView.marking = null;
    postsView.link = '';
  } catch (error) {
    toast(error.message, true);
    card?.classList.remove('busy');
    for (const b of buttons) b.disabled = false;
  }
}

const postsView = {
  tab: 'posts',
  filter: { posts: 'pending', conversations: 'new' },
  open: new Set(),
  marking: null, // the id of the card whose "Mark posted" link box is open
  link: '',
  build() {
    postsView.marking = null;
    postsView.link = '';
    $('#view').innerHTML = `<div class="page-h"><h1>Posts</h1><p class="muted">Be where buyers ask. <b>Posts</b> are what the marketing agent drafted; <b>Conversations</b> are public posts where people ask for what our products do, each with a suggested reply. Nothing is posted for you, by this page or by any agent: copy the text, post it yourself, then mark it posted. Only a post that passed review can be approved.</p></div>
      <div id="po-root">
        <div class="po-bar"><div class="po-tabs" role="tablist" aria-label="Posts or conversations">${[['posts', 'Posts'], ['conversations', 'Conversations']].map(([k, label]) => `<button type="button" role="tab" data-ptab="${k}">${label} <b data-pn="${k}"></b></button>`).join('')}</div></div>
        <div class="po-filters" id="po-filters" role="group" aria-label="Show"></div>
        <div class="po-list" id="po-list"></div>
      </div>`;
    const root = $('#po-root');
    root.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-ptab]');
      if (tab) {
        postsView.tab = tab.dataset.ptab;
        postsView.marking = null;
        postsView.update(store.snap);
        return;
      }
      const filter = e.target.closest('[data-pfilter]');
      if (filter) {
        postsView.filter[postsView.tab] = filter.dataset.pfilter;
        postsView.marking = null;
        postsView.update(store.snap);
        return;
      }
      const card = e.target.closest('.po-card');
      const id = card?.dataset.id;
      const b = e.target.closest('button[data-do]');
      if (!card || !b) return;
      const snap = store.snap?.posts || {};
      const item = [...(snap.posts || []), ...(snap.conversations || [])].find((x) => x.id === id);
      const act = b.dataset.do;
      if (act === 'more') {
        if (postsView.open.has(id)) postsView.open.delete(id);
        else postsView.open.add(id);
        card.classList.toggle('open', postsView.open.has(id));
        b.textContent = postsView.open.has(id) ? 'Show less' : 'Read all';
      } else if (act === 'copy-text') copyToClipboard(b, item?.text || '', 'The post');
      else if (act === 'copy-comment') copyToClipboard(b, item?.comment || '', 'The first comment');
      else if (act === 'copy-reply') copyToClipboard(b, item?.reply || '', 'The reply');
      else if (act === 'mark') {
        postsView.marking = id;
        postsView.link = '';
        postsView.update(store.snap);
        $(`.po-card[data-id="${CSS.escape(id)}"] .po-link`)?.focus();
      } else if (act === 'cancel') {
        postsView.marking = null;
        postsView.update(store.snap);
      } else if (act === 'save') decidePostItem(b, id, 'posted', postsView.link.trim());
      else if (['approve', 'decline', 'skip'].includes(act)) decidePostItem(b, id, act);
    });
    root.addEventListener('input', (e) => {
      if (e.target.matches('.po-link')) postsView.link = e.target.value;
    });
    root.addEventListener('keydown', (e) => {
      if (!e.target.matches('.po-link')) return;
      if (e.key === 'Enter') decidePostItem(e.target, e.target.closest('.po-card').dataset.id, 'posted', postsView.link.trim());
      if (e.key === 'Escape') {
        e.stopPropagation();
        postsView.marking = null;
        postsView.update(store.snap);
      }
    });
  },
  update(snap) {
    const data = snap?.posts || { posts: [], conversations: [], counts: {} };
    const tab = postsView.tab;
    const items = data[tab] || [];
    const wanted = postsView.filter[tab];
    const shown = wanted === 'all' ? items : items.filter((x) => x.state === wanted);
    for (const b of $$('[data-ptab]')) {
      b.setAttribute('aria-selected', String(b.dataset.ptab === tab));
      const waiting = b.dataset.ptab === 'posts' ? data.counts?.posts : data.counts?.conversations;
      $(`[data-pn="${b.dataset.ptab}"]`).textContent = waiting || '';
    }
    // The person is typing a link: a live update must not rebuild the box under them.
    if (postsView.marking && $('#po-list .po-link:focus')) return;
    $('#po-filters').innerHTML = PO_FILTERS[tab].map(([k, label]) => {
      const n = k === 'all' ? items.length : items.filter((x) => x.state === k).length;
      return `<button type="button" data-pfilter="${k}" aria-pressed="${k === wanted}">${label}${n ? ` <b>${n}</b>` : ''}</button>`;
    }).join('');
    const empty = {
      posts: { pending: 'No post is waiting for you. The marketing agent drafts new ones every Monday; they appear here once they pass review.', approved: 'No approved post is waiting to be posted.', posted: 'Nothing marked posted yet.', declined: 'Nothing declined.', all: 'No posts drafted yet.' },
      conversations: { new: 'No new conversations. The buyer-intent watch looks for them every night.', posted: 'You have not marked any reply as posted yet.', skipped: 'Nothing skipped.', all: 'No conversations found yet.' },
    }[tab][wanted];
    $('#po-list').innerHTML = shown.length ? shown.map((x) => (tab === 'posts' ? postCard(x) : talkCard(x))).join('') : `<p class="muted po-empty">${esc(empty)}</p>`;
  },
};

// The box a person types the link to their own post in. It is optional.
const markBox = (id) => (postsView.marking === id
  ? `<div class="po-mark"><label class="sr" for="po-link-${esc(id)}">Link to your post (optional)</label><input class="po-link" id="po-link-${esc(id)}" type="url" placeholder="Link to your post (optional)" value="${esc(postsView.link)}" autocomplete="off"><button type="button" class="primary small" data-do="save">Save</button><button type="button" class="ghost small" data-do="cancel">Cancel</button></div>`
  : '');

function postCard(p) {
  const open = postsView.open.has(p.id);
  const over = p.limit && p.chars > p.limit;
  const compose = safeHref(p.compose);
  let acts = '';
  if (p.state === 'pending') acts = `<button type="button" class="po-yes" data-do="approve" title="Approve" aria-label="Approve the ${esc(p.label)} post">✓</button><button type="button" class="po-no" data-do="decline" title="Decline: don't post" aria-label="Decline the ${esc(p.label)} post">✗</button>`;
  else if (p.state === 'waiting') acts = `<button type="button" class="po-no" data-do="decline" title="Decline: don't post" aria-label="Decline the ${esc(p.label)} post">✗</button>`;
  else if (p.state === 'declined' && p.gate === 'ready') acts = `<button type="button" class="po-yes po-small" data-do="approve" aria-label="Approve the ${esc(p.label)} post after all">✓ Approve after all</button>`;
  const post = p.state === 'approved'
    ? `<div class="po-post"><button type="button" class="primary small" data-do="copy-text">Copy text</button>${p.comment ? '<button type="button" class="small" data-do="copy-comment">Copy first comment</button>' : ''}${compose ? `<a class="po-open" href="${esc(compose)}" target="_blank" rel="noopener noreferrer">Open ${esc(p.label)} ↗</a>` : ''}<button type="button" class="small" data-do="mark">Mark posted</button></div>${markBox(p.id)}`
    : p.state === 'posted' && p.link && safeHref(p.link) ? `<div class="po-post"><a class="po-open" href="${esc(safeHref(p.link))}" target="_blank" rel="noopener noreferrer">Open the post ↗</a></div>` : '';
  const review = p.review ? `${verdictChip(p.review.verdict, p.review.score)}${p.review.stale ? '<span class="muted tiny">changed since</span>' : ''}` : '<span class="pill p-new">Not reviewed</span>';
  return `<article class="po-card s-${esc(p.state)}${open ? ' open' : ''}" data-id="${esc(p.id)}">
    <header class="po-head"><span class="po-ch">${esc(p.label)}</span><span class="muted tiny">${esc(p.date)}${p.product ? ` · ${esc(p.product)}` : ''}</span><span class="pill ${PO_PILL[p.state] || ''}">${esc(PO_LABEL[p.state] || p.state)}</span>${review}<span class="po-act">${acts}</span></header>
    ${p.title ? `<div class="po-title">${esc(p.title)}</div>` : ''}
    <div class="po-text">${esc(p.text)}</div>
    ${p.comment ? `<div class="po-comment"><span class="muted tiny">First comment</span><div>${esc(p.comment)}</div></div>` : ''}
    <div class="po-foot"><button type="button" class="link" data-do="more">${open ? 'Show less' : 'Read all'}</button><span class="tiny${over ? ' bad-text' : ' muted'}">${p.chars}${p.limit ? ` / ${p.limit}` : ''} characters</span><span class="muted tiny">${esc(p.why)}${p.at && ['approved', 'declined', 'posted'].includes(p.state) ? ` · ${esc(ago(p.at))}` : ''}</span>${p.review ? `<a href="#" class="tiny" data-file="${esc(p.review.file)}">review notes</a>` : ''}</div>
    ${post}
  </article>`;
}

function talkCard(c) {
  const url = safeHref(c.url);
  const actions = c.state === 'new' || c.state === 'skipped'
    ? `<div class="po-post">${c.reply ? '<button type="button" class="primary small" data-do="copy-reply">Copy reply</button>' : ''}${url ? `<a class="po-open" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open the post ↗</a>` : ''}<button type="button" class="small" data-do="mark">Mark posted</button>${c.state === 'new' ? '<button type="button" class="ghost small" data-do="skip">Skip</button>' : ''}</div>${markBox(c.id)}`
    : `<div class="po-post">${url ? `<a class="po-open" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open the post ↗</a>` : ''}${c.link && safeHref(c.link) ? `<a class="po-open" href="${esc(safeHref(c.link))}" target="_blank" rel="noopener noreferrer">Your reply ↗</a>` : ''}</div>`;
  return `<article class="po-card s-${esc(c.state)}" data-id="${esc(c.id)}">
    <header class="po-head"><span class="po-ch">${esc(c.where || 'Web')}</span><span class="muted tiny">${c.posted ? `posted ${esc(c.posted)} · ` : ''}found ${esc(c.date)}</span><span class="pill ${PO_PILL[c.state] || ''}">${esc(PO_LABEL[c.state] || c.state)}</span>${c.review ? verdictChip(c.review.verdict, c.review.score) : ''}</header>
    ${c.title ? `<div class="po-title">${esc(c.title)}</div>` : ''}
    ${c.quote ? `<blockquote class="po-quote">${esc(c.quote)}</blockquote>` : ''}
    ${c.fit ? `<p class="po-fit"><span class="muted tiny">Why it fits</span> ${esc(c.fit)}</p>` : ''}
    ${c.reply ? `<div class="po-reply"><span class="muted tiny">Suggested reply</span><div class="po-reply-text">${esc(c.reply)}</div></div>` : '<p class="muted tiny">No suggested reply was written for this one.</p>'}
    <div class="po-foot"><span class="muted tiny">${esc(c.why)}${c.state !== 'new' && c.at ? ` · ${esc(ago(c.at))}` : ''}</span></div>
    ${actions}
  </article>`;
}

// ---- routing and the stream ----------------------------------------------------------------------

const VIEWS = { offices: officesView, world: worldView, questions: questionsView, home, working, team: teamView, overview, logs, leads: leadsView, outreach: outreachView, emails: emailsView, reports: reportsView, flags: flagsView, agent: agentView, gems: gemsView, float: floatView };
let current = '';
VIEWS.posts = postsView;

function route() {
  const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
  return { page: VIEWS[page] ? page : 'home', arg: decodeURIComponent(arg || '') };
}

// KPI numbers count up from their last value instead of jumping.
const kpiPrev = new Map();
function countKpis(root) {
  for (const box of root.querySelectorAll('.kpi')) {
    const v = box.querySelector('.kpi-v');
    const label = box.querySelector('.kpi-l')?.textContent || '';
    const to = Number(v.textContent);
    if (!Number.isInteger(to)) continue;
    const from = kpiPrev.get(label) ?? 0;
    kpiPrev.set(label, to);
    if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) continue;
    if (from !== 0) box.classList.add('kpi-bump');
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 700);
      v.textContent = String(Math.round(from + (to - from) * (1 - (1 - p) ** 3)));
      if (p < 1 && v.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

function render() {
  if (!store.snap) return;
  const r = route();
  const key = `${r.page}/${r.arg}`;
  if (key !== current) {
    VIEWS[current.split('/')[0]]?.leave?.();
    current = key;
    VIEWS[r.page].build(r.arg);
    window.scrollTo(0, 0);
    // Rows and cards animate in only while a page is new, not on every live update.
    const view = $('#view');
    view.classList.add('entering');
    clearTimeout(view.entering);
    view.entering = setTimeout(() => view.classList.remove('entering'), 1200);
  }
  VIEWS[r.page].update?.(store.snap, r.arg);
  countKpis($('#view'));
  markNav();
}

// ---- what to tell a person: chips in the top bar, a toast and a sound when something changes --------------

const watchState = { left: null, budgetTask: null, stuck: new Set() };

// The stuck-agent chip and the time-budget chip. Also runs on a timer: time passes without any new state.
function watchTick() {
  const snap = store.snap;
  if (!snap) return;
  const stuck = stuckAgents(snap);
  const chip = $('#top-stuck');
  chip.hidden = !stuck.length;
  if (stuck.length) {
    chip.href = `#/agent/${stuck[0].name}`;
    chip.textContent = stuck.length === 1 ? `${agentName(stuck[0].name)}: no new step for ${stuck[0].minutes} min` : `${stuck.length} agents with no new step for ${STUCK_MIN}+ min`;
  }
  for (const s of stuck) {
    if (watchState.stuck.has(s.name)) continue;
    watchState.stuck.add(s.name);
    toast(`${agentName(s.name)} has shown no new step for ${s.minutes} minutes${s.doing ? ` (last: ${s.doing})` : ''}. It may be stuck on a slow page or a long check.`, true);
    chime('ping');
  }
  for (const name of [...watchState.stuck]) if (!stuck.some((s) => s.name === name)) watchState.stuck.delete(name);

  const b = taskBudget(snap);
  const box = $('#top-budget');
  box.hidden = !b;
  if (!b) {
    watchState.left = null;
    watchState.budgetTask = null;
    return;
  }
  if (watchState.budgetTask !== b.id) {
    watchState.budgetTask = b.id;
    watchState.left = null;
  }
  box.className = `top-budget ${b.level}`;
  box.title = `Tasks usually take about ${b.budget} minutes (the last ten finished tasks)`;
  box.innerHTML = `<span>${b.left >= 0 ? `${b.elapsed} of ${b.budget} min` : `${-b.left} min over`}</span><i><b></b></i>`;
  box.querySelector('b').style.width = `${Math.min(100, (b.elapsed / b.budget) * 100)}%`;
  const warn = budgetWarning(watchState.left, b.left);
  if (warn !== null) {
    toast(warn === 0 ? `${b.id} has gone past the usual ${b.budget} minutes.` : `${b.id}: about ${warn} minute${warn === 1 ? '' : 's'} left of the usual ${b.budget}.`, warn === 0);
    chime('ping');
  }
  watchState.left = b.left;
}

// Chimes and toasts for changes between two states.
function announceChanges(prev, snap) {
  if (!prev) return;
  if (prev.live && prev.running && (!snap.live || snap.running?.id !== prev.running.id)) {
    const done = snap.tasks?.find((t) => t.id === prev.running.id);
    toast(`${prev.running.id} ${done?.status === 'failed' ? 'stopped with a problem' : 'finished'}. Its report is ready.`, done?.status === 'failed');
    chime('done');
  }
  const ready = (s) => s?.outreach?.ready || 0;
  if (ready(snap) > ready(prev)) {
    toast(`${ready(snap) - ready(prev)} draft(s) passed review and wait for your approval on the Outreach page.`);
    chime('attention');
  }
  const asked = (s) => s?.questions?.open || 0;
  if (asked(snap) > asked(prev)) {
    toast(`The team has ${asked(snap) - asked(prev)} new question(s) for you.`);
    chime('attention');
  }
}
setInterval(watchTick, 20_000);

function onState(snap) {
  if (snap.error) return toast(`The page couldn't read the team's files: ${snap.error}`, true);
  const prev = store.snap;
  store.snap = snap;
  announceChanges(prev, snap);
  watchTick();
  updateShell(snap);
  render();
  animateNew(snap);
  if (store.primed) voice.announce(snap.feed.filter((e) => !store.seen.has(e.id) && Date.now() - Date.parse(e.at) < 3 * 60_000).reverse());
  for (const e of snap.feed) store.seen.add(e.id);
  store.primed = true;
}

function connect() {
  let polling = null;
  const poll = () => api('/api/state').then(onState).catch(() => undefined);
  const source = new EventSource('/api/stream');
  source.addEventListener('state', (e) => {
    if (polling) {
      clearInterval(polling);
      polling = null;
    }
    onState(JSON.parse(e.data));
  });
  source.onerror = () => {
    if (!polling) polling = setInterval(poll, 5000);
  };
  // Keep "3m ago" honest between updates.
  setInterval(() => store.snap && render(), 30_000);
}

if (!location.hash.startsWith('#/float')) {
  playIntro();
  // The first visit gets the tour, once the opening animation is over.
  setTimeout(() => startTour({ navigate: (hash) => { location.hash = hash; } }), 4500);
}
shell();
const dock = createDock({ onOpen: (name) => { location.hash = `#/agent/${name}`; } });
// Talk to the team: browser speech to text, then the same task endpoint as the task box.
const voice = createVoice({
  onTask: (task) => api('/api/tasks', { task }),
  onCancel: async (id) => (await api(`/api/tasks/${id}/cancel`, {})).message,
  onAsk: (question, history) => api('/api/ask', { question, history }),
  onRun: async () => (await api('/api/run', {})).message,
  onOutreach: async ({ kind, leads, drafts, emails, decision }) => (kind === 'email'
    ? await api('/api/outreach/decide', { emails, decision, by: 'voice' })
    : await api(`/api/outreach/${kind}`, kind === 'draft' ? { leads, by: 'voice' } : { drafts, by: 'voice' })).message,
  getAgents: () => store.snap?.agents,
  navigate: (hash) => {
    location.hash = hash;
  },
});
// Mission control opens on "Choose your office".
if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', '#/offices');
window.addEventListener('hashchange', render);
connect();
api('/api/state').then((s) => !store.snap && onState(s)).catch((e) => toast(e.message, true));
