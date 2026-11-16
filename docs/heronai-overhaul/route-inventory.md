# Route inventory — feat/heronai-uiux-overhaul

استخراج ميكانيكي من `frontend/src/App.tsx` + `frontend/src/lib/routes.ts` — 128 تعريف مسار. القاعدة: `origin/main` عند `cf1f5954`.

الاستخدام: خريطة التغطية لعمل التوحيد البصري. المجموعات حسب أول شريحة في المسار؛ `allow` هو حارس `ProtectedRoute` الفعلي من الجدول (ليس تقديرًا).

## auth (5)

| path | component | guard |
|---|---|---|
| `/auth` | AuthPage | public |
| `/auth/register` | RegisterPage | public |
| `"/auth/forgot-password"` | ForgotPasswordPage | public |
| `"/auth/reset-password"` | ResetPasswordPage | public |
| `"/auth/verify-email"` | VerifyEmailPage | public |

## login (1)

| path | component | guard |
|---|---|---|
| `/login` | → /auth | public |

## register" (1)

| path | component | guard |
|---|---|---|
| `"/register"` | → /auth/register | public |

## universities" (1)

| path | component | guard |
|---|---|---|
| `"/universities"` | → /colleges | public |

## features" (1)

| path | component | guard |
|---|---|---|
| `"/features"` | → /capabilities | public |

## __brand" (1)

| path | component | guard |
|---|---|---|
| `"/__brand"` | BrandPage | public |

## __design" (1)

| path | component | guard |
|---|---|---|
| `"/__design"` | DesignPage | public |

## __plates" (1)

| path | component | guard |
|---|---|---|
| `"/__plates"` | PlatesPage | public |

## root (2)

| path | component | guard |
|---|---|---|
| `/` | HomeRedirect | public |
| `"*"` | NotFoundPage | OWNER |

## student (35)

| path | component | guard |
|---|---|---|
| `/student/labs` | LabsPage | STUDENT, TEACHER |
| `/student/dashboard` | StudentDashboardPage | STUDENT |
| `/student/calendar` | StudentCalendarPage | STUDENT |
| `/student/courses` | StudentCoursesPage | STUDENT |
| `/student/catalog` | CatalogPage | STUDENT |
| `/student/schedule` | SchedulePage | STUDENT |
| `/student/results` | ResultsPage | STUDENT |
| `/student/library` | LibraryPage | STUDENT |
| `/student/mooc` | MoocPage | STUDENT |
| `/student/jobs` | JobsPage | STUDENT |
| `/student/ai` | AiAssistantPage | STUDENT |
| `/student/gamification` | GamificationPage | STUDENT |
| `/student/skills` | SkillsPage | STUDENT |
| `/student/alerts` | AlertsPage | STUDENT |
| `/student/messages` | StudentMessagesPage | STUDENT |
| `/student/ar` | ArVrPage | STUDENT |
| `/student/social` | SocialPage | STUDENT |
| `/student/downloads` | DownloadsPage | STUDENT |
| `/student/university` | UniversityInfoPage | STUDENT |
| `/student/live` | LivePage | STUDENT |
| `/student/payment` | PaymentPage | STUDENT |
| `/student/map` | CampusMapPage | STUDENT |
| `"/student/courses/:offeringId"` | CourseDetailPage | STUDENT |
| `"/student/lectures/:lectureId"` | LecturePlayerPage | STUDENT |
| `/student/matrix` | MatrixPage | STUDENT |
| `/student/research` | StudentResearchPage | STUDENT |
| `/student/profile` | ProfilePage | STUDENT |
| `/student/webinars` | WebinarsPage | STUDENT |
| `"/student/exams"` | → /student/online-exams | STUDENT |
| `"/student/training"` | → /training | STUDENT |
| `"/student/achievements"` | → /achievements | STUDENT |
| `"/student/community"` | → /community | STUDENT |
| `"/student/colleges"` | → /colleges | STUDENT |
| `/student/online-exams` | OnlineExamsPage | STUDENT |
| `"/student/online-exams/:id"` | ExamTakerPage | STUDENT |

## training (3)

| path | component | guard |
|---|---|---|
| `/training` | TrainingCatalogPage | STUDENT |
| `"/training/:slug"` | TrainingTrackPage | STUDENT |
| `"/training/:slug/lesson/:lessonId"` | TrainingLessonPage | STUDENT |

## achievements (1)

| path | component | guard |
|---|---|---|
| `/achievements` | AchievementsPage | STUDENT |

## community (1)

| path | component | guard |
|---|---|---|
| `/community` | CommunityPage | STUDENT |

## teacher (21)

