// Talk to the team. The browser's own speech recognition (the Web Speech API) turns your voice into
// text: no transcription API, no key, nothing to pay. In Safari on a Mac it runs on the device; in
// Chrome and Edge the browser uses its built-in speech service. The text becomes a Jarvis task, the
// same as the task box, so it runs in the background as a Claude Code session on the Max plan, and
// the sub-agents do the work there. Spoken updates use the browser's own speech synthesis.
//
// What you say is always shown first and sent only when you press Send or end with "go start" (or
// "send it"); the task then starts at once and its words are read back, so "cancel that" can stop a
// misheard one. With "Keep listening" on, the mic stays open for the next task, hands free. A few
// phrases are answered on the page without any agent: "what's happening", "open <agent or page>",
// "start waiting tasks", "stop talking", "cancel that". A question ("where are the leads?", "how do I read a
// report?", "guide me") is sent to the guide on the server, which answers from the live team state using Claude
// Code on the signed-in login; the answer is read aloud and may open a page. When a task ends, the
// coordinator's own summary is read aloud.
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
    return { speak: true, handsFree: false, voice: null, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { speak: true, handsFree: false };
  }
}

// The spoken words that send what was said: "go start" (heard as "go, start", "go-start"...) or "send it".
export const TRIGGER = /[\s,.-]*\b(go[\s,.-]*start|send it|send)[.!]?\s*$/i;
export const heardTrigger = (text) => /\b(go[\s,.-]*start|send it)[.!]?\s*$/i.test(text);
function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage refused: the setting lasts for this visit
  }
}

// "Researcher, find ten Indian dev-tool startups" -> { agent: 'researcher', rest: 'find ten ...' }
// Markdown and links read badly aloud.
export const plain = (s) => String(s).replace(/https?:\/\/\S+/g, 'a link').replace(/[`*_#>|[\]]/g, '').replace(/\s+/g, ' ').trim();

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
  const clean = rest.replace(TRIGGER, '').trim();
  if (!agent || agent === 'coordinator') return { agent: 'coordinator', task: clean };
  return { agent, task: `Ask the ${agent} to: ${clean}` };
}

// Phrases the page answers itself. Returns { kind, ... } or null for a real task.
export function localIntent(text) {
  const t = text.trim().toLowerCase().replace(/[?.!]+$/, '');
  if (/^(what('s| is) happening|status|who('s| is) (working|busy)|what are you (all )?doing)/.test(t)) return { kind: 'status' };
  if (/^(stop talking|be quiet|mute)$/.test(t)) return { kind: 'mute' };
  if (/^(start|run) (the )?waiting tasks$/.test(t)) return { kind: 'run' };
  if (/^(cancel|stop) (that|it|this|the( last)? task)$/.test(t)) return { kind: 'cancel' };
  const open = /^(open|show|go to)\s+(the\s+)?(.+?)(\s+page)?$/.exec(t);
  if (open) {
    const target = open[3];
    if (PAGES[target]) return { kind: 'open', hash: PAGES[target] };
    const { agent } = addressee(`${target} x`);
    if (agent) return { kind: 'open', hash: `#/agent/${agent}` };
  }
  return null;
}

// Which voice reads the answers. A browser lists every voice on the computer, joke voices and old compact ones
// included; taking the first English one, or forcing Indian English (on a Mac that is only the basic "Rishi"),
// sounded poor. So voices are ranked: natural, neural, enhanced and premium ones first, then Chrome's and Edge's
// online ones, then the clear everyday system voices, and the joke voices never.
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Eddy|Flo|Fred|Good News|Grandma|Grandpa|Hysterical|Jester|Junior|Kathy|Organ|Princess|Ralph|Reed|Rocko|Sandy|Shelley|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/i;
export function voiceScore(v) {
  const name = v?.name || '';
  if (!/^en/i.test(v?.lang || '')) return -Infinity;
  let score = 0;
  if (/premium|enhanced|natural|neural|siri/i.test(name)) score += 100;
  if (/online/i.test(name)) score += 70;
  if (/^google/i.test(name)) score += 60;
  if (/^(samantha|ava|allison|susan|zoe|evan|nicky|serena|daniel|oliver|stephanie|catherine|karen|moira)\b/i.test(name)) score += 30;
  if (/^rishi/i.test(name)) score -= 20;
  if (NOVELTY.test(name)) score -= 1000;
  if (/^en[-_](US|GB|IN|AU)/i.test(v.lang)) score += 5;
  return score;
}
export const rankVoices = (voices) => [...voices]
  .map((v) => [v, voiceScore(v)])
  .filter(([, score]) => score > -Infinity)
  .sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name))
  .map(([v]) => v);
export const goodVoice = (v) => voiceScore(v) >= 100; // natural, neural, enhanced or premium

