/**
 * HeroGrid — R341 H1-a: the per-div drafting-grid hairline layer.
 *
 * Heron draws the hero's drafting grid as ~95 real div hairlines; the
 * R335 census excused the whole family wholesale. This layer retires
 * that excusal: ONE div per spec element, appended AFTER the section's
 * frame seats so no census ordinal shifts. The MEASURED VALUES (seat
 * geometry/opacity/colour, per breakpoint) live as CSS custom
 * properties in hero-mechanics.css (one rule per element — the sheet
 * is the single source of truth for the numbers, keeping the JS chunk
 * lean; the bundle gate is law). This module owns only the STRUCTURE:
 * the class census and the dash direction of the background-image
 * hairlines (our own dash rhythm, never Heron's asset).
 *
 * Decorative chrome: aria-hidden, pointer-events none. The wrapper is
 * visibility:hidden with visible children — a full-bleed wrapper box
 * would collapse the edge-390 gutter census. Wide-band rows (the art
 * panel grid — Heron repacks it below 1440) are hidden by the sheet's
 * :is() list below 1440.
 */
type GridRow = { cls: string; dash?: 'dx' | 'dy' };

/* One row per spec element; values live in hero-mechanics.css. */
const GRID_ROWS: GridRow[] = [
  { cls: 'hro-gl-g00' },
  { cls: 'hro-gl-g01' },
  { cls: 'hro-gl-g02' },
  { cls: 'hro-gl-g03', dash: 'dx' },
  { cls: 'hro-gl-g04', dash: 'dx' },
  { cls: 'hro-gl-g05', dash: 'dx' },
  { cls: 'hro-gl-g06', dash: 'dx' },
  { cls: 'hro-gl-g07', dash: 'dx' },
  { cls: 'hro-gl-g08', dash: 'dx' },
  { cls: 'hro-gl-g09', dash: 'dx' },
  { cls: 'hro-gl-g10' },
  { cls: 'hro-gl-g11', dash: 'dy' },
  { cls: 'hro-gl-g12', dash: 'dy' },
  { cls: 'hro-gl-g13', dash: 'dy' },
  { cls: 'hro-gl-g14', dash: 'dy' },
  { cls: 'hro-gl-g15', dash: 'dy' },
  { cls: 'hro-gl-g16' },
  { cls: 'hro-gl-g17', dash: 'dy' },
  { cls: 'hro-gl-g18', dash: 'dy' },
  { cls: 'hro-gl-g19', dash: 'dy' },
  { cls: 'hro-gl-g20', dash: 'dy' },
  { cls: 'hro-gl-g21', dash: 'dy' },
  { cls: 'hro-gl-g22', dash: 'dy' },
  { cls: 'hro-gl-g23', dash: 'dy' },
  { cls: 'hro-gl-g24', dash: 'dy' },
  { cls: 'hro-gl-g25', dash: 'dx' },
  { cls: 'hro-gl-g26', dash: 'dx' },
  { cls: 'hro-gl-g27', dash: 'dx' },
  { cls: 'hro-gl-g28', dash: 'dx' },
  { cls: 'hro-gl-g29', dash: 'dx' },
  { cls: 'hro-gl-g30', dash: 'dx' },
  { cls: 'hro-gl-g31' },
  { cls: 'hro-gl-g32', dash: 'dy' },
  { cls: 'hro-gl-g33', dash: 'dy' },
  { cls: 'hro-gl-g34', dash: 'dy' },
  { cls: 'hro-gl-g35', dash: 'dy' },
  { cls: 'hro-gl-g36', dash: 'dy' },
  { cls: 'hro-gl-g37' },
  { cls: 'hro-gl-g38', dash: 'dy' },
  { cls: 'hro-gl-g39', dash: 'dy' },
  { cls: 'hro-gl-g40', dash: 'dy' },
  { cls: 'hro-gl-g41', dash: 'dy' },
  { cls: 'hro-gl-g42', dash: 'dy' },
  { cls: 'hro-gl-g43', dash: 'dy' },
  { cls: 'hro-gl-g44', dash: 'dy' },
  { cls: 'hro-gl-g45', dash: 'dy' },
  { cls: 'hro-gl-g46', dash: 'dy' },
  { cls: 'hro-gl-g47', dash: 'dy' },
  { cls: 'hro-gl-g48', dash: 'dy' },
  { cls: 'hro-gl-g49', dash: 'dy' },
  { cls: 'hro-gl-g50', dash: 'dy' },
  { cls: 'hro-gl-g51' },
  { cls: 'hro-gl-g52', dash: 'dy' },
  { cls: 'hro-gl-g53', dash: 'dy' },
  { cls: 'hro-gl-g54', dash: 'dy' },
  { cls: 'hro-gl-g55', dash: 'dy' },
  { cls: 'hro-gl-g56', dash: 'dy' },
  { cls: 'hro-gl-g57', dash: 'dy' },
  { cls: 'hro-gl-g58', dash: 'dy' },
  { cls: 'hro-gl-g59', dash: 'dy' },
  { cls: 'hro-gl-g60', dash: 'dx' },
  { cls: 'hro-gl-g61', dash: 'dx' },
  { cls: 'hro-gl-g62', dash: 'dx' },
  { cls: 'hro-gl-g63', dash: 'dx' },
  { cls: 'hro-gl-g64', dash: 'dx' },
  { cls: 'hro-gl-g65', dash: 'dx' },
  { cls: 'hro-gl-g66', dash: 'dx' },
  { cls: 'hro-gl-g67' },
  { cls: 'hro-gl-g68', dash: 'dy' },
  { cls: 'hro-gl-g69', dash: 'dy' },
  { cls: 'hro-gl-g70', dash: 'dy' },
  { cls: 'hro-gl-g71', dash: 'dy' },
  { cls: 'hro-gl-g72', dash: 'dy' },
  { cls: 'hro-gl-g73' },
  { cls: 'hro-gl-g74', dash: 'dy' },
  { cls: 'hro-gl-g75', dash: 'dy' },
  { cls: 'hro-gl-g76', dash: 'dy' },
  { cls: 'hro-gl-g77', dash: 'dy' },
  { cls: 'hro-gl-g78', dash: 'dy' },
  { cls: 'hro-gl-g79', dash: 'dy' },
  { cls: 'hro-gl-g80', dash: 'dy' },
  { cls: 'hro-gl-g81', dash: 'dy' },
  { cls: 'hro-gl-g82', dash: 'dx' },
  { cls: 'hro-gl-g83', dash: 'dx' },
  { cls: 'hro-gl-g84', dash: 'dx' },
  { cls: 'hro-gl-g85', dash: 'dx' },
  { cls: 'hro-gl-g86', dash: 'dx' },
  { cls: 'hro-gl-g87', dash: 'dx' },
  { cls: 'hro-gl-g88' },
  { cls: 'hro-gl-g89' },
  { cls: 'hro-gl-g90' },
  { cls: 'hro-gl-g91' },
  { cls: 'hro-gl-g92' },
  { cls: 'hro-gl-g93' },
  { cls: 'hro-gl-g94' },];

export function HeroGrid() {
  return (
    <div className="hro-grid" aria-hidden="true">
      {GRID_ROWS.map((r) => (
        <div key={r.cls} className={`hro-gl ${r.cls}`} data-k={r.dash} />
      ))}
    </div>
  );
}