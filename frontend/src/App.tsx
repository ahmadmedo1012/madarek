import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { queryClient } from './lib/queryClient';
import { AppShell, ProtectedRoute } from './components/layout/AppShell';
import { useAuthStore, type AppRole } from './stores/auth.store';
import { HydrationSplash } from './components/HydrationSplash';
import { PageSkeleton } from './components/primitives/States';
import { RouteErrorBoundary } from './components/ErrorBoundary';
import { ToastStack } from './components/overlays/Toast';
import { Icon } from './components/Icon';

/* ───────────────────────────────────────────────────────────
   Lazy-load every route component. Each `lazy(...)` boundary
   becomes its own chunk at build time, so the initial load
   only ships the shell + the first page the user lands on.
   ─────────────────────────────────────────────────────────── */
const LandingPage = lazy(() => import('./pages/LandingPage'));
/* r152j (A7): NotFoundPage used to be the ONE static route import —
   violating this file's own lazy contract and dragging the
   Illustration + the whole 10-scene registry into the entry chunk
   (~10-15KB gz on every first paint, the public landing included).
   It now rides the same lazy boundary as its siblings. */
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

const StudentDashboardPage = lazy(() => import('./pages/student/DashboardPage'));
const StudentCoursesPage = lazy(() => import('./pages/student/CoursesPage'));
const LibraryPage = lazy(() => import('./pages/student/LibraryPage'));
const MoocPage = lazy(() => import('./pages/student/MoocPage'));
const JobsPage = lazy(() => import('./pages/student/JobsPage'));
const AiAssistantPage = lazy(() => import('./pages/student/AiAssistantPage'));
const CourseDetailPage = lazy(() => import('./pages/student/CourseDetailPage'));
const LecturePlayerPage = lazy(() => import('./pages/student/LecturePlayerPage'));
const MatrixPage = lazy(() => import('./pages/student/MatrixPage'));
const StudentResearchPage = lazy(() => import('./pages/student/ResearchPage'));
const ProfilePage = lazy(() => import('./pages/student/ProfilePage'));
const WebinarsPage = lazy(() => import('./pages/student/WebinarsPage'));
const DocumentViewerPage = lazy(() => import('./pages/DocumentViewerPage'));
const LabsPage = lazy(() => import('./pages/student/LabsPage'));
const LivePage = lazy(() => import('./pages/student/LivePage'));
const PaymentPage = lazy(() => import('./pages/student/PaymentPage'));
const CampusMapPage = lazy(() => import('./pages/student/CampusMapPage'));

// MorePages exports several named components — bundle them as one lazy chunk
// by importing the module once and re-exporting each as a thin lazy wrapper.
const GamificationPage = lazy(() => import('./pages/student/MorePages').then((m) => ({ default: m.GamificationPage })));
const SkillsPage = lazy(() => import('./pages/student/MorePages').then((m) => ({ default: m.SkillsPage })));
const AlertsPage = lazy(() => import('./pages/student/MorePages').then((m) => ({ default: m.AlertsPage })));
const SchedulePage = lazy(() => import('./pages/student/MorePages').then((m) => ({ default: m.SchedulePage })));
const ResultsPage = lazy(() => import('./pages/student/MorePages').then((m) => ({ default: m.ResultsPage })));
const ArVrPage = lazy(() => import('./pages/student/MorePages').then((m) => ({ default: m.ArVrPage })));
const SocialPage = lazy(() => import('./pages/student/MorePages').then((m) => ({ default: m.SocialPage })));
const DownloadsPage = lazy(() => import('./pages/student/MorePages').then((m) => ({ default: m.DownloadsPage })));
const UniversityInfoPage = lazy(() => import('./pages/student/MorePages').then((m) => ({ default: m.UniversityInfoPage })));

const TrainingCatalogPage = lazy(() => import('./pages/student/TrainingPages'));
const TrainingTrackPage = lazy(() => import('./pages/student/TrainingPages').then((m) => ({ default: m.TrainingTrackPage })));
const TrainingLessonPage = lazy(() => import('./pages/student/TrainingPages').then((m) => ({ default: m.TrainingLessonPage })));
const AchievementsPage = lazy(() => import('./pages/student/TrainingPages').then((m) => ({ default: m.AchievementsPage })));

