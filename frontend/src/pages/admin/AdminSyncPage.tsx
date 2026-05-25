/**
 * Admin · University Sync (PRD: daily zu.edu.ly sync)
 *
 *   /admin/sync   show last run, stats, facts by category, manual trigger
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, CheckCircle2, AlertTriangle, Clock, Database,
  ArrowDownToLine, AlertCircle,
} from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { api, unwrap } from '../../lib/api';

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

const STATUS_COLOR: Record<SyncRun['status'], 'green' | 'amber' | 'red' | 'brand'> = {
  SUCCESS: 'green',
  PARTIAL: 'amber',
  FAILED: 'red',
  RUNNING: 'brand',
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
  });
}

function useTriggerSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<SyncRun>(api.post('/admin/sync/trigger', {})),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sync'] }),
  });
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'الآن';
  if (ms < 3_600_000) return `منذ ${Math.round(ms / 60_000)} دقيقة`;
  if (ms < 86_400_000) return `منذ ${Math.round(ms / 3_600_000)} ساعة`;
  return `منذ ${Math.round(ms / 86_400_000)} يوم`;
}

export function AdminSyncPage() {
  const { data, isLoading } = useSyncStatus();
  const trigger = useTriggerSync();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  if (isLoading) return <div className="page"><Card>جارٍ التحميل…</Card></div>;
  if (!data) return <div className="page"><Card>لا توجد بيانات</Card></div>;

  const lastRun = data.latestRun;
  const lastSuccess = data.runHistory.find((r) => r.status === 'SUCCESS') ?? null;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المزامنة مع البيانات الرسمية</h1>
          <p className="page-subtitle">
            استيراد البيانات العامة من <span className="font-mono">zu.edu.ly</span> يومياً للحفاظ على
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
      </div>

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
          label="آخر مزامنة"
          value={fmtRelative(lastSuccess?.completedAt ?? null)}
          change={lastSuccess?.source ?? '—'}
          color="brand"
        />
        <MetricCard
          icon={CheckCircle2}
          label="حالة آخر تشغيل"
          value={lastRun?.status ?? '—'}
          change={lastRun?.durationMs ? `${(lastRun.durationMs / 1000).toFixed(1)} ث` : ''}
          color={lastRun ? STATUS_COLOR[lastRun.status] : 'brand'}
        />
        <MetricCard
          icon={ArrowDownToLine}
          label="إضافات هذا التشغيل"
          value={lastRun ? `${lastRun.factsAdded + lastRun.factsUpdated}` : '0'}
          change={lastRun ? `${lastRun.factsAdded} جديد · ${lastRun.factsUpdated} محدّث` : ''}
          color="purple"
        />
      </div>

      {/* Latest run */}
      {lastRun && lastRun.status !== 'SUCCESS' && lastRun.errorMsg && (
        <Card>
          <div className="flex items-center gap-3">
            <Icon icon={AlertCircle} size={20} style={{ color: 'var(--danger)' }} />
            <div style={{ flex: 1 }}>
              <div className="text-sm" style={{ fontWeight: 600 }}>التشغيل الأخير فشل</div>
              <div className="text-xs text-muted font-mono">{lastRun.errorMsg}</div>
            </div>
          </div>
        </Card>
      )}

      {lastRun?.notes && (
        <Card>
          <div className="text-xs text-muted">
            <span style={{ fontWeight: 600 }}>ملاحظات آخر تشغيل:</span> {lastRun.notes}
          </div>
        </Card>
      )}

      {/* Run history */}
      <Card title="سجلّ المزامنات" icon={Clock} subtitle="آخر 10 عمليات">
        <div className="flex-col gap-2">
          {data.runHistory.map((r) => (
            <div key={r.id} className="run-row">
              <div className="run-row-status">
                {r.status === 'SUCCESS' && <Icon icon={CheckCircle2} size={16} style={{ color: 'var(--success)' }} />}
                {r.status === 'FAILED' && <Icon icon={AlertCircle} size={16} style={{ color: 'var(--danger)' }} />}
                {r.status === 'RUNNING' && <Icon icon={RefreshCw} size={16} className="spin" style={{ color: 'var(--accent)' }} />}
                {r.status === 'PARTIAL' && <Icon icon={AlertTriangle} size={16} style={{ color: 'var(--warning)' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div className="text-sm">
                  <span style={{ fontWeight: 600 }}>
                    {new Date(r.startedAt).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xxs text-subtle font-mono" style={{ marginInlineStart: 8 }}>
                    {r.source}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {r.factsAdded} حقل جديد · {r.factsUpdated} محدّث
                  {r.durationMs ? ` · ${(r.durationMs / 1000).toFixed(1)} ث` : ''}
                </div>
              </div>
              <Badge color={STATUS_COLOR[r.status]}>{r.status}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Synced data preview by category */}
      <Card title="البيانات المُزامنة" icon={Database} subtitle="مجمّعة حسب الفئة — انقر للتوسيع">
        <div className="flex-col gap-2">
          {data.categories.map((cat) => (
            <div key={cat.category} className="category-row">
              <button
                type="button"
                className="category-row-head"
                onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
              >
                <span style={{ fontWeight: 600 }}>{CATEGORY_LABEL[cat.category] ?? cat.category}</span>
                <Badge>{cat.count} حقل</Badge>
              </button>
              {openCategory === cat.category && (
                <div className="category-row-body">
                  {cat.items.map((f) => (
                    <div key={f.key} className="fact-row">
                      <code className="fact-key">{f.key}</code>
                      <span className="fact-value">{f.value}</span>
                      <span className="fact-source">{f.source}</span>
                      {f.isStale && <Badge color="amber">قديم</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
