/**
 * Admin · University Sync (PRD: daily zu.edu.ly sync)
 *
 *   /admin/sync   show last run, stats, facts by category, manual trigger
 */
import { useState, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, CheckCircle2, AlertTriangle, Clock, Database,
  ArrowDownToLine, AlertCircle, type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, AlertRow } from '../../components/primitives';
import { PageSkeleton, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { api, unwrap } from '../../lib/api';
import { apiErrorMessage } from '../../hooks/useResources';
import { formatRelativeArShort } from '../../lib/format';
import { formatDate } from '../../utils/numbers';

interface SyncRun {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  source: string;
  factsAdded: number;
  factsUpdated: number;
  durationMs: number | null;
  errorMsg: string | null;
  notes: string | null;
}

interface FactItem {
  key: string;
  value: string;
  source: string;
  isStale: boolean;
  syncedAt: string;
}

interface SyncResponse {
  latestRun: SyncRun | null;
  runHistory: SyncRun[];
  factCount: number;
  staleCount: number;
  categories: Array<{ category: string; count: number; items: FactItem[] }>;
}

/** Arabic labels for sync run statuses (raw enums never reach the UI). */
const STATUS_LABEL: Record<SyncRun['status'], string> = {
  RUNNING: 'قيد التنفيذ',
  SUCCESS: 'ناجحة',
  PARTIAL: 'جزئية',
  FAILED: 'فاشلة',
};

const STATUS_COLOR: Record<SyncRun['status'], 'green' | 'amber' | 'red' | 'brand'> = {
  SUCCESS: 'green',
  PARTIAL: 'amber',
  FAILED: 'red',
  RUNNING: 'brand',
};

const STATUS_ICON: Record<SyncRun['status'], LucideIcon> = {
  SUCCESS: CheckCircle2,
  FAILED: AlertCircle,
  RUNNING: RefreshCw,
  PARTIAL: AlertTriangle,
};

const CATEGORY_LABEL: Record<string, string> = {
  identity: 'هوية الجامعة',
  contact: 'بيانات التواصل',
  strategic: 'الخطة الاستراتيجية',
  grading: 'نظام التقييم',
  programs: 'الدراسة والشهادات',
  memberships: 'العضويات',
  colleges: 'الكليات',
  general: 'عام',
};

function useSyncStatus() {
  return useQuery({
    queryKey: ['admin', 'sync'],
    queryFn: () => unwrap<SyncResponse>(api.get('/admin/sync')),
    refetchInterval: 30_000,
    // Explicit like the three sibling polls (useResources ×2, useOwner):
    // TanStack's default is already false — this pins it so a future
    // global default flip can't silently start background-polling
    // admins (15-e P2-5).
    refetchIntervalInBackground: false,
  });
}

function useTriggerSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<SyncRun>(api.post('/admin/sync/trigger', {})),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sync'] }),
  });
}

// fmtRelative (local near-verbatim copy of formatRelativeArShort) was
// deleted in 16-E10 — the KPI below uses the canonical helper from
// lib/format (15-h P2-2 consolidation).

