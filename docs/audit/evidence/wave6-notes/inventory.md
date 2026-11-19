# Wave 6 — authenticated-route inventory (r368 · Task 6-a · wave 1)

Generated from the current tree (`wip/r368-t6`, base `76de5a8c`) by reading
`frontend/src/App.tsx` (the route table), `frontend/src/lib/routes.ts` (the
path constants) and the lazy-import map. Every authenticated route is listed
with its guard, owning file, role family, page family and the states sampled
this wave. Baseline scores are MY OWN measurements from
`scripts/conformance/pages-{student,teacher}.mjs --url http://localhost:5306/`
(vite `5306 --strictPort`, hermetic mock transport; light + dark, 1440/390).

Ownership column: **W1** = this wave (T6-a owns the file), **W2** = wave-2
families (admin/owner/quality/exams page files — inventoried only this wave),
**T5** = public-page owner (file outside the role-program scope even though
the mount is authenticated), **SHARED** = file shared across role families.

Legend page families: dash = dashboard, list, detail, form, empty, loading,
error (every page carries loading/error via the shared `States` primitives;
"sampled" records which states were exercised by the fixtures this wave).

## 1 · Student family (guard `STUDENT`, App.tsx 443–499)

| route | guard | owning file | family | sampled states | baseline (light 1440/390 · dark 1440/390) | owner |
|---|---|---|---|---|---|---|
| `/student/dashboard` | STUDENT | `pages/student/DashboardPage.tsx` | dashboard | data, loading (skeleton), error | 99.5/99.4 · 99.5/99.4 | W1 |
| `/student/calendar` | STUDENT | `pages/student/CalendarPage.tsx` | calendar/list | data, empty | 99.6/99.6 · 99.8/99.8 | W1 |
| `/student/courses` | STUDENT | `pages/student/CoursesPage.tsx` | list | data, empty | 99.4/99.3 · 99.4/99.3 | W1 |
| `/student/catalog` | STUDENT | `pages/student/CatalogPage.tsx` | list | data, empty | 99.6/99.6 · 99.6/99.6 | W1 |
| `/student/schedule` | STUDENT | `pages/student/MorePages.tsx` (`SchedulePage`) | list | data, empty | 99.3/99.2 · 99.3/99.2 | W1 |
| `/student/results` | STUDENT | `pages/student/MorePages.tsx` (`ResultsPage`) | list/detail | data | 99.7/99.7 · 99.7/99.7 | W1 |
| `/student/library` | STUDENT | `pages/student/LibraryPage.tsx` | list | data, empty | 99.7/99.7 · 99.7/99.7 | W1 |
| `/student/mooc` | STUDENT | `pages/student/MoocPage.tsx` | list | data, empty | 99.7/99.7 · 99.7/99.7 | W1 |
| `/student/jobs` | STUDENT | `pages/student/JobsPage.tsx` | list | data, empty | 99.8/99.7 · 99.8/99.7 | W1 |
| `/student/ai` | STUDENT (shared page) | `pages/student/AiAssistantPage.tsx` | tool (chat) | data, empty conversations | 99.3/99.3 · 99.3/99.3 | W1 (SHARED with `/teacher/ai`) |
| `/student/gamification` | STUDENT | `pages/student/MorePages.tsx` (`GamificationPage`) | list/detail | data | 99.3/99.3 · 99.3/99.3 | W1 |
| `/student/skills` | STUDENT | `pages/student/MorePages.tsx` (`SkillsPage`) | list | data, empty | 99.7/99.7 · 99.7/99.7 | W1 |
| `/student/alerts` | STUDENT (shared page) | `pages/student/MorePages.tsx` (`AlertsPage`) | list | data, empty | 99.5/99.4 · 99.5/99.4 | W1 (SHARED with `/teacher/alerts`, `/admin/alerts`, `/quality/notifications`, `/owner/notifications`) |
| `/student/messages` | STUDENT | `pages/student/MessagesPage.tsx` | list/detail | data, empty | 99.2/99.2 · 99.2/99.2 | W1 |
| `/student/ar` | STUDENT | `pages/student/MorePages.tsx` (`ArVrPage`) | list | data | 100/100 · 100/100 | W1 |
| `/student/social` | STUDENT | `pages/student/MorePages.tsx` (`SocialPage`) | list | data | 98.4/99.7 · 98.4/99.7 | W1 |
| `/student/downloads` | STUDENT | `pages/student/MorePages.tsx` (`DownloadsPage`) | list | data, empty | 99.7/99.7 · 99.7/99.7 | W1 |
| `/student/university` | STUDENT | `pages/student/MorePages.tsx` (`UniversityInfoPage`) | detail | data | 99.5/99.5 · 97.7/97.5 (darkInk 89/88 — above floor) | W1 |
| `/student/live` | STUDENT | `pages/student/LivePage.tsx` | list | data (scheduled/live/ended) | 99.2/99.1 · 99.2/99.1 | W1 |
| `/student/payment` | STUDENT | `pages/student/PaymentPage.tsx` | form | data | 98.1/98.1 · 98.1/98.1 | W1 |
| `/student/map` | STUDENT | `pages/student/CampusMapPage.tsx` | detail | data | 99.0/98.9 · 99.0/98.9 | W1 |
| `/student/courses/:offeringId` | STUDENT | `pages/student/CourseDetailPage.tsx` | detail | data (deep-link via fixtures) | sampled by role harness corpus (courses-journey e2e) | W1 |
| `/student/lectures/:lectureId` | STUDENT | `pages/student/LecturePlayerPage.tsx` | detail/player | data (player chrome) | sampled by e2e (lecture-checkpoints, lecture-poster-geometry) | W1 |
| `/student/matrix` | STUDENT | `pages/student/MatrixPage.tsx` | dashboard/list | data | 99.6/99.6 · 99.6/99.6 | W1 |
| `/student/research` | STUDENT | `pages/student/ResearchPage.tsx` | list/form | data (uploaded→graded), empty | 99.6/99.5 · 99.6/99.5 | W1 |
| `/student/profile` | STUDENT | `pages/student/ProfilePage.tsx` | form/detail | data | 99.1/99.1 · 98.4/98.4 | W1 |
| `/student/webinars` | STUDENT | `pages/student/WebinarsPage.tsx` | list | data, empty | 99.2/99.2 · 99.2/99.2 | W1 |
| `/student/online-exams` | STUDENT | `pages/exams/OnlineExamsPages.tsx` (`OnlineExamsPage`) | list | data, empty | 98.9/98.9 · 98.9/98.9 | W2 (exams file) |
| `/student/online-exams/:id` | STUDENT | `pages/exams/OnlineExamsPages.tsx` (`ExamTakerPage`) | form | data (in-progress, submit, terminal error) | e2e `online-exams.e2e.ts` | W2 (exams file) |
| `/student/labs` | STUDENT+TEACHER (documented widening, App.tsx 417–440) | `pages/student/LabsPage.tsx` | list | data, empty, teacher preview (0 sessions) | 99.6/99.6 · 99.6/99.6 | W1 |
| `/training` | STUDENT | `pages/student/TrainingPages.tsx` (`TrainingCatalogPage`) | list | data, empty | **96.7/80.0** · 96.7/80.0 — pattern numeral missing + hover 0 @390 | W1 |
| `/training/:slug` | STUDENT | `pages/student/TrainingPages.tsx` (`TrainingTrackPage`) | detail | data, not-found empty | sampled via fixtures corpus | W1 |
| `/training/:slug/lesson/:lessonId` | STUDENT | `pages/student/TrainingPages.tsx` (`TrainingLessonPage`) | detail/form | data, quiz, complete | sampled via fixtures corpus | W1 |
| `/achievements` | STUDENT | `pages/student/TrainingPages.tsx` (`AchievementsPage`) | list | data, empty tabs | **96.7/80.0** · 96.7/80.0 — same two axes | W1 |
| `/community` | STUDENT (mount) | `pages/community/CommunityPages.tsx` | list/feed | data, empty | 99.0/99.5 · 99.0/99.5 | T5 file, student mount |
| `/student/exams` | redirect → `/student/online-exams` | — | — | — | — | redirect row |
| `/student/training`, `/student/training/:slug`, `/student/training/:slug/lesson/:lessonId`, `/student/achievements`, `/student/community`, `/student/colleges` | redirects (r281) | — | — | — | — | redirect rows |

