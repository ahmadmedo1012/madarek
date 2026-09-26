import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { ArrowRight } from 'lucide-react';
import { queryClient } from './lib/queryClient';
import { useAuthStore, type AppRole } from './stores/auth.store';
import { HydrationSplash } from './components/HydrationSplash';
import { PageSkeleton } from './components/primitives/States';
import { Icon } from './components/Icon';
import { RouteErrorBoundary, isChunkLoadError } from './components/ErrorBoundary';
import { ToastStack } from './components/overlays';
import NotFoundPage from './pages/NotFoundPage';

/* ───────────────────────────────────────────────────────────
   Chunk-resilient lazy loading (5-C3, A9 P2-3)

   A lazy route whose chunk fails to fetch used to reject straight
   into the root RouteErrorBoundary: offline navigation to an
   unvisited route killed the whole shell with a misdiagnosed
   «خلل غير متوقّع» screen that stayed up even after the connection
   returned (A9 V7). Every loader now goes through loadChunk:

   - OFFLINE: the import parks on the browser's `online` event and
     retries once it fires. The promise stays pending while offline,
     so the nearest Suspense keeps its fallback — the shell (sidebar,
     topbar, notifications) stays alive with a skeleton in the content
     track, and the route renders BY ITSELF when connectivity
     returns. No crash screen, no manual reload, honest loading.
   - ONLINE: short spaced retries (a deploy race can serve a rotating
     chunk exactly once), then the rejection surfaces to the boundary,
     whose chunk-aware branch renders «تعذّر تحميل هذا القسم» with a
     working reload instead of the generic crash copy.
   - MODULE-MAP REALITY (live-measured): a failed dynamic import is
     memoized by the browser's module map for its exact URL — calling
     import() on the same specifier again rejects instantly WITHOUT a
     network request, so a naive "call load() again" ladder can never
     recover an offline failure (4 retries → 1 request total). When
     the error message carries the module URL (Chromium), each retry
     re-imports that URL with a fresh cache-buster so the fetch
     actually fires; without a URL (Firefox/Safari phrasing) the
     original loader is retried and the boundary's reload — which
     resets the module map — remains the recovery path.
   ─────────────────────────────────────────────────────────── */
function waitForReconnect(): Promise<void> {
  return new Promise((resolve) => {
    window.addEventListener('online', () => resolve(), { once: true });
  });
}

/** Best-effort extraction of the module URL from a Chromium dynamic-
 * import failure («Failed to fetch dynamically imported module:
 * <url>»). Firefox/Safari phrasings carry no URL — callers fall back
 * to the same-URL ladder. Same-origin only: the string comes from a
 * browser error message, so a computed import() must never leave this
 * origin. */
function chunkUrlFromError(error: unknown): string | null {
  const msg = (error as { message?: unknown } | null | undefined)?.message;
  if (typeof msg !== 'string') return null;
  const match = /dynamically imported module:?\s*(\S+)/i.exec(msg);
  if (!match || !match[1]) return null;
  try {
    const url = new URL(match[1], document.baseURI);
    return url.origin === location.origin ? url.href : null;
  } catch {
    return null;
  }
}

async function loadChunk<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (!isChunkLoadError(error)) throw error;
    /* Resilience ladder: offline → park on the browser's `online`
     * event and retry once connectivity returns; online → short
     * spaced retries (a deploy race serves a rotating chunk exactly
     * once, and the first fetch right after the `online` event can
     * still lose the race with the network stack coming up — measured
     * live). Each busted retry mints a FRESH query so the previous
     * attempt's failure is never the memoized one. Surfaces to the
     * boundary only after the ladder is exhausted, so the boundary
     * stays the genuinely-failed path. */
    const bustedUrl = chunkUrlFromError(error);
    for (let attempt = 0; attempt < 4; attempt++) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await waitForReconnect();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
      try {
        if (!bustedUrl) return await load();
        // @vite-ignore keeps Vite's import analysis away from a
        // runtime-computed specifier (the literal loaders above are
        // still statically analyzed and chunked as before).
        return (await import(/* @vite-ignore */ `${bustedUrl}${bustedUrl.includes('?') ? '&' : '?'}retry=${attempt}-${Date.now()}`)) as T;
      } catch (retryError) {
        if (!isChunkLoadError(retryError)) throw retryError;
      }
    }
    throw error;
  }
}

/* Route components render bare (<LandingPage />), so every default
 * export is a zero/optional-props component — Record<string, never>
 * accepts exactly those while staying any-free (React.lazy's own
 * constraint is ComponentType<any>). */
