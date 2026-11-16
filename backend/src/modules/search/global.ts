/**
 * master-G1 — the GLOBAL (platform-wide people + record discovery) search
 * engine: PURE planning + permission-scoping + ranking helpers.
 *
 * This module is DB-free by law (mirrors the normalize.ts / permissions.ts
 * convention — decision logic lives in pure functions so the full
 * permission matrix is unit-testable without a database; the route handler
 * in http/routes/search.routes.ts owns every prisma call).
 *
 * Reused, never forked:
 *  · `normalizeArabicSearch` / `stripAlPrefix` / `matchesNormalizedQuery`
 *    (modules/search/normalize.ts — the canonical Arabic normalizer),
 *  · `normalizePhone` (lib/phones.ts — master-E1's phone pair),
 *  · the scoping conventions of lib/profile-scoping.ts (institution
 *    context is REQUIRED for institutional roles, fail-closed) and the
 *    announcement-scope shapes of social.routes.ts
 *    (institutionAnnouncementConditions / buildAnnouncementScopeConditions).
 *
 * Match strategy (the established search pattern, spec 011 read-time half):
 * the handler fetches candidates via prisma `contains` (insensitive) on
 * the RAW name columns — limited per category (see `candidateTake`) —
 * then re-verifies + ranks in JS through `matchesNormalizedQuery`. This
 * keeps the engine DB-agnostic and honest: the trigram GIN indexes from
 * migration master_g1_search_trgm accelerate the contains fetch; the JS
 * half guarantees the canonical Arabic foldings (ال prefix tolerance
 * included) on every emitted row.
 */
import type { Prisma, Role } from '@prisma/client';
import { normalizeArabicSearch, stripAlPrefix, stripCliticPrefix } from './normalize.js';
import { normalizePhone } from '../../lib/phones.js';

// ─────────────────────────────────────────────────────────────────
//  Categories
// ─────────────────────────────────────────────────────────────────

/** The discovery categories, in canonical response order. R350 S3
 * grows the seven with the design matrix's eight record kinds
 * (SEARCH-DESIGN.md §1) — lectures/materials/papers/tracks/books/jobs/
 * events/questions — every one role-honest and institution-pinned. */
export const GLOBAL_SEARCH_CATEGORIES = [
  'students',
  'teachers',
  'institutions',
  'faculties',
  'departments',
  'courses',
  'lectures',
  'materials',
  'papers',
  'tracks',
  'books',
  'jobs',
  'events',
  'announcements',
  'questions',
] as const;

export type GlobalSearchCategoryKey = (typeof GLOBAL_SEARCH_CATEGORIES)[number];

/**
 * Parse the `categories` query param (comma-separated). Non-string values
 * collapse to the default (every category) — the same collapse convention
 * as `sanitizeSearchQuery`. Unknown / empty tokens are REJECTED (returns
 * null → the route answers 400) so a typo'd category never silently
 * narrows results. Case-insensitive; duplicates deduped to canonical
 * order.
 */
export function parseGlobalSearchCategories(raw: unknown): GlobalSearchCategoryKey[] | null {
  const text = typeof raw === 'string' ? raw : '';
  const trimmed = text.trim();
  if (trimmed === '') return [...GLOBAL_SEARCH_CATEGORIES];
  const wanted = new Set<string>();
  for (const token of trimmed.split(',')) {
    const key = token.trim().toLowerCase();
    if (key === '') return null;
    if (!(GLOBAL_SEARCH_CATEGORIES as readonly string[]).includes(key)) return null;
    wanted.add(key);
  }
  return GLOBAL_SEARCH_CATEGORIES.filter((c) => wanted.has(c));
}

// ─────────────────────────────────────────────────────────────────
//  Query planning
// ─────────────────────────────────────────────────────────────────

/** E1's E.164 lower bound — fewer digits than this is never a phone. */
const MIN_PHONE_QUERY_DIGITS = 8;

/** A query is "digits-heavy" when ≥60% of its non-space chars are digits. */
const DIGITS_DOMINANCE = 0.6;

/** ASCII + Arabic-Indic (٠-٩) + Eastern Arabic-Indic (۰-۹) digits. */
const ANY_DIGIT = /[0-9\u0660-\u0669\u06F0-\u06F9]/g;

export interface GlobalQueryPlan {
  /** The sanitized raw query (as it flowed through sanitizeSearchQuery). */
  raw: string;
  /** Canonical Arabic-normalized form (normalizeArabicSearch). */
  normalized: string;
  /** The normalized form minus a leading ال (prefix-tolerance arm). */
  noAl: string;
  /**
   * DB `contains` variants — EVERY raw-text form the SQL fetch tries
   * (r353-F, the reverse-fold fix): the raw q, its normalized twin, the
   * ال-stripped + ال-prefixed twins (so «الشبكات» finds «شبكات الحاسوب»
   * AND «شبكات» finds «الشبكات» — `noAl` used to be computed and never
   * used in any WHERE), the clitic-stripped twin, the REVERSE-folded
   * hamza/ة/ى forms of the query (so typing «احمد» still hits the raw
   * trigram index of a stored «أحمد» — the normalizer folds the STORED
   * side only at the JS re-verify, the SQL arm needs the query side
   * expanded), and the per-word arms of a multiword query (word-order
   * freedom at the fetch stage — «المهدي محمد» fetches «محمد المهدي»).
   * Deduped, ≥2 chars, hard-capped, deterministic order.
   */
  variants: string[];
  /**
   * r357 L4 — per-word variant GROUPS for a multiword query (empty for
   * single-word queries): wordVariants[i] is the fold group of the
   * i-th ≥3-letter word (the word, its clitic/ال-stripped form, its
   * reverse folds — the same arms `variants` carries flat). The
   * people scans build the CONJUNCTIVE fetch from these groups: every
   * word must match SOME name field. The flat `variants` OR was a
   * name-ordered window over 20k students — a two-word query fetched
   * the alphabetically-first 100 single-word matches and the strict
   * multiword re-verify killed them all (the true targets sat beyond
   * the window; measured R@5=0.000 at 20k). The conjunction is a
   * SUPERSET of what the re-verify keeps (it ignores <3-letter words,
   * the re-verify re-adds them) — the fetch narrows, the law holds.
   */
  wordVariants: string[][];
  /**
   * True when the raw query is pure ASCII (letters/digits/email
   * punctuation) — the identifier arms (email / student number) are
   * admitted only then; an Arabic name query never burns ILIKE arms on
   * columns that cannot carry Arabic.
   */
  asciiLike: boolean;
  /** Digit characters (ASCII + Arabic-Indic) in the raw query. */
  digits: number;
  /**
   * E1-normalized phone key when the query is digits-heavy AND resolves
   * through `normalizePhone` (lib/phones.ts — Libyan-first, E.164-minus-
   * plus); null otherwise.
   */
  phoneDigits: string | null;
  /** True iff phoneDigits resolved — phone matching is admitted. */
  isPhoneQuery: boolean;
}

