import { DASH_OWNER, ALL, ACTIVITY_LOG, PREV, NEXT, BROADCAST_NOTICE, LABEL_SYSTEM, PENDING_DATA, USERS, CHANGE_PERMS, CREATE_ACCOUNT, CREATE_COURSE, UPDATE_COURSE, UPLOAD_FILE, DELETE_FILE, PUBLISH_RESEARCH, CREATE_COMPETITION, SKIP_PERM, EDIT_SCOPE, SET_LOCATION, UNENROL, RESOLVE_ALERT, UPDATE_SETTING, TOGGLE_FEATURE, CHANGE_THEME, COMPLETE_PROFILE, ACHIEVE_BADGE, NO_EVENTS, VIEW } from '../../lib/copy';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
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
/* r299: the windowed pageList helper — same barrel chunk (OwnerPages),
 * so the import is chunk-neutral; the footer joins the .table-pagination
 * grammar every paginated owner surface already rides (users), killing
 * the prev/next-only .owner-activity-footer (linear clicking through
 * a 50-row audit log). */
import { pageList } from './OwnerUsersPage';

type EventType = 'all' | 'login' | 'content' | 'roles' | 'system';

const PAGE_SIZE = 50;

/* Copy diet (single source): the category labels + action labels render
 * from several maps + the filter tabs — one literal each, referenced
 * everywhere; the multi-word action labels keep only their nouns. */
const L_LOGIN = 'تسجيل دخول';
const L_LOGOUT = 'تسجيل خروج';
const L_ROLES = 'أدوار';
const L_SYSTEM = 'نظام';
const L_ERROR = 'خطأ';
const L_ROLE_EDIT = 'تعديل صلاحيات';
const L_ROLE_CHANGE = CHANGE_PERMS;
const L_ACCOUNT_STATUS = 'تعديل حالة الحساب';
const L_ENROLL = 'تسجيل مقرّر';
const L_USER_CREATED = CREATE_ACCOUNT;

const TYPE_CONFIG: Record<'login' | 'content' | 'roles' | 'system' | 'error', { icon: LucideIcon; colorClass: string; label: string }> = {
  login:   { icon: LogIn, colorClass: 'green', label: L_LOGIN },
  content: { icon: FileText, colorClass: 'blue', label: 'محتوى' },
  roles:   { icon: UserCog, colorClass: 'purple', label: L_ROLES },
  system:  { icon: Server, colorClass: 'amber', label: L_SYSTEM },
  error:   { icon: AlertTriangle, colorClass: 'red', label: L_ERROR },
};

/**
 * Map an audit-log action to a category + Arabic action label.
 * Falls back to 'system' for anything unrecognized so we never lose events.
 */
function classifyAction(action: string): { category: keyof typeof TYPE_CONFIG; label: string } {
  if (action.startsWith('user.login') || action.startsWith('auth.login')) return { category: 'login', label: L_LOGIN };
  if (action.includes('login.failed')) return { category: 'error', label: 'دخول فاشل' };
  if (action.startsWith('user.logout')) return { category: 'login', label: L_LOGOUT };
  if (action.startsWith('user.role') || action.startsWith('user.status') || action.startsWith('roles.')) return { category: 'roles', label: L_ROLE_EDIT };
  if (action.startsWith('user.created')) return { category: 'roles', label: L_USER_CREATED };
  // Real backend audit actions (owner/permissions/teacher routes) —
  // uppercase enums, mapped so they never render raw in the feed.
  if (
    action.startsWith('ROLE_') || action.startsWith('STATUS_') ||
    action.startsWith('CAPABILITY_') || action.startsWith('USER_SCOPE') ||
    action.startsWith('TEACHER_')
  ) return { category: 'roles', label: L_ROLE_EDIT };
  // Enrollment audit actions the backend actually writes (15-a P1-4:
  // without the branch these fell through to the raw-English fallback).
  if (action.startsWith('ENROLLMENT_')) return { category: 'content', label: L_ENROLL };
  if (action.startsWith('material.') || action.startsWith('course.') || action.startsWith('paper.') || action.startsWith('announcement.') || action.startsWith('competition.')) {
    return { category: 'content', label: 'تعديل محتوى' };
  }
  if (action.startsWith('sync.') || action.startsWith('system.') || action.startsWith('ALERT_') ||
    action.startsWith('SETTING_') || action.startsWith('FEATURE_FLAG') ||
    action.startsWith('theme.') || action.startsWith('onboarding.') || action.startsWith('milestone.')) {
    return { category: 'system', label: 'تشغيل نظام' };
  }
  if (action.includes('error') || action.includes('failed')) return { category: 'error', label: L_ERROR };
  return { category: 'system', label: action };
}

