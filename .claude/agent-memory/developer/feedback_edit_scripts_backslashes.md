---
name: edit-scripts-backslashes
description: In Bash heredocs the tool halves backslashes, so scripted multi-line edits lose regex escapes; write helper scripts with the Write tool instead
metadata:
  type: feedback
---

When a scripted edit (node script via `cat > x.cjs <<'EOF'`) contains regex or `\n` escapes, the Bash tool delivered half the backslashes: `/\.md$/` became `/.md$/` and `\d` became `d`, with no error.

**Why:** found while editing `scripts/projects.mjs` in T-20261104-19; the broken regex passed `node --check` and was caught only by reading the diff.

**How to apply:** write helper edit scripts with the Write tool (exact text), or use Edit for single changes. After any scripted edit that touches a regex, read `git diff` for backslashes. Also: one unbalanced quote anywhere in a Bash command stops the whole command from running, including earlier lines.
