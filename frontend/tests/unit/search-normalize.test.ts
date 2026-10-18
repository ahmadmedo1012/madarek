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
  matchesQueryTokens,
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

/* 5-C4 (A10 P2-4) — the quick-action word-level matcher. The audit's
   live failures were: word order («الاختبارات بنك» → empty), a one-edit
   plural drift («درجات الطالب» → «درجات الطلاب» = 0 rows), and the
   colloquial exam word («امتحنات» → empty; product vocabulary is
   «اختبار», nav.ts D17-1). */
describe('matchesQueryTokens (quick-action word matching)', () => {
  it('single-word queries keep the substring contract (foldings + ال)', () => {
    expect(matchesQueryTokens('الاختبارات الإلكترونية', 'إختبار')).toBe(true);
    expect(matchesQueryTokens('شبكات الحاسوب', 'خوارزميات')).toBe(false);
    expect(matchesQueryTokens('شبكات الحاسوب', '')).toBe(false);
  });

  it('folds the singular to the plural — مسابقة finds المسابقات (r183-B6, A4 P3-5)', () => {
    // A4's live miss: typing the singular feature word answered zero
    // rows because the nav labels carry the plurals.
    expect(matchesQueryTokens('المسابقات الأكاديميّة', 'مسابقة')).toBe(true);
    // The sound-feminine fold rides the ة→ات pattern.
    expect(matchesQueryTokens('كلّيّات الجامعة', 'كلية')).toBe(true);
    // Unrelated labels stay unmatched — the fold widens, it never bridges.
    expect(matchesQueryTokens('المكتبة الإلكترونية', 'مسابقة')).toBe(false);
    expect(matchesQueryTokens('شبكات الحاسوب', 'جامعة')).toBe(false);
  });

  it('folds the singular to the BROKEN plural — رساله finds الرسائل (r183-B6, A4 P3-5)', () => {
    // رسالة → رسائل (فَعائل): both sides normalize (ة→ه, ئ→ي) and the
    // candidate fold bridges the drift.
    expect(matchesQueryTokens('الرسائل', 'رساله')).toBe(true);
    expect(matchesQueryTokens('الرسائل', 'رسالة')).toBe(true);
    // The reverse direction rides the token-side fold.
    expect(matchesQueryTokens('الرسائل', 'رسائل')).toBe(true);
    // Unrelated label — no leak through the fold.
    expect(matchesQueryTokens('المساعد الذكي', 'رسالة')).toBe(false);
  });

  it('multiword matches word-order-insensitively (every query word hits some token)', () => {
    // The audit's example: reversed word order found nothing before.
    expect(matchesQueryTokens('بنك الأسئلة والاختبارات', 'الاختبارات بنك')).toBe(true);
    expect(matchesQueryTokens('درجات الطلاب', 'درجات الطالب')).toBe(true);
    // Every word must hit — one shared word is not enough.
    expect(matchesQueryTokens('بنك الأسئلة والاختبارات', 'الاختبارات مكتبة')).toBe(false);
  });

  it('folds the colloquial exam vocabulary to the product term', () => {
    expect(matchesQueryTokens('بنك الأسئلة والاختبارات', 'امتحنات')).toBe(true);
    expect(matchesQueryTokens('الاختبارات الإلكترونية', 'امتحان')).toBe(true);
    // The alias only bridges the vocabulary — it never matches unrelated labels.
    expect(matchesQueryTokens('المكتبة الإلكترونية', 'امتحان')).toBe(false);
  });

  it('one-edit tolerance is gated to 4+ letter words and cannot leak prepositions', () => {
    // «طالب»↔«طلاب» is one adjacent-letter transposition.
    expect(matchesQueryTokens('قائمة الطلاب', 'طلاب')).toBe(true); // plain substring
    expect(matchesQueryTokens('قائمة الطلاب', 'قائمة الطالب')).toBe(true); // transposition
    // «في» is too short to bridge by containment.
    expect(matchesQueryTokens('الشبكة الاجتماعية', 'تصفية الواجهة')).toBe(false);
  });
});
