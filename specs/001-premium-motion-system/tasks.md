---

description: "Task list for Premium Experience & Motion System (001)"
---

# Tasks: Premium Experience & Motion System

**Input**: Design documents from `/specs/001-premium-motion-system/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Targeted only — one reduced-motion E2E gate, primitive unit tests, axe in dev, Lighthouse in CI. No exhaustive TDD per story (spec scope is presentation-layer; full TDD would be ceremony).

**Organization**: Tasks are grouped by user story (US1–US8) so each story can be implemented and verified independently. P1 stories form the MVP.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1–US8)
- File paths are repository-relative

## Path Conventions

This is a **web application** layout (existing).
- Frontend code: `frontend/src/`
- Frontend styles: `frontend/src/styles/`
- Frontend tests: `frontend/tests/`
- Static assets: `frontend/public/`
- Repo-level scripts: `scripts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Land the directory structure, dev tooling, and CI gates the motion system relies on. Pure infrastructure — no behavior change.

- [X] T001 Create the motion primitives directory at `frontend/src/components/motion/` with an `index.ts` barrel export (initially empty)
- [X] T002 Create `frontend/src/styles/motion.css` (empty file with the layered banner: `@layer tokens, base, components, overrides;`) and import it from `frontend/src/main.tsx` immediately after `tokens.css`
- [X] T003 [P] Create `frontend/src/data/` directory and an empty `colleges.config.ts` placeholder exporting `export const colleges: CollegeIdentityProfile[] = [];`
- [X] T004 [P] Create `frontend/tests/motion/` directory; add `vitest.config.ts` at the frontend root if missing (jsdom env, RTL setup)
- [X] T005 [P] Add devDependencies to `frontend/package.json`: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@axe-core/react`, `jsdom`. Pin exact versions (no ranges)
- [X] T006 [P] Add `scripts/validate-college-identity.ts` skeleton at repo root — script entry, argument parsing, exits 0 with "no profiles yet" until T046
- [X] T007 [P] Wire a CI step (in the existing CI config or `package.json` script `validate:colleges`) that runs `validate-college-identity.ts` and fails the build on error
- [X] T008 [P] Add a bundle-size gate: install `rollup-plugin-visualizer` as a frontend devDep and a `package.json` script `build:report` that runs `vite build` and produces a gzipped-size report; document the ≤8 KB add budget for the student dashboard route in `specs/001-premium-motion-system/quickstart.md` (already done — verify)

**Checkpoint**: Empty directories, empty files, dev tooling in place. Build passes. No production behavior changed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the canonical motion + interaction tokens and the reduced-motion infrastructure. **Every user story depends on this phase.**

**⚠️ CRITICAL**: No user story work can begin until Phase 2 is complete.

- [X] T009 Extend `frontend/src/styles/tokens.css` to add the canonical `--motion-*` tokens per `contracts/motion-tokens.md` (durations, easings, distances, stagger, direction). Keep existing `--t-*` and `--ease-*` tokens intact; add semantic aliases mapped to them
- [X] T010 Add the `--motion-direction: 1` default and `[dir="rtl"] { --motion-direction: -1; }` rule in `frontend/src/styles/tokens.css`
- [X] T011 Add the `@media (prefers-reduced-motion: reduce)` block to `frontend/src/styles/motion.css` overriding decorative motion tokens to `0ms` / `≤80ms` per `contracts/motion-tokens.md`
- [X] T012 [P] Extend `frontend/src/styles/tokens.css` to add the canonical `--state-*` interaction tokens per `contracts/interaction-tokens.md` (focus ring, button, card, input, tab, link, loading)
- [X] T013 [P] Add a universal `:focus-visible` rule in `frontend/src/styles/motion.css` consuming `--state-focus-ring` so every focusable element gains the canonical focus ring by default (overridable per-component)
- [X] T014 [P] Add reveal keyframes (`@keyframes reveal-rise`, `@keyframes reveal-fade`) in `frontend/src/styles/motion.css` driven by `--motion-distance-*`, `--motion-duration-reveal`, `--motion-ease-decelerate`, and the `--motion-direction` multiplier
- [X] T015 [P] Add the skeleton shimmer keyframe (`@keyframes skeleton-shimmer`) in `frontend/src/styles/motion.css`, looping at `--motion-duration-skeleton`; static fallback under reduced-motion
- [X] T016 Implement `frontend/src/components/motion/useReducedMotion.ts` per `contracts/motion-primitives.tsx.md`: matchMedia subscription, SSR-safe default, change-listener for OS-level toggles
- [X] T017 [P] Add a primitive-level unit test for `useReducedMotion` at `frontend/tests/motion/useReducedMotion.test.tsx` (matchMedia stub, change event propagation)
- [X] T018 Add a stylelint rule (or a custom check in CI) that fails when raw `<number>ms`, `<number>s`, `cubic-bezier(...)`, or `ease-in-out` literals appear in `frontend/src/**/*.{css,tsx,ts}` outside `tokens.css`/`motion.css`. If stylelint setup is heavy, ship a grep-based pre-commit check in `scripts/check-motion-tokens.sh`
- [X] T019 Add an `@axe-core/react` dev-only initializer in `frontend/src/main.tsx` (gated behind `import.meta.env.DEV`) so a11y violations surface in the dev console

**Checkpoint**: Canonical tokens live, reduced-motion is wired, focus ring is universal, lint catches raw values, axe runs in dev. User stories may now begin.

---

## Phase 3: User Story 1 - Unified Motion & Interaction Foundation (Priority: P1) 🎯 MVP

**Goal**: Every interactive element across every role surface uses the canonical hover/focus/pressed/disabled tokens. Visual language is consistent end-to-end.

**Independent Test**: Open 5 routes across 3 different roles. Hover, focus, click on interactive elements. Confirm visual language is identical across routes/roles. Toggle OS reduced-motion. Confirm decorative motion suppressed; functional feedback intact.

### Implementation for User Story 1

- [X] T020 [US1] Audit `frontend/src/components/primitives/index.tsx` (Card, Button, etc.) and migrate hover/focus/pressed/disabled to consume `--state-*` tokens. Remove any inline raw durations/easings
- [X] T021 [P] [US1] Audit `frontend/src/styles/components.css` for raw motion/interaction values; replace each with the matching `--motion-*` / `--state-*` token. Track residual mismatches in PR description
- [X] T022 [P] [US1] Audit `frontend/src/styles/layout.css` for raw motion values; replace with tokens
- [X] T023 [P] [US1] Audit `frontend/src/styles/landing.css` for raw motion values; replace with tokens
- [X] T024 [P] [US1] Audit `frontend/src/styles/auth.css` for raw motion values; replace with tokens
- [X] T025 [P] [US1] Audit `frontend/src/styles/owner.css` for raw motion values; replace with tokens
- [X] T026 [P] [US1] Audit `frontend/src/styles/notifications.css` for raw motion values; replace with tokens
- [X] T027 [US1] Audit `frontend/src/styles/polish.css` and consolidate sections superseded by `motion.css` tokens (hover lift, focus, reveal cascade); leave a comment block where a section is intentionally deferred
- [X] T028 [US1] Confirm focus-ring rule from T013 covers every focusable primitive (`<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, `[tabindex]`); add per-primitive overrides only where the universal style does not fit (e.g., inputs needing inset ring)
- [X] T029 [US1] Verify no layout shift on hover for `Card`, `Button`, list rows, KPI tiles in `frontend/src/components/primitives/` and `frontend/src/components/dashboard/` by manual smoke; add `outline-offset` / `box-shadow` only patterns where translation would shift siblings
- [X] T030 [US1] Visual sweep: open `/`, `/auth`, `/student/dashboard`, `/teacher`, `/admin/teachers`, `/colleges/<slug>`. Confirm hover/focus/pressed/disabled are visually identical. Document any remaining inconsistencies as follow-up task entries

