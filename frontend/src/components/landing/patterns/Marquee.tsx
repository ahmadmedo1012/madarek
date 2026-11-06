/* T-14 (r339) — Marquee: the edge-fed crawl (canonical hero
 * .fo-ticker grammar — fo-ticker-rtl keyframes, 36s linear, RM off).
 * The track repeats its children; callers keep the duplicated
 * content themselves (a11y: aria-hidden on the duplicate pass). */
import type { ReactNode } from 'react';

export function Marquee({ children }: { children: ReactNode }) {
  return (
    <div className="lp-marquee">
      <div className="lp-marquee-track">{children}</div>
    </div>
  );
}
