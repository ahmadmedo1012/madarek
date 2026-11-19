# QA — page ledger v3 (R369)

The 108-route authenticated inventory (wave-6 route table, `docs/audit/evidence/wave6-notes/inventory.md`)
re-measured on `agent/r369-product` after the R369 C-lane passes. 94 route-mounts carry a full
page-conformance matrix (worst cell over {1440,768,390} × light+dark, floor 90); the rest are
redirect rows or e2e-covered detail flows. Evidence JSONs: `docs/audit/evidence/r369/**`.

Method: `scripts/conformance/pages-{authed,teacher,owner,quality,registrar}.mjs` (the D6 hermetic
seeded-session harness — real e2e fixture transport, no backend). Axes: typeRungs/spacing/pattern/
darkInk/edge390/hover. The r369 C-lane changes that lifted the worst cells: the UserAvatar mono-rung
root fix (every family), the D11 gutter-numeral/eyebrow/accent-CTA grammar on the 5 admin routes +
mooc/webinars/vision, the AA text seats (iw-hint links, error copy), the state-independent mooc
SectionBar, and A's mail/directory honest fixtures + the form-control rung.

Round summary: baseline worst cells — admin family 72.9 (import @768), student 80.0 (mooc/vision
@390) — every matrix cell now ≥ 95.1 (admin) / ≥ 96.7 (student) / ≥ 99.0 (teacher) / ≥ 99.3
(quality) / ≥ 99.4 (owner). Hostile-content stress (overlap.mjs --stress --popovers, 5 roles ×
{360×640,1440×900} × light+dark + the top-25 at {320, 640×360, 844×390}): ZERO findings.
Focus-clip: 0. 200 % text scale on dashboards + form routes: 0. CLS ≤ 0.05 on the top-16 pages
(measured 0.0000). axe serious/critical: 0. LoAF (4× CPU, production build, 3 runs): worst 0 ms on
/student/{dashboard,courses,library} × {1440,390}.

| route | family | guard | owning file | page family | coverage | worst cell | note |
|---|---|---|---|---|---|---|---|
**student — 42 rows**

| route | family | guard | owning file | page family | coverage | worst cell | note |
|---|---|---|---|---|---|---|---|
| `/student/dashboard` | student | STUDENT | DashboardPage | dashboard | matrix | 99.4 |  |
| `/student/calendar` | student | STUDENT | CalendarPage | calendar | matrix | 99.6 |  |
| `/student/courses` | student | STUDENT | CoursesPage | list | matrix | 99.3 |  |
| `/student/catalog` | student | STUDENT | CatalogPage | list | matrix | 99.6 |  |
| `/student/schedule` | student | STUDENT | MorePages | list | matrix | 99.2 |  |
| `/student/results` | student | STUDENT | MorePages | list/detail | matrix | 99.7 |  |
| `/student/library` | student | STUDENT | LibraryPage | list | matrix | 99 | R369: library fixtures wired — the data state finally measured (was 501-retry error state) |
| `/student/mooc` | student | STUDENT | MoocPage | list | matrix | 98.4 | R369: bar hoisted state-independent + header CTA (baseline 80.0 @390 fixed → 98.4+) |
| `/student/jobs` | student | STUDENT | JobsPage | list | matrix | 99.2 |  |
| `/student/ai` | student | STUDENT | AiAssistantPage | tool | matrix | 99.1 |  |
| `/student/gamification` | student | STUDENT | MorePages | list/detail | matrix | 98.8 |  |
| `/student/skills` | student | STUDENT | MorePages | list | matrix | 99.2 |  |
| `/student/alerts` | student | STUDENT | MorePages | list | matrix | 99.4 |  |
| `/student/messages` | student | STUDENT | MessagesPage | list/detail | matrix | 99.2 |  |
| `/student/ar` | student | STUDENT | MorePages | list | matrix | 100 |  |
| `/student/social` | student | STUDENT | MorePages | list | matrix | 96.7 |  |
| `/student/downloads` | student | STUDENT | MorePages | list | matrix | 99.2 |  |
| `/student/university` | student | STUDENT | MorePages | detail | matrix | 99.5 |  |
| `/student/live` | student | STUDENT | LivePage | list | matrix | 100 |  |
| `/student/payment` | student | STUDENT | PaymentPage | form | matrix | 98.1 |  |
| `/student/map` | student | STUDENT | CampusMapPage | detail | matrix | 98.9 |  |
| `/student/courses/:offeringId` | student | STUDENT | CourseDetailPage | detail | e2e/fixtures | e2e |  |
| `/student/lectures/:lectureId` | student | STUDENT | LecturePlayerPage | detail/player | e2e/fixtures | e2e |  |
| `/student/matrix` | student | STUDENT | MatrixPage | dashboard/list | matrix | 99.6 |  |
| `/student/research` | student | STUDENT | ResearchPage | list/form | matrix | 99.5 |  |
| `/student/profile` | student | STUDENT | ProfilePage | form/detail | matrix | 99.2 |  |
| `/student/webinars` | student | STUDENT | WebinarsPage | list | matrix | 98.6 | R369: header accent CTA (the rail link sat below the fold; baseline 82.4 → 98.6+) |
| `/student/online-exams` | student | STUDENT | OnlineExamsPages | list | matrix | 98.9 |  |
| `/student/online-exams/:id` | student | STUDENT | OnlineExamsPages | form | matrix | 100 |  |
| `/student/labs` | student | STUDENT | LabsPage | list | matrix | 99.4 |  |
| `/training` | student | STUDENT | TrainingPages | list | matrix | 99.5 |  |
| `/training/:slug` | student | STUDENT | TrainingPages | detail | e2e/fixtures | e2e |  |
| `/training/:slug/lesson/:lessonId` | student | STUDENT | TrainingPages | detail/form | e2e/fixtures | e2e |  |
| `/achievements` | student | STUDENT | TrainingPages | list | matrix | 100 |  |
| `/community` | student | STUDENT | CommunityPages | list/feed | matrix | 99 |  |
| `/student/exams` | student | redirect (r281) | — | redirect | redirect | — |  |
| `/student/training` | student | redirect (r281) | — | redirect | redirect | — |  |
| `/student/training/:slug` | student | redirect (r281) | — | redirect | redirect | — |  |
| `/student/training/:slug/lesson/:lessonId` | student | redirect (r281) | — | redirect | redirect | — |  |
| `/student/achievements` | student | redirect (r281) | — | redirect | redirect | — |  |
| `/student/community` | student | redirect (r281) | — | redirect | redirect | — |  |
| `/student/colleges` | student | redirect (r281) | — | redirect | redirect | — |  |

