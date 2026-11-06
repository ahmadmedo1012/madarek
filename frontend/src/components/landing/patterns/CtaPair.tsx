/* T-14 (r339) — CtaPair: primary + secondary (canonical cta
 * .fo-cta-actions grammar). The pair rides the GLOBAL btn system —
 * callers pass the actual <Link>/<a> elements (btn accent lg +
 * btn ghost lg); this owns only the seat + gap ladder. */
import type { ReactNode } from 'react';

export function CtaPair({ children }: { children: ReactNode }) {
  return <div className="lp-cta-pair">{children}</div>;
}
