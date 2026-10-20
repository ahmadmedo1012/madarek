import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  LogIn, FileText, UserCog, Server, AlertTriangle, Clock,
  RefreshCw, ChevronDown, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { Card, Tabs } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
/* r252 (Phase B): the audit log composes the shell patterns — PageFrame
 * rhythm, patterns PageHeader, the StatLine facts, and FilterBar as the
 * sticky filter rail above the timeline (the mission's "filterable
 * timeline of rows", not a raw table). */
import { PageFrame, PageHeader as PatternsPageHeader, StatLine, FilterBar } from '../../components/patterns';
import { useOwnerActivity } from '../../hooks/useOwner';
import { formatRelativeAr } from '../../lib/format';
import type { LucideIcon } from 'lucide-react';
import { formatDate, formatNum } from '../../utils/numbers';

type EventType = 'all' | 'login' | 'content' | 'roles' | 'system';

const PAGE_SIZE = 50;

const TYPE_CONFIG: Record<'login' | 'content' | 'roles' | 'system' | 'error', { icon: LucideIcon; colorClass: string; label: string }> = {
  login:   { icon: LogIn, colorClass: 'green', label: 'تسجيل دخول' },
  content: { icon: FileText, colorClass: 'blue', label: 'محتوى' },
  roles:   { icon: UserCog, colorClass: 'purple', label: 'أدوار' },
  system:  { icon: Server, colorClass: 'amber', label: 'نظام' },
  error:   { icon: AlertTriangle, colorClass: 'red', label: 'خطأ' },
};

/**
 * Map an audit-log action to a category + Arabic action label.
 * Falls back to 'system' for anything unrecognized so we never lose events.
 */
function classifyAction(action: string): { category: keyof typeof TYPE_CONFIG; label: string } {
  if (action.startsWith('user.login') || action.startsWith('auth.login')) return { category: 'login', label: 'تسجيل دخول' };
  if (action.includes('login.failed')) return { category: 'error', label: 'محاولة دخول فاشلة' };
  if (action.startsWith('user.logout')) return { category: 'login', label: 'تسجيل خروج' };
  if (action.startsWith('user.role') || action.startsWith('user.status') || action.startsWith('roles.')) return { category: 'roles', label: 'تعديل صلاحيات' };
  if (action.startsWith('user.created')) return { category: 'roles', label: 'إنشاء حساب' };
  // Real backend audit actions (owner/permissions/teacher routes) —
  // uppercase enums, mapped so they never render raw in the feed.
  if (
    action.startsWith('ROLE_') || action.startsWith('STATUS_') ||
    action.startsWith('CAPABILITY_') || action.startsWith('USER_SCOPE') ||
    action.startsWith('TEACHER_')
  ) return { category: 'roles', label: 'تعديل صلاحيات' };
  // Enrollment audit actions the backend actually writes (15-a P1-4:
  // without the branch these fell through to the raw-English fallback).
  if (action.startsWith('ENROLLMENT_')) return { category: 'content', label: 'تسجيل في مقرّر' };
  if (action.startsWith('material.') || action.startsWith('course.') || action.startsWith('paper.') || action.startsWith('announcement.') || action.startsWith('competition.')) {
    return { category: 'content', label: 'تعديل محتوى' };
  }
  if (action.startsWith('sync.') || action.startsWith('system.') || action.startsWith('ALERT_') ||
    action.startsWith('SETTING_') || action.startsWith('FEATURE_FLAG') ||
    action.startsWith('theme.') || action.startsWith('onboarding.') || action.startsWith('milestone.')) {
    return { category: 'system', label: 'تشغيل نظام' };
  }
  if (action.includes('error') || action.includes('failed')) return { category: 'error', label: 'خطأ' };
  return { category: 'system', label: action };
}

