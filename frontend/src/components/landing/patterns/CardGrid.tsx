/* T-14 (r339) — CardGrid: the 2-lane card cadence (canonical roles
 * grammar) — 1 column under 768. Children are the cards. */
import type { ReactNode } from 'react';

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="lp-grid">{children}</div>;
}
