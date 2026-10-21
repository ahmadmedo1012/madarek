import { RefreshCw } from 'lucide-react';
import { StatStrip } from '../../components/primitives/Ledger';
import { ErrorState } from '../../components/primitives/States';
/* R304: the live board opens with the patterns PageHeader —
 * breadcrumbs back to the owner dashboard. */
import { PageHeader as PatternsPageHeader } from '../../components/patterns';
/* r299: the strip's shape-matched skeleton — one owner-owned helper
 * replaces both the mismatched KpiSkeleton (the retired icon-tile
 * anatomy) and the local copy-pasted variants. */
import { StatStripSkeleton } from '../../components/owner/StripSkeletons';
import { Icon } from '../../components/Icon';
import { useOwnerRealtime, useOwnerAlerts } from '../../hooks/useOwner';
import { countAr } from '../../lib/format';
import { formatNum, formatTime } from '../../utils/numbers';

/* countAr lives in lib/format.ts (wave 9-a). */

const ACTIVE_ALERT_FORMS: [string, string, string, string] = [
  'تنبيه نشط واحد', 'تنبيهان نشطان', 'تنبيهات نشطة', 'تنبيهاً نشطاً',
];

/** A live tile: label with a pulsing heartbeat dot + a value that
 *  re-settles (keyed remount) every time fresh data lands. */
function liveLabel(text: string) {
  return (
    <span className="owner-live-label">
      {text}
      <span className="owner-live-tick" aria-hidden />
    </span>
  );
}

function tickValue(n: number, label: string) {
  return (
    <bdi key={n} className="owner-value-tick">
      {/* 6A10-5: the value node carries its own label — the keyed
          remount (re-anchored bdi) is what the polite live region
          announces, and a bare «١٢٤٠» means nothing out of context.
          The sr-only span makes the announcement «التسمية: القيمة»;
          the tile's visible label above is unchanged for sighted
          users (the label is NOT re-announced on tick — only the
          changed value subtree is). */}
      <span className="sr-only">{`${label}: `}</span>
      {formatNum(n)}
    </bdi>
  );
}

export function OwnerRealtimePage() {
  const realtime = useOwnerRealtime();
  const alerts = useOwnerAlerts();
  const data = realtime.data;
  const unresolvedAlerts = alerts.data ?? [];
  // "Healthy" is only claimed after the alerts query answered — the
  // band degrades honestly on error/pending instead of a fake "live".
  const hasAlerts = alerts.isSuccess && unresolvedAlerts.length > 0;
  /* 6A10-9: a failed REFRESH keeps the last reading — TanStack Query
   * retains the last successful data through a refetch error, so the
   * page degrades its status band instead of blanking to a full-page
   * error. The full clear is reserved for the INITIAL load failure
   * (no data ever landed — nothing honest to keep). */
  const refreshFailed = realtime.isError && !!data;
  const anyDegraded = refreshFailed || alerts.isError;

  return (
    <div className="page">
      <PatternsPageHeader
        title="المراقبة الحيّة"
        description="مراقبة العمليّات الحيّة للمنصّة في الوقت الفعليّ"
        breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'المراقبة الحيّة' }]}
      />

      {realtime.isPending ? (
        /* r299: shape-matched — the resolved band is the typographic
         * strip (the summary card that followed it died with it — every
         * one of its four numbers repeated the strip above it twice
         * on the same screen). */
        <StatStripSkeleton />
      ) : !data ? (
        /* 6A10-9: initial load failure (no data ever landed) — the
           ONLY path that full-clears the page. */
        <ErrorState error={realtime.error} onRetry={() => realtime.refetch()} />
      ) : (
        <>
          <div
            className={`owner-live-status${hasAlerts ? ' has-alerts' : ''}${alerts.isPending ? ' is-pending' : ''}${anyDegraded ? ' is-degraded' : ''}`}
            role={anyDegraded ? 'alert' : undefined}
          >
            <div className="owner-live-pulse" />
            <span className="status-text">
              {refreshFailed
                ? 'تعذّر تحديث القراءات — آخر قراءة محفوظة'
                : alerts.isPending
                  ? 'جارٍ جلب حالة التنبيهات…'
                  : alerts.isError
                    ? 'تعذّر جلب حالة التنبيهات'
                    : hasAlerts
                      ? `يوجد ${countAr(unresolvedAlerts.length, ACTIVE_ALERT_FORMS)}`
                      : 'النظام يعمل بشكل طبيعيّ'}
            </span>
            <div className="owner-live-tools">
              {anyDegraded && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    if (refreshFailed) void realtime.refetch();
                    if (alerts.isError) void alerts.refetch();
                  }}
                >
                  <Icon icon={RefreshCw} size={12} />
                  إعادة المحاولة
                </button>
              )}
              {/* Bound to the query's own dataUpdatedAt (audit 0-e
                  P2-41): the stamp ticks only when fresh data actually
                  landed — the old 10s client clock lied about
                  freshness between the 15s polls. */}
              <span className="owner-live-meta">
                آخر تحديث: <bdi>{formatTime(realtime.dataUpdatedAt, { hour: '2-digit', minute: '2-digit' })}</bdi>
              </span>
            </div>
          </div>

          {/* Live region: value changes are announced politely; the
              values remount (keyed) so each change re-settles.
              r149 (R3-A1 #9): grid-4 الكنونية — كانت شبكة خاصة بفجوة
              وكسر مختلفين عن كل شرائط KPI في المنصة.
              r299: the «حيّ» trend notes died — the pulsing tick dot
              beside every label already says «live»; four identical
              words under four numbers were pure noise. */}
          <section role="status" aria-live="polite"><StatStrip ariaLabel="مؤشرات المراقبة الحيّة للمنصّة" cells={[
            { label: liveLabel('الجلسات النشطة'), value: tickValue(data.activeSessions, 'الجلسات النشطة') },
            { label: liveLabel('طلبات AI / دقيقة'), value: tickValue(data.aiRequestsPerMin, 'طلبات AI / دقيقة') },
            { label: liveLabel('بثّ مباشر'), value: tickValue(data.liveBroadcasts, 'بثّ مباشر') },
            { label: liveLabel('اختبارات جارية'), value: tickValue(data.activeExams, 'اختبارات جارية') },
          ]} /></section>
        </>
      )}
    </div>
  );
}