const TeacherIntelligencePage = lazy(() => import('./pages/teacher/TeacherIntelligencePage'));
const TeacherOfferingDetailPage = lazy(() => import('./pages/teacher/TeacherIntelligencePage').then((m) => ({ default: m.TeacherOfferingDetailPage })));
const TeacherProfilePage = lazy(() => import('./pages/teacher/TeacherProfilePage'));
const TeacherLivePage = lazy(() => import('./pages/teacher/TeacherLivePage'));
const TeacherLabsPage = lazy(() => import('./pages/teacher/TeacherLabsPage'));
const OnlineExamsPage = lazy(() => import('./pages/exams/OnlineExamsPages'));
const ExamTakerPage = lazy(() => import('./pages/exams/OnlineExamsPages').then((m) => ({ default: m.ExamTakerPage })));
const ExamModerationPage = lazy(() => import('./pages/exams/OnlineExamsPages').then((m) => ({ default: m.ExamModerationPage })));

// 18-F1 — unified exam authoring (question bank + templates + moderation).
// r141: restored after 761eaf4 dropped the two route rows (nav kept its
// entry → dead click). Pinned by tests/unit/nav-routes-consistency.test.tsx.
const ExamAuthoringPage = lazy(() => import('./pages/teacher/ExamAuthorPages'));
const ExamTemplateDetailPage = lazy(() => import('./pages/teacher/ExamAuthorPages').then((m) => ({ default: m.ExamTemplateDetailPage })));

const CommunityPage = lazy(() => import('./pages/community/CommunityPages'));

const AdminTeachersPage = lazy(() => import('./pages/admin/AdminGovernancePages').then((m) => ({ default: m.AdminTeachersPage })));
const AdminPermissionsPage = lazy(() => import('./pages/admin/AdminGovernancePages').then((m) => ({ default: m.AdminPermissionsPage })));
const AdminSyncPage = lazy(() => import('./pages/admin/AdminSyncPage').then((m) => ({ default: m.AdminSyncPage })));

const TeacherSchedulePage = lazy(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.TeacherSchedulePage })));
const AttendancePage = lazy(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.AttendancePage })));
const GradesPage = lazy(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.GradesPage })));
const MaterialsPage = lazy(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.MaterialsPage })));
const ResearchPage = lazy(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.ResearchPage })));
const StudentsListPage = lazy(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.StudentsListPage })));
const PerformancePage = lazy(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.PerformancePage })));
const AssignmentsPage = lazy(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.AssignmentsPage })));
const MessagesPage = lazy(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.MessagesPage })));

const TeacherDashboardPage = lazy(() => import('./pages/teacher/TeacherDashboardPage').then((m) => ({ default: m.TeacherDashboardPage })));

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminDashboardPage })));
const AdminFacultiesPage = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminFacultiesPage })));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminReportsPage })));
const AdminCoursesPage = lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminCoursesPage })));

const AdminStudentsPage = lazy(() => import('./pages/admin/AdminExtraPages').then((m) => ({ default: m.AdminStudentsPage })));
const AdminAnalysisPage = lazy(() => import('./pages/admin/AdminExtraPages').then((m) => ({ default: m.AdminAnalysisPage })));
const AdminDigitalPage = lazy(() => import('./pages/admin/AdminExtraPages').then((m) => ({ default: m.AdminDigitalPage })));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminExtraPages').then((m) => ({ default: m.AdminSettingsPage })));

const QualityDashboardPage = lazy(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityDashboardPage })));
const QualityCoursesPage = lazy(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityCoursesPage })));
const QualityProfessorsPage = lazy(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityProfessorsPage })));
const QualityEngagementPage = lazy(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityEngagementPage })));
const QualityCurriculumPage = lazy(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityCurriculumPage })));
const QualityReportsPage = lazy(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityReportsPage })));
const QualityAlertsPage = lazy(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityAlertsPage })));