export function AdminSyncPage() {
  const { data, isPending, isError, error, refetch } = useSyncStatus();
  const trigger = useTriggerSync();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  if (isPending) return <PageSkeleton />;
  // Distinguish error (retry) from "no sync ever run" (empty state).
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const lastRun = data?.latestRun ?? null;
  const lastSuccess = data?.runHistory.find((r) => r.status === 'SUCCESS') ?? null;

  // Resolved payload with nothing in it → honest empty state, not a blank page.
  if (!data) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">المزامنة مع البيانات الرسمية</h1>
            <p className="page-subtitle">استيراد البيانات العامة من الموقع الرسمي للجامعة.</p>
          </div>
        </header>
        <Card>
          <EmptyState
            icon={Database}
            title="لم تُنفَّذ أي مزامنة بعد"
            description="شغّل المزامنة الأولى لاستيراد بيانات الجامعة العامة من موقعها الرسمي."
            action={
              <button
                type="button"
                className="btn primary"
                onClick={() => trigger.mutate()}
                disabled={trigger.isPending}
              >
                <Icon icon={RefreshCw} size={14} className={trigger.isPending ? 'spin' : undefined} />
                {trigger.isPending ? 'جارٍ المزامنة…' : 'مزامنة الآن'}
              </button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المزامنة مع البيانات الرسمية</h1>
          <p className="page-subtitle">
            استيراد البيانات العامة من <span className="font-mono"><bdi>zu.edu.ly</bdi></span> يومياً للحفاظ على
            معلومات الجامعة محدّثة. يمكنك تشغيل المزامنة يدوياً عند الحاجة.
          </p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => trigger.mutate()}
          disabled={trigger.isPending}
        >
          <Icon icon={RefreshCw} size={14} className={trigger.isPending ? 'spin' : undefined} />
          {trigger.isPending ? 'جارٍ المزامنة…' : 'مزامنة الآن'}
        </button>
      </header>

      {/* Manual-trigger failure — surfaced inline with a retry, never silent */}
      {trigger.isError && (
        <AlertRow
          color="red"
          icon={AlertCircle}
          title="تعذّر تشغيل المزامنة"
          description={apiErrorMessage(trigger.error, 'لم يستجب الخادم للطلب. تحقّق من الاتصال ثم أعد المحاولة.')}
          actions={
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => trigger.mutate()}
              disabled={trigger.isPending}
            >
              <Icon icon={RefreshCw} size={13} />
              إعادة المحاولة
            </button>
          }
        />
      )}

      {/* KPI strip */}
      <div className="grid-4">
        <MetricCard
          icon={Database}
          label="حقول مُزامنة"
          value={data.factCount.toString()}
          change={data.staleCount > 0 ? `${data.staleCount} حقل قديم` : 'كل البيانات حديثة'}
          color={data.staleCount > 0 ? 'amber' : 'green'}
        />
        <MetricCard
          icon={Clock}
          label="آخر مزامنة ناجحة"
          value={lastSuccess?.completedAt ? formatRelativeArShort(lastSuccess.completedAt) : '—'}
          change={lastSuccess ? <bdi>{lastSuccess.source}</bdi> : 'لم تكتمل بعد'}
          color="brand"
        />
        <MetricCard
          icon={STATUS_ICON[lastRun ? lastRun.status : 'SUCCESS']}
          label="حالة آخر تشغيل"
          value={lastRun ? (STATUS_LABEL[lastRun.status] ?? lastRun.status) : '—'}
          change={lastRun?.durationMs ? <>{(lastRun.durationMs / 1000).toFixed(1)} ث</> : ''}
          color={lastRun ? STATUS_COLOR[lastRun.status] : 'brand'}
        />
        <MetricCard
          icon={ArrowDownToLine}
          label="إضافات هذا التشغيل"
          value={lastRun ? `${lastRun.factsAdded + lastRun.factsUpdated}` : '—'}
          change={lastRun ? `${lastRun.factsAdded} جديد · ${lastRun.factsUpdated} محدّث` : 'لم يُشغَّل بعد'}
          color="purple"
        />
      </div>

      {/* Latest run failure details */}
      {lastRun && lastRun.status !== 'SUCCESS' && lastRun.errorMsg && (
        <AlertRow
          color="red"
          icon={AlertCircle}
          title={lastRun.status === 'FAILED' ? 'التشغيل الأخير فشل' : 'التشغيل الأخير اكتمل جزئياً'}
          description={<span className="font-mono text-xs"><bdi>{lastRun.errorMsg}</bdi></span>}
        />
      )}

      {lastRun?.notes && (
        <Card>
          <div className="text-xs text-muted">
            <span style={{ fontWeight: 600 }}>ملاحظات آخر تشغيل:</span> {lastRun.notes}
          </div>
        </Card>
      )}

      {/* Run history — .table system, stacks to cards on phones (tbl-stack) */}
      <Card title="سجلّ المزامنات" icon={Clock} subtitle="آخر 10 عمليات">
        {data.runHistory.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="لا يوجد سجلّ مزامنات بعد"
            description="ستظهر العمليات هنا فور تشغيل المزامنة الأولى."
          />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack admin-sync-runs">
              <thead>
                <tr>
                  <th>الحالة</th>
                  <th>وقت البدء</th>
                  <th>المصدر</th>
                  <th className="admin-table-num">حقول جديدة</th>
                  <th className="admin-table-num">حقول محدّثة</th>
                  <th className="admin-table-num">المدة</th>
                </tr>
              </thead>
              <tbody>
                {data.runHistory.map((r, i) => {
                  const StatusIcon = STATUS_ICON[r.status];
                  return (
                    <tr key={r.id} style={{ '--run-i': i } as CSSProperties}>
                      <td data-label="الحالة">
                        <Badge color={STATUS_COLOR[r.status]}>
                          <Icon icon={StatusIcon} size={11} className={r.status === 'RUNNING' ? 'spin' : undefined} />
                          {STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                      </td>
                      <td data-label="وقت البدء">
                        <bdi>{formatDate(r.startedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</bdi>
                      </td>
                      <td data-label="المصدر" className="font-mono text-subtle">
                        <bdi>{r.source}</bdi>
                      </td>
                      <td className="admin-table-num font-mono" data-label="حقول جديدة">{r.factsAdded}</td>
                      <td className="admin-table-num font-mono" data-label="حقول محدّثة">{r.factsUpdated}</td>
                      <td className="admin-table-num font-mono" data-label="المدة">
                        {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)} ث` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Synced data preview by category */}
      <Card title="البيانات المُزامنة" icon={Database} subtitle="مجمّعة حسب الفئة — انقر للتوسيع">
        {data.categories.length === 0 ? (
          <EmptyState
            icon={Database}
            title="لا توجد بيانات مُزامنة بعد"
            description="شغّل المزامنة لاستيراد حقول الجامعة وتصنيفها هنا."
          />
        ) : (
          <div className="flex-col gap-2">
            {data.categories.map((cat) => {
              const isOpen = openCategory === cat.category;
              return (
                <div key={cat.category} className="category-row">
                  <button
                    type="button"
                    className="category-row-head"
                    aria-expanded={isOpen}
                    aria-controls={`sync-cat-${cat.category}`}
                    onClick={() => setOpenCategory(isOpen ? null : cat.category)}
                  >
                    <span style={{ fontWeight: 600 }}>{CATEGORY_LABEL[cat.category] ?? cat.category}</span>
                    <Badge>{cat.count} حقل</Badge>
                  </button>
                  {isOpen && (
                    <div className="category-row-body" id={`sync-cat-${cat.category}`}>
                      {cat.items.map((f) => (
                        <div key={f.key} className="fact-row">
                          <code className="fact-key"><bdi>{f.key}</bdi></code>
                          <span className="fact-value">{f.value}</span>
                          <span className="fact-source"><bdi>{f.source}</bdi></span>
                          {f.isStale && <Badge color="amber">قديم</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
