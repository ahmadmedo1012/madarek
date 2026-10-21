import { CheckCircle2, Activity, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Badge } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
/* R304: the alerts board opens with the patterns PageHeader —
 * breadcrumbs back to the owner dashboard. */
import { PageHeader as PatternsPageHeader } from '../../components/patterns';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../hooks/useResources';
import { useResolveAlert, type OperationalAlert } from '../../hooks/useOwner';
import { SEVERITY_LABELS, SEVERITY_COLORS, CATEGORY_LABELS, isCriticalAlert } from '../../lib/ownerLabels';
import { toast } from '../../lib/toast';
import { formatDate, formatNum, formatTime } from '../../utils/numbers';

/* severity 'error' added 17-a2 (15-a P1-6) and the maps hoisted to
 * lib/ownerLabels.ts by 22-b (4-A7 P1-1) so the System page renders
 * the same vocabulary — one console, one set of words. */

/* Deliberately local (13-14/14-2 audit): NOT lib/format.formatDateTimeAr
 * — this shape renders the default-locale ar-LY date plus a separately
 * formatted 2-digit hour:minute, while the lib helper uses one combined
 * Intl call (medium date + short time). Swapping would change rendered
 * copy; fold only if a lib export with this exact shape is ever added. */
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return formatDate(d) + ' ' + formatTime(d, { hour: '2-digit', minute: '2-digit' });
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

/* r165g: the full response body of GET /owner/alerts. The route ships
 * the capped list (take:50, pagination unchanged) PLUS a meta block
 * with the REAL open totals — the KPI strip must never read the
 * truncated array length (60 open alerts used to render as «50»).
 * `meta` stays optional on purpose: payloads from before r165g carry
 * no such block, and the page degrades to the visible rows (the
 * previous behavior) instead of guessing. */
interface OwnerAlertsFeed {
  data: OperationalAlert[];
  meta?: {
    total: number;
    /** The critical pair (critical + error) — same rule the backend
     * counts and lib/ownerLabels.isCriticalAlert applies. */
    critical: number;
    warning: number;
  };
}

