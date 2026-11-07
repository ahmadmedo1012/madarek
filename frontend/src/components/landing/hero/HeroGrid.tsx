/**
 * HeroGrid — R341 H1-a: the per-div drafting-grid hairline layer.
 *
 * Heron draws the hero's drafting grid as ~95 real div hairlines (4
 * near-parallel line groups inside the art panel + section-level axis
 * and datum marks); the R335 census excused the whole family wholesale
 * ("our elevation draws its grid inside the ink SVG; no per-div
 * counterpart"). This layer retires that excusal: ONE absolutely
 * positioned div per spec element, seats and colours taken from the
 * frozen spec's measured values (docs/redesign/r335/heron-spec/
 * home-hero-wrap.1440/390.json — geometry mirrored into our RTL frame
 * in section-relative coordinates so the conformance mirror check is
 * exact by construction; bg/opacity as measured), in Madarek's own
 * dashed-hairline rendering for the spec's background-image hairlines
 * (our own dash rhythm, never Heron's asset).
 *
 * The layer is decorative chrome: aria-hidden, pointer-events none,
 * appended AFTER the section's frame seats so no existing census
 * ordinal shifts (the conformance walk indexes siblings by position).
 * The wrapper itself is visibility:hidden with visible children — a
 * full-bleed wrapper box would collapse the edge-390 gutter census,
 * which unions every visible descendant rect. Wide-band rows (the art
 * panel grid) render >=1440 only: Heron repacks that grid below this
 * band (still excused there, H1-d sweep); the section marks carry a
 * <=991 seat tuned to the 390 spec. Positions are percentages of the
 * section box so the layer rides the section's own responsive frame.
 */
type GridSeat = { l: number; t: number; w: number; h: number; op: number; bg: string | null; img: boolean; color: string };
type GridRow = { cls: string; '1440'?: GridSeat; '390'?: GridSeat };

/* The measured seats — one row per spec element (H1-a data table).
 * l/t/w/h are percentages of the section box; bg null means the spec
 * hairline is a background-image (we render our own dash); op is the
 * measured element opacity; color is the measured inherited ink. */
