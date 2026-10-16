import type { LucideIcon } from 'lucide-react';
import { Inbox, AlertTriangle, RefreshCw, ShieldAlert, ArrowRight } from 'lucide-react';
import { Icon } from '../Icon';
import { Illustration } from '../Illustration';
import type { IllustrationName } from '../../lib/illustrations';
import { apiErrorDetail, apiErrorCode, isArabicText } from '../../lib/format';

// r151c: 'page' | 'card' retired — no call site ever passed them (default
// is inline, one minimal consumer), and their .state.state-* CSS rules
// were dead weight deleted in the same sweep. Re-add both halves together.
type LoadingVariant = 'inline' | 'minimal';

export function LoadingState({
  label = 'جارٍ التحميل…',
  variant = 'inline',
}: {
  label?: string;
  variant?: LoadingVariant;
}) {
  if (variant === 'minimal') {
    return <span className="spinner spinner-sm" role="status" aria-label={label} />;
  }
  return (
    <div className={`state state-loading state-${variant}`} role="status" aria-live="polite">
      <div className="spinner" aria-hidden />
      <div className="state-desc" style={{ marginTop: 'var(--sp-2)' }}>{label}</div>
    </div>
  );
}

export function EmptyState({
  icon = Inbox,
  illustration,
  title = 'لا توجد بيانات لعرضها بعد',
  /**
   * Actionable default (15-j Batch F): a description-less empty state
   * used to be a dead end — "لا توجد بيانات لعرضها بعد" with no path
   * forward. Every surface that forgets to override now tells the
   * user what to do next. Pass an explicit description to override;
   * pass '' to opt out entirely (nothing renders).
   */
  description = 'تعال لاحقاً — أو حدّث الصفحة للتحقق من وجود محتوى جديد.',
  action,
}: {
  icon?: LucideIcon;
  /**
   * 012-design-graphics-uplift T089: prefer a bespoke scene from the
   * illustration system over the Lucide icon. When set, the
   * illustration replaces the icon block; when unset, the existing
   * icon path renders.
   */
  illustration?: IllustrationName;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state state-empty" role="status">
      {illustration ? (
        <div className="state-illustration" aria-hidden>
          <Illustration name={illustration} decorative />
        </div>
      ) : (
        <div className="state-icon"><Icon icon={icon} size={20} /></div>
      )}
      <div className="state-title">{title}</div>
      {description && <div className="state-desc">{description}</div>}
      {action && <div style={{ marginTop: 'var(--sp-3)' }}>{action}</div>}
    </div>
  );
}

/**
 * Best-effort extraction of a human-readable detail from an unknown error.
 * Handles axios-style errors (response.data.error.message), plain Error
 * objects, and arbitrary thrown values. The API-message branch is the
 * shared lib helper (wave 9-a); this adds the plain-`message` fallback
 * ErrorState has always had.
 *
 * 15-j P0-1: BOTH branches are Arabic-guarded — a Latin-only message
 * (the backend's English defaults, axios's 'Network Error') returns
 * null so ErrorState falls back to its Arabic copy instead of leaking
 * English into the RTL page.
 */
function extractErrorDetail(error: unknown): string | null {
  if (!error) return null;
  const apiMsg = apiErrorDetail(error);
  if (apiMsg) return apiMsg;
  const msg = (error as { message?: string }).message;
  if (typeof msg === 'string' && msg.length > 0 && msg.length < 240 && isArabicText(msg)) return msg;
  return null;
}

