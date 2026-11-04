---
name: root-cause-first
description: How to find the real cause of a bug before fixing it - reproduce, trace back to the origin, compare with a working case, test one idea at a time, and stop after three failed fixes. Use for every bug and before any fix.
---

# Root cause first

The code rubric puts 25 points on "root cause supported by evidence". A fix aimed at a symptom comes back.

1. **Investigate.**
   - Read the whole error.
   - Reproduce it with exact steps, or write down why you can't.
   - Check what changed recently on that path: `git log` and `git diff`.
   - For a flow that crosses parts (page, then API, then job, then store), log once what enters and leaves each part to find the layer that fails. For config, print only SET or UNSET, never the value.
2. **Trace backwards.** From the line where it shows, ask "what called this, and with what value?" until you reach where the bad value starts. Fix it there.
3. **Compare.** Find a working sibling in the same repo, and list every difference.
4. **One idea at a time.**
   - Write it as "X causes it because Y (file:line or output)".
   - Test it with the smallest change.
   - If it's wrong, undo it and form a new idea. Never stack fixes.
5. **Stop after three failed fixes.** Return `blocked` with what you tried. Three failures usually mean a design problem, and a person decides.
6. **Behaviour that depends on a setting**: test it both ways (on and off, 0 and not 0) before you claim it.
7. **Write a "Root cause" section in the write-up**:
   - the symptom;
   - the origin (file:line);
   - the chain of evidence, each link marked *seen* or *inferred*;
   - the ideas you rejected, and why.
8. **Remove every diagnostic log** before you commit.

## Never

- Print secrets, tokens or keys while debugging, or read `.env` files.
- Grep for one literal phrase and call it "nowhere else". Search for the idea in other wordings too.
