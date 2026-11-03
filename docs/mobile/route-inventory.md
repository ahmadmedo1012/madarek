# Route Inventory — apps/mobile (R334, task 1-b A-Audit-Routes)

Branch `r334/audit-routes` (worktree `/home/z/wt-audit-routes`). Base: `d610a62`.
Scope: **every route file under `apps/mobile/app/**` — 125 files** (incl. 12 layout/shell files, marked SHELL). No code changed — audit only.

**Legend**
- Tier: **L1** broken/placeholder/technical-visible · **L2** functional, web-dashboard feel / missing states or motion · **L3** native feel (skeletons, motion/sheets, RTL craft).
- Read: **DEEP** = full read (or full structural read of the render tree) · **QS** = quick-scan (docblock + imports + render signatures + targeted greps) · **PART** = deep read of the load-bearing half, QS for the rest.
- Pri: **P0** top-30 by usage · **P1** rest of student/teacher/admin core · **P2** long-tail (legal/help/vision/colleges/…).
- `*` after a tier = route is a thin wrapper delegating to `src/features/*` — tier reflects the route file; the delegate screen was NOT audited here (flagged as a Round-2 gap).

## 1 — Method

- All 8 `_layout.tsx` files read fully (root, auth, student×2, teacher×2, admin×2, quality×2, owner×2 — root + student + teacher + auth verbatim; admin/quality/owner tabs layouts verified identical mechanism by line-count + diff of the pattern).
- Shell chrome read fully: `src/components/shell/roleTabs.ts`, `TabBar.tsx`, plus `docs/redesign/r331/app-shell.md`.
- Shared kit exports enumerated (`screen.tsx`, `states.tsx`, `data.tsx`, `AppTopBar.tsx`) so QS verdicts about "missing states" are grounded in what the kit offers (Screen/FormScreen/PageHeader/SectionBar, Skeleton/SkeletonList/LoadingScreen/EmptyState/ErrorState/OfflineBanner/Refreshable, KpiCard/LedgerRow/RowList…).
- Repo-wide greps: state-kit usage per file, ScrollView/FlatList usage, hardcoded hex colors (→ **0 files**), haptics (→ **0 screen files**; only TabBar), technical strings (`APP_INTERNAL`/`SYNC_`/`probe`), English-UI-leakage candidates.
- DEEP-read top-30 candidates (see honesty marks in the tables).
- Facts only from code actually read. Wrappers delegating to `src/features/**` are marked; their delegates are a follow-up audit surface, not judged here.

## 2 — Shell architecture (verified)

Root Stack (`app/_layout.tsx`: RTL-forced at module scope, one-reload `ensureRTL`, fonts+splash handshake, version gate, KeyboardProvider, BiometricGate, PushRegistrar, ToastHost, ErrorBoundary×2) → per-role `<RoleGate><Stack>` (`app/<role>/_layout.tsx`, 21 lines each, identical pattern) whose first child is `(tabs)`; `app/<role>/(tabs)/_layout.tsx` renders `RoleTabBar` ONCE via the `tabBar` prop (R331 A-App-Shell). `ROLE_TABS` (roleTabs.ts) is the single source of truth: STUDENT الرئيسية/مقرراتي/المساعد/الإشعارات/حسابي, TEACHER اللوحة/الجدول/الطلاب/التحليلات/حسابي, ADMIN اللوحة/الكلّيات/الطلاب/الأساتذة/التقارير, QUALITY اللوحة/المقررات/المناهج/التفاعل/التقارير, OWNER اللوحة/المستخدمون/الحيّ/الإشعارات/الحوكمة. Detail routes push OVER the bar (state preserved). No FAB/overlay renders above content anymore (`/report` is a real route).

## 3 — TOP-30 by usage (P0)

