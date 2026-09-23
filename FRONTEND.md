# Frontend — routing, state, data, CSS & components

React 18.3 + Vite 5.4 + TypeScript, React Router 6, TanStack Query 5, Zustand 5.
No CSS framework — a fully custom CSS design‑token system. Arabic‑RTL throughout.

---

## 1. Tech stack

| Package | Version | Purpose |
|---------|---------|---------|
| react / react-dom | 18.3.1 | UI |
| react-router-dom | 6.28 | Routing |
| @tanstack/react-query | 5.62 | Server state / fetching |
| zustand | 5.0 | Client state |
| axios | 1.7 | HTTP client (401‑refresh interceptor) |
| chart.js + react-chartjs-2 | 4.4 / 5.2 | Charts |
| react-hook-form + zod | 7.54 / 3.23 | Forms + validation |
| lucide-react | 0.469 | SVG icons |
| pdfjs-dist | 4.10 | PDF rendering (lazy chunk) |
| vite | 5.4 | Build/dev |

---

## 2. Routing (`src/App.tsx`)

- `/` → `HomeRedirect` (LandingPage for guests; role‑home redirect for authed).
- `/auth` → `AuthPage`.
- All authenticated routes are wrapped in `<AppShell />` and guarded by
  `ProtectedRoute allow={[...roles]}`.
- Catch‑all `*` → `HomeRedirect`.

Role guards: STUDENT, TEACHER, ADMIN, QUALITY (also allows ADMIN), OWNER, plus
shared authenticated routes (`/vision`, `/vision/:slug`, `/document/:filename`).
Full page inventory in §6.

---

## 3. State management (Zustand)

| Store | File | Persisted | Purpose |
|-------|------|-----------|---------|
| `useAuthStore` | `stores/auth.store.ts` | `mdrk-auth` | user, accessToken, hydration flag |
| `useThemeStore` | `stores/theme.store.ts` | `madarek-theme` | `'light'│'dark'│'system'` + cycle |
| `useUiStore` | `stores/ui.store.ts` | no | sidebar open/close |

---

## 4. Data layer

- **`lib/api.ts`** — axios at `baseURL '/api/v1'`, `withCredentials`. Request
  interceptor attaches `Bearer`; response interceptor silently refreshes on
  `401 TOKEN_EXPIRED` and retries once. `unwrap<T>()` peels the `{ data }` envelope.
- **`lib/queryClient.ts`** — `staleTime 30s`, `gcTime 5m`, `retry 1`,
  `refetchOnWindowFocus false`; mutations `retry 0`.
- **`hooks/useAuth.ts`** — `useLogin`, `useRegister`, `useMe`, `useLogout`.
- **`hooks/useResources.ts`** (~900 lines) — domain hooks: enrollments, courses,
  offerings/lectures, library, MOOCs, jobs, notifications (60 s poll), community,
  labs/AR, faculties, admin, AI, research, training/gamification, teacher
  intelligence, permissions.
- **`hooks/useOwner.ts`** — owner panel hooks (realtime 10 s poll, settings, flags…).
- **Utility hooks:** `useReveal` (IntersectionObserver scroll reveal),
  `useHideOnScroll` (mobile bottom‑nav hide on scroll down).

---

## 5. CSS architecture (load order in `src/main.tsx`)

12 custom CSS files, ~500 KB, no Tailwind. Order matters — later files win.

| # | File | Purpose |
|---|------|---------|
| 1 | `tokens.css` | Design tokens: colors (M3 palette), 8px spacing, radii, type scale, motion, layout vars, shadows; dark/light via `[data-theme]` |
| 2 | `motion.css` | Motion + interaction foundation: reduced-motion overrides, universal `:focus-visible` ring, reveal keyframes, skeleton shimmer, route-transition keyframes |
| 3 | `base.css` | Reset, shell layout (sidebar/main/content), scrollbars, RTL |
| 4 | `components.css` | Largest layer: cards, buttons, badges, metrics, tables, forms, modals, tabs, nav, sidebar, topbar |
| 5 | `layout.css` | Layout & navigation chrome (Notion-flavored sidebar workspace, topbar, bottom nav) |
| 6 | `landing.css` | Landing page: sticky mega-nav, hero, full-bleed sections, bento |
| 7 | `auth.css` | Auth page (single centered column, large fields) |
| 8 | `notifications.css` | Notification dropdown + panel |
| 9 | `pdf.css` | PDF viewer chrome (self-contained, theme-aware via CSS vars) |
| 10 | `owner.css` | Owner control panel |
| 11 | `colleges.css` | Colleges index/detail pages; per-college identity via `data-college="<slug>"` |
| 12 | `polish.css` | Polish bundle — micro-interaction layer, loaded LAST; later blocks intentionally tune earlier ones |

