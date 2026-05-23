import type { CSSProperties, ReactNode } from 'react';

export type ThemeColor =
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'purple'
  | 'teal'
  | 'pink';

export function Card({
  title,
  dotColor,
  children,
  style,
}: {
  title?: ReactNode;
  dotColor?: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="card" style={style}>
      {title !== undefined && (
        <div className="card-title">
          <span className="dot" style={dotColor ? { background: dotColor } : undefined} />
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  change,
  color = 'blue',
}: {
  label: ReactNode;
  value: ReactNode;
  change?: ReactNode;
  color?: ThemeColor;
}) {
  return (
    <div className={`metric-card ${color}`}>
      <div className="metric-lbl">{label}</div>
      <div className={`metric-val ${color}`}>{value}</div>
      {change !== undefined && <div className="metric-chg">{change}</div>}
    </div>
  );
}

export function Badge({
  color = 'blue',
  children,
}: {
  color?: ThemeColor;
  children: ReactNode;
}) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

export function ProgressBar({
  value,
  color = 'var(--accent)',
}: {
  value: number; // 0..100
  color?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="prog-track" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="prog-fill" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export type AlertColor = 'red' | 'amber' | 'blue' | 'green' | 'purple';
export function AlertRow({
  color = 'blue',
  icon,
  title,
  description,
  time,
  children,
}: {
  color?: AlertColor;
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  time?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={`alert-row ${color}`}>
      {icon !== undefined && <div className="alert-icon">{icon}</div>}
      <div style={{ flex: 1 }}>
        {title !== undefined && <div className="alert-title">{title}</div>}
        {description !== undefined && <div className="alert-desc">{description}</div>}
        {time !== undefined && <div className="alert-time">{time}</div>}
        {children}
      </div>
    </div>
  );
}

export function UserAvatar({
  initials,
  color = 'linear-gradient(135deg, var(--accent), var(--purple))',
  size = 34,
}: {
  initials: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      className="user-avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: color }}
      aria-label={initials}
    >
      {initials}
    </div>
  );
}
