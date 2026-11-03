import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { classifySuppression, normalizeProfileUrl, suppressionMatch, suppressionProblem } from '../_shared.mjs';
import { isSuppressed } from '../send-email.mjs';
import { makeCopy } from './_helpers.mjs';

const repo = makeCopy();
after(() => repo.remove());

const today = new Date().toISOString().slice(0, 10);
const lead = (company, website, extra = {}) => ({
  company,
  website,
  product: 'demo',
  fit_reason: 'Ships software weekly and has a launch coming up soon.',
  evidence: [{ claim: 'Launch announced', url: `${website}/blog`, signal: 'published' }],
  score_breakdown: { icp_fit: 32, need_evidence: 24, timing: 15, reachability: 6 },
  score_rationale: 'Clear fit and a public launch.',
  contact: { name: 'Asha', role: 'Founder', channel: 'email', value: `asha@${new URL(website).hostname}`, source_url: `${website}/contact` },
  next_action: 'Draft outreach',
  researched_at: today,
  ...extra,
});
const load = () => readFileSync(repo.path('pipeline', 'leads.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const byCompany = (name) => load().find((l) => l.company === name);
const importLeads = (name, leads) => {
  writeFileSync(repo.path('pipeline', 'inbox', `${name}.jsonl`), leads.map((l) => JSON.stringify(l)).join('\n'));
  return repo.run('leads.mjs', 'import', `pipeline/inbox/${name}.jsonl`);
};
const gate = (...args) => repo.run('leads.mjs', 'gate', '--product', 'demo', ...args);

before(() => {
  writeFileSync(repo.path('knowledge', 'products', 'demo.md'), '---\nstatus: proposed\n---\n# Demo\n');
  mkdirSync(repo.path('pipeline', 'inbox'), { recursive: true });
  const r = importLeads('first', [
    lead('Go Co', 'https://go.example'),
    lead('Inferred Co', 'https://inferred.example', { evidence: [{ claim: 'Might launch', url: 'https://inferred.example/blog', signal: 'inferred' }] }),
    lead('Form Co', 'https://form.example', { contact: { channel: 'form', value: 'https://form.example/contact', source_url: 'https://form.example/contact' } }),
    lead('No Contact Co', 'https://nocontact.example', { contact: undefined }),
    lead('Stale Co', 'https://stale.example', { researched_at: '2025-01-01' }),
    lead('Tier C Co', 'https://tierc.example', { score_breakdown: { icp_fit: 10, need_evidence: 10, timing: 5, reachability: 5 } }),
    lead('Optout Co', 'https://optout.example'),
    lead('Person Co', 'https://person.example'),
  ]);
  assert.equal(r.code, 0, r.stderr);
});

describe('signal classes', () => {
  it('keeps the class on the evidence', () => assert.equal(byCompany('Go Co').evidence[0].signal, 'published'));
  it('refuses an unknown class', () => {
    const r = importLeads('bad-signal', [lead('Bad', 'https://bad.example', { evidence: [{ claim: 'x', url: 'https://bad.example', signal: 'hunch' }] })]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /signal must be one of/);
  });
});

describe('batch gate', () => {
  it('gives each lead a verdict and a reason', () => {
    const out = gate('--status', 'all').stdout;
    const line = (name) => out.split('\n').find((l) => l.includes(name));
    assert.match(line('Go Co'), /Not reviewed/);
    assert.match(line('Inferred Co'), /Not reviewed.*only inferred signals/);
    assert.match(line('Form Co'), /Not reviewed.*contact is form/);
    assert.match(line('Stale Co'), /Not reviewed.*recheck the evidence/);
    assert.match(line('Tier C Co'), /Not reviewed.*tier C/);
    assert.match(line('No Contact Co'), /Stop.*no published contact/);
  });
  it('exits 1 when any lead is a Stop', () => assert.equal(gate('--status', 'all').code, 1));
  it('looks at qualified leads by default', () => assert.match(gate().stdout, /No leads match/));
  it('passes when every lead in view is a Go or Conditional', () => {
    assert.equal(repo.run('leads.mjs', 'set-status', byCompany('Go Co').id, 'qualified').code, 0);
    assert.equal(gate().code, 0);
  });
});

describe('contact quality', () => {
  const inbox = (name, value, reachability) =>
    lead(name, `https://${name}.example`, {
      contact: { channel: 'email', value: `${value}@${name}.example`, source_url: `https://${name}.example/contact` },
      score_breakdown: { icp_fit: 32, need_evidence: 24, timing: 15, reachability },
    });
  it('caps a general inbox', () => {
    const r = importLeads('cap-general', [inbox('hellocap', 'hello', 6)]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /at most 5 for a general inbox/);
  });
  it('caps a support inbox', () => {
    const r = importLeads('cap-support', [inbox('supportcap', 'support', 4)]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /at most 3 for a support inbox/);
  });
  it('lets a general inbox reach Go, shown as general', () => {
    assert.equal(importLeads('ok-general', [inbox('generalok', 'hello', 5)]).code, 0);
    assert.equal(repo.run('leads.mjs', 'set-status', byCompany('generalok').id, 'qualified').code, 0);
    assert.match(gate().stdout.split('\n').find((l) => l.includes('generalok')), /\bGo\s+general\b/);
  });
  // Changed by T-20261103-09a: a support-only inbox is a critical signal, so it is a Stop, not a Conditional.
  it('never gives a support-only inbox a Go', () => {
    assert.equal(importLeads('ok-support', [inbox('supportok', 'support', 3)]).code, 0);
    assert.equal(repo.run('leads.mjs', 'set-status', byCompany('supportok').id, 'qualified').code, 0);
    assert.match(gate().stdout.split('\n').find((l) => l.includes('supportok')), /Stop\s+support.*support-only inbox/);
  });
  it('treats a named address as direct', () => assert.match(gate('--status', 'all').stdout.split('\n').find((l) => l.includes('Go Co')), /\bGo\s+direct\b/));
});

describe('suppression', () => {
  it('disqualifies open leads for a domain, and applies across imports', () => {
    assert.equal(repo.run('leads.mjs', 'suppress', 'https://www.optout.example/about', 'opted out by email on 30 Oct').code, 0);
    const l = byCompany('Optout Co');
    assert.equal(l.status, 'disqualified');
    assert.match(l.disqualify_reason, /suppressed: opted out/);
    assert.equal(repo.run('leads.mjs', 'check').code, 0);
    const r = importLeads('again', [lead('Optout Co', 'https://optout.example')]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /suppression list/);
  });
  it('covers a single email address', () => {
    assert.equal(repo.run('leads.mjs', 'suppress', 'asha@person.example', 'asked not to be contacted').code, 0);
    assert.equal(byCompany('Person Co').status, 'disqualified');
  });
  it('blocks outreach statuses even if a lead is forced back', () => {
    const id = byCompany('Optout Co').id;
    assert.equal(repo.run('leads.mjs', 'set-status', id, 'new', 'reopened').code, 0);
    assert.equal(repo.run('leads.mjs', 'set-status', id, 'qualified').code, 0);
    const r = repo.run('leads.mjs', 'set-status', id, 'drafted', 'seq', '--force');
    assert.equal(r.code, 1);
    assert.match(r.stderr, /Suppressed, never contact/);
  });
  it('shows up as a Stop in the gate', () => assert.match(gate().stdout, /Optout Co\s+suppressed|Stop.*suppressed/));
  it('needs a reason', () => assert.equal(repo.run('leads.mjs', 'suppress', 'x.example').code, 1));
  it('adds an entry only once', () => {
    repo.run('leads.mjs', 'suppress', 'twice.example', 'one');
    assert.match(repo.run('leads.mjs', 'suppress', 'twice.example', 'two').stdout, /already suppressed/);
  });
});

describe('hardened gate', () => {
  const line = (name, ...args) => gate(...args).stdout.split('\n').find((l) => l.includes(name));
  const qualified = (l) => {
    assert.equal(importLeads(l.company, [l]).code, 0);
    assert.equal(repo.run('leads.mjs', 'set-status', byCompany(l.company).id, 'qualified').code, 0);
  };
  it('never shows Go on a lead nobody has reviewed', () => {
    assert.equal(importLeads('fresh', [lead('Fresh', 'https://fresh.example')]).code, 0);
    assert.match(line('Fresh', '--status', 'all'), /Not reviewed/);
    assert.doesNotMatch(line('Fresh', '--status', 'all'), /\bGo\b/);
  });
  it('flags evidence with no signal class', () => {
    qualified(lead('Nosignal', 'https://nosignal.example', { evidence: [{ claim: 'Launch', url: 'https://nosignal.example/blog' }] }));
    assert.match(line('Nosignal'), /Conditional.*no signal class/);
  });
  it('flags an old signal, by the date of the event', () => {
    qualified(lead('Oldsignal', 'https://oldsignal.example', { evidence: [{ claim: 'Launch', url: 'https://oldsignal.example/blog', signal: 'published', dated: '2025-01-01' }] }));
    assert.match(line('Oldsignal'), /Conditional.*newest signal is \d+ days old/);
  });
  it('refuses a date in the future', () => {
    const r = importLeads('future', [lead('Future', 'https://future.example', { evidence: [{ claim: 'x', url: 'https://future.example', signal: 'published', dated: '2999-01-01' }] })]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /dated must be/);
  });
  it('a hold is a Stop, blocks outreach and needs an owner', () => {
    qualified(lead('Held', 'https://held.example'));
    const id = byCompany('Held').id;
    assert.equal(repo.run('leads.mjs', 'hold', id, 'is this a competitor?').code, 1);
    assert.equal(repo.run('leads.mjs', 'hold', id, 'is', 'this', 'a', 'competitor?', '--owner', 'founders').code, 0);
    assert.match(line('Held'), /Stop.*on hold \(founders\): is this a competitor\?/);
    const r = repo.run('leads.mjs', 'set-status', id, 'drafted', 'seq');
    assert.equal(r.code, 1);
    assert.match(r.stderr, /On hold/);
  });
  it('release lifts a hold and needs a note', () => {
    const id = byCompany('Held').id;
    assert.equal(repo.run('leads.mjs', 'release', id).code, 1);
    assert.equal(repo.run('leads.mjs', 'release', id, 'founders', 'said', 'fine').code, 0);
    assert.equal(byCompany('Held').hold, undefined);
    assert.equal(repo.run('leads.mjs', 'set-status', id, 'drafted', 'seq').code, 0);
    assert.equal(repo.run('leads.mjs', 'release', id, 'again').code, 1);
  });
  it('superseded evidence stops counting and shows last', () => {
    qualified(lead('Corrected', 'https://corrected.example', {
      evidence: [{ claim: 'Wrong claim', url: 'https://corrected.example/a', signal: 'published' }, { claim: 'Right claim', url: 'https://corrected.example/b', signal: 'published' }],
    }));
    const id = byCompany('Corrected').id;
    assert.equal(repo.run('leads.mjs', 'supersede', id, '0', 'the page says otherwise').code, 0);
    const shown = JSON.parse(repo.run('leads.mjs', 'show', id).stdout);
    assert.equal(shown.evidence[0].claim, 'Right claim');
    assert.equal(shown.evidence[1].n, 0);
    assert.equal(repo.run('leads.mjs', 'supersede', id, '1', 'also wrong').code, 0);
    assert.match(line('Corrected'), /Stop.*no evidence/);
    assert.equal(repo.run('leads.mjs', 'supersede', id, '9', 'nope').code, 1);
  });
  it('updates a next action and records it', () => {
    const id = byCompany('Fresh').id;
    assert.equal(repo.run('leads.mjs', 'next', id, 'Recheck', 'the', 'launch').code, 0);
    assert.equal(byCompany('Fresh').next_action, 'Recheck the launch');
    assert.equal(byCompany('Fresh').history.at(-1).event, 'next');
  });
  it('still passes the full check', () => assert.equal(repo.run('leads.mjs', 'check').code, 0));
});

// A critical signal forces a Stop whatever the score; with none present the gate gives the verdicts it always did.
describe('critical signals', () => {
  const top = { icp_fit: 40, need_evidence: 30, timing: 20, reachability: 10 }; // score 100, tier A
  const line = (name, ...args) => gate('--status', 'all', ...args).stdout.split('\n').find((l) => l.includes(name));
  const qualified = (l) => {
    assert.equal(importLeads(l.company, [l]).code, 0);
    assert.equal(repo.run('leads.mjs', 'set-status', byCompany(l.company).id, 'qualified').code, 0);
    return byCompany(l.company);
  };
  const strong = (name, extra = {}) => lead(name, `https://${name.toLowerCase()}.example`, { score_breakdown: top, ...extra });
  // Adds hand-written lines to pipeline/suppression.jsonl for one test, then puts the file back as it was.
  const withEntries = (values, fn) => {
    const file = repo.path('pipeline', 'suppression.jsonl');
    const before = existsSync(file) ? readFileSync(file, 'utf8') : '';
    appendFileSync(file, values.map((value) => `${JSON.stringify({ value, reason: 'hand-written', at: today })}\n`).join(''));
    try {
      return fn();
    } finally {
      writeFileSync(file, before);
    }
  };

  it('a clean top-scoring lead is still a Go (no override when no signal is present)', () => {
    const l = qualified(strong('Cleango'));
    assert.deepEqual([l.score, l.tier], [100, 'A']);
    assert.match(line('Cleango'), /\bGo\b/);
    assert.doesNotMatch(line('Cleango'), /competitor|personal email|support-only|suppressed|hold/);
  });
  it('leaves a Conditional and a Not reviewed lead as they were when no signal is present', () => {
    const stale = qualified(strong('Cleanstale', { researched_at: '2025-01-01' }));
    assert.equal(stale.tier, 'A');
    assert.match(line('Cleanstale'), /Conditional.*recheck the evidence/);
    assert.equal(importLeads('Cleannew', [strong('Cleannew')]).code, 0);
    assert.match(line('Cleannew'), /Not reviewed/);
  });
  it('does not treat a general inbox, a lookalike mail domain or a lookalike suppressed domain as critical', () => {
    qualified(strong('Cleangeneral', { contact: { channel: 'email', value: 'hello@cleangeneral.example', source_url: 'https://cleangeneral.example/contact' }, score_breakdown: { ...top, reachability: 5 } }));
    assert.match(line('Cleangeneral'), /\bGo\s+general\b/);
    qualified(strong('Cleanlookalike', { contact: { channel: 'email', value: 'asha@gmail.com.cleanlookalike.example', source_url: 'https://cleanlookalike.example/contact' } }));
    assert.match(line('Cleanlookalike'), /\bGo\b/);
    assert.equal(repo.run('leads.mjs', 'suppress', 'lookalike.example', 'opted out').code, 0);
    qualified(strong('Cleansuffix', { contact: { channel: 'email', value: 'asha@notlookalike.example', source_url: 'https://cleansuffix.example/contact' } }));
    assert.match(line('Cleansuffix'), /\bGo\b/);
  });

  it('a competitor is a Stop despite a score of 100, qualified or new, and says who', () => {
    const l = qualified(strong('Rivalco', { competitor: 'RepoClip, a direct competitor' }));
    assert.deepEqual([l.score, l.tier, l.status], [100, 'A', 'qualified']);
    assert.match(line('Rivalco'), /Stop.*competitor: RepoClip, a direct competitor/);
    assert.equal(importLeads('Rivalnew', [strong('Rivalnew', { competitor: 'Remotion' })]).code, 0);
    assert.match(line('Rivalnew'), /Stop.*competitor: Remotion/);
    assert.equal(gate('--status', 'qualified').code, 1);
  });
  it('a personal email address is a Stop despite a score of 100', () => {
    const l = qualified(strong('Personalmail', { contact: { channel: 'email', value: 'asha@gmail.com', source_url: 'https://personalmail.example/contact' } }));
    assert.equal(l.score, 100);
    assert.match(line('Personalmail'), /Stop.*personal email address \(gmail\.com\)/);
  });
  it('a support-only inbox is a Stop despite the highest score its cap allows', () => {
    const l = qualified(strong('Supportstrong', { contact: { channel: 'email', value: 'support@supportstrong.example', source_url: 'https://supportstrong.example/contact' }, score_breakdown: { ...top, reachability: 3 } }));
    assert.equal(l.tier, 'A');
    assert.match(line('Supportstrong'), /Stop\s+support.*support-only inbox/);
  });
  it('a suppressed contact address is a Stop even if the lead was never disqualified', () => {
    qualified(strong('Optaddr', { contact: { channel: 'email', value: 'lee@optaddr.example', source_url: 'https://optaddr.example/contact' } }));
    assert.match(line('Optaddr'), /\bGo\b/);
    assert.equal(repo.run('leads.mjs', 'suppress', 'lee@optaddr.example', 'asked not to be contacted').code, 0);
    assert.match(line('Optaddr'), /Stop.*suppressed/);
  });
  it('a suppressed domain covers a contact on that domain when the website is elsewhere, and a subdomain site', () => {
    qualified(strong('Brandsite', { contact: { channel: 'email', value: 'asha@optmail.example', source_url: 'https://brandsite.example/contact' } }));
    qualified(lead('Subsite', 'https://app.optsub.example', { score_breakdown: top }));
    assert.match(line('Brandsite'), /\bGo\b/);
    assert.match(line('Subsite'), /\bGo\b/);
    assert.equal(repo.run('leads.mjs', 'suppress', 'optmail.example', 'opted out').code, 0);
    assert.equal(repo.run('leads.mjs', 'suppress', 'optsub.example', 'opted out').code, 0);
    // One matcher everywhere: suppress disqualifies these leads at once, as it does for an exact-domain match.
    assert.equal(byCompany('Brandsite').status, 'disqualified');
    assert.equal(byCompany('Subsite').status, 'disqualified');
    assert.match(line('Brandsite'), /Stop.*suppressed \(optmail\.example\)/);
    assert.match(line('Subsite'), /Stop.*suppressed \(optsub\.example\)/);
    const again = importLeads('again-subdomain', [strong('Brandsite', { contact: { channel: 'email', value: 'lee@mail.optmail.example', source_url: 'https://brandsite.example/contact' } })]);
    assert.equal(again.code, 1);
    assert.match(again.stderr, /suppression list/);
  });
  it('set-status refuses drafted for a lead that only a parent domain covers', () => {
    const l = qualified(strong('Parentcover', { contact: { channel: 'email', value: 'asha@mail.parentcover-opt.example', source_url: 'https://parentcover.example/contact' } }));
    assert.match(line('Parentcover'), /\bGo\b/);
    // A person hand-writes the entry so the lead stays open; the matcher, not the disqualify step, must stop it.
    appendFileSync(repo.path('pipeline', 'suppression.jsonl'), `${JSON.stringify({ value: 'parentcover-opt.example', reason: 'opted out', at: today })}\n`);
    const r = repo.run('leads.mjs', 'set-status', l.id, 'drafted', 'seq');
    assert.equal(r.code, 1);
    assert.match(r.stderr, /Suppressed, never contact/);
    assert.match(line('Parentcover'), /Stop.*suppressed \(parentcover-opt\.example\)/);
  });

  describe('profile URLs on shared hosts', () => {
    const li = (name, slug) => strong(name, { contact: { channel: 'linkedin', value: `https://www.linkedin.com/in/${slug}`, source_url: `https://${name.toLowerCase()}.example/team` } });
    const entries = () => readFileSync(repo.path('pipeline', 'suppression.jsonl'), 'utf8').trim().split('\n').map((x) => JSON.parse(x));
    it('stores the exact profile and stops only that lead', () => {
      qualified(li('Linkeda', 'asha-a'));
      qualified(li('Linkedb', 'lee-b'));
      qualified(li('Linkedc', 'asha-ab')); // starts with the same text, but is another person
      assert.doesNotMatch(line('Linkeda'), /suppressed/);
      const r = repo.run('leads.mjs', 'suppress', 'HTTPS://www.LinkedIn.com/in/Asha-A/?utm_source=x#top', 'asked not to be contacted');
      assert.equal(r.code, 0, r.stderr);
      assert.match(r.stdout, /Suppressed https:\/\/linkedin\.com\/in\/asha-a\./);
      assert.equal(entries().at(-1).value, 'https://linkedin.com/in/asha-a');
      assert.equal(byCompany('Linkeda').status, 'disqualified');
      assert.match(line('Linkeda'), /Stop.*suppressed \(https:\/\/linkedin\.com\/in\/asha-a\)/);
      assert.equal(byCompany('Linkedb').status, 'qualified');
      assert.match(line('Linkedb'), /\bGo\b/);
      assert.equal(byCompany('Linkedc').status, 'qualified');
      assert.match(line('Linkedc'), /\bGo\b/);
    });
    it('covers the same profile written another way, and refuses it on import', () => {
      const r = importLeads('li-again', [li('Linkeda', 'ASHA-A/')]);
      assert.equal(r.code, 1);
      assert.match(r.stderr, /suppression list/);
    });
    it('stores an X profile and a github.io page the same way, and twitter.com means x.com', () => {
      qualified(strong('Xperson', { contact: { channel: 'other', value: 'https://twitter.com/lee_x', source_url: 'https://xperson.example/team' } }));
      qualified(strong('Xother', { contact: { channel: 'other', value: 'https://x.com/lee_y', source_url: 'https://xother.example/team' } }));
      const x = repo.run('leads.mjs', 'suppress', 'https://x.com/Lee_X', 'asked not to be contacted');
      assert.match(x.stdout, /Suppressed https:\/\/x\.com\/lee_x\./);
      assert.equal(byCompany('Xperson').status, 'disqualified');
      assert.equal(byCompany('Xother').status, 'qualified');
      qualified(lead('Ghpage', 'https://asha-page.github.io', { score_breakdown: top }));
      qualified(lead('Ghother', 'https://other-page.github.io', { score_breakdown: top }));
      const g = repo.run('leads.mjs', 'suppress', 'https://asha-page.github.io/', 'asked not to be contacted');
      assert.match(g.stdout, /Suppressed https:\/\/asha-page\.github\.io\./);
      assert.match(line('Ghpage'), /Stop.*suppressed/);
      assert.match(line('Ghother'), /\bGo\b/);
    });
    it('refuses a bare shared host and says to give the profile URL', () => {
      const before = entries().length;
      for (const bare of ['linkedin.com', 'https://www.linkedin.com/', 'x.com', 'twitter.com', 'github.com', 'github.io', 'https://github.io/', 'medium.com', 'substack.com', 'https://linkedin.com/in', 'linktr.ee', 'calendly.com']) {
        const r = repo.run('leads.mjs', 'suppress', bare, 'asked not to be contacted');
        assert.equal(r.code, 1, `${bare} should be refused`);
        assert.match(r.stderr, /profile URL/, bare);
      }
      assert.equal(entries().length, before);
      assert.equal(byCompany('Linkedb').status, 'qualified');
    });

    it('refuses a bare free-mail domain, in any case or as a URL, and still takes an address there', () => {
      const before = entries().length;
      for (const bare of ['gmail.com', 'GMAIL.COM', 'https://gmail.com/', 'googlemail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'proton.me', 'icloud.com']) {
        const r = repo.run('leads.mjs', 'suppress', bare, 'asked not to be contacted');
        assert.equal(r.code, 1, `${bare} should be refused`);
        assert.match(r.stderr, /personal mail service.*email address/, bare);
      }
      assert.equal(entries().length, before);
      const ok = repo.run('leads.mjs', 'suppress', 'Founder-Optout@Gmail.com', 'asked not to be contacted');
      assert.equal(ok.code, 0, ok.stderr);
      assert.equal(entries().at(-1).value, 'founder-optout@gmail.com');
    });
    it('strips mailto: and stores the address, and the entry covers that address however it is written', () => {
      const r = repo.run('leads.mjs', 'suppress', 'mailto:Lee@Mailto-Opt.example?subject=hi', 'asked not to be contacted');
      assert.equal(r.code, 0, r.stderr);
      assert.match(r.stdout, /Suppressed lee@mailto-opt\.example\./);
      assert.equal(entries().at(-1).value, 'lee@mailto-opt.example');
      assert.ok(suppressionMatch(entries(), { contact: 'lee@mailto-opt.example' }));
      assert.ok(suppressionMatch(entries(), { contact: 'mailto:LEE@mailto-opt.example' }));
      assert.ok(suppressionMatch([{ value: 'mailto:lee@acme.example' }], { contact: 'lee@acme.example' }), 'a hand-written mailto: entry');
      assert.equal(suppressionMatch([{ value: 'lee@acme.example' }], { contact: 'ann@acme.example' }), undefined);
      const before = entries().length;
      assert.equal(repo.run('leads.mjs', 'suppress', 'mailto:', 'x').code, 1);
      assert.equal(entries().length, before);
    });
    it('never cuts a company host down to a public suffix, and refuses a bare suffix', () => {
      for (const [input, stored] of [['mobile.de', 'mobile.de'], ['m.me', 'm.me'], ['www.com', 'www.com'], ['www.acme.example', 'acme.example'], ['www.acme.co.uk', 'acme.co.uk'], ['https://m.acme.example/x', 'm.acme.example']]) {
        assert.deepEqual(classifySuppression(input), { kind: 'domain', value: stored }, input);
      }
      for (const suffix of ['co.uk', 'https://co.uk/x', 'com.au', 'co.in', 'de', 'com']) {
        assert.ok(classifySuppression(suffix).error, `${suffix} should be refused`);
      }
      assert.equal(suppressionMatch([{ value: 'mobile.de' }], { contact: 'ann@shop.de' }), undefined, 'mobile.de must not cover every .de');
      assert.equal(suppressionMatch([{ value: 'm.me' }], { contact: 'ann@acme.me' }), undefined);
      assert.ok(suppressionMatch([{ value: 'mobile.de' }], { contact: 'ann@mobile.de' }));
      const r = repo.run('leads.mjs', 'suppress', 'co.uk', 'asked not to be contacted');
      assert.equal(r.code, 1);
      assert.match(r.stderr, /public suffix/);
    });
    it('keeps the id of a Facebook profile.php page and refuses pages that name no one', () => {
      assert.deepEqual(classifySuppression('https://www.facebook.com/profile.php?id=123&ref=x'), { kind: 'url', value: 'https://facebook.com/profile.php?id=123' });
      const list = [{ value: 'https://facebook.com/profile.php?id=123' }];
      assert.ok(suppressionMatch(list, { contact: 'https://m.facebook.com/profile.php?id=123' }));
      assert.equal(suppressionMatch(list, { contact: 'https://facebook.com/profile.php?id=999' }), undefined);
      assert.equal(suppressionMatch(list, { contact: 'https://facebook.com/profile.php?id=1234' }), undefined);
      assert.equal(suppressionMatch(list, { contact: 'https://facebook.com/profile.php' }), undefined);
      const before = entries().length;
      for (const generic of ['facebook.com/profile.php', 'x.com/i', 'x.com/home', 'youtube.com/c', 'youtube.com/channel', 'youtube.com/watch?v=abc', 'github.com/orgs', 'linkedin.com/in/']) {
        const r = repo.run('leads.mjs', 'suppress', generic, 'asked not to be contacted');
        assert.equal(r.code, 1, `${generic} should be refused`);
        assert.match(r.stderr, /does not name one person|shared site/, generic);
        assert.match(r.stderr, /profile URL/, generic);
      }
      assert.equal(entries().length, before);
      for (const named of ['youtube.com/c/acme', 'youtube.com/@acme', 'github.com/orgs/acme']) {
        assert.equal(classifySuppression(named).kind, 'url', named);
      }
    });
    it('a profile URL covers the pages below it and LinkedIn country sites, on a / boundary, in the gate, import and set-status', () => {
      const page = (name, value) => strong(name, { contact: { channel: 'linkedin', value, source_url: `https://${name.toLowerCase()}.example/team` } });
      const sub = qualified(page('Linkedsub', 'https://in.linkedin.com/in/sub-asha/details/experience?x=1'));
      const other = qualified(page('Linkedsubother', 'https://linkedin.com/in/sub-ashab'));
      withEntries(['https://linkedin.com/in/sub-asha'], () => {
        assert.match(line('Linkedsub'), /Stop.*suppressed \(https:\/\/linkedin\.com\/in\/sub-asha\)/);
        assert.match(line('Linkedsubother'), /\bGo\b/);
        const r = repo.run('leads.mjs', 'set-status', sub.id, 'drafted', 'seq');
        assert.equal(r.code, 1);
        assert.match(r.stderr, /Suppressed, never contact/);
        const again = importLeads('li-sub-again', [page('Linkedsub', 'https://in.linkedin.com/in/sub-asha/details/experience')]);
        assert.equal(again.code, 1);
        assert.match(again.stderr, /suppression list/);
        assert.equal(repo.run('leads.mjs', 'set-status', other.id, 'drafted', 'seq').code, 0);
      });
      const list = [{ value: 'https://linkedin.com/in/asha' }];
      for (const [contact, covered] of [['https://in.linkedin.com/in/asha', true], ['https://uk.linkedin.com/in/ASHA/', true], ['https://linkedin.com/in/asha/details/experience', true],
        ['https://linkedin.com/in/asha?trk=x', true], ['https://linkedin.com/in/asha-b', false], ['https://linkedin.com/in/ashab/', false], ['https://linkedin.com/in', false]]) {
        assert.equal(Boolean(suppressionMatch(list, { contact })), covered, contact);
      }
    });

    // T-20261103-11 revision 2: a page below a profile used to be stored as given and covered no one.
    const xlead = (name, handle) => strong(name, { contact: { channel: 'other', value: `https://x.com/${handle}`, source_url: `https://${name.toLowerCase()}.example/team` } });
    it('stores the profile when given an X status, a reply tab or a twitter.com link, and the lead becomes a Stop', () => {
      qualified(xlead('Statusx', 'status_lee'));
      qualified(xlead('Statusother', 'status_lee2'));
      const r = repo.run('leads.mjs', 'suppress', 'https://twitter.com/Status_Lee/status/1850000000000000000?s=20', 'replied stop on X');
      assert.equal(r.code, 0, r.stderr);
      assert.match(r.stdout, /Suppressed https:\/\/x\.com\/status_lee\. 1 open lead\(s\) disqualified\./);
      assert.match(r.stdout, /below the person's profile/);
      assert.doesNotMatch(r.stdout, /No open lead matched/);
      assert.equal(entries().at(-1).value, 'https://x.com/status_lee');
      assert.equal(byCompany('Statusx').status, 'disqualified');
      assert.match(line('Statusx'), /Stop.*suppressed \(https:\/\/x\.com\/status_lee\)/);
      assert.equal(byCompany('Statusother').status, 'qualified');
      assert.equal(classifySuppression('https://x.com/asha/with_replies').value, 'https://x.com/asha');
    });
    it('stores the LinkedIn profile when given a contact-info overlay, a details page, a /comm/ link or an activity page', () => {
      qualified(li('Overlaya', 'overlay-a'));
      qualified(li('Detailsb', 'details-b'));
      qualified(li('Commc', 'comm-c'));
      qualified(li('Activityd', 'activity-d'));
      for (const [url, slug] of [['https://www.linkedin.com/in/overlay-a/overlay/contact-info/', 'overlay-a'], ['https://www.linkedin.com/in/details-b/details/contact-info/', 'details-b'],
        ['https://www.linkedin.com/comm/in/comm-c', 'comm-c'], ['https://www.linkedin.com/in/activity-d/recent-activity/all/', 'activity-d']]) {
        const r = repo.run('leads.mjs', 'suppress', url, 'asked not to be contacted');
        assert.equal(r.code, 0, r.stderr);
        assert.equal(entries().at(-1).value, `https://linkedin.com/in/${slug}`, url);
        assert.match(r.stdout, /1 open lead\(s\) disqualified/, url);
      }
      for (const name of ['Overlaya', 'Detailsb', 'Commc', 'Activityd']) assert.equal(byCompany(name).status, 'disqualified', name);
    });
    it('a /comm/in/ link in a lead matches a profile entry, and the other way round', () => {
      assert.ok(suppressionMatch([{ value: 'https://linkedin.com/in/asha' }], { contact: 'https://www.linkedin.com/comm/in/Asha?trk=x' }));
      assert.ok(suppressionMatch([{ value: 'https://linkedin.com/comm/in/asha' }], { contact: 'https://linkedin.com/in/asha/details/experience' }));
      assert.equal(suppressionMatch([{ value: 'https://linkedin.com/in/asha' }], { contact: 'https://www.linkedin.com/comm/in/asha-b' }), undefined);
    });
    it('stores the person for a repository, a video tab, a post and a page on a subdomain site', () => {
      for (const [input, stored] of [['https://github.com/Asha-Dev/some-repo/issues/4', 'https://github.com/asha-dev'], ['https://github.com/orgs/acme/people', 'https://github.com/orgs/acme'],
        ['https://www.youtube.com/@asha/videos', 'https://youtube.com/@asha'], ['https://www.youtube.com/channel/UCabc/videos', 'https://youtube.com/channel/ucabc'],
        ['https://www.instagram.com/asha/reels/', 'https://instagram.com/asha'], ['https://medium.com/@asha/my-post-123', 'https://medium.com/@asha'],
        ['https://www.facebook.com/asha/posts/123', 'https://facebook.com/asha'], ['https://www.facebook.com/people/Asha/1000123/photos', 'https://facebook.com/people/asha/1000123'],
        ['https://calendly.com/asha/30min', 'https://calendly.com/asha'], ['https://threads.net/@asha/post/abc', 'https://threads.net/@asha'],
        ['https://bsky.app/profile/asha.bsky.social/post/1', 'https://bsky.app/profile/asha.bsky.social'], ['https://asha.github.io/repo/page', 'https://asha.github.io'],
        ['https://asha.substack.com/p/post', 'https://asha.substack.com'], ['https://linkedin.com/company/acme/posts', 'https://linkedin.com/company/acme']]) {
        const c = classifySuppression(input);
        assert.deepEqual([c.kind, c.value], ['url', stored], input);
        assert.ok(c.note, `${input} should say it stored the profile`);
      }
      // A page that is already the profile says nothing extra.
      assert.deepEqual(classifySuppression('https://www.linkedin.com/in/asha/'), { kind: 'url', value: 'https://linkedin.com/in/asha' });
      assert.deepEqual(classifySuppression('https://asha.github.io/'), { kind: 'url', value: 'https://asha.github.io' });
    });
    it('refuses a message thread, a post, a job or a story, which name no one, and says to give the profile URL', () => {
      const before = entries().length;
      for (const page of ['https://www.linkedin.com/messaging/thread/2-abc==/', 'https://www.linkedin.com/feed/update/urn:li:activity:1', 'https://www.linkedin.com/posts/asha_launch-activity-123',
        'https://www.linkedin.com/jobs/view/123', 'https://www.linkedin.com/pulse/some-article', 'https://www.linkedin.com/comm/jobs', 'https://x.com/i/web/status/1850000000000000000', 'https://x.com/i/lists/1',
        'https://x.com/messages/12-34', 'https://www.instagram.com/direct/t/1234/', 'https://www.instagram.com/p/Cxyz/', 'https://www.youtube.com/shorts/abc', 'https://www.producthunt.com/posts/acme',
        'https://substack.com/p/some-post', 'https://www.facebook.com/people', 'https://www.facebook.com/permalink.php?story_fbid=1&id=2', 'https://wellfound.com/jobs']) {
        const r = repo.run('leads.mjs', 'suppress', page, 'asked not to be contacted');
        assert.equal(r.code, 1, `${page} should be refused`);
        assert.match(r.stderr, /does not name one person/, page);
        assert.match(r.stderr, /profile URL/, page);
      }
      assert.equal(entries().length, before);
    });
    it('check flags a stored page below a profile, still honours it as the profile, and exits 1', () => {
      qualified(xlead('Belowx', 'below_lee'));
      withEntries(['https://x.com/below_lee/status/1850000000000000000', 'https://below-lee.github.io/repo'], () => {
        assert.match(line('Belowx'), /Stop.*suppressed/);
        const r = repo.run('leads.mjs', 'check');
        assert.equal(r.code, 1);
        assert.match(r.stderr, /2 problem\(s\) in pipeline\/suppression\.jsonl/);
        assert.match(r.stderr, /"https:\/\/x\.com\/below_lee\/status\/1850000000000000000".*page below a profile.*read as https:\/\/x\.com\/below_lee/);
        assert.match(r.stderr, /"https:\/\/below-lee\.github\.io\/repo".*read as https:\/\/below-lee\.github\.io/);
        assert.match(r.stderr, /suppress <email address or profile URL>/);
        assert.match(gate('--status', 'all').stderr, /WARNING.*page below a profile/);
      });
      assert.equal(repo.run('leads.mjs', 'check').code, 0);
      assert.ok(suppressionProblem({ value: 'https://linkedin.com/in/asha/overlay/contact-info' }));
      assert.equal(suppressionProblem({ value: 'https://linkedin.com/in/asha' }), '');
      assert.equal(suppressionProblem({ value: 'https://asha.github.io/' }), '');
    });
    it('check flags a hand-written message thread, which would block every LinkedIn lead', () => {
      qualified(li('Threadli', 'thread-person'));
      withEntries(['https://www.linkedin.com/messaging/thread/2-abc==/'], () => {
        assert.match(line('Threadli'), /Stop.*suppressed \(legacy linkedin\.com: re-enter as a profile URL\)/);
        const r = repo.run('leads.mjs', 'check');
        assert.equal(r.code, 1);
        assert.match(r.stderr, /blocks every lead on linkedin\.com/);
      });
    });
    it('refuses a domain with a leading dot or a wildcard, and check flags one written by hand', () => {
      const before = entries().length;
      for (const bad of ['.wild.example', '*.wild.example', 'https://*.wild.example', 'wild.*', 'https://.wild.example/x']) {
        const r = repo.run('leads.mjs', 'suppress', bad, 'asked not to be contacted');
        assert.equal(r.code, 1, `${bad} should be refused`);
        assert.match(r.stderr, /leading dot or a wildcard/, bad);
      }
      assert.equal(entries().length, before);
      withEntries(['.wild.example', '*.wild.example'], () => {
        const r = repo.run('leads.mjs', 'check');
        assert.equal(r.code, 1);
        assert.match(r.stderr, /2 problem\(s\) in pipeline\/suppression\.jsonl/);
        assert.match(r.stderr, /"\.wild\.example".*covers nobody/);
        assert.equal(suppressionMatch([{ value: '.wild.example' }, { value: '*.wild.example' }], { contact: 'lee@wild.example', website: 'https://app.wild.example' }), undefined);
      });
    });
    it('says so, and still exits 0, when an entry disqualified no open lead', () => {
      const r = repo.run('leads.mjs', 'suppress', 'nobody-here@nomatch.example', 'asked not to be contacted');
      assert.equal(r.code, 0, r.stderr);
      assert.match(r.stdout, /Suppressed nobody-here@nomatch\.example\./);
      assert.match(r.stdout, /No open lead matched; check the entry covers the person\./);
      assert.equal(entries().at(-1).value, 'nobody-here@nomatch.example');
      // A future lead for that address is still refused.
      const again = importLeads('nomatch-later', [strong('Nomatchlater', { contact: { channel: 'email', value: 'nobody-here@nomatch.example', source_url: 'https://nomatchlater.example/contact' } })]);
      assert.equal(again.code, 1);
      assert.match(again.stderr, /suppression list/);
    });
    it('keeps the path in lower case when it stores a profile, and matches a lead written in upper case', () => {
      assert.equal(normalizeProfileUrl('https://LinkedIn.com/IN/Asha-Case'), 'https://linkedin.com/in/asha-case');
      assert.equal(classifySuppression('https://x.com/Lee_Case/Status/12').value, 'https://x.com/lee_case');
      assert.equal(classifySuppression('https://github.com/Asha-Case/Repo').value, 'https://github.com/asha-case');
      assert.ok(suppressionMatch([{ value: 'https://linkedin.com/in/asha-case' }], { contact: 'https://LinkedIn.com/in/ASHA-CASE/' }));
      assert.ok(suppressionMatch([{ value: 'https://linkedin.com/in/Asha-Case' }], { contact: 'https://linkedin.com/in/asha-case' }), 'a hand-written upper-case entry');
    });
  });

  it('a hand-written free-mail domain entry blocks every address there, the demo inbox included, and check fails', () => {
    qualified(strong('Freemailopt', { contact: { channel: 'email', value: 'someone@gmail.com', source_url: 'https://freemailopt.example/contact' } }));
    withEntries(['gmail.com'], () => {
      const list = readFileSync(repo.path('pipeline', 'suppression.jsonl'), 'utf8').trim().split('\n').map((x) => JSON.parse(x));
      assert.ok(suppressionMatch(list, { contact: 'someone@gmail.com' }));
      assert.ok(suppressionMatch(list, { contact: 'MAILTO:Other.Person@GMAIL.com' }));
      assert.ok(isSuppressed('shivamkgjj2005@gmail.com', list));
      assert.equal(suppressionMatch(list, { contact: 'lee@notgmail.com' }), undefined);
      assert.equal(suppressionMatch(list, { contact: 'lee@gmail.com.evil.example' }), undefined);
      assert.match(line('Freemailopt'), /Stop.*suppressed \(gmail\.com\)/);
      const r = repo.run('leads.mjs', 'check');
      assert.equal(r.code, 1);
      assert.match(r.stderr, /"gmail\.com".*personal mail service/);
    });
  });

  it('a company domain still covers its subdomains and the addresses on them, and not a lookalike', () => {
    const at = (name, value, site = `https://${name.toLowerCase()}.example`) => qualified(lead(name, site, { score_breakdown: top, contact: { channel: 'email', value, source_url: `${site}/contact` } }));
    at('Domsub', 'asha@domcover.example');
    at('Domsubsite', 'asha@domsubsite.example', 'https://app.domcover.example');
    at('Domhost', 'asha@mail.domcover.example');
    at('Domlook', 'asha@notdomcover.example');
    assert.equal(repo.run('leads.mjs', 'suppress', 'domcover.example', 'opted out').code, 0);
    for (const name of ['Domsub', 'Domsubsite', 'Domhost']) {
      assert.equal(byCompany(name).status, 'disqualified', name);
      assert.match(line(name), /Stop.*suppressed \(domcover\.example\)/, name);
    }
    assert.equal(byCompany('Domlook').status, 'qualified');
    assert.match(line('Domlook'), /\bGo\b/);
  });

  it('the gate and send-email isSuppressed agree on every case', () => {
    const cases = [
      ['agree-addr@agree-opt.example', true], // exact address
      ['AGREE-ADDR@AGREE-OPT.EXAMPLE', true], // case
      ['other@agree-opt.example', false], // another person at the domain of an address entry
      ['asha@agree-dom.example', true], // company domain
      ['asha@mail.agree-dom.example', true], // an address on a subdomain
      ['asha@a.b.agree-dom.example', true],
      ['https://app.agree-dom.example/contact', true], // a contact page on a subdomain
      ['asha@notagree-dom.example', false], // lookalike
      ['asha@agree-dom.example.evil.example', false],
      ['https://www.linkedin.com/in/agree-p', true], // exact profile
      ['https://linkedin.com/in/agree-p/?x=1', true], // same profile, written differently
      ['https://linkedin.com/in/agree-pq', false], // another person
      ['asha@linkedin.com', false], // a shared host is never a company domain
      ['https://x.com/agree-p', false],
    ];
    // Import every case first: once an entry exists, an import of a covered contact is refused.
    cases.forEach(([contact], i) => {
      const email = contact.includes('@') && !contact.includes('/');
      const site = `https://agree${i}.example`;
      qualified(lead(`Agree${i}`, site, { score_breakdown: top, contact: { channel: email ? 'email' : 'linkedin', value: contact, source_url: `${site}/contact` } }));
    });
    for (const v of ['agree-addr@agree-opt.example', 'agree-dom.example', 'https://linkedin.com/in/agree-p']) {
      assert.equal(repo.run('leads.mjs', 'suppress', v, 'opted out').code, 0, v);
    }
    const list = readFileSync(repo.path('pipeline', 'suppression.jsonl'), 'utf8').trim().split('\n').map((x) => JSON.parse(x));
    cases.forEach(([contact, stop], i) => {
      assert.equal(/Stop.*suppressed/.test(line(`Agree${i}`)), stop, `gate: ${contact}`);
      assert.equal(Boolean(isSuppressed(contact, list)), stop, `isSuppressed: ${contact}`);
      assert.equal(byCompany(`Agree${i}`).status === 'disqualified', stop, `suppress disqualified: ${contact}`);
    });
  });

  it('an old bare shared-host entry keeps blocking every lead on that host, and check fails until a person replaces it', () => {
    qualified(strong('Legacyli', { contact: { channel: 'linkedin', value: 'https://www.linkedin.com/in/legacy-person', source_url: 'https://legacyli.example/team' } }));
    qualified(strong('Legacyx', { contact: { channel: 'other', value: 'https://x.com/legacy_person', source_url: 'https://legacyx.example/team' } }));
    assert.match(line('Legacyli'), /\bGo\b/);
    assert.equal(repo.run('leads.mjs', 'check').code, 0);
    withEntries(['linkedin.com', 'x.com'], () => {
      const list = readFileSync(repo.path('pipeline', 'suppression.jsonl'), 'utf8').trim().split('\n').map((x) => JSON.parse(x));
      assert.ok(isSuppressed('https://www.linkedin.com/in/legacy-person', list));
      assert.ok(isSuppressed('https://x.com/legacy_person', list));
      assert.equal(isSuppressed('someone@acme.example', list), null);
      const out = gate('--status', 'all');
      assert.match(out.stdout.split('\n').find((l) => l.includes('Legacyli')), /Stop.*suppressed \(legacy linkedin\.com: re-enter as a profile URL\)/);
      assert.match(out.stdout.split('\n').find((l) => l.includes('Legacyx')), /Stop.*suppressed \(legacy x\.com: re-enter as a profile URL\)/);
      assert.match(out.stderr, /WARNING.*"linkedin\.com".*blocks every lead on linkedin\.com.*profile URL/);
      const l = byCompany('Legacyli');
      const drafted = repo.run('leads.mjs', 'set-status', l.id, 'drafted', 'seq');
      assert.equal(drafted.code, 1);
      assert.match(drafted.stderr, /Suppressed, never contact/);
      assert.equal(importLeads('legacy-again', [strong('Legacyli', { contact: { channel: 'linkedin', value: 'https://linkedin.com/in/legacy-person', source_url: 'https://legacyli.example/team' } })]).code, 1);
      const r = repo.run('leads.mjs', 'check');
      assert.equal(r.code, 1);
      assert.match(r.stderr, /2 problem\(s\) in pipeline\/suppression\.jsonl/);
      assert.match(r.stderr, /"linkedin\.com" \(hand-written\).*blocks every lead on linkedin\.com.*suppress <email address or profile URL>.*a person removes this line/);
      assert.match(r.stderr, /"x\.com"/);
    });
    assert.equal(repo.run('leads.mjs', 'check').code, 0);
    assert.match(line('Legacyli'), /\bGo\b/);
  });
  it('a hand-written site root blocks that site and fails check; a hand-written www. domain matches', () => {
    qualified(strong('Rootli', { contact: { channel: 'linkedin', value: 'https://www.linkedin.com/in/root-person', source_url: 'https://rootli.example/team' } }));
    for (const root of ['https://www.linkedin.com/', 'linkedin.com/', 'https://linkedin.com/in', 'https://in.linkedin.com/']) {
      withEntries([root], () => {
        assert.match(line('Rootli'), /Stop.*suppressed \(legacy linkedin\.com: re-enter as a profile URL\)/, root);
        const r = repo.run('leads.mjs', 'check');
        assert.equal(r.code, 1, root);
        assert.match(r.stderr, /blocks every lead on linkedin\.com/, root);
      });
    }
    withEntries(['www.wwwopt.example'], () => {
      assert.equal(repo.run('leads.mjs', 'check').code, 0);
      assert.ok(suppressionMatch([{ value: 'www.wwwopt.example' }], { website: 'https://www.wwwopt.example', contact: 'asha@wwwopt.example' }));
      assert.ok(suppressionMatch([{ value: 'www.wwwopt.example' }], { contact: 'asha@mail.wwwopt.example' }));
    });
  });
  it('check fails on any entry that covers nobody or a whole mail service, and passes the good kinds', () => {
    withEntries(['asha@acme.example', 'acme.example', 'https://linkedin.com/in/asha', 'mailto:lee@acme.example', 'www.acme.example', 'mobile.de'], () => {
      assert.equal(repo.run('leads.mjs', 'check').code, 0);
    });
    withEntries(['de', 'gmail.com', 'co.uk', 'not an entry'], () => {
      const r = repo.run('leads.mjs', 'check');
      assert.equal(r.code, 1);
      assert.match(r.stderr, /4 problem\(s\) in pipeline\/suppression\.jsonl/);
      assert.match(r.stderr, /"de" \(hand-written\): it covers nobody/);
      assert.match(r.stderr, /"gmail\.com".*personal mail service/);
      assert.equal(suppressionMatch([{ value: 'de' }, { value: 'co.uk' }, { value: 'not an entry' }], { contact: 'ann@shop.de', website: 'https://acme.co.uk' }), undefined);
    });
    assert.equal(repo.run('leads.mjs', 'check').code, 0);
    assert.ok(suppressionProblem({ value: 'linkedin.com' }));
    assert.equal(suppressionProblem({ value: 'https://linkedin.com/in/asha' }), '');
  });
  it('a personal mail domain is matched whatever its case', () => {
    qualified(strong('Uppermail', { contact: { channel: 'email', value: 'Asha@GMAIL.COM', source_url: 'https://uppermail.example/contact' } }));
    assert.match(line('Uppermail'), /Stop.*personal email address \(gmail\.com\)/);
  });
  it('a disqualified, lost or held lead is a Stop despite a score of 100', () => {
    const dq = qualified(strong('Dqstrong'));
    assert.equal(repo.run('leads.mjs', 'set-status', dq.id, 'disqualified', 'sells', 'a', 'competing', 'product').code, 0);
    assert.match(line('Dqstrong'), /Stop.*status is disqualified/);
    const lost = qualified(strong('Loststrong'));
    assert.equal(repo.run('leads.mjs', 'set-status', lost.id, 'lost', 'chose', 'another', 'tool', '--force').code, 0);
    assert.match(line('Loststrong'), /Stop.*status is lost/);
    const held = qualified(strong('Heldstrong'));
    assert.equal(repo.run('leads.mjs', 'hold', held.id, 'is', 'this', 'a', 'competitor?', '--owner', 'founders').code, 0);
    assert.match(line('Heldstrong'), /Stop.*on hold \(founders\)/);
  });
  it('lists every reason when several signals apply', () => {
    qualified(strong('Manyflags', { competitor: 'Remotion', score_breakdown: { ...top, reachability: 3 }, contact: { channel: 'email', value: 'help@gmail.com', source_url: 'https://manyflags.example/contact' } }));
    assert.match(line('Manyflags'), /Stop.*competitor: Remotion; personal email address \(gmail\.com\); support-only inbox/);
  });

  it('refuses an empty competitor on import and keeps the field through a re-import without it', () => {
    const r = importLeads('empty-competitor', [strong('Emptyrival', { competitor: '  ' })]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /competitor must say who the competitor is/);
    assert.equal(importLeads('keep-competitor-1', [strong('Keeprival', { competitor: 'RepoClip' })]).code, 0);
    assert.equal(importLeads('keep-competitor-2', [strong('Keeprival')]).code, 0);
    assert.equal(byCompany('Keeprival').competitor, 'RepoClip');
    assert.match(line('Keeprival'), /Stop.*competitor: RepoClip/);
  });
  it('still passes the full check', () => assert.equal(repo.run('leads.mjs', 'check').code, 0));
});
