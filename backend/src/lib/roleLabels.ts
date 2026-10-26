/**
 * roleLabels — the BACKEND twin of `frontend/src/lib/roleLabels.ts`
 * (R320 §B, task c1-RENAME): the Arabic display names of the five
 * roles, shared by backend messages/exports so the API's human-facing
 * Arabic can never drift from the UI's role labels.
 *
 * R320 §B: the ADMIN role's previous office label is retired (see
 * docs/redesign/r320/RENAME-LEDGER.md); the role is «المسجل العام» —
 * the registrar general. Technical identifiers (the `Role` enum, DB
 * values, JWT claims, /admin/* URLs) are UNCHANGED.
 *
 * FRONTEND TWIN: `frontend/src/lib/roleLabels.ts` carries the SAME map
 * (plus the dashboard/demo label sets the UI owns). The two maps are
 * belt-locked equal (backend/src/lib/__tests__/roleLabels.test.ts +
 * frontend/tests/unit/r320-rename-belt.test.ts) — change them TOGETHER,
 * and update docs/redesign/r320/RENAME-LEDGER.md when you do.
 */
import { Role } from '@prisma/client';

/** Arabic display name per role — messages, exports, audit copy. */
export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'المسجل العام',
  // A person, not the function — «جودة» read as a role chip under a
  // user's name is not a person (15-j P1-8).
  QUALITY: 'أخصائي جودة',
  OWNER: 'مالك المنصة',
};

/** Role label lookup (ADMIN → «المسجل العام»). */
export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** Indefinite forms for copy that counts or appoints the role's
 * holders (حساب مسجل عام جديد، تعيين مسجل عام). */
export const ROLE_LABEL_INDEFINITE: Partial<Record<Role, string>> = {
  ADMIN: 'مسجل عام',
};

/** Plural forms for copy that addresses the role's holders
 * (nominative «المسجلون العامّون» / oblique «المسجلين العامّين»). */
export const ROLE_LABEL_PLURAL_OBLIQUE: Partial<Record<Role, string>> = {
  ADMIN: 'المسجلين العامّين',
};
