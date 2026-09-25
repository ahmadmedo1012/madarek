# Madarek — Frontend Reference

**Stack:** React 18.3.1 + Vite 5.4.11 + TypeScript 5.7.2 (strict)
**Routing:** React Router DOM 6.30.6
**Server State:** TanStack Query 5.62.7
**Client State:** Zustand 5.0.2
**HTTP:** Axios 1.20.0 (401-refresh interceptor, single-flight)
**Charts:** Chart.js 4.4.7 + react-chartjs-2 5.2.0
**Forms/Validation:** react-hook-form 7.54.2 + Zod 3.23.8
**Icons:** lucide-react 0.469 (Lucide-only discipline)
**PDF:** pdfjs-dist 4.10 (lazy-loaded chunk)
**CSS:** vanilla design-token system — 15 files, `@layer tokens, base, layout, components, pages, overrides;` (no framework)

---

## Entry & Code Splitting (`src/main.tsx`, `src/App.tsx`)

- Every route component is `React.lazy(...)` — one chunk per lazy boundary.
- `AppShell` + `ProtectedRoute` are lazy too (one chunk): the public funnel (landing / auth / colleges / 404) never loads the authed shell graph (useResources + axios + shell chrome, ~35% of the old entry bundle).
- Root `<Suspense fallback={<PageSkeleton/>}>` covers the shell chunk; `AppShell` keeps its own inner boundary so page-chunk loads swap a page-shaped skeleton inside the persistent chrome (sidebar/topbar state survives navigation).
- `main.tsx` imports 10 eager stylesheets; 5 more are page-scoped (see CSS Architecture).
- Dev-only: `@axe-core/react` surfaces a11y violations in the console (zero prod cost).

## State Management (Zustand)

| Store | Persisted Key | Storage | Purpose |
|-------|---------------|---------|---------|
| `useAuthStore` | `mdrk-auth` | localStorage via a crash-proof wrapper (SecurityError → in-memory fallback; corrupted payload = defaults; blocked writes best-effort) | user, accessToken, hydration flag |
| `useThemeStore` | `madarek-theme` | localStorage | 'light'\|'dark'\|'system' + cycle |
| `useUiStore` | `mdrk-ui` | localStorage | sidebar collapsed/expanded state |
| `useOnboardingStore` | — | none (in-memory, per tab) | onboarding flow state; server persistence stays in `useOnboardingState` |

### useAuthStore
```typescript
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isHydrated: boolean;
  setSession(user, accessToken): void;
  setAccessToken(token): void;
  clear(): void;
}
```
- `AuthUser`: id, email, firstName, lastName, role (STUDENT|TEACHER|ADMIN|QUALITY|OWNER), avatarColor, avatarInitials, scopeFacultyId
- Token architecture (D4): short-TTL access token in storage, long-lived refresh token in an httpOnly cookie (never JS-readable) — documented XSS tradeoff in the store header
- `HydrationSplash` shown until the store rehydrates

### useThemeStore
```typescript
interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  modeUpdatedAt: number; // tiebreak for profile sync
  setMode(mode): void;
  _hydrateFromProfile(mode, serverTs): void;
  cycle(): void; // light → dark → system
}
```
`resolveTheme(mode)`: resolves 'system' to actual theme via `prefers-color-scheme`

---

## Data Layer

### API Client (`lib/api.ts`)
- `baseURL`: `/api/v1` (or `VITE_API_BASE_URL`)
- `withCredentials: true` (refresh cookie)
- Request interceptor: attaches Bearer token from auth store
- Response interceptor: on 401 `TOKEN_EXPIRED` → single-flight `/auth/refresh` (concurrent 401s share one refresh) → retries once (`__retried` guard) → on refresh failure clears the auth store AND the TanStack cache (no cross-account cache leaks)
- `unwrap<T>(promise)`: extracts `{ data: T }` envelope

