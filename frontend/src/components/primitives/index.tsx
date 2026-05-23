import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '../Icon';

export type ThemeColor = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'pink';

/* ─── Card ──────────────────────────────────────────────── */
export function Card({
  title,
  subtitle,
  icon,
  actions,
  children,
  flush,
  compact,
  lift,
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
  lift?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const cls = ['card', flush && 'flush', compact && 'compact', lift && 'lift', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} style={style}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && (
              <div className="card-title">
                {icon && (
                  <span className="card-title-icon">
                    <Icon icon={icon} size={16} />
                  </span>
                )}
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

/* ─── Metric / KPI card ─────────────────────────────────── */
export function MetricCard({
  label,
  value,
  change,
  changeDirection,
  icon,
  color = 'blue',
}: {
  label: ReactNode;
  value: ReactNode;
  change?: ReactNode;
  changeDirection?: 'up' | 'dn';
  icon?: LucideIcon;
  color?: ThemeColor;
}) {
  return (
    <div className={`metric ${color}`}>
      <div className="metric-head">
        <span className="metric-label">{label}</span>
        {icon && (
          <span className="metric-icon">
            <Icon icon={icon} size={18} />
          </span>
        )}
      </div>
      <div className="metric-value">{value}</div>
      {change !== undefined && (
        <div className="metric-change">
          {changeDirection && <span className={changeDirection}>{changeDirection === 'up' ? '↑' : '↓'}</span>}
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Badge ─────────────────────────────────────────────── */
export function Badge({
  color = 'blue',
  icon,
  children,
}: {
  color?: ThemeColor | 'muted';
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className={`badge ${color}`}>
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
}: {
  value: number;
  color?: string;
  label?: ReactNode;
  showValue?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value));
  const fillStyle: CSSProperties = { width: `${v}%`, ...(color ? { background: color } : {}) };
  return (
    <div className="progress">
      {(label !== undefined || showValue) && (
        <div className="progress-head">
          {label !== undefined ? <span>{label}</span> : <span />}
          {showValue && <span className="font-mono text-xs" style={{ color: color ?? 'var(--accent)' }}>{v}%</span>}
        </div>
      )}
      <div className="progress-track" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={fillStyle} />
      </div>
    </div>
  );
}

/* ─── Alert row ─────────────────────────────────────────── */
export type AlertColor = 'red' | 'amber' | 'blue' | 'green' | 'purple';

export function AlertRow({
  color = 'blue',
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
      {icon && (
        <span className="alert-icon">
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

/* ─── Pill (filter buttons) ─────────────────────────────── */
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

/* ─── Section title (uppercase divider) ────────────────── */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>;
}
