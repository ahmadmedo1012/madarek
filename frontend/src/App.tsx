import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppShell, ProtectedRoute } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageSkeleton } from './components/primitives/States';
import { useAuthStore } from './stores/auth.store';

// ── Eager-loaded pages (small, critical path) ──
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';

// ── Lazy-loaded page groups ──

// Student pages
const StudentDashboardPage = React.lazy(() => import('./pages/student/DashboardPage'));
const StudentCoursesPage = React.lazy(() => import('./pages/student/CoursesPage'));
const LibraryPage = React.lazy(() => import('./pages/student/LibraryPage'));
const MoocPage = React.lazy(() => import('./pages/student/MoocPage'));
const JobsPage = React.lazy(() => import('./pages/student/JobsPage'));
const AiAssistantPage = React.lazy(() => import('./pages/student/AiAssistantPage'));
const CourseDetailPage = React.lazy(() => import('./pages/student/CourseDetailPage'));
const LecturePlayerPage = React.lazy(() => import('./pages/student/LecturePlayerPage'));
const MatrixPage = React.lazy(() => import('./pages/student/MatrixPage'));
const StudentResearchPage = React.lazy(() => import('./pages/student/ResearchPage'));
const ProfilePage = React.lazy(() => import('./pages/student/ProfilePage'));
const WebinarsPage = React.lazy(() => import('./pages/student/WebinarsPage'));
const ExamsPage = React.lazy(() => import('./pages/student/ExamsPage'));
const DocumentViewerPage = React.lazy(() => import('./pages/DocumentViewerPage'));
const LabsPage = React.lazy(() => import('./pages/student/LabsPage'));
const LivePage = React.lazy(() => import('./pages/student/LivePage'));
const PaymentPage = React.lazy(() => import('./pages/student/PaymentPage'));
const CampusMapPage = React.lazy(() => import('./pages/student/CampusMapPage'));

// Student MorePages (named exports via wrapper)
const GamificationPage = React.lazy(() => import('./pages/student/MorePages').then(m => ({ default: m.GamificationPage })));
const SkillsPage = React.lazy(() => import('./pages/student/MorePages').then(m => ({ default: m.SkillsPage })));
const AlertsPage = React.lazy(() => import('./pages/student/MorePages').then(m => ({ default: m.AlertsPage })));
const SchedulePage = React.lazy(() => import('./pages/student/MorePages').then(m => ({ default: m.SchedulePage })));
const ResultsPage = React.lazy(() => import('./pages/student/MorePages').then(m => ({ default: m.ResultsPage })));
const ArVrPage = React.lazy(() => import('./pages/student/MorePages').then(m => ({ default: m.ArVrPage })));
const SocialPage = React.lazy(() => import('./pages/student/MorePages').then(m => ({ default: m.SocialPage })));
const DownloadsPage = React.lazy(() => import('./pages/student/MorePages').then(m => ({ default: m.DownloadsPage })));
const UniversityInfoPage = React.lazy(() => import('./pages/student/MorePages').then(m => ({ default: m.UniversityInfoPage })));

// Training pages
const TrainingCatalogPage = React.lazy(() => import('./pages/student/TrainingPages'));
const TrainingTrackPage = React.lazy(() => import('./pages/student/TrainingPages').then(m => ({ default: m.TrainingTrackPage })));
const TrainingLessonPage = React.lazy(() => import('./pages/student/TrainingPages').then(m => ({ default: m.TrainingLessonPage })));
const AchievementsPage = React.lazy(() => import('./pages/student/TrainingPages').then(m => ({ default: m.AchievementsPage })));

