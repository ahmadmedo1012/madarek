/**
 * Shared Arabic formatting helpers (wave 9-a).
 *
 * Single source for the helpers that were previously copied verbatim
 * across ~10 page files (countAr ×6, formatRelative ×9 — flags from
 * waves 5-a/6-a/6-b). Every signature and output string is identical
 * to the copies it replaces; pages keep their exact rendered copy.
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