| path | component | guard |
|---|---|---|
| `/teacher/dashboard` | TeacherDashboardPage | TEACHER |
| `/teacher/schedule` | TeacherSchedulePage | TEACHER |
| `/teacher/attendance` | AttendancePage | TEACHER |
| `/teacher/grades` | GradesPage | TEACHER |
| `/teacher/materials` | MaterialsPage | TEACHER |
| `/teacher/research` | ResearchPage | TEACHER |
| `/teacher/students` | StudentsListPage | TEACHER |
| `/teacher/performance` | PerformancePage | TEACHER |
| `/teacher/assignments` | AssignmentsPage | TEACHER |
| `/teacher/exams` | ExamAuthoringPage | TEACHER |
| `"/teacher/exams/:templateId"` | ExamTemplateDetailPage | TEACHER |
| `/teacher/messages` | MessagesPage | TEACHER |
| `/teacher/ai` | AiAssistantPage | TEACHER |
| `/teacher/library` | LibraryPage | TEACHER |
| `/teacher/alerts` | AlertsPage | TEACHER |
| `/teacher/intelligence` | TeacherIntelligencePage | TEACHER |
| `"/teacher/intelligence/:offeringId"` | TeacherOfferingDetailPage | TEACHER |
| `/teacher/profile` | TeacherProfilePage | TEACHER |
| `/teacher/live` | TeacherLivePage | TEACHER |
| `/teacher/labs` | TeacherLabsPage | TEACHER |
| `/teacher/community` | CommunityPage | TEACHER |

## admin (16)

| path | component | guard |
|---|---|---|
| `/admin/dashboard` | AdminDashboardPage | ADMIN |
| `/admin/students` | AdminStudentsPage | ADMIN |
| `/admin/directory` | PeopleDirectoryPage | ADMIN |
| `/admin/people/:id` | StudentFilePage | ADMIN |
| `/admin/teachers` | AdminTeachersPage | ADMIN |
| `"/admin/permissions/:id"` | AdminPermissionsPage | ADMIN |
| `/admin/community` | CommunityPage | ADMIN |
| `/admin/faculties` | AdminFacultiesPage | ADMIN |
| `/admin/courses` | AdminCoursesPage | ADMIN |
| `"/admin/analysis"` | AdminAnalysisPage | ADMIN |
| `/admin/digital` | AdminDigitalPage | ADMIN |
| `/admin/reports` | AdminReportsPage | ADMIN |
| `/admin/settings` | AdminSettingsPage | ADMIN |
| `/admin/mail` | AdminMailPage | ADMIN |
| `/admin/import` | ImportWizardPage | ADMIN |
| `/admin/alerts` | AlertsPage | ADMIN |

## quality (10)

| path | component | guard |
|---|---|---|
| `/quality/dashboard` | QualityDashboardPage | QUALITY |
| `/quality/courses` | QualityCoursesPage | QUALITY |
| `/quality/professors` | QualityProfessorsPage | QUALITY |
| `/quality/engagement` | QualityEngagementPage | QUALITY |
| `/quality/reports` | QualityReportsPage | QUALITY |
| `/quality/curriculum` | QualityCurriculumPage | QUALITY |
| `/quality/notifications` | AlertsPage | QUALITY |
| `/quality/alerts` | QualityAlertsPage | QUALITY |
| `/quality/exam-moderation` | ExamModerationPage | QUALITY |
| `/quality/community` | CommunityPage | QUALITY |

## owner (14)

| path | component | guard |
|---|---|---|
| `/owner/dashboard` | OwnerDashboardPage | OWNER |
| `/owner/users` | OwnerUsersPage | OWNER |
| `/owner/institutions` | OwnerInstitutionsPage | OWNER |
| `"/owner/institutions/:slug"` | OwnerInstitutionDetailPage | OWNER |
| `/owner/activity` | OwnerActivityPage | OWNER |
| `/owner/content` | OwnerContentPage | OWNER |
| `/owner/system` | OwnerSystemPage | OWNER |
| `/owner/education` | OwnerEducationPage | OWNER |
| `/owner/realtime` | OwnerRealtimePage | OWNER |
| `/owner/ai` | OwnerAiPage | OWNER |
| `/owner/notifications` | AlertsPage | OWNER |
| `/owner/alerts` | OwnerAlertsPage | OWNER |
| `/owner/governance` | OwnerGovernancePage | OWNER |
| `/owner/feedback` | FeedbackInboxPage | OWNER |

## colleges (3)

| path | component | guard |
|---|---|---|
| `/colleges` | CollegesIndexPage | OWNER |
| `"/colleges/leaderboard"` | CollegesLeaderboardPage | OWNER |
| `"/colleges/:id"` | CollegeDetailPage | OWNER |

## vision (2)

| path | component | guard |
|---|---|---|
| `/vision` | VisionGalleryPage | OWNER |
| `"/vision/:slug"` | VisionDetailPage | OWNER |

## settings (1)

| path | component | guard |
|---|---|---|
| `/settings` | SettingsPage | OWNER |

## document (1)

| path | component | guard |
|---|---|---|
| `"/document/:filename"` | DocumentViewerPage | OWNER |

## competitions (2)

| path | component | guard |
|---|---|---|
| `/competitions` | CompetitionsIndexPage | OWNER |
| `"/competitions/:id"` | CompetitionDetailPage | OWNER |

## 404" (1)

| path | component | guard |
|---|---|---|
| `"/404"` | NotFoundPage | OWNER |

## 500" (1)

| path | component | guard |
|---|---|---|
| `"/500"` | Error500Page | OWNER |

## 403" (1)

| path | component | guard |
|---|---|---|
| `"/403"` | Error403Page | OWNER |

## maintenance" (1)

| path | component | guard |
|---|---|---|
| `"/maintenance"` | MaintenancePage | OWNER |

