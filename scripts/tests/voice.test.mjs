import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addressee, askIntent, findSong, goodVoice, heardTrigger, localIntent, pieces, plain, rankVoices, taskFor, workIntent } from '../control/gems/voice.js';
import { render, TRACKS, wav } from '../make-demo-music.mjs';

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

describe('voice: the office speaker', () => {
  it('plays, pauses, stops and skips the music by voice, on the page, without asking the guide', () => {
    for (const said of ['play music', 'Play some music.', 'start the music', 'put on a song', "let's dance", 'party time']) assert.deepEqual(localIntent(said), { kind: 'music', action: 'play' }, said);
    assert.deepEqual(localIntent('pause the music'), { kind: 'music', action: 'pause' });
    assert.deepEqual(localIntent('stop the music'), { kind: 'music', action: 'stop' });
    for (const said of ['next song', 'skip', 'play the next one']) assert.deepEqual(localIntent(said), { kind: 'music', action: 'next' }, said);
    assert.deepEqual(localIntent('play office bhangra'), { kind: 'music', action: 'play', song: 'office bhangra' });
    for (const said of ['play music', 'stop the music', 'next song']) assert.equal(askIntent(said), false, said);
    // the task commands are untouched
    assert.deepEqual(localIntent('cancel the task'), { kind: 'cancel' });
    assert.equal(localIntent('stop'), null);
    assert.equal(heardTrigger('find 5 leads go start'), true);
  });

  it('sends "SEO, ..." to the SEO and AEO agent, and never a plain "search for" or "rank"', () => {
    assert.deepEqual(addressee('seo and aeo, fix the meta tags on testpilot'), { agent: 'seo-aeo', rest: 'fix the meta tags on testpilot' });
    assert.deepEqual(addressee('Rank Gem: check every site'), { agent: 'seo-aeo', rest: 'check every site' });
    assert.equal(addressee('search for competitors, researcher').agent, null);
    assert.equal(addressee('rank these leads by score').agent, null);
  });

  it('opens a page with "show me" too', () => {
    assert.deepEqual(localIntent('show me approvals'), { kind: 'open', hash: '#/flags' });
    assert.deepEqual(localIntent('take me to the leads page'), { kind: 'open', hash: '#/leads' });
  });

  it('finds a song by the words of its title', () => {
    const songs = [{ title: 'Office Bhangra (demo)' }, { title: 'Chai Break Groove (demo)' }, { title: 'Badtameez Dil' }];
    assert.equal(findSong(songs, 'office bhangra'), 0);
    assert.equal(findSong(songs, 'the chai one'), 1);
    assert.equal(findSong(songs, 'badtameez dil'), 2);
    assert.equal(findSong(songs, 'kesariya'), -1);
  });

  it('composes the demo tracks as playable sound, the same every time', () => {
    const track = { ...TRACKS[0], bars: 4 };
    const a = render(track, 7);
    assert.deepEqual(render(track, 7), a);
    const peak = a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    assert.ok(peak > 0.8 && peak <= 0.9, `peak ${peak}`);
    const file = wav(a);
    assert.equal(file.subarray(0, 4).toString(), 'RIFF');
    assert.equal(file.subarray(8, 12).toString(), 'WAVE');
    assert.equal(file.length, 44 + a.length * 2);
    for (const t of TRACKS) assert.match(t.file, /^\d\d .+ \(demo\)\.wav$/);
  });
});

describe('voice: talking to the guide', () => {
  it('answers anything said, greetings and plain statements included, not just phrases that start with a question word', () => {
    for (const q of ['hello can you hear me', 'Hello', 'Where are the leads?', 'how do I read a report', 'how do I find leads', 'guide me through the approvals page', 'test one two', 'I want to see the logs', 'what is the researcher doing', 'find']) {
      assert.equal(askIntent(q), true, q);
    }
  });

  it('leaves page commands, anything ending in "go start", and noise alone', () => {
    for (const t of ["What's happening?", 'open the leads page', 'cancel that', 'mute', 'run the waiting tasks', 'find ten leads this week, go start', 'Researcher, find five startups. Send it.', 'how do I find leads, go start', '', '   ', '12', '?!']) {
      assert.equal(askIntent(t), false, t);
    }
  });

  it('sends a request for work as a task at once, with no "go start"', () => {
    for (const t of ['run all campaigns and find me leads', 'Find me leads for peel press', 'find ten leads this week', 'Researcher, find five startups', 'can you research Pitchlight competitors?', 'I need you to run campaigns end to end for motion repo, peel press, pitch light', 'Please write three LinkedIn posts for TestPilot', 'ok team, kick off the Peelpress campaign']) {
      assert.equal(workIntent(t), true, t);
      assert.equal(askIntent(t), false, t);
    }
    for (const t of ['how do I find leads', 'what is the researcher doing', 'can you hear me', 'find', 'start the music', 'run the waiting tasks']) assert.equal(workIntent(t), false, t);
  });

  it('still takes "go start" or "send it" to make a task of anything', () => {
    assert.equal(heardTrigger('find five leads go start'), true);
    assert.equal(heardTrigger('find five leads'), false);
    assert.equal(heardTrigger('can you hear me'), false);
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
