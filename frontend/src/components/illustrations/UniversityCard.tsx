/**
 * UniversityCard — R343 C-1 · the typographic/architectural university
 * card, rendered as an inline SVG from the ONE shared geometry source
 * (`@shared/media/university-cards.ts` — never forked; the mobile port
 * and the static-file builder consume the same draw lists).
 *
 * The retired Wikimedia photo seats (29 webp, sepia) become original
 * line-art elevations: arcade · courtyard · tower · hall — no photos,
 * no crests, no traced buildings. Paper/ink/accent ride CSS variables
 * (the card inherits `color` from its seat — light AND dark flip for
 * free); strokes stay hairline-uniform under the anisotropic card ratio
 * via vector-effect; text is real text (RTL shaping intact, accessible
 * to copy/search), never outlined.
 */
import { cardById, drawComposition } from '@shared/media/university-cards';

interface UniversityCardProps {
  /** the documented registry id (manifest.json photos[].id lineage) */
  id: string;
  /** accessible Arabic description override (defaults to the spec's name+sub) */
  alt?: string;
  className?: string;
  /** uniform-ratio override for strip seats (the crawl renders every card
   *  at the cell's own ratio so the band stays even; the gallery seats
   *  keep each card's documented ratio) */
  ratioOverride?: number;
  /** short display name for small strip seats (the crawl documents the
   *  university, not the full institutional form) */
  shortName?: string;
}

export function UniversityCard({ id, alt, className, ratioOverride, shortName }: UniversityCardProps) {
  const spec = cardById(id);
  if (!spec) return null;
  const W = 1000;
  const ratio = ratioOverride ?? spec.ratio;
  const H = Math.round(W / ratio);
  const draw = drawComposition(spec.composition, ratio);
  const sx = (x: number) => (x / 100) * W;
  const sy = (y: number) => (y / 100) * H;
  const mono = Math.max(11, H * 0.036);
  /* R343 C-1 fix: the name NEVER overflows the plate — a conservative
   * per-character budget (1.3em) holds even on wide fallback fonts (the
   * CI runners' Arabic stack measured ~1.25em/char and hClipped). */
  const nameUnits = Math.max(spec.nameAr.length, 4);
  const nameFs = Math.min(H * 0.125, W * 0.105, (W * 0.86) / (nameUnits * 1.3));
  const subFs = nameFs * 0.44;
  const cityFs = mono;
  const topY = H * 0.075 + mono;
  const nameY = topY + nameFs * 1.25;
  const subY = nameY + subFs * 1.6;
  const baseY = H * 0.965;
  return (
    <svg
      className={['ucard', className].filter(Boolean).join(' ')}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={alt ?? `${spec.nameAr} — ${spec.subAr} — بطاقة تخطيطية`}
      data-spec={`ucard.${spec.id}`}
    >
      {/* the frame: hairline border, radius 0 — the plate */}
      <rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1={sx(6)} y1={baseY} x2={sx(94)} y2={baseY} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {/* the top row: [nn] + the Latin mono label */}
      <text x={sx(6)} y={topY} fontSize={mono} fill="currentColor" opacity={0.72} direction="ltr" style={{ fontFamily: 'var(--font-mono), monospace', letterSpacing: '0.08em' }}>
        [{spec.nn}]
      </text>
      <text x={sx(94)} y={topY} fontSize={mono} fill="currentColor" opacity={0.72} textAnchor="end" direction="ltr" style={{ fontFamily: 'var(--font-mono), monospace', letterSpacing: '0.14em' }}>
        {spec.nameEn}
      </text>
      {/* the Arabic display name + sub-line */}
      <text x={sx(94)} y={nameY} fontSize={nameFs} fill="currentColor" textAnchor="end" style={{ fontFamily: 'var(--font-display), var(--font-sans), sans-serif', fontWeight: 600 }}>
        {shortName ?? spec.nameAr}
      </text>
      <text x={sx(94)} y={subY} fontSize={subFs} fill="currentColor" opacity={0.72} textAnchor="end" style={{ fontFamily: 'var(--font-sans), sans-serif' }}>
        {spec.subAr}
      </text>
      {/* the elevation composition */}
      <g stroke="currentColor" fill="none" strokeWidth={1} strokeLinecap="square">
        {draw.strokes.map((s, i) => (
          <line key={`s${i}`} x1={sx(s[0])} y1={sy(s[1])} x2={sx(s[2])} y2={sy(s[3])} vectorEffect="non-scaling-stroke" />
        ))}
        {draw.arcs.map((a, i) => (
          <path
            key={`a${i}`}
            d={`M ${sx(a[0]).toFixed(1)} ${sy(a[1]).toFixed(1)} A ${((a[2] / 100) * W).toFixed(1)} ${((a[3] / 100) * H).toFixed(1)} ${a[4]} ${a[5]} ${a[6]} ${sx(a[7]).toFixed(1)} ${sy(a[8]).toFixed(1)}`}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      {/* the one accent element */}
      <rect x={sx(draw.accent[0])} y={sy(draw.accent[1])} width={sx(draw.accent[2]) - sx(0)} height={sy(draw.accent[3]) - sy(0)} fill="var(--accent, #FA3600)" />
      {/* the city, on the base rule */}
      <text x={sx(6)} y={baseY - cityFs * 0.6} fontSize={cityFs} fill="currentColor" opacity={0.72} style={{ fontFamily: 'var(--font-sans), sans-serif' }}>
        {spec.cityAr}
      </text>
    </svg>
  );
}
