# W10b — Inner public pages · Heron grammar (R332, re-run)

RE-RUN of a lane completed once before the environment reset (findings re-derived live, fix
re-applied). The three inner-public routes that do NOT ride the legal document shell —
**/colleges · /colleges/leaderboard · /competitions** — opened with the app-density PageHeader
(28px `--fs-app-h1`, no gutter index, no opening rule): the drawing-sheet grammar their siblings
speak (the `/legal` family's `.lg-bar`, the authed shell's `.page-index`) never reached them,
because guest pages never load `r319-shell.css` and `colleges.css` predates the sheet system.

Evidence: `/home/z/evidence-r332/w10b/` — 12 screenshots (3 routes × before/after × 1440/390).
Probe harness: agent-browser (headless Chromium), computed-style evals. Probed 2025-11-03,
vite :5173, backend DOWN (API proxy answers 500 — same as the previous run).

## 1 · Audit (guest mounts @1440×900 / 390×844, before the fix)

| # | route | header @1440 | @390 | indices | opening hairline | section bars | verdict |
|---|---|---|---|---|---|---|---|
| 1 | /about | **46.67px** display d1, w600 | 31.74px | `.lg-bar` [nn] | sheet grammar | 4 `.lg-bar` | PASS |
| 2 | /help | **46.67px** | 31.74px | n/a (FAQ cells) | sheet grammar | `.lg-faq` cells | PASS |
| 3 | /contact | **46.67px** | 31.74px | `.lg-bar` [nn] | sheet grammar | 4 `.lg-bar` | PASS |
| 4 | /legal/privacy | **46.67px** | 31.74px | `.lg-bar` [nn] | sheet grammar | 9 `.lg-bar` | PASS |
| 5 | /legal/terms | **46.67px** | 31.74px | `.lg-bar` [nn] | sheet grammar | 6 `.lg-bar` | PASS |
| 6 | /legal/cookies | **46.67px** | 31.74px | `.lg-bar` [nn] | sheet grammar | 6 `.lg-bar` | PASS |
| 7 | /legal/accessibility | **46.67px** | 31.74px | `.lg-bar` [nn] | sheet grammar | 4 `.lg-bar` | PASS |
| 8 | /legal/security | **46.67px** | 31.74px | `.lg-bar` [nn] | sheet grammar | 4 `.lg-bar` | PASS |
| 9 | /legal/data | **46.67px** | 31.74px | `.lg-bar` [nn] | sheet grammar | 5 `.lg-bar` | PASS |
| 10 | /app | **46.67px** | 31.74px | n/a | sheet frame + 4 marks | — | PASS |
| 11 | /campus | **46.67px** | 31.74px | n/a | sheet frame + 4 marks | — | PASS (11 reveals) |
| 12 | **/colleges** | **28px** app register, w600 | 24px | none | none | — | **FAIL — top offender** |
| 13 | **/colleges/leaderboard** | **28px** app register | 24px | none | none | — | **FAIL** |
| 14 | /colleges/:id | — backend down → `ErrorState` | — | — | — | — | PASS-shape (honest: header unprobed, data down) |
| 15 | **/competitions** | **28px** app register (authed mount) | 24px | none | none | — | **FAIL** (guests auth-walled → /auth) |
| — | /404 · /403 · /500 | 46.67px, index-free **by design** (r324 X10 error-sheet ruling — intentionally left untouched) | | | | | PASS |

Guest sheet chrome (`.sheet-frame`/`.auth-frame` + 4 corner marks) present on all guest mounts,
including the three FAILs — the pages sit ON the sheet; only the page-opening header grammar was
missing.

## 2 · The fix (re-applied from the lost run)

**NEW `frontend/src/styles/landing/inner.css`** — tokens only, deliberately UNLAYERED per the
r319-shell cascade precedent (imported only by the two owner chunks, after `colleges.css`;
unlayered declarations outrank every `@layer` rule regardless of specificity — no `!important`).
Three marker-scoped rules, so pages without the `.inx-head` marker render identically:

1. `.inx-head` — the opening hairline: `border-block-start: 1px solid var(--rule-strong)` +
   `padding-block-start: var(--sp-5)` — the `.lg-bar` recipe verbatim (legal.css §3);
2. `.inx-head .pf-page-title` — `font-size: var(--fs-d2)` (the clamped d2 rung, r325 Y4:
   **40px @1440**, floored **31.74px @390**);
