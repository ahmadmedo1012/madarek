# R319 ROUTES — the complete route × role inventory

Agent E (ROUTES) · Task c1-E · crawled at head `5466b5c` (R318 C2).
Sources of truth, read completely:

- `frontend/src/App.tsx` — the route table (115 `<Route>` rows: 113 single-line + the two multi-line rows `/campus`, `/capabilities`)
- `frontend/src/components/layout/AppShell.tsx` — `ProtectedRoute` (guard semantics + cross-role deny toast)
- `frontend/src/lib/nav.ts` — `NAV_BY_ROLE` (sidebar groups/labels per role), `ROLE_HOME`
- `backend/prisma/seed.ts` — realistic capture targets for every `:param` route
- `frontend/src/components/layout/BottomNav.tsx` — the ≤920px mobile dock mirror (5 destinations per role)

Guard semantics (verified in source):

- `ProtectedRoute` without `allow` → ANY authenticated role (all five).
- `ProtectedRoute allow=[...]` → listed roles only; a signed-out visitor bounces to `/auth` (with `state.from`); a wrong-role visitor gets ONE info toast («هذه الصفحة غير متاحة لدور حسابك — أُعيدك إلى لوحتك») + `replace` Navigate to `ROLE_HOME[role]`.
- `GuestRoute` → guest-ONLY (authed users bounce to their role home; no loops).
- `CollegesLayout` → world-readable: guests get a chrome-less container (with skip link + back-to-home), signed-in visitors get the full AppShell.
- `/campus` + `/capabilities` → chrome-less for EVERYONE, signed-in included (marketing sheets; guest Lenis engine stays the scroller for all) — the one deliberate difference from the `/colleges` pattern.

---

## 1 · Inventory — grouped by role section

Columns: **path** · **page component (file)** · **access** · **shell** (AppShell y/n) · **nav group** (from nav.ts; the role whose sidebar carries it) · **status**.

### 1.0 PUBLIC (guest surfaces + landing)

| # | path | page component (file) | access | shell | nav group | status |
|---|------|------------------------|--------|-------|-----------|--------|
| P1 | `/` | LandingPage (`pages/LandingPage.tsx`) via `HomeRedirect` | PUBLIC (guest) / REDIRECT→`ROLE_HOME[role]` (authed) | no | — | LIVE (dual) |
| P2 | `/auth` | AuthPage (`pages/AuthPage.tsx`) | GUEST-ONLY | no | — | LIVE |
| P3 | `/auth/register` | RegisterPage (`pages/RegisterPage.tsx`) | GUEST-ONLY | no | — | LIVE |
| P4 | `/login` | — | PUBLIC (legacy alias) | no | — | REDIRECT→`/auth` |
| P5 | `/campus` | CampusLifePage (`pages/campus/CampusPages.tsx`) | PUBLIC (chrome-less for everyone) | no | — | LIVE |
| P6 | `/capabilities` | CapabilitiesPage (`pages/capabilities/CapabilityPages.tsx`) | PUBLIC (chrome-less for everyone) | no | — | LIVE |
| P7 | `/404` | NotFoundPage (`pages/NotFoundPage.tsx`) | PUBLIC | no | — | LIVE |
| P8 | `*` (catch-all) | NotFoundPage (`pages/NotFoundPage.tsx`) | PUBLIC | no | — | LIVE (404) |

### 1.1 COLLEGES — public, dual chrome (audit 4-A14 P1-2, r154a)

| # | path | page component (file) | access | shell | nav group | status |
|---|------|------------------------|--------|-------|-----------|--------|
| C1 | `/colleges` | CollegesIndexPage (`pages/colleges/CollegePages.tsx`) | PUBLIC (guest: chrome-less) / ANY-AUTHED (AppShell) | guest: no · authed: yes | «المجتمع والفرص» STUDENT · «حسابي» TEACHER · «الإدارة» ADMIN · «المراجعة والتقارير» QUALITY · «المنصة» OWNER | LIVE |
| C2 | `/colleges/leaderboard` | CollegesLeaderboardPage (`pages/colleges/CollegePages.tsx`) | PUBLIC (guest: chrome-less) / ANY-AUTHED | guest: no · authed: yes | — (deliberately out of every sidebar, A4 P2-1; CTA from `/colleges`) | LIVE |
| C3 | `/colleges/:id` | CollegeDetailPage (`pages/colleges/CollegePages.tsx`) | PUBLIC (guest: chrome-less) / ANY-AUTHED | guest: no · authed: yes | — (detail; linked from `/colleges`, campus map, university info) | LIVE |

### 1.2 STUDENT — the biggest tree (ProtectedRoute allow=[STUDENT] + AppShell; 41 rows in the student-guard block + the widened `/student/labs` mount shown in place — 42 rows)

