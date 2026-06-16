# Madarek — Frontend Reference

**Stack:** React 18.3 + Vite 5.4 + TypeScript 5.7
**Routing:** React Router 6.28
**Server State:** TanStack Query 5.62
**Client State:** Zustand 5.0 (persisted to localStorage)
**HTTP:** Axios 1.7 (401-refresh interceptor)
**Charts:** Chart.js 4.4 + react-chartjs-2 5.2
**CSS:** Custom design-token system (12 CSS files, no framework)

---

## State Management (Zustand)

| Store | Persisted Key | Purpose |
|-------|---------------|---------|
| `useAuthStore` | `mdrk-auth` | user, accessToken, hydration flag |
| `useThemeStore` | `madarek-theme` | 'light'|'dark'|'system' + cycle |
| `useUiStore` | `mdrk-ui` | sidebar collapsed/expanded state |

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
- `HydrationSplash` shown until store rehydrates from localStorage

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
- Response interceptor: on 401 `TOKEN_EXPIRED` → calls `/auth/refresh` → retries once → clears auth on failure
- `unwrap<T>(promise)`: extracts `{ data: T }` envelope

### TanStack Query (`lib/queryClient.ts`)
- `staleTime`: 30s
- `gcTime`: 5min
- `retry`: 1 (queries), 0 (mutations)
- `refetchOnWindowFocus`: false

### Hooks
- `useAuth.ts` — login, register, me, logout
- `useResources.ts` (~900 lines) — all domain hooks: enrollments, courses, offerings/lectures, library, MOOCs, jobs, notifications (60s poll), community, labs/AR, faculties, admin, AI, research, training/gamification, teacher intelligence, permissions
- `useOwner.ts` — owner panel (realtime 10s poll, settings, flags)
- `useReveal.ts` — IntersectionObserver scroll reveal
- `useHideOnScroll.ts` — mobile bottom-nav hide on scroll down
- `useThemeProfileSync.ts` — 012 feature: two-way theme sync
- `useOnboardingState.ts` — 012 feature: onboarding flow state
- `useMilestone.ts` — 012 feature: milestone tracking
- `useRoleAccent.ts` — 012 feature: role-based accent tinting

---

## Routing (`src/App.tsx`)

### Route Structure
- `/` → HomeRedirect (LandingPage for guests, role dashboard for authenticated)
- `/auth` → AuthPage
- `/auth/register` → RegisterPage
- All authenticated routes wrapped in `<ProtectedRoute allow={roles}>` + `<AppShell>`

### Role Route Groups

**Public (2):** LandingPage, AuthPage, RegisterPage

**STUDENT (~33 routes):**
/student/dashboard, /student/courses, /student/courses/:offeringId, /student/lectures/:lectureId, /student/schedule, /student/results, /student/library, /student/mooc, /student/jobs, /student/ai, /student/gamification, /student/skills, /student/alerts, /student/labs, /student/ar, /student/social, /student/downloads, /student/university, /student/live, /student/payment, /student/map, /student/matrix, /student/research, /student/profile, /student/webinars, /student/exams, /student/online-exams, /student/online-exams/:id, /training, /training/:slug, /training/:slug/lesson/:lessonId, /achievements, /community

**TEACHER (19 routes):**
/teacher/dashboard, /teacher/schedule, /teacher/attendance, /teacher/grades, /teacher/materials, /teacher/research, /teacher/students, /teacher/performance, /teacher/assignments, /teacher/messages, /teacher/ai, /teacher/library, /teacher/alerts, /teacher/intelligence, /teacher/intelligence/:offeringId, /teacher/profile, /teacher/live, /teacher/labs, /teacher/community

**ADMIN (13 routes):**
/admin/dashboard, /admin/students, /admin/teachers, /admin/permissions/:id, /admin/sync, /admin/faculties, /admin/courses, /admin/analysis, /admin/digital, /admin/reports, /admin/settings, /admin/alerts, /admin/community

**QUALITY (9 routes, also ADMIN):**
/quality/dashboard, /quality/courses, /quality/professors, /quality/engagement, /quality/curriculum, /quality/reports, /quality/alerts, /quality/exam-moderation, /quality/community

**OWNER (10 routes):**
/owner/dashboard, /owner/users, /owner/activity, /owner/content, /owner/system, /owner/education, /owner/realtime, /owner/ai, /owner/alerts, /owner/governance

**Shared Authenticated:**
/vision, /vision/:slug, /document/:filename, /colleges, /colleges/leaderboard, /colleges/:id, /competitions, /competitions/:id

---

## Components

### Layout (`components/layout/`)

| Component | Description |
|-----------|-------------|
| `AppShell` | Shell: Sidebar + Topbar + scrollable content + BottomNav. Mounts theme sync, role accent, layout metrics, card pointer glow, onboarding |
| `Sidebar` | Role-aware navigation (from `lib/nav.ts`), responsive drawer |
| `Topbar` | Title, GlobalSearch, AI button, notifications dropdown, user menu, ThemeToggle |
| `BottomNav` | Mobile 5-item nav, hide-on-scroll-down |
| `GlobalSearch` | Search overlay (calls `/search/global`) |
| `NotificationDropdown` | Bell icon + badge with 60s polling |
| `ThemeToggle` | Sun/Moon icon button + `useThemeSync` effect to set `[data-theme]` on `<html>` |
| `ProtectedRoute` | Auth guard + role gate |

