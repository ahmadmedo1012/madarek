/**
 * Number formatting utilities — single source of truth so the
 * platform never accidentally renders Arabic-Indic digits.
 *
 * Usage:
 *   import { fmt, fmtPct, toWesternNumerals } from '../lib/numbers';
 *
 *   <span>{fmt(50_000)}</span>           → "50,000"
 *   <span>{fmtPct(0.875)}</span>         → "87.5%"
 *   <span>{fmt(2024, { compact: false })}</span>
 *
 * All formatters lock to 'en-US' locale so digits are always Latin.
 */

/** Convert any Arabic-Indic glyph in a string to Latin (Western). */
export function toWesternNumerals(str: string | number): string {
  return String(str).replace(/[\u0660-\u0669]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30),
  );
}

/** Format an integer or float with thousands separators (Latin). */
export function fmt(num: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-US', opts).format(num);
}

/** Format a percentage (input 0–1 or 0–100). Detects the range. */
export function fmtPct(value: number, fractionDigits = 0): string {
  const v = value <= 1 ? value : value / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(v);
}

/**
 * Format a date with Latin glyphs even in Arabic-RTL UI.
 * Default style: '15/05/2026'.
 */
export function fmtDate(
  date: Date | string,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', opts).format(d);
}

/**
 * Compact format — '1.2K', '3.4M' — useful for stats strips.
 * Uses 'en-US' so glyphs are always Latin.
 */
export function fmtCompact(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(num);
}
