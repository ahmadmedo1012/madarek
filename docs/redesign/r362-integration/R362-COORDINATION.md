# R362 — Specialist Agent Coordination Contract

Binding contract for the five specialist agents. The Chief Integrator
(Agent 1) owns this file; ownership changes require an integrator
commit. Every agent works ONLY in their own worktree and branch —
never in the integration worktree, never in another agent's tree, and
never directly on `main` or `integration/r362-final-unification`.

## The baseline every agent branches from

| | |
|---|---|
| Integration branch | `integration/r362-final-unification` |
| Integration worktree | `madarek-r362-integration` |
| Baseline state | fully measured — see `INTEGRATION-RECORD.md` §3 (typechecks 0 errors · unit 3113/3113 + backend 2617 · deadcode ratchet at baseline · design gates green · bundle 754.0 KB gz / 770 · targeted E2E 50/50) |

## Worktrees and branches

| Agent | Branch | Worktree | Mandate |
|---|---|---|---|
| 2 · Shell & Navigation | `agent/r362-shell-nav` | `madarek-r362-shell` | web navigation + application shell |
| 3 · Heron Experience | `agent/r362-heron-experience` | `madarek-r362-heron` | geometric illustrations, their animations, public landing visual experience |
| 4 · Design System | `agent/r362-design-system` | `madarek-r362-design` | web design system + shared visual primitives |
| 5 · Web Product | `agent/r362-web-product` | `madarek-r362-product` | authenticated web pages + their product experiences |
| 6 · Native Mobile | `agent/r362-native-mobile` | `madarek-r362-mobile` | Expo mobile code + mobile-specific tests |

## File ownership (exclusive — violating edits are rejected at merge)

### Agent 2 — Shell & Navigation
- `frontend/src/components/layout/` (AppShell, Sidebar, SheetFrame, NotificationDropdown, …)
- `frontend/src/styles/shell/`
- `frontend/src/lib/nav.ts` · `frontend/src/lib/routes.ts`
- `frontend/tests/unit/nav-coverage.test.ts`
- `frontend/tests/e2e/r319-shell-chrome.e2e.ts`, `r319-shell-states.e2e.ts`, `r305-shell-heron.e2e.ts`, `mobile-bottom-nav.e2e.ts`, `r319-auth-stack.e2e.ts`
- `scripts/qa/nav-audit.ts`

### Agent 3 — Heron Experience
- `frontend/src/components/illustrations/` (incl. the r359–r361 technical/ family + sheetChrome)
- `frontend/src/components/landing/`
- `frontend/src/styles/illustrations.css`, `frontend/src/styles/landing/`, `frontend/src/styles/landing.css`
- `frontend/src/pages/LandingPage.tsx` + public pages (`PublicPages.tsx`, `BrandPage.tsx`, `AppDownloadPage.tsx`, …)
- landing E2E: `guest-landing.e2e.ts`, `r308-landing-instruments.e2e.ts`, `r312-guest-reveal.e2e.ts`

### Agent 4 — Design System
- `frontend/src/styles/tokens/` + `scripts/tokens/`
- the shared sheets: `base.css`, `components.css`, `patterns.css`, `polish.css`, `layers.css`, `layout.css`, `motion.css`, `fonts.css`, `app.css`, `errors.css`
- `frontend/src/components/patterns/` (shared primitives incl. indicators)
- `frontend/src/components/ui/` (web)
- design gates: `scripts/check-colors.sh`, `check-raw-css.sh`, `check-icons.sh`, `check-motion-tokens.sh`, `gates/copy-budget*.mjs`
- `frontend/tests/unit/` contract tests for the above

### Agent 5 — Web Product
- `frontend/src/pages/` EXCEPT the public surfaces Agent 3 owns (auth/, student/, teacher/, admin/, quality/, owner/, DocumentViewerPage, …)
- domain sheets: `student.css`, `student/`, `teacher.css`, `teacher/`, `admin.css`, `owner.css`, `quality`, `legal.css`, `research.css`, `ai.css`, `colleges.css`, `notifications.css`, `pdf.css`, `shared/`, `help.css`, `about.css`, `player.css`
- product E2E: everything in `tests/e2e/` not listed above
- `frontend/src/lib/` product libs EXCEPT `nav.ts`/`routes.ts` (Agent 2)

### Agent 6 — Native Mobile
- `apps/mobile/` (app, src, .maestro, plugins, scripts)
- `.github/workflows/ui-screens.yml`, `mobile.yml`, `build-android.yml`, `build-ios-sidestore.yml`
- `scripts/mobile/` if introduced

### Integrator (Agent 1) — owned
- `integration/r362-final-unification`, the merge order, all conflict resolution
- `scripts/deadcode/` (baseline re-pins are integrator-committed)
- `.github/workflows/ci.yml`, `deadcode.yml`, `size-gate.yml`
- `docs/redesign/r362-integration/`
- cross-agent shared decisions (this file)

## The rules

1. **Branch from the integration baseline commit only.** Rebase onto
   the integration branch only when the integrator publishes a new
   baseline and says so.
2. **Never edit a file you do not own.** Need a change in another
   agent's file? File a precise request (file, line, exact change,
   reason) — the integrator routes it to the owner.
3. **Never weaken a test, gate, or ratchet to go green.** Fix the
   product or fix the test's honesty — never its assertion.
4. **Definition of done (all of them, not compilation alone):**
   affected typechecks, the full frontend unit suite, the affected
   E2E projects, the design gates you touch, and a written summary
   with exact commands + outputs. The integrator re-verifies before
   merge; a failed re-verification bounces the branch back.
5. **No new heavy dependencies** (GSAP & co.) without integrator
   sign-off — the bundle ceiling is 770 KB gz and the baseline sits
   at 754.0.
6. **Commit coherence:** every commit message states WHAT and WHY.
   Evidence PNGs never enter the tree (Actions artifacts only).

## Open blockers at hand-off (baseline state)

| # | Item | Owner |
|---|---|---|
| B1 | Compact-spine navigation design brief: explore the ≤8-destination mobile drawer spine WITHIN the grouped collapsed-families contract (never a 26-item «المزيد» junk drawer; never deleting the coverage guards) | Agent 2 |
| B2 | Emulator/API startup reliability of the ui-screens role capture (fails on GitHub runners today — environmental; reproduce before product-blaming) | Agent 6 |
| B3 | The student dark-standard Android capture failure from the r358 run (reproduce via the rig; classify honestly) | Agent 6 |
| B4 | Local mobile typecheck not run on this host (no Expo workspace install; CI validates on push — run it first in your tree) | Agent 6 |
| B5 | The pinned debts (knip 227 unusedExportedTypes, jscpd 196 duplicateBlocks) — improvement welcome, growth forbidden | Agent 4 |
| B6 | iOS WebKit + full 177-test E2E suites run in CI on push; targeted 50/50 verified locally | Integrator |
