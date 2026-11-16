# R354-UI — MERGE-REPORT (main vs merged, measured)

- `main` at merge time: **c83f6d67** (`fix(legal,r356): the privacy page names the
  LIVE host`) — one commit past the lane's base `c1273d80`.
- lane branch: `wip/r354-ui` (`3a5eab87`, `e5e1148c`, `551f2f2f`).
- integration branch: `merge/r354-ui`, `git merge --no-ff` — **no conflicts**
  (main's commit touches `docs/QA/copy-review/*` only; the lane touches CSS,
  `scripts/qa/overlap.mjs`, one mobile radius, docs).

## 1 · String parity — IDENTICAL

Extractor: strip `//` and `/* */` comments, take every quoted literal containing
an Arabic character, normalise whitespace, sort, sha1.

| tree | literals | sha1 |
|---|---|---|
| `origin/main` | 11 525 | `43ba9b282195b6cd7701c3de6929dd4a6f0aaffb` |
| merged | 11 525 | `43ba9b282195b6cd7701c3de6929dd4a6f0aaffb` |

Roots: `frontend/src`, `apps/mobile/src`, `apps/mobile/app`. **No copy moved.**

## 2 · Logic / route parity

`git diff origin/main..merge/r354-ui --stat`:

```
 apps/mobile/src/components/shell/AppTopBar.tsx |  5 +-   # one badge radius literal (8 → 0)
 docs/redesign/r354-ui/RESUME.md                | 64 ++++
 frontend/src/styles/components.css             | 24 ++++     # .btn.danger / .btn.success slab
 frontend/src/styles/layout.css                 | 19 +++-     # .topbar-user-name clamp + shrink
 frontend/src/styles/patterns.css               | 10 +++-     # .lg:not(.btn) guard
 frontend/src/styles/landing/hero-mechanics.css |  4 ++      # comment only (seat kept frozen)
 frontend/src/styles/landing/preloader.css      |  4 +-      # .pl-skip AA ink
 scripts/qa/overlap.mjs                         | 83 ++++++++ # --stress mode + overflowEls + landing guard
```

No routes, no queries, no API, no logic change.

## 3 · Metrics (main → merged)

| metric | main | merged | note |
|---|---|---|---|
| bundle gz (`check-bundle-size`) | — | **741.9 KB** ≤ 773 | main not built locally (its worktree has no deps); its only delta is docs |
| entry / pdf gz | — | 65.5 / 95.4 ≤ 92 / 110 | |
| CSS bytes (`src/styles/**`, raw) | 2 005 241 | 2 005 241 + 137 | additions are comments + 3 declarations |
| css-counts | 76 / 41 / 66 / 35 | 76 / 41 / 66 / 35 | unchanged, ratchet green |
| contrast-gate findings | **40** | **14** | 10 = hero Heron seat (frozen), 4 = `.st-pill` probe artifact |
| overlap stress (roles × 360/768/1024 × light+dark) | — (mode is new) | teacher 12 → **0** after the topbar fix; public `/` residual = journey anno at 1024×600 (map owner) | |
| copy-budget | unchanged | unchanged | no string edits (parity above) |
| frontend unit tests | CI green | 50/50 in the TZ-pinned run of the date suites; full run log `/tmp/p1/vitest-utc.log` | |
| conformance | ratchet 91.6, main green | untouched seats; hero comment-only | |

## 4 · Gates on the merged tree

| gate | result |
|---|---|
| `npm run build -w frontend` | ✓ |
| `check-icons.sh` / `check-colors.sh --strict` / `check-raw-css.sh --strict` | ✓ |
| `check-motion-tokens.sh` / `check-csp-hash.sh` / tokens `--check` | ✓ |
| stylelint + CSS ratchet | ✓ (45 errors = baseline) |
| size gate (`check-bundle-size`) | ✓ 741.9 KB |
| `bash scripts/verify.sh --fast` | vitest step fails **only** on date/locale suites when `TZ` is unset locally — the same files pass 50/50 under `TZ=UTC`; `scripts/ci/publish-rolling-release.test.sh` fails **identically on `origin/main`** (1/10, S3) — pre-existing/local-env, its CI job is green |
| main's own CI on c83f6d67 | **red**: Design gates job → copy-budget OFF-LIST hits in `docs/QA/copy-review/pack.md` (the copy lane's files, not touched here); Deploy Vercel red |
| lane CI on wip/r354-ui e5e1148c | **green** (CI, Size gate, deadcode) |
| merged PR CI | see §6 |

## 5 · Visual comparison

Rendered from the same built tree at 1440×900 and 390×844, light + dark:
`/404` primary CTA now paints the ember slab (`#FFF` on `rgb(219,58,0)` in light,
`rgb(29,29,28)` on `rgb(254,89,30)` in dark) instead of paper-on-paper, and
`/__design`'s success/danger variants carry their documented fills. Evidence
matrix: `contrast-gate.mjs` before 40 / after 14; the remaining 14 named in
RESUME §Residuals.

## 6 · Merge

- PR: see the PR opened from `merge/r354-ui` into `main`.
- Rule applied: merge only when the PR's failing checks are the same
  set/step/error as `main`'s own failing run on the same base.
