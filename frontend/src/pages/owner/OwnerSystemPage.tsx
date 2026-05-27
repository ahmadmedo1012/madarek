import { useState } from 'react';
import { Server, Clock, AlertTriangle, Database, RefreshCw, Settings, CheckCircle2 } from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { ToggleSwitch } from '../../components/owner/ToggleSwitch';
import { useOwnerFeatureFlags, useToggleFeatureFlag, useOwnerSettings, useUpdateSetting, useOwnerAlerts } from '../../hooks/useOwner';
import type { FeatureFlag, PlatformSetting } from '../../hooks/useOwner';

const SYNC_HISTORY = [
  { id: '1', date: '2024-12-27 03:00', status: 'SUCCESS' as const, duration: '3.2 ث', records: 1240 },
  { id: '2', date: '2024-12-26 03:00', status: 'SUCCESS' as const, duration: '2.8 ث', records: 1180 },
  { id: '3', date: '2024-12-25 03:00', status: 'PARTIAL' as const, duration: '4.1 ث', records: 890 },
  { id: '4', date: '2024-12-24 03:00', status: 'SUCCESS' as const, duration: '3.0 ث', records: 1200 },
  { id: '5', date: '2024-12-23 03:00', status: 'FAILED' as const, duration: '0.5 ث', records: 0 },
];

const STATUS_COLOR: Record<string, 'green' | 'amber' | 'red'> = {
  SUCCESS: 'green',
  PARTIAL: 'amber',
  FAILED: 'red',
};

const ERROR_LOG = [
  { id: '1', time: '2024-12-27 14:23', message: 'ECONNREFUSED: Connection refused to mail server', stack: 'Error: connect ECONNREFUSED 127.0.0.1:587\n    at TCPConnectWrap.afterConnect\n    at Object.onceWrapper (events.js:421:28)\n    at TCPConnectWrap.emit (events.js:314:20)' },
  { id: '2', time: '2024-12-27 11:05', message: 'JWT token expired for user session', stack: 'TokenExpiredError: jwt expired\n    at /app/src/middleware/auth.ts:45\n    at verify (jsonwebtoken/verify.js:54:12)' },
  { id: '3', time: '2024-12-26 22:18', message: 'Database query timeout exceeded 5000ms', stack: 'PrismaClientKnownRequestError: Query timeout\n    at RequestHandler.handleRequestError\n    at PrismaClient._request' },
  { id: '4', time: '2024-12-26 15:40', message: 'File upload exceeds maximum size limit', stack: 'PayloadTooLargeError: request entity too large\n    at readBody (raw-body/index.js:155:15)\n    at json (body-parser/lib/types/json.js:118:18)' },
  { id: '5', time: '2024-12-25 09:12', message: 'Redis cache connection lost', stack: 'ReplyError: READONLY You can not write against a read only replica\n    at parseError (redis-parser/lib/parser.js:180:12)' },
];