**Checkpoint**: User Story 1 fully functional. The platform now has one consistent interaction vocabulary. MVP passes.

---

## Phase 4: User Story 2 - Page & Navigation Transitions (Priority: P1)

**Goal**: Every route-to-route navigation cross-fades smoothly with no shell remount, scroll restoration on back, and animated active-nav indicator.

**Independent Test**: Click through a 5-route flow on desktop and mobile. Confirm transitions are smooth, active nav indicator animates, no layout shift, no FOUC, no stuck spinner. Tap browser back; confirm scroll position restored.

### Implementation for User Story 2

- [X] T031 [US2] Implement `frontend/src/components/motion/PageTransition.tsx` per `contracts/motion-primitives.tsx.md`: `useLocation` hook, `document.startViewTransition` when available, CSS-class fallback (`is-route-transitioning`), reduced-motion path, in-flight cancellation on rapid navigation
- [X] T032 [US2] Add `is-route-transitioning` keyframes to `frontend/src/styles/motion.css` (cross-fade + 8 px upward translate via `--motion-distance-small`, `--motion-duration-page`, `--motion-ease-decelerate`)
- [X] T033 [US2] Wrap the route outlet inside `frontend/src/components/layout/AppShell.tsx` with `<PageTransition>`. Confirm shell elements (header, sidebar, footer) stay mounted across navigation
- [X] T034 [US2] Implement scroll-position restoration on `popstate` (browser back) within `AppShell.tsx` or a sibling `useScrollRestoration` hook in `frontend/src/components/layout/`. Persist scroll position per-history-entry. Transient UI state (open menus, expanded rows, filters) is intentionally out of scope per the narrowed FR-008.
- [X] T035 [US2] Migrate the side-nav active indicator in `frontend/src/components/layout/AppShell.tsx` (or wherever the nav lives) to a single shared-layout indicator. The indicator's position transitions via `--motion-duration-medium` `--motion-ease-emphasized` between active items rather than per-item show/hide
- [X] T036 [P] [US2] Migrate the top-tabs active indicator (search for `.tabs` / `role="tablist"` patterns under `frontend/src/components/`) to the same shared-indicator pattern
- [X] T037 [P] [US2] Migrate breadcrumbs (if present) to use the page-transition cross-fade so segments animate consistently
- [X] T038 [US2] Add a primitive-level unit test at `frontend/tests/motion/PageTransition.test.tsx` (mocks `document.startViewTransition`; asserts fallback CSS class is applied; reduced-motion path collapses to 80 ms fade)
- [X] T039 [US2] Manual verification: walk Home → My Courses → Course Detail → Assignment on desktop and 360 px mobile. Confirm smooth transitions, no layout shift, indicator animates rather than snaps. Repeat in RTL