function lazyWithRetry<T extends ComponentType<Record<string, never>>>(
  load: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() => loadChunk(load));
}

/* ───────────────────────────────────────────────────────────
   Lazy-load every route component. Each `lazy(...)` boundary
   becomes its own chunk at build time, so the initial load
   only ships the first page the user lands on.

   The authed shell is lazy too (11-g P1-3): its eager import was
   ~35% of the old entry (useResources + axios + sidebar/topbar/
   onboarding chrome) that the public funnel (landing / auth /
   colleges / 404) never renders. ProtectedRoute travels in the
   same chunk — every authed branch renders it, so the first
   protected-route load needs that chunk anyway. The root
   <Suspense> below covers the shell chunk itself; AppShell keeps
   its own inner boundary so page chunks never unmount the chrome
   (11-e P1-1).
   ─────────────────────────────────────────────────────────── */
const AppShell = lazyWithRetry(() => import('./components/layout/AppShell').then((m) => ({ default: m.AppShell })));
const ProtectedRoute = lazyWithRetry(() => import('./components/layout/AppShell').then((m) => ({ default: m.ProtectedRoute })));

const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const AuthPage = lazyWithRetry(() => import('./pages/AuthPage'));
const RegisterPage = lazyWithRetry(() => import('./pages/RegisterPage'));

const StudentDashboardPage = lazyWithRetry(() => import('./pages/student/DashboardPage'));
const StudentCoursesPage = lazyWithRetry(() => import('./pages/student/CoursesPage'));
const LibraryPage = lazyWithRetry(() => import('./pages/student/LibraryPage'));
const MoocPage = lazyWithRetry(() => import('./pages/student/MoocPage'));
const JobsPage = lazyWithRetry(() => import('./pages/student/JobsPage'));
const AiAssistantPage = lazyWithRetry(() => import('./pages/student/AiAssistantPage'));
const CourseDetailPage = lazyWithRetry(() => import('./pages/student/CourseDetailPage'));
const LecturePlayerPage = lazyWithRetry(() => import('./pages/student/LecturePlayerPage'));
const MatrixPage = lazyWithRetry(() => import('./pages/student/MatrixPage'));
const StudentResearchPage = lazyWithRetry(() => import('./pages/student/ResearchPage'));
const ProfilePage = lazyWithRetry(() => import('./pages/student/ProfilePage'));
const WebinarsPage = lazyWithRetry(() => import('./pages/student/WebinarsPage'));
const ExamsPage = lazyWithRetry(() => import('./pages/student/ExamsPage'));
const DocumentViewerPage = lazyWithRetry(() => import('./pages/DocumentViewerPage'));
const LabsPage = lazyWithRetry(() => import('./pages/student/LabsPage'));
const LivePage = lazyWithRetry(() => import('./pages/student/LivePage'));
const PaymentPage = lazyWithRetry(() => import('./pages/student/PaymentPage'));
const CampusMapPage = lazyWithRetry(() => import('./pages/student/CampusMapPage'));

// MorePages exports several named components — bundle them as one lazy chunk
// by importing the module once and re-exporting each as a thin lazy wrapper.
const GamificationPage = lazyWithRetry(() => import('./pages/student/MorePages').then((m) => ({ default: m.GamificationPage })));
const SkillsPage = lazyWithRetry(() => import('./pages/student/MorePages').then((m) => ({ default: m.SkillsPage })));
const AlertsPage = lazyWithRetry(() => import('./pages/student/MorePages').then((m) => ({ default: m.AlertsPage })));
const SchedulePage = lazyWithRetry(() => import('./pages/student/MorePages').then((m) => ({ default: m.SchedulePage })));
const ResultsPage = lazyWithRetry(() => import('./pages/student/MorePages').then((m) => ({ default: m.ResultsPage })));
const ArVrPage = lazyWithRetry(() => import('./pages/student/MorePages').then((m) => ({ default: m.ArVrPage })));
const SocialPage = lazyWithRetry(() => import('./pages/student/MorePages').then((m) => ({ default: m.SocialPage })));
const DownloadsPage = lazyWithRetry(() => import('./pages/student/MorePages').then((m) => ({ default: m.DownloadsPage })));
const UniversityInfoPage = lazyWithRetry(() => import('./pages/student/MorePages').then((m) => ({ default: m.UniversityInfoPage })));

const TrainingCatalogPage = lazyWithRetry(() => import('./pages/student/TrainingPages'));
const TrainingTrackPage = lazyWithRetry(() => import('./pages/student/TrainingPages').then((m) => ({ default: m.TrainingTrackPage })));
const TrainingLessonPage = lazyWithRetry(() => import('./pages/student/TrainingPages').then((m) => ({ default: m.TrainingLessonPage })));
const AchievementsPage = lazyWithRetry(() => import('./pages/student/TrainingPages').then((m) => ({ default: m.AchievementsPage })));

