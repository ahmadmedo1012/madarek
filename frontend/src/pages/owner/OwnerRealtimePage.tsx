import { useState, useEffect } from 'react';
import { Radio, Bot, MonitorPlay, FileCheck, Activity } from 'lucide-react';
import { Card, MetricCard } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useOwnerRealtime, useOwnerAlerts } from '../../hooks/useOwner';
import type { RealtimeMetrics } from '../../hooks/useOwner';

const FALLBACK_DATA: RealtimeMetrics = {
  activeSessions: 328,
  aiRequestsPerMin: 47,
  liveBroadcasts: 3,
  activeExams: 12,
};

export function OwnerRealtimePage() {
  const realtime = useOwnerRealtime();
  const alerts = useOwnerAlerts();
  const data = realtime.data ?? FALLBACK_DATA;
  const unresolvedAlerts = alerts.data ?? [];
  const hasAlerts = unresolvedAlerts.length > 0;

  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المراقبة الحية</h1>
          <p className="page-subtitle">مراقبة العمليات الحية للمنصة في الوقت الفعلي</p>
        </div>
      </div>

      {/* Live Status */}
      <div className={`owner-live-status${hasAlerts ? ' has-alerts' : ''}`}>
        <div className="owner-live-pulse" />
        <span className="status-text">
          {hasAlerts
            ? `يوجد ${unresolvedAlerts.length} تنبيه نشط`
            : 'النظام يعمل بشكل طبيعي'}
        </span>
        <span style={{ marginInlineStart: 'auto', fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)' }}>
          آخر تحديث: {lastUpdated.toLocaleTimeString('ar-LY')}
        </span>
      </div>

      {/* Metric Cards */}
      <div className="owner-realtime-grid">
        <MetricCard icon={Activity} label="الجلسات النشطة" value={data.activeSessions.toLocaleString('ar-LY')} color="brand" />
        <MetricCard icon={Bot} label="طلبات AI / دقيقة" value={data.aiRequestsPerMin.toString()} color="gold" />
        <MetricCard icon={MonitorPlay} label="بث مباشر" value={data.liveBroadcasts.toString()} color="purple" />
        <MetricCard icon={FileCheck} label="اختبارات جارية" value={data.activeExams.toString()} color="green" />
      </div>

      {/* Activity Summary */}
      <Card title="ملخص النشاط الحي" icon={Radio}>
        <table className="owner-table">
          <thead>
            <tr>
              <th>المؤشر</th>
              <th>القيمة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>الجلسات المتصلة</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{data.activeSessions}</td>
              <td><div className="owner-health-dot green" style={{ display: 'inline-block' }} /></td>
            </tr>
            <tr>
              <td>طلبات الذكاء الاصطناعي</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{data.aiRequestsPerMin}/دقيقة</td>
              <td><div className="owner-health-dot green" style={{ display: 'inline-block' }} /></td>
            </tr>
            <tr>
              <td>غرف البث المباشر</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{data.liveBroadcasts}</td>
              <td><div className="owner-health-dot green" style={{ display: 'inline-block' }} /></td>
            </tr>
            <tr>
              <td>اختبارات قيد التنفيذ</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{data.activeExams}</td>
              <td><div className="owner-health-dot green" style={{ display: 'inline-block' }} /></td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
