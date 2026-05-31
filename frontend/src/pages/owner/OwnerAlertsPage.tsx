import { AlertTriangle, ShieldAlert, Bell, CheckCircle2 } from 'lucide-react';
import { Card, MetricCard, Badge, Pill } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useOwnerAlerts, useResolveAlert } from '../../hooks/useOwner';

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'حرج',
  warning: 'تحذير',
  info: 'معلومة',
};

const SEVERITY_COLORS: Record<string, 'red' | 'amber' | 'brand'> = {
  critical: 'red',
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
  api: 'الـ API',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-LY') + ' ' + d.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
}

export function OwnerAlertsPage() {
  const alertsQuery = useOwnerAlerts();
  const resolveAlert = useResolveAlert();
  const alerts = alertsQuery.data ?? [];

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">التنبيهات التشغيليّة</h1>
          <p className="page-subtitle">إدارة ومراقبة التنبيهات والحوادث التشغيليّة — مباشرة من سجلّ المنصّة.</p>
        </div>
      </div>

      <div className="grid-3">
        <MetricCard
          icon={Bell}
          label="تنبيهات مفتوحة"
          value={alertsQuery.isPending ? '…' : alerts.length.toLocaleString('ar-LY')}
          color={alerts.length === 0 ? 'green' : 'brand'}
        />
        <MetricCard
          icon={ShieldAlert}
          label="تنبيهات حرجة"
          value={alertsQuery.isPending ? '…' : criticalCount.toLocaleString('ar-LY')}
          color={criticalCount === 0 ? 'green' : 'red'}
        />
        <MetricCard
          icon={AlertTriangle}
          label="تحذيرات"
          value={alertsQuery.isPending ? '…' : warningCount.toLocaleString('ar-LY')}
          color={warningCount === 0 ? 'green' : 'amber'}
        />
      </div>

      <Card title="التنبيهات النشطة">
        {alertsQuery.isPending ? (
          <LoadingState />
        ) : alertsQuery.isError ? (
          <ErrorState />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="لا توجد تنبيهات مفتوحة"
            description="كل أنظمة المنصّة في حالة طبيعيّة الآن."
          />
        ) : (
          <div style={{ padding: 'var(--sp-2) 0' }}>
            {alerts.map((alert) => (
              <div key={alert.id} className={`owner-alert-card ${alert.severity}`}>
                <div className="owner-alert-card-header">
                  <Badge color={SEVERITY_COLORS[alert.severity]}>{SEVERITY_LABELS[alert.severity] ?? alert.severity}</Badge>
                  <Pill>{CATEGORY_LABELS[alert.category] ?? alert.category}</Pill>
                  <span className="title">{alert.title}</span>
                  <span className="time">{formatTime(alert.createdAt)}</span>
                </div>
                <div className="message">{alert.message}</div>
                <div className="actions">
                  <button
                    type="button"
                    className="btn primary"
                    style={{ fontSize: 'var(--fs-xs)', padding: '4px 12px' }}
                    onClick={() => resolveAlert.mutate(alert.id)}
                    disabled={resolveAlert.isPending}
                  >
                    <Icon icon={CheckCircle2} size={13} />
                    حلّ التنبيه
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
