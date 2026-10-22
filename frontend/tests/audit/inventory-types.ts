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

/**
 * r291 (the §10 coverage repair): per-capture probe that distinguishes
 * «the selector genuinely does not apply on this route» from «an
 * expected measurement silently vanished». The r286 baseline shipped
 * 48/72 captures with EMPTY computedColors because every sample
 * selector targeted the retired legacy anatomy (h1.page-title /
 * .metric-* / .sidebar-item) while most routes had already moved to
 * the patterns contract — drift then passed vacuously over nothing.
 * `matched` lists sample names that produced a color row;
 * `notFound` lists sample names whose selector matched nothing on
 * the page (applicable-but-absent = review) or matched but carried
 * no direct text (text samples only). `probed` = matched+notFound
 * length; a capture with probed < COLOR_SAMPLE_FLOOR or fewer
 * matched than the baseline had → coverage-regression (drift.ts).
 */
export interface ColorProbe {
  matched: string[];
  notFound: string[];
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
  /** r291: see ColorProbe — optional so pre-r291 baselines still parse. */
  colorProbe?: ColorProbe;
  /**
   * r291: illustration-coverage context — how many illustration nodes
   * are mounted, and how many .state surfaces (the EmptyState/ErrorState
   * mount points that own them) exist on the page. 0 illustrations +
   * 0 state mounts = «genuinely N/A» (a data-bearing page); a state
   * mount with 0 illustrations on a route whose baseline had some =
   * review. Distinguishes absence from vanishing (the §10 rule).
   */
  illustrationMounts?: { illustrations: number; stateSurfaces: number };
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
  /* '/' carries the r307 media layer: the documentary university
     photography (Commons-licensed WebP derivatives, ~500 KB transferred
     at 1440/DPR1) on top of the r306 sheet's ~831 KB. The raise
     900 KB → 2 MB is the R307 performance charter's own ceiling
     («initial critical media and transfers around or below 2 MB» —
     mission Phase 8.1), applied as a DOCUMENTED, intentional redesign
     cost with the committed baseline re-captured in the same change
     (never a silent regression). Every other route stays on the
     default 800 KB. Historical: the r303/r304 WebGL world raised the
     CI bundle ceiling 650→900 KB gz (1ef0307) — that chunk is long
     retired; the sheet's JS weight rides far below the bundle gate. */
  routes: { '/': 2_000_000 },
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
  // not yet resolved by the engine — shipped in tokens.css (r197
  // single-shadow grammar; the r196 multi-layer recipes retired).
  '0 1px 2px rgba(22,20,15,0.06)',
  '0 10px 15px rgba(22,20,15,0.08)',
  '0 18px 40px rgba(22,20,15,0.12)',
  '0 24px 56px rgba(22,20,15,0.14)',
  '0 32px 72px rgba(22,20,15,0.16)',
  // r196-era recipes kept one round so old captures still classify
  // (removed after the next baseline re-promotion cycle).
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
  // 001-* canonical durations (r305 Heron ladder re-key: the retired
  // 160/240/320/360/380 rungs were removed with this list's update —
  // the same change that re-promoted the surface baseline, per the
  // one-cycle convention above; the new --t-* rungs joined instead:
  // 200 fast / 400 base+page / 480 reveal / 500 slow / 650 slower.
  // 900 cinema is animation-only and never captured as a transition.)
  80, 200, 400, 480, 500, 650, 700, 1200,
  // 012 additions (animation-only)
  120, 180, 0,
  // r164 integration: the token ladder's slower rungs (tokens.css
  // --t-slower: 520ms, --t-cinema: 720ms) — used by the landing
  // reveal-up family and the auth card entrance; without them the
  // audit flagged canonical token motion as "ad-hoc".
  520, 720,
  // (r197: the --ln-dur-marquee 42_000 entry retired with the
  // --ln-* family — landing.css never consumed it.)
  // r190 integration: the AMBIENT ladder (tokens.css §ambient loops —
  // pulse 1.6s / base 2.4s / slow 3.6s / drift 6s / scene 22s) was
  // authored AFTER this list and never folded in — the r190 landing's
  // node-breathe (ambient-slow) tripped the audit like the r164
  // slower rungs once did. Plus the r190 scene entrance:
  // --motion-duration-scene-reveal (2.2s — the hero's one-time
  // orbital draw; consumers reference the token, never a re-spelled
  // value).
  1_600, 2_400, 3_600, 6_000, 22_000, 2_200,
];
