import { useState, useEffect } from 'react';
import { Radio, Bot, MonitorPlay, FileCheck, Activity } from 'lucide-react';
import { Card, MetricCard } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/primitives/States';
import { useOwnerRealtime, useOwnerAlerts } from '../../hooks/useOwner';

export function OwnerRealtimePage() {
  const realtime = useOwnerRealtime();
  const alerts = useOwnerAlerts();
  const data = realtime.data;
  const unresolvedAlerts = alerts.data ?? [];
  const hasAlerts = unresolvedAlerts.length > 0;

  const [lastUpdated, setLastUpdated] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المراقبة الحيّة</h1>
          <p className="page-subtitle">مراقبة العمليّات الحيّة للمنصّة في الوقت الفعليّ</p>
        </div>
      </header>

      {realtime.isPending ? (
        <LoadingState />
      ) : realtime.isError || !data ? (
        <ErrorState error={realtime.error} onRetry={() => realtime.refetch()} />
      ) : (
        <>
          <div className={`owner-live-status${hasAlerts ? ' has-alerts' : ''}`}>
            <div className="owner-live-pulse" />
            <span className="status-text">
              {hasAlerts
                ? `يوجد ${unresolvedAlerts.length} تنبيه نشط`
                : 'النظام يعمل بشكل طبيعيّ'}
            </span>
            <span style={{ marginInlineStart: 'auto', fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)' }}>
              آخر تحديث: {lastUpdated.toLocaleTimeString('ar-LY')}
            </span>
          </div>

          <div className="owner-realtime-grid">
            <MetricCard icon={Activity} label="الجلسات النشطة" value={data.activeSessions.toLocaleString('ar-LY')} color="brand" />
            <MetricCard icon={Bot} label="طلبات AI / دقيقة" value={data.aiRequestsPerMin.toLocaleString('ar-LY')} color="gold" />
            <MetricCard icon={MonitorPlay} label="بثّ مباشر" value={data.liveBroadcasts.toLocaleString('ar-LY')} color="purple" />
            <MetricCard icon={FileCheck} label="اختبارات جارية" value={data.activeExams.toLocaleString('ar-LY')} color="green" />
          </div>

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
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{data.activeSessions.toLocaleString('ar-LY')}</td>
                  <td><div className={`owner-health-dot ${data.activeSessions > 0 ? 'green' : 'amber'}`} style={{ display: 'inline-block' }} /></td>
                </tr>
                <tr>
                  <td>طلبات الذكاء الاصطناعيّ</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{data.aiRequestsPerMin}/دقيقة</td>
                  <td><div className={`owner-health-dot ${data.aiRequestsPerMin > 0 ? 'green' : 'amber'}`} style={{ display: 'inline-block' }} /></td>
                </tr>
                <tr>
                  <td>غرف البثّ المباشر</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{data.liveBroadcasts}</td>
                  <td><div className={`owner-health-dot ${data.liveBroadcasts > 0 ? 'green' : 'amber'}`} style={{ display: 'inline-block' }} /></td>
                </tr>
                <tr>
                  <td>اختبارات قيد التنفيذ</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{data.activeExams}</td>
                  <td><div className={`owner-health-dot ${data.activeExams > 0 ? 'green' : 'amber'}`} style={{ display: 'inline-block' }} /></td>
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