3. `.inx-head .page-index` — the `.lg-bar-index` accent register spelled out self-contained
   (guest pages never load r319-shell.css): mono `var(--font-mono)`, `var(--fs-sm)`,
   `var(--fw-medium)`, `0.06em` tracking, tabular-nums, `var(--accent-ink)` ink,
   `margin-inline-end: var(--sp-2-5)`. The higher-specificity unlayered rule also wins on the
   authed /competitions mount, where r319-shell's own `.page-index` is loaded.

**Wraps** (`index="01"` on each wrapped PageHeader — renders the aria-hidden `[01]`):

- `CollegePages.tsx` — CollegesIndexPage (`/colleges`) + CollegesLeaderboardPage
  (`/colleges/leaderboard`); `import '../../styles/landing/inner.css'` after `colleges.css`;
- `CompetitionsPages.tsx` — CompetitionsIndexPage (`/competitions`); same import placement.

## 3 · Probe — before → after (computed styles)

| route | h1 @1440 | h1 @390 | `[01]` index | opening hairline | body height @1440 | h-scroll @320 |
|---|---|---|---|---|---|---|
| /colleges | 28px → **40px** | 24px → **31.74px** | none → **[01]** (Geist Mono, `#C72E00` = `--accent-ink`) | none → **1px solid `--rule-strong`** + 20px (`--sp-5`) gap | 997 → **997** (unchanged¹) | docW 320 = vw → **none** |
| /colleges/leaderboard | 28px → **40px** | 24px → **31.74px** | none → **[01]** | none → **1px solid + 20px** | 997 → **997** (unchanged¹) | docW 320 = vw → **none** |
| /competitions | 28px → **40px** | 24px → **31.74px** | none → **[01]** | none → **1px solid + 20px** | 900 → **900** (unchanged¹) | docW 320 = vw → **none** |

¹ Body height unchanged @1440 explained: the guest mounts' document height is floored by the
viewport + guest chrome (900px fold + 97px tail = 997); the authed /competitions mount is floored
by the viewport (900). The header block grew (~+33px: 40px d1↔d2 step + hairline + pad) entirely
inside that floor — measured `.pf-page` height 547.4px ≪ the 804px fold budget on /colleges.

**No-regression sweep** (marker-scoped selectors — pages without `.inx-head` can't be reached):
/about 46.67px/1490 · /help 46.67/1593 · /contact 46.67/1407 · /legal/privacy 46.67/3129 ·
/campus 46.67/3145 (11 reveals) · /app 46.67/2588 · /404 46.67 · /colleges/:id ErrorState/997 —
every value byte-identical before → after; zero `.inx-head` leakage onto any other route.

## 4 · Gates

| gate | result |
|---|---|
| `npx tsc -b --noEmit` | **clean (exit 0)** |
| `npx -y stylelint@16 "src/styles/landing/inner.css"` | **0 issues** |
| `npx vitest run legal-pages r305-nav-maps nav-active-vocabulary CompetitionsModal` | **4 files, 121/121 passed** (no test edits) |

## 5 · Honest gaps

1. **Backend DOWN** (whole session; same as the previous run): `/api/v1/*` answers 500 through the
   vite proxy. `/colleges` + `/colleges/leaderboard` render `ErrorState` under the fixed header —
   the header grammar is what this lane owns and it is fully verified against the real render;
   data-full layouts (gallery rows, leaderboard table) remain visually unverified with live data.
2. **/competitions auth-walls for guests** (`ProtectedRoute` → `/auth`). The authed mount was
   probed via a seeded probe session (`localStorage['mdrk-auth']`, role STUDENT, token
   `probe-token`) — an honest harness, recorded as such; the data area again renders `ErrorState`
   (API 500). No real login was possible.
3. **/colleges/:id detail header** unprobed for type register (no `<h1>` renders while the fetch
   errors). Detail pages are outside this lane's fix scope (brief: colleges index + leaderboard +
   competitions index only) — unchanged by the fix (no-regression sweep includes it).
4. **Error sheets** (/404 /403 /500) are intentionally index-free per the r324 X10 design ruling —
   deliberately NOT "fixed".
5. **Authed /colleges mount**: a signed-in visitor gets AppShell around the same components, so
   `.inx-head` renders there too (verified: 40px + [01] + hairline inside the shell — the
   self-contained `.page-index` register intentionally wins over r319-shell's grey one, keeping
   ONE accent register across both mounts).
6. Working tree also carries **other lanes' parallel changes** (App.tsx, ConsentBanner, SheetNav,
   hero.css, consent.css — w7/w8); untouched by this lane. No git commits made (per brief).
