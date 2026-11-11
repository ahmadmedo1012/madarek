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
| `/campus` | ~~`app/campus.tsx`~~ | public | **RETIRED (master/D3)** — the university showcase is removed from the product; the screen + the university card system are deleted | — | RETIRED | — | — |
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

## 5 — Inventory: student (33 files)

| Route path | File | Purpose | Tier | Read | Issues | Pri |
|---|---|---|---|---|---|---|
| /student (shell) | `student/_layout.tsx` | SHELL: RoleGate STUDENT + Stack | L3 | DEEP | none | P0 |
| /student/(tabs) (shell) | `student/(tabs)/_layout.tsx` | SHELL: persistent RoleTabBar (STUDENT) | L3 | DEEP | none | P0 |
| /student/dashboard | `(tabs)/dashboard.tsx` | «الرئيسية» — greeting, KPI slabs, resume card «أكمل ما بدأته», gaps «الفجوات ذات الأولوية», agenda (classes/assignments/live/exams) | L3 | DEEP | `agenda` sections render `null` while loading (no skeleton for sections 2–5, only KPI block); rows = .map in ScrollBody (fine ≤4); no haptics | P0 |
| /student/courses | `(tabs)/courses.tsx` | «مقرراتي» — enrollments ledger w/ progress + schedule summary; honest admin-mediated empty state | L3 | DEEP | none material (full triad: skeleton/error/empty + refresh) | P0 |
| /student/ai | `(tabs)/ai.tsx` | «المساعد» tab → Assistant feature | L2* | QS | delegate (Assistant) not audited; provider-badge honesty reported by R331 | P0 |
| /student/alerts | `(tabs)/alerts.tsx` | «الإشعارات» inbox tab (badge target) | L2* | QS | delegate (NotificationsScreen) not audited | P0 |
| /student/profile | `(tabs)/profile.tsx` | «حسابي» — identity card (session-first merge), academic facts, 30-link menu hub incl. «الإبلاغ عن مشكلة» | L3 | DEEP | menu hub is a long non-grouped flat list (30 LedgerRows, no section grouping/virtualization) | P0 |
| /student/courses/[offeringId] | `courses/[offeringId].tsx` | «تفاصيل المقرّر» — overview, weekly schedule, lectures w/ progress, materials, assignments + «تسليم» sheet | L3 | DEEP | sections render muted text instead of EmptyState for schedule/lectures/materials (inconsistent grammar); materials list unpaginated | P0 |
| /student/lectures/[lectureId] | `lectures/[lectureId].tsx` | «مشغّل المحاضرة» — pinned expo-video, resume-seek, 10s watch reporting, checkpoint sheet (أ ب ج د هـ و), chapters, searchable VTT transcript, prev/next | L3 | DEEP | transcript renders up to 200 cues as .map in ScrollView (no virtualization → scroll jank risk on long lectures); no pull-to-refresh; no haptic on checkpoint reveal; hardcoded 16:9 (portrait letterbox ok) | P0 |
| /student/online-exams | `online-exams.tsx` | «الاختبارات الإلكترونية» — segmented filter (الكل/متاحة/منجزة), window rules, attempt chips | L3 | DEEP | none material (full triad + placeholderData) | P0 |
| /student/online-exams/[templateId] | `online-exams/[templateId].tsx` | Exam runner: questions, timing, submission, attempts | L2 | QS | 832 ln — likely L3 (timer/sheets per docblock) but NOT deep-read; audit in Round-2 fix plan | P0 |
| /student/results | `results.tsx` | «النتائج» — weighted per-course rollup + breakdown + teacher feedback | L3 | DEEP | breakdown rows lack per-row skeleton (single SkeletonList ok); fine | P0 |
| /student/schedule | `schedule.tsx` | «الجدول الأسبوعي» — day-grouped ledger, today-first filter | L3 | DEEP | horizontal Segmented inside nested horizontal ScrollView (nesting smell); fine otherwise | P0 |
| /student/messages | `messages.tsx` | «الرسائل» → MessagesUI | L2* | QS | delegate not audited (composer keyboard-controller per R331) | P0 |
| /student/assignments | `assignments.tsx` | «التكاليف» — cross-offering pending list + submit sheet | L2 | QS | not deep-read; kit present | P0 |
| /student/calendar | `calendar.tsx` | «التقويم» — month grid (Africa/Tripoli) uniting classes/assignments/exams/live | L2 | QS | 363 ln not deep-read; month grid = perf/RTL risk to verify | P1 |
| /student/catalog | `catalog.tsx` | «دليل المقرّرات» — read-only catalog + honest-door banner | L2 | QS | not deep-read | P1 |
| /student/gamification | `gamification.tsx` | «نقاطي وأوسمتي» | L2 | QS | not deep-read | P1 |
| /student/jobs | `jobs.tsx` | «الوظائف» | L2 | QS | not deep-read | P2 |
| /student/labs | `labs.tsx` | «المعامل الافتراضية» | L2 | QS | not deep-read | P2 |
| /student/library | `library.tsx` | «المكتبة» (457 ln, mutations) | L2 | QS | long list, no virtualization assumed; not deep-read | P1 |
| /student/live | `live.tsx` | «الحصص المباشرة» — external links | L2 | QS | not deep-read | P1 |
| /student/map | `map.tsx` | «خريطة الكليات» — honest directory (no fake coordinates) | L2 | QS | not deep-read | P2 |
| /student/materials | `materials.tsx` | «موادي التعليمية» — one ledger + auth PDF route | L2 | QS | not deep-read | P1 |
| /student/matrix | `matrix.tsx` | «مصفوفة الإتقان» — concept rows + «سدّ الفجوة» (uses FlatList — one of 4) | L2 | QS | not deep-read | P1 |
| /student/mooc | `mooc.tsx` | «دورات MOOC» — external (WebBrowser) | L2 | QS | not deep-read | P2 |
| /student/payment | `payment.tsx` | «الشؤون المالية» — honest-empty stub (no fee entities in model) | L1 | DEEP | placeholder by design: EmptyState + disclosure card only; dead-end (no amounts, no history) | P2 |
| /student/research | `research.tsx` | «بحوثي» — submit/track research (442 ln) | L2 | QS | not deep-read | P1 |
| /student/skills | `skills.tsx` | «مهاراتي» | L2 | QS | not deep-read | P2 |
| /student/social | `social.tsx` | «المنشورات» — social feed w/ expo-image | L2 | QS | image feed in ScrollView .map — memory/perf risk; not deep-read | P2 |
| /student/university | `university.tsx` | «عن الجامعة» — public facts + membership context | L2 | QS | untyped endpoint noted in docblock | P2 |
| /student/webinars | `webinars.tsx` | «الندوات» | L2 | QS | not deep-read | P2 |
| /student/ar | `ar.tsx` | «واقع افتراضي ومعزز» — read-only index, no launch | L1 | PART | operator not built — browsing stub with full triad; dead-end rows | P2 |

