import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppShell, ProtectedRoute } from './components/layout/AppShell';
import AuthPage from './pages/AuthPage';
import StudentDashboardPage from './pages/student/DashboardPage';
import StudentCoursesPage from './pages/student/CoursesPage';
import LibraryPage from './pages/student/LibraryPage';
import MoocPage from './pages/student/MoocPage';
import JobsPage from './pages/student/JobsPage';
import AiAssistantPage from './pages/student/AiAssistantPage';
import {
  GamificationPage,
  SkillsPage,
  AlertsPage,
  SchedulePage,
  ResultsPage,
  LabsPage,
  ArVrPage,
  SocialPage,
  DownloadsPage,
  UniversityInfoPage,
} from './pages/student/MorePages';
import {
  TeacherDashboardPage,
  TeacherSchedulePage,
  AttendancePage,
  GradesPage,
  MaterialsPage,
  ResearchPage,
  StudentsListPage,
  PerformancePage,
  AssignmentsPage,
  MessagesPage,
} from './pages/teacher/TeacherPages';
import { AdminDashboardPage, AdminPlaceholder } from './pages/admin/AdminPages';
import { useAuthStore } from './stores/auth.store';

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
  if (user.role === 'TEACHER') return <Navigate to="/teacher/dashboard" replace />;
  return <Navigate to="/admin/dashboard" replace />;
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
              <Route path="/admin/reports" element={<AdminPlaceholder title="التقارير" />} />
              <Route path="/admin/settings" element={<AdminPlaceholder title="الإعدادات" />} />
              <Route path="/admin/alerts" element={<AlertsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
