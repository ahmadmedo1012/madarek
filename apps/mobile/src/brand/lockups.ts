/**
 * lockups.ts — the R323 lockup compositions: the mark + wordmark sheets
 * placed on shared canvases with the RTL reading (mark RIGHT, wordmark
 * LEFT — Arabic reads right-to-left, so the eye hits the mark first).
 *
 * All placement math derives from the generated wordmark metrics
 * (./wordmark.generated.ts — ink height normalized to 100 units, 6-unit
 * construction margins) so a regeneration re-seats the lockups without
 * hand-tuning. The 32-grid mark rides untranslated inside its own box.
 *
 * Clear space (½ mark height) and minimum sizes are CONSUMER rules —
 * documented in docs/redesign/r323/brand/BRAND.md and rendered on
 * /__brand — never baked into these viewBoxes.
 */
import { WORDMARK_AR, WORDMARK_LATIN } from './wordmark.generated';
import { MARK_INK } from './mark';

/** The wordmark sheet's construction margin (from the generator). */
const SHEET_MARGIN = 6;

/** The wordmark's stroke in PROPORTIONAL sheet units (3.1% of ink height):
 * at the lockup minimum (88 px mark ⇒ ~30 px word ink) it renders ≈1 px —
 * a hollow hairline whose counters stay open. A non-scaling 1.5 px
 * outline would close every counter below ~24 px ink (the 600-weight
 * letterforms are only ~2.4 px thick there) and read as a blob; uniformity
 * with the mark's 1.5 px hairline holds at chrome sizes and degrades
 * gracefully — docs/redesign/r323/brand/BRAND.md §min-sizes. */
export const WORDMARK_STROKE_SHEET = 3.5;

/** Placement of one sheet on a canvas: translate + uniform scale such
 * that the sheet's INK lands at (inkX, inkY) top-left at inkH height. */
function place(sheetInkH: number, inkH: number, inkX: number, inkY: number) {
  const scale = inkH / sheetInkH;
  return {
    scale: +scale.toFixed(5),
    x: +(inkX - SHEET_MARGIN * scale).toFixed(3),
    y: +(inkY - SHEET_MARGIN * scale).toFixed(3),
  };
}

/* ── LOCKUP — horizontal, RTL: mark right, «مدارك» left ──────────────
 * Canvas 32 units tall (the mark's own grid). The wordmark ink is 11
 * units tall (≈⅓ of the mark box), vertically centred, seated 5 units
 * from the mark's west diamond tip — the same 5-unit air the mark's
 * viewBox already carries on every side, so the whole lockup reads as
 * ONE evenly-framed plate. */
const LOCKUP_AR_INK_H = 11;
const LOCKUP_AR = place(WORDMARK_AR.ink.h, LOCKUP_AR_INK_H, 5, (32 - LOCKUP_AR_INK_H) / 2);
const LOCKUP_AR_INK_W = +(WORDMARK_AR.ink.w * LOCKUP_AR.scale).toFixed(3);
/** mark box x: wordmark ink left (5) + wordmark ink width + 5-unit
 * perceived gap − the mark's own west air (MARK_INK.x = 5). */
const LOCKUP_MARK_X = +(5 + LOCKUP_AR_INK_W + 5 - MARK_INK.x).toFixed(3);

export const LOCKUP = {
  viewBox: `0 0 ${+(LOCKUP_MARK_X + 32).toFixed(2)} 32`,
  /** numeric canvas (width derives the rendered aspect from size) */
  w: +(LOCKUP_MARK_X + 32).toFixed(2),
  h: 32,
  mark: { x: LOCKUP_MARK_X, y: 0 },
  ar: LOCKUP_AR,
} as const;

/* ── STACKED — the full vertical identity: mark / «مدارك» / MADAREK ──
 * Mark on top (32-box), the wordmark ink 10 units tall centred 5 units
 * below, the Geist Mono transliteration 3.5 units tall (slightly
 * narrower than the wordmark — the mono micro-label hierarchy) 4 units
 * under it, 5 units of bottom air. Latin MAY be letter-spaced; the
 * tracking is already inside the generated sheet. */
const STACKED_AR_INK_H = 10;
const STACKED_LATIN_INK_H = 3.5;
const STACKED_AR = place(WORDMARK_AR.ink.h, STACKED_AR_INK_H, (32 - WORDMARK_AR.ink.w * (STACKED_AR_INK_H / WORDMARK_AR.ink.h)) / 2, 32 + 5);
const STACKED_LATIN = place(WORDMARK_LATIN.ink.h, STACKED_LATIN_INK_H, (32 - WORDMARK_LATIN.ink.w * (STACKED_LATIN_INK_H / WORDMARK_LATIN.ink.h)) / 2, 32 + 5 + STACKED_AR_INK_H + 4);
const STACKED_H = +(32 + 5 + STACKED_AR_INK_H + 4 + STACKED_LATIN_INK_H + 5).toFixed(2);

export const STACKED = {
  viewBox: `0 0 32 ${STACKED_H}`,
  /** numeric canvas (width derives the rendered aspect from size) */
  w: 32,
  h: STACKED_H,
  mark: { x: 0, y: 0 },
  ar: STACKED_AR,
  latin: STACKED_LATIN,
} as const;
