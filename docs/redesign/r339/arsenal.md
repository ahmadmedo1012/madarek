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
# Arsenal — tools used per task (append one line per tool)

- [T-15] npm install — root + frontend deps (playwright 1.60.0 available in frontend)
- [T-15] npx playwright install webkit — fetch webkit build into ~/.cache/ms-playwright
- [T-15] apt-get download — user-space fetch of 9 missing-lib .debs (no root needed)
- [T-15] dpkg -x — extract debs into /tmp/webkit-prefix
- [T-15] ldd — audit MiniBrowser/WebKit*Process for unresolved libs (3 rounds: 10 → 4 → 0)
- [T-15] readelf -d / strings / nm -D — RPATH audit + locate error strings & GLVND env-var names
- [T-15] apt-cache policy/search — map missing .so files to trixie package names
- [T-15] gcc + dlopen probe (eglprobe.c) — prove EGL surfaceless works once GLVND finds Mesa vendor
- [T-15] bash scripts/conformance/webkit-libs.sh — idempotent user-space recipe (download+extract+patch+exports)
- [T-15] npx vite --port 5315 — dev server for the webkit instrument cells
- [T-15] node scripts/conformance/run.mjs --engine webkit — footer cells under WebKit (96%/85%)
- [T-15] curl — 200-check the vite dev server before webkit cells
- [T-15] rg — verify prior patch state + locate --bps/--engine flags in run.mjs
- [T-15] node (failure-set diff) — prove webkit/chromium cells differ only by sub-pixel drift
- [T-10] python3 — schema-validated the 5 chrome.<bp>.json specs vs footer.1440.json (element keys identical; chrome adds headerSeat + chromeExtra: preloader/consent/cursor all present per bp)
- [T-10] rg/Read — reviewed run.mjs mapping loader (underscore-prefixed files ARE picked up by readdirSync — the rename was for grammar clarity), mapping/chrome.json grammar check (105 explicit, 845 noCounterpart w/ reasons, 54 plumbing, 0 uncovered spec paths at all 5 bps)
