/* P2-0 (r335 split) — [4] الفصول — the pinned map (the reference's 51%
 * walkthrough). r308: chapters 01–04 live in the pinned
 * «رحلة التعلّم» walkthrough. R315 (K-E): the 05–06 demo
 * rows are retired — the reference's map band is the
 * walkthrough alone; the honest ledger lives on
 * /capabilities.
 *
 * R342-04 — the head band is retired: the closing column IS the
 * section's own head (the reference's home-map content column —
 * chip + h2 + copy + the ledger), visible from frame one. The
 * walkthrough's own pin driver lives inside JourneyScene (CSS
 * sticky pin + its own scrub clocks) — this section is a pure
 * mount, no composer refs. */
import { JourneyScene } from '../journey/JourneyScene';

export function Chapters() {
  return (
    <section id="chapters" className="chapters" aria-labelledby="chapters-title">

      {/* r308 — «رحلة التعلّم»: the pinned walkthrough. Chapters
          01–04 play out across one persistent drawing while the
          scroll is the timeline (CSS sticky pin; stacked readable
          sequence ≤991px). The walkthrough reproduces the
          reference's map states — the entry statement over the
          ghost plan → the plan builds → the INTRODUCTION card →
          the findings stations → the room reveals → the closing
          column's ledger. The h2 (id=chapters-title) lives inside
          the closing column. */}
      <JourneyScene />
    </section>
  );
}
