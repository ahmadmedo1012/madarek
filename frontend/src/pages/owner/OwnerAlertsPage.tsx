import { AlertTriangle, ShieldAlert, Bell, CheckCircle2, Activity, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { apiErrorMessage } from '../../hooks/useResources';
import { useOwnerAlerts, useResolveAlert } from '../../hooks/useOwner';
import { toast } from '../../lib/toast';

// severity 'error' added 17-a2 (15-a P1-6): the errorHandler raises it
// on every unhandled 5xx — without the entry those cards rendered raw
// English with the default brand color.
const SEVERITY_LABELS: Record<string, string> = {
  critical: 'حرج',
  error: 'خطأ',
  warning: 'تحذير',
  info: 'معلومة',
};

const SEVERITY_COLORS: Record<string, 'red' | 'amber' | 'brand'> = {
  critical: 'red',
  error: 'red',
  warning: 'amber',
  info: 'brand',
};

const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: 'البنية التحتية',
  security: 'الأمان',
  performance: 'الأداء',
  system: 'النظام',
  storage: 'التخزين',
  database: 'قاعدة البيانات',
  api: 'واجهة البرمجة',
};

/* Deliberately local (13-14/14-2 audit): NOT lib/format.formatDateTimeAr
 * — this shape renders the default-locale ar-LY date plus a separately
 * formatted 2-digit hour:minute, while the lib helper uses one combined
 * Intl call (medium date + short time). Swapping would change rendered
 * copy; fold only if a lib export with this exact shape is ever added. */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-LY') + ' ' + d.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
}

/** Shape-matched skeleton for the alert-card list — a badge row, a
 *  title line and a message line per card (craft floor: never a bare
 *  spinner where the shape is known). */
function AlertListSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="owner-alert-skel">
          <div className="owner-alert-skel-head">
            <Skeleton width={54} height={20} rounded="var(--r-full)" />
            <Skeleton width={90} height={13} />
            <Skeleton width="45%" height={13} />
            <span style={{ flex: 1 }} />
            <Skeleton width={110} height={11} />
          </div>
          <Skeleton width="94%" height={12} />
          <div style={{ marginBlockStart: 'var(--sp-2)' }}>
            <Skeleton width="62%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OwnerAlertsPage() {
  const alertsQuery = useOwnerAlerts();
  const resolveAlert = useResolveAlert();
  const alerts = alertsQuery.data ?? [];

  // Toast confirms the resolve actually landed (the card disappears
  // silently otherwise — no inline success surface on this page).
  const resolve = (id: string) =>
    resolveAlert.mutate(id, {
      onSuccess: () => toast.success('أُغلق التنبيه وسُجّلت العمليّة في سجلّ النشاط.', { title: 'تمّ حلّ التنبيه' }),
    });

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  // Honest KPIs (audit 0-e P2-46): '…' while loading, '—' when the
  // query failed — an API-down feed never renders a confident "0".
  const kpiValue = (n: number) =>
    alertsQuery.isPending ? '…' : alertsQuery.isError ? '—' : <bdi>{n.toLocaleString('ar-LY')}</bdi>;
  const kpiKnown = alertsQuery.isSuccess;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">التنبيهات التشغيليّة</h1>
          <p className="page-subtitle">إدارة ومراقبة التنبيهات والحوادث التشغيليّة — مباشرة من سجلّ المنصّة.</p>
        </div>
      </header>

      <div className="grid-3">
        <MetricCard
          icon={Bell}
          label="تنبيهات مفتوحة"
          value={kpiValue(alerts.length)}
          color={kpiKnown ? (alerts.length === 0 ? 'green' : 'brand') : 'brand'}
        />
        <MetricCard
          icon={ShieldAlert}
          label="تنبيهات حرجة"
          value={kpiValue(criticalCount)}
          color={kpiKnown ? (criticalCount === 0 ? 'green' : 'red') : 'brand'}
        />
        <MetricCard
          icon={AlertTriangle}
          label="تحذيرات"
          value={kpiValue(warningCount)}
          color={kpiKnown ? (warningCount === 0 ? 'green' : 'amber') : 'brand'}
        />
      </div>

      <Card title="التنبيهات النشطة">
        {alertsQuery.isPending ? (
          <AlertListSkeleton />
        ) : alertsQuery.isError ? (
          <ErrorState error={alertsQuery.error} onRetry={() => alertsQuery.refetch()} />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="لا توجد تنبيهات مفتوحة"
            description="كل أنظمة المنصّة تعمل بشكل طبيعيّ — تابع آخر العمليّات من سجلّ النشاط."
            action={(
              <Link to="/owner/activity" className="btn ghost sm">
                <Icon icon={Activity} size={12} />
                استعراض سجلّ النشاط
              </Link>
            )}
          />
        ) : (
          <div>
            {alerts.map((alert, i) => {
              // Per-card mutation state (audit 0-e P2-36): only the
              // clicked card's button is busy — resolving one alert no
              // longer disables every other card's action.
              const resolving = resolveAlert.isPending && resolveAlert.variables === alert.id;
              const failed = resolveAlert.isError && resolveAlert.variables === alert.id;
              return (
                <div
                  key={alert.id}
                  className={`owner-alert-card ${alert.severity}`}
                  style={{ '--owner-alert-i': i } as CSSProperties}
                >
                  <div className="owner-alert-card-header">
                    <Badge color={SEVERITY_COLORS[alert.severity] ?? 'brand'}>
                      {SEVERITY_LABELS[alert.severity] ?? <bdi>{alert.severity}</bdi>}
                    </Badge>
                    {/* A static category label — Badge (a span), not a
                        Pill (a button the user can't actually press). */}
                    <Badge>{CATEGORY_LABELS[alert.category] ?? <bdi>{alert.category}</bdi>}</Badge>
                    <span className="title">{alert.title}</span>
                    <span className="time">{formatTime(alert.createdAt)}</span>
                  </div>
                  <div className="message">{alert.message}</div>
                  <div className="actions">
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => resolve(alert.id)}
                      disabled={resolving}
                    >
                      <Icon icon={CheckCircle2} size={13} />
                      {resolving ? 'جارٍ الحلّ…' : 'حلّ التنبيه'}
                    </button>
                  </div>
                  {failed && (
                    <div className="inline-retry" role="alert">
                      <span className="owner-alert-error">
                        {apiErrorMessage(resolveAlert.error, 'تعذّر حلّ التنبيه.')}
                      </span>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => resolve(alert.id)}
                        disabled={resolveAlert.isPending}
                      >
                        <Icon icon={RefreshCw} size={12} />
                        إعادة المحاولة
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
