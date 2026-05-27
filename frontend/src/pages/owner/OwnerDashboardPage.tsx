import { Users, Activity, BookOpen, GraduationCap, RefreshCw, Download, ShieldAlert, Trash2, Bot, Bell } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Card, MetricCard } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useOwnerStats, useOwnerRealtime, useOwnerAlerts } from '../../hooks/useOwner';

ChartJS.register(ArcElement, Tooltip, Legend);

const DEMO_EVENTS = [
  { action: 'تسجيل دخول مستخدم جديد', user: 'أحمد بن محمد', time: 'منذ 5 دقائق' },
  { action: 'رفع محاضرة جديدة', user: 'د. فاطمة العلي', time: 'منذ 12 دقيقة' },
  { action: 'تغيير صلاحيات مستخدم', user: 'محمد السنوسي', time: 'منذ 30 دقيقة' },
  { action: 'إنشاء مقرر دراسي', user: 'د. خالد الزاوي', time: 'منذ ساعة' },
  { action: 'تسجيل طالب في مقرر', user: 'سارة أحمد', time: 'منذ ساعتين' },
  { action: 'تحديث الملف الشخصي', user: 'علي عبدالله', time: 'منذ 3 ساعات' },
  { action: 'حذف ملف مرفق', user: 'د. نورة الحسن', time: 'منذ 4 ساعات' },
  { action: 'مزامنة بيانات الجامعة', user: 'النظام', time: 'منذ 5 ساعات' },
];

export function OwnerDashboardPage() {
  const stats = useOwnerStats();
  const realtime = useOwnerRealtime();
  const alertsQuery = useOwnerAlerts();
  const data = stats.data ?? {
    totalUsers: 4850,
    students: 4200,
    teachers: 420,
    admins: 15,
    quality: 8,
    owners: 1,
    totalCourses: 186,
    totalOfferings: 312,
    totalEnrollments: 12400,
    recentAuditLogs: 245,
  };
  const realtimeData = realtime.data ?? { activeSessions: 328, aiRequestsPerMin: 47, liveBroadcasts: 3, activeExams: 12 };
  const alerts = alertsQuery.data ?? [];
  const hasAlerts = alerts.length > 0;

  const chartData = {
    labels: ['طلاب', 'أساتذة', 'إداريون', 'جودة'],
    datasets: [{
      data: [data.students, data.teachers, data.admins, data.quality],
      backgroundColor: ['#a3c9ff', '#3DD68C', '#e9c349', '#F5A623'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        rtl: true,
        labels: {
          color: 'var(--text-muted)',
          font: { family: 'IBM Plex Sans Arabic', size: 12 },
          padding: 16,
        },
      },
    },
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة التحكم الرئيسية</h1>
          <p className="page-subtitle">نظرة شاملة وإحصائيات عامة عن المنصة</p>
        </div>
      </div>

      {/* Live Status */}
      <div className={`owner-live-status${hasAlerts ? ' has-alerts' : ''}`}>
        <div className="owner-live-pulse" />
        <span className="status-text">{hasAlerts ? `${alerts.length} تنبيهات مفتوحة` : 'النظام يعمل بشكل طبيعي'}</span>
      </div>

      {/* Metric Cards */}
      <div className="grid-4">
        <MetricCard icon={Users} label="إجمالي المستخدمين" value={data.totalUsers.toLocaleString('ar-LY')} color="brand" />
        <MetricCard icon={Activity} label="الجلسات النشطة" value={realtimeData.activeSessions.toString()} color="green" />
        <MetricCard icon={BookOpen} label="المقررات الدراسية" value={data.totalCourses.toString()} color="purple" />
        <MetricCard icon={GraduationCap} label="إجمالي التسجيلات" value={data.totalEnrollments.toLocaleString('ar-LY')} color="gold" />
      </div>

      {/* Extra Row */}
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <MetricCard icon={Bot} label="طلبات AI اليوم" value={realtimeData.aiRequestsPerMin.toString() + '/دقيقة'} color="purple" />
        <MetricCard icon={Bell} label="تنبيهات مفتوحة" value={alerts.length.toString()} color="amber" />
      </div>

      {/* Chart + System Health */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--sp-4)' }}>
        <Card title="توزيع المستخدمين">
          <div className="owner-chart-container">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </Card>

        <Card title="صحة النظام">
          <div style={{ padding: 'var(--sp-3) 0' }}>
            <div className="owner-health-row">
              <div className="owner-health-dot green" />
              <span className="owner-health-label">وقت تشغيل الخادم</span>
              <span className="owner-health-value">99.8%</span>
            </div>
            <div className="owner-health-row">
              <div className="owner-health-dot green" />
              <span className="owner-health-label">زمن استجابة قاعدة البيانات</span>
              <span className="owner-health-value">12ms</span>
            </div>
            <div className="owner-health-row">
              <div className="owner-health-dot amber" />
              <span className="owner-health-label">آخر مزامنة</span>
              <span className="owner-health-value">منذ 3 ساعات</span>
            </div>
            <div className="owner-health-row">
              <div className="owner-health-dot green" />
              <span className="owner-health-label">نسبة إصابة الذاكرة المؤقتة</span>
              <span className="owner-health-value">94%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Events */}
      <Card title="الأحداث الأخيرة">
        <table className="owner-table">
          <thead>
            <tr>
              <th>الحدث</th>
              <th>المستخدم</th>
              <th>الوقت</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_EVENTS.map((ev, i) => (
              <tr key={i}>
                <td>{ev.action}</td>
                <td style={{ color: 'var(--text-muted)' }}>{ev.user}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-subtle)' }}>{ev.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Quick Actions */}
      <Card title="إجراءات سريعة">
        <div className="owner-action-bar">
          <button type="button" className="btn primary">
            <Icon icon={RefreshCw} size={14} />
            تشغيل المزامنة
          </button>
          <button type="button" className="btn ghost">
            <Icon icon={Download} size={14} />
            تصدير التقرير
          </button>
          <button type="button" className="btn ghost">
            <Icon icon={ShieldAlert} size={14} />
            وضع الصيانة
          </button>
          <button type="button" className="btn ghost">
            <Icon icon={Trash2} size={14} />
            مسح الذاكرة المؤقتة
          </button>
        </div>
      </Card>
    </div>
  );
}
