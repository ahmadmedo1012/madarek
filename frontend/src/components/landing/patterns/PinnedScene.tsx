/* T-14 (r339) — PinnedScene: the full-height sticky stage (canonical
 * journey .jt-pin grammar) — the scroll is the timeline. */
import type { ReactNode } from 'react';

export function PinnedScene({ children }: { children: ReactNode }) {
  return <div className="lp-pin">{children}</div>;
}
