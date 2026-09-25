import {
  Users, Activity, BookOpen, GraduationCap, Bot, Bell, ShieldCheck, FileWarning,
  Clock, Radio, AlertTriangle, Settings, RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Card, MetricCard } from '../../components/primitives';
import { useReducedMotion } from '../../components/motion';
import { EmptyState, ErrorState, PageSkeleton, TableSkeleton } from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { radialOptions, chartPalette, useChartThemeKey } from '../../lib/chartTheme';
import { useOwnerStats, useOwnerRealtime, useOwnerAlerts, useOwnerActivity } from '../../hooks/useOwner';
import { countAr, formatRelativeAr } from '../../lib/format';

ChartJS.register(ArcElement, Tooltip, Legend);

/* countAr + formatRelativeAr live in lib/format.ts (wave 9-a). */

const OPEN_ALERT_FORMS: [string, string, string, string] = [
  'تنبيه مفتوح واحد', 'تنبيهان مفتوحان', 'تنبيهات مفتوحة', 'تنبيهاً مفتوحاً',
];

/* formatRelativeAr (counted-plural relative time) is imported from
 * lib/format.ts — identical strings to the former local copy. */

const ACTION_LABEL: Record<string, string> = {
  'user.login': 'تسجيل دخول',
  'user.logout': 'تسجيل خروج',
  'user.created': 'إنشاء حساب',
  'user.role_changed': 'تغيير صلاحيات',
  'user.status_changed': 'تعديل حالة الحساب',
  'course.created': 'إنشاء مقرّر',
  'course.updated': 'تحديث مقرّر',
  'enrollment.created': 'تسجيل في مقرّر',
  'material.uploaded': 'رفع ملف',
  'material.deleted': 'حذف ملف',
  'paper.published': 'نشر بحث',
  'announcement.created': 'بثّ إعلان',
  'sync.run': 'مزامنة بيانات الجامعة',
  // Real backend audit actions (owner/permissions/teacher routes) —
  // without these the feed shows raw English enums.
  ROLE_CHANGE: 'تغيير صلاحيات مستخدم',
  STATUS_CHANGE: 'تعديل حالة الحساب',
  CAPABILITY_OVERRIDE: 'تجاوز صلاحية',
  USER_SCOPE_CHANGE: 'تعديل نطاق مستخدم',
  TEACHER_POSITION: 'تعيين موقع أستاذ',
  TEACHER_VERIFY: 'توثيق أستاذ',
  // The two enrollment audit actions the backend writes (15-a P1-4) —
  // before 17-a2 these rendered raw English in the events table.
  ENROLLMENT_CREATED: 'تسجيل طالب في مقرّر',
  ENROLLMENT_REMOVED: 'إلغاء تسجيل طالب',
  ALERT_RESOLVED: 'حلّ تنبيه تشغيليّ',
  SETTING_UPDATED: 'تحديث إعداد المنصّة',
  FEATURE_FLAG_TOGGLED: 'تبديل ميزة',
  'theme.update': 'تغيير مظهر المنصّة',
  'onboarding.complete': 'إكمال جولة التعريف',
  'milestone.fire': 'تحقيق إنجاز',
};

/** Audit-log resource types as written by the backend (Prisma models). */
const RESOURCE_LABELS: Record<string, string> = {
  User: 'مستخدم',
  TeacherProfile: 'ملف أستاذ',
  UserPermission: 'صلاحية مستخدم',
  OperationalAlert: 'تنبيه تشغيليّ',
  PlatformSetting: 'إعداد منصّة',
  FeatureFlag: 'ميزة',
};

function actionLabel(action: string): ReactNode {
  return ACTION_LABEL[action] ?? <bdi>{action}</bdi>;
}

function resourceLabel(resourceType: string | null): ReactNode {
  if (!resourceType) return '—';
  return RESOURCE_LABELS[resourceType] ?? <bdi>{resourceType}</bdi>;
}