export function ErrorState({
  message = 'تعذَّر تحميل هذا القسم',
  illustration,
  error,
  onRetry,
}: {
  message?: string;
  /**
   * 012-design-graphics-uplift T089: optional bespoke scene to replace
   * the warning-triangle icon. When unset, the existing AlertTriangle
   * icon renders as before.
   */
  illustration?: IllustrationName;
  error?: unknown;
  /**
   * Retry affordance. Rendered by the generic branch and — as of
   * audit 11-e P2-18 — the 404 branch, where the miss can be a
   * transient race (an item that just published). NOT rendered by
   * the 403 branch: authorization is not transient, so refetching
   * cannot fix it — PermissionDeniedState's back affordance is the
   * honest action there.
   */
  onRetry?: () => void;
}) {
  const apiDetail = extractErrorDetail(error);
  // 15-j P0-1 — an API refusal whose message isn't Arabic never renders
  // raw: the detail becomes the generic Arabic refusal and the machine
  // code rides along in a mono <bdi> for support. A network fault (no
  // response at all) keeps the connection-advice default — checking
  // the connection is the actual fix there.
  const apiAnswered = !!(error as { response?: unknown } | undefined)?.response;
  const supportCode = apiAnswered && !apiDetail ? apiErrorCode(error) : null;
  const detail = apiDetail
    ?? (apiAnswered ? 'تعذَّر إتمام الطلب، حاول مرة أخرى.' : 'حاول مرة أخرى، أو تحقّق من اتصالك بالشبكة.');

  // Branch on HTTP 403 — distinguish "you don't have permission" from
  // generic server errors. Without this, every 403 looks like a 500 to
  // the user (same "تعذّر تحميل هذا القسم" message, same retry button
  // that won't help because the issue is authorization, not transient).
  const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
  if (status === 403) {
    return <PermissionDeniedState detail={apiDetail} />;
  }
  // 404 → show a "not found" message instead of generic error. A miss
  // can be a transient race (an item that just published), so a
  // caller-provided onRetry is honored here rather than silently
  // dropped (audit 11-e P2-18).
  if (status === 404) {
    return (
      <div className="state state-error" role="alert">
        <div className="state-icon" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
          <Icon icon={Inbox} size={20} />
        </div>
        <div className="state-title">العنصر غير موجود</div>
        <div className="state-desc">{apiDetail ?? 'ربما تم حذفه أو أن الرابط غير صحيح.'}</div>
        {onRetry && (
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <button type="button" className="btn primary sm" onClick={onRetry}>
              <Icon icon={RefreshCw} size={13} />
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="state state-error" role="alert">
      {illustration ? (
        <div className="state-illustration" aria-hidden>
          <Illustration name={illustration} decorative />
        </div>
      ) : (
        /* 5-D1 (A11 P2-3): -deep ink on the soft well — the base
           --danger measured 2.59:1 in light (non-text floor 3:1);
           mirrors .state-icon-success and the toast well grammar. */
        <div className="state-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger-ink)' }}>
          <Icon icon={AlertTriangle} size={20} />
        </div>
      )}
      <div className="state-title">{message}</div>
      <div className="state-desc">
        {detail}
        {supportCode && (
          <>{' '}(<bdi className="font-mono">{supportCode}</bdi>)</>
        )}
      </div>
      {onRetry && (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <button type="button" className="btn primary sm" onClick={onRetry}>
            <Icon icon={RefreshCw} size={13} />
            إعادة المحاولة
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Permission-denied state — shown when the API returns 403.
 *
 * Distinct from generic ErrorState because the fix isn't "retry" —
 * it's "go back" or "request access". Without this, every 403 looks
 * like a server crash to the user.
 */
export function PermissionDeniedState({
  title = 'لا تملك صلاحية الوصول',
  detail,
  onBack,
}: {
  title?: string;
  detail?: string | null;
  onBack?: () => void;
}) {
  return (
    <div className="state state-error" role="alert">
      {/* 5-D1 (A11 P2-3): warning-ink on the soft well (was the base
          --warning at 2.03:1 light — the audit's worst status icon). */}
      <div className="state-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning-ink)' }}>
        <Icon icon={ShieldAlert} size={20} />
      </div>
      <div className="state-title">{title}</div>
      <div className="state-desc">
        {detail ?? 'هذا القسم متاح لأدوار أو صلاحيات محددة فقط.'}
      </div>
      {onBack && (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <button type="button" className="btn primary sm" onClick={onBack}>
            <Icon icon={ArrowRight} size={13} />
            العودة للوحة التحكم
          </button>
        </div>
      )}
    </div>
  );
}

export function Skeleton({
  width,
  height = 14,
  rounded = 'var(--r-sm)',
}: {
  width?: string | number;
  height?: string | number;
  rounded?: string;
}) {
  return (
    <span
      className="skeleton"
      style={{ width: width ?? '100%', height, borderRadius: rounded }}
      aria-hidden
    />
  );
}

/** Skeleton for a row of 4 KPI cards */
export function KpiSkeleton() {
  return (
    <div className="grid-4" aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="metric">
          {/* 5-C3 (A9 P2-1): the bars now mirror the real MetricCard
            anatomy — a .metric-head column (label / value / change),
            exactly what MetricCard renders. The old bare spans were ROW
            flex items of .metric: 80+70+120px overflowed the ~215px
            content box and the empty value bar (min-content 0) absorbed
            every pixel of shrink — computed width literally 0px on all
            five dashboards (A9 V6), so the big-number placeholder, the
            most important bar, never painted. */}
          <div className="metric-head">
            <Skeleton width={80} height={11} />
            {/* r172b: 26→28 — the real MetricCard column measures
              metric-head 84px (label/value/change + gaps) while the
              skeleton column was 82, a 2px row-height delta on every
              dashboard handoff (the live CLS lab caught it: KpiSkeleton
              .metric = 132 vs real 134). */}
            <Skeleton width={70} height={28} />
            <Skeleton width={120} height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* r176f (E-01): the row anatomy is calibrated to the content the
 * skeleton swaps for — `.list-row` renders a 32px avatar (or initial)
 * plus a title line (~16px) and a sub line (~12px) at padding sp-3/sp-4
 * ≈ 56-64px per row. The old single 12px bar at sp-2 padding (~28px)
 * collapsed by ~half on resolve — the r174b loading-closure defect
 * class, on every non-dashboard surface. Two stacked bars + a leading
 * avatar-diameter circle match the real geometry. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex-col gap-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
          <Skeleton width={32} height={32} rounded="var(--r-full)" />
          <div className="flex-col" style={{ flex: 1, minWidth: 0, gap: 'var(--sp-1)' }}>
            <Skeleton width="55%" height={12} />
            <Skeleton width="35%" height={10} />
          </div>
          <Skeleton width={40} height={12} />
        </div>
      ))}
    </div>
  );
}

/** Action-strip-shaped skeleton (r172b loading closure).
 *  The dashboards' action strips (admin's ActionStrip, owner's
 *  OwnerActionStrip) mount ABOVE the KPI row and render null until
 *  their queries answer — a cold route's generic PageSkeleton has no
 *  slot for them, so the strip's late mount pushed every section
 *  below it down (measured: 217px insertion, CLS 0.066–0.183 in the
 *  delayed-API lab). This skeleton rides the REAL card anatomy
 *  (.card/.card-header/.card-title-block/.card-title/.card-subtitle)
 *  with the strip's static identity as real text (the title is
 *  hardcoded — showing it while the rows pend is honest) and N
 *  row-shaped placeholders, so BOTH the page-level pending state (the
 *  slot) and the strip's own isPending state render the exact box the
 *  resolved strip will occupy — the handoffs become height-stable. */
export function StripSkeleton({
  title,
  subtitle,
  rows = 1,
}: {
  title: string;
  subtitle: string;
  rows?: number;
}) {
  return (
    <div className="card" aria-busy="true" aria-live="polite">
      <div className="card-header">
        <div className="card-title-block">
          <div className="card-title">
            <span>{title}</span>
          </div>
          <div className="card-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} width="100%" height={81} rounded="var(--r-lg)" />
        ))}
      </div>
    </div>
  );
}

/** Skeleton placeholder for a chart container of arbitrary height.
 * 5-C3 (A9 P2-5): carries the primitives-family busy semantics
 *  (aria-busy + polite live region, bars stay aria-hidden) — it was
 *  the only member of the skeleton family with none, leaving the 2
 *  charts on /quality/dashboard mid-load outside any aria context. */
export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      /* r157 (audit 6A11 #9): gap joined the spacing ladder — var(--sp-2)
         = 8px (tokens.css), the same step the KpiSkeleton rows breathe. */
      style={{ height, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}
      aria-busy="true"
      aria-live="polite"
    >
      {[60, 80, 50, 95, 70, 45, 85].map((pct, i) => (
        <Skeleton key={i} width={`${pct}%`} height={8} />
      ))}
    </div>
  );
}

