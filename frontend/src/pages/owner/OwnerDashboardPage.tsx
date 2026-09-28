import {
  Users, Activity, BookOpen, GraduationCap, ShieldCheck, FileWarning,
  Clock, Radio, AlertTriangle, Settings, RefreshCw, ArrowLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
import { useOwnerStats, useOwnerRealtime, useOwnerAlerts, useOwnerActivity, useOwnerEducation, type OperationalAlert } from '../../hooks/useOwner';
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

/* ════════════════════════════════════════════════════════════════
   Action strip (5-D3 — 5-B4's admin «يحتاج انتباهك» pattern)
   ════════════════════════════════════════════════════════════════ */

interface OwnerActionRow {
  key: string;
  tone: 'amber' | 'brand';
  icon: LucideIcon;
  title: string;
  desc: string;
  to: string;
  hint: string;
}

const OWNER_ACTION_TONE_INK: Record<OwnerActionRow['tone'], string> = {
  amber: 'var(--warning-ink)',
  brand: 'var(--accent-ink, var(--accent))',
};

const CRITICAL_ALERT_FORMS: [string, string, string, string] = [
  'تنبيه حرج واحد', 'تنبيهان حرجان', 'تنبيهات حرجة', 'تنبيهاً حرجاً',
];
const IDLE_TEACHER_FORMS: [string, string, string, string] = [
  'أستاذ واحد', 'أستاذان', 'أساتذة', 'أستاذاً',
];

/** The dashboard's server-side critical severities (the system route
 *  counts the same pair for its criticalCount). */
function isCriticalAlert(a: OperationalAlert): boolean {
  return a.severity === 'critical' || a.severity === 'error';
}

/**
 * The owner's "what needs a decision" list — 5-B4's admin-strip
 * pattern, on data the OWNER role actually carries: the open
 * operational alerts the page already fetched (the strip turns the
 * status band's number into an action link) and the education
 * payload's idle-teacher workload bucket. Rows appear only when
 * their count > 0 — a healthy platform sees no strip, not a wall of
 * zeros.
 */
function OwnerActionStrip({ alerts }: { alerts: OperationalAlert[] }) {
  const education = useOwnerEducation();

  const rows: OwnerActionRow[] = [];
  if (alerts.length > 0) {
    const critical = alerts.filter(isCriticalAlert).length;
    rows.push({
      key: 'open-alerts',
      tone: critical > 0 ? 'amber' : 'brand',
      icon: AlertTriangle,
      title: 'تنبيهات تشغيليّة مفتوحة',
      desc: critical > 0
        ? `${countAr(alerts.length, OPEN_ALERT_FORMS)} — منها ${countAr(critical, CRITICAL_ALERT_FORMS)}`
        : countAr(alerts.length, OPEN_ALERT_FORMS),
      to: '/owner/alerts',
      hint: 'فتح التنبيهات التشغيليّة',
    });
  }
  const idle = education.data?.workloadBuckets.idle ?? 0;
  if (education.isSuccess && idle > 0) {
    rows.push({
      key: 'idle-teachers',
      tone: 'brand',
      icon: GraduationCap,
      title: 'أساتذة بلا حصص تدريس هذا الفصل',
      desc: `${countAr(idle, IDLE_TEACHER_FORMS)} لم تُسند إليهم مقرّرات — راجع أعباء التدريس من لوحة التعليم`,
      to: '/owner/education',
      hint: 'فتح لوحة التعليم',
    });
  }

  if (rows.length === 0) return null;
  return (
    <Card
      title="يحتاج انتباهك"
      icon={AlertTriangle}
      subtitle={countAr(rows.length, ['بند واحد', 'بندان', 'بنود', 'بنداً'])}
    >
      <div className="flex-col gap-2">
        {rows.map((r) => (
          <Link
            key={r.key}
            to={r.to}
            className={`alert ${r.tone}`}
            title={r.hint}
            style={{ textDecoration: 'none' }}
          >
            <span style={{ color: OWNER_ACTION_TONE_INK[r.tone], marginTop: 2 }}>
              <Icon icon={r.icon} size={16} />
            </span>
            <div className="alert-body">
              <div className="alert-title">{r.title}</div>
              <div className="alert-desc">{r.desc}</div>
            </div>
            <Icon icon={ArrowLeft} size={14} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
          </Link>
        ))}
      </div>
    </Card>
  );
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

      {/* 5-D3: the action list rides directly under the status band —
          the dashboard answers "what needs me" before "how big are
          we" (5-B4's admin ordering). */}
      <OwnerActionStrip alerts={alerts} />

      {/* Metric Cards — every value comes from the API. 22-b (4-A7
          P2-3): the second grid-2 strip (طلبات AI + تنبيهات مفتوحة)
          folded away — six identical tiles flattened the page's
          hierarchy; the AI rate now lives in the health list below and
          the alert count is already carried by the status band +
          «حالة المنصة» row, so no signal was lost. */}
      <div className="grid-4">
        <MetricCard icon={Users} label="إجمالي المستخدمين" value={<bdi>{data.totalUsers.toLocaleString('ar-LY')}</bdi>} color="brand" />
        <MetricCard icon={Activity} label="الجلسات النشطة" value={<bdi>{realtimeData.activeSessions.toLocaleString('ar-LY')}</bdi>} color="green" />
        <MetricCard icon={BookOpen} label="المقرّرات الدراسية" value={<bdi>{data.totalCourses.toLocaleString('ar-LY')}</bdi>} color="purple" />
        <MetricCard icon={GraduationCap} label="إجمالي التسجيلات" value={<bdi>{data.totalEnrollments.toLocaleString('ar-LY')}</bdi>} color="gold" />
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
              {/* 22-b (4-A7 P2-1): zero live broadcasts/exams/AI calls
                  means a QUIET campus, not a degraded one — the dot is
                  neutral (the pending/unknown color), amber stays
                  reserved for real thresholds. */}
              <div className={`owner-health-dot ${realtimeData.liveBroadcasts > 0 ? 'green' : 'neutral'}`} />
              <span className="owner-health-label">بثّ مباشر جارٍ</span>
              <span className="owner-health-value">
                <bdi>{realtimeData.liveBroadcasts.toLocaleString('ar-LY')}</bdi>
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${realtimeData.activeExams > 0 ? 'green' : 'neutral'}`} />
              <span className="owner-health-label">اختبارات جارية</span>
              <span className="owner-health-value">
                <bdi>{realtimeData.activeExams.toLocaleString('ar-LY')}</bdi>
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${realtimeData.aiRequestsPerMin > 0 ? 'green' : 'neutral'}`} />
              <span className="owner-health-label">طلبات الذكاء الاصطناعيّ / دقيقة</span>
              <span className="owner-health-value">
                <bdi>{realtimeData.aiRequestsPerMin.toLocaleString('ar-LY')}</bdi>
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
          /* 22-b (4-A7 P1-5): the shared .table.tbl-stack migration (the
           * users page's pattern) — the bare .owner-table overflowed its
           * card at 390px; on phones each row becomes a labelled card. */
          <div className="table-wrap">
            <table className="table tbl-stack owner-events-table">
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
                    <td className="tbl-strong" data-label="الحدث">{actionLabel(ev.action)}</td>
                    <td className="owner-cell-muted" data-label="المستخدم">
                      {ev.user ? `${ev.user.firstName} ${ev.user.lastName}` : 'النظام'}
                    </td>
                    <td className="owner-cell-muted" data-label="المورد">{resourceLabel(ev.resourceType)}</td>
                    <td className="owner-cell-muted" data-label="الوقت">{formatRelativeAr(ev.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
