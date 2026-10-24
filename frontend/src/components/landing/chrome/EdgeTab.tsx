/**
 * EdgeTab — R314 (V12) — the right-edge vertical chrome tab.
 *
 * An ORIGINAL tab in the reference's measured geometry (fixed to the
 * right viewport edge, vertically centred, ~26×140, paper ground, a
 * 1px hairline on the outer edge, a small orange square with a tiny
 * mark at the top, rotated vertical mono label) — carrying Madarek's
 * OWN honest label «منصّة مستقلّة · مدارك ٢٠٢٦». NEVER the reference's
 * "Site of the Day"/awwwards badge or any award claim — Madarek claims
 * no awards.
 *
 * Click scrolls to the landing's colophon footer (`.fo-footer` — the
 * identity/legal surface); keyboard-operable as a real <button>; hidden
 * below 768px (the reference hides its tab on mobile); the hover nudge
 * collapses under prefers-reduced-motion. Below the masthead in the
 * stacking order (z 55 vs the header's 60 — the spec's "below header,
 * e.g. 900" mapped onto the repo's actual chrome ladder).
 */
import { useCallback } from 'react';

/** The colophon footer selector — the tab's scroll target. */
const FOOTER_SELECTOR = '.fo-footer';

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
      {/* the small orange square (~14×14) with a tiny white 4-pointed
          star — Madarek's own mark, drawn bespoke (the StarMark
          primitive strokes itself in --accent, invisible on an accent
          ground, so the tab uses the white-stroke variant) */}
      <span className="et-mark" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          focusable="false"
          style={{ display: 'block' }}
        >
          {/* the 4-pointed star — two long rays + two short, stroked */}
          <path
            d="M12 3 L14.2 9.8 L21 12 L14.2 14.2 L12 21 L9.8 14.2 L3 12 L9.8 9.8 Z"
            stroke="var(--accent-fg)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {/* the rotated vertical mono label — Madarek's own honest line
          (no award claims): «منصّة مستقلّة · مدارك ٢٠٢٦» */}
      <span className="et-label" aria-hidden="true">منصّة مستقلّة · مدارك ٢٠٢٦</span>
    </button>
  );
}