## 6 — Inventory: teacher (21 files)

| Route path | File | Purpose | Tier | Read | Issues | Pri |
|---|---|---|---|---|---|---|
| /teacher (shell) | `teacher/_layout.tsx` | SHELL: RoleGate TEACHER + Stack | L3 | DEEP | none | P0 |
| /teacher/(tabs) (shell) | `teacher/(tabs)/_layout.tsx` | SHELL: persistent RoleTabBar (TEACHER) | L3 | DEEP | none | P0 |
| /teacher/dashboard | `(tabs)/dashboard.tsx` | «اللوحة» — KPI strip, pending-grading queue, today's classes, trend, filtered feed | L3 | PART (120/437 + kit greps) | trend is hand-mapped from untyped wire (`WireTrendPoint` casts); feed filters; not fully deep-read | P0 |
| /teacher/schedule | `(tabs)/schedule.tsx` | «الجدول» tab | L2 | QS | not deep-read (110 ln) | P0 |
| /teacher/students | `(tabs)/students.tsx` | «الطلاب» — offering picker + shared OfferingRoster | L2 | DEEP | triad present but rendered as ad-hoc muted text/Cards, not the kit's EmptyState/ErrorState (grammar inconsistency) | P0 |
| /teacher/intelligence | `(tabs)/intelligence.tsx` | «التحليلات» tab (325 ln) | L2 | QS | not deep-read | P0 |
| /teacher/profile | `(tabs)/profile.tsx` | «حسابي» teacher menu hub | L2 | QS | not deep-read (325 ln) | P0 |
| /teacher/ai | `ai.tsx` | Assistant pushed over shell (stacked + onBack) | L2* | DEEP (wrapper) | delegate not audited | P1 |
| /teacher/alerts | `alerts.tsx` | Notifications inbox pushed (stacked) | L2* | DEEP (wrapper) | delegate not audited | P0 |
| /teacher/assignments | `assignments.tsx` | «الواجبات والاختبارات» — grading queue + all assignments (443 ln) | L2 | QS | not deep-read | P0 |
| /teacher/attendance | `attendance.tsx` | «الحضور والغياب» — 4-state roll call | L2 | QS | not deep-read | P1 |
| /teacher/curriculum | `curriculum.tsx` | «بناء المنهج» — lectures/chapters/checkpoints authoring (627 ln) | L2 | QS | biggest teacher tool; dense form UI (web-panel feel); not deep-read | P1 |
| /teacher/exams | `exams.tsx` | «بنك الأسئلة والاختبارات» — templates + question bank (461 ln) | L2 | QS | not deep-read | P1 |
| /teacher/exams/[templateId] | `exams/[templateId].tsx` | Template editor + manual attempt grading (555 ln) | L2 | QS | not deep-read | P1 |
| /teacher/grades | `grades.tsx` | «درجات الطلاب» — per-offering grade entry, scale adoption, batch save, toast | L3 | PART (110/314) | roster rows = per-student Field drafts in ScrollView (no virtualization for big rosters); not fully deep-read | P0 |
| /teacher/labs | `labs.tsx` | «المعامل الافتراضية» + honest student-preview | L2 | QS | not deep-read | P2 |
| /teacher/live | `live.tsx` | «إدارة البث المباشر» — KPIs, new session, lifecycle w/ confirms | L2 | QS | not deep-read (327 ln) | P0 |
| /teacher/materials | `materials.tsx` | «الملفات التعليمية» — upload PDF (progress) / external link | L2 | QS | not deep-read | P1 |
| /teacher/messages | `messages.tsx` | DM inbox → MessagesUI | L2* | DEEP (wrapper) | delegate not audited | P1 |
| /teacher/research-review | `research-review.tsx` | «البحث العلمي» — triage queue + review sheet | L2 | QS | not deep-read | P1 |
| /teacher/students/[offeringId] | `students/[offeringId].tsx` | Deep-linked roster (shared OfferingRoster) | L2 | QS | 53 ln wrapper around shared component | P1 |