## 6. Design system & theming (`tokens.css`)

- **Colors:** Material‑3‑inspired + brand navy `#003461`, gold; semantic
  success/warning/danger/info with `-soft` variants. Amber accent for emphasis.
- **Spacing:** 8 px grid (`--sp-1`…`--sp-16`). **Radii:** `--r-xs`…`--r-full`.
- **Type:** `--fs-xxs`…`--fs-4xl` + fluid display sizes; the font stack is the
  IBM Plex family throughout — `--font-sans` / `--font-display`
  (IBM Plex Sans Arabic), `--font-serif` (IBM Plex Serif),
  `--font-mono` (IBM Plex Mono).
- **Motion:** `--t-fast`…`--t-cinema` + easing curves.
- **Layout:** `--sidebar-w 264px`, `--topbar-h 64px`, `--content-max-w 1320px`.
- **Theming:** `[data-theme="dark"|"light"]` on `<html>`. Default resolves via
  the no‑flash bootstrap script in `index.html` + `useThemeSync()`.
  Dark surfaces `#0f1117/#161922/#1e222e`; light `#eef1f6/#ffffff/#f5f7fa`.
- **Charts:** `lib/chartTheme.ts` resolves CSS vars to real values for canvas;
  `cartesianOptions()`, `radialOptions()`, `valueLabels` plugin, calm 750 ms easing.

---

## 7. Shared components

**Layout (`components/layout/`):** `AppShell` (sidebar + topbar + scroll content +
bottom‑nav; `ProtectedRoute` guard), `Sidebar` (role‑aware nav from `lib/nav.ts`),
`Topbar` (title, faculty scope badge, GlobalSearch, AI button, notifications, user
menu), `BottomNav` (mobile 5‑item, hide‑on‑scroll), `GlobalSearch`,
`NotificationDropdown`, `ThemeToggle` + `useThemeSync`.

**Primitives (`components/primitives/`):** `Card`, `MetricCard`, `Badge`,
`ProgressBar`, `AlertRow`, `UserAvatar`, `Pill`, `SectionTitle`, `Tabs`
(`index.tsx`); `States.tsx` — `LoadingState`, `EmptyState`, `ErrorState` and a
full skeleton family.

**Other:** `Icon` (Lucide wrapper), `BrandMark`, `EmojiIcon`, `CountUp`
(animated KPI counter), `pdf/PdfViewer` + `pdf/AnnotationsPanel`,
`owner/ConfirmDialog`, `owner/ToggleSwitch`.

**Lib:** `lib/nav.ts` (`NAV_BY_ROLE`, `ROLE_LABELS`), `lib/chartTheme.ts`,
`lib/vision.ts`, `lib/numbers.ts`.

---

## 8. Page inventory by role

**Public (2):** `LandingPage`, `AuthPage`.

**Student (~33 routes):** dashboard, courses, course detail, lecture player,
matrix, library, research, profile, exams, labs, AR/VR, AI assistant, webinars,
live, payment, MOOC, jobs, campus map, schedule, results, gamification, skills,
alerts, downloads, university info, social, training (catalog/track/lesson),
achievements, online‑exams (+ taker), community. Files: `pages/student/*` with
multi‑page bundles `MorePages.tsx` and `TrainingPages.tsx`.

**Teacher (19):** dashboard, schedule, attendance, grades, materials, research
review, students list, performance, assignments, messages, AI, library, alerts,
intelligence (+ offering detail), profile, live, labs, community.
Files: `pages/teacher/*` (`TeacherPages.tsx` bundle + dedicated pages).

**Admin (13):** dashboard, students (placeholder), teachers, permissions, sync,
faculties, courses, analysis/digital/settings (placeholders), reports, alerts,
community. Files: `pages/admin/*`.

**Quality (9, also ADMIN):** dashboard, courses, professors, engagement,
curriculum, reports, alerts, exam‑moderation, community. Files:
`pages/quality/QualityPages.tsx` + `pages/exams/OnlineExamsPages.tsx`.

**Owner (10):** dashboard, users, activity, content, system, education, realtime,
AI, alerts, governance. Files: `pages/owner/*`.

**Shared authenticated:** `vision/VisionPages.tsx` (gallery + detail),
`DocumentViewerPage.tsx`.
