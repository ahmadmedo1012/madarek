/**
 * InkSketch — R308 «الحبر» — the drawing→photo reveal overlay.
 *
 * The reference transitions between its sketch and render images with
 * a scroll-scrubbed SVG mask: a downward-bulging quadratic curve whose
 * baseline sweeps top→bottom, its edge displaced by a turbulence
 * filter (the ink bleed) — reference-observations.md §10 / case-study
 * §5. This is the Madarek translation, composed of original layers:
 *
 *  · Mounted through MediaFrame's `overlay` slot, this covers the
 *    PHOTOGRAPH only — the caption/licence row stays visible at all
 *    times (the attribution is part of the composition, never a
 *    reveal gimmick).
 *  · The layer itself is authored drawing grammar: hairline grid,
 *    registration marks, mono coordinates — the photograph «resolves
 *    out of the drawing» as the mask sweeps.
 *  · The mask path (viewBox 100×100, preserveAspectRatio none):
 *    `M 0 y Q 50 y*1.25 100 y L 100 0 L 0 0 Z` — the sketch is
 *    visible ABOVE the curve; the sweep y: 100 → 0 reveals the photo
 *    top→bottom, tied to scroll position, not time.
 *  · The edge filter reproduces the case study's chain exactly:
 *    feTurbulence (.045/.055, octaves 4, seed 5) → feDisplacementMap
 *    (scale 100) → feGaussianBlur (1.8) → feComponentTransfer (alpha
 *    slope 2.2 / intercept −0.6). Unique IDs per instance.
 *  · Reduced motion + narrow viewports: the photograph stands
 *    complete (the sketch layer is display:none — nothing hides
 *    content, ever).
 */
import { useId, useRef } from 'react';
import { useSheetScroll } from '../../../lib/motion/useSheetScroll';
import { clamp } from '../../../lib/motion/sheetConductor';

export function InkSketch() {
  const layerRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const maskId = `inkm-m-${uid}`;
  const filterId = `inkm-f-${uid}`;

  useSheetScroll(layerRef, ({ rect, vh }) => {
    const path = pathRef.current;
    if (!path) return;
    /* the sweep: fully covered while approaching, resolving as the
     * frame crosses the viewport's reading band. */
    const y = 100 - clamp((vh * 0.92 - rect.top) / (rect.height + vh * 0.45), 0, 1) * 100;
    const d = `M 0 ${y.toFixed(2)} Q 50 ${(y * 1.25).toFixed(2)} 100 ${y.toFixed(2)} L 100 0 L 0 0 Z`;
    if (path.getAttribute('d') !== d) path.setAttribute('d', d);
  });

  return (
    <span ref={layerRef} className="inkm" aria-hidden="true">
      <svg className="inkm-defs" focusable="false">
        <defs>
          <mask id={maskId} maskUnits="objectBoundingBox">
            <path ref={pathRef} d="M 0 100 Q 50 125 100 100 L 100 0 L 0 0 Z" fill="#fff" /* color-gate: allow — SVG mask luminance semantics, not a theme color */ />
          </mask>
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.045 0.055"
              numOctaves={4}
              seed={5}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={100}
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation="1.8" />
            <feComponentTransfer>
              <feFuncA type="linear" slope={2.2} intercept={-0.6} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <span
        className="inkm-sketch"
        style={{
          mask: `url(#${maskId})`,
          WebkitMaskImage: `url(#${maskId})`,
          filter: `url(#${filterId})`,
        }}
      >
        <span className="inkm-sketch-grid" />
        <span className="inkm-sketch-mark inkm-sketch-mark-tl">+</span>
        <span className="inkm-sketch-mark inkm-sketch-mark-tr">+</span>
        <span className="inkm-sketch-mark inkm-sketch-bl">+</span>
        <span className="inkm-sketch-mark inkm-sketch-br">+</span>
        <span className="inkm-sketch-coord fo-mono" dir="ltr">[SHEET · FIELD 06]</span>
      </span>
    </span>
  );
}
