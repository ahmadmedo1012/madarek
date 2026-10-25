/**
 * R315 cycle-3 (foreman) — the footer's drafted-art SVGs, extracted from
 * LandingPage.tsx into the components/landing/ art home (the icon-discipline
 * gate's allowlisted drafted-art class — the same category as the
 * constellation map: illustrative construction drawings, NOT UI iconography;
 * UI icons keep going through <Icon icon={...} /> everywhere).
 *
 * R318 §A6 (C3-FOOT): the wordmark is REBUILT from real connected
 * letterforms of «مدارك» shaped from the site's own display font
 * (Alexandria 700 — scripts/r318/wordmark-build.mjs → the committed
 * wordmark-art.generated.ts). The five hand-drafted disconnected
 * geometric strokes are RETIRED (the gate's OCR read them as garbage:
 * «ee re 6 لل» @1440 · «مداع» @390; the generated letterforms read
 * «مدارك» as ONE WORD at 1440+390, light+dark).
 */

import { WORDMARK_WIDE, WORDMARK_COMPACT } from './footer/wordmark-art.generated';

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

/** The full-width drawn wordmark «مدارك» — R318 §A6: REAL letterforms
 * shaped from Alexandria 700 (harfbuzz: م initial CONNECTED into د
 * final; ا/ر/ك isolated) as ONE composed filled path — Madarek's own
 * name in OUR display font. The sheet keeps the ladder-pinned 1200:92
 * viewBox aspect (docH 12,340/9,959/12,627 EXACT) spanning the wordmark
 * row's full cell; the ink (339.4×101.9px @1440) letterboxes inside
 * with construction margins — 73.6% of the row height, the manifest's
 * own glyph-height ratio measured against the row the wordmark owns in
 * the split 314px band. Construction tracking rides only the three
 * non-joining boundaries (د→ا · ا→ر · ر→ك) — the join never gaps.
 * Filled outlines (fill: currentColor): the reference's stroke-only
 * hollow technique fails the OCR gate at every measured weight
 * (scripts/r318/wordmark-build.mjs header + ocr-matrix.md). */
export function WordmarkArt() {
  return (
    <svg
      className="fo-wordmark-svg"
      viewBox={WORDMARK_WIDE.viewBox}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      <path className="fo-wordmark-ink" d={WORDMARK_WIDE.d} />
    </svg>
  );
}

/** The compact phone wordmark (<768 band) — the same REAL letterforms on
 * the FIXED 640×180 sheet whose aspect the protected docH ladder pins
 * (390 = 11,411 · 360 = 10,735 EXACT); the word letterboxes inside with
 * construction margins (ink 466×140 of 640×180). Same generator, same
 * 300u track, same filled-ink contract as the wide cut. */
export function WordmarkCompactArt() {
  return (
    <svg
      className="fo-wordmark-svg fo-wordmark-svg--compact"
      viewBox={WORDMARK_COMPACT.viewBox}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      <path className="fo-wordmark-ink" d={WORDMARK_COMPACT.d} />
    </svg>
  );
}
