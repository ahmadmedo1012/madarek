# R342-10 — Quality & Platform Owner (final report)

Owner: **R342-10** (Academic Quality Product Designer / Platform Governance Frontend Lead).
Branch: `wip/r342-quality-owner` · Base: `origin/main` @ `620a31ecb300b1a605a452c3ddf029fb999ed4b8`.
Worktree: `/home/z/wt/r342-10` · Dev server: vite @ `:5310` (launched via the direct
`node_modules/.bin/vite` binary — see the environment note; never `npx`).

## 1. Scope & method

Exclusive ownership honored: `frontend/src/pages/quality/**`, `frontend/src/pages/owner/**`,
`frontend/src/styles/owner.css` (untouched — no CSS changes were needed), the pages-*.mjs
harnesses for these routes, and owner-specific supporting components (none needed edits).
D10's `teacher-quality.css` was already deleted at base (grammar lives in `patterns.css §11`).

Method: honest baseline on a repaired environment → VLM (glm-5.3-flash) design review of
full-page screenshots at 390+1440 light for all 20 owned routes → **DOM-verified every VLM
claim** (bounding boxes, computed styles, innerText) before changing anything → fix only
measured defects → re-measure → re-test.

## 2. Environment repair (the round's biggest finding — nothing in-repo caused it)

The fresh sandbox worktree carried a **nested `node_modules/node_modules/`** (an implicit
`npm exec` install triggered by launching vite via `npx`): `react-chartjs-2` resolved its
`chart.js` import to the nested sibling copy → **two Chart.js registries** → every
chart-bearing page (`/quality/{dashboard,engagement}`, `/owner/{dashboard,governance,education,ai}`)
rendered «حدث خطأ غير متوقّع» in BOTH the dev dep-optimizer AND the rollup build
(sourcemaps proved two `chart.js` module instances). D10/D11's recorded 99s were real —
their box had one copy. Fix: delete the nested tree, relaunch via
`node_modules/.bin/vite` (npm exec is what created it), rebuild clean (one registry).
Consequence for every agent on this box class: **never `npx vite` inside a worktree.**

## 3. Honest measurements (pages.mjs-shape harnesses, floor 90)

**Quality (7 owned routes × 1440/390 × light/dark = 28 cells):** light worst **98.3**
(`/quality/reports` @1440), dark worst **99.4** — ALL PASS. Identical to the D10 record:
the R341 quality work is intact and is PRESERVED byte-for-byte (zero changes to
`pages/quality/**` — no measured defect existed there).

**Owner (13 owned routes × 2 bps × 2 themes = 52 cells):** light worst **98.2**
(`/owner/users` @1440), dark worst **98.7** — ALL PASS, matching D11's record.

