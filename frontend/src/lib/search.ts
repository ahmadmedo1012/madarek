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

/* ────────────────────────────────────────────────────────────────────
   Word-level matching (5-C4, A10 P2-4) — the quick-action filter.
   The substring predicate above is the /search/global mirror and stays
   untouched; quick actions additionally need to answer realistic
   multiword queries the index-style match misses («الاختبارات بنك» →
   «بنك الأسئلة والاختبارات», «درجات الطالب» → «درجات الطلاب»).
   ──────────────────────────────────────────────────────────────────── */

/** Palette vocabulary aliases: the product vocabulary is «اختبار»,
 *  never «امتحان» (nav.ts D17-1), but Libyan users type the colloquial
 *  word and its broken plural. Fold those QUERY words to the product
 *  term at match time (labels never carry the colloquial form, so only
 *  the query side needs the fold). */
const QUERY_WORD_ALIASES: Record<string, string> = {
  امتحان: 'اختبار',
  امتحانات: 'اختبارات',
  امتحنات: 'اختبارات',
  امتحن: 'اختبارات',
};

/** Bounded typo tolerance: within ONE edit (insert / delete /
 *  substitute / transpose of adjacent letters) — «طالب» matches
 *  «طلاب», «بنك» stays exact. Gated to 4+ letter words: below that a
 *  single edit is most of the word and the check degrades into
 *  matching everything. */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    // One substitution, or one adjacent-letter transposition (which
    // shows up as TWO differing positions — «طالب» vs «طلاب»).
    const diffs: number[] = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        if (diffs.length === 2) return false;
        diffs.push(i);
      }
    }
    if (diffs.length === 1) return true; // substitution
    const d1 = diffs[0];
    const d2 = diffs[1];
    return (
      d1 !== undefined && d2 !== undefined && d2 === d1 + 1 && a[d1] === b[d2] && a[d2] === b[d1]
    );
  }
  // Length differs by one: a single insertion/deletion.
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
      continue;
    }
    if (skipped) return false;
    skipped = true;
    j++;
  }
  return true;
}

/** Word-level, word-order-insensitive quick-action matching.
 *
 *  - Single-word queries keep the substring contract of
 *    `matchesNormalizedQuery` (foldings + `ال` tolerance), plus the
 *    vocabulary aliases above, plus (r183-B6, A4 P3-5) a bounded
 *    singular↔plural tolerance — see `singularCandidates`.
 *  - Multiword queries match when EVERY query word matches SOME label
 *    token — word order free, so «الاختبارات بنك» finds «بنك الأسئلة
 *    والاختبارات». A word↔token pair matches by containment (either
 *    side containing the other, so «اختبارات» finds «والاختبارات»;
 *    guarded to 3+ letters so prepositions like «في» cannot leak in)
 *    or, at 4+ letters, within one edit (so «الطالب» finds «الطلاب»).
 */

/** r183-B6 (A4 P3-5): the Arabic singular↔plural drift, bounded.
 *
 *  A4 measured the live miss: typing the SINGULAR of a nav feature
 *  («مسابقة», «رسالة») answered zero rows because the nav labels
 *  carry the plurals («المسابقات الأكاديميّة», «الرسائل»). Two folds
 *  cover the drift class, applied at match time on normalized words
 *  (ة already folded to ه, ئ to ي):
 *
 *   - sound feminine plural: trailing ه → ات («مسابقه»→«مسابقات»,
 *     «جامعه»→«جامعات», «كليه»→«كليات»);
 *   - the رسالة→رسائل class (normalized: «رساله»→«رسايل»): a word
 *     ending in له pluralizes by the فَعائل pattern — drop the له,
 *     append يل («رساله»→«رسايل», «امتحاله»-shaped words simply
 *     match nothing and stay harmless).
 *
 *  Gated to 4+ letter words — the same floor as `withinOneEdit`
 *  (below that the fold rewrites most of the word and degrades into
 *  matching everything). Candidates only ever WIDEN the match: the
 *  word itself always comes first. */
function singularCandidates(word: string): string[] {
  const out = [word];
  if (word.length >= 4) {
    if (word.endsWith('ه')) out.push(`${word.slice(0, -1)}ات`);
    if (word.endsWith('له')) out.push(`${word.slice(0, -2)}يل`);
  }
  return out;
}

export function matchesQueryTokens(haystack: string, rawQuery: string): boolean {
  const q = normalizeArabicSearch(rawQuery);
  if (!q) return false;
  const words = q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => QUERY_WORD_ALIASES[stripAlPrefix(w)] ?? stripAlPrefix(w));
  const h = normalizeArabicSearch(haystack);
  const tokens = h
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => QUERY_WORD_ALIASES[stripAlPrefix(t)] ?? stripAlPrefix(t));
  const first = words[0] ?? '';
  if (words.length <= 1) {
    // The substring contract first — a plain containment on the whole
    // haystack (the /search/global mirror).
    if (first && h.includes(first)) return true;
    // Then the singular↔plural folds, token-by-token with the SAME
    // containment predicate (either side containing the other, 3+
    // letters) the multiword branch uses — «مسابقه» finds the
    // «مسابقات» of «المسابقات الأكاديميّة», «رساله» finds «الرسائل».
    const candidates = singularCandidates(first);
    return tokens.some((token) => {
      const tokenCandidates = singularCandidates(token);
      return candidates.some((c) =>
        tokenCandidates.some((tc) =>
          (tc.length >= 3 && c.includes(tc)) || (c.length >= 3 && tc.includes(c)),
        ),
      );
    });
  }
  return words.every((word) =>
    tokens.some((token) => {
      const shorter = Math.min(word.length, token.length);
      if (shorter >= 3 && (token.includes(word) || word.includes(token))) return true;
      return word.length >= 4 && token.length >= 4 && withinOneEdit(word, token);
    }),
  );
}
