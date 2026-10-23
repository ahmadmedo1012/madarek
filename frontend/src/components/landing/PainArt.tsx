/**
 * PainArt — R313 (WP-A1 · D7 §3) — the four pains' draw-in line art.
 *
 * Four original pictograms in the sheet's own ink classes (bp-ink /
 * bp-hair / bp-dash / bp-signal), pathLength-normalized so the draw-in
 * resolves from the reveal belt (.pm-card.in-view → stroke-dashoffset 0
 * in landing.css; reduced motion collapses to the complete drawing).
 * Decorative: the card's text carries the meaning (aria-hidden).
 */
export function PainArt({ kind }: { kind: '01' | '02' | '03' | '04' }) {
  return (
    <svg
      className="pm-art"
      viewBox="0 0 140 100"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {kind === '01' && (
        <>
          {/* the lecture: a lectern, a speaker, a trail that fades */}
          <rect className="bp-hair pm-draw" pathLength={1} x="14" y="46" width="34" height="30" />
          <line className="bp-hair pm-draw" pathLength={1} x1="31" y1="46" x2="31" y2="34" />
          <circle className="bp-ink pm-draw" pathLength={1} cx="31" cy="28" r="5" />
          <line className="bp-ink pm-draw" pathLength={1} x1="31" y1="33" x2="31" y2="42" />
          <line className="bp-dash pm-draw" pathLength={1} x1="56" y1="60" x2="76" y2="60" />
          <line className="bp-dash pm-draw" pathLength={1} x1="86" y1="60" x2="98" y2="60" />
          <circle className="bp-signal pm-draw" pathLength={1} cx="112" cy="60" r="8" />
          <line className="bp-hair pm-draw" pathLength={1} x1="108" y1="60" x2="116" y2="60" />
          <line className="bp-hair pm-draw" pathLength={1} x1="112" y1="56" x2="112" y2="64" />
        </>
      )}
      {kind === '02' && (
        <>
          {/* late grading: a stack of papers + a clock */}
          <rect className="bp-ink pm-draw" pathLength={1} x="16" y="26" width="42" height="54" />
          <rect className="bp-hair pm-draw" pathLength={1} x="24" y="34" width="42" height="54" />
          <line className="bp-hair pm-draw" pathLength={1} x1="32" y1="46" x2="58" y2="46" />
          <line className="bp-hair pm-draw" pathLength={1} x1="32" y1="56" x2="58" y2="56" />
          <line className="bp-hair pm-draw" pathLength={1} x1="32" y1="66" x2="50" y2="66" />
          <circle className="bp-ink pm-draw" pathLength={1} cx="100" cy="58" r="20" />
          <line className="bp-signal pm-draw" pathLength={1} x1="100" y1="58" x2="100" y2="46" />
          <line className="bp-ink pm-draw" pathLength={1} x1="100" y1="58" x2="110" y2="62" />
        </>
      )}
      {kind === '03' && (
        <>
          {/* the missing mastery map: a concept grid with a gap */}
          {[
            [16, 20], [40, 20], [64, 20],
            [16, 44], [64, 44],
            [16, 68], [40, 68], [64, 68],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} className="bp-hair pm-draw" pathLength={1} x={x} y={y} width="18" height="18" />
          ))}
          {/* the gap cell — dashed, unfilled */}
          <rect className="bp-dash pm-draw" pathLength={1} x="40" y="44" width="18" height="18" />
          {/* the journey path bending around the gap */}
          <path className="bp-signal pm-draw" pathLength={1} d="M 16 29 H 34 Q 40 29 40 38 V 68 H 88" />
          <circle className="bp-signal-fill" cx="92" cy="68" r="3" />
          <circle className="bp-signal-fill" cx="16" cy="29" r="3" />
        </>
      )}
      {kind === '04' && (
        <>
          {/* lost research: the archive drawer + a fading trail */}
          <rect className="bp-ink pm-draw" pathLength={1} x="70" y="30" width="50" height="44" />
          <line className="bp-hair pm-draw" pathLength={1} x1="88" y1="52" x2="102" y2="52" />
          <rect className="bp-hair pm-draw" pathLength={1} x="20" y="22" width="26" height="18" />
          <line className="bp-hair pm-draw" pathLength={1} x1="24" y1="28" x2="42" y2="28" />
          <line className="bp-hair pm-draw" pathLength={1} x1="24" y1="33" x2="42" y2="33" />
          <line className="bp-dash pm-draw" pathLength={1} x1="46" y1="31" x2="60" y2="31" />
          <line className="bp-dash pm-draw" pathLength={1} x1="66" y1="31" x2="72" y2="31" />
          <line className="bp-hair pm-draw" pathLength={1} x1="20" y1="58" x2="46" y2="58" />
          <line className="bp-hair pm-draw" pathLength={1} x1="52" y1="58" x2="58" y2="58" />
          <line className="bp-hair pm-draw" pathLength={1} x1="64" y1="58" x2="66" y2="58" />
        </>
      )}
    </svg>
  );
}
