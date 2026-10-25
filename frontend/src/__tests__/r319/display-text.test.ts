/**
 * R319 C1-C — utils/display-text.ts pins (§B2 data-leak line + §E-10
 * leak-scan foundations).
 *
 * The owner's real-iPhone screenshot carried, in ONE header line:
 * «مساء النور، J — كلية تقنية المعلومات · قسم اختبار · السنة 8 · r180»
 * (a single-letter seed name, a TEST department, a raw revision code),
 * plus «01/15 وينتهي 09/10» (Latin-digit numeric dates in odd order)
 * and «36% من الفصل». These pins hold the durable fixes:
 *  - sanitizeVisibleText: revision codes stripped, whitespace collapsed,
 *    junk inputs ('undefined'/'null'/'NaN'/null) → '';
 *  - sanitizeInstitutionName: the placeholder NAME shapes («قسم اختبار»,
 *    «كلية اختبار», bare «اختبار») drop to '' — while the WORD اختبار
 *    survives in prose (exam contexts) because it is a real Arabic word;
 *  - oneNumeralSystem: ONE numeral system per the site convention —
 *    Latin 0-9 (numbers.ts 'ar-LY-u-nu-latn', countAr's `${n}`, the
 *    «5 مارس 2026» dates) — tested BOTH directions (Arabic-Indic →
 *    Latin, Latin stays Latin);
 *  - arDate: real Intl.DateTimeFormat('ar-LY') dates with the calendar
 *    and numbering pinned (gregory + latn), stable across ICU builds —
 *    pinned at fixed UTC instants (the suite runs TZ=UTC).
 */
import { describe, expect, it } from 'vitest';
import {
  arDate,
  oneNumeralSystem,
  PLACEHOLDER_INSTITUTION_RE,
  REVISION_CODE_RE,
  sanitizeInstitutionName,
  sanitizeVisibleText,
} from '../../utils/display-text';

/* ── sanitizeVisibleText — revision codes + hygiene ─────────────── */

describe('sanitizeVisibleText — revision codes never render', () => {
  it('strips the rNNN tokens the seed leaked into the header', () => {
    // The exact tail of the owner's screenshot line.
    expect(sanitizeVisibleText('كلية تقنية المعلومات · السنة 8 · r180'))
      .toBe('كلية تقنية المعلومات · السنة 8');
    expect(sanitizeVisibleText('r305')).toBe('');
  });

  it('strips 2- and 3-digit codes on word boundaries only', () => {
    expect(sanitizeVisibleText('r19 r180 r319')).toBe('');
    // 4+ digits are data (r1234-style tokens are not revision codes)…
    expect(sanitizeVisibleText('r1234')).toBe('r1234');
    // …and the letter r inside a word is never a code.
    expect(sanitizeVisibleText('مقرّر')).toBe('مقرّر');
  });

  it('keeps every other character — real words survive untouched', () => {
    expect(sanitizeVisibleText('قسم علوم الحاسوب')).toBe('قسم علوم الحاسوب');
    // «اختبار» is a REAL word (exam) — never stripped by the generic pass.
    expect(sanitizeVisibleText('اختبار')).toBe('اختبار');
    expect(sanitizeVisibleText('قاعة الاختبار')).toBe('قاعة الاختبار');
  });

  it('collapses whitespace runs the code-stripping leaves behind', () => {
    expect(sanitizeVisibleText('قسم  اختبار\t r180 \n علوم')).toBe('قسم اختبار علوم');
    expect(sanitizeVisibleText('  مرحبا   بالعالم  ')).toBe('مرحبا بالعالم');
  });

  it('returns "" for junk inputs instead of rendering them', () => {
    expect(sanitizeVisibleText(null)).toBe('');
    expect(sanitizeVisibleText(undefined)).toBe('');
    expect(sanitizeVisibleText('undefined')).toBe('');
    expect(sanitizeVisibleText('null')).toBe('');
    expect(sanitizeVisibleText('NaN')).toBe('');
    expect(sanitizeVisibleText('   ')).toBe('');
  });
});

/* ── sanitizeInstitutionName — placeholder NAME guard ───────────── */

