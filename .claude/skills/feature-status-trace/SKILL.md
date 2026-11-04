---
name: feature-status-trace
description: How to decide whether a product feature is live, beta, switched off or only planned, by tracing it through the code from where a user reaches it to what it does. Use for every feature line in a fact sheet or proposal.
---

# Feature status trace

The fact-sheet rubric weights keeping live, beta and planned apart. Past slips: "documents and video from one run" (the code runs them separately), and "approved by hand" when an auto-approve flag was on.

For each feature claim:

1. **Entry point**: where a user reaches it (route, page component, API endpoint), as path:line. No entry point means not live.
2. **Flow**: follow the calls to the effect (job queue, store, outside API). Name the step that does what the claim says.
3. **Switches**: flags, env vars and their defaults in the code, plan gates in pricing config, approvals and caps. Record what happens under each setting.
4. **Live evidence**: public pages or endpoints that show a switch's state, with the date seen. Never read `.env` files, and never sign in.
5. **Tests** that assert the behaviour (path:line), if any.
6. **Status:**

   | Status | When |
   |---|---|
   | Live | Has an entry point, is on by default, and is seen on the live site |
   | Beta | Reachable, but flagged, or labelled beta or limited |
   | Off | Built but switched off. In customer text: "Roadmap, no date" (claim-check) |
   | Planned | Only in docs, a roadmap, TODOs or issues |
7. **The source cell holds the trace**: entry, handler, switch (default), live evidence.

## Never

- Change the repo or run the app with secrets.
- Mark a feature live from its marketing page alone. The page shows what's promised; the code shows what's built.
