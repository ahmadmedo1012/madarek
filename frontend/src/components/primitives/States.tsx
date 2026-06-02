import type { LucideIcon } from 'lucide-react';
import { Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import { Icon } from '../Icon';

type LoadingVariant = 'inline' | 'page' | 'card' | 'minimal';

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
  title = 'لا توجد بيانات لعرضها بعد',
  description,
  action,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state state-empty">
      <div className="state-icon"><Icon icon={icon} size={20} /></div>
      <div className="state-title">{title}</div>
      {description && <div className="state-desc">{description}</div>}
      {action && <div style={{ marginTop: 'var(--sp-3)' }}>{action}</div>}
    </div>
  );
}

/**
 * Best-effort extraction of a human-readable detail from an unknown error.
 * Handles axios-style errors (response.data.error.message), plain Error
 * objects, and arbitrary thrown values.
 */
function extractErrorDetail(error: unknown): string | null {
  if (!error) return null;
  const e = error as {
    response?: { data?: { error?: { message?: string } } };
    message?: string;
  };
  const apiMsg = e.response?.data?.error?.message;
  if (typeof apiMsg === 'string' && apiMsg.length > 0 && apiMsg.length < 240) return apiMsg;
  const msg = e.message;
  if (typeof msg === 'string' && msg.length > 0 && msg.length < 240) return msg;
  return null;
}

export function ErrorState({
  message = 'تعذَّر تحميل هذا القسم',
  error,
  onRetry,
}: {
  message?: string;
  error?: unknown;
  onRetry?: () => void;
}) {
  const apiDetail = extractErrorDetail(error);
  const detail = apiDetail ?? 'حاول مرة أخرى، أو تحقّق من اتصالك بالشبكة.';

  return (
    <div className="state state-error" role="alert">
      <div className="state-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
        <Icon icon={AlertTriangle} size={20} />
      </div>
      <div className="state-title">{message}</div>
      <div className="state-desc">{detail}</div>
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
    <div className="grid-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="metric">
          <div style={{ marginBottom: 'var(--sp-3)' }}>
            <Skeleton width={80} height={11} />
          </div>
          <Skeleton width={70} height={26} />
          <div style={{ marginTop: 'var(--sp-2)' }}>
            <Skeleton width={120} height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a vertical list of rows (e.g. courses progress) */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ padding: 'var(--sp-2) 0' }}>
          <Skeleton width={140} height={12} />
          <span style={{ flex: 1 }} />
          <Skeleton width={40} height={12} />
          <Skeleton width="100%" height={4} rounded="var(--r-full)" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton placeholder for a chart container of arbitrary height. */
export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div style={{ height, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8 }}>
      {[60, 80, 50, 95, 70, 45, 85].map((pct, i) => (
        <Skeleton key={i} width={`${pct}%`} height={8} />
      ))}
    </div>
  );
}

/** Skeleton for a table — N rows × M columns. */
export function TableSkeleton({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex-col gap-2" style={{ padding: 'var(--sp-3) 0' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 items-center" style={{ padding: 'var(--sp-2) 0' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={c === 0 ? 140 : c === cols - 1 ? 60 : 80} height={12} />
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
 */
export function PageSkeleton({ kpis = true }: { kpis?: boolean }) {
  return (
    <div className="page" aria-busy="true" aria-live="polite">
      {/* Page header skeleton */}
      <div className="page-header">
        <div className="page-title-block">
          <Skeleton width={260} height={28} />
          <div style={{ marginTop: 8 }}>
            <Skeleton width={420} height={12} />
          </div>
        </div>
        <Skeleton width={120} height={24} rounded="var(--r-full)" />
      </div>

      {kpis && <KpiSkeleton />}
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
          <Skeleton width={300} height={28} />
          <div style={{ marginTop: 8 }}>
            <Skeleton width={480} height={12} />
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

/**
 * Layout descriptor for `RouteSkeleton`. Each entry describes one
 * vertical band of the route's layout. Compose at the route level so
 * each page's `Suspense` fallback mimics that page's actual chrome
 * (spec 011 US2 + research.md R-008).
 */
export type RouteSkeletonBlock =
  | { kind: 'header'; titleWidth?: number | string; subtitleWidth?: number | string; trailingWidth?: number | string }
  | { kind: 'kpis' }
  | { kind: 'list'; rows?: number }
  | { kind: 'chart'; height?: number }
  | { kind: 'table'; rows?: number; cols?: number }
  | { kind: 'card'; lines?: number; withTitle?: boolean }
  | { kind: 'gap'; size?: number };

/**
 * Declarative route-level skeleton. Pass a layout descriptor matching
 * the page's actual chrome and the factory composes the existing
 * skeleton primitives. Reduced-motion + dark/light theming inherit
 * for free from the underlying `Skeleton` token.
 *
 * Example:
 *
 *     <Suspense fallback={<RouteSkeleton blocks={[
 *       { kind: 'header' },
 *       { kind: 'kpis' },
 *       { kind: 'list', rows: 6 },
 *     ]} />}>
 *       <DashboardPage />
 *     </Suspense>
 */
export function RouteSkeleton({ blocks }: { blocks: ReadonlyArray<RouteSkeletonBlock> }) {
  return (
    <div className="page" aria-busy="true" aria-live="polite">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'header':
            return (
              <div key={i} className="page-header">
                <div className="page-title-block">
                  <Skeleton width={block.titleWidth ?? 260} height={28} />
                  <div style={{ marginTop: 8 }}>
                    <Skeleton width={block.subtitleWidth ?? 420} height={12} />
                  </div>
                </div>
                {block.trailingWidth !== undefined && (
                  <Skeleton width={block.trailingWidth} height={24} rounded="var(--r-full)" />
                )}
              </div>
            );
          case 'kpis':
            return <KpiSkeleton key={i} />;
          case 'list':
            return <ListSkeleton key={i} rows={block.rows} />;
          case 'chart':
            return <ChartSkeleton key={i} height={block.height} />;
          case 'table':
            return <TableSkeleton key={i} rows={block.rows} cols={block.cols} />;
          case 'card':
            return <CardSkeleton key={i} lines={block.lines} withTitle={block.withTitle} />;
          case 'gap':
            return <div key={i} style={{ height: block.size ?? 16 }} aria-hidden />;
        }
      })}
    </div>
  );
}
