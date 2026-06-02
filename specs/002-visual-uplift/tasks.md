---

description: "Task list for Visual Uplift — Premium Product Quality (002)"
---

# Tasks: Visual Uplift — Premium Product Quality

**Input**: Design documents from `/specs/002-visual-uplift/`

**Prerequisites**: plan.md, spec.md, research.md (R-001..R-011), data-model.md, contracts/ (type-system, chart-theme, icon-policy, audit-script), quickstart.md

**Tests**: Targeted — Playwright visual audit + reduced-motion gate + a single ResponsiveTable unit test. Manual smokes called out where automation isn't worth the cost.

**Organization**: Tasks are grouped by user story (US1–US8) so each story is shippable and verifiable on its own. P1 stories (US1, US2, US3, US5) are the MVP.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no blocking dependency)
- **[Story]**: US1..US8 — required for user-story tasks; absent for Setup, Foundational, Polish
- File paths repository-relative

## Path Conventions

Web app layout (existing).
- Frontend: `frontend/src/`
- Frontend styles: `frontend/src/styles/`
- Frontend tests: `frontend/tests/`
- Repo scripts: `scripts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install Playwright, scaffold the audit harness, and create the icon-discipline gate. Pure infrastructure — no behavior change.

- [~] T001 Install `@playwright/test` as a devDependency in `frontend/package.json` (pinned version, no range). Run `npx playwright install chromium` once and document the command in `frontend/README.md` (or create one).
- [~] T002 [P] Add `frontend/playwright.config.ts` configured for the visual audit: `testDir: 'tests/visual'`, base URL from env (`MADAREK_BASE_URL` default `http://localhost:5173`), retries 0 locally / 2 in CI, single worker.
- [~] T003 [P] Create `frontend/tests/visual/__captures__/.gitkeep` so the captures directory exists. Add `frontend/tests/visual/__captures__/*.png` to `.gitignore` for now (reviewer will commit selected baselines after the first audit run).
- [X] T004 [P] Create `scripts/check-icons.sh` per `contracts/icon-policy.md` (grep gate for emoji + non-Lucide SVG outside the documented allowlist). Make executable. Wire `npm run check:icons` in root `package.json`.
- [~] T005 [P] Add `frontend` scripts in `frontend/package.json`: `test:visual` (`playwright test`), `test:visual:reduced-motion` (`playwright test reduced-motion.spec.ts`).
- [~] T006 [P] Create `scripts/visual-diff.html` skeleton (static page reading `tests/visual/__captures__/` filenames; renders before/after pairs side-by-side per route × breakpoint × direction).

**Checkpoint**: Audit harness installed; icon gate runs; no production behavior changed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the type-role tokens, chart-palette extension, `.tabular-nums` utility, section-rhythm tokens, and the audit route manifest. Every user story depends on these.

**⚠️ CRITICAL**: No user-story work begins until Phase 2 is complete.

