/**
 * Canonical Arabic-aware search normalizer.
 *
 * Source-of-truth for both write-time (Prisma client extension populating
 * `searchableNormalized` columns) and read-time (search route handler)
 * normalization. The same algorithm is mirrored at
 * `frontend/src/lib/search.ts` for client-side highlighting.
 *
 * See specs/011-platform-completeness-uplift/contracts/search.md.
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

/**
 * Strip a leading `ال` definite-article prefix from a normalized string,
 * if present. The substring matcher tries both with and without — see
 * `contracts/search.md` § Match strategy.
 */
export function stripAlPrefix(normalized: string): string {
  return normalized.startsWith('ال') ? normalized.slice(2) : normalized;
}