**Checkpoint**: User Stories 1 + 2 fully functional. Routes transition like a premium product.

---

## Phase 5: User Story 3 - Dashboard Interactions, Hover & Focus States (Priority: P1)

**Goal**: Dashboards across all roles render hover/focus/pressed/disabled/loading consistently, with per-action loading indicators (no global spinners except full-page loads).

**Independent Test**: Exercise every interactive component on faculty, dean, and admin dashboards with mouse, touch, keyboard. Confirm all interactive states are visible, distinct, and consistent. Submit a form; confirm in-button loading.

### Implementation for User Story 3

- [X] T040 [US3] Add a `loading` prop to the canonical `Button` primitive in `frontend/src/components/primitives/index.tsx`. When `loading=true`: replace label with spinner, disable click, set `aria-busy="true"`, no layout shift
- [X] T041 [US3] Add an in-input loading indicator pattern (right-aligned spinner) in `frontend/src/components/primitives/Input.tsx` (or wherever inputs live), gated by a `loading` prop. Set `cursor: progress` via `--state-input-loading-cursor`
- [X] T042 [P] [US3] Sweep dashboard pages — `frontend/src/pages/student/DashboardPage.tsx`, `frontend/src/pages/teacher/TeacherIntelligencePage.tsx`, `frontend/src/pages/admin/AdminGovernancePages.tsx`, `frontend/src/pages/owner/` — and replace any global page spinners triggered by user actions (form submit, save) with per-action loading
- [X] T043 [P] [US3] Audit KPI tile / dashboard card components for hover, pressed, focus consistency; ensure they consume `--state-card-*` tokens. Files: `frontend/src/components/dashboard/` (and any inline tile components in dashboard pages)
- [X] T044 [US3] Verify form validation state (error border + ring) consumes `--state-input-error-*` tokens in `frontend/src/components/primitives/` form components and the auth/registration pages (`frontend/src/pages/AuthPage.tsx`, `frontend/src/pages/RegisterPage.tsx`)