/* ── Reverse-fold variant expansion (r353-F bug 1) ─────────────────
 *
 * THE BUG this block kills: `variants = [raw, normalized]` only ever
 * tried the query's OWN forms. The canonical normalizer folds the
 * STORED text (أ→ا, ة→ه, ى→ي) at the JS re-verify — but the SQL
 * `contains` fetch runs against the RAW columns, so a query typed with
 * the plain keyboard forms («احمد») never fetched a row stored with
 * the orthographic forms («أحمد»): the candidate never reached the JS
 * half that would have matched it. The fix expands the QUERY side:
 * every foldable position regenerates the forms the stored data may
 * carry. Bounded and deterministic (pure — pinned by unit tests):
 *
 *  · ا → أ / إ / آ  (the alif-hamza seats)
 *  · ه → ة          (ta-marbuta)
 *  · ي → ى          (alif maqsura)
 *  · و → ؤ          (waw-hamza)
 *
 * Per WORD: ≤2 foldable positions → the full cartesian (a name like
 * «اسامه» regenerates «أسامة» — TWO seats in one word); ≥3 →
 * Hamming-1 substitutions only (the near-miss classes that matter;
 * full cartesian on «الخوارزميات» would mint 3^5 strings for nothing).
 * Across words: single-word substitutions always; the cross-word
 * cartesian only while the query's TOTAL foldable positions stay ≤2. */

/** The orthographic forms each plain keyboard letter may be stored as. */
const REVERSE_FOLDS: Readonly<Record<string, readonly string[]>> = {
  'ا': ['أ', 'إ', 'آ'],
  'ه': ['ة'],
  // ي regenerates BOTH the alif-maqsura (ى) and the ya-hamza (ئ) seats.
  'ي': ['ى', 'ئ'],
  'و': ['ؤ'],
};

/** Full cartesian up to this many foldable positions per word. */
const REVERSE_FOLD_CARTESIAN_MAX = 3;
/** Safety cap on the variant list handed to the SQL builder. */
const MAX_VARIANTS = 40;
/** Per-word arms are capped at this many query words (bounded fetch). */
const MAX_WORD_ARMS = 6;
/** Reverse folds contributed per WORD arm (the whole-query arms carry more). */
const MAX_WORD_FOLDS = 8;

function foldablePositions(word: string): number[] {
  const positions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (REVERSE_FOLDS[word[i]!] !== undefined) positions.push(i);
  }
  return positions;
}

function substitute(word: string, at: number, withChar: string): string {
  return word.slice(0, at) + withChar + word.slice(at + 1);
}

/** The reverse-folded forms of ONE normalized word (never includes the word itself). */
function reverseFoldWord(word: string): string[] {
  const positions = foldablePositions(word);
  if (positions.length === 0) return [];
  const out = new Set<string>();
  const emitPair = (i: number, j: number): void => {
    const a = REVERSE_FOLDS[word[i]!]!;
    const b = REVERSE_FOLDS[word[j]!]!;
    for (const altA of a) for (const altB of b) {
      out.add(substitute(substitute(word, i, altA), j, altB));
    }
  };
  if (positions.length <= REVERSE_FOLD_CARTESIAN_MAX) {
    // Full cartesian — covers multi-seat words («اسامه» → «أسامة»).
    const expand = (idx: number, acc: string): void => {
      if (out.size >= 32) return; // the per-word safety valve
      if (idx === positions.length) {
        if (acc !== word) out.add(acc);
        return;
      }
      const at = positions[idx]!;
      expand(idx + 1, substitute(acc, at, acc[at]!));
      for (const alt of REVERSE_FOLDS[acc[at]!]!) expand(idx + 1, substitute(acc, at, alt));
    };
    expand(0, word);
  } else {
    // Long foldable words: single substitutions, PLUS the cartesian over
    // the LAST TWO foldable positions — the Arabic orthography seats
    // cluster word-finally («…ية» endings need ي→ئ AND ه→ة together:
    // plain «كهربائيه» must regenerate the stored «كهربائية»).
    for (const at of positions) {
      for (const alt of REVERSE_FOLDS[word[at]!]!) out.add(substitute(word, at, alt));
    }
    const lastTwo = positions.slice(-2);
    if (lastTwo.length === 2) emitPair(lastTwo[0]!, lastTwo[1]!);
  }
  return [...out];
}

/** The reverse-folded forms of a whole (possibly multiword) normalized query. */
export function reverseFoldVariants(normalized: string): string[] {
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const perWord = words.map(reverseFoldWord);
  if (perWord.every((v) => v.length === 0)) return [];
  const out = new Set<string>();

  // (a) one word substituted at a time — covers the single hamza-bearing
  // word inside an otherwise plain query.
  for (let i = 0; i < words.length; i++) {
    for (const variant of perWord[i]!) {
      const copy = [...words];
      copy[i] = variant;
      out.add(copy.join(' '));
    }
  }

  // (b) cross-word cartesian, only while the whole query stays small —
  // covers «احمد ابراهيم» against a stored «أحمد إبراهيم».
  const totalPositions = words.reduce((n, w) => n + foldablePositions(w).length, 0);
  if (totalPositions <= REVERSE_FOLD_CARTESIAN_MAX) {
    const expand = (idx: number, acc: string[]): void => {
      if (idx === words.length) {
        out.add(acc.join(' '));
        return;
      }
      expand(idx + 1, [...acc, words[idx]!]);
      for (const variant of perWord[idx]!) expand(idx + 1, [...acc, variant]);
    };
    expand(0, []);
    out.delete(words.join(' '));
  }
  return [...out];
}

/** True when the raw query is pure ASCII identifier text (email / student-number shapes). */
const ASCII_LIKE = /^[A-Za-z0-9@._+-]+(?: [A-Za-z0-9@._+-]+)*$/;