// Teacher pages
const TeacherDashboardPage = React.lazy(() => import('./pages/teacher/TeacherDashboardPage').then(m => ({ default: m.TeacherDashboardPage })));
const TeacherIntelligencePage = React.lazy(() => import('./pages/teacher/TeacherIntelligencePage').then(m => ({ default: m.default })));
const TeacherOfferingDetailPage = React.lazy(() => import('./pages/teacher/TeacherIntelligencePage').then(m => ({ default: m.TeacherOfferingDetailPage })));
const TeacherProfilePage = React.lazy(() => import('./pages/teacher/TeacherProfilePage'));
const TeacherLivePage = React.lazy(() => import('./pages/teacher/TeacherLivePage'));
const TeacherLabsPage = React.lazy(() => import('./pages/teacher/TeacherLabsPage'));
const TeacherSchedulePage = React.lazy(() => import('./pages/teacher/TeacherPages').then(m => ({ default: m.TeacherSchedulePage })));
const AttendancePage = React.lazy(() => import('./pages/teacher/TeacherPages').then(m => ({ default: m.AttendancePage })));
const GradesPage = React.lazy(() => import('./pages/teacher/TeacherPages').then(m => ({ default: m.GradesPage })));
const MaterialsPage = React.lazy(() => import('./pages/teacher/TeacherPages').then(m => ({ default: m.MaterialsPage })));
const ResearchPage = React.lazy(() => import('./pages/teacher/TeacherPages').then(m => ({ default: m.ResearchPage })));
const StudentsListPage = React.lazy(() => import('./pages/teacher/TeacherPages').then(m => ({ default: m.StudentsListPage })));
const PerformancePage = React.lazy(() => import('./pages/teacher/TeacherPages').then(m => ({ default: m.PerformancePage })));
const AssignmentsPage = React.lazy(() => import('./pages/teacher/TeacherPages').then(m => ({ default: m.AssignmentsPage })));
const MessagesPage = React.lazy(() => import('./pages/teacher/TeacherPages').then(m => ({ default: m.MessagesPage })));

// Admin pages
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminDashboardPage })));
const AdminPlaceholder = React.lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminPlaceholder })));
const AdminFacultiesPage = React.lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminFacultiesPage })));
const AdminReportsPage = React.lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminReportsPage })));
const AdminCoursesPage = React.lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminCoursesPage })));
const AdminTeachersPage = React.lazy(() => import('./pages/admin/AdminGovernancePages').then(m => ({ default: m.AdminTeachersPage })));
const AdminPermissionsPage = React.lazy(() => import('./pages/admin/AdminGovernancePages').then(m => ({ default: m.AdminPermissionsPage })));
const AdminSyncPage = React.lazy(() => import('./pages/admin/AdminSyncPage').then(m => ({ default: m.AdminSyncPage })));

// Quality pages
const QualityDashboardPage = React.lazy(() => import('./pages/quality/QualityPages').then(m => ({ default: m.QualityDashboardPage })));
const QualityCoursesPage = React.lazy(() => import('./pages/quality/QualityPages').then(m => ({ default: m.QualityCoursesPage })));
const QualityProfessorsPage = React.lazy(() => import('./pages/quality/QualityPages').then(m => ({ default: m.QualityProfessorsPage })));
const QualityEngagementPage = React.lazy(() => import('./pages/quality/QualityPages').then(m => ({ default: m.QualityEngagementPage })));
const QualityCurriculumPage = React.lazy(() => import('./pages/quality/QualityPages').then(m => ({ default: m.QualityCurriculumPage })));
const QualityReportsPage = React.lazy(() => import('./pages/quality/QualityPages').then(m => ({ default: m.QualityReportsPage })));
const QualityAlertsPage = React.lazy(() => import('./pages/quality/QualityPages').then(m => ({ default: m.QualityAlertsPage })));

// Owner pages
const OwnerDashboardPage = React.lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerDashboardPage })));
const OwnerUsersPage = React.lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerUsersPage })));
const OwnerActivityPage = React.lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerActivityPage })));
const OwnerContentPage = React.lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerContentPage })));
const OwnerSystemPage = React.lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerSystemPage })));
const OwnerEducationPage = React.lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerEducationPage })));
const OwnerRealtimePage = React.lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerRealtimePage })));
const OwnerAiPage = React.lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerAiPage })));
const OwnerAlertsPage = React.lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerAlertsPage })));
const OwnerGovernancePage = React.lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerGovernancePage })));

// Vision pages
const VisionGalleryPage = React.lazy(() => import('./pages/vision/VisionPages').then(m => ({ default: m.VisionGalleryPage })));
const VisionDetailPage = React.lazy(() => import('./pages/vision/VisionPages').then(m => ({ default: m.VisionDetailPage })));

// Exams & Community
const OnlineExamsPage = React.lazy(() => import('./pages/exams/OnlineExamsPages').then(m => ({ default: m.default })));
const ExamTakerPage = React.lazy(() => import('./pages/exams/OnlineExamsPages').then(m => ({ default: m.ExamTakerPage })));
const ExamModerationPage = React.lazy(() => import('./pages/exams/OnlineExamsPages').then(m => ({ default: m.ExamModerationPage })));
const CommunityPage = React.lazy(() => import('./pages/community/CommunityPages'));

