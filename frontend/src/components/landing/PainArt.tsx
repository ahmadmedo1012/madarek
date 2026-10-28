/**
 * PainArt — R313 (WP-A1 · D7 §3) → R322 (2-d · the Heron problem
 * transplant): the four pains' line art, re-composed to the measured
 * SQUARE seat.
 *
 * The reference seats each problem drawing as a centered 20×20rem
 * inline SVG in the column's 36rem art zone (viewBox ~200×200 —
 * statement.md's media inventory). The old 140×100 wide pictograms
 * could not fill that square; these keep the same four original
 * motifs — the lecture that leaves no measured trace, the late
 * grading stack + clock, the mastery grid with its gap, the archived
 * research trail — re-drawn tall-format in the sheet's own ink classes
 * (bp-ink / bp-hair / bp-dash / bp-signal). The reveal is the
 * reference's own scale+fade family (landing.css .pm-artzone); the
 * pathLength attrs keep the draw-in semantics for any future
 * instrument. Decorative: the column's text carries the meaning
 * (aria-hidden).
 */
export function PainArt({ kind }: { kind: '01' | '02' | '03' | '04' }) {
  return (
    <svg
      className="pm-art"
      viewBox="0 0 200 200"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {kind === '01' && (
        <>
          {/* the lecture: a speaker over a lectern, the impact trail
              fading downward to an empty signal ring — no measured
              trace reaches it */}
          <circle className="bp-ink pm-draw" pathLength={1} cx="100" cy="34" r="11" />
          <line className="bp-ink pm-draw" pathLength={1} x1="100" y1="45" x2="100" y2="66" />
          <line className="bp-hair pm-draw" pathLength={1} x1="88" y1="52" x2="76" y2="60" />
          <line className="bp-hair pm-draw" pathLength={1} x1="112" y1="52" x2="124" y2="60" />
          {/* the lectern — the tall desk mass */}
          <rect className="bp-ink pm-draw" pathLength={1} x="72" y="66" width="56" height="18" />
          <line className="bp-hair pm-draw" pathLength={1} x1="82" y1="84" x2="74" y2="142" />
          <line className="bp-hair pm-draw" pathLength={1} x1="118" y1="84" x2="126" y2="142" />
          <rect className="bp-hair pm-draw" pathLength={1} x="70" y="142" width="60" height="10" />
          {/* the audience rows under the lectern */}
          <line className="bp-hair pm-draw" pathLength={1} x1="52" y1="164" x2="148" y2="164" />
          <line className="bp-hair pm-draw" pathLength={1} x1="60" y1="180" x2="140" y2="180" />
          {/* the fading trail — the lecture's lost trace */}
          <line className="bp-dash pm-draw" pathLength={1} x1="100" y1="152" x2="100" y2="168" />
          {/* the empty signal ring — no pulse inside */}
          <circle className="bp-signal pm-draw" pathLength={1} cx="100" cy="184" r="10" />
        </>
      )}
      {kind === '02' && (
        <>
          {/* late grading: the paper stack + the running clock */}
          <circle className="bp-ink pm-draw" pathLength={1} cx="140" cy="58" r="38" />
          <circle className="bp-hair pm-draw" pathLength={1} cx="140" cy="58" r="30" />
          <line className="bp-signal pm-draw" pathLength={1} x1="140" y1="58" x2="140" y2="34" />
          <line className="bp-ink pm-draw" pathLength={1} x1="140" y1="58" x2="160" y2="68" />
          {/* the stack — three offset sheets, the correction line
              rows on the top sheet */}
          <rect className="bp-ink pm-draw" pathLength={1} x="34" y="96" width="86" height="80" />
          <rect className="bp-hair pm-draw" pathLength={1} x="44" y="86" width="86" height="80" />
          <rect className="bp-hair pm-draw" pathLength={1} x="54" y="76" width="86" height="80" />
          <line className="bp-hair pm-draw" pathLength={1} x1="66" y1="92" x2="128" y2="92" />
          <line className="bp-hair pm-draw" pathLength={1} x1="66" y1="106" x2="128" y2="106" />
          <line className="bp-hair pm-draw" pathLength={1} x1="66" y1="120" x2="112" y2="120" />
          {/* the tally marks on the bottom sheet — corrections counted,
              weeks late */}
          <line className="bp-hair pm-draw" pathLength={1} x1="46" y1="150" x2="46" y2="166" />
          <line className="bp-hair pm-draw" pathLength={1} x1="54" y1="150" x2="54" y2="166" />
          <line className="bp-hair pm-draw" pathLength={1} x1="62" y1="150" x2="62" y2="166" />
          <line className="bp-signal pm-draw" pathLength={1} x1="40" y1="158" x2="70" y2="158" />
        </>
      )}
      {kind === '03' && (
        <>
          {/* the missing mastery map: the concept grid with its one
              dashed gap cell, the path bending around it */}
          {[
            [44, 40], [92, 40], [140, 40],
            [44, 88], [140, 88],
            [44, 136], [92, 136], [140, 136],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} className="bp-hair pm-draw" pathLength={1} x={x} y={y} width="36" height="36" />
          ))}
          {/* the gap cell — dashed, unfilled (the missing concept) */}
          <rect className="bp-dash pm-draw" pathLength={1} x="92" y="88" width="36" height="36" />
          {/* the journey path bending around the gap — from the
              checked start to the unresolved end */}
          <path className="bp-signal pm-draw" pathLength={1} d="M 62 58 H 76 Q 92 58 92 76 V 96 Q 92 106 102 106 H 150" />
          <circle className="bp-signal-fill" cx="62" cy="58" r="5" />
          <circle className="bp-signal-fill" cx="158" cy="106" r="5" />
          {/* the axis ticks — the map's measure frame */}
          <line className="bp-hair pm-draw" pathLength={1} x1="44" y1="30" x2="176" y2="30" />
          <line className="bp-hair pm-draw" pathLength={1} x1="44" y1="30" x2="44" y2="182" />
        </>
      )}
      {kind === '04' && (
        <>
          {/* lost research: the archive drawer + the fading trail from
              the submitted page */}
          {/* the archive — the tall drawer stack, one drawer open */}
          <rect className="bp-ink pm-draw" pathLength={1} x="96" y="40" width="84" height="128" />
          <line className="bp-hair pm-draw" pathLength={1} x1="96" y1="72" x2="180" y2="72" />
          <line className="bp-hair pm-draw" pathLength={1} x1="96" y1="104" x2="180" y2="104" />
          <line className="bp-hair pm-draw" pathLength={1} x1="96" y1="136" x2="180" y2="136" />
          {/* the open drawer — pulled out with its one filed sheet */}
          <rect className="bp-hair pm-draw" pathLength={1} x="108" y="108" width="60" height="18" />
          <line className="bp-hair pm-draw" pathLength={1} x1="122" y1="112" x2="154" y2="112" />
          {/* the submitted page — top left, drifting toward the
              archive */}
          <rect className="bp-hair pm-draw" pathLength={1} x="30" y="44" width="44" height="56" />
          <line className="bp-hair pm-draw" pathLength={1} x1="38" y1="56" x2="66" y2="56" />
          <line className="bp-hair pm-draw" pathLength={1} x1="38" y1="68" x2="66" y2="68" />
          <line className="bp-hair pm-draw" pathLength={1} x1="38" y1="80" x2="58" y2="80" />
          {/* the fading trail — the path the research never completes */}
          <line className="bp-dash pm-draw" pathLength={1} x1="74" y1="72" x2="94" y2="72" />
          <line className="bp-dash pm-draw" pathLength={1} x1="62" y1="130" x2="90" y2="130" />
          <line className="bp-dash pm-draw" pathLength={1} x1="46" y1="164" x2="92" y2="164" />
          <circle className="bp-signal-fill" cx="52" cy="72" r="4" />
        </>
      )}
    </svg>
  );
}