Shared seats measured through my harnesses (other agents' files — REPORT ONLY):
- `/quality/exam-moderation` (shared `ExamModerationPage`): **78.7/79.1** light — below
  floor; missing `[nn]` numeral + hover CTA (unchanged since D10's note "shared D8 seat").
- `/quality/community` (shared `CommunityPage`): **81.2/81.2** — below floor.
- `/quality/notifications` + `/owner/notifications` (shared `AlertsPage`): 97.8–97.9 — pass.

## 4. Defects found & fixed (each DOM-verified before and after)

1. **`/owner/institutions` harness fixture was stale vs. the real wire shape** — carried
   `city`/`studentCount`/`teacherCount`/`courseCount` (fields `GET /owner/institutions`
   never sends) and MISSED the required `activeMembershipCount`, so the detail page's
   `countAr(institution.activeMembershipCount, …)` rendered a literal
   **«undefined عضواً نشطاً»** in the hermetic capture. Fixture corrected to the real
   shape; `undefined` DOM-verified gone; the page code itself was always type-correct.
2. **Teacher-picker fixture gap** — the offering form's `/owner/users?role=TEACHER&
   institutionSlug=zu` query was swallowed by the no-query mock entry, offering every
   role as a choosable «أستاذ». A query-constrained entry now answers the honest roster.
3. **`/owner/ai` badge-less since D11** — the r160 honest-surface `/ai/config` fixture was
   missing (loud 501); the header now renders its truthful «محليّ» badge (local composer
   — what this transport actually represents).
4. **`OwnerDashboardPage` missing its `[01]` header gutter numeral** — the OWNER_NAV
   register's first seat, the only page without one after D11 (13/13 complete now).
5. **Glued bidi runs in the faculty meta line** — `.admin-faculty-meta` has ZERO CSS
   rules repo-wide, so its four bare inline spans rendered «قسمان18 مقرّراً140 طالباً»
   (exactly what the VLM read; DOM-confirmed no gaps). Fixed in content with the family's
   own «·» separator idiom: «الزاوية · قسمان · 18 مقرّراً · 140 طالباً» (verified @390).

## 5. VLM claims REFUTED by measurement (kept as-is — no churn without a measured reason)

- "Dead voids / content pinned to the right edge at 1440" — every page root measures
  centered: 1080px content, equal 144px gutters both sides; strips/cards span full width.
- "[nn] numeral glued to the H1" — the numeral is isolated (`dir="ltr"`), 10px clear of
  the container edge, reading-first in RTL. Working as designed.
- "Garbled bidi in table rows" — run x-positions verified in correct RTL order with
  proper LTR embeddings for codes/paths.
- "Chart clipped / no labels" — canvases render at full box sizes; fullPage-screenshot
  artifacts.
- "Stray red square / stray 2" — the intentional `owner-badge-counter` (open-alerts pill).
- Quality-courses mobile "squeeze" — 5-column collapse (the r299 shape), 316px table
  width, zero horizontal overflow.

## 6. Checks executed (exit codes)

- `npm run typecheck` (backend incl. `prisma generate` + frontend + both test projects):
  **0** (after generating the client on the fresh box).
- `npm run lint`: **0** (0 errors; 15 pre-existing warnings).
- `npx vitest run` (frontend, full): **0** — 241 files / **3040/3040** tests, the exact
  recorded count. Touched-page suites re-run after each edit: 57/57, then 46/46, 15/15.
- `pages-quality.mjs` light+dark (7 routes), `pages-owner.mjs` light+dark (13 routes):
  PASS, worst cells above.
- Design gates on the final tree: `check-colors.sh --strict` OK · `check-icons.sh` OK ·
  `check-raw-css.sh --strict` PASS · `tokens/build.mjs --check` PASS.
- `verify.sh --fast` NOT run — per AGENTS.md §8 it is lead/medic-only on this shared box
  (guarded by `/tmp/verify.busy`); individual gates mirrored instead, as the D-task
  recipe prescribes.

## 7. Viewports & themes actually inspected

390 / 768 / 1024 / 1440 / 1920 light for the changed pages (`/owner/dashboard`,
`/owner/institutions/zu`); 390+1440 light for all 20 owned routes; 390+1440 dark for the
changed pages; conformance matrices at 1440+390 light+dark for all 20 routes.

## 8. Residuals (honest, with causes)

- `/quality/exam-moderation` & `/quality/community` below floor — shared components owned
  by the exams/community agents; out of my file ownership, reported for the integrator.
- The 2 systematic `darkInk` fails on every page (skip-link 3.76:1 on accent; topbar
  badge 1.98:1) and the h1 `28px` off-ladder rung — app chrome / shared pattern CSS,
  outside my ownership.
- Finding→entity navigation for quality alerts needs structured ids on
  `GET /quality/alerts` (backend payload extension) — outside this task's frontend scope.
- The same glued-meta defect exists in the ADMIN faculties console (`AdminPages.tsx`,
  same unstyled `.admin-faculty-meta`) — that file belongs to another agent.

## 9. Commits

- `df9ba709` — /ai/config fixture + the environment-repair report in the message.
- `e1a016e5` — the four owner fixes (fixture wire shape, teacher query, [01] numeral,
  meta separators).
- (this commit) — the branch report.

## 10. Non-touches (contract confirmation)

`apps/mobile/**` untouched · `main` never pushed · no other agent's files touched ·
ratchets/baselines/frozen specs untouched (`ratchet.json`, mapping/, heron-spec) ·
`run.mjs`/`pages.mjs` (the shared instrument) untouched — only the quality/owner
page-harness lineage changed, as D8/D10/D11 precedent allows.