const GRID_ROWS: GridRow[] = [
      { cls: 'hro-gl-g00', 1440: { l: 0.903, t: 41.848, w: 99.097, h: 0.104, op: 0.2, bg: "var(--grid-line-paper)", img: false, color: "var(--grid-ink-72)" }, 390: { l: 102.051, t: -0.924, w: 0.0, h: 0.0, op: 1, bg: null, img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g01', 1440: { l: 50.417, t: 5.504, w: 0.069, h: 72.69, op: 0.2, bg: "var(--grid-line-paper)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g02', 1440: { l: 0.972, t: 88.162, w: 41.736, h: 0.104, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--grid-ink-72)" }, 390: { l: 2.564, t: 90.878, w: 95.897, h: 0.115, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g03', 1440: { l: 2.778, t: 21.807, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g04', 1440: { l: 2.778, t: 24.091, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g05', 1440: { l: 2.778, t: 37.072, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g06', 1440: { l: 2.778, t: 40.395, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g07', 1440: { l: 2.778, t: 41.848, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g08', 1440: { l: 2.778, t: 55.556, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g09', 1440: { l: 2.778, t: 63.655, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g10', 1440: { l: 98.056, t: 21.911, w: 0.069, h: 41.848, op: 0.64, bg: "var(--accent)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g11', 1440: { l: 44.167, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g12', 1440: { l: 37.778, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g13', 1440: { l: 36.25, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g14', 1440: { l: 28.264, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g15', 1440: { l: 20.694, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g16', 1440: { l: 20.764, t: 8.307, w: 59.444, h: 0.104, op: 0.64, bg: "var(--accent)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g17', 1440: { l: 80.139, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g18', 1440: { l: 72.431, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g19', 1440: { l: 71.597, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g20', 1440: { l: 66.528, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g21', 1440: { l: 63.542, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g22', 1440: { l: 56.597, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g23', 1440: { l: 55.833, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g24', 1440: { l: 45.0, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g25', 1440: { l: 2.778, t: 21.807, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g26', 1440: { l: 2.778, t: 37.072, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g27', 1440: { l: 2.778, t: 40.395, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g28', 1440: { l: 2.778, t: 41.848, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g29', 1440: { l: 2.778, t: 55.556, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g30', 1440: { l: 2.778, t: 63.655, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g31', 1440: { l: 2.778, t: 21.911, w: 0.069, h: 41.848, op: 0.64, bg: "var(--accent)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g32', 1440: { l: 44.167, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g33', 1440: { l: 37.778, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g34', 1440: { l: 36.25, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g35', 1440: { l: 28.264, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g36', 1440: { l: 20.694, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g37', 1440: { l: 20.764, t: 8.307, w: 59.444, h: 0.104, op: 0.64, bg: "var(--accent)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g38', 1440: { l: 80.139, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g39', 1440: { l: 72.431, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g40', 1440: { l: 71.597, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g41', 1440: { l: 66.528, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g42', 1440: { l: 63.542, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g43', 1440: { l: 56.597, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g44', 1440: { l: 55.833, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g45', 1440: { l: 45.0, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g46', 1440: { l: 37.292, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g47', 1440: { l: 36.25, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g48', 1440: { l: 32.847, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g49', 1440: { l: 28.264, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g50', 1440: { l: 20.694, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g51', 1440: { l: 20.764, t: 75.389, w: 59.444, h: 0.104, op: 0.64, bg: "var(--accent)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g52', 1440: { l: 80.139, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g53', 1440: { l: 79.306, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g54', 1440: { l: 64.583, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g55', 1440: { l: 63.542, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g56', 1440: { l: 56.597, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g57', 1440: { l: 55.833, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g58', 1440: { l: 45.0, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g59', 1440: { l: 44.167, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g60', 1440: { l: 2.778, t: 21.807, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g61', 1440: { l: 2.778, t: 24.091, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g62', 1440: { l: 2.778, t: 37.072, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g63', 1440: { l: 2.778, t: 40.395, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g64', 1440: { l: 2.778, t: 41.848, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g65', 1440: { l: 2.778, t: 55.556, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g66', 1440: { l: 2.778, t: 63.655, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g67', 1440: { l: 98.056, t: 21.911, w: 0.069, h: 41.848, op: 0.64, bg: "var(--accent)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g68', 1440: { l: 37.292, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g69', 1440: { l: 36.25, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g70', 1440: { l: 32.847, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g71', 1440: { l: 28.264, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g72', 1440: { l: 20.694, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g73', 1440: { l: 20.764, t: 75.389, w: 59.444, h: 0.104, op: 0.64, bg: "var(--accent)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g74', 1440: { l: 80.139, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g75', 1440: { l: 79.306, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g76', 1440: { l: 64.583, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g77', 1440: { l: 63.542, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g78', 1440: { l: 56.597, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g79', 1440: { l: 55.833, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g80', 1440: { l: 45.0, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g81', 1440: { l: 44.167, t: 8.307, w: 0.069, h: 67.082, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g82', 1440: { l: 2.778, t: 21.807, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g83', 1440: { l: 2.778, t: 37.072, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g84', 1440: { l: 2.778, t: 40.395, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g85', 1440: { l: 2.778, t: 41.848, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g86', 1440: { l: 2.778, t: 55.556, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g87', 1440: { l: 2.778, t: 63.655, w: 95.347, h: 0.104, op: 0.64, bg: null, img: true, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g88', 1440: { l: 2.778, t: 21.911, w: 0.069, h: 41.848, op: 0.64, bg: "var(--accent)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g89', 1440: { l: 10.764, t: 78.193, w: 0.069, h: 10.073, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--accent)" } },
      { cls: 'hro-gl-g90', 390: { l: 2.564, t: 83.603, w: 95.897, h: 0.115, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--grid-ink)" } },
      { cls: 'hro-gl-g91', 1440: { l: 0.903, t: 78.193, w: 99.097, h: 0.104, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--grid-ink-72)" }, 390: { l: 2.564, t: 53.464, w: 95.897, h: 0.115, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g92', 1440: { l: 0.903, t: 92.004, w: 99.097, h: 0.104, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--grid-ink-72)" }, 390: { l: 2.564, t: 95.497, w: 95.897, h: 0.115, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g93', 390: { l: 2.564, t: 68.014, w: 95.897, h: 0.115, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--grid-ink-72)" } },
      { cls: 'hro-gl-g94', 1440: { l: 42.639, t: 78.193, w: 0.069, h: 13.811, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--grid-ink-72)" }, 390: { l: 98.205, t: 68.129, w: 0.256, h: 27.483, op: 1, bg: "var(--grid-line-rule)", img: false, color: "var(--grid-ink-72)" } },
];

/* Colour channels in the table are token REFERENCES (tokens.css holds
 * the raw measured values — the sanctioned zone; the sheets and this
 * table only ever reference var(--*)). rgb(250,54,0) is --accent
 * (#FA3600) exactly. */

/** One seat → its --gl-* custom properties (consumed by the layer
 * sheet in hero-mechanics.css; suffix '' is the ≥992 seat, '390' the
 * measured ≤991 seat — the ONLY duplication is the two var()
 * fallback chains in the sheet, never the data). */
function seatVars(suffix: '' | '390', s: GridSeat): React.CSSProperties {
  return {
    [`--gl-l${suffix}`]: `${s.l}%`,
    [`--gl-t${suffix}`]: `${s.t}%`,
    [`--gl-w${suffix}`]: `${s.w}%`,
    [`--gl-h${suffix}`]: `${s.h}%`,
    [`--gl-op${suffix}`]: String(s.op),
    [`--gl-bg${suffix}`]: s.bg ?? 'transparent',
    [`--gl-ink${suffix}`]: s.color,
  } as React.CSSProperties;
}

export function HeroGrid() {
  return (
    <div className="hro-grid" aria-hidden="true">
      {GRID_ROWS.map((r) => {
        const a = r['1440'];
        const b = r['390'];
        const real390 = !!(b && b.w > 0 && b.h > 0);
        return (
          <div
            key={r.cls}
            className={`hro-gl ${r.cls}`}
            /* wide-band rows: the art-panel grid renders >=1440 only (a
               390 seat that is zero-size in the spec is a wide row too) */
            data-wide={a && !real390 ? 'w' : undefined}
            /* the spec's background-image hairlines render our own dash
               rhythm — direction derived from the measured box shape */
            data-k={a?.img ? (a.w >= a.h ? 'dx' : 'dy') : undefined}
            style={{ ...(a ? seatVars('', a) : {}), ...(real390 ? seatVars('390', b) : {}) }}
          />
        );
      })}
    </div>
  );
}