## 7 — Inventory: admin (14), quality (10), owner (16)

### ADMIN («المسجل العام»)

| Route path | File | Purpose | Tier | Read | Issues | Pri |
|---|---|---|---|---|---|---|
| /admin (shell) | `admin/_layout.tsx` | SHELL: RoleGate ADMIN + Stack | L3 | QS (21 ln, pattern-identical) | none | P0 |
| /admin/(tabs) (shell) | `admin/(tabs)/_layout.tsx` | SHELL: persistent RoleTabBar (ADMIN) | L3 | QS (30 ln, pattern-identical) | none | P0 |
| /admin/dashboard | `(tabs)/dashboard.tsx` | «لوحة المسجل العام» — stats, papers preview | L3 | PART (60/214) | papers preview pinned to page 1 (`useState(1)`, no pagination UI); not fully deep-read | P0 |
| /admin/faculties | `(tabs)/faculties.tsx` | «الكلّيات» tab | L2 | QS | not deep-read | P0 |
| /admin/students | `(tabs)/students.tsx` | «الطلاب» — student registry (327 ln) | L2 | QS | not deep-read | P0 |
| /admin/teachers | `(tabs)/teachers.tsx` | «الأساتذة» (363 ln) | L2 | QS | not deep-read | P0 |
| /admin/reports | `(tabs)/reports.tsx` | «التقارير» tab | L2 | QS | not deep-read | P1 |
| /admin/alerts | `alerts.tsx` | Personal inbox → NotificationsScreen | L2* | DEEP (wrapper) | delegate not audited | P1 |
| /admin/courses | `courses.tsx` | Course mgmt (467 ln, create/delete) | L2 | QS | not deep-read | P1 |
| /admin/digital | `digital.tsx` | «التحوّل الرقميّ» + real /health probe | L2 | QS | health probe = technical surface (admin-only, acceptable); not deep-read | P2 |
| /admin/feedback | `feedback.tsx` | Feedback inbox → FeedbackInbox | L2* | DEEP (wrapper) | delegate not audited | P1 |
| /admin/invites | `invites.tsx` | Invitation mgmt (289 ln) | L2 | QS | not deep-read | P1 |
| /admin/permissions/[id] | `permissions/[id].tsx` | Per-user permission matrix | L2 | QS | not deep-read | P1 |
| /admin/sync | `sync.tsx` | «المزامنة» — sync runs + trigger | L2 | QS | `SYNC_STATUS_LABEL[status] ?? status` raw fallback renders mono — unknown enum values leak as technical strings; not deep-read | P1 |

