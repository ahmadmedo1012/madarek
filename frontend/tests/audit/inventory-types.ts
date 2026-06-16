/**
 * Surface inventory + drift types.
 *
 * Per specs/012-design-graphics-uplift/contracts/audit-script.md.
 *
 * The full Playwright harness that produces the inventory at runtime
 * runs against a live dev server; the JSON shape it emits is the
 * SurfaceCapture below. The drift detector in `drift.ts` is a pure
 * function over this shape — it does not touch the network or DOM,
 * so it is unit-testable without a browser.
 */

export type ThemeKey = 'light' | 'dark';
export type DirKey = 'ltr' | 'rtl';
export type ViewportKey = 360 | 768 | 1280;

export interface IllustrationCapture {
  /** Registered name from the V1 union, or '<unknown>' for off-family scenes. */
  name: string;
  decorative: boolean;
  altResolved: string | null;
  sizeBytesGz: number;
}

export type OverlayKind =
  | 'modal'
  | 'sheet'
  | 'popover'
  | 'dropdown'
  | 'toast'
  | 'tooltip'
  | 'lightbox'
  | 'commandPalette'
  | 'notificationPanel';

export interface OverlayCapture {
  type: OverlayKind;
  /** Resolved value of the box-shadow var (--elev-1..5). */
  elevToken: string;
  glass: boolean;
  zIndex: number;
}

export interface MotionCapture {
  selector: string;
  durationMs: number;
  easing: string;
}

export interface ColorCapture {
  selector: string;
  background: string;
  color: string;
  contrastRatio: number;
}

export interface SurfaceCapture {
  route: string;
  viewport: ViewportKey;
  theme: ThemeKey;
  dir: DirKey;
  illustrations: IllustrationCapture[];
  overlays: OverlayCapture[];
  roleAccent: string | null;
  collegeAccent: string | null;
  collegeAccentFallback: boolean;
  motionTreatments: MotionCapture[];
  computedColors: ColorCapture[];
  cls: number;
  fcpMs: number;
  bytesTransferred: number;
}

export interface SurfaceInventory {
  /** Stamp set by the harness post-run. */
  generatedAt: string;
  captures: SurfaceCapture[];
}

export interface BudgetTable {
  /** Per-route bytes-transferred budget (bytes). */
  routes: Record<string, number>;
  /** Default ceiling for routes not in `routes`. */
  defaultBytes: number;
  /** Allowed FCP regression vs baseline (ratio). e.g. 1.05 = 5% headroom. */
  fcpRegressionRatio: number;
  /** Body-text contrast minimum (WCAG AA). */
  textContrastMin: number;
  /** Numeric KPI contrast minimum (WCAG AAA). */
  numericContrastMin: number;
  /** Maximum gzipped illustration size in bytes. */
  illustrationMaxBytesGz: number;
  /** CLS ceiling per route. */
  clsMax: number;
}

export const DEFAULT_BUDGET: BudgetTable = {
  routes: {},
  defaultBytes: 800_000,
  fcpRegressionRatio: 1.05,
  textContrastMin: 4.5,
  numericContrastMin: 7.0,
  illustrationMaxBytesGz: 8_192,
  clsMax: 0.05,
};

/**
 * Allow-list of token-derived box-shadow values. The drift detector
 * accepts anything in this set; everything else is "ad-hoc".
 *
 * The shape is intentionally a substring check rather than an exact
 * equality compare, since browsers normalise rgba() values and
 * different engines return slightly different stringifications of
 * the same shadow stack. As long as the captured value contains one
 * of the recognised --elev-N markers (or its computed equivalent),
 * the detector treats it as token-derived.
 */
export const KNOWN_ELEV_MARKERS: ReadonlyArray<string> = [
  '--elev-1',
  '--elev-2',
  '--elev-3',
  '--elev-4',
  '--elev-5',
  // Fallback values that the cascade may produce when the token is
  // not yet resolved by the engine — shipped in tokens.css.
  '0 1px 2px rgba(0,0,0,0.04)',
  '0 4px 8px rgba(0,0,0,0.06)',
  '0 8px 16px rgba(0,0,0,0.08)',
  '0 16px 32px rgba(0,0,0,0.10)',
  '0 32px 64px rgba(0,0,0,0.12)',
];

/**
 * Documented motion durations from 001-* and 012. Anything outside
 * this set in a captured motion treatment counts as ad-hoc.
 */
export const KNOWN_DURATIONS_MS: ReadonlyArray<number> = [
  // 001-* canonical durations
  80, 160, 240, 320, 360, 380, 700, 1200,
  // 012 additions (animation-only)
  120, 180, 0,
];
