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

// T-20261103-04: every check below only ever warns. Each has a case that fires and a case that stays quiet.
const clean = (r) => assert.equal(r.code, 0, r.out);
const seqEmail = (n, subject, ask, extra = '') =>
  `## Email ${n}\n\nSubject: ${subject}\n\nHi Asha,\n\nYour launch is on Friday and teams then make videos by hand. ${extra}\n\n${ask}\n\nBest, {{SENDER_NAME}}\n\nIf this isn't relevant, reply "no" and I won't write again.\n\n`;

describe('A1 superlatives and quotes (warnings)', () => {
  it('warns on "fastest", "better than" and "#1", and does not fail', () => {
    for (const text of ['It is the fastest way to ship.\n', 'It is better than the old tool.\n', 'We are #1 for launch videos.\n', 'We are number one for launch videos.\n']) {
      const r = lint(text);
      assert.ok(warned(r, 'superlative'), text);
      clean(r);
    }
  });
  it('warns on "the only" before a product noun, not before "person"', () => {
    assert.ok(warned(lint('MotionRepo is the only tool that turns a repo into video.\n'), 'superlative'));
    assert.ok(!warned(lint('Aryan is the only person named on the page.\n'), 'superlative'));
  });
  it('warns on a "leading" claim, not on "leading to"', () => {
    assert.ok(warned(lint('We are a leading provider of launch videos.\n'), 'superlative'));
    assert.ok(!warned(lint('A missing link, leading to a broken page.\n'), 'superlative'));
  });
  it('stays quiet when a source is within two lines, or when the line is a rule against the claim', () => {
    assert.ok(!warned(lint('It is the fastest of the three.\nSource: https://example.com/benchmark\n'), 'superlative'));
    assert.ok(!warned(lint('Do not claim cheaper than anyone.\n'), 'superlative'));
  });
  it('warns on quoted speech with no source, and stays quiet with a source or without a speaker', () => {
    const quote = 'Asha said, "This tool saved our whole team hours every single week."\n';
    const r = lint(quote);
    assert.ok(warned(r, 'unsourced-quote'));
    clean(r);
    assert.ok(!warned(lint(`${quote}Source: https://example.com/review\n`), 'unsourced-quote'));
    assert.ok(!warned(lint('The page title reads "This tool saved our whole team hours every single week."\n'), 'unsourced-quote'));
    assert.ok(!warned(lint('Asha said "no" and moved on.\n'), 'unsourced-quote'));
  });
  it('does not repeat the unsourced-number check: a rank or comparison with a number gets one report', () => {
    for (const text of ['We are #1 with 500 customers.\n', 'It is 2x cheaper than Synthesia for 10 teams.\n']) {
      const r = lint(text);
      assert.ok(failed(r, 'unsourced-number'), text);
      assert.ok(!warned(r, 'superlative'), text);
    }
    const email = lint(`${GOOD_EMAIL}\nWe are #1 with 500 customers.\n`, 'email');
    assert.ok(warned(email, 'unsourced-number'));
    assert.ok(!warned(email, 'superlative'));
    assert.ok(warned(lint('We are #1 for launch videos.\n'), 'superlative'));
    assert.ok(warned(lint('It is cheaper than the old tool.\n'), 'superlative'));
  });
  it('warns on a vague attribution, not on a named and sourced one', () => {
    assert.ok(warned(lint('Studies show that launch videos help.\n'), 'vague-attribution'));
    assert.ok(!warned(lint('Studies show that launch videos help.\nSource: https://example.com/study\n'), 'vague-attribution'));
  });
});