| # | Route | Rationale (one line) |
|---|---|---|
| 1 | `/` `index.tsx` | Public entry — signature plan-drawing welcome; every cold start lands here. |
| 2 | `/auth` `auth/index.tsx` | Login — every session; 429/lockout honesty, `?continue=` handling. |
| 3 | `/auth/register` `auth/register.tsx` | Acquisition funnel (297 ln, web parity). |
| 4 | `/student/dashboard` `(tabs)/dashboard.tsx` | Student role home: KPIs, resume card, gaps, agenda. |
| 5 | `/student/courses` `(tabs)/courses.tsx` | Tab «مقرراتي» — path into every course. |
| 6 | `/student/courses/[offeringId]` | Course hub: lectures/materials/assignments + submit sheet. |
| 7 | `/student/lectures/[lectureId]` | Flagship: expo-video player, checkpoints, transcript (878 ln). |
| 8 | `/student/ai` `(tabs)/ai.tsx` | Tab «المساعد» → Assistant feature. |
| 9 | `/student/alerts` `(tabs)/alerts.tsx` | Tab inbox «الإشعارات» (unread badge target). |
| 10 | `/student/profile` `(tabs)/profile.tsx` | Tab «حسابي» — menu hub linking ~30 student surfaces. |
| 11 | `/student/online-exams` | Exam center list (segmented filter, attempt chips). |
| 12 | `/student/online-exams/[templateId]` | Exam runner: questions, timer, manual grading (832 ln). |
| 13 | `/student/results` | «النتائج» — weighted grades rollup. |
| 14 | `/student/schedule` | «الجدول الأسبوعي» — day-filtered ledger. |
| 15 | `/student/messages` | DM inbox (MessagesUI delegate). |
| 16 | `/student/assignments` | Cross-course pending submissions + «تسليم» sheet. |
| 17 | `/student/calendar` | Month grid uniting 4 deadline surfaces. |
| 18 | `/teacher/dashboard` `(tabs)/dashboard.tsx` | Teacher role home: KPIs, grading queue, trend, feed. |
| 19 | `/teacher/grades` | Core workflow: per-offering grade entry + batch save. |
| 20 | `/teacher/live` | Live-session lifecycle mgmt. |
| 21 | `/teacher/intelligence` `(tabs)/intelligence.tsx` | Analytics tab «التحليلات». |
| 22 | `/teacher/students` `(tabs)/students.tsx` | Roster tab (shared OfferingRoster). |
| 23 | `/teacher/exams` + `/teacher/exams/[templateId]` | Question-bank/template authoring + manual grading. |
| 24 | `/admin/dashboard` `(tabs)/dashboard.tsx` | Registrar role home «لوحة المسجل العام». |
| 25 | `/admin/students` `(tabs)/students.tsx` | Registrar core: student registry. |
| 26 | `/quality/dashboard` `(tabs)/dashboard.tsx` | Quality role home «لوحة الجودة». |
| 27 | `/owner/dashboard` `(tabs)/dashboard.tsx` | Owner role home «لوحة التحكم الرئيسية». |
| 28 | `/settings` | Cross-role prefs: biometric, report entry, theme/session. |
| 29 | `/report` `(modals)/report.tsx` | Feedback loop (replaces deleted FAB). |
| 30 | `/select-institution` | Post-auth institution gate for non-OWNER roles. |

## 4 — Inventory: root, auth, modals