/**
 * Plan one global-search query: the normalized form, the ال/clitic
 * prefix arms, the REVERSE-folded forms (the r353-F fix), the per-word
 * arms, and — when the query is digits-heavy — the E1 phone key.
 * Pure; the route calls this once per request.
 */
export function planGlobalQuery(q: string): GlobalQueryPlan {
  const raw = q;
  const normalized = normalizeArabicSearch(raw);
  const noAl = stripAlPrefix(normalized);

  const variants = new Set<string>();
  const add = (v: string): void => {
    const trimmed = v.trim();
    if (trimmed.length >= 2) variants.add(trimmed);
  };
  add(raw);
  add(normalized);
  // ال both directions + the clitic family — the fetch-stage halves of
  // the ال tolerance the JS matcher (matchVariants) always had. Arabic
  // queries only: an ال-prefixed Latin identifier is garbage, and the
  // identifier arms lean on the variants list too.
  if (/[\u0600-\u06FF]/.test(normalized)) {
    if (noAl !== normalized) {
      add(noAl); // «الشبكات» → «شبكات» (finds «شبكات الحاسوب»)
    } else {
      add(`ال${noAl}`); // «شبكات» → «الشبكات» (finds «الشبكات المتقدمة»)
    }
    const cliticStripped = stripCliticPrefix(normalized);
    if (cliticStripped !== normalized) {
      add(cliticStripped);
      const cliticNoAl = stripAlPrefix(cliticStripped);
      add(cliticNoAl);
      if (cliticNoAl === cliticStripped) add(`ال${cliticNoAl}`); // re-attach the article
    }
  }
  const words = normalized.split(/\s+/).filter((w) => w.length >= 3);
  const wordVariants: string[][] = [];
  if (words.length >= 2 && words.length <= MAX_WORD_ARMS) {
    // Per-word arms FIRST (the 40-variant cap must never slice them
    // away): each word alone — clitic-stripped — with its reverse
    // folds. 3+ letter words only: a 2-letter preposition arm («في»)
    // would match half the corpus; «مريم بن عثمان» still fetches
    // through its two long words. This is what makes the multiword
    // fetch order-free («المهدي محمد» fetches «محمد المهدي»; «احمد
    // ابراهيم» fetches the stored «أحمد إبراهيم» through the per-word
    // hamza forms). The JS re-verify stays strict (multiwordHit), so
    // the fetch may widen but the emitted rows never loosen.
    for (const word of words) {
      add(word);
      const wordStripped = stripAlPrefix(stripCliticPrefix(word));
      add(wordStripped);
      const group = [word, wordStripped];
      for (const v of reverseFoldWord(wordStripped).slice(0, MAX_WORD_FOLDS)) {
        add(v);
        group.push(v);
      }
      wordVariants.push([...new Set(group)]);
    }
  } else if (words.length === 1) {
    // Single-word queries: the whole-word reverse folds (the cartesian
    // lives here — «اسامه» regenerates «أسامة»). Multiword queries get
    // their folds per word above instead — the whole-phrase forms would
    // explode the variant budget for nothing.
    for (const base of new Set([normalized, noAl])) {
      for (const v of reverseFoldVariants(base)) add(v);
    }
  }

  const digits = (raw.match(ANY_DIGIT) ?? []).length;
  const significant = raw.replace(/\s/g, '').length;
  const digitsHeavy =
    digits >= MIN_PHONE_QUERY_DIGITS &&
    significant > 0 &&
    digits / significant >= DIGITS_DOMINANCE;
  const phone = digitsHeavy ? normalizePhone(raw) : null;

  return {
    raw,
    normalized,
    noAl,
    variants: [...variants].slice(0, MAX_VARIANTS),
    wordVariants,
    asciiLike: raw.trim().length > 0 && ASCII_LIKE.test(raw.trim()),
    digits,
    phoneDigits: phone ? phone.normalized : null,
    isPhoneQuery: phone !== null,
  };
}

// ─────────────────────────────────────────────────────────────────
//  Ranking
// ─────────────────────────────────────────────────────────────────

/** rankHit tiers: exact=0, prefix=1, substring=2 (lower sorts first). */
export const RANK_EXACT = 0;
export const RANK_PREFIX = 1;
export const RANK_SUBSTRING = 2;
/** No match at all — the candidate is dropped. */
export const RANK_NONE = Number.POSITIVE_INFINITY;

/**
 * Rank one (already-normalized) haystack against a normalized query:
 * exact=0, prefix=1, substring=2, no-match=Infinity. Applied AFTER the
 * candidate fetch, within the page window, to order the verified hits
 * (exact name matches float above prefix matches above substrings).
 *
 * The ال prefix tolerance is folded in — `الرياضيات` ranks as an exact
 * hit against `رياضيات` — mirroring `matchesNormalizedQuery`'s match-time
 * tolerance so the ranker and the verifier can never disagree on
 * matchability.
 */
export function rankHit(haystackNormalized: string, qNormalized: string): number {
  if (!qNormalized) return RANK_NONE;
  const arms = qNormalized.startsWith('ال') ? [qNormalized, stripAlPrefix(qNormalized)] : [qNormalized];
  let best = RANK_NONE;
  for (const arm of arms) {
    if (!arm) continue;
    if (haystackNormalized === arm) best = Math.min(best, RANK_EXACT);
    else if (haystackNormalized.startsWith(arm)) best = Math.min(best, RANK_PREFIX);
    else if (haystackNormalized.includes(arm)) best = Math.min(best, RANK_SUBSTRING);
  }
  return best;
}

/* ── r353-F — the fetch-stage companions the contiguous matcher never
 * had. All three are pure, tier at RANK_SUBSTRING, and only ever run
 * as the LAST resort (after rankHit + searchHit both missed), so they
 * widen which candidates survive — never which tier anything else
 * earns. Each mirrors an established frontend matcher
 * (frontend/src/lib/search.ts — matchesQueryTokens / withinOneEdit):
 * the two engines answer the same query the same way. ─────────────── */

/** Bounded 1-edit tolerance: one substitution, one adjacent-letter
 * transposition, or one insertion/deletion. Port of the frontend
 * matcher's `withinOneEdit` (frontend/src/lib/search.ts) — the two
 * implementations must stay in lockstep. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    // One substitution, or one adjacent transposition (which shows up
    // as TWO differing positions — «طالب» vs «طلاب»).
    const diffs: number[] = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        if (diffs.length === 2) return false;
        diffs.push(i);
      }
    }
    if (diffs.length === 1) return true;
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

/** The plan's query words, ال-stripped and ≥2 chars (the multiword arm
 * never arms 1-letter particles — «في» must not leak in). */
