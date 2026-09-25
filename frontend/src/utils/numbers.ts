// numbers.ts
export function toWestern(str: string | number): string {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[٠-٩]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 1632 + 48)
  );
}

/**
 * formatNum — the unified numeral surface (15-h P1-3 / D16-2).
 *
 * ar-LY is the platform's ONE number convention: CLDR resolves it to
 * `latn` (Western) digits with dot thousands grouping and a comma
 * decimal — `1.234.567,5` — byte-identical to the ~60 direct
 * `toLocaleString('ar-LY')` call sites (KPI counts, leaderboards,
 * dashboards), so the same metric renders the same separators on every
 * page. tests/unit/numbers.test.ts pins the format AND the equivalence
 * with `toLocaleString('ar-LY')` so the two spellings can never drift
 * apart again.
 *
 * CLDR detail kept deliberately: negative values render with a leading
 * LRM (U+200E) before the minus — `\u200E-1.234,5` — ICU's protection that
 * keeps the sign on the correct side of the number under RTL. It is
 * part of the locale's negative pattern, not a stray control character.
 */
export function formatNum(
  val: number | string,
  options?: Intl.NumberFormatOptions
): string {
  const clean = typeof val === 'string' ? parseFloat(toWestern(val)) : val;
  if (isNaN(clean)) return '';
  return new Intl.NumberFormat('ar-LY', options).format(clean);
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