/** Resolves the home path for an authenticated user, or `/` for guests. */
function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return null;
  if (!user) return <LandingPage />;
  if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
  if (user.role === 'TEACHER') return <Navigate to="/teacher/dashboard" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'OWNER') return <Navigate to="/owner/dashboard" replace />;
  return <Navigate to="/quality/dashboard" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<HomeRedirect />} />

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
                <Route path="/student/labs" element={<LabsPage />} />
                <Route path="/student/ar" element={<ArVrPage />} />
                <Route path="/student/social" element={<SocialPage />} />
                <Route path="/student/downloads" element={<DownloadsPage />} />
                <Route path="/student/university" element={<UniversityInfoPage />} />
                <Route path="/student/live" element={<LivePage />} />
                <Route path="/student/payment" element={<PaymentPage />} />
                <Route path="/student/map" element={<CampusMapPage />} />
                {/* Course detail + lectures */}
                <Route path="/student/courses/:offeringId" element={<CourseDetailPage />} />
                <Route path="/student/lectures/:lectureId" element={<LecturePlayerPage />} />
                {/* Educational Matrix */}
                <Route path="/student/matrix" element={<MatrixPage />} />
                <Route path="/student/research" element={<StudentResearchPage />} />
                <Route path="/student/profile" element={<ProfilePage />} />
                <Route path="/student/webinars" element={<WebinarsPage />} />
                <Route path="/student/exams" element={<ExamsPage />} />
                {/* Self-Development (Training & Rewards) */}
                <Route path="/training" element={<TrainingCatalogPage />} />
                <Route path="/training/:slug" element={<TrainingTrackPage />} />
                <Route path="/training/:slug/lesson/:lessonId" element={<TrainingLessonPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                {/* Online exams */}
                <Route path="/student/online-exams" element={<OnlineExamsPage />} />
                <Route path="/student/online-exams/:id" element={<ExamTakerPage />} />
                {/* Community */}
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
                <Route path="/teacher/messages" element={<MessagesPage />} />
                <Route path="/teacher/ai" element={<AiAssistantPage />} />
                <Route path="/teacher/library" element={<LibraryPage />} />
                <Route path="/teacher/alerts" element={<AlertsPage />} />
                {/* Academic Intelligence */}
                <Route path="/teacher/intelligence" element={<TeacherIntelligencePage />} />
                <Route path="/teacher/intelligence/:offeringId" element={<TeacherOfferingDetailPage />} />
                {/* Teacher profile + role-aware live + labs */}
                <Route path="/teacher/profile" element={<TeacherProfilePage />} />
                <Route path="/teacher/live" element={<TeacherLivePage />} />
                <Route path="/teacher/labs" element={<TeacherLabsPage />} />
                {/* Community shared */}
                <Route path="/teacher/community" element={<CommunityPage />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute allow={['ADMIN']} />}>
              <Route element={<AppShell />}>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/students" element={<AdminPlaceholder title="إدارة الطلاب" />} />
                <Route path="/admin/teachers" element={<AdminTeachersPage />} />
                <Route path="/admin/permissions/:id" element={<AdminPermissionsPage />} />
                <Route path="/admin/sync" element={<AdminSyncPage />} />
                <Route path="/admin/community" element={<CommunityPage />} />
                <Route path="/admin/faculties" element={<AdminFacultiesPage />} />
                <Route path="/admin/courses" element={<AdminCoursesPage />} />
                <Route path="/admin/analysis" element={<AdminPlaceholder title="تحليل الأداء" />} />
                <Route path="/admin/digital" element={<AdminPlaceholder title="التحول الرقمي" />} />
                <Route path="/admin/reports" element={<AdminReportsPage />} />
                <Route path="/admin/settings" element={<AdminPlaceholder title="إعدادات المنصة" />} />
                <Route path="/admin/alerts" element={<AlertsPage />} />
              </Route>
            </Route>

            {/* Quality (4th sector) */}
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

            {/* Owner (platform owner) */}
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

            {/* Vision (accessible to all authenticated roles) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/vision" element={<VisionGalleryPage />} />
                <Route path="/vision/:slug" element={<VisionDetailPage />} />
                <Route path="/document/:filename" element={<DocumentViewerPage />} />
              </Route>
            </Route>

            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
