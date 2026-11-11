/**
 * Phone normalization (master-E1) — the single source of truth for the
 * display/search phone pair used by the academic profiles.
 *
 * THE PLATFORM'S PHONE MODEL (documented here once):
 *
 * · Every phone-holding column is a PAIR:
 *     - `…Phone`           — the DISPLAY form (what humans typed/see,
 *                            separators preserved, Arabic-Indic digits
 *                            converted to ASCII so it round-trips);
 *     - `…PhoneNormalized` — the SEARCH form: digits only, country code
 *                            included, NO plus sign (E.164 minus '+').
 *   Search-by-phone resolves through the normalized column
 *   (`@@index([studentPhoneNormalized])`), display renders the raw pair.
 *
 * · Libya-first: the platform serves Libyan schools and universities,
 *   so LOCAL forms are interpreted against the Libyan numbering plan
 *   (country code 218, 9-digit national significant numbers — mobiles
 *   09X-XXXXXXX / 9X-XXXXXXX, landlines 02X-XXXXXXX / 2X-XXXXXXX).
 *   A bare 9-digit string starting with 9 or 2 is therefore read as a
 *   Libyan NSN (e.g. `912345678` → `218912345678`), even though `91…`
 *   could theoretically be an E.164 without plus — the Libyan reading
 *   wins by platform mandate; international callers use `+`/`00`.
 *
 * · Garbage rule (deliberately minimal): fewer than 8 or more than 15
 *   digits after cleanup → `null` (E.164's own bounds). Anything else
 *   normalizes; per-country plan validation is out of scope.
 */

/** Libya's E.164 country code (no plus — the normalized form's prefix). */
export const LIBYAN_COUNTRY_CODE = '218';

/** A Libyan national significant number: 9 digits, mobile 9X…/landline 2X…. */
const LIBYAN_NSN_LENGTH = 9;

/** E.164 digit bounds (including the country code). */
const E164_MIN_DIGITS = 8;
const E164_MAX_DIGITS = 15;

/** Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digit ranges. */
const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

/** Separators humans type inside phone numbers (spaces, dashes, dots…) —
 * all non-digits are stripped from the search form. */
// (kept as documentation of intent; the extraction itself is `\D`)

/** Invisible bidi/embedding marks that carry no display meaning. */
const INVISIBLE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

function toAsciiDigits(text: string): string {
  return text.replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0x0f));
}

/** 9 digits starting with 9 (mobile) or 2 (landline area 2X). */
function isLibyanNsn(digits: string): boolean {
  return (
    digits.length === LIBYAN_NSN_LENGTH && (digits.startsWith('9') || digits.startsWith('2'))
  );
}

/** A full Libyan number in normalized form: 218 + 9-digit NSN = 12 digits. */
function isLibyanNormalized(digits: string): boolean {
  return digits.startsWith(LIBYAN_COUNTRY_CODE) && digits.length === 12;
}

export interface NormalizedPhone {
  /** The cleaned original — separators preserved, digits ASCII, trimmed. */
  display: string;
  /** Digits only, country code included, no plus (search form). */
  normalized: string;
}

/**
 * Normalize one phone number into its display/search pair.
 *
 * Recognized forms:
 *   · Libyan mobile/local:  `0912345678`, `091 234 5678`, `912345678`
 *   · Libyan landline:      `0211234567`, `+218 21 123 4567`
 *   · Libyan international: `+218 91 234 5678`, `00218…`, `218912345678`
 *   · Other international:  `+44 7911 123456`, `0044…` (kept as typed,
 *     country code already included)
 *
 * Returns `null` for garbage: non-strings, empty input, <8 or >15 digits
 * after cleanup, or an international form whose digits still start with
 * `0` (an impossible E.164). A national trunk form (`0…`) that does not
 * resolve to the Libyan plan is ALSO `null` — the country cannot be
 * guessed, and storing a countryless guess would poison the search key.
 */
export function normalizePhone(raw: string): NormalizedPhone | null {
  if (typeof raw !== 'string') return null;

  const ascii = toAsciiDigits(raw);
  // Display form: what the human typed, minus invisible marks and outer
  // whitespace — inner separators survive untouched.
  const display = ascii.replace(INVISIBLE, '').trim();
  if (display === '') return null;

  const hasPlus = /^\s*\+/.test(ascii);
  const digits = ascii.replace(/\D/g, '');
  if (digits === '') return null;

  let cc: string;
  if (hasPlus) {
    // `+…` — authoritative international; digits must already carry a
    // country code. A leading zero after '+' is not a valid E.164.
    cc = digits;
  } else if (digits.startsWith('00')) {
    // `00…` — the international access prefix (Libyan/European habit).
    cc = digits.slice(2);
  } else if (digits.startsWith('0')) {
    // `0…` — a NATIONAL trunk form. Only the Libyan plan is resolvable;
    // strip the trunk and require the 9-digit Libyan NSN.
    const nsn = digits.slice(1);
    if (!isLibyanNsn(nsn)) return null;
    cc = LIBYAN_COUNTRY_CODE + nsn;
  } else if (isLibyanNsn(digits)) {
    // Bare 9-digit Libyan NSN typed without trunk (mobile/landline).
    cc = LIBYAN_COUNTRY_CODE + digits;
  } else {
    // Bare digits with no prefix marks: read as E.164-without-plus
    // (`218912345678`, `447911123456`). Non-Libyan numbers reach this
    // branch and are kept exactly as typed.
    cc = digits;
  }

  if (cc.length < E164_MIN_DIGITS || cc.length > E164_MAX_DIGITS) return null;
  if (cc.startsWith('0')) return null; // impossible country code
  return { display, normalized: cc };
}

/**
 * The normalized (218-prefixed, digits-only) form of a number known to
 * be Libyan — any Libyan local or international shape — or `null` when
 * the input is not a Libyan number (or is garbage). The registrar's
 * «رقم ولي الأمر» flows use this to REFUSE non-Libyan guardian phones
 * instead of silently mis-keying them.
 */
export function libyanLocalToNormalized(raw: string): string | null {
  const result = normalizePhone(raw);
  if (!result || !isLibyanNormalized(result.normalized)) return null;
  return result.normalized;
}

/**
 * Whether a number resolves to the Libyan numbering plan (country code
 * 218, 9-digit NSN). Accepts every Libyan shape — trunk, bare NSN,
 * `+218`, `00218` — and Arabic-Indic digits.
 */
export function isProbableLibyan(raw: string): boolean {
  const result = normalizePhone(raw);
  return result !== null && isLibyanNormalized(result.normalized);
}
