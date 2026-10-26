/**
 * roleLabels — the ONE frontend source of truth for the Arabic display
 * names of the five AppRoles (R320 §B, task c1-RENAME).
 *
 * R320 §B: the ADMIN role's previous office label is retired (see
 * docs/redesign/r320/RENAME-LEDGER.md); the role is «المسجل العام» —
 * the registrar general. Technical identifiers
 * (Role.ADMIN, /admin/* URLs, DB values, JWT claims, CSS classes, test
 * ids) are UNCHANGED; only the human-facing label moved.
 *
 * The other four roles keep their established wording (17-a2 / 15-j
 * P1-8 person-noun lineage: QUALITY is «أخصائي جودة», a person — not
 * the function «جودة»).
 *
 * BACKEND TWIN: `backend/src/lib/roleLabels.ts` carries the SAME map so
 * backend messages/exports can never drift from the UI. The two maps
 * are belt-locked equal (frontend/tests/unit/r320-rename-belt.test.ts
 * + backend/src/lib/__tests__/roleLabels.test.ts) — change them
 * TOGETHER, and update docs/redesign/r320/RENAME-LEDGER.md (the row
 * that justified the change) when you do.
 */
import type { AppRole } from '../stores/auth.store';

/** Arabic display name per role — role chips, badges, pickers, messages. */
export const ROLE_LABELS: Record<AppRole, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'المسجل العام',
  // A person, not the function — «جودة» read as a role chip under a
  // user's name is not a person (15-j P1-8).
  QUALITY: 'أخصائي جودة',
  OWNER: 'مالك المنصة',
};

/** Role chip label — the single lookup every surface should consume. */
export function roleLabel(role: AppRole): string {
  return ROLE_LABELS[role];
}

/** Arabic dashboard title per role (the h1 / breadcrumb root / tab
 * title of each role's home surface — ADMIN: «لوحة المسجل العام»). */
export const ROLE_DASHBOARD_LABELS: Record<AppRole, string> = {
  STUDENT: 'لوحة التحكم',
  TEACHER: 'لوحة الأستاذ',
  ADMIN: 'لوحة المسجل العام',
  QUALITY: 'لوحة الجودة',
  OWNER: 'لوحة التحكم الرئيسية',
};

/** The role's dashboard title (ADMIN: «لوحة المسجل العام»). */
export function roleDashboardLabel(role: AppRole): string {
  return ROLE_DASHBOARD_LABELS[role];
}

/** The AuthPage demo-account buttons' short labels — the established
 * wording of the demo panel (R320 §B: only ADMIN's entry moved to the
 * role's canonical name; the retired label is documented in the
 * RENAME-LEDGER). */
export const AUTH_DEMO_ROLE_LABELS: Record<AppRole, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'المسجل العام',
  QUALITY: 'ضمان الجودة',
  OWNER: 'المالك',
};