describe('sanitizeInstitutionName — seed placeholder names drop to ""', () => {
  it('drops the exact placeholder shapes (the owner\'s «قسم اختبار»)', () => {
    expect(sanitizeInstitutionName('قسم اختبار')).toBe('');
    expect(sanitizeInstitutionName('كلية اختبار')).toBe('');
    expect(sanitizeInstitutionName('اختبار')).toBe('');
  });

  it('drops the poisoned combo from the e2e proof: code + placeholder', () => {
    expect(sanitizeInstitutionName('قسم اختبار r180')).toBe('');
    expect(sanitizeInstitutionName('كلية اختبار r305')).toBe('');
  });

  it('keeps REAL institution names (and strips only their codes)', () => {
    expect(sanitizeInstitutionName('كلية تقنية المعلومات')).toBe('كلية تقنية المعلومات');
    expect(sanitizeInstitutionName('قسم علوم الحاسوب')).toBe('قسم علوم الحاسوب');
    expect(sanitizeInstitutionName('كلية الهندسة r319')).toBe('كلية الهندسة');
  });

  it('null-safety mirrors sanitizeVisibleText', () => {
    expect(sanitizeInstitutionName(null)).toBe('');
    expect(sanitizeInstitutionName(undefined)).toBe('');
    expect(sanitizeInstitutionName('undefined')).toBe('');
  });

  it('the exported gate pattern matches exactly the placeholder shapes', () => {
    expect(PLACEHOLDER_INSTITUTION_RE.test('قسم اختبار')).toBe(true);
    expect(PLACEHOLDER_INSTITUTION_RE.test('كلية اختبار')).toBe(true);
    expect(PLACEHOLDER_INSTITUTION_RE.test('قسم علوم الحاسوب')).toBe(false);
    expect(PLACEHOLDER_INSTITUTION_RE.test('قاعة الاختبار')).toBe(false);
  });
});

/* ── oneNumeralSystem — Latin everywhere (the site convention) ──── */

describe('oneNumeralSystem — one numeral system: Latin 0-9', () => {
  it('folds Arabic-Indic digits to Latin (the «36%» defect direction)', () => {
    expect(oneNumeralSystem('٣٦% من الفصل')).toBe('36% من الفصل');
    expect(oneNumeralSystem('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('folds Persian digits too (backend/data drift defense)', () => {
    expect(oneNumeralSystem('۰۹')).toBe('09');
    expect(oneNumeralSystem('۱۲۳۴')).toBe('1234');
  });

  it('leaves Latin digits and Arabic text untouched (idempotent both ways)', () => {
    expect(oneNumeralSystem('36% من الفصل')).toBe('36% من الفصل');
    expect(oneNumeralSystem('السنة 8')).toBe('السنة 8');
    expect(oneNumeralSystem(oneNumeralSystem('٣٦'))).toBe('36');
  });

  it('null-safety: never renders junk', () => {
    expect(oneNumeralSystem(null)).toBe('');
    expect(oneNumeralSystem(undefined)).toBe('');
  });
});

/* ── arDate — real ar-LY dates (gregory + latn pinned) ──────────── */

describe('arDate — real Intl.DateTimeFormat("ar-LY") dates', () => {
  // Fixed UTC instants (suite runs TZ=UTC): the e2e fixture's term
  // dates derive from FIXED_NOW 2026-03-15T10:00Z ±days.
  const TERM_START = '2026-02-01T10:00:00.000Z'; // iso(-24*42)
  const TERM_END = '2026-05-24T10:00:00.000Z'; // iso(+24*70)

  it('renders day + Arabic month with Latin digits (the term-date shape)', () => {
    expect(arDate(TERM_START, { day: 'numeric', month: 'long' })).toBe('1 فبراير');
    expect(arDate(TERM_END, { day: 'numeric', month: 'long' })).toBe('24 مايو');
  });

  it('renders day + month + year when asked', () => {
    expect(arDate(TERM_END, { day: 'numeric', month: 'long', year: 'numeric' }))
      .toBe('24 مايو 2026');
  });

  it('never emits Arabic-Indic digits (ar-LY default is latn; ours is pinned)', () => {
    const out = arDate(TERM_END, { day: 'numeric', month: 'long', year: 'numeric' });
    expect(out).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
  });

  it('returns "" for invalid input — never "Invalid Date"', () => {
    expect(arDate('not-a-date')).toBe('');
    expect(arDate('')).toBe('');
  });

  it('the numeric 2-digit shape it replaces rendered the «01/15» defect', () => {
    // Contract pin: the OLD shape (day 2-digit + month 2-digit on the
    // same locale) renders Latin digits in slash order with an
    // invisible RLM — exactly what the owner photographed. arDate's
    // prose shapes never contain a slash run.
    const old = new Intl.DateTimeFormat('ar-LY', {
      day: '2-digit', month: '2-digit',
    }).format(new Date(TERM_START));
    expect(old).toMatch(/^\d{2}\u200F\/\d{2}$/);
    expect(arDate(TERM_START, { day: 'numeric', month: 'long' })).not.toContain('/');
  });
});

/* ── the gate's own regexes stay exportable ─────────────────────── */

describe('§E-10 gate plumbing — shared patterns', () => {
  it('REVISION_CODE_RE is the global rNNN scanner', () => {
    expect('… · r180'.match(REVISION_CODE_RE)).toEqual(['r180']);
    expect('r305 r19'.match(REVISION_CODE_RE)).toEqual(['r305', 'r19']);
    expect(REVISION_CODE_RE.test('r305')).toBe(true);
    expect(REVISION_CODE_RE.test('r3050')).toBe(false);
  });
});