describe('A1 testimonial shapes (warnings)', () => {
  const QUOTE = '"We cut onboarding from two weeks to two days."';
  const shapes = {
    'the name on the next line': `${QUOTE}\n— Asha Rao, Acme\n`,
    'a blockquote with the name on the next line': `> ${QUOTE}\n> Asha Rao, CEO\n`,
    'a comma and a name and role after the quote': '"We cut onboarding from two weeks to two days," Asha Rao, CEO\n',
    'a table row with the name in another cell': `| ${QUOTE} | Asha Rao, CEO |\n`,
    'a table row with the name before the quote': `| Asha Rao, CEO | ${QUOTE} |\n`,
    'a quote under 6 words with a named speaker': '"It saved us hours." — Asha Rao\n',
    'a short quote after a named speaker': 'Asha said "it saved us hours" last week.\n',
    'an unquoted blockquote with a dash and a name': '> We cut onboarding from two weeks to two days.\n> — Asha Rao, Acme\n',
    'a quote with no speaker at all': `${QUOTE}\n`,
    'a first-person quote inside a sentence, no speaker': 'Teams tell us "we ship launches in half the time now." Try it.\n',
  };
  for (const type of ['seo', 'social', 'email']) {
    it(`warns on each testimonial shape in --type ${type}, and never fails on it`, () => {
      for (const [name, text] of Object.entries(shapes)) {
        const r = lint(type === 'email' ? `${GOOD_EMAIL}\n${text}` : text, type);
        assert.ok(warned(r, 'unsourced-quote'), `${name} (${type})\n${r.out}`);
        assert.ok(!failed(r, 'unsourced-quote'), name);
        if (type === 'social') clean(r);
      }
    });
    it(`stays quiet on ordinary quoted phrases in --type ${type}`, () => {
      for (const text of [
        'Click "Add lead" to continue.\n',
        'The button says "Start free trial" in green.\n',
        'Press "Save" Now to continue.\n',
        'The word "pricing" appears in the heading "Plans and pricing for teams".\n',
        'Rename the field to "launch_video_title_final".\n',
        'Page says "It saved us hours" in the footer.\n',
        'Use the term "launch video" in the title.\n',
      ]) assert.ok(!warned(lint(text, type), 'unsourced-quote'), `${text} (${type})`);
    });
    it(`stays quiet when a source is near a testimonial in --type ${type}`, () => {
      assert.ok(!warned(lint(`${shapes['the name on the next line']}Source: https://example.com/review\n`, type), 'unsourced-quote'));
      assert.ok(!warned(lint(`> ${shapes['a quote with no speaker at all']}Retrieved: 2026-11-03\n`, type), 'unsourced-quote'));
    });
  }
  it('keeps the strict check for --type general: the speaker beside the quote still counts, the loose shapes do not', () => {
    assert.ok(warned(lint(shapes['the name on the next line']), 'unsourced-quote'));
    assert.ok(warned(lint(shapes['a table row with the name in another cell']), 'unsourced-quote'));
    for (const name of ['a quote under 6 words with a named speaker', 'a short quote after a named speaker', 'a quote with no speaker at all', 'an unquoted blockquote with a dash and a name']) {
      assert.ok(!warned(lint(shapes[name]), 'unsourced-quote'), name);
    }
  });
  it('does not read a markdown list item on the next line as an attribution dash, in any type', () => {
    for (const type of ['general', 'seo', 'social', 'email']) {
      for (const text of [
        'The hero reads "Turn any repository into a short launch video".\n- Pricing, from the same page\n',
        '> Before you start, connect GitHub.\n- Settings\n',
      ]) assert.ok(!warned(lint(type === 'email' ? `${GOOD_EMAIL}\n${text}` : text, type), 'unsourced-quote'), `${text} (${type})`);
    }
  });
  it('still reads a double hyphen on the next line as an attribution dash', () => {
    const r = lint('"We cut onboarding from two weeks to two days."\n-- Asha Rao, Acme\n');
    assert.ok(warned(r, 'unsourced-quote'), r.out);
  });
  it('leaves a quote that holds a placeholder alone', () => assert.ok(!warned(lint('"Hi {{SENDER_NAME}}, here is the demo you asked about." — Asha Rao\n', 'seo'), 'unsourced-quote')));
});

