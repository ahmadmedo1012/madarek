---
description: "Task list — 012-design-graphics-uplift"
---

# Tasks: Design, Theming & Graphics Uplift — World-Class Tier

**Input**: Design documents from `/specs/012-design-graphics-uplift/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{theme-tokens, theme-state, illustration-system, elevation-language, chart-treatment, onboarding-milestone, audit-script}.md, quickstart.md

**Tests**: Tests ARE included for this feature — every contract under `contracts/` ships a test surface listed in the contract itself; the audit / drift / perf gates are CI-enforced.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks).
- **[Story]**: User-story label (US1..US8).
- Every task names exact file paths.

## Path Conventions

- Frontend: `frontend/src/{styles,lib,components,hooks,pages}`, `frontend/tests/{unit,audit,perf}`.
- Backend: `backend/src/modules/*`, `backend/prisma/`, `backend/tests/modules/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: One-time scaffolding for the new directories this feature introduces.

- [X] T001 [P] Create `frontend/src/components/overlays/` directory with an `index.ts` barrel re-exporting future Modal/Sheet/Popover/Dropdown/Toast/NotificationPanel/CommandPalette/Lightbox components.
- [X] T002 [P] Create `frontend/src/lib/illustrations/` directory with an empty `index.ts` registry skeleton (`IllustrationName` union, `loadScene(name)` lazy resolver, `<Illustration>` placeholder export).
- [X] T003 [P] Create `frontend/src/components/onboarding/` directory with stub files `OnboardingFlow.tsx` and `MilestoneScene.tsx` exporting empty components.
- [X] T004 [P] Create `frontend/tests/audit/` directory with a `routes.ts` table containing the 19 routes, 3 viewports, 2 themes, 2 dirs from `contracts/audit-script.md`.
- [X] T005 [P] Create `frontend/tests/perf/` directory; add a `baseline.json` placeholder committed empty `{}`.
- [X] T006 [P] Add backend module skeletons under `backend/src/modules/`: `theme/`, `onboarding/`, `milestones/` — each with `router.ts` and `service.ts` exporting unwired stubs.

**Checkpoint**: directories and stubs exist so subsequent parallel work doesn't fight over directory creation.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme tokens, theme hook, theme attribute application, and DB schema additions — everything every user story consumes.

**⚠️ CRITICAL**: No user-story phase can start until Phase 2 is complete.

### DB schema

- [X] T010 Extend `backend/prisma/schema.prisma` per `data-model.md`: add `ThemePreference` enum and four columns on `User` (`themePreference`, `themePreferenceUpdatedAt`, `onboardingCompletedAt`, `firedMilestones`).
- [X] T011 Generate migration `backend/prisma/migrations/20260602xx_design_uplift_state/migration.sql`; run `prisma:migrate` locally; verify all defaults populate as documented (existing rows: `themePreference=SYSTEM`, `onboardingCompletedAt=null`, `firedMilestones=[]`).

### Token foundations

- [X] T012 Extend `frontend/src/styles/tokens.css` with the Light theme block under `:root[data-theme="light"]` per `contracts/theme-tokens.md` §1–§7 (surface, text, accent, elevation, glass, illustration, chart palette tokens).
- [X] T013 Extend `frontend/src/styles/tokens.css` with the Dark theme block under `:root[data-theme="dark"]`. All token keys from T012 must be present.
- [X] T014 [P] Extend `frontend/src/styles/tokens.css` with the `prefers-contrast: more` adaptation block nested inside each theme block (§8 of theme-tokens contract).
- [X] T015 [P] Extend `frontend/src/styles/tokens.css` with the role-accent table under `body[data-role="…"]` for the seven roles, both theme variants (§2).
- [X] T016 [P] Extend `frontend/src/styles/tokens.css` with `--college-accent` slot and `--college-accent-soft` derivation; document the `gateCollegeAccent()` consumer in a comment header.

### Theme hook + pre-paint

- [X] T017 Create `frontend/src/lib/theme.ts`: zustand store + `useTheme()` hook implementing `ThemeAPI` per `contracts/theme-state.md` (in-memory + localStorage layers + OS watchers for color-scheme + contrast).
- [X] T018 Add the pre-paint script in `frontend/index.html` exactly as documented in §10 of `theme-tokens.md`; verify no flash on first load.
- [X] T019 Add `gateCollegeAccent(hex: string, surface?: 'light' | 'dark'): string` in `frontend/src/lib/theme.ts` performing the runtime contrast gate (R-004) and returning the original hex or a safe fallback.

### Backend `me` payload + theme endpoints

- [X] T020 Extend `backend/src/modules/users/service.ts` (or the equivalent `me` mapper) to include `themePreference`, `themePreferenceUpdatedAt`, `onboardingCompletedAt`, `firedMilestones` in the `GET /api/v1/me` response.
- [X] T021 Implement `GET /api/v1/me/theme` in `backend/src/modules/theme/router.ts` per `contracts/theme-state.md`.
- [X] T022 Implement `PUT /api/v1/me/theme` with `zod` validation `z.enum(['LIGHT','DARK','SYSTEM'])`, atomic update of both columns, audit log entry.
- [X] T023 Wire the new theme router into the main backend router (`backend/src/index.ts` or `backend/src/modules/index.ts` as the project organises).

### Foundation tests

- [X] T024 [P] Add `frontend/tests/unit/theme.test.ts` covering: pre-paint script behavior, `setChoice` synchrony, OS-watcher recompute when `choice='system'`, sync-on-sign-in cases (R-002 algorithm).
- [X] T025 [P] Add `backend/tests/modules/theme.test.ts` covering: `PUT /me/theme` rejects invalid enum, `GET /me/theme` returns 401 unauthenticated, audit log produced on success, atomic dual-column write.

**Checkpoint**: Light/Dark themes installed, `useTheme()` works, `<html data-theme>` reflects user choice / OS, DB columns ready, `me` payload exposes them.

---

## Phase 3: US1 — Light, Dark & Contextual Themes That Feel Native (Priority: P1) 🎯 MVP

**Goal**: Every primary route renders correctly in Light + Dark + `prefers-contrast: more`. Role and college accents tint chrome only.

**Independent Test**: Open every route in `tests/audit/routes.ts` in Light, then Dark. Confirm: zero unthemed surfaces, zero broken contrast, role-accent visible, college-accent visible on a tinted college page.

### Components & application

- [X] T030 [US1] Create `frontend/src/components/ThemeSwitcher.tsx` — a 3-way control (Light / Dark / System) calling `useTheme().setChoice`.
- [X] T031 [US1] Mount `<ThemeSwitcher />` in `frontend/src/components/layout/Topbar.tsx`.
- [X] T032 [US1] [P] Add `useEffect` in `frontend/src/components/layout/AppShell.tsx` (or equivalent root) to set `document.body.dataset.role` from `me.role` per quickstart §"Role accent".
- [X] T033 [US1] [P] Update `frontend/src/pages/colleges/CollegePage.tsx` (or equivalent) to set `style={{ '--college-accent': gateCollegeAccent(college.identityColor) }}` on its root element.

### Token-cleanup sweep

- [X] T034 [US1] [P] Sweep `frontend/src/styles/auth.css` replacing every literal hex / rgba with a `var(--…)` from the new theme tokens.
- [X] T035 [US1] [P] Sweep `frontend/src/styles/base.css` for theme-token compliance.
- [X] T036 [US1] [P] Sweep `frontend/src/styles/components.css` for theme-token compliance.
- [X] T037 [US1] [P] Sweep `frontend/src/styles/layout.css` for theme-token compliance.
- [X] T038 [US1] [P] Sweep `frontend/src/styles/notifications.css` for theme-token compliance.
- [X] T039 [US1] [P] Sweep `frontend/src/styles/owner.css` for theme-token compliance.
- [X] T040 [US1] [P] Sweep `frontend/src/styles/pdf.css` for theme-token compliance.
- [X] T041 [US1] [P] Sweep `frontend/src/styles/colleges.css` for theme-token compliance and apply `var(--college-accent)` at the chrome layer.
- [X] T042 [US1] [P] Sweep `frontend/src/styles/landing.css` for theme-token compliance.
- [X] T043 [US1] Audit `frontend/src/styles/polish.css` and prune sections whose role is now covered by tokens; keep only what is genuinely additive.

### Tests

- [X] T044 [P] [US1] Add `frontend/tests/unit/college-accent.test.ts` verifying `gateCollegeAccent` returns the original hex when contrast passes and the role-accent fallback when it fails.
- [X] T045 [P] [US1] Extend `frontend/tests/unit/theme.test.ts` (created in T024) with a "no untokenised colour leak" snapshot: render a representative page in Light + Dark and assert every text/background pair clears AA.

**Checkpoint US1**: any merger can demo the platform in Light, Dark, and high-contrast OS preference, with role and college accents.

---

## Phase 4: US3 — Dashboards With Surface Depth & Charts That Look Custom-Made (Priority: P1)

**Goal**: KPI tiles read with shadow stack + soft inner border; every chart uses the custom treatment in Light + Dark.

**Independent Test**: Open student/faculty/dean/admin/quality/owner dashboards in both themes. Confirm depth, designed tooltips, fading-edge axis, gradient area fills, no chart.js defaults.

(US3 is sequenced before US2/US4 so the chart treatment is ready when the homepage hero scene composes with charts. US1 remains the single visible MVP for shipping the dark-mode toggle.)

### Custom chart treatment (`contracts/chart-treatment.md`)

- [X] T050 [US3] Extend `frontend/src/lib/chartTheme.ts` with `chartPalette()` resolving Light/Dark categorical palette from `--chart-{idx}` / `--chart-{idx}-dark` tokens.
- [X] T051 [US3] Implement `madarekTooltipPlugin` inside `frontend/src/lib/chartTheme.ts` (designed surface tokens, type roles, opacity fade).
- [X] T052 [US3] Implement `madarekFadingAxisPlugin` inside `frontend/src/lib/chartTheme.ts`.
- [X] T053 [US3] Implement `madarekGradientFillPlugin` inside `frontend/src/lib/chartTheme.ts` with a `MutationObserver` on `<html>[data-theme]` triggering `chart.update('none')` for tracked instances.
- [X] T054 [US3] Update `createChartConfig()` defaults: `borderCapStyle: 'round'`, `borderJoinStyle: 'round'`, `borderWidth: 2`, `pointRadius: 0`, `tension: 0.32`. Apply same defaults to bar charts (`borderRadius: 4`).

### Surface depth

- [X] T055 [US3] [P] Add a `.surface-card` utility in `frontend/src/styles/components.css` consuming `var(--surface-card)`, `var(--elev-1)`, optional top-edge inset highlight, and a soft inner border via `box-shadow: inset 0 0 0 1px var(--surface-border)`.
- [X] T056 [US3] [P] Apply `.surface-card` to every dashboard tile component in `frontend/src/components/dashboard/` and `frontend/src/components/owner/` — replacing any per-component shadow.

### Tests

- [X] T057 [P] [US3] Add `frontend/tests/unit/chartTheme.test.ts` covering palette resolver picks dark variant when `data-theme=dark`, tooltip plugin reads the right tokens, gradient plugin recomputes on mutation.

**Checkpoint US3**: every dashboard tile and chart in Madrak reads as designed in both themes.

---

## Phase 5: US7 — Surface Depth, Glass & Elevation as a System (Priority: P2)

**Goal**: One shared elevation language across every overlay surface.

**Independent Test**: Trigger every overlay type (modal, sheet, popover, dropdown, toast, notification panel, command palette if present, lightbox if present). Verify shared elevation, glass treatment, sane z-order, dark-mode fill-led elevation.

(US7 is sequenced before US2 + US6 because their UIs use overlays + glass surfaces.)

### Overlay primitives (`contracts/elevation-language.md`)

- [X] T060 [US7] Create `frontend/src/components/overlays/Modal.tsx` consuming `var(--elev-4)`, `var(--r-xl)`, `var(--z-modal)`, glass background, AA-validated text contrast. Includes focus trap + Escape close + click-outside dismiss.
- [X] T061 [US7] [P] Create `frontend/src/components/overlays/Sheet.tsx` (top corners radius `--r-2xl`, slide-from-edge enter).
- [X] T062 [US7] [P] Create `frontend/src/components/overlays/Popover.tsx` (`--elev-3`, `--r-lg`, subtle glass).
- [X] T063 [US7] [P] Create `frontend/src/components/overlays/Dropdown.tsx` (`--elev-2`, `--r-md`, no glass).
- [X] T064 [US7] [P] Create `frontend/src/components/overlays/Toast.tsx` (`--elev-3`, error variant requires manual dismiss; non-error auto-dismiss 5 s).
- [ ] T065 [US7] [P] Create `frontend/src/components/overlays/NotificationPanel.tsx` (`--elev-3`, glass).
- [ ] T066 [US7] [P] Create `frontend/src/components/overlays/CommandPalette.tsx` (`--elev-5`, heavier blur). If platform does not currently use a command palette, ship the component but do not mount.
- [X] T067 [US7] [P] Create `frontend/src/components/overlays/Lightbox.tsx` (`--elev-5`, full-screen backdrop scrim).
- [X] T068 [US7] [P] Create `frontend/src/components/overlays/Tooltip.tsx` (`--elev-2`, `--z-tooltip`).
- [ ] T069 [US7] Update `frontend/src/components/overlays/index.ts` (T001) to export every overlay above.

### Existing-overlay migration

- [ ] T070 [US7] Sweep `frontend/src/components/` and `frontend/src/pages/` for any in-place overlay usage (Tailwind-style ad-hoc Modal, custom shadow boxes). Replace with the new primitives. List replacements in PR description.

### Tests

- [X] T071 [P] [US7] Add `frontend/tests/unit/overlays.test.tsx` covering: focus trap on Modal/Sheet/CommandPalette/Lightbox; Esc closes topmost; Toast does not steal focus; error Toast does not auto-dismiss; multi-overlay z-order rule.
- [ ] T072 [P] [US7] Add a `@supports not (backdrop-filter: blur(0))` mock to `overlays.test.tsx` asserting glass falls back to opaque fill.

**Checkpoint US7**: every overlay surface in the platform now uses the same elevation language.

---

## Phase 6: US4 — A Coherent Illustration System Across the Product (Priority: P1)

**Goal**: Documented illustration family + the 6 V1 scenes (per Q5 clarification). Every scene shares stroke / palette / perspective / motif.

**Independent Test**: Walk through the V1 illustrated surfaces. Open in Light + Dark, LTR + RTL. Confirm one visual family, no off-family drift.

(US4 produces the assets US2 / US6 / others consume.)

### Component + registry

- [ ] T080 [US4] Create `frontend/src/components/Illustration.tsx` per `contracts/illustration-system.md`: `name`/`role`/`decorative`/`altKey`/`className` API, `useTheme()`-aware variant selection, `dir`-aware composition, `React.lazy` for non-critical scenes, fallback on chunk load failure.
- [ ] T081 [US4] Wire the registry in `frontend/src/lib/illustrations/index.ts` — `IllustrationName` union, `loadScene` lazy resolver mapped to scene modules.

### V1 bespoke scenes (each its own file under `frontend/src/lib/illustrations/`)

- [ ] T082 [P] [US4] Create `homepage-hero.tsx` — eager-loaded hero illustration. Light + Dark variants composed from `var(--ill-hue-1..6)` only. Stroke `1.5` round caps. Perspective 30° isometric. ≤ 8 KB gz.
- [ ] T083 [P] [US4] Create `error-404.tsx` — Light + Dark; mirrors directional content for RTL.
- [ ] T084 [P] [US4] Create `empty-notifs.tsx` — symmetric scene; Light + Dark.
- [ ] T085 [P] [US4] Create `empty-search.tsx` — mirror arrow direction in RTL; Light + Dark.
- [ ] T086 [P] [US4] Create `milestone-section.tsx` — Light + Dark; small celebratory motif.
- [ ] T087 [P] [US4] Create `onboarding/frame-1.tsx`, `frame-2.tsx`, `frame-3.tsx` — three generic onboarding frames; Light + Dark; RTL composition.
- [ ] T088 [P] [US4] Create `onboarding/role-intro.tsx` — single component with seven role-keyed compositions (student / faculty / department-head / dean / admin / quality / owner); Light + Dark; RTL composition.

### Empty / error state migration

- [ ] T089 [US4] Update `frontend/src/components/primitives/States.tsx` (`EmptyState`, `ErrorState`) to take an `illustration?: IllustrationName` prop and render `<Illustration>` in place of the existing icon when set.
- [ ] T090 [US4] [P] Wire the new illustrations into the no-notifications surface, no-search-results surface, and 404 page.

### Tests

- [ ] T091 [P] [US4] Add `frontend/tests/unit/illustration.test.tsx` covering: registry covers all 9 names, `decorative=true` emits `aria-hidden`, `altKey` resolves via i18n when present, theme change does NOT trigger re-render, missing-chunk fallback renders within family.
- [ ] T092 [P] [US4] Add `frontend/tests/unit/illustration-family.test.ts` static-parse assertion that no scene file contains a hex / rgb literal (each must use CSS variables).

**Checkpoint US4**: 6 V1 surfaces ship with bespoke scenes; system + audit gate are in place for the follow-up catalogue.

---

## Phase 7: US2 — Homepage That Competes With the Best Public Software Pages (Priority: P1)

**Goal**: Hero scene + per-section scenes + bounded parallax.

**Independent Test**: Open homepage at 360 px / 768 px / 1280 px / 4 K, in LTR + RTL, in Light + Dark. Verify each section anchored by a scene, parallax ≤ 8 px, reduced-motion freezes scenes.

### Hero composition

- [ ] T100 [US2] Update `frontend/src/pages/landing/Hero.tsx` (or equivalent landing hero component) to compose `<Illustration name="homepage-hero" decorative />` with the existing `001-*` ambient motion layer.
- [ ] T101 [US2] Add bounded parallax helper in `frontend/src/components/motion/Parallax.tsx` — translation max 8 px, suspended on `prefers-reduced-motion: reduce`.
- [ ] T102 [US2] Apply `<Parallax>` to one homepage decorative element (NOT the hero scene itself; per spec, scene reveals once with canonical motion).

### Section scenes

- [ ] T103 [US2] [P] Add scene anchors to landing sections in `frontend/src/pages/landing/sections/`: each section receives an existing illustration (re-using `homepage-hero`, `milestone-section`, `empty-notifs`, etc.) following the section's narrative role; mark decorative or with i18n alt as appropriate.
- [ ] T104 [US2] [P] Verify Arabic / English line wrapping at 360 px after scenes are added — no overflow / clipping; touch targets ≥ 44 × 44 px.

### Tests

- [ ] T105 [P] [US2] Add `frontend/tests/audit/homepage.spec.ts` Playwright covering: scenes rendered at all 4 viewports × 2 themes × 2 dirs, parallax translation ≤ 8 px, reduced-motion mode produces zero motion attributes on `<svg>` elements.

**Checkpoint US2**: homepage reads as a flagship public software page.

---

## Phase 8: US5 — Scroll Narrative on Homepage and Key Landing Surfaces (Priority: P2)

**Goal**: One-shot section accents that fire once + idle pause + reduced-motion final-state.

**Independent Test**: Scroll homepage / colleges-gallery / a college page end-to-end. Each accent fires once; scroll-back does not replay; idle viewport has no animation; reduced-motion shows final state.

### Accent utility

- [ ] T110 [US5] Create `frontend/src/components/motion/SectionAccent.tsx` + a `useSectionAccent(ref, { kind })` hook. Wraps `IntersectionObserver` from `001-*`, records `data-accent-fired` on element, supports kinds: `underline-draw`, `number-tick`, `scene-paint`, `quote-fade`, `parallax-shift`. Idle pause via `document.hidden` + `requestIdleCallback` heartbeat.
- [ ] T111 [US5] Add reduced-motion branch in `useSectionAccent` rendering the accent's final state without playing.

### Application

- [ ] T112 [US5] [P] Wire `SectionAccent` to each landing section in `frontend/src/pages/landing/sections/` selecting an appropriate kind per section.
- [ ] T113 [US5] [P] Wire `SectionAccent` to the colleges-gallery landing sections.
- [ ] T114 [US5] [P] Wire `SectionAccent` to the per-college landing surfaces.

### RTL

- [ ] T115 [US5] Verify directional accents (`underline-draw`, `parallax-shift`) mirror correctly when `dir="rtl"`. Add unit assertions for the direction property in the resulting transform.

### Tests

- [ ] T116 [P] [US5] Add `frontend/tests/unit/section-accent.test.tsx` covering: fires once, does not replay on observer re-entry, idle visibility pause, reduced-motion produces final state.

**Checkpoint US5**: homepage and key landings read as a curated journey.

---

## Phase 9: US6 — Onboarding & Milestone Moments (Priority: P2)

**Goal**: 4-frame onboarding (3 generic + 1 role-intro) runs once per user post-release; three named milestones fire once each.

**Independent Test**: Sign in as a fresh user → onboarding mounts. Skip → no replay on next sign-in. Open from help → replays without backend call. Trigger a milestone — scene plays once.

### Onboarding flow

- [ ] T120 [US6] Implement `frontend/src/hooks/useOnboardingState.ts` per `contracts/onboarding-milestone.md` §4: `shouldAutoStart`, `currentFrame`, `isReplay`, `next/skip/finish/open`.
- [ ] T121 [US6] Implement `frontend/src/components/onboarding/OnboardingFlow.tsx`: 4-frame carousel using `<Illustration>` from US4, skip control on every frame, role-aware copy via i18n.
- [ ] T122 [US6] Add i18n bundles for onboarding copy (`onboarding.frame1.*`, `frame2.*`, `frame3.*`, `roleIntro.{role}.*`) in the existing `frontend/src/locales/` structure.
- [ ] T123 [US6] Auto-mount `<OnboardingFlow />` in `frontend/src/pages/dashboard/index.tsx` (or app shell) when `me.onboardingCompletedAt === null`.
- [ ] T124 [US6] Add a "See product tour" entry to the help/settings menu calling `useOnboardingState().open({ replay: true })`.

### Backend onboarding endpoint

- [ ] T125 [US6] Implement `POST /api/v1/me/onboarding/complete` in `backend/src/modules/onboarding/router.ts`: idempotent set of `onboardingCompletedAt = now()`; returns `{ onboardingCompletedAt }`. Audit log entry.
- [ ] T126 [US6] Wire the onboarding router into the main backend router.

### Milestone catalogue

- [ ] T127 [US6] Implement `frontend/src/hooks/useMilestone.ts`: tracks session-local "presented" set; mounts `<MilestoneScene id=… />` for newly-added IDs in `me.firedMilestones`.
- [ ] T128 [US6] Implement `frontend/src/components/onboarding/MilestoneScene.tsx`: portal-mounted overlay using `<Illustration name="milestone-section" />` (V1) or the milestone-specific scene; auto-dismiss after `--dur-emphasized-in + 1000ms hold + --dur-standard-out`.

### Backend milestone endpoint + triggers

- [ ] T129 [US6] Implement `POST /api/v1/me/milestones/:id/fire` in `backend/src/modules/milestones/router.ts`: validates id matches `^(first-assignment-complete|first-course-complete|exam-window-opens:[a-zA-Z0-9_-]+)$`, server-to-server auth, atomic `array_append` via raw SQL, returns updated array. Audit log entry.
- [ ] T130 [US6] [P] Wire `first-assignment-complete` trigger inside `backend/src/modules/submissions/service.ts` — call `fireMilestone` helper when `Submission.status` first transitions to `SUBMITTED` for this user.
- [ ] T131 [US6] [P] Wire `first-course-complete` trigger inside `backend/src/modules/enrollments/service.ts` — call `fireMilestone` helper when `Enrollment.status` first transitions to `COMPLETED` for this user.
- [ ] T132 [US6] [P] Wire `exam-window-opens:<windowId>` trigger inside the existing exam-window cron tick — for each enrolled user not already in `firedMilestones`, fire and log.

### Tests

- [ ] T133 [P] [US6] Add `backend/tests/modules/onboarding.test.ts` covering idempotent `complete` endpoint, audit log emission, 401 unauth.
- [ ] T134 [P] [US6] Add `backend/tests/modules/milestones.test.ts` covering: id-regex rejection, atomic `array_append`, no-op on duplicate fire, server-to-server auth gate.
- [ ] T135 [P] [US6] Add `frontend/tests/unit/onboarding.test.tsx` covering: auto-mount when completedAt is null, replay bypasses backend call, role-intro frame uses correct i18n bundle.
- [ ] T136 [P] [US6] Add `frontend/tests/unit/milestones.test.tsx` covering: pending scene fires once per session, scenes queue while onboarding is open.

**Checkpoint US6**: onboarding flow + three milestones live.

---

## Phase 10: US8 — Themed Governance & Cross-Route Parity (Priority: P3)

**Goal**: A surface inventory artefact + a CI-enforced drift gate.

**Independent Test**: Run the audit. Confirm `surface-inventory.json` lists every audited route × theme × dir × viewport. Run drift step against the committed baseline. Confirm CI fails on any of the documented drift kinds.

### Inventory + drift scripts

- [ ] T140 [US8] Implement `frontend/tests/audit/surface-inventory.spec.ts` per `contracts/audit-script.md`: visit every entry from `routes.ts` × viewport × theme × dir, capture the documented `SurfaceCapture` shape, write `frontend/tests/audit/surface-inventory.json`.
- [ ] T141 [US8] Implement `frontend/tests/audit/surface-drift.spec.ts`: load latest inventory + committed baseline, fail on the 9 drift conditions in the contract.
- [ ] T142 [US8] [P] Generate the initial `frontend/tests/audit/surface-baseline.json` by running `npm run audit:baseline` once on `main` and commit.
- [ ] T143 [US8] [P] Add `test:audit` and `test:audit:drift` scripts to `frontend/package.json`.

### CI integration

- [ ] T144 [US8] Wire the audit + drift steps into the project's CI configuration (the existing GitHub Actions workflow). Drift failures must block merge.

**Checkpoint US8**: governance is automatic; drift kinds are CI failures.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T150 [P] Add `frontend/tests/perf/budget-verify.spec.ts` per R-012: assert per-route `transferSize ≤ documented budget + 18 KB`, FCP regression ≤ 5 % vs `tests/perf/baseline.json`, theme switch produces 0 CLS.
- [ ] T151 [P] Capture the perf baseline by running the script once on `main` immediately before merging the first 012 commit; commit `frontend/tests/perf/baseline.json`.
- [ ] T152 [P] Run `npx axe-core` (already wired) on the V1 illustrated surfaces in Light + Dark; fix any AA violations.
- [ ] T153 [P] Update `frontend/README.md` (or the project's contributor doc) with a pointer to `specs/012-design-graphics-uplift/quickstart.md`.
- [ ] T154 [P] Verify the print stylesheet in `frontend/src/styles/` honours Light theme + no glass + no decorative motion when printing — fix if needed.
- [ ] T155 [P] Manual sweep: open every primary route in `tests/audit/routes.ts` in production preview; record any visual drift not caught by the static audit; add to backlog.
- [ ] T156 Run a manual reduced-motion + screen-reader smoke test on the dashboard, the homepage, and the onboarding flow; record results in PR description.
- [ ] T157 Final pass: confirm `MEMORY.md` and `CLAUDE.md` references are up to date; verify `feature.json` points at `specs/012-design-graphics-uplift`.

---

## Dependencies

```
Phase 1 (Setup)
  ↓
Phase 2 (Foundational — tokens, hook, DB schema)
  ↓
Phase 3 (US1 — themes applied)              ◄── MVP shipping line
  ↓
Phase 4 (US3 — surface depth + custom charts)
  ↓
Phase 5 (US7 — overlay elevation language)
  ↓
Phase 6 (US4 — illustration system + V1 scenes)
  ↓
Phase 7 (US2 — homepage scenes + parallax)   ◄── consumes US4 illustrations + US3 charts
  ↓
Phase 8 (US5 — scroll narrative)             ◄── consumes US2 hero compositions
  ↓
Phase 9 (US6 — onboarding + milestones)      ◄── consumes US4 onboarding scenes + US7 overlays
  ↓
Phase 10 (US8 — governance / audit / drift)  ◄── consumes ALL prior surfaces
  ↓
Phase 11 (Polish)
```

### Cross-story dependencies (binding)

- **US2 ⟸ US3, US4, US7**: homepage uses charts (US3 treatment), illustrations (US4 system), and overlays (US7 elevation). Defer US2 sections that depend on charts/glass until those phases ship.
- **US5 ⟸ US4**: section-narrative uses `scene-paint` accent kind (renders an illustration). Other accent kinds are independent.
- **US6 ⟸ US4, US7**: onboarding flow renders illustrations (US4) inside an overlay surface (US7).
- **US8 ⟸ everything**: audit inventory only meaningful once US1..US7 produce stable surfaces.

---

## Parallel Execution Opportunities

### Within Phase 2 (Foundational)

- T012 → T013 → (T014 ‖ T015 ‖ T016) sequential token-block creation, then parallel adaptation tables.
- T017 ‖ T020 — hook and `me` payload extension in different files, no dependency.
- T024 ‖ T025 — frontend and backend tests independent.

### Within US1 (Phase 3)

- T034..T042 — every per-file CSS sweep is parallelisable (different files).
- T044 ‖ T045 — independent test files.

### Within US7 (Phase 5)

- T061..T068 — every overlay primitive is in its own file → all parallel.
- T071 ‖ T072 — independent test files.

### Within US4 (Phase 6)

- T082..T088 — every scene file is independent → maximum parallelism.

### Within US6 (Phase 9)

- T130 ‖ T131 ‖ T132 — three milestone triggers in three different backend services.
- T133..T136 — four independent test files.

### Across stories (advanced — only after Phase 2)

- US3 sweep on dashboards (T056) ‖ US4 illustration scenes (T082..T088) ‖ US7 overlay primitives (T061..T068) — three different concern areas, three different file trees, can be split across contributors.

---

## Implementation Strategy

### MVP (US1 only)

Ship Phase 1 → Phase 2 → Phase 3 (US1). Result: every primary route renders in Light + Dark with role + college accents. Theme switcher in the topbar. This is a shippable, demo-able increment that already ships the "single most-asked-for missing feature" (per spec).

### V1 first wave (US1 + US3 + US4 + US7)

Adds: surface depth, custom chart treatment, the documented illustration system + 6 V1 scenes, and the shared overlay elevation language. After this wave the platform reads as a tier-jump even before homepage scenes ship.

### V1 second wave (US2 + US5 + US6)

Adds: homepage scene composition, scroll narrative on key landings, onboarding flow, three milestones. Visible to first-time visitors and users hitting milestones.

### V1 final (US8 + Polish)

Adds: surface-inventory audit + drift CI gate, performance budget verification, axe sweep, manual smoke tests. Closes the feature.

### Out-of-scope (V2 follow-up)

- Remaining 6+ catalogue scenes (`500`, `auth-locked`, `session-expired`, `no-courses`, `milestone-course-complete`, `success-after-submit`, `error-recoverable`).
- Seasonal / contextual moments (Ramadan, exam season, graduation week).
- A user-customisable colour-picker theme engine.
- A separate fully-designed third theme.

---

## Status

- Total tasks: 89 (T001..T157, gaps preserved for clarity).
- US1: 16 tasks (P1, MVP).
- US2: 6 tasks (P1).
- US3: 8 tasks (P1).
- US4: 13 tasks (P1).
- US5: 7 tasks (P2).
- US6: 17 tasks (P2).
- US7: 13 tasks (P2).
- US8: 5 tasks (P3).
- Foundational + Setup + Polish: 24 tasks.
