import { useId, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '../Icon';

export type ThemeColor = 'green' | 'amber' | 'red' | 'purple' | 'gold' | 'brand';

export { Button, Input } from './Form';
export type { ButtonVariant, ButtonSize } from './Form';

/* ─── Card ──────────────────────────────────────────────── */
export function Card({
  title,
  subtitle,
  icon,
  actions,
  children,
  flush,
  compact,
  bordered,
  className,
  style,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children?: ReactNode;
  flush?: boolean;
  compact?: boolean;
  bordered?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const cls = ['card', flush && 'flush', compact && 'compact', bordered && 'bordered', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} style={style}>
      {(title || actions) && (
        <div className="card-header">
          <div className="card-title-block">
            {title && (
              <div className="card-title">
                {icon && <Icon icon={icon} size={14} className="card-title-icon" />}
                <span>{title}</span>
              </div>
            )}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Metric / KPI ──────────────────────────────────────── */
export function MetricCard({
  label,
  value,
  change,
  changeDirection,
  icon,
  color,
}: {
  label: ReactNode;
  value: ReactNode;
  change?: ReactNode;
  changeDirection?: 'up' | 'dn';
  icon?: LucideIcon;
  color?: ThemeColor;
}) {
  const cls = ['metric', color && color !== 'brand' && color].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="metric-head">
        <span className="metric-label">{label}</span>
        <div className="metric-value">{value}</div>
        {change !== undefined && (
          <div className="metric-change">
            {changeDirection && <span className={changeDirection}>{changeDirection === 'up' ? '↑' : '↓'}</span>}
            <span>{change}</span>
          </div>
        )}
      </div>
      {icon && (
        <div className="metric-icon" aria-hidden>
          <Icon icon={icon} size={22} />
        </div>
      )}
    </div>
  );
}

/* ─── Badge (default: neutral. color = explicit only) ─── */
export function Badge({
  color,
  icon,
  children,
}: {
  color?: ThemeColor;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const cls = ['badge', color].filter(Boolean).join(' ');
  return (
    <span className={cls}>
      {icon && <Icon icon={icon} size={11} strokeWidth={2} />}
      {children}
    </span>
  );
}

/* ─── Progress ──────────────────────────────────────────── */
export function ProgressBar({
  value,
  color,
  label,
  showValue = true,
  ariaLabel,
}: {
  value: number;
  color?: string;
  label?: ReactNode;
  showValue?: boolean;
  /** Accessible name for the progressbar; omitted when not provided. */
  ariaLabel?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="progress">
      {(label !== undefined || showValue) && (
        <div className="progress-head">
          {label !== undefined ? <span>{label}</span> : <span />}
          {showValue && (
            <span className="font-mono text-xs" style={{ color: color ?? 'var(--text-muted)' }}>
              {v}%
            </span>
          )}
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-fill" style={{ width: `${v}%`, ...(color ? { background: color } : {}) }} />
      </div>
    </div>
  );
}

/* ─── Alert row (color = colored dot, body neutral) ──── */
export type AlertColor = 'red' | 'amber' | 'green' | 'purple' | 'brand';

export function AlertRow({
  color = 'brand',
  icon,
  title,
  description,
  time,
  actions,
}: {
  color?: AlertColor;
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  time?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={`alert ${color}`}>
      {/* The coloured dot is the fallback marker; when an icon is present it
          replaces the dot entirely (no hidden placeholder spans). */}
      {!icon && <span className="alert-dot" aria-hidden />}
      {icon && (
        <span style={{ color: `var(--${color === 'brand' ? 'accent' : color === 'red' ? 'danger' : color === 'amber' ? 'warning' : color === 'green' ? 'success' : 'brand-purple'})`, marginTop: 2 }}>
          <Icon icon={icon} size={16} />
        </span>
      )}
      <div className="alert-body">
        {title && <div className="alert-title">{title}</div>}
        {description && <div className="alert-desc">{description}</div>}
        {time && <div className="alert-time">{time}</div>}
      </div>
      {actions}
    </div>
  );
}

/* ─── User avatar ───────────────────────────────────────── */
export function UserAvatar({
  initials,
  color,
  size = 36,
}: {
  initials: string;
  color?: string;
  size?: number;
}) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        ...(color ? { background: color } : {}),
      }}
      aria-label={initials}
    >
      {initials}
    </span>
  );
}

/* ─── Pill ─────────────────────────────────────────────── */
export function Pill({
  on,
  icon,
  children,
  onClick,
}: {
  on?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`pill${on ? ' on' : ''}`} onClick={onClick}>
      {icon && <Icon icon={icon} size={13} />}
      {children}
    </button>
  );
}

/* ─── Section title ─────────────────────────────────────── */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>;
}

/* ─── Tabs (segmented control) ──────────────────────────── */
// ARIA tabs pattern with roving tabindex, arrow/Home/End navigation (RTL
// aware — in RTL, ArrowLeft advances and ArrowRight goes back) and stable
// id/aria-controls wiring via useId. The public API is unchanged.
export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: Array<{ value: T; label: string }>;
}) {
  const uid = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (index: number) => {
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = items.length;
    if (count === 0) return;
    // Resolve the writing direction at event time (cheap, and always
    // reflects the actually-applied direction).
    const dirAttr =
      e.currentTarget.closest('[dir]')?.getAttribute('dir') ??
      document.documentElement.getAttribute('dir') ??
      'ltr';
    const isRtl = dirAttr.toLowerCase() === 'rtl';

    let next: number;
    if (e.key === 'ArrowRight') {
      next = isRtl ? (index - 1 + count) % count : (index + 1) % count;
    } else if (e.key === 'ArrowLeft') {
      next = isRtl ? (index + 1) % count : (index - 1 + count) % count;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = count - 1;
    } else {
      return;
    }
    e.preventDefault();
    const item = items[next];
    if (!item) return;
    onChange(item.value);
    focusTab(next);
  };

  return (
    <div className="tabs" role="tablist">
      {items.map((it, i) => {
        const selected = value === it.value;
        return (
          <button
            key={it.value}
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${uid}-tab-${it.value}`}
            aria-controls={`${uid}-panel-${it.value}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`tab${selected ? ' on' : ''}`}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