describe('A3 vocabulary, clusters, density and rhythm (warnings)', () => {
  it('warns on a tier 1 word with a plainer one, whole words only', () => {
    const r = lint('Let us delve into the repo.\n');
    assert.ok(warned(r, 'vocab-tier1'));
    assert.match(r.out, /try: dig into/);
    clean(r);
    assert.ok(!warned(lint('Let us dig into the repo.\n'), 'vocab-tier1'));
    assert.ok(!warned(lint('The delvers rested.\n'), 'vocab-tier1'));
  });
  it('warns when two tier 2 words share a paragraph, not when one does or when they sit apart', () => {
    assert.ok(warned(lint('It is a robust and comprehensive tool.\n'), 'vocab-cluster'));
    assert.ok(!warned(lint('It is a robust tool.\n'), 'vocab-cluster'));
    assert.ok(!warned(lint('It is a robust tool.\n\nThe guide is comprehensive.\n'), 'vocab-cluster'));
  });
  it('counts inflected forms of a tier 2 word, once per family', () => {
    assert.ok(warned(lint('We are navigating a robust market.\n'), 'vocab-cluster'));
    assert.ok(warned(lint('Teams harnessing a nuanced approach.\n'), 'vocab-cluster'));
    assert.ok(!warned(lint('We navigate, navigating and navigated the market.\n'), 'vocab-cluster'));
    assert.ok(!warned(lint('It enhances and enhanced the page.\n'), 'vocab-cluster'));
  });
  it('does not warn on "underscore" or "beacon" in technical writing', () => {
    for (const text of ['Rename the file with an underscore.\n', 'The tracking beacon fires on sign-up.\n']) {
      const r = lint(text);
      assert.ok(!warned(r, 'vocab-tier1'), text);
      assert.ok(!warned(r, 'vocab-cluster'), text);
    }
  });
  it('warns when tier 3 words pass 3% of a text, not when they are spread thin', () => {
    const padded = `${'This is important and significant. '.repeat(20)}`;
    assert.ok(warned(lint(padded), 'vocab-density'));
    const thin = `${'We write the script and render the video for the launch. '.repeat(20)} This is important and significant. Key point.`;
    assert.ok(!warned(lint(thin), 'vocab-density'));
  });
  it('warns on three sentences opening with the same word, not on "The"', () => {
    assert.ok(warned(lint('We build videos. We write docs. We ship fast.\n'), 'rhythm'));
    assert.ok(!warned(lint('The video is short. The docs are long. The team is small.\n'), 'rhythm'));
  });
  it('warns on sentences that are all one length, not on varied ones', () => {
    const uniform = Array.from({ length: 12 }, (_, i) => `Item ${i} covers the main launch topic well today.`).join(' ');
    assert.ok(warned(lint(`${uniform}\n`), 'rhythm'));
    const varied = ['Short one.', 'This sentence runs a good deal longer than the first because it adds a clause and a detail.', 'Tiny.', 'Medium length here, with a comma.', 'Yes.', 'Another long sentence that carries a few more words than the average sentence in this text does.', 'No.', 'A middling sentence about launch videos.', 'Done.', 'One more sentence of reasonable size for the test.', 'Fine.', 'The end of the paragraph arrives here after all of that.'].join(' ');
    assert.ok(!warned(lint(`${varied}\n`), 'rhythm'));
  });
  it('warns on template phrases, and none of them fail', () => {
    const r = lint('Launch videos play a crucial role in ever-evolving markets.\n');
    assert.ok(warned(r, 'template-phrase'));
    clean(r);
    assert.ok(!warned(lint('Launch videos help people see the product.\n'), 'template-phrase'));
  });
  it('warns on stacked negations and piled-on clauses in customer-facing types only (B16)', () => {
    const negations = 'It needs no card, no setup, no catch.\n';
    assert.ok(warned(lint(negations, 'social'), 'template-phrase'));
    assert.ok(!warned(lint(negations, 'general'), 'template-phrase'));
    assert.ok(warned(lint('We cut the work, making launches easier, ensuring teams ship.\n', 'social'), 'template-phrase'));
    assert.ok(!warned(lint('We cut the work, making launches easier.\n', 'social'), 'template-phrase'));
  });
  it('never names itself as a detector in its output', () => {
    const r = lint('Let us delve into a robust, comprehensive landscape. It plays a crucial role.\n');
    assert.ok(!/detect/i.test(r.out), r.out);
  });
});