**Checkpoint**: User Stories 1 + 2 + 3 fully functional. P1 MVP complete. Platform feels world-class on the routes everyone touches every day.

---

## Phase 6: User Story 4 - Loading States & Skeleton System (Priority: P2)

**Goal**: Every data-bound region uses a layout-shape-preserving skeleton; cross-fade to real content with CLS ≈ 0; distinct empty and error states.

**Independent Test**: Throttle network to 3G. Open 3 data-heavy routes across 2 roles. Confirm skeletons match layout shape, cross-fade cleanly, empty state distinct from skeleton, error state actionable.

### Implementation for User Story 4

- [X] T045 [US4] Implement `frontend/src/components/motion/Skeleton.tsx` exporting `Skeleton` and `SkeletonGroup` per `contracts/motion-primitives.tsx.md`. Variants: `text`, `kpi`, `card`, `chart`, `list-row`, `avatar`. Reduced-motion: static muted block. Includes the 4-second "still loading…" inline cue
- [X] T046 [US4] Add skeleton variant CSS (one block per variant) to `frontend/src/styles/motion.css` driven by `--motion-duration-skeleton`
- [X] T047 [P] [US4] Replace the loading state in `frontend/src/pages/student/DashboardPage.tsx` with a `<SkeletonGroup>` matching the dashboard's grid (KPI tiles, chart, list)
- [X] T048 [P] [US4] Replace the loading state in `frontend/src/pages/teacher/TeacherIntelligencePage.tsx` with a matching `<SkeletonGroup>`
- [X] T049 [P] [US4] Replace the loading state in `frontend/src/pages/student/CoursesPage.tsx`, `LibraryPage.tsx`, `MoocPage.tsx`, `JobsPage.tsx` with appropriate `<SkeletonGroup>` shapes
- [X] T050 [P] [US4] Replace loading states in `frontend/src/pages/admin/AdminGovernancePages.tsx` and `frontend/src/pages/owner/` dashboard pages with matching skeletons
- [X] T051 [P] [US4] Replace loading states in `frontend/src/pages/exams/OnlineExamsPages.tsx` and `frontend/src/pages/community/CommunityPages.tsx` with matching skeletons
- [X] T052 [US4] Audit `frontend/src/components/primitives/States.tsx` (`EmptyState`, `ErrorState`, existing `LoadingState`); ensure each is visually distinct from the skeleton and includes the suggested-action / retry slot per FR-016, FR-017
- [X] T053 [US4] Add a primitive-level unit test at `frontend/tests/motion/Skeleton.test.tsx` (variant rendering, reduced-motion path, "still loading" cue appears after 4 s)
- [X] T054 [US4] Visual + CLS verification: open the routes patched in T047–T051 with throttled network in DevTools; confirm CLS ≤ 0.05 measured via Lighthouse or DevTools Performance panel

**Checkpoint**: User Stories 1–4 functional. Loading is no longer the perceived-quality failure mode.

---

## Phase 7: User Story 5 - Animated Statistics & Scroll-Based Reveal (Priority: P2)

**Goal**: Headline statistics count up smoothly; sections fade-and-rise as they scroll into view, once per element, never replayed.

**Independent Test**: Load the homepage and a college overview. Counters animate once with ease-out. Scroll through the page; reveals fire once per element, subtle, never replay.

### Implementation for User Story 5

