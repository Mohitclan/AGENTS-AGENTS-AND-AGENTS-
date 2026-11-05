// Mission control's page. One state stream from /api/stream keeps every view current; agent pages,
// logs and documents are fetched when opened. Nothing here can send an email or approve anything:
// the only actions are giving the team a task, starting waiting tasks and cancelling a queued one.
import { avatarHTML, badgeImg, mountAvatars, setAvatarStatus } from './gems/avatar.js';
import { createDock } from './gems/dock.js';
import { createGallery } from './gems/gallery.js';
import { identityFor } from './gems/identities.js';
import { playIntro } from './gems/intro.js';
import { logoSvg } from './gems/logo.js';
import { createDemo } from './gems/simulator.js';
import { normalizeState, STATE_LABEL } from './gems/status.js';
import { createVoice } from './gems/voice.js';
import { mountOffice } from './office3d/mount.js';

// The agents' names and jobs as people read them. Their characters live in gems/identities.js.
const AGENTS = {
  coordinator: ['Coordinator', 'Plans and hands out the work'], evaluator: ['Evaluator', 'Reviews every deliverable'],
  'knowledge-base': ['Knowledge', 'Product and company facts'], researcher: ['Researcher', 'Markets, competitors, channels'],
  'lead-generator': ['Lead generator', 'Finds and scores leads'], outreach: ['Outreach', 'Drafts email sequences'],
  sales: ['Sales', 'Replies, calls, proposals'], marketing: ['Marketing', 'Positioning, content, launches'],
  'demo-handler': ['Demos', 'Demo plans and scripts'], 'docs-handler': ['Docs', 'Help docs and one-pagers'],
  developer: ['Developer', 'Fixes that block sales'], system: ['System', 'Scripts: sends, replies, checks'],
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
  if (s < 0) return 'soon';
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
    <a class="brand" href="#/">${logoSvg('brand-mark', 'panscience')}<span>panscience</span></a>
    <nav class="nav" aria-label="Pages">
      <a href="#/" data-nav="home">Home</a>
      <a href="#/working" data-nav="working">Working</a>
      <a href="#/overview" data-nav="overview">Overview</a>
      <a href="#/logs" data-nav="logs">Logs</a>
      <a href="#/leads" data-nav="leads">Leads</a>
      <a href="#/reports" data-nav="reports">Reports</a>
      <a href="#/flags" data-nav="flags">Needs you <b class="count" id="flag-count"></b></a>
      <a href="#/gems" data-nav="gems">Gem gallery</a>
    </nav>
    <div class="side-h">Agents</div>
    <nav class="agents-nav" id="agents-nav" aria-label="Agents"></nav>
    <div class="side-foot" id="usage"></div>
    <button class="ghost small" id="signout" hidden>Sign out</button>
  </aside>
  <main class="main">
    <header class="top">
      <button class="menu ghost" id="menu" aria-label="Open menu">☰</button>
      <div class="live" id="live"></div>
      <div class="top-run" id="top-run"></div>
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
  const clickable = f.kind === 'approval' ? ` data-approval-id="${esc(f.id)}" style="cursor: pointer;"` : '';
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

const agentView = {
  tab: 'work',
  build(name) {
    const l = look(name);
    $('#view').innerHTML = `
    <section class="agent-head card">
      <div class="agent-av">${avatarHTML(name, { mode: 'full', size: 'lg' })}</div>
      <div class="agent-info">
        <div class="kicker">Agent</div>
        <h1>${esc(l.label)} <span class="muted name">${esc(name)}</span></h1>
        <p class="gem-line">${esc(identityFor(name).personality)}</p>
        <p class="muted" id="ag-desc"></p>
        <div class="agent-now" id="ag-now"></div>
        <div class="tags" id="ag-tags"></div>
      </div>
      <div class="agent-stats" id="ag-stats"></div>
    </section>
    <nav class="tabs" id="ag-tabs" role="tablist">
      ${['work', 'activity', 'failures', 'tasks', 'memory'].map((t) => `<button role="tab" data-tab="${t}">${{ work: 'What it made', activity: 'Activity', failures: 'Failures', tasks: 'Tasks', memory: 'Memory and skills' }[t]}</button>`).join('')}
    </nav>
    <section class="card panel" id="ag-panel"><p class="muted">Loading…</p></section>`;
    $('#ag-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      agentView.tab = b.dataset.tab;
      agentView.paint(name);
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
    $('#ag-now').innerHTML = `<span class="st-pill st-${esc(st)}">${esc(STATUS[st])}</span> <span class="muted">${esc(identityFor(name).name)}</span>${a.backupActive ? ' <span class="pill p-failed">On backup</span>' : ''} ${a.doing ? `<span class="doing">${esc(a.doing)}</span>` : a.lastAt ? `<span class="muted">Last active ${esc(ago(a.lastAt))}</span>` : ''}`;
    $('#ag-stats').innerHTML = [['Outputs', a.counts.outputs], ['Tasks', a.counts.tasks], ['Passed reviews', a.counts.passes], ['Web lookups', a.counts.web], ['Failures (7d)', a.counts.fails]].map(([l, v]) => `<div class="mini"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
    const d = store.detail[name];
    if (d && (Date.now() - d.at > 4000) && (a.status === 'working' || a.lastAt !== d.lastAt)) {
      d.lastAt = a.lastAt;
      agentView.load(name);
    }
  },
  paint(name) {
    const d = store.detail[name];
    if (!d) return;
    $('#ag-desc').textContent = d.agent.description;
    $('#ag-tags').innerHTML = [`<span class="tag">Model: ${esc(d.agent.model || 'default')}</span>`, d.agent.hasBackup ? '<span class="tag">Has a backup agent</span>' : '', ...d.agent.canAsk.map((c) => `<span class="tag">Can ask ${esc(agentName(c))}</span>`)].join('');
    for (const b of $$('#ag-tabs [data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === agentView.tab));
    const p = $('#ag-panel');
    const tab = agentView.tab;
    if (tab === 'work') {
      const extra = name === 'lead-generator' ? leadsTable(store.snap?.leads ?? []) : '';
      p.innerHTML = `${extra}<h3>Files ${esc(agentName(name))} produced <span class="muted">(${d.outputs.length})</span></h3>${d.outputs.length ? `<div class="wide"><table class="tbl"><thead><tr><th>What</th><th>Kind</th><th>Date</th><th></th></tr></thead><tbody>${d.outputs.map((o) => `<tr><td>${o.readable ? `<a href="#" data-file="${esc(o.path)}">${esc(o.title)}</a>` : esc(o.title)}<div class="muted tiny"><code>${esc(o.path)}</code></div></td><td>${esc(o.kind)}</td><td>${esc(stamp(o.at))}</td><td>${verdictChip(o.verdict, o.score)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nothing yet.</p>'}`;
    } else if (tab === 'activity') {
      const list = d.events.filter((e) => store.filters.reads || e.kind !== 'read');
      p.innerHTML = `<div class="sec-h"><h3>Everything ${esc(agentName(name))} did <span class="muted">(${list.length})</span></h3><label class="check"><input type="checkbox" id="ag-reads" ${store.filters.reads ? 'checked' : ''}> Show file reads</label></div><ol class="feed big">${list.slice(0, 300).map((e) => feedItem(e)).join('') || '<li class="muted">No activity recorded yet.</li>'}</ol>`;
      $('#ag-reads').addEventListener('change', (e) => {
        store.filters.reads = e.target.checked;
        agentView.paint(name);
      });
    } else if (tab === 'failures') {
      p.innerHTML = `<h3>Failures and why <span class="muted">(${d.failures.length})</span></h3>${d.failures.length ? `<ol class="fails-list">${d.failures.map((e) => `<li class="fail s-${esc(e.status)}"><div class="ev-top">${chip(e.kind)}<time>${esc(stamp(e.at))}</time>${e.task ? `<code>${esc(e.task)}</code>` : ''}</div><div class="why">${esc(e.text)}</div>${e.ref ? fileLink(e.ref, 'Open the details') : ''}</li>`).join('')}</ol>` : '<p class="muted">No failures recorded.</p>'}`;
    } else if (tab === 'tasks') {
      p.innerHTML = `<h3>Tasks on the board <span class="muted">(${d.tasks.length})</span></h3>${d.tasks.length ? `<div class="wide"><table class="tbl"><thead><tr><th>Task</th><th>What</th><th>Status</th><th>Review</th><th>Updated</th></tr></thead><tbody>${d.tasks.map((t) => `<tr><td><code>${esc(t.id)}</code></td><td>${esc(t.request)}</td><td>${statusChip(t.status)}</td><td>${esc(t.review)}</td><td>${esc(t.updated)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No tasks on the board yet.</p>'}<h3>Work handed to ${esc(agentName(name))} <span class="muted">(${d.calls.length})</span></h3><ol class="feed">${d.calls.slice(0, 50).map((e) => feedItem(e)).join('') || '<li class="muted">None recorded.</li>'}</ol>`;
    } else {
      p.innerHTML = `<h3>Skills it loads</h3><div class="tags">${d.agent.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join('') || '<span class="muted">None</span>'}</div><h3>Lessons in its memory <span class="muted">(${d.memory.lessons.length})</span></h3>${d.memory.lessons.length ? `<ul class="lessons">${d.memory.lessons.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '<p class="muted">No lessons yet. They are added after each reviewed task.</p>'}`;
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

const reportsView = {
  build() {
    $('#view').innerHTML = '<div class="page-h"><h1>Reports</h1><p class="muted">The report each task ended with, and every review the evaluator wrote.</p></div><div class="two"><section class="card" id="rep-tasks"></section><section class="card" id="rep-reviews"><p class="muted">Loading reviews…</p></section></div>';
    api('/api/agents/evaluator').then((d) => {
      $('#rep-reviews').innerHTML = `<h2>Reviews <span class="muted">(${d.outputs.length})</span></h2><ul class="rows">${d.outputs.map((o) => `<li><a href="#" data-file="${esc(o.path)}">${esc(o.title)}</a> ${verdictChip(o.verdict, o.score)}<div class="muted tiny">${esc(stamp(o.at))}</div></li>`).join('')}</ul>`;
    }).catch((e) => {
      $('#rep-reviews').innerHTML = `<p class="muted">${esc(e.message)}</p>`;
    });
  },
  update(snap) {
    $('#rep-tasks').innerHTML = `<h2>Task reports <span class="muted">(${snap.tasks.length})</span></h2><ul class="rows">${snap.tasks.map((t) => `<li><div class="row-top"><code>${esc(t.id)}</code>${statusChip(t.status)}</div>${t.report ? `<a href="#" data-file="${esc(t.report)}">${esc(t.title)}</a>` : esc(t.title)}<div class="muted tiny">${esc(t.finished || t.started || t.added || '')}${t.note ? ` · ${esc(t.note)}` : ''}</div></li>`).join('') || '<li class="muted">No tasks yet.</li>'}</ul>`;
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

// ---- routing and the stream ----------------------------------------------------------------------

const VIEWS = { home, working, overview, logs, leads: leadsView, reports: reportsView, flags: flagsView, agent: agentView, gems: gemsView, float: floatView };
let current = '';

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

function onState(snap) {
  if (snap.error) return toast(`The page couldn't read the team's files: ${snap.error}`, true);
  store.snap = snap;
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

if (!location.hash.startsWith('#/float')) playIntro();
shell();
const dock = createDock({ onOpen: (name) => { location.hash = `#/agent/${name}`; } });
// Talk to the team: browser speech to text, then the same task endpoint as the task box.
const voice = createVoice({
  onTask: (task) => api('/api/tasks', { task }),
  onCancel: async (id) => (await api(`/api/tasks/${id}/cancel`, {})).message,
  onAsk: (question, history) => api('/api/ask', { question, history }),
  onRun: async () => (await api('/api/run', {})).message,
  getAgents: () => store.snap?.agents,
  navigate: (hash) => {
    location.hash = hash;
  },
});
window.addEventListener('hashchange', render);
connect();
api('/api/state').then((s) => !store.snap && onState(s)).catch((e) => toast(e.message, true));