describe('em dashes (warning, never a ban)', () => {
  const body = (dashes) => `${'We write the script and render the video for the launch. '.repeat(10)}${'Then a pause — and on. '.repeat(dashes)}\n`;
  it('warns above about one per 1,000 words and still exits 0', () => {
    const r = lint(body(3));
    assert.ok(warned(r, 'em-dash'));
    clean(r);
  });
  it('allows a single em dash in a short text, and none', () => {
    assert.ok(!warned(lint(body(1)), 'em-dash'));
    assert.ok(!warned(lint(body(0)), 'em-dash'));
  });
  it('does not count an empty table cell', () => assert.ok(!warned(lint('| a | — |\n| b | — |\n| c | — |\n'), 'em-dash')));
  it('stays quiet for 3 dashes in a long text (under 1 per 1,000 words)', () => {
    const long = `${'We write the script and render the video for the launch. '.repeat(400)}${'A pause — and on. '.repeat(3)}\n`;
    assert.ok(!warned(lint(long), 'em-dash'));
  });
});

describe('A18 tracking parameters and B6 sequence checks (warnings)', () => {
  it('warns on an assistant tracking parameter in a URL, not on a normal campaign tag', () => {
    const r = lint('See https://example.com/page?utm_source=chatgpt.com for details.\n');
    assert.ok(warned(r, 'ai-url-param'));
    clean(r);
    assert.ok(warned(lint('See https://example.com/page?ref=perplexity.ai&x=1 for details.\n'), 'ai-url-param'));
    assert.ok(!warned(lint('See https://example.com/page?utm_source=newsletter for details.\n'), 'ai-url-param'));
    assert.ok(!warned(lint('See https://example.com/page for details.\n'), 'ai-url-param'));
  });
  it('sees the parameter even when a full stop is stuck to the URL', () => assert.ok(warned(lint('Open https://example.com/p?utm_source=chatgpt.com.\n'), 'ai-url-param')));
  it('passes a varied sequence with no sequence warnings', () => {
    const r = lint(seqEmail(1, 'your launch page video', 'Worth a look before Friday?') + seqEmail(2, 'a sample for your repo', 'Want me to send the sample?'), 'email');
    assert.ok(!warned(r, 'email-sequence'), r.out);
    clean(r);
  });
  it('warns when two subjects repeat', () => {
    const r = lint(seqEmail(1, 'your launch video', 'Worth a look before Friday?') + seqEmail(2, 'Re: your launch video', 'Want me to send the sample?'), 'email');
    assert.ok(warned(r, 'email-sequence'));
    assert.match(r.out, /repeats the subject of email 1/);
  });
  it('warns when email 1 asks for a meeting', () => {
    const r = lint(seqEmail(1, 'your launch video', 'Can we hop on a quick call this week?'), 'email');
    assert.ok(warned(r, 'email-sequence'));
    assert.match(r.out, /email 1 asks for a call/);
    assert.ok(!warned(lint(seqEmail(1, 'your launch video', 'Worth a look before Friday?'), 'email'), 'email-sequence'));
  });
  it('warns when two emails in a row end on the same kind of ask', () => {
    const r = lint(seqEmail(1, 'your launch video', 'Worth a look before Friday?') + seqEmail(2, 'a sample for you', 'Worth a look this week?'), 'email');
    assert.ok(warned(r, 'email-sequence'));
    assert.match(r.out, /same kind of ask as email 1 \(question\)/);
  });
  it('allows the same ask again after a different one in between', () => {
    const r = lint(seqEmail(1, 'your launch video', 'Worth a look before Friday?') + seqEmail(2, 'a sample for you', 'Want me to send the sample?') + seqEmail(3, 'one last note', 'Worth a look this week?'), 'email');
    assert.ok(!warned(r, 'email-sequence'), r.out);
  });
  it('does not run the sequence checks on other types', () => {
    const r = lint(seqEmail(1, 'your launch video', 'Worth a look?') + seqEmail(2, 'your launch video', 'Worth a look?'), 'general');
    assert.ok(!warned(r, 'email-sequence'));
  });
  it('warns on punctuation stuck to a URL in an email, not on a URL followed by a line break', () => {
    const stuck = lint(seqEmail(1, 'your launch video', 'Start the free trial at https://example.com/trial.'), 'email');
    assert.ok(warned(stuck, 'url-punctuation'));
    clean(stuck);
    const clear = lint(seqEmail(1, 'your launch video', 'Start the free trial here:\nhttps://example.com/trial\nWorth a look?'), 'email');
    assert.ok(!warned(clear, 'url-punctuation'), clear.out);
    assert.ok(!warned(lint('Start the free trial at https://example.com/trial.\n', 'general'), 'url-punctuation'));
  });
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
