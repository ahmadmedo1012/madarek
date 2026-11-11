/**
 * r349-P3 — Libyan phone INLINE validation (the front-of-house mirror).
 *
 * The authority is backend/src/lib/phones.ts (normalizePhone + its 20
 * tests): the backend folds, decides and stores. This file only
 * previews that verdict for the typing user — same recognized forms,
 * same Eastern-Arabic folding, no carrier names (L8: the numbering
 * plan's shapes, never marketing labels).
 *
 * Recognized (mirror of phones.ts):
 *   · Libyan mobile/local:  0912345678, 091 234 5678, 912345678
 *   · Libyan landline:      0211234567, +218 21 123 4567
 *   · Libyan international: +218 91 234 5678, 00218…, 218912345678
 *   · Other international:  +44 7911 123456 (kept as typed)
 */

const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

function toAsciiDigits(text: string): string {
  return text.replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0x0f));
}

export type PhoneCheck =
  | { ok: true; normalized: string }
  | { ok: false; reasonAr: string };

/** Preview the backend's fold: valid → the normalized search form. */
export function checkLibyanPhone(raw: string): PhoneCheck {
  const ascii = toAsciiDigits(raw ?? '');
  const display = ascii.trim();
  if (display === '') return { ok: false, reasonAr: 'أدخل رقم الهاتف' };
  const digits = ascii.replace(/\D/g, '');
  if (digits === '') return { ok: false, reasonAr: 'الرقم يجب أن يحتوي خانات رقمية' };
  const hasPlus = /^\s*\+/.test(ascii);
  const hasDoubleZero = /^\s*00/.test(ascii);

  // Libyan national significant number typed bare (9X… mobile / 2X… landline)
  if (!hasPlus && !hasDoubleZero && digits.length === 9 && (digits.startsWith('9') || digits.startsWith('2'))) {
    return { ok: true, normalized: `218${digits}` };
  }
  // Local form with the leading 0 (10 digits)
  if (!hasPlus && !hasDoubleZero && digits.length === 10 && digits.startsWith('0')) {
    return { ok: true, normalized: `218${digits.slice(1)}` };
  }
  // International Libyan: +218 / 00218 / 218… → 12 digits starting 218
  if ((hasPlus || hasDoubleZero || digits.startsWith('218')) && digits.startsWith('218') && digits.length === 12) {
    return { ok: true, normalized: digits };
  }
  // Other international with an explicit +
  if (hasPlus && digits.length >= 8 && digits.length <= 15) {
    return { ok: true, normalized: digits };
  }
  if (digits.length < 8) return { ok: false, reasonAr: 'الرقم قصير — ليبيا: 09X XXX XXXX أو +218 9X XXX XXXX' };
  return { ok: false, reasonAr: 'صيغة غير معروفة — جرّب 09XXXXXXXXX أو +218XXXXXXXXX' };
}

/** Eastern-Arabic digits → ASCII as the user types (stored form). */
export function foldDigits(text: string): string {
  return toAsciiDigits(text ?? '');
}
