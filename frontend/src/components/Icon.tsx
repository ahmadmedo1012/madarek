import type { LucideIcon, LucideProps } from 'lucide-react';

interface IconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon;
  size?: number;
}

/**
 * Standard icon wrapper. Use this everywhere instead of raw Lucide
 * components so we keep stroke width and sizing consistent.
 *
 * Accessibility default (audit 15-g P1-2): icons are DECORATIVE. The
 * wrapper renders `aria-hidden="true"` unless the call site opts out
 * by passing its own `aria-hidden={false}` — plus the accessible name
 * that makes the glyph informative (`aria-label` / `title`) — the same
 * contract `Illustration` encodes with its `decorative` union. Lucide
 * itself ships neither aria-hidden nor a role (verified against
 * lucide-react 0.469.0), so without this default every icon surfaced
 * as a roleless <svg> in the accessibility tree (SR noise in some
 * NVDA/JAWS configs, doubled names in others).
 *
 * Opting out is deliberately rare: no icon-only control relies on the
 * glyph for its name — every one carries its own aria-label/title
 * (repo-swept in 15-g and re-verified for this change), so hiding the
 * svg never unnames a button. A labelled control's name lives on the
 * control, and text next to an icon is unaffected.
 */
export function Icon({ icon: Cmp, size = 16, strokeWidth = 1.8, ...props }: IconProps) {
  return <Cmp size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />;
}
