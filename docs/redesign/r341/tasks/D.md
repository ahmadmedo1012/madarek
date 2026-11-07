# D-tasks — pages rebuilt on the pattern library; legacy sheets deleted wholesale

## The recipe (proved on /auth in r340 T-D1a: 82.7@1440/66.4@390 → 99.8/99.3 light+dark)
1. Boot your dev server: `cd frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 53NN --strictPort` (port from OWNERSHIP.md). Authed pages: log in via the UI with a shared test account (`shared/testAccounts.ts` — read it; do NOT print secrets into logs) and keep the storageState, or use the e2e login helper pattern from `frontend/tests/e2e/`.
2. Baseline: `node scripts/conformance/pages.mjs --url http://localhost:53NN --routes <yours> --bps 1440,390` (+ `--dark`). Record the row.
3. Rebuild the page's TSX+CSS **in layers** on the pattern library (`styles/patterns.css` — pf-page/pf-header/rows/split/stats/filters/today) + Heron's measured type rungs/rhythm/hover/reveal grammar. Tokens only, NO `!important`, logical properties only, 44px interaction floor. Keep EVERY route, form behaviour, `data-testid`, aria feature, and unit-test pin (tests are law — reconcile markup, never tests; if a pin must re-key to the live contract, justify in the report).
4. Re-run pages.mjs until ≥90 on ALL cells (light+dark × 1440+390). Dark boot = localStorage theme BEFORE first paint (the harness does this with --dark).
5. Delete the legacy rules/sheet the page no longer uses: prove zero remaining markup seats (grep the classes in the rebuilt TSX; coverage probe), delete rule-by-rule or wholesale, run `node scripts/gates/css-counts.mjs` (budget goes DOWN), full vitest green.
6. `bash scripts/verify.sh --fast` (NEVER piped — redirect to a log, echo $?). Push `wip/d<N>` → report → queen merges after reviewer pass.
Acceptance per page: pages.mjs ≥90 all cells · vitest green · verify --fast green · css-counts down · no `!important` added · E2E for the page (if a spec exists) green.

## Task list (route → files → legacy sheet to kill)
- **D1** `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` (+ keep `/auth` login at ≥90) → `pages/RegisterPage.tsx`, `pages/auth/**`, `styles/auth.css` **deleted wholesale** (1525 lines — login already lives on patterns; delete only after proving register/forgot/reset carry zero auth.css seats).
- **D2** `/about` (seat in `pages/PublicPages.tsx`) → about rules in `styles/*.css` deleted.
- **D3** `/help` → help rules deleted.
- **D4** `/app`, `/download` → `pages/AppDownloadPage.tsx` + app rules deleted.
- **D5** `/legal/*`, 404/500/403/maintenance → `pages/legal/**`, error pages, `styles/legal.css` deleted.
- **D6** student shell → `components/shell/**` (AppShell/nav/topbar), `styles/shell/**` + `styles/student.css` shell rules collapsed into `styles/shell/`.
- **D7a** `/student/{dashboard,courses,courses/:id,catalog,calendar}` → their `styles/student/*` rules.
- **D7b** `/student/{online-exams,exams*}` → `styles/student/exams.css` (1083) deleted.
- **D7c** `/student/{results,schedule,alerts,messages}` → their rules.
- **D7d** remaining student screens (library, mooc, jobs, ai, gamification, skills, social, ar, downloads, university, live, payment, map, matrix, research, profile, webinars) → their rules.
- **D8** `/teacher/**` → `styles/teacher/**` collapsed.
- **D9** registrar/campus `/campus/**` → `styles/campus.css` (815) deleted.
- **D10** `/quality/**` → `styles/teacher-quality.css` (1145) deleted.
- **D11** `/owner/**` → `styles/owner.css` (1042) deleted.
- **D12** notifications + pdf viewer → `styles/{notifications,pdf}.css` deleted.
Each D-task's report: pages.mjs rows before→after, CSS lines deleted, files touched, commits, verify result.
