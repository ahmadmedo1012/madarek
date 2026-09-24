import { Radio, Bot, MonitorPlay, FileCheck, Activity, RefreshCw } from 'lucide-react';
import { Card, MetricCard } from '../../components/primitives';
import { ErrorState, KpiSkeleton, CardSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useOwnerRealtime, useOwnerAlerts } from '../../hooks/useOwner';

/** Proper Arabic counted nouns: [one, two, few (3–10), many (11+)]. */
function countAr(n: number, forms: [string, string, string, string]): string {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  if (n >= 3 && n <= 10) return `${n} ${forms[2]}`;
  return `${n} ${forms[3]}`;
}

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

function tickValue(n: number) {
  return (
    <bdi key={n} className="owner-value-tick">
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
      ) : realtime.isError || !data ? (
        <ErrorState error={realtime.error} onRetry={() => realtime.refetch()} />
      ) : (
        <>
          <div
            className={`owner-live-status${hasAlerts ? ' has-alerts' : ''}${alerts.isPending ? ' is-pending' : ''}${alerts.isError ? ' is-degraded' : ''}`}
            role={alerts.isError ? 'alert' : undefined}
          >
            <div className="owner-live-pulse" />
            <span className="status-text">
              {alerts.isPending
                ? 'جارٍ جلب حالة التنبيهات…'
                : alerts.isError
                  ? 'تعذّر جلب حالة التنبيهات'
                  : hasAlerts
                    ? `يوجد ${countAr(unresolvedAlerts.length, ACTIVE_ALERT_FORMS)}`
                    : 'النظام يعمل بشكل طبيعيّ'}
            </span>
            <div className="owner-live-tools">
              {alerts.isError && (
                <button type="button" className="btn ghost sm" onClick={() => alerts.refetch()}>
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
              values remount (keyed) so each change re-settles. */}
          <section className="owner-realtime-grid" aria-live="polite" aria-label="مؤشرات المراقبة الحيّة للمنصّة">
            <MetricCard icon={Activity} label={liveLabel('الجلسات النشطة')} value={tickValue(data.activeSessions)} color="brand" />
            <MetricCard icon={Bot} label={liveLabel('طلبات AI / دقيقة')} value={tickValue(data.aiRequestsPerMin)} color="gold" />
            <MetricCard icon={MonitorPlay} label={liveLabel('بثّ مباشر')} value={tickValue(data.liveBroadcasts)} color="purple" />
            <MetricCard icon={FileCheck} label={liveLabel('اختبارات جارية')} value={tickValue(data.activeExams)} color="green" />
          </section>

          <Card title="ملخّص النشاط الحيّ" icon={Radio}>
            <table className="owner-table">
              <thead>
                <tr>
                  <th>المؤشّر</th>
                  <th>القيمة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>الجلسات المتّصلة</td>
                  <td className="num"><bdi>{data.activeSessions.toLocaleString('ar-LY')}</bdi></td>
                  <td>
                    <span className={`owner-health-dot ${data.activeSessions > 0 ? 'green' : 'amber'} inline`} />
                    <span className="visually-hidden">{data.activeSessions > 0 ? 'نشط' : 'لا نشاط'}</span>
                  </td>
                </tr>
                <tr>
                  <td>طلبات الذكاء الاصطناعيّ</td>
                  <td className="num"><bdi>{data.aiRequestsPerMin.toLocaleString('ar-LY')}</bdi>/دقيقة</td>
                  <td>
                    <span className={`owner-health-dot ${data.aiRequestsPerMin > 0 ? 'green' : 'amber'} inline`} />
                    <span className="visually-hidden">{data.aiRequestsPerMin > 0 ? 'نشط' : 'لا نشاط'}</span>
                  </td>
                </tr>
                <tr>
                  <td>غرف البثّ المباشر</td>
                  <td className="num"><bdi>{data.liveBroadcasts.toLocaleString('ar-LY')}</bdi></td>
                  <td>
                    <span className={`owner-health-dot ${data.liveBroadcasts > 0 ? 'green' : 'amber'} inline`} />
                    <span className="visually-hidden">{data.liveBroadcasts > 0 ? 'نشط' : 'لا نشاط'}</span>
                  </td>
                </tr>
                <tr>
                  <td>اختبارات قيد التنفيذ</td>
                  <td className="num"><bdi>{data.activeExams.toLocaleString('ar-LY')}</bdi></td>
                  <td>
                    <span className={`owner-health-dot ${data.activeExams > 0 ? 'green' : 'amber'} inline`} />
                    <span className="visually-hidden">{data.activeExams > 0 ? 'نشط' : 'لا نشاط'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