- [X] T007 Extend `frontend/src/styles/tokens.css` with the canonical `--type-*` role tokens per `contracts/type-system.md` (display, headline, body, label, metric — each with size / weight / line-height / letter-spacing). Keep existing `--fs-*` raw scale intact.
- [X] T008 [P] Add the `.tabular-nums` utility class in `frontend/src/styles/components.css` (or `tokens.css`) consuming `font-variant-numeric` + `font-feature-settings` per the type-system contract.
- [X] T009 [P] Extend `frontend/src/styles/tokens.css` with `--section-pad-y-narrow` (e.g., `var(--sp-11)` ≈ 72 px) and `--section-pad-y-wide` (e.g., `var(--sp-13)` ≈ 128 px) per R-010.
- [X] T010 [P] Extend the chart palette in `frontend/src/styles/tokens.css` with `--chart-6: #E8B547`, `--chart-7: #3F8B8B`, `--chart-8: #A65D8A` per `contracts/chart-theme.md`. Keep `--chart-1..--chart-5` unchanged.
- [X] T011 [P] Update `chartPalette()` in `frontend/src/lib/chartTheme.ts` to read all eight `--chart-*` tokens (was 5). Document the cycle rule (`(i % 8) + 1`) in the function's JSDoc.
- [~] T012 [P] Create `frontend/tests/visual/routes.ts` per `contracts/audit-script.md`: typed `AuditRoute[]` manifest with the ~25 representative routes per the data-model section.
- [~] T013 [P] Create `frontend/tests/visual/test-users.ts` per the audit contract — reads `MADAREK_TEST_<ROLE>_EMAIL` / `_PASSWORD` env vars; logs a warning and skips routes whose role is unconfigured.
- [~] T014 Create `frontend/tests/visual/audit.spec.ts` per `contracts/audit-script.md`: walks routes × breakpoints (360/768/1280/3840) × directions (LTR/RTL); captures full-page screenshots; asserts (a) no horizontal scroll on document, (b) no element overflows viewport horizontally, (c) focus ring visible after first Tab.
- [~] T015 Create `frontend/tests/visual/reduced-motion.spec.ts` — same harness with `page.emulateMedia({ reducedMotion: 'reduce' })`. Assertions: reveals render in final state on first paint, counters render target value immediately, page transition collapses to ≤80 ms fade. Targets only the homepage, student dashboard, college index, and a course detail (one fixture page each is fine).
- [~] T016 Run the audit ONCE against the current state (`npm run -w frontend test:visual`) to capture the **before-uplift** baseline; commit selected baseline captures into `frontend/tests/visual/__captures__/baseline/` with a README pointing to the visible-improvement HTML.

**Checkpoint**: Tokens extended, palette extended, audit harness fired once with a baseline. User stories may now begin.

---

## Phase 3: User Story 1 — Homepage that earns the room (Priority: P1) 🎯 MVP

**Goal**: First-time visitor knows what Madrak is, who it's for, and what to do next within 5 seconds. Premium hero, calm rhythm, real UoZ proof points.

**Independent Test**: Open `/` on a fresh session at 360 / 768 / 1280 / 4K in LTR and RTL. Within 5 s, identify (a) what Madrak does, (b) who it's for, (c) the primary CTA. Confirm no intro replay on returning in-session visit.

### Implementation for User Story 1

- [X] T017 [US1] Audit `frontend/src/pages/LandingPage.tsx` against the audit captures. Identify the hero composition, section rhythm, proof-points block, and CTA presentation. Document findings in a comment block at the top of the file (`// uplift-002 audit:`). Don't change behavior yet.
- [X] T018 [US1] Apply `--type-display-*` role tokens to the hero headline and `--type-body-size-lg` to the supporting line in `frontend/src/styles/landing.css`. Remove any inline `font-*` overrides on the hero in `LandingPage.tsx`.
- [X] T019 [P] [US1] Apply `--section-pad-y-wide` to hero and CTA sections, `--section-pad-y-narrow` to interior content sections in `frontend/src/styles/landing.css`. Remove ad-hoc `padding-block` values flagged by audit.
- [~] T020 [P] [US1] Replace the homepage's existing CountUp instances with `<AnimatedNumber>` (from 001-* primitives) in `frontend/src/pages/LandingPage.tsx` for proof-point statistics. Add `tabular` to keep digit width stable.
- [X] T021 [P] [US1] Verify all homepage statistics source from real University of Zawia data (Principle III). For any synthetic numbers found, replace with a "data-pending" surface or remove. Document in PR.
- [X] T022 [US1] Verify the returning-visitor calm flag from 001-* (`madarek.intro.seen`) suppresses the hero re-animation; if any new motion was introduced by the uplift that doesn't honor this flag, add it.
- [~] T023 [US1] Re-run `npm run -w frontend test:visual` for `/` only (filter via `playwright test --grep landing`). Compare against the baseline captures via `scripts/visual-diff.html`. Record the visible delta in PR description (one screenshot pair per breakpoint).