/* r176f (E-01+E-07): calibrated to `.table`'s real anatomy — a
 * ~44px thead (the header bar) plus ~42px+ `td` rows (padding sp-3) —
 * and %-based column widths so 8-column skeletons don't collapse to
 * slivers at 360px (the fixed 140/60px bars flexed to near-zero).
 * Fixed heights total the same block the resolved table occupies, so
 * the resolve swap lands at ~0 CLS. */
export function TableSkeleton({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex-col gap-2" style={{ padding: 'var(--sp-3) 0' }} aria-busy="true" aria-live="polite">
      {/* thead-shaped bar */}
      <div className="flex gap-3 items-center" style={{ padding: 'var(--sp-3) 0', minHeight: 44 }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={`h${c}`} width={c === 0 ? '18%' : c === cols - 1 ? '12%' : '14%'} height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 items-center" style={{ padding: 'var(--sp-3) 0', minHeight: 44 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={c === 0 ? '18%' : c === cols - 1 ? '12%' : '14%'} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}


/**
 * Generic single-card skeleton — drop-in replacement for
 * `<Card>جارٍ التحميل…</Card>` patterns.
 */
export function CardSkeleton({ lines = 3, withTitle = true }: { lines?: number; withTitle?: boolean }) {
  return (
    <div className="card" aria-busy="true" aria-live="polite">
      {withTitle && (
        <div style={{ marginBottom: 'var(--sp-3)' }}>
          <Skeleton width={180} height={16} />
        </div>
      )}
      <div className="flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={12} />
        ))}
      </div>
    </div>
  );
}

