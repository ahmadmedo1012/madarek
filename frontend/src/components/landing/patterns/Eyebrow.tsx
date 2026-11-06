/* T-14 (r339) — Eyebrow: the drafting kicker (canonical chrome
 * .fo-label grammar) — the [nn] index + the Arabic label + the 1px
 * dash. Arabic copy rides `children`; the label never drops below
 * the 13px floor (fs-sm seat). */
import type { ReactNode } from 'react';
import { Numeral } from './Numeral';

export function Eyebrow({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="lp-eyebrow">
      <Numeral n={n} />
      {' '}
      {children}
    </span>
  );
}
