import { Users, Activity, BookOpen, GraduationCap, RefreshCw, Download, ShieldAlert, Trash2, Bot, Bell, TrendingUp } from 'lucide-react';
import { Card, MetricCard } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useOwnerStats, useOwnerRealtime, useOwnerAlerts } from '../../hooks/useOwner';
import {
  AnimatedCounter, DistributionDonut, TrendArea, Sparkline, TrendChip,
} from '../../lib/charts';

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

  // Simulated 24h trend (every 2 hours) — replaces the previous static donut-only view
  const sessionsTrend = [156, 182, 201, 244, 287, 312, 295, 268, 251, 287, 318, 328];
  const sessionsLabels = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];
  const aiTrend = [22, 18, 14, 16, 24, 38, 51, 49, 45, 47, 52, 47];

  const distribution = [
    { label: 'طلاب',     value: data.students },
    { label: 'أساتذة',   value: data.teachers },
    { label: 'إداريون', value: data.admins },
    { label: 'جودة',     value: data.quality },
  ];

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

      {/* Metric Cards — animated counters */}
      <div className="grid-4">
        <MetricCard
          icon={Users}
          label="إجمالي المستخدمين"
          value={<AnimatedCounter to={data.totalUsers} />}
          color="brand"
        />
        <MetricCard
          icon={Activity}
          label="الجلسات النشطة"
          value={<AnimatedCounter to={realtimeData.activeSessions} />}
          color="green"
        />
        <MetricCard
          icon={BookOpen}
          label="المقررات الدراسية"
          value={<AnimatedCounter to={data.totalCourses} />}
          color="purple"
        />
        <MetricCard
          icon={GraduationCap}
          label="إجمالي التسجيلات"
          value={<AnimatedCounter to={data.totalEnrollments} />}
          color="gold"
        />
      </div>

      {/* Realtime row with sparklines */}
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <Card>
          <div className="intel-card-meta">
            <div className="left">
              <span className="left-label">طلبات AI / دقيقة</span>
              <span className="left-value">
                <AnimatedCounter to={realtimeData.aiRequestsPerMin} />
              </span>
            </div>
            <TrendChip delta={12} suffix="%" />
          </div>
          <Sparkline data={aiTrend} color="ai" height={48} fill />
        </Card>
        <Card>
          <div className="intel-card-meta">
            <div className="left">
              <span className="left-label">تنبيهات مفتوحة</span>
              <span className="left-value">
                <AnimatedCounter to={alerts.length} />
              </span>
            </div>
            <Icon icon={Bell} size={18} style={{ color: 'var(--gold)' }} />
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            {alerts.length === 0
              ? 'لا توجد تنبيهات تحتاج تدخّلاً مباشراً.'
              : 'يستوجب مراجعة من فريق التشغيل.'}
          </div>
        </Card>
      </div>

      {/* Live activity + Distribution */}
      <div className="dash-intel-row">
        <Card title="الجلسات النشطة · آخر 24 ساعة" icon={TrendingUp} subtitle={`ذروة عند ${Math.max(...sessionsTrend)} جلسة`}>
          <TrendArea
            data={sessionsTrend}
            labels={sessionsLabels}
            color="primary"
            height={220}
          />
        </Card>

        <Card title="توزيع المستخدمين">
          <DistributionDonut
            data={distribution}
            size={240}
            centerLabel={(data.totalUsers / 1000).toFixed(1) + 'K'}
            centerSubLabel="مستخدم"
          />
        </Card>
      </div>

      {/* AI usage trend full-width strip */}
      <Card title="نشاط الذكاء الاصطناعي · 24 ساعة" icon={Bot} subtitle="عدد الطلبات لكل دقيقة">
        <TrendArea
          data={aiTrend}
          labels={sessionsLabels}
          color="ai"
          height={180}
        />
      </Card>

      {/* System Health */}
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