- [X] T055 [US5] Implement `frontend/src/components/motion/AnimatedNumber.tsx` per `contracts/motion-primitives.tsx.md`: RAF integrator, mid-flight retargeting (no restart from zero), `Intl.NumberFormat` locale formatting, viewport-activation gate, reduced-motion snap, optional `tabular`
- [X] T056 [US5] Add a primitive-level unit test at `frontend/tests/motion/AnimatedNumber.test.tsx` (counts to target, retargets without restart, snaps under reduced-motion, formats per locale)
- [X] T057 [US5] Implement `frontend/src/components/motion/Reveal.tsx` exporting `Reveal` and `RevealGroup` per `contracts/motion-primitives.tsx.md`: IntersectionObserver one-shot, above-the-fold detection, `RevealGroup`-derived `staggerIndex` capped at `--motion-stagger-cap`, reduced-motion bypass
- [X] T058 [US5] Add a primitive-level unit test at `frontend/tests/motion/Reveal.test.tsx` (one-shot trigger, above-the-fold path, stagger index propagation, reduced-motion bypass)
- [X] T059 [P] [US5] Apply `<AnimatedNumber>` to KPI metrics across dashboards: `frontend/src/pages/student/DashboardPage.tsx`, `frontend/src/pages/teacher/TeacherIntelligencePage.tsx`, `frontend/src/pages/admin/AdminGovernancePages.tsx`, `frontend/src/pages/owner/` (replace existing static numeric displays)
- [X] T060 [P] [US5] Apply `<RevealGroup>` + `<Reveal>` around section blocks on `frontend/src/pages/LandingPage.tsx` (deferred to Phase 9 for the full homepage rebuild — but smoke-test the component here)
- [X] T061 [US5] Update the existing CSS reveal cascade in `frontend/src/styles/polish.css` (`.grid-N > *` cascade) to consume `--motion-stagger-step` and `--motion-distance-small` tokens. Replace the hardcoded `60ms`, `100ms`, `140ms`, … delays with `calc(var(--motion-stagger-step) * <i>)`
- [X] T062 [US5] Add a single Playwright (or Cypress) E2E reduced-motion gate at `frontend/tests/motion/reduced-motion.e2e.ts` against a dedicated fixture page (e.g., `/__motion-fixtures` or a Storybook story) that mounts `<Reveal>`, `<AnimatedNumber>`, and `<PageTransition>`: emulate `prefers-reduced-motion: reduce`, assert reveal renders in final state on first paint, assert counters render the target value immediately, assert page transition collapses to ≤80 ms fade. Fixture lives in `frontend/src/test-fixtures/MotionFixtures.tsx`. Dedicated fixture decouples the gate from homepage layout churn.

**Checkpoint**: User Stories 1–5 functional. Storytelling motion is in place. The reduced-motion E2E now permanently guards every future motion change.

---

## Phase 8: User Story 6 - College Page Visual Identity System (Priority: P2)

**Goal**: Each college page has its own accent + hero + icon identity, while sharing the platform's chrome. Adding a college is data-only.

**Independent Test**: Configure two colleges' identities. Visit each page on desktop and mobile. Confirm distinct accents, identical chrome/motion. Add a third with only a config change; confirm coherent identity without bespoke styling.

### Implementation for User Story 6

- [X] T063 [US6] Implement the `CollegeIdentityProfile` TypeScript type and the `colleges: CollegeIdentityProfile[]` array in `frontend/src/data/colleges.config.ts` per `contracts/college-identity-profile.md`. Populate entries for every real University of Zawia college (cross-reference the existing colleges data)
- [X] T064 [P] [US6] Add hero image assets under `frontend/public/colleges/<slug>/hero.{jpg,webp}` for each configured college. Use real University of Zawia imagery only (Principle III)
- [X] T065 [P] [US6] Implement `scripts/validate-college-identity.ts` (replacing the T006 skeleton): cross-reference slugs, asset existence, lucide icon validity, AA contrast computation against `--surface`, fail with per-college errors
- [X] T066 [P] [US6] Wire `validate:colleges` into the CI script chain (extend the script added in T007 with the now-functional validator)
- [X] T067 [US6] Update `frontend/src/styles/colleges.css` to consume `--college-accent`, `--college-accent-fg`, `--college-accent-soft` custom properties. Remove any hardcoded per-college hex values
- [X] T068 [US6] Update the college page component (under `frontend/src/pages/colleges/`) to: read the slug from the route, look up the profile from `colleges.config.ts`, set `data-college="<slug>"` and the `--college-accent*` CSS custom properties on the page root, render hero image + icon + (optional) motif from the profile
- [X] T069 [US6] Verify accent application is local: a college page never shadows `--success`, `--warning`, `--danger`. Add a comment block in `colleges.css` documenting this constraint
- [X] T070 [US6] Add at least two illustrative entries with `accentAccessible` overrides to verify the contrast-fallback path works end-to-end

