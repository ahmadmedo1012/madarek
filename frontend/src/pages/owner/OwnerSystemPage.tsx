import { useState } from 'react';
import { AlertTriangle, RefreshCw, Settings, CheckCircle2, ChevronDown, HardDrive } from 'lucide-react';
import { Card, Badge, AlertRow } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
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

/* ── r164-i: upload-storage truthfulness ──────────────────────────
 *
 * GET /owner/system gains an additive `storage: { driver, persistent }`
 * block (r164-l, backend side). The field is OPTIONAL here: payloads
 * from before that change carry no such block, so every read is
 * defensive and a missing block renders «غير متوفر» — never a guess,
 * never a crash. `persistent: false` is the honest local-driver
 * production state (a Render disk survives nothing): the warning
 * names the damage and the documented owner fix (docs/12-deployment.md
 * «تخزين رفعات PDF في الإنتاج — خطوات المالك»).
 *
 * r167 (reachability): the block gains s3-only additive `reachable` +
 * `checkedAt` from a memoized backend probe. The durability claim is
 * now GATED on the store actually answering — s3 + reachable=true →
 * green «دائمة» with a connected note; s3 + reachable=false → red
 * «مهيَّأ لكن يتعذّر الوصول الآن» (uploads will fail until it returns);
 * fields absent → amber «لم يُتحقق بعد». The LOCAL warning treatment
 * is unchanged. */