**teacher — 21 rows**

| route | family | guard | owning file | page family | coverage | worst cell | note |
|---|---|---|---|---|---|---|---|
| `/teacher/dashboard` | teacher | TEACHER | TeacherDashboardPage | dashboard | matrix | 100 |  |
| `/teacher/schedule` | teacher | TEACHER | TeacherPages | list | matrix | 100 |  |
| `/teacher/attendance` | teacher | TEACHER | TeacherPages | form/list | matrix | 100 |  |
| `/teacher/grades` | teacher | TEACHER | TeacherPages | form/list | matrix | 100 |  |
| `/teacher/materials` | teacher | TEACHER | TeacherPages | list | matrix | 100 |  |
| `/teacher/research` | teacher | TEACHER | ResearchReviewPage+TeacherPages | list/detail | matrix | 100 |  |
| `/teacher/students` | teacher | TEACHER | TeacherPages | list | matrix | 100 |  |
| `/teacher/performance` | teacher | TEACHER | TeacherPages | dashboard | matrix | 100 |  |
| `/teacher/assignments` | teacher | TEACHER | TeacherPages | list/form | matrix | 100 |  |
| `/teacher/exams` | teacher | TEACHER | ExamAuthorPages | list/form | matrix | 100 |  |
| `/teacher/exams/:templateId` | teacher | TEACHER | ExamAuthorPages | detail | matrix | 100 |  |
| `/teacher/messages` | teacher | TEACHER | TeacherPages | list/detail | matrix | 99.5 |  |
| `/teacher/ai` | teacher | TEACHER | AiAssistantPage (SHARED) | tool | matrix | 99.1 |  |
| `/teacher/library` | teacher | TEACHER | LibraryPage (SHARED) | list | matrix | 99 |  |
| `/teacher/alerts` | teacher | TEACHER | MorePages (SHARED) | list | matrix | 99.4 |  |
| `/teacher/intelligence` | teacher | TEACHER | TeacherIntelligencePage | dashboard/list | matrix | 100 |  |
| `/teacher/intelligence/:offeringId` | teacher | TEACHER | TeacherIntelligencePage | detail | matrix | 100 |  |
| `/teacher/profile` | teacher | TEACHER | TeacherProfilePage | form/detail | matrix | 100 |  |
| `/teacher/live` | teacher | TEACHER | TeacherLivePage | list/form | matrix | 100 |  |
| `/teacher/labs` | teacher | TEACHER | TeacherLabsPage | list | matrix | 100 |  |
| `/teacher/community` | teacher | TEACHER | CommunityPages (T5 mount) | feed | matrix | 99 |  |

**admin/registrar — 16 rows**

