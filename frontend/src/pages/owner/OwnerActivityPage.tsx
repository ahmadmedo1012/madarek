import { useState } from 'react';
import {
  LogIn, FileText, UserCog, Server, AlertTriangle, Activity, Shield, Clock, XCircle,
} from 'lucide-react';
import { Card, MetricCard, Tabs } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useOwnerActivity } from '../../hooks/useOwner';
import type { LucideIcon } from 'lucide-react';

type EventType = 'all' | 'login' | 'content' | 'roles' | 'system';

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
  if (action.startsWith('material.') || action.startsWith('course.') || action.startsWith('paper.') || action.startsWith('announcement.') || action.startsWith('competition.')) {
    return { category: 'content', label: 'تعديل محتوى' };
  }
  if (action.startsWith('sync.') || action.startsWith('system.')) return { category: 'system', label: 'تشغيل نظام' };
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
  'material.uploaded': 'رفع مادة',
  'material.deleted': 'حذف مادة',
  'paper.published': 'نشر بحث',
  'announcement.created': 'بثّ إعلان',
  'competition.created': 'إنشاء مسابقة',
  'sync.run': 'تشغيل المزامنة',
};

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

export function OwnerActivityPage() {
  const [filter, setFilter] = useState<EventType>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const activity = useOwnerActivity({ page, limit: 50 });

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
      actionLabel: ACTION_LABEL[e.action] ?? fallback,
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

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">سجل النشاط والمراقبة</h1>
          <p className="page-subtitle">جميع العمليّات المنفَّذة على المنصّة — حيّة من سجلّ التدقيق</p>
        </div>
      </div>

      {/* Real KPIs (per-page; full counts would need a dedicated endpoint) */}
      <div className="grid-4">
        <MetricCard
          icon={Activity}
          label={`أحدث ${kpi.total.toLocaleString('ar-LY')} حدثاً`}
          value={(activity.data?.meta.total ?? kpi.total).toLocaleString('ar-LY')}
          change="إجمالي الأحداث المسجَّلة"
          color="brand"
        />
        <MetricCard
          icon={LogIn}
          label="تسجيلات دخول"
          value={kpi.logins.toLocaleString('ar-LY')}
          change="ضمن الصفحة الحاليّة"
          color="green"
        />
        <MetricCard
          icon={XCircle}
          label="عمليّات فاشلة"
          value={kpi.failed.toLocaleString('ar-LY')}
          change="ضمن الصفحة الحاليّة"
          color={kpi.failed === 0 ? 'green' : 'red'}
        />
        <MetricCard
          icon={Shield}
          label="تغييرات صلاحيّات"
          value={kpi.roles.toLocaleString('ar-LY')}
          change="ضمن الصفحة الحاليّة"
          color="purple"
        />
      </div>

      <Card>
        <Tabs value={filter} onChange={setFilter} items={tabItems} />
      </Card>

      <Card title="سجلّ الأحداث" icon={Clock}>
        {activity.isPending ? (
          <LoadingState />
        ) : activity.isError ? (
          <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="لا توجد أحداث" description={filter === 'all' ? undefined : 'جرِّب تبويبًا آخر.'} />
        ) : (
          <div className="owner-timeline">
            {filtered.map((event) => (
              <div key={event.id} className="owner-timeline-item">
                <div className={`owner-event-icon ${event.config.colorClass}`}>
                  <Icon icon={event.config.icon} size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
                    {event.actionLabel}
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                    {event.user ? `${event.user.firstName} ${event.user.lastName}` : 'النظام'}
                    {event.user && <> &middot; <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xxs)' }}>{event.user.email}</span></>}
                    {event.resourceType && <> &middot; {event.resourceType}</>}
                  </div>
                  {event.metadata !== null && event.metadata !== undefined && (
                    <button
                      type="button"
                      style={{ fontSize: 'var(--fs-xxs)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}
                      onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                    >
                      {expanded === event.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                    </button>
                  )}
                  {expanded === event.id && event.metadata !== null && event.metadata !== undefined && (
                    <div className="owner-meta-preview">
                      {JSON.stringify(event.metadata, null, 2)}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {formatRelative(event.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        {activity.data && activity.data.meta.totalPages > 1 && (
          <div className="admin-pagination" style={{ marginBlockStart: 'var(--sp-3)', paddingBlockStart: 'var(--sp-3)' }}>
            <span className="text-xs text-muted">
              الصفحة {activity.data.meta.page} من {activity.data.meta.totalPages} ·
              {' '}{activity.data.meta.total.toLocaleString('ar-LY')} حدث
            </span>
            <div className="admin-pagination-actions">
              <button
                type="button"
                className="btn ghost sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >السابق</button>
              <button
                type="button"
                className="btn ghost sm"
                disabled={page >= activity.data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >التالي</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