### TanStack Query (`lib/queryClient.ts`)
- `staleTime`: 30s · `gcTime`: 5min · `refetchOnWindowFocus`: false
- `retry`: `shouldRetryQuery` — single retry budget, and only for plausibly-transient failures (HTTP 5xx or network-level errors). **4xx responses never retry** (the server's final word surfaces immediately). Mutations: `retry: 0`.

### Hooks (`src/hooks/`)
- `useAuth.ts` — login, register, me, logout (each session transition clears the query cache)
- `useResources.ts` (**2,160 lines**) — all domain hooks: enrollments, courses, offerings/lectures, library, MOOCs, jobs, notifications (unread badge polls 60s), messages, community, labs/AR, faculties, admin, AI, research, training/gamification, teacher intelligence, permissions. Exports the D5 exam-start contract as a **tagged discriminated union** (`StartExamResponse` with `type: 'fresh' | 'resumed' | 'alreadyAttempted'` — the backend sends no tag; the pure `tagStartExamResponse()` attaches it client-side and `useStartExam` tags every response)
- `useOwner.ts` — owner panel (realtime snapshot polls 15s, settings, flags, education, login analytics)
- `useReveal.ts` — `RevealCssClass` scroll-reveal class wrapper (NOT the `components/motion/Reveal` primitive)
- `useHideOnScroll.ts` — mobile bottom-nav hide on scroll down
- `useUrlQueryState.ts` — URL-synced filter state (colleges gallery)
- `useThemeProfileSync.ts` — 012 feature: two-way theme sync via `PUT /me/theme`
- `useOnboardingState.ts` — 012 feature: onboarding flow state
- `useMilestone.ts` — 012 feature: milestone tracking
- `useRoleAccent.ts` — 012 feature: role-based accent tinting

### Other `lib/` modules
- `api.ts` / `queryClient.ts` — data platform (above)
- `overlayStack.ts` — open-overlay registry: topmost layer owns Escape; consumers guard global chords (⌘K/" in GlobalSearch) via `overlayStack.isEmpty()`
- `scrollLock.ts` — ref-counted body scroll lock (one class, keyed holders — Sidebar drawer + every overlay compose instead of clobbering)
- `format.ts` — Arabic formatting helpers: `countAr`, `arUnit` (counted nouns — the only sanctioned plural forms), `formatRelativeAr`, `formatRelativeArShort`, `timeAgoAr`, `formatDateAr`, `formatDateWithYearAr`, `formatDateTimeAr`, `formatMmSs`, `WEEKDAY_NAMES_AR`, plus the **Arabic-first error surface**: `isArabicText` (detector), `apiErrorCode` (machine code chip), `apiErrorDetail` (Arabic-guarded — Latin/transport leaks fall back to the caller's Arabic fallback), `apiErrorDetailRaw` (opt-in raw passthrough for string-matching mappers), `apiErrorMessage`
- `utils/numbers.ts` — `toWestern`, `formatNum` / `formatDate` / `formatTime` — the unified numeral surface on **`ar-LY`** (Latin digits, dot grouping, comma decimal: `1.234.567,5`; negatives carry ICU's leading LRM). `tests/unit/numbers.test.ts` pins the format and its byte-equivalence with the `toLocaleString('ar-LY')` call sites so the two spellings can't drift
- `gamification.ts` — tier/rarity label + color maps (API gamification palette)
- `courseMeta.ts` — course card tint/icon maps + `ASSIGNMENT_KIND_LABEL`
- `nav.ts` — role navigation trees (below)
- `chartTheme.ts` — chart palette/factories (below)
- `theme.ts`, `toast.ts` (zustand toast store), `vision.ts` (vision gallery data), `illustrations/` (scene registry)

**Numeral & copy policy (campaign 3, binding):** Latin digits everywhere (never ٠-٩), `%` never ٪, all quantities via `formatNum`/`ar-LY`, counted nouns only through `countAr`/`arUnit`. Glossary rulings (مقرّر / كلّيّة / اختبار — never مادة-as-course or امتحان; the shadda register) live in `docs/PROJECT-REFERENCE.md` § Copy Style.

---

## Routing (`src/App.tsx`)

### Route Structure
- `/` → HomeRedirect (LandingPage for guests, role dashboard for authenticated; HydrationSplash while hydrating)
- `/auth` → AuthPage (`/login` is a legacy alias redirect)
- `/auth/register` → RegisterPage
- All authenticated routes wrapped in lazy `<ProtectedRoute allow={roles}>` + `<AppShell>`
- Unknown URLs render the designed 404 page (no soft-404 redirect)

### Role Route Groups
**STUDENT (33 routes):** /student/dashboard, /student/courses, /student/courses/:offeringId, /student/lectures/:lectureId, /student/schedule, /student/results, /student/library, /student/mooc, /student/jobs, /student/ai, /student/gamification, /student/skills, /student/alerts, /student/labs, /student/ar, /student/social, /student/downloads, /student/university, /student/live, /student/payment, /student/map, /student/matrix, /student/research, /student/profile, /student/webinars, /student/exams, /student/online-exams, /student/online-exams/:id, /training, /training/:slug, /training/:slug/lesson/:lessonId, /achievements, /community

**TEACHER (19 routes):** /teacher/dashboard, /teacher/schedule, /teacher/attendance, /teacher/grades, /teacher/materials, /teacher/research, /teacher/students, /teacher/performance, /teacher/assignments, /teacher/messages, /teacher/ai, /teacher/library, /teacher/alerts, /teacher/intelligence, /teacher/intelligence/:offeringId, /teacher/profile, /teacher/live, /teacher/labs, /teacher/community

**ADMIN (13 routes):** /admin/dashboard, /admin/students, /admin/teachers, /admin/permissions/:id, /admin/sync, /admin/faculties, /admin/courses, /admin/analysis, /admin/digital, /admin/reports, /admin/settings, /admin/alerts, /admin/community

**QUALITY (9 routes, also ADMIN):** /quality/dashboard, /quality/courses, /quality/professors, /quality/engagement, /quality/curriculum, /quality/reports, /quality/alerts, /quality/exam-moderation, /quality/community

**OWNER (10 routes):** /owner/dashboard, /owner/users, /owner/activity, /owner/content, /owner/system, /owner/education, /owner/realtime, /owner/ai, /owner/alerts, /owner/governance

**Shared Authenticated (any role):** /vision, /vision/:slug, /document/:filename, /competitions, /competitions/:id

**Public (world-readable):** /colleges, /colleges/leaderboard, /colleges/:id — signed-in visitors get the full shell; guests get the same content in a chrome-less container (CollegesLayout)

---

## Components

### Layout (`components/layout/`)
| Component | Description |
|-----------|-------------|
| `AppShell` | Shell: Sidebar + Topbar + scrollable content + BottomNav. Lazy chunk. Mounts theme sync, theme transition guard, role accent, card pointer glow, onboarding state, scroll restoration; keeps an inner Suspense page skeleton |
| `Sidebar` | Role-aware navigation (from `lib/nav.ts`), responsive drawer (ref-counted scroll lock) |
| `Topbar` | Title, GlobalSearch, AI button, notifications dropdown, user menu, ThemeToggle. `useMyProfile` fires only for the STUDENT scope chip |
| `BottomNav` | Mobile 5-item nav, hide-on-scroll-down |
| `GlobalSearch` | Search combobox (calls `/search/global` via TanStack Query on a debounced key — superseded keystrokes abort; ARIA combobox/listbox wiring with per-option ids); ⌘K + "/" shortcuts guard against open overlays |
| `NotificationDropdown` | Bell + unread badge (60s poll); the 50-item list query fires on first open, not every shell mount; mark-all is a single bulk `POST /notifications/read-all` |
| `ThemeToggle` | Sun/Moon icon button + `useThemeSync` effect to set `[data-theme]` on `<html>` |
| `ProtectedRoute` | Auth guard + role gate (travels in the AppShell chunk) |

### Primitives (`components/primitives/`)
- `Card`, `MetricCard`, `Badge`, `ProgressBar`, `AlertRow`, `UserAvatar`, `Pill`, `SectionTitle`, `Tabs` (segmented filter control)
- `States.tsx`: `LoadingState`, `EmptyState`, `ErrorState` (403 has no retry by design; 404 honors it) + skeleton family incl. `PageSkeleton`
- `Form.tsx`: `Button` (loading keeps its real accessible name), `Input` etc. with react-hook-form integration
- `index.tsx`: Exports all primitives

### Motion (`components/motion/`)
| Component | Description |
|-----------|-------------|
| `PageTransition` | Route transition animation wrapper |
| `Reveal` | Scroll-triggered reveal (IntersectionObserver) — the platform primitive |
| `Skeleton` | Loading skeleton primitives |
| `Parallax` | Subtle scroll parallax (≤8px) |
| `SectionAccent` | Section-level decorative accent |
| `useReducedMotion` | `prefers-reduced-motion` hook (single source for chart option memoization) |
| `useSectionAccent` | Hook for section accent color |
| `index.ts` | Exports all motion components |

The animated KPI counter is `components/CountUp.tsx` (`CountUp`) — there is no `AnimatedNumber` component.

### Overlays (`components/overlays/`)
Unified platform: every overlay registers in `lib/overlayStack` (topmost layer owns Escape, `stopImmediatePropagation`), uses the ref-counted `lib/scrollLock`, and syncs `aria-expanded`/`aria-haspopup` on its trigger unless the consumer owns those attributes.

| Component | Description |
|-----------|-------------|
| `Modal` | Focus-trapped modal (topmost-only Escape; scroll-lock composing) |
| `Sheet` | Slide-in panel (mobile drawer) |
| `Popover` | Positioned popover (anchored, rAF-throttled repositioning) |
| `Dropdown` | Dropdown menu (Escape restores trigger focus) |
| `Tooltip` | Passive (outside the stack); merges its id into the trigger's `aria-describedby` |
| `Toast` | Toast notification (aria-live; auto-dismiss timer survives parent re-renders) |
| `Lightbox` | Image lightbox |
| `CommandPalette` | ⌘K-style command palette (designated home of global search) |
| `NotificationPanel` | Notification side panel |
| `index.ts` | Exports all overlay components |

### Other Components
| Component | Purpose |
|-----------|---------|
| `pdf/PdfViewer` | Full PDF viewer (page nav, zoom, race-guarded search, highlight, fullscreen, RTL) — generation-guarded search, render-task cleanup, password-protected-PDF state |
| `pdf/AnnotationsPanel` | Paper annotation side panel (inline retryable error states) |
| `Illustration` | SVG illustration wrapper (reads CSS vars for theming; discriminated decorative/alt props) |
| `BrandMark` | Madarek logo/brand mark |
| `Icon` | Lucide icon wrapper — **decorative by default** (`aria-hidden="true"` unless the call site opts out with `aria-hidden={false}` + `aria-label`) |
| `EmojiIcon` | Data-driven emoji→Lucide bridge (API `iconEmoji` strings only — never chrome) |
| `CollegesPopover` | College selection popover (homepage) |
| `CountUp` | Animated KPI counter |
| `LibyaFlag` | Libya flag SVG |
| `curriculum/*` | Curriculum authoring panel + chapter/lecture/checkpoint builders (dirty-state discard guards) |
| `charts/ChartFrame` | Themed chart frame + sr-only data table |
| `owner/ConfirmDialog`, `owner/ToggleSwitch` | Owner-console controls |
| `HydrationSplash` | Loading screen during auth rehydration |

### Onboarding (012 Feature)
| Component | Description |
|-----------|-------------|
| `OnboardingFlow` | 4-frame onboarding modal (3 frames + role intro) |
| `MilestoneScene` | Milestone celebration overlay (queue-behind-onboarding; exit animation) |

---

## Navigation (`lib/nav.ts`)

Role-based navigation groups defined per role:
- `STUDENT_NAV`: 4 groups (الرئيسية, التعلم الذكي, التطوير والمجتمع, حسابي والخدمات)
- `TEACHER_NAV`: 3 groups (لوحة التدريس, البحث والمحاضرة, حسابي)
- `ADMIN_NAV`: 2 groups (الإدارة, النظام)
- `QUALITY_NAV`: 2 groups (مركز ضمان الجودة, المراجعة والتقارير)
- `OWNER_NAV`: 3 groups (لوحة المالك, المنصة, المراقبة والتحليل)

---

## CSS Architecture

**15 files in `src/styles/`.** 10 eager (imported in `main.tsx`, in order) + 5 page-scoped (imported by their lazy page modules):

| # | File | Size | Loaded | Purpose |
|---|------|------|--------|---------|
| 1 | `fonts.css` | 10KB | eager | Self-hosted @font-face rules (must precede token consumers) |
| 2 | `tokens.css` | 41KB | eager | Design tokens: warm cream/copper palette, spacing, radii, type roles, motion vars, shadows, `[data-theme]` colors (WCAG math documented inline) |
| 3 | `motion.css` | 19KB | eager | Motion tokens, keyframes, reduced-motion safety belt |
| 4 | `base.css` | 13KB | eager | Reset, shell layout, scrollbars, RTL |
| 5 | `components.css` | 153KB | eager | Cards, buttons, badges, metrics, tables, forms, modals, tabs, sidebar, topbar |
| 6 | `layout.css` | 22KB | eager | Layout grid, flex, spacing helpers |
| 7 | `auth.css` | 26KB | eager | Auth page (cross-page borrows → global) |
| 8 | `notifications.css` | 14KB | eager | Notification dropdown/panel |
| 9 | `student.css` | 69KB | eager | Student pages (cross-page borrows → global) |
| 10 | `polish.css` | 270KB | eager | Micro-interactions, elevation, polish layer |
| 11 | `landing.css` | 57KB | LandingPage chunk | Landing page sections |
| 12 | `colleges.css` | 47KB | 6 lazy consumers | College pages + competitions/admin/community borrowers |
| 13 | `pdf.css` | 17KB | DocumentViewerPage chunk | PDF viewer |
| 14 | `owner.css` | 37KB | OwnerPages chunk (+3 borrowers) | Owner panel |
| 15 | `training.css` | 29KB | 12 lazy consumers | Track/leaderboard/XP families (shared across many pages) |

All stylesheets write inside the cascade layers declared by `tokens.css` (`@layer tokens, base, layout, components, pages, overrides`).

### Design Tokens (`tokens.css`)
- **Palette:** warm cream ground (`--bg #FBFAF9` light / ink `#191918` dark), copper accent `--accent #B57438` (dark theme brightens to `#E0A067`), 9 pastel section families (peach/mint/lavender/sky/yellow/rose/sand/grey/copper) each with `-bg`/`-ink`/`-deep` variants (text-on-pastel uses `-deep`, WCAG-pinned)
- Spacing: `--sp-*` 4px scale; Radii: `--r-xs` (4px) … `--r-full`; Elevation: 5-level `--elev-1..5` + `--shadow-card/pop/modal`
- Type: **role tokens** `--type-display-*`, `--type-headline-*`, `--type-body-*`, `--type-label-*`, `--type-metric-*` pin size+weight+line-height+tracking (consume roles, not raw `--fs-*`)
- Fonts: `--font-sans` / `--font-display` = **IBM Plex Sans Arabic**, `--font-serif` = **IBM Plex Serif** (italic accent voice), `--font-mono` = **IBM Plex Mono** (numerals/code). Self-hosted woff2, arabic+latin subsets. There is no Lexend/Outfit/Space Mono.
- Theming: `[data-theme="dark"|"light"]` on `<html>` + `data-role="<role>"` on `<body>` + runtime-gated `--college-accent`
- Motion: durations `--t-micro..--t-cinema` + semantic `--motion-duration-*`, easings `--ease-*`/`--motion-ease-*`, stagger `--motion-stagger-step/cap`, RTL direction multiplier `--motion-direction`
- Interaction states: `--state-*` (focus ring, button/card/input/tab)

---

## Illustration System (012 Feature)

Registry at `lib/illustrations/index.tsx`. V1 ships 9 scenes:

| Scene Name | Component | Surface |
|-----------|-----------|---------|
| `homepage-hero` | SceneHomepageHero | Landing hero |
| `error-404` | SceneError404 | 404 page |
| `empty-notifs` | SceneEmptyNotifs | Empty notifications |
| `empty-search` | SceneEmptySearch | Empty search |
| `milestone-section` | SceneMilestoneSection | Milestone celebration |
| `onboarding-frame-1` | SceneOnboardingFrame1 | Onboarding step 1 |
| `onboarding-frame-2` | SceneOnboardingFrame2 | Onboarding step 2 |
| `onboarding-frame-3` | SceneOnboardingFrame3 | Onboarding step 3 |
| `onboarding-role-intro` | SceneOnboardingRoleIntro | Role introduction |

Scenes read CSS variables (`--ill-hue-1..6`, `--ill-stroke`, `--ill-paper`, `--ill-shadow`) for theme adaptation.

---

## Chart Theme (`lib/chartTheme.ts`)

- Resolves CSS vars to canvas-real values; `chartColors()`/`cartesianOptions()`/`radialOptions()` factories
- Dark-tuned palette when `data-theme="dark"`; charts remount via `key={themeKey}`
- Owner chart pages memoize data/options props (deps include `themeKey` + `reducedMotion`) so realtime poll ticks don't relayout the canvases
- `ChartFrame` wraps every chart with an sr-only data table

---

### Exam authoring & manual grading (campaign 3 wave 18)
- `pages/teacher/ExamAuthorPages.tsx` (~2,300 lines): hub `/teacher/exams` (my templates · question bank · EXAMS_MODERATE tab) + detail `/teacher/exams/:templateId` (questions, answer key when served, publish gate, «التصحيح» attempts table + GradeAttemptModal with per-answer verdicts + feedback). Hooks: useExamTemplate, useCreateQuestion, useCreateExamTemplate, usePublishExamTemplate, useModerateQuestion, useTemplateAttempts, useGradeAttempt (useResources.ts exam section). Zero new CSS — 100% existing primitives.

## Testing (Vitest — 766 tests, jsdom, DB-free)

`tests/unit/` (59 files) + `tests/motion/` (4) + `tests/gallery/` (2); the Playwright audit harness under `tests/audit/` is excluded from Vitest and runs via `npm run test:audit`. Waves 16–17 added nine new suites (behavior + contract pins for the surfaces those waves hardened):

| New file (wave 16) | Pins |
|---|---|
| `numbers.test.ts` | `formatNum` ar-LY format (`1.234.567,5`, LRM negatives) + `toLocaleString('ar-LY')` equivalence |
| `useResources-contracts.test.tsx` | `tagStartExamResponse` union shapes, `useGradeSubmission` invalidation keys |
| `Icon.test.tsx` | Icon decorative default + `aria-hidden={false}`/label opt-out |
| `Sidebar-Topbar.test.tsx` | Drawer overlay-stack registration, Esc/Ctrl+B chord guards, burger aria-expanded |
| `GlobalSearch.test.tsx` | Combobox ARIA contract, SR announcements, hung-GET never sticks loading |
| `AdminGovernancePages.test.tsx` | Server-side teachers roster contract, `pageList` pagination (twin-guard vs OwnerUsersPage) |
| `TeacherPages.test.tsx` | Roll-call/EXCUSED toggle, grade-modal discard guard, messages pagination |
| `CommunityPages.test.tsx` | RSVP trio (GOING/MAYBE/NO), OFFERING announcement scope, discard guards, deadline chip |
| `ResearchReviewPage.test.tsx` | Review-modal discard guard, canonical relative-time rendering |

Playwright exists only as the `audit` project (`npm run test:audit`); there is no e2e suite in the repo.
