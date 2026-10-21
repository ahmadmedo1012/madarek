/**
 * r299 (workstream F): one owner-owned StatStrip skeleton.
 *
 * The three chart pages (education / AI / governance) each carried a
 * copy-pasted variant of the same shape-matched placeholder with
 * different cell counts and bar widths. The contract they all serve:
 * the resolved band is the typographic .stat-strip (R190 D4), so the
 * strip's cells are what the skeleton must occupy — never the shared
 * KpiSkeleton's retired .metric icon-tile anatomy (a tile flash followed
 * by a typographic strip is a wrong-anatomy flash + CLS at the handoff;
 * loading-closure §2 pins KpiSkeleton's own anatomy, which stays).
 */
import { Skeleton } from '../primitives/States';

export function StatStripSkeleton({ cells = 4 }: { cells?: number }) {
  return (
    <div className="stat-strip" aria-busy="true">
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} className="stat-cell">
          <Skeleton width={80} height={11} />
          <div style={{ marginBlock: 'var(--sp-1)' }}>
            <Skeleton width={90} height={28} />
          </div>
          <Skeleton width={120} height={11} />
        </div>
      ))}
    </div>
  );
}
