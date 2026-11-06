# T-00 — Branch Triage & Cleanup (round r339)

- **Agent:** T-00 (branch `r339/t00-branches`, base `main` @ `c62973c8`, 2026-11-06 06:38)
- **Mission:** triage the 73 non-main branches on origin; archive-tag everything before deletion; keep only live branches.
- **Method:** `git fetch --prune` → `git branch -r --no-merged origin/main` (16 found) → per branch: `git merge-tree --write-tree origin/main origin/B` (none produced main's tree — all "add" something), `git diff main...B --stat` (delta vs merge-base), tip-vs-tip `git diff main B -- <files>` + `rg` markers in `git show main:<file>` (supersession proof), `git log main..B --no-merges` (unmerged commits). CI is dead (owner quota) — git ops only, no waiting.
- **Rule honored:** every deleted branch has its `archive/<name>` annotated tag pushed and verified on the remote **before** `git push origin --delete`.

## Outcome summary

| Metric | Before | After |
|---|---|---|
| Remote branches (incl. main) | 74 | 3 (`main`, `r339/dispatch`, `r339/t01-medic`*) |
| Archive tags pushed this task | — | 72 (all verified via `git ls-remote --tags`) |
| Branches deleted | — | 72 |
| Branches kept | — | `r339/dispatch` (active round dispatch, checked out in `/home/z/madarek`) |
| Cherry-picks to main | — | 0 (see rationale below) |

\* `r339/t01-medic` was pushed by sibling agent T-01 mid-task; it was not part of the original 74 and was not triaged.

## Table A — the 16 unmerged branches (deep review)

| Branch | Adds? | Source files touched (vs merge-base) | Verdict | Tag |
|---|---|---|---|---|
| `feat/mobile-r334-pro` | adds | 180+ `apps/mobile/**` (tip-vs-main: only 6 files differ) | **archived-superseded** — main carries the hardened `nextStep()` (poisoned-net shape-guards the branch lacks) and the R335 font deep-import diet; branch is the stale pre-hardening snapshot | `archive/feat/mobile-r334-pro` |
| `r338/dispatch` | adds | none (docs only) | **archived-docs-only** — r338 BRIEF/HANDOFF/QUEUE; round closed by final r338 report on main | `archive/r338/dispatch` |
| `r338/land-w20` | adds | statement.css, strata.css (dead-seat retirement), Footer/FooterLens, results snapshots | **archived-superseded** — intro commit `cdd6cace` (statement.css `st-pill-icon-b` seat) is on main in evolved form; strata dead-css retired on main | `archive/r338/land-w20` |
| `r338/land-w21` | adds | strata.css (−dead fo-*/wy-rail), WhyScene.tsx, Why.tsx, statement.css, roles.css | **archived-superseded** — strata.css byte-identical to main; WhyScene/Why superseded by main's train-side (t09) version with data-spec seats | `archive/r338/land-w21` |
| `r338/land-w22b` | adds | roles.css, statement.css, cta merge | **archived-superseded** — `--rl-soft-ink` + intro mechanisms both on main evolved; t10-cta content merged | `archive/r338/land-w22b` |
| `r338/land-w4` | adds | App.tsx, LandingPage.tsx, r309-recovery.e2e.ts, scroll.mjs | **archived-superseded (fully absorbed)** — only an unpushed merge commit; all 3 source files byte-identical to main | `archive/r338/land-w4` |
| `r338/land-w5` | adds | none (3 lines arsenal.md) | **archived-docs-only** | `archive/r338/land-w5` |
| `r338/land-w7` | adds | WhyScene.tsx, Why.tsx, why.css (t05-why rewrite) | **archived-superseded** — main's why.css carries the `--wy-sx` seat vars (t09 side) and why section is ≥90%; branch ended at ~61% | `archive/r338/land-w7` |
| `r338/t02-land-usecase` | adds | roles.css, strata.css (dead `.rl-head/.rl-lede/.rl-more` retirement) | **archived-superseded** — retirement documented verbatim in main's strata.css comments; branch still carries 15 legacy `fo-fgrid/fo-wordmark/wy-rail` rules main already retired | `archive/r338/t02-land-usecase` |
| `r338/t03-intro` | adds | statement.css (+44: icon seat forensics, 50/37/41px boxes) | **archived-superseded** — `st-pill-icon-b` / `inline-size: 50px` markers present in main's evolved statement.css; intro on main ≥90% vs branch's 77% | `archive/r338/t03-intro` |
| `r338/t06-footer` | adds | Footer.tsx (533), footer.css (1081), FooterLens.tsx (deleted both sides), walk-footer-dom.mjs, build-footer-mapping.py | **archived-superseded** — branch ended 69.2% light / 68.5% dark; main's 2026-11-06 footer rewrite reached 92.3% / 91.3% *after* this branch froze | `archive/r338/t06-footer` |
| `r338/t14b-dark` | adds | roles.css (`--rl-soft-ink` dark arm) | **archived-superseded** — main has the same var evolved (T-14b/T-02e: 43 seats, 7.7:1 vs branch's 33 seats, 7.9:1 note) | `archive/r338/t14b-dark` |
| `r338/t99b` | adds | App.tsx (±7), AuthPages.tsx, ErrorPages.tsx (barrels), Product/Roles.tsx, platform.css, roles.css | **archived-superseded (unlanded diet, see notes)** — barrel restructure never landed (files absent on main); footer content superseded; bundle math stale | `archive/r338/t99b` |
| `r338/t99br-diet` | adds | Topbar.tsx + AppShell.tsx (lazy `GlobalSearch`/`CommandPaletteBody`), Footer.tsx (`as const`) | **archived-unlanded (contested perf delta — see notes)** | `archive/r338/t99br-diet` |
| `r338/t99c` | adds | Footer.tsx / footer.css / why.css / WhyScene.tsx diet + why re-seat (23 commits) | **archived-superseded (landed)** — diet round 1 is on main as `dd0fd5c4` (same message; `MARK_PATHS` present in main's Footer.tsx); why work superseded (62.8% → ≥90%) | `archive/r338/t99c` |
| `r339/dispatch` | adds | docs/redesign/r339/{HANDOFF,QUEUE,arsenal}.md | **kept — active** round-339 dispatch branch; checked out in `/home/z/madarek`; seeds the current round's queue | (none — alive) |

## Table B — the 57 fully-merged branches (all archived + deleted)

All are ancestors of `main` (`git branch -r --merged origin/main`), so their commits remain reachable from `main` forever; the archive tag is a courtesy pointer at each tip. No-op test n/a (already merged). Files touched: see main history.

`r337/intro`, `r337/problem`, `r337/usecase`, `r338/anullfix`, `r338/land-final`, `r338/land-w12`, `r338/land-w15`, `r338/land-w23`, `r338/land-w8`, `r338/t01-medic`, `r338/t02-usecase-residual`, `r338/t02e-darkink`, `r338/t03g-intro`, `r338/t03h-intro`, `r338/t03i-intro`, `r338/t04-problem`, `r338/t05-why`, `r338/t05-why-f`, `r338/t05g-why`, `r338/t05h-why`, `r338/t05i-why`, `r338/t05j-why`, `r338/t05k-why`, `r338/t05l-why`, `r338/t05m-why`, `r338/t06f`, `r338/t06g`, `r338/t06h-footer`, `r338/t06i-footer`, `r338/t06j-footer`, `r338/t06k-footer`, `r338/t06l-footer`, `r338/t06m-footer`, `r338/t06n-footer`, `r338/t07-scroll`, `r338/t08-platform`, `r338/t08c3-platform`, `r338/t08c4-platform`, `r338/t09-map`, `r338/t09e-map`, `r338/t10-cta`, `r338/t10c-cta`, `r338/t10e-cta`, `r338/t11-hero`, `r338/t13b-interact`, `r338/t14a-instrument`, `r338/t14a2-contrast`, `r338/t20-agents`, `r338/t21-docs`, `r338/t22-deadcode`, `r338/t24-cuts`, `r338/t90-panel`, `r338/t90b-panel`, `r338/t99`, `r338/t99d2-axios`, `r338/tolfix`, `test-r338-diag`

→ each tagged `archive/<name>` (annotated, verified on remote) then deleted. Verdict for all: **archived-merged**.

## Cherry-pick decisions — none taken, rationale

Mission rule: only strictly-additive / obviously-beneficial deltas may be cherry-picked, and only with `verify.sh --fast` green after `npm install` (not run — no source touched, so not required). Findings per candidate:

1. **Every r338 wave branch's section work is on main in evolved form** (verified by tip-vs-tip diffs and marker searches: `st-pill-icon-b`, `--rl-soft-ink`, `--wy-sx`, `MARK_PATHS`, dead-seat retirement comments). Main's sections are all ≥90% (light+dark) per the r338 final report; the branches ended between 61–93%.
2. **`r338/t99br-diet` (lazy GlobalSearch)** is the only unmerged source delta NOT on main. Not cherry-picked: it is contested — the branch measured entry 90.7→84.2 KB gz, but sibling measurement on `r338/t99b` (6562b0c4) found the same React.lazy split net-negative (783.4 KB total vs the 777 ceiling — rollup micro-chunk tax on shared deps exceeds entry relief). Re-verifying needs a clean build (`npm install` + bundle measure), which is out of scope for this box. **Recommendation:** if the JS ratchet matters again, spawn a dedicated perf task to re-apply 5acac766 from `archive/r338/t99br-diet` onto current main and re-measure.
3. **`r338/t99b` barrels (AuthPages/ErrorPages lazy-family)** — same class: a route restructure measured 777.9→775.5 KB gz on a tree that no longer exists (files since diverged; `AuthPages.tsx` absent on main). Re-apply only with fresh measurement. **Recommendation:** same dedicated perf task.
4. `feat/mobile-r334-pro` — main is strictly ahead (hardened `nextStep()` guards + R335 font deep-imports); cherry-picking would regress.

## Worktrees

`git worktree prune` run from `/home/z/madarek` — no dead entries. Live: `/home/z/madarek` (r339/dispatch), `/home/z/wt-t00` (this branch), `/home/z/wt-t01` (r339/t01-medic), `/home/z/wt-t02` (r339/t02-audit), `/home/z/wt-t15` (r339/t15-webkit). All left in place.

## Tools used

See `arsenal.md` (appended lines prefixed `[T-00]`).
