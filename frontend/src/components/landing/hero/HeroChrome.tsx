/**
 * HeroChrome — R341 H1-b: the per-node vector-chrome layer.
 *
 * Heron draws the hero's decorative chrome as ~103 real nodes in four
 * families — corner plus-marks (div wrappers + svg + the two stroke
 * paths, layered sets), marquee icons (13px svg + wrapper divs on the
 * work strip's marquee row, running off-stage), social arrows (the 17px
 * accent seats inside the wrap's links) and pin dots (tiny circle/
 * square seats + the 12px pulse squares). The R335 census excused the
 * family wholesale ("our counterparts are CSS line-art seats"); this
 * layer retires that excusal the H1-a way: ONE seat per spec element —
 * divs for heron divs, one svg per heron svg with real path/circle
 * children for heron's paths/circles — seats and colours from the
 * frozen spec's measured values (home-hero-wrap.1440/390.json),
 * mirrored into our RTL frame in section-relative percentages so the
 * conformance mirror check is exact by construction. The glyph geometry
 * inside each svg is Madarek's own line art (diagonal/line arrows,
 * stroke crosses, filled pin squares) authored to fill the measured box
 * — never Heron's asset.
 *
 * Decorative chrome: aria-hidden, pointer-events none, appended AFTER
 * HeroGrid so no existing census ordinal shifts. The wrapper is
 * visibility:hidden with visible children (the edge-390 gutter census
 * unions every visible descendant rect). Wide-band rows (the off-stage
 * marquee run and the sets Heron repacks below the band) render >=1440
 * only; every seat with a measured 390 box re-seats onto it under the
 * <=991 belt. The accent arrow seats carry the measured interactive
 * flag (they sit inside Heron's links) — cursor:pointer mirrors it
 * without making the decorative chrome a tab stop.
 */
type ChromeSeat = { l: number; t: number; w: number; h: number; op: number; bg?: string };
type ChromeKid = { cls: string; ink: string; act?: boolean; ink390?: string; tr?: string } & ({ k: string; d: string } | { cx: number; cy: number; r: number });
type ChromeRow = { cls: string; kind: 'div' | 'svg'; 1440?: ChromeSeat; 390?: ChromeSeat; vb: [number, number]; act?: boolean; kids?: ChromeKid[]; col?: string; col390?: string; tr?: string };

/* The measured seats — one row per spec element (H1-b data table).
 * l/t/w/h are percentages of the section box; op is the measured element
 * opacity; ink channels ride the H1-a chrome tokens (tokens.css). */