const TeacherIntelligencePage = lazyWithRetry(() => import('./pages/teacher/TeacherIntelligencePage'));
const TeacherOfferingDetailPage = lazyWithRetry(() => import('./pages/teacher/TeacherIntelligencePage').then((m) => ({ default: m.TeacherOfferingDetailPage })));
const TeacherProfilePage = lazyWithRetry(() => import('./pages/teacher/TeacherProfilePage'));
const TeacherLivePage = lazyWithRetry(() => import('./pages/teacher/TeacherLivePage'));
const TeacherLabsPage = lazyWithRetry(() => import('./pages/teacher/TeacherLabsPage'));
const OnlineExamsPage = lazyWithRetry(() => import('./pages/exams/OnlineExamsPages'));
const ExamTakerPage = lazyWithRetry(() => import('./pages/exams/OnlineExamsPages').then((m) => ({ default: m.ExamTakerPage })));
const ExamModerationPage = lazyWithRetry(() => import('./pages/exams/OnlineExamsPages').then((m) => ({ default: m.ExamModerationPage })));

const CommunityPage = lazyWithRetry(() => import('./pages/community/CommunityPages'));

const AdminTeachersPage = lazyWithRetry(() => import('./pages/admin/AdminGovernancePages').then((m) => ({ default: m.AdminTeachersPage })));
const AdminPermissionsPage = lazyWithRetry(() => import('./pages/admin/AdminGovernancePages').then((m) => ({ default: m.AdminPermissionsPage })));
const AdminSyncPage = lazyWithRetry(() => import('./pages/admin/AdminSyncPage').then((m) => ({ default: m.AdminSyncPage })));

const TeacherSchedulePage = lazyWithRetry(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.TeacherSchedulePage })));
const AttendancePage = lazyWithRetry(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.AttendancePage })));
const GradesPage = lazyWithRetry(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.GradesPage })));
const MaterialsPage = lazyWithRetry(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.MaterialsPage })));
const ResearchPage = lazyWithRetry(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.ResearchPage })));
const StudentsListPage = lazyWithRetry(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.StudentsListPage })));
const PerformancePage = lazyWithRetry(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.PerformancePage })));
const AssignmentsPage = lazyWithRetry(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.AssignmentsPage })));
const MessagesPage = lazyWithRetry(() => import('./pages/teacher/TeacherPages').then((m) => ({ default: m.MessagesPage })));

// 18-F1 — unified exam authoring (question bank + templates + moderation)
const ExamAuthoringPage = lazyWithRetry(() => import('./pages/teacher/ExamAuthorPages'));
const ExamTemplateDetailPage = lazyWithRetry(() => import('./pages/teacher/ExamAuthorPages').then((m) => ({ default: m.ExamTemplateDetailPage })));

const TeacherDashboardPage = lazyWithRetry(() => import('./pages/teacher/TeacherDashboardPage').then((m) => ({ default: m.TeacherDashboardPage })));

const AdminDashboardPage = lazyWithRetry(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminDashboardPage })));
const AdminFacultiesPage = lazyWithRetry(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminFacultiesPage })));
const AdminReportsPage = lazyWithRetry(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminReportsPage })));
const AdminCoursesPage = lazyWithRetry(() => import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminCoursesPage })));

const AdminStudentsPage = lazyWithRetry(() => import('./pages/admin/AdminExtraPages').then((m) => ({ default: m.AdminStudentsPage })));
const AdminAnalysisPage = lazyWithRetry(() => import('./pages/admin/AdminExtraPages').then((m) => ({ default: m.AdminAnalysisPage })));
const AdminDigitalPage = lazyWithRetry(() => import('./pages/admin/AdminExtraPages').then((m) => ({ default: m.AdminDigitalPage })));
const AdminSettingsPage = lazyWithRetry(() => import('./pages/admin/AdminExtraPages').then((m) => ({ default: m.AdminSettingsPage })));

const QualityDashboardPage = lazyWithRetry(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityDashboardPage })));
const QualityCoursesPage = lazyWithRetry(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityCoursesPage })));
const QualityProfessorsPage = lazyWithRetry(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityProfessorsPage })));
const QualityEngagementPage = lazyWithRetry(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityEngagementPage })));
const QualityCurriculumPage = lazyWithRetry(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityCurriculumPage })));
const QualityReportsPage = lazyWithRetry(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityReportsPage })));
const QualityAlertsPage = lazyWithRetry(() => import('./pages/quality/QualityPages').then((m) => ({ default: m.QualityAlertsPage })));

