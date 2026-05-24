import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppShell, ProtectedRoute } from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import StudentDashboardPage from './pages/student/DashboardPage';
import StudentCoursesPage from './pages/student/CoursesPage';
import LibraryPage from './pages/student/LibraryPage';
import MoocPage from './pages/student/MoocPage';
import JobsPage from './pages/student/JobsPage';
import AiAssistantPage from './pages/student/AiAssistantPage';
import CourseDetailPage from './pages/student/CourseDetailPage';
import LecturePlayerPage from './pages/student/LecturePlayerPage';
import MatrixPage from './pages/student/MatrixPage';
import StudentResearchPage from './pages/student/ResearchPage';
import {
  GamificationPage, SkillsPage, AlertsPage, SchedulePage, ResultsPage,
  ArVrPage, SocialPage, DownloadsPage, UniversityInfoPage,
} from './pages/student/MorePages';
import LabsPage from './pages/student/LabsPage';
import LivePage from './pages/student/LivePage';
import PaymentPage from './pages/student/PaymentPage';
import CampusMapPage from './pages/student/CampusMapPage';
import {
  TeacherDashboardPage, TeacherSchedulePage, AttendancePage, GradesPage,
  MaterialsPage, ResearchPage, StudentsListPage, PerformancePage,
  AssignmentsPage, MessagesPage,
} from './pages/teacher/TeacherPages';
import { AdminDashboardPage, AdminPlaceholder } from './pages/admin/AdminPages';
import { QualityDashboardPage, QualityCoursesPage, QualityProfessorsPage, QualityEngagementPage, QualityCurriculumPage, QualityReportsPage, QualityAlertsPage } from './pages/quality/QualityPages';
import { VisionGalleryPage, VisionDetailPage } from './pages/vision/VisionPages';
import { useAuthStore } from './stores/auth.store';

/** Resolves the home path for an authenticated user, or `/` for guests. */
function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return null;
  if (!user) return <LandingPage />;
  if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
  if (user.role === 'TEACHER') return <Navigate to="/teacher/dashboard" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/quality/dashboard" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute allow={['ADMIN']} />}>
            <Route element={<AppShell />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/students" element={<AdminPlaceholder title="إدارة الطلاب" />} />
              <Route path="/admin/teachers" element={<AdminPlaceholder title="إدارة الأساتذة" />} />
              <Route path="/admin/faculties" element={<AdminPlaceholder title="الكليات والأقسام" />} />
              <Route path="/admin/courses" element={<AdminPlaceholder title="إدارة المقررات" />} />
              <Route path="/admin/analysis" element={<AdminPlaceholder title="تحليل الأداء" />} />
              <Route path="/admin/digital" element={<AdminPlaceholder title="التحول الرقمي" />} />
              <Route path="/admin/reports" element={<AdminPlaceholder title="التقارير الرسمية" />} />
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
            </Route>
          </Route>

          {/* Vision (accessible to all authenticated roles) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/vision" element={<VisionGalleryPage />} />
              <Route path="/vision/:slug" element={<VisionDetailPage />} />
            </Route>
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
