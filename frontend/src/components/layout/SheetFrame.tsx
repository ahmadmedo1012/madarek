/**
 * SheetFrame / SheetGrain — the authenticated app joins the drawing-sheet
 * system (R319 · C2-G2, §C3 of the board: "the shared shell first — it
 * fixes ~80% of screens at once").
 *
 * The landing (landing.css .sheet-frame) and the guest doors (auth.css
 * .auth-frame + GuestSheetChrome) already seat the app's public faces on
 * the Heron sheet: a 1px hairline frame at the 7px viewport inset (the
 * reference's measured frame constant, identical at 1440/768/390), the
 * 10×10 mono corner plus-marks, and the measured paper-grain film
 * (scripts/r314/grain-measure.json — 256px multiply film-grain tile +
 * the 24px dotted micro-grid). This component carries THAT grammar to
 * every AUTHENTICATED route: the whole viewport becomes the sheet.
 *
 * Class names are the gate's contracts (scripts/r319/gate.mjs §E-12):
 * · `.sheet-frame` — material/frame reads position:fixed + 7px insets.
 * · `.sheet-grain` — material/grain matches [class*="grain"].
 *
 * Mount seat: DIRECT children of AppShell's .has-shell (never inside
 * PageTransition — polish.css's page-enter keeps a fill-both transform
 * on .content-inner that would trap fixed descendants; the
 * GuestSheetChrome portal lesson, avoided by construction).
 *
 * Decorative only: aria-hidden + pointer-transparent. No motion — the
 * grain and the frame are static texture (the RM belt has nothing to
 * collapse here). z ladder: grain 0 (under content, over the paper
 * ground) · frame 150 (above the topbar band so the sheet's edge reads
 * at every scroll seat, below popover/drawer/modal/toast — the
 * reference draws its .main-deco frame above all content too).
 */
export function SheetFrame() {
  return (
    <div className="sheet-frame" aria-hidden="true">
      {/* Physical anchors (top/left/right/bottom), not logical — a
          corner is a physical seat; the auth.css .auth-mark note
          documents why logical inline anchors drift under RTL.
          R321 §A6: the spans are EMPTY — the '+' glyph renders from
          CSS ::before (r319-shell.css) so it never leaks into
          innerText (aria-hidden alone does not remove text). */}
      <span className="sheet-mark sheet-mark-tl" />
      <span className="sheet-mark sheet-mark-tr" />
      <span className="sheet-mark sheet-mark-bl" />
      <span className="sheet-mark sheet-mark-br" />
    </div>
  );
}

/**
 * The paper grain — ONE element, raster-cheap: the 256px tile repeats
 * (background-repeat: repeat) with the 24px micro-grid under it, fixed
 * full-viewport, pointer-transparent, under the flowing content. Same
 * data-URIs/tiles as the landing's body.mdrk-grain::before and the
 * auth door's .auth-grain — hoisted here as shared custom properties
 * (r319-shell.css §1) so this cycle adds ONE new copy of the recipe,
 * not a third hand-inlined one (dedupe note in the worklog: landing.css
 * can adopt the vars in a later cycle; it is not this agent's file).
 */
export function SheetGrain() {
  return <div className="sheet-grain" aria-hidden="true" />;
}
