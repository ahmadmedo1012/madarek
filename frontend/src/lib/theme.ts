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
 * The chrome-surface colour the college-accent tints, used as the
 * background contrast partner. The accent must be visible against
 * this surface in the active theme.
 */
const CHROME_BG: Record<ThemeSurface, RGB> = {
  light: { r: 251, g: 250, b: 249 },
  dark:  { r: 25, g: 25, b: 24 },
};

/**
 * Run the WCAG contrast gate on a college's identity colour against
 * the chrome surface in the active theme. Returns the original hex
 * (with leading `#`) when contrast clears the threshold, otherwise
 * `null` so the caller can fall back to `var(--role-accent)` via the
 * normal CSS cascade.
 *
 * Default threshold: 3.0 — the WCAG AA "non-text large" minimum,
 * appropriate for a tint / outline / hover ring that doesn't carry
 * body text. Callers placing body text directly on top of the accent
 * (e.g. a filled primary CTA) should pass `threshold = 4.5`.
 */
export function gateCollegeAccent(
  hex: string,
  surface: ThemeSurface = 'light',
  threshold = 3.0,
): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const ratio = contrastRatio(rgb, CHROME_BG[surface]);
  if (ratio < threshold) return null;
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/** Public test helpers — exported for unit tests only. */
export const __test__ = { parseHex, relativeLuminance, contrastRatio };
