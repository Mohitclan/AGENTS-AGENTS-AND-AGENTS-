import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addressee, heardTrigger, localIntent, plain, taskFor } from '../control/gems/voice.js';

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
