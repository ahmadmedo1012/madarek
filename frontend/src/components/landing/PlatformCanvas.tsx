/**
 * PlatformCanvas — R318 §A5 (c3-plat): the platform band's DRAWING
 * SHEET, re-composed onto the reference's measured grammar.
 *
 * The reference's platform section (heron-platform.json) has NO h1:
 * its sheet column carries [01]/[02] mono labels + an h4-scale title
 * (26.67px), and its drawings sit ON PAPER inside hairline frames —
 * never free-floating, never solid slabs. The R315 cycle-4 translation
 * drew the plan on a wide absolute panel under the band's left paper
 * and let the display-scale H1 run under that panel's frame (the §A5
 * overlap). The R318 re-composition folds the drawing INTO the sheet:
 * the section's 12-col hairline grid seats the SHEET (the .pr-head:
 * the [05] mono label + the h4-scale title + the muted sub) at the
 * reading-start edge, and this block is the sheet's DRAWING CELL —
 * the drawing-on-paper that fills the sheet below the text:
 *
 *   · a hairline-framed CELL on the sheet's own paper (the faint
 *     drafting grid + the corner ± registration marks);
 *   · the TOOLBAR strip (the sheet/scale mono label + tick runs);
 *   · the PLAN VIEW (PlatformPlanArt — paper ground, ink walls, the
 *     ONE solid var(--accent) lecture hall) with the ANNOTATION PIN —
 *     the one Arabic note, the honest feature story of the highlighted
 *     room, pointed into the accent room by a leader hairline.
 *
 * Geometry contract (the cycle-3 law still binds): the block is a
 * flow child of .pr-head (its minmax(0,1fr) grid row) — zero effect on
 * any measured band height at ≤991 tiers, where the head itself is
 * display:none and this cell renders NOTHING (the .pr-drawing base
 * rule keeps it out of every smaller composition). Decorative by
 * contract: aria-hidden + pointer-transparent; the honest text (the
 * title, the lede, the captions, the note) stays in the accessible
 * flow outside this block.
 */
import { PlatformPlanArt } from './PlatformPlanArt';

export function PlatformCanvas() {
  return (
    <div className="pr-drawing" aria-hidden="true">
      {/* the four drafting corner ± marks (the drawing cell's
          registration, centered on the cell's own corners) */}
      <span className="pr-panel-mark pr-panel-mark--tl" aria-hidden="true" />
      <span className="pr-panel-mark pr-panel-mark--tr" aria-hidden="true" />
      <span className="pr-panel-mark pr-panel-mark--bl" aria-hidden="true" />
      <span className="pr-panel-mark pr-panel-mark--br" aria-hidden="true" />

      {/* the toolbar strip — the drawing cell's top ruler (r324 X10:
          the `SHEET 05 · SCALE 1:100` tag is retired — revision/scale
          tags are not content; the ruler ticks carry the drawing voice) */}
      <div className="pr-bar">
        <span className="pr-bar-plus" dir="ltr" />
        <span className="pr-bar-ticks" />
        <span className="pr-bar-plus" dir="ltr" />
      </div>

      {/* the plan canvas — the drawing ON the sheet's paper */}
      <div className="pr-planwrap">
        <PlatformPlanArt />
        {/* the annotation pin — the highlighted room's honest note */}
        <div className="pr-pin">
          <span className="pr-pin-title">قاعة المحاضرة التفاعلية</span>
          <span className="pr-pin-line">نقطة فحص تُصحَّح فورًا داخل القاعة</span>
        </div>
      </div>
    </div>
  );
}
