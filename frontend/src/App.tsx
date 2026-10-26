import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { queryClient } from './lib/queryClient';
import { AppShell, ProtectedRoute } from './components/layout/AppShell';
import { GuestReveal } from './components/motion';
import { useAuthStore } from './stores/auth.store';
import { ROLE_HOME } from './lib/nav';
import { HydrationSplash } from './components/HydrationSplash';
import { RouteErrorBoundary } from './components/ErrorBoundary';
import { ToastStack } from './components/overlays/Toast';
import { Icon } from './components/Icon';
/* r305-A2: the single global cursor mount — a gated, additive pointer
 * layer (fine pointer + ≥992px + motion allowed only) that renders null
 * everywhere else, so touch/coarse/reduced-motion users keep the native
 * pointer untouched. Sits next to ToastStack OUTSIDE the route tree and
 * the error boundary: it must survive route changes and stay inert
 * (pointer-events: none, aria-hidden) by construction. Mount contract:
 * docs/r305-heron-interactions.md. */
import { CursorManager } from './components/motion/CursorManager';
/* R313 (4-b · D6): the guest smooth-scroll engine — Lenis 1.1.5 on the
 * window, driven by the shared motion conductor, live ONLY on the
 * public window-scrolled surfaces. See the GuestLenisMount block below. */
import { destroyGuestLenis, getLenis, initGuestLenis } from './lib/motion/sheetLenis';

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
// r164-c: the student one-calendar view (schedule + assignments + exam
// windows + live sessions in a month grid).
const StudentCalendarPage = lazy(() => import('./pages/student/CalendarPage'));
const StudentCoursesPage = lazy(() => import('./pages/student/CoursesPage'));
// r180-F4: the student-facing institution course catalogue (admin-mediated
// enrollment — the catalogue names the real door, no fake enroll button).
const CatalogPage = lazy(() => import('./pages/student/CatalogPage'));
const LibraryPage = lazy(() => import('./pages/student/LibraryPage'));
const MoocPage = lazy(() => import('./pages/student/MoocPage'));
const JobsPage = lazy(() => import('./pages/student/JobsPage'));
const AiAssistantPage = lazy(() => import('./pages/student/AiAssistantPage'));
const CourseDetailPage = lazy(() => import('./pages/student/CourseDetailPage'));
const LecturePlayerPage = lazy(() => import('./pages/student/LecturePlayerPage'));
const MatrixPage = lazy(() => import('./pages/student/MatrixPage'));
const StudentResearchPage = lazy(() => import('./pages/student/ResearchPage'));
const ProfilePage = lazy(() => import('./pages/student/ProfilePage'));
// r171a: the student messages inbox — the DM lifecycle's student half
// (shared components/messages pair; enrolled teachers + prior
// correspondents as the honest recipient pool).
const StudentMessagesPage = lazy(() => import('./pages/student/MessagesPage').then((m) => ({ default: m.StudentMessagesPage })));
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
// r178 (multi-institution foundation): the OWNER's institution console —
// create institutions, provision their ADMINs, suspend/reactivate,
// revoke/restore memberships. Named lazy wrapper follows the siblings.
const OwnerInstitutionsPage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerInstitutionsPage })));
const OwnerInstitutionDetailPage = lazy(() => import('./pages/owner/OwnerPages').then((m) => ({ default: m.OwnerInstitutionDetailPage })));
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

/* R313 (WP-A1 · D7): the landing re-composition moved the documentary
 * media rail + video facades and the capability/status ledgers onto two
 * guest sub-pages — chrome-less public surfaces in the /colleges
 * pattern (window-scrolled for everyone, so the guest Lenis engine
 * covers them exactly like '/' and the colleges gallery). */
const CampusLifePage = lazy(() => import('./pages/campus/CampusPages').then((m) => ({ default: m.CampusLifePage })));
const CapabilitiesPage = lazy(() => import('./pages/capabilities/CapabilityPages').then((m) => ({ default: m.CapabilitiesPage })));

