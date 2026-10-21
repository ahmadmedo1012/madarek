/**
 * Admin · University Sync (the demo tenant's curated-source sync)
 *
 *   /admin/sync   show last run, stats, facts by category, manual trigger
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, CheckCircle2, AlertTriangle, Clock, Database,
  AlertCircle, type LucideIcon,
} from 'lucide-react';
import { Card, Badge, AlertRow } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
import { ErrorState, EmptyState, CardSkeleton, Skeleton } from '../../components/primitives/States';
/* R304 (workstream 4D): the sync console opens with the patterns
 * PageHeader — breadcrumbs back to the dashboard and the manual
 * trigger riding the header's action slot (the page's primary verb
 * lives where the eyes land first). */
import { PageHeader as PatternsPageHeader } from '../../components/patterns';
import { Icon } from '../../components/Icon';
import { useReducedMotion } from '../../components/motion';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
/* r299: the sync page joins the admin family's sheet (every other admin
 * page already imports it) — the .spin rule the in-flight affordances
 * consume lives there, and before this import the page's chunk never
 * loaded it (the motion signal computed animation:none live-verified).
 * The sheet's other selectors are scoped to elements this page never
 * renders; loading it is the family's established convention. */
import '../../styles/admin.css';
// R305-A8 «Heron»: the scoped admin/owner sheet rides LAST (same @layer
// pages, later source order → it wins the equal-specificity ties). Every
// rule is scoped under the .r305ao page-root marker — zero leakage.
import '../../styles/r305-admin-owner.css';
import { withInstitutionScope } from '../../lib/queryClient';
import { apiErrorMessage } from '../../hooks/useResources';
import { formatRelativeArShort, countAr } from '../../lib/format';
import { formatDate, formatNum } from '../../utils/numbers';

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
  colleges: 'الكلّيّات',
  general: 'عام',
};

/** A8 P3-7: the sync source is a Latin slug (zu-sync/index.ts —
 *  currently only `static-markdown`). Map it beside CATEGORY_LABEL so
 *  the Arabic KPI line never shows a raw slug; unknown future sources
 *  fall back to the verbatim value (bdi-wrapped, Latin). */
const SOURCE_LABEL: Record<string, string> = {
  'static-markdown': 'بيانات جامعية موثّقة',
};
function sourceLabelAr(source: string): ReactNode {
  return SOURCE_LABEL[source] ?? <bdi>{source}</bdi>;
}

/** A8 P3-7: sub-second runs used to render as the broken-looking
 *  «0.0 ث». Honest durations: under a second says so, seconds are
 *  integers, minutes carry their seconds. */
function formatDurationAr(ms: number): string {
  if (ms < 1_000) return 'أقل من ثانية';
  if (ms < 60_000) return `${Math.round(ms / 1_000)} ث`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1_000);
  return sec > 0 ? `${min} د و${sec} ث` : `${min} د`;
}

/** r299: the StatStrip's shape-matched pending placeholder (the same
 *  local-twin idiom the owner chart pages use — this page is its own
 *  lazy chunk, so it must not import AdminPages' exported skeleton).
 *  The shared PageSkeleton renders the RETIRED icon-tile anatomy — a
 *  metric-tile flash followed by the typographic strip is a
 *  wrong-anatomy flash + CLS at the handoff (the r172b mirror rule). */
function SyncStripSkeleton() {
  return (
    <div className="stat-strip" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="stat-cell">
          <Skeleton width={80} height={11} />
          <div style={{ marginBlock: 'var(--sp-1)' }}>
            <Skeleton width={90} height={28} />
          </div>
          <Skeleton width={120} height={11} />
        </div>
      ))}
    </div>
  );
}