export function OwnerAlertsPage() {
  /* Same endpoint as the sibling useOwnerAlerts hook, but keyed one
   * level deeper so the cached ARRAY shape (dashboard / realtime
   * boards) can never leak into this envelope consumer. The nested
   * key keeps the resolve mutation's invalidateQueries({ queryKey:
   * ['owner','alerts'] }) working for this page too — partial prefix
   * matching refreshes the counts after a resolve. */
  const alertsQuery = useQuery({
    queryKey: ['owner', 'alerts', 'feed'],
    queryFn: async () => {
      const res = await api.get<OwnerAlertsFeed>('/owner/alerts');
      return res.data;
    },
    staleTime: 30_000,
  });
  const resolveAlert = useResolveAlert();
  const feed = alertsQuery.data;
  const alerts = feed?.data ?? [];
  const meta = feed?.meta;

  /* r251: resolving an operational alert is a consequential action —
   * it closes the alert and writes an audit row — so the button ASKS
   * first. The dialog names what happens; the mutation only fires
   * from the dialog's confirm (the toast stays the success channel). */
  const [resolveTarget, setResolveTarget] = useState<OperationalAlert | null>(null);

  // Toast confirms the resolve actually landed (the card disappears
  // silently otherwise — no inline success surface on this page).
  const resolve = (id: string) => {
    resolveAlert.mutate(id, {
      onSuccess: () => toast.success('أُغلق التنبيه وسُجّلت العمليّة في سجلّ النشاط.', { title: 'تمّ حلّ التنبيه' }),
    });
  };
  /** Dialog confirm — awaits the mutation so the dialog's in-flight
   *  lock holds until the server answers, then closes. */
  const confirmResolve = async (alert: OperationalAlert) => {
    try {
      await resolveAlert.mutateAsync(alert.id);
    } finally {
      setResolveTarget(null);
    }
  };

  /* 6A10-2: the critical KPI counts the critical PAIR (critical OR
   * error) via the shared lib/ownerLabels filter — the same pair
   * owner.routes.ts counts for the system page's criticalCount, so
   * the alerts board and the server can never disagree about what is
   * urgent (an 'error'-severity alert turns this KPI red too).
   *
   * r165g: with meta present (r165g backend) all three KPIs read the
   * REAL open totals from the server; without it (older payload)
   * they fall back to the visible rows — a lower bound, never a
   * fabricated number. */
  const criticalCount = meta?.critical ?? alerts.filter(isCriticalAlert).length;
  const warningCount = meta?.warning ?? alerts.filter((a) => a.severity === 'warning').length;
  const openTotal = meta?.total ?? alerts.length;

  // Honest KPIs (audit 0-e P2-46): '…' while loading, '—' when the
  // query failed — an API-down feed never renders a confident "0".
  const kpiValue = (n: number) =>
    alertsQuery.isPending ? '…' : alertsQuery.isError ? '—' : <bdi>{formatNum(n)}</bdi>;
  const kpiKnown = alertsQuery.isSuccess;

  return (
    /* r305-A8 «Heron»: page-root marker — severity cards, tones and
       states all key off the scoped sheet's .r305ao selector. */
    <div className="page r305ao">
      <PatternsPageHeader
        title="التنبيهات التشغيليّة"
        description="إدارة ومراقبة التنبيهات والحوادث التشغيليّة — مباشرة من سجلّ المنصّة."
        breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'التنبيهات التشغيليّة' }]}
      />

      {/* R190 (D4): the typographic stat strip — was the grid-3 icon
          tiles. The severity state the old `color` prop painted on the
          tile box now rides the trend note's tone (up = green ink /
          down = red ink) — the same semantics, the strip's language. */}
      <StatStrip
        ariaLabel="مؤشرات التنبيهات التشغيليّة"
        cells={[
          {
            label: 'تنبيهات مفتوحة',
            value: kpiValue(openTotal),
            trend: kpiKnown ? (openTotal === 0 ? 'لا شيء مفتوحًا' : 'تستوجب مراجعة') : 'بانتظار البيانات',
            trendTone: kpiKnown ? (openTotal > 0 ? 'down' : 'up') : 'flat',
          },
          {
            label: 'تنبيهات حرجة',
            value: kpiValue(criticalCount),
            trend: kpiKnown ? (criticalCount === 0 ? 'لا شيء حرجًا' : 'تستوجب قرارًا الآن') : 'بانتظار البيانات',
            trendTone: kpiKnown ? (criticalCount > 0 ? 'down' : 'up') : 'flat',
          },
          {
            label: 'تحذيرات',
            value: kpiValue(warningCount),
            trend: kpiKnown ? (warningCount === 0 ? 'لا تحذيرات' : 'تحتاج متابعة') : 'بانتظار البيانات',
            trendTone: kpiKnown ? (warningCount > 0 ? 'down' : 'up') : 'flat',
          },
        ]}
      />

      {/* r299: «التنبيهات المفتوحة» — the KPI above says «مفتوحة», the
          dashboard band says «مفتوحة»; one console, one word for one
          concept («نشطة» described a different state on other pages). */}
      <Card title="التنبيهات المفتوحة">
        {alertsQuery.isPending ? (
          <AlertListSkeleton />
        ) : alertsQuery.isError ? (
          <ErrorState error={alertsQuery.error} onRetry={() => alertsQuery.refetch()} />
        ) : alerts.length === 0 ? (
          <EmptyState illustration="empty-list"
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
                    <span className="time">{formatTimestamp(alert.createdAt)}</span>
                  </div>
                  <div className="message">{alert.message}</div>
                  <div className="actions">
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => setResolveTarget(alert)}
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

      {/* r251: the resolve confirmation — names the alert, and the
       * consequence: the alert CLOSES and the resolution lands in the
       * audit log; if the underlying condition persists the platform
       * may raise a new alert. Cancel leaves everything untouched. */}
      <ConfirmDialog
        open={resolveTarget !== null}
        title="حلّ التنبيه التشغيلي"
        confirmLabel="حلّ التنبيه"
        danger
        message={resolveTarget
          ? `سيُغلَق التنبيه «${resolveTarget.title}» نهائيًّا، ويُسجَّل الحل باسمك في سجلّ النشاط. إذا استمر السبب الذي أنشأه فقد يُرفع تنبيه جديد. لا يمكن التراجع عن الإغلاق من هذه الصفحة.`
          : ''}
        onConfirm={() => (resolveTarget ? confirmResolve(resolveTarget) : Promise.resolve())}
        onCancel={() => setResolveTarget(null)}
      />
    </div>
  );
}
