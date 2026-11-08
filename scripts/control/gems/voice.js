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
// "start waiting tasks", "stop talking", "cancel that", and the office speaker's "play music", "play <song>",
// "pause the music", "stop the music" and "next song". Everything else is a conversation: a short pause after you
// stop talking, it is sent to the guide on the server, which answers from the live team state using Claude Code on
// the signed-in login; the answer is read aloud and may open a page. A task is sent only when you end it with
// "go start" or press "Send as a task". When a task ends, the coordinator's own summary is read aloud.
import { musicPlayer } from '../office3d/music.js';
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
  'seo-aeo': ['seo and aeo', 'rank gem', 'seo', 'aeo'],
};
const PAGES = { home: '#/', office: '#/', working: '#/working', team: '#/team', 'the team': '#/team', overview: '#/overview', logs: '#/logs', leads: '#/leads', outreach: '#/outreach', drafts: '#/outreach', emails: '#/outreach', offices: '#/offices', 'all offices': '#/offices', 'sales office': '#/world/sales', 'sales and marketing': '#/world/sales', hq: '#/world/sales', 'developer studio': '#/world/developer', 'developer office': '#/world/developer', 'social media studio': '#/world/social', 'social media office': '#/world/social', reports: '#/reports', approvals: '#/flags', 'needs you': '#/flags', gallery: '#/gems', gems: '#/gems' };

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

// Outreach by voice. "Draft emails for the new leads" or "confirm the drafts" asks the team to draft the newest run's
// leads ("draft emails for puzari" names one). "Approve all drafts" or "approve the emails for puzari" approves
// drafts that passed review, which sends them. Only short commands count, so "find five leads and draft emails"
// stays a task for the team.
const MAILS = '(?:e-?mails?|mails?|drafts?|outreach)';
const names = (s) => s.split(/\s*(?:,|\band\b|&)\s*/).map((x) => x.trim()).filter(Boolean);
export function outreachIntent(t) {
  const s = t.replace(/^(please|ok|okay|yes|go ahead and|go ahead)\s+/, '').replace(/\s+please$/, '');
  if (new RegExp(`^(?:confirm|start|do)\\s+(?:the\\s+)?(?:drafts?|drafting)(?:\\s+(?:for\\s+)?(?:them|all|all of them|the new leads))?$`).test(s)) return { kind: 'draft', leads: 'new' };
  const draft = new RegExp(`^(?:draft|write)\\s+(?:the\\s+)?${MAILS}?\\s*(?:for|to)\\s+(?:the\\s+)?(.+)$`).exec(s) || /^draft\s+(them|all|all of them|the new leads)$/.exec(s);
  if (draft) {
    const who = draft[1].trim();
    return { kind: 'draft', leads: /^(them|all|all of them|new leads|the new leads|all (the )?new leads|leads)$/.test(who) ? 'new' : names(who) };
  }
  if (new RegExp(`^approve\\s+(?:all|everything|all (?:the\\s+)?${MAILS})(?:\\s+and send(?: them)?)?$`).test(s)) return { kind: 'approve', drafts: 'all' };
  const one = new RegExp(`^approve\\s+(?:the\\s+)?(?:${MAILS}\\s+(?:for|to)\\s+)?(?:the\\s+)?(.+?)(?:\\s+${MAILS})?(?:\\s+and send(?: (?:it|them))?)?$`).exec(s);
  if (one && !/^(it|that|this)$/.test(one[1])) return { kind: 'approve', drafts: names(one[1]) };
  return null;
}

