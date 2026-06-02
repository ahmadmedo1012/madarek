import { useState } from 'react';
import { Server, Clock, AlertTriangle, Activity, RefreshCw, Settings, CheckCircle2 } from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { LoadingState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { ToggleSwitch } from '../../components/owner/ToggleSwitch';
import {
  useOwnerFeatureFlags, useToggleFeatureFlag, useOwnerSettings, useUpdateSetting, useOwnerSystem,
} from '../../hooks/useOwner';
import type { FeatureFlag } from '../../hooks/useOwner';

const SEVERITY_COLOR: Record<string, 'green' | 'amber' | 'red'> = {
  info: 'green',
  warning: 'amber',
  error: 'red',
  critical: 'red',
};

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const dd = Math.round(h / 24);
  return `منذ ${dd} يوم`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' });
}

const SYNC_ACTION_LABEL: Record<string, string> = {
  'sync.run': 'مزامنة كاملة',
  'sync.partial': 'مزامنة جزئية',
  'sync.failed': 'مزامنة فاشلة',
};

export function OwnerSystemPage() {
  const flagsQuery = useOwnerFeatureFlags();
  const toggleFlag = useToggleFeatureFlag();
  const settingsQuery = useOwnerSettings();
  const updateSetting = useUpdateSetting();
  const sys = useOwnerSystem();

  const featureFlags = flagsQuery.data ?? [];
  const settings = settingsQuery.data ?? [];

  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

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

  const sysData = sys.data;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">
            النظام والتشغيل
            {sysData && sysData.alerts.openCount > 0 && (
              <span className="owner-badge-counter" style={{ marginInlineStart: '8px' }}>
                {sysData.alerts.openCount}
              </span>
            )}
          </h1>
          <p className="page-subtitle">إدارة البنية التحتية وحالة الخدمات</p>
        </div>
      </header>

      {/* Real metrics */}
      <div className="grid-4">
        <MetricCard icon={Server} label="حالة الخدمة" value="متصل" color="green" />
        <MetricCard
          icon={Clock}
          label="آخر مزامنة"
          value={sysData ? formatRelative(sysData.sync.lastRunAt) : '…'}
          color="brand"
        />
        <MetricCard
          icon={AlertTriangle}
          label="تنبيهات حرجة مفتوحة"
          value={sysData ? sysData.alerts.criticalCount.toLocaleString('ar-LY') : '…'}
          color={sysData && sysData.alerts.criticalCount > 0 ? 'red' : 'green'}
        />
        <MetricCard
          icon={Activity}
          label="أحداث آخر ٧ أيام"
          value={sysData ? sysData.activity.recentEventsLast7Days.toLocaleString('ar-LY') : '…'}
          color="purple"
        />
      </div>

      {/* Sync history — real audit log */}
      <Card title="سجلّ المزامنة" icon={RefreshCw} actions={
        <button type="button" className="btn primary" style={{ fontSize: 'var(--fs-xs)', padding: '6px 12px' }}>
          <Icon icon={RefreshCw} size={13} />
          مزامنة الآن
        </button>
      }>
        {sys.isPending ? (
          <LoadingState />
        ) : !sysData || sysData.sync.recent.length === 0 ? (
          <EmptyState
            title="لا توجد عمليّات مزامنة بعد"
            description="ستظهر آخر عمليّات المزامنة هنا فور تشغيلها."
          />
        ) : (
          <table className="owner-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>المنفِّذ</th>
                <th>منذ</th>
              </tr>
            </thead>
            <tbody>
              {sysData.sync.recent.map((run) => (
                <tr key={run.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
                    {formatDateTime(run.at)}
                  </td>
                  <td>
                    <Badge color={run.action.includes('failed') ? 'red' : run.action.includes('partial') ? 'amber' : 'green'}>
                      {SYNC_ACTION_LABEL[run.action] ?? run.action}
                    </Badge>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{run.actor}</td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-subtle)' }}>{formatRelative(run.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Feature Flags — already real data */}
      <Card title="أعلام الميزات (Feature Flags)" icon={Settings}>
        <div style={{ padding: 'var(--sp-2) 0' }}>
          {flagsQuery.isPending && <LoadingState />}
          {!flagsQuery.isPending && featureFlags.length === 0 && (
            <EmptyState title="لا توجد أعلام مُعرَّفة" />
          )}
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

      {/* Operational alerts — real data, replacing the fake error log */}
      <Card title="التنبيهات التشغيلية المفتوحة" icon={AlertTriangle}>
        <div style={{ padding: 'var(--sp-2) 0' }}>
          {sys.isPending ? (
            <LoadingState />
          ) : !sysData || sysData.alerts.open.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="لا توجد تنبيهات مفتوحة"
              description="كل أنظمة المنصّة في حالة طبيعيّة الآن."
            />
          ) : (
            sysData.alerts.open.map((alert) => (
              <div key={alert.id} className="owner-error-entry">
                <div
                  className="owner-error-entry-head"
                  onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                >
                  <span className="timestamp">{formatDateTime(alert.createdAt)}</span>
                  <span className="message">
                    <Badge color={SEVERITY_COLOR[alert.severity] ?? 'amber'}>
                      {alert.severity}
                    </Badge>
                    {' · '}
                    {alert.title}
                  </span>
                  <Icon icon={AlertTriangle} size={14} style={{ color: 'var(--warning)' }} />
                </div>
                {expandedAlert === alert.id && (
                  <div className="owner-error-entry-stack">
                    <div style={{ marginBlockEnd: 'var(--sp-2)' }}>
                      <strong>الفئة:</strong> {alert.category}
                    </div>
                    <div>{alert.message}</div>
                    {alert.metadata !== null && (
                      <pre style={{ marginBlockStart: 'var(--sp-2)', fontSize: 'var(--fs-xxs)' }}>
                        {JSON.stringify(alert.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Platform settings — already real data */}
      <Card title="إعدادات المنصّة" icon={Settings}>
        <div style={{ padding: 'var(--sp-2) 0' }}>
          {settingsQuery.isPending ? (
            <LoadingState />
          ) : settings.length === 0 ? (
            <EmptyState title="لا توجد إعدادات مُعرَّفة" />
          ) : (
            <>
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
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleSaveSettings}
                  disabled={updateSetting.isPending || Object.keys(editedSettings).length === 0}
                >
                  <Icon icon={CheckCircle2} size={14} />
                  حفظ الإعدادات
                </button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
