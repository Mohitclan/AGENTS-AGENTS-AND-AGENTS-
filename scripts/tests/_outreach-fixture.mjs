// A throwaway copy of the repo set up for the Emails page tests: three leads (one with an email contact, one with only
// a contact form, one more email contact), a reviewed three-email draft for each, and the settings in either mode.
// Nothing here can send: tests inject the sender, or run send-email.mjs with --dry-run, or point it at a local sink.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { makeCopy } from './_helpers.mjs';

export const ACME = 'L-0000000a'; // email contact: Jane <jane@acme.test>
export const FORMO = 'L-0000000b'; // contact form only
export const COBALT = 'L-0000000c'; // email contact: hi@cobalt.test

export const lead = (id, company, contact, extra = {}) => ({
  id, company, product: 'motionrepo', status: 'qualified', tier: 'C', score: 49, website: `https://${company.toLowerCase()}.test`,
  contact, history: [{ at: '2026-11-07', event: 'imported', note: 'pipeline/inbox/x.jsonl' }], ...extra,
});

export const draftText = (id, { schedule = true } = {}) => `---
lead: ${id}
product: motionrepo
---
${schedule ? `
## Send schedule

Offsets are working days from the day Email 1 is sent.

| Message | Working day |
|---|---|
| Email 1 | 0 |
| Email 2 | 4 |
| Email 3 | 8 |
` : ''}
## Email 1

Subject: First

Hi there,

Hello one.

To opt out, reply 'stop' and I won't write again.

Best regards,
{{COMPANY_NAME}}

## Email 2

Subject: Second

Hi there,

Hello two.

To opt out, reply 'stop' and I won't write again.

Best regards,
{{COMPANY_NAME}}

## Email 3

Subject: Third

Hi there,

Hello three.

To opt out, reply 'stop' and I won't write again.

Best regards,
{{COMPANY_NAME}}
`;

export const draftPath = (id) => `outputs/outreach/${id}.md`;
export const ref = (id, n) => `${draftPath(id)}#${n}`;

// A copy of the repo with the fixture in place. extraLeads are more leads (each gets a draft); noSchedule lists the
// ones whose draft has no "Send schedule" table.
export async function outreachFixture({ extraLeads = [], noSchedule = [] } = {}) {
  const repo = makeCopy();
  rmSync(repo.path('outputs', 'outreach'), { recursive: true, force: true });
  mkdirSync(repo.path('outputs', 'outreach', 'replies'), { recursive: true });
  const leads = [
    lead(ACME, 'Acme', { name: 'Jane', role: 'Founder', channel: 'email', value: 'jane@acme.test', source_url: 'https://acme.test/about' }),
    lead(FORMO, 'Formo', { name: '', role: '', channel: 'form', value: 'https://formo.test/contact', source_url: 'https://formo.test/contact' }),
    lead(COBALT, 'Cobalt', { name: '', role: '', channel: 'email', value: 'hi@cobalt.test', source_url: 'https://cobalt.test/about' }),
    ...extraLeads,
  ];
  writeFileSync(repo.path('pipeline', 'leads.jsonl'), `${leads.map((l) => JSON.stringify(l)).join('\n')}\n`);
  writeFileSync(repo.path('pipeline', 'suppression.jsonl'), '');
  writeFileSync(repo.path('ops', 'queue.json'), '[]');
  writeFileSync(repo.path('ops', 'outreach.jsonl'), '');
  writeFileSync(repo.path('ops', 'send-log.jsonl'), '');
  writeFileSync(repo.path('ops', 'replies.jsonl'), '');
  for (const l of leads) writeFileSync(repo.path(draftPath(l.id)), draftText(l.id, { schedule: !noSchedule.includes(l.id) }));
  await new Promise((r) => setTimeout(r, 25)); // a review has to be newer than its draft
  for (const l of leads) writeFileSync(repo.path('outputs', 'reviews', `T-20261109-${l.id.slice(-1)}-r1.md`), `# Review of ${draftPath(l.id)}\n\n**Verdict: PASS, 90/100.**\n`);
  // A full plan window, so nothing here can start an agent run.
  mkdirSync(repo.path('ops', 'runs'), { recursive: true });
  writeFileSync(repo.path('ops', 'runs', 'plan-limits.json'), JSON.stringify({ at: new Date().toISOString(), windows: { five_hour: { utilization: 0.99, resetsAt: Date.now() / 1000 + 3600 } } }));
  // The mailbox points nowhere: even a send that got past every check could not reach anyone.
  const config = JSON.parse(readFileSync(repo.path('ops', 'mail-config.json'), 'utf8'));
  config.smtp = { host: '127.0.0.1', port: 9, user: 'sender@ourco.test' };
  writeFileSync(repo.path('ops', 'mail-config.json'), JSON.stringify(config, null, 2));
  const mod = (name) => import(`${repo.dir}/scripts/${name}`); // the copy's own modules, so ROOT is the copy
  const { ROOT: root } = await mod('_shared.mjs'); // as its modules see it (macOS resolves /var to /private/var): pass this, not repo.dir
  const read = (file) => readFileSync(repo.path(file), 'utf8');
  const jsonl = (file) => read(file).split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  const start = { approvals: read('ops/approvals.md'), config: read('ops/mail-config.json'), leads: read('pipeline/leads.jsonl') };
  return {
    repo, root, mod, read, jsonl, leads,
    // Back to how the fixture began: the pilot on, no decisions, no sends, no replies, no answer drafts.
    reset() {
      for (const f of ['ops/outreach.jsonl', 'ops/send-log.jsonl', 'ops/replies.jsonl', 'pipeline/suppression.jsonl']) writeFileSync(repo.path(f), '');
      writeFileSync(repo.path('ops', 'queue.json'), '[]');
      writeFileSync(repo.path('ops', 'approvals.md'), start.approvals);
      writeFileSync(repo.path('ops', 'mail-config.json'), start.config);
      writeFileSync(repo.path('pipeline', 'leads.jsonl'), start.leads);
      rmSync(repo.path('outputs', 'outreach', 'replies'), { recursive: true, force: true });
      rmSync(repo.path('outputs', 'replies'), { recursive: true, force: true });
      mkdirSync(repo.path('outputs', 'outreach', 'replies'), { recursive: true });
    },
    write: (file, text) => writeFileSync(repo.path(file), text),
    append: (file, ...rows) => { const text = read(file); writeFileSync(repo.path(file), `${text}${text && !text.endsWith('\n') ? '\n' : ''}${rows.map((r) => JSON.stringify(r)).join('\n')}\n`); },
    config: () => JSON.parse(read('ops/mail-config.json')),
    // Ends the pilot the way the page does.
    async goLive() {
      const { setPilot } = await mod('golive.mjs');
      return setPilot(root, true, 'test');
    },
    // A live send of this email as send-email.mjs logs it.
    sent(id, n, { at, to = 'jane@acme.test', approval = 'A-x' } = {}) {
      this.append('ops/send-log.jsonl', { at, kind: 'outreach', mode: 'live', to, subject: `Email ${n}`, draft: draftPath(id), email: n, lead: id, approval, message_id: `<m${n}-${id}@ourco.test>` });
    },
  };
}
