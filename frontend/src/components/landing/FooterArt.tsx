/**
 * R315 cycle-3 (foreman) — the footer's drafted-art SVGs, extracted from
 * LandingPage.tsx into the components/landing/ art home (the icon-discipline
 * gate's allowlisted drafted-art class — the same category as the
 * constellation map: illustrative construction drawings, NOT UI iconography;
 * UI icons keep going through <Icon icon={...} /> everywhere).
 *
 * The markup moved VERBATIM — the rendered DOM is byte-identical to the
 * inline version (same classes/attributes/subtree), so no geometry changes.
 */

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

/** The full-width drawn wordmark «مدارك» — hand-drafted single-stroke
 * letter skeletons (construction documented in LandingPage.tsx's footer
 * seat comments): baseline y=86 · shoulder y=52 · tall tops y=16 ·
 * stroke 6 units · RTL: م [1000..1160] · د [742..930] · ا @645 ·
 * ر [402..560] · ك [48..330] · gaps ≈ 22 units. */
export function WordmarkArt() {
  return (
    <svg
      className="fo-wordmark-svg"
      viewBox="0 4 1200 92"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      <g className="fo-wordmark-ink">
        {/* ك */}
        <path d="M 330 32 L 288 20 L 312 34 L 286 86 L 66 86 L 48 60" />
        {/* ر */}
        <path d="M 560 52 H 512 Q 436 62 402 84" />
        {/* ا */}
        <path d="M 645 16 V 86" />
        {/* د */}
        <path d="M 930 86 L 924 46 H 776 L 742 86 H 786" />
        {/* م */}
        <path d="M 1000 86 H 1137 A 23 23 0 0 0 1160 63 A 23 23 0 0 0 1137 40 A 23 23 0 0 0 1114 63 A 23 23 0 0 0 1137 86" />
      </g>
    </svg>
  );
}

/** The compact phone wordmark — the same letter skeletons at ~1.7× scale
 * and tight construction spacing, natural proportions for the <768px band
 * (the wide cut would letterbox to ~30px of ink on a phone). Coordinate
 * plan: baseline y=142 · shoulder y=76 · tall tops y=18 · stroke 8 units ·
 * RTL: م [527..615] · د [390..505] · ا @365 · ر [229..343] · ك [32..207] ·
 * gaps ≈ 22 units. */
export function WordmarkCompactArt() {
  return (
    <svg
      className="fo-wordmark-svg fo-wordmark-svg--compact"
      viewBox="0 0 640 180"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      <g className="fo-wordmark-ink">
        {/* ك */}
        <path d="M 207 50 L 176 34 L 192 56 L 168 142 L 52 142 L 32 112" />
        {/* ر */}
        <path d="M 343 84 H 300 Q 262 92 229 138" />
        {/* ا */}
        <path d="M 365 18 V 142" />
        {/* د */}
        <path d="M 505 142 L 498 76 H 424 L 390 142 H 434" />
        {/* م */}
        <path d="M 527 142 H 581 A 34 34 0 0 0 615 108 A 34 34 0 0 0 581 74 A 34 34 0 0 0 547 108 A 34 34 0 0 0 581 142" />
      </g>
    </svg>
  );
}