**Checkpoint**: Homepage feels demonstrably stronger; first-impression test passes; bundle add < 4 KB gzip.

---

## Phase 4: User Story 2 — Dashboard that respects the user (Priority: P1)

**Goal**: KPI tiles read like a financial product. Charts feel native. Loading is layout-shape-preserving. Empty states are intentional. Repeats consistently across all role dashboards.

**Independent Test**: Open student, faculty, dean, admin, quality, owner dashboards. Validate hierarchy reads top-to-bottom, KPI tiles visually consistent across roles, charts integrated, loading/empty/error states match the final layout.

### Implementation for User Story 2

- [X] T024 [US2] Inventory KPI-tile patterns across `frontend/src/pages/student/DashboardPage.tsx`, `frontend/src/pages/teacher/TeacherIntelligencePage.tsx`, `frontend/src/pages/admin/AdminPages.tsx`, `frontend/src/pages/quality/QualityPages.tsx`, `frontend/src/pages/owner/OwnerDashboardPage.tsx`. Catalog inconsistencies (typography, hover, padding) in a comment block at the top of `frontend/src/components/primitives/index.tsx`.
- [X] T025 [US2] Apply `--type-metric-*` role tokens to the KPI value and `--type-label-*` to the KPI label in the canonical `MetricCard` (in `frontend/src/components/primitives/index.tsx`). The headline number MUST be the most prominent element of the tile.
- [X] T026 [P] [US2] Add `.tabular-nums` to every KPI value rendered through `MetricCard` and to in-line numeric stats on dashboards. Audit student / teacher / admin / quality / owner dashboard pages.
- [~] T027 [P] [US2] Replace numeric KPIs across the role dashboards with `<AnimatedNumber>` where they aren't already (`frontend/src/pages/student/DashboardPage.tsx`, `teacher/TeacherIntelligencePage.tsx`, `admin/AdminPages.tsx`, `quality/QualityPages.tsx`, `owner/OwnerDashboardPage.tsx`).
- [X] T028 [US2] Verify every loading state on those pages renders `<Skeleton>` (motion primitive) or the existing `States.tsx` skeletons — no global spinners triggered by user actions.
- [X] T029 [US2] Audit `EmptyState` and `ErrorState` (in `frontend/src/components/primitives/States.tsx`); apply `--type-headline-size-sm` to titles and `--type-body-*` to descriptions. Confirm both are visually distinct from skeletons.
- [~] T030 [US2] Re-run `npm run -w frontend test:visual` filtered to dashboards (e.g., `--grep "dashboard|intelligence|governance|owner"`). Compare against baseline. Record per-role before/after pair in PR.

**Checkpoint**: Every role dashboard shares the same KPI grammar; bundle add < 2 KB gzip on the student dashboard route.

---

## Phase 5: User Story 3 — Typography that earns the page (Priority: P1)

**Goal**: Every page reads as if a typographer designed it. Roles consistent across surfaces. Arabic + English render with locale-correct numerals and unified rhythm.

**Independent Test**: Open homepage, student dashboard, course detail, college page, auth page. Read each as continuous prose. Confirm type system feels consistent; verify Arabic + English render correctly with no fallback flashes.

### Implementation for User Story 3

