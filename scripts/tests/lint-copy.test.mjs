import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { after, describe, it } from 'node:test';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

const lint = (text, type = 'general', ...extra) => {
  writeFileSync(repo.path('draft.md'), text);
  const r = repo.run('lint-copy.mjs', 'draft.md', '--type', type, '--no-log', ...extra);
  return { code: r.code, out: r.stdout };
};
const failed = (r, code) => new RegExp(`FAIL .*${code}`).test(r.out);
const warned = (r, code) => new RegExp(`warn .*${code}`).test(r.out);

const GOOD_EMAIL = `## Email 1

Subject: your launch page video

Hi Asha,

Your careers page lists a founding marketer role, and your launch is on Friday. Teams at that stage usually make launch videos by hand.

MotionRepo turns a GitHub repo into a launch video and PDFs. The free trial needs no card.

Worth a look before Friday?

Best, {{SENDER_NAME}}

If this isn't relevant, reply "no" and I won't write again.
`;

describe('words and markers', () => {
  it('passes clean copy', () => assert.equal(lint('# Plan\n\nWe will write three posts this month.\n').code, 0));
  it('fails a banned word, whole words only', () => {
    assert.ok(failed(lint('This is a seamless way to work.\n'), 'banned-word'));
    assert.ok(!failed(lint('The seams are visible.\n'), 'banned-word'));
  });
  it('warns on a flagged word with a suggestion', () => assert.ok(warned(lint('Our solution works.\n'), 'flagged-word')));
  it('warns on overused weak words', () => assert.ok(warned(lint('It is very really just actually basically good.\n'), 'weak-words')));
  it('warns on formula lines', () => assert.ok(warned(lint("Here's the thing about launches.\n"), 'voice')));
  it('fails an unanswered NEEDS INPUT marker', () => assert.ok(failed(lint('Price: [NEEDS INPUT: ask the founders]\n'), 'needs-input')));
  it('fails unfilled placeholders', () => assert.ok(failed(lint('Hello [your name], TBD.\n'), 'placeholder')));
  it('warns on company placeholders without failing', () => {
    const r = lint('From {{SENDER_NAME}}.\n');
    assert.equal(r.code, 0);
    assert.ok(warned(r, 'company-placeholder'));
  });
  it('ignores code blocks and frontmatter', () => {
    assert.equal(lint('---\ntitle: seamless\n---\n\n```\nseamless TBD\n```\n\nFine.\n').code, 0);
  });
});

describe('claims', () => {
  it('fails a number with no source', () => assert.ok(failed(lint('We grew revenue by 40% last year.\n'), 'unsourced-number')));
  it('accepts a number with a source nearby', () => assert.equal(lint('We grew revenue by 40% last year.\nSource: https://example.com/q3\n').code, 0));
  it('accepts a number that cites a knowledge file', () => assert.equal(lint('Trial users get 6 credits, 2x more clicks. knowledge/products/x.md\n').code, 0));
  it('only warns on numbers in an email', () => assert.ok(warned(lint(`${GOOD_EMAIL}\nCustomers save 40% of their time.\n`, 'email'), 'unsourced-number')));
  it('fails a guess stated as a finding', () => assert.ok(failed(lint('It probably ranks well, as an educated guess.\n'), 'hedged-claim')));
  it('allows a rule against guessing', () => assert.equal(lint('Never write an educated guess as a finding.\n').code, 0));
});

describe('external actions', () => {
  it('fails an action with no approval wording', () => assert.ok(failed(lint('Next step: send the emails on Monday.\n'), 'external-action')));
  it('allows one waiting for approval', () => assert.equal(lint('Next step: send the emails once approved in ops/approvals.md.\n').code, 0));
});