function planWords(plan: GlobalQueryPlan): string[] {
  return plan.normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => stripAlPrefix(w))
    .filter((w) => w.length >= 2);
}

/** The plan's query words RAW (no ال-strip) — the typo arm needs the
 * full word: stripping can shrink a 4-letter word below the 1-edit
 * floor («المتي» → «متي» would never reach withinOneEdit). */
function planWordsRaw(plan: GlobalQueryPlan): string[] {
  return plan.normalized.split(/\s+/).filter((w) => w.length >= 2);
}

/** Word-level, word-ORDER-free re-verification: every query word is
 * contained somewhere in the folded haystacks — «المهدي محمد» matches
 * a stored «محمد المهدي» the contiguous matcher can never hit. */
export function multiwordHit(haystacks: readonly string[], plan: GlobalQueryPlan): boolean {
  const words = planWords(plan);
  if (words.length < 2) return false;
  const blob = haystacks
    .map((h) => normalizeArabicSearch(h ?? ''))
    .join(' \n ');
  return words.every((w) => blob.includes(w));
}

/** 1-edit typo re-verification: every query word matches SOME haystack
 * token by exact equality (2-letter kinship particles like «بن»),
 * containment (3+ letters), or within one edit (4+ letters, the same
 * floor the frontend matcher uses — tried against the token both
 * with and without its ال, since an edited word can lose the very
 * prefix the stripper keys on). The last-resort arm — «هندسي» still
 * finds «هندسة» once the candidate reached the window (through any
 * arm, e.g. a sibling field). */
export function typoHit(haystacks: readonly string[], plan: GlobalQueryPlan): boolean {
  const words = planWordsRaw(plan);
  if (words.length === 0) return false;
  const tokens = haystacks
    .flatMap((h) => normalizeArabicSearch(h ?? '').split(/\s+/))
    .filter(Boolean);
  return words.every((word) =>
    tokens.some((token) => {
      if (word === token) return true;
      const shorter = Math.min(word.length, token.length);
      if (shorter >= 3 && (token.includes(word) || word.includes(token))) return true;
      if (word.length < 4 || token.length < 4) return false;
      const bare = stripAlPrefix(token);
      return withinOneEdit(word, token) || withinOneEdit(word, bare);
    }),
  );
}

/* ── r353-F — the identifier arms (email / student number). The
 * registrar's #1 lookups: a student number typed verbatim must ride
 * the (institutionId, universityId) unique index, an email must ride
 * User_email_key — not a trigram scan. Pure where-builders + the JS
 * re-verifiers the fetched rows need (a row fetched by identifier has
 * a name that matches nothing — without these, rankAndPaginate would
 * drop every identifier hit on the floor). ────────────────────────── */

/** The email arms: exact (User_email_key) + insensitive contains —
 * admitted only for ASCII-shaped queries (an Arabic name query can
 * never match an email, and the contains arm has no index). */
export function emailMatchArms(plan: GlobalQueryPlan): Prisma.UserWhereInput[] {
  if (!plan.asciiLike) return [];
  return [
    { email: plan.raw },
    { email: { contains: plan.raw, mode: 'insensitive' } },
  ];
}

/**
 * r357 L4 — the CONJUNCTIVE multiword name arm. For a query with ≥2
 * long words, the fetch requires EVERY word's fold group to match some
 * name field (OR within a group — any field, any fold; AND across
 * groups). Returns null for single-word queries (the flat-variants OR
 * stays right for them). The identifier/email/phone arms stay as
 * sibling arms of the OR the route composes — a multiword name query
 * never carries them (ASCII-only by construction), so the conjunction
 * is the whole name predicate.
 *
 * Why: the flat-variants OR + the name-ordered candidate window is a
 * broken fetch at scale — the window (100 rows, firstName ASC) fills
 * with the alphabetically-first single-word matches and the strict
 * multiword re-verify drops them ALL (measured R@5=0.000 on a 20k
 * corpus; the true «أحمد المصري» rows sat beyond the window). The
 * conjunction fetches the precise candidate superset — typically a
 * handful of rows — and the re-verify keeps its law unchanged.
 */
export function multiwordNameArm(
  plan: GlobalQueryPlan,
  nameFields: readonly string[],
): Prisma.UserWhereInput | null {
  if (plan.wordVariants.length < 2) return null;
  return {
    AND: plan.wordVariants.map((group) => ({
      OR: group.flatMap((v) => nameFields.map((f) => ({ [f]: { contains: v, mode: 'insensitive' } }))),
    })),
  } as Prisma.UserWhereInput;
}

/**
 * The student-number arm: exact via the (institutionId, universityId)
 * unique index (institution-pinned callers only — the index is
 * composite), then insensitive contains over the plan's variants (the
 * digit fold: «٣٠١» contains-matches a stored «301»). The faculty pin
 * rides the same profile filter so a scoped registrar's phone/number
 * arm can never fetch out-of-faculty rows.
 */
export function universityIdMatchArm(
  plan: GlobalQueryPlan,
  institutionId: string | null,
  facultyId?: string | null,
): Prisma.UserWhereInput | null {
  if (!plan.asciiLike && plan.digits < 2) return null;
  const profileWhere: Prisma.StudentProfileWhereInput = {
    ...(institutionId ? { institutionId } : {}),
    ...(facultyId ? { facultyId } : {}),
    OR: [
      // Exact fast path — only meaningful under the institution pin
      // (the unique index is (institutionId, universityId)).
      ...(institutionId ? [{ universityId: plan.raw }] : []),
      ...plan.variants.map((v) => ({ universityId: { contains: v, mode: 'insensitive' as const } })),
    ],
  };
  return { studentProfiles: { some: profileWhere } };
}

/**
 * JS re-verification for an identifier-fetched candidate (email or
 * student number): exact equality ranks at RANK_EXACT (the registrar
 * typed the whole number — that student IS the answer), contains at
 * RANK_SUBSTRING. Folds digits + case + the Arabic fold classes on
 * the VALUE side, so «٣٠١» / «uz-2024-00001» / «أحمد@…» all resolve.
 */
