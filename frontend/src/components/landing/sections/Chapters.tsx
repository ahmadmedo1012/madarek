/* P2-0 (r335 split) — [4] الفصول — the pinned map (the reference's 51%
 * walkthrough). r308: chapters 01–04 live in the pinned
 * «رحلة التعلّم» walkthrough. R315 (K-E): the 05–06 demo
 * rows are retired — the reference's map band is the
 * walkthrough alone; the honest ledger lives on
 * /capabilities.
 *
 * The walkthrough's own pin driver lives inside JourneyScene
 * (CSS sticky pin + its own scrub clocks) — this section is a pure
 * mount: header copy + the scene, no composer refs. */
import { RevealCssClass } from '../../../hooks/useReveal';
import { JourneyScene } from '../journey/JourneyScene';

export function Chapters() {
  return (
    <section id="chapters" className="chapters" aria-labelledby="chapters-title">

      {/* r308 — «رحلة التعلّم»: the pinned walkthrough. Chapters
          01–04 play out across one persistent drawing while the
          scroll is the timeline (CSS sticky pin; stacked readable
          sequence ≤991px). R313 (D7): the map owns ≈51% of the
          page — the reference's proportion. R315 (K-D): the
          walkthrough reproduces the reference's map states —
          statement → plan on the paper → INTRODUCTION card →
          findings stations with the progress hairline → the red
          room reveal → the closing column. */}
      {/* T-09c — the head is SEATED INSIDE the track (.jt): heron's head
          column is the track's own top zone (wrap > section[1] > …,
          y = track top), not a sibling above it. */}
      <JourneyScene
        head={
          <header className="chapters-head">
            <div className="chapters-head-copy">
              <span className="fo-label"><span className="fo-mono" dir="ltr">[04]</span> الفصول</span>
              <RevealCssClass as="h2" className="chapters-title" delay={1} id="chapters-title">
                الرحلة — <em>أربعة فصول تتحرك أمامك</em>
              </RevealCssClass>
            </div>
            <RevealCssClass as="p" className="chapters-lede" delay={2}>
              مرّر لترى الرحلة تُبنى: أربعة فصول تتحرك في مشهد واحد. لا لقطات مُجمّلة ولا وعود.
            </RevealCssClass>
          </header>
        }
      />
    </section>
  );
}
