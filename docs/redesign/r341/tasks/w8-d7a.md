# W8-D7A — student screens on the pattern library (dashboard/courses/catalog/calendar)

Worktree `/home/z/wt/d7a`, branch `wip/d7a`. Dev port **5341**: `cd /home/z/wt/d7a/frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 5341 --strictPort &`.

**Read first:** `docs/redesign/r341/tasks/D.md` — THE RECIPE (proved on /auth: 82.7@1440/66.4@390 → 99.8/99.3 l+d). Follow it exactly.

## Your scope (from the queen's kill-list probe, /tmp/d7d-probe-report.md)
Routes: `/student/dashboard`, `/student/courses`, `/student/courses/:id`, `/student/catalog`, `/student/calendar`.
Files you OWN: `pages/student/{DashboardPage,CourseDetailPage,CoursesPage,CatalogPage,CalendarPage}*.tsx` + their rules in `styles/student/**`.
**The D6 shell is already done** (AppShell on the sheet grammar, dashboard cells 98.8-99.1) — do not touch `components/shell/**` or `styles/shell/**`.

## The kill (probe-measured, comment-inclusive spans)
- `student.css` 650/1,429 lines are YOURS (the shell slice belongs to D6, done)
- Whole-sheet kills unlocked by YOUR pages: `student/lecture-player.css` 206 (only LecturePlayerPage — wait: that's D7d territory; take it only if trivially safe, else leave a note), `student/heron-dashboard.css` 152 (only DashboardPage — YOURS), `student/heron-courses.css` 138/169 (YOUR courses pages)
- After your flip: student.css keeps ~779 for D7d's screens

## Method (the D.md recipe, compressed)
1. Boot dev server. Baseline per route: `node scripts/conformance/pages.mjs --url http://localhost:5341 --routes /student/dashboard,/student/courses,/student/catalog,/student/calendar --bps 1440,390` (+`--dark`). Auth via the hermetic e2e login helper pattern (D6's commit ebe579ac documents the storageState path; shared/testAccounts.ts — never print secrets).
2. Rebuild TSX+CSS in layers on `styles/patterns.css` (pf-page/pf-header/rows/split/stats/filters/today) + Heron rungs/rhythm/hover/reveal. Tokens only, NO !important, logical properties, 44px floor. Keep EVERY route, form behaviour, data-testid, aria, and unit-pin (tests are law — reconcile markup, never tests; re-key a pin to the live contract only with written justification).
3. Re-run pages.mjs until ≥90 ALL cells (light+dark × 1440+390).
4. Delete the legacy rules your pages no longer seat (grep-prove zero seats; `node scripts/gates/css-counts.mjs` goes DOWN); full vitest green.
5. `bash scripts/verify.sh --fast > /tmp/d7a-verify.log 2>&1; echo $?` (NEVER piped).

## Laws
§0: nothing gets worse · tests are law · bundle ≤770 · commit ≤5 min on wip/d7a · push after first commit `git push -u origin wip/d7a` and after each commit (your branch IS your report — the queen polls it; your final message may not arrive). Do NOT merge to main. Do NOT touch files outside ownership (patterns.css §G/§9-11 is the dedup agent's — you may ADD new pf-usage in your pages but do not edit patterns.css itself unless adding a genuinely new pattern family; then document it).

## Report ≤10 lines (also your last commit message body)
pages.mjs rows before→after per route · CSS lines deleted (css-counts before→after) · files · commits · verify exit.