export function identifierHit(
  value: string | null | undefined,
  plan: GlobalQueryPlan,
): number {
  if (!value) return RANK_NONE;
  const folded = normalizeArabicSearch(value);
  const needles = [plan.raw.toLowerCase(), plan.normalized, ...(plan.noAl !== plan.normalized ? [plan.noAl] : [])]
    .filter((n) => n.length >= 2);
  for (const needle of needles) {
    if (folded === needle) return RANK_EXACT;
  }
  for (const needle of needles) {
    if (folded.includes(needle)) return RANK_SUBSTRING;
  }
  return RANK_NONE;
}

// ─────────────────────────────────────────────────────────────────
//  Permission scoping (§10.4 — THE critical law)
// ─────────────────────────────────────────────────────────────────

/**
 * Announcement-scope facts, as gathered by the handler (DB reads that
 * stay there). Mirrors the /announcements/feed conventions of
 * social.routes.ts:
 *  · STUDENT → their StudentProfile's faculty/department + the offerings
 *    of their ACTIVE enrollments;
 *  · TEACHER → their home department's faculty + the offerings they
 *    teach;
 *  · ADMIN/QUALITY → their institution's faculties/departments/offerings;
 *  · OWNER → none (platform-wide oversight; every announcement visible).
 */
export interface GlobalSearchFacts {
  facultyIds?: readonly string[];
  departmentIds?: readonly string[];
  offeringIds?: readonly string[];
}

/**
 * The per-category where-filters for one caller. `null` = the category is
 * NOT discoverable for this role (STUDENT discovers no people → null
 * students/teachers; the route answers those categories with empty
 * items, never with an error).
 */
export interface GlobalSearchScope {
  /** STUDENT rows (User). null for STUDENT callers. */
  students: Prisma.UserWhereInput | null;
  /** TEACHER rows (User). null for STUDENT callers. */
  teachers: Prisma.UserWhereInput | null;
  institutions: Prisma.InstitutionWhereInput | null;
  faculties: Prisma.FacultyWhereInput | null;
  departments: Prisma.DepartmentWhereInput | null;
  /** CourseOffering rows (the dropdown's hit unit — href needs offeringId). */
  courses: Prisma.CourseOfferingWhereInput | null;
  /**
   * Announcement rows: PLATFORM + the caller's scoped rows (built from
   * `facts`). Expired rows are excluded by the handler via
   * `unexpiredAnnouncementFilter` (the feed convention).
   */
  announcements: Prisma.AnnouncementWhereInput | null;
  /* R350 S3 — the design matrix's record kinds (SEARCH-DESIGN §1):
   * lectures/materials ride the offering-visibility law (the same
   * chain the courses scope encodes), papers are PUBLISHED with a real
   * file, tracks are published, books/jobs are shared authenticated
   * content, events are institution-scoped, questions are the approved
   * staff bank. null = not discoverable for this role. */
  /** Lecture rows. STUDENT: active-enrollment offerings; TEACHER: own. */
  lectures: Prisma.LectureWhereInput | null;
  /** Material rows — the same offering-visibility chain as lectures. */
  materials: Prisma.MaterialWhereInput | null;
  /** ResearchPaper rows: PUBLISHED + a real fileUrl, institution-pinned. */
  papers: Prisma.ResearchPaperWhereInput | null;
  /** TrainingTrack rows: isPublished (shared content — every role). */
  tracks: Prisma.TrainingTrackWhereInput | null;
  /** Book rows — the shared library (every authenticated role). */
  books: Prisma.BookWhereInput | null;
  /** Job rows — the shared board (every authenticated role). */
  jobs: Prisma.JobWhereInput | null;
  /** CampusEvent rows — institution-scoped (OWNER: every institution). */
  events: Prisma.CampusEventWhereInput | null;
  /** Question rows — the APPROVED staff bank; null for STUDENT. */
  questions: Prisma.QuestionWhereInput | null;
  /**
   * May this caller match people BY PHONE? ADMIN/QUALITY of one
   * institution + OWNER only — a TEACHER never phone-searches, a STUDENT
   * discovers no people at all (§10.4 / §5).
   */
  phoneSearch: boolean;
  /**
   * May phone fields be RETURNED on student items? ADMIN/OWNER only, and
   * only the NORMALIZED columns (studentPhoneNormalized /
   * guardianPhoneNormalized) — the display pair never leaves the DB for
   * a search response (§10.4 / §5).
   */
  phoneFieldsVisible: boolean;
}

/** Announcement OR-conditions from facts — the institutionAnnouncementConditions shape. */
function announcementConditions(facts: GlobalSearchFacts): Prisma.AnnouncementWhereInput {
  const conditions: Prisma.AnnouncementWhereInput[] = [{ scope: 'PLATFORM' }];
  if (facts.facultyIds && facts.facultyIds.length > 0) {
    conditions.push({ scope: 'FACULTY', scopeId: { in: [...facts.facultyIds] } });
  }
  if (facts.departmentIds && facts.departmentIds.length > 0) {
    conditions.push({ scope: 'DEPARTMENT', scopeId: { in: [...facts.departmentIds] } });
  }
  if (facts.offeringIds && facts.offeringIds.length > 0) {
    conditions.push({ scope: 'OFFERING', scopeId: { in: [...facts.offeringIds] } });
  }
  return { OR: conditions };
}

/** Fail-closed scope: nothing is discoverable. */
function emptyScope(): GlobalSearchScope {
  return {
    students: null,
    teachers: null,
    institutions: null,
    faculties: null,
    departments: null,
    courses: null,
    announcements: null,
    lectures: null,
    materials: null,
    papers: null,
    tracks: null,
    books: null,
    jobs: null,
    events: null,
    questions: null,
    phoneSearch: false,
    phoneFieldsVisible: false,
  };
}

/**
 * The roles whose seat carries USERS_MANAGE (DEFAULT_ROLE_CAPABILITIES,
 * lib/permissions.ts) — the ONLY callers phone FIELDS are ever returned
 * for (r353-F E5: the seat is the permissions-matrix reality, not an
 * ad-hoc role list; QUALITY holds no USERS_MANAGE, so a quality search
 * stays name-only even when the phone SEARCH arm is shared).
 */
export const PHONE_FIELDS_ROLES: readonly Role[] = ['ADMIN', 'OWNER'];

