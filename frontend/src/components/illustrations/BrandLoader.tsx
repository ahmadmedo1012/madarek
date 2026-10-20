/**
 * mk-ill <BrandLoader /> — the kit's accessible loading mark.
 *
 * Usage:
 *
 *   import { BrandLoader } from '../../components/illustrations/BrandLoader';
 *
 *   <BrandLoader label="جارٍ التحميل…" />
 *   <BrandLoader label="…نجهّز لوحتك" size={40} />
 *
 * Contract:
 *   - default: `role="status"` + the caller's Arabic `label` as
 *     aria-label — the mark itself is aria-hidden decoration, so
 *     screen readers announce exactly the phrase the surface chose.
 *   - r280 `decorative`: for compositions where an outer surface
 *     already owns the single status announcement (e.g. the shell's
 *     ServerWakePill): the mark renders fully aria-hidden with no
 *     role — the caller's outer live region is the only voice.
 *   - Motion is calm and token-only: the signal arc orbits one
 *     revolution per var(--t-cinema) on var(--ease-linear) (the
 *     sanctioned constant-speed easing), the ink dot breathes on
 *     var(--t-slower)/var(--ease-soft). Under prefers-reduced-motion
 *     both animations stop and the mark rests as its complete static
 *     frame (track + arc + dot) — see styles/illustrations.css.
 *   - Two colours, same family grammar as the pieces: signal via
 *     var(--accent-ink) (luminous on dark), soft track via
 *     var(--accent-soft), ink dot via var(--ill-stroke). No text.
 *   - `size` is the square edge in px (default 32); the mark stays
 *     legible 20–64.
 */
import type { CSSProperties } from 'react';
import '../../styles/illustrations.css';

export interface BrandLoaderProps {
  /** Arabic status text announced to assistive tech (required when
   * not decorative — a role="status" without a name violates the
   * 11-e P2-18 rule the kit enforces everywhere else). */
  label: string;
  /** Square edge in px. Default 32; legible 20–64. */
  size?: number;
  /** r280: fully aria-hidden decoration — the owning surface
   * announces. Never combine with a non-decorative outer silence. */
  decorative?: boolean;
  className?: string;
}

export function BrandLoader({ label, size = 32, decorative = false, className }: BrandLoaderProps) {
  const classes = ['mk-loader', 'illustration'];
  if (className) classes.push(className);
  const style = { '--mk-loader-size': `${size}px` } as CSSProperties;

  const accessibilityProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'status' as const, 'aria-label': label };

  return (
    <span
      className={classes.join(' ')}
      style={style}
      {...accessibilityProps}
    >
      {/* 36×36 grid, 2.5u stroke at the loader's display tier. */}
      <svg // allow-emoji: bespoke loading mark (mk-ill state-graphics kit) — not UI iconography
        viewBox="0 0 36 36"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* quiet track */}
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="var(--accent-soft)"
          strokeWidth="2.5"
        />
        {/* the orbiting signal arc (≈ quarter turn, round caps) */}
        <circle
          className="mk-loader-arc"
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="var(--accent-ink)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="23.5 70.7"
        />
        {/* the breathing ink dot */}
        <circle
          className="mk-loader-dot"
          cx="18"
          cy="18"
          r="3"
          fill="var(--ill-stroke)"
        />
      </svg>
    </span>
  );
}