/** Resolves the home path for an authenticated user, or `/` for guests.
 *
 *  r157 (6A4-7): the local HOME map folded onto the exported
 *  ROLE_HOME in lib/nav.ts — the guard bounce, the guest bounce and
 *  the post-login landing now share one map by import, not by copy. */
function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return <HydrationSplash />;
  if (!user)
    return (
      <GuestReveal>
        <LandingPage />
      </GuestReveal>
    );
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

/** r281 (BLUEPRINT §7): param-preserving deep-link alias. Stale
 *  /student/* links to the top-level community/training/achievements
 *  routes must land on the LIVE surface with their params intact, not
 *  a flat redirect (which would strand /student/training/:slug mid-
 *  journey) and not the 404. The build callback owns each target's
 *  shape; every param reaching a target that does not accept it is
 *  the target's own route to answer honestly. */
function ParamRedirect({ build }: { build: (params: Record<string, string | undefined>) => string }) {
  const params = useParams();
  return <Navigate to={build(params)} replace />;
}

/** Guest-only guard (r157, 6A4-11): /auth + /auth/register.
 *
 *  An authed user landing on a guest surface (stale bookmark, browser
 *  back after login, retyping the URL) used to see the full login form
 *  while already signed in — and submitting it re-logged them in.
 *  Same discipline as ProtectedRoute: HydrationSplash first (the store
 *  decides after rehydrate, never mid-hydration), then a `replace`
 *  bounce to the role home. No loops: every ROLE_HOME target is an
 *  authed route that ProtectedRoute happily serves back. */
function GuestRoute() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  if (!isHydrated) return <HydrationSplash />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return (
    <GuestReveal>
      <Outlet />
    </GuestReveal>
  );
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
    <>
      {/* r183-B8 (A10 finding 3): the chrome-less public funnel was the
       * ONLY probed surface without a skip link — AppShell.tsx:360 is
       * the sole emitter and the landing ships its own (r172a), so a
       * keyboard user on the guest gallery tabbed through the whole
       * funnel chrome before the content. Same a11y pattern/anchor as
       * AppShell: the base.css .skip-link contract makes any
       * <a class="skip-link" href="#main"> the first Tab stop, visually
       * hidden until focused; tabIndex=-1 on the target lets
       * programmatic focus land after the skip. */}
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
      <main id="main" tabIndex={-1} className="content-inner">
        <div style={{ marginBlockEnd: 'var(--sp-6)' }}>
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
        <GuestReveal>
          <Outlet />
        </GuestReveal>
      </main>
    </>
  );
}

/** r161 (A1): the ROOT boundary's fallback is the branded splash, NOT
 *  the product's PageSkeleton.
 *
 *  Who actually suspends to this boundary? Only the routes with no
 *  in-shell Suspense above them: the public/guest surfaces — `/`
 *  (LandingPage), /auth + /auth/register, the guest /colleges*
 *  pages (CollegesLayout renders a bare <Outlet/>), /404 — plus
 *  nothing else: every authenticated route mounts inside AppShell,
 *  whose own inner boundary swaps the page-shaped PageSkeleton into
 *  the content track (the correct anatomy for operational pages).
 *
 *  The old root fallback was that same dashboard skeleton
 *  (page-header + KPI grid + cards). On a cold load it flashed the
 *  INTERNAL product's anatomy onto every PUBLIC surface — a
 *  prospective student on `/` watched KPI cards skeletonize, then
 *  the Orbit Ink landing appeared from a completely different visual
 *  world (reproduced: 24 skeleton bars + .grid-4 on `/`, `/auth`,
 *  guest `/colleges`). The HydrationSplash is what these exact
 *  routes already show during auth-store hydration (guards render
 *  it), so boot + chunk loading now share ONE calm, branded,
 *  theme-aware placeholder family — and the two visual worlds keep
 *  their own loading languages: splash for shell-level waits,
 *  page-shaped skeletons only inside the operational shell. */
