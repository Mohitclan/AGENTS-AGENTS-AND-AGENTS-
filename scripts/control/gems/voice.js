// Talk to the team. The browser's own speech recognition (the Web Speech API) turns your voice into
// text: no transcription API, no key, nothing to pay. In Safari on a Mac it runs on the device; in
// Chrome and Edge the browser uses its built-in speech service. The text becomes a Jarvis task, the
// same as the task box, so it runs in the background as a Claude Code session on the Max plan, and
// the sub-agents do the work there. Spoken updates use the browser's own speech synthesis.
//
// What you say is always shown first and sent only when you press Send (or say "send it"), so a
// misheard word never becomes a task. A few phrases are answered on the page without any agent:
// "what's happening", "open <agent or page>", "start waiting tasks", "stop talking".
import { identityFor } from './identities.js';
import { normalizeState, STATE_LABEL } from './status.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const KEY = 'subegems.voice';
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// Words people use for each agent: its name, its gem, and a few plain ones.
const AGENT_WORDS = {
  coordinator: ['coordinator', 'captain', 'team'],
  evaluator: ['evaluator', 'owl', 'reviewer'],
  'knowledge-base': ['knowledge', 'panda', 'knowledge base'],
  researcher: ['researcher', 'research'],
  'lead-generator': ['lead generator', 'leads', 'cat'],
  outreach: ['outreach', 'bunny'],
  sales: ['sales', 'penguin'],
  marketing: ['marketing', 'creative'],
  'demo-handler': ['demo', 'demos', 'fox'],
  'docs-handler': ['docs', 'scribe', 'documentation'],
  developer: ['developer', 'code buddy', 'dev'],
};
const PAGES = { home: '#/', office: '#/', working: '#/working', overview: '#/overview', logs: '#/logs', leads: '#/leads', reports: '#/reports', approvals: '#/flags', 'needs you': '#/flags', gallery: '#/gems', gems: '#/gems' };

function load() {
  try {
    return { speak: true, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { speak: true };
  }
}
function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage refused: the setting lasts for this visit
  }
}

// "Researcher, find ten Indian dev-tool startups" -> { agent: 'researcher', rest: 'find ten ...' }
export function addressee(text) {
  const t = text.trim().replace(/^(hey|hi|ok|okay)\s+/i, '');
  for (const [agent, words] of Object.entries(AGENT_WORDS)) {
    for (const w of [...words, identityFor(agent).name.toLowerCase()]) {
      const m = new RegExp(`^(?:the\\s+)?${w.replace(/ /g, '\\s+')}(?:\\s+gem)?[,:.!]?\\s+(.+)$`, 'i').exec(t);
      if (m) return { agent, rest: m[1].trim() };
    }
  }
  return { agent: null, rest: t };
}

// The task text Jarvis gets. A named agent becomes an instruction to the coordinator.
export function taskFor(text) {
  const { agent, rest } = addressee(text);
  const clean = rest.replace(/[.\s]*(send it|send)[.!]?$/i, '').trim();
  if (!agent || agent === 'coordinator') return { agent: 'coordinator', task: clean };
  return { agent, task: `Ask the ${agent} to: ${clean}` };
}

// Phrases the page answers itself. Returns { kind, ... } or null for a real task.
export function localIntent(text) {
  const t = text.trim().toLowerCase().replace(/[?.!]+$/, '');
  if (/^(what('s| is) happening|status|who('s| is) (working|busy)|what are you (all )?doing)/.test(t)) return { kind: 'status' };
  if (/^(stop talking|be quiet|mute)$/.test(t)) return { kind: 'mute' };
  if (/^(start|run) (the )?waiting tasks$/.test(t)) return { kind: 'run' };
  const open = /^(open|show|go to)\s+(the\s+)?(.+?)(\s+page)?$/.exec(t);
  if (open) {
    const target = open[3];
    if (PAGES[target]) return { kind: 'open', hash: PAGES[target] };
    const { agent } = addressee(`${target} x`);
    if (agent) return { kind: 'open', hash: `#/agent/${agent}` };
  }
  return null;
}

