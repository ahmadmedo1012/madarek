/**
 * HeroChrome — R341 H1-b: the per-node vector-chrome layer (plus-marks,
 * social arrows, marquee icons, pin dots).
 *
 * One seat per frozen-spec chrome element (103 explicit bindings; the
 * wholesale excusal family retired). STRUCTURE lives here (class
 * census, svg kids, the interactive flag — cursor: pointer mirrors
 * Heron's link seats without joining the tab order); the MEASURED
 * VALUES (seat geometry/colour/transition, per breakpoint) live as CSS
 * custom properties in hero-mechanics.css — one rule per element, the
 * sheet as the single source of truth for the numbers (the bundle gate
 * is law; the JS chunk stays lean).
 *
 * Decorative chrome: aria-hidden, pointer-events none, appended AFTER
 * HeroGrid so no census ordinal shifts. The wrapper is
 * visibility:hidden with visible children (the edge-390 gutter census
 * unions every visible descendant rect). Wide-band rows are hidden by
 * the sheet's :is() list below 1440 (Heron repacks them there); every
 * seat with a measured 390 box re-seats onto it under the <=991 belt.
 */
type ChromeKid = { cls: string; act?: boolean } & ({ k: string; d: string } | { cx: number; cy: number; r: number });
type ChromeRow = { cls: string; wide?: boolean; kind: 'div' | 'svg'; vb: [number, number]; act?: boolean; kids?: ChromeKid[] };

