import type { LucideIcon } from 'lucide-react';
import { Inbox, AlertTriangle } from 'lucide-react';
import { Icon } from '../Icon';

export function LoadingState({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden />
      <div className="state-desc" style={{ marginTop: 'var(--sp-2)' }}>{label}</div>
    </div>
  );
}

export function EmptyState({
  icon = Inbox,
  title = 'لا توجد نتائج',
  description,
  action,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state">
      <div className="state-icon"><Icon icon={icon} size={20} /></div>
      <div className="state-title">{title}</div>
      {description && <div className="state-desc">{description}</div>}
      {action && <div style={{ marginTop: 'var(--sp-3)' }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'حدث خطأ غير متوقع' }: { message?: string }) {
  return (
    <div className="state" role="alert">
      <div className="state-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
        <Icon icon={AlertTriangle} size={20} />
      </div>
      <div className="state-title">{message}</div>
      <div className="state-desc">حاول مرة أخرى أو تحقق من اتصالك بالشبكة.</div>
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