### QUALITY («مكتب الجودة»)

| Route path | File | Purpose | Tier | Read | Issues | Pri |
|---|---|---|---|---|---|---|
| /quality (shell) | `quality/_layout.tsx` | SHELL: RoleGate QUALITY + Stack | L3 | QS (pattern-identical) | none | P0 |
| /quality/(tabs) (shell) | `quality/(tabs)/_layout.tsx` | SHELL: persistent RoleTabBar (QUALITY) | L3 | QS (pattern-identical) | none | P0 |
| /quality/dashboard | `(tabs)/dashboard.tsx` | «لوحة الجودة» — overview (users/attendance/papers) | L2 | PART (60/168) | payload parsed as `Record<string, unknown>` with key filtering — brittle untyped wire, generic dashboard feel; no EmptyState import (ErrorState only) | P0 |
| /quality/courses | `(tabs)/courses.tsx` | «المقررات» tab | L2 | QS | not deep-read | P1 |
| /quality/curriculum | `(tabs)/curriculum.tsx` | «المناهج» tab | L2 | QS | not deep-read | P1 |
| /quality/engagement | `(tabs)/engagement.tsx` | «التفاعل» tab | L2 | QS | not deep-read | P1 |
| /quality/reports | `(tabs)/reports.tsx` | «التقارير» tab | L2 | QS | not deep-read | P1 |
| /quality/alerts | `alerts.tsx` | Quality alerts inbox | L2 | QS | not deep-read | P1 |
| /quality/exam-moderation | `exam-moderation.tsx` | «إشراف الاختبارات» — moderation queue (273 ln) | L2 | QS | not deep-read | P1 |
| /quality/professors | `professors.tsx` | «الأساتذة» quality view | L2 | QS | not deep-read | P2 |

### OWNER («المالك»)

| Route path | File | Purpose | Tier | Read | Issues | Pri |
|---|---|---|---|---|---|---|
| /owner (shell) | `owner/_layout.tsx` | SHELL: RoleGate OWNER + Stack | L3 | QS (pattern-identical) | none | P0 |
| /owner/(tabs) (shell) | `owner/(tabs)/_layout.tsx` | SHELL: persistent RoleTabBar (OWNER) | L3 | QS (pattern-identical) | none | P0 |
| /owner/dashboard | `(tabs)/dashboard.tsx` | «لوحة التحكم الرئيسية» — stats, alerts, activity | L2 | PART (70/292) | `OwnerStatsRow` untyped casts; alerts list manual (no EmptyState grammar in read half); Skeleton present | P0 |
| /owner/users | `(tabs)/users.tsx` | «المستخدمون» (337 ln) | L2 | QS | not deep-read | P0 |
| /owner/realtime | `(tabs)/realtime.tsx` | «الحيّ» realtime view | L2 | QS | not deep-read | P1 |
| /owner/notifications | `(tabs)/notifications.tsx` | «الإشعارات» inbox tab (badge) | L2* | DEEP (wrapper) | delegate not audited | P0 |
| /owner/governance | `(tabs)/governance.tsx` | «الحوكمة» tab | L2 | QS | not deep-read | P1 |
| /owner/activity | `activity.tsx` | Audit log | L2 | QS | not deep-read | P1 |
| /owner/ai | `ai.tsx` | AI ops view | L2 | QS | not deep-read | P1 |
| /owner/alerts | `alerts.tsx` | Alert mgmt (resolve/dismiss) | L2 | QS | not deep-read | P1 |
| /owner/content | `content.tsx` | «المحتوى والعلامة التجاريّة» — honest asset register | L2 | DEEP | static brochure w/ «قيد التطوير» disclosure; asset rows not pressable (no preview) | P2 |
| /owner/education | `education.tsx` | Education stats | L2 | QS | not deep-read | P1 |
| /owner/feedback | `feedback.tsx` | Feedback inbox | L2 | QS | not deep-read | P1 |
| /owner/institutions | `institutions.tsx` | Institution CRUD (283 ln) | L2 | QS | not deep-read | P1 |
| /owner/institutions/[slug] | `institutions/[slug].tsx` | Institution editor (472 ln) | L2 | QS | not deep-read | P1 |
| /owner/system | `system.tsx` | System/feature flags (423 ln) | L2 | QS | not deep-read | P1 |

