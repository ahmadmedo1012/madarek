import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Link } from 'react-router-dom';
import {
  BookOpen, CheckCircle2,
  Calendar, Bell, ChevronLeft, Play, PlayCircle,
  Compass, AlertCircle, ArrowLeft,
  Cog, Cpu, Database, Network, Globe, Shield, GraduationCap, Presentation, FileText, FlaskConical, BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState, KpiSkeleton, ListSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMyEnrollments, useResume, useGaps, useMyProfile } from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';

ChartJS.register(ArcElement, Tooltip, Legend);

// Map course code to a meaningful Lucide icon
const courseIcon = (codeOrName: string): LucideIcon => {
  const s = codeOrName.toLowerCase();
  if (s.includes('se') || s.includes('برمج')) return Cog;
  if (s.includes('ct') || s.includes('تقنيات الحاسوب')) return Cpu;
  if (s.includes('is') || s.includes('نظم')) return Database;
  if (s.includes('net') || s.includes('شبك')) return Network;
  if (s.includes('web') || s.includes('إنترنت')) return Globe;
  if (s.includes('sec') || s.includes('أمن')) return Shield;
  return BookOpen;
};

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'سهرة سعيدة';
    if (h < 12) return 'صباح الخير';
    if (h < 18) return 'مساء النور';
    return 'مساء الخير';
  })();

  return (
    <div className="page student-dashboard-page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">{greeting}، {user?.firstName ?? 'أحمد'}</h1>
          <p className="page-subtitle">
            لوحة متابعة تقدمك الأكاديمي.
          </p>
        </div>
      </div>

      <div className="dashboard-metrics-grid">
        <Card className="gpa-kpi-card">
          <div className="gpa-kpi-content">
            <div className="gpa-kpi-info">
              <div className="gpa-kpi-label">المعدل التراكمي</div>
              <div className="gpa-kpi-value">3.8</div>
              <div className="gpa-kpi-badge"><Badge color="green">ممتاز</Badge></div>
            </div>
            <div className="gpa-kpi-icon-wrap">
              <Icon icon={GraduationCap} size={24} />
            </div>
          </div>
        </Card>

        <Card className="progress-kpi-card">
          <div className="progress-kpi-chart-wrap">
             <Doughnut
                data={{
                  labels: ['منجز', 'متبقي'],
                  datasets: [{
                    data: [75, 25],
                    backgroundColor: ['var(--accent)', 'var(--surface-3)'],
                    borderWidth: 0,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '80%',
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                }}
              />
              <div className="progress-kpi-chart-label">
                <span className="progress-kpi-percentage">75%</span>
              </div>
          </div>
          <div className="progress-kpi-info">
            <div className="progress-kpi-label">التقدم الأكاديمي</div>
            <div className="progress-kpi-value">60 من 80 ساعة معتمدة</div>
          </div>
        </Card>
      </div>

      <Card className="semester-progress-card">
        <div className="semester-progress-header">
          <div className="semester-progress-title">تقدم الفصل الدراسي الحالي</div>
          <div className="semester-progress-percentage">60%</div>
        </div>
        <div className="semester-progress-bar-bg">
          <div className="semester-progress-bar-fill" />
        </div>
        <div className="semester-progress-footer">
          <span>بداية الفصل 10/09</span>
          <span>نهاية الفصل 15/01</span>
        </div>
      </Card>

      <div className="upcoming-tasks-section">
        <h3 className="upcoming-tasks-title">المهام والفصول القادمة</h3>
        
        <div className="upcoming-tasks-list">
          <Card className="upcoming-task-item">
            <div className="task-icon-wrap presentation">
              <Icon icon={Presentation} size={24} />
            </div>
            <div className="task-info">
              <div className="task-name">برمجة متقدمة - قاعة 301</div>
              <div className="task-time">اليوم 10:00 ص</div>
            </div>
          </Card>

          <Card className="upcoming-task-item">
            <div className="task-icon-wrap assignment">
              <Icon icon={FileText} size={24} />
            </div>
            <div className="task-info">
              <div className="task-name">تسليم مشروع التخرج</div>
              <div className="task-time">غداً 11:59 م</div>
            </div>
          </Card>

          <Card className="upcoming-task-item">
            <div className="task-icon-wrap lab">
              <Icon icon={FlaskConical} size={24} />
            </div>
            <div className="task-info">
              <div className="task-name">معمل الذكاء الاصطناعي - قاعة 205</div>
              <div className="task-time">الخميس 2:00 م</div>
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}