export function OwnerDashboardPage() {
  const stats = useOwnerStats();
  const realtime = useOwnerRealtime();
  const alertsQuery = useOwnerAlerts();
  const activity = useOwnerActivity({ page: 1, limit: 8 });
  // Remounts the chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();
  // Baking the reduced-motion animation profile into memoized options
  // requires re-building them when the OS flag flips mid-session too.
  const reducedMotion = useReducedMotion();
  const statsData = stats.data;

  // Chart props are memoized (audit 11-f P2-2): the realtime poll
  // re-renders this page every 15 s and react-chartjs-2 re-applies any
  // identity-changed data/options prop with an animated chart.update() —
  // unmemoized objects meant a full relayout on every poll tick.
  // themeKey participates because chartPalette()/radialOptions() resolve
  // CSS custom properties at call time, and the remounted canvas must
  // re-resolve them for the new theme.
  const segments = useMemo(() => statsData ? [
    { label: 'طلاب', value: statsData.students },
    { label: 'أساتذة', value: statsData.teachers },
    { label: 'إداريون', value: statsData.admins },
    // Person-group noun — «جودة» alone is the function, not the people
    // (15-j P1-8; matches the aria-label's «فريق جودة» phrasing).
    { label: 'فريق جودة', value: statsData.quality },
  ] : [], [statsData]);

  const chartData = useMemo(() => ({
    labels: segments.map((s) => s.label),
    datasets: [{
      data: segments.map((s) => s.value),
      backgroundColor: chartPalette().slice(0, 4),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  }), [segments, themeKey]);

  const chartOptions = useMemo(
    () => radialOptions({ legend: true }),
    [themeKey, reducedMotion],
  );

  // Don't lie with placeholder numbers. Every value on this page comes
  // from a real query. TanStack Query v5 gating: the page is only ready
  // when BOTH core queries have data — the previous
  // `stats.isPending && realtime.isPending` gate let a resolved
  // realtime query fall through to `stats.data!` while stats was still
  // pending → TypeError → blank page (audit 0-e P0-2).
  const loading = stats.isPending || realtime.isPending;
  if (loading) {
    return <PageSkeleton />;
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

  const data = statsData;
  const realtimeData = realtime.data;
  // The gates above guarantee both are defined; this guard keeps the
  // page honest (skeleton, never a crash) if a future refactor breaks
  // that invariant — query data is never non-null-asserted here.
  if (!data || !realtimeData) {
    return <PageSkeleton />;
  }

  // The status band and the alerts KPI derive from the alerts query's
  // REAL state (audit 0-e P0-3, 1-b follow-up): "healthy" is only ever
  // shown after the query answered with zero open alerts — pending
  // renders a neutral band, an error renders a degraded band with a
  // working retry (ruling #14: never mask an error as "all normal").
  const alerts = alertsQuery.data ?? [];
  const hasAlerts = alertsQuery.isSuccess && alerts.length > 0;

  const events = activity.data?.data ?? [];
  const lastEventAt = events[0]?.createdAt ?? null;
  const lastActivityLabel = activity.isPending
    ? '…'
    : activity.isError
      ? 'تعذّر الجلب'
      : lastEventAt
        ? formatRelativeAr(lastEventAt)
        : '—';

  const topSegment = segments.reduce((a, b) => (b.value > a.value ? b : a));
  const chartSummary = data.totalUsers === 0
    ? 'لا مستخدمين مسجَّلين بعد.'
    : `${topSegment.label} الفئة الأكبر من مستخدمي المنصّة.`;

  const alertBand = alertsQuery.isError ? (
    <div className="owner-live-status is-degraded" role="alert">
      <div className="owner-live-pulse" />
      <span className="status-text">تعذّر جلب حالة التنبيهات</span>
      <div className="owner-live-tools">
        <button type="button" className="btn ghost sm" onClick={() => alertsQuery.refetch()}>
          <Icon icon={RefreshCw} size={12} />
          إعادة المحاولة
        </button>
      </div>
    </div>
  ) : (
    <div className={`owner-live-status${hasAlerts ? ' has-alerts' : ''}${alertsQuery.isPending ? ' is-pending' : ''}`}>
      <div className="owner-live-pulse" />
      <span className="status-text">
        {alertsQuery.isPending
          ? 'جارٍ جلب حالة التنبيهات…'
          : hasAlerts
            ? countAr(alerts.length, OPEN_ALERT_FORMS)
            : 'النظام يعمل بشكل طبيعي'}
      </span>
    </div>
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة التحكم الرئيسية</h1>
          <p className="page-subtitle">نظرة شاملة وإحصائيات حيّة عن المنصة</p>
        </div>
      </header>

      {/* Live Status — never claims "normal" unless the alerts query
          answered (see alertBand above). */}
      {alertBand}

      {/* Metric Cards — every value comes from the API */}
      <div className="grid-4">
        <MetricCard icon={Users} label="إجمالي المستخدمين" value={<bdi>{data.totalUsers.toLocaleString('ar-LY')}</bdi>} color="brand" />
        <MetricCard icon={Activity} label="الجلسات النشطة" value={<bdi>{realtimeData.activeSessions.toLocaleString('ar-LY')}</bdi>} color="green" />
        <MetricCard icon={BookOpen} label="المقرّرات الدراسية" value={<bdi>{data.totalCourses.toLocaleString('ar-LY')}</bdi>} color="purple" />
        <MetricCard icon={GraduationCap} label="إجمالي التسجيلات" value={<bdi>{data.totalEnrollments.toLocaleString('ar-LY')}</bdi>} color="gold" />
      </div>

      {/* Extra Row — the alerts tile turns amber only on a confirmed
          count > 0 (DESIGN_POLISH_PLAN phase 3). */}
      <div className="grid-2">
        <MetricCard
          icon={Bot}
          label="طلبات AI / دقيقة"
          value={<bdi>{realtimeData.aiRequestsPerMin.toLocaleString('ar-LY')}</bdi>}
          color="purple"
        />
        <MetricCard
          icon={Bell}
          label="تنبيهات مفتوحة"
          value={
            alertsQuery.isPending ? '…'
              : alertsQuery.isError ? '—'
                : <bdi>{alerts.length.toLocaleString('ar-LY')}</bdi>
          }
          color={hasAlerts ? 'amber' : alertsQuery.isSuccess ? 'green' : 'brand'}
        />
      </div>

      {/* Chart + Operational status */}
      <div className="grid-2-1">
        <Card title="توزيع المستخدمين">
          <ChartFrame
            className="owner-chart-container"
            ariaLabel="مخطط دائري يوزّع مستخدمي المنصّة على الأدوار: طلاب وأساتذة وإداريّون وفريق جودة"
            summary={chartSummary}
            table={{
              caption: 'توزيع المستخدمين حسب الدور',
              columns: ['الدور', 'العدد'],
              rows: segments.map((s) => [s.label, s.value]),
            }}
          >
            <Doughnut key={themeKey} data={chartData} options={chartOptions} />
          </ChartFrame>
        </Card>

        <Card title="الحالة التشغيليّة">
          <div className="owner-health-list">
            <div className="owner-health-row">
              <div className={`owner-health-dot ${alertsQuery.isPending ? 'neutral' : alertsQuery.isError ? 'red' : hasAlerts ? 'amber' : 'green'}`} />
              <span className="owner-health-label">حالة المنصة</span>
              <span className="owner-health-value">
                {alertsQuery.isPending ? '…' : alertsQuery.isError ? 'تعذّر الجلب' : hasAlerts ? countAr(alerts.length, OPEN_ALERT_FORMS) : 'سليمة'}
              </span>
            </div>
            <div className="owner-health-row">
              <div className="owner-health-dot green" />
              <span className="owner-health-label">جلسات نشطة الآن</span>
              <span className="owner-health-value">
                <bdi>{realtimeData.activeSessions.toLocaleString('ar-LY')}</bdi>
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${realtimeData.liveBroadcasts > 0 ? 'green' : 'amber'}`} />
              <span className="owner-health-label">بثّ مباشر جارٍ</span>
              <span className="owner-health-value">
                <bdi>{realtimeData.liveBroadcasts.toLocaleString('ar-LY')}</bdi>
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${realtimeData.activeExams > 0 ? 'green' : 'amber'}`} />
              <span className="owner-health-label">اختبارات جارية</span>
              <span className="owner-health-value">
                <bdi>{realtimeData.activeExams.toLocaleString('ar-LY')}</bdi>
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${lastEventAt && !activity.isError ? 'green' : 'neutral'}`} />
              <span className="owner-health-label">آخر نشاط مسجَّل</span>
              <span className="owner-health-value">{lastActivityLabel}</span>
            </div>
            <div className="owner-health-row">
              <div className="owner-health-dot green" />
              <span className="owner-health-label">سجلّات آخر 7 أيام</span>
              <span className="owner-health-value">
                <bdi>{data.recentAuditLogs.toLocaleString('ar-LY')}</bdi>
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Events — real audit log; every state is honest
          (pending = shape-matched skeleton, error = retry — an API
          failure no longer renders as "no events", ruling #14). */}
      <Card title="الأحداث الأخيرة" icon={Clock} subtitle="آخر العمليّات على المنصّة">
        {activity.isPending ? (
          <TableSkeleton rows={6} cols={4} />
        ) : activity.isError ? (
          <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
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
                  <td className="muted">
                    {ev.user ? `${ev.user.firstName} ${ev.user.lastName}` : 'النظام'}
                  </td>
                  <td className="muted">{resourceLabel(ev.resourceType)}</td>
                  <td className="muted">{formatRelativeAr(ev.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Quick Actions — WS-F6: wired to real /owner/* routes (the old
          four buttons had no onClick and no destination). */}
      <Card title="إجراءات سريعة" icon={ShieldCheck}>
        <div className="owner-action-bar">
          <Link to="/owner/realtime" className="btn primary">
            <Icon icon={Radio} size={14} />
            المراقبة الحيّة
          </Link>
          <Link to="/owner/users" className="btn ghost">
            <Icon icon={Users} size={14} />
            إدارة المستخدمين
          </Link>
          <Link to="/owner/alerts" className="btn ghost">
            <Icon icon={AlertTriangle} size={14} />
            التنبيهات التشغيليّة
          </Link>
          <Link to="/owner/system" className="btn ghost">
            <Icon icon={Settings} size={14} />
            المزامنة وإعدادات النظام
          </Link>
        </div>
      </Card>
    </div>
  );
}