/**
 * Full-page skeleton — for routes whose entire payload is one
 * blocking query. Renders a header skeleton + KPI strip + 2 cards.
 * Use when there's nothing meaningful to show until data lands.
 *
 * 16-E8 (15-f FE-11): the `kpis` prop was removed — all 7 call sites
 * render `<PageSkeleton />` bare, so the KPI strip is unconditional.
 */
export function PageSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-live="polite">
      {/* Page header skeleton */}
      <div className="page-header">
        <div className="page-title-block">
          {/* A10 P1-1 (21-b): fixed 260/420px skeleton bars overflow the
              ~280px content box on ≤390px viewports — the first thing a
              phone shows on every cold route-load (AppShell's Suspense
              fallback). min(px, 100%) keeps desktop exact and clamps
              mobile. */}
          <Skeleton width="min(260px, 100%)" height={28} />
          <div style={{ marginTop: 8 }}>
            <Skeleton width="min(420px, 100%)" height={12} />
          </div>
        </div>
        <Skeleton width={120} height={24} rounded="var(--r-full)" />
      </div>

      <KpiSkeleton />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </div>
  );
}

/**
 * Detail-page skeleton (e.g. teacher profile, exam details).
 * Header + meta band + 3 detail cards.
 */
export function DetailSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-live="polite">
      <div className="page-header">
        <div className="page-title-block">
          {/* Same ≤390px overflow guard as PageSkeleton (A10 P1-1): the
              detail header's 300/480px bars clamped to the content box. */}
          <Skeleton width="min(300px, 100%)" height={28} />
          <div style={{ marginTop: 8 }}>
            <Skeleton width="min(480px, 100%)" height={12} />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="flex items-center gap-3" style={{ marginBottom: 'var(--sp-3)' }}>
          <Skeleton width={64} height={64} rounded="50%" />
          <div className="flex-col gap-2" style={{ flex: 1 }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={12} />
          </div>
        </div>
      </div>
      <KpiSkeleton />
      <CardSkeleton lines={3} />
      <CardSkeleton lines={5} />
    </div>
  );
}