## 2 · Teacher family (guard `TEACHER`, App.tsx 502–526)

| route | guard | owning file | family | sampled states | baseline (light 1440/390) | owner |
|---|---|---|---|---|---|---|
| `/teacher/dashboard` | TEACHER | `pages/teacher/TeacherDashboardPage.tsx` | dashboard | data, loading, error | 100/100 | W1 |
| `/teacher/schedule` | TEACHER | `pages/teacher/TeacherPages.tsx` (`TeacherSchedulePage`) | list | data, empty | 100/100 | W1 |
| `/teacher/attendance` | TEACHER | `pages/teacher/TeacherPages.tsx` (`AttendancePage`) | form/list | data (roster) | 100/100 | W1 |
| `/teacher/grades` | TEACHER | `pages/teacher/TeacherPages.tsx` (`GradesPage`) | form/list | data, empty | 100/100 | W1 |
| `/teacher/materials` | TEACHER | `pages/teacher/TeacherPages.tsx` (`MaterialsPage`) | list | data, empty | 100/100 | W1 |
| `/teacher/research` | TEACHER | `pages/teacher/ResearchReviewPage.tsx` + `TeacherPages.tsx` (`ResearchPage`) | list/detail | data (queue), empty | 99.6/100 | W1 |
| `/teacher/students` | TEACHER | `pages/teacher/TeacherPages.tsx` (`StudentsListPage`) | list | data, empty | 100/100 | W1 |
| `/teacher/performance` | TEACHER | `pages/teacher/TeacherPages.tsx` (`PerformancePage`) | dashboard | data | 100/100 | W1 |
| `/teacher/assignments` | TEACHER | `pages/teacher/TeacherPages.tsx` (`AssignmentsPage`) | list/form | data (pending submissions), empty | 100/100 | W1 |
| `/teacher/exams` | TEACHER | `pages/teacher/ExamAuthorPages.tsx` (`ExamAuthoringPage`) | list/form | data (templates), empty | 100/100 | W1 |
| `/teacher/exams/:templateId` | TEACHER | `pages/teacher/ExamAuthorPages.tsx` (`ExamTemplateDetailPage`) | detail | data (questions/attempts) | 100/100 | W1 |
| `/teacher/messages` | TEACHER | `pages/teacher/TeacherPages.tsx` (`MessagesPage`) | list/detail | data, empty | 99.5/99.5 | W1 |
| `/teacher/ai` | TEACHER | `pages/student/AiAssistantPage.tsx` | tool (chat) | data | 99.1/99.1 | W1 (SHARED) |
| `/teacher/library` | TEACHER | `pages/student/LibraryPage.tsx` | list | data, empty | 99.2/99.0 | W1 (SHARED) |
| `/teacher/alerts` | TEACHER | `pages/student/MorePages.tsx` (`AlertsPage`) | list | data, empty | 99.5/99.4 | W1 (SHARED) |
| `/teacher/intelligence` | TEACHER | `pages/teacher/TeacherIntelligencePage.tsx` | dashboard/list | data (risks) | 100/99.2 | W1 |
| `/teacher/intelligence/:offeringId` | TEACHER | `pages/teacher/TeacherIntelligencePage.tsx` (`TeacherOfferingDetailPage`) | detail | data (students/analytics/grades trio) | 100/99.3 | W1 |
| `/teacher/profile` | TEACHER | `pages/teacher/TeacherProfilePage.tsx` | form/detail | data | 100/100 | W1 |
| `/teacher/live` | TEACHER | `pages/teacher/TeacherLivePage.tsx` | list/form | data (scheduled/ended) | 100/100 | W1 |
| `/teacher/labs` | TEACHER | `pages/teacher/TeacherLabsPage.tsx` | list | data, teacher preview CTA → `/student/labs` | 100/100 | W1 |
| `/teacher/community` | TEACHER (mount) | `pages/community/CommunityPages.tsx` | list/feed | data | (student harness covers the shared file: 99.0/99.5) | T5 file, teacher mount |

