import { useId, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '../Icon';

/* ─── Primitive inventory (wave 13-16 — zero-consumer inventory
   documentation per WAVE-13-MAP, in the spirit of audit 11-e P2-1;
   cf. the sibling note overlays/index.ts from wave 12-14).
   Deliberate zero-consumer API surface — documented, not deleted:
   - Button / Input / FormField (Form.tsx): no app consumers yet. They
     are the canonical consumers of the .btn / .input token systems;
     Button/Input loading contracts are pinned by motion.css
     companions (.btn[data-loading] + .motion-spinner, .input-affix),
     and FormField (21-b, A9 P2-4) carries the aria-invalid /
     aria-describedby association contract the hand-rolled grade-modal
     and curriculum forms were missing. Pages still hand-write
     className="btn …"; new code should adopt these instead.
   - Pill's non-interactive branch: when `onClick` is omitted the pill
     renders a <span> so the primitive can never emit a fake control;
     today's only consumer (LibraryPage category filter) always passes
     onClick, so the span branch is platform robustness, not dead weight.
   - PermissionDeniedState (States.tsx): no external consumers; it is
     rendered internally by ErrorState's 403 branch and exported for
     pages that KNOW they are rendering an authorization wall. */

export type ThemeColor = 'green' | 'amber' | 'red' | 'purple' | 'gold' | 'brand';

export { Button, Input, FormField } from './Form';
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
  /**
   * Bar-fill colour (any CSS color). Decorative — drives the fill
   * only, never the % readout (21-c / A12 P1-3: raw DB course hues
   * painted as 12px text measured 1.88–3.60:1 on white; semantic
   * fills like --warning measured 2.30:1).
   */
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
  // A9 P3-7 (21-b): Math.max/min propagate NaN straight into
  // `width: "NaN%"` and aria-valuenow="NaN" — an undefined/unparsable
  // value renders as an honest zero instead.
  const v = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const name = ariaLabel ?? (typeof label === 'string' ? label : undefined);
  return (
    <div className="progress">
      {(label !== undefined || showValue) && (
        <div className="progress-head">
          {label !== undefined ? <span>{label}</span> : <span />}
          {showValue && (
            /* 21-c (A12 P1-3): the % is 12px text — AA 4.5:1. It consumes
               --text-secondary (8.44:1 light / 9.28:1 dark) instead of the
               raw fill colour; the fill keeps the caller's hue. */
            <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
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
        {/* 23-b (A11 P2-10): the value rides transform: scaleX() — the
            fill paints at full track width and scales from its
            inline-start edge (RTL-aware transform-origin in
            components.css), so value changes animate on the compositor
            instead of relayouting width every frame. */}
        <div
          className="progress-fill"
          style={{ transform: `scaleX(${v / 100})`, ...(color ? { background: color } : {}) }}
        />
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
/* 21-c (A12 P1-2): the initials ink is LUMINANCE-GATED against the
   background. `color` arrives un-gated from the DB (`avatarColor`:
   #4F8EF7, #3DD68C, #9B6FE8, #D4A537, #6B7280 — seed.ts:162-244), and
   the old CSS default painted white on all of them (1.88–3.60:1 at
   11–16px semibold). The gate picks the better of white / near-black
   ink by WCAG contrast — the same idea as lib/theme.ts's
   gateCollegeAccent, self-contained here because theme.ts exports its
   helpers for tests only. Post-gate worst case on the seed palette:
   4.83:1 (#6B7280 keeps white); #3DD68C flips 1.88 → 9.38.

   Contract by `color` shape:
   · hex            → gated ink (best of #fff / #191918)
   · var()/other    → ink var(--text) — the only non-hex callers pass
                      neutral surface tokens (var(--surface-3), AI chat
                      user well), where the text role is the safe pair
   · undefined      → no inline ink — the CSS default pair applies
                      (accent ground + --accent-fg ink, polish.css) */
const AVATAR_INKS = { light: '#FFFFFF', dark: '#191918' } as const;

function parseHexColor(s: string): { r: number; g: number; b: number } | null {
  const m = s.trim().replace(/^#/, '');
  if (m.length !== 3 && m.length !== 6) return null;
  const hex = m.length === 3 ? [...m].map((c) => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const norm = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
}

function contrastRatio(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function avatarInk(color: string | undefined): string | undefined {
  if (!color) return undefined;
  const rgb = parseHexColor(color);
  if (!rgb) return 'var(--text)';
  const lightInk = parseHexColor(AVATAR_INKS.light)!;
  const darkInk = parseHexColor(AVATAR_INKS.dark)!;
  return contrastRatio(lightInk, rgb) >= contrastRatio(darkInk, rgb)
    ? AVATAR_INKS.light
    : AVATAR_INKS.dark;
}

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
  const ink = avatarInk(color);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        ...(color ? { background: color } : {}),
        ...(ink ? { color: ink } : {}),
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
