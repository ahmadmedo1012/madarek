import { useId, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '../Icon';

/* ─── Primitive inventory (wave 13-16 — zero-consumer inventory
   documentation per WAVE-13-MAP, in the spirit of audit 11-e P2-1;
   cf. the sibling note overlays/index.ts from wave 12-14).
   Deliberate zero-consumer API surface — documented, not deleted:
   - Button / Input (Form.tsx): no app consumers yet. They are the
     canonical consumers of the .btn / .input token systems and their
     loading contracts are pinned by motion.css companions
     (.btn[data-loading] + .motion-spinner, .input-affix). Pages still
     hand-write className="btn …"; new code should adopt these instead.
   - Pill's non-interactive branch: when `onClick` is omitted the pill
     renders a <span> so the primitive can never emit a fake control;
     today's only consumer (LibraryPage category filter) always passes
     onClick, so the span branch is platform robustness, not dead weight.
   - PermissionDeniedState (States.tsx): no external consumers; it is
     rendered internally by ErrorState's 403 branch and exported for
     pages that KNOW they are rendering an authorization wall. */

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
  icon,
  color,
}: {
  label: ReactNode;
  value: ReactNode;
  change?: ReactNode;
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
  /**
   * Accessible name for the progressbar. Falls back to the visible
   * `label` when it is a plain string; unnamed only when neither is
   * given (pass ariaLabel when `label` is markup or omitted).
   */
  ariaLabel?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const name = ariaLabel ?? (typeof label === 'string' ? label : undefined);
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
        aria-label={name}
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
  // No aria-label: initials are not a name, and an aria-label on a
  // generic <span> is ignored by the accessibility tree anyway. The
  // initials stay as visible text next to the user's name, which is
  // what actually names them in context (audit 11-e P2-4).
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        ...(color ? { background: color } : {}),
      }}
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
  const cls = `pill${on ? ' on' : ''}`;
  const content = (
    <>
      {icon && <Icon icon={icon} size={13} />}
      {children}
    </>
  );
  // Without a handler a <button> would be a fake control, so passive
  // pills render as text; interactive pills expose their toggle state
  // via aria-pressed instead of the visual-only `on` class
  // (audit 11-e P2-4).
  if (!onClick) {
    return <span className={cls}>{content}</span>;
  }
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={on}>
      {content}
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
// ids via useId. No aria-controls is emitted: every consumer today uses
// Tabs as a segmented filter control and renders no role="tabpanel", so
// aria-controls would reference panels that do not exist (audit 11-e
// P2-2). When a panel-ed consumer arrives, grow the API (idPrefix or
// panel registration) and restore the wiring on both sides. The public
// API is otherwise unchanged.
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