/* One row per spec element; values live in hero-mechanics.css. */
const CHROME_ROWS: ChromeRow[] = [
  { cls: 'hro-ch-c00', kind: 'div', vb: [17, 17], act: true },
  { cls: 'hro-ch-c01', kind: 'div', vb: [17, 17], act: true },
  { cls: 'hro-ch-c02', wide: true, kind: 'div', vb: [8, 8] },
  { cls: 'hro-ch-c03', kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c06', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c04', wide: true, kind: 'div', vb: [2, 8] },
  { cls: 'hro-ch-c05', wide: true, kind: 'div', vb: [8, 2] },
  { cls: 'hro-ch-c07', kind: 'div', vb: [10, 10] },
  { cls: 'hro-ch-c08', kind: 'div', vb: [10, 10] },
  { cls: 'hro-ch-c09', kind: 'div', vb: [10, 10] },
  { cls: 'hro-ch-c10', kind: 'div', vb: [10, 10] },
  { cls: 'hro-ch-c11', kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c22', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c12', kind: 'div', vb: [10, 10] },
  { cls: 'hro-ch-c13', kind: 'div', vb: [10, 10] },
  { cls: 'hro-ch-c14', kind: 'div', vb: [10, 10] },
  { cls: 'hro-ch-c15', kind: 'div', vb: [10, 10] },
  { cls: 'hro-ch-c16', kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c30', cx: 6.5, cy: 6.5, r: 1.5 }, { cls: 'hro-ch-c31', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c17', wide: true, kind: 'div', vb: [12, 12] },
  { cls: 'hro-ch-c18', wide: true, kind: 'div', vb: [12, 12] },
  { cls: 'hro-ch-c19', kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c43', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c20', wide: true, kind: 'div', vb: [12, 12] },
  { cls: 'hro-ch-c21', wide: true, kind: 'div', vb: [12, 12] },
  { cls: 'hro-ch-c23', kind: 'svg', vb: [10, 10], kids: [{ cls: 'hro-ch-c45', k: 'v', d: 'M5 0 V10' }, { cls: 'hro-ch-c46', k: 'h', d: 'M0 5 H10' }] },
  { cls: 'hro-ch-c24', kind: 'svg', vb: [10, 10], kids: [{ cls: 'hro-ch-c47', k: 'v', d: 'M5 0 V10' }, { cls: 'hro-ch-c48', k: 'h', d: 'M0 5 H10' }] },
  { cls: 'hro-ch-c25', kind: 'svg', vb: [10, 10], kids: [{ cls: 'hro-ch-c49', k: 'v', d: 'M5 0 V10' }, { cls: 'hro-ch-c50', k: 'h', d: 'M0 5 H10' }] },
  { cls: 'hro-ch-c26', kind: 'svg', vb: [10, 10], kids: [{ cls: 'hro-ch-c51', k: 'v', d: 'M5 0 V10' }, { cls: 'hro-ch-c52', k: 'h', d: 'M0 5 H10' }] },
  { cls: 'hro-ch-c27', kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c53', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c28', kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c55', cx: 6.5, cy: 6.5, r: 1.5 }, { cls: 'hro-ch-c56', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c29', wide: true, kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c60', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', act: true }] },
  { cls: 'hro-ch-c32', wide: true, kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c75', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', act: true }] },
  { cls: 'hro-ch-c33', wide: true, kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c76', cx: 6.5, cy: 6.5, r: 1.5 }, { cls: 'hro-ch-c77', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c34', wide: true, kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c78', k: 'ad', d: 'M3 11 L12 1 M9 1 H12 V4' }] },
  { cls: 'hro-ch-c35', wide: true, kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c81', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c36', wide: true, kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c85', cx: 6.5, cy: 6.5, r: 1.5 }, { cls: 'hro-ch-c86', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c37', wide: true, kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c99', k: 'ad', d: 'M3 11 L12 1 M9 1 H12 V4' }] },
  { cls: 'hro-ch-c38', wide: true, kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c100', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c39', wide: true, kind: 'svg', vb: [13, 13], kids: [{ cls: 'hro-ch-c101', cx: 6.5, cy: 6.5, r: 1.5 }, { cls: 'hro-ch-c102', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4' }] },
  { cls: 'hro-ch-c40', kind: 'div', vb: [17, 17], act: true },
  { cls: 'hro-ch-c41', kind: 'div', vb: [17, 17], act: true },
  { cls: 'hro-ch-c42', wide: true, kind: 'div', vb: [5, 5] },
  { cls: 'hro-ch-c44', wide: true, kind: 'div', vb: [5, 5] },
  { cls: 'hro-ch-c54', kind: 'svg', vb: [17, 17], act: true },
  { cls: 'hro-ch-c57', kind: 'svg', vb: [17, 17], act: true },
  { cls: 'hro-ch-c58', kind: 'div', vb: [17, 17], act: true },
  { cls: 'hro-ch-c59', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c61', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c62', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c63', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c64', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c65', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c66', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c67', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c68', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c69', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c70', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c71', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c72', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c73', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c74', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c79', kind: 'div', vb: [17, 17], act: true },
  { cls: 'hro-ch-c80', kind: 'div', vb: [17, 17], act: true },
  { cls: 'hro-ch-c82', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c83', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c84', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c87', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c88', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c89', kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c90', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c91', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c92', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c93', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c94', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c95', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c96', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c97', wide: true, kind: 'div', vb: [13, 13] },
  { cls: 'hro-ch-c98', wide: true, kind: 'div', vb: [13, 13] },];

export function HeroChrome() {
  return (
    <div className="hro-chrome" aria-hidden="true">
      {CHROME_ROWS.map((r) =>
        r.kind === 'svg' ? (
          <svg key={r.cls} className={`hro-ch ${r.cls}`} data-wide={r.wide ? 'w' : undefined} viewBox={`0 0 ${r.vb[0]} ${r.vb[1]}`} preserveAspectRatio="none" data-act={r.act ? 'a' : undefined}>
            {(r.kids ?? []).map((k) =>
              'd' in k ? (
                <path key={k.cls} className={`hro-ch ${k.cls}`} data-k={k.k} data-act={k.act ? 'a' : undefined} d={k.d} />
              ) : (
                <circle key={k.cls} className={`hro-ch ${k.cls}`} data-act={k.act ? 'a' : undefined} cx={k.cx} cy={k.cy} r={k.r} />
              ),
            )}
          </svg>
        ) : (
          <div key={r.cls} className={`hro-ch ${r.cls}`} data-wide={r.wide ? 'w' : undefined} data-act={r.act ? 'a' : undefined} />
        ),
      )}
    </div>
  );
}