/**
 * mark.ts — the R323 Madarek mark «نقطة تصبح مدارًا» — the single source
 * of the mark's GEOMETRY (the <Logo> component in ./index.ts renders it;
 * scripts/r323/brand-assets.mjs re-states the same numbers for the static
 * twins, and frontend/tests/unit/r323-brand-system.test.ts pins the two
 * together — never edit one without the other).
 *
 * CONSTRUCTION (32-unit grid, viewBox 0 0 32 32):
 *  · the khatam idea kept: TWO squares sharing one centre (16,16), one
 *    rotated 45°;
 *  · the axis square x=8..24 (side 16) — its four corners sit on grid
 *    intersections (8,8) (24,8) (24,24) (8,24);
 *  · the rotated square's vertices sit ON grid intersections too:
 *    (16,5) (27,16) (16,27) (5,16) — the √2 tax snapped (a congruent
 *    rotated square would put its vertices at 16±8√2 ≈ 4.69/27.31, OFF
 *    the grid; the 2.8% side difference is invisible, the grid snap is
 *    permanent — docs/redesign/r323/brand/VARIANTS.md, variant B);
 *  · ONE solid orange square — the point of light — seated ON the north-
 *    east grid intersection (24,8): a 4×4 square at x=22..26, y=6..10,
 *    covering the axis square's NE corner (the «نقطة» the brand copy
 *    begins from — the same NE story the r188 star told, redrawn);
 *  · hairline ink strokes, UNIFORM weight, MITER joins (never round),
 *    radius 0, no fills except the point, no gradients, no shadows.
 *
 * COLOURS (the only three): paper #F6F6EE · ink #282828 · orange #FA3600.
 * In the app the ink rides currentColor and the orange rides var(--accent)
 * (tokens.css re-keys that shared seat per theme: #FA3600 on light, the
 * luminous ember #FF5A1F on dark — the sanctioned dark-theme swap, one
 * var() and the mark themes without props).
 */

/** The mark's own viewBox (the 32-unit grid). */
export const MARK_VIEWBOX = '0 0 32 32';

/** Axis square: x,y = top-left on the grid, size = side (8..24). */
export const MARK_AXIS = { x: 8, y: 8, size: 16 } as const;

/** Rotated square as an explicit path — vertices on the grid axes. */
export const MARK_DIAMOND_PATH = 'M16 5L27 16L16 27L5 16Z';

/** The orange point: 4×4 square centred on the grid intersection (24,8). */
export const MARK_POINT = { x: 22, y: 6, size: 4 } as const;
export const MARK_POINT_CENTRE = { x: 24, y: 8 } as const;

/** The mark's ink bbox inside the 32 viewBox (tips 5..27 all round). */
export const MARK_INK = { x: 5, y: 5, w: 22, h: 22 } as const;

/** The five grid intersections the construction is judged on. */
export const MARK_GRID_POINTS: ReadonlyArray<readonly [number, number]> = [
  [8, 8], [24, 8], [24, 24], [8, 24], /* axis square corners */
  [16, 5], [27, 16], [16, 27], [5, 16], /* rotated square vertices */
  [24, 8], /* the point's seat (NE) */
];

/** Static stroke ratios. The component renders the mark with a
 * non-scaling uniform hairline (vector-effect), the favicon carries a
 * thicker PROPORTIONAL ratio for 16 px legibility — the only sanctioned
 * deviation (BRAND.md §min-sizes). */
export const MARK_STROKE_COMPONENT = 1.5; /* px, non-scaling */
export const MARK_STROKE_FAVICON = 2.25;  /* viewBox units, proportional */

/** The optical-size ramp (R324/X11). A CONSTANT 1.5 px screen stroke
 * below the 32-grid design size reads progressively heavier: 12.5 % of
 * the mark's height at the 12 px EdgeTab seat (2.7× the designed 4.7 %)
 * — the small seats turn the hairline into a blob. The ramp tapers the
 * screen stroke linearly from 1.5 px @32 down to 1.125 px @16 — exactly
 * the favicon's sanctioned 2.25/32 ratio at 16 px — with a 0.9 px floor
 * so the hairline never washes sub-pixel. ≥32 stays the design 1.5 px.
 *   32→1.500 · 26→1.359 · 24→1.313 · 22→1.266 · 16→1.125 · 14→1.078 · 12→1.031 */
export function markStrokePx(size: number): number {
  if (size >= 32) return MARK_STROKE_COMPONENT;
  const tapered = MARK_STROKE_COMPONENT - (0.375 * (32 - size)) / 16;
  return Math.max(0.9, +tapered.toFixed(3));
}