const CHROME_ROWS: ChromeRow[] = [
  { cls: 'hro-ch-c00', kind: 'div', 1440: { l: 1.111, t: 87.437, w: 1.181, h: 1.791, op: 1 }, 390: { l: 5.128, t: 87.793, w: 4.103, h: 1.827, op: 1 }, col: 'var(--accent)', vb: [17, 17], act: true },
  { cls: 'hro-ch-c01', kind: 'div', 1440: { l: 2.292, t: 87.437, w: 1.181, h: 1.791, op: 1 }, 390: { l: 9.231, t: 87.793, w: 4.103, h: 1.827, op: 1 }, col: 'var(--accent)', vb: [17, 17], act: true },
  { cls: 'hro-ch-c02', kind: 'div', 1440: { l: 50.208, t: 42.033, w: 0.556, h: 0.843, op: 1 }, 390: { l: 102.051, t: -0.913, w: 0, h: 0, op: 1 }, col: 'var(--accent)', vb: [8, 8] },
  { cls: 'hro-ch-c03', kind: 'svg', 1440: { l: 47.639, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 160, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-ink-72)', vb: [13, 13], kids: [{ cls: 'hro-ch-c06', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-ink-72)', ink390: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c04', kind: 'div', 1440: { l: 50.347, t: 42.033, w: 0.139, h: 0.843, op: 1, bg: 'var(--accent)' }, col: 'var(--accent)', vb: [2, 8] },
  { cls: 'hro-ch-c05', kind: 'div', 1440: { l: 50.208, t: 42.349, w: 0.556, h: 0.211, op: 1, bg: 'var(--accent)' }, col: 'var(--accent)', vb: [8, 2] },
  { cls: 'hro-ch-c07', kind: 'div', 1440: { l: 98.75, t: 6.531, w: 0.694, h: 1.053, op: 1 }, 390: { l: 96.154, t: 5.822, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10] },
  { cls: 'hro-ch-c08', kind: 'div', 1440: { l: 1.528, t: 6.531, w: 0.694, h: 1.053, op: 1 }, 390: { l: 5.897, t: 5.822, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10] },
  { cls: 'hro-ch-c09', kind: 'div', 1440: { l: 98.75, t: 77.43, w: 0.694, h: 1.053, op: 1 }, 390: { l: 96.154, t: 51.146, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10] },
  { cls: 'hro-ch-c10', kind: 'div', 1440: { l: 1.528, t: 77.43, w: 0.694, h: 1.053, op: 1 }, 390: { l: 5.897, t: 51.146, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10] },
  { cls: 'hro-ch-c11', kind: 'svg', 1440: { l: 37.222, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 115.385, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c22', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c12', kind: 'div', 1440: { l: 98.75, t: 6.531, w: 0.694, h: 1.053, op: 1 }, 390: { l: 96.154, t: 5.822, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10] },
  { cls: 'hro-ch-c13', kind: 'div', 1440: { l: 1.528, t: 6.531, w: 0.694, h: 1.053, op: 1 }, 390: { l: 5.897, t: 5.822, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10] },
  { cls: 'hro-ch-c14', kind: 'div', 1440: { l: 98.75, t: 77.43, w: 0.694, h: 1.053, op: 1 }, 390: { l: 96.154, t: 51.146, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10] },
  { cls: 'hro-ch-c15', kind: 'div', 1440: { l: 1.528, t: 77.43, w: 0.694, h: 1.053, op: 1 }, 390: { l: 5.897, t: 51.146, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10] },
  { cls: 'hro-ch-c16', kind: 'svg', 1440: { l: 28.194, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 76.923, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c30', cx: 6.5, cy: 6.5, r: 1.5, ink: 'var(--grid-line-rule)' }, { cls: 'hro-ch-c31', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c17', kind: 'div', 1440: { l: 36.667, t: 51.936, w: 0.833, h: 1.264, op: 0, bg: 'var(--white)' }, 390: { l: 102.051, t: -0.913, w: 0, h: 0, op: 0, bg: 'var(--white)' }, col: 'var(--grid-ink-72)', tr: 'opacity 0.4s ease', vb: [12, 12] },
  { cls: 'hro-ch-c18', kind: 'div', 1440: { l: 36.667, t: 52.041, w: 0.833, h: 1.264, op: 0.801388, bg: 'var(--accent)' }, col: 'var(--grid-ink-72)', tr: 'top 0.4s ease, right 0.4s ease, height 0.4s ease, width 0.4s ease', vb: [12, 12] },
  { cls: 'hro-ch-c19', kind: 'svg', 1440: { l: 19.653, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 40.769, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-ink-72)', vb: [13, 13], kids: [{ cls: 'hro-ch-c43', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-ink-72)', ink390: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c20', kind: 'div', 1440: { l: 68.819, t: 50.882, w: 0.833, h: 1.264, op: 0, bg: 'var(--white)' }, 390: { l: 102.051, t: -0.913, w: 0, h: 0, op: 0, bg: 'var(--white)' }, col: 'var(--grid-ink-72)', tr: 'opacity 0.4s ease', vb: [12, 12] },
  { cls: 'hro-ch-c21', kind: 'div', 1440: { l: 68.75, t: 50.882, w: 0.833, h: 1.264, op: 0.801388, bg: 'var(--accent)' }, col: 'var(--grid-ink-72)', tr: 'top 0.4s ease, right 0.4s ease, height 0.4s ease, width 0.4s ease', vb: [12, 12] },
  { cls: 'hro-ch-c23', kind: 'svg', 1440: { l: 98.75, t: 6.531, w: 0.694, h: 1.053, op: 1 }, 390: { l: 96.154, t: 5.822, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10], kids: [{ cls: 'hro-ch-c45', k: 'v', d: 'M5 0 V10', ink: 'var(--grid-ink)', tr: 'transform 0.4s ease' }, { cls: 'hro-ch-c46', k: 'h', d: 'M0 5 H10', ink: 'var(--grid-ink)', tr: 'transform 0.4s ease' }] },
  { cls: 'hro-ch-c24', kind: 'svg', 1440: { l: 1.528, t: 6.531, w: 0.694, h: 1.053, op: 1 }, 390: { l: 5.897, t: 5.822, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10], kids: [{ cls: 'hro-ch-c47', k: 'v', d: 'M5 0 V10', ink: 'var(--grid-ink)', tr: 'transform 0.4s ease' }, { cls: 'hro-ch-c48', k: 'h', d: 'M0 5 H10', ink: 'var(--grid-ink)', tr: 'transform 0.4s ease' }] },
  { cls: 'hro-ch-c25', kind: 'svg', 1440: { l: 98.75, t: 77.43, w: 0.694, h: 1.053, op: 1 }, 390: { l: 96.154, t: 51.146, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10], kids: [{ cls: 'hro-ch-c49', k: 'v', d: 'M5 0 V10', ink: 'var(--grid-ink)', tr: 'transform 0.4s ease' }, { cls: 'hro-ch-c50', k: 'h', d: 'M0 5 H10', ink: 'var(--grid-ink)', tr: 'transform 0.4s ease' }] },
  { cls: 'hro-ch-c26', kind: 'svg', 1440: { l: 1.528, t: 77.43, w: 0.694, h: 1.053, op: 1 }, 390: { l: 5.897, t: 51.146, w: 2.051, h: 0.913, op: 1 }, col: 'var(--grid-ink)', vb: [10, 10], kids: [{ cls: 'hro-ch-c51', k: 'v', d: 'M5 0 V10', ink: 'var(--grid-ink)', tr: 'transform 0.4s ease' }, { cls: 'hro-ch-c52', k: 'h', d: 'M0 5 H10', ink: 'var(--grid-ink)', tr: 'transform 0.4s ease' }] },
  { cls: 'hro-ch-c27', kind: 'svg', 1440: { l: 9.236, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: -3.846, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c53', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c28', kind: 'svg', 1440: { l: 0.208, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: -42.308, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c55', cx: 6.5, cy: 6.5, r: 1.5, ink: 'var(--grid-line-rule)' }, { cls: 'hro-ch-c56', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c29', kind: 'svg', 1440: { l: -8.333, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c60', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--accent)', act: true }] },
  { cls: 'hro-ch-c32', kind: 'svg', 1440: { l: -18.75, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c75', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--accent)', act: true }] },
  { cls: 'hro-ch-c33', kind: 'svg', 1440: { l: -27.778, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c76', cx: 6.5, cy: 6.5, r: 1.5, ink: 'var(--grid-line-rule)' }, { cls: 'hro-ch-c77', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c34', kind: 'svg', 1440: { l: -36.25, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c78', k: 'ad', d: 'M3 11 L12 1 M9 1 H12 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c35', kind: 'svg', 1440: { l: -46.736, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c81', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c36', kind: 'svg', 1440: { l: -55.764, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c85', cx: 6.5, cy: 6.5, r: 1.5, ink: 'var(--grid-line-rule)' }, { cls: 'hro-ch-c86', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c37', kind: 'svg', 1440: { l: -64.236, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c99', k: 'ad', d: 'M3 11 L12 1 M9 1 H12 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c38', kind: 'svg', 1440: { l: -74.722, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c100', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c39', kind: 'svg', 1440: { l: -83.75, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13], kids: [{ cls: 'hro-ch-c101', cx: 6.5, cy: 6.5, r: 1.5, ink: 'var(--grid-line-rule)' }, { cls: 'hro-ch-c102', k: 'ad', d: 'M2 11 L11 1 M8 1 H11 V4', ink: 'var(--grid-line-rule)' }] },
  { cls: 'hro-ch-c40', kind: 'div', 1440: { l: 1.111, t: 87.437, w: 1.181, h: 1.791, op: 1 }, 390: { l: 5.128, t: 87.793, w: 4.103, h: 1.827, op: 1 }, col: 'var(--accent)', vb: [17, 17], act: true },
  { cls: 'hro-ch-c41', kind: 'div', 1440: { l: 2.292, t: 87.437, w: 1.181, h: 1.791, op: 1 }, 390: { l: 9.231, t: 87.793, w: 4.103, h: 1.827, op: 1 }, col: 'var(--accent)', vb: [17, 17], act: true },
  { cls: 'hro-ch-c42', kind: 'div', 1440: { l: 36.944, t: 52.357, w: 0.347, h: 0.527, op: 1 }, 390: { l: 102.051, t: -0.913, w: 0, h: 0, op: 1 }, col: 'var(--grid-ink-72)', vb: [5, 5] },
  { cls: 'hro-ch-c44', kind: 'div', 1440: { l: 69.028, t: 51.304, w: 0.347, h: 0.527, op: 1 }, 390: { l: 102.051, t: -0.913, w: 0, h: 0, op: 1 }, col: 'var(--grid-ink-72)', vb: [5, 5] },
  { cls: 'hro-ch-c54', kind: 'svg', 1440: { l: 1.111, t: 87.437, w: 1.181, h: 1.791, op: 1 }, 390: { l: 5.128, t: 87.793, w: 4.103, h: 1.827, op: 1 }, col: 'var(--accent)', vb: [17, 17], act: true },
  { cls: 'hro-ch-c57', kind: 'svg', 1440: { l: 2.292, t: 87.437, w: 1.181, h: 1.791, op: 1 }, 390: { l: 9.231, t: 87.793, w: 4.103, h: 1.827, op: 1 }, col: 'var(--accent)', vb: [17, 17], act: true },
  { cls: 'hro-ch-c58', kind: 'div', 1440: { l: 1.111, t: 87.437, w: 1.181, h: 1.791, op: 1 }, 390: { l: 5.128, t: 87.793, w: 4.103, h: 1.827, op: 1 }, col: 'var(--accent)', vb: [17, 17], act: true },
  { cls: 'hro-ch-c59', kind: 'div', 1440: { l: 47.639, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 160, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c61', kind: 'div', 1440: { l: 37.222, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 115.385, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c62', kind: 'div', 1440: { l: 28.194, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 76.923, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c63', kind: 'div', 1440: { l: 19.653, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 40.769, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c64', kind: 'div', 1440: { l: 9.236, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: -3.846, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c65', kind: 'div', 1440: { l: 0.208, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: -42.308, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c66', kind: 'div', 1440: { l: -8.333, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c67', kind: 'div', 1440: { l: -18.75, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c68', kind: 'div', 1440: { l: -27.778, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c69', kind: 'div', 1440: { l: -36.25, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c70', kind: 'div', 1440: { l: -46.736, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c71', kind: 'div', 1440: { l: -55.764, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c72', kind: 'div', 1440: { l: -64.236, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c73', kind: 'div', 1440: { l: -74.722, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c74', kind: 'div', 1440: { l: -83.75, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c79', kind: 'div', 1440: { l: 1.111, t: 87.437, w: 1.181, h: 1.791, op: 1 }, 390: { l: 5.128, t: 87.793, w: 4.103, h: 1.827, op: 1 }, col: 'var(--accent)', tr: 'transform 0.48s cubic-bezier(0.625, 0.05, 0, 1)', vb: [17, 17], act: true },
  { cls: 'hro-ch-c80', kind: 'div', 1440: { l: 2.292, t: 87.437, w: 1.181, h: 1.791, op: 1 }, 390: { l: 9.231, t: 87.793, w: 4.103, h: 1.827, op: 1 }, col: 'var(--accent)', tr: 'transform 0.48s cubic-bezier(0.625, 0.05, 0, 1)', vb: [17, 17], act: true },
  { cls: 'hro-ch-c82', kind: 'div', 1440: { l: 47.639, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 160, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c83', kind: 'div', 1440: { l: 37.222, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 115.385, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c84', kind: 'div', 1440: { l: 28.194, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 76.923, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c87', kind: 'div', 1440: { l: 19.653, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: 40.769, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c88', kind: 'div', 1440: { l: 9.236, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: -3.846, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c89', kind: 'div', 1440: { l: 0.208, t: 90.809, w: 0.903, h: 1.37, op: 1 }, 390: { l: -42.308, t: 91.332, w: 4.103, h: 1.827, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c90', kind: 'div', 1440: { l: -8.333, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c91', kind: 'div', 1440: { l: -18.75, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c92', kind: 'div', 1440: { l: -27.778, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c93', kind: 'div', 1440: { l: -36.25, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c94', kind: 'div', 1440: { l: -46.736, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c95', kind: 'div', 1440: { l: -55.764, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c96', kind: 'div', 1440: { l: -64.236, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c97', kind: 'div', 1440: { l: -74.722, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
  { cls: 'hro-ch-c98', kind: 'div', 1440: { l: -83.75, t: 90.809, w: 0.903, h: 1.37, op: 1 }, col: 'var(--grid-line-rule)', vb: [13, 13] },
];

/* Colour channels are token REFERENCES (the sanctioned raw values live in
 * tokens.css; this table and the layer sheet only ever reference var(--*)). */

/** One seat -> its --ch-* custom properties (consumed by the layer sheet
 * in hero-mechanics.css; suffix '' is the >=992 seat, '390' the measured
 * <=991 seat — the ONLY duplication is the two var() fallback chains in
 * the sheet, never the data). */
function seatVars(suffix: '' | '390', s: ChromeSeat): React.CSSProperties {
  return {
    [`--ch-l${suffix}`]: `${s.l}%`,
    [`--ch-t${suffix}`]: `${s.t}%`,
    [`--ch-w${suffix}`]: `${s.w}%`,
    [`--ch-h${suffix}`]: `${s.h}%`,
    [`--ch-op${suffix}`]: String(s.op),
    [`--ch-bg${suffix}`]: s.bg ?? 'transparent',
  } as React.CSSProperties;
}

export function HeroChrome() {
  return (
    <div className="hro-chrome" aria-hidden="true">
      {CHROME_ROWS.map((r) => {
        const a = r['1440'];
        const b = r['390'];
        const real390 = !!(b && b.w > 0 && b.h > 0);
        const style = {
          ...(a ? seatVars('', a) : {}),
          ...(real390 ? seatVars('390', b) : {}),
          ...(r.col ? ({ '--ch-col': r.col } as React.CSSProperties) : {}),
          ...(real390 && r.col390 ? ({ '--ch-col390': r.col390 } as React.CSSProperties) : {}),
          ...(r.tr ? ({ '--ch-tr': r.tr } as React.CSSProperties) : {}),
        };
        const wide = a && !real390 ? 'w' : undefined;
        if (r.kind === 'svg') {
          return (
            <svg
              key={r.cls}
              className={`hro-ch ${r.cls}`}
              viewBox={`0 0 ${r.vb[0]} ${r.vb[1]}`}
              preserveAspectRatio="none"
              data-wide={wide}
              data-act={r.act ? 'a' : undefined}
              style={style}
            >
              {(r.kids ?? []).map((k) =>
                'd' in k ? (
                  <path
                    key={k.cls}
                    className={`hro-ch ${k.cls}`}
                    data-k={k.k}
                    data-act={k.act ? 'a' : undefined}
                    style={{ '--ch-ink': k.ink, ...(k.ink390 ? { '--ch-ink390': k.ink390 } : {}), ...(k.tr ? { '--ch-tr': k.tr } : {}) } as React.CSSProperties}
                    d={k.d}
                  />
                ) : (
                  <circle
                    key={k.cls}
                    className={`hro-ch ${k.cls}`}
                    data-act={k.act ? 'a' : undefined}
                    style={{ '--ch-ink': k.ink, ...(k.ink390 ? { '--ch-ink390': k.ink390 } : {}), ...(k.tr ? { '--ch-tr': k.tr } : {}) } as React.CSSProperties}
                    cx={k.cx}
                    cy={k.cy}
                    r={k.r}
                  />
                )
              )}
            </svg>
          );
        }
        return (
          <div
            key={r.cls}
            className={`hro-ch ${r.cls}`}
            data-wide={wide}
            data-act={r.act ? 'a' : undefined}
            style={style}
          />
        );
      })}
    </div>
  );
}