const STORAGE_DRIVER_LABEL: Record<string, string> = {
  local: 'محليّ — قرص الخادم',
  s3: 'تخزين كائنات (S3-متوافق)',
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
        // r134 فشل→تعذّر family canon (cross-repo audit): the toast title
        // was the last فشل error verb on this surface.
        { title: 'تعذّر حفظ الإعدادات' },
      );
    }
    setSavingSettings(false);
  };
  const handleFlagToggle = (flag: FeatureFlag) => {
    toggleFlag.mutate({ slug: flag.slug, enabled: !flag.enabled });
  };
  /* r176e (D-03): a failed flag flip used to leave the switch at its
   * old server position with NO error and NO retry — the owner either
   * believed the flip landed or never noticed. The house rule every
   * sibling owner mutation follows (settings save above, sync page,
   * notifications) now applies: name the failed flag, offer the retry,
   * and re-fire the SAME payload. */
  const retryFlagToggle = () => {
    const vars = toggleFlag.variables;
    if (vars) toggleFlag.mutate(vars);
  };

  const sysData = sys.data;
  /* r167: the s3 durability claim is gated on the probe answer — a
   * configured-but-unreachable store must never read as a green
   * «دائمة». Non-s3 drivers keep the r164-i treatment verbatim. */
  const storage = sysData?.storage;
  const storageDot: 'green' | 'amber' | 'red' | 'neutral' =
    storage?.driver === 's3'
      ? storage.reachable === true
        ? 'green'
        : storage.reachable === false
          ? 'red'
          : 'amber'
      : storage
        ? storage.persistent
          ? 'green'
          : 'amber'
        : 'neutral';
  const storageValue: string =
    storage?.driver === 's3'
      ? storage.reachable === true
        ? 'دائمة'
        : storage.reachable === false
          ? 'مهيَّأ لكن يتعذّر الوصول الآن'
          : 'لم يُتحقق بعد'
      : storage
        ? storage.persistent
          ? 'دائمة'
          : 'لا تنجو من إعادة النشر'
        : '…';

  // Health KPIs derive from the real query state (audit 0-e P0-9): a
  // green "متصل" is only shown when /owner/system actually answered.
  // On error the service card turns into an honest error chip; other
  // values show "—" for unknown (never a fake number, never green).
  const serviceValue = sys.isError ? 'تعذّر الاتصال' : sysData ? 'متصل' : '…';
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
      <StatStrip
        ariaLabel="مؤشرات حالة النظام"
        cells={[
          {
            label: 'حالة الخدمة',
            value: serviceValue,
            trend: 'من حالة الاستعلام الحيّ',
            trendTone: sysData ? (sysData.alerts.criticalCount > 0 ? 'down' : 'up') : 'flat',
          },
          {
            label: 'آخر مزامنة',
            value: sysData ? formatRelative(sysData.sync.lastRunAt) : unknownValue,
            trend: 'مع المصدر الرسميّ',
            trendTone: 'flat',
          },
          {
            label: 'تنبيهات حرجة مفتوحة',
            value: sysData ? sysData.alerts.criticalCount.toLocaleString('ar-LY') : unknownValue,
            trend: sysData ? (sysData.alerts.criticalCount > 0 ? 'تستوجب قرارًا' : 'لا شيء حرجًا') : 'بانتظار البيانات',
            trendTone: sysData ? (sysData.alerts.criticalCount > 0 ? 'down' : 'up') : 'flat',
          },
          {
            label: 'أحداث آخر 7 أيام',
            value: sysData ? sysData.activity.recentEventsLast7Days.toLocaleString('ar-LY') : unknownValue,
            trend: 'سجلّ تشغيليّ',
            trendTone: 'flat',
          },
        ]}
      />

      {/* r164-i: upload-storage truthfulness — the state of the PDF
          upload substrate, straight from the /owner/system payload's
          (optional) storage block. A missing block (older backend) is
          an honest «غير متوفر», never a guessed green. */}
      <Card title="تخزين الرفعات (PDF)" icon={HardDrive}>
        {sys.isPending ? (
          <div className="owner-health-list">
            <div className="owner-health-row">
              <div className="owner-health-dot neutral" />
              <span className="owner-health-label">حالة التخزين</span>
              <span className="owner-health-value">…</span>
            </div>
          </div>
        ) : !sysData?.storage ? (
          <div className="owner-health-list">
            <div className="owner-health-row">
              <div className="owner-health-dot neutral" />
              <span className="owner-health-label">حالة التخزين</span>
              {/* sys.isError degrades to '—' (the service KPI above
                  already carries the error + retry); a resolved payload
                  with no storage block is «غير متوفر» — an older
                  backend, not an unknown state. */}
              <span className="owner-health-value">
                {sys.isError ? '—' : 'غير متوفر'}
              </span>
            </div>
            <p className="text-xs text-subtle" style={{ marginBlockStart: 'var(--sp-2)' }}>
              {sys.isError
                ? 'تعذّر جلب حالة النظام — أعد المحاولة من بطاقة سجلّ المزامنة أدناه.'
                : 'نسخة الخادم الحاليّة لا تُصرّح عن حالة تخزين الرفعات بعد.'}
            </p>
          </div>
        ) : (
          <div className="owner-health-list">
            <div className="owner-health-row">
              <div className="owner-health-dot neutral" />
              <span className="owner-health-label">السائق</span>
              <span className="owner-health-value">
                {STORAGE_DRIVER_LABEL[sysData.storage.driver]
                  ?? <bdi>{sysData.storage.driver}</bdi>}
              </span>
            </div>
            <div className="owner-health-row">
              <div className={`owner-health-dot ${storageDot}`} />
              <span className="owner-health-label">دوام الملفات المرفوعة</span>
              <span className="owner-health-value">{storageValue}</span>
            </div>
            {sysData.storage.driver === 's3' && sysData.storage.reachable === true && (
              <p className="text-xs text-subtle" style={{ marginBlockStart: 'var(--sp-2)' }}>
                {/* The connected note carries WHEN it was verified — a
                    probe answer, not a permanent promise. */}
                المخزن متاح — آخر تحقّق: {formatRelative(sysData.storage.checkedAt ?? null)}
              </p>
            )}
            {sysData.storage.driver === 's3' && sysData.storage.reachable === undefined && (
              <p className="text-xs text-subtle" style={{ marginBlockStart: 'var(--sp-2)' }}>
                لم يتحقّق الخادم من اتصال المخزن بعد — تظهر الحالة هنا بعد أوّل فحص.
              </p>
            )}
            {sysData.storage.driver === 's3' && sysData.storage.reachable === false && (
              <AlertRow
                color="red"
                icon={AlertTriangle}
                title="مخزن الكائنات لا يستجيب — الرفعات الجديدة ستفشل حتى يعود"
                description={(
                  <>
                    السائق مهيّأ بـ<bdi>S3</bdi> لكن آخر فحص لم يتلقَّ ردًّا. تحقّق من متغيّرات{' '}
                    <bdi>S3_*</bdi> في لوحة البيئة ومن حالة المزوّد نفسه — الخطوات الكاملة في{' '}
                    <bdi>docs/12-deployment.md</bdi>
                    («تخزين رفعات PDF في الإنتاج — خطوات المالك»).
                  </>
                )}
              />
            )}
            {!sysData.storage.persistent && (
              <AlertRow
                color="amber"
                icon={AlertTriangle}
                title="الرفعات لا تنجو من إعادة النشر — يتطلب إعداد تخزين دائم (S3)"
                description={(
                  <>
                    أوراق البحث وملفات المقرّرات المرفوعة ستُفقد عند كل نشر جديد. دوامها يتطلب
                    ضبط <code>STORAGE_DRIVER=s3</code> مع متغيّرات <bdi>S3_*</bdi> من لوحة
                    البيئة — الخطوات الكاملة في <bdi>docs/12-deployment.md</bdi>
                    («تخزين رفعات PDF في الإنتاج — خطوات المالك»).
                  </>
                )}
              />
            )}
          </div>
        )}
      </Card>

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
          <EmptyState illustration="empty-search"
            title="لا توجد عمليّات مزامنة بعد"
            description="ستظهر آخر عمليّات المزامنة هنا فور تشغيلها."
          />
        ) : (
          /* 22-b (4-A7 P1-5): migrated to the shared .table.tbl-stack
           * pattern (the users page's reference migration) — the bare
           * .owner-table clipped its 4 columns inside the card at
           * 390px; the stack pattern turns every row into a labelled
           * card on phones instead. (6A10-7: the trailing
           * owner-sync-table class was dead — no rule in owner.css
           * ever matched it after the tbl-stack migration; the shared
           * classes carry the whole contract.) */
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th scope="col">التاريخ</th>
                  <th scope="col">النوع</th>
                  <th scope="col">المنفِّذ</th>
                  <th scope="col">منذ</th>
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

      {/* Feature Flags — real data */}
      <Card title="أعلام الميزات (Feature Flags)" icon={Settings}>
        <div className="owner-list-pad">
          {/* 6A10-1: the error branch sits BEFORE the length check — a
              failing flags query must never masquerade as "no flags
              defined" (ruling #14, error ≠ empty; the sync + alerts
              cards above already follow this order). */}
          {flagsQuery.isPending ? (
            <ListSkeleton rows={3} />
          ) : flagsQuery.isError ? (
            <ErrorState
              message="تعذّر جلب أعلام الميزات"
              error={flagsQuery.error}
              onRetry={() => flagsQuery.refetch()}
            />
          ) : featureFlags.length === 0 ? (
            <EmptyState illustration="empty-search"
              title="لا توجد أعلام مُعرَّفة"
              /* 22-b (4-A7 P2-9): the old copy pointed at "إعدادات النظام"
               * as the creation path — no such affordance exists on this
               * page (the settings editor only edits existing keys), so
               * the empty state names the real state instead of a dead
               * end. */
              description="لم تُعرَّف أعلام ميزات بعد؛ تُدار حالياً مباشرةً من قاعدة بيانات المنصّة."
            />
          ) : (
            <>
              {featureFlags.map((flag) => (
                <ToggleSwitch
                  key={flag.slug}
                  label={flag.name}
                  description={flag.description ?? undefined}
                  checked={flag.enabled}
                  onChange={() => handleFlagToggle(flag)}
                  /* r176e (D-03): only THE in-flight row is disabled —
                   * the coarse isPending gate used to freeze every row
                   * while any one toggle was in flight. */
                  disabled={toggleFlag.isPending && toggleFlag.variables?.slug === flag.slug}
                />
              ))}
              {toggleFlag.isError && (
                <div className="form-error" role="alert">
                  <span className="form-error-msg">
                    {`تعذّر تحديث العلم «${toggleFlag.variables?.slug ?? ''}» — القيمة المعروضة هي آخر حالة محفوظة.`}
                  </span>
                  <button type="button" className="btn ghost sm" onClick={retryFlagToggle}>
                    إعادة المحاولة
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        {/* r165g (truthfulness): the toggles flip the registry row (and
            the audit trail) — nothing else. Repo-wide, no route,
            middleware, or scheduler reads FeatureFlag at runtime, so
            the card must not imply an immediate behavioral effect. */}
        <p className="text-xs text-subtle" style={{ marginBlockStart: 'var(--sp-2)' }}>
          تُحفَظ حالة كل علم في قاعدة البيانات وتُوثَّق في سجلّ النشاط — لا تستهلكها
          أيّ بوابة تشغيل بعد، فلا يتغيّر سلوك المنصّة بتغييرها.
        </p>
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
            <EmptyState illustration="empty-search"
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

      {/* Platform settings — real data. r165g (truthfulness): the
          editor's copy no longer carries an implicit "applies now"
          promise — like the flags above, PlatformSetting rows are
          recorded + audited but no runtime consumer exists yet. */}
      <Card title="إعدادات المنصّة" icon={Settings}>
        <div className="owner-list-pad">
          {/* 6A10-1: same ordering contract as the flags card above —
              error state (with retry) BEFORE the empty state, never a
              failed fetch dressed up as "no settings defined". */}
          {settingsQuery.isPending ? (
            <ListSkeleton rows={3} />
          ) : settingsQuery.isError ? (
            <ErrorState
              message="تعذّر جلب إعدادات المنصّة"
              error={settingsQuery.error}
              onRetry={() => settingsQuery.refetch()}
            />
          ) : settings.length === 0 ? (
            <EmptyState illustration="empty-search"
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
        {/* r165g: same honest caveat as the flags card — saving here
            writes the registry row, it does not change platform
            behavior. */}
        <p className="text-xs text-subtle" style={{ marginBlockStart: 'var(--sp-2)' }}>
          تُحفَظ القيمة في قاعدة البيانات وتُوثَّق في سجلّ النشاط — لا يستهلكها
          مسار تشغيل بعد؛ سلوك المنصّة يبقى بقيمه المضمّنة في الشيفرة.
        </p>
      </Card>
    </div>
  );
}