describe('email', () => {
  it('passes a good sequence', () => {
    const r = lint(GOOD_EMAIL, 'email');
    assert.equal(r.code, 0, r.out);
  });
  it('checks each email in a sequence', () => {
    const r = lint(`${GOOD_EMAIL}\n## Email 2\n\nSubject: a very long subject line that goes on and on\n\nHi Asha,\n\nHere is the sample.\n`, 'email');
    assert.ok(failed(r, 'email-subject'));
  });
  it('fails a missing subject', () => assert.ok(failed(lint('Hi Asha,\n\nYour launch is soon. Reply "no" to opt out.\n', 'email'), 'email-subject')));
  it('fails a fake reply subject', () => assert.ok(failed(lint(GOOD_EMAIL.replace('your launch page video', 'Re: launch'), 'email'), 'email-subject')));
  it('fails a banned opener after the greeting', () => assert.ok(failed(lint(GOOD_EMAIL.replace('Your careers page', 'I came across your careers page'), 'email'), 'email-opener')));
  it('warns on a first sentence starting with I', () => assert.ok(warned(lint(GOOD_EMAIL.replace('Your careers page lists', 'I read that your careers page lists'), 'email'), 'email-opener')));
  it('fails an email over 120 words', () => assert.ok(failed(lint(GOOD_EMAIL.replace('Worth a look', `${'word '.repeat(130)}Worth a look`), 'email'), 'email-length')));
  it('fails a missing opt-out', () => assert.ok(failed(lint(GOOD_EMAIL.replace(`If this isn't relevant, reply "no" and I won't write again.`, ''), 'email'), 'email-optout')));
  it('applies the word limit to every email', () => {
    const r = lint(`${GOOD_EMAIL}\n## Email 3\n\nSubject: one more thing\n\nHi Asha,\n\n${'word '.repeat(125)}\n\nReply "no" to opt out.\n`, 'email');
    assert.ok(failed(r, 'email-length'));
    assert.match(r.out, /email 2 has \d+ words/);
  });
  it('requires an opt-out in every email', () => {
    const r = lint(`${GOOD_EMAIL}\n## Email 2\n\nSubject: a sample\n\nHi Asha,\n\nHere is a sample.\n`, 'email');
    assert.ok(failed(r, 'email-optout'));
    assert.match(r.out, /email 2 has no opt-out line/);
  });
  it('stops an email at the next heading', () => {
    const r = lint(`${GOOD_EMAIL}\n## LinkedIn\n\n${'word '.repeat(140)}\n`, 'email');
    assert.equal(r.code, 0, r.out);
  });
  it('warns on two questions in one email', () => assert.ok(warned(lint(GOOD_EMAIL.replace('Worth a look before Friday?', 'Worth a look before Friday? Or next week?'), 'email'), 'email-cta')));
  it('warns on a booking ask', () => assert.ok(warned(lint(GOOD_EMAIL.replace('Worth a look before Friday?', 'Book a call this week?'), 'email'), 'email-cta')));
});

describe('social and SEO', () => {
  it('warns on a link in a post', () => assert.ok(warned(lint('Our launch went well.\n\nhttps://example.com\n', 'social'), 'social-link')));
  it('warns on a long hook', () => assert.ok(warned(lint(`${'x'.repeat(210)}\n`, 'social'), 'social-hook')));
  it('fails a page with no H1', () => assert.ok(failed(lint('## Only a subheading\n\nText.\n', 'seo'), 'seo-h1')));
  it('fails when the H1 lacks the keyword', () => assert.ok(failed(lint('# Launch tips\n\nText.\n', 'seo', '--keyword', 'demo videos'), 'seo-keyword')));
  it('fails an AI ranking promise', () => assert.ok(failed(lint('# Guide\n\nWe guarantee you get cited in ChatGPT.\n', 'seo'), 'ai-overclaim')));
  it('allows saying we do not promise that', () => assert.ok(!failed(lint('# Guide\n\nWe never guarantee a mention in ChatGPT.\n', 'seo'), 'ai-overclaim')));
});

describe('gate log', () => {
  it('logs each run and mines repeat failures', () => {
    rmSync(repo.path('ops', 'gate-log.jsonl'), { force: true });
    writeFileSync(repo.path('bad.md'), 'A seamless and guaranteed result.\n');
    for (let i = 0; i < 3; i++) assert.equal(repo.run('lint-copy.mjs', 'bad.md').code, 1);
    const runs = readFileSync(repo.path('ops', 'gate-log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(runs.length, 3);
    assert.equal(runs[0].passed, false);
    assert.match(repo.run('lint-copy.mjs', 'mine').stdout, /banned-word "seamless"\s+3/);
    assert.match(repo.run('lint-copy.mjs', 'mine', '--min', '4').stdout, /Nothing has failed/);
  });
  it('--no-log keeps the log out of it', () => {
    rmSync(repo.path('ops', 'gate-log.jsonl'), { force: true });
    lint('Fine.\n');
    assert.match(repo.run('lint-copy.mjs', 'mine').stdout, /No gate runs/);
  });
});