/**
 * The §10.4 permission matrix as where-filters. PURE and DB-free — the
 * handler resolves the caller's VERIFIED institution context first
 * (`resolveCallerInstitutionScope`; 403 INSTITUTION_CONTEXT_REQUIRED for
 * a contextless institutional role — profile-scoping.ts's fail-closed
 * law) and gathers the announcement facts, then hands both here.
 *
 * `scopeFacultyId` (r353-F E5 — the college-registrar fix): an
 * ADMIN/QUALITY caller scoped to one faculty (User.scopeFacultyId, the
 * getGovernanceScope/buildScopedUserWhere convention of
 * lib/governance.ts) gets the people arms narrowed to that faculty —
 * the search used to ignore the scope and show the whole institution
 * roster while the users list stayed narrowed. The pin rides the SAME
 * profile `some` clause as the institution pin (STRONGER than
 * buildScopedUserWhere's separate clauses: the one profile that proves
 * institution membership must also carry the faculty — a user with
 * profiles in two faculties of the same institution can never be
 * matched by the "other" profile). Non-people categories stay
 * institution-wide (the users-list analogy covers people/roster only).
 *
 * Matrix:
 *  · STUDENT   → NO people (students/teachers null). Records only:
 *                own institution's faculties/departments, the course
 *                offerings of their ACTIVE enrollments
 *                (offeringVisibilityFilter's convention), and their
 *                visible announcements.
 *  · TEACHER   → ONLY students enrolled (status 'active' — the
 *                platform-wide convention) in the offerings they teach;
 *                colleagues = same-institution TEACHER profiles
 *                (name-only); own taught offerings; own announcements.
 *  · ADMIN     → their institution's full roster (students via active
 *                StudentProfiles in the institution, teachers via active
 *                TeacherProfiles), narrowed to their faculty when
 *                scopeFacultyId is set; institution records, institution
 *                courses, institution announcements. Phone search YES,
 *                phone fields YES (the USERS_MANAGE seat).
 *  · QUALITY   → the same institution roster NAME-ONLY: phone search
 *                YES (the registrar's «من هذا الرقم؟» lookup is shared)
 *                but phone fields NEVER returned.
 *  · OWNER     → every institution's people + records (platform-wide
 *                oversight; the owner holds no membership by design —
 *                institutionId arrives null). Phone search + fields YES.
 *
 * Cross-institution isolation (the law): every people/record where is
 * institution-scoped — the only unscoped wheres are OWNER's. A null
 * institutionId for a non-OWNER role fails closed (empty scope — the
 * handler 403s long before that, this is the defensive second lock).
 */
export function globalSearchScope(
  role: Role,
  userId: string,
  institutionId: string | null,
  facts: GlobalSearchFacts = {},
  scopeFacultyId: string | null = null,
): GlobalSearchScope {
  // OWNER — platform-wide oversight, no membership, no context to scope by.
  if (role === 'OWNER') {
    return {
      students: { role: 'STUDENT' },
      teachers: { role: 'TEACHER' },
      institutions: {},
      faculties: {},
      departments: {},
      courses: {},
      announcements: {},
      lectures: {},
      materials: {},
      papers: { status: 'PUBLISHED', fileUrl: { not: null } },
      tracks: { isPublished: true },
      books: {},
      jobs: {},
      events: {},
      questions: { isApproved: true },
      phoneSearch: true,
      phoneFieldsVisible: true,
    };
  }

  // Institutional roles REQUIRE a verified context — fail closed without one.
  const inst = typeof institutionId === 'string' && institutionId.length > 0 ? institutionId : null;
  if (!inst) return emptyScope();

  // Shared record scopes — institution-pinned for every non-OWNER role.
  const institutions: Prisma.InstitutionWhereInput = { id: inst };
  const faculties: Prisma.FacultyWhereInput = { institutionId: inst };
  const departments: Prisma.DepartmentWhereInput = { faculty: { institutionId: inst } };
  const announcements = announcementConditions(facts);
  // R350 S3 — the shared record kinds (institution-pinned where the
  // model carries the institution; shared content stays unscoped).
  const papers: Prisma.ResearchPaperWhereInput = {
    institutionId: inst,
    status: 'PUBLISHED',
    fileUrl: { not: null },
  };
  const tracks: Prisma.TrainingTrackWhereInput = { isPublished: true };
  const books: Prisma.BookWhereInput = {};
  const jobs: Prisma.JobWhereInput = {};
  const events: Prisma.CampusEventWhereInput = { institutionId: inst };
  const questions: Prisma.QuestionWhereInput = { isApproved: true };

  if (role === 'STUDENT') {
    return {
      // §10.4: a STUDENT discovers NO people.
      students: null,
      teachers: null,
      institutions,
      faculties,
      departments,
      // offeringVisibilityFilter's STUDENT branch (courses.routes.ts):
      // only ACTIVE enrollments grant visibility.
      courses: { enrollments: { some: { studentId: userId, status: 'active' } } },
      announcements,
      // The same offering-visibility law, one relation deeper.
      lectures: { offering: { enrollments: { some: { studentId: userId, status: 'active' } } } },
      materials: { offering: { enrollments: { some: { studentId: userId, status: 'active' } } } },
      papers,
      tracks,
      books,
      jobs,
      events,
      // A student never sees the staff question bank.
      questions: null,
      phoneSearch: false,
      phoneFieldsVisible: false,
    };
  }

  if (role === 'TEACHER') {
    return {
      // ONLY students enrolled in the offerings this teacher teaches
      // (taught offerings → enrollments; 'active' status per the
      // platform-wide convention — dropped leftovers never grant).
      students: {
        role: 'STUDENT',
        enrollments: { some: { status: 'active', offering: { teacherId: userId } } },
      },
      // Colleagues: same-institution TEACHER profiles (name-only — no
      // phone arm is ever admitted for a teacher, see phoneSearch).
      teachers: {
        role: 'TEACHER',
        teacherProfiles: { some: { membership: { institutionId: inst, isActive: true } } },
      },
      institutions,
      faculties,
      departments,
      courses: { teacherId: userId },
      announcements,
      // Own offerings' lectures + materials (the offeringVisibility
      // TEACHER branch — what they teach is what they find).
      lectures: { offering: { teacherId: userId } },
      materials: { offering: { teacherId: userId } },
      papers,
      tracks,
      books,
      jobs,
      events,
      // The teacher's question bank (approved questions only).
      questions,
      phoneSearch: false,
      phoneFieldsVisible: false,
    };
  }

  if (role === 'ADMIN' || role === 'QUALITY') {
    // r353-F E5 — the college-registrar faculty pin. Rides the SAME
    // profile `some` as the institution pin (see the function doc): the
    // one profile proving institution membership must also carry the
    // caller's faculty. Teachers pin through their home department's
    // faculty — the buildScopedUserWhere association shapes.
    const faculty = typeof scopeFacultyId === 'string' && scopeFacultyId.length > 0 ? scopeFacultyId : null;
    return {
      // The institution roster: users holding an ACTIVE profile in the
      // caller's institution (the resolveStudentProfile /
      // resolveTeacherProfile membership convention).
      students: {
        role: 'STUDENT',
        studentProfiles: {
          some: {
            institutionId: inst,
            membership: { isActive: true },
            ...(faculty ? { facultyId: faculty } : {}),
          },
        },
      },
      teachers: {
        role: 'TEACHER',
        teacherProfiles: {
          some: {
            membership: { institutionId: inst, isActive: true },
            ...(faculty ? { department: { facultyId: faculty } } : {}),
          },
        },
      },
      institutions,
      faculties,
      departments,
      // Institution courses — the offering → course → institution chain
      // (assertOfferingInCallerInstitution's ownership chain).
      courses: { course: { institutionId: inst } },
      announcements,
      // The institution's lectures + materials (the same chain).
      lectures: { offering: { course: { institutionId: inst } } },
      materials: { offering: { course: { institutionId: inst } } },
      papers,
      tracks,
      books,
      jobs,
      events,
      // The staff bank (approved questions only).
      questions,
      phoneSearch: true,
      // r353-F E5: the USERS_MANAGE seat (PHONE_FIELDS_ROLES, verified
      // against lib/permissions.ts DEFAULT_ROLE_CAPABILITIES) — ADMIN
      // and OWNER only; QUALITY searches phones but never sees them.
      phoneFieldsVisible: (PHONE_FIELDS_ROLES as readonly string[]).includes(role),
    };
  }

  // Unknown role — fail closed (unreachable with the current Role enum).
  return emptyScope();
}