// Phrases the page answers itself. Returns { kind, ... } or null for a real task.
export function localIntent(text) {
  const t = text.trim().toLowerCase().replace(/[?.!]+$/, '');
  const outreach = outreachIntent(t);
  if (outreach) return outreach;
  if (/^(what('s| is) happening|status|who('s| is) (working|busy)|what are you (all )?doing)/.test(t)) return { kind: 'status' };
  if (/^(stop talking|be quiet|mute)$/.test(t)) return { kind: 'mute' };
  if (/^(start|run) (the )?waiting tasks$/.test(t)) return { kind: 'run' };
  if (/^(cancel|stop) (that|it|this|the( last)? task)$/.test(t)) return { kind: 'cancel' };
  const music = musicIntent(t);
  if (music) return music;
  const open = /^(open|show( me)?|go to|take me to)\s+(the\s+)?(.+?)(\s+page)?$/.exec(t);
  if (open) {
    const target = open[4];
    if (PAGES[target]) return { kind: 'open', hash: PAGES[target] };
    const { agent } = addressee(`${target} x`);
    if (agent) return { kind: 'open', hash: `#/agent/${agent}` };
  }
  return null;
}

// The office speaker by voice. "play music" plays the list from where it was; "play <name>" picks a song by its
// title; "pause", "stop" and "next" do what the panel's buttons do.
export function musicIntent(t) {
  const words = 'music|song|songs|track|the speaker|some music|a song|something';
  if (new RegExp(`^(play|start|put on|turn on)( the)? (${words})$`).test(t) || /^(let'?s )?(dance|party)( time)?$/.test(t)) return { kind: 'music', action: 'play' };
  if (new RegExp(`^(pause)( the)?( ${words})?$`).test(t)) return { kind: 'music', action: 'pause' };
  if (new RegExp(`^(stop|turn off)( the)? (${words})$`).test(t)) return { kind: 'music', action: 'stop' };
  if (/^(next|skip)( the)?( song| track| one)?$|^(play )?(the )?next (song|track|one)$/.test(t)) return { kind: 'music', action: 'next' };
  const named = /^play (the song |the track )?(.{3,80})$/.exec(t);
  if (named) return { kind: 'music', action: 'play', song: named[2] };
  return null;
}

// The song in `songs` whose title best matches what was said, or -1.
export function findSong(songs, said) {
  const norm = (s) => String(s).toLowerCase().replace(/\(demo\)/g, '').replace(/[^a-z0-9\u0900-\u097f]+/g, ' ').trim();
  const want = norm(said);
  if (!want) return -1;
  const exact = songs.findIndex((s) => norm(s.title) === want);
  if (exact >= 0) return exact;
  const words = want.split(' ').filter((w) => w.length > 2);
  let best = -1;
  let score = 0;
  songs.forEach((s, i) => {
    const title = norm(s.title);
    const hits = words.filter((w) => title.includes(w)).length;
    if (hits > score) {
      best = i;
      score = hits;
    }
  });
  return best;
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

// Anything said or typed that isn't a page command and doesn't end with "go start" is a conversation with the guide:
// a question, a greeting, a request for help. Only an explicit "go start" (or the "Send as a task" button) hands the
// team work, so a stray sentence can never start a task.
export const askIntent = (text) => {
  const t = String(text ?? '').trim();
  return /[a-z]{2}/i.test(t) && !heardTrigger(t) && !localIntent(t);
};

export function createVoice({ onTask, onRun, onCancel, onAsk, onOutreach, getAgents, navigate }) {
  const settings = load();
  let rec = null;
  let listening = false;
  let wanted = false; // the person wants the mic on; Chrome ends a session after a silence, so restart it
  let lastTask = null;
  let answerTimer = null;
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
        <button type="button" class="vp-ghost" data-v="task" title="Hand what you wrote to the team as a task">Send as a task</button>
        <button type="button" class="vp-send" data-v="send">Ask</button>
      </div>
      <div class="vp-row small"><label class="check"><input type="checkbox" id="vp-speak" ${settings.speak ? 'checked' : ''}> Speak updates aloud</label><label class="check"><input type="checkbox" id="vp-hands" ${settings.handsFree ? 'checked' : ''}> Keep listening</label></div>
      <div class="vp-row small"><label class="check">Voice <select id="vp-voice" aria-label="Voice that reads the answers"></select></label><button type="button" class="vp-ghost" data-v="hear">Hear it</button></div>
      <p class="vp-tip muted" id="vp-voice-tip" hidden></p>
      <p class="vp-tip muted">Just talk: "Where are the leads?" · "What is the researcher doing?" · "Guide me through the approvals". To give the team work, say the task and end with <b>"go start"</b>.</p>
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
      to.innerHTML = `<span class="vp-chip page">${intent.kind === 'music' ? 'The office speaker' : 'Answered here, no agent needed'}</span>`;
      return;
    }
    const { agent } = taskFor(t);
    to.innerHTML = `<span class="vp-chip" data-agent="${esc(agent)}">To: ${esc(identityFor(agent).name)}${agent === 'coordinator' ? ' (plans and hands it out)' : ''}</span>`;
  };
  text.addEventListener('input', showTo);

  const setListening = (on) => {
    listening = on;
    root.classList.toggle('listening', on);
    $('#vp-sub').textContent = on ? 'Listening… ask anything, or end a task with "go start"' : supported ? 'Press the mic and talk. A task is sent only when you say "go start".' : 'Type your question';
    $('[data-v="mic"] span').textContent = on ? 'Stop' : 'Speak';
  };

  // Stops the mic and sends what was said; with "Keep listening" on, it listens again afterwards.
  function submit() {
    clearTimeout(answerTimer);
    const keep = settings.handsFree;
    stopListening();
    send().finally(() => keep && root.classList.contains('open') && startListening());
  }

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
      // "go start" sends a task at once. Anything else is answered about a second and a half after you stop talking,
      // with nothing to press; more speech before then keeps it waiting.
      clearTimeout(answerTimer);
      if (heardTrigger(finalText)) submit();
      else if (e.results[e.results.length - 1]?.isFinal && finalText.trim()) answerTimer = setTimeout(submit, 1500);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wanted = false;
        log('page', 'The microphone is blocked. Allow it for this site in the browser settings.');
      }
      else if (e.error === 'no-speech') log('page', "I didn't hear anything. Check the microphone, then press Speak and try again.");
      else if (e.error !== 'aborted') log('page', `Speech stopped (${e.error}). Press Speak to try again.`);
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

  // The speaker plays in the 3D office on the home page, so the page goes there first and the dancing shows.
  async function music({ action, song }) {
    const player = musicPlayer();
    if (action === 'pause' || action === 'stop') {
      player[action]();
      const line = action === 'pause' ? 'Paused.' : 'Music stopped.';
      log('page', line);
      return speak(line);
    }
    navigate('#/');
    const songs = await player.load();
    if (!songs.length) {
      const line = 'There are no songs yet. Put some in the music folder, then ask again.';
      log('page', line);
      return speak(line);
    }
    let index = action === 'next' ? -2 : player.state.index < 0 ? 0 : player.state.index;
    if (song) {
      index = findSong(songs, song);
      if (index < 0) {
        const line = `I couldn't find a song called ${song}. Say "play music" for the list.`;
        log('page', line);
        return speak(line);
      }
    }
    if (index === -2) player.next();
    else player.play(index);
    dispatchEvent(new CustomEvent('panscience:music'));
    const title = songs[player.state.index]?.title || '';
    log('page', `Playing ${title}.`);
  }

  async function send({ asTask = false } = {}) {
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
    if (intent?.kind === 'music') return music(intent);
    if ((intent?.kind === 'draft' || intent?.kind === 'approve') && onOutreach) {
      if (intent.kind === 'approve') log('page', 'Approving and sending…');
      try {
        const msg = await onOutreach(intent);
        log('team', msg);
        speak(msg);
      } catch (error) {
        log('page', error.message);
        speak(error.message);
      }
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
    if (onAsk && !asTask && askIntent(said)) return ask(said);
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
      clearTimeout(answerTimer);
      stopListening();
      send();
    } else if (v === 'task') {
      clearTimeout(answerTimer);
      stopListening();
      send({ asTask: true });
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

