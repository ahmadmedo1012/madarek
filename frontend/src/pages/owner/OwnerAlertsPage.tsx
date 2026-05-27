import { AlertTriangle, ShieldAlert, Bell, CheckCircle2 } from 'lucide-react';
import { Card, MetricCard, Badge, Pill } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useOwnerAlerts, useResolveAlert } from '../../hooks/useOwner';
import type { OperationalAlert } from '../../hooks/useOwner';

const FALLBACK_ALERTS: OperationalAlert[] = [
  { id: '1', severity: 'critical', category: 'infrastructure', title: 'ارتفاع استخدام وحدة المعالجة', message: 'وصل استخدام CPU إلى 95% على الخادم الرئيسي. يرجى مراجعة العمليات الجارية.', metadata: null, resolvedAt: null, resolvedBy: null, createdAt: '2024-12-27T14:30:00Z' },
  { id: '2', severity: 'warning', category: 'security', title: 'محاولات تسجيل دخول فاشلة متكررة', message: 'تم رصد 15 محاولة تسجيل دخول فاشلة من نفس عنوان IP خلال 5 دقائق.', metadata: null, resolvedAt: null, resolvedBy: null, createdAt: '2024-12-27T13:15:00Z' },
  { id: '3', severity: 'warning', category: 'performance', title: 'بطء في استجابة قاعدة البيانات', message: 'متوسط زمن الاستجابة تجاوز 500ms. قد يؤثر على تجربة المستخدم.', metadata: null, resolvedAt: null, resolvedBy: null, createdAt: '2024-12-27T11:45:00Z' },
  { id: '4', severity: 'info', category: 'system', title: 'تحديث النظام متاح', message: 'تتوفر نسخة جديدة من المنصة (v2.5.1). يرجى جدولة التحديث.', metadata: null, resolvedAt: null, resolvedBy: null, createdAt: '2024-12-27T09:00:00Z' },
  { id: '5', severity: 'critical', category: 'storage', title: 'مساحة التخزين شبه ممتلئة', message: 'تبقى 8% فقط من مساحة التخزين. يرجى توسيع المساحة أو حذف الملفات غير الضرورية.', metadata: null, resolvedAt: null, resolvedBy: null, createdAt: '2024-12-26T22:00:00Z' },
];

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
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-LY') + ' ' + d.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
}

export function OwnerAlertsPage() {
  const alertsQuery = useOwnerAlerts();
  const resolveAlert = useResolveAlert();
  const alerts = alertsQuery.data ?? FALLBACK_ALERTS;

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">التنبيهات التشغيلية</h1>
          <p className="page-subtitle">إدارة ومراقبة التنبيهات والحوادث التشغيلية</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <MetricCard icon={Bell} label="تنبيهات مفتوحة" value={alerts.length.toString()} color="brand" />
        <MetricCard icon={ShieldAlert} label="تنبيهات حرجة" value={criticalCount.toString()} color="red" />
        <MetricCard icon={AlertTriangle} label="تحذيرات" value={warningCount.toString()} color="amber" />
      </div>

      {/* Alert Cards */}
      <Card title="التنبيهات النشطة">
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
                  حل التنبيه
                </button>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--sp-6)', color: 'var(--text-muted)' }}>
              لا توجد تنبيهات مفتوحة
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
