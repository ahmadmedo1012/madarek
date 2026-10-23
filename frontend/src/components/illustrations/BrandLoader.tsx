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
 *   - r313 Heron-loader grammar (the reference's loading instrument,
 *     reduced to an indeterminate mark): a 1px guide track
 *     (#B3B3AF via --grid-line) carrying TWO 1px signal segments
 *     gliding in opposite directions (the loading-progress
 *     item-top/item-bot pair), with a Geist Mono elapsed counter
 *     (MM:SS, tabular, the reference's #FA3600 counter ink) beneath.
 *     The counter measures REAL elapsed time — the honest
 *     indeterminate counterpart of the reference's asset-gated
 *     percentage; it never fabricates progress. Everything visual is
 *     aria-hidden: the Arabic `label` stays the single announcement.
 *   - Motion is token-only: both segments glide on var(--t-cinema)
 *     over var(--ease-linear) (the sanctioned constant-speed easing),
 *     half a phase apart. Under prefers-reduced-motion the glide
 *     stops and the mark rests as its static frame (track + segments
 *     + the still-honest counter) — see styles/illustrations.css.
 *   - `size` is the nominal scale in px (default 32, legible 20–64);
 *     the band spans size × 3 and the counter rides beneath it.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import '../../styles/illustrations.css';

export interface BrandLoaderProps {
  /** Arabic status text announced to assistive tech (required when
   * not decorative — a role="status" without a name violates the
   * 11-e P2-18 rule the kit enforces everywhere else). */
  label: string;
  /** Nominal scale in px. Default 32; legible 20–64. */
  size?: number;
  /** r280: fully aria-hidden decoration — the owning surface
   * announces. Never combine with a non-decorative outer silence. */
  decorative?: boolean;
  className?: string;
}

/** The honest indeterminate counter: elapsed MM:SS since mount,
 * zero-padded, tabular. A measurement, never a fabricated percent. */
function elapsedLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function BrandLoader({ label, size = 32, decorative = false, className }: BrandLoaderProps) {
  const classes = ['mk-loader', 'illustration'];
  if (className) classes.push(className);
  const style = { '--mk-loader-size': `${size}px` } as CSSProperties;

  // The elapsed counter (r313): ticks once per second while mounted.
  // Content, not decoration-by-motion — it keeps ticking under
  // prefers-reduced-motion (the glide is what freezes, not the truth).
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const t = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(t);
  }, []);

  const accessibilityProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'status' as const, 'aria-label': label };

  return (
    <span
      className={classes.join(' ')}
      style={style}
      {...accessibilityProps}
    >
      {/* The instrument frame — every visual run is decoration; the
          Arabic label (or the owning surface) is the only voice. */}
      <span className="mk-loader-frame" aria-hidden="true">
        {/* The 1px band: guide track + the two gliding signal items
            (viewBox units — the sweep scales with the rendered width).
            allow-emoji: bespoke loading mark (mk-ill state-graphics
            kit) — not UI iconography. */}
        <svg
          viewBox="0 0 96 4"
          width="100%"
          height="4"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* the quiet track — the reference's #B3B3AF guide grey */}
          <rect x="0" y="1.5" width="96" height="1" fill="var(--grid-line)" />
          {/* the leading signal item — glides with the reading flow */}
          <rect className="mk-loader-item mk-loader-item--lead" x="-30" y="1.5" width="30" height="1" fill="var(--accent)" />
          {/* the trailing item — half a phase behind, against the flow
              (the reference's dual-direction marquee pair) */}
          <rect className="mk-loader-item mk-loader-item--trail" x="-10" y="1.5" width="10" height="1" fill="var(--accent)" />
        </svg>
        {/* the mono counter — the reference's instrument voice
            (Geist Mono, tabular, signal ink); LTR digits never
            bidi-flip inside the RTL page. */}
        <span className="mk-loader-count" dir="ltr">{elapsedLabel(elapsed)}</span>
      </span>
    </span>
  );
}
