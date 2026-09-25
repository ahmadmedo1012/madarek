/**
 * Shared Arabic formatting helpers (wave 9-a; extended in 13-15 per
 * audit 11-f P2-1 / D13; error-language guard in 16-E10 per 15-j P0-1).
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
 *
 * 16-E10 adds the Arabic-first API-error guard (15-j P0-1: the backend
 * still ships English defaults, and the RTL UI must never render them
 * raw) and counted-noun correctness for formatRelativeArShort
 * (15-j P1-1 / 15-h P2-1: "منذ 3 دقيقة" was wrong Arabic for 3–10).
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
 * Compact relative past time with counted Arabic plurals
 * ("الآن" → "منذ دقيقتين" → "منذ 3 ساعات" → "منذ 5 أيام" →
 * "منذ 12 يوماً"). Unlike formatRelativeAr it never falls back to a
 * calendar date — KPI-style surfaces (sync "last success", audit
 * tables) want the day count to keep counting however old the instant
 * is. Counted nouns shared with formatRelativeAr since 16-E10
 * (audits 15-j P1-1 / 15-h P2-1: the shipped "منذ 3 دقيقة" / "منذ 3
 * ساعة" were wrong Arabic for the 3–10 range; consumers' rendered
 * copy changed intentionally that wave and is re-pinned in
 * format.test.ts).
 */
export function formatRelativeArShort(iso: string): string {
  const d = new Date(iso);
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${countAr(m, ['دقيقة', 'دقيقتين', 'دقائق', 'دقيقة'])}`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${countAr(h, ['ساعة', 'ساعتين', 'ساعات', 'ساعة'])}`;
  return `منذ ${countAr(Math.round(h / 24), ['يوم', 'يومين', 'أيام', 'يوماً'])}`;
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

/**
 * Arabic-script detection — the 15-j P0-1 guard. An API/JS message is
 * user-presentable in the RTL UI only when it carries Arabic script
 * anywhere in the string; Latin-only messages (the backend's English
 * defaults: 'Validation failed', 'Duplicate value', 'Exam not open
 * yet'…, axios's 'Network Error') are language leaks and must fall
 * back to Arabic copy at the rendering boundary.
 */
export function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * The API error envelope's machine code ('VALIDATION_ERROR',
 * 'CONFLICT', …) when present — support telemetry, never prose.
 * Rendered only next to a generic Arabic refusal (e.g. States'
 * ErrorState) so a user reporting a problem gives support something
 * concrete to grep for.
 */
export function apiErrorCode(error: unknown): string | null {
  const e = error as {
    response?: { data?: { error?: { code?: unknown } } };
  };
  const code = e?.response?.data?.error?.code;
  return typeof code === 'string' && code.length > 0 && code.length < 64 ? code : null;
}

/**
 * Extract the API's own error message verbatim when present and sane.
 *
 * The RAW contract, for callers that map known backend strings to
 * Arabic copy (e.g. OnlineExamsPages' exam-window guards) — NOT for
 * direct rendering: an English message returned here would leak Latin
 * prose into the RTL UI. Rendering callers use apiErrorDetail /
 * apiErrorMessage instead.
 */
export function apiErrorDetailRaw(error: unknown): string | null {
  const e = error as {
    response?: { data?: { error?: { message?: string } } };
  };
  const apiMsg = e?.response?.data?.error?.message;
  if (typeof apiMsg === 'string' && apiMsg.length > 0 && apiMsg.length < 240) return apiMsg;
  return null;
}

/**
 * Extract the API's own error message when present, sane AND Arabic.
 * Latin-only messages return null so every consumer falls back to its
 * Arabic copy (15-j P0-1: English API errors never render raw in the
 * RTL UI). Mostly-Arabic messages (a Latin field identifier inside an
 * Arabic sentence) pass — translating those is the backend's job.
 */
export function apiErrorDetail(error: unknown): string | null {
  const apiMsg = apiErrorDetailRaw(error);
  return apiMsg !== null && isArabicText(apiMsg) ? apiMsg : null;
}

/**
 * Best-effort Arabic error message for inline mutation failures.
 * Prefers the API's own error message WHEN it is Arabic; otherwise the
 * caller-provided Arabic fallback wins (15-j P0-1 — semantics inverted
 * in 16-E10: the backend's English defaults used to override every
 * fallback and leak into the RTL UI).
 * (Canonical home since wave 9-a; `hooks/useResources` re-exports it.)
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  return apiErrorDetail(error) ?? fallback;
}
