// The first-visit tour: six short steps that show a new person around mission control (the idea of Nonilion's
// welcome guide). It opens once, after the opening animation, and "Take the tour" in the sidebar opens it again.
//
//   startTour({ navigate, force })   force: open even if this browser has seen it
const KEY = 'mc.tour.done';

export const STEPS = [
  { title: 'Welcome to mission control', text: "This is where the PanScience Innovations AI team works. Each agent is a specialist: finding leads, writing outreach, selling, marketing, reviewing. You give the team work, watch it happen, and make the decisions only a person should make.", icon: '👋' },
  { title: 'Offices', text: 'Each team has its own office. Today the Sales & Marketing HQ has the whole team; the Developer Studio and the Social Media Studio are ready for theirs. Walk in to watch the agents in 2D or 3D, follow one, or open its page.', go: '#/offices', icon: '🏢' },
  { title: 'Give the team work', text: 'Type a task on the Overview page, or press the microphone and say it: "find five leads for MotionRepo and draft emails". Tasks wait in a queue and run one after another; you can queue several and walk away.', go: '#/overview', icon: '🎙️' },
  { title: 'Outreach', text: 'When a run finds leads, the Outreach page shows them in plain words with a "Draft emails" button. Read each drafted email, then approve it: during the pilot it goes as a [TEST] copy to Purab, Tanvi and Mohit, never to the lead.', go: '#/outreach', icon: '✉️' },
  { title: 'Questions for you', text: "When the team needs a person's decision, it asks here. Tap an answer or write one, lift a lead's hold if the answer allows it, then send your answers to the team in one go.", go: '#/questions', icon: '❓' },
  { title: 'Keep an eye on things', text: "Each agent has its own page: what it is doing right now, its jobs, files and problems. The top bar shows how long the running task has taken against the usual, warns when an agent looks stuck, and plays a sound when something needs you (switch sounds off there).", go: '#/team', icon: '👀' },
];

const seen = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // private window: it may show again next time
  }
};

export function startTour({ navigate, force = false } = {}) {
  if ((!force && seen()) || document.querySelector('.tour')) return;
  let i = 0;
  const el = document.createElement('div');
  el.className = 'tour';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'tour-title');
  document.body.append(el);
  const close = () => {
    markSeen();
    el.remove();
    removeEventListener('keydown', onKey);
  };
  const paint = () => {
    const s = STEPS[i];
    el.innerHTML = `<div class="tour-card">
      <div class="tour-icon" aria-hidden="true">${s.icon}</div>
      <div class="tour-step">Step ${i + 1} of ${STEPS.length}</div>
      <h2 id="tour-title">${s.title}</h2>
      <p>${s.text}</p>
      <div class="tour-dots">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="tour-actions">
        <button type="button" class="ghost small" data-t="skip">Skip the tour</button>
        <span class="tour-gap"></span>
        ${s.go ? '<button type="button" class="small" data-t="go">Show me</button>' : ''}
        ${i ? '<button type="button" class="small" data-t="back">Back</button>' : ''}
        <button type="button" class="primary small" data-t="next">${i === STEPS.length - 1 ? 'Done' : 'Next'}</button>
      </div></div>`;
    el.querySelector('[data-t="next"]').focus();
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    const t = b.dataset.t;
    if (t === 'skip') return close();
    if (t === 'back') i = Math.max(0, i - 1);
    if (t === 'next') {
      if (i === STEPS.length - 1) return close();
      i += 1;
    }
    if (t === 'go') {
      navigate?.(STEPS[i].go);
      return close();
    }
    return paint();
  });
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  addEventListener('keydown', onKey);
  paint();
}