// Text split into pieces of about a sentence: browsers cut off a long utterance partway.
export function pieces(text, max = 200) {
  const out = [];
  let cur = '';
  for (const sentence of String(text).match(/[^.!?]+[.!?]*\s*/g) || [String(text)]) {
    if (cur && (cur + sentence).length > max) {
      out.push(cur.trim());
      cur = '';
    }
    cur += sentence;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// A question or a request for help, to be answered rather than handed to the team as a task.
const QUESTION = /^(?:hey |ok |okay |please )?(?:guide\b|help\b|how\b|what\b|where\b|when\b|why\b|who\b|which\b|tell me\b|show me\b|explain\b|walk me through\b|(?:can|could) you (?:tell|show|explain|walk|guide|help)\b|(?:is|are) (?:there|the|it|we|anyone|anything|any)\b|does (?:the|it)\b)/i;
export const askIntent = (text) => {
  const t = String(text ?? '').trim();
  return t.split(/\s+/).length >= 2 && !heardTrigger(t) && !localIntent(t) && QUESTION.test(t);
};

export function createVoice({ onTask, onRun, onCancel, onAsk, getAgents, navigate }) {
  const settings = load();
  let rec = null;
  let listening = false;
  let wanted = false; // the person wants the mic on; Chrome ends a session after a silence, so restart it
  let lastTask = null;
  let finalText = '';
  const history = []; // the last few questions and answers, so a follow-up makes sense
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
      <div class="vp-row small"><label class="check"><input type="checkbox" id="vp-speak" ${settings.speak ? 'checked' : ''}> Speak updates aloud</label><label class="check"><input type="checkbox" id="vp-hands" ${settings.handsFree ? 'checked' : ''}> Keep listening</label></div>
      <div class="vp-row small"><label class="check">Voice <select id="vp-voice" aria-label="Voice that reads the answers"></select></label><button type="button" class="vp-ghost" data-v="hear">Hear it</button></div>
      <p class="vp-tip muted" id="vp-voice-tip" hidden></p>
      <p class="vp-tip muted">Ask anything: "Where are the leads?" · "How do I read a report?" · "What is the researcher doing?" To give the team work, say the task, then <b>"go start"</b>.</p>
      <ol class="vp-log" id="vp-log"></ol>
    </section>`;
  document.body.append(root);
  const $ = (s) => root.querySelector(s);
  const text = $('#vp-text');

  const log = (who, msg) => {
    const li = document.createElement('li');
    li.className = `vl-${who}`;
    li.innerHTML = `<b>${who === 'you' ? 'You' : who === 'team' ? 'Team' : who === 'guide' ? 'Guide' : 'Page'}</b> ${esc(msg)}`;
    $('#vp-log').prepend(li);
    while ($('#vp-log').children.length > 8) $('#vp-log').lastChild.remove();
    return li;
  };

  // The voice to use: the one the person picked, else the best-sounding English voice on this computer.
  const pickVoice = () => {
    const all = 'speechSynthesis' in window ? speechSynthesis.getVoices() : [];
    return all.find((v) => v.voiceURI === settings.voice) || rankVoices(all)[0] || null;
  };

  // Resolves when the speech has ended (or at once when nothing is spoken), so the mic isn't reopened on top of it.
  const speak = (msg, force = false) => new Promise((resolve) => {
    if ((!settings.speak && !force) || !('speechSynthesis' in window) || !msg) return resolve();
    const voice = pickVoice();
    const queue = pieces(msg);
    const next = () => {
      const part = queue.shift();
      if (!part) return resolve();
      const u = new SpeechSynthesisUtterance(part);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = 1;
      u.onend = next;
      u.onerror = next;
      speechSynthesis.speak(u);
    };
    next();
    setTimeout(resolve, Math.max(8000, msg.length * 90)); // never wait forever
  });

  // The picker lists the voices best first, and says how to get a better one when none of them is.
  function fillVoices() {
    if (!('speechSynthesis' in window)) return;
    const list = rankVoices(speechSynthesis.getVoices());
    const current = pickVoice();
    $('#vp-voice').innerHTML = list.map((v) => `<option value="${esc(v.voiceURI)}"${current && v.voiceURI === current.voiceURI ? ' selected' : ''}>${esc(v.name)} (${esc(v.lang)}${v.localService ? '' : ', online'})</option>`).join('') || '<option>No English voice found</option>';
    const tip = $('#vp-voice-tip');
    tip.hidden = !list.length || list.some(goodVoice);
    tip.textContent = 'These voices are basic. For a much better one on a Mac: System Settings, Accessibility, Spoken Content, System Voice, Manage Voices. Download an Enhanced or Premium English voice (Ava, Zoe and Evan sound good), then reload this page. In Edge, the Natural online voices are already good.';
  }
  if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', fillVoices);

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
    $('#vp-sub').textContent = on ? 'Listening… end with "go start"' : supported ? 'Speech becomes text in your browser. Nothing is sent until you say "go start" or press Send.' : 'Type your task';
    $('[data-v="mic"] span').textContent = on ? 'Stop' : 'Speak';
  };

  function startListening() {
    wanted = true;
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
      // "go start" sends a task. A question is answered as soon as it has been said, with nothing to press.
      if (heardTrigger(finalText) || (e.results[e.results.length - 1]?.isFinal && askIntent(finalText))) {
        const keep = settings.handsFree;
        stopListening();
        send().finally(() => keep && root.classList.contains('open') && startListening());
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wanted = false;
        log('page', 'The microphone is blocked. Allow it for this site in the browser settings.');
      }
      else if (e.error !== 'no-speech' && e.error !== 'aborted') log('page', `Speech stopped (${e.error}). Press Speak to try again.`);
    };
    rec.onend = () => {
      setListening(false);
      // Hands free: a pause in speech ends Chrome's session, so pick up again where the text left off.
      if (wanted && settings.handsFree && root.classList.contains('open')) setTimeout(startListening, 250);
    };
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }
  function stopListening() {
    wanted = false;
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

  // A question for the guide: the server answers from the live team state; the answer is shown, spoken, and may open a page.
  async function ask(question) {
    const thinking = log('guide', 'Thinking…');
    try {
      const r = await onAsk(question, history.slice(-6));
      const answer = String(r.answer || '').trim() || "I couldn't get an answer just now.";
      thinking.innerHTML = `<b>Guide</b> ${esc(answer)}`;
      if (r.ok) {
        history.push({ q: question, a: answer });
        if (r.open) navigate(r.open);
      }
      await speak(plain(answer));
    } catch (error) {
      thinking.innerHTML = `<b>Page</b> ${esc(error.message)}`;
      await speak('I could not get an answer just now.');
    }
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
    if (intent?.kind === 'cancel') {
      if (!lastTask) {
        log('page', 'There is no task from this panel to cancel.');
        return;
      }
      try {
        const msg = await onCancel(lastTask);
        lastTask = null;
        log('team', msg);
        speak('Cancelled.');
      } catch (error) {
        log('page', error.message);
        speak('It could not be cancelled. It may have started already.');
      }
      return;
    }
    if (intent?.kind === 'run') {
      const msg = await onRun();
      log('team', msg);
      speak(msg);
      return;
    }
    if (onAsk && askIntent(said)) return ask(said);
    const { agent, task } = taskFor(said);
    if (task.length < 6) {
      log('page', 'That was too short to be a task. Say a little more.');
      return;
    }
    try {
      const { message, id } = await onTask(task);
      lastTask = id || null;
      log('team', message);
      const who = agent === 'coordinator' ? 'The Captain' : identityFor(agent).name;
      const when = /starting/.test(message) ? 'is starting on it now' : /window resets/.test(message) ? 'will start when the plan window resets' : 'will start after the current task';
      speak(`Got it. ${who} ${when}: ${task.replace(/^Ask the [\w-]+ to: /, '').slice(0, 120)}. Say cancel that to stop it.`);
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
    else if (v === 'hear') {
      speechSynthesis?.cancel();
      speak('Hello, this is how I sound. The leads are on the Leads page.', true);
    }
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
  $('#vp-voice').addEventListener('change', (e) => {
    settings.voice = e.target.value;
    save(settings);
    speechSynthesis?.cancel();
    speak('Hello, this is how I sound.', true);
  });
  $('#vp-hands').addEventListener('change', (e) => {
    settings.handsFree = e.target.checked;
    save(settings);
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
  fillVoices();

  // Spoken updates from real events: a task starts or ends, an agent finishes or fails.
  function announce(events) {
    if (!settings.speak) return;
    const lines = [];
    const said = events.find((e) => e.kind === 'run' && /^\S+ finished: ./.test(e.text));
    if (said) lines.push(`The Captain says: ${plain(said.text.replace(/^\S+ finished: /, ''))}`);
    for (const e of events) {
      const name = identityFor(e.agent).name;
      if (said && e.kind === 'run') continue;
      if (e.kind === 'run' && /started$/.test(e.text)) lines.push('The team started a task.');
      else if (e.kind === 'run' && /ended/.test(e.text)) lines.push(/needs approval/.test(e.text) ? 'A task is done. Drafts are waiting for your approval.' : /needs input/.test(e.text) ? 'A task is done and has a question for you.' : /failed|blocked/.test(e.text) ? 'A task stopped. Check its report.' : 'A task is done.');
      else if (e.kind === 'result' && e.status === 'failed') lines.push(`${name} hit a problem.`);
      else if (e.kind === 'result') lines.push(`${name} finished.`);
      else if (e.kind === 'fallback') lines.push(`${name}'s backup is taking over.`);
      else if (e.kind === 'reply') lines.push('A reply came in.');
    }
    if (lines.length) speak([...new Set(lines)].slice(0, said ? 1 : 2).join(' '));
  }

  return { announce, speak, supported, open: () => open(true) };
}

