import {
  Users, GraduationCap, ShieldCheck, FileWarning,
  Clock, Radio, AlertTriangle, Settings, RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Card } from '../../components/primitives';
/* r253 (Phase B): the owner dashboard composes the shell patterns —
 * StatLine facts + the TodayList attention rows («يحتاج انتباهك») +
 * RowList recent events. StatStrip/LedgerPanel retire from this page. */
import { PageFrame, PageHeader as PatternsPageHeader, StatLine, TodayList, RowList, RowItem } from '../../components/patterns';
import { useReducedMotion } from '../../components/motion';
import { EmptyState, ErrorState, PageSkeleton, ListSkeleton, CardSkeleton, StripSkeleton, Skeleton } from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { radialOptions, chartPalette, useChartThemeKey } from '../../lib/chartTheme';
import { useOwnerStats, useOwnerRealtime, useOwnerAlerts, useOwnerActivity, useOwnerEducation, type OperationalAlert } from '../../hooks/useOwner';
import { countAr, formatRelativeAr } from '../../lib/format';
import { isCriticalAlert } from '../../lib/ownerLabels';
import { formatDate, formatNum } from '../../utils/numbers';

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

const CRITICAL_ALERT_FORMS: [string, string, string, string] = [
  'تنبيه حرج واحد', 'تنبيهان حرجان', 'تنبيهات حرجة', 'تنبيهاً حرجاً',
];
const IDLE_TEACHER_FORMS: [string, string, string, string] = [
  'أستاذ واحد', 'أستاذان', 'أساتذة', 'أستاذاً',
];

