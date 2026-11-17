/**
 * R362 (Agent 5) — the guard-matrix route table (guard-matrix.spec.ts).
 *
 * One canonical probe per role prefix: the guard lives in the
 * ProtectedRoute WRAPPER around the whole prefix block (App.tsx), so a
 * single route per prefix proves the wrapper for every foreign role —
 * the sweep (route-sweep.spec.ts) already visits every sibling for the
 * OWNING role, and a sibling cannot re-wrap itself in a different
 * guard without leaving the block (the parity parser in
 * tests/unit/r362-sweep-table.test.ts would flag the changed context).
 *
 * ROLE_HOME mirrors lib/nav.ts's ROLE_HOME (the guard's redirect
 * target) — re-declared here ONLY as the expected bounce destination
 * per role; the single source of truth for navigation remains nav.ts.
 */

export interface GuardProbe {
  /** Canonical guarded route for the prefix. */
  path: string;
  /** The prefix every foreign role bounces off. */
  prefix: string;
}

export interface GuardMatrix {
  probes: GuardProbe[];
  /** ROLE_HOME — the guard's redirect destination per role. */
  home: Record<'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER', string>;
  /** The any-auth surfaces reachable by every authenticated role. */
  anyAuthSurfaces: string[];
  /** Foreign roles for a probe (every role EXCEPT the owning one). */
  foreignRolesFor(probe: GuardProbe): Array<'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER'>;
}

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';
const ROLES: readonly Role[] = ['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER'];

export const ROLE_HOME_MAP: GuardMatrix = {
  probes: [
    { path: '/student/dashboard', prefix: '/student' },
    { path: '/teacher/dashboard', prefix: '/teacher' },
    { path: '/admin/dashboard', prefix: '/admin' },
    { path: '/quality/dashboard', prefix: '/quality' },
    { path: '/owner/dashboard', prefix: '/owner' },
  ],
  // Mirrors lib/nav.ts ROLE_HOME (byte-identical values).
  home: {
    STUDENT: '/student/dashboard',
    TEACHER: '/teacher/dashboard',
    ADMIN: '/admin/dashboard',
    QUALITY: '/quality/dashboard',
    OWNER: '/owner/dashboard',
  },
  anyAuthSurfaces: ['/vision', '/settings', '/competitions'],
  foreignRolesFor(probe) {
    const owning = ROLES.find((r) => this.home[r] === probe.path);
    return ROLES.filter((r) => r !== owning);
  },
};
