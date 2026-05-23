import type { LucideIcon } from 'lucide-react';
import { Inbox, AlertTriangle } from 'lucide-react';
import { Icon } from '../Icon';

export function LoadingState({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden />
      <div className="state-desc mt-2">{label}</div>
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
      <div className="state-icon">
        <Icon icon={icon} size={22} />
      </div>
      <div className="state-title">{title}</div>
      {description && <div className="state-desc">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = 'حدث خطأ غير متوقع',
}: {
  message?: string;
}) {
  return (
    <div className="state" role="alert">
      <div className="state-icon" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
        <Icon icon={AlertTriangle} size={22} />
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
      style={{
        display: 'inline-block',
        width: width ?? '100%',
        height,
        borderRadius: rounded,
      }}
      aria-hidden
    />
  );
}
