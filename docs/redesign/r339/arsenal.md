# r339 arsenal — tool log

- [T-00] git fetch --prune — sync remote branch/ref state before triage
- [T-00] git branch -r --merged/--no-merged — split 74 remote branches into 57 merged / 16 unmerged
- [T-00] git merge-tree --write-tree — no-op detection: merged-tree vs `origin/main^{tree}` per unmerged branch
- [T-00] git diff (three-dot + tip-vs-tip) — source-delta review vs merge-base and vs current main (supersession proof)
- [T-00] rg (ripgrep) — marker searches in `git show main:<file>` blobs (st-pill-icon-b, --rl-soft-ink, --wy-sx, MARK_PATHS)
- [T-00] git tag -a + git push (refs/tags/archive/*) — 72 annotated archive tags pushed and ls-remote-verified BEFORE any branch deletion
- [T-00] git push origin --delete — remote branch deletion (72 branches, tags-first rule honored)
- [T-00] git worktree prune — stale worktree cleanup check from /home/z/madarek (none dead)
- [T-01] bash — fresh-sandbox installs (root + frontend), `verify.sh --fast` gate run, dedicated build+gate proof at the 770 ceiling
- [T-01] git — branch status/commits/push of r339/t01-medic (ceiling commit + docs)
- [T-01] npm — dependency install in worktree root and frontend/
- [T-01] npx (tsc, vitest, vite) — via verify.sh --fast: typecheck, 3051 unit tests, production build for the bundle gate
- [T-01] node — ran scripts/check-bundle-size.mjs to prove the gate passes at the restored 770 KB gz ceiling (measured 764.3)
# R339 arsenal (tools actually used)
- [T-02] node — JSON analysis: semantic old↔new diff of mapping skip arrays (proving dead-letter removal is a measurement no-op), per-section before-data collection from git history blobs, audit-table math (off-book %, heuristic share), footer A/B cell-level comparison
- [T-02] ripgrep (rg) — skip-group census across mapping/*.json, excusals.md ruling-structure extraction, run.mjs flag/flow location
- [T-02] git — status/diff verification of partial state, rev-list --full-history blob archaeology for each section's newest committed run, stash-based A/B isolation of old vs new instrument on identical code
- [T-02] curl — vite dev-server health check (HTTP 200 on :5302) before smoke run
- [T-02] npm + npx vite — frontend deps + dev server on :5302 for the end-to-end smoke test
- [T-02] playwright (chromium via scripts/conformance/run.mjs) — footer conformance runs (old/new instrument, negative gate tests)
