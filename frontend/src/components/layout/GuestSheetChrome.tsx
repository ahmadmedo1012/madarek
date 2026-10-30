import { createPortal } from 'react-dom';

/**
 * GuestSheetChrome — the drawing-sheet frame layer for the chrome-less
 * GUEST surfaces (R315 · K-I, extended c3-W6).
 *
 * /auth + /auth/register landed the K-I grammar in cycle 1: the whole
 * viewport is the sheet — a fixed 1px var(--border-strong) frame at the
 * 7px inset + the 10×10 mono corner plus-marks + the measured
 * paper-grain film. This component carries THAT SAME grammar to the
 * other guest inner sheets (/colleges·/colleges/leaderboard·/colleges/:id
 * · /campus · /capabilities) so every public route composes on the one
 * reference sheet — not just the auth door.
 *
 * Engineering: it RE-USES the auth family's classes (.auth-frame /
 * .auth-mark / .auth-grain in auth.css) — a documented cross-page borrow
 * (auth.css is global precisely so other sheets can borrow its
 * contracts; the borrow list lives in that file's header). One recipe,
 * one cascade, zero duplication; the sheets that mount this component
 * own the z-lift rules that keep their flowing content ABOVE the grain
 * film (z 0) and under the frame (z 50) in their own CSS.
 *
 * TWO mount seats (c3-W6, the containment lesson):
 * · in-page (default) — /campus + /capabilities: the page root paints
 *   its own ground (.cu { background: var(--bg) }), so the film must
 *   stay INSIDE it (a body-level film would paint under that ground
 *   and vanish); there is no transformed ancestor, so fixed works.
 * · portal — the /colleges funnel: its pages ride inside the route
 *   transition stack, where polish.css's page-enter keeps a fill-both
 *   `transform: translateY(0)` on the .content-inner child (a containing
 *   block that TRAPS fixed descendants at the 20px-gutter seat — the
 *   frame measured 27px/scrolling-away) and the reveal sweep's clip-path
 *   boxes them to the transition wrapper. createPortal(document.body)
 *   escapes every ancestor: the frame re-seats at the true 7px viewport
 *   inset; the film rides z -1 under the flowing sheets (auth.css §8 —
 *   the funnel's .page/.pf-page paint no ground of their own, only the
 *   canvas does, so the paper grain stays visible).
 *
 * Decorative only: the layer is aria-hidden + pointer-transparent.
 * No motion — the grain and the frame are static texture (the RM belt
 * has nothing to collapse here).
 */
export function GuestSheetChrome({ portal = false }: { portal?: boolean }) {
  const chrome = (
    <>
      <div className="auth-frame" aria-hidden="true">
        {/* R321 §A6: empty spans — the '+' glyph is CSS ::before content
            (auth.css), so the marks never leak into innerText. */}
        <span className="auth-mark auth-mark-tl" />
        <span className="auth-mark auth-mark-tr" />
        <span className="auth-mark auth-mark-bl" />
        <span className="auth-mark auth-mark-br" />
      </div>
      <div className="auth-grain" aria-hidden="true" />
    </>
  );
  return portal ? createPortal(chrome, document.body) : chrome;
}

/* r324 X10 — the former GuestSheetLabel component (the `[MDRK-…] ·
 * SHEET NN/NN` mono identity line) is RETIRED: coordinates/revision
 * tags are not content. Its last callers (the colleges registry
 * sheets, the auth doors, register) dropped the lines with this
 * round's sweep. */
