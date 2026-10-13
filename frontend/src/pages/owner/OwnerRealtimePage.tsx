import { Radio, Bot, MonitorPlay, FileCheck, Activity, RefreshCw } from 'lucide-react';
import { Card, MetricCard } from '../../components/primitives';
import { ErrorState, KpiSkeleton, CardSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useOwnerRealtime, useOwnerAlerts } from '../../hooks/useOwner';
import { countAr } from '../../lib/format';

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
      {n.toLocaleString('ar-LY')}
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
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المراقبة الحيّة</h1>
          <p className="page-subtitle">مراقبة العمليّات الحيّة للمنصّة في الوقت الفعليّ</p>
        </div>
      </header>

      {realtime.isPending ? (
        <>
          {/* Shape-matched: the 4 KPI tiles + the summary card. */}
          <KpiSkeleton />
          <CardSkeleton lines={5} />
        </>
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
                آخر تحديث: <bdi>{new Date(realtime.dataUpdatedAt).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}</bdi>
              </span>
            </div>
          </div>

          {/* Live region: value changes are announced politely; the
              values remount (keyed) so each change re-settles.
              r149 (R3-A1 #9): grid-4 الكنونية — كانت شبكة خاصة بفجوة
              وكسر مختلفين عن كل شرائط KPI في المنصة. */}
          <section className="grid-4" aria-live="polite" aria-label="مؤشرات المراقبة الحيّة للمنصّة">
            <MetricCard icon={Activity} label={liveLabel('الجلسات النشطة')} value={tickValue(data.activeSessions, 'الجلسات النشطة')} color="brand" />
            <MetricCard icon={Bot} label={liveLabel('طلبات AI / دقيقة')} value={tickValue(data.aiRequestsPerMin, 'طلبات AI / دقيقة')} color="gold" />
            <MetricCard icon={MonitorPlay} label={liveLabel('بثّ مباشر')} value={tickValue(data.liveBroadcasts, 'بثّ مباشر')} color="purple" />
            <MetricCard icon={FileCheck} label={liveLabel('اختبارات جارية')} value={tickValue(data.activeExams, 'اختبارات جارية')} color="green" />
          </section>

          <Card title="ملخّص النشاط الحيّ" icon={Radio}>
            {/* r151b (R5-A4): the 23 sibling tables all ship a .table-wrap
                scroller + per-td data-labels — this one missed both in the
                r150d retirement (stacked bare values, no labels, no border). */}
            <div className="table-wrap">
            <table className="table tbl-stack owner-realtime-table">
              <thead>
                <tr>
                  <th scope="col">المؤشّر</th>
                  <th scope="col">القيمة</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {/* 22-b (4-A7 P2-1): zero activity is a QUIET campus, not
                     a warning — the summary rows used to paint all four
                     dots amber while the band above said «النظام يعمل
                     بشكل طبيعيّ». Quiet = neutral (the unknown/pending
                     tone); amber stays reserved for real thresholds. */}
                <tr>
                  <td data-label="المؤشّر">الجلسات المتّصلة</td>
                  <td className="num" data-label="القيمة"><bdi>{data.activeSessions.toLocaleString('ar-LY')}</bdi></td>
                  <td data-label="الحالة">
                    <span className={`owner-health-dot ${data.activeSessions > 0 ? 'green' : 'neutral'} inline`} />
                    <span className="visually-hidden">{data.activeSessions > 0 ? 'نشط' : 'هادئ'}</span>
                  </td>
                </tr>
                <tr>
                  <td data-label="المؤشّر">طلبات الذكاء الاصطناعيّ</td>
                  <td className="num" data-label="القيمة"><bdi>{data.aiRequestsPerMin.toLocaleString('ar-LY')}</bdi>/دقيقة</td>
                  <td data-label="الحالة">
                    <span className={`owner-health-dot ${data.aiRequestsPerMin > 0 ? 'green' : 'neutral'} inline`} />
                    <span className="visually-hidden">{data.aiRequestsPerMin > 0 ? 'نشط' : 'هادئ'}</span>
                  </td>
                </tr>
                <tr>
                  <td data-label="المؤشّر">غرف البثّ المباشر</td>
                  <td className="num" data-label="القيمة"><bdi>{data.liveBroadcasts.toLocaleString('ar-LY')}</bdi></td>
                  <td data-label="الحالة">
                    <span className={`owner-health-dot ${data.liveBroadcasts > 0 ? 'green' : 'neutral'} inline`} />
                    <span className="visually-hidden">{data.liveBroadcasts > 0 ? 'نشط' : 'هادئ'}</span>
                  </td>
                </tr>
                <tr>
                  <td data-label="المؤشّر">اختبارات قيد التنفيذ</td>
                  <td className="num" data-label="القيمة"><bdi>{data.activeExams.toLocaleString('ar-LY')}</bdi></td>
                  <td data-label="الحالة">
                    <span className={`owner-health-dot ${data.activeExams > 0 ? 'green' : 'neutral'} inline`} />
                    <span className="visually-hidden">{data.activeExams > 0 ? 'نشط' : 'هادئ'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