## 3 · Admin/owner family (W2 — inventoried only, files untouched this wave)

| route | guard | owning file | family | owner |
|---|---|---|---|---|
| `/admin/dashboard` | ADMIN | `pages/admin/AdminPages.tsx` (`AdminDashboardPage`) | dashboard | W2 |
| `/admin/students` | ADMIN | `pages/admin/AdminExtraPages.tsx` (`AdminStudentsPage`) | list | W2 |
| `/admin/directory` | ADMIN | `pages/admin/PeoplePages.tsx` (`PeopleDirectoryPage`) | list | W2 |
| `/admin/people/:id` | ADMIN | `pages/admin/PeoplePages.tsx` (`StudentFilePage`) | detail | W2 |
| `/admin/teachers` | ADMIN | `pages/admin/AdminGovernancePages.tsx` (`AdminTeachersPage`) | list | W2 |
| `/admin/permissions/:id` | ADMIN | `pages/admin/AdminGovernancePages.tsx` (`AdminPermissionsPage`) | form | W2 |
| `/admin/community` | ADMIN (mount) | `pages/community/CommunityPages.tsx` | feed | T5 file |
| `/admin/faculties` | ADMIN | `pages/admin/AdminPages.tsx` (`AdminFacultiesPage`) | list/form | W2 |
| `/admin/courses` | ADMIN | `pages/admin/AdminPages.tsx` (`AdminCoursesPage`) | list | W2 |
| `/admin/analysis` | ADMIN | `pages/admin/AdminExtraPages.tsx` (`AdminAnalysisPage`) | dashboard | W2 |
| `/admin/digital` | ADMIN | `pages/admin/AdminExtraPages.tsx` (`AdminDigitalPage`) | list | W2 |
| `/admin/reports` | ADMIN | `pages/admin/AdminPages.tsx` (`AdminReportsPage`) | dashboard | W2 |
| `/admin/settings` | ADMIN | `pages/admin/AdminExtraPages.tsx` (`AdminSettingsPage`) | form | W2 |
| `/admin/mail` | ADMIN | `pages/admin/AdminMailPage.tsx` | form | W2 |
| `/admin/import` | ADMIN | `pages/admin/ImportWizardPage.tsx` | form (wizard) | W2 |
| `/admin/alerts` | ADMIN (mount) | `pages/student/MorePages.tsx` (`AlertsPage`) | list | W1 file (SHARED — no change needed this wave) |
| `/owner/dashboard` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerDashboardPage`) | dashboard | W2 |
| `/owner/users` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerUsersPage`) | list | W2 |
| `/owner/institutions` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerInstitutionsPage`) | list | W2 |
| `/owner/institutions/:slug` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerInstitutionDetailPage`) | detail/form | W2 |
| `/owner/activity` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerActivityPage`) | list | W2 |
| `/owner/content` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerContentPage`) | list | W2 |
| `/owner/system` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerSystemPage`) | dashboard | W2 |
| `/owner/education` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerEducationPage`) | dashboard | W2 |
| `/owner/realtime` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerRealtimePage`) | dashboard | W2 |
| `/owner/ai` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerAiPage`) | dashboard | W2 |
| `/owner/notifications` | OWNER (mount) | `pages/student/MorePages.tsx` (`AlertsPage`) | list | W1 file (SHARED) |
| `/owner/alerts` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerAlertsPage`) | list | W2 |
| `/owner/governance` | OWNER | `pages/owner/OwnerPages.tsx` (`OwnerGovernancePage`) | list | W2 |
| `/owner/feedback` | OWNER | `pages/owner/FeedbackInboxPage.tsx` | list/detail | W2 |

## 4 · Quality family (W2 — inventoried only)

| route | guard | owning file | family | owner |
|---|---|---|---|---|
| `/quality/dashboard` | QUALITY | `pages/quality/QualityPages.tsx` (`QualityDashboardPage`) | dashboard | W2 |
| `/quality/courses` | QUALITY | `pages/quality/QualityPages.tsx` (`QualityCoursesPage`) | list | W2 |
| `/quality/professors` | QUALITY | `pages/quality/QualityPages.tsx` (`QualityProfessorsPage`) | list | W2 |
| `/quality/engagement` | QUALITY | `pages/quality/QualityPages.tsx` (`QualityEngagementPage`) | dashboard | W2 |
| `/quality/reports` | QUALITY | `pages/quality/QualityPages.tsx` (`QualityReportsPage`) | dashboard | W2 |
| `/quality/curriculum` | QUALITY | `pages/quality/QualityPages.tsx` (`QualityCurriculumPage`) | list/form | W2 |
| `/quality/notifications` | QUALITY (mount) | `pages/student/MorePages.tsx` (`AlertsPage`) | list | W1 file (SHARED) |
| `/quality/alerts` | QUALITY | `pages/quality/QualityPages.tsx` (`QualityAlertsPage`) | list | W2 |
| `/quality/exam-moderation` | QUALITY | `pages/exams/OnlineExamsPages.tsx` (`ExamModerationPage`) | list/detail | W2 (exams file) |
| `/quality/community` | QUALITY (mount) | `pages/community/CommunityPages.tsx` | feed | T5 file |

## 5 · Registrar/exams family (W2 — inventoried only)

| route | guard | owning file | family | owner |
|---|---|---|---|---|
| `/student/online-exams` | STUDENT | `pages/exams/OnlineExamsPages.tsx` (`OnlineExamsPage`) | list | W2 |
| `/student/online-exams/:id` | STUDENT | `pages/exams/OnlineExamsPages.tsx` (`ExamTakerPage`) | form | W2 |
| `/quality/exam-moderation` | QUALITY | `pages/exams/OnlineExamsPages.tsx` (`ExamModerationPage`) | list/detail | W2 |
| (authoring seats live in the teacher family: `/teacher/exams`, `/teacher/exams/:templateId` — W1 files) | | | | |

## 6 · Any-authenticated block (guard `ProtectedRoute` — any role, App.tsx 726–737)

| route | guard | owning file | family | sampled states | baseline (light 1440/390 · dark) | owner |
|---|---|---|---|---|---|---|
| `/settings` | any authed | `pages/SettingsPage.tsx` | form | data, loading | —/— · 98.0/97.9 (dark, via student harness) | W1 |
| `/vision` | any authed | `pages/vision/VisionPages.tsx` (`VisionGalleryPage`) | gallery/list | data | —/— · 96.7/80.0 (dark, via student harness; same pattern/hover axes as training) | T5 file |
| `/vision/:slug` | any authed | `pages/vision/VisionPages.tsx` (`VisionDetailPage`) | detail | data | not measured this wave | T5 file |
| `/document/:filename` | any authed | `pages/DocumentViewerPage.tsx` | detail | data | e2e `document-viewer.e2e.ts` | T5 file |
| `/competitions` | any authed | `pages/competitions/CompetitionsPages.tsx` (`CompetitionsIndexPage`) | list | data | not measured this wave | T5 file |
| `/competitions/:id` | any authed | `pages/competitions/CompetitionsPages.tsx` (`CompetitionDetailPage`) | detail | data | e2e corpus | T5 file |

## 7 · Shared app shell (every authenticated route above renders inside it)

| seat | file | callers (grep-verified) | notes |
|---|---|---|---|
| shell frame | `components/layout/AppShell.tsx` | App.tsx + the six detail pages that mount it directly (CourseDetail, LecturePlayer, TrainingPages, TeacherIntelligence, OwnerInstitutionDetail, OnlineExamsPages, AdminGovernancePages) | skip-link, scroll ownership, loader orchestration seats |
| rail | `components/layout/Sidebar.tsx` | AppShell only | role nav (lib/nav.ts maps) |
| top bar | `components/layout/Topbar.tsx` | AppShell only | institution context, kicker |
| bottom nav | `components/layout/BottomNav.tsx` | AppShell only | mobile (<768) role nav |
| global search | `components/layout/GlobalSearch.tsx` | AppShell + Topbar (CommandPaletteBody) | ⌘K palette |
| notifications | `components/layout/NotificationDropdown.tsx` | Topbar only | |
| server wake pill | `components/layout/ServerWakePill.tsx` | AppShell only | |
| sheet frame | `components/layout/SheetFrame.tsx` | AppShell only | paper/grain frame |
| scroll progress | `components/layout/ScrollProgress.tsx` | AppShell only | |
| scroll restore | `components/layout/useScrollRestoration.ts` | AppShell only | |
| theme toggle | `components/layout/ThemeToggle.tsx` | Sidebar + **public pages** (auth, legal, capabilities, app-download, landing, SettingsPage) | NOT exclusively authenticated — visual edits would leak into T5 surfaces; leave untouched this wave |
| guest sheet chrome | `components/layout/GuestSheetChrome.tsx` | public pages only | NOT an authenticated seat |

Shell style seats (all mine): `styles/shell/{shell,chrome,sheet-frame}.css`,
`styles/student.css` (+ `styles/student/*`), `styles/teacher/*`,
`styles/admin.css`, `styles/owner.css`. `styles/app.css` is the PUBLIC
/app download sheet — not an authenticated seat (left untouched).

## 8 · Baseline measurement record (2026-06-24, own stack)

Commands (from the worktree root, vite on 5306 `--strictPort`):

```
node scripts/conformance/pages-student.mjs --url http://localhost:5306/ \
  --routes <30 student-family routes> --bps 1440,390            # light
node scripts/conformance/pages-student.mjs … --dark             # dark (+/settings,/vision)
node scripts/conformance/pages-teacher.mjs --url http://localhost:5306/ \
  --routes <21 teacher routes> --bps 1440,390                   # light
```

Result snapshots: `baselines/pages-student-light+dark-2026W1.json`,
`scripts/conformance/pages-teacher-results.json` (copied into
`baselines/pages-teacher-light-2026W1.json`).

Summary:

* student family: 60 light cells — 56 ≥ 98, `/student/payment` 98.1,
  `/student/social` 98.4; sub-floor ONLY `/training` and `/achievements`
  (96.7 @1440, **80.0 @390**: pattern numeral absent + hover-CTA absent at
  390). Dark mirrors the same two, plus `/student/university` darkInk 88–89
  (still ≥ 97.5 overall).
* teacher family: 42 light cells, worst 99.0 — all ≥ floor.
* shared any-authed seats measured through the student harness:
  `/settings` 98.0/97.9 dark; `/community` 99.0/99.5 light + dark;
  `/vision` 96.7/80.0 (T5 file — handed off, not fixed here).

## 9 · Wave-2 handoff (files NOT touched this wave)

admin/** (16 routes), owner/** (15 routes), quality/** (10 routes),
exams/** (3 seats incl. the QUALITY moderation mount), vision/**,
competitions/**, document viewer, community files — see NOTES.md for the
handoff note and current scores.
