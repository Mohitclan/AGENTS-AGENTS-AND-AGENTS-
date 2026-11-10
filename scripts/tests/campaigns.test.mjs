// The Campaigns page's numbers per product, its readiness line, and the state block over HTTP.
// Nothing is sent and no agent run is started: the fixture's plan window is full and the mailbox points nowhere.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { ACME, COBALT, lead, outreachFixture } from './_outreach-fixture.mjs';

const TP1 = 'L-00000101'; // TestPilot, newly found
const TP2 = 'L-00000102'; // TestPilot, disqualified
const MR_OUT = 'L-00000103'; // MotionRepo, disqualified: found but not qualified, never drafted

let fx;
let campaigns;
before(async () => {
  fx = await outreachFixture({
    extraLeads: [
      lead(TP1, 'Tpone', { channel: 'email', value: 'a@tpone.test' }, { product: 'testpilot', status: 'new' }),
      lead(TP2, 'Tptwo', { channel: 'email', value: 'a@tptwo.test' }, { product: 'testpilot', status: 'disqualified', disqualify_reason: 'agency' }),
      lead(MR_OUT, 'Gone', { channel: 'email', value: 'a@gone.test' }, { status: 'disqualified', disqualify_reason: 'agency' }),
    ],
  });
  campaigns = await fx.mod('campaigns.mjs');
});
after(() => fx.repo.remove());

const byName = (state) => Object.fromEntries(state.products.map((p) => [p.slug, p]));

describe('campaigns: the products', () => {
  it('lists every product file except the template, with name and website', () => {
    const list = campaigns.productList(fx.root);
    assert.deepEqual(list.map((p) => p.slug), ['motionrepo', 'peelpress', 'pitchlight', 'testpilot']);
    assert.equal(list[0].name, 'MotionRepo');
    assert.match(list[3].website, /^https:\/\/testpilot\./);
  });

  it('finds the one product a text names', () => {
    const list = campaigns.productList(fx.root);
    assert.equal(campaigns.productOf('Find 10 MotionRepo leads', list), 'motionrepo');
    assert.equal(campaigns.productOf('check testpilot pricing', list), 'testpilot');
    assert.equal(campaigns.productOf('Compare MotionRepo and Peelpress', list), null);
    assert.equal(campaigns.productOf('Run the weekly review', list), null);
  });
});