- [X] T031 [US3] Sweep `frontend/src/styles/components.css` for raw `--fs-*` references on headlines/titles and migrate to `--type-headline-*` role tokens. Track residuals as PR-description follow-ups (don't block on full migration).
- [X] T032 [P] [US3] Migrate `frontend/src/styles/landing.css` headlines/eyebrows/section titles to `--type-display-*` and `--type-headline-*` role tokens.
- [X] T033 [P] [US3] Migrate `frontend/src/styles/colleges.css` (`college-hero-name`, `college-hero-eyebrow`, etc.) to `--type-headline-*` and `--type-label-*`.
- [~] T034 [P] [US3] Migrate `frontend/src/styles/auth.css` headings and helper text to `--type-headline-*` and `--type-body-*`.
- [~] T035 [P] [US3] Migrate `frontend/src/styles/owner.css` page titles and metric tiles to `--type-headline-*` and `--type-metric-*`.
- [X] T036 [US3] Add a body-measure cap utility (`.body-cap` consuming `--type-body-max-measure`) in `frontend/src/styles/components.css`. Apply to long-form prose blocks on `LandingPage.tsx` (about / proof / who-it's-for sections).
- [X] T037 [US3] Verify Arabic-Indic numerals render in Arabic locale via `Intl.NumberFormat`. Spot-check `<AnimatedNumber>` instances on homepage and dashboards.
- [~] T038 [US3] Re-run `npm run -w frontend test:visual` filtered to typography-heavy routes. Confirm no regressions in line-height, weight, or letter-spacing across LTR + RTL.

**Checkpoint**: Type rhythm is visibly more considered; comparable hierarchy across roles.

---

## Phase 6: User Story 4 — Charts and metrics that feel native (Priority: P2)

**Goal**: Every chart uses platform tokens for typography, axis/grid color, and series color. The 8-color palette cycles predictably. Tooltips look like the rest of the product.

**Independent Test**: Open every chart-bearing route. Verify typography, axis/grid color, series colors, tooltip style, tabular numerals.

### Implementation for User Story 4

- [X] T039 [US4] Inventory all chart instances by grepping `frontend/src/pages/` for `Line`, `Bar`, `Doughnut`, `Pie`, `Chart`. Catalog each instance + which option set it uses.
- [X] T040 [P] [US4] For every chart instance found in T039, ensure it consumes `cartesianOptions()` or `radialOptions()` from `frontend/src/lib/chartTheme.ts` — never inline option objects. Migrate the holdouts.
- [X] T041 [P] [US4] For every chart instance, source series colors from `chartPalette()` (cycle modulo 8) — never hardcoded hex per chart. Migrate holdouts.
- [X] T042 [P] [US4] Wrap every chart in a `.card` with the canonical `var(--card-padding)`; never bleed to card edge.
- [X] T043 [US4] Replace any chart-card global spinner with `<Skeleton variant="chart" />` (motion primitive). Files: chart-bearing pages from T039 inventory.
- [~] T044 [US4] Run a small unit test or eyeball check that `chartPalette()` returns 8 colors and `(i % 8)` cycles correctly. Add minimal Vitest test at `frontend/tests/lib/chartTheme.test.ts` for the cycle rule.
- [~] T045 [US4] Re-run visual audit filtered to chart-bearing routes. Verify no regression in chart appearance and that tooltips, axes, and series colors match across roles.

**Checkpoint**: Charts feel like part of Madrak rather than third-party defaults.

---

## Phase 7: User Story 5 — Mobile that feels designed (Priority: P1)

**Goal**: 360 px works as a primary interface. Zero overflow, zero clipping, drawer behaves, tables become lists, charts adapt, touch targets ≥44×44.

**Independent Test**: Walk login → student dashboard → course detail → assignment → profile at 360 px. Verify no overflow, drawer opens calmly, tables read as lists, charts fit.

### Implementation for User Story 5

- [~] T046 [US5] Implement `<ResponsiveTable>` primitive in `frontend/src/components/primitives/ResponsiveTable.tsx` per the data-model schema. Renders as `<table>` ≥768 px, as `role="list"` of cards <768 px. Composes with the `Skeleton` primitive's `list-row` variant.
- [~] T047 [US5] Add a unit test at `frontend/tests/motion/ResponsiveTable.test.tsx` covering: table mode renders proper thead/tbody, mobile mode renders list with primary/secondary fields per row, ARIA reading order is title → key:value pairs.
- [~] T048 [P] [US5] Identify candidate tables on student/teacher/admin dashboards. Migrate at least three representative tables to `<ResponsiveTable>`. Files vary by table location — record per table in the PR.
- [~] T049 [P] [US5] Audit touch-target hit areas at 360 px on `frontend/src/components/layout/BottomNav.tsx`, `frontend/src/components/layout/Sidebar.tsx`, primary buttons, list rows. Ensure ≥44×44 CSS px effective hit area; bump padding where needed (no layout shift on desktop).
- [~] T050 [US5] Replace the existing mobile sidebar/drawer pattern with native `<dialog>` per R-006. Files: `frontend/src/components/layout/AppShell.tsx` and/or `Sidebar.tsx`. Style backdrop via `::backdrop`. Verify focus trap, focus return, and Escape work.
- [~] T051 [US5] Run the audit at the 360 px breakpoint only across all primary routes. Confirm zero horizontal-overflow / clipping defects in the report. Fix any findings before this story closes.

**Checkpoint**: Mobile feels intentional. P1 (MVP) complete.

---

## Phase 8: User Story 6 — Lucide-only icon discipline (Priority: P2)

**Goal**: Every icon in chrome and components is Lucide. Allowlist documents legitimate exceptions.

**Independent Test**: Run `npm run check:icons` — passes. Spot-check three random pages — every glyph is Lucide or on the documented allowlist.

### Implementation for User Story 6

- [X] T052 [US6] Run `npm run check:icons` against the current main branch. Catalog every violation — emoji in JSX, raw `<svg>`, non-Lucide imports — by file + line.
- [X] T053 [P] [US6] Replace emoji in chrome/components for at least the top 10 most-trafficked files (homepage, student dashboard, sidebar, topbar, auth, college pages). Use `Icon` + `lucide-react` per the migration pattern.
- [~] T054 [P] [US6] Audit icon sizes across migrated files; normalize to the canonical scale (14/16/18/20/24 px) per `contracts/icon-policy.md`.
- [X] T055 [US6] Re-run `npm run check:icons`. Address remaining violations or add justified entries to the allowlist in `scripts/check-icons.sh`. Document each allowlist entry in PR.
- [X] T056 [US6] Wire `npm run check:icons` into a CI step (or document the run as part of the existing CI hook chain).

**Checkpoint**: Zero un-allowlisted emoji or non-Lucide SVG in chrome/components.

---

## Phase 9: User Story 7 — Sidebar, topbar, and overlay polish (Priority: P2)

**Goal**: Sidebar slides between active items. Topbar gains shadow on scroll. Dropdowns animate from trigger. Modals enter/exit calmly. Toasts stack with rhythm.

**Independent Test**: Open + close sidebar (mobile + desktop), trigger every topbar dropdown, open + close a modal, fire three toasts in succession. Confirm consistent motion, scrim, focus trap and return.

### Implementation for User Story 7

- [X] T057 [US7] Add a shared-layout sliding active indicator inside the side-nav group in `frontend/src/components/layout/Sidebar.tsx` (per R-005). Computed via `offsetTop`/`offsetHeight` of the active `<NavLink>`; transitions `top` and `height` with `--motion-duration-medium` + `--motion-ease-emphasized`.
- [X] T058 [P] [US7] Add a `data-scrolled="true"` attribute to `.content` in `frontend/src/components/layout/AppShell.tsx` when scroll > 4 px (already tracked); add CSS rule in `frontend/src/styles/layout.css` that elevates `.topbar` only when `.content[data-scrolled="true"]` is present.
- [~] T059 [P] [US7] Audit dropdown components (notifications, profile, language, search) under `frontend/src/components/layout/`. Ensure each animates from its trigger origin with `--motion-duration-medium` + `--motion-ease-decelerate`. Add `transform-origin: top inset-inline-start` (or appropriate) for clean scaling.
- [~] T060 [P] [US7] Migrate any custom modal implementations to the native `<dialog>` pattern (per R-006). Files vary; grep for `role="dialog"` and `aria-modal="true"`. The mobile drawer migration in T050 already establishes the pattern.
- [~] T061 [US7] Audit toast stacking in the notifications system. Ensure consistent gap (`var(--sp-3)`), independent exit, no visual collision when 3+ toasts fire rapidly.
- [~] T062 [US7] Re-run audit on chrome-affecting routes; verify dropdowns, modals, and toasts behave consistently.

**Checkpoint**: Chrome elements share one motion family.

---

## Phase 10: User Story 8 — Cross-page consistency audit (Priority: P3)

**Goal**: Two unrelated pages picked at random feel like they were designed in the same week, by the same team.

**Independent Test**: Reviewer opens two unrelated routes side by side. System reads as one product across them.

### Implementation for User Story 8

- [~] T063 [US8] Run `scripts/visual-diff.html` against the post-uplift captures. Pick three random route pairs. For each pair, list any inconsistency found (card padding, radius, hover, focus, motion duration).
- [~] T064 [P] [US8] Migrate any inconsistencies found in T063 onto canonical primitives or tokens. Don't introduce role-specific styling.
- [~] T065 [US8] With the audit re-run clean, confirm SC-010 (two random unrelated routes share identical card padding, radius, hover, focus, motion).

**Checkpoint**: All user stories functional. The platform reads as one product.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Verification, documentation, and follow-ups.

- [~] T066 [P] Visible-improvement review (NFR-001 / SC-001): assemble side-by-side captures via `scripts/visual-diff.html`; circulate to ≥5 reviewers; require ≥80% to mark "noticeably more polished." Record results in `specs/002-visual-uplift/visible-improvement-results.md`.
- [X] T067 [P] Bundle audit: run `npm run -w frontend build` and confirm gzipped delta on the student-dashboard route ≤12 KB vs. post-001 baseline. If exceeded, identify offender and tree-shake or defer.
- [~] T068 [P] Lighthouse on `/`, `/student/dashboard`, `/colleges/<slug>` at the reference mid-tier mobile profile: Performance ≥90, Accessibility = 100, CLS ≤0.05.
- [~] T069 [P] Manual screen-reader smoke (NVDA or VoiceOver) on homepage, student dashboard, college page. Document focus order, announcement quality, blockers.
- [~] T070 [P] Manual keyboard-only smoke through the same three routes. Confirm no tab traps, focus ring everywhere, all CTAs reachable.
- [~] T071 [P] RTL parity sweep: switch to Arabic, walk the same three routes; verify motion mirrors, layout intact, indicator/drawer directions correct.
- [~] T072 [P] Reduced-motion gate: `npm run -w frontend test:visual:reduced-motion` passes against the production-built bundle.
- [X] T073 [P] Token-discipline gate: `npm run check:motion-tokens` and `npm run check:icons` both pass.
- [X] T074 [P] Document any remaining drift as backlog tickets — do NOT block the rollout on items the audit shows are minor or out-of-scope.
- [~] T075 Update `DESIGN_POLISH_PLAN.md` to point readers to `specs/002-visual-uplift/quickstart.md` as the canonical adoption guide; mark earlier polish notes as superseded.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup. **BLOCKS all user stories.**
- **User Stories (Phases 3–10)**: all depend on Foundational.
  - Within P1 (US1, US2, US3, US5): mostly independent. US3 (typography) feeds US1 + US2 — start US3 token migration first so subsequent stories consume role tokens.
  - Within P2 (US4, US6, US7): independent.
  - US8 (P3): depends on US1, US2, US3, US5 having shipped (cross-page audit needs the post-uplift state).
- **Polish (Phase N)**: depends on every in-scope user story complete.

### User Story Dependencies

- **US1 (Homepage, P1)**: independent of other stories. Best done early — sets the "obvious improvement" tone for reviewers.
- **US2 (Dashboards, P1)**: independent.
- **US3 (Typography, P1)**: independent. Strong recommendation: start the migration in parallel with US1/US2 so they consume role tokens.
- **US4 (Charts, P2)**: independent.
- **US5 (Mobile, P1)**: independent. Shares the `<dialog>` pattern with US7 — coordinate.
- **US6 (Icons, P2)**: independent. Highest mechanical leverage — fast wins.
- **US7 (Chrome polish, P2)**: shares `<dialog>` with US5 — coordinate.
- **US8 (Cross-page, P3)**: depends on the P1 stories being merged.

### Within Each User Story

- Tokens / primitives before consumers.
- Audit re-run is the last task of each story; gates the checkpoint.

### Parallel Opportunities

- All Phase 1 [P] tasks (T002–T006) can run in parallel.
- All Phase 2 [P] tasks (T008–T013) can run in parallel after T007 lands.
- US3 typography migrations across stylesheets (T032–T035) all parallel.
- US4 chart migrations (T040–T042) parallel across files.
- US6 icon migrations (T053–T054) parallel across files.
- All Phase N tasks parallel.

---

## Parallel Example: Foundational Phase

```bash
# After T007 (type tokens) lands:
Task: T008 — .tabular-nums utility in components.css
Task: T009 — section-pad-y tokens in tokens.css
Task: T010 — chart-6/7/8 tokens in tokens.css
Task: T011 — chartPalette() returns 8
Task: T012 — routes manifest
Task: T013 — test-users helper
# All [P] — different files / sections.
```

## Parallel Example: User Story 3 typography migration

```bash
Task: T032 — landing.css → role tokens
Task: T033 — colleges.css → role tokens
Task: T034 — auth.css → role tokens
Task: T035 — owner.css → role tokens
# All [P] — distinct stylesheets.
```

---

## Implementation Strategy

### MVP (Phases 1–7: Setup + Foundational + US1, US2, US3, US5)

The MVP is the four P1 stories. After MVP:
1. Homepage feels demonstrably stronger.
2. Every role dashboard shares the same KPI grammar.
3. Type rhythm is consistent across surfaces.
4. Mobile is intentional (no overflow / clipping; tables → lists; native dialog).

Stop. Demo. Validate via the visible-improvement HTML. Then proceed to P2.

### Incremental Delivery

1. Phase 1 + 2 → tooling + tokens land (internal).
2. + US3 → typography rhythm visible (public).
3. + US1 → homepage redesign visible (public).
4. + US5 → mobile excellence visible (public).
5. + US2 → dashboards consistent (public).
6. + US4 → charts feel native (public).
7. + US6 → icon discipline complete (public).
8. + US7 → chrome polished (public).
9. + US8 → cross-page audit clean (public).

Each step is independently shippable.

### Parallel Team Strategy

After Phase 2:
- Developer A: US3 (typography migration) + US1 (homepage)
- Developer B: US2 (dashboard sweep) + US4 (charts)
- Developer C: US5 (mobile + native dialog) + US7 (chrome polish)
- Developer D (optional): US6 (icon migration)
- Then US8 audit + Phase N once P1+P2 merged.

---

## Notes

- [P] = different files, no blocking dependency.
- [Story] maps each task to its user story for traceability.
- Re-run the visual audit after every story; visible-improvement is the gate.
- Bundle audit after every story; a 12 KB gzip add ceiling is the constitutional ceiling.
- Don't introduce new motion or interaction tokens; the 001-* foundation is the source.
- Don't pick chart colors per chart; use `chartPalette()`.
- Don't ship emoji in chrome; use Lucide via `Icon`.
- Stop at any checkpoint to validate independently.
- Avoid: vague tasks, same-file conflicts in [P] groups, dependencies that break user-story independence.
