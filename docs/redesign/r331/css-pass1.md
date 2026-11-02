# R331 · A-CSS pass 1 — report

Scope: `frontend/src/styles/**` (54 sheets, **51,633 lines**), entry `frontend/src/main.tsx`,
gates under `scripts/gates/`. Commits: `8ba6778b` (@layer constitution) → `29e1685d`
(!important census + top-20) → `a6b64fa8` (stylelint baseline + coverage snapshot) →
`5d0fc1db` (coverage harness) → this report.

---

## 1. Loading map — which sheet loads where

**Eager (main.tsx, import order = cascade tie-break order):**

| # | sheet | note |
|---|-------|------|
| 1 | `layers.css` | R331 — `@layer reset, tokens, base, layout, components, pages, utilities;` FIRST, before any rule parses |
| 2 | `fonts.css` | @font-face first so families register before tokens/base reference them |
| 3 | `tokens.generated.css` | R326 — generated token half, lands inside `@layer tokens` |
| 4 | `tokens.css` | hand-written seats compose on top |
| 5 | `motion.css` | SectionAccent primitives; eager because CollegePages renders them too |
| 6 | `base.css` | |
| 7 | `components.css` | |
| 8 | `layout.css` | |
| 9 | `patterns.css` | |
| 10 | `auth.css` | global (documented cross-page borrows) |
| 11 | `notifications.css` | also imported by `lib/toast.ts` |
| 12 | `student.css` | global (documented cross-page borrows) |
| 13 | `polish.css` | the round-patch capstone |

Everything else is **lazy, riding the page-module chunks** (Vite splits per importer):

| sheet | importers |
|-------|-----------|
| `admin.css` (6) | AdminPages/AdminExtraPages/AdminGovernancePages/AdminSync, Owner institutions ×2 |
| `r305-admin-owner.css` (7) | same admin/owner family |
| `owner.css` (6) | OwnerPages, exams, teacher live/intelligence/exam-author, competitions |
| `landing.css` | LandingPage only (r330 dedupe unlocked the move) |
| `r314-chrome.css` | LandingPage |
| `r330-home.css` | LandingPage |
| `colleges.css` | CollegePages, CompetitionsPages, CommunityPages (shared chunk) |
| `campus.css` | CampusPages, CapabilityPages |
| `auth/legal` | `legal.css` → LegalSheet |
| student family | `r305-student*.css`, `r319-student*.css`, `r321-*`, `ai.css`, `research.css` → the student page modules |
| teacher/quality | `teacher-quality.css`, `r305-teacher-quality.css`, `training.css` (9 importers — cross-role) |
| `r305-research-pdf-ai.css` | ResearchReview, DocumentViewer, Library, Research, AiAssistant |
| `pdf.css` | DocumentViewerPage |
| `player.css` | VideoPlayerChrome component |
| `r314-productframe.css` | ProductFrame component |
| `illustrations.css` | Illustration, BrandLoader components |
| shell chrome | `r305-shell.css`, `r319-shell.css`, `r325-shell.css`, `r325-app.css`, `r325-indicators.css` → AppShell (+ indicators borrowers) |
| misc pages | `r320-settings.css`, `r321-community.css`, `r321-exams.css`, `r321-map-live.css`, `r321-player-page.css`, `r323-brand.css`, `r323-design.css`, `vision.css` |
| **zero importers** | `unified-parity.css` (1,300 lines), `shared-design-system.css` (404 lines) — dead weight, pass 2 §A |

Also outside `styles/`: `components/motion/cursor.css` (0 `!important`), Logo.tsx inline
`<style>` (1 `!important` — RM kill, leave: ships with the component).

## 2. The @layer constitution (commit `8ba6778b`)

`layers.css`, imported **first**, declares: `@layer reset, tokens, base, layout, components, pages, utilities;`

