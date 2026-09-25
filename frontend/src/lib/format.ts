/**
 * Shared Arabic formatting helpers (wave 9-a; extended in 13-15 per
 * audit 11-f P2-1 / D13).
 *
 * Single source for the helpers that were previously copied verbatim
 * across ~10 page files (countAr ×6, formatRelative ×9 — flags from
 * waves 5-a/6-a/6-b). Every signature and output string is identical
 * to the copies it replaces; pages keep their exact rendered copy.
 *
 * The 13-15 extension folds the remaining page-local datetime/format
 * helpers (arUnit, timeAgoAr, the fmtDate family, formatDateTime,
 * the mm:ss media clock and the Arabic weekday names) — all moved
 * verbatim from the pages that owned them.
 */

/** Proper Arabic counted nouns: [one, two, few (3–10), many (11+)]. */
export function countAr(n: number, forms: [string, string, string, string]): string {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  if (n >= 3 && n <= 10) return `${n} ${forms[2]}`;
  return `${n} ${forms[3]}`;
}

/**
 * Relative past time with counted Arabic plurals and a calendar-date
 * fallback past the week mark ("الآن" → "منذ دقيقتين" → "منذ 3 ساعات"
 * → "منذ 5 أيام" → ar-LY medium date).
 */
export function formatRelativeAr(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${countAr(diffMin, ['دقيقة', 'دقيقتين', 'دقائق', 'دقيقة'])}`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `منذ ${countAr(diffHr, ['ساعة', 'ساعتين', 'ساعات', 'ساعة'])}`;
  const diffD = Math.round(diffHr / 24);
  if (diffD < 7) return `منذ ${countAr(diffD, ['يوم', 'يومين', 'أيام', 'يوماً'])}`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

/**
 * Compact relative past time ("منذ 3 دقيقة" style — plain numerals,
 * no counted plurals, no date fallback). Kept as its own export so the
 * pages that already shipped this wording keep their exact copy.
 */
export function formatRelativeArShort(iso: string): string {
  const d = new Date(iso);
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.round(h / 24)} يوم`;
}

/**
 * Arabic weekday names, Sunday-first — the index contract of
 * Date#getDay() and the API's schedule `dayOfWeek` field. Was copied
 * as DAYS / DAY_NAMES / WEEKDAYS across four page files.
 */
export const WEEKDAY_NAMES_AR: string[] = [
  'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت',
];

/**
 * Proper Arabic counted nouns in the 3-form contract the pages use
 * (1 → singular, 2 → dual, 3–10 → plural, 11+ → singular again).
 *
 * Kept as its own export next to countAr, NOT folded into it: countAr
 * takes a 4-form tuple and renders `many` for 11+ / `many` for 0,
 * while this variant reuses the singular for 11+ and the plural for 0
 * ("0 إشعارات غير مقروءة"). The two contracts are not interchangeable.
 */
export function arUnit(n: number, one: string, two: string, few: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${n} ${few}`;
  return `${n} ${one}`;
}

/**
 * Relative past time with counted Arabic plurals and a short calendar
 * fallback past the week mark ("الآن" → "منذ دقيقتين" → "منذ 3 ساعات"
 * → "منذ 5 أيام" → day+month ar-LY date).
 *
 * Kept separate from formatRelativeAr (wave 9-a), which it predates on
 * the posts/notifications surfaces: this variant treats anything under
 * a full minute of elapsed seconds as "الآن" (vs formatRelativeAr's
 * 30-second rounding window) and falls back to a short date instead of
 * a medium one. Outputs must stay exactly as shipped.
 */
export function timeAgoAr(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'الآن';
  const m = Math.round(s / 60);
  if (m < 60) return `منذ ${arUnit(m, 'دقيقة', 'دقيقتين', 'دقائق')}`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${arUnit(h, 'ساعة', 'ساعتين', 'ساعات')}`;
  const d = Math.round(h / 24);
  if (d < 7) return `منذ ${arUnit(d, 'يوم', 'يومين', 'أيام')}`;
  return new Date(iso).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' });
}

/**
 * Short ar-LY date (day + month, e.g. "12 مارس"); "—" for missing
 * values. The null convention comes from the research pages.
 */
export function formatDateAr(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' });
}

/**
 * Short ar-LY date with the year (day + month + year); "—" for
 * missing values — the research-upload wording on ResearchPage.
 */
export function formatDateWithYearAr(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * ar-LY medium date + short time, for timestamps where the clock
 * matters (events, live sessions). Verbatim of the former local
 * helpers in CollegePages + OwnerSystemPage.
 */
export function formatDateTimeAr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Zero-padded m:ss clock for media positions and countdowns
 * (754 → "12:34"). Deliberately NOT curriculumValidation.formatSec,
 * which promotes to h:mm:ss past the hour (3661 → "1:01:01" vs
 * "61:01" here) — the two surfaces render different clocks by design.
 */
export function formatMmSs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Extract the API's own error message when present and sane. */
export function apiErrorDetail(error: unknown): string | null {
  const e = error as {
    response?: { data?: { error?: { message?: string } } };
  };
  const apiMsg = e?.response?.data?.error?.message;
  if (typeof apiMsg === 'string' && apiMsg.length > 0 && apiMsg.length < 240) return apiMsg;
  return null;
}

/**
 * Best-effort Arabic error message for inline mutation failures.
 * Prefers the API's own error message; falls back to a caller-provided
 * default so every failure surfaces something human-readable.
 * (Canonical home since wave 9-a; `hooks/useResources` re-exports it.)
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  return apiErrorDetail(error) ?? fallback;
}
