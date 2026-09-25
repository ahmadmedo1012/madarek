import { useState } from 'react';
import { Server, Clock, AlertTriangle, Activity, RefreshCw, Settings, CheckCircle2, ChevronDown } from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { EmptyState, ErrorState, TableSkeleton, ListSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { ToggleSwitch } from '../../components/owner/ToggleSwitch';
import {
  useOwnerFeatureFlags, useToggleFeatureFlag, useOwnerSettings, useUpdateSetting, useOwnerSystem,
} from '../../hooks/useOwner';
import type { FeatureFlag } from '../../hooks/useOwner';
import { SEVERITY_LABELS, SEVERITY_COLORS, CATEGORY_LABELS } from '../../lib/ownerLabels';
import { formatDateTimeAr, formatRelativeArShort } from '../../lib/format';
import { toast } from '../../lib/toast';

/* 22-b (4-A7 P1-1): the severity/category label maps now live in
 * lib/ownerLabels.ts — the System page's operational-alert feed and the
 * Alerts page render ONE vocabulary (حرج/خطأ/تحذير/معلومة), never the
 * raw English enums the API ships. */

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

/** Counted plural for failed setting saves (the toast names the damage). */
function failedSavesLabel(n: number): string {
  if (n === 1) return 'إعداد واحد';
  if (n === 2) return 'إعدادان';
  if (n >= 3 && n <= 10) return `${n.toLocaleString('ar-LY')} إعدادات`;
  return `${n.toLocaleString('ar-LY')} إعداداً`;
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
  const [savingSettings, setSavingSettings] = useState(false);

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
  };

  /* 22-b (4-A7 P2-4): the save used to fire N parallel fire-and-forget
   * mutations and clear the local edits immediately — a failure left no
   * trace and no retry path. Now every mutation is awaited via
   * Promise.allSettled: full success clears the edits and toasts; any
   * rejection keeps ONLY the failed keys editable (the saved ones drop
   * out of the draft) and the toast names how many failed. */
  const handleSaveSettings = async () => {
    const entries = Object.entries(editedSettings);
    if (entries.length === 0 || savingSettings) return;
    setSavingSettings(true);
    const results = await Promise.allSettled(
      entries.map(([key, value]) => updateSetting.mutateAsync({ key, value })),
    );
    const failedKeys = new Set(
      entries.filter((_, i) => results[i]!.status === 'rejected').map(([key]) => key),
    );
    if (failedKeys.size === 0) {
      setEditedSettings({});
      toast.success('حُفظت الإعدادات المعدَّلة بنجاح.', { title: 'تمّ الحفظ' });
    } else {
      setEditedSettings((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([key]) => failedKeys.has(key))),
      );
      toast.error(
        `تعذّر حفظ ${failedSavesLabel(failedKeys.size)} — أُبقيت قيمه في المحرّر، حاول مجدداً.`,
        { title: 'فشل حفظ الإعدادات' },
      );
    }
    setSavingSettings(false);
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
              <span className="owner-badge-counter">
                <bdi>{sysData.alerts.openCount.toLocaleString('ar-LY')}</bdi>
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
          /* Shape-matched (4-A7 P2-5): a 4-col table skeleton, not a
           * bare spinner — the shape this card fills is known. */
          <TableSkeleton rows={4} cols={4} />
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
          /* 22-b (4-A7 P1-5): migrated to the shared .table.tbl-stack
           * pattern (the users page's reference migration) — the bare
           * .owner-table clipped its 4 columns inside the card at
           * 390px; the stack pattern turns every row into a labelled
           * card on phones instead. */
          <div className="table-wrap">
            <table className="table tbl-stack owner-sync-table">
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
                      <td className="owner-cell-muted" data-label="التاريخ">{formatDateTimeAr(run.at)}</td>
                      <td data-label="النوع">
                        {/* 16-B6 hand-off: a RUNNING row reads as in-flight
                            (amber), not «مزامنة جزئية» — matches
                            AdminSyncPage's STATUS_LABEL vocabulary. */}
                        <Badge color={run.action.includes('failed') ? 'red' : running || run.action.includes('partial') ? 'amber' : 'green'}>
                          {running ? 'قيد التنفيذ' : SYNC_ACTION_LABEL[run.action] ?? <bdi>{run.action}</bdi>}
                        </Badge>
                      </td>
                      <td className="owner-cell-muted" data-label="المنفِّذ">{run.actor}</td>
                      <td className="owner-cell-muted" data-label="منذ">{formatRelative(run.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Feature Flags — already real data */}
      <Card title="أعلام الميزات (Feature Flags)" icon={Settings}>
        <div className="owner-list-pad">
          {flagsQuery.isPending && <ListSkeleton rows={3} />}
          {!flagsQuery.isPending && featureFlags.length === 0 && (
            <EmptyState
              title="لا توجد أعلام مُعرَّفة"
              /* 22-b (4-A7 P2-9): the old copy pointed at "إعدادات النظام"
               * as the creation path — no such affordance exists on this
               * page (the settings editor only edits existing keys), so
               * the empty state names the real state instead of a dead
               * end. */
              description="لم تُعرَّف أعلام ميزات بعد؛ تُدار حالياً مباشرةً من قاعدة بيانات المنصّة."
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
        <div className="owner-list-pad">
          {sys.isPending ? (
            <ListSkeleton rows={3} />
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
                {/* 22-b (4-A7 P1-2): a real disclosure <button> (was a
                    click-only div — WCAG 2.1.1). aria-expanded + the
                    rotating chevron reuse the activity feed's
                    .owner-detail-toggle motion language. */}
                <button
                  type="button"
                  className="owner-error-entry-head"
                  aria-expanded={expandedAlert === alert.id}
                  onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                >
                  <span className="timestamp">{formatDateTimeAr(alert.createdAt)}</span>
                  <span className="message">
                    <Badge color={SEVERITY_COLORS[alert.severity] ?? 'amber'}>
                      {SEVERITY_LABELS[alert.severity] ?? <bdi>{alert.severity}</bdi>}
                    </Badge>
                    {' · '}
                    {alert.title}
                  </span>
                  <Icon icon={ChevronDown} size={14} className="owner-detail-chevron" aria-hidden />
                </button>
                {expandedAlert === alert.id && (
                  <div className="owner-error-entry-stack">
                    <div className="owner-stack-field">
                      <strong>الفئة:</strong> {CATEGORY_LABELS[alert.category] ?? <bdi>{alert.category}</bdi>}
                    </div>
                    <div>{alert.message}</div>
                    {alert.metadata !== null && (
                      <pre>
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
        <div className="owner-list-pad">
          {settingsQuery.isPending ? (
            <ListSkeleton rows={3} />
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
              <div className="owner-save-row">
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleSaveSettings}
                  disabled={savingSettings || updateSetting.isPending || Object.keys(editedSettings).length === 0}
                >
                  <Icon icon={CheckCircle2} size={14} />
                  {savingSettings ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}
                </button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