export function createVoice({ onTask, onRun, getAgents, navigate }) {
  const settings = load();
  let rec = null;
  let listening = false;
  let finalText = '';
  const supported = !!Recognition;

  const root = document.createElement('div');
  root.className = 'voice';
  root.innerHTML = `
    <button type="button" class="voice-fab" id="voice-fab" aria-label="Talk to the team" title="Talk to the team (press V)"><span class="vf-ring"></span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none"/></svg></button>
    <section class="voice-panel" id="voice-panel" hidden aria-label="Talk to the team">
      <header><div><b>Talk to the team</b><span class="vp-sub" id="vp-sub"></span></div><button type="button" class="vp-x" data-v="close" aria-label="Close">✕</button></header>
      <div class="vp-wave" id="vp-wave" aria-hidden="true">${'<i></i>'.repeat(18)}</div>
      <div class="vp-to" id="vp-to"></div>
      <label class="sr" for="vp-text">What you said</label>
      <textarea id="vp-text" rows="3" placeholder="${supported ? 'Press the mic and speak, or type here' : 'This browser has no speech recognition; type here, or use Chrome, Edge or Safari'}"></textarea>
      <div class="vp-row">
        <button type="button" class="vp-mic" data-v="mic" ${supported ? '' : 'disabled'}>🎙 <span>Speak</span></button>
        <span class="spacer"></span>
        <button type="button" class="vp-ghost" data-v="clear">Clear</button>
        <button type="button" class="vp-send" data-v="send">Send to the team</button>
      </div>
      <div class="vp-row small"><label class="check"><input type="checkbox" id="vp-speak" ${settings.speak ? 'checked' : ''}> Speak updates aloud</label><span class="spacer"></span><span class="muted">Try: "Researcher, find 5 launch-active startups" · "What's happening?"</span></div>
      <ol class="vp-log" id="vp-log"></ol>
    </section>`;
  document.body.append(root);
  const $ = (s) => root.querySelector(s);
  const text = $('#vp-text');

  const log = (who, msg) => {
    const li = document.createElement('li');
    li.className = `vl-${who}`;
    li.innerHTML = `<b>${who === 'you' ? 'You' : who === 'team' ? 'Team' : 'Page'}</b> ${esc(msg)}`;
    $('#vp-log').prepend(li);
    while ($('#vp-log').children.length > 8) $('#vp-log').lastChild.remove();
  };

  const speak = (msg) => {
    if (!settings.speak || !('speechSynthesis' in window) || !msg) return;
    const u = new SpeechSynthesisUtterance(msg);
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find((v) => /en-IN/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null;
    u.rate = 1.03;
    speechSynthesis.speak(u);
  };

  const showTo = () => {
    const t = text.value.trim();
    const intent = t && localIntent(t);
    const to = $('#vp-to');
    if (!t) {
      to.innerHTML = '';
      return;
    }
    if (intent) {
      to.innerHTML = `<span class="vp-chip page">Answered here, no agent needed</span>`;
      return;
    }
    const { agent } = taskFor(t);
    to.innerHTML = `<span class="vp-chip" data-agent="${esc(agent)}">To: ${esc(identityFor(agent).name)}${agent === 'coordinator' ? ' (plans and hands it out)' : ''}</span>`;
  };
  text.addEventListener('input', showTo);

  const setListening = (on) => {
    listening = on;
    root.classList.toggle('listening', on);
    $('#vp-sub').textContent = on ? 'Listening…' : supported ? 'Speech becomes text in your browser. Nothing is sent until you press Send.' : 'Type your task';
    $('[data-v="mic"] span').textContent = on ? 'Stop' : 'Speak';
  };

  function startListening() {
    if (!supported || listening) return;
    rec = new Recognition();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.continuous = true;
    finalText = text.value.trim() ? `${text.value.trim()} ` : '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += `${r[0].transcript.trim()} `;
        else interim += r[0].transcript;
      }
      text.value = (finalText + interim).replace(/\s+/g, ' ').trimStart();
      showTo();
      if (/\bsend it[.!]?\s*$/i.test(finalText)) {
        stopListening();
        send();
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') log('page', 'The microphone is blocked. Allow it for this site in the browser settings.');
      else if (e.error !== 'no-speech' && e.error !== 'aborted') log('page', `Speech stopped (${e.error}). Press Speak to try again.`);
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }
  function stopListening() {
    try {
      rec?.stop();
    } catch {
      // already stopped
    }
    setListening(false);
  }

  function statusLine() {
    const agents = getAgents() || [];
    const busy = agents.filter((a) => ['working', 'researching'].includes(normalizeState(a.status)));
    if (!busy.length) return 'Everyone is at their desk. No task is running.';
    return busy.map((a) => `${identityFor(a.name).name} is ${STATE_LABEL[normalizeState(a.status)].toLowerCase()}${a.doing ? `: ${a.doing.replace(/https?:\/\/(www\.)?/g, '').slice(0, 70)}` : ''}`).join('. ');
  }

  async function send() {
    const said = text.value.trim();
    if (!said) return;
    log('you', said);
    text.value = '';
    showTo();
    const intent = localIntent(said);
    if (intent?.kind === 'status') {
      const line = statusLine();
      log('page', line);
      speak(line);
      return;
    }
    if (intent?.kind === 'mute') {
      speechSynthesis?.cancel();
      settings.speak = false;
      $('#vp-speak').checked = false;
      save(settings);
      log('page', 'Spoken updates are off.');
      return;
    }
    if (intent?.kind === 'open') {
      navigate(intent.hash);
      log('page', 'Opened.');
      return;
    }
    if (intent?.kind === 'run') {
      const msg = await onRun();
      log('team', msg);
      speak(msg);
      return;
    }
    const { agent, task } = taskFor(said);
    if (task.length < 6) {
      log('page', 'That was too short to be a task. Say a little more.');
      return;
    }
    try {
      const msg = await onTask(task);
      log('team', msg);
      speak(agent === 'coordinator' ? 'Got it. The team is on it.' : `Got it. ${identityFor(agent).name} is on it.`);
    } catch (error) {
      log('page', error.message);
      speak('That did not go through.');
    }
  }

  const open = (on) => {
    $('#voice-panel').hidden = !on;
    root.classList.toggle('open', on);
    if (on) {
      setListening(false);
      setTimeout(() => text.focus(), 50);
    } else stopListening();
  };
  $('#voice-fab').addEventListener('click', () => {
    const wasOpen = root.classList.contains('open');
    open(!wasOpen);
    if (!wasOpen && supported) startListening();
  });
  root.addEventListener('click', (e) => {
    const v = e.target.closest('[data-v]')?.dataset.v;
    if (v === 'close') open(false);
    else if (v === 'mic') (listening ? stopListening : startListening)();
    else if (v === 'clear') {
      text.value = '';
      finalText = '';
      showTo();
    } else if (v === 'send') {
      stopListening();
      send();
    }
  });
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    if (e.key === 'Escape') open(false);
  });
  $('#vp-speak').addEventListener('change', (e) => {
    settings.speak = e.target.checked;
    save(settings);
    if (!settings.speak) speechSynthesis?.cancel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'v' || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
    e.preventDefault();
    $('#voice-fab').click();
  });
  setListening(false);

  // Spoken updates from real events: a task starts or ends, an agent finishes or fails.
  function announce(events) {
    if (!settings.speak) return;
    const lines = [];
    for (const e of events) {
      const name = identityFor(e.agent).name;
      if (e.kind === 'run' && /started$/.test(e.text)) lines.push('The team started a task.');
      else if (e.kind === 'run' && /ended/.test(e.text)) lines.push(/needs approval/.test(e.text) ? 'A task is done. Drafts are waiting for your approval.' : /needs input/.test(e.text) ? 'A task is done and has a question for you.' : /failed|blocked/.test(e.text) ? 'A task stopped. Check its report.' : 'A task is done.');
      else if (e.kind === 'result' && e.status === 'failed') lines.push(`${name} hit a problem.`);
      else if (e.kind === 'result') lines.push(`${name} finished.`);
      else if (e.kind === 'fallback') lines.push(`${name}'s backup is taking over.`);
      else if (e.kind === 'reply') lines.push('A reply came in.');
    }
    if (lines.length) speak([...new Set(lines)].slice(0, 2).join(' '));
  }

  return { announce, speak, supported, open: () => open(true) };
}