/**
 * The phone match-arm for the STUDENTS category: matches
 * studentPhoneNormalized / guardianPhoneNormalized via `contains` on the
 * E1-normalized digits. The arm re-pins the institution inside the
 * relation filter so a phone hit can never cross institutions (OWNER —
 * institutionId null — searches every institution by design).
 * r353-F E5: an optional `facultyId` rides the same `some` clause (the
 * scoped registrar's phone arm can never fetch out-of-faculty rows —
 * the scope.students pin would not reach into this arm's own profile
 * filter).
 *
 * Sibling privacy (documented by design, §5): a shared family phone
 * finds BOTH siblings — that is the registrar's use case («من هذا
 * الرقم؟» → the whole family on one number), not a leak.
 */
export function phoneMatchArm(
  plan: GlobalQueryPlan,
  institutionId: string | null,
  facultyId?: string | null,
): Prisma.UserWhereInput | null {
  if (!plan.isPhoneQuery || !plan.phoneDigits) return null;
  const contains = { contains: plan.phoneDigits };
  const profileWhere: Prisma.StudentProfileWhereInput = {
    ...(institutionId ? { institutionId } : {}),
    ...(facultyId ? { facultyId } : {}),
    OR: [{ studentPhoneNormalized: contains }, { guardianPhoneNormalized: contains }],
  };
  return {
    studentProfiles: {
      some: profileWhere,
    },
  };
}

/**
 * JS re-verification for a phone-fetched candidate (the phone arm of the
 * students predicate — the name haystacks obviously don't contain a
 * phone query, so `searchHit` alone would drop every phone hit).
 */
export function phoneHit(
  profile: { studentPhoneNormalized: string | null; guardianPhoneNormalized: string | null } | undefined,
  plan: GlobalQueryPlan,
): boolean {
  if (!plan.isPhoneQuery || !plan.phoneDigits || !profile) return false;
  return (
    profile.studentPhoneNormalized?.includes(plan.phoneDigits) === true ||
    profile.guardianPhoneNormalized?.includes(plan.phoneDigits) === true
  );
}

// ─────────────────────────────────────────────────────────────────
//  Pagination
// ─────────────────────────────────────────────────────────────────

export const DEFAULT_GLOBAL_SEARCH_PAGE_SIZE = 10;
export const MAX_GLOBAL_SEARCH_PAGE_SIZE = 50;

/**
 * Parse `page` / `pageSize` leniently (an autocomplete surface must not
 * 400 on a stray param): non-numeric / out-of-range values fall back to
 * the defaults; pageSize is hard-capped at 50.
 */
export function parseGlobalSearchPagination(
  pageRaw: unknown,
  pageSizeRaw: unknown,
): { page: number; pageSize: number } {
  const coerce = (v: unknown, fallback: number, min: number, max: number): number => {
    const n = typeof v === 'string' ? Number.parseInt(v, 10) : typeof v === 'number' && Number.isInteger(v) ? v : Number.NaN;
    if (!Number.isFinite(n) || n < min) return fallback;
    return Math.min(n, max);
  };
  return {
    page: coerce(pageRaw, 1, 1, Number.MAX_SAFE_INTEGER),
    pageSize: coerce(pageSizeRaw, DEFAULT_GLOBAL_SEARCH_PAGE_SIZE, 1, MAX_GLOBAL_SEARCH_PAGE_SIZE),
  };
}

/** Candidate-window factor: fetch 5× pageSize candidates per category. */
const CANDIDATE_WINDOW_FACTOR = 5;
/** Hard cap — a broad query must never scan unbounded rows per category. */
const MAX_CANDIDATE_WINDOW = 250;

/**
 * The per-category candidate fetch limit: 5× pageSize (the mission's
 * window), grown so the window always covers the requested page (plus
 * one page of headroom for the JS re-verify to trim into), hard-capped.
 */
export function candidateTake(page: number, pageSize: number): number {
  return Math.min(
    Math.max(CANDIDATE_WINDOW_FACTOR * pageSize, (page + 1) * pageSize),
    MAX_CANDIDATE_WINDOW,
  );
}

