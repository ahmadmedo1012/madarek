import { useState } from 'react';
import { Server, Clock, AlertTriangle, Activity, RefreshCw, Settings, CheckCircle2 } from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { LoadingState, EmptyState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { ToggleSwitch } from '../../components/owner/ToggleSwitch';
import {
  useOwnerFeatureFlags, useToggleFeatureFlag, useOwnerSettings, useUpdateSetting, useOwnerSystem,
} from '../../hooks/useOwner';
import type { FeatureFlag } from '../../hooks/useOwner';
import { formatDateTimeAr, formatRelativeArShort } from '../../lib/format';

const SEVERITY_COLOR: Record<string, 'green' | 'amber' | 'red'> = {
  info: 'green',
  warning: 'amber',
  error: 'red',
  critical: 'red',
};

/* Relative time for nullable timestamps — the shared compact formatter
 * from lib/format.ts (wave 9-a) with this page's '—' null convention. */
function formatRelative(iso: string | null): string {
  return iso ? formatRelativeArShort(iso) : '—';
}

/* formatDateTime is lib/format.formatDateTimeAr (13-14 hand-off, 13-15
 * fold): the local copy was byte-identical to the shared helper. */

const SYNC_ACTION_LABEL: Record<string, string> = {
  'sync.run': 'مزامنة كاملة',
  'sync.partial': 'مزامنة جزئية',
  'sync.failed': 'مزامنة فاشلة',
};

/** Sync-run outcome metadata as written by the backend since 16-B6 —
 *  the feed action carries no in-flight state (RUNNING maps to
 *  'sync.partial'), so the status field is the honest source. */
function syncRunStatus(metadata: unknown): string | null {
  if (metadata && typeof metadata === 'object' && 'status' in metadata) {
    const status = (metadata as { status?: unknown }).status;
    if (typeof status === 'string') return status;
  }
  return null;
}

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

  // Health KPIs derive from the real query state (audit 0-e P0-9): a
  // green "متصل" is only shown when /owner/system actually answered.
  // On error the service card turns into an honest error chip; other
  // values show "—" for unknown (never a fake number, never green).
  const serviceValue = sys.isError ? 'تعذّر الاتصال' : sysData ? 'متصل' : '…';
  const serviceColor: 'red' | 'green' | 'brand' = sys.isError ? 'red' : sysData ? 'green' : 'brand';
  const unknownValue = sys.isError ? '—' : '…';

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

      {/* Real metrics — service health derives from the live query state */}
      <div className="grid-4">
        <MetricCard icon={Server} label="حالة الخدمة" value={serviceValue} color={serviceColor} />
        <MetricCard
          icon={Clock}
          label="آخر مزامنة"
          value={sysData ? formatRelative(sysData.sync.lastRunAt) : unknownValue}
          color="brand"
        />
        <MetricCard
          icon={AlertTriangle}
          label="تنبيهات حرجة مفتوحة"
          value={sysData ? sysData.alerts.criticalCount.toLocaleString('ar-LY') : unknownValue}
          color={sysData ? (sysData.alerts.criticalCount > 0 ? 'red' : 'green') : 'brand'}
        />
        <MetricCard
          icon={Activity}
          label="أحداث آخر 7 أيام"
          value={sysData ? sysData.activity.recentEventsLast7Days.toLocaleString('ar-LY') : unknownValue}
          color="purple"
        />
      </div>

      {/* Sync history — real audit log. No "مزامنة الآن" button: the
          owner API surface exposes no sync-trigger mutation, so the
          old control was dead (audit 0-e P0-10) and has been removed
          rather than left unwired. */}
      <Card title="سجلّ المزامنة" icon={RefreshCw}>
        {sys.isPending ? (
          <LoadingState />
        ) : sys.isError ? (
          <ErrorState
            message="تعذّر جلب سجلّ المزامنة"
            error={sys.error}
            onRetry={() => sys.refetch()}
          />
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
              {sysData.sync.recent.map((run) => {
                const running = syncRunStatus(run.metadata) === 'RUNNING';
                return (
                  <tr key={run.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
                      {formatDateTimeAr(run.at)}
                    </td>
                    <td>
                      {/* 16-B6 hand-off: a RUNNING row reads as in-flight
                          (amber), not «مزامنة جزئية» — matches
                          AdminSyncPage's STATUS_LABEL vocabulary. */}
                      <Badge color={run.action.includes('failed') ? 'red' : running || run.action.includes('partial') ? 'amber' : 'green'}>
                        {running ? 'قيد التنفيذ' : SYNC_ACTION_LABEL[run.action] ?? run.action}
                      </Badge>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{run.actor}</td>
                    <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-subtle)' }}>{formatRelative(run.at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Feature Flags — already real data */}
      <Card title="أعلام الميزات (Feature Flags)" icon={Settings}>
        <div style={{ padding: 'var(--sp-2) 0' }}>
          {flagsQuery.isPending && <LoadingState />}
          {!flagsQuery.isPending && featureFlags.length === 0 && (
            <EmptyState
              title="لا توجد أعلام مُعرَّفة"
              description="لم تُعرَّف أي أعلام ميزات بعد؛ يمكن إضافتها من إعدادات النظام."
            />
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

      {/* Operational alerts — real data, replacing the fake error log.
          An API failure surfaces as an honest error state, never as
          the "لا توجد تنبيهات" empty state. */}
      <Card title="التنبيهات التشغيلية المفتوحة" icon={AlertTriangle}>
        <div style={{ padding: 'var(--sp-2) 0' }}>
          {sys.isPending ? (
            <LoadingState />
          ) : sys.isError ? (
            <ErrorState
              message="تعذّر جلب التنبيهات التشغيلية"
              error={sys.error}
              onRetry={() => sys.refetch()}
            />
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
                  <span className="timestamp">{formatDateTimeAr(alert.createdAt)}</span>
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
            <EmptyState
              title="لا توجد إعدادات مُعرَّفة"
              description="لا توجد إعدادات مخصّصة بعد؛ القيم الافتراضية تعمل."
            />
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
