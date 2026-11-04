---
name: red-green-proof
description: How to prove a code fix works - check the project's tests can run before editing, write a test that fails for the right reason, make it pass, and show the test catches the bug. Use for every code change.
---

# Red-green proof

The code rubric puts 30 points on "tests pass, and a test covers the fix". A fix whose tests never ran can't score them.

## 0. Before you edit anything

1. **Find the project's own checks**: package.json scripts, Makefile, CI workflow files. Open each one and note what it covers and what it needs (lockfile, `node_modules`, build output, env vars).
2. **Know what you're allowed to run** (`.claude/settings.json`).
   - **In this team repo, run the suite with `node scripts/test.mjs`** (allowed). `node --test` on its own is not allowed and will be refused.
   - In a product repo, use its `npm test`, `npm run lint` or `npm run typecheck`.
3. **If the checks can't run** (dependencies missing, installing not allowed), stop before editing. Return `needs_input` with:
   - the exact commands a person must run;
   - that the tests criterion can't score until then;
   - which checks wouldn't cover the changed files anyway.

## 1. Red

1. **Name the break in one sentence**: "fails today because <what happens>; passes when <what should happen>."
2. **Write the test first.**
   - Expected values are written by hand, never computed by the code under test.
   - No assertion whose only subject is a mock.
   - No test that only pins a constant or exact wording, unless the wording is the fix. For copy or config fixes, assert on the rendered output or the function that uses the value.
3. **Run only the new test.** Record the command, the exit code and the message. It must fail for the reason you named, not an import error or a typo.

## 2. Green

1. **Make the smallest change** that passes.
2. **Re-run the new test, then the full suite, the type check and lint.** Record the exit codes and the pass and fail counts.
3. **Never write "all pass" when one failed.** Say which one, and why.

## 3. Prove the test catches the bug

Take the fix out and keep the test: `git stash` on your local branch, or comment the fix out. The test must fail. Put the fix back; the test must pass. Paste all three results.

## 4. Words in the write-up

- Every "passes", "fixed" or "works" in `outputs/dev/<task>.md` points to a command run after your last edit.
- No "should", "probably" or "seems" in the results.
- A check you couldn't run is written "not run: <reason>; a person runs <command>".
- For a text-only change, say "no behaviour test: text-only change", and run the checks that cover those files.

## Never

- Install dependencies without approval; a person runs installs.
- Push, merge or open a PR. That needs a person's yes.
- Delete files outside the change.
