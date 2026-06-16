---
description: "Task list for spec 011 — Platform Completeness Uplift"
---

# Tasks: Platform Completeness Uplift

**Input**: Design documents from `/specs/011-platform-completeness-uplift/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Test tasks are included where the feature itself is testable in CI (a11y gate, search algorithm, SSE flow, normalization). They are not included for pure UI polish where the constitution's "manual validation note" is the agreed verification.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

1. `[P]` — task can run in parallel (different files, no incomplete dependency).
2. `[Story]` — `[US1]`..`[US8]` per spec.md. Setup, Foundational, and Polish phases have no story label.
3. Every task has an exact file path or shell command.

## Path Conventions

Web app monorepo: `frontend/src/`, `backend/src/`, `backend/prisma/`, `scripts/`. Per `plan.md`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and project plumbing introduced by spec 011.

- [X] T001 [P] Add frontend i18n dependencies — run `npm install --workspace frontend i18next@^23 react-i18next@^14 i18next-http-backend@^2` and commit `frontend/package.json` + lockfile.
- [X] T002 [P] Add frontend a11y CI deps — run `npm install --workspace frontend --save-dev @playwright/test@^1 @axe-core/playwright@^4` and commit `frontend/package.json` + lockfile.
- [X] T003 [P] Create `frontend/playwright.config.ts` with one project per `{light, dark} × {ar, en}` (4 projects), `baseURL: 'http://localhost:5173'`, and a single shared `specDir: './tests/e2e'`.
- [X] T004 [P] Create `scripts/check-i18n-coverage.sh` per `contracts/locale.md` (greps for literal Arabic/English strings in JSX, compares `ar.json` vs `en.json` keys, fails on divergence).
- [X] T005 Wire `npm run check:i18n` in repo-root `package.json` scripts pointing at `scripts/check-i18n-coverage.sh`.

**Checkpoint**: Dependencies installed; CI hooks ready; nothing user-visible has changed yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, shared modules, and infrastructure required by multiple stories. No user-story implementation begins until this phase is complete.

⚠️ **CRITICAL**: Phase 2 blocks every user-story phase below.

### Schema migrations

- [ ] T006 Add `Locale` enum + `User.locale` (default `AR`) and `User.rememberMeUntil` (nullable) to `backend/prisma/schema.prisma`.
- [ ] T007 Generate migration `011_user_locale_remember` — `npx prisma migrate dev --name 011_user_locale_remember --workspace backend`. Backfill existing rows to `AR` via `UPDATE "User" SET locale='AR' WHERE locale IS NULL` (the migration generator will do this for non-null defaults; verify in the produced SQL).
- [ ] T008 Add `NotificationCategory` enum, `EmailDigestCadence` enum, and `NotificationPreference` model to `backend/prisma/schema.prisma` per `data-model.md`.
- [ ] T009 Generate migration `011_notification_preference` — `npx prisma migrate dev --name 011_notification_preference --workspace backend`. No data backfill (preferences are lazy).
- [ ] T010 Add `Course.searchableNormalized`, `Faculty.searchableNormalized`, `Lecture.searchableNormalized` (nullable string) to `backend/prisma/schema.prisma`.
- [ ] T011 Author hand-rolled migration file `backend/prisma/migrations/<ts>_011_search_normalized/migration.sql` adding `CREATE EXTENSION IF NOT EXISTS pg_trgm`, the three columns, and three GIN trigram indexes per `data-model.md`. Run `npx prisma migrate dev` to apply.

### Arabic normalizer (shared by search + frontend highlighting)

- [X] T012 Create `backend/src/modules/search/normalize.ts` exporting `normalizeArabicSearch(input: string): string` exactly as specified in `contracts/search.md`.
- [X] T013 [P] Create `backend/src/modules/search/__tests__/normalize.test.ts` covering the acceptance matrix from `contracts/search.md` (idempotency property test + every fixture row).
- [X] T014 [P] Create `frontend/src/lib/search.ts` re-exporting `normalizeArabicSearch` from a shared location (copy the function with a comment cross-referencing `backend/src/modules/search/normalize.ts`; no runtime cross-workspace import).
- [ ] T015 Add `backend/scripts/backfill-search-normalized.ts` — pages each entity in batches of 1000, computes the normalized form, persists. Idempotent. Run once locally to verify.
- [ ] T016 Wire a Prisma client extension in `backend/src/db.ts` so `Course`/`Faculty`/`Lecture` `create` and `update` automatically populate `searchableNormalized` from the entity's primary search field.

### Session policy auth groundwork

- [ ] T017 Add `pwd_at: number` claim to access-token issuance in `backend/src/modules/auth/tokens.ts` (or equivalent). Set on `login`, `step-up`, and `password/change` paths; carry over on `refresh`.
- [ ] T018 Add a `requiresStepUp` route flag mechanism in `backend/src/http/middleware/stepUp.ts` that reads `pwd_at` from the decoded access token and returns `403 STEP_UP_REQUIRED` per `contracts/session-policy.md`.
- [ ] T019 Tag the existing sensitive routes from `contracts/session-policy.md` (exam-attempt start, exam-answer submit, grade write/patch, password change, account-settings PATCH) with `requiresStepUp: true`.

### Branded splash + skeleton primitives

- [X] T020 [P] Create `frontend/public/splash.html` — a self-contained branded splash with logo, palette tokens inlined (no external CSS), used as fallback for first-paint slot.
- [X] T021 [P] Extend `frontend/src/components/primitives/States.tsx` with one exported `RouteSkeleton` factory that takes a layout descriptor and applies the existing `--motion-shimmer` token; consumers will compose this per route.

**Checkpoint**: Schema migrated; normalizer + tests pass; step-up gate active on sensitive routes (any user not in a fresh `pwd_at` window will see a 403 — frontend modal lands in US1). User stories can now proceed.

---

## Phase 3: User Story 1 — Verify inner-app integrity + step-up UX (Priority: P1) 🎯 MVP

**Goal**: Confirm every authenticated route reaches real data, add the `<StepUpModal>` so the foundational `403 STEP_UP_REQUIRED` flow is user-completable, and add the Skip-to-content link.

**Independent Test**: Sign in as a seeded student; navigate to the dashboard, an enrolled course, a lecture, and an assignment, submitting a file; trigger a sensitive route after 31 minutes (or via dev-only "expire pwd_at" toggle) and confirm the StepUpModal appears, the password is accepted, and the original action completes.

- [ ] T022 [P] [US1] Add `<SkipNavLink>` component at `frontend/src/components/layout/SkipNavLink.tsx` — visually-hidden until focused; routes focus to `<main id="main">`.
- [ ] T023 [US1] Mount `<SkipNavLink>` as the first child of `<AppShell>` in `frontend/src/components/layout/AppShell.tsx`.
- [ ] T024 [P] [US1] Add `pwdAt` and `lastInteractiveAuthAt` fields to `frontend/src/stores/auth.store.ts`; populate from access-token decode.
- [ ] T025 [P] [US1] Create `frontend/src/components/auth/StepUpModal.tsx` — focus-trapping dialog, password input, posts to `/auth/step-up`, resolves a returned promise. Keyed strings via `t()` (will land before US7 with the keys present in `ar.json`; English added in US7).
- [ ] T026 [US1] Add `POST /api/v1/auth/step-up` handler in `backend/src/modules/auth/routes.ts` per `contracts/session-policy.md` — Argon2 verify, fresh `pwd_at`, rotate refresh, write `LoginEvent { kind: STEP_UP }` and `AuditLog`.
- [ ] T027 [US1] Add `STEP_UP` value to `LoginEvent.kind` enum in `backend/prisma/schema.prisma` (additive enum migration).
- [ ] T028 [US1] Extend the axios response interceptor in `frontend/src/lib/api.ts` to catch `403 STEP_UP_REQUIRED`, open `<StepUpModal>`, and retry the original request once on success — preserving the existing 401-refresh path unchanged.
- [ ] T029 [P] [US1] Add `rememberMe` checkbox to `frontend/src/pages/AuthPage.tsx`; wire to login post body.
- [ ] T030 [US1] Update `POST /api/v1/auth/login` handler to accept `rememberMe`, set `mdrk_refresh` `Max-Age` to 2592000 vs 604800 accordingly, write `User.rememberMeUntil` per `contracts/session-policy.md`.
- [ ] T031 [US1] Update `POST /api/v1/auth/refresh` handler to compute new refresh `Max-Age` as `min(7d, rememberMeUntil - now)`; carry `pwd_at` over.
- [ ] T032 [US1] Update `POST /api/v1/auth/logout` to clear `User.rememberMeUntil` and bump `tokenVersion` (preserving the existing tokenVersion behavior).
- [ ] T033 [US1] Verification pass — walk every authenticated route in `frontend/src/App.tsx`. For each, capture in `specs/011-platform-completeness-uplift/audit/route-status.md` whether (a) it renders real data via `useResources.ts`, (b) `ProtectedRoute` allow-list matches role intent, (c) any placeholder leaks. Open follow-up tasks for the placeholder admin pages already documented in `FRONTEND.md`.
- [ ] T034 [P] [US1] Add `backend/src/modules/auth/__tests__/step-up.test.ts` — happy path + wrong password + lockout-after-5 + rate-limit + `pwd_at` carry-over on refresh.

**Checkpoint**: Login + remember-me + step-up form a complete loop end-to-end. Skip-link works. Inner-app status documented.

---

## Phase 4: User Story 2 — Cold-start fix + branded loading (Priority: P1)

**Goal**: Eliminate the 30–60 s Render free-tier splash. Branded paint within 3 s; TTI within 5 s.

**Independent Test**: From a cold cache (incognito) after >1 hour idle, hit production. First branded paint ≤ 3 s, TTI ≤ 5 s, no third-party splash visible. Repeat warm: TTI ≤ 1.5 s.

- [ ] T035 [US2] Upgrade Render service to **Standard** tier — coordinated with project owner; deployment-config change, no source-code commit. Document the change in `docs/operations/render-tier.md`.
- [ ] T036 [P] [US2] Configure Cloudflare in front of `madarek.onrender.com` with page rules: cache `/` for guests `s-maxage=300, swr=86400`; explicitly bypass cache for `/api/v1/*` and any path containing `mdrk_refresh` cookie. Document in `docs/operations/cloudflare.md`.
- [ ] T037 [P] [US2] Add early-paint reference in `frontend/index.html` to `frontend/public/splash.html` content (inline script that injects splash markup before React hydrates) — composes with T020.
- [ ] T038 [US2] Add per-route branded skeleton variants for the nine routes inventoried in `research.md` R-008. Each lives next to its page (e.g., `frontend/src/pages/student/DashboardPage.skeleton.tsx`). All consume `RouteSkeleton` from T021. Reduced-motion fallback verified.
- [ ] T039 [US2] Wire each route's skeleton as the `Suspense` fallback in `frontend/src/App.tsx` lazy-load boundaries (replace the single `<PageSkeleton />` fallback with the route-specific one).
- [ ] T040 [P] [US2] Add `frontend/tests/e2e/cold-start.spec.ts` — Playwright timing assertion: branded paint ≤ 3 s on cold, TTI ≤ 5 s.

**Checkpoint**: Render no longer cold-starts. Cloudflare absorbs the public landing. Skeletons mimic layout per page. SC-002, SC-003, SC-013 verifiable.

---

## Phase 5: User Story 3 — Persistent shell + nav + global search (Priority: P2)

**Goal**: Sticky header, breadcrumbs, and global search with Arabic normalization. Desktop horizontal nav. CTA distinction.

**Independent Test**: On viewport ≥ 1024px, navigate four levels deep — at each, the header is sticky, breadcrumbs reflect the path, and a search query for a known lecture title (with or without diacritics, with or without `ال`) returns the lecture as the top hit.

- [ ] T041 [P] [US3] Make `Topbar` sticky in `frontend/src/components/layout/Topbar.tsx` — `position: sticky; top: 0; z-index: var(--z-topbar);`; verify against existing scroll behaviors.
- [ ] T042 [P] [US3] Create `frontend/src/components/layout/Breadcrumbs.tsx` — derives crumbs from React Router location + a route-label registry at `frontend/src/lib/nav.ts` keyed on i18n keys.
- [ ] T043 [US3] Mount `<Breadcrumbs>` immediately below `<Topbar>` for every authenticated route in `<AppShell>`.
- [ ] T044 [P] [US3] Implement `GET /api/v1/search` handler in `backend/src/modules/search/routes.ts` per `contracts/search.md` — substring + ≥4-char trigram fuzzy with `ال`-prefix tolerance, dedupe by `(type,id)`.
- [ ] T045 [US3] Wire the search route into `backend/src/app.ts` after the existing auth middleware and before catch-all routes.
- [ ] T046 [P] [US3] Add `backend/src/modules/search/__tests__/routes.test.ts` covering the matrix in `contracts/search.md` against seed fixtures.
- [ ] T047 [US3] Update `frontend/src/components/layout/GlobalSearch.tsx` — call `GET /api/v1/search` with debounce ≥ 250 ms, render results as routable list, empty-state via `t('search.no_results.*')`.
- [ ] T048 [P] [US3] Visually distinguish "ابدأ مجاناً الآن" (primary CTA) from "تسجيل الدخول" (secondary CTA) on `frontend/src/pages/LandingPage.tsx` — primary uses brand-gold filled, secondary uses outlined. Tokens only.
- [ ] T049 [P] [US3] Add `frontend/tests/e2e/search-arabic.spec.ts` covering the FR-019 + Edge Case #6 matrix (with/without diacritics, with/without `ال`, hamza/alif variants, transposition fuzzy at length ≥ 4).

**Checkpoint**: Sticky shell, breadcrumbs, Arabic-normalized global search shipped.

---

## Phase 6: User Story 4 — Unified notifications + SSE + preferences (Priority: P2)

**Goal**: Replace the 60-second poll with SSE; add preference UI (in-app on/off + email-cadence visible-but-disabled); enforce ≤ 30 s end-to-end without manual refresh.

**Independent Test**: Sign in as a student in one browser; trigger a lecture upload from a teacher account in another; the bell badge updates within 30 s in the student's window without reload. Mark-all-read zeros the badge. Toggling `inApp=false` for a category prevents new persistence.

- [ ] T050 [US4] Create in-process pub/sub at `backend/src/modules/notifications/bus.ts` (typed `EventEmitter` wrapper, single instance).
- [ ] T051 [US4] Hook every existing notification create / mark-read / delete site to publish on the bus (search for `prisma.notification.create` and similar).
- [ ] T052 [US4] Implement `GET /api/v1/notifications/stream` SSE handler in `backend/src/modules/notifications/routes.ts` per `contracts/notifications.md` — heartbeat every 30 s, `Last-Event-ID` backfill via `GET /notifications?since=`.
- [ ] T053 [P] [US4] Implement `GET/PUT /api/v1/notifications/preferences` and `PATCH /api/v1/notifications/preferences/:category` per `contracts/notifications.md`. Defaults filled in for missing categories.
- [ ] T054 [P] [US4] Implement `POST /api/v1/notifications/mark-all-read` per `contracts/notifications.md`.
- [ ] T055 [US4] Update `frontend/src/hooks/useResources.ts` — replace 60-s notification poll with `EventSource` subscription that opens after auth hydration; reconnect with exponential backoff (250 ms → 30 s); on reconnect, fetch `/notifications?since=<lastSeenId>`.
- [ ] T056 [P] [US4] Update `frontend/src/components/layout/NotificationDropdown.tsx` — add "mark all read" action and per-row mark-read; render notifications from the wire's existing `body` plain-text field for v1 (the platform is Arabic-only at this phase). The `bodyKey + bodyParams` consumption path is added later in T084 as part of the i18n switchover and does not block US4.
- [ ] T057 [P] [US4] Create `frontend/src/pages/student/NotificationsPage.tsx` — full notifications list with pagination cursor and the same mark-read actions. Wire to existing `/notifications` route in App.tsx.
- [ ] T058 [P] [US4] Create `frontend/src/pages/settings/NotificationPreferences.tsx` — table of categories × {in-app toggle, email cadence select}; email controls are visible-but-`disabled` with a "قريباً" / "Coming soon" badge per Clarification 2.
- [ ] T059 [US4] Wire `/settings/notifications` route in `frontend/src/App.tsx`.
- [ ] T060 [US4] Modify the notification-create path in the backend to (a) consult `NotificationPreference.inApp` and skip persistence for `false` (database hygiene; spec FR-024); (b) **also** populate `titleKey`, `titleParams`, `bodyKey`, `bodyParams` on the SSE / list wire shape per `contracts/notifications.md` § Response 200, computed at emission time from category + existing payload — no schema change required (the existing `body` plain-text column continues to be the persisted source-of-truth; keyed fields are projection-only). Forward-compat by design: US4 ships without consumers reading the keys; US7's T084 switches the consumer.
- [ ] T061 [P] [US4] Cap visible bell badge at "99+" in `NotificationDropdown` and paginate the page (`limit=50`) per FR-026.
- [ ] T062 [P] [US4] Add `frontend/tests/e2e/notifications-sse.spec.ts` — opens stream, asserts arrival within 1 s of a server-side write, reconnect-with-backfill scenario.

**Checkpoint**: Real-time notifications shipped; preferences UI present (with email channel deferred); SC-007 verifiable.

---

## Phase 7: User Story 5 — WCAG 2.1 AA verification + remediation (Priority: P2)

**Goal**: Zero critical/serious axe violations across in-scope routes × {light, dark} × {ar, en}; keyboard-only operability for primary flows; visible focus indicators ≥ 3:1 contrast.

**Independent Test**: Run `npm run test:a11y` (alias for the Playwright/axe suite) — must produce zero critical or serious violations across all 36 cases. Manual keyboard-only walk of the four primary flows passes the smoke from `quickstart.md`.

- [ ] T063 [P] [US5] Wire `@axe-core/react` into `frontend/src/main.tsx` behind `import.meta.env.DEV` per R-002.
- [ ] T064 [P] [US5] Create `frontend/tests/e2e/a11y.spec.ts` — for each of `[/, /auth, /dashboard, /courses, /courses/:seedId, /courses/:seedId/lectures/:seedLecId, /courses/:seedId/assignments/:seedAsgnId, /notifications, /profile, /settings]` × `{light, dark}` × `{ar, en}`, run `AxeBuilder` and assert zero violations of impact `serious` or `critical`.
- [ ] T065 [P] [US5] Audit and tokenize focus indicators in `frontend/src/styles/interactions.css` so every focusable element renders a 3:1-contrast outline against its background in both themes. Use existing tokens; do not introduce new colors.
- [ ] T066 [US5] Add `<dialog>` focus-trap helper in `frontend/src/lib/a11y.ts` and apply to existing modal-like surfaces (`StepUpModal`, login modal if any, mobile drawer).
- [ ] T067 [P] [US5] Audit images and icon-only buttons across `frontend/src/components` — every informational image gets an `alt`; every icon button gets an `aria-label` keyed via `t()`; decorative imagery is `aria-hidden="true"`.
- [ ] T068 [US5] Add `npm run test:a11y` script in `frontend/package.json` (alias for `playwright test tests/e2e/a11y.spec.ts`); add a CI step that runs it.
- [ ] T069 [P] [US5] Manual smoke pass for the four primary flows (login → dashboard → course → assignment submit → grade view) — keyboard-only, then NVDA/VoiceOver — recorded in `specs/011-platform-completeness-uplift/audit/a11y-manual.md`.

**Checkpoint**: a11y CI gate green; manual smoke recorded; SC-004, SC-005 verifiable.

---

## Phase 8: User Story 6 — Dark-mode contrast verification (Priority: P2)

**Goal**: Every text/background pair meets WCAG AA across both themes; no parallel theme system introduced.

**Independent Test**: The Phase 7 axe suite already covers contrast across `{light, dark}`. Story 6 adds an explicit "no flash of incorrect theme" assertion plus a token-level fix list.

- [ ] T070 [P] [US6] Add `frontend/tests/e2e/theme-switch.spec.ts` — switches theme via the existing `<ThemeToggle>`, asserts `[data-theme]` flips on `<html>` without a transition flicker, asserts `prefers-color-scheme` is honored on first load when no explicit choice exists.
- [ ] T071 [US6] For every contrast failure surfaced by the Phase 7 axe suite under dark theme, adjust the affected token in `frontend/src/styles/tokens.css` (do not patch per-component). Re-run axe until clean.
- [ ] T072 [P] [US6] Verify decorative motion in dark theme has no light-theme asset bleeds (visual review noted in `specs/011-platform-completeness-uplift/audit/theme-visual.md`).

**Checkpoint**: Both themes contrast-clean; no flash; SC-010 verifiable.

---

## Phase 9: User Story 7 — English UI + i18n layer (Priority: P3)

**Goal**: Greenfield i18n. Switching to English flips `dir="ltr"` and `lang="en"`, every static string is translated, content stays in its original language.

**Independent Test**: Toggle to English; every visible label, button, nav, error message, and date/number format is English; reload — language persists; switch back to Arabic — full RTL restoration.

- [ ] T073 [US7] Create `frontend/src/i18n/runtime.ts` — initializes i18next with http-backend pointed at `/i18n/<locale>.json`, exposes `useT()`, `setLocale()`, and `<LocaleProvider>`. Number/date helpers use `Intl` keyed off active locale.
- [ ] T074 [P] [US7] Create canonical `frontend/src/i18n/catalog/ar.json` with namespaces `common, nav, auth, dashboard, course, lecture, assignment, notifications, search, profile, settings, errors` populated from existing JSX literals (initial pass).
- [ ] T075 [P] [US7] Create `frontend/src/i18n/catalog/en.json` mirroring every key in `ar.json` with English translations.
- [ ] T076 [US7] Create `frontend/src/components/layout/LocaleSwitcher.tsx` — segmented control in `Topbar` calling `setLocale()` and `PATCH /api/v1/me/locale`.
- [ ] T077 [US7] Implement `PATCH /api/v1/me/locale` in `backend/src/modules/me/routes.ts` per `contracts/locale.md`; write `AuditLog { action: LOCALE_CHANGED }`.
- [ ] T078 [US7] Update `GET /api/v1/me` to return `locale`.
- [ ] T079 [US7] Add inline bootstrap script to `frontend/index.html` resolving locale (URL param → cookie → `navigator.languages` → default `AR`) BEFORE React mounts; sets `<html lang dir>` to avoid flash-of-incorrect-language.
- [ ] T080 [US7] Migrate every literal Arabic / English string in `frontend/src/components/layout/**` (`Topbar`, `Sidebar`, `BottomNav`, `GlobalSearch`, `NotificationDropdown`) through `t()`. Add keys to both catalog files.
- [ ] T081 [P] [US7] Migrate `frontend/src/pages/AuthPage.tsx` literals through `t()` including the new `auth.remember_me` and `auth.step_up.title` keys (pre-seeded in T025 / T029).
- [ ] T082 [P] [US7] Migrate `frontend/src/pages/LandingPage.tsx` literals through `t()`.
- [ ] T083 [P] [US7] Migrate the nine in-scope authenticated pages (dashboard, courses, course detail, lecture player, assignment, notifications, notification-prefs, profile, settings) through `t()`.
- [ ] T084 [US7] Switch `frontend/src/components/layout/NotificationDropdown.tsx` and `frontend/src/pages/student/NotificationsPage.tsx` to prefer `bodyKey + bodyParams` (and `titleKey + titleParams` where applicable) via `t()` when present on the wire shape, falling back to the existing `body` / `title` plain-text fields for legacy rows. Add the corresponding `notifications.<category>.title` and `notifications.<category>.body` entries to `ar.json` (T074) and `en.json` (T075). Server-side emission of the keys is already in place from T060.
- [ ] T085 [P] [US7] Update `frontend/src/lib/numbers.ts` to render Arabic-Indic numerals when locale is `AR` and Western numerals when `EN` via `Intl.NumberFormat`. Update existing call sites that render numbers as plain JS strings.
- [ ] T086 [P] [US7] Add `frontend/tests/e2e/i18n-switch.spec.ts` — toggle to English, assert every visible string is English; assert `<html dir>` and `<html lang>` flipped; reload, assert persistence.
- [ ] T087 [US7] Run `scripts/check-i18n-coverage.sh` and address any remaining violations; gate CI on it.

**Checkpoint**: English UI shipped; SC-006 verifiable.

---

## Phase 10: User Story 8 — Motion polish + interactive Oasis demo + skeleton inventory (Priority: P3)

**Goal**: Landing-page section reveals, count-up stats, hover elevation, page transitions, branded skeletons, and the interactive Oasis demo widget. All respect `prefers-reduced-motion`.

**Independent Test**: With `prefers-reduced-motion: no-preference`, scroll the landing page — sections fade-and-translate in (≤200 ms / ≤20 px / ≤100 ms stagger), counters animate from zero, hover elevates cards, page transitions are coherent. Type into the Oasis demo — autoplay completes, then user input gets a response. Set `prefers-reduced-motion: reduce` — all animation collapses to ≤80 ms transitions or instant.

- [ ] T088 [P] [US8] Apply `useReveal` to each `<section>` in `frontend/src/pages/LandingPage.tsx` with the existing `--t-fast` token and ≤100 ms stagger; respect reduced-motion via existing primitive contract.
- [ ] T089 [P] [US8] Replace plain stat numerals on the landing page with `<CountUp>` (existing primitive) — first-reveal trigger, ≤1.5 s duration.
- [ ] T090 [P] [US8] Add hover elevation tokens to feature cards on the landing page via `frontend/src/styles/landing-pro.css` — uses existing `--shadow-elev-2` token, ≤150 ms transition.
- [ ] T091 [US8] Add page-transition fade in `<AppShell>` for authenticated route changes — ≤250 ms; suppressed under reduced-motion. Mount via React Router `<Outlet>` wrapper.
- [ ] T092 [P] [US8] Create `frontend/src/components/landing/OasisDemo/OasisDemo.tsx` (lazy chunk) — autoplay three pre-programmed exchanges from `OasisDemo/script.ts`, then enable input.
- [ ] T093 [P] [US8] Create `frontend/src/components/landing/OasisDemo/script.ts` — three hand-curated Q&A samples in Arabic (with English mirror). Reviewed for accuracy against actual Madarek capabilities.
- [ ] T094 [US8] Implement `POST /api/v1/public/oasis-demo` in `backend/src/modules/public/oasis-demo.ts` — unauthenticated, IP-rate-limited 3/min, payload ≤200 chars, constrained system prompt, no `AiConversation` write.
- [ ] T095 [US8] Replace static Oasis mockup section on `LandingPage.tsx` with a `<Suspense>` boundary loading `<OasisDemo>`.
- [ ] T096 [P] [US8] Verify `--motion-shimmer` token in `frontend/src/styles/system.css` collapses to a static tinted block under `@media (prefers-reduced-motion: reduce)` — adjust if not.
- [ ] T097 [P] [US8] Add `frontend/tests/e2e/motion-reduced.spec.ts` — emulate `prefers-reduced-motion: reduce`, navigate the landing + dashboard, assert no transition exceeds 80 ms via Playwright performance API.

**Checkpoint**: Visual polish shipped; Oasis demo interactive; reduced-motion respected; SC-011, SC-012 verifiable.

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] T098 [P] Run quickstart manual smoke for every story; record results in `specs/011-platform-completeness-uplift/audit/quickstart-validation.md`.
- [ ] T099 [P] Run k6 load test simulating 2,000 sustained / 5,000 burst per SC-014; capture results at `specs/011-platform-completeness-uplift/audit/load-test.md`.
- [ ] T100 [P] Update `docs/operations/deployment.md` with the Render Standard tier + Cloudflare CDN setup learned in US2.
- [ ] T101 [P] Update `BACKEND.md` and `FRONTEND.md` with the new endpoints (`/notifications/stream`, `/notifications/preferences`, `/me/locale`, `/auth/step-up`, `/search`, `/public/oasis-demo`) and the new components (`StepUpModal`, `Breadcrumbs`, `LocaleSwitcher`, `OasisDemo`, `SkipNavLink`).
- [ ] T102 [P] Update `DATA-MODEL.md` with the schema deltas from `data-model.md`.
- [ ] T103 Final Constitution Check pass — for every PR in this feature, verify the principles touched are listed; remediate any gaps.
- [ ] T104 [P] Performance verification — measure student-dashboard initial bundle gzipped on `npm run build:report`; assert ≤250 KB per constitution principle VI; remediate (lazy-load further) if exceeded.
- [ ] T105 [P] Bundle size verification — assert per-locale catalog stays a separate chunk and the inactive locale is not on the critical path.

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Phase 1 (Setup)** — no dependencies; can start immediately.
2. **Phase 2 (Foundational)** — depends on Phase 1; **blocks every user-story phase**.
3. **Phase 3 (US1)** — depends on Phase 2 (uses `pwd_at` claim, step-up middleware, `User.rememberMeUntil`). P1.
4. **Phase 4 (US2)** — depends on Phase 1 only (skeleton primitive from Phase 2 T021 is helpful but not blocking; T038–T039 can use a temporary spinner if needed). P1.
5. **Phase 5 (US3)** — depends on Phase 2 (search columns + normalizer + extension). P2.
6. **Phase 6 (US4)** — depends on Phase 2 (`NotificationPreference` schema). P2.
7. **Phase 7 (US5)** — depends on Phase 1 (Playwright + axe deps). Best run **after** Phases 3–6 so the suite covers the actual surfaces. P2.
8. **Phase 8 (US6)** — depends on Phase 7 (the axe suite is also the contrast suite). P2.
9. **Phase 9 (US7)** — depends on Phase 1 + 2 (i18n deps + locale schema). Should run **after** Phase 6 because notification i18n keys (T084) compose with US4 work. P3.
10. **Phase 10 (US8)** — depends on Phase 2 (skeleton primitive) and Phase 7 (reduced-motion guarantees should already be honored by tokens). P3.
11. **Phase N (Polish)** — depends on every desired phase being complete.

### User Story Dependencies (story-level)

1. US1 → independent of US2..US8 once Phase 2 is done. Delivers MVP.
2. US2 → independent of all stories. Can ship in parallel with US1.
3. US3 → independent.
4. US4 → independent. Notification i18n keying is split: server-side emission of `titleKey/bodyKey + params` lives in T060 (US4); frontend consumption flips to those keys in T084 (US7). Until US7 lands, the dropdown and notifications page render the existing plain-text `body` — matches the platform's current Arabic-only state and preserves US4's independent-testability promise.
5. US5 → covers surfaces from US1..US4; best ordered after them.
6. US6 → composes with US5's suite.
7. US7 → depends on the shell being stable post-US3.
8. US8 → independent of US7 strictly, but visual polish lands cleanest when shell + a11y are settled.

### Parallel Opportunities

1. **All `[P]` tasks within a phase** can run concurrently.
2. **US1, US2, US3, US4** can be staffed in parallel by different developers once Phase 2 is complete — they touch disjoint files except for `App.tsx` and `AppShell.tsx`, both of which are coordinated through small, additive edits.
3. The catalog work in T074 / T075 / T080–T083 is heavily parallelizable across pages.
4. The branded skeleton inventory in T038 (nine routes) is fully parallelizable — each route's skeleton is its own file.

---

## Parallel Example — User Story 4 (Notifications)

```bash
# Once Phase 2 is done, fan out:
T053 Implement GET/PUT /api/v1/notifications/preferences          (backend/src/modules/notifications/routes.ts)
T054 Implement POST /api/v1/notifications/mark-all-read            (backend/src/modules/notifications/routes.ts)
T056 Update NotificationDropdown.tsx                                (frontend/src/components/layout/)
T057 Create NotificationsPage.tsx                                   (frontend/src/pages/student/)
T058 Create NotificationPreferences.tsx                             (frontend/src/pages/settings/)
T061 Cap badge + paginate                                           (frontend/src/components/layout/)
T062 SSE e2e test                                                   (frontend/tests/e2e/)
```

T050–T052, T055, T059, T060 are sequential within their respective files (the SSE handler depends on the bus; the frontend `useResources.ts` change depends on the SSE endpoint being live).

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 (Setup) + Phase 2 (Foundational) — 1–2 days.
2. Phase 3 (US1) — verify inner-app + step-up UX + remember-me. 2–3 days. Stop and validate.
3. Phase 4 (US2) — Render tier upgrade + Cloudflare + branded splash + per-route skeletons. 1–2 days. **Stop and validate**: this is the MVP.

### Incremental Credibility (US3 → US4 → US5 → US6)

Add P2 stories one at a time, each independently testable. Each PR brings the platform closer to "credible institutional product" without risking regressions in the prior story.

### Polish (US7 → US8)

After P2 stories land:

1. US7 (English i18n) — large refactor across the shell + page literals; gated by `check:i18n` CI.
2. US8 (motion + Oasis demo) — visible polish; shipping last gives it the cleanest substrate.

### Parallel Team Strategy

Three engineers can carry the feature without stepping on each other's toes:

1. Eng A: Phase 2 → US1 → US3 (auth + search axis).
2. Eng B: Phase 1 → US2 → US4 (perf + notifications axis).
3. Eng C: US5 → US6 → US7 → US8 (a11y + i18n + polish axis).

Phase N (polish) is a closing parallel sprint.

---

## Notes

1. `[P]` = different files, no incomplete dependency. Two `[P]` tasks in the same phase can run concurrently.
2. `[Story]` label maps every story task back to the spec's user story for traceability.
3. Each user story is independently completable; stop at any checkpoint to validate.
4. Commit after each task or each tight logical group; PR titles should reference the story (`[US3]` etc.).
5. PR descriptions must list the constitution principles touched (per governance section).
6. Avoid: vague tasks, same-file conflicts (especially `App.tsx`, `AppShell.tsx`, `tokens.css` — coordinate edits), cross-story dependencies that break the independent-testability promise.