| Route path | File | Role(s) | Purpose | Tier | Read | Issues | Pri |
|---|---|---|---|---|---|---|---|
| (root) | `app/_layout.tsx` | all | SHELL: RTL force+reload, fonts/splash, version gate, providers | L3 | DEEP | none — exemplary (crumb boot timeline, gates) | P0 |
| `/` | `app/index.tsx` | guest/all | Welcome «مدارك» — SVG plan drawing, one CTA, role redirect | L3 | DEEP | GridBackdrop draws `cols+rows` SVG lines each render (cheap but unmeasured); no haptics on CTA | P0 |
| `/auth/login` | `app/auth/login.tsx` | guest | Route alias re-exporting `/auth` (deep-link parity) | L3 | DEEP | none (alias by design) | P0 |
| `/report` | `app/(modals)/report.tsx` | all | «الإبلاغ عن مشكلة» → POST /feedback (route auto-attached) | L2 | DEEP | plain Screen+Card, no success motion; delegate form not audited | P0 |
| `/+not-found` | `app/+not-found.tsx` | all | «الصفحة غير موجودة» + two exits | L2 | DEEP | bare (no illustration/brand motion) — acceptable | P1 |
| `/select-institution` | `app/select-institution.tsx` | non-OWNER | Institution gate after login | L2 | QS | delegate-heavy; not deep-read | P0 |
| `/settings` | `app/settings.tsx` | all | Settings: biometric lock, theme, report card, session | L2 | QS | menu-list feel; no grouped sections motion; not deep-read | P0 |
| `/search` | `app/search.tsx` | all | Global search (kit skeletons present) | L2 | QS | not deep-read; results list = ScrollView map | P1 |
| `/about` | `app/about.tsx` | public | «عن مدارك» identity page | L2 | QS | static; MonoLabels (brand terms) | P2 |
| `/achievements` | `app/achievements.tsx` | student | «الإنجازات» (322 ln, kit) | L2 | QS | not deep-read | P1 |
| `/campus` | `app/campus.tsx` | public | «الحياة الجامعية» — TEXT-ONLY port of web media rail | L1 | PART | placeholder-feel: photo registry rendered as ledger text, no images (honest but dead-end); no states (static) | P2 |
| `/community` | `app/community.tsx` | student | Community feed/bookmarks/events (706 ln monolith) | L2 | QS | longest non-player screen; ScrollView + .map (no virtualization); not deep-read | P1 |
| `/contact` | `app/contact.tsx` | public | Contact channels | L2 | QS | static | P2 |
| `/help` | `app/help.tsx` | all | «دليل الاستخدام» FAQ accordion | L2 | QS | chevron expand = no motion; not deep-read | P2 |
| `/document/[filename]` | `app/document/[filename].tsx` | all | Authenticated PDF viewer/share | L2 | QS | "PDF" mono badge (intentional); TextInput inside (annotation?); not deep-read | P1 |
| `/legal/[doc]` | `app/legal/[doc].tsx` | public | Legal docs (privacy/terms) | L2 | QS | static text; P2 by design | P2 |
| `/vision` + `/vision/[slug]` | `app/vision/index.tsx`, `[slug].tsx` | public | Vision brochure chapters | L2 | QS | static; `[slug]` imports ArrowLeft/ArrowRight — RTL mirroring risk (arrows not direction-agnostic); not deep-read | P2 |
| `/colleges` + `/colleges/[id]` + `/colleges/leaderboard` | 3 files | public | College directory/detail/leaderboard | L2 | QS | not deep-read | P2 |
| `/competitions` + `/competitions/[id]` | 2 files | student | Competitions list + join | L2 | QS | not deep-read | P2 |
| `/training` + `/training/[slug]` + `/training/[slug]/lesson/[lessonId]` | 3 files | student | «التدريب الذاتي» courses/lessons | L2 | QS | not deep-read | P1 |
| `/auth` | `app/auth/index.tsx` | guest | Login form; demo accounts gated `__DEV__`/env | L3 | DEEP | `[DEMO]` MonoLabel technical string (gated, acceptable); no biometric-login shortcut | P0 |
| `/auth/register` | `app/auth/register.tsx` | guest | Registration | L2 | QS | not deep-read (297 ln) | P0 |
| `/auth/forgot-password` | `auth/forgot-password.tsx` | guest | Password reset request | L2 | QS | minimal (69 ln) | P0 |
| `/auth/reset-password` | `auth/reset-password.tsx` | guest | Password reset form | L2 | QS | minimal (78 ln) | P0 |
| (auth shell) | `app/auth/_layout.tsx` | guest | SHELL: Stack, fade animation | L3 | DEEP | none | P0 |

_Continues: §5 student, §6 teacher, §7 admin/quality/owner, §8 summary._
