import { describe, it, expect } from 'vitest';
import { normalizeArabicSearch, stripAlPrefix } from '../normalize.js';

describe('normalizeArabicSearch', () => {
  it('lowercases ASCII input', () => {
    expect(normalizeArabicSearch('CISCO')).toBe('cisco');
    expect(normalizeArabicSearch('Cisco')).toBe('cisco');
  });

  it('strips Arabic diacritics (تشكيل)', () => {
    expect(normalizeArabicSearch('خَوَارِزْمِيَات')).toBe('خوارزميات');
    expect(normalizeArabicSearch('بَرْمَجَة')).toBe('برمجه');
  });

  it('folds alif variants (آأإٱ → ا)', () => {
    expect(normalizeArabicSearch('آلة')).toBe('اله');
    expect(normalizeArabicSearch('أحمد')).toBe('احمد');
    expect(normalizeArabicSearch('إدارة')).toBe('اداره');
  });

  it('folds taa-marbuta (ة → ه)', () => {
    expect(normalizeArabicSearch('خوارزمية')).toBe('خوارزميه');
    expect(normalizeArabicSearch('جامعة')).toBe('جامعه');
  });

  it('folds alif-maqsura (ى → ي)', () => {
    expect(normalizeArabicSearch('على')).toBe('علي');
    expect(normalizeArabicSearch('مستشفى')).toBe('مستشفي');
  });

  it('folds yaa-hamza (ئ → ي) and waw-hamza (ؤ → و)', () => {
    expect(normalizeArabicSearch('شئون')).toBe('شيون');
    expect(normalizeArabicSearch('سؤال')).toBe('سوال');
  });

  it('drops tatweel and bare hamza', () => {
    expect(normalizeArabicSearch('شـبـكـة')).toBe('شبكه');
    expect(normalizeArabicSearch('سماء')).toBe('سما');
  });

  it('NFC-normalizes decomposed sequences', () => {
    const decomposed = 'á'; // a + combining acute
    expect(normalizeArabicSearch(decomposed).length).toBeLessThanOrEqual(decomposed.length);
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeArabicSearch('   خوارزميات   ')).toBe('خوارزميات');
  });

  it('is idempotent for every supported transformation', () => {
    const fixtures = [
      'CISCO',
      'خَوَارِزْمِيَات',
      'الخوارزميات',
      'آلة',
      'مؤسسة الزاوية التعليمية',
      'علي على شئون',
      '   فِيزِيَاء   ',
    ];
    for (const f of fixtures) {
      const once = normalizeArabicSearch(f);
      const twice = normalizeArabicSearch(once);
      expect(twice).toBe(once);
    }
  });
});

describe('stripAlPrefix', () => {
  it('strips a leading ال', () => {
    expect(stripAlPrefix('الخوارزميات')).toBe('خوارزميات');
    expect(stripAlPrefix('الجامعه')).toBe('جامعه');
  });

  it('leaves strings without ال unchanged', () => {
    expect(stripAlPrefix('خوارزميات')).toBe('خوارزميات');
    expect(stripAlPrefix('cisco')).toBe('cisco');
  });

  it('only strips a leading ال — never a medial one', () => {
    // Starts with ع, not ا — must be returned unchanged.
    expect(stripAlPrefix('علم البرمجه')).toBe('علم البرمجه');
    // Single leading ال is stripped.
    expect(stripAlPrefix('الالكترونيات')).toBe('الكترونيات');
  });
});

/* ════════════════════════════════════════════════════════════════
 * R350 S2 — the v2 corpus: digits, zero-width, clitics, variants.
 * ════════════════════════════════════════════════════════════════ */
import { stripCliticPrefix, matchVariants, matchesNormalizedQuery } from '../normalize.js';

describe('R350 S2 — normalizeArabicSearch v2 folds', () => {
  it('folds Eastern-Arabic and Persian digits to Latin', () => {
    expect(normalizeArabicSearch('١٢٣٤٥')).toBe('12345');
    expect(normalizeArabicSearch('۹۲۵۴۱۷۰')).toBe('9254170');
    // mixed with letters: an ID typed on the Arabic keyboard
    expect(normalizeArabicSearch('رقم ٠٩٢٥١٢٣٤٥')).toBe('رقم 092512345');
  });

  it('strips zero-width joiners/non-joiners/BOM smuggled into pasted text', () => {
    expect(normalizeArabicSearch('كلية\u200bالهندسة')).toBe('كليه الهندسه'.replaceAll(' ', ''));
    expect(normalizeArabicSearch('مدارك\ufeff')).toBe('مدارك');
  });

  it('keeps the v1 fold byte-stable (regression net)', () => {
    expect(normalizeArabicSearch('ٱلْخُوَارِزْمِيَّات')).toBe('الخوارزميات');
    expect(normalizeArabicSearch('مـقـررات')).toBe('مقررات');
    expect(normalizeArabicSearch('أحمد')).toBe('احمد');
    // the v1 hamza fold (ء → '') applies word-finally too: علياء → عليا.
    expect(normalizeArabicSearch('علياء')).toBe('عليا');
  });
});

describe('R350 S2 — stripCliticPrefix (the clitic tolerance)', () => {
  it('strips و/ب/ل/ف/ك carrying or bare, longest first', () => {
    expect(stripCliticPrefix('والكلية')).toBe('كلية');
    expect(stripCliticPrefix('للطلاب')).toBe('طلاب');
    expect(stripCliticPrefix('بالاختبار')).toBe('اختبار');
    expect(stripCliticPrefix('كالجامعة')).toBe('جامعة');
    expect(stripCliticPrefix('ومقرر')).toBe('مقرر');
  });

  it('never strips a particle into a sub-2-char remainder', () => {
    expect(stripCliticPrefix('و')).toBe('و');
    expect(stripCliticPrefix('لا')).toBe('لا');
    // 'وال' keeps only the bare-particle strip (و → ال): the full 'وال' strip
    // would leave a 0-char remainder.
    expect(stripCliticPrefix('وال')).toBe('ال');
  });
});

describe('R350 S2 — matchVariants + matchesNormalizedQuery v2', () => {
  it('matchVariants yields the full tolerance ladder, no duplicates', () => {
    expect(matchVariants('والكلية')).toEqual(['والكلية', 'كلية']);
    expect(matchVariants('الخوارزميات')).toEqual(['الخوارزميات', 'خوارزميات']);
    expect(matchVariants('')).toEqual([]);
  });

  it('a cliticated query still matches the bare stored term', () => {
    expect(matchesNormalizedQuery('كلية الهندسة', 'والكلية')).toBe(true);
    expect(matchesNormalizedQuery('قسم الحاسوب', 'للقسم')).toBe(true);
    expect(matchesNormalizedQuery('اختبار المنتصف', 'بالاختبار')).toBe(true);
  });

  it('Eastern-digit IDs match their Latin-stored columns', () => {
    expect(matchesNormalizedQuery('092512345', '٠٩٢٥١٢٣٤٥')).toBe(true);
  });
});
