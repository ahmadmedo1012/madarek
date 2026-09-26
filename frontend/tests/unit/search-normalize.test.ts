/**
 * lib/search.ts — the FE mirror of the backend's canonical Arabic
 * search normalizer (backend/src/modules/search/normalize.ts).
 *
 * These cases mirror the backend's own normalize.test.ts assertions:
 * if the two implementations ever drift, the command palette / search
 * pill quick-actions will answer differently from /search/global for
 * the same term — exactly the A4 P2-4 inconsistency 5-B5 removed.
 */
import { describe, expect, it } from 'vitest';
import {
  normalizeArabicSearch,
  stripAlPrefix,
  matchesNormalizedQuery,
} from '../../src/lib/search';

describe('normalizeArabicSearch (mirrors backend/src/modules/search/normalize.ts)', () => {
  it('lowercases Latin and trims', () => {
    expect(normalizeArabicSearch('CISCO')).toBe('cisco');
    expect(normalizeArabicSearch('   خوارزميات   ')).toBe('خوارزميات');
  });

  it('strips diacritics and tatweel', () => {
    expect(normalizeArabicSearch('خَوَارِزْمِيَات')).toBe('خوارزميات');
    expect(normalizeArabicSearch('شـبـكـة')).toBe('شبكه');
  });

  it('folds alif/hamza variants to plain alif', () => {
    expect(normalizeArabicSearch('آلة')).toBe('اله');
    expect(normalizeArabicSearch('أحمد')).toBe('احمد');
    expect(normalizeArabicSearch('إدارة')).toBe('اداره');
  });

  it('folds ى→ي and ة→ه', () => {
    expect(normalizeArabicSearch('جامعة')).toBe('جامعه');
    expect(normalizeArabicSearch('مستشفى')).toBe('مستشفي');
  });

  it('is idempotent (safe to run on already-normalized text)', () => {
    const once = normalizeArabicSearch('خوارزميات متقدّمة');
    expect(normalizeArabicSearch(once)).toBe(once);
  });
});

describe('stripAlPrefix', () => {
  it('strips a leading definite article, keeps everything else', () => {
    expect(stripAlPrefix('الخوارزميات')).toBe('خوارزميات');
    expect(stripAlPrefix('خوارزميات')).toBe('خوارزميات');
    expect(stripAlPrefix('اولي')).toBe('اولي'); // natural ال — not an article
  });
});

describe('matchesNormalizedQuery', () => {
  it('matches through hamza, diacritics and the definite article', () => {
    expect(matchesNormalizedQuery('الاختبارات الإلكترونية', 'إختبار')).toBe(true);
    expect(matchesNormalizedQuery('خوارزميات متقدمة', 'الخوارزميات')).toBe(true);
    expect(matchesNormalizedQuery('Cisco Networking', 'CISCO')).toBe(true);
  });

  it('does not match absent terms', () => {
    expect(matchesNormalizedQuery('شبكات الحاسوب', 'خوارزميات')).toBe(false);
    expect(matchesNormalizedQuery('شبكات الحاسوب', '')).toBe(false);
  });
});