### Primitives (`components/primitives/`)
- `Card`, `MetricCard`, `Badge`, `ProgressBar`, `AlertRow`, `UserAvatar`, `Pill`, `SectionTitle`, `Tabs`
- `States.tsx`: `LoadingState`, `EmptyState`, `ErrorState`, and skeleton family
- `Form.tsx`: Form input components with react-hook-form integration
- `index.tsx`: Exports all primitives

### Motion (`components/motion/`)
| Component | Description |
|-----------|-------------|
| `PageTransition` | Route transition animation wrapper |
| `Reveal` | Scroll-triggered reveal (IntersectionObserver) |
| `AnimatedNumber` | Animated counter with easing |
| `Parallax` | Subtle scroll parallax (≤8px) |
| `SectionAccent` | Section-level decorative accent |
| `Skeleton` | Loading skeleton primitives |
| `useReducedMotion` | `prefers-reduced-motion` hook |
| `useSectionAccent` | Hook for section accent color |
| `index.ts` | Exports all motion components |

### Overlays (`components/overlays/`)
| Component | Description |
|-----------|-------------|
| `Modal` | Generic modal with backdrop |
| `Sheet` | Slide-in panel (mobile drawer) |
| `Popover` | Positioned popover |
| `Dropdown` | Dropdown menu |
| `Tooltip` | Hover tooltip |
| `Toast` | Toast notification |
| `Lightbox` | Image lightbox |
| `CommandPalette` | ⌘K-style command palette |
| `NotificationPanel` | Notification side panel |
| `index.ts` | Exports all overlay components |

### Other Components
| Component | Purpose |
|-----------|---------|
| `pdf/PdfViewer` | Full PDF viewer (page nav, zoom, search, highlight, fullscreen, RTL) |
| `pdf/AnnotationsPanel` | Paper annotation side panel |
| `Illustration` | SVG illustration wrapper (reads CSS vars for theming) |
| `BrandMark` | Madarek logo/brand mark |
| `Icon` | Lucide icon wrapper |
| `EmojiIcon` | Emoji-as-icon component |
| `CollegesPopover` | College selection popover (homepage) |
| `CountUp` | Animated KPI counter |
| `LibyaFlag` | Libya flag SVG |
| `owner/ConfirmDialog` | Confirmation dialog |
| `owner/ToggleSwitch` | Toggle switch |
| `HydrationSplash` | Loading screen during auth rehydration |

### Onboarding (012 Feature)
| Component | Description |
|-----------|-------------|
| `OnboardingFlow` | 4-frame onboarding modal (3 frames + role intro) |
| `MilestoneScene` | Milestone celebration overlay |

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

12 files, loaded in order in `main.tsx`:

| # | File | Size | Purpose |
|---|------|------|---------|
| 1 | `tokens.css` | 30KB | Design tokens: M3 palette, 8px grid, radii, type scale, motion vars, shadows, `[data-theme]` colors |
| 2 | `motion.css` | 12KB | Motion tokens, keyframes, reduced motion |
| 3 | `base.css` | 9KB | Reset, shell layout, scrollbars, RTL |
| 4 | `components.css` | 65KB | Cards, buttons, badges, metrics, tables, forms, modals, tabs, sidebar, topbar |
| 5 | `layout.css` | 18KB | Layout grid, flex, spacing helpers |
| 6 | `landing.css` | 45KB | Landing page sections |
| 7 | `auth.css` | 11KB | Auth page |
| 8 | `notifications.css` | 10KB | Notification dropdown |
| 9 | `pdf.css` | 9KB | PDF viewer |
| 10 | `owner.css` | 16KB | Owner panel |
| 11 | `colleges.css` | 39KB | College pages |
| 12 | `polish.css` | 227KB | Micro-interactions, elevation, polish layer |

### Design Tokens (`tokens.css`)
- Colors: M3-inspired + brand navy `#003461`, gold
- Spacing: `--sp-1` (8px) to `--sp-16` (128px)
- Radii: `--r-xs` (4px) to `--r-full` (9999px)
- Type: `--fs-xxs` to `--fs-4xl` + fluid display sizes
- Fonts: `--font-sans` (IBM Plex Sans Arabic), `--font-display` (Lexend/Outfit), `--font-mono` (Space Mono)
- Theming: `[data-theme="dark"]` / `[data-theme="light"]` on `<html>`

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

- Resolves CSS vars to canvas-real values
- `cartesianOptions()`, `radialOptions()` — chart config factories
- `valueLabels` plugin — custom data labels
- Calm 750ms easing on transitions
- Dark-tuned palette when `data-theme="dark"`
