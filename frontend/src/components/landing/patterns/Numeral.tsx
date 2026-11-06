/* T-14 (r339) — Numeral: the mono bracketed index `[nn]` (canonical
 * chrome .fo-mono grammar). Latin/technical — dir=ltr, tabular. */
import type { ReactNode } from 'react';

export function num(n: number): string {
  return `[${String(n).padStart(2, '0')}]`;
}

export function Numeral({ n, children }: { n?: number; children?: ReactNode }) {
  return (
    <span className="lp-numeral" dir="ltr">
      {n === undefined ? children : num(n)}
    </span>
  );
}
