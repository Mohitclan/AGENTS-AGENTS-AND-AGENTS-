import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addressee, askIntent, goodVoice, heardTrigger, localIntent, pieces, plain, rankVoices, taskFor } from '../control/gems/voice.js';

describe('voice commands', () => {
  it('routes a task to the agent named first', () => {
    assert.deepEqual(addressee('Researcher, find three competitors'), { agent: 'researcher', rest: 'find three competitors' });
    assert.deepEqual(addressee('hey the researcher: look at pricing'), { agent: 'researcher', rest: 'look at pricing' });
    assert.equal(addressee('find three competitors').agent, null);
  });

  it('wraps a named agent in a coordinator brief and drops "send it"', () => {
    assert.deepEqual(taskFor('Researcher, find three competitors. Send it.'), { agent: 'researcher', task: 'Ask the researcher to: find three competitors' });
    assert.deepEqual(taskFor('summarise the pipeline send it'), { agent: 'coordinator', task: 'summarise the pipeline' });
  });

  it('answers status, mute, run and open locally', () => {
    assert.deepEqual(localIntent("What's happening?"), { kind: 'status' });
    assert.deepEqual(localIntent('mute'), { kind: 'mute' });
    assert.deepEqual(localIntent('run the waiting tasks'), { kind: 'run' });
    assert.deepEqual(localIntent('open the leads page'), { kind: 'open', hash: '#/leads' });
    assert.deepEqual(localIntent('show researcher'), { kind: 'open', hash: '#/agent/researcher' });
    assert.equal(localIntent('find three competitors'), null);
  });

  it('hears "go start" however it is written, and drops it from the task', () => {
    for (const s of ['find leads go start', 'find leads, go start.', 'find leads go-start', 'find leads. Go, start!', 'find leads send it']) assert.equal(heardTrigger(s), true, s);
    assert.equal(heardTrigger('go start finding leads'), false);
    assert.equal(heardTrigger('find leads'), false);
    assert.deepEqual(taskFor('Sales, draft a reply to Acme, go start.'), { agent: 'sales', task: 'Ask the sales to: draft a reply to Acme' });
  });

  it('cancels by voice and reads summaries without markdown', () => {
    assert.deepEqual(localIntent('Cancel that'), { kind: 'cancel' });
    assert.deepEqual(localIntent('stop the last task'), { kind: 'cancel' });
    assert.equal(plain('**Done.** See `outputs/x.md` at https://a.b/c'), 'Done. See outputs/x.md at a link');
  });
});

describe('voice: questions for the guide', () => {
  it('treats a question or a request for help as one to answer, not a task', () => {
    for (const q of ['Where are the leads?', 'how do I read a report', 'What is the researcher doing', 'guide me through the approvals page', 'Show me the logs', 'Can you explain the queue', 'Is the evaluator busy', 'tell me about the pipeline', 'Are there any failed tasks', 'how many leads do we have']) {
      assert.equal(askIntent(q), true, q);
    }
  });

  it('leaves tasks, local commands and anything ending in "go start" alone', () => {
    for (const t of ["What's happening?", 'open the leads page', 'cancel that', 'mute', 'Researcher, find five startups', 'find ten leads this week', 'draft emails for the qualified leads', 'how do I find leads, go start', 'what', 'who']) {
      assert.equal(askIntent(t), false, t);
    }
  });
});

describe('voice: which voice reads the answers', () => {
  const v = (name, lang = 'en-US', localService = true) => ({ name, lang, localService, voiceURI: name });

  it('puts natural, neural, enhanced and premium voices first, then online ones, then the clear system voices', () => {
    const ranked = rankVoices([v('Rishi', 'en-IN'), v('Samantha'), v('Google UK English Female', 'en-GB', false), v('Ava (Premium)'), v('Microsoft Neerja Online (Natural) - English (India)', 'en-IN', false), v('Daniel', 'en-GB')]).map((x) => x.name);
    assert.deepEqual(ranked, ['Microsoft Neerja Online (Natural) - English (India)', 'Ava (Premium)', 'Google UK English Female', 'Daniel', 'Samantha', 'Rishi']);
  });

  it('no longer picks the basic Indian English voice just for its accent, and never a joke voice or another language', () => {
    const ranked = rankVoices([v('Albert'), v('Zarvox'), v('Bad News'), v('Rishi', 'en-IN'), v('Samantha'), v('Amelie', 'fr-CA'), v('Kyoko', 'ja-JP')]).map((x) => x.name);
    assert.equal(ranked[0], 'Samantha');
    assert.ok(ranked.indexOf('Rishi') < ranked.indexOf('Albert'));
    assert.deepEqual(ranked.slice(-3).sort(), ['Albert', 'Bad News', 'Zarvox']);
    assert.ok(!ranked.includes('Amelie') && !ranked.includes('Kyoko'));
    assert.deepEqual(rankVoices([]), []);
  });

  it('knows which voices are good ones, so the page only suggests a better voice when it needs to', () => {
    assert.equal(goodVoice(v('Zoe (Enhanced)')), true);
    assert.equal(goodVoice(v('Google US English', 'en-US', false)), false);
    assert.equal(goodVoice(v('Samantha')), false);
  });

  it('splits long text into sentence-sized pieces and keeps short text whole', () => {
    assert.deepEqual(pieces('One short sentence.'), ['One short sentence.']);
    const long = `${'The team is working on the lead batch right now. '.repeat(8)}`.trim();
    const parts = pieces(long, 120);
    assert.ok(parts.length > 1 && parts.every((p) => p.length <= 130), parts.map((p) => p.length).join(','));
    assert.equal(parts.join(' ').replace(/\s+/g, ' '), long);
    assert.deepEqual(pieces('No punctuation at all'), ['No punctuation at all']);
  });
});