export function AppRoutes() {
  /* (r172a: useLandingBootGround — the r162 (R1) React owner of the
   *  landing boot ground — was RETIRED with the whole data-landing-boot
   *  machinery: the landing grounds itself on var(--bg) in both themes
   *  now, so body/splash/landing paint one ground from the first styled
   *  frame and there is no world-crossing window left to own.) */
  return (
    <Suspense fallback={<HydrationSplash />}>
      <Routes>
        {/* r157 (6A4-11): guest surfaces — authed users bounce to
            their role home after hydration (GuestRoute). */}
        <Route element={<GuestRoute />}>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
        </Route>
        {/* /auth is the canonical login route; /login is a legacy alias. */}
        <Route path="/login" element={<Navigate to="/auth" replace />} />
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
            <Route path="/student/calendar" element={<StudentCalendarPage />} />
            <Route path="/student/courses" element={<StudentCoursesPage />} />
            {/* r180-F4: the institution catalogue — the discovery surface the
                enrolled-courses page deliberately is not. */}
            <Route path="/student/catalog" element={<CatalogPage />} />
            <Route path="/student/schedule" element={<SchedulePage />} />
            <Route path="/student/results" element={<ResultsPage />} />
            <Route path="/student/library" element={<LibraryPage />} />
            <Route path="/student/mooc" element={<MoocPage />} />
            <Route path="/student/jobs" element={<JobsPage />} />
            <Route path="/student/ai" element={<AiAssistantPage />} />
            <Route path="/student/gamification" element={<GamificationPage />} />
            <Route path="/student/skills" element={<SkillsPage />} />
            <Route path="/student/alerts" element={<AlertsPage />} />
            {/* r171a: the student messages inbox — mirrors /teacher/messages
                (same shared inbox, role-specific compose recipients). The
                DM notification deep link (me.routes.ts) now points here. */}
            <Route path="/student/messages" element={<StudentMessagesPage />} />
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
            {/* r281 (BLUEPRINT §7, 1B's deferred coordinator rows): the
                top-level community/training/achievements/colleges routes
                pre-date the nav re-org; stale deep links and old shares of
                /student/* forms must land on the live surface, not the
                404. Redirect rows only — the targets own the real routes
                (student-guarded block for training/achievements/community;
                the public CollegesLayout for colleges). */}
            <Route path="/student/training" element={<Navigate to="/training" replace />} />
            <Route path="/student/training/:slug" element={<ParamRedirect build={(p) => `/training/${p.slug}`} />} />
            <Route path="/student/training/:slug/lesson/:lessonId" element={<ParamRedirect build={(p) => `/training/${p.slug}/lesson/${p.lessonId}`} />} />
            <Route path="/student/achievements" element={<Navigate to="/achievements" replace />} />
            <Route path="/student/community" element={<Navigate to="/community" replace />} />
            <Route path="/student/colleges" element={<Navigate to="/colleges" replace />} />
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

        {/* Quality — r157 (6A9 #1): حارس QUALITY فقط.
            الحقيقة الخلفية: كل مسارات ‎/quality/*‎ الستة تمرّ بقدرة
            QUALITY_VIEW، وقدرات ADMIN الافتراضية لا تحملها
            (lib/permissions.ts — «No QUALITY_VIEW — separate role»)،
            وADMIN_NAV لا يحمل أي رابط /quality؛ فالقائمة المزدوجة
            القديمة (QUALITY+ADMIN) كانت تفتح صفحاتٍ ترتدّ بياناتها 403
            فور وصولها. الاستثناء الموثّق: ADMIN مُنح QUALITY_VIEW يدويًا
            من المالك يحصل على البيانات من الخلفية، لكنّ حارس الواجهة
            يمثّل حقيقة الدور الافتراضية — الارتداد إلى لوحة المسجل العام. */}
        <Route element={<ProtectedRoute allow={['QUALITY']} />}>
          <Route element={<AppShell />}>
            <Route path="/quality/dashboard" element={<QualityDashboardPage />} />
            <Route path="/quality/courses" element={<QualityCoursesPage />} />
            <Route path="/quality/professors" element={<QualityProfessorsPage />} />
            <Route path="/quality/engagement" element={<QualityEngagementPage />} />
            <Route path="/quality/reports" element={<QualityReportsPage />} />
            <Route path="/quality/curriculum" element={<QualityCurriculumPage />} />
            {/* r165d (D2): the QUALITY personal notifications inbox — the
                shared AlertsPage (MorePages) the bell needs. Mirrors the
                /student/alerts · /teacher/alerts · /admin/alerts mounts
                exactly (same page component, same lazy const, inside the
                role shell). The operational /quality/alerts board below
                stays untouched — the sidebar keeps its own link to it. */}
            <Route path="/quality/notifications" element={<AlertsPage />} />
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
            {/* r178: institution console (see the lazy import above). */}
            <Route path="/owner/institutions" element={<OwnerInstitutionsPage />} />
            {/* r181 (phase-8 owner setup): ONE institution's academic
                setup context — faculties → departments → courses →
                offerings, every write explicitly bound to the selected
                institution (see OwnerInstitutionDetailPage). */}
            <Route path="/owner/institutions/:slug" element={<OwnerInstitutionDetailPage />} />
            <Route path="/owner/activity" element={<OwnerActivityPage />} />
            <Route path="/owner/content" element={<OwnerContentPage />} />
            <Route path="/owner/system" element={<OwnerSystemPage />} />
            <Route path="/owner/education" element={<OwnerEducationPage />} />
            <Route path="/owner/realtime" element={<OwnerRealtimePage />} />
            <Route path="/owner/ai" element={<OwnerAiPage />} />
            {/* r165d (D2): the OWNER personal notifications inbox — the
                shared AlertsPage (MorePages) the bell needs. Mirrors the
                /student/alerts · /teacher/alerts · /admin/alerts mounts
                exactly. The operational /owner/alerts board below stays
                untouched — the sidebar keeps its own link to it. */}
            <Route path="/owner/notifications" element={<AlertsPage />} />
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

        {/* R313 (WP-A1 · D7) — the landing's two guest sub-pages: public,
            chrome-less, window-scrolled (the /colleges pattern, minus the
            AppShell branch — these are marketing sheets, so signed-in
            visitors get the same chrome-less reading experience and the
            guest Lenis engine stays the scroller for everyone). */}
        <Route
          path="/campus"
          element={(
            <GuestReveal>
              <CampusLifePage />
            </GuestReveal>
          )}
        />
        <Route
          path="/capabilities"
          element={(
            <GuestReveal>
              <CapabilitiesPage />
            </GuestReveal>
          )}
        />

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

/* r307 (audit 1-C H-1): window-scrolled routes (the public surfaces —
 * landing /, colleges, auth, 404) had NO scroll reset on SPA PUSH
 * navigation: a deep-scrolled landing pushed into /colleges or /auth
 * carried the old window offset (clamped to the new doc height), so
 * the funnel opened mid-page. POP keeps the browser's native restore
 * (and the authenticated shell scrolls .content, unaffected here —
 * window.scrollTo is a no-op while the shell owns the scroller).
 *
 * R313 (4-b): while the Lenis engine is live on a guest route the reset
 * goes THROUGH it — lenis.scrollTo(0, { immediate: true }) — because
 * Lenis 1.1.5 ignores an external window.scrollTo while a glide is in
 * flight (onNativeScroll only resyncs when it is not smooth-animating;
 * the in-flight glide would win the next frame and drag the new page
 * back down). Engine off (authenticated shell, reduced motion) → the
 * plain native reset, exactly as before. */
function ScrollResetOnPush() {
  const action = useNavigationType();
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (action === 'PUSH') {
      const engine = getLenis();
      if (engine) engine.scrollTo(0, { immediate: true });
      else window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [action, pathname, search]);
  return null;
}

/* R311 §1.3 — ONE pointer owner per route. The landing ('/') mounts
 * its own measured square instrument (SheetCursor: 9px square +
 * velocity trail + square reticle, suppressed inside data-cursor="none"
 * zones where the hero/loader instruments own the pointer). This
 * app-level additive layer (R305-A2, circular dot/ring) yields for the
 * WHOLE route — render null + full pipeline teardown, never a hidden
 * div — so no circular glyph can ever compete with the square. Every
 * other route (auth, shell, public /colleges, 404) keeps the r305-A2
 * behavior unchanged. Exported for the r311 ownership integration
 * test (tests/motion/r311-cursor-ownership.test.tsx). */
export function RoutedCursorManager() {
  const { pathname } = useLocation();
  return <CursorManager suspended={pathname === '/'} />;
}

/* ──────────────────────────────────────────────────────────────────
   R313 (4-b · D6) — the guest smooth-scroll engine mount.

   Heron runs Lenis 1.1.5 on every public page; Madarek runs it on the
   PUBLIC window-scrolled surfaces only — the authenticated app keeps
   its native .content scroller untouched (owner decision). The active
   set follows the REAL route tree in this file:

     · always guest/window-scrolled: '/', '/auth', '/auth/register',
       the '/login' alias, '/404', and the catch-all '*' (NotFoundPage);
     · '/colleges*' only for GUESTS — a signed-in visitor gets AppShell
       (CollegesLayout), whose .content scroller must stay native;
     · never: the authenticated '/student|/teacher|/admin|/quality|
       /owner' trees plus '/vision', '/document', '/competitions',
       '/community', '/training', '/achievements' — all AppShell
       surfaces. (The task brief's "/vision*, /campus*, /capabilities*"
       row was written against a stale route map: /campus and
       /capabilities do not exist, and /vision is behind ProtectedRoute
       + AppShell — so it is excluded here by design.)

   Hydration gates the mount: the engine never spins during the splash
   (guards render HydrationSplash while the store rehydrates), and the
   effect is idempotent so StrictMode's double-invoke nets out. Exported
   for the r313-lenis unit belt.
   ────────────────────────────────────────────────────────────────── */
const SHELL_SURFACE_PREFIXES = [
  '/student', '/teacher', '/admin', '/quality', '/owner',
  '/vision', '/document', '/competitions', '/community', '/training', '/achievements',
] as const;

function isShellSurface(pathname: string): boolean {
  return SHELL_SURFACE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isGuestWindowSurface(pathname: string, hasUser: boolean): boolean {
  if (isShellSurface(pathname)) return false;
  /* signed-in visitors never see the guest surfaces: '/' and '/auth*'
     bounce to the role home, '/colleges*' renders inside AppShell. */
  if (
    hasUser &&
    (pathname === '/' ||
      pathname === '/auth' ||
      pathname === '/auth/register' ||
      pathname === '/login' ||
      pathname.startsWith('/colleges'))
  ) {
    return false;
  }
  return true;
}

export function GuestLenisMount() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const active = isHydrated && isGuestWindowSurface(pathname, Boolean(user));
  useEffect(() => {
    if (active) initGuestLenis();
    else destroyGuestLenis();
  }, [active]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollResetOnPush />
        {/* R313 4-b — route-aware guest engine mount (must sit INSIDE
            the router: it reads the location, like ScrollResetOnPush). */}
        <GuestLenisMount />
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
        {/* R311 §1.3 — router-aware: yields on '/' (the landing's square
         * instrument owns the pointer there); active on every other
         * route exactly as in r305-A2. */}
        <RoutedCursorManager />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