| # | path | page component (file) | access | shell | nav group | status |
|---|------|------------------------|--------|-------|-----------|--------|
| S1 | `/student/dashboard` | StudentDashboardPage (`pages/student/DashboardPage.tsx`) | STUDENT | yes | الرئيسية | LIVE |
| S2 | `/student/schedule` | SchedulePage (`pages/student/MorePages.tsx`) | STUDENT | yes | الرئيسية | LIVE |
| S3 | `/student/calendar` | StudentCalendarPage (`pages/student/CalendarPage.tsx`) | STUDENT | yes | الرئيسية | LIVE |
| S4 | `/student/courses` | StudentCoursesPage (`pages/student/CoursesPage.tsx`) | STUDENT | yes | الرئيسية | LIVE |
| S5 | `/student/catalog` | CatalogPage (`pages/student/CatalogPage.tsx`) | STUDENT | yes | الرئيسية | LIVE |
| S6 | `/student/results` | ResultsPage (`pages/student/MorePages.tsx`) | STUDENT | yes | الرئيسية | LIVE |
| S7 | `/student/matrix` | MatrixPage (`pages/student/MatrixPage.tsx`) | STUDENT | yes | التعلم الذكي | LIVE |
| S8 | `/student/online-exams` | OnlineExamsPage (`pages/exams/OnlineExamsPages.tsx`) | STUDENT | yes | التعلم الذكي | LIVE |
| S9 | `/student/library` | LibraryPage (`pages/student/LibraryPage.tsx`) | STUDENT | yes | التعلم الذكي | LIVE |
| S10 | `/student/research` | StudentResearchPage (`pages/student/ResearchPage.tsx`) | STUDENT | yes | التعلم الذكي | LIVE |
| S11 | `/student/ai` | AiAssistantPage (`pages/student/AiAssistantPage.tsx`) | STUDENT | yes | التعلم الذكي (badge AI) | LIVE |
| S12 | `/student/labs` | LabsPage (`pages/student/LabsPage.tsx`) | **STUDENT + TEACHER** (widened mount, A6 P1 wave 22-a — the single intentional widening of a /student/* path) | yes | المعامل والتقنيات STUDENT · البحث والمحاضرة TEACHER | LIVE |
| S13 | `/student/ar` | ArVrPage (`pages/student/MorePages.tsx`) | STUDENT | yes | المعامل والتقنيات (collapsed) | LIVE |
| S14 | `/student/live` | LivePage (`pages/student/LivePage.tsx`) | STUDENT | yes | المعامل والتقنيات (collapsed) | LIVE |
| S15 | `/training` | TrainingCatalogPage (`pages/student/TrainingPages.tsx`) | STUDENT (top-level path, student guard) | yes | التطوير والتقدّم (collapsed) | LIVE |
| S16 | `/training/:slug` | TrainingTrackPage (`pages/student/TrainingPages.tsx`) | STUDENT | yes | — (detail) | LIVE |
| S17 | `/training/:slug/lesson/:lessonId` | TrainingLessonPage (`pages/student/TrainingPages.tsx`) | STUDENT | yes | — (detail) | LIVE |
| S18 | `/achievements` | AchievementsPage (`pages/student/TrainingPages.tsx`) | STUDENT (top-level path, student guard) | yes | التطوير والتقدّم (collapsed) | LIVE |
| S19 | `/student/gamification` | GamificationPage (`pages/student/MorePages.tsx`) | STUDENT | yes | التطوير والتقدّم (collapsed) | LIVE |
| S20 | `/student/skills` | SkillsPage (`pages/student/MorePages.tsx`) | STUDENT | yes | التطوير والتقدّم (collapsed) | LIVE |
| S21 | `/student/mooc` | MoocPage (`pages/student/MoocPage.tsx`) | STUDENT | yes | التطوير والتقدّم (collapsed) | LIVE |
| S22 | `/student/webinars` | WebinarsPage (`pages/student/WebinarsPage.tsx`) | STUDENT | yes | التطوير والتقدّم (collapsed) | LIVE |
| S23 | `/community` | CommunityPage (`pages/community/CommunityPages.tsx`) | STUDENT (top-level path, student guard) | yes | المجتمع والفرص (collapsed) | LIVE |
| S24 | `/student/social` | SocialPage (`pages/student/MorePages.tsx`) | STUDENT | yes | المجتمع والفرص (collapsed) | LIVE |
| S25 | `/student/jobs` | JobsPage (`pages/student/JobsPage.tsx`) | STUDENT | yes | المجتمع والفرص (collapsed) | LIVE |
| S26 | `/student/profile` | ProfilePage (`pages/student/ProfilePage.tsx`) | STUDENT | yes | حسابي | LIVE |
| S27 | `/student/messages` | StudentMessagesPage (`pages/student/MessagesPage.tsx`) | STUDENT | yes | حسابي | LIVE |
| S28 | `/student/alerts` | AlertsPage (`pages/student/MorePages.tsx`) | STUDENT | yes | حسابي | LIVE |
| S29 | `/student/payment` | PaymentPage (`pages/student/PaymentPage.tsx`) | STUDENT | yes | خدمات الجامعة (collapsed) | LIVE |
| S30 | `/student/university` | UniversityInfoPage (`pages/student/MorePages.tsx`) | STUDENT | yes | خدمات الجامعة (collapsed) | LIVE |
| S31 | `/student/map` | CampusMapPage (`pages/student/CampusMapPage.tsx`) | STUDENT | yes | خدمات الجامعة (collapsed) | LIVE |
| S32 | `/student/downloads` | DownloadsPage (`pages/student/MorePages.tsx`) | STUDENT | yes | خدمات الجامعة (collapsed) | LIVE |
| S33 | `/student/courses/:offeringId` | CourseDetailPage (`pages/student/CourseDetailPage.tsx`) | STUDENT | yes | — (detail; every card/dashboard/calendar link) | LIVE |
| S34 | `/student/lectures/:lectureId` | LecturePlayerPage (`pages/student/LecturePlayerPage.tsx`) | STUDENT | yes | — (detail; links from course detail, matrix, dashboard) | LIVE |
| S35 | `/student/online-exams/:id` | ExamTakerPage (`pages/exams/OnlineExamsPages.tsx`) | STUDENT | yes | — (detail; **4 states**: pre-start / live attempt / result / completed — A4 P2-5) | LIVE |
| S36 | `/student/exams` | — | STUDENT | — | — (nav retired, PP-X2) | REDIRECT→`/student/online-exams` |
| S37 | `/student/training` | — | STUDENT | — | — | REDIRECT→`/training` |
| S38 | `/student/training/:slug` | `ParamRedirect` | STUDENT | — | — | REDIRECT→`/training/:slug` (param-preserving, r281 §7) |
| S39 | `/student/training/:slug/lesson/:lessonId` | `ParamRedirect` | STUDENT | — | — | REDIRECT→`/training/:slug/lesson/:lessonId` |
| S40 | `/student/achievements` | — | STUDENT | — | — | REDIRECT→`/achievements` |
| S41 | `/student/community` | — | STUDENT | — | — | REDIRECT→`/community` |
| S42 | `/student/colleges` | — | STUDENT | — | — | REDIRECT→`/colleges` |

### 1.3 TEACHER (ProtectedRoute allow=[TEACHER] + AppShell)

| # | path | page component (file) | access | shell | nav group | status |
|---|------|------------------------|--------|-------|-----------|--------|
| T1 | `/teacher/dashboard` | TeacherDashboardPage (`pages/teacher/TeacherDashboardPage.tsx`) | TEACHER | yes | لوحة التدريس | LIVE |
| T2 | `/teacher/intelligence` | TeacherIntelligencePage (`pages/teacher/TeacherIntelligencePage.tsx`) | TEACHER | yes | لوحة التدريس (badge AI) | LIVE |
| T3 | `/teacher/intelligence/:offeringId` | TeacherOfferingDetailPage (`pages/teacher/TeacherIntelligencePage.tsx`) | TEACHER | yes | — (detail) | LIVE |
| T4 | `/teacher/performance` | PerformancePage (`pages/teacher/TeacherPages.tsx`) | TEACHER | yes | لوحة التدريس | LIVE |
| T5 | `/teacher/schedule` | TeacherSchedulePage (`pages/teacher/TeacherPages.tsx`) | TEACHER | yes | لوحة التدريس | LIVE |
| T6 | `/teacher/attendance` | AttendancePage (`pages/teacher/TeacherPages.tsx`) | TEACHER | yes | لوحة التدريس | LIVE |
| T7 | `/teacher/students` | StudentsListPage (`pages/teacher/TeacherPages.tsx`) | TEACHER | yes | لوحة التدريس | LIVE |
| T8 | `/teacher/materials` | MaterialsPage (`pages/teacher/TeacherPages.tsx`) | TEACHER | yes | لوحة التدريس | LIVE |
| T9 | `/teacher/grades` | GradesPage (`pages/teacher/TeacherPages.tsx`) | TEACHER | yes | التقييم والتصحيح | LIVE |
| T10 | `/teacher/assignments` | AssignmentsPage (`pages/teacher/TeacherPages.tsx`) | TEACHER | yes | التقييم والتصحيح | LIVE |
| T11 | `/teacher/exams` | ExamAuthoringPage (`pages/teacher/ExamAuthorPages.tsx`) | TEACHER | yes | التقييم والتصحيح | LIVE |
| T12 | `/teacher/exams/:templateId` | ExamTemplateDetailPage (`pages/teacher/ExamAuthorPages.tsx`) | TEACHER | yes | — (detail) | LIVE |
| T13 | `/teacher/research` | ResearchPage (`pages/teacher/TeacherPages.tsx`) | TEACHER | yes | البحث والمحاضرة | LIVE |
| T14 | `/teacher/live` | TeacherLivePage (`pages/teacher/TeacherLivePage.tsx`) | TEACHER | yes | البحث والمحاضرة | LIVE |
| T15 | `/teacher/labs` | TeacherLabsPage (`pages/teacher/TeacherLabsPage.tsx`) | TEACHER | yes | البحث والمحاضرة | LIVE |
| T16 | `/teacher/library` | LibraryPage (`pages/student/LibraryPage.tsx` — shared component) | TEACHER | yes | البحث والمحاضرة | LIVE |
| T17 | `/teacher/ai` | AiAssistantPage (`pages/student/AiAssistantPage.tsx` — shared component) | TEACHER | yes | البحث والمحاضرة (badge AI) | LIVE |
| T18 | `/teacher/profile` | TeacherProfilePage (`pages/teacher/TeacherProfilePage.tsx`) | TEACHER | yes | حسابي | LIVE |
| T19 | `/teacher/messages` | MessagesPage (`pages/teacher/TeacherPages.tsx`) | TEACHER | yes | حسابي | LIVE |
| T20 | `/teacher/alerts` | AlertsPage (`pages/student/MorePages.tsx` — shared component) | TEACHER | yes | حسابي | LIVE |
| T21 | `/teacher/community` | CommunityPage (`pages/community/CommunityPages.tsx` — shared component) | TEACHER | yes | حسابي | LIVE |

### 1.4 ADMIN (ProtectedRoute allow=[ADMIN] + AppShell)

| # | path | page component (file) | access | shell | nav group | status |
|---|------|------------------------|--------|-------|-----------|--------|
| A1 | `/admin/dashboard` | AdminDashboardPage (`pages/admin/AdminPages.tsx`) | ADMIN | yes | الإدارة | LIVE |
| A2 | `/admin/teachers` | AdminTeachersPage (`pages/admin/AdminGovernancePages.tsx`) | ADMIN | yes | الإدارة | LIVE |
| A3 | `/admin/permissions/:id` | AdminPermissionsPage (`pages/admin/AdminGovernancePages.tsx`) | ADMIN | yes | — (detail; linked from `/admin/teachers` rows) | LIVE |
| A4 | `/admin/faculties` | AdminFacultiesPage (`pages/admin/AdminPages.tsx`) | ADMIN | yes | الإدارة | LIVE |
| A5 | `/admin/courses` | AdminCoursesPage (`pages/admin/AdminPages.tsx`) | ADMIN | yes | الإدارة | LIVE |
| A6 | `/admin/students` | AdminStudentsPage (`pages/admin/AdminExtraPages.tsx`) | ADMIN | yes | النظام | LIVE |
| A7 | `/admin/digital` | AdminDigitalPage (`pages/admin/AdminExtraPages.tsx`) | ADMIN | yes | النظام | LIVE |
| A8 | `/admin/reports` | AdminReportsPage (`pages/admin/AdminPages.tsx`) | ADMIN | yes | النظام | LIVE |
| A9 | `/admin/analysis` | AdminAnalysisPage (`pages/admin/AdminExtraPages.tsx` — renders `<Navigate to="/admin/reports?trend=table" replace/>`) | ADMIN | — | — (nav retired, 5-B4 hand-off) | REDIRECT→`/admin/reports?trend=table` (component-level) |
| A10 | `/admin/alerts` | AlertsPage (`pages/student/MorePages.tsx` — shared component) | ADMIN | yes | النظام | LIVE |
| A11 | `/admin/sync` | AdminSyncPage (`pages/admin/AdminSyncPage.tsx`) | ADMIN | yes | النظام | LIVE |
| A12 | `/admin/settings` | AdminSettingsPage (`pages/admin/AdminExtraPages.tsx`) | ADMIN | yes | النظام | LIVE |
| A13 | `/admin/community` | CommunityPage (`pages/community/CommunityPages.tsx` — shared component) | ADMIN | yes | النظام | LIVE |

### 1.5 QUALITY (ProtectedRoute allow=[QUALITY] + AppShell — QUALITY only; r157 6A9 #1)

| # | path | page component (file) | access | shell | nav group | status |
|---|------|------------------------|--------|-------|-----------|--------|
| Q1 | `/quality/dashboard` | QualityDashboardPage (`pages/quality/QualityPages.tsx`) | QUALITY | yes | مركز ضمان الجودة | LIVE |
| Q2 | `/quality/courses` | QualityCoursesPage (`pages/quality/QualityPages.tsx`) | QUALITY | yes | مركز ضمان الجودة | LIVE |
| Q3 | `/quality/professors` | QualityProfessorsPage (`pages/quality/QualityPages.tsx`) | QUALITY | yes | مركز ضمان الجودة | LIVE |
| Q4 | `/quality/engagement` | QualityEngagementPage (`pages/quality/QualityPages.tsx`) | QUALITY | yes | مركز ضمان الجودة | LIVE |
| Q5 | `/quality/exam-moderation` | ExamModerationPage (`pages/exams/OnlineExamsPages.tsx`) | QUALITY | yes | المراجعة والتقارير | LIVE |
| Q6 | `/quality/curriculum` | QualityCurriculumPage (`pages/quality/QualityPages.tsx`) | QUALITY | yes | المراجعة والتقارير | LIVE |
| Q7 | `/quality/reports` | QualityReportsPage (`pages/quality/QualityPages.tsx`) | QUALITY | yes | المراجعة والتقارير | LIVE |
| Q8 | `/quality/notifications` | AlertsPage (`pages/student/MorePages.tsx` — the bell's personal inbox, r165d D2) | QUALITY | yes | المراجعة والتقارير | LIVE |
| Q9 | `/quality/alerts` | QualityAlertsPage (`pages/quality/QualityPages.tsx`) | QUALITY | yes | المراجعة والتقارير | LIVE |
| Q10 | `/quality/community` | CommunityPage (`pages/community/CommunityPages.tsx` — shared component) | QUALITY | yes | المراجعة والتقارير | LIVE |

### 1.6 OWNER (ProtectedRoute allow=[OWNER] + AppShell)

| # | path | page component (file) | access | shell | nav group | status |
|---|------|------------------------|--------|-------|-----------|--------|
| O1 | `/owner/dashboard` | OwnerDashboardPage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | لوحة المالك | LIVE |
| O2 | `/owner/realtime` | OwnerRealtimePage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | لوحة المالك (badge LIVE) | LIVE |
| O3 | `/owner/users` | OwnerUsersPage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | لوحة المالك | LIVE |
| O4 | `/owner/institutions` | OwnerInstitutionsPage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | لوحة المالك | LIVE |
| O5 | `/owner/institutions/:slug` | OwnerInstitutionDetailPage (`pages/owner/OwnerInstitutionDetailPage.tsx`) | OWNER | yes | — (detail; r181 phase-8 academic setup) | LIVE |
| O6 | `/owner/activity` | OwnerActivityPage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | لوحة المالك | LIVE |
| O7 | `/owner/content` | OwnerContentPage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | المنصة | LIVE |
| O8 | `/owner/system` | OwnerSystemPage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | المنصة | LIVE |
| O9 | `/owner/education` | OwnerEducationPage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | المنصة | LIVE |
| O10 | `/owner/ai` | OwnerAiPage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | المراقبة والتحليل (badge AI) | LIVE |
| O11 | `/owner/notifications` | AlertsPage (`pages/student/MorePages.tsx` — the bell's personal inbox, r165d D2) | OWNER | yes | المراقبة والتحليل | LIVE |
| O12 | `/owner/alerts` | OwnerAlertsPage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | المراقبة والتحليل | LIVE |
| O13 | `/owner/governance` | OwnerGovernancePage (`pages/owner/OwnerPages.tsx`) | OWNER | yes | المراقبة والتحليل | LIVE |

### 1.7 SHARED-AUTHED (ProtectedRoute with NO `allow` → all five roles + AppShell)

| # | path | page component (file) | access | shell | nav group | status |
|---|------|------------------------|--------|-------|-----------|--------|
| H1 | `/vision` | VisionGalleryPage (`pages/vision/VisionPages.tsx`) | ANY-AUTHED (all 5 roles) | yes | خدمات الجامعة STUDENT · حسابي TEACHER · النظام ADMIN · المراجعة والتقارير QUALITY · المراقبة والتحليل OWNER | LIVE |
| H2 | `/vision/:slug` | VisionDetailPage (`pages/vision/VisionPages.tsx`) | ANY-AUTHED | yes | — (detail) | LIVE |
| H3 | `/document/:filename` | DocumentViewerPage (`pages/DocumentViewerPage.tsx`) | ANY-AUTHED | yes | — (deep viewer; linked from library / research / assignment files) | LIVE |
| H4 | `/competitions` | CompetitionsIndexPage (`pages/competitions/CompetitionsPages.tsx`) | ANY-AUTHED | yes | المجتمع والفرص STUDENT · حسابي TEACHER (CTA from `/community` for the rest) | LIVE |
| H5 | `/competitions/:id` | CompetitionDetailPage (`pages/competitions/CompetitionsPages.tsx`) | ANY-AUTHED | yes | — (detail) | LIVE |

### 1.8 Counts

| section | route rows | live | redirects |
|---|---|---|---|
| PUBLIC (incl. `/login` alias, `/404`, `*`) | 8 | 7 | 1 |
| COLLEGES (public dual-chrome) | 3 | 3 | 0 |
| STUDENT block (incl. top-level `/training*`, `/achievements`, `/community`) | 41 | 34 | 7 |
| STUDENT+TEACHER widened (`/student/labs`) | 1 | 1 | 0 |
| TEACHER | 21 | 21 | 0 |
| ADMIN | 13 | 12 | 1 (`/admin/analysis`, component-level) |
| QUALITY | 10 | 10 | 0 |
| OWNER | 13 | 13 | 0 |
| SHARED-AUTHED | 5 | 5 | 0 |
| **TOTAL** | **115** | **106** | **9** |

- **Total route rows: 115** (113 single-line `<Route path=` + `/campus` + `/capabilities` on multi-line rows).
- **Redirect rows: 9** — 8 `<Navigate>` rows (`/login`, `/student/exams`, `/student/training`, `/student/training/:slug`, `/student/training/:slug/lesson/:lessonId`, `/student/achievements`, `/student/community`, `/student/colleges`) + 1 component-level (`/admin/analysis` → `/admin/reports?trend=table`). Plus the behavioural (non-row) redirects: `/` → `ROLE_HOME[role]` for authed users, guard denies → role home, `GuestRoute` → role home.
- **Capture-able live routes: 105** (106 live rows; `/404` and `*` render the same NotFoundPage → one capture row).
- Per-role reachable live surfaces (own block + widened/shared/colleges): STUDENT 43 · TEACHER 30 · ADMIN 20 · QUALITY 18 · OWNER 21 · GUEST 9 (incl. guest-chrome colleges variants).
- BottomNav (≤920px) mirrors 5 destinations per role — all verified real routes (r305-nav-maps.test.tsx).

---

## 2 · Coverage tracking (the fleet fills this per cycle)

One row per capture-able live route (105 distinct routes → 108 capture rows; see the rollup). Dynamic routes carry their concrete seed capture target (§3). Cells: `✓` captured/passed · `—` not yet. `judged` = VLM/pair-judge verdict recorded · `gate` = `gate:r319` run green for this route.

**coverage: 108 capture rows (105 distinct routes — the `/colleges` family is captured twice: guest chrome-less + authed shell) × 3 viewports × 2 themes = 0/648 cells captured** (rollup — update after every capture cycle)

### 2.1 PUBLIC + guest chrome

| Route | 390 | 768 | 1440 | light | dark | judged | gate |
|---|---|---|---|---|---|---|---|
| `/` (guest landing) | — | — | — | — | — | — | — |
| `/auth` | — | — | — | — | — | — | — |
| `/auth/register` | — | — | — | — | — | — | — |
| `/campus` | — | — | — | — | — | — | — |
| `/capabilities` | — | — | — | — | — | — | — |
| `/colleges` (GUEST chrome-less) | — | — | — | — | — | — | — |
| `/colleges/leaderboard` (GUEST) | — | — | — | — | — | — | — |
| `/colleges/:id` (GUEST, seed college) | — | — | — | — | — | — | — |
| `/404` + `*` (catch-all) | — | — | — | — | — | — | — |

### 2.2 STUDENT (login: student@demo.madarek.ly)

| Route | 390 | 768 | 1440 | light | dark | judged | gate |
|---|---|---|---|---|---|---|---|
| `/student/dashboard` ⭐ | — | — | — | — | — | — | — |
| `/student/schedule` | — | — | — | — | — | — | — |
| `/student/calendar` | — | — | — | — | — | — | — |
| `/student/courses` | — | — | — | — | — | — | — |
| `/student/catalog` | — | — | — | — | — | — | — |
| `/student/results` | — | — | — | — | — | — | — |
| `/student/matrix` | — | — | — | — | — | — | — |
| `/student/online-exams` | — | — | — | — | — | — | — |
| `/student/library` | — | — | — | — | — | — | — |
| `/student/research` | — | — | — | — | — | — | — |
| `/student/ai` | — | — | — | — | — | — | — |
| `/student/labs` | — | — | — | — | — | — | — |
| `/student/ar` | — | — | — | — | — | — | — |
| `/student/live` | — | — | — | — | — | — | — |
| `/training` | — | — | — | — | — | — | — |
| `/training/platform-onboarding` (`:slug`) | — | — | — | — | — | — | — |
| `/training/platform-onboarding/lesson/:lessonId` | — | — | — | — | — | — | — |
| `/achievements` | — | — | — | — | — | — | — |
| `/student/gamification` | — | — | — | — | — | — | — |
| `/student/skills` | — | — | — | — | — | — | — |
| `/student/mooc` | — | — | — | — | — | — | — |
| `/student/webinars` | — | — | — | — | — | — | — |
| `/community` | — | — | — | — | — | — | — |
| `/student/social` | — | — | — | — | — | — | — |
| `/student/jobs` | — | — | — | — | — | — | — |
| `/student/profile` | — | — | — | — | — | — | — |
| `/student/messages` | — | — | — | — | — | — | — |
| `/student/alerts` | — | — | — | — | — | — | — |
| `/student/payment` | — | — | — | — | — | — | — |
| `/student/university` | — | — | — | — | — | — | — |
| `/student/map` | — | — | — | — | — | — | — |
| `/student/downloads` | — | — | — | — | — | — | — |
| `/student/courses/:offeringId` (SE301) | — | — | — | — | — | — | — |
| `/student/lectures/:lectureId` (SE301 lec 1) | — | — | — | — | — | — | — |
| `/student/online-exams/:id` (quiz — 4 states) | — | — | — | — | — | — | — |

### 2.3 SHARED-AUTHED + colleges (capture under STUDENT login; spot-check per role — the shell's role accent + nav differ)

| Route | 390 | 768 | 1440 | light | dark | judged | gate |
|---|---|---|---|---|---|---|---|
| `/vision` | — | — | — | — | — | — | — |
| `/vision/ai-predictor` (`:slug`) | — | — | — | — | — | — | — |
| `/document/:filename` (seed library file) | — | — | — | — | — | — | — |
| `/competitions` | — | — | — | — | — | — | — |
| `/competitions/:id` (seed competition) | — | — | — | — | — | — | — |
| `/colleges` (AUTHED shell) | — | — | — | — | — | — | — |
| `/colleges/leaderboard` (AUTHED) | — | — | — | — | — | — | — |
| `/colleges/:id` (AUTHED, seed college) | — | — | — | — | — | — | — |

### 2.4 TEACHER (login: teacher@demo.madarek.ly)

| Route | 390 | 768 | 1440 | light | dark | judged | gate |
|---|---|---|---|---|---|---|---|
| `/teacher/dashboard` ⭐ | — | — | — | — | — | — | — |
| `/teacher/intelligence` | — | — | — | — | — | — | — |
| `/teacher/intelligence/:offeringId` (SE301) | — | — | — | — | — | — | — |
| `/teacher/performance` | — | — | — | — | — | — | — |
| `/teacher/schedule` | — | — | — | — | — | — | — |
| `/teacher/attendance` | — | — | — | — | — | — | — |
| `/teacher/students` | — | — | — | — | — | — | — |
| `/teacher/materials` | — | — | — | — | — | — | — |
| `/teacher/grades` | — | — | — | — | — | — | — |
| `/teacher/assignments` | — | — | — | — | — | — | — |
| `/teacher/exams` | — | — | — | — | — | — | — |
| `/teacher/exams/:templateId` (seed QUIZ) | — | — | — | — | — | — | — |
| `/teacher/research` | — | — | — | — | — | — | — |
| `/teacher/live` | — | — | — | — | — | — | — |
| `/teacher/labs` | — | — | — | — | — | — | — |
| `/teacher/library` | — | — | — | — | — | — | — |
| `/teacher/ai` | — | — | — | — | — | — | — |
| `/teacher/profile` | — | — | — | — | — | — | — |
| `/teacher/messages` | — | — | — | — | — | — | — |
| `/teacher/alerts` | — | — | — | — | — | — | — |
| `/teacher/community` | — | — | — | — | — | — | — |

### 2.5 ADMIN (login: admin@demo.madarek.ly)

| Route | 390 | 768 | 1440 | light | dark | judged | gate |
|---|---|---|---|---|---|---|---|
| `/admin/dashboard` ⭐ | — | — | — | — | — | — | — |
| `/admin/teachers` | — | — | — | — | — | — | — |
| `/admin/permissions/:id` (seed teacher) | — | — | — | — | — | — | — |
| `/admin/faculties` | — | — | — | — | — | — | — |
| `/admin/courses` | — | — | — | — | — | — | — |
| `/admin/students` | — | — | — | — | — | — | — |
| `/admin/digital` | — | — | — | — | — | — | — |
| `/admin/reports` (incl. `?trend=table` target) | — | — | — | — | — | — | — |
| `/admin/alerts` | — | — | — | — | — | — | — |
| `/admin/sync` | — | — | — | — | — | — | — |
| `/admin/settings` | — | — | — | — | — | — | — |
| `/admin/community` | — | — | — | — | — | — | — |

### 2.6 QUALITY (login: quality@demo.madarek.ly)

| Route | 390 | 768 | 1440 | light | dark | judged | gate |
|---|---|---|---|---|---|---|---|
| `/quality/dashboard` ⭐ | — | — | — | — | — | — | — |
| `/quality/courses` | — | — | — | — | — | — | — |
| `/quality/professors` | — | — | — | — | — | — | — |
| `/quality/engagement` | — | — | — | — | — | — | — |
| `/quality/exam-moderation` (seed PENDING_REVIEW) | — | — | — | — | — | — | — |
| `/quality/curriculum` | — | — | — | — | — | — | — |
| `/quality/reports` | — | — | — | — | — | — | — |
| `/quality/notifications` | — | — | — | — | — | — | — |
| `/quality/alerts` | — | — | — | — | — | — | — |
| `/quality/community` | — | — | — | — | — | — | — |

### 2.7 OWNER (login: owner@demo.madarek.ly)

| Route | 390 | 768 | 1440 | light | dark | judged | gate |
|---|---|---|---|---|---|---|---|
| `/owner/dashboard` ⭐ | — | — | — | — | — | — | — |
| `/owner/realtime` | — | — | — | — | — | — | — |
| `/owner/users` | — | — | — | — | — | — | — |
| `/owner/institutions` | — | — | — | — | — | — | — |
| `/owner/institutions/madarek-demo` (`:slug`) | — | — | — | — | — | — | — |
| `/owner/activity` | — | — | — | — | — | — | — |
| `/owner/content` | — | — | — | — | — | — | — |
| `/owner/system` | — | — | — | — | — | — | — |
| `/owner/education` | — | — | — | — | — | — | — |
| `/owner/ai` | — | — | — | — | — | — | — |
| `/owner/notifications` | — | — | — | — | — | — | — |
| `/owner/alerts` | — | — | — | — | — | — | — |
| `/owner/governance` | — | — | — | — | — | — | — |

⭐ = per-role dashboard — the §H exit's first-priority captures.

---

## 3 · Capture plan (order + concrete seed targets)

Logins: the seed's demo accounts — `student@` · `teacher@` · `admin@` · `quality@` · `owner@demo.madarek.ly` (plus `student2@` / `teacher2@` / `admin2@` for the Al-Andalus second tenant). Password: the documented demo value in `backend/prisma/seed.ts` (header). Agent B's Playwright auth fixture (API token login) is the vehicle; once the local stack runs, prefer direct URL visits with the ids below.

**Wave 1 — the five role dashboards** (§H exit needs 100% coverage; these are also the onboarding auto-start surfaces):
`/student/dashboard` → `/teacher/dashboard` → `/admin/dashboard` → `/quality/dashboard` → `/owner/dashboard` — each at 390/768/1440 × light/dark (30 cells).

**Wave 2 — high-traffic student pages** (the owner's own usage path):
`/student/courses` → `/student/courses/:offeringId` → `/student/schedule` + `/student/calendar` → `/student/lectures/:lectureId` → `/student/online-exams` + `:id` (all 4 states) → `/student/results` → `/student/messages` → `/student/alerts` → `/student/ai` → `/student/profile` → `/community` → `/training` family → `/achievements`.

**Wave 3 — teacher core**: `/teacher/grades` → `/teacher/attendance` → `/teacher/students` → `/teacher/intelligence` (+ `:offeringId`) → `/teacher/exams` (+ `:templateId`) → `/teacher/assignments` → `/teacher/materials`.

**Wave 4 — admin + owner**: admin (teachers, permissions, faculties, courses, students, reports, digital, sync, settings) → owner (users, institutions + `:slug`, realtime, activity, content, system, education, ai, governance, alerts, notifications).

**Wave 5 — public + shared + 404**: `/` · `/auth` · `/auth/register` · `/campus` · `/capabilities` · `/colleges` family (guest chrome-less AND authed shell) · `/vision` family · `/competitions` family · `/document/:filename` · `/404`.

### 3.1 Dynamic-param capture targets (from backend/prisma/seed.ts)

| route | param | seed value (capture target) |
|---|---|---|
| `/student/courses/:offeringId` | offering cuid (no stable slug) | 6 seeded offerings for the demo student, term `2024-FALL`: SE301 هندسة البرمجيات (the richest: grades + attendance + lectures) · CT301 تقنيات الحاسوب · IS301 نظم المعلومات · NET301 شبكات الحاسوب · WEB301 تقنيات الإنترنت · SEC301 أمن المعلومات. **Click-through from `/student/courses`** (first card = SE301); or read the id from the `/student/dashboard` courses API payload. |
| `/student/lectures/:lectureId` | lecture cuid | 3 seeded SE301 lectures: «مقدمة هندسة البرمجيات» (`se301-01-intro.mp4`, 600s, 3 chapters + 1 checkpoint) · «تحليل المتطلبات ومخططات UML» (`se301-02-requirements.mp4`, 720s) · «التصميم المعماري» (`se301-03-design.mp4`). Click-through from course detail. |
| `/student/online-exams/:id` | examTemplate cuid | «اختبار قصير — هندسة البرمجيات» (QUIZ · PUBLISHED · 30 min · 5 questions · passing 50). Click-through from `/student/online-exams`. Capture the **4 states**: pre-start, live attempt, result, completed (resume a seeded attempt or take it twice). |
| `/training/:slug` | track slug (STABLE) | 11 tracks: `platform-onboarding` (order 1 — primary target) · `academic-methodology` · `flipped-classroom` · `study-skills` · `research-skills` · `career-skills` · `communication` · `english-academic` · `programming-basics` · `productivity` · `vision-ai-data`. |
| `/training/:slug/lesson/:lessonId` | lesson cuid | e.g. platform-onboarding lesson 1 «الترحيب والتسجيل» — click-through from the track page. |
| `/teacher/exams/:templateId` | template cuid | the seed's QUIZ template above + any teacher-authored rows. Click-through from `/teacher/exams`. |
| `/teacher/intelligence/:offeringId` | offering cuid | SE301 offering (same id as the student course detail). Click-through from `/teacher/intelligence`. |
| `/admin/permissions/:id` | user cuid | the demo teacher row — click-through from `/admin/teachers` («إدارة الصلاحيات» button). |
| `/owner/institutions/:slug` | institution slug (STABLE) | **`madarek-demo`** (جامعة مدارك التجريبية — primary) · `alandalus-demo` (مؤسسة الأندلس التعليمية — second tenant). Direct URL works. |
| `/vision/:slug` | concept slug (STABLE, static content) | 12 in `lib/vision.ts`: `ai-predictor` (primary) · `ai-exam-generator` · `ai-proctoring` · `ai-avatar` · `voice-assistant` · `live-translation` · `resume-builder` · `research-assistant` · `digital-twin` · `blockchain-certificates` · `metaverse-university` · `madrak-os`. |
| `/competitions/:id` | competition cuid | 4 seeded: «مسابقة أفضل بحث طلابي في الذكاء الاصطناعي» · «هاكاثون مدارك الأول» · «مسابقة الإلقاء العلمي بالإنجليزية» · «تحدي الأندلس للبرمجة الأول». Click-through from `/competitions`. |
| `/colleges/:id` | college cuid | the seeded faculties of the demo university — click-through from `/colleges` (gallery card) or `/student/map`. |
| `/document/:filename` | file basename + `?title=&back=&paper=` | linked from `/student/library` (loans), `/student/research` (paper files), teacher assignment files. Click-through from any of those. |

QUALITY bonus target: `/quality/exam-moderation` has seeded content — «اختبار موحد — أساسيات هندسة البرمجيات (كلية تقنية المعلومات)» (MIDTERM · PENDING_REVIEW) waiting for moderation.

### 3.2 Capture rules

- Every capture: both themes (toggle in-shell, not a re-login) × 3 viewports (390 / 768 / 1440) — the §H matrix; §E-8 state-contrast sweep runs on the same fixtures.
- Guest surfaces (§2.1) capture in a clean logged-out context; colleges captured twice (guest chrome-less + authed shell).
- Redirect rows need no capture — their landing pages are already rows (verify the bounce once per alias in the gate, not in the matrix).
- `/student/online-exams/:id` = 4 sub-states; capture all four (the exit judges the route green only with all states).
- Shared-authed surfaces: capture under STUDENT login; per-role spot-check (role accent + nav chrome) at 390 light only in later cycles.

---

## 4 · Sanity check — nav.ts ↔ App.tsx (mismatches)

Method: every `to:` in `NAV_BY_ROLE` (nav.ts) matched against the `<Route path>` set in App.tsx (the same static-source check `tests/unit/nav-routes-consistency.test.tsx` pins — 70+ nav destinations, 90+ route rows tripwires).

**Result: 0 mismatches — every nav destination resolves to a real route row.** Every `<Navigate>` redirect target also resolves. Deliberate deviations (documented in source, not defects):

1. `/student/labs` is STUDENT **+ TEACHER** (A6 P1, wave 22-a) — the single intentional widening of a `/student/*` path («معاينة كطالب» CTA on the teacher labs page). Pinned by `tests/unit/App-routes.test.tsx`.
2. `/admin/analysis` — nav entry retired (5-B4: folded into `/admin/reports?trend=table`); the route row stays as a component-level redirect preserving old bookmarks.
3. `/student/exams` + the six `/student/{training,training/:slug,training/:slug/lesson/:lessonId,achievements,community,colleges}` rows — stale deep-link aliases (r281 BLUEPRINT §7); nav entries live on the live top-level targets.
4. `/colleges/leaderboard` — no sidebar home in ANY role (A4 P2-1, NavLink prefix-match double-active); reachable via `/colleges` CTA. Still fully route-live + in this coverage matrix.
5. `/login` — legacy alias → `/auth` (the canonical login route).
6. OWNER has no `/owner/profile` route (unique among roles — the bottom-nav 5th slot is the realtime monitor instead).
7. `/community` is top-level STUDENT-only; TEACHER/ADMIN/QUALITY mount the same CommunityPage under their own role paths (`/teacher|/admin|/quality/community`).
8. QUALITY guard is QUALITY-only by design (r157 6A9 #1): an ADMIN manually granted `QUALITY_VIEW` in the backend still bounces to `/admin/dashboard` — the frontend guard mirrors the default-role truth.
9. `/student/online-exams/:id` hosts four page states (A4 P2-5) — one route, four capture variants.
10. BottomNav (mobile dock) mirrors 5 destinations per role from the same route set — verified by `r305-nav-maps.test.tsx`; no drift.

---

*Agent E · R319 cycle 1 · docs only — no code files touched.*