const OwnerDashboardPage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerDashboardPage })));
const OwnerUsersPage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerUsersPage })));
const OwnerActivityPage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerActivityPage })));
const OwnerContentPage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerContentPage })));
const OwnerSystemPage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerSystemPage })));
const OwnerEducationPage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerEducationPage })));
const OwnerRealtimePage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerRealtimePage })));
const OwnerAiPage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerAiPage })));
const OwnerAlertsPage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerAlertsPage })));
const OwnerGovernancePage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerGovernancePage })));

const VisionGalleryPage = lazy(() => import('./pages/vision/VisionPages').then((m) => ({ default: m.VisionGalleryPage })));
const VisionDetailPage = lazy(() => import('./pages/vision/VisionPages').then((m) => ({ default: m.VisionDetailPage })));

const CollegesIndexPage = lazy(() => import('./pages/colleges/CollegePages').then((m) => ({ default: m.CollegesIndexPage })));
const CollegeDetailPage = lazy(() => import('./pages/colleges/CollegePages').then((m) => ({ default: m.CollegeDetailPage })));
const CollegesLeaderboardPage = lazy(() => import('./pages/colleges/CollegePages').then((m) => ({ default: m.CollegesLeaderboardPage })));

const CompetitionsIndexPage = lazy(() => import('./pages/competitions/CompetitionsPages').then((m) => ({ default: m.CompetitionsIndexPage })));
const CompetitionDetailPage = lazy(() => import('./pages/competitions/CompetitionsPages').then((m) => ({ default: m.CompetitionDetailPage })));

/** Resolves the home path for an authenticated user, or `/` for guests. */
function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return <HydrationSplash />;
  if (!user) return <LandingPage />;
  const HOME: Record<AppRole, string> = {
    STUDENT: '/student/dashboard',
    TEACHER: '/teacher/dashboard',
    ADMIN: '/admin/dashboard',
    QUALITY: '/quality/dashboard',
    OWNER: '/owner/dashboard',
  };
  return <Navigate to={HOME[user.role]} replace />;
}

/** Public colleges layout (audit 4-A14 P1-2, restored r154a).
 *
 * The colleges gallery / leaderboard / detail pages are world-readable
 * (public university info — the landing page already previews them).
 * Signed-in visitors keep the full app shell; guests get the same page
 * content in a chrome-less container, because the shell's sidebar and
 * bottom-nav are auth-only and the shell grid reserves a sidebar track
 * that would otherwise render as a blank column. The back link keeps
 * the guest funnel from dead-ending.
 *
 * r154a: this layout was deleted silently by 761eaf4 (an aria-invalid
 * polish commit whose message never mentioned colleges), which pushed
 * the three /colleges* routes under a bare <ProtectedRoute/> and
 * bounced every guest to /auth — killing the public funnel the backend
 * still serves. Restored verbatim. */
function CollegesLayout() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  if (!isHydrated) return <HydrationSplash />;
  if (user) return <AppShell />;
  return (
    <main id="main" className="content-inner">
      <div style={{ marginBlockEnd: 'var(--sp-6)' }}>
        <Link to="/" className="btn ghost sm">
          <Icon icon={ArrowRight} size={14} />
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
      <Outlet />
    </main>
  );
}

