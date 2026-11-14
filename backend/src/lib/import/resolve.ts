/**
 * R350 I-P0/I3 — faculty/department NAME resolution for the import:
 * exact → normalised (whitespace/ال-tolerant) → Levenshtein suggestion,
 * with an explicit createIfMissing path — the silent fall-back-to-the-
 * first-faculty mis-assignment dies here.
 *
 * Pure functions (the route owns the DB); pinned by resolve.test.ts.
 */

/** Normalise an Arabic institutional name for matching: collapse
 * whitespace, strip tatweel/diacritics, unify ي/ى and ة/ه, drop the
 * definite article's spacing variance. */
export function normaliseOrgName(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0640\u200B-\u200D\uFEFF]/g, '') // diacritics + tatweel + ZW
    .replace(/[ىي]/g, 'ي')
    .replace(/[ةه]/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Classic bounded Levenshtein (small strings — O(n·m) is fine). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

export interface NamedRef {
  id: string;
  name: string;
}

export type OrgResolution<T extends NamedRef> =
  | { kind: 'exact'; ref: T }
  | { kind: 'normalised'; ref: T }
  | { kind: 'suggestion'; ref: T }
  | { kind: 'unknown'; suggestion?: T };

/** Resolve one file-side name against the DB list.
 *  · exact trimmed match wins;
 *  · then the normalised match (ال-spacing/ة-ه/ى-ي/tatweel tolerant);
 *  · then a ≤2-edit suggestion (returned for the error copy, NOT used);
 *  · else unknown — the caller errors or creates, never silently
 *    reassigns. */
export function resolveOrgName<T extends NamedRef>(name: string, refs: T[]): OrgResolution<T> {
  const trimmed = name.trim();
  const exact = refs.find((r) => r.name.trim() === trimmed);
  if (exact) return { kind: 'exact', ref: exact };
  const norm = normaliseOrgName(trimmed);
  const normalised = refs.find((r) => normaliseOrgName(r.name) === norm);
  if (normalised) return { kind: 'normalised', ref: normalised };
  let best: { ref: T; d: number } | null = null;
  for (const r of refs) {
    const d = levenshtein(norm, normaliseOrgName(r.name));
    if (d <= 2 && (best === null || d < best.d)) best = { ref: r, d };
  }
  if (best) return { kind: 'suggestion', ref: best.ref };
  return { kind: 'unknown' };
}

/** The Arabic resolution copy for the preview/commit errors. */
export function orgResolutionErrorAr(kind: 'faculty' | 'department', name: string, res: { kind: string; ref?: NamedRef }): string {
  const label = kind === 'faculty' ? 'كلية' : 'قسم';
  if (res.kind === 'suggestion' && res.ref) {
    return `${label} غير معروف: «${name}» — هل تقصد «${res.ref.name}»؟ صحّح الملف أو فعّل إنشاء الكليات الجديدة`;
  }
  return `${label} غير معروف: «${name}» — أضفه من إدارة الكليات أو فعّل إنشاء ${kind === 'faculty' ? 'الكليات' : 'الأقسام'} الجديدة عند الاستيراد`;
}
