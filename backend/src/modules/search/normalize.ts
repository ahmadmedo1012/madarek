/**
 * Canonical Arabic-aware search normalizer — v2 (R350 S2).
 *
 * The shared corpus for BOTH query edges (backend routes + the
 * frontend mirror at `frontend/src/lib/search.ts` — byte-pinned by
 * `tests/unit/search-normalize.test.ts` + the backend fold tests):
 *
 *   · the v1 fold: diacritics, tatweel, آأإٱ→ا, ؤ→و, ئ→ي, ء→'', ى→ي, ة→ه
 *   · Eastern-Arabic/Persian digit folding (٠-٩ ۰-۹ → 0-9) — an ID typed
 *     with Arabic keyboard digits must hit the same as Latin digits
 *   · zero-width + presentation-form folding (U+200B-200F, BOM; the
 *     Arabic presentation forms FE70-FEFF fold via NFKC on the text)
 *   · clitic tolerance: leading و/ب/ل/ف/ك + ال (والـ بالـ للـ فالـ كالـ)
 *     strip in the MATCH direction only — the stored data is never
 *     rewritten; the matcher tries the stripped variant (stripCliticPrefix)
 *
 * Source-of-truth for read-time (search route handler) normalization;
 * the write-time Prisma extension remains aspirational (no
 * `searchableNormalized` columns exist — candidates re-verify in JS).
 *
 * See specs/011-platform-completeness-uplift/contracts/search.md and
 * docs/redesign/r350/SEARCH-DESIGN.md §2.
 */

const ARABIC_DIACRITICS = /[ً-ْٰۖ-ۭ]/g; // ً ٌ ٍ َ ُ ِ ّ ْ ٰ ...
const TATWEEL = /ـ/g;
const ALIF_VARIANTS = /[آأإٱ]/g; // آ أ إ ٱ
const WAW_HAMZA = /ؤ/g; // ؤ
const YA_HAMZA = /ئ/g; // ئ
const HAMZA = /ء/g; // ء
const ALIF_MAQSURA = /ى/g; // ى
const TAA_MARBUTA = /ة/g; // ة

/** Zero-width characters that smuggle into copy-pasted text. */
const ZERO_WIDTH = /[\u200B-\u200F\uFEFF]/g;

/** Eastern-Arabic + Persian digits → Latin (the same fold phones.ts uses). */
const EASTERN_DIGITS = /[٠-٩۰-۹]/g;
const EASTERN_DIGIT_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

/** The clitic+article prefixes the matcher strips in the match direction:
 *  والـ، بالـ، للـ، فالـ، كالـ، وال، بال، لل، فال، كال، ال. */
const CLITIC_PREFIXES = [
  'وال', 'بال', 'لل', 'فال', 'كال',
  'و', 'ب', 'ل', 'ف', 'ك',
  'ال',
] as const;

export function normalizeArabicSearch(input: string): string {
  return input
    .normalize('NFKC') // presentation forms + zero-width joiners fold
    .toLowerCase()
    .replace(ZERO_WIDTH, '')
    .replace(ARABIC_DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(ALIF_VARIANTS, 'ا')
    .replace(WAW_HAMZA, 'و')
    .replace(YA_HAMZA, 'ي')
    .replace(HAMZA, '')
    .replace(ALIF_MAQSURA, 'ي')
    .replace(TAA_MARBUTA, 'ه')
    .replace(EASTERN_DIGITS, (d) => EASTERN_DIGIT_MAP[d] ?? d)
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

/**
 * Strip ONE leading clitic particle (و/ب/ل/ف/ك, optionally carrying ال)
 * from a normalized query word — «وللكلية» tries «للكلية» tries
 * «الكلية» tries «كلية». Longest prefix first; single-letter particles
 * only strip when the remainder stays ≥2 chars (a bare «و» query must
 * never become empty).
 */
export function stripCliticPrefix(normalized: string): string {
  for (const prefix of CLITIC_PREFIXES) {
    if (normalized.startsWith(prefix) && normalized.length - prefix.length >= 2) {
      return normalized.slice(prefix.length);
    }
  }
  return normalized;
}

/** The match variants of one normalized query, longest-first. */
export function matchVariants(normalized: string): string[] {
  if (!normalized) return [];
  const stripped = stripCliticPrefix(normalized);
  const alStripped = stripAlPrefix(normalized);
  const bothStripped = stripAlPrefix(stripped);
  return [...new Set([normalized, stripped, alStripped, bothStripped])].filter(Boolean);
}

/**
 * Read-time matcher used by the search routes: does a (raw) haystack match
 * a normalized query, once both sides have been folded by
 * `normalizeArabicSearch`? Applies the `ال` + clitic prefix tolerance from
 * the search contract at match time.
 *
 * This exists so route handlers can apply the canonical foldings WITHOUT
 * schema-level `searchable_normalized` columns: candidates are fetched
 * with raw `contains`, then re-verified in JS through this helper.
 */
export function matchesNormalizedQuery(haystack: string, query: string): boolean {
  if (!query) return false;
  const h = normalizeArabicSearch(haystack);
  // Normalize the query defensively: the fold is idempotent, so both raw
  // and pre-normalized callers (the routes pass qN) are safe — the FE
  // mirror's signature takes a raw query by contract.
  const q = normalizeArabicSearch(query);
  for (const variant of matchVariants(q)) {
    if (h.includes(variant)) return true;
  }
  return false;
}
