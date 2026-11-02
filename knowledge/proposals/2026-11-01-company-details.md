---
status: proposed
date: 2026-11-01
targets:
  - knowledge/company.md
---

# Proposal: fill in the company placeholders

`knowledge/company.md` is `status: confirmed`, so agents can't change it. A person replaces the placeholders, then runs `node scripts/kb.mjs confirm knowledge/company.md`. Values below come only from public or repo sources. Anything no source shows is left for a person, because it must not be guessed.

## Found in sources

| Placeholder | Proposed value | Source |
|---|---|---|
| `{{COMPANY_NAME}}` | PanScience Innovations | GitHub organisation PanScienceInnovation, display name |
| `{{COMPANY_WEBSITE}}` | https://www.panscience.xyz/ | Same organisation, website field |
| `{{COMPANY_ONE_LINER}}` | Not found. Only "MotionRepo is made by PanScience" is sourced | repos/motionrepo/frontend/content/site.ts:78 |
| `{{MARKETS}}` | India | knowledge/products/motionrepo.md line 42, a hypothesis |

The organisation lists its location as Delhi.

## A person has to supply

| Placeholder | What's needed |
|---|---|
| `{{SENDER_NAME}}`, `{{SENDER_ROLE}}`, `{{SENDER_EMAIL}}` | Who cold emails come from. `launch@panscience.xyz` is the site's contact address, but no source says it is the sending mailbox |
| `{{SPOKESPEOPLE}}` | Who may be quoted |
| `{{APPROVER_OUTREACH}}`, `{{APPROVER_CONTENT}}`, `{{APPROVER_CODE}}`, `{{APPROVER_DISCOUNTS}}` | Who approves each. The fact sheet gives shivam-G05 for code merges, based on PR history |
| `{{NEVER_CONTACT}}` | Companies never to contact. It should include Repowise, if a person keeps that decision |