/* 6A10-2: isCriticalAlert (the critical OR error pair) is the SHARED
 * filter from lib/ownerLabels.ts — the dashboard's strip badge, the
 * alerts page's critical KPI and the backend's criticalCount all
 * compute the same pair; the former local copy was deleted. */
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

  // r172b (loading closure): the strip's own pending state — it used to
  // render null until education answered, mounting LATE above the KPI
  // row and pushing everything below down (217px insertion, the owner
  // console's worst CLS source at 0.183 in the delayed-API lab).
  // StripSkeleton rides the same Card anatomy so the page-skeleton
  // slot, this pending state, and the resolved strip all occupy the
  // same box.
  if (education.isPending) {
    return <StripSkeleton title="يحتاج انتباهك" subtitle="جارٍ التحقق من حالات تحتاج انتباهك…" />;
  }

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
  /* r253: the attention rows ride the patterns TodayList — the urgency
   * dot carries the tone (now = critical, soon = pending, later =
   * watch), replacing the ledger zone/lead-label vocabulary. The
   * pending StripSkeleton above is untouched (same Card anatomy). */
  return (
    <TodayList
      title="يحتاج انتباهك"
      items={rows.map((r) => ({
        id: r.key,
        title: r.title,
        meta: r.desc,
        leading: <Icon icon={r.icon} size={16} />,
        to: r.to,
        urgency: r.tone === 'amber' ? 'now' : r.key === 'idle-teachers' ? 'later' : 'soon',
      }))}
    />
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
    /* r172b (loading closure): a MIRROR skeleton, not the generic
       PageSkeleton. The resolved page leads with the real header
       (h1+subtitle, 96px — the generic bars are 86px), the live-status
       band, OwnerActionStrip, the KPI row, the charts row, then the
       activity + quick-action cards. The generic skeleton had none of
       the band/strip slots (the strip alone inserts 217px late; with
       the band it pushed the KPI row 410px down = the lab's 0.183 CLS).
       Every section renders its shape-matched placeholder — the band
       below is the REAL pending band markup (identical to what the
       resolved page shows while alerts pend), so the pending →
       resolved handoff moves nothing. */
    return (
      <PageFrame width="default">
        <PatternsPageHeader
          title="لوحة التحكم الرئيسية"
          description="نظرة شاملة وإحصائيات حيّة عن المنصة"
        />
        <div className="owner-live-status is-pending" aria-busy="true" aria-live="polite">
          <div className="owner-live-pulse" />
          <span className="status-text">جارٍ جلب حالة التنبيهات…</span>
        </div>
        <StripSkeleton title="يحتاج انتباهك" subtitle="جارٍ التحقق من حالات تحتاج انتباهك…" />
        {/* r253: the KPI placeholder is the StatLine shape (4 flat
            .pf-stat cells) so the pending → resolved handoff moves
            nothing on the new composition. */}
        <div className="pf-statline" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="pf-stat">
              <Skeleton width={70} height={11} />
              <div style={{ marginBlock: 'var(--sp-1)' }}>
                <Skeleton width={90} height={28} />
              </div>
              <Skeleton width={120} height={11} />
            </div>
          ))}
        </div>
        <div className="grid-2-1">
          <Card title="توزيع المستخدمين">
            <Skeleton width="100%" height={348} rounded="var(--r-lg)" />
          </Card>
          <Card title="الحالة التشغيليّة">
            <Skeleton width="100%" height={348} rounded="var(--r-lg)" />
          </Card>
        </div>
        <CardSkeleton lines={6} />
        <CardSkeleton lines={3} />
      </PageFrame>
    );
  }
  if (stats.isError || realtime.isError) {
    return (
      <PageFrame width="default">
        <PatternsPageHeader
          title="لوحة التحكم الرئيسية"
        />
        <ErrorState
          error={stats.error ?? realtime.error}
          onRetry={() => { stats.refetch(); realtime.refetch(); }}
        />
      </PageFrame>
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
    <PageFrame width="default">
      <PatternsPageHeader
        title="لوحة التحكم الرئيسية"
        description="نظرة شاملة وإحصائيات حيّة عن المنصة"
        meta={formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }) + ' · قياس مباشر من قاعدة البيانات'}
      />

      {/* Live Status — never claims "normal" unless the alerts query
          answered (see alertBand above). */}
      {alertBand}

      {/* 5-D3: the attention list rides directly under the status band —
          the dashboard answers "what needs me" before "how big are
          we". r253: it is the patterns TodayList now. */}
      <OwnerActionStrip alerts={alerts} />

      {/* r253 — the four platform facts ride the patterns StatLine. */}
      <StatLine
        items={[
          {
            label: 'إجمالي المستخدمين',
            value: <bdi>{formatNum(data.totalUsers)}</bdi>,
            hint: `${formatNum(data.students)} طالبًا · ${formatNum(data.teachers)} أستاذًا`,
          },
          {
            label: 'الجلسات النشطة',
            value: <bdi>{formatNum(realtimeData.activeSessions)}</bdi>,
            hint: 'في هذه اللحظة',
          },
          {
            label: 'المقرّرات الدراسية',
            value: <bdi>{formatNum(data.totalCourses)}</bdi>,
            hint: `${formatNum(data.totalOfferings)} شعبة تدريس فاعلة`,
          },
          {
            label: 'إجمالي التسجيلات',
            value: <bdi>{formatNum(data.totalEnrollments)}</bdi>,
            hint: 'تسجيلات مقرّرات تراكمية',
          },
        ]}
      />

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
            {/* r299: the «حالة المنصة» row died — the live-status band
                directly above OWNS alert status (same query, same
                states) and the attention strip owns the action link;
                a third restatement of the same count stacked three
                boxes into ~600px. */}
            <div className="owner-health-row">
              {/* 6A10-4: zero live sessions is a QUIET campus, not a
                  healthy one — the dot mirrors the neighboring quiet
                  rows (بثّ/اختبارات/طلبات AI all gate on > 0 since
                  22-b 4-A7 P2-1); green claims actual presence. */}
              <div className={`owner-health-dot ${realtimeData.activeSessions > 0 ? 'green' : 'neutral'}`} />
              <span className="owner-health-label">جلسات نشطة الآن</span>
              <span className="owner-health-value">
                <bdi>{formatNum(realtimeData.activeSessions)}</bdi>
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
                <bdi>{formatNum(realtimeData.liveBroadcasts)}</bdi>
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${realtimeData.activeExams > 0 ? 'green' : 'neutral'}`} />
              <span className="owner-health-label">اختبارات جارية</span>
              <span className="owner-health-value">
                <bdi>{formatNum(realtimeData.activeExams)}</bdi>
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${realtimeData.aiRequestsPerMin > 0 ? 'green' : 'neutral'}`} />
              <span className="owner-health-label">طلبات الذكاء الاصطناعيّ / دقيقة</span>
              <span className="owner-health-value">
                <bdi>{formatNum(realtimeData.aiRequestsPerMin)}</bdi>
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${lastEventAt && !activity.isError ? 'green' : 'neutral'}`} />
              <span className="owner-health-label">آخر نشاط مسجَّل</span>
              <span className="owner-health-value">{lastActivityLabel}</span>
            </div>
            <div className="owner-health-row">
              {/* 6A10-4: an empty 7-day log is the absence of signal, not
                  a health verdict — zero recorded events can equally
                  mean "nothing happened" or "the logger isn't
                  writing"; green only when events actually exist, the
                  same > 0 gate the sessions row above now uses. */}
              <div className={`owner-health-dot ${data.recentAuditLogs > 0 ? 'green' : 'neutral'}`} />
              <span className="owner-health-label">سجلّات آخر 7 أيام</span>
              <span className="owner-health-value">
                <bdi>{formatNum(data.recentAuditLogs)}</bdi>
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Events — real audit log; every state is honest
          (pending = shape-matched skeleton, error = retry — an API
          failure no longer renders as "no events", ruling #14).
          r253: the 4-column table becomes dense RowList rows — one row
          per event (action · actor · resource · relative time), the
          same facts without the grid. */}
      <Card title="الأحداث الأخيرة" icon={Clock} subtitle="آخر العمليّات على المنصّة">
        {activity.isPending ? (
          <ListSkeleton rows={6} />
        ) : activity.isError ? (
          <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
        ) : events.length === 0 ? (
          <EmptyState illustration="empty-list" title="لا توجد أحداث بعد" description="ستظهر أحدث العمليّات هنا فور حدوثها." icon={FileWarning} />
        ) : (
          <RowList aria-label="الأحداث الأخيرة" density="compact">
            {events.map((ev) => (
              <RowItem
                key={ev.id}
                title={actionLabel(ev.action)}
                meta={(
                  <>
                    {ev.user ? `${ev.user.firstName} ${ev.user.lastName}` : 'النظام'}
                    {ev.resourceType && (
                      <> · {resourceLabel(ev.resourceType)}</>
                    )}
                  </>
                )}
                trailing={
                  <span className="owner-cell-muted" title={formatDate(ev.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}>
                    {formatRelativeAr(ev.createdAt)}
                  </span>
                }
              />
            ))}
          </RowList>
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
    </PageFrame>
  );
}
