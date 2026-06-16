/**
 * Audit route table — see specs/012-design-graphics-uplift/contracts/audit-script.md.
 *
 * Each tuple of (route × viewport × theme × dir) becomes one capture in
 * surface-inventory.json. Routes containing :param placeholders are
 * resolved by the audit harness against a fixture user / college.
 */

export const AUDIT_ROUTES = [
  // public
  '/',
  '/login',
  '/colleges',
  '/colleges/:knownSlug',

  // student
  '/dashboard',
  '/dashboard/courses',
  '/dashboard/courses/:id',
  '/dashboard/assignments',
  '/dashboard/notifications',
  '/dashboard/settings',

  // faculty
  '/faculty',
  '/faculty/courses/:id',

  // dean / admin / quality / owner
  '/dean',
  '/admin',
  '/quality',
  '/owner',

  // utility
  '/404',
  '/error',
  '/onboarding-replay',
] as const;

export type AuditRoute = typeof AUDIT_ROUTES[number];

export const VIEWPORTS = [360, 768, 1280] as const;
export type Viewport = typeof VIEWPORTS[number];

export const THEMES = ['light', 'dark'] as const;
export type Theme = typeof THEMES[number];

export const DIRS = ['ltr', 'rtl'] as const;
export type Dir = typeof DIRS[number];