const ACTION_LABEL: Record<string, string> = {
  'user.login': 'تسجيل دخول ناجح',
  'auth.login': 'تسجيل دخول ناجح',
  'user.logout': 'تسجيل خروج',
  'user.created': 'إنشاء حساب',
  'user.role_changed': 'تغيير صلاحيات مستخدم',
  'user.status_changed': 'تعديل حالة الحساب',
  'course.created': 'إنشاء مقرّر',
  'course.updated': 'تحديث مقرّر',
  'enrollment.created': 'تسجيل في مقرّر',
  'material.uploaded': 'رفع ملف',
  'material.deleted': 'حذف ملف',
  'paper.published': 'نشر بحث',
  'announcement.created': 'بثّ إعلان',
  'competition.created': 'إنشاء مسابقة',
  'sync.run': 'تشغيل المزامنة',
  ROLE_CHANGE: 'تغيير صلاحيات مستخدم',
  STATUS_CHANGE: 'تعديل حالة الحساب',
  CAPABILITY_OVERRIDE: 'تجاوز صلاحية',
  USER_SCOPE_CHANGE: 'تعديل نطاق مستخدم',
  TEACHER_POSITION: 'تعيين موقع أستاذ',
  TEACHER_VERIFY: 'توثيق أستاذ',
  // The two enrollment audit actions the backend writes (15-a P1-4) —
  // before 17-a2 these rendered raw English in the timeline.
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

/** Grouped counted plural for the footer's events total — ar-LY grouping
 *  like the OwnerUsersPage/AdminGovernancePages footers (countAr renders
 *  raw digits; a large audit total wants the separators). */
function eventsCountLabel(n: number): string {
  if (n === 0) return 'لا أحداث';
  if (n === 1) return 'حدث واحد';
  if (n === 2) return 'حدثان';
  if (n >= 3 && n <= 10) return `${formatNum(n)} أحداث`;
  return `${formatNum(n)} حدثاً`;
}

/* formatRelativeAr (counted-plural relative time) lives in lib/format.ts
 * (wave 9-a) — identical strings to the former local copy. */

/** Shape-matched skeleton for the activity timeline — the 32px icon
 *  well, the title/meta lines and the trailing time stamp (craft
 *  floor: never a bare spinner where the shape is known). */
function TimelineSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="owner-timeline-skel">
          <Skeleton width={32} height={32} rounded="50%" />
          <div className="owner-timeline-skel-lines">
            <Skeleton width="55%" height={13} />
            <Skeleton width="38%" height={11} />
          </div>
          <Skeleton width={54} height={11} />
        </div>
      ))}
    </div>
  );
}

