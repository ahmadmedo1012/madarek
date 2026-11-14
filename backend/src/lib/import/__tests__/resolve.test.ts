/**
 * R350 I-P0 — the import NAME resolver, pinned:
 *  · normaliseOrgName — tatweel/diacritics/ة-ه/ى-ي/whitespace folding;
 *  · levenshtein — the bounded classic;
 *  · resolveOrgName — exact → normalised → ≤2-edit suggestion → unknown
 *    (NEVER a silent reassignment);
 *  · orgResolutionErrorAr — actionable Arabic copy with the suggestion.
 */
import { describe, expect, it } from 'vitest';
import { normaliseOrgName, levenshtein, resolveOrgName, orgResolutionErrorAr, type NamedRef } from '../resolve.js';

const FACS: NamedRef[] = [
  { id: 'f1', name: 'كلية العلوم' },
  { id: 'f2', name: 'كلية الهندسة' },
  { id: 'f3', name: 'كلية الاقتصاد والعلوم الإدارية' },
];

describe('R350 I-P0 — normaliseOrgName', () => {
  it('folds tatweel, diacritics, ة→ه, ى→ي and whitespace', () => {
    expect(normaliseOrgName('كلّيـة العلـوم')).toBe('كليه العلوم');
    expect(normaliseOrgName('  كلية   العلوم  ')).toBe('كليه العلوم');
    expect(normaliseOrgName('كلية العلوم')).toBe('كليه العلوم');
  });
});

describe('R350 I-P0 — levenshtein', () => {
  it('measures the classic distances', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(levenshtein('كليه', 'كليب')).toBe(1);
  });
});

describe('R350 I-P0 — resolveOrgName', () => {
  it('exact match wins', () => {
    expect(resolveOrgName('كلية العلوم', FACS)).toEqual({ kind: 'exact', ref: FACS[0] });
  });

  it('normalised match survives tatweel/diacritics/spacing drift', () => {
    const res = resolveOrgName(' كلّيـة  العلـوم ', FACS);
    expect(res.kind).toBe('normalised');
    expect((res as { ref: NamedRef }).ref.id).toBe('f1');
  });

  it('a ≤2-edit miss becomes a SUGGESTION, never a match', () => {
    const res = resolveOrgName('كلية العلومم', FACS); // one extra م
    expect(res.kind).toBe('suggestion');
    expect((res as { ref: NamedRef }).ref.id).toBe('f1');
  });

  it('a real unknown stays unknown', () => {
    expect(resolveOrgName('كلية الطب', FACS).kind).toBe('unknown');
  });
});

describe('R350 I-P0 — orgResolutionErrorAr', () => {
  it('the suggestion surfaces in the copy', () => {
    const msg = orgResolutionErrorAr('faculty', 'كلية العلومم', { kind: 'suggestion', ref: FACS[0]! });
    expect(msg).toContain('هل تقصد');
    expect(msg).toContain('كلية العلوم');
  });

  it('the unknown copy names the escape hatches', () => {
    const msg = orgResolutionErrorAr('department', 'قسم النظريات', { kind: 'unknown' });
    expect(msg).toContain('قسم غير معروف');
    expect(msg).toContain('قسم النظريات');
    expect(msg).toContain('الأقسام');
  });
});
