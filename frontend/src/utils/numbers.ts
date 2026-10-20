// numbers.ts
export function toWestern(str: string | number): string {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[٠-٩]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 1632 + 48)
  );
}

/**
 * formatNum — the unified numeral surface (15-h P1-3 / D16-2; r197 §7).
 *
 * ONE number convention platform-wide: Latin (Western) digits 0-9 with
 * Western-convention punctuation — comma thousands grouping, dot decimal
 * — «2,340» / «3.4» / «61.8». r197 re-keys the OUTPUT convention: ar-LY's
 * CLDR pattern (dot grouping «2.340», comma decimal «3,40») read as
 * 2.34 and 340 to the Libyan audience — the walkthrough's measured
 * defects (BLUEPRINT §11) were separator ambiguity, so the formatter now
 * swaps the separators to the Western convention while keeping the
 * ar-LY locale chain (same digits, same rounding, same CLDR plumbing —
 * and a single home if an RTL-aware format like Arabic currency lands).
 *
 * The locale chain stays `ar-LY-u-nu-latn` on purpose: numberingSystem
 * latn is pinned, and any future locale-aware format inherits the
 * platform's Arabic context. The separator swap is deterministic for
 * every ICU the app can meet (group/decimal separators are the only
 * punctuation a plain number pattern emits; the swap handles the Latin
 * and Arabic-script spellings alike).
 *
 * r197 adds explicit fraction-digit control (BLUEPRINT §7): callers
 * rendering floats pass { maximumFractionDigits } (or the formatInt /
 * formatPct1 helpers) — the un-optioned default renders the value's
 * natural digits with ≤3 fraction places, never the old CLDR-default
 * spray («61.81818181818181»).
 *
 * tests/unit/numbers.test.ts pins the convention (shapes, grouping,
 * rounding, negative pattern, input sanitization) so the surfaces can
 * never drift apart again.
 */
const NF_CACHE = new Map<string, Intl.NumberFormat>();

/** Cached NumberFormat — shared by formatNum and CountUp's per-frame path. */
export function getCachedNumberFormat(options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let fmt = NF_CACHE.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('ar-LY-u-nu-latn', options);
    NF_CACHE.set(key, fmt);
  }
  return fmt;
}

/** ar-LY emits European punctuation (dot group / comma decimal) — swap
 *  to the Western convention. Placeholder round-trip keeps the two
 *  swaps order-safe for values that contain both separators.
 *  (eslint-disable: the \u0001/\u0002 sentinels are intentional private
 *  placeholders — they never escape this function and are not user
 *  input, so the no-control-regex heuristic does not apply.) */
/* eslint-disable no-control-regex */
function westernSeparators(s: string): string {
  if (!/[.,٬٫]/.test(s)) return s;
  return s
    .replace(/[.,٬٫]/g, (m) => (m === ',' || m === '٫' ? '\u0001' : '\u0002'))
    .replace(/\u0001/g, '.')
    .replace(/\u0002/g, ',');
}
/* eslint-enable no-control-regex */

export function formatNum(
  val: number | string,
  options?: Intl.NumberFormatOptions
): string {
  const clean = typeof val === 'string' ? parseFloat(toWestern(val)) : val;
  if (isNaN(clean)) return '';
  return westernSeparators(
    getCachedNumberFormat({
      maximumFractionDigits: 3,
      ...options,
    }).format(clean)
  );
}

/** Integers only — counts, XP, pagination, ratio seeds. Grouping stays on
 *  («2,340»); the old min-fraction artifacts («1,0») cannot occur. */
export function formatInt(val: number | string): string {
  return formatNum(val, { maximumFractionDigits: 0 });
}

/** Percent VALUES (0-100 scale) for UI text — one decimal max, float
 *  noise stripped («61.8», never «61.81818181818181»). The '%' glyph is
 *  added by the caller so chips keep their own spacing/bidi handling. */
export function formatPct1(val: number | string | null | undefined): string {
  if (val == null) return '';
  const clean = typeof val === 'string' ? parseFloat(toWestern(val)) : val;
  if (isNaN(clean)) return '';
  return formatNum(clean, { maximumFractionDigits: 1 });
}

export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';
  // ar-LY renders the same Arabic month names + Latin digits the direct
  // toLocaleString('ar-LY') surfaces use (15-j P1-5: the former ar-EG-u-nu-latn
  // spelling was byte-identical output — pure locale drift, now closed).
  // Dates keep the ar-LY pattern: no separator ambiguity exists in
  // «12 مارس 2025», and the Arabic month names are the point.
  return new Intl.DateTimeFormat('ar-LY', options).format(d);
}

export function formatTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar-LY-u-nu-latn', options).format(d);
}
