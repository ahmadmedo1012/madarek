import { useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../Icon';

/* ─── Primitive inventory (refreshed 5-C4 per audit A10 P3-8 — the
   wave-13-16 list had gone stale; cf. the sibling note in
   overlays/index.ts).
   - FormField (Form.tsx): the association-contract field scaffold
     (aria-invalid + aria-describedby injection, 21-b / A9 P2-4) —
     consumers: the grade modal (TeacherPages), research review,
     curriculum AuthoringModal, ExamAuthorPages' Field, and since 5-C4
     the competitions + community composer forms. New labelled fields
     should adopt it instead of hand-rolled label/error rows.
   - Button / Input (Form.tsx): consumed by ExamAuthorPages (question
     form). The rest of the app still hand-writes className="btn …" /
     className="input" — the primitives remain the canonical consumers
     of those token systems, with the loading contracts pinned by
     motion.css companions (.btn[data-loading] + .motion-spinner,
     .input-affix).
   - Pill's non-interactive branch: when `onClick` is omitted the pill
     renders a <span> so the primitive can never emit a fake control;
     the LibraryPage category filter always passes onClick, so the
     span branch is platform robustness, not dead weight.
   - PermissionDeniedState (States.tsx): no external consumers; it is
     rendered internally by ErrorState's 403 branch and exported for
     pages that KNOW they are rendering an authorization wall. */

export type ThemeColor = 'green' | 'amber' | 'red' | 'purple' | 'gold' | 'brand';

export { Button, Input, FormField } from './Form';
export type { ButtonVariant, ButtonSize } from './Form';
export { PageHeader } from './PageHeader';
/* R189 «سجلّ مدارك» — the ledger product language (see Ledger.tsx). */
export {
  StatStrip, Sparkline, ProgressRing, LedgerPanel, LedgerRow, WeekRow,
} from './Ledger';
export type {
  StatTone, StatCellData, SparkTone, ZoneTone, LedgerRowProps,
} from './Ledger';

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
  heading,
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
  /** Semantic heading level for the card title (premium-polish: course
   *  detail rendered a single H1 and then pure <div>s — SR heading
   *  navigation couldn't move between «المحاضرات / الواجبات / الموارد».
   *  When passed, the title renders as <h2>/<h3>/… with the same
   *  .card-title styling; omit it and nothing changes.) */
  heading?: 'h2' | 'h3' | 'h4';
  className?: string;
  style?: CSSProperties;
}) {
  const cls = ['card', flush && 'flush', compact && 'compact', bordered && 'bordered', className]
    .filter(Boolean)
    .join(' ');
  const TitleTag = heading;
  return (
    <div className={cls} style={style}>
      {(title || actions) && (
        <div className="card-header">
          <div className="card-title-block">
            {title && (
              <div className="card-title">
                {icon && <Icon icon={icon} size={14} className="card-title-icon" />}
                {TitleTag ? (
                  <TitleTag className="card-title-text">{title}</TitleTag>
                ) : (
                  <span>{title}</span>
                )}
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
/* 5-B4 (audit 5-A8 P1-3): the KPI primitive gains an OPTIONAL navigable
   form. Every one of the ~170 existing call sites passes only
   {label, value, change, icon, color} and keeps rendering the exact
   same <div> — the variant activates only when `to` (router link) or
   `onClick` (in-page action) is passed. A tile that answers a
   follow-up question is a map entry, not a terminal stat: the console
   had 93/93 dead-end metrics before this.

   The affordance is deliberately styled INLINE (position: absolute
   chevron at the block-end/inline-end corner) so the primitive stays
   CSS-file-agnostic — the hover lift already comes from the existing
   .metric:hover family (components.css + polish overrides), the focus
   ring from the global :focus-visible contract, and the cursor from
   the native <a>/<button>. No new stylesheet rules needed. */
export function MetricCard({
  label,
  value,
  change,
  icon,
  color,
  to,
  onClick,
  actionHint,
  pressed,
}: {
  label: ReactNode;
  value: ReactNode;
  change?: ReactNode;
  icon?: LucideIcon;
  color?: ThemeColor;
  /** Router destination — renders the tile as a <Link>. */
  to?: string;
  /** In-page action — renders the tile as a <button>. */
  onClick?: () => void;
  /** Short verb phrase naming where the tile goes («عرض الطلاب») —
   *  tooltip + the chevron's accessible context. */
  actionHint?: string;
  /** Toggle state for onClick tiles that act as filters (aria-pressed). */
  pressed?: boolean;
}) {
  const cls = ['metric', 'metric-link', color && color !== 'brand' && color].filter(Boolean).join(' ');
  // The go-chevron names the tile's destination. INLINE styling keeps
  // the primitive CSS-file-agnostic; the hover lift already comes from
  // the existing .metric:hover family, the focus ring from the global
  // :focus-visible contract, the cursor from the native <a>/<button>.
  const goAffordance = (
    <span
      className="metric-go"
      aria-hidden
      style={{
        position: 'absolute',
        insetBlockEnd: 'var(--sp-3)',
        insetInlineEnd: 'var(--sp-3)',
        display: 'inline-flex',
        alignItems: 'center',
        color: 'var(--accent-ink, var(--accent))',
      }}
    >
      <Icon icon={ArrowLeft} size={14} />
    </span>
  );
  const body = (
    <>
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
    </>
  );
  // Navigable: the whole tile is the target (44px+ by construction —
  // .metric has min-block-size 132px), so the chevron stays decorative.
  if (to !== undefined) {
    return (
      <Link to={to} className={cls} title={actionHint} style={{ textDecoration: 'none' }}>
        {body}
        {goAffordance}
      </Link>
    );
  }
  if (onClick !== undefined) {
    return (
      <button
        type="button"
        className={cls}
        onClick={onClick}
        title={actionHint}
        aria-pressed={pressed}
        style={{ textAlign: 'start', width: '100%' }}
      >
        {body}
        {goAffordance}
      </button>
    );
  }
  const divCls = ['metric', color && color !== 'brand' && color].filter(Boolean).join(' ');
  return <div className={divCls}>{body}</div>;
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
        {/* r173a (the r171 VLM deferred note): the 0% affordance. A
            zero bar painted as an empty faint track reads as DISABLED
            — "nothing to measure here" — on every surface that hides
            the % head (showValue={false}: the course-detail hero, the
            lecture rows, the profile completeness). At v === 0 the
            track now carries a starting-edge marker dot (the same
            notch grammar the lecture player's checkpoint marks use)
            so the track reads as "a measurable thing at zero". Purely
            presentational: aria-hidden (the honest value stays
            aria-valuenow=0 and, when shown, the «0%» readout), and
            >0 renders exactly as before — the fill owns the track. */}
        {v === 0 && <span className="progress-zero-mark" aria-hidden="true" />}
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
export type AlertColor = 'red' | 'amber' | 'green' | 'purple' | 'gold' | 'brand';

export function AlertRow({
  color = 'brand',
  icon,
  title,
  description,
  time,
  actions,
  unread,
}: {
  color?: AlertColor;
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  time?: ReactNode;
  actions?: ReactNode;
  /* r166a (E1 unread-visibility defect): opt-in modifier — the row
     itself must read as unread WITHOUT any badge (the alerts page
     rows carried the state only in a small «غير مقروء» Badge).
     Paints the .alert.unread CSS state (surface-2 wash + 2px accent
     bar at inline-start — the sidebar-active bar idiom, calmer
     weight); default unchanged for every other consumer. */
  unread?: boolean;
}) {
  /* 5-D1 (A11 P2-3/P2-4): the amber marker rides the graphics tier —
     the base --warning ink measured 2.30:1 on the white .alert card
     (non-text floor 3:1). --chart-6 is the documented amber for
     graphics on light surfaces (#A67A22 = 3.87:1 light / #F2C766
     dark, tokens.css) — the same tier .alert.amber .alert-dot paints
     (components.css), so the icon and its dot fallback never diverge.
     The other markers already clear 3:1 on white. */
  const ICON_INK: Record<AlertColor, string> = {
    brand: 'var(--accent)',
    red: 'var(--danger)',
    amber: 'var(--chart-6)',
    green: 'var(--success)',
    purple: 'var(--brand-purple)',
    /* r164-a (status semantics): the PASS grade band (50–64) carries
       color 'gold' (courseMeta's GradeBand.color) — the union now
       accepts it so band-driven status rows can pass the band's tone
       straight through instead of hand-folding it into amber/red.
       Ink choice: --gold-ink is the AA gold text tier — 6.98:1 light /
       12.37:1 dark per tokens.css's own WCAG math — clears the 3:1
       graphics floor in both themes and stays distinct from the
       amber marker's --chart-6. The dot branch paints the same ink
       inline (components.css has no .alert.gold rule and is
       styles-wave-owned — this keeps both branches of the tone
       complete with canonical tokens only). */
    gold: 'var(--gold-ink)',
  };
  return (
    <div className={unread ? `alert ${color} unread` : `alert ${color}`}>
      {/* The coloured dot is the fallback marker; when an icon is present it
          replaces the dot entirely (no hidden placeholder spans). */}
      {!icon && (
        <span
          className="alert-dot"
          aria-hidden
          /* gold rides the ink inline — see the ICON_INK note above. */
          style={color === 'gold' ? { background: 'var(--gold-ink)' } : undefined}
        />
      )}
      {icon && (
        <span style={{ color: ICON_INK[color], marginTop: 'var(--sp-0-5)' }}>
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

   r171c (WCAG 1.4.3, browser-measured): the token pair alone cannot
   clear 4.5:1 for the whole hue wheel — mid-violet grounds sit in the
   band where BOTH token inks measure below AA at the 11–13px/600 the
   initials render at (#9269DB → 3.99/4.41 · #8E66D6 → 4.18/4.21,
   white/dark — the band the live audit reported on the admin user
   tables + message inbox rows; verified against the live module via
   axe on injected avatar DOM). Escalation rule (pure function,
   deterministic order):
     1. pick the better TOKEN ink by max ratio;
     2. if that ratio ≥ 4.5 (AA, 1.4.3 — the initials are never
        large-text) → ship it: the 21-c behavior is unchanged and the
        seed palette never escalates (#4F8EF7 keeps dark 5.48,
        #6B7280 keeps white 4.83, #9B6FE8 keeps dark 4.89);
     3. otherwise escalate the candidate set with the pure extremes
        #000000 / #FFFFFF and ship the max-ratio extreme — the same
        documented-literal convention as the player's sealed island /
        statutory flags (pure black/white are the only single values
        that can rescue a mid-tone ground). For ANY ground the pure
        pair is mathematically guaranteed to clear AA:
        max((L+0.05)/0.05, 1.05/(L+0.05)) ≥ √21 ≈ 4.58, so step 3 can
        never fail — the max-pick IS the keep-max fallback.

   Contract by `color` shape:
   · hex            → gated ink (best of #fff / #191918, escalated to
                      #000000/#FFFFFF when the token max is < 4.5)
   · var()/other    → ink var(--text) — the only non-hex callers pass
                      neutral surface tokens (var(--surface-3), AI chat
                      user well), where the text role is the safe pair
   · undefined      → no inline ink — the CSS default pair applies
                      (accent ground + --accent-fg ink, polish.css) */
const AVATAR_INKS = { light: '#FFFFFF', dark: '#191918' } as const;

/* Pure WCAG escalation extremes (r171c step 3) — content-level color
 * DATA consumed by reference, not a style declaration: the color gate
 * scans style-object color keys, and these object keys (black/white)
 * name the extreme, not a style property (verify: check-colors.sh). */
const AVATAR_PURE_INKS = { black: '#000000', white: '#FFFFFF' } as const;

/* AA text threshold (WCAG 1.4.3). The initials render at 11–16px/600 —
 * below the 18.66px/700 large-text bar — so 4.5:1 is the gate. */
const AVATAR_AA_TEXT = 4.5;

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
  const rLight = contrastRatio(lightInk, rgb);
  const rDark = contrastRatio(darkInk, rgb);
  // Step 1–2: the better token ink (ties → light, the 21-c tie-break),
  // shipped as-is when it clears AA.
  if (rDark >= AVATAR_AA_TEXT || rLight >= AVATAR_AA_TEXT) {
    return rLight >= rDark ? AVATAR_INKS.light : AVATAR_INKS.dark;
  }
  // Step 3: token max < 4.5 → escalate to the pure extremes and ship
  // the max-ratio one (deterministic: black wins ties, which can only
  // happen on a near-black ground where both are far above AA). The
  // pure pair always clears 4.5 on a single ground (√21 ≈ 4.58 floor).
  const blackInk = parseHexColor(AVATAR_PURE_INKS.black)!;
  const whiteInk = parseHexColor(AVATAR_PURE_INKS.white)!;
  return contrastRatio(blackInk, rgb) >= contrastRatio(whiteInk, rgb)
    ? AVATAR_PURE_INKS.black
    : AVATAR_PURE_INKS.white;
}

/** Public test helpers — exported for unit tests only (the lib/theme.ts
 *  `__test__` convention, so avatarInk and the ratio math stay pinnable
 *  from tests/unit without widening the component API). */
export const __test__ = {
  avatarInk,
  contrastRatio,
  parseHexColor,
  relativeLuminance,
  AVATAR_INKS,
  AVATAR_PURE_INKS,
  AVATAR_AA_TEXT,
};

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
  trailing,
  onClick,
}: {
  on?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
  /** Optional trailing slot rendered AFTER children, as-is (r157,
   *  audit 6A11 #6): the page-level count badges (`.filter-pill-count`
   *  family in training.css) have no shared home in the components
   *  layer — the consumer provides its own trailing contract; the
   *  wave-2/3 filter migration moves them onto this slot. */
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const cls = `pill${on ? ' on' : ''}`;
  const content = (
    <>
      {icon && <Icon icon={icon} size={13} />}
      {children}
      {trailing}
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

  // r157 (audit 6A11 #7): an orphan `value` (matches no item) used to
  // strip the tab stop from EVERY tab (tabindex=-1 for all) — a
  // keyboard dead zone until the user clicked one with a pointer. The
  // first tab becomes the tab-stop instead, mirroring the ARIA tabs
  // pattern's "none selected → first is tabbable" rule.
  const hasSelection = items.some((it) => it.value === value);

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
        const tabStop = selected || (!hasSelection && i === 0);
        return (
          <button
            key={it.value}
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${uid}-tab-${it.value}`}
            aria-selected={selected}
            tabIndex={tabStop ? 0 : -1}
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