**Checkpoint**: User Stories 1–6 functional. College pages are now identity-rich and data-driven.

---

## Phase 9: User Story 7 - Homepage Storytelling (Priority: P2)

**Goal**: Homepage has a clear hero → roles → proof → CTA narrative arc, with the motion system applied throughout. Real University of Zawia stats. Returning-visitor calm.

**Independent Test**: Open homepage on a fresh session at desktop, tablet, mobile. Top-to-bottom reads as a narrative. Hero CTA unambiguous. Motion calm. Returning visit (same session) does not replay full intro.

### Implementation for User Story 7

- [ ] T071 [US7] Restructure `frontend/src/pages/LandingPage.tsx` into named narrative sections: `<Hero>`, `<RolesNarrative>`, `<ProofPoints>`, `<CallToAction>`. Keep existing copy where it fits; flag missing copy with `[NEEDS COPY]` comments rather than placeholder text
- [ ] T072 [US7] Wrap each narrative section in `<Reveal>` (and the page in `<RevealGroup>`); apply `distance="large"` to the hero, `distance="medium"` to subsequent sections
- [ ] T073 [US7] Source proof-point statistics from the canonical University of Zawia data layer (Principle III). If a statistic is unavailable, render the "data pending" surface — never a synthetic placeholder
- [ ] T074 [P] [US7] Apply `<AnimatedNumber>` to every proof-point statistic on the homepage
- [ ] T075 [P] [US7] Add a session-storage flag `madarek.intro.seen` that, once set on first homepage visit, suppresses the hero's full intro motion on subsequent in-session visits — falls back to a calm fade. Stored, read, written in `frontend/src/pages/LandingPage.tsx`
- [ ] T076 [US7] Verify hero responsiveness at 360 px, 768 px, 1280 px, 4 K. Headline + supporting line + CTA all visible in the first viewport at each size
- [ ] T077 [US7] Run Lighthouse on the homepage on a representative mid-tier mobile profile (Slow 4G); confirm CLS ≤ 0.05, LCP within target, no a11y violations introduced
- [ ] T078 [US7] Verify the homepage renders correctly in RTL: hero heading direction, section ordering, indicator/slide direction, Arabic-Indic numerals on counters

**Checkpoint**: User Stories 1–7 functional. The homepage now passes the "world-class first impression" test.

---

## Phase 10: User Story 8 - Cross-Role Consistency (Priority: P3)

**Goal**: Multi-role users see identical interaction language across role contexts. Role surfaces compose existing primitives.

**Independent Test**: With a multi-role test account, switch between two role contexts and exercise comparable actions. Confirm interaction language is identical; only content + permissions differ.

### Implementation for User Story 8

- [ ] T079 [US8] Audit the seven role surfaces (student, faculty, department head, dean, administrator, quality assurance, platform owner) for any role-specific re-implementation of dashboard/list/modal/form patterns. Catalog findings in a comment block at the top of `frontend/src/components/primitives/index.tsx`
- [ ] T080 [P] [US8] Migrate any role-specific dashboard tile or list-row variants found in T079 onto the canonical primitives in `frontend/src/components/primitives/` and `frontend/src/components/dashboard/`
- [ ] T081 [P] [US8] Verify modal dismissal (Esc key, backdrop click, close button) is identical across all role surfaces. If a role-specific modal exists, replace with the canonical Modal primitive
- [ ] T082 [US8] With a multi-role account (or by manually toggling role state in the auth store during dev), exercise: open a list of items, edit a record, submit a form, dismiss a modal. Confirm every gesture and state transition is identical. Document remaining drift as follow-up tasks (do not block the phase)