/**
 * The route table, extracted so it can be rendered under a `MemoryRouter`
 * in unit tests (see tests/unit/App-routes.test.tsx).
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        {/* /auth is the canonical login route; /login is a legacy alias. */}
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/" element={<HomeRedirect />} />

        {/* Labs preview — role-permissive mount (A6 P1, wave 22-a;
            restored r155c). /student/labs used to sit inside the
            STUDENT-only block, which made «معاينة كطالب» — the ONLY
            per-card CTA on /teacher/labs — silently bounce every
            teacher back to their dashboard. 761eaf4 dropped this
            widened mount in an unrelated aria-invalid polish commit
            while TeacherLabsPage.tsx's own doc comment still
            documented it, so the CTA shipped as a dead link. The
            page is the same labs explorer for both roles: the
            catalog endpoint is unscoped and the /me/lab-sessions
            KPI endpoint is auth-only with a graceful empty shape
            for users without a student profile
            (student-dashboard.routes.ts), so a teacher gets an
            honest preview (0 recorded sessions) and can run the
            client-side experiments. Documented deviation: this is
            the single intentional widening of a /student/* path;
            the shell/nav stay role-based. Pinned by
            tests/unit/App-routes.test.tsx (teacher labs preview
            access). */}
        <Route element={<ProtectedRoute allow={['STUDENT', 'TEACHER']} />}>
          <Route element={<AppShell />}>
            <Route path="/student/labs" element={<LabsPage />} />
          </Route>
        </Route>

        {/* Student */}
        <Route element={<ProtectedRoute allow={['STUDENT']} />}>
          <Route element={<AppShell />}>
            <Route path="/student/dashboard" element={<StudentDashboardPage />} />
            <Route path="/student/courses" element={<StudentCoursesPage />} />
            <Route path="/student/schedule" element={<SchedulePage />} />
            <Route path="/student/results" element={<ResultsPage />} />
            <Route path="/student/library" element={<LibraryPage />} />
            <Route path="/student/mooc" element={<MoocPage />} />
            <Route path="/student/jobs" element={<JobsPage />} />
            <Route path="/student/ai" element={<AiAssistantPage />} />
            <Route path="/student/gamification" element={<GamificationPage />} />
            <Route path="/student/skills" element={<SkillsPage />} />
            <Route path="/student/alerts" element={<AlertsPage />} />
            <Route path="/student/ar" element={<ArVrPage />} />
            <Route path="/student/social" element={<SocialPage />} />
            <Route path="/student/downloads" element={<DownloadsPage />} />
            <Route path="/student/university" element={<UniversityInfoPage />} />
            <Route path="/student/live" element={<LivePage />} />
            <Route path="/student/payment" element={<PaymentPage />} />
            <Route path="/student/map" element={<CampusMapPage />} />
            <Route path="/student/courses/:offeringId" element={<CourseDetailPage />} />
            <Route path="/student/lectures/:lectureId" element={<LecturePlayerPage />} />
            <Route path="/student/matrix" element={<MatrixPage />} />
            <Route path="/student/research" element={<StudentResearchPage />} />
            <Route path="/student/profile" element={<ProfilePage />} />
            <Route path="/student/webinars" element={<WebinarsPage />} />
            <Route path="/student/exams" element={<Navigate to="/student/online-exams" replace />} />
            <Route path="/training" element={<TrainingCatalogPage />} />
            <Route path="/training/:slug" element={<TrainingTrackPage />} />
            <Route path="/training/:slug/lesson/:lessonId" element={<TrainingLessonPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/student/online-exams" element={<OnlineExamsPage />} />
            <Route path="/student/online-exams/:id" element={<ExamTakerPage />} />
            <Route path="/community" element={<CommunityPage />} />
          </Route>
        </Route>

        {/* Teacher */}
        <Route element={<ProtectedRoute allow={['TEACHER']} />}>
          <Route element={<AppShell />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
            <Route path="/teacher/schedule" element={<TeacherSchedulePage />} />
            <Route path="/teacher/attendance" element={<AttendancePage />} />
            <Route path="/teacher/grades" element={<GradesPage />} />
            <Route path="/teacher/materials" element={<MaterialsPage />} />
            <Route path="/teacher/research" element={<ResearchPage />} />
            <Route path="/teacher/students" element={<StudentsListPage />} />
            <Route path="/teacher/performance" element={<PerformancePage />} />
            <Route path="/teacher/assignments" element={<AssignmentsPage />} />
            <Route path="/teacher/exams" element={<ExamAuthoringPage />} />
            <Route path="/teacher/exams/:templateId" element={<ExamTemplateDetailPage />} />
            <Route path="/teacher/messages" element={<MessagesPage />} />
            <Route path="/teacher/ai" element={<AiAssistantPage />} />
            <Route path="/teacher/library" element={<LibraryPage />} />
            <Route path="/teacher/alerts" element={<AlertsPage />} />
            <Route path="/teacher/intelligence" element={<TeacherIntelligencePage />} />
            <Route path="/teacher/intelligence/:offeringId" element={<TeacherOfferingDetailPage />} />
            <Route path="/teacher/profile" element={<TeacherProfilePage />} />
            <Route path="/teacher/live" element={<TeacherLivePage />} />
            <Route path="/teacher/labs" element={<TeacherLabsPage />} />
            <Route path="/teacher/community" element={<CommunityPage />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute allow={['ADMIN']} />}>
          <Route element={<AppShell />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/students" element={<AdminStudentsPage />} />
            <Route path="/admin/teachers" element={<AdminTeachersPage />} />
            <Route path="/admin/permissions/:id" element={<AdminPermissionsPage />} />
            <Route path="/admin/sync" element={<AdminSyncPage />} />
            <Route path="/admin/community" element={<CommunityPage />} />
            <Route path="/admin/faculties" element={<AdminFacultiesPage />} />
            <Route path="/admin/courses" element={<AdminCoursesPage />} />
            <Route path="/admin/analysis" element={<AdminAnalysisPage />} />
            <Route path="/admin/digital" element={<AdminDigitalPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/alerts" element={<AlertsPage />} />
          </Route>
        </Route>

        {/* Quality */}
        <Route element={<ProtectedRoute allow={['QUALITY', 'ADMIN']} />}>
          <Route element={<AppShell />}>
            <Route path="/quality/dashboard" element={<QualityDashboardPage />} />
            <Route path="/quality/courses" element={<QualityCoursesPage />} />
            <Route path="/quality/professors" element={<QualityProfessorsPage />} />
            <Route path="/quality/engagement" element={<QualityEngagementPage />} />
            <Route path="/quality/reports" element={<QualityReportsPage />} />
            <Route path="/quality/curriculum" element={<QualityCurriculumPage />} />
            <Route path="/quality/alerts" element={<QualityAlertsPage />} />
            <Route path="/quality/exam-moderation" element={<ExamModerationPage />} />
            <Route path="/quality/community" element={<CommunityPage />} />
          </Route>
        </Route>

        {/* Owner */}
        <Route element={<ProtectedRoute allow={['OWNER']} />}>
          <Route element={<AppShell />}>
            <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
            <Route path="/owner/users" element={<OwnerUsersPage />} />
            <Route path="/owner/activity" element={<OwnerActivityPage />} />
            <Route path="/owner/content" element={<OwnerContentPage />} />
            <Route path="/owner/system" element={<OwnerSystemPage />} />
            <Route path="/owner/education" element={<OwnerEducationPage />} />
            <Route path="/owner/realtime" element={<OwnerRealtimePage />} />
            <Route path="/owner/ai" element={<OwnerAiPage />} />
            <Route path="/owner/alerts" element={<OwnerAlertsPage />} />
            <Route path="/owner/governance" element={<OwnerGovernancePage />} />
          </Route>
        </Route>

        {/* Colleges — PUBLIC (audit 4-A14 P1-2, r154a): guests reach the
            gallery / leaderboard / detail pages in a chrome-less container;
            signed-in visitors keep the full app shell. The backend serves
            public + PII-narrowed data (colleges.routes.ts, mounted before
            the authed routers). 761eaf4 had silently pushed these under a
            bare <ProtectedRoute/> and bounced every guest to /auth. */}
        <Route element={<CollegesLayout />}>
          <Route path="/colleges" element={<CollegesIndexPage />} />
          <Route path="/colleges/leaderboard" element={<CollegesLeaderboardPage />} />
          <Route path="/colleges/:id" element={<CollegeDetailPage />} />
        </Route>

        {/* Vision (any authenticated role) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/vision" element={<VisionGalleryPage />} />
            <Route path="/vision/:slug" element={<VisionDetailPage />} />
            <Route path="/document/:filename" element={<DocumentViewerPage />} />
            <Route path="/competitions" element={<CompetitionsIndexPage />} />
            <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
          </Route>
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        {/* r143 (T1-h F6): unknown URLs land on the real 404 page — the
         * old catch-all silently bounced to the role home, so a typo or
         * stale link "disappeared" instead of saying it doesn't exist.
         * Authenticated users still reach their dashboard from there. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* r141: one router-aware boundary around the route tree — a
         * render error now lands on the tested fallback (retry / home)
         * instead of a white screen, and clears itself on navigation.
         * ToastStack sits OUTSIDE the boundary on purpose: toasts raised
         * just before a crash (e.g. a failed mutation) must stay visible
         * while the fallback renders. */}
        <RouteErrorBoundary>
          <AppRoutes />
        </RouteErrorBoundary>
        <ToastStack />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