describe('campaigns: the numbers', () => {
  it('counts the funnel from the lead, draft, send and reply files', async () => {
    fx.reset();
    rmSync(fx.repo.path('outputs', 'outreach', `${TP1}.md`)); // a new lead has no draft yet
    // Cobalt is on hold; Acme got one test copy and one real send of Email 1 and a reply.
    const leads = fx.jsonl('pipeline/leads.jsonl').map((l) => (l.id === COBALT ? { ...l, hold: { reason: 'waiting for an answer', at: '2026-11-08' } } : l));
    fx.write('pipeline/leads.jsonl', `${leads.map((l) => JSON.stringify(l)).join('\n')}\n`);
    fx.append('ops/send-log.jsonl',
      { at: '2026-11-09T05:00:00Z', kind: 'outreach', mode: 'test', to: 't@x.test', draft: 'outputs/outreach/L-0000000a.md', email: 1, lead: ACME },
      { at: '2026-11-09T05:01:00Z', kind: 'outreach', mode: 'test', to: 't@x.test', draft: 'outputs/outreach/L-0000000b.md', email: 1, lead: 'L-0000000b' },
      { at: '2026-11-09T05:02:00Z', kind: 'report', mode: 'test', to: 'm@x.test' },
      { at: '2026-11-09T05:03:00Z', kind: 'outreach', mode: 'demo', to: 'd@x.test', draft: 'outputs/outreach/L-0000000a.md', email: 1, lead: ACME });
    fx.sent(ACME, 1, { at: '2026-11-09T06:00:00Z' });
    fx.append('ops/replies.jsonl', { at: '2026-11-09T07:00:00Z', kind: 'reply', from: 'jane@acme.test', lead: ACME, message_id: '<r1>', received: '2026-11-09T07:00:00Z' });
    const state = campaigns.campaignsState(fx.root);
    const m = byName(state).motionrepo;
    assert.deepEqual(m.funnel, { found: 4, qualified: 3, drafted: 3, approved: 1, sentTest: 2, sentLive: 1, replies: 1 });
    // 3 drafts of 3 emails, the one sent is no longer waiting; Cobalt's lead is held
    assert.deepEqual(m.waiting, { emails: 8, questions: 0, held: 1 });
    const t = byName(state).testpilot;
    assert.deepEqual(t.funnel, { found: 2, qualified: 0, drafted: 0, approved: 0, sentTest: 0, sentLive: 0, replies: 0 });
    assert.deepEqual(byName(state).peelpress.funnel, { found: 0, qualified: 0, drafted: 0, approved: 0, sentTest: 0, sentLive: 0, replies: 0 });
  });

  it('says what to do first: research, a competitor file, leads, the fact sheet', () => {
    const p = byName(campaigns.campaignsState(fx.root));
    assert.equal(existsSync(fx.repo.path('knowledge', 'competitors', 'motionrepo.md')), true);
    assert.equal(p.motionrepo.readiness.competitor, true);
    assert.equal(p.motionrepo.readiness.next, 'Ready');
    assert.equal(p.peelpress.readiness.next, 'Start with research');
    assert.equal(p.testpilot.readiness.next, 'Needs a competitor file');
    assert.equal(p.testpilot.readiness.leads, 2);
    // with a competitor file and no leads: find leads; an unconfirmed fact sheet comes after
    writeFileSync(fx.repo.path('knowledge', 'competitors', 'peelpress.md'), '# Peelpress rivals\n');
    const after = byName(campaigns.campaignsState(fx.root));
    assert.equal(after.peelpress.readiness.next, 'Find leads');
    assert.equal(after.peelpress.readiness.competitor, true);
    rmSync(fx.repo.path('knowledge', 'competitors', 'peelpress.md'));
  });

  it('counts open questions that name a product or one of its leads', () => {
    const questions = { questions: [
      { id: 'a#1', title: 'Is Acme a fit?', text: '', recent: true, answer: null, leads: [{ id: ACME }] },
      { id: 'a#2', title: 'Pitchlight pricing', text: 'May we quote?', recent: true, answer: null, leads: [] },
      { id: 'a#3', title: 'Answered one', text: 'MotionRepo', recent: true, answer: { choice: 'Yes' }, leads: [{ id: ACME }] },
      { id: 'a#4', title: 'Old one', text: 'MotionRepo', recent: false, answer: null, leads: [] },
    ] };
    const p = byName(campaigns.campaignsState(fx.root, { questions }));
    assert.equal(p.motionrepo.waiting.questions, 1);
    assert.equal(p.pitchlight.waiting.questions, 1);
    assert.equal(p.testpilot.waiting.questions, 0);
  });
});

describe('campaigns: the state over HTTP', () => {
  let child;
  let base;
  before(async () => {
    child = spawn(process.execPath, [fx.repo.path('scripts', 'control.mjs'), '--port', '0'], { cwd: fx.repo.dir, env: { ...process.env, TEAM_PAGE_HOST: '', TEAM_PAGE_PASSWORD_HASH: '' } });
    base = await new Promise((resolve) => child.stdout.on('data', (d) => { const m = /(http:\/\/127\.0\.0\.1:\d+)/.exec(String(d)); if (m) resolve(m[1]); }));
  });
  after(() => child?.kill());

  it('carries a campaigns block, and a product on every task', async () => {
    fx.write('ops/queue.json', JSON.stringify([{ id: 'J-20261110-01', task: 'Find 5 TestPilot leads', status: 'done', added: '2026-11-10 09:00', finished: '2026-11-10 09:30' }]));
    const state = await (await fetch(`${base}/api/state`)).json();
    assert.deepEqual(state.campaigns.products.map((p) => p.slug), ['motionrepo', 'peelpress', 'pitchlight', 'testpilot']);
    const m = state.campaigns.products.find((p) => p.slug === 'motionrepo');
    assert.equal(m.name, 'MotionRepo');
    assert.equal(m.funnel.found, 4);
    assert.ok('emails' in m.waiting && 'confirmed' in m.readiness);
    assert.equal(state.tasks.find((t) => t.id === 'J-20261110-01').product, 'testpilot');
  });

  it('serves the page code for the Campaigns and Logs pages', async () => {
    const app = await (await fetch(`${base}/app.js`)).text();
    assert.match(app, /data-nav="campaigns"/);
    assert.match(app, /Run all campaigns/);
    const story = await fetch(`${base}/logs-story.js`);
    assert.equal(story.status, 200);
  });
});
