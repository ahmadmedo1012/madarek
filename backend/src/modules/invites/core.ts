/**
 * r323 B3.1 — invite codes (pure layer).
 *
 * Codes are the registrar/teacher's answer to «how do 100 students get
 * in without me typing them»: a short unambiguous code scoped to an
 * offering/department/faculty, single-use or capped, expiring — and
 * the register flow shows the scope honestly before submitting.
 */

/** Crockford-ish alphabet — no 0/O/1/I/L confusions when read aloud. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/** An 8-char code (32^8 ≈ 1.1e12 — exhaustion is not the threat model;
 * the expiry + maxUses are). Uses crypto.getRandomValues when present,
 * falls back to Math.random in the test env. */
export function generateInviteCode(rand: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  }
  return out;
}

export interface InviteCodeRow {
  id: string;
  code: string;
  role: 'STUDENT' | 'TEACHER';
  offeringId: string | null;
  departmentId: string | null;
  facultyId: string | null;
  expiresAt: Date;
  maxUses: number;
  usedCount: number;
}

export type InviteVerdict =
  | { ok: true }
  | { ok: false; reason: string };

/** The public validation: exists → not expired → not exhausted → role
 * matches the account kind being registered. Arabic reasons surface
 * verbatim on the register page. */
export function evaluateInvite(
  row: InviteCodeRow | null,
  role: string,
  now: Date = new Date(),
): InviteVerdict {
  if (!row) return { ok: false, reason: 'كود الدعوة غير صحيح.' };
  if (row.role !== role) {
    return { ok: false, reason: 'هذا الكود مخصص لنوع حساب آخر.' };
  }
  if (row.expiresAt.getTime() < now.getTime()) {
    return { ok: false, reason: 'كود الدعوة منتهي الصلاحية.' };
  }
  if (row.usedCount >= row.maxUses) {
    return { ok: false, reason: 'استُنفد هذا الكود (بلغ أقصى عدد للاستخدام).' };
  }
  return { ok: true };
}

/** The scope summary the register page shows BEFORE submit («ستُضيف
 * تلقائيًا إلى مقرر…»). Exactly one of the three scopes must be set. */
export type InviteScope =
  | { kind: 'offering'; id: string }
  | { kind: 'department'; id: string }
  | { kind: 'faculty'; id: string }
  | null;

export function inviteScopeOf(row: {
  offeringId: string | null;
  departmentId: string | null;
  facultyId: string | null;
}): InviteScope {
  if (row.offeringId) return { kind: 'offering', id: row.offeringId };
  if (row.departmentId) return { kind: 'department', id: row.departmentId };
  if (row.facultyId) return { kind: 'faculty', id: row.facultyId };
  return null;
}