**Checkpoint**: All user stories now functional. The motion + interaction system is consistent across every role surface.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting hardening that affects multiple user stories.

- [ ] T083 [P] Run `pnpm validate:colleges` in CI for every PR; confirm gate fires when an entry is malformed
- [ ] T084 [P] Bundle audit: run `npm run build:report`. Confirm student dashboard route gzipped delta ≤ 8 KB vs. baseline. If exceeded, identify the offending import and either tree-shake or defer
- [ ] T085 [P] Lighthouse CI: configure thresholds (Performance ≥ 90 mobile, Accessibility = 100, CLS ≤ 0.05) for `/`, `/student/dashboard`, `/colleges/<slug>`. Block PRs that regress
- [ ] T086 [P] Run a manual screen-reader smoke (NVDA on Windows OR VoiceOver on macOS) on the homepage, student dashboard, and a college page. Document focus order, announcement quality, and any issues
- [ ] T087 [P] Run a manual keyboard-only smoke through the same three routes. Confirm no tab traps, focus ring visible everywhere, all interactive elements reachable
- [ ] T088 [P] RTL parity sweep: switch language to Arabic, walk the same three routes, confirm motion mirrors correctly, layout doesn't break, indicator/drawer directions are correct
- [ ] T089 [P] Mid-tier mobile profile in Chrome DevTools (Galaxy S20 or Snapdragon 6-class), Slow 4G; record a Performance trace through homepage → student dashboard → course detail. Confirm jank ≤ 1 dropped frame/sec during transitions
- [ ] T090 [P] Backend follow-up (out-of-scope ticket): create a backlog item to migrate `colleges.config.ts` fields onto the `College` Prisma table — `accent`, `accentAccessible`, `heroImagePath`, `iconName`, `motifPath`. Frontend contract stays stable; only data source switches
- [ ] T091 [P] Documentation: update `DESIGN_POLISH_PLAN.md` to point to `specs/001-premium-motion-system/quickstart.md` as the now-canonical source
- [ ] T092 Cleanup: review `frontend/src/styles/polish.css` for sections fully superseded by `motion.css`/`tokens.css`; delete the deprecated sections in a follow-up commit (not in the same PR as this rollout — preserves git blame)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Pure scaffolding.
- **Foundational (Phase 2)**: Depends on Phase 1. **BLOCKS all user stories.**
- **User Stories (Phases 3–10)**: All depend on Phase 2.
  - Within P1 (US1, US2, US3): independent of each other; can proceed in parallel.
  - Within P2 (US4, US5, US6, US7): mostly independent; US7 (homepage) consumes primitives shipped in US4 (`Skeleton`) and US5 (`AnimatedNumber`, `Reveal`), so start US4 + US5 first if linearizing.
  - US8 (P3) depends on US1, US2, US3 being done (audit can't catch drift if the canon isn't in place yet).
- **Polish (Phase N)**: Depends on all in-scope user stories complete.

### User Story Dependencies

- **US1 (P1)**: Independent. Foundation work; everything else benefits but no story strictly blocks on it.
- **US2 (P1)**: Independent.
- **US3 (P1)**: Independent.
- **US4 (P2)**: Independent.
- **US5 (P2)**: Independent. T062 (E2E gate) targets a dedicated motion fixture page, not the homepage — decoupled from US7 layout churn.
- **US6 (P2)**: Independent.
- **US7 (P2)**: Soft-depends on US4 (Skeleton primitive), US5 (Reveal + AnimatedNumber). Start US7 implementation only after the primitives land.
- **US8 (P3)**: Depends on US1, US2, US3.

### Within Each User Story