export function OwnerActivityPage() {
  const [filter, setFilter] = useState<EventType>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const activity = useOwnerActivity({ page, limit: PAGE_SIZE });

  const tabItems: Array<{ value: EventType; label: string }> = [
    { value: 'all', label: 'الكل' },
    { value: 'login', label: 'تسجيل دخول' },
    { value: 'content', label: 'محتوى' },
    { value: 'roles', label: 'أدوار' },
    { value: 'system', label: 'نظام' },
  ];

  const events = activity.data?.data ?? [];

  // Decorate events with classification + readable labels.
  const decorated = events.map((e) => {
    const { category, label: fallback } = classifyAction(e.action);
    return {
      ...e,
      category,
      // 22-b (4-A7 P2-7): an unknown action's raw enum is
      // bidi-isolated — a future Latin enum (e.g. EXPORT_RUN) must
      // never flow un-isolated through the RTL title line. Mirrors
      // the dashboard's actionLabel helper.
      actionLabel: ACTION_LABEL[e.action] ?? (fallback === e.action ? <bdi>{e.action}</bdi> : fallback),
      config: TYPE_CONFIG[category],
    };
  });

  const filtered = filter === 'all'
    ? decorated
    : decorated.filter((e) => e.category === filter || (filter === 'system' && e.category === 'error'));

  // Real KPI counts derived from the loaded page (last 50 events by default).
  const kpi = {
    total: decorated.length,
    logins: decorated.filter((e) => e.category === 'login').length,
    failed: decorated.filter((e) => e.category === 'error').length,
    roles: decorated.filter((e) => e.category === 'roles').length,
  };

  // Honest KPIs (audit 0-e P1-27): '…' while loading, '—' on error —
  // never a confident "0" for data we don't have.
  const kpiValue = (n: number) =>
    activity.isPending ? '…' : activity.isError ? '—' : <bdi>{formatNum(n)}</bdi>;
  const kpiKnown = activity.isSuccess;

  return (
    <PageFrame width="default">
      <PatternsPageHeader
        title="سجل النشاط والمراقبة"
        description="جميع العمليّات المنفَّذة على المنصّة — حيّة من سجلّ التدقيق"
        breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'سجلّ النشاط' }]}
      />

      {/* r252: the page's four facts ride the patterns StatLine —
          same honest '…'/'—' unknowns, same real per-page counts. */}
      <StatLine
        items={[
          {
            label: 'إجمالي الأحداث',
            value: kpiValue(activity.data?.meta.total ?? kpi.total),
            hint: 'المسجَّلة على المنصّة',
          },
          {
            label: 'تسجيلات دخول',
            value: kpiValue(kpi.logins),
            hint: 'ضمن الصفحة الحاليّة',
          },
          {
            label: 'عمليّات فاشلة',
            value: kpiValue(kpi.failed),
            hint: kpiKnown ? (kpi.failed === 0 ? 'لا إخفاقات ضمن الصفحة' : 'تحقّق من التفاصيل أدناه') : 'بانتظار البيانات',
            tone: kpiKnown && kpi.failed > 0 ? 'danger' : 'neutral',
          },
          {
            label: 'تغييرات صلاحيّات',
            value: kpiValue(kpi.roles),
            hint: 'ضمن الصفحة الحاليّة',
          },
        ]}
      />

      {/* r252: the filter Tabs move INTO the FilterBar — one calm rail
          above the timeline (sticky: the filter survives a long scroll
          through 50 events; the app's only scroll container owns it). */}
      <FilterBar sticky filters={<Tabs value={filter} onChange={setFilter} items={tabItems} />} />

      <Card title="سجلّ الأحداث" icon={Clock}>
        {activity.isPending ? (
          <TimelineSkeleton rows={7} />
        ) : activity.isError ? (
          <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState illustration="empty-search"
            title={filter === 'all' ? 'لا توجد أحداث مسجَّلة بعد' : 'لا أحداث في هذا التبويب'}
            description={filter === 'all'
              ? 'تُسجَّل الأحداث تلقائياً فور أول عمليّة على المنصّة.'
              : 'جرِّب تبويباً آخر لمتابعة أنواع مختلفة من الأحداث.'}
            action={filter === 'all' && (
              <button type="button" className="btn ghost sm" onClick={() => activity.refetch()}>
                <Icon icon={RefreshCw} size={12} />
                تحديث السجلّ
              </button>
            )}
          />
        ) : (
          <div className="owner-timeline">
            {filtered.map((event, i) => (
              <div
                key={event.id}
                className="owner-timeline-item"
                style={{ '--owner-row-i': i } as CSSProperties}
              >
                <div className={`owner-event-icon ${event.config.colorClass}`}>
                  <Icon icon={event.config.icon} size={16} />
                </div>
                <div className="owner-timeline-body">
                  <div className="owner-timeline-title">{event.actionLabel}</div>
                  <div className="owner-timeline-meta">
                    {event.user ? `${event.user.firstName} ${event.user.lastName}` : 'النظام'}
                    {event.user && (
                      <> &middot; <bdi className="owner-timeline-email">{event.user.email}</bdi></>
                    )}
                    {event.resourceType && (
                      <> &middot; {RESOURCE_LABELS[event.resourceType] ?? <bdi>{event.resourceType}</bdi>}</>
                    )}
                    {/* r251: the affected row's ID finally renders — the
                     * ONE place the timeline uses Plex Mono, per the 1A
                     * rule (mono = IDs/code/metrics only). Bidi-isolated;
                     * full id in the title tooltip for the audit trail. */}
                    {event.resourceId && (
                      <> &middot; <code className="owner-timeline-id font-mono" dir="ltr" title={event.resourceId}>
                        <bdi>{event.resourceId.length > 14 ? `${event.resourceId.slice(0, 14)}…` : event.resourceId}</bdi>
                      </code></>
                    )}
                  </div>
                  {event.metadata !== null && event.metadata !== undefined && (
                    <button
                      type="button"
                      className="owner-detail-toggle"
                      aria-expanded={expanded === event.id}
                      onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                    >
                      <Icon icon={ChevronDown} size={12} className="owner-detail-chevron" />
                      {expanded === event.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                    </button>
                  )}
                  {expanded === event.id && event.metadata !== null && event.metadata !== undefined && (
                    /* Machine JSON — the LTR mono block owner.css already
                     * ships (var(--font-mono)); braces and quotes stay
                     * legible inside the RTL page. */
                    <div className="owner-meta-preview" dir="ltr">
                      {JSON.stringify(event.metadata, null, 2)}
                    </div>
                  )}
                </div>
                <span className="owner-timeline-time" title={formatDate(event.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}>
                  {formatRelativeAr(event.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        {activity.data && activity.data.meta.totalPages > 1 && (
          <div className="owner-activity-footer">
            <span className="owner-activity-count">
              الصفحة <bdi>{activity.data.meta.page}</bdi> من <bdi>{activity.data.meta.totalPages}</bdi>
              {' '}· {eventsCountLabel(activity.data.meta.total)}
            </span>
            <div className="owner-activity-footer-actions">
              {/* RTL: "previous" points inline-start-ward = the right
                  chevron (wave 5-a convention). */}
              <button
                type="button"
                className="btn ghost sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Icon icon={ChevronRight} size={14} />
                السابق
              </button>
              <button
                type="button"
                className="btn ghost sm"
                disabled={page >= activity.data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
                <Icon icon={ChevronLeft} size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </PageFrame>
  );
}
