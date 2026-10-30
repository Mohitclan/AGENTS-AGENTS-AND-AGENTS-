---
name: search-summary-claims
description: How to judge research claims marked "via search summary, not opened", and to check vendor FAQs for features a researcher calls unconfirmed
metadata:
  type: feedback
---

Claims marked "via search summary, not opened" are acceptable only in internal research, only if they are clearly marked and nothing depends on them. If their only URL is dead, they have no source. Check them against the link-check output, because these URLs are often the ones that fail. Also check rows whose header claims "opened unless noted": in T-20261030-02 an unmarked row's URL returned 404.

**Why:** in T-20261030-02, 3 of the 4 broken links were search-summary citations. The researcher also called RepoClip's API and GitHub Action "directory listing only", but the vendor's own homepage FAQ stated both, and that changed the differentiator analysis.

**How to apply:** for competitor features a researcher calls unconfirmed, open the vendor homepage and FAQ before accepting the caveat. Opening a search-summary source yourself can upgrade it (e.g. a PeerPush listing). When a fix says "remove the dead URL", also say to remove or re-source the figure it backed. In round 2 of T-20261030-02 the researcher removed the URL as told and kept the figure, which left it unsourced.