- Tokens before consumers.
- Primitive components before page-level adoption.
- E2E gate (T062) added once the relevant primitives exist.
- Manual verification (visual/RTL/mobile/a11y smoke) is the last task of each story and gates the checkpoint.

### Parallel Opportunities

- All Setup [P] tasks (T003–T008) parallel.
- Within Foundational, T012, T013, T014, T015, T017 are [P] with each other after T009/T010/T011.
- US1 audits across stylesheets (T021–T026) all parallel.
- US4 page sweeps (T047–T051) parallel.
- US5 dashboard adoption (T059) parallel with homepage smoke (T060).
- US6 hero assets (T064), validator (T065), CI wiring (T066) parallel.
- US7 stat adoption (T074) and intro-suppression flag (T075) parallel.
- Polish phase tasks all parallel.

---

## Parallel Example: Foundational Phase

```bash
# After T009, T010, T011 land (durations + direction + reduced-motion):
Task: T012 — Add --state-* tokens in frontend/src/styles/tokens.css
Task: T013 — Universal :focus-visible rule in frontend/src/styles/motion.css
Task: T014 — Reveal keyframes in frontend/src/styles/motion.css
Task: T015 — Skeleton shimmer keyframe in frontend/src/styles/motion.css
Task: T017 — useReducedMotion test in frontend/tests/motion/useReducedMotion.test.tsx
# All [P] — different files / sections / tests, no shared dependency.
```

## Parallel Example: User Story 4 page sweep

```bash
Task: T047 — Skeleton on student/DashboardPage.tsx
Task: T048 — Skeleton on teacher/TeacherIntelligencePage.tsx
Task: T049 — Skeleton on student/{Courses, Library, Mooc, Jobs}.tsx
Task: T050 — Skeleton on admin + owner dashboards
Task: T051 — Skeleton on exams + community pages
# All [P] — different page files, all consume the same Skeleton primitive shipped in T045.
```

---

## Implementation Strategy

### MVP (Phases 1–5: Setup + Foundational + US1, US2, US3)

The MVP is the three P1 stories. After that point:

1. Every interactive element across the platform shares one visual language.
2. Every navigation feels premium.
3. Every dashboard interaction feels respectful and consistent.

That alone is a meaningful release. Stop, demo, validate, then proceed to P2.

### Incremental Delivery

1. Phases 1+2 → demo "tokens are live and reduced-motion works" (internal-only).
2. + US1 → demo "consistent interactions" → public release.
3. + US2 → demo "smooth navigation" → public release.
4. + US3 → demo "premium dashboards" → public release.
5. + US4 → "no more blank panes" → public release.
6. + US5 → "the platform tells stories" → public release.
7. + US6 → "every college has identity" → public release.
8. + US7 → "the homepage is world-class" → public release.
9. + US8 → "every role feels coherent" → public release.

Each step is independently shippable.

### Parallel Team Strategy

After Phase 2 lands:

- Developer A: US1 (audits across stylesheets) + US3 (dashboard primitives)
- Developer B: US2 (PageTransition + nav indicator)
- Developer C: US4 (Skeleton) + US5 (Reveal + AnimatedNumber) — these are foundational primitives feeding US7
- Designer + Developer pair: US6 (college identity content + assets)
- Then Developer C continues into US7 once US4 + US5 land.
- US8 audit happens after US1–US3 are merged.

---

## Notes

- [P] tasks = different files, no blocking dependencies on incomplete tasks.
- [Story] label maps each task to its user story for traceability.
- Tests are intentionally targeted (one E2E gate, primitive unit tests) rather than exhaustive — this is a presentation-layer feature with an outsized perceptual ROI per implementation hour. Manual smokes catch what unit tests cannot (focus order, screen-reader phrasing, motion calm).
- Verify the build and the bundle delta after each phase, not just at the end.
- Commit after each task or logical group; never bundle multiple stories into one commit.
- Stop at any checkpoint to validate the story independently before moving on.
- Avoid: vague tasks, same-file conflicts in [P] groups, cross-story dependencies that break independence.
