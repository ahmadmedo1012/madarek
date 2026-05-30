import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from 'chart.js';
import {
  GraduationCap, Presentation, FileText, FlaskConical,
  BookOpen, CalendarCheck, ClipboardList, Trophy,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Greeting that adapts to the local hour. Calm, conversational.
 */
function useGreeting(): string {
  const h = new Date().getHours();
  if (h < 6)  return 'سهرة سعيدة';
  if (h < 12) return 'صباح الخير';
  if (h < 18) return 'مساء النور';
  return 'مساء الخير';
}

/**
 * Up-coming agenda items. In a real session these come from the API
 * — kept inline for the visual treatment of the dashboard.
 */
type Agenda = {
  id: string;
  title: string;
  meta: string;
  tone: 'accent' | 'gold';
  icon: LucideIcon;
};

const AGENDA: Agenda[] = [
  { id: 'a1', title: 'برمجة متقدمة — قاعة 301', meta: 'اليوم · 10:00 ص',  tone: 'accent', icon: Presentation },
  { id: 'a2', title: 'تسليم مشروع التخرج',     meta: 'غداً · 11:59 م',   tone: 'gold',   icon: FileText      },
  { id: 'a3', title: 'معمل الذكاء الاصطناعي — قاعة 205', meta: 'الخميس · 2:00 م', tone: 'accent', icon: FlaskConical },
];

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const greeting = useGreeting();

  return (
    <div className="page student-dashboard">
      <header className="page-header welcome-card">
        <h1 className="page-title">
          {greeting}، {user?.firstName ?? 'أحمد'}
        </h1>
        <p className="page-subtitle">لوحة متابعة تقدّمك الأكاديمي.</p>
      </header>

      {/* At-a-glance KPI row (data-dense dashboard) */}
      <section className="grid-4">
        <MetricCard icon={BookOpen} label="مقررات نشطة" value="6" change="هذا الفصل" color="brand" />
        <MetricCard icon={CalendarCheck} label="نسبة الحضور" value="92%" change="↑ 3% عن الشهر الماضي" changeDirection="up" color="green" />
        <MetricCard icon={ClipboardList} label="مهام معلّقة" value="3" change="أقربها غداً" color="amber" />
        <MetricCard icon={Trophy} label="نقاط الإنجاز" value="1,240" change="المركز 4 على دفعتك" color="purple" />
      </section>

      {/* Hero KPIs — GPA + Progress side-by-side, stacks on phone */}
      <section className="dash-hero-row">
        <Card className="dash-gpa-card">
          <div className="dash-gpa-body">
            <div className="dash-gpa-text">
              <div className="dash-eyebrow">المعدل التراكمي</div>
              <div className="dash-gpa-value" data-numeric="true">3.8</div>
              <Badge color="green">ممتاز</Badge>
            </div>
            <div className="dash-gpa-orb">
              <Icon icon={GraduationCap} size={26} />
            </div>
          </div>
        </Card>

        <Card className="dash-progress-card">
          <div className="dash-progress-body">
            <div className="dash-doughnut">
              <Doughnut
                data={{
                  labels: ['منجز', 'متبقي'],
                  datasets: [{
                    data: [75, 25],
                    backgroundColor: [
                      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8E6516',
                      getComputedStyle(document.documentElement).getPropertyValue('--surface-3').trim() || '#F2EDE3',
                    ],
                    borderWidth: 0,
                    spacing: 2,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  cutout: '78%',
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                  animation: { duration: 800, easing: 'easeOutQuart' },
                }}
              />
              <div className="dash-doughnut-center" data-numeric="true">75%</div>
            </div>
            <div className="dash-progress-text">
              <div className="dash-eyebrow">التقدّم الأكاديمي</div>
              <div className="dash-progress-value">60 من 80 ساعة معتمدة</div>
              <div className="dash-progress-note">على مسار التخرّج في الموعد</div>
            </div>
          </div>
        </Card>
      </section>

      {/* Term progress bar */}
      <Card className="dash-term-card">
        <header className="dash-term-head">
          <span className="dash-eyebrow">تقدّم الفصل الدراسي الحالي</span>
          <span className="dash-term-pct" data-numeric="true">60%</span>
        </header>
        <div className="dash-term-bar" role="progressbar" aria-valuenow={60} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: '60%' }} />
        </div>
        <footer className="dash-term-foot">
          <span>بداية الفصل · 10/09</span>
          <span>نهاية الفصل · 15/01</span>
        </footer>
      </Card>

      {/* Up-coming agenda */}
      <section className="dash-agenda">
        <header className="dash-agenda-head">
          <h2 className="dash-section-title">المهام والفصول القادمة</h2>
        </header>
        <div className="dash-agenda-list">
          {AGENDA.map((item) => (
            <Card key={item.id} className="dash-agenda-item" data-tone={item.tone}>
              <div className="dash-agenda-icon">
                <Icon icon={item.icon} size={22} />
              </div>
              <div className="dash-agenda-text">
                <div className="dash-agenda-title">{item.title}</div>
                <div className="dash-agenda-meta">{item.meta}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