| layer | seats today | pass-2 candidates |
|-------|-------------|-------------------|
| `reset` | *(reserved, empty)* | future normalize/reset sheet |
| `tokens` | tokens.css ★, tokens.generated.css ★ | — |
| `base` | base.css ★ (partial) | fonts.css (@font-face doesn't compete; seat for tidiness) |
| `layout` | layout.css ★ (partial) | r305-shell, r319-shell, r325-shell |
| `components` | components.css ★ (partial) | patterns.css, polish.css §pages blocks |
| `pages` | many r3xx sheets already `@layer pages` | landing/auth/student/notifications/admin/owner/… full migration |
| `utilities` | *(reserved, empty)* | future atomic-utility sheet |
| `overrides` | polish.css §overrides ★, motion.css §overrides ★ | the capstone — round-patches that must beat `pages` |

`overrides` is deliberately **not** re-declared in layers.css: its first appearance is
motion.css's own order statement, and re-declaring would hoist it *before* `utilities`.
Unlayered rules still out-rank every layer — the documented escape hatches
(base.css §loader, components.css 38px note, r321-player-page) survive pass 1 untouched.

**Cascade neutrality — proven, not assumed:** §5.

## 3. `!important` census

| measure | before pass 1 | after `29e1685d` | verified recount (today) |
|---------|---------------|------------------|--------------------------|
| raw grep lines (`grep -r '!important' src/styles`) | 115 | **107** | 107 ✓ |
| real declaration tokens (comment-stripped) | 80 | **71** (census) | **61** |

Recount methodology note: the census's "71" was a line-heuristic; stripping comments
first (dead commented-out declarations excluded) gives **61 live tokens** — the 10-token
delta is commented-out/historical mentions, not live cascade weight. Verified
distribution: polish.css 22 · base.css 10 · unified-parity.css 6 · components.css 6 ·
shared-design-system.css 5 · pdf.css 4 · landing.css 4 · layout/legal/motion/research 1 each
(+1 in Logo.tsx inline `<style>`). **11 of the 61 live in the two zero-importer sheets**
— they vanish for free in pass 2 §A.

## 4. Coverage numbers (`scripts/gates/css-coverage.mjs`, output `css-coverage.json`)

Full sweep, checkpointed, 66/66 route probes rendered clean (no failures), light+dark ×
390/768/1440, guest + role-guarded route sets (STUDENT 17 routes so auth-gated sheets
load and their live selectors are exonerated):

| metric | value |
|--------|-------|
| sheets loaded | 46 |
| unique selectors probed | 5,061 |
| matched on ≥1 route | 1,537 (30.4%) |
| **dead candidates** | **3,524** |

Heuristics (conservative, in-file): pseudo-elements/interaction pseudo-classes stripped
before matching; @media/@layer/@supports blocks walked regardless of applicability;
only *loaded* sheets measured — the two zero-importer sheets are invisible to this
harness and handled separately as §A below. Full selector→routes/files map (636KB):
`/home/z/heron-lab/css-coverage-full.json`.

Worst dead-rate files (loaded sheets): teacher-quality 385/397 dead · r305-research-pdf-ai
222/228 · owner 163/165 · r305-teacher-quality 142/153 · components 644/785 · student
460/523 · landing 273/763 · polish 189/332. Role-guarded sheets have few routes probed
(TEACHER/ADMIN/QUALITY: 1–3 routes) — their dead lists need per-selector re-verification
before deletion; STUDENT (17 routes) and guest (12 routes ×2 themes) lists are high-confidence.

## 5. Screenshot proof — the constitution is cascade-neutral

Prior runs left partial evidence dirs in `/home/z/heron-lab/css-shots/` but no committed
verdict; captured fresh. Harness: `scripts/gates/css-shots.mjs` (deterministic:
prefers-reduced-motion forced, fonts.ready + 2s settle, viewport-fit captures).
**A** = `wt/css` dev (5173, with `8ba6778b`+`29e1685d`) · **B** = clean `main` dev
(5179, `/home/z/madarek` — constitution NOT in main, verified: `merge-base --is-ancestor`
fails; its server 404-falls-back on `/src/styles/layers.css`).

| route | 1440 | 390 |
|-------|------|-----|
| `/` | 0.000% · meanAbs 0.000 | 0.000% · meanAbs 0.000 |
| `/login` | 0.000% · meanAbs 0.000 | 0.000% · meanAbs 0.000 |
| `/about` | 0.000% · meanAbs 0.000 | 0.000% · meanAbs 0.000 |

All six pairs **pixel-identical** (metric: % pixels differing >8/255 on any channel +
mean abs diff; PNGs at `/home/z/heron-lab/css-shots/{wt,main}-{home,login,about}-{1440,390}.png`).
No culprit investigation needed — the empty-layer declaration is neutral by construction,
as claimed.

## 6. stylelint baseline (`a6b64fa8`, runner `npx -y stylelint@16`)

**208 problems — 82 errors, 126 warnings** across 53 sheets:

| rule | tier | count |
|------|------|-------|
| no-duplicate-selectors | error | 79 |
| declaration-block-no-duplicate-properties | error | 3 |
| no-descending-specificity | warning | 126 |

Worst offenders (errors): landing.css 34 · components.css 14 · layout.css 7 · tokens.css 6 ·
owner.css 5 · polish.css 4. Gate contract: fails only if **errors grow** above baseline;
warnings are the pass-2 backlog. `no-important` deliberately unconfigured (not a
stylelint-16 core rule; no plugin exists on npm) — tracked by the §3 census instead.

## 7. Pass-2 plan — ordered, riskiest last

1. **§A — delete the orphans (zero risk, do first):** `unified-parity.css` (1,300 lines,
   6 !importants) + `shared-design-system.css` (404 lines, 5 !importants) have **zero
   importers**. −1,704 lines, −11 !important tokens, no cascade exposure.
2. **§B — high-confidence dead-rule pruning:** selectors dead across *all* role sets from
   `css-coverage-full.json`, STUDENT/guest sheets first (17/12 routes probed → trustworthy),
   per-selector `querySelector` spot-check before each deletion. Re-run coverage after.
3. **§C — role-sheet dead lists:** teacher/quality/admin/owner sheets — verify each
   candidate against the routes the harness *didn't* visit (few routes probed per role)
   before cutting; anything reachable from an unprobed route stays.
4. **§D — duplicate-selector merges (mechanical, error-tier):** landing 34, components 14,
   layout 7, tokens 6, owner 5, polish 4 → then pin `max-errors` to the shrinking baseline
   so the gate grows teeth.
5. **§E — !important retirement in polish.css (22):** adopt §C canonical belt per family
   (RM kills, timing overrides); each family proven with css-shots pairs before/after.
6. **§F — @layer migration file-by-file (riskiest, last):** tokens → base → layout →
   components → pages, preserving the documented unlayered escape hatches; every move
   gated by css-shots diff ≈ 0 + coverage re-run; `overrides` stays the capstone.

Each step: re-run `lint:css`, `gate:css-coverage`, css-shots pairs; commit separately.
