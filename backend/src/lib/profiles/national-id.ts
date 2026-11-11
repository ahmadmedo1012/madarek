/**
 * r349-P1 — الرقم الوطني الليبي: التطبيع، الهاش، والقناع.
 *
 * THE PLATFORM'S NATIONAL-ID MODEL (documented here once):
 *
 * · Libyan national ID numbers are 12 digits; the first two are the
 *   Gregorian birth year (1190… → born 1990) — public knowledge, used
 *   ONLY for shape validation here, never for inference on display.
 * · Storage pair: `nationalId` (raw digits — access-controlled column,
 *   never returned except to the owner-self / OWNER / ADMIN reads) and
 *   `nationalIdHash` (SHA-256 of the normalized digits — the indexed
 *   lookup key for import matching and the directory, so lookups never
 *   SELECT the raw column).
 * · Display is ALWAYS masked by default (`maskNationalId`):
 *   first digit + •••••••• + last two digits. One function, one place
 *   to tighten (PROFILES-RESEARCH §4.4).
 * · Eastern-Arabic digits are accepted on input and folded to ASCII —
 *   same rule as phones.ts (L8: Eastern-Arabic digits accepted on
 *   input, Latin digits stored).
 *
 * DB-free pure layer — the routes/tests exercise it, nothing else.
 */
import { createHash } from 'node:crypto';

/** Libyan national ID: exactly 12 digits. */
export const NATIONAL_ID_LENGTH = 12;

/** Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digit ranges. */
const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

function toAsciiDigits(text: string): string {
  return text.replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0x0f));
}

/**
 * Normalize a national-id input to the stored form: 12 ASCII digits.
 * Separators humans type (spaces, dashes) are tolerated then stripped.
 * Returns null for anything that is not exactly 12 digits after the
 * fold — the caller reports the honest validation error.
 */
export function normalizeNationalId(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null;
  const digits = toAsciiDigits(input).replace(/\D/g, '');
  return digits.length === NATIONAL_ID_LENGTH ? digits : null;
}

/**
 * The lookup hash: SHA-256 hex of the normalized digits. Indexed on
 * StudentProfile.nationalIdHash; exact-match only by design (a
 * trigram/fuzzy search over a national identifier is a privacy bug,
 * not a feature).
 */
export function hashNationalId(normalized: string): string {
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * The default display mask: first digit + •••••••• + last two digits
 * (e.g. 119012345678 → «1••••••••78»). Null stays null (no value —
 * no mask). One function, one place to tighten.
 */
export function maskNationalId(normalized: string | null | undefined): string | null {
  if (typeof normalized !== 'string' || normalized.length !== NATIONAL_ID_LENGTH) return null;
  return `${normalized[0]}••••••••${normalized.slice(-2)}`;
}

/** Convenience: normalize → { raw, hash } pair for storage. */
export function prepareNationalId(
  input: string | null | undefined,
): { raw: string; hash: string } | null {
  const raw = normalizeNationalId(input);
  return raw ? { raw, hash: hashNationalId(raw) } : null;
}
