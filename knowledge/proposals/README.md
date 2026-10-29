# Knowledge proposals

Agents can't edit confirmed knowledge. When they find something that should change, they write a proposal here named `YYYY-MM-DD-<slug>.md` with:

- the file and section to change,
- the current text,
- the proposed text,
- the evidence (URLs or repo paths) and why it matters.

To accept a proposal, edit the target file yourself, then confirm it with `node scripts/kb.mjs confirm <file>`. Delete or archive the proposal once it's handled.