| route | family | guard | owning file | page family | coverage | worst cell | note |
|---|---|---|---|---|---|---|---|
| `/admin/dashboard` | admin/registrar | ADMIN | AdminPages | dashboard | matrix | 100 |  |
| `/admin/students` | admin/registrar | ADMIN | AdminExtraPages | list | matrix | 98.9 |  |
| `/admin/directory` | admin/registrar | ADMIN | PeoplePages | list | matrix | 95.1 | A fixture follow-up: the seeded register renders (was error-state) |
| `/admin/people/:id` | admin/registrar | ADMIN | PeoplePages | detail | matrix | 100 |  |
| `/admin/teachers` | admin/registrar | ADMIN | AdminGovernancePages | list | matrix | 100 |  |
| `/admin/permissions/:id` | admin/registrar | ADMIN | AdminGovernancePages | form | matrix | 100 |  |
| `/admin/community` | admin/registrar | ADMIN | CommunityPages (T5 mount) | feed | matrix | 99 |  |
| `/admin/faculties` | admin/registrar | ADMIN | AdminPages | list/form | matrix | 99.3 |  |
| `/admin/courses` | admin/registrar | ADMIN | AdminPages | list | matrix | 99.1 |  |
| `/admin/analysis` | admin/registrar | ADMIN | AdminExtraPages | redirect→reports | matrix | 100 | redirects to /admin/reports (?trend=table, 5-B4) |
| `/admin/digital` | admin/registrar | ADMIN | AdminExtraPages | list | matrix | 100 |  |
| `/admin/reports` | admin/registrar | ADMIN | AdminPages | dashboard | matrix | 100 |  |
| `/admin/settings` | admin/registrar | ADMIN | AdminExtraPages | form | matrix | 100 |  |
| `/admin/mail` | admin/registrar | ADMIN | AdminMailPage | dashboard/list | matrix | 100 | A fixture follow-up: the real console renders (was error-state) |
| `/admin/import` | admin/registrar | ADMIN | ImportWizardPage | form (wizard) | matrix | 100 |  |
| `/admin/alerts` | admin/registrar | ADMIN | MorePages (SHARED) | list | matrix | 98.9 |  |

**owner — 14 rows**

| route | family | guard | owning file | page family | coverage | worst cell | note |
|---|---|---|---|---|---|---|---|
| `/owner/dashboard` | owner | OWNER | OwnerPages | dashboard | matrix | 100 |  |
| `/owner/users` | owner | OWNER | OwnerPages | list | matrix | 100 |  |
| `/owner/institutions` | owner | OWNER | OwnerPages | list | matrix | 100 |  |
| `/owner/institutions/:slug` | owner | OWNER | OwnerPages | detail/form | matrix | 100 |  |
| `/owner/activity` | owner | OWNER | OwnerPages | list | matrix | 100 |  |
| `/owner/content` | owner | OWNER | OwnerPages | list | matrix | 100 |  |
| `/owner/system` | owner | OWNER | OwnerPages | dashboard | matrix | 100 |  |
| `/owner/education` | owner | OWNER | OwnerPages | dashboard | matrix | 100 |  |
| `/owner/realtime` | owner | OWNER | OwnerPages | dashboard | matrix | 100 |  |
| `/owner/ai` | owner | OWNER | OwnerPages | dashboard | matrix | 100 |  |
| `/owner/notifications` | owner | OWNER | MorePages (SHARED) | list | matrix | 99.4 |  |
| `/owner/alerts` | owner | OWNER | OwnerPages | list | matrix | 100 |  |
| `/owner/governance` | owner | OWNER | OwnerPages | list | matrix | 100 |  |
| `/owner/feedback` | owner | OWNER | FeedbackInboxPage | list/detail | matrix | 100 |  |

**quality — 10 rows**

| route | family | guard | owning file | page family | coverage | worst cell | note |
|---|---|---|---|---|---|---|---|
| `/quality/dashboard` | quality | QUALITY | QualityPages | dashboard | matrix | 100 |  |
| `/quality/courses` | quality | QUALITY | QualityPages | list | matrix | 100 |  |
| `/quality/professors` | quality | QUALITY | QualityPages | list | matrix | 100 |  |
| `/quality/engagement` | quality | QUALITY | QualityPages | dashboard | matrix | 100 |  |
| `/quality/reports` | quality | QUALITY | QualityPages | dashboard | matrix | 100 |  |
| `/quality/curriculum` | quality | QUALITY | QualityPages | list/form | matrix | 100 |  |
| `/quality/notifications` | quality | QUALITY | MorePages (SHARED) | list | matrix | 99.4 |  |
| `/quality/alerts` | quality | QUALITY | QualityPages | list | matrix | 100 |  |
| `/quality/exam-moderation` | quality | QUALITY | OnlineExamsPages | list/detail | matrix | 100 |  |
| `/quality/community` | quality | QUALITY | CommunityPages (T5 mount) | feed | matrix | 99.3 |  |

**any-authed — 6 rows**

| route | family | guard | owning file | page family | coverage | worst cell | note |
|---|---|---|---|---|---|---|---|
| `/settings` | any-authed | ProtectedRoute | SettingsPage | form | matrix | 97.9 |  |
| `/vision` | any-authed | ProtectedRoute | VisionPages | gallery/list | matrix | 100 | R369: h1 [01] + header CTA (baseline 80.0 → 100) |
| `/vision/:slug` | any-authed | ProtectedRoute | VisionPages | detail | e2e | e2e |  |
| `/document/:filename` | any-authed | ProtectedRoute | DocumentViewerPage | detail | e2e | e2e |  |
| `/competitions` | any-authed | ProtectedRoute | CompetitionsPages | list | e2e | e2e |  |
| `/competitions/:id` | any-authed | ProtectedRoute | CompetitionsPages | detail | e2e | e2e |  |