export function OwnerSystemPage() {
  const flagsQuery = useOwnerFeatureFlags();
  const toggleFlag = useToggleFeatureFlag();
  const settingsQuery = useOwnerSettings();
  const updateSetting = useUpdateSetting();
  const alertsQuery = useOwnerAlerts();

  const alerts = alertsQuery.data ?? [];

  // Demo fallback for feature flags
  const defaultFlags: FeatureFlag[] = [
    { id: '1', slug: 'maintenance', name: 'وضع الصيانة', description: 'تعطيل الوصول العام وإظهار رسالة الصيانة', enabled: false, category: 'system', updatedAt: '', updatedBy: null },
    { id: '2', slug: 'registration', name: 'تسجيل مستخدمين جدد', description: 'السماح بإنشاء حسابات جديدة', enabled: true, category: 'system', updatedAt: '', updatedBy: null },
    { id: '3', slug: 'email_notifications', name: 'إشعارات البريد', description: 'إرسال إشعارات البريد الإلكتروني', enabled: true, category: 'system', updatedAt: '', updatedBy: null },
    { id: '4', slug: 'auto_backup', name: 'النسخ الاحتياطي التلقائي', description: 'نسخ احتياطي يومي تلقائي لقاعدة البيانات', enabled: true, category: 'system', updatedAt: '', updatedBy: null },
    { id: '5', slug: 'debug_mode', name: 'وضع التصحيح', description: 'تفعيل سجلات التصحيح المفصلة', enabled: false, category: 'system', updatedAt: '', updatedBy: null },
  ];
  const featureFlags = flagsQuery.data ?? defaultFlags;

  // Demo fallback for settings
  const defaultSettings: PlatformSetting[] = [
    { id: '1', key: 'SESSION_TIMEOUT', value: '3600', category: 'system', updatedAt: '', updatedBy: null },
    { id: '2', key: 'MAX_UPLOAD_SIZE', value: '50MB', category: 'system', updatedAt: '', updatedBy: null },
    { id: '3', key: 'RATE_LIMIT', value: '100/min', category: 'system', updatedAt: '', updatedBy: null },
    { id: '4', key: 'MAINTENANCE_MESSAGE', value: 'المنصة تحت الصيانة، نعود قريباً', category: 'system', updatedAt: '', updatedBy: null },
  ];
  const settings = settingsQuery.data ?? defaultSettings;

  // Local state for editing settings values
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    Object.entries(editedSettings).forEach(([key, value]) => {
      updateSetting.mutate({ key, value });
    });
    setEditedSettings({});
  };

  const handleFlagToggle = (flag: FeatureFlag) => {
    toggleFlag.mutate({ slug: flag.slug, enabled: !flag.enabled });
  };

  const [expandedError, setExpandedError] = useState<string | null>(null);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">
            النظام والتشغيل
            {alerts.length > 0 && <span className="owner-badge-counter" style={{ marginInlineStart: '8px' }}>{alerts.length}</span>}
          </h1>
          <p className="page-subtitle">إدارة البنية التحتية وحالة الخدمات</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-4">
        <MetricCard icon={Server} label="حالة الخادم" value="متصل" color="green" />
        <MetricCard icon={Clock} label="آخر مزامنة" value="منذ 3 ساعات" color="brand" />
        <MetricCard icon={AlertTriangle} label="عدد الأخطاء" value="7" color="amber" />
        <MetricCard icon={Database} label="استخدام الذاكرة المؤقتة" value="2.4 GB" color="purple" />
      </div>

      {/* Sync Status */}
      <Card title="حالة المزامنة" icon={RefreshCw} actions={
        <button type="button" className="btn primary" style={{ fontSize: 'var(--fs-xs)', padding: '6px 12px' }}>
          <Icon icon={RefreshCw} size={13} />
          مزامنة الآن
        </button>
      }>
        <table className="owner-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>المدة</th>
              <th>السجلات</th>
            </tr>
          </thead>
          <tbody>
            {SYNC_HISTORY.map((run) => (
              <tr key={run.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{run.date}</td>
                <td><Badge color={STATUS_COLOR[run.status]}>{run.status === 'SUCCESS' ? 'ناجح' : run.status === 'PARTIAL' ? 'جزئي' : 'فاشل'}</Badge></td>
                <td style={{ fontSize: 'var(--fs-xs)' }}>{run.duration}</td>
                <td style={{ fontSize: 'var(--fs-xs)' }}>{run.records.toLocaleString('ar-LY')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Feature Flags */}
      <Card title="أعلام الميزات (Feature Flags)" icon={Settings}>
        <div style={{ padding: 'var(--sp-2) 0' }}>
          {flagsQuery.isLoading && <div className="owner-flag-loading">جاري التحميل...</div>}
          {featureFlags.map((flag) => (
            <ToggleSwitch
              key={flag.slug}
              label={flag.name}
              description={flag.description ?? undefined}
              checked={flag.enabled}
              onChange={() => handleFlagToggle(flag)}
              disabled={toggleFlag.isPending}
            />
          ))}
        </div>
      </Card>

      {/* Error Log */}
      <Card title="سجل الأخطاء الأخيرة" icon={AlertTriangle}>
        <div style={{ padding: 'var(--sp-2) 0' }}>
          {ERROR_LOG.map((err) => (
            <div key={err.id} className="owner-error-entry">
              <div className="owner-error-entry-head" onClick={() => setExpandedError(expandedError === err.id ? null : err.id)}>
                <span className="timestamp">{err.time}</span>
                <span className="message">{err.message}</span>
                <Icon icon={AlertTriangle} size={14} style={{ color: 'var(--warning)' }} />
              </div>
              {expandedError === err.id && (
                <div className="owner-error-entry-stack">{err.stack}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* System Config */}
      <Card title="إعدادات النظام" icon={Settings}>
        <div style={{ padding: 'var(--sp-2) 0' }}>
          {settings.map((setting) => (
            <div key={setting.key} className="owner-kv-row">
              <code>{setting.key}</code>
              <input
                type="text"
                value={editedSettings[setting.key] ?? setting.value}
                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
              />
            </div>
          ))}
          <div style={{ paddingTop: 'var(--sp-4)' }}>
            <button type="button" className="btn primary" onClick={handleSaveSettings} disabled={updateSetting.isPending}>
              <Icon icon={CheckCircle2} size={14} />
              حفظ الإعدادات
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
