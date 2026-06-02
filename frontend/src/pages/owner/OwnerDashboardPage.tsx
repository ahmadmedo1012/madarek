import { Users, Activity, BookOpen, GraduationCap, Bot, Bell, ShieldCheck, FileWarning, Clock, RefreshCw, Download, ShieldAlert, Trash2 } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Card, MetricCard } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { radialOptions, chartPalette } from '../../lib/chartTheme';
import { useOwnerStats, useOwnerRealtime, useOwnerAlerts, useOwnerActivity } from '../../hooks/useOwner';

ChartJS.register(ArcElement, Tooltip, Legend);

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const dd = Math.round(h / 24);
  if (dd < 7) return `منذ ${dd} يوم`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

const ACTION_LABEL: Record<string, string> = {
  'user.login': 'تسجيل دخول',
  'user.logout': 'تسجيل خروج',
  'user.created': 'إنشاء حساب',
  'user.role_changed': 'تغيير صلاحيات',
  'user.status_changed': 'تعديل حالة الحساب',
  'course.created': 'إنشاء مقرر',
  'course.updated': 'تحديث مقرر',
  'enrollment.created': 'تسجيل في مقرر',
  'material.uploaded': 'رفع مادة',
  'material.deleted': 'حذف مادة',
  'paper.published': 'نشر بحث',
  'announcement.created': 'بثّ إعلان',
  'sync.run': 'مزامنة بيانات الجامعة',
};

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

export function OwnerDashboardPage() {
  const stats = useOwnerStats();
  const realtime = useOwnerRealtime();
  const alertsQuery = useOwnerAlerts();
  const activity = useOwnerActivity({ page: 1, limit: 8 });

  // Don't lie with placeholder numbers. If everything is still loading,
  // show a single skeleton; if anything errored, surface that honestly.
  if (stats.isPending && realtime.isPending) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">لوحة التحكم الرئيسية</h1>
            <p className="page-subtitle">جارٍ تحضير لوحتك…</p>
          </div>
        </header>
        <LoadingState />
      </div>
    );
  }
  if (stats.isError || realtime.isError) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">لوحة التحكم الرئيسية</h1>
          </div>
        </header>
        <ErrorState
          error={stats.error ?? realtime.error}
          onRetry={() => { stats.refetch(); realtime.refetch(); }}
        />
      </div>
    );
  }

  const data = stats.data!;
  const realtimeData = realtime.data ?? { activeSessions: 0, aiRequestsPerMin: 0, liveBroadcasts: 0, activeExams: 0 };
  const alerts = alertsQuery.data ?? [];
  const hasAlerts = alerts.length > 0;
  const events = activity.data?.data ?? [];

  const chartData = {
    labels: ['طلاب', 'أساتذة', 'إداريون', 'جودة'],
    datasets: [{
      data: [data.students, data.teachers, data.admins, data.quality],
      backgroundColor: chartPalette().slice(0, 4),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };
  const chartOptions = radialOptions({ legend: true });

  const lastEventAt = events[0]?.createdAt ?? null;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة التحكم الرئيسية</h1>
          <p className="page-subtitle">نظرة شاملة وإحصائيات حيّة عن المنصة</p>
        </div>
      </header>

      {/* Live Status — uses real alerts count */}
      <div className={`owner-live-status${hasAlerts ? ' has-alerts' : ''}`}>
        <div className="owner-live-pulse" />
        <span className="status-text">{hasAlerts ? `${alerts.length} تنبيهات مفتوحة` : 'النظام يعمل بشكل طبيعي'}</span>
      </div>

      {/* Metric Cards — every value comes from the API */}
      <div className="grid-4">
        <MetricCard icon={Users} label="إجمالي المستخدمين" value={data.totalUsers.toLocaleString('ar-LY')} color="brand" />
        <MetricCard icon={Activity} label="الجلسات النشطة" value={realtimeData.activeSessions.toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={BookOpen} label="المقررات الدراسية" value={data.totalCourses.toLocaleString('ar-LY')} color="purple" />
        <MetricCard icon={GraduationCap} label="إجمالي التسجيلات" value={data.totalEnrollments.toLocaleString('ar-LY')} color="gold" />
      </div>

      {/* Extra Row */}
      <div className="grid-2">
        <MetricCard
          icon={Bot}
          label="طلبات AI / دقيقة"
          value={realtimeData.aiRequestsPerMin.toLocaleString('ar-LY')}
          color="purple"
        />
        <MetricCard
          icon={Bell}
          label="تنبيهات مفتوحة"
          value={alerts.length.toLocaleString('ar-LY')}
          color={alerts.length === 0 ? 'green' : 'amber'}
        />
      </div>

      {/* Chart + Operational status */}
      <div className="grid-2-1">
        <Card title="توزيع المستخدمين">
          <div className="owner-chart-container">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </Card>

        <Card title="الحالة التشغيليّة">
          <div style={{ padding: 'var(--sp-3) 0' }}>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${hasAlerts ? 'amber' : 'green'}`} />
              <span className="owner-health-label">حالة المنصة</span>
              <span className="owner-health-value">
                {hasAlerts ? `${alerts.length} تنبيهات` : 'سليمة'}
              </span>
            </div>
            <div className="owner-health-row">
              <div className="owner-health-dot green" />
              <span className="owner-health-label">جلسات نشطة الآن</span>
              <span className="owner-health-value">
                {realtimeData.activeSessions.toLocaleString('ar-LY')}
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${realtimeData.liveBroadcasts > 0 ? 'green' : 'amber'}`} />
              <span className="owner-health-label">بثّ مباشر جارٍ</span>
              <span className="owner-health-value">
                {realtimeData.liveBroadcasts.toLocaleString('ar-LY')}
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${realtimeData.activeExams > 0 ? 'green' : 'amber'}`} />
              <span className="owner-health-label">امتحانات جارية</span>
              <span className="owner-health-value">
                {realtimeData.activeExams.toLocaleString('ar-LY')}
              </span>
            </div>
            <div className="owner-health-row">
              <div className="owner-health-dot green" />
              <span className="owner-health-label">آخر نشاط مسجَّل</span>
              <span className="owner-health-value">
                {lastEventAt ? formatRelative(lastEventAt) : '—'}
              </span>
            </div>
            <div className="owner-health-row">
              <div className="owner-health-dot green" />
              <span className="owner-health-label">سجلّات آخر 7 أيام</span>
              <span className="owner-health-value">
                {data.recentAuditLogs.toLocaleString('ar-LY')}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Events — real audit log */}
      <Card title="الأحداث الأخيرة" icon={Clock} subtitle="آخر العمليّات على المنصّة">
        {activity.isPending ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <EmptyState title="لا توجد أحداث بعد" description="ستظهر أحدث العمليّات هنا فور حدوثها." icon={FileWarning} />
        ) : (
          <table className="owner-table">
            <thead>
              <tr>
                <th>الحدث</th>
                <th>المستخدم</th>
                <th>المورد</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{actionLabel(ev.action)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {ev.user ? `${ev.user.firstName} ${ev.user.lastName}` : 'النظام'}
                  </td>
                  <td style={{ color: 'var(--text-subtle)' }}>
                    {ev.resourceType ?? '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-subtle)' }}>
                    {formatRelative(ev.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Quick Actions */}
      <Card title="إجراءات سريعة" icon={ShieldCheck}>
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
