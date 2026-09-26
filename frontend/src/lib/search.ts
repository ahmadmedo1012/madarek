/**
 * Arabic-aware search normalization — the FE mirror of the canonical
 * backend normalizer (backend/src/modules/search/normalize.ts, see
 * specs/011-platform-completeness-uplift/contracts/search.md).
 *
 * Same foldings, in the same order, so a client-side match (command
 * palette / search pill quick-actions) answers exactly what the
 * server-side /search/global route would answer for the same term:
 * NFC → lowercase → strip diacritics + tatweel → fold alif/hamza
 * variants → fold ى→ي and ة→ه → trim.
 *
 * The `ال` definite-article tolerance from the search contract is part
 * of the matcher, not the normalizer: «الخوارزميات» finds «خوارزميات».
 */

const ARABIC_DIACRITICS = /[ً-ْٰۖ-ۭ]/g; // ً ٌ ٍ َ ُ ِ ّ ْ ٰ ...
const TATWEEL = /ـ/g;
const ALIF_VARIANTS = /[آأإٱ]/g; // آ أ إ ٱ
const WAW_HAMZA = /ؤ/g; // ؤ
const YA_HAMZA = /ئ/g; // ئ
const HAMZA = /ء/g; // ء
const ALIF_MAQSURA = /ى/g; // ى
const TAA_MARBUTA = /ة/g; // ة

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

/** Strip a leading `ال` definite-article prefix from a normalized
 *  string, if present (search contract § Match strategy). */
export function stripAlPrefix(normalized: string): string {
  return normalized.startsWith('ال') ? normalized.slice(2) : normalized;
}

/** Does a raw haystack match a raw query, once both sides are folded
 *  by `normalizeArabicSearch`? Applies the `ال` tolerance at match
 *  time — the same predicate the backend search routes use. */
export function matchesNormalizedQuery(haystack: string, rawQuery: string): boolean {
  const q = normalizeArabicSearch(rawQuery);
  if (!q) return false;
  const h = normalizeArabicSearch(haystack);
  return h.includes(q) || h.includes(stripAlPrefix(q));
}