const OwnerDashboardPage = lazyWithRetry(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerDashboardPage })));
const OwnerUsersPage = lazyWithRetry(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerUsersPage })));
const OwnerActivityPage = lazyWithRetry(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerActivityPage })));
const OwnerContentPage = lazyWithRetry(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerContentPage })));
const OwnerSystemPage = lazyWithRetry(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerSystemPage })));
const OwnerEducationPage = lazyWithRetry(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerEducationPage })));
const OwnerRealtimePage = lazyWithRetry(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerRealtimePage })));
const OwnerAiPage = lazyWithRetry(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerAiPage })));
const OwnerAlertsPage = lazyWithRetry(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerAlertsPage })));
const OwnerGovernancePage = lazyWithRetry(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerGovernancePage })));

const VisionGalleryPage = lazyWithRetry(() => import('./pages/vision/VisionPages').then((m) => ({ default: m.VisionGalleryPage })));
const VisionDetailPage = lazyWithRetry(() => import('./pages/vision/VisionPages').then((m) => ({ default: m.VisionDetailPage })));

const CollegesIndexPage = lazyWithRetry(() => import('./pages/colleges/CollegePages').then((m) => ({ default: m.CollegesIndexPage })));
const CollegeDetailPage = lazyWithRetry(() => import('./pages/colleges/CollegePages').then((m) => ({ default: m.CollegeDetailPage })));
const CollegesLeaderboardPage = lazyWithRetry(() => import('./pages/colleges/CollegePages').then((m) => ({ default: m.CollegesLeaderboardPage })));

const CompetitionsIndexPage = lazyWithRetry(() => import('./pages/competitions/CompetitionsPages').then((m) => ({ default: m.CompetitionsIndexPage })));
const CompetitionDetailPage = lazyWithRetry(() => import('./pages/competitions/CompetitionsPages').then((m) => ({ default: m.CompetitionDetailPage })));

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

/** Public university-info layout (orchestrator ruling #9).
 *
 * The colleges gallery / leaderboard / detail pages are world-readable
 * (public university info — the landing page already previews them).
 * Signed-in visitors keep the full app shell; guests get the same page
 * content in a chrome-less container, because the shell's sidebar and
 * bottom-nav are auth-only and the shell grid reserves a sidebar track
 * that would otherwise render as a blank column. The back link keeps
 * the guest funnel from dead-ending. */
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Global toast region — mounted once at the root so any page
          can fire lib/toast.ts feedback (ruling #3, audit 0-c P1-7). */}
      <ToastStack />
      <BrowserRouter>
        {/* Route-level error boundary (audit 4-A14 P1-3): a render
            crash in ANY route now shows the designed recovery surface
            (reload + home) instead of blanking the whole app; it clears
            itself on navigation so a crash on one route never holds
            the app hostage. Placed OUTSIDE the Suspense so lazy
            chunk-load failures (stale deploys) are caught too. */}
        <RouteErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
            <Route path="/auth" element={<AuthPage />} />
            {/* /auth is the canonical login route; /login is a legacy alias. */}
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/" element={<HomeRedirect />} />

            {/* Labs preview — role-permissive mount (A6 P1, wave 22-a).
                /student/labs used to sit inside the STUDENT-only block,
                which made «معاينة كطالب» — the ONLY per-card CTA on
                /teacher/labs — silently bounce every teacher back to
                their dashboard. The page is the same labs explorer for
                both roles: the catalog endpoint is unscoped and the
                /me/lab-sessions KPI endpoint is auth-only with a
                graceful empty shape for users without a student
                profile (student-dashboard.routes.ts), so a teacher
                gets an honest preview (0 recorded sessions) and can
                run the client-side experiments. Documented deviation:
                this is the single intentional widening of a
                /student/* path; the shell/nav stay role-based. */}
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
                <Route path="/student/exams" element={<ExamsPage />} />
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

            {/* Colleges — PUBLIC university info (ruling #9). Same shell for
                signed-in users; guests get a chrome-less container. */}
            <Route element={<CollegesLayout />}>
              <Route path="/colleges" element={<CollegesIndexPage />} />
              <Route path="/colleges/leaderboard" element={<CollegesLeaderboardPage />} />
              <Route path="/colleges/:id" element={<CollegeDetailPage />} />
            </Route>

            {/* Unknown URLs render the designed 404 surface (no soft-404
                redirect); /404 stays as the explicit harness entry point. */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
