/**
 * Backend unit test — search normalization helpers from
 * `backend/src/modules/search/normalize.ts` (canonical Arabic-aware
 * foldings + read-time matcher) as wired into `search.routes.ts`.
 *
 * DB-free: mirrors the style of `tests/modules/theme-schema.test.ts`.
 * The co-located normalize suite under `src/modules/search/__tests__`
 * runs too (vitest.config.ts collects BOTH the top-level tests tree
 * and the co-located src test suites); the two intentionally overlap
 * on the core foldings — this one pins the assertions that matter for
 * the route's find-then-reverify wiring, the co-located one is the
 * exhaustive catalogue (hamza/yaa/waw variants, NFC decomposition).
 */
import { describe, expect, it } from 'vitest';
import {
  matchesNormalizedQuery,
  normalizeArabicSearch,
  stripAlPrefix,
} from '../../src/modules/search/normalize';

describe('normalizeArabicSearch', () => {
  it('is idempotent (property required by the search contract)', () => {
    const fixtures = ['خوارزميات', 'الخوارزِميَات', 'Cisco', 'هندسة البرمجيات', 'محمد', '　mixed ABC'];
    for (const f of fixtures) {
      expect(normalizeArabicSearch(normalizeArabicSearch(f))).toBe(normalizeArabicSearch(f));
    }
  });

  it('strips Arabic diacritics', () => {
    expect(normalizeArabicSearch('خوارزِميَات')).toBe(normalizeArabicSearch('خوارزميات'));
  });

  it('strips tatweel', () => {
    expect(normalizeArabicSearch('مهـــندس')).toBe(normalizeArabicSearch('مهندس'));
  });

  it('folds alif variants to plain ا', () => {
    expect(normalizeArabicSearch('أحمد')).toBe(normalizeArabicSearch('احمد'));
    expect(normalizeArabicSearch('إبراهيم')).toBe(normalizeArabicSearch('ابراهيم'));
    expect(normalizeArabicSearch('آمنة')).toBe(normalizeArabicSearch('امنة'));
  });

  it('folds ة → ه and ى → ي', () => {
    expect(normalizeArabicSearch('جامعة')).toBe(normalizeArabicSearch('جامعه'));
    expect(normalizeArabicSearch('على')).toBe(normalizeArabicSearch('علي'));
  });

  it('lowercases ASCII', () => {
    expect(normalizeArabicSearch('Cisco')).toBe('cisco');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeArabicSearch('  خوارزميات  ')).toBe('خوارزميات');
  });
});

describe('stripAlPrefix', () => {
  it('strips a leading ال', () => {
    expect(stripAlPrefix('الخوارزميات')).toBe('خوارزميات');
  });

  it('leaves strings without the prefix untouched', () => {
    expect(stripAlPrefix('خوارزميات')).toBe('خوارزميات');
    expect(stripAlPrefix('cisco')).toBe('cisco');
  });

  it('does not strip ال that is part of the root (only leading)', () => {
    // Only a LEADING ال is removed — mid-string ال stays.
    expect(stripAlPrefix('ساللم')).toBe('ساللم');
  });
});

describe('matchesNormalizedQuery', () => {
  it('matches a raw Arabic substring', () => {
    expect(matchesNormalizedQuery('خوارزميات متقدمة', 'خوارزم')).toBe(true);
  });

  it('matches through diacritics in the haystack', () => {
    expect(matchesNormalizedQuery('خوارزِميَات متقدمة', 'خوارزميات')).toBe(true);
  });

  it('matches a query typed with alif variants against plain-ا text', () => {
    // The query must be pre-normalized (the route passes qN) — fold أ → ا first.
    expect(matchesNormalizedQuery('احمد عبدالله', normalizeArabicSearch('أحمد'))).toBe(true);
  });

  it('matches taa-marbuta folding (ة vs ه)', () => {
    expect(matchesNormalizedQuery('جامعة الزاوية', 'جامعه')).toBe(true);
  });

  it('matches with the ال prefix tolerance', () => {
    expect(matchesNormalizedQuery('خوارزميات متقدمة', 'الخوارزميات')).toBe(true);
  });

  it('matches case-insensitively for ASCII (query must be pre-normalized)', () => {
    expect(matchesNormalizedQuery('Cisco Networking', 'cisco')).toBe(true);
    expect(matchesNormalizedQuery('Cisco Networking', normalizeArabicSearch('CISCO'))).toBe(true);
  });

  it('does NOT match unrelated text (no fuzzy at read-time)', () => {
    expect(matchesNormalizedQuery('شبكات الحاسوب', 'خوارزميات')).toBe(false);
    expect(matchesNormalizedQuery('xyz', 'cisco')).toBe(false);
  });

  it('returns false for an empty normalized query', () => {
    expect(matchesNormalizedQuery('anything', '')).toBe(false);
  });
});