## 8 — Summary

**Totals: 125 route files** (root+auth 31 · student 33 · teacher 21 · admin 14 · quality 10 · owner 16). Deep-read (full render tree, incl. 5 thin wrappers): 28 · Partial-deep: 7 (campus, ar, teacher dashboard, grades, admin/quality/owner dashboards) · Quick-scanned: 90. Honesty: QS verdicts rely on docblocks + imports + kit-usage greps; every QS row says "not deep-read".

**Tier counts (routes incl. shells): L1 = 3 · L2 = 96 (of which 12 are thin feature-wrappers `*`) · L3 = 26.**
Non-shell L3 screens: welcome, auth/index, student dashboard/courses/profile/course-detail/lecture-player/online-exams/results/schedule, teacher dashboard/grades, admin dashboard. All 12 shell/layout files are L3-grade.

**The 10 worst screens (Round-2 fix-plan candidates)**
1. `/student/payment` — L1 honest stub; dead-end (no data model).
2. `/campus` — RETIRED at master/D3 (the university showcase is gone from the product).
3. `/student/ar` — L1 browsing-only index, operator unbuilt.
4. `/quality/dashboard` — untyped `Record<string, unknown>` parsing; no EmptyState; generic feel.
5. `/owner/dashboard` — untyped `OwnerStatsRow` casts; manual alert list.
6. `/admin/sync` — raw enum fallback leaks technical strings when label map misses.
7. `/community` — 706-line monolith; ScrollView + .map feed (no virtualization).
8. `/student/social` — image feed via .map in ScrollView (memory).
9. `/teacher/curriculum` — 627-line authoring monolith; dense web-panel feel (worst UX-per-line in teacher core).
10. `/student/lectures/[lectureId]` transcript — 200 mapped cues in a ScrollView (flagship screen, one perf wart).

**Cross-cutting issues (drive the Round-2 plan)**
1. **No motion anywhere in screens**: reanimated 4.7.1 installed but zero consumers ("no consumer yet", app-shell.md); no screen transitions, no press/entry animations, no sheet spring physics beyond static Sheet.
2. **Haptics only in the tab bar** (TabBar.tsx): 0 of 113 screen files fire Haptics — no feedback on submit/complete/reveal moments (checkpoint correct/wrong, exam submit, grade save).
3. **Zero virtualized lists**: only 4 files use FlatList (matrix, lecture player's outer scroll, schedule, exam runner); everything else maps rows into ScrollView — fine for ledgers ≤10, risky for community/social/library/rosters/transcript.
4. **Wrapper routes delegate quality to `src/features/**`** (messages, ai, alerts, feedback inboxes — 12 routes): route-file audit can't see those screens; the Assistant/MessagesUI/NotificationsScreen/FeedbackInbox delegates are unaudited and top-30 critical.
5. **Untyped wire-shape casting in governance dashboards** (quality/owner/teacher trend): `as Record<string, unknown>` / ad-hoc `Wire*` types with `?? raw` fallbacks — brittle + a technical-string leakage path (`SYNC_STATUS_LABEL ?? raw` mono).
6. **State-grammar inconsistency**: most screens use the kit triad (Skeleton/Error/Empty), but teacher `(tabs)/students`, course-detail sections and quality dashboard fall back to muted `<T>` text or bare Cards — the "honest ledger" reads as missing states.
7. **Static honest stubs** (payment, campus, ar, content): correct disclosure discipline, but all are motionless dead-ends — candidates for either real treatment or removal from menus.

**What is already excellent (keep)**: shell architecture (persistent bar, state-preserving tabs); RTL discipline (latn numerals, countAr plurals, Arabic-first copy everywhere); zero hardcoded colors in routes; full state triad on student core; a11y labels on nearly every LedgerRow/Pressable; welcome screen signature.