const ACTION_LABEL: Record<string, string> = {
  'user.login': 'دخول ناجح',
  'auth.login': 'دخول ناجح',
  'user.logout': L_LOGOUT,
  'user.created': L_USER_CREATED,
  'user.role_changed': L_ROLE_CHANGE,
  'user.status_changed': L_ACCOUNT_STATUS,
  'course.created': CREATE_COURSE,
  'course.updated': UPDATE_COURSE,
  'enrollment.created': L_ENROLL,
  'material.uploaded': UPLOAD_FILE,
  'material.deleted': DELETE_FILE,
  'paper.published': PUBLISH_RESEARCH,
  'announcement.created': BROADCAST_NOTICE,
  'competition.created': CREATE_COMPETITION,
  ROLE_CHANGE: L_ROLE_CHANGE,
  STATUS_CHANGE: L_ACCOUNT_STATUS,
  CAPABILITY_OVERRIDE: SKIP_PERM,
  USER_SCOPE_CHANGE: EDIT_SCOPE,
  TEACHER_POSITION: SET_LOCATION,
  TEACHER_VERIFY: 'توثيق أستاذ',
  // The two enrollment audit actions the backend writes (15-a P1-4) —
  // before 17-a2 these rendered raw English in the timeline.
  ENROLLMENT_CREATED: 'تسجيل طالب',
  ENROLLMENT_REMOVED: UNENROL,
  ALERT_RESOLVED: RESOLVE_ALERT,
  SETTING_UPDATED: UPDATE_SETTING,
  FEATURE_FLAG_TOGGLED: TOGGLE_FEATURE,
  'theme.update': CHANGE_THEME,
  'onboarding.complete': COMPLETE_PROFILE,
  'milestone.fire': ACHIEVE_BADGE,
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
  if (n === 0) return NO_EVENTS;
  if (n === 1) return 'حدث';
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
    { value: 'all', label: ALL },
    { value: 'login', label: TYPE_CONFIG.login.label },
    { value: 'content', label: TYPE_CONFIG.content.label },
    { value: 'roles', label: TYPE_CONFIG.roles.label },
    { value: 'system', label: TYPE_CONFIG.system.label },
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
    /* r305-A8 «Heron»: the scoped sheet keys every rule off the .r305ao
       page-root marker (PageFrame owns rhythm/width and takes no
       className, so the grammar rides a root wrapper). */
    <div className="r305ao">
      <PageFrame width="default">
        <PatternsPageHeader
          title={ACTIVITY_LOG}
          breadcrumbs={[{ label: DASH_OWNER, to: '/owner/dashboard' }, { label: ACTIVITY_LOG }]}
          /* R341 D11: the [05] nav-order gutter numeral (OWNER_NAV
           * register — the D10 quality precedent). */
          index="05"
          /* D11 (D8/D10 header-CTA precedent): the log's sibling
           * surfaces — the governance metrics that aggregate this feed
           * (primary) + the accounts directory the events name (ghost).
           * Navigation-only; the log itself is read-only. */
          actions={(
            <>
              <Link to="/owner/governance" className="btn accent sm">الحوكمة</Link>
              <Link to="/owner/users" className="btn ghost sm">{USERS}</Link>
            </>
          )}
        />

        {/* r252: the page's four facts ride the patterns StatLine —
            same honest '…'/'—' unknowns, same real per-page counts. */}
        <StatLine
          items={[
            {
              label: 'الأحداث',
              value: kpiValue(activity.data?.meta.total ?? kpi.total),
            },
            {
              label: 'دخول',
              value: kpiValue(kpi.logins),
            },
            {
              label: 'عمليّات فاشلة',
              value: kpiValue(kpi.failed),
              hint: kpiKnown ? (kpi.failed === 0 ? 'لا إخفاقات' : 'التفاصيل أدناه') : PENDING_DATA,
              tone: kpiKnown && kpi.failed > 0 ? 'danger' : 'neutral',
            },
            {
              label: 'تغييرات صلاحيّات',
              value: kpiValue(kpi.roles),
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
            <EmptyState illustration="empty-list"
              title={filter === 'all' ? 'لا أحداث بعد' : 'لا أحداث هنا'}
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
                      {event.user ? `${event.user.firstName} ${event.user.lastName}` : LABEL_SYSTEM}
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
                        {expanded === event.id ? 'إخفاء' : VIEW}
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

          {/* r299: the canonical .table-pagination footer — windowed page
              numbers + aria-current + RTL-correct chevrons, the same
              grammar as the users directory (the hand-rolled prev/next-only
              footer died with its .owner-activity-* classes). */}
          {activity.data && activity.data.meta.totalPages > 1 && (
            <div className="table-pagination">
              <span>
                الصفحة {page} من {activity.data.meta.totalPages} · {eventsCountLabel(activity.data.meta.total)}
              </span>
              <div className="table-pagination-actions">
                {/* RTL: "previous" points inline-start-ward = the right
                    chevron (wave 5-a convention). */}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="الصفحة السابقة"
                >
                  <Icon icon={ChevronRight} size={14} aria-hidden />
                  {PREV}
                </button>
                {pageList(page, activity.data.meta.totalPages).map((item, i) =>
                  item === 'gap' ? (
                    <span key={`gap-${i}`} className="owner-page-gap" aria-hidden>…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      aria-current={item === page ? 'page' : undefined}
                      aria-label={`الصفحة ${item}`}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= activity.data.meta.totalPages}
                  aria-label="الصفحة التالية"
                >
                  {NEXT}
                  <Icon icon={ChevronLeft} size={14} aria-hidden />
                </button>
              </div>
            </div>
          )}
        </Card>
      </PageFrame>
    </div>
  );
}
