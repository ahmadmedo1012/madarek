/**
 * Canonical Arabic-aware search normalizer (mirror).
 *
 * This is byte-identical to the function exported from
 * `backend/src/modules/search/normalize.ts`. Kept duplicated rather than
 * imported across workspaces because (a) the two run in different bundling
 * contexts (Vite + ESM browser vs. tsc + Node ESM), and (b) cross-workspace
 * runtime imports are heavier than the cost of a small one-page mirror.
 *
 * If you change this file, change `backend/src/modules/search/normalize.ts`
 * in the same commit. Both files share the same regex sequence — drift
 * here silently breaks Arabic search highlighting.
 *
 * See specs/011-platform-completeness-uplift/contracts/search.md.
 */

const ARABIC_DIACRITICS = /[ً-ْٰۖ-ۭ]/g;
const TATWEEL = /ـ/g;
const ALIF_VARIANTS = /[آأإٱ]/g;
const WAW_HAMZA = /ؤ/g;
const YA_HAMZA = /ئ/g;
const HAMZA = /ء/g;
const ALIF_MAQSURA = /ى/g;
const TAA_MARBUTA = /ة/g;

export function normalizeArabicSearch(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(ALIF_VARIANTS, 'ا')
    .replace(WAW_HAMZA, 'و')
    .replace(YA_HAMZA, 'ي')
    .replace(HAMZA, '')
    .replace(ALIF_MAQSURA, 'ي')
    .replace(TAA_MARBUTA, 'ه')
    .trim();
}

export function stripAlPrefix(normalized: string): string {
  return normalized.startsWith('ال') ? normalized.slice(2) : normalized;
}
