/**
 * Theme helpers — runtime contrast gate for college-accent surfaces.
 *
 * Implements R-004 from specs/012-design-graphics-uplift/research.md
 * and the FR-005 fallback rule from spec.md.
 *
 * The store + hook live in `frontend/src/stores/theme.store.ts`
 * (carries from 001/002). This file extends it with the contrast
 * gate only — no new state machinery.
 */

export type ThemeSurface = 'light' | 'dark';

interface RGB { r: number; g: number; b: number }

function parseHex(hex: string): RGB | null {
  const m = hex.trim().replace('#', '');
  if (m.length === 3) {
    const r = parseInt(m[0]! + m[0]!, 16);
    const g = parseInt(m[1]! + m[1]!, 16);
    const b = parseInt(m[2]! + m[2]!, 16);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)
      ? { r, g, b }
      : null;
  }
  if (m.length === 6) {
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)
      ? { r, g, b }
      : null;
  }
  return null;
}

function relativeLuminance({ r, g, b }: RGB): number {
  const norm = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
}

function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The theme's representative chrome-text colour, used as the
 * worst-case foreground a college-accent might tint behind.
 */
const CHROME_FG: Record<ThemeSurface, RGB> = {
  light: { r: 25, g: 25, b: 24 },
  dark:  { r: 242, g: 234, b: 216 },
};

/**
 * The chrome-surface colour the college-accent tints, used as the
 * worst-case background contrast partner.
 */
const CHROME_BG: Record<ThemeSurface, RGB> = {
  light: { r: 251, g: 250, b: 249 },
  dark:  { r: 25, g: 25, b: 24 },
};

/**
 * Run the WCAG AA contrast gate on a college's identity colour.
 * Returns the original hex when both contrasts (against chrome
 * background AND chrome foreground) clear AA, otherwise returns
 * `null` so the caller can fall back to `var(--role-accent)` via
 * normal CSS cascade.
 *
 * AA threshold: 3.0 for chrome surfaces (treated as non-text large).
 */
export function gateCollegeAccent(
  hex: string,
  surface: ThemeSurface = 'light',
  threshold = 3.0,
): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const fgPair = contrastRatio(rgb, CHROME_FG[surface]);
  const bgPair = contrastRatio(rgb, CHROME_BG[surface]);
  if (fgPair >= threshold && bgPair >= threshold) return hex.startsWith('#') ? hex : `#${hex}`;
  return null;
}

/** Public test helpers — exported for unit tests only. */
export const __test__ = { parseHex, relativeLuminance, contrastRatio };
