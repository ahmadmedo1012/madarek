/**
 * R315 cycle-3 (foreman) — the footer's drafted-art SVGs, extracted from
 * LandingPage.tsx into the components/landing/ art home (the icon-discipline
 * gate's allowlisted drafted-art class — the same category as the
 * constellation map: illustrative construction drawings, NOT UI iconography;
 * UI icons keep going through <Icon icon={...} /> everywhere).
 *
 * R318 §A6 → R319 §D1: the wordmark is REAL connected letterforms of
 * «مدارك» shaped from the site's own display font (Alexandria 700 —
 * scripts/r318/wordmark-build.mjs → the committed
 * wordmark-art.generated.ts), seated CONNECTED + OUTLINED + FULL-CELL-
 * WIDTH: stroke-only currentColor outlines (~1.7px non-scaling), the
 * R318 construction track REMOVED (letter-spacing broke the joined
 * reading), and the svg spanning the full .fo-wordmark cell at every
 * viewport (width:100% + viewBox scaling). The svg carries its own
 * text alternative — role="img" + aria-label + <title> «مدارك» — and
 * tesseract reads the outlined word at this scale (the §D1 OCR gate).
 */

import { WORDMARK_SHEET } from './footer/wordmark-art.generated';

/** [08] the drawn-mark cell — the reference's line-logo seat:
 * Madarek's own khatam star drafted as a construction drawing
 * (R315 K-F: the floating filled diamond is retired) — hairline
 * construction circles + crosshairs behind (1px screen hairlines,
 * var(--rule)), the two rotated squares stroked in INK var(--text),
 * one small accent square seated on the outer construction circle
 * (the registration beacon, the نقطة seat). Ink-on-paper,
 * token-driven for both themes. */
export function FooterMarkArt() {
  return (
    <svg
      className="fo-footer-mark-svg"
      viewBox="0 0 230 230"
      focusable="false"
      style={{ display: 'block' }}
    >
      {/* hairline construction circles — non-scaling 1px at
          every rendered size (215 @1440, 96 on phones) */}
      <circle cx="115" cy="115" r="112" fill="none" stroke="var(--rule)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx="115" cy="115" r="84" fill="none" stroke="var(--rule)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {/* crosshair rules at the four edges + the four 45°
          diagonal ticks (the rotated square's corner axes) */}
      <g stroke="var(--rule)" strokeWidth="1" vectorEffect="non-scaling-stroke">
        <line x1="115" y1="0" x2="115" y2="16" />
        <line x1="115" y1="214" x2="115" y2="230" />
        <line x1="0" y1="115" x2="16" y2="115" />
        <line x1="214" y1="115" x2="230" y2="115" />
        <line x1="35.8" y1="35.8" x2="55.6" y2="55.6" />
        <line x1="194.2" y1="35.8" x2="174.4" y2="55.6" />
        <line x1="35.8" y1="194.2" x2="55.6" y2="174.4" />
        <line x1="194.2" y1="194.2" x2="174.4" y2="174.4" />
      </g>
      {/* the khatam star — two rotated squares in ink (the
          geometric mark, one clean stroke each, no fill) */}
      <rect x="63" y="63" width="104" height="104" fill="none" stroke="var(--text)" strokeWidth="5" strokeLinejoin="miter" />
      <rect x="63" y="63" width="104" height="104" fill="none" stroke="var(--text)" strokeWidth="5" strokeLinejoin="miter" transform="rotate(45 115 115)" />
      {/* the accent registration square on the NE point of
          the outer construction circle (115+112·cos45,
          115−112·sin45 ≈ 194.2, 35.8) */}
      <rect x="188" y="30" width="12" height="12" fill="var(--accent)" />
    </svg>
  );
}

/** The full-cell-width drawn wordmark «مدارك» — R319 §D1: REAL
 * letterforms shaped from Alexandria 700 (harfbuzz: م initial CONNECTED
 * into د final; ا/ر/ك isolated — NO construction track: the owner read
 * the R318 300u tracked word as letter-spaced disconnected letters) as
 * ONE composed path, drawn STROKE-ONLY (fill:none; stroke:currentColor;
 * ~1.7px non-scaling — landing.css .fo-wordmark-ink): the reference's
 * own drafting technique (heron-footer.json: "STROKE-ONLY … thin
 * uniform outlines, interior empty").
 *
 * R320 §A2 (owner order — supersedes the R319 §D1 OCR tint): the
 * R319 acceptance added a filled TINT TWIN under the outline (50% ink
 * into paper — computed #8F8F8B, exactly the solid grey the owner
 * measured) so tesseract's Arabic model could read the hollow word.
 * The owner's verdict: the wordmark must be a TRUE outline — fill:none
 * · stroke:ink · ≈1.5–2px non-scaling, dark = paper stroke. The
 * reading rides the svg's text alternative (role="img" + aria-label
 * + <title>) as it always did; the OCR-tint acceptance is retired.
 *
 * The svg spans the FULL cell at every viewport (width:100%, the height
 * from the sheet's own aspect — viewBox scaling, never font-size
 * hacks): ink ≈1317×517px of the 1398px cell @1440 (94.2% — the
 * reference's own ink spans 86% of its strip). */
export function WordmarkArt() {
  return (
    <svg
      className="fo-wordmark-svg"
      viewBox={WORDMARK_SHEET.viewBox}
      role="img"
      aria-label="مدارك"
      focusable="false"
    >
      <title>مدارك</title>
      <path className="fo-wordmark-ink" d={WORDMARK_SHEET.d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