/**
 * Rank + paginate the verified candidates of one category: order by rank
 * (exact < prefix < substring), tie-break deterministically (normalized
 * title, then id), then slice the requested page. `rankOf` returning
 * Infinity drops the row. `total` is the verified count within the
 * fetched candidate window — the honest number for this engine (the
 * fetch is windowed, so totals beyond the window are not claimed).
 */
export function rankAndPaginate<T>(
  candidates: readonly T[],
  rankOf: (row: T) => number,
  titleOf: (row: T) => string,
  idOf: (row: T) => string,
  page: number,
  pageSize: number,
): { items: T[]; total: number } {
  const ranked = candidates
    .filter((row) => rankOf(row) !== RANK_NONE)
    .map((row) => ({ row, rank: rankOf(row), title: titleOf(row), id: idOf(row) }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        (a.title < b.title ? -1 : a.title > b.title ? 1 : 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  const start = (page - 1) * pageSize;
  return { items: ranked.slice(start, start + pageSize).map((r) => r.row), total: ranked.length };
}

// ─────────────────────────────────────────────────────────────────
//  Hit hrefs (the courseHitHref convention — never a dead click)
// ─────────────────────────────────────────────────────────────────

/**
 * STUDENT-row destination per role — real surfaces from
 * frontend/src/lib/routes.ts only (App.tsx route table):
 *  · ADMIN → /admin/students (AdminStudentsPage — the registrar's roster)
 *  · TEACHER → /teacher/students (StudentsListPage — their enrolled students)
 *  · OWNER → /owner/users (OwnerUsersPage)
 *  · QUALITY → null (no quality students surface exists — plain row)
 *  · STUDENT → null (a student discovers no people; unreachable)
 */
export function studentHitHref(role: Role): string | null {
  switch (role) {
    case 'ADMIN': return '/admin/students';
    case 'TEACHER': return '/teacher/students';
    case 'OWNER': return '/owner/users';
    case 'QUALITY': return null;
    case 'STUDENT': return null;
  }
}

/**
 * TEACHER-row destination per role:
 *  · ADMIN → /admin/teachers (AdminTeachersPage)
 *  · QUALITY → /quality/professors (QualityProfessorsPage)
 *  · OWNER → /owner/users (OwnerUsersPage)
 *  · TEACHER → null (colleagues are name-only rows — no teacher-side
 *    colleague directory surface exists)
 *  · STUDENT → null (a student discovers no people; unreachable)
 */
export function teacherHitHref(role: Role): string | null {
  switch (role) {
    case 'ADMIN': return '/admin/teachers';
    case 'QUALITY': return '/quality/professors';
    case 'OWNER': return '/owner/users';
    case 'TEACHER': return null;
    case 'STUDENT': return null;
  }
}

/**
 * INSTITUTION-row destination: /colleges renders the CALLER's
 * institution's faculties (colleges.routes.ts resolveCollegesTarget —
 * the authed context wins), which is exactly the one institution a
 * non-OWNER scope can hit. OWNER gets null — they hold no institution
 * context, so /colleges would show the demo default, not the hit's
 * institution (a plain row beats a wrong destination).
 */
export function institutionHitHref(role: Role): string | null {
  switch (role) {
    case 'STUDENT':
    case 'TEACHER':
    case 'ADMIN':
    case 'QUALITY': return '/colleges';
    case 'OWNER': return null;
  }
}

/**
 * FACULTY-row destination: the public CollegeDetailPage
 * (/colleges/:id — world-readable per audit 4-A14; the id is the
 * faculty's cuid, exactly what the page's /colleges/:id fetch takes).
 */
export function facultyHitHref(facultyId: string): string {
  return `/colleges/${facultyId}`;
}

/**
 * ANNOUNCEMENT-row destination per role — the community surfaces that
 * mount the announcements feed (CommunityPage):
 *  · STUDENT → /community · TEACHER → /teacher/community
 *  · ADMIN → /admin/community · QUALITY → /quality/community
 *  · OWNER → null (the owner console has no community page;
 *    /owner/notifications is the alerts feed, not announcements)
 */
export function announcementHitHref(role: Role): string | null {
  switch (role) {
    case 'STUDENT': return '/community';
    case 'TEACHER': return '/teacher/community';
    case 'ADMIN': return '/admin/community';
    case 'QUALITY': return '/quality/community';
    case 'OWNER': return null;
  }
}

/* ── R350 S3 — the new kinds' hrefs (the file-less-paper law: a row
 * with no real destination for the role renders no link, never a dead
 * click) ──────────────────────────────────────────────────────────── */

/**
 * MATERIAL-row destination: STUDENT → the offering's course page (the
 * materials ride the course detail); TEACHER → their materials page;
 * oversight roles → null (no oversight materials surface exists).
 */
export function materialHitHref(role: Role, offeringId: string): string | null {
  switch (role) {
    case 'STUDENT': return `/student/courses/${offeringId}`;
    case 'TEACHER': return '/teacher/materials';
    case 'ADMIN':
    case 'QUALITY':
    case 'OWNER': return null;
  }
}

/**
 * BOOK-row destination: the library is STUDENT/TEACHER surfaces
 * (/student/library · /teacher/library — App.tsx role blocks); the
 * oversight roles get null (no console library page exists).
 */
export function bookHitHref(role: Role): string | null {
  switch (role) {
    case 'STUDENT': return '/student/library';
    case 'TEACHER': return '/teacher/library';
    case 'ADMIN':
    case 'QUALITY':
    case 'OWNER': return null;
  }
}

/** JOB-row destination: the board is the STUDENT surface (/student/jobs). */
export function jobHitHref(role: Role): string | null {
  switch (role) {
    case 'STUDENT': return '/student/jobs';
    case 'TEACHER':
    case 'ADMIN':
    case 'QUALITY':
    case 'OWNER': return null;
  }
}

/** CAMPUS-EVENT-row destination: /community (every authenticated role). */
export function eventHitHref(): string {
  return '/community';
}

/**
 * QUESTION-row destination: the staff bank surfaces — TEACHER → their
 * exams bank, QUALITY/ADMIN → the moderation queue; OWNER/STUDENT →
 * null (the owner console has no question surface; a student never
 * sees the bank at all — the scope nulls the whole category).
 */
export function questionHitHref(role: Role): string | null {
  switch (role) {
    case 'TEACHER': return '/teacher/exams';
    case 'QUALITY':
    case 'ADMIN': return '/quality/exam-moderation';
    case 'OWNER':
    case 'STUDENT': return null;
  }
}