function useSyncStatus() {
  return useQuery({
    /* r180: institution-scoped server-side — scoped key (the run
     * invalidation below keeps prefix-matching the scoped family). */
    queryKey: withInstitutionScope(['admin', 'sync'], useInstitutionScope()),
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
  const reducedMotion = useReducedMotion();
  /* r190-D3: the «حقول قديمة» drill is URL-driven now (?stale=1) — the
   * KPI cell and the dashboard's action row deep-link here, and the
   * effect below opens the first stale category + scrolls to it (the
   * same 5-B4 behavior, but bookmarkable and linkable from anywhere).
   * The param is read once per landing: while it stays in the URL the
   * effect re-opens the category if a later poll closes it — leaving
   * after the drill removes the param. */
  const [searchParams, setSearchParams] = useSearchParams();
  const drillStale = searchParams.get('stale') === '1';
  const categoriesRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!drillStale || !data) return;
    const firstStale = data.categories.find((cat) => cat.items.some((f) => f.isStale));
    if (!firstStale) return;
    setOpenCategory(firstStale.category);
    categoriesRef.current?.scrollIntoView({
      block: 'start',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('stale');
      return next;
    }, { replace: true });
  }, [drillStale, data, reducedMotion, setSearchParams]);

  /** The trigger button — one anatomy shared by the header action
   *  slot and the empty state's CTA (same spin affordance). */
  const triggerButton = (
    <button
      type="button"
      className="btn primary"
      onClick={() => trigger.mutate()}
      disabled={trigger.isPending}
    >
      <Icon icon={RefreshCw} size={14} className={trigger.isPending ? 'spin' : undefined} />
      {trigger.isPending ? 'جارٍ المزامنة…' : 'مزامنة الآن'}
    </button>
  );

  if (isPending) {
    /* r299 (loading closure): a MIRROR skeleton, not the generic
     * PageSkeleton — the resolved page leads with the real header +
     * trigger, then the typographic strip, then the run-history and
     * categories cards. Every section renders its shape-matched
     * placeholder so the pending → resolved handoff moves nothing. */
    return (
      <div className="page r305ao" aria-busy="true" aria-live="polite">
        <PatternsPageHeader
          title="المزامنة مع البيانات الرسمية"
          description="استيراد البيانات العامة من الموقع الرسمي للجامعة."
          breadcrumbs={[{ label: 'لوحة الإدارة', to: '/admin/dashboard' }, { label: 'المزامنة' }]}
          actions={triggerButton}
        />
        <SyncStripSkeleton />
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
      </div>
    );
  }
  // Distinguish error (retry) from "no sync ever run" (empty state).
  // r157 (6A9 #5): the early-error return keeps the page chrome
  // (.page + header + h1) — the retry used to land on a chrome-less
  // wall, so an API blip stripped the admin's bearings before the
  // retry offer.
  if (isError) {
    return (
      <div className="page r305ao">
        <PatternsPageHeader
          title="المزامنة مع البيانات الرسمية"
          description="استيراد البيانات العامة من الموقع الرسمي للجامعة."
          breadcrumbs={[{ label: 'لوحة الإدارة', to: '/admin/dashboard' }, { label: 'المزامنة' }]}
        />
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      </div>
    );
  }

  const lastRun = data?.latestRun ?? null;
  const lastSuccess = data?.runHistory.find((r) => r.status === 'SUCCESS') ?? null;

  // Resolved payload with nothing in it → honest empty state, not a blank page.
  if (!data) {
    return (
      <div className="page r305ao">
        <PatternsPageHeader
          title="المزامنة مع البيانات الرسمية"
          description="استيراد البيانات العامة من الموقع الرسمي للجامعة."
          breadcrumbs={[{ label: 'لوحة الإدارة', to: '/admin/dashboard' }, { label: 'المزامنة' }]}
        />
        <Card>
          <EmptyState illustration="empty-list"
            icon={Database}
            title="لم تُنفَّذ أي مزامنة بعد"
            description="شغّل المزامنة الأولى لاستيراد بيانات الجامعة العامة من موقعها الرسمي."
            action={triggerButton}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page r305ao">
      <PatternsPageHeader
        title="المزامنة مع البيانات الرسمية"
        description={
          /* r299 (honesty, the r164i contract): the hard-coded
              «demo-source» slug died — the payload's real source is
              the curated static source (sourceLabelAr below maps it
              to «بيانات جامعية موثّقة»); a fabricated identifier in
              prose is exactly the dead-data the truthfulness gates
              forbid. */
          'استيراد بيانات المؤسّسة من المصدر المنسَّق للحفاظ على معلومات الجامعة محدّثة. يمكنك تشغيل المزامنة يدوياً عند الحاجة.'
        }
        breadcrumbs={[{ label: 'لوحة الإدارة', to: '/admin/dashboard' }, { label: 'المزامنة' }]}
        actions={triggerButton}
      />

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

      {/* KPI strip — R190: the typographic stat line (the icon-box
          MetricCard grid was the r189-prerelease template pattern; the
          sync facts are counts and statuses, exactly what the ■-marked
          mono labels + metric values are for).
          r299 (freshness-first): the page's question is «how fresh are
          we?» — the freshness cells (last success + last run status)
          lead; the size cell (fact count, with its ?stale=1 drill)
          follows, additions last. The drill link stays on «حقول
          مُزامنة» — the URL opens the first stale category. */}
      <StatStrip
        ariaLabel="حالة المزامنة"
        cells={[
          {
            label: 'آخر مزامنة ناجحة',
            value: lastSuccess?.completedAt ? formatRelativeArShort(lastSuccess.completedAt) : '—',
            trend: lastSuccess ? sourceLabelAr(lastSuccess.source) : 'لم تكتمل بعد',
          },
          {
            label: 'حالة آخر تشغيل',
            value: lastRun ? (STATUS_LABEL[lastRun.status] ?? lastRun.status) : '—',
            trend: lastRun?.durationMs != null && lastRun.durationMs > 0 ? formatDurationAr(lastRun.durationMs) : undefined,
          },
          {
            label: 'حقول مُزامنة',
            value: formatNum(data.factCount),
            trend: data.staleCount > 0
              ? countAr(data.staleCount, ['حقل قديم واحد', 'حقلان قديمان', 'حقول قديمة', 'حقلاً قديماً'])
              : 'كل البيانات حديثة',
            trendTone: data.staleCount > 0 ? 'down' : 'up',
            ...(data.staleCount > 0 ? { to: '/admin/sync?stale=1' } : {}),
          },
          {
            label: 'إضافات هذا التشغيل',
            value: lastRun ? formatNum(lastRun.factsAdded + lastRun.factsUpdated) : '—',
            trend: lastRun ? `${formatNum(lastRun.factsAdded)} جديد · ${formatNum(lastRun.factsUpdated)} محدّث` : 'لم يُشغَّل بعد',
          },
        ]}
      />

      {/* Latest run failure details — r299: overflow-wrap so a long
          backend error string can't stretch the alert row. */}
      {lastRun && lastRun.status !== 'SUCCESS' && lastRun.errorMsg && (
        <AlertRow
          color="red"
          icon={AlertCircle}
          title={lastRun.status === 'FAILED' ? 'تعذّر إكمال التشغيل الأخير' : 'التشغيل الأخير اكتمل جزئياً'}
          description={<span className="font-mono text-xs" style={{ overflowWrap: 'anywhere' }}><bdi>{lastRun.errorMsg}</bdi></span>}
        />
      )}

      {/* Run history — .table system, stacks to cards on phones (tbl-stack).
          r299: the run notes ride the history card (a quiet lead line,
          not their own bordered box — one box for one subject). */}
      <Card title="سجلّ المزامنات" icon={Clock} subtitle="آخر 10 عمليات">
        {lastRun?.notes && (
          <p className="text-xs text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            <span style={{ fontWeight: 600 }}>ملاحظات آخر تشغيل:</span> {lastRun.notes}
          </p>
        )}
        {data.runHistory.length === 0 ? (
          <EmptyState illustration="empty-list"
            icon={Clock}
            title="لا يوجد سجلّ مزامنات بعد"
            description="ستظهر العمليات هنا فور تشغيل المزامنة الأولى."
          />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack ws-table admin-sync-runs">
              <thead>
                <tr>
                  <th scope="col">الحالة</th>
                  <th scope="col">وقت البدء</th>
                  <th scope="col">المصدر</th>
                  <th scope="col" className="admin-table-num">حقول جديدة</th>
                  <th scope="col" className="admin-table-num">حقول محدّثة</th>
                  <th scope="col" className="admin-table-num">المدة</th>
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
                      <td data-label="المصدر" className="text-subtle">
                        {sourceLabelAr(r.source)}
                      </td>
                      <td className="admin-table-num font-mono" data-label="حقول جديدة">{r.factsAdded}</td>
                      <td className="admin-table-num font-mono" data-label="حقول محدّثة">{r.factsUpdated}</td>
                      <td className="admin-table-num font-mono" data-label="المدة">
                        {r.durationMs ? formatDurationAr(r.durationMs) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Synced data preview by category — a FIXED zu-sync snapshot,
          not a live view: every row is a UniversityFact as the last sync
          wrote it (r164-i: the card now says so — «مصدر: المزامنة» —
          and each fact carries its own syncedAt freshness, a field the
          payload already ships). */}
      <div ref={categoriesRef} style={{ scrollMarginBlockStart: 'var(--sp-4)' }}>
      <Card title="البيانات المُزامنة" icon={Database} subtitle="مصدر: المزامنة (zu-sync) · مجمّعة حسب الفئة — انقر للتوسيع">
        {data.categories.length === 0 ? (
          <EmptyState illustration="empty-list"
            icon={Database}
            title="لا توجد بيانات مُزامنة بعد"
            description="شغّل المزامنة لاستيراد حقول الجامعة وتصنيفها هنا."
          />
        ) : (
          <div className="flex-col gap-2">
            {data.categories.map((cat) => {
              const isOpen = openCategory === cat.category;
              /* r299: the head carries its own staleness — an amber
                 count beside the field count, so the operator sees
                 WHICH category holds the stale fields without opening
                 each one (the ?stale=1 drill only auto-opens the first). */
              const staleCount = cat.items.filter((f) => f.isStale).length;
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
                    {staleCount > 0 && (
                      <Badge color="amber">
                        {countAr(staleCount, ['حقل قديم واحد', 'حقلان قديمان', 'حقول قديمة', 'حقلاً قديماً'])}
                      </Badge>
                    )}
                  </button>
                  {isOpen && (
                    <div className="category-row-body" id={`sync-cat-${cat.category}`}>
                      {cat.items.map((f) => (
                        <div key={f.key} className="fact-row">
                          <code className="fact-key"><bdi>{f.key}</bdi></code>
                          <span className="fact-value">{f.value}</span>
                          {/* r164-i: honest freshness per fact — syncedAt
                              IS in the payload (sync.routes.ts ships it);
                              a title carries the full date for hover. */}
                          <span
                            className="fact-source"
                            title={formatDate(f.syncedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                          >
                            <bdi>{f.source}</bdi>
                            {' · آخر تحديث '}
                            {formatRelativeArShort(f.syncedAt)}
                          </span>
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
    </div>
  );
}
