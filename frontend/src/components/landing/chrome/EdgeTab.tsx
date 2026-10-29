/**
 * EdgeTab — R314 (V12) — the right-edge vertical chrome tab.
 *
 * An ORIGINAL tab in the reference's measured geometry (vertically
 * centred, paper ground, a 1px hairline on the outer edge, a small
 * orange square with a tiny mark at the top, rotated vertical mono
 * label) — carrying Madarek's OWN honest label «منصّة مستقلّة · مدارك
 * <year>» (the year COMPUTED at render in Arabic-Indic digits — r315
 * C4-D: the ٢٠٢٦ hardcode went stale at the 2027 rollover). NEVER the
 * reference's "Site of the Day"/awwwards badge or any award claim —
 * Madarek claims no awards.
 *
 * R322 (§1 V7 — the owner's overlap rule): the ≥992px tab is a SLIM
 * RAIL inside the frame margin (never a 44px slab over body copy);
 * ≤991px it stays the R318 §A10 gutter marker. The .et-rail span is
 * the visible rail body; the button keeps the ≥44px transparent
 * touch floor around it.
 *
 * Click scrolls to the landing's colophon footer (`.fo-footer` — the
 * identity/legal surface); keyboard-operable as a real <button>; the
 * hover nudge collapses under prefers-reduced-motion. Below the
 * masthead in the stacking order (z 55 vs the header's 60 — the
 * spec's "below header, e.g. 900" mapped onto the repo's actual
 * chrome ladder).
 */
import { useCallback } from 'react';
// R323 (A3 · defect 1): the tab's tiny star is the ONE brand system's
// mark now — <Logo variant="mark" tone="paper"> (paper strokes on the
// orange square, both themes) replaces the bespoke inline 4-pointed
// star. The <title> of the Logo would double the button's accessible
// description — the aria-label carries the name; the svg is aria-hidden
// via its decorative wrapper (the seat stays aria-hidden as before).
import { Logo } from '../../../brand';

/** The colophon footer selector — the tab's scroll target. */
const FOOTER_SELECTOR = '.fo-footer';

/** The tab's year, COMPUTED (never hardcoded — the r315 C4-D rollover
 * fix): Arabic-Indic digits via the codepoint math toWestern() mirrors
 * (٠ = U+0660 = 1632, the run is consecutive) — the tab's vertical mono
 * label keeps the drafting-script numeral family, so today it still
 * renders exactly «مدارك ٢٠٢٦» and rolls to ٢٠٢٧ on its own. */
const yearAr = () =>
  String(new Date().getFullYear()).replace(/[0-9]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 48 + 1632),
  );

export function EdgeTab() {
  const scrollToFooter = useCallback(() => {
    if (typeof document === 'undefined') return;
    const footer = document.querySelector(FOOTER_SELECTOR);
    if (!footer) return; /* no footer on this sheet — a no-op, never an error */
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    footer.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  return (
    <button
      type="button"
      className="et-tab"
      onClick={scrollToFooter}
      aria-label="الانتقال إلى أسفل الصفحة — هوية المنصّة ومعلوماتها"
    >
      {/* R322 (V7): .et-rail — the visible slim-rail body (≥992px:
          the 2.08rem paper rail inside the frame margin; ≤991px:
          display:contents so the R318 §A10 gutter-marker grammar in
          r314-chrome.css anchors .et-mark straight to the button). */}
      <span className="et-rail" aria-hidden="true">
        {/* the small orange square (~14×14) with the brand mark —
            R323 (A3 · defect 1): <Logo variant="mark" tone="paper">
            (paper ink on the accent ground, both themes) replaces the
            bespoke inline 4-pointed star. The seat stays aria-hidden:
            the button's aria-label carries the name. */}
        <span className="et-mark" aria-hidden="true">
          <Logo variant="mark" size={12} tone="paper" className="et-mark-logo" />
        </span>
        {/* the rotated vertical mono label — Madarek's own honest line
            (no award claims): «منصّة مستقلّة · مدارك <computed year>» */}
        <span className="et-label">{`منصّة مستقلّة · مدارك ${yearAr()}`}</span>
      </span>
    </button>
  );
}
