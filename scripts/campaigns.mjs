// The numbers behind the Campaigns page: one entry per product with its leads funnel, what waits for a person and
// how ready it is to start. Read from files only (knowledge/products, knowledge/competitors, pipeline/leads.jsonl,
// the drafted emails, ops/send-log.jsonl, ops/replies.jsonl); no browser code, nothing is changed here.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, frontmatter } from './_shared.mjs';
import { latestLeads, outreachState } from './outreach.mjs';
import { recordedReplies } from './replies.mjs';
import { questionsState } from './questions.mjs';

const readJsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);

// Statuses a lead has when it has been judged a fit (and not dropped), and the ones that mean it is out.
const QUALIFIED = new Set(['qualified', 'drafted', 'approved', 'contacted', 'replied', 'meeting', 'trial', 'won']);
const CLOSED = new Set(['disqualified', 'lost', 'won']);
// An email a person has ticked: sent, scheduled or ticked and then skipped on its day all count.
const TICKED = new Set(['approved', 'scheduled', 'skipped']);

// The products, from knowledge/products/<slug>.md (files starting with "_" are templates).
export function productList(root = ROOT) {
  const dir = join(root, 'knowledge', 'products');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith('.md') && !n.startsWith('_')).sort().map((n) => {
    const slug = n.replace(/\.md$/, '');
    let fm = {};
    try { fm = frontmatter(readFileSync(join(dir, n), 'utf8')) || {}; } catch { /* unreadable: use the file name */ }
    return { slug, name: fm.name || slug, website: fm.website || '', factSheet: fm.status || 'unknown' };
  });
}

// Which product a piece of text names ("Find 10 MotionRepo leads"): the slug of the one product it mentions, or
// null when it names none or several.
export function productOf(text, products) {
  const t = String(text || '').toLowerCase();
  const hit = products.filter((p) => t.includes(p.name.toLowerCase()) || new RegExp(`\\b${p.slug}\\b`).test(t));
  return hit.length === 1 ? hit[0].slug : null;
}

export function campaignsState(root = ROOT, { outreach = null, questions = null, leads = null } = {}) {
  const products = productList(root);
  const all = leads || latestLeads(root);
  const out = outreach || outreachState(root);
  const asked = questions || questionsState(root);
  const productOfLead = (id) => all.get(id)?.product || '';
  const sends = readJsonl(join(root, 'ops', 'send-log.jsonl')).filter((e) => e.kind === 'outreach');
  const leadOfSend = (e) => e.lead || /L-[0-9a-f]+/.exec(e.draft || '')?.[0] || '';
  const replies = recordedReplies(root);
  return {
    products: products.map((p) => {
      const mine = [...all.values()].filter((l) => l.product === p.slug);
      const open = mine.filter((l) => !CLOSED.has(l.status));
      const held = open.filter((l) => l.hold);
      const emails = (out.emails || []).filter((e) => e.kind !== 'answer' && productOfLead(e.lead) === p.slug);
      const myQuestions = (asked.questions || []).filter((q) => !q.answer && q.recent
        && (q.leads.some((l) => productOfLead(l.id) === p.slug) || productOf(`${q.title} ${q.text}`, products) === p.slug));
      const sent = (mode) => sends.filter((e) => e.mode === mode && productOfLead(leadOfSend(e)) === p.slug).length;
      const competitor = existsSync(join(root, 'knowledge', 'competitors', `${p.slug}.md`));
      const found = mine.length;
      const confirmed = p.factSheet === 'confirmed';
      return {
        slug: p.slug, name: p.name, website: p.website,
        funnel: {
          found,
          qualified: mine.filter((l) => QUALIFIED.has(l.status)).length,
          drafted: (out.drafts || []).filter((d) => productOfLead(d.lead) === p.slug).length,
          approved: emails.filter((e) => TICKED.has(e.state)).length,
          sentTest: sent('test'),
          sentLive: sent('live'),
          replies: replies.filter((r) => r.lead && productOfLead(r.lead) === p.slug).length,
        },
        waiting: { emails: emails.filter((e) => e.state === 'pending').length, questions: myQuestions.length, held: held.length },
        readiness: {
          factSheet: p.factSheet, confirmed, competitor, leads: found,
          next: !competitor && !found ? 'Start with research' : !competitor ? 'Needs a competitor file' : !found ? 'Find leads' : !confirmed ? 'Confirm the fact sheet' : 'Ready',
        },
      };
    }),
  };
}
